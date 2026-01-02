# UX Improvements Quick Reference Guide

## Setup Instructions

### 1. Toast Notification System

**Step 1: Add to Root Layout**

Edit `src/app/layout.tsx`:
```tsx
import { ToastProvider } from '@/components/ui/ToastProvider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
```

**Step 2: Use in Components**

```tsx
import { useToast } from '@/hooks/useToast'

function MyComponent() {
  const { showToast } = useToast()

  const handleSuccess = () => {
    showToast('Success!', 'success')
  }

  const handleError = () => {
    showToast('Something went wrong', 'error', 3000)
  }

  const handleInfo = () => {
    showToast('Here is some info', 'info')
  }

  const handleWarning = () => {
    showToast('Please be careful', 'warning')
  }

  return <button onClick={handleSuccess}>Click me</button>
}
```

---

### 2. Skeleton Loaders

**Basic Usage:**

```tsx
import { Skeleton, SkeletonList, SkeletonText, SkeletonAvatar } from '@/components/ui/Skeleton'

// Rectangular placeholder
<Skeleton variant="rectangular" height={100} />

// Circular avatar
<SkeletonAvatar size={40} />

// Text lines
<SkeletonText lines={3} />

// List of items
<SkeletonList count={5} variant="rectangular" />
```

**With Loading State:**

```tsx
const [isLoading, setIsLoading] = useState(true)

useEffect(() => {
  fetchData().finally(() => setIsLoading(false))
}, [])

return (
  <div>
    {isLoading ? (
      <SkeletonList count={5} />
    ) : (
      data.map(item => <ItemCard key={item.id} {...item} />)
    )}
  </div>
)
```

---

### 3. Form Validation Pattern

**State Setup:**

```tsx
const [errors, setErrors] = useState<Record<string, string>>({})
const [touched, setTouched] = useState<Record<string, boolean>>({})

const validateField = (name: string, value: string) => {
  let error = ''

  if (name === 'email' && !value.includes('@')) {
    error = 'Please enter a valid email'
  }

  if (name === 'password' && value.length < 8) {
    error = 'Password must be at least 8 characters'
  }

  setErrors(prev => ({ ...prev, [name]: error }))
}

const handleFieldBlur = (name: string, value: string) => {
  setTouched(prev => ({ ...prev, [name]: true }))
  validateField(name, value)
}

const isFormValid = () => {
  return Object.values(errors).every(e => !e) &&
         Object.keys(touched).length > 0
}
```

**Input with Validation:**

```tsx
<input
  value={formData.email}
  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
  onBlur={() => handleFieldBlur('email', formData.email)}
  className={`w-full px-4 py-2 border rounded-lg ${
    touched.email && errors.email
      ? 'border-red-500'
      : touched.email && !errors.email
      ? 'border-green-500'
      : 'border-slate-300'
  }`}
/>
{touched.email && errors.email && (
  <p className="text-red-500 text-sm">{errors.email}</p>
)}
{touched.email && !errors.email && formData.email && (
  <Check className="w-5 h-5 text-green-500" />
)}
```

---

### 4. Optimistic Updates Pattern

**Message Sending Example:**

```tsx
const [sendingIds, setSendingIds] = useState<Set<string>>(new Set())
const [failedIds, setFailedIds] = useState<Set<string>>(new Set())

const handleSend = async () => {
  const tempId = `temp-${Date.now()}`

  // Optimistic: Add immediately
  const optimisticMessage = {
    id: tempId,
    content: inputText,
    isOptimistic: true,
  }

  setMessages(prev => [...prev, optimisticMessage])
  setSendingIds(prev => new Set(prev).add(tempId))

  try {
    // Backend call
    const realMessage = await sendMessage(inputText)

    // Replace with real
    setMessages(prev =>
      prev.map(msg => msg.id === tempId ? realMessage : msg)
    )
  } catch (error) {
    // Mark as failed
    setFailedIds(prev => new Set(prev).add(tempId))
  } finally {
    setSendingIds(prev => {
      const next = new Set(prev)
      next.delete(tempId)
      return next
    })
  }
}
```

