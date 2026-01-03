'use client'

/**
 * KeyboardShortcutsHelp Component
 *
 * Displays a modal/dialog showing all available keyboard shortcuts.
 *
 * Accessible via Cmd+/ (Ctrl+/) keyboard shortcut.
 *
 * @module components/ui/KeyboardShortcutsHelp
 */

import React, { useCallback } from 'react'
import { X } from 'lucide-react'
import { useKeyboardShortcuts, formatShortcut, presetShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useFocusRestoration } from '@/hooks/useFocusTrap'

interface ShortcutCategory {
  title: string
  shortcuts: Array<{
    keys: string
    description: string
  }>
}

const shortcutCategories: ShortcutCategory[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: '⌘K', description: 'New conversation' },
      { keys: '⌘N', description: 'Next conversation' },
      { keys: '⌘P', description: 'Previous conversation' },
      { keys: '⌘/', description: 'Open keyboard shortcuts' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: '⌘Enter', description: 'Send message' },
      { keys: 'Escape', description: 'Close modal/drawer' },
      { keys: '⌘.', description: 'Open settings' },
    ],
  },
  {
    title: 'Editor',
    shortcuts: [
      { keys: 'Enter', description: 'Send message' },
      { keys: 'Shift+Enter', description: 'New line in message' },
      { keys: 'Tab', description: 'Next field' },
      { keys: 'Shift+Tab', description: 'Previous field' },
    ],
  },
]

interface KeyboardShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Keyboard shortcuts help modal
 *
 * Shows all available keyboard shortcuts in an organized layout.
 * Includes focus trap and accessibility features.
 */
export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const modalRef = React.useRef<HTMLDivElement>(null)

  // Focus restoration
  useFocusRestoration()

  // Focus trap when modal is open
  useFocusTrap({
    enabled: isOpen,
    autoFocus: true,
    onEscape: onClose,
  })

  // Register keyboard shortcut to open this modal
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: '/',
        metaKey: true,
        ctrlKey: true,
        handler: () => {
          if (!isOpen) {
            // This would be handled by parent component
          }
        },
        description: 'Open keyboard shortcuts',
      },
    ],
    disabled: isOpen, // Don't register when already open
  })

  // Handle background click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      aria-labelledby="keyboard-shortcuts-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
        role="document"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <h2
            id="keyboard-shortcuts-title"
            className="text-2xl font-semibold text-slate-900 dark:text-slate-100"
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close keyboard shortcuts"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-8">
            {shortcutCategories.map((category) => (
              <div key={category.title}>
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                  {category.title}
                </h3>
                <div className="space-y-2">
                  {category.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.keys}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <span className="text-slate-700 dark:text-slate-300">
                        {shortcut.description}
                      </span>
                      <kbd className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-mono rounded border border-slate-300 dark:border-slate-700 min-w-[4rem] text-center">
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Tip */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              <strong>Tip:</strong> Use <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">⌘</kbd> on Mac or <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">Ctrl</kbd> on Windows/Linux
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Simple button to trigger the keyboard shortcuts modal
 */
export function KeyboardShortcutsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      aria-label="View keyboard shortcuts"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
        />
      </svg>
      <span>Keyboard Shortcuts</span>
      <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-xs rounded border border-slate-300 dark:border-slate-700">
        ⌘/
      </kbd>
    </button>
  )
}

/**
 * Hook to manage keyboard shortcuts modal state
 */
export function useKeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = React.useState(false)

  // Register keyboard shortcut
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: '/',
        metaKey: true,
        ctrlKey: true,
        handler: () => setIsOpen(true),
        description: 'Open keyboard shortcuts',
      },
    ],
  })

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  }
}
