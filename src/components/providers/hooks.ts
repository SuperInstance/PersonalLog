/**
 * Provider Hooks
 *
 * Convenience hooks for accessing provider contexts.
 * These are re-exported from individual provider files for centralized access.
 */

// ============================================================================
// RE-EXPORT PROVIDER HOOKS
// ============================================================================

export { useIntegration } from './IntegrationProvider'
export { useAnalytics } from './AnalyticsProvider'
export { useExperiments } from './ExperimentsProvider'
export { useOptimization } from './OptimizationProvider'
export { usePersonalization } from './PersonalizationProvider'

// ============================================================================
// CONVENIENCE COMPOSITE HOOKS
// ============================================================================

import { useCallback } from 'react'
import { useIntegration } from './IntegrationProvider'
import { useAnalytics } from './AnalyticsProvider'
import { useExperiments } from './ExperimentsProvider'
import { useOptimization } from './OptimizationProvider'
import { usePersonalization } from './PersonalizationProvider'

/**
 * Hook to check if all systems are initialized
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isReady, isLoading, errors } = useSystemsReady()
 *
 *   if (isLoading) return <LoadingSpinner />
 *   if (!isReady) return <SystemErrors errors={errors} />
 *
 *   return <App />
 * }
 * ```
 */
export function useSystemsReady() {
  const integration = useIntegration()
  const analytics = useAnalytics()
  const experiments = useExperiments()
  const optimization = useOptimization()
  const personalization = usePersonalization()

  const systems = [
    { name: 'Integration', ...integration },
    { name: 'Analytics', ...analytics },
    { name: 'Experiments', ...experiments },
    { name: 'Optimization', ...optimization },
    { name: 'Personalization', ...personalization },
  ]

  const isLoading = systems.some(s => s.isLoading)
  const isReady = systems.every(s => s.isInitialized)
  const errors = systems.filter(s => s.error !== null).map(s => ({
    system: s.name,
    error: s.error,
  }))

  return {
    isReady,
    isLoading,
    errors,
    systems,
  }
}

/**
 * Hook to get feature flag with experiment fallback
 *
 * Checks feature flags first, then experiments if flag is not set.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isEnabled = useFeatureFlag('ai-chat', 'ai-chat-experiment')
 *
 *   if (isEnabled) {
 *     return <AIChat />
 *   }
 * }
 * ```
 */
export function useFeatureFlag(
  featureId: string,
  experimentId?: string
): { enabled: boolean; variant: string | null; source: 'flag' | 'experiment' | 'none' } {
  const { isFeatureEnabled } = useIntegration()
  const { getVariant } = useExperiments()

  // Check feature flag first
  if (isFeatureEnabled(featureId)) {
    return { enabled: true, variant: null, source: 'flag' }
  }

  // Fall back to experiment if provided
  if (experimentId) {
    const variant = getVariant(experimentId)
    if (variant) {
      return { enabled: true, variant, source: 'experiment' }
    }
  }

  return { enabled: false, variant: null, source: 'none' }
}

/**
 * Hook to track performance metrics
 *
 * Combines analytics and optimization tracking.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { trackRender, trackError } = usePerformanceTracking('MyComponent')
 *
 *   useEffect(() => {
 *     trackRender()
 *   }, [])
 * }
 * ```
 */
export function usePerformanceTracking(componentName: string) {
  const { track } = useAnalytics()
  const { trackMetric: trackMetricInExperiments } = useExperiments()

  const trackRender = useCallback(async () => {
    const start = performance.now()

    return () => {
      const duration = performance.now() - start
      track('render_complete', {
        type: 'render_complete',
        component: componentName,
        duration,
      })
    }
  }, [track, componentName])

  const trackError = useCallback(async (error: Error, context?: Record<string, unknown>) => {
    await track('error_occurred', {
      type: 'error_occurred',
      errorType: error.name,
      errorMessage: error.message,
      context: componentName,
      recoverable: true,
      stack: error.stack,
      ...context,
    })
  }, [track, componentName])

  const trackMetric = useCallback((metric: string, value: number) => {
    // Track in both analytics and experiments
    track('memory_measurement', {
      type: 'memory_measurement',
      metric,
      value,
      component: componentName,
    })

    if (metric.includes('_')) {
      const [experimentId, metricName] = metric.split('_', 2)
      trackMetricInExperiments(experimentId, metricName, value)
    }
  }, [track, trackMetricInExperiments, componentName])

  return {
    trackRender,
    trackError,
    trackMetric,
  }
}

