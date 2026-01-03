/**
 * Analytics Insights Engine
 *
 * Automated analysis and insight generation from analytics data.
 * Detects patterns, anomalies, and provides actionable recommendations.
 */

import { analyticsEventStore } from './storage'
import {
  AnalyticsEvent,
  TimeRange,
  EngagementSummary,
  PerformanceMetrics,
  ErrorStats,
  FeatureUsageStats,
} from './types'

// ============================================================================
// INSIGHT TYPES
// ============================================================================

/**
 * Insight severity level
 */
export type InsightSeverity = 'info' | 'warning' | 'critical' | 'success'

/**
 * Insight category
 */
export type InsightCategory =
  | 'usage'
  | 'performance'
  | 'error'
  | 'engagement'
  | 'optimization'
  | 'security'

/**
 * Base insight
 */
export interface Insight {
  id: string
  category: InsightCategory
  severity: InsightSeverity
  title: string
  description: string
  timestamp: string
  data?: Record<string, unknown>
}

/**
 * Usage pattern insight
 */
export interface UsagePatternInsight extends Insight {
  category: 'usage'
  pattern: 'peak_hours' | 'frequent_features' | 'activity_trend'
  metrics: {
    timeRange: string
    totalEvents: number
    trend: 'increasing' | 'decreasing' | 'stable'
  }
}

/**
 * Performance insight
 */
export interface PerformanceInsight extends Insight {
  category: 'performance'
  issue: 'slow_api' | 'slow_render' | 'memory_pressure' | 'storage_bottleneck'
  metrics: {
    avgDuration: number
    p95Duration: number
    affectedOperations: number
    impact: 'low' | 'medium' | 'high'
  }
}

/**
 * Error insight
 */
export interface ErrorInsight extends Insight {
  category: 'error'
  errorType: string
  metrics: {
    occurrenceCount: number
    errorRate: number
    recovered: boolean
  }
}

/**
 * Engagement insight
 */
export interface EngagementInsight extends Insight {
  category: 'engagement'
  metric: 'session_duration' | 'feature_adoption' | 'retention' | 'activity_level'
  value: number
  comparison: 'above_average' | 'average' | 'below_average'
}

/**
 * Optimization suggestion
 */
export interface OptimizationSuggestion extends Insight {
  category: 'optimization'
  type: 'configuration' | 'workflow' | 'resource'
  effort: 'low' | 'medium' | 'high'
  expectedImpact: string
}

/**
 * Daily summary report
 */
export interface DailySummary {
  date: string
  summary: string
  stats: {
    totalMessages: number
    totalSessions: number
    totalErrors: number
    mostUsedFeature: string
    peakUsageHour: number
  }
  patterns: string[]
  issues: string[]
  suggestions: string[]
  trends: {
    messages: string
    errors: string
    performance: string
  }
}

/**
 * Weekly summary report
 */
export interface WeeklySummary extends DailySummary {
  weekRange: string
  comparison: {
    messagesChange: number
    sessionsChange: number
    errorsChange: number
    performanceChange: string
  }
  topFeatures: Array<{ feature: string; usageCount: number }>
  topErrors: Array<{ error: string; count: number }>
  goals: {
    achieved: string[]
    inProgress: string[]
    notAchieved: string[]
  }
}

// ============================================================================
// INSIGHTS ENGINE
// ============================================================================

/**
 * Analytics insights engine
 */
