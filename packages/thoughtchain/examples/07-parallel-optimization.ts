/**
 * Example 7: Parallel Execution Optimization
 *
 * Demonstrates parallel optimization and performance tuning.
 */

import { ThoughtChain, createMockVerifiers, QueryDecomposer } from '@superinstance/thoughtchain';

async function parallelOptimization() {
  console.log('=== Parallel Execution Optimization ===\n');

  const query = 'Explain the interconnected factors contributing to climate change and propose mitigation strategies.';

  // Analyze decomposition for parallel execution
  const decomposition = QueryDecomposer.decompose(query, { steps: 7 });
  const optimization = QueryDecomposer.optimizeForParallel(decomposition);

  console.log('=== Decomposition Analysis ===');
  console.log(`Total Steps: ${decomposition.totalSteps}`);
  console.log(`Parallel Groups: ${optimization.parallelGroups.length}`);
  console.log(`Estimated Speedup: ${optimization.estimatedSpeedup.toFixed(2)}x`);

  console.log('\n=== Execution Groups ===');
  for (let i = 0; i < optimization.parallelGroups.length; i++) {
    const group = optimization.parallelGroups[i];
    console.log(`Group ${i + 1}: Steps [${group.join(', ')}]`);

    for (const stepNum of group) {
      const step = decomposition.steps.find(s => s.step === stepNum);
      if (step) {
        console.log(`  Step ${stepNum}: ${step.question.substring(0, 60)}...`);
        console.log(`    Complexity: ${step.complexity}, Dependencies: [${step.dependencies.join(', ')}]`);
      }
    }
  }

  // Test with different verifier counts
  console.log('\n=== Verifier Count Performance ===');

  const verifierCounts = [1, 3, 5, 7];
  const results: Array<{
    verifiers: number;
    duration: number;
    confidence: number;
    parallelEfficiency: number;
  }> = [];

  for (const count of verifierCounts) {
    const verifiers = createMockVerifiers(count);
    const tc = new ThoughtChain(verifiers, {
      steps: 7,
      verifiers: count,
      explainReasoning: false,
    });

    const startTime = Date.now();
    const result = await tc.reason(query);
    const duration = Date.now() - startTime;

    // Calculate parallel efficiency (simplified)
    const sequentialTime = duration * count; // Rough estimate
    const parallelEfficiency = sequentialTime / duration / count;

    results.push({
      verifiers: count,
      duration,
      confidence: result.overallConfidence,
      parallelEfficiency,
    });

    console.log(`\n${count} Verifiers:`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Confidence: ${(result.overallConfidence * 100).toFixed(1)}%`);
    console.log(`  Parallel Efficiency: ${(parallelEfficiency * 100).toFixed(1)}%`);
  }

  // Find optimal configuration
  console.log('\n=== Optimal Configuration ===');

  const bestDuration = results.reduce((best, r) => (r.duration < best.duration ? r : best));
  const bestConfidence = results.reduce((best, r) => (r.confidence > best.confidence ? r : best));
  const bestEfficiency = results.reduce((best, r) => (r.parallelEfficiency > best.parallelEfficiency ? r : best));

  console.log(`Fastest: ${bestDuration.verifiers} verifiers (${bestDuration.duration}ms)`);
  console.log(`Highest Confidence: ${bestConfidence.verifiers} verifiers (${(bestConfidence.confidence * 100).toFixed(1)}%)`);
  console.log(`Most Efficient: ${bestEfficiency.verifiers} verifiers (${(bestEfficiency.parallelEfficiency * 100).toFixed(1)}%)`);

  // Cost-benefit analysis
  console.log('\n=== Cost-Benefit Analysis ===');
  console.log('Adding more verifiers provides:');
  console.log('✓ Higher confidence through cross-validation');
  console.log('✓ Better error detection');
  console.log('✗ Increased computation time');
  console.log('✗ Diminishing returns beyond 5 verifiers');

  // Recommendation
  console.log('\n=== Recommendation ===');
  if (bestConfidence.verifiers <= 3) {
    console.log(`Use ${bestConfidence.verifiers} verifiers for optimal balance`);
  } else if (bestDuration.verifiers === bestConfidence.verifiers) {
    console.log(`Use ${bestConfidence.verifiers} verifiers (best overall)`);
  } else {
    console.log(`Use 3 verifiers for general use, or ${bestConfidence.verifiers} for critical applications`);
  }

  // Demonstrate WebGPU potential
  console.log('\n=== WebGPU Potential ===');
  console.log('With WebGPU acceleration:');
  console.log('✓ Run models in parallel on GPU');
  console.log('✓ 10-100x speedup possible');
  console.log('✓ Support for larger models');
  console.log('✓ Better resource utilization');
  console.log('\nIntegration with NeuralStream planned for Q2 2026');
}

// Run the example
parallelOptimization().catch(console.error);
