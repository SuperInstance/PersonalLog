/**
 * Analytics Query API
 *
 * High-level query functions for common analytics patterns.
 */

import { analyticsAggregator } from './aggregator'
import { analyticsEventStore, applyRetentionPolicy } from './storage'
import {
  TimeRange,
  FeatureUsageStats,
  ErrorStats,
  PerformanceMetrics,
  EngagementSummary,
  AnalyticsEvent,
  AnalyticsExport,
  AggregatedStats,
} from './types'

/**
 * Get events with optional filters
 * Convenience function for backward compatibility
 */
export async function getEvents(options?: {
  startTime?: string
  endTime?: string
  types?: string[]
  categories?: string[]
  sessionIds?: string[]
  limit?: number
  offset?: number
  sortOrder?: 'asc' | 'desc'
}): Promise<AnalyticsEvent[]> {
  return analyticsEventStore.queryEvents(options)
}

// ============================================================================
// USAGE QUERIES
// ============================================================================

/**
 * Get most used features in the given time range
 */
export async function getMostUsedFeatures(
  days: number = 7,
  limit: number = 10
): Promise<FeatureUsageStats[]> {
  const timeRange: TimeRange = { type: 'days', value: days }
  return analyticsAggregator.getMostUsedFeatures(timeRange, limit)
}

/**
 * Get feature usage for a specific feature
 */
export async function getFeatureUsage(
  featureId: string,
  days: number = 30
): Promise<FeatureUsageStats | null> {
  const features = await getMostUsedFeatures(days, 100)
  return features.find(f => f.featureId === featureId) || null
}

/**
 * Get feature adoption rate
 */
export async function getFeatureAdoptionRate(
  featureId: string,
  days: number = 30
): Promise<{
  uniqueUsers: number
  totalUsers: number
  adoptionRate: number
  trend: 'increasing' | 'decreasing' | 'stable'
}> {
  const timeRange: TimeRange = { type: 'days', value: days }
  const { start, end } = getTimeRangeBoundaries(timeRange)

  const events = await analyticsEventStore.queryEvents({
    startTime: start,
    endTime: end,
    types: ['feature_used'],
  })

  const uniqueSessions = new Set<string>()
  const featureSessions = new Set<string>()

  for (const event of events) {
    uniqueSessions.add(event.sessionId)
    if ((event.data as any).featureId === featureId) {
      featureSessions.add(event.sessionId)
    }
  }

  const totalUsers = uniqueSessions.size
  const uniqueUsers = featureSessions.size

  return {
    uniqueUsers,
    totalUsers,
    adoptionRate: totalUsers ? uniqueUsers / totalUsers : 0,
    trend: 'stable',
  }
}

// ============================================================================
// ENGAGEMENT QUERIES
// ============================================================================

/**
 * Get overall engagement summary
 */
export async function getEngagementSummary(
  days: number = 7
): Promise<EngagementSummary> {
  const timeRange: TimeRange = { type: 'days', value: days }
  return analyticsAggregator.getEngagementSummary(timeRange)
}

/**
 * Get peak usage hours
 */
export async function getPeakUsageHours(
  days: number = 7
): Promise<number[]> {
  const timeRange: TimeRange = { type: 'days', value: days }
  return analyticsAggregator.getPeakUsageHours(timeRange)
}

/**
 * Get daily active sessions
 */
export async function getDailyActiveSessions(
  days: number = 30
): Promise<Array<{ date: string; sessions: number }>> {
  const timeRange: TimeRange = { type: 'days', value: days }
  const timeSeries = await analyticsAggregator.getTimeSeries(
    timeRange,
    'day',
    'session_start'
  )

  return timeSeries.map(point => ({
    date: point.timestamp.split('T')[0],
    sessions: point.value,
  }))
}

/**
 * Get session statistics
 */
