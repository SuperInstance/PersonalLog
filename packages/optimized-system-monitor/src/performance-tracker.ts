/**
 * Performance Metrics Tracker
 *
 * Comprehensive performance tracking system for all PersonalLog operations.
 * Tracks operation durations, calculates statistics, identifies bottlenecks,
 * and provides performance insights.
 */

export type OperationCategory =
  | 'api'
  | 'database'
  | 'render'
  | 'page_load'
  | 'agent_spawn'
  | 'plugin_operation'
  | 'cache'
  | 'network'
  | 'custom';

export interface OperationMetric {
  id: string;
  name: string;
  category: OperationCategory;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface OperationStats {
  name: string;
  category: OperationCategory;
  count: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  standardDeviation: number;
}

export interface CategoryStats {
  category: OperationCategory;
  totalOperations: number;
  totalDuration: number;
  avgDuration: number;
  successRate: number;
  operationCount: Record<string, number>;
}

export interface PerformanceAlert {
  id: string;
  type: 'slow_operation' | 'performance_regression' | 'high_error_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  operation: string;
  category: OperationCategory;
  timestamp: number;
  details: Record<string, unknown>;
}

export interface PerformanceTrend {
  operation: string;
  timestamps: number[];
  values: number[];
  trend: 'improving' | 'degrading' | 'stable';
  changePercent: number;
}

interface PerformanceTrackerConfig {
  maxHistorySize: number;
  slowOperationThreshold: number;
  highErrorRateThreshold: number;
  regressionDetectionWindow: number;
  alertCooldown: number;
}

class PerformanceTracker {
  private operations: Map<string, OperationMetric> = new Map();
  private history: OperationMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private config: PerformanceTrackerConfig;
  private alertCooldowns: Map<string, number> = new Map();

  constructor(config?: Partial<PerformanceTrackerConfig>) {
    this.config = {
      maxHistorySize: 1000,
      slowOperationThreshold: 1000, // 1 second
      highErrorRateThreshold: 0.1, // 10%
      regressionDetectionWindow: 50,
      alertCooldown: 60000, // 1 minute
      ...config,
    };

    if (typeof window !== 'undefined') {
      this.loadFromStorage();
      this.setupPerformanceObserver();
    }
  }

  /**
   * Start tracking an operation
   */
  startOperation(name: string, category: OperationCategory, metadata?: Record<string, unknown>): string {
    const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();

    const operation: OperationMetric = {
      id,
      name,
      category,
      startTime,
      endTime: 0,
      duration: 0,
      success: false,
      metadata,
      timestamp: Date.now(),
    };

    this.operations.set(id, operation);

    return id;
  }

  /**
   * End tracking an operation
   */
  endOperation(id: string, success: boolean = true, metadata?: Record<string, unknown>): void {
    const operation = this.operations.get(id);
    if (!operation) {
      console.warn(`Operation ${id} not found`);
      return;
    }

    const endTime = performance.now();
    operation.endTime = endTime;
    operation.duration = endTime - operation.startTime;
    operation.success = success;
    if (metadata) {
      operation.metadata = { ...operation.metadata, ...metadata };
    }

    this.history.push(operation);
    this.operations.delete(id);

    // Trim history if needed
    if (this.history.length > this.config.maxHistorySize) {
      this.history = this.history.slice(-this.config.maxHistorySize);
    }

    // Check for slow operation
    if (operation.duration > this.config.slowOperationThreshold) {
      this.checkSlowOperationAlert(operation);
    }

    // Check for performance regression
    this.checkPerformanceRegression(operation);

    this.saveToStorage();
  }

