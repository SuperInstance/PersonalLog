/**
 * Example 8: Advanced Task Decomposition Strategies
 *
 * Demonstrates:
 * - Hierarchical decomposition
 * - Flat decomposition
 * - Adaptive decomposition
 * - Result aggregation
 * - Subtask coordination
 */

import { AgentSwarm } from '@superinstance/agentswarm';

async function demonstrateTaskDecomposition() {
  console.log('🔬 Demonstrating Advanced Task Decomposition\n');

  // Create diverse agents
  const agents = [
    {
      id: 'research-specialist',
      name: 'Research Specialist',
      capabilities: [
        { name: 'web-scraping', proficiency: 0.95, usageCount: 80, successRate: 0.94, avgExecutionTime: 2000 },
        { name: 'data-extraction', proficiency: 0.90, usageCount: 70, successRate: 0.92, avgExecutionTime: 2500 }
      ],
      minBid: 15,
      maxTasks: 4,
      riskTolerance: 0.5,
      learningRate: 0.15
    },
    {
      id: 'analysis-specialist',
      name: 'Analysis Specialist',
      capabilities: [
        { name: 'data-analysis', proficiency: 0.92, usageCount: 75, successRate: 0.93, avgExecutionTime: 3000 },
        { name: 'statistics', proficiency: 0.88, usageCount: 60, successRate: 0.90, avgExecutionTime: 3500 }
      ],
      minBid: 20,
      maxTasks: 3,
      riskTolerance: 0.4,
      learningRate: 0.12
    },
    {
      id: 'content-specialist',
      name: 'Content Specialist',
      capabilities: [
        { name: 'content-generation', proficiency: 0.93, usageCount: 90, successRate: 0.95, avgExecutionTime: 4000 },
        { name: 'editing', proficiency: 0.90, usageCount: 85, successRate: 0.93, avgExecutionTime: 2500 }
      ],
      minBid: 18,
      maxTasks: 3,
      riskTolerance: 0.4,
      learningRate: 0.1
    },
    {
      id: 'code-specialist',
      name: 'Code Specialist',
      capabilities: [
        { name: 'code-generation', proficiency: 0.94, usageCount: 100, successRate: 0.96, avgExecutionTime: 5000 },
        { name: 'debugging', proficiency: 0.89, usageCount: 80, successRate: 0.92, avgExecutionTime: 4000 }
      ],
      minBid: 22,
      maxTasks: 3,
      riskTolerance: 0.35,
      learningRate: 0.12
    }
  ];

  console.log('--- Strategy 1: Hierarchical Decomposition ---\n');

  const swarmHierarchical = new AgentSwarm({
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

  const result1 = await swarmHierarchical.execute({
    task: `
      Create a comprehensive technical report on WebGPU:
      - Research recent developments
      - Analyze performance data
      - Generate code examples
      - Write detailed documentation
      - Edit and format final report
    `,
    budget: 500,
    timeout: 60000,
    priority: 8,
    capabilities: ['web-scraping', 'data-analysis', 'code-generation', 'content-generation', 'editing']
  });

  console.log(`Hierarchical decomposition:`);
  console.log(`  Subtasks: ${result1.subtasks.length}`);
  console.log(`  Cost: ${result1.totalCost} tokens`);
  console.log(`  Success rate: ${(result1.successRate * 100).toFixed(1)}%`);

  // Show decomposition tree
  console.log('\n  Decomposition tree:');
  for (let i = 0; i < result1.subtasks.length; i++) {
    const subtask = result1.subtasks[i];
    console.log(`    ${i + 1}. ${subtask.agent} - ${subtask.cost} tokens`);
  }

  console.log('\n--- Strategy 2: Flat Decomposition ---\n');

  const swarmFlat = new AgentSwarm({
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

  const result2 = await swarmFlat.execute({
    task: 'Process and analyze multiple datasets',
    budget: 300,
    timeout: 30000,
    priority: 6,
    capabilities: ['data-analysis', 'statistics']
  });

  console.log(`Flat decomposition:`);
  console.log(`  Subtasks: ${result2.subtasks.length}`);
  console.log(`  Cost: ${result2.totalCost} tokens`);
  console.log(`  Parallel execution possible`);

  console.log('\n--- Strategy 3: Adaptive Decomposition ---\n');

  const swarmAdaptive = new AgentSwarm({
    agents,
    market: {
      type: 'double-auction',
      transactionFee: 0.05,
      reputationSystem: true,
      reputationWeight: 0.3,
      minReputation: 0.3
    },
    decompositionStrategy: 'adaptive', // Automatically chooses best strategy
    maxDecompositionDepth: 3,
    aggregationStrategy: 'merge',
    faultTolerance: 'retry',
    maxRetries: 2,
    loadBalancing: 'market-based'
  });

  const result3 = await swarmAdaptive.execute({
    task: 'Complex multi-stage project with varying complexity',
    budget: 400,
    timeout: 45000,
    priority: 7,
    capabilities: ['web-scraping', 'data-analysis', 'content-generation']
  });

  console.log(`Adaptive decomposition:`);
  console.log(`  Subtasks: ${result3.subtasks.length}`);
  console.log(`  Strategy chosen based on task complexity`);
  console.log(`  Cost: ${result3.totalCost} tokens`);

  console.log('\n--- Aggregation Strategies Comparison ---\n');

  // Test different aggregation strategies
  const aggregations = ['merge', 'vote', 'best'] as const;

  for (const aggregation of aggregations) {
    const swarmAgg = new AgentSwarm({
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
      aggregationStrategy: aggregation,
      faultTolerance: 'retry',
      maxRetries: 2,
      loadBalancing: 'market-based'
    });

    const result = await swarmAgg.execute({
      task: 'Generate analysis with multiple approaches',
      budget: 200,
      timeout: 20000,
      priority: 5,
      capabilities: ['data-analysis', 'statistics']
    });

    console.log(`${aggregation} aggregation:`);
    console.log(`  Subtasks: ${result.subtasks.length}`);
    console.log(`  Quality: ${(result.avgQuality * 100).toFixed(1)}%`);
  }

  console.log('\n💡 Key Insights:');
  console.log('1. Hierarchical: Good for complex, multi-stage tasks');
  console.log('2. Flat: Better for parallelizable tasks');
  console.log('3. Adaptive: Automatically chooses based on complexity');
  console.log('4. Merge: Combines all results');
  console.log('5. Vote: Selects most common result');
  console.log('6. Best: Selects highest quality result');

  console.log('\n✅ Task decomposition demonstration complete!');
}

demonstrateTaskDecomposition().catch(console.error);
