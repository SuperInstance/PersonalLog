/**
 * Backup and Restore System - Type Definitions
 *
 * Comprehensive backup system for all user data in PersonalLog.
 * Supports full backups, incremental backups, scheduling, and integrity verification.
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
 * Encryption algorithm (future enhancement)
 */
export type EncryptionType = 'none' | 'aes-256-gcm'

/**
 * Backup data categories for selective backup
 */
export type BackupCategory =
  | 'conversations'
  | 'knowledge'
  | 'settings'
  | 'analytics'
  | 'personalization'
  | 'all'

/**
 * Schedule interval for automatic backups
 */
export type BackupScheduleInterval = 'daily' | 'weekly' | 'monthly'

// ============================================================================
// BACKUP METADATA
// ============================================================================

/**
 * Main backup structure
 */
export interface Backup {
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

  /** Backup data */
  data: BackupData
}

/**
 * Backup data structure
 */
export interface BackupData {
  /** Conversations with messages */
  conversations?: ConversationBackup[]

  /** Knowledge base entries */
  knowledge?: KnowledgeBackup[]

  /** User settings and preferences */
  settings?: SettingsBackup

  /** Analytics events */
  analytics?: AnalyticsBackup

  /** Personalization data */
  personalization?: PersonalizationBackup
}

/**
 * Conversation backup data
 */
export interface ConversationBackup {
  id: string
  title: string
  type: string
  createdAt: string
  updatedAt: string
  messages: MessageBackup[]
  aiContacts: AIContactBackup[]
  settings: {
    responseMode: string
    compactOnLimit: boolean
    compactStrategy: string
  }
  metadata: {
    messageCount: number
    totalTokens: number
    hasMedia: boolean
    tags: string[]
    pinned: boolean
    archived: boolean
  }
}

/**
 * Message backup data
 */
export interface MessageBackup {
  id: string
  conversationId: string
  type: string
  author: {
    type: string
    name?: string
    reason?: string
  }
  content: {
    text?: string
    media?: {
      type: string
      url: string
      size: number
    }
    file?: {
      name: string
      type: string
      size: number
      url: string
    }
    systemNote?: string
  }
  timestamp: string
  replyTo?: string
  metadata: {
    tokens?: number
    editHistory?: Array<{
      timestamp: string
      previousContent: string
    }>
  }
}

/**
 * AI Contact backup data
 */
export interface AIContactBackup {
  id: string
  nickname: string
  provider: string
  model: string
  systemPrompt: string
  temperature?: number
  maxTokens?: number
  createdAt: string
}

/**
 * Knowledge base backup data
 */
export interface KnowledgeBackup {
  id: string
  type: 'conversation' | 'message' | 'document' | 'contact'
  sourceId: string
  content: string
  embedding?: number[]
  metadata: {
    timestamp: string
    author?: string
    contactId?: string
    conversationId?: string
    tags?: string[]
    importance?: number
    starred?: boolean
  }
  editable: boolean
  editedContent?: string
  editedAt?: string
}

/**
 * Settings backup data
 */
export interface SettingsBackup {
  /** User preferences */
  preferences?: {
    theme?: string
    fontSize?: number
    sidebarPosition?: string
    autoScrollMessages?: boolean
    responseMode?: string
    compactOnLimit?: boolean
    compactStrategy?: string
  }

  /** Intelligence settings */
  intelligence?: {
    analyticsEnabled?: boolean
    optimizationEnabled?: boolean
    personalizationEnabled?: boolean
    experimentsEnabled?: boolean
  }

  /** Feature flags */
  featureFlags?: Record<string, {
    enabled: boolean
    reason: string
    timestamp: string
  }>

  /** Hardware benchmarks */
  hardware?: {
    score: number
    cores: number
    ram: number
    hasGPU: boolean
    lastBenchmarked: string
  }

  /** Optimization settings */
  optimization?: {
    strategy: string
    performanceMode: string
    cacheEnabled: boolean
  }
}

/**
 * Analytics backup data
 */
export interface AnalyticsBackup {
  /** Analytics events (last N events based on retention) */
  events?: Array<{
    id: string
    type: string
    category: string
    timestamp: string
    sessionId: string
    data: unknown
    metadata?: {
      hardwareHash?: string
      activeFeatures?: string[]
      appVersion?: string
    }
  }>

  /** Aggregated statistics */
  statistics?: {
    totalEvents: number
    totalSessions: number
    avgSessionDuration: number
    mostActiveDay: string
    lastUpdated: string
  }
}

/**
 * Personalization backup data
 */
export interface PersonalizationBackup {
  /** Communication preferences */
  communication?: {
    responseLength: string
    tone: string
    useEmojis: boolean
    formatting: string
  }

  /** UI preferences */
  ui?: {
    theme: string
    density: string
    fontSize: number
    animations: string
    sidebarPosition: string
    autoScrollMessages: boolean
    groupMessagesByContext: boolean
  }

  /** Content preferences */
  content?: {
    topicsOfInterest: string[]
    readingLevel: string
    language: string
    autoPlayMedia: boolean
    recentQueries: string[]
  }

  /** Learned interaction patterns */
  patterns?: {
    peakHours: number[]
    avgSessionLength: number
    topFeatures: string[]
    errorFrequency: number
    helpSeekFrequency: number
  }

  /** All tracked preferences */
  preferences?: Record<string, {
    key: string
    value: unknown
    defaultValue: unknown
    source: 'explicit' | 'learned' | 'default'
    confidence: number
    lastUpdated: string
    observationCount: number
  }>

  /** Learning state */
  learning?: {
    enabled: boolean
    disabledCategories: string[]
    totalActionsRecorded: number
    learningStartedAt: string
    lastActionAt: string
  }
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

  /** Number of items restored */
  itemsRestored: {
    conversations: number
    messages: number
    knowledge: number
    settings: number
    analytics: number
    personalization: number
  }

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
  integrityChecks: {
    conversations: { valid: boolean; count: number; errors: string[] }
    knowledge: { valid: boolean; count: number; errors: string[] }
    settings: { valid: boolean; errors: string[] }
    analytics: { valid: boolean; count: number; errors: string[] }
    personalization: { valid: boolean; errors: string[] }
  }

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

  /** Categories to include (or 'all') */
  categories: BackupCategory[]

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
export interface CreateBackupOptions {
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
  categories?: BackupCategory[]

  /** For incremental backups: parent backup ID */
  parentBackupId?: string

  /** Whether this is an automatic backup */
  isAutomatic?: boolean

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
  categories?: BackupCategory[]

  /** Whether to verify backup before restoring */
  verifyBeforeRestore?: boolean

  /** Whether to overwrite existing data */
  overwrite?: boolean

  /** Progress callback */
  onProgress?: (progress: RestoreProgress) => void

  /** Confirmation callback (should return true to proceed) */
  onConfirm?: (preview: RestorePreview) => Promise<boolean>
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
  itemsToRestore: {
    conversations: number
    messages: number
    knowledge: number
    settings: number
    analytics: number
    personalization: number
  }
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
export interface BackupFile {
  version: string
  timestamp: string
  type: BackupType
  checksum: string
  compression: CompressionType
  encryption: EncryptionType
  appVersion: string
  data: BackupData
}
