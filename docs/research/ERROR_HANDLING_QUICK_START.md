# Error Handling Quick Start

Quick reference for the PersonalLog error handling system.

## Installation

The error handling system is already integrated into PersonalLog. Initialize it in your app:

```typescript
// app/layout.tsx or _app.tsx
import { initializeErrorHandler } from '@/lib/errors';

initializeErrorHandler({
  enableLogging: true,
  logToConsole: true,
  userTechnicalLevel: 'intermediate', // 'basic' | 'intermediate' | 'advanced'
});
```

## Basic Usage

### 1. Catch and Log Errors

```typescript
import { log } from '@/lib/errors';

try {
  await someOperation();
} catch (error) {
  log(error, {
    component: 'MyComponent',
    operation: 'saveData',
  });
}
```

### 2. Throw Typed Errors

```typescript
import {
  WasmError,
  QuotaError,
  NetworkError,
  CapabilityError,
} from '@/lib/errors';

// WASM failure
throw new WasmError('Vector module failed');

// Storage quota
throw new QuotaError(usedBytes, totalBytes);

// Network error
throw new NetworkError('Request failed', { url: '/api/data' });

// Missing capability
throw new CapabilityError('WebGPU', 'a compatible GPU');
```

### 3. React Error Boundary

```typescript
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### 4. Display Errors

```typescript
import { ErrorMessage } from '@/components/errors/ErrorMessage';

<ErrorMessage
  error={error}
  variant="inline"
  showRecoveryActions={true}
/>
```

## Error Categories

| Category | When to Use | Recovery |
|----------|-------------|----------|
| `system` | WASM, IndexedDB failures | fallback |
| `quota` | Storage exceeded | recoverable |
| `network` | Network failures | recoverable |
| `offline` | No connection | recoverable |
| `capability` | Feature unavailable | degraded |
| `timeout` | Operation timeout | degraded |
| `permission` | Permission denied | recoverable |

## Recovery Strategies

```typescript
import {
  wasmRecovery,
  storageRecovery,
  networkRecovery,
  timeoutRecovery,
} from '@/lib/errors/recovery';

// WASM fallback
const module = await wasmRecovery.getFallback('vector-search');

// Check storage quota
const quota = await storageRecovery.checkStorageQuota();

// Recover space
const bytes = await storageRecovery.recoverSpace(1024 * 1024);

// Network with retry
const response = await networkRecovery.fetchWithRetry(url, options, 3);

// Timeout with fallback
const result = await timeoutRecovery.withTimeout(operation, 5000, fallback);
```

## React Hooks

```typescript
import {
  useErrorHandler,
  useErrorBoundary,
} from '@/components/errors/ErrorBoundary';

// Handle errors in components
const handleError = useErrorHandler();

// Trigger error boundary
const triggerError = useErrorBoundary();
```

## Best Practices

✅ **DO:**
- Always log errors with context
- Use typed error classes
- Provide helpful user messages
- Include recovery actions
- Handle errors at appropriate levels

❌ **DON'T:**
- Throw generic `Error` objects
- Silent catch without logging
- Show stack traces to users
- Crash the app on errors
- Ignore error context

## Common Patterns

### Pattern 1: Fallback Behavior

```typescript
async function loadFeature() {
  try {
    return await loadPrimaryImplementation();
  } catch (error) {
    log(error);
    return await loadFallbackImplementation();
  }
}
```

### Pattern 2: Retry with Backoff

```typescript
async function fetchWithRetry(url: string) {
  try {
    return await networkRecovery.fetchWithRetry(url, undefined, 3);
  } catch (error) {
    log(error);
    return await getCachedData(url);
  }
}
```

### Pattern 3: Quota Management

```typescript
async function saveData(data: any) {
  const quota = await storageRecovery.checkStorageQuota();

  if (quota.usagePercentage > 90) {
    throw new QuotaError(quota.usage, quota.quota);
  }

  try {
    await db.save(data);
  } catch (error) {
    const recovered = await storageRecovery.recoverSpace(1024 * 1024);
    if (recovered > 0) {
      await db.save(data);
    } else {
      throw error;
    }
  }
}
```

## File Structure

```
src/lib/errors/
├── types.ts          # Error type definitions
├── handler.ts        # Central error handler
├── recovery.ts       # Recovery strategies
└── index.ts          # Public API

src/components/errors/
├── ErrorBoundary.tsx      # React error boundary
├── ErrorMessage.tsx       # Error display component
└── RecoveryActions.tsx    # Recovery actions component

docs/research/
└── error-handling.md      # Full documentation
```

## Quick Reference

### Import Paths

```typescript
// Core functionality
import { log, handleError } from '@/lib/errors';

// Error types
import { WasmError, QuotaError, NetworkError } from '@/lib/errors';

// Recovery strategies
import { wasmRecovery, storageRecovery } from '@/lib/errors/recovery';

// React components
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { ErrorMessage } from '@/components/errors/ErrorMessage';
import { RecoveryActions } from '@/components/errors/RecoveryActions';
```

### Error Severity Levels

- `critical` - App cannot function
- `high` - Major feature broken
- `medium` - Feature partially degraded
- `low` - Minor issue, workaround available
- `info` - Informational

### Recovery Potential

- `recoverable` - User can fix it
- `fallback` - System provides alternative
- `degraded` - Continue with reduced functionality
- `fatal` - Cannot recover

## Troubleshooting

**Q: Errors not showing in console?**
A: Check `enableLogging` and `logToConsole` in config.

**Q: Recovery actions not appearing?**
A: Make sure `showRecoveryActions={true}` on ErrorMessage component.

**Q: Error boundary not catching errors?**
A: Ensure ErrorBoundary wraps the component tree, not individual async operations.

**Q: How do I customize error messages?**
A: Use the `userMessage` parameter when throwing typed errors.

## See Also

- [Full Documentation](./error-handling.md)
- [Error Types Reference](../../src/lib/errors/types.ts)
- [Recovery Strategies](../../src/lib/errors/recovery.ts)
- [React Components](../../src/components/errors/)
