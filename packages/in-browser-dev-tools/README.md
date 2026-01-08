# @superinstance/in-browser-dev-tools

> Comprehensive in-browser development tools for debugging, tracing, state inspection, and mock data generation

## Features

- **Structured Logging** - Filterable, searchable logging with levels and categories
- **Performance Tracing** - Measure execution time, track performance, and profile memory
- **State Inspection** - Inspect, snapshot, and diff application state
- **Mock Data Generation** - Generate realistic test data for development and testing

## Installation

```bash
npm install @superinstance/in-browser-dev-tools
```

## Quick Start

```typescript
import { debug, info, warn, error } from '@superinstance/in-browser-dev-tools';

// Logging
info('Application started', { version: '1.0.0' }, 'system', 'app');

// Performance tracing
import { trace } from '@superinstance/in-browser-dev-tools';
const result = await trace('expensive-operation', 'computation', async () => {
  return await performExpensiveOperation();
});

// State inspection
import { registerInspector } from '@superinstance/in-browser-dev-tools';
registerInspector('my-state', {
  scope: 'app',
  getState: async () => ({ foo: 'bar' }),
  setState: async (value) => { /* ... */ }
});

// Mock data generation
import { generateConversation } from '@superinstance/in-browser-dev-tools';
const mockConv = generateConversation({ title: 'Test Conv' });
```

## Documentation

### Logging

The logger provides structured logging with multiple levels and categories:

```typescript
import { logger, debug, info, warn, error } from '@superinstance/in-browser-dev-tools';

// Log at different levels
debug('Detailed debug information', { details: '...' }, 'api', 'userService');
info('User logged in', { userId: '123' }, 'api', 'authService');
warn('High memory usage', { usage: '90%' }, 'performance', 'monitor');
error('API request failed', { error: 'Connection timeout' }, 'api', 'apiService', new Error('Timeout'));

// Filter and retrieve logs
const recentErrors = logger.getLogs({
  minLevel: 'error',
  startTime: Date.now() - 3600000 // Last hour
});

// Subscribe to new logs
const unsubscribe = logger.subscribe((entry) => {
  if (entry.level === 'error') {
    // Send to error tracking service
  }
});

// Export/import logs
const exportedLogs = logger.exportLogs();
logger.importLogs(exportedLogs);
```

### Performance Tracing

Measure execution time and track performance metrics:

```typescript
import { tracer, startSpan, endSpan, trace, traceSync } from '@superinstance/in-browser-dev-tools';

// Manual span tracing
const spanId = startSpan('database-query', 'api');
try {
  const result = await db.query('SELECT * FROM users');
  endSpan(spanId);
} catch (error) {
  endSpan(spanId, error.message);
}

// Automatic async tracing
const result = await trace('fetch-user-data', 'api', async () => {
  const user = await fetchUser();
  const posts = await fetchPosts();
  return { user, posts };
}, { userId: '123' });

// Sync tracing
const sorted = traceSync('sort-array', 'computation', () => {
  return largeArray.sort((a, b) => a - b);
});

// Get performance metrics
const metrics = tracer.calculateMetrics();
console.log(`Average duration: ${metrics.avgDuration}ms`);
console.log(`Slowest operations:`, tracer.getSlowestSpans(5));

// Take performance snapshot
const snapshot = tracer.takeSnapshot({ customMetric: getValue() });
console.log(`Memory usage: ${snapshot.memoryUsedMB}MB`);

// Get memory trend over time
const trend = tracer.getMemoryTrend();
```

### State Inspection

Inspect, snapshot, and diff application state:

```typescript
import {
  stateInspector,
  registerInspector,
  inspectState,
  takeSnapshot
} from '@superinstance/in-browser-dev-tools';

// Register a state inspector
registerInspector('app-state', {
  scope: 'app',
  identifier: 'main',
  getState: async () => ({
    user: currentUser,
    settings: appSettings,
    route: currentRoute
  }),
  setState: async (value) => {
    // Update state
  }
});

// Inspect state
const appState = await inspectState('app-state');

// Take snapshot
const snapshot1 = await takeSnapshot('app-state');

// ... make changes ...

const snapshot2 = await takeSnapshot('app-state');

// Compare snapshots
const diffs = stateInspector.compareSnapshots(snapshot1.id, snapshot2.id);
console.log('Changes:', diffs);

// Restore from snapshot
await stateInspector.restoreFromSnapshot(snapshot1.id);

// Get all state
const allStates = await stateInspector.inspectAllStates();
```

### Mock Data Generation

Generate realistic test data:

