/**
 * Backup Manager
 *
 * Core orchestrator for creating, restoring, and managing backups.
 * This is a generic implementation that can work with any JSON-serializable data.
 */

import type {
  Backup,
  BackupType,
  CreateBackupOptions,
  RestoreBackupOptions,
  RestoreResult,
  RestorePreview,
  BackupProgress,
  RestoreProgress,
  BackupFile
} from './types'
import {
  saveBackup,
  getBackup,
  getBackupStatistics,
  isStorageQuotaExceeded,
  autoDeleteOldBackups
} from './storage'
import { compressBackup } from './compression'
import { calculateChecksum, verifyBackup } from './verification'
import { StorageError, NotFoundError, ValidationError } from './errors'

// ============================================================================
// BACKUP CREATION
// ============================================================================

/**
 * Create a backup
 *
 * @param options - Backup options
 * @returns Created backup
 *
 * @example
 * ```typescript
 * const backup = await createBackup({
 *   data: { users: [...], settings: {...} },
 *   name: 'My Backup',
 *   type: 'full',
 *   compress: true
 * })
 * ```
 */
export async function createBackup<T = unknown>(
  options: CreateBackupOptions<T>
): Promise<Backup<T>> {
  const {
    type = 'full',
    name,
    description,
    tags = [],
    compress = true,
    categories = [],
    parentBackupId,
    isAutomatic = false,
    data,
    onProgress
  } = options

  try {
    // Report progress
    reportProgress(onProgress as any, { stage: 'preparing', progress: 0, message: 'Preparing backup...' })

    // Validate data
    if (data === undefined || data === null) {
      throw new ValidationError('Backup data cannot be null or undefined', {
        context: { hasData: data !== undefined }
      })
    }

    // Generate backup metadata
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const timestamp = new Date().toISOString()

    // Calculate data size
    const dataSize = new Blob([JSON.stringify(data)]).size

    // Calculate checksum
    reportProgress(onProgress as any, { stage: 'exporting', progress: 50, message: 'Calculating checksum...' })
    const checksum = await calculateChecksum(data)

    // Create backup object
    const backup: Backup<T> = {
      id: backupId,
      timestamp,
      type,
      status: 'completed',
      size: dataSize,
      compressedSize: 0, // Will be updated after compression
      compression: compress ? 'gzip' : 'none',
      encryption: 'none',
      checksum,
      version: '1.0.0',
      appVersion: '1.0.0',
      isAutomatic,
      name: name || generateBackupName(type, isAutomatic),
      description,
      tags,
      parentBackupId,
      data
    }

    // Compress if requested
    if (compress) {
      reportProgress(onProgress as any, { stage: 'compressing', progress: 70, message: 'Compressing backup...' })
      await compressBackup(backup)
    } else {
      backup.compressedSize = backup.size
    }

    // Save to storage
    reportProgress(onProgress as any, { stage: 'saving', progress: 90, message: 'Saving backup...' })
    await saveBackup(backup)

    reportProgress(onProgress as any, { stage: 'completed', progress: 100, message: 'Backup completed!' })

    console.log(`[Backup Manager] Created backup: ${backup.name} (${backup.compressedSize} bytes)`)
    return backup
  } catch (error) {
    throw new StorageError(`Failed to create backup: ${name || 'unnamed'}`, {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined
    })
  }
}

// ============================================================================
// BACKUP RESTORATION
// ============================================================================

/**
 * Restore from a backup
 *
 * @param backupId - Backup ID to restore
 * @param options - Restore options
 * @returns Restore result with the restored data
 *
 * @example
 * ```typescript
 * const result = await restoreBackup('backup_123', {
 *   verifyBeforeRestore: true
 * })
 * console.log(result.success) // true
 * console.log(result.data) // Restored data
 * ```
 */
