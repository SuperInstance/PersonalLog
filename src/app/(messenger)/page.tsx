'use client'

/**
 * Messenger Main Page
 *
 * The main messenger interface with conversation list and chat area.
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Fixed useEffect dependency arrays
 * - Event handlers wrapped with useCallback
 * - Prevents unnecessary re-renders of child components
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ConversationList from '@/components/messenger/ConversationList'
import ChatArea from '@/components/messenger/ChatArea'
import AIContactsPanel from '@/components/ai-contacts/AIContactsPanel'
import { createConversation, listConversations } from '@/lib/storage/conversation-store'
import { initializeDefaultAgents } from '@/lib/storage/ai-contact-store'
import type { Conversation } from '@/types/conversation'

export default function MessengerPage() {
  const router = useRouter()
  const params = useParams()
  const currentConversationId = params.id as string | undefined

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Fixed: Added loadConversations and initializeDefaultAgents to dependencies
  // Wrapped in useCallback to maintain stable reference
  const loadConversations = useCallback(async () => {
    try {
      const convs = await listConversations({ includeArchived: false, limit: 50 })
      setConversations(convs)

      // If URL has conversation ID, load it
      if (currentConversationId) {
        const current = convs.find(c => c.id === currentConversationId)
        if (current) setSelectedConversation(current)
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }, [currentConversationId])

  useEffect(() => {
    loadConversations()
    initializeDefaultAgents()
  }, [loadConversations])

  // Fixed: Added loadConversation to dependencies
  const loadConversation = useCallback(async (id: string) => {
    try {
      // Refresh conversations to get latest
      const convs = await listConversations({ includeArchived: false, limit: 50 })
      setConversations(convs)

      const current = convs.find(c => c.id === id)
      if (current) {
        setSelectedConversation(current)
      }
    } catch (error) {
      console.error('Failed to load conversation:', error)
    }
  }, [])

  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId)
    }
  }, [currentConversationId, loadConversation])

  // Event handlers wrapped with useCallback for stable references
  const handleNewConversation = useCallback(async () => {
    try {
      const newConv = await createConversation('New Conversation', 'personal')
      setConversations(prev => [newConv, ...prev])
      setSelectedConversation(newConv)
      router.push(`/messenger/${newConv.id}`)
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  }, [router])

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation)
    router.push(`/messenger/${conversation.id}`)
  }, [router])

  const handleUpdateConversation = useCallback((updated: Conversation) => {
    setConversations(prev =>
      prev.map(c => c.id === updated.id ? updated : c)
    )
    if (selectedConversation?.id === updated.id) {
      setSelectedConversation(updated)
    }
  }, [selectedConversation?.id])

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        className={`flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-80'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            {!sidebarCollapsed && (
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                PersonalLog
              </h1>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-pressed={sidebarCollapsed}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg
                className={`w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform ${
                  sidebarCollapsed ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {!sidebarCollapsed && (
            <button
              onClick={handleNewConversation}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            onUpdateConversation={handleUpdateConversation}
            collapsed={sidebarCollapsed}
          />
        </div>

        {/* AI Contacts */}
        {!sidebarCollapsed && (
          <div className="border-t border-slate-200 dark:border-slate-800">
            <AIContactsPanel
              onAddAgentToConversation={(agent) => {
                if (selectedConversation) {
                  handleUpdateConversation({
                    ...selectedConversation,
                    aiContacts: [...selectedConversation.aiContacts, agent],
                  })
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatArea
          conversation={selectedConversation}
          onUpdateConversation={handleUpdateConversation}
          onNewConversation={handleNewConversation}
        />
      </div>
    </div>
  )
}
