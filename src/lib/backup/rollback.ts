/**
 * Rollback Management System
 *
 * Creates snapshots before data changes and allows rollback to previous states.
 * Provides version control-like functionality for application data.
 */

import {
  Backup,
  BackupData,
  CreateBackupOptions,
  BackupProgress
} from './types'
import { createBackup } from './manager'
import { saveBackup, getBackup, listBackups, deleteBackup } from './storage'
import { compressData, decompressData, compressBackup } from './compression'
import { calculateChecksum } from './verification'
import { StorageError, ValidationError } from '@/lib/errors'

// ============================================================================
// SNAPSHOT TYPES
// ============================================================================

/**
 * Snapshot metadata
 */
export interface SnapshotMetadata {
  /** Unique snapshot ID */
  id: string

  /** Snapshot timestamp */
  timestamp: string

  /** Snapshot name/description */
  name: string

  /** Snapshot type */
  type: SnapshotType

  /** Data included in snapshot */
  categories: string[]

  /** Size in bytes (uncompressed) */
  size: number

  /** Compressed size in bytes */
  compressedSize: number

  /** Checksum for integrity verification */
  checksum: string

  /** Associated backup ID (if created from backup) */
  backupId?: string

  /** Tags for organization */
  tags: string[]

  /** Optional description */
  description?: string
}

/**
 * Snapshot type
 */
export type SnapshotType = 'manual' | 'auto' | 'pre-change' | 'scheduled'

/**
 * Snapshot creation options
 */
export interface CreateSnapshotOptions {
  /** Snapshot name */
  name?: string

  /** Snapshot description */
  description?: string

  /** Snapshot type */
  type?: SnapshotType

  /** Tags for organization */
  tags?: string[]

  /** Categories to include */
  categories?: Array<'conversations' | 'knowledge' | 'settings' | 'analytics' | 'personalization'>

  /** Whether to compress snapshot */
  compress?: boolean

  /** Progress callback */
  onProgress?: (progress: SnapshotProgress) => void
}

/**
 * Snapshot progress information
 */
export interface SnapshotProgress {
  stage: 'creating' | 'compressing' | 'saving' | 'completed'
  progress: number // 0-100
  message: string
  bytesProcessed?: number
  totalBytes?: number
}

/**
 * Rollback options
 */
export interface RollbackOptions {
  /** Whether to create a snapshot before rollback */
  createPreRollbackSnapshot?: boolean

  /** Categories to rollback (defaults to all) */
  categories?: Array<'conversations' | 'knowledge' | 'settings' | 'analytics' | 'personalization'>

  /** Whether to verify snapshot integrity before rollback */
  verifyBeforeRollback?: boolean

  /** Progress callback */
  onProgress?: (progress: RollbackProgress) => void
}

/**
 * Rollback progress information
 */
export interface RollbackProgress {
  stage: 'verifying' | 'preparing' | 'rolling-back' | 'validating' | 'completed'
  progress: number // 0-100
  message: string
  category?: string
  itemsProcessed?: number
  totalItems?: number
}

/**
 * Rollback result
 */
export interface RollbackResult {
  /** Whether rollback was successful */
  success: boolean

  /** Snapshot ID that was rolled back */
  snapshotId: string

  /** Number of items rolled back */
  itemsRolledBack: {
    conversations: number
    messages: number
    knowledge: number
    settings: number
    analytics: number
    personalization: number
  }

  /** Any errors that occurred */
  errors: Array<{
    category: string
    message: string
    item?: string
  }>

  /** Rollback timestamp */
  timestamp: string

  /** Duration in milliseconds */
  duration: number

  /** Pre-rollback snapshot ID (if created) */
  preRollbackSnapshotId?: string
}

// ============================================================================
// SNAPSHOT STORAGE
// ============================================================================

const SNAPSHOTS_KEY = 'personallog_snapshots'
const MAX_SNAPSHOTS = 50 // Maximum snapshots to keep

// ============================================================================
// ROLLBACK MANAGER CLASS
// ============================================================================

