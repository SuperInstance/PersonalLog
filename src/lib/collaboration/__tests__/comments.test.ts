/**
 * Tests for Collaboration Comments System
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  addComment,
  getComment,
  getComments,
  updateComment,
  deleteComment,
  resolveComment,
  addReaction,
  removeReaction,
  searchComments,
  getCommentsByUser,
  getUnresolvedComments,
  getCommentStatistics,
} from '../comments'

describe('Collaboration Comments System', () => {
  const testResourceId = 'test-conversation-1'
  const testResourceType = 'conversation' as const

  const mockAuthor = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    avatar: '#3b82f6',
    isCurrentUser: true,
  }

  const mockAuthor2 = {
    id: 'user-2',
    name: 'Another User',
    email: 'another@example.com',
    avatar: '#ef4444',
    isCurrentUser: false,
  }

  beforeEach(async () => {
    // Cleanup before each test
    const comments = await getComments(testResourceId, { includeResolved: true })
    for (const comment of comments) {
      await deleteComment(comment.id)
    }
  })

  afterEach(async () => {
    // Final cleanup
    const comments = await getComments(testResourceId, { includeResolved: true })
    for (const comment of comments) {
      await deleteComment(comment.id)
    }
  })

  describe('Comment Creation', () => {
    it('should create a top-level comment', async () => {
      const content = 'This is a test comment'
      const comment = await addComment(testResourceId, testResourceType, content, mockAuthor)

      expect(comment).toBeDefined()
      expect(comment.id).toBeDefined()
      expect(comment.resourceId).toBe(testResourceId)
      expect(comment.content).toBe(content)
      expect(comment.author.id).toBe(mockAuthor.id)
      expect(comment.parentId).toBeUndefined()
      expect(comment.resolved).toBe(false)
    })

    it('should create a reply comment', async () => {
      const parent = await addComment(
        testResourceId,
        testResourceType,
        'Parent comment',
        mockAuthor
      )

      const reply = await addComment(
        testResourceId,
        testResourceType,
        'Reply comment',
        mockAuthor2,
        { parentId: parent.id }
      )

      expect(reply.parentId).toBe(parent.id)
      expect(reply.content).toBe('Reply comment')
    })

    it('should extract mentions from content', async () => {
      const content = 'Hello @alice and @bob'
      const comment = await addComment(testResourceId, testResourceType, content, mockAuthor)

      expect(comment.metadata.mentions).toContain('alice')
      expect(comment.metadata.mentions).toContain('bob')
    })

    it('should reject empty content', async () => {
      await expect(
        addComment(testResourceId, testResourceType, '', mockAuthor)
      ).rejects.toThrow()
    })

    it('should reject empty resource ID', async () => {
      await expect(
        addComment('', testResourceType, 'Test', mockAuthor)
      ).rejects.toThrow()
    })
  })

  describe('Comment Retrieval', () => {
    it('should retrieve a comment by ID', async () => {
      const created = await addComment(
        testResourceId,
        testResourceType,
        'Test comment',
        mockAuthor
      )

      const retrieved = await getComment(created.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.content).toBe('Test comment')
    })

    it('should return null for non-existent comment', async () => {
      const retrieved = await getComment('non-existent-id')
      expect(retrieved).toBeNull()
    })

    it('should retrieve all comments for a resource', async () => {
      await addComment(testResourceId, testResourceType, 'Comment 1', mockAuthor)
      await addComment(testResourceId, testResourceType, 'Comment 2', mockAuthor)

      const comments = await getComments(testResourceId)

      expect(comments).toHaveLength(2)
    })

    it('should exclude resolved comments by default', async () => {
      const comment1 = await addComment(testResourceId, testResourceType, 'Comment 1', mockAuthor)
      await addComment(testResourceId, testResourceType, 'Comment 2', mockAuthor)

      await resolveComment(comment1.id, true, mockAuthor.id)

      const comments = await getComments(testResourceId, { includeResolved: false })

      expect(comments).toHaveLength(1)
      expect(comments[0].content).toBe('Comment 2')
    })

    it('should include resolved comments when requested', async () => {
      const comment1 = await addComment(testResourceId, testResourceType, 'Comment 1', mockAuthor)
      await addComment(testResourceId, testResourceType, 'Comment 2', mockAuthor)

      await resolveComment(comment1.id, true, mockAuthor.id)

      const comments = await getComments(testResourceId, { includeResolved: true })

      expect(comments).toHaveLength(2)
    })

    it('should filter comments by parent ID', async () => {
      const parent = await addComment(testResourceId, testResourceType, 'Parent', mockAuthor)
      await addComment(testResourceId, testResourceType, 'Reply 1', mockAuthor, { parentId: parent.id })
      await addComment(testResourceId, testResourceType, 'Reply 2', mockAuthor, { parentId: parent.id })

      const replies = await getComments(testResourceId, { parentId: parent.id })

      expect(replies).toHaveLength(2)
      expect(replies.every(r => r.parentId === parent.id)).toBe(true)
    })
  })

  describe('Comment Updates', () => {
    it('should update comment content', async () => {
      const comment = await addComment(testResourceId, testResourceType, 'Original', mockAuthor)

      const updated = await updateComment(comment.id, { content: 'Updated' })

      expect(updated.content).toBe('Updated')
      expect(updated.editedAt).toBeDefined()
      expect(updated.metadata.edits).toBe(1)
    })

    it('should track edit history', async () => {
      const comment = await addComment(testResourceId, testResourceType, 'Original', mockAuthor)

      await updateComment(comment.id, { content: 'Update 1' })
      await updateComment(comment.id, { content: 'Update 2' })

      const updated = await getComment(comment.id)

      expect(updated?.metadata.edits).toBe(2)
      expect(updated?.editedAt).toBeDefined()
    })
  })

  describe('Comment Deletion', () => {
    it('should delete a comment', async () => {
      const comment = await addComment(testResourceId, testResourceType, 'Test', mockAuthor)

      await deleteComment(comment.id)

      const retrieved = await getComment(comment.id)
      expect(retrieved).toBeNull()
    })

    it('should delete replies when deleting parent', async () => {
      const parent = await addComment(testResourceId, testResourceType, 'Parent', mockAuthor)
      await addComment(testResourceId, testResourceType, 'Reply', mockAuthor, { parentId: parent.id })

      await deleteComment(parent.id)

      const comments = await getComments(testResourceId, { includeResolved: true })
      expect(comments).toHaveLength(0)
    })
  })

  describe('Comment Resolution', () => {
    it('should resolve a comment', async () => {
      const comment = await addComment(testResourceId, testResourceType, 'Test', mockAuthor)

      const resolved = await resolveComment(comment.id, true, mockAuthor.id)

      expect(resolved.resolved).toBe(true)
      expect(resolved.resolvedBy).toBe(mockAuthor.id)
      expect(resolved.resolvedAt).toBeDefined()
    })

    it('should unresolve a comment', async () => {
      const comment = await addComment(testResourceId, testResourceType, 'Test', mockAuthor)
      await resolveComment(comment.id, true, mockAuthor.id)

      const unresolved = await resolveComment(comment.id, false, mockAuthor.id)

      expect(unresolved.resolved).toBe(false)
      expect(unresolved.resolvedAt).toBeUndefined()
    })
  })

  describe('Reactions', () => {
    it('should add reaction to comment', async () => {
      const comment = await addComment(testResourceId, testResourceType, 'Test', mockAuthor)

      const updated = await addReaction(comment.id, '👍', mockAuthor.id)

      const reaction = updated.reactions.find(r => r.emoji === '👍')
      expect(reaction).toBeDefined()
      expect(reaction?.count).toBe(1)
      expect(reaction?.users).toContain(mockAuthor.id)
    })

    it('should remove reaction from comment', async () => {
      const comment = await addComment(testResourceId, testResourceType, 'Test', mockAuthor)
      await addReaction(comment.id, '👍', mockAuthor.id)

      const updated = await removeReaction(comment.id, '👍', mockAuthor.id)

      const reaction = updated.reactions.find(r => r.emoji === '👍')
      expect(reaction).toBeUndefined()
    })

    it('should handle multiple reactions from different users', async () => {
      const comment = await addComment(testResourceId, testResourceType, 'Test', mockAuthor)

      await addReaction(comment.id, '👍', mockAuthor.id)
      await addReaction(comment.id, '👍', mockAuthor2.id)

      const updated = await getComment(comment.id)
      const reaction = updated?.reactions.find(r => r.emoji === '👍')

      expect(reaction?.count).toBe(2)
      expect(reaction?.users).toHaveLength(2)
    })
  })

  describe('Search', () => {
    it('should search comments by content', async () => {
      await addComment(testResourceId, testResourceType, 'Apple banana cherry', mockAuthor)
      await addComment(testResourceId, testResourceType, 'Banana grape', mockAuthor)
      await addComment(testResourceId, testResourceType, 'Cherry date', mockAuthor)

      const results = await searchComments(testResourceId, 'banana')

      expect(results).toHaveLength(2)
      expect(results.every(r => r.content.toLowerCase().includes('banana'))).toBe(true)
    })

    it('should return all comments when query is empty', async () => {
      await addComment(testResourceId, testResourceType, 'Comment 1', mockAuthor)
      await addComment(testResourceId, testResourceType, 'Comment 2', mockAuthor)

      const results = await searchComments(testResourceId, '')

      expect(results).toHaveLength(2)
    })

    it('should get comments by user', async () => {
      await addComment(testResourceId, testResourceType, 'Comment 1', mockAuthor)
      await addComment(testResourceId, testResourceType, 'Comment 2', mockAuthor)
      await addComment(testResourceId, testResourceType, 'Comment 3', mockAuthor2)

      const user1Comments = await getCommentsByUser(testResourceId, mockAuthor.id)
      const user2Comments = await getCommentsByUser(testResourceId, mockAuthor2.id)

      expect(user1Comments).toHaveLength(2)
      expect(user2Comments).toHaveLength(1)
    })

    it('should get unresolved comments', async () => {
      const comment1 = await addComment(testResourceId, testResourceType, 'Comment 1', mockAuthor)
      await addComment(testResourceId, testResourceType, 'Comment 2', mockAuthor)

      await resolveComment(comment1.id, true, mockAuthor.id)

      const unresolved = await getUnresolvedComments(testResourceId)

      expect(unresolved).toHaveLength(1)
      expect(unresolved[0].content).toBe('Comment 2')
    })
  })

  describe('Statistics', () => {
    it('should get comment statistics', async () => {
      const comment1 = await addComment(testResourceId, testResourceType, 'Comment 1', mockAuthor)
      await addComment(testResourceId, testResourceType, 'Comment 2', mockAuthor2)

      await resolveComment(comment1.id, true, mockAuthor.id)
      await addReaction(comment1.id, '👍', mockAuthor.id)
      await addReaction(comment1.id, '👍', mockAuthor2.id)
      await addReaction(comment1.id, '❤️', mockAuthor.id)

      const stats = await getCommentStatistics(testResourceId)

      expect(stats.total).toBe(2)
      expect(stats.unresolved).toBe(1)
      expect(stats.byUser[mockAuthor.id]).toBe(1)
      expect(stats.byUser[mockAuthor2.id]).toBe(1)
      expect(stats.totalReactions).toBe(3)
      expect(stats.mostReactions).toBeDefined()
      expect(stats.mostReactions?.count).toBe(2)
    })
  })
})
