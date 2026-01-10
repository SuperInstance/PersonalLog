/**
 * Example 9: Performance Optimization
 *
 * Demonstrates:
 * - Minimizing execution time
 * - Cost optimization
 * - Quality maximization
 * - Resource utilization
 * - Bottleneck identification
 */

import { AgentSwarm } from '@superinstance/agentswarm';

async function demonstratePerformanceOptimization() {
  console.log('⚡ Demonstrating Performance Optimization\n');

  // Create agents with different performance characteristics
  const agents = [
    {
      id: 'fast-agent',
      name: 'Fast Agent',
      capabilities: [
        { name: 'processing', proficiency: 0.75, usageCount: 60, successRate: 0.85, avgExecutionTime: 500 }
      ],
      minBid: 8,
      maxTasks: 8,
      riskTolerance: 0.6,
      learningRate: 0.1
    },
    {
      id: 'balanced-agent',
      name: 'Balanced Agent',
      capabilities: [
        { name: 'processing', proficiency: 0.85, usageCount: 70, successRate: 0.92, avgExecutionTime: 1500 }
      ],
      minBid: 15,
      maxTasks: 5,
      riskTolerance: 0.5,
      learningRate: 0.15
    },
    {
      id: 'quality-agent',
      name: 'Quality Agent',
      capabilities: [
        { name: 'processing', proficiency: 0.95, usageCount: 80, successRate: 0.98, avgExecutionTime: 3000 }
      ],
      minBid: 25,
      maxTasks: 3,
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
      minReputation: 0.3
    },
    decompositionStrategy: 'flat',
    maxDecompositionDepth: 2,
    aggregationStrategy: 'merge',
    faultTolerance: 'retry',
    maxRetries: 2,
    loadBalancing: 'market-based'
  });

  console.log('--- Optimization Goal 1: Minimize Execution Time ---\n');

  const startTime1 = Date.now();
  const result1 = await swarm.execute({
    task: 'Execute task quickly',
    budget: 100,
    timeout: 10000,
    priority: 10, // High priority
    capabilities: ['processing']
  });
  const time1 = Date.now() - startTime1;

  console.log(`Execution time: ${time1}ms`);
  console.log(`Cost: ${result1.totalCost} tokens`);
  console.log(`Agent: ${result1.subtasks[0]?.agent}`);
  console.log('→ Fast agents win high-priority tasks\n');

  console.log('--- Optimization Goal 2: Minimize Cost ---\n');

  const result2 = await swarm.execute({
    task: 'Execute task cheaply',
    budget: 20, // Low budget
    timeout: 10000,
    priority: 3,
    capabilities: ['processing']
  });

  console.log(`Cost: ${result2.totalCost} tokens`);
  console.log(`Savings: ${result2.savings} tokens`);
  console.log(`Agent: ${result2.subtasks[0]?.agent}`);
  console.log('→ Low-budget tasks go to low-cost agents\n');

  console.log('--- Optimization Goal 3: Maximize Quality ---\n');

  const result3 = await swarm.execute({
    task: 'Execute with highest quality',
    budget: 200, // High budget
    timeout: 15000,
    priority: 9,
    capabilities: ['processing']
  });

  console.log(`Cost: ${result3.totalCost} tokens`);
  console.log(`Quality: ${(result3.avgQuality * 100).toFixed(1)}%`);
  console.log(`Agent: ${result3.subtasks[0]?.agent}`);
  console.log('→ High-budget tasks attract quality agents\n');

  console.log('--- Performance Comparison ---\n');

  // Run multiple tasks to establish patterns
  const tasks = [];
  for (let i = 0; i < 10; i++) {
    const startTime = Date.now();
    const result = await swarm.execute({
      task: `Task ${i + 1}`,
      budget: 50 + Math.random() * 100,
      timeout: 10000,
      priority: Math.floor(Math.random() * 10) + 1,
      capabilities: ['processing']
    });
    const duration = Date.now() - startTime;
    tasks.push({
      duration,
      cost: result.totalCost,
      quality: result.avgQuality,
      agent: result.subtasks[0]?.agent
    });
  }

  // Group by agent
  const agentStats = new Map<string, { durations: number[]; costs: number[]; qualities: number[] }>();
  for (const task of tasks) {
    if (!task.agent) continue;
    const stats = agentStats.get(task.agent) || { durations: [], costs: [], qualities: [] };
    stats.durations.push(task.duration);
    stats.costs.push(task.cost);
    stats.qualities.push(task.quality);
    agentStats.set(task.agent, stats);
  }

  console.log('Agent Performance Statistics:');
  console.log('-'.repeat(70));
  console.log(sprintf('%-20s %10s %10s %10s', 'Agent', 'Avg Time', 'Avg Cost', 'Quality'));
  console.log('-'.repeat(70));

  for (const [agentId, stats] of agentStats) {
    const avgTime = stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length;
    const avgCost = stats.costs.reduce((a, b) => a + b, 0) / stats.costs.length;
    const avgQuality = stats.qualities.reduce((a, b) => a + b, 0) / stats.qualities.length;
    console.log(sprintf('%-20s %10d %10.1f %9.1f%%', agentId, avgTime, avgCost, avgQuality * 100));
  }

  console.log('\n--- Resource Utilization ---\n');

  const metrics = swarm.getAllAgentMetrics();
  console.log('Agent Utilization:');
  for (const metric of metrics) {
    const capacity = metric.activeTasks;
    const utilization = (capacity / 5) * 100; // Assuming max 5 concurrent tasks
    console.log(`  ${metric.agentId}: ${utilization.toFixed(0)}% utilization (${capacity}/5 tasks)`);
  }

  console.log('\n--- Bottleneck Analysis ---\n');

  const marketStats = swarm.getMarketStats();
  console.log('Market Performance:');
  console.log(`  Active matches: ${marketStats.activeMatches}`);
  console.log(`  Pending tasks: ${marketStats.pendingTasks}`);
  console.log(`  Average match time: ${marketStats.avgMatchTime}ms`);
  console.log(`  Market efficiency: ${(marketStats.efficiency * 100).toFixed(1)}%`);

  if (marketStats.pendingTasks > 3) {
    console.log('\n⚠️ Bottleneck detected: High pending tasks');
    console.log('   → Consider adding more agents');
  }

  if (marketStats.avgMatchTime > 1000) {
    console.log('\n⚠️ Bottleneck detected: Slow matching');
    console.log('   → Consider optimizing bid evaluation');
  }

  console.log('\n💡 Optimization Strategies:');
  console.log('1. For speed: Use high priority + fast agents');
  console.log('2. For cost: Use low budget + let market find cheapest');
  console.log('3. For quality: Use high budget + reputation system');
  console.log('4. For throughput: Increase parallel agent capacity');
  console.log('5. For efficiency: Balance all factors');

  console.log('\n✅ Performance optimization demonstration complete!');
}

// Helper function for formatting
function sprintf(format: string, ...args: (string | number)[]): string {
  return format.replace(/%(-?\d*)?(\.*)?([dfs])/g, (match, width, precision, type) => {
    let arg = args.shift() as string | number;
    if (type === 'd') arg = Math.floor(Number(arg));
    if (type === 'f') arg = Number(arg).toFixed(precision ? parseInt(precision.slice(1)) : 6);
    if (type === 's') arg = String(arg);
    return String(arg);
  });
}

demonstratePerformanceOptimization().catch(console.error);
