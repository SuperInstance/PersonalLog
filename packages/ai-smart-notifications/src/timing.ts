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
} from './types';

// ============================================================================
// TIMING ENGINE
// ============================================================================

/**
 * Calculate optimal timing for notification
 */
export function calculateNotificationTiming(
  notification: ProactiveNotification,
  context: UserActivityContext
): TimingRecommendation {
  const reasons: string[] = [];
  let canShow = true;
  let recommendedDelay = 0;

  const maxWaitForCriticalUrgency = 1000;
  const maxWaitForHighUrgency = 5000;
  const minPauseBeforeNotification = 2000;
  const typingActivityWindow = 5000;

  // 1. Check urgency - critical and high urgency show sooner
  if (notification.urgency === 'critical') {
    recommendedDelay = Math.min(recommendedDelay, maxWaitForCriticalUrgency);
    reasons.push('Critical urgency');
  } else if (notification.urgency === 'high') {
    recommendedDelay = Math.min(recommendedDelay, maxWaitForHighUrgency);
    reasons.push('High urgency');
  }

  // 2. Check if user is typing - wait for pause
  if (context.isTyping) {
    canShow = false;
    recommendedDelay = Math.max(recommendedDelay, typingActivityWindow);
    reasons.push('User is typing, waiting for pause');
  }

  // 3. Check time since last action - wait for natural pause
  if (context.timeSinceLastAction < minPauseBeforeNotification) {
    canShow = false;
    const waitTime = minPauseBeforeNotification - context.timeSinceLastAction;
    recommendedDelay = Math.max(recommendedDelay, waitTime);
    reasons.push(`Waiting for pause in user activity (${waitTime}ms remaining)`);
  }

  // 4. Check active operations - wait for completion
  if (context.hasActiveOperation) {
    canShow = false;
    recommendedDelay = Math.max(recommendedDelay, 1000);
    reasons.push('Waiting for active operation to complete');
  }

  // 5. Check app focus
  if (!context.appFocused) {
    canShow = false;
    reasons.push('App not focused');
  }

  // 6. Check notification frequency limit
  if (context.recentNotificationCount >= 5) {
    canShow = false;
    recommendedDelay = Math.max(recommendedDelay, 60000);
    reasons.push('Too many recent notifications, cooling down');
  }

  // 7. Check quiet hours
  if (context.inQuietHours) {
    canShow = false;
    reasons.push('In quiet hours');
    if (notification.urgency !== 'critical') {
      return {
        showNow: false,
        recommendedTime: Date.now() + (8 * 60 * 60 * 1000),
        reason: 'Deferring until quiet hours end (8:00 AM)',
        confidence: 0.9,
      };
    }
  }

  // 8. Check emotional state
  if (context.emotionalState === 'frustrated' || context.emotionalState === 'stressed') {
    if (notification.urgency !== 'critical' && notification.urgency !== 'high') {
      const _canShow = false; // Mark as intentionally unused for now
      void _canShow;
      recommendedDelay = Math.max(recommendedDelay, 30000);
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
  _canShow: boolean
): number {
  void _canShow; // Mark as intentionally unused
  let confidence = 0.5;

  if (context.timeSinceLastAction > 10000) {
    confidence += 0.2;
  }

  if (!context.hasActiveOperation) {
    confidence += 0.1;
  }

  if (context.appFocused) {
    confidence += 0.1;
  }

  if (notification.urgency === 'critical' || notification.urgency === 'high') {
    confidence += 0.2;
  }

  if (context.isTyping) {
    confidence -= 0.3;
  }

  if (context.recentNotificationCount > 3) {
    confidence -= 0.1;
  }

  if (context.inQuietHours) {
    confidence -= 0.2;
  }

  return Math.max(0, Math.min(1, confidence));
}

// ============================================================================
// USER ACTIVITY TRACKING
// ============================================================================

/**
 * User activity tracker state
 */
interface UserActivityTrackerState {
  lastActionTime: number;
  isTyping: boolean;
  typingStartTime: number;
  hasActiveOperation: boolean;
  operationStartTime: number;
  recentNotifications: number[];
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

  recordAction(): void {
    this.state.lastActionTime = Date.now();
  }

  startTyping(): void {
    if (!this.state.isTyping) {
      this.state.isTyping = true;
      this.state.typingStartTime = Date.now();
    }
  }

  stopTyping(): void {
    this.state.isTyping = false;
    this.state.typingStartTime = 0;
  }

  startOperation(): void {
    this.state.hasActiveOperation = true;
    this.state.operationStartTime = Date.now();
  }

  endOperation(): void {
    this.state.hasActiveOperation = false;
    this.state.operationStartTime = 0;
  }

  recordNotification(): void {
    const now = Date.now();
    this.state.recentNotifications.push(now);

    const oneHourAgo = now - (60 * 60 * 1000);
    this.state.recentNotifications = this.state.recentNotifications.filter(t => t > oneHourAgo);
  }

  setConversationId(conversationId: string | null): void {
    this.state.currentConversationId = conversationId;
  }

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

  getRecentNotificationCount(): number {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    return this.state.recentNotifications.filter(t => t > oneHourAgo).length;
  }

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

/**
 * Check if current time is within quiet hours
 */
export function isInQuietHours(
  currentHour: number,
  quietHoursStart: number,
  quietHoursEnd: number
): boolean {
  if (quietHoursStart > quietHoursEnd) {
    return currentHour >= quietHoursStart || currentHour < quietHoursEnd;
  } else {
    return currentHour >= quietHoursStart && currentHour < quietHoursEnd;
  }
}

/**
 * Get notification frequency multiplier based on time of day
 */
export function getTimeOfDayMultiplier(hour: number): number {
  if (hour >= 0 && hour < 6) {
    return 0.2;
  }
  if (hour >= 6 && hour < 9) {
    return 0.6;
  }
  if (hour >= 9 && hour < 17) {
    return 1.0;
  }
  if (hour >= 17 && hour < 22) {
    return 0.8;
  }
  return 0.3;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

const globalTracker = new UserActivityTracker();

export function getActivityTracker(): UserActivityTracker {
  return globalTracker;
}

export function recordUserAction(): void {
  globalTracker.recordAction();
}

export function startTyping(): void {
  globalTracker.startTyping();
}

export function stopTyping(): void {
  globalTracker.stopTyping();
}

export function startOperation(): void {
  globalTracker.startOperation();
}

export function endOperation(): void {
  globalTracker.endOperation();
}

export function recordNotificationShown(): void {
  globalTracker.recordNotification();
}

export function setCurrentConversation(conversationId: string | null): void {
  globalTracker.setConversationId(conversationId);
}
