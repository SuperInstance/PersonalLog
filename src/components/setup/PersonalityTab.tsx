'use client'

/**
 * Personality Tab
 *
 * Edit the system prompt and learn from conversations.
 */

import { RotateCcw } from 'lucide-react'

interface PersonalityTabProps {
  personalityPrompt: string
  onPromptChange: (prompt: string) => void
  conversationId: string
  onConversationIdChange: (id: string) => void
  onProcessConversation: () => void
  onHasChanges: () => void
}

export function PersonalityTab({
  personalityPrompt,
  onPromptChange,
  conversationId,
  onConversationIdChange,
  onProcessConversation,
  onHasChanges,
}: PersonalityTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
          System Prompt
        </h3>
        <textarea
          value={personalityPrompt}
          onChange={(e) => {
            onPromptChange(e.target.value)
            onHasChanges()
          }}
          rows={8}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="You are a helpful AI assistant..."
        />
      </div>

      {/* Learn from conversation */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Learn from Conversation
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Analyze an existing conversation to extract personality patterns and communication style.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={conversationId}
            onChange={(e) => onConversationIdChange(e.target.value)}
            placeholder="Conversation ID..."
            className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
          />
          <button
            onClick={onProcessConversation}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            Process
          </button>
        </div>
      </div>
    </div>
  )
}
