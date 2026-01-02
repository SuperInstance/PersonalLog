# Integration Examples: Keyboard & Accessibility Features

## Complete Component Integration Example

Here's how to integrate all the keyboard and accessibility features into a typical PersonalLog component:

```tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useKeyboardShortcuts, presetShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useFocusTrap, useFocusRestoration } from '@/hooks/useFocusTrap'
import { useLiveAnnouncer, useToastAnnouncer, useLoadingAnnouncer } from '@/components/ui/LiveAnnouncer'
import { KeyboardShortcutsHelp, useKeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsHelp'

export default function MessengerPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Live announcers for screen readers
  const { announce, announceStatus, announceAlert } = useLiveAnnouncer()
  const { announceToast } = useToastAnnouncer()
  const { announceLoadingStart, announceLoadingEnd, announceLoadingProgress } = useLoadingAnnouncer()

  // Keyboard shortcuts modal
  const { isOpen: shortcutsOpen, close: closeShortcuts } = useKeyboardShortcutsModal()

  // Register global keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        ...presetShortcuts.newConversation,
        handler: handleNewConversation,
      },
      {
        ...presetShortcuts.focusSearch,
        handler: focusSearchInput,
      },
      {
        ...presetShortcuts.nextConversation,
        handler: navigateToNextConversation,
      },
      {
        ...presetShortcuts.previousConversation,
        handler: navigateToPreviousConversation,
      },
      {
        ...presetShortcuts.openSettings,
        handler: openSettings,
      },
    ],
  })

  // Handle new conversation
  const handleNewConversation = useCallback(async () => {
    try {
      setIsLoading(true)
      announceLoadingStart('Creating new conversation')

      const newConv = await createConversation('New Conversation', 'personal')

      announceLoadingEnd('New conversation created')
      announceStatus('Created new conversation')

      router.push(`/messenger/${newConv.id}`)
      announceToast('New conversation created', 'success')
    } catch (error) {
      announceLoadingEnd()
      announceAlert(`Failed to create conversation: ${error.message}`)
      announceToast('Failed to create conversation', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [router, announce, announceStatus, announceAlert, announceToast, announceLoadingStart, announceLoadingEnd])

  // Focus search input
  const focusSearchInput = useCallback(() => {
    const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement
    if (searchInput) {
      searchInput.focus()
      announceStatus('Search focused')
    }
  }, [announceStatus])

  // Navigation functions
  const navigateToNextConversation = useCallback(() => {
    announceStatus('Next conversation')
    // Implementation here
  }, [announceStatus])

  const navigateToPreviousConversation = useCallback(() => {
    announceStatus('Previous conversation')
    // Implementation here
  }, [announceStatus])

  const openSettings = useCallback(() => {
    announceStatus('Opening settings')
    router.push('/settings')
  }, [router, announceStatus])

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside aria-label="Conversation list">
        <button
          onClick={handleNewConversation}
          disabled={isLoading}
          aria-label="Create new conversation"
          aria-busy={isLoading}
        >
          New Chat
        </button>

        {/* Search input */}
        <input
          ref={searchInputRef}
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations..."
          data-search-input
          aria-label="Search conversations"
        />
      </aside>

      {/* Main content */}
      <main id="main-content" tabIndex={-1} aria-label="Chat messages">
        {/* Chat content */}
      </main>

      {/* Keyboard shortcuts help modal */}
      <KeyboardShortcutsHelp
        isOpen={shortcutsOpen}
        onClose={closeShortcuts}
      />
    </div>
  )
}
```

## Modal/Dialog Integration Example

```tsx
'use client'

import { useRef, useEffect } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useLiveAnnouncer } from '@/components/ui/LiveAnnouncer'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const { announce } = useLiveAnnouncer()

  // Focus trap when modal is open
  useFocusTrap({
    container: modalRef,
    enabled: isOpen,
    autoFocus: true,
    onEscape: onClose,
  })

  // Announce modal open
  useEffect(() => {
    if (isOpen) {
      announce('Settings dialog opened', 'status')
    }
  }, [isOpen, announce])

  if (!isOpen) return null

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-lg shadow-xl"
      >
        <header className="p-6 border-b">
          <h2 id="settings-title">Settings</h2>
        </header>

        <div className="p-6">
          {/* Settings content */}
        </div>

        <footer className="p-6 border-t flex justify-end gap-3">
          <button onClick={onClose}>Cancel</button>
          <button onClick={onClose}>Save Changes</button>
        </footer>
      </div>
    </div>
  )
}
```

## Form Integration Example

```tsx
'use client'

import { useState } from 'react'
import { useLiveAnnouncer } from '@/components/ui/LiveAnnouncer'
import { useToastAnnouncer } from '@/components/ui/LiveAnnouncer'

function ContactForm() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { announceAlert, announceStatus } = useLiveAnnouncer()
  const { announceToast } = useToastAnnouncer()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    const newErrors: Record<string, string> = {}
    if (!formData.name) newErrors.name = 'Name is required'
    if (!formData.email) newErrors.email = 'Email is required'
    if (!formData.message) newErrors.message = 'Message is required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      announceAlert('Form has errors. Please review and fix.')
      announceToast('Please fix form errors', 'error')
      return
    }

    setIsSubmitting(true)
    announceStatus('Submitting form...')

    try {
      await submitContactForm(formData)

      setFormData({ name: '', email: '', message: '' })
      announceStatus('Form submitted successfully')
      announceToast('Message sent successfully!', 'success')
    } catch (error) {
      announceAlert(`Failed to submit: ${error.message}`)
      announceToast('Failed to send message', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <span id="name-error" role="alert" className="error">
            {errors.name}
          </span>
        )}
      </div>

      {/* More fields */}

      <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  )
}
```

