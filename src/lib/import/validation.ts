/**
 * Import Validation System
 *
 * Validates imported data for correctness, security, and integrity.
 */

import {
  ValidationResult,
  SchemaValidation,
  TypeValidation,
  ConstraintValidation,
  SecurityValidation,
} from './types'

// ============================================================================
// IMPORT VALIDATOR
// ============================================================================

export class ImportValidator {
  /**
   * Validate imported data
   */
  async validate(data: any): Promise<ValidationResult> {
    const schema = this.validateSchema(data)
    const types = this.validateTypes(data)
    const constraints = this.validateConstraints(data)
    const security = this.validateSecurity(data)

    const valid = schema.valid && types.valid && constraints.valid && security.valid

    return {
      valid,
      schema,
      types,
      constraints,
      security,
    }
  }

  /**
   * Validate data structure/schema
   */
  private validateSchema(data: any): SchemaValidation {
    const errors: any[] = []
    const missing: string[] = []

    // Check if it's an array
    if (!Array.isArray(data)) {
      errors.push({
        path: 'root',
        expected: 'array',
        actual: typeof data,
        message: 'Root element must be an array',
      })
      return { valid: false, errors, missing }
    }

    // Check each item
    for (let i = 0; i < data.length; i++) {
      const item = data[i]

      // Required fields
      const requiredFields = ['id', 'title', 'type', 'createdAt', 'updatedAt']
      for (const field of requiredFields) {
        if (!(field in item)) {
          missing.push(`[${i}].${field}`)
        }
      }

      // Type checks
      if (item.id && typeof item.id !== 'string') {
        errors.push({
          path: `[${i}].id`,
          expected: 'string',
          actual: typeof item.id,
          message: 'ID must be a string',
        })
      }

      if (item.title && typeof item.title !== 'string') {
        errors.push({
          path: `[${i}].title`,
          expected: 'string',
          actual: typeof item.title,
          message: 'Title must be a string',
        })
      }

      if (item.messages && !Array.isArray(item.messages)) {
        errors.push({
          path: `[${i}].messages`,
          expected: 'array',
          actual: typeof item.messages,
          message: 'Messages must be an array',
        })
      }
    }

    return {
      valid: errors.length === 0 && missing.length === 0,
      errors,
      missing,
    }
  }

  /**
   * Validate data types
   */
  private validateTypes(data: any): TypeValidation {
    const errors: any[] = []

    if (!Array.isArray(data)) {
      return { valid: false, errors: [] }
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i]

      // Validate conversation type
      if (item.type && !['personal', 'ai-assisted', 'transcript', 'reference'].includes(item.type)) {
        errors.push({
          path: `[${i}].type`,
          expected: 'personal | ai-assisted | transcript | reference',
          actual: item.type,
          value: item.type,
        })
      }

      // Validate date strings
      if (item.createdAt && !this.isValidDate(item.createdAt)) {
        errors.push({
          path: `[${i}].createdAt`,
          expected: 'ISO date string',
          actual: typeof item.createdAt,
          value: item.createdAt,
        })
      }

      // Validate messages
      if (item.messages && Array.isArray(item.messages)) {
        for (let j = 0; j < item.messages.length; j++) {
          const msg = item.messages[j]

          if (msg.type && !['text', 'image', 'file', 'audio', 'transcript', 'system'].includes(msg.type)) {
            errors.push({
              path: `[${i}].messages[${j}].type`,
              expected: 'text | image | file | audio | transcript | system',
              actual: msg.type,
              value: msg.type,
            })
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate constraints
   */
  private validateConstraints(data: any): ConstraintValidation {
    const violations: any[] = []

    if (!Array.isArray(data)) {
      return { valid: false, violations: [] }
    }

    // Check for duplicate IDs
    const ids = new Set<string>()
    for (let i = 0; i < data.length; i++) {
      const item = data[i]

      if (item.id) {
        if (ids.has(item.id)) {
          violations.push({
            type: 'unique',
            path: `[${i}].id`,
            description: `Duplicate ID: ${item.id}`,
          })
        }
        ids.add(item.id)
      }
    }

    // Check title length
    for (let i = 0; i < data.length; i++) {
      const item = data[i]

      if (item.title && item.title.length > 500) {
        violations.push({
          type: 'length',
          path: `[${i}].title`,
          description: 'Title exceeds maximum length of 500 characters',
        })
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    }
  }

  /**
   * Validate security
   */
  private validateSecurity(data: any): SecurityValidation {
    const issues: any[] = []

    if (!Array.isArray(data)) {
      return { valid: true, issues: [] }
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i]

      // Check for oversized data
      const size = JSON.stringify(item).length
      if (size > 10 * 1024 * 1024) { // 10MB
        issues.push({
          type: 'oversized-data',
          severity: 'medium',
          description: `Item [${i}] is very large (${(size / 1024 / 1024).toFixed(2)}MB)`,
          itemIds: [item.id],
        })
      }

      // Check for suspicious patterns (XSS attempts, etc.)
      const suspicious = this.checkSuspiciousPatterns(item)
      if (suspicious) {
        issues.push({
          type: 'suspicious-pattern',
          severity: 'high',
          description: `Suspicious content detected in item [${i}]`,
          itemIds: [item.id],
        })
      }
    }

    return {
      valid: issues.filter(i => i.severity === 'high').length === 0,
      issues,
    }
  }

  /**
   * Check for suspicious patterns in data
   */
  private checkSuspiciousPatterns(item: any): boolean {
    const text = JSON.stringify(item)

    // Check for script tags
    if (/<script\b/i.test(text)) {
      return true
    }

    // Check for javascript: protocol
    if (/javascript:/i.test(text)) {
      return true
    }

    // Check for excessive nesting (potential DoS)
    const depth = this.getMaxDepth(item)
    if (depth > 100) {
      return true
    }

    return false
  }

  /**
   * Get maximum nesting depth of object
   */
  private getMaxDepth(obj: any, currentDepth = 0): number {
    if (typeof obj !== 'object' || obj === null) {
      return currentDepth
    }

    let maxDepth = currentDepth
    for (const value of Object.values(obj)) {
      const depth = this.getMaxDepth(value, currentDepth + 1)
      if (depth > maxDepth) {
        maxDepth = depth
      }
    }

    return maxDepth
  }

  /**
   * Check if string is valid ISO date
   */
  private isValidDate(dateString: string): boolean {
    return !isNaN(Date.parse(dateString))
  }
}
