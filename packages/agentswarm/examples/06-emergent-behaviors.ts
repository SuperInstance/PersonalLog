/**
 * Example 6: Emergent Behaviors
 *
 * Demonstrates:
 * - Self-organizing agent behavior
 * - Price discovery
 * - Natural load balancing
 * - Competitive bidding
 * - Reputation-based selection
 */

import { AgentSwarm } from '@superinstance/agentswarm';

async function demonstrateEmergentBehaviors() {
  console.log('🌟 Demonstrating Emergent Behaviors\n');

  // Create agents with varied characteristics
  const agents = [
    // Low-cost, low-capability agents
    {
      id: 'budget-provider-1',
      name: 'Budget Provider 1',
      capabilities: [
        { name: 'basic-processing', proficiency: 0.6, usageCount: 20, successRate: 0.8, avgExecutionTime: 1000 }
      ],
      minBid: 5,
      maxTasks: 10,
      riskTolerance: 0.8, // Aggressive bidder
      learningRate: 0.1
    },
    {
      id: 'budget-provider-2',
      name: 'Budget Provider 2',
      capabilities: [
        { name: 'basic-processing', proficiency: 0.65, usageCount: 25, successRate: 0.82, avgExecutionTime: 1100 }
      ],
      minBid: 5,
      maxTasks: 10,
      riskTolerance: 0.8,
      learningRate: 0.1
    },

    // Mid-tier agents
    {
      id: 'balanced-provider-1',
      name: 'Balanced Provider 1',
      capabilities: [
        { name: 'basic-processing', proficiency: 0.8, usageCount: 50, successRate: 0.9, avgExecutionTime: 1500 }
      ],
      minBid: 15,
      maxTasks: 6,
      riskTolerance: 0.5,
      learningRate: 0.15
    },
    {
      id: 'balanced-provider-2',
      name: 'Balanced Provider 2',
      capabilities: [
        { name: 'basic-processing', proficiency: 0.82, usageCount: 55, successRate: 0.91, avgExecutionTime: 1450 }
      ],
      minBid: 15,
      maxTasks: 6,
      riskTolerance: 0.5,
      learningRate: 0.15
    },

    // High-end providers
    {
      id: 'premium-provider-1',
      name: 'Premium Provider 1',
      capabilities: [
        { name: 'basic-processing', proficiency: 0.95, usageCount: 100, successRate: 0.98, avgExecutionTime: 1200 }
      ],
      minBid: 30,
      maxTasks: 4,
      riskTolerance: 0.3, // Conservative bidder
      learningRate: 0.2
    },
    {
      id: 'premium-provider-2',
      name: 'Premium Provider 2',
      capabilities: [
        { name: 'basic-processing', proficiency: 0.93, usageCount: 95, successRate: 0.97, avgExecutionTime: 1250 }
      ],
      minBid: 30,
      maxTasks: 4,
      riskTolerance: 0.3,
      learningRate: 0.2
    }
  ];

  const swarm = new AgentSwarm({
    agents,
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
    faultTolerance: 'retry',
    maxRetries: 2,
    loadBalancing: 'market-based'
  });

  console.log('--- Market Simulation: Task Auction ---\n');

  // Post tasks with varying budgets and priorities
  const tasks = [
    { task: 'Low priority task', budget: 20, timeout: 5000, priority: 2, capabilities: ['basic-processing'] },
    { task: 'Medium priority task', budget: 50, timeout: 5000, priority: 5, capabilities: ['basic-processing'] },
    { task: 'High priority task', budget: 100, timeout: 5000, priority: 8, capabilities: ['basic-processing'] },
    { task: 'Critical task', budget: 200, timeout: 5000, priority: 10, capabilities: ['basic-processing'] }
  ];

  const results = [];

  for (const taskConfig of tasks) {
    console.log(`\nPosting: ${taskConfig.task} (budget: ${taskConfig.budget}, priority: ${taskConfig.priority})`);
    const result = await swarm.execute(taskConfig);
    results.push(result);

    const winningAgent = result.subtasks[0]?.agent || 'none';
    const cost = result.totalCost;
    console.log(`  → Won by: ${winningAgent} for ${cost} tokens`);
  }

  // Analyze emergent patterns
  console.log('\n--- Emergent Behavior Analysis ---\n');

  // Pattern 1: Price Segmentation
  console.log('📊 Pattern 1: Price Segmentation');
  console.log('   Low-budget tasks → Budget providers');
  console.log('   High-budget tasks → Premium providers');
  console.log('   (Agents self-segment by capability pricing)\n');

  // Pattern 2: Load Balancing
  console.log('⚖️ Pattern 2: Natural Load Balancing');
  const agentLoads = new Map<string, number>();
  for (const result of results) {
    for (const subtask of result.subtasks) {
      const count = agentLoads.get(subtask.agent) || 0;
      agentLoads.set(subtask.agent, count + 1);
    }
  }

  for (const [agent, load] of agentLoads) {
    console.log(`   ${agent}: ${load} tasks`);
  }
  console.log('   (Work distributes across available agents)\n');

  // Pattern 3: Reputation Effects
  console.log('🏆 Pattern 3: Reputation Accumulation');
  const metrics = swarm.getAllAgentMetrics();
  const sortedByRep = [...metrics].sort((a, b) => b.reputation.score - a.reputation.score);

  for (const metric of sortedByRep.slice(0, 3)) {
    console.log(`   ${metric.agentId}: ${(metric.reputation.score * 100).toFixed(1)}% reputation`);
  }
  console.log('   (Successful agents build reputation over time)\n');

  // Pattern 4: Competitive Pricing
  console.log('💰 Pattern 4: Competitive Price Discovery');
  const marketStats = swarm.getMarketStats();
  console.log(`   Average bid: ${marketStats.avgBidAmount.toFixed(2)} tokens`);
  console.log(`   Clearing price: ${marketStats.clearingPrice} tokens`);
  console.log(`   Market efficiency: ${(marketStats.efficiency * 100).toFixed(1)}%`);
  console.log('   (Prices emerge from competitive bidding)\n');

  // Pattern 5: Specialization
  console.log('🎯 Pattern 5: Emergent Specialization');
  for (const metric of metrics) {
    if (metric.specializationScore > 0.3) {
      console.log(`   ${metric.agentId}: specialized in ${metric.topCapabilities.join(', ')}`);
    }
  }
  console.log('   (Agents naturally focus on their strengths)\n');

  console.log('💡 Key Insight: Simple market rules lead to complex, intelligent behavior');
  console.log('   without central coordination. The swarm self-organizes!');

  console.log('\n✅ Emergent behaviors demonstration complete!');
}

demonstrateEmergentBehaviors().catch(console.error);
