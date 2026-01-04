/**
 * Collaboration Toolbar Component
 *
 * Toolbar for sharing, comments, and real-time collaboration.
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ShareDialog } from './ShareDialog'
import { CommentsPanel } from './CommentsPanel'
import { PresenceIndicator } from './PresenceIndicator'
import { CommentAuthor } from '@/lib/collaboration/types'
import { CollaborationClient } from '@/lib/collaboration/websocket'

interface CollaborationToolbarProps {
  resourceId: string
  resourceType: 'conversation' | 'knowledge' | 'message'
  resourceTitle?: string
  currentUser: CommentAuthor
  collaborationClient?: CollaborationClient
}

export function CollaborationToolbar({
  resourceId,
  resourceType,
  resourceTitle,
  currentUser,
  collaborationClient,
}: CollaborationToolbarProps) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2 p-2 bg-gray-50 border-b">
        {/* Share button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShareDialogOpen(true)}
          title="Share"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          Share
        </Button>

        {/* Comments button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCommentsOpen(!commentsOpen)}
          title="Comments"
          className={commentsOpen ? 'bg-gray-200' : ''}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
          Comments
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Presence indicator */}
        {collaborationClient && (
          <PresenceIndicator
            resourceId={resourceId}
            client={collaborationClient}
            currentUserId={currentUser.id}
          />
        )}
      </div>

      {/* Share dialog */}
      <ShareDialog
        isOpen={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        resourceId={resourceId}
        resourceType={resourceType}
        resourceTitle={resourceTitle}
      />

      {/* Comments panel (as drawer) */}
      {commentsOpen && (
        <div className="fixed right-0 top-0 h-full w-96 shadow-xl z-50">
          <CommentsPanel
            resourceId={resourceId}
            resourceType={resourceType}
            currentUser={currentUser}
            isOpen={commentsOpen}
            onClose={() => setCommentsOpen(false)}
          />
        </div>
      )}
    </>
  )
}

/**
 * Message-level collaboration controls
 */

interface MessageCollaborationProps {
  messageId: string
  conversationId: string
  onAddComment?: () => void
  onViewComments?: () => void
  commentCount?: number
}

export function MessageCollaboration({
  messageId,
  conversationId,
  onAddComment,
  onViewComments,
  commentCount = 0,
}: MessageCollaborationProps) {
  return (
    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Add comment button */}
      <button
        onClick={onAddComment}
        className="p-1 hover:bg-gray-100 rounded"
        title="Add comment"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
      </button>

      {/* View comments button */}
      {commentCount > 0 && (
        <button
          onClick={onViewComments}
          className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded text-sm text-gray-600"
          title="View comments"
        >
          <span>{commentCount}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
        </button>
      )}

      {/* Highlight button */}
      <button
        className="p-1 hover:bg-gray-100 rounded"
        title="Highlight text"
        onClick={() => {
          // Trigger highlight mode
          document.body.style.cursor = 'text'
        }}
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
      </button>
    </div>
  )
}

/**
 * Share button for quick sharing
 */

interface QuickShareButtonProps {
  resourceId: string
  resourceType: 'conversation' | 'knowledge' | 'message'
  onShared?: (shareUrl: string) => void
}

export function QuickShareButton({ resourceId, resourceType, onShared }: QuickShareButtonProps) {
  const [loading, setLoading] = useState(false)
  const [shared, setShared] = useState(false)

  const handleQuickShare = async () => {
    setLoading(true)
    try {
      const { createShareLink, generateShareUrl } = await import('@/lib/collaboration/sharing')

      const share = await createShareLink(resourceId, resourceType, 'private', {
        permissions: {
          canView: true,
          canEdit: false,
          canComment: true,
          canShare: false,
          canDownload: false,
          canDelete: false,
        },
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      })

      const url = generateShareUrl(share.shareId)
      await navigator.clipboard.writeText(url)

      setShared(true)
      setTimeout(() => setShared(false), 2000)

      onShared?.(url)
    } catch (error) {
      console.error('Failed to create quick share:', error)
      alert('Failed to create share link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleQuickShare}
      disabled={loading}
      title="Copy share link"
    >
      {loading ? (
        'Creating...'
      ) : shared ? (
        '✓ Copied!'
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          Quick Share
        </>
      )}
    </Button>
  )
}
