# DevTools Quick Reference Guide

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+Shift+D` | Toggle DevTools panel |
| `Escape` | Close DevTools panel |

## Access Methods

### 1. Floating Panel (Recommended)
```tsx
// Automatically included in development mode
<DevToolsProvider>
  <App />
</DevToolsProvider>
```

### 2. Full-Screen Page
```
Navigate to: /debug
```

## DevTools Tabs

### 📊 State Inspector
- **Purpose**: View and edit application state
- **Features**:
  - Tree view of all state
  - Search and filter
  - In-place editing
  - State snapshots
  - Diff viewer

### 🌐 Network Monitor
- **Purpose**: Monitor API calls and network activity
- **Features**:
  - Automatic fetch/XHR interception
  - Request/response inspection
  - Status tracking
  - Duration measurement
  - Statistics dashboard

### ⚡ Performance Profiler
- **Purpose**: Profile app and plugin performance
- **Features**:
  - Real-time FPS monitoring
  - Memory tracking
  - Span recording
  - Slowest operations
  - Category breakdown

### 🔌 Plugin Debugger
- **Purpose**: Debug and monitor plugins
- **Features**:
  - Plugin activation controls
  - State inspection
  - Performance metrics
  - Error tracking
  - Permission viewer

### 💻 Console
- **Purpose**: Enhanced logging console
- **Features**:
  - Real-time logs
  - Level filtering (debug, info, warn, error)
  - Category filtering
  - Search
  - Expandable entries
  - Stack traces

### 🌳 Component Tree
- **Purpose**: Inspect React components
- **Features**:
  - Component hierarchy
  - Props inspection
  - State inspection
  - Hooks inspection
  - Component search

## Logger Usage

```typescript
import { logger } from '@/lib/devtools/logger';

// Basic logging
logger.debug('Debug message', { data: 'value' }, 'plugin', 'MyPlugin');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', { error: details }, 'api', 'MyAPI', errorObject);

// Subscribe to logs
const unsubscribe = logger.subscribe((entry) => {
  console.log('New log:', entry);
});

// Get logs
const allLogs = logger.getLogs();
const errorLogs = logger.getLogs({ minLevel: 'error' });

// Export/import
const json = logger.exportLogs();
logger.importLogs(json);
```

## Tracer Usage

```typescript
import { tracer, trace, traceSync } from '@/lib/devtools/tracer';

// Manual span management
const spanId = tracer.startSpan('operation-name', 'category');
// ... do work ...
tracer.endSpan(spanId);

// Async tracing
const result = await trace('fetch-data', 'api', async () => {
  return await fetchData();
});

// Sync tracing
const value = traceSync('compute', 'computation', () => {
  return expensiveCalculation();
});

// Get metrics
const metrics = tracer.calculateMetrics();
const slowest = tracer.getSlowestSpans(10);
```

## State Inspector Usage

```typescript
import {
  registerInspector,
  stateInspector,
  inspectState,
  takeSnapshot
} from '@/lib/devtools/state';

// Register custom inspector
registerInspector('my-feature', {
  scope: 'custom',
  identifier: 'my-feature',
  async getState() {
    return { /* your state */ };
  },
  async setState(value) {
    // update state
  },
  async getKeys() {
    return ['key1', 'key2'];
  },
});

// Inspect state
const state = await inspectState('my-feature');

// Take snapshot
const snapshot = await takeSnapshot('my-feature');

// Compare states
const diffs = stateInspector.compare(oldState, newState);
```

## Mock Data Usage

```typescript
import {
  generateConversation,
  generateConversations,
  generateMessages,
  generatePluginState
} from '@/lib/devtools/mock-data';

// Generate test data
const conversation = generateConversation();
const conversations = generateConversations(10);
const messages = generateMessages(conversation.id, 5);
const pluginState = generatePluginState();
```

## Plugin Integration

Plugins automatically appear in the DevTools Plugin Debugger. No additional setup required.

### Adding Plugin-Specific Logging

```typescript
// In your plugin code
import { logger } from '@/lib/devtools/logger';

