/**
 * Performance Monitor
 *
 * Tracks inference performance metrics including FPS, memory usage, and cache efficiency.
 */

import type { NeuralStreamConfig, PerformanceMetrics } from '../types/index.js';

/**
 * Monitors and tracks inference performance
 */
export class PerformanceMonitor {
  private config: NeuralStreamConfig;

  // Metrics
  private totalTokens: number = 0;
  private totalGenerationTime: number = 0;
  private firstTokenTime: number = 0;

  // Recent token tracking (for current FPS)
  private recentTokens: number[] = [];
  private recentTimestamps: number[] = [];
  private windowSize: number = 60; // Track last 60 tokens

  // Cache metrics
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  // Speculative decoding metrics
  private speculativeAttempts: number = 0;
  private speculativeSuccesses: number = 0;

  // Memory tracking
  private peakMemoryUsage: number = 0;

  constructor(config: NeuralStreamConfig) {
    this.config = config;
  }

  /**
   * Record token generation
   */
  recordToken(generationTime: number): void {
    this.totalTokens++;
    this.totalGenerationTime += generationTime;

    // Track recent tokens for FPS calculation
    const now = performance.now();
    this.recentTokens.push(1);
    this.recentTimestamps.push(now);

    // Keep only recent window
    if (this.recentTokens.length > this.windowSize) {
      this.recentTokens.shift();
      this.recentTimestamps.shift();
    }
  }

  /**
   * Record first token time
   */
  recordFirstTokenTime(time: number): void {
    this.firstTokenTime = time;
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    this.cacheHits++;
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  /**
   * Record speculative decoding attempt
   */
  recordSpeculativeAttempt(success: boolean): void {
    this.speculativeAttempts++;
    if (success) {
      this.speculativeSuccesses++;
    }
  }

  /**
   * Update memory usage
   */
  updateMemoryUsage(bytes: number): void {
    if (bytes > this.peakMemoryUsage) {
      this.peakMemoryUsage = bytes;
    }
  }

  /**
   * Get recent token count (for FPS)
   */
  getRecentTokens(): number {
    return this.recentTokens.reduce((a, b) => a + b, 0);
  }

  /**
   * Get start time of recent window
   */
  getRecentStartTime(): number {
    return this.recentTimestamps[0] || 0;
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? this.cacheHits / total : 0;
  }

  /**
   * Get speculative decoding success rate
   */
  getSpeculativeSuccessRate(): number {
    return this.speculativeAttempts > 0
      ? this.speculativeSuccesses / this.speculativeAttempts
      : 0;
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics(): PerformanceMetrics {
    const avgTimePerToken = this.totalTokens > 0
      ? this.totalGenerationTime / this.totalTokens
      : 0;

    const tokensPerSecond = avgTimePerToken > 0
      ? 1000 / avgTimePerToken
      : 0;

    return {
      totalTokens: this.totalTokens,
      avgTimePerToken,
      timeToFirstToken: this.firstTokenTime,
      tokensPerSecond,
      peakMemoryUsage: this.peakMemoryUsage,
      gpuUtilization: 0, // Would need WebGPU timestamp queries
      cacheHitRate: this.getCacheHitRate(),
      speculativeSuccessRate: this.getSpeculativeSuccessRate(),
      avgBatchSize: this.config.batchSize || 1,
      pipelineEfficiency: 0.9 // Estimate
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.totalTokens = 0;
    this.totalGenerationTime = 0;
    this.firstTokenTime = 0;
    this.recentTokens = [];
    this.recentTimestamps = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.speculativeAttempts = 0;
    this.speculativeSuccesses = 0;
    this.peakMemoryUsage = 0;
  }
}
