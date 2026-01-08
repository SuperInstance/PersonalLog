/**
 * Proactive Notifications System
 *
 * Smart notification system that warns users about predicted issues
 * before they occur based on world model predictions.
 */

// Types
export * from './types';

// Core engine
export {
  getNotificationEngine,
  createNotificationEngine,
  ProactiveNotificationEngine,
} from './proactive-notifications';

// Timing system
export {
  calculateNotificationTiming,
  batchNotifications,
  isInQuietHours,
  getTimeOfDayMultiplier,
  UserActivityTracker,
  getActivityTracker,
  recordUserAction,
  startTyping,
  stopTyping,
  startOperation,
  endOperation,
  recordNotificationShown,
  setCurrentConversation,
} from './notification-timing';
