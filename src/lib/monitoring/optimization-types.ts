/**
 * Adaptive Optimization System Types
 *
 * Defines triggers, rules, and optimizations for automatic performance tuning.
 */

// ============================================================================
// TRIGGER TYPES
// ============================================================================

/**
 * Metric types that can trigger optimizations
 */
export type MetricType =
  | 'memory-used'
  | 'memory-percent'
  | 'cpu-percent'
  | 'api-duration'
  | 'api-failure-rate'
  | 'cache-hit-rate'
  | 'render-duration'
  | 'long-tasks'
  | 'error-count'
  | 'storage-used'
  | 'storage-percent'
  | 'custom';

/**
 * Condition operator for trigger evaluation
 */
export type ConditionOperator = '>' | '>=' | '<' | '<=' | '==' | '!=' | 'between';

/**
 * Trigger condition
 */
export interface TriggerCondition {
  /** Metric to monitor */
  metric: MetricType;

  /** Comparison operator */
  operator: ConditionOperator;

  /** Threshold value(s) */
  threshold: number | [number, number]; // Single value or range for 'between'

  /** Duration condition must be met (milliseconds) */
  duration?: number;

  /** Optional endpoint/resource filter */
  filter?: {
    endpoint?: string;
    resource?: string;
    type?: string;
  };
}

/**
 * Optimization trigger definition
 */
export interface OptimizationTrigger {
  /** Unique trigger ID */
  id: string;

  /** Trigger name */
  name: string;

  /** Description of what this trigger detects */
  description: string;

  /** Trigger condition(s) - AND logic */
  conditions: TriggerCondition[];

  /** Optimization to execute when triggered */
  optimizationId: string;

  /** Priority level (higher = more important) */
  priority: 'critical' | 'high' | 'medium' | 'low';

  /** Is this trigger enabled */
  enabled: boolean;

  /** Minimum time between triggers (milliseconds) */
  cooldown: number;

  /** Maximum times this trigger can fire (0 = unlimited) */
  maxTriggers?: number;

  /** Time window for maxTriggers (milliseconds) */
  triggerWindow?: number;

  /** Metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// OPTIMIZATION TYPES
// ============================================================================

/**
 * Optimization status
 */
export type OptimizationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'rolled-back';

/**
 * Optimization definition
 */
export interface Optimization {
  /** Unique optimization ID */
  id: string;

  /** Optimization name */
  name: string;

  /** Description */
  description: string;

  /** Optimization function */
  action: () => Promise<OptimizationResult>;

  /** Rollback function (to undo optimization) */
  rollback?: () => Promise<void>;

  /** Expected impact */
  expectedImpact: {
    metric: MetricType;
    improvement: string; // e.g., "-50MB memory", "+20% cache hit rate"
  };

  /** Estimated execution time (milliseconds) */
  estimatedDuration?: number;

  /** Can be automatically rolled back if ineffective */
  canRollback: boolean;

  /** Tags for categorization */
  tags: string[];
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  /** Success status */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Metrics before optimization */
  before: Record<string, number>;

  /** Metrics after optimization */
  after: Record<string, number>;

  /** Calculated improvements */
  improvements: Record<string, number>;

  /** Additional data */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// EXECUTION TYPES
// ============================================================================

/**
 * Optimization execution record
 */
export interface OptimizationExecution {
  /** Execution ID (auto-generated) */
  id: string;

  /** Trigger that fired */
  triggerId: string;

  /** Optimization that was executed */
  optimizationId: string;

  /** Status */
  status: OptimizationStatus;

  /** Timestamp when triggered */
  triggeredAt: number;

  /** Timestamp when completed */
  completedAt?: number;

  /** Execution duration (milliseconds) */
  duration?: number;

  /** Result data */
  result?: OptimizationResult;

  /** Whether this was rolled back */
  rolledBack: boolean;

  /** Rollback timestamp */
  rolledBackAt?: number;

  /** Effectiveness score (0-100) */
  effectiveness?: number;
}

/**
 * Trigger history entry
 */
export interface TriggerHistory {
  /** Trigger ID */
  triggerId: string;

  /** Timestamp */
  timestamp: number;

  /** Metric values that caused trigger */
  metricValues: Record<string, number>;

  /** Execution ID */
  executionId: string;
}

// ============================================================================
// RULE ENGINE TYPES
// ============================================================================

/**
 * Rule validation result
 */
export interface RuleValidation {
  /** Is rule valid */
  valid: boolean;

  /** Validation errors */
  errors: string[];

  /** Validation warnings */
  warnings: string[];
}

/**
 * Rule statistics
 */
export interface RuleStatistics {
  /** Number of times triggered */
  triggerCount: number;

  /** Last triggered timestamp */
  lastTriggered?: number;

  /** Average effectiveness (0-100) */
  avgEffectiveness: number;

  /** Success rate (0-1) */
  successRate: number;

  /** Total optimizations run */
  totalExecutions: number;

  /** Successful executions */
  successfulExecutions: number;

  /** Failed executions */
  failedExecutions: number;

