# Agent 2 Briefing: Provider Testing Specialist

**Focus:** Unit tests for intelligence providers

---

## Your Mission

Add comprehensive unit tests for the Round 3 intelligence systems that currently have zero test coverage.

---

## Analysis Phase (Do This First)

1. **Read the source code to understand what to test:**
   - `/mnt/c/users/casey/PersonalLog/src/lib/analytics/collector.ts` - Event collection
   - `/mnt/c/users/casey/PersonalLog/src/lib/analytics/aggregator.ts` - Data aggregation
   - `/mnt/c/users/casey/PersonalLog/src/lib/experiments/manager.ts` - A/B testing
   - `/mnt/c/users/casey/PersonalLog/src/lib/experiments/assignment.ts` - Variant assignment
   - `/mnt/c/users/casey/PersonalLog/src/lib/optimization/engine.ts` - Auto-optimization
   - `/mnt/c/users/casey/PersonalLog/src/lib/personalization/learner.ts` - Preference learning

2. **Review existing test patterns:**
   - `/mnt/c/users/casey/PersonalLog/src/lib/errors/__tests__/handler.test.ts` (new)
   - `/mnt/c/users/casey/PersonalLog/src/__tests__/factories.ts` (use these!)

---

## Implementation Tasks

### Task 1: Analytics Collector Tests
**Create:** `src/lib/analytics/__tests__/collector.test.ts`

Test scenarios:
- Event collection (track various event types)
- Session management (start, end, timeout)
- Batch flushing
- Storage integration
- Privacy controls (respect disabled state)

### Task 2: Analytics Aggregator Tests
**Create:** `src/lib/analytics/__tests__/aggregator.test.ts`

Test scenarios:
- Event aggregation by category
- Time series calculations
- Statistics computation (averages, percentiles)
- Query functions

### Task 3: Experiments Manager Tests
**Create:** `src/lib/experiments/__tests__/manager.test.ts`

Test scenarios:
- Experiment registration
- Variant assignment (consistent hashing)
- Metric tracking
- Experiment completion
- Opt-out handling

### Task 4: Experiments Assignment Tests
**Create:** `src/lib/experiments/__tests__/assignment.test.ts`

Test scenarios:
- Consistent hashing for user IDs
- Bandit algorithm (Thompson sampling)
- Traffic allocation
- Re-seeding behavior

### Task 5: Optimization Engine Tests (Basic)
**Create:** `src/lib/optimization/__tests__/engine.test.ts`

Test scenarios:
- Engine initialization
- Rule registration
- Optimization status
- Enable/disable functionality

### Task 6: Personalization Learner Tests (Basic)
**Create:** `src/lib/personalization/__tests__/learner.test.ts`

Test scenarios:
- Signal extraction from actions
- Preference aggregation
- Confidence calculation
- Category opt-out

---

## Testing Guidelines

1. **Use the test factories from `src/__tests__/factories.ts`**
2. **Mock external dependencies:** IndexedDB, localStorage, performance API
3. **Test both success and error paths**
4. **Use descriptive test names:** `should X when Y`
5. **Follow AAA pattern:** Arrange, Act, Assert

### Example Pattern:
```typescript
describe('AnalyticsCollector', () => {
  it('should track event with correct timestamp', async () => {
    // Arrange
    const collector = new AnalyticsCollector()
    await collector.initialize()

    // Act
    collector.track('test_event', { key: 'value' })
    await collector.flush()

    // Assert
    const events = await collector.getStorage().getEvents()
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('test_event')
  })
})
```

---

## Verification

After creating tests:
1. Run `npm test` - all new tests should pass
2. Check coverage with `npm run test:coverage`
3. Ensure tests are isolated (no shared state)

---

## Output

Create a summary file: `/mnt/c/users/casey/PersonalLog/.agents/phase-2/agent-2-summary.md`

Include:
- Test files created
- Test count per module
- Coverage added
- Any issues encountered

---

**Be thorough. These systems are core to the intelligence features.**
