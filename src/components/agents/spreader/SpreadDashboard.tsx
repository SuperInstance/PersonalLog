/**
 * Spread Dashboard Component
 *
 * Shows active child conversations and their status.
 */

'use client'

import React, { useState } from 'react'
import { ChildConversation } from '@/lib/agents/spreader/types'
import { cn } from '@/lib/utils'

interface SpreadDashboardProps {
  children: ChildConversation[]
  onViewChild?: (childId: string) => void
  onMergeChild?: (childId: string) => void
  compact?: boolean
}

export function SpreadDashboard({
  children,
  onViewChild,
  onMergeChild,
  compact = false
}: SpreadDashboardProps) {
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set())

  if (children.length === 0) {
    return (
      <div className="spread-dashboard-empty text-center py-8 text-gray-500 dark:text-gray-400">
        <p className="text-sm">No active parallel conversations</p>
        <p className="text-xs mt-1">Say "Spread this: task1, task2" to create some</p>
      </div>
    )
  }

  const toggleExpanded = (childId: string) => {
    setExpandedChildren(prev => {
      const next = new Set(prev)
      if (next.has(childId)) {
        next.delete(childId)
      } else {
        next.add(childId)
      }
      return next
    })
  }

  const statusCounts = {
    pending: children.filter(c => c.status === 'pending').length,
    working: children.filter(c => c.status === 'working').length,
    complete: children.filter(c => c.status === 'complete').length,
    error: children.filter(c => c.status === 'error').length
  }

  return (
    <div className="spread-dashboard bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Parallel Conversations
          </h4>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              {statusCounts.pending}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              {statusCounts.working}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {statusCounts.complete}
            </span>
            {statusCounts.error > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {statusCounts.error}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Child List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
        {children.map(child => (
          <ChildConversationCard
            key={child.id}
            child={child}
            expanded={expandedChildren.has(child.id)}
            onToggle={() => toggleExpanded(child.id)}
            onView={onViewChild}
            onMerge={onMergeChild}
            compact={compact}
          />
        ))}
      </div>
    </div>
  )
}

interface ChildConversationCardProps {
  child: ChildConversation
  expanded: boolean
  onToggle: () => void
  onView?: (childId: string) => void
  onMerge?: (childId: string) => void
  compact?: boolean
}

function ChildConversationCard({
  child,
  expanded,
  onToggle,
  onView,
  onMerge,
  compact
}: ChildConversationCardProps) {
  const statusIcon = getStatusIcon(child.status)
  const statusColor = getStatusColor(child.status)

  return (
    <div className={cn(
      'child-conversation transition-colors',
      expanded && 'bg-gray-50 dark:bg-gray-900'
    )}>
      {/* Main Row */}
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Status Icon */}
        <div className={cn(
          'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs',
          statusColor
        )}>
          {statusIcon}
        </div>

        {/* Task Name */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {child.task}
          </div>
          {!compact && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {child.messageCount} messages · {formatDuration(child.createdAt, child.completedAt)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onView?.(child.id)}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
            title="Open in new tab"
          >
            View
          </button>
          {child.status === 'complete' && onMerge && (
            <button
              onClick={() => onMerge(child.id)}
              className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              title="Merge back to parent"
            >
              Merge
            </button>
          )}
          <button
            onClick={onToggle}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {expanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-3 pl-13">
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div>
              <span className="font-medium">ID:</span> {child.id}
            </div>
            <div>
              <span className="font-medium">Status:</span> {child.status}
            </div>
            <div>
              <span className="font-medium">Created:</span> {new Date(child.createdAt).toLocaleString()}
            </div>
            {child.completedAt && (
              <div>
                <span className="font-medium">Completed:</span> {new Date(child.completedAt).toLocaleString()}
              </div>
            )}
            {child.summary && (
              <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                <span className="font-medium">Summary:</span>
                <p className="mt-1">{child.summary}</p>
              </div>
            )}
            {child.error && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded">
                <span className="font-medium">Error:</span> {child.error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function getStatusIcon(status: ChildConversation['status']): string {
  switch (status) {
    case 'pending':
      return '○'
    case 'working':
      return '⊙'
    case 'complete':
      return '✓'
    case 'error':
      return '✕'
    case 'merged':
      return '↩'
    default:
      return '?'
  }
}

function getStatusColor(status: ChildConversation['status']): string {
  switch (status) {
    case 'pending':
      return 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
    case 'working':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
    case 'complete':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    case 'error':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    case 'merged':
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-600'
  }
}

function formatDuration(start: string, end?: string): string {
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : new Date()
  const minutes = Math.floor((endDate.getTime() - startDate.getTime()) / 60000)

  if (minutes < 1) return '< 1m'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}
