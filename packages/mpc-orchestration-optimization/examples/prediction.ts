/**
 * Prediction and Analysis Example
 *
 * This example demonstrates the prediction capabilities of the MPC system.
 */

import {
  predictionEngine,
  stateManager,
  mpcController,
  TaskPriority,
  ResourceType
} from '../src';

async function predictionExample() {
  console.log('=== MPC Prediction Example ===\n');

  // Setup (simplified)
  const hardwareProfile = {
    cpu: { cores: 4, concurrency: 4 },
    gpu: { available: true },
    memory: { totalGB: 8 },
    network: { downlinkMbps: 50 }
  };

  const config = {
    horizon: {
      steps: 5,
      stepDuration: 60,
      totalDuration: 300,
      replanInterval: 30
    },
    objective: {
      name: 'quality-focused',
      description: 'Maximize quality',
      weights: {
        timeWeight: 0.5,
        qualityWeight: 2.0,
        resourceWeight: 1.0,
        riskWeight: 1.0,
        priorityWeight: 1.0
      },
      constraints: []
    },
    maxParallelAgents: 2,
    enableReplanning: 1,
    predictionUpdateInterval: 1000,
    stateHistorySize: 100,
    anomalyThreshold: 0.7,
    conflictStrategy: 'preventive' as const,
    hardwareProfile
  };

  await mpcController.initialize(config);
  await stateManager.registerAgent({
    id: 'ml-processor',
    name: 'ML Processor',
    description: 'Processes ML workloads'
  });

  // Add a task
  await stateManager.addTask({
    id: 'ml-task',
    name: 'Train model',
    description: 'Train machine learning model',
    agentId: 'ml-processor',
    priority: TaskPriority.HIGH,
    estimatedDuration: 300,
    resourceRequirements: new Map([
      [ResourceType.CPU, 4],
      [ResourceType.GPU, 1],
      [ResourceType.MEMORY, 4096]
    ]),
    dependencies: [],
    createdAt: Date.now(),
    status: 'pending'
  });

  const state = stateManager.getCurrentState();
  if (!state) {
    console.error('State not available');
    return;
  }

  // 1. Predict agent outcome
  console.log('1. Agent Outcome Prediction:');
  const outcome = await predictionEngine.predictAgentOutcome(
    state,
    'ml-processor',
    'ml-task'
  );

  console.log(`   Agent: ${outcome.agentId}`);
  console.log(`   Task: ${outcome.taskId}`);
  console.log(`   Success probability: ${(outcome.successProbability.value * 100).toFixed(1)}%`);
  console.log(`   Confidence: ${(outcome.successProbability.confidence * 100).toFixed(1)}%`);
  console.log(`   Range: ${(outcome.successProbability.lowerBound * 100).toFixed(1)}% - ${(outcome.successProbability.upperBound * 100).toFixed(1)}%`);
  console.log(`   Expected quality: ${(outcome.qualityScore.value * 100).toFixed(1)}%`);
  console.log(`   Range: ${(outcome.qualityScore.lowerBound * 100).toFixed(1)}% - ${(outcome.qualityScore.upperBound * 100).toFixed(1)}%`);

  if (outcome.potentialFailures.length > 0) {
    console.log(`   ⚠️  Potential failure modes:`);
    for (const failure of outcome.potentialFailures) {
      console.log(`      - ${failure.mode} (${(failure.probability * 100).toFixed(1)}%)`);
      console.log(`        Mitigations: ${failure.mitigations.join(', ')}`);
    }
  }
  console.log();

  // 2. Predict resource usage
  console.log('2. Resource Usage Prediction:');
  const resourcePredictions = await predictionEngine.predictResourceUsage(
    state,
    'ml-task'
  );

  for (const [resourceType, prediction] of resourcePredictions) {
    console.log(`   ${resourceType}:`);
    console.log(`     Expected: ${prediction.usage.value.toFixed(2)} (${prediction.usage.unit || 'units'})`);
    console.log(`     Peak: ${prediction.peakUsage.value.toFixed(2)}`);
    console.log(`     Duration: ${prediction.duration.value.toFixed(1)}s`);
    console.log(`     Confidence: ${(prediction.usage.confidence * 100).toFixed(1)}%`);

    if (prediction.conflicts.length > 0) {
      console.log(`     ⚠️  ${prediction.conflicts.length} conflict(s) predicted:`);
      for (const conflict of prediction.conflicts) {
        console.log(`        - Type: ${conflict.type}`);
        console.log(`          Tasks: ${conflict.taskIds.join(', ')}`);
        console.log(`          Severity: ${(conflict.severity * 100).toFixed(1)}%`);
        if (conflict.resolution) {
          console.log(`          Resolution: ${conflict.resolution.strategy}`);
        }
      }
    }
  }
  console.log();

  // 3. Predict completion time
  console.log('3. Completion Time Prediction:');
  const completionTime = await predictionEngine.predictCompletionTime(
    state,
    'ml-task'
  );

  console.log(`   Task: ${completionTime.taskId}`);
  console.log(`   Expected completion: ${new Date(completionTime.completionTime.value).toLocaleString()}`);
  console.log(`   Duration: ${completionTime.duration.value.toFixed(1)}s`);
  console.log(`   Confidence: ${(completionTime.duration.confidence * 100).toFixed(1)}%`);
  console.log(`   Range: ${completionTime.duration.lowerBound.toFixed(1)}s - ${completionTime.duration.upperBound.toFixed(1)}s`);

  if (completionTime.factors.length > 0) {
    console.log(`   Factors affecting prediction:`);
    for (const factor of completionTime.factors) {
      const arrow = factor.impact > 0 ? '↑' : factor.impact < 0 ? '↓' : '→';
      console.log(`     ${arrow} ${factor.factor}: ${(factor.impact * 100).toFixed(1)}% (confidence: ${(factor.confidence * 100).toFixed(1)}%)`);
    }
  }
  console.log();

  // 4. Scenario simulation
  console.log('4. Scenario Simulation (What-If Analysis):');
  console.log('   Simulating: Double CPU cores');
  const scenario = await predictionEngine.simulateScenario(
    state,
    [
      {
        variable: 'resources.CPU.available',
        original: 4,
        modified: 8
      }
    ],
    {
      steps: 5,
      stepDuration: 60,
      totalDuration: 300,
      replanInterval: 30
    }
  );

  console.log(`   Results:`);
  console.log(`     Time difference: ${scenario.comparison.timeDiff > 0 ? '+' : ''}${scenario.comparison.timeDiff}ms`);
  console.log(`     Quality difference: ${scenario.comparison.qualityDiff > 0 ? '+' : ''}${(scenario.comparison.qualityDiff * 100).toFixed(2)}%`);
  console.log(`     Resource util. difference: ${scenario.comparison.resourceUtilDiff > 0 ? '+' : ''}${(scenario.comparison.resourceUtilDiff * 100).toFixed(2)}%`);
  console.log(`     Risk difference: ${scenario.comparison.riskDiff > 0 ? '+' : ''}${(scenario.comparison.riskDiff * 100).toFixed(2)}%`);

  if (scenario.comparison.timeDiff < 0) {
    console.log(`     ✅ Scenario would improve completion time by ${Math.abs(scenario.comparison.timeDiff)}ms`);
  }
  console.log();

  // 5. Predict future states
  console.log('5. Future State Prediction:');
  const futureStates = await predictionEngine.predictFutureStates(
    state,
    {
      steps: 3,
      stepDuration: 60,
      totalDuration: 180,
      replanInterval: 30
    }
  );

  console.log(`   Predicting ${futureStates.length} future states:`);
  for (let i = 0; i < futureStates.length; i++) {
    const futureState = futureStates[i];
    console.log(`   Step ${i + 1}:`);
    console.log(`     Status: ${futureState.status}`);
    console.log(`     Pending tasks: ${Array.from(futureState.tasks.values()).filter(t => t.status === 'pending').length}`);
    console.log(`     Running tasks: ${Array.from(futureState.tasks.values()).filter(t => t.status === 'running').length}`);
    console.log(`     Completed tasks: ${Array.from(futureState.tasks.values()).filter(t => t.status === 'complete').length}`);
  }
  console.log();

  // 6. Learning from completion
  console.log('6. Learning from Task Completion:');
  console.log('   Simulating task completion with actual metrics...');
  await predictionEngine.learnFromTask(
    state.tasks.get('ml-task')!,
    280, // Actual duration was 280s (better than estimated 300s)
    true, // Task succeeded
    0.92 // Quality score
  );
  console.log('   ✓ MPC learned from this task');

  const patterns = predictionEngine.getPatterns();
  if (patterns.has('ml-processor')) {
    const pattern = patterns.get('ml-processor')!;
    console.log(`   Updated pattern for ml-processor:`);
    console.log(`     Sample size: ${pattern.sampleSize}`);
    console.log(`     Avg duration ratio: ${pattern.avgDurationRatio.toFixed(3)} (actual/estimated)`);
    console.log(`     Success rate: ${(pattern.successRate * 100).toFixed(1)}%`);
    console.log(`     Avg quality: ${(pattern.avgQualityScore * 100).toFixed(1)}%`);
  }
  console.log();

  console.log('=== Prediction Example Complete ===');
}

// Run the example
predictionExample().catch(console.error);
