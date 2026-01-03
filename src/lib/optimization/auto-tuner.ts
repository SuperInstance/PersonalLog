/**
 * Auto-Tuner
 *
 * Adaptive optimization system that monitors performance, detects
 * optimization opportunities, and applies improvements automatically.
 */

import type {
  OptimizationTarget,
  OptimizationRecord,
  MetricReading,
} from './types';
import { profiler } from './profiler';

// ============================================================================
// TUNABLE CONFIGURATION
// ============================================================================

export interface TunableConfig {
  /** Configuration key */
  key: string;

  /** Current value */
  current: number;

  /** Minimum allowed value */
  min: number;

  /** Maximum allowed value */
  max: number;

  /** Value type */
  type: 'number' | 'boolean' | 'string';

  /** Category */
  category: 'cache' | 'api' | 'performance' | 'memory' | 'rendering';

  /** Description */
  description: string;

  /** Whether this value can be auto-tuned */
  autoTunable: boolean;

  /** Optimization targets this affects */
  targets: OptimizationTarget[];
}

// ============================================================================
// PERFORMANCE METRICS
// ============================================================================

export interface PerformanceMetrics {
  /** Response time in milliseconds */
  responseTime: number;

  /** Cache hit rate (0-1) */
  cacheHitRate: number;

  /** Memory usage in MB */
  memoryUsage: number;

  /** Bundle size in KB */
  bundleSize: number;

  /** Render performance (fps) */
  renderPerformance: number;

  /** CPU usage (0-100) */
  cpuUsage: number;

  /** Error rate (0-1) */
  errorRate: number;
}

// ============================================================================
// OPTIMIZATION OPPORTUNITY
// ============================================================================

export interface Optimization {
  /** Unique ID */
  id: string;

  /** Type of optimization */
  type: 'cache' | 'api' | 'bundle' | 'memory' | 'rendering';

  /** Configuration key to optimize */
  configKey: string;

  /** Current value */
  currentValue: number;

  /** Suggested value */
  suggestedValue: number;

  /** Priority (1-10) */
  priority: number;

  /** Expected improvement percentage */
  expectedImprovement: number;

  /** Confidence (0-1) */
  confidence: number;

  /** Reasoning */
  reasoning: string;

  /** Risk level (0-100) */
  riskLevel: number;

  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// OPTIMIZATION RESULT
// ============================================================================

export interface OptimizationResult {
  /** Success flag */
  success: boolean;

  /** Optimization ID */
  optimizationId: string;

  /** Applied changes */
  changes: {
    key: string;
    before: number;
    after: number;
  }[];

  /** Performance before */
  beforeMetrics: PerformanceMetrics;

  /** Performance after (if available) */
  afterMetrics?: PerformanceMetrics;

  /** Effectiveness measurement */
  effectiveness?: {
    target: OptimizationTarget;
    before: number;
    after: number;
    improvement: string;
  };

  /** Error message (if failed) */
  error?: string;

  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// AUTO-TUNER
// ============================================================================

export class AutoTuner {
  private tunableConfigs: Map<string, TunableConfig> = new Map();
  private optimizationHistory: OptimizationResult[] = [];
  private baselineMetrics: PerformanceMetrics | null = null;
  private currentMetrics: PerformanceMetrics | null = null;

  constructor() {
    this.initializeTunableConfigs();
  }

  // ========================================================================
  // MONITORING
  // ========================================================================

  /**
   * Monitor current performance
   */
  async monitor(): Promise<PerformanceMetrics> {
    const metrics: PerformanceMetrics = {
      responseTime: await this.measureResponseTime(),
      cacheHitRate: await this.measureCacheHitRate(),
      memoryUsage: await this.measureMemoryUsage(),
      bundleSize: await this.measureBundleSize(),
      renderPerformance: await this.measureRenderPerformance(),
      cpuUsage: await this.measureCpuUsage(),
      errorRate: await this.measureErrorRate(),
    };

    this.currentMetrics = metrics;

    // Set baseline if not set
    if (!this.baselineMetrics) {
      this.baselineMetrics = { ...metrics };
    }

    return metrics;
  }

