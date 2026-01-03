/**
 * Providers Module
 *
 * Central export point for all React providers and related utilities.
 *
 * @example
 * ```tsx
 * // Import everything from one place
 * import {
 *   AppProviders,
 *   useIntegration,
 *   useAnalytics,
 *   useExperiments,
 *   useOptimization,
 *   usePersonalization,
 *   InitializationLoader,
 * } from '@/components/providers'
 * ```
 */

// ============================================================================
// MAIN PROVIDERS
// ============================================================================

export { IntegrationProvider, useIntegration } from './IntegrationProvider'
export { AnalyticsProvider, useAnalytics } from './AnalyticsProvider'
export { ExperimentsProvider, useExperiments } from './ExperimentsProvider'
export { OptimizationProvider, useOptimization } from './OptimizationProvider'
export { PersonalizationProvider, usePersonalization } from './PersonalizationProvider'

// ============================================================================
// COMBINED PROVIDERS
// ============================================================================

export {
  AppProviders,
  AppProvidersNoLoader,
  CoreProviders,
} from './AppProviders'

import { AppProviders } from './AppProviders'
export default AppProviders

// ============================================================================
// LOADING COMPONENTS
// ============================================================================

export {
  InitializationLoader,
  useInitializationProgress,
} from './InitializationLoader'

// ============================================================================
// TYPES
// ============================================================================

export type {
  // Integration
  IntegrationContextValue,

  // Analytics
  AnalyticsContextValue,

  // Experiments
  ExperimentsContextValue,

  // Optimization
  OptimizationContextValue,

  // Personalization
  PersonalizationContextValue,

  // Initialization
  InitializationStage,
  InitializationState,

  // Config
  ProvidersConfig,
} from './types'

// ============================================================================
// HOOKS
// ============================================================================

export {
  useSystemsReady,
  useFeatureFlag,
  usePerformanceTracking,
  useAdaptiveSettings,
  useInteractionTracking,
} from './hooks'

// ============================================================================
// PROVIDER PROPS TYPES
// ============================================================================

export type { IntegrationProviderProps } from './IntegrationProvider'
export type { AnalyticsProviderProps } from './AnalyticsProvider'
export type { ExperimentsProviderProps } from './ExperimentsProvider'
export type { OptimizationProviderProps } from './OptimizationProvider'
export type { PersonalizationProviderProps } from './PersonalizationProvider'
export type { AppProvidersProps } from './AppProviders'
export type { InitializationLoaderProps } from './InitializationLoader'
