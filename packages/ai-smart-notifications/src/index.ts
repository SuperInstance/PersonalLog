/**
 * AI Smart Notifications
 *
 * An intelligent notification system that predicts and proactively alerts users
 * about potential issues before they occur, based on system state and predictions.
 */

// Types
export * from './types';

// Core engine
export {
  ProactiveNotificationEngine,
  getNotificationEngine,
  createNotificationEngine,
} from './engine';

// Timing system
export {
  calculateNotificationTiming,
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
} from './timing';
