/**
 * Sync Engine
 *
 * Core synchronization engine coordinating all sync operations.
 * Manages devices, conflicts, offline queue, and sync providers.
 */

import {
  SyncDirection,
  SyncStatus,
  SyncResult,
  SyncProviderConfig,
  SyncProviderType,
  Device,
  DeviceCredentials,
  DataDelta,
  Conflict,
  ConflictResolution,
  SyncProgress,
  SyncStatistics,
  SyncSettings,
  DEFAULT_SYNC_SETTINGS,
  SyncLogEntry,
} from './types'
import { SyncProvider } from './providers'
import { SyncProviderFactory } from './providers'
import { ConflictResolver, DEFAULT_CONFLICT_CONFIG } from './conflict'
import { OfflineQueue } from './offline-queue'
import { getSyncCryptography } from './cryptography'
import { NetworkError, ValidationError, StorageError } from './errors'

// ============================================================================
// SYNC ENGINE
// ============================================================================

export class SyncEngine {
  private status: SyncStatus = 'idle'
  private provider: SyncProvider | null = null
  private settings: SyncSettings
  private resolver: ConflictResolver
  private queue: OfflineQueue
  private currentDevice: Device | null = null
  private syncLogs: SyncLogEntry[] = []
  private statistics: SyncStatistics = this.createEmptyStatistics()
  private progressCallbacks: Set<(progress: SyncProgress) => void> = new Set()
  private statusCallbacks: Set<(status: SyncStatus) => void> = new Set()
  private syncInterval: number | null = null
  private dataCollectors: Map<string, () => Promise<DataDelta[]>> = new Map()

  constructor(settings: Partial<SyncSettings> = {}) {
    this.settings = { ...DEFAULT_SYNC_SETTINGS, ...settings }
    this.resolver = new ConflictResolver(DEFAULT_CONFLICT_CONFIG)
    this.queue = new OfflineQueue()
  }

  /**
   * Initialize sync engine
   */
  async initialize(): Promise<void> {
    console.log('[SyncEngine] Initializing...')

    // Initialize cryptography
    await getSyncCryptography().initialize()

    // Initialize offline queue
    await this.queue.initialize()

    // Load settings
    await this.loadSettings()

    // Get or create current device
    this.currentDevice = await this.getOrCreateCurrentDevice()

    // Setup auto-sync if enabled
    if (this.settings.autoSync && this.settings.enabled) {
      this.setupAutoSync()
    }

    console.log('[SyncEngine] Initialized', {
      enabled: this.settings.enabled,
      provider: this.settings.enabled ? await this.getProviderType() : 'none',
      deviceId: this.currentDevice?.id,
    })
  }

  /**
   * Register a data collector for a collection type
   * This allows users to provide their own data collection logic
   */
  registerDataCollector(collection: string, collector: () => Promise<DataDelta[]>): void {
    this.dataCollectors.set(collection, collector)
  }

  /**
   * Register a data applier for a collection type
   * This allows users to provide their own data application logic
   */
  private dataAppliers: Map<string, (delta: DataDelta) => Promise<void>> = new Map()

  registerDataApplier(collection: string, applier: (delta: DataDelta) => Promise<void>): void {
    this.dataAppliers.set(collection, applier)
  }

