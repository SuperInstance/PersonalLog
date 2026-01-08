/**
 * Proactive Notification Engine
 *
 * Core engine for managing smart notifications that warn users about
 * predicted issues before they occur.
 */

import type {
  ProactiveNotification,
  NotificationTrigger,
  NotificationUrgency,
  NotificationQueueEntry,
  NotificationQueueStats,
  NotificationSettings,
  NotificationHistoryEntry,
  NotificationEffectivenessMetrics,
  UserActivityContext,
  ConversationState,
  AgentNeedPrediction,
  ResourcePrediction,
  AnomalyDetection,
} from './types';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  getDefaultNotificationPreferences,
  NotificationTrigger as Trigger,
  ALL_NOTIFICATION_TRIGGERS,
  NotificationUrgency as Urgency,
  NotificationStatus as Status,
  NotificationCategory as Category,
  getTriggerDefinition,
} from './types';
import {
  calculateNotificationTiming,
  UserActivityTracker,
  getActivityTracker,
} from './timing';

// ============================================================================
// NOTIFICATION ENGINE
// ============================================================================

/**
 * Proactive notification engine
 */
export class ProactiveNotificationEngine {
  private settings: NotificationSettings;
  private activityTracker: UserActivityTracker;
  private notificationQueue: Map<string, ProactiveNotification> = new Map();
  private notificationHistory: Map<string, NotificationHistoryEntry> = new Map();
  private lastEvaluation: number = 0;
  private evaluationInterval: number = 30000;
  private appFocused: boolean = true;

  constructor(settings?: Partial<NotificationSettings>) {
    this.settings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings };
    this.activityTracker = getActivityTracker();

    // Initialize preferences for all trigger types
    ALL_NOTIFICATION_TRIGGERS.forEach(trigger => {
      if (!this.settings.preferences[trigger]) {
        this.settings.preferences[trigger] = getDefaultNotificationPreferences(trigger);
      }
    });
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  /**
   * Evaluate predictions and generate notifications
   */
  async evaluateNotifications(predictions?: {
    states?: ConversationState[];
    agentNeeds?: AgentNeedPrediction[];
    resources?: ResourcePrediction;
    anomalies?: AnomalyDetection[];
  }): Promise<ProactiveNotification[]> {
    const now = Date.now();

    // Rate limiting
    if (now - this.lastEvaluation < this.evaluationInterval) {
      return [];
    }

    this.lastEvaluation = now;

    // Generate notifications from predictions
    const notifications: ProactiveNotification[] = [];

    if (predictions?.resources) {
      notifications.push(...await this.evaluateResourceTriggers(predictions.resources));
    }

    if (predictions?.agentNeeds) {
      notifications.push(...await this.evaluateAgentTriggers(predictions.agentNeeds));
    }

    if (predictions?.anomalies) {
      notifications.push(...await this.evaluateAnomalyTriggers(predictions.anomalies));
    }

    // Filter and prioritize
    const filtered = this.filterAndPrioritizeNotifications(notifications);

    // Add to queue
    for (const notification of filtered) {
      this.notificationQueue.set(notification.id, notification);
    }

    return filtered;
  }

