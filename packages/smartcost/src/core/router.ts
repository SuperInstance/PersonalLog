/**
 * Intelligent Router - Query Analysis & Model Selection
 *
 * Analyzes query complexity, routes to cheapest viable model,
 * with fallback strategies and performance optimization
 */

import type {
  ProviderConfig,
  ModelConfig,
  RoutingStrategy,
  RoutingDecision,
  RoutingAlternative,
  QueryAnalysis,
  ProviderType,
  ChatCompletionRequest,
  ProviderState,
} from '../types/index.js';

// ============================================================================
// INTELLIGENT ROUTER CLASS
// ============================================================================

export class IntelligentRouter {
  private providers: Map<string, ProviderConfig>;
  private models: Map<string, ModelConfig>;
  private providerStates: Map<string, ProviderState>;
  private routingHistory: RoutingDecision[] = [];
  private performanceHistory: Map<string, number[]> = new Map();

  constructor(providers: ProviderConfig[]) {
    this.providers = new Map();
    this.models = new Map();
    this.providerStates = new Map();

    // Initialize providers and models
    providers.forEach((provider) => {
      if (provider.enabled !== false) {
        this.providers.set(provider.id, provider);
        this.providerStates.set(provider.id, this.initializeProviderState(provider));

        // Index models
        provider.models.forEach((model) => {
          if (model.enabled !== false) {
            const key = `${provider.id}:${model.id}`;
            this.models.set(key, model);
          }
        });
      }
    });
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  /**
   * Analyze query and make routing decision
   */
  public async route(
    request: ChatCompletionRequest,
    strategy: RoutingStrategy = 'cost-optimized'
  ): Promise<RoutingDecision> {
    // Analyze query
    const analysis = this.analyzeQuery(request);

    // Get available options
    const options = this.getAvailableOptions(analysis);

    if (options.length === 0) {
      throw new Error('No available models for routing');
    }

    // Apply routing strategy
    const decision = this.applyRoutingStrategy(
      options,
      analysis,
      strategy
    );

    // Record routing decision
    this.recordRoutingDecision(decision);

    // Update provider state
    this.updateProviderState(decision.provider, 'request');

    return decision;
  }

  /**
   * Analyze query complexity and requirements
   */
  public analyzeQuery(request: ChatCompletionRequest): QueryAnalysis {
    const complexity = this.calculateComplexity(request);
    const requiredCapabilities = this.identifyCapabilities(request);
    const estimatedTokens = this.estimateTokens(request);
    const expectedOutputTokens = this.estimateOutputTokens(request, complexity);

    // Suggest provider and model
    const suggestion = this.suggestModel(
      complexity,
      requiredCapabilities,
      estimatedTokens
    );

    // Build analysis object with placeholder reasoning (will be replaced)
    const analysis: QueryAnalysis = {
      complexity,
      requiredCapabilities,
      estimatedTokens,
      expectedOutputTokens,
      suggestedProvider: suggestion?.provider,
      suggestedModel: suggestion?.model,
      reasoning: '', // Will be set below
    };

    analysis.reasoning = this.generateReasoning(analysis, suggestion);

    return analysis;
  }

  /**
   * Get available routing options
   */
  public getAvailableOptions(analysis: QueryAnalysis): Array<{
    provider: string;
    model: string;
    modelConfig: ModelConfig;
    providerConfig: ProviderConfig;
    score: number;
  }> {
    const options: Array<{
      provider: string;
      model: string;
      modelConfig: ModelConfig;
      providerConfig: ProviderConfig;
      score: number;
    }> = [];

    this.providers.forEach((providerConfig, providerId) => {
      const providerState = this.providerStates.get(providerId);

      // Skip if provider unavailable
      if (!providerState?.available) {
        return;
      }

      // Skip if rate limited
      if (this.isRateLimited(providerId, providerConfig, providerState)) {
        return;
      }

      providerConfig.models.forEach((modelConfig) => {
        if (modelConfig.enabled === false) {
          return;
        }

        // Check if model has required capabilities
        if (!this.hasRequiredCapabilities(modelConfig, analysis.requiredCapabilities)) {
          return;
        }

        // Check if model has enough context
        if (modelConfig.maxTokens < analysis.estimatedTokens) {
          return;
        }

        // Calculate score for this option
        const score = this.calculateOptionScore(
          providerConfig,
          modelConfig,
          analysis
        );

        options.push({
          provider: providerId,
          model: modelConfig.id,
          modelConfig,
          providerConfig,
          score,
        });
      });
    });

    // Sort by score
    options.sort((a, b) => b.score - a.score);

    return options;
  }

  /**
   * Update provider state
   */
  public updateProviderState(
    providerId: string,
    event: 'request' | 'error' | 'success',
    latency?: number
  ): void {
    const state = this.providerStates.get(providerId);
    if (!state) return;

    switch (event) {
      case 'request':
        state.requestCount++;
        break;
      case 'error':
        state.errorCount++;
        // Mark unavailable if too many errors
        if (state.errorCount > 5) {
          state.available = false;
        }
        break;
      case 'success':
        // Reset error count on success
        state.errorCount = 0;
        state.available = true;
        break;
    }

    // Update average latency
    if (latency !== undefined) {
      const history = this.performanceHistory.get(providerId) || [];
      history.push(latency);
      // Keep only last 100 measurements
      if (history.length > 100) {
        history.shift();
      }
      this.performanceHistory.set(providerId, history);

      // Calculate new average
      const avg = history.reduce((a, b) => a + b, 0) / history.length;
      state.avgLatency = avg;
    }
  }

  /**
   * Get provider state
   */
  public getProviderState(providerId: string): ProviderState | undefined {
    return this.providerStates.get(providerId);
  }

  /**
   * Get routing statistics
   */
  public getRoutingStats(): {
    totalDecisions: number;
    decisionsByProvider: Record<string, number>;
    decisionsByModel: Record<string, number>;
    avgConfidence: number;
  } {
    const decisionsByProvider: Record<string, number> = {};
    const decisionsByModel: Record<string, number> = {};

    this.routingHistory.forEach((decision) => {
      decisionsByProvider[decision.provider] =
        (decisionsByProvider[decision.provider] || 0) + 1;
      decisionsByModel[decision.model] =
        (decisionsByModel[decision.model] || 0) + 1;
    });

    const avgConfidence =
      this.routingHistory.reduce((sum, d) => sum + d.confidence, 0) /
      this.routingHistory.length;

    return {
      totalDecisions: this.routingHistory.length,
      decisionsByProvider,
      decisionsByModel,
      avgConfidence,
    };
  }

  // ========================================================================
  // PRIVATE METHODS - QUERY ANALYSIS
  // ========================================================================

  /**
   * Calculate query complexity score (0-1)
   */
  private calculateComplexity(request: ChatCompletionRequest): number {
    let complexity = 0;

    // Token count factor (more tokens = more complex)
    const totalChars = request.messages.reduce((sum, m) => sum + m.content.length, 0);
    const estimatedTokens = totalChars / 4;
    complexity += Math.min(estimatedTokens / 10000, 0.3);

    // Message count factor
    complexity += Math.min(request.messages.length / 20, 0.2);

    // System message presence
    if (request.messages.some((m) => m.role === 'system')) {
      complexity += 0.1;
    }

    // Function calling
    if (request.functions && request.functions.length > 0) {
      complexity += 0.15;
    }

    // Low temperature (requires more precision)
    if (request.temperature !== undefined && request.temperature < 0.3) {
      complexity += 0.1;
    }

    // Stop sequences
    if (request.stop) {
      complexity += 0.05;
    }

    return Math.min(complexity, 1);
  }

  /**
   * Identify required capabilities
   */
  private identifyCapabilities(request: ChatCompletionRequest): string[] {
    const capabilities: string[] = [];

    // Check for function calling
    if (request.functions && request.functions.length > 0) {
      capabilities.push('functionCalling');
    }

    // Check for streaming
    if (request.stream) {
      capabilities.push('streaming');
    }

    // Check for vision/multimodal (simple heuristic)
    const hasImageContent = request.messages.some((m) =>
      m.content.includes('image') || m.content.includes('data:image')
    );
    if (hasImageContent) {
      capabilities.push('vision');
    }

    return capabilities;
  }

  /**
   * Estimate token count for request
   */
  private estimateTokens(request: ChatCompletionRequest): number {
    const totalChars = request.messages.reduce((sum, m) => sum + m.content.length, 0);
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(totalChars / 4);
  }

  /**
   * Estimate output tokens based on complexity
   */
  private estimateOutputTokens(
    request: ChatCompletionRequest,
    complexity: number
  ): number {
    // Base estimate
    let estimate = 500;

    // Adjust by complexity
    estimate *= (0.5 + complexity);

    // Adjust by maxTokens if specified
    if (request.maxTokens) {
      estimate = Math.min(estimate, request.maxTokens);
    }

    return Math.ceil(estimate);
  }

  // ========================================================================
  // PRIVATE METHODS - ROUTING STRATEGIES
  // ========================================================================

  /**
   * Apply routing strategy to select best option
   */
  private applyRoutingStrategy(
    options: Array<{
      provider: string;
      model: string;
      modelConfig: ModelConfig;
      providerConfig: ProviderConfig;
      score: number;
    }>,
    analysis: QueryAnalysis,
    strategy: RoutingStrategy
  ): RoutingDecision {
    let selected: typeof options[0];

    switch (strategy) {
      case 'cost-optimized':
        // Always choose cheapest
        selected = options.reduce((best, current) => {
          const bestCost = this.estimateCostForOption(best, analysis);
          const currentCost = this.estimateCostForOption(current, analysis);
          return currentCost < bestCost ? current : best;
        });
        break;

      case 'speed-optimized':
        // Choose fastest (lowest latency)
        selected = options.reduce((best, current) => {
          const bestLatency = best.modelConfig.avgLatency || 1000;
          const currentLatency = current.modelConfig.avgLatency || 1000;
          return currentLatency < bestLatency ? current : best;
        });
        break;

      case 'quality-optimized':
        // Choose highest quality
        selected = options.reduce((best, current) => {
          const bestQuality = best.modelConfig.qualityScore || 0.5;
          const currentQuality = current.modelConfig.qualityScore || 0.5;
          return currentQuality > bestQuality ? current : best;
        });
        break;

      case 'balanced':
        // Balance cost, speed, and quality
        selected = options.reduce((best, current) => {
          const bestScore = this.calculateBalancedScore(best, analysis);
          const currentScore = this.calculateBalancedScore(current, analysis);
          return currentScore > bestScore ? current : best;
        });
        break;

      case 'priority':
      case 'fallback':
        // Use priority order
        selected = options.reduce((best, current) => {
          const bestPriority = best.providerConfig.priority || 100;
          const currentPriority = current.providerConfig.priority || 100;
          return currentPriority < bestPriority ? current : best;
        });
        break;

      default:
        selected = options[0];
    }

    // Calculate confidence
    const confidence = this.calculateConfidence(selected, options, analysis);

    // Create decision
    return {
      provider: selected.provider,
      model: selected.model,
      strategy,
      confidence,
      reasoning: this.generateReasoning(analysis, selected),
      estimatedCost: this.estimateCostForOption(selected, analysis),
      estimatedLatency: selected.modelConfig.avgLatency || 1000,
      qualityScore: selected.modelConfig.qualityScore || 0.5,
      alternatives: options.slice(1, 4).map((alt) => ({
        provider: alt.provider,
        model: alt.model,
        estimatedCost: this.estimateCostForOption(alt, analysis),
        estimatedLatency: alt.modelConfig.avgLatency || 1000,
        qualityScore: alt.modelConfig.qualityScore || 0.5,
        reason: 'Not selected due to routing strategy',
      })),
    };
  }

  /**
   * Estimate cost for an option
   */
  private estimateCostForOption(
    option: {
      provider: string;
      model: string;
      modelConfig: ModelConfig;
      providerConfig: ProviderConfig;
      score: number;
    },
    analysis: QueryAnalysis
  ): number {
    const inputCost =
      (analysis.estimatedTokens / 1_000_000) *
      option.modelConfig.inputCostPerMillion;
    const outputCost =
      (analysis.expectedOutputTokens / 1_000_000) *
      option.modelConfig.outputCostPerMillion;
    return inputCost + outputCost;
  }

  /**
   * Calculate balanced score (cost + speed + quality)
   */
  private calculateBalancedScore(
    option: {
      provider: string;
      model: string;
      modelConfig: ModelConfig;
      providerConfig: ProviderConfig;
      score: number;
    },
    analysis: QueryAnalysis
  ): number {
    const cost = this.estimateCostForOption(option, analysis);
    const latency = option.modelConfig.avgLatency || 1000;
    const quality = option.modelConfig.qualityScore || 0.5;

    // Normalize factors (lower is better for cost/latency, higher is better for quality)
    const costScore = 1 / (1 + cost * 100); // Scale cost impact
    const latencyScore = 1 / (1 + latency / 1000); // Scale latency impact
    const qualityScore = quality;

    // Weighted average
    return (costScore * 0.4 + latencyScore * 0.3 + qualityScore * 0.3);
  }

  /**
   * Calculate confidence score for decision
   */
  private calculateConfidence(
    selected: {
      provider: string;
      model: string;
      modelConfig: ModelConfig;
      providerConfig: ProviderConfig;
      score: number;
    },
    options: Array<typeof selected>,
    analysis: QueryAnalysis
  ): number {
    // Base confidence on how much better selected option is than alternatives
    if (options.length === 1) return 1;

    const selectedCost = this.estimateCostForOption(selected, analysis);
    const avgCost =
      options.reduce((sum, opt) => sum + this.estimateCostForOption(opt, analysis), 0) /
      options.length;

    // If selected is significantly cheaper, high confidence
    if (selectedCost < avgCost * 0.5) return 0.9;
    if (selectedCost < avgCost * 0.7) return 0.8;
    if (selectedCost < avgCost * 0.9) return 0.7;

    return 0.6;
  }

  /**
   * Check if model has required capabilities
   */
  private hasRequiredCapabilities(
    modelConfig: ModelConfig,
    requiredCapabilities: string[]
  ): boolean {
    if (requiredCapabilities.length === 0) return true;

    const modelCaps = modelConfig.capabilities || {};
    return requiredCapabilities.every((cap) => {
      const key = cap as keyof typeof modelCaps;
      return modelCaps[key] === true;
    });
  }

  /**
   * Check if provider is rate limited
   */
  private isRateLimited(
    providerId: string,
    providerConfig: ProviderConfig,
    providerState: ProviderState
  ): boolean {
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000) * 60000;

    // Reset counters if new minute
    if (currentMinute > providerState.lastReset) {
      providerState.requestCount = 0;
      providerState.tokenCount = 0;
      providerState.lastReset = currentMinute;
    }

    // Check rate limits
    if (
      providerConfig.maxRequestsPerMinute &&
      providerState.requestCount >= providerConfig.maxRequestsPerMinute
    ) {
      return true;
    }

    if (
      providerConfig.maxTokensPerMinute &&
      providerState.tokenCount >= providerConfig.maxTokensPerMinute
    ) {
      return true;
    }

    return false;
  }

