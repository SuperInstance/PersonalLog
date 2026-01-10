/**
 * Example 1: Basic AgentSwarm Usage
 *
 * Demonstrates:
 * - Creating agents with different capabilities
 * - Setting up a swarm
 * - Executing a simple task
 * - Getting results and metrics
 */

import { AgentSwarm } from '@superinstance/agentswarm';

// Step 1: Define agents with different capabilities
const researcher = new AgentSwarm({
  agents: [
    {
      id: 'web-scraper',
      name: 'Web Scraper',
      capabilities: [
        {
          name: 'web-scraping',
          proficiency: 0.9,
          usageCount: 50,
          successRate: 0.95,
          avgExecutionTime: 2000
        }
      ],
      minBid: 10,
      maxTasks: 5,
      riskTolerance: 0.5,
      learningRate: 0.1
    },
    {
      id: 'content-writer',
      name: 'Content Writer',
      capabilities: [
        {
          name: 'content-generation',
          proficiency: 0.85,
          usageCount: 100,
          successRate: 0.92,
          avgExecutionTime: 3000
        }
      ],
      minBid: 15,
      maxTasks: 3,
      riskTolerance: 0.6,
      learningRate: 0.15
    }
  ],
  market: {
    type: 'double-auction',
    transactionFee: 0.05,
    reputationSystem: true,
    reputationWeight: 0.3,
    minReputation: 0.3
  },
  decompositionStrategy: 'flat',
  maxDecompositionDepth: 2,
  aggregationStrategy: 'merge',
  faultTolerance: 'retry',
  maxRetries: 3,
  loadBalancing: 'market-based'
});

// Step 2: Execute a task
async function runExample() {
  console.log('🚀 Starting Basic AgentSwarm Example\n');

  const result = await researcher.execute({
    task: 'Research WebGPU performance and write a summary',
    budget: 500,
    timeout: 30000,
    priority: 5,
    capabilities: ['web-scraping', 'content-generation']
  });

  // Step 3: Display results
  console.log('✅ Task Completed!\n');
  console.log('Final Output:', result.finalOutput);
  console.log('\n--- Execution Summary ---');
  console.log(`Total Cost: ${result.totalCost} tokens`);
  console.log(`Budget Savings: ${result.savings} tokens`);
  console.log(`Execution Time: ${result.totalDuration}ms`);
  console.log(`Agents Involved: ${result.agentsInvolved}`);
  console.log(`Success Rate: ${(result.successRate * 100).toFixed(1)}%`);
  console.log(`Average Quality: ${(result.avgQuality * 100).toFixed(1)}%`);

  console.log('\n--- Subtasks ---');
  for (const subtask of result.subtasks) {
    console.log(`\nAgent: ${subtask.agent}`);
    console.log(`Cost: ${subtask.cost} tokens`);
    console.log(`Quality: ${(subtask.quality * 100).toFixed(1)}%`);
    console.log(`Output:`, subtask.output);
  }

  // Step 4: Get swarm statistics
  const stats = researcher.getSwarmStats();
  console.log('\n--- Swarm Statistics ---');
  console.log(`Total Agents: ${stats.totalAgents}`);
  console.log(`Total Executions: ${stats.totalExecutions}`);
  console.log(`Average Success Rate: ${(stats.avgSuccessRate * 100).toFixed(1)}%`);
  console.log(`Average Quality: ${(stats.avgQuality * 100).toFixed(1)}%`);
  console.log(`Total Cost: ${stats.totalCost} tokens`);
  console.log(`Total Savings: ${stats.totalSavings} tokens`);
}

runExample().catch(console.error);
