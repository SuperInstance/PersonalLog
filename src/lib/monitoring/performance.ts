/**
 * Performance Monitoring System
 *
 * Tracks application performance metrics including:
 * - Web Vitals (LCP, FCP, FID, CLS, TTFB)
 * - Resource loading times
 * - API response times
 * - Memory usage
 * - Custom metrics
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, Metric } from 'web-vitals';

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
  userAgent?: string;
}

interface ResourceTiming {
  name: string;
  duration: number;
  size: number;
  type: string;
}

interface APIMetric {
  endpoint: string;
  duration: number;
  status: number;
  success: boolean;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private resourceTimings: ResourceTiming[] = [];
  private apiMetrics: APIMetric[] = [];
  private storageKey = 'personallog-performance-metrics';
  private maxStoredMetrics = 1000;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // Load stored metrics
    this.loadMetrics();

    // Track Web Vitals
    this.trackWebVitals();

    // Track resource timing
    this.trackResourceTiming();

    // Track navigation timing
    this.trackNavigationTiming();

    // Track memory usage (if available)
    this.trackMemoryUsage();

    // Setup performance observer
    this.setupPerformanceObserver();
  }

  /**
   * Track Core Web Vitals
   */
  private trackWebVitals() {
    const reportMetric = (metric: Metric) => {
      const performanceMetric: PerformanceMetric = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating as 'good' | 'needs-improvement' | 'poor',
        timestamp: Date.now(),
        url: window.location.href,
      };

      this.recordMetric(performanceMetric);
    };

    // Track all Core Web Vitals
    onCLS(reportMetric);
    onFCP(reportMetric);
    onINP(reportMetric);
    onLCP(reportMetric);
    onTTFB(reportMetric);
  }

  /**
   * Track resource loading performance
   */
  private trackResourceTiming() {
    if (!window.performance || !window.performance.getEntriesByType) {
      return;
    }

    // Use PerformanceObserver for resource timing
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
          if (entry.entryType === 'resource') {
            const resourceTiming: ResourceTiming = {
              name: entry.name,
              duration: entry.duration,
              size: entry.transferSize,
              type: entry.initiatorType,
            };
            this.resourceTimings.push(resourceTiming);
          }
        }
        this.saveMetrics();
      });

      observer.observe({ entryTypes: ['resource'] });
    } catch (e) {
      console.warn('PerformanceObserver not supported');
    }
  }

  /**
   * Track navigation timing
   */
  private trackNavigationTiming() {
    if (!window.performance || !window.performance.getEntriesByType) {
      return;
    }

    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        if (navigationTiming) {
          const navMetrics: PerformanceMetric[] = [
            {
              name: 'navigation-domContentLoaded',
              value: navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart,
              rating: 'good',
              timestamp: Date.now(),
              url: window.location.href,
            },
            {
              name: 'navigation-loadComplete',
              value: navigationTiming.loadEventEnd - navigationTiming.loadEventStart,
              rating: 'good',
              timestamp: Date.now(),
              url: window.location.href,
            },
            {
              name: 'navigation-totalTime',
              value: navigationTiming.loadEventEnd - navigationTiming.fetchStart,
              rating: 'good',
              timestamp: Date.now(),
              url: window.location.href,
            },
          ];

          navMetrics.forEach(metric => this.recordMetric(metric));
        }
      }, 0);
    });
  }

  /**
   * Track memory usage (Chrome-specific)
   */
  private trackMemoryUsage() {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory) {
          const metric: PerformanceMetric = {
            name: 'memory-used',
            value: memory.usedJSHeapSize / 1024 / 1024, // MB
            rating: 'good',
            timestamp: Date.now(),
            url: window.location.href,
          };
          this.recordMetric(metric);
        }
      }, 30000); // Every 30 seconds
    }
  }

  /**
   * Setup Performance Observer for long tasks and layout shifts
   */
  private setupPerformanceObserver() {
    try {
      // Observe long tasks (tasks that take >50ms)
      if ('PerformanceObserver' in window) {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const metric: PerformanceMetric = {
              name: 'long-task',
              value: entry.duration,
              rating: entry.duration > 200 ? 'poor' : entry.duration > 100 ? 'needs-improvement' : 'good',
              timestamp: Date.now(),
              url: window.location.href,
            };
            this.recordMetric(metric);
          }
        });

        longTaskObserver.observe({ entryTypes: ['longtask'] });
      }
    } catch (e) {
      console.warn('Long task observation not supported');
    }
  }

  /**
   * Record a custom metric
   */
  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxStoredMetrics) {
      this.metrics = this.metrics.slice(-this.maxStoredMetrics);
    }

    this.saveMetrics();
  }

  /**
   * Record an API call metric
   */
  recordAPICall(endpoint: string, duration: number, status: number, success: boolean) {
    const metric: APIMetric = {
      endpoint,
      duration,
      status,
      success,
      timestamp: Date.now(),
    };

    this.apiMetrics.push(metric);

    // Keep only the most recent metrics
    if (this.apiMetrics.length > this.maxStoredMetrics) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxStoredMetrics);
    }

    this.saveMetrics();
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Get latest metric by name
   */
  getLatestMetric(name: string): PerformanceMetric | null {
    const metrics = this.getMetricsByName(name);
    return metrics.length > 0 ? metrics[metrics.length - 1] : null;
  }

  /**
   * Get Web Vitals summary
   */
  getWebVitalsSummary() {
    return {
      lcp: this.getLatestMetric('LCP'),
      fcp: this.getLatestMetric('FCP'),
      inp: this.getLatestMetric('INP'),
      cls: this.getLatestMetric('CLS'),
      ttfb: this.getLatestMetric('TTFB'),
    };
  }

  /**
   * Get resource timing summary
   */
  getResourceTimingSummary() {
    const byType = new Map<string, { count: number; totalDuration: number; totalSize: number }>();

    this.resourceTimings.forEach(resource => {
      const current = byType.get(resource.type) || { count: 0, totalDuration: 0, totalSize: 0 };
      current.count++;
      current.totalDuration += resource.duration;
      current.totalSize += resource.size;
      byType.set(resource.type, current);
    });

    return Array.from(byType.entries()).map(([type, stats]) => ({
      type,
      count: stats.count,
      avgDuration: stats.totalDuration / stats.count,
      totalSize: stats.totalSize,
    }));
  }

  /**
   * Get API metrics summary
   */
  getAPIMetricsSummary() {
    const byEndpoint = new Map<string, { count: number; totalDuration: number; failures: number }>();

    this.apiMetrics.forEach(metric => {
      const current = byEndpoint.get(metric.endpoint) || { count: 0, totalDuration: 0, failures: 0 };
      current.count++;
      current.totalDuration += metric.duration;
      if (!metric.success) current.failures++;
      byEndpoint.set(metric.endpoint, current);
    });

    return Array.from(byEndpoint.entries()).map(([endpoint, stats]) => ({
      endpoint,
      count: stats.count,
      avgDuration: stats.totalDuration / stats.count,
      failureRate: stats.failures / stats.count,
    }));
  }

  /**
   * Get performance score
   */
  getPerformanceScore() {
    const vitals = this.getWebVitalsSummary();

    let score = 100;
    let issues: string[] = [];

    // LCP should be < 2.5s
    if (vitals.lcp) {
      if (vitals.lcp.value > 4000) {
        score -= 25;
        issues.push('LCP is poor (>4s)');
      } else if (vitals.lcp.value > 2500) {
        score -= 10;
        issues.push('LCP needs improvement (>2.5s)');
      }
    }

    // INP should be < 200ms
    if (vitals.inp) {
      if (vitals.inp.value > 500) {
        score -= 25;
        issues.push('INP is poor (>500ms)');
      } else if (vitals.inp.value > 200) {
        score -= 10;
        issues.push('INP needs improvement (>200ms)');
      }
    }

    // CLS should be < 0.1
    if (vitals.cls) {
      if (vitals.cls.value > 0.25) {
        score -= 25;
        issues.push('CLS is poor (>0.25)');
      } else if (vitals.cls.value > 0.1) {
        score -= 10;
        issues.push('CLS needs improvement (>0.1)');
      }
    }

    return {
      score: Math.max(0, score),
      rating: score >= 90 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor',
      issues,
    };
  }

  /**
   * Save metrics to localStorage
   */
  private saveMetrics() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        metrics: this.metrics.slice(-100), // Only save last 100
        resourceTimings: this.resourceTimings.slice(-100),
        apiMetrics: this.apiMetrics.slice(-100),
      }));
    } catch (e) {
      console.warn('Failed to save metrics to localStorage:', e);
    }
  }

  /**
   * Load metrics from localStorage
   */
  private loadMetrics() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.metrics = data.metrics || [];
        this.resourceTimings = data.resourceTimings || [];
        this.apiMetrics = data.apiMetrics || [];
      }
    } catch (e) {
      console.warn('Failed to load metrics from localStorage:', e);
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
    this.resourceTimings = [];
    this.apiMetrics = [];
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics() {
    return JSON.stringify({
      metrics: this.metrics,
      resourceTimings: this.resourceTimings,
      apiMetrics: this.apiMetrics,
      webVitals: this.getWebVitalsSummary(),
      resourceSummary: this.getResourceTimingSummary(),
      apiSummary: this.getAPIMetricsSummary(),
      performanceScore: this.getPerformanceScore(),
    }, null, 2);
  }
}

// Singleton instance
let monitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!monitor) {
    monitor = new PerformanceMonitor();
  }
  return monitor;
}

// Export API wrapper for easy use
export function trackAPICall(endpoint: string, duration: number, status: number, success: boolean) {
  if (monitor) {
    monitor.recordAPICall(endpoint, duration, status, success);
  }
}

export function recordCustomMetric(name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor' = 'good') {
  if (monitor && typeof window !== 'undefined') {
    monitor.recordMetric({
      name,
      value,
      rating,
      timestamp: Date.now(),
      url: window.location.href,
    });
  }
}

export type { PerformanceMetric, ResourceTiming, APIMetric };
