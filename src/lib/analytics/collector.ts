/**
 * Analytics Event Collector
 *
 * Non-blocking event collection system with batching and privacy safeguards.
 */

import { analyticsEventStore } from './storage'
import {
  AnalyticsEvent,
  EventType,
  EventCategory,
  EventData,
  AnalyticsConfig,
  DEFAULT_ANALYTICS_CONFIG,
} from './types'

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Session manager for tracking user sessions
 */
class SessionManager {
  private sessionId: string
  private sessionStart: number
  private lastActivity: number
  private sessionTimeout: number

  constructor(sessionTimeout: number = 30 * 60 * 1000) {
    this.sessionTimeout = sessionTimeout
    this.sessionId = this.generateSessionId()
    this.sessionStart = Date.now()
    this.lastActivity = this.sessionStart
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId
  }

  /**
   * Update activity timestamp
   */
  updateActivity(): void {
    this.lastActivity = Date.now()
  }

  /**
   * Check if session has expired
   */
  isExpired(): boolean {
    return Date.now() - this.lastActivity > this.sessionTimeout
  }

  /**
   * Start a new session
   */
  startNewSession(): string {
    this.sessionId = this.generateSessionId()
    this.sessionStart = Date.now()
    this.lastActivity = this.sessionStart
    return this.sessionId
  }

  /**
   * Get session duration in seconds
   */
  getSessionDuration(): number {
    return Math.floor((Date.now() - this.sessionStart) / 1000)
  }
}

// ============================================================================
// EVENT COLLECTOR
// ============================================================================

/**
 * Analytics event collector
 */
export class EventCollector {
  private config: AnalyticsConfig
  private sessionManager: SessionManager
  private eventBuffer: AnalyticsEvent[] = []
  private batchTimer: number | null = null
  private isInitialized: boolean = false
  private samplingCounter: number = 0

