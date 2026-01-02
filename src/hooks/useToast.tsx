/**
 * useToast Hook
 *
 * Provides toast notification functionality.
 * Can be used from any component to show notifications.
 */

'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { ToastVariant } from '@/components/ui/Toast'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
  duration: number
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (message: string, variant?: ToastVariant, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration: number = 5000) => {
      const id = Math.random().toString(36).substr(2, 9)
      const toast: Toast = { id, message, variant, duration }

      setToasts(prev => [...prev, toast])
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  return context
}
