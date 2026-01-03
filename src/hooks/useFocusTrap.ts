'use client'

/**
 * useFocusTrap Hook
 *
 * Manages focus trapping within containers (modals, dialogs, etc.).
 *
 * Ensures keyboard users cannot tab outside of a modal or dialog.
 * Automatically restores focus when the trap is deactivated.
 *
 * FEATURES:
 * - Trap focus within element
 * - Return focus on unmount
 * - Handle Escape key
 * - Handle Tab/Shift+Tab cycling
 * - Auto-focus first element
 * - Support for autoFocus prop
 *
 * @module hooks/useFocusTrap
 */

import { useEffect, useRef, useCallback, RefObject } from 'react'

export interface UseFocusTrapOptions {
  /** Whether focus trap is active */
  enabled?: boolean
  /** Whether to auto-focus first element on activation */
  autoFocus?: boolean
  /** Element to focus initially (overrides auto-focus) */
  initialFocus?: RefObject<HTMLElement> | string
  /** Element to return focus to on deactivation */
  returnFocus?: RefObject<HTMLElement> | HTMLElement | null
  /** Whether to restore focus on deactivation */
  restoreFocus?: boolean
  /** Callback when Escape is pressed */
  onEscape?: () => void
}

/**
 * Find all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ')

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
}

/**
 * Get the element that should be focused initially
 */
function getInitialFocusElement(
  container: HTMLElement,
  options: UseFocusTrapOptions
): HTMLElement | null {
  // If specific element provided
  if (options.initialFocus) {
    if (typeof options.initialFocus === 'string') {
      // Selector string
      return container.querySelector(options.initialFocus)
    } else if (options.initialFocus.current) {
      // Ref object
      return options.initialFocus.current
    }
  }

  // Otherwise, find first focusable element
  const focusableElements = getFocusableElements(container)
  return focusableElements[0] || null
}

/**
 * Hook to trap focus within a container element
 *
 * @example
 * ```tsx
 * const modalRef = useRef<HTMLDivElement>(null)
 * useFocusTrap({
 *   container: modalRef,
 *   enabled: isOpen,
 *   onEscape: () => setIsOpen(false)
 * })
 * ```
 */
export function useFocusTrap(options: UseFocusTrapOptions = {}) {
  const {
    enabled = true,
    autoFocus = true,
    initialFocus,
    returnFocus: returnFocusProp,
    restoreFocus = true,
    onEscape,
  } = options

  const containerRef = useRef<HTMLElement | null>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)
  const isInitializedRef = useRef(false)

  useEffect(() => {
    if (!enabled || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = getFocusableElements(container)

    if (focusableElements.length === 0) {
      // No focusable elements, make container focusable
      if (container.tabIndex === -1) {
        container.tabIndex = -1
      }
      focusableElements.push(container)
    }

    // Save current focus for restoration
    if (!previousActiveElementRef.current && restoreFocus) {
      previousActiveElementRef.current = document.activeElement as HTMLElement
    }

    // Set initial focus
    if (autoFocus && !isInitializedRef.current) {
      const elementToFocus = getInitialFocusElement(container, { initialFocus })
      if (elementToFocus) {
        elementToFocus.focus()
        isInitializedRef.current = true
      }
    }

    // Handle Tab key to trap focus
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' && event.key !== 'Escape') return

      // Handle Escape key
      if (event.key === 'Escape') {
        onEscape?.()
        return
      }

      // Handle Tab cycling
      const firstElement = focusableElements[0]
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

    container.addEventListener('keydown', handleKeyDown, true)

    // Cleanup
    return () => {
      container.removeEventListener('keydown', handleKeyDown, true)

      // Restore focus
      if (restoreFocus) {
        const elementToReturn = returnFocusProp
          ? (typeof returnFocusProp === 'object' && 'current' in returnFocusProp
              ? returnFocusProp.current
              : returnFocusProp)
          : previousActiveElementRef.current

        if (elementToReturn) {
          elementToReturn.focus()
        }
      }

      isInitializedRef.current = false
    }
  }, [enabled, autoFocus, initialFocus, returnFocusProp, restoreFocus, onEscape])

  return {
    /** Ref to attach to the container element */
    ref: containerRef,
    /** Manually set focus to first focusable element */
    focusFirst: () => {
      if (containerRef.current) {
        const focusableElements = getFocusableElements(containerRef.current)
        focusableElements[0]?.focus()
      }
    },
    /** Manually set focus to last focusable element */
    focusLast: () => {
      if (containerRef.current) {
        const focusableElements = getFocusableElements(containerRef.current)
        focusableElements[focusableElements.length - 1]?.focus()
      }
    },
  }
}

/**
 * Simplified hook that returns only the ref
 *
 * @example
 * ```tsx
 * const trapRef = useFocusTrapRef(isOpen)
 * return <div ref={trapRef}>...</div>
 * ```
 */
export function useFocusTrapRef(enabled = true): RefObject<HTMLElement | null> {
  const { ref } = useFocusTrap({ enabled })
  return ref
}

/**
 * Hook to manage focus restoration on unmount
 *
 * Automatically saves focus on mount and restores it on unmount.
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

/**
 * Hook to manage manual focus with restoration
 *
 * Use this when you need to programmatically move focus but want to
 * ensure it can be restored later.
 *
 * @example
 * ```tsx
 * const { setFocus, restoreFocus, saveFocus } = useFocusManager()
 *
 * const openModal = () => {
 *   saveFocus()
 *   modalRef.current?.focus()
 * }
 *
 * const closeModal = () => {
 *   restoreFocus()
 * }
 * ```
 */
export function useFocusManager() {
  const savedFocusRef = useRef<HTMLElement | null>(null)

  const setFocus = useCallback((element: HTMLElement | null) => {
    element?.focus()
  }, [])

  const saveFocus = useCallback(() => {
    savedFocusRef.current = document.activeElement as HTMLElement
  }, [])

  const restoreFocus = useCallback(() => {
    savedFocusRef.current?.focus()
  }, [])

  return {
    setFocus,
    saveFocus,
    restoreFocus,
  }
}
