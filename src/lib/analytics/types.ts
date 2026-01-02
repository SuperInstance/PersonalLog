/**
 * Analytics System Types
 *
 * Privacy-first, local-only usage analytics for PersonalLog.
 * All data is stored locally in IndexedDB with no cloud synchronization.
 */

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * All analytics event categories
 */
export type EventCategory =
  | 'user_action'        // User-initiated actions
  | 'performance'        // Performance measurements
  | 'engagement'         // User engagement metrics
  | 'error'             // Error events
  | 'feature_flag'      // Feature flag events
  | 'system'            // System-level events

/**
 * All event types
 */
export type EventType =
  // User Actions
  | 'message_sent'
  | 'conversation_created'
  | 'conversation_archived'
  | 'conversation_deleted'
  | 'settings_changed'
  | 'ai_contact_created'
  | 'ai_contact_modified'
  | 'ai_contact_deleted'
  | 'search_performed'
  | 'export_triggered'
  | 'import_triggered'

  // Performance
  | 'app_initialized'
  | 'api_response'
  | 'render_complete'
  | 'storage_operation'
  | 'memory_measurement'

  // Engagement
  | 'session_start'
  | 'session_end'
  | 'feature_used'
  | 'feature_abandoned'
  | 'page_view'

  // Errors
  | 'error_occurred'
  | 'error_recovered'

  // Feature Flags
  | 'feature_enabled'
  | 'feature_disabled'
  | 'feature_evaluated'

  // System
  | 'hardware_detected'
  | 'benchmark_completed'
  | 'data_compacted'
  | 'data_exported'

// ============================================================================
// BASE EVENT
// ============================================================================

/**
 * Base analytics event
 */
export interface AnalyticsEvent {
  /** Unique event identifier */
  id: string

  /** Event type */
  type: EventType

  /** Event category */
  category: EventCategory

  /** Event timestamp (ISO 8601) */
  timestamp: string

  /** Session identifier */
  sessionId: string

  /** Event-specific data */
  data: EventData

  /** Optional metadata */
  metadata?: {
    /** Hardware profile hash (for correlation, not identification) */
    hardwareHash?: string

    /** Feature flags active at time of event */
    activeFeatures?: string[]

    /** App version */
    appVersion?: string

    /** Platform info */
    platform?: string
  }
}

// ============================================================================
// EVENT DATA (DISCRIMINATED UNION)
// ============================================================================

/**
 * Event data for specific event types
 */
export type EventData =
  | MessageSentData
  | ConversationCreatedData
  | ConversationArchivedData
  | SettingsChangedData
  | AIContactCreatedData
  | SearchPerformedData
  | AppInitializedData
  | APIResponseData
  | RenderCompleteData
  | SessionStartData
  | SessionEndData
  | FeatureUsedData
  | ErrorOccurredData
  | FeatureEnabledData
  | BenchmarkCompletedData
  | GenericEventData

// ============================================================================
// USER ACTION EVENTS
// ============================================================================

export interface MessageSentData {
  type: 'message_sent'
  conversationId: string
  messageLength: number
  hasAttachment: boolean
  attachmentTypes?: string[]
  replyToMessage?: boolean
  responseTime?: number  // Time from previous message
}

export interface ConversationCreatedData {
  type: 'conversation_created'
  conversationType: string
  hasAIContact: boolean
}

export interface ConversationArchivedData {
  type: 'conversation_archived'
  messageCount: number
  conversationAge: number  // Days
}

export interface SettingsChangedData {
  type: 'settings_changed'
  setting: string
  previousValue: string | boolean | number
  newValue: string | boolean | number
}

export interface AIContactCreatedData {
  type: 'ai_contact_created'
  provider: string
  model: string
  customPrompt: boolean
}

export interface SearchPerformedData {
  type: 'search_performed'
  queryLength: number
  resultCount: number
  searchType: 'conversations' | 'messages' | 'global'
}

// ============================================================================
// PERFORMANCE EVENTS
// ============================================================================

export interface AppInitializedData {
  type: 'app_initialized'
  initTime: number  // ms
  componentsLoaded: string[]
  failedComponents?: string[]
}

export interface APIResponseData {
  type: 'api_response'
  endpoint: string
  method: string
  duration: number  // ms
  success: boolean
  statusCode?: number
  errorType?: string
}

export interface RenderCompleteData {
  type: 'render_complete'
  component: string
  duration: number  // ms
  elementCount: number
}

export interface StorageOperationData {
  type: 'storage_operation'
  operation: 'read' | 'write' | 'delete' | 'query'
  store: string
  duration: number  // ms
  recordCount?: number
  success: boolean
}

// ============================================================================
// ENGAGEMENT EVENTS
// ============================================================================

export interface SessionStartData {
  type: 'session_start'
  source: 'direct' | 'notification' | 'link'
  previousSessionTime?: number  // Time since last session
}

export interface SessionEndData {
  type: 'session_end'
  duration: number  // Session length in seconds
  actionsPerformed: number
  messagesSent: number
  featuresUsed: string[]
}

export interface FeatureUsedData {
  type: 'feature_used'
  featureId: string
  duration?: number  // Time spent using feature
  success: boolean
  context?: Record<string, unknown>
}

export interface PageViewData {
  type: 'page_view'
  page: string
  referrer?: string
  loadTime?: number
}

// ============================================================================
// ERROR EVENTS
// ============================================================================

export interface ErrorOccurredData {
  type: 'error_occurred'
  errorType: string
  errorMessage: string  // Sanitized, no PII
  context: string
  recoverable: boolean
  stack?: string  // Sanitized stack trace
}