```typescript
import {
  generateConversation,
  generateConversations,
  generateMessages,
  generateKnowledgeEntry,
  generatePluginState,
  mockData
} from '@superinstance/in-browser-dev-tools';

// Generate conversations
const conversation = generateConversation({
  title: 'Test Conversation',
  messageCount: 10
});

const conversations = generateConversations(20);

// Generate messages
const messages = generateMessages(conversation.id, 5);

// Generate knowledge entries
const entry = generateKnowledgeEntry({
  title: 'Test Entry',
  tags: ['code', 'documentation']
});

// Generate plugin states
const pluginState = generatePluginState({
  name: 'My Plugin',
  enabled: true
});

// Generate custom random data
const randomString = mockData.randomString(10);
const randomId = mockData.randomId('prefix_');
const randomNumber = mockData.randomNumber(1, 100);
const randomDate = mockData.randomDate(30); // Last 30 days

// Generate performance data
const performanceMetrics = mockData.generatePerformanceMetrics();
const performanceTimeline = mockData.generatePerformanceTimeline(20);

// Generate log entries
const logEntry = mockData.generateLogEntry();
const logEntries = mockData.generateLogEntries(50);
```

## API Reference

### Logger

- `debug(message, data?, category?, source?)` - Log debug message
- `info(message, data?, category?, source?)` - Log info message
- `warn(message, data?, category?, source?)` - Log warning
- `error(message, data?, category?, source?, error?)` - Log error
- `getLogs(filter?)` - Get filtered logs
- `getLog(id)` - Get log by ID
- `getLogsByLevel()` - Get counts grouped by level
- `getLogsByCategory()` - Get counts grouped by category
- `clear()` - Clear all logs
- `exportLogs()` - Export logs as JSON
- `importLogs(json)` - Import logs from JSON
- `setLevelFilter(level, enabled)` - Set level filter
- `setCategoryFilter(category, enabled)` - Set category filter
- `subscribe(listener)` - Subscribe to new logs

### Tracer

- `startSpan(name, category, parentId?, metadata?)` - Start a new span
- `endSpan(id, error?)` - End a span
- `trace(name, category, fn, metadata?)` - Trace async function
- `traceSync(name, category, fn, metadata?)` - Trace sync function
- `getSpan(id)` - Get span by ID
- `getSpans()` - Get all spans
- `getSpansByCategory(category)` - Get spans by category
- `getSlowestSpans(limit?)` - Get slowest spans
- `calculateMetrics()` - Calculate performance metrics
- `takeSnapshot(customMetrics?)` - Take performance snapshot
- `getMemoryTrend()` - Get memory usage trend
- `clearSpans()` - Clear all spans

### State Inspector

- `registerInspector(id, inspector)` - Register state inspector
- `unregisterInspector(id)` - Unregister inspector
- `inspectState(id)` - Get state from inspector
- `inspectAllStates()` - Get all states
- `setState(id, value)` - Set state
- `takeSnapshot(id, key?)` - Take state snapshot
- `getSnapshots()` - Get all snapshots
- `compareSnapshots(id1, id2)` - Compare two snapshots
- `restoreFromSnapshot(id)` - Restore from snapshot

### Mock Data

- `generateConversation(overrides?)` - Generate mock conversation
- `generateConversations(count?)` - Generate multiple conversations
- `generateMessages(conversationId, count?)` - Generate messages
- `generateKnowledgeEntry(overrides?)` - Generate knowledge entry
- `generateKnowledgeEntries(count?)` - Generate multiple entries
- `generatePluginState(overrides?)` - Generate plugin state
- `generatePluginStates(count?)` - Generate multiple plugin states
- `randomString(length?)` - Generate random string
- `randomId(prefix?)` - Generate random ID
- `randomNumber(min, max)` - Generate random number
- `randomBoolean(likelihood?)` - Generate random boolean
- `randomDate(daysBack?)` - Generate random date

## Use Cases

- **Debugging** - Add structured logging to understand application behavior
- **Performance Optimization** - Identify slow operations and memory leaks
- **State Management** - Debug complex state changes and transitions
- **Testing** - Generate mock data for unit and integration tests
- **Development** - Quickly prototype with realistic test data

## Examples

See the `/examples` directory for complete working examples:

- `basic-logging.ts` - Basic logging usage
- `performance-tracing.ts` - Performance measurement
- `state-inspection.ts` - State management debugging
- `mock-data-generation.ts` - Test data generation

## License

MIT

## Repository

https://github.com/SuperInstance/In-Browser-Dev-Tools

## Contributing

Contributions are welcome! Please see our contributing guidelines.

## Support

Please report issues on GitHub: https://github.com/SuperInstance/In-Browser-Dev-Tools/issues
