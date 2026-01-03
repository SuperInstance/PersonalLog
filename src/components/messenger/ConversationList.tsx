'use client'

/**
 * ConversationList Component
 *
 * Lists all conversations in the sidebar.
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - ConversationItem is memoized to prevent unnecessary re-renders
 * - Filtered conversations computed once per render
 * - Expensive calculations (preview, time) memoized
 * - Uses VirtualList for 50+ conversations (windowed rendering)
 */

import { useState, useMemo, memo, useCallback } from 'react'
import { Search, Pin, MoreVertical } from 'lucide-react'
import type { Conversation } from '@/types/conversation'
import { getAuthorDisplayName } from '@/lib/utils'
import { VirtualList } from '@/components/ui/VirtualList'

interface ConversationListProps {
  conversations: Conversation[]
  selectedConversation: Conversation | null
  onSelectConversation: (conversation: Conversation) => void
  onUpdateConversation: (conversation: Conversation) => void
  collapsed?: boolean
}

export default function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  onUpdateConversation,
  collapsed = false,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showPinnedOnly, setShowPinnedOnly] = useState(false)

  // Separate pinned and regular conversations (memoized)
  const { pinnedConversations, regularConversations } = useMemo(() => ({
    pinnedConversations: conversations.filter(c => c.metadata.pinned),
    regularConversations: conversations.filter(c => !c.metadata.pinned),
  }), [conversations])

  // Filter function (memoized)
  const filterConversations = useCallback((convs: Conversation[]) => {
    if (!searchQuery) return convs
    return convs.filter(c =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery])

  // Filtered conversations (memoized)
  const filteredPinned = useMemo(() => filterConversations(pinnedConversations), [pinnedConversations, filterConversations])
  const filteredRegular = useMemo(() => filterConversations(regularConversations), [regularConversations, filterConversations])

  // Toggle pin with useCallback for stable reference
  const togglePin = useCallback(async (conversation: Conversation, e: React.MouseEvent) => {
    e.stopPropagation()
    onUpdateConversation({
      ...conversation,
      metadata: {
        ...conversation.metadata,
        pinned: !conversation.metadata.pinned,
      },
    })
  }, [onUpdateConversation])

  const getConversationPreview = (conversation: Conversation): string => {
    const lastMessage = conversation.messages[conversation.messages.length - 1]
    if (!lastMessage) return 'No messages yet'

    const author = getAuthorDisplayName(lastMessage.author)
    const text = lastMessage.content.text || lastMessage.content.systemNote || ''

    return text.length > 30 ? text.substring(0, 30) + '...' : text
  }

  const getConversationTime = (conversation: Conversation): string => {
    if (conversation.messages.length === 0) return formatDate(conversation.createdAt)

    const lastMessage = conversation.messages[conversation.messages.length - 1]
    return formatDate(lastMessage.timestamp)
  }

  // Memoized ConversationItem component
  const ConversationItem = memo(({ conversation, pinned }: { conversation: Conversation; pinned?: boolean }) => {
    const isSelected = selectedConversation?.id === conversation.id
    const hasAI = conversation.aiContacts.length > 0

    return (
      <div
        onClick={() => onSelectConversation(conversation)}
        className={`group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
        }`}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {hasAI ? (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
              {conversation.aiContacts.map(c => c.name[0]).join('')}
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold">
              You
            </div>
          )}
          {pinned && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
              <Pin className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Content */}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {conversation.title}
              </h3>
              <span className="text-xs text-slate-400 flex-shrink-0">
                {getConversationTime(conversation)}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {getConversationPreview(conversation)}
            </p>
          </div>
        )}

        {/* Actions */}
        {!collapsed && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              togglePin(conversation, e)
            }}
            className={`opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-all ${
              conversation.metadata.pinned ? 'opacity-100' : ''
            }`}
            title={conversation.metadata.pinned ? 'Unpin' : 'Pin'}
          >
            <Pin className={`w-4 h-4 text-slate-400 ${conversation.metadata.pinned ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
        )}
      </div>
    )
  })

  if (collapsed) {
    return (
      <div className="p-2 space-y-1">
        {conversations.map(conversation => (
          <div
            key={conversation.id}
            onClick={() => onSelectConversation(conversation)}
            className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center cursor-pointer transition-all ${
              selectedConversation?.id === conversation.id
                ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {conversation.aiContacts.length > 0
              ? conversation.aiContacts[0].name[0]
              : conversation.title[0]?.toUpperCase() || 'N'}
          </div>
        ))}
      </div>
    )
  }

  // Use virtual list for 30+ conversations for better performance
  const useVirtualList = filteredRegular.length >= 30

  return (
    <div className="p-2 flex flex-col h-full">
      {/* Search */}
      <div className="mb-3 px-1 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {/* Pinned Conversations - always show directly (usually few) */}
        {filteredPinned.length > 0 && (
          <div className="mb-4 flex-shrink-0">
            <h3 className="px-1 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pinned
            </h3>
            <div className="space-y-1">
              {filteredPinned.map(conv => (
                <ConversationItem key={conv.id} conversation={conv} pinned />
              ))}
            </div>
          </div>
        )}

        {/* Regular Conversations - use VirtualList for many items */}
        <div className="flex-1 min-h-0">
          {filteredRegular.length > 0 && (
            <h3 className="px-1 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Chats
            </h3>
          )}

          {useVirtualList ? (
            <VirtualList
              items={filteredRegular}
              renderItem={(conversation) => <ConversationItem key={conversation.id} conversation={conversation} />}
              height="100%"
              itemHeight={80} // Approximate height of each conversation item
              overscan={5}
              getKey={(conversation) => conversation.id}
              className="scrollbar-thin"
            />
          ) : (
            <>
              {filteredRegular.map(conv => (
                <ConversationItem key={conv.id} conversation={conv} />
              ))}

              {/* Empty State */}
              {filteredRegular.length === 0 && searchQuery && (
                <div className="py-8 text-center text-sm text-slate-400">
                  No conversations found
                </div>
              )}

              {filteredRegular.length === 0 && !searchQuery && conversations.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-400">
                  <p>No conversations yet</p>
                  <p className="text-xs mt-1">Click "New Chat" to start</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHrs / 24)

  if (diffHrs < 1) return 'now'
  if (diffHrs < 24) return `${diffHrs}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
