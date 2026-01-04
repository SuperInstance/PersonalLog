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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {selectedMessages.length} messages selected
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              What would you like to do?
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            aria-label="Close dialog"
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
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] ${
                option === 'reply'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center shadow-sm">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left flex-1">
                <h4 className="font-medium text-slate-900 dark:text-slate-100">
                  Send to AI in this chat
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  AI will see selected messages as context
                </p>
              </div>
              {option === 'reply' && (
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </button>

            <button
              onClick={() => setOption('new-chat')}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] ${
                option === 'new-chat'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left flex-1">
                <h4 className="font-medium text-slate-900 dark:text-slate-100">
                  Start new chat
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Create fresh conversation with these messages
                </p>
              </div>
              {option === 'new-chat' && (
                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </button>
          </div>

          {/* AI Selection */}
          {option === 'new-chat' && (
            <div className="mb-6 animate-slide-in-bottom">
              <label className="flex items-center gap-3 mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={includeAI}
                  onChange={(e) => setIncludeAI(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-blue-500 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Include AI in new chat
                </span>
              </label>

              {includeAI && (
                <div className="space-y-2 pl-4 animate-fade-in">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">Select an AI contact:</p>
                  {availableAgents.map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] ${
                        selectedAgentId === agent.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full ${agent.color} flex items-center justify-center text-white text-sm font-semibold shadow-sm`}>
                        {agent.name[0]}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100 flex-1 text-left">
                        {agent.name}
                      </span>
                      {selectedAgentId === agent.id && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Context note */}
          {selectedMessages.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl px-4 py-3 mb-6 border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">ℹ️</span>
                <span>Non-selected messages will still be visible as context to the AI</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || (includeAI && !selectedAgentId)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none flex items-center gap-2 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
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
