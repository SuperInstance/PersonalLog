/**
 * Proactive Confidence Scoring System
 *
 * Calculates confidence scores for proactive agent activation suggestions.
 * Factors in pattern strength, historical accuracy, context clarity, and user preferences.
 */

import type {
  ProactiveTriggerType,
  ConfidenceFactors,
  ConfidenceThresholds,
  ProactiveActionHistory,
} from './proactive-types';

// ============================================================================
// CONFIDENCE CALCULATOR
// ============================================================================

/**
 * Calculate confidence score for proactive suggestion
 *
 * @param triggerType - Type of proactive trigger
 * @param factors - Confidence factors
 * @param history - Historical action data
 * @param thresholds - Confidence thresholds
 * @returns Confidence score (0-1) and whether to suggest/activate
 */
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
  // Weight each factor
  const weights = {
    patternStrength: 0.30,
    historicalAccuracy: 0.25,
    contextClarity: 0.20,
    userPreference: 0.15,
    timeRelevance: 0.05,
    agentAvailability: 0.05,
  };

  // Calculate weighted confidence
  const confidence =
    factors.patternStrength * weights.patternStrength +
    factors.historicalAccuracy * weights.historicalAccuracy +
    factors.contextClarity * weights.contextClarity +
    factors.userPreference * weights.userPreference +
    factors.timeRelevance * weights.timeRelevance +
    factors.agentAvailability * weights.agentAvailability;

  // Determine if we should suggest
  const shouldSuggest = confidence >= thresholds.minSuggestion;

  // Determine if we should auto-activate
  const shouldAutoActivate = shouldSuggest && confidence >= thresholds.minAutoActivate;

  // Generate reason
  const reason = generateConfidenceReason(confidence, factors, shouldSuggest, shouldAutoActivate);

  return {
    confidence,
    shouldSuggest,
    shouldAutoActivate,
    reason,
  };
}

/**
 * Generate human-readable reason for confidence score
 */
function generateConfidenceReason(
  confidence: number,
  factors: ConfidenceFactors,
  shouldSuggest: boolean,
  shouldAutoActivate: boolean
): string {
  const parts: string[] = [];

  // Overall confidence
  parts.push(`Confidence: ${(confidence * 100).toFixed(0)}%`);

  // Key factors
  if (factors.patternStrength >= 0.8) {
    parts.push('Strong pattern match');
  } else if (factors.patternStrength >= 0.6) {
    parts.push('Moderate pattern match');
  }

  if (factors.historicalAccuracy >= 0.8) {
    parts.push('Highly accurate historically');
  } else if (factors.historicalAccuracy >= 0.6) {
    parts.push('Moderately accurate historically');
  }

  if (factors.contextClarity >= 0.8) {
    parts.push('Clear user intent');
  } else if (factors.contextClarity < 0.5) {
    parts.push('Uncertain user intent');
  }

  if (factors.userPreference >= 0.8) {
    parts.push('You usually accept this');
  } else if (factors.userPreference <= 0.3) {
    parts.push('You usually dismiss this');
  }

  if (shouldAutoActivate) {
    parts.push('Auto-activating based on your preferences');
  } else if (shouldSuggest) {
    parts.push('Suggesting action');
  }

  return parts.join('. ');
}

// ============================================================================
// FACTOR CALCULATION
// ============================================================================

/**
 * Calculate pattern strength factor
 *
 * Measures how well the current input matches the trigger pattern
 */
