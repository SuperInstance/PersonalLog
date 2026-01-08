/**
 * AI Smart Notifications System Types
 *
 * Type definitions for smart notifications that predict and alert users
 * about potential issues before they occur, based on system state and predictions.
 */

// ============================================================================
// PREDICTION TYPES (formerly from world-model-types)
// ============================================================================

/**
 * Predicted system state
 */
export interface PredictedState {
  /** Timestamp of prediction */
  timestamp: number;
  /** Predicted values */
  predictions: Record<string, number>;
  /** Confidence in prediction */
  confidence: number;
  /** Time horizon for prediction (ms) */
  timeframe: number;
}

/**
 * Agent need prediction
 */
export interface AgentNeedPrediction {
  /** Agent ID that will be needed */
  agentId: string;
  /** Probability of being needed (0-1) */
  probability: number;
  /** Timeframe until needed (ms) */
  timeframe: number;
  /** Confidence in prediction */
  confidence: number;
  /** Reason for prediction */
  reason: string;
}

/**
 * Resource prediction
 */
export interface ResourcePrediction {
  /** Resource type (cpu, memory, storage, network, etc.) */
  resourceType: string;
  /** Current usage (0-1) */
  currentUsage: number;
  /** Predicted usage (0-1) */
  predictedUsage: number;
  /** Timeframe for prediction (ms) */
  timeframe: number;
  /** Confidence in prediction */
  confidence: number;
  /** Trend direction */
  trend: 'increasing' | 'stable' | 'decreasing';
}

/**
 * Anomaly detection result
 */
export interface AnomalyDetection {
  /** Whether an anomaly was detected */
  isAnomaly: boolean;
  /** Type of anomaly */
  type: string;
  /** Severity (0-1) */
  severity: number;
  /** Description of anomaly */
  description: string;
  /** Suggested actions */
  suggestions: string[];
  /** Confidence in detection */
  confidence: number;
  /** When anomaly was detected */
  timestamp: number;
}

/**
 * Current conversation state
 */
export interface ConversationState {
  /** State ID */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** Conversation ID */
  conversationId: string;
  /** Message count */
  messageCount: number;
  /** Average message length */
  avgMessageLength: number;
  /** Message complexity (0-1) */
  messageComplexity: number;
  /** Total tokens */
  totalTokens: number;
  /** Active agents */
  activeAgents: string[];
  /** Active agent count */
  activeAgentCount: number;
  /** Last used agent */
  lastUsedAgent: string;
  /** Current task type */
  currentTaskType: string;
  /** Task completion rate (0-1) */
  taskCompletionRate: number;
  /** Tasks in progress */
  tasksInProgress: number;
  /** Emotion state */
  emotionState: {
    valence: number;
    arousal: number;
    dominance: number;
    category: string;
    confidence: number;
  };
  /** Emotion trend */
  emotionTrend: 'increasing' | 'stable' | 'decreasing';
  /** Emotion intensity (0-1) */
  emotionIntensity: number;
  /** Current topic */
  currentTopic: string;
  /** Topic confidence (0-1) */
  topicConfidence: number;
  /** Topic shifts count */
  topicShifts: number;
  /** User intent */
  userIntent: string;
  /** Intent confidence (0-1) */
  intentConfidence: number;
  /** Estimated token usage */
  estimatedTokenUsage: number;
  /** Estimated time (ms) */
  estimatedTimeMs: number;
  /** System load (0-1) */
  systemLoad: number;
  /** Time since last message (ms) */
  timeSinceLastMessage: number;
  /** Conversation age (ms) */
  conversationAge: number;
  /** Time of day (0-1) */
  timeOfDay: number;
  /** Message rate (messages/min) */
  messageRate: number;
  /** Token rate (tokens/min) */
  tokenRate: number;
  /** Agent activation rate */
  agentActivationRate: number;
}

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
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
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
  PENDING = 'pending',
  SHOWING = 'showing',
  DISMISSED = 'dismissed',
  ACCEPTED = 'accepted',
  SNOOZED = 'snoozed',
  EXPIRED = 'expired',
  EXECUTED = 'executed',
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
  helpfulnessScore: number;
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
    start: number;
    end: number;
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
  void trigger; // Mark as intentionally unused
  return {
    enabled: true,
    minUrgency: NotificationUrgency.LOW,
    allowDuringQuietHours: false,
    preferredSnoozeDuration: 15 * 60 * 1000,
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
    start: 22,
    end: 8,
  },
  maxNotificationsPerHour: 10,
  notificationFrequencyLimit: 60000,
  batchLowUrgency: true,
  batchInterval: 300000,
  enableLearning: true,
  defaultSnoozeDuration: 15 * 60 * 1000,
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
  void trigger; // Mark as intentionally unused
  return TRIGGER_DEFINITIONS.get(trigger);
}

/**
 * All trigger definitions
 */
export const TRIGGER_DEFINITIONS: Map<NotificationTrigger, NotificationTriggerDefinition> = new Map([
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
    cooldownPeriod: 30 * 60 * 1000,
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
    ],
    estimatedResolutionTime: 30000,
    cooldownPeriod: 60 * 60 * 1000,
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
    ],
    estimatedResolutionTime: 15000,
    cooldownPeriod: 15 * 60 * 1000,
  }],
]);
