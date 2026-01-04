/**
 * EmptyState Component
 *
 * Reusable empty state component with illustrations, actions, and helpful messaging.
 * Provides consistent empty states across the application.
 *
 * @module components/ui/EmptyState
 */

'use client'

import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

export interface EmptyStateProps {
  /**
   * Icon to display (Lucide icon component)
   */
  icon?: LucideIcon

  /**
   * Custom illustration element
   */
  illustration?: ReactNode

  /**
   * Main heading text
   */
  title: string

  /**
   * Descriptive text below title
   */
  description?: string

  /**
   * Primary action button
   */
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }

  /**
   * Secondary action link/button
   */
  secondaryAction?: {
    label: string
    onClick: () => void
  }

  /**
   * Additional footer content
   */
  footer?: ReactNode

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Custom className for styling
   */
  className?: string
}

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  action,
  secondaryAction,
  footer,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const sizeStyles = {
    sm: {
      icon: 'w-8 h-8',
      illustration: 'w-16 h-16',
      title: 'text-sm',
      description: 'text-xs',
    },
    md: {
      icon: 'w-12 h-12',
      illustration: 'w-20 h-20',
      title: 'text-base',
      description: 'text-sm',
    },
    lg: {
      icon: 'w-16 h-16',
      illustration: 'w-24 h-24',
      title: 'text-lg',
      description: 'text-base',
    },
  }

  const styles = sizeStyles[size]

  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 ${className}`}>
      {/* Icon or Illustration */}
      {Icon && (
        <div className={`${styles.icon} text-slate-300 dark:text-slate-700 mb-4`}>
          <Icon className="w-full h-full" strokeWidth={1.5} />
        </div>
      )}
      {illustration && (
        <div className={`${styles.illustration} mb-4`}>
          {illustration}
        </div>
      )}

      {/* Title */}
      <h3 className={`${styles.title} font-semibold text-slate-900 dark:text-slate-100 mb-2`}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={`${styles.description} text-slate-500 dark:text-slate-400 max-w-sm mb-6`}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
            >
              {action.icon && <action.icon className="w-4 h-4" />}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      {footer && (
        <div className="mt-6">
          {footer}
        </div>
      )}
    </div>
  )
}

/**
 * Pre-configured empty states for common scenarios
 */

export function EmptyConversations({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      title="No conversations yet"
      description="Start your first conversation to begin using PersonalLog"
      action={{
        label: 'New Conversation',
        onClick: onCreate,
      }}
      size="lg"
    />
  )
}

export function EmptyMessages({ hasAI }: { hasAI?: boolean }) {
  return (
    <EmptyState
      title="No messages yet"
      description={
        hasAI
          ? "Start a conversation by sending a message to your AI assistant"
          : "Start by writing a note to yourself"
      }
      size="md"
    />
  )
}

export function EmptySearch({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <EmptyState
      title="No results found"
      description={`We couldn't find anything matching "${query}"`}
      secondaryAction={{
        label: 'Clear search',
        onClick: onClear,
      }}
      size="md"
    />
  )
}

export function EmptyKnowledge({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      title="Your knowledge base is empty"
      description="Add documents and notes to build your personal knowledge graph"
      action={{
        label: 'Add Knowledge',
        onClick: onAdd,
      }}
      size="lg"
    />
  )
}

export function EmptyFiles({ onUpload }: { onUpload: () => void }) {
  return (
    <EmptyState
      title="No files attached"
      description="Attach files to this conversation for context"
      action={{
        label: 'Attach File',
        onClick: onUpload,
      }}
      size="md"
    />
  )
}

export function EmptySelection({ onDismiss }: { onDismiss: () => void }) {
  return (
    <EmptyState
      title="No messages selected"
      description="Select messages to perform actions on them"
      secondaryAction={{
        label: 'Close',
        onClick: onDismiss,
      }}
      size="sm"
    />
  )
}
