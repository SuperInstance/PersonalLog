/**
 * PersonalLog - Personalization API
 *
 * Public API for the personalization system.
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  // Preferences
  CommunicationPreferences,
  UIPreferences,
  ContentPreferences,
  InteractionPatterns,

  // Core types
  PreferenceKey,
  PreferenceValue,
  Preference,
  UserAction,
  PreferenceSignal,
  UserModel,
  LearningState,
  PreferenceExplanation,
  StoredUserModel,
  PersonalizationEvent,
  PersonalizationObserver,
} from './types'

// ============================================================================
// CORE CLASSES
// ============================================================================

export {
  PreferenceLearner,
  PreferenceAggregator,
  PatternDetector,
} from './learner'

export {
  PreferenceModel,
  PersonalizationModel,
  ModelFactory,
} from './models'

export {
  ThemeAdapter,
  TypographyAdapter,
  LayoutAdapter,
  ContentAdapter,
  AnimationAdapter,
  PersonalizationAdapter,
  generateCSSVariables,
  getDensityClassName,
  getFontSizeClassName,
} from './adapters'

export {
  saveUserModel,
  loadUserModel,
  deleteUserModel,
  listUserModels,
  clearAllModels,
  exportUserModel,
  importUserModel,
  exportUserModelAsFile,
  importUserModelFromFile,
  createBackup,
  restoreBackup,
  getStorageStats,
  clearAllPersonalizationData,
} from './storage'

// ============================================================================
// REACT HOOKS
// ============================================================================

export {
  usePersonalization,
  usePersonalizedSetting,
  usePersonalizedTheme,
  usePersonalizedTypography,
  usePersonalizedLayout,
  usePersonalizedContent,
  useLearningState,
  usePreferenceExplanation,
  usePersonalizationEffect,
  usePersonalizedValue,
} from './hooks'

// ============================================================================
// REACT COMPONENTS
// ============================================================================

export {
  PersonalizedProvider,
  PersonalizedSetting,
  PersonalizedText,
  PersonalizedContainer,
  PersonalizedTheme,
  PersonalizedExplanation,
  PersonalizedControls,
} from '@/components/personalization/Personalized'

// ============================================================================
// CONVENIENCE API
// ============================================================================

import { ModelFactory } from './models'
import { PreferenceLearner, PreferenceAggregator, PatternDetector } from './learner'
import type { UserAction, PreferenceKey } from './types'

/**
 * Convenience API for quick personalization access
 */
class PersonalizationAPI {
  private learner = new PreferenceLearner()
  private aggregator = new PreferenceAggregator()
  private patternDetector = new PatternDetector()

  /**
   * Get user model
   */
  getModel(userId: string = 'default') {
    return ModelFactory.getInstance().getModel(userId)
  }

  /**
   * Record a user action for learning
   */
  recordAction(action: UserAction, userId: string = 'default') {
    const model = this.getModel(userId)
    const signals = this.learner.analyzeAction(action)

    // Add signals to aggregator
    for (const signal of signals) {
      this.aggregator.addSignal(signal)
    }

    // Update patterns
    if (action.type === 'session-ended') {
      const duration = action.context?.duration as number | undefined
      const hour = new Date(action.timestamp).getHours()
      if (duration) {
        this.patternDetector.recordSession(duration, hour)
      }

      const patterns = this.patternDetector.getPatterns()
      model.updatePatterns(patterns)
    }

    if (action.type === 'feature-used') {
      const feature = action.context?.feature as string | undefined
      if (feature) {
        this.patternDetector.recordFeatureUsage(feature)
      }
    }

    if (action.type === 'error-occurred') {
      this.patternDetector.recordError()
    }

    if (action.type === 'help-requested') {
      this.patternDetector.recordHelp()
    }

    // Learn from aggregated signals
    for (const [key] of Object.entries(signals)) {
      const aggregated = this.aggregator.aggregate(key as PreferenceKey)
      if (aggregated && model.isLearningEnabled()) {
        const category = key.split('.')[0] as 'communication' | 'ui' | 'content'
        if (model.isLearningEnabled(category)) {
          model.getPreferences().learn(key as PreferenceKey, aggregated.value, aggregated.confidence)
        }
      }
    }

    model.recordAction()
  }

