/**
 * Proactive Agent Activation System Types
 *
 * Type definitions for the proactive activation system that anticipates user needs
 * and activates agents before they are explicitly requested.
 */

import type { Message, Conversation } from '@/types/conversation';
import type { TaskCategory } from '@/lib/agents/task-taxonomy';

// ============================================================================
// PROACTIVE TRIGGER TYPES
// ============================================================================

/**
 * Proactive trigger types - when agents should be activated proactively
 */
export enum ProactiveTriggerType {
  /** User is writing code - activate code reviewer */
  CODE_WRITING = 'code_writing',

  /** User asks a question - activate research agent */
  QUESTION_DETECTED = 'question_detected',

  /** Long conversation detected - activate summarizer */
  LONG_CONVERSATION = 'long_conversation',

  /** Emotion detected - activate JEPA emotion analysis */
  EMOTION_DETECTED = 'emotion_detected',

  /** Complex task detected - activate Spreader for parallelization */
  COMPLEX_TASK = 'complex_task',

  /** User requests help - activate relevant helper agent */
  HELP_REQUEST = 'help_request',

  /** User debugging - activate debugging agent */
  DEBUGGING = 'debugging',

  /** Pattern of agent transitions - predict next agent */
  AGENT_TRANSITION = 'agent_transition',

  /** Time-based trigger (e.g., daily report) */
  TIME_BASED = 'time_based',

  /** Context switch - detect new context */
  CONTEXT_SWITCH = 'context_switch',

  /** Repetitive task - suggest automation */
  REPETITIVE_TASK = 'repetitive_task',
}

/**
 * Agent to activate proactively
 */
export interface ProactiveAgentAction {
  /** Unique action ID */
  id: string;

  /** Agent ID to activate */
  agentId: string;

  /** Trigger type */
  triggerType: ProactiveTriggerType;

  /** Conversation ID */
  conversationId: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Reason for activation */
  reason: string;

  /** Expected benefit */
  expectedBenefit: string;

  /** Timestamp */
  timestamp: number;

  /** Whether action was executed */
  executed: boolean;

  /** Whether user accepted */
  userAccepted?: boolean;

  /** User feedback */
  userFeedback?: 'helpful' | 'not_helpful' | 'neutral';
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Conversation state for proactive evaluation
 */
export interface ProactiveContext {
  /** Current conversation */
  conversation: Conversation;

  /** Recent messages (last 10) */
  recentMessages: Message[];

  /** Message count in conversation */
  messageCount: number;

  /** Conversation duration (milliseconds) */
  conversationDuration: number;

  /** Time since last message (milliseconds) */
  timeSinceLastMessage: number;

  /** Current task category (from task classifier) */
  taskCategory?: TaskCategory;

  /** Active agents */
  activeAgents: string[];

  /** Recent agent activations */
  recentAgentActivations: Array<{
    agentId: string;
    timestamp: number;
  }>;

  /** Current timestamp */
  timestamp: number;

  /** User's current focus (app state) */
  userFocus?: {
    /** Current page/route */
    page: string;
    /** Active component */
    component?: string;
    /** User activity level */
    activity: 'active' | 'idle' | 'away';
  };
}

/**
 * Trigger evaluation result
 */
export interface TriggerEvaluation {
  /** Trigger type */
  triggerType: ProactiveTriggerType;

  /** Whether trigger conditions are met */
  triggered: boolean;

  /** Confidence in trigger (0-1) */
  confidence: number;

  /** Suggested agent actions */
  actions: ProactiveAgentAction[];

  /** Trigger reason */
  reason: string;

  /** Evaluation timestamp */
  timestamp: number;
}

// ============================================================================
// CONFIDENCE TYPES
// ============================================================================

/**
 * Confidence factors for proactive suggestions
 */
export interface ConfidenceFactors {
  /** Pattern strength (how well input matches trigger pattern) */
  patternStrength: number;

  /** Historical accuracy (how often this trigger was correct) */
  historicalAccuracy: number;

  /** Context clarity (how clear the user's intent is) */
  contextClarity: number;

  /** User preference (how often user accepts this trigger) */
  userPreference: number;

  /** Time relevance (is this a good time to interrupt) */
  timeRelevance: number;

  /** Agent availability (is the agent available) */
  agentAvailability: number;
}

/**
 * Confidence threshold configuration
 */
export interface ConfidenceThresholds {
  /** Minimum confidence to suggest action */
  minSuggestion: number;

  /** Minimum confidence to auto-activate (if user enabled) */
  minAutoActivate: number;

  /** Maximum suggestions per minute */
  maxSuggestionsPerMinute: number;

  /** Cooldown between same trigger type (milliseconds) */
  cooldownMs: number;
}

// ============================================================================
// USER CONTROL TYPES
// ============================================================================

/**
 * User preferences for proactive activation
 */
export interface ProactivePreferences {
  /** Master enable/disable for proactive features */
  enabled: boolean;

