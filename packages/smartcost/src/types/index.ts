/**
 * SmartCost - Type Definitions
 *
 * Complete type system for AI cost optimization engine
 */

// ============================================================================
// CORE CONFIGURATION TYPES
// ============================================================================

/**
 * Main SmartCost configuration
 */
export interface SmartCostConfig {
  /** Monthly budget in USD (default: 500) */
  monthlyBudget?: number;

  /** Alert threshold percentage (0-1, default: 0.8) */
  alertThreshold?: number;

  /** Caching strategy (default: 'semantic') */
  cacheStrategy?: CacheStrategy;

  /** Routing strategy (default: 'cost-optimized') */
  routingStrategy?: RoutingStrategy;

  /** Provider configurations */
  providers?: ProviderConfig[];

  /** Cache configuration */
  cache?: CacheConfig;

  /** Budget enforcement configuration */
  budget?: BudgetConfig;

  /** Analytics configuration */
  analytics?: AnalyticsConfig;

  /** Enable real-time monitoring */
  enableMonitoring?: boolean;
}

/**
 * Cache strategy types
 */
export type CacheStrategy =
  | 'semantic'      // Vector-based semantic caching
  | 'exact'         // Exact string matching
  | 'hybrid'        // Combination of semantic and exact
  | 'disabled';     // No caching

/**
 * Routing strategy types
 */
export type RoutingStrategy =
  | 'cost-optimized'     // Always choose cheapest viable model
  | 'speed-optimized'    // Choose fastest model
  | 'quality-optimized'  // Choose highest quality model
  | 'balanced'          // Balance cost, speed, and quality
  | 'priority'          // Use priority order, fallback on error
  | 'fallback';         // Try cheaper first, fallback to expensive

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** Unique provider identifier */
  id: string;

  /** Provider type */
  type: ProviderType;

  /** Provider name */
  name: string;

  /** API key (optional, can use env vars) */
  apiKey?: string;

  /** Base URL for API calls */
  baseURL?: string;

  /** Available models */
  models: ModelConfig[];

  /** Maximum requests per minute */
  maxRequestsPerMinute?: number;

  /** Maximum tokens per minute */
  maxTokensPerMinute?: number;

  /** Enable provider for routing */
  enabled?: boolean;

  /** Provider priority (lower = higher priority) */
  priority?: number;

  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Provider types
 */
export type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'ollama'
  | 'cohere'
  | 'custom';

/**
 * Model configuration
 */
export interface ModelConfig {
  /** Model identifier (e.g., 'gpt-4', 'claude-3-opus') */
  id: string;

  /** Model name */
  name: string;

  /** Maximum context window */
  maxTokens: number;

  /** Cost per million input tokens */
  inputCostPerMillion: number;

  /** Cost per million output tokens */
  outputCostPerMillion: number;

  /** Average latency in ms */
  avgLatency?: number;

  /** Quality score (0-1, subjective) */
  qualityScore?: number;

  /** Enable model for routing */
  enabled?: boolean;

  /** Model capabilities */
  capabilities?: ModelCapabilities;
}

/**
 * Model capabilities
 */
export interface ModelCapabilities {
  /** Supports function calling */
  functionCalling?: boolean;

  /** Supports streaming */
  streaming?: boolean;

  /** Supports vision/multimodal */
  vision?: boolean;

  /** Maximum output tokens */
  maxOutputTokens?: number;

  /** Best use cases */
  bestFor?: string[];
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Maximum cache size in MB (default: 100) */
  maxSize?: number;

  /** Cache TTL in seconds (default: 86400 = 1 day) */
  ttl?: number;

  /** Semantic similarity threshold (0-1, default: 0.85) */
  similarityThreshold?: number;

  /** Enable cache compression */
  enableCompression?: boolean;

  /** Cache storage backend */
  storage?: 'memory' | 'indexeddb' | 'redis';
}

/**
 * Budget configuration
 */
export interface BudgetConfig {
  /** Monthly budget in USD */
  monthlyLimit: number;

  /** Alert threshold percentage (0-1) */
  alertThreshold: number;

  /** Throttle threshold percentage (0-1) */
  throttleThreshold?: number;

  /** Hard deny threshold percentage (0-1) */
  denyThreshold?: number;

  /** Reset strategy */
  resetStrategy?: 'monthly' | 'weekly' | 'daily';