export async function getSessionStats(
  days: number = 7
): Promise<{
  totalSessions: number
  avgDuration: number
  medianDuration: number
  retentionRate: number
}> {
  const timeRange: TimeRange = { type: 'days', value: days }
  const { start, end } = getTimeRangeBoundaries(timeRange)

  const events = await analyticsEventStore.queryEvents({
    startTime: start,
    endTime: end,
    types: ['session_end'],
  })

  if (events.length === 0) {
    return {
      totalSessions: 0,
      avgDuration: 0,
      medianDuration: 0,
      retentionRate: 0,
    }
  }

  const durations = events.map(e => (e.data as any).duration || 0)
  durations.sort((a, b) => a - b)

  return {
    totalSessions: events.length,
    avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    medianDuration: durations[Math.floor(durations.length / 2)],
    retentionRate: 0, // Simplified - would need more complex calculation
  }
}

// ============================================================================
// PERFORMANCE QUERIES
// ============================================================================

/**
 * Get performance metrics for all operations
 */
export async function getPerformanceMetrics(
  days: number = 7
): Promise<PerformanceMetrics[]> {
  const timeRange: TimeRange = { type: 'days', value: days }
  return analyticsAggregator.getPerformanceMetrics(timeRange)
}

/**
 * Get API response time statistics
 */
export async function getAPIResponseStats(
  days: number = 7
): Promise<AggregatedStats> {
  const timeRange: TimeRange = { type: 'days', value: days }
  const { start, end } = getTimeRangeBoundaries(timeRange)

  const events = await analyticsEventStore.queryEvents({
    startTime: start,
    endTime: end,
    types: ['api_response'],
  })

  const durations = events
    .map(e => (e.data as any).duration)
    .filter(d => d !== undefined)

  if (durations.length === 0) {
    return { count: 0 }
  }

  const sorted = [...durations].sort((a, b) => a - b)
  const sum = durations.reduce((a, b) => a + b, 0)

  return {
    count: durations.length,
    sum,
    average: sum / durations.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    percentiles: {
      p50: sorted[Math.floor(durations.length * 0.5)],
      p90: sorted[Math.floor(durations.length * 0.9)],
      p95: sorted[Math.floor(durations.length * 0.95)],
      p99: sorted[Math.floor(durations.length * 0.99)],
    },
  }
}

/**
 * Get render performance statistics
 */
export async function getRenderPerformanceStats(
  days: number = 7
): Promise<Array<{ component: string; avgDuration: number; p95: number }>> {
  const timeRange: TimeRange = { type: 'days', value: days }
  const { start, end } = getTimeRangeBoundaries(timeRange)

  const events = await analyticsEventStore.queryEvents({
    startTime: start,
    endTime: end,
    types: ['render_complete'],
  })

  const componentStats = new Map<
    string,
    { durations: number[]; count: number }
  >()

  for (const event of events) {
    const data = event.data as any
    const component = data.component || 'unknown'
    const duration = data.duration || 0

    const stats = componentStats.get(component) || {
      durations: [],
      count: 0,
    }

    stats.durations.push(duration)
    stats.count++
    componentStats.set(component, stats)
  }

  return Array.from(componentStats.entries()).map(([component, stats]) => {
    const sorted = [...stats.durations].sort((a, b) => a - b)
    return {
      component,
      avgDuration: stats.durations.reduce((a, b) => a + b, 0) / stats.count,
      p95: sorted[Math.floor(stats.count * 0.95)],
    }
  })
}

/**
 * Get storage operation performance
 */
