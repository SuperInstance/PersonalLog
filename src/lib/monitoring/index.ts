/**
 * Unified Monitoring System
 *
 * Combines performance, security, health, and optimization monitoring for comprehensive application tracking.
 */

import { getPerformanceMonitor as getPerfMonitor, trackAPICall, recordCustomMetric } from './performance';
import { getSecurityMonitor as getSecMonitor, recordSecurityEvent, validateSecureInput, checkRateLimit } from './security';
import { getHealthMonitor as getHealthMon } from './health-monitor';
import { getOptimizationEngine as getOptEngine } from './optimization-engine';
import { getPerformanceTracker as getPerfTracker } from './performance-tracker';

export type { PerformanceMetric, ResourceTiming, APIMetric } from './performance';
export type { SecurityEvent, SecurityMetrics } from './security';
export type {
  HealthMetric,
  HealthScore,
  HealthStatus,
  HealthAlert,
  AlertSeverity,
  HealthHistoryPoint,
  SystemHealthStatus,
  MetricCategory,
  TrendDirection,
} from './metrics';
export type {
  OptimizationTrigger,
  Optimization,
  OptimizationExecution,
  TriggerHistory,
  OptimizationStatus,
  OptimizationConfig,
  RuleStatistics,
  RuleValidation,
  MetricType,
  OptimizationEngineState,
} from './optimization-types';
export type {
  OperationMetric,
  OperationStats,
  CategoryStats,
  PerformanceAlert,
  PerformanceTrend,
  OperationCategory,
} from './performance-tracker';

// Re-export functions
export { trackAPICall, recordCustomMetric } from './performance';
export { recordSecurityEvent, validateSecureInput, checkRateLimit } from './security';

export { getPerformanceMonitor } from './performance';
export { getSecurityMonitor } from './security';
export { getHealthMonitor, resetHealthMonitor } from './health-monitor';
export { getOptimizationEngine } from './optimization-engine';
export { getPerformanceTracker, createPerformanceTracker } from './performance-tracker';
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

/**
 * Monitor API calls (combines performance and security)
 */
export async function monitoredFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const performanceMonitor = getPerfMonitor();
  const securityMonitor = getSecMonitor();

  const startTime = performance.now();
  const endpoint = new URL(url, typeof window !== 'undefined' ? window.location.origin : '').pathname;

  try {
    const response = await fetch(url, options);

    // Record performance metric
    const duration = performance.now() - startTime;
    performanceMonitor.recordAPICall(endpoint, duration, response.status, response.ok);

    // Validate response
    securityMonitor.validateAPIResponse(response, endpoint);

    return response;
  } catch (error) {
    // Record failed request
    const duration = performance.now() - startTime;
    performanceMonitor.recordAPICall(endpoint, duration, 0, false);

    securityMonitor.recordEvent({
      type: 'suspicious-activity',
      severity: 'medium',
      message: `API request failed: ${endpoint}`,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    });

    throw error;
  }
}

/**
 * Get comprehensive monitoring report
 */
export function getMonitoringReport() {
  const performanceMonitor = getPerfMonitor();
  const securityMonitor = getSecMonitor();

  return {
    performance: {
      webVitals: performanceMonitor.getWebVitalsSummary(),
      resourceTiming: performanceMonitor.getResourceTimingSummary(),
      apiMetrics: performanceMonitor.getAPIMetricsSummary(),
      score: performanceMonitor.getPerformanceScore(),
    },
    security: {
      metrics: securityMonitor.getSecurityMetrics(),
      score: securityMonitor.getSecurityScore(),
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Export monitoring data
 */
export function exportMonitoringData() {
  const performanceMonitor = getPerfMonitor();
  const securityMonitor = getSecMonitor();

  return JSON.stringify({
    performance: JSON.parse(performanceMonitor.exportMetrics()),
    security: JSON.parse(securityMonitor.exportEvents()),
    report: getMonitoringReport(),
  }, null, 2);
}
