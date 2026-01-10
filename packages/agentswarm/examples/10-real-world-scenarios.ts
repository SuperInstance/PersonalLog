/**
 * Example 10: Real-World Production Scenarios
 *
 * Demonstrates:
 * - Content creation pipeline
 * - Data processing workflow
 * - Code review automation
 * - Research synthesis
 * - Multi-stage project execution
 */

import { AgentSwarm } from '@superinstance/agentswarm';

async function demonstrateRealWorldScenarios() {
  console.log('🌍 Demonstrating Real-World Production Scenarios\n');

  // Scenario 1: Content Creation Pipeline
  console.log('--- Scenario 1: Content Creation Pipeline ---\n');

  const contentAgents = [
    {
      id: 'research-writer',
      name: 'Research Writer',
      capabilities: [
        { name: 'web-research', proficiency: 0.9, usageCount: 100, successRate: 0.94, avgExecutionTime: 3000 },
        { name: 'writing', proficiency: 0.88, usageCount: 90, successRate: 0.92, avgExecutionTime: 5000 }
      ],
      minBid: 20,
      maxTasks: 4,
      riskTolerance: 0.5,
      learningRate: 0.15
    },
    {
      id: 'editor',
      name: 'Editor',
      capabilities: [
        { name: 'editing', proficiency: 0.92, usageCount: 120, successRate: 0.96, avgExecutionTime: 4000 },
        { name: 'proofreading', proficiency: 0.95, usageCount: 130, successRate: 0.97, avgExecutionTime: 3500 }
      ],
      minBid: 18,
      maxTasks: 5,
      riskTolerance: 0.4,
      learningRate: 0.12
    },
    {
      id: 'seo-optimizer',
      name: 'SEO Optimizer',
      capabilities: [
        { name: 'seo-analysis', proficiency: 0.85, usageCount: 80, successRate: 0.90, avgExecutionTime: 2500 },
        { name: 'keyword-research', proficiency: 0.88, usageCount: 85, successRate: 0.91, avgExecutionTime: 2000 }
      ],
      minBid: 15,
      maxTasks: 6,
      riskTolerance: 0.5,
      learningRate: 0.1
    }
  ];

  const contentSwarm = new AgentSwarm({
    agents: contentAgents,
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

  const blogPost = await contentSwarm.execute({
    task: `
      Create a SEO-optimized blog post about "AI in 2026":
      1. Research current AI trends
      2. Write comprehensive article
      3. Edit for clarity and flow
      4. Optimize for SEO keywords
      5. Proofread final version
    `,
    budget: 300,
    timeout: 60000,
    priority: 8,
    capabilities: ['web-research', 'writing', 'editing', 'seo-analysis', 'proofreading']
  });

  console.log('Blog post created:');
  console.log(`  Cost: ${blogPost.totalCost} tokens`);
  console.log(`  Stages: ${blogPost.subtasks.length}`);
  console.log(`  Quality: ${(blogPost.avgQuality * 100).toFixed(1)}%`);
  console.log(`  Pipeline executed by ${blogPost.agentsInvolved} agents\n`);

  // Scenario 2: Data Processing Workflow
  console.log('--- Scenario 2: Data Processing Workflow ---\n');

  const dataAgents = [
    {
      id: 'data-collector',
      name: 'Data Collector',
      capabilities: [
        { name: 'data-scraping', proficiency: 0.92, usageCount: 110, successRate: 0.95, avgExecutionTime: 2500 },
        { name: 'api-integration', proficiency: 0.88, usageCount: 90, successRate: 0.92, avgExecutionTime: 2000 }
      ],
      minBid: 18,
      maxTasks: 5,
      riskTolerance: 0.5,
      learningRate: 0.15
    },
    {
      id: 'data-processor',
      name: 'Data Processor',
      capabilities: [
        { name: 'data-cleaning', proficiency: 0.90, usageCount: 100, successRate: 0.93, avgExecutionTime: 3000 },
        { name: 'data-transformation', proficiency: 0.87, usageCount: 95, successRate: 0.91, avgExecutionTime: 3500 }
      ],
      minBid: 20,
      maxTasks: 4,
      riskTolerance: 0.4,
      learningRate: 0.12
    },
    {
      id: 'data-analyst',
      name: 'Data Analyst',
      capabilities: [
        { name: 'statistical-analysis', proficiency: 0.93, usageCount: 105, successRate: 0.95, avgExecutionTime: 4000 },
        { name: 'visualization', proficiency: 0.89, usageCount: 85, successRate: 0.92, avgExecutionTime: 3500 }
      ],
      minBid: 22,
      maxTasks: 3,
      riskTolerance: 0.35,
      learningRate: 0.12
    }
  ];

  const dataSwarm = new AgentSwarm({
    agents: dataAgents,
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

  const dataPipeline = await dataSwarm.execute({
    task: `
      Process sales data from multiple sources:
      1. Collect data from APIs
      2. Clean and normalize data
      3. Transform to standard format
      4. Perform statistical analysis
      5. Generate visualizations
    `,
    budget: 350,
    timeout: 60000,
    priority: 7,
    capabilities: ['data-scraping', 'api-integration', 'data-cleaning', 'data-transformation', 'statistical-analysis', 'visualization']
  });

  console.log('Data pipeline executed:');
  console.log(`  Cost: ${dataPipeline.totalCost} tokens`);
  console.log(`  Stages: ${dataPipeline.subtasks.length}`);
  console.log(`  Success rate: ${(dataPipeline.successRate * 100).toFixed(1)}%\n`);

  // Scenario 3: Code Review Automation
  console.log('--- Scenario 3: Code Review Automation ---\n');

  const codeAgents = [
    {
      id: 'linter',
      name: 'Linter',
      capabilities: [
        { name: 'code-quality-check', proficiency: 0.95, usageCount: 150, successRate: 0.97, avgExecutionTime: 1500 },
        { name: 'style-check', proficiency: 0.93, usageCount: 140, successRate: 0.96, avgExecutionTime: 1200 }
      ],
      minBid: 12,
      maxTasks: 8,
      riskTolerance: 0.3,
      learningRate: 0.1
    },
    {
      id: 'security-reviewer',
      name: 'Security Reviewer',
      capabilities: [
        { name: 'security-audit', proficiency: 0.90, usageCount: 100, successRate: 0.94, avgExecutionTime: 4000 },
        { name: 'vulnerability-scan', proficiency: 0.92, usageCount: 110, successRate: 0.95, avgExecutionTime: 3500 }
      ],
      minBid: 25,
      maxTasks: 4,
      riskTolerance: 0.3,
      learningRate: 0.12
    },
    {
      id: 'performance-reviewer',
      name: 'Performance Reviewer',
      capabilities: [
        { name: 'performance-analysis', proficiency: 0.88, usageCount: 90, successRate: 0.92, avgExecutionTime: 3500 },
        { name: 'optimization-suggestions', proficiency: 0.86, usageCount: 85, successRate: 0.90, avgExecutionTime: 4000 }
      ],
      minBid: 22,
      maxTasks: 4,
      riskTolerance: 0.35,
      learningRate: 0.12
    }
  ];

  const codeSwarm = new AgentSwarm({
    agents: codeAgents,
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

  const codeReview = await codeSwarm.execute({
    task: `
      Comprehensive code review for pull request:
      1. Run linting and style checks
      2. Perform security audit
      3. Analyze performance characteristics
      4. Generate review report
    `,
    budget: 250,
    timeout: 45000,
    priority: 9,
    capabilities: ['code-quality-check', 'style-check', 'security-audit', 'performance-analysis']
  });

  console.log('Code review completed:');
  console.log(`  Cost: ${codeReview.totalCost} tokens`);
  console.log(`  Checks: ${codeReview.subtasks.length}`);
  console.log(`  Quality: ${(codeReview.avgQuality * 100).toFixed(1)}%`);
  console.log(`  Parallel review by ${codeReview.agentsInvolved} agents\n`);

  // Scenario 4: Research Synthesis
  console.log('--- Scenario 4: Research Synthesis ---\n');

  const researchAgents = [
    {
      id: 'source-collector',
      name: 'Source Collector',
      capabilities: [
        { name: 'academic-search', proficiency: 0.90, usageCount: 95, successRate: 0.93, avgExecutionTime: 3000 },
        { name: 'source-evaluation', proficiency: 0.87, usageCount: 85, successRate: 0.90, avgExecutionTime: 2500 }
      ],
      minBid: 18,
      maxTasks: 5,
      riskTolerance: 0.4,
      learningRate: 0.12
    },
    {
      id: 'synthesizer',
      name: 'Synthesizer',
      capabilities: [
        { name: 'information-synthesis', proficiency: 0.92, usageCount: 100, successRate: 0.94, avgExecutionTime: 5000 },
        { name: 'trend-analysis', proficiency: 0.89, usageCount: 90, successRate: 0.92, avgExecutionTime: 4500 }
      ],
      minBid: 22,
      maxTasks: 3,
      riskTolerance: 0.35,
      learningRate: 0.15
    },
    {
      id: 'report-writer',
      name: 'Report Writer',
      capabilities: [
        { name: 'technical-writing', proficiency: 0.91, usageCount: 105, successRate: 0.94, avgExecutionTime: 6000 },
        { name: 'citation-formatting', proficiency: 0.88, usageCount: 95, successRate: 0.91, avgExecutionTime: 3000 }
      ],
      minBid: 20,
      maxTasks: 3,
      riskTolerance: 0.35,
      learningRate: 0.12
    }
  ];

  const researchSwarm = new AgentSwarm({
    agents: researchAgents,
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

  const research = await researchSwarm.execute({
    task: `
      Research synthesis on "Federated Learning":
      1. Collect academic sources
      2. Evaluate source quality
      3. Synthesize key findings
      4. Identify trends
      5. Write comprehensive report with citations
    `,
    budget: 400,
    timeout: 90000,
    priority: 8,
    capabilities: ['academic-search', 'source-evaluation', 'information-synthesis', 'trend-analysis', 'technical-writing', 'citation-formatting']
  });

  console.log('Research synthesis completed:');
  console.log(`  Cost: ${research.totalCost} tokens`);
  console.log(`  Sources analyzed: ${research.subtasks.length}`);
  console.log(`  Report quality: ${(research.avgQuality * 100).toFixed(1)}%`);

  console.log('\n💡 Real-World Benefits:');
  console.log('1. Scalability: Handle complex multi-stage workflows');
  console.log('2. Parallelization: Speed up with concurrent execution');
  console.log('3. Specialization: Each agent focuses on their strength');
  console.log('4. Cost efficiency: Market finds optimal allocation');
  console.log('5. Fault tolerance: Graceful handling of failures');
  console.log('6. Quality assurance: Reputation system ensures quality');

  console.log('\n✅ Real-world scenarios demonstration complete!');
}

demonstrateRealWorldScenarios().catch(console.error);
