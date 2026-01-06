/**
 * Agent Registry System
 *
 * Central registry for managing all available agents in PersonalLog.
 * Agents are interactive AI capabilities that can be activated in conversations.
 *
 * @example
 * ```typescript
 * import { agentRegistry, registerPresetAgents } from '@/lib/agents';
 * import { getHardwareInfo } from '@/lib/hardware';
 *
 * // Initialize agents
 * registerPresetAgents();
 *
 * // Check availability
 * const hardware = await getHardwareInfo();
 * const agents = agentRegistry.getAvailableAgents(hardware.profile);
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
} from './types';

// Export enums
export { AgentCategory, ActivationMode, AgentState, AgentRegistryEventType } from './types';

// Export registry
export { AgentRegistry, agentRegistry } from './registry';

// Export preset agents
export { JEPA_AGENT, SPREADER_AGENT, PRESET_AGENTS, registerPresetAgents } from './presets';

// Export storage functions
export {
  saveUserAgent,
  loadUserAgent,
  loadUserAgents,
  deleteUserAgent,
  updateUserAgent,
  searchUserAgents,
  getUserAgentsByCategory,
  clearAllUserAgents,
  exportUserAgents,
  importUserAgents,
} from './storage';

// Export templates
export type { AgentTemplate } from './templates';
export {
  AGENT_TEMPLATES,
  RESEARCH_ASSISTANT_TEMPLATE,
  WRITING_COACH_TEMPLATE,
  CODE_REVIEWER_TEMPLATE,
  MEETING_NOTE_TAKER_TEMPLATE,
  CREATIVE_WRITER_TEMPLATE,
  DATA_ANALYST_TEMPLATE,
  LANGUAGE_TUTOR_TEMPLATE,
  FITNESS_COACH_TEMPLATE,
  MEDITATION_GUIDE_TEMPLATE,
  PROBLEM_SOLVER_TEMPLATE,
  TRAVEL_PLANNER_TEMPLATE,
  STUDY_BUDDY_TEMPLATE,
  getTemplatesByCategory,
  getTemplatesByDifficulty,
  getTemplateById,
  searchTemplates,
} from './templates';

// Export validation
export type {
  ValidationResult,
  ValidationErrorItem,
  ValidationWarning,
  ValidationOptions,
} from './validation';
export {
  validateAgentDefinition,
  validateAgentOrThrow,
  formatValidationErrors,
  isValidAgentId,
  sanitizeAgentForExport,
} from './validation';

// Export import/export utilities
export {
  exportAgent,
  exportMultipleAgents,
  importAgent,
  importMultipleAgents,
  agentToJSON,
  agentFromJSON,
} from './io';