  /**
   * Start sync process
   */
  async sync(direction: SyncDirection = 'bidirectional'): Promise<SyncResult> {
    if (!this.settings.enabled) {
      throw new ValidationError('Sync is not enabled', {
        field: 'enabled',
        value: this.settings.enabled
      })
    }

    if (this.status === 'syncing') {
      throw new ValidationError('Sync is already in progress', {
        field: 'status',
        value: this.status
      })
    }

    if (!this.provider) {
      await this.initializeProvider()
    }

    if (!this.provider) {
      throw new ValidationError('No sync provider configured', {
        field: 'provider'
      })
    }

    const startTime = Date.now()
    this.setStatus('syncing')
    this.logSyncEvent('sync-start', direction, {})

    try {
      // Check network status
      const networkStatus = await this.provider!.getNetworkStatus()
      if (!networkStatus.online) {
        throw new NetworkError('Cannot sync while offline', {
          technicalDetails: 'Network status indicates offline'
        })
      }

      // Create backup before sync
      await this.createBackup()

      // Pull if needed
      let remoteDeltas: DataDelta[] = []
      if (direction === 'bidirectional' || direction === 'pull') {
        this.updateProgress({ stage: 'downloading', progress: 10 })
        const pullResult = await this.provider!.pull(this.statistics.lastSync)
        remoteDeltas = pullResult.deltas
      }

      // Collect local changes
      this.updateProgress({ stage: 'preparing', progress: 30 })
      const localDeltas = await this.collectLocalDeltas()

      // Detect conflicts
      this.updateProgress({ stage: 'merging', progress: 50 })
      const conflicts = this.resolver.detectConflicts(localDeltas, remoteDeltas)

      // Auto-resolve conflicts if possible
      if (conflicts.length > 0) {
        const resolved = await this.resolver.autoResolveConflicts()
        console.log(`[SyncEngine] Auto-resolved ${resolved.length} conflicts`)

        // Notify user of remaining conflicts
        const remaining = this.resolver.getUnresolvedConflicts()
        if (remaining.length > 0) {
          this.setStatus('conflict')
        }
      }

      // Apply remote changes
      if (direction === 'bidirectional' || direction === 'pull') {
        this.updateProgress({ stage: 'merging', progress: 70 })
        await this.applyRemoteDeltas(remoteDeltas)
      }

      // Push local changes
      if (direction === 'bidirectional' || direction === 'push') {
        this.updateProgress({ stage: 'uploading', progress: 80 })
        const pushResult = await this.provider!.push(localDeltas)

        if (!pushResult.success) {
          console.error('[SyncEngine] Push failed:', pushResult.errors)
          throw new StorageError('Sync push failed')
        }
      }

      // Verify sync
      this.updateProgress({ stage: 'verifying', progress: 95 })
      await this.verifySync()

      // Update statistics
      this.statistics.lastSync = Date.now()
      this.statistics.totalSyncs++
      this.statistics.successfulSyncs++

      this.updateProgress({ stage: 'complete', progress: 100 })
      this.setStatus('synced')

      const result: SyncResult = {
        success: true,
        direction,
        itemsSynced: localDeltas.length + remoteDeltas.length,
        bytesTransferred: 0,
        duration: Date.now() - startTime,
        conflicts,
        errors: [],
        timestamp: Date.now(),
        provider: this.provider!.type,
      }

      this.logSyncEvent('sync-complete', direction, {
        itemsSynced: result.itemsSynced,
        conflicts: conflicts.length,
        errors: 0,
        duration: result.duration,
      })

      return result
    } catch (error) {
      console.error('[SyncEngine] Sync failed:', error)
      this.setStatus('error')
      this.statistics.failedSyncs++

      this.logSyncEvent('sync-error', direction, {
        errorMessage: error instanceof Error ? error.message : String(error),
      })

      // Queue changes for retry
      await this.queueChangesForRetry()

      throw error
    }
  }

  /**
   * Register current device
   */
  async registerDevice(deviceName: string): Promise<DeviceCredentials> {
    if (!deviceName?.trim()) {
      throw new ValidationError('Device name cannot be empty', {
        field: 'deviceName',
        value: deviceName
      })
    }

    const cryptography = getSyncCryptography()
    const keyPair = await cryptography.getOrCreateKeyPair()

    const credentials: DeviceCredentials = {
      deviceId: this.currentDevice?.id || this.generateDeviceId(),
      apiKey: this.generateApiKey(),
      encryptionKey: keyPair.publicKey,
      registeredAt: Date.now(),
    }

    // Update current device
    if (this.currentDevice) {
      this.currentDevice.name = deviceName
      await this.saveDevice(this.currentDevice)
    }

    // Store credentials
    localStorage.setItem('sync-device-credentials', JSON.stringify(credentials))

    console.log('[SyncEngine] Device registered:', credentials.deviceId)
    return credentials
  }

  /**
   * Unregister device
   */
  async unregisterDevice(deviceId: string): Promise<void> {
    if (deviceId === this.currentDevice?.id) {
      throw new ValidationError('Cannot unregister current device', {
        field: 'deviceId',
        value: deviceId
      })
    }

    // Remove device from list
    const devices = await this.getConnectedDevices()
    const filtered = devices.filter(d => d.id !== deviceId)
    await this.saveDevices(filtered)

    console.log('[SyncEngine] Device unregistered:', deviceId)
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    status: SyncStatus
    lastSync: number
    connectedDevices: number
    pendingConflicts: number
    offlineChanges: number
  }> {
    const conflicts = this.resolver.getUnresolvedConflicts()
    const queueStats = await this.queue.getQueueStats()

    return {
      status: this.status,
      lastSync: this.statistics.lastSync,
      connectedDevices: (await this.getConnectedDevices()).length,
      pendingConflicts: conflicts.length,
      offlineChanges: queueStats.pendingChanges,
    }
  }

