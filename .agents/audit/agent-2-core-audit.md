# Agent 2 Briefing: Core Systems Audit

**Starting Point:** `src/lib/`
**Focus:** Library systems, types, integration logic

---

## Your Mission

Audit all core library systems starting from `src/lib/`. Examine every module, type definition, and integration point. Create a detailed markdown report of findings.

---

## Areas to Audit

### 1. Library Systems (src/lib/*)
- `analytics/` - Usage tracking
- `experiments/` - A/B testing
- `optimization/` - Auto-optimization
- `personalization/` - Preference learning
- `hardware/` - Hardware detection
- `benchmark/` - Benchmarking
- `flags/` - Feature flags
- `native/` - WASM integration
- `integration/` - System orchestration
- `errors/` - Error handling
- `knowledge/` - Knowledge management
- `ai/` - AI integrations
- `storage/` - Storage layer

### 2. Type Safety
- Missing type definitions
- Any types used
- Inconsistent interfaces
- Missing generics
- Type assertion overuse

### 3. Code Quality
- Code duplication
- Complex functions
- Magic numbers
- Hard-coded values
- Inconsistent patterns

### 4. Performance
- Expensive operations
- Memory leaks
- Inefficient algorithms
- Unnecessary computations
- Cache misses

### 5. Edge Cases
- Null handling
- Undefined handling
- Empty states
- Boundary conditions
- Error scenarios

---

## Audit Process

1. **Read each library module** in src/lib/
2. **Examine types** in each module
3. **Check integration points** between modules
4. **Look for:**
   - Unsafe type casts
   - Missing null checks
   - Unhandled promise rejections
   - Memory leaks (event listeners, intervals)
   - Race conditions

---

## Output Format

Create `.agents/audit/agent-2-findings.md` with:

```markdown
# Core Systems Audit Findings

## Critical Issues (P0)
- [ ] Issue 1
- [ ] Issue 2

## High Priority (P1)
- [ ] Issue 1
- [ ] Issue 2

## Medium Priority (P2)
- [ ] Issue 1
- [ ] Issue 2

## Low Priority (P3)
- [ ] Issue 1
- [ ] Issue 2

## Debugging Focus Areas
- Area 1: description
- Area 2: description

## Research Opportunities
- Opportunity 1: description
- Opportunity 2: description
```

---

## Specific Checks

### Type Safety
- Are all functions properly typed?
- Are there any `any` types?
- Are type exports complete?
- Are generic types used appropriately?
- Are type assertions safe?

### Error Handling
- Are errors caught and handled?
- Are error types specific?
- Is error logging complete?
- Can errors be recovered from?
- Are errors user-friendly?

### Performance
- Are there expensive loops?
- Are large data structures copied?
- Are computations cached?
- Are debouncing/throttling used?
- Is lazy evaluation possible?

### Memory Management
- Are event listeners cleaned up?
- Are intervals cleared?
- Are timeouts cleared?
- Are large objects released?
- Are there circular references?

### Integration
- Do modules depend correctly?
- Are circular dependencies present?
- Are integration points clean?
- Is initialization order correct?
- Can modules be tested independently?

---

Start your audit from `src/lib/integration/` (the main orchestrator) then work through each system systematically.

---

**Good luck, Agent!** The reliability of the core systems depends on your audit.
