/**
 * Analytics Aggregator
 *
 * Aggregates analytics events for insights and patterns.
 */

import { analyticsEventStore } from './storage'
import {
  AnalyticsEvent,
  EventType,
  AggregatedStats,
  TimeSeriesPoint,
  FeatureUsageStats,
  ErrorStats,
  PerformanceMetrics,
  EngagementSummary,
  TimeRange,
  AggregationBucket,
} from './types'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate time range boundaries
 */
function getTimeRangeBoundaries(timeRange: TimeRange): { start: string; end: string } {
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

/**
 * Calculate statistics for numeric values
 */
function calculateStatistics(values: number[]): AggregatedStats {
  if (values.length === 0) {
    return { count: 0 }
  }

  const sorted = [...values].sort((a, b) => a - b)
  const sum = values.reduce((acc, v) => acc + v, 0)
  const count = values.length

  return {
    count,
    sum,
    average: sum / count,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    percentiles: {
      p50: sorted[Math.floor(count * 0.5)],
      p90: sorted[Math.floor(count * 0.9)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
    },
  }
}

/**
 * Bucket timestamp by aggregation unit
 */
function bucketTimestamp(timestamp: string, bucket: AggregationBucket): string {
  const date = new Date(timestamp)

  switch (bucket) {
    case 'hour':
      date.setMinutes(0, 0, 0)
      break
    case 'day':
      date.setHours(0, 0, 0, 0)
      break
    case 'week':
      const dayOfWeek = date.getDay()
      date.setDate(date.getDate() - dayOfWeek)
      date.setHours(0, 0, 0, 0)
      break
    case 'month':
      date.setDate(1)
      date.setHours(0, 0, 0, 0)
      break
  }

  return date.toISOString()
}

/**
 * Calculate trend direction
 */
function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable'

  const recent = values.slice(Math.floor(values.length / 2))
  const older = values.slice(0, Math.floor(values.length / 2))

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length

  const diff = recentAvg - olderAvg
  const threshold = olderAvg * 0.1 // 10% threshold

  if (diff > threshold) return 'increasing'
  if (diff < -threshold) return 'decreasing'
  return 'stable'
}

// ============================================================================
// AGGREGATOR
// ============================================================================

/**
 * Analytics data aggregator
 */
export class AnalyticsAggregator {
  /**
   * Get event count by type
   */
  async getEventCountsByType(
    timeRange: TimeRange
  ): Promise<Record<EventType, number>> {
    const { start, end } = getTimeRangeBoundaries(timeRange)
    const events = await analyticsEventStore.queryEvents({
      startTime: start,
      endTime: end,
    })

    const counts: Record<string, number> = {}

    for (const event of events) {
      counts[event.type] = (counts[event.type] || 0) + 1
    }

    return counts as Record<EventType, number>
  }

  /**
   * Get event count by category
   */
  async getEventCountsByCategory(
    timeRange: TimeRange
  ): Promise<Record<string, number>> {
    const { start, end } = getTimeRangeBoundaries(timeRange)
    const events = await analyticsEventStore.queryEvents({
      startTime: start,
      endTime: end,
    })

    const counts: Record<string, number> = {}

    for (const event of events) {
      counts[event.category] = (counts[event.category] || 0) + 1
    }

    return counts
  }

  /**
   * Get time series data for events
   */
  async getTimeSeries(
    timeRange: TimeRange,
    bucket: AggregationBucket = 'day',
    eventType?: EventType
  ): Promise<TimeSeriesPoint[]> {
    const { start, end } = getTimeRangeBoundaries(timeRange)
    const types = eventType ? [eventType] : undefined

    const events = await analyticsEventStore.queryEvents({
      startTime: start,
      endTime: end,
      types,
    })

    const bucketed: Record<string, number> = {}

    for (const event of events) {
      const bucketKey = bucketTimestamp(event.timestamp, bucket)
      bucketed[bucketKey] = (bucketed[bucketKey] || 0) + 1
    }

    // Convert to array and sort
    return Object.entries(bucketed)
      .map(([timestamp, count]) => ({ timestamp, value: count, count }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }

  /**
   * Get most used features
   */
  async getMostUsedFeatures(
    timeRange: TimeRange,
    limit: number = 10
  ): Promise<FeatureUsageStats[]> {
    const { start, end } = getTimeRangeBoundaries(timeRange)
    const events = await analyticsEventStore.queryEvents({
      startTime: start,
      endTime: end,
      types: ['feature_used'],
    })

    const featureMap = new Map<
      string,
      {
        count: number
        lastUsed: string
        durations: number[]
        successes: number
        failures: number
      }
    >()

    for (const event of events) {
      const data = event.data as any
      const featureId = data.featureId || 'unknown'

      const existing = featureMap.get(featureId) || {
        count: 0,
        lastUsed: event.timestamp,
        durations: [],
        successes: 0,
        failures: 0,
      }

      existing.count++
      if (event.timestamp > existing.lastUsed) {
        existing.lastUsed = event.timestamp
      }
      if (data.duration) existing.durations.push(data.duration)
      if (data.success) existing.successes++ else existing.failures++

      featureMap.set(featureId, existing)
    }

    // Convert to stats
    const stats: FeatureUsageStats[] = []

    for (const [featureId, data] of featureMap.entries()) {
      const durations = data.durations
      stats.push({
        featureId,
        usageCount: data.count,
        lastUsed: data.lastUsed,
        totalDuration: durations.reduce((a, b) => a + b, 0),
        averageDuration: durations.length
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : undefined,
        successRate: data.successes / (data.successes + data.failures),
        trend: 'stable', // Could calculate from time series
      })
    }

    // Sort by usage count
    stats.sort((a, b) => b.usageCount - a.usageCount)

    return stats.slice(0, limit)
  }

  /**
   * Get error statistics
   */
  async getErrorStats(
    timeRange: TimeRange,
    limit: number = 10
  ): Promise<ErrorStats[]> {
    const { start, end } = getTimeRangeBoundaries(timeRange)
    const events = await analyticsEventStore.queryEvents({
      startTime: start,
      endTime: end,
      types: ['error_occurred'],
    })

    const errorMap = new Map<
      string,
      {
        count: number
        lastOccurred: string
        recoverable: boolean
        recoveries: number
        recoveryTimes: number[]
      }
    >()

    for (const event of events) {
      const data = event.data as any
      const errorType = data.errorType || 'unknown'

      const existing = errorMap.get(errorType) || {
        count: 0,
        lastOccurred: event.timestamp,
        recoverable: data.recoverable || false,
        recoveries: 0,
        recoveryTimes: [],
      }

      existing.count++
      if (event.timestamp > existing.lastOccurred) {
        existing.lastOccurred = event.timestamp
      }

      errorMap.set(errorType, existing)
    }

    // Look for recovery events
    const recoveryEvents = await analyticsEventStore.queryEvents({
      startTime: start,
      endTime: end,
      types: ['error_recovered'],
    })

    for (const event of recoveryEvents) {
      const data = event.data as any
      const errorType = data.errorType || 'unknown'

      const existing = errorMap.get(errorType)
      if (existing) {
        existing.recoveries++
        if (data.recoveryTime) {
          existing.recoveryTimes.push(data.recoveryTime)
        }
      }
    }

    // Convert to stats
    const stats: ErrorStats[] = []

    for (const [errorType, data] of errorMap.entries()) {
      stats.push({
        errorType,
        count: data.count,
        lastOccurred: data.lastOccurred,
        recoverable: data.recoverable,
        recoveryRate: data.recoveries / data.count,
        avgRecoveryTime: data.recoveryTimes.length
          ? data.recoveryTimes.reduce((a, b) => a + b, 0) / data.recoveryTimes.length
          : undefined,
        trend: 'stable',
      })
    }

    // Sort by count
    stats.sort((a, b) => b.count - a.count)

    return stats.slice(0, limit)
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(
    timeRange: TimeRange,
    category?: string
  ): Promise<PerformanceMetrics[]> {
    const { start, end } = getTimeRangeBoundaries(timeRange)

    const types: EventType[] = category
      ? []
      : ['api_response', 'render_complete', 'storage_operation', 'app_initialized']

    const events = await analyticsEventStore.queryEvents({
      startTime: start,
      endTime: end,
      types: types.length ? types : undefined,
    })

    const metricsMap = new Map<
      string,
      {
        durations: number[]
        successes: number
        failures: number
        timestamps: number[]
      }
    >()

    for (const event of events) {
      const data = event.data as any
      const duration = data.duration || data.initTime || 0
      const success = data.success !== false

      const cat = category || data.endpoint || data.component || data.operation || 'other'

      const existing = metricsMap.get(cat) || {
        durations: [],
        successes: 0,
        failures: 0,
        timestamps: [],
      }

      existing.durations.push(duration)
      if (success) existing.successes++ else existing.failures++
      existing.timestamps.push(new Date(event.timestamp).getTime())

      metricsMap.set(cat, existing)
    }

    // Convert to metrics
    const metrics: PerformanceMetrics[] = []

    for (const [cat, data] of metricsMap.entries()) {
      const sorted = [...data.durations].sort((a, b) => a - b)
      const total = data.successes + data.failures

      metrics.push({
        category: cat,
        avgDuration: sorted.reduce((a, b) => a + b, 0) / sorted.length,
        p95Duration: sorted[Math.floor(sorted.length * 0.95)],
        p99Duration: sorted[Math.floor(sorted.length * 0.99)],
        successRate: data.successes / total,
        totalOperations: total,
        trend: calculateTrend(data.durations),
      })
    }

    return metrics
  }

  /**
   * Get engagement summary
   */
  async getEngagementSummary(timeRange: TimeRange): Promise<EngagementSummary> {
    const { start, end } = getTimeRangeBoundaries(timeRange)
    const events = await analyticsEventStore.queryEvents({
      startTime: start,
      endTime: end,
    })

    let totalSessions = 0
    let totalSessionTime = 0
    let totalMessages = 0

    const hourCounts = new Array(24).fill(0)
    const dayCounts = new Map<string, number>()

    for (const event of events) {
      const date = new Date(event.timestamp)
      const hour = date.getHours()
      const dayKey = date.toISOString().split('T')[0]

      hourCounts[hour]++
      dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1)

      if (event.type === 'session_start') {
        totalSessions++
      }

      if (event.type === 'session_end') {
        const data = event.data as any
        totalSessionTime += data.duration || 0
      }

      if (event.type === 'message_sent') {
        totalMessages++
      }
    }

    // Find peak usage hours
    const maxHourCount = Math.max(...hourCounts)
    const peakUsageHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter(({ count }) => count === maxHourCount)
      .map(({ hour }) => hour)

    // Find most active day
    let mostActiveDay = ''
    let maxDayCount = 0
    for (const [day, count] of dayCounts.entries()) {
      if (count > maxDayCount) {
        maxDayCount = count
        mostActiveDay = day
      }
    }

    return {
      totalSessions,
      totalSessionTime,
      avgSessionDuration: totalSessions ? totalSessionTime / totalSessions : 0,
      avgMessagesPerSession: totalSessions ? totalMessages / totalSessions : 0,
      mostActiveDay,
      mostActiveHour: peakUsageHours[0] || 0,
      peakUsageHours,
      retentionRate: 0, // Would require more complex analysis
    }
  }

  /**
   * Get peak usage hours
   */
  async getPeakUsageHours(timeRange: TimeRange): Promise<number[]> {
    const { start, end } = getTimeRangeBoundaries(timeRange)
    const events = await analyticsEventStore.queryEvents({
      startTime: start,
      endTime: end,
    })

    const hourCounts = new Array(24).fill(0)

    for (const event of events) {
      const hour = new Date(event.timestamp).getHours()
      hourCounts[hour]++
    }

    const maxCount = Math.max(...hourCounts)
    return hourCounts
      .map((count, hour) => (count === maxCount ? hour : -1))
      .filter(hour => hour >= 0)
  }

  /**
   * Get error rate
   */
  async getErrorRate(
    context: string,
    timeRange: TimeRange
  ): Promise<{
    totalErrors: number
    totalEvents: number
    errorRate: number
    errorTypes: Record<string, number>
  }> {
    const { start, end } = getTimeRangeBoundaries(timeRange)
    const [errorEvents, allEvents] = await Promise.all([
      analyticsEventStore.queryEvents({
        startTime: start,
        endTime: end,
        types: ['error_occurred'],
      }),
      analyticsEventStore.queryEvents({
        startTime: start,
        endTime: end,
      }),
    ])

    const errorTypes: Record<string, number> = {}

    for (const event of errorEvents) {
      const data = event.data as any
      const errorType = data.errorType || 'unknown'
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1
    }

    return {
      totalErrors: errorEvents.length,
      totalEvents: allEvents.length,
      errorRate: allEvents.length ? errorEvents.length / allEvents.length : 0,
      errorTypes,
    }
  }
}

// ============================================================================
// GLOBAL AGGREGATOR INSTANCE
// ============================================================================

/**
 * Global aggregator instance
 */
export const analyticsAggregator = new AnalyticsAggregator()
