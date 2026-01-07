/**
 * Agent Registry
 *
 * Central registry for managing all available agents in PersonalLog.
 * Handles registration, availability checking, and agent lifecycle.
 *
 * @example
 * ```typescript
 * import { agentRegistry } from '@/lib/agents';
 *
 * // Register an agent
 * agentRegistry.registerAgent(jepaAgent);
 *
 * // Check availability
 * const availability = await agentRegistry.checkAvailability('jepa-v1', hardwareProfile);
 *
 * // Get available agents
 * const agents = await agentRegistry.getAvailableAgents(hardwareProfile);
 * ```
 */

import type {
  AgentDefinition,
  AgentAvailabilityResult,
  AgentRegistryEvent,
  AgentRegistryEventListener,
  AgentStateData,
} from './types';
import { AgentState, AgentRegistryEventType, AgentCategory } from './types';
import type { HardwareProfile } from '@/lib/hardware';
import { calculateJEPAScore } from '@/lib/hardware/scoring';
import { checkAgentFeatures } from './feature-check';

/**
 * Agent Registry class
 *
 * Singleton registry for managing agent definitions and checking availability.
 */
export class AgentRegistry {
  /** Registered agents map */
  private agents: Map<string, AgentDefinition>;

  /** Event listeners */
  private listeners: Map<AgentRegistryEventType, Set<AgentRegistryEventListener>>;

  /** Active agent instances */
  private activeAgents: Map<string, AgentStateData>;

  constructor() {
    this.agents = new Map();
    this.listeners = new Map();
    this.activeAgents = new Map();

    // Initialize event listener sets
    Object.values(AgentRegistryEventType).forEach((type) => {
      this.listeners.set(type as AgentRegistryEventType, new Set());
    });
  }

  // ========================================================================
  // REGISTRATION
  // ========================================================================

  /**
   * Register a new agent
   *
   * @param definition - Agent definition to register
   * @throws {Error} If agent ID already exists
   *
   * @example
   * ```typescript
   * registry.registerAgent({
   *   id: 'my-agent-v1',
   *   name: 'My Agent',
   *   description: 'Does amazing things',
   *   icon: '🚀',
   *   category: AgentCategory.ANALYSIS,
   *   activationMode: ActivationMode.BACKGROUND,
   *   initialState: { status: AgentState.IDLE },
   *   metadata: {
   *     version: '1.0.0',
   *     author: 'Me',
   *     createdAt: new Date().toISOString(),
   *     updatedAt: new Date().toISOString(),
   *     tags: ['analysis', 'custom'],
   *   }
   * });
   * ```
   */
  registerAgent(definition: AgentDefinition): void {
    if (this.agents.has(definition.id)) {
      throw new Error(`Agent already registered: ${definition.id}`);
    }

    // Validate agent definition
    this.validateAgentDefinition(definition);

    this.agents.set(definition.id, definition);
    this.emit(AgentRegistryEventType.AGENT_REGISTERED, {
      type: AgentRegistryEventType.AGENT_REGISTERED,
      agentId: definition.id,
      timestamp: Date.now(),
      data: { definition },
    });
  }

  /**
   * Unregister an agent
   *
   * @param agentId - Agent ID to unregister
   * @returns True if agent was unregistered, false if not found
   */
  unregisterAgent(agentId: string): boolean {
    if (!this.agents.has(agentId)) {
      return false;
    }

    // Deactivate if active
    if (this.activeAgents.has(agentId)) {
      this.activeAgents.delete(agentId);
    }

    this.agents.delete(agentId);
    this.emit(AgentRegistryEventType.AGENT_UNREGISTERED, {
      type: AgentRegistryEventType.AGENT_UNREGISTERED,
      agentId,
      timestamp: Date.now(),
    });

    return true;
  }

  // ========================================================================
  // RETRIEVAL
  // ========================================================================