  /**
   * Calculate option score
   */
  private calculateOptionScore(
    providerConfig: ProviderConfig,
    modelConfig: ModelConfig,
    analysis: QueryAnalysis
  ): number {
    let score = 0;

    // Capability match
    const requiredCapabilities = analysis.requiredCapabilities;
    if (requiredCapabilities.length > 0) {
      const modelCaps = modelConfig.capabilities || {};
      const hasAll = requiredCapabilities.every((cap) => {
        const key = cap as keyof typeof modelCaps;
        return modelCaps[key] === true;
      });
      if (hasAll) score += 0.4;
    }

    // Context size match
    if (modelConfig.maxTokens >= analysis.estimatedTokens) {
      score += 0.2;
    }

    // Cost factor (cheaper is better)
    const cost = this.estimateCostForOption(
      { provider: providerConfig.id, model: modelConfig.id, modelConfig, providerConfig, score: 0 },
      analysis
    );
    score += Math.max(0, 0.3 - cost * 10);

    // Quality factor
    if (modelConfig.qualityScore) {
      score += modelConfig.qualityScore * 0.1;
    }

    return score;
  }

  /**
   * Suggest model based on analysis
   */
  private suggestModel(
    complexity: number,
    requiredCapabilities: string[],
    estimatedTokens: number
  ): { provider: string; model: string } | undefined {
    // Simple heuristic: choose cheapest that meets requirements
    const options = Array.from(this.models.entries())
      .filter(([_, model]) => {
        if (model.enabled === false) return false;
        if (model.maxTokens < estimatedTokens) return false;

        const modelCaps = model.capabilities || {};
        const hasAll = requiredCapabilities.every((cap) => {
          const key = cap as keyof typeof modelCaps;
          return modelCaps[key] === true;
        });
        return hasAll;
      })
      .sort((a, b) => {
        const costA = (a[1].inputCostPerMillion + a[1].outputCostPerMillion) / 2;
        const costB = (b[1].inputCostPerMillion + b[1].outputCostPerMillion) / 2;
        return costA - costB;
      });

    if (options.length === 0) return undefined;

    const [key] = options[0];
    const [provider, model] = key.split(':');
    return { provider, model };
  }

