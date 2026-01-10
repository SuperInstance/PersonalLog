/**
 * Example 3: Agent Specialization
 *
 * Demonstrates:
 * - Agents learning what they're good at
 * - Autonomous specialization
 * - Capability improvement over time
 * - Reputation-based bidding
 * - Emergent expertise
 */

import { AgentSwarm, Agent } from '@superinstance/agentswarm';

async function demonstrateSpecialization() {
  console.log('🧠 Demonstrating Agent Specialization\n');

  // Create agents with broad initial capabilities
  const generalistAgents = [
    new Agent({
      id: 'generalist-1',
      name: 'Generalist Agent 1',
      capabilities: [
        { name: 'web-scraping', proficiency: 0.5, usageCount: 0, successRate: 0.5, avgExecutionTime: 2000 },
        { name: 'content-generation', proficiency: 0.5, usageCount: 0, successRate: 0.5, avgExecutionTime: 3000 },
        { name: 'data-analysis', proficiency: 0.5, usageCount: 0, successRate: 0.5, avgExecutionTime: 2500 },
        { name: 'code-generation', proficiency: 0.5, usageCount: 0, successRate: 0.5, avgExecutionTime: 4000 }
      ],
      minBid: 10,
      maxTasks: 5,
      riskTolerance: 0.5,
      learningRate: 0.2
    }),
    new Agent({
      id: 'generalist-2',
      name: 'Generalist Agent 2',
      capabilities: [
        { name: 'web-scraping', proficiency: 0.5, usageCount: 0, successRate: 0.5, avgExecutionTime: 2000 },
        { name: 'content-generation', proficiency: 0.5, usageCount: 0, successRate: 0.5, avgExecutionTime: 3000 },
        { name: 'data-analysis', proficiency: 0.5, usageCount: 0, successRate: 0.5, avgExecutionTime: 2500 },
        { name: 'code-generation', proficiency: 0.5, usageCount: 0, successRate: 0.5, avgExecutionTime: 4000 }
      ],
      minBid: 10,
      maxTasks: 5,
      riskTolerance: 0.5,
      learningRate: 0.2
    })
  ];

  // Listen for specialization events
  for (const agent of generalistAgents) {
    agent.on('specialization-changed', ({ agentId, specializations }) => {
      console.log(`🎯 ${agentId} specialized in: ${specializations.join(', ')}`);
    });

    agent.on('capability-updated', ({ agentId, capability, proficiency }) => {
      console.log(`📈 ${agentId} improved ${capability} to ${(proficiency * 100).toFixed(1)}%`);
    });
  }

  // Create swarm
  const swarm = new AgentSwarm({
    agents: generalistAgents.map(agent => agent.getMetrics()),
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

  console.log('--- Initial State ---\n');
  for (const agent of generalistAgents) {
    console.log(`${agent.name}:`);
    for (const cap of agent.getCapabilities()) {
      console.log(`  ${cap.name}: ${(cap.proficiency * 100).toFixed(1)}% proficiency`);
    }
  }

  // Execute series of tasks with different requirements
  console.log('\n--- Executing Tasks ---\n');

  const tasks = [
    { task: 'Scrape web data about AI trends', budget: 100, capabilities: ['web-scraping'] },
    { task: 'Generate blog post about AI', budget: 100, capabilities: ['content-generation'] },
    { task: 'Analyze sales data', budget: 100, capabilities: ['data-analysis'] },
    { task: 'Generate Python code', budget: 100, capabilities: ['code-generation'] },
    { task: 'Scrape competitor pricing', budget: 100, capabilities: ['web-scraping'] },
    { task: 'Write product description', budget: 100, capabilities: ['content-generation'] },
    { task: 'Analyze user behavior', budget: 100, capabilities: ['data-analysis'] },
    { task: 'Generate React component', budget: 100, capabilities: ['code-generation'] }
  ];

  for (const taskConfig of tasks) {
    console.log(`\nExecuting: ${taskConfig.task}`);
    await swarm.execute(taskConfig);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Show final state
  console.log('\n--- Final State (After Learning) ---\n');
  for (const agent of generalistAgents) {
    console.log(`\n${agent.name}:`);
    const metrics = agent.getMetrics();
    console.log(`  Specialization Score: ${(metrics.specializationScore * 100).toFixed(1)}%`);
    console.log(`  Top Capabilities: ${metrics.topCapabilities.join(', ')}`);
    console.log(`  Win Rate: ${(metrics.winRate * 100).toFixed(1)}%`);
    console.log(`  Earnings: ${metrics.earnings} tokens`);
    console.log(`  Reputation: ${(metrics.reputation.score * 100).toFixed(1)}%`);

    console.log('  Capabilities:');
    for (const cap of agent.getCapabilities()) {
      console.log(`    ${cap.name}: ${(cap.proficiency * 100).toFixed(1)}% (${cap.usageCount} uses)`);
    }
  }

  console.log('\n✅ Specialization demonstration complete!');
  console.log('\n💡 Key Insight: Agents have autonomously specialized based on their successes,');
  console.log('   leading to higher proficiency in areas where they performed well.');
}

demonstrateSpecialization().catch(console.error);