export function onActivate(context) {
  logger.info('Plugin activated', { id: context.pluginId }, 'plugin', 'my-plugin');

  // Your plugin logic
}
```

### Adding Plugin-Specific Tracing

```typescript
import { trace } from '@/lib/devtools/tracer';

export async function processMessage(message) {
  return await trace('process-message', 'plugin', async () => {
    // Your processing logic
    return result;
  }, { messageId: message.id }); // metadata
}
```

## Best Practices

1. **Use Appropriate Log Levels**:
   - `debug`: Detailed information for diagnosing problems
   - `info`: General informational messages
   - `warn`: Warning messages for potentially harmful situations
   - `error`: Error messages for critical issues

2. **Use Categories**:
   - `plugin`: Plugin-specific logs
   - `theme`: Theme-related logs
   - `api`: API call logs
   - `ui`: UI interaction logs
   - `storage`: Storage operation logs
   - `performance`: Performance measurement logs
   - `network`: Network activity logs
   - `system`: System-level logs
   - `general`: Everything else

3. **Include Context**:
   ```typescript
   // Good
   logger.info('User logged in', { userId, timestamp }, 'api', 'AuthService');

   // Less helpful
   logger.info('User logged in');
   ```

4. **Use Tracing for Performance**:
   ```typescript
   // Wrap expensive operations
   await trace('expensive-operation', 'computation', async () => {
     return await expensiveOperation();
   });
   ```

5. **Take Snapshots for State Changes**:
   ```typescript
   const before = await takeSnapshot('my-feature');
   // ... make changes ...
   const after = await takeSnapshot('my-feature');
   const diffs = stateInspector.compareSnapshots(before.id, after.id);
   ```

## Troubleshooting

### DevTools Not Showing
- Ensure you're in development mode (`NODE_ENV=development`)
- Check that `DevToolsProvider` wraps your app
- Try the keyboard shortcut: `Cmd/Ctrl+Shift+D`
- Navigate to `/debug` page

### Missing State Inspectors
- Check browser console for errors
- Ensure inspectors are registered after systems initialize
- Verify inspector IDs are unique

### High Memory Usage
- DevTools keeps last 500 logs and 1000 state snapshots
- Use `logger.clear()` to free memory
- Reduce snapshot frequency

### Performance Impact
- DevTools adds minimal overhead in development
- Disable in production: `<DevToolsProvider enableInProduction={false}>`
- Disable specific features if needed

## API Reference

### DevToolsProvider Props
```typescript
interface DevToolsProviderProps {
  children: React.ReactNode;
  enableInProduction?: boolean; // default: false
  defaultOpen?: boolean; // default: false
}
```

### Logger Methods
- `debug(message, data?, category?, source?)`
- `info(message, data?, category?, source?)`
- `warn(message, data?, category?, source?)`
- `error(message, data?, category?, source?, error?)`
- `getLogs(filter?)`
- `clear()`
- `exportLogs()`
- `importLogs(json)`
- `subscribe(listener)`

### Tracer Methods
- `startSpan(name, category, parentId?, metadata?)`
- `endSpan(id, error?)`
- `trace<T>(name, category, fn, metadata?)`
- `traceSync<T>(name, category, fn, metadata?)`
- `calculateMetrics()`
- `getSlowestSpans(limit?)`
- `takeSnapshot(customMetrics?)`

### State Inspector Methods
- `registerInspector(id, inspector)`
- `inspectState(id)`
- `inspectAllStates()`
- `takeSnapshot(id, key?)`
- `compare(oldState, newState, path?)`
- `compareSnapshots(id1, id2)`

## Support

For issues or questions:
1. Check this reference guide
2. Review component source code (well-documented)
3. Check type definitions (TypeScript)
4. Enable verbose logging in DevTools page

---

**Last Updated**: Round 9, Agent 4
**Version**: 1.0.0
**Status**: Production Ready (Development Mode Only)
