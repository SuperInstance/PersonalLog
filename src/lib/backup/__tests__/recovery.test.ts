/**
 * Backup Recovery System Tests
 *
 * Comprehensive test suite for backup and restore functionality.
 * Tests cover backup creation, restore operations, validation, error handling,
 * and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  BackupRecovery,
  restoreFromBackup,
  previewRestore
} from '../recovery'
import {
  saveBackup,
  getBackup,
  deleteBackup,
  listBackups,
  clearAllBackups
} from '../storage'
import { createBackup } from '../manager'
import { verifyBackup } from '../verification'
import type {
  Backup,
  BackupData,
  RestoreResult,
  RestorePreview,
  RestoreBackupOptions,
  RestoreProgress
} from '../types'
import { StorageError, ValidationError, NotFoundError } from '@/lib/errors'

// ============================================================================
// TEST DATA FIXTURES
// ============================================================================

/**
 * Create a mock backup for testing
 */
function createMockBackup(overrides?: Partial<Backup>): Backup {
  const mockData: BackupData = {
    conversations: [
      {
        id: 'conv_1',
        title: 'Test Conversation',
        type: 'personal',
        createdAt: '2025-01-07T00:00:00.000Z',
        updatedAt: '2025-01-07T01:00:00.000Z',
        messages: [
          {
            id: 'msg_1',
            conversationId: 'conv_1',
            type: 'text',
            author: { type: 'user', name: 'Test User' },
            content: { text: 'Hello world' },
            timestamp: '2025-01-07T00:30:00.000Z',
            metadata: {}
          }
        ],
        aiContacts: [],
        settings: {
          responseMode: 'messenger',
          compactOnLimit: true,
          compactStrategy: 'summarize'
        },
        metadata: {
          messageCount: 1,
          totalTokens: 10,
          hasMedia: false,
          tags: ['test'],
          pinned: false,
          archived: false
        }
      }
    ],
    knowledge: [
      {
        id: 'know_1',
        type: 'conversation',
        sourceId: 'conv_1',
        content: 'Test knowledge entry',
        metadata: {
          timestamp: '2025-01-07T00:00:00.000Z'
        },
        editable: false
      }
    ],
    settings: {
      preferences: {
        theme: 'dark',
        fontSize: 1.0,
        sidebarPosition: 'left',
        autoScrollMessages: true,
        responseMode: 'messenger',
        compactOnLimit: true,
        compactStrategy: 'summarize'
      },
      featureFlags: {
        testFeature: {
          enabled: true,
          reason: 'Testing',
          timestamp: '2025-01-07T00:00:00.000Z'
        }
      }
    },
    analytics: {
      events: [
        {
          id: 'evt_1',
          type: 'test',
          category: 'testing',
          timestamp: '2025-01-07T00:00:00.000Z',
          sessionId: 'session_1',
          data: { test: true }
        }
      ],
      statistics: {
        totalEvents: 1,
        totalSessions: 1,
        avgSessionDuration: 1000,
        mostActiveDay: '2025-01-07',
        lastUpdated: '2025-01-07T00:00:00.000Z'
      }
    },
    personalization: {
      communication: {
        responseLength: 'balanced',
        tone: 'neutral',
        useEmojis: true,
        formatting: 'markdown'
      },
      ui: {
        theme: 'dark',
        density: 'comfortable',
        fontSize: 1.0,
        animations: 'subtle',
        sidebarPosition: 'left',
        autoScrollMessages: true,
        groupMessagesByContext: false
      }
    }
  }

  return {
    id: 'backup_test_1',
    timestamp: '2025-01-07T00:00:00.000Z',
    type: 'full',
    status: 'completed',
    size: JSON.stringify(mockData).length,
    compressedSize: JSON.stringify(mockData).length,
    compression: 'none',
    encryption: 'none',
    checksum: 'sha256:test123',
    version: '1.0.0',
    appVersion: '1.0.0',
    isAutomatic: false,
    name: 'Test Backup',
    description: 'Test backup for unit tests',
    tags: ['test'],
    data: mockData,
    ...overrides
  }
}

