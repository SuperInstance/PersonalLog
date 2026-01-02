# Agent 1 Briefing: UX Polish Specialist

**Focus:** Loading states, form validation, optimistic updates, notifications

---

## Your Mission

Improve user experience through better loading feedback, form validation, optimistic updates, and notifications.

---

## Analysis Phase

Read these files first:
1. `/mnt/c/users/casey/PersonalLog/src/app/setup/page.tsx` - Form handling
2. `/mnt/c/users/casey/PersonalLog/src/components/messenger/ChatArea.tsx` - Message sending
3. `/mnt/c/users/casey/PersonalLog/src/app/catalog/page.tsx` - Loading patterns

---

## Implementation Tasks

### Task 1: Create Skeleton Loading Components
**Create:** `src/components/ui/Skeleton.tsx`

```tsx
interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}

export function Skeleton({ variant = 'text', ... }: SkeletonProps)
```

**Also create:** `src/components/ui/SkeletonList.tsx` for list skeletons

### Task 2: Add Real-Time Form Validation
**Update:** `/mnt/c/users/casey/PersonalLog/src/app/setup/page.tsx`

For each form field:
- Show validation state on blur
- Display inline error messages
- Disable submit until valid
- Show success state

**Pattern:**
```tsx
const [errors, setErrors] = useState<Record<string, string>>({})
const [touched, setTouched] = useState<Record<string, boolean>>({})

const validateField = (name: string, value: string) => {
  // Validation logic
  setErrors(prev => ({ ...prev, [name validationResult }))
}
```

### Task 3: Implement Optimistic Message Sending
**Update:** `/mnt/c/users/casey/PersonalLog/src/components/messenger/ChatArea.tsx`

When user sends message:
1. Immediately add message to UI (optimistic)
2. Send to backend in background
3. On success: update with real ID/timestamp
4. On error: show error, allow retry

### Task 4: Create Toast Notification System
**Create:** `src/components/ui/Toast.tsx`
**Create:** `src/hooks/useToast.ts`

Features:
- Auto-dismiss after 5 seconds
- Multiple toasts stackable
- Success, error, info, warning variants
- Manual close button
- Progress bar for auto-dismiss

### Task 5: Add Loading States to Key Areas
**Update:** Multiple pages

Add skeleton loaders to:
- Conversation list loading
- Message list loading
- Settings pages loading
- Module catalog loading

---

## Output

Create summary at: `/mnt/c/users/casey/PersonalLog/.agents/phase-3/agent-1-summary.md`

---

**Focus on user perception. Make the app feel fast and responsive.**
