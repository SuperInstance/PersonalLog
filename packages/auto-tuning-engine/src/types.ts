/**
 * Auto-Tuning Engine Types
 *
 * Type definitions for the auto-tuning engine that monitors performance,
 * detects optimization opportunities, and applies improvements automatically.
 */

// ============================================================================
// OPTIMIZATION TARGETS
// ============================================================================

/**
 * Categories of optimizations that can be applied
 */
export type OptimizationCategory =
  | 'performance'   // Speed and responsiveness
  | 'quality'       // Reliability and user satisfaction
  | 'resources'     // CPU, memory, battery, storage
  | 'feature'       // Feature flag adjustments
  | 'config';       // Configuration tuning

/**
 * Specific metrics that can be optimized
 */
export type OptimizationTarget =
  // Performance targets
  | 'initial-load-time'
  | 'response-latency'
  | 'memory-usage'
  | 'frame-rate'
  | 'jank'

  // Quality targets
  | 'error-rate'
  | 'feature-reliability'
  | 'user-engagement'
  | 'user-satisfaction'

  // Resource targets
  | 'cpu-usage'
  | 'memory-footprint'
  | 'battery-drain'
  | 'storage-usage'

  // Feature targets
  | 'feature-performance'
  | 'feature-adoption'

  // Config targets
  | 'batch-size'
  | 'cache-size'
  | 'concurrency'
  | 'timeouts';

// ============================================================================
// METRIC READINGS
// ============================================================================

/**
 * Real-time metric reading
 */
export interface MetricReading {
  /** Metric being measured */
  metric: OptimizationTarget;

  /** Value */
  value: number;

  /** Timestamp */
  timestamp: number;

  /** Unit */
  unit: string;

  /** Whether this is an anomaly */
  anomaly: boolean;

  /** Severity if anomalous (0-1) */
  severity?: number;
}

/**
 * Performance snapshot
 */
export interface PerformanceSnapshot {
  /** Timestamp */
  timestamp: number;

  /** All metric readings */
  metrics: Record<OptimizationTarget, MetricReading>;

  /** Overall health score (0-100) */
  healthScore: number;

  /** Detected issues */
  issues: PerformanceIssue[];
}

/**
 * Detected performance issue
 */
export interface PerformanceIssue {
  /** Issue type */
  type: 'degradation' | 'spike' | 'anomaly' | 'threshold';

  /** Affected metric */
  metric: OptimizationTarget;

  /** Severity (0-1) */
  severity: number;

  /** Description */
  description: string;

  /** Current value */
  currentValue: number;

  /** Expected value/baseline */
  expectedValue: number;

  /** Deviation percentage */
  deviationPercent: number;

  /** Duration of issue (ms) */
  duration: number;

  /** Whether auto-rollback triggered */
  autoRollbackTriggered: boolean;
}

// ============================================================================
// OPTIMIZATION RECORDS
// ============================================================================

/**
 * Record of an applied optimization
 */
export interface OptimizationRecord {
  /** Unique record ID */
  id: string;

  /** Rule that was applied */
  ruleId: string;

  /** Rule name */
  ruleName: string;

  /** Timestamp applied */
  timestamp: number;

  /** Status */
  status: OptimizationStatus;

  /** Configuration changes applied */
  changes: ConfigChange[];

  /** Metrics before optimization */
  beforeMetrics: Record<OptimizationTarget, number>;

  /** Metrics after optimization */
  afterMetrics?: Record<OptimizationTarget, number>;

  /** Actual improvement percentage */
  improvementPercent?: number;

  /** Whether optimization was validated */
  validated: boolean;

  /** Rollback information */
  rollback?: {
    timestamp: number;
    reason: string;
  };
}

/**
 * Current state of an optimization
 */
export type OptimizationStatus =
  | 'pending'       // Not yet applied
  | 'testing'       // Currently in A/B test
  | 'validating'    // Analyzing test results
  | 'applied'       // Successfully applied
  | 'rollback'      // Rolled back due to issues
  | 'failed';       // Failed to apply

/**
 * Configuration change to apply
 */
export interface ConfigChange {
  /** Configuration key */
  key: string;

  /** New value */
  value: unknown;

  /** Value type */
  type: 'number' | 'boolean' | 'string' | 'object' | 'array';

  /** Whether this change is reversible */
  reversible: boolean;

  /** Previous value (for rollback) */
  previousValue?: unknown;
}
