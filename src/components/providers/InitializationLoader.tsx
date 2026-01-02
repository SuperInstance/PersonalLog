/**
 * Initialization Loader
 *
 * Displays a loading screen while providers initialize.
 * Shows progress and handles timeouts gracefully.
 *
 * @example
 * ```tsx
 * <InitializationLoader
 *   timeout={5000}
 *   fallbackOnTimeout={true}
 *   loadingComponent={<CustomLoader />}
 * >
 *   <App />
 * </InitializationLoader>
 * ```
 */

'use client'

import React, { useEffect, useState, useCallback } from 'react'
import type { InitializationStage } from './types'

export interface InitializationLoaderProps {
  /** Children to render after initialization */
  children: React.ReactNode

  /** Maximum time to wait before showing fallback (ms) */
  timeout?: number

  /** Render children even if initialization times out */
  fallbackOnTimeout?: boolean

  /** Custom loading component */
  loadingComponent?: React.ReactNode

  /** Custom timeout component */
  timeoutComponent?: React.ReactNode

  /** Show detailed progress */
  showProgress?: boolean

  /** Show stage names */
  showStages?: boolean
}

/**
 * Initialization state tracking
 */
class InitializationTracker {
  private stages: Map<string, InitializationStage> = new Map()
  private listeners: Set<() => void> = new Set()

  registerStage(id: string, name: string, description: string) {
    const stage: InitializationStage = {
      id,
      name,
      description,
      status: 'pending',
      progress: 0,
    }
    this.stages.set(id, stage)
    this.notify()
  }

  updateStage(id: string, updates: Partial<InitializationStage>) {
    const stage = this.stages.get(id)
    if (stage) {
      Object.assign(stage, updates)
      this.notify()
    }
  }

  getStages(): InitializationStage[] {
    return Array.from(this.stages.values())
  }

  getProgress(): number {
    const stages = this.getStages()
    if (stages.length === 0) return 0
    const total = stages.reduce((sum, s) => sum + s.progress, 0)
    return Math.floor(total / stages.length)
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach(listener => listener())
  }
}

// Global tracker instance
const tracker = new InitializationTracker()

// Register stages
tracker.registerStage('integration', 'System Integration', 'Initializing hardware detection and capabilities')
tracker.registerStage('analytics', 'Analytics', 'Setting up usage tracking')
tracker.registerStage('experiments', 'Experiments', 'Loading A/B test assignments')
tracker.registerStage('optimization', 'Optimization', 'Starting performance monitoring')
tracker.registerStage('personalization', 'Personalization', 'Loading user preferences')

// Export tracker for providers to update
export { tracker as initializationTracker }

/**
 * Default loading animation
 */
function DefaultLoader({ stages, progress }: { stages: InitializationStage[], progress: number }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '1.5rem',
      padding: '2rem',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
        PersonalLog
      </div>

      <div style={{ fontSize: '1.1rem', opacity: 0.9 }}>
        Initializing your experience...
      </div>

      {/* Progress bar */}
      <div style={{
        width: '100%',
        maxWidth: '300px',
        height: '4px',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'white',
          transition: 'width 0.3s ease',
          borderRadius: '2px',
        }} />
      </div>

      {/* Stage list */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        width: '100%',
        maxWidth: '400px',
      }}>
        {stages.map(stage => (
          <div
            key={stage.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.9rem',
              opacity: stage.status === 'pending' ? 0.6 : 1,
            }}
          >
            {/* Status icon */}
            <div style={{
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {stage.status === 'complete' && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6L5 9L10 3"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {stage.status === 'in-progress' && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle
                    cx="6"
                    cy="6"
                    r="5"
                    stroke="white"
                    strokeWidth="1"
                    strokeDasharray="8 4"
                  />
                </svg>
              )}
              {stage.status === 'error' && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M3 3L9 9M9 3L3 9"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>

            {/* Stage name and description */}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{stage.name}</div>
              {stage.description && (
                <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                  {stage.description}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Progress percentage */}
      <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
        {progress}%
      </div>
    </div>
  )
}

/**
 * Default timeout message
 */
function DefaultTimeoutMessage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '1.5rem',
      padding: '2rem',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
        Almost there...
      </div>

      <div style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: '400px' }}>
        Some systems are taking longer to initialize. The app is ready to use,
        and we&apos;ll finish setting up in the background.
      </div>
    </div>
  )
}

/**
 * Initialization Loader Component
 */
export function InitializationLoader({
  children,
  timeout = 5000,
  fallbackOnTimeout = true,
  loadingComponent,
  timeoutComponent,
  showProgress = true,
  showStages = true,
}: InitializationLoaderProps) {
  const [stages, setStages] = useState<InitializationStage[]>(tracker.getStages())
  const [progress, setProgress] = useState(tracker.getProgress())
  const [isTimedOut, setIsTimedOut] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  // Subscribe to tracker updates
  useEffect(() => {
    const unsubscribe = tracker.subscribe(() => {
      setStages(tracker.getStages())
      setProgress(tracker.getProgress())

      // Check if all stages are complete or errored
      const allDone = tracker.getStages().every(
        s => s.status === 'complete' || s.status === 'error'
      )
      if (allDone && !isComplete) {
        setIsComplete(true)
      }
    })

    return unsubscribe
  }, [isComplete])

  // Handle timeout
  useEffect(() => {
    if (isComplete) {
      return
    }

    const timeoutId = setTimeout(() => {
      console.warn('[InitializationLoader] Initialization timeout')
      setIsTimedOut(true)
    }, timeout)

    return () => clearTimeout(timeoutId)
  }, [timeout, isComplete])

  // Update stage progress from providers
  useEffect(() => {
    // Listen for provider initialization events
    const handleProviderInit = (event: Event) => {
      const customEvent = event as CustomEvent<{ provider: string; progress: number }>
      tracker.updateStage(customEvent.detail.provider, {
        status: customEvent.detail.progress === 100 ? 'complete' : 'in-progress',
        progress: customEvent.detail.progress,
      })
    }

    window.addEventListener('provider-init', handleProviderInit)
    return () => window.removeEventListener('provider-init', handleProviderInit)
  }, [])

  // Show children if initialization is complete or timed out with fallback
  if (isComplete || (isTimedOut && fallbackOnTimeout)) {
    return <>{children}</>
  }

  // Show timeout message if timed out
  if (isTimedOut && !fallbackOnTimeout) {
    return <>{timeoutComponent ?? <DefaultTimeoutMessage />}</>
  }

  // Show loading screen
  return <>{loadingComponent ?? <DefaultLoader stages={stages} progress={progress} />}</>
}

/**
 * Hook for providers to update their initialization progress
 *
 * @example
 * ```tsx
 * function MyProvider({ children }) {
 *   const { updateProgress } = useInitializationProgress('my-provider')
 *
 *   useEffect(() => {
 *     updateProgress(50)
 *     initialize().then(() => updateProgress(100))
 *   }, [])
 * }
 * ```
 */
export function useInitializationProgress(providerId: string) {
  const updateProgress = useCallback((progress: number) => {
    tracker.updateStage(providerId, {
      status: progress === 100 ? 'complete' : 'in-progress',
      progress,
    })

    // Emit event for cross-component communication
    window.dispatchEvent(
      new CustomEvent('provider-init', {
        detail: { provider: providerId, progress },
      })
    )
  }, [providerId])

  const setError = useCallback((error: Error) => {
    tracker.updateStage(providerId, {
      status: 'error',
      error,
      progress: 0,
    })
  }, [providerId])

  return { updateProgress, setError }
}
