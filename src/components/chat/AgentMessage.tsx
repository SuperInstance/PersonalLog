'use client'

/**
 * AgentMessage Component
 *
 * Displays messages sent by agents with distinct styling and agent information.
 * Supports both foreground agent messages and background agent results.
 */

import { Message } from '@/types/conversation'
import { Bot } from 'lucide-react'
import { memo } from 'react'

interface AgentMessageProps {
  message: Message
  agentName?: string
  agentIcon?: string
}

function AgentMessage({ message, agentName, agentIcon }: AgentMessageProps) {
  const agentId = message.metadata?.agentId || 'unknown'
  const displayName = agentName || message.metadata?.agentId || 'Agent'
  const icon = agentIcon || '🤖'

  // Get agent metadata if available
  const agentResponse = message.metadata?.agentResponse
  const isBackground = agentResponse?.type === 'background'

  return (
    <div className="group animate-fade-in">
      <div
        className="relative transition-all duration-200 transform hover:scale-[1.01]"
        role="article"
        aria-label={`${displayName}: ${message.content.text?.substring(0, 100) || 'Agent message'}`}
      >
        <div className="flex justify-start">
          <div className="flex items-end gap-2 max-w-[80%]">
            {/* Avatar with distinctive agent styling */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-lg">
              {icon.length === 1 ? (
                <span aria-hidden="true">{icon}</span>
              ) : (
                <Bot className="w-4 h-4" aria-hidden="true" />
              )}
            </div>

            {/* Message content */}
            <div>
              {/* Agent name badge */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <Bot className="w-3 h-3" aria-hidden="true" />
                  {displayName}
                </span>
                {isBackground && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    background
                  </span>
                )}
              </div>

              {/* Message bubble */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl rounded-bl-md px-4 py-2 shadow-sm">
                {message.content.text && (
                  <p className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap text-sm">
                    {message.content.text}
                  </p>
                )}
              </div>

              {/* Metadata footer */}
              <div className="flex items-center gap-2 mt-1 px-1">
                <span className="text-xs text-slate-400" aria-label={`Sent ${formatRelativeTime(message.timestamp)}`}>
                  {formatRelativeTime(message.timestamp)}
                </span>
                {message.metadata?.agentResponse?.metadata && (
                  <span className="text-xs text-slate-500">
                    • processed
                  </span>
                )}
              </div>

              {/* Background agent results metadata */}
              {agentResponse?.metadata && Object.keys(agentResponse.metadata).length > 0 && (
                <div className="mt-2 bg-slate-50 dark:bg-slate-900 rounded-lg p-2 border border-slate-200 dark:border-slate-800">
                  <details className="group/details">
                    <summary className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                      Agent data
                    </summary>
                    <pre className="mt-2 text-xs text-slate-700 dark:text-slate-300 overflow-x-auto">
                      {JSON.stringify(agentResponse.metadata, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
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
 * Memoized AgentMessage component
 *
 * Only re-renders when message content changes
 */
export default memo(AgentMessage, (prevProps, nextProps) => {
  return prevProps.message.id === nextProps.message.id &&
    prevProps.agentName === nextProps.agentName &&
    prevProps.agentIcon === nextProps.agentIcon
})