export class InsightsEngine {
  /**
   * Generate comprehensive insights for a time range
   */
  async generateInsights(
    timeRange: TimeRange,
    categories?: InsightCategory[]
  ): Promise<Insight[]> {
    const allInsights: Insight[] = []

    // Generate insights by category
    if (!categories || categories.includes('usage')) {
      allInsights.push(...(await this.generateUsageInsights(timeRange)))
    }

    if (!categories || categories.includes('performance')) {
      allInsights.push(...(await this.generatePerformanceInsights(timeRange)))
    }

    if (!categories || categories.includes('error')) {
      allInsights.push(...(await this.generateErrorInsights(timeRange)))
    }

    if (!categories || categories.includes('engagement')) {
      allInsights.push(...(await this.generateEngagementInsights(timeRange)))
    }

    if (!categories || categories.includes('optimization')) {
      allInsights.push(...(await this.generateOptimizationInsights(timeRange)))
    }

    // Sort by severity and timestamp
    return allInsights.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 }
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
      if (severityDiff !== 0) return severityDiff

      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
  }

  /**
   * Generate usage insights
   */
  private async generateUsageInsights(timeRange: TimeRange): Promise<Insight[]> {
    const insights: Insight[] = []
    const events = await this.getEventsInRange(timeRange)

    // Detect peak usage hours
    const hourCounts = new Array(24).fill(0)
    for (const event of events) {
      const hour = new Date(event.timestamp).getHours()
      hourCounts[hour]++
    }

    const peakHour = hourCounts.indexOf(Math.max(...hourCounts))
    const peakCount = hourCounts[peakHour]
    const avgCount = hourCounts.reduce((a, b) => a + b, 0) / 24

    if (peakCount > avgCount * 2) {
      insights.push({
        id: `usage_peak_${Date.now()}`,
        category: 'usage',
        severity: 'info',
        title: 'Peak Usage Detected',
        description: `Your activity peaks at ${peakHour}:00 with ${peakCount} events`,
        timestamp: new Date().toISOString(),
      })
    }

    // Detect activity trend
    const dailyEvents = this.bucketEventsByDay(events)
    const recentDays = Object.values(dailyEvents).slice(-7)
    const earlierDays = Object.values(dailyEvents).slice(-14, -7)

    if (recentDays.length > 0 && earlierDays.length > 0) {
      const recentAvg = recentDays.reduce((a, b) => a + b, 0) / recentDays.length
      const earlierAvg = earlierDays.reduce((a, b) => a + b, 0) / earlierDays.length
      const change = ((recentAvg - earlierAvg) / earlierAvg) * 100

      if (Math.abs(change) > 20) {
        insights.push({
          id: `usage_trend_${Date.now()}`,
          category: 'usage',
          severity: change > 0 ? 'success' : 'warning',
          title: `Activity ${change > 0 ? 'Increased' : 'Decreased'}`,
          description: `Your activity ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% compared to last week`,
          timestamp: new Date().toISOString(),
        })
      }
    }

    return insights
  }

  /**
   * Generate performance insights
   */
  private async generatePerformanceInsights(timeRange: TimeRange): Promise<Insight[]> {
    const insights: Insight[] = []
    const events = await this.getEventsInRange(timeRange, ['api_response', 'render_complete'])

    // Analyze API response times
    const apiEvents = events.filter(e => e.type === 'api_response')
    const apiDurations = apiEvents.map(e => (e.data as any).duration).filter(d => d !== undefined)

    if (apiDurations.length > 10) {
      const avg = apiDurations.reduce((a, b) => a + b, 0) / apiDurations.length
      const sorted = [...apiDurations].sort((a, b) => a - b)
      const p95 = sorted[Math.floor(apiDurations.length * 0.95)]

      if (p95 > 5000) {
        insights.push({
          id: `perf_slow_api_${Date.now()}`,
          category: 'performance',
          severity: p95 > 10000 ? 'critical' : 'warning',
          title: 'Slow API Response Times',
          description: `95th percentile response time is ${p95.toFixed(0)}ms`,
          timestamp: new Date().toISOString(),
        })
      }
    }

    // Analyze render performance
    const renderEvents = events.filter(e => e.type === 'render_complete')
    const renderDurations = renderEvents.map(e => (e.data as any).duration).filter(d => d !== undefined)

    if (renderDurations.length > 10) {
      const avg = renderDurations.reduce((a, b) => a + b, 0) / renderDurations.length
      const slowRenders = renderDurations.filter(d => d > 100).length

      if (slowRenders > renderDurations.length * 0.1) {
        insights.push({
          id: `perf_slow_render_${Date.now()}`,
          category: 'performance',
          severity: 'warning',
          title: 'Slow Component Rendering',
          description: `${slowRenders} renders took longer than 100ms`,
          timestamp: new Date().toISOString(),
        })
      }
    }

    return insights
  }

  /**
   * Generate error insights
   */
  private async generateErrorInsights(timeRange: TimeRange): Promise<Insight[]> {
    const insights: Insight[] = []
    const events = await this.getEventsInRange(timeRange, ['error_occurred', 'error_recovered'])

    if (events.length === 0) {
      insights.push({
        id: `error_clean_${Date.now()}`,
        category: 'error',
        severity: 'success',
        title: 'No Errors Detected',
        description: 'No errors occurred in this time period',
        timestamp: new Date().toISOString(),
      })
      return insights
    }

    // Group errors by type
    const errorCounts = new Map<string, number>()
    const recoveredErrors = new Set<string>()

    for (const event of events) {
      if (event.type === 'error_occurred') {
        const errorType = (event.data as any).errorType || 'unknown'
        errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1)
      } else if (event.type === 'error_recovered') {
        const errorType = (event.data as any).errorType || 'unknown'
        recoveredErrors.add(errorType)
      }
    }

    // Detect critical errors
    for (const [errorType, count] of errorCounts.entries()) {
      if (count > 10) {
        insights.push({
          id: `error_frequent_${Date.now()}_${errorType}`,
          category: 'error',
          severity: count > 50 ? 'critical' : 'warning',
          title: `Frequent Error: ${errorType}`,
          description: `${errorType} occurred ${count} times`,
          timestamp: new Date().toISOString(),
        })
      }
    }

    return insights
  }

  /**
   * Generate engagement insights
   */
  private async generateEngagementInsights(timeRange: TimeRange): Promise<Insight[]> {
    const insights: Insight[] = []
    const events = await this.getEventsInRange(timeRange, ['session_start', 'session_end', 'feature_used'])

    // Calculate session stats
    const sessionEnds = events.filter(e => e.type === 'session_end')
    if (sessionEnds.length > 0) {
      const durations = sessionEnds.map(e => (e.data as any).duration || 0)
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length

      insights.push({
        id: `engagement_session_${Date.now()}`,
        category: 'engagement',
        severity: 'info',
        title: 'Average Session Duration',
        description: `Average session lasts ${Math.floor(avgDuration / 60)} minutes`,
        timestamp: new Date().toISOString(),
      })
    }

    // Detect most used features
    const featureEvents = events.filter(e => e.type === 'feature_used')
    const featureCounts = new Map<string, number>()

    for (const event of featureEvents) {
      const featureId = (event.data as any).featureId || 'unknown'
      featureCounts.set(featureId, (featureCounts.get(featureId) || 0) + 1)
    }

    const topFeature = Array.from(featureCounts.entries()).sort((a, b) => b[1] - a[1])[0]
    if (topFeature) {
      insights.push({
        id: `engagement_feature_${Date.now()}`,
        category: 'engagement',
        severity: 'info',
        title: 'Most Used Feature',
        description: `${topFeature[0]} is your most used feature with ${topFeature[1]} uses`,
        timestamp: new Date().toISOString(),
      })
    }

    return insights
  }

  /**
   * Generate optimization suggestions
   */
  private async generateOptimizationInsights(timeRange: TimeRange): Promise<Insight[]> {
    const insights: Insight[] = []
    const events = await this.getEventsInRange(timeRange)

    // Suggest batch operations
    const apiEvents = events.filter(e => e.type === 'api_response')
    if (apiEvents.length > 100) {
      insights.push({
        id: `opt_batch_${Date.now()}`,
        category: 'optimization',
        severity: 'info',
        title: 'Consider Batch Operations',
        description: 'High API call frequency detected. Batching operations could improve performance.',
        timestamp: new Date().toISOString(),
      })
    }

    // Suggest cleanup
    if (events.length > 10000) {
      insights.push({
        id: `opt_cleanup_${Date.now()}`,
        category: 'optimization',
        severity: 'warning',
        title: 'Data Cleanup Recommended',
        description: 'Large event history detected. Consider applying retention policies.',
        timestamp: new Date().toISOString(),
      })
    }

    return insights
  }

  /**
   * Generate daily summary
   */
  async generateDailySummary(date: Date = new Date()): Promise<DailySummary> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const events = await analyticsEventStore.queryEvents({
      startTime: startOfDay.toISOString(),
      endTime: endOfDay.toISOString(),
    })

    const messages = events.filter(e => e.type === 'message_sent')
    const sessions = events.filter(e => e.type === 'session_end')
    const errors = events.filter(e => e.type === 'error_occurred')
    const features = events.filter(e => e.type === 'feature_used')

    // Find peak hour
    const hourCounts = new Array(24).fill(0)
    for (const event of events) {
      const hour = new Date(event.timestamp).getHours()
      hourCounts[hour]++
    }
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts))

    // Find most used feature
    const featureCounts = new Map<string, number>()
    for (const event of features) {
      const featureId = (event.data as any).featureId || 'unknown'
      featureCounts.set(featureId, (featureCounts.get(featureId) || 0) + 1)
    }
    const mostUsedFeature = Array.from(featureCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

    return {
      date: startOfDay.toISOString().split('T')[0],
      summary: `You sent ${messages.length} messages across ${sessions.length} sessions with ${errors.length} errors.`,
      stats: {
        totalMessages: messages.length,
        totalSessions: sessions.length,
        totalErrors: errors.length,
        mostUsedFeature,
        peakUsageHour: peakHour,
      },
      patterns: [],
      issues: errors.length > 0 ? [`Encountered ${errors.length} errors`] : [],
      suggestions: [],
      trends: {
        messages: 'stable',
        errors: 'stable',
        performance: 'good',
      },
    }
  }

  /**
   * Generate weekly summary
   */
  async generateWeeklySummary(weekStart: Date = new Date()): Promise<WeeklySummary> {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const currentWeek = await analyticsEventStore.queryEvents({
      startTime: weekStart.toISOString(),
      endTime: weekEnd.toISOString(),
    })

    const prevWeekStart = new Date(weekStart)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)

    const prevWeek = await analyticsEventStore.queryEvents({
      startTime: prevWeekStart.toISOString(),
      endTime: weekStart.toISOString(),
    })

    const messages = currentWeek.filter(e => e.type === 'message_sent')
    const prevMessages = prevWeek.filter(e => e.type === 'message_sent')
    const sessions = currentWeek.filter(e => e.type === 'session_end')
    const errors = currentWeek.filter(e => e.type === 'error_occurred')
    const prevErrors = prevWeek.filter(e => e.type === 'error_occurred')

    const messagesChange = prevMessages.length
      ? ((messages.length - prevMessages.length) / prevMessages.length) * 100
      : 0

    const summary = await this.generateDailySummary(weekStart)
    const insights = await this.generateInsights(
      { type: 'days', value: 7 },
      ['usage', 'performance', 'error', 'engagement']
    )

    return {
      ...summary,
      weekRange: `${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`,
      comparison: {
        messagesChange,
        sessionsChange: 0,
        errorsChange: prevErrors.length
          ? ((errors.length - prevErrors.length) / prevErrors.length) * 100
          : 0,
        performanceChange: 'stable',
      },
      topFeatures: [],
      topErrors: [],
      goals: {
        achieved: [],
        inProgress: [],
        notAchieved: [],
      },
      patterns: insights.filter(i => i.category === 'usage').map(i => i.description),
      issues: insights.filter(i => i.severity === 'warning' || i.severity === 'critical').map(i => i.description),
      suggestions: insights.filter(i => i.category === 'optimization').map(i => i.description),
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async getEventsInRange(
    timeRange: TimeRange,
    types?: string[]
  ): Promise<AnalyticsEvent[]> {
    const { start, end } = this.getTimeRangeBoundaries(timeRange)
    return analyticsEventStore.queryEvents({
      startTime: start,
      endTime: end,
      types,
    })
  }

  private getTimeRangeBoundaries(timeRange: TimeRange): { start: string; end: string } {
    const end = new Date()
    const start = new Date()

    switch (timeRange.type) {
      case 'hours':
        start.setHours(start.getHours() - timeRange.value)
        break
      case 'days':
        start.setDate(start.getDate() - timeRange.value)
        break
      case 'weeks':
        start.setDate(start.getDate() - timeRange.value * 7)
        break
      case 'months':
        start.setMonth(start.getMonth() - timeRange.value)
        break
      case 'all':
        start.setFullYear(start.getFullYear() - 100)
        break
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    }
  }

  private bucketEventsByDay(events: AnalyticsEvent[]): Record<string, number> {
    const daily: Record<string, number> = {}

    for (const event of events) {
      const day = event.timestamp.split('T')[0]
      daily[day] = (daily[day] || 0) + 1
    }

    return daily
  }
}

// ============================================================================
// GLOBAL INSIGHTS ENGINE INSTANCE
// ============================================================================

/**
 * Global insights engine instance
 */
export const insightsEngine = new InsightsEngine()

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Generate insights for the last N days
 */
export async function generateRecentInsights(days: number = 7): Promise<Insight[]> {
  return insightsEngine.generateInsights({ type: 'days', value: days })
}

/**
 * Get today's daily summary
 */
export async function getTodaysSummary(): Promise<DailySummary> {
  return insightsEngine.generateDailySummary()
}

/**
 * Get this week's summary
 */
export async function getThisWeeksSummary(): Promise<WeeklySummary> {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  return insightsEngine.generateWeeklySummary(weekStart)
}
