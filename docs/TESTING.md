# Testing Guide

Comprehensive testing documentation for PersonalLog, including unit tests, integration tests, E2E tests, performance verification, and accessibility auditing.

## Table of Contents

- [Overview](#overview)
- [Testing Philosophy](#testing-philosophy)
- [Setup](#setup)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [E2E Tests](#e2e-tests)
- [Performance Tests](#performance-tests)
- [Accessibility Tests](#accessibility-tests)
- [Coverage Goals](#coverage-goals)
- [CI/CD Integration](#cicd-integration)

## Overview

PersonalLog uses a comprehensive testing strategy to ensure reliability, performance, and accessibility across all features.

### Test Categories

| Category | Tool | Purpose | Location |
|----------|------|---------|----------|
| Unit Tests | Vitest | Test individual functions | `src/lib/**/__tests__/` |
| Integration Tests | Vitest | Test system interactions | `src/lib/__tests__/integration/` |
| E2E Tests | Playwright | Test user flows | `tests/e2e/` |
| Performance Tests | Playwright | Verify performance budgets | `tests/performance/` |
| Accessibility Tests | Playwright + axe | WCAG 2.1 AA compliance | `tests/a11y/` |

### Test Coverage Goals

- **Unit Tests**: 80%+ coverage of library functions
- **Integration Tests**: 90%+ coverage of critical paths
- **E2E Tests**: 100% coverage of critical user flows
- **Accessibility**: Zero WCAG 2.1 AA violations

## Testing Philosophy

### Regression Testing Focus

PersonalLog emphasizes **regression testing** to prevent bugs from reoccurring and ensure the codebase remains stable as it evolves.

**Key Principles:**
1. **Fast Feedback**: Unit tests should complete in < 5 minutes
2. **Reliable Tests**: No flaky tests - all tests must be deterministic
3. **Comprehensive Coverage**: Test critical paths thoroughly
4. **Performance Guards**: Prevent performance regressions
5. **Type Safety**: TypeScript strict mode + comprehensive type checking

### Testing Pyramid

```
         /\
        /  \        E2E Tests (few)
       /____\       User journeys + Performance
      /      \
     /        \     Integration Tests (more)
    /__________\    System interactions + API routes
   /            \
  /              \  Unit Tests (most)
 /________________\ Individual functions
```

**Principles:**

1. **Test at the right level**: Unit tests for logic, integration tests for interactions, E2E tests for critical paths
2. **Fast feedback**: Unit and integration tests should run in seconds
3. **Reliable tests**: E2E tests must be deterministic and not flaky
4. **Meaningful failures**: Tests should clearly indicate what's wrong
5. **Maintainable**: Tests should be easy to understand and modify

## Setup

### Prerequisites

```bash
# Install dependencies
npm install

# Install testing dependencies
npm install -D vitest @vitest/ui
npm install -D @playwright/test
npm install -D axe-core
npm install -D @testing-library/react @testing-library/jest-dom
```

### Configuration

**Vitest Config** (`vitest.config.ts`):

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**Playwright Config** (`playwright.config.ts`):

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
  },
})
```

## Unit Tests

Unit tests verify individual functions and components in isolation.

### Example: Hardware Detection

```typescript
import { describe, it, expect } from 'vitest'
import { detectHardware } from '@/lib/hardware/detector'

describe('Hardware Detection', () => {
  it('should detect CPU cores', async () => {
    const result = await detectHardware()

    expect(result.cpu.cores).toBeGreaterThan(0)
    expect(result.cpu.cores).toBeLessThanOrEqual(128)
  })

  it('should detect GPU information', async () => {
    const result = await detectHardware()

    expect(result.gpu).toBeDefined()
    expect(result.gpu.renderer).toBeTruthy()
  })

  it('should calculate performance score', async () => {
    const result = await detectHardware()

    expect(result.performanceScore).toBeGreaterThanOrEqual(0)
    expect(result.performanceScore).toBeLessThanOrEqual(100)
  })
})
```

### Example: Feature Flags

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { FeatureFlagManager } from '@/lib/flags/manager'

describe('Feature Flag Manager', () => {
  let manager: FeatureFlagManager

  beforeEach(() => {
    manager = new FeatureFlagManager()
  })

  it('should enable feature when conditions are met', () => {
    manager.defineFlag('test-feature', {
      enabled: true,
      condition: (hardware) => hardware.score > 50,
    })

    const result = manager.evaluate('test-feature', {
      score: 75,
    } as any)

    expect(result.enabled).toBe(true)
  })

  it('should disable feature when conditions are not met', () => {
    manager.defineFlag('test-feature', {
      enabled: true,
      condition: (hardware) => hardware.score > 50,
    })

    const result = manager.evaluate('test-feature', {
      score: 25,
    } as any)

    expect(result.enabled).toBe(false)
  })
})
```

### Running Unit Tests

```bash
# Run all unit tests
npm test

# Run in watch mode
npm test -- --watch

# Run with UI
npm test -- --ui

# Run coverage report
npm test -- --coverage
```

## Integration Tests

Integration tests verify how multiple systems work together.

### Example: Initialization Flow

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { getIntegrationManager, resetIntegrationManager } from '@/lib/integration'

describe('Integration Manager', () => {
  beforeEach(() => {
    resetIntegrationManager()
  })

  it('should initialize all systems', async () => {
    const manager = getIntegrationManager({ autoInitialize: false })
    const result = await manager.initialize()

    expect(result.success).toBe(true)
    expect(result.state.stage).toBe('ready')
  })

  it('should handle hardware detection failure', async () => {
    // Mock to cause failure
    vi.mock('@/lib/hardware', () => ({
      getHardwareInfo: async () => ({
        success: false,
        error: 'Hardware detection failed',
      }),
    }))

    const manager = getIntegrationManager({ autoInitialize: false })
    const result = await manager.initialize()

    // Should still complete with fallbacks
    expect(result.state.systems.hardware.stage).toBe('failed')
    expect(result.capabilities.systemScore).toBeGreaterThan(0)
  })
})
```

### Example: Provider Interactions

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'

describe('Provider Interactions', () => {
  it('should provide integration state to consumers', async () => {
    const { result } = renderHook(() => useIntegration())

    expect(result.current.state).toBeDefined()
    expect(result.current.capabilities).toBeDefined()
  })

  it('should track events through analytics provider', async () => {
    const { trackEvent } = await import('@/lib/analytics/collector')

    trackEvent('test_event', { value: 123 })

    const { getEvents } = await import('@/lib/analytics/queries')
    const events = await getEvents()

    expect(events.length).toBeGreaterThan(0)
    expect(events[0].data.value).toBe(123)
  })
})
```

### Running Integration Tests

```bash
# Run integration tests only
npm test -- integration

# Run specific test file
npm test -- initialization.test.ts

# Run with debug output
npm test -- integration --debug
```

## E2E Tests

E2E tests verify complete user flows in a real browser.

### Example: App Initialization

```typescript
import { test, expect } from '@playwright/test'

test('should load and initialize all systems', async ({ page }) => {
  await page.goto('/')

  // Should show navigation
  await expect(page.locator('nav')).toBeVisible()

  // Should not have console errors
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })

  await page.waitForLoadState('networkidle')

  const criticalErrors = errors.filter(e =>
    e.includes('TypeError') ||
    e.includes('ReferenceError')
  )

  expect(criticalErrors.length).toBe(0)
})
```

### Example: Settings Navigation

```typescript
test('should navigate through all settings pages', async ({ page }) => {
  await page.goto('/settings')

  const settingsPages = [
    '/settings/system',
    '/settings/benchmarks',
    '/settings/features',
  ]

  for (const href of settingsPages) {
    await page.click(`a[href="${href}"]`)
    await page.waitForLoadState('networkidle')

    expect(page.url()).toContain(href)
    await expect(page.locator('main')).toBeVisible()
  }
})
```

### Example: Data Export

```typescript
test('should export analytics data', async ({ page }) => {
  await page.goto('/settings/analytics')

  // Setup download handler
  const downloadPromise = page.waitForEvent('download')

  await page.click('button:has-text("Export")')
  const download = await downloadPromise

  // Verify file
  expect(download.suggestedFilename()).toMatch(/analytics.*\.json/)

  // Verify content
  const content = await download.createReadStream()
  const text = await new Promise<string>((resolve) => {
    let data = ''
    content.on('data', (chunk) => { data += chunk })
    content.on('end', () => resolve(data))
  })

  const json = JSON.parse(text)
  expect(json.events).toBeInstanceOf(Array)
})
```

### Running E2E Tests

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test initialization.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run with UI
npx playwright test --ui

# Debug tests
npx playwright test --debug

# View test report
npx playwright show-report
```

## Performance Tests

Performance tests verify that the application meets performance budgets.

### Example: Initialization Performance

```typescript
import { test, expect } from '@playwright/test'

test('should initialize in under 500ms', async ({ page }) => {
  const startTime = Date.now()

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const endTime = Date.now()
  const loadTime = endTime - startTime

  expect(loadTime).toBeLessThan(500)
})
```

### Example: Core Web Vitals

```typescript
test('should meet Core Web Vitals thresholds', async ({ page }) => {
  await page.goto('/')

  // First Contentful Paint
  const fcp = await page.evaluate(async () => {
    return new Promise<number>((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const fcpEntry = entries.find(
          (e: any) => e.name === 'first-contentful-paint'
        )
        if (fcpEntry) {
          observer.disconnect()
          resolve(fcpEntry.startTime)
        }
      })
      observer.observe({ entryTypes: ['paint'] })
      setTimeout(() => resolve(-1), 5000)
    })
  })

  expect(fcp).toBeLessThan(1800) // Good threshold

  // Cumulative Layout Shift
  const cls = await page.evaluate(async () => {
    return new Promise<number>((resolve) => {
      let clsValue = 0
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        }
      })
      observer.observe({ entryTypes: ['layout-shift'] })
      setTimeout(() => {
        observer.disconnect()
        resolve(clsValue)
      }, 3000)
    })
  })

  expect(cls).toBeLessThan(0.1) // Good threshold
})
```

### Performance Budgets

| Metric | Budget | Why |
|--------|--------|-----|
| First Contentful Paint | <1.5s | Fast perceived load |
| Largest Contentful Paint | <2.5s | Main content visible |
| Time to Interactive | <3s | Page is usable |
| Cumulative Layout Shift | <0.1 | Stable layout |
| First Input Delay | <100ms | Responsive interactions |

### Running Performance Tests

```bash
# Run performance tests
npx playwright test --project=chromium tests/performance/

