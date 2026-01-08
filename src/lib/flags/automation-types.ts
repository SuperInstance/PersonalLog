/**
 * Feature Flag Automation Types
 *
 * Defines types for automated feature flag management based on world model predictions.
 * Enables proactive feature enable/disable decisions to optimize resource usage.
 */

import type { PredictedState, ResourcePrediction } from '@/lib/intelligence/world-model-types';

// ============================================================================
// AUTOMATION FLAG STATE
// ============================================================================

/**
 * Automation flag states
 * Extends basic feature states with automation-aware modes
 */
export type AutomationFlagState =
  | 'enabled'      // Feature is active
  | 'disabled'     // Feature is inactive
  | 'auto'         // Automation controls the flag
  | 'forced'       // User manually enabled (automation ignores)
  | 'blocked';     // User manually disabled (automation ignores)

// ============================================================================
// FLAG CONDITION TYPES
// ============================================================================

/**
 * Condition types for automation triggers
 */
export type ConditionType =
  | 'cpu_usage'          // CPU usage percentage (0-100)
  | 'memory_usage'       // Memory usage percentage (0-100)
  | 'battery_level'      // Battery level percentage (0-100)
  | 'battery_charging'   // Whether battery is charging
  | 'network_speed'      // Network speed in Mbps
  | 'network_online'     // Whether network is online
  | 'token_usage'        // Predicted token usage
  | 'time_to_complete'   // Predicted time to complete (ms)
  | 'confidence'         // Prediction confidence (0-1)
  | 'system_load'        // System load (0-1)
  | 'user_intent'        // User intent state
  | 'emotion_state'      // Emotion state
  | 'time_of_day'        // Time of day (0-1)
  | 'conversation_age'   // Conversation age in ms
  | 'message_rate'       // Message rate (msgs/min)
  | 'active_agents'      // Number of active agents
  | 'performance_impact' // Feature performance impact
  | 'storage_usage'      // Storage usage (GB)
  | 'custom';            // Custom condition

/**
 * Comparison operators for conditions
 */
export type ComparisonOperator =
  | 'greater_than'       // >
  | 'less_than'          // <
  | 'greater_equal'      // >=
  | 'less_equal'         // <=
  | 'equals'             // ==
  | 'not_equals'         // !=
  | 'contains'           // string contains
  | 'not_contains'       // string does not contain
  | 'in'                 // value in array
  | 'not_in';            // value not in array

/**
 * Single condition for automation trigger
 */
export interface FlagCondition {
  /** Condition type */
  type: ConditionType;
  /** Comparison operator */
  operator: ComparisonOperator;
  /** Value to compare against */
  value: number | string | boolean | string[];
  /** Condition weight (0-1, for multi-condition scoring) */
  weight: number;
  /** Whether this condition is required (AND) or optional (OR) */
  required: boolean;
}

/**
 * Condition group (combines multiple conditions)
 */
export interface ConditionGroup {
  /** Group ID */
  id: string;
  /** Group name */
  name: string;
  /** Conditions in group */
  conditions: FlagCondition[];
  /** Logical operator (all conditions must match OR any condition) */
  operator: 'AND' | 'OR';
  /** Minimum score to trigger (0-1) */
  minScore: number;
}

// ============================================================================
// FLAG PRIORITY
// ============================================================================

/**
 * Flag priority levels
 */
export type FlagPriority =
  | 'critical'    // System-critical features
  | 'high'        // Important features
  | 'medium'      // Standard features
  | 'low';        // Optional/nice-to-have features

/**
 * Priority values for comparison
 */
export const PRIORITY_VALUES: Record<FlagPriority, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

// ============================================================================
// AUTOMATION FLAG DEFINITION
// ============================================================================

/**
 * Automated feature flag definition
 * Extends base feature flag with automation capabilities
 */
export interface AutomationFlag {
  /** Feature ID (matches base feature flag ID) */
  id: string;
  /** Feature name */
  name: string;
  /** Feature description */
  description: string;
  /** Current state */
  state: AutomationFlagState;
  /** Priority level */
  priority: FlagPriority;
  /** Performance impact (0-100) */
  performanceImpact: number;
  /** Dependencies (other feature IDs) */
  dependencies: string[];
  /** Conditions for enabling this flag */
  enableConditions: ConditionGroup[];
  /** Conditions for disabling this flag */
  disableConditions: ConditionGroup[];
  /** Whether automation is enabled for this flag */
  automationEnabled: boolean;
  /** Whether user has opted out of automation for this flag */
  userOptedOut: boolean;
  /** Transition duration (ms, for smooth transitions) */
  transitionDuration: number;
  /** Cooldown period (ms, minimum time between changes) */
  cooldownPeriod: number;
  /** Last change timestamp */
  lastChanged: number;
  /** Tags for categorization */
  tags: string[];
}

