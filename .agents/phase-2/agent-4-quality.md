# Agent 4 Briefing: Error Handling & Quality Specialist

**Focus:** Standardize error handling, add null checks, improve documentation

---

## Your Mission

Improve code quality through consistent error handling, better null safety, and comprehensive documentation.

---

## Analysis Phase (Do This First)

1. **Identify files with inconsistent error handling:**
   - Storage files (conversation-store.ts, vector-store.ts)
   - API handlers
   - Provider components

2. **Find risky null/undefined patterns:**
   - Optional chaining abuse
   - Missing null checks before property access
   - Unsafe type assertions

3. **Check JSDoc coverage:**
   - Public functions without documentation
   - Complex logic without explanation

---

## Implementation Tasks

### Task 1: Standardize Storage Error Handling
**Files:**
- `src/lib/storage/conversation-store.ts`
- `src/lib/knowledge/vector-store.ts`

**Pattern to apply:**
```typescript
// Instead of:
throw new Error(`Entry ${id} not found`)

// Use:
import { NotFoundError } from '@/lib/errors'
throw new NotFoundError('conversation', id)
```

### Task 2: Add Null Checks to Critical Paths
**Files to review:**
- All files with optional chaining
- Files that access localStorage/IndexedDB
- Files that read from URL params

**Pattern:**
```typescript
// Add guards before risky operations:
if (!data?.id) {
  throw new ValidationError('id', 'ID is required')
}

// Use type guards:
function isValidMessage(msg: unknown): msg is Message {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'id' in msg &&
    'content' in msg
  )
}
```

### Task 3: Add JSDoc to Public APIs
**Target:** Add JSDoc to at least 20 exported functions

**Priority files:**
- `src/lib/utils.ts` (if exists)
- `src/lib/integration/index.ts`
- `src/lib/analytics/index.ts`
- `src/lib/experiments/index.ts`

**JSDoc pattern:**
```typescript
/**
 * Creates a new conversation with the specified options.
 *
 * @example
 * ```typescript
 * const conv = createConversation({
 *   title: 'My Chat',
 *   messages: []
 * })
 * ```
 *
 * @param options - Configuration for the conversation
 * @param options.title - Display title for the conversation
 * @param options.messages - Initial messages (optional)
 * @returns A new conversation object with unique ID
 * @throws {ValidationError} If title is empty
 */
export function createConversation(options: {
  title: string
  messages?: Message[]
}): Conversation
```

### Task 4: Extract Duplicate Code
**Target:** Cosine similarity implementation

**Files:**
- `src/lib/native/bridge.ts` (JS fallback)
- `src/lib/knowledge/vector-store.ts` (JS fallback)

**Action:**
1. Create `src/lib/vector/utils.ts`
2. Extract shared cosineSimilarity function
3. Update both files to import from utils
4. Add JSDoc

### Task 5: Fix Hard-Coded Magic Numbers
**Target:** Files with numeric constants

**Pattern:**
```typescript
// Instead of:
const score = Math.min(100, (cores / 16) * 100)

// Use:
const MAX_CPU_SCORE = 100
const CPU_REFERENCE_CORES = 16
const score = Math.min(MAX_CPU_SCORE, (cores / CPU_REFERENCE_CORES) * MAX_CPU_SCORE)
```

**Apply to:**
- Hardware scoring calculations
- Vector similarity thresholds
- Cache sizes

---

## Code Quality Checklist

For each file you modify:
- [ ] Error handling uses ErrorHandler
- [ ] Null checks present where needed
- [ ] JSDoc on all exports
- [ ] No magic numbers
- [ ] TypeScript strict mode compliant
- [ ] No `any` types
- [ ] Consistent formatting

---

## Output

Create a summary file: `/mnt/c/users/casey/PersonalLog/.agents/phase-2/agent-4-summary.md`

Include:
- Files modified
- Error handling patterns standardized
- Null checks added
- JSDoc coverage improvement
- Code extracted (duplicates removed)

---

**Be methodical. Small improvements compound over time.**