# Run with Lighthouse (optional)
npx lighthouse http://localhost:3002 --view
```

## Accessibility Tests

Accessibility tests ensure WCAG 2.1 AA compliance.

### Example: Automated Audit

```typescript
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addScriptTag({
    content: `
      (function() {
        window.axe = ${readFileSync('./node_modules/axe-core/axe.min.js', 'utf8')};
      })();
    `,
  })
})

test('should have no accessibility violations', async ({ page }) => {
  await page.goto('/settings')
  await page.waitForLoadState('networkidle')

  const results = await page.evaluate(() => {
    return window.axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
    })
  })

  expect(results.violations).toEqual([])
})
```

### Example: Keyboard Navigation

```typescript
test('should be fully keyboard navigable', async ({ page }) => {
  await page.goto('/settings')

  // Tab through all interactive elements
  const interactiveCount = await page.evaluate(() => {
    return document.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).length
  })

  for (let i = 0; i < interactiveCount; i++) {
    await page.keyboard.press('Tab')

    const focused = await page.evaluate(() => {
      const active = document.activeElement
      return active ? active.tagName : null
    })

    expect(focused).toBeTruthy()
  }
})
```

### Running Accessibility Tests

```bash
# Run accessibility tests
npx playwright test tests/a11y/

# Run with axe DevTools (manual testing)
# Install browser extension and inspect page
```

## Coverage Goals

### Target Coverage

| Category | Target | Current |
|----------|--------|---------|
| Unit Tests | 80%+ | TBD |
| Integration Tests | 90%+ | TBD |
| E2E Tests | 100% (critical paths) | TBD |
| Accessibility | WCAG 2.1 AA | TBD |

### Generating Coverage Reports

```bash
# Generate coverage for unit/integration tests
npm test -- --coverage

