/**
 * Export System Type Definitions
 *
 * Comprehensive type definitions for the data export system.
 * Supports multiple formats, scopes, and scheduling.
 */

// ============================================================================
// EXPORT FORMATS
// ============================================================================

export type ExportFormat =
  | 'json'      // Native JSON format
  | 'markdown'  // Human-readable Markdown
  | 'csv'       // Spreadsheet-compatible CSV
  | 'pdf'       // Professional PDF report
  | 'html'      // Web-viewable HTML
  | 'yaml'      // Configuration YAML
  | 'zip'       // Compressed archive

export type ExportScope =
  | 'all'           // All data
  | 'conversations' // Conversations and messages only
  | 'knowledge'     // Knowledge base only
  | 'settings'      // Settings only
  | 'analytics'     // Analytics data only
  | 'contacts'      // AI contacts only

// ============================================================================
// EXPORT OPTIONS
// ============================================================================

export interface ExportOptions {
  /** Export format */
  format: ExportFormat

  /** Data scope to export */
  scope: ExportScope

  /** Optional date range filter */
  dateRange?: {
    start: Date
    end: Date
  }

  /** Include media attachments (if applicable) */
  includeAttachments?: boolean

  /** Compress output (for JSON, CSV, etc.) */
  compress?: boolean

  /** Encrypt output with password (future) */
  encryption?: {
    enabled: boolean
    password?: string
  }

  /** Split large files into chunks */
  splitLargeFiles?: boolean

  /** Maximum file size before splitting (bytes) */
  maxFileSize?: number

  /** Data provider function */
  dataProvider?: DataProvider
}

export interface DataProvider {
  /** Get conversations */
  getConversations?: (options?: any) => Promise<any[]>
  /** Get messages for a conversation */
  getMessages?: (conversationId: string) => Promise<any[]>
  /** Get knowledge entries */
  getKnowledge?: () => Promise<any[]>
  /** Get contacts */
  getContacts?: () => Promise<any[]>
  /** Get settings */
  getSettings?: () => Promise<any>
}

export interface ExportResult {
  /** Exported data as Blob */
  data: Blob

  /** Suggested filename */
  filename: string

  /** File MIME type */
  mimeType: string

  /** Export statistics */
  stats: ExportStats

  /** Timestamp of export */
  exportedAt: string
}

export interface ExportStats {
  /** Number of conversations exported */
  conversations: number

  /** Number of messages exported */
  messages: number

  /** Number of knowledge entries exported */
  knowledgeEntries: number

  /** Number of contacts exported */
  contacts: number

  /** Total file size (bytes) */
  totalSize: number

  /** Compression ratio (if compressed) */
  compressionRatio?: number

  /** Export duration (ms) */
  duration: number
}

// ============================================================================
// EXPORT SCHEDULING
// ============================================================================

export type ExportScheduleType =
  | 'once'      // One-time export
  | 'daily'     // Every day
  | 'weekly'    // Every week
  | 'monthly'   // Every month
  | 'custom'    // Custom interval (minutes)

export interface ExportSchedule {
  /** Unique schedule ID */
  id: string

  /** Schedule name */
  name: string

  /** Schedule type */
  type: ExportScheduleType

  /** Export format */
  format: ExportFormat

  /** Data scope */
  scope: ExportScope

  /** Schedule configuration */
  config: ScheduleConfig

  /** Export options */
  options: ExportOptions

  /** Whether schedule is active */
  active: boolean

  /** When schedule was created */
  createdAt: string

  /** When schedule will run next */
  nextRunAt: string

  /** Last run time */
  lastRunAt?: string

  /** Number of times run */
  runCount: number
}

export interface ScheduleConfig {
  /** Time of day to run (HH:MM format) */
  timeOfDay?: string

  /** Day of week (1-7, for weekly) */
  dayOfWeek?: number

  /** Day of month (1-31, for monthly) */
  dayOfMonth?: number