export async function restoreBackup<T = unknown>(
  backupId: string,
  options: RestoreBackupOptions = {}
): Promise<RestoreResult & { data?: T }> {
  const {
    createPreRestoreBackup = false,
    categories = [],
    verifyBeforeRestore = true,
    overwrite = false,
    onProgress,
    onConfirm
  } = options

  const startTime = Date.now()
  let preRestoreBackupId: string | undefined

  try {
    // Get backup
    reportProgress(onProgress as any, { stage: 'preparing', progress: 0, message: 'Loading backup...' })
    const backup = await getBackup<T>(backupId)

    if (!backup) {
      throw new NotFoundError('backup', backupId)
    }

    // Verify backup integrity if requested
    if (verifyBeforeRestore) {
      reportProgress(onProgress as any, { stage: 'verifying', progress: 5, message: 'Verifying backup integrity...' })
      const verification = await verifyBackup(backup)

      if (!verification.valid) {
        throw new ValidationError('Backup verification failed', {
          context: { verification }
        })
      }
    }

    // Create preview for confirmation
    const preview = createRestorePreview(backup, overwrite, createPreRestoreBackup)

    // Request confirmation if callback provided
    if (onConfirm) {
      const confirmed = await onConfirm(preview)
      if (!confirmed) {
        throw new ValidationError('Restore cancelled by user', {
          context: { backupId }
        })
      }
    }

    // Create pre-restore backup if requested
    if (createPreRestoreBackup) {
      reportProgress(onProgress as any, { stage: 'preparing', progress: 10, message: 'Creating pre-restore backup...' })
      // For a generic library, we can't backup the current state
      // So we just note this in the result
      preRestoreBackupId = `pre-restore-${Date.now()}`
    }

    // Restore data
    reportProgress(onProgress as any, { stage: 'restoring', progress: 20, message: 'Restoring data...' })

    // Filter by categories if specified
    let restoredData = backup.data
    if (categories.length > 0 && typeof backup.data === 'object' && backup.data !== null) {
      const filtered: any = {}
      for (const category of categories) {
        if (category in backup.data) {
          filtered[category] = (backup.data as any)[category]
        }
      }
      restoredData = filtered as T
    }

    reportProgress(onProgress as any, { stage: 'validating', progress: 95, message: 'Validating restore...' })
    reportProgress(onProgress as any, { stage: 'completed', progress: 100, message: 'Restore completed!' })

    // Count items
    const itemsRestored = countItems(restoredData)

    const result: RestoreResult & { data?: T } = {
      success: true,
      itemsRestored,
      errors: [],
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      backupId,
      preRestoreBackupCreated: createPreRestoreBackup,
      preRestoreBackupId,
      data: restoredData
    }

    console.log(`[Backup Manager] Restored backup: ${backup.name}`)
    return result
  } catch (error) {
    const result: RestoreResult & { data?: T } = {
      success: false,
      itemsRestored: {},
      errors: [{
        category: 'restore',
        message: error instanceof Error ? error.message : String(error)
      }],
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      backupId,
      preRestoreBackupCreated: createPreRestoreBackup,
      preRestoreBackupId
    }

    console.error('[Backup Manager] Restore failed:', error)
    return result
  }
}

// ============================================================================
// BACKUP MANAGEMENT
// ============================================================================

/**
 * Delete a backup by ID
 *
 * @param backupId - Backup ID to delete
 *
 * @example
 * ```typescript
 * await deleteBackupById('backup_123')
 * ```
 */
export async function deleteBackupById(backupId: string): Promise<void> {
  const { deleteBackup } = await import('./storage')
  await deleteBackup(backupId)
  console.log(`[Backup Manager] Deleted backup: ${backupId}`)
}

/**
 * Get backup statistics
 *
 * @returns Backup statistics
 *
 * @example
 * ```typescript
 * const stats = await getStatistics()
 * console.log(stats.totalBackups) // 10
 * ```
 */
export async function getStatistics() {
  return await getBackupStatistics()
}

