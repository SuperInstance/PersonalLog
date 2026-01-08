/**
 * Intelligent Recommendations Example
 *
 * Demonstrates the recommendation system for optimization suggestions
 */

import { recommender } from '../src';

async function main() {
  console.log('=== Intelligent Recommendations ===\n');

  // 1. Get recommendations for high-latency scenario
  console.log('1. High latency scenario:');
  const latencyRecommendations = await recommender.suggest({
    context: 'high-latency',
    constraints: {
      maxLatencyMs: 1000,
      maxMemoryMB: 100,
      minFrameRate: 60,
    },
    currentMetrics: {
      'response-latency': 1500,
      'memory-usage': 80,
      'frame-rate': 55,
    },
  });

  console.log(`   Found ${latencyRecommendations.length} recommendations`);
  for (const rec of latencyRecommendations) {
    console.log(`   - ${rec.action}`);
    console.log(`     Priority: ${rec.priority}`);
    console.log(`     Current: ${rec.current} → Suggested: ${rec.suggested.toFixed(0)}`);
    console.log(`     Expected: ${rec.expectedImprovement}`);
    console.log(`     Confidence: ${(rec.confidence * 100).toFixed(0)}%`);
    console.log(`     Risk: ${rec.riskLevel}/100`);
    console.log(`     Time: ${rec.estimatedTime}`);
    console.log(`     Reasoning: ${rec.reasoning}`);
    console.log('');
  }

  // 2. Get recommendations for low cache hit rate
  console.log('2. Low cache hit rate scenario:');
  const cacheRecommendations = await recommender.suggest({
    context: 'low-cache-hit-rate',
    constraints: {
      maxLatencyMs: 1000,
      minCacheHitRate: 0.8,
    },
    currentMetrics: {
      'response-latency': 800,
      'cache-size': 0.65,
    },
  });

  console.log(`   Found ${cacheRecommendations.length} recommendations`);
  for (const rec of cacheRecommendations.slice(0, 2)) {
    console.log(`   - ${rec.action}`);
    console.log(`     Expected: ${rec.expectedImprovement}`);
    console.log(`     Reasoning: ${rec.reasoning}`);
  }

  // 3. Get recommendations for high memory usage
  console.log('\n3. High memory usage scenario:');
  const memoryRecommendations = await recommender.suggest({
    context: 'high-memory-usage',
    constraints: {
      maxMemoryMB: 100,
    },
    currentMetrics: {
      'memory-usage': 150,
    },
    preferences: {
      prioritizeMemory: true,
      riskTolerance: 'medium',
    },
  });

  console.log(`   Found ${memoryRecommendations.length} recommendations`);
  for (const rec of memoryRecommendations.slice(0, 2)) {
    console.log(`   - ${rec.action}`);
    console.log(`     Expected: ${rec.expectedImprovement}`);
    console.log(`     Reasoning: ${rec.reasoning}`);
  }

  // 4. Get recommendations for low frame rate
  console.log('\n4. Low frame rate scenario:');
  const frameRateRecommendations = await recommender.suggest({
    context: 'low-frame-rate',
    constraints: {
      minFrameRate: 60,
    },
    currentMetrics: {
      'frame-rate': 45,
    },
    preferences: {
      prioritizeSpeed: true,
      riskTolerance: 'low',
    },
  });

  console.log(`   Found ${frameRateRecommendations.length} recommendations`);
  for (const rec of frameRateRecommendations.slice(0, 2)) {
    console.log(`   - ${rec.action}`);
    console.log(`     Expected: ${rec.expectedImprovement}`);
    console.log(`     Reasoning: ${rec.reasoning}`);
  }

  // 5. Apply a recommendation
  console.log('\n5. Applying recommendation:');
  if (latencyRecommendations.length > 0) {
    const rec = latencyRecommendations[0];
    console.log(`   Applying: ${rec.action}`);
    console.log(`   Config: ${rec.configKey}`);
    console.log(`   Value: ${rec.current} → ${rec.suggested}`);

    const applied = await recommender.applyRecommendation(rec);
    console.log(`   Success: ${applied}`);
  }

  // 6. Show recommendation history
  console.log('\n6. Recommendation history:');
  const history = recommender.getHistory();
  console.log(`   Total recommendations: ${history.length}`);

  // Group by priority
  const byPriority = {
    high: history.filter(r => r.priority === 'high').length,
    medium: history.filter(r => r.priority === 'medium').length,
    low: history.filter(r => r.priority === 'low').length,
  };
  console.log(`   High priority: ${byPriority.high}`);
  console.log(`   Medium priority: ${byPriority.medium}`);
  console.log(`   Low priority: ${byPriority.low}`);
}

main().catch(console.error);