  /**
   * Get a preference value
   */
  get<T = unknown>(key: PreferenceKey, userId: string = 'default'): T {
    return this.getModel(userId).getPreferences().get<T>(key)
  }

  /**
   * Set a preference value
   */
  set(key: PreferenceKey, value: unknown, userId: string = 'default'): void {
    this.getModel(userId).getPreferences().set(key, value, 'explicit')
  }

  /**
   * Reset a preference to default
   */
  reset(key: PreferenceKey, userId: string = 'default'): void {
    this.getModel(userId).getPreferences().reset(key)
  }

  /**
   * Explain why a preference is set
   */
  explain(key: PreferenceKey, userId: string = 'default') {
    return this.getModel(userId).getPreferences().explain(key)
  }

  /**
   * Toggle learning on/off
   */
  toggleLearning(enabled: boolean, userId: string = 'default'): void {
    this.getModel(userId).toggleLearning(enabled)
  }

  /**
   * Get learning statistics
   */
  getStats(userId: string = 'default') {
    const model = this.getModel(userId)
    const patternStats = this.patternDetector.getStats()
    const aggStats = this.aggregator.getStats()

    return {
      learning: model.getLearningState(),
      patterns: model.getPatterns(),
      patternStats,
      aggregationStats: aggStats,
    }
  }

  /**
   * Clear all learned data
   */
  clearLearning(userId: string = 'default'): void {
    this.patternDetector.reset()
    this.aggregator.clear()
    // Note: We don't reset explicit preferences, only learned patterns
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let personalizationAPI: PersonalizationAPI | null = null

/**
 * Get the personalization API singleton
 */
export function getPersonalizationAPI(): PersonalizationAPI {
  if (!personalizationAPI) {
    personalizationAPI = new PersonalizationAPI()
  }
  return personalizationAPI
}

// ============================================================================
// QUICK ACCESS FUNCTIONS
// ============================================================================

/**
 * Get a preference value
 */
export function getPreference<T = unknown>(key: PreferenceKey, userId?: string): T {
  return getPersonalizationAPI().get<T>(key, userId)
}

/**
 * Set a preference value
 */
export function setPreference(key: PreferenceKey, value: unknown, userId?: string): void {
  getPersonalizationAPI().set(key, value, userId)
}

/**
 * Record a user action
 */
export function recordUserAction(action: UserAction, userId?: string): void {
  getPersonalizationAPI().recordAction(action, userId)
}

/**
 * Get preference explanation
 */
export function explainPreference(key: PreferenceKey, userId?: string) {
  return getPersonalizationAPI().explain(key, userId)
}

/**
 * Toggle learning
 */
export function togglePersonalizationLearning(enabled: boolean, userId?: string): void {
  getPersonalizationAPI().toggleLearning(enabled, userId)
}

/**
 * Get personalization statistics
 */
export function getPersonalizationStats(userId?: string) {
  return getPersonalizationAPI().getStats(userId)
}

// ============================================================================
// DEFAULT EXPORTS
// ============================================================================

export default {
  // Classes
  PersonalizationAPI,
  ModelFactory,
  PreferenceLearner,
  PreferenceAggregator,
  PatternDetector,

  // Functions
  getPersonalizationAPI,
  getPreference,
  setPreference,
  recordUserAction,
  explainPreference,
  togglePersonalizationLearning,
  getPersonalizationStats,

  // Hooks
  usePersonalization,
  usePersonalizedSetting,
  usePersonalizedTheme,
  usePersonalizedTypography,
  usePersonalizedLayout,
  usePersonalizedContent,
  useLearningState,
  usePreferenceExplanation,

  // Components
  PersonalizedProvider,
  PersonalizedSetting,
  PersonalizedText,
  PersonalizedContainer,
  PersonalizedTheme,
  PersonalizedExplanation,
  PersonalizedControls,
}
