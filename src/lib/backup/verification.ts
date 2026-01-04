/**
 * Backup Verification Utilities
 *
 * Integrity verification for backups including checksum validation,
 * structure validation, and data consistency checks.
 */

import {
  Backup,
  BackupData,
  BackupFile,
  VerificationResult,
  ConversationBackup,
  KnowledgeBackup,
  SettingsBackup,
  AnalyticsBackup,
  PersonalizationBackup
} from './types'
import { StorageError, ValidationError } from '@/lib/errors'

// ============================================================================
// CHECKSUM CALCULATION
// ============================================================================

/**
 * Calculate SHA-256 checksum of data
 *
 * @param data - Data to hash (string or object)
 * @returns Promise resolving to hex checksum
 *
 * @example
 * ```typescript
 * const checksum = await calculateChecksum('{"foo":"bar"}')
 * console.log(checksum) // "sha256:abc123..."
 * ```
 */
export async function calculateChecksum(data: string | object): Promise<string> {
  try {
    // Convert to JSON string if needed
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data)

    // Use Web Crypto API for SHA-256
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(jsonString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    return `sha256:${hashHex}`
  } catch (error) {
    throw new StorageError('Failed to calculate checksum', {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined
    })
  }
}

/**
 * Verify checksum of backup data
 *
 * @param data - Data to verify
 * @param expectedChecksum - Expected checksum
 * @returns True if checksums match
 *
 * @example
 * ```typescript
 * const valid = await verifyChecksum(backupData, 'sha256:abc123...')
 * ```
 */
export async function verifyChecksum(
  data: string | object,
  expectedChecksum: string
): Promise<boolean> {
  try {
    const actualChecksum = await calculateChecksum(data)
    return actualChecksum === expectedChecksum
  } catch (error) {
    console.error('[Backup Verification] Checksum verification failed:', error)
    return false
  }
}

// ============================================================================
// BACKUP VERIFICATION
// ============================================================================

/**
 * Perform comprehensive verification of a backup
 *
 * @param backup - Backup to verify
 * @returns Verification result with detailed status
 *
 * @example
 * ```typescript
 * const result = await verifyBackup(backup)
 * if (result.valid) {
 *   console.log('Backup is valid')
 * } else {
 *   console.error('Backup verification failed:', result.integrityChecks)
 * }
 * ```
 */
export async function verifyBackup(backup: Backup): Promise<VerificationResult> {
  const result: VerificationResult = {
    valid: false,
    checksumValid: false,
    versionCompatible: false,
    integrityChecks: {
      conversations: { valid: true, count: 0, errors: [] },
      knowledge: { valid: true, count: 0, errors: [] },
      settings: { valid: true, errors: [] },
      analytics: { valid: true, count: 0, errors: [] },
      personalization: { valid: true, errors: [] }
    },
    sizeVerification: {
      expected: backup.size,
      actual: 0,
      match: false
    },
    warnings: [],
    timestamp: new Date().toISOString()
  }

  try {
    // 1. Verify checksum
    result.checksumValid = await verifyBackupChecksum(backup)
    if (!result.checksumValid) {
      result.integrityChecks.conversations.errors.push('Checksum validation failed')
    }

    // 2. Verify version compatibility
    result.versionCompatible = verifyBackupVersion(backup.version)
    if (!result.versionCompatible) {
      result.warnings.push(`Backup version ${backup.version} may not be compatible`)
    }

    // 3. Verify each data category
    if (backup.data) {
      await verifyConversations(backup.data.conversations || [], result.integrityChecks.conversations)
      await verifyKnowledge(backup.data.knowledge || [], result.integrityChecks.knowledge)
      await verifySettings(backup.data.settings, result.integrityChecks.settings)
      await verifyAnalytics(backup.data.analytics, result.integrityChecks.analytics)
      await verifyPersonalization(backup.data.personalization, result.integrityChecks.personalization)

      // Calculate actual size
      const jsonData = JSON.stringify(backup.data)
      result.sizeVerification.actual = new Blob([jsonData]).size
      result.sizeVerification.match = Math.abs(result.sizeVerification.expected - result.sizeVerification.actual) < 1000

      if (!result.sizeVerification.match) {
        result.warnings.push(`Size mismatch: expected ${result.sizeVerification.expected}, got ${result.sizeVerification.actual}`)
      }
    }

    // 4. Determine overall validity
    result.valid = result.checksumValid &&
      result.integrityChecks.conversations.valid &&
      result.integrityChecks.knowledge.valid &&
      result.integrityChecks.settings.valid &&
      result.integrityChecks.analytics.valid &&
      result.integrityChecks.personalization.valid

    return result
  } catch (error) {
    result.valid = false
    result.integrityChecks.conversations.errors.push(
      `Verification error: ${error instanceof Error ? error.message : String(error)}`
    )
    return result
  }
}

