# Proactive Planning AI Hub

> A comprehensive intelligence system for proactive AI behavior combining world modeling, MPC orchestration, and anticipatory agent activation

[![npm version](https://badge.fury.io/js/%40superinstance%2Fproactive-planning-ai-hub.svg)](https://www.npmjs.com/package/@superinstance/proactive-planning-ai-hub)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 What is it?

**Proactive Planning AI Hub** is an intelligent orchestration system that enables AI applications to:

- **Anticipate user needs** before they're explicitly expressed (30+ seconds ahead)
- **Plan and optimize** multi-agent workflows using Model Predictive Control (MPC)
- **Model and predict** world states for better decision-making
- **Simulate scenarios** to evaluate different courses of action
- **Coordinate systems** intelligently with conflict detection and resolution

It's the brain behind proactive, intelligent AI assistants that think ahead.

## ✨ Key Features

### 🧠 Intelligence Hub
- Central coordination for all intelligence components
- Cross-system event bus and messaging
- Conflict detection and resolution
- Bottleneck identification and optimization
- Unified insights generation

### ⚡ Proactive Engine
- Anticipates user needs before they're expressed
- 10+ trigger types (code writing, questions, debugging, etc.)
- Confidence scoring with multi-factor analysis
- User preference learning and adaptation
- Configurable activation thresholds

### 🎮 MPC Orchestrator
- Model Predictive Control for multi-agent optimization
- Predictive planning over time horizons
- Resource allocation and conflict prevention
- Automatic replanning on state changes
- Performance metrics and tracking

### 🌍 World Model
- Maintains dynamic world state representation
- Entity and relationship tracking
- State transition history
- Predictive state modeling

### 🔮 Scenario Simulator
- What-if analysis for planning
- Compare different strategies
- Outcome prediction and comparison
- Risk assessment and evaluation

## 🚀 Quick Start

### Installation

```bash
npm install @superinstance/proactive-planning-ai-hub
```

### Basic Usage

```typescript
import { IntelligenceHub, proactiveEngine } from '@superinstance/proactive-planning-ai-hub';

// Initialize the hub
const hub = new IntelligenceHub();
await hub.initialize();

// Start proactive monitoring
proactiveEngine.start();

// Evaluate proactive actions based on context
const suggestions = await proactiveEngine.evaluateProactiveActions(
  'conversation-123',
  'How do I implement a React component with TypeScript?',
  ['assistant']
);

// Get suggestions
console.log('Proactive suggestions:', suggestions);

// Execute a suggestion
if (suggestions.length > 0) {
  await proactiveEngine.executeProactiveAction(suggestions[0].id);
}
```

## 📖 Use Cases

### 1. Proactive Code Assistant

```typescript
import { getProactiveEngine } from '@superinstance/proactive-planning-ai-hub';

const engine = getProactiveEngine();

// User is writing code - proactively suggest code review
const suggestions = await engine.evaluateProactiveActions(
  'conv-1',
  'function calculateTotal(items) { return items.reduce((a, b) => a + b.price, 0); }',
  ['coder']
);

// Suggestion: Activate code reviewer proactively
// Confidence: 85%
// Reason: Code writing detected
```

### 2. Multi-Agent Orchestration with MPC

```typescript
import { mpcController, stateManager } from '@superinstance/proactive-planning-ai-hub';

// Initialize MPC with configuration
await mpcController.initialize({
  horizon: {
    steps: 5,
    stepDuration: 60,
    totalDuration: 300,
    replanInterval: 30,
  },
  objective: {
    name: 'optimize_workflow',
    description: 'Optimize for speed and quality',
    weights: {
      timeWeight: 0.4,
      qualityWeight: 0.3,
      resourceWeight: 0.2,
      riskWeight: 0.1,
      priorityWeight: 0.0,
    },
    constraints: [],
  },
  maxParallelAgents: 3,
  enableReplanning: true,
  predictionUpdateInterval: 10000,
  stateHistorySize: 100,
  anomalyThreshold: 0.8,
  conflictStrategy: 'hybrid',
  hardwareProfile: {
    deviceType: 'desktop',
    cores: 8,
    memory: 16,
    gpu: true,
    gpuMemory: 8,
    score: 85,
  },
});

// Start MPC controller
await mpcController.start();

// Create optimal plan
const plan = await mpcController.plan();
console.log('Optimized plan:', plan);
```

### 3. Scenario Simulation

```typescript
import { getScenarioSimulator, stateManager } from '@superinstance/proactive-planning-ai-hub';

const simulator = getScenarioSimulator();

// Get current state
const currentState = stateManager.getCurrentState();

// Simulate scenario: "What if we increase parallel agents?"
const simulation = await simulator.simulateScenario(
  currentState,
  [
    {
      variable: 'maxParallelAgents',
      original: 3,
      modified: 5,
    },
  ]
);

console.log('Simulation results:', {
  completionTime: simulation.outcomes.completionTime,
  qualityScore: simulation.outcomes.qualityScore,
  improvement: simulation.comparison.timeDiff,
});
```

## 🎨 API Reference

### Intelligence Hub

```typescript
import { IntelligenceHub } from '@superinstance/proactive-planning-ai-hub';

const hub = new IntelligenceHub();

// Initialize
await hub.initialize(settings);

// Health
const health = await hub.getSystemHealth();

// Recommendations
hub.addRecommendation(recommendation);
const recommendations = hub.getRecommendations();

// Events
hub.on('hub:initialized', (event) => {
  console.log('Hub initialized:', event);
});
```

### Proactive Engine

```typescript
import { getProactiveEngine } from '@superinstance/proactive-planning-ai-hub';

const engine = getProactiveEngine();

// Lifecycle
engine.start();
engine.stop();

// Evaluation
const suggestions = await engine.evaluateProactiveActions(
  conversationId,
  inputText,
  activeAgents,
  additionalContext
);

// Actions
await engine.executeProactiveAction(actionId);
engine.dismissProactiveAction(actionId, 'helpful');

// Statistics
const stats = engine.getStatistics();

// Preferences
engine.updatePreferences({ enabled: true });
const prefs = engine.getPreferences();
```

### MPC Controller

```typescript
import { mpcController } from '@superinstance/proactive-planning-ai-hub';

// Initialize
await mpcController.initialize(config);

// Control
await mpcController.start();
await mpcController.stop();
await mpcController.plan();

// State
const status = mpcController.getStatus();
const plan = mpcController.getCurrentPlan();
```

## 🔧 Configuration

### Intelligence Settings

```typescript
interface IntelligenceSettings {
  enabled: boolean;
  level: 'off' | 'basic' | 'advanced' | 'full';
  analytics: {
    enabled: boolean;
    retention: number;
    sampleRate: number;
  };
  personalization: {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    explainability: boolean;
  };
  proactive: {
    enabled: boolean;
    aggressiveness: 'conservative' | 'moderate' | 'aggressive';
    autoActivate: boolean;
  };
  coordination: {
    allowConflicts: boolean;
    priority: string[];
    syncInterval: number;
  };
}
```

### Proactive Preferences

```typescript
interface ProactivePreferences {
  enabled: boolean;
  triggerPreferences: Record<ProactiveTriggerType, {
    enabled: boolean;
    autoActivate: boolean;
    minConfidence: number;
  }>;
  notifications: {
    showBeforeActivation: boolean;
    duration: number;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  };
}
```

## 🧪 Examples

See the `/examples` directory for complete working examples:

- `basic-usage.ts` - Getting started guide
- `proactive-assistant.ts` - Building a proactive code assistant
- `mpc-orchestration.ts` - Multi-agent optimization with MPC
- `scenario-planning.ts` - What-if scenario simulation

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│         Proactive Planning AI Hub               │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────┐    ┌──────────────────┐    │
│  │   Intelligence│────│   Event Bus      │    │
│  │      Hub      │    │                  │    │
│  └───────┬───────┘    └──────────────────┘    │
│          │                                     │
│          ├──────────┬──────────┬────────────┐  │
│          │          │          │            │  │
│  ┌───────▼────┐ ┌──▼──────┐ ┌▼──────────┐  │
│  │  Proactive │ │   MPC   │ │ World     │  │
│  │   Engine   │ │Controller│ │ Model     │  │
│  └────────────┘ └─────────┘ └───────────┘  │
│                                   │          │
│                            ┌──────▼──────┐   │
│                            │  Scenario   │   │
│                            │  Simulator  │   │
│                            └─────────────┘   │
└─────────────────────────────────────────────────┘
```

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for details.

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- Repository: https://github.com/SuperInstance/Proactive-Planning-AI-Hub
- Documentation: https://github.com/SuperInstance/Proactive-Planning-AI-Hub#readme
- Issues: https://github.com/SuperInstance/Proactive-Planning-AI-Hub/issues

## 🙏 Acknowledgments

Built with ❤️ by the SuperInstance team as part of the PersonalLog independent tools ecosystem.

---

**Note:** This is an extraction from PersonalLog, refactored to be completely independent with zero PersonalLog dependencies. It works great alone, and even better when combined with other SuperInstance tools!
