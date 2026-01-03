'use client'

/**
 * useKeyboardShortcuts Hook
 *
 * Global keyboard shortcut management for the application.
 *
 * Provides power user keyboard shortcuts and ensures accessibility
 * through keyboard-only navigation.
 *
 * SHORTCUTS:
 * - Cmd+K / Ctrl+K: New conversation
 * - Cmd+/ / Ctrl+/: Focus search
 * - Cmd+. / Ctrl+.: Open settings
 * - Esc: Close modals/drawers
 * - Cmd+N / Ctrl+N: Next conversation
 * - Cmd+P / Ctrl+P: Previous conversation
 * - Cmd+Enter / Ctrl+Enter: Send message
 *
 * @module hooks/useKeyboardShortcuts
 */

import { useEffect, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  handler: (event: KeyboardEvent) => void
  description: string
}

export interface KeyboardShortcutsConfig {
  shortcuts: KeyboardShortcut[]
  disabled?: boolean
  preventDefault?: boolean
}

/**
 * Check if a keyboard event matches a shortcut configuration
 */
function matchesShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut
): boolean {
  return (
    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
    !!event.ctrlKey === !!shortcut.ctrlKey &&
    !!event.metaKey === !!shortcut.metaKey &&
    !!event.shiftKey === !!shortcut.shiftKey &&
    !!event.altKey === !!shortcut.altKey
  )
}

/**
 * Hook to register and manage keyboard shortcuts
 *
 * Automatically cleans up event listeners on unmount.
 * Prevents default browser behavior for registered shortcuts.
 *
 * @param config - Shortcut configuration
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     {
 *       key: 'k',
 *       metaKey: true,
 *       ctrlKey: true,
 *       handler: () => console.log('New chat'),
 *       description: 'New conversation'
 *     }
 *   ]
 * })
 * ```
 */
export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const { shortcuts, disabled = false, preventDefault = true } = config

  // Keep track of registered handlers for cleanup
  const handlersRef = useRef(new Map<string, (event: KeyboardEvent) => void>())

  useEffect(() => {
    if (disabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field (unless it's Esc)
      const isTyping =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable

      if (isTyping && event.key !== 'Escape') {
        return
      }

      // Check each shortcut
      for (const shortcut of shortcuts) {
        if (matchesShortcut(event, shortcut)) {
          if (preventDefault) {
            event.preventDefault()
            event.stopPropagation()
          }

          shortcut.handler(event)
          break
        }
      }
    }

    // Register all shortcuts
    shortcuts.forEach((shortcut) => {
      const key = JSON.stringify({
        key: shortcut.key,
        ctrlKey: shortcut.ctrlKey,
        metaKey: shortcut.metaKey,
        shiftKey: shortcut.shiftKey,
        altKey: shortcut.altKey,
      })
      handlersRef.current.set(key, shortcut.handler)
    })

    // Add event listener
    document.addEventListener('keydown', handleKeyDown, { passive: !preventDefault })

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      handlersRef.current.clear()
    }
  }, [shortcuts, disabled, preventDefault])
}

/**
 * Preset shortcuts for common actions
 */
export const presetShortcuts = {
  newConversation: {
    key: 'k',
    metaKey: true,
    ctrlKey: true,
    description: 'New conversation',
    handler: () => {},
  } satisfies KeyboardShortcut,

  focusSearch: {
    key: '/',
    metaKey: true,
    ctrlKey: true,
    description: 'Focus search',
    handler: () => {},
  } satisfies KeyboardShortcut,

  openSettings: {
    key: '.',
    metaKey: true,
    ctrlKey: true,
    description: 'Open settings',
    handler: () => {},
  } satisfies KeyboardShortcut,

  closeModals: {
    key: 'Escape',
    description: 'Close modals/drawers',
    handler: () => {},
  } satisfies KeyboardShortcut,

  nextConversation: {
    key: 'n',
    metaKey: true,
    ctrlKey: true,
    description: 'Next conversation',
    handler: () => {},
  } satisfies KeyboardShortcut,

  previousConversation: {
    key: 'p',
    metaKey: true,
    ctrlKey: true,
    description: 'Previous conversation',
    handler: () => {},
  } satisfies KeyboardShortcut,

  sendMessage: {
    key: 'Enter',
    metaKey: true,
    ctrlKey: true,
    description: 'Send message',
    handler: () => {},
  } satisfies KeyboardShortcut,
}

/**
 * Helper to format shortcut for display in UI
 *
 * @example
 * formatShortcut({ key: 'k', metaKey: true }) // "⌘K" on Mac, "Ctrl+K" on Windows
 */
export function formatShortcut(shortcut: Partial<KeyboardShortcut>): string {
  const parts: string[] = []

  if (shortcut.ctrlKey) parts.push('Ctrl')
  if (shortcut.metaKey) parts.push(typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘' : 'Win')
  if (shortcut.altKey) parts.push('Alt')
  if (shortcut.shiftKey) parts.push('Shift')
  parts.push(shortcut.key?.toUpperCase() || '')

  return parts.join('+')
}

/**
 * Hook to get all registered shortcuts as a help menu
 *
 * Useful for displaying keyboard shortcut help to users
 */
export function useShortcutHelp(): Map<string, string> {
  const helpMap = useRef(new Map<string, string>())

  useEffect(() => {
    // Add all preset shortcuts
    Object.entries(presetShortcuts).forEach(([key, shortcut]) => {
      helpMap.current.set(formatShortcut(shortcut), shortcut.description)
    })
  }, [])

  return helpMap.current
}