/**
 * Verify backup checksum
 */
async function verifyBackupChecksum(backup: Backup): Promise<boolean> {
  try {
    // Calculate checksum of current data
    const actualChecksum = await calculateChecksum(backup.data)

    // Compare with stored checksum
    return actualChecksum === backup.checksum
  } catch (error) {
    console.error('[Backup Verification] Checksum calculation failed:', error)
    return false
  }
}

/**
 * Verify backup version compatibility
 */
function verifyBackupVersion(version: string): boolean {
  // Simple version check - major version must match
  const currentMajor = parseInt(version.split('.')[0], 10)
  const expectedMajor = 1 // Current backup format version

  return currentMajor === expectedMajor
}

// ============================================================================
// CATEGORY VERIFICATION
// ============================================================================

/**
 * Verify conversation data integrity
 */
async function verifyConversations(
  conversations: ConversationBackup[],
  checkResult: { valid: boolean; count: number; errors: string[] }
): Promise<void> {
  checkResult.count = conversations.length

  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i]

    // Validate required fields
    if (!conv.id) {
      checkResult.errors.push(`Conversation ${i}: Missing ID`)
      checkResult.valid = false
    }

    if (!conv.title) {
      checkResult.errors.push(`Conversation ${conv.id || i}: Missing title`)
      checkResult.valid = false
    }

    if (!conv.createdAt) {
      checkResult.errors.push(`Conversation ${conv.id || i}: Missing createdAt timestamp`)
      checkResult.valid = false
    }

    // Verify messages array exists
    if (!Array.isArray(conv.messages)) {
      checkResult.errors.push(`Conversation ${conv.id || i}: Invalid messages array`)
      checkResult.valid = false
    }

    // Verify each message
    if (conv.messages) {
      for (let j = 0; j < conv.messages.length; j++) {
        const msg = conv.messages[j]

        if (!msg.id) {
          checkResult.errors.push(`Conversation ${conv.id}: Message ${j}: Missing ID`)
          checkResult.valid = false
        }

        if (!msg.timestamp) {
          checkResult.errors.push(`Conversation ${conv.id}: Message ${j}: Missing timestamp`)
          checkResult.valid = false
        }

        if (!msg.content) {
          checkResult.errors.push(`Conversation ${conv.id}: Message ${j}: Missing content`)
          checkResult.valid = false
        }
      }
    }
  }
}

/**
 * Verify knowledge data integrity
 */
async function verifyKnowledge(
  knowledge: KnowledgeBackup[],
  checkResult: { valid: boolean; count: number; errors: string[] }
): Promise<void> {
  checkResult.count = knowledge.length

  for (let i = 0; i < knowledge.length; i++) {
    const entry = knowledge[i]

    // Validate required fields
    if (!entry.id) {
      checkResult.errors.push(`Knowledge entry ${i}: Missing ID`)
      checkResult.valid = false
    }

    if (!entry.type) {
      checkResult.errors.push(`Knowledge entry ${entry.id || i}: Missing type`)
      checkResult.valid = false
    }

    if (!entry.content) {
      checkResult.errors.push(`Knowledge entry ${entry.id || i}: Missing content`)
      checkResult.valid = false
    }

    if (!entry.metadata || !entry.metadata.timestamp) {
      checkResult.errors.push(`Knowledge entry ${entry.id || i}: Missing metadata/timestamp`)
      checkResult.valid = false
    }

    // Verify embedding dimensions if present
    if (entry.embedding && entry.embedding.length === 0) {
      checkResult.errors.push(`Knowledge entry ${entry.id}: Invalid embedding (empty array)`)
      checkResult.valid = false
    }
  }
}

