/**
 * Backup Integrity Checking System
 *
 * Comprehensive validation of backup data structure, corruption detection,
 * and integrity reporting. Ensures backups are safe to restore.
 */

import {
  Backup,
  BackupData,
  VerificationResult
} from './types'
import { checkDataConsistency, findDuplicates } from './verification'
import { ValidationError } from '@/lib/errors'

// ============================================================================
// INTEGRITY CHECK RESULT
// ============================================================================

/**
 * Detailed integrity check result
 */
export interface IntegrityCheckResult {
  /** Overall integrity status */
  status: 'healthy' | 'warning' | 'critical' | 'corrupted'

  /** Integrity score (0-100) */
  score: number

  /** Detailed category results */
  categories: {
    conversations: CategoryIntegrityResult
    knowledge: CategoryIntegrityResult
    settings: CategoryIntegrityResult
    analytics: CategoryIntegrityResult
    personalization: CategoryIntegrityResult
  }

  /** Consistency issues found */
  consistencyIssues: string[]

  /** Duplicate items found */
  duplicates: string[]

  /** Corruption indicators */
  corruptionIndicators: CorruptionIndicator[]

  /** Recommendations */
  recommendations: string[]

  /** Check timestamp */
  timestamp: string

  /** Check duration in milliseconds */
  duration: number
}

/**
 * Category-specific integrity result
 */
export interface CategoryIntegrityResult {
  /** Category name */
  category: string

  /** Status */
  status: 'healthy' | 'warning' | 'critical' | 'missing'

  /** Item count */
  itemCount: number

  /** Valid item count */
  validCount: number

  /** Corrupted item count */
  corruptedCount: number

  /** Errors found */
  errors: IntegrityError[]

  /** Warnings found */
  warnings: string[]

  /** Integrity score for this category (0-100) */
  score: number
}

/**
 * Integrity error
 */
export interface IntegrityError {
  /** Error type */
  type: 'missing-field' | 'invalid-type' | 'invalid-value' | 'corruption'

  /** Item identifier */
  itemId?: string

  /** Field that has the error */
  field?: string

  /** Error message */
  message: string

  /** Severity */
  severity: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Corruption indicator
 */
export interface CorruptionIndicator {
  /** Type of corruption */
  type: 'checksum-mismatch' | 'size-mismatch' | 'invalid-json' | 'data-loss' | 'circular-reference'

  /** Category where corruption was detected */
  category: string

  /** Description */
  description: string

  /** Severity */
  severity: 'medium' | 'high' | 'critical'

  /** Affected item IDs */
  affectedItems?: string[]
}

/**
 * Integrity report (summary for display)
 */
export interface IntegrityReport {
  /** Overall status */
  status: 'healthy' | 'warning' | 'critical' | 'corrupted'

  /** Integrity score */
  score: number

  /** Total items checked */
  totalItems: number

  /** Valid items */
  validItems: number

  /** Corrupted items */
  corruptedItems: number

  /** Missing items */
  missingItems: number

  /** Error count by severity */
  errorsBySeverity: {
    low: number
    medium: number
    high: number
    critical: number
  }

  /** Top issues */
  topIssues: string[]

  /** Recommendations */
  recommendations: string[]

  /** Can this backup be safely restored */
  canRestore: boolean

