# Error Handling System

Comprehensive error handling for PersonalLog that provides a great user experience even when things go wrong.

## Table of Contents

1. [Overview](#overview)
2. [Error Categories](#error-categories)
3. [Core Concepts](#core-concepts)
4. [Usage Guide](#usage-guide)
5. [Error Types](#error-types)
6. [Recovery Strategies](#recovery-strategies)
7. [React Integration](#react-integration)
8. [Best Practices](#best-practices)
9. [Examples](#examples)

## Overview

The error handling system is built around three core principles:

1. **Never crash the app** - All errors are caught and handled gracefully
2. **Helpful guidance** - Users get actionable recovery suggestions, not cryptic error messages
3. **Progressive disclosure** - Basic users see simple messages, advanced users can drill down into technical details

### Key Features

- **Centralized logging** - All errors flow through a single handler
- **User-friendly messages** - Every error has a helpful explanation
- **Recovery actions** - Automatic suggestions for fixing the problem
- **Type safety** - Full TypeScript support with strict mode
- **Graceful degradation** - System falls back when features aren't available

## Error Categories

Errors are categorized by how they should be presented to users:

### System Errors (Show Technical Info)

Errors that indicate something is wrong with the system infrastructure:

- **`system`** - WASM, IndexedDB, core system failures
- **`benchmark`** - Performance benchmark failures

These errors show technical details because they're usually debugging scenarios.

### User Errors (Helpful Guidance)

Errors that users can potentially fix themselves:

- **`quota`** - Storage quota exceeded
- **`capability`** - Feature not available on this device
- **`permission`** - Permission denied
- **`offline`** - Network offline

These errors emphasize actionable recovery steps.

### Graceful Degradations (Silent)

Errors that trigger automatic fallback behavior:

- **`wasm-fallback`** - WASM unavailable, use JavaScript
- **`hardware-incomplete`** - Hardware info incomplete, use defaults
- **`timeout`** - Operation timeout, skip gracefully

These errors may not even be visible to users.

## Core Concepts

### Error Severity Levels

- **`critical`** - App cannot function (e.g., IndexedDB unavailable)
- **`high`** - Major feature broken (e.g., storage quota exceeded)
- **`medium`** - Feature partially degraded (e.g., hardware detection failed)
- **`low`** - Minor issue, workaround available (e.g., operation timeout)
- **`info`** - Informational, no action needed

### Recovery Potential

Every error has a recovery potential that determines what happens next:

- **`recoverable`** - User can fix it (retry, grant permission, etc.)
- **`fallback`** - System can provide alternative (JS instead of WASM)
- **`degraded`** - Can continue with reduced functionality
- **`fatal`** - Cannot recover, must abort

## Usage Guide

### Basic Error Handling

```typescript
import { log } from '@/lib/errors';

try {
  await riskyOperation();
} catch (error) {
  log(error, {
    component: 'ConversationList',
    operation: 'loadConversations',
  });
}
```

### Throwing Typed Errors

```typescript
import { WasmError, QuotaError, CapabilityError } from '@/lib/errors';

// WASM failed
throw new WasmError('Failed to load vector module', {
  severity: 'high',
  context: { module: 'vector-search' },
});

// Storage quota
throw new QuotaError(usedBytes, totalBytes, {
  userMessage: 'Storage almost full. Clear old conversations?',
});

// Missing capability
throw new CapabilityError('WebGPU', 'a compatible GPU', {
  userMessage: 'WebGPU acceleration is not available on your device.',
});
```

### React Error Boundaries

```typescript
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary
      onError={(errorRecord) => {
        // Send to analytics
        analytics.track('error', errorRecord);
      }}
    >
      <YourComponentTree />
    </ErrorBoundary>
  );
}
```

### Displaying Errors

```typescript
import { ErrorMessage } from '@/components/errors/ErrorMessage';

function MyComponent() {
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    return (
      <ErrorMessage
        error={error}
        variant="inline"
        showRecoveryActions={true}
        onClose={() => setError(null)}
      />
    );
  }

  return <div>...</div>;
}
```

## Error Types

### PersonalLogError (Base Class)

All custom errors extend from this base class:

```typescript
export class PersonalLogError extends Error {
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly recovery: RecoveryPotential;
  readonly userMessage: string;
  readonly technicalDetails?: string;
  readonly context?: Record<string, unknown>;
  readonly timestamp: number;
  readonly recoverable: boolean;
}
```

### Specialized Error Classes

#### WasmError

```typescript
throw new WasmError('Module failed to load', {
  severity: 'high',
  userMessage: 'Using JavaScript mode instead',
  context: { module: 'vector-search' },
});
```

#### QuotaError

```typescript
throw new QuotaError(usedBytes, totalBytes, {
  severity: 'critical',
  userMessage: 'Storage almost full (500MB / 512MB)',
});
```

#### NetworkError

```typescript
throw new NetworkError('Request failed', {
  url: '/api/conversations',
  status: 500,
  userMessage: 'Server error. Please try again.',
});
```

#### TimeoutError

```typescript
throw new TimeoutError('vector-search', 5000, {
  userMessage: 'Search timed out. Try again or use filters.',
});
```

## Recovery Strategies

The system includes automatic recovery strategies for common errors:

### WASM Recovery

Automatically falls back to JavaScript when WASM fails:

```typescript
import { wasmRecovery } from '@/lib/errors/recovery';

const vectorSearch = await wasmRecovery.getFallback('vector-search');
```

### Storage Recovery

Automatically manages storage quota:

```typescript
import { storageRecovery } from '@/lib/errors/recovery';

// Check quota
const quota = await storageRecovery.checkStorageQuota();

// Recover space
const recovered = await storageRecovery.recoverSpace(targetBytes);

// Request more quota
const granted = await storageRecovery.requestQuota(requestedBytes);
```

### Network Recovery

Automatic retry with exponential backoff:

```typescript
import { networkRecovery } from '@/lib/errors/recovery';

const response = await networkRecovery.fetchWithRetry(
  url,
  options,
  3 // max retries
);
```

### Timeout Recovery

Graceful timeout handling:

```typescript
import { timeoutRecovery } from '@/lib/errors/recovery';

const result = await timeoutRecovery.withTimeout(
  operation,
  5000, // 5 second timeout
  fallbackOperation
);
```

## React Integration

### Error Boundary Component

```typescript
import {
  ErrorBoundary,
  useErrorHandler,
  useErrorBoundary,
} from '@/components/errors/ErrorBoundary';

// Wrap your app
function App() {
  return (
    <ErrorBoundary fallback={CustomErrorFallback}>
      <ComponentTree />
    </ErrorBoundary>
  );
}

// Handle errors in components
function Component() {
  const handleError = useErrorHandler();

  const onClick = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      handleError(error, { component: 'Component' });
    }
  };
}

// Trigger error boundary programmatically
function Component() {
  const triggerError = useErrorBoundary();

  const validate = (data) => {
    if (!data) {
      triggerError(new Error('Invalid data'));
    }
  };
}
```

### Error Message Component

```typescript
import {
  ErrorMessage,
  ErrorBanner,
  InlineError,
} from '@/components/errors/ErrorMessage';

// Inline error
<ErrorMessage
  error={error}
  variant="inline"
  showRecoveryActions={true}
  showTechnicalDetails="auto"
/>

// Banner error
<ErrorBanner
  error={error}
  onClose={() => setError(null)}
/>

// Compact inline
<InlineError error={error} />
```

### Recovery Actions Component

```typescript
import {
  RecoveryActions,
  StorageQuotaRecovery,
  NetworkRecovery,
  PermissionRecovery,
} from '@/components/errors/RecoveryActions';

// Generic recovery actions
<RecoveryActions
  error={error}
  layout="horizontal"
  onActionExecuted={(action, success) => {
    console.log(`${action.label}: ${success ? 'success' : 'failed'}`);
  }}
/>

// Specialized components
<StorageQuotaRecovery
  usedBytes={used}
  totalBytes={total}
  onRecovered={(bytes) => console.log(`Recovered ${bytes} bytes`)}
/>

<NetworkRecovery onRetry={() => refetch()} />

<PermissionRecovery
  permission="microphone"
  onRequest={async () => {
    const granted = await navigator.permissions.request({ name: 'microphone' });
  }}
/>
```

## Best Practices

### 1. Always Log Errors

```typescript
// Good
try {
  await operation();
} catch (error) {
  log(error, { component: 'MyComponent', operation: 'saveData' });
}

// Bad - silent failures
try {
  await operation();
} catch (error) {
  // Do nothing
}
```

### 2. Use Typed Errors

```typescript
// Good - provides context
throw new WasmError('Vector module failed', {
  severity: 'high',
  context: { module: 'vector-search', version: '1.0.0' },
});

// Bad - loses context
throw new Error('Module failed');
```

### 3. Provide Recovery Actions

```typescript
// Good - actionable
throw new QuotaError(used, total, {
  userMessage: 'Clear old conversations to continue?',
});

// Bad - unhelpful
throw new Error('Out of storage');
```

### 4. Never Crash

```typescript
// Good - graceful degradation
try {
  const data = await fetchWithRetry(url);
  return processData(data);
} catch (error) {
  log(error);
  return getFallbackData();
}

// Bad - crashes app
try {
  const data = await fetch(url);
  return processData(data);
} catch (error) {
  throw error; // Unhandled!
}
```

### 5. Context Matters

```typescript
// Good - rich context
log(error, {
  component: 'ConversationList',
  operation: 'loadConversations',
  additional: {
    userId: '123',
    conversationCount: 50,
    lastSync: '2024-01-01',
  },
});

// Bad - no context
log(error);
```

## Examples

### Example 1: Handling Storage Quota

```typescript
import { QuotaError, log } from '@/lib/errors';
import { storageRecovery } from '@/lib/errors/recovery';
import { StorageQuotaRecovery } from '@/components/errors/RecoveryRecovery';

async function saveConversation(conversation: Conversation) {
  // Check quota first
  const quota = await storageRecovery.checkStorageQuota();

  if (quota.usagePercentage > 90) {
    throw new QuotaError(quota.usage, quota.quota, {
      severity: 'critical',
      userMessage: `Storage almost full (${Math.round(quota.usage / 1024 / 1024)}MB used). Clear old conversations?`,
    });
  }

  // Try to save
  try {
    await db.save(conversation);
  } catch (error) {
    // Try to recover space
    const recovered = await storageRecovery.recoverSpace(1024 * 1024); // 1MB

    if (recovered > 0) {
      // Retry after recovery
      await db.save(conversation);
    } else {
      throw error;
    }
  }
}

// In React component
function ConversationEditor() {
  const [quotaError, setQuotaError] = useState<QuotaError | null>(null);

  if (quotaError) {
    return (
      <StorageQuotaRecovery
        usedBytes={quotaError.usedBytes}
        totalBytes={quotaError.totalBytes}
        onRecovered={() => {
          setQuotaError(null);
          // Retry save
        }}
      />
    );
  }

  // ... rest of component
}
```

### Example 2: WASM with Fallback

```typescript
import { WasmError, withFallback } from '@/lib/errors';
import { wasmRecovery } from '@/lib/errors/recovery';

// Method 1: Manual fallback
async function loadVectorSearch() {
  try {
    const module = await import('./vector.wasm');
    return module;
  } catch (error) {
    log(new WasmError('WASM vector search unavailable', {
      severity: 'medium',
      context: { module: 'vector-search' },
    }));

    // Fall back to JS
    return wasmRecovery.getFallback('vector-search');
  }
}

// Method 2: Using withFallback helper
const loadVectorSearch = withFallback(
  () => import('./vector.wasm'),
  () => wasmRecovery.getFallback('vector-search'),
  'vector-search'
);
```

### Example 3: Network Requests

```typescript
import { NetworkError, log } from '@/lib/errors';
import { networkRecovery } from '@/lib/errors/recovery';

async function fetchConversations(): Promise<Conversation[]> {
  try {
    // Automatic retry with exponential backoff
    const response = await networkRecovery.fetchWithRetry(
      '/api/conversations',
      undefined,
      3 // max 3 retries
    );

    return response.json();
  } catch (error) {
    // Check if offline
    if (!navigator.onLine) {
      log(new NetworkError('Offline - using cached data', {
        context: { endpoint: '/api/conversations' },
      }));

      // Return cached data
      return cache.get('conversations') || [];
    }

    throw error;
  }
}
```

### Example 4: Complete Error Handling Flow

```typescript
import {
  log,
  WasmError,
  QuotaError,
  NetworkError,
  TimeoutError,
} from '@/lib/errors';
import { ErrorBoundary, ErrorMessage } from '@/components/errors/ErrorBoundary';
import { RecoveryActions } from '@/components/errors/RecoveryActions';

// 1. Wrap app with error boundary
function App() {
  return (
    <ErrorBoundary>
      <ConversationManager />
    </ErrorBoundary>
  );
}

// 2. Component with error handling
function ConversationManager() {
  const [error, setError] = useState<Error | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      // Check storage quota
      const quota = await storageRecovery.checkStorageQuota();
      if (quota.usagePercentage > 90) {
        throw new QuotaError(quota.usage, quota.quota);
      }

      // Load with timeout
      const data = await timeoutRecovery.withTimeout(
        () => fetchConversations(),
        5000,
        () => getCachedConversations()
      );

      setConversations(data);
    } catch (err) {
      log(err, {
        component: 'ConversationManager',
        operation: 'loadConversations',
      });
      setError(err as Error);
    }
  }

  // 3. Display error with recovery actions
  if (error) {
    return (
      <div className="p-4">
        <ErrorMessage
          error={error}
          variant="inline"
          showRecoveryActions={false} // Show separately
        />
        <div className="mt-4">
          <RecoveryActions
            error={error}
            onActionExecuted={(action, success) => {
              if (success) {
                setError(null);
                loadConversations();
              }
            }}
          />
        </div>
      </div>
    );
  }

  return <ConversationList conversations={conversations} />;
}
```

## Success Criteria

All error handling code should meet these criteria:

- [x] Error types cover all scenarios
- [x] React error boundaries work
- [x] User messages are helpful
- [x] Recovery actions are actionable
- [x] No unhandled exceptions
- [x] All errors logged for debugging
- [x] Progressive disclosure (basic → advanced)
- [x] Graceful degradation where possible
- [x] TypeScript strict mode compatible
- [x] Zero crashes in production

## Additional Resources

- **Error Types**: `/src/lib/errors/types.ts`
- **Error Handler**: `/src/lib/errors/handler.ts`
- **Recovery Strategies**: `/src/lib/errors/recovery.ts`
- **React Components**: `/src/components/errors/`
- **Examples**: See `/src/app/` for usage patterns

---

*Last Updated: 2025-01-02*
*Error Handling Specialist - PersonalLog Round 2*
