/**
 * Preset Agent Definitions
 *
 * Pre-defined agents that ship with PersonalLog.
 * These agents are automatically registered on initialization.
 */

import type { AgentDefinition } from './types';
import { AgentCategory, ActivationMode, AgentState } from './types';

/**
 * JEPA Agent - Emotional Subtext Analysis
 *
 * Real-time emotional subtext analysis from audio using
 * Joint Embedding Predictive Architecture (JEPA).
 */
export const JEPA_AGENT: AgentDefinition = {
  id: 'jepa-v1',
  name: 'JEPA',
  description: 'Real-time emotional subtext analysis from audio. Detects tone, sentiment, and emotional cues in conversations.',
  icon: '🎙️',
  category: AgentCategory.ANALYSIS,
  requirements: {
    hardware: {
      minJEPAScore: 30, // Requires RTX 4050 or better
      features: ['gpu-acceleration'],
      minRAM: 8,
      requiresGPU: true,
    },
    flags: {
      flags: ['enable-jepa'],
    },
  },
  activationMode: ActivationMode.BACKGROUND,
  initialState: {
    status: AgentState.IDLE,
    confidence: 0.8,
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['analysis', 'emotion', 'audio', 'realtime', 'jepa'],
    documentation: 'https://docs.personallog.ai/agents/jepa',
    repository: 'https://github.com/personallog/agents',
    license: 'MIT',
  },
  configSchema: {
    confidence: {
      type: 'number',
      description: 'Minimum confidence threshold for analysis (0-1)',
      default: 0.7,
      min: 0,
      max: 1,
    },
    analysisInterval: {
      type: 'number',
      description: 'Analysis interval in milliseconds',
      default: 1000,
      min: 100,
      max: 10000,
    },
    enableRealtime: {
      type: 'boolean',
      description: 'Enable real-time transcription',
      default: true,
    },
  },
  examples: [
    {
      name: 'High Sensitivity',
      description: 'Detect subtle emotional cues with high confidence',
      config: {
        confidence: 0.9,
        analysisInterval: 500,
        enableRealtime: true,
      },
    },
    {
      name: 'Balanced',
      description: 'Balanced sensitivity and performance',
      config: {
        confidence: 0.7,
        analysisInterval: 1000,
        enableRealtime: true,
      },
    },
    {
      name: 'Low Latency',
      description: 'Fast analysis with moderate sensitivity',
      config: {
        confidence: 0.5,
        analysisInterval: 2000,
        enableRealtime: true,
      },
    },
  ],
};

/**
 * Spreader Agent - Context Window Manager
 *
 * Intelligent context window management with parallel task spreading.
 * Optimizes context usage by identifying and spreading relevant information.
 */
export const SPREADER_AGENT: AgentDefinition = {
  id: 'spreader-v1',
  name: 'Spreader',
  description: 'Context window manager with parallel task spreading. Identifies key information and spreads it across available context.',
  icon: '📚',
  category: AgentCategory.KNOWLEDGE,
  requirements: {
    // No hardware requirements - runs on all devices
  },
  activationMode: ActivationMode.FOREGROUND,
  initialState: {
    status: AgentState.IDLE,
    customData: {
      contextPercentage: 0,
      schema: null,
    },
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['knowledge', 'context', 'optimization', 'management'],
    documentation: 'https://docs.personallog.ai/agents/spreader',
    repository: 'https://github.com/personallog/agents',
    license: 'MIT',
  },
  configSchema: {
    maxContextPercentage: {
      type: 'number',
      description: 'Maximum percentage of context window to use (0-100)',
      default: 80,
      min: 10,
      max: 100,
    },
    enableParallelSpreading: {
      type: 'boolean',
      description: 'Enable parallel task spreading',
      default: true,
    },
    compressionStrategy: {
      type: 'string',
      description: 'Strategy for context compression',
      default: 'summarize',
      enum: ['summarize', 'extract-key', 'user-directed'],
    },
  },
  examples: [
    {
      name: 'Conservative',
      description: 'Use minimal context for faster responses',
      config: {
        maxContextPercentage: 50,
        enableParallelSpreading: false,
        compressionStrategy: 'summarize',
      },
    },
    {
      name: 'Balanced',
      description: 'Balanced context usage',
      config: {
        maxContextPercentage: 80,
        enableParallelSpreading: true,
        compressionStrategy: 'summarize',
      },
    },
    {
      name: 'Maximum Context',
      description: 'Use full context window',
      config: {
        maxContextPercentage: 100,
        enableParallelSpreading: true,
        compressionStrategy: 'extract-key',
      },
    },
  ],
};

/**
 * Array of preset agents to register on initialization
 */
export const PRESET_AGENTS: AgentDefinition[] = [
  JEPA_AGENT,
  SPREADER_AGENT,
];

/**
 * Auto-register all preset agents
 *
 * Call this during application initialization to register
 * all built-in agents.
 *
 * @example
 * ```typescript
 * import { agentRegistry } from '@/lib/agents';
 * import { registerPresetAgents } from '@/lib/agents/presets';
 *
 * // Register all preset agents
 * registerPresetAgents();
 * ```
 */
export function registerPresetAgents(): void {
  // Import here to avoid circular dependency
  const { agentRegistry: registry } = require('./registry');

  PRESET_AGENTS.forEach((agent) => {
    try {
      registry.registerAgent(agent);
      console.log(`[AgentRegistry] Registered preset agent: ${agent.id}`);
    } catch (error) {
      console.error(`[AgentRegistry] Failed to register preset agent ${agent.id}:`, error);
    }
  });
}