## Loading State Integration Example

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useLoadingAnnouncer } from '@/components/ui/LiveAnnouncer'

function MessageList() {
  const [messages, setMessages] = useState([])
  const [loadingProgress, setLoadingProgress] = useState(0)

  const { announceLoadingStart, announceLoadingProgress, announceLoadingEnd } = useLoadingAnnouncer()

  useEffect(() => {
    let cancelled = false

    async function loadMessages() {
      announceLoadingStart('Loading messages')

      for (let i = 0; i <= 100; i += 10) {
        if (cancelled) return

        await new Promise(resolve => setTimeout(resolve, 100))
        setLoadingProgress(i)

        if (i % 25 === 0) {
          announceLoadingProgress(i, 100, 'Loading messages')
        }
      }

      if (!cancelled) {
        const loadedMessages = await fetchMessages()
        setMessages(loadedMessages)
        announceLoadingEnd('Messages loaded')
      }
    }

    loadMessages()

    return () => {
      cancelled = true
    }
  }, [announceLoadingStart, announceLoadingProgress, announceLoadingEnd])

  return (
    <div>
      {messages.length === 0 ? (
        <div aria-live="polite">
          Loading messages... {loadingProgress}%
        </div>
      ) : (
        messages.map(msg => <MessageBubble key={msg.id} message={msg} />)
      )}
    </div>
  )
}
```

## Conversation Navigation with Keyboard

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useLiveAnnouncer } from '@/components/ui/LiveAnnouncer'

function ConversationList({ conversations, selectedId, onSelect }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { announceStatus } = useLiveAnnouncer()

  // Navigate to next conversation
  const goToNext = useCallback(() => {
    if (selectedIndex < conversations.length - 1) {
      const newIndex = selectedIndex + 1
      setSelectedIndex(newIndex)
      const nextConv = conversations[newIndex]
      onSelect(nextConv)
      announceStatus(`Navigated to ${nextConv.title}`)
    }
  }, [conversations, selectedIndex, onSelect, announceStatus])

  // Navigate to previous conversation
  const goToPrevious = useCallback(() => {
    if (selectedIndex > 0) {
      const newIndex = selectedIndex - 1
      setSelectedIndex(newIndex)
      const prevConv = conversations[newIndex]
      onSelect(prevConv)
      announceStatus(`Navigated to ${prevConv.title}`)
    }
  }, [conversations, selectedIndex, onSelect, announceStatus])

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'n',
        metaKey: true,
        ctrlKey: true,
        handler: goToNext,
        description: 'Next conversation',
      },
      {
        key: 'p',
        metaKey: true,
        ctrlKey: true,
        handler: goToPrevious,
        description: 'Previous conversation',
      },
    ],
  })

  return (
    <ul role="listbox" aria-label="Conversations">
      {conversations.map((conv, index) => (
        <li
          key={conv.id}
          role="option"
          aria-selected={conv.id === selectedId}
          aria-posinset={index + 1}
          aria-setsize={conversations.length}
        >
          <button onClick={() => onSelect(conv)}>
            {conv.title}
          </button>
        </li>
      ))}
    </ul>
  )
}
```

## Chat Input with Keyboard Shortcuts

```tsx
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useLiveAnnouncer } from '@/components/ui/LiveAnnouncer'

function ChatInput({ onSend }) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { announceStatus } = useLiveAnnouncer()

  const handleSend = useCallback(() => {
    if (text.trim()) {
      onSend(text.trim())
      setText('')
      announceStatus('Message sent')
    }
  }, [text, onSend, announceStatus])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [text])

  // Register Cmd+Enter to send
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'Enter',
        metaKey: true,
        ctrlKey: true,
        handler: handleSend,
        description: 'Send message',
      },
    ],
  })

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter (without modifiers) sends message
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        aria-label="Message input"
        aria-describedby="input-help"
      />
      <span id="input-help" className="sr-only">
        Press Enter to send, Shift+Enter for new line
      </span>
      <button
        onClick={handleSend}
        disabled={!text.trim()}
        aria-label="Send message"
      >
        Send
      </button>
    </div>
  )
}
```

## Best Practices Summary

1. **Always announce important state changes**
   - Form submissions
   - Navigation changes
   - Loading states
   - Errors

2. **Use appropriate announcement types**
   - `status` for general updates
   - `alert` for urgent errors
   - Progress for long operations

3. **Always trap focus in modals**
   - Use `useFocusTrap` with `enabled={isOpen}`
   - Provide `onEscape` handler
   - Auto-focus first element

4. **Register keyboard shortcuts**
   - Use `presetShortcuts` for common actions
   - Provide clear descriptions
   - Test in input fields (should be ignored)

5. **Use proper ARIA attributes**
   - `role` for semantic meaning
   - `aria-label` for accessibility labels
   - `aria-live` for dynamic content
   - `aria-busy` for loading states

6. **Test with keyboard and screen reader**
   - Navigate with Tab/Shift+Tab
   - Test all keyboard shortcuts
   - Verify announcements
   - Check focus management
