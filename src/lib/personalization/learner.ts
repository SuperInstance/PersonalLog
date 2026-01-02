/**
 * PersonalLog - Preference Learner
 *
 * Learns user preferences from behavior patterns.
 */

import type {
  UserAction,
  PreferenceSignal,
  PreferenceKey,
  PreferenceValue,
  CommunicationPreferences,
  UIPreferences,
  ContentPreferences,
  InteractionPatterns,
} from './types'

// ============================================================================
// SIGNAL EXTRACTORS
// ============================================================================

/**
 * Extract preference signals from user actions
 */
export class PreferenceLearner {
  private signalThresholds = {
    weak: 0.3,
    medium: 0.6,
    strong: 0.8,
  }

  /**
   * Analyze an action and extract preference signals
   */
  analyzeAction(action: UserAction): PreferenceSignal[] {
    const signals: PreferenceSignal[] = []

    switch (action.type) {
      case 'theme-changed':
        signals.push(this.extractThemeSignal(action))
        break

      case 'response-expanded':
        signals.push(this.extractResponseLengthSignal(action))
        break

      case 'response-collapsed':
        signals.push(this.extractResponseLengthSignal(action))
        break

      case 'font-size-changed':
        signals.push(this.extractFontSizeSignal(action))
        break

      case 'sidebar-toggled':
        signals.push(this.extractSidebarSignal(action))
        break

      case 'emoji-used':
        signals.push(this.extractEmojiSignal(action))
        break

      case 'feature-used':
        signals.push(this.extractFeatureUsageSignal(action))
        break

      case 'session-ended':
        signals.push(...this.extractSessionSignals(action))
        break

      case 'error-occurred':
        signals.push(this.extractErrorSignal(action))
        break

      case 'help-requested':
        signals.push(this.extractHelpSignal(action))
        break

      case 'setting-changed':
        signals.push(this.extractSettingSignal(action))
        break
    }

    return signals.filter(s => s.strength >= this.signalThresholds.weak)
  }

  /**
   * Extract theme preference
   */
  private extractThemeSignal(action: UserAction): PreferenceSignal {
    const theme = action.data?.value as UIPreferences['theme']

    return {
      preferenceKey: 'ui.theme',
      value: theme,
      strength: this.signalThresholds.strong, // Explicit change is strong
      sourceAction: action,
      timestamp: action.timestamp,
    }
  }

  /**
   * Extract response length preference
   */
  private extractResponseLengthSignal(action: UserAction): PreferenceSignal {
    const isExpansion = action.type === 'response-expanded'

    return {
      preferenceKey: 'communication.responseLength',
      value: isExpansion ? 'detailed' : 'brief',
      strength: this.signalThresholds.medium,
      sourceAction: action,
      timestamp: action.timestamp,
    }
  }

  /**
   * Extract font size preference
   */
  private extractFontSizeSignal(action: UserAction): PreferenceSignal {
    const fontSize = action.data?.value as UIPreferences['fontSize']

    return {
      preferenceKey: 'ui.fontSize',
      value: fontSize,
      strength: this.signalThresholds.strong,
      sourceAction: action,
      timestamp: action.timestamp,
    }
  }

  /**
   * Extract sidebar position preference
   */
  private extractSidebarSignal(action: UserAction): PreferenceSignal {
    const position = action.data?.position as UIPreferences['sidebarPosition']

    return {
      preferenceKey: 'ui.sidebarPosition',
      value: position,
      strength: this.signalThresholds.strong,
      sourceAction: action,
      timestamp: action.timestamp,
    }
  }

  /**
   * Extract emoji usage preference
   */
  private extractEmojiSignal(action: UserAction): PreferenceSignal {
    return {
      preferenceKey: 'communication.useEmojis',
      value: true,
      strength: this.signalThresholds.medium,
      sourceAction: action,
      timestamp: action.timestamp,
    }
  }