  /**
   * Generate reasoning for decision
   */
  private generateReasoning(
    analysis: QueryAnalysis,
    selected?: { provider: string; model: string }
  ): string {
    const parts: string[] = [];

    parts.push(`Complexity: ${(analysis.complexity * 100).toFixed(0)}%`);
    parts.push(`Estimated tokens: ${analysis.estimatedTokens}`);

    if (analysis.requiredCapabilities.length > 0) {
      parts.push(`Required: ${analysis.requiredCapabilities.join(', ')}`);
    }

    if (selected) {
      parts.push(`Selected: ${selected.provider}/${selected.model}`);
    }

    return parts.join('. ');
  }

  /**
   * Record routing decision
   */
  private recordRoutingDecision(decision: RoutingDecision): void {
    this.routingHistory.push(decision);

    // Keep only last 1000 decisions
    if (this.routingHistory.length > 1000) {
      this.routingHistory.shift();
    }
  }

  /**
   * Initialize provider state
   */
  private initializeProviderState(provider: ProviderConfig): ProviderState {
    return {
      id: provider.id,
      available: true,
      requestCount: 0,
      tokenCount: 0,
      lastReset: Date.now(),
      errorCount: 0,
      avgLatency: provider.models[0]?.avgLatency || 1000,
    };
  }
}
