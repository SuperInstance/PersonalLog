/**
 * Proactive Notification Engine
 *
 * Monitors world model predictions and triggers smart notifications
 * to warn users about predicted issues before they occur.
 */

import type {
  ProactiveNotification,
  NotificationTrigger,
  NotificationUrgency,
  NotificationAction,
  NotificationActionType,
  NotificationStatus,
  NotificationCategory,
  NotificationQueueEntry,
  NotificationQueueStats,
  NotificationPreferences,
  NotificationSettings,
  NotificationHistoryEntry,
  NotificationEffectivenessMetrics,
  UserActivityContext,
} from './types';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  getDefaultNotificationPreferences,
  NotificationTrigger as Trigger,
  ALL_NOTIFICATION_TRIGGERS,
  NotificationUrgency as Urgency,
  NotificationStatus as Status,
  NotificationCategory as Category,
  TRIGGER_DEFINITIONS,
  getTriggerDefinition,
} from './types';
import {
  calculateNotificationTiming,
  UserActivityTracker,
  getActivityTracker,
  batchNotifications,
  isInQuietHours,
} from './notification-timing';
import type {
  PredictedState,
  AgentNeedPrediction,
  ResourcePrediction,
  AnomalyDetection,
  ConversationState,
} from '@/lib/intelligence/world-model-types';
import { getWorldModel } from '@/lib/intelligence/world-model';

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
  private evaluationInterval: number = 30000; // 30 seconds
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

    // Start periodic evaluation
    this.startPeriodicEvaluation();
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  /**
   * Evaluate predictions and generate notifications
   */
  async evaluateNotifications(predictions?: {
    states?: PredictedState[];
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

    // Get current state and context
    const worldModel = getWorldModel();
    const currentState = worldModel.getCurrentState();
    if (!currentState) {
      return [];
    }

    const context = this.getCurrentContext();

    // Generate notifications from various triggers
    const notifications: ProactiveNotification[] = [];

    // 1. Performance triggers
    notifications.push(...await this.evaluatePerformanceTriggers(currentState, context));

    // 2. Resource triggers
    notifications.push(...await this.evaluateResourceTriggers(currentState, context, predictions?.resources));

    // 3. Agent triggers
    if (predictions?.agentNeeds) {
      notifications.push(...await this.evaluateAgentTriggers(predictions.agentNeeds, context));
    }

    // 4. Context triggers
    notifications.push(...await this.evaluateContextTriggers(currentState, context));

    // 5. User state triggers
    notifications.push(...await this.evaluateUserStateTriggers(currentState, context));

    // 6. Anomaly triggers
    if (predictions?.anomalies) {
      notifications.push(...await this.evaluateAnomalyTriggers(predictions.anomalies, context));
    }

    // Filter and prioritize
    const filtered = this.filterAndPrioritizeNotifications(notifications, context);

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

      // Check if expired
      if (now > notification.expiresAt) {
        notification.status = Status.EXPIRED;
        this.recordHistory(notification);
        continue;
      }

      // Check preferences
      const prefs = this.settings.preferences[notification.trigger];
      if (!prefs.enabled) {
        continue;
      }

      // Check urgency threshold
      if (!this.meetsUrgencyThreshold(notification.urgency, prefs.minUrgency)) {
        continue;
      }

      // Check quiet hours
      if (context.inQuietHours && !prefs.allowDuringQuietHours) {
        continue;
      }

      // Check cooldown
      if (this.isInCooldown(notification.trigger)) {
        continue;
      }

      // Calculate timing
      const timing = calculateNotificationTiming(notification, context);

      entries.push({
        notification,
        priority: this.calculatePriority(notification, context),
        canShow: timing.showNow,
        blockedReason: timing.showNow ? undefined : timing.reason,
        recommendedShowTime: timing.recommendedTime,
      });
    }

    // Sort by priority
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

    // Record feedback
    notification.feedback = {
      helpful: false,
      timestamp: Date.now(),
      actionTaken: undefined,
    };

    this.recordHistory(notification);
    this.updatePreferences(notification, false);
    this.activityTracker.recordNotification();

    // Remove from queue
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

    // Execute action
    await this.performAction(action);

    // Update notification
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

    // Remove from queue
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

    // Reset to pending after snooze duration
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

    // By trigger breakdown
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

  /**
   * Evaluate performance triggers
   */
  private async evaluatePerformanceTriggers(
    state: ConversationState,
    context: UserActivityContext
  ): Promise<ProactiveNotification[]> {
    const notifications: ProactiveNotification[] = [];

    // HIGH_CPU_PREDICTED
    if (state.systemLoad > 0.8 && state.systemLoad < 0.9) {
      notifications.push(await this.createNotification(
        Trigger.HIGH_CPU_PREDICTED,
        Urgency.MEDIUM,
        'High CPU Usage Predicted',
        `CPU usage is predicted to reach ${Math.round(state.systemLoad * 100)}% soon. Consider reducing quality settings to prevent slowdown.`,
        { confidence: 0.8, timeframe: 300000, impact: 'System may become sluggish' },
        context
      ));
    }

    // HIGH_MEMORY_PREDICTED
    if (state.systemLoad > 0.85) {
      notifications.push(await this.createNotification(
        Trigger.HIGH_MEMORY_PREDICTED,
        Urgency.MEDIUM,
        'High Memory Usage Predicted',
        'Memory usage is approaching capacity. Clearing cache can prevent performance issues.',
        { confidence: 0.75, timeframe: 180000, impact: 'Application may slow down or crash' },
        context
      ));
    }

    // PERFORMANCE_DEGRADING
    if (state.systemLoad > 0.7 && state.systemLoad < 0.8) {
      notifications.push(await this.createNotification(
        Trigger.PERFORMANCE_DEGRADING,
        Urgency.LOW,
        'Performance Gradually Degrading',
        'System performance is slowly decreasing. Optimize settings now to maintain smooth operation.',
        { confidence: 0.6, timeframe: 600000, impact: 'Gradual performance loss' },
        context
      ));
    }

    return notifications;
  }

  /**
   * Evaluate resource triggers
   */
  private async evaluateResourceTriggers(
    state: ConversationState,
    context: UserActivityContext,
    resourcePrediction?: ResourcePrediction
  ): Promise<ProactiveNotification[]> {
    const notifications: ProactiveNotification[] = [];

    // STORAGE_FULL_PREDICTED (mock detection)
    const storageQuota = await this.getStorageUsage();
    if (storageQuota > 0.85) {
      notifications.push(await this.createNotification(
        Trigger.STORAGE_FULL_PREDICTED,
        Urgency.HIGH,
        'Storage Almost Full',
        `Local storage is ${Math.round(storageQuota * 100)}% full. Clear old data to prevent issues.`,
        { confidence: 0.9, timeframe: 3600000, impact: 'Cannot save new data' },
        context
      ));
    }

    // TOKEN_USAGE_HIGH
    if (state.estimatedTokenUsage > 10000) {
      notifications.push(await this.createNotification(
        Trigger.TOKEN_USAGE_HIGH,
        Urgency.LOW,
        'High Token Usage',
        `Current operation will use ~${state.estimatedTokenUsage} tokens. Consider compressing context.`,
        { confidence: 0.7, timeframe: 0, impact: 'Slower responses' },
        context
      ));
    }

    return notifications;
  }

  /**
   * Evaluate agent triggers
   */
  private async evaluateAgentTriggers(
    agentNeeds: AgentNeedPrediction[],
    context: UserActivityContext
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
          context,
          need
        ));
      }
    }

    return notifications;
  }

  /**
   * Evaluate context triggers
   */
  private async evaluateContextTriggers(
    state: ConversationState,
    context: UserActivityContext
  ): Promise<ProactiveNotification[]> {
    const notifications: ProactiveNotification[] = [];

    // CONTEXT_TOO_LONG
    if (state.messageCount > 100 && state.totalTokens > 50000) {
      notifications.push(await this.createNotification(
        Trigger.CONTEXT_TOO_LONG,
        Urgency.MEDIUM,
        'Conversation Context Growing Long',
        `This conversation has ${state.messageCount} messages. Consider summarizing to maintain performance.`,
        { confidence: 0.8, timeframe: 0, impact: 'Slower responses, higher costs' },
        context
      ));
    }

    return notifications;
  }

  /**
   * Evaluate user state triggers
   */
  private async evaluateUserStateTriggers(
    state: ConversationState,
    context: UserActivityContext
  ): Promise<ProactiveNotification[]> {
    const notifications: ProactiveNotification[] = [];

    // USER_FRUSTRATION_DETECTED
    if (state.userIntent === 'struggling' && state.emotionState.valence < 0.3) {
      notifications.push(await this.createNotification(
        Trigger.USER_FRUSTRATION_DETECTED,
        Urgency.LOW,
        'Need Help?',
        'I notice you might be frustrated. Can I help resolve any issues?',
        { confidence: 0.6, timeframe: 0, impact: 'Continued frustration' },
        context
      ));
    }

    // INACTIVITY_TIMEOUT
    if (state.timeSinceLastMessage > 30 * 60 * 1000) { // 30 minutes
      notifications.push(await this.createNotification(
        Trigger.INACTIVITY_TIMEOUT,
        Urgency.LOW,
        'Welcome Back',
        'You\'ve been away for a while. Would you like to resume where you left off?',
        { confidence: 0.9, timeframe: 0, impact: 'None' },
        context
      ));
    }

    return notifications;
  }

  /**
   * Evaluate anomaly triggers
   */
  private async evaluateAnomalyTriggers(
    anomalies: AnomalyDetection[],
    context: UserActivityContext
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
        context,
        anomaly
      ));
    }

    return notifications;
  }

  // ========================================================================
  // NOTIFICATION CREATION
  // ========================================================================

  /**
   * Create a notification
   */
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
    context: UserActivityContext,
    prediction?: PredictedState | AgentNeedPrediction | ResourcePrediction | AnomalyDetection
  ): Promise<ProactiveNotification> {
    const definition = getTriggerDefinition(trigger);

    const id = `notif-${trigger}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    // Get default actions or custom actions
    const actions = definition?.defaultActions || this.getDefaultActions(trigger, urgency);

    // Estimate resolution time
    const estimatedResolutionTime = definition?.estimatedResolutionTime ||
                                    actions.reduce((sum, a) => sum + (a.estimatedTime || 0), 0);

    const notification: ProactiveNotification = {
      id,
      trigger,
      title,
      message,
      urgency,
      createdAt: now,
      expiresAt: now + Math.max(details.timeframe * 2, 3600000), // At least 1 hour
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

  /**
   * Get default actions for a trigger
   */
  private getDefaultActions(
    trigger: NotificationTrigger,
    urgency: NotificationUrgency
  ): NotificationAction[] {
    const actions: NotificationAction[] = [];

    // Always add dismiss action
    actions.push({
      id: 'dismiss',
      type: 'dismiss' as NotificationActionType,
      label: 'Dismiss',
      primary: false,
    });

    // Add snooze for non-critical
    if (urgency !== Urgency.CRITICAL) {
      actions.push({
        id: 'snooze',
        type: 'snooze' as NotificationActionType,
        label: 'Remind Later',
        primary: false,
      });
    }

    return actions;
  }

  // ========================================================================
  // NOTIFICATION FILTERING & PRIORITIZATION
  // ========================================================================

  /**
   * Filter and prioritize notifications
   */
  private filterAndPrioritizeNotifications(
    notifications: ProactiveNotification[],
    context: UserActivityContext
  ): ProactiveNotification[] {
    const filtered: ProactiveNotification[] = [];

    for (const notification of notifications) {
      // Check if notification type is enabled
      const prefs = this.settings.preferences[notification.trigger];
      if (!prefs.enabled) {
        continue;
      }

      // Check urgency threshold
      if (!this.meetsUrgencyThreshold(notification.urgency, prefs.minUrgency)) {
        continue;
      }

      // Check cooldown
      if (this.isInCooldown(notification.trigger)) {
        continue;
      }

      // Check quiet hours
      if (context.inQuietHours && !prefs.allowDuringQuietHours) {
        continue;
      }

      // Check for duplicates
      if (this.isDuplicate(notification)) {
        continue;
      }

      // Check frequency limits
      if (context.recentNotificationCount >= this.settings.maxNotificationsPerHour) {
        // Only allow critical notifications
        if (notification.urgency !== Urgency.CRITICAL) {
          continue;
        }
      }

      filtered.push(notification);
    }

    // Sort by priority
    return filtered.sort((a, b) => {
      // Critical first
      if (a.urgency === Urgency.CRITICAL && b.urgency !== Urgency.CRITICAL) return -1;
      if (b.urgency === Urgency.CRITICAL && a.urgency !== Urgency.CRITICAL) return 1;

      // Then high urgency
      if (a.urgency === Urgency.HIGH && b.urgency !== Urgency.HIGH) return -1;
      if (b.urgency === Urgency.HIGH && a.urgency !== Urgency.HIGH) return 1;

      // Then by confidence
      return b.confidence - a.confidence;
    });
  }

  /**
   * Calculate notification priority score (0-1)
   */
  private calculatePriority(
    notification: ProactiveNotification,
    context: UserActivityContext
  ): number {
    let priority = 0.5;

    // Urgency contributes significantly
    const urgencyWeight: Record<NotificationUrgency, number> = {
      critical: 1.0,
      high: 0.8,
      medium: 0.5,
      low: 0.2,
    };
    priority += urgencyWeight[notification.urgency] * 0.4;

    // Confidence matters
    priority += notification.confidence * 0.2;

    // Timeframe urgency (sooner = higher priority)
    if (notification.timeframe > 0) {
      const timeUrgency = Math.max(0, 1 - (notification.timeframe / 600000)); // 10 min window
      priority += timeUrgency * 0.2;
    }

    // User preference helpfulness boosts priority
    const prefs = this.settings.preferences[notification.trigger];
    priority += prefs.helpfulnessScore * 0.1;

    // Action history (if user often acts on this, higher priority)
    if (prefs.actionCount > 3) {
      priority += 0.1;
    }

    return Math.max(0, Math.min(1, priority));
  }

  /**
   * Check if notification meets urgency threshold
   */
  private meetsUrgencyThreshold(
    urgency: NotificationUrgency,
    minUrgency: NotificationUrgency
  ): boolean {
    const order: NotificationUrgency[] = [Urgency.LOW, Urgency.MEDIUM, Urgency.HIGH, Urgency.CRITICAL];
    return order.indexOf(urgency) >= order.indexOf(minUrgency);
  }

  /**
   * Check if trigger is in cooldown
   */
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

  /**
   * Check if notification is duplicate
   */
  private isDuplicate(notification: ProactiveNotification): boolean {
    for (const existing of this.notificationQueue.values()) {
      if (existing.trigger === notification.trigger &&
          existing.status === Status.PENDING &&
          (Date.now() - existing.createdAt) < 60000) { // Within 1 minute
        return true;
      }
    }
    return false;
  }

  // ========================================================================
  // ACTION EXECUTION
  // ========================================================================

  /**
   * Perform a notification action
   */
  private async performAction(action: NotificationAction): Promise<void> {
    console.log('[ProactiveNotifications] Executing action:', action.label, action.type);

    // Action execution would be implemented based on action type
    // This is a placeholder for the actual implementation

    switch (action.type) {
      case 'enable_feature':
        // TODO: Enable feature
        break;
      case 'disable_feature':
        // TODO: Disable feature
        break;
      case 'adjust_setting':
        // TODO: Adjust setting
        break;
      case 'clear_cache':
        // TODO: Clear cache
        break;
      case 'prefetch_data':
        // TODO: Prefetch data
        break;
      case 'preload_agent':
        // TODO: Preload agent
        break;
      case 'start_backup':
        // TODO: Start backup
        break;
      case 'apply_fix':
        // TODO: Apply fix
        break;
      default:
        break;
    }
  }

  // ========================================================================
  // HISTORY & LEARNING
  // ========================================================================

  /**
   * Record notification to history
   */
  private recordHistory(notification: ProactiveNotification): void {
    const entry: NotificationHistoryEntry = {
      id: notification.id,
      trigger: notification.trigger,
      shownAt: notification.lastShown || notification.createdAt,
      action: notification.feedback?.actionTaken,
      feedback: notification.feedback,
    };

    this.notificationHistory.set(notification.id, entry);

    // Trim history if needed
    if (this.notificationHistory.size > 1000) {
      const entries = Array.from(this.notificationHistory.entries())
        .sort(([, a], [, b]) => b.shownAt - a.shownAt);

      // Keep most recent 1000
      this.notificationHistory = new Map(entries.slice(0, 1000));
    }
  }

  /**
   * Update preferences based on user feedback
   */
  private updatePreferences(notification: ProactiveNotification, wasHelpful: boolean): void {
    if (!this.settings.enableLearning) {
      return;
    }

    const prefs = this.settings.preferences[notification.trigger];
    prefs.lastUpdated = Date.now();

    // Update helpfulness score (exponential moving average)
    const alpha = 0.3;
    const newScore = wasHelpful ? 1 : -1;
    prefs.helpfulnessScore = (alpha * newScore) + ((1 - alpha) * prefs.helpfulnessScore);

    // Update action count
    if (wasHelpful) {
      prefs.actionCount++;
    }
  }

  // ========================================================================
  // HELPERS
  // ========================================================================

  /**
   * Get current user activity context
   */
  private getCurrentContext(): UserActivityContext {
    return this.activityTracker.getContext(this.settings.quietHours, this.appFocused);
  }

  /**
   * Get storage usage percentage (0-1)
   */
  private async getStorageUsage(): Promise<number> {
    if (typeof navigator === 'undefined' || !('storage' in navigator)) {
      return 0;
    }

    try {
      const estimate = await (navigator as any).storage.estimate();
      if (estimate && estimate.quota > 0) {
        return estimate.usage / estimate.quota;
      }
    } catch (error) {
      console.error('[ProactiveNotifications] Failed to get storage usage:', error);
    }

    return 0;
  }

  /**
   * Start periodic evaluation
   */
  private startPeriodicEvaluation(): void {
    setInterval(async () => {
      if (this.settings.enabled && this.appFocused) {
        await this.evaluateNotifications();
      }
    }, this.evaluationInterval);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let notificationEngine: ProactiveNotificationEngine | null = null;

/**
 * Get or create notification engine instance
 */
export function getNotificationEngine(): ProactiveNotificationEngine {
  if (!notificationEngine) {
    notificationEngine = new ProactiveNotificationEngine();
  }
  return notificationEngine;
}

/**
 * Create new notification engine instance
 */
export function createNotificationEngine(
  settings?: Partial<NotificationSettings>
): ProactiveNotificationEngine {
  return new ProactiveNotificationEngine(settings);
}
