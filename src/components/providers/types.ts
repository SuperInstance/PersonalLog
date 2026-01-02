/**
 * Provider Types
 *
 * TypeScript types and interfaces for all React providers.
 * These types define the public API for each provider's context.
 */

import type {
  IntegrationState,
  Capabilities,
  DiagnosticResults,
} from '@/lib/integration'
import type {
  EventType,
  EventData,
  AnalyticsConfig,
} from '@/lib/analytics'
import type {
  Experiment,
  Metric,
} from '@/lib/experiments'
import type {
  OptimizationStatus,
  AppliedRule,
  OptimizationEngineState,
} from '@/lib/optimization'
import type {
  UserPreferences,
  PreferenceKey,
  UserAction,
  LearningState,
} from '@/lib/personalization'

// ============================================================================
// INTEGRATION PROVIDER TYPES
// ============================================================================

/**
 * Context value provided by IntegrationProvider
 */
export interface IntegrationContextValue {
  /** Current integration state */
  state: IntegrationState

  /** System capabilities */
  capabilities: Capabilities

  /** Check if a feature is enabled */
  isFeatureEnabled: (featureId: string) => boolean

  /** Get list of enabled features */
  getEnabledFeatures: () => string[]

  /** Run diagnostic checks */
  runDiagnostics: () => Promise<DiagnosticResults>

  /** Reinitialize the integration system */
  reinitialize: () => Promise<void>

  /** Loading state */
  isLoading: boolean

  /** Error if initialization failed */
  error: Error | null

  /** Whether the system has been initialized */
  isInitialized: boolean
}

// ============================================================================
// ANALYTICS PROVIDER TYPES
// ============================================================================

/**
 * Context value provided by AnalyticsProvider
 */
export interface AnalyticsContextValue {
  /** Track an analytics event */
  track: (type: EventType, data: EventData) => Promise<void>

  /** Flush pending events to storage */
  flush: () => Promise<void>

  /** Get analytics statistics */
  getStats: (days?: number) => Promise<{
    totalEvents: number
    storageSize: number
    retentionDays: number
  }>

  /** Export analytics data as JSON */
  exportData: (days?: number) => Promise<string>

  /** Delete old analytics data */
  deleteData: (days: number) => Promise<void>

  /** Check if tracking is enabled */
  isTrackingEnabled: boolean

  /** Enable or disable tracking */
  setTrackingEnabled: (enabled: boolean) => void

  /** Get current configuration */
  getConfig: () => AnalyticsConfig

  /** Update configuration */
  updateConfig: (config: Partial<AnalyticsConfig>) => void

  /** Loading state */
  isLoading: boolean

  /** Error if initialization failed */
  error: Error | null

  /** Whether the system has been initialized */
  isInitialized: boolean
}

// ============================================================================
// EXPERIMENTS PROVIDER TYPES
// ============================================================================

/**
 * Context value provided by ExperimentsProvider
 */
export interface ExperimentsContextValue {
  /** Get variant assignment for an experiment */
  getVariant: (experimentId: string) => string | null

  /** Check if user is in a specific variant */
  isVariant: (experimentId: string, variantId: string) => boolean

  /** Track a metric for an experiment */
  trackMetric: (experimentId: string, metric: string, value: number) => void

  /** Get all registered experiments */
  getAllExperiments: () => Experiment[]

  /** Get a specific experiment */
  getExperiment: (experimentId: string) => Experiment | undefined

  /** Opt out of an experiment */
  optOut: (experimentId: string) => void

  /** Check if user has opted out of an experiment */
  isOptedOut: (experimentId: string) => boolean

  /** Create a new experiment */
  createExperiment: (config: {
    id: string
    name: string
    variants: Array<{ id: string; weight: number }>
    primaryMetric?: string
    trafficAllocation?: number
  }) => Promise<void>

  /** Loading state */
  isLoading: boolean

  /** Error if initialization failed */
  error: Error | null

  /** Whether the system has been initialized */
  isInitialized: boolean
}

// ============================================================================
// OPTIMIZATION PROVIDER TYPES
// ============================================================================

/**
 * Context value provided by OptimizationProvider
 */
export interface OptimizationContextValue {
  /** Current optimization status */
  status: OptimizationStatus

  /** Engine state */
  state: OptimizationEngineState | null

  /** Rules that have been applied */
  appliedRules: AppliedRule[]

  /** Get current optimization suggestions */
  getSuggestions: () => Promise<Array<{
    ruleId: string
    name: string
    impact: string
    confidence: number
  }>>

  /** Enable optimization engine */
  enable: () => Promise<void>

  /** Disable optimization engine */
  disable: () => Promise<void>

