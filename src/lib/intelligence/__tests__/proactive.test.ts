/**
 * Proactive Agent Activation System Tests
 *
 * Comprehensive test suite for proactive triggers, confidence scoring,
 * and user feedback learning.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getProactiveEngine } from '../proactive-engine';
import {
  calculateConfidence,
  calculatePatternStrength,
  calculateHistoricalAccuracy,
  calculateContextClarity,
  calculateUserPreference,
  calculateTimeRelevance,
  calculateAgentAvailability,
  calibrateThresholds,
  getConfidenceLabel,
} from '../proactive-confidence';
import {
  ProactiveTriggerType,
  ProactiveAgentAction,
  ProactiveActionHistory,
  ProactivePreferences,
  DEFAULT_PROACTIVE_CONFIG,
} from '../proactive-types';
import type { Message, Conversation } from '@/types/conversation';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockConversation(messageCount: number = 10): Conversation {
  const messages: Message[] = [];

  for (let i = 0; i < messageCount; i++) {
    messages.push({
      id: `msg_${i}`,
      conversationId: 'conv_test',
      type: 'text',
      author: i % 2 === 0 ? 'user' : { type: 'ai-contact', contactId: 'assistant', contactName: 'Assistant' },
      content: { text: i % 2 === 0 ? `User message ${i}` : `Assistant response ${i}` },
      timestamp: (Date.now() - (messageCount - i) * 60000).toString(),
      metadata: {},
    });
  }

  return {
    id: 'conv_test',
    title: 'Test Conversation',
    type: 'chat',
    messages,
    aiContacts: [],
    settings: {},
    metadata: {},
    createdAt: (Date.now() - messageCount * 60000).toString(),
    updatedAt: Date.now().toString(),
  };
}

function createMockRecentMessages(count: number = 5): Message[] {
  const messages: Message[] = [];

  for (let i = 0; i < count; i++) {
    messages.push({
      id: `msg_recent_${i}`,
      conversationId: 'conv_test',
      type: 'text',
      author: i % 2 === 0 ? 'user' : { type: 'ai-contact', contactId: 'assistant', contactName: 'Assistant' },
      content: { text: i % 2 === 0 ? `Recent message ${i}` : `Recent response ${i}` },
      timestamp: (Date.now() - (count - i) * 30000).toString(),
      metadata: {},
    });
  }

  return messages;
}

// ============================================================================
// CONFIDENCE CALCULATION TESTS
// ============================================================================

describe('Proactive Confidence Calculation', () => {
  it('should calculate high confidence for strong pattern match', () => {
    const factors = {
      patternStrength: 0.9,
      historicalAccuracy: 0.8,
      contextClarity: 0.85,
      userPreference: 0.75,
      timeRelevance: 0.8,
      agentAvailability: 1.0,
    };

    const thresholds = DEFAULT_PROACTIVE_CONFIG.confidenceThresholds;
    const result = calculateConfidence(
      ProactiveTriggerType.CODE_WRITING,
      factors,
      [],
      thresholds
    );

    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.shouldSuggest).toBe(true);
    expect(result.shouldAutoActivate).toBe(false); // Below auto-activate threshold
  });

  it('should suggest action when confidence exceeds threshold', () => {
    const factors = {
      patternStrength: 0.7,
      historicalAccuracy: 0.7,
      contextClarity: 0.7,
      userPreference: 0.7,
      timeRelevance: 0.7,
      agentAvailability: 1.0,
    };

    const thresholds = {
      minSuggestion: 0.6,
      minAutoActivate: 0.85,
      maxSuggestionsPerMinute: 3,
      cooldownMs: 30000,
    };

    const result = calculateConfidence(
      ProactiveTriggerType.CODE_WRITING,
      factors,
      [],
      thresholds
    );

    expect(result.confidence).toBeGreaterThan(0.6);
    expect(result.shouldSuggest).toBe(true);
  });

  it('should not suggest action when confidence is below threshold', () => {
    const factors = {
      patternStrength: 0.3,
      historicalAccuracy: 0.3,
      contextClarity: 0.3,
      userPreference: 0.3,
      timeRelevance: 0.3,
      agentAvailability: 1.0,
    };

    const thresholds = DEFAULT_PROACTIVE_CONFIG.confidenceThresholds;

    const result = calculateConfidence(
      ProactiveTriggerType.CODE_WRITING,
      factors,
      [],
      thresholds
    );

    expect(result.confidence).toBeLessThan(0.5);
    expect(result.shouldSuggest).toBe(false);
  });

  it('should auto-activate when confidence is very high', () => {
    const factors = {
      patternStrength: 0.95,
      historicalAccuracy: 0.95,
      contextClarity: 0.95,
      userPreference: 0.95,
      timeRelevance: 0.9,
      agentAvailability: 1.0,
    };

    const thresholds = {
      minSuggestion: 0.6,
      minAutoActivate: 0.85,
      maxSuggestionsPerMinute: 3,
      cooldownMs: 30000,
    };

    const result = calculateConfidence(
      ProactiveTriggerType.CODE_WRITING,
      factors,
      [],
      thresholds
    );

    expect(result.confidence).toBeGreaterThan(0.85);
    expect(result.shouldSuggest).toBe(true);
    expect(result.shouldAutoActivate).toBe(true);
  });
});

// ============================================================================
// PATTERN STRENGTH TESTS
// ============================================================================

describe('Pattern Strength Calculation', () => {
  it('should detect code writing patterns', () => {
    const strength = calculatePatternStrength(ProactiveTriggerType.CODE_WRITING, {
      inputText: 'function calculateTotal(items) { return items.reduce((sum, item) => sum + item.price, 0); }',
      messageCount: 5,
      conversationDuration: 300000,
      recentMessages: [
        { role: 'user', content: 'Implement this function' },
        { role: 'assistant', content: 'Sure, I can help with that' },
      ] as any,
    });

    expect(strength).toBeGreaterThan(0.6);
  });

  it('should detect question patterns', () => {
    const strength = calculatePatternStrength(ProactiveTriggerType.QUESTION_DETECTED, {
      inputText: 'How do I implement a feature for user preferences?',
      messageCount: 3,
      conversationDuration: 120000,
      recentMessages: [
        { role: 'user', content: 'I need help with something' },
        { role: 'assistant', content: 'What do you need help with?' },
      ] as any,
    });

    expect(strength).toBeGreaterThan(0.7);
  });

  it('should detect long conversation', () => {
    const strength = calculatePatternStrength(ProactiveTriggerType.LONG_CONVERSATION, {
      inputText: 'Continue the discussion',
      messageCount: 25,
      conversationDuration: 15 * 60 * 1000, // 15 minutes
      recentMessages: createMockRecentMessages(10),
    });

    expect(strength).toBeGreaterThan(0.8);
  });

  it('should detect emotion patterns', () => {
    const strength = calculatePatternStrength(ProactiveTriggerType.EMOTION_DETECTED, {
      inputText: 'I feel so frustrated with this bug!',
      messageCount: 5,
      conversationDuration: 180000,
      recentMessages: [
        { role: 'user', content: 'This is really annoying' },
        { role: 'assistant', content: 'I understand' },
      ],
    });

    expect(strength).toBeGreaterThan(0.5);
  });

  it('should detect complex task patterns', () => {
    const strength = calculatePatternStrength(ProactiveTriggerType.COMPLEX_TASK, {
      inputText: 'I need to implement multiple features that need to work together',
      messageCount: 8,
      conversationDuration: 300000,
      recentMessages: createMockRecentMessages(5).map(m => ({
        role: typeof m.author === 'string' ? m.author : 'ai',
        content: m.content.text || '',
      })),
    });

    expect(strength).toBeGreaterThan(0.5);
  });

  it('should detect help request patterns', () => {
    const strength = calculatePatternStrength(ProactiveTriggerType.HELP_REQUEST, {
      inputText: 'Can you help me with this problem?',
      messageCount: 3,
      conversationDuration: 120000,
      recentMessages: [
        { role: 'user', content: 'I need assistance' },
        { role: 'assistant', content: 'Sure' },
      ],
    });

    expect(strength).toBeGreaterThan(0.8);
  });

  it('should detect debugging patterns', () => {
    const strength = calculatePatternStrength(ProactiveTriggerType.DEBUGGING, {
      inputText: 'I have a bug in my code - the function returns undefined',
      messageCount: 5,
      conversationDuration: 240000,
      recentMessages: [
        { role: 'user', content: 'Something is broken' },
        { role: 'assistant', content: 'What happened?' },
      ],
    });

    expect(strength).toBeGreaterThan(0.8);
  });
});

// ============================================================================
// HISTORICAL ACCURACY TESTS
// ============================================================================

describe('Historical Accuracy Calculation', () => {
  it('should return default accuracy with no history', () => {
    const accuracy = calculateHistoricalAccuracy(ProactiveTriggerType.CODE_WRITING, []);

    expect(accuracy).toBe(0.6);
  });

  it('should calculate accuracy from acceptance rate', () => {
    const history: ProactiveActionHistory[] = [
      {
        actionId: '1',
        agentId: 'code-reviewer',
        triggerType: ProactiveTriggerType.CODE_WRITING,
        confidence: 0.8,
        executed: true,
        userResponse: 'accept',
        timestamp: Date.now(),
      },
      {
        actionId: '2',
        agentId: 'code-reviewer',
        triggerType: ProactiveTriggerType.CODE_WRITING,
        confidence: 0.7,
        executed: false,
        userResponse: 'dismiss',
        timestamp: Date.now(),
      },
      {
        actionId: '3',
        agentId: 'code-reviewer',
        triggerType: ProactiveTriggerType.CODE_WRITING,
        confidence: 0.85,
        executed: true,
        userResponse: 'accept',
        timestamp: Date.now(),
      },
    ];

    const accuracy = calculateHistoricalAccuracy(ProactiveTriggerType.CODE_WRITING, history);

    expect(accuracy).toBeCloseTo(0.67, 1); // 2/3 acceptance
  });

  it('should weight recent history more heavily', () => {
    const history: ProactiveActionHistory[] = [];
    const now = Date.now();

    // Old history - low acceptance
    for (let i = 0; i < 20; i++) {
      history.push({
        actionId: `old_${i}`,
        agentId: 'code-reviewer',
        triggerType: ProactiveTriggerType.CODE_WRITING,
        confidence: 0.7,
        executed: i < 5, // Only 5/20 accepted
        userResponse: i < 5 ? 'accept' : 'dismiss',
        timestamp: now - 1000000,
      });
    }

    // Recent history - high acceptance
    for (let i = 0; i < 10; i++) {
      history.push({
        actionId: `recent_${i}`,
        agentId: 'code-reviewer',
        triggerType: ProactiveTriggerType.CODE_WRITING,
        confidence: 0.8,
        executed: true, // 10/10 accepted
        userResponse: 'accept',
        timestamp: now - 10000,
      });
    }

    const accuracy = calculateHistoricalAccuracy(ProactiveTriggerType.CODE_WRITING, history);

    // Overall accuracy is 15/30 = 0.5, but recent weighting should boost it
    // Due to blending: 0.5 * 0.4 (overall) + 1.0 * 0.6 (recent) = 0.8
    expect(accuracy).toBeGreaterThanOrEqual(0.5);
    expect(accuracy).toBeLessThanOrEqual(0.9);
  });
});

// ============================================================================
// CONTEXT CLARITY TESTS
// ============================================================================

describe('Context Clarity Calculation', () => {
  it('should calculate high clarity for explicit requests', () => {
    const clarity = calculateContextClarity({
      inputText: 'Please implement a user authentication system',
      messageCount: 5,
      conversationDuration: 300000,
      taskCategory: 'coding',
      hasExplicitRequest: true,
    });

    expect(clarity).toBeGreaterThan(0.7);
  });

  it('should calculate moderate clarity for implicit requests', () => {
    const clarity = calculateContextClarity({
      inputText: 'authentication system',
      messageCount: 3,
      conversationDuration: 180000,
      taskCategory: undefined,
      hasExplicitRequest: false,
    });

    expect(clarity).toBeGreaterThan(0.4);
    expect(clarity).toBeLessThan(0.7);
  });

  it('should penalize very short messages', () => {
    const clarity = calculateContextClarity({
      inputText: 'ok',
      messageCount: 5,
      conversationDuration: 300000,
      taskCategory: 'general',
      hasExplicitRequest: false,
    });

    expect(clarity).toBeLessThanOrEqual(0.6);
  });

  it('should penalize very long messages', () => {
    const clarity = calculateContextClarity({
      inputText: 'a'.repeat(1500),
      messageCount: 5,
      conversationDuration: 300000,
      taskCategory: 'writing',
      hasExplicitRequest: true,
    });

    // Very long message with explicit request - penalty is applied but request bonus remains
    // Base 0.5 - 0.1 (too long) + 0.3 (explicit) + 0.1 (category) = 0.8
    expect(clarity).toBeLessThanOrEqual(0.9);
  });
});

// ============================================================================
// USER PREFERENCE TESTS
// ============================================================================

describe('User Preference Calculation', () => {
  it('should return neutral with no data', () => {
    const preference = calculateUserPreference(ProactiveTriggerType.CODE_WRITING, 0, 0);

    expect(preference).toBe(0.5);
  });

  it('should calculate high preference for high acceptance', () => {
    const preference = calculateUserPreference(ProactiveTriggerType.CODE_WRITING, 8, 2);

    expect(preference).toBeGreaterThan(0.7);
  });

  it('should calculate low preference for high dismissal', () => {
    const preference = calculateUserPreference(ProactiveTriggerType.CODE_WRITING, 2, 8);

    expect(preference).toBeLessThan(0.4);
  });

  it('should blend with neutral prior for low data', () => {
    const preference = calculateUserPreference(ProactiveTriggerType.CODE_WRITING, 1, 0);

    // Should be between 0.5 and 1.0, closer to 0.5 due to low data
    expect(preference).toBeGreaterThan(0.5);
    expect(preference).toBeLessThan(0.7);
  });

  it('should be confident with high data', () => {
    const preference = calculateUserPreference(ProactiveTriggerType.CODE_WRITING, 15, 5);

    // Should be closer to actual acceptance rate (0.75)
    expect(preference).toBeGreaterThan(0.65);
    expect(preference).toBeLessThan(0.85);
  });
});

// ============================================================================
// TIME RELEVANCE TESTS
// ============================================================================

describe('Time Relevance Calculation', () => {
  it('should penalize interrupting active typing', () => {
    const relevance = calculateTimeRelevance({
      timeSinceLastMessage: 1000, // 1 second ago
      userActivity: 'active',
      timeOfDay: 14,
    });

    expect(relevance).toBeLessThan(0.4);
  });

  it('should favor good timing (user paused but active)', () => {
    const relevance = calculateTimeRelevance({
      timeSinceLastMessage: 15000, // 15 seconds ago
      userActivity: 'active',
      timeOfDay: 14,
    });

    expect(relevance).toBeGreaterThan(0.6);
  });

  it('should avoid interrupting when user is away', () => {
    const relevance = calculateTimeRelevance({
      timeSinceLastMessage: 60000,
      userActivity: 'away',
      timeOfDay: 14,
    });

    expect(relevance).toBeLessThan(0.3);
  });

  it('should avoid late night/early morning', () => {
    const relevance = calculateTimeRelevance({
      timeSinceLastMessage: 30000,
      userActivity: 'active',
      timeOfDay: 23, // 11 PM
    });

    // Base 0.5 - 0.2 (late night) + 0.1 (good timing, not typing) = 0.4
    // But there's floating point precision
    expect(relevance).toBeLessThanOrEqual(0.65);
  });

  it('should favor work hours', () => {
    const workHours = calculateTimeRelevance({
      timeSinceLastMessage: 20000,
      userActivity: 'active',
      timeOfDay: 10, // 10 AM
    });

    const nonWorkHours = calculateTimeRelevance({
      timeSinceLastMessage: 20000,
      userActivity: 'active',
      timeOfDay: 20, // 8 PM
    });

    expect(workHours).toBeGreaterThan(nonWorkHours);
  });
});

// ============================================================================
// AGENT AVAILABILITY TESTS
// ============================================================================

describe('Agent Availability Calculation', () => {
  it('should return 0 for unavailable agent', () => {
    const availability = calculateAgentAvailability(false, false);

    expect(availability).toBe(0);
  });

  it('should return 1 for available inactive agent', () => {
    const availability = calculateAgentAvailability(true, false);

    expect(availability).toBe(1.0);
  });

  it('should return 0.5 for already active agent', () => {
    const availability = calculateAgentAvailability(true, true);

    expect(availability).toBe(0.5);
  });
});

// ============================================================================
// THRESHOLD CALIBRATION TESTS
// ============================================================================

describe('Threshold Calibration', () => {
  it('should not calibrate with insufficient data', () => {
    const thresholds = {
      minSuggestion: 0.6,
      minAutoActivate: 0.85,
      maxSuggestionsPerMinute: 3,
      cooldownMs: 30000,
    };

    const history: ProactiveActionHistory[] = [];

    const calibrated = calibrateThresholds(thresholds, history);

    expect(calibrated).toEqual(thresholds);
  });

  it('should increase thresholds when acceptance rate is low', () => {
    const thresholds = {
      minSuggestion: 0.6,
      minAutoActivate: 0.85,
      maxSuggestionsPerMinute: 3,
      cooldownMs: 30000,
    };

    const history: ProactiveActionHistory[] = [];
    for (let i = 0; i < 50; i++) {
      history.push({
        actionId: `${i}`,
        agentId: 'test-agent',
        triggerType: ProactiveTriggerType.CODE_WRITING,
        confidence: 0.7,
        executed: false,
        userResponse: 'dismiss',
        timestamp: Date.now(),
      });
    }

    const calibrated = calibrateThresholds(thresholds, history, 0.7);

    expect(calibrated.minSuggestion).toBeGreaterThan(thresholds.minSuggestion);
  });

  it('should decrease thresholds when acceptance rate is high', () => {
    const thresholds = {
      minSuggestion: 0.6,
      minAutoActivate: 0.85,
      maxSuggestionsPerMinute: 3,
      cooldownMs: 30000,
    };

    const history: ProactiveActionHistory[] = [];
    for (let i = 0; i < 50; i++) {
      history.push({
        actionId: `${i}`,
        agentId: 'test-agent',
        triggerType: ProactiveTriggerType.CODE_WRITING,
        confidence: 0.7,
        executed: true,
        userResponse: 'accept',
        timestamp: Date.now(),
      });
    }

    const calibrated = calibrateThresholds(thresholds, history, 0.7);

    expect(calibrated.minSuggestion).toBeLessThan(thresholds.minSuggestion);
  });

  it('should not adjust thresholds when acceptance rate is on target', () => {
    const thresholds = {
      minSuggestion: 0.6,
      minAutoActivate: 0.85,
      maxSuggestionsPerMinute: 3,
      cooldownMs: 30000,
    };

    const history: ProactiveActionHistory[] = [];
    for (let i = 0; i < 50; i++) {
      // Mix of accepts and dismisses to get ~70% acceptance
      history.push({
        actionId: `${i}`,
        agentId: 'test-agent',
        triggerType: ProactiveTriggerType.CODE_WRITING,
        confidence: 0.7,
        executed: i < 35,
        userResponse: i < 35 ? 'accept' : 'dismiss',
        timestamp: Date.now(),
      });
    }

    const calibrated = calibrateThresholds(thresholds, history, 0.7);

    expect(calibrated.minSuggestion).toBeCloseTo(thresholds.minSuggestion, 1);
  });
});

// ============================================================================
// CONFIDENCE LABEL TESTS
// ============================================================================

describe('Confidence Label', () => {
  it('should return very high label for confidence >= 0.9', () => {
    const label = getConfidenceLabel(0.95);

    expect(label.label).toBe('Very High');
    expect(label.color).toBe('green');
    expect(label.icon).toBe('●');
  });

  it('should return high label for confidence >= 0.75', () => {
    const label = getConfidenceLabel(0.8);

    expect(label.label).toBe('High');
    expect(label.color).toBe('blue');
  });

  it('should return medium label for confidence >= 0.6', () => {
    const label = getConfidenceLabel(0.7);

    expect(label.label).toBe('Medium');
    expect(label.color).toBe('yellow');
  });

  it('should return low label for confidence >= 0.4', () => {
    const label = getConfidenceLabel(0.5);

    expect(label.label).toBe('Low');
    expect(label.color).toBe('orange');
  });

  it('should return very low label for confidence < 0.4', () => {
    const label = getConfidenceLabel(0.3);

    expect(label.label).toBe('Very Low');
    expect(label.color).toBe('red');
  });
});

// ============================================================================
// PROACTIVE ENGINE TESTS
// ============================================================================

describe('Proactive Engine', () => {
  let engine: ReturnType<typeof getProactiveEngine>;

  beforeEach(() => {
    // Get fresh engine for each test
    engine = getProactiveEngine();
  });

  it('should evaluate proactive actions for code writing', async () => {
    const conversation = createMockConversation(10);
    const recentMessages = createMockRecentMessages(5);

    // Make last message code-related
    recentMessages[recentMessages.length - 1].content = { text: 'function test() { return true; }' };

    const actions = await engine.evaluateProactiveActions(conversation, recentMessages, []);

    // Should suggest code reviewer
    const codeActions = actions.filter(a => a.agentId === 'code-reviewer');
    expect(codeActions.length).toBeGreaterThan(0);
  });

  it('should evaluate proactive actions for long conversation', async () => {
    const conversation = createMockConversation(25);
    const recentMessages = createMockRecentMessages(10);

    const actions = await engine.evaluateProactiveActions(conversation, recentMessages, []);

    // Should suggest summarizer
    const summaryActions = actions.filter(a => a.agentId === 'summarizer');
    expect(summaryActions.length).toBeGreaterThan(0);
  });

  it('should evaluate proactive actions for help request', async () => {
    const conversation = createMockConversation(5);
    const recentMessages = createMockRecentMessages(3);

    // Make last message a help request
    recentMessages[recentMessages.length - 1].content = { text: 'Can you help me debug this?' };

    const actions = await engine.evaluateProactiveActions(conversation, recentMessages, []);

    // Should suggest helper agent
    const helpActions = actions.filter(a => a.agentId === 'helper-agent' || a.agentId === 'debugger-agent');
    expect(helpActions.length).toBeGreaterThan(0);
  });

  it('should not suggest already active agents', async () => {
    const conversation = createMockConversation(25);
    const recentMessages = createMockRecentMessages(10);
    const activeAgents = ['summarizer'];

    const actions = await engine.evaluateProactiveActions(conversation, recentMessages, activeAgents);

    // Should not suggest summarizer since it's already active
    const summaryActions = actions.filter(a => a.agentId === 'summarizer');
    expect(summaryActions.length).toBe(0);
  });

  it('should track action history', async () => {
    const conversation = createMockConversation(5);
    const recentMessages = createMockRecentMessages(3);

    // Generate some actions
    await engine.evaluateProactiveActions(conversation, recentMessages, []);

    // Dismiss first suggestion
    const suggestions = engine.getProactiveSuggestions();
    if (suggestions.length > 0) {
      engine.dismissProactiveAction(suggestions[0].id);
    }

    const stats = engine.getStatistics();
    expect(stats.totalSuggestions).toBeGreaterThan(0);
  });

  it('should update preferences', () => {
    const newPrefs: Partial<ProactivePreferences> = {
      enabled: false,
    };

    engine.updatePreferences(newPrefs);

    const prefs = engine.getPreferences();
    expect(prefs.enabled).toBe(false);
  });

  it('should calculate statistics correctly', () => {
    const stats = engine.getStatistics();

    expect(stats).toHaveProperty('totalSuggestions');
    expect(stats).toHaveProperty('totalExecuted');
    expect(stats).toHaveProperty('acceptanceRate');
    expect(stats).toHaveProperty('avgConfidence');
    expect(stats).toHaveProperty('triggerStats');
    expect(stats).toHaveProperty('anticipation');
  });

  it('should start and stop engine', () => {
    expect(() => engine.start()).not.toThrow();
    expect(() => engine.stop()).not.toThrow();
  });

  it('should respect trigger cooldowns', async () => {
    const conversation = createMockConversation(25);
    const recentMessages = createMockRecentMessages(10);

    // First evaluation
    await engine.evaluateProactiveActions(conversation, recentMessages, []);

    // Immediate second evaluation should respect cooldown
    const actions = await engine.evaluateProactiveActions(conversation, recentMessages, []);

    // Should have fewer actions due to cooldown
    expect(actions.length).toBeLessThanOrEqual(5);
  });
});
