/**
 * Monitoring System
 *
 * Real-time monitoring and alerting for function execution.
 *
 * @module monitoring
 */

import { EventEmitter } from 'eventemitter3';
import { ExecutionResult, ExecutionStatus, MonitoringMetrics, ExecutionHistory } from '../types.js';

/**
 * Monitoring events emitted by the monitor
 */
export type MonitoringEvent =
  | 'execution:started'
  | 'execution:completed'
  | 'execution:failed'
  | 'execution:retried'
  | 'threshold:exceeded'
  | 'metrics:updated'
  | 'execution:complete'
  | 'execution:slow';

/**
 * Alert thresholds configuration
 */
export interface AlertThresholds {
  slowExecution?: number;
  lowSuccessRate?: number;
  highFailureRate?: number;
}

/**
 * Threshold configuration for alerting
 */
export interface ThresholdConfig {
  errorRateThreshold: number;
  averageTimeThreshold: number;
  windowSize: number;
  alertThresholds: AlertThresholds;
}

/**
 * Monitor for tracking function execution metrics
 */
export class Monitor extends EventEmitter {
  private metrics: MonitoringMetrics;
  private history: ExecutionHistory[] = [];
  private maxHistorySize: number;
  private retentionPeriod: number = 3600000; // 1 hour default
  private thresholds: ThresholdConfig;
  private alertThresholds: AlertThresholds = {};

  constructor(maxHistorySize: number = 1000, thresholds?: Partial<ThresholdConfig>) {
    super();
    this.maxHistorySize = maxHistorySize;
    this.thresholds = {
      errorRateThreshold: 0.1, // 10% error rate
      averageTimeThreshold: 5000, // 5 seconds
      windowSize: 100,
      alertThresholds: {}
    };
    if (thresholds) {
      Object.assign(this.thresholds, thresholds);
    }

    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      retriedExecutions: 0,
      slowExecutions: 0,
      averageExecutionTime: 0,
      functionCallCounts: {},
      errorRates: {}
    };

