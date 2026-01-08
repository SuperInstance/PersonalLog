# @superinstance/central-error-manager

> Centralized error handling with categorization, recovery strategies, and structured logging

Central Error Manager is a production-ready error handling system for TypeScript/JavaScript applications. It provides intelligent error categorization, automatic recovery strategies, structured logging with IndexedDB persistence, and user-friendly error messages.

## ✨ Features

- **Intelligent Error Categorization** - Automatically categorizes errors by type, severity, and recovery potential
- **Specialized Error Classes** - Pre-built error types for common scenarios (WASM, storage, network, quota, etc.)
- **Automatic Recovery Strategies** - Built-in recovery behaviors for common error scenarios
- **Structured Logging** - Comprehensive logging system with IndexedDB persistence
- **User-Friendly Messages** - Separate technical details and user-facing messages
- **Error History** - Track error patterns with deduplication
- **Global Error Handlers** - Catches unhandled errors and promise rejections
- **TypeScript First** - Full TypeScript support with comprehensive types
- **Zero Dependencies** - Works completely standalone

## 📦 Installation

```bash
npm install @superinstance/central-error-manager
```

## 🚀 Quick Start

```typescript
import { initializeErrorHandler, handleError } from '@superinstance/central-error-manager';

// Initialize at app startup
await initializeErrorHandler({
  enableLogging: true,
  logToConsole: true,
  userTechnicalLevel: 'intermediate',
});

// Use anywhere in your app
try {
  await someOperation();
} catch (error) {
  handleError(error, {
    component: 'UserProfile',
    operation: 'loadUserData',
  });
}
```

## 📖 Usage

### Basic Error Handling

```typescript
import { handleError, CentralError } from '@superinstance/central-error-manager';

// Catch and log any error
try {
  JSON.parse(invalidJson);
} catch (error) {
  handleError(error, {
    component: 'JSONParser',
    operation: 'parseUserData',
  });
}

// Create specific error types
throw new CentralError('Operation failed', {
  category: 'validation',
  severity: 'high',
  recovery: 'recoverable',
  userMessage: 'Please check your input and try again',
  technicalDetails: 'Failed to validate user input',
  context: { field: 'email', value: userInput },
});
```

### Specialized Error Types

```typescript
import {
  NetworkError,
  StorageError,
  QuotaError,
  ValidationError,
  PermissionError,
  TimeoutError,
} from '@superinstance/central-error-manager';

// Network errors
throw new NetworkError('Failed to fetch user data', {
  url: 'https://api.example.com/user',
  status: 500,
});

// Storage quota exceeded
const { usage, quota } = await navigator.storage.estimate();
throw new QuotaError(usage, quota, {
  userMessage: `Storage is ${Math.round(usage/quota * 100)}% full. Clear old data to continue.`,
});

// Validation errors
throw new ValidationError('Invalid email address', {
  field: 'email',
  value: userInput,
});

// Timeout errors
throw new TimeoutError('Data processing', 5000, {
  context: { datasetSize: 1000000 },
});
```

### Error Wrapping

```typescript
import { withErrorHandling, withFallback } from '@superinstance/central-error-manager';

// Wrap functions with automatic error handling
const safeFetch = withErrorHandling(fetch, {
  component: 'API',
  operation: 'fetchData',
});

// Automatically logs and re-throws errors
await safeFetch('https://api.example.com/data');

// Fallback to secondary implementation
const vectorSearch = withFallback(
  loadWasmVectorSearch,
  loadJsVectorSearch,
  'vector-search'
);

// Tries WASM first, falls back to JS if it fails
const results = await vectorSearch();
```

### Error History & Analytics

```typescript
import { getErrorHistory, onError } from '@superinstance/central-error-manager';

// Get error history
const history = getErrorHistory({
  category: 'network',
  severity: 'high',
  since: Date.now() - 86400000, // Last 24 hours
});

history.forEach(entry => {
  console.log(`${entry.error.message} - ${entry.count} occurrences`);
});

// Listen for errors
const unsubscribe = onError((errorRecord) => {
  // Send to analytics service
  analytics.track('error', errorRecord);
});

// Stop listening
unsubscribe();
```

### Recovery Actions

```typescript
import { getRecoveryActions, registerRecoveryActions } from '@superinstance/central-error-manager';

// Get recovery actions for an error
try {
  await someOperation();
} catch (error) {
  const actions = getRecoveryActions(error);

  actions.forEach(action => {
    console.log(`${action.label} ${action.primary ? '(Recommended)' : ''}`);
  });
}

// Register custom recovery actions
registerRecoveryActions('network', (error) => [
  {
    label: 'Retry Connection',
    action: async () => {
      await retryConnection();
    },
    primary: true,
  },
  {
    label: 'Enable Offline Mode',
    action: () => {
      enableOfflineMode();
    },
  },
]);
```

### Structured Logging

```typescript
import {
  getLogger,
  logError,
  logWarn,
  logInfo,
  logDebug,
  getLogEntries,
  exportLogsAsJSON,
} from '@superinstance/central-error-manager';

// Get logger instance
const logger = getLogger();

// Log at different levels
logger.debug('Starting operation', { operation: 'data-fetch' });
logger.info('Operation completed', { duration: 1234 });
logger.warn('High memory usage', { usage: 0.9 });
logger.error('Operation failed', errorRecord, { component: 'API' });

// Convenience functions
logInfo('User logged in', { userId: '123' });
logError('Failed to save data', error, { component: 'Database' });

// Query logs
const recentErrors = await getLogEntries({
  level: 'error',
  since: Date.now() - 3600000, // Last hour
  limit: 100,
});

// Export logs
const jsonLogs = await exportLogsAsJSON();
console.log(jsonLogs);
```

