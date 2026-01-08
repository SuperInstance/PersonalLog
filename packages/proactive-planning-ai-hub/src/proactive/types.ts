/**
 * Proactive Engine Types
 *
 * Type definitions for proactive agent activation system
 */

import type { ProactiveAgentAction, ProactiveContext } from '../types';
import { ProactiveTriggerType } from '../types';

// ============================================================================
// CONFIDENCE TYPES
// ============================================================================

export interface ConfidenceFactors {
  patternStrength: number;
  historicalAccuracy: number;
  contextClarity: number;
  userPreference: number;
  timeRelevance: number;
  agentAvailability: number;
}

export interface ConfidenceThresholds {
  minSuggestion: number;
  minAutoActivate: number;
  maxSuggestionsPerMinute: number;
  cooldownMs: number;
}

// ============================================================================
// TRIGGER EVALUATION
// ============================================================================

export interface TriggerEvaluation {
  triggerType: ProactiveTriggerType;
  triggered: boolean;
  confidence: number;
  actions: ProactiveAgentAction[];
  reason: string;
  timestamp: number;
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

export interface ProactivePreferences {
  enabled: boolean;
  triggerPreferences: Record<ProactiveTriggerType, {
    enabled: boolean;
    autoActivate: boolean;
    minConfidence: number;
    acceptCount: number;
    dismissCount: number;
    feedbackScore: number;
  }>;
  notifications: {
    showBeforeActivation: boolean;
    duration: number;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
  };
  privacy: {
    requireConsent: boolean;
    learnFromBehavior: boolean;
    shareAnalytics: boolean;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface ProactiveConfig {
  evaluationInterval: number;
  confidenceThresholds: ConfidenceThresholds;
  maxQueuedActions: number;
  historySize: number;
  minAnticipationTime: number;
  targetAnticipationTime: number;
}

export interface ProactiveActionHistory {
  actionId: string;
  agentId: string;
  triggerType: ProactiveTriggerType;
  confidence: number;
  executed: boolean;
  userResponse?: 'accept' | 'dismiss' | 'feedback';
  feedbackScore?: number;
  timeToActivation?: number;
  helpful?: boolean;
  timestamp: number;
}

export interface ProactiveStatistics {
  totalSuggestions: number;
  totalExecuted: number;
  acceptanceRate: number;
  avgConfidence: number;
  triggerStats: Record<ProactiveTriggerType, {
    triggerCount: number;
    acceptCount: number;
    acceptanceRate: number;
    avgConfidence: number;
    avgTimeToActivation: number;
    feedbackScore: number;
  }>;
  anticipation: {
    avgTime: number;
    bestTime: number;
    targetTime: number;
  };
}

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_PROACTIVE_CONFIG: ProactiveConfig = {
  evaluationInterval: 15000,
  confidenceThresholds: {
    minSuggestion: 0.6,
    minAutoActivate: 0.85,
    maxSuggestionsPerMinute: 3,
    cooldownMs: 30000,
  },
  maxQueuedActions: 10,
  historySize: 100,
  minAnticipationTime: 10000,
  targetAnticipationTime: 30000,
};

export const DEFAULT_PROACTIVE_PREFERENCES: ProactivePreferences = {
  enabled: true,
  triggerPreferences: Object.values(ProactiveTriggerType).reduce((acc, trigger) => {
    acc[trigger] = {
      enabled: trigger !== ProactiveTriggerType.TIME_BASED,
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
