/**
 * Event-Driven MPC Example
 *
 * This example demonstrates how to use MPC events for reactive orchestration.
 */

import {
  mpcController,
  stateManager,
  MPCEventType,
  TaskPriority,
  ResourceType
} from '../src';

async function eventExample() {
  console.log('=== MPC Event-Driven Example ===\n');

  // Setup
  const hardwareProfile = {
    cpu: { cores: 4, concurrency: 4 },
    gpu: { available: true },
    memory: { totalGB: 8 },
    network: { downlinkMbps: 50 }
  };

  const config = {
    horizon: {
      steps: 10,
      stepDuration: 60,
      totalDuration: 600,
      replanInterval: 30
    },
    objective: {
      name: 'reactive',
      description: 'Reactive to events',
      weights: {
        timeWeight: 1.0,
        qualityWeight: 1.0,
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
    conflictStrategy: 'hybrid' as const,
    hardwareProfile
  };

  await mpcController.initialize(config);

  // Register event listeners
  console.log('1. Registering event listeners...\n');

  // Listen for state changes
  mpcController.addEventListener(MPCEventType.STATE_CHANGED, (event) => {
    console.log(`📊 State Changed: ${new Date(event.timestamp).toLocaleTimeString()}`);
    if ('status' in event.data) {
      console.log(`   New status: ${event.data.status}`);
    }
  });

  // Listen for plan creation
  mpcController.addEventListener(MPCEventType.PLAN_CREATED, (event) => {
    const { planId, duration, steps, expectedQuality, risk } = event.data as {
      planId: string;
      duration: number;
      steps: number;
      expectedQuality: number;
      risk: number;
    };
    console.log(`🎯 Plan Created: ${planId}`);
    console.log(`   Generated in: ${duration}ms`);
    console.log(`   Steps: ${steps}`);
    console.log(`   Expected quality: ${(expectedQuality * 100).toFixed(1)}%`);
    console.log(`   Risk: ${(risk * 100).toFixed(1)}%\n`);
  });

  // Listen for plan execution start
  mpcController.addEventListener(MPCEventType.PLAN_STARTED, (event) => {
    console.log(`🚀 Plan Started`);
    console.log(`   Replan interval: ${(event.data as { interval: number }).interval}ms\n`);
  });

  // Listen for conflicts
  mpcController.addEventListener(MPCEventType.CONFLICT_DETECTED, (event) => {
    const conflict = event.data.conflict as {
      id: string;
      resourceType: string;
      type: string;
      severity: number;
      taskIds: string[];
    };
    console.log(`⚠️  Conflict Detected: ${conflict.id}`);
    console.log(`   Type: ${conflict.type}`);
    console.log(`   Resource: ${conflict.resourceType}`);
    console.log(`   Severity: ${(conflict.severity * 100).toFixed(1)}%`);
    console.log(`   Tasks: ${conflict.taskIds.join(', ')}`);

    // Automatically trigger replanning on conflicts
    console.log('   → Triggering replanning...\n');
    mpcController.triggerReplan().catch(console.error);
  });

  // Listen for conflict resolution
  mpcController.addEventListener(MPCEventType.CONFLICT_RESOLVED, (event) => {
    const { conflictId, resolution, tasksYielded } = event.data as {
      conflictId: string;
      resolution: string;
      tasksYielded: string[];
    };
    console.log(`✅ Conflict Resolved: ${conflictId}`);
    console.log(`   Resolution: ${resolution}`);
    console.log(`   Tasks yielded: ${tasksYielded.join(', ') || 'none'}\n`);
  });

  // Listen for anomalies
  mpcController.addEventListener(MPCEventType.ANOMALY_DETECTED, (event) => {
    const anomaly = event.data.anomaly as {
      id: string;
      type: string;
      severity: number;
      description: string;
      suggestedActions: string[];
    };
    console.log(`🔍 Anomaly Detected: ${anomaly.id}`);
    console.log(`   Type: ${anomaly.type}`);
    console.log(`   Severity: ${(anomaly.severity * 100).toFixed(1)}%`);
    console.log(`   Description: ${anomaly.description}`);
    console.log(`   Suggested actions:`);
    for (const action of anomaly.suggestedActions) {
      console.log(`     - ${action}`);
    }
    console.log();
  });

  // Listen for agent assignments
  mpcController.addEventListener(MPCEventType.AGENT_ASSIGNED, (event) => {
    const { agentId, taskId } = event.data as { agentId: string; taskId: string };
    console.log(`👤 Agent Assigned: ${agentId} → ${taskId}`);
  });

  // Listen for task completion
  mpcController.addEventListener(MPCEventType.TASK_COMPLETED, (event) => {
    console.log(`✅ Task Completed: ${(event.data as { taskId: string }).taskId}\n`);
  });

  // Listen for task failures
  mpcController.addEventListener(MPCEventType.TASK_FAILED, (event) => {
    const { taskId, error } = event.data as { taskId: string; error: string };
    console.log(`❌ Task Failed: ${taskId}`);
    console.log(`   Error: ${error}\n`);
  });

  // Listen for plan completion
  mpcController.addEventListener(MPCEventType.PLAN_COMPLETED, (event) => {
    console.log(`🏁 Plan Completed\n`);
  });

  // Listen for plan failures
  mpcController.addEventListener(MPCEventType.PLAN_FAILED, (event) => {
    console.log(`💥 Plan Failed: ${(event.data as { error: string }).error}\n`);
  });

  // Listen for replanning
  mpcController.addEventListener(MPCEventType.REPLAN_TRIGGERED, (event) => {
    console.log(`🔄 Replan Triggered: ${(event.data as { reason: string }).reason}\n`);
  });

  console.log('✓ Event listeners registered\n');

  // Add agents and tasks to trigger events
  console.log('2. Adding agents and tasks...\n');

  await stateManager.registerAgent({
    id: 'worker-1',
    name: 'Worker 1',
    description: 'CPU worker'
  });

  await stateManager.registerAgent({
    id: 'worker-2',
    name: 'Worker 2',
    description: 'GPU worker'
  });

  // Add tasks that will compete for resources
  await stateManager.addTask({
    id: 'cpu-task-1',
    name: 'CPU-intensive task 1',
    description: 'Heavy CPU processing',
    agentId: 'worker-1',
    priority: TaskPriority.HIGH,
    estimatedDuration: 180,
    resourceRequirements: new Map([
      [ResourceType.CPU, 4], // All CPU cores
      [ResourceType.MEMORY, 2048]
    ]),
    dependencies: [],
    createdAt: Date.now(),
    status: 'pending'
  });

  await stateManager.addTask({
    id: 'cpu-task-2',
    name: 'CPU-intensive task 2',
    description: 'Another heavy CPU task',
    agentId: 'worker-2',
    priority: TaskPriority.NORMAL,
    estimatedDuration: 120,
    resourceRequirements: new Map([
      [ResourceType.CPU, 3],
      [ResourceType.MEMORY, 1024]
    ]),
    dependencies: [],
    createdAt: Date.now(),
    status: 'pending'
  });

  await stateManager.addTask({
    id: 'mixed-task',
    name: 'Mixed resource task',
    description: 'Uses CPU and GPU',
    agentId: 'worker-2',
    priority: TaskPriority.LOW,
    estimatedDuration: 90,
    resourceRequirements: new Map([
      [ResourceType.CPU, 2],
      [ResourceType.GPU, 1],
      [ResourceType.MEMORY, 512]
    ]),
    dependencies: [],
    createdAt: Date.now(),
    status: 'pending'
  });

  console.log('✓ 3 tasks added\n');

  // Generate a plan (will trigger PLAN_CREATED event)
  console.log('3. Generating plan...\n');
  const plan = await mpcController.plan();

  // Display summary
  console.log('4. Plan Summary:');
  console.log(`   Steps: ${plan.steps.length}`);
  console.log(`   Predicted conflicts: ${plan.predictedConflicts.length}`);
  console.log(`   Expected quality: ${(plan.expectedQuality * 100).toFixed(1)}%`);
  console.log(`   Risk: ${(plan.risk * 100).toFixed(1)}%\n`);

  // Note: In a real application, you would start the controller
  // await mpcController.start();

  console.log('=== Event-Driven Example Complete ===');
  console.log('\n💡 In a real application, the controller would be running');
  console.log('   and you would see events as tasks are executed, conflicts');
  console.log('   are detected, and replanning occurs.\n');
}

// Run the example
eventExample().catch(console.error);
