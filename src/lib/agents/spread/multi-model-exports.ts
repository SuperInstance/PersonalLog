/**
 * Multi-Model Spreading System - Exports
 *
 * Exports for the intelligent model selection and spreading system.
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type {
  ModelCapabilities,
  AIModel,
  TaskRequirements,
  UserPreferences,
  CostEstimate,
  CostComparison,
  SpreadTaskWithModel,
  MultiModelSpreadResult,
  ModelRecommendation,
  PerformanceRecord,
  AveragePerformance,
  TaskAnalysisContext
} from './types'

// ============================================================================
// MODEL CATALOG
// ============================================================================

export {
  AVAILABLE_MODELS,
  getModelById,
  getModelsByProvider,
  modelsWithCapability,
  getModelsByCost,
  getModelsBySpeed,
  getModelsByQuality,
  getFreeModels,
  modelsWithContext,
  MODEL_CATALOG_STATS
} from './model-catalog'

// ============================================================================
// MODEL MATCHING
// ============================================================================

export {
  analyzeTask,
  analyzeTasks,
  generateRecommendation,
  optimizeTaskModelAssignment
} from './model-matcher'

// ============================================================================
// MULTI-MODEL SYSTEM
// ============================================================================

export {
  ModelSelector,
  ModelCostEstimator,
  ModelPerformanceTracker,
  getModelSelector,
  getModelCostEstimator,
  getModelPerformanceTracker
} from './multi-model'

export type {
  PerformanceRecord as ModelPerformanceRecord,
  AveragePerformance as ModelAveragePerformance
} from './multi-model'

// ============================================================================
// MULTI-MODEL SPREADING
// ============================================================================

export {
  MultiModelSpreader,
  spreadConversationsWithMultiModel,
  parseSpreadCommandWithHints,
  getMultiModelSpreader
} from './multi-model-spread'
