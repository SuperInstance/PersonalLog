/**
 * LoadingState Component
 *
 * Enhanced loading states with animations, progress indicators, and skeleton patterns.
 * Provides visual feedback during async operations.
 *
 * @module components/ui/LoadingState
 */

'use client'

import { Loader2, LucideIcon } from 'lucide-react'
import { Skeleton, SkeletonText, SkeletonAvatar } from './Skeleton'

export interface LoadingStateProps {
  /**
   * Main message to display
   */
  message?: string

  /**
   * Detailed description of what's loading
   */
  description?: string

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Show progress bar (0-100)
   */
  progress?: number

  /**
   * Icon to display (defaults to Loader2)
   */
  icon?: LucideIcon

  /**
   * Custom className for styling
   */
  className?: string
}

export function LoadingState({
  message,
  description,
  size = 'md',
  progress,
  icon: Icon,
  className = '',
}: LoadingStateProps) {
  const sizeStyles = {
    sm: {
      icon: 'w-4 h-4',
      text: 'text-sm',
    },
    md: {
      icon: 'w-6 h-6',
      text: 'text-base',
    },
    lg: {
      icon: 'w-8 h-8',
      text: 'text-lg',
    },
  }

  const styles = sizeStyles[size]

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      {/* Spinning Icon */}
      {Icon ? (
        <Icon className={`${styles.icon} text-blue-500 animate-spin`} />
      ) : (
        <Loader2 className={`${styles.icon} text-blue-500 animate-spin`} />
      )}

      {/* Message */}
      {message && (
        <p className={`${styles.text} font-medium text-slate-900 dark:text-slate-100 mt-4`}>
          {message}
        </p>
      )}

      {/* Description */}
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm text-center">
          {description}
        </p>
      )}

      {/* Progress Bar */}
      {progress !== undefined && (
        <div className="w-full max-w-xs mt-4">
          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
            {Math.round(progress)}%
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Loading overlay for sections/components
 */

export interface LoadingOverlayProps {
  /**
   * Whether the overlay is visible
   */
  isLoading: boolean

  /**
   * Content being loaded
   */
  children: React.ReactNode

  /**
   * Loading message
   */
  message?: string

  /**
   * Background blur intensity
   */
  blur?: 'sm' | 'md' | 'lg' | 'none'

  /**
   * Custom className for styling
   */
  className?: string
}

export function LoadingOverlay({
  isLoading,
  children,
  message,
  blur = 'sm',
  className = '',
}: LoadingOverlayProps) {
  const blurStyles = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    none: '',
  }

  return (
    <div className={`relative ${className}`}>
      {children}

      {isLoading && (
        <div className={`absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-950/50 ${blurStyles[blur]} rounded-lg`}>
          <LoadingState message={message} size="sm" />
        </div>
      )}
    </div>
  )
}

/**
 * Loading skeleton patterns for common UI scenarios
 */

export function ConversationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
          <SkeletonAvatar size={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="w-3/4 h-4" />
            <Skeleton variant="text" className="w-1/2 h-3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MessageListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <SkeletonAvatar size={32} />
          <div className="flex-1 max-w-[80%] space-y-2">
            <Skeleton variant="rectangular" className="h-16 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <SkeletonAvatar size={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/3 h-5" />
          <Skeleton variant="text" className="w-1/4 h-4" />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" className="h-10 w-24" />
        <Skeleton variant="rectangular" className="h-10 w-24" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 p-3 border-b border-slate-200 dark:border-slate-800">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} variant="text" className="flex-1 h-4" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 p-3">
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton key={col} variant="text" className="flex-1 h-4" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Inline loading spinner for buttons and small components
 */

export interface SpinnerProps {
  /**
   * Size variant
   */
  size?: 'xs' | 'sm' | 'md' | 'lg'

  /**
   * Custom color class
   */
  color?: string

  /**
   * Custom className for styling
   */
  className?: string
}

export function Spinner({ size = 'md', color = 'text-blue-500', className = '' }: SpinnerProps) {
  const sizeStyles = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  return (
    <Loader2 className={`${sizeStyles[size]} ${color} animate-spin ${className}`} />
  )
}

/**
 * Page-level loading state
 */

export function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingState
        message="Loading..."
        description="Please wait while we prepare your content"
        size="lg"
      />
    </div>
  )
}
