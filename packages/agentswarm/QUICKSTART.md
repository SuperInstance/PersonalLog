# AgentSwarm - Quick Start Guide

Get started with AgentSwarm in 5 minutes!

## Installation

```bash
npm install @superinstance/agentswarm
```

## Your First AgentSwarm

Create a file `my-first-swarm.ts`:

```typescript
import { AgentSwarm } from '@superinstance/agentswarm';

// Step 1: Define your agents
const swarm = new AgentSwarm({
  agents: [
    {
      id: 'researcher',
      name: 'Research Agent',
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
      id: 'writer',
      name: 'Writer Agent',
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
      riskTolerance: 0.5,
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
async function runSwarm() {
  const result = await swarm.execute({
    task: 'Research AI trends and write a summary',
    budget: 500,
    timeout: 60000,
    priority: 5,
    capabilities: ['web-scraping', 'content-generation']
  });

  // Step 3: Check results
  console.log('✅ Task completed!');
  console.log('Cost:', result.totalCost, 'tokens');
  console.log('Quality:', (result.avgQuality * 100).toFixed(1), '%');
  console.log('Agents involved:', result.agentsInvolved);
  console.log('Output:', result.finalOutput);
}

runSwarm().catch(console.error);
```

## Run It!

```bash
npm install @superinstance/agentswarm
npx tsx my-first-swarm.ts
```

## What Just Happened?

1. **Market Created** - A double auction market was set up
2. **Agents Registered** - Two agents with different capabilities joined
3. **Task Posted** - Your task appeared on the market with a budget
4. **Bidding War** - Agents competed by placing bids
5. **Task Matched** - Best bid won (considering price, quality, reputation)
6. **Execution** - Agents executed their parts
7. **Results Aggregated** - Outputs combined into final result
8. **Payment** - Agents earned tokens, reputation updated

## Key Concepts

### Capabilities
Agents have capabilities with:
- **Proficiency** (0-1) - How good they are
- **Usage Count** - Experience level
- **Success Rate** - Reliability
- **Avg Execution Time** - Speed

### Bidding
Agents bid based on:
- Capability match (higher proficiency = higher bid)
- Risk tolerance (aggressive agents bid more)
- Reputation (better reputation = higher bids)
- Task priority (high priority = premium)

### Market
The market:
- Posts tasks to all agents
- Collects bids
- Matches best bid (price + quality + reputation)
- Tracks reputation
- Handles payments

### Reputation
Agents build reputation by:
- Completing tasks successfully
- Delivering high quality
- Meeting deadlines
Higher reputation = win more bids = earn more

## Next Steps

### Learn More

1. **Read the Examples** - 10 production examples in `/examples`
   ```bash
   npx tsx examples/01-basic-usage.ts
   npx tsx examples/02-market-mechanics.ts
   npx tsx examples/03-agent-specialization.ts
   # ... and 7 more
   ```

2. **Check the Documentation** - Full API docs in README.md

3. **Explore the Code** - Well-documented source code

### Advanced Usage

#### Custom Agents
```typescript
const specialist = {
  id: 'code-reviewer',
  name: 'Code Review Agent',
  capabilities: [
    {
      name: 'security-audit',
      proficiency: 0.95,
      usageCount: 100,
      successRate: 0.98,
      avgExecutionTime: 4000
    },
    {
      name: 'performance-analysis',
      proficiency: 0.88,
      usageCount: 80,
      successRate: 0.92,
      avgExecutionTime: 3500
    }
  ],
  minBid: 25,
  maxTasks: 3,
  riskTolerance: 0.3, // Conservative
  learningRate: 0.12
};
```

#### Market Types
```typescript
market: {
  type: 'double-auction' // Continuous matching
  // OR
  type: 'call-market' // Periodic clearing
  // OR
  type: 'continuous' // Immediate matching
}
```

#### Fault Tolerance
```typescript
faultTolerance: 'retry'     // Try failed tasks again
// OR
faultTolerance: 'repost'    // Relist with higher budget
// OR
faultTolerance: 'ignore'    // Continue without failed parts
```

#### Task Decomposition
```typescript
decompositionStrategy: 'hierarchical'  // Recursive breakdown
// OR
decompositionStrategy: 'flat'          // Parallel chunks
// OR
decompositionStrategy: 'adaptive'      // Auto-choose
```

### Monitoring

```typescript
// Get agent metrics
const metrics = swarm.getAllAgentMetrics();
for (const m of metrics) {
  console.log(`${m.agentId}:`);
  console.log(`  Earnings: ${m.earnings}`);
  console.log(`  Win Rate: ${(m.winRate * 100).toFixed(1)}%`);
  console.log(`  Reputation: ${(m.reputation.score * 100).toFixed(1)}%`);
}

// Get market stats
const stats = swarm.getMarketStats();
console.log(`Efficiency: ${(stats.efficiency * 100).toFixed(1)}%`);
console.log(`Clearing Price: ${stats.clearingPrice}`);

// Get swarm stats
const swarmStats = swarm.getSwarmStats();
console.log(`Total Executions: ${swarmStats.totalExecutions}`);
console.log(`Avg Success Rate: ${(swarmStats.avgSuccessRate * 100).toFixed(1)}%`);
```

## Common Patterns

### Content Pipeline
```typescript
const result = await swarm.execute({
  task: 'Create blog post',
  budget: 300,
  capabilities: ['web-research', 'writing', 'editing', 'seo']
});
```

### Data Processing
```typescript
const result = await swarm.execute({
  task: 'Process sales data',
  budget: 250,
  capabilities: ['data-scraping', 'data-cleaning', 'analysis']
});
```

### Code Review
```typescript
const result = await swarm.execute({
  task: 'Review pull request',
  budget: 200,
  priority: 9, // High priority
  capabilities: ['linting', 'security-audit', 'performance-analysis']
});
```

## Tips

1. **Start Simple** - Use 2-3 agents with clear capabilities
2. **Tune Budgets** - Higher budgets attract better agents
3. **Monitor Reputation** - Reliable agents build reputation over time
4. **Use Priority** - High-priority tasks get better agents
5. **Handle Faults** - Choose fault tolerance based on use case
6. **Check Metrics** - Monitor agent performance and market efficiency

## Troubleshooting

**Tasks not matching?**
- Check agent capacities (maxTasks)
- Verify capability matching
- Increase budget

**Low quality results?**
- Increase budget
- Enable reputation system
- Use priority parameter

**High costs?**
- Lower budgets
- Add more agents (competition lowers prices)
- Reduce fault tolerance retries

**Slow execution?**
- Increase maxTasks per agent
- Use flat decomposition
- Add more agents

## Resources

- **GitHub:** https://github.com/SuperInstance/AgentSwarm
- **NPM:** https://www.npmjs.com/package/@superinstance/agentswarm
- **Examples:** `/examples` directory (10 examples)
- **Documentation:** README.md, PROJECT_SUMMARY.md

## Support

- Open an issue on GitHub
- Join the discussion
- Read the examples
- Check the source code (well-documented!)

---

Happy swarming! 🐝