  /**
   * Extract feature usage for top features tracking
   */
  private extractFeatureUsageSignal(action: UserAction): PreferenceSignal {
    const feature = action.context?.feature

    if (!feature) {
      throw new Error('Feature usage signal requires feature in context')
    }

    return {
      preferenceKey: 'patterns.topFeatures' as PreferenceKey,
      value: feature,
      strength: this.signalThresholds.weak,
      sourceAction: action,
      timestamp: action.timestamp,
    }
  }

  /**
   * Extract session-related signals
   */
  private extractSessionSignals(action: UserAction): PreferenceSignal[] {
    const signals: PreferenceSignal[] = []
    const duration = action.context?.duration as number | undefined

    // Session length pattern
    if (duration) {
      signals.push({
        preferenceKey: 'patterns.avgSessionLength' as PreferenceKey,
        value: duration,
        strength: this.signalThresholds.medium,
        sourceAction: action,
        timestamp: action.timestamp,
      })
    }

    // Peak hours pattern
    const hour = new Date(action.timestamp).getHours()
    signals.push({
      preferenceKey: 'patterns.peakHours' as PreferenceKey,
      value: hour,
      strength: this.signalThresholds.weak,
      sourceAction: action,
      timestamp: action.timestamp,
    })

    return signals
  }

  /**
   * Extract error frequency signal
   */
  private extractErrorSignal(action: UserAction): PreferenceSignal {
    return {
      preferenceKey: 'patterns.errorFrequency' as PreferenceKey,
      value: 1, // Increment error count
      strength: this.signalThresholds.weak,
      sourceAction: action,
      timestamp: action.timestamp,
    }
  }

  /**
   * Extract help-seeking signal
   */
  private extractHelpSignal(action: UserAction): PreferenceSignal {
    return {
      preferenceKey: 'patterns.helpSeekFrequency' as PreferenceKey,
      value: 1, // Increment help count
      strength: this.signalThresholds.medium,
      sourceAction: action,
      timestamp: action.timestamp,
    }
  }

  /**
   * Extract general setting change
   */
  private extractSettingSignal(action: UserAction): PreferenceSignal {
    const setting = action.data?.setting as PreferenceKey
    const value = action.data?.value as PreferenceValue

    if (!setting || value === undefined) {
      throw new Error('Setting signal requires setting and value in data')
    }

    return {
      preferenceKey: setting,
      value,
      strength: this.signalThresholds.strong,
      sourceAction: action,
      timestamp: action.timestamp,
    }
  }
}

// ============================================================================
// PREFERENCE AGGREGATOR
// ============================================================================

/**
 * Aggregate multiple signals into preference updates
 */
export class PreferenceAggregator {
  private signalBuffer: Map<PreferenceKey, PreferenceSignal[]> = new Map()
  private readonly bufferSize = 10
  private readonly aggregationWindow = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Add a signal to the buffer
   */
  addSignal(signal: PreferenceSignal): void {
    const key = signal.preferenceKey
    const existing = this.signalBuffer.get(key) || []
    existing.push(signal)

    // Keep only recent signals
    const cutoff = Date.now() - this.aggregationWindow
    const recent = existing.filter(s => new Date(s.timestamp).getTime() > cutoff)

    // Keep buffer size manageable
    if (recent.length > this.bufferSize) {
      recent.splice(0, recent.length - this.bufferSize)
    }

    this.signalBuffer.set(key, recent)
  }

  /**
   * Get aggregated preference value
   */
  aggregate(key: PreferenceKey): { value: PreferenceValue; confidence: number } | null {
    const signals = this.signalBuffer.get(key)
    if (!signals || signals.length === 0) return null

    // Different aggregation strategies based on value type
    const latest = signals[signals.length - 1]
    const value = latest.value

    // Calculate confidence based on:
    // - Number of observations
    // - Consistency of values
    // - Recency of signals
    const confidence = this.calculateConfidence(signals)

    return { value, confidence }
  }

