/**
 * Example 5: Large-Scale Swarm Coordination
 *
 * Demonstrates:
 * - 10+ agents working together
 * - Complex task decomposition
 * - Parallel execution
 * - Load balancing
 * - Emergent coordination
 */

import { AgentSwarm } from '@superinstance/agentswarm';

async function demonstrateLargeScaleSwarm() {
  console.log('🐝 Demonstrating Large-Scale Swarm Coordination\n');

  // Create diverse agent types
  const agents = [
    // Research agents (3)
    {
      id: 'web-researcher-1',
      name: 'Web Researcher 1',
      capabilities: [
        { name: 'web-scraping', proficiency: 0.9, usageCount: 80, successRate: 0.92, avgExecutionTime: 1500 },
        { name: 'data-extraction', proficiency: 0.85, usageCount: 60, successRate: 0.90, avgExecutionTime: 2000 }
      ],
      minBid: 12,
      maxTasks: 5,
      riskTolerance: 0.5,
      learningRate: 0.15
    },
    {
      id: 'web-researcher-2',
      name: 'Web Researcher 2',
      capabilities: [
        { name: 'web-scraping', proficiency: 0.88, usageCount: 70, successRate: 0.91, avgExecutionTime: 1600 },
        { name: 'data-extraction', proficiency: 0.83, usageCount: 55, successRate: 0.89, avgExecutionTime: 2100 }
      ],
      minBid: 12,
      maxTasks: 5,
      riskTolerance: 0.5,
      learningRate: 0.15
    },
    {
      id: 'web-researcher-3',
      name: 'Web Researcher 3',
      capabilities: [
        { name: 'web-scraping', proficiency: 0.85, usageCount: 65, successRate: 0.88, avgExecutionTime: 1700 },
        { name: 'data-extraction', proficiency: 0.80, usageCount: 50, successRate: 0.87, avgExecutionTime: 2200 }
      ],
      minBid: 11,
      maxTasks: 4,
      riskTolerance: 0.5,
      learningRate: 0.15
    },

    // Analysis agents (3)
    {
      id: 'data-analyst-1',
      name: 'Data Analyst 1',
      capabilities: [
        { name: 'data-analysis', proficiency: 0.92, usageCount: 90, successRate: 0.94, avgExecutionTime: 2500 },
        { name: 'statistics', proficiency: 0.88, usageCount: 70, successRate: 0.91, avgExecutionTime: 3000 }
      ],
      minBid: 18,
      maxTasks: 4,
      riskTolerance: 0.4,
      learningRate: 0.12
    },
    {
      id: 'data-analyst-2',
      name: 'Data Analyst 2',
      capabilities: [
        { name: 'data-analysis', proficiency: 0.90, usageCount: 85, successRate: 0.93, avgExecutionTime: 2600 },
        { name: 'statistics', proficiency: 0.86, usageCount: 68, successRate: 0.90, avgExecutionTime: 3100 }
      ],
      minBid: 18,
      maxTasks: 4,
      riskTolerance: 0.4,
      learningRate: 0.12
    },
    {
      id: 'data-analyst-3',
      name: 'Data Analyst 3',
      capabilities: [
        { name: 'data-analysis', proficiency: 0.87, usageCount: 75, successRate: 0.90, avgExecutionTime: 2700 },
        { name: 'statistics', proficiency: 0.84, usageCount: 65, successRate: 0.89, avgExecutionTime: 3200 }
      ],
      minBid: 17,
      maxTasks: 4,
      riskTolerance: 0.4,
      learningRate: 0.12
    },

    // Writing agents (2)
    {
      id: 'content-writer-1',
      name: 'Content Writer 1',
      capabilities: [
        { name: 'content-generation', proficiency: 0.93, usageCount: 100, successRate: 0.95, avgExecutionTime: 3500 },
        { name: 'editing', proficiency: 0.90, usageCount: 80, successRate: 0.92, avgExecutionTime: 2000 }
      ],
      minBid: 20,
      maxTasks: 3,
      riskTolerance: 0.3,
      learningRate: 0.1
    },
    {
      id: 'content-writer-2',
      name: 'Content Writer 2',
      capabilities: [
        { name: 'content-generation', proficiency: 0.91, usageCount: 95, successRate: 0.94, avgExecutionTime: 3600 },
        { name: 'editing', proficiency: 0.88, usageCount: 75, successRate: 0.91, avgExecutionTime: 2100 }
      ],
      minBid: 20,
      maxTasks: 3,
      riskTolerance: 0.3,
      learningRate: 0.1
    },

    // Code agents (2)
    {
      id: 'developer-1',
      name: 'Developer 1',
      capabilities: [
        { name: 'code-generation', proficiency: 0.94, usageCount: 110, successRate: 0.96, avgExecutionTime: 4000 },
        { name: 'debugging', proficiency: 0.89, usageCount: 85, successRate: 0.92, avgExecutionTime: 3500 }
      ],
      minBid: 22,
      maxTasks: 4,
      riskTolerance: 0.35,
      learningRate: 0.12
    },
    {
      id: 'developer-2',
      name: 'Developer 2',
      capabilities: [
        { name: 'code-generation', proficiency: 0.92, usageCount: 105, successRate: 0.95, avgExecutionTime: 4100 },
        { name: 'debugging', proficiency: 0.87, usageCount: 82, successRate: 0.91, avgExecutionTime: 3600 }
      ],
      minBid: 22,
      maxTasks: 4,
      riskTolerance: 0.35,
      learningRate: 0.12
    }
  ];

  console.log(`Created ${agents.length} specialized agents\n`);

  // Create swarm
  const swarm = new AgentSwarm({
    agents,
    market: {
      type: 'double-auction',
      transactionFee: 0.05,
      reputationSystem: true,
      reputationWeight: 0.3,
      minReputation: 0.3
    },
    decompositionStrategy: 'hierarchical',
    maxDecompositionDepth: 3,
    aggregationStrategy: 'merge',
    faultTolerance: 'retry',
    maxRetries: 2,
    loadBalancing: 'market-based'
  });

  // Execute complex multi-stage project
  console.log('--- Executing Complex Multi-Stage Project ---\n');
  console.log('Project: Create comprehensive technical blog post\n');

  const startTime = Date.now();

  const result = await swarm.execute({
    task: `
      Create a comprehensive technical blog post about WebGPU:
      1. Research latest WebGPU developments
      2. Analyze performance benchmarks
      3. Generate code examples
      4. Write engaging article
      5. Edit and polish
    `,
    budget: 1000,
    timeout: 60000,
    priority: 8,
    capabilities: ['web-scraping', 'data-analysis', 'code-generation', 'content-generation', 'editing']
  });

  const duration = Date.now() - startTime;

  console.log('\n--- Execution Summary ---\n');
  console.log(`✅ Project completed in ${(duration / 1000).toFixed(1)}s`);
  console.log(`Total Cost: ${result.totalCost} tokens`);
  console.log(`Budget Savings: ${result.savings} tokens (${((result.savings / 1000) * 100).toFixed(1)}%)`);
  console.log(`Agents Involved: ${result.agentsInvolved} out of ${agents.length}`);
  console.log(`Success Rate: ${(result.successRate * 100).toFixed(1)}%`);
  console.log(`Average Quality: ${(result.avgQuality * 100).toFixed(1)}%`);
  console.log(`Subtasks Executed: ${result.subtasks.length}`);

  console.log('\n--- Subtask Breakdown ---\n');
  const subtasksByAgent = new Map<string, number>();
  for (const subtask of result.subtasks) {
    const count = subtasksByAgent.get(subtask.agent) || 0;
    subtasksByAgent.set(subtask.agent, count + 1);
  }

  for (const [agent, count] of subtasksByAgent) {
    console.log(`${agent}: ${count} subtasks`);
  }

  // Show swarm statistics
  console.log('\n--- Swarm Statistics ---\n');
  const stats = swarm.getSwarmStats();
  console.log(`Total Executions: ${stats.totalExecutions}`);
  console.log(`Average Success Rate: ${(stats.avgSuccessRate * 100).toFixed(1)}%`);
  console.log(`Average Quality: ${(stats.avgQuality * 100).toFixed(1)}%`);
  console.log(`Total Cost: ${stats.totalCost} tokens`);
  console.log(`Total Savings: ${stats.totalSavings} tokens`);

  // Show individual agent performance
  console.log('\n--- Agent Performance ---\n');
  const agentMetrics = swarm.getAllAgentMetrics();
  const topAgents = agentMetrics
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 5);

  for (const metrics of topAgents) {
    console.log(`\n${metrics.agentId}:`);
    console.log(`  Earnings: ${metrics.earnings} tokens`);
    console.log(`  Win Rate: ${(metrics.winRate * 100).toFixed(1)}%`);
    console.log(`  Specialization: ${(metrics.specializationScore * 100).toFixed(1)}%`);
    console.log(`  Top Capabilities: ${metrics.topCapabilities.join(', ')}`);
  }

  console.log('\n💡 Key Insights:');
  console.log('1. Large swarms can execute complex projects efficiently');
  console.log('2. Specialization emerges naturally based on capabilities');
  console.log('3. Load balancing distributes work across capable agents');
  console.log('4. Market mechanisms optimize cost and quality tradeoffs');
  console.log('5. Parallel execution dramatically reduces completion time');

  console.log('\n✅ Large-scale swarm demonstration complete!');
}

demonstrateLargeScaleSwarm().catch(console.error);
