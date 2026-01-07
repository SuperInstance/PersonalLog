/**
 * Enhanced Spreader Dashboard
 *
 * Professional dashboard integrating all Round 6 DAG features:
 * - Real-time DAG visualization
 * - Execution progress tracking
 * - Auto-merge status
 * - Context optimization metrics
 * - Error recovery notifications
 * - Onboarding integration
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ChildConversation } from '@/lib/agents/spreader/types'
import { DAGVisualizationDashboard } from './DAGVisualization'
import { DAGNode, DAGExecutionState, DAGNodeStatus } from '@/lib/agents/spreader/dag'
import { DAGOnboarding, useDAGOnboarding } from './DAGOnboarding'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface EnhancedSpreadDashboardProps {
  children: ChildConversation[]
  dagNodes?: DAGNode[]
  dagExecutionState?: Map<string, DAGExecutionState>
  onViewChild?: (childId: string) => void
  onMergeChild?: (childId: string) => void
  onDAGNodeClick?: (nodeId: string) => void
  compact?: boolean
  // Metrics
  contextSavings?: number // Tokens saved via optimization
  mergeStrategy?: string
  autoMergeEnabled?: boolean
}

interface ExecutionMetrics {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  runningTasks: number
  averageExecutionTime: number
  contextOptimizationSavings: number
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EnhancedSpreadDashboard({
  children,
  dagNodes,
  dagExecutionState,
  onViewChild,
  onMergeChild,
  onDAGNodeClick,
  compact = false,
  contextSavings = 0,
  mergeStrategy = 'merge',
  autoMergeEnabled = false
}: EnhancedSpreadDashboardProps) {
  const [viewMode, setViewMode] = useState<'list' | 'dag' | 'split'>('list')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [celebrateComplete, setCelebrateComplete] = useState(false)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const { showOnboarding: shouldShowOnboarding, handleComplete, handleClose } = useDAGOnboarding()

  // Calculate metrics
  const metrics = useCallback((): ExecutionMetrics => {
    const totalTasks = children.length
    const completedTasks = children.filter(c => c.status === 'complete' || c.status === 'merged').length
    const failedTasks = children.filter(c => c.status === 'error').length
    const runningTasks = children.filter(c => c.status === 'working').length

    // Calculate average execution time
    const completedChildren = children.filter(c => c.completedAt)
    const avgTime = completedChildren.length > 0
      ? completedChildren.reduce((sum, c) => {
          const duration = new Date(c.completedAt!).getTime() - new Date(c.createdAt).getTime()
          return sum + duration
        }, 0) / completedChildren.length
      : 0

    return {
      totalTasks,
      completedTasks,
      failedTasks,
      runningTasks,
      averageExecutionTime: avgTime,
      contextOptimizationSavings: contextSavings
    }
  }, [children, contextSavings])

  const currentMetrics = metrics()

  // Check if all tasks complete
  const allComplete = currentMetrics.totalTasks > 0 &&
    currentMetrics.completedTasks === currentMetrics.totalTasks

  // Show celebration when all complete
  useEffect(() => {
    if (allComplete && !celebrateComplete) {
      setCelebrateComplete(true)
      setTimeout(() => setCelebrateComplete(false), 3000)
    }
  }, [allComplete, celebrateComplete])

  // Celebration animation
  const celebrationAnimation = celebrateComplete ? 'animate-bounce' : ''

  return (
    <div className="enhanced-spread-dashboard bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Onboarding Modal */}
      {shouldShowOnboarding && (
        <DAGOnboarding
          onClose={handleClose}
          onComplete={handleComplete}
        />
      )}

      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <h4 className={`text-lg font-bold text-gray-900 dark:text-gray-100 ${celebrationAnimation}`}>
              {allComplete ? '✨ All Tasks Complete!' : '📊 Task Execution'}
            </h4>
            {allComplete && (
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                Great job!
              </span>
            )}
          </div>

          {/* View Mode Toggle */}
          {dagNodes && dagNodes.length > 0 && (
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                )}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('dag')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  viewMode === 'dag'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                )}
              >
                DAG
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  viewMode === 'split'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                )}
              >
                Split
              </button>
            </div>
          )}
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Total"
            value={currentMetrics.totalTasks}
            icon="📋"
            color="gray"
          />
          <MetricCard
            label="Running"
            value={currentMetrics.runningTasks}
            icon="⚡"
            color="blue"
            animate={currentMetrics.runningTasks > 0}
          />
          <MetricCard
            label="Complete"
            value={currentMetrics.completedTasks}
            icon="✅"
            color="green"
          />
          <MetricCard
            label="Failed"
            value={currentMetrics.failedTasks}
            icon="❌"
            color="red"
          />
        </div>

        {/* Context Savings Indicator */}
        {currentMetrics.contextOptimizationSavings > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full">
            <span className="font-medium">💡 Context optimization saved {currentMetrics.contextOptimizationSavings.toLocaleString()} tokens</span>
          </div>
        )}

        {/* Auto-Merge Badge */}
        {autoMergeEnabled && allComplete && (
          <div className="mt-3 flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded-full">
            <span className="font-medium">✨ Auto-merge enabled with "{mergeStrategy}" strategy</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn(
        'flex',
        viewMode === 'split' ? 'h-[600px]' : ''
      )}>
        {/* List View */}
        {(viewMode === 'list' || viewMode === 'split') && (
          <div className={cn(
            'divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto',
            viewMode === 'split' ? 'w-1/2 border-r border-gray-200 dark:border-gray-700' : 'w-full max-h-96'
          )}>
            {children.length === 0 ? (
              <EmptyState />
            ) : (
              children.map(child => (
                <EnhancedChildCard
                  key={child.id}
                  child={child}
                  onView={onViewChild}
                  onMerge={onMergeChild}
                  compact={compact}
                />
              ))
            )}
          </div>
        )}

        {/* DAG View */}
        {(viewMode === 'dag' || viewMode === 'split') && dagNodes && dagNodes.length > 0 && (
          <div className={cn(
            'bg-gray-50 dark:bg-gray-900',
            viewMode === 'split' ? 'w-1/2' : 'w-full h-96'
          )}>
            <DAGVisualizationDashboard
              nodes={dagNodes}
              executionState={dagExecutionState}
              onNodeClick={(nodeId) => {
                setSelectedNode(nodeId)
                onDAGNodeClick?.(nodeId)
              }}
            />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {allComplete ? (
            <span>🎉 All tasks completed successfully!</span>
          ) : currentMetrics.runningTasks > 0 ? (
            <span>⚡ {currentMetrics.runningTasks} tasks in progress...</span>
          ) : (
            <span>Waiting for tasks to start...</span>
          )}
        </div>

        {allComplete && onMergeChild && children.some(c => c.status === 'complete') && (
          <button
            onClick={() => {
              // Merge all complete children
              children.filter(c => c.status === 'complete').forEach(c => {
                onMergeChild?.(c.id)
              })
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-medium rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            Merge All Results
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface MetricCardProps {
  label: string
  value: number
  icon: string
  color: 'gray' | 'blue' | 'green' | 'red'
  animate?: boolean
}

function MetricCard({ label, value, icon, color, animate }: MetricCardProps) {
  const colorClasses = {
    gray: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
  }

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg',
      colorClasses[color],
      animate && 'animate-pulse'
    )}>
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
        <div className="text-lg font-bold">{value}</div>
      </div>
    </div>
  )
}

interface EnhancedChildCardProps {
  child: ChildConversation
  onView?: (childId: string) => void
  onMerge?: (childId: string) => void
  compact?: boolean
}

function EnhancedChildCard({ child, onView, onMerge, compact }: EnhancedChildCardProps) {
  const [expanded, setExpanded] = useState(false)

  const statusIcon = {
    pending: '○',
    working: '⊙',
    complete: '✓',
    error: '✕',
    merged: '↩'
  }[child.status]

  const statusColor = {
    pending: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    working: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 animate-pulse',
    complete: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    merged: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
  }[child.status]

  return (
    <div className={cn(
      'child-conversation transition-colors hover:bg-gray-50 dark:hover:bg-gray-900',
      expanded && 'bg-gray-50 dark:bg-gray-900'
    )}>
      <div className="px-6 py-4 flex items-center gap-4">
        {/* Status Icon */}
        <div className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold',
          statusColor
        )}>
          {statusIcon}
        </div>

        {/* Task Details */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {child.task}
          </div>
          {!compact && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
              <span>{child.messageCount} messages</span>
              <span>•</span>
              <span>{formatDuration(child.createdAt, child.completedAt)}</span>
              {child.status === 'working' && (
                <>
                  <span>•</span>
                  <span className="text-blue-500">Working...</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onView?.(child.id)}
            className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            View
          </button>
          {child.status === 'complete' && onMerge && (
            <button
              onClick={() => onMerge(child.id)}
              className="px-3 py-1.5 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-sm"
            >
              Merge
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {expanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-6 pb-4 pl-18">
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <div className="flex justify-between">
              <span className="font-medium">ID:</span>
              <span className="font-mono">{child.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Status:</span>
              <span className="capitalize">{child.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Created:</span>
              <span>{new Date(child.createdAt).toLocaleString()}</span>
            </div>
            {child.completedAt && (
              <div className="flex justify-between">
                <span className="font-medium">Completed:</span>
                <span>{new Date(child.completedAt).toLocaleString()}</span>
              </div>
            )}
            {child.summary && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="font-medium block mb-1">Summary:</span>
                <p className="text-gray-700 dark:text-gray-300">{child.summary}</p>
              </div>
            )}
            {child.error && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded">
                <span className="font-medium">Error: </span>
                {child.error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <span className="text-3xl">📋</span>
      </div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
        No active tasks
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
        Say "Spread this: task1, task2" to create parallel conversations, or use dependency syntax for DAG execution.
      </p>
    </div>
  )
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