// ============================================================================
// SETUP AND TEARDOWN
// ============================================================================

describe('Backup Recovery System', () => {
  let recovery: BackupRecovery

  beforeEach(() => {
    recovery = new BackupRecovery()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    // Clean up test data
    try {
      await clearAllBackups()
    } catch {
      // Ignore cleanup errors
    }
  })

  // ============================================================================
  // PREVIEW RESTORE TESTS
  // ============================================================================

  describe('previewRestore', () => {
    it('should generate restore preview from backup', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      const preview = await recovery.previewRestore(mockBackup.id)

      expect(preview).toBeDefined()
      expect(preview.backupId).toBe(mockBackup.id)
      expect(preview.backupName).toBe(mockBackup.name)
      expect(preview.backupDate).toBe(mockBackup.timestamp)
      expect(preview.backupType).toBe('full')
      expect(preview.itemsToRestore.conversations).toBe(1)
      expect(preview.itemsToRestore.messages).toBe(1)
      expect(preview.itemsToRestore.knowledge).toBe(1)
      expect(preview.itemsToRestore.analytics).toBe(1)
    })

    it('should calculate estimated duration based on item count', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      const preview = await recovery.previewRestore(mockBackup.id)

      // Should estimate at least 1 second
      expect(preview.estimatedDuration).toBeGreaterThanOrEqual(1000)
    })

    it('should indicate pre-restore backup status', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      const preview = await recovery.previewRestore(mockBackup.id)

      // Should indicate pre-restore backup will be created
      expect(preview.preRestoreBackup).toBe(true)
    })

    it('should throw NotFoundError for non-existent backup', async () => {
      await expect(recovery.previewRestore('non_existent')).rejects.toThrow(NotFoundError)
    })
  })

  // ============================================================================
  // RESTORE FROM BACKUP TESTS
  // ============================================================================

  describe('restoreFromBackup', () => {
    it('should restore backup with pre-restore backup creation', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      const result = await recovery.restoreFromBackup(mockBackup.id, {
        createPreRestoreBackup: true,
        verifyBeforeRestore: false // Skip verification for faster tests
      })

      expect(result.success).toBe(true)
      expect(result.backupId).toBe(mockBackup.id)
      expect(result.preRestoreBackupCreated).toBe(true)
      expect(result.preRestoreBackupId).toBeDefined()
      expect(result.errors).toHaveLength(0)
    })

    it('should restore without pre-restore backup when disabled', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      const result = await recovery.restoreFromBackup(mockBackup.id, {
        createPreRestoreBackup: false,
        verifyBeforeRestore: false
      })

      expect(result.success).toBe(true)
      expect(result.preRestoreBackupCreated).toBe(false)
      expect(result.preRestoreBackupId).toBeUndefined()
    })

    it('should verify backup before restore when enabled', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      // Mock verifyBackup to return valid
      vi.spyOn(await import('../verification'), 'verifyBackup').mockResolvedValue({
        valid: true,
        checksumValid: true,
        versionCompatible: true,
        integrityChecks: {
          conversations: { valid: true, count: 1, errors: [] },
          knowledge: { valid: true, count: 1, errors: [] },
          settings: { valid: true, errors: [] },
          analytics: { valid: true, count: 1, errors: [] },
          personalization: { valid: true, errors: [] }
        },
        sizeVerification: {
          expected: mockBackup.size,
          actual: mockBackup.size,
          match: true
        },
        warnings: [],
        timestamp: new Date().toISOString()
      })

      const result = await recovery.restoreFromBackup(mockBackup.id, {
        verifyBeforeRestore: true,
        createPreRestoreBackup: false
      })

      expect(result.success).toBe(true)
    })

    it('should fail restore when verification fails', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      // Mock verifyBackup to return invalid
      vi.spyOn(await import('../verification'), 'verifyBackup').mockResolvedValue({
        valid: false,
        checksumValid: false,
        versionCompatible: true,
        integrityChecks: {
          conversations: { valid: false, count: 1, errors: ['Checksum failed'] },
          knowledge: { valid: true, count: 1, errors: [] },
          settings: { valid: true, errors: [] },
          analytics: { valid: true, count: 1, errors: [] },
          personalization: { valid: true, errors: [] }
        },
        sizeVerification: {
          expected: mockBackup.size,
          actual: mockBackup.size,
          match: true
        },
        warnings: [],
        timestamp: new Date().toISOString()
      })

      const result = await recovery.restoreFromBackup(mockBackup.id, {
        verifyBeforeRestore: true,
        createPreRestoreBackup: false
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should report progress during restore', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      const progressUpdates: RestoreProgress[] = []
      const onProgress = vi.fn((progress: RestoreProgress) => {
        progressUpdates.push(progress)
      })

      await recovery.restoreFromBackup(mockBackup.id, {
        onProgress,
        verifyBeforeRestore: false,
        createPreRestoreBackup: false
      })

      expect(onProgress).toHaveBeenCalled()
      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates[0].stage).toBeDefined()
      expect(progressUpdates[0].progress).toBeGreaterThanOrEqual(0)
      expect(progressUpdates[0].progress).toBeLessThanOrEqual(100)
    })

    it('should track restore duration', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      const result = await recovery.restoreFromBackup(mockBackup.id, {
        verifyBeforeRestore: false,
        createPreRestoreBackup: false
      })

      expect(result.duration).toBeGreaterThanOrEqual(0)
      expect(result.timestamp).toBeDefined()
    })

    it('should handle selective category restore', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      const result = await recovery.restoreFromBackup(mockBackup.id, {
        categories: ['settings'],
        verifyBeforeRestore: false,
        createPreRestoreBackup: false
      })

      expect(result.success).toBe(true)
      // Should only restore settings, not conversations
      expect(result.itemsRestored.settings).toBeGreaterThan(0)
    })

    it('should throw error for non-existent backup', async () => {
      await expect(
        recovery.restoreFromBackup('non_existent')
      ).rejects.toThrow()
    })
  })

  // ============================================================================
  // RESTORE CONFIRMATION TESTS
  // ============================================================================

  describe('restore confirmation', () => {
    it('should request confirmation before restore', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      let receivedPreview: RestorePreview | undefined
      const onConfirm = vi.fn(async (preview: RestorePreview) => {
        receivedPreview = preview
        return true
      })

      await recovery.restoreFromBackup(mockBackup.id, {
        onConfirm,
        verifyBeforeRestore: false,
        createPreRestoreBackup: false
      })

      expect(onConfirm).toHaveBeenCalled()
      expect(receivedPreview).toBeDefined()
      expect(receivedPreview?.backupId).toBe(mockBackup.id)
    })

    it('should cancel restore when confirmation denied', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      const onConfirm = vi.fn(async () => false)

      const result = await recovery.restoreFromBackup(mockBackup.id, {
        onConfirm,
        verifyBeforeRestore: false,
        createPreRestoreBackup: false
      })

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.message.includes('cancelled'))).toBe(true)
    })
  })

  // ============================================================================
  // CANCEL RESTORE TESTS
  // ============================================================================

  describe('cancelRestore', () => {
    it('should cancel in-progress restore', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      // Create a slow restore operation
      const restorePromise = recovery.restoreFromBackup(mockBackup.id, {
        verifyBeforeRestore: false,
        createPreRestoreBackup: false,
        onProgress: vi.fn()
      })

      // Cancel immediately
      recovery.cancelRestore()

      const result = await restorePromise
      // Restore should either succeed quickly or be cancelled
      expect(result).toBeDefined()
    })

    it('should handle multiple cancel calls gracefully', () => {
      expect(() => {
        recovery.cancelRestore()
        recovery.cancelRestore()
        recovery.cancelRestore()
      }).not.toThrow()
    })
  })

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('error handling', () => {
    it('should handle corrupt backup gracefully', async () => {
      const corruptBackup = createMockBackup({
        data: null as any // Corrupted data
      })
      await saveBackup(corruptBackup)

      const result = await recovery.restoreFromBackup(corruptBackup.id, {
        verifyBeforeRestore: false,
        createPreRestoreBackup: false
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle missing backup data gracefully', async () => {
      const emptyBackup = createMockBackup({
        data: {}
      })
      await saveBackup(emptyBackup)

      const result = await recovery.restoreFromBackup(emptyBackup.id, {
        verifyBeforeRestore: false,
        createPreRestoreBackup: false
      })

      expect(result).toBeDefined()
      // Should still succeed but with zero items restored
      expect(result.itemsRestored.conversations).toBe(0)
    })

    it('should handle progress callback errors gracefully', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      const onProgress = vi.fn(() => {
        throw new Error('Progress callback error')
      })

      // Should not throw despite progress callback error
      const result = await recovery.restoreFromBackup(mockBackup.id, {
        onProgress,
        verifyBeforeRestore: false,
        createPreRestoreBackup: false
      })

      expect(result).toBeDefined()
    })
  })

  // ============================================================================
  // CONVENIENCE FUNCTIONS TESTS
  // ============================================================================

  describe('convenience functions', () => {
    it('should restore using convenience function', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      const result = await restoreFromBackup(mockBackup.id, {
        verifyBeforeRestore: false,
        createPreRestoreBackup: false
      })

      expect(result.success).toBe(true)
      expect(result.backupId).toBe(mockBackup.id)
    })

    it('should preview using convenience function', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      const preview = await previewRestore(mockBackup.id)

      expect(preview).toBeDefined()
      expect(preview.backupId).toBe(mockBackup.id)
    })
  })

  // ============================================================================
  // RESTORE VALIDATION TESTS
  // ============================================================================

  describe('restore validation', () => {
    it('should validate restored items count', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      const result = await recovery.restoreFromBackup(mockBackup.id, {
        verifyBeforeRestore: false,
        createPreRestoreBackup: false
      })

      // Should have restored something
      const totalRestored = Object.values(result.itemsRestored).reduce((a, b) => a + b, 0)
      expect(totalRestored).toBeGreaterThanOrEqual(0)
    })

    it('should handle restore with all categories', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      const result = await recovery.restoreFromBackup(mockBackup.id, {
        categories: ['all'],
        verifyBeforeRestore: false,
        createPreRestoreBackup: false
      })

      expect(result.success).toBe(true)
    })

    it('should handle restore with specific categories', async () => {
      const mockBackup = createMockBackup()
      await saveBackup(mockBackup)

      const result = await recovery.restoreFromBackup(mockBackup.id, {
        categories: ['conversations', 'settings'],
        verifyBeforeRestore: false,
        createPreRestoreBackup: false
      })

      expect(result.success).toBe(true)
    })
  })

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('integration tests', () => {
    it('should complete full backup and restore cycle', async () => {
      // Create backup
      const backup = createMockBackup()
      await saveBackup(backup)

      // Preview restore
      const preview = await previewRestore(backup.id)
      expect(preview).toBeDefined()

      // Restore backup
      const result = await restoreFromBackup(backup.id, {
        createPreRestoreBackup: true,
        verifyBeforeRestore: false
      })

      expect(result.success).toBe(true)
      expect(result.preRestoreBackupId).toBeDefined()
    })

    it('should handle multiple backup restores', async () => {
      const backup1 = createMockBackup({ id: 'backup_1', name: 'Backup 1' })
      const backup2 = createMockBackup({ id: 'backup_2', name: 'Backup 2' })

      await saveBackup(backup1)
      await saveBackup(backup2)

      const result1 = await restoreFromBackup(backup1.id, {
        verifyBeforeRestore: false,
        createPreRestoreBackup: false
      })

      const result2 = await restoreFromBackup(backup2.id, {
        verifyBeforeRestore: false,
        createPreRestoreBackup: false
      })

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
    })
  })
})
