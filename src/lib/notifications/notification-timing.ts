/**
 * Smart Notification Timing System
 *
 * Determines optimal times to show notifications based on user activity,
 * conversation context, and timing heuristics to avoid interrupting important work.
 */

import type {
  ProactiveNotification,
  UserActivityContext,
  TimingRecommendation,
  NotificationUrgency,
} from './types';

// ============================================================================
// TIMING CONFIGURATION
// ============================================================================

/**
 * Timing configuration
 */
interface TimingConfig {
  /** Minimum time between user actions before showing notification (ms) */
  minPauseBeforeNotification: number;
  /** Minimum time since last notification (ms) */
  minTimeSinceLastNotification: number;
  /** Maximum wait time for high urgency (ms) */
  maxWaitForHighUrgency: number;
  /** Maximum wait time for critical urgency (ms) */
  maxWaitForCriticalUrgency: number;
  /** Time window to consider for typing activity (ms) */
  typingActivityWindow: number;
  /** Minimum time after operation completes before showing notification (ms) */
  minTimeAfterOperation: number;
  /** Time-of-day multiplier for quiet hours (0-1, lower = less notifications) */
  quietHoursMultiplier: number;
  /** Conversation state awareness window (ms) */
  conversationStateWindow: number;
}

/**
 * Default timing configuration
 */
const DEFAULT_TIMING_CONFIG: TimingConfig = {
  minPauseBeforeNotification: 2000, // 2 seconds
  minTimeSinceLastNotification: 30000, // 30 seconds
  maxWaitForHighUrgency: 5000, // 5 seconds
  maxWaitForCriticalUrgency: 1000, // 1 second
  typingActivityWindow: 5000, // 5 seconds
  minTimeAfterOperation: 1000, // 1 second
  quietHoursMultiplier: 0.3,
  conversationStateWindow: 10000, // 10 seconds
};

// ============================================================================
// TIMING ENGINE
// ============================================================================

/**
 * Calculate optimal timing for notification
 */
export function calculateNotificationTiming(
  notification: ProactiveNotification,
  context: UserActivityContext,
  config: TimingConfig = DEFAULT_TIMING_CONFIG
): TimingRecommendation {
  const reasons: string[] = [];
  let canShow = true;
  let recommendedDelay = 0;

  // 1. Check urgency - critical and high urgency show sooner
  if (notification.urgency === 'critical') {
    recommendedDelay = Math.min(recommendedDelay, config.maxWaitForCriticalUrgency);
    reasons.push('Critical urgency');
  } else if (notification.urgency === 'high') {
    recommendedDelay = Math.min(recommendedDelay, config.maxWaitForHighUrgency);
    reasons.push('High urgency');
  }

  // 2. Check if user is typing - wait for pause
  if (context.isTyping) {
    canShow = false;
    recommendedDelay = Math.max(recommendedDelay, config.typingActivityWindow);
    reasons.push('User is typing, waiting for pause');
  }

  // 3. Check time since last action - wait for natural pause
  if (context.timeSinceLastAction < config.minPauseBeforeNotification) {
    canShow = false;
    const waitTime = config.minPauseBeforeNotification - context.timeSinceLastAction;
    recommendedDelay = Math.max(recommendedDelay, waitTime);
    reasons.push(`Waiting for pause in user activity (${waitTime}ms remaining)`);
  }

  // 4. Check active operations - wait for completion
  if (context.hasActiveOperation) {
    canShow = false;
    recommendedDelay = Math.max(recommendedDelay, config.minTimeAfterOperation);
    reasons.push('Waiting for active operation to complete');
  }

  // 5. Check app focus
  if (!context.appFocused) {
    canShow = false;
    reasons.push('App not focused');
  }

  // 6. Check notification frequency limit
  if (context.recentNotificationCount >= 5) { // Heuristic: if 5+ notifications in last hour
    canShow = false;
    recommendedDelay = Math.max(recommendedDelay, 60000); // Wait at least 1 minute
    reasons.push('Too many recent notifications, cooling down');
  }

  // 7. Check quiet hours
  if (context.inQuietHours) {
    canShow = false;
    reasons.push('In quiet hours');
    // Only critical notifications during quiet hours
    if (notification.urgency !== 'critical') {
      return {
        showNow: false,
        recommendedTime: Date.now() + (8 * 60 * 60 * 1000), // 8 hours from now
        reason: 'Deferring until quiet hours end (8:00 AM)',
        confidence: 0.9,
      };
    }
  }

  // 8. Check emotional state
  if (context.emotionalState === 'frustrated' || context.emotionalState === 'stressed') {
    // Be more careful with notifications when user is frustrated
    if (notification.urgency !== 'critical' && notification.urgency !== 'high') {
      canShow = false;
      recommendedDelay = Math.max(recommendedDelay, 30000); // Wait 30 seconds
      reasons.push('User frustrated, delaying low-urgency notification');
    }
  }

  // 9. Calculate confidence
  const confidence = calculateTimingConfidence(notification, context, canShow);

  // 10. Determine final timing
  if (canShow && recommendedDelay === 0) {
    return {
      showNow: true,
      recommendedTime: Date.now(),
      reason: reasons.length > 0 ? reasons.join('. ') : 'Optimal timing',
      confidence,
    };
  }

  return {
    showNow: false,
    recommendedTime: Date.now() + recommendedDelay,
    reason: reasons.join('. ') || 'Waiting for optimal time',
    confidence,
  };
}

