/**
 * Tests for Collaboration Sharing System
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createShareLink,
  getShareLink,
  getShareLinkByToken,
  listShareLinks,
  updateShareLink,
  revokeShareLink,
  deleteShareLink,
  accessShare,
  generateShareUrl,
  cleanupExpiredShares,
} from '../sharing'

describe('Collaboration Sharing System', () => {
  const testResourceId = 'test-conversation-1'
  const testResourceType = 'conversation' as const

  beforeEach(async () => {
    // Clear test data before each test
    const shares = await listShareLinks(testResourceId)
    for (const share of shares) {
      await deleteShareLink(share.id)
    }
  })

  afterEach(async () => {
    // Cleanup after tests
    const shares = await listShareLinks(testResourceId)
    for (const share of shares) {
      await deleteShareLink(share.id)
    }
  })

  describe('Share Link Creation', () => {
    it('should create a private share link', async () => {
      const share = await createShareLink(testResourceId, testResourceType, 'private')

      expect(share).toBeDefined()
      expect(share.resourceId).toBe(testResourceId)
      expect(share.resourceType).toBe(testResourceType)
      expect(share.visibility).toBe('private')
      expect(share.status).toBe('active')
      expect(share.shareId).toBeDefined()
      expect(share.permissions.canView).toBe(true)
      expect(share.permissions.canEdit).toBe(false)
    })

    it('should create a password-protected share link', async () => {
      const password = 'test-password-123'
      const share = await createShareLink(
        testResourceId,
        testResourceType,
        'password-protected',
        { password }
      )

      expect(share.visibility).toBe('password-protected')
      expect(share.password).toBeDefined()
      expect(share.password).not.toBe(password) // Should be hashed
    })

    it('should create a share link with custom permissions', async () => {
      const share = await createShareLink(
        testResourceId,
        testResourceType,
        'private',
        {
          permissions: {
            canView: true,
            canEdit: true,
            canComment: true,
            canShare: false,
            canDownload: true,
            canDelete: false,
          },
        }
      )

      expect(share.permissions.canEdit).toBe(true)
      expect(share.permissions.canDownload).toBe(true)
    })

    it('should create a share link with expiration', async () => {
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      const share = await createShareLink(
        testResourceId,
        testResourceType,
        'public',
        { expiresAt }
      )

      expect(share.expiresAt).toBe(expiresAt)
    })

    it('should reject empty resource ID', async () => {
      await expect(
        createShareLink('', testResourceType, 'private')
      ).rejects.toThrow()
    })
  })

  describe('Share Link Retrieval', () => {
    it('should retrieve share link by ID', async () => {
      const created = await createShareLink(testResourceId, testResourceType, 'private')
      const retrieved = await getShareLink(created.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.shareId).toBe(created.shareId)
    })

    it('should retrieve share link by token', async () => {
      const created = await createShareLink(testResourceId, testResourceType, 'private')
      const retrieved = await getShareLinkByToken(created.shareId)

      expect(retrieved).toBeDefined()
      expect(retrieved?.shareId).toBe(created.shareId)
    })

    it('should return null for non-existent share', async () => {
      const retrieved = await getShareLink('non-existent-id')
      expect(retrieved).toBeNull()
    })

    it('should list all shares for a resource', async () => {
      await createShareLink(testResourceId, testResourceType, 'private')
      await createShareLink(testResourceId, testResourceType, 'public')

      const shares = await listShareLinks(testResourceId)

      expect(shares).toHaveLength(2)
    })
  })

  describe('Share Link Updates', () => {
    it('should update share link visibility', async () => {
      const share = await createShareLink(testResourceId, testResourceType, 'private')
      const updated = await updateShareLink(share.id, { visibility: 'public' })

      expect(updated.visibility).toBe('public')
    })

    it('should update share link password', async () => {
      const share = await createShareLink(
        testResourceId,
        testResourceType,
        'password-protected',
        { password: 'old-password' }
      )

      const updated = await updateShareLink(share.id, { password: 'new-password' })

      expect(updated.password).toBeDefined()
      expect(updated.password).not.toBe('old-password')
      expect(updated.password).not.toBe('new-password') // Should be hashed
    })

    it('should update share link expiration', async () => {
      const share = await createShareLink(testResourceId, testResourceType, 'private')
      const newExpiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000

      const updated = await updateShareLink(share.id, { expiresAt: newExpiresAt })

      expect(updated.expiresAt).toBe(newExpiresAt)
    })

    it('should update access count', async () => {
      const share = await createShareLink(testResourceId, testResourceType, 'private')

      const updated = await updateShareLink(share.id, {
        accessCount: share.accessCount + 1,
        lastAccessed: Date.now(),
      })

      expect(updated.accessCount).toBe(1)
      expect(updated.lastAccessed).toBeDefined()
    })
  })

  describe('Share Link Revocation', () => {
    it('should revoke a share link', async () => {
      const share = await createShareLink(testResourceId, testResourceType, 'private')
      await revokeShareLink(share.id)

      const revoked = await getShareLink(share.id)
      expect(revoked?.status).toBe('revoked')
    })

    it('should not allow access to revoked shares', async () => {
      const share = await createShareLink(testResourceId, testResourceType, 'private')
      await revokeShareLink(share.id)

      const result = await accessShare(share.shareId)

      expect(result.hasAccess).toBe(false)
      expect(result.reason).toContain('revoked')
    })
  })

  describe('Share Access', () => {
    it('should allow access to active private shares', async () => {
      const share = await createShareLink(testResourceId, testResourceType, 'private')
      const result = await accessShare(share.shareId)

      expect(result.hasAccess).toBe(true)
      expect(result.share.id).toBe(share.id)
    })

    it('should require password for password-protected shares', async () => {
      const password = 'test-password'
      const share = await createShareLink(
        testResourceId,
        testResourceType,
        'password-protected',
        { password }
      )

      // No password
      let result = await accessShare(share.shareId)
      expect(result.hasAccess).toBe(false)
      expect(result.reason).toBe('Password required')

      // Wrong password
      result = await accessShare(share.shareId, 'wrong-password')
      expect(result.hasAccess).toBe(false)
      expect(result.reason).toBe('Invalid password')

      // Correct password
      result = await accessShare(share.shareId, password)
      expect(result.hasAccess).toBe(true)
    })

    it('should reject access to expired shares', async () => {
      const expiresAt = Date.now() - 1000 // Already expired
      const share = await createShareLink(
        testResourceId,
        testResourceType,
        'private',
        { expiresAt }
      )

      // Manually expire the share
      await updateShareLink(share.id, { status: 'expired' })

      const result = await accessShare(share.shareId)

      expect(result.hasAccess).toBe(false)
      expect(result.reason).toContain('expired')
    })
  })

  describe('Share URL Generation', () => {
    it('should generate share URL', () => {
      const shareId = 'share_test_123'
      const baseUrl = 'https://example.com'

      const url = generateShareUrl(shareId, baseUrl)

      expect(url).toBe(`${baseUrl}/share/${shareId}`)
    })

    it('should use default base URL', () => {
      const shareId = 'share_test_456'

      // Mock window.location.origin
      const originalOrigin = window.location.origin
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { origin: 'https://default.com' },
      })

      const url = generateShareUrl(shareId)

      expect(url).toContain(shareId)

      // Restore
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { origin: originalOrigin },
      })
    })
  })

  describe('Cleanup Operations', () => {
    it('should clean up expired shares', async () => {
      // Create expired share
      const expiresAt = Date.now() - 1000
      await createShareLink(testResourceId, testResourceType, 'private', { expiresAt })

      // Create active share
      await createShareLink(testResourceId, testResourceType, 'private')

      // Cleanup
      const cleaned = await cleanupExpiredShares()

      expect(cleaned).toBeGreaterThan(0)

      const shares = await listShareLinks(testResourceId)
      const expiredShares = shares.filter(s => s.status === 'expired')
      expect(expiredShares.length).toBe(1) // Only the expired one
    })
  })
})