export function calculatePatternStrength(
  triggerType: ProactiveTriggerType,
  context: {
    inputText: string;
    messageCount: number;
    conversationDuration: number;
    recentMessages: Array<{ role: string; content: string }>;
  }
): number {
  const { inputText, messageCount, conversationDuration, recentMessages } = context;
  const lowerInput = inputText.toLowerCase();

  switch (triggerType) {
    case 'code_writing':
      // Code writing patterns
      const codeIndicators = [
        'function', 'class', 'const', 'let', 'var', 'import', 'export',
        'def ', 'class ', 'if ', 'for ', 'while ', 'return',
        'bug', 'error', 'fix', 'implement', 'refactor',
      ];
      const hasCodeKeywords = codeIndicators.some(kw => lowerInput.includes(kw));
      const hasCodeStructure = /[{}();]|\b(function|class|const|let|var|if|for|while)\b/.test(inputText);
      return (hasCodeKeywords ? 0.3 : 0) + (hasCodeStructure ? 0.4 : 0) + 0.3;

    case 'question_detected':
      // Question patterns
      const questionMark = inputText.includes('?');
      const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'would', 'should', 'is', 'are'];
      const hasQuestionWord = questionWords.some(qw => lowerInput.startsWith(qw));
      return (questionMark ? 0.4 : 0) + (hasQuestionWord ? 0.4 : 0) + 0.2;

    case 'long_conversation':
      // Long conversation patterns
      const messageThreshold = 20;
      const durationThreshold = 10 * 60 * 1000; // 10 minutes
      const messageScore = Math.min(messageCount / messageThreshold, 1.0);
      const durationScore = Math.min(conversationDuration / durationThreshold, 1.0);
      return (messageScore * 0.6 + durationScore * 0.4);

    case 'emotion_detected':
      // Emotion detection patterns (would integrate with JEPA)
      const emotionWords = ['feel', 'feeling', 'happy', 'sad', 'angry', 'frustrated', 'excited'];
      const hasEmotionWords = emotionWords.some(ew => lowerInput.includes(ew));
      const hasExclamation = inputText.includes('!');
      return (hasEmotionWords ? 0.6 : 0) + (hasExclamation ? 0.2 : 0) + 0.2;

    case 'complex_task':
      // Complex task patterns
      const complexIndicators = [
        'multiple', 'several', 'various', 'combine', 'integrate',
        'step by step', 'workflow', 'pipeline', 'orchestrate',
      ];
      const hasComplexWords = complexIndicators.some(ci => lowerInput.includes(ci));
      const avgMessageLength = recentMessages.reduce((sum, m) => sum + m.content.length, 0) / recentMessages.length;
      const lengthScore = Math.min(avgMessageLength / 500, 1.0);
      return (hasComplexWords ? 0.5 : 0) + (lengthScore * 0.3) + 0.2;

    case 'help_request':
      // Help request patterns
      const helpIndicators = ['help', 'assist', 'support', 'guide', 'how do i', 'how to'];
      const hasHelpWords = helpIndicators.some(hi => lowerInput.includes(hi));
      return hasHelpWords ? 0.9 : 0.3;

    case 'debugging':
      // Debugging patterns
      const debugIndicators = ['debug', 'fix', 'error', 'bug', 'issue', 'problem', 'broken', 'not working'];
      const hasDebugWords = debugIndicators.some(di => lowerInput.includes(di));
      return hasDebugWords ? 0.9 : 0.2;

    case 'agent_transition':
      // Agent transition patterns (would use prediction model)
      return 0.6; // Placeholder - would integrate with agent transition prediction

    case 'time_based':
      // Time-based patterns
      return 0.8; // High confidence if triggered

    case 'context_switch':
      // Context switch patterns
      const contextSwitchIndicators = ['switch to', 'change to', 'move to', 'go back to'];
      const hasContextSwitchWords = contextSwitchIndicators.some(csi => lowerInput.includes(csi));
      return hasContextSwitchWords ? 0.8 : 0.3;

    case 'repetitive_task':
      // Repetitive task patterns (would need history analysis)
      return 0.5; // Placeholder - would analyze action patterns

    default:
      return 0.5;
  }
}

/**
 * Calculate historical accuracy factor
 *
 * Based on past performance of this trigger type
 */
export function calculateHistoricalAccuracy(
  triggerType: ProactiveTriggerType,
  history: ProactiveActionHistory[]
): number {
  // Filter history for this trigger type
  const triggerHistory = history.filter(h => h.triggerType === triggerType);

  if (triggerHistory.length === 0) {
    // No history - return moderate default
    return 0.6;
  }

  // Calculate accuracy based on user acceptance
  const accepted = triggerHistory.filter(h => h.userResponse === 'accept').length;
  const total = triggerHistory.length;
  const accuracy = accepted / total;

  // Weight recent history more heavily
  const recentHistory = triggerHistory.slice(-20); // Last 20 actions
  if (recentHistory.length >= 5) {
    const recentAccepted = recentHistory.filter(h => h.userResponse === 'accept').length;
    const recentAccuracy = recentAccepted / recentHistory.length;
    // Blend overall and recent accuracy
    return accuracy * 0.4 + recentAccuracy * 0.6;
  }

  return accuracy;
}

/**
 * Calculate context clarity factor
 *
 * How clear the user's intent is from the context
 */