  /**
   * Detect optimization opportunities
   */
  async detectOpportunities(): Promise<Optimization[]> {
    if (!this.currentMetrics) {
      await this.monitor();
    }

    const opportunities: Optimization[] = [];
    const metrics = this.currentMetrics!;
    const baseline = this.baselineMetrics!;

    // Check response time
    if (metrics.responseTime > baseline.responseTime * 1.5) {
      const optimization = this.suggestApiOptimization(metrics);
      if (optimization) opportunities.push(optimization);
    }

    // Check cache hit rate
    if (metrics.cacheHitRate < 0.6) {
      const optimization = this.suggestCacheOptimization(metrics);
      if (optimization) opportunities.push(optimization);
    }

    // Check memory usage
    if (metrics.memoryUsage > baseline.memoryUsage * 1.3) {
      const optimization = this.suggestMemoryOptimization(metrics);
      if (optimization) opportunities.push(optimization);
    }

    // Check render performance
    if (metrics.renderPerformance < 50) {
      const optimization = this.suggestRenderOptimization(metrics);
      if (optimization) opportunities.push(optimization);
    }

    // Sort by priority
    return opportunities.sort((a, b) => b.priority - a.priority);
  }

  // ========================================================================
  // OPTIMIZATION APPLICATION
  // ========================================================================

