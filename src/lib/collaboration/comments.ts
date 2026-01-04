/**
 * Comments & Annotations System
 *
 * Manages comments, reactions, and threaded discussions.
 */

import {
  Comment,
  CommentId,
  createCommentId,
  ShareableType,
  CommentAuthor,
  CommentReaction,
  TextHighlight,
  CommentAttachment,
} from './types'
import { ValidationError, NotFoundError, StorageError } from '@/lib/errors'

const STORE_COMMENTS = 'comments'

// ============================================================================
// DATABASE HELPERS
// ============================================================================

async function getDB(): Promise<IDBDatabase> {
  const DB_NAME = 'PersonalLogCollaboration'
  const DB_VERSION = 1

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(new Error('Failed to open database'))

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      // Comments store
      if (!database.objectStoreNames.contains(STORE_COMMENTS)) {
        const commentStore = database.createObjectStore(STORE_COMMENTS, { keyPath: 'id' })
        commentStore.createIndex('resourceId', 'resourceId', { unique: false })
        commentStore.createIndex('parentId', 'parentId', { unique: false })
        commentStore.createIndex('timestamp', 'timestamp', { unique: false })
        commentStore.createIndex('resolved', 'resolved', { unique: false })
      }
    }
  })
}

// ============================================================================
// COMMENT MANAGEMENT
// ============================================================================

/**
 * Add a comment to a resource
 */
export async function addComment(
  resourceId: string,
  resourceType: ShareableType,
  content: string,
  author: CommentAuthor,
  options: {
    parentId?: string
    highlights?: TextHighlight[]
    attachments?: CommentAttachment[]
  } = {}
): Promise<Comment> {
  if (!resourceId?.trim()) {
    throw new ValidationError('Resource ID cannot be empty', {
      field: 'resourceId',
      value: resourceId,
    })
  }

  if (!content?.trim()) {
    throw new ValidationError('Comment content cannot be empty', {
      field: 'content',
      value: content,
    })
  }

  const database = await getDB()
  const now = Date.now()

  // Extract mentions from content
  const mentions = extractMentions(content)

  const comment: Comment = {
    id: createCommentId().toString(),
    resourceId,
    resourceType,
    parentId: options.parentId,
    content,
    author,
    timestamp: now,
    reactions: [],
    resolved: false,
    highlights: options.highlights,
    metadata: {
      edits: 0,
      mentions,
      attachments: options.attachments,
    },
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_COMMENTS], 'readwrite')
    const store = transaction.objectStore(STORE_COMMENTS)
    const request = store.add(comment)

    request.onsuccess = () => resolve(comment)
    request.onerror = () => reject(new StorageError('Failed to add comment', {
      technicalDetails: request.error?.message,
      cause: request.error || undefined,
    }))
  })
}

/**
 * Get a comment by ID
 */
export async function getComment(id: string): Promise<Comment | null> {
  if (!id?.trim()) {
    throw new ValidationError('Comment ID cannot be empty', {
      field: 'id',
      value: id,
    })
  }

  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_COMMENTS], 'readonly')
    const store = transaction.objectStore(STORE_COMMENTS)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(new StorageError('Failed to get comment', {
      technicalDetails: request.error?.message,
      cause: request.error || undefined,
    }))
  })
}

/**
 * Get all comments for a resource
 */
