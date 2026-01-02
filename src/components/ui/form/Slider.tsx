'use client'

/**
 * Slider
 *
 * Range slider with value display.
 */

import { forwardRef } from 'react'

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  min?: number
  max?: number
  step?: number
  valueLabel?: string
  showValue?: boolean
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, helperText, min = 0, max = 100, step = 1, valueLabel, showValue = true, className = '', ...props }, ref) => {
    return (
      <div className={`w-full ${className}`}>
        {label && (
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {label}
            </label>
            {showValue && (
              <span className="text-sm text-slate-500">
                {valueLabel || `${props.value}`}
              </span>
            )}
          </div>
        )}
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          {...props}
        />
        {helperText && (
          <p className="mt-1 text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Slider.displayName = 'Slider'
