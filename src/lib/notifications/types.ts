/**
 * Proactive Notification System Types
 *
 * Types for smart notifications that warn users about predicted issues
 * before they occur, based on world model predictions.
 */

import type { PredictedState, AgentNeedPrediction, ResourcePrediction, AnomalyDetection } from '@/lib/intelligence/world-model-types';

// ============================================================================
// NOTIFICATION TRIGGERS
// ============================================================================

/**
 * Notification trigger types
 */
export const enum NotificationTrigger {
  // Performance triggers
  HIGH_CPU_PREDICTED = 'high_cpu_predicted',
  HIGH_MEMORY_PREDICTED = 'high_memory_predicted',
  STORAGE_FULL_PREDICTED = 'storage_full_predicted',
  PERFORMANCE_DEGRADING = 'performance_degrading',

  // Resource triggers
  BATTERY_LOW_PREDICTED = 'battery_low_predicted',
  NETWORK_DEGRADING_PREDICTED = 'network_degrading_predicted',
  TOKEN_USAGE_HIGH = 'token_usage_high',

  // Agent triggers
 _AGENT_NEEDED_SOON = 'agent_needed_soon',
  AGENT_READY = 'agent_ready',

  // Context triggers
  TASK_BLOCKING_PREDICTED = 'task_blocking_predicted',
  CONTEXT_TOO_LONG = 'context_too_long',

  // User state triggers
  USER_FRUSTRATION_DETECTED = 'user_frustration_detected',
  INACTIVITY_TIMEOUT = 'inactivity_timeout',

  // Suggestion triggers
  FEATURE_SUGGESTION = 'feature_suggestion',
  OPTIMIZATION_SUGGESTION = 'optimization_suggestion',
  BACKUP_NEEDED = 'backup_needed',

  // System triggers
  UPDATE_AVAILABLE = 'update_available',
  ERROR_RECOVERY_SUGGESTION = 'error_recovery_suggestion',
}

/**
 * Array of all notification trigger values
 * Use this instead of Object.values(NotificationTrigger) for const enums
 */
export const ALL_NOTIFICATION_TRIGGERS: NotificationTrigger[] = [
  NotificationTrigger.HIGH_CPU_PREDICTED,
  NotificationTrigger.HIGH_MEMORY_PREDICTED,
  NotificationTrigger.STORAGE_FULL_PREDICTED,
  NotificationTrigger.PERFORMANCE_DEGRADING,
  NotificationTrigger.BATTERY_LOW_PREDICTED,
  NotificationTrigger.NETWORK_DEGRADING_PREDICTED,
  NotificationTrigger.TOKEN_USAGE_HIGH,
  NotificationTrigger._AGENT_NEEDED_SOON,
  NotificationTrigger.AGENT_READY,
  NotificationTrigger.TASK_BLOCKING_PREDICTED,
  NotificationTrigger.CONTEXT_TOO_LONG,
  NotificationTrigger.USER_FRUSTRATION_DETECTED,
  NotificationTrigger.INACTIVITY_TIMEOUT,
  NotificationTrigger.FEATURE_SUGGESTION,
  NotificationTrigger.OPTIMIZATION_SUGGESTION,
  NotificationTrigger.BACKUP_NEEDED,
  NotificationTrigger.UPDATE_AVAILABLE,
  NotificationTrigger.ERROR_RECOVERY_SUGGESTION,
];

/**
 * Notification urgency levels
 */
export const enum NotificationUrgency {
  LOW = 'low',       // Nice to know, can wait
  MEDIUM = 'medium', // Should address soon
  HIGH = 'high',     // Address now to prevent issues
  CRITICAL = 'critical', // Immediate action required
}

/**
 * Notification action types
 */
export const enum NotificationActionType {
  ENABLE_FEATURE = 'enable_feature',
  DISABLE_FEATURE = 'disable_feature',
  ADJUST_SETTING = 'adjust_setting',
  CLEAR_CACHE = 'clear_cache',
  PREFETCH_DATA = 'prefetch_data',
  PRELOAD_AGENT = 'preload_agent',
  START_BACKUP = 'start_backup',
  APPLY_FIX = 'apply_fix',
  DISMISS = 'dismiss',
  SNOOZE = 'snooze',
  CUSTOM = 'custom',
}

