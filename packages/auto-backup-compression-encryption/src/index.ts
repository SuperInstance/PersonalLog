/**
 * Auto Backup Compression Encryption
 *
 * A comprehensive backup system with compression and encryption for browser-based applications.
 *
 * @example
 * ```typescript
 * import { createBackup, restoreBackup } from '@superinstance/auto-backup-compression-encryption'
 *
 * // Create a backup
 * const backup = await createBackup({
 *   data: { myData: 'value' },
 *   name: 'My Backup',
 *   compress: true
 * })
 *
 * // Restore from backup
 * const result = await restoreBackup(backup.id)
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  BackupType,
  BackupStatus,
  CompressionType,
  EncryptionType,
  BackupScheduleInterval,
  Backup,
  BackupData,
  RestoreResult,
  VerificationResult,
  BackupSchedule,
  BackupStatistics,
  CreateBackupOptions,
  RestoreBackupOptions,
  BackupProgress,
  RestoreProgress,
  RestorePreview,
  BackupStorageConfig,
  BackupFile,
  EncryptionResult,
  DecryptionResult,
  KeyPair
} from './types'

// ============================================================================
// ERRORS
// ============================================================================

export {
  BackupError,
  CompressionError,
  EncryptionError,
  ValidationError,
  StorageError,
  NotFoundError,
  QuotaError
} from './errors'

// ============================================================================
// COMPRESSION
// ============================================================================

export {
  isCompressionSupported,
  compressData,
  decompressData,
  compressBackup,
  decompressBackup,
  compressBackupForDownload,
  decompressBackupFromUpload,
  calculateCompressionRatio,
  formatBytes,
  estimateCompressionRatio,
  createCompressionStream,
  createDecompressionStream
} from './compression'

// ============================================================================
// ENCRYPTION
// ============================================================================

export {
  BackupCrypto
} from './encryption'

// ============================================================================
// VERIFICATION
// ============================================================================

export {
  calculateChecksum,
  verifyChecksum,
  verifyBackup,
  verifyBackupFile,
  quickValidate,
  checkDataConsistency,
  findDuplicates
} from './verification'

// ============================================================================
// STORAGE
// ============================================================================

export {
  saveBackup,
  getBackup,
  listBackups,
  deleteBackup,
  deleteBackups,
  getStorageUsage,
  getBackupStatistics,
  isStorageQuotaExceeded,
  autoDeleteOldBackups,
  saveMetadata,
  getMetadata,
  deleteMetadata,
  clearAllBackups
} from './storage'

// ============================================================================
// MANAGER
// ============================================================================

export {
  createBackup,
  restoreBackup,
  deleteBackupById,
  getStatistics,
  downloadBackup,
  restoreFromUploadedFile
} from './manager'
