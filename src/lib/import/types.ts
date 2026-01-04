/**
 * Import System Type Definitions
 *
 * Comprehensive type definitions for the data import system.
 * Supports multiple sources, validation, and conflict resolution.
 */

// ============================================================================
// IMPORT SOURCES
// ============================================================================

export type ImportSourceType =
  | 'personallog'   // PersonalLog backup (JSON)
  | 'chatgpt'       // ChatGPT export
  | 'claude'        // Claude export
  | 'json'          // Generic JSON
  | 'csv'           // CSV file
  | 'markdown'      // Markdown file
  | 'url'           // URL import (future)

// ============================================================================
// IMPORT OPTIONS
// ============================================================================

export interface ImportOptions {
  /** How to handle conflicts */
  conflictResolution: ConflictResolution

  /** Whether to validate before importing */
  validate: boolean

  /** Create preview before importing */
  preview: boolean

  /** Import mode */
  mode: ImportMode

  /** Skip conversations that already exist */
  skipDuplicates: boolean

  /** Preserve original IDs */
  preserveIds: boolean

  /** Map contacts to existing ones */
  mapContacts: boolean

  /** Whether to create backup before import */
  createBackup: boolean
}

export type ImportMode =
  | 'full'        // Import everything
  | 'selective'   // User selects what to import
  | 'merge'       // Merge with existing data
  | 'replace'     // Replace existing data

export type ConflictResolution =
  | 'skip'        // Skip conflicting items
  | 'overwrite'   // Replace existing with imported
  | 'rename'      // Import with new ID
  | 'merge'       // Merge data when possible
  | 'ask'         // Prompt user for each conflict

// ============================================================================
// IMPORT PREVIEW
// ============================================================================

export interface ImportPreview {
  /** Unique preview ID */
  id: string

  /** Source type detected */
  sourceType: ImportSourceType

  /** File being imported */
  file: {
    name: string
    size: number
    type: string
  }

  /** Items that will be imported */
  items: ImportItem[]

  /** Conflicts detected */
  conflicts: ImportConflict[]

  /** Warnings (non-blocking issues) */
  warnings: ImportWarning[]

  /** Errors (blocking issues) */
  errors: ImportError[]

  /** Estimated storage size */
  estimatedSize: number

  /** Whether import can proceed */
  canImport: boolean

  /** Import validation results */
  validation: ValidationResult

  /** Timestamp of preview generation */
  generatedAt: string
}

export interface ImportItem {
  /** Item type */
  type: 'conversation' | 'message' | 'knowledge' | 'contact' | 'settings'

  /** Item ID (from source) */
  sourceId: string

  /** New ID (if mapped) */
  targetId?: string

  /** Item title/description */
  title: string

  /** Item data */
  data: any

  /** Whether item will be imported */
  selected: boolean

  /** Whether item has conflicts */
  hasConflicts: boolean

  /** Estimated size (bytes) */
  size: number
}

// ============================================================================
// IMPORT CONFLICTS
// ============================================================================

export interface ImportConflict {
  /** Conflict ID */
  id: string

  /** Item with conflict */
  item: ImportItem

  /** Existing item that conflicts */
  existing: any

  /** Conflict type */
  type: ConflictType

  /** Description of conflict */
  description: string

  /** Suggested resolution */
  suggestedResolution: ConflictResolution

  /** User's resolution (if set) */
  resolution?: ConflictResolution

  /** Field-by-field comparison */
  fieldComparison?: FieldComparison[]
}

export type ConflictType =
  | 'duplicate-id'       // Same ID exists
  | 'duplicate-title'    // Same title exists
  | 'data-mismatch'      // Same ID but different data
  | 'reference-broken'   // Referenced item doesn't exist
  | 'constraint-violation' // Violates data constraints

export interface FieldComparison {
  /** Field name */
  field: string

  /** Value in imported item */
  imported: any

  /** Value in existing item */
  existing: any

  /** Whether values match */
  matches: boolean
}

// ============================================================================
// IMPORT WARNINGS & ERRORS
// ============================================================================

export interface ImportWarning {
  /** Warning code */
  code: string

  /** Warning message */
  message: string

  /** Affected item IDs */
  itemIds: string[]

  /** Severity */
  severity: 'low' | 'medium' | 'high'
}

export interface ImportError {
  /** Error code */
  code: string

  /** Error message */
  message: string

  /** Technical details */
  technical?: string

  /** Affected item IDs */
  itemIds: string[]

  /** Whether error is blocking */
  blocking: boolean
}

// ============================================================================
// IMPORT RESULT
// ============================================================================