  /**
   * Get a single agent by ID
   *
   * @param agentId - Agent ID to retrieve
   * @returns Agent definition or undefined if not found
   */
  getAgent(agentId: string): AgentDefinition | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all registered agents
   *
   * @returns Array of all agent definitions
   */
  getAllAgents(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by category
   *
   * @param category - Agent category filter
   * @returns Array of agents in the category
   */
  getAgentsByCategory(category: AgentCategory): AgentDefinition[] {
    return this.getAllAgents().filter((agent) => agent.category === category);
  }

  /**
   * Search agents by query
   *
   * @param query - Search query (matches name, description, tags)
   * @returns Array of matching agents
   */
  searchAgents(query: string): AgentDefinition[] {
    const lowerQuery = query.toLowerCase();

    return this.getAllAgents().filter((agent) => {
      return (
        agent.name.toLowerCase().includes(lowerQuery) ||
        agent.description.toLowerCase().includes(lowerQuery) ||
        agent.metadata.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    });
  }

  // ========================================================================
  // AVAILABILITY CHECKING
  // ========================================================================

  /**
   * Check if an agent is available to run on current hardware
   *
   * @param agentId - Agent ID to check
   * @param hardwareProfile - Current hardware profile
   * @returns Availability check result
   */
  async checkAvailability(agentId: string, hardwareProfile: HardwareProfile): Promise<AgentAvailabilityResult> {
    const agent = this.getAgent(agentId);

    if (!agent) {
      return {
        agentId,
        available: false,
        reason: 'Agent not found in registry',
        missingRequirements: {
          hardware: [],
          flags: [],
          dependencies: [],
        },
      };
    }

    const missingHardware: string[] = [];
    const missingFlags: string[] = [];
    const missingDependencies: string[] = [];

    // Check hardware requirements
    if (agent.requirements?.hardware) {
      const hw = agent.requirements.hardware;

      // Check JEPA score
      if (hw.minJEPAScore !== undefined) {
        const jepaResult = calculateJEPAScore(hardwareProfile);
        if (jepaResult.score < hw.minJEPAScore) {
          missingHardware.push(
            `JEPA score ${jepaResult.score} below minimum ${hw.minJEPAScore}`
          );
        }
      }

      // Check RAM
      if (hw.minRAM !== undefined) {
        const ramGB = hardwareProfile.memory.totalGB || 0;
        if (ramGB < hw.minRAM) {
          missingHardware.push(`RAM ${ramGB}GB below minimum ${hw.minRAM}GB`);
        }
      }

      // Check CPU cores
      if (hw.minCores !== undefined) {
        const cores = hardwareProfile.cpu.cores;
        if (cores < hw.minCores) {
          missingHardware.push(`CPU cores ${cores} below minimum ${hw.minCores}`);
        }
      }

      // Check GPU
      if (hw.requiresGPU && !hardwareProfile.gpu.available) {
        missingHardware.push('GPU required but not available');
      }

      // Check features
      if (hw.features) {
        hw.features.forEach((feature) => {
          if (feature === 'gpu-acceleration' && !hardwareProfile.gpu.webgpu.supported) {
            missingHardware.push('GPU acceleration (WebGPU) not supported');
          }
          if (feature === 'webgl' && !hardwareProfile.gpu.webgl.supported) {
            missingHardware.push('WebGL not supported');
          }
          if (feature === 'webassembly' && !hardwareProfile.features.webassembly) {
            missingHardware.push('WebAssembly not supported');
          }
        });
      }
    }

    // Check feature flag requirements (now integrated with actual feature flag system)
    if (agent.requirements?.flags?.flags) {
      try {
        const featureCheck = await checkAgentFeatures(agent.requirements.flags.flags);

        if (!featureCheck.canRun) {
          missingFlags.push(...featureCheck.missingRequirements.flags);
          missingHardware.push(...featureCheck.missingRequirements.hardware);
        }

        // Include suggestions in reason if available
        if (!featureCheck.canRun && featureCheck.suggestions.length > 0) {
          missingFlags.push(`Suggestions: ${featureCheck.suggestions.join('; ')}`);
        }
      } catch (error) {
        // Feature check failed - add as warning
        missingFlags.push(`Unable to check feature flags: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Check agent dependencies
    if (agent.requirements?.dependencies) {
      agent.requirements.dependencies.forEach((depAgentId) => {
        if (!this.agents.has(depAgentId)) {
          missingDependencies.push(`Dependency agent not found: ${depAgentId}`);
        }
      });
    }

    const available =
      missingHardware.length === 0 &&
      missingFlags.length === 0 &&
      missingDependencies.length === 0;

    return {
      agentId,
      available,
      reason: available ? undefined : this.formatUnavailableReason(missingHardware, missingFlags, missingDependencies),
      missingRequirements: {
        hardware: missingHardware,
        flags: missingFlags,
        dependencies: missingDependencies,
      },
    };
  }

  /**
   * Get all agents available on current hardware
   *
   * @param hardwareProfile - Current hardware profile
   * @returns Array of available agent definitions
   */
  async getAvailableAgents(hardwareProfile: HardwareProfile): Promise<AgentDefinition[]> {
    const agents = this.getAllAgents();
    const available: AgentDefinition[] = [];

    for (const agent of agents) {
      const availability = await this.checkAvailability(agent.id, hardwareProfile);
      if (availability.available) {
        available.push(agent);
      }
    }

    return available;
  }

  // ========================================================================
  // ACTIVATION
  // ========================================================================

  /**
   * Activate an agent
   *
   * @param agentId - Agent ID to activate
   * @returns True if activated, false if already active or not found
   */
  activateAgent(agentId: string): boolean {
    const agent = this.getAgent(agentId);
    if (!agent) {
      return false;
    }

    if (this.activeAgents.has(agentId)) {
      return false; // Already active
    }

    const state: AgentStateData = {
      ...agent.initialState,
      status: AgentState.RUNNING,
      lastActive: new Date().toISOString(),
    };

    this.activeAgents.set(agentId, state);

    this.emit(AgentRegistryEventType.AGENT_ACTIVATED, {
      type: AgentRegistryEventType.AGENT_ACTIVATED,
      agentId,
      timestamp: Date.now(),
      data: { state },
    });

    return true;
  }

  /**
   * Deactivate an agent
   *
   * @param agentId - Agent ID to deactivate
   * @returns True if deactivated, false if not active or not found
   */
  deactivateAgent(agentId: string): boolean {
    if (!this.activeAgents.has(agentId)) {
      return false; // Not active
    }

    this.activeAgents.delete(agentId);

    this.emit(AgentRegistryEventType.AGENT_DEACTIVATED, {
      type: AgentRegistryEventType.AGENT_DEACTIVATED,
      agentId,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Get agent state
   *
   * @param agentId - Agent ID
   * @returns Current state or undefined if not active
   */
  getAgentState(agentId: string): AgentStateData | undefined {
    return this.activeAgents.get(agentId);
  }

  /**
   * Update agent state
   *
   * @param agentId - Agent ID
   * @param state - New state data
   * @returns True if updated, false if agent not found
   */
  updateAgentState(agentId: string, state: Partial<AgentStateData>): boolean {
    const existing = this.activeAgents.get(agentId);
    if (!existing) {
      return false;
    }

    const updated: AgentStateData = {
      ...existing,
      ...state,
      lastActive: new Date().toISOString(),
    };

    this.activeAgents.set(agentId, updated);

    this.emit(AgentRegistryEventType.AGENT_STATE_CHANGED, {
      type: AgentRegistryEventType.AGENT_STATE_CHANGED,
      agentId,
      timestamp: Date.now(),
      data: { state: updated },
    });

    return true;
  }

  /**
   * Get all active agents
   *
   * @returns Map of agent ID to state data
   */
  getActiveAgents(): Map<string, AgentStateData> {
    return new Map(this.activeAgents);
  }

  // ========================================================================
  // EVENTS
  // ========================================================================

  /**
   * Add event listener
   *
   * @param eventType - Event type to listen for
   * @param listener - Event listener callback
   */
  addEventListener(eventType: AgentRegistryEventType, listener: AgentRegistryEventListener): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.add(listener);
    }
  }

  /**
   * Remove event listener
   *
   * @param eventType - Event type
   * @param listener - Event listener to remove
   */
  removeEventListener(eventType: AgentRegistryEventType, listener: AgentRegistryEventListener): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event to all listeners
   *
   * @param eventType - Event type
   * @param event - Event data
   */
  private emit(eventType: AgentRegistryEventType, event: AgentRegistryEvent): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in agent registry event listener:`, error);
        }
      });
    }
  }

