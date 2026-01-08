/**
 * Auto Backup Compression Encryption - Type Definitions
 *
 * Comprehensive backup system with compression and encryption support.
 * This is a generic library that can backup any JSON-serializable data.
 */

// ============================================================================
// BACKUP TYPES
// ============================================================================

/**
 * Type of backup
 */
export type BackupType = 'full' | 'incremental'

/**
 * Backup status
 */
export type BackupStatus = 'pending' | 'in-progress' | 'completed' | 'failed'

/**
 * Compression algorithm
 */
export type CompressionType = 'none' | 'gzip'

/**
 * Encryption algorithm
 */
export type EncryptionType = 'none' | 'aes-256-gcm'

/**
 * Schedule interval for automatic backups
 */
export type BackupScheduleInterval = 'daily' | 'weekly' | 'monthly'

// ============================================================================
// BACKUP METADATA
// ============================================================================

/**
 * Main backup structure - Generic version that can hold any data
 */
export interface Backup<T = unknown> {
  /** Unique backup identifier */
  id: string

  /** Backup timestamp (ISO 8601) */
  timestamp: string

  /** Backup type */
  type: BackupType

  /** Backup status */
  status: BackupStatus

  /** Size in bytes (uncompressed) */
  size: number

  /** Compressed size in bytes */
  compressedSize: number

  /** Compression algorithm used */
  compression: CompressionType

  /** Encryption algorithm used */
  encryption: EncryptionType

  /** SHA-256 checksum for integrity verification */
  checksum: string

  /** Backup format version */
  version: string

  /** App version that created this backup */
  appVersion: string

  /** Whether this is an automatic backup */
  isAutomatic: boolean

  /** Backup name (user-specified or auto-generated) */
  name: string

  /** Optional description */
  description?: string

  /** Tags for categorization */
  tags: string[]

  /** For incremental backups: ID of the last full backup */
  parentBackupId?: string

  /** For incremental backups: IDs of changed items since parent */
  changedItems?: string[]

  /** Backup data - can be any JSON-serializable data */
  data: T
}

/**
 * Generic backup data wrapper
 */
export interface BackupData {
  /** User-defined data categories */
  [key: string]: unknown
}

// ============================================================================
// RESTORE RESULT
// ============================================================================

/**
 * Result of a restore operation
 */
export interface RestoreResult {
  /** Whether restore was successful */
  success: boolean

  /** Number of items restored by category */
  itemsRestored: Record<string, number>

  /** Any errors that occurred during restore */
  errors: Array<{
    category: string
    message: string
    item?: string
  }>

  /** Restore timestamp */
  timestamp: string

  /** Duration of restore in milliseconds */
  duration: number

  /** Backup ID that was restored */
  backupId: string

  /** Whether pre-restore backup was created */
  preRestoreBackupCreated: boolean

  /** Pre-restore backup ID (if created) */
  preRestoreBackupId?: string
}

// ============================================================================
// VERIFICATION RESULT
// ============================================================================

/**
 * Result of backup verification
 */
export interface VerificationResult {
  /** Whether backup is valid */
  valid: boolean

  /** Checksum match */
  checksumValid: boolean

  /** Version compatibility */
  versionCompatible: boolean

  /** Data integrity check results */
  integrityChecks: Record<string, {
    valid: boolean
    count?: number
    errors: string[]
  }>

  /** Total size verification */
  sizeVerification: {
    expected: number
    actual: number
    match: boolean
  }

  /** Any warnings */
  warnings: string[]

  /** Verification timestamp */
  timestamp: string
}

// ============================================================================
// SCHEDULE
// ============================================================================

/**
 * Backup schedule configuration
 */
export interface BackupSchedule {
  /** Unique schedule ID */
  id: string

  /** Schedule interval */
  interval: BackupScheduleInterval

  /** Whether schedule is enabled */
  enabled: boolean

  /** Time of day to run (HH:MM format) */
  timeOfDay: string

  /** Day of week for weekly backups (1-7, 1=Monday) */
  dayOfWeek?: number

  /** Day of month for monthly backups (1-31) */
  dayOfMonth?: number

  /** Type of backup to create */
  backupType: BackupType

  /** Maximum number of backups to keep */
  retentionCount: number

  /** Retention period in days */
  retentionDays: number

  /** Whether to compress backups */
  compress: boolean

  /** Categories to include (user-defined) */
  categories: string[]

  /** Last scheduled backup timestamp */
  lastBackup?: string

  /** Next scheduled backup timestamp */
  nextBackup: string

  /** Number of successful backups */
  successfulBackups: number

  /** Number of failed backups */
  failedBackups: number
}

// ============================================================================
// BACKUP STATISTICS
// ============================================================================

/**
 * Backup statistics summary
 */
