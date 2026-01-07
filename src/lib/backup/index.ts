/**
 * Backup System Module
 *
 * Comprehensive backup and restore functionality for PersonalLog.
 * Exports all backup-related utilities.
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  BackupType,
  BackupStatus,
  CompressionType,
  EncryptionType,
  BackupCategory,
  BackupScheduleInterval,
} from './types'

export type {
  Backup,
  BackupData,
  ConversationBackup,
  MessageBackup,
  AIContactBackup,
  KnowledgeBackup,
  SettingsBackup,
  AnalyticsBackup,
  PersonalizationBackup,
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
  BackupFile
} from './types'

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
  clearAllBackups,
  exportBackupAsFile,
  importBackupFromFile
} from './storage'

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
// SCHEDULER
// ============================================================================

export {
  createSchedule,
  getSchedules,
  updateSchedule,
  deleteSchedule,
  setScheduleEnabled,
  startScheduler,
  stopScheduler,
  getNextScheduledBackup,
  getScheduleHistory,
  triggerScheduledBackup
} from './scheduler'

// ============================================================================
// RECOVERY
// ============================================================================

export {
  BackupRecovery,
  restoreFromBackup,
  previewRestore
} from './recovery'

// ============================================================================
// ROLLBACK
// ============================================================================

export {
  RollbackManager,
  createSnapshot,
  rollback,
  listSnapshots
} from './rollback'

export type {
  SnapshotMetadata,
  CreateSnapshotOptions,
  SnapshotProgress,
  SnapshotType,
  RollbackOptions,
  RollbackProgress,
  RollbackResult
} from './rollback'

// ============================================================================
// INTEGRITY
// ============================================================================

export {
  BackupIntegrityChecker,
  checkBackupIntegrity,
  generateIntegrityReport
} from './integrity'

export type {
  IntegrityCheckResult,
  IntegrityReport,
  CategoryIntegrityResult,
  IntegrityError,
  CorruptionIndicator
} from './integrity'