export function calculateContextClarity(context: {
  inputText: string;
  messageCount: number;
  conversationDuration: number;
  taskCategory?: string;
  hasExplicitRequest: boolean;
}): number {
  const { inputText, messageCount, taskCategory, hasExplicitRequest } = context;

  let clarity = 0.5; // Base clarity

  // Explicit request increases clarity
  if (hasExplicitRequest) {
    clarity += 0.3;
  }

  // Task category present increases clarity
  if (taskCategory) {
    clarity += 0.1;
  }

  // Message length impacts clarity (moderate length is best)
  const messageLength = inputText.length;
  if (messageLength > 20 && messageLength < 500) {
    clarity += 0.1;
  }

  // Too short or too long reduces clarity
  if (messageLength < 10 || messageLength > 1000) {
    clarity -= 0.1;
  }

  // Conversation context helps
  if (messageCount > 3) {
    clarity += 0.1;
  }

  return Math.min(Math.max(clarity, 0), 1);
}

/**
 * Calculate user preference factor
 *
 * Based on user's past acceptance/rejection of this trigger type
 */
export function calculateUserPreference(
  triggerType: ProactiveTriggerType,
  acceptCount: number,
  dismissCount: number
): number {
  const total = acceptCount + dismissCount;

  if (total === 0) {
    return 0.5; // Neutral - no preference data
  }

  const acceptanceRate = acceptCount / total;

  // Adjust based on total count (more data = more confident)
  const confidence = Math.min(total / 10, 1.0);

  // Blend acceptance rate with neutral prior
  return acceptanceRate * confidence + 0.5 * (1 - confidence);
}

/**
 * Calculate time relevance factor
 *
 * Whether this is a good time to interrupt the user
 */
export function calculateTimeRelevance(context: {
  timeSinceLastMessage: number;
  userActivity: 'active' | 'idle' | 'away';
  timeOfDay: number; // 0-23
}): number {
  const { timeSinceLastMessage, userActivity, timeOfDay } = context;

  let relevance = 0.5;

  // Don't interrupt if user is actively typing
  if (timeSinceLastMessage < 2000) {
    relevance -= 0.3;
  }

  // Good time if user is thinking (paused but active)
  if (timeSinceLastMessage > 5000 && timeSinceLastMessage < 60000 && userActivity === 'active') {
    relevance += 0.3;
  }

  // Avoid interrupting if user is away
  if (userActivity === 'away') {
    relevance -= 0.4;
  }

  // Consider time of day (avoid late night/early morning)
  if (timeOfDay >= 22 || timeOfDay <= 6) {
    relevance -= 0.2;
  }

  // Work hours are generally better
  if (timeOfDay >= 9 && timeOfDay <= 17) {
    relevance += 0.1;
  }

  return Math.min(Math.max(relevance, 0), 1);
}

/**
 * Calculate agent availability factor
 *
 * Whether the suggested agent is available and ready
 */
export function calculateAgentAvailability(
  agentAvailable: boolean,
  agentActive: boolean
): number {
  if (!agentAvailable) {
    return 0; // Agent not available
  }

  if (agentActive) {
    return 0.5; // Already active - lower priority
  }

  return 1.0; // Available and inactive - optimal
}

// ============================================================================
// CONFIDENCE CALIBRATION
// ============================================================================

/**
 * Calibrate confidence thresholds based on user feedback
 *
 * Adjusts thresholds to optimize for user acceptance rate
 */
export function calibrateThresholds(
  currentThresholds: ConfidenceThresholds,
  history: ProactiveActionHistory[],
  targetAcceptanceRate: number = 0.7
): ConfidenceThresholds {
  // Calculate current acceptance rate
  const recentHistory = history.slice(-50); // Last 50 actions
  if (recentHistory.length < 10) {
    return currentThresholds; // Not enough data
  }

  const accepted = recentHistory.filter(h => h.userResponse === 'accept').length;
  const currentRate = accepted / recentHistory.length;

  // Adjust thresholds if acceptance rate is off target
  const newThresholds = { ...currentThresholds };

  if (currentRate < targetAcceptanceRate - 0.1) {
    // Too many rejections - increase thresholds
    newThresholds.minSuggestion = Math.min(currentThresholds.minSuggestion + 0.05, 0.9);
    newThresholds.minAutoActivate = Math.min(currentThresholds.minAutoActivate + 0.05, 0.95);
  } else if (currentRate > targetAcceptanceRate + 0.1) {
    // High acceptance - can be more proactive
    newThresholds.minSuggestion = Math.max(currentThresholds.minSuggestion - 0.05, 0.4);
    newThresholds.minAutoActivate = Math.max(currentThresholds.minAutoActivate - 0.05, 0.7);
  }

  return newThresholds;
}

/**
 * Get confidence score for display
 *
 * Formats confidence as a human-readable label
 */
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
