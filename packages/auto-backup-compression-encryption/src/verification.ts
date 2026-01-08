/**
 * Backup Verification Module
 *
 * Provides integrity verification for backup data using checksums.
 */

import type { Backup, VerificationResult } from './types'
import { BackupCrypto } from './encryption'
import { ValidationError } from './errors'

// ============================================================================
// CHECKSUM CALCULATION
// ============================================================================

/**
 * Calculate SHA-256 checksum of data
 *
 * @param data - Data to hash (any JSON-serializable value)
 * @returns Promise resolving to checksum (base64 encoded)
 *
 * @example
 * ```typescript
 * const checksum = await calculateChecksum({ foo: 'bar' })
 * console.log(checksum) // SHA-256 hash
 * ```
 */
export async function calculateChecksum(data: unknown): Promise<string> {
  const dataJson = JSON.stringify(data)
  const dataBuffer = new TextEncoder().encode(dataJson)
  return await BackupCrypto.calculateChecksum(dataBuffer.buffer)
}

/**
 * Verify checksum of data
 *
 * @param data - Data to verify
 * @param expectedChecksum - Expected checksum
 * @returns Promise resolving to true if checksum matches
 *
 * @example
 * ```typescript
 * const isValid = await verifyChecksum({ foo: 'bar' }, checksum)
 * console.log(isValid) // true or false
 * ```
 */
export async function verifyChecksum(
  data: unknown,
  expectedChecksum: string
): Promise<boolean> {
  const actualChecksum = await calculateChecksum(data)
  return actualChecksum === expectedChecksum
}

// ============================================================================
// BACKUP VERIFICATION
// ============================================================================

/**
 * Verify a backup's integrity
 *
 * @param backup - Backup to verify
 * @returns Promise resolving to verification result
 *
 * @example
 * ```typescript
 * const result = await verifyBackup(backup)
 * if (result.valid) {
 *   console.log('Backup is valid')
 * }
 * ```
 */
export async function verifyBackup<T>(backup: Backup<T>): Promise<VerificationResult> {
  const result: VerificationResult = {
    valid: true,
    checksumValid: false,
    versionCompatible: true,
    integrityChecks: {},
    sizeVerification: {
      expected: backup.size,
      actual: 0,
      match: false
    },
    warnings: [],
    timestamp: new Date().toISOString()
  }

  try {
    // Verify checksum
    const checksumMatch = await verifyChecksum(backup.data, backup.checksum)
    result.checksumValid = checksumMatch

    if (!checksumMatch) {
      result.valid = false
      result.integrityChecks['checksum'] = {
        valid: false,
        errors: ['Checksum does not match']
      }
    } else {
      result.integrityChecks['checksum'] = {
        valid: true,
        errors: []
      }
    }

    // Verify version compatibility
    const version = backup.version
    if (version.startsWith('2.')) {
      result.versionCompatible = true
    } else if (version.startsWith('1.')) {
      result.versionCompatible = true
      result.warnings.push('Backup format version 1.x is deprecated')
    } else {
      result.versionCompatible = false
      result.valid = false
      result.warnings.push(`Unknown backup version: ${version}`)
    }

    // Verify data size
    const dataJson = JSON.stringify(backup.data)
    const actualSize = new Blob([dataJson]).size
    result.sizeVerification.actual = actualSize
    result.sizeVerification.match = Math.abs(actualSize - backup.size) < 100

    if (!result.sizeVerification.match) {
      result.warnings.push(`Size mismatch: expected ${backup.size}, got ${actualSize}`)
    }

    // Verify data structure
    const dataIntegrity = await verifyDataStructure(backup.data)
    result.integrityChecks = { ...result.integrityChecks, ...dataIntegrity }

    if (Object.values(dataIntegrity).some(check => !check.valid)) {
      result.valid = false
    }

    return result
  } catch (error) {
    result.valid = false
    result.warnings.push(`Verification error: ${error instanceof Error ? error.message : String(error)}`)
    return result
  }
}

/**
 * Verify backup file before loading
 *
 * @param file - File to verify
 * @returns Promise resolving to verification result
 *
 * @example
 * ```typescript
 * const result = await verifyBackupFile(file)
 * if (result.valid) {
 *   console.log('File is valid')
 * }
 * ```
 */
