/**
 * Presence Indicator Component
 *
 * Shows active users and their cursors in real-time.
 */

'use client'

import { useEffect, useState } from 'react'
import { UserPresence } from '@/lib/collaboration/types'
import { getPresenceManager } from '@/lib/collaboration/presence'
import { CollaborationClient } from '@/lib/collaboration/websocket'

interface PresenceIndicatorProps {
  resourceId: string
  client: CollaborationClient
  currentUserId: string
}

export function PresenceIndicator({ resourceId, client, currentUserId }: PresenceIndicatorProps) {
  const [presences, setPresences] = useState<UserPresence[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  useEffect(() => {
    const manager = getPresenceManager(
      currentUserId,
      'You', // In production, get from user profile
      client
    )

    // Subscribe to presence updates for this resource
    const unsubscribe = manager.onPresenceChange((allPresences) => {
      const resourcePresences = allPresences.filter(
        p => p.currentResource?.id === resourceId && p.userId !== currentUserId
      )
      setPresences(resourcePresences)

      const typing = resourcePresences
        .filter(p => p.status === 'typing')
        .map(p => p.userName)
      setTypingUsers(typing)
    })

    return () => {
      unsubscribe()
    }
  }, [resourceId, client, currentUserId])

  if (presences.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg">
      {/* Avatars */}
      <div className="flex -space-x-2">
        {presences.slice(0, 5).map((presence) => (
          <div
            key={presence.userId}
            className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium"
            style={{ backgroundColor: presence.color }}
            title={presence.userName}
          >
            {presence.userName.charAt(0).toUpperCase()}
          </div>
        ))}

        {presences.length > 5 && (
          <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs text-gray-600">
            +{presences.length - 5}
          </div>
        )}
      </div>

      {/* Status text */}
      <div className="text-sm text-gray-700">
        {typingUsers.length > 0 ? (
          <span className="text-gray-600">
            {typingUsers.slice(0, 2).join(', ')}
            {typingUsers.length > 2 && ` and ${typingUsers.length - 2} others`}
            {' '}typing...
          </span>
        ) : (
          <span>
            {presences.length === 1
              ? `${presences[0].userName} is viewing`
              : `${presences.length} people viewing`}
          </span>
        )}
      </div>
    </div>
  )
}

interface CursorOverlayProps {
  resourceId: string
  client: CollaborationClient
  currentUserId: string
}

export function CursorOverlay({ resourceId, client, currentUserId }: CursorOverlayProps) {
  const [cursors, setCursors] = useState<Map<string, { x: number; y: number; name: string; color: string }>>(new Map())

  useEffect(() => {
    const manager = getPresenceManager(currentUserId, 'You', client)

    // Subscribe to cursor updates
    const unsubscribe = client.onCursorUpdate((userId, cursor) => {
      if (userId !== currentUserId && cursor?.resourceId === resourceId) {
        setCursors(prev => {
          const next = new Map(prev)
          next.set(userId, {
            x: cursor.x || 0,
            y: cursor.y || 0,
            name: `User ${userId.slice(0, 4)}`, // In production, get actual name
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
          })

          // Remove cursor after 3 seconds of inactivity
          setTimeout(() => {
            setCursors(prev => {
              const next = new Map(prev)
              next.delete(userId)
              return next
            })
          }, 3000)

          return next
        })
      }
    })

    return () => {
      unsubscribe()
    }
  }, [resourceId, client, currentUserId])

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {Array.from(cursors.entries()).map(([userId, cursor]) => (
        <div
          key={userId}
          className="absolute transition-all duration-100 ease-out"
          style={{
            left: cursor.x,
            top: cursor.y,
          }}
        >
          {/* Cursor pointer */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            style={{ color: cursor.color }}
          >
            <path
              d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L5.89 2.86a.5.5 0 0 0-.39.35Z"
              fill="currentColor"
              stroke="white"
              strokeWidth="1"
            />
          </svg>

          {/* User label */}
          <div
            className="absolute top-6 left-1 px-2 py-0.5 text-xs text-white rounded whitespace-nowrap"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name}
          </div>
        </div>
      ))}
    </div>
  )
}

interface TypingIndicatorProps {
  resourceId: string
  client: CollaborationClient
  currentUserId: string
}

export function TypingIndicator({ resourceId, client, currentUserId }: TypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  useEffect(() => {
    const unsubscribe = client.onTypingIndicator((userId, resId, isTyping) => {
      if (resId === resourceId && userId !== currentUserId) {
        setTypingUsers(prev => {
          const next = isTyping
            ? [...prev.filter(id => id !== userId), userId]
            : prev.filter(id => id !== userId)

          // Auto-remove after 3 seconds
          if (isTyping) {
            setTimeout(() => {
              setTypingUsers(prev => prev.filter(id => id !== userId))
            }, 3000)
          }

          return next
        })
      }
    })

    return () => {
      unsubscribe()
    }
  }, [resourceId, client, currentUserId])

  if (typingUsers.length === 0) return null

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 px-3 py-1">
      <div className="flex gap-1">
        <span className="animate-bounce">●</span>
        <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
        <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
      </div>

      <span>
        {typingUsers.slice(0, 2).join(', ')}
        {typingUsers.length > 2 && ` and ${typingUsers.length - 2} others`}
        {' '}typing...
      </span>
    </div>
  )
}
