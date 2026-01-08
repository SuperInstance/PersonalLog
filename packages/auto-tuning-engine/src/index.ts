/**
 * Auto-Tuning Engine
 *
 * Adaptive optimization system that monitors performance, detects
 * optimization opportunities, and applies improvements automatically.
 *
 * @example
 * ```ts
 * import { autoTuner } from '@superinstance/auto-tuning-engine';
 *
 * // Monitor current performance
 * const metrics = await autoTuner.monitor();
 *
 * // Detect optimization opportunities
 * const opportunities = await autoTuner.detectOpportunities();
 *
 * // Apply optimization with rollback safety
 * if (opportunities.length > 0) {
 *   const result = await autoTuner.apply(opportunities[0]);
 *   console.log('Optimization applied:', result.success);
 * }
 *
 * // Measure effectiveness
 * const effectiveness = await autoTuner.measure(optimizationId);
 * console.log('Improvement:', effectiveness?.improvement);
 * ```
 */

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
// TYPES
// ============================================================================

export type {
  OptimizationTarget,
  OptimizationCategory,
  MetricReading,
  PerformanceSnapshot,
  PerformanceIssue,
  OptimizationRecord,
  OptimizationStatus,
  ConfigChange,
} from './types';
