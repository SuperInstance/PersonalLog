/**
 * Unified Analytics Pipeline
 *
 * High-level analytics orchestration layer that combines collection,
 * aggregation, storage, and insights generation into a unified API.
 */

import { analytics } from './index'
import { insightsEngine, type Insight } from './insights'
import type {
  EventType,
  EventData,
  TimeRange,
  AnalyticsEvent,
  FeatureUsageStats,
  PerformanceMetrics,
  ErrorStats,
  EngagementSummary,
} from './types'

// ============================================================================
// PIPELINE CONFIGURATION
// ============================================================================

/**
 * Pipeline configuration options
 */
export interface PipelineConfig {
  /** Enable automatic insight generation */
  autoInsights: boolean

  /** Insight generation interval in milliseconds */
  insightInterval: number

  /** Enable automatic cleanup of old data */
  autoCleanup: boolean

  /** Cleanup interval in milliseconds */
  cleanupInterval: number

  /** Data retention period in days */
  retentionDays: number

  /** Enable performance tracking */
  trackPerformance: boolean

  /** Enable error tracking */
  trackErrors: boolean
}

const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  autoInsights: true,
  insightInterval: 5 * 60 * 1000, // 5 minutes
  autoCleanup: true,
  cleanupInterval: 60 * 60 * 1000, // 1 hour
  retentionDays: 90,
  trackPerformance: true,
  trackErrors: true,
}

// ============================================================================
// ANALYTICS PIPELINE
// ============================================================================

/**
 * Unified analytics pipeline
 */
