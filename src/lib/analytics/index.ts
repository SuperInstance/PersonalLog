/**
 * Analytics System - Public API
 *
 * Privacy-first, local-only usage analytics for PersonalLog.
 * Tracks user actions, performance, engagement, and errors without any cloud synchronization.
 *
 * @example
 * ```typescript
 * import { analytics } from '@/lib/analytics'
 *
 * // Initialize on app startup
 * await analytics.initialize()
 *
 * // Track events
 * await analytics.track('message_sent', {
 *   type: 'message_sent',
 *   conversationId: 'abc',
 *   messageLength: 120,
 *   hasAttachment: false,
 * })
 *
 * // Query insights
 * const features = await analytics.getMostUsedFeatures(7)
 * const performance = await analytics.getPerformanceMetrics(7)
 * ```
 */

// ============================================================================
// EXPORTS
// ============================================================================

// Types
export type {
  // Event types
  EventType,
  EventCategory,
  AnalyticsEvent,
  EventData,

  // Specific event data types
  MessageSentData,
  ConversationCreatedData,
  SettingsChangedData,
  AIContactCreatedData,
  SearchPerformedData,
  AppInitializedData,
  APIResponseData,
  RenderCompleteData,
  SessionStartData,
  SessionEndData,
  FeatureUsedData,
  ErrorOccurredData,
  BenchmarkCompletedData,

  // Aggregation types
  TimeRange,
  AggregationBucket,
  AggregatedStats,
  TimeSeriesPoint,
  FeatureUsageStats,
  ErrorStats,
  PerformanceMetrics,
  EngagementSummary,

  // Configuration
  AnalyticsConfig,
  PrivacySettings,
  AnalyticsExport,
} from './types'

export { DEFAULT_ANALYTICS_CONFIG } from './types'

// Core systems
export { EventCollector, getEventCollector, initializeAnalytics, track } from './collector'

export {
  analyticsEventStore,
  analyticsMetadataStore,
  applyRetentionPolicy,
  getStorageSize,
} from './storage'

export { AnalyticsAggregator, analyticsAggregator } from './aggregator'

// Events catalog
export {
  EVENT_CATALOG,
  createMessageSentEvent,
  createConversationCreatedEvent,
  createSettingsChangedEvent,
  createAIContactCreatedEvent,
  createSearchPerformedEvent,
  createAppInitializedEvent,
  createAPIResponseEvent,
  createRenderCompleteEvent,
  createSessionStartEvent,
  createSessionEndEvent,
  createFeatureUsedEvent,
  createErrorOccurredEvent,
  createFeatureEnabledEvent,
  createBenchmarkCompletedEvent,
  validateEventData,
  isPIISensitive,
  isHighVolumeEvent,
  getEventMetadata,
} from './events'

// Insights engine
export {
  InsightsEngine,
  insightsEngine,
  generateRecentInsights,
  getTodaysSummary,
  getThisWeeksSummary,
} from './insights'

// Note: Pipeline functions and classes are not exported from index.ts to avoid circular dependency.
// Import them directly from './pipeline' if needed:
// - import { AnalyticsPipeline, getAnalyticsPipeline, quickReport } from '@/lib/analytics/pipeline'

// Export insight types
export type {
  Insight,
  InsightSeverity,
  InsightCategory,
  UsagePatternInsight,
  PerformanceInsight,
  ErrorInsight,
  EngagementInsight,
  OptimizationSuggestion,
  DailySummary,
  WeeklySummary,
} from './insights'

// Export config and storage functions for tests
export { getAnalyticsConfig, clearAnalyticsData } from './collector'

// Query API - lazy export to avoid circular dependency
export const getMostUsedFeatures = (...args: Parameters<typeof import('./queries').getMostUsedFeatures>) =>
  import('./queries').then(m => m.getMostUsedFeatures(...args))

export const getFeatureUsage = (...args: Parameters<typeof import('./queries').getFeatureUsage>) =>
  import('./queries').then(m => m.getFeatureUsage(...args))

export const getFeatureAdoptionRate = (...args: Parameters<typeof import('./queries').getFeatureAdoptionRate>) =>
  import('./queries').then(m => m.getFeatureAdoptionRate(...args))

export const getEngagementSummary = (...args: Parameters<typeof import('./queries').getEngagementSummary>) =>
  import('./queries').then(m => m.getEngagementSummary(...args))

