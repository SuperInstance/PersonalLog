/**
 * Offline Queue for Sync
 *
 * Queues changes when offline and replays them when connection is restored.
 * Provides reliable sync with retry logic and priority handling.
 */

import { DataDelta, QueuedChange, OfflineQueueStats, CollectionType } from './types'
import { StorageError } from '@/lib/errors'

// ============================================================================
// OFFLINE QUEUE STORAGE
// ============================================================================

const QUEUE_STORE_NAME = 'sync-offline-queue'
const DB_NAME = 'PersonalLogSync'
const DB_VERSION = 1

// ============================================================================
// OFFLINE QUEUE MANAGER
// ============================================================================

export class OfflineQueue {
  private db: IDBDatabase | null = null
  private processing = false
  private networkStatus: { online: boolean; lastCheck: number } = {
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastCheck: Date.now(),
  }
  private changeCallbacks: Set<(change: QueuedChange) => void> = new Set()
  private syncCallbacks: Set<(changes: QueuedChange[]) => void> = new Set()

  /**
   * Initialize offline queue
   */
  async initialize(): Promise<void> {
    await this.openDB()
    this.setupNetworkListeners()
  }

  /**
   * Queue a change for sync
   */
  async queueChange(
    delta: DataDelta,
    priority: QueuedChange['priority'] = 'medium'
  ): Promise<string> {
    const change: QueuedChange = {
      id: this.generateChangeId(),
      delta,
      retryCount: 0,
      maxRetries: 3,
      priority,
      queuedAt: Date.now(),
    }

    await this.storeChange(change)

    // Notify listeners
    this.notifyChangeListeners(change)

    // If online, try to sync immediately
    if (this.networkStatus.online && !this.processing) {
      void this.processQueue()
    }

    return change.id
  }

  /**
   * Get all queued changes
   */
  async getQueuedChanges(options?: {
    priority?: QueuedChange['priority']
    limit?: number
  }): Promise<QueuedChange[]> {
    const changes = await this.getAllChanges()

    let filtered = changes

    if (options?.priority) {
      filtered = filtered.filter(c => c.priority === options.priority)
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit)
    }

