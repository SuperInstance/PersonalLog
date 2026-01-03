# Smoke Test Suite

Quick-running tests that validate critical functionality and catch major regressions fast.

## Overview

Smoke tests are a subset of tests that run quickly (under 5 minutes total) and verify the most critical user-facing functionality. They're designed to be run:

- Before committing code
- In CI/CD pipelines as a first check
- After deployments to verify basic functionality
- During development to catch obvious regressions

## Quick Start

```bash
# Run all smoke tests
npm run test:smoke

# Run smoke tests with UI (for debugging)
npx playwright test --config=playwright-smoke.config.ts --ui

# Run smoke tests in debug mode
npx playwright test --config=playwright-smoke.config.ts --debug

# Run smoke tests with visible browser
npx playwright test --config=playwright-smoke.config.ts --headed
```

## Test Structure

```
tests/smoke/
├── 01-app-initialization.spec.ts           # App loads and initializes
├── 02-navigation.spec.ts                    # Navigate between sections
├── 03-messenger.spec.ts                     # Chat/messenger interface
├── 04-knowledge-base.spec.ts                # Knowledge base functionality
├── 05-settings-system.spec.ts               # System settings page
├── 06-settings-benchmarks.spec.ts           # Benchmarks page
├── 07-settings-features.spec.ts             # Feature flags page
├── 08-journal-notes-tasks.spec.ts           # Core productivity features
├── 09-pwa-installability.spec.ts            # PWA can be installed
├── 10-offline-capability.spec.ts            # Offline support
├── 11-storage-persistence.spec.ts           # Data persistence
├── 12-responsive-design.spec.ts             # Mobile/tablet support
├── 13-api-endpoints.spec.ts                 # API accessibility
├── 14-error-handling.spec.ts                # Graceful error handling
├── 15-performance-budgets.spec.ts           # Performance budgets
└── README.md                                # This file
```

## What's Tested

### 1. App Initialization (01)
- Application loads without critical errors
- Main UI components are visible
- Initializes within acceptable time (< 3s)
- Handles browser refresh

### 2. Navigation (02)
- All main sections are accessible
- Navigation links work
- Browser back button functions
- Settings sub-pages load

### 3. Messenger (03)
- Messenger interface loads
- Conversation list displays
- Input area available
- New conversation can be created

### 4. Knowledge Base (04)
- Knowledge base loads
- Search/filter interface available
- Knowledge sections navigable

### 5. Settings - System (05)
- System settings page loads
- Hardware information displays
- System info accessible

### 6. Settings - Benchmarks (06)
- Benchmarks page loads
- Performance data displays
- Benchmark controls available

### 7. Settings - Features (07)
- Feature flags page loads
- Feature toggles display
- Interactive elements work

### 8. Journal, Notes, Tasks (08)
- All three features load
- Input interfaces available
- Navigation works
- Task management UI displays

### 9. PWA Installability (09)
- Manifest link present
- Service worker registered
- PWA meta tags present
- Manifest is accessible

### 10. Offline Capability (10)
- Service worker available
- Cache API accessible
- Basic offline preparation works

### 11. Storage & Persistence (11)
- localStorage available
- IndexedDB available
- Settings persist across navigation
- Settings persist across refresh

### 12. Responsive Design (12)
- Works on desktop (1920x1080)
- Works on tablet (768x1024)
- Works on mobile (375x667)
- Navigation adapts to mobile
- Handles orientation change

### 13. API Endpoints (13)
- Health check accessible
- API errors handled gracefully
- CORS headers present

### 14. Error Handling (14)
- 404 pages handled gracefully
- No console errors on home
- Rapid navigation doesn't cause errors

### 15. Performance Budgets (15)
- Home page loads in < 3s
- TTFB < 1s
- DOM size reasonable
- Settings pages load quickly
- Minimal long tasks

## Performance Targets

| Metric | Target | Purpose |
|--------|--------|---------|
| Total suite runtime | < 5 minutes | Fast feedback |
| Individual test | < 30 seconds | Quick failures |
| Page load | < 3 seconds | User experience |
| TTFB | < 1 second | Server performance |
| DOM elements | < 2000 | Render performance |

## Configuration

Smoke tests use a separate Playwright config (`playwright-smoke.config.ts`) with:

- **Faster timeouts**: 30s per test (vs 60s default)
- **Single browser**: Chromium only (vs all browsers)
- **Optimized workers**: Parallel execution
- **Separate reports**: `playwright-smoke-report/`
- **Fail-fast**: Stops on first failure in CI

## CI/CD Integration

### GitHub Actions

```yaml
name: Smoke Tests

on: [push, pull_request]

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:smoke
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

npm run test:smoke
if [ $? -ne 0 ]; then
  echo "❌ Smoke tests failed. Commit aborted."
  exit 1
fi
```

