/**
 * Auto-Optimization System
 *
 * A comprehensive system for automatically optimizing application performance
 * through continuous monitoring, analysis, and validation.
 *
 * @example
 * ```ts
 * import { createOptimizationEngine, allRules } from '@/lib/optimization';
 *
 * // Create and start engine
 * const engine = createOptimizationEngine({
 *   autoApply: false,
 *   monitorInterval: 5000,
 * });
 *
 * // Register rules
 * for (const rule of allRules) {
 *   engine.registerRule(rule);
 * }
 *
 * // Start monitoring
 * await engine.start();
 *
 * // Get suggestions
 * const suggestions = await engine.suggestOptimizations();
 *
 * // Apply optimization
 * await engine.applyOptimization('reduce-vector-batch-size');
 *
 * // Check health
 * const health = engine.getHealthStatus();
 * ```
 */

// ============================================================================
// CORE ENGINE
// ============================================================================

export {
  OptimizationEngine,
  createOptimizationEngine,
} from './engine';

// ============================================================================
// TYPES
// ============================================================================

export type {
  // Core types
  OptimizationCategory,
  OptimizationTarget,
  OptimizationPriority,
  OptimizationEffort,
  OptimizationImpact,
  OptimizationStatus,

  // Rules
  OptimizationRule,
  OptimizationCondition,
  ConfigChange,
  ValidationCriteria,

  // Candidates
  OptimizationCandidate,
  OptimizationBatch,

  // A/B Testing
  Experiment,
  ExperimentResult,
  MetricStats,

  // History
  OptimizationRecord,
  OptimizationHistory,

  // Monitoring
  MetricReading,
  PerformanceSnapshot,
  PerformanceIssue,

  // Engine
  OptimizationEngineConfig,
  OptimizationEngineState,
  OptimizationEvent,
  OptimizationEventType,

  // API Results
  OptimizationSuggestions,
  OptimizationResult,
  HealthStatus,
} from './types';

// ============================================================================
// MONITORS
// ============================================================================

export type { Monitor } from './monitors';
export {
  PerformanceMonitor,
  MemoryMonitor,
  FrameRateMonitor,
  JankMonitor,
  MonitorRegistry,
  createMonitorRegistry,
} from './monitors';

// ============================================================================
// STRATEGIES
// ============================================================================

export type { OptimizationStrategy, StrategyContext } from './strategies';
export {
  ConservativeStrategy,
  AggressiveStrategy,
  BalancedStrategy,
  ValidationStrategy,
  RollbackStrategy,
  StrategyFactory,
} from './strategies';

// ============================================================================
// VALIDATOR
// ============================================================================

export {
  Statistics,
  ExperimentManager,
  ValidationManager,
} from './validator';

// ============================================================================
// RULES
// ============================================================================

export {
  allRules,
  getRule,
  getRulesByCategory,
  getRulesByPriority,
  getRulesByTag,
  getRulesByRiskLevel,
  getAutoApplySafeRules,

  // Performance rules
  performanceRules,
  getPerformanceRule,

  // Quality rules
  qualityRules,
  getQualityRule,

  // Resource rules
  resourceRules,
  getResourceRule,
} from './rules';

// ============================================================================
// RE-EXPORTS FROM SUBMODULES
// ============================================================================

// Performance rules
export {
  reduceVectorBatchSize,
  increaseVectorBatchSize,
  enableAggressiveCaching,
  disableCaching,
  enableVirtualScrolling,
  reduceRenderComplexity,
  enableRequestBatching,
  enableRequestDeduplication,
} from './rules/performance-rules';

// Quality rules
export {
  enableRetryWithBackoff,
  enableCircuitBreaker,
  enableFeatureDegradation,
  enableTimeoutProtection,
  enableDataValidation,
  enableChecksumVerification,
  enableDetailedErrorLogging,
  enablePerformanceMonitoring,
} from './rules/quality-rules';

// Resource rules
export {
  reduceMemoryCache,
  enableMemoryCompaction,
  reduceVectorIndex,
  reduceCpuConcurrency,
  enableWorkThrottling,
  enableStorageCompression,
  enableDataPruning,
  reduceStorageBatch,
  enableBatterySaver,
  reduceBackgroundActivity,
} from './rules/resource-rules';

// ============================================================================
// AUTO-TUNER
// ============================================================================

export {
  AutoTuner,
  autoTuner,
} from './auto-tuner';

export type {
  TunableConfig,
  PerformanceMetrics as AutoTunerMetrics,
  Optimization as AutoTunerOptimization,
  OptimizationResult as AutoTunerResult,
} from './auto-tuner';

// ============================================================================
// PROFILER
// ============================================================================

export {
  PerformanceProfiler,
  APIProfiler,
  ComponentProfiler,
  CacheProfiler,
  profiler,
  apiProfiler,
  componentProfiler,
  cacheProfiler,
} from './profiler';

export type {
  ProfileResult,
  ProfilerOptions,
} from './profiler';

// ============================================================================
// CONFIG TUNER
// ============================================================================

export {
  ConfigTuner,
  configTuner,
} from './config-tuner';

export type {
  TunableParameter,
  TuningObjective,
  TuningConstraint,
  TuningResult,
} from './config-tuner';

// ============================================================================
// RECOMMENDER
// ============================================================================

export {
  Recommender,
  recommender,
} from './recommender';

export type {
  RecommendationContext,
  Recommendation,
} from './recommender';

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create optimization engine with default rules
 *
 * @param config - Engine configuration
 * @returns Configured optimization engine
 */
export function createEngineWithDefaults(
  config?: Partial<import('./types').OptimizationEngineConfig>
) {
  const { createOptimizationEngine, allRules } = require('./engine');
  const { createOptimizationEngine: createEngine } = require('./engine');

  const engine = createEngine(config);

  // Register all default rules
  for (const rule of allRules) {
    engine.registerRule(rule);
  }

  return engine;
}

/**
 * Quick start optimization system
 *
 * @example
 * ```ts
 * const { engine, stop } = await quickStart({
 *   autoApply: false,
 * });
 *
 * // Later
 * await stop();
 * ```
 */
export async function quickStart(
  config?: Partial<import('./types').OptimizationEngineConfig>
) {
  const engine = createEngineWithDefaults(config);
  await engine.start();

  return {
    engine,

    /** Stop the optimization engine */
    stop: () => engine.stop(),

    /** Get current suggestions */
    getSuggestions: () => engine.suggestOptimizations(),

    /** Apply optimization */
    optimize: (ruleId: string) => engine.applyOptimization(ruleId),

    /** Get health status */
    getHealth: () => engine.getHealthStatus(),

    /** Get history */
    getHistory: (limit?: number) => engine.getHistory(limit),
  };
}

// ============================================================================
// CONVENIENCE ALIASES FOR TEST COMPATIBILITY
// ============================================================================

/**
 * Get the global optimization engine instance
 * For test compatibility
 */
let globalEngine: import('./engine').OptimizationEngine | null = null;

export function getOptimizationEngine() {
  if (!globalEngine) {
    const { createOptimizationEngine } = require('./engine');
    globalEngine = createOptimizationEngine();
  }
  return globalEngine;
}
