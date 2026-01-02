'use client'

/**
 * CompactionDialog Component
 *
 * Dialog for compacting long conversations.
 */

import { useState } from 'react'
import { X, Compress, Archive, Sparkles, CheckCircle2 } from 'lucide-react'
import type { Conversation, CompactStrategy, Message } from '@/types/conversation'

interface CompactionDialogProps {
  isOpen: boolean
  onClose: () => void
  conversation: Conversation
  onCompact: (strategy: CompactStrategy, prioritizeIds: string[], instructions?: string) => Promise<void>
  tokenCount: number
  tokenLimit: number
}

export default function CompactionDialog({
  isOpen,
  onClose,
  conversation,
  onCompact,
  tokenCount,
  tokenLimit,
}: CompactionDialogProps) {
  const [strategy, setStrategy] = useState<CompactStrategy>('summarize')
  const [prioritizeIds, setPrioritizeIds] = useState<Set<string>>(new Set())
  const [instructions, setInstructions] = useState('')
  const [startNewConversation, setStartNewConversation] = useState(true)
  const [isCompacting, setIsCompacting] = useState(false)

  if (!isOpen) return null

  const messages = conversation.messages
  const tokenPercentage = Math.round((tokenCount / tokenLimit) * 100)
  const isNearLimit = tokenPercentage >= 80

  const handleToggleMessage = (messageId: string) => {
    const newSet = new Set(prioritizeIds)
    if (newSet.has(messageId)) {
      newSet.delete(messageId)
    } else {
      newSet.add(messageId)
    }
    setPrioritizeIds(newSet)
  }

  const handleCompact = async () => {
    setIsCompacting(true)
    try {
      await onCompact(strategy, Array.from(prioritizeIds), instructions)
      onClose()
    } catch (error) {
      console.error('Compaction failed:', error)
    } finally {
      setIsCompacting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isNearLimit
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
            }`}>
              {isNearLimit ? <Archive className="w-5 h-5" /> : <Compress className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {isNearLimit ? 'Conversation is getting long' : 'Compact conversation'}
              </h3>
              <p className="text-sm text-slate-500">
                {tokenCount.toLocaleString()} / {tokenLimit.toLocaleString()} tokens ({tokenPercentage}%)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Warning */}
          {isNearLimit && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Your conversation is approaching the context limit. Compacting now will preserve important
                content while making room for new messages.
              </p>
            </div>
          )}

          {/* Strategy Selection */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Compaction Strategy
            </h4>
            <div className="space-y-2">
              <StrategyButton
                selected={strategy === 'summarize'}
                onClick={() => setStrategy('summarize')}
                icon={<Sparkles className="w-4 h-4" />}
                title="Summarize"
                description="AI creates a summary of the conversation"
              />
              <StrategyButton
                selected={strategy === 'extract-key'}
                onClick={() => setStrategy('extract-key')}
                icon={<CheckCircle2 className="w-4 h-4" />}
                title="Extract Key Points"
                description="Keep important messages verbatim, summarize the rest"
              />
              <StrategyButton
                selected={strategy === 'user-directed'}
                onClick={() => setStrategy('user-directed')}
                icon={<Compress className="w-4 h-4" />}
                title="Custom Instructions"
                description="You specify what to prioritize and what to summarize"
              />
            </div>
          </div>

          {/* Custom Instructions */}
          {strategy === 'user-directed' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Custom Instructions
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g., 'Keep all messages about project planning, summarize the rest'..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Prioritize Messages */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Messages to Preserve
              </h4>
              <span className="text-xs text-slate-500">
                {prioritizeIds.size} selected
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              {messages.slice(-10).map(message => {
                const isSelected = prioritizeIds.has(message.id)
                const isUser = message.author === 'user'

                return (
                  <button
                    key={message.id}
                    onClick={() => handleToggleMessage(message.id)}
                    className={`w-full flex items-start gap-2 p-2 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500">
                        {isUser ? 'You' : 'AI'} • {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                        {message.content.text || message.content.systemNote || '(media)'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Selected messages will be kept in full detail
            </p>
          </div>

          {/* New Conversation Option */}
          <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={startNewConversation}
                onChange={(e) => setStartNewConversation(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Start new conversation with compact version
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Original conversation will be archived, and a new one will be created with the summary
                  for continued discussion.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            disabled={isCompacting}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCompact}
            disabled={isCompacting}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCompacting ? (
              'Compacting...'
            ) : (
              <>
                <Compress className="w-4 h-4" />
                Compact
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function StrategyButton({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
      }`}
    >
      <div className={`p-2 rounded-lg ${selected ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
        {icon}
      </div>
      <div>
        <h5 className="font-medium text-slate-900 dark:text-slate-100">{title}</h5>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </button>
  )
}
