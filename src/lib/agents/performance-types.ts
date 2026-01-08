/**
 * Agent Performance Tracking Types
 *
 * Comprehensive type definitions for tracking agent performance metrics.
 * Part of the Neural MPC Phase 1: Predictive Agent Selection system.
 *
 * Privacy-First Design:
 * - No user conversation content logged
 * - Only metadata (agent ID, task type, outcome)
 * - Local storage only (no server upload)
 * - User can opt-out
 * - Clear data on request
 */

// ============================================================================
// PERFORMANCE METRICS
// ============================================================================

/**
 * Task outcome status
 */
export enum TaskOutcome {
  /** Task completed successfully */
  SUCCESS = 'success',
  /** Task completed with partial success */
  PARTIAL = 'partial',
  /** Task failed */
  FAILURE = 'failure',
  /** Task timed out */
  TIMEOUT = 'timeout',
  /** Task was cancelled */
  CANCELLED = 'cancelled',
}

/**
 * Task type classification for performance tracking
 */
export enum TaskType {
  /** Analyze content/data */
  ANALYZE = 'analyze',
  /** Generate creative content */
  GENERATE = 'generate',
  /** Retrieve information */
  RETRIEVE = 'retrieve',
  /** Automate a task */
  AUTOMATE = 'automate',
  /** Process data */
  PROCESS = 'process',
  /** Summarize content */
  SUMMARIZE = 'summarize',
  /** Custom task type */
  CUSTOM = 'custom',
}

/**
 * Error type classification for analytics
 */
export enum ErrorType {
  /** Invalid input or configuration */
  VALIDATION = 'validation',
  /** Resource not found */
  NOT_FOUND = 'not_found',
  /** Permission denied */
  PERMISSION = 'permission',
  /** Network error */
  NETWORK = 'network',
  /** Timeout */
  TIMEOUT = 'timeout',
  /** Hardware limitation */
  HARDWARE = 'hardware',
  /** Unknown/unexpected error */
  UNKNOWN = 'unknown',
}

/**
 * Performance metrics for a single agent execution
 */