  /**
   * Apply optimization with rollback safety
   */
  async apply(optimization: Optimization): Promise<OptimizationResult> {
    console.log(`[AutoTuner] Applying optimization: ${optimization.configKey}`);

    // Get current metrics before
    const beforeMetrics = await this.monitor();

    try {
      // Apply configuration change
      const config = this.tunableConfigs.get(optimization.configKey);
      if (!config) {
        throw new Error(`Config not found: ${optimization.configKey}`);
      }

      const previousValue = config.current;
      config.current = optimization.suggestedValue;

      // Apply to actual configuration
      this.applyConfigChange(optimization.configKey, optimization.suggestedValue);

      // Create result
      const result: OptimizationResult = {
        success: true,
        optimizationId: optimization.id,
        changes: [
          {
            key: optimization.configKey,
            before: previousValue,
            after: optimization.suggestedValue,
          },
        ],
        beforeMetrics,
        timestamp: Date.now(),
      };

      // Store in history
      this.optimizationHistory.push(result);

      // Monitor effectiveness after delay
      setTimeout(() => {
        this.measureEffectiveness(optimization.id);
      }, 30000); // 30 seconds

      console.log(`[AutoTuner] Optimization applied: ${optimization.configKey}`);

      return result;
    } catch (error) {
      console.error(`[AutoTuner] Failed to apply optimization:`, error);

      return {
        success: false,
        optimizationId: optimization.id,
        changes: [],
        beforeMetrics,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Rollback optimization
   */
  async rollback(optimizationId: string): Promise<void> {
    const result = this.optimizationHistory.find((r) => r.optimizationId === optimizationId);
    if (!result) {
      throw new Error(`Optimization not found: ${optimizationId}`);
    }

    console.log(`[AutoTuner] Rolling back optimization: ${optimizationId}`);

    for (const change of result.changes) {
      this.applyConfigChange(change.key, change.before);
    }

    console.log(`[AutoTuner] Rollback complete: ${optimizationId}`);
  }

  /**
   * Measure optimization effectiveness
   */
  async measure(optimizationId: string): Promise<{
    target: OptimizationTarget;
    before: number;
    after: number;
    improvement: string;
  } | null> {
    const result = this.optimizationHistory.find((r) => r.optimizationId === optimizationId);
    if (!result) {
      return null;
    }

    // Get current metrics
    const afterMetrics = await this.monitor();
    result.afterMetrics = afterMetrics;

    // Calculate improvement for main target
    const config = this.tunableConfigs.get(result.changes[0].key);
    if (!config || config.targets.length === 0) {
      return null;
    }

    const target = config.targets[0];
    const before = result.beforeMetrics[this.getMetricKey(target)];
    const after = afterMetrics[this.getMetricKey(target)];

    const improvement = this.calculateImprovement(before, after);

    result.effectiveness = {
      target,
      before,
      after,
      improvement,
    };

    return result.effectiveness;
  }

  // ========================================================================
  // CONFIGURATION
  // ========================================================================

  /**
   * Get tunable configuration
   */
  getTunableConfig(key: string): TunableConfig | undefined {
    return this.tunableConfigs.get(key);
  }

  /**
   * Get all tunable configurations
   */
  getAllTunableConfigs(): TunableConfig[] {
    return Array.from(this.tunableConfigs.values());
  }

  /**
   * Update configuration value
   */
  updateConfig(key: string, value: number): boolean {
    const config = this.tunableConfigs.get(key);
    if (!config) {
      return false;
    }

    if (value < config.min || value > config.max) {
      return false;
    }

    config.current = value;
    this.applyConfigChange(key, value);
    return true;
  }

  // ========================================================================
  // HISTORY
  // ========================================================================

  /**
   * Get optimization history
   */
  getHistory(): OptimizationResult[] {
    return [...this.optimizationHistory];
  }

  /**
   * Get successful optimizations
   */
  getSuccessfulOptimizations(): OptimizationResult[] {
    return this.optimizationHistory.filter((r) => r.success);
  }

  /**
   * Get failed optimizations
   */
  getFailedOptimizations(): OptimizationResult[] {
    return this.optimizationHistory.filter((r) => !r.success);
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Initialize tunable configurations
   */
  private initializeTunableConfigs(): void {
    // Cache configurations
    this.tunableConfigs.set('cacheMaxSize', {
      key: 'cacheMaxSize',
      current: 1000,
      min: 100,
      max: 10000,
      type: 'number',
      category: 'cache',
      description: 'Maximum cache size in entries',
      autoTunable: true,
      targets: ['cache-size'],
    });

    this.tunableConfigs.set('cacheTTL', {
      key: 'cacheTTL',
      current: 300000, // 5 minutes
      min: 60000, // 1 minute
      max: 3600000, // 1 hour
      type: 'number',
      category: 'cache',
      description: 'Cache time-to-live in milliseconds',
      autoTunable: true,
      targets: ['cache-size'],
    });

    // API configurations
    this.tunableConfigs.set('apiTimeout', {
      key: 'apiTimeout',
      current: 10000,
      min: 5000,
      max: 30000,
      type: 'number',
      category: 'api',
      description: 'API request timeout in milliseconds',
      autoTunable: true,
      targets: ['response-latency'],
    });

    this.tunableConfigs.set('apiRetryAttempts', {
      key: 'apiRetryAttempts',
      current: 3,
      min: 0,
      max: 5,
      type: 'number',
      category: 'api',
      description: 'Maximum API retry attempts',
      autoTunable: true,
      targets: ['response-latency', 'error-rate'],
    });

    this.tunableConfigs.set('apiBatchSize', {
      key: 'apiBatchSize',
      current: 50,
      min: 10,
      max: 100,
      type: 'number',
      category: 'api',
      description: 'API request batch size',
      autoTunable: true,
      targets: ['response-latency'],
    });

    // Performance configurations
    this.tunableConfigs.set('maxConcurrentRequests', {
      key: 'maxConcurrentRequests',
      current: 6,
      min: 1,
      max: 20,
      type: 'number',
      category: 'performance',
      description: 'Maximum concurrent API requests',
      autoTunable: true,
      targets: ['response-latency'],
    });

    // Memory configurations
    this.tunableConfigs.set('memoryCacheLimit', {
      key: 'memoryCacheLimit',
      current: 50,
      min: 10,
      max: 200,
      type: 'number',
      category: 'memory',
      description: 'Memory cache limit in MB',
      autoTunable: true,
      targets: ['memory-usage'],
    });

    // Rendering configurations
    this.tunableConfigs.set('virtualScrollThreshold', {
      key: 'virtualScrollThreshold',
      current: 100,
      min: 50,
      max: 500,
      type: 'number',
      category: 'rendering',
      description: 'Minimum items for virtual scrolling',
      autoTunable: true,
      targets: ['frame-rate', 'jank'],
    });
  }

  /**
   * Suggest API optimization
   */
  private suggestApiOptimization(metrics: PerformanceMetrics): Optimization | null {
    // Try increasing timeout
    const timeoutConfig = this.tunableConfigs.get('apiTimeout')!;
    if (timeoutConfig.current < timeoutConfig.max) {
      return {
        id: `opt-${Date.now()}-api-timeout`,
        type: 'api',
        configKey: 'apiTimeout',
        currentValue: timeoutConfig.current,
        suggestedValue: Math.min(timeoutConfig.current * 1.5, timeoutConfig.max),
        priority: 7,
        expectedImprovement: 15,
        confidence: 0.75,
        reasoning: 'Response time is high, increasing timeout may help',
        riskLevel: 20,
        timestamp: Date.now(),
      };
    }

    return null;
  }

  /**
   * Suggest cache optimization
   */
  private suggestCacheOptimization(metrics: PerformanceMetrics): Optimization | null {
    const cacheConfig = this.tunableConfigs.get('cacheMaxSize')!;
    if (cacheConfig.current < cacheConfig.max) {
      return {
        id: `opt-${Date.now()}-cache-size`,
        type: 'cache',
        configKey: 'cacheMaxSize',
        currentValue: cacheConfig.current,
        suggestedValue: Math.min(cacheConfig.current * 2, cacheConfig.max),
        priority: 8,
        expectedImprovement: 35,
        confidence: 0.92,
        reasoning: `Low cache hit rate (${(metrics.cacheHitRate * 100).toFixed(0)}%), increasing cache size should improve it`,
        riskLevel: 15,
        timestamp: Date.now(),
      };
    }

    return null;
  }

  /**
   * Suggest memory optimization
   */
  private suggestMemoryOptimization(metrics: PerformanceMetrics): Optimization | null {
    const memoryConfig = this.tunableConfigs.get('memoryCacheLimit')!;
    if (memoryConfig.current > memoryConfig.min) {
      return {
        id: `opt-${Date.now()}-memory-limit`,
        type: 'memory',
        configKey: 'memoryCacheLimit',
        currentValue: memoryConfig.current,
        suggestedValue: Math.max(memoryConfig.current * 0.7, memoryConfig.min),
        priority: 6,
        expectedImprovement: 20,
        confidence: 0.85,
        reasoning: 'High memory usage detected, reducing cache limit',
        riskLevel: 25,
        timestamp: Date.now(),
      };
    }

    return null;
  }

  /**
   * Suggest render optimization
   */
  private suggestRenderOptimization(metrics: PerformanceMetrics): Optimization | null {
    const virtualScrollConfig = this.tunableConfigs.get('virtualScrollThreshold')!;
    if (virtualScrollConfig.current > virtualScrollConfig.min) {
      return {
        id: `opt-${Date.now()}-virtual-scroll`,
        type: 'rendering',
        configKey: 'virtualScrollThreshold',
        currentValue: virtualScrollConfig.current,
        suggestedValue: Math.max(virtualScrollConfig.current * 0.7, virtualScrollConfig.min),
        priority: 9,
        expectedImprovement: 40,
        confidence: 0.88,
        reasoning: `Low frame rate (${metrics.renderPerformance.toFixed(0)} fps), lowering virtual scroll threshold`,
        riskLevel: 10,
        timestamp: Date.now(),
      };
    }

    return null;
  }

  /**
   * Apply configuration change to system
   */
  private applyConfigChange(key: string, value: number): void {
    // Store in localStorage for persistence
    try {
      const config = localStorage.getItem('personallog-config');
      const parsed = config ? JSON.parse(config) : {};
      parsed[key] = value;
      localStorage.setItem('personallog-config', JSON.stringify(parsed));
    } catch (error) {
      console.error('[AutoTuner] Failed to persist config:', error);
    }
  }

  /**
   * Measure optimization effectiveness
   */
  private async measureEffectiveness(optimizationId: string): Promise<void> {
    const effectiveness = await this.measure(optimizationId);
    if (effectiveness) {
      console.log(`[AutoTuner] Optimization effectiveness:`, effectiveness);
    }
  }

  /**
   * Get metric key from optimization target
   */
  private getMetricKey(target: OptimizationTarget): keyof PerformanceMetrics {
    switch (target) {
      case 'response-latency':
        return 'responseTime';
      case 'cache-size':
        return 'cacheHitRate';
      case 'memory-usage':
        return 'memoryUsage';
      case 'frame-rate':
        return 'renderPerformance';
      case 'error-rate':
        return 'errorRate';
      default:
        return 'responseTime';
    }
  }

  /**
   * Calculate improvement percentage
   */
  private calculateImprovement(before: number, after: number): string {
    if (before === 0) return '0%';

    // For latency/memory, lower is better
    if (this.getMetricKey('response-latency') === 'responseTime' ||
        this.getMetricKey('memory-usage') === 'memoryUsage') {
      const improvement = ((before - after) / before) * 100;
      return `${improvement >= 0 ? '+' : ''}${improvement.toFixed(1)}%`;
    }

    // For hit rate/fps, higher is better
    const improvement = ((after - before) / before) * 100;
    return `${improvement >= 0 ? '+' : ''}${improvement.toFixed(1)}%`;
  }

  // ========================================================================
  // METRIC MEASUREMENTS
  // ========================================================================

  private async measureResponseTime(): Promise<number> {
    const stats = profiler.getStats('api:response');
    return stats?.avg ?? 500;
  }

  private async measureCacheHitRate(): Promise<number> {
    // Default to reasonable hit rate
    return 0.75;
  }

  private async measureMemoryUsage(): Promise<number> {
    if ('memory' in performance && (performance as any).memory?.usedJSHeapSize) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }
    return 50;
  }

  private async measureBundleSize(): Promise<number> {
    // Approximate bundle size - would be measured in production
    return 300;
  }

  private async measureRenderPerformance(): Promise<number> {
    const stats = profiler.getStats('component:render');
    return stats?.avg ?? 60;
  }

  private async measureCpuUsage(): Promise<number> {
    // CPU not directly measurable in browser
    return 20;
  }

  private async measureErrorRate(): Promise<number> {
    // Would be tracked by error monitoring
    return 0.01;
  }
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

/**
 * Global auto-tuner instance
 */
export const autoTuner = new AutoTuner();
