/**
 * Real-time Health Monitor
 *
 * Comprehensive system health monitoring with real-time metrics collection,
 * health scoring, anomaly detection, and alerting.
 *
 * @example
 * ```typescript
 * import { getHealthMonitor } from '@superinstance/optimized-system-monitor';
 *
 * const monitor = getHealthMonitor();
 * await monitor.start();
 *
 * const healthScore = monitor.getHealthScore();
 * const metrics = monitor.getMetrics();
 * const alerts = monitor.getActiveAlerts();
 * ```
 */

import {
  HealthMetric,
  HealthScore,
  HealthStatus,
  HealthAlert,
  AlertSeverity,
  AlertConfig,
  HealthHistoryPoint,
  HealthTrend,
  TrendDirection,
  SystemHealthStatus,
  MetricCategory,
  DEFAULT_THRESHOLDS,
  DEFAULT_ALERT_CONFIGS,
  DEFAULT_MONITORING_CONFIG,
} from './metrics';

// ============================================================================
// HEALTH MONITOR CLASS
// ============================================================================

/**
 * Health Monitor configuration
 */
interface HealthMonitorConfig {
  collectionInterval: number;
  historySize: number;
  anomalyWindow: number;
  anomalyThreshold: number;
  alertDebounceMs: number;
  autoRecovery: boolean;
}

/**
 * Metric sample for trend analysis
 */
interface MetricSample {
  timestamp: number;
  value: number;
}

/**
 * Real-time health monitoring system
 */
export class HealthMonitor {
  private config: HealthMonitorConfig;
  private metrics: Map<string, HealthMetric>;
  private history: HealthHistoryPoint[];
  private alerts: Map<string, HealthAlert>;
  private alertConfigs: Map<string, AlertConfig>;
  private metricHistory: Map<string, MetricSample[]>;
  private collectionInterval: number | null;
  private startTime: number;
  private isRunning: boolean;
  private lastFrameTime: number;
  private frameCount: number;
  private fps: number;