  // Session tracking
  private sessionStats: {
    actionsPerformed: number
    messagesSent: number
    featuresUsed: Set<string>
    startTime: number
  } = {
    actionsPerformed: 0,
    messagesSent: 0,
    featuresUsed: new Set(),
    startTime: Date.now(),
  }

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_ANALYTICS_CONFIG, ...config }
    this.sessionManager = new SessionManager(this.config.sessionTimeout)
  }

  /**
   * Initialize the collector
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // Check for session expiry
    if (this.sessionManager.isExpired()) {
      await this.endSession()
      this.sessionManager.startNewSession()
    }

    // Track session start
    await this.track('session_start', {
      type: 'session_start',
      source: 'direct',
      previousSessionTime: this.sessionStats.startTime
        ? Date.now() - this.sessionStats.startTime
        : undefined,
    })

    // Start batch timer
    this.startBatchTimer()

    this.isInitialized = true
  }

  /**
   * Track an analytics event
   */
  async track(type: EventType, data: EventData): Promise<void> {
    // Check if analytics is enabled
    if (!this.config.enabled) return

    // Sampling check
    if (!this.shouldSample()) return

    // Update session activity
    this.sessionManager.updateActivity()

    // Determine event category
    const category = this.getEventCategory(type)

    // Create event
    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      type,
      category,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionManager.getSessionId(),
      data,
    }

    // Update session stats
    this.updateSessionStats(type, data)

    // Add to buffer
    this.eventBuffer.push(event)

    // Check if we should flush
    if (this.eventBuffer.length >= this.config.batchSize) {
      await this.flush()
    }
  }

  /**
   * Flush event buffer to storage
   */
  async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return

    const events = [...this.eventBuffer]
    this.eventBuffer = []

    if (this.config.persist) {
      try {
        await analyticsEventStore.addEvents(events)
      } catch (error) {
        console.error('Failed to persist analytics events:', error)
        // Re-add events to buffer on failure
        this.eventBuffer.unshift(...events)
      }
    }
  }

  /**
   * End current session
   */
  async endSession(): Promise<void> {
    if (!this.isInitialized) return

    const duration = this.sessionManager.getSessionDuration()

    await this.track('session_end', {
      type: 'session_end',
      duration,
      actionsPerformed: this.sessionStats.actionsPerformed,
      messagesSent: this.sessionStats.messagesSent,
      featuresUsed: Array.from(this.sessionStats.featuresUsed),
    })

    await this.flush()

    // Reset session stats
    this.sessionStats = {
      actionsPerformed: 0,
      messagesSent: 0,
      featuresUsed: new Set(),
      startTime: Date.now(),
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config }

    // Restart batch timer if interval changed
    if (this.batchTimer !== null) {
      this.stopBatchTimer()
      this.startBatchTimer()
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AnalyticsConfig {
    return { ...this.config }
  }

  /**
   * Shutdown collector gracefully
   */
  async shutdown(): Promise<void> {
    this.stopBatchTimer()
    await this.flush()
    await this.endSession()
    this.isInitialized = false
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Determine event category from type
   */
  private getEventCategory(type: EventType): EventCategory {
    const userActions: EventType[] = [
      'message_sent',
      'conversation_created',
      'conversation_archived',
      'conversation_deleted',
      'settings_changed',
      'ai_contact_created',
      'ai_contact_modified',
      'ai_contact_deleted',
      'search_performed',
      'export_triggered',
      'import_triggered',
    ]

    const performance: EventType[] = [
      'app_initialized',
      'api_response',
      'render_complete',
      'storage_operation',
      'memory_measurement',
    ]

    const engagement: EventType[] = [
      'session_start',
      'session_end',
      'feature_used',
      'feature_abandoned',
      'page_view',
    ]

    const errors: EventType[] = ['error_occurred', 'error_recovered']

    const featureFlags: EventType[] = [
      'feature_enabled',
      'feature_disabled',
      'feature_evaluated',
    ]

    const system: EventType[] = [
      'hardware_detected',
      'benchmark_completed',
      'data_compacted',
      'data_exported',
    ]

    if (userActions.includes(type)) return 'user_action'
    if (performance.includes(type)) return 'performance'
    if (engagement.includes(type)) return 'engagement'
    if (errors.includes(type)) return 'error'
    if (featureFlags.includes(type)) return 'feature_flag'
    if (system.includes(type)) return 'system'

    return 'user_action' // Default
  }

  /**
   * Check if event should be sampled
   */
  private shouldSample(): boolean {
    this.samplingCounter++
    return this.samplingCounter <= this.config.samplingRate * 100
      ? Math.random() < this.config.samplingRate
      : false
  }

  /**
   * Update session statistics
   */
  private updateSessionStats(type: EventType, data: EventData): void {
    this.sessionStats.actionsPerformed++

    if (type === 'message_sent') {
      this.sessionStats.messagesSent++
    }

    if (type === 'feature_used' && 'featureId' in data) {
      this.sessionStats.featuresUsed.add((data as any).featureId)
    }
  }

  /**
   * Start batch timer
   */
  private startBatchTimer(): void {
    if (this.batchTimer !== null) return

    this.batchTimer = window.setTimeout(() => {
      this.flush().catch(error => {
        console.error('Error in batch flush:', error)
      })
      this.batchTimer = null
      this.startBatchTimer() // Restart timer
    }, this.config.batchInterval)
  }

  /**
   * Stop batch timer
   */
  private stopBatchTimer(): void {
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
  }
}

// ============================================================================
// GLOBAL COLLECTOR INSTANCE
// ============================================================================

let globalCollector: EventCollector | null = null

/**
 * Get or create the global event collector
 */
export function getEventCollector(config?: Partial<AnalyticsConfig>): EventCollector {
  if (!globalCollector) {
    globalCollector = new EventCollector(config)
  }
  return globalCollector
}

/**
 * Initialize the global collector
 */
export async function initializeAnalytics(config?: Partial<AnalyticsConfig>): Promise<void> {
  const collector = getEventCollector(config)
  await collector.initialize()
}

/**
 * Track an event using the global collector
 */
export async function track(type: EventType, data: EventData): Promise<void> {
  const collector = getEventCollector()
  await collector.track(type, data)
}
