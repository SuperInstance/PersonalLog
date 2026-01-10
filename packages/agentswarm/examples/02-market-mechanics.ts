/**
 * Example 2: Market Mechanics
 *
 * Demonstrates:
 * - Double auction market in action
 * - Bid placement and matching
 * - Price discovery
 * - Reputation system
 * - Market statistics
 */

import { AgentSwarm, MarketEngine, Agent } from '@superinstance/agentswarm';

// Create a market with detailed monitoring
const market = new MarketEngine({
  type: 'double-auction',
  transactionFee: 0.05,
  reputationSystem: true,
  reputationWeight: 0.3,
  minReputation: 0.2
});

// Monitor market events
market.on('task-posted', ({ taskId, budget }) => {
  console.log(`📋 Task posted: ${taskId} (budget: ${budget})`);
});

market.on('bid-placed', ({ bidId, agentId, amount }) => {
  console.log(`💰 Bid placed: ${bidId} by ${agentId} (${amount} tokens)`);
});

market.on('bid-matched', ({ matchId, taskId, agentId, amount }) => {
  console.log(`🤝 Match made: ${taskId} -> ${agentId} (${amount} tokens)`);
});

market.on('task-completed', ({ taskId, agentId, quality }) => {
  console.log(`✅ Task completed: ${taskId} by ${agentId} (quality: ${(quality * 100).toFixed(1)}%)`);
});

market.on('task-failed', ({ taskId, agentId, error }) => {
  console.log(`❌ Task failed: ${taskId} by ${agentId} - ${error}`);
});

async function demonstrateMarketMechanics() {
  console.log('🏪 Demonstrating Market Mechanics\n');

  // Create agents with varying capabilities
  const agents = [
    new Agent({
      id: 'agent-1',
      name: 'Low-Cost Provider',
      capabilities: [
        { name: 'data-processing', proficiency: 0.6, usageCount: 10, successRate: 0.8, avgExecutionTime: 1000 }
      ],
      minBid: 5,
      maxTasks: 3,
      riskTolerance: 0.3,
      learningRate: 0.1
    }),
    new Agent({
      id: 'agent-2',
      name: 'Balanced Provider',
      capabilities: [
        { name: 'data-processing', proficiency: 0.8, usageCount: 50, successRate: 0.9, avgExecutionTime: 1500 }
      ],
      minBid: 15,
      maxTasks: 5,
      riskTolerance: 0.5,
      learningRate: 0.15
    }),
    new Agent({
      id: 'agent-3',
      name: 'Premium Provider',
      capabilities: [
        { name: 'data-processing', proficiency: 0.95, usageCount: 100, successRate: 0.98, avgExecutionTime: 1200 }
      ],
      minBid: 30,
      maxTasks: 4,
      riskTolerance: 0.7,
      learningRate: 0.2
    })
  ];

  // Post tasks to the market
  console.log('\n--- Posting Tasks ---\n');
  const tasks = [
    {
      id: 'task-1',
      description: 'Process small dataset',
      requiredCapabilities: ['data-processing'],
      budget: 20,
      timeout: 5000,
      priority: 3,
      status: 'pending' as const
    },
    {
      id: 'task-2',
      description: 'Process medium dataset',
      requiredCapabilities: ['data-processing'],
      budget: 50,
      timeout: 5000,
      priority: 5,
      status: 'pending' as const
    },
    {
      id: 'task-3',
      description: 'Process large dataset with high quality',
      requiredCapabilities: ['data-processing'],
      budget: 100,
      timeout: 5000,
      priority: 8,
      status: 'pending' as const
    }
  ];

  for (const task of tasks) {
    market.postTask(task);

    // Agents place bids
    for (const agent of agents) {
      if (agent.hasCapacity()) {
        const bid = agent.evaluateTask(task);
        if (bid) {
          market.placeBid(bid);
        }
      }
    }

    // Wait a bit for matching
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Display market statistics
  console.log('\n--- Market Statistics ---\n');
  const stats = market.getStats();
  console.log(`Total Tasks: ${stats.totalTasks}`);
  console.log(`Total Bids: ${stats.totalBids}`);
  console.log(`Total Matches: ${stats.totalMatches}`);
  console.log(`Pending Tasks: ${stats.pendingTasks}`);
  console.log(`Active Matches: ${stats.activeMatches}`);
  console.log(`Average Bid Amount: ${stats.avgBidAmount.toFixed(2)} tokens`);
  console.log(`Clearing Price: ${stats.clearingPrice} tokens`);
  console.log(`Market Efficiency: ${(stats.efficiency * 100).toFixed(1)}%`);

  // Show agent reputations
  console.log('\n--- Agent Reputations ---\n');
  for (const agent of agents) {
    const reputation = market.getAgentReputation(agent.id);
    console.log(`${agent.name} (${agent.id}): ${(reputation * 100).toFixed(1)}%`);
  }

  // Show active matches
  console.log('\n--- Active Matches ---\n');
  const activeMatches = market.getActiveMatches();
  for (const match of activeMatches) {
    console.log(`Match: ${match.id}`);
    console.log(`  Task: ${match.taskId}`);
    console.log(`  Agent: ${match.agentId}`);
    console.log(`  Amount: ${match.bidAmount} tokens`);
    console.log(`  Matched At: ${new Date(match.matchedAt).toISOString()}`);
  }

  console.log('\n✅ Market mechanics demonstration complete!');
}

demonstrateMarketMechanics().catch(console.error);