### Recovery Strategies

```typescript
import {
  wasmRecovery,
  storageRecovery,
  networkRecovery,
  timeoutRecovery,
} from '@superinstance/central-error-manager';

// WASM fallback
if (!wasmRecovery.isWasmAvailable()) {
  const jsFallback = await wasmRecovery.getFallback('vector-search');
  // Use JS implementation instead
}

// Storage management
const quotaInfo = await storageRecovery.checkStorageQuota();
if (quotaInfo.usagePercentage > 80) {
  const recovered = await storageRecovery.recoverSpace(10 * 1024 * 1024);
  console.log(`Recovered ${recovered} bytes`);
}

// Network with retry
const response = await networkRecovery.fetchWithRetry(
  'https://api.example.com/data',
  { method: 'GET' },
  3 // max retries
);

// Timeout with fallback
const result = await timeoutRecovery.withTimeout(
  () => expensiveOperation(),
  5000, // 5 second timeout
  () => getCachedResult() // fallback
);

// Debounce operations
const debouncedSearch = timeoutRecovery.debounce(performSearch, 300);
debouncedSearch(query);
```

## 🎯 Error Categories

| Category | Description | Severity | Recovery |
|----------|-------------|----------|----------|
| `system` | WASM, IndexedDB, hardware failures | critical/high | fatal/fallback |
| `benchmark` | Performance benchmark failures | medium | degraded |
| `network` | Network/API failures | medium/high | degraded/recoverable |
| `quota` | Storage quota exceeded | high | recoverable |
| `capability` | Feature not available | medium | degraded |
| `offline` | Network offline | high | recoverable |
| `wasm-fallback` | WASM unavailable | low | fallback |
| `timeout` | Operation timeout | low | degraded |
| `validation` | Input validation failed | low | recoverable |
| `not-found` | Resource not found | medium | recoverable |
| `permission` | Permission denied | high | recoverable |

## 🔧 Configuration

```typescript
import { initializeErrorHandler } from '@superinstance/central-error-manager';

await initializeErrorHandler({
  // Enable/disable error logging
  enableLogging: true,

  // Show user notifications
  enableUserNotifications: true,

  // Log to console
  logToConsole: true,

  // User technical level (affects error messages)
  userTechnicalLevel: 'intermediate', // 'basic' | 'intermediate' | 'advanced'
});
```

### Logger Configuration

```typescript
import { getLogger } from '@superinstance/central-error-manager';

const logger = getLogger({
  minLevel: 'info', // 'debug' | 'info' | 'warn' | 'error'
  enableConsole: true,
  enablePersistence: true,
  bufferSize: 100,
  flushInterval: 30000, // 30 seconds
  maxLogEntries: 1000,
});
```

## 📊 Error Records

Every error is normalized into an `ErrorRecord`:

```typescript
interface ErrorRecord {
  name: string;              // Error class name
  message: string;           // Error message
  category: ErrorCategory;   // Error category
  severity: ErrorSeverity;   // 'critical' | 'high' | 'medium' | 'low' | 'info'
  recovery: RecoveryPotential; // 'recoverable' | 'fallback' | 'degraded' | 'fatal'
  userMessage: string;       // User-friendly message
  technicalDetails?: string; // Technical details
  context?: Record<string, unknown>; // Additional context
  timestamp: number;         // Unix timestamp
  recoverable: boolean;      // Can recover from this error
  stack?: string;           // Stack trace
}
```

## 🎨 Type Guards

```typescript
import {
  isCentralError,
  isRecoverable,
  shouldFallback,
  getErrorCategory,
  getErrorSeverity,
} from '@superinstance/central-error-manager';

// Check error type
if (isCentralError(error)) {
  console.log(error.category); // TypeScript knows this is CentralError
}

// Check recovery options
if (isRecoverable(error)) {
  // Show retry button
}

// Check if should use fallback
if (shouldFallback(error)) {
  const fallback = await getFallbackImplementation();
  return fallback();
}

// Get error properties
const category = getErrorCategory(error); // 'network' | 'system' | etc.
const severity = getErrorSeverity(error); // 'high' | 'medium' | etc.
```

## 🧪 Testing

```typescript
import { resetErrorHandler, getErrorHandler } from '@superinstance/central-error-manager';

// Reset handler between tests
afterEach(() => {
  resetErrorHandler();
});

// Spy on error handling
const handler = getErrorHandler();
jest.spyOn(handler, 'handle');

// Test error handling
try {
  throw new Error('Test error');
} catch (error) {
  handleError(error);
  expect(handler.handle).toHaveBeenCalled();
}
```

## 🌐 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Requires IndexedDB support for logging persistence

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 🔗 Links

- [GitHub Repository](https://github.com/SuperInstance/Central-Error-Manager)
- [Issue Tracker](https://github.com/SuperInstance/Central-Error-Manager/issues)
- [NPM Package](https://www.npmjs.com/package/@superinstance/central-error-manager)

---

Built with ❤️ by [SuperInstance](https://github.com/SuperInstance)
