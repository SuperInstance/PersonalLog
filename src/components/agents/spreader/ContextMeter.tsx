/**
 * Context Meter Component
 *
 * Visualizes context window usage with color-coded progress bar.
 */

'use client'

import React from 'react'
import { ContextMetrics } from '@/lib/agents/spreader/types'
import { cn } from '@/lib/utils'

interface ContextMeterProps {
  metrics: ContextMetrics
  onCompact?: () => void
  compact?: boolean
}

export function ContextMeter({ metrics, onCompact, compact = false }: ContextMeterProps) {
  const color = getContextColor(metrics.percentage)

  if (compact) {
    return (
      <div className="context-meter-compact flex items-center gap-2 text-sm">
        <div className={cn(
          'w-2 h-2 rounded-full',
          color === 'red' ? 'bg-red-500' :
          color === 'yellow' ? 'bg-yellow-500' :
          'bg-green-500'
        )} />
        <span className="text-gray-600 dark:text-gray-400">
          {metrics.percentage.toFixed(0)}%
        </span>
      </div>
    )
  }

  return (
    <div className="context-meter bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Context Usage
        </span>
        <span className={cn(
          'text-sm font-bold',
          color === 'red' ? 'text-red-600 dark:text-red-400' :
          color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
          'text-green-600 dark:text-green-400'
        )}>
          {metrics.percentage.toFixed(0)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out',
            color === 'red' ? 'bg-red-500' :
            color === 'yellow' ? 'bg-yellow-500' :
            'bg-green-500'
          )}
          style={{ width: `${Math.min(metrics.percentage, 100)}%` }}
        />
      </div>

      {/* Token Count */}
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
        {metrics.used.toLocaleString()} / {metrics.total.toLocaleString()} tokens
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-2 text-xs">
        {metrics.status === 'critical' && (
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <span>⚠️</span>
            <span>Context nearly full</span>
          </span>
        )}
        {metrics.status === 'warning' && (
          <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
            <span>🟡</span>
            <span>Approaching limit</span>
          </span>
        )}
        {metrics.status === 'healthy' && (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <span>✅</span>
            <span>Healthy</span>
          </span>
        )}
      </div>

      {/* Compact Button (at 85%+) */}
      {metrics.percentage >= 85 && onCompact && (
        <button
          onClick={onCompact}
          className="mt-3 w-full px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
        >
          Compact Context (Generate Schema)
        </button>
      )}
    </div>
  )
}

function getContextColor(percentage: number): 'red' | 'yellow' | 'green' {
  if (percentage >= 85) return 'red'
  if (percentage >= 60) return 'yellow'
  return 'green'
}
