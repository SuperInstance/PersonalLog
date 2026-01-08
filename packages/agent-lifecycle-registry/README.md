# @superinstance/agent-lifecycle-registry

> Agent Lifecycle Registry - Manage AI agent definitions, availability checking, and lifecycle

[![npm version](https://badge.fury.io/js/%40superinstance%2Fagent-lifecycle-registry.svg)](https://www.npmjs.com/package/@superinstance/agent-lifecycle-registry)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful, standalone agent registry system for managing AI agent lifecycles. Register agents, check hardware compatibility, manage activation states, and respond to events - all with zero external dependencies.

## Features

- **Agent Registration** - Register and manage AI agent definitions
- **Availability Checking** - Check if agents can run based on hardware requirements
- **Lifecycle Management** - Activate, deactivate, and track agent states
- **Event System** - Listen to agent lifecycle events
- **Type-Safe** - Full TypeScript support with comprehensive types
- **Validation** - Built-in validation for agent definitions
- **Zero Dependencies** - Works completely standalone

## Installation

```bash
npm install @superinstance/agent-lifecycle-registry
```

## Quick Start

```typescript
import { agentRegistry, registerPresetAgents, AgentCategory, ActivationMode, AgentState } from '@superinstance/agent-lifecycle-registry';

// Register preset agents
registerPresetAgents();

// Define a custom agent
agentRegistry.registerAgent({
  id: 'my-analyzer-v1',
  name: 'Text Analyzer',
  description: 'Analyzes text for sentiment and key topics',
  icon: '📊',
  category: AgentCategory.ANALYSIS,
  activationMode: ActivationMode.BACKGROUND,
  initialState: { status: AgentState.IDLE },
  metadata: {
    version: '1.0.0',
    author: 'Your Name',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['analysis', 'text', 'nlp'],
  }
});

// Check availability
const hardwareProfile = {
  cpu: { cores: 8 },
  memory: { totalGB: 16 },
  gpu: {
    available: true,
    webgpu: { supported: true },
    webgl: { supported: true },
  },
  features: { webassembly: true },
};

const availability = await agentRegistry.checkAvailability('my-analyzer-v1', hardwareProfile);
console.log(`Available: ${availability.available}`);

// Activate the agent
agentRegistry.activateAgent('my-analyzer-v1');

// Listen to events
agentRegistry.addEventListener('agent_activated', (event) => {
  console.log(`Agent ${event.agentId} activated at ${event.timestamp}`);
});
```

## Core Concepts

### Agent Definition

An agent is defined by:

- **id** - Unique identifier (e.g., 'jepa-v1')
- **name** - Human-readable name
- **description** - What the agent does
- **icon** - Emoji or icon identifier
- **category** - Agent category (ANALYSIS, KNOWLEDGE, CREATIVE, etc.)
- **activationMode** - BACKGROUND, FOREGROUND, HYBRID, or SCHEDULED
- **initialState** - Initial agent state when activated
- **metadata** - Version, author, tags, etc.
- **requirements** - Optional hardware/feature requirements
- **configSchema** - Optional configuration schema
- **examples** - Optional example configurations

### Agent Categories

```typescript
enum AgentCategory {
  ANALYSIS = 'analysis',      // Analysis and insight generation
  KNOWLEDGE = 'knowledge',    // Knowledge management and retrieval
  CREATIVE = 'creative',      // Creative content generation
  AUTOMATION = 'automation',  // Task automation and execution
  COMMUNICATION = 'communication', // Communication and messaging
  DATA = 'data',             // Data processing and transformation
  CUSTOM = 'custom',         // User-created custom agents
}
```

### Agent States

```typescript
enum AgentState {
  IDLE = 'idle',       // Agent is idle and ready
  RUNNING = 'running', // Agent is actively processing
  PAUSED = 'paused',   // Agent is paused
  ERROR = 'error',     // Agent encountered an error
  DISABLED = 'disabled', // Agent is disabled/unavailable
}
```

## Usage Examples

### Example 1: Registering and Managing Agents

```typescript
import { agentRegistry, AgentCategory, ActivationMode, AgentState } from '@superinstance/agent-lifecycle-registry';

// Register an agent
agentRegistry.registerAgent({
  id: 'summarizer-v1',
  name: 'Summarizer',
  description: 'Summarizes long text into key points',
  icon: '📝',
  category: AgentCategory.DATA,
  activationMode: ActivationMode.FOREGROUND,
  initialState: { status: AgentState.IDLE },
  metadata: {
    version: '1.0.0',
    author: 'Your Team',
    createdAt: '2025-01-08T00:00:00Z',
    updatedAt: '2025-01-08T00:00:00Z',
    tags: ['summarization', 'text-processing'],
  }
});

// Get all agents
const allAgents = agentRegistry.getAllAgents();

// Get agents by category
const dataAgents = agentRegistry.getAgentsByCategory(AgentCategory.DATA);

// Search agents
const results = agentRegistry.searchAgents('summarize');

// Unregister an agent
agentRegistry.unregisterAgent('summarizer-v1');
```

### Example 2: Hardware Availability Checking

```typescript
import { agentRegistry } from '@superinstance/agent-lifecycle-registry';

// Define hardware profile
const hardwareProfile = {
  cpu: { cores: 8, model: 'Intel i7' },
  memory: { totalGB: 16 },
  gpu: {
    available: true,
    webgpu: { supported: true },
    webgl: { supported: true },
  },
  features: { webassembly: true },
};

// Check specific agent availability
const availability = await agentRegistry.checkAvailability('jepa-v1', hardwareProfile);

if (availability.available) {
  console.log('JEPA agent is available!');
} else {
  console.log('JEPA agent not available:', availability.reason);
  console.log('Missing hardware:', availability.missingRequirements.hardware);
  console.log('Missing dependencies:', availability.missingRequirements.dependencies);
}

// Get all available agents
const availableAgents = await agentRegistry.getAvailableAgents(hardwareProfile);
console.log(`Available agents: ${availableAgents.length}`);
```

### Example 3: Agent Activation and State Management

```typescript
import { agentRegistry, AgentState } from '@superinstance/agent-lifecycle-registry';

// Activate an agent
const activated = agentRegistry.activateAgent('my-agent-v1');
if (activated) {
  console.log('Agent activated successfully');
}

// Get agent state
const state = agentRegistry.getAgentState('my-agent-v1');
console.log('Current state:', state?.status);

// Update agent state
agentRegistry.updateAgentState('my-agent-v1', {
  confidence: 0.95,
  customData: { processedCount: 42 }
});

// Get all active agents
const activeAgents = agentRegistry.getActiveAgents();
console.log(`Active agents: ${activeAgents.size}`);

// Deactivate an agent
const deactivated = agentRegistry.deactivateAgent('my-agent-v1');
if (deactivated) {
  console.log('Agent deactivated');
}
```

### Example 4: Event Listeners

```typescript
import { agentRegistry, AgentRegistryEventType } from '@superinstance/agent-lifecycle-registry';

// Listen to agent registration
agentRegistry.addEventListener(
  AgentRegistryEventType.AGENT_REGISTERED,
  (event) => {
    console.log(`Agent registered: ${event.agentId}`);
    console.log('Timestamp:', new Date(event.timestamp));
  }
);

// Listen to agent activation
agentRegistry.addEventListener(
  AgentRegistryEventType.AGENT_ACTIVATED,
  (event) => {
    console.log(`Agent activated: ${event.agentId}`);
    console.log('State:', event.data?.state);
  }
);

// Listen to state changes
agentRegistry.addEventListener(
  AgentRegistryEventType.AGENT_STATE_CHANGED,
  (event) => {
    console.log(`Agent state changed: ${event.agentId}`);
    console.log('New state:', event.data?.state);
  }
);

// Listen to agent deactivation
agentRegistry.addEventListener(
  AgentRegistryEventType.AGENT_DEACTIVATED,
  (event) => {
    console.log(`Agent deactivated: ${event.agentId}`);
  }
);

// Remove event listener
const listener = (event) => console.log(event);
agentRegistry.addEventListener(AgentRegistryEventType.AGENT_REGISTERED, listener);
agentRegistry.removeEventListener(AgentRegistryEventType.AGENT_REGISTERED, listener);
```

### Example 5: Agent Validation

```typescript
import {
  validateAgentDefinition,
  validateAgentOrThrow,
  formatValidationErrors
} from '@superinstance/agent-lifecycle-registry';

// Validate agent definition
const result = validateAgentDefinition(myAgentDefinition);

if (!result.valid) {
  console.error('Validation errors:');
  result.errors.forEach(error => {
    console.error(`  [${error.field}] ${error.message}`);
  });

  console.warn('Validation warnings:');
  result.warnings.forEach(warning => {
    console.warn(`  [${warning.field}] ${warning.message}`);
  });
}

// Validate with exception
try {
  validateAgentOrThrow(myAgentDefinition);
  console.log('Agent is valid!');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
    console.error('Errors:', error.errors);
    console.error('Warnings:', error.warnings);
  }
}

// Format for user display
const message = formatValidationErrors(result);
alert(message);
```

### Example 6: Agent with Hardware Requirements

```typescript
import { agentRegistry, AgentCategory, ActivationMode, AgentState } from '@superinstance/agent-lifecycle-registry';

// Register GPU-intensive agent
agentRegistry.registerAgent({
  id: 'gpu-processor-v1',
  name: 'GPU Processor',
  description: 'Performs GPU-accelerated data processing',
  icon: '⚡',
  category: AgentCategory.DATA,
  activationMode: ActivationMode.BACKGROUND,
  initialState: { status: AgentState.IDLE },
  metadata: {
    version: '1.0.0',
    author: 'Your Team',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['gpu', 'processing', 'acceleration'],
  },
  requirements: {
    hardware: {
      minJEPAScore: 50,      // Requires decent hardware
      minRAM: 16,            // Requires 16GB RAM
      minCores: 8,           // Requires 8 CPU cores
      requiresGPU: true,     // Requires GPU
      features: ['gpu-acceleration', 'webassembly'],
    },
    dependencies: ['data-source-v1'], // Requires other agent
  }
});

// Check if it can run
const hardwareProfile = { /* ... */ };
const availability = await agentRegistry.checkAvailability('gpu-processor-v1', hardwareProfile);

if (!availability.available) {
  console.log('Cannot run GPU Processor:');
  console.log('  Missing hardware:', availability.missingRequirements.hardware);
  console.log('  Missing dependencies:', availability.missingRequirements.dependencies);
}
```

### Example 7: Message Handlers

```typescript
import {
  registerAgentHandler,
  getAgentHandler,
  HandlerContext,
  AgentResponse
} from '@superinstance/agent-lifecycle-registry';

// Register a message handler
registerAgentHandler('my-agent-v1', async (message, context: HandlerContext): Promise<AgentResponse> => {
  try {
    // Process the message
    const text = message.content?.text || '';

    if (text.includes('help')) {
      return {
        type: 'message',
        content: 'Here is some help information...',
      };
    }

    // Background processing
    return {
      type: 'background',
      metadata: {
        processed: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

// Get handler when needed
const handler = getAgentHandler('my-agent-v1');
if (handler) {
  const response = await handler(
    { role: 'user', content: { text: 'Hello!' } },
    { conversationId: 'abc', agentState: 'running', hardwareProfile: {}, message: {} as any }
  );
  console.log('Response:', response);
}
```

## API Reference

### AgentRegistry

#### Methods

- **registerAgent(definition)** - Register a new agent
- **unregisterAgent(agentId)** - Unregister an agent
- **getAgent(agentId)** - Get agent by ID
- **getAllAgents()** - Get all registered agents
- **getAgentsByCategory(category)** - Get agents by category
- **searchAgents(query)** - Search agents by query
- **checkAvailability(agentId, hardwareProfile)** - Check if agent can run
- **getAvailableAgents(hardwareProfile)** - Get all available agents
- **activateAgent(agentId)** - Activate an agent
- **deactivateAgent(agentId)** - Deactivate an agent
- **getAgentState(agentId)** - Get agent state
- **updateAgentState(agentId, state)** - Update agent state
- **getActiveAgents()** - Get all active agents
- **addEventListener(eventType, listener)** - Add event listener
- **removeEventListener(eventType, listener)** - Remove event listener

### Validation Functions

- **validateAgentDefinition(definition, options?)** - Validate agent definition
- **validateAgentOrThrow(definition, options?)** - Validate or throw error
- **formatValidationErrors(result)** - Format validation errors
- **isValidAgentId(id)** - Check if agent ID is valid
- **sanitizeAgentForExport(definition)** - Sanitize agent for export

### Handler Functions

- **registerAgentHandler(agentId, handler)** - Register message handler
- **unregisterAgentHandler(agentId)** - Unregister handler
- **getAgentHandler(agentId)** - Get handler for agent
- **hasAgentHandler(agentId)** - Check if handler exists
- **getRegisteredAgentIds()** - Get all registered agent IDs
- **clearAgentHandlers()** - Clear all handlers

## Preset Agents

The package includes preset agents:

- **JEPA Agent** (`jepa-v1`) - Real-time emotional subtext analysis from audio
- **Spreader Agent** (`spreader-v1`) - Context window manager with parallel task spreading

Register them with:

```typescript
import { registerPresetAgents } from '@superinstance/agent-lifecycle-registry';

registerPresetAgents();
```

## TypeScript Support

This package is written in TypeScript and includes comprehensive type definitions. All types are exported:

```typescript
import type {
  AgentDefinition,
  AgentAvailabilityResult,
  AgentRegistryEvent,
  HardwareProfile,
  HandlerContext,
  AgentResponse,
} from '@superinstance/agent-lifecycle-registry';
```

## License

MIT © [SuperInstance](https://github.com/SuperInstance)

## Repository

[https://github.com/SuperInstance/Agent-Lifecycle-Registry](https://github.com/SuperInstance/Agent-Lifecycle-Registry)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Support

- Issues: [GitHub Issues](https://github.com/SuperInstance/Agent-Lifecycle-Registry/issues)
- Discussions: [GitHub Discussions](https://github.com/SuperInstance/Agent-Lifecycle-Registry/discussions)
