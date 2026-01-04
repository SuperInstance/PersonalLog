'use client'

/**
 * MessageBubble Component
 *
 * Displays a single message with selection support.
 *
 * PERFORMANCE OPTIMIZATION:
 * - Wrapped with React.memo to prevent unnecessary re-renders
 * - Custom comparison function checks only message.id and isSelected
 * - This is critical for long conversations where parent updates frequently
 * - Prevents all messages from re-rendering when selection changes
 */

import { Check, CheckCheck, Reply } from 'lucide-react'
import type { Message, AIAgent } from '@/types/conversation'
import { getAuthorDisplayName, getAuthorColor } from '@/lib/utils'
import { memo } from 'react'

interface MessageBubbleProps {
  message: Message
  isSelected: boolean
  onSelect: () => void
  aiContacts: AIAgent[]
}

function MessageBubble({
  message,
  isSelected,
  onSelect,
  aiContacts,
}: MessageBubbleProps) {
  const isUser = message.author === 'user'
  const isAI = !isUser && typeof message.author === 'object' && message.author.type === 'ai-contact'

  // Find AI contact if this is an AI message
  const aiContact = isAI
    ? aiContacts.find(c => c.id === (message.author as { type: 'ai-contact'; contactId: string; contactName: string }).contactId)
    : null

  const authorName = getAuthorDisplayName(message.author)
  const authorColor = aiContact?.color || getAuthorColor(message.author)

  const isSystem = message.type === 'system'

  return (
    <div className={`group ${isSystem ? 'mx-auto max-w-md' : ''} animate-fade-in`}>
      <div
        onClick={onSelect}
        className={`relative transition-all duration-200 transform hover:scale-[1.01] ${
          isSelected
            ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-950 rounded-2xl shadow-md'
            : ''
        } ${!isSystem ? 'cursor-pointer' : ''}`}
        role={isSystem ? 'status' : 'article'}
        aria-label={isSystem ? 'System message' : `${authorName}: ${message.content.text?.substring(0, 100) || 'Media attachment'}`}
        aria-selected={isSelected}
        tabIndex={!isSystem ? 0 : undefined}
        onKeyDown={(e) => {
          if (!isSystem && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onSelect()
          }
        }}
      >
        {isSystem ? (
          // System message
          <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
            {message.content.systemNote || message.content.text}
          </div>
        ) : isUser ? (
          // User message
          <div className="flex justify-end">
            <div className="max-w-[80%]">
              <div className="bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-2">
                {message.content.text && (
                  <p className="whitespace-pre-wrap">{message.content.text}</p>
                )}
                {message.content.media && (
                  <div className="mt-2">
                    {message.content.media.type === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={message.content.media.url}
                        alt={message.content.media.name || 'Image attachment'}
                        className="rounded-lg max-w-full"
                      />
                    ) : (
                      <div className="flex items-center gap-2 bg-blue-600 rounded-lg px-3 py-2">
                        <span aria-hidden="true">📎</span>
                        <span className="text-sm">{message.content.media.name}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-1 mt-1 px-1">
                <span className="text-xs text-slate-400" aria-label={`Sent ${formatRelativeTime(message.timestamp)}`}>
                  {formatRelativeTime(message.timestamp)}
                </span>
                <CheckCheck className="w-3.5 h-3.5 text-blue-500" aria-label="Message sent" />
              </div>
            </div>
          </div>
        ) : (
          // AI message
          <div className="flex justify-start">
            <div className="flex items-end gap-2 max-w-[80%]">
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full ${authorColor} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}
                aria-hidden="true"
              >
                {aiContact?.name ? aiContact.name[0] : authorName[0]}
              </div>

              {/* Message */}
              <div>
                <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl rounded-bl-md px-4 py-2">
                  {message.content.text && (
                    <p className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                      {message.content.text}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className="text-xs text-slate-400" aria-label={`Received ${formatRelativeTime(message.timestamp)}`}>
                    {formatRelativeTime(message.timestamp)}
                  </span>
                  {message.metadata.model && (
                    <span className="text-xs text-slate-500" aria-label={`Generated by ${message.metadata.model}`}>
                      {message.metadata.model}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center" aria-label="Message selected">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    </div>
  )
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`

  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h`

  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Memoized MessageBubble with custom comparison
 *
 * Only re-renders when:
 * - message.id changes (content update)
 * - isSelected changes (selection state)
 * - onSelect function reference changes (rare)
 * - aiContacts array reference changes (rare)
 */
export default memo(MessageBubble, (prevProps, nextProps) => {
  // Custom comparison: only re-render if critical props change
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.aiContacts === nextProps.aiContacts
  )
})
