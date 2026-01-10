/**
 * Example 7: Dynamic Pricing and Market Equilibrium
 *
 * Demonstrates:
 * - Supply and demand effects
 * - Price discovery mechanism
 * - Market equilibrium
 * - Bid adjustment strategies
 * - Optimal pricing
 */

import { AgentSwarm } from '@superinstance/agentswarm';

async function demonstrateDynamicPricing() {
  console.log('💹 Demonstrating Dynamic Pricing and Market Equilibrium\n');

  // Create agents with flexible pricing strategies
  const agents = [
    {
      id: 'dynamic-pricer-1',
      name: 'Dynamic Pricer 1',
      capabilities: [
        { name: 'computation', proficiency: 0.8, usageCount: 40, successRate: 0.9, avgExecutionTime: 2000 }
      ],
      minBid: 10,
      maxTasks: 5,
      riskTolerance: 0.6, // Will adjust bids based on market
      learningRate: 0.25 // Learn quickly from market feedback
    },
    {
      id: 'dynamic-pricer-2',
      name: 'Dynamic Pricer 2',
      capabilities: [
        { name: 'computation', proficiency: 0.85, usageCount: 45, successRate: 0.92, avgExecutionTime: 1900 }
      ],
      minBid: 10,
      maxTasks: 5,
      riskTolerance: 0.6,
      learningRate: 0.25
    },
    {
      id: 'dynamic-pricer-3',
      name: 'Dynamic Pricer 3',
      capabilities: [
        { name: 'computation', proficiency: 0.75, usageCount: 35, successRate: 0.88, avgExecutionTime: 2100 }
      ],
      minBid: 10,
      maxTasks: 5,
      riskTolerance: 0.7,
      learningRate: 0.25
    }
  ];

  const swarm = new AgentSwarm({
    agents,
    market: {
      type: 'double-auction',
      transactionFee: 0.05,
      reputationSystem: true,
      reputationWeight: 0.3,
      minReputation: 0.3
    },
    decompositionStrategy: 'flat',
    maxDecompositionDepth: 1,
    aggregationStrategy: 'merge',
    faultTolerance: 'retry',
    maxRetries: 2,
    loadBalancing: 'market-based'
  });

  console.log('--- Phase 1: Low Demand (Supply > Demand) ---\n');

  // Post few tasks (low demand)
  for (let i = 0; i < 3; i++) {
    await swarm.execute({
      task: `Computation task ${i + 1}`,
      budget: 50,
      timeout: 5000,
      priority: 5,
      capabilities: ['computation']
    });
  }

  let stats = swarm.getMarketStats();
  console.log(`Average bid: ${stats.avgBidAmount.toFixed(2)} tokens`);
  console.log(`Clearing price: ${stats.clearingPrice} tokens`);
  console.log('→ Prices lower due to excess supply\n');

  console.log('--- Phase 2: High Demand (Demand > Supply) ---\n');

  // Post many tasks (high demand)
  const highDemandResults = [];
  for (let i = 0; i < 15; i++) {
    const result = await swarm.execute({
      task: `Computation task ${i + 1}`,
      budget: 100,
      timeout: 5000,
      priority: 7,
      capabilities: ['computation']
    });
    highDemandResults.push(result);
  }

  stats = swarm.getMarketStats();
  console.log(`Average bid: ${stats.avgBidAmount.toFixed(2)} tokens`);
  console.log(`Clearing price: ${stats.clearingPrice} tokens`);
  console.log('→ Prices rise due to scarcity\n');

  console.log('--- Phase 3: Market Equilibrium Analysis ---\n');

  // Analyze price trends
  console.log('Price progression over time:');
  const prices = highDemandResults.map(r => r.totalCost);
  const chunkSize = 5;
  for (let i = 0; i < prices.length; i += chunkSize) {
    const chunk = prices.slice(i, i + chunkSize);
    const avg = chunk.reduce((a, b) => a + b, 0) / chunk.length;
    console.log(`  Tasks ${i + 1}-${Math.min(i + chunkSize, prices.length)}: ${avg.toFixed(2)} tokens avg`);
  }

  console.log('\n');

  // Agent performance and pricing
  console.log('--- Agent Performance and Pricing Strategies ---\n');
  const agentMetrics = swarm.getAllAgentMetrics();

  for (const metric of agentMetrics) {
    console.log(`${metric.agentId}:`);
    console.log(`  Total earnings: ${metric.earnings} tokens`);
    console.log(`  Average bid: ${metric.avgBid.toFixed(2)} tokens`);
    console.log(`  Win rate: ${(metric.winRate * 100).toFixed(1)}%`);
    console.log(`  Reputation: ${(metric.reputation.score * 100).toFixed(1)}%`);

    // Calculate profit margin
    const estimatedCost = 15; // Approximate cost per task
    const profitMargin = ((metric.avgBid - estimatedCost) / metric.avgBid) * 100;
    console.log(`  Estimated profit margin: ${profitMargin.toFixed(1)}%`);
    console.log('');
  }

  console.log('--- Market Efficiency Metrics ---\n');
  stats = swarm.getMarketStats();
  console.log(`Total matches: ${stats.totalMatches}`);
  console.log(`Market efficiency: ${(stats.efficiency * 100).toFixed(1)}%`);
  console.log(`Tasks completed per agent: ${stats.totalMatches / agents.length}`);

  console.log('\n💡 Key Insights:');
  console.log('1. Prices rise when demand exceeds supply');
  console.log('2. Agents with higher reputation can charge more');
  console.log('3. Market reaches equilibrium through competition');
  console.log('4. Profit margins emerge from capability differentials');
  console.log('5. Win rate balances price and competitiveness');

  console.log('\n✅ Dynamic pricing demonstration complete!');
}

demonstrateDynamicPricing().catch(console.error);
