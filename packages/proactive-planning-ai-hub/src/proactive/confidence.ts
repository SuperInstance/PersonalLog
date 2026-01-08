/**
 * Proactive Confidence Calculator
 *
 * Calculates confidence scores for proactive agent activation
 */

import { ProactiveTriggerType } from '../types';
import type {
  ConfidenceFactors,
  ConfidenceThresholds,
  ProactiveActionHistory,
} from './types';

// ============================================================================
// CONFIDENCE CALCULATION
// ============================================================================

export function calculateConfidence(
  triggerType: ProactiveTriggerType,
  factors: ConfidenceFactors,
  history: ProactiveActionHistory[],
  thresholds: ConfidenceThresholds
): {
  confidence: number;
  shouldSuggest: boolean;
  shouldAutoActivate: boolean;
  reason: string;
} {
  const weights = {
    patternStrength: 0.30,
    historicalAccuracy: 0.25,
    contextClarity: 0.20,
    userPreference: 0.15,
    timeRelevance: 0.05,
    agentAvailability: 0.05,
  };

  const confidence =
    factors.patternStrength * weights.patternStrength +
    factors.historicalAccuracy * weights.historicalAccuracy +
    factors.contextClarity * weights.contextClarity +
    factors.userPreference * weights.userPreference +
    factors.timeRelevance * weights.timeRelevance +
    factors.agentAvailability * weights.agentAvailability;

  const shouldSuggest = confidence >= thresholds.minSuggestion;
  const shouldAutoActivate = shouldSuggest && confidence >= thresholds.minAutoActivate;

  const reason = `Confidence: ${(confidence * 100).toFixed(0)}%`;

  return { confidence, shouldSuggest, shouldAutoActivate, reason };
}

export function calculatePatternStrength(
  triggerType: ProactiveTriggerType,
  context: {
    inputText: string;
    messageCount: number;
    conversationDuration: number;
    recentMessages: Array<{ role: string; content: string }>;
  }
): number {
  const { inputText, messageCount, conversationDuration } = context;
  const lowerInput = inputText.toLowerCase();

  switch (triggerType) {
    case 'code_writing':
      const codeIndicators = ['function', 'class', 'const', 'let', 'var', 'import', 'export', 'def ', 'bug', 'fix', 'implement'];
      const hasCodeKeywords = codeIndicators.some(kw => lowerInput.includes(kw));
      const hasCodeStructure = /[{}();]|\b(function|class|const|let|var)\b/.test(inputText);
      return (hasCodeKeywords ? 0.4 : 0) + (hasCodeStructure ? 0.4 : 0) + 0.2;

    case 'question_detected':
      const hasQuestionMark = inputText.includes('?');
      const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'would'];
      const hasQuestionWord = questionWords.some(qw => lowerInput.startsWith(qw));
      return (hasQuestionMark ? 0.5 : 0) + (hasQuestionWord ? 0.3 : 0) + 0.2;

    case 'long_conversation':
      const messageThreshold = 20;
      const messageScore = Math.min(messageCount / messageThreshold, 1.0);
      return messageScore;

    case 'complex_task':
      const complexIndicators = ['multiple', 'several', 'combine', 'integrate', 'step by step', 'workflow'];
      const hasComplexWords = complexIndicators.some(ci => lowerInput.includes(ci));
      return hasComplexWords ? 0.8 : 0.4;

    default:
      return 0.6;
  }
}

export function calculateHistoricalAccuracy(
  triggerType: ProactiveTriggerType,
  history: ProactiveActionHistory[]
): number {
  const triggerHistory = history.filter(h => h.triggerType === triggerType);

  if (triggerHistory.length === 0) {
    return 0.6;
  }

  const accepted = triggerHistory.filter(h => h.userResponse === 'accept').length;
  return accepted / triggerHistory.length;
}

export function calculateContextClarity(context: {
  inputText: string;
  messageCount: number;
  conversationDuration: number;
  taskCategory?: string;
  hasExplicitRequest: boolean;
}): number {
  let clarity = 0.5;

  if (context.hasExplicitRequest) {
    clarity += 0.3;
  }

  if (context.taskCategory) {
    clarity += 0.1;
  }

  const messageLength = context.inputText.length;
  if (messageLength > 20 && messageLength < 500) {
    clarity += 0.1;
  }

  if (context.messageCount > 3) {
    clarity += 0.1;
  }

  return Math.min(Math.max(clarity, 0), 1);
}

export function calculateUserPreference(
  triggerType: ProactiveTriggerType,
  acceptCount: number,
  dismissCount: number
): number {
  const total = acceptCount + dismissCount;

  if (total === 0) {
    return 0.5;
  }

  return acceptCount / total;
}

export function calculateTimeRelevance(context: {
  timeSinceLastMessage: number;
  userActivity: 'active' | 'idle' | 'away';
  timeOfDay: number;
}): number {
  let relevance = 0.5;

  if (context.timeSinceLastMessage > 5000 && context.timeSinceLastMessage < 60000 && context.userActivity === 'active') {
    relevance += 0.3;
  }

  if (context.userActivity === 'away') {
    relevance -= 0.4;
  }

  return Math.min(Math.max(relevance, 0), 1);
}

export function calculateAgentAvailability(
  agentAvailable: boolean,
  agentActive: boolean
): number {
  if (!agentAvailable) return 0;
  if (agentActive) return 0.5;
  return 1.0;
}

export function calibrateThresholds(
  currentThresholds: ConfidenceThresholds,
  history: ProactiveActionHistory[],
  targetAcceptanceRate: number = 0.7
): ConfidenceThresholds {
  const recentHistory = history.slice(-50);
  if (recentHistory.length < 10) {
    return currentThresholds;
  }

  const accepted = recentHistory.filter(h => h.userResponse === 'accept').length;
  const currentRate = accepted / recentHistory.length;

  const newThresholds = { ...currentThresholds };

  if (currentRate < targetAcceptanceRate - 0.1) {
    newThresholds.minSuggestion = Math.min(currentThresholds.minSuggestion + 0.05, 0.9);
  } else if (currentRate > targetAcceptanceRate + 0.1) {
    newThresholds.minSuggestion = Math.max(currentThresholds.minSuggestion - 0.05, 0.4);
  }

  return newThresholds;
}

export function getConfidenceLabel(confidence: number): {
  label: string;
  color: string;
  icon: string;
} {
  if (confidence >= 0.9) {
    return { label: 'Very High', color: 'green', icon: '●' };
  } else if (confidence >= 0.75) {
    return { label: 'High', color: 'blue', icon: '●' };
  } else if (confidence >= 0.6) {
    return { label: 'Medium', color: 'yellow', icon: '○' };
  } else if (confidence >= 0.4) {
    return { label: 'Low', color: 'orange', icon: '○' };
  } else {
    return { label: 'Very Low', color: 'red', icon: '○' };
  }
}
