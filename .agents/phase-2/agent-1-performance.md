# Agent 1 Briefing: Performance Optimization Specialist

**Focus:** React performance optimization

---

## Your Mission

Improve React rendering performance through memoization, proper dependencies, and hooks optimization.

---

## Analysis Phase (Do This First)

1. **Read these files to understand current implementation:**
   - `/mnt/c/users/casey/PersonalLog/src/components/messenger/MessageBubble.tsx`
   - `/mnt/c/users/casey/PersonalLog/src/components/messenger/ConversationList.tsx`
   - `/mnt/c/users/casey/PersonalLog/src/components/messenger/ChatArea.tsx`
   - `/mnt/c/users/casey/PersonalLog/src/app/(messenger)/page.tsx`
   - `/mnt/c/users/casey/PersonalLog/src/app/settings/page.tsx`

2. **Identify:**
   - Which components re-render unnecessarily?
   - Which useEffect have missing dependencies?
   - Where can useMemo/useCallback help?
   - Are there expensive computations?

---

## Implementation Tasks

### Task 1: Add React.memo to MessageBubble
**File:** `src/components/messenger/MessageBubble.tsx`

- Wrap the component with `React.memo`
- Add a comparison function for props (message.id, isSelected)
- Document why memoization helps (long conversations)

### Task 2: Add React.memo to ConversationItem
**File:** `src/components/messenger/ConversationList.tsx`

- Memoize the ConversationItem component
- Prevents entire list re-rendering on single conversation change

### Task 3: Fix useEffect Dependencies
**Files:** Multiple

Find and fix useEffect hooks with missing dependencies:
```typescript
// WRONG:
useEffect(() => {
  loadConversation(id)
}, [id]) // Missing loadConversation

// RIGHT:
useEffect(() => {
  loadConversation(id)
}, [id, loadConversation])

// OR BETTER - if loadConversation is stable:
useEffect(() => {
  const controller = new AbortController()
  loadConversation(id, controller.signal)
  return () => controller.abort()
}, [id])
```

### Task 4: Add useMemo/useCallback Where Appropriate

**ChatArea.tsx:**
- Memoize expensive message filtering
- Memoize event handlers passed to children

**Settings page:**
- Memoize settingsCards array (stable reference)

### Task 5: Create a Performance Hook (Bonus)

Create `src/hooks/usePerformanceMonitor.ts`:
```typescript
export function usePerformanceMonitor(componentName: string) {
  useEffect(() => {
    const start = performance.now()
    return () => {
      const end = performance.now()
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} render: ${(end - start).toFixed(2)}ms`)
      }
    }
  })
}
```

---

## Verification

After making changes, verify:
1. Components still render correctly
2. No console warnings about dependencies
3. TypeScript compiles without errors
4. Logic is unchanged (only optimized)

---

## Code Quality

- Add JSDoc comments explaining optimization choices
- Use React.memo's second argument for custom comparison when needed
- Document why useMemo/useCallback are used
- Don't over-optimize (only optimize what's measured as slow)

---

## Output

Create a summary file: `/mnt/c/users/casey/PersonalLog/.agents/phase-2/agent-1-summary.md`

Include:
- Files modified
- Performance improvements made
- Estimated impact
- Any issues encountered

---

**Work thoughtfully. Test your changes mentally before applying.**
