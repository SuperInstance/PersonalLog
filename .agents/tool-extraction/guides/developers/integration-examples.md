# Integration Examples - Developer Guide

**Version:** 1.0.0  
**Purpose:** Complete integration examples for PersonalLog tools

---

## Table of Contents

1. [Overview](#overview)
2. [Example 1: Spreader + Cascade Router](#example-1-spreader--cascade-router)
3. [Example 2: Spreader + MPC](#example-2-spreader--mpc)
4. [Example 3: JEPA + Spreader](#example-3-jepa--spreader)
5. [Example 4: Full Stack Integration](#example-4-full-stack-integration)
6. [Example 5: Custom Workflow](#example-5-custom-workflow)

---

## Overview

This guide provides complete, working examples of how to integrate multiple PersonalLog tools together to build powerful AI orchestration systems.

---

## Example 1: Spreader + Cascade Router

### Use Case: Cost-Optimized Parallel Research

Automatically route specialist requests to optimal providers based on cost, performance, and budget.

```typescript
import { Spreader } from '@superinstance/spreader';
import { CascadeRouter } from '@superinstance/cascade-router';

// Setup Cascade Router with multiple providers
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
  budgetPeriod: 3600000, // 1 hour
  fallbackEnabled: true,
  costOptimization: true,
  monitoringEnabled: true,
});

// Create custom provider that uses Cascade Router
const RouterProvider = {
  name: 'cascade-router',
  type: 'custom' as const,
  version: '1.0.0',
  
  async complete(prompt: string, options: any) {
    const result = await router.route({
      prompt,
      estimatedTokens: options.maxTokens || 2000,
      priority: 'normal',
      options,
    });
    
    return result.result;
  },
  
  async streamComplete(prompt: string, options: any, onProgress: any) {
    // Streaming implementation
    return this.complete(prompt, options);
  },
  
  countTokens(text: string) {
    return Math.ceil(text.length / 4);
  },
  
  validateConfig(config: unknown) {
    return true;
  },
  
  async isAvailable() {
    return true;
  },
  
  getCapabilities() {
    return {
      maxContextWindow: 128000,
      maxOutputTokens: 4096,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      supportsSystemPrompt: true,
      availableModels: ['gpt-4-turbo', 'claude-3-opus-20240229'],
      requiresApiKey: true,
      supportsCustomBaseURL: true,
    };
  },
};

// Initialize Spreader with router
const spreader = new Spreader({
  request: 'Analyze AI safety research',
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
      systemPrompt: 'You are a research specialist...',
      provider: 'cascade-router', // Use router!
    },
    {
      id: 'architect-1',
      role: 'architect',
      systemPrompt: 'You are an architecture specialist...',
      provider: 'cascade-router',
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
    verbose: true,
  },
});

// Execute spread
spreader.on('spread_completed', async (data) => {
  console.log('Spread completed!');
  console.log(`Total tokens: ${data.totalTokens}`);
  
  // Check final budget status
  const budget = router.getBudgetStatus();
  console.log(`Budget remaining: ${budget.remaining}/${budget.totalBudget} tokens`);
  console.log(`Utilization: ${budget.utilizationPercentage.toFixed(1)}%`);
});

const result = await spreader.spread('Analyze AI safety research');
```

---

## Example 2: Spreader + MPC

### Use Case: Optimized Multi-Agent Research

Use MPC to optimize Spreader execution with predictive planning and resource management.

```typescript
import { Spreader } from '@superinstance/spreader';
import { mpcController, stateManager } from '@superinstance/mpc';
import { TaskPriority, ResourceType } from '@superinstance/mpc';
import { detectHardware } from '@superinstance/hardware';

// Initialize MPC
await mpcController.initialize({
  horizon: {
    steps: 10,
    stepDuration: 5,
    totalDuration: 50,
    replanInterval: 30,
  },
  objective: {
    name: 'balanced_optimization',
    description: 'Balance time, quality, and cost',
    weights: {
      timeWeight: 1.0,
      qualityWeight: 0.8,
      resourceWeight: 0.5,
      riskWeight: 0.3,
      priorityWeight: 0.7,
    },
    constraints: [
      {
        name: 'max_time',
        type: 'max_time',
        value: 300,
        strict: true,
      },
    ],
  },
  maxParallelAgents: 4,
  enableReplanning: true,
  predictionUpdateInterval: 1000,
  stateHistorySize: 100,
  anomalyThreshold: 0.8,
  conflictStrategy: 'hybrid',
  hardwareProfile: await detectHardware(),
});

// Create Spreader task in MPC
await stateManager.addTask({
  id: 'spreader-research',
  name: 'Multi-Agent Research',
  description: 'Execute Spreader research with 5 specialists',
  agentId: 'spreader-agent',
  priority: TaskPriority.HIGH,
  estimatedDuration: 120,
  resourceRequirements: new Map([
    [ResourceType.TOKENS, 50000],
    [ResourceType.API_RATE, 20],
    [ResourceType.CPU, 2],
  ]),
  dependencies: [],
  createdAt: Date.now(),
});

// Start MPC
await mpcController.start();

// Listen to MPC events
mpcController.addEventListener('plan_created', (event) => {
  console.log('MPC Plan created:', event.data.planId);
  console.log('Expected quality:', event.data.expectedQuality);
  console.log('Risk level:', event.data.risk);
});

mpcController.addEventListener('conflict_detected', (event) => {
  console.warn('Conflict detected:', event.data.conflict);
});

// Initialize Spreader
const spreader = new Spreader({
  request: 'Analyze quantum computing applications',
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
      systemPrompt: 'Research quantum computing applications...',
      provider: 'openai',
      model: 'gpt-4-turbo',
    },
    {
      id: 'architect-1',
      role: 'architect',
      systemPrompt: 'Analyze quantum computing architecture...',
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
    },
    // ... more specialists
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
    verbose: true,
  },
});

// Generate plan
const plan = await mpcController.plan();
console.log(`Executing plan ${plan.id}`);

// Execute Spreader
spreader.on('specialist_completed', (data) => {
  console.log(`Specialist ${data.specialistId} completed`);
  
  // Update task progress in MPC
  stateManager.updateTask('spreader-research', {
    qualityScore: 0.8, // Estimated quality
  });
});

const result = await spreader.spread('Analyze quantum computing');

// Stop MPC
await mpcController.stop();
```

---

## Example 3: JEPA + Spreader

### Use Case: Emotion-Aware Research

Use JEPA to detect user frustration and automatically adjust Spreader behavior.

```typescript
import { getJEPAAgent } from '@superinstance/jepa';
import { Spreader } from '@superinstance/spreader';
import { agentEventBus } from '@superinstance/agents';

// Initialize JEPA
const jepaAgent = getJEPAAgent();
await jepaAgent.initialize();

// Listen for frustration
jepaAgent.on('emotion_analyzed', (data) => {
  const { emotion } = data;
  
  // Check for frustration: low valence + high arousal + high confidence
  const isFrustrated = 
    emotion.valence < 0.4 && 
    emotion.arousal > 0.6 && 
    emotion.confidence > 0.5;
  
  if (isFrustrated) {
    console.warn('⚠️ User frustration detected!');
    
    // Publish frustration to Spreader
    agentEventBus.publish({
      id: crypto.randomUUID(),
      from: { agentId: 'jepa-v1', type: 'agent' },
      to: { agentId: 'spreader-v1', type: 'agent' },
      type: MessageType.USER_FRUSTRATION_DETECTED,
      payload: {
        valence: emotion.valence,
        arousal: emotion.arousal,
        confidence: emotion.confidence,
        suggestedAction: 'compact_context',
      },
      timestamp: Date.now(),
      priority: 'high',
      status: 'pending',
    });
  }
});

// Initialize Spreader with emotion awareness
const spreader = new Spreader({
  request: 'Analyze AI safety research',
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
      systemPrompt: 'You are a research specialist...',
      provider: 'openai',
    },
    // ... more specialists
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
    verbose: true,
  },
});

// Subscribe to JEPA messages in Spreader
agentEventBus.subscribe('spreader-v1', async (message) => {
  if (message.type === MessageType.USER_FRUSTRATION_DETECTED) {
    console.log('Frustration detected, adjusting Spreader behavior');
    
    // Compact context to reduce complexity
    await spreader.compactContext({
      strategy: 'emotional-summary',
      preserveEmotional: true,
    });
    
    // Use faster, simpler specialists
    await spreader.adjustSpecialists({
      useSimplerModels: true,
      reduceCount: true,
    });
  }
});

// Start JEPA recording
await jepaAgent.startRecording();

// Execute Spreader
const result = await spreader.spread('Analyze AI safety research');
```

---

## Example 4: Full Stack Integration

### Use Case: Complete AI Orchestration System

Integrate all tools for a comprehensive AI orchestration system.

```typescript
import { Spreader } from '@superinstance/spreader';
import { CascadeRouter } from '@superinstance/cascade-router';
import { mpcController, stateManager } from '@superinstance/mpc';
import { getJEPAAgent } from '@superinstance/jepa';
import { detectHardware } from '@superinstance/hardware';
import { TaskPriority, ResourceType } from '@superinstance/mpc';

// 1. Detect hardware
const hardwareProfile = await detectHardware();
console.log('Hardware Profile:', hardwareProfile);

// 2. Initialize Cascade Router
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
  },
  defaultProvider: 'openai',
  tokenBudget: 100000,
  budgetPeriod: 3600000,
  fallbackEnabled: true,
  costOptimization: true,
  monitoringEnabled: true,
});

// 3. Initialize MPC
await mpcController.initialize({
  horizon: {
    steps: 10,
    stepDuration: 5,
    totalDuration: 50,
    replanInterval: 30,
  },
  objective: {
    name: 'full_optimization',
    description: 'Optimize for speed, quality, and cost',
    weights: {
      timeWeight: 1.0,
      qualityWeight: 0.8,
      resourceWeight: 0.5,
      riskWeight: 0.3,
      priorityWeight: 0.7,
    },
    constraints: [
      {
        name: 'max_time',
        type: 'max_time',
        value: 300,
        strict: true,
      },
      {
        name: 'min_quality',
        type: 'min_quality',
        value: 0.7,
        strict: false,
      },
    ],
  },
  maxParallelAgents: hardwareProfile.cpu.cores,
  enableReplanning: true,
  predictionUpdateInterval: 1000,
  stateHistorySize: 100,
  anomalyThreshold: 0.8,
  conflictStrategy: 'hybrid',
  hardwareProfile,
});

// 4. Initialize JEPA
const jepaAgent = getJEPAAgent();
await jepaAgent.initialize();

// 5. Setup emotion-based priority adjustment
jepaAgent.on('emotion_analyzed', async (data) => {
  const { emotion } = data;
  
  if (emotion.valence < 0.4 && emotion.arousal > 0.6) {
    // User frustrated - increase task priority
    const state = stateManager.getCurrentState();
    for (const [taskId, task] of state.tasks) {
      if (task.status === 'pending') {
        await stateManager.updateTask(taskId, {
          priority: TaskPriority.CRITICAL,
        });
      }
    }
    
    // Trigger replanning
    await mpcController.triggerReplan();
  }
});

// 6. Create Spreader
const spreader = new Spreader({
  request: '',
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
      systemPrompt: 'You are a research specialist...',
      provider: 'cascade-router',
    },
    {
      id: 'architect-1',
      role: 'architect',
      systemPrompt: 'You are an architecture specialist...',
      provider: 'cascade-router',
    },
    // ... more specialists
  ],
  output: {
    format: 'markdown',
    directory: './output',
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

// 7. Add Spreader task to MPC
await stateManager.addTask({
  id: 'main-research',
  name: 'Comprehensive Research',
  description: 'Execute multi-specialist research',
  agentId: 'spreader-agent',
  priority: TaskPriority.HIGH,
  estimatedDuration: 120,
  resourceRequirements: new Map([
    [ResourceType.TOKENS, 50000],
    [ResourceType.API_RATE, 20],
    [ResourceType.CPU, Math.min(hardwareProfile.cpu.cores, 4)],
  ]),
  dependencies: [],
  createdAt: Date.now(),
});

// 8. Start system
await mpcController.start();
await jepaAgent.startRecording();

// 9. Execute
const plan = await mpcController.plan();
console.log('Executing plan:', plan.id);

spreader.on('spread_completed', async (data) => {
  console.log('Research completed!');
  console.log('Final budget:', router.getBudgetStatus());
  
  await mpcController.stop();
  await jepaAgent.dispose();
});

const result = await spreader.spread('Analyze AI safety research');
```

---

## Example 5: Custom Workflow

### Use Case: Progressive Research with Feedback

Implement a research workflow that iteratively refines based on results.

```typescript
import { Spreader } from '@superinstance/spreader';

async function progressiveResearch(topic: string, iterations: number = 3) {
  let context = {
    messages: [],
    metadata: {
      totalTokens: 0,
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'parent' as const,
    },
  };
  
  for (let i = 0; i < iterations; i++) {
    console.log(`\n=== Iteration ${i + 1}/${iterations} ===`);
    
    // Adjust prompt based on iteration
    let prompt = topic;
    if (i > 0) {
      prompt = `Refine and expand on previous research: ${topic}`;
    }
    
    // Create Spreader for this iteration
    const spreader = new Spreader({
      request: prompt,
      parentContext: context,
      specialists: [
        {
          id: `researcher-${i}`,
          role: 'researcher',
          systemPrompt: `You are a research specialist (iteration ${i + 1}). Build on previous findings...`,
          provider: 'openai',
        },
        {
          id: `critic-${i}`,
          role: 'critic',
          systemPrompt: `You are a critical analyst. Review findings for iteration ${i + 1}...`,
          provider: 'anthropic',
        },
      ],
      output: {
        format: 'markdown',
        directory: `./iteration-${i + 1}`,
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
    
    // Execute this iteration
    const result = await spreader.spread(prompt);
    
    // Update context with findings
    context.messages.push({
      role: 'assistant',
      content: `Iteration ${i + 1} findings: ${result.summary}`,
      timestamp: new Date(),
      tokens: result.totalTokens,
    });
    
    context.metadata.totalTokens += result.totalTokens;
    context.metadata.messageCount += 1;
    context.metadata.updatedAt = new Date();
    
    console.log(`Completed iteration ${i + 1}`);
    console.log(`Total tokens so far: ${context.metadata.totalTokens}`);
    
    // Compact context if needed
    if (context.metadata.totalTokens > 40000) {
      console.log('Compacting context...');
      // Compact context logic here
    }
  }
  
  console.log('\n=== Progressive Research Complete ===');
  return context;
}

// Execute
await progressiveResearch('Analyze AI safety research', 3);
```

---

## License

MIT License
