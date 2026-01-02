/**
 * Slider Component
 */

'use client'

import { useState, useEffect } from 'react'

export interface SliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className = '',
}: SliderProps) {
  const [internalValue, setInternalValue] = useState(value)

  useEffect(() => {
    setInternalValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const newValue = parseFloat(e.target.value)
    setInternalValue(newValue)
    onChange(newValue)
  }

  const percentage = ((internalValue - min) / (max - min)) * 100

  return (
    <div className={`relative w-full h-6 flex items-center ${className}`}>
      <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-blue-600 dark:bg-blue-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={internalValue}
        onChange={handleChange}
        disabled={disabled}
        className={`
          absolute w-full h-2 opacity-0 cursor-pointer
          ${disabled ? 'cursor-not-allowed' : ''}
        `}
      />
      <div
        className={`
          absolute w-5 h-5 bg-white border-2 border-blue-600 dark:border-blue-500 rounded-full shadow
          transition-all pointer-events-none
          ${disabled ? 'opacity-50' : ''}
        `}
        style={{ left: `calc(${percentage}% - 10px)` }}
      />
    </div>
  )
}