// ============================================================================
// AUTOMATION ACTION
// ============================================================================

/**
 * Automation action types
 */
export type AutomationActionType =
  | 'enable'          // Enable feature
  | 'disable'         // Disable feature
  | 'reduce_quality'  // Reduce quality/settings
  | 'increase_quality' // Increase quality/settings
  | 'clear_cache'     // Clear caches
  | 'prefetch'        // Prefetch data
  | 'compress'        // Compress data
  | 'notify_user'     // Notify user of impending change
  | 'ask_permission'; // Ask user permission before change

/**
 * Recommended automation action
 */
export interface AutomationAction {
  /** Action ID */
  id: string;
  /** Feature ID this action applies to */
  featureId: string;
  /** Action type */
  type: AutomationActionType;
  /** Recommended new state */
  recommendedState: AutomationFlagState;
  /** Confidence in recommendation (0-1) */
  confidence: number;
  /** Reason for recommendation */
  reason: string;
  /** Predictions that led to this recommendation */
  predictions: PredictedState[];
  /** Resource impact assessment */
  resourceImpact: ResourceImpact;
  /** Whether this requires user approval */
  requiresApproval: boolean;
  /** Priority of this action */
  priority: FlagPriority;
  /** Estimated time until action should be taken (ms) */
  timeframe: number;
  /** Suggested transition duration (ms) */
  transitionDuration: number;
  /** Created timestamp */
  createdAt: number;
}

// ============================================================================
// RESOURCE IMPACT
// ============================================================================

/**
 * Resource impact assessment
 */
export interface ResourceImpact {
  /** Expected CPU change (-100 to 100) */
  cpuChange: number;
  /** Expected memory change (-100 to 100) */
  memoryChange: number;
  /** Expected battery change (-100 to 100) */
  batteryChange: number;
  /** Expected network change (Mbps) */
  networkChange: number;
  /** Expected token change */
  tokenChange: number;
  /** Overall impact score (-100 to 100, negative = better) */
  overallImpact: number;
  /** Impact duration (ms) */
  duration: number;
}

// ============================================================================
// AUTOMATION EXECUTION RESULT
// ============================================================================

/**
 * Result of executing an automation action
 */
export interface AutomationExecutionResult {
  /** Action ID */
  actionId: string;
  /** Feature ID */
  featureId: string;
  /** Whether execution was successful */
  success: boolean;
  /** Previous state */
  previousState: AutomationFlagState;
  /** New state */
  newState: AutomationFlagState;
  /** Execution timestamp */
  timestamp: number;
  /** Error message (if failed) */
  error?: string;
  /** Actual resource impact */
  actualImpact?: ResourceImpact;
  /** User feedback (0-5, if provided) */
  userFeedback?: number;
}

// ============================================================================
// AUTOMATION RULE
// ============================================================================

/**
 * Prediction-based automation rule
 */
export interface AutomationRule {
  /** Rule ID */
  id: string;
  /** Rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Rule priority */
  priority: FlagPriority;
  /** Conditions that trigger this rule */
  conditions: ConditionGroup[];
  /** Actions to take when triggered */
  actions: AutomationActionType[];
  /** Target features (empty = all applicable) */
  targetFeatures: string[];
  /** Whether this rule is enabled */
  enabled: boolean;
  /** How many times this rule has been triggered */
  triggerCount: number;
  /** Last triggered timestamp */
  lastTriggered: number;
  /** Rule effectiveness score (0-1, based on feedback) */
  effectiveness: number;
}

// ============================================================================
// AUTOMATION CONFIG
// ============================================================================

/**
 * Automation engine configuration
 */
export interface AutomationConfig {
  /** Whether automation is globally enabled */
  enabled: boolean;
  /** Evaluation interval (ms, how often to check predictions) */
  evaluationInterval: number;
  /** Minimum confidence threshold for actions (0-1) */
  minConfidence: number;
  /** Whether to ask user for critical changes */
  askForCriticalChanges: boolean;
  /** Whether to notify before non-critical changes */
  notifyBeforeChanges: boolean;
  /** Grace period for user to respond (ms) */
  responseGracePeriod: number;
  /** Maximum actions per evaluation cycle */
  maxActionsPerCycle: number;
  /** Whether to learn from user feedback */
  learnFromFeedback: boolean;
  /** Cooldown between same-flag changes (ms) */
  flagChangeCooldown: number;
  /** Whether to prioritize user experience over resource optimization */
  prioritizeUserExperience: boolean;
  /** Safety margin for resource predictions (0-1) */
  safetyMargin: number;
}