  /** Budget reset day (for weekly) */
  resetDay?: number;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  /** Enable analytics collection */
  enabled?: boolean;

  /** Sample rate (0-1) */
  sampleRate?: number;

  /** Analytics provider */
  provider?: 'internal' | 'custom';

  /** Custom analytics handler */
  handler?: (event: AnalyticsEvent) => void;
}

// ============================================================================
// COST TRACKING TYPES
// ============================================================================

/**
 * Cost tracking record
 */
export interface CostRecord {
  /** Unique request ID */
  requestId: string;

  /** Timestamp */
  timestamp: number;

  /** Provider used */
  provider: string;

  /** Model used */
  model: string;

  /** Token usage */
  tokens: TokenUsage;

  /** Cost breakdown */
  cost: CostBreakdown;

  /** Request duration in ms */
  duration: number;

  /** Whether request was cached */
  cached: boolean;

  /** Cache hit type */
  cacheHitType?: 'semantic' | 'exact' | 'none';

  /** Query complexity score (0-1) */
  queryComplexity?: number;

  /** Routing decision */
  routingDecision?: RoutingDecision;
}

/**
 * Token usage
 */
export interface TokenUsage {
  /** Input tokens */
  input: number;

  /** Output tokens */
  output: number;

  /** Total tokens */
  total: number;

  /** Estimated input tokens (before request) */
  estimatedInput?: number;

  /** Cached tokens (from prompt caching) */
  cached?: number;
}

/**
 * Cost breakdown
 */
export interface CostBreakdown {
  /** Input token cost */
  inputCost: number;

  /** Output token cost */
  outputCost: number;

  /** Total cost */
  totalCost: number;

  /** Original cost without optimization */
  originalCost?: number;

  /** Savings amount */
  savings?: number;

  /** Savings percentage */
  savingsPercent?: number;
}

/**
 * Cost metrics summary
 */
export interface CostMetrics {
  /** Total cost this period */
  totalCost: number;

  /** Total tokens used */
  totalTokens: number;

  /** Total requests */
  totalRequests: number;

  /** Cache hit rate */
  cacheHitRate: number;

  /** Total savings */
  totalSavings: number;

  /** Savings percentage */
  savingsPercent: number;

  /** Average cost per request */
  avgCostPerRequest: number;

  /** Average tokens per request */
  avgTokensPerRequest: number;

  /** Cost by provider */
  costByProvider: Record<string, number>;

  /** Cost by model */
  costByModel: Record<string, number>;

  /** Requests by provider */
  requestsByProvider: Record<string, number>;

  /** Budget utilization */
  budgetUtilization: number;

  /** Period start timestamp */
  periodStart: number;

  /** Period end timestamp */
  periodEnd: number;
}

// ============================================================================
// ROUTING TYPES
// ============================================================================

/**
 * Routing decision
 */
export interface RoutingDecision {
  /** Selected provider */
  provider: string;

  /** Selected model */
  model: string;

  /** Routing strategy used */
  strategy: RoutingStrategy;

  /** Confidence score (0-1) */
  confidence: number;

  /** Reasoning for decision */
  reasoning: string;

  /** Estimated cost */
  estimatedCost: number;

  /** Estimated latency */
  estimatedLatency: number;

  /** Quality score */
  qualityScore: number;

  /** Alternative options considered */
  alternatives?: RoutingAlternative[];
}

/**
 * Routing alternative
 */
export interface RoutingAlternative {
  /** Provider */
  provider: string;

  /** Model */
  model: string;

  /** Estimated cost */
  estimatedCost: number;

  /** Estimated latency */
  estimatedLatency: number;

  /** Quality score */
  qualityScore: number;

  /** Why not selected */
  reason: string;
}

/**
 * Query analysis result
 */
export interface QueryAnalysis {
  /** Query complexity score (0-1) */
  complexity: number;

  /** Required capabilities */
  requiredCapabilities: string[];

  /** Estimated input tokens */
  estimatedTokens: number;

  /** Expected output tokens */
  expectedOutputTokens: number;

  /** Suggested provider */
  suggestedProvider?: string;

  /** Suggested model */
  suggestedModel?: string;

  /** Reasoning */
  reasoning: string;
}

// ============================================================================
// CACHE TYPES
// ============================================================================

/**
 * Cache entry
 */
