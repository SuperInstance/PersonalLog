/**
 * A/B Testing Framework Types
 *
 * Provides comprehensive type definitions for running A/B experiments
 * with Bayesian statistical analysis and multi-armed bandit optimization.
 */

/**
 * Experiment status
 */
export type ExperimentStatus =
  | 'draft'       // Experiment created but not started
  | 'running'     // Experiment is active and collecting data
  | 'paused'      // Experiment temporarily paused
  | 'completed'   // Experiment finished with winner determined
  | 'archived';   // Experiment archived for reference

/**
 * Experiment type categories
 */
export type ExperimentType =
  | 'ui'           // UI/UX experiments (layouts, colors, placement)
  | 'performance'  // Performance experiments (batching, caching, thresholds)
  | 'ai'          // AI/ML experiments (temperature, prompts, models)
  | 'algorithm'   // Algorithm experiments (sorting, searching, ranking)
  | 'content';    // Content experiments (copy, media, formatting)

/**
 * Metric types
 */
export type MetricType =
  | 'binary'       // 0 or 1 (success/failure)
  | 'count'        // Non-negative integers (clicks, views)
  | 'duration'     // Time in milliseconds
  | 'ratio'        // 0-1 range (engagement rate)
  | 'numeric';     // Any numeric value

/**
 * Goal direction for metrics
 */
export type GoalDirection = 'minimize' | 'maximize';

/**
 * Primary objective for experiment
 */
export type PrimaryObjective =
  | 'conversion'     // Maximize conversion rate
  | 'engagement'     // Maximize user engagement
  | 'retention'      // Maximize user retention
  | 'satisfaction'   // Maximize user satisfaction
  | 'performance'    // Minimize load time/latency
  | 'revenue';       // Maximize revenue

/**
 * Variant definition
 */
export interface Variant {
  /** Unique variant identifier */
  id: string;

  /** Display name */
  name: string;

  /** Variant description */
  description?: string;

  /** Traffic weight (relative, will be normalized) */
  weight: number;

  /** Configuration for this variant */
  config: Record<string, unknown>;

  /** Whether this is the control variant */
  isControl?: boolean;

  /** Custom parameters for rendering */
  parameters?: Record<string, unknown>;
}

/**
 * Metric definition
 */
export interface Metric {
  /** Unique metric identifier */
  id: string;

  /** Display name */
  name: string;

  /** Metric type */
  type: MetricType;

  /** Goal direction */
  direction: GoalDirection;

  /** Whether this is the primary metric for winner selection */
  primary: boolean;

  /** Description of what this metric measures */
  description?: string;

  /** Minimum sample size needed for significance */
  minSampleSize?: number;

  /** Statistical power (1 - beta) for sample size calculation */
  statisticalPower?: number;

  /** Minimum detectable effect (practical significance threshold) */
  minDetectableEffect?: number;
}

/**
 * Metric value
 */
export interface MetricValue {
  /** Metric ID */
  metricId: string;

  /** Value (type depends on metric type) */
  value: number;

  /** Timestamp when metric was recorded */
  timestamp: number;

  /** Optional variance for numeric metrics */
  variance?: number;

  /** Optional sample size (for aggregated metrics) */
  sampleSize?: number;

  /** Experiment ID */
  experimentId?: string;

  /** Variant ID */
  variantId?: string;

  /** User ID (for tracking individual users) */
  userId?: string;

  /** Session ID */
  sessionId?: string;

  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Experiment definition
 */
export interface Experiment {
  /** Unique experiment identifier */
  id: string;

  /** Display name */
  name: string;

  /** Experiment description */
  description: string;

  /** Experiment type */
  type: ExperimentType;

  /** Experiment status */
  status: ExperimentStatus;

  /** Variants to test */
  variants: Variant[];

  /** Metrics to track */
  metrics: Metric[];

  /** Primary objective */
  objective: PrimaryObjective;

  /** Start timestamp (null if not started) */
  startTime: number | null;

  /** End timestamp (null if not completed) */
  endTime: number | null;

  /** Planned duration in milliseconds */
  plannedDuration: number;