export interface BackupStatistics {
  /** Total number of backups */
  totalBackups: number

  /** Total size of all backups (bytes) */
  totalSize: number

  /** Backup breakdown by type */
  byType: {
    full: { count: number; size: number }
    incremental: { count: number; size: number }
  }

  /** Backup breakdown by status */
  byStatus: {
    completed: number
    failed: number
    pending: number
    'in-progress': number
  }

  /** Oldest backup timestamp */
  oldestBackup?: string

  /** Newest backup timestamp */
  newestBackup?: string

  /** Last backup timestamp */
  lastBackup?: string

  /** Average backup size (bytes) */
  averageBackupSize: number

  /** Storage usage information */
  storageUsage: {
    used: number
    total: number
    percentage: number
  }
}

// ============================================================================
// BACKUP OPTIONS
// ============================================================================

/**
 * Options for creating a backup
 */
export interface CreateBackupOptions<T = unknown> {
  /** Backup type */
  type?: BackupType

  /** Backup name (optional, will auto-generate if not provided) */
  name?: string

  /** Optional description */
  description?: string

  /** Tags for categorization */
  tags?: string[]

  /** Whether to compress the backup */
  compress?: boolean

  /** Categories to include (defaults to all) */
  categories?: string[]

  /** For incremental backups: parent backup ID */
  parentBackupId?: string

  /** Whether this is an automatic backup */
  isAutomatic?: boolean

  /** Data to backup */
  data: T

  /** Progress callback */
  onProgress?: (progress: BackupProgress) => void
}

/**
 * Options for restoring a backup
 */
export interface RestoreBackupOptions {
  /** Whether to create a pre-restore backup */
  createPreRestoreBackup?: boolean

  /** Categories to restore (defaults to all) */
  categories?: string[]

  /** Whether to verify backup before restoring */
  verifyBeforeRestore?: boolean

  /** Whether to overwrite existing data */
  overwrite?: boolean

  /** Progress callback */
  onProgress?: (progress: RestoreProgress) => void

  /** Confirmation callback (should return true to proceed) */
  onConfirm?: (preview: RestorePreview) => Promise<boolean> | boolean
}

/**
 * Backup progress information
 */
export interface BackupProgress {
  stage: 'preparing' | 'exporting' | 'compressing' | 'encrypting' | 'saving' | 'completed'
  progress: number // 0-100
  category?: string
  message: string
  bytesProcessed?: number
  totalBytes?: number
}

/**
 * Restore progress information
 */
export interface RestoreProgress {
  stage: 'verifying' | 'preparing' | 'restoring' | 'validating' | 'completed'
  progress: number // 0-100
  category?: string
  message: string
  itemsRestored?: number
  totalItems?: number
}

/**
 * Restore preview (shown before confirmation)
 */
export interface RestorePreview {
  backupId: string
  backupName: string
  backupDate: string
  backupSize: number
  backupType: BackupType
  itemsToRestore: Record<string, number>
  willOverwrite: boolean
  preRestoreBackup: boolean
  estimatedDuration: number // milliseconds
}

// ============================================================================
// BACKUP STORAGE
// ============================================================================

/**
 * Backup storage configuration
 */
export interface BackupStorageConfig {
  /** Maximum storage quota (bytes) */
  maxStorage?: number

  /** Default retention policy */
  defaultRetention?: {
    daily: number // Keep daily backups for N days
    weekly: number // Keep weekly backups for N days
    monthly: number // Keep monthly backups for N days
  }

  /** Whether to auto-delete old backups */
  autoDeleteOldBackups?: boolean

  /** Minimum number of backups to keep */
  minBackupsToKeep?: number

  /** Warn when storage exceeds this percentage */
  storageWarningThreshold?: number
}

// ============================================================================
// EXPORT FORMAT
// ============================================================================

/**
 * Complete backup file format (for download/upload)
 */
export interface BackupFile<T = unknown> {
  version: string
  timestamp: string
  type: BackupType
  checksum: string
  compression: CompressionType
  encryption: EncryptionType
  appVersion: string
  data: T
}

// ============================================================================
// ENCRYPTION TYPES
// ============================================================================

/**
 * Encryption result
 */
export interface EncryptionResult {
  ciphertext: string   // Base64 encoded
  iv: string          // Base64 encoded initialization vector
  keyId: string
  checksum: string    // SHA-256 hash
}

/**
 * Decryption result
 */
export interface DecryptionResult {
  plaintext: unknown
  verified: boolean   // Checksum verification
}

/**
 * Key pair for asymmetric encryption
 */
export interface KeyPair {
  publicKey: string    // Base64 encoded
  privateKey: string   // Base64 encoded
  keyId: string        // Unique key identifier
  createdAt: number
}
