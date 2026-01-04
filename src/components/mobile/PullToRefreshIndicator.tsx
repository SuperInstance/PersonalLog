/**
 * Pull to Refresh Indicator
 *
 * Visual indicator for pull-to-refresh gesture.
 * Shows progress and refresh state with animated icons.
 *
 * @module mobile/refresh
 */

'use client'

import { Loader2, ArrowDown } from 'lucide-react'

interface PullToRefreshIndicatorProps {
  progress: number // 0-1
  isRefreshing: boolean
  shouldRefresh: boolean
  className?: string
}

export function PullToRefreshIndicator({
  progress,
  isRefreshing,
  shouldRefresh,
  className = '',
}: PullToRefreshIndicatorProps) {
  const translateY = Math.max(-60, progress * 60 - 60)
  const opacity = Math.min(1, progress * 2)

  return (
    <div
      className={`fixed top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-50 ${className}`}
      style={{
        transform: `translateY(${translateY}px)`,
        opacity: isRefreshing ? 1 : opacity,
      }}
      aria-hidden="true"
    >
      <div className="relative w-12 h-12">
        {/* Arrow indicator */}
        {!isRefreshing && (
          <div
            className="absolute inset-0 flex items-center justify-center transition-transform duration-150"
            style={{
              transform: `rotate(${progress * 180}deg)`,
              opacity: shouldRefresh ? 0 : 1,
            }}
          >
            <ArrowDown className="w-6 h-6 text-blue-500" />
          </div>
        )}

        {/* Refresh spinner */}
        {(isRefreshing || shouldRefresh) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2
              className="w-6 h-6 text-blue-500"
              style={{
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </div>
        )}

        {/* Progress ring */}
        <svg className="absolute inset-0 -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-slate-200 dark:text-slate-700"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-blue-500 transition-all duration-150"
            strokeDasharray={`${2 * Math.PI * 20}`}
            strokeDashoffset={2 * Math.PI * 20 * (1 - progress)}
            strokeLinecap="round"
          />
        </svg>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
