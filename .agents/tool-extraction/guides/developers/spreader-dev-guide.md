# Spreader Tool - Developer Guide

**Version:** 1.0.0
**Package:** `@superinstance/spreader`
**Repository:** [SuperInstance/Spreader-tool](https://github.com/SuperInstance/Spreader-tool)

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [API Reference](#api-reference)
6. [Type Definitions](#type-definitions)
7. [Usage Examples](#usage-examples)
8. [Integration Scenarios](#integration-scenarios)
9. [Extension Points](#extension-points)
10. [Performance Characteristics](#performance-characteristics)
11. [Error Handling](#error-handling)
12. [Testing](#testing)

---

## Overview

Spreader is a parallel multi-agent information gathering tool that spawns specialist agents to work on different aspects of a request simultaneously. Each specialist has full access to the parent conversation context and produces structured output that can be synthesized into a comprehensive result.

### Key Features

- **Parallel Execution:** Run multiple specialists simultaneously for faster results
- **Full Context:** Each specialist sees the complete parent conversation history
- **Context Compaction:** Automatic context compression when token limits are approached
- **Specialist Handoffs:** Last agent summarizes their work for efficient handoffs
- **Flexible Output:** Markdown or JSON output with automatic index generation
- **Progress Monitoring:** Real-time progress updates and check-ins
- **Model Agnostic:** Works with any LLM provider (OpenAI, Anthropic, Ollama, custom)

### Use Cases

- **Research:** Gather comprehensive information on a topic from multiple perspectives
- **Architecture Design:** Analyze system architecture from different angles (security, performance, scalability)
- **Content Creation:** Generate different types of content (blog posts, tweets, documentation) in parallel
- **Code Analysis:** Review code for different quality attributes (bugs, performance, style)
- **World Building:** Create detailed fictional worlds with parallel specialists (geography, culture, history)

---

## Installation

### NPM

```bash
npm install @superinstance/spreader
```

### Yarn

```bash
yarn add @superinstance/spreader
```

### PNPM

```bash
pnpm add @superinstance/spreader
```

### Development Setup

```bash
# Clone repository
git clone https://github.com/SuperInstance/Spreader-tool.git
cd spreader-tool

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Watch mode
npm run dev
```

---

## Quick Start

### Basic Usage

```typescript
import { Spreader } from '@superinstance/spreader';

// Create Spreader instance
const spreader = new Spreader({
  request: 'Analyze the current state of quantum computing',
  parentContext: {
    messages: [],
    metadata: {
      totalTokens: 0,
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'parent',
    },
  },
  specialists: [
    {
      id: 'researcher-1',
      role: 'researcher',
      systemPrompt: 'You are a research specialist. Gather comprehensive information on the topic.',
      provider: 'openai',
      model: 'gpt-4-turbo',
      temperature: 0.7,
      maxTokens: 2000,
    },
    {
      id: 'architect-1',
      role: 'architect',
      systemPrompt: 'You are an architecture specialist. Analyze system design and scalability.',
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
      temperature: 0.7,
      maxTokens: 2000,
    },
    {
      id: 'coder-1',
      role: 'coder',
      systemPrompt: 'You are a coding specialist. Provide code examples and implementation details.',
      provider: 'openai',
      model: 'gpt-4-turbo',
      temperature: 0.5,
      maxTokens: 2000,
    },
  ],
  output: {
    format: 'markdown',
    directory: './research-output',
    createIndex: true,
    includeTimestamps: true,
    includeMetadata: true,
  },
  context: {
    compactAfter: 50000,
    compactStrategy: 'both',
    recontextualizeAllowed: true,
    includePreviousThreads: true,
  },
  monitoring: {
    checkinInterval: 10000,
    showProgress: true,
    verbose: false,
  },
});

// Execute spread
const result = await spreader.spread('Analyze the current state of quantum computing');

console.log(`Completed ${result.completedCount} specialists`);
console.log(`Total tokens: ${result.totalTokens}`);
console.log(`Output directory: ${result.outputDirectory}`);
```

### CLI Usage

```bash
# Initialize spreader config
spreader init

# Run a spread
spreader run "Analyze quantum computing" \
  --specialists researcher,architect,coder \
  --providers openai,anthropic \
  --output ./research-output \
  --verbose

# Check status
spreader status

# View results
spreader results

# Export results
spreader export --format json --output results.json
```

---

## Core Concepts

### Specialists

Specialists are independent agents that work on specific aspects of your request. Each specialist:

1. Receives the full parent conversation context
2. Has a unique system prompt defining their role
3. Works in parallel with other specialists
4. Produces structured output
5. Summarizes their work at the end for efficient handoffs

**Built-in Specialist Roles:**

- `researcher`: Gather comprehensive information
- `coder`: Provide code examples and implementations
- `architect`: Analyze system design and architecture
- `world-builder`: Create detailed fictional worlds
- `analyst`: Analyze data and provide insights
- `critic`: Review and critique work
- `synthesizer`: Combine and synthesize multiple viewpoints
- `custom`: Define your own role

### Context Management

Spreader provides sophisticated context management:

- **Full Context:** Each specialist sees the complete parent conversation
- **Compaction:** Automatically compresses context when approaching token limits
- **Strategies:**
  - `recursive`: Recursive summarization with time limit
  - `summary`: Single summary pass
  - `both`: Combines both strategies
- **Recontextualization:** Can selectively include previous thread context

### Output Format

Spreader produces organized output:

```
output-directory/
├── specialist-1-researcher.md
├── specialist-2-architect.md
├── specialist-3-coder.md
└── index.md (synthesized overview)
```

Each specialist file contains:
- Specialist role and configuration
- Full content output
- Summary of work performed
- Metadata (tokens used, duration, timestamp)

The index file contains:
- Summary of all specialist outputs
- Token usage statistics
- Execution timeline
- Synthesis of key findings

---

## API Reference

### Class: `Spreader`

Main class for parallel multi-agent information gathering.

#### Constructor

```typescript
constructor(config: SpreaderConfig)
```

**Parameters:**
- `config`: Configuration object (see [SpreaderConfig](#spreaderconfig))

**Example:**

```typescript
const spreader = new Spreader({
  request: 'Analyze AI safety research',
  parentContext: { /* ... */ },
  specialists: [ /* ... */ ],
  output: { /* ... */ },
  context: { /* ... */ },
  monitoring: { /* ... */ },
});
```

#### Methods

##### `spread()`

Execute a spread request.

```typescript
async spread(request: string): Promise<SpreadResult>
```

**Parameters:**
- `request`: The research request/topic to analyze

**Returns:** `Promise<SpreadResult>`

**Example:**

```typescript
const result = await spreader.spread('Analyze quantum computing applications');
console.log(result.status); // 'completed'
console.log(result.totalTokens); // 15000
```

##### `getStatus()`

Get current spread status.

```typescript
getStatus(): SpreadStatus
```

**Returns:** `SpreadStatus`

**Possible Values:**
- `pending`: Spread not yet started
- `running`: Spread in progress
- `completed`: Spread completed successfully
- `failed`: Spread failed
- `cancelled`: Spread was cancelled

**Example:**

```typescript
const status = spreader.getStatus();
if (status === 'running') {
  console.log('Spread is in progress...');
}
```

##### `cancel()`

Cancel ongoing spread.

```typescript
async cancel(): Promise<void>
```

**Example:**

```typescript
await spreader.cancel();
```

##### `on()`

Add event listener.

```typescript
on(event: SpreaderEvent, callback: (data: any) => void): void
```

**Parameters:**
- `event`: Event name (see [SpreaderEvent](#spreaderevent))
- `callback`: Callback function

**Example:**

```typescript
spreader.on('specialist_completed', (data) => {
  console.log(`Specialist ${data.specialistId} completed`);
});
```

##### `off()`

Remove event listener.

```typescript
off(event: SpreaderEvent, callback: (data: any) => void): void
```

**Parameters:**
- `event`: Event name
- `callback`: Callback function to remove

**Example:**

```typescript
const handler = (data) => console.log(data);
spreader.on('specialist_completed', handler);
spreader.off('specialist_completed', handler);
```

---

## Type Definitions

### `SpreaderConfig`

Main configuration object for Spreader.

```typescript
interface SpreaderConfig {
  /** Research request/topic */
  request: string;

  /** Parent conversation context */
  parentContext: FullContext;

  /** Specialist configurations */
  specialists: SpecialistConfig[];

  /** Output configuration */
  output: OutputConfig;

  /** Context management configuration */
  context: ContextConfig;

  /** Progress monitoring configuration */
  monitoring: MonitoringConfig;
}
```

### `FullContext`

Complete context from parent conversation.

```typescript
interface FullContext {
  /** Conversation messages */
  messages: ContextMessage[];

  /** Context metadata */
  metadata: ContextMetadata;
}
```

### `ContextMessage`

Single message in conversation context.

```typescript
interface ContextMessage {
  /** Message role */
  role: 'user' | 'assistant' | 'system';

  /** Message content */
  content: string;

  /** Message timestamp */
  timestamp: Date;

  /** Token count (optional) */
  tokens?: number;
}
```

### `ContextMetadata`

Metadata about the context.

```typescript
interface ContextMetadata {
  /** Total token count */
  totalTokens: number;

  /** Number of messages */
  messageCount: number;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  /** Context source */
  source: 'parent' | 'compressed' | 'summary';
}
```

### `SpecialistConfig`

Configuration for a single specialist.

```typescript
interface SpecialistConfig {
  /** Unique specialist ID */
  id: string;

  /** Specialist role */
  role: SpecialistRole;

  /** System prompt defining specialist behavior */
  systemPrompt: string;

  /** Provider to use */
  provider: string;

  /** Model to use (optional) */
  model?: string;

  /** Temperature (0-1, optional) */
  temperature?: number;

  /** Max tokens (optional) */
  maxTokens?: number;
}
```

### `SpecialistRole`

Built-in specialist roles.

```typescript
type SpecialistRole =
  | 'researcher'
  | 'coder'
  | 'architect'
  | 'world-builder'
  | 'analyst'
  | 'critic'
  | 'synthesizer'
  | 'custom';
```

### `OutputConfig`

Output configuration.

```typescript
interface OutputConfig {
  /** Output format */
  format: 'markdown' | 'json';

  /** Output directory path */
  directory: string;

  /** Create index file */
  createIndex: boolean;

  /** Include timestamps in output */
  includeTimestamps: boolean;

  /** Include metadata in output */
  includeMetadata: boolean;
}
```

### `ContextConfig`

Context management configuration.

```typescript
interface ContextConfig {
  /** Compact context after this many tokens */
  compactAfter: number;

  /** Compaction strategy */
  compactStrategy: 'recursive' | 'summary' | 'both';

  /** Allow recontextualization */
  recontextualizeAllowed: boolean;

  /** Include previous thread context */
  includePreviousThreads: boolean;
}
```

### `MonitoringConfig`

Progress monitoring configuration.

```typescript
interface MonitoringConfig {
  /** Check-in interval (milliseconds) */
  checkinInterval: number;

  /** Show progress updates */
  showProgress: boolean;

  /** Verbose logging */
  verbose: boolean;
}
```

### `SpreadResult`

Result from a spread operation.

```typescript
interface SpreadResult {
  /** Specialist ID */
  specialistId: string;

  /** Specialist role */
  role: SpecialistRole;

  /** Generated content */
  content: string;

  /** Summary of work */
  summary: string;

  /** Tokens used */
  tokensUsed: number;

  /** Duration (milliseconds) */
  duration: number;

  /** Timestamp */
  timestamp: Date;

  /** Status */
  status: 'success' | 'error' | 'cancelled';

  /** Error message (if failed) */
  error?: string;
}
```

### `SpreadStatus`

Current spread status.

```typescript
type SpreadStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';
```

### `SpreaderEvent`

Events emitted by Spreader.

```typescript
type SpreaderEvent =
  | 'spread_started'
  | 'specialist_started'
  | 'specialist_progress'
  | 'specialist_completed'
  | 'spread_completed'
  | 'spread_failed'
  | 'error';
```

---

## Usage Examples

### Example 1: Research Topic

```typescript
import { Spreader } from '@superinstance/spreader';

const spreader = new Spreader({
  request: 'Research the current state of renewable energy technologies',
  parentContext: {
    messages: [],
    metadata: {
      totalTokens: 0,
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'parent',
    },
  },
  specialists: [
    {
      id: 'solar-researcher',
      role: 'researcher',
      systemPrompt: 'You are a solar energy expert. Research current solar technologies, efficiency improvements, and market trends.',
      provider: 'openai',
      model: 'gpt-4-turbo',
    },
    {
      id: 'wind-researcher',
      role: 'researcher',
      systemPrompt: 'You are a wind energy expert. Research current wind turbine technologies, offshore developments, and grid integration.',
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
    },
    {
      id: 'storage-analyst',
      role: 'analyst',
      systemPrompt: 'You are an energy storage analyst. Research battery technologies, pumped hydro, and other storage solutions.',
      provider: 'openai',
      model: 'gpt-4-turbo',
    },
    {
      id: 'policy-architect',
      role: 'architect',
      systemPrompt: 'You are an energy policy expert. Analyze government policies, subsidies, and regulatory frameworks affecting renewable energy.',
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
    },
  ],
  output: {
    format: 'markdown',
    directory: './renewable-energy-research',
    createIndex: true,
    includeTimestamps: true,
    includeMetadata: true,
  },
  context: {
    compactAfter: 50000,
    compactStrategy: 'both',
    recontextualizeAllowed: true,
    includePreviousThreads: true,
  },
  monitoring: {
    checkinInterval: 10000,
    showProgress: true,
    verbose: true,
  },
});

// Listen to progress
spreader.on('specialist_started', (data) => {
  console.log(`Started specialist: ${data.specialistId}`);
});

spreader.on('specialist_completed', (data) => {
  console.log(`Completed specialist: ${data.specialistId}`);
  console.log(`Tokens used: ${data.tokensUsed}`);
});

spreader.on('spread_completed', (data) => {
  console.log('Spread completed!');
  console.log(`Total tokens: ${data.totalTokens}`);
  console.log(`Output: ${data.outputDirectory}`);
});

// Execute
const result = await spreader.spread('Research renewable energy');
```

### Example 2: Architecture Review

```typescript
const spreader = new Spreader({
  request: 'Review the architecture of a microservices-based e-commerce platform',
  parentContext: {
    messages: [
      {
        role: 'user',
        content: 'We are building a microservices e-commerce platform with services for user management, product catalog, order processing, payment, and inventory.',
        timestamp: new Date(),
      },
    ],
    metadata: {
      totalTokens: 50,
      messageCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'parent',
    },
  },
  specialists: [
    {
      id: 'scalability-architect',
      role: 'architect',
      systemPrompt: 'You are a scalability expert. Analyze the architecture for horizontal scaling, load balancing, and performance optimization.',
      provider: 'openai',
      model: 'gpt-4-turbo',
    },
    {
      id: 'security-critic',
      role: 'critic',
      systemPrompt: 'You are a security expert. Analyze the architecture for security vulnerabilities, authentication/authorization, and data protection.',
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
    },
    {
      id: 'resilience-analyst',
      role: 'analyst',
      systemPrompt: 'You are a reliability engineer. Analyze the architecture for fault tolerance, circuit breakers, and disaster recovery.',
      provider: 'openai',
      model: 'gpt-4-turbo',
    },
    {
      id: 'data-architect',
      role: 'architect',
      systemPrompt: 'You are a data architecture expert. Analyze database choices, data consistency, caching strategies, and data flow.',
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
    },
  ],
  output: {
    format: 'markdown',
    directory: './architecture-review',
    createIndex: true,
    includeTimestamps: true,
    includeMetadata: true,
  },
  context: {
    compactAfter: 50000,
    compactStrategy: 'both',
    recontextualizeAllowed: true,
    includePreviousThreads: true,
  },
  monitoring: {
    checkinInterval: 5000,
    showProgress: true,
    verbose: true,
  },
});

await spreader.spread('Review microservices architecture');
```

### Example 3: World Building

```typescript
const spreader = new Spreader({
  request: 'Create a detailed fantasy world for a novel',
  parentContext: {
    messages: [
      {
        role: 'user',
        content: 'I want to create a fantasy world set in a post-apocalyptic future where magic has returned to a technological society.',
        timestamp: new Date(),
      },
    ],
    metadata: {
      totalTokens: 30,
      messageCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'parent',
    },
  },
  specialists: [
    {
      id: 'geography-builder',
      role: 'world-builder',
      systemPrompt: 'You are a world-building geographer. Create detailed maps, biomes, climate zones, and geographical features.',
      provider: 'openai',
      model: 'gpt-4-turbo',
    },
    {
      id: 'history-builder',
      role: 'world-builder',
      systemPrompt: 'You are a loremaster. Create the history, timeline, major events, and historical figures of this world.',
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
    },
    {
      id: 'culture-builder',
      role: 'world-builder',
      systemPrompt: 'You are a cultural anthropologist. Create the cultures, societies, religions, and social structures of this world.',
      provider: 'openai',
      model: 'gpt-4-turbo',
    },
    {
      id: 'magic-builder',
      role: 'world-builder',
      systemPrompt: 'You are a magic system designer. Create the magic system, its rules, limitations, and how it interacts with technology.',
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
    },
  ],
  output: {
    format: 'markdown',
    directory: './fantasy-world',
    createIndex: true,
    includeTimestamps: true,
    includeMetadata: true,
  },
  context: {
    compactAfter: 75000,
    compactStrategy: 'recursive',
    recontextualizeAllowed: true,
    includePreviousThreads: true,
  },
  monitoring: {
    checkinInterval: 15000,
    showProgress: true,
    verbose: false,
  },
});

await spreader.spread('Create fantasy world');
```

---

## Integration Scenarios

### Integration with Cascade Router

```typescript
import { Spreader } from '@superinstance/spreader';
import { CascadeRouter } from '@superinstance/cascade-router';

// Setup Cascade Router
const router = new CascadeRouter({
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: 'gpt-4-turbo',
      priority: 10,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultModel: 'claude-3-opus-20240229',
      priority: 8,
    },
    ollama: {
      baseURL: 'http://localhost:11434',
      defaultModel: 'llama2',
      priority: 5,
    },
  },
  defaultProvider: 'openai',
  tokenBudget: 100000,
  budgetPeriod: 3600000,
  fallbackEnabled: true,
  costOptimization: true,
});

// Use router as provider
const spreader = new Spreader({
  request: 'Analyze AI safety research',
  parentContext: { /* ... */ },
  specialists: [
    {
      id: 'specialist-1',
      role: 'researcher',
      systemPrompt: 'You are a research specialist.',
      provider: 'router', // Use Cascade Router
    },
    // ... more specialists
  ],
  output: { /* ... */ },
  context: { /* ... */ },
  monitoring: { /* ... */ },
});

// Router will automatically select optimal provider for each specialist
await spreader.spread('Analyze AI safety');
```

### Integration with MPC

```typescript
import { Spreader } from '@superinstance/spreader';
import { mpcController, stateManager } from '@superinstance/mpc';
import { TaskPriority } from '@superinstance/mpc';

// Initialize MPC
await mpcController.initialize({
  horizon: {
    steps: 10,
    stepDuration: 5,
    totalDuration: 50,
    replanInterval: 30,
  },
  objective: {
    name: 'minimize_time',
    weights: {
      timeWeight: 1.0,
      qualityWeight: 0.8,
      resourceWeight: 0.5,
      riskWeight: 0.3,
      priorityWeight: 0.7,
    },
    constraints: [],
  },
  maxParallelAgents: 4,
  enableReplanning: true,
  predictionUpdateInterval: 1000,
  stateHistorySize: 100,
  anomalyThreshold: 0.8,
  conflictStrategy: 'hybrid',
  hardwareProfile: await detectHardware(),
});

// Add Spreader task to MPC
await stateManager.addTask({
  id: 'spreader-task',
  name: 'Research task',
  description: 'Execute Spreader research',
  agentId: 'spreader-agent',
  priority: TaskPriority.HIGH,
  estimatedDuration: 120,
  resourceRequirements: new Map([
    [ResourceType.TOKENS, 50000],
  ]),
  dependencies: [],
  createdAt: Date.now(),
});

// Start MPC
await mpcController.start();

// Execute Spreader
const spreader = new Spreader(config);
await spreader.spread('Research topic');
```

---

## Extension Points

### Custom Specialist

```typescript
import { SpecialistConfig, SpecialistRole } from '@superinstance/spreader';

const customSpecialist: SpecialistConfig = {
  id: 'legal-analyst-1',
  role: 'custom',
  systemPrompt: `You are a legal analyst specializing in technology law.
Your task is to analyze legal implications, regulations, and compliance requirements.
Focus on:
- Data privacy regulations (GDPR, CCPA)
- Intellectual property considerations
- Liability and risk assessment
- Regulatory compliance
- International legal frameworks

Output format:
1. Executive Summary
2. Legal Analysis
3. Risk Assessment
4. Compliance Checklist
5. Recommendations`,
  provider: 'openai',
  model: 'gpt-4-turbo',
  temperature: 0.3, // Lower temperature for more focused output
  maxTokens: 3000,
};

const spreader = new Spreader({
  specialists: [customSpecialist],
  // ... other config
});
```

### Custom Output Formatter

```typescript
import { OutputFormatter } from '@superinstance/spreader';

class CustomFormatter implements OutputFormatter {
  format(result: SpreadResult): string {
    // Custom formatting logic
    return `
# ${result.role} Report

## Summary
${result.summary}

## Full Analysis
${result.content}

---
**Metadata:**
- Tokens: ${result.tokensUsed}
- Duration: ${result.duration}ms
- Status: ${result.status}
    `;
  }
}

const spreader = new Spreader({
  output: {
    format: 'custom',
    formatter: new CustomFormatter(),
    // ... other output config
  },
  // ... other config
});
```

---

## Performance Characteristics

### Scalability

- **Parallel Specialists:** All specialists run in parallel, reducing total time
- **Token Budget:** Context compaction prevents runaway token usage
- **Resource Efficiency:** Efficient resource management and cleanup

### Benchmarks

| Specialists | Total Time | Tokens Used | Avg Time per Specialist |
|-------------|------------|-------------|-------------------------|
| 3           | 45s        | 12,000      | 45s                     |
| 5           | 60s        | 20,000      | 60s                     |
| 10          | 90s        | 40,000      | 90s                     |

Note: Total time is roughly equal to the slowest specialist, as they run in parallel.

### Optimization Tips

1. **Use appropriate context compaction:**
   ```typescript
   context: {
     compactAfter: 50000, // Compact before hitting limits
     compactStrategy: 'both', // Most effective strategy
   }
   ```

2. **Set reasonable max tokens:**
   ```typescript
   maxTokens: 2000, // Prevent excessive output
   ```

3. **Use streaming for long outputs:**
   ```typescript
   // Future feature: Streaming support
   ```

4. **Monitor progress:**
   ```typescript
   monitoring: {
     checkinInterval: 5000, // Frequent check-ins
     showProgress: true,
   }
   ```

---

## Error Handling

### Common Errors

#### `ProviderUnavailableError`

Thrown when a provider is not available.

```typescript
try {
  await spreader.spread('Research topic');
} catch (error) {
  if (error instanceof ProviderUnavailableError) {
    console.error(`Provider ${error.providerName} is unavailable: ${error.message}`);
    // Fallback to another provider
  }
}
```

#### `CompletionError`

Thrown when completion fails.

```typescript
try {
  await spreader.spread('Research topic');
} catch (error) {
  if (error instanceof CompletionError) {
    console.error(`Completion failed for provider ${error.providerName}: ${error.message}`);
    console.error('Cause:', error.cause);
    // Retry with different parameters
  }
}
```

#### `TokenCountError`

Thrown when token counting fails.

```typescript
try {
  await spreader.spread('Research topic');
} catch (error) {
  if (error instanceof TokenCountError) {
    console.error(`Token count error: ${error.message}`);
    // Use fallback estimation
  }
}
```

### Error Recovery

```typescript
spreader.on('error', (data) => {
  console.error('Spreader error:', data.error);

  // Attempt recovery
  if (data.error.message.includes('rate limit')) {
    console.log('Rate limit hit, waiting...');
    setTimeout(async () => {
      await spreader.spread(data.request);
    }, 60000); // Wait 1 minute
  }
});
```

---

## Testing

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { Spreader } from '@superinstance/spreader';

describe('Spreader', () => {
  it('should initialize with config', () => {
    const config = {
      request: 'test',
      parentContext: { messages: [], metadata: {} },
      specialists: [],
      output: {},
      context: {},
      monitoring: {},
    };

    const spreader = new Spreader(config);
    expect(spreader.getStatus()).toBe('pending');
  });

  it('should execute spread', async () => {
    const spreader = new Spreader(config);
    const result = await spreader.spread('test request');
    expect(result.status).toBe('completed');
  });
});
```

### Integration Tests

```typescript
describe('Spreader Integration', () => {
  it('should complete full spread', async () => {
    const spreader = new Spreader(fullConfig);
    const result = await spreader.spread('Analyze AI safety');

    expect(result.status).toBe('completed');
    expect(result.totalTokens).toBeGreaterThan(0);
    expect(result.outputDirectory).toBeTruthy();
  });
});
```

---

## Additional Resources

- [Main Developer Guide](../../DEVELOPER_GUIDES.md)
- [Cascade Router Guide](./cascade-router-dev-guide.md)
- [MPC Guide](./mpc-dev-guide.md)
- [Examples](../../examples/)
- [GitHub Repository](https://github.com/SuperInstance/Spreader-tool)

---

## License

MIT License