### Pre-push Hook

```bash
#!/bin/bash
# .git/hooks/pre-push

echo "Running smoke tests before push..."
npm run test:smoke
if [ $? -ne 0 ]; then
  echo "❌ Smoke tests failed. Push aborted."
  exit 1
fi
```

## When to Run Smoke Tests

### Always Run
- Before committing code
- Before creating a PR
- After merging to main
- Before deploying to production

### Optional Run
- After major refactoring
- After dependency updates
- After configuration changes
- When debugging specific issues

### Don't Need to Run
- After trivial CSS changes
- After documentation updates
- After comment-only changes

## Troubleshooting

### Tests Fail Due to Port Already in Use

```bash
# Kill process on port 3002
npx kill-port 3002

# Or use different port
PORT=3003 npm run test:smoke
```

### Tests Timeout

```bash
# Check if dev server is running
curl http://localhost:3002

# Restart dev server
npm run dev

# Run with increased timeout
npx playwright test --config=playwright-smoke.config.ts --timeout=60000
```

### Tests Fail Intermittently

```bash
# Run without parallelization
npx playwright test --config=playwright-smoke.config.ts --workers=1

# Run with retries
npx playwright test --config=playwright-smoke.config.ts --retries=3
```

### Specific Test Fails

```bash
# Run single test file
npx playwright test --config=playwright-smoke.config.ts tests/smoke/01-app-initialization.spec.ts

# Run specific test
npx playwright test --config=playwright-smoke.config.ts -g "should load the application without errors"
```

## Adding New Smoke Tests

When adding a new smoke test:

1. **Check it's truly critical**: Only test user-facing critical paths
2. **Keep it fast**: Must run in < 30 seconds
3. **Make it reliable**: No flaky tests in smoke suite
4. **Use descriptive names**: Test names should explain what's validated
5. **Update this README**: Document what the new test covers

Example template:

```typescript
/**
 * Smoke Test: [Feature Name]
 *
 * Validates [critical functionality].
 * [Why it's important]
 *
 * Runtime: < X seconds
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke: [Feature]', () => {
  test('should [do something critical]', async ({ page }) => {
    await page.goto('/path')
    await page.waitForLoadState('domcontentloaded')

    // Critical assertions
    await expect(page.locator('main')).toBeVisible()
  })
})
```

## Maintenance

### Review Smoke Tests Monthly

- Remove obsolete tests
- Add tests for new critical features
- Update performance budgets if needed
- Check test run times

### Update Performance Budgets

If legitimate performance improvements are made, update budgets in `15-performance-budgets.spec.ts`:

```typescript
// Example: Improve page load budget from 3000ms to 2000ms
expect(loadTime).toBeLessThan(2000)
```

### Monitor Smoke Test Results

Track smoke test failures to identify:
- Frequent breaking changes
- Performance regressions
- Integration issues
- Browser compatibility problems

## Reports

### HTML Report

```bash
npm run test:smoke
open playwright-smoke-report/index.html
```

### JUnit Report

```bash
# For CI/CD integration
cat test-results/smoke-junit.xml
```

### Video Recordings

Failed tests automatically capture video:

```bash
# Videos stored in
ls test-results/videos/
```

## Comparison: Smoke vs Full Test Suite

| Aspect | Smoke Tests | Full Suite |
|--------|-------------|------------|
| Runtime | < 5 minutes | 20-30 minutes |
| Coverage | Critical paths only | Comprehensive |
| Browsers | Chromium only | All browsers |
| When to run | Before commits | Before releases |
| Purpose | Fast feedback | Complete validation |
| Detail level | Basic functionality | Edge cases, variations |

## Success Criteria

Smoke tests are successful when:

- All tests pass in < 5 minutes
- No critical errors in console
- All main pages load successfully
- Performance budgets met
- Navigation works
- Storage persists
- PWA is installable
- Mobile views work

## Contributing

When contributing to PersonalLog:

1. Write new smoke tests for new critical features
2. Keep existing smoke tests passing
3. Update this README when adding tests
4. Run smoke tests before creating PR
5. Don't add slow tests to smoke suite

## Related Documentation

- [`/tests/README.md`](../README.md) - Full test suite documentation
- [`/docs/TESTING.md`](../../docs/TESTING.md) - Comprehensive testing guide
- [`playwright.config.ts`](../../playwright.config.ts) - Full E2E test config
- [`playwright-smoke.config.ts`](../../playwright-smoke.config.ts) - Smoke test config

## Support

If smoke tests fail:

1. Check the troubleshooting section above
2. Review error messages in console output
3. Check HTML report for details
4. Review video recordings of failures
5. Open an issue with logs attached

---

**Last Updated**: 2025-01-02
**Agent**: Round 5 - Agent 4 (Smoke Test Runner)
**Version**: 1.0.0