**Display with Status:**

```tsx
{messages.map(msg => (
  <div key={msg.id} className="relative">
    <MessageBubble message={msg} />

    {sendingIds.has(msg.id) && (
      <Loader2 className="animate-spin" />
    )}

    {failedIds.has(msg.id) && (
      <div className="error-badge">
        Failed to send
        <button onClick={() => retry(msg)}>Retry</button>
      </div>
    )}
  </div>
))}
```

---

## Component API Reference

### Skeleton Props

```tsx
interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  className?: string
}
```

### Toast API

```tsx
interface ToastProps {
  id: string
  message: string
  variant?: 'success' | 'error' | 'info' | 'warning'
  duration?: number // Default: 5000ms
}

// useToast hook
interface UseToastReturn {
  toasts: Toast[]
  showToast: (message: string, variant?: ToastVariant, duration?: number) => void
  removeToast: (id: string) => void
}
```

---

## Best Practices

### When to Use Skeletons
- Loading lists, cards, or grids
- Loading page content
- Loading user-generated content
- NOT for: Simple buttons or small UI elements (use spinner)

### When to Use Toasts
- Success feedback (saved, sent, copied)
- Error feedback (failed, connection lost)
- Info feedback (new features, tips)
- NOT for: Critical errors (use modals), validation errors (use inline)

### When to Use Optimistic Updates
- User-generated content (messages, comments)
- Toggle states (like, follow)
- Local-only actions that sync to server
- NOT for: Actions with server-side validation, destructive actions

### Form Validation Timing
- Validate on blur (not on change)
- Show error immediately after blur
- Clear error when user starts typing
- Don't validate pristine fields

---

## Common Patterns

### Loading State with Retry

```tsx
const [state, setState] = useState<'idle' | 'loading' | 'error' | 'success'>('idle')

const loadData = async () => {
  setState('loading')
  try {
    await fetchData()
    setState('success')
  } catch (error) {
    setState('error')
  }
}

// In render
{state === 'loading' && <Skeleton />}
{state === 'error' && <ErrorBanner onRetry={loadData} />}
{state === 'success' && <DataDisplay />}
```

### Form with Auto-save

```tsx
const [saving, setSaving] = useState(false)

useEffect(() => {
  const timer = setTimeout(async () => {
    if (formData.name) {
      setSaving(true)
      await saveFormData(formData)
      setSaving(false)
      showToast('Saved!', 'success')
    }
  }, 1000)

  return () => clearTimeout(timer)
}, [formData])

// Show saving indicator
{saving && <Skeleton variant="text" width={60} />}
```

---

## File Locations

- **Skeleton Components:** `src/components/ui/Skeleton.tsx`
- **Toast Component:** `src/components/ui/Toast.tsx`
- **Toast Hook:** `src/hooks/useToast.tsx`
- **Toast Provider:** `src/components/ui/ToastProvider.tsx`
- **Implementation Example:** `src/app/setup/page-old.tsx` (form validation)
- **Optimistic Updates Example:** `src/components/messenger/ChatArea.tsx`

---

## Troubleshooting

**Toast not showing?**
- Ensure ToastProvider wraps your app
- Check you're calling `showToast` from a component inside the provider
- Check z-index conflicts with other fixed elements

**Skeleton looks wrong?**
- Ensure parent has defined height/width constraints
- Check that dark mode classes are applied
- Verify Tailwind animations are enabled

**Validation not working?**
- Ensure `onBlur` handler is attached
- Check that errors state is being updated
- Verify touched state is being set
- Make sure error message rendering is conditional

**Optimistic update issues?**
- Check temp ID is unique (use `Date.now()`)
- Ensure message replacement uses same temp ID
- Verify cleanup of sending/failed states

---

## Accessibility Notes

- All form errors should be associated with inputs using `aria-describedby`
- Toast notifications should be announced to screen readers
- Skeleton loaders should have `aria-busy="true"` on containers
- Focus management is important for modals and toasts

---

**For more details, see:** `.agents/phase-3/agent-1-summary.md`
