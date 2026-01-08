/**
 * PersonalLog - Advanced Behavioral Pattern Analysis
 *
 * Detects and learns from complex usage patterns including:
 * - Temporal patterns (time-based usage)
 * - Sequential patterns (action sequences)
 * - Contextual patterns (feature relationships)
 * - Workflow patterns (multi-step processes)
 * - Exceptional patterns (anomalies)
 */

import type {
  UserAction,
  InteractionPatterns,
  PreferenceKey,
  PreferenceValue,
} from './types'

// ============================================================================
// TYPES
// ============================================================================

export interface TimePatterns {
  /** Peak usage hours by day of week */
  peakHoursByDay: Record<number, number[]> // 0-6 (Sun-Sat) -> array of hours
  /** Most active days */
  mostActiveDays: number[]
  /** Session duration patterns */
  sessionDurationPattern: {
    short: number // % of sessions < 5 min
    medium: number // % of sessions 5-15 min
    long: number // % of sessions > 15 min
  }
  /** Time-based preferences */
  timeBasedPreferences: {
    morning: string[] // features used 6-12
    afternoon: string[] // features used 12-18
    evening: string[] // features used 18-24
    night: string[] // features used 0-6
  }
}

export interface TaskPatterns {
  /** Common task types detected */
  taskTypes: string[]
  /** Task -> preferred provider mapping */
  taskProviderMapping: Record<string, string>
  /** Task -> typical features used */
  taskFeatureMapping: Record<string, string[]>
  /** Task success rate */
  taskSuccessRate: Record<string, number>
}

export interface WorkflowPattern {
  /** Workflow name */
  name: string
  /** Sequence of actions */
  sequence: string[]
  /** Frequency (how often this occurs) */
  frequency: number
  /** Average time to complete */
  avgDuration: number
  /** Success rate */
  successRate: number
}

export interface ContextualPattern {
  /** Trigger action */
  trigger: string
  /** Likely next action */
  nextAction: string
  /** Confidence (0-1) */
  confidence: number
  /** Time between actions (ms) */
  avgTimeBetween: number
}

export interface Anomaly {
  /** Anomaly type */
  type: 'error_spike' | 'unusual_feature' | 'session_abnormality' | 'preference_change'
  /** Description */
  description: string
  /** When detected */
  timestamp: string
  /** Severity */
  severity: 'low' | 'medium' | 'high'
}

export interface PatternContext {
  /** Current task/context */
  currentTask?: string
  /** Recent actions */
  recentActions: UserAction[]
  /** Current session duration */
  sessionDuration?: number
  /** Time of day */
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  /** Day of week */
  dayOfWeek: number
}

// ============================================================================
// TIME PATTERN ANALYZER
// ============================================================================

export class TimePatternAnalyzer {
  private hourlyActivity = new Map<string, number>() // "day-hour" -> count
  private sessionDurations: number[] = []
  private featureTimeUsage = new Map<string, number[]>() // feature -> array of hours used

  /**
   * Record user activity at specific time
   */
  recordActivity(action: UserAction): void {
    const date = new Date(action.timestamp)
    const day = date.getDay()
    const hour = date.getHours()
    const key = `${day}-${hour}`

    const current = this.hourlyActivity.get(key) || 0
    this.hourlyActivity.set(key, current + 1)

    // Track feature usage by time
    const feature = action.context?.feature
    if (feature) {
      const hours = this.featureTimeUsage.get(feature) || []
      hours.push(hour)
      this.featureTimeUsage.set(feature, hours.slice(-100)) // Keep last 100
    }
  }

  /**
   * Record session duration
   */
  recordSession(duration: number): void {
    this.sessionDurations.push(duration)
    if (this.sessionDurations.length > 200) {
      this.sessionDurations.shift()
    }
  }

