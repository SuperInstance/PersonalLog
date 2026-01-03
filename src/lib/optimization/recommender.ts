/**
 * Recommendation Engine
 *
 * Generates intelligent optimization suggestions based on
 * performance metrics, constraints, and historical data.
 */

import type { OptimizationTarget } from './types';

// ============================================================================
// RECOMMENDATION CONTEXT
// ============================================================================

export interface RecommendationContext {
  /** Current situation */
  context: string;

  /** Performance constraints */
  constraints: {
    maxMemoryMB?: number;
    maxBundleSizeKB?: number;
    minFrameRate?: number;
    maxLatencyMs?: number;
    minCacheHitRate?: number;
  };

  /** User preferences */
  preferences?: {
    prioritizeSpeed?: boolean;
    prioritizeMemory?: boolean;
    prioritizeQuality?: boolean;
    riskTolerance?: 'low' | 'medium' | 'high';
  };

  /** Current metrics */
  currentMetrics?: Partial<Record<OptimizationTarget, number>>;
}

// ============================================================================
// OPTIMIZATION RECOMMENDATION
// ============================================================================

export interface Recommendation {
  /** Priority level */
  priority: 'high' | 'medium' | 'low';

  /** Action to take */
  action: string;

  /** Configuration key */
  configKey: string;

  /** Current value */
  current: number;

  /** Suggested value */
  suggested: number;

  /** Expected improvement */
  expectedImprovement: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Reasoning */
  reasoning: string;

  /** Risk level (0-100) */
  riskLevel: number;

  /** Estimated time to apply */
  estimatedTime: string;

  /** Dependencies */
  dependencies: string[];
}

// ============================================================================
// RECOMMENDATION ENGINE
// ============================================================================>

export class Recommender {
  private recommendations: Recommendation[] = [];
  private appliedRecommendations: Set<string> = new Set();

