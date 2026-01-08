/**
 * Proactive Notifications System Tests
 *
 * Comprehensive test suite covering notification triggers, timing,
 * user preferences, feedback learning, and effectiveness metrics.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ProactiveNotificationEngine,
  getNotificationEngine,
  createNotificationEngine,
} from '../proactive-notifications';
import {
  calculateNotificationTiming,
  isInQuietHours,
  getTimeOfDayMultiplier,
  UserActivityTracker,
  batchNotifications,
} from '../notification-timing';
import type {
  ProactiveNotification,
  NotificationUrgency,
  NotificationTrigger,
  UserActivityContext,
  NotificationSettings,
  NotificationPreferences,
} from '../types';
import {
  NotificationTrigger as Trigger,
  ALL_NOTIFICATION_TRIGGERS,
  NotificationUrgency as Urgency,
  NotificationStatus as Status,
  NotificationCategory as Category,
  NotificationActionType,
  DEFAULT_NOTIFICATION_SETTINGS,
  getDefaultNotificationPreferences,
} from '../types';
import type {
  ConversationState,
  AgentNeedPrediction,
  ResourcePrediction,
  AnomalyDetection,
} from '@/lib/intelligence/world-model-types';
import { UserIntent } from '@/lib/intelligence/world-model-types';
import type { TaskType } from '@/lib/agents/performance-types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockConversationState(overrides?: Partial<ConversationState>): ConversationState {
  return {
    id: 'state-1',
    timestamp: Date.now(),
    conversationId: 'conv-1',
    messageCount: 50,
    avgMessageLength: 100,
    messageComplexity: 0.5,
    totalTokens: 5000,
    activeAgents: ['agent-1'],
    activeAgentCount: 1,
    lastUsedAgent: 'agent-1',
    currentTaskType: 'analysis' as TaskType,
    taskCompletionRate: 0.5,
    tasksInProgress: 2,
    emotionState: {
      valence: 0.5,
      arousal: 0.5,
      dominance: 0.5,
      category: 'neutral',
      confidence: 0.8,
    },
    emotionTrend: 'stable',
    emotionIntensity: 0.5,
    currentTopic: 'work',
    topicConfidence: 0.7,
    topicShifts: 3,
    userIntent: UserIntent.TASK_FOCUSED,
    intentConfidence: 0.8,
    estimatedTokenUsage: 1000,
    estimatedTimeMs: 5000,
    systemLoad: 0.5,
    timeSinceLastMessage: 60000,
    conversationAge: 300000,
    timeOfDay: 0.5,
    messageRate: 5,
    tokenRate: 100,
    agentActivationRate: 0.5,
    ...overrides,
  };
}

function createMockUserActivityContext(overrides?: Partial<UserActivityContext>): UserActivityContext {
  return {
    isTyping: false,
    timeSinceLastAction: 10000,
    conversationId: 'conv-1',
    hasActiveOperation: false,
    timeOfDay: 0.5,
    appFocused: true,
    recentNotificationCount: 2,
    inQuietHours: false,
    ...overrides,
  };
}

function createMockNotification(
  trigger: NotificationTrigger,
  urgency: NotificationUrgency,
  overrides?: Partial<ProactiveNotification>
): ProactiveNotification {
  return {
    id: `notif-${trigger}-${Date.now()}`,
    trigger,
    title: 'Test Notification',
    message: 'This is a test notification',
    urgency,
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600000,
    status: Status.PENDING,
    confidence: 0.8,
    timeframe: 300000,
    impact: 'Test impact',
    actions: [],
    shownCount: 0,
    category: Category.SYSTEM,
    requiresAction: false,
    ...overrides,
  };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('ProactiveNotificationEngine', () => {
  let engine: ProactiveNotificationEngine;

  beforeEach(() => {
    engine = createNotificationEngine({
      enabled: true,
      quietHours: { enabled: false, start: 22, end: 8 },
    });
  });

  describe('Constructor & Initialization', () => {
    it('should create engine with default settings', () => {
      const settings = engine.getSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.quietHours.enabled).toBe(false);
      expect(settings.maxNotificationsPerHour).toBe(10);
    });

    it('should create engine with custom settings', () => {
      const customEngine = createNotificationEngine({
        enabled: false,
        maxNotificationsPerHour: 5,
      });
      const settings = customEngine.getSettings();
      expect(settings.enabled).toBe(false);
      expect(settings.maxNotificationsPerHour).toBe(5);
    });

    it('should initialize preferences for all trigger types', () => {
      const settings = engine.getSettings();
      ALL_NOTIFICATION_TRIGGERS.forEach(trigger => {
        expect(settings.preferences[trigger]).toBeDefined();
      });
    });
  });

  describe('Performance Trigger Evaluation', () => {
    it('should trigger HIGH_CPU_PREDICTED when system load is high', async () => {
      const state = createMockConversationState({ systemLoad: 0.85 });
      const context = createMockUserActivityContext();

      const notifications = await engine['evaluatePerformanceTriggers'](state, context);

      const cpuNotification = notifications.find(n => n.trigger === Trigger.HIGH_CPU_PREDICTED);
      expect(cpuNotification).toBeDefined();
      expect(cpuNotification?.urgency).toBe(Urgency.MEDIUM);
      expect(cpuNotification?.confidence).toBeGreaterThan(0.7);
    });

    it('should trigger HIGH_MEMORY_PREDICTED when system load is very high', async () => {
      const state = createMockConversationState({ systemLoad: 0.9 });
      const context = createMockUserActivityContext();

      const notifications = await engine['evaluatePerformanceTriggers'](state, context);

      const memoryNotification = notifications.find(n => n.trigger === Trigger.HIGH_MEMORY_PREDICTED);
      expect(memoryNotification).toBeDefined();
      expect(memoryNotification?.urgency).toBe(Urgency.MEDIUM);
    });

    it('should trigger PERFORMANCE_DEGRADING when system load is moderate', async () => {
      const state = createMockConversationState({ systemLoad: 0.75 });
      const context = createMockUserActivityContext();

      const notifications = await engine['evaluatePerformanceTriggers'](state, context);

      const perfNotification = notifications.find(n => n.trigger === Trigger.PERFORMANCE_DEGRADING);
      expect(perfNotification).toBeDefined();
      expect(perfNotification?.urgency).toBe(Urgency.LOW);
    });

    it('should not trigger performance notifications when system load is low', async () => {
      const state = createMockConversationState({ systemLoad: 0.5 });
      const context = createMockUserActivityContext();

      const notifications = await engine['evaluatePerformanceTriggers'](state, context);

      expect(notifications.length).toBe(0);
    });
  });

  describe('Resource Trigger Evaluation', () => {
    it('should trigger STORAGE_FULL_PREDICTED when storage is high', async () => {
      const state = createMockConversationState();
      const context = createMockUserActivityContext();

      // Mock getStorageUsage
      vi.spyOn(engine as any, 'getStorageUsage').mockResolvedValue(0.9);

      const notifications = await engine['evaluateResourceTriggers'](state, context);

      const storageNotification = notifications.find(n => n.trigger === Trigger.STORAGE_FULL_PREDICTED);
      expect(storageNotification).toBeDefined();
      expect(storageNotification?.urgency).toBe(Urgency.HIGH);
    });

    it('should trigger TOKEN_USAGE_HIGH when token usage is high', async () => {
      const state = createMockConversationState({ estimatedTokenUsage: 15000 });
      const context = createMockUserActivityContext();

      const notifications = await engine['evaluateResourceTriggers'](state, context);

      const tokenNotification = notifications.find(n => n.trigger === Trigger.TOKEN_USAGE_HIGH);
      expect(tokenNotification).toBeDefined();
      expect(tokenNotification?.urgency).toBe(Urgency.LOW);
    });
  });

  describe('Agent Trigger Evaluation', () => {
    it('should trigger AGENT_NEEDED_SOON for high-probability agent needs', async () => {
      const agentNeeds: AgentNeedPrediction[] = [
        {
          agentId: 'jepa',
          probability: 0.8,
          timeframe: 300000,
          confidence: 0.7,
          reason: 'Emotion analysis needed',
        },
      ];
      const context = createMockUserActivityContext();

      const notifications = await engine['evaluateAgentTriggers'](agentNeeds, context);

      const agentNotification = notifications.find(n => n.trigger === Trigger._AGENT_NEEDED_SOON);
      expect(agentNotification).toBeDefined();
      expect(agentNotification?.urgency).toBe(Urgency.LOW);
    });

    it('should not trigger for low-probability agent needs', async () => {
      const agentNeeds: AgentNeedPrediction[] = [
        {
          agentId: 'jepa',
          probability: 0.5,
          timeframe: 300000,
          confidence: 0.7,
          reason: 'Maybe needed',
        },
      ];
      const context = createMockUserActivityContext();

      const notifications = await engine['evaluateAgentTriggers'](agentNeeds, context);

      expect(notifications.length).toBe(0);
    });
  });

  describe('Context Trigger Evaluation', () => {
    it('should trigger CONTEXT_TOO_LONG for long conversations', async () => {
      const state = createMockConversationState({
        messageCount: 150,
        totalTokens: 60000,
      });
      const context = createMockUserActivityContext();

      const notifications = await engine['evaluateContextTriggers'](state, context);

      const contextNotification = notifications.find(n => n.trigger === Trigger.CONTEXT_TOO_LONG);
      expect(contextNotification).toBeDefined();
      expect(contextNotification?.urgency).toBe(Urgency.MEDIUM);
    });

    it('should not trigger CONTEXT_TOO_LONG for short conversations', async () => {
      const state = createMockConversationState({
        messageCount: 50,
        totalTokens: 5000,
      });
      const context = createMockUserActivityContext();

      const notifications = await engine['evaluateContextTriggers'](state, context);

      expect(notifications.length).toBe(0);
    });
  });

  describe('User State Trigger Evaluation', () => {
    it('should trigger USER_FRUSTRATION_DETECTED for frustrated users', async () => {
      const state = createMockConversationState({
        userIntent: UserIntent.STRUGGLING,
        emotionState: {
          valence: 0.2,
          arousal: 0.7,
          dominance: 0.3,
          category: 'frustrated',
          confidence: 0.8,
        },
      });
      const context = createMockUserActivityContext();

      const notifications = await engine['evaluateUserStateTriggers'](state, context);

      const frustrationNotification = notifications.find(n => n.trigger === Trigger.USER_FRUSTRATION_DETECTED);
      expect(frustrationNotification).toBeDefined();
      expect(frustrationNotification?.urgency).toBe(Urgency.LOW);
    });

    it('should trigger INACTIVITY_TIMEOUT for inactive users', async () => {
      const state = createMockConversationState({
        timeSinceLastMessage: 40 * 60 * 1000, // 40 minutes
      });
      const context = createMockUserActivityContext();

      const notifications = await engine['evaluateUserStateTriggers'](state, context);

      const inactivityNotification = notifications.find(n => n.trigger === Trigger.INACTIVITY_TIMEOUT);
      expect(inactivityNotification).toBeDefined();
    });
  });

  describe('Anomaly Trigger Evaluation', () => {
    it('should trigger ERROR_RECOVERY for high-severity anomalies', async () => {
      const anomalies: AnomalyDetection[] = [
        {
          isAnomaly: true,
          type: 'resource_anomaly' as any,
          severity: 0.9,
          description: 'Unusual resource usage',
          suggestions: ['Reduce load', 'Clear cache'],
          confidence: 0.8,
        },
      ];
      const context = createMockUserActivityContext();

      const notifications = await engine['evaluateAnomalyTriggers'](anomalies, context);

      const anomalyNotification = notifications.find(n => n.trigger === Trigger.ERROR_RECOVERY_SUGGESTION);
      expect(anomalyNotification).toBeDefined();
      expect(anomalyNotification?.urgency).toBe(Urgency.HIGH);
    });

    it('should not trigger for low-severity anomalies', async () => {
      const anomalies: AnomalyDetection[] = [
        {
          isAnomaly: true,
          type: 'resource_anomaly' as any,
          severity: 0.3,
          description: 'Minor anomaly',
          suggestions: ['Monitor'],
          confidence: 0.5,
        },
      ];
      const context = createMockUserActivityContext();

      const notifications = await engine['evaluateAnomalyTriggers'](anomalies, context);

      expect(notifications.length).toBe(0);
    });
  });

  describe('Notification Queue', () => {
    it('should return pending notifications', () => {
      const notification = createMockNotification(Trigger.HIGH_CPU_PREDICTED, Urgency.MEDIUM);
      engine['notificationQueue'].set(notification.id, notification);

      const pending = engine.getPendingNotifications();

      expect(pending.length).toBeGreaterThan(0);
      expect(pending[0].notification.id).toBe(notification.id);
    });

    it('should not return expired notifications', () => {
      const notification = createMockNotification(Trigger.HIGH_CPU_PREDICTED, Urgency.MEDIUM, {
        expiresAt: Date.now() - 1000, // Expired
      });
      engine['notificationQueue'].set(notification.id, notification);

      const pending = engine.getPendingNotifications();

      expect(pending.find(e => e.notification.id === notification.id)).toBeUndefined();
    });

    it('should filter by user preferences', () => {
      const notification = createMockNotification(Trigger.HIGH_CPU_PREDICTED, Urgency.MEDIUM);
      engine['notificationQueue'].set(notification.id, notification);

      // Disable this trigger type
      engine.updateSettings({
        preferences: {
          ...engine.getSettings().preferences,
          [Trigger.HIGH_CPU_PREDICTED]: {
            ...engine.getSettings().preferences[Trigger.HIGH_CPU_PREDICTED],
            enabled: false,
          },
        },
      });

      const pending = engine.getPendingNotifications();

      expect(pending.find(e => e.notification.id === notification.id)).toBeUndefined();
    });
  });

  describe('Queue Statistics', () => {
    it('should calculate queue stats correctly', () => {
      const notifications = [
        createMockNotification(Trigger.HIGH_CPU_PREDICTED, Urgency.HIGH),
        createMockNotification(Trigger.HIGH_MEMORY_PREDICTED, Urgency.MEDIUM),
        createMockNotification(Trigger.STORAGE_FULL_PREDICTED, Urgency.LOW),
      ];

      notifications.forEach(n => engine['notificationQueue'].set(n.id, n));

      const stats = engine.getQueueStats();

      expect(stats.totalPending).toBe(3);
      expect(stats.byUrgency.high).toBe(1);
      expect(stats.byUrgency.medium).toBe(1);
      expect(stats.byUrgency.low).toBe(1);
      expect(stats.avgConfidence).toBeCloseTo(0.8, 1);
    });
  });

  describe('Notification Actions', () => {
    it('should dismiss notification', () => {
      const notification = createMockNotification(Trigger.HIGH_CPU_PREDICTED, Urgency.MEDIUM);
      engine['notificationQueue'].set(notification.id, notification);

      engine.dismissNotification(notification.id);

      expect(notification.status).toBe(Status.DISMISSED);
      expect(engine['notificationQueue'].has(notification.id)).toBe(false);
    });

    it('should execute action', async () => {
      const notification = createMockNotification(Trigger.HIGH_CPU_PREDICTED, Urgency.MEDIUM, {
        actions: [
          {
            id: 'action-1',
            type: 'clear_cache' as any,
            label: 'Clear Cache',
            primary: true,
          },
        ],
      });
      engine['notificationQueue'].set(notification.id, notification);

      await engine.executeAction(notification.id, 'action-1');

      expect(notification.status).toBe(Status.ACCEPTED);
      expect(notification.feedback?.helpful).toBe(true);
      expect(notification.feedback?.actionTaken).toBe('clear_cache');
    });

    it('should snooze notification', () => {
      const notification = createMockNotification(Trigger.HIGH_CPU_PREDICTED, Urgency.MEDIUM);
      engine['notificationQueue'].set(notification.id, notification);

      engine.snoozeNotification(notification.id, 60000);

      expect(notification.status).toBe(Status.SNOOZED);
    });
  });

  describe('Settings Management', () => {
    it('should update settings', () => {
      engine.updateSettings({
        enabled: false,
        maxNotificationsPerHour: 20,
      });

      const settings = engine.getSettings();
      expect(settings.enabled).toBe(false);
      expect(settings.maxNotificationsPerHour).toBe(20);
    });

    it('should maintain other settings when updating', () => {
      const originalQuietHours = engine.getSettings().quietHours;

      engine.updateSettings({
        enabled: false,
      });

      expect(engine.getSettings().quietHours).toEqual(originalQuietHours);
    });
  });

  describe('Effectiveness Metrics', () => {
    it('should calculate metrics correctly', () => {
      const notification = createMockNotification(Trigger.HIGH_CPU_PREDICTED, Urgency.MEDIUM);
      notification.status = Status.ACCEPTED;
      notification.lastShown = Date.now();
      notification.feedback = {
        helpful: true,
        timestamp: Date.now(),
        actionTaken: NotificationActionType.CLEAR_CACHE,
      };

      engine['recordHistory'](notification);

      const metrics = engine.getEffectivenessMetrics();

      expect(metrics.totalShown).toBe(1);
      expect(metrics.totalActedUpon).toBe(1);
      expect(metrics.actionRate).toBe(1);
    });
  });
});

describe('Notification Timing System', () => {
  describe('calculateNotificationTiming', () => {
    it('should show critical notifications immediately', () => {
      const notification = createMockNotification(Trigger.ERROR_RECOVERY_SUGGESTION, Urgency.CRITICAL);
      const context = createMockUserActivityContext();

      const timing = calculateNotificationTiming(notification, context);

      expect(timing.showNow).toBe(true);
      expect(timing.confidence).toBeGreaterThan(0.5);
    });

    it('should wait when user is typing', () => {
      const notification = createMockNotification(Trigger.HIGH_CPU_PREDICTED, Urgency.MEDIUM);
      const context = createMockUserActivityContext({
        isTyping: true,
        timeSinceLastAction: 1000,
      });

      const timing = calculateNotificationTiming(notification, context);

      expect(timing.showNow).toBe(false);
      expect(timing.reason).toContain('typing');
    });

    it('should wait during quiet hours for non-critical notifications', () => {
      const notification = createMockNotification(Trigger.FEATURE_SUGGESTION, Urgency.LOW);
      const context = createMockUserActivityContext({
        inQuietHours: true,
      });

      const timing = calculateNotificationTiming(notification, context);

      expect(timing.showNow).toBe(false);
      expect(timing.reason).toContain('quiet hours');
    });

    it('should show immediately after user pauses', () => {
      const notification = createMockNotification(Trigger.HIGH_CPU_PREDICTED, Urgency.MEDIUM);
      const context = createMockUserActivityContext({
        timeSinceLastAction: 5000, // 5 seconds pause
      });

      const timing = calculateNotificationTiming(notification, context);

      expect(timing.showNow).toBe(true);
    });

    it('should limit notification frequency', () => {
      const notification = createMockNotification(Trigger.FEATURE_SUGGESTION, Urgency.LOW);
      const context = createMockUserActivityContext({
        recentNotificationCount: 6,
      });

      const timing = calculateNotificationTiming(notification, context);

      expect(timing.showNow).toBe(false);
      expect(timing.reason.toLowerCase()).toContain('too many');
    });
  });

  describe('isInQuietHours', () => {
    it('should detect quiet hours correctly', () => {
      // 23:00 is within 22:00-08:00
      expect(isInQuietHours(23, 22, 8)).toBe(true);

      // 03:00 is within 22:00-08:00
      expect(isInQuietHours(3, 22, 8)).toBe(true);

      // 10:00 is outside 22:00-08:00
      expect(isInQuietHours(10, 22, 8)).toBe(false);
    });

    it('should handle same-day quiet hours', () => {
      // Quiet hours: 01:00-06:00
      expect(isInQuietHours(3, 1, 6)).toBe(true);
      expect(isInQuietHours(10, 1, 6)).toBe(false);
    });
  });

  describe('getTimeOfDayMultiplier', () => {
    it('should return low multiplier for early morning', () => {
      expect(getTimeOfDayMultiplier(3)).toBeLessThan(0.5);
    });

    it('should return high multiplier for work hours', () => {
      expect(getTimeOfDayMultiplier(10)).toBeGreaterThanOrEqual(0.8);
    });

    it('should return moderate multiplier for evening', () => {
      expect(getTimeOfDayMultiplier(19)).toBeGreaterThan(0.5);
      expect(getTimeOfDayMultiplier(19)).toBeLessThan(1);
    });
  });

  describe('UserActivityTracker', () => {
    it('should track user actions', () => {
      const tracker = new UserActivityTracker();

      tracker.recordAction();

      const context = tracker.getContext(
        { enabled: false, start: 22, end: 8 },
        true
      );

      expect(context.timeSinceLastAction).toBeLessThan(100);
    });

    it('should track typing state', () => {
      const tracker = new UserActivityTracker();

      tracker.startTyping();
      let context = tracker.getContext(
        { enabled: false, start: 22, end: 8 },
        true
      );
      expect(context.isTyping).toBe(true);

      tracker.stopTyping();
      context = tracker.getContext(
        { enabled: false, start: 22, end: 8 },
        true
      );
      expect(context.isTyping).toBe(false);
    });

    it('should track operations', () => {
      const tracker = new UserActivityTracker();

      tracker.startOperation();
      let context = tracker.getContext(
        { enabled: false, start: 22, end: 8 },
        true
      );
      expect(context.hasActiveOperation).toBe(true);

      tracker.endOperation();
      context = tracker.getContext(
        { enabled: false, start: 22, end: 8 },
        true
      );
      expect(context.hasActiveOperation).toBe(false);
    });

    it('should track notification history', () => {
      const tracker = new UserActivityTracker();

      tracker.recordNotification();
      tracker.recordNotification();
      tracker.recordNotification();

      expect(tracker.getRecentNotificationCount()).toBe(3);
    });

    it('should clean up old notifications', () => {
      const tracker = new UserActivityTracker();

      // Record notifications
      for (let i = 0; i < 5; i++) {
        tracker.recordNotification();
      }

      // Manually set some notifications to old
      tracker['state'].recentNotifications[0] = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
      tracker['state'].recentNotifications[1] = Date.now() - (90 * 60 * 1000); // 90 minutes ago

      // Get count should only include recent ones (< 1 hour)
      const recentCount = tracker.getRecentNotificationCount();
      expect(recentCount).toBeLessThan(5);
      expect(recentCount).toBeGreaterThan(0);
    });
  });

  describe('batchNotifications', () => {
    it('should batch critical notifications individually', () => {
      const notifications = [
        createMockNotification(Trigger.ERROR_RECOVERY_SUGGESTION, Urgency.CRITICAL),
        createMockNotification(Trigger.STORAGE_FULL_PREDICTED, Urgency.CRITICAL),
      ];
      const context = createMockUserActivityContext();

      const batches = batchNotifications(notifications, context, 3, 300000);

      expect(batches).toHaveLength(2);
      expect(batches[0].notifications).toHaveLength(1);
      expect(batches[0].reason).toContain('Critical');
    });

    it('should batch medium/low urgency notifications together', () => {
      const notifications = [
        createMockNotification(Trigger.FEATURE_SUGGESTION, Urgency.LOW),
        createMockNotification(Trigger.OPTIMIZATION_SUGGESTION, Urgency.LOW),
        createMockNotification(Trigger.BACKUP_NEEDED, Urgency.MEDIUM),
      ];
      const context = createMockUserActivityContext();

      const batches = batchNotifications(notifications, context, 3, 300000);

      // Should be batched by category
      expect(batches.length).toBeGreaterThan(0);
    });
  });
});

describe('Notification Types & Utilities', () => {
  describe('getDefaultNotificationPreferences', () => {
    it('should create default preferences for trigger', () => {
      const prefs = getDefaultNotificationPreferences(Trigger.HIGH_CPU_PREDICTED);

      expect(prefs.enabled).toBe(true);
      expect(prefs.minUrgency).toBe(Urgency.LOW);
      expect(prefs.allowDuringQuietHours).toBe(false);
      expect(prefs.helpfulnessScore).toBe(0);
      expect(prefs.actionCount).toBe(0);
    });
  });

  describe('DEFAULT_NOTIFICATION_SETTINGS', () => {
    it('should have all required settings', () => {
      expect(DEFAULT_NOTIFICATION_SETTINGS.enabled).toBeDefined();
      expect(DEFAULT_NOTIFICATION_SETTINGS.quietHours).toBeDefined();
      expect(DEFAULT_NOTIFICATION_SETTINGS.maxNotificationsPerHour).toBe(10);
      expect(DEFAULT_NOTIFICATION_SETTINGS.batchLowUrgency).toBe(true);
      expect(DEFAULT_NOTIFICATION_SETTINGS.enableLearning).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  it('should handle complete notification workflow', async () => {
    const engine = createNotificationEngine();
    const state = createMockConversationState({ systemLoad: 0.85 });
    const context = createMockUserActivityContext();

    // Evaluate notifications
    const notifications = await engine.evaluateNotifications();

    // Should generate notifications
    expect(notifications.length).toBeGreaterThan(0);

    // Get pending
    const pending = engine.getPendingNotifications();
    expect(pending.length).toBeGreaterThan(0);

    // Dismiss one
    const first = pending[0].notification;
    engine.dismissNotification(first.id);

    // Should be removed from queue
    const pendingAfter = engine.getPendingNotifications();
    expect(pendingAfter.find(e => e.notification.id === first.id)).toBeUndefined();

    // Should be in history
    const history = engine.getHistory();
    expect(history.find(h => h.id === first.id)).toBeDefined();
  });

  it('should learn from user feedback', async () => {
    const engine = createNotificationEngine();
    const notification = createMockNotification(Trigger.HIGH_CPU_PREDICTED, Urgency.MEDIUM);

    // Set initial helpfulness to 0
    const initialPrefs = engine.getSettings().preferences[Trigger.HIGH_CPU_PREDICTED];
    expect(initialPrefs.helpfulnessScore).toBeCloseTo(0, 1);

    // Simulate positive feedback
    notification.status = Status.ACCEPTED;
    notification.feedback = {
      helpful: true,
      timestamp: Date.now(),
      actionTaken: NotificationActionType.CLEAR_CACHE,
    };

    engine['recordHistory'](notification);
    engine['updatePreferences'](notification, true);

    // Check that helpfulness increased
    const updatedPrefs = engine.getSettings().preferences[Trigger.HIGH_CPU_PREDICTED];
    expect(updatedPrefs.helpfulnessScore).toBeGreaterThan(0);
    expect(updatedPrefs.actionCount).toBe(1);
  });

  it('should respect cooldown periods', () => {
    const engine = createNotificationEngine();
    const notification = createMockNotification(Trigger.HIGH_CPU_PREDICTED, Urgency.MEDIUM);

    // Add to queue
    engine['notificationQueue'].set(notification.id, notification);

    // Try to create duplicate immediately
    const duplicateNotification = createMockNotification(Trigger.HIGH_CPU_PREDICTED, Urgency.MEDIUM);

    // Should be detected as duplicate (same trigger, within 1 minute)
    const isDuplicate = engine['isDuplicate'](duplicateNotification);
    expect(isDuplicate).toBe(true);

    // Record in history
    engine['recordHistory'](notification);

    // Check cooldown - should be in cooldown period
    const inCooldown = engine['isInCooldown'](Trigger.HIGH_CPU_PREDICTED);
    expect(inCooldown).toBe(true);
  });

  it('should calculate priority correctly', () => {
    const engine = createNotificationEngine();
    const context = createMockUserActivityContext();

    const lowPriority = createMockNotification(Trigger.FEATURE_SUGGESTION, Urgency.LOW, {
      confidence: 0.5,
    });

    const highPriority = createMockNotification(Trigger.STORAGE_FULL_PREDICTED, Urgency.HIGH, {
      confidence: 0.9,
    });

    const lowScore = engine['calculatePriority'](lowPriority, context);
    const highScore = engine['calculatePriority'](highPriority, context);

    expect(highScore).toBeGreaterThan(lowScore);
  });
});