/**
 * Verify settings data integrity
 */
async function verifySettings(
  settings: SettingsBackup | undefined,
  checkResult: { valid: boolean; errors: string[] }
): Promise<void> {
  if (!settings) {
    // Settings are optional
    return
  }

  // Verify preferences structure
  if (settings.preferences) {
    const { preferences } = settings

    // Validate theme
    if (preferences.theme && !['light', 'dark', 'auto'].includes(preferences.theme)) {
      checkResult.errors.push(`Invalid theme value: ${preferences.theme}`)
      checkResult.valid = false
    }

    // Validate fontSize
    if (preferences.fontSize !== undefined) {
      const fontSize = Number(preferences.fontSize)
      if (isNaN(fontSize) || fontSize < 0.5 || fontSize > 2.0) {
        checkResult.errors.push(`Invalid fontSize value: ${preferences.fontSize}`)
        checkResult.valid = false
      }
    }
  }

  // Verify feature flags structure
  if (settings.featureFlags) {
    for (const [flag, config] of Object.entries(settings.featureFlags)) {
      if (typeof config.enabled !== 'boolean') {
        checkResult.errors.push(`Feature flag ${flag}: Invalid enabled value`)
        checkResult.valid = false
      }

      if (!config.timestamp) {
        checkResult.errors.push(`Feature flag ${flag}: Missing timestamp`)
        checkResult.valid = false
      }
    }
  }
}

/**
 * Verify analytics data integrity
 */
async function verifyAnalytics(
  analytics: AnalyticsBackup | undefined,
  checkResult: { valid: boolean; count: number; errors: string[] }
): Promise<void> {
  if (!analytics) {
    // Analytics are optional
    return
  }

  // Verify events array
  if (analytics.events) {
    checkResult.count = analytics.events.length

    for (let i = 0; i < analytics.events.length; i++) {
      const event = analytics.events[i]

      if (!event.id) {
        checkResult.errors.push(`Analytics event ${i}: Missing ID`)
        checkResult.valid = false
      }

      if (!event.type) {
        checkResult.errors.push(`Analytics event ${event.id || i}: Missing type`)
        checkResult.valid = false
      }

      if (!event.timestamp) {
        checkResult.errors.push(`Analytics event ${event.id || i}: Missing timestamp`)
        checkResult.valid = false
      }
    }
  }

  // Verify statistics structure
  if (analytics.statistics) {
    const { statistics } = analytics

    if (statistics.totalEvents < 0) {
      checkResult.errors.push(`Analytics statistics: Invalid totalEvents`)
      checkResult.valid = false
    }

    if (statistics.totalSessions < 0) {
      checkResult.errors.push(`Analytics statistics: Invalid totalSessions`)
      checkResult.valid = false
    }

    if (!statistics.lastUpdated) {
      checkResult.errors.push(`Analytics statistics: Missing lastUpdated timestamp`)
      checkResult.valid = false
    }
  }
}

/**
 * Verify personalization data integrity
 */
