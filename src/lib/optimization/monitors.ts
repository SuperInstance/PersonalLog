/**
 * Performance Monitors
 *
 * Real-time monitoring of key performance metrics to detect degradation
 * and identify optimization opportunities.
 */

import type {
  MetricReading,
  OptimizationTarget,
  PerformanceSnapshot,
  PerformanceIssue,
} from './types';

// ============================================================================
// MONITOR INTERFACE
// ============================================================================

/**
 * Base monitor interface
 */
export interface Monitor {
  /** Metric being monitored */
  readonly metric: OptimizationTarget;

  /** Start monitoring */
  start(): void;

  /** Stop monitoring */
  stop(): void;

  /** Get current reading */
  getCurrentReading(): MetricReading;

  /** Get baseline value */
  getBaseline(): number;

  /** Set baseline value */
  setBaseline(value: number): void;

  /** Check if metric is anomalous */
  isAnomalous(): boolean;
}

// ============================================================================
// PERFORMANCE MONITOR
// ============================================================================

/**
 * Performance API monitor for timing metrics
 */
export class PerformanceMonitor implements Monitor {
  readonly metric: OptimizationTarget;
  private baseline: number = 0;
  private monitoring: boolean = false;
  private observer?: PerformanceObserver;
  private readings: number[] = [];
  private maxReadings: number = 100;

  constructor(
    metric: OptimizationTarget,
    private entryType: string,
    private entryName?: string
  ) {
    this.metric = metric;
  }

  start(): void {
    if (this.monitoring) return;

    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    this.monitoring = true;

    try {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (this.entryName && entry.name !== this.entryName) {
            continue;
          }

          const value = entry.duration || 0;
          this.addReading(value);
        }
      });

      this.observer.observe({ entryTypes: [this.entryType] });
    } catch (error) {
      console.error(`Failed to start ${this.metric} monitor:`, error);
    }
  }

  stop(): void {
    this.monitoring = false;
    this.observer?.disconnect();
  }

  getCurrentReading(): MetricReading {
    const value = this.getLatestReading();
    const anomaly = this.isAnomalous();

    return {
      metric: this.metric,
      value,
      timestamp: Date.now(),
      unit: this.getUnit(),
      anomaly,
      severity: anomaly ? this.calculateSeverity() : undefined,
    };
  }

  getBaseline(): number {
    return this.baseline || this.calculateBaseline();
  }

  setBaseline(value: number): void {
    this.baseline = value;
  }

  isAnomalous(): boolean {
    const current = this.getLatestReading();
    const baseline = this.getBaseline();
    const threshold = 0.5; // 50% degradation threshold

    return current > baseline * (1 + threshold);
  }

  private addReading(value: number): void {
    this.readings.push(value);
    if (this.readings.length > this.maxReadings) {
      this.readings.shift();
    }
  }

  private getLatestReading(): number {
    if (this.readings.length === 0) {
      return 0;
    }
    return this.readings[this.readings.length - 1];
  }

  private calculateBaseline(): number {
    if (this.readings.length === 0) {
      return 0;
    }

    // Use median as baseline
    const sorted = [...this.readings].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private calculateSeverity(): number {
    const current = this.getLatestReading();
    const baseline = this.getBaseline();
    const ratio = current / baseline;
    return Math.min((ratio - 1) * 2, 1); // Scale to 0-1
  }

  private getUnit(): string {
    if (this.metric === 'initial-load-time') {
      return 'ms';
    }
    return 'ms';
  }
}

// ============================================================================
// MEMORY MONITOR
// ============================================================================

/**
 * Memory usage monitor
 */
export class MemoryMonitor implements Monitor {
  readonly metric: OptimizationTarget = 'memory-usage';
  private baseline: number = 0;
  private monitoring: boolean = false;
  private intervalId?: number;
  private readings: number[] = [];
  private maxReadings: number = 100;

  constructor(private interval: number = 1000) {
    // Memory monitoring interval
  }

  start(): void {
    if (this.monitoring) return;
    if (typeof window === 'undefined') return;

    this.monitoring = true;
    this.intervalId = window.setInterval(() => {
      this.collectMemory();
    }, this.interval);
  }