/**
 * Hook to get user adaptive settings
 *
 * Combines personalization with feature flags and experiments.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { fontSize, theme } = useAdaptiveSettings()
 *
 *   return <div style={{ fontSize }}>Hello</div>
 * }
 * ```
 */
export function useAdaptiveSettings() {
  const { get } = usePersonalization()
  const { isFeatureEnabled } = useIntegration()
  const { getVariant } = useExperiments()

  return {
    // UI preferences from personalization
    fontSize: get('ui.fontSize') as number ?? 1.0,
    theme: get('ui.theme') as string ?? 'auto',
    density: get('ui.density') as string ?? 'comfortable',
    animations: get('ui.animations') as string ?? 'full',

    // Feature flags
    hasHighPerformance: isFeatureEnabled('high-performance-mode'),
    hasOfflineSupport: isFeatureEnabled('offline-support'),

    // Experiment variants
    uiVariant: getVariant('ui-redesign'),
    featureDiscoveryVariant: getVariant('feature-discovery'),
  }
}

/**
 * Hook to track user interactions for learning
 *
 * Automatically records actions for personalization.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { trackClick, trackView, trackFeatureUse } = useInteractionTracking()
 *
 *   return <button onClick={() => trackClick('save-button')}>Save</button>
 * }
 * ```
 */
export function useInteractionTracking() {
  const { recordAction } = usePersonalization()
  const { track } = useAnalytics()

  const trackClick = useCallback((elementId: string, context?: Record<string, unknown>) => {
    recordAction({
      type: 'element-clicked',
      timestamp: new Date().toISOString(),
      context: {
        feature: elementId,
        ...context,
      },
    })

    track('feature_used', {
      type: 'feature_used',
      featureId: elementId,
      success: true,
      context,
    })
  }, [recordAction, track])

  const trackView = useCallback((viewName: string, context?: Record<string, unknown>) => {
    recordAction({
      type: 'view-changed',
      timestamp: new Date().toISOString(),
      context: {
        view: viewName,
        ...(context || {}),
      },
    })

    track('feature_used', {
      type: 'feature_used',
      featureId: `view-${viewName}`,
      success: true,
      context,
    })
  }, [recordAction, track])

  const trackFeatureUse = useCallback((
    featureId: string,
    duration?: number,
    context?: Record<string, unknown>
  ) => {
    recordAction({
      type: 'feature-used',
      timestamp: new Date().toISOString(),
      context: {
        feature: featureId,
        duration,
        ...(context || {}),
      },
    })

    track('feature_used', {
      type: 'feature_used',
      featureId,
      duration,
      success: true,
      context,
    })
  }, [recordAction, track])

  const trackError = useCallback((error: Error, context?: Record<string, unknown>) => {
    recordAction({
      type: 'error-occurred',
      timestamp: new Date().toISOString(),
      context: {
        feature: context?.feature as string ?? 'unknown',
        ...(context || {}),
      },
    })

    track('error_occurred', {
      type: 'error_occurred',
      errorType: error.name,
      errorMessage: error.message,
      context: context?.feature as string ?? 'unknown',
      recoverable: true,
      stack: error.stack,
    })
  }, [recordAction, track])

  const trackSession = useCallback((duration: number) => {
    recordAction({
      type: 'session-ended',
      timestamp: new Date().toISOString(),
      context: {
        feature: 'session',
        duration,
      },
    })

    track('feature_used', {
      type: 'feature_used',
      featureId: 'session',
      duration,
      success: true,
    })
  }, [recordAction, track])

  return {
    trackClick,
    trackView,
    trackFeatureUse,
    trackError,
    trackSession,
  }
}