export async function getStoragePerformance(
  days: number = 7
): Promise<{
  avgReadTime: number
  avgWriteTime: number
  totalOperations: number
  successRate: number
}> {
  const timeRange: TimeRange = { type: 'days', value: days }
  const { start, end } = getTimeRangeBoundaries(timeRange)

  const events = await analyticsEventStore.queryEvents({
    startTime: start,
    endTime: end,
    types: ['storage_operation'],
  })

  const readTimes: number[] = []
  const writeTimes: number[] = []
  let totalOperations = events.length
  let successes = 0

  for (const event of events) {
    const data = event.data as any
    const duration = data.duration || 0
    const success = data.success !== false

    if (success) successes++

    if (data.operation === 'read') {
      readTimes.push(duration)
    } else if (data.operation === 'write') {
      writeTimes.push(duration)
    }
  }

  const avgReadTime = readTimes.length
    ? readTimes.reduce((a, b) => a + b, 0) / readTimes.length
    : 0

  const avgWriteTime = writeTimes.length
    ? writeTimes.reduce((a, b) => a + b, 0) / writeTimes.length
    : 0

  return {
    avgReadTime,
    avgWriteTime,
    totalOperations,
    successRate: totalOperations ? successes / totalOperations : 0,
  }
}

// ============================================================================
// ERROR QUERIES
// ============================================================================

/**
 * Get error statistics
 */
export async function getErrorStats(
  days: number = 7,
  limit: number = 10
): Promise<ErrorStats[]> {
  const timeRange: TimeRange = { type: 'days', value: days }
  return analyticsAggregator.getErrorStats(timeRange, limit)
}

/**
 * Get error rate for a specific context
 */
export async function getErrorRate(
  context: string,
  hours: number = 24
): Promise<{
  totalErrors: number
  totalEvents: number
  errorRate: number
  errorTypes: Record<string, number>
}> {
  const timeRange: TimeRange = { type: 'hours', value: hours }
  return analyticsAggregator.getErrorRate(context, timeRange)
}

/**
 * Get most frequent errors
 */
export async function getMostFrequentErrors(
  days: number = 7,
  limit: number = 10
): Promise<ErrorStats[]> {
  return getErrorStats(days, limit)
}

/**
 * Get unrecovered errors
 */
export async function getUnrecoveredErrors(
  days: number = 7
): Promise<Array<{ errorType: string; count: number; lastOccurred: string }>> {
  const timeRange: TimeRange = { type: 'days', value: days }
  const { start, end } = getTimeRangeBoundaries(timeRange)

  const [errorEvents, recoveryEvents] = await Promise.all([
    analyticsEventStore.queryEvents({
      startTime: start,
      endTime: end,
      types: ['error_occurred'],
    }),
    analyticsEventStore.queryEvents({
      startTime: start,
      endTime: end,
      types: ['error_recovered'],
    }),
  ])

  const recoveredTypes = new Set(
    recoveryEvents.map(e => (e.data as any).errorType)
  )

  const unrecovered = new Map<string, { count: number; lastOccurred: string }>()

  for (const event of errorEvents) {
    const data = event.data as any
    const errorType = data.errorType || 'unknown'

    if (recoveredTypes.has(errorType)) continue

    const existing = unrecovered.get(errorType) || {
      count: 0,
      lastOccurred: event.timestamp,
    }

    existing.count++
    if (event.timestamp > existing.lastOccurred) {
      existing.lastOccurred = event.timestamp
    }

    unrecovered.set(errorType, existing)
  }

  return Array.from(unrecovered.entries()).map(([errorType, data]) => ({
    errorType,
    count: data.count,
    lastOccurred: data.lastOccurred,
  }))
}

// ============================================================================
// USER ACTION QUERIES
// ============================================================================

/**
 * Get message statistics
 */