    // Clean up old entries periodically
    setInterval(() => this.cleanupOldEntries(), 60000);
  }

  /**
   * Record an execution result
   */
  record(result: ExecutionResult, toolName?: string): void {
    const functionName = toolName || result.functionName || 'unknown';

    this.metrics.totalExecutions++;

    // Update success/failure counts
    if (result.status === ExecutionStatus.SUCCESS) {
      this.metrics.successfulExecutions++;
    } else if (result.status === ExecutionStatus.RETRIED) {
      this.metrics.retriedExecutions++;
    } else {
      this.metrics.failedExecutions++;
    }

    // Update execution time
    if (result.executionTime !== undefined) {
      const total = this.metrics.averageExecutionTime * (this.metrics.totalExecutions - 1);
      this.metrics.averageExecutionTime = (total + result.executionTime) / this.metrics.totalExecutions;

      // Check for slow execution
      if (this.alertThresholds.slowExecution && result.executionTime > this.alertThresholds.slowExecution) {
        (this.metrics as any).slowExecutions = ((this.metrics as any).slowExecutions || 0) + 1;
        this.emit('execution:slow', { toolName: functionName, duration: result.executionTime });
      }
    }

    // Track retries
    if (result.retryCount && result.retryCount > 0) {
      this.metrics.retriedExecutions += result.retryCount;
    }

    // Update function call counts
    this.metrics.functionCallCounts[functionName] = (this.metrics.functionCallCounts[functionName] || 0) + 1;

    // Update error rates per function
    const errorCount = this.metrics.errorRates[functionName] || 0;
    const totalCount = this.metrics.functionCallCounts[functionName];
    this.metrics.errorRates[functionName] = totalCount > 0 ? (errorCount + (result.status !== ExecutionStatus.SUCCESS ? 1 : 0)) / totalCount : 0;

    // Add to history
    if (this.maxHistorySize > 0) {
      this.history.push({
        id: this.generateId(),
        toolName: functionName,
        parameters: {},
        result,
        timestamp: Date.now(),
        duration: result.executionTime || 0,
        retryCount: result.retryCount || 0
      });

      // Trim history if needed
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
      }
    }

    // Check thresholds
    this.checkThresholds(functionName);

    // Emit events
    if (result.status === ExecutionStatus.SUCCESS) {
      this.emit('execution:complete', { toolName: functionName, status: 'success', duration: result.executionTime, result });
      this.emit('execution:completed', { result, metrics: this.getMetrics() });
    } else {
      this.emit('execution:failed', { toolName: functionName, status: result.status, error: result.error });
    }
    this.emit('metrics:updated', this.getMetrics());
  }

  /**
   * Clean up old history entries based on retention period
   */
  private cleanupOldEntries(): void {
    const cutoff = Date.now() - this.retentionPeriod;
    const beforeLength = this.history.length;
    this.history = this.history.filter(h => h.timestamp > cutoff);
    if (this.history.length !== beforeLength) {
      // Recalculate metrics based on remaining history
      this.recalculateMetrics();
    }
  }

  /**
   * Recalculate metrics from current history
   */
  private recalculateMetrics(): void {
    this.metrics = {
      totalExecutions: this.history.length,
      successfulExecutions: this.history.filter(h => h.result.status === ExecutionStatus.SUCCESS).length,
      failedExecutions: this.history.filter(h => h.result.status !== ExecutionStatus.SUCCESS).length,
      retriedExecutions: this.history.reduce((sum, h) => sum + (h.retryCount || 0), 0),
      slowExecutions: 0,
      averageExecutionTime: this.history.length > 0
        ? this.history.reduce((sum, h) => sum + h.duration, 0) / this.history.length
        : 0,
      functionCallCounts: {},
      errorRates: {}
    };

    // Recalculate function call counts
    for (const h of this.history) {
      this.metrics.functionCallCounts[h.toolName] = (this.metrics.functionCallCounts[h.toolName] || 0) + 1;
    }
  }

  /**
   * Check if thresholds are exceeded
   */
  private checkThresholds(functionName: string): void {
    // Check error rate threshold
    const errorRate = this.metrics.errorRates[functionName] || 0;
    if (errorRate > this.thresholds.errorRateThreshold) {
      this.emit('threshold:exceeded', {
        type: 'error_rate',
        function: functionName,
        value: errorRate,
        threshold: this.thresholds.errorRateThreshold
      });
    }

    // Check average time threshold
    if (this.metrics.averageExecutionTime > this.thresholds.averageTimeThreshold) {
      this.emit('threshold:exceeded', {
        type: 'execution_time',
        value: this.metrics.averageExecutionTime,
        threshold: this.thresholds.averageTimeThreshold
      });
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): Readonly<MonitoringMetrics> {
    return { ...this.metrics };
  }

  /**
   * Get execution history
   */
  getHistory(options?: {
    limit?: number;
    toolName?: string;
    status?: ExecutionStatus;
    since?: number;
    startTime?: number;
    endTime?: number;
  }): ExecutionHistory[] {
    let filtered = [...this.history];

    if (options?.toolName) {
      filtered = filtered.filter(h => h.toolName === options.toolName);
    }

    if (options?.status) {
      filtered = filtered.filter(h => h.result.status === options.status);
    }

    if (options?.since !== undefined) {
      filtered = filtered.filter(h => h.timestamp >= options.since!);
    }

    if (options?.startTime !== undefined) {
      filtered = filtered.filter(h => h.timestamp >= options.startTime!);
    }

    if (options?.endTime !== undefined) {
      filtered = filtered.filter(h => h.timestamp <= options.endTime!);
    }

    // Return most recent first
    filtered.reverse();

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Get recent executions for a specific tool
   */
  getRecentForTool(toolName: string, count: number = 10): ExecutionHistory[] {
    return this.history
      .filter(h => h.toolName === toolName)
      .slice(-count);
  }

  /**
   * Get success rate for a tool
   */
  getSuccessRate(toolName: string): number {
    const history = this.getRecentForTool(toolName, this.thresholds.windowSize);
    if (history.length === 0) return 0;

    const successes = history.filter(h => h.result.status === ExecutionStatus.SUCCESS).length;
    return successes / history.length;
  }

  /**
   * Get average execution time for a tool
   */
  getAverageTime(toolName: string): number {
    const history = this.getRecentForTool(toolName, this.thresholds.windowSize);
    if (history.length === 0) return 0;

    const total = history.reduce((sum, h) => sum + h.duration, 0);
    return total / history.length;
  }

  /**
   * Set alert thresholds
   */
  setAlertThresholds(thresholds: AlertThresholds): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }

  /**
   * Set history retention period
   */
  setRetentionPeriod(ms: number): void {
    this.retentionPeriod = ms;
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      retriedExecutions: 0,
      slowExecutions: 0,
      averageExecutionTime: 0,
      functionCallCounts: {},
      errorRates: {}
    };
    this.history = [];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      retriedExecutions: 0,
      slowExecutions: 0,
      averageExecutionTime: 0,
      functionCallCounts: {},
      errorRates: {}
    };
  }

  /**
   * Generate a unique ID for history entries
   */
  private generateId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get metrics summary as a formatted string
   */
  getSummary(): string {
    const m = this.metrics;
    return `
ToolGuardian Metrics:
  Total Executions: ${m.totalExecutions}
  Successful: ${m.successfulExecutions} (${((m.successfulExecutions / m.totalExecutions) * 100 || 0).toFixed(1)}%)
  Failed: ${m.failedExecutions} (${((m.failedExecutions / m.totalExecutions) * 100 || 0).toFixed(1)}%)
  Retried: ${m.retriedExecutions}
  Avg Execution Time: ${m.averageExecutionTime.toFixed(0)}ms

Top Functions:
${Object.entries(m.functionCallCounts)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 5)
  .map(([name, count]) => `  ${name}: ${count} calls`)
  .join('\n')}
    `.trim();
  }
}
