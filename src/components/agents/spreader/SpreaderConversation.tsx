/**
 * Spreader Conversation UI Component
 *
 * Main interface for interacting with the Spreader agent.
 */

'use client'

import React, { useEffect, useState } from 'react'
import { SpreaderState, ChildConversation, SessionSchema, ContextMetrics } from '@/lib/agents/spreader/types'
import { calculateContextMetrics, DEFAULT_MAX_TOKENS } from '@/lib/agents/spreader/types'
import { ContextMeter } from './ContextMeter'
import { SpreadDashboard } from './SpreadDashboard'
import { cn } from '@/lib/utils'

interface SpreaderConversationProps {
  conversationId: string
  agentState: SpreaderState
  onSendMessage: (content: string) => Promise<void>
  onCompact?: () => Promise<void>
  compact?: boolean
}

export function SpreaderConversation({
  conversationId,
  agentState,
  onSendMessage,
  onCompact,
  compact = false
}: SpreaderConversationProps) {
  const [metrics, setMetrics] = useState<ContextMetrics>({
    used: agentState.currentTokens,
    total: agentState.maxTokens,
    percentage: (agentState.currentTokens / agentState.maxTokens) * 100,
    status: agentState.currentTokens >= agentState.thresholdTokens ? 'critical' :
            agentState.currentTokens >= agentState.warningTokens ? 'warning' : 'healthy'
  })

  const [welcomeShown, setWelcomeShown] = useState(false)

  useEffect(() => {
    // Update metrics when agent state changes
    const newMetrics = calculateContextMetrics(
      agentState.currentTokens,
      agentState.maxTokens
    )
    setMetrics(newMetrics)
  }, [agentState.currentTokens, agentState.maxTokens])

  const handleCompact = async () => {
    if (onCompact) {
      await onCompact()
    }
  }

  const handleViewChild = (childId: string) => {
    // Open child conversation in new tab
    window.open(`/conversation/${childId}`, '_blank')
  }

  const handleMergeChild = async (childId: string) => {
    // Send merge command
    await onSendMessage(`Merge child ${childId}`)
  }

  const handleQuickSpread = () => {
    const tasks = prompt(
      'Enter tasks separated by commas:',
      'Research topic A, Research topic B, Research topic C'
    )
    if (tasks) {
      onSendMessage(`Spread this: ${tasks}`)
    }
  }

  if (compact) {
    return (
      <div className="spreader-compact p-3 space-y-3">
        <ContextMeter
          metrics={metrics}
          onCompact={metrics.percentage >= 85 ? handleCompact : undefined}
          compact
        />
        {agentState.childConversations.length > 0 && (
          /* eslint-disable react/no-children-prop */
          <SpreadDashboard
            onViewChild={handleViewChild}
            onMergeChild={handleMergeChild}
            compact
            children={agentState.childConversations}
          />
        )}
      </div>
    )
  }

  return (
    <div className="spreader-conversation space-y-4">
      {/* Welcome Message */}
      {!welcomeShown && (
        <WelcomeMessage
          metrics={metrics}
          onDismiss={() => setWelcomeShown(true)}
          onQuickSpread={handleQuickSpread}
        />
      )}

      {/* Context Meter */}
      <ContextMeter
        metrics={metrics}
        onCompact={metrics.percentage >= 85 ? handleCompact : undefined}
      />

      {/* Schema Display */}
      {agentState.currentSchema && agentState.schemaGenerated && (
        <SchemaDisplay schema={agentState.currentSchema} />
      )}

      {/* Spread Dashboard */}
      {agentState.childConversations.length > 0 && (
        /* eslint-disable react/no-children-prop */
        <SpreadDashboard
          onViewChild={handleViewChild}
          onMergeChild={handleMergeChild}
          children={agentState.childConversations}
        />
      )}

      {/* Quick Actions */}
      <QuickActions
        onSpread={handleQuickSpread}
        onStatus={() => onSendMessage('Status')}
        onHelp={() => onSendMessage('Help')}
      />
    </div>
  )
}

interface WelcomeMessageProps {
  metrics: ContextMetrics
  onDismiss: () => void
  onQuickSpread: () => void
}

