/**
 * A/B Testing Framework - Public API
 *
 * Comprehensive A/B testing system with:
 * - Experiment management
 * - User assignment (consistent hashing + bandit)
 * - Metrics tracking
 * - Bayesian statistical analysis
 * - React integration
 */

// Types
export type {
  // Core types
  Experiment,
  Variant,
  Metric,
  MetricValue,

  // Statistics
  MetricStatistics,
  VariantStats,
  ExperimentResults,
  PosteriorParameters,
  BanditState,

  // Assignment
  UserAssignment,

  // Configuration
  ExperimentConfig,
  ExperimentType,
  ExperimentStatus,
  MetricType,
  GoalDirection,
  PrimaryObjective,

  // Events
  ExperimentEvent,
  ExperimentEventType,
  ExperimentEventListener,

  // Interfaces
  IExperimentManager,
} from './types';

// Manager
export {
  ExperimentManager,
  getGlobalManager,
  resetGlobalManager,
  initializeExperiments,
} from './manager';

// Assignment engine
export { AssignmentEngine } from './assignment';

// Metrics tracker
export { MetricsTracker } from './metrics';

// Statistical analyzer
export { StatisticalAnalyzer } from './statistics';

// Multi-armed bandit
export {
  MultiArmedBandit,
  compareBanditAlgorithms,
  recommendBanditAlgorithm,
} from './multi-armed-bandit';
export type {
  BanditAlgorithm,
  BanditConfig,
  BanditArm,
  BanditSelection,
} from './multi-armed-bandit';

// React hooks
export {
  useVariant,
  useIsVariant,
  useMetricTracker,
  useBinaryMetric,
  useDurationMetric,
  useExperimentResults,
  useExperiment,
  useCreateExperiment,
  useExposeVariant,
} from './hooks';

// Convenience functions
export {
  createExperiment,
  getVariant,
  trackMetric,
  trackSuccess,
  trackDuration,
  getResults,
  startExperiment,
  pauseExperiment,
  completeExperiment,
} from './api';

/**
 * Create a new experiment
 */
import { createExperiment } from './api';

/**
 * Get variant assignment for user
 */
import { getVariant } from './api';

/**
 * Track metric value
 */
import { trackMetric } from './api';

/**
 * Get experiment results
 */
import { getResults } from './api';

// Configuration and templates
export {
  calculateSampleSize,
  SAMPLE_SIZE_CALCULATORS,
  EXPERIMENT_TEMPLATES,
  initializeExampleExperiments,
  getExperimentTemplates,
  getExperimentTemplate,
  calculateTemplateSampleSize,
} from './config';

export type { SampleSizeParams, SampleSizeResult } from './config';

// Default configuration
export const DEFAULT_CONFIG = {
  enabled: true,
  defaultConfidenceThreshold: 0.95,
  defaultMinSampleSize: 100,
  defaultTrafficAllocation: 1.0,
  earlyStoppingByDefault: true,
  banditByDefault: true,
  storageKey: 'personallog-experiments',
  persistAssignments: true,
  trackMetrics: true,
  debug: false,
  assignmentSalt: 'personallog-ab-salt',
} as const;

// ============================================================================
// CONVENIENCE ALIASES FOR TEST COMPATIBILITY
// ============================================================================

/**
 * Alias for getGlobalManager - for test compatibility
 */
export { getGlobalManager as getExperimentsManager } from './manager';

