/**
 * SmartCost - Main Class
 *
 * AI cost optimizer that saves 50-90% on LLM API costs through:
 * - Real-time cost tracking with <10ms overhead
 * - Intelligent routing based on query complexity
 * - Semantic caching to avoid repeat calls
 * - Provider abstraction with failover
 * - Budget enforcement and throttling
 */

import { EventEmitter } from '../utils/event-emitter.js';
import { CostTracker } from './cost-tracker.js';
import { IntelligentRouter } from './router.js';
import { SemanticCache } from '../cache/semantic-cache.js';
import { OpenAIProvider } from '../providers/openai.js';
import { AnthropicProvider } from '../providers/anthropic.js';
import { OllamaProvider } from '../providers/ollama.js';
import type {
  SmartCostConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  RoutingStrategy,
  CacheStrategy,
  ProviderConfig,
  CostMetrics,
  CacheStats,
  SmartCostEventType,
  CostUpdateEvent,
  BudgetAlertEvent,
  CacheHitEvent,
  RoutingDecisionEvent,
} from '../types/index.js';

// ============================================================================
// SMARTCOST MAIN CLASS
// ============================================================================

export class SmartCost extends EventEmitter {
  private costTracker: CostTracker;
  private router: IntelligentRouter;
  private cache: SemanticCache;
  private providers: Map<string, any> = new Map();

  private config: Required<SmartCostConfig>;
  private initialized: boolean = false;

  constructor(config: SmartCostConfig = {}) {
    super();

    // Apply defaults
    this.config = {
      monthlyBudget: config.monthlyBudget || 500,
      alertThreshold: config.alertThreshold || 0.8,
      cacheStrategy: config.cacheStrategy || 'semantic',
      routingStrategy: config.routingStrategy || 'cost-optimized',
      providers: config.providers || [],
      cache: config.cache || {},
      budget: config.budget || {
        monthlyLimit: config.monthlyBudget || 500,
        alertThreshold: config.alertThreshold || 0.8,
      },
      analytics: config.analytics || {},
      enableMonitoring: config.enableMonitoring ?? true,
    };

    // Initialize core components
    this.costTracker = new CostTracker(this.config);
    this.router = new IntelligentRouter(this.config.providers);
    this.cache = new SemanticCache(this.config.cache);

    // Setup event forwarding
    this.setupEventForwarding();
  }

  // ========================================================================
  // PUBLIC API - CHAT COMPLETIONS
  // ========================================================================

  /**
   * Create a chat completion (main entry point)
   * This is the drop-in replacement for direct API calls
   */
  public chat = {
    completions: {
      create: (
        request: ChatCompletionRequest
      ): Promise<ChatCompletionResponse> => {
        return this.createChatCompletion(request);
      },
    },
  };

  /**
   * Create streaming chat completion
   */
  public async stream(
    request: ChatCompletionRequest,
    onChunk: (chunk: string) => void
  ): Promise<ChatCompletionResponse> {
    return this.createChatCompletion(request, onChunk);
  }

  // ========================================================================
  // PUBLIC API - MONITORING & ANALYTICS
  // ========================================================================

