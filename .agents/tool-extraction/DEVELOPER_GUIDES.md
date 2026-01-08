# PersonalLog Independent Tools - Developer Guide

**Version:** 1.0.0
**Last Updated:** 2025-01-07
**Status:** Active Development

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start for Developers](#quick-start-for-developers)
3. [Architecture](#architecture)
4. [API Reference](#api-reference)
   - [Spreader API](#spreader-api)
   - [Cascade Router API](#cascade-router-api)
   - [MPC (Model Predictive Control) API](#mpc-model-predictive-control-api)
   - [JEPA (Emotional Analysis) API](#jepa-emotional-analysis-api)
   - [Hardware Detection API](#hardware-detection-api)
5. [Integration Guide](#integration-guide)
6. [Plugin System](#plugin-system)
7. [Extension Points](#extension-points)
8. [Event System](#event-system)
9. [Contributing](#contributing)
10. [Design Patterns](#design-patterns)
11. [Performance Considerations](#performance-considerations)
12. [Testing Guide](#testing-guide)

---

## Overview

PersonalLog is composed of independent, production-ready tools that can be used standalone or combined into powerful AI orchestration systems. Each tool is:

- **Model-Agnostic:** Works with any LLM provider (OpenAI, Anthropic, Ollama, custom)
- **Framework-Agnostic:** Pure TypeScript/Node.js, no framework dependencies
- **Production-Ready:** Comprehensive error handling, TypeScript strict mode, 80%+ test coverage
- **Extensible:** Plugin architecture, event-driven, well-defined extension points
- **Documented:** Complete API references, examples, and integration guides

### Tool Ecosystem

| Tool | Purpose | Repository | Status |
|------|---------|------------|--------|
| **Spreader** | Parallel multi-agent information gathering and synthesis | [@superinstance/spreader](https://github.com/SuperInstance/Spreader-tool) | ✅ Extracted |
| **Cascade Router** | Intelligent LLM routing with cost optimization | [@superinstance/cascade-router](https://github.com/SuperInstance/CascadeRouter) | 🚧 In Progress |
| **MPC Orchestrator** | Model Predictive Control for multi-agent optimization | `@superinstance/mpc` | ✅ Production Ready |
| **JEPA** | Joint Embedding Predictive Architecture for emotion analysis | `@superinstance/jepa` | ✅ Production Ready |
| **Hardware Detection** | Cross-platform hardware capability detection | `@superinstance/hardware` | ✅ Production Ready |

---

## Quick Start for Developers

### Installation

Each tool can be installed independently via npm:

```bash
# Spreader - Parallel multi-agent research
npm install @superinstance/spreader

# Cascade Router - Intelligent LLM routing
npm install @superinstance/cascade-router

# MPC Orchestrator - Multi-agent optimization
npm install @superinstance/mpc

# JEPA - Emotion analysis
npm install @superinstance/jepa

# Hardware Detection - Capability detection
npm install @superinstance/hardware
```

### 5-Minute Setup Example

```typescript
import { Spreader } from '@superinstance/spreader';
import { CascadeRouter } from '@superinstance/cascade-router';
import { mpcController } from '@superinstance/mpc';

// 1. Setup Cascade Router for intelligent provider selection
const router = new CascadeRouter({
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      models: ['gpt-4-turbo', 'gpt-3.5-turbo'],
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
    },
  },
  defaultProvider: 'openai',
  tokenBudget: 100000, // 100k tokens per hour
});

// 2. Initialize Spreader with routing
const spreader = new Spreader({
  provider: router,
  specialists: ['researcher', 'architect', 'coder', 'analyst'],
  outputDirectory: './research-output',
});

// 3. Execute parallel research
const result = await spreader.spread('Analyze the current state of quantum computing');

console.log(`Completed ${result.completedCount} specialists`);
console.log(`Total tokens: ${result.totalTokens}`);
console.log(`Output: ${result.outputDirectory}`);

// 4. Use MPC for optimization (optional)
await mpcController.initialize({
  horizon: { steps: 10, stepDuration: 5, replanInterval: 30 },
  objective: {
    name: 'minimize_time',
    weights: {
      timeWeight: 1.0,
      qualityWeight: 0.8,
      resourceWeight: 0.5,
      riskWeight: 0.3,
      priorityWeight: 0.7,
    },
  },
  maxParallelAgents: 4,
  enableReplanning: true,
  predictionUpdateInterval: 1000,
  stateHistorySize: 100,
  anomalyThreshold: 0.8,
  conflictStrategy: 'hybrid',
  hardwareProfile: await detectHardware(), // From @superinstance/hardware
});

await mpcController.start();
```

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Spreader   │  │  Cascade     │  │         MPC          │  │
│  │  Tool       │  │  Router      │  │   Orchestrator       │  │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                     │              │
├─────────┼─────────────────┼─────────────────────┼──────────────┤
│         │     ┌───────────┴───────────┐         │              │
│         │     │   Event Bus System    │         │              │
│         │     │  (Agent Communication) │         │              │
│         │     └───────────────────────┘         │              │
├─────────┼───────────────────────────────────────┼──────────────┤
│         │                                       │              │
│  ┌──────▼──────┐  ┌──────────────┐  ┌──────────▼───────────┐  │
│  │    JEPA     │  │   Hardware   │  │   Vector Store       │  │
│  │  Emotion    │  │  Detection   │  │   (Optional)         │  │
│  │  Analysis   │  │              │  │                      │  │
│  └─────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                     Provider Layer                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ OpenAI   │ │Anthropic │ │ Ollama   │ │  Custom  │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        └────────────┴────────────┴────────────┘
                     │
              ┌──────▼──────┐
              │  File System│
              │   Storage   │
              └─────────────┘
```

### Design Principles

1. **Separation of Concerns:** Each tool has a single, well-defined responsibility
2. **Interface Segregation:** Minimal, focused interfaces for maximum flexibility
3. **Dependency Inversion:** Tools depend on abstractions, not concretions
4. **Open/Closed Principle:** Open for extension, closed for modification
5. **Event-Driven Architecture:** Loosely coupled communication via events
6. **Singleton Pattern:** Shared resources use singleton pattern with lazy initialization
7. **Factory Pattern:** Provider and agent creation via factory functions
8. **Observer Pattern:** Event listeners for state changes and progress updates

---

## API Reference

### Spreader API

#### Installation

```bash
npm install @superinstance/spreader
```

#### Core Classes

##### `Spreader`

Main class for parallel multi-agent information gathering.

**Constructor:**

```typescript
import { Spreader } from '@superinstance/spreader';

const spreader = new Spreader(config: SpreaderConfig);
```

**SpreaderConfig Interface:**

```typescript
interface SpreaderConfig {
  request: string;
  parentContext: FullContext;
  specialists: SpecialistConfig[];
  output: OutputConfig;
  context: ContextConfig;
  monitoring: MonitoringConfig;
}

interface FullContext {
  messages: ContextMessage[];
  metadata: ContextMetadata;
}

interface ContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens?: number;
}

interface SpecialistConfig {
  id: string;
  role: SpecialistRole;
  systemPrompt: string;
  provider: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

type SpecialistRole =
  | 'researcher'
  | 'coder'
  | 'architect'
  | 'world-builder'
  | 'analyst'
  | 'critic'
  | 'synthesizer'
  | 'custom';

interface OutputConfig {
  format: 'markdown' | 'json';
  directory: string;
  createIndex: boolean;
  includeTimestamps: boolean;
  includeMetadata: boolean;
}

interface ContextConfig {
  compactAfter: number;
  compactStrategy: 'recursive' | 'summary' | 'both';
  recontextualizeAllowed: boolean;
  includePreviousThreads: boolean;
}

interface MonitoringConfig {
  checkinInterval: number;
  showProgress: boolean;
  verbose: boolean;
}
```

**Methods:**

```typescript
class Spreader {
  /**
   * Execute a spread request
   */
  async spread(request: string): Promise<SpreadResult>;

  /**
   * Get current spread status
   */
  getStatus(): SpreadStatus;

  /**
   * Cancel ongoing spread
   */
  cancel(): Promise<void>;

  /**
   * Add event listener
   */
  on(event: SpreaderEvent, callback: (data: any) => void): void;

  /**
   * Remove event listener
   */
  off(event: SpreaderEvent, callback: (data: any) => void): void;
}

interface SpreadResult {
  specialistId: string;
  role: SpecialistRole;
  content: string;
  summary: string;
  tokensUsed: number;
  duration: number;
  timestamp: Date;
  status: 'success' | 'error' | 'cancelled';
  error?: string;
}

type SpreadStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

type SpreaderEvent =
  | 'spread_started'
  | 'specialist_started'
  | 'specialist_progress'
  | 'specialist_completed'
  | 'spread_completed'
  | 'spread_failed'
  | 'error';
```

**Usage Examples:**

```typescript
// Basic spread
const spreader = new Spreader({
  request: 'Analyze renewable energy technologies',
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
      model: 'gpt-4-turbo',
    },
    {
      id: 'architect-1',
      role: 'architect',
      systemPrompt: 'You are an architecture specialist...',
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
    },
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
    verbose: false,
  },
});

// Listen to events
spreader.on('specialist_completed', (data) => {
  console.log(`Specialist ${data.specialistId} completed`);
  console.log(`Summary: ${data.summary}`);
});

// Execute spread
const result = await spreader.spread('Analyze renewable energy technologies');
```

##### CLI Usage

```bash
# Initialize spreader
spreader init

# Run a spread
spreader run "Analyze quantum computing applications" \
  --specialists researcher,architect,coder \
  --providers openai,anthropic \
  --output ./research-output

# Check status
spreader status

# View results
spreader results
```

#### Provider Interface

Spreader works with any LLM provider implementing the `LLMProvider` interface:

```typescript
interface LLMProvider {
  readonly name: string;
  readonly type: ProviderType;
  readonly version: string;

  complete(
    prompt: string,
    options: CompletionOptions
  ): Promise<CompletionResult>;

  streamComplete(
    prompt: string,
    options: CompletionOptions,
    onProgress: ProgressCallback
  ): Promise<CompletionResult>;

  countTokens(text: string): number;

  validateConfig(config: unknown): boolean;

  isAvailable(): Promise<boolean>;

  getCapabilities(): ProviderCapabilities;
}

type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'ollama'
  | 'mcp'
  | 'custom';

interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  systemPrompt?: string;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

interface CompletionResult {
  text: string;
  tokensUsed: number;
  promptTokens?: number;
  completionTokens?: number;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  model: string;
  metadata?: Record<string, unknown>;
}

interface ProviderCapabilities {
  maxContextWindow: number;
  maxOutputTokens: number;
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  supportsSystemPrompt: boolean;
  availableModels: string[];
  requiresApiKey: boolean;
  supportsCustomBaseURL: boolean;
}
```

**Custom Provider Example:**

```typescript
import { LLMProvider, CompletionResult, CompletionOptions } from '@superinstance/spreader';

class CustomProvider implements LLMProvider {
  readonly name = 'custom-provider';
  readonly type = 'custom' as const;
  readonly version = '1.0.0';

  async complete(
    prompt: string,
    options: CompletionOptions
  ): Promise<CompletionResult> {
    // Your implementation
    const response = await this.callYourAPI(prompt, options);

    return {
      text: response.text,
      tokensUsed: response.tokens,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
      finishReason: response.stopReason,
      model: options.model || 'default',
    };
  }

  async streamComplete(
    prompt: string,
    options: CompletionOptions,
    onProgress: (delta: string, done: boolean) => void
  ): Promise<CompletionResult> {
    // Streaming implementation
    return this.complete(prompt, options);
  }

  countTokens(text: string): number {
    // Token counting implementation
    return Math.ceil(text.length / 4);
  }

  validateConfig(config: unknown): boolean {
    // Validation logic
    return true;
  }

  async isAvailable(): Promise<boolean> {
    // Availability check
    return true;
  }

  getCapabilities() {
    return {
      maxContextWindow: 128000,
      maxOutputTokens: 4096,
      supportsStreaming: true,
      supportsFunctionCalling: false,
      supportsSystemPrompt: true,
      availableModels: ['model-1', 'model-2'],
      requiresApiKey: true,
      supportsCustomBaseURL: true,
    };
  }
}
```

---

### Cascade Router API

#### Installation

```bash
npm install @superinstance/cascade-router
```

#### Core Classes

##### `CascadeRouter`

Intelligent LLM routing with cost optimization and progress monitoring.

**Constructor:**

```typescript
import { CascadeRouter } from '@superinstance/cascade-router';

const router = new CascadeRouter(config: RouterConfig);
```

**RouterConfig Interface:**

```typescript
interface RouterConfig {
  providers: Record<string, ProviderConfig>;
  defaultProvider: string;
  tokenBudget: number;
  budgetPeriod: number; // milliseconds
  fallbackEnabled: boolean;
  costOptimization: boolean;
  monitoringEnabled: boolean;
}

interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  defaultOptions?: Partial<CompletionOptions>;
  timeout?: number;
  maxRetries?: number;
  priority?: number; // Higher = preferred
}
```

**Methods:**

```typescript
class CascadeRouter {
  /**
   * Route request to optimal provider
   */
  async route(
    request: RoutingRequest
  ): Promise<RoutingResult>;

  /**
   * Get current token budget status
   */
  getBudgetStatus(): BudgetStatus;

  /**
   * Update provider configuration
   */
  updateProvider(
    providerId: string,
    config: Partial<ProviderConfig>
  ): void;

  /**
   * Add provider
   */
  addProvider(
    providerId: string,
    config: ProviderConfig
  ): void;

  /**
   * Remove provider
   */
  removeProvider(providerId: string): void;

  /**
   * Get provider statistics
   */
  getProviderStats(providerId: string): ProviderStats;

  /**
   * Reset token budget
   */
  resetBudget(): void;
}

interface RoutingRequest {
  prompt: string;
  estimatedTokens?: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  preferredProvider?: string;
  excludeProviders?: string[];
  options?: CompletionOptions;
}

interface RoutingResult {
  providerId: string;
  result: CompletionResult;
  cost: number;
  duration: number;
  fallbackUsed: boolean;
}

interface BudgetStatus {
  totalBudget: number;
  used: number;
  remaining: number;
  resetTime: Date;
  utilizationPercentage: number;
}

interface ProviderStats {
  requestCount: number;
  successRate: number;
  averageLatency: number;
  totalTokens: number;
  totalCost: number;
}
```

**Usage Examples:**

```typescript
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
      priority: 5, // Lower priority (cheaper/local)
    },
  },
  defaultProvider: 'openai',
  tokenBudget: 100000,
  budgetPeriod: 3600000, // 1 hour
  fallbackEnabled: true,
  costOptimization: true,
  monitoringEnabled: true,
});

// Route a request
const result = await router.route({
  prompt: 'Explain quantum entanglement',
  estimatedTokens: 500,
  priority: 'normal',
  options: {
    temperature: 0.7,
    maxTokens: 1000,
  },
});

console.log(`Provider: ${result.providerId}`);
console.log(`Response: ${result.result.text}`);
console.log(`Cost: $${result.cost.toFixed(4)}`);

// Check budget
const budget = router.getBudgetStatus();
console.log(`Budget: ${budget.remaining}/${budget.totalBudget} tokens`);

// If budget is low, router will automatically use cheaper/local providers
```

---

### MPC (Model Predictive Control) API

#### Installation

```bash
npm install @superinstance/mpc
```

#### Core Classes

##### `MPCController`

Model Predictive Control for multi-agent optimization.

**Initialization:**

```typescript
import { mpcController } from '@superinstance/mpc';

await mpcController.initialize(config: MPCConfig);
```

**MPCConfig Interface:**

```typescript
interface MPCConfig {
  horizon: PlanningHorizon;
  objective: OptimizationObjective;
  maxParallelAgents: number;
  enableReplanning: boolean;
  predictionUpdateInterval: number;
  stateHistorySize: number;
  anomalyThreshold: number;
  conflictStrategy: 'preventive' | 'reactive' | 'hybrid';
  hardwareProfile: HardwareProfile;
}

interface PlanningHorizon {
  steps: number;
  stepDuration: number; // seconds
  totalDuration: number; // steps * stepDuration
  replanInterval: number; // seconds
}

interface OptimizationObjective {
  name: string;
  description: string;
  weights: CostWeights;
  constraints: Constraint[];
}

interface CostWeights {
  timeWeight: number;
  qualityWeight: number;
  resourceWeight: number;
  riskWeight: number;
  priorityWeight: number;
}

interface Constraint {
  name: string;
  type: 'max_time' | 'min_quality' | 'max_resources' | 'max_risk';
  value: number;
  strict: boolean;
}
```

**Methods:**

```typescript
class MPCController {
  /**
   * Initialize controller
   */
  async initialize(config: MPCConfig): Promise<void>;

  /**
   * Start MPC loop
   */
  async start(): Promise<void>;

  /**
   * Stop MPC loop
   */
  async stop(): Promise<void>;

  /**
   * Reset controller state
   */
  async reset(): Promise<void>;

  /**
   * Generate optimal plan
   */
  async plan(): Promise<MPCPlan>;

  /**
   * Execute a plan
   */
  async execute(plan: MPCPlan): Promise<void>;

  /**
   * Get current status
   */
  getStatus(): MPCStatus;

  /**
   * Get current plan
   */
  getCurrentPlan(): MPCPlan | null;

  /**
   * Trigger replanning
   */
  async triggerReplan(): Promise<MPCPlan>;

  /**
   * Add event listener
   */
  addEventListener(
    eventType: MPCEventType,
    listener: (event: MPCEvent) => void
  ): void;

  /**
   * Remove event listener
   */
  removeEventListener(
    eventType: MPCEventType,
    listener: (event: MPCEvent) => void
  ): void;
}

enum MPCStatus {
  IDLE = 'idle',
  PLANNING = 'planning',
  EXECUTING = 'executing',
  PAUSED = 'paused',
  ERROR = 'error',
}

interface MPCPlan {
  id: string;
  createdAt: number;
  horizon: PlanningHorizon;
  objective: OptimizationObjective;
  steps: MPCPlanStep[];
  expectedCompletionTime: number;
  expectedQuality: number;
  totalCost: number;
  risk: number;
  confidence: number;
  predictedConflicts: ResourceConflict[];
  resourceAllocation: ResourceAllocation[];
  agentAssignments: Map<string, string[]>;
}

interface MPCPlanStep {
  step: number;
  tasks: string[];
  startTime: number;
  endTime: number;
  resourceUsage: Map<ResourceType, number>;
  dependenciesSatisfied: string[];
  risk: number;
  confidence: number;
}

enum MPCEventType {
  PLAN_CREATED = 'plan_created',
  PLAN_STARTED = 'plan_started',
  PLAN_COMPLETED = 'plan_completed',
  PLAN_FAILED = 'plan_failed',
  REPLAN_TRIGGERED = 'replan_triggered',
  CONFLICT_DETECTED = 'conflict_detected',
  CONFLICT_RESOLVED = 'conflict_resolved',
  ANOMALY_DETECTED = 'anomaly_detected',
  STATE_CHANGED = 'state_changed',
  AGENT_ASSIGNED = 'agent_assigned',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
}
```

**Usage Examples:**

```typescript
// Initialize MPC controller
await mpcController.initialize({
  horizon: {
    steps: 10,
    stepDuration: 5, // 5 seconds per step
    totalDuration: 50, // 50 seconds total
    replanInterval: 30, // Replan every 30 seconds
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
        value: 300, // 5 minutes max
        strict: true,
      },
      {
        name: 'min_quality',
        type: 'min_quality',
        value: 0.7, // 70% quality minimum
        strict: false,
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

// Listen to events
mpcController.addEventListener('plan_created', (event) => {
  console.log('New plan created:', event.data.planId);
  console.log('Expected quality:', event.data.expectedQuality);
  console.log('Risk level:', event.data.risk);
});

mpcController.addEventListener('conflict_detected', (event) => {
  console.warn('Conflict detected:', event.data.conflict);
});

// Start MPC loop
await mpcController.start();

// Generate plan
const plan = await mpcController.plan();
console.log(`Plan ${plan.id} with ${plan.steps.length} steps`);
console.log(`Expected completion: ${new Date(plan.expectedCompletionTime)}`);

// Execute plan
await mpcController.execute(plan);

// Trigger replanning if needed
if (someCondition) {
  const newPlan = await mpcController.triggerReplan();
}

// Stop when done
await mpcController.stop();
```

#### State Management

```typescript
import { stateManager } from '@superinstance/mpc';

// Get current state
const currentState = stateManager.getCurrentState();

// Add task
await stateManager.addTask({
  id: 'task-1',
  name: 'Research task',
  description: 'Conduct research on topic',
  agentId: 'agent-1',
  priority: TaskPriority.HIGH,
  estimatedDuration: 60,
  resourceRequirements: new Map([
    [ResourceType.TOKENS, 5000],
    [ResourceType.CPU, 2],
  ]),
  dependencies: [],
  createdAt: Date.now(),
});

// Update task
await stateManager.updateTask('task-1', {
  status: 'running',
  actualStart: Date.now(),
});

// Allocate resources
await stateManager.allocateResources(ResourceType.TOKENS, 5000);

// Detect anomalies
const anomalies = await stateManager.detectAnomalies();
for (const anomaly of anomalies) {
  console.warn(`Anomaly: ${anomaly.description}`);
}
```

---

### JEPA (Emotional Analysis) API

#### Installation

```bash
npm install @superinstance/jepa
```

#### Core Classes

##### `JEPAAgentHandler`

Joint Embedding Predictive Architecture for emotion analysis from audio and text.

**Initialization:**

```typescript
import { getJEPAAgent } from '@superinstance/jepa';

const jepaAgent = getJEPAAgent();
await jepaAgent.initialize();
```

**Methods:**

```typescript
class JEPAAgentHandler {
  /**
   * Initialize JEPA agent
   */
  async initialize(): Promise<void>;

  /**
   * Start recording and analyzing
   */
  async startRecording(): Promise<void>;

  /**
   * Stop recording
   */
  stopRecording(): void;

  /**
   * Pause recording
   */
  pauseRecording(): void;

  /**
   * Resume recording
   */
  async resumeRecording(): Promise<void>;

  /**
   * Export transcript as markdown
   */
  async exportTranscript(): Promise<string>;

  /**
   * Process a message for emotion
   */
  async processMessage(message: Message): Promise<EmotionAnalysis | null>;

  /**
   * Analyze emotion from audio buffer
   */
  async analyzeAudio(audioBuffer: AudioBuffer): Promise<EmotionAnalysis>;

  /**
   * Get current state
   */
  getState(): JEPAAgentState;

  /**
   * Clean up resources
   */
  async dispose(): Promise<void>;

  /**
   * Add event listener
   */
  on(eventName: string, listener: Function): () => void;
}

interface EmotionAnalysis {
  segmentId: string;
  timestamp: number;
  valence: number; // 0-1: positive vs negative
  arousal: number; // 0-1: energy/intensity
  dominance: number; // 0-1: confidence/assertiveness
  confidence: number; // 0-1: overall confidence
  emotions: string[]; // Detected emotion labels
}

interface JEPAAgentState {
  status: AgentState;
  confidence: number;
  recordingState: RecordingState;
  audioWindows: AudioWindow[];
  transcript: TranscriptSegment[];
  emotions: EmotionAnalysis[];
  recordingStartTime?: number;
  recordingDuration: number;
  lastAnalysisTime?: number;
}

enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}
```

**Usage Examples:**

```typescript
// Initialize
const jepaAgent = getJEPAAgent();
await jepaAgent.initialize();

// Listen to events
jepaAgent.on('emotion_analyzed', (data) => {
  const { emotion } = data;
  console.log(`Detected: ${emotion.emotions.join(', ')}`);
  console.log(`VAD: valence=${emotion.valence}, arousal=${emotion.arousal}, dominance=${emotion.dominance}`);

  // Check for frustration
  if (emotion.valence < 0.4 && emotion.arousal > 0.6) {
    console.warn('User frustration detected!');
  }
});

jepaAgent.on('recording_started', () => {
  console.log('Recording started');
});

// Start recording
await jepaAgent.startRecording();

// Analyze audio (ML-based)
const audioContext = new AudioContext();
const audioBuffer = await audioContext.decodeAudioData(audioData);
const emotion = await jepaAgent.analyzeAudio(audioBuffer);
console.log('Emotion:', emotion);

// Process text message
const textEmotion = await jepaAgent.processMessage({
  id: 'msg-1',
  author: 'user',
  content: { text: 'I am very frustrated with this!' },
  timestamp: new Date().toISOString(),
});

// Export transcript
const transcript = await jepaAgent.exportTranscript();
console.log(transcript);

// Clean up
await jepaAgent.dispose();
```

---

### Hardware Detection API

#### Installation

```bash
npm install @superinstance/hardware
```

#### Core Functions

##### `detectHardware()`

Cross-platform hardware capability detection.

```typescript
import { detectHardware } from '@superinstance/hardware';

const hardwareProfile = await detectHardware();
```

**HardwareProfile Interface:**

```typescript
interface HardwareProfile {
  platform: 'darwin' | 'linux' | 'windows';
  cpu: CPUProfile;
  gpu: GPUProfile[];
  memory: MemoryProfile;
  storage: StorageProfile;
  capabilities: Set<string>;
  je paScore: number; // 0-100: JEPA capability score
}

interface CPUProfile {
  model: string;
  cores: number;
  threads: number;
  frequency: number; // GHz
  architecture: string;
}

interface GPUProfile {
  name: string;
  vendor: string;
  memory: number; // MB
  computeCapability?: string;
  driverVersion?: string;
}

interface MemoryProfile {
  total: number; // GB
  available: number; // GB
  used: number; // GB
}

interface StorageProfile {
  total: number; // GB
  available: number; // GB
  type: 'ssd' | 'hdd' | 'nvme';
}
```

**Usage Examples:**

```typescript
// Detect hardware
const profile = await detectHardware();

console.log('Platform:', profile.platform);
console.log('CPU:', profile.cpu.model, `(${profile.cpu.cores} cores)`);
console.log('Memory:', `${profile.memory.available}/${profile.memory.total} GB`);
console.log('GPUs:', profile.gpu.map(g => g.name).join(', '));
console.log('JEPA Score:', profile.jepaScore);

// Check capabilities
if (profile.capabilities.has('gpu-acceleration')) {
  console.log('GPU acceleration available');
}

if (profile.capabilities.has('microphone')) {
  console.log('Microphone available for JEPA');
}

// Use profile for agent selection
if (profile.jepaScore > 50) {
  // Enable JEPA agent
} else {
  // Use text-only emotion analysis
}
```

---

## Integration Guide

### Combining Spreader + Cascade Router

```typescript
import { Spreader } from '@superinstance/spreader';
import { CascadeRouter } from '@superinstance/cascade-router';

// Setup router
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

// Use router as provider for Spreader
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
      provider: 'router', // Use Cascade Router
    },
    {
      id: 'architect-1',
      role: 'architect',
      systemPrompt: 'You are an architecture specialist...',
      provider: 'router',
    },
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
    verbose: false,
  },
});

// Execute spread
const result = await spreader.spread('Analyze AI safety research');

// Router will automatically select optimal provider for each specialist
// based on token budget, cost, and priority
```

### Combining Spreader + MPC

```typescript
import { Spreader } from '@superinstance/spreader';
import { mpcController, stateManager } from '@superinstance/mpc';
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
    name: 'minimize_time',
    description: 'Minimize completion time while maintaining quality',
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

// Add tasks to MPC
await stateManager.addTask({
  id: 'spread-task-1',
  name: 'Spreader research task',
  description: 'Execute Spreader research',
  agentId: 'spreader-agent',
  priority: TaskPriority.HIGH,
  estimatedDuration: 120,
  resourceRequirements: new Map([
    [ResourceType.TOKENS, 50000],
    [ResourceType.API_RATE, 10],
  ]),
  dependencies: [],
  createdAt: Date.now(),
});

// Start MPC
await mpcController.start();

// MPC will optimize Spreader execution
// Plan parallel execution, manage resources, handle conflicts
```

### Combining JEPA + Spreader

```typescript
import { getJEPAAgent } from '@superinstance/jepa';
import { Spreader } from '@superinstance/spreader';

// Initialize JEPA
const jepaAgent = getJEPAAgent();
await jepaAgent.initialize();

// Listen for frustration
jepaAgent.on('emotion_analyzed', async (data) => {
  const { emotion } = data;

  // If user is frustrated, trigger compaction
  if (emotion.valence < 0.4 && emotion.arousal > 0.6) {
    console.warn('User frustration detected, triggering context compaction');

    // Notify Spreader to compact context
    // (Assuming Spreader has a compact method)
    await spreader.compactContext({
      strategy: 'emotional-summary',
      preserveEmotions: true,
    });
  }
});

// Start recording
await jepaAgent.startRecording();

// Use Spreader
const spreader = new Spreader(config);

// JEPA will analyze emotions in real-time
// and communicate with Spreader via event bus
```

---

## Plugin System

All tools support plugins for extensibility.

### Creating a Plugin

```typescript
import { Plugin, PluginContext } from '@superinstance/spreader';

interface MyPluginConfig {
  option1: string;
  option2: number;
}

class MyPlugin implements Plugin {
  name = 'my-plugin';
  version = '1.0.0';

  async initialize(context: PluginContext, config: MyPluginConfig): Promise<void> {
    // Initialize plugin
    console.log('Plugin initialized with config:', config);
  }

  async beforeSpecialist(context: PluginContext): Promise<void> {
    // Hook before specialist execution
    console.log('Before specialist:', context.specialistId);
  }

  async afterSpecialist(context: PluginContext): Promise<void> {
    // Hook after specialist execution
    console.log('After specialist:', context.specialistId);
  }

  async cleanup(): Promise<void> {
    // Cleanup resources
  }
}

// Register plugin
const spreader = new Spreader(config);
spreader.registerPlugin(new MyPlugin(), {
  option1: 'value1',
  option2: 42,
});
```

---

## Extension Points

### Custom Specialists

```typescript
import { SpecialistConfig, SpecialistRole } from '@superinstance/spreader';

const customSpecialist: SpecialistConfig = {
  id: 'custom-specialist-1',
  role: 'custom',
  systemPrompt: `You are a domain expert in [your domain].
Your task is to [specific task].
Focus on [specific focus areas].
Output format: [desired format].`,
  provider: 'openai',
  model: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 2000,
};

// Use in Spreader
const spreader = new Spreader({
  specialists: [customSpecialist],
  // ... other config
});
```

### Custom Prediction Models

```typescript
import { MPCPredictor, MPCState, PlanningHorizon } from '@superinstance/mpc';

const customPredictor: MPCPredictor = async (
  state: MPCState,
  observations: Record<string, unknown>,
  horizon: PlanningHorizon
): Promise<MPCState[]> => {
  // Your custom prediction logic
  const predictedStates: MPCState[] = [];

  for (let i = 0; i < horizon.steps; i++) {
    // Predict next state
    const nextState = predictNextState(state, observations);
    predictedStates.push(nextState);
  }

  return predictedStates;
};

// Use in MPC
mpcController.setPredictor(customPredictor);
```

### Custom Cost Functions

```typescript
import { MPCOptimizer, MPCPlan, OptimizationObjective, MPCState } from '@superinstance/mpc';

const customOptimizer: MPCOptimizer = async (
  predictedStates: MPCState[],
  objective: OptimizationObjective,
  currentPlan?: MPCPlan
): Promise<MPCPlan> => {
  // Your custom optimization logic
  // Calculate costs, find optimal plan
  return optimizedPlan;
};

// Use in MPC
mpcController.setOptimizer(customOptimizer);
```

---

## Event System

All tools emit events for monitoring and integration.

### Event Types

#### Spreader Events

```typescript
spreader.on('spread_started', (data) => {
  console.log('Spread started:', data.spreadId);
});

spreader.on('specialist_started', (data) => {
  console.log('Specialist started:', data.specialistId);
});

spreader.on('specialist_progress', (data) => {
  console.log('Progress:', data.progress, '%');
});

spreader.on('specialist_completed', (data) => {
  console.log('Specialist completed:', data.summary);
});

spreader.on('spread_completed', (data) => {
  console.log('Spread completed:', data.totalTokens, 'tokens');
});

spreader.on('error', (data) => {
  console.error('Error:', data.error);
});
```

#### MPC Events

```typescript
mpcController.addEventListener('plan_created', (event) => {
  console.log('Plan created:', event.data.planId);
});

mpcController.addEventListener('conflict_detected', (event) => {
  console.warn('Conflict:', event.data.conflict);
});

mpcController.addEventListener('anomaly_detected', (event) => {
  console.warn('Anomaly:', event.data.anomaly);
});
```

#### JEPA Events

```typescript
jepaAgent.on('emotion_analyzed', (data) => {
  console.log('Emotion:', data.emotion);
});

jepaAgent.on('recording_started', () => {
  console.log('Recording started');
});

jepaAgent.on('transcript_exported', (data) => {
  console.log('Transcript exported:', data.charCount, 'chars');
});
```

---

## Contributing

### Development Setup

```bash
# Clone repository
git clone https://github.com/SuperInstance/[tool-name].git
cd [tool-name]

# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

### Code Style

- TypeScript strict mode enabled
- 2 space indentation
- Single quotes for strings
- Semicolons required
- 100 character line limit
- JSDoc comments on all public APIs

### Testing

```typescript
import { describe, it, expect } from 'vitest';

describe('MyFeature', () => {
  it('should do something', async () => {
    const result = await myFeature();
    expect(result).toBe('expected');
  });
});
```

### Pull Request Process

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request
6. Address review feedback
7. Merge when approved

---

## Design Patterns

### Singleton Pattern

```typescript
class MyClass {
  private static instance: MyClass;

  static getInstance(): MyClass {
    if (!MyClass.instance) {
      MyClass.instance = new MyClass();
    }
    return MyClass.instance;
  }
}

const instance = MyClass.getInstance();
```

### Factory Pattern

```typescript
interface Provider {
  create(): Provider;
}

class ProviderFactory {
  static create(type: string, config: ProviderConfig): Provider {
    switch (type) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }
}

const provider = ProviderFactory.create('openai', config);
```

### Observer Pattern

```typescript
class EventEmitter {
  private listeners: Map<string, Set<Function>> = new Map();

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }
}
```

### Strategy Pattern

```typescript
interface CompressionStrategy {
  compress(data: string): string;
}

class RecursiveCompression implements CompressionStrategy {
  compress(data: string): string {
    // Recursive compression logic
  }
}

class SummaryCompression implements CompressionStrategy {
  compress(data: string): string {
    // Summary compression logic
  }
}

class Compressor {
  constructor(private strategy: CompressionStrategy) {}

  setStrategy(strategy: CompressionStrategy): void {
    this.strategy = strategy;
  }

  compress(data: string): string {
    return this.strategy.compress(data);
  }
}
```

---

## Performance Considerations

### Token Optimization

```typescript
// Use context compaction
const spreader = new Spreader({
  context: {
    compactAfter: 50000, // Compact after 50k tokens
    compactStrategy: 'both', // Use both recursive and summary
  },
});

// Use streaming for long responses
await provider.streamComplete(
  prompt,
  options,
  (delta, done) => {
    // Process incrementally
  }
);
```

### Parallel Execution

```typescript
// Spreader automatically runs specialists in parallel
// Configure max parallelism in MPC
await mpcController.initialize({
  maxParallelAgents: 4, // Run up to 4 agents in parallel
});
```

### Resource Management

```typescript
// Monitor resource usage
const state = stateManager.getCurrentState();
for (const [type, resource] of state.resources) {
  console.log(`${type}: ${resource.used}/${resource.total}`);
}

// Set token budgets
const router = new CascadeRouter({
  tokenBudget: 100000, // 100k tokens per hour
  budgetPeriod: 3600000, // 1 hour
});
```

---

## Testing Guide

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Spreader', () => {
  it('should initialize with config', () => {
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
describe('Spreader + Cascade Router Integration', () => {
  it('should route requests optimally', async () => {
    const router = new CascadeRouter(routerConfig);
    const spreader = new Spreader({
      provider: router,
      // ... other config
    });

    const result = await spreader.spread('test');
    expect(result.totalCost).toBeLessThan(1.0); // Less than $1
  });
});
```

### E2E Tests

```typescript
describe('End-to-End Workflow', () => {
  it('should complete full research workflow', async () => {
    const router = new CascadeRouter(config);
    const spreader = new Spreader({ provider: router });
    await mpcController.initialize(mpcConfig);

    await mpcController.start();
    const result = await spreader.spread('Analyze AI safety');
    await mpcController.stop();

    expect(result.status).toBe('completed');
  });
});
```

---

## Additional Resources

- [Individual Tool Guides](.agents/tool-extraction/guides/developers/)
- [Architecture Documentation](.agents/tool-extraction/ARCHITECTURE.md)
- [Examples](.agents/tool-extraction/examples/)
- [Community Forum](https://github.com/SuperInstance/spreader/discussions)
- [Issue Tracker](https://github.com/SuperInstance/spreader/issues)

---

## License

MIT License - See LICENSE file for details
