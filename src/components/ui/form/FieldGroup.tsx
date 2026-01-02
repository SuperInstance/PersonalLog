'use client'

/**
 * Field Group
 *
 * Container component for grouping related form fields.
 */

import { ReactNode } from 'react'

interface FieldGroupProps {
  children: ReactNode
  title?: string
  description?: string
  className?: string
}

export function FieldGroup({ children, title, description, className = '' }: FieldGroupProps) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 ${className}`}>
      {title && (
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {description}
        </p>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}