    return filtered.sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      const aPriority = priorityOrder[a.priority]
      const bPriority = priorityOrder[b.priority]

      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }

      // Then by queued time
      return a.queuedAt - b.queuedAt
    })
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<OfflineQueueStats> {
    const changes = await this.getAllChanges()

    const totalChanges = changes.length
    const pendingChanges = changes.filter(c => c.retryCount < c.maxRetries).length
    const failedChanges = changes.filter(c => c.retryCount >= c.maxRetries).length
    const highPriorityChanges = changes.filter(c => c.priority === 'high').length

    const oldestChange = changes.length > 0
      ? Math.min(...changes.map(c => c.queuedAt))
      : Date.now()

    // Estimate sync time (rough estimate: 100ms per change)
    const estimatedSyncTime = pendingChanges * 100

    return {
      totalChanges,
      pendingChanges,
      failedChanges,
      highPriorityChanges,
      oldestChange,
      estimatedSyncTime,
    }
  }

  /**
   * Process queued changes
   */
  async processQueue(syncFn?: (change: QueuedChange) => Promise<boolean>): Promise<void> {
    if (this.processing) {
      return
    }

    this.processing = true

    try {
      const changes = await this.getQueuedChanges()

      // Only process pending changes
      const pendingChanges = changes.filter(c => c.retryCount < c.maxRetries)

      if (pendingChanges.length === 0) {
        return
      }

      // Notify sync listeners
      this.notifySyncListeners(pendingChanges)

      // Process each change
      const results = await Promise.allSettled(
        pendingChanges.map(async (change) => {
          try {
            // Use provided sync function or default (mark as synced)
            const success = syncFn ? await syncFn(change) : true

            if (success) {
              await this.removeChange(change.id)
              return true
            } else {
              // Increment retry count and schedule retry
              await this.incrementRetry(change.id)
              return false
            }
          } catch (error) {
            // Increment retry count
            await this.incrementRetry(change.id)
            throw error
          }
        })
      )

      // Log results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value)).length

      console.log(`[OfflineQueue] Processed ${pendingChanges.length} changes: ${successful} successful, ${failed} failed`)
    } finally {
      this.processing = false
    }
  }

  /**
   * Clear all queued changes
   */
  async clearQueue(): Promise<void> {
    const database = await this.getDB()
    const transaction = database.transaction([QUEUE_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(QUEUE_STORE_NAME)
    await new Promise<void>((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Remove specific change
   */
  async removeChange(changeId: string): Promise<void> {
    const database = await this.getDB()
    const transaction = database.transaction([QUEUE_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(QUEUE_STORE_NAME)

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(changeId)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Retry failed changes
   */
  async retryFailedChanges(): Promise<void> {
    const changes = await this.getAllChanges()
    const failedChanges = changes.filter(c => c.retryCount >= c.maxRetries)

    // Reset retry count
    for (const change of failedChanges) {
      change.retryCount = 0
      await this.storeChange(change)
    }

    // Process queue
    if (this.networkStatus.online) {
      await this.processQueue()
    }
  }

  /**
   * Listen for new changes
   */
  onChange(callback: (change: QueuedChange) => void): () => void {
    this.changeCallbacks.add(callback)
    return () => this.changeCallbacks.delete(callback)
  }

  /**
   * Listen for sync events
   */
  onSync(callback: (changes: QueuedChange[]) => void): () => void {
    this.syncCallbacks.add(callback)
    return () => this.syncCallbacks.delete(callback)
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): { online: boolean; lastCheck: number } {
    return { ...this.networkStatus }
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private async openDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(new StorageError('Failed to open offline queue database', {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }))

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result

        if (!database.objectStoreNames.contains(QUEUE_STORE_NAME)) {
          const store = database.createObjectStore(QUEUE_STORE_NAME, { keyPath: 'id' })
          store.createIndex('priority', 'priority', { unique: false })
          store.createIndex('queuedAt', 'queuedAt', { unique: false })
          store.createIndex('retryCount', 'retryCount', { unique: false })
        }
      }
    })
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db

    await this.openDB()
    return this.db!
  }

  private async storeChange(change: QueuedChange): Promise<void> {
    const database = await this.getDB()
    const transaction = database.transaction([QUEUE_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(QUEUE_STORE_NAME)

    return new Promise<void>((resolve, reject) => {
      const request = store.put(change)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new StorageError('Failed to store change', {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }))
    })
  }

  private async getAllChanges(): Promise<QueuedChange[]> {
    const database = await this.getDB()
    const transaction = database.transaction([QUEUE_STORE_NAME], 'readonly')
    const store = transaction.objectStore(QUEUE_STORE_NAME)

    return new Promise<QueuedChange[]>((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  private async incrementRetry(changeId: string): Promise<void> {
    const change = (await this.getAllChanges()).find(c => c.id === changeId)
    if (!change) return

    change.retryCount++

    if (change.retryCount < change.maxRetries) {
      // Exponential backoff: 2^retryCount seconds
      const backoffMs = Math.pow(2, change.retryCount) * 1000
      change.nextRetryAt = Date.now() + backoffMs
    }

    await this.storeChange(change)
  }

  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      this.networkStatus = { online: true, lastCheck: Date.now() }
      console.log('[OfflineQueue] Network online, processing queue...')
      void this.processQueue()
    }

    const handleOffline = () => {
      this.networkStatus = { online: false, lastCheck: Date.now() }
      console.log('[OfflineQueue] Network offline, queueing changes')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  }

  private notifyChangeListeners(change: QueuedChange): void {
    for (const callback of this.changeCallbacks) {
      try {
        callback(change)
      } catch (error) {
        console.error('[OfflineQueue] Change listener error:', error)
      }
    }
  }

  private notifySyncListeners(changes: QueuedChange[]): void {
    for (const callback of this.syncCallbacks) {
      try {
        callback(changes)
      } catch (error) {
        console.error('[OfflineQueue] Sync listener error:', error)
      }
    }
  }

  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let globalQueue: OfflineQueue | null = null

export function getOfflineQueue(): OfflineQueue {
  if (!globalQueue) {
    globalQueue = new OfflineQueue()
  }
  return globalQueue
}

export async function initializeOfflineQueue(): Promise<void> {
  const queue = getOfflineQueue()
  await queue.initialize()
}