  /**
   * Generate optimization recommendations
   */
  async suggest(context: RecommendationContext): Promise<Recommendation[]> {
    this.recommendations = [];

    const metrics = context.currentMetrics ?? {};
    const constraints = context.constraints;

    // Analyze each optimization target
    if (metrics['response-latency'] && constraints.maxLatencyMs) {
      const latencyRecs = this.analyzeLatency(
        metrics['response-latency'],
        constraints.maxLatencyMs,
        context
      );
      this.recommendations.push(...latencyRecs);
    }

    if (metrics['cache-size'] && constraints.minCacheHitRate) {
      const cacheRecs = this.analyzeCache(
        metrics['cache-size'],
        constraints.minCacheHitRate,
        context
      );
      this.recommendations.push(...cacheRecs);
    }

    if (metrics['memory-usage'] && constraints.maxMemoryMB) {
      const memoryRecs = this.analyzeMemory(
        metrics['memory-usage'],
        constraints.maxMemoryMB,
        context
      );
      this.recommendations.push(...memoryRecs);
    }

    if (metrics['frame-rate'] && constraints.minFrameRate) {
      const renderRecs = this.analyzeRendering(
        metrics['frame-rate'],
        constraints.minFrameRate,
        context
      );
      this.recommendations.push(...renderRecs);
    }

    // Sort by priority and confidence
    return this.recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return b.confidence - a.confidence;
    });
  }

  /**
   * Apply recommendation
   */
  async applyRecommendation(recommendation: Recommendation): Promise<boolean> {
    const key = `${recommendation.configKey}:${recommendation.suggested}`;

    if (this.appliedRecommendations.has(key)) {
      console.log('[Recommender] Recommendation already applied:', key);
      return false;
    }

    console.log('[Recommender] Applying recommendation:', recommendation.action);

    try {
      // Apply configuration change
      this.applyConfigChange(recommendation.configKey, recommendation.suggested);

      // Mark as applied
      this.appliedRecommendations.add(key);

      return true;
    } catch (error) {
      console.error('[Recommender] Failed to apply recommendation:', error);
      return false;
    }
  }

  /**
   * Get recommendation history
   */
  getHistory(): Recommendation[] {
    return [...this.recommendations];
  }

  /**
   * Clear applied recommendations
   */
  clearHistory(): void {
    this.appliedRecommendations.clear();
  }

  // ========================================================================
  // ANALYSIS METHODS
  // ========================================================================

  /**
   * Analyze latency metrics
   */
  private analyzeLatency(
    currentLatency: number,
    maxLatency: number,
    context: RecommendationContext
  ): Recommendation[] {
    const recs: Recommendation[] = [];

    if (currentLatency > maxLatency) {
      // High priority: Enable streaming
      recs.push({
        priority: 'high',
        action: 'enable_streaming',
        configKey: 'apiStreamingEnabled',
        current: 0,
        suggested: 1,
        expectedImprovement: '+25%',
        confidence: 0.88,
        reasoning: `API latency (${currentLatency.toFixed(0)}ms) exceeds threshold (${maxLatency}ms). Streaming will improve perceived response time.`,
        riskLevel: 10,
        estimatedTime: '< 1 min',
        dependencies: [],
      });

      // Medium priority: Increase timeout
      recs.push({
        priority: 'medium',
        action: 'increase_api_timeout',
        configKey: 'apiTimeout',
        current: 10000,
        suggested: Math.min(30000, currentLatency * 1.5),
        expectedImprovement: '+10%',
        confidence: 0.72,
        reasoning: 'Current timeout may be too short for responses. Increasing timeout will reduce failed requests.',
        riskLevel: 20,
        estimatedTime: '< 1 min',
        dependencies: [],
      });

      // Medium priority: Add retry logic
      recs.push({
        priority: 'medium',
        action: 'add_retry_logic',
        configKey: 'apiRetryAttempts',
        current: 1,
        suggested: 3,
        expectedImprovement: '+15%',
        confidence: 0.81,
        reasoning: 'Adding retry logic with exponential backoff will improve reliability.',
        riskLevel: 15,
        estimatedTime: '< 5 min',
        dependencies: ['increase_api_timeout'],
      });
    }

    return recs;
  }

  /**
   * Analyze cache performance
   */
  private analyzeCache(
    currentHitRate: number,
    minHitRate: number,
    context: RecommendationContext
  ): Recommendation[] {
    const recs: Recommendation[] = [];

    if (currentHitRate < minHitRate) {
      // High priority: Increase cache size
      recs.push({
        priority: 'high',
        action: 'increase_cache_size',
        configKey: 'cacheMaxSize',
        current: 1000,
        suggested: Math.min(10000, 1000 * Math.ceil(minHitRate / currentHitRate)),
        expectedImprovement: `+${Math.round(((minHitRate - currentHitRate) / currentHitRate) * 100)}%`,
        confidence: 0.92,
        reasoning: `Cache hit rate (${(currentHitRate * 100).toFixed(0)}%) below target (${(minHitRate * 100).toFixed(0)}%). Increasing cache size will improve hit rate.`,
        riskLevel: 15,
        estimatedTime: '< 1 min',
        dependencies: [],
      });

      // Medium priority: Increase TTL
      recs.push({
        priority: 'medium',
        action: 'increase_cache_ttl',
        configKey: 'cacheTTL',
        current: 300000,
        suggested: 600000,
        expectedImprovement: '+12%',
        confidence: 0.78,
        reasoning: 'Longer TTL means items stay in cache longer, improving hit rate.',
        riskLevel: 20,
        estimatedTime: '< 1 min',
        dependencies: [],
      });
    }

    return recs;
  }

  /**
   * Analyze memory usage
   */
  private analyzeMemory(
    currentMemory: number,
    maxMemory: number,
    context: RecommendationContext
  ): Recommendation[] {
    const recs: Recommendation[] = [];

    if (currentMemory > maxMemory) {
      // High priority: Reduce cache limit
      recs.push({
        priority: 'high',
        action: 'reduce_memory_cache',
        configKey: 'memoryCacheLimit',
        current: 100,
        suggested: Math.max(10, maxMemory * 0.6),
        expectedImprovement: `-${Math.round(((currentMemory - maxMemory) / currentMemory) * 100)}%`,
        confidence: 0.89,
        reasoning: `Memory usage (${currentMemory.toFixed(0)}MB) exceeds limit (${maxMemory}MB). Reducing cache size will lower memory footprint.`,
        riskLevel: 25,
        estimatedTime: '< 1 min',
        dependencies: [],
      });

      // Medium priority: Enable compression
      recs.push({
        priority: 'medium',
        action: 'enable_compression',
        configKey: 'compressionEnabled',
        current: 0,
        suggested: 1,
        expectedImprovement: '+30%',
        confidence: 0.85,
        reasoning: 'Compressing cached data will reduce memory usage significantly.',
        riskLevel: 20,
        estimatedTime: '< 5 min',
        dependencies: [],
      });

      // Low priority: Prune old data
      recs.push({
        priority: 'low',
        action: 'prune_old_messages',
        configKey: 'messageRetentionDays',
        current: 90,
        suggested: 30,
        expectedImprovement: '+15%',
        confidence: 0.75,
        reasoning: 'Reducing message retention period will free up memory over time.',
        riskLevel: 35,
        estimatedTime: '< 1 min',
        dependencies: [],
      });
    }

    return recs;
  }

  /**
   * Analyze rendering performance
   */
  private analyzeRendering(
    currentFps: number,
    minFps: number,
    context: RecommendationContext
  ): Recommendation[] {
    const recs: Recommendation[] = [];

    if (currentFps < minFps) {
      // High priority: Lower virtual scroll threshold
      recs.push({
        priority: 'high',
        action: 'lower_virtual_scroll_threshold',
        configKey: 'virtualScrollThreshold',
        current: 100,
        suggested: Math.max(50, Math.floor(currentFps)),
        expectedImprovement: '+40%',
        confidence: 0.91,
        reasoning: `Frame rate (${currentFps.toFixed(0)} fps) below target (${minFps} fps). Virtual scrolling will dramatically reduce rendering load.`,
        riskLevel: 10,
        estimatedTime: '< 5 min',
        dependencies: [],
      });

      // Medium priority: Enable request batching
      recs.push({
        priority: 'medium',
        action: 'enable_request_batching',
        configKey: 'requestBatchingEnabled',
        current: 0,
        suggested: 1,
        expectedImprovement: '+18%',
        confidence: 0.82,
        reasoning: 'Batching UI updates reduces reflows and repaints, improving frame rate.',
        riskLevel: 15,
        estimatedTime: '< 10 min',
        dependencies: [],
      });

      // Low priority: Reduce render complexity
      recs.push({
        priority: 'low',
        action: 'reduce_render_complexity',
        configKey: 'renderComplexityLevel',
        current: 100,
        suggested: 70,
        expectedImprovement: '+22%',
        confidence: 0.74,
        reasoning: 'Simplifying UI rendering will improve frame rate at the cost of some visual fidelity.',
        riskLevel: 40,
        estimatedTime: '< 30 min',
        dependencies: [],
      });
    }

    return recs;
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Apply configuration change
   */
  private applyConfigChange(key: string, value: number): void {
    // Store in localStorage
    try {
      const config = localStorage.getItem('personallog-config');
      const parsed = config ? JSON.parse(config) : {};
      parsed[key] = value;
      localStorage.setItem('personallog-config', JSON.stringify(parsed));
    } catch (error) {
      console.error('[Recommender] Failed to persist config:', error);
    }
  }

  /**
   * Calculate risk level based on various factors
   */
  private calculateRiskLevel(
    changeType: string,
    currentValue: number,
    suggestedValue: number
  ): number {
    let risk = 20; // Base risk

    // Larger changes are riskier
    const percentChange = Math.abs((suggestedValue - currentValue) / currentValue) * 100;
    if (percentChange > 100) {
      risk += 30;
    } else if (percentChange > 50) {
      risk += 20;
    } else if (percentChange > 25) {
      risk += 10;
    }

    // Certain types of changes are riskier
    if (changeType.includes('memory') || changeType.includes('cache')) {
      risk += 10;
    }

    return Math.min(100, risk);
  }

  /**
   * Estimate confidence score
   */
  private calculateConfidence(
    metricDeviation: number,
    historicalSuccess: number
  ): number {
    // Base confidence
    let confidence = 0.5;

    // Higher deviation = higher confidence that optimization will help
    confidence += Math.min(metricDeviation / 2, 0.3);

    // Historical success improves confidence
    confidence += historicalSuccess * 0.2;

    return Math.min(1, Math.max(0, confidence));
  }
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

/**
 * Global recommender instance
 */
export const recommender = new Recommender();
