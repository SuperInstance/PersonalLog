'use client'

/**
 * MessageSelectionBar Component
 *
 * Toolbar that appears when messages are selected.
 */

import { X, Sparkles, Copy, Forward } from 'lucide-react'

interface MessageSelectionBarProps {
  selectedCount: number
  onClear: () => void
  onSendToAI: () => void
  hasAI: boolean
}

export default function MessageSelectionBar({
  selectedCount,
  onClear,
  onSendToAI,
  hasAI,
}: MessageSelectionBarProps) {
  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-4">
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-4 border-r border-slate-700">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold">{selectedCount}</span>
          </div>
          <span className="text-sm">selected</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Send to AI in this chat */}
          {hasAI && (
            <button
              onClick={onSendToAI}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 rounded-xl transition-colors"
              title="Send to AI in this conversation"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm">AI Reply</span>
            </button>
          )}

          {/* Start new chat with selection */}
          <button
            onClick={onSendToAI}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 rounded-xl transition-colors"
            title="Start new chat with these messages"
          >
            <Forward className="w-4 h-4" />
            <span className="text-sm">New Chat</span>
          </button>

          {/* Copy */}
          <button
            onClick={() => {
              // Handle copy
              navigator.clipboard.writeText(`${selectedCount} messages selected`)
            }}
            className="p-1.5 hover:bg-slate-700 rounded-xl transition-colors"
            title="Copy selection"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>

        {/* Clear */}
        <button
          onClick={onClear}
          className="p-1.5 hover:bg-slate-700 rounded-xl transition-colors ml-2"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
