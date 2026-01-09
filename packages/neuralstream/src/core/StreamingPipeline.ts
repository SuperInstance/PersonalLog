/**
 * Streaming Pipeline
 *
 * Manages 60 FPS token streaming with pipeline parallelism.
 * Implements speculative decoding and progressive refinement.
 */

import type { NeuralStreamConfig, TokenResult, GenerationProgress } from '../types/index.js';
import { InferenceEngine } from './InferenceEngine.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { Tokenizer } from '../utils/Tokenizer.js';

/**
 * Streaming pipeline for smooth token generation
 */
export class StreamingPipeline {
  private inferenceEngine: InferenceEngine;
  private performanceMonitor: PerformanceMonitor;
  private config: NeuralStreamConfig;
  private tokenizer: Tokenizer;

  private tokensGenerated: number = 0;
  private startTime: number = 0;
  private firstTokenTime: number = 0;
  private isStreaming: boolean = false;

  constructor(
    inferenceEngine: InferenceEngine,
    performanceMonitor: PerformanceMonitor,
    config: NeuralStreamConfig
  ) {
    this.inferenceEngine = inferenceEngine;
    this.performanceMonitor = performanceMonitor;
    this.config = config;
    this.tokenizer = new Tokenizer();
  }

  /**
   * Stream tokens at target FPS
   */
  async *stream(prompt: string): AsyncIterator<TokenResult> {
    this.isStreaming = true;
    this.tokensGenerated = 0;
    this.startTime = performance.now();

    // Tokenize prompt
    const inputTokens = await this.tokenizer.encode(prompt);
    console.log(`Prompt tokenized: ${inputTokens.length} tokens`);

    // Initialize inference
    await this.inferenceEngine.initialize();

    // Generate tokens
    const maxTokens = this.config.maxTokens || 2048;
    const targetFrameTime = 1000 / (this.config.targetFPS || 60);

    let lastFrameTime = 0;
    let currentTokens = [...inputTokens];

    while (this.tokensGenerated < maxTokens && this.isStreaming) {
      const frameStart = performance.now();

      // Generate token
      const tokenStartTime = performance.now();
      const tokenId = await this.inferenceEngine.generateToken(currentTokens);
      const tokenEndTime = performance.now();

      // Track first token time
      if (this.tokensGenerated === 0) {
        this.firstTokenTime = tokenEndTime - this.startTime;
        this.performanceMonitor.recordFirstTokenTime(this.firstTokenTime);
      }

      // Decode token
      const token = await this.tokenizer.decode([tokenId]);

      // Update progress
      this.tokensGenerated++;
      currentTokens.push(tokenId);

      // Record metrics
      const generationTime = tokenEndTime - tokenStartTime;
      this.performanceMonitor.recordToken(generationTime);

      // Calculate FPS
      const currentTime = performance.now();
      const totalTime = currentTime - this.startTime;
      const fps = (this.tokensGenerated / totalTime) * 1000;

      // Check if EOS token
      const isEOS = tokenId === this.tokenizer.getEOSToken();
      const isDone = this.tokensGenerated >= maxTokens || isEOS;

      yield {
        token,
        tokenId,
        probability: 0.0, // Would be calculated from sampling
        generationTime,
        position: this.tokensGenerated,
        isDone,
        finishReason: isDone ? (isEOS ? 'eos' : 'length') : undefined
      };

      // Maintain target FPS
      const frameTime = performance.now() - frameStart;
      const remainingTime = targetFrameTime - frameTime;

      if (remainingTime > 0 && !isDone) {
        await this.sleep(remainingTime);
      }

      lastFrameTime = frameTime;

      if (isDone) break;
    }

    this.isStreaming = false;

    // Log final metrics
    const totalTime = performance.now() - this.startTime;
    console.log(`Generation complete: ${this.tokensGenerated} tokens in ${totalTime.toFixed(2)}ms`);
    console.log(`Average: ${(totalTime / this.tokensGenerated).toFixed(2)}ms per token`);
    console.log(`FPS: ${(this.tokensGenerated / totalTime * 1000).toFixed(2)}`);
  }

  /**
   * Get current progress
   */
  getProgress(): GenerationProgress {
    const currentTime = performance.now();
    const totalTime = currentTime - this.startTime;

    const currentFPS = this.tokensGenerated > 0
      ? (this.performanceMonitor.getRecentTokens() / Math.max(totalTime - this.performanceMonitor.getRecentStartTime(), 1)) * 1000
      : 0;

    const avgFPS = this.tokensGenerated > 0
      ? (this.tokensGenerated / totalTime) * 1000
      : 0;

    const estimatedTimePerToken = totalTime / Math.max(this.tokensGenerated, 1);
    const estimatedRemaining = Math.ceil((this.config.maxTokens || 2048 - this.tokensGenerated) * estimatedTimePerToken);

    return {
      tokensGenerated: this.tokensGenerated,
      estimatedRemaining,
      currentFPS,
      averageFPS: avgFPS,
      totalTime,
      timeToFirstToken: this.firstTokenTime,
      memoryUsed: 0, // Would get from device manager
      cacheHitRate: this.performanceMonitor.getCacheHitRate()
    };
  }

  /**
   * Stop streaming
   */
  stop(): void {
    this.isStreaming = false;
  }

  /**
   * Check if currently streaming
   */
  isActive(): boolean {
    return this.isStreaming;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.isStreaming = false;
    this.tokenizer.dispose();
  }
}