  /**
   * Detect time-based patterns
   */
  detectPatterns(): TimePatterns {
    const patterns: TimePatterns = {
      peakHoursByDay: {},
      mostActiveDays: [],
      sessionDurationPattern: { short: 0, medium: 0, long: 0 },
      timeBasedPreferences: {
        morning: [],
        afternoon: [],
        evening: [],
        night: [],
      },
    }

    // Peak hours by day
    for (let day = 0; day < 7; day++) {
      const dayHours: number[] = []
      for (let hour = 0; hour < 24; hour++) {
        const key = `${day}-${hour}`
        const count = this.hourlyActivity.get(key) || 0
        dayHours.push(count)
      }

      // Find top 3 hours for this day
      const sorted = dayHours
        .map((count, hour) => ({ count, hour }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(h => h.hour)

      patterns.peakHoursByDay[day] = sorted
    }

    // Most active days
    const dayTotals = new Map<number, number>()
    for (let day = 0; day < 7; day++) {
      let total = 0
      for (let hour = 0; hour < 24; hour++) {
        const key = `${day}-${hour}`
        total += this.hourlyActivity.get(key) || 0
      }
      dayTotals.set(day, total)
    }

    patterns.mostActiveDays = Array.from(dayTotals.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day)

    // Session duration patterns
    const fiveMin = 5 * 60 * 1000
    const fifteenMin = 15 * 60 * 1000
    const total = this.sessionDurations.length

    if (total > 0) {
      patterns.sessionDurationPattern.short =
        this.sessionDurations.filter(d => d < fiveMin).length / total
      patterns.sessionDurationPattern.medium =
        this.sessionDurations.filter(d => d >= fiveMin && d < fifteenMin).length / total
      patterns.sessionDurationPattern.long =
        this.sessionDurations.filter(d => d >= fifteenMin).length / total
    }

    // Time-based feature preferences
    for (const [feature, hours] of this.featureTimeUsage.entries()) {
      const timeOfDay = this.categorizeHours(hours)
      if (timeOfDay.morning / hours.length > 0.4) {
        patterns.timeBasedPreferences.morning.push(feature)
      }
      if (timeOfDay.afternoon / hours.length > 0.4) {
        patterns.timeBasedPreferences.afternoon.push(feature)
      }
      if (timeOfDay.evening / hours.length > 0.4) {
        patterns.timeBasedPreferences.evening.push(feature)
      }
      if (timeOfDay.night / hours.length > 0.4) {
        patterns.timeBasedPreferences.night.push(feature)
      }
    }

    return patterns
  }

  /**
   * Categorize hours into time periods
   */
  private categorizeHours(hours: number[]): {
    morning: number
    afternoon: number
    evening: number
    night: number
  } {
    return {
      morning: hours.filter(h => h >= 6 && h < 12).length,
      afternoon: hours.filter(h => h >= 12 && h < 18).length,
      evening: hours.filter(h => h >= 18 && h < 24).length,
      night: hours.filter(h => h >= 0 && h < 6).length,
    }
  }

  /**
   * Predict current context based on time
   */
  predictContext(): PatternContext {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()

    let timeOfDay: PatternContext['timeOfDay']
    if (hour >= 6 && hour < 12) timeOfDay = 'morning'
    else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon'
    else if (hour >= 18 && hour < 24) timeOfDay = 'evening'
    else timeOfDay = 'night'

    return {
      timeOfDay,
      dayOfWeek: day,
      recentActions: [],
    }
  }

  /**
   * Reset tracking
   */
  reset(): void {
    this.hourlyActivity.clear()
    this.sessionDurations = []
    this.featureTimeUsage.clear()
  }
}

// ============================================================================
// TASK PATTERN ANALYZER
// ============================================================================

export class TaskPatternAnalyzer {
  private taskHistory: Array<{
    task: string
    provider: string
    features: string[]
    timestamp: string
    success: boolean
  }> = []

  private taskFeatureUsage = new Map<string, string[]>() // task -> features
  private taskProviderUsage = new Map<string, Map<string, number>>() // task -> provider -> count
  private taskSuccessCount = new Map<string, number>() // task -> success count
  private taskTotalCount = new Map<string, number>() // task -> total count

  /**
   * Record task execution
   */
  recordTask(
    task: string,
    provider: string,
    features: string[],
    success: boolean
  ): void {
    const entry = {
      task,
      provider,
      features,
      timestamp: new Date().toISOString(),
      success,
    }

    this.taskHistory.push(entry)
    if (this.taskHistory.length > 500) {
      this.taskHistory.shift()
    }

    // Track features used for task
    const existingFeatures = this.taskFeatureUsage.get(task) || []
    const uniqueFeatures = [...new Set([...existingFeatures, ...features])]
    this.taskFeatureUsage.set(task, uniqueFeatures)

    // Track provider usage
    let providerMap = this.taskProviderUsage.get(task)
    if (!providerMap) {
      providerMap = new Map()
      this.taskProviderUsage.set(task, providerMap)
    }
    const count = providerMap.get(provider) || 0
    providerMap.set(provider, count + 1)

    // Track success rate
    const successCount = this.taskSuccessCount.get(task) || 0
    const totalCount = this.taskTotalCount.get(task) || 0
    this.taskSuccessCount.set(task, successCount + (success ? 1 : 0))
    this.taskTotalCount.set(task, totalCount + 1)
  }

  /**
   * Detect task patterns
   */
  detectPatterns(): TaskPatterns {
    const patterns: TaskPatterns = {
      taskTypes: [],
      taskProviderMapping: {},
      taskFeatureMapping: {},
      taskSuccessRate: {},
    }

    // Task types
    patterns.taskTypes = Array.from(this.taskFeatureUsage.keys())

    // Provider mapping (most used provider per task)
    for (const [task, providerMap] of this.taskProviderUsage.entries()) {
      const sorted = Array.from(providerMap.entries())
        .sort(([, a], [, b]) => b - a)
      if (sorted.length > 0) {
        patterns.taskProviderMapping[task] = sorted[0][0]
      }
    }

    // Feature mapping
    for (const [task, features] of this.taskFeatureUsage.entries()) {
      patterns.taskFeatureMapping[task] = features
    }

    // Success rate
    for (const [task, totalCount] of this.taskTotalCount.entries()) {
      const successCount = this.taskSuccessCount.get(task) || 0
      patterns.taskSuccessRate[task] = successCount / totalCount
    }

    return patterns
  }

  /**
   * Predict best provider for task
   */
  predictProvider(task: string): string | null {
    const providerMap = this.taskProviderUsage.get(task)
    if (!providerMap || providerMap.size === 0) return null

    // Return most used provider
    const sorted = Array.from(providerMap.entries())
      .sort(([, a], [, b]) => b - a)
    return sorted[0][0]
  }

  /**
   * Predict likely features for task
   */
  predictFeatures(task: string): string[] {
    return this.taskFeatureUsage.get(task) || []
  }

  /**
   * Get task success rate
   */
  getSuccessRate(task: string): number {
    const total = this.taskTotalCount.get(task) || 0
    if (total === 0) return 0
    const success = this.taskSuccessCount.get(task) || 0
    return success / total
  }

  /**
   * Reset tracking
   */
  reset(): void {
    this.taskHistory = []
    this.taskFeatureUsage.clear()
    this.taskProviderUsage.clear()
    this.taskSuccessCount.clear()
    this.taskTotalCount.clear()
  }
}

// ============================================================================
// WORKFLOW ANALYZER
// ============================================================================

export class WorkflowAnalyzer {
  private actionSequences: Array<{
    sequence: string[]
    timestamp: string
    duration: number
    success: boolean
  }> = []

  private currentSequence: string[] = []
  private sequenceStartTime: number = 0

  /**
   * Start tracking a workflow
   */
  startWorkflow(): void {
    this.currentSequence = []
    this.sequenceStartTime = Date.now()
  }

  /**
   * Record action in current workflow
   */
  recordAction(actionType: string): void {
    this.currentSequence.push(actionType)
  }

  /**
   * End and save workflow
   */
  endWorkflow(success: boolean = true): void {
    if (this.currentSequence.length === 0) return

    const duration = Date.now() - this.sequenceStartTime

    this.actionSequences.push({
      sequence: [...this.currentSequence],
      timestamp: new Date().toISOString(),
      duration,
      success,
    })

    // Keep only last 200 workflows
    if (this.actionSequences.length > 200) {
      this.actionSequences.shift()
    }

    this.currentSequence = []
  }

  /**
   * Detect common workflows
   */
  detectWorkflows(minFrequency: number = 3): WorkflowPattern[] {
    const frequencyMap = new Map<string, {
      sequences: Array<{ duration: number; success: boolean }>
      count: number
    }>()

    // Group similar sequences
    for (const workflow of this.actionSequences) {
      const key = workflow.sequence.join(' -> ')

      let entry = frequencyMap.get(key)
      if (!entry) {
        entry = { sequences: [], count: 0 }
        frequencyMap.set(key, entry)
      }

      entry.sequences.push({
        duration: workflow.duration,
        success: workflow.success,
      })
      entry.count++
    }

    // Convert to workflow patterns
    const patterns: WorkflowPattern[] = []

    for (const [key, data] of frequencyMap.entries()) {
      if (data.count < minFrequency) continue

      const avgDuration = data.sequences.reduce((sum, s) => sum + s.duration, 0) / data.sequences.length
      const successCount = data.sequences.filter(s => s.success).length
      const successRate = successCount / data.sequences.length

      patterns.push({
        name: this.generateWorkflowName(key),
        sequence: key.split(' -> '),
        frequency: data.count,
        avgDuration,
        successRate,
      })
    }

    // Sort by frequency
    return patterns.sort((a, b) => b.frequency - a.frequency)
  }

  /**
   * Generate human-readable workflow name
   */
  private generateWorkflowName(sequence: string): string {
    const actions = sequence.split(' -> ')
    const firstAction = actions[0]
    const lastAction = actions[actions.length - 1]

    // Simple naming strategy
    return `${firstAction} to ${lastAction}`
  }

  /**
   * Predict next action in sequence
   */
  predictNextAction(recentActions: string[]): string | null {
    if (recentActions.length === 0) return null

    // Find matching sequences
    const matches = this.actionSequences.filter(wf => {
      for (let i = 0; i < recentActions.length; i++) {
        if (wf.sequence[i] !== recentActions[i]) return false
      }
      return wf.sequence.length > recentActions.length
    })

    if (matches.length === 0) return null

    // Get most common next action
    const nextActions = matches.map(m => m.sequence[recentActions.length])
    const frequencyMap = new Map<string, number>()

    for (const action of nextActions) {
      const count = frequencyMap.get(action) || 0
      frequencyMap.set(action, count + 1)
    }

    const sorted = Array.from(frequencyMap.entries())
      .sort(([, a], [, b]) => b - a)

    return sorted[0]?.[0] || null
  }

  /**
   * Reset tracking
   */
  reset(): void {
    this.actionSequences = []
    this.currentSequence = []
    this.sequenceStartTime = 0
  }
}

// ============================================================================
// CONTEXTUAL PATTERN ANALYZER
// ============================================================================

export class ContextualPatternAnalyzer {
  private actionTransitions = new Map<string, Map<string, {
    count: number
    totalTime: number
  }>>()

  /**
   * Record action transition
   */
  recordTransition(fromAction: string, toAction: string, timeBetween: number): void {
    let toMap = this.actionTransitions.get(fromAction)
    if (!toMap) {
      toMap = new Map()
      this.actionTransitions.set(fromAction, toMap)
    }

    let data = toMap.get(toAction)
    if (!data) {
      data = { count: 0, totalTime: 0 }
      toMap.set(toAction, data)
    }

    data.count++
    data.totalTime += timeBetween
  }

  /**
   * Detect contextual patterns
   */
  detectPatterns(minConfidence: number = 0.3): ContextualPattern[] {
    const patterns: ContextualPattern[] = []

    for (const [trigger, toMap] of this.actionTransitions.entries()) {
      const total = Array.from(toMap.values()).reduce((sum, d) => sum + d.count, 0)

      for (const [nextAction, data] of toMap.entries()) {
        const confidence = data.count / total
        if (confidence < minConfidence) continue

        patterns.push({
          trigger,
          nextAction,
          confidence,
          avgTimeBetween: data.totalTime / data.count,
        })
      }
    }

    // Sort by confidence
    return patterns.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Predict next action based on context
   */
  predictNext(currentAction: string): ContextualPattern | null {
    const toMap = this.actionTransitions.get(currentAction)
    if (!toMap || toMap.size === 0) return null

    // Find most likely next action
    const total = Array.from(toMap.values()).reduce((sum, d) => sum + d.count, 0)

    let bestMatch: { action: string; confidence: number; avgTime: number } | null = null

    for (const [nextAction, data] of toMap.entries()) {
      const confidence = data.count / total
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = {
          action: nextAction,
          confidence,
          avgTime: data.totalTime / data.count,
        }
      }
    }

    if (!bestMatch) return null

    return {
      trigger: currentAction,
      nextAction: bestMatch.action,
      confidence: bestMatch.confidence,
      avgTimeBetween: bestMatch.avgTime,
    }
  }

  /**
   * Reset tracking
   */
  reset(): void {
    this.actionTransitions.clear()
  }
}

// ============================================================================
// ANOMALY DETECTOR
// ============================================================================

export class AnomalyDetector {
  private baselineErrorRate = 0.05 // 5% baseline error rate
  private recentErrors: number[] = []
  private unusualFeatures = new Set<string>()
  private preferenceChanges: Array<{
    key: PreferenceKey
    from: PreferenceValue
    to: PreferenceValue
    timestamp: string
  }> = []

  /**
   * Record error
   */
  recordError(): void {
    const now = Date.now()
    this.recentErrors.push(now)

    // Keep only last hour
    const oneHourAgo = now - 60 * 60 * 1000
    this.recentErrors = this.recentErrors.filter(t => t > oneHourAgo)
  }

  /**
   * Record unusual feature usage
   */
  recordUnusualFeature(feature: string): void {
    this.unusualFeatures.add(feature)
  }

  /**
   * Record preference change
   */
  recordPreferenceChange(key: PreferenceKey, from: PreferenceValue, to: PreferenceValue): void {
    this.preferenceChanges.push({
      key,
      from,
      to,
      timestamp: new Date().toISOString(),
    })

    // Keep only last 50 changes
    if (this.preferenceChanges.length > 50) {
      this.preferenceChanges.shift()
    }
  }

  /**
   * Detect anomalies
   */
  detectAnomalies(): Anomaly[] {
    const anomalies: Anomaly[] = []
    const now = Date.now()

    // Check for error spike
    const recentErrorCount = this.recentErrors.length
    if (recentErrorCount > 10) { // More than 10 errors in last hour
      anomalies.push({
        type: 'error_spike',
        description: `${recentErrorCount} errors in the last hour (baseline: <10)`,
        timestamp: new Date(now).toISOString(),
        severity: recentErrorCount > 20 ? 'high' : 'medium',
      })
    }

    // Check for unusual feature usage
    for (const feature of this.unusualFeatures) {
      anomalies.push({
        type: 'unusual_feature',
        description: `Rare feature used: ${feature}`,
        timestamp: new Date(now).toISOString(),
        severity: 'low',
      })
    }

    // Check for frequent preference changes
    const recentChanges = this.preferenceChanges.filter(
      c => now - new Date(c.timestamp).getTime() < 24 * 60 * 60 * 1000
    )
    if (recentChanges.length > 10) {
      anomalies.push({
        type: 'preference_change',
        description: `${recentChanges.length} preference changes in 24h (unstable)`,
        timestamp: new Date(now).toISOString(),
        severity: 'medium',
      })
    }

    return anomalies
  }

  /**
   * Reset tracking
   */
  reset(): void {
    this.recentErrors = []
    this.unusualFeatures.clear()
    this.preferenceChanges = []
  }
}

// ============================================================================
// COMPREHENSIVE PATTERN ANALYZER
// ============================================================================

export class PatternAnalyzer {
  private timeAnalyzer = new TimePatternAnalyzer()
  private taskAnalyzer = new TaskPatternAnalyzer()
  private workflowAnalyzer = new WorkflowAnalyzer()
  private contextualAnalyzer = new ContextualPatternAnalyzer()
  private anomalyDetector = new AnomalyDetector()

  /**
   * Record user action for pattern analysis
   */
  recordAction(action: UserAction): void {
    // Time patterns
    this.timeAnalyzer.recordActivity(action)

    // Error tracking
    if (action.type === 'error-occurred') {
      this.anomalyDetector.recordError()
    }

    // Contextual transitions
    // (would need to track previous action)
  }

  /**
   * Get all detected patterns
   */
  getAllPatterns(): {
    time: TimePatterns
    task: TaskPatterns
    workflows: WorkflowPattern[]
    contextual: ContextualPattern[]
    anomalies: Anomaly[]
  } {
    return {
      time: this.timeAnalyzer.detectPatterns(),
      task: this.taskAnalyzer.detectPatterns(),
      workflows: this.workflowAnalyzer.detectWorkflows(),
      contextual: this.contextualAnalyzer.detectPatterns(),
      anomalies: this.anomalyDetector.detectAnomalies(),
    }
  }

  /**
   * Get time analyzer
   */
  getTimeAnalyzer(): TimePatternAnalyzer {
    return this.timeAnalyzer
  }

  /**
   * Get task analyzer
   */
  getTaskAnalyzer(): TaskPatternAnalyzer {
    return this.taskAnalyzer
  }

  /**
   * Get workflow analyzer
   */
  getWorkflowAnalyzer(): WorkflowAnalyzer {
    return this.workflowAnalyzer
  }

  /**
   * Get contextual analyzer
   */
  getContextualAnalyzer(): ContextualPatternAnalyzer {
    return this.contextualAnalyzer
  }

  /**
   * Get anomaly detector
   */
  getAnomalyDetector(): AnomalyDetector {
    return this.anomalyDetector
  }

  /**
   * Reset all analyzers
   */
  reset(): void {
    this.timeAnalyzer.reset()
    this.taskAnalyzer.reset()
    this.workflowAnalyzer.reset()
    this.contextualAnalyzer.reset()
    this.anomalyDetector.reset()
  }
}
