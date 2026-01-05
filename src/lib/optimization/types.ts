/**
 * Auto-Optimization System Types
 *
 * Type definitions for the auto-optimization engine that continuously monitors
 * performance, detects issues, and applies optimizations automatically.
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
// OPTIMIZATION RULES
// ============================================================================

/**
 * Priority level for optimization
 */
export type OptimizationPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Effort required to apply optimization
 */
export type OptimizationEffort = 'trivial' | 'low' | 'medium' | 'high';

/**
 * Expected impact of optimization
 */
export type OptimizationImpact = 'minimal' | 'low' | 'moderate' | 'high' | 'massive';

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
 * Optimization rule definition
 */
export interface OptimizationRule {
  /** Unique rule identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of what this rule does */
  description: string;

  /** Whether this rule is enabled */
  enabled: boolean;

  /** Category */
  category: OptimizationCategory;

  /** Target metric(s) to optimize */
  targets: OptimizationTarget[];

  /** Priority level */
  priority: OptimizationPriority;

  /** Effort required to apply */
  effort: OptimizationEffort;

  /** Expected impact */
  impact: OptimizationImpact;

  /** Whether this rule is safe to apply automatically */
  autoApplySafe: boolean;

  /** Whether user consent is required */
  requiresConsent: boolean;

  /** Risk level (0-100, higher = riskier) */
  riskLevel: number;

  /** Estimated duration for A/B test (ms) */
  estimatedTestDuration?: number;

  /** Rollback timeout (ms, how long to monitor before rollback) */
  rollbackTimeout: number;

  /** Tags for filtering */
  tags: string[];

  /** Conditions that must be met to suggest this rule */
  conditions: OptimizationCondition[];

  /** Configuration changes this rule applies */
  configChanges: ConfigChange[];

  /** Validation criteria */
  validation: ValidationCriteria;
}

/**
 * Condition that must be met for an optimization
 */
export interface OptimizationCondition {
  /** Metric to check */
  metric: OptimizationTarget;

  /** Comparison operator */
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq';

  /** Threshold value */
  threshold: number;

  /** Duration condition must hold (ms) */
  duration?: number;

  /** Sample size required */
  sampleSize?: number;
}

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

/**
 * Validation criteria for optimization
 */
export interface ValidationCriteria {
  /** Minimum sample size for statistical significance */
  minSampleSize: number;

  /** Confidence level (0-1) */
  confidenceLevel: number;

  /** Minimum improvement percentage */
  minImprovementPercent: number;

  /** Maximum degradation percentage */
  maxDegradationPercent: number;

  /** Metrics to validate */
  metrics: {
    target: OptimizationTarget;
    mustImprove: boolean;
    tolerance: number;
  }[];
}

// ============================================================================
// OPTIMIZATION CANDIDATES
// ============================================================================

/**
 * Suggested optimization candidate
 */
export interface OptimizationCandidate {
  /** Rule being suggested */
  rule: OptimizationRule;

  /** Current metric values */
  currentMetrics: Record<OptimizationTarget, number>;

  /** Expected metric values after optimization */
  expectedMetrics: Record<OptimizationTarget, number>;

  /** Confidence in this suggestion (0-1) */
  confidence: number;

  /** Estimated improvement percentage */
  estimatedImprovement: number;

  /** Reasoning for suggestion */
  reasoning: string;

  /** Dependencies on other optimizations */
  dependencies: string[];

  /** Conflicts with other optimizations */
  conflicts: string[];
}

/**
 * Batch of optimization candidates
 */
export interface OptimizationBatch {
  /** Candidates in this batch */
  candidates: OptimizationCandidate[];

  /** Batch priority */
  priority: OptimizationPriority;

  /** Estimated total improvement */
  totalImprovement: number;

  /** Estimated risk */
  totalRisk: number;

  /** Whether batch is safe to apply */
  safeToApply: boolean;
}

// ============================================================================
// A/B TESTING
// ============================================================================

/**
 * A/B experiment configuration
 */
export interface Experiment {
  /** Unique experiment ID */
  id: string;

  /** Optimization being tested */
  optimizationId: string;

  /** Control configuration */
  control: ConfigChange[];

  /** Treatment configuration */
  treatment: ConfigChange[];

  /** Traffic split (0-1, proportion for treatment) */
  trafficSplit: number;

  /** Start timestamp */
  startTime: number;

  /** End timestamp (0 if ongoing) */
  endTime: number;

  /** Minimum duration (ms) */
  minDuration: number;

  /** Maximum duration (ms) */
  maxDuration: number;

  /** Status */
  status: 'running' | 'paused' | 'completed' | 'failed';

  /** Results */
  results?: ExperimentResult;
}

/**
 * A/B experiment results
 */
export interface ExperimentResult {
  /** Control group metrics */
  control: Record<string, MetricStats>;

  /** Treatment group metrics */
  treatment: Record<string, MetricStats>;

  /** Statistical significance */
  significance: number;

  /** Winner ('control' | 'treatment' | 'inconclusive') */
  winner: 'control' | 'treatment' | 'inconclusive';

