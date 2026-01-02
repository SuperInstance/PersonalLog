# Agent 3 Briefing: Testing & Quality Audit

**Starting Point:** `src/lib/__tests__/`, `tests/`
**Focus:** Test coverage, quality, E2E scenarios

---

## Your Mission

Audit the entire testing suite starting from `src/lib/__tests__/` and `tests/`. Examine test coverage, test quality, and identify gaps. Create a detailed markdown report of findings.

---

## Areas to Audit

### 1. Integration Tests (src/lib/__tests__/integration/*)
- initialization.test.ts
- provider-interaction.test.ts
- settings-functionality.test.ts
- full-flow.test.ts

### 2. E2E Tests (tests/e2e/*)
- initialization.spec.ts
- settings-navigation.spec.ts
- intelligence-systems.spec.ts
- data-management.spec.ts

### 3. Performance Tests (tests/performance/*)
- initialization-performance.test.ts
- bundle-size.test.ts

### 4. Accessibility Tests (tests/a11y/*)
- settings-a11y.spec.ts

### 5. Unit Tests
- Are there unit tests for utilities?
- Are helper functions tested?
- Are types validated?

---

## Audit Process

1. **Read all test files** and understand what's tested
2. **Compare with source code** to find gaps
3. **Check test quality:**
   - Are tests meaningful?
   - Are tests isolated?
   - Are tests maintainable?
   - Are tests fast enough?

4. **Identify:**
   - Untested code paths
   - Missing edge cases
   - Flaky tests
   - Slow tests
   - Mocking issues

---

## Output Format

Create `.agents/audit/agent-3-findings.md` with:

```markdown
# Testing & Quality Audit Findings

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

### Coverage Gaps
- Which files have no tests?
- Which functions are untested?
- Which error paths are untested?
- Which edge cases are untested?

### Test Quality
- Are tests asserting meaningful things?
- Are tests testing implementation or behavior?
- Are tests properly isolated?
- Do tests have good names?
- Are tests readable?

### Test Reliability
- Are tests deterministic?
- Do tests depend on execution order?
- Do tests have race conditions?
- Are mocks appropriate?
- Are tests too slow?

### E2E Coverage
- Are critical user paths covered?
- Are all settings pages tested?
- Is data flow tested end-to-end?
- Are error scenarios tested?
- Is accessibility tested?

### Performance Testing
- Are performance budgets enforced?
- Is bundle size tested?
- Are render times tested?
- Is memory usage tested?
- Are load times tested?

---

Start your audit from `src/lib/__tests__/integration/` and work through all test files. Compare with the source code to identify gaps.

---

**Good luck, Agent!** The reliability of the application depends on your audit.