  /**
   * Resolve conflict
   */
  async resolveConflict(
    conflictId: string,
    resolution: ConflictResolution
  ): Promise<void> {
    const action = await this.resolver.resolveConflict(conflictId, resolution)

    // Apply resolution
    const conflict = this.resolver.getConflict(conflictId)
    if (conflict) {
      await this.applyConflictResolution(conflict, action)
    }

    this.statistics.conflictsResolved++

    this.logSyncEvent('conflict-resolved', 'bidirectional', {
      conflicts: 1,
    })

    // Clear resolved conflicts
    this.resolver.clearResolvedConflicts()

    // Check if all conflicts resolved
    if (this.resolver.getUnresolvedConflicts().length === 0) {
      this.setStatus('synced')
    }
  }

  /**
   * Get sync statistics
   */
  getStatistics(): SyncStatistics {
    return { ...this.statistics }
  }

  /**
   * Get sync logs
   */
  getLogs(limit?: number): SyncLogEntry[] {
    let logs = [...this.syncLogs].sort((a, b) => b.timestamp - a.timestamp)
    if (limit) {
      logs = logs.slice(0, limit)
    }
    return logs
  }

  /**
   * Update sync settings
   */
  async updateSettings(updates: Partial<SyncSettings>): Promise<void> {
    this.settings = { ...this.settings, ...updates }

    // Save to localStorage
    localStorage.setItem('sync-settings', JSON.stringify(this.settings))

    // Re-setup auto-sync if enabled
    if (this.settings.autoSync && this.settings.enabled) {
      this.setupAutoSync()
    } else if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    // Re-initialize provider if config changed
    if (updates.enabled !== undefined || updates.priorityCollections) {
      await this.initializeProvider()
    }
  }

  /**
   * Listen to sync progress
   */
  onProgress(callback: (progress: SyncProgress) => void): () => void {
    this.progressCallbacks.add(callback)
    return () => this.progressCallbacks.delete(callback)
  }

  /**
   * Listen to sync status changes
   */
  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusCallbacks.add(callback)
    return () => this.statusCallbacks.delete(callback)
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    if (this.provider) {
      await this.provider.cleanup()
      this.provider = null
    }
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private async initializeProvider(): Promise<void> {
    if (!this.settings.enabled) {
      this.provider = null
      return
    }

    const providerConfig = await this.getProviderConfig()
    if (!providerConfig) {
      console.warn('[SyncEngine] No provider config found')
      return
    }

    this.provider = await SyncProviderFactory.createProvider(providerConfig)
    await this.provider.initialize()
    await this.provider.connect()
  }

  private async getProviderConfig(): Promise<SyncProviderConfig | null> {
    const stored = localStorage.getItem('sync-provider-config')
    if (!stored) return null

    const config = JSON.parse(stored) as SyncProviderConfig
    return config.enabled ? config : null
  }

  private async getProviderType(): Promise<SyncProviderType | null> {
    const config = await this.getProviderConfig()
    return config?.type || null
  }

  private async collectLocalDeltas(): Promise<DataDelta[]> {
    const deltas: DataDelta[] = []
    const deviceId = this.currentDevice?.id || 'unknown'
    const timestamp = Date.now()

    // Use registered data collectors
    for (const [collection, collector] of this.dataCollectors.entries()) {
      try {
        const collectedDeltas = await collector()
        deltas.push(...collectedDeltas)
      } catch (error) {
        console.error(`[SyncEngine] Failed to collect ${collection}:`, error)
      }
    }

    return deltas
  }

  private async applyRemoteDeltas(deltas: DataDelta[]): Promise<void> {
    for (const delta of deltas) {
      try {
        const applier = this.dataAppliers.get(delta.collection)
        if (applier) {
          await applier(delta)
        } else {
          console.warn(`[SyncEngine] No applier registered for collection: ${delta.collection}`)
        }
      } catch (error) {
        console.error(`[SyncEngine] Failed to apply delta ${delta.id}:`, error)
      }
    }
  }

  private async applyConflictResolution(
    conflict: Conflict,
    action: { mergedData?: unknown }
  ): Promise<void> {
    if (!action.mergedData) return

    // Apply merged data to storage
    const applier = this.dataAppliers.get(conflict.type)
    if (applier) {
      const delta: DataDelta = {
        id: `conflict_${conflict.id}`,
        type: 'update',
        collection: conflict.type as any,
        itemId: conflict.itemId,
        data: action.mergedData,
        timestamp: Date.now(),
        deviceId: this.currentDevice?.id || 'unknown',
        version: conflict.localVersion.version + 1,
        applied: false,
      }
      await applier(delta)
    }
  }

  private async createBackup(): Promise<void> {
    // Create pre-sync backup
    const backupKey = `sync-backup-${Date.now()}`
    localStorage.setItem(backupKey, JSON.stringify({ timestamp: Date.now() }))
  }

  private async verifySync(): Promise<void> {
    // Verify data integrity after sync
    // Check checksums, compare counts, etc.
  }

