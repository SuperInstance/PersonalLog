/**
 * Background Sync Worker
 *
 * Automatically syncs conversations to the knowledge base.
 * Works invisibly in the background to keep knowledge up to date.
 */

import { getVectorStore } from './vector-store'

export interface SyncWorkerConfig {
  enabled: boolean
  interval: number  // milliseconds between syncs
  syncOnNewMessage: boolean  // trigger sync when new message added
  batchThreshold: number  // number of new messages before triggering sync
}

const DEFAULT_CONFIG: SyncWorkerConfig = {
  enabled: true,
  interval: 5 * 60 * 1000,  // 5 minutes
  syncOnNewMessage: true,
  batchThreshold: 5,
}

export class SyncWorker {
  private config: SyncWorkerConfig
  private intervalId: ReturnType<typeof setInterval> | null = null
  private pendingMessages = 0
  private lastSyncTime: Date | null = null
  private vectorStore = getVectorStore()

  constructor(config: Partial<SyncWorkerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Start the background sync worker
   */
  async start(): Promise<void> {
    if (this.intervalId) {
      console.log('[SyncWorker] Already running')
      return
    }

    if (!this.config.enabled) {
      console.log('[SyncWorker] Disabled, not starting')
      return
    }

    console.log('[SyncWorker] Starting with interval:', this.config.interval)

    // Initial sync
    await this.sync()

    // Set up interval
    this.intervalId = setInterval(() => {
      this.sync().catch(error => {
        console.error('[SyncWorker] Sync failed:', error)
      })
    }, this.config.interval)
  }

  /**
   * Stop the background sync worker
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[SyncWorker] Stopped')
    }
  }

  /**
   * Trigger an immediate sync
   */
  async sync(): Promise<{ added: number; updated: number; duration: number }> {
    const startTime = Date.now()

    try {
      await this.vectorStore.init()

      const result = await this.vectorStore.syncConversations()
      this.lastSyncTime = new Date()
      this.pendingMessages = 0

      const duration = Date.now() - startTime
      console.log(`[SyncWorker] Sync complete: ${result.added} added, ${result.updated} updated (${duration}ms)`)

      return { ...result, duration }
    } catch (error) {
      console.error('[SyncWorker] Sync error:', error)
      throw error
    }
  }

  /**
   * Notify that a new message was added
   * Triggers sync if threshold reached
   */
  async notifyNewMessage(): Promise<void> {
    this.pendingMessages++

    if (this.config.syncOnNewMessage && this.pendingMessages >= this.config.batchThreshold) {
      console.log('[SyncWorker] Batch threshold reached, triggering sync')
      await this.sync()
    }
  }

  /**
   * Get sync status
   */
  getStatus(): {
    isRunning: boolean
    lastSyncTime: Date | null
    pendingMessages: number
    config: SyncWorkerConfig
  } {
    return {
      isRunning: this.intervalId !== null,
      lastSyncTime: this.lastSyncTime,
      pendingMessages: this.pendingMessages,
      config: this.config,
    }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<SyncWorkerConfig>): void {
    const wasRunning = this.intervalId !== null
    const wasEnabled = this.config.enabled

    this.config = { ...this.config, ...updates }

    // Restart if interval changed
    if (wasRunning && (updates.interval !== undefined || updates.enabled !== undefined)) {
      this.stop()
      if (this.config.enabled) {
        this.start()
      }
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let syncWorker: SyncWorker | null = null

export function getSyncWorker(): SyncWorker {
  if (!syncWorker) {
    syncWorker = new SyncWorker()
  }
  return syncWorker
}

/**
 * Initialize sync worker (call from app initialization)
 */
export async function initSyncWorker(config?: Partial<SyncWorkerConfig>): Promise<SyncWorker> {
  const worker = new SyncWorker(config)
  await worker.start()
  syncWorker = worker
  return worker
}