// ============================================================================
// NOTIFICATION DEFINITIONS
// ============================================================================

/**
 * Proactive notification
 */
export interface ProactiveNotification {
  /** Unique notification ID */
  id: string;
  /** Notification trigger type */
  trigger: NotificationTrigger;
  /** Notification title */
  title: string;
  /** Notification message */
  message: string;
  /** Urgency level */
  urgency: NotificationUrgency;
  /** When this notification was created */
  createdAt: number;
  /** When this notification should expire */
  expiresAt: number;
  /** Notification status */
  status: NotificationStatus;
  /** Confidence in prediction (0-1) */
  confidence: number;
  /** Timeframe for predicted issue (ms from now) */
  timeframe: number;
  /** Impact if action not taken */
  impact: string;
  /** Suggested actions */
  actions: NotificationAction[];
  /** Related prediction data */
  prediction?: PredictedState | AgentNeedPrediction | ResourcePrediction | AnomalyDetection;
  /** User feedback */
  feedback?: NotificationFeedback;
  /** Number of times shown */
  shownCount: number;
  /** Last shown timestamp */
  lastShown?: number;
  /** Notification category */
  category: NotificationCategory;
  /** Whether notification requires user action */
  requiresAction: boolean;
  /** Estimated time to resolve (ms) */
  estimatedResolutionTime?: number;
}

/**
 * Notification status
 */
export const enum NotificationStatus {
  PENDING = 'pending',       // Waiting to be shown
  SHOWING = 'showing',       // Currently displayed
  DISMISSED = 'dismissed',   // User dismissed
  ACCEPTED = 'accepted',     // User accepted action
  SNOOZED = 'snoozed',       // User snoozed
  EXPIRED = 'expired',       // Expired before action
  EXECUTED = 'executed',     // Action executed
}

/**
 * Notification action
 */
export interface NotificationAction {
  /** Action ID */
  id: string;
  /** Action type */
  type: NotificationActionType;
  /** Action label (button text) */
  label: string;
  /** Action description */
  description?: string;
  /** Whether this is the primary action */
  primary: boolean;
  /** Target for action (feature ID, setting path, etc.) */
  target?: string;
  /** Action value (if setting adjustment) */
  value?: unknown;
  /** Estimated time to complete (ms) */
  estimatedTime?: number;
  /** Whether action is reversible */
  reversible?: boolean;
}

/**
 * Notification category
 */
export const enum NotificationCategory {
  PERFORMANCE = 'performance',
  RESOURCE = 'resource',
  AGENT = 'agent',
  CONTEXT = 'context',
  USER_STATE = 'user_state',
  SUGGESTION = 'suggestion',
  SYSTEM = 'system',
}

/**
 * Notification feedback
 */
export interface NotificationFeedback {
  /** Whether user found this helpful */
  helpful: boolean;
  /** Feedback timestamp */
  timestamp: number;
  /** Optional comment */
  comment?: string;
  /** Which action user took */
  actionTaken?: NotificationActionType;
}

// ============================================================================
// NOTIFICATION QUEUE
// ============================================================================

/**
 * Notification queue entry
 */
export interface NotificationQueueEntry {
  /** Notification */
  notification: ProactiveNotification;
  /** Priority score (0-1) */
  priority: number;
  /** Whether notification can be shown now */
  canShow: boolean;
  /** Reason notification can't be shown (if applicable) */
  blockedReason?: string;
  /** Recommended show time */
  recommendedShowTime: number;
}

/**
 * Notification queue statistics
 */
