/**
 * Unified Monitoring System
 *
 * Combines performance and security monitoring for comprehensive application tracking.
 */

import { getPerformanceMonitor as getPerfMonitor, trackAPICall, recordCustomMetric } from './performance';
import { getSecurityMonitor as getSecMonitor, recordSecurityEvent, validateSecureInput, checkRateLimit } from './security';

export type { PerformanceMetric, ResourceTiming, APIMetric } from './performance';
export type { SecurityEvent, SecurityMetrics } from './security';

// Re-export functions
export { trackAPICall, recordCustomMetric } from './performance';
export { recordSecurityEvent, validateSecureInput, checkRateLimit } from './security';

export { getPerformanceMonitor } from './performance';
export { getSecurityMonitor } from './security';

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