  /**
   * Get current cost metrics
   */
  public getCostMetrics(): CostMetrics {
    return this.costTracker.getCostMetrics();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Get budget state
   */
  public getBudgetState() {
    return this.costTracker.getBudgetState();
  }

  /**
   * Get routing statistics
   */
  public getRoutingStats() {
    return this.router.getRoutingStats();
  }

  /**
   * Get all cost records
   */
  public getRecords(filter?: {
    provider?: string;
    model?: string;
    startTime?: number;
    endTime?: number;
  }) {
    return this.costTracker.getRecords(filter);
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Reset cost tracking (for new period)
   */
  public resetTracking(): void {
    this.costTracker.resetTracking();
  }

  // ========================================================================
  // PUBLIC API - EVENT HANDLERS
  // ========================================================================

  /**
   * Register event handler
   */
  public on(
    event: SmartCostEventType,
    handler: (data: any) => void
  ): this {
    return super.on(event, handler);
  }

  /**
   * Register one-time event handler
   */
  public once(
    event: SmartCostEventType,
    handler: (data: any) => void
  ): this {
    return super.once(event, handler);
  }

  /**
   * Remove event handler
   */
  public off(
    event: SmartCostEventType,
    handler: (data: any) => void
  ): this {
    return super.off(event, handler);
  }

  // ========================================================================
  // PRIVATE METHODS - REQUEST PROCESSING
  // ========================================================================

  /**
   * Create chat completion (main implementation)
   */
  private async createChatCompletion(
    request: ChatCompletionRequest,
    onChunk?: (chunk: string) => void
  ): Promise<ChatCompletionResponse> {
    // Step 1: Check cache
    const cached = await this.cache.get(request, this.config.cacheStrategy);

    if (cached) {
      // Return cached response
      const response: ChatCompletionResponse = {
        ...cached.response,
        cached: true,
        cacheSimilarity: cached.similarity,
      };

      // Record cache hit
      if (this.config.enableMonitoring) {
        this.emit('cacheHit', {
          type: cached.similarity === 1 ? 'exact' : 'semantic',
          similarity: cached.similarity || 0,
          savings: cached.entry.cost,
          provider: cached.entry.provider,
          model: cached.entry.model,
        } as CacheHitEvent);
      }

      return response;
    } else {
      if (this.config.enableMonitoring) {
        this.emit('cacheMiss', { request });
      }
    }

    // Step 2: Analyze query and make routing decision
    const routingDecision = await this.router.route(
      request,
      this.config.routingStrategy
    );

    // Emit routing decision event
    if (this.config.enableMonitoring) {
      this.emit('routingDecision', {
        provider: routingDecision.provider,
        model: routingDecision.model,
        strategy: routingDecision.strategy,
        estimatedCost: routingDecision.estimatedCost,
        reasoning: routingDecision.reasoning,
      } as RoutingDecisionEvent);
    }

    // Step 3: Get provider and model
    const provider = this.getProvider(routingDecision.provider);
    const modelConfig = this.getModelConfig(
      routingDecision.provider,
      routingDecision.model
    );

    if (!provider || !modelConfig) {
      throw new Error(
        `Provider or model not found: ${routingDecision.provider}/${routingDecision.model}`
      );
    }

    // Step 4: Estimate tokens and cost
    const estimatedInputTokens = this.estimateTokens(request);
    const estimatedOutputTokens = routingDecision.estimatedLatency > 0
      ? Math.floor(routingDecision.estimatedLatency / 2)
      : 500;

    // Step 5: Track request start (check budget)
    const trackStart = this.costTracker.trackRequestStart(
      routingDecision.provider,
      routingDecision.model,
      { input: estimatedInputTokens, output: estimatedOutputTokens },
      modelConfig.inputCostPerMillion,
      modelConfig.outputCostPerMillion
    );

    // Check budget
    if (!trackStart.budgetOk) {
      throw new Error(
        `Budget exceeded. Remaining: $${trackStart.budgetRemaining.toFixed(2)}`
      );
    }

    // Step 6: Make API call
    let response: ChatCompletionResponse;

    try {
      if (onChunk) {
        // Streaming
        response = await provider.chatStream(request, routingDecision, onChunk);
      } else {
        // Non-streaming
        response = await provider.chat(request, routingDecision);
      }

      // Update provider state
      this.router.updateProviderState(
        routingDecision.provider,
        'success',
        response.duration
      );
    } catch (error) {
      // Update provider state with error
      this.router.updateProviderState(routingDecision.provider, 'error');

      // Try fallback
      response = await this.tryFallback(
        request,
        routingDecision,
        onChunk,
        error as Error
      );
    }

    // Step 7: Track request completion
    const costBreakdown = this.costTracker.trackRequestComplete(
      trackStart.requestId,
      response.provider,
      response.model,
      response.tokens,
      modelConfig.inputCostPerMillion,
      modelConfig.outputCostPerMillion,
      response.duration,
      response.cached,
      'none'
    );

    // Step 8: Store in cache
    if (!response.cached) {
      await this.cache.set(
        request,
        response,
        response.provider,
        response.model,
        response.tokens,
        costBreakdown.totalCost
      );
    }

    return response;
  }

  /**
   * Try fallback provider on error
   */
  private async tryFallback(
    request: ChatCompletionRequest,
    originalDecision: any,
    onChunk?: (chunk: string) => void,
    error?: Error
  ): Promise<ChatCompletionResponse> {
    console.warn(
      `Primary provider failed (${originalDecision.provider}): ${error?.message}. Trying fallback...`
    );

    // Get alternative routing decisions
    const alternatives = originalDecision.alternatives || [];

    for (const alternative of alternatives) {
      try {
        const provider = this.getProvider(alternative.provider);
        if (!provider) continue;

        const modelConfig = this.getModelConfig(
          alternative.provider,
          alternative.model
        );
        if (!modelConfig) continue;

        const newDecision = {
          provider: alternative.provider,
          model: alternative.model,
          strategy: 'fallback' as const,
          confidence: 0.5,
          reasoning: `Fallback from ${originalDecision.provider}`,
          estimatedCost: alternative.estimatedCost,
          estimatedLatency: alternative.estimatedLatency,
          qualityScore: alternative.qualityScore,
          alternatives: [],
        };

        if (onChunk) {
          return await provider.chatStream(request, newDecision, onChunk);
        } else {
          return await provider.chat(request, newDecision);
        }
      } catch (fallbackError) {
        console.warn(
          `Fallback provider ${alternative.provider} also failed: ${fallbackError}`
        );
        continue;
      }
    }

    // All fallbacks failed
    throw new Error(
      `All providers failed. Last error: ${error?.message || 'Unknown error'}`
    );
  }

  // ========================================================================
  // PRIVATE METHODS - PROVIDER MANAGEMENT
  // ========================================================================

  /**
   * Get provider instance
   */
  private getProvider(providerId: string) {
    if (!this.providers.has(providerId)) {
      const providerConfig = this.config.providers.find(
        (p) => p.id === providerId
      );

      if (!providerConfig) {
        return null;
      }

      // Create provider instance
      const provider = this.createProvider(providerConfig);
      this.providers.set(providerId, provider);
    }

    return this.providers.get(providerId);
  }

  /**
   * Create provider instance from config
   */
  private createProvider(config: ProviderConfig) {
    switch (config.type) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'ollama':
        return new OllamaProvider(config);
      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }
  }

  /**
   * Get model configuration
   */
  private getModelConfig(providerId: string, modelId: string) {
    const providerConfig = this.config.providers.find(
      (p) => p.id === providerId
    );

    if (!providerConfig) return null;

    return providerConfig.models.find((m) => m.id === modelId);
  }

  /**
   * Estimate token count for request
   */
  private estimateTokens(request: ChatCompletionRequest): number {
    const totalChars = request.messages.reduce(
      (sum, m) => sum + m.content.length,
      0
    );
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(totalChars / 4);
  }

  /**
   * Setup event forwarding from components to SmartCost
   */
  private setupEventForwarding(): void {
    // Forward cost tracker events
    this.costTracker.on('costUpdate', (data: CostUpdateEvent) => {
      this.emit('costUpdate', data);
    });

    this.costTracker.on('budgetAlert', (data: BudgetAlertEvent) => {
      this.emit('budgetAlert', data);
    });

    // Note: Cache events are emitted directly in createChatCompletion
    // as they need additional context
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create SmartCost instance with default OpenAI provider
 */
export function createSmartCost(config: {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  monthlyBudget?: number;
  alertThreshold?: number;
  cacheStrategy?: CacheStrategy;
  routingStrategy?: RoutingStrategy;
} = {}): SmartCost {
  const providers: ProviderConfig[] = [];

  // Add OpenAI if API key provided
  if (config.openaiApiKey || process.env.OPENAI_API_KEY) {
    const { createOpenAIConfig } = require('../providers/openai.js');
    providers.push(createOpenAIConfig(config.openaiApiKey));
  }

  // Add Anthropic if API key provided
  if (config.anthropicApiKey || process.env.ANTHROPIC_API_KEY) {
    const { createAnthropicConfig } = require('../providers/anthropic.js');
    providers.push(createAnthropicConfig(config.anthropicApiKey));
  }

  // Add Ollama (always available if running)
  try {
    const { createOllamaConfig } = require('../providers/ollama.js');
    providers.push(createOllamaConfig());
  } catch (e) {
    // Ollama not available, skip
  }

  return new SmartCost({
    providers,
    monthlyBudget: config.monthlyBudget,
    alertThreshold: config.alertThreshold,
    cacheStrategy: config.cacheStrategy,
    routingStrategy: config.routingStrategy,
  });
}
