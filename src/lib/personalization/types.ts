/**
 * PersonalLog - Personalization Types
 *
 * Type definitions for learning, storing, and applying user preferences.
 */

// ============================================================================
// PREFERENCE DIMENSIONS
// ============================================================================

/**
 * Communication style preferences
 */
export interface CommunicationPreferences {
  /** Preferred response length */
  responseLength: 'brief' | 'balanced' | 'detailed'
  /** Tone preference */
  tone: 'casual' | 'neutral' | 'formal'
  /** Whether to use emoji */
  useEmojis: boolean
  /** Default formatting style */
  formatting: 'plain' | 'markdown' | 'structured'
}

/**
 * UI/UX preferences
 */
export interface UIPreferences {
  /** Theme preference */
  theme: 'light' | 'dark' | 'auto'
  /** UI density */
  density: 'compact' | 'comfortable' | 'spacious'
  /** Font size multiplier */
  fontSize: 0.85 | 1.0 | 1.15 | 1.3
  /** Animation level */
  animations: 'none' | 'reduced' | 'full'
  /** Sidebar position */
  sidebarPosition: 'left' | 'right' | 'hidden'
  /** Auto-scroll to new messages */
  autoScrollMessages: boolean
  /** Group messages by context */
  groupMessagesByContext: boolean
}

/**
 * Content preferences
 */
export interface ContentPreferences {
  /** Topics user is interested in */
  topicsOfInterest: string[]
  /** Reading level preference */
  readingLevel: 'simple' | 'standard' | 'advanced'
  /** Language preference */
  language: string
  /** Media handling */
  autoPlayMedia: boolean
  /** Recent search queries */
  recentQueries: string[]
}

/**
 * Interaction patterns (learned)
 */
export interface InteractionPatterns {
  /** Peak usage hours (0-23) */
  peakHours: number[]
  /** Typical session length in minutes */
  avgSessionLength: number
  /** Most used features */
  topFeatures: string[]
  /** Error rate (0-1) */
  errorFrequency: number
  /** How often user asks for help */
  helpSeekFrequency: number
}

// ============================================================================
// PREFERENCE VALUES
// ============================================================================

export type PreferenceKey =
  | `communication.${keyof CommunicationPreferences}`
  | `ui.${keyof UIPreferences}`
  | `content.${keyof ContentPreferences}`

export type PreferenceValue = string | number | boolean | string[]

export interface Preference<T = PreferenceValue> {
  /** Preference key */
  key: PreferenceKey
  /** Current value */
  value: T
  /** Default value */
  defaultValue: T
  /** How this was set */
  source: 'explicit' | 'learned' | 'default'
  /** Confidence in this preference (0-1) */
  confidence: number
  /** Last updated timestamp */
  lastUpdated: string
  /** Number of times observed */
  observationCount: number
}

// ============================================================================
// LEARNING SIGNALS
// ============================================================================

export interface UserAction {
  /** Action type */
  type: string
  /** Timestamp */
  timestamp: string
  /** Context where action occurred */
  context: {
    feature?: string
    view?: string
    duration?: number
  }
  /** Action data */
  data?: Record<string, unknown>
}

export interface PreferenceSignal {
  /** Which preference this signals */
  preferenceKey: PreferenceKey
  /** Suggested value */
  value: PreferenceValue
  /** Strength of signal (0-1) */
  strength: number
  /** Source action */
  sourceAction: UserAction
  /** Timestamp */
  timestamp: string
}

// ============================================================================
// USER MODEL
// ============================================================================

export interface UserModel {
  /** User ID */
  userId: string
  /** Communication preferences */
  communication: Preference<CommunicationPreferences>
  /** UI preferences */
  ui: Preference<UIPreferences>
  /** Content preferences */
  content: Preference<ContentPreferences>
  /** Learned interaction patterns */
  patterns: InteractionPatterns
  /** All tracked preferences */
  preferences: Record<PreferenceKey, Preference>
  /** Learning state */
  learning: LearningState
}

export interface LearningState {
  /** Is learning enabled */
  enabled: boolean
  /** Categories where learning is disabled */
  disabledCategories: ('communication' | 'ui' | 'content')[]
  /** Total actions recorded */
  totalActionsRecorded: number
  /** When learning started */
  learningStartedAt: string
  /** Last action timestamp */
  lastActionAt: string
}

// ============================================================================
// EXPLANATION
// ============================================================================

export interface PreferenceExplanation {
  /** Preference key */
  key: PreferenceKey
  /** Current value */
  value: PreferenceValue
  /** Why it's set this way */
  reason: string
  /** Confidence level */
  confidence: number
  /** Source of this preference */
  source: 'explicit' | 'learned' | 'default'
  /** When it was last updated */
  lastUpdated: string
  /** Actions that influenced this */
  InfluencingActions?: UserAction[]
}

// ============================================================================
// STORAGE
// ============================================================================

export interface StoredUserModel {
  version: 1
  userId: string
  model: UserModel
  checksum: string
}

// ============================================================================
// EVENTS
// ============================================================================

export type PersonalizationEvent =
  | { type: 'preference-changed'; key: PreferenceKey; value: PreferenceValue }
  | { type: 'preference-learned'; key: PreferenceKey; value: PreferenceValue; confidence: number }
  | { type: 'pattern-detected'; pattern: keyof InteractionPatterns }
  | { type: 'learning-toggled'; enabled: boolean }

export interface PersonalizationObserver {
  (event: PersonalizationEvent): void
}
