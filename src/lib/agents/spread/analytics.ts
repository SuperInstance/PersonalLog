/**
 * Spread Analytics Engine
 *
 * Tracks all spread operations, calculates efficiency metrics, and provides insights.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb'

// ============================================================================
// TYPES
// ============================================================================

export interface SpreadTask {
  id: string
  task: string
  model: string
  startTime: number
  endTime?: number
  duration?: number
  status: 'pending' | 'running' | 'complete' | 'failed'
  tokenCount: number
  cost: number
}

export interface SpreadEvent {
  id: string
  timestamp: number

  // Spread info
  spreadId: string
  parentConversationId: string
  taskCount: number

  // Tasks
  tasks: SpreadTask[]

  // Results
  results: {
    totalDuration: number
    serialDuration: number // If done serially
    timeSaved: number
    timeSavedPercentage: number
    totalCost: number
    serialCost: number // If done serially with cheapest model
    costSaved: number
    successCount: number
    failCount: number
  }

  // Quality
  quality: {
    resultQuality: number // User rating 1-5
    conflictRate: number // Conflicts per merge
    autoMergeRate: number // Auto-merged / total
  }
}

export interface SpreadMetrics {
  totalSpreads: number
  totalTasks: number
  successfulTasks: number
  failedTasks: number
  avgTimeSaved: number
  avgCostSaved: number
  avgSuccessRate: number
  dateRange: { start: Date; end: Date }
}

export interface EfficiencyReport {
  spreadId: string
  taskCount: number
  serialDuration: number
  parallelDuration: number
  timeSaved: number
  timeSavedPercentage: number
  serialCost: number
  actualCost: number
  costSaved: number
  costSavedPercentage: number
  efficiencyScore: number // 0-100
}

export interface SuccessRateReport {
  spreadId: string
  overallRate: number // 0-1
  successCount: number
  failCount: number
  byType: Record<string, { success: number; fail: number; rate: number }>
}

interface SpreadAnalyticsDB extends DBSchema {
  spreads: {
    key: string
    value: SpreadEvent
    indexes: {
      'by-timestamp': number
      'by-parent': string
    }
  }
}

// ============================================================================
// ANALYTICS CLASS
// ============================================================================

export class SpreadAnalytics {
  private db: IDBPDatabase<SpreadAnalyticsDB> | null = null
  private readonly DB_NAME = 'SpreadAnalytics'
  private readonly DB_VERSION = 1

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.db) return

    this.db = await openDB<SpreadAnalyticsDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('spreads', { keyPath: 'id' })
        store.createIndex('by-timestamp', 'timestamp')
        store.createIndex('by-parent', 'parentConversationId')
      }
    })
  }

  /**
   * Track a spread event
   */
  async trackSpread(spreadId: string, data: Partial<SpreadEvent>): Promise<void> {
    await this.init()

    const event: SpreadEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      spreadId,
      parentConversationId: data.parentConversationId || '',
      taskCount: data.taskCount || 0,
      tasks: data.tasks || [],
      results: data.results || {
        totalDuration: 0,
        serialDuration: 0,
        timeSaved: 0,
        timeSavedPercentage: 0,
        totalCost: 0,
        serialCost: 0,
        costSaved: 0,
        successCount: 0,
        failCount: 0
      },
      quality: data.quality || {
        resultQuality: 0,
        conflictRate: 0,
        autoMergeRate: 0
      }
    }

    await this.db!.put('spreads', event)
  }

  /**
   * Update a spread event (e.g., when tasks complete)
   */
  async updateSpread(spreadId: string, updates: Partial<SpreadEvent>): Promise<void> {
    await this.init()

    const events = await this.db!.getAllFromIndex('spreads', 'by-parent', spreadId)
    if (events.length === 0) return

    const event = events[0]
    const updated = { ...event, ...updates }
    await this.db!.put('spreads', updated)
  }

  /**
   * Get a specific spread event
   */
  async getSpread(spreadId: string): Promise<SpreadEvent | null> {
    await this.init()

    // Try direct key first
    try {
      const result = await this.db!.get('spreads', spreadId)
      return result || null
    } catch {
      // Try by parent ID
      const events = await this.db!.getAllFromIndex('spreads', 'by-parent', spreadId)
      return events[0] || null
    }
  }

  /**
   * Get all spreads in a date range
   */
  async getAllSpreads(startDate: Date, endDate: Date): Promise<SpreadEvent[]> {
    await this.init()

    const events = await this.db!.getAll('spreads')
    return events.filter(e => e.timestamp >= startDate.getTime() && e.timestamp <= endDate.getTime())
  }

  /**
   * Get metrics for a date range
   */
  async getMetrics(startDate: Date, endDate: Date): Promise<SpreadMetrics> {
    const events = await this.getAllSpreads(startDate, endDate)

    if (events.length === 0) {
      return {
        totalSpreads: 0,
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0,
        avgTimeSaved: 0,
        avgCostSaved: 0,
        avgSuccessRate: 0,
        dateRange: { start: startDate, end: endDate }
      }
    }

    const totalTasks = events.reduce((sum, e) => sum + e.taskCount, 0)
    const successfulTasks = events.reduce((sum, e) => sum + e.results.successCount, 0)
    const failedTasks = events.reduce((sum, e) => sum + e.results.failCount, 0)

    const avgTimeSaved = events.reduce((sum, e) => sum + e.results.timeSaved, 0) / events.length
    const avgCostSaved = events.reduce((sum, e) => sum + e.results.costSaved, 0) / events.length

    const avgSuccessRate = events.reduce((sum, e) => {
      const total = e.results.successCount + e.results.failCount
      if (total === 0) return sum
      const rate = e.results.successCount / total
      return sum + rate
    }, 0) / events.length

    return {
      totalSpreads: events.length,
      totalTasks,
      successfulTasks,
      failedTasks,
      avgTimeSaved,
      avgCostSaved,
      avgSuccessRate,
      dateRange: { start: startDate, end: endDate }
    }
  }

  /**
   * Calculate efficiency for a specific spread
   */
  async calculateEfficiency(spreadId: string): Promise<EfficiencyReport> {
    const event = await this.getSpread(spreadId)

    if (!event) {
      throw new Error(`Spread ${spreadId} not found`)
    }

    const completedTasks = event.tasks.filter(t => t.status === 'complete')

    // Calculate serial duration (if done one by one)
    const serialDuration = completedTasks.reduce((sum, task) => {
      const duration = task.duration || 0
      return sum + duration + 10000 // +10s overhead per task in ms
    }, 0)

    // Actual parallel duration
    const parallelDuration = event.results.totalDuration

    const timeSaved = serialDuration - parallelDuration
    const timeSavedPercentage = serialDuration > 0 ? (timeSaved / serialDuration) * 100 : 0

    // Calculate serial cost (all tasks with cheapest model)
    const cheapestModelCost = 0.5 // GPT-3.5 Turbo per 1M tokens
    const serialCost = completedTasks.reduce((sum, task) => {
      return sum + (task.tokenCount / 1e6) * cheapestModelCost
    }, 0)

    // Actual cost with optimal model selection
    const actualCost = event.results.totalCost

    const costSaved = serialCost - actualCost
    const costSavedPercentage = serialCost > 0 ? (costSaved / serialCost) * 100 : 0

    const efficiencyScore = (timeSavedPercentage + costSavedPercentage) / 2

    return {
      spreadId,
      taskCount: completedTasks.length,
      serialDuration,
      parallelDuration,
      timeSaved,
      timeSavedPercentage,
      serialCost,
      actualCost,
      costSaved,
      costSavedPercentage,
      efficiencyScore
    }
  }

  /**
   * Calculate success rate for a specific spread
   */
  async calculateSuccessRate(spreadId: string): Promise<SuccessRateReport> {
    const event = await this.getSpread(spreadId)

    if (!event) {
      throw new Error(`Spread ${spreadId} not found`)
    }

    const total = event.results.successCount + event.results.failCount
    const overallRate = total > 0 ? event.results.successCount / total : 0

    // Success by task type
    const byType: Record<string, { success: number; fail: number; rate: number }> = {}

    for (const task of event.tasks) {
      const type = this.inferTaskType(task.task)

      if (!byType[type]) {
        byType[type] = { success: 0, fail: 0, rate: 0 }
      }

      if (task.status === 'complete') {
        byType[type].success++
      } else if (task.status === 'failed') {
        byType[type].fail++
      }

      const typeTotal = byType[type].success + byType[type].fail
      byType[type].rate = typeTotal > 0 ? byType[type].success / typeTotal : 0
    }

    return {
      spreadId,
      overallRate,
      successCount: event.results.successCount,
      failCount: event.results.failCount,
      byType
    }
  }

  /**
   * Compare strategies (A/B testing)
   */
  async compareStrategies(
    startDate: Date,
    endDate: Date,
    groupBy: 'model' | 'taskCount' | 'timeOfDay'
  ): Promise<Record<string, SpreadMetrics>> {
    const events = await this.getAllSpreads(startDate, endDate)

    const groups: Record<string, SpreadEvent[]> = {}

    for (const event of events) {
      let key = ''

      switch (groupBy) {
        case 'model':
          // Use most common model
          const modelCounts: Record<string, number> = {}
          for (const task of event.tasks) {
            modelCounts[task.model] = (modelCounts[task.model] || 0) + 1
          }
          key = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'
          break

        case 'taskCount':
          key = `${event.taskCount} tasks`
          break

        case 'timeOfDay':
          const hour = new Date(event.timestamp).getHours()
          if (hour < 12) key = 'morning'
          else if (hour < 18) key = 'afternoon'
          else key = 'evening'
          break
      }

      if (!groups[key]) groups[key] = []
      groups[key].push(event)
    }

    // Calculate metrics for each group
    const result: Record<string, SpreadMetrics> = {}

    for (const [key, groupEvents] of Object.entries(groups)) {
      const totalTasks = groupEvents.reduce((sum, e) => sum + e.taskCount, 0)
      const successfulTasks = groupEvents.reduce((sum, e) => sum + e.results.successCount, 0)
      const failedTasks = groupEvents.reduce((sum, e) => sum + e.results.failCount, 0)

      const avgTimeSaved = groupEvents.reduce((sum, e) => sum + e.results.timeSaved, 0) / groupEvents.length
      const avgCostSaved = groupEvents.reduce((sum, e) => sum + e.results.costSaved, 0) / groupEvents.length

      const avgSuccessRate = groupEvents.reduce((sum, e) => {
        const total = e.results.successCount + e.results.failCount
        if (total === 0) return sum
        return sum + e.results.successCount / total
      }, 0) / groupEvents.length

      result[key] = {
        totalSpreads: groupEvents.length,
        totalTasks,
        successfulTasks,
        failedTasks,
        avgTimeSaved,
        avgCostSaved,
        avgSuccessRate,
        dateRange: { start: startDate, end: endDate }
      }
    }

    return result
  }

  /**
   * Infer task type from description
   */
  private inferTaskType(task: string): string {
    const lower = task.toLowerCase()

    if (lower.includes('code') || lower.includes('implement') || lower.includes('function')) return 'code'
    if (lower.includes('research') || lower.includes('analyze') || lower.includes('investigate')) return 'research'
    if (lower.includes('write') || lower.includes('draft') || lower.includes('document')) return 'writing'
    if (lower.includes('design') || lower.includes('ui') || lower.includes('ux')) return 'design'
    if (lower.includes('test') || lower.includes('verify') || lower.includes('check')) return 'testing'

    return 'general'
  }

  /**
   * Delete old analytics data
   */
  async deleteOldData(olderThanDays: number): Promise<number> {
    await this.init()

    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000
    const events = await this.db!.getAll('spreads')

    let deleted = 0
    for (const event of events) {
      if (event.timestamp < cutoff) {
        await this.db!.delete('spreads', event.id)
        deleted++
      }
    }

    return deleted
  }

  /**
   * Export all data as JSON
   */
  async exportData(): Promise<string> {
    await this.init()

    const events = await this.db!.getAll('spreads')
    return JSON.stringify(events, null, 2)
  }

  /**
   * Import data from JSON
   */
  async importData(json: string): Promise<number> {
    await this.init()

    const events = JSON.parse(json) as SpreadEvent[]
    let imported = 0

    for (const event of events) {
      await this.db!.put('spreads', event)
      imported++
    }

    return imported
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let analyticsInstance: SpreadAnalytics | null = null

export function getSpreadAnalytics(): SpreadAnalytics {
  if (!analyticsInstance) {
    analyticsInstance = new SpreadAnalytics()
  }
  return analyticsInstance
}