export const getPeakUsageHours = (...args: Parameters<typeof import('./queries').getPeakUsageHours>) =>
  import('./queries').then(m => m.getPeakUsageHours(...args))

export const getDailyActiveSessions = (...args: Parameters<typeof import('./queries').getDailyActiveSessions>) =>
  import('./queries').then(m => m.getDailyActiveSessions(...args))

export const getSessionStats = (...args: Parameters<typeof import('./queries').getSessionStats>) =>
  import('./queries').then(m => m.getSessionStats(...args))

export const getPerformanceMetrics = (...args: Parameters<typeof import('./queries').getPerformanceMetrics>) =>
  import('./queries').then(m => m.getPerformanceMetrics(...args))

export const getAPIResponseStats = (...args: Parameters<typeof import('./queries').getAPIResponseStats>) =>
  import('./queries').then(m => m.getAPIResponseStats(...args))

export const getRenderPerformanceStats = (...args: Parameters<typeof import('./queries').getRenderPerformanceStats>) =>
  import('./queries').then(m => m.getRenderPerformanceStats(...args))

export const getStoragePerformance = (...args: Parameters<typeof import('./queries').getStoragePerformance>) =>
  import('./queries').then(m => m.getStoragePerformance(...args))

export const getErrorStats = (...args: Parameters<typeof import('./queries').getErrorStats>) =>
  import('./queries').then(m => m.getErrorStats(...args))

export const getErrorRate = (...args: Parameters<typeof import('./queries').getErrorRate>) =>
  import('./queries').then(m => m.getErrorRate(...args))

export const getMostFrequentErrors = (...args: Parameters<typeof import('./queries').getMostFrequentErrors>) =>
  import('./queries').then(m => m.getMostFrequentErrors(...args))

export const getUnrecoveredErrors = (...args: Parameters<typeof import('./queries').getUnrecoveredErrors>) =>
  import('./queries').then(m => m.getUnrecoveredErrors(...args))

export const getMessageStats = (...args: Parameters<typeof import('./queries').getMessageStats>) =>
  import('./queries').then(m => m.getMessageStats(...args))

export const getConversationStats = (...args: Parameters<typeof import('./queries').getConversationStats>) =>
  import('./queries').then(m => m.getConversationStats(...args))

export const exportAnalyticsData = (...args: Parameters<typeof import('./queries').exportAnalyticsData>) =>
  import('./queries').then(m => m.exportAnalyticsData(...args))

export const deleteAnalyticsData = (...args: Parameters<typeof import('./queries').deleteAnalyticsData>) =>
  import('./queries').then(m => m.deleteAnalyticsData(...args))

export const clearAllAnalyticsData = () =>
  import('./queries').then(m => m.clearAllAnalyticsData())

export const getAnalyticsStorageInfo = () =>
  import('./queries').then(m => m.getAnalyticsStorageInfo())

// ============================================================================
// UNIFIED API
// ============================================================================

import { EventCollector, getEventCollector } from './collector'
import { AnalyticsConfig, DEFAULT_ANALYTICS_CONFIG } from './types'

/**
 * Unified analytics API
 */
class AnalyticsAPI {
  private collector: EventCollector

  constructor() {
    this.collector = getEventCollector()
  }

  /**
   * Initialize the analytics system
   * Should be called on app startup
   */
  async initialize(config?: Partial<AnalyticsConfig>): Promise<void> {
    await this.collector.initialize(config)
  }

  /**
   * Track an analytics event
   */
  async track(type: EventType, data: EventData): Promise<void> {
    await this.collector.track(type, data)
  }

  /**
   * Update analytics configuration
   */
  updateConfig(config: Partial<AnalyticsConfig>): void {
    this.collector.updateConfig(config)
  }

  /**
   * Get current configuration
   */
  getConfig(): AnalyticsConfig {
    return this.collector.getConfig()
  }

  /**
   * Shutdown analytics gracefully
   * Should be called before app unloads
   */
  async shutdown(): Promise<void> {
    await this.collector.shutdown()
  }

