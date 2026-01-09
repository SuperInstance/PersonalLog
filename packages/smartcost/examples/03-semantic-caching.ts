/**
 * Example 3: Semantic Caching for AI Cost Reduction
 *
 * This example demonstrates how to use semantic caching to avoid
 * redundant API calls for similar queries
 * Keywords: semantic caching, llm caching, ai cost reduction, query deduplication, vector similarity
 *
 * Use case: Cache similar queries to avoid redundant API calls
 * Benefits: 30-60% cost savings on repeated or similar queries
 */

import { CostTracker } from '../src/core/cost-tracker.js';

const tracker = new CostTracker({
  monthlyBudget: 100,
  enableMonitoring: true,
});

// Simple in-memory cache with semantic similarity
class SemanticCache {
  private cache: Map<string, {
    response: string;
    embedding: number[];
    timestamp: number;
    accessCount: number;
  }> = new Map();

  private similarityThreshold = 0.85;

  // Simple embedding (in production, use actual embedding model)
  private getEmbedding(text: string): number[] {
    // This is a placeholder - use actual embeddings in production
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(100).fill(0);

    words.forEach((word, i) => {
      const hash = word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      embedding[i % 100] = hash / 1000;
    });

    return embedding;
  }

  // Calculate cosine similarity
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Check cache for similar query
  findSimilar(query: string): { response: string; similarity: number } | null {
    const queryEmbedding = this.getEmbedding(query);

    for (const [key, value] of this.cache.entries()) {
      const similarity = this.cosineSimilarity(queryEmbedding, value.embedding);

      if (similarity >= this.similarityThreshold) {
        value.accessCount++;
        return {
          response: value.response,
          similarity,
        };
      }
    }

    return null;
  }

  // Store response in cache
  store(query: string, response: string): void {
    const embedding = this.getEmbedding(query);
    this.cache.set(query, {
      response,
      embedding,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      totalAccess: Array.from(this.cache.values()).reduce((sum, val) => sum + val.accessCount, 0),
    };
  }
}

const cache = new SemanticCache();

// Example 1: Cache miss - first request
async function handleFirstRequest() {
  const query = 'What is machine learning?';
  const cached = cache.findSimilar(query);

  if (!cached) {
    console.log('Cache MISS - Making API call');
    console.log(`Query: "${query}"`);

    // Track API call cost
    const startTracking = tracker.trackRequestStart(
      'openai',
      'gpt-4',
      { input: 500, output: 300 },
      30,
      60
    );

    // Simulate API call
    const response = 'Machine learning is a subset of artificial intelligence...';

    tracker.trackRequestComplete(
      startTracking.requestId,
      'openai',
      'gpt-4',
      { input: 500, output: 300, total: 800 },
      30,
      60,
      1500,
      false // not cached
    );

    // Store in cache
    cache.store(query, response);

    console.log(`Cost: $${startTracking.estimatedCost.toFixed(6)}\n`);
  }
}

// Example 2: Cache hit - exact match
async function handleExactMatch() {
  const query = 'What is machine learning?';
  const cached = cache.findSimilar(query);

  if (cached) {
    console.log('Cache HIT - Exact match');
    console.log(`Query: "${query}"`);
    console.log(`Similarity: ${(cached.similarity * 100).toFixed(1)}%`);

    // Track cache hit (no cost)
    tracker.trackRequestComplete(
      `cache_${Date.now()}`,
      'cache',
      'semantic',
      { input: 0, output: 0, total: 0 },
      0,
      0,
      10, // Very fast
      true, // cached
      'semantic'
    );

    console.log('Response:', cached.response.substring(0, 50) + '...');
    console.log('Cost: $0.000000 (cached)\n');

    // Record savings
    tracker.recordSavings(0.000034, 0); // Saved cost of API call
  }
}

// Example 3: Cache hit - semantic match
async function handleSemanticMatch() {
  const query = 'Explain machine learning to me';
  const cached = cache.findSimilar(query);

  if (cached) {
    console.log('Cache HIT - Semantic match');
    console.log(`Query: "${query}"`);
    console.log(`Similarity: ${(cached.similarity * 100).toFixed(1)}%`);

    // Track cache hit
    tracker.trackRequestComplete(
      `cache_${Date.now()}`,
      'cache',
      'semantic',
      { input: 0, output: 0, total: 0 },
      0,
      0,
      10,
      true,
      'semantic'
    );

    console.log('Response:', cached.response.substring(0, 50) + '...');
    console.log('Cost: $0.000000 (cached)\n');

    // Record savings
    tracker.recordSavings(0.000034, 0);
  }
}

// Example 4: Multiple similar queries
async function handleSimilarQueries() {
  const queries = [
    'What is deep learning?',
    'Explain deep learning',
    'Tell me about deep learning',
  ];

  for (const query of queries) {
    const cached = cache.findSimilar(query);

    if (cached) {
      console.log(`Cache HIT for: "${query}"`);
      console.log(`Similarity: ${(cached.similarity * 100).toFixed(1)}%`);
      console.log('Cost: $0.000000 (cached)\n');

      tracker.trackRequestComplete(
        `cache_${Date.now()}`,
        'cache',
        'semantic',
        { input: 0, output: 0, total: 0 },
        0,
        0,
        10,
        true,
        'semantic'
      );

      tracker.recordSavings(0.000034, 0);
    } else {
      console.log(`Cache MISS for: "${query}"`);

      const startTracking = tracker.trackRequestStart(
        'openai',
        'gpt-4',
        { input: 500, output: 300 },
        30,
        60
      );

      const response = 'Deep learning is a subset of machine learning...';

      tracker.trackRequestComplete(
        startTracking.requestId,
        'openai',
        'gpt-4',
        { input: 500, output: 300, total: 800 },
        30,
        60,
        1500,
        false
      );

      cache.store(query, response);
      console.log(`Cost: $${startTracking.estimatedCost.toFixed(6)}\n`);
    }
  }
}

// Example 5: Cache effectiveness report
function showCacheReport() {
  const metrics = tracker.getCostMetrics();
  const cacheStats = cache.getStats();

  console.log('=== Cache Effectiveness Report ===');
  console.log(`Total requests: ${metrics.totalRequests}`);
  console.log(`Cache hits: ${metrics.cacheHitRate * metrics.totalRequests}`);
  console.log(`Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
  console.log(`Total savings: $${metrics.totalSavings.toFixed(6)}`);
  console.log(`Savings percentage: ${metrics.savingsPercent.toFixed(1)}%`);
  console.log(`Cache entries: ${cacheStats.size}`);
  console.log(`Total cache accesses: ${cacheStats.totalAccess}`);
}

// Run all examples
async function runExamples() {
  console.log('=== Semantic Caching Examples ===\n');

  await handleFirstRequest();  // Cache miss
  await handleExactMatch();    // Cache hit (exact)
  await handleSemanticMatch(); // Cache hit (semantic)
  await handleSimilarQueries(); // Multiple queries

  showCacheReport();
}

runExamples().catch(console.error);