  /**
   * Calculate confidence in a preference
   */
  private calculateConfidence(signals: PreferenceSignal[]): number {
    if (signals.length === 0) return 0

    // Base confidence from observation count (max 0.5)
    const observationConfidence = Math.min(signals.length * 0.1, 0.5)

    // Consistency bonus (max 0.3)
    const values = signals.map(s => s.value)
    const isConsistent = values.every(v => JSON.stringify(v) === JSON.stringify(values[0]))
    const consistencyBonus = isConsistent ? 0.3 : 0

    // Recency bonus (max 0.2)
    const now = Date.now()
    const avgAge = signals.reduce((sum, s) => sum + (now - new Date(s.timestamp).getTime()), 0) / signals.length
    const recencyBonus = Math.max(0, 0.2 - (avgAge / this.aggregationWindow) * 0.2)

    return Math.min(observationConfidence + consistencyBonus + recencyBonus, 1.0)
  }

  /**
   * Clear old signals
   */
  clear(): void {
    this.signalBuffer.clear()
  }

  /**
   * Get buffer statistics
   */
  getStats(): { totalSignals: number; keysTracked: number } {
    let total = 0
    for (const signals of this.signalBuffer.values()) {
      total += signals.length
    }
    return {
      totalSignals: total,
      keysTracked: this.signalBuffer.size,
    }
  }
}

// ============================================================================
// PATTERN DETECTOR
// ============================================================================

/**
 * Detect usage patterns over time
 */
export class PatternDetector {
  private sessionHistory: number[] = []
  private hourlyActivity = new Map<number, number>() // hour -> count
  private featureUsage = new Map<string, number>() // feature -> count
  private errorCount = 0
  private helpCount = 0
  private totalSessions = 0

  /**
   * Record a completed session
   */
  recordSession(duration: number, hour: number): void {
    this.sessionHistory.push(duration)
    this.totalSessions++

    // Track hourly activity
    const currentCount = this.hourlyActivity.get(hour) || 0
    this.hourlyActivity.set(hour, currentCount + 1)

    // Keep only last 100 sessions
    if (this.sessionHistory.length > 100) {
      this.sessionHistory.shift()
    }
  }

  /**
   * Record feature usage
   */
  recordFeatureUsage(feature: string): void {
    const current = this.featureUsage.get(feature) || 0
    this.featureUsage.set(feature, current + 1)
  }

  /**
   * Record an error
   */
  recordError(): void {
    this.errorCount++
  }

  /**
   * Record help request
   */
  recordHelp(): void {
    this.helpCount++
  }

  /**
   * Get detected patterns
   */
  getPatterns(): Partial<InteractionPatterns> {
    const patterns: Partial<InteractionPatterns> = {}

    // Peak hours (top 3 most active hours)
    if (this.hourlyActivity.size > 0) {
      const sorted = Array.from(this.hourlyActivity.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => hour)

      patterns.peakHours = sorted
    }

    // Average session length
    if (this.sessionHistory.length > 0) {
      const avg = this.sessionHistory.reduce((a, b) => a + b, 0) / this.sessionHistory.length
      patterns.avgSessionLength = Math.round(avg)
    }

    // Top features (top 5)
    if (this.featureUsage.size > 0) {
      const sorted = Array.from(this.featureUsage.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([feature]) => feature)

      patterns.topFeatures = sorted
    }

    // Error frequency (errors per session)
    if (this.totalSessions > 0) {
      patterns.errorFrequency = this.errorCount / this.totalSessions
    }

    // Help seeking frequency (help requests per session)
    if (this.totalSessions > 0) {
      patterns.helpSeekFrequency = this.helpCount / this.totalSessions
    }

    return patterns
  }

  /**
   * Reset all tracking
   */
  reset(): void {
    this.sessionHistory = []
    this.hourlyActivity.clear()
    this.featureUsage.clear()
    this.errorCount = 0
    this.helpCount = 0
    this.totalSessions = 0
  }

  /**
   * Get statistics
   */
  getStats(): {
    sessionsRecorded: number
    featuresTracked: number
    errors: number
    helpRequests: number
  } {
    return {
      sessionsRecorded: this.totalSessions,
      featuresTracked: this.featureUsage.size,
      errors: this.errorCount,
      helpRequests: this.helpCount,
    }
  }
}
