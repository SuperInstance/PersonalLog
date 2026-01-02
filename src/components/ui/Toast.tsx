/**
 * Toast Component
 *
 * Displays temporary notification messages with auto-dismiss.
 * Supports success, error, info, and warning variants.
 */

'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastProps {
  id: string
  message: string
  variant?: ToastVariant
  duration?: number
  onClose?: (id: string) => void
}

export function Toast({
  id,
  message,
  variant = 'info',
  duration = 5000,
  onClose,
}: ToastProps) {
  const [progress, setProgress] = useState(100)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (isPaused) return

    const interval = 50
    const step = 100 / (duration / interval)

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= step) {
          clearInterval(timer)
          onClose?.(id)
          return 0
        }
        return prev - step
      })
    }, interval)

    return () => clearInterval(timer)
  }, [duration, id, isPaused, onClose])

  const variants = {
    success: {
      container: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      icon: 'text-green-600 dark:text-green-400',
      Icon: CheckCircle,
    },
    error: {
      container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      Icon: AlertCircle,
    },
    info: {
      container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      Icon: Info,
    },
    warning: {
      container: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
      icon: 'text-amber-600 dark:text-amber-400',
      Icon: AlertTriangle,
    },
  }

  const { container, icon, Icon } = variants[variant]

  return (
    <div
      className={`${container} border rounded-lg shadow-lg p-4 min-w-[300px] max-w-md transition-all`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${icon}`} />
        <p className="flex-1 text-sm text-slate-900 dark:text-slate-100">{message}</p>
        <button
          onClick={() => onClose?.(id)}
          className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${variant === 'success' ? 'bg-green-500' : variant === 'error' ? 'bg-red-500' : variant === 'warning' ? 'bg-amber-500' : 'bg-blue-500'} transition-all`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