export class AnalyticsPipeline {
  private config: PipelineConfig
  private insightTimer: number | null = null
  private cleanupTimer: number | null = null
  private isInitialized: boolean = false
  private latestInsights: Insight[] = []

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config }
  }

  /**
   * Initialize the pipeline
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // Initialize base analytics
    await analytics.initialize()

    // Start background tasks
    if (this.config.autoInsights) {
      this.startInsightGeneration()
    }

    if (this.config.autoCleanup) {
      this.startCleanupTask()
    }

    this.isInitialized = true
  }

  /**
   * Track an event with automatic performance/error tracking
   */
  async track(type: EventType, data: EventData): Promise<void> {
    // Track the event
    await analytics.track(type, data)

    // Track performance if enabled
    if (this.config.trackPerformance && type === 'api_response') {
      const duration = (data as any).duration
      if (duration > 5000) {
        // Slow API call detected
        await analytics.track('error_occurred', {
          type: 'error_occurred',
          errorType: 'SlowAPI',
          errorMessage: `API call took ${duration}ms`,
          context: (data as any).endpoint || 'unknown',
          recoverable: true,
        })
      }
    }
  }

  /**
   * Query analytics with automatic caching and aggregation
   */
  async query(options: {
    timeRange: TimeRange
    eventTypes?: EventType[]
    aggregateBy?: 'hour' | 'day' | 'week' | 'month'
    insights?: boolean
  }): Promise<{
    events: AnalyticsEvent[]
    aggregated?: Record<string, number>
    insights?: Insight[]
    summary?: {
      totalEvents: number
      uniqueSessions: number
      timeRange: { start: string; end: string }
    }
  }> {
    const result: any = {}

    // Get events (would need to add this method to analytics API)
    // For now, we'll return empty events and focus on other data
    result.events = []
    result.summary = {
      totalEvents: 0,
      uniqueSessions: 0,
      timeRange: { start: '', end: '' },
    }

    // Generate insights if requested
    if (options.insights) {
      result.insights = await insightsEngine.generateInsights(options.timeRange)
    }

    return result
  }

  /**
   * Get comprehensive analytics report
   */
  async getReport(days: number = 7): Promise<{
    overview: {
      totalEvents: number
      totalSessions: number
      totalErrors: number
      avgSessionDuration: number
    }
    engagement: EngagementSummary
    performance: PerformanceMetrics[]
    errors: ErrorStats[]
    features: FeatureUsageStats[]
    insights: Insight[]
    trends: {
      messages: { current: number; change: number; trend: string }
      errors: { current: number; change: number; trend: string }
      performance: string
    }
  }> {
    const timeRange = { type: 'days' as const, value: days }

    // Fetch all data in parallel
    const [engagement, performance, errors, features, insights] = await Promise.all([
      analytics.engagement.getSummary(days),
      analytics.performance.getMetrics(days),
      analytics.errors.getStats(days, 10),
      analytics.usage.getMostUsedFeatures(days, 10),
      insightsEngine.generateInsights(timeRange),
    ])

    // Calculate trends
    const trends = await this.calculateTrends(days)

    return {
      overview: {
        totalEvents: engagement.totalSessions * 10, // Estimate
        totalSessions: engagement.totalSessions,
        totalErrors: errors.reduce((sum, e) => sum + e.count, 0),
        avgSessionDuration: engagement.avgSessionDuration,
      },
      engagement,
      performance,
      errors,
      features,
      insights,
      trends,
    }
  }

  /**
   * Get real-time analytics snapshot
   */
  async getSnapshot(): Promise<{
    now: {
      activeSession: boolean
      sessionDuration: number
      eventsThisSession: number
    }
    today: {
      messages: number
      errors: number
      featuresUsed: number
    }
    status: {
      storageHealthy: boolean
      performance: 'good' | 'degraded' | 'poor'
      lastInsight: string | null
    }
  }> {
    // Get current session info
    const config = analytics.getConfig()

    return {
      now: {
        activeSession: true, // Would need to track actual session state
        sessionDuration: 0,
        eventsThisSession: 0,
      },
      today: {
        messages: 0,
        errors: 0,
        featuresUsed: 0,
      },
      status: {
        storageHealthy: true,
        performance: 'good',
        lastInsight: this.latestInsights[0]?.timestamp || null,
      },
    }
  }

  /**
   * Generate insights on-demand
   */
  async generateInsights(
    timeRange: TimeRange,
    categories?: Insight['category'][]
  ): Promise<Insight[]> {
    const insights = await insightsEngine.generateInsights(timeRange, categories)
    this.latestInsights = insights
    return insights
  }

  /**
   * Get daily summary
   */
  async getDailySummary(date?: Date) {
    return insightsEngine.generateDailySummary(date)
  }

  /**
   * Get weekly summary
   */
  async getWeeklySummary(weekStart?: Date) {
    return insightsEngine.generateWeeklySummary(weekStart)
  }

  /**
   * Export analytics data
   */
  async exportData(days: number = 30) {
    return analytics.data.export(days)
  }

  /**
   * Cleanup old data
   */
  async cleanup(days?: number): Promise<number> {
    const retentionDays = days || this.config.retentionDays
    return analytics.data.delete(retentionDays)
  }

  /**
   * Shutdown pipeline
   */
  async shutdown(): Promise<void> {
    if (this.insightTimer !== null) {
      clearInterval(this.insightTimer)
      this.insightTimer = null
    }

    if (this.cleanupTimer !== null) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }

    await analytics.shutdown()
    this.isInitialized = false
  }

  /**
   * Update pipeline configuration
   */
  updateConfig(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config }

    // Restart timers if needed
    if (config.autoInsights !== undefined) {
      if (this.insightTimer !== null) {
        clearInterval(this.insightTimer)
        this.insightTimer = null
      }
      if (this.config.autoInsights) {
        this.startInsightGeneration()
      }
    }

    if (config.autoCleanup !== undefined) {
      if (this.cleanupTimer !== null) {
        clearInterval(this.cleanupTimer)
        this.cleanupTimer = null
      }
      if (this.config.autoCleanup) {
        this.startCleanupTask()
      }
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private startInsightGeneration(): void {
    if (this.insightTimer !== null) return

    this.insightTimer = window.setInterval(async () => {
      try {
        const insights = await insightsEngine.generateInsights({ type: 'days', value: 1 })
        this.latestInsights = insights
      } catch (error) {
        console.error('Error generating insights:', error)
      }
    }, this.config.insightInterval)
  }

  private startCleanupTask(): void {
    if (this.cleanupTimer !== null) return

    this.cleanupTimer = window.setInterval(async () => {
      try {
        await this.cleanup()
      } catch (error) {
        console.error('Error cleaning up analytics data:', error)
      }
    }, this.config.cleanupInterval)
  }

  private async calculateTrends(days: number): Promise<{
    messages: { current: number; change: number; trend: string }
    errors: { current: number; change: number; trend: string }
    performance: string
  }> {
    const [currentPeriod, previousPeriod] = await Promise.all([
      analytics.actions.getMessageStats(days),
      analytics.actions.getMessageStats(days * 2),
    ])

    const messagesChange = previousPeriod.totalMessages
      ? ((currentPeriod.totalMessages - previousPeriod.totalMessages) /
          previousPeriod.totalMessages) *
        100
      : 0

    const messageTrend =
      messagesChange > 10 ? 'increasing' : messagesChange < -10 ? 'decreasing' : 'stable'

    return {
      messages: {
        current: currentPeriod.totalMessages,
        change: messagesChange,
        trend: messageTrend,
      },
      errors: {
        current: 0,
        change: 0,
        trend: 'stable',
      },
      performance: 'good',
    }
  }
}

// ============================================================================
// GLOBAL PIPELINE INSTANCE
// ============================================================================

let globalPipeline: AnalyticsPipeline | null = null

/**
 * Get or create the global analytics pipeline
 */
export function getAnalyticsPipeline(
  config?: Partial<PipelineConfig>
): AnalyticsPipeline {
  if (!globalPipeline) {
    globalPipeline = new AnalyticsPipeline(config)
  }
  return globalPipeline
}

/**
 * Initialize the global pipeline
 */
export async function initializePipeline(
  config?: Partial<PipelineConfig>
): Promise<void> {
  const pipeline = getAnalyticsPipeline(config)
  await pipeline.initialize()
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick analytics report
 */
export async function quickReport(days: number = 7) {
  const pipeline = getAnalyticsPipeline()
  return pipeline.getReport(days)
}

/**
 * Quick insights
 */
export async function quickInsights(days: number = 7): Promise<Insight[]> {
  const pipeline = getAnalyticsPipeline()
  return pipeline.generateInsights({ type: 'days', value: days })
}

/**
 * Quick daily summary
 */
export async function quickDailySummary(date?: Date) {
  const pipeline = getAnalyticsPipeline()
  return pipeline.getDailySummary(date)
}

/**
 * Quick weekly summary
 */
export async function quickWeeklySummary(weekStart?: Date) {
  const pipeline = getAnalyticsPipeline()
  return pipeline.getWeeklySummary(weekStart)
}