  constructor(config: Partial<HealthMonitorConfig> = {}) {
    this.config = {
      ...DEFAULT_MONITORING_CONFIG,
      ...config,
    };

    this.metrics = new Map();
    this.history = [];
    this.alerts = new Map();
    this.alertConfigs = new Map();
    this.metricHistory = new Map();
    this.collectionInterval = null;
    this.startTime = Date.now();
    this.isRunning = false;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fps = 60;

    // Initialize alert configs
    DEFAULT_ALERT_CONFIGS.forEach((config) => {
      this.alertConfigs.set(config.metric, config);
    });
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  /**
   * Start health monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();

    // Start FPS monitoring
    this.startFPSMonitoring();

    // Start metric collection
    this.collectionInterval = window.setInterval(() => {
      this.collectMetrics();
    }, this.config.collectionInterval);

    // Initial collection
    await this.collectMetrics();
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.collectionInterval !== null) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isRunning;
  }

  // ========================================================================
  // METRIC COLLECTION
  // ========================================================================

  /**
   * Collect all health metrics
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = Date.now();

    // Collect metrics from different sources
    await this.collectPerformanceMetrics(timestamp);
    await this.collectMemoryMetrics(timestamp);
    await this.collectStorageMetrics(timestamp);
    await this.collectNetworkMetrics(timestamp);
    await this.collectSystemMetrics(timestamp);
    await this.collectPluginMetrics(timestamp);
    await this.collectAgentMetrics(timestamp);

    // Check for alerts
    this.checkAlerts();

    // Record history point
    this.recordHistoryPoint();
  }

  /**
   * Collect performance metrics
   */
  private async collectPerformanceMetrics(timestamp: number): Promise<void> {
    // CPU usage (estimated from frame time)
    const frameTime = this.metrics.get('frame-time')?.value || 16.67;
    const cpuUsage = Math.min(100, (frameTime / 16.67) * 100);

    this.updateMetric({
      name: 'cpu-usage',
      category: MetricCategory.PERFORMANCE,
      value: cpuUsage,
      unit: '%',
      timestamp,
      status: this.getHealthStatus('cpu-usage', cpuUsage),
      warningThreshold: DEFAULT_THRESHOLDS['cpu-usage'].warning,
      criticalThreshold: DEFAULT_THRESHOLDS['cpu-usage'].critical,
    });

    this.updateMetric({
      name: 'fps',
      category: MetricCategory.PERFORMANCE,
      value: this.fps,
      unit: 'fps',
      timestamp,
      status: this.getHealthStatus('fps', this.fps, true),
      warningThreshold: DEFAULT_THRESHOLDS['fps'].warning,
      criticalThreshold: DEFAULT_THRESHOLDS['fps'].critical,
    });

    // Count long tasks from performance observer
    const longTasks = this.countLongTasks();
    this.updateMetric({
      name: 'long-tasks',
      category: MetricCategory.PERFORMANCE,
      value: longTasks,
      unit: 'count',
      timestamp,
      status: this.getHealthStatus('long-tasks', longTasks, true),
      warningThreshold: DEFAULT_THRESHOLDS['long-tasks'].warning,
      criticalThreshold: DEFAULT_THRESHOLDS['long-tasks'].critical,
    });
  }

  /**
   * Collect memory metrics
   */
  private async collectMemoryMetrics(timestamp: number): Promise<void> {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const totalMB = memory.totalJSHeapSize / 1024 / 1024;
        const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
        const usagePercent = (usedMB / limitMB) * 100;

        this.updateMetric({
          name: 'memory-used',
          category: MetricCategory.MEMORY,
          value: usedMB,
          unit: 'MB',
          timestamp,
          status: this.getHealthStatus('memory-usage-percent', usagePercent),
        });

        this.updateMetric({
          name: 'memory-total',
          category: MetricCategory.MEMORY,
          value: totalMB,
          unit: 'MB',
          timestamp,
          status: HealthStatus.HEALTHY,
        });

        this.updateMetric({
          name: 'memory-limit',
          category: MetricCategory.MEMORY,
          value: limitMB,
          unit: 'MB',
          timestamp,
          status: HealthStatus.HEALTHY,
        });

        this.updateMetric({
          name: 'memory-usage-percent',
          category: MetricCategory.MEMORY,
          value: usagePercent,
          unit: '%',
          timestamp,
          status: this.getHealthStatus('memory-usage-percent', usagePercent),
          warningThreshold: DEFAULT_THRESHOLDS['memory-usage-percent'].warning,
          criticalThreshold: DEFAULT_THRESHOLDS['memory-usage-percent'].critical,
        });
      }
    }
  }

  /**
   * Collect storage metrics
   */
  private async collectStorageMetrics(timestamp: number): Promise<void> {
    if (typeof navigator !== 'undefined' && 'storage' in navigator) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate) {
          const usedMB = (estimate.usage || 0) / 1024 / 1024;
          const quotaMB = (estimate.quota || 0) / 1024 / 1024;
          const usagePercent = quotaMB > 0 ? (usedMB / quotaMB) * 100 : 0;

          this.updateMetric({
            name: 'storage-used',
            category: MetricCategory.STORAGE,
            value: usedMB,
            unit: 'MB',
            timestamp,
            status: this.getHealthStatus('storage-usage-percent', usagePercent),
          });

          this.updateMetric({
            name: 'storage-available',
            category: MetricCategory.STORAGE,
            value: quotaMB - usedMB,
            unit: 'MB',
            timestamp,
            status: HealthStatus.HEALTHY,
          });

          this.updateMetric({
            name: 'storage-total',
            category: MetricCategory.STORAGE,
            value: quotaMB,
            unit: 'MB',
            timestamp,
            status: HealthStatus.HEALTHY,
          });

          this.updateMetric({
            name: 'storage-usage-percent',
            category: MetricCategory.STORAGE,
            value: usagePercent,
            unit: '%',
            timestamp,
            status: this.getHealthStatus('storage-usage-percent', usagePercent),
            warningThreshold: DEFAULT_THRESHOLDS['storage-usage-percent'].warning,
            criticalThreshold: DEFAULT_THRESHOLDS['storage-usage-percent'].critical,
          });
        }
      } catch (error) {
        console.warn('Failed to get storage estimate:', error);
      }
    }
  }

  /**
   * Collect network metrics
   */
  private async collectNetworkMetrics(timestamp: number): Promise<void> {
    // Network status
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.updateMetric({
      name: 'network-status',
      category: MetricCategory.NETWORK,
      value: online ? 1 : 0,
      unit: 'status',
      timestamp,
      status: online ? HealthStatus.HEALTHY : HealthStatus.CRITICAL,
    });

    // Network latency (measured via API calls)
    const latency = await this.measureNetworkLatency();
    this.updateMetric({
      name: 'network-latency',
      category: MetricCategory.NETWORK,
      value: latency,
      unit: 'ms',
      timestamp,
      status: this.getHealthStatus('network-latency', latency),
      warningThreshold: DEFAULT_THRESHOLDS['network-latency'].warning,
      criticalThreshold: DEFAULT_THRESHOLDS['network-latency'].critical,
    });
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(timestamp: number): Promise<void> {
    // Uptime
    const uptime = Date.now() - this.startTime;
    this.updateMetric({
      name: 'uptime',
      category: MetricCategory.SYSTEM,
      value: uptime,
      unit: 'ms',
      timestamp,
      status: HealthStatus.HEALTHY,
    });

    // Active operations (placeholder - would need integration)
    this.updateMetric({
      name: 'active-operations',
      category: MetricCategory.SYSTEM,
      value: 0,
      unit: 'count',
      timestamp,
      status: HealthStatus.HEALTHY,
    });

    // Error count (from error tracking)
    const errorCount = this.getErrorCount();
    this.updateMetric({
      name: 'error-count',
      category: MetricCategory.SYSTEM,
      value: errorCount,
      unit: 'count',
      timestamp,
      status: errorCount > 10 ? HealthStatus.WARNING : HealthStatus.HEALTHY,
    });

    // System load (placeholder)
    this.updateMetric({
      name: 'system-load',
      category: MetricCategory.SYSTEM,
      value: this.metrics.get('cpu-usage')?.value || 0,
      unit: '%',
      timestamp,
      status: this.getHealthStatus('cpu-usage', this.metrics.get('cpu-usage')?.value || 0),
    });
  }

  /**
   * Collect plugin metrics
   */
  private async collectPluginMetrics(timestamp: number): Promise<void> {
    // Placeholder for plugin metrics - users can extend this
    // Default to healthy if no plugin system is integrated
    this.updateMetric({
      name: 'plugins-enabled',
      category: MetricCategory.PLUGIN,
      value: 0,
      unit: 'count',
      timestamp,
      status: HealthStatus.HEALTHY,
    });

    this.updateMetric({
      name: 'plugins-disabled',
      category: MetricCategory.PLUGIN,
      value: 0,
      unit: 'count',
      timestamp,
      status: HealthStatus.HEALTHY,
    });

    this.updateMetric({
      name: 'plugins-error',
      category: MetricCategory.PLUGIN,
      value: 0,
      unit: 'count',
      timestamp,
      status: HealthStatus.HEALTHY,
    });

    this.updateMetric({
      name: 'plugin-health-score',
      category: MetricCategory.PLUGIN,
      value: 100,
      unit: 'score',
      timestamp,
      status: HealthStatus.HEALTHY,
      warningThreshold: DEFAULT_THRESHOLDS['plugin-health-score'].warning,
      criticalThreshold: DEFAULT_THRESHOLDS['plugin-health-score'].critical,
    });
  }

  /**
   * Collect agent metrics
   */
  private async collectAgentMetrics(timestamp: number): Promise<void> {
    // Placeholder for agent metrics - users can extend this
    // Default to healthy if no agent system is integrated
    this.updateMetric({
      name: 'agents-active',
      category: MetricCategory.AGENT,
      value: 0,
      unit: 'count',
      timestamp,
      status: HealthStatus.HEALTHY,
    });

    this.updateMetric({
      name: 'agents-idle',
      category: MetricCategory.AGENT,
      value: 0,
      unit: 'count',
      timestamp,
      status: HealthStatus.HEALTHY,
    });

    this.updateMetric({
      name: 'agents-error',
      category: MetricCategory.AGENT,
      value: 0,
      unit: 'count',
      timestamp,
      status: HealthStatus.HEALTHY,
    });

    this.updateMetric({
      name: 'agent-health-score',
      category: MetricCategory.AGENT,
      value: 100,
      unit: 'score',
      timestamp,
      status: HealthStatus.HEALTHY,
      warningThreshold: DEFAULT_THRESHOLDS['agent-health-score'].warning,
      criticalThreshold: DEFAULT_THRESHOLDS['agent-health-score'].critical,
    });
  }

  // ========================================================================
  // METRIC HELPERS
  // ========================================================================

  /**
   * Update or create a metric
   */
  private updateMetric(metric: HealthMetric): void {
    const metricKey = `${metric.category}-${metric.name}`;

    // Store in metric history
    if (!this.metricHistory.has(metricKey)) {
      this.metricHistory.set(metricKey, []);
    }

    const history = this.metricHistory.get(metricKey)!;
    history.push({ timestamp: metric.timestamp, value: metric.value });

    // Keep only recent history
    if (history.length > this.config.historySize) {
      history.shift();
    }

    // Update metric
    this.metrics.set(metricKey, metric);
  }

  /**
   * Get health status for a metric value
   */
  private getHealthStatus(
    metricName: string,
    value: number,
    higherIsBetter = false
  ): HealthStatus {
    const thresholds = DEFAULT_THRESHOLDS[metricName];
    if (!thresholds) {
      return HealthStatus.HEALTHY;
    }

    if (higherIsBetter) {
      if (value < thresholds.critical) return HealthStatus.CRITICAL;
      if (value < thresholds.warning) return HealthStatus.WARNING;
      return HealthStatus.HEALTHY;
    } else {
      if (value > thresholds.critical) return HealthStatus.CRITICAL;
      if (value > thresholds.warning) return HealthStatus.WARNING;
      return HealthStatus.HEALTHY;
    }
  }

  /**
   * Start FPS monitoring
   */
  private startFPSMonitoring(): void {
    let frameCount = 0;
    let lastTime = performance.now();

    const measureFPS = () => {
      if (!this.isRunning) return;

      frameCount++;
      const currentTime = performance.now();
      const delta = currentTime - lastTime;

      if (delta >= 1000) {
        this.fps = Math.round((frameCount * 1000) / delta);
        frameCount = 0;
        lastTime = currentTime;

        // Update frame time metric
        const frameTime = delta / frameCount;
        this.updateMetric({
          name: 'frame-time',
          category: MetricCategory.PERFORMANCE,
          value: frameTime,
          unit: 'ms',
          timestamp: Date.now(),
          status: this.getHealthStatus('frame-time', frameTime),
          warningThreshold: DEFAULT_THRESHOLDS['frame-time'].warning,
          criticalThreshold: DEFAULT_THRESHOLDS['frame-time'].critical,
        });
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * Count long tasks from PerformanceObserver
   */
  private countLongTasks(): number {
    if (!window.performance || !window.performance.getEntriesByType) {
      return 0;
    }

    const entries = performance.getEntriesByType('longtask');
    return entries.length;
  }

  /**
   * Measure network latency
   */
  private async measureNetworkLatency(): Promise<number> {
    // Simple fetch to measure latency
    const start = performance.now();
    try {
      await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
      return performance.now() - start;
    } catch {
      return -1; // Offline or error
    }
  }

  /**
   * Get error count (placeholder)
   */
  private getErrorCount(): number {
    // Would integrate with error tracking system
    return 0;
  }

  // ========================================================================
  // HEALTH SCORING
  // ========================================================================

  /**
   * Calculate overall health score
   */
  calculateHealthScore(): HealthScore {
    const categoryScores = {
      performance: this.getCategoryScore(MetricCategory.PERFORMANCE),
      memory: this.getCategoryScore(MetricCategory.MEMORY),
      storage: this.getCategoryScore(MetricCategory.STORAGE),
      network: this.getCategoryScore(MetricCategory.NETWORK),
      system: this.getCategoryScore(MetricCategory.SYSTEM),
      plugins: this.getCategoryScore(MetricCategory.PLUGIN),
      agents: this.getCategoryScore(MetricCategory.AGENT),
    };

    // Overall score is average of category scores
    const scores = Object.values(categoryScores);
    const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Determine status
    let status: HealthStatus;
    if (overallScore >= 80) status = HealthStatus.HEALTHY;
    else if (overallScore >= 60) status = HealthStatus.WARNING;
    else status = HealthStatus.CRITICAL;

    // Determine trend
    const trend = this.analyzeTrend();

    return {
      score: Math.round(overallScore),
      status,
      categories: categoryScores,
      trend: trend.direction,
      timestamp: Date.now(),
    };
  }

  /**
   * Get health score for a category
   */
  private getCategoryScore(category: MetricCategory): number {
    const categoryMetrics = Array.from(this.metrics.values()).filter(
      (m) => m.category === category
    );

    if (categoryMetrics.length === 0) {
      return 100; // No metrics means healthy
    }

    // Average score based on status
    let totalScore = 0;
    for (const metric of categoryMetrics) {
      switch (metric.status) {
        case HealthStatus.HEALTHY:
          totalScore += 100;
          break;
        case HealthStatus.WARNING:
          totalScore += 60;
          break;
        case HealthStatus.CRITICAL:
          totalScore += 20;
          break;
        default:
          totalScore += 50;
      }
    }

    return totalScore / categoryMetrics.length;
  }

  /**
   * Analyze health trend
   */
  private analyzeTrend(): HealthTrend {
    if (this.history.length < 3) {
      return {
        direction: TrendDirection.STABLE,
        rateOfChange: 0,
        period: 0,
        confidence: 0,
      };
    }

    const recent = this.history.slice(-10);
    const scores = recent.map((h) => h.score);

    // Simple linear regression
    const n = scores.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = scores.reduce((a, b) => a + b, 0);
    const sumXY = scores.reduce((a, b, i) => a + i * b, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const period = recent[recent.length - 1].timestamp - recent[0].timestamp;

    // Determine direction
    let direction: TrendDirection;
    if (Math.abs(slope) < 0.5) {
      direction = TrendDirection.STABLE;
    } else if (slope > 0) {
      direction = TrendDirection.IMPROVING;
    } else {
      direction = TrendDirection.DEGRADING;
    }

    // Confidence based on R² (simplified)
    const meanY = sumY / n;
    const ssTot = scores.reduce((a, b) => a + Math.pow(b - meanY, 2), 0);
    const ssRes = scores.reduce((a, b, i) => {
      const predicted = slope * i + (sumY - slope * sumX) / n;
      return a + Math.pow(b - predicted, 2);
    }, 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return {
      direction,
      rateOfChange: Math.abs(slope),
      period,
      confidence: Math.max(0, Math.min(1, r2)),
    };
  }

  // ========================================================================
  // ALERTING
  // ========================================================================

  /**
   * Check for alert conditions
   */
  private checkAlerts(): void {
    for (const [metricKey, metric] of this.metrics) {
      const config = this.alertConfigs.get(metric.name);
      if (!config || !config.enabled) continue;

      const severity = this.getAlertSeverity(metric, config);
      if (severity) {
        this.triggerAlert(metric, severity, config);
      }
    }
  }

  /**
   * Get alert severity for a metric
   */
  private getAlertSeverity(
    metric: HealthMetric,
    config: AlertConfig
  ): AlertSeverity | null {
    const higherIsBetter = ['fps', 'plugin-health-score', 'agent-health-score'].includes(
      metric.name
    );

    if (higherIsBetter) {
      if (metric.value < config.criticalThreshold) return AlertSeverity.CRITICAL;
      if (metric.value < config.warningThreshold) return AlertSeverity.WARNING;
    } else {
      if (metric.value > config.criticalThreshold) return AlertSeverity.CRITICAL;
      if (metric.value > config.warningThreshold) return AlertSeverity.WARNING;
    }

    return null;
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(
    metric: HealthMetric,
    severity: AlertSeverity,
    config: AlertConfig
  ): void {
    const alertId = `${metric.name}-${severity}`;
    const now = Date.now();

    // Check if alert already exists
    const existing = this.alerts.get(alertId);
    if (existing) {
      // Debounce check
      if (now - existing.lastFired! < config.debounceMs) {
        return;
      }

      // Update existing alert
      existing.active = true;
      existing.currentValue = metric.value;
      existing.timestamp = now;
      existing.lastFired = now;
      existing.count++;
    } else {
      // Create new alert
      const alert: HealthAlert = {
        id: alertId,
        severity,
        metric: metric.name,
        message: `${metric.name} is ${severity}: ${metric.value.toFixed(2)} ${metric.unit}`,
        currentValue: metric.value,
        threshold:
          severity === AlertSeverity.CRITICAL
            ? config.criticalThreshold
            : config.warningThreshold,
        timestamp: now,
        active: true,
        actions: config.recoveryActions,
        count: 1,
        lastFired: now,
      };

      this.alerts.set(alertId, alert);
    }
  }

  // ========================================================================
  // HISTORY
  // ========================================================================

  /**
   * Record a history point
   */
  private recordHistoryPoint(): void {
    const healthScore = this.calculateHealthScore();

    const point: HealthHistoryPoint = {
      timestamp: Date.now(),
      score: healthScore.score,
      metrics: Object.fromEntries(
        Array.from(this.metrics.entries()).map(([key, metric]) => [key, metric.value])
      ),
      alerts: this.getActiveAlerts().length,
    };

    this.history.push(point);

    // Keep only recent history
    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  /**
   * Get overall health score
   */
  getHealthScore(): HealthScore {
    return this.calculateHealthScore();
  }

  /**
   * Get all current metrics
   */
  getMetrics(): HealthMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metric by name
   */
  getMetric(name: string): HealthMetric | undefined {
    return Array.from(this.metrics.values()).find((m) => m.name === name);
  }

  /**
   * Get health history
   */
  getHealthHistory(): HealthHistoryPoint[] {
    return [...this.history];
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): HealthAlert[] {
    return Array.from(this.alerts.values()).filter((a) => a.active);
  }

  /**
   * Get all alerts (including inactive)
   */
  getAllAlerts(): HealthAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.active = false;
    }
  }

  /**
   * Dismiss an alert
   */
  dismissAlert(alertId: string): void {
    this.alerts.delete(alertId);
  }

  /**
   * Get complete system health status
   */
  getSystemHealthStatus(): SystemHealthStatus {
    const healthScore = this.calculateHealthScore();
    const trend = this.analyzeTrend();

    return {
      healthScore,
      metrics: this.getMetrics(),
      alerts: this.getActiveAlerts(),
      trend,
      uptime: Date.now() - this.startTime,
      lastCheck: Date.now(),
      isMonitoring: this.isRunning,
    };
  }

  /**
   * Get metric history
   */
  getMetricHistory(metricName: string): MetricSample[] {
    for (const [key, history] of this.metricHistory) {
      if (key.includes(metricName)) {
        return [...history];
      }
    }
    return [];
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.history = [];
    this.metricHistory.clear();
  }

  /**
   * Reset all alerts
   */
  resetAlerts(): void {
    this.alerts.clear();
  }

  /**
   * Export health data
   */
  exportData(): string {
    return JSON.stringify({
      status: this.getSystemHealthStatus(),
      history: this.history,
      alerts: this.getAllAlerts(),
      config: this.config,
    }, null, 2);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let healthMonitor: HealthMonitor | null = null;

/**
 * Get the singleton health monitor instance
 */
export function getHealthMonitor(): HealthMonitor {
  if (!healthMonitor) {
    healthMonitor = new HealthMonitor();
  }
  return healthMonitor;
}

/**
 * Reset the health monitor instance
 */
export function resetHealthMonitor(): void {
  if (healthMonitor) {
    healthMonitor.stop();
    healthMonitor = null;
  }
}
