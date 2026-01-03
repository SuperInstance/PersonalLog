/**
 * PersonalLog - User Models
 *
 * Manages user preference models and their lifecycle.
 */

import type {
  UserModel,
  Preference,
  PreferenceKey,
  PreferenceValue,
  PreferenceExplanation,
  LearningState,
  CommunicationPreferences,
  UIPreferences,
  ContentPreferences,
  InteractionPatterns,
  PersonalizationEvent,
  PersonalizationObserver,
} from './types'

// ============================================================================
// DEFAULT PREFERENCES
// ============================================================================

const DEFAULT_COMMUNICATION: CommunicationPreferences = {
  responseLength: 'balanced',
  tone: 'neutral',
  useEmojis: false,
  formatting: 'markdown',
}

const DEFAULT_UI: UIPreferences = {
  theme: 'auto',
  density: 'comfortable',
  fontSize: 1.0,
  animations: 'reduced',
  sidebarPosition: 'left',
  autoScrollMessages: true,
  groupMessagesByContext: false,
}

const DEFAULT_CONTENT: ContentPreferences = {
  topicsOfInterest: [],
  readingLevel: 'standard',
  language: 'en',
  autoPlayMedia: false,
  recentQueries: [],
}

const DEFAULT_PATTERNS: InteractionPatterns = {
  peakHours: [],
  avgSessionLength: 0,
  topFeatures: [],
  errorFrequency: 0,
  helpSeekFrequency: 0,
}

// ============================================================================
// PREFERENCE MODEL
// ============================================================================

export class PreferenceModel {
  private preferences: Map<PreferenceKey, Preference>
  private observers: Set<PersonalizationObserver> = new Set()

  constructor() {
    this.preferences = new Map()
    this.initializeDefaults()
  }

  /**
   * Initialize default preferences
   */
  private initializeDefaults(): void {
    // Communication defaults
    this.set('communication.responseLength', DEFAULT_COMMUNICATION.responseLength, 'default')
    this.set('communication.tone', DEFAULT_COMMUNICATION.tone, 'default')
    this.set('communication.useEmojis', DEFAULT_COMMUNICATION.useEmojis, 'default')
    this.set('communication.formatting', DEFAULT_COMMUNICATION.formatting, 'default')

    // UI defaults
    this.set('ui.theme', DEFAULT_UI.theme, 'default')
    this.set('ui.density', DEFAULT_UI.density, 'default')
    this.set('ui.fontSize', DEFAULT_UI.fontSize, 'default')
    this.set('ui.animations', DEFAULT_UI.animations, 'default')
    this.set('ui.sidebarPosition', DEFAULT_UI.sidebarPosition, 'default')
    this.set('ui.autoScrollMessages', DEFAULT_UI.autoScrollMessages, 'default')
    this.set('ui.groupMessagesByContext', DEFAULT_UI.groupMessagesByContext, 'default')

    // Content defaults
    this.set('content.topicsOfInterest', DEFAULT_CONTENT.topicsOfInterest, 'default')
    this.set('content.readingLevel', DEFAULT_CONTENT.readingLevel, 'default')
    this.set('content.language', DEFAULT_CONTENT.language, 'default')
    this.set('content.autoPlayMedia', DEFAULT_CONTENT.autoPlayMedia, 'default')
    this.set('content.recentQueries', DEFAULT_CONTENT.recentQueries, 'default')
  }

  /**
   * Get a preference value
   */
  get<T = PreferenceValue>(key: PreferenceKey): T {
    const pref = this.preferences.get(key)
    return pref?.value as T
  }

  /**
   * Get full preference object
   */
  getPreference(key: PreferenceKey): Preference | undefined {
    return this.preferences.get(key)
  }

  /**
   * Set a preference value
   */
  set(key: PreferenceKey, value: PreferenceValue, source: 'explicit' | 'learned' | 'default' = 'explicit'): void {
    const existing = this.preferences.get(key)
    const now = new Date().toISOString()

    const preference: Preference = {
      key,
      value,
      defaultValue: this.getDefaultValue(key),
      source,
      confidence: existing?.confidence || 0.5,
      lastUpdated: now,
      observationCount: existing ? existing.observationCount + 1 : 1,
    }

    this.preferences.set(key, preference)

    // Notify observers
    if (source === 'learned') {
      this.notify({
        type: 'preference-learned',
        key,
        value,
        confidence: preference.confidence,
      })
    } else {
      this.notify({
        type: 'preference-changed',
        key,
        value,
      })
    }
  }

