'use client'

/**
 * NewChatDialog Component
 *
 * Modal for creating a new chat from selected messages.
 */

import { useState } from 'react'
import { X, Sparkles, MessageSquare, Bot } from 'lucide-react'
import type { Message, Conversation } from '@/types/conversation'
import { createConversation } from '@/lib/storage/conversation-store'
import { listAgents } from '@/lib/storage/ai-contact-store'

interface NewChatDialogProps {
  selectedMessages: Message[]
  originalConversation: Conversation
  onClose: () => void
  onNewChatCreated: (newConversationId: string) => void
}

export default function NewChatDialog({
  selectedMessages,
  originalConversation,
  onClose,
  onNewChatCreated,
}: NewChatDialogProps) {
  const [option, setOption] = useState<'reply' | 'new-chat'>('reply')
  const [includeAI, setIncludeAI] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [availableAgents, setAvailableAgents] = useState<any[]>([])
  const [isCreating, setIsCreating] = useState(false)

  useState(() => {
    // Load available AI agents
    listAgents().then(agents => setAvailableAgents(agents))
  })

  const handleCreate = async () => {
    setIsCreating(true)

    try {
      if (option === 'reply' && includeAI && selectedAgentId) {
        // Add AI to existing conversation
        // This would be handled by the parent component
        onClose()
        return
      }

      // Create new conversation
      const newConv = await createConversation(
        `From: ${originalConversation.title}`,
        'ai-assisted'
      )

      // Copy selected messages to new conversation
      // This would require additional API calls

      onNewChatCreated(newConv.id)
    } catch (error) {
      console.error('Failed to create chat:', error)
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {selectedMessages.length} messages selected
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Options */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => setOption('reply')}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                option === 'reply'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <h4 className="font-medium text-slate-900 dark:text-slate-100">
                  Send to AI in this chat
                </h4>
                <p className="text-sm text-slate-500">
                  AI will see selected messages as context
                </p>
              </div>
            </button>

            <button
              onClick={() => setOption('new-chat')}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                option === 'new-chat'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <h4 className="font-medium text-slate-900 dark:text-slate-100">
                  Start new chat
                </h4>
                <p className="text-sm text-slate-500">
                  Create fresh conversation with these messages
                </p>
              </div>
            </button>
          </div>

          {/* AI Selection */}
          {option === 'new-chat' && (
            <div className="mb-6">
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={includeAI}
                  onChange={(e) => setIncludeAI(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Include AI in new chat
                </span>
              </label>

              {includeAI && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 mb-2">Select an AI contact:</p>
                  {availableAgents.map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        selectedAgentId === agent.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full ${agent.color} flex items-center justify-center text-white text-sm font-semibold`}>
                        {agent.name[0]}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {agent.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Context note */}
          {selectedMessages.length > 0 && (
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-4 py-3 mb-6">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                ℹ️ Non-selected messages will still be visible as context to the AI
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || (includeAI && !selectedAgentId)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCreating ? (
              'Creating...'
            ) : (
              <>
                {option === 'reply' ? 'Send to AI' : 'Create Chat'}
                <Bot className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
