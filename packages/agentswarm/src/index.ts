// Main exports
export { AgentSwarm } from './AgentSwarm.js';
export { Agent } from './agent/Agent.js';
export { MarketEngine } from './market/MarketEngine.js';
export { TaskDecomposer } from './orchestrator/TaskDecomposer.js';

// Type exports
export type {
  Task,
  Bid,
  Match,
  AgentCapabilities,
  AgentReputation,
  AgentConfig,
  MarketConfig,
  SwarmConfig,
  MarketStats,
  AgentMetrics,
  ExecutionSummary,
  TaskResult,
  MarketEvent,
  AgentEvent
} from './types.js';

// Re-export for convenience
export { AgentSwarm as default } from './AgentSwarm.js';
