/**
 * Accessibility Utilities
 *
 * Central exports for all accessibility features.
 *
 * @module accessibility
 */

// Keyboard shortcuts
export {
  useKeyboardShortcuts,
  presetShortcuts,
  formatShortcut,
  useShortcutHelp,
  type KeyboardShortcut,
  type KeyboardShortcutsConfig,
} from './hooks/useKeyboardShortcuts'

// Focus management
export {
  useFocusTrap,
  useFocusTrapRef,
  useFocusRestoration,
  useFocusManager,
  type UseFocusTrapOptions,
} from './hooks/useFocusTrap'

// Focus navigation provider
export {
  KeyboardNavigationProvider,
  useFocus,
  useFocusTrap as useNavigationFocusTrap,
  useFocusRestoration as useNavigationFocusRestoration,
  type FocusContextValue,
} from './components/providers/KeyboardNavigationProvider'

// Live announcer
export {
  LiveAnnouncerProvider,
  useLiveAnnouncer,
  useToastAnnouncer,
  useLoadingAnnouncer,
  LiveAnnouncer,
} from './components/ui/LiveAnnouncer'

// Keyboard shortcuts help
export {
  KeyboardShortcutsHelp,
  KeyboardShortcutsButton,
  useKeyboardShortcutsModal,
} from './components/ui/KeyboardShortcutsHelp'
