/**
 * Spread Metrics Definitions
 *
 * Core metric types for tracking spread operations.
 */

// ============================================================================
// CORE METRICS
// ============================================================================

/**
 * Overall spread metrics across all operations
 */
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

// ============================================================================
// EFFICIENCY METRICS
// ============================================================================

/**
 * Time and cost efficiency measurements
 */
export interface EfficiencyMetrics {
  // Time metrics
  serialDuration: number // Total time if done serially (ms)
  parallelDuration: number // Actual parallel duration (ms)
  timeSaved: number // Time saved (ms)
  timeSavedPercentage: number // Time saved as percentage

  // Cost metrics
  serialCost: number // Cost if done serially with cheapest model
  actualCost: number // Actual cost with optimal models
  costSaved: number // Money saved
  costSavedPercentage: number // Money saved as percentage

  // Overall efficiency
  efficiencyScore: number // Combined score 0-100
}

/**
 * Detailed efficiency report for a single spread
 */
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
  efficiencyScore: number
}

// ============================================================================
// QUALITY METRICS
// ============================================================================

/**
 * Result quality measurements
 */
export interface QualityMetrics {
  resultQuality: number // User rating 1-5
  conflictRate: number // Number of conflicts per merge
  autoMergeRate: number // Percentage of auto-merged tasks

  // Quality breakdown
  accuracyScore: number // How accurate results were
  completenessScore: number // How complete results were
  relevanceScore: number // How relevant results were

  // Overall quality
  qualityScore: number // Combined score 0-100
}

/**
 * Detailed quality report for a single spread
 */
export interface QualityReport {
  spreadId: string
  taskCount: number
  resultQuality: number
  conflictRate: number
  autoMergeRate: number
  accuracyScore: number
  completenessScore: number
  relevanceScore: number
  qualityScore: number
}

// ============================================================================
// PERFORMANCE METRICS
// ============================================================================

/**
 * Speed and reliability measurements
 */
export interface PerformanceMetrics {
  // Speed metrics
  avgTaskDuration: number // Average time per task (ms)
  fastestTask: number // Fastest task completion (ms)
  slowestTask: number // Slowest task completion (ms)

  // Reliability metrics
  successRate: number // Percentage of successful tasks
  failureRate: number // Percentage of failed tasks
  retryRate: number // Percentage of tasks that needed retry

  // Overall performance
  performanceScore: number // Combined score 0-100
}

/**
 * Detailed performance report for a single spread
 */
export interface PerformanceReport {
  spreadId: string
  taskCount: number
  avgTaskDuration: number
  fastestTask: number
  slowestTask: number
  successRate: number
  failureRate: number
  retryRate: number
  performanceScore: number
}

// ============================================================================
// SUCCESS RATE METRICS
// ============================================================================

/**
 * Success rate breakdown
 */
export interface SuccessRateReport {
  spreadId: string
  overallRate: number // 0-1
  successCount: number
  failCount: number
  byType: Record<string, { success: number; fail: number; rate: number }>
}

// ============================================================================
// TASK TYPE METRICS
// ============================================================================

/**
 * Metrics by task type (code, research, writing, etc.)
 */
export interface TaskTypeMetrics {
  taskType: string
  totalTasks: number
  successfulTasks: number
  failedTasks: number
  successRate: number
  avgDuration: number
  avgCost: number

  // Comparison to other types
  relativeSuccessRate: number // Compared to average
  relativeEfficiency: number // Compared to average
}

// ============================================================================
// TIME SERIES METRICS
// ============================================================================

/**
 * Metrics over time for trend analysis
 */
export interface TimeSeriesDataPoint {
  timestamp: number
  value: number
  label?: string
}

export interface TimeSeriesMetrics {
  metric: string
  data: TimeSeriesDataPoint[]
  trend: 'increasing' | 'decreasing' | 'stable'
  averageChange: number
  variance: number
}

// ============================================================================
// COMPARISON METRICS
// ============================================================================

/**
 * Comparison between two groups of spreads
 */
export interface ComparisonMetrics {
  groupA: {
    name: string
    metrics: SpreadMetrics
  }
  groupB: {
    name: string
    metrics: SpreadMetrics
  }
  differences: {
    timeSaved: number // Percentage difference
    costSaved: number // Percentage difference
    successRate: number // Percentage difference
    winner: 'groupA' | 'groupB' | 'tie'
  }
}

// ============================================================================
// AGGREGATION FUNCTIONS
// ============================================================================

/**
 * Aggregate multiple efficiency reports into summary
 */
export function aggregateEfficiencyReports(reports: EfficiencyReport[]): {
  avgTimeSaved: number
  avgCostSaved: number
  avgEfficiencyScore: number
  bestSpread: string
  worstSpread: string
} {
  if (reports.length === 0) {
    return {
      avgTimeSaved: 0,
      avgCostSaved: 0,
      avgEfficiencyScore: 0,
      bestSpread: '',
      worstSpread: ''
    }
  }

  const avgTimeSaved = reports.reduce((sum, r) => sum + r.timeSavedPercentage, 0) / reports.length
  const avgCostSaved = reports.reduce((sum, r) => sum + r.costSavedPercentage, 0) / reports.length
  const avgEfficiencyScore = reports.reduce((sum, r) => sum + r.efficiencyScore, 0) / reports.length

  const sortedByScore = [...reports].sort((a, b) => b.efficiencyScore - a.efficiencyScore)
  const bestSpread = sortedByScore[0]?.spreadId || ''
  const worstSpread = sortedByScore[sortedByScore.length - 1]?.spreadId || ''

  return {
    avgTimeSaved,
    avgCostSaved,
    avgEfficiencyScore,
    bestSpread,
    worstSpread
  }
}

/**
 * Aggregate multiple quality reports into summary
 */
export function aggregateQualityReports(reports: QualityReport[]): {
  avgQuality: number
  avgConflictRate: number
  avgAutoMergeRate: number
  bestSpread: string
  worstSpread: string
} {
  if (reports.length === 0) {
    return {
      avgQuality: 0,
      avgConflictRate: 0,
      avgAutoMergeRate: 0,
      bestSpread: '',
      worstSpread: ''
    }
  }

  const avgQuality = reports.reduce((sum, r) => sum + r.qualityScore, 0) / reports.length
  const avgConflictRate = reports.reduce((sum, r) => sum + r.conflictRate, 0) / reports.length
  const avgAutoMergeRate = reports.reduce((sum, r) => sum + r.autoMergeRate, 0) / reports.length

  const sortedByScore = [...reports].sort((a, b) => b.qualityScore - a.qualityScore)
  const bestSpread = sortedByScore[0]?.spreadId || ''
  const worstSpread = sortedByScore[sortedByScore.length - 1]?.spreadId || ''

  return {
    avgQuality,
    avgConflictRate,
    avgAutoMergeRate,
    bestSpread,
    worstSpread
  }
}

/**
 * Calculate percentile from array of numbers
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

/**
 * Calculate standard deviation
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length

  return Math.sqrt(variance)
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * Format cost in USD
 */
export function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Calculate trend from time series data
 */
export function calculateTrend(data: TimeSeriesDataPoint[]): 'increasing' | 'decreasing' | 'stable' {
  if (data.length < 2) return 'stable'

  // Calculate linear regression
  const n = data.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += data[i].value
    sumXY += i * data[i].value
    sumX2 += i * i
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

  // Determine trend based on slope
  const threshold = data[0].value * 0.05 // 5% threshold

  if (slope > threshold) return 'increasing'
  if (slope < -threshold) return 'decreasing'
  return 'stable'
}
