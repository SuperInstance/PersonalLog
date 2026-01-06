/**
 * Agent-to-Agent Communication Protocol
 *
 * Type-safe messaging system for inter-agent communication.
 */

// Use string union for agent IDs
export type AgentId = string

/**
 * Message types for agent communication
 */
export enum MessageType {
  // User state changes
  USER_EMOTION_CHANGE = 'user_emotion_change',
  USER_FRUSTRATION_DETECTED = 'user_frustration_detected',
  USER_ENGAGEMENT_LOW = 'user_engagement_low',

  // Context management
  CONTEXT_CRITICAL = 'context_critical',
  CONTEXT_COMPACTED = 'context_compacted',
  SCHEMA_GENERATED = 'schema_generated',

  // Agent actions
  REQUEST_COMPACT = 'request_compact',
  REQUEST_SPREAD = 'request_spread',
  SPAWN_CHILD = 'spawn_child',

  // Collaboration
  COLLAB_REQUEST = 'collaboration_request',
  COLLAB_RESPONSE = 'collaboration_response',

  // System
  AGENT_STATUS = 'agent_status',
  HEARTBEAT = 'heartbeat',
  ERROR = 'error'
}

/**
 * Agent address - identifies sender and recipient
 */
export interface AgentAddress {
  agentId: AgentId | 'broadcast' | 'system';
  type: 'agent' | 'broadcast' | 'system';
}

/**
 * Message payload types (type-safe based on MessageType)
 */
export interface MessagePayloads {
  [MessageType.USER_EMOTION_CHANGE]: {
    emotion: string;
    valence: number;
    arousal: number;
    confidence: number;
  };
  [MessageType.USER_FRUSTRATION_DETECTED]: {
    valence: number;
    arousal: number;
    confidence: number;
    recentMessages: Array<{
      emotion: string;
      timestamp: number;
    }>;
  };
  [MessageType.USER_ENGAGEMENT_LOW]: {
    engagementScore: number;
    timeSinceLastInteraction: number;
    suggestion: string;
  };
  [MessageType.CONTEXT_CRITICAL]: {
    percentage: number;
    tokensUsed: number;
    tokensTotal: number;
    schema: Record<string, unknown>;
  };
  [MessageType.CONTEXT_COMPACTED]: {
    previousSize: number;
    newSize: number;
    compressionRatio: number;
    retainedThemes: string[];
  };
  [MessageType.SCHEMA_GENERATED]: {
    schema: Record<string, unknown>;
    complexity: number;
    estimatedTokens: number;
  };
  [MessageType.REQUEST_COMPACT]: {
    reason: string;
    targetSize?: number;
  };
  [MessageType.REQUEST_SPREAD]: {
    data: Record<string, unknown>;
    targetAgents?: AgentId[];
  };
  [MessageType.SPAWN_CHILD]: {
    agentType: string;
    config: Record<string, unknown>;
  };
  [MessageType.COLLAB_REQUEST]: {
    action: string;
    params: Record<string, unknown>;
  };
  [MessageType.COLLAB_RESPONSE]: {
    action: string;
    result: Record<string, unknown>;
    correlationId: string;
  };
  [MessageType.AGENT_STATUS]: {
    status: 'idle' | 'active' | 'busy' | 'error';
    capabilities: string[];
    load: number;
  };
  [MessageType.HEARTBEAT]: {
    timestamp: number;
    uptime: number;
  };
  [MessageType.ERROR]: {
    error: string;
    stack?: string;
    context?: Record<string, unknown>;
  };
}

/**
 * Agent message structure
 */
export interface AgentMessage<T extends MessageType = MessageType> {
  id: string; // UUID
  from: AgentAddress; // Sender
  to: AgentAddress; // Recipient (or 'broadcast')
  type: T; // Message type
  payload: MessagePayloads[T]; // Type-safe payload
  timestamp: number;
  correlationId?: string; // For request/response pairs
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'delivered' | 'failed';
}

/**
 * Message handler function type
 */
export type MessageHandler = (message: AgentMessage) => void | Promise<void>;

/**
 * Event subscription
 */
export interface Subscription {
  agentId: string;
  handler: MessageHandler;
  unsubscribe: () => void;
}

/**
 * Message filter for history queries
 */
export interface MessageFilter {
  from?: string;
  to?: string;
  type?: MessageType;
  startTime?: number;
  endTime?: number;
  minPriority?: 'low' | 'normal' | 'high';
}

/**
 * Message statistics
 */
export interface MessageStats {
  totalSent: number;
  totalReceived: number;
  byType: Record<MessageType, number>;
  byAgent: Record<string, number>;
  errorRate: number;
  avgResponseTime: number;
}