async function verifyPersonalization(
  personalization: PersonalizationBackup | undefined,
  checkResult: { valid: boolean; errors: string[] }
): Promise<void> {
  if (!personalization) {
    // Personalization is optional
    return
  }

  // Verify communication preferences
  if (personalization.communication) {
    const { communication } = personalization

    if (communication.responseLength &&
        !['brief', 'balanced', 'detailed'].includes(communication.responseLength)) {
      checkResult.errors.push(`Invalid responseLength value: ${communication.responseLength}`)
      checkResult.valid = false
    }

    if (communication.tone &&
        !['casual', 'neutral', 'formal'].includes(communication.tone)) {
      checkResult.errors.push(`Invalid tone value: ${communication.tone}`)
      checkResult.valid = false
    }
  }

  // Verify UI preferences
  if (personalization.ui) {
    const { ui } = personalization

    if (ui.theme && !['light', 'dark', 'auto'].includes(ui.theme)) {
      checkResult.errors.push(`Invalid theme value: ${ui.theme}`)
      checkResult.valid = false
    }

    if (ui.density &&
        !['compact', 'comfortable', 'spacious'].includes(ui.density)) {
      checkResult.errors.push(`Invalid density value: ${ui.density}`)
      checkResult.valid = false
    }
  }

  // Verify learning state
  if (personalization.learning) {
    const { learning } = personalization

    if (learning.totalActionsRecorded < 0) {
      checkResult.errors.push(`Invalid totalActionsRecorded value`)
      checkResult.valid = false
    }

    if (!learning.learningStartedAt) {
      checkResult.errors.push(`Missing learningStartedAt timestamp`)
      checkResult.valid = false
    }
  }

  // Verify preferences map
  if (personalization.preferences) {
    for (const [key, pref] of Object.entries(personalization.preferences)) {
      if (!pref.key) {
        checkResult.errors.push(`Preference ${key}: Missing key`)
        checkResult.valid = false
      }

      if (pref.confidence < 0 || pref.confidence > 1) {
        checkResult.errors.push(`Preference ${key}: Invalid confidence value`)
        checkResult.valid = false
      }

      if (!pref.lastUpdated) {
        checkResult.errors.push(`Preference ${key}: Missing lastUpdated timestamp`)
        checkResult.valid = false
      }
    }
  }
}

// ============================================================================
// BACKUP FILE VERIFICATION
// ============================================================================

/**
 * Verify backup file structure
 *
 * @param backupFile - Backup file to verify
 * @returns True if file structure is valid
 *
 * @example
 * ```typescript
 * const valid = await verifyBackupFile(uploadedFile)
 * if (valid) {
 *   console.log('Backup file is valid')
 * }
 * ```
 */
export async function verifyBackupFile(backupFile: BackupFile): Promise<boolean> {
  try {
    // Verify required fields
    if (!backupFile.version) {
      throw new ValidationError('Missing version')
    }

    if (!backupFile.timestamp) {
      throw new ValidationError('Missing timestamp')
    }

    if (!backupFile.checksum) {
      throw new ValidationError('Missing checksum')
    }

    if (!backupFile.data) {
      throw new ValidationError('Missing data')
    }

    // Verify version format
    if (!/^\d+\.\d+\.\d+$/.test(backupFile.version)) {
      throw new ValidationError(`Invalid version format: ${backupFile.version}`)
    }

    // Verify timestamp format
    if (isNaN(Date.parse(backupFile.timestamp))) {
      throw new ValidationError(`Invalid timestamp format: ${backupFile.timestamp}`)
    }

    // Verify checksum format
    if (!backupFile.checksum.startsWith('sha256:')) {
      throw new ValidationError(`Invalid checksum format: ${backupFile.checksum}`)
    }

    // Verify checksum matches data
    const checksumValid = await verifyChecksum(backupFile.data, backupFile.checksum)
    if (!checksumValid) {
      throw new ValidationError('Checksum does not match data')
    }

    return true
  } catch (error) {
    console.error('[Backup Verification] File verification failed:', error)
    return false
  }
}

/**
 * Quick validation check (checksum only)
 *
 * @param backup - Backup to validate
 * @returns True if checksum is valid
 *
 * @example
 * ```typescript
 * const valid = await quickValidate(backup)
 * if (valid) {
 *   console.log('Backup checksum is valid')
 * }
 * ```
 */
export async function quickValidate(backup: Backup): Promise<boolean> {
  try {
    return await verifyChecksum(backup.data, backup.checksum)
  } catch (error) {
    console.error('[Backup Verification] Quick validation failed:', error)
    return false
  }
}