/**
 * Calculate confidence in timing recommendation (0-1)
 */
function calculateTimingConfidence(
  notification: ProactiveNotification,
  context: UserActivityContext,
  canShow: boolean
): number {
  let confidence = 0.5;

  // High confidence if:
  // - User is idle for a while
  if (context.timeSinceLastAction > 10000) {
    confidence += 0.2;
  }

  // - No active operations
  if (!context.hasActiveOperation) {
    confidence += 0.1;
  }

  // - App is focused
  if (context.appFocused) {
    confidence += 0.1;
  }

  // - High urgency notification
  if (notification.urgency === 'critical' || notification.urgency === 'high') {
    confidence += 0.2;
  }

  // Low confidence if:
  // - User is typing
  if (context.isTyping) {
    confidence -= 0.3;
  }

  // - Many recent notifications
  if (context.recentNotificationCount > 3) {
    confidence -= 0.1;
  }

  // - In quiet hours
  if (context.inQuietHours) {
    confidence -= 0.2;
  }

  return Math.max(0, Math.min(1, confidence));
}

// ============================================================================
// BATCHING
// ============================================================================

/**
 * Notification batch
 */
export interface NotificationBatch {
  /** Notifications in batch */
  notifications: ProactiveNotification[];
  /** Recommended show time */
  showTime: number;
  /** Batch priority (0-1) */
  priority: number;
  /** Reason for batching */
  reason: string;
}

/**
 * Group notifications into batches for efficient display
 */
export function batchNotifications(
  notifications: ProactiveNotification[],
  context: UserActivityContext,
  maxBatchSize: number = 3,
  batchInterval: number = 300000 // 5 minutes
): NotificationBatch[] {
  const batches: NotificationBatch[] = [];
  const now = Date.now();

  // Separate critical and non-critical
  const critical = notifications.filter(n => n.urgency === 'critical');
  const high = notifications.filter(n => n.urgency === 'high');
  const mediumAndLow = notifications.filter(n => n.urgency === 'medium' || n.urgency === 'low');

  // Critical notifications - show immediately, one at a time
  for (const notification of critical) {
    batches.push({
      notifications: [notification],
      showTime: now,
      priority: 1.0,
      reason: 'Critical urgency, show immediately',
    });
  }

  // High urgency - show in small batches or individually
  if (high.length > 0) {
    if (high.length === 1) {
      batches.push({
        notifications: high,
        showTime: now,
        priority: 0.8,
        reason: 'High urgency, single notification',
      });
    } else {
      // Group into batches of 2
      for (let i = 0; i < high.length; i += 2) {
        batches.push({
          notifications: high.slice(i, i + 2),
          showTime: now,
          priority: 0.8,
          reason: 'High urgency, batched for efficiency',
        });
      }
    }
  }

  // Medium and low urgency - batch by category and timing
  const byCategory = new Map<string, ProactiveNotification[]>();
  for (const notification of mediumAndLow) {
    const category = notification.category;
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(notification);
  }

  for (const [category, categoryNotifications] of byCategory.entries()) {
    if (categoryNotifications.length > 0) {
      // Split into batches of maxBatchSize
      for (let i = 0; i < categoryNotifications.length; i += maxBatchSize) {
        const batch = categoryNotifications.slice(i, i + maxBatchSize);
        batches.push({
          notifications: batch,
          showTime: now + (i / maxBatchSize) * batchInterval,
          priority: 0.5,
          reason: `Medium/Low urgency, batched by ${category}`,
        });
      }
    }
  }

  // Sort by show time
  return batches.sort((a, b) => a.showTime - b.showTime);
}

