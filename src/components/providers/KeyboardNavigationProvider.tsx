'use client'

/**
 * KeyboardNavigationProvider
 *
 * Provides global keyboard navigation and focus management.
 *
 * FEATURES:
 * - Tracks focused element globally
 * - Handles focus-visible styling (only show focus ring on keyboard navigation)
 * - Skip links for screen readers
 * - Focus restoration after modal close
 * - Custom Tab/Shift+Tab navigation
 *
 * @module components/providers/KeyboardNavigationProvider
 */

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'

interface FocusContextValue {
  /** Current focused element */
  focusedElement: HTMLElement | null
  /** Previous focused element (for restoration) */
  previousFocusedElement: HTMLElement | null
  /** Restore focus to previous element */
  restoreFocus: () => void
  /** Save current focus for later restoration */
  saveFocus: () => void
  /** Set focused element (for manual control) */
  setFocusedElement: (element: HTMLElement | null) => void
}

const FocusContext = createContext<FocusContextValue | undefined>(undefined)

export function useFocus() {
  const context = useContext(FocusContext)
  if (!context) {
    throw new Error('useFocus must be used within KeyboardNavigationProvider')
  }
  return context
}

interface KeyboardNavigationProviderProps {
  children: React.ReactNode
  /** Enable focus-visible class tracking */
  trackFocusVisible?: boolean
  /** Enable skip links functionality */
  enableSkipLinks?: boolean
}

/**
 * Provider component for keyboard navigation
 *
 * Wraps the application to provide focus management and keyboard navigation features.
 */
export function KeyboardNavigationProvider({
  children,
  trackFocusVisible = true,
  enableSkipLinks = true,
}: KeyboardNavigationProviderProps) {
  const [focusedElement, setFocusedElementState] = useState<HTMLElement | null>(null)
  const previousFocusedElementRef = useRef<HTMLElement | null>(null)
  const isKeyboardNavRef = useRef(false)
  const hasPointerMovedRef = useRef(false)

  /**
   * Handle focusin event to track focused element
   */
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement
      setFocusedElementState(target)

      // Add focus-visible class if keyboard navigation
      if (trackFocusVisible && isKeyboardNavRef.current) {
        target.classList.add('focus-visible')
        isKeyboardNavRef.current = false
      }
    }

    const handleFocusOut = (event: FocusEvent) => {
      const target = event.target as HTMLElement
      target.classList.remove('focus-visible')
    }

    // Track keyboard navigation
    const handleKeyDown = () => {
      isKeyboardNavRef.current = true
      hasPointerMovedRef.current = false
    }

    // Track pointer usage
    const handlePointerDown = () => {
      isKeyboardNavRef.current = false
      hasPointerMovedRef.current = true
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)
    document.addEventListener('keydown', handleKeyDown, { capture: true })
    document.addEventListener('pointerdown', handlePointerDown, { capture: true })

    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true })
    }
  }, [trackFocusVisible])

  /**
   * Restore focus to previous element
   */
  const restoreFocus = useCallback(() => {
    const element = previousFocusedElementRef.current
    if (element) {
      element.focus()
    }
  }, [])

  /**
   * Save current focus for later restoration
   */
  const saveFocus = useCallback(() => {
    previousFocusedElementRef.current = document.activeElement as HTMLElement
  }, [])

  /**
   * Set focused element manually
   */
  const setFocusedElement = useCallback((element: HTMLElement | null) => {
    setFocusedElementState(element)
    if (element) {
      element.focus()
    }
  }, [])

  const contextValue: FocusContextValue = {
    focusedElement,
    previousFocusedElement: previousFocusedElementRef.current,
    restoreFocus,
    saveFocus,
    setFocusedElement,
  }

  return (
    <FocusContext.Provider value={contextValue}>
      {enableSkipLinks && <SkipLinks />}
      {children}
    </FocusContext.Provider>
  )
}

/**
 * Skip links component for accessibility
 *
 * Provides "Skip to main content" links that appear on focus.
 * Critical for keyboard and screen reader users.
 */
function SkipLinks() {
  return (
    <>
      <a
        href="#main-content"
        className="
          sr-only
          focus:not-sr-only
          focus:absolute
          focus:top-4
          focus:left-4
          focus:z-50
          focus:px-4
          focus:py-2
          focus:bg-blue-600
          focus:text-white
          focus:rounded-lg
          focus:font-medium
          focus:shadow-lg
          focus:outline-none
        "
      >
        Skip to main content
      </a>
      <a
        href="#main-navigation"
        className="
          sr-only
          focus:not-sr-only
          focus:absolute
          focus:top-4
          focus:right-4
          focus:z-50
          focus:px-4
          focus:py-2
          focus:bg-blue-600
          focus:text-white
          focus:rounded-lg
          focus:font-medium
          focus:shadow-lg
          focus:outline-none
        "
      >
        Skip to navigation
      </a>
    </>
  )
}

/**
 * Hook to manage focus trap within a container
 *
 * Useful for modals, dialogs, and dropdowns.
 *
 * @param container - Container element reference
 * @param enabled - Whether focus trap is active
 *
 * @example
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null)
 * useFocusTrap({ container: ref, enabled: isOpen })
 * ```
 */
export function useFocusTrap({
  container,
  enabled = true,
}: {
  container: React.RefObject<HTMLElement>
  enabled?: boolean
}) {
  const previousFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!enabled || !container.current) return

    const containerElement = container.current

    // Save current focus
    previousFocusedRef.current = document.activeElement as HTMLElement

    // Find all focusable elements
    const focusableElements = containerElement.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length === 0) return

    // Focus first element
    const firstElement = focusableElements[0]
    firstElement.focus()

    // Handle Tab key to trap focus
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const lastElement = focusableElements[focusableElements.length - 1]

      // Shift+Tab on first element -> wrap to last
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
      // Tab on last element -> wrap to first
      else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    containerElement.addEventListener('keydown', handleKeyDown)

    // Cleanup: restore focus
    return () => {
      containerElement.removeEventListener('keydown', handleKeyDown)
      previousFocusedRef.current?.focus()
    }
  }, [container, enabled])
}

/**
 * Hook to manage focus restoration on unmount
 *
 * Automatically restores focus when a component unmounts.
 *
 * @example
 * ```tsx
 * useFocusRestoration()
 * // Focus will be restored when component unmounts
 * ```
 */
export function useFocusRestoration() {
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    // Save focus on mount
    previousFocusRef.current = document.activeElement as HTMLElement

    // Restore focus on unmount
    return () => {
      previousFocusRef.current?.focus()
    }
  }, [])
}