export interface CacheEntry {
  /** Cache key */
  key: string;

  /** Request payload */
  request: any;

  /** Response content */
  response: any;

  /** Provider used */
  provider: string;

  /** Model used */
  model: string;

  /** Token usage */
  tokens: TokenUsage;

  /** Cost */
  cost: number;

  /** Creation timestamp */
  createdAt: number;

  /** Last access timestamp */
  lastAccessed: number;

  /** Access count */
  accessCount: number;

  /** TTL in seconds */
  ttl: number;

  /** Vector embedding (for semantic cache) */
  embedding?: Float32Array;

  /** Similarity score (when retrieved) */
  similarity?: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total entries */
  totalEntries: number;

  /** Total size in bytes */
  totalSize: number;

  /** Hit rate */
  hitRate: number;

  /** Total hits */
  totalHits: number;

  /** Total misses */
  totalMisses: number;

  /** Semantic hits */
  semanticHits: number;

  /** Exact hits */
  exactHits: number;

  /** Total savings */
  totalSavings: number;

  /** Average similarity score */
  avgSimilarity: number;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  /** Event type */
  type: AnalyticsEventType;

  /** Timestamp */
  timestamp: number;

  /** Event data */
  data: Record<string, any>;
}

/**
 * Analytics event types
 */
export type AnalyticsEventType =
  | 'request_start'
  | 'request_complete'
  | 'request_error'
  | 'cache_hit'
  | 'cache_miss'
  | 'budget_alert'
  | 'routing_decision'
  | 'cost_update';

/**
 * Analytics report
 */
export interface AnalyticsReport {
  /** Report period */
  period: {
    start: number;
    end: number;
  };

  /** Cost metrics */
  costMetrics: CostMetrics;

  /** Cache statistics */
  cacheStats: CacheStats;

  /** Routing statistics */
  routingStats: RoutingStats;

  /** Performance metrics */
  performanceMetrics: PerformanceMetrics;

  /** Top providers by usage */
  topProviders: ProviderUsage[];

  /** Top models by usage */
  topModels: ModelUsage[];
}

/**
 * Routing statistics
 */
export interface RoutingStats {
  /** Total routing decisions */
  totalDecisions: number;

  /** Decisions by strategy */
  decisionsByStrategy: Record<RoutingStrategy, number>;

  /** Most common provider */
  mostCommonProvider: string;

  /** Most common model */
  mostCommonModel: string;

  /** Average confidence score */
  avgConfidence: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Average request latency */
  avgLatency: number;

  /** P50 latency */
  p50Latency: number;

  /** P95 latency */
  p95Latency: number;

  /** P99 latency */
  p99Latency: number;

  /** Throughput (requests/second) */
  throughput: number;
}

/**
 * Provider usage
 */
export interface ProviderUsage {
  /** Provider ID */
  provider: string;

  /** Request count */
  requestCount: number;

  /** Total cost */
  totalCost: number;

  /** Average cost per request */
  avgCostPerRequest: number;

  /** Usage percentage */
  usagePercent: number;
}

/**
 * Model usage
 */
export interface ModelUsage {
  /** Model ID */
  model: string;

  /** Request count */
  requestCount: number;

  /** Total cost */
  totalCost: number;

  /** Average cost per request */
  avgCostPerRequest: number;

  /** Usage percentage */
  usagePercent: number;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Chat completion request
 */
export interface ChatCompletionRequest {
  /** Model to use */
  model?: string;

  /** Messages */
  messages: ChatMessage[];

  /** Temperature (0-1) */
  temperature?: number;

  /** Maximum tokens */
  maxTokens?: number;

  /** Top P (0-1) */
  topP?: number;

  /** Stream response */
  stream?: boolean;

  /** Functions to call */
  functions?: FunctionDefinition[];

  /** Function call behavior */
  functionCall?: 'auto' | 'none' | { name: string };

  /** Stop sequences */
  stop?: string | string[];
}

/**
 * Chat message
 */
export interface ChatMessage {
  /** Role */
  role: 'system' | 'user' | 'assistant';

  /** Content */
  content: string;

  /** Name (optional) */
  name?: string;

  /** Function call (optional) */
  functionCall?: any;
}

/**
 * Function definition
 */
export interface FunctionDefinition {
  /** Function name */
  name: string;