  /**
   * Get pending notifications
   */
  getPendingNotifications(): NotificationQueueEntry[] {
    const now = Date.now();
    const context = this.getCurrentContext();
    const entries: NotificationQueueEntry[] = [];

    for (const notification of this.notificationQueue.values()) {
      if (notification.status !== Status.PENDING) {
        continue;
      }

      if (now > notification.expiresAt) {
        notification.status = Status.EXPIRED;
        this.recordHistory(notification);
        continue;
      }

      const prefs = this.settings.preferences[notification.trigger];
      if (!prefs.enabled) {
        continue;
      }

      if (!this.meetsUrgencyThreshold(notification.urgency, prefs.minUrgency)) {
        continue;
      }

      if (context.inQuietHours && !prefs.allowDuringQuietHours) {
        continue;
      }

      if (this.isInCooldown(notification.trigger)) {
        continue;
      }

      const timing = calculateNotificationTiming(notification, context);

      entries.push({
        notification,
        priority: this.calculatePriority(notification, context),
        canShow: timing.showNow,
        blockedReason: timing.showNow ? undefined : timing.reason,
        recommendedShowTime: timing.recommendedTime,
      });
    }

    return entries.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get notification queue statistics
   */
  getQueueStats(): NotificationQueueStats {
    const pending = this.getPendingNotifications();

    const byUrgency: Record<NotificationUrgency, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const byCategory: Record<NotificationCategory, number> = {
      performance: 0,
      resource: 0,
      agent: 0,
      context: 0,
      user_state: 0,
      suggestion: 0,
      system: 0,
    };

    let totalConfidence = 0;

    for (const entry of pending) {
      byUrgency[entry.notification.urgency]++;
      byCategory[entry.notification.category]++;
      totalConfidence += entry.notification.confidence;
    }

    const highestPriority = pending.length > 0 ? pending[0] : undefined;

    return {
      totalPending: pending.length,
      byUrgency,
      byCategory,
      avgConfidence: pending.length > 0 ? totalConfidence / pending.length : 0,
      highestPriority,
    };
  }

  /**
   * Dismiss notification
   */
  dismissNotification(id: string): void {
    const notification = this.notificationQueue.get(id);
    if (!notification) {
      return;
    }

    notification.status = Status.DISMISSED;
    notification.lastShown = Date.now();

    notification.feedback = {
      helpful: false,
      timestamp: Date.now(),
      actionTaken: undefined,
    };

    this.recordHistory(notification);
    this.updatePreferences(notification, false);
    this.activityTracker.recordNotification();

    this.notificationQueue.delete(id);
  }

  /**
   * Execute notification action
   */
  async executeAction(
    notificationId: string,
    actionId: string
  ): Promise<void> {
    const notification = this.notificationQueue.get(notificationId);
    if (!notification) {
      return;
    }

    const action = notification.actions.find(a => a.id === actionId);
    if (!action) {
      return;
    }

    await this.performAction(action);

    notification.status = Status.ACCEPTED;
    notification.lastShown = Date.now();
    notification.feedback = {
      helpful: true,
      timestamp: Date.now(),
      actionTaken: action.type,
    };

    this.recordHistory(notification);
    this.updatePreferences(notification, true);
    this.activityTracker.recordNotification();

    this.notificationQueue.delete(notificationId);
  }

  /**
   * Snooze notification
   */
  snoozeNotification(id: string, duration?: number): void {
    const notification = this.notificationQueue.get(id);
    if (!notification) {
      return;
    }

    const snoozeDuration = duration ||
                          this.settings.preferences[notification.trigger].preferredSnoozeDuration ||
                          this.settings.defaultSnoozeDuration;

    notification.status = Status.SNOOZED;
    notification.lastShown = Date.now();
    notification.expiresAt = Date.now() + snoozeDuration;

    setTimeout(() => {
      if (this.notificationQueue.has(id)) {
        const notif = this.notificationQueue.get(id)!;
        notif.status = Status.PENDING;
      }
    }, snoozeDuration);

    this.activityTracker.recordNotification();
  }

  /**
   * Get notification history
   */
  getHistory(limit: number = 50): NotificationHistoryEntry[] {
    return Array.from(this.notificationHistory.values())
      .sort((a, b) => b.shownAt - a.shownAt)
      .slice(0, limit);
  }

  /**
   * Get effectiveness metrics
   */
  getEffectivenessMetrics(): NotificationEffectivenessMetrics {
    const history = Array.from(this.notificationHistory.values());

    const totalShown = history.length;
    const totalActedUpon = history.filter(h => h.action).length;
    const actionRate = totalShown > 0 ? totalActedUpon / totalShown : 0;

    const issuesPrevented = history.filter(h => h.issuePrevented).length;
    const preventionRate = totalActedUpon > 0 ? issuesPrevented / totalActedUpon : 0;

    const helpfulFeedbacks = history.filter(h => h.feedback?.helpful).length;
    const avgHelpfulness = history.filter(h => h.feedback).length > 0
      ? helpfulFeedbacks / history.filter(h => h.feedback).length
      : 0;

    const byTrigger: Record<NotificationTrigger, {
      shown: number;
      actedUpon: number;
      prevented: number;
      helpfulness: number;
    }> = {} as any;

    for (const trigger of ALL_NOTIFICATION_TRIGGERS) {
      const triggerHistory = history.filter(h => h.trigger === trigger);
      const triggerActed = triggerHistory.filter(h => h.action).length;
      const triggerPrevented = triggerHistory.filter(h => h.issuePrevented).length;
      const triggerHelpful = triggerHistory.filter(h => h.feedback?.helpful).length;

      byTrigger[trigger] = {
        shown: triggerHistory.length,
        actedUpon: triggerActed,
        prevented: triggerPrevented,
        helpfulness: triggerHistory.filter(h => h.feedback).length > 0
          ? triggerHelpful / triggerHistory.filter(h => h.feedback).length
          : 0,
      };
    }

    return {
      totalShown,
      totalActedUpon,
      actionRate,
      issuesPrevented,
      preventionRate,
      avgHelpfulness,
      byTrigger,
    };
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Get settings
   */
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Clear notification queue
   */
  clearQueue(): void {
    this.notificationQueue.clear();
  }

  /**
   * Set app focus state
   */
  setAppFocused(focused: boolean): void {
    this.appFocused = focused;
  }

  // ========================================================================
  // TRIGGER EVALUATION
  // ========================================================================

  private async evaluateResourceTriggers(
    resourcePrediction: ResourcePrediction
  ): Promise<ProactiveNotification[]> {
    const _trigger = resourcePrediction.resourceType; // Mark as intentionally unused
    void _trigger;
    const notifications: ProactiveNotification[] = [];

    if (resourcePrediction.resourceType === 'storage' && resourcePrediction.predictedUsage > 0.85) {
      notifications.push(await this.createNotification(
        Trigger.STORAGE_FULL_PREDICTED,
        Urgency.HIGH,
        'Storage Almost Full',
        `Local storage is ${Math.round(resourcePrediction.predictedUsage * 100)}% full. Clear old data to prevent issues.`,
        { confidence: 0.9, timeframe: 3600000, impact: 'Cannot save new data' }
      ));
    }

    return notifications;
  }

  private async evaluateAgentTriggers(
    agentNeeds: AgentNeedPrediction[]
  ): Promise<ProactiveNotification[]> {
    const notifications: ProactiveNotification[] = [];

    for (const need of agentNeeds) {
      if (need.probability > 0.7 && need.confidence > 0.6) {
        notifications.push(await this.createNotification(
          Trigger._AGENT_NEEDED_SOON,
          Urgency.LOW,
          'Agent May Be Needed Soon',
          `"${need.agentId}" is predicted to be needed soon (${need.reason}). Preload now for faster response?`,
          { confidence: need.confidence, timeframe: need.timeframe, impact: 'Slower agent activation' },
          need
        ));
      }
    }

    return notifications;
  }

  private async evaluateAnomalyTriggers(
    anomalies: AnomalyDetection[]
  ): Promise<ProactiveNotification[]> {
    const notifications: ProactiveNotification[] = [];

    for (const anomaly of anomalies) {
      if (!anomaly.isAnomaly || anomaly.severity < 0.5) {
        continue;
      }

      const urgency = anomaly.severity > 0.8 ? Urgency.HIGH : Urgency.MEDIUM;

      notifications.push(await this.createNotification(
        Trigger.ERROR_RECOVERY_SUGGESTION,
        urgency,
        'Anomaly Detected',
        `${anomaly.description}. Suggested actions: ${anomaly.suggestions.join(', ')}`,
        { confidence: anomaly.confidence, timeframe: 0, impact: `Severity: ${Math.round(anomaly.severity * 100)}%` },
        anomaly
      ));
    }

    return notifications;
  }

  // ========================================================================
  // NOTIFICATION CREATION
  // ========================================================================

  private async createNotification(
    trigger: NotificationTrigger,
    urgency: NotificationUrgency,
    title: string,
    message: string,
    details: {
      confidence: number;
      timeframe: number;
      impact: string;
    },
    prediction?: AgentNeedPrediction | ResourcePrediction | AnomalyDetection
  ): Promise<ProactiveNotification> {
    const definition = getTriggerDefinition(trigger);

    const id = `notif-${trigger}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const actions = definition?.defaultActions || this.getDefaultActions(trigger, urgency);

    const estimatedResolutionTime = definition?.estimatedResolutionTime ||
                                    actions.reduce((sum, a) => sum + (a.estimatedTime || 0), 0);

    const notification: ProactiveNotification = {
      id,
      trigger,
      title,
      message,
      urgency,
      createdAt: now,
      expiresAt: now + Math.max(details.timeframe * 2, 3600000),
      status: Status.PENDING,
      confidence: details.confidence,
      timeframe: details.timeframe,
      impact: details.impact,
      actions,
      prediction,
      shownCount: 0,
      category: definition?.category || Category.SYSTEM,
      requiresAction: definition?.requiresAction || false,
      estimatedResolutionTime,
    };

    return notification;
  }

  private getDefaultActions(
    trigger: NotificationTrigger,
    urgency: NotificationUrgency
  ): any[] {
    const actions: any[] = [];

    actions.push({
      id: 'dismiss',
      type: 'dismiss',
      label: 'Dismiss',
      primary: false,
    });

    if (urgency !== Urgency.CRITICAL) {
      actions.push({
        id: 'snooze',
        type: 'snooze',
        label: 'Remind Later',
        primary: false,
      });
    }

    return actions;
  }

  // ========================================================================
  // NOTIFICATION FILTERING & PRIORITIZATION
  // ========================================================================

  private filterAndPrioritizeNotifications(
    notifications: ProactiveNotification[]
  ): ProactiveNotification[] {
    const filtered: ProactiveNotification[] = [];

    for (const notification of notifications) {
      const prefs = this.settings.preferences[notification.trigger];
      const context = this.getCurrentContext();
      if (!prefs.enabled) {
        continue;
      }

      if (!this.meetsUrgencyThreshold(notification.urgency, prefs.minUrgency)) {
        continue;
      }

      if (this.isInCooldown(notification.trigger)) {
        continue;
      }

      if (context.inQuietHours && !prefs.allowDuringQuietHours) {
        continue;
      }

      if (this.isDuplicate(notification)) {
        continue;
      }

      if (context.recentNotificationCount >= this.settings.maxNotificationsPerHour) {
        if (notification.urgency !== Urgency.CRITICAL) {
          continue;
        }
      }

      filtered.push(notification);
    }

    return filtered.sort((a, b) => {
      if (a.urgency === Urgency.CRITICAL && b.urgency !== Urgency.CRITICAL) return -1;
      if (b.urgency === Urgency.CRITICAL && a.urgency !== Urgency.CRITICAL) return 1;

      if (a.urgency === Urgency.HIGH && b.urgency !== Urgency.HIGH) return -1;
      if (b.urgency === Urgency.HIGH && a.urgency !== Urgency.HIGH) return 1;

      return b.confidence - a.confidence;
    });
  }

  private calculatePriority(
    notification: ProactiveNotification,
    context: UserActivityContext
  ): number {
    let priority = 0.5;

    const urgencyWeight: Record<NotificationUrgency, number> = {
      critical: 1.0,
      high: 0.8,
      medium: 0.5,
      low: 0.2,
    };
    priority += urgencyWeight[notification.urgency] * 0.4;

    priority += notification.confidence * 0.2;

    if (notification.timeframe > 0) {
      const timeUrgency = Math.max(0, 1 - (notification.timeframe / 600000));
      priority += timeUrgency * 0.2;
    }

    const prefs = this.settings.preferences[notification.trigger];
    priority += prefs.helpfulnessScore * 0.1;

    if (prefs.actionCount > 3) {
      priority += 0.1;
    }

    return Math.max(0, Math.min(1, priority));
  }

  private meetsUrgencyThreshold(
    urgency: NotificationUrgency,
    minUrgency: NotificationUrgency
  ): boolean {
    const order: NotificationUrgency[] = [Urgency.LOW, Urgency.MEDIUM, Urgency.HIGH, Urgency.CRITICAL];
    return order.indexOf(urgency) >= order.indexOf(minUrgency);
  }

  private isInCooldown(trigger: NotificationTrigger): boolean {
    const definition = getTriggerDefinition(trigger);
    if (!definition || !definition.cooldownPeriod) {
      return false;
    }

    const history = Array.from(this.notificationHistory.values())
      .filter(h => h.trigger === trigger);

    if (history.length === 0) {
      return false;
    }

    const lastShown = history[0].shownAt;
    const now = Date.now();

    return (now - lastShown) < definition.cooldownPeriod;
  }

  private isDuplicate(notification: ProactiveNotification): boolean {
    for (const existing of this.notificationQueue.values()) {
      if (existing.trigger === notification.trigger &&
          existing.status === Status.PENDING &&
          (Date.now() - existing.createdAt) < 60000) {
        return true;
      }
    }
    return false;
  }

  // ========================================================================
  // ACTION EXECUTION
  // ========================================================================

  private async performAction(action: any): Promise<void> {
    console.log('[AI-Smart-Notifications] Executing action:', action.label, action.type);
    // Action execution would be implemented based on action type
    // This is a placeholder for the actual implementation
  }

  // ========================================================================
  // HISTORY & LEARNING
  // ========================================================================

  private recordHistory(notification: ProactiveNotification): void {
    const entry: NotificationHistoryEntry = {
      id: notification.id,
      trigger: notification.trigger,
      shownAt: notification.lastShown || notification.createdAt,
      action: notification.feedback?.actionTaken,
      feedback: notification.feedback,
    };

    this.notificationHistory.set(notification.id, entry);

    if (this.notificationHistory.size > 1000) {
      const entries = Array.from(this.notificationHistory.entries())
        .sort(([, a], [, b]) => b.shownAt - a.shownAt);

      this.notificationHistory = new Map(entries.slice(0, 1000));
    }
  }

  private updatePreferences(notification: ProactiveNotification, wasHelpful: boolean): void {
    if (!this.settings.enableLearning) {
      return;
    }

    const prefs = this.settings.preferences[notification.trigger];
    prefs.lastUpdated = Date.now();

    const alpha = 0.3;
    const newScore = wasHelpful ? 1 : -1;
    prefs.helpfulnessScore = (alpha * newScore) + ((1 - alpha) * prefs.helpfulnessScore);

    if (wasHelpful) {
      prefs.actionCount++;
    }
  }

  // ========================================================================
  // HELPERS
  // ========================================================================

  private getCurrentContext(): UserActivityContext {
    return this.activityTracker.getContext(this.settings.quietHours, this.appFocused);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let notificationEngine: ProactiveNotificationEngine | null = null;

export function getNotificationEngine(): ProactiveNotificationEngine {
  if (!notificationEngine) {
    notificationEngine = new ProactiveNotificationEngine();
  }
  return notificationEngine;
}

export function createNotificationEngine(
  settings?: Partial<NotificationSettings>
): ProactiveNotificationEngine {
  return new ProactiveNotificationEngine(settings);
}