export interface NotificationQueueStats {
  /** Total pending notifications */
  totalPending: number;
  /** Breakdown by urgency */
  byUrgency: Record<NotificationUrgency, number>;
  /** Breakdown by category */
  byCategory: Record<NotificationCategory, number>;
  /** Average confidence */
  avgConfidence: number;
  /** Highest priority notification */
  highestPriority?: NotificationQueueEntry;
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

/**
 * Per-notification-type preferences
 */
export interface NotificationPreferences {
  /** Whether notifications of this type are enabled */
  enabled: boolean;
  /** Minimum urgency threshold */
  minUrgency: NotificationUrgency;
  /** Whether to show notifications during quiet hours */
  allowDuringQuietHours: boolean;
  /** Preferred snooze duration (ms) */
  preferredSnoozeDuration: number;
  /** Whether notification was helpful (learning) */
  helpfulnessScore: number; // -1 (not helpful) to 1 (helpful)
  /** How many times user has acted on this type */
  actionCount: number;
  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * Global notification settings
 */
export interface NotificationSettings {
  /** Whether proactive notifications are enabled */
  enabled: boolean;
  /** Per-type preferences */
  preferences: Record<NotificationTrigger, NotificationPreferences>;
  /** Quiet hours (start and end in hours 0-23) */
  quietHours: {
    enabled: boolean;
    start: number; // 0-23
    end: number;   // 0-23
  };
  /** Maximum notifications per hour */
  maxNotificationsPerHour: number;
  /** Notification frequency limit (ms between notifications) */
  notificationFrequencyLimit: number;
  /** Whether to show less-critical notifications in batches */
  batchLowUrgency: boolean;
  /** Batch interval (ms) */
  batchInterval: number;
  /** Whether to learn from user feedback */
  enableLearning: boolean;
  /** Default snooze duration (ms) */
  defaultSnoozeDuration: number;
}

/**
 * Default notification preferences for a trigger type
 */
export function getDefaultNotificationPreferences(trigger: NotificationTrigger): NotificationPreferences {
  return {
    enabled: true,
    minUrgency: NotificationUrgency.LOW,
    allowDuringQuietHours: false,
    preferredSnoozeDuration: 15 * 60 * 1000, // 15 minutes
    helpfulnessScore: 0,
    actionCount: 0,
    lastUpdated: Date.now(),
  };
}

/**
 * Default notification settings
 */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  preferences: {} as Record<NotificationTrigger, NotificationPreferences>,
  quietHours: {
    enabled: true,
    start: 22, // 10 PM
    end: 8,    // 8 AM
  },
  maxNotificationsPerHour: 10,
  notificationFrequencyLimit: 60000, // 1 minute
  batchLowUrgency: true,
  batchInterval: 300000, // 5 minutes
  enableLearning: true,
  defaultSnoozeDuration: 15 * 60 * 1000, // 15 minutes
};

// ============================================================================
// NOTIFICATION TIMING
// ============================================================================

/**
 * User activity context for timing decisions
 */
export interface UserActivityContext {
  /** Whether user is currently typing */
  isTyping: boolean;
  /** Time since last user action (ms) */
  timeSinceLastAction: number;
  /** Current conversation ID */
  conversationId: string | null;
  /** Whether there's an active agent operation */
  hasActiveOperation: boolean;
  /** Time of day (0-1, normalized) */
  timeOfDay: number;
  /** Current app focus state */
  appFocused: boolean;
  /** Recent notification count (last hour) */
  recentNotificationCount: number;
  /** Whether user is in quiet hours */
  inQuietHours: boolean;
  /** User's current emotional state (if known) */
  emotionalState?: 'focused' | 'relaxed' | 'frustrated' | 'stressed';
}

/**
 * Timing recommendation
 */
export interface TimingRecommendation {
  /** Whether notification should be shown now */
  showNow: boolean;
  /** Recommended show time (if not now) */
  recommendedTime: number;
  /** Reason for timing decision */
  reason: string;
  /** Confidence in timing recommendation (0-1) */
  confidence: number;
}

// ============================================================================
// NOTIFICATION HISTORY
// ============================================================================

/**
 * Notification history entry
 */
export interface NotificationHistoryEntry {
  /** Notification ID */
  id: string;
  /** Trigger type */
  trigger: NotificationTrigger;
  /** Timestamp shown */
  shownAt: number;
  /** User action */
  action?: NotificationActionType;
  /** Time to action (ms) */
  timeToAction?: number;
  /** User feedback */
  feedback?: NotificationFeedback;
  /** Whether action prevented the predicted issue */
  issuePrevented?: boolean;
}

/**
 * Notification effectiveness metrics
 */
export interface NotificationEffectivenessMetrics {
  /** Total notifications shown */
  totalShown: number;
  /** Total notifications acted upon */
  totalActedUpon: number;
  /** Action rate (0-1) */
  actionRate: number;
  /** Issues prevented */
  issuesPrevented: number;
  /** Prevention rate (0-1) */
  preventionRate: number;
  /** Average helpfulness score (0-1) */
  avgHelpfulness: number;
  /** Breakdown by trigger type */
  byTrigger: Record<NotificationTrigger, {
    shown: number;
    actedUpon: number;
    prevented: number;
    helpfulness: number;
  }>;
}

// ============================================================================
// TRIGGER DEFINITIONS
// ============================================================================

/**
 * Notification trigger definition
 */
export interface NotificationTriggerDefinition {
  /** Trigger type */
  trigger: NotificationTrigger;
  /** Trigger name */
  name: string;
  /** Trigger description */
  description: string;
  /** Default urgency */
  defaultUrgency: NotificationUrgency;
  /** Trigger category */
  category: NotificationCategory;
  /** Whether trigger requires immediate action */
  requiresAction: boolean;
  /** Default actions for this trigger */
  defaultActions: NotificationAction[];
  /** Estimated time to resolve (ms) */
  estimatedResolutionTime: number;
  /** Cooldown period before showing again (ms) */
  cooldownPeriod: number;
}

/**
 * Get trigger definition
 */
export function getTriggerDefinition(trigger: NotificationTrigger): NotificationTriggerDefinition | undefined {
  return TRIGGER_DEFINITIONS.get(trigger);
}

/**
 * All trigger definitions
 */
export const TRIGGER_DEFINITIONS: Map<NotificationTrigger, NotificationTriggerDefinition> = new Map([
  // Performance triggers
  [NotificationTrigger.HIGH_CPU_PREDICTED, {
    trigger: NotificationTrigger.HIGH_CPU_PREDICTED,
    name: 'High CPU Usage Predicted',
    description: 'CPU usage is predicted to be high in the near future',
    defaultUrgency: NotificationUrgency.MEDIUM,
    category: NotificationCategory.PERFORMANCE,
    requiresAction: false,
    defaultActions: [
      {
        id: 'reduce_quality',
        type: NotificationActionType.ADJUST_SETTING,
        label: 'Reduce Quality',
        description: 'Lower processing quality to reduce CPU load',
        primary: true,
        target: 'quality',
        value: 'low',
        reversible: true,
      },
      {
        id: 'disable_animations',
        type: NotificationActionType.DISABLE_FEATURE,
        label: 'Disable Animations',
        description: 'Temporarily disable UI animations',
        primary: false,
        target: 'ui.animations',
        reversible: true,
      },
    ],
    estimatedResolutionTime: 5000,
    cooldownPeriod: 30 * 60 * 1000, // 30 minutes
  }],
  [NotificationTrigger.HIGH_MEMORY_PREDICTED, {
    trigger: NotificationTrigger.HIGH_MEMORY_PREDICTED,
    name: 'High Memory Usage Predicted',
    description: 'Memory usage is predicted to be high',
    defaultUrgency: NotificationUrgency.MEDIUM,
    category: NotificationCategory.PERFORMANCE,
    requiresAction: false,
    defaultActions: [
      {
        id: 'clear_cache',
        type: NotificationActionType.CLEAR_CACHE,
        label: 'Clear Cache',
        description: 'Free up memory by clearing cached data',
        primary: true,
        reversible: false,
      },
      {
        id: 'disable_feature',
        type: NotificationActionType.DISABLE_FEATURE,
        label: 'Disable Heavy Features',
        description: 'Temporarily disable memory-intensive features',
        primary: false,
        target: 'ai.multimodal',
        reversible: true,
      },
    ],
    estimatedResolutionTime: 10000,
    cooldownPeriod: 30 * 60 * 1000,
  }],
  [NotificationTrigger.STORAGE_FULL_PREDICTED, {
    trigger: NotificationTrigger.STORAGE_FULL_PREDICTED,
    name: 'Storage Full Predicted',
    description: 'Local storage is running low',
    defaultUrgency: NotificationUrgency.HIGH,
    category: NotificationCategory.RESOURCE,
    requiresAction: true,
    defaultActions: [
      {
        id: 'clear_old_data',
        type: NotificationActionType.CLEAR_CACHE,
        label: 'Clear Old Data',
        description: 'Remove old conversation history',
        primary: true,
        reversible: false,
      },
      {
        id: 'start_backup',
        type: NotificationActionType.START_BACKUP,
        label: 'Backup & Clear',
        description: 'Create backup and clear local storage',
        primary: false,
        estimatedTime: 60000,
        reversible: false,
      },
    ],
    estimatedResolutionTime: 30000,
    cooldownPeriod: 60 * 60 * 1000, // 1 hour
  }],
  [NotificationTrigger.PERFORMANCE_DEGRADING, {
    trigger: NotificationTrigger.PERFORMANCE_DEGRADING,
    name: 'Performance Degrading',
    description: 'System performance is gradually decreasing',
    defaultUrgency: NotificationUrgency.MEDIUM,
    category: NotificationCategory.PERFORMANCE,
    requiresAction: false,
    defaultActions: [
      {
        id: 'reduce_quality',
        type: NotificationActionType.ADJUST_SETTING,
        label: 'Optimize Settings',
        description: 'Automatically adjust settings for better performance',
        primary: true,
        reversible: true,
      },
    ],
    estimatedResolutionTime: 15000,
    cooldownPeriod: 20 * 60 * 1000,
  }],

  // Resource triggers
  [NotificationTrigger.BATTERY_LOW_PREDICTED, {
    trigger: NotificationTrigger.BATTERY_LOW_PREDICTED,
    name: 'Battery Low Predicted',
    description: 'Battery is predicted to be low soon',
    defaultUrgency: NotificationUrgency.MEDIUM,
    category: NotificationCategory.RESOURCE,
    requiresAction: false,
    defaultActions: [
      {
        id: 'enable_powersaving',
        type: NotificationActionType.ENABLE_FEATURE,
        label: 'Enable Power Saving',
        description: 'Reduce resource consumption to extend battery',
        primary: true,
        target: 'powersaving',
        reversible: true,
      },
    ],
    estimatedResolutionTime: 5000,
    cooldownPeriod: 30 * 60 * 1000,
  }],
  [NotificationTrigger.NETWORK_DEGRADING_PREDICTED, {
    trigger: NotificationTrigger.NETWORK_DEGRADING_PREDICTED,
    name: 'Network Degrading Predicted',
    description: 'Network connection quality is degrading',
    defaultUrgency: NotificationUrgency.MEDIUM,
    category: NotificationCategory.RESOURCE,
    requiresAction: false,
    defaultActions: [
      {
        id: 'prefetch',
        type: NotificationActionType.PREFETCH_DATA,
        label: 'Prefetch Data',
        description: 'Download necessary data now while connection is good',
        primary: true,
        reversible: false,
      },
    ],
    estimatedResolutionTime: 10000,
    cooldownPeriod: 15 * 60 * 1000,
  }],
  [NotificationTrigger.TOKEN_USAGE_HIGH, {
    trigger: NotificationTrigger.TOKEN_USAGE_HIGH,
    name: 'High Token Usage',
    description: 'Token usage is unusually high',
    defaultUrgency: NotificationUrgency.LOW,
    category: NotificationCategory.RESOURCE,
    requiresAction: false,
    defaultActions: [
      {
        id: 'compress_context',
        type: NotificationActionType.CUSTOM,
        label: 'Compress Context',
        description: 'Reduce conversation context size',
        primary: true,
        reversible: false,
      },
    ],
    estimatedResolutionTime: 5000,
    cooldownPeriod: 10 * 60 * 1000,
  }],

  // Agent triggers
  [NotificationTrigger._AGENT_NEEDED_SOON, {
    trigger: NotificationTrigger._AGENT_NEEDED_SOON,
    name: 'Agent Needed Soon',
    description: 'An AI agent will likely be needed soon',
    defaultUrgency: NotificationUrgency.LOW,
    category: NotificationCategory.AGENT,
    requiresAction: false,
    defaultActions: [
      {
        id: 'preload_agent',
        type: NotificationActionType.PRELOAD_AGENT,
        label: 'Preload Agent',
        description: 'Prepare agent in advance for faster response',
        primary: true,
        reversible: false,
        estimatedTime: 5000,
      },
    ],
    estimatedResolutionTime: 5000,
    cooldownPeriod: 5 * 60 * 1000,
  }],
  [NotificationTrigger.AGENT_READY, {
    trigger: NotificationTrigger.AGENT_READY,
    name: 'Agent Ready',
    description: 'Requested agent is ready to use',
    defaultUrgency: NotificationUrgency.LOW,
    category: NotificationCategory.AGENT,
    requiresAction: false,
    defaultActions: [
      {
        id: 'start_agent',
        type: NotificationActionType.CUSTOM,
        label: 'Start Conversation',
        description: 'Begin using the agent now',
        primary: true,
        reversible: false,
      },
    ],
    estimatedResolutionTime: 0,
    cooldownPeriod: 0,
  }],

  // Context triggers
  [NotificationTrigger.TASK_BLOCKING_PREDICTED, {
    trigger: NotificationTrigger.TASK_BLOCKING_PREDICTED,
    name: 'Task Blocking Predicted',
    description: 'Current task may block soon due to resource limits',
    defaultUrgency: NotificationUrgency.HIGH,
    category: NotificationCategory.CONTEXT,
    requiresAction: true,
    defaultActions: [
      {
        id: 'adjust_task',
        type: NotificationActionType.CUSTOM,
        label: 'Adjust Task',
        description: 'Modify task parameters to continue',
        primary: true,
        reversible: false,
      },
    ],
    estimatedResolutionTime: 10000,
    cooldownPeriod: 20 * 60 * 1000,
  }],
  [NotificationTrigger.CONTEXT_TOO_LONG, {
    trigger: NotificationTrigger.CONTEXT_TOO_LONG,
    name: 'Context Too Long',
    description: 'Conversation context is becoming too long',
    defaultUrgency: NotificationUrgency.MEDIUM,
    category: NotificationCategory.CONTEXT,
    requiresAction: false,
    defaultActions: [
      {
        id: 'summarize',
        type: NotificationActionType.CUSTOM,
        label: 'Summarize',
        description: 'Create a summary of the conversation',
        primary: true,
        reversible: false,
      },
      {
        id: 'archive',
        type: NotificationActionType.CUSTOM,
        label: 'Archive Old Messages',
        description: 'Archive older messages to reduce context',
        primary: false,
        reversible: false,
      },
    ],
    estimatedResolutionTime: 15000,
    cooldownPeriod: 15 * 60 * 1000,
  }],

  // User state triggers
  [NotificationTrigger.USER_FRUSTRATION_DETECTED, {
    trigger: NotificationTrigger.USER_FRUSTRATION_DETECTED,
    name: 'User Frustration Detected',
    description: 'User seems frustrated, offering assistance',
    defaultUrgency: NotificationUrgency.LOW,
    category: NotificationCategory.USER_STATE,
    requiresAction: false,
    defaultActions: [
      {
        id: 'offer_help',
        type: NotificationActionType.CUSTOM,
        label: 'Offer Help',
        description: 'Show suggestions to resolve current issue',
        primary: true,
        reversible: false,
      },
    ],
    estimatedResolutionTime: 0,
    cooldownPeriod: 30 * 60 * 1000,
  }],
  [NotificationTrigger.INACTIVITY_TIMEOUT, {
    trigger: NotificationTrigger.INACTIVITY_TIMEOUT,
    name: 'Inactivity Timeout',
    description: 'No activity detected for a while',
    defaultUrgency: NotificationUrgency.LOW,
    category: NotificationCategory.USER_STATE,
    requiresAction: false,
    defaultActions: [
      {
        id: 'resume',
        type: NotificationActionType.CUSTOM,
        label: 'Resume',
        description: 'Continue where you left off',
        primary: true,
        reversible: false,
      },
    ],
    estimatedResolutionTime: 0,
    cooldownPeriod: 60 * 60 * 1000,
  }],

  // Suggestion triggers
  [NotificationTrigger.FEATURE_SUGGESTION, {
    trigger: NotificationTrigger.FEATURE_SUGGESTION,
    name: 'Feature Suggestion',
    description: 'Suggesting a feature that might be useful',
    defaultUrgency: NotificationUrgency.LOW,
    category: NotificationCategory.SUGGESTION,
    requiresAction: false,
    defaultActions: [
      {
        id: 'enable_feature',
        type: NotificationActionType.ENABLE_FEATURE,
        label: 'Try It',
        description: 'Enable the suggested feature',
        primary: true,
        reversible: true,
      },
      {
        id: 'dismiss',
        type: NotificationActionType.DISMISS,
        label: 'Not Interested',
        description: 'Don\'t show this suggestion again',
        primary: false,
        reversible: false,
      },
    ],
    estimatedResolutionTime: 5000,
    cooldownPeriod: 7 * 24 * 60 * 60 * 1000, // 1 week
  }],
  [NotificationTrigger.OPTIMIZATION_SUGGESTION, {
    trigger: NotificationTrigger.OPTIMIZATION_SUGGESTION,
    name: 'Optimization Suggestion',
    description: 'Suggestion to improve performance or experience',
    defaultUrgency: NotificationUrgency.LOW,
    category: NotificationCategory.SUGGESTION,
    requiresAction: false,
    defaultActions: [
      {
        id: 'apply_optimization',
        type: NotificationActionType.APPLY_FIX,
        label: 'Apply',
        description: 'Apply the suggested optimization',
        primary: true,
        reversible: true,
      },
    ],
    estimatedResolutionTime: 10000,
    cooldownPeriod: 24 * 60 * 60 * 1000, // 1 day
  }],
  [NotificationTrigger.BACKUP_NEEDED, {
    trigger: NotificationTrigger.BACKUP_NEEDED,
    name: 'Backup Needed',
    description: 'It\'s time to create a backup',
    defaultUrgency: NotificationUrgency.MEDIUM,
    category: NotificationCategory.SUGGESTION,
    requiresAction: false,
    defaultActions: [
      {
        id: 'start_backup',
        type: NotificationActionType.START_BACKUP,
        label: 'Backup Now',
        description: 'Create a backup of your data',
        primary: true,
        estimatedTime: 60000,
        reversible: false,
      },
      {
        id: 'snooze',
        type: NotificationActionType.SNOOZE,
        label: 'Remind Later',
        description: 'Remind me again later',
        primary: false,
        reversible: false,
      },
    ],
    estimatedResolutionTime: 60000,
    cooldownPeriod: 24 * 60 * 60 * 1000, // 1 day
  }],

  // System triggers
  [NotificationTrigger.UPDATE_AVAILABLE, {
    trigger: NotificationTrigger.UPDATE_AVAILABLE,
    name: 'Update Available',
    description: 'A new update is available',
    defaultUrgency: NotificationUrgency.LOW,
    category: NotificationCategory.SYSTEM,
    requiresAction: false,
    defaultActions: [
      {
        id: 'update',
        type: NotificationActionType.CUSTOM,
        label: 'Update Now',
        description: 'Apply the update',
        primary: true,
        reversible: false,
      },
      {
        id: 'snooze',
        type: NotificationActionType.SNOOZE,
        label: 'Later',
        description: 'Remind me later',
        primary: false,
        reversible: false,
      },
    ],
    estimatedResolutionTime: 30000,
    cooldownPeriod: 24 * 60 * 60 * 1000,
  }],
  [NotificationTrigger.ERROR_RECOVERY_SUGGESTION, {
    trigger: NotificationTrigger.ERROR_RECOVERY_SUGGESTION,
    name: 'Error Recovery Suggestion',
    description: 'Suggestion to recover from an error',
    defaultUrgency: NotificationUrgency.HIGH,
    category: NotificationCategory.SYSTEM,
    requiresAction: true,
    defaultActions: [
      {
        id: 'apply_fix',
        type: NotificationActionType.APPLY_FIX,
        label: 'Apply Fix',
        description: 'Apply the suggested fix',
        primary: true,
        reversible: false,
      },
      {
        id: 'dismiss',
        type: NotificationActionType.DISMISS,
        label: 'Ignore',
        description: 'Dismiss this suggestion',
        primary: false,
        reversible: false,
      },
    ],
    estimatedResolutionTime: 15000,
    cooldownPeriod: 60 * 60 * 1000,
  }],
]);