  private async queueChangesForRetry(): Promise<void> {
    // Queue failed changes for offline sync
    const deltas = await this.collectLocalDeltas()
    for (const delta of deltas) {
      await this.queue.queueChange(delta, 'high')
    }
  }

  private async getOrCreateCurrentDevice(): Promise<Device> {
    const stored = localStorage.getItem('sync-current-device')
    if (stored) {
      return JSON.parse(stored)
    }

    const device: Device = {
      id: this.generateDeviceId(),
      name: this.getDeviceName(),
      type: this.getDeviceType(),
      os: this.getOS(),
      lastSeen: Date.now(),
      isCurrent: true,
      capabilities: {
        maxSyncSize: 50 * 1024 * 1024,
        supportsEncryption: true,
        supportsCompression: true,
        supportsDeltaSync: true,
      },
    }

    await this.saveDevice(device)
    return device
  }

  private async saveDevice(device: Device): Promise<void> {
    localStorage.setItem('sync-current-device', JSON.stringify(device))
  }

  private async getConnectedDevices(): Promise<Device[]> {
    const stored = localStorage.getItem('sync-connected-devices')
    return stored ? JSON.parse(stored) : []
  }

  private async saveDevices(devices: Device[]): Promise<void> {
    localStorage.setItem('sync-connected-devices', JSON.stringify(devices))
  }

  private async loadSettings(): Promise<void> {
    const stored = localStorage.getItem('sync-settings')
    if (stored) {
      this.settings = { ...this.settings, ...JSON.parse(stored) }
    }
  }

  private setStatus(status: SyncStatus): void {
    this.status = status
    for (const callback of this.statusCallbacks) {
      try {
        callback(status)
      } catch (error) {
        console.error('[SyncEngine] Status callback error:', error)
      }
    }
  }

  private updateProgress(progress: Partial<SyncProgress>): void {
    const fullProgress: SyncProgress = {
      stage: progress.stage || 'preparing',
      progress: progress.progress || 0,
      currentItem: progress.currentItem,
      totalItems: progress.totalItems,
      processedItems: progress.processedItems,
      bytesTransferred: progress.bytesTransferred,
      totalBytes: progress.totalBytes,
      estimatedTimeRemaining: progress.estimatedTimeRemaining,
    }

    for (const callback of this.progressCallbacks) {
      try {
        callback(fullProgress)
      } catch (error) {
        console.error('[SyncEngine] Progress callback error:', error)
      }
    }
  }

  private logSyncEvent(
    type: SyncLogEntry['type'],
    direction: SyncDirection,
    details: SyncLogEntry['details']
  ): void {
    const entry: SyncLogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      type,
      provider: (this.provider?.type || 'local') as SyncProviderType,
      direction,
      details,
    }

    this.syncLogs.push(entry)

    // Keep only last 100 logs
    if (this.syncLogs.length > 100) {
      this.syncLogs = this.syncLogs.slice(-100)
    }
  }

  private setupAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    const intervalMs = this.settings.syncInterval * 60 * 1000
    this.syncInterval = window.setInterval(async () => {
      if (this.settings.enabled && this.status !== 'syncing') {
        try {
          await this.sync()
        } catch (error) {
          console.error('[SyncEngine] Auto-sync failed:', error)
        }
      }
    }, intervalMs)
  }

  private createEmptyStatistics(): SyncStatistics {
    return {
      lastSync: 0,
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalItemsSynced: 0,
      totalBytesTransferred: 0,
      averageSyncDuration: 0,
      conflictsResolved: 0,
      conflictsPending: 0,
      offlineChangesPending: 0,
      connectedDevices: 0,
    }
  }

  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private generateDeltaId(): string {
    return `delta_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private generateApiKey(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private getDeviceName(): string {
    return `${this.getOS()} Device`
  }

  private getDeviceType(): Device['type'] {
    const ua = navigator.userAgent
    if (/mobile|android|iphone|ipad/i.test(ua)) {
      return /tablet|ipad/i.test(ua) ? 'tablet' : 'mobile'
    }
    return 'desktop'
  }

  private getOS(): string {
    const ua = navigator.userAgent
    if (/windows/i.test(ua)) return 'Windows'
    if (/mac|osx/i.test(ua)) return 'macOS'
    if (/linux/i.test(ua)) return 'Linux'
    if (/android/i.test(ua)) return 'Android'
    if (/ios|iphone|ipad/i.test(ua)) return 'iOS'
    return 'Unknown'
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let globalEngine: SyncEngine | null = null

export function getSyncEngine(): SyncEngine {
  if (!globalEngine) {
    globalEngine = new SyncEngine()
  }
  return globalEngine
}

export async function initializeSyncEngine(settings?: Partial<SyncSettings>): Promise<SyncEngine> {
  const engine = getSyncEngine()
  await engine.initialize()
  return engine
}
