/**
 * ToastProvider Component
 *
 * Wraps the app and renders toast notifications.
 * Should be placed at the root of the app.
 */

'use client'

import { ToastProvider as ToastContextProvider, useToast } from '@/hooks/useToast'
import { Toast } from '@/components/ui/Toast'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastContextProvider>
      {children}
      <ToastContainer />
    </ToastContextProvider>
  )
}

function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          variant={toast.variant}
          duration={toast.duration}
          onClose={removeToast}
        />
      ))}
    </div>
  )
}
