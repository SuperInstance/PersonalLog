/**
 * Agent Registry System Types
 *
 * Comprehensive type definitions for the PersonalLog agent system.
 * Agents are interactive AI capabilities that can be activated in conversations,
 * ranging from background analysis to foreground task execution.
 */

/**
 * Agent categories for organization and filtering
 */
export enum AgentCategory {
  /** Analysis and insight generation (e.g., JEPA emotional analysis) */
  ANALYSIS = 'analysis',
  /** Knowledge management and retrieval (e.g., Spreader) */
  KNOWLEDGE = 'knowledge',
  /** Creative content generation */
  CREATIVE = 'creative',
  /** Task automation and execution */
  AUTOMATION = 'automation',
  /** Communication and messaging */
  COMMUNICATION = 'communication',
  /** Data processing and transformation */
  DATA = 'data',
  /** User-created custom agents */
  CUSTOM = 'custom',
}

/**
 * Agent activation modes
 */
export enum ActivationMode {
  /** Runs continuously in the background, analyzing content */
  BACKGROUND = 'background',
  /** Activated on-demand by the user in foreground */
  FOREGROUND = 'foreground',
  /** Hybrid: runs background but can be brought to foreground */
  HYBRID = 'hybrid',
  /** Scheduled activation at specific times/intervals */
  SCHEDULED = 'scheduled',
}

/**
 * Agent execution states
 */
export enum AgentState {
  /** Agent is idle and ready */
  IDLE = 'idle',
  /** Agent is actively processing */
  RUNNING = 'running',
  /** Agent is paused */
  PAUSED = 'paused',
  /** Agent encountered an error */
  ERROR = 'error',
  /** Agent is disabled/unavailable */
  DISABLED = 'disabled',
}

/**
 * Hardware requirements for an agent
 */
export interface HardwareRequirement {
  /** Minimum JEPA score (0-100) required */
  minJEPAScore?: number;
  /** Required hardware features */
  features?: string[];
  /** Minimum RAM in GB */
  minRAM?: number;
  /** Minimum CPU cores */
  minCores?: number;
  /** Whether GPU is required */
  requiresGPU?: boolean;
  /** Minimum network speed in Mbps */
  minNetworkSpeed?: number;
  /** Minimum storage space in GB */
  minStorage?: number;
}

/**
 * Feature flag requirements
 */
export interface FeatureFlagRequirement {
  /** Feature flags that must be enabled */
  flags?: string[];
  /** Feature flags that must be disabled */
  disabledFlags?: string[];
}

/**
 * Agent requirements specification
 */
export interface AgentRequirements {
  /** Hardware requirements */
  hardware?: HardwareRequirement;
  /** Feature flag requirements */
  flags?: FeatureFlagRequirement;
  /** Other agent dependencies (agent IDs) */
  dependencies?: string[];
}

/**
 * Agent state interface for runtime information
 */
export interface AgentStateData {
  /** Current execution state */
  status: AgentState;
  /** Confidence score (0-1) for analysis agents */
  confidence?: number;
  /** Last activity timestamp */
  lastActive?: string;
  /** Error message if in ERROR state */
  error?: string;
  /** Custom state data specific to agent type */
  customData?: Record<string, unknown>;
}

/**
 * Agent metadata
 */
export interface AgentMetadata {
  /** Agent version */
  version: string;
  /** Author/creator */
  author: string;
  /** Creation date */
  createdAt: string;
  /** Last update date */
  updatedAt: string;
  /** Tags for search/discovery */
  tags: string[];
  /** Documentation URL */
  documentation?: string;
  /** Source repository URL */
  repository?: string;
  /** License */
  license?: string;
}

/**
 * Complete agent definition
 */
export interface AgentDefinition {
  /** Unique agent identifier (e.g., 'jepa-v1', 'spreader-v1') */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of what the agent does */
  description: string;

  /** Icon/emoji for UI representation */
  icon: string;

  /** Agent category */
  category: AgentCategory;

  /** Requirements for running the agent */
  requirements?: AgentRequirements;

  /** Activation mode */
  activationMode: ActivationMode;

  /** Initial state when activated */
  initialState: AgentStateData;

  /** Agent metadata */
  metadata: AgentMetadata;

  /** Configuration schema (for user-configurable options) */
  configSchema?: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    default?: unknown;
    required?: boolean;
    enum?: unknown[];
    min?: number;
    max?: number;
  }>;

  /** Example configurations for quick start */
  examples?: Array<{
    name: string;
    description: string;
    config: Record<string, unknown>;
  }>;
}

/**
 * Agent availability check result
 */
export interface AgentAvailabilityResult {
  /** Agent ID */
  agentId: string;
  /** Whether the agent is available to run */
  available: boolean;
  /** Reason if unavailable */
  reason?: string;
  /** Missing requirements */
  missingRequirements: {
    /** Missing hardware requirements */
    hardware: string[];
    /** Missing feature flags */
    flags: string[];
    /** Missing agent dependencies */
    dependencies: string[];
  };
}

/**
 * Agent registry event types
 */
export enum AgentRegistryEventType {
  /** Agent registered */
  AGENT_REGISTERED = 'agent_registered',
  /** Agent unregistered */
  AGENT_UNREGISTERED = 'agent_unregistered',
  /** Agent state changed */
  AGENT_STATE_CHANGED = 'agent_state_changed',
  /** Agent activated */
  AGENT_ACTIVATED = 'agent_activated',
  /** Agent deactivated */
  AGENT_DEACTIVATED = 'agent_deactivated',
}

/**
 * Agent registry event
 */
export interface AgentRegistryEvent {
  /** Event type */
  type: AgentRegistryEventType;
  /** Agent ID */
  agentId: string;
  /** Event timestamp */
  timestamp: number;
  /** Event data */
  data?: Record<string, unknown>;
}

/**
 * Event listener type
 */
export type AgentRegistryEventListener = (event: AgentRegistryEvent) => void;

/**
 * Agent configuration for active instances
 */
export interface AgentConfig {
  /** Agent ID */
  agentId: string;
  /** User-provided configuration values */
  settings: Record<string, unknown>;
  /** Whether agent is currently active */
  active: boolean;
  /** Current state */
  state: AgentStateData;
  /** Conversation ID if bound to specific conversation */
  conversationId?: string;
}
