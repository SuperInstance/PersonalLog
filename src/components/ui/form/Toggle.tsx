'use client'

/**
 * Toggle Switch
 *
 * On/off toggle switch component.
 */

import { forwardRef } from 'react'

interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  helperText?: string
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ label, helperText, className = '', checked, disabled = false, ...props }, ref) => {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => {
            if (ref && 'current' in ref && ref.current) {
              ref.current.click()
            }
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            checked
              ? 'bg-blue-500'
              : 'bg-slate-200 dark:bg-slate-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              checked ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <input
          ref={ref}
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          {...props}
        />
        {(label || helperText) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {label}
              </span>
            )}
            {helperText && (
              <span className="text-xs text-slate-500">
                {helperText}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }
)

Toggle.displayName = 'Toggle'
