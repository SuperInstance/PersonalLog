/**
 * SmartCost - Main Export
 *
 * AI cost optimizer that saves 50-90% on LLM API costs
 */

// ============================================================================
// MAIN EXPORTS
// ============================================================================

export { SmartCost, createSmartCost } from './core/smartcost.js';

// ============================================================================
// CORE COMPONENTS
// ============================================================================

export { CostTracker } from './core/cost-tracker.js';
export { IntelligentRouter } from './core/router.js';
export { SemanticCache } from './cache/semantic-cache.js';

// ============================================================================
// PROVIDERS
// ============================================================================

export {
  OpenAIProvider,
  DEFAULT_OPENAI_MODELS,
  createOpenAIConfig,
} from './providers/openai.js';

export {
  AnthropicProvider,
  DEFAULT_ANTHROPIC_MODELS,
  createAnthropicConfig,
} from './providers/anthropic.js';

export {
  OllamaProvider,
  DEFAULT_OLLAMA_MODELS,
  createOllamaConfig,
} from './providers/ollama.js';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  // Configuration
  SmartCostConfig,
  ProviderConfig,
  ModelConfig,
  CacheConfig,
  BudgetConfig,
  AnalyticsConfig,

  // Strategies
  CacheStrategy,
  RoutingStrategy,
  ProviderType,

  // Cost tracking
  CostRecord,
  CostMetrics,
  CostBreakdown,
  TokenUsage,
  BudgetState,

  // Routing
  RoutingDecision,
  RoutingAlternative,
  QueryAnalysis,

  // Cache
  CacheEntry,
  CacheStats,

  // Analytics
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsReport,
  RoutingStats,
  PerformanceMetrics,
  ProviderUsage,
  ModelUsage,

  // Requests/Responses
  ChatCompletionRequest,
  ChatMessage,
  FunctionDefinition,
  ChatCompletionResponse,

  // Events
  SmartCostEventType,
  CostUpdateEvent,
  BudgetAlertEvent,
  CacheHitEvent,
  RoutingDecisionEvent,

  // State
  ProviderState,

  // Utility
  DeepPartial,
} from './types/index.js';

// ============================================================================
// ERROR EXPORTS
// ============================================================================

export {
  SmartCostError,
  BudgetExceededError,
  ProviderUnavailableError,
  RoutingError,
  CacheError,
} from './types/index.js';