  /** Traffic allocation (0-1, fraction of users to include) */
  trafficAllocation: number;

  /** Target sample size per variant (calculated if not provided) */
  targetSampleSize?: number;

  /** Minimum sample size before early stopping check */
  minSampleSizeForStopping?: number;

  /** Confidence threshold for winner selection (0-1) */
  confidenceThreshold: number;

  /** Enable early stopping for clear winners */
  earlyStoppingEnabled: boolean;

  /** Enable multi-armed bandit optimization */
  banditEnabled: boolean;

  /** Bandit exploration rate (0-1) */
  banditExplorationRate?: number;

  /** Tags for filtering/searching */
  tags: string[];

  /** Target audience criteria */
  targetAudience?: {
    /** Minimum hardware score */
    minHardwareScore?: number;
    /** Maximum hardware score */
    maxHardwareScore?: number;
    /** User segments */
    segments?: string[];
    /** Exclude these user IDs */
    excludeUserIds?: string[];
  };

  /** Custom metadata */
  metadata?: Record<string, unknown>;

  /** Created timestamp */
  createdAt: number;

  /** Updated timestamp */
  updatedAt: number;
}

/**
 * User assignment
 */
export interface UserAssignment {
  /** Experiment ID */
  experimentId: string;

  /** User ID */
  userId: string;

  /** Assigned variant ID */
  variantId: string;

  /** Assignment timestamp */
  assignedAt: number;

  /** Session ID */
  sessionId: string;

  /** Whether user was exposed to the variant */
  exposed: boolean;

  /** Exposure timestamp */
  exposedAt?: number;
}

/**
 * Variant statistics
 */
export interface VariantStats {
  /** Variant ID */
  variantId: string;

  /** Total users assigned */
  totalUsers: number;

  /** Total users exposed */
  exposedUsers: number;

  /** Metric values by metric ID */
  metrics: Record<string, MetricStatistics>;

  /** Bayesian probability of being best (0-1) */
  probabilityOfBeingBest?: number;

  /** Expected improvement over baseline */
  expectedImprovement?: number;

  /** Credible interval (95%) */
  credibleInterval?: [number, number];

  /** Risk (potential loss if chosen) */
  risk?: number;
}

/**
 * Metric statistics for a variant
 */
export interface MetricStatistics {
  /** Metric ID */
  metricId: string;

  /** Sample size */
  sampleSize: number;

  /** Mean value */
  mean: number;

  /** Standard deviation */
  stdDev: number;

  /** Standard error */
  stdErr: number;

  /** Variance */
  variance: number;

  /** Min value */
  min: number;

  /** Max value */
  max: number;

  /** For binary metrics: success rate */
  successRate?: number;

  /** For count/ratio metrics: total sum */
  sum?: number;

  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * Experiment results
 */
export interface ExperimentResults {
  /** Experiment ID */
  experimentId: string;

  /** Experiment status */
  status: ExperimentStatus;

  /** Variant statistics by variant ID */
  variants: Record<string, VariantStats>;

  /** Winning variant (if determined) */
  winner?: {
    /** Variant ID */
    variantId: string;

    /** Probability of being best */
    probability: number;

    /** Expected lift over control */
    lift: number;

    /** Lift percentage */
    liftPercentage: string;

    /** Confidence level */
    confidence: string;
  };

  /** Whether experiment has significant results */
  hasSignificantResults: boolean;

  /** Total sample size across all variants */
  totalSampleSize: number;

  /** Recommended action */
  recommendation?: 'keep_winner' | 'keep_control' | 'continue_testing' | 'inconclusive';

  /** Analysis timestamp */
  analyzedAt: number;

  /** Confidence in results (0-1) */
  overallConfidence: number;
}

/**
 * Bayesian posterior parameters
 */
export interface PosteriorParameters {
  /** Alpha parameter (for Beta distribution) */
  alpha: number;

  /** Beta parameter (for Beta distribution) */
  beta: number;

  /** Mean of posterior */
  mean: number;

  /** Variance of posterior */
  variance: number;

  /** Standard deviation */
  stdDev: number;
}

/**
 * Multi-armed bandit state
 */
export interface BanditState {
  /** Experiment ID */
  experimentId: string;

