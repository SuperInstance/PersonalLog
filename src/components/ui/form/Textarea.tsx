'use client'

/**
 * Textarea Field
 *
 * Textarea with auto-resize support.
 */

import { forwardRef, useEffect, useState } from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  autoResize?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, autoResize = false, className = '', value, onChange, ...props }, ref) => {
    const [internalValue, setInternalValue] = useState(value)

    // Handle auto-resize
    const textareaRef = ref as React.MutableRefObject<HTMLTextAreaElement | null>

    useEffect(() => {
      if (autoResize && textareaRef?.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      }
    }, [internalValue, autoResize, textareaRef])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInternalValue(e.target.value)
      if (onChange) {
        onChange(e)
      }
    }

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          value={value}
          onChange={handleChange}
          className={`w-full px-4 py-3 bg-white dark:bg-slate-900 border rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
          } ${autoResize ? 'overflow-hidden' : ''} ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
