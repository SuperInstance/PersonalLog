/**
 * Button Component
 */

'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed hover:scale-105 active:scale-95 transform'

    const variants = {
      default: 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-700 shadow-sm hover:shadow-md',
      outline: 'border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:border-slate-600 dark:active:bg-slate-700',
      ghost: 'text-slate-700 hover:bg-slate-100 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 dark:active:bg-slate-700',
      destructive: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 dark:active:bg-red-700 shadow-sm hover:shadow-md hover:shadow-red-500/20',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
