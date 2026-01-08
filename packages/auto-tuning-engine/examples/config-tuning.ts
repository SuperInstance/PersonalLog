/**
 * Configuration Tuning Example
 *
 * Demonstrates different tuning algorithms for configuration optimization
 */

import { configTuner } from '../src';

async function main() {
  console.log('=== Configuration Tuning ===\n');

  // 1. Get registered parameters
  console.log('1. Registered parameters:');
  const parameters = configTuner.getAllParameters();
  console.log(`   Total parameters: ${parameters.length}`);

  for (const param of parameters) {
    console.log(`   - ${param.name}`);
    console.log(`     Current: ${param.current}`);
    console.log(`     Range: ${param.min} - ${param.max}`);
    console.log(`     Optimize: ${param.optimize}`);
    console.log(`     Targets: ${param.targets.join(', ')}`);
    console.log('');
  }

  // 2. Hill climbing optimization
  console.log('2. Hill Climbing Optimization (fast local search):');
  const hillClimbingResult = await configTuner.autoTune('cacheMaxSize', {
    exploration: 'hill_climbing',
  });

  if (hillClimbingResult) {
    console.log(`   Original: ${hillClimbingResult.original}`);
    console.log(`   Optimized: ${hillClimbingResult.optimized.toFixed(0)}`);
    console.log(`   Improvement: ${hillClimbingResult.improvement.toFixed(1)}%`);
    console.log(`   Iterations: ${hillClimbingResult.iterations}`);
    console.log(`   Converged: ${hillClimbingResult.converged}`);
  }

  // 3. Bayesian optimization
  console.log('\n3. Bayesian Optimization (balances exploration/exploitation):');
  const bayesianResult = await configTuner.autoTune('apiTimeout', {
    exploration: 'bayesian',
  });

  if (bayesianResult) {
    console.log(`   Original: ${bayesianResult.original}`);
    console.log(`   Optimized: ${bayesianResult.optimized.toFixed(0)}`);
    console.log(`   Improvement: ${bayesianResult.improvement.toFixed(1)}%`);
    console.log(`   Iterations: ${bayesianResult.iterations}`);
    console.log(`   Converged: ${bayesianResult.converged}`);
  }

  // 4. Multi-armed bandit
  console.log('\n4. Multi-Armed Bandit (best for discrete choices):');
  const banditResult = await configTuner.autoTune('messageBatchSize', {
    exploration: 'bandit',
  });

  if (banditResult) {
    console.log(`   Original: ${banditResult.original}`);
    console.log(`   Optimized: ${banditResult.optimized.toFixed(0)}`);
    console.log(`   Improvement: ${banditResult.improvement.toFixed(1)}%`);
    console.log(`   Iterations: ${banditResult.iterations}`);
  }

  // 5. Genetic algorithm
  console.log('\n5. Genetic Algorithm (best for complex optimization):');
  const geneticResult = await configTuner.autoTune('memoryCacheLimit', {
    exploration: 'genetic',
  });

  if (geneticResult) {
    console.log(`   Original: ${geneticResult.original}`);
    console.log(`   Optimized: ${geneticResult.optimized.toFixed(0)}`);
    console.log(`   Improvement: ${geneticResult.improvement.toFixed(1)}%`);
    console.log(`   Iterations: ${geneticResult.iterations}`);
  }

  // 6. Multi-objective optimization
  console.log('\n6. Multi-Objective Optimization:');
  const multiResults = await configTuner.multiObjectiveTune(
    ['cacheMaxSize', 'apiTimeout'],
    [
      { metric: 'response-latency', direction: 'minimize', weight: 0.6 },
      { metric: 'memory-usage', direction: 'minimize', weight: 0.4 },
    ]
  );

  for (const [name, result] of multiResults.entries()) {
    console.log(`   ${name}:`);
    console.log(`     Original: ${result.original}`);
    console.log(`     Optimized: ${result.optimized.toFixed(0)}`);
    console.log(`     Improvement: ${result.improvement.toFixed(1)}%`);
  }

  // 7. Show tuning history
  console.log('\n7. Tuning history:');
  const history = configTuner.getHistory();
  console.log(`   Total tunings: ${history.length}`);
}

main().catch(console.error);
