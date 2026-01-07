/**
 * DAG Task System - Main Export
 *
 * Intelligent orchestration of parallel conversations with dependencies.
 */

// DAG types and validation (from spreader)
export {
  createEmptyDAG,
  createDAGNode,
  addNode,
  removeNode,
  addEdge,
  removeEdge,
  validateDAG,
  detectCycles,
  topologicalSort,
  createExecutionPlan,
  calculateCriticalPath,
  getExecutableTasks,
  getAllDependencies,
  getDependents,
  serializeDAG,
  deserializeDAG,
  getDAGStatistics
} from '../spreader/dag'

export type {
  DAGNode,
  DAGEdge,
  DAGGraph,
  DAGExecutionPlan,
  DAGExecutionState,
  DAGNodeStatus,
  DAGValidationResult
} from '../spreader/dag'

// DAG execution
export {
  DAGExecutor,
  DefaultTaskExecutor,
  createDAGExecutor,
  executeDAG,
  executeDAGWithProgress
} from './dag-executor'

export type {
  TaskExecutor,
  DAGExecutorConfig,
  DAGExecutionProgress,
  DAGExecutionResult
} from './dag-executor'

// Error handling
export {
  DAGErrorHandler,
  createErrorHandler,
  categorizeError,
  calculateRetryDelay,
  createRetryState,
  updateRetryState,
  shouldRetry,
  sleep,
  aggregateErrors,
  formatErrorForUser,
  formatErrorReportForUser,
  analyzePartialSuccess,
  DEFAULT_RETRY_POLICY,
  AGGRESSIVE_RETRY_POLICY,
  CONSERVATIVE_RETRY_POLICY
} from './error-handler'

export type {
  ErrorCategory,
  DAGTaskError,
  TransientError,
  PermanentError,
  UserActionError,
  ErrorInfo,
  ErrorReport,
  RetryPolicy,
  RetryState,
  ErrorHandlerConfig,
  PartialSuccessResult
} from './error-handler'

// DAG builder
export {
  DAGBuilder,
  buildDAGFromTasks,
  createSequentialDAG,
  createParallelDAG,
  createTieredDAG,
  parseTasksFromText,
  createDAGFromText,
  exportDAGAsText,
  exportDAGAsJSON,
  importDAGFromJSON
} from './dag-builder'

export type {
  TaskDefinition,
  DAGBuildOptions,
  DAGBuildResult
} from './dag-builder'

// Spread analytics
export {
  SpreadAnalytics,
  getSpreadAnalytics,
  type SpreadEvent,
  type SpreadTask,
  type SpreadMetrics,
  type EfficiencyReport,
  type SuccessRateReport
} from './analytics'

export {
  SpreadReportGenerator,
  downloadReport,
  openHTMLReport,
  type SpreadReport,
  type ReportOptions
} from './report-generator'

export {
  formatDuration,
  formatCost,
  formatPercentage,
  calculatePercentile,
  calculateStandardDeviation,
  calculateTrend,
  aggregateEfficiencyReports,
  aggregateQualityReports,
  type EfficiencyMetrics,
  type QualityMetrics,
  type PerformanceMetrics,
  type TaskTypeMetrics,
  type TimeSeriesDataPoint,
  type ComparisonMetrics
} from './metrics'

// Auto-merge orchestration
export {
  AutoMergeOrchestrator,
  createAutoMergeOrchestrator,
  detectBestStrategy,
  DEFAULT_AUTO_MERGE_CONFIG,
} from './auto-merge-orchestrator'

export type {
  AutoMergeConfig,
  MergeProgress,
  MergeStrategy,
} from './auto-merge-orchestrator'

// DAG auto-merge integration
export {
  AutoMergeDAGExecutor,
  AutoMergeTaskExecutor,
  createAutoMergeDAGExecutor,
  executeDAGWithAutoMerge,
} from './dag-auto-merge-integration'

export type {
  AutoMergeDAGExecutorConfig,
} from './dag-auto-merge-integration'

// Context optimization
export {
  ContextOptimizerEngine,
  getContextOptimizer,
  resetContextOptimizer,
} from './context-optimizer'

export type {
  EnhancedMessageScore,
  ScoringWeights,
  TaskContextRequirements,
  ContextOptimizationResult,
  OptimizationStrategy,
  ContextOptimizerConfig,
  ContextMetrics,
} from './context-optimizer'

// Context integration
export {
  optimizeContextForSpread,
  optimizeContextAfterMerge,
  recordContextOptimization,
  getContextOptimizationStats,
} from './context-integration'

export type {
  SpreaderContextIntegration,
} from './context-integration'
