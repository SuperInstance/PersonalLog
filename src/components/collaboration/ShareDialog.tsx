/**
 * Share Dialog Component
 *
 * Modal dialog for creating and managing share links.
 */

'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import {
  createShareLink,
  listShareLinks,
  updateShareLink,
  revokeShareLink,
  deleteShareLink,
  generateShareUrl,
  getShareStatistics,
} from '@/lib/collaboration/sharing'
import { ShareLink, ShareVisibility } from '@/lib/collaboration/types'

interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
  resourceId: string
  resourceType: 'conversation' | 'knowledge' | 'message'
  resourceTitle?: string
}

export function ShareDialog({
  isOpen,
  onClose,
  resourceId,
  resourceType,
  resourceTitle,
}: ShareDialogProps) {
  const [shares, setShares] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // New share form state
  const [visibility, setVisibility] = useState<ShareVisibility>('private')
  const [password, setPassword] = useState('')
  const [canEdit, setCanEdit] = useState(false)
  const [canComment, setCanComment] = useState(true)
  const [expiresIn, setExpiresIn] = useState<number>(30) // days

  useEffect(() => {
    if (isOpen) {
      loadShares()
    }
  }, [isOpen, resourceId])

  const loadShares = async () => {
    setLoading(true)
    try {
      const shareLinks = await listShareLinks(resourceId)
      setShares(shareLinks)
    } catch (error) {
      console.error('Failed to load shares:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateShare = async () => {
    setLoading(true)
    try {
      const expiresAt = expiresIn > 0 ? Date.now() + expiresIn * 24 * 60 * 60 * 1000 : undefined

      const share = await createShareLink(
        resourceId,
        resourceType,
        visibility,
        {
          password: visibility === 'password-protected' ? password : undefined,
          permissions: {
            canView: true,
            canEdit,
            canComment,
            canShare: false,
            canDownload: visibility !== 'public',
            canDelete: false,
          },
          expiresAt,
        }
      )

      setShares([share, ...shares])
      setPassword('')
      setVisibility('private')
      setCanEdit(false)
      setCanComment(true)
      setExpiresIn(30)
    } catch (error) {
      console.error('Failed to create share:', error)
      alert('Failed to create share link')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async (share: ShareLink) => {
    const url = generateShareUrl(share.shareId)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(share.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleRevoke = async (shareId: string) => {
    if (!confirm('Are you sure you want to revoke this share link?')) return

    setLoading(true)
    try {
      await revokeShareLink(shareId)
      await loadShares()
    } catch (error) {
      console.error('Failed to revoke share:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (shareId: string) => {
    if (!confirm('Are you sure you want to permanently delete this share link?')) return

    setLoading(true)
    try {
      await deleteShareLink(shareId)
      await loadShares()
    } catch (error) {
      console.error('Failed to delete share:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${resourceTitle || 'Resource'}"`}>
      <div className="space-y-6">
        {/* Create new share */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Share Link</h3>

          <div className="space-y-4">
            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium mb-2">Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as ShareVisibility)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="private">Private (Invite Only)</option>
                <option value="password-protected">Password Protected</option>
                <option value="restricted">Restricted (Require Approval)</option>
                <option value="public">Public (Anyone with Link)</option>
              </select>
            </div>

            {/* Password */}
            {visibility === 'password-protected' && (
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
            )}

            {/* Permissions */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Permissions</label>

              <div className="flex items-center justify-between">
                <span className="text-sm">Can edit</span>
                <Switch checked={canEdit} onCheckedChange={setCanEdit} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Can comment</span>
                <Switch checked={canComment} onCheckedChange={setCanComment} />
              </div>
            </div>

            {/* Expiration */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Expires in (days, 0 = never)
              </label>
              <Input
                type="number"
                value={expiresIn}
                onChange={(e) => setExpiresIn(parseInt(e.target.value) || 0)}
                min={0}
                max={365}
              />
            </div>

            {/* Create button */}
            <Button onClick={handleCreateShare} disabled={loading} className="w-full">
              {loading ? 'Creating...' : 'Create Share Link'}
            </Button>
          </div>
        </div>

        {/* Existing shares */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Active Shares ({shares.length})</h3>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : shares.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No active shares</div>
          ) : (
            <div className="space-y-3">
              {shares.map((share) => (
                <ShareLinkItem
                  key={share.id}
                  share={share}
                  onCopy={handleCopyLink}
                  onRevoke={handleRevoke}
                  onDelete={handleDelete}
                  copied={copiedId === share.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

interface ShareLinkItemProps {
  share: ShareLink
  onCopy: (share: ShareLink) => void
  onRevoke: (shareId: string) => void
  onDelete: (shareId: string) => void
  copied: boolean
}

function ShareLinkItem({ share, onCopy, onRevoke, onDelete, copied }: ShareLinkItemProps) {
  const url = generateShareUrl(share.shareId)
  const isExpired = share.expiresAt && share.expiresAt < Date.now()

  return (
    <div className={`p-4 border rounded-lg ${isExpired ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{share.visibility}</span>
            {share.status === 'revoked' && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Revoked</span>
            )}
            {isExpired && (
              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">Expired</span>
            )}
          </div>

          <div className="text-sm text-gray-600 mt-1 truncate">{url}</div>

          <div className="text-xs text-gray-500 mt-1">
            {share.accessCount} views • Created {new Date(share.createdAt).toLocaleDateString()}
            {share.expiresAt && ` • Expires ${new Date(share.expiresAt).toLocaleDateString()}`}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onCopy(share)}
            className="p-2 hover:bg-gray-100 rounded"
            title={copied ? 'Copied!' : 'Copy link'}
          >
            {copied ? '✓' : '📋'}
          </button>

          {share.status === 'active' && (
            <button
              onClick={() => onRevoke(share.id)}
              className="p-2 hover:bg-gray-100 rounded"
              title="Revoke"
            >
              🚫
            </button>
          )}

          <button
            onClick={() => onDelete(share.id)}
            className="p-2 hover:bg-red-100 rounded"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Permissions summary */}
      <div className="flex gap-2 text-xs">
        {share.permissions.canView && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">View</span>}
        {share.permissions.canEdit && <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Edit</span>}
        {share.permissions.canComment && <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">Comment</span>}
        {share.permissions.canDownload && <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">Download</span>}
      </div>
    </div>
  )
}
