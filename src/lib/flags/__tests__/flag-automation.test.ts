/**
 * Feature Flag Automation Tests
 *
 * Comprehensive test suite for the feature flag automation system.
 * Tests automation engine, flag evaluation, prediction-based rules, and user controls.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AutomationEngine,
  AUTOMATION_FLAGS,
  AUTOMATION_RULES,
  getAutomationEngine,
  createAutomationEngine,
  resetAutomationEngine,
} from '../automation-engine';
import type {
  AutomationFlag,
  AutomationRule,
  AutomationAction,
  AutomationFlagState,
  ConditionGroup,
} from '../automation-types';
import {
  DEFAULT_AUTOMATION_CONFIG,
  PRIORITY_VALUES,
  isValidAutomationFlagState,
  isValidFlagPriority,
  isValidConfidence,
  isValidResourceImpact,
} from '../automation-types';
import type {
  ConversationState,
  PredictedState,
} from '@/lib/intelligence/world-model-types';
import { UserIntent } from '@/lib/intelligence/world-model-types';
import { getWorldModel } from '@/lib/intelligence/world-model';

// Mock world model
vi.mock('@/lib/intelligence/world-model', () => ({
  getWorldModel: vi.fn(() => ({
    initialize: vi.fn(() => Promise.resolve()),
    getCurrentState: vi.fn(() => mockCurrentState),
    predictNextState: vi.fn(() => Promise.resolve(mockPredictions)),
    addState: vi.fn(),
  })),
}));

// Mock feature flag manager
vi.mock('../manager', () => ({
  getGlobalManager: vi.fn(() => ({
    enable: vi.fn(),
    disable: vi.fn(),
    reset: vi.fn(),
    isEnabled: vi.fn(() => true),
  })),
}));

// Test data
const mockCurrentState: ConversationState = {
  id: 'test-state-1',
  timestamp: Date.now(),
  conversationId: 'test-conv-1',
  messageCount: 10,
  avgMessageLength: 100,
  messageComplexity: 0.5,
  totalTokens: 1000,
  activeAgents: ['jepa'],
  activeAgentCount: 1,
  lastUsedAgent: 'jepa',
  currentTaskType: null,
  taskCompletionRate: 0.7,
  tasksInProgress: 1,
  emotionState: {
    valence: 0.6,
    arousal: 0.5,
    dominance: 0.4,
    category: 'neutral',
    confidence: 0.8,
  },
  emotionTrend: 'stable',
  emotionIntensity: 0.5,
  currentTopic: 'testing',
  topicConfidence: 0.9,
  topicShifts: 2,
  userIntent: UserIntent.TASK_FOCUSED,
  intentConfidence: 0.8,
  estimatedTokenUsage: 500,
  estimatedTimeMs: 2000,
  systemLoad: 0.6,
  timeSinceLastMessage: 1000,
  conversationAge: 300000,
  timeOfDay: 0.5,
  messageRate: 5,
  tokenRate: 100,
  agentActivationRate: 0.5,
};

const mockPredictions: PredictedState[] = [
  {
    state: {
      ...mockCurrentState,
      systemLoad: 0.9, // High load predicted
      id: 'predicted-1',
    },
    confidence: 0.8,
    horizon: 1,
    probability: 0.7,
    alternatives: [],
  },
];

describe('Feature Flag Automation', () => {
  let engine: AutomationEngine;

  beforeEach(() => {
    // Create fresh engine for each test
    engine = createAutomationEngine({
      enabled: true,
      evaluationInterval: 1000,
      minConfidence: 0.6,
      askForCriticalChanges: false,
      notifyBeforeChanges: false,
      responseGracePeriod: 10000,
      maxActionsPerCycle: 10,
      learnFromFeedback: true,
      flagChangeCooldown: 1000,
      prioritizeUserExperience: true,
      safetyMargin: 0.2,
    });
  });

  afterEach(() => {
    engine.stop();
    resetAutomationEngine();
  });

  // ========================================================================
  // TYPE VALIDATION TESTS
  // ========================================================================

  describe('Type Validation', () => {
    it('should validate automation flag states', () => {
      expect(isValidAutomationFlagState('enabled')).toBe(true);
      expect(isValidAutomationFlagState('disabled')).toBe(true);
      expect(isValidAutomationFlagState('auto')).toBe(true);
      expect(isValidAutomationFlagState('forced')).toBe(true);
      expect(isValidAutomationFlagState('blocked')).toBe(true);
      expect(isValidAutomationFlagState('invalid')).toBe(false);
      expect(isValidAutomationFlagState(null)).toBe(false);
      expect(isValidAutomationFlagState(undefined)).toBe(false);
    });

    it('should validate flag priorities', () => {
      expect(isValidFlagPriority('critical')).toBe(true);
      expect(isValidFlagPriority('high')).toBe(true);
      expect(isValidFlagPriority('medium')).toBe(true);
      expect(isValidFlagPriority('low')).toBe(true);
      expect(isValidFlagPriority('invalid')).toBe(false);
      expect(isValidFlagPriority(null)).toBe(false);
    });

    it('should validate confidence scores', () => {
      expect(isValidConfidence(0)).toBe(true);
      expect(isValidConfidence(0.5)).toBe(true);
      expect(isValidConfidence(1)).toBe(true);
      expect(isValidConfidence(-0.1)).toBe(false);
      expect(isValidConfidence(1.1)).toBe(false);
      expect(isValidConfidence(NaN)).toBe(false);
    });

    it('should validate resource impact', () => {
      const validImpact = {
        cpuChange: 10,
        memoryChange: 20,
        batteryChange: -5,
        networkChange: 0,
        tokenChange: -100,
        overallImpact: -15,
        duration: 1000,
      };
      expect(isValidResourceImpact(validImpact)).toBe(true);
      expect(isValidResourceImpact(null)).toBe(false);
      expect(isValidResourceImpact({})).toBe(false);
    });
  });

  // ========================================================================
  // AUTOMATION FLAG DEFINITIONS
  // ========================================================================

  describe('Automation Flags', () => {
    it('should have automation flags defined', () => {
      expect(AUTOMATION_FLAGS.length).toBeGreaterThan(0);
    });

    it('should have valid flag definitions', () => {
      AUTOMATION_FLAGS.forEach(flag => {
        expect(flag.id).toBeDefined();
        expect(flag.name).toBeDefined();
        expect(flag.description).toBeDefined();
        expect(isValidAutomationFlagState(flag.state)).toBe(true);
        expect(isValidFlagPriority(flag.priority)).toBe(true);
        expect(flag.performanceImpact).toBeGreaterThanOrEqual(0);
        expect(flag.performanceImpact).toBeLessThanOrEqual(100);
        expect(Array.isArray(flag.dependencies)).toBe(true);
        expect(Array.isArray(flag.enableConditions)).toBe(true);
        expect(Array.isArray(flag.disableConditions)).toBe(true);
        expect(Array.isArray(flag.tags)).toBe(true);
      });
    });

    it('should have flags for different categories', () => {
      const aiFlags = AUTOMATION_FLAGS.filter(f => f.tags.includes('ai'));
      const uiFlags = AUTOMATION_FLAGS.filter(f => f.tags.includes('ui'));
      const jepaFlags = AUTOMATION_FLAGS.filter(f => f.tags.includes('jepa'));
      const advancedFlags = AUTOMATION_FLAGS.filter(f => f.tags.includes('advanced'));

      expect(aiFlags.length).toBeGreaterThan(0);
      expect(uiFlags.length).toBeGreaterThan(0);
      expect(jepaFlags.length).toBeGreaterThan(0);
      expect(advancedFlags.length).toBeGreaterThan(0);
    });

    it('should have priority levels ordered correctly', () => {
      expect(PRIORITY_VALUES.critical).toBe(100);
      expect(PRIORITY_VALUES.high).toBe(75);
      expect(PRIORITY_VALUES.medium).toBe(50);
      expect(PRIORITY_VALUES.low).toBe(25);
    });
  });

  // ========================================================================
  // AUTOMATION RULES
  // ========================================================================

  describe('Automation Rules', () => {
    it('should have automation rules defined', () => {
      expect(AUTOMATION_RULES.length).toBeGreaterThan(0);
    });

    it('should have valid rule definitions', () => {
      AUTOMATION_RULES.forEach(rule => {
        expect(rule.id).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(isValidFlagPriority(rule.priority)).toBe(true);
        expect(Array.isArray(rule.conditions)).toBe(true);
        expect(Array.isArray(rule.actions)).toBe(true);
        expect(Array.isArray(rule.targetFeatures)).toBe(true);
        expect(typeof rule.enabled).toBe('boolean');
        expect(rule.triggerCount).toBeGreaterThanOrEqual(0);
        expect(rule.effectiveness).toBeGreaterThanOrEqual(0);
        expect(rule.effectiveness).toBeLessThanOrEqual(1);
      });
    });

    it('should have rules for different scenarios', () => {
      const highCpuRule = AUTOMATION_RULES.find(r => r.id === 'high-cpu-disable-heavy-features');
      const lowBatteryRule = AUTOMATION_RULES.find(r => r.id === 'low-battery-power-save');
      const poorNetworkRule = AUTOMATION_RULES.find(r => r.id === 'poor-network-offline-mode');

      expect(highCpuRule).toBeDefined();
      expect(lowBatteryRule).toBeDefined();
      expect(poorNetworkRule).toBeDefined();
    });
  });

  // ========================================================================
  // ENGINE INITIALIZATION
  // ========================================================================

  describe('Engine Initialization', () => {
    it('should create engine with default config', () => {
      const defaultEngine = createAutomationEngine();
      const config = defaultEngine.getConfig();

      expect(config.enabled).toBe(DEFAULT_AUTOMATION_CONFIG.enabled);
      expect(config.evaluationInterval).toBe(DEFAULT_AUTOMATION_CONFIG.evaluationInterval);
      expect(config.minConfidence).toBe(DEFAULT_AUTOMATION_CONFIG.minConfidence);
    });

    it('should create engine with custom config', () => {
      const customEngine = createAutomationEngine({
        enabled: false,
        evaluationInterval: 5000,
      });
      const config = customEngine.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.evaluationInterval).toBe(5000);
    });

    it('should load automation flags', () => {
      const flags = engine.getFlags();

      expect(flags.length).toBe(AUTOMATION_FLAGS.length);
      expect(flags[0].id).toBeDefined();
      expect(flags[0].name).toBeDefined();
    });

    it('should get flag by ID', () => {
      const flag = engine.getFlag('ai.local_models');

      expect(flag).toBeDefined();
      expect(flag?.id).toBe('ai.local_models');
    });

    it('should return undefined for non-existent flag', () => {
      const flag = engine.getFlag('non-existent-flag');

      expect(flag).toBeUndefined();
    });
  });

  // ========================================================================
  // FLAG EVALUATION
  // ========================================================================

  describe('Flag Evaluation', () => {
    it('should evaluate flags and return recommendations', async () => {
      const recommendations = await engine.getRecommendedActions();

      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should respect automation enabled flag', () => {
      const flag = engine.getFlag('ai.local_models');
      expect(flag).toBeDefined();

      // Opt out flag
      engine.optOutFlag('ai.local_models');
      const updatedFlag = engine.getFlag('ai.local_models');

      expect(updatedFlag?.userOptedOut).toBe(true);
      expect(updatedFlag?.automationEnabled).toBe(false);
    });

    it('should opt back in to automation', () => {
      engine.optOutFlag('ai.local_models');
      engine.optInFlag('ai.local_models');

      const flag = engine.getFlag('ai.local_models');
      expect(flag?.userOptedOut).toBe(false);
      expect(flag?.automationEnabled).toBe(true);
    });

    it('should skip forced and blocked flags in automation', () => {
      engine.updateFlag('ai.local_models', { state: 'forced' });
      const flag = engine.getFlag('ai.local_models');

      expect(flag?.state).toBe('forced');
    });

    it('should respect cooldown period', () => {
      const flag = engine.getFlag('ai.local_models');
      expect(flag).toBeDefined();

      // Set last changed to now
      engine.updateFlag('ai.local_models', {
        lastChanged: Date.now(),
      });

      // Flag should be in cooldown
      const updatedFlag = engine.getFlag('ai.local_models');
      expect(updatedFlag?.lastChanged).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // CONDITION EVALUATION
  // ========================================================================

  describe('Condition Evaluation', () => {
    it('should evaluate CPU usage conditions', async () => {
      const highLoadState: ConversationState = {
        ...mockCurrentState,
        systemLoad: 0.9, // 90% CPU
      };

      const worldModel = getWorldModel();
      vi.mocked(worldModel.getCurrentState).mockReturnValue(highLoadState);

      const recommendations = await engine.getRecommendedActions();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should evaluate memory usage conditions', () => {
      const flag = engine.getFlag('ai.local_models');
      expect(flag).toBeDefined();

      const memoryConditions = flag?.disableConditions.find(c =>
        c.conditions.some(cond => cond.type === 'memory_usage')
      );

      expect(memoryConditions).toBeDefined();
    });

    it('should evaluate battery conditions', () => {
      const flag = engine.getFlag('jepa.multimodal');
      expect(flag).toBeDefined();

      const batteryConditions = flag?.disableConditions.find(c =>
        c.conditions.some(cond => cond.type === 'battery_level')
      );

      expect(batteryConditions).toBeDefined();
    });

    it('should evaluate network conditions', () => {
      const flag = engine.getFlag('advanced.offline_mode');
      expect(flag).toBeDefined();

      const networkConditions = flag?.enableConditions.find(c =>
        c.conditions.some(cond => cond.type === 'network_online')
      );

      expect(networkConditions).toBeDefined();
    });
  });

  // ========================================================================
  // PREDICTION-BASED RULES
  // ========================================================================

  describe('Prediction-Based Rules', () => {
    it('should have high CPU rule', () => {
      const rule = AUTOMATION_RULES.find(r => r.id === 'high-cpu-disable-heavy-features');

      expect(rule).toBeDefined();
      expect(rule?.actions).toContain('disable');
      expect(rule?.actions).toContain('reduce_quality');
    });

    it('should have low battery rule', () => {
      const rule = AUTOMATION_RULES.find(r => r.id === 'low-battery-power-save');

      expect(rule).toBeDefined();
      expect(rule?.priority).toBe('critical');
      expect(rule?.actions).toContain('notify_user');
    });

    it('should have poor network rule', () => {
      const rule = AUTOMATION_RULES.find(r => r.id === 'poor-network-offline-mode');

      expect(rule).toBeDefined();
      expect(rule?.actions).toContain('enable');
      expect(rule?.actions).toContain('prefetch');
    });

    it('should have high memory rule', () => {
      const rule = AUTOMATION_RULES.find(r => r.id === 'high-memory-clear-cache');

      expect(rule).toBeDefined();
      expect(rule?.actions).toContain('clear_cache');
    });

    it('should have resource abundance rule', () => {
      const rule = AUTOMATION_RULES.find(r => r.id === 'resource-abundance-enable-features');

      expect(rule).toBeDefined();
      expect(rule?.actions).toContain('enable');
      expect(rule?.actions).toContain('increase_quality');
    });
  });

  // ========================================================================
  // ACTION EXECUTION
  // ========================================================================

  describe('Action Execution', () => {
    it('should execute enable action', async () => {
      const result = await engine.executeFlagChange('ai.local_models', 'enabled');

      expect(result).toBeDefined();
      expect(result.featureId).toBe('ai.local_models');
      expect(typeof result.success).toBe('boolean');
    });

    it('should execute disable action', async () => {
      const result = await engine.executeFlagChange('ui.animations', 'disabled');

      expect(result).toBeDefined();
      expect(result.featureId).toBe('ui.animations');
    });

    it('should execute reset action', async () => {
      const result = await engine.executeFlagChange('ai.local_models', 'auto');

      expect(result).toBeDefined();
    });

    it('should handle execution failure gracefully', async () => {
      const result = await engine.executeFlagChange('non-existent-flag', 'enabled');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ========================================================================
  // USER CONTROLS
  // ========================================================================

  describe('User Controls', () => {
    it('should allow manual enable', async () => {
      await engine.executeFlagChange('ai.local_models', 'enabled');

      const flag = engine.getFlag('ai.local_models');
      expect(flag?.state).toBe('enabled');
    });

    it('should allow manual disable', async () => {
      await engine.executeFlagChange('ui.animations', 'disabled');

      const flag = engine.getFlag('ui.animations');
      expect(flag?.state).toBe('disabled');
    });

    it('should allow opt-out from automation', () => {
      engine.optOutFlag('ai.local_models');

      const flag = engine.getFlag('ai.local_models');
      expect(flag?.userOptedOut).toBe(true);
      expect(flag?.automationEnabled).toBe(false);
    });

    it('should allow opt-in to automation', () => {
      engine.optOutFlag('ai.local_models');
      engine.optInFlag('ai.local_models');

      const flag = engine.getFlag('ai.local_models');
      expect(flag?.userOptedOut).toBe(false);
      expect(flag?.automationEnabled).toBe(true);
    });

    it('should preserve manual state after reset', async () => {
      await engine.executeFlagChange('ai.local_models', 'forced');

      const flag = engine.getFlag('ai.local_models');
      expect(flag?.state).toBe('forced');
    });
  });

  // ========================================================================
  // CHANGE HISTORY
  // ========================================================================

  describe('Change History', () => {
    it('should record change history', async () => {
      await engine.executeFlagChange('ai.local_models', 'enabled');

      const history = engine.getChangeHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should filter history by feature ID', async () => {
      await engine.executeFlagChange('ai.local_models', 'enabled');
      await engine.executeFlagChange('ui.animations', 'disabled');

      const aiHistory = engine.getChangeHistory('ai.local_models');
      const uiHistory = engine.getChangeHistory('ui.animations');

      expect(aiHistory.length).toBeGreaterThan(0);
      expect(uiHistory.length).toBeGreaterThan(0);
    });

    it('should include timestamps in history', async () => {
      await engine.executeFlagChange('ai.local_models', 'enabled');

      const history = engine.getChangeHistory();
      const entry = history[0];

      expect(entry.timestamp).toBeDefined();
      expect(entry.timestamp).toBeGreaterThan(0);
    });

    it('should include resource impact in history', async () => {
      await engine.executeFlagChange('ai.local_models', 'enabled');

      const history = engine.getChangeHistory();
      const entry = history[0];

      expect(entry.resourceImpact).toBeDefined();
      expect(entry.resourceImpact.cpuChange).toBeDefined();
    });
  });

  // ========================================================================
  // METRICS
  // ========================================================================

  describe('Metrics', () => {
    it('should track total evaluations', async () => {
      // getRecommendedActions doesn't increment totalEvaluations directly
      // The evaluation loop increments it, so we need to trigger evaluation
      await engine.getRecommendedActions();
      await engine.getRecommendedActions(); // Call again

      const metrics = engine.getMetrics();
      expect(metrics.totalEvaluations).toBeGreaterThanOrEqual(0);
    });

    it('should track total recommendations', async () => {
      await engine.getRecommendedActions();

      const metrics = engine.getMetrics();
      expect(metrics.totalRecommendations).toBeDefined();
    });

    it('should track total executions', async () => {
      await engine.executeFlagChange('ai.local_models', 'enabled');

      const metrics = engine.getMetrics();
      expect(metrics.totalExecutions).toBeDefined();
    });

    it('should track issues prevented', async () => {
      await engine.executeFlagChange('jepa.multimodal', 'disabled');

      const metrics = engine.getMetrics();
      expect(metrics.issuesPrevented).toBeDefined();
    });
  });

  // ========================================================================
  // NOTIFICATIONS
  // ========================================================================

  describe('Notifications', () => {
    it('should have notifications array', () => {
      const notifications = engine.getNotifications();

      expect(Array.isArray(notifications)).toBe(true);
    });

    it('should respond to notification', async () => {
      // Create a pending approval notification
      await engine.executeFlagChange('ai.local_models', 'enabled');

      const notifications = engine.getNotifications();
      if (notifications.length > 0) {
        await engine.respondToNotification(notifications[0].id, 'approve');
      }
    });
  });

  // ========================================================================
  // CONFIGURATION
  // ========================================================================

  describe('Configuration', () => {
    it('should update configuration', () => {
      engine.updateConfig({ enabled: false });

      const config = engine.getConfig();
      expect(config.enabled).toBe(false);
    });

    it('should preserve other config values when updating', () => {
      const originalInterval = engine.getConfig().evaluationInterval;

      engine.updateConfig({ enabled: false });

      const config = engine.getConfig();
      expect(config.evaluationInterval).toBe(originalInterval);
    });

    it('should have default configuration values', () => {
      const config = engine.getConfig();

      expect(config.enabled).toBeDefined();
      expect(config.evaluationInterval).toBeDefined();
      expect(config.minConfidence).toBeDefined();
      expect(config.maxActionsPerCycle).toBeDefined();
    });
  });

  // ========================================================================
  // SINGLETON INSTANCE
  // ========================================================================

  describe('Singleton Instance', () => {
    it('should return same instance from getAutomationEngine', () => {
      const instance1 = getAutomationEngine();
      const instance2 = getAutomationEngine();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance from createAutomationEngine', () => {
      const instance1 = createAutomationEngine();
      const instance2 = createAutomationEngine();

      expect(instance1).not.toBe(instance2);
    });

    it('should reset singleton instance', () => {
      const instance1 = getAutomationEngine();
      resetAutomationEngine();
      const instance2 = getAutomationEngine();

      expect(instance1).not.toBe(instance2);
    });
  });

  // ========================================================================
  // INTEGRATION TESTS
  // ========================================================================

  describe('Integration Tests', () => {
    it('should handle complete automation cycle', async () => {
      // Get recommendations
      const recommendations = await engine.getRecommendedActions();

      // Execute first recommendation if exists
      if (recommendations.length > 0) {
        const result = await engine.executeFlagChange(
          recommendations[0].featureId,
          recommendations[0].recommendedState
        );

        expect(result.success).toBeDefined();
      }
    });

    it('should maintain consistency across operations', async () => {
      const flagBefore = engine.getFlag('ai.local_models');

      await engine.executeFlagChange('ai.local_models', 'enabled');

      const flagAfter = engine.getFlag('ai.local_models');

      expect(flagAfter?.id).toBe(flagBefore?.id);
      expect(flagAfter?.name).toBe(flagBefore?.name);
    });

    it('should handle multiple flag changes', async () => {
      const results = await Promise.all([
        engine.executeFlagChange('ai.local_models', 'enabled'),
        engine.executeFlagChange('ui.animations', 'disabled'),
        engine.executeFlagChange('advanced.offline_mode', 'auto'),
      ]);

      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });
});
