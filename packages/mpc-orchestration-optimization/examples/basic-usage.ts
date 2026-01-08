/**
 * Basic MPC Usage Example
 *
 * This example demonstrates the basic setup and usage of the MPC orchestration system.
 */

import {
  mpcController,
  stateManager,
  TaskPriority,
  ResourceType
} from '../src';

async function basicExample() {
  console.log('=== MPC Basic Usage Example ===\n');

  // 1. Create hardware profile
  const hardwareProfile = {
    cpu: { cores: 8, concurrency: 8 },
    gpu: { available: true },
    memory: { totalGB: 16 },
    network: { downlinkMbps: 100 }
  };

  // 2. Configure MPC
  const config = {
    horizon: {
      steps: 10,
      stepDuration: 60,  // 60 seconds per step
      totalDuration: 600, // 10 minutes total
      replanInterval: 30 // Replan every 30 seconds
    },
    objective: {
      name: 'balanced',
      description: 'Balance time, quality, and resources',
      weights: {
        timeWeight: 1.0,
        qualityWeight: 1.0,
        resourceWeight: 1.0,
        riskWeight: 1.0,
        priorityWeight: 1.0
      },
      constraints: []
    },
    maxParallelAgents: 4,
    enableReplanning: 1,
    predictionUpdateInterval: 1000,
    stateHistorySize: 1000,
    anomalyThreshold: 0.7,
    conflictStrategy: 'hybrid' as const,
    hardwareProfile
  };

  // 3. Initialize controller
  console.log('1. Initializing MPC controller...');
  await mpcController.initialize(config);
  console.log('   ✓ Controller initialized\n');

  // 4. Register agents
  console.log('2. Registering agents...');
  await stateManager.registerAgent({
    id: 'data-processor',
    name: 'Data Processor',
    description: 'Processes large datasets'
  });

  await stateManager.registerAgent({
    id: 'analyzer',
    name: 'Analyzer',
    description: 'Analyzes processed data'
  });

  await stateManager.registerAgent({
    id: 'reporter',
    name: 'Reporter',
    description: 'Generates reports'
  });
  console.log('   ✓ 3 agents registered\n');

  // 5. Add tasks with dependencies
  console.log('3. Adding tasks...');

  // Task 1: Process data (no dependencies)
  await stateManager.addTask({
    id: 'task-1',
    name: 'Process dataset',
    description: 'Process the main dataset',
    agentId: 'data-processor',
    priority: TaskPriority.HIGH,
    estimatedDuration: 120, // 2 minutes
    resourceRequirements: new Map([
      [ResourceType.CPU, 4],
      [ResourceType.MEMORY, 2048] // 2GB
    ]),
    dependencies: [],
    createdAt: Date.now(),
    status: 'pending'
  });
  console.log('   ✓ Task 1 added: Process dataset');

  // Task 2: Analyze data (depends on task 1)
  await stateManager.addTask({
    id: 'task-2',
    name: 'Analyze results',
    description: 'Analyze the processed data',
    agentId: 'analyzer',
    priority: TaskPriority.NORMAL,
    estimatedDuration: 90, // 1.5 minutes
    resourceRequirements: new Map([
      [ResourceType.CPU, 2],
      [ResourceType.MEMORY, 1024]
    ]),
    dependencies: ['task-1'],
    createdAt: Date.now(),
    status: 'pending'
  });
  console.log('   ✓ Task 2 added: Analyze results (depends on task 1)');

  // Task 3: Generate report (depends on task 2)
  await stateManager.addTask({
    id: 'task-3',
    name: 'Generate report',
    description: 'Generate analysis report',
    agentId: 'reporter',
    priority: TaskPriority.NORMAL,
    estimatedDuration: 60, // 1 minute
    resourceRequirements: new Map([
      [ResourceType.CPU, 1],
      [ResourceType.MEMORY, 512]
    ]),
    dependencies: ['task-2'],
    createdAt: Date.now(),
    status: 'pending'
  });
  console.log('   ✓ Task 3 added: Generate report (depends on task 2)\n');

  // 6. Generate optimal plan
  console.log('4. Generating optimal plan...');
  const plan = await mpcController.plan();

  console.log(`   ✓ Plan generated:`);
  console.log(`     - Steps: ${plan.steps.length}`);
  console.log(`     - Expected quality: ${(plan.expectedQuality * 100).toFixed(1)}%`);
  console.log(`     - Risk level: ${(plan.risk * 100).toFixed(1)}%`);
  console.log(`     - Confidence: ${(plan.confidence * 100).toFixed(1)}%`);
  console.log(`     - Predicted conflicts: ${plan.predictedConflicts.length}`);
  console.log(`     - Total cost: ${plan.totalCost.toFixed(2)}\n`);

  // 7. Display plan steps
  console.log('5. Plan execution schedule:');
  for (const step of plan.steps) {
    console.log(`   Step ${step.step}:`);
    console.log(`     Tasks: ${step.tasks.join(', ')}`);
    console.log(`     Risk: ${(step.risk * 100).toFixed(1)}%`);
    console.log(`     Confidence: ${(step.confidence * 100).toFixed(1)}%`);
    console.log(`     Resources:`);
    for (const [type, amount] of step.resourceUsage) {
      console.log(`       ${type}: ${amount}`);
    }
  }
  console.log();

  // 8. Show resource allocation
  console.log('6. Agent assignments:');
  for (const [agentId, taskIds] of plan.agentAssignments) {
    console.log(`   ${agentId}: ${taskIds.join(', ')}`);
  }
  console.log();

  // 9. Check for conflicts
  if (plan.predictedConflicts.length > 0) {
    console.log('7. Predicted conflicts:');
    for (const conflict of plan.predictedConflicts) {
      console.log(`   ⚠️  ${conflict.resourceType}: ${conflict.type}`);
      console.log(`      Tasks: ${conflict.taskIds.join(', ')}`);
      console.log(`      Severity: ${(conflict.severity * 100).toFixed(1)}%`);
      console.log(`      Resolution: ${conflict.resolution?.strategy}`);
    }
  } else {
    console.log('7. ✓ No conflicts predicted\n');
  }

  console.log('=== Example Complete ===');
}

// Run the example
basicExample().catch(console.error);