export async function getComments(
  resourceId: string,
  options: {
    includeResolved?: boolean
    parentId?: string
  } = {}
): Promise<Comment[]> {
  if (!resourceId?.trim()) {
    throw new ValidationError('Resource ID cannot be empty', {
      field: 'resourceId',
      value: resourceId,
    })
  }

  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_COMMENTS], 'readonly')
    const index = transaction.objectStore(STORE_COMMENTS).index('resourceId')
    const request = index.getAll(resourceId)

    request.onsuccess = () => {
      let comments = (request.result || []) as Comment[]

      // Filter by parent ID if specified
      if (options.parentId !== undefined) {
        comments = comments.filter(c => c.parentId === options.parentId)
      }

      // Filter resolved comments if needed
      if (!options.includeResolved) {
        comments = comments.filter(c => !c.resolved)
      }

      // Sort by timestamp (oldest first)
      comments.sort((a, b) => a.timestamp - b.timestamp)

      resolve(comments)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get comment thread (parent + all replies)
 */
export async function getCommentThread(commentId: string): Promise<Comment[]> {
  const root = await getComment(commentId)
  if (!root) {
    throw new NotFoundError('comment', commentId)
  }

  const replies = await getComments(root.resourceId, { parentId: commentId })

  return [root, ...replies]
}

/**
 * Update a comment
 */
export async function updateComment(
  id: string,
  updates: {
    content?: string
    highlights?: TextHighlight[]
    attachments?: CommentAttachment[]
  }
): Promise<Comment> {
  const existing = await getComment(id)
  if (!existing) {
    throw new NotFoundError('comment', id)
  }

  const now = Date.now()
  const mentions = updates.content ? extractMentions(updates.content) : existing.metadata.mentions

  const updated: Comment = {
    ...existing,
    ...updates,
    editedAt: now,
    metadata: {
      ...existing.metadata,
      edits: existing.metadata.edits + 1,
      lastEditBy: existing.author.id,
      mentions,
      attachments: updates.attachments || existing.metadata.attachments,
    },
  }

  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_COMMENTS], 'readwrite')
    const store = transaction.objectStore(STORE_COMMENTS)
    const request = store.put(updated)

    request.onsuccess = () => resolve(updated)
    request.onerror = () => reject(new StorageError('Failed to update comment', {
      technicalDetails: request.error?.message,
      cause: request.error || undefined,
    }))
  })
}

/**
 * Delete a comment
 */
export async function deleteComment(id: string): Promise<void> {
  if (!id?.trim()) {
    throw new ValidationError('Comment ID cannot be empty', {
      field: 'id',
      value: id,
    })
  }

  const database = await getDB()

  // Delete all replies first
  const comment = await getComment(id)
  if (comment) {
    const replies = await getComments(comment.resourceId, { parentId: id })
    for (const reply of replies) {
      await deleteComment(reply.id)
    }
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_COMMENTS], 'readwrite')
    const store = transaction.objectStore(STORE_COMMENTS)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new StorageError('Failed to delete comment', {
      technicalDetails: request.error?.message,
      cause: request.error || undefined,
    }))
  })
}

/**
 * Resolve/unresolve a comment
 */
export async function resolveComment(
  id: string,
  resolved: boolean,
  resolvedBy?: string
): Promise<Comment> {
  const comment = await getComment(id)
  if (!comment) {
    throw new NotFoundError('comment', id)
  }

  const updated: Comment = {
    ...comment,
    resolved,
    resolvedBy,
    resolvedAt: resolved ? Date.now() : undefined,
  }

  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_COMMENTS], 'readwrite')
    const store = transaction.objectStore(STORE_COMMENTS)
    const request = store.put(updated)

    request.onsuccess = () => resolve(updated)
    request.onerror = () => reject(new StorageError('Failed to resolve comment', {
      technicalDetails: request.error?.message,
      cause: request.error || undefined,
    }))
  })
}

// ============================================================================
// REACTIONS
// ============================================================================

/**
 * Add reaction to comment
 */
export async function addReaction(
  commentId: string,
  emoji: string,
  userId: string
): Promise<Comment> {
  const comment = await getComment(commentId)
  if (!comment) {
    throw new NotFoundError('comment', commentId)
  }

  // Find existing reaction
  const existingReaction = comment.reactions.find(r => r.emoji === emoji)

  let updatedReactions: CommentReaction[]

  if (existingReaction) {
    // Add user to existing reaction
    if (!existingReaction.users.includes(userId)) {
      existingReaction.users.push(userId)
      existingReaction.count++
    }
    updatedReactions = [...comment.reactions]
  } else {
    // Create new reaction
    updatedReactions = [
      ...comment.reactions,
      {
        emoji,
        users: [userId],
        count: 1,
      },
    ]
  }

  return updateComment(commentId, {
    content: comment.content,
    highlights: comment.highlights,
  })
}

