/**
 * Backup Storage Layer
 *
 * IndexedDB-based storage for backup metadata and data.
 * Manages backup persistence, retrieval, and storage quota.
 */

import {
  Backup,
  BackupFile,
  BackupStatistics,
  BackupStorageConfig,
  CompressionType
} from './types'
import { compressBackup, decompressBackup, compressData, decompressData } from './compression'
import { calculateChecksum } from './verification'
import { StorageError, QuotaError, NotFoundError } from '@/lib/errors'

// ============================================================================
// DATABASE CONSTANTS
// ============================================================================

const DB_NAME = 'PersonalLogBackups'
const DB_VERSION = 1
const STORE_BACKUPS = 'backups'
const STORE_METADATA = 'metadata'

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

let db: IDBDatabase | null = null

async function getDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(new StorageError('Failed to open backup database', {
      technicalDetails: `DB: ${DB_NAME}, Version: ${DB_VERSION}`,
      context: { dbName: DB_NAME, version: DB_VERSION }
    }))

    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      // Backups store
      if (!database.objectStoreNames.contains(STORE_BACKUPS)) {
        const backupsStore = database.createObjectStore(STORE_BACKUPS, { keyPath: 'id' })
        backupsStore.createIndex('timestamp', 'timestamp', { unique: false })
        backupsStore.createIndex('type', 'type', { unique: false })
        backupsStore.createIndex('status', 'status', { unique: false })
        backupsStore.createIndex('size', 'size', { unique: false })
      }

      // Metadata store
      if (!database.objectStoreNames.contains(STORE_METADATA)) {
        database.createObjectStore(STORE_METADATA, { keyPath: 'key' })
      }
    }
  })
}

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================

/**
 * Save a backup to storage
 *
 * @param backup - Backup to save
 * @returns Promise resolving when saved
 * @throws {StorageError} If save fails
 */
export async function saveBackup(backup: Backup): Promise<void> {
  try {
    const database = await getDB()

    // Compress backup if not already compressed
    const backupToSave = backup.compression === 'none'
      ? await compressBackup(backup)
      : backup

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_BACKUPS], 'readwrite')
      const store = transaction.objectStore(STORE_BACKUPS)
      const request = store.put(backupToSave)

      request.onsuccess = () => {
        console.log(`[Backup Storage] Saved backup: ${backup.name} (${backupToSave.compressedSize} bytes)`)
        resolve()
      }

      request.onerror = () => reject(new StorageError(`Failed to save backup: ${backup.name}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined,
        context: { backupId: backup.id }
      }))
    })
  } catch (error) {
    throw new StorageError(`Failed to save backup: ${backup.name}`, {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined
    })
  }
}

/**
 * Get a backup by ID
 *
 * @param id - Backup ID
 * @returns Promise resolving to backup or null if not found
 */
export async function getBackup(id: string): Promise<Backup | null> {
  try {
    const database = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_BACKUPS], 'readonly')
      const store = transaction.objectStore(STORE_BACKUPS)
      const request = store.get(id)

      request.onsuccess = async () => {
        if (!request.result) {
          resolve(null)
          return
        }

        // Decompress if needed
        const backup = await decompressBackup(request.result)
        resolve(backup)
      }

      request.onerror = () => reject(new StorageError(`Failed to get backup: ${id}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }))
    })
  } catch (error) {
    throw new StorageError(`Failed to get backup: ${id}`, {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined
    })
  }
}

/**
 * List all backups with optional filtering
 *
 * @param options - Filter options
 * @returns Promise resolving to array of backups
 */
export async function listBackups(options?: {
  type?: 'full' | 'incremental'
  status?: string
  limit?: number
  offset?: number
}): Promise<Backup[]> {
  try {
    const database = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_BACKUPS], 'readonly')
      const store = transaction.objectStore(STORE_BACKUPS)
      const index = store.index('timestamp')
      const request = index.openCursor(null, 'prev') // Most recent first

      const results: Backup[] = []
      let skipped = 0

      request.onsuccess = async (event) => {
        const cursor = (event.target as IDBRequest).result

        if (cursor) {
          const backup = cursor.value as Backup

          // Apply filters
          if (options?.type && backup.type !== options.type) {
            cursor.continue()
            return
          }

          if (options?.status && backup.status !== options.status) {
            cursor.continue()
            return
          }

          // Handle offset
          if (options?.offset && skipped < options.offset) {
            skipped++
            cursor.continue()
            return
          }

          // Handle limit
          if (options?.limit && results.length >= options.limit) {
            // Decompress all results before returning
            const decompressed = await Promise.all(
              results.map(b => decompressBackup(b))
            )
            resolve(decompressed)
            return
          }

          results.push(backup)
          cursor.continue()
        } else {
          // Decompress all results before returning
          const decompressed = await Promise.all(
            results.map(b => decompressBackup(b))
          )
          resolve(decompressed)
        }
      }

      request.onerror = () => reject(new StorageError('Failed to list backups', {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }))
    })
  } catch (error) {
    throw new StorageError('Failed to list backups', {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined
    })
  }
}

