# Agent 3 Briefing: Keyboard & Accessibility Specialist

**Focus:** Keyboard shortcuts, enhanced accessibility patterns

---

## Your Mission

Add power user keyboard shortcuts and improve accessibility beyond the basics.

---

## Analysis Phase

Read:
1. `/mnt/c/users/casey/PersonalLog/src/app/layout.tsx` - Root layout for global shortcuts
2. `/mnt/c/users/casey/PersonalLog/src/app/(messenger)/page.tsx` - Messenger patterns
3. `/mnt/c/users/casey/PersonalLog/src/components/messenger/ChatArea.tsx`

---

## Implementation Tasks

### Task 1: Global Keyboard Shortcuts
**Create:** `src/hooks/useKeyboardShortcuts.ts`

Shortcuts to implement:
- `Cmd+K` - New conversation
- `Cmd+/` - Focus search
- `Cmd+.` - Open settings
- `Esc` - Close modal/drawer
- `Cmd+N` - Next conversation
- `Cmd+P` - Previous conversation
- `Cmd+Enter` - Send message

### Task 2: Keyboard Navigation Provider
**Create:** `src/components/providers/KeyboardNavigationProvider.tsx`

Features:
- Track focused element
- Handle Tab/Shift+Tab for custom navigation
- Visual focus indicators (focus-visible)
- Skip links for screen readers

### Task 3: ARIA Live Regions
**Create:** `src/components/ui/LiveAnnouncer.tsx`

For dynamic content updates:
- New message notifications
- Error toasts
- Loading state changes
- Progress updates

### Task 4: Focus Trap Utility
**Create:** `src/hooks/useFocusTrap.ts`

For modals and dialogs:
- Trap focus within element
- Return focus on unmount
- Handle Escape key
- Handle Tab cycling

### Task 5: Skip Links
**Update:** `/mnt/c/users/casey/PersonalLog/src/app/layout.tsx`

Add skip links for accessibility:
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

---

## Output

Create summary at: `/mnt/c/users/casey/PersonalLog/.agents/phase-3/agent-3-summary.md`

---

**Keyboard navigation makes apps accessible to everyone, not just power users.**