  /** Function description */
  description?: string;

  /** Function parameters */
  parameters?: Record<string, any>;
}

/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
  /** Response content */
  content: string;

  /** Model used */
  model: string;

  /** Provider used */
  provider: string;

  /** Token usage */
  tokens: TokenUsage;

  /** Cost breakdown */
  cost: CostBreakdown;

  /** Request duration in ms */
  duration: number;

  /** Finish reason */
  finishReason: string;

  /** Whether response was cached */
  cached: boolean;

  /** Cache similarity score */
  cacheSimilarity?: number;

  /** Routing decision */
  routingDecision: RoutingDecision;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * SmartCost error base
 */
export class SmartCostError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SmartCostError';
  }
}

/**
 * Budget exceeded error
 */
export class BudgetExceededError extends SmartCostError {
  constructor(budgetUsed: number, budgetLimit: number) {
    super(
      `Budget exceeded: ${Math.round(budgetUsed * 100)}% of $${budgetLimit} used`,
      'BUDGET_EXCEEDED',
      { budgetUsed, budgetLimit }
    );
    this.name = 'BudgetExceededError';
  }
}

/**
 * Provider unavailable error
 */
export class ProviderUnavailableError extends SmartCostError {
  constructor(provider: string, reason?: string) {
    super(
      `Provider unavailable: ${provider}${reason ? ` - ${reason}` : ''}`,
      'PROVIDER_UNAVAILABLE',
      { provider }
    );
    this.name = 'ProviderUnavailableError';
  }
}

/**
 * Routing error
 */
export class RoutingError extends SmartCostError {
  constructor(message: string, details?: any) {
    super(message, 'ROUTING_ERROR', details);
    this.name = 'RoutingError';
  }
}

/**
 * Cache error
 */
export class CacheError extends SmartCostError {
  constructor(message: string, details?: any) {
    super(message, 'CACHE_ERROR', details);
    this.name = 'CacheError';
  }
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * SmartCost event types
 */
export type SmartCostEventType =
  | 'costUpdate'
  | 'budgetAlert'
  | 'cacheHit'
  | 'cacheMiss'
  | 'routingDecision'
  | 'requestStart'
  | 'requestComplete'
  | 'requestError';

/**
 * Cost update event
 */
export interface CostUpdateEvent {
  /** Current total cost */
  totalCost: number;

  /** Budget utilization */
  budgetUtilization: number;

  /** Total savings */
  totalSavings: number;

  /** Savings percentage */
  savingsPercent: number;
}

/**
 * Budget alert event
 */
export interface BudgetAlertEvent {
  /** Alert level */
  level: 'warning' | 'critical' | 'exceeded';

  /** Budget utilization */
  utilization: number;

  /** Remaining budget */
  remaining: number;

  /** Recommended action */
  recommendedAction: string;
}

/**
 * Cache hit event
 */
export interface CacheHitEvent {
  /** Cache hit type */
  type: 'semantic' | 'exact';

  /** Similarity score */
  similarity: number;

  /** Savings amount */
  savings: number;

  /** Provider used originally */
  provider: string;

  /** Model used originally */
  model: string;
}

/**
 * Routing decision event
 */
export interface RoutingDecisionEvent {
  /** Selected provider */
  provider: string;

  /** Selected model */
  model: string;

  /** Strategy used */
  strategy: RoutingStrategy;

  /** Estimated cost */
  estimatedCost: number;

  /** Reasoning */
  reasoning: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Deep partial type (makes all nested properties optional)
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Provider state
 */
export interface ProviderState {
  /** Provider ID */
  id: string;

  /** Whether provider is available */
  available: boolean;

  /** Current request count */
  requestCount: number;

  /** Current token count */
  tokenCount: number;

  /** Last reset timestamp */
  lastReset: number;

  /** Error count */
  errorCount: number;

  /** Average latency */
  avgLatency: number;
}

/**
 * Budget state
 */
export interface BudgetState {
  /** Total budget */
  total: number;

  /** Used amount */
  used: number;

  /** Remaining amount */
  remaining: number;

  /** Utilization percentage */
  utilization: number;

  /** Period start */
  periodStart: number;

  /** Period end */
  periodEnd: number;

  /** Alert threshold */
  alertThreshold: number;

  /** Whether alert has been triggered */
  alertTriggered: boolean;
}