  stop(): void {
    this.monitoring = false;
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
    }
  }

  getCurrentReading(): MetricReading {
    const value = this.getLatestReading();
    const anomaly = this.isAnomalous();

    return {
      metric: this.metric,
      value,
      timestamp: Date.now(),
      unit: 'MB',
      anomaly,
      severity: anomaly ? this.calculateSeverity() : undefined,
    };
  }

  getBaseline(): number {
    return this.baseline || this.calculateBaseline();
  }

  setBaseline(value: number): void {
    this.baseline = value;
  }

  isAnomalous(): boolean {
    const current = this.getLatestReading();
    const baseline = this.getBaseline();
    const threshold = 0.3; // 30% increase threshold

    return current > baseline * (1 + threshold);
  }

  private collectMemory(): void {
    if (
      'memory' in performance &&
      (performance as any).memory?.usedJSHeapSize
    ) {
      const usedMB = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
      this.addReading(usedMB);
    }
  }

  private addReading(value: number): void {
    this.readings.push(value);
    if (this.readings.length > this.maxReadings) {
      this.readings.shift();
    }
  }

  private getLatestReading(): number {
    if (this.readings.length === 0) {
      return 0;
    }
    return this.readings[this.readings.length - 1];
  }

  private calculateBaseline(): number {
    if (this.readings.length === 0) {
      return 0;
    }

    // Use p95 as baseline for memory
    const sorted = [...this.readings].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    return sorted[idx] || 0;
  }

  private calculateSeverity(): number {
    const current = this.getLatestReading();
    const baseline = this.getBaseline();
    const ratio = current / baseline;
    return Math.min((ratio - 1) * 3, 1);
  }
}

// ============================================================================
// FRAME RATE MONITOR
// ============================================================================

/**
 * Frame rate (FPS) monitor
 */
export class FrameRateMonitor implements Monitor {
  readonly metric: OptimizationTarget = 'frame-rate';
  private baseline: number = 60;
  private monitoring: boolean = false;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private fpsReadings: number[] = [];
  private maxReadings: number = 100;
  private animationFrameId?: number;

  start(): void {
    if (this.monitoring) return;
    if (typeof window === 'undefined') return;

    this.monitoring = true;
    this.lastTime = performance.now();
    this.measureFrameRate();
  }

  stop(): void {
    this.monitoring = false;
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  getCurrentReading(): MetricReading {
    const value = this.getLatestReading();
    const anomaly = this.isAnomalous();

    return {
      metric: this.metric,
      value,
      timestamp: Date.now(),
      unit: 'fps',
      anomaly,
      severity: anomaly ? this.calculateSeverity() : undefined,
    };
  }

  getBaseline(): number {
    return this.baseline;
  }

  setBaseline(value: number): void {
    this.baseline = value;
  }

  isAnomalous(): boolean {
    const current = this.getLatestReading();
    return current < this.baseline * 0.5; // 50% drop threshold
  }

  private measureFrameRate(): void {
    if (!this.monitoring) return;

    const now = performance.now();
    this.frameCount++;

    // Calculate FPS every second
    if (now >= this.lastTime + 1000) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.addReading(fps);
      this.frameCount = 0;
      this.lastTime = now;
    }

    this.animationFrameId = requestAnimationFrame(() => this.measureFrameRate());
  }

  private addReading(value: number): void {
    this.fpsReadings.push(value);
    if (this.fpsReadings.length > this.maxReadings) {
      this.fpsReadings.shift();
    }
  }

  private getLatestReading(): number {
    if (this.fpsReadings.length === 0) {
      return 60;
    }
    return this.fpsReadings[this.fpsReadings.length - 1];
  }

  private calculateSeverity(): number {
    const current = this.getLatestReading();
    const ratio = this.baseline / current;
    return Math.min((ratio - 1) * 2, 1);
  }
}

// ============================================================================
// JANK MONITOR
// ============================================================================

/**
 * Jank (long task) monitor
 */
export class JankMonitor implements Monitor {
  readonly metric: OptimizationTarget = 'jank';
  private baseline: number = 0;
  private monitoring: boolean = false;
  private observer?: PerformanceObserver;
  private longTasks: number[] = [];
  private maxTasks: number = 100;

  start(): void {
    if (this.monitoring) return;
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    this.monitoring = true;

    try {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.duration > 50) {
            // Long task threshold: 50ms
            this.addLongTask(entry.duration);
          }
        }
      });

      this.observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      // longtask not supported
    }
  }

  stop(): void {
    this.monitoring = false;
    this.observer?.disconnect();
  }

  getCurrentReading(): MetricReading {
    // Count long tasks in last second
    const now = performance.now();
    const recentTasks = this.longTasks.filter(
      (t) => now - t < 1000
    ).length;

    const anomaly = this.isAnomalous();

    return {
      metric: this.metric,
      value: recentTasks,
      timestamp: Date.now(),
      unit: 'tasks/sec',
      anomaly,
      severity: anomaly ? this.calculateSeverity(recentTasks) : undefined,
    };
  }

  getBaseline(): number {
    return this.baseline || 2; // Allow 2 long tasks per second
  }

  setBaseline(value: number): void {
    this.baseline = value;
  }

  isAnomalous(): boolean {
    const current = this.getCurrentReading().value;
    return current > this.getBaseline() * 2;
  }

  private addLongTask(duration: number): void {
    this.longTasks.push(performance.now());
    if (this.longTasks.length > this.maxTasks) {
      this.longTasks.shift();
    }
  }

  private calculateSeverity(current: number): number {
    const baseline = this.getBaseline();
    const ratio = current / baseline;
    return Math.min((ratio - 1) * 0.5, 1);
  }
}