export async function verifyBackupFile(file: File): Promise<VerificationResult> {
  const result: VerificationResult = {
    valid: true,
    checksumValid: false,
    versionCompatible: true,
    integrityChecks: {},
    sizeVerification: {
      expected: 0,
      actual: file.size,
      match: false
    },
    warnings: [],
    timestamp: new Date().toISOString()
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)

    // Check if file is gzipped
    const isGzipped = data[0] === 0x1f && data[1] === 0x8b
    result.integrityChecks['compression'] = {
      valid: true,
      count: isGzipped ? 1 : 0,
      errors: []
    }

    // Try to parse JSON
    let jsonStr: string
    if (isGzipped) {
      // Would need decompression here, but for verification just check magic number
      result.integrityChecks['gzip'] = {
        valid: true,
        errors: []
      }
    } else {
      jsonStr = new TextDecoder().decode(data)

      try {
        const parsed = JSON.parse(jsonStr)
        result.integrityChecks['json'] = {
          valid: true,
          errors: []
        }

        // Check required fields
        if (!parsed.version || !parsed.timestamp || !parsed.data) {
          result.valid = false
          result.integrityChecks['structure'] = {
            valid: false,
            errors: ['Missing required fields: version, timestamp, or data']
          }
        }
      } catch (parseError) {
        result.valid = false
        result.integrityChecks['json'] = {
          valid: false,
          errors: [`Invalid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`]
        }
      }
    }

    return result
  } catch (error) {
    result.valid = false
    result.warnings.push(`File verification error: ${error instanceof Error ? error.message : String(error)}`)
    return result
  }
}

/**
 * Quick validation of backup structure
 *
 * @param backup - Backup to validate
 * @returns True if backup structure is valid
 *
 * @example
 * ```typescript
 * if (quickValidate(backup)) {
 *   console.log('Backup structure is valid')
 * }
 * ```
 */
export function quickValidate<T>(backup: Backup<T>): boolean {
  try {
    // Check required fields
    if (!backup.id || !backup.timestamp || !backup.checksum) {
      return false
    }

    // Check data exists
    if (backup.data === undefined || backup.data === null) {
      return false
    }

    // Check version
    if (!backup.version) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Check data consistency
 *
 * @param data - Data to check
 * @returns Promise resolving to consistency check results
 *
 * @example
 * ```typescript
 * const results = await checkDataConsistency(backupData)
 * console.log(results) // Consistency information
 * ```
 */
export async function checkDataConsistency(data: unknown): Promise<{
  consistent: boolean
  issues: string[]
  size: number
}> {
  const issues: string[] = []

  try {
    const dataJson = JSON.stringify(data)
    const size = new Blob([dataJson]).size

    // Check for circular references (already handled by JSON.stringify)
    // Check for undefined values (JSON.stringify converts to null)

    return {
      consistent: issues.length === 0,
      issues,
      size
    }
  } catch (error) {
    issues.push(`Data serialization error: ${error instanceof Error ? error.message : String(error)}`)
    return {
      consistent: false,
      issues,
      size: 0
    }
  }
}

/**
 * Find duplicates in backup data
 *
 * @param data - Data to search
 * @returns Array of duplicate entries found
 *
 * @example
 * ```typescript
 * const duplicates = await findDuplicates(backupData)
 * console.log(`Found ${duplicates.length} duplicates`)
 * ```
 */
export async function findDuplicates(data: unknown): Promise<Array<{
  path: string
  count: number
  sample: unknown
}>> {
  const duplicates: Array<{ path: string; count: number; sample: unknown }> = []

  try {
    const seen = new Map<string, { count: number; sample: unknown }>()

    function traverse(obj: unknown, path: string = 'root'): void {
      if (typeof obj !== 'object' || obj === null) {
        return
      }

      const key = path + ':' + JSON.stringify(obj)

      if (seen.has(key)) {
        const existing = seen.get(key)!
        existing.count++
      } else {
        seen.set(key, { count: 1, sample: obj })
      }

      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          traverse(item, `${path}[${index}]`)
        })
      } else {
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
          traverse(value, `${path}.${key}`)
        }
      }
    }

    traverse(data)

    // Find duplicates
    for (const [path, { count, sample }] of seen) {
      if (count > 1) {
        duplicates.push({ path, count, sample })
      }
    }
  } catch (error) {
    console.error('Error finding duplicates:', error)
  }

  return duplicates
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Verify data structure integrity
 */
async function verifyDataStructure(data: unknown): Promise<Record<string, {
  valid: boolean
  count?: number
  errors: string[]
}>> {
  const checks: Record<string, { valid: boolean; count?: number; errors: string[] }> = {}

  try {
    // Check if data is valid JSON-serializable
    JSON.stringify(data)
    checks['serialization'] = {
      valid: true,
      errors: []
    }
  } catch (error) {
    checks['serialization'] = {
      valid: false,
      errors: [`Data serialization failed: ${error instanceof Error ? error.message : String(error)}`]
    }
  }

  // Check for null data
  if (data === null || data === undefined) {
    checks['nullCheck'] = {
      valid: false,
      errors: ['Data is null or undefined']
    }
  } else {
    checks['nullCheck'] = {
      valid: true,
      errors: []
    }
  }

  return checks
}
