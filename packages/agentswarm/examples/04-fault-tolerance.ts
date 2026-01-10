/**
 * Example 4: Fault Tolerance
 *
 * Demonstrates:
 * - Handling agent failures gracefully
 * - Retry strategies
 * - Task reposting
 * - Graceful degradation
 * - System resilience
 */

import { AgentSwarm } from '@superinstance/agentswarm';

async function demonstrateFaultTolerance() {
  console.log('🛡️ Demonstrating Fault Tolerance\n');

  // Create a swarm with retry-based fault tolerance
  const swarm = new AgentSwarm({
    agents: [
      {
        id: 'reliable-agent',
        name: 'Reliable Agent',
        capabilities: [
          { name: 'task-execution', proficiency: 0.95, usageCount: 100, successRate: 0.95, avgExecutionTime: 1000 }
        ],
        minBid: 20,
        maxTasks: 5,
        riskTolerance: 0.5,
        learningRate: 0.1
      },
      {
        id: 'unreliable-agent',
        name: 'Unreliable Agent',
        capabilities: [
          { name: 'task-execution', proficiency: 0.6, usageCount: 50, successRate: 0.6, avgExecutionTime: 2000 }
        ],
        minBid: 10,
        maxTasks: 3,
        riskTolerance: 0.7,
        learningRate: 0.1
      }
    ],
    market: {
      type: 'double-auction',
      transactionFee: 0.05,
      reputationSystem: true,
      reputationWeight: 0.3,
      minReputation: 0.2
    },
    decompositionStrategy: 'flat',
    maxDecompositionDepth: 2,
    aggregationStrategy: 'merge',
    faultTolerance: 'retry', // Try retry strategy
    maxRetries: 3,
    loadBalancing: 'market-based'
  });

  console.log('--- Testing Retry Strategy ---\n');

  // Execute a complex task that may fail
  const result = await swarm.execute({
    task: 'Execute complex multi-step process',
    budget: 200,
    timeout: 10000,
    priority: 7,
    capabilities: ['task-execution']
  });

  console.log('✅ Task Completed (with fault tolerance)\n');
  console.log(`Success Rate: ${(result.successRate * 100).toFixed(1)}%`);
  console.log(`Total Cost: ${result.totalCost} tokens`);
  console.log(`Agents Involved: ${result.agentsInvolved}`);
  console.log(`Subtasks: ${result.subtasks.length}`);

  // Now test with repost strategy
  console.log('\n--- Testing Repost Strategy ---\n');

  const swarmRepost = new AgentSwarm({
    agents: [
      {
        id: 'backup-agent-1',
        name: 'Backup Agent 1',
        capabilities: [
          { name: 'task-execution', proficiency: 0.8, usageCount: 30, successRate: 0.8, avgExecutionTime: 1500 }
        ],
        minBid: 15,
        maxTasks: 4,
        riskTolerance: 0.5,
        learningRate: 0.1
      },
      {
        id: 'backup-agent-2',
        name: 'Backup Agent 2',
        capabilities: [
          { name: 'task-execution', proficiency: 0.85, usageCount: 40, successRate: 0.85, avgExecutionTime: 1200 }
        ],
        minBid: 18,
        maxTasks: 4,
        riskTolerance: 0.5,
        learningRate: 0.1
      }
    ],
    market: {
      type: 'double-auction',
      transactionFee: 0.05,
      reputationSystem: true,
      reputationWeight: 0.3,
      minReputation: 0.2
    },
    decompositionStrategy: 'flat',
    maxDecompositionDepth: 2,
    aggregationStrategy: 'merge',
    faultTolerance: 'repost', // Repost failed tasks
    maxRetries: 2,
    loadBalancing: 'market-based'
  });

  const resultRepost = await swarmRepost.execute({
    task: 'Execute with repost fallback',
    budget: 200,
    timeout: 10000,
    priority: 7,
    capabilities: ['task-execution']
  });

  console.log('✅ Task Completed (with repost)\n');
  console.log(`Success Rate: ${(resultRepost.successRate * 100).toFixed(1)}%`);
  console.log(`Total Cost: ${resultRepost.totalCost} tokens`);

  // Demonstrate ignore strategy
  console.log('\n--- Testing Ignore Strategy ---\n');

  const swarmIgnore = new AgentSwarm({
    agents: [
      {
        id: 'primary-agent',
        name: 'Primary Agent',
        capabilities: [
          { name: 'task-execution', proficiency: 0.9, usageCount: 80, successRate: 0.9, avgExecutionTime: 1000 }
        ],
        minBid: 25,
        maxTasks: 5,
        riskTolerance: 0.4,
        learningRate: 0.1
      }
    ],
    market: {
      type: 'double-auction',
      transactionFee: 0.05,
      reputationSystem: true,
      reputationWeight: 0.3,
      minReputation: 0.2
    },
    decompositionStrategy: 'flat',
    maxDecompositionDepth: 2,
    aggregationStrategy: 'merge',
    faultTolerance: 'ignore', // Continue without failed subtasks
    maxRetries: 0,
    loadBalancing: 'market-based'
  });

  const resultIgnore = await swarmIgnore.execute({
    task: 'Execute with ignore on failure',
    budget: 200,
    timeout: 10000,
    priority: 5,
    capabilities: ['task-execution']
  });

  console.log('✅ Task Completed (ignoring failures)\n');
  console.log(`Success Rate: ${(resultIgnore.successRate * 100).toFixed(1)}%`);
  console.log('Note: Failed subtasks were ignored, partial results returned');

  console.log('\n💡 Key Insights:');
  console.log('1. Retry: Attempts failed subtasks multiple times (higher cost, better success)');
  console.log('2. Repost: Re-lists failed tasks with higher budget (fast, but expensive)');
  console.log('3. Ignore: Continues without failed subtasks (fastest, partial results)');

  console.log('\n✅ Fault tolerance demonstration complete!');
}

demonstrateFaultTolerance().catch(console.error);
