'use client'

/**
 * ChatArea Component
 *
 * Main chat interface with message display, selection, and input.
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Fixed useEffect dependency arrays
 * - Expensive message filtering memoized
 * - Event handlers wrapped with useCallback
 * - Prevents unnecessary re-renders of MessageBubble children
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send,
  Paperclip,
  Mic,
  MoreVertical,
  Settings,
  Expand,
  MessageSquare,
  Sparkles,
  Loader2,
} from 'lucide-react'
import MessageBubble from './MessageBubble'
import MessageSelectionBar from './MessageSelectionBar'
import NewChatDialog from './NewChatDialog'
import type { Conversation, Message } from '@/types/conversation'
import { addMessage, getMessages, clearSelection, setMessageSelection } from '@/lib/storage/conversation-store'
import { getAuthorDisplayName, getAuthorColor } from '@/lib/utils'

interface ChatAreaProps {
  conversation: Conversation | null
  onUpdateConversation: (conversation: Conversation) => void
  onNewConversation: () => void
}

export default function ChatArea({
  conversation,
  onUpdateConversation,
  onNewConversation,
}: ChatAreaProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set())
  const [showNewChatDialog, setShowNewChatDialog] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [sendingMessageIds, setSendingMessageIds] = useState<Set<string>>(new Set())
  const [failedMessageIds, setFailedMessageIds] = useState<Set<string>>(new Set())

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Fixed: Wrapped loadMessages in useCallback and added to dependencies
  const loadMessages = useCallback(async () => {
    if (!conversation) return

    try {
      const msgs = await getMessages(conversation.id)
      setMessages(msgs)
      // Also update conversation with messages
      onUpdateConversation({ ...conversation, messages: msgs })
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }, [conversation, onUpdateConversation])

  // Load messages when conversation changes
  useEffect(() => {
    if (conversation) {
      loadMessages()
    } else {
      setMessages([])
    }
  }, [conversation?.id, loadMessages])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = useCallback(async () => {
    if (!conversation || !inputText.trim()) return

    const messageText = inputText.trim()
    const tempId = `temp-${Date.now()}`

    // Optimistic: Add message immediately to UI
    const optimisticMessage: Message = {
      id: tempId,
      conversationId: conversation.id,
      type: 'text',
      author: 'user',
      content: { text: messageText },
      timestamp: new Date().toISOString(),
      metadata: {},
    }

    setMessages(prev => [...prev, optimisticMessage])
    setInputText('')
    setSendingMessageIds(prev => new Set(prev).add(tempId))

    try {
      // Send to backend in background
      const realMessage = await addMessage(
        conversation.id,
        'text',
        'user',
        { text: messageText }
      )

      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg =>
        msg.id === tempId ? realMessage : msg
      ))

      setSendingMessageIds(prev => {
        const next = new Set(prev)
        next.delete(tempId)
        return next
      })

      // Update conversation
      onUpdateConversation({
        ...conversation,
        messages: [...messages, realMessage],
        updatedAt: realMessage.timestamp,
      })

      // Clear selection
      if (selectedMessageIds.size > 0) {
        await clearSelection(conversation.id)
        setSelectedMessageIds(new Set())
      }
    } catch (error) {
      console.error('Failed to send message:', error)

      // Mark as failed
      setFailedMessageIds(prev => new Set(prev).add(tempId))
      setSendingMessageIds(prev => {
        const next = new Set(prev)
        next.delete(tempId)
        return next
      })

      // Keep failed message in UI with retry option
      // User can click retry to attempt sending again
    }
  }, [conversation, inputText, messages, selectedMessageIds.size, onUpdateConversation])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  const handleSelectMessage = useCallback((messageId: string) => {
    setSelectedMessageIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }, [])

  const handleClearSelection = useCallback(async () => {
    if (!conversation) return
    await clearSelection(conversation.id)
    setSelectedMessageIds(new Set())
  }, [conversation])

  const handleSendToAI = useCallback(() => {
    setShowNewChatDialog(true)
  }, [])

  const handleOpenLongForm = useCallback(() => {
    if (!conversation) return
    router.push(`/longform/${conversation.id}`)
  }, [conversation, router])

  // Expensive: filtering selected messages (memoized)
  const selectedMessages = useMemo(() =>
    messages.filter(m => selectedMessageIds.has(m.id)),
    [messages, selectedMessageIds]
  )

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Welcome to PersonalLog
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Select a conversation or start a new one
          </p>
          <button
            onClick={onNewConversation}
            className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
          >
            New Conversation
          </button>
        </div>
      </div>
    )
  }

  const hasAI = conversation.aiContacts.length > 0

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-semibold border-2 border-white dark:border-slate-950">
              You
            </div>
            {hasAI && conversation.aiContacts.map(agent => (
              <div
                key={agent.id}
                className={`w-10 h-10 rounded-full ${agent.color || 'bg-purple-500'} flex items-center justify-center text-white text-sm font-semibold border-2 border-white dark:border-slate-950`}
              >
                {agent.name[0]}
              </div>
            ))}
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              {conversation.title}
            </h2>
            <p className="text-xs text-slate-500">
              {messages.length} messages • {conversation.type}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          <button
            onClick={handleOpenLongForm}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Open in Long-Form mode"
            title="Open in Long-Form mode"
          >
            <Expand className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>

          {/* Settings */}
          <button
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Conversation settings"
            title="Conversation settings"
          >
            <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>

          {/* More */}
          <button
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="More options"
          >
            <MoreVertical className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">
                Start a conversation by sending a message
              </p>
              {hasAI && (
                <p className="text-sm text-slate-400 mt-1">
                  {conversation.aiContacts.map(a => a.name).join(', ')} is here to help
                </p>
              )}
            </div>
          ) : (
            messages.map(message => {
              const isSending = sendingMessageIds.has(message.id)
              const isFailed = failedMessageIds.has(message.id)

              return (
                <div key={message.id} className="relative">
                  <MessageBubble
                    message={message}
                    isSelected={selectedMessageIds.has(message.id)}
                    onSelect={() => handleSelectMessage(message.id)}
                    aiContacts={conversation.aiContacts}
                  />
                  {isSending && (
                    <div className="absolute top-2 right-2">
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    </div>
                  )}
                  {isFailed && (
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                      <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                        Failed to send
                      </span>
                      <button
                        onClick={() => {
                          // Retry sending this message
                          setFailedMessageIds(prev => {
                            const next = new Set(prev)
                            next.delete(message.id)
                            return next
                          })
                          setInputText(message.content.text || '')
                          setMessages(prev => prev.filter(m => m.id !== message.id))
                        }}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Selection Bar */}
      {selectedMessages.length > 0 && (
        <MessageSelectionBar
          selectedCount={selectedMessages.length}
          onClear={handleClearSelection}
          onSendToAI={handleSendToAI}
          hasAI={hasAI}
        />
      )}

      {/* Input Area */}
      <div className="px-4 pb-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-slate-100 dark:bg-slate-900 rounded-2xl p-3">
            {/* Attach Button */}
            <button
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Attach file"
            >
              <Paperclip className="w-5 h-5 text-slate-500" />
            </button>

            {/* Text Input */}
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={hasAI ? `Message to ${conversation.aiContacts[0].name}...` : 'Note to self...'}
              rows={1}
              className="flex-1 bg-transparent resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none max-h-32"
              style={{ minHeight: '24px' }}
            />

            {/* Voice Record Button */}
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`p-2 rounded-xl transition-colors ${
                isRecording
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500'
              }`}
              aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
              aria-pressed={isRecording}
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl transition-colors disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* AI Hint */}
          {hasAI && (
            <div className="mt-2 text-center">
              <p className="text-xs text-slate-400">
                💬 Brief mode • Click{' '}
                <button onClick={handleOpenLongForm} className="text-blue-500 hover:underline">
                  expand
                </button>{' '}
                for longer responses
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Dialog */}
      {showNewChatDialog && (
        <NewChatDialog
          selectedMessages={selectedMessages}
          originalConversation={conversation}
          onClose={() => setShowNewChatDialog(false)}
          onNewChatCreated={(newId) => {
            setShowNewChatDialog(false)
            router.push(`/messenger/${newId}`)
          }}
        />
      )}
    </div>
  )
}
