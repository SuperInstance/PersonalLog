/**
 * DAG Visualizer Component
 *
 * Displays DAG task graph with node-edge visualization.
 * Shows execution status, dependencies, critical path, and progress.
 */

'use client'

import React, { useMemo, useState } from 'react'
import {
  DAGGraph,
  DAGExecutionPlan,
  DAGExecutionState,
  createExecutionPlan
} from '@/lib/agents/spreader/dag'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface DAGVisualizerProps {
  dag: DAGGraph
  executionState?: Map<string, DAGExecutionState>
  compact?: boolean
  onNodeClick?: (nodeId: string) => void
  className?: string
}

interface NodePosition {
  x: number
  y: number
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DAGVisualizer({
  dag,
  executionState = new Map(),
  compact = false,
  onNodeClick,
  className
}: DAGVisualizerProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Create execution plan
  const plan = useMemo(() => {
    try {
      return createExecutionPlan(dag)
    } catch (error) {
      console.error('Failed to create execution plan:', error)
      return null
    }
  }, [dag])

  // Calculate node positions
  const nodePositions = useMemo(() => {
    return calculateNodePositions(dag, plan)
  }, [dag, plan])

  // Get critical path tasks
  const criticalPathSet = useMemo(() => {
    return new Set(plan?.criticalPath || [])
  }, [plan])

  if (!plan) {
    return (
      <div className={cn(
        'bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700',
        className
      )}>
        <div className="text-red-600 dark:text-red-400 text-sm">
          Unable to visualize DAG: invalid structure or circular dependencies
        </div>
      </div>
    )
  }

  if (compact) {
    return <CompactDAGView dag={dag} plan={plan} executionState={executionState} />
  }

  return (
    <div className={cn(
      'dag-visualizer bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Task Execution Plan
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400">Tasks:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {dag.nodes.size}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400">Rounds:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {plan.rounds.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400">Est. Duration:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatDuration(plan.estimatedDuration)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visualization */}
      <div className="p-4">
        <svg
          width="100%"
          height="400"
          className="bg-gray-50 dark:bg-gray-900 rounded-lg"
          viewBox="0 0 800 400"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Arrow marker */}
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3, 0 6"
                fill="#9ca3af"
              />
            </marker>
            {/* Critical path arrow marker */}
            <marker
              id="arrowhead-critical"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3, 0 6"
                fill="#f59e0b"
              />
            </marker>
          </defs>

          {/* Draw edges */}
          {dag.edges.map(edge => {
            const fromPos = nodePositions.get(edge.from)
            const toPos = nodePositions.get(edge.to)
            if (!fromPos || !toPos) return null

            const isCritical = criticalPathSet.has(edge.from) && criticalPathSet.has(edge.to)

            return (
              <g key={`${edge.from}-${edge.to}`}>
                <line
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke={isCritical ? '#f59e0b' : edge.type === 'hard' ? '#3b82f6' : '#9ca3af'}
                  strokeWidth={isCritical ? 3 : 2}
                  strokeDasharray={edge.type === 'soft' ? '5,5' : undefined}
                  markerEnd={`url(#arrowhead${isCritical ? '-critical' : ''})`}
                  opacity={edge.type === 'soft' ? 0.5 : 1}
                />
              </g>
            )
          })}

          {/* Draw nodes */}
          {Array.from(dag.nodes.values()).map(node => {
            const pos = nodePositions.get(node.id)
            if (!pos) return null

            const state = executionState.get(node.id)
            const status = state?.status || 'pending'
            const isCritical = criticalPathSet.has(node.id)
            const isSelected = selectedNode === node.id
            const isHovered = hoveredNode === node.id

            return (
              <g
                key={node.id}
                onClick={() => {
                  setSelectedNode(node.id)
                  onNodeClick?.(node.id)
                }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Node circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isSelected || isHovered ? 25 : 20}
                  fill={getStatusColor(status)}
                  stroke={isCritical ? '#f59e0b' : '#1f2937'}
                  strokeWidth={isCritical ? 3 : 2}
                  opacity={isSelected || isHovered ? 1 : 0.9}
                />

                {/* Priority indicator */}
                {node.priority === 'high' && (
                  <circle
                    cx={pos.x + 15}
                    cy={pos.y - 15}
                    r={6}
                    fill="#ef4444"
                    stroke="#fff"
                    strokeWidth={1}
                  />
                )}

                {/* Task label */}
                <text
                  x={pos.x}
                  y={pos.y + 35}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#374151"
                  className="dark:fill-gray-300"
                >
                  {truncate(node.task, 20)}
                </text>

                {/* Duration */}
                {node.estimatedDuration && (
                  <text
                    x={pos.x}
                    y={pos.y - 30}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#6b7280"
                  >
                    {node.estimatedDuration}s
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Pending</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">Running</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600 dark:text-gray-400">Complete</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-600 dark:text-gray-400">Failed</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">Critical Path:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full border-2 border-amber-500 border-solid" />
              <span className="text-gray-600 dark:text-gray-400">Highlighted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Plan */}
      <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 mt-3">
          Execution Rounds
        </h4>
        <div className="space-y-2">
          {plan.rounds.map(round => (
            <div
              key={round.round}
              className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-md"
            >
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                R{round.round + 1}
              </span>
              <div className="flex flex-wrap gap-2">
                {round.parallelTasks.map(taskId => {
                  const node = dag.nodes.get(taskId)
                  const state = executionState.get(taskId)
                  const status = state?.status || 'pending'
                  const isCritical = criticalPathSet.has(taskId)

                  return (
                    <span
                      key={taskId}
                      className={cn(
                        'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
                        'border transition-colors',
                        isCritical && 'border-amber-500 border-solid',
                        getStatusClass(status)
                      )}
                    >
                      {truncate(node?.task || taskId, 30)}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Critical Path Summary */}
        {plan.criticalPath.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-amber-900 dark:text-amber-100">
                Critical Path:
              </span>
              <div className="flex flex-wrap gap-1 items-center">
                {plan.criticalPath.map((taskId, index) => (
                  <React.Fragment key={taskId}>
                    <span className="text-amber-800 dark:text-amber-200 font-medium">
                      {truncate(dag.nodes.get(taskId)?.task || taskId, 20)}
                    </span>
                    {index < plan.criticalPath.length - 1 && (
                      <span className="text-amber-600 dark:text-amber-400">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
          <NodeDetailsPanel
            node={dag.nodes.get(selectedNode)}
            state={executionState.get(selectedNode)}
            isCritical={criticalPathSet.has(selectedNode)}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// COMPACT VIEW
// ============================================================================

function CompactDAGView({
  dag,
  plan,
  executionState
}: {
  dag: DAGGraph
  plan: DAGExecutionPlan
  executionState: Map<string, DAGExecutionState>
}) {
  const completedCount = Array.from(executionState.values())
    .filter(s => s.status === 'complete').length
  const totalCount = dag.nodes.size
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-gray-600 dark:text-gray-400">DAG:</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Round indicator */}
      <span className="text-xs text-gray-500 dark:text-gray-500">
        {plan.rounds.length} rounds
      </span>
    </div>
  )
}

// ============================================================================
// NODE DETAILS PANEL
// ============================================================================

interface NodeDetailsPanelProps {
  node?: { id: string; task: string; dependencies: string[]; estimatedDuration?: number; priority?: string }
  state?: DAGExecutionState
  isCritical: boolean
  onClose: () => void
}

function NodeDetailsPanel({ node, state, isCritical, onClose }: NodeDetailsPanelProps) {
  if (!node) return null

  return (
    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {node.task}
        </h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">ID:</span>
          <span className="font-mono text-gray-900 dark:text-gray-100">{node.id}</span>
        </div>

        {node.dependencies.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">Dependencies:</span>
            <span className="text-gray-900 dark:text-gray-100">
              {node.dependencies.join(', ')}
            </span>
          </div>
        )}

        {node.estimatedDuration && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">Duration:</span>
            <span className="text-gray-900 dark:text-gray-100">
              {node.estimatedDuration}s
            </span>
          </div>
        )}

        {node.priority && node.priority !== 'normal' && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">Priority:</span>
            <span className={cn(
              'font-semibold',
              node.priority === 'high' ? 'text-red-600 dark:text-red-400' :
              node.priority === 'low' ? 'text-gray-600 dark:text-gray-400' :
              'text-gray-900 dark:text-gray-100'
            )}>
              {node.priority}
            </span>
          </div>
        )}

        {isCritical && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">Critical Path:</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              Yes
            </span>
          </div>
        )}

        {state && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">Status:</span>
            <span className={cn(
              'font-semibold',
              getStatusClass(state.status)
            )}>
              {state.status}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculates node positions for visualization.
 * Uses layered layout algorithm.
 */
function calculateNodePositions(
  dag: DAGGraph,
  plan: DAGExecutionPlan | null
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>()
  const width = 800
  const height = 400
  const padding = 50

  if (!plan) {
    // Fallback: simple circular layout
    const nodes = Array.from(dag.nodes.keys())
    const radius = Math.min(width, height) / 2 - padding
    const centerX = width / 2
    const centerY = height / 2

    nodes.forEach((nodeId, index) => {
      const angle = (2 * Math.PI * index) / nodes.length
      positions.set(nodeId, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      })
    })

    return positions
  }

  // Layered layout: assign nodes to rounds
  const roundCount = plan.rounds.length
  const roundHeight = (height - 2 * padding) / Math.max(roundCount - 1, 1)

  plan.rounds.forEach((round, roundIndex) => {
    const taskCount = round.parallelTasks.length
    const roundWidth = (width - 2 * padding) / Math.max(taskCount + 1, 1)
    const y = padding + roundIndex * roundHeight

    round.parallelTasks.forEach((taskId, taskIndex) => {
      const x = padding + (taskIndex + 1) * roundWidth
      positions.set(taskId, { x, y })
    })
  })

  return positions
}

/**
 * Gets status color for node visualization.
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: '#9ca3af',
    running: '#3b82f6',
    complete: '#10b981',
    failed: '#ef4444',
    skipped: '#6b7280'
  }

  return colors[status] || colors.pending
}

/**
 * Gets CSS class for status badge.
 */
function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600',
    running: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700',
    complete: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700',
    failed: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-200 dark:border-red-700',
    skipped: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'
  }

  return classes[status] || classes.pending
}

/**
 * Truncates text to specified length.
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Formats duration in human-readable format.
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  } else {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
}