// ============================================================================
// MONITOR REGISTRY
// ============================================================================

/**
 * Monitor registry for managing all monitors
 */
export class MonitorRegistry {
  private monitors: Map<OptimizationTarget, Monitor> = new Map();
  private active: boolean = false;

  constructor() {
    this.initializeMonitors();
  }

  /**
   * Initialize default monitors
   */
  private initializeMonitors(): void {
    // Performance monitors
    this.monitors.set(
      'initial-load-time',
      new PerformanceMonitor('initial-load-time', 'navigation')
    );
    this.monitors.set(
      'response-latency',
      new PerformanceMonitor('response-latency', 'measure', 'api-response')
    );

    // Resource monitors
    this.monitors.set('memory-usage', new MemoryMonitor(1000));
    this.monitors.set('frame-rate', new FrameRateMonitor());
    this.monitors.set('jank', new JankMonitor());

    // Set initial baselines
    this.monitors.get('initial-load-time')?.setBaseline(2000); // 2s
    this.monitors.get('response-latency')?.setBaseline(500); // 500ms
    this.monitors.get('frame-rate')?.setBaseline(60); // 60fps
  }

  /**
   * Start all monitors
   */
  start(): void {
    if (this.active) return;

    const monitorsArray = Array.from(this.monitors.values());
    for (const monitor of monitorsArray) {
      monitor.start();
    }

    this.active = true;
  }

  /**
   * Stop all monitors
   */
  stop(): void {
    if (!this.active) return;

    const monitorsArray = Array.from(this.monitors.values());
    for (const monitor of monitorsArray) {
      monitor.stop();
    }

    this.active = false;
  }

  /**
   * Get monitor for specific metric
   */
  getMonitor(metric: OptimizationTarget): Monitor | undefined {
    return this.monitors.get(metric);
  }

  /**
   * Get current reading for metric
   */
  getReading(metric: OptimizationTarget): MetricReading | undefined {
    return this.monitors.get(metric)?.getCurrentReading();
  }

  /**
   * Get all current readings
   */
  getAllReadings(): Record<OptimizationTarget, MetricReading> {
    const readings: Record<string, MetricReading> = {};

    const monitorsArray = Array.from(this.monitors.entries());
    for (const [metric, monitor] of monitorsArray) {
      readings[metric] = monitor.getCurrentReading();
    }

    return readings as Record<OptimizationTarget, MetricReading>;
  }

  /**
   * Create performance snapshot
   */
  createSnapshot(): PerformanceSnapshot {
    const readings = this.getAllReadings();

    // Calculate health score
    const healthScore = this.calculateHealthScore(readings);

    // Detect issues
    const issues = this.detectIssues(readings);

    return {
      timestamp: Date.now(),
      metrics: readings,
      healthScore,
      issues,
      suggestions: [], // Populated by optimization engine
    };
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Calculate overall health score
   */
  private calculateHealthScore(
    readings: Record<OptimizationTarget, MetricReading>
  ): number {
    let totalScore = 0;
    let count = 0;

    for (const reading of Object.values(readings)) {
      if (reading.anomaly) {
        totalScore += Math.max(0, 100 - (reading.severity || 0) * 100);
      } else {
        totalScore += 100;
      }
      count++;
    }

    return count > 0 ? totalScore / count : 100;
  }

  /**
   * Detect performance issues
   */
  private detectIssues(
    readings: Record<OptimizationTarget, MetricReading>
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    for (const [metric, reading] of Object.entries(readings)) {
      if (reading.anomaly) {
        const monitor = this.monitors.get(metric as OptimizationTarget);
        if (!monitor) continue;

        const baseline = monitor.getBaseline();
        const deviation =
          ((reading.value - baseline) / baseline) * 100;

        issues.push({
          type: 'anomaly',
          metric: metric as OptimizationTarget,
          severity: reading.severity || 0.5,
          description: `${metric} is degraded`,
          currentValue: reading.value,
          expectedValue: baseline,
          deviationPercent: deviation,
          duration: 0, // Would be tracked separately
          autoRollbackTriggered: false,
        });
      }
    }

    return issues;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create monitor registry with default monitors
 */
export function createMonitorRegistry(): MonitorRegistry {
  return new MonitorRegistry();
}