  /** Counts per variant (number of pulls) */
  counts: Record<string, number>;

  /** Rewards per variant (cumulative) */
  rewards: Record<string, number>;

  /** Posterior parameters for each variant */
  posteriors: Record<string, PosteriorParameters>;

  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * Experiment configuration
 */
export interface ExperimentConfig {
  /** Whether experiments are enabled globally */
  enabled: boolean;

  /** Default confidence threshold (0-1) */
  defaultConfidenceThreshold: number;

  /** Default minimum sample size */
  defaultMinSampleSize: number;

  /** Default traffic allocation (0-1) */
  defaultTrafficAllocation: number;

  /** Whether early stopping is enabled by default */
  earlyStoppingByDefault: boolean;

  /** Whether bandit optimization is enabled by default */
  banditByDefault: boolean;

  /** Storage key for persisting assignments */
  storageKey: string;

  /** Whether to persist assignments to localStorage */
  persistAssignments: boolean;

  /** Whether to track metrics automatically */
  trackMetrics: boolean;

  /** Debug mode */
  debug: boolean;

  /** Assignment consistency salt (for hashing) */
  assignmentSalt: string;
}

/**
 * Experiment event types
 */
export type ExperimentEventType =
  | 'experiment_created'
  | 'experiment_started'
  | 'experiment_paused'
  | 'experiment_resumed'
  | 'experiment_completed'
  | 'experiment_archived'
  | 'user_assigned'
  | 'variant_exposed'
  | 'metric_recorded'
  | 'winner_determined'
  | 'bandit_updated';

/**
 * Experiment event
 */
export interface ExperimentEvent {
  /** Event type */
  type: ExperimentEventType;

  /** Experiment ID */
  experimentId: string;

  /** Timestamp */
  timestamp: number;

  /** Event data */
  data: Record<string, unknown>;

  /** User ID (if applicable) */
  userId?: string;

  /** Session ID (if applicable) */
  sessionId?: string;
}

/**
 * Event listener type
 */
export type ExperimentEventListener = (event: ExperimentEvent) => void;

/**
 * Experiment manager interface
 */
export interface IExperimentManager {
  /** Create a new experiment */
  createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): Experiment;

  /** Get experiment by ID */
  getExperiment(id: string): Experiment | undefined;

  /** Get all experiments */
  getAllExperiments(): Experiment[];

  /** Get experiments by status */
  getExperimentsByStatus(status: ExperimentStatus): Experiment[];

  /** Get experiments by type */
  getExperimentsByType(type: ExperimentType): Experiment[];

  /** Start an experiment */
  startExperiment(id: string): void;

  /** Pause an experiment */
  pauseExperiment(id: string): void;

  /** Resume an experiment */
  resumeExperiment(id: string): void;

  /** Complete an experiment */
  completeExperiment(id: string): void;

  /** Archive an experiment */
  archiveExperiment(id: string): void;

  /** Delete an experiment */
  deleteExperiment(id: string): void;

  /** Update an experiment */
  updateExperiment(id: string, updates: Partial<Experiment>): void;

  /** Assign variant to user */
  assignVariant(experimentId: string, userId: string, sessionId?: string): Variant | null;

  /** Get user's assignment */
  getAssignment(experimentId: string, userId: string): UserAssignment | undefined;

  /** Track metric value */
  trackMetric(experimentId: string, variantId: string, metricId: string, value: number, userId?: string, sessionId?: string): void;

  /** Get experiment results */
  getResults(experimentId: string): ExperimentResults | undefined;

  /** Determine winner (if applicable) */
  determineWinner(experimentId: string): ExperimentResults;

  /** Apply winner (update feature flags) */
  applyWinner(experimentId: string): void;

  /** Add event listener */
  addEventListener(type: ExperimentEventType, listener: ExperimentEventListener): void;

  /** Remove event listener */
  removeEventListener(type: ExperimentEventType, listener: ExperimentEventListener): void;

  /** Export experiments */
  exportExperiments(): string;

  /** Import experiments */
  importExperiments(data: string): void;
}
