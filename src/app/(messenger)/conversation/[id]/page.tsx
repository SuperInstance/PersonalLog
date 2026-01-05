'use client'

/**
 * Conversation Page
 *
 * Displays a specific conversation in the messenger view.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ConversationList from '@/components/messenger/ConversationList'
import ChatArea from '@/components/messenger/ChatArea'
import AIContactsPanel from '@/components/ai-contacts/AIContactsPanel'
import { getConversation, listConversations } from '@/lib/storage/conversation-store'
import type { Conversation } from '@/types/conversation'

export default function ConversationPage() {
  const router = useRouter()
  const params = useParams()
  const conversationId = params.id as string

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)

  const loadConversation = useCallback(async () => {
    try {
      const conv = await getConversation(conversationId)
      if (conv) {
        setSelectedConversation(conv)
      } else {
        // Conversation not found, redirect to messenger home
        router.push('/messenger')
      }
    } catch (error) {
      console.error('Failed to load conversation:', error)
      router.push('/messenger')
    } finally {
      setLoading(false)
    }
  }, [conversationId, router])

  const loadConversations = useCallback(async () => {
    try {
      const convs = await listConversations({ includeArchived: false, limit: 50 })
      setConversations(convs)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }, [])

  useEffect(() => {
    loadConversation()
    loadConversations()
  }, [conversationId, loadConversation, loadConversations])

  const handleNewConversation = async () => {
    const { createConversation } = await import('@/lib/storage/conversation-store')
    const newConv = await createConversation('New Conversation', 'personal')
    setConversations(prev => [newConv, ...prev])
    setSelectedConversation(newConv)
    router.push(`/messenger/${newConv.id}`)
  }

  const handleUpdateConversation = (updated: Conversation) => {
    setConversations(prev =>
      prev.map(c => c.id === updated.id ? updated : c)
    )
    if (selectedConversation?.id === updated.id) {
      setSelectedConversation(updated)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-slate-500">Loading conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Back button for mobile */}
      <Link
        href="/messenger"
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-900 rounded-full shadow-lg"
      >
        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
      </Link>

      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-80 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <Link
            href="/messenger"
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">All Conversations</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={(conv) => router.push(`/messenger/${conv.id}`)}
            onUpdateConversation={handleUpdateConversation}
          />
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800">
          <AIContactsPanel />
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1">
        <ChatArea
          conversation={selectedConversation}
          onUpdateConversation={handleUpdateConversation}
          onNewConversation={handleNewConversation}
        />
      </div>
    </div>
  )
}