/**
 * Delete a backup
 *
 * @param id - Backup ID
 * @returns Promise resolving when deleted
 */
export async function deleteBackup(id: string): Promise<void> {
  try {
    const database = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_BACKUPS], 'readwrite')
      const store = transaction.objectStore(STORE_BACKUPS)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log(`[Backup Storage] Deleted backup: ${id}`)
        resolve()
      }

      request.onerror = () => reject(new StorageError(`Failed to delete backup: ${id}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }))
    })
  } catch (error) {
    throw new StorageError(`Failed to delete backup: ${id}`, {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined
    })
  }
}

/**
 * Delete multiple backups
 *
 * @param ids - Array of backup IDs to delete
 * @returns Promise resolving when all deleted
 */
export async function deleteBackups(ids: string[]): Promise<void> {
  const promises = ids.map(id => deleteBackup(id))
  await Promise.all(promises)
  console.log(`[Backup Storage] Deleted ${ids.length} backups`)
}

// ============================================================================
// STORAGE QUOTA MANAGEMENT
// ============================================================================

/**
 * Get storage usage information
 *
 * @returns Promise resolving to storage usage
 */
export async function getStorageUsage(): Promise<{ used: number; total: number }> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      return {
        used: estimate.usage || 0,
        total: estimate.quota || 0
      }
    }

    // Fallback: calculate from backup sizes
    const backups = await listBackups()
    const used = backups.reduce((sum, b) => sum + b.compressedSize, 0)
    return { used, total: 0 } // Total unknown
  } catch (error) {
    console.error('[Backup Storage] Failed to get storage usage:', error)
    return { used: 0, total: 0 }
  }
}

/**
 * Get backup statistics
 *
 * @returns Promise resolving to backup statistics
 */
export async function getBackupStatistics(): Promise<BackupStatistics> {
  try {
    const backups = await listBackups()
    const storageUsage = await getStorageUsage()

    const fullBackups = backups.filter(b => b.type === 'full')
    const incrementalBackups = backups.filter(b => b.type === 'incremental')

    const totalSize = backups.reduce((sum, b) => sum + b.compressedSize, 0)
    const averageBackupSize = backups.length > 0 ? totalSize / backups.length : 0

    const byType = {
      full: {
        count: fullBackups.length,
        size: fullBackups.reduce((sum, b) => sum + b.compressedSize, 0)
      },
      incremental: {
        count: incrementalBackups.length,
        size: incrementalBackups.reduce((sum, b) => sum + b.compressedSize, 0)
      }
    }

    const byStatus = {
      completed: backups.filter(b => b.status === 'completed').length,
      failed: backups.filter(b => b.status === 'failed').length,
      pending: backups.filter(b => b.status === 'pending').length,
      'in-progress': backups.filter(b => b.status === 'in-progress').length
    }

    const sortedByTimestamp = [...backups].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    return {
      totalBackups: backups.length,
      totalSize,
      byType,
      byStatus,
      oldestBackup: sortedByTimestamp[0]?.timestamp,
      newestBackup: sortedByTimestamp[sortedByTimestamp.length - 1]?.timestamp,
      lastBackup: sortedByTimestamp[sortedByTimestamp.length - 1]?.timestamp,
      averageBackupSize,
      storageUsage: {
        used: storageUsage.used,
        total: storageUsage.total,
        percentage: storageUsage.total > 0 ? (storageUsage.used / storageUsage.total) * 100 : 0
      }
    }
  } catch (error) {
    throw new StorageError('Failed to get backup statistics', {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined
    })
  }
}

/**
 * Check if storage quota is exceeded
 *
 * @param config - Storage configuration
 * @returns True if quota exceeded
 */
export async function isStorageQuotaExceeded(config: BackupStorageConfig): Promise<boolean> {
  const { used, total } = await getStorageUsage()

  if (config.maxStorage && used > config.maxStorage) {
    return true
  }

  if (total > 0 && (used / total) > 0.9) {
    return true
  }

  return false
}

/**
 * Auto-delete old backups based on retention policy
 *
 * @param config - Storage configuration
 * @returns Promise resolving to number of backups deleted
 */
export async function autoDeleteOldBackups(config: BackupStorageConfig): Promise<number> {
  try {
    const backups = await listBackups()
    const now = Date.now()
    const toDelete: string[] = []

    for (const backup of backups) {
      const age = now - new Date(backup.timestamp).getTime()
      const ageInDays = age / (1000 * 60 * 60 * 24)

      // Keep minimum number of backups
      if (backups.length - toDelete.length <= (config.minBackupsToKeep || 3)) {
        continue
      }

      // Delete based on retention policy
      let shouldDelete = false

      if (backup.type === 'full' && config.defaultRetention?.daily) {
        shouldDelete = ageInDays > config.defaultRetention.daily
      } else if (backup.type === 'incremental' && config.defaultRetention?.weekly) {
        shouldDelete = ageInDays > config.defaultRetention.weekly
      } else if (config.defaultRetention?.monthly) {
        shouldDelete = ageInDays > config.defaultRetention.monthly
      }

      if (shouldDelete) {
        toDelete.push(backup.id)
      }
    }

    if (toDelete.length > 0) {
      await deleteBackups(toDelete)
      console.log(`[Backup Storage] Auto-deleted ${toDelete.length} old backups`)
    }

    return toDelete.length
  } catch (error) {
    console.error('[Backup Storage] Auto-delete failed:', error)
    return 0
  }
}

// ============================================================================
// METADATA STORAGE
// ============================================================================

interface Metadata {
  key: string
  value: unknown
}

/**
 * Save metadata value
 *
 * @param key - Metadata key
 * @param value - Metadata value
 */
export async function saveMetadata(key: string, value: unknown): Promise<void> {
  try {
    const database = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_METADATA], 'readwrite')
      const store = transaction.objectStore(STORE_METADATA)
      const request = store.put({ key, value })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new StorageError(`Failed to save metadata: ${key}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }))
    })
  } catch (error) {
    throw new StorageError(`Failed to save metadata: ${key}`, {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined
    })
  }
}

