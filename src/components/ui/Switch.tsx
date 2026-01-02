/**
 * Switch Component
 */

'use client'

import { useState, useEffect } from 'react'

export interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function Switch({ checked, onCheckedChange, disabled = false, className = '' }: SwitchProps) {
  const [internalChecked, setInternalChecked] = useState(checked)

  useEffect(() => {
    setInternalChecked(checked)
  }, [checked])

  const handleChange = () => {
    if (disabled) return
    const newValue = !internalChecked
    setInternalChecked(newValue)
    onCheckedChange(newValue)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={internalChecked}
      onClick={handleChange}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${internalChecked ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${internalChecked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  )
}