// ============================================================================
// TIME-OF-DAY AWARENESS
// ============================================================================

/**
 * Check if current time is within quiet hours
 */
export function isInQuietHours(
  currentHour: number,
  quietHoursStart: number,
  quietHoursEnd: number
): boolean {
  // Handle case where quiet hours span midnight (e.g., 22:00 - 8:00)
  if (quietHoursStart > quietHoursEnd) {
    // Quiet hours: 22:00 to 24:00 AND 0:00 to 8:00
    return currentHour >= quietHoursStart || currentHour < quietHoursEnd;
  } else {
    // Normal case: quiet hours within same day
    return currentHour >= quietHoursStart && currentHour < quietHoursEnd;
  }
}

/**
 * Get notification frequency multiplier based on time of day
 */
export function getTimeOfDayMultiplier(hour: number): number {
  // Early morning (0-6): Very low frequency
  if (hour >= 0 && hour < 6) {
    return 0.2;
  }

  // Morning (6-9): Increasing frequency
  if (hour >= 6 && hour < 9) {
    return 0.6;
  }

  // Work hours (9-17): Full frequency
  if (hour >= 9 && hour < 17) {
    return 1.0;
  }

  // Evening (17-22): Moderate frequency
  if (hour >= 17 && hour < 22) {
    return 0.8;
  }

  // Night (22-24): Low frequency
  return 0.3;
}

/**
 * Calculate ideal show time based on time of day
 */
export function calculateIdealShowTime(
  notification: ProactiveNotification,
  currentHour: number,
  quietHours: { enabled: boolean; start: number; end: number }
): number {
  const now = Date.now();

  // If quiet hours disabled or not critical, can show anytime
  if (!quietHours.enabled || notification.urgency === 'critical') {
    return now;
  }

  // Check if currently in quiet hours
  if (isInQuietHours(currentHour, quietHours.start, quietHours.end)) {
    // Calculate time until quiet hours end
    let hoursUntilEnd: number;

    if (quietHours.start > quietHours.end) {
      // Spans midnight
      if (currentHour >= quietHours.start) {
        // Before midnight
        hoursUntilEnd = (24 - currentHour) + quietHours.end;
      } else {
        // After midnight
        hoursUntilEnd = quietHours.end - currentHour;
      }
    } else {
      // Normal case
      hoursUntilEnd = quietHours.end - currentHour;
    }

    // Wait until quiet hours end
    return now + (hoursUntilEnd * 60 * 60 * 1000);
  }

  return now;
}

// ============================================================================
// CONVERSATION CONTEXT AWARENESS
// ============================================================================

/**
 * Check if notification should wait based on conversation state
 */
export function shouldWaitForConversationState(
  notification: ProactiveNotification,
  context: UserActivityContext
): boolean {
  // If no active conversation, can show
  if (!context.conversationId) {
    return false;
  }

  // Critical notifications always show
  if (notification.urgency === 'critical') {
    return false;
  }

  // High urgency related to current conversation can show
  if (notification.urgency === 'high' &&
      (notification.category === 'agent' || notification.category === 'context')) {
    return false;
  }

  // Medium/low urgency should wait if user is actively engaged
  if (context.timeSinceLastAction < 10000) { // Less than 10 seconds
    return true;
  }

  return false;
}

/**
 * Calculate conversation state priority
 */
export function calculateConversationStatePriority(
  context: UserActivityContext
): number {
  let priority = 0.5;

  // Higher priority if user is idle
  if (context.timeSinceLastAction > 30000) {
    priority += 0.2;
  }

  // Lower priority if active operation
  if (context.hasActiveOperation) {
    priority -= 0.3;
  }

  // Lower priority if typing
  if (context.isTyping) {
    priority -= 0.4;
  }

  return Math.max(0, Math.min(1, priority));
}

// ============================================================================
// USER ACTIVITY TRACKING
// ============================================================================