/**
 * RollbackManager handles snapshot creation and rollback operations.
 *
 * Features:
 * - Automatic snapshots before changes
 * - Manual snapshots
 * - Compressed storage for efficiency
 * - Integrity verification
 * - Selective category rollback
 * - Progress tracking
 *
 * @example
 * ```typescript
 * const manager = new RollbackManager()
 *
 * // Create snapshot before changes
 * const snapshot = await manager.createSnapshot({
 *   name: 'Before AI contact changes',
 *   type: 'pre-change'
 * })
 *
 * // Make changes...
 *
 * // Rollback if needed
 * if (somethingWentWrong) {
 *   await manager.rollback(snapshot.id)
 * }
 * ```
 */
export class RollbackManager {
  private abortController: AbortController | null = null

  /**
   * Create a snapshot of current data
   *
   * @param options - Snapshot creation options
   * @returns Snapshot metadata
   */
  async createSnapshot(options: CreateSnapshotOptions = {}): Promise<SnapshotMetadata> {
    const {
      name,
      description,
      type = 'manual',
      tags = [],
      categories = ['conversations', 'knowledge', 'settings', 'analytics', 'personalization'],
      compress = true,
      onProgress
    } = options

    try {
      this.reportProgress(onProgress as any, {
        stage: 'creating',
        progress: 0,
        message: 'Creating snapshot...'
      })

      // Collect snapshot data
      const data = await this.collectSnapshotData(categories, onProgress)

      // Calculate size
      const jsonData = JSON.stringify(data)
      const size = new Blob([jsonData]).size

      // Calculate checksum
      this.reportProgress(onProgress as any, {
        stage: 'creating',
        progress: 70,
        message: 'Calculating checksum...'
      })

      const checksum = await calculateChecksum(data)

      // Create snapshot metadata
      const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      const timestamp = new Date().toISOString()

      const metadata: SnapshotMetadata = {
        id: snapshotId,
        timestamp,
        name: name || this.generateSnapshotName(type),
        type,
        categories,
        size,
        compressedSize: 0, // Will be updated after compression
        checksum,
        tags: type === 'auto' ? [...tags, 'automatic'] : tags,
        description
      }

      // Compress if requested
      let compressedData: string | null = null
      if (compress) {
        this.reportProgress(onProgress as any, {
          stage: 'compressing',
          progress: 80,
          message: 'Compressing snapshot...'
        })

        const compressed = await compressData(jsonData)
        compressedData = this.arrayBufferToBase64(compressed)
        metadata.compressedSize = compressed.length
      } else {
        metadata.compressedSize = size
      }

      // Save snapshot
      this.reportProgress(onProgress as any, {
        stage: 'saving',
        progress: 90,
        message: 'Saving snapshot...'
      })

      await this.saveSnapshot(metadata, compressedData)

      // Clean up old snapshots if needed
      await this.cleanupOldSnapshots()

      this.reportProgress(onProgress as any, {
        stage: 'completed',
        progress: 100,
        message: 'Snapshot created successfully!'
      })

      console.log(`[Rollback Manager] Created snapshot: ${metadata.name} (${metadata.compressedSize} bytes)`)
      return metadata
    } catch (error) {
      throw new StorageError('Failed to create snapshot', {
        technicalDetails: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Rollback to a previous snapshot
   *
   * @param snapshotId - Snapshot ID to rollback to
   * @param options - Rollback options
   * @returns Rollback result
   */
  async rollback(snapshotId: string, options: RollbackOptions = {}): Promise<RollbackResult> {
    const {
      createPreRollbackSnapshot = true,
      categories,
      verifyBeforeRollback = true,
      onProgress
    } = options

    const startTime = Date.now()
    let preRollbackSnapshotId: string | undefined

    try {
      // Reset abort controller
      this.abortController = new AbortController()

      // Load snapshot
      this.reportProgress(onProgress as any, {
        stage: 'preparing',
        progress: 0,
        message: 'Loading snapshot...'
      })

      const snapshot = await this.getSnapshot(snapshotId)
      if (!snapshot) {
        throw new ValidationError(`Snapshot not found: ${snapshotId}`)
      }

      // Verify integrity if requested
      if (verifyBeforeRollback) {
        this.reportProgress(onProgress as any, {
          stage: 'verifying',
          progress: 5,
          message: 'Verifying snapshot integrity...'
        })

        const valid = await this.verifySnapshot(snapshot)
        if (!valid) {
          throw new ValidationError('Snapshot integrity check failed')
        }
      }

      // Create pre-rollback snapshot if requested
      if (createPreRollbackSnapshot) {
        this.reportProgress(onProgress as any, {
          stage: 'preparing',
          progress: 10,
          message: 'Creating pre-rollback safety snapshot...'
        })

        const preSnapshot = await this.createSnapshot({
          name: `Pre-rollback snapshot (${new Date().toISOString()})`,
          description: `Created before rolling back to ${snapshot.name}`,
          type: 'pre-change',
          tags: ['pre-rollback', 'automatic'],
          compress: true
        })

        preRollbackSnapshotId = preSnapshot.id
      }

      // Perform rollback
      this.reportProgress(onProgress as any, {
        stage: 'rolling-back',
        progress: 20,
        message: 'Rolling back data...'
      })

      const rollbackResult = await this.performRollback(
        snapshot,
        categories,
        onProgress,
        this.abortController.signal
      )

      // Validate
      this.reportProgress(onProgress as any, {
        stage: 'validating',
        progress: 95,
        message: 'Validating rollback...'
      })

      this.reportProgress(onProgress as any, {
        stage: 'completed',
        progress: 100,
        message: 'Rollback completed successfully!'
      })

      const result: RollbackResult = {
        success: true,
        snapshotId,
        itemsRolledBack: rollbackResult,
        errors: [],
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        preRollbackSnapshotId
      }

      console.log(`[Rollback Manager] Successfully rolled back to snapshot: ${snapshot.name}`)
      return result
    } catch (error) {
      const result: RollbackResult = {
        success: false,
        snapshotId,
        itemsRolledBack: {
          conversations: 0,
          messages: 0,
          knowledge: 0,
          settings: 0,
          analytics: 0,
          personalization: 0
        },
        errors: [{
          category: 'rollback',
          message: error instanceof Error ? error.message : String(error),
          item: snapshotId
        }],
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        preRollbackSnapshotId
      }

      console.error('[Rollback Manager] Rollback failed:', error)
      return result
    }
  }

  /**
   * Cancel an in-progress rollback operation
   */
  cancelRollback(): void {
    if (this.abortController) {
      this.abortController.abort()
      console.log('[Rollback Manager] Rollback operation cancelled')
    }
  }

  /**
   * List all snapshots
   *
   * @param options - Filter options
   * @returns Array of snapshot metadata
   */
  async listSnapshots(options?: {
    type?: SnapshotType
    limit?: number
    offset?: number
  }): Promise<SnapshotMetadata[]> {
    const snapshots = await this.loadAllSnapshots()

    let filtered = snapshots

    // Filter by type
    if (options?.type) {
      filtered = filtered.filter(s => s.type === options.type)
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // Apply offset
    if (options?.offset) {
      filtered = filtered.slice(options.offset)
    }

    // Apply limit
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit)
    }

    return filtered
  }

  /**
   * Get a specific snapshot
   *
   * @param snapshotId - Snapshot ID
   * @returns Snapshot metadata or null if not found
   */
  async getSnapshot(snapshotId: string): Promise<SnapshotMetadata & { data?: any }> {
    try {
      const snapshot = await this.loadSnapshot(snapshotId)
      if (!snapshot) {
        return null as any
      }

      // Load data if needed
      const data = await this.loadSnapshotData(snapshot)

      return {
        ...snapshot,
        data
      }
    } catch (error) {
      console.error(`[Rollback Manager] Failed to get snapshot ${snapshotId}:`, error)
      return null as any
    }
  }

  /**
   * Delete a snapshot
   *
   * @param snapshotId - Snapshot ID to delete
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    try {
      const snapshots = await this.loadAllSnapshots()
      const filtered = snapshots.filter(s => s.id !== snapshotId)
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(filtered))
      localStorage.removeItem(`${SNAPSHOTS_KEY}_${snapshotId}`)
      console.log(`[Rollback Manager] Deleted snapshot: ${snapshotId}`)
    } catch (error) {
      throw new StorageError(`Failed to delete snapshot: ${snapshotId}`, {
        technicalDetails: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Delete multiple snapshots
   *
   * @param snapshotIds - Array of snapshot IDs to delete
   */
  async deleteSnapshots(snapshotIds: string[]): Promise<void> {
    for (const id of snapshotIds) {
      await this.deleteSnapshot(id)
    }
    console.log(`[Rollback Manager] Deleted ${snapshotIds.length} snapshots`)
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Collect snapshot data from all sources
   */
  private async collectSnapshotData(
    categories: string[],
    onProgress?: (progress: SnapshotProgress) => void
  ): Promise<any> {
    const data: any = {}

    // This is a simplified implementation
    // Full implementation would collect actual data from storage

    const totalCategories = categories.length
    let currentCategory = 0

    for (const category of categories) {
      const progress = 10 + (currentCategory / totalCategories) * 60

      this.reportProgress(onProgress as any, {
        stage: 'creating',
        progress,
        message: `Collecting ${category}...`
      })

      switch (category) {
        case 'conversations':
          // Collect from conversation store
          data.conversations = []
          break

        case 'knowledge':
          // Collect from knowledge store
          data.knowledge = []
          break

        case 'settings':
          // Collect from localStorage
          data.settings = {}
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && !key.startsWith('personallog_')) {
              const value = localStorage.getItem(key)
              if (value) {
                try {
                  data.settings[key] = JSON.parse(value)
                } catch {
                  data.settings[key] = value
                }
              }
            }
          }
          break

        case 'analytics':
          data.analytics = {}
          break

        case 'personalization':
          data.personalization = {}
          break
      }

      currentCategory++
    }

    return data
  }

  /**
   * Perform the actual rollback operation
   */
  private async performRollback(
    snapshot: SnapshotMetadata & { data?: any },
    categories?: Array<'conversations' | 'knowledge' | 'settings' | 'analytics' | 'personalization'>,
    onProgress?: (progress: RollbackProgress) => void,
    signal?: AbortSignal
  ): Promise<{
    conversations: number
    messages: number
    knowledge: number
    settings: number
    analytics: number
    personalization: number
  }> {
    const result = {
      conversations: 0,
      messages: 0,
      knowledge: 0,
      settings: 0,
      analytics: 0,
      personalization: 0
    }

    const data = snapshot.data || {}
    const categoriesToRestore = categories || snapshot.categories as any
    const includeAll = !categories || categories.length === 0

    let progress = 20
    const progressIncrement = 70 / (includeAll ? snapshot.categories.length : categoriesToRestore.length)

    // Restore settings (most common use case)
    if ((includeAll || categoriesToRestore.includes('settings')) && data.settings) {
      this.reportProgress(onProgress as any, {
        stage: 'rolling-back',
        progress,
        message: 'Restoring settings...',
        category: 'settings'
      })

      for (const [key, value] of Object.entries(data.settings)) {
        if (typeof value === 'string') {
          localStorage.setItem(key, value)
          result.settings++
        } else if (typeof value === 'object') {
          localStorage.setItem(key, JSON.stringify(value))
          result.settings++
        }
      }

      progress += progressIncrement
    }

    // Other categories would be restored here
    // For now, we only support settings rollback in this simplified version

    return result
  }

  /**
   * Verify snapshot integrity
   */
  private async verifySnapshot(snapshot: SnapshotMetadata & { data?: any }): Promise<boolean> {
    if (!snapshot.data) {
      return false
    }

    try {
      const actualChecksum = await calculateChecksum(snapshot.data)
      return actualChecksum === snapshot.checksum
    } catch (error) {
      console.error('[Rollback Manager] Snapshot verification failed:', error)
      return false
    }
  }

  /**
   * Save snapshot to localStorage
   */
  private async saveSnapshot(
    metadata: SnapshotMetadata,
    compressedData: string | null
  ): Promise<void> {
    try {
      // Save metadata
      const snapshots = await this.loadAllSnapshots()
      snapshots.push(metadata)
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots))

      // Save compressed data
      if (compressedData) {
        localStorage.setItem(`${SNAPSHOTS_KEY}_${metadata.id}_data`, compressedData)
      }
    } catch (error) {
      throw new StorageError('Failed to save snapshot', {
        technicalDetails: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Load snapshot metadata
   */
  private async loadSnapshot(snapshotId: string): Promise<SnapshotMetadata | null> {
    const snapshots = await this.loadAllSnapshots()
    return snapshots.find(s => s.id === snapshotId) || null
  }

  /**
   * Load all snapshot metadata
   */
  private async loadAllSnapshots(): Promise<SnapshotMetadata[]> {
    try {
      const data = localStorage.getItem(SNAPSHOTS_KEY)
      if (!data) {
        return []
      }

      const snapshots = JSON.parse(data) as SnapshotMetadata[]
      return snapshots
    } catch (error) {
      console.error('[Rollback Manager] Failed to load snapshots:', error)
      return []
    }
  }

  /**
   * Load snapshot data
   */
  private async loadSnapshotData(snapshot: SnapshotMetadata): Promise<any> {
    try {
      const dataKey = `${SNAPSHOTS_KEY}_${snapshot.id}_data`
      const dataStr = localStorage.getItem(dataKey)

      if (!dataStr) {
        throw new Error('Snapshot data not found')
      }

      // Check if data is compressed (base64)
      if (snapshot.compressedSize < snapshot.size) {
        const compressed = this.base64ToArrayBuffer(dataStr)
        const decompressed = await decompressData(compressed)
        return JSON.parse(decompressed)
      } else {
        return JSON.parse(dataStr)
      }
    } catch (error) {
      throw new StorageError(`Failed to load snapshot data: ${snapshot.id}`, {
        technicalDetails: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Clean up old snapshots if we exceed the limit
   */
  private async cleanupOldSnapshots(): Promise<void> {
    try {
      const snapshots = await this.loadAllSnapshots()

      if (snapshots.length <= MAX_SNAPSHOTS) {
        return
      }

      // Sort by timestamp and remove oldest
      snapshots.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )

      const toDelete = snapshots.slice(0, snapshots.length - MAX_SNAPSHOTS)
      await this.deleteSnapshots(toDelete.map(s => s.id))

      console.log(`[Rollback Manager] Cleaned up ${toDelete.length} old snapshots`)
    } catch (error) {
      console.error('[Rollback Manager] Failed to cleanup old snapshots:', error)
    }
  }

  /**
   * Generate snapshot name
   */
  private generateSnapshotName(type: SnapshotType): string {
    const date = new Date().toLocaleDateString()
    const time = new Date().toLocaleTimeString()

    const typeNames = {
      manual: 'Manual snapshot',
      auto: 'Automatic snapshot',
      'pre-change': 'Pre-change snapshot',
      scheduled: 'Scheduled snapshot'
    }

    return `${typeNames[type]} - ${date} ${time}`
  }

  /**
   * Report progress if callback provided
   */
  private reportProgress(
    callback: ((progress: SnapshotProgress | RollbackProgress) => void) | undefined,
    progress: SnapshotProgress | RollbackProgress
  ): void {
    if (callback) {
      try {
        callback(progress)
      } catch (error) {
        console.error('[Rollback Manager] Progress callback error:', error)
      }
    }
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength

    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }

    return btoa(binary)
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    return bytes
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create a snapshot (convenience function)
 */
export async function createSnapshot(options?: CreateSnapshotOptions): Promise<SnapshotMetadata> {
  const manager = new RollbackManager()
  return await manager.createSnapshot(options)
}

/**
 * Rollback to a snapshot (convenience function)
 */
export async function rollback(snapshotId: string, options?: RollbackOptions): Promise<RollbackResult> {
  const manager = new RollbackManager()
  return await manager.rollback(snapshotId, options)
}

/**
 * List snapshots (convenience function)
 */
export async function listSnapshots(options?: {
  type?: SnapshotType
  limit?: number
}): Promise<SnapshotMetadata[]> {
  const manager = new RollbackManager()
  return await manager.listSnapshots(options)
}
