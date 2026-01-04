/**
 * Modal Component
 *
 * Accessible modal dialog with backdrop, animations, and focus trapping.
 *
 * @module components/ui/Modal
 */

'use client'

import { ReactNode, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export interface ModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean

  /**
   * Callback when modal should close
   */
  onClose: () => void

  /**
   * Modal title
   */
  title?: string

  /**
   * Modal content
   */
  children: ReactNode

  /**
   * Footer content (usually action buttons)
   */
  footer?: ReactNode

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'

  /**
   * Whether to show close button
   */
  showCloseButton?: boolean

  /**
   * Whether clicking backdrop closes modal
   */
  closeOnBackdropClick?: boolean

  /**
   * Whether pressing Escape closes modal
   */
  closeOnEscape?: boolean

  /**
   * Custom className for modal content
   */
  className?: string
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className = '',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  }

  // Handle focus trapping
  useEffect(() => {
    if (!isOpen) return

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement

    // Focus the modal
    modalRef.current?.focus()

    // Return focus to previous element when modal closes
    return () => {
      previousActiveElement.current?.focus()
    }
  }, [isOpen])

  // Handle Escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return

    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`${sizeStyles[size]} w-full relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl animate-scale-in max-h-[90vh] flex flex-col ${className}`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Confirm Dialog Modal
 */

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const variantStyles = {
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    info: 'bg-blue-500 hover:bg-blue-600 text-white',
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${variantStyles[variant]}`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-slate-700 dark:text-slate-300">{message}</p>
    </Modal>
  )
}

/**
 * Alert Dialog Modal
 */

export interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  buttonLabel?: string
  variant?: 'success' | 'error' | 'warning' | 'info'
}

export function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  buttonLabel = 'OK',
  variant = 'info',
}: AlertDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 active:scale-95"
        >
          {buttonLabel}
        </button>
      }
    >
      <p className="text-slate-700 dark:text-slate-300">{message}</p>
    </Modal>
  )
}