  /** Run optimization cycle manually */
  runOptimization: () => Promise<void>

  /** Apply a specific optimization */
  applyOptimization: (ruleId: string) => Promise<void>

  /** Get health status */
  getHealth: () => Promise<{
    health: 'healthy' | 'degraded' | 'unhealthy'
    issues: string[]
  }>

  /** Check if optimization is enabled */
  isEnabled: boolean

  /** Loading state */
  isLoading: boolean

  /** Error if initialization failed */
  error: Error | null

  /** Whether the system has been initialized */
  isInitialized: boolean
}

// ============================================================================
// PERSONALIZATION PROVIDER TYPES
// ============================================================================

/**
 * Context value provided by PersonalizationProvider
 */
export interface PersonalizationContextValue {
  /** Current user preferences */
  preferences: UserPreferences

  /** Learning state for each category */
  learningState: LearningState

  /** Get a preference value */
  get: <T = unknown>(key: PreferenceKey) => T

  /** Set a preference value */
  set: (key: PreferenceKey, value: unknown) => void

  /** Reset a preference to default */
  reset: (key: PreferenceKey) => void

  /** Update a preference with inferred value */
  updatePreference: (key: PreferenceKey, value: unknown, confidence: number) => void

  /** Record a user action for learning */
  recordAction: (action: UserAction) => void

  /** Opt out of learning for a category */
  optOut: (category: 'communication' | 'ui' | 'content') => void

  /** Check if opted out of a category */
  isOptedOut: (category: 'communication' | 'ui' | 'content') => boolean

  /** Toggle learning on/off globally */
  toggleLearning: (enabled: boolean) => void

  /** Explain why a preference is set */
  explain: (key: PreferenceKey) => {
    value: unknown
    source: 'explicit' | 'learned' | 'default'
    confidence: number
    reason: string
  } | null

  /** Export user data */
  exportData: () => Promise<string>

  /** Import user data */
  importData: (data: string) => Promise<void>

  /** Clear all learned data */
  clearLearning: () => void

  /** Loading state */
  isLoading: boolean

  /** Error if initialization failed */
  error: Error | null

  /** Whether the system has been initialized */
  isInitialized: boolean
}

// ============================================================================
// INITIALIZATION LOADER TYPES
// ============================================================================

/**
 * Initialization stage for tracking progress
 */
export interface InitializationStage {
  /** Stage identifier */
  id: string

  /** Display name */
  name: string

  /** Description of what's being initialized */
  description: string

  /** Current status */
  status: 'pending' | 'in-progress' | 'complete' | 'error'

  /** Error if failed */
  error?: Error

  /** Progress percentage (0-100) */
  progress: number
}

/**
 * Overall initialization state
 */
export interface InitializationState {
  /** Current stage being initialized */
  currentStage: string | null

  /** Overall progress (0-100) */
  progress: number

  /** All initialization stages */
  stages: InitializationStage[]

  /** Whether initialization is complete */
  isComplete: boolean

  /** Whether initialization has errors */
  hasErrors: boolean

  /** Whether initialization timed out */
  isTimedOut: boolean
}

// ============================================================================
// PROVIDER CONFIG TYPES
// ============================================================================

/**
 * Configuration for all providers
 */
export interface ProvidersConfig {
  /** Integration provider config */
  integration?: {
    /** Debug mode */
    debug?: boolean

    /** Run benchmarks on initialization */
    runBenchmarks?: boolean

    /** Initialization timeout in ms */
    timeout?: number
  }

  /** Analytics provider config */
  analytics?: {
    /** Enable tracking on mount */
    enabled?: boolean

    /** Require user consent */
    requireConsent?: boolean

    /** Retention days */
    retentionDays?: number
  }

  /** Experiments provider config */
  experiments?: {
    /** Enable experiments on mount */
    enabled?: boolean

    /** Traffic allocation (0-1) */
    trafficAllocation?: number

    /** Persistence key */
    storageKey?: string
  }

  /** Optimization provider config */
  optimization?: {
    /** Enable optimization on mount */
    enabled?: boolean

    /** Auto-apply optimizations */
    autoApply?: boolean

    /** Monitor interval in ms */
    monitorInterval?: number
  }

  /** Personalization provider config */
  personalization?: {
    /** Enable learning on mount */
    enabled?: boolean

    /** User ID */
    userId?: string

    /** Auto-save interval in ms */
    autoSaveInterval?: number
  }

  /** Overall initialization config */
  initialization?: {
    /** Show loading screen during init */
    showLoader?: boolean

    /** Maximum time to wait for init in ms */
    timeout?: number

    /** Render fallback if timeout */
    fallbackOnTimeout?: boolean
  }
}
