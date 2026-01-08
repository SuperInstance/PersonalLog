/**
 * MPC Orchestration Example
 *
 * Using Model Predictive Control for multi-agent optimization
 */

import { mpcController, stateManager } from '../index';

async function demonstrateMPC() {
  console.log('=== MPC Orchestration Demo ===\n');

  // 1. Initialize state manager
  console.log('1. Initializing State Manager...');
  await stateManager.initialize({
    deviceType: 'desktop',
    cores: 8,
    memory: 16,
    gpu: true,
    gpuMemory: 8,
    score: 85,
  });

  const currentState = stateManager.getCurrentState();
  console.log(`✓ State initialized: ${currentState?.id}\n`);

  // 2. Initialize MPC controller
  console.log('2. Initializing MPC Controller...');
  await mpcController.initialize({
    horizon: {
      steps: 5,
      stepDuration: 60, // seconds
      totalDuration: 300, // 5 minutes
      replanInterval: 30, // replan every 30s
    },
    objective: {
      name: 'optimize_workflow',
      description: 'Optimize for speed and quality',
      weights: {
        timeWeight: 0.4,
        qualityWeight: 0.3,
        resourceWeight: 0.2,
        riskWeight: 0.1,
        priorityWeight: 0.0,
      },
      constraints: [],
    },
    maxParallelAgents: 3,
    enableReplanning: true,
    predictionUpdateInterval: 10000,
    stateHistorySize: 100,
    anomalyThreshold: 0.8,
    conflictStrategy: 'hybrid',
    hardwareProfile: {
      deviceType: 'desktop',
      cores: 8,
      memory: 16,
      gpu: true,
      gpuMemory: 8,
      score: 85,
    },
  });
  console.log('✓ MPC controller initialized\n');

  // 3. Start MPC controller
  console.log('3. Starting MPC Controller...');
  await mpcController.start();
  console.log(`✓ Status: ${mpcController.getStatus()}\n`);

  // 4. Create optimal plan
  console.log('4. Creating optimal plan...');
  const plan = await mpcController.plan();
  console.log(`✓ Plan created: ${plan.id}`);
  console.log(`  Expected quality: ${(plan.expectedQuality * 100).toFixed(0)}%`);
  console.log(`  Risk level: ${(plan.risk * 100).toFixed(0)}%`);
  console.log(`  Confidence: ${(plan.confidence * 100).toFixed(0)}%`);
  console.log(`  Steps: ${plan.steps.length}\n`);

  // 5. Show plan details
  console.log('5. Plan Details:');
  console.log(`  Horizon: ${plan.horizon.steps} steps × ${plan.horizon.stepDuration}s`);
  console.log(`  Total duration: ${plan.horizon.totalDuration}s`);
  console.log(`  Replan interval: ${plan.horizon.replanInterval}s`);
  console.log(`  Expected completion: ${new Date(plan.expectedCompletionTime).toLocaleString()}\n`);

  // 6. Get state history
  console.log('6. State History:');
  const history = stateManager.getStateHistory();
  console.log(`  History size: ${history.length} states\n`);

  // 7. Stop MPC
  console.log('7. Stopping MPC Controller...');
  await mpcController.stop();
  console.log(`✓ Status: ${mpcController.getStatus()}\n`);

  console.log('=== Demo Complete ===');
}

demonstrateMPC().catch(console.error);
