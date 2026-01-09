/**
 * Example 10: Production Usage
 *
 * Demonstrates production-ready patterns with error handling, monitoring, and optimization.
 */

import { ThoughtChain, createMockVerifiers } from '@superinstance/thoughtchain';
import type { ReasoningResult } from '@superinstance/thoughtchain';

/**
 * Production service wrapper with monitoring and error handling
 */
class ThoughtChainService {
  private tc: ThoughtChain;
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalDuration: 0,
    avgConfidence: 0,
    confidenceSum: 0,
    backtracks: 0,
  };

  constructor(verifiers: any[], config: any = {}) {
    const productionConfig = {
      steps: 5,
      verifiers: 3,
      confidenceThreshold: 0.90,
      backtrackOnLowConfidence: true,
      maxBacktrackAttempts: 3,
      timeout: 30000,
      explainReasoning: true,
      ...config,
    };

    this.tc = new ThoughtChain(verifiers, productionConfig);

    // Setup monitoring
    this.setupMonitoring();
  }

  /**
   * Process a query with full error handling
   */
  async process(query: string, options: { timeout?: number; retries?: number } = {}): Promise<{
    success: boolean;
    result?: ReasoningResult;
    error?: string;
    duration: number;
  }> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Add timeout wrapper
      const timeout = options.timeout || this.tc.getConfig().timeout || 30000;

      const result = await Promise.race([
        this.tc.reason(query),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        ),
      ]);

      // Update metrics
      const duration = Date.now() - startTime;
      this.metrics.totalDuration += duration;
      this.metrics.confidenceSum += result.overallConfidence;
      this.metrics.avgConfidence = this.metrics.confidenceSum / this.metrics.totalRequests;
      this.metrics.backtracks += result.stepsBacktracked;

      if (result.success) {
        this.metrics.successfulRequests++;
        return {
          success: true,
          result,
          duration,
        };
      } else {
        this.metrics.failedRequests++;
        return {
          success: false,
          result,
          error: result.errors?.join(', ') || 'Low confidence',
          duration,
        };
      }
    } catch (error) {
      this.metrics.failedRequests++;
      const duration = Date.now() - startTime;

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
      };
    }
  }

  /**
   * Batch processing with concurrency control
   */
  async processBatch(
    queries: string[],
    options: { concurrency?: number; delayBetween?: number } = {}
  ): Promise<Array<{ query: string; success: boolean; result?: ReasoningResult; error?: string }>> {
    const concurrency = options.concurrency || 3;
    const results: Array<{ query: string; success: boolean; result?: ReasoningResult; error?: string }> = [];

    // Process in chunks
    for (let i = 0; i < queries.length; i += concurrency) {
      const chunk = queries.slice(i, i + concurrency);

      const chunkResults = await Promise.all(
        chunk.map(async query => {
          const result = await this.process(query);
          return { query, ...result };
        })
      );

      results.push(...chunkResults);

      // Delay between chunks to avoid rate limiting
      if (i + concurrency < queries.length && options.delayBetween) {
        await new Promise(resolve => setTimeout(resolve, options.delayBetween));
      }
    }

    return results;
  }

  /**
   * Setup monitoring and alerting
   */
  private setupMonitoring() {
    this.tc.on('progress', (progress) => {
      // In production, send to monitoring system (Datadog, Prometheus, etc.)
      if (progress.status === 'backtracking') {
        console.warn(`⚠ Backtracking detected: ${progress.currentStepDescription}`);
      }
    });

    this.tc.on('error', (error) => {
      // In production, send to error tracking (Sentry, etc.)
      console.error('✗ ThoughtChain error:', error);
    });

    this.tc.on('complete', (result) => {
      if (!result.success) {
        console.warn('⚠ Reasoning completed but did not meet confidence threshold');
      }
    });
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      avgDuration: this.metrics.totalRequests > 0
        ? this.metrics.totalDuration / this.metrics.totalRequests
        : 0,
      successRate: this.metrics.totalRequests > 0
        ? this.metrics.successfulRequests / this.metrics.totalRequests
        : 0,
      avgBacktracks: this.metrics.totalRequests > 0
        ? this.metrics.backtracks / this.metrics.totalRequests
        : 0,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalDuration: 0,
      avgConfidence: 0,
      confidenceSum: 0,
      backtracks: 0,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const testQuery = 'What is 2 + 2?';
      const result = await this.process(testQuery, { timeout: 5000 });

      return {
        healthy: result.success && result.duration < 5000,
        details: {
          latency: result.duration,
          confidence: result.result?.overallConfidence,
          verifiers: this.tc.getConfig().verifiers,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }
}

/**
 * Production usage example
 */
async function productionUsage() {
  console.log('=== Production Usage Example ===\n');

  // Create production service
  const verifiers = createMockVerifiers(3);
  const service = new ThoughtChainService(verifiers, {
    steps: 5,
    verifiers: 3,
    confidenceThreshold: 0.90,
  });

  console.log('1. Health Check');
  console.log('─'.repeat(80));
  const health = await service.healthCheck();
  console.log(`Service Health: ${health.healthy ? '✓ Healthy' : '✗ Unhealthy'}`);
  console.log(`Details:`, health.details);
  console.log();

  console.log('2. Single Request Processing');
  console.log('─'.repeat(80));
  const singleResult = await service.process('What is the capital of France?', {
    timeout: 10000,
  });
  console.log(`Success: ${singleResult.success ? '✓' : '✗'}`);
  console.log(`Duration: ${singleResult.duration}ms`);
  if (singleResult.result) {
    console.log(`Confidence: ${(singleResult.result.overallConfidence * 100).toFixed(1)}%`);
  }
  if (singleResult.error) {
    console.log(`Error: ${singleResult.error}`);
  }
  console.log();

  console.log('3. Batch Processing');
  console.log('─'.repeat(80));
  const queries = [
    'What is machine learning?',
    'Explain photosynthesis.',
    'Who wrote Romeo and Juliet?',
    'What causes earthquakes?',
    'How does the internet work?',
  ];

  const batchResults = await service.processBatch(queries, {
    concurrency: 2,
    delayBetween: 100,
  });

  console.log(`Processed ${batchResults.length} queries`);
  console.log(`Successful: ${batchResults.filter(r => r.success).length}`);
  console.log(`Failed: ${batchResults.filter(r => !r.success).length}`);
  console.log();

  for (const result of batchResults) {
    const status = result.success ? '✓' : '✗';
    const conf = result.result ? `(result.result.overallConfidence * 100).toFixed(1)%` : 'N/A';
    console.log(`${status} ${result.query.substring(0, 40)}... ${conf}`);
  }
  console.log();

  console.log('4. Metrics Dashboard');
  console.log('─'.repeat(80));
  const metrics = service.getMetrics();
  console.table({
    'Total Requests': metrics.totalRequests,
    'Successful': metrics.successfulRequests,
    'Failed': metrics.failedRequests,
    'Success Rate': `${(metrics.successRate * 100).toFixed(1)}%`,
    'Avg Duration': `${metrics.avgDuration.toFixed(0)}ms`,
    'Avg Confidence': `${(metrics.avgConfidence * 100).toFixed(1)}%`,
    'Avg Backtracks': metrics.avgBacktracks.toFixed(1),
  });
  console.log();

  console.log('5. Error Handling Example');
  console.log('─'.repeat(80));
  // Simulate error with very short timeout
  const errorResult = await service.process('Explain quantum entangangement in detail', {
    timeout: 100, // Very short timeout to trigger error
  });
  console.log(`Result: ${errorResult.success ? '✓' : '✗'}`);
  console.log(`Error: ${errorResult.error || 'None'}`);
  console.log();

  console.log('6. Production Best Practices');
  console.log('─'.repeat(80));
  console.log('✓ Implement health checks for monitoring');
  console.log('✓ Use timeouts to prevent hanging requests');
  console.log('✓ Track metrics for performance optimization');
  console.log('✓ Process in batches with concurrency control');
  console.log('✓ Handle errors gracefully with retries');
  console.log('✓ Set up alerting for failures');
  console.log('✓ Use rate limiting for API protection');
  console.log('✓ Cache results when appropriate');
  console.log('✓ Log all reasoning steps for debugging');
  console.log('✓ Monitor costs and optimize configurations');
}

/**
 * Advanced production example with retry logic
 */
async function advancedProductionExample() {
  console.log('\n=== Advanced Production Example ===\n');

  const verifiers = createMockVerifiers(3);
  const service = new ThoughtChainService(verifiers);

  /**
   * Process with automatic retry on failure
   */
  async function processWithRetry(
    query: string,
    maxRetries = 3
  ): Promise<{ success: boolean; result?: ReasoningResult; attempts: number }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await service.process(query);

      if (result.success) {
        return { success: true, result: result.result, attempts: attempt };
      }

      console.log(`Attempt ${attempt} failed: ${result.error}`);

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { success: false, attempts: maxRetries };
  }

  const query = 'What is the meaning of life?';
  console.log(`Processing with retry: ${query}\n`);

  const retryResult = await processWithRetry(query, 3);
  console.log(`\nFinal Result: ${retryResult.success ? '✓ Success' : '✗ Failed'}`);
  console.log(`Attempts: ${retryResult.attempts}`);
  if (retryResult.result) {
    console.log(`Confidence: ${(retryResult.result.overallConfidence * 100).toFixed(1)}%`);
  }
}

// Run the examples
productionUsage()
  .then(() => advancedProductionExample())
  .catch(console.error);