function WelcomeMessage({ metrics, onDismiss, onQuickSpread }: WelcomeMessageProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Hi! I&apos;m Spreader 📚
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your context window manager
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 mb-4">
        <p>
          I help you work around AI context limits by:
        </p>
        <ul className="space-y-2 ml-4">
          <li className="flex items-start gap-2">
            <span className="text-blue-500">1.</span>
            <span><strong>Tracking context usage</strong> (currently at {metrics.percentage.toFixed(1)}%)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">2.</span>
            <span><strong>Generating schemas</strong> when you hit 85% capacity</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">3.</span>
            <span><strong>&ldquo;Spreading&rdquo; parallel tasks</strong> to child conversations</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">4.</span>
            <span><strong>Merging results</strong> back into the main conversation</span>
          </li>
        </ul>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onQuickSpread}
          className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors text-sm font-medium"
        >
          Try Spreading Tasks
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors text-sm"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

interface SchemaDisplayProps {
  schema: SessionSchema
}

function SchemaDisplay({ schema }: SchemaDisplayProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <span>📝</span>
        <span>Conversation Schema</span>
      </h4>

      <div className="space-y-3 text-sm">
        {schema.project && (
          <div>
            <div className="font-medium text-gray-700 dark:text-gray-300">Project</div>
            <div className="text-gray-600 dark:text-gray-400">{schema.project}</div>
          </div>
        )}

        {schema.description && (
          <div>
            <div className="font-medium text-gray-700 dark:text-gray-300">Description</div>
            <div className="text-gray-600 dark:text-gray-400">{schema.description}</div>
          </div>
        )}

        {schema.completed.length > 0 && (
          <div>
            <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">✅ Completed</div>
            <ul className="space-y-1 ml-4">
              {schema.completed.map((item, i) => (
                <li key={i} className="text-gray-600 dark:text-gray-400 text-xs">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {schema.inProgress.length > 0 && (
          <div>
            <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">🔄 In Progress</div>
            <ul className="space-y-1 ml-4">
              {schema.inProgress.map((item, i) => (
                <li key={i} className="text-gray-600 dark:text-gray-400 text-xs">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {schema.next.length > 0 && (
          <div>
            <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">⏭️ Next</div>
            <ul className="space-y-1 ml-4">
              {schema.next.map((item, i) => (
                <li key={i} className="text-gray-600 dark:text-gray-400 text-xs">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {Array.isArray(schema.decisions) && schema.decisions.length > 0 && (
          <div>
            <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">💡 Decisions</div>
            <ul className="space-y-1 ml-4">
              {schema.decisions.map((item, i) => (
                <li key={i} className="text-gray-600 dark:text-gray-400 text-xs">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(schema.technicalSpecs.stack?.length ||
          schema.technicalSpecs.architecture ||
          schema.technicalSpecs.patterns?.length) && (
          <div>
            <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">🔧 Technical Specs</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-4">
              {schema.technicalSpecs.stack?.length && (
                <div><strong>Stack:</strong> {schema.technicalSpecs.stack.join(', ')}</div>
              )}
              {schema.technicalSpecs.architecture && (
                <div><strong>Architecture:</strong> {schema.technicalSpecs.architecture}</div>
              )}
              {schema.technicalSpecs.patterns?.length && (
                <div><strong>Patterns:</strong> {schema.technicalSpecs.patterns.join(', ')}</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        Generated {new Date(schema.generatedAt).toLocaleString()}
      </div>
    </div>
  )
}

interface QuickActionsProps {
  onSpread: () => void
  onStatus: () => void
  onHelp: () => void
}

function QuickActions({ onSpread, onStatus, onHelp }: QuickActionsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Quick Actions
      </h4>

      <div className="space-y-2">
        <button
          onClick={onSpread}
          className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors text-sm text-left flex items-center gap-2"
        >
          <span>📊</span>
          <span>Spread Tasks</span>
        </button>
        <button
          onClick={onStatus}
          className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors text-sm text-left flex items-center gap-2"
        >
          <span>📈</span>
          <span>Check Status</span>
        </button>
        <button
          onClick={onHelp}
          className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors text-sm text-left flex items-center gap-2"
        >
          <span>❓</span>
          <span>Show Help</span>
        </button>
      </div>
    </div>
  )
}