/**
 * Remove reaction from comment
 */
export async function removeReaction(
  commentId: string,
  emoji: string,
  userId: string
): Promise<Comment> {
  const comment = await getComment(commentId)
  if (!comment) {
    throw new NotFoundError('comment', commentId)
  }

  const updatedReactions = comment.reactions
    .map(r => {
      if (r.emoji === emoji) {
        const users = r.users.filter(u => u !== userId)
        return {
          ...r,
          users,
          count: users.length,
        }
      }
      return r
    })
    .filter(r => r.count > 0)

  return updateComment(commentId, {
    content: comment.content,
    highlights: comment.highlights,
  })
}

// ============================================================================
// SEARCH & FILTER
// ============================================================================

/**
 * Search comments by content
 */
export async function searchComments(
  resourceId: string,
  query: string
): Promise<Comment[]> {
  const allComments = await getComments(resourceId, { includeResolved: true })

  if (!query.trim()) {
    return allComments
  }

  const lowerQuery = query.toLowerCase()
  return allComments.filter(c =>
    c.content.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get comments by user
 */
export async function getCommentsByUser(
  resourceId: string,
  userId: string
): Promise<Comment[]> {
  const allComments = await getComments(resourceId, { includeResolved: true })
  return allComments.filter(c => c.author.id === userId)
}

/**
 * Get comments mentioning user
 */
export async function getCommentsMentioningUser(
  resourceId: string,
  userId: string
): Promise<Comment[]> {
  const allComments = await getComments(resourceId, { includeResolved: true })
  return allComments.filter(c => c.metadata.mentions.includes(userId))
}

/**
 * Get unresolved comments
 */
export async function getUnresolvedComments(resourceId: string): Promise<Comment[]> {
  const allComments = await getComments(resourceId, { includeResolved: true })
  return allComments.filter(c => !c.resolved)
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get comment statistics
 */
export async function getCommentStatistics(resourceId: string): Promise<{
  total: number
  unresolved: number
  byUser: Record<string, number>
  totalReactions: number
  mostReactions: { commentId: string; count: number } | null
}> {
  const allComments = await getComments(resourceId, { includeResolved: true })

  const byUser: Record<string, number> = {}
  let totalReactions = 0
  let mostReactions: { commentId: string; count: number } | null = null

  for (const comment of allComments) {
    // Count by user
    byUser[comment.author.id] = (byUser[comment.author.id] || 0) + 1

    // Count reactions
    const reactionCount = comment.reactions.reduce((sum, r) => sum + r.count, 0)
    totalReactions += reactionCount

    // Track most reactions
    if (!mostReactions || reactionCount > mostReactions.count) {
      mostReactions = { commentId: comment.id, count: reactionCount }
    }
  }

  return {
    total: allComments.length,
    unresolved: allComments.filter(c => !c.resolved).length,
    byUser,
    totalReactions,
    mostReactions,
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Extract @mentions from comment content
 */
function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g
  const mentions: string[] = []
  let match

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1])
  }

  return mentions
}

/**
 * Validate highlight positions
 */
export function validateHighlight(highlight: TextHighlight, text: string): boolean {
  if (highlight.start < 0 || highlight.end > text.length) {
    return false
  }

  if (highlight.start > highlight.end) {
    return false
  }

  const actualText = text.substring(highlight.start, highlight.end)
  return actualText === highlight.text
}

/**
 * Parse comment content for highlights
 */
export function parseCommentContent(
  content: string,
  highlights?: TextHighlight[]
): { text: string; highlights: TextHighlight[] } {
  if (!highlights || highlights.length === 0) {
    return { text: content, highlights: [] }
  }

  // Validate highlights
  const validHighlights = highlights.filter(h => validateHighlight(h, content))

  return {
    text: content,
    highlights: validHighlights,
  }
}