  /** Rolled back executions */
  rolledBackExecutions: number;
}

// ============================================================================
// SYSTEM STATE
// ============================================================================

/**
 * Optimization engine state
 */
export interface OptimizationEngineState {
  /** Is engine running */
  running: boolean;

  /** Registered triggers */
  triggers: OptimizationTrigger[];

  /** Registered optimizations */
  optimizations: Optimization[];

  /** Execution history */
  executions: OptimizationExecution[];

  /** Trigger history */
  triggerHistory: TriggerHistory[];

  /** Rule statistics */
  statistics: Record<string, RuleStatistics>;

  /** Last evaluation timestamp */
  lastEvaluation?: number;

  /** Configuration */
  config: OptimizationConfig;
}

/**
 * Optimization engine configuration
 */
export interface OptimizationConfig {
  /** Evaluation interval (milliseconds) */
  evaluationInterval: number;

  /** Maximum concurrent optimizations */
  maxConcurrentOptimizations: number;

  /** Automatic rollback threshold (effectiveness below this triggers rollback) */
  autoRollbackThreshold: number;

  /** Keep execution history for this long (milliseconds) */
  historyRetention: number;

  /** Enable automatic optimizations */
  autoOptimize: boolean;

  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'none';
}

// ============================================================================
// PRESET DEFINITIONS
// ============================================================================

/**
 * Built-in trigger presets
 */
export const BUILT_IN_TRIGGERS: Omit<OptimizationTrigger, 'id' | 'enabled'>[] = [
  {
    name: 'High Memory Usage',
    description: 'Triggers cache cleanup when memory usage exceeds threshold',
    conditions: [
      { metric: 'memory-used', operator: '>', threshold: 500, duration: 30000 }, // >500MB for 30s
    ],
    optimizationId: 'cache-cleanup',
    priority: 'high',
    cooldown: 60000, // 1 minute
  },
  {
    name: 'Critical Memory Usage',
    description: 'Aggressive cleanup when memory is critically high',
    conditions: [
      { metric: 'memory-used', operator: '>', threshold: 1000, duration: 10000 }, // >1GB for 10s
    ],
    optimizationId: 'aggressive-cleanup',
    priority: 'critical',
    cooldown: 30000, // 30 seconds
  },
  {
    name: 'Slow API Calls',
    description: 'Enable caching when API calls are slow',
    conditions: [
      { metric: 'api-duration', operator: '>', threshold: 2000, duration: 60000 }, // >2s for 1m
    ],
    optimizationId: 'enable-caching',
    priority: 'medium',
    cooldown: 300000, // 5 minutes
  },
  {
    name: 'High API Failure Rate',
    description: 'Enable circuit breakers when many APIs fail',
    conditions: [
      { metric: 'api-failure-rate', operator: '>', threshold: 0.5, duration: 30000 }, // >50% for 30s
    ],
    optimizationId: 'enable-circuit-breaker',
    priority: 'high',
    cooldown: 120000, // 2 minutes
  },
  {
    name: 'Low Cache Hit Rate',
    description: 'Preload common data when cache hit rate is low',
    conditions: [
      { metric: 'cache-hit-rate', operator: '<', threshold: 0.3, duration: 120000 }, // <30% for 2m
    ],
    optimizationId: 'preload-cache',
    priority: 'low',
    cooldown: 600000, // 10 minutes
  },
  {
    name: 'Long Render Times',
    description: 'Enable virtualization when render times are long',
    conditions: [
      { metric: 'render-duration', operator: '>', threshold: 100, duration: 30000 }, // >100ms for 30s
    ],
    optimizationId: 'enable-virtualization',
    priority: 'medium',
    cooldown: 300000, // 5 minutes
  },
  {
    name: 'Many Long Tasks',
    description: 'Reduce update frequency when many long tasks detected',
    conditions: [
      { metric: 'long-tasks', operator: '>', threshold: 10, duration: 30000 }, // >10 tasks in 30s
    ],
    optimizationId: 'reduce-polling',
    priority: 'high',
    cooldown: 180000, // 3 minutes
  },
  {
    name: 'High Error Count',
    description: 'Enable defensive mode when many errors occur',
    conditions: [
      { metric: 'error-count', operator: '>', threshold: 50, duration: 60000 }, // >50 errors in 1m
    ],
    optimizationId: 'enable-defensive-mode',
    priority: 'critical',
    cooldown: 120000, // 2 minutes
  },
  {
    name: 'Storage Almost Full',
    description: 'Trigger cleanup when storage is nearly full',
    conditions: [
      { metric: 'storage-percent', operator: '>', threshold: 90, duration: 10000 }, // >90% for 10s
    ],
    optimizationId: 'storage-cleanup',
    priority: 'critical',
    cooldown: 60000, // 1 minute
  },
];

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: OptimizationConfig = {
  evaluationInterval: 30000, // 30 seconds
  maxConcurrentOptimizations: 3,
  autoRollbackThreshold: 30, // Effectiveness < 30 triggers rollback
  historyRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
  autoOptimize: true,
  logLevel: 'info',
};