export interface AgentExecutionRecord {
  /** Unique record ID */
  id: string;
  /** Agent ID that performed the task */
  agentId: string;
  /** Task type classification */
  taskType: TaskType;
  /** Task outcome */
  outcome: TaskOutcome;
  /** Execution timestamp */
  timestamp: string;
  /** Time to completion in milliseconds */
  duration: number;
  /** Error type (if failed) */
  errorType?: ErrorType;
  /** Error message (if failed, sanitized) */
  errorMessage?: string;
  /** User satisfaction rating (1-5, optional) */
  rating?: number;
  /** Whether user reused the agent (implicit satisfaction) */
  reused?: boolean;
  /** Resource usage metrics */
  resources: {
    /** CPU usage estimate (0-1) */
    cpu: number;
    /** Memory usage estimate in bytes */
    memory: number;
    /** Tokens used (if applicable) */
    tokens?: number;
  };
  /** Conversation ID (for correlation, not content) */
  conversationId: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated performance statistics for an agent
 */
export interface AgentPerformanceStats {
  /** Agent ID */
  agentId: string;
  /** Total executions tracked */
  totalExecutions: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Average execution time (ms) */
  averageDuration: number;
  /** Median execution time (ms) */
  medianDuration: number;
  /** P95 execution time (ms) */
  p95Duration: number;
  /** P99 execution time (ms) */
  p99Duration: number;
  /** Average user rating (1-5, or null if no ratings) */
  averageRating: number | null;
  /** Reuse rate (0-1, how often user reused the agent) */
  reuseRate: number;
  /** Error distribution by type */
  errorDistribution: Record<ErrorType, number>;
  /** Performance by task type */
  performanceByTask: Record<TaskType, TaskPerformance>;
  /** Last execution timestamp */
  lastExecution: string;
  /** First execution timestamp */
  firstExecution: string;
}

/**
 * Performance metrics for a specific task type
 */
export interface TaskPerformance {
  /** Task type */
  taskType: TaskType;
  /** Total executions for this task */
  totalExecutions: number;
  /** Success rate for this task (0-1) */
  successRate: number;
  /** Average duration for this task (ms) */
  averageDuration: number;
  /** Average rating for this task (1-5) */
  averageRating: number | null;
}

/**
 * Agent ranking for a specific task
 */
export interface AgentRanking {
  /** Agent ID */
  agentId: string;
  /** Rank (1 = best) */
  rank: number;
  /** Performance score (0-1, higher is better) */
  score: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Average speed score (0-1, normalized) */
  speedScore: number;
  /** User satisfaction score (0-1, normalized) */
  satisfactionScore: number;
  /** Confidence in ranking (0-1, based on data volume) */
  confidence: number;
  /** Sample size (number of executions) */
  sampleSize: number;
}

/**
 * Performance history over time
 */
export interface PerformanceHistoryPoint {
  /** Timestamp */
  timestamp: string;
  /** Success rate for this period */
  successRate: number;
  /** Average duration for this period */
  averageDuration: number;
  /** Number of executions in this period */
  executionCount: number;
}

/**
 * Performance history data
 */
export interface PerformanceHistory {
  /** Agent ID */
  agentId: string;
  /** Time series data points */
  history: PerformanceHistoryPoint[];
  /** Time window (day, week, month) */
  window: 'day' | 'week' | 'month';
}

// ============================================================================
// STORAGE TYPES
// ============================================================================

/**
 * Privacy settings for performance tracking
 */
export interface PrivacySettings {
  /** Whether performance tracking is enabled */
  enabled: boolean;
  /** Whether to log resource usage */
  logResources: boolean;
  /** Whether to log error messages */
  logErrors: boolean;
  /** Data retention period in days (0 = keep forever) */
  retentionDays: number;
  /** Last updated timestamp */
  lastUpdated: string;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  /** Total number of execution records */
  totalRecords: number;
  /** Estimated storage size in bytes */
  estimatedSizeBytes: number;
  /** Oldest record timestamp */
  oldestRecord: string | null;
  /** Newest record timestamp */
  newestRecord: string | null;
  /** Number of agents tracked */
  agentsTracked: number;
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

/**
 * Query options for performance records
 */
export interface PerformanceQueryOptions {
  /** Filter by agent ID */
  agentId?: string;
  /** Filter by task type */
  taskType?: TaskType;
  /** Filter by outcome */
  outcome?: TaskOutcome;
  /** Filter by error type */
  errorType?: ErrorType;
  /** Start time (ISO string) */
  startTime?: string;
  /** End time (ISO string) */
  endTime?: string;
  /** Minimum rating */
  minRating?: number;
  /** Maximum results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Ranking query options
 */
export interface RankingQueryOptions {
  /** Task type to rank agents for */
  taskType: TaskType;
  /** Minimum sample size (number of executions) */
  minSampleSize?: number;
  /** Maximum number of agents to return */
  limit?: number;
  /** Weight for success rate (0-1) */
  successWeight?: number;
  /** Weight for speed (0-1) */
  speedWeight?: number;
  /** Weight for satisfaction (0-1) */
  satisfactionWeight?: number;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate task type
 */
export function isValidTaskType(value: string): value is TaskType {
  return Object.values(TaskType).includes(value as TaskType);
}

/**
 * Validate task outcome
 */
export function isValidTaskOutcome(value: string): value is TaskOutcome {
  return Object.values(TaskOutcome).includes(value as TaskOutcome);
}

/**
 * Validate error type
 */
export function isValidErrorType(value: string): value is ErrorType {
  return Object.values(ErrorType).includes(value as ErrorType);
}

/**
 * Validate rating (1-5)
 */
export function isValidRating(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * Validate duration (positive number)
 */
export function isValidDuration(value: number): boolean {
  return typeof value === 'number' && value > 0 && value < Number.MAX_SAFE_INTEGER;
}

/**
 * Validate resource usage
 */
export function isValidResourceUsage(cpu: number, memory: number): boolean {
  return (
    typeof cpu === 'number' &&
    cpu >= 0 &&
    cpu <= 1 &&
    typeof memory === 'number' &&
    memory > 0 &&
    memory < Number.MAX_SAFE_INTEGER
  );
}