  /**
   * Learn a preference (increase confidence gradually)
   */
  learn(key: PreferenceKey, value: PreferenceValue, confidence: number): void {
    const existing = this.preferences.get(key)

    if (existing) {
      // Update with weighted average of confidences
      const newConfidence = (existing.confidence * 0.7) + (confidence * 0.3)

      // Only update if values match
      if (JSON.stringify(existing.value) === JSON.stringify(value)) {
        // Reinforcing existing preference
        this.preferences.set(key, {
          ...existing,
          confidence: Math.min(newConfidence + 0.1, 1.0),
          observationCount: existing.observationCount + 1,
          lastUpdated: new Date().toISOString(),
        })

        this.notify({
          type: 'preference-learned',
          key,
          value,
          confidence: Math.min(newConfidence + 0.1, 1.0),
        })
      } else if (existing.source !== 'explicit') {
        // Override non-explicit preference
        this.set(key, value, 'learned')
      }
    } else {
      // New learned preference
      this.set(key, value, 'learned')
    }
  }

  /**
   * Reset a preference to default
   */
  reset(key: PreferenceKey): void {
    const defaultValue = this.getDefaultValue(key)
    this.set(key, defaultValue, 'default')
  }

  /**
   * Get all preferences
   */
  getAll(): Record<PreferenceKey, Preference> {
    return Object.fromEntries(this.preferences.entries()) as Record<PreferenceKey, Preference>
  }

  /**
   * Get explanation for a preference
   */
  explain(key: PreferenceKey): PreferenceExplanation {
    const pref = this.preferences.get(key)

    if (!pref) {
      throw new Error(`Preference ${key} not found`)
    }

    const reason = this.generateExplanation(pref)

    return {
      key: pref.key,
      value: pref.value,
      reason,
      confidence: pref.confidence,
      source: pref.source,
      lastUpdated: pref.lastUpdated,
    }
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(pref: Preference): string {
    if (pref.source === 'explicit') {
      return `You set this to "${pref.value}".`
    }

    if (pref.source === 'default') {
      return `This is the default setting.`
    }

    // Learned preference
    const reasons: string[] = []

    if (pref.observationCount > 1) {
      reasons.push(`Based on ${pref.observationCount} observations`)
    }

    if (pref.confidence > 0.7) {
      reasons.push(`I'm quite confident you prefer this`)
    } else if (pref.confidence > 0.4) {
      reasons.push(`I think you might prefer this`)
    } else {
      reasons.push(`I'm still learning your preferences`)
    }

    return reasons.join('. ') + '.'
  }

  /**
   * Get default value for a key
   */
  private getDefaultValue(key: PreferenceKey): PreferenceValue {
    const [category, setting] = key.split('.') as [string, string]

    switch (category) {
      case 'communication':
        return DEFAULT_COMMUNICATION[setting as keyof CommunicationPreferences]
      case 'ui':
        return DEFAULT_UI[setting as keyof UIPreferences]
      case 'content':
        return DEFAULT_CONTENT[setting as keyof ContentPreferences]
      default:
        throw new Error(`Unknown preference category: ${category}`)
    }
  }

  /**
   * Subscribe to preference changes
   */
  subscribe(observer: PersonalizationObserver): () => void {
    this.observers.add(observer)
    return () => this.observers.delete(observer)
  }

  /**
   * Notify observers of changes
   */
  private notify(event: PersonalizationEvent): void {
    this.observers.forEach(observer => {
      try {
        observer(event)
      } catch (error) {
        console.error('Error notifying preference observer:', error)
      }
    })
  }

  /**
   * Import preferences from external source
   */
  import(preferences: Record<PreferenceKey, Preference>): void {
    for (const [key, pref] of Object.entries(preferences)) {
      this.preferences.set(key as PreferenceKey, pref)
    }
  }

  /**
   * Export preferences
   */
  export(): Record<PreferenceKey, Preference> {
    return this.getAll()
  }
}

// ============================================================================
// USER MODEL
// ============================================================================

export class PersonalizationModel {
  private userId: string
  private preferences: PreferenceModel
  private patterns: InteractionPatterns
  private learning: LearningState
  private learningStartTime: string