export interface ErrorRecoveredData {
  type: 'error_recovered'
  errorType: string
  recoveryStrategy: string
  recoveryTime: number  // ms
}

// ============================================================================
// FEATURE FLAG EVENTS
// ============================================================================

export interface FeatureEnabledData {
  type: 'feature_enabled'
  featureId: string
  reason: string
  userInitiated: boolean
  previousState: string
}

export interface FeatureDisabledData {
  type: 'feature_disabled'
  featureId: string
  reason: string
  userInitiated: boolean
  previousState: string
}

export interface FeatureEvaluatedData {
  type: 'feature_evaluated'
  featureId: string
  enabled: boolean
  reason: string
  hardwareScore: number
}

// ============================================================================
// SYSTEM EVENTS
// ============================================================================

export interface BenchmarkCompletedData {
  type: 'benchmark_completed'
  category: string
  overallScore: number
  duration: number
  testCount: number
}

export interface DataCompactedData {
  type: 'data_compacted'
  recordsRemoved: number
  spaceRecovered: number  // bytes
  duration: number
}

export interface GenericEventData {
  type: string
  [key: string]: unknown
}

// ============================================================================
// AGGREGATION TYPES
// ============================================================================

/**
 * Time range for queries
 */
export type TimeRange =
  | { type: 'hours'; value: number }
  | { type: 'days'; value: number }
  | { type: 'weeks'; value: number }
  | { type: 'months'; value: number }
  | { type: 'all' }

/**
 * Aggregation bucket size
 */
export type AggregationBucket =
  | 'hour'
  | 'day'
  | 'week'
  | 'month'

/**
 * Aggregated statistics
 */
export interface AggregatedStats {
  /** Count of events */
  count: number

  /** Sum of numeric values (if applicable) */
  sum?: number

  /** Average value */
  average?: number

  /** Minimum value */
  min?: number

  /** Maximum value */
  max?: number

  /** Percentiles */
  percentiles?: {
    p50: number
    p90: number
    p95: number
    p99: number
  }
}

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  /** Bucket timestamp */
  timestamp: string

  /** Aggregated value */
  value: number

  /** Count of items in bucket */
  count: number
}

/**
 * Feature usage statistics
 */
export interface FeatureUsageStats {
  featureId: string
  usageCount: number
  lastUsed: string
  totalDuration?: number
  averageDuration?: number
  successRate: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

/**
 * Error statistics
 */
export interface ErrorStats {
  errorType: string
  count: number
  lastOccurred: string
  recoverable: boolean
  recoveryRate: number
  avgRecoveryTime?: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  category: string
  avgDuration: number
  p95Duration: number
  p99Duration: number
  successRate: number
  totalOperations: number
  trend: 'improving' | 'degrading' | 'stable'
}

/**
 * Engagement summary
 */
export interface EngagementSummary {
  totalSessions: number
  totalSessionTime: number  // seconds
  avgSessionDuration: number
  avgMessagesPerSession: number
  mostActiveDay: string
  mostActiveHour: number
  retentionRate: number  // Returning users
  peakUsageHours: number[]
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  /** Whether analytics is enabled */
  enabled: boolean

  /** Whether to persist events to IndexedDB */
  persist: boolean

  /** Maximum number of events to keep (0 = unlimited) */
  maxEvents: number

  /** Batch size for writing to storage */
  batchSize: number

  /** Batch write interval in ms */
  batchInterval: number

  /** Whether to include detailed performance metrics */
  detailedPerformance: boolean

  /** Whether to track errors */
  trackErrors: boolean

  /** Session timeout in ms (for session end detection) */
  sessionTimeout: number

  /** Data retention period in days (0 = forever) */
  retentionDays: number

  /** Sampling rate (0-1, 1 = track all events) */
  samplingRate: number
}

/**
 * Default analytics configuration
 */
export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  enabled: true,
  persist: true,
  maxEvents: 100000,
  batchSize: 50,
  batchInterval: 5000,  // 5 seconds
  detailedPerformance: true,
  trackErrors: true,
  sessionTimeout: 30 * 60 * 1000,  // 30 minutes
  retentionDays: 90,
  samplingRate: 1.0,
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

/**
 * Options for querying events
 */
export interface QueryOptions {
  /** Time range to query */
  timeRange: TimeRange

  /** Event types to include (all if not specified) */
  eventTypes?: EventType[]

  /** Filter by event data properties */
  filters?: Record<string, unknown>

  /** Aggregation bucket */
  bucket?: AggregationBucket

  /** Limit results */
  limit?: number

  /** Offset for pagination */
  offset?: number

  /** Sort order */
  sortOrder?: 'asc' | 'desc'
}

// ============================================================================
// PRIVACY & EXPORT
// ============================================================================

/**
 * Privacy settings for analytics data
 */
export interface PrivacySettings {
  /** Whether analytics is enabled */
  enabled: boolean

  /** Whether to allow data export */
  allowExport: boolean

  /** Whether to allow data deletion */
  allowDeletion: boolean

  /** Data categories to exclude */
  excludedCategories: EventCategory[]

  /** Whether to anonymize data */
  anonymize: boolean
}

/**
 * Analytics export format
 */
export interface AnalyticsExport {
  /** Export timestamp */
  exportedAt: string

  /** Time range of exported data */
  timeRange: {
    start: string
    end: string
  }

  /** Event count */
  eventCount: number

  /** Events */
  events: AnalyticsEvent[]

  /** Aggregated summaries */
  summaries: {
    userActions: AggregatedStats
    performance: AggregatedStats
    engagement: AggregatedStats
    errors: AggregatedStats
  }
}
