/**
 * Agent Lifecycle Registry
 *
 * Central registry for managing AI agent definitions, availability checking,
 * and lifecycle management.
 *
 * @example
 * ```typescript
 * import { agentRegistry, registerPresetAgents } from '@superinstance/agent-lifecycle-registry';
 *
 * // Register preset agents
 * registerPresetAgents();
 *
 * // Check availability
 * const hardwareProfile: HardwareProfile = { cpu: { cores: 8 }, memory: { totalGB: 16 }, gpu: { available: false, webgpu: { supported: false }, webgl: { supported: false } }, features: { webassembly: true } };
 * const agents = await agentRegistry.getAvailableAgents(hardwareProfile);
 *
 * // Activate an agent
 * agentRegistry.activateAgent('jepa-v1');
 * ```
 */

// Export all agent registry types
export type {
  AgentDefinition,
  HardwareRequirement,
  FeatureFlagRequirement,
  AgentRequirements,
  AgentStateData,
  AgentMetadata,
  AgentAvailabilityResult,
  AgentRegistryEvent,
  AgentRegistryEventListener,
  AgentConfig,
  HardwareProfile,
  HandlerContext,
  AgentResponse,
  AgentHandler,
} from './types';

// Export enums
export { AgentCategory, ActivationMode, AgentState, AgentRegistryEventType } from './types';

// Export registry
export { AgentRegistry, agentRegistry } from './registry';

// Export preset agents
export { JEPA_AGENT, SPREADER_AGENT, PRESET_AGENTS, registerPresetAgents } from './presets';

// Export validation
export type {
  ValidationResult,
  ValidationOptions,
} from './validation';
export {
  ValidationError,
  validateAgentDefinition,
  validateAgentOrThrow,
  formatValidationErrors,
  isValidAgentId,
  sanitizeAgentForExport,
} from './validation';

// Export handlers
export {
  registerAgentHandler,
  unregisterAgentHandler,
  getAgentHandler,
  hasAgentHandler,
  getRegisteredAgentIds,
  clearAgentHandlers,
} from './handlers';