  constructor(userId: string) {
    this.userId = userId
    this.preferences = new PreferenceModel()
    this.patterns = { ...DEFAULT_PATTERNS }
    this.learningStartTime = new Date().toISOString()
    this.learning = {
      enabled: true,
      disabledCategories: [],
      totalActionsRecorded: 0,
      learningStartedAt: this.learningStartTime,
      lastActionAt: this.learningStartTime,
    }
  }

  /**
   * Get user ID
   */
  getUserId(): string {
    return this.userId
  }

  /**
   * Get preference model
   */
  getPreferences(): PreferenceModel {
    return this.preferences
  }

  /**
   * Get interaction patterns
   */
  getPatterns(): InteractionPatterns {
    return { ...this.patterns }
  }

  /**
   * Update interaction patterns
   */
  updatePatterns(updates: Partial<InteractionPatterns>): void {
    this.patterns = { ...this.patterns, ...updates }

    // Notify observers of pattern detection
    Object.keys(updates).forEach(key => {
      this.notify({
        type: 'pattern-detected',
        pattern: key as keyof InteractionPatterns,
      })
    })
  }

  /**
   * Get learning state
   */
  getLearningState(): LearningState {
    return { ...this.learning }
  }

  /**
   * Enable or disable learning
   */
  toggleLearning(enabled: boolean): void {
    this.learning.enabled = enabled
    this.notify({ type: 'learning-toggled', enabled })
  }

  /**
   * Disable learning for a specific category
   */
  disableLearningCategory(category: 'communication' | 'ui' | 'content'): void {
    if (!this.learning.disabledCategories.includes(category)) {
      this.learning.disabledCategories.push(category)
    }
  }

  /**
   * Enable learning for a specific category
   */
  enableLearningCategory(category: 'communication' | 'ui' | 'content'): void {
    this.learning.disabledCategories = this.learning.disabledCategories.filter(c => c !== category)
  }

  /**
   * Check if learning is enabled for a category
   */
  isLearningEnabled(category?: 'communication' | 'ui' | 'content'): boolean {
    if (!this.learning.enabled) return false
    if (!category) return true
    return !this.learning.disabledCategories.includes(category)
  }

  /**
   * Record an action
   */
  recordAction(): void {
    this.learning.totalActionsRecorded++
    this.learning.lastActionAt = new Date().toISOString()
  }

  /**
   * Convert to UserModel for storage
   */
  toUserModel(): UserModel {
    return {
      userId: this.userId,
      communication: this.preferences.getPreference('communication.responseLength')! as any,
      ui: this.preferences.getPreference('ui.theme')! as any,
      content: this.preferences.getPreference('content.topicsOfInterest')! as any,
      patterns: this.patterns,
      preferences: this.preferences.getAll(),
      learning: this.learning,
    }
  }

  /**
   * Import from stored UserModel
   */
  static fromUserModel(model: UserModel): PersonalizationModel {
    const personalization = new PersonalizationModel(model.userId)
    personalization.preferences.import(model.preferences)
    personalization.patterns = model.patterns
    personalization.learning = model.learning
    return personalization
  }

  /**
   * Subscribe to events
   */
  subscribe(observer: PersonalizationObserver): () => void {
    return this.preferences.subscribe(observer)
  }

  /**
   * Notify observers (non-preference events)
   */
  private notify(event: PersonalizationEvent): void {
    // This is handled by the preference model's observer system
    // We just need to make sure the event gets through
  }
}

// ============================================================================
// MODEL FACTORY
// ============================================================================

export class ModelFactory {
  private static instance?: ModelFactory
  private models: Map<string, PersonalizationModel> = new Map()

  private constructor() {}

  static getInstance(): ModelFactory {
    if (!this.instance) {
      this.instance = new ModelFactory()
    }
    return this.instance
  }

  /**
   * Get or create model for user
   */
  getModel(userId: string): PersonalizationModel {
    let model = this.models.get(userId)
    if (!model) {
      model = new PersonalizationModel(userId)
      this.models.set(userId, model)
    }
    return model
  }

  /**
   * Remove model from cache
   */
  unloadModel(userId: string): void {
    this.models.delete(userId)
  }

  /**
   * Get all cached models
   */
  getAllModels(): PersonalizationModel[] {
    return Array.from(this.models.values())
  }
}