/**
 * Download backup as file
 *
 * @param backupId - Backup ID
 * @returns File blob
 *
 * @example
 * ```typescript
 * const blob = await downloadBackup('backup_123')
 * // Trigger download in browser
 * const url = URL.createObjectURL(blob)
 * const a = document.createElement('a')
 * a.href = url
 * a.download = 'backup.json.gz'
 * a.click()
 * ```
 */
export async function downloadBackup<T>(backupId: string): Promise<Blob> {
  const backup = await getBackup<T>(backupId)

  if (!backup) {
    throw new NotFoundError('backup', backupId)
  }

  const { compressBackupForDownload } = await import('./compression')
  return await compressBackupForDownload(backup, backup.compression)
}

/**
 * Upload and restore from backup file
 *
 * @param file - Uploaded file
 * @param options - Restore options
 * @returns Restore result
 *
 * @example
 * ```typescript
 * const fileInput = document.querySelector('input[type="file"]')
 * const result = await restoreFromUploadedFile(fileInput.files[0])
 * console.log(result.data) // Restored data
 * ```
 */
export async function restoreFromUploadedFile<T = unknown>(
  file: File,
  options?: RestoreBackupOptions
): Promise<RestoreResult & { data?: T }> {
  // Import file
  const { decompressBackupFromUpload } = await import('./compression')
  const backupFile = await decompressBackupFromUpload<T>(file)

  // Create backup object
  const backup: Backup<T> = {
    id: `upload_${Date.now()}`,
    timestamp: backupFile.timestamp,
    type: backupFile.type,
    status: 'completed',
    size: new Blob([JSON.stringify(backupFile.data)]).size,
    compressedSize: 0,
    compression: backupFile.compression,
    encryption: backupFile.encryption,
    checksum: backupFile.checksum,
    version: backupFile.version,
    appVersion: backupFile.appVersion,
    isAutomatic: false,
    name: `Uploaded: ${file.name}`,
    data: backupFile.data,
    tags: ['uploaded'],
    parentBackupId: undefined
  }

  // Save to storage
  await saveBackup(backup)

  // Restore
  return await restoreBackup(backup.id, options)
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate backup name
 */
function generateBackupName(type: BackupType, isAutomatic: boolean): string {
  const date = new Date().toLocaleDateString()
  const time = new Date().toLocaleTimeString()

  if (isAutomatic) {
    return `Automatic ${type} backup - ${date} ${time}`
  }

  return `${type.charAt(0).toUpperCase() + type.slice(1)} backup - ${date} ${time}`
}

/**
 * Create restore preview
 */
function createRestorePreview<T>(
  backup: Backup<T>,
  overwrite: boolean,
  preRestoreBackup: boolean
): RestorePreview {
  const itemsToRestore = countItems(backup.data)

  return {
    backupId: backup.id,
    backupName: backup.name,
    backupDate: backup.timestamp,
    backupSize: backup.size,
    backupType: backup.type,
    itemsToRestore,
    willOverwrite: overwrite,
    preRestoreBackup,
    estimatedDuration: Math.max(Object.values(itemsToRestore).reduce((a, b) => a + b, 0), 10) * 100
  }
}

/**
 * Count items in data by category
 */
function countItems(data: unknown): Record<string, number> {
  if (typeof data !== 'object' || data === null) {
    return {}
  }

  const counts: Record<string, number> = {}

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      counts[key] = value.length
    } else if (typeof value === 'object' && value !== null) {
      counts[key] = Object.keys(value).length
    } else {
      counts[key] = 1
    }
  }

  return counts
}

/**
 * Report progress
 */
function reportProgress(
  callback: ((progress: BackupProgress | RestoreProgress) => void) | undefined,
  progress: BackupProgress | RestoreProgress
): void {
  if (callback) {
    try {
      callback(progress)
    } catch (error) {
      console.error('[Backup Manager] Progress callback error:', error)
    }
  }
}