  /**
   * Usage queries
   */
  readonly usage = {
    getMostUsedFeatures: (days: number = 7, limit: number = 10) =>
      import('./queries').then(m => m.getMostUsedFeatures(days, limit)),

    getFeatureUsage: (featureId: string, days: number = 30) =>
      import('./queries').then(m => m.getFeatureUsage(featureId, days)),

    getFeatureAdoptionRate: (featureId: string, days: number = 30) =>
      import('./queries').then(m => m.getFeatureAdoptionRate(featureId, days)),
  }

  /**
   * Engagement queries
   */
  readonly engagement = {
    getSummary: (days: number = 7) =>
      import('./queries').then(m => m.getEngagementSummary(days)),

    getPeakHours: (days: number = 7) =>
      import('./queries').then(m => m.getPeakUsageHours(days)),

    getDailySessions: (days: number = 30) =>
      import('./queries').then(m => m.getDailyActiveSessions(days)),

    getSessionStats: (days: number = 7) =>
      import('./queries').then(m => m.getSessionStats(days)),
  }

  /**
   * Performance queries
   */
  readonly performance = {
    getMetrics: (days: number = 7) =>
      import('./queries').then(m => m.getPerformanceMetrics(days)),

    getAPIStats: (days: number = 7) =>
      import('./queries').then(m => m.getAPIResponseStats(days)),

    getRenderStats: (days: number = 7) =>
      import('./queries').then(m => m.getRenderPerformanceStats(days)),

    getStorageStats: (days: number = 7) =>
      import('./queries').then(m => m.getStoragePerformance(days)),
  }

  /**
   * Error queries
   */
  readonly errors = {
    getStats: (days: number = 7, limit: number = 10) =>
      import('./queries').then(m => m.getErrorStats(days, limit)),

    getRate: (context: string, hours: number = 24) =>
      import('./queries').then(m => m.getErrorRate(context, hours)),

    getMostFrequent: (days: number = 7, limit: number = 10) =>
      import('./queries').then(m => m.getMostFrequentErrors(days, limit)),

    getUnrecovered: (days: number = 7) =>
      import('./queries').then(m => m.getUnrecoveredErrors(days)),
  }

  /**
   * User action queries
   */
  readonly actions = {
    getMessageStats: (days: number = 7) =>
      import('./queries').then(m => m.getMessageStats(days)),

    getConversationStats: (days: number = 7) =>
      import('./queries').then(m => m.getConversationStats(days)),
  }

  /**
   * Data management
   */
  readonly data = {
    export: (days: number = 30) =>
      import('./queries').then(m => m.exportAnalyticsData(days)),

    delete: (days: number) =>
      import('./queries').then(m => m.deleteAnalyticsData(days)),

    clearAll: () =>
      import('./queries').then(m => m.clearAllAnalyticsData()),

    getStorageInfo: () =>
      import('./queries').then(m => m.getAnalyticsStorageInfo()),
  }
}

/**
 * Global analytics instance
 */
export const analytics = new AnalyticsAPI()

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Initialize analytics on app startup
 */
export async function setupAnalytics(config?: Partial<AnalyticsConfig>): Promise<void> {
  await analytics.initialize(config)
}

/**
 * Track a message sent event
 */
export async function trackMessageSent(data: {
  conversationId: string
  messageLength: number
  hasAttachment: boolean
  attachmentTypes?: string[]
  replyToMessage?: boolean
}): Promise<void> {
  await analytics.track('message_sent', {
    type: 'message_sent',
    ...data,
  })
}

/**
 * Track a feature used event
 */
export async function trackFeatureUsed(data: {
  featureId: string
  duration?: number
  success: boolean
  context?: Record<string, unknown>
}): Promise<void> {
  await analytics.track('feature_used', {
    type: 'feature_used',
    ...data,
  })
}

/**
 * Track an error event
 */
export async function trackError(data: {
  errorType: string
  errorMessage: string
  context: string
  recoverable: boolean
  stack?: string
}): Promise<void> {
  await analytics.track('error_occurred', {
    type: 'error_occurred',
    ...data,
  })
}

/**
 * Track API response time
 */
export async function trackAPIResponse(data: {
  endpoint: string
  method: string
  duration: number
  success: boolean
  statusCode?: number
}): Promise<void> {
  await analytics.track('api_response', {
    type: 'api_response',
    ...data,
  })
}

// ============================================================================
// RE-EXPORT TYPES FOR CONVENIENCE
// ============================================================================

import type { EventType, EventData } from './types'
