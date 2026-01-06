/**
 * Spreader Agent - Main Export
 *
 * Context window management and parallel conversation spreading.
 */

// Core functionality
export { spreaderHandler, createInitialSpreaderState } from './spreader-agent'
export { generateSchema, generateChildSummary } from './schema'
export {
  spreadConversations,
  mergeChildConversation,
  parseSpreadCommand,
  parseMergeCommand,
  isSpreadCommand,
  isMergeCommand,
  openChildConversation
} from './spread-commands'

// DAG Task System
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
} from './dag'

// Types
export type {
  SpreaderState,
  SessionSchema,
  ChildConversation,
  SpreadRequest,
  SpreadResult,
  MergeRequest,
  MergeResult,
  ContextMetrics,
  SpreaderHandlerContext,
  SpreaderHandlerResponse
} from './types'

export type {
  DAGNode,
  DAGEdge,
  DAGGraph,
  DAGExecutionPlan,
  DAGExecutionState,
  DAGNodeStatus,
  DAGValidationResult
} from './dag'