/**
 * User activity tracker state
 */
interface UserActivityTrackerState {
  /** Last user action timestamp */
  lastActionTime: number;
  /** Whether user is currently typing */
  isTyping: boolean;
  /** Typing start time */
  typingStartTime: number;
  /** Whether there's an active operation */
  hasActiveOperation: boolean;
  /** Operation start time */
  operationStartTime: number;
  /** Recent notification timestamps */
  recentNotifications: number[];
  /** Current conversation ID */
  currentConversationId: string | null;
}

/**
 * User activity tracker
 */
export class UserActivityTracker {
  private state: UserActivityTrackerState = {
    lastActionTime: Date.now(),
    isTyping: false,
    typingStartTime: 0,
    hasActiveOperation: false,
    operationStartTime: 0,
    recentNotifications: [],
    currentConversationId: null,
  };

  /**
   * Record user action
   */
  recordAction(): void {
    this.state.lastActionTime = Date.now();
  }

  /**
   * Start typing
   */
  startTyping(): void {
    if (!this.state.isTyping) {
      this.state.isTyping = true;
      this.state.typingStartTime = Date.now();
    }
  }

  /**
   * Stop typing
   */
  stopTyping(): void {
    this.state.isTyping = false;
    this.state.typingStartTime = 0;
  }

  /**
   * Start operation
   */
  startOperation(): void {
    this.state.hasActiveOperation = true;
    this.state.operationStartTime = Date.now();
  }

  /**
   * End operation
   */
  endOperation(): void {
    this.state.hasActiveOperation = false;
    this.state.operationStartTime = 0;
  }

  /**
   * Record notification shown
   */
  recordNotification(): void {
    const now = Date.now();
    this.state.recentNotifications.push(now);

    // Keep only last hour of notifications
    const oneHourAgo = now - (60 * 60 * 1000);
    this.state.recentNotifications = this.state.recentNotifications.filter(t => t > oneHourAgo);
  }

  /**
   * Set conversation ID
   */
  setConversationId(conversationId: string | null): void {
    this.state.currentConversationId = conversationId;
  }

  /**
   * Get current activity context
   */
  getContext(
    quietHours: { enabled: boolean; start: number; end: number },
    appFocused: boolean
  ): UserActivityContext {
    const now = Date.now();
    const currentHour = new Date(now).getHours();

    return {
      isTyping: this.state.isTyping,
      timeSinceLastAction: now - this.state.lastActionTime,
      conversationId: this.state.currentConversationId,
      hasActiveOperation: this.state.hasActiveOperation,
      timeOfDay: currentHour / 24,
      appFocused,
      recentNotificationCount: this.state.recentNotifications.length,
      inQuietHours: quietHours.enabled &&
                     isInQuietHours(currentHour, quietHours.start, quietHours.end),
    };
  }

  /**
   * Get recent notification count (last hour)
   */
  getRecentNotificationCount(): number {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    return this.state.recentNotifications.filter(t => t > oneHourAgo).length;
  }

  /**
   * Clear state
   */
  clear(): void {
    this.state = {
      lastActionTime: Date.now(),
      isTyping: false,
      typingStartTime: 0,
      hasActiveOperation: false,
      operationStartTime: 0,
      recentNotifications: [],
      currentConversationId: null,
    };
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create global activity tracker instance
 */
const globalTracker = new UserActivityTracker();

/**
 * Get global activity tracker
 */
export function getActivityTracker(): UserActivityTracker {
  return globalTracker;
}

/**
 * Record user action (convenience)
 */
export function recordUserAction(): void {
  globalTracker.recordAction();
}

/**
 * Start typing (convenience)
 */
export function startTyping(): void {
  globalTracker.startTyping();
}

/**
 * Stop typing (convenience)
 */
export function stopTyping(): void {
  globalTracker.stopTyping();
}

/**
 * Start operation (convenience)
 */
export function startOperation(): void {
  globalTracker.startOperation();
}

/**
 * End operation (convenience)
 */
export function endOperation(): void {
  globalTracker.endOperation();
}

/**
 * Record notification (convenience)
 */
export function recordNotificationShown(): void {
  globalTracker.recordNotification();
}

/**
 * Set conversation (convenience)
 */
export function setCurrentConversation(conversationId: string | null): void {
  globalTracker.setConversationId(conversationId);
}
