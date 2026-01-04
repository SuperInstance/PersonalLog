/**
 * Comments Panel Component
 *
 * Displays and manages comments for a resource.
 */

'use client'

import { useState, useEffect } from 'react'
import {
  getComments,
  addComment,
  updateComment,
  deleteComment,
  resolveComment,
  addReaction,
  removeReaction,
  getCommentStatistics,
} from '@/lib/collaboration/comments'
import { Comment, CommentAuthor } from '@/lib/collaboration/types'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/form/Textarea'
import { Input } from '@/components/ui/Input'

interface CommentsPanelProps {
  resourceId: string
  resourceType: 'conversation' | 'knowledge' | 'message'
  currentUser: CommentAuthor
  isOpen: boolean
  onClose?: () => void
}

export function CommentsPanel({
  resourceId,
  resourceType,
  currentUser,
  isOpen,
  onClose,
}: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [stats, setStats] = useState<{ total: number; unresolved: number } | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadComments()
      loadStatistics()
    }
  }, [isOpen, resourceId])

  const loadComments = async () => {
    setLoading(true)
    try {
      const allComments = await getComments(resourceId, { includeResolved: true })
      setComments(allComments)
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStatistics = async () => {
    try {
      const statistics = await getCommentStatistics(resourceId)
      setStats({
        total: statistics.total,
        unresolved: statistics.unresolved,
      })
    } catch (error) {
      console.error('Failed to load statistics:', error)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setLoading(true)
    try {
      const comment = await addComment(
        resourceId,
        resourceType,
        newComment,
        currentUser
      )

      setComments([comment, ...comments])
      setNewComment('')
      await loadStatistics()
    } catch (error) {
      console.error('Failed to add comment:', error)
      alert('Failed to add comment')
    } finally {
      setLoading(false)
    }
  }

  const handleAddReply = async (parentId: string) => {
    if (!replyText.trim()) return

    setLoading(true)
    try {
      const reply = await addComment(
        resourceId,
        resourceType,
        replyText,
        currentUser,
        { parentId }
      )

      setComments([...comments, reply])
      setReplyText('')
      setReplyTo(null)
      await loadStatistics()
    } catch (error) {
      console.error('Failed to add reply:', error)
      alert('Failed to add reply')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateComment = async (commentId: string) => {
    if (!editText.trim()) return

    setLoading(true)
    try {
      await updateComment(commentId, { content: editText })
      await loadComments()
      setEditingId(null)
      setEditText('')
    } catch (error) {
      console.error('Failed to update comment:', error)
      alert('Failed to update comment')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    setLoading(true)
    try {
      await deleteComment(commentId)
      await loadComments()
      await loadStatistics()
    } catch (error) {
      console.error('Failed to delete comment:', error)
      alert('Failed to delete comment')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleResolve = async (commentId: string, currentResolved: boolean) => {
    setLoading(true)
    try {
      await resolveComment(commentId, !currentResolved, currentUser.id)
      await loadComments()
      await loadStatistics()
    } catch (error) {
      console.error('Failed to resolve comment:', error)
      alert('Failed to resolve comment')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleReaction = async (commentId: string, emoji: string) => {
    try {
      const comment = comments.find(c => c.id === commentId)
      if (!comment) return

      const hasReacted = comment.reactions.some(
        r => r.emoji === emoji && r.users.includes(currentUser.id)
      )

      if (hasReacted) {
        await removeReaction(commentId, emoji, currentUser.id)
      } else {
        await addReaction(commentId, emoji, currentUser.id)
      }

      await loadComments()
    } catch (error) {
      console.error('Failed to toggle reaction:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="h-full flex flex-col bg-white border-l">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">Comments</h3>
          {stats && (
            <p className="text-sm text-gray-600">
              {stats.total} total, {stats.unresolved} unresolved
            </p>
          )}
        </div>

        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            ✕
          </button>
        )}
      </div>

      {/* New comment */}
      <div className="p-4 border-b">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="mb-2"
        />

        <div className="flex justify-end">
          <Button onClick={handleAddComment} disabled={loading || !newComment.trim()}>
            {loading ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments
            .filter(c => !c.parentId) // Only show top-level comments
            .map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                replies={comments.filter(c => c.parentId === comment.id)}
                currentUser={currentUser}
                onReply={setReplyTo}
                onEdit={setEditingId}
                onDelete={handleDeleteComment}
                onToggleResolve={handleToggleResolve}
                onToggleReaction={handleToggleReaction}
                isEditing={editingId === comment.id}
                editText={editText}
                onEditTextChange={setEditText}
                onSaveEdit={() => handleUpdateComment(comment.id)}
                isReplying={replyTo === comment.id}
                replyText={replyText}
                onReplyTextChange={setReplyText}
                onSubmitReply={() => handleAddReply(comment.id)}
                onCancelReply={() => {
                  setReplyTo(null)
                  setReplyText('')
                }}
              />
            ))
        )}
      </div>
    </div>
  )
}

interface CommentItemProps {
  comment: Comment
  replies: Comment[]
  currentUser: CommentAuthor
  onReply: (commentId: string) => void
  onEdit: (commentId: string) => void
  onDelete: (commentId: string) => void
  onToggleResolve: (commentId: string, resolved: boolean) => void
  onToggleReaction: (commentId: string, emoji: string) => void
  isEditing: boolean
  editText: string
  onEditTextChange: (text: string) => void
  onSaveEdit: () => void
  isReplying: boolean
  replyText: string
  onReplyTextChange: (text: string) => void
  onSubmitReply: () => void
  onCancelReply: () => void
}

function CommentItem({
  comment,
  replies,
  currentUser,
  onReply,
  onEdit,
  onDelete,
  onToggleResolve,
  onToggleReaction,
  isEditing,
  editText,
  onEditTextChange,
  onSaveEdit,
  isReplying,
  replyText,
  onReplyTextChange,
  onSubmitReply,
  onCancelReply,
}: CommentItemProps) {
  const isOwner = comment.author.id === currentUser.id
  const canEdit = isOwner
  const canDelete = isOwner
  const canResolve = !isOwner

  return (
    <div className={`border rounded-lg p-4 ${comment.resolved ? 'opacity-60' : ''}`}>
      {/* Comment header */}
      <div className="flex items-start gap-3 mb-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
          style={{ backgroundColor: comment.author.avatar || '#3b82f6' }}
        >
          {comment.author.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{comment.author.name}</span>
            <span className="text-xs text-gray-500">
              {new Date(comment.timestamp).toLocaleString()}
            </span>

            {comment.editedAt && (
              <span className="text-xs text-gray-400">(edited)</span>
            )}

            {comment.resolved && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Resolved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Comment content */}
      {isEditing ? (
        <div className="mb-3">
          <Textarea
            value={editText}
            onChange={(e) => onEditTextChange(e.target.value)}
            rows={3}
            className="mb-2"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={onSaveEdit}>
              Save
            </Button>
            <button
              onClick={() => onEdit('')}
              className="px-3 py-1 text-sm hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-gray-800 mb-3 whitespace-pre-wrap">{comment.content}</div>
      )}

      {/* Reactions */}
      {comment.reactions.length > 0 && (
        <div className="flex gap-1 mb-3">
          {comment.reactions.map((reaction, idx) => (
            <button
              key={idx}
              onClick={() => onToggleReaction(comment.id, reaction.emoji)}
              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm flex items-center gap-1"
            >
              <span>{reaction.emoji}</span>
              <span>{reaction.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => onToggleReaction(comment.id, '👍')}
          className="px-2 py-1 hover:bg-gray-100 rounded"
        >
          👍
        </button>

        <button
          onClick={() => onToggleReaction(comment.id, '❤️')}
          className="px-2 py-1 hover:bg-gray-100 rounded"
        >
          ❤️
        </button>

        <button
          onClick={() => onToggleReaction(comment.id, '🎉')}
          className="px-2 py-1 hover:bg-gray-100 rounded"
        >
          🎉
        </button>

        <button
          onClick={() => onReply(comment.id)}
          className="px-2 py-1 hover:bg-gray-100 rounded"
        >
          Reply
        </button>

        {canEdit && (
          <button
            onClick={() => onEdit(comment.id)}
            className="px-2 py-1 hover:bg-gray-100 rounded"
          >
            Edit
          </button>
        )}

        {canResolve && !comment.resolved && (
          <button
            onClick={() => onToggleResolve(comment.id, comment.resolved)}
            className="px-2 py-1 hover:bg-green-100 rounded text-green-700"
          >
            Resolve
          </button>
        )}

        {canDelete && (
          <button
            onClick={() => onDelete(comment.id)}
            className="px-2 py-1 hover:bg-red-100 rounded text-red-700"
          >
            Delete
          </button>
        )}
      </div>

      {/* Reply form */}
      {isReplying && (
        <div className="mt-3 pt-3 border-t">
          <Textarea
            value={replyText}
            onChange={(e) => onReplyTextChange(e.target.value)}
            placeholder="Write a reply..."
            rows={2}
            className="mb-2"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={onSubmitReply}>
              Reply
            </Button>
            <button
              onClick={onCancelReply}
              className="px-3 py-1 text-sm hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-4 pt-4 border-t space-y-3">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={[]}
              currentUser={currentUser}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleResolve={onToggleResolve}
              onToggleReaction={onToggleReaction}
              isEditing={false}
              editText=""
              onEditTextChange={() => {}}
              onSaveEdit={() => {}}
              isReplying={false}
              replyText=""
              onReplyTextChange={() => {}}
              onSubmitReply={() => {}}
              onCancelReply={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  )
}
