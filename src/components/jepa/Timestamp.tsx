/**
 * JEPA Timestamp Component
 *
 * Displays formatted timestamps for transcript segments.
 */

'use client'

import { memo } from 'react'
import { Clock } from 'lucide-react'
import { formatTimestamp } from '@/lib/jepa/transcript-formatter'

export interface TimestampProps {
  /**
   * Time in seconds from start of recording
   */
  seconds: number

  /**
   * Whether to show icon
   */
  showIcon?: boolean

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Click handler (for seeking to timestamp)
   */
  onClick?: () => void
}

export const Timestamp = memo(function Timestamp({
  seconds,
  showIcon = true,
  className = '',
  onClick,
}: TimestampProps) {
  const formatted = formatTimestamp(seconds)

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded-md
        text-xs font-mono font-medium
        bg-slate-100 dark:bg-slate-800
        text-slate-600 dark:text-slate-400
        hover:bg-slate-200 dark:hover:bg-slate-700
        transition-colors duration-150
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
        ${className}
      `}
      title={`Jump to ${formatted}`}
    >
      {showIcon && <Clock className="w-3 h-3" />}
      <span>{formatted}</span>
    </button>
  )
})
