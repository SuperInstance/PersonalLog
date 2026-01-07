'use client'

/**
 * AgentPreview Component
 *
 * Displays a generated agent preview with natural language summary,
 * key behaviors, and technical details (collapsible).
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles, Check } from 'lucide-react'
import { memo } from 'react'

interface AgentPreviewProps {
  agentData: {
    definition: {
      id: string
      name: string
      description: string
      icon: string
      category: string
    }
    naturalLanguageSummary: string
    warnings?: string[]
  }
  onEdit?: () => void
  className?: string
}

function AgentPreview({ agentData, onEdit, className = '' }: AgentPreviewProps) {
  const [showTechnical, setShowTechnical] = useState(false)

  const { definition, naturalLanguageSummary, warnings } = agentData

  // Extract key behaviors from the summary or description
  // This is a simple extraction - in production, this would come from structured data
  const behaviors = extractBehaviors(naturalLanguageSummary, definition.description)

  return (
    <div className={`agent-preview ${className}`}>
      {/* Preview Header */}
      <div className="preview-header bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl p-6 mb-6 text-white shadow-xl animate-scale-in">
        <div className="flex items-start gap-4">
          {/* Large agent icon */}
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-4xl shadow-inner flex-shrink-0">
            {definition.icon || '🤖'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold">{definition.name}</h2>
              {warnings && warnings.length > 0 && (
                <span className="px-2 py-0.5 bg-yellow-400/30 backdrop-blur-sm rounded-full text-xs font-medium border border-yellow-300/50">
                  Draft
                </span>
              )}
            </div>
            <p className="text-white/90 text-sm">{definition.description}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-xs font-medium">
                {definition.category}
              </span>
              <span className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-xs font-medium">
                Custom Agent
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Summary */}
      <div className="preview-summary bg-white dark:bg-slate-900 rounded-2xl p-6 mb-6 border border-slate-200 dark:border-slate-800 shadow-lg animate-fade-in">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Your custom agent is ready!
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              I&apos;ve created this agent based on your requirements. Here&apos;s what it does:
            </p>
          </div>
        </div>

        {/* Behavior list */}
        <div className="behavior-list space-y-2 mb-4">
          {behaviors.map((behavior, idx) => (
            <div
              key={idx}
              className="behavior-item flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50 animate-slide-in-bottom"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
              </div>
              <span className="text-slate-900 dark:text-slate-100 text-sm leading-relaxed">
                {behavior}
              </span>
            </div>
          ))}
        </div>

        {/* Use case */}
        <div className="use-case bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800/50">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <strong className="text-amber-700 dark:text-amber-400">Best for:</strong> {naturalLanguageSummary}
          </p>
        </div>

        {/* Warnings (if any) */}
        {warnings && warnings.length > 0 && (
          <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800/50">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-2">
              ⚠️ Notes:
            </p>
            <ul className="text-sm text-yellow-700 dark:text-yellow-500 space-y-1">
              {warnings.map((warning, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Technical Details (collapsible) */}
      <details
        className="technical-details bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden group"
        open={showTechnical}
        onToggle={(e) => setShowTechnical((e.target as HTMLDetailsElement).open)}
      >
        <summary className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none">
          <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">⚙️</span>
            Technical Details
          </span>
          {showTechnical ? (
            <ChevronUp className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          )}
        </summary>

        <div className="px-6 pb-6">
          <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
            <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
              {formatAgentAsYAML(agentData)}
            </pre>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
            This is the YAML definition that powers your agent. You can edit this in the next step.
          </p>
        </div>
      </details>
    </div>
  )
}

/**
 * Extract key behaviors from summary and description
 */
function extractBehaviors(summary: string, description: string): string[] {
  // This is a simplified extraction logic
  // In production, this would be more sophisticated or come from structured data
  const behaviors: string[] = []

  // Extract sentences that start with action words
  const text = `${summary} ${description}`
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)

  // Take up to 4 sentences as behaviors
  for (const sentence of sentences.slice(0, 4)) {
    const trimmed = sentence.trim()
    if (trimmed.length > 10 && trimmed.length < 200) {
      behaviors.push(trimmed)
    }
  }

  // Fallback behaviors if none extracted
  if (behaviors.length === 0) {
    behaviors.push(
      'Responds according to the specified personality',
      'Follows the configured behavioral constraints',
      'Respects the defined capability settings'
    )
  }

  return behaviors
}

/**
 * Format agent data as YAML for technical details
 */
function formatAgentAsYAML(agentData: AgentPreviewProps['agentData']): string {
  const { definition } = agentData

  // Simplified YAML representation
  return `id: ${definition.id}
name: ${definition.name}
description: ${definition.description}
icon: ${definition.icon}
category: ${definition.category}
activationMode: foreground
state: idle
metadata:
  version: 1.0.0
  author: You
  createdAt: ${new Date().toISOString()}
  tags:
    - custom
    - vibe-coded`
}

export default memo(AgentPreview, (prevProps, nextProps) => {
  // Only re-render if agent data changes
  return (
    prevProps.agentData === nextProps.agentData &&
    prevProps.className === nextProps.className
  )
})
