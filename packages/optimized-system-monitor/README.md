# @superinstance/optimized-system-monitor

> Comprehensive system monitoring with real-time health tracking, performance analysis, and automatic instrumentation

## Features

- Real-time health monitoring with scores and alerts
- Performance tracking with percentiles and trends
- Automatic instrumentation for common operations
- Metrics collection (CPU, memory, storage, network)
- Alert system with configurable thresholds
- Zero dependencies
- TypeScript-first with full type safety
- Browser-based with localStorage persistence

## Installation

```bash
npm install @superinstance/optimized-system-monitor
```

## Quick Start

### Health Monitoring

```typescript
import { getHealthMonitor } from '@superinstance/optimized-system-monitor';

// Get the singleton instance
const monitor = getHealthMonitor();

// Start monitoring
await monitor.start();

// Get overall health score
const healthScore = monitor.getHealthScore();
console.log(`Health Score: ${healthScore.score}/100 (${healthScore.status})`);

// Get all metrics
const metrics = monitor.getMetrics();
metrics.forEach(metric => {
  console.log(`${metric.name}: ${metric.value} ${metric.unit} (${metric.status})`);
});

// Get active alerts
const alerts = monitor.getActiveAlerts();
alerts.forEach(alert => {
  console.warn(`[${alert.severity}] ${alert.message}`);
});

// Stop monitoring when done
monitor.stop();
```

### Performance Tracking

```typescript
import { getPerformanceTracker } from '@superinstance/optimized-system-monitor';

const tracker = getPerformanceTracker();

// Track an operation
tracker.trackOperation('database-query', 'database', () => {
  // Your code here
  return fetchData();
});

// Track async operations
await tracker.trackOperationAsync('api-call', 'api', async () => {
  const response = await fetch('/api/data');
  return response.json();
});

// Get statistics
const stats = tracker.getStats('database-query');
console.log(`Average: ${stats.mean}ms`);
console.log(`P95: ${stats.p95}ms`);
console.log(`P99: ${stats.p99}ms`);

// Get slowest operations
const slowest = tracker.getSlowestOperations(10);
slowest.forEach(op => {
  console.log(`${op.name}: ${op.duration}ms`);
});
```

### Automatic Instrumentation

```typescript
import { initializeInstrumentation, measure, trackFunction } from '@superinstance/optimized-system-monitor';

// Initialize automatic instrumentation
initializeInstrumentation({
  fetch: true,          // Instrument fetch API
  longTasks: true,      // Monitor long tasks
  resourceLoading: true // Monitor resource loading
});

// Measure code blocks
const result = measure('expensive-calculation', 'custom', () => {
  return computeExpensiveOperation();
});

// Wrap functions
const wrappedFetch = trackFunction('custom-fetch', 'network', fetch);
const response = await wrappedFetch('https://api.example.com');
```

## Use Cases

### 1. Application Health Dashboard

```typescript
import { getHealthMonitor } from '@superinstance/optimized-system-monitor';

async function updateHealthDashboard() {
  const monitor = getHealthMonitor();
  const status = monitor.getSystemHealthStatus();

  // Update UI with health status
  document.getElementById('health-score').textContent = status.healthScore.score;
  document.getElementById('health-status').textContent = status.healthScore.status;

  // Show alerts if any
  if (status.alerts.length > 0) {
    showNotification(status.alerts[0].message, status.alerts[0].severity);
  }

  // Update category scores
  for (const [category, score] of Object.entries(status.healthScore.categories)) {
    document.getElementById(`${category}-score`).textContent = score.toFixed(0);
  }
}

// Update dashboard every 5 seconds
setInterval(updateHealthDashboard, 5000);
```

### 2. Performance Regression Detection

```typescript
import { getPerformanceTracker } from '@superinstance/optimized-system-monitor';

function checkPerformanceRegressions() {
  const tracker = getPerformanceTracker();

  // Check trends for critical operations
  const operations = ['api-call', 'database-query', 'render'];
  operations.forEach(op => {
    const trend = tracker.getPerformanceTrend(op);
    if (trend && trend.trend === 'degrading') {
      console.warn(`Performance regression detected for ${op}`);
      console.warn(`Change: ${trend.changePercent.toFixed(1)}%`);
    }
  });

  // Check for slow operations
  const slowOps = tracker.getSlowestOperations(5);
  slowOps.forEach(op => {
    if (op.duration > 1000) {
      console.error(`Slow operation: ${op.name} took ${op.duration.toFixed(0)}ms`);
    }
  });
}
```

### 3. Resource Usage Monitoring

```typescript
import { getHealthMonitor } from '@superinstance/optimized-system-monitor';

const monitor = getHealthMonitor();
await monitor.start();

// Monitor memory usage
setInterval(() => {
  const memoryUsed = monitor.getMetric('memory-used');
  const memoryPercent = monitor.getMetric('memory-usage-percent');

  if (memoryPercent?.value > 80) {
    console.warn(`High memory usage: ${memoryUsed.value}MB (${memoryPercent.value.toFixed(1)}%)`);
    // Trigger cleanup or show warning
  }
}, 10000);

// Monitor storage usage
setInterval(() => {
  const storagePercent = monitor.getMetric('storage-usage-percent');
  if (storagePercent?.value > 90) {
    console.error(`Storage almost full: ${storagePercent.value.toFixed(1)}%`);
    // Trigger cleanup or show warning
  }
}, 30000);
```

### 4. FPS Monitoring for Smooth UX