  /** Per-trigger-type preferences */
  triggerPreferences: Record<ProactiveTriggerType, {
    /** Whether this trigger is enabled */
    enabled: boolean;

    /** Whether to auto-activate (no notification) */
    autoActivate: boolean;

    /** Minimum confidence threshold */
    minConfidence: number;

    /** How many times user accepted */
    acceptCount: number;

    /** How many times user dismissed */
    dismissCount: number;

    /** User feedback score (0-1) */
    feedbackScore: number;
  }>;

  /** Notification preferences */
  notifications: {
    /** Show notification before activation */
    showBeforeActivation: boolean;

    /** Notification duration (milliseconds) */
    duration: number;

    /** Position on screen */
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
  };

  /** Privacy preferences */
  privacy: {
    /** Require user consent for proactive actions */
    requireConsent: boolean;

    /** Learn from user behavior */
    learnFromBehavior: true;

    /** Share proactive analytics */
    shareAnalytics: boolean;
  };
}

/**
 * User feedback on proactive action
 */
export interface ProactiveFeedback {
  /** Action ID */
  actionId: string;

  /** User response */
  response: 'accept' | 'dismiss' | 'feedback';

  /** Detailed feedback (if provided) */
  detailedFeedback?: 'helpful' | 'not_helpful' | 'neutral';

  /** Feedback timestamp */
  timestamp: number;

  /** User comments (optional) */
  comments?: string;
}

// ============================================================================
// HISTORY TYPES
// ============================================================================

/**
 * Proactive action history record
 */
export interface ProactiveActionHistory {
  /** Action ID */
  actionId: string;

  /** Agent ID */
  agentId: string;

  /** Trigger type */
  triggerType: ProactiveTriggerType;

  /** Confidence score */
  confidence: number;

  /** Whether executed */
  executed: boolean;

  /** User response */
  userResponse?: 'accept' | 'dismiss' | 'feedback';

  /** User feedback score */
  feedbackScore?: number;

  /** Time to activation (milliseconds from suggestion to activation) */
  timeToActivation?: number;

  /** Was the activation helpful */
  helpful?: boolean;

  /** Timestamp */
  timestamp: number;
}

/**
 * Statistics for proactive system performance
 */
export interface ProactiveStatistics {
  /** Total proactive suggestions made */
  totalSuggestions: number;

  /** Total proactive actions executed */
  totalExecuted: number;

  /** Acceptance rate (0-1) */
  acceptanceRate: number;

  /** Average confidence score */
  avgConfidence: number;

  /** Per-trigger statistics */
  triggerStats: Record<ProactiveTriggerType, {
    /** How many times triggered */
    triggerCount: number;

    /** How many times accepted */
    acceptCount: number;

    /** Acceptance rate (0-1) */
    acceptanceRate: number;

    /** Average confidence */
    avgConfidence: number;

    /** Average time to activation (ms) */
    avgTimeToActivation: number;

    /** User feedback score (0-1) */
    feedbackScore: number;
  }>;

  /** Anticipation time statistics (milliseconds) */
  anticipation: {
    /** Average anticipation time */
    avgTime: number;

    /** Best anticipation time (earliest) */
    bestTime: number;

    /** Target anticipation time (goal) */
    targetTime: number;
  };
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Proactive system configuration
 */
export interface ProactiveConfig {
  /** Evaluation interval (milliseconds) */
  evaluationInterval: number;

  /** Confidence thresholds */
  confidenceThresholds: ConfidenceThresholds;

  /** Maximum actions to queue */
  maxQueuedActions: number;

  /** Action history size */
  historySize: number;

  /** Minimum anticipation time (milliseconds) */
  minAnticipationTime: number;

  /** Target anticipation time (milliseconds) */
  targetAnticipationTime: number;
}

/**
 * Default proactive configuration
 */
export const DEFAULT_PROACTIVE_CONFIG: ProactiveConfig = {
  evaluationInterval: 15000, // 15 seconds
  confidenceThresholds: {
    minSuggestion: 0.6,
    minAutoActivate: 0.85,
    maxSuggestionsPerMinute: 3,
    cooldownMs: 30000, // 30 seconds
  },
  maxQueuedActions: 10,
  historySize: 100,
  minAnticipationTime: 10000, // 10 seconds
  targetAnticipationTime: 30000, // 30 seconds
};

/**
 * Default proactive preferences
 */
export const DEFAULT_PROACTIVE_PREFERENCES: ProactivePreferences = {
  enabled: true,
  triggerPreferences: Object.values(ProactiveTriggerType).reduce((acc, trigger) => {
    acc[trigger] = {
      enabled: trigger !== ProactiveTriggerType.TIME_BASED, // Disabled by default
      autoActivate: false,
      minConfidence: 0.7,
      acceptCount: 0,
      dismissCount: 0,
      feedbackScore: 0.5,
    };
    return acc;
  }, {} as Record<ProactiveTriggerType, any>),
  notifications: {
    showBeforeActivation: true,
    duration: 5000,
    position: 'bottom-right',
  },
  privacy: {
    requireConsent: false,
    learnFromBehavior: true,
    shareAnalytics: false,
  },
};