  /** Confidence interval */
  confidenceInterval: {
    lower: number;
    upper: number;
  };

  /** Improvement percentage (positive = treatment better) */
  improvementPercent: number;
}

/**
 * Metric statistics for A/B test
 */
export interface MetricStats {
  /** Sample size */
  sampleSize: number;

  /** Mean value */
  mean: number;

  /** Standard deviation */
  stdDev: number;

  /** Standard error */
  stdError: number;

  /** Percentiles */
  percentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
}

// ============================================================================
// OPTIMIZATION HISTORY
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

  /** Experiment ID (if A/B tested) */
  experimentId?: string;

  /** Rollback information */
  rollback?: {
    timestamp: number;
    reason: string;
  };

  /** User feedback */
  userFeedback?: {
    rating: number; // 1-5
    comments?: string;
  };
}

/**
 * Aggregated optimization history
 */
export interface OptimizationHistory {
  /** All optimization records */
  records: OptimizationRecord[];

  /** Summary statistics */
  summary: {
    /** Total optimizations applied */
    totalApplied: number;

    /** Successful optimizations */
    successful: number;

    /** Rolled back optimizations */
    rolledBack: number;

    /** Failed optimizations */
    failed: number;

    /** Average improvement percentage */
    avgImprovement: number;
  };

  /** Trends over time */
  trends: {
    /** Metric improvement trends */
    improvements: Record<OptimizationTarget, number>;

    /** Success rate over time */
    successRate: number;
  };
}

// ============================================================================
// MONITORING
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

  /** Suggested optimizations */
  suggestions: OptimizationCandidate[];
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
// ENGINE CONFIGURATION
// ============================================================================

/**
 * Optimization engine configuration
 */
export interface OptimizationEngineConfig {
  /** Whether optimization is enabled */
  enabled: boolean;

  /** Monitoring interval (ms) */
  monitorInterval: number;

  /** Analysis interval (ms) */
  analysisInterval: number;

  /** Whether to auto-apply safe optimizations */
  autoApply: boolean;

  /** Maximum risk level for auto-apply (0-100) */
  maxAutoApplyRisk: number;

  /** Whether to require user consent for major changes */
  requireConsent: boolean;

  /** Rollback timeout (ms) */
  defaultRollbackTimeout: number;

  /** Storage key for persistence */
  storageKey: string;

  /** Maximum history records to keep */
  maxHistoryRecords: number;

  /** Whether to persist state */
  persistState: boolean;

  /** Debug mode */
  debug: boolean;
}

/**
 * Optimization engine state
 */
export interface OptimizationEngineState {
  /** Configuration */
  config: OptimizationEngineConfig;

  /** Current optimization status */
  status: 'idle' | 'monitoring' | 'analyzing' | 'optimizing';

  /** Active experiment (if any) */
  activeExperiment?: Experiment;

  /** Currently applied optimizations */
  appliedOptimizations: string[];

  /** Optimization history */
  history: OptimizationHistory;

  /** Baseline metrics */
  baseline: Record<OptimizationTarget, number>;

  /** Last monitoring timestamp */
  lastMonitorTime: number;

  /** Last analysis timestamp */
  lastAnalysisTime: number;
}

// ============================================================================
// EVENTS
// ============================================================================

/**
 * Optimization event types
 */
export type OptimizationEventType =
  | 'monitoring-started'
  | 'monitoring-stopped'
  | 'issue-detected'
  | 'optimization-suggested'
  | 'optimization-applied'
  | 'optimization-rollback'
  | 'experiment-started'
  | 'experiment-completed'
  | 'validation-passed'
  | 'validation-failed';

/**
 * Optimization event
 */
export interface OptimizationEvent {
  /** Event type */
  type: OptimizationEventType;

  /** Timestamp */
  timestamp: number;

  /** Event data */
  data: unknown;
}

/**
 * Event listener
 */
export type OptimizationEventListener = (event: OptimizationEvent) => void;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Optimization suggestions result
 */
export interface OptimizationSuggestions {
  /** High-priority candidates */
  high: OptimizationCandidate[];

  /** Medium-priority candidates */
  medium: OptimizationCandidate[];

  /** Low-priority candidates */
  low: OptimizationCandidate[];

  /** Total count */
  count: number;

  /** Timestamp */
  timestamp: number;
}

/**
 * Optimization application result
 */
export interface OptimizationResult {
  /** Success flag */
  success: boolean;

  /** Optimization ID */
  optimizationId: string;

  /** Applied configuration changes */
  changes: ConfigChange[];

  /** Experiment ID (if A/B tested) */
  experimentId?: string;

  /** Error message (if failed) */
  error?: string;

  /** Timestamp */
  timestamp: number;
}

/**
 * Health status
 */
export interface HealthStatus {
  /** Overall health (0-100) */
  overall: number;

  /** Performance health (0-100) */
  performance: number;

  /** Quality health (0-100) */
  quality: number;

  /** Resource health (0-100) */
  resources: number;

  /** Active issues */
  issues: PerformanceIssue[];

  /** Recent optimizations */
  recentOptimizations: OptimizationRecord[];
}
