# Test Suite Quick Reference

Quick guide for running and working with the PersonalLog test suite.

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install

# Run all tests
npm run test:all
```

## Test Categories

| Category | Command | Purpose |
|----------|---------|---------|
| Unit | `npm run test:unit` | Test individual functions |
| Integration | `npm run test:integration` | Test system interactions |
| E2E | `npm run test:e2e` | Test user flows in browser |
| Performance | `npm run test:perf` | Verify performance budgets |
| Accessibility | `npm run test:a11y` | Check WCAG compliance |

## Development Workflow

```bash
# Watch mode during development
npm run test:watch

# UI mode for better debugging
npm run test:ui

# Coverage report
npm run test:coverage
```

## E2E Testing

```bash
# Run E2E tests
npm run test:e2e

# With visible browser
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Interactive UI
npm run test:e2e:ui
```

## View Test Reports

```bash
# Vitest coverage report
open coverage/index.html

# Playwright HTML report
npx playwright show-report
```

## Test Structure

```
PersonalLog/
├── src/
│   └── lib/
│       └── __tests__/
│           ├── integration/       # Integration tests
│           │   ├── initialization.test.ts
│           │   ├── provider-interaction.test.ts
│           │   ├── settings-functionality.test.ts
│           │   └── full-flow.test.ts
│           └── setup.ts           # Global test setup
├── tests/
│   ├── e2e/                       # End-to-end tests
│   │   ├── initialization.spec.ts
│   │   ├── settings-navigation.spec.ts
│   │   ├── intelligence-systems.spec.ts
│   │   ├── data-management.spec.ts
│   │   └── setup.ts
│   ├── performance/               # Performance tests
│   │   ├── initialization-performance.test.ts
│   │   └── bundle-size.test.ts
│   └── a11y/                      # Accessibility tests
│       └── settings-a11y.spec.ts
├── vitest.config.ts               # Vitest configuration
├── playwright.config.ts           # Playwright configuration
└── package.json                   # Test scripts
```

## Coverage Goals

| Type | Target | Current |
|------|--------|---------|
| Unit Tests | 80%+ | Framework ready |
| Integration Tests | 90%+ | 150+ tests |
| E2E Tests | 100% (critical) | 35+ scenarios |
| Performance | Core Web Vitals | Budgets set |
| Accessibility | WCAG 2.1 AA | Tests ready |

## Performance Budgets

- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Time to Interactive: <3s
- Cumulative Layout Shift: <0.1
- First Input Delay: <100ms

## Common Issues

### Tests Fail Due to Missing Browsers

```bash
npx playwright install
```

### Port Already in Use

```bash
# Kill process on port 3002
npx kill-port 3002

# Or use a different port
PORT=3003 npm run test:e2e
```

### Coverage Not Generated

```bash
# Install coverage tool
npm install -D @vitest/coverage-v8

# Run with coverage
npm run test:coverage
```

## CI/CD Integration

See `docs/TESTING.md` for GitHub Actions workflow configuration.

## Documentation

- [`docs/INTEGRATION.md`](../docs/INTEGRATION.md) - Integration architecture
- [`docs/SETTINGS_GUIDE.md`](../docs/SETTINGS_GUIDE.md) - Settings documentation
- [`docs/TESTING.md`](../docs/TESTING.md) - Comprehensive testing guide
- [`docs/AGENT_4_SUMMARY.md`](../docs/AGENT_4_SUMMARY.md) - Agent 4 deliverables summary

## Best Practices

1. **Run tests locally before pushing**
2. **Add tests for new features**
3. **Keep tests fast and deterministic**
4. **Test at the right level (unit/integration/e2e)**
5. **Use descriptive test names**
6. **Mock external dependencies**
7. **Clean up in afterEach hooks**
8. **Test edge cases, not just happy paths**

## Getting Help

- See [`docs/TESTING.md`](../docs/TESTING.md) for detailed documentation
- Check test files for examples
- Review Vitest and Playwright documentation
- Open an issue on GitHub