/**
 * Get metadata value
 *
 * @param key - Metadata key
 * @returns Promise resolving to value or null if not found
 */
export async function getMetadata<T = unknown>(key: string): Promise<T | null> {
  try {
    const database = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_METADATA], 'readonly')
      const store = transaction.objectStore(STORE_METADATA)
      const request = store.get(key)

      request.onsuccess = () => {
        resolve(request.result?.value || null)
      }

      request.onerror = () => reject(new StorageError(`Failed to get metadata: ${key}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }))
    })
  } catch (error) {
    throw new StorageError(`Failed to get metadata: ${key}`, {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined
    })
  }
}

/**
 * Delete metadata value
 *
 * @param key - Metadata key
 */
export async function deleteMetadata(key: string): Promise<void> {
  try {
    const database = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_METADATA], 'readwrite')
      const store = transaction.objectStore(STORE_METADATA)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new StorageError(`Failed to delete metadata: ${key}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }))
    })
  } catch (error) {
    throw new StorageError(`Failed to delete metadata: ${key}`, {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined
    })
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clear all backups (use with caution!)
 *
 * @returns Promise resolving when cleared
 */
export async function clearAllBackups(): Promise<void> {
  try {
    const database = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_BACKUPS], 'readwrite')
      const store = transaction.objectStore(STORE_BACKUPS)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('[Backup Storage] Cleared all backups')
        resolve()
      }

      request.onerror = () => reject(new StorageError('Failed to clear backups', {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }))
    })
  } catch (error) {
    throw new StorageError('Failed to clear backups', {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined
    })
  }
}

/**
 * Export backup as file for download
 *
 * @param backup - Backup to export
 * @param compression - Compression type
 * @returns Promise resolving to Blob
 */
export async function exportBackupAsFile(
  backup: Backup,
  compression: CompressionType = 'gzip'
): Promise<Blob> {
  try {
    const { compressBackupForDownload } = await import('./compression')
    return await compressBackupForDownload(backup, compression)
  } catch (error) {
    throw new StorageError(`Failed to export backup: ${backup.name}`, {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined
    })
  }
}

/**
 * Import backup from uploaded file
 *
 * @param file - Uploaded file
 * @returns Promise resolving to BackupFile structure
 */
export async function importBackupFromFile(file: File): Promise<BackupFile> {
  try {
    const { decompressBackupFromUpload } = await import('./compression')
    return await decompressBackupFromUpload(file)
  } catch (error) {
    throw new StorageError(`Failed to import backup from file: ${file.name}`, {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined
    })
  }
}