```typescript
import { getHealthMonitor } from '@superinstance/optimized-system-monitor';

const monitor = getHealthMonitor();
await monitor.start();

// Monitor FPS for smooth animations
setInterval(() => {
  const fps = monitor.getMetric('fps');
  const frameTime = monitor.getMetric('frame-time');

  if (fps?.value < 30) {
    console.warn(`Low FPS detected: ${fps.value} (frame time: ${frameTime?.value.toFixed(1)}ms)`);
    // Reduce animation quality or frequency
  }
}, 5000);
```

### 5. Error Rate Monitoring

```typescript
import { getHealthMonitor } from '@superinstance/optimized-system-monitor';

const monitor = getHealthMonitor();
await monitor.start();

// Monitor error rates
setInterval(() => {
  const errors = monitor.getMetric('error-count');

  if (errors?.value > 10) {
    console.error(`High error count: ${errors.value} errors detected`);
    // Show error notification or trigger recovery
  }
}, 15000);
```

## API Reference

### HealthMonitor

#### Methods

- `start(): Promise<void>` - Start health monitoring
- `stop(): void` - Stop health monitoring
- `isActive(): boolean` - Check if monitoring is active
- `getHealthScore(): HealthScore` - Get overall health score
- `getMetrics(): HealthMetric[]` - Get all current metrics
- `getMetric(name: string): HealthMetric | undefined` - Get specific metric
- `getHealthHistory(): HealthHistoryPoint[]` - Get health score history
- `getActiveAlerts(): HealthAlert[]` - Get active alerts
- `getAllAlerts(): HealthAlert[]` - Get all alerts
- `acknowledgeAlert(alertId: string): void` - Acknowledge an alert
- `dismissAlert(alertId: string): void` - Dismiss an alert
- `getSystemHealthStatus(): SystemHealthStatus` - Get complete system status
- `getMetricHistory(metricName: string): MetricSample[]` - Get metric history
- `clearHistory(): void` - Clear all history
- `resetAlerts(): void` - Reset all alerts
- `exportData(): string` - Export health data as JSON

### PerformanceTracker

#### Methods

- `startOperation(name, category, metadata?): string` - Start tracking an operation
- `endOperation(id, success?, metadata?): void` - End tracking an operation
- `trackOperation(name, category, fn, metadata?): T` - Track synchronous operation
- `trackOperationAsync(name, category, fn, metadata?): Promise<T>` - Track async operation
- `getStats(operationName): OperationStats | null` - Get operation statistics
- `getMetrics(category): OperationMetric[]` - Get metrics by category
- `getCategoryStats(category): CategoryStats | null` - Get category statistics
- `getSlowestOperations(limit?): OperationMetric[]` - Get slowest operations
- `getSlowestOperationNames(limit?)` - Get slowest by name
- `getHighestFailureRate(limit?)` - Get operations with highest failure rate
- `getPerformanceTrend(operationName, window?)` - Get performance trend
- `getAlerts(): PerformanceAlert[]` - Get all alerts
- `clearOldAlerts(maxAge?): void` - Clear old alerts
- `getPerformanceSummary()` - Get performance summary
- `generateReport(): string` - Generate text report
- `clearHistory(): void` - Clear all history

### Instrumentation Functions

- `initializeInstrumentation(options?): void` - Initialize automatic instrumentation
- `instrumentFetch(): void` - Instrument fetch API
- `trackFunction(name, category, fn): T` - Wrap function with tracking
- `trackAsyncFunction(name, category, fn): T` - Wrap async function with tracking
- `trackObject(name, category, obj): T` - Wrap object methods with tracking
- `measure(name, category, fn): T` - Measure code block
- `measureAsync(name, category, fn): Promise<T>` - Measure async code block
- `monitorLongTasks(callback): () => void` - Monitor long tasks
- `monitorResourceLoading(callback): () => void` - Monitor resource loading
- `monitorPageNavigation()` - Get page navigation timing

## Configuration

### Health Monitor Configuration

```typescript
import { getHealthMonitor } from '@superinstance/optimized-system-monitor';

const monitor = getHealthMonitor({
  collectionInterval: 2000,    // Metrics collection interval (ms)
  historySize: 100,            // Number of history points to keep
  anomalyWindow: 10,           // Anomaly detection window
  anomalyThreshold: 2.5,       // Anomaly threshold (standard deviations)
  alertDebounceMs: 30000,      // Alert debouncing (ms)
  autoRecovery: false          // Enable auto-recovery
});

await monitor.start();
```

### Performance Tracker Configuration

```typescript
import { createPerformanceTracker } from '@superinstance/optimized-system-monitor';

const tracker = createPerformanceTracker({
  maxHistorySize: 1000,           // Maximum history size
  slowOperationThreshold: 1000,   // Slow operation threshold (ms)
  highErrorRateThreshold: 0.1,    // High error rate threshold (10%)
  regressionDetectionWindow: 50,  // Regression detection window
  alertCooldown: 60000            // Alert cooldown (ms)
});
```

## Metric Categories

- `performance` - CPU, FPS, frame time, long tasks
- `memory` - Memory usage, heap size
- `storage` - Storage usage, quota
- `network` - Network status, latency
- `system` - Uptime, error count
- `plugin` - Plugin health metrics
- `agent` - Agent health metrics

## Alert Levels

- `info` - Informational alerts
- `warning` - Warning alerts (threshold crossed)
- `critical` - Critical alerts (critical threshold crossed)

## License

MIT

## Repository

https://github.com/SuperInstance/optimized-system-monitor