# View HTML coverage report
open coverage/index.html
```

### Coverage Exclusions

The following are excluded from coverage:
- Test files
- Configuration files
- Type definitions
- Mock implementations

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test -- integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  accessibility-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright test tests/a11y/

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright test tests/performance/
```

### Test Scripts in package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:integration": "vitest --config vitest.config.integration.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:a11y": "playwright test tests/a11y/",
    "test:perf": "playwright test tests/performance/",
    "test:all": "npm run test && npm run test:integration && npm run test:e2e"
  }
}
```

---

## Best Practices

### Unit Tests

1. **Test one thing**: Each test should verify a single behavior
2. **Use descriptive names**: Test names should clearly indicate what's being tested
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Mock dependencies**: Isolate the code under test
5. **Test edge cases**: Don't just test the happy path

### Integration Tests

1. **Test interactions**: Focus on how components work together
2. **Use real dependencies**: Test actual integrations, not mocks
3. **Test error cases**: Verify error handling
4. **Keep tests fast**: Avoid slow operations
5. **Use beforeEach/afterEach**: Clean up state between tests

### E2E Tests

1. **Test user journeys**: Focus on critical paths
2. **Use page objects**: Organize test code
3. **Wait properly**: Use explicit waits, not `setTimeout`
4. **Make tests deterministic**: Avoid random data and timing issues
5. **Keep tests short**: Long-running tests are brittle

### Performance Tests

1. **Test in realistic conditions**: Use typical device speeds
2. **Measure consistently**: Run multiple times
3. **Set clear thresholds**: Define pass/fail criteria
4. **Test regularly**: Catch regressions early
5. **Profile bottlenecks**: Investigate failures

### Accessibility Tests

1. **Test with tools**: Use automated tools (axe, Lighthouse)
2. **Test manually**: Automated tools can't catch everything
3. **Test with screen readers**: Verify real-world usage
4. **Test keyboard navigation**: Ensure full keyboard access
5. **Test different viewports**: Check mobile and zoom levels

---

## Troubleshooting

### Tests Failing Locally but Passing in CI

**Issue**: Environment differences
**Solution**: Match CI environment locally (use Docker, same Node version)

### Flaky E2E Tests

**Issue**: Timing issues, network delays
**Solution**: Use explicit waits, avoid arbitrary timeouts

### Coverage Not Increasing

**Issue**: Tests not hitting new code
**Solution**: Review coverage report, identify gaps

### Performance Tests Failing

**Issue**: Machine variability
**Solution**: Use percentiles, run multiple times, set reasonable thresholds

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [axe-core](https://www.deque.com/axe/)
- [Web.dev Testing](https://web.dev/articles/testing)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
