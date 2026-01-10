# AgentSwarm

> Market-based multi-agent coordination system where agents bid on tasks, specialize autonomously, and self-organize to solve complex problems

[![npm version](https://badge.fury.io/js/%40superinstance%2Fagentswarm.svg)](https://www.npmjs.com/package/@superinstance/agentswarm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is AgentSwarm?

AgentSwarm is a revolutionary approach to multi-agent coordination that uses **market economics** instead of traditional orchestration. Agents:

- **Compete** for tasks through a double auction market
- **Specialize** in what they're good at (autonomous learning)
- **Self-organize** to solve complex problems without central coordination
- **Build reputation** through reliable performance
- **Optimize** costs through competitive pricing

## Key Features

- **Market-Based Coordination** - Double auction market for task-agent matching
- **Autonomous Specialization** - Agents learn what they're good at
- **Reputation System** - Quality-based agent selection
- **Fault Tolerance** - Retry, repost, or ignore strategies
- **Task Decomposition** - Hierarchical, flat, or adaptive strategies
- **Emergent Behavior** - Self-organizing swarms (10+ agents)
- **60 FPS Performance** - Real-time market operations
- **TypeScript** - Full type safety and IntelliSense

## Quick Start

### Installation

```bash
npm install @superinstance/agentswarm
```

### Basic Usage

```typescript
import { AgentSwarm } from '@superinstance/agentswarm';

// Create agents with different capabilities
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

// Execute a task - agents self-organize!
const result = await swarm.execute({
  task: 'Research WebGPU and write an article',
  budget: 500,
  timeout: 60000,
  priority: 5,
  capabilities: ['web-scraping', 'content-generation']
});

console.log('Final Output:', result.finalOutput);
console.log('Total Cost:', result.totalCost, 'tokens');
console.log('Savings:', result.savings, 'tokens');
console.log('Success Rate:', (result.successRate * 100).toFixed(1), '%');
```

## How It Works

### 1. Market-Based Coordination

Instead of traditional orchestration where a central controller assigns tasks, AgentSwarm uses a **double auction market**:

1. **Tasks are posted** to the market with a budget
2. **Agents place bids** based on their capabilities
3. **Market matches** tasks to best agents (considering price, quality, reputation)
4. **Agents execute** and get paid
5. **Reputation updates** based on performance

### 2. Autonomous Specialization

Agents learn what they're good at:

- **Capability Tracking** - Each capability has proficiency, usage count, success rate
- **Bid Strategy** - Agents bid higher on tasks they're good at
- **Learning** - Capability proficiencies update based on results
- **Specialization** - Agents naturally focus on profitable capabilities

### 3. Emergent Behaviors

Simple rules lead to complex, intelligent behavior:

- **Price Segmentation** - High-quality agents charge more, win high-budget tasks
- **Load Balancing** - Work distributes across available agents
- **Reputation Effects** - Reliable agents get more work
- **Specialization** - Agents focus on their strengths

## Examples

See the `/examples` directory for 10 production-ready examples:

1. **[Basic Usage](./examples/01-basic-usage.ts)** - Getting started
2. **[Market Mechanics](./examples/02-market-mechanics.ts)** - Understanding the auction
3. **[Agent Specialization](./examples/03-agent-specialization.ts)** - Learning behavior
4. **[Fault Tolerance](./examples/04-fault-tolerance.ts)** - Handling failures
5. **[Large-Scale Swarm](./examples/05-large-scale-swarm.ts)** - 10+ agent coordination
6. **[Emergent Behaviors](./examples/06-emergent-behaviors.ts)** - Self-organization
7. **[Dynamic Pricing](./examples/07-dynamic-pricing.ts)** - Price discovery
8. **[Task Decomposition](./examples/08-task-decomposition.ts)** - Breaking down tasks
9. **[Performance Optimization](./examples/09-performance-optimization.ts)** - Speed & cost
10. **[Real-World Scenarios](./examples/10-real-world-scenarios.ts)** - Production use cases

Run examples:

```bash
npm run build
node dist/examples/01-basic-usage.js
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        AgentSwarm                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐ │
│  │   Agent 1   │      │   Agent 2   │      │   Agent N   │ │
│  │  Researcher │      │   Writer    │      │   Coder     │ │
│  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘ │
│         │                    │                    │         │
│         └────────────────────┼────────────────────┘         │
│                              │                              │
│                    ┌─────────▼─────────┐                    │
│                    │   Market Engine   │                    │
│                    │  (Double Auction)  │                    │
│                    └─────────┬─────────┘                    │
│                              │                              │
│                    ┌─────────▼─────────┐                    │
│                    │  Orchestrator     │                    │
│                    │  - Decomposition  │                    │
│                    │  - Aggregation    │                    │
│                    │  - Coordination   │                    │
│                    └───────────────────┘                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Capabilities

Agents have capabilities with:

- **Proficiency** (0-1) - How good they are
- **Usage Count** - How many times used
- **Success Rate** - Percentage of successful executions
- **Average Execution Time** - Performance metric

### Bidding

Agents bid on tasks based on:

- **Capability Match** - Higher proficiency = higher bid
- **Risk Tolerance** - Aggressive agents bid higher
- **Reputation** - Better reputation = higher bids
- **Task Priority** - High priority = higher bids
- **Budget** - Can't bid over task budget

### Reputation

Reputation increases when:

- Tasks complete successfully
- High quality results
- On-time delivery
- Consistent performance

Reputation affects:

- Bid scoring (reputation-weighted matching)
- Win rate (higher reputation = more wins)
- Pricing power (can charge more)

### Task Decomposition

Three strategies:

1. **Hierarchical** - Break down into subtasks recursively
2. **Flat** - Split into parallel chunks
3. **Adaptive** - Choose based on task complexity

### Fault Tolerance

Three strategies:

1. **Retry** - Attempt failed subtasks multiple times
2. **Repost** - Relist with higher budget
3. **Ignore** - Continue without failed subtasks

## API Reference

### AgentSwarm

Main orchestrator class.

```typescript
const swarm = new AgentSwarm(config: SwarmConfig);

// Execute a task
const result = await swarm.execute({
  task: string,
  budget?: number,
  timeout?: number,
  priority?: number,
  capabilities?: string[]
}): Promise<ExecutionSummary>;

// Get metrics
const metrics = swarm.getAllAgentMetrics(): AgentMetrics[];
const stats = swarm.getSwarmStats(): SwarmStats;
const marketStats = swarm.getMarketStats(): MarketStats;
```

### Agent

Individual autonomous agent.

```typescript
const agent = new Agent(config: AgentConfig);

// Evaluate task (returns bid or null)
const bid = agent.evaluateTask(task: Task): Bid | null;

// Get current metrics
const metrics = agent.getMetrics(): AgentMetrics;

// Check capacity
const hasCapacity = agent.hasCapacity(): boolean;
```

### MarketEngine

Double auction market.

```typescript
const market = new MarketEngine(config: MarketConfig);

// Post task
market.postTask(task: Task): void;

// Place bid
market.placeBid(bid: Bid): boolean;

// Complete match
market.completeMatch(matchId: string, result: TaskResult): void;

// Get statistics
const stats = market.getStats(): MarketStats;
```

### TaskDecomposer

Task decomposition engine.

```typescript
const decomposer = new TaskDecomposer(config: SwarmConfig);

// Decompose task
const subtasks = decomposer.decompose(task: Task, depth?: number): Task[];

// Reconstruct results
const result = decomposer.reconstructResults(
  mainTask: Task,
  subtaskResults: Array<Task & { result?: unknown }>
): unknown;
```

## Configuration

### SwarmConfig

```typescript
interface SwarmConfig {
  agents: AgentConfig[];              // Agents in the swarm
  market: MarketConfig;               // Market configuration
  decompositionStrategy: 'hierarchical' | 'flat' | 'adaptive';
  maxDecompositionDepth: number;       // Maximum nesting level
  aggregationStrategy: 'merge' | 'vote' | 'best' | 'custom';
  faultTolerance: 'retry' | 'repost' | 'ignore';
  maxRetries: number;                 // For retry strategy
  loadBalancing: 'market-based' | 'round-robin' | 'least-loaded';
}
```

### AgentConfig

```typescript
interface AgentConfig {
  id: string;                         // Unique identifier
  name: string;                       // Display name
  capabilities: AgentCapabilities[];  // What they can do
  minBid: number;                     // Minimum bid amount
  maxTasks: number;                   // Concurrent task limit
  riskTolerance: number;              // 0-1, higher = more aggressive
  learningRate: number;               // 0-1, how fast they adapt
  metadata?: Record<string, unknown>; // Additional data
}
```

### MarketConfig

```typescript
interface MarketConfig {
  type: 'double-auction' | 'continuous' | 'call-market';
  clearingInterval?: number;          // For call market (ms)
  transactionFee: number;             // 0-1
  reputationSystem: boolean;
  reputationWeight: number;           // 0-1, weight in scoring
  minReputation: number;              // Minimum to participate
}
```

## Performance

- **10+ agents** coordinating smoothly
- **<100ms** task decomposition
- **<500ms** bid matching
- **60 FPS** market operations
- **Fault tolerance** with retry/repost

## Use Cases

- **Content Creation** - Research, writing, editing workflows
- **Data Processing** - ETL pipelines, analysis workflows
- **Code Review** - Automated PR review with specialized agents
- **Research** - Multi-source synthesis and analysis
- **Customer Support** - Tiered support with specialist agents
- **Any Multi-Stage Workflow** - Break down and distribute work

## Comparison

| Traditional Orchestration | AgentSwarm Market-Based |
|--------------------------|-------------------------|
| Central controller assigns tasks | Agents self-organize via market |
| Fixed agent roles | Dynamic specialization |
| Manual load balancing | Natural load balancing |
| Single point of failure | Fault tolerant |
| Rigid coordination | Flexible adaptation |

## Contributing

Contributions welcome! Please see [DEVELOPER.md](./DEVELOPER.md) for details.

## License

MIT © SuperInstance

## Related Packages

- **[@superinstance/spreader](https://github.com/SuperInstance/Spreader-tool)** - Parallel multi-agent information gathering
- **[@superinstance/cascade-router](https://github.com/SuperInstance/CascadeRouter)** - Intelligent LLM routing
- **[@superinstance/neuralstream](https://github.com/SuperInstance/NeuralStream)** - Agent inference engine

---

Built with ❤️ by the SuperInstance team