// ============================================================================
// DATA CONSISTENCY CHECKS
// ============================================================================

/**
 * Check for data consistency issues
 *
 * @param backupData - Backup data to check
 * @returns Array of consistency warnings
 *
 * @example
 * ```typescript
 * const warnings = checkDataConsistency(backup.data)
 * if (warnings.length > 0) {
 *   console.warn('Consistency warnings:', warnings)
 * }
 * ```
 */
export function checkDataConsistency(backupData: BackupData): string[] {
  const warnings: string[] = []

  // Check conversation-message consistency
  if (backupData.conversations && backupData.conversations.length > 0) {
    for (const conv of backupData.conversations) {
      // Check message count matches metadata
      const actualMessageCount = conv.messages ? conv.messages.length : 0
      if (conv.metadata.messageCount !== actualMessageCount) {
        warnings.push(
          `Conversation ${conv.id}: Message count mismatch (metadata: ${conv.metadata.messageCount}, actual: ${actualMessageCount})`
        )
      }

      // Check for orphaned message references
      if (conv.messages) {
        for (const msg of conv.messages) {
          if (msg.replyTo) {
            const replyExists = conv.messages.some(m => m.id === msg.replyTo)
            if (!replyExists) {
              warnings.push(`Conversation ${conv.id}: Message ${msg.id} replies to non-existent message ${msg.replyTo}`)
            }
          }
        }
      }
    }
  }

  // Check knowledge-source consistency
  if (backupData.knowledge && backupData.knowledge.length > 0) {
    const conversationIds = new Set(backupData.conversations?.map(c => c.id) || [])
    const messageIds = new Set(
      backupData.conversations?.flatMap(c => c.messages?.map(m => m.id) || []) || []
    )

    for (const entry of backupData.knowledge) {
      if (entry.type === 'conversation' && entry.metadata.conversationId) {
        if (!conversationIds.has(entry.metadata.conversationId)) {
          warnings.push(`Knowledge entry ${entry.id}: References non-existent conversation ${entry.metadata.conversationId}`)
        }
      }

      if (entry.type === 'message' && entry.sourceId) {
        if (!messageIds.has(entry.sourceId)) {
          warnings.push(`Knowledge entry ${entry.id}: References non-existent message ${entry.sourceId}`)
        }
      }
    }
  }

  return warnings
}

/**
 * Check for duplicate data
 *
 * @param backupData - Backup data to check
 * @returns Array of duplicate warnings
 *
 * @example
 * ```typescript
 * const duplicates = findDuplicates(backup.data)
 * if (duplicates.length > 0) {
 *   console.warn('Duplicates found:', duplicates)
 * }
 * ```
 */
export function findDuplicates(backupData: BackupData): string[] {
  const duplicates: string[] = []

  // Check for duplicate conversation IDs
  if (backupData.conversations) {
    const ids = new Map<string, number>()
    for (const conv of backupData.conversations) {
      const count = ids.get(conv.id) || 0
      ids.set(conv.id, count + 1)
      if (count === 1) {
        duplicates.push(`Duplicate conversation ID: ${conv.id}`)
      }
    }
  }

  // Check for duplicate message IDs
  if (backupData.conversations) {
    const ids = new Map<string, number>()
    for (const conv of backupData.conversations) {
      for (const msg of conv.messages || []) {
        const count = ids.get(msg.id) || 0
        ids.set(msg.id, count + 1)
        if (count === 1) {
          duplicates.push(`Duplicate message ID: ${msg.id}`)
        }
      }
    }
  }

  // Check for duplicate knowledge entry IDs
  if (backupData.knowledge) {
    const ids = new Map<string, number>()
    for (const entry of backupData.knowledge) {
      const count = ids.get(entry.id) || 0
      ids.set(entry.id, count + 1)
      if (count === 1) {
        duplicates.push(`Duplicate knowledge entry ID: ${entry.id}`)
      }
    }
  }

  return duplicates
}