/**
 * Default automation configuration
 */
export const DEFAULT_AUTOMATION_CONFIG: AutomationConfig = {
  enabled: true,
  evaluationInterval: 60000, // 1 minute
  minConfidence: 0.6,
  askForCriticalChanges: true,
  notifyBeforeChanges: true,
  responseGracePeriod: 10000, // 10 seconds
  maxActionsPerCycle: 5,
  learnFromFeedback: true,
  flagChangeCooldown: 300000, // 5 minutes
  prioritizeUserExperience: true,
  safetyMargin: 0.2, // 20% safety margin
};

// ============================================================================
// CHANGE HISTORY
// ============================================================================

/**
 * Feature flag change history entry
 */
export interface FlagChangeHistory {
  /** Entry ID */
  id: string;
  /** Feature ID */
  featureId: string;
  /** Previous state */
  previousState: AutomationFlagState;
  /** New state */
  newState: AutomationFlagState;
  /** What triggered the change */
  trigger: 'automation' | 'user' | 'system';
  /** Reason for change */
  reason: string;
  /** Predictions that informed the change (if automation) */
  predictions?: PredictedState[];
  /** Confidence in decision (0-1) */
  confidence: number;
  /** Timestamp */
  timestamp: number;
  /** Whether user was notified */
  userNotified: boolean;
  /** Whether user approved (if asked) */
  userApproved?: boolean;
  /** Resource impact */
  resourceImpact: ResourceImpact;
}

// ============================================================================
// AUTOMATION METRICS
// ============================================================================

/**
 * Automation system metrics
 */
export interface AutomationMetrics {
  /** Total evaluations performed */
  totalEvaluations: number;
  /** Total actions recommended */
  totalRecommendations: number;
  /** Total actions executed */
  totalExecutions: number;
  /** Actions pending user approval */
  pendingApprovals: number;
  /** Actions executed automatically */
  automaticExecutions: number;
  /** User-initiated changes */
  userChanges: number;
  /** Average confidence score */
  avgConfidence: number;
  /** Average response time (ms) */
  avgResponseTime: number;
  /** User satisfaction score (0-5) */
  satisfactionScore: number;
  /** Resource issues prevented */
  issuesPrevented: number;
  /** False positives (automation made mistake) */
  falsePositives: number;
  /** Last update timestamp */
  lastUpdate: number;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

/**
 * Notification types for automation events
 */
export type AutomationNotificationType =
  | 'pending_change'     // Change pending user approval
  | 'change_executed'    // Change was executed
  | 'change_reverted'    // Change was reverted
  | 'rule_triggered'     // Rule was triggered
  | 'anomaly_detected'   // Anomaly detected
  | 'resource_warning';  // Resource usage warning

/**
 * Automation notification
 */
export interface AutomationNotification {
  /** Notification ID */
  id: string;
  /** Notification type */
  type: AutomationNotificationType;
  /** Feature ID */
  featureId: string;
  /** Notification title */
  title: string;
  /** Notification message */
  message: string;
  /** Action that will be taken (or was taken) */
  action?: AutomationAction;
  /** Whether user can dismiss */
  dismissible: boolean;
  /** Available actions user can take */
  userActions?: Array<{
    label: string;
    action: 'approve' | 'deny' | 'defer';
  }>;
  /** Timestamp */
  timestamp: number;
  /** Expiration timestamp */
  expiresAt: number;
  /** Whether notification was read */
  read: boolean;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate automation flag state
 */
export function isValidAutomationFlagState(state: unknown): state is AutomationFlagState {
  return typeof state === 'string' &&
    ['enabled', 'disabled', 'auto', 'forced', 'blocked'].includes(state);
}

/**
 * Validate flag priority
 */
export function isValidFlagPriority(priority: unknown): priority is FlagPriority {
  return typeof priority === 'string' &&
    ['critical', 'high', 'medium', 'low'].includes(priority);
}

/**
 * Validate confidence score (0-1)
 */
export function isValidConfidence(value: number): boolean {
  return typeof value === 'number' && value >= 0 && value <= 1;
}

/**
 * Validate resource impact
 */
export function isValidResourceImpact(impact: unknown): impact is ResourceImpact {
  if (typeof impact !== 'object' || impact === null) return false;
  const i = impact as Partial<ResourceImpact>;
  return (
    typeof i.cpuChange === 'number' &&
    typeof i.memoryChange === 'number' &&
    typeof i.batteryChange === 'number' &&
    typeof i.networkChange === 'number' &&
    typeof i.tokenChange === 'number' &&
    typeof i.overallImpact === 'number' &&
    typeof i.duration === 'number'
  );
}