  /** Custom interval in minutes (for custom type) */
  intervalMinutes?: number

  /** Maximum number of exports to keep (0 = unlimited) */
  maxExports?: number

  /** Storage location (future: cloud, email, etc.) */
  storage?: 'local' | 'cloud' | 'email'
}

// ============================================================================
// EXPORT HISTORY
// ============================================================================

export interface ExportRecord {
  /** Unique record ID */
  id: string

  /** Associated schedule ID (if scheduled) */
  scheduleId?: string

  /** Export format */
  format: ExportFormat

  /** Data scope */
  scope: ExportScope

  /** Export statistics */
  stats: ExportStats

  /** File location (if saved locally) */
  fileLocation?: string

  /** Whether export was successful */
  success: boolean

  /** Error message (if failed) */
  error?: string

  /** When export was created */
  createdAt: string

  /** When export completed */
  completedAt?: string
}

// ============================================================================
// PARTIAL EXPORT
// ============================================================================

export interface PartialExportOptions {
  /** Specific conversation IDs to export */
  conversationIds?: string[]

  /** Specific knowledge entry IDs to export */
  knowledgeIds?: string[]

  /** Specific contact IDs to export */
  contactIds?: string[]

  /** Date range */
  dateRange?: {
    start: Date
    end: Date
  }

  /** Filter by tags */
  tags?: string[]

  /** Filter by search query */
  searchQuery?: string
}

// ============================================================================
// NATIVE EXPORT FORMAT
// ============================================================================

/**
 * Native export format structure
 * Used for JSON exports and full backups
 */
export interface NativeExport {
  /** Export format version */
  version: string

  /** Export metadata */
  metadata: {
    /** When export was created */
    exportedAt: string

    /** Application version */
    appVersion: string

    /** Export scope */
    scope: ExportScope

    /** Total items */
    itemCount: number
  }

  /** Conversations (if scope includes conversations) */
  conversations?: any[]

  /** Knowledge entries (if scope includes knowledge) */
  knowledge?: any[]

  /** AI contacts (if scope includes contacts) */
  contacts?: any[]

  /** Settings (if scope includes settings) */
  settings?: any

  /** Analytics data (if scope includes analytics) */
  analytics?: any
}

// ============================================================================
// FORMAT-SPECIFIC OPTIONS
// ============================================================================

export interface MarkdownExportOptions {
  /** Include metadata headers */
  includeMetadata: boolean

  /** Include table of contents */
  includeTOC: boolean

  /** Message format */
  messageFormat: 'chat' | 'log' | 'narrative'

  /** Code block styling */
  codeBlocks: boolean
}

export interface CSVExportOptions {
  /** Delimiter character */
  delimiter: ',' | ';' | '\t'

  /** Include headers row */
  includeHeaders: boolean

  /** Date format */
  dateFormat: 'ISO' | 'US' | 'EU' | 'timestamp'

  /** How to handle multi-line content */
  multilineHandling: 'wrap' | 'escape' | 'truncate'
}

export interface PDFExportOptions {
  /** Page size */
  pageSize: 'A4' | 'Letter' | 'Legal'

  /** Orientation */
  orientation: 'portrait' | 'landscape'

  /** Include page numbers */
  includePageNumbers: boolean

  /** Include table of contents */
  includeTOC: boolean

  /** Font family */
  fontFamily: string

  /** Font size */
  fontSize: number

  /** Margins (points) */
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export interface HTMLExportOptions {
  /** Include CSS styling */
  includeStyles: boolean

  /** Theme */
  theme: 'light' | 'dark' | 'auto'

  /** Include interactive navigation */
  includeNav: boolean

  /** Include search functionality */
  includeSearch: boolean

  /** Responsive design */
  responsive: boolean
}

export interface YAMLExportOptions {
  /** Indentation style */
  indent: number

  /** Sort keys alphabetically */
  sortKeys: boolean

  /** Flow style for collections */
  flowStyle: boolean
}