  /**
   * Track an operation synchronously
   */
  trackOperation<T>(
    name: string,
    category: OperationCategory,
    fn: () => T,
    metadata?: Record<string, unknown>
  ): T {
    const id = this.startOperation(name, category, metadata);
    try {
      const result = fn();
      this.endOperation(id, true);
      return result;
    } catch (error) {
      this.endOperation(id, false, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Track an async operation
   */
  async trackOperationAsync<T>(
    name: string,
    category: OperationCategory,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const id = this.startOperation(name, category, metadata);
    try {
      const result = await fn();
      this.endOperation(id, true);
      return result;
    } catch (error) {
      this.endOperation(id, false, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Get statistics for a specific operation
   */
  getStats(operationName: string): OperationStats | null {
    const operations = this.history.filter(op => op.name === operationName);
    if (operations.length === 0) {
      return null;
    }

    const durations = operations.map(op => op.duration).sort((a, b) => a - b);
    const successCount = operations.filter(op => op.success).length;
    const failureCount = operations.filter(op => !op.success).length;

    return {
      name: operationName,
      category: operations[0].category,
      count: operations.length,
      successCount,
      failureCount,
      successRate: successCount / operations.length,
      mean: this.calculateMean(durations),
      median: this.calculateMedian(durations),
      min: durations[0],
      max: durations[durations.length - 1],
      p50: this.calculatePercentile(durations, 50),
      p75: this.calculatePercentile(durations, 75),
      p90: this.calculatePercentile(durations, 90),
      p95: this.calculatePercentile(durations, 95),
      p99: this.calculatePercentile(durations, 99),
      standardDeviation: this.calculateStandardDeviation(durations),
    };
  }

  /**
   * Get all operations in a category
   */
  getMetrics(category: OperationCategory): OperationMetric[] {
    return this.history.filter(op => op.category === category);
  }

  /**
   * Get category statistics
   */
  getCategoryStats(category: OperationCategory): CategoryStats | null {
    const operations = this.history.filter(op => op.category === category);
    if (operations.length === 0) {
      return null;
    }

    const successCount = operations.filter(op => op.success).length;
    const totalDuration = operations.reduce((sum, op) => sum + op.duration, 0);
    const operationCount: Record<string, number> = {};

    operations.forEach(op => {
      operationCount[op.name] = (operationCount[op.name] || 0) + 1;
    });

    return {
      category,
      totalOperations: operations.length,
      totalDuration,
      avgDuration: totalDuration / operations.length,
      successRate: successCount / operations.length,
      operationCount,
    };
  }

  /**
   * Get slowest operations
   */
  getSlowestOperations(limit: number = 10): OperationMetric[] {
    return [...this.history]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get slowest operations by name
   */
  getSlowestOperationNames(limit: number = 10): Array<{ name: string; avgDuration: number; count: number }> {
    const operationGroups = new Map<string, number[]>();

    this.history.forEach(op => {
      if (!operationGroups.has(op.name)) {
        operationGroups.set(op.name, []);
      }
      operationGroups.get(op.name)!.push(op.duration);
    });

    return Array.from(operationGroups.entries())
      .map(([name, durations]) => ({
        name,
        avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        count: durations.length,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  /**
   * Get operations with highest failure rate
   */
  getHighestFailureRate(limit: number = 10): Array<{ name: string; failureRate: number; count: number }> {
    const operationStats = new Map<string, { total: number; failures: number }>();

    this.history.forEach(op => {
      if (!operationStats.has(op.name)) {
        operationStats.set(op.name, { total: 0, failures: 0 });
      }
      const stats = operationStats.get(op.name)!;
      stats.total++;
      if (!op.success) {
        stats.failures++;
      }
    });

    return Array.from(operationStats.entries())
      .map(([name, stats]) => ({
        name,
        failureRate: stats.failures / stats.total,
        count: stats.total,
      }))
      .filter(item => item.count >= 5) // Only include operations with at least 5 executions
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, limit);
  }

  /**
   * Get performance trend for an operation
   */
  getPerformanceTrend(operationName: string, window: number = 50): PerformanceTrend | null {
    const operations = this.history.filter(op => op.name === operationName);
    if (operations.length < 10) {
      return null;
    }

    const recentOperations = operations.slice(-window);
    const timestamps = recentOperations.map(op => op.timestamp);
    const values = recentOperations.map(op => op.duration);

    // Calculate trend using linear regression
    const n = values.length;
    const sumX = timestamps.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = timestamps.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = timestamps.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgDuration = sumY / n;

    // Determine trend
    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (Math.abs(slope) > 0.001) {
      trend = slope > 0 ? 'degrading' : 'improving';
    }

    // Calculate percent change from first to last half
    const mid = Math.floor(n / 2);
    const firstHalfAvg = values.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const secondHalfAvg = values.slice(mid).reduce((a, b) => a + b, 0) / (n - mid);
    const changePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    return {
      operation: operationName,
      timestamps,
      values,
      trend,
      changePercent,
    };
  }

  /**
   * Get all alerts
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts].sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(maxAge: number = 3600000): void {
    const now = Date.now();
    this.alerts = this.alerts.filter(alert => now - alert.timestamp < maxAge);
    this.saveToStorage();
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalOperations: number;
    successRate: number;
    avgDuration: number;
    slowestOperations: Array<{ name: string; avgDuration: number; count: number }>;
    highestFailureRate: Array<{ name: string; failureRate: number; count: number }>;
    categoryBreakdown: Array<{ category: OperationCategory; count: number; avgDuration: number }>;
    recentAlerts: PerformanceAlert[];
  } {
    const totalOperations = this.history.length;
    const successCount = this.history.filter(op => op.success).length;
    const totalDuration = this.history.reduce((sum, op) => sum + op.duration, 0);

    const categoryBreakdown: Array<{ category: OperationCategory; count: number; avgDuration: number }> = [];

    Object.values(this.getCategoryNames()).forEach(category => {
      const stats = this.getCategoryStats(category as OperationCategory);
      if (stats) {
        categoryBreakdown.push({
          category: stats.category,
          count: stats.totalOperations,
          avgDuration: stats.avgDuration,
        });
      }
    });

    return {
      totalOperations,
      successRate: totalOperations > 0 ? successCount / totalOperations : 1,
      avgDuration: totalOperations > 0 ? totalDuration / totalOperations : 0,
      slowestOperations: this.getSlowestOperationNames(10),
      highestFailureRate: this.getHighestFailureRate(10),
      categoryBreakdown,
      recentAlerts: this.getAlerts().slice(0, 10),
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const summary = this.getPerformanceSummary();
    const lines: string[] = [];

    lines.push('=== Performance Report ===');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    lines.push('Overall Statistics:');
    lines.push(`  Total Operations: ${summary.totalOperations}`);
    lines.push(`  Success Rate: ${(summary.successRate * 100).toFixed(1)}%`);
    lines.push(`  Average Duration: ${summary.avgDuration.toFixed(2)}ms`);
    lines.push('');

    lines.push('Category Breakdown:');
    summary.categoryBreakdown.forEach(cat => {
      lines.push(`  ${cat.category}:`);
      lines.push(`    Operations: ${cat.count}`);
      lines.push(`    Avg Duration: ${cat.avgDuration.toFixed(2)}ms`);
    });
    lines.push('');

    lines.push('Top 10 Slowest Operations:');
    summary.slowestOperations.forEach((op: { name: string; avgDuration: number; count: number }, i: number) => {
      lines.push(`  ${i + 1}. ${op.name}`);
      lines.push(`     Avg: ${op.avgDuration.toFixed(2)}ms (${op.count} executions)`);
    });
    lines.push('');

    if (summary.highestFailureRate.length > 0) {
      lines.push('Operations with Highest Failure Rate:');
      summary.highestFailureRate.forEach((op: { name: string; failureRate: number; count: number }, i: number) => {
        lines.push(`  ${i + 1}. ${op.name}`);
        lines.push(`     Failure Rate: ${(op.failureRate * 100).toFixed(1)}% (${op.count} executions)`);
      });
      lines.push('');
    }

    if (summary.recentAlerts.length > 0) {
      lines.push('Recent Alerts:');
      summary.recentAlerts.forEach(alert => {
        lines.push(`  [${alert.severity.toUpperCase()}] ${alert.message}`);
        lines.push(`    Operation: ${alert.operation}`);
        lines.push(`    Time: ${new Date(alert.timestamp).toISOString()}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.history = [];
    this.alerts = [];
    this.saveToStorage();
  }

  // Private helper methods

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const mid = Math.floor(values.length / 2);
    return values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, index)];
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = this.calculateMean(values);
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = this.calculateMean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }

  private getCategoryNames(): string[] {
    return ['api', 'database', 'render', 'page_load', 'agent_spawn', 'plugin_operation', 'cache', 'network', 'custom'];
  }

  private checkSlowOperationAlert(operation: OperationMetric): void {
    const now = Date.now();
    const cooldownKey = `slow-${operation.name}`;

    if (this.alertCooldowns.has(cooldownKey)) {
      const lastAlert = this.alertCooldowns.get(cooldownKey)!;
      if (now - lastAlert < this.config.alertCooldown) {
        return;
      }
    }

    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'slow_operation',
      severity: operation.duration > this.config.slowOperationThreshold * 3 ? 'high' : 'medium',
      message: `Operation "${operation.name}" took ${operation.duration.toFixed(2)}ms`,
      operation: operation.name,
      category: operation.category,
      timestamp: now,
      details: {
        duration: operation.duration,
        threshold: this.config.slowOperationThreshold,
      },
    };

    this.alerts.push(alert);
    this.alertCooldowns.set(cooldownKey, now);
    this.saveToStorage();
  }

  private checkPerformanceRegression(operation: OperationMetric): void {
    const operations = this.history.filter(op => op.name === operation.name);
    if (operations.length < this.config.regressionDetectionWindow) {
      return;
    }

    const recent = operations.slice(-this.config.regressionDetectionWindow);
    const older = operations.slice(-this.config.regressionDetectionWindow * 2, -this.config.regressionDetectionWindow);

    const recentAvg = recent.reduce((sum, op) => sum + op.duration, 0) / recent.length;
    const olderAvg = older.reduce((sum, op) => sum + op.duration, 0) / older.length;

    // Detect if performance degraded by more than 50%
    if (recentAvg > olderAvg * 1.5) {
      const now = Date.now();
      const cooldownKey = `regression-${operation.name}`;

      if (this.alertCooldowns.has(cooldownKey)) {
        const lastAlert = this.alertCooldowns.get(cooldownKey)!;
        if (now - lastAlert < this.config.alertCooldown) {
          return;
        }
      }

      const alert: PerformanceAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'performance_regression',
        severity: 'high',
        message: `Performance regression detected for "${operation.name}"`,
        operation: operation.name,
        category: operation.category,
        timestamp: now,
        details: {
          recentAvg: recentAvg.toFixed(2),
          olderAvg: olderAvg.toFixed(2),
          degradationPercent: ((recentAvg - olderAvg) / olderAvg * 100).toFixed(2),
        },
      };

      this.alerts.push(alert);
      this.alertCooldowns.set(cooldownKey, now);
      this.saveToStorage();
    }
  }

  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            this.history.push({
              id: `perf-${entry.name}-${Date.now()}`,
              name: entry.name,
              category: 'custom',
              startTime: entry.startTime,
              endTime: entry.startTime + entry.duration,
              duration: entry.duration,
              success: true,
              timestamp: Date.now(),
            });
          }
        }
        this.saveToStorage();
      });

      observer.observe({ entryTypes: ['measure'] });
    } catch (e) {
      console.warn('PerformanceObserver setup failed:', e);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = {
        history: this.history.slice(-100), // Only save last 100 to save space
        alerts: this.alerts.slice(-50),
      };
      localStorage.setItem('personallog-performance-tracker', JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save performance tracker to storage:', e);
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('personallog-performance-tracker');
      if (stored) {
        const data = JSON.parse(stored);
        this.history = data.history || [];
        this.alerts = data.alerts || [];
      }
    } catch (e) {
      console.warn('Failed to load performance tracker from storage:', e);
    }
  }
}

// Singleton instance
let tracker: PerformanceTracker | null = null;

export function getPerformanceTracker(): PerformanceTracker {
  if (!tracker) {
    tracker = new PerformanceTracker();
  }
  return tracker;
}

export function createPerformanceTracker(config?: Partial<PerformanceTrackerConfig>): PerformanceTracker {
  return new PerformanceTracker(config);
}
