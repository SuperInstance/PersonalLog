/**
 * Optimized System Monitor
 *
 * Comprehensive system monitoring with:
 * - Real-time health monitoring
 * - Performance tracking
 * - Automatic instrumentation
 * - Metrics collection and analysis
 * - Alert system
 *
 * @example
 * ```typescript
 * import { getHealthMonitor, getPerformanceTracker } from '@superinstance/optimized-system-monitor';
 *
 * // Start health monitoring
 * const healthMonitor = getHealthMonitor();
 * await healthMonitor.start();
 *
 * // Track performance
 * const tracker = getPerformanceTracker();
 * tracker.trackOperation('my-operation', 'custom', () => {
 *   // Your code here
 * });
 * ```
 */

// ============================================================================
// HEALTH MONITORING
// ============================================================================

export {
  getHealthMonitor,
  resetHealthMonitor,
  HealthMonitor,
} from './health-monitor';

export type {
  HealthMetric,
  HealthScore,
  HealthStatus,
  HealthAlert,
  AlertConfig,
  HealthHistoryPoint,
  HealthTrend,
  SystemHealthStatus,
} from './metrics';

export {
  MetricCategory,
  AlertSeverity,
  TrendDirection,
  DEFAULT_THRESHOLDS,
  DEFAULT_ALERT_CONFIGS,
  DEFAULT_MONITORING_CONFIG,
} from './metrics';

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

export {
  getPerformanceTracker,
  createPerformanceTracker,
} from './performance-tracker';

export type {
  OperationMetric,
  OperationStats,
  CategoryStats,
  PerformanceAlert,
  PerformanceTrend,
  OperationCategory,
} from './performance-tracker';

// ============================================================================
// INSTRUMENTATION
// ============================================================================

export {
  instrumentFetch,
  InstrumentedIDB,
  trackFunction,
  trackAsyncFunction,
  trackObject,
  measure,
  measureAsync,
  monitorLongTasks,
  monitorResourceLoading,
  monitorPageNavigation,
  initializeInstrumentation,
} from './instrumentation';

export type { ReactProfilerData } from './instrumentation';