export interface ImportResult {
  /** Whether import was successful */
  success: boolean

  /** Items imported */
  imported: ImportedItem[]

  /** Items skipped */
  skipped: SkippedItem[]

  /** Conflicts resolved */
  conflictsResolved: ConflictResolution[]

  /** Warnings issued */
  warnings: ImportWarning[]

  /** Errors encountered */
  errors: ImportError[]

  /** Import statistics */
  stats: ImportStats

  /** Timestamp of import */
  importedAt: string

  /** Duration (ms) */
  duration: number
}

export interface ImportedItem {
  /** Item type */
  type: string

  /** Source ID */
  sourceId: string

  /** New ID */
  targetId: string

  /** Title */
  title: string
}

export interface SkippedItem {
  /** Item type */
  type: string

  /** Source ID */
  sourceId: string

  /** Reason for skipping */
  reason: string
}

export interface ImportStats {
  /** Total items processed */
  total: number

  /** Items imported */
  imported: number

  /** Items skipped */
  skipped: number

  /** Items with conflicts */
  conflicts: number

  /** Conversations imported */
  conversations: number

  /** Messages imported */
  messages: number

  /** Knowledge entries imported */
  knowledgeEntries: number

  /** Contacts imported */
  contacts: number

  /** Storage used (bytes) */
  storageUsed: number
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationResult {
  /** Whether all data is valid */
  valid: boolean

  /** Schema validation results */
  schema: SchemaValidation

  /** Type validation results */
  types: TypeValidation

  /** Constraint validation results */
  constraints: ConstraintValidation

  /** Security validation results */
  security: SecurityValidation
}

export interface SchemaValidation {
  /** Whether schema is valid */
  valid: boolean

  /** Schema errors */
  errors: SchemaError[]

  /** Missing required fields */
  missing: string[]
}

export interface SchemaError {
  /** Path to error */
  path: string

  /** Expected type */
  expected: string

  /** Actual value */
  actual: any

  /** Error message */
  message: string
}

export interface TypeValidation {
  /** Whether all types are valid */
  valid: boolean

  /** Type errors */
  errors: TypeError[]
}

export interface TypeError {
  /** Field path */
  path: string

  /** Expected type */
  expected: string

  /** Actual type */
  actual: string

  /** Value */
  value: any
}

export interface ConstraintValidation {
  /** Whether all constraints are satisfied */
  valid: boolean

  /** Constraint violations */
  violations: ConstraintViolation[]
}

export interface ConstraintViolation {
  /** Constraint type */
  type: 'unique' | 'foreign-key' | 'check' | 'length'

  /** Field path */
  path: string

  /** Description */
  description: string
}

export interface SecurityValidation {
  /** Whether data is safe to import */
  valid: boolean

  /** Security issues found */
  issues: SecurityIssue[]
}

export interface SecurityIssue {
  /** Issue type */
  type: 'malicious-content' | 'oversized-data' | 'suspicious-pattern'

  /** Severity */
  severity: 'low' | 'medium' | 'high'

  /** Description */
  description: string

  /** Affected items */
  itemIds: string[]
}

// ============================================================================
// PARSER-SPECIFIC TYPES
// ============================================================================

/**
 * ChatGPT export format
 */
export interface ChatGPTExport {
  /** Conversations array */
  conversations: ChatGPTConversation[]
}

export interface ChatGPTConversation {
  /** Conversation ID */
  id: string

  /** Conversation title */
  title: string

  /** Timestamp */
  timestamp: string

  /** Messages */
  messages: ChatGPTMessage[]
}

export interface ChatGPTMessage {
  /** Message role */
  role: 'user' | 'assistant'

  /** Message content */
  content: string
}

/**
 * Claude export format
 */
export interface ClaudeExport {
  /** Conversations array */
  conversations: ClaudeConversation[]
}

export interface ClaudeConversation {
  /** Conversation UUID */
  uuid: string

  /** Conversation name */
  name: string

  /** Creation time */
  created_at: string

  /** Updated time */
  updated_at: string

  /** Messages */
  messages: ClaudeMessage[]
}

export interface ClaudeMessage {
  /** Message UUID */
  uuid: string

  /** Sender */
  sender: 'human' | 'assistant'

  /** Content text */
  text: string

  /** Creation time */
  created_at: string

  /** Attachments */
  attachments?: ClaudeAttachment[]
}

export interface ClaudeAttachment {
  /** File name */
  name: string

  /** File size */
  size: number

  /** MIME type */
  mime_type: string

  /** Extracted text (if available) */
  extracted_text?: string
}