  /** Detailed check result */
  details?: IntegrityCheckResult
}

// ============================================================================
// INTEGRITY CHECKER CLASS
// ============================================================================

/**
 * BackupIntegrityChecker performs comprehensive integrity checks on backups.
 *
 * Features:
 * - Structural validation
 * - Corruption detection
 * - Consistency checking
 * - Duplicate detection
 * - Integrity scoring
 * - Actionable recommendations
 *
 * @example
 * ```typescript
 * const checker = new BackupIntegrityChecker()
 * const report = await checker.generateIntegrityReport(backup)
 * if (report.canRestore) {
 *   console.log('Backup is safe to restore')
 * } else {
 *   console.error('Backup has critical issues:', report.topIssues)
 * }
 * ```
 */
export class BackupIntegrityChecker {
  /**
   * Perform comprehensive integrity check
   *
   * @param backup - Backup to check
   * @returns Detailed integrity check result
   */
  async checkIntegrity(backup: Backup): Promise<IntegrityCheckResult> {
    const startTime = Date.now()

    const result: IntegrityCheckResult = {
      status: 'healthy',
      score: 100,
      categories: {
        conversations: {
          category: 'conversations',
          status: 'healthy',
          itemCount: 0,
          validCount: 0,
          corruptedCount: 0,
          errors: [],
          warnings: [],
          score: 100
        },
        knowledge: {
          category: 'knowledge',
          status: 'healthy',
          itemCount: 0,
          validCount: 0,
          corruptedCount: 0,
          errors: [],
          warnings: [],
          score: 100
        },
        settings: {
          category: 'settings',
          status: 'healthy',
          itemCount: 0,
          validCount: 0,
          corruptedCount: 0,
          errors: [],
          warnings: [],
          score: 100
        },
        analytics: {
          category: 'analytics',
          status: 'healthy',
          itemCount: 0,
          validCount: 0,
          corruptedCount: 0,
          errors: [],
          warnings: [],
          score: 100
        },
        personalization: {
          category: 'personalization',
          status: 'healthy',
          itemCount: 0,
          validCount: 0,
          corruptedCount: 0,
          errors: [],
          warnings: [],
          score: 100
        }
      },
      consistencyIssues: [],
      duplicates: [],
      corruptionIndicators: [],
      recommendations: [],
      timestamp: new Date().toISOString(),
      duration: 0
    }

    try {
      // Check each category
      if (backup.data) {
        await this.checkConversations(backup.data.conversations || [], result.categories.conversations)
        await this.checkKnowledge(backup.data.knowledge || [], result.categories.knowledge)
        await this.checkSettings(backup.data.settings, result.categories.settings)
        await this.checkAnalytics(backup.data.analytics, result.categories.analytics)
        await this.checkPersonalization(backup.data.personalization, result.categories.personalization)

        // Check consistency and duplicates
        result.consistencyIssues = checkDataConsistency(backup.data)
        result.duplicates = findDuplicates(backup.data)

        // Detect corruption
        result.corruptionIndicators = await this.detectCorruption(backup)
      }

      // Calculate overall score and status
      this.calculateOverallScore(result)

      // Generate recommendations
      result.recommendations = this.generateRecommendations(result)

      result.duration = Date.now() - startTime

      console.log(`[Integrity Checker] Integrity check completed: ${result.status} (${result.score}/100)`)
      return result
    } catch (error) {
      result.status = 'corrupted'
      result.score = 0
      result.corruptionIndicators.push({
        type: 'invalid-json',
        category: 'general',
        description: `Integrity check failed: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'critical'
      })
      result.duration = Date.now() - startTime
      return result
    }
  }

  /**
   * Generate user-friendly integrity report
   *
   * @param backup - Backup to generate report for
   * @returns Integrity report
   */
  async generateIntegrityReport(backup: Backup): Promise<IntegrityReport> {
    const checkResult = await this.checkIntegrity(backup)

    // Calculate totals
    const totalItems = Object.values(checkResult.categories).reduce(
      (sum, cat) => sum + cat.itemCount,
      0
    )

    const validItems = Object.values(checkResult.categories).reduce(
      (sum, cat) => sum + cat.validCount,
      0
    )

    const corruptedItems = Object.values(checkResult.categories).reduce(
      (sum, cat) => sum + cat.corruptedCount,
      0
    )

    const missingItems = totalItems - validItems - corruptedItems

    // Count errors by severity
    const errorsBySeverity = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    }

    for (const category of Object.values(checkResult.categories)) {
      for (const error of category.errors) {
        errorsBySeverity[error.severity]++
      }
    }

    for (const corruption of checkResult.corruptionIndicators) {
      errorsBySeverity[corruption.severity]++
    }

    // Determine top issues
    const topIssues = [
      ...checkResult.corruptionIndicators.slice(0, 3).map(c => c.description),
      ...checkResult.consistencyIssues.slice(0, 2)
    ]

    // Determine if backup can be safely restored
    const canRestore = checkResult.status !== 'corrupted' &&
      checkResult.status !== 'critical' &&
      errorsBySeverity.critical === 0

    return {
      status: checkResult.status,
      score: checkResult.score,
      totalItems,
      validItems,
      corruptedItems,
      missingItems,
      errorsBySeverity,
      topIssues: topIssues.slice(0, 5),
      recommendations: checkResult.recommendations,
      canRestore,
      details: checkResult
    }
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Check conversations integrity
   */
  private async checkConversations(
    conversations: any[],
    result: CategoryIntegrityResult
  ): Promise<void> {
    result.itemCount = conversations.length

    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i]
      let isValid = true

      // Check required fields
      if (!conv.id) {
        result.errors.push({
          type: 'missing-field',
          itemId: `conversation_${i}`,
          field: 'id',
          message: `Conversation at index ${i} is missing ID`,
          severity: 'high'
        })
        isValid = false
      }

      if (!conv.title) {
        result.errors.push({
          type: 'missing-field',
          itemId: conv.id || `conversation_${i}`,
          field: 'title',
          message: `Conversation ${conv.id || i} is missing title`,
          severity: 'medium'
        })
        isValid = false
      }

      if (!conv.createdAt) {
        result.errors.push({
          type: 'missing-field',
          itemId: conv.id || `conversation_${i}`,
          field: 'createdAt',
          message: `Conversation ${conv.id || i} is missing createdAt timestamp`,
          severity: 'high'
        })
        isValid = false
      }

      // Validate timestamps
      if (conv.createdAt && isNaN(Date.parse(conv.createdAt))) {
        result.errors.push({
          type: 'invalid-value',
          itemId: conv.id,
          field: 'createdAt',
          message: `Conversation ${conv.id} has invalid createdAt timestamp`,
          severity: 'medium'
        })
        isValid = false
      }

      // Check messages array
      if (!Array.isArray(conv.messages)) {
        result.errors.push({
          type: 'invalid-type',
          itemId: conv.id,
          field: 'messages',
          message: `Conversation ${conv.id} has invalid messages type (expected array)`,
          severity: 'high'
        })
        isValid = false
      } else {
        // Check individual messages
        for (let j = 0; j < conv.messages.length; j++) {
          const msg = conv.messages[j]

          if (!msg.id) {
            result.errors.push({
              type: 'missing-field',
              itemId: msg.conversationId || conv.id,
              field: 'message.id',
              message: `Message at index ${j} in conversation ${conv.id} is missing ID`,
              severity: 'medium'
            })
            isValid = false
          }

          if (!msg.timestamp) {
            result.errors.push({
              type: 'missing-field',
              itemId: msg.id || `${conv.id}_msg_${j}`,
              field: 'timestamp',
              message: `Message ${msg.id || j} in conversation ${conv.id} is missing timestamp`,
              severity: 'medium'
            })
            isValid = false
          }

          if (!msg.content) {
            result.errors.push({
              type: 'missing-field',
              itemId: msg.id,
              field: 'content',
              message: `Message ${msg.id} is missing content`,
              severity: 'low'
            })
          }
        }
      }

      if (isValid) {
        result.validCount++
      } else {
        result.corruptedCount++
      }
    }

    // Calculate category score
    if (result.itemCount === 0) {
      result.status = 'missing'
      result.score = 100 // Missing data is not an error
    } else {
      const corruptionRatio = result.corruptedCount / result.itemCount
      if (corruptionRatio === 0) {
        result.status = 'healthy'
        result.score = 100
      } else if (corruptionRatio < 0.1) {
        result.status = 'warning'
        result.score = 90
      } else if (corruptionRatio < 0.3) {
        result.status = 'critical'
        result.score = 70
      } else {
        result.status = 'critical'
        result.score = Math.max(0, 100 - (corruptionRatio * 100))
      }
    }
  }

  /**
   * Check knowledge integrity
   */
  private async checkKnowledge(
    knowledge: any[],
    result: CategoryIntegrityResult
  ): Promise<void> {
    result.itemCount = knowledge.length

    for (let i = 0; i < knowledge.length; i++) {
      const entry = knowledge[i]
      let isValid = true

      if (!entry.id) {
        result.errors.push({
          type: 'missing-field',
          itemId: `knowledge_${i}`,
          field: 'id',
          message: `Knowledge entry at index ${i} is missing ID`,
          severity: 'high'
        })
        isValid = false
      }

      if (!entry.type) {
        result.errors.push({
          type: 'missing-field',
          itemId: entry.id || `knowledge_${i}`,
          field: 'type',
          message: `Knowledge entry ${entry.id || i} is missing type`,
          severity: 'medium'
        })
        isValid = false
      }

      if (!entry.content) {
        result.errors.push({
          type: 'missing-field',
          itemId: entry.id,
          field: 'content',
          message: `Knowledge entry ${entry.id} is missing content`,
          severity: 'high'
        })
        isValid = false
      }

      if (entry.embedding && !Array.isArray(entry.embedding)) {
        result.errors.push({
          type: 'invalid-type',
          itemId: entry.id,
          field: 'embedding',
          message: `Knowledge entry ${entry.id} has invalid embedding type`,
          severity: 'medium'
        })
        isValid = false
      }

      if (isValid) {
        result.validCount++
      } else {
        result.corruptedCount++
      }
    }

    // Calculate category score
    if (result.itemCount === 0) {
      result.status = 'missing'
      result.score = 100
    } else {
      const corruptionRatio = result.corruptedCount / result.itemCount
      if (corruptionRatio === 0) {
        result.status = 'healthy'
        result.score = 100
      } else if (corruptionRatio < 0.1) {
        result.status = 'warning'
        result.score = 90
      } else if (corruptionRatio < 0.3) {
        result.status = 'critical'
        result.score = 70
      } else {
        result.status = 'critical'
        result.score = Math.max(0, 100 - (corruptionRatio * 100))
      }
    }
  }

  /**
   * Check settings integrity
   */
  private async checkSettings(
    settings: any,
    result: CategoryIntegrityResult
  ): Promise<void> {
    if (!settings) {
      result.status = 'missing'
      result.score = 100
      return
    }

    result.itemCount = Object.keys(settings).length
    let validCount = 0

    for (const [key, value] of Object.entries(settings)) {
      try {
        // Check if value is valid JSON
        JSON.stringify(value)
        validCount++
      } catch (error) {
        result.errors.push({
          type: 'invalid-value',
          field: key,
          message: `Setting ${key} has invalid value that cannot be serialized`,
          severity: 'medium'
        })
      }
    }

    result.validCount = validCount
    result.corruptedCount = result.itemCount - validCount

    // Settings are less critical, so score is higher
    if (result.corruptedCount === 0) {
      result.status = 'healthy'
      result.score = 100
    } else if (result.corruptedCount < 3) {
      result.status = 'warning'
      result.score = 95
    } else {
      result.status = 'critical'
      result.score = 80
    }
  }

  /**
   * Check analytics integrity
   */
  private async checkAnalytics(
    analytics: any,
    result: CategoryIntegrityResult
  ): Promise<void> {
    if (!analytics) {
      result.status = 'missing'
      result.score = 100
      return
    }

    if (analytics.events) {
      result.itemCount = analytics.events.length

      for (let i = 0; i < analytics.events.length; i++) {
        const event = analytics.events[i]

        if (!event.id || !event.type || !event.timestamp) {
          result.errors.push({
            type: 'missing-field',
            itemId: event.id || `event_${i}`,
            message: `Analytics event at index ${i} is missing required fields`,
            severity: 'low'
          })
          result.corruptedCount++
        } else {
          result.validCount++
        }
      }
    }

    if (result.itemCount === 0) {
      result.status = 'missing'
      result.score = 100
    } else if (result.corruptedCount === 0) {
      result.status = 'healthy'
      result.score = 100
    } else {
      result.status = 'warning'
      result.score = 95 // Analytics are least critical
    }
  }

  /**
   * Check personalization integrity
   */
  private async checkPersonalization(
    personalization: any,
    result: CategoryIntegrityResult
  ): Promise<void> {
    if (!personalization) {
      result.status = 'missing'
      result.score = 100
      return
    }

    result.itemCount = Object.keys(personalization).length
    result.validCount = result.itemCount

    // Basic structure check
    if (personalization.preferences) {
      for (const [key, pref] of Object.entries(personalization.preferences)) {
        const prefObj = pref as Record<string, unknown>
        if (typeof pref !== 'object' || !prefObj.key || prefObj.confidence === undefined) {
          result.errors.push({
            type: 'invalid-value',
            field: `preferences.${key}`,
            message: `Preference ${key} has invalid structure`,
            severity: 'low'
          })
          result.corruptedCount++
          result.validCount--
        }
      }
    }

    if (result.corruptedCount === 0) {
      result.status = 'healthy'
      result.score = 100
    } else {
      result.status = 'warning'
      result.score = 95
    }
  }

  /**
   * Detect corruption indicators
   */
  private async detectCorruption(backup: Backup): Promise<CorruptionIndicator[]> {
    const indicators: CorruptionIndicator[] = []

    // Check for size mismatch
    const actualSize = new Blob([JSON.stringify(backup.data)]).size
    if (Math.abs(actualSize - backup.size) > 1000) {
      indicators.push({
        type: 'size-mismatch',
        category: 'general',
        description: `Backup size mismatch: expected ${backup.size}, got ${actualSize}`,
        severity: 'medium',
        affectedItems: []
      })
    }

    // Check for circular references
    try {
      JSON.stringify(backup.data)
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('circular')) {
        indicators.push({
          type: 'circular-reference',
          category: 'general',
          description: 'Circular reference detected in backup data',
          severity: 'critical',
          affectedItems: []
        })
      }
    }

    return indicators
  }

  /**
   * Calculate overall integrity score
   */
  private calculateOverallScore(result: IntegrityCheckResult): void {
    const categories = Object.values(result.categories)
    const avgScore = categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length

    // Penalize consistency issues and duplicates
    const penalty = (result.consistencyIssues.length * 2) + (result.duplicates.length * 1)

    // Penalize corruption indicators
    const corruptionPenalty = result.corruptionIndicators.reduce((sum, ind) => {
      const severityPenalty = {
        medium: 5,
        high: 15,
        critical: 30
      }
      return sum + severityPenalty[ind.severity]
    }, 0)

    result.score = Math.max(0, Math.min(100, avgScore - penalty - corruptionPenalty))

    // Determine status
    if (result.corruptionIndicators.some(ind => ind.severity === 'critical')) {
      result.status = 'corrupted'
    } else if (result.score >= 90) {
      result.status = 'healthy'
    } else if (result.score >= 70) {
      result.status = 'warning'
    } else {
      result.status = 'critical'
    }
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(result: IntegrityCheckResult): string[] {
    const recommendations: string[] = []

    if (result.corruptionIndicators.length > 0) {
      recommendations.push('Backup shows signs of corruption. Consider using a different backup if available.')
    }

    if (result.duplicates.length > 0) {
      recommendations.push(`Found ${result.duplicates.length} duplicate items. These may be merged during restore.`)
    }

    if (result.consistencyIssues.length > 0) {
      recommendations.push(`Found ${result.consistencyIssues.length} consistency issues. Review before restoring.`)
    }

    const highSeverityErrors = Object.values(result.categories).flatMap(cat =>
      cat.errors.filter(e => e.severity === 'high' || e.severity === 'critical')
    )

    if (highSeverityErrors.length > 0) {
      recommendations.push(`${highSeverityErrors.length} high-severity errors found. Carefully review before restoring.`)
    }

    if (result.score >= 90 && result.status === 'healthy') {
      recommendations.push('Backup integrity is good. Safe to restore.')
    } else if (result.score >= 70) {
      recommendations.push('Backup has minor issues. Review before restoring.')
    } else {
      recommendations.push('Backup has significant issues. Use with caution or find an alternative backup.')
    }

    return recommendations
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Check backup integrity (convenience function)
 */
export async function checkBackupIntegrity(backup: Backup): Promise<IntegrityCheckResult> {
  const checker = new BackupIntegrityChecker()
  return await checker.checkIntegrity(backup)
}

/**
 * Generate integrity report (convenience function)
 */
export async function generateIntegrityReport(backup: Backup): Promise<IntegrityReport> {
  const checker = new BackupIntegrityChecker()
  return await checker.generateIntegrityReport(backup)
}