  // ========================================================================
  // VALIDATION
  // ========================================================================

  /**
   * Validate agent definition
   *
   * @param definition - Agent definition to validate
   * @throws {Error} If definition is invalid
   */
  private validateAgentDefinition(definition: AgentDefinition): void {
    if (!definition.id?.trim()) {
      throw new Error('Agent ID is required');
    }

    if (!definition.name?.trim()) {
      throw new Error('Agent name is required');
    }

    if (!definition.description?.trim()) {
      throw new Error('Agent description is required');
    }

    if (!definition.icon?.trim()) {
      throw new Error('Agent icon is required');
    }

    if (!Object.values(AgentCategory).includes(definition.category)) {
      throw new Error(`Invalid agent category: ${definition.category}`);
    }

    if (!definition.metadata?.version) {
      throw new Error('Agent metadata version is required');
    }

    if (!definition.metadata?.author) {
      throw new Error('Agent metadata author is required');
    }
  }

  /**
   * Format unavailable reason string
   *
   * @param missingHardware - Missing hardware requirements
   * @param missingFlags - Missing feature flags
   * @param missingDependencies - Missing agent dependencies
   * @returns Formatted reason string
   */
  private formatUnavailableReason(
    missingHardware: string[],
    missingFlags: string[],
    missingDependencies: string[]
  ): string {
    const reasons: string[] = [];

    if (missingHardware.length > 0) {
      reasons.push(`Hardware: ${missingHardware.join(', ')}`);
    }

    if (missingFlags.length > 0) {
      reasons.push(`Feature flags: ${missingFlags.join(', ')}`);
    }

    if (missingDependencies.length > 0) {
      reasons.push(`Dependencies: ${missingDependencies.join(', ')}`);
    }

    return reasons.join('; ');
  }
}

/**
 * Global agent registry singleton instance
 */
export const agentRegistry = new AgentRegistry();