export async function getMessageStats(
  days: number = 7
): Promise<{
  totalMessages: number
  avgMessageLength: number
  totalWithAttachments: number
  replyRate: number
}> {
  const timeRange: TimeRange = { type: 'days', value: days }
  const { start, end } = getTimeRangeBoundaries(timeRange)

  const events = await analyticsEventStore.queryEvents({
    startTime: start,
    endTime: end,
    types: ['message_sent'],
  })

  if (events.length === 0) {
    return {
      totalMessages: 0,
      avgMessageLength: 0,
      totalWithAttachments: 0,
      replyRate: 0,
    }
  }

  const lengths = events.map(e => (e.data as any).messageLength || 0)
  const withAttachments = events.filter(e => (e.data as any).hasAttachment).length
  const replies = events.filter(e => (e.data as any).replyToMessage).length

  return {
    totalMessages: events.length,
    avgMessageLength: lengths.reduce((a, b) => a + b, 0) / lengths.length,
    totalWithAttachments: withAttachments,
    replyRate: replies / events.length,
  }
}

/**
 * Get conversation statistics
 */
export async function getConversationStats(
  days: number = 7
): Promise<{
  created: number
  archived: number
  deleted: number
  avgAgeAtArchive: number
}> {
  const timeRange: TimeRange = { type: 'days', value: days }
  const { start, end } = getTimeRangeBoundaries(timeRange)

  const [created, archived, deleted] = await Promise.all([
    analyticsEventStore.queryEvents({
      startTime: start,
      endTime: end,
      types: ['conversation_created'],
    }),
    analyticsEventStore.queryEvents({
      startTime: start,
      endTime: end,
      types: ['conversation_archived'],
    }),
    analyticsEventStore.queryEvents({
      startTime: start,
      endTime: end,
      types: ['conversation_deleted'],
    }),
  ])

  const archiveAges = archived.map(e => (e.data as any).conversationAge || 0)
  const avgAgeAtArchive = archiveAges.length
    ? archiveAges.reduce((a, b) => a + b, 0) / archiveAges.length
    : 0

  return {
    created: created.length,
    archived: archived.length,
    deleted: deleted.length,
    avgAgeAtArchive,
  }
}

// ============================================================================
// EXPORT & MAINTENANCE
// ============================================================================

/**
 * Export all analytics data
 */
export async function exportAnalyticsData(
  days: number = 30
): Promise<AnalyticsExport> {
  const timeRange: TimeRange = { type: 'days', value: days }
  const { start, end } = getTimeRangeBoundaries(timeRange)

  const events = await analyticsEventStore.queryEvents({
    startTime: start,
    endTime: end,
  })

  const userActions = await analyticsAggregator.getEventCountsByCategory(timeRange)
  const performanceMetrics = await analyticsAggregator.getPerformanceMetrics(timeRange)
  const engagement = await analyticsAggregator.getEngagementSummary(timeRange)
  const errors = await analyticsAggregator.getErrorStats(timeRange)

  return {
    exportedAt: new Date().toISOString(),
    timeRange: { start, end },
    eventCount: events.length,
    events,
    summaries: {
      userActions: {
        count: (userActions.user_action || 0) as number,
      },
      performance: {
        count: (userActions.performance || 0) as number,
      },
      engagement: {
        count: (userActions.engagement || 0) as number,
      },
      errors: {
        count: (userActions.error || 0) as number,
      },
    },
  }
}

/**
 * Delete analytics data
 */
export async function deleteAnalyticsData(
  days: number
): Promise<number> {
  return applyRetentionPolicy(days)
}

/**
 * Clear all analytics data
 */
export async function clearAllAnalyticsData(): Promise<void> {
  await analyticsEventStore.clearAllEvents()
}

/**
 * Get analytics storage info
 */
export async function getAnalyticsStorageInfo(): Promise<{
  eventCount: number
  estimatedSizeBytes: number
  estimatedSizeMB: number
}> {
  const { eventCount, estimatedSizeBytes } =
    await analyticsEventStore.countEvents().then(count => ({
      eventCount: count,
      estimatedSizeBytes: count * 500, // Rough estimate
    }))

  return {
    eventCount,
    estimatedSizeBytes,
    estimatedSizeMB: estimatedSizeBytes / (1024 * 1024),
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getTimeRangeBoundaries(timeRange: TimeRange): {
  start: string
  end: string
} {
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
