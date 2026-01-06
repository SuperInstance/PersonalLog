/**
 * DAG Task System - Main Export
 *
 * Intelligent orchestration of parallel conversations with dependencies.
 */

// DAG types and validation
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
