/**
 * Example 3: Aggregation Strategies
 *
 * Compare different aggregation strategies for combining verifier results.
 */

import { ThoughtChain, createMockVerifiers } from '@superinstance/thoughtchain';

const strategies = [
  'mean',
  'median',
  'weighted',
  'voting',
  'confidence-weighted',
] as const;

async function compareAggregationStrategies() {
  console.log('=== Comparing Aggregation Strategies ===\n');

  const query = 'Explain the relationship between quantum mechanics and general relativity.';

  const results: Array<{
    strategy: string;
    confidence: number;
    duration: number;
    backtracks: number;
  }> = [];

  for (const strategy of strategies) {
    console.log(`\n--- Testing Strategy: ${strategy} ---`);

    const verifiers = createMockVerifiers(5);
    const tc = new ThoughtChain(verifiers, {
      steps: 5,
      verifiers: 5,
      aggregationStrategy: strategy,
      backtrackOnLowConfidence: true,
      explainReasoning: false, // Skip for speed
    });

    const startTime = Date.now();
    const result = await tc.reason(query);
    const duration = Date.now() - startTime;

    console.log(`Confidence: ${(result.overallConfidence * 100).toFixed(1)}%`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Backtracks: ${result.stepsBacktracked}`);

    results.push({
      strategy,
      confidence: result.overallConfidence,
      duration,
      backtracks: result.stepsBacktracked,
    });
  }

  // Summary comparison
  console.log('\n=== Strategy Comparison ===');
  console.table(results);

  // Find best strategy for different metrics
  const bestConfidence = results.reduce((best, r) =>
    r.confidence > best.confidence ? r : best
  );
  const fastest = results.reduce((best, r) =>
    r.duration < best.duration ? r : best
  );
  const fewestBacktracks = results.reduce((best, r) =>
    r.backtracks < best.backtracks ? r : best
  );

  console.log('\n=== Best By Metric ===');
  console.log(`Highest Confidence: ${bestConfidence.strategy} (${(bestConfidence.confidence * 100).toFixed(1)}%)`);
  console.log(`Fastest: ${fastest.strategy} (${fastest.duration}ms)`);
  console.log(`Fewest Backtracks: ${fewestBacktracks.strategy} (${fewestBacktracks.backtracks})`);

  // Recommendation
  console.log('\n=== Recommendation ===');
  if (bestConfidence.confidence > 0.95 && fastest.duration < 10000) {
    console.log(`✓ Use "${bestConfidence.strategy}" for optimal balance of confidence and speed`);
  } else if (fastest.duration < 5000) {
    console.log(`✓ Use "${fastest.strategy}" for speed-critical applications`);
  } else {
    console.log(`✓ Use "${bestConfidence.strategy}" for accuracy-critical applications`);
  }
}

// Run the example
compareAggregationStrategies().catch(console.error);
