/**
 * Feature Flag React Hooks
 *
 * Provides React hooks for integrating feature flags into components.
 * Makes feature gating seamless and declarative.
 */

import { useEffect, useState, useCallback, useContext, createContext, ReactNode } from 'react';
import type {
  EvaluationResult,
  FeatureFlag,
  FlagEvent,
  FlagEventListener,
  HardwareCapabilities,
  UserPreferences,
} from './types';
import { getGlobalManager, initializeFeatureFlags, type FeatureFlagManager } from './manager';

/**
 * Feature flags context
 */
interface FeatureFlagsContextValue {
  manager: FeatureFlagManager | null;
  initialized: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  manager: null,
  initialized: false,
});

/**
 * Provider props
 */
interface FeatureFlagsProviderProps {
  children: ReactNode;
  config?: {
    debug?: boolean;
    persistPreferences?: boolean;
    trackMetrics?: boolean;
    autoPerformanceGate?: boolean;
  };
}

/**
 * Feature Flags Provider Component
 *
 * Wraps the app and initializes the feature flag system.
 * Should be placed at the root of the app.
 *
 * @example
 * ```tsx
 * <FeatureFlagsProvider config={{ debug: true }}>
 *   <App />
 * </FeatureFlagsProvider>
 * ```
 */
export function FeatureFlagsProvider({ children, config }: FeatureFlagsProviderProps) {
  const [manager, setManager] = useState<FeatureFlagManager | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    initializeFeatureFlags(config)
      .then((mgr) => {
        if (mounted) {
          setManager(mgr);
          setInitialized(true);
        }
      })
      .catch((error) => {
        console.error('Failed to initialize feature flags:', error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const value = {
    manager,
    initialized,
  };

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/**
 * Use the feature flags manager
 *
 * @returns The feature flag manager instance
 * @throws Error if used outside provider or before initialization
 */
export function useFeatureFlagsManager(): FeatureFlagManager {
  const context = useContext(FeatureFlagsContext);

  if (!context.manager) {
    throw new Error('useFeatureFlagsManager must be used within FeatureFlagsProvider');
  }

  return context.manager;
}

/**
 * Check if a feature is enabled
 *
 * @param featureId - The feature ID to check
 * @returns Whether the feature is enabled
 * @example
 * ```tsx
 * function MyComponent() {
 *   const hasStreaming = useFeatureFlag('ai.streaming_responses');
 *
 *   return hasStreaming ? <StreamingChat /> : <BasicChat />;
 * }
 * ```
 */
export function useFeatureFlag(featureId: string): boolean {
  const manager = useFeatureFlagsManager();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!manager) return;

    // Check initial state
    setEnabled(manager.isEnabled(featureId));

    // Listen for changes
    const listener: FlagEventListener = (event: FlagEvent) => {
      if (
        event.type === 'feature_enabled' ||
        event.type === 'feature_disabled' ||
        event.type === 'preferences_changed'
      ) {
        setEnabled(manager.isEnabled(featureId));
      }
    };

    manager.addEventListener('*', listener);

    return () => {
      manager.removeEventListener('*', listener);
    };
  }, [manager, featureId]);

  return enabled;
}

/**
 * Get detailed evaluation result for a feature
 *
 * @param featureId - The feature ID to evaluate
 * @returns The evaluation result with reasons
 * @example
 * ```tsx
 * function MyComponent() {
 *   const result = useFeatureFlagResult('ai.local_models');
 *
 *   if (!result.enabled) {
 *     return <div>Not available: {result.reason}</div>;
 *   }
 *
 *   return <LocalModelRunner />;
 * }
 * ```
 */
export function useFeatureFlagResult(featureId: string): EvaluationResult | null {
  const manager = useFeatureFlagsManager();
  const [result, setResult] = useState<EvaluationResult | null>(null);

  useEffect(() => {
    if (!manager) return;

    // Get initial result
    try {
      setResult(manager.evaluate(featureId));
    } catch (e) {
      console.error('Failed to evaluate feature:', e);
    }

    // Listen for changes
    const listener: FlagEventListener = (event: FlagEvent) => {
      if (
        event.type === 'feature_enabled' ||
        event.type === 'feature_disabled' ||
        event.type === 'preferences_changed' ||
        event.type === 'hardware_detected'
      ) {
        try {
          setResult(manager.evaluate(featureId));
        } catch (e) {
          console.error('Failed to evaluate feature:', e);
        }
      }
    };

    manager.addEventListener('*', listener);

    return () => {
      manager.removeEventListener('*', listener);
    };
  }, [manager, featureId]);

  return result;
}

/**
 * Get multiple feature flag states at once
 *
 * @param featureIds - Array of feature IDs to check
 * @returns Map of feature IDs to enabled states
 * @example
 * ```tsx
 * function MyComponent() {
 *   const flags = useFeatureFlags(['ai.local_models', 'media.audio_recording']);
 *
 *   return (
 *     <div>
 *       {flags.get('ai.local_models') && <LocalModelRunner />}
 *       {flags.get('media.audio_recording') && <AudioRecorder />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFeatureFlags(featureIds: string[]): Map<string, boolean> {
  const manager = useFeatureFlagsManager();
  const [states, setStates] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (!manager) return;

    // Check initial states
    const initialStates = new Map<string, boolean>();
    featureIds.forEach(id => {
      initialStates.set(id, manager.isEnabled(id));
    });
    setStates(initialStates);

    // Listen for changes
    const listener: FlagEventListener = () => {
      const newStates = new Map<string, boolean>();
      featureIds.forEach(id => {
        newStates.set(id, manager.isEnabled(id));
      });
      setStates(newStates);
    };

    manager.addEventListener('*', listener);

    return () => {
      manager.removeEventListener('*', listener);
    };
  }, [manager, featureIds]);

  return states;
}

/**
 * Get all enabled features
 *
 * @returns Array of enabled feature IDs
 * @example
 * ```tsx
 * function DebugPanel() {
 *   const enabledFeatures = useEnabledFeatures();
 *
 *   return (
 *     <div>
 *       <h3>Enabled Features:</h3>
 *       <ul>
 *         {enabledFeatures.map(id => <li key={id}>{id}</li>)}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function useEnabledFeatures(): string[] {
  const manager = useFeatureFlagsManager();
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    if (!manager) return;

    setFeatures(manager.getEnabledFeatures());

    const listener: FlagEventListener = () => {
      setFeatures(manager.getEnabledFeatures());
    };

    manager.addEventListener('*', listener);

    return () => {
      manager.removeEventListener('*', listener);
    };
  }, [manager]);

  return features;
}

/**
 * Get all disabled features
 *
 * @returns Array of disabled feature IDs
 */
export function useDisabledFeatures(): string[] {
  const manager = useFeatureFlagsManager();
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    if (!manager) return;

    setFeatures(manager.getDisabledFeatures());

    const listener: FlagEventListener = () => {
      setFeatures(manager.getDisabledFeatures());
    };

    manager.addEventListener('*', listener);

    return () => {
      manager.removeEventListener('*', listener);
    };
  }, [manager]);

  return features;
}

/**
 * Get hardware capabilities
 *
 * @returns Hardware capabilities object
 * @example
 * ```tsx
 * function HardwareInfo() {
 *   const hardware = useHardwareCapabilities();
 *
 *   return (
 *     <div>
 *       <p>Score: {hardware.score}/100</p>
 *       <p>Profile: {hardware.profile}</p>
 *       <p>RAM: {hardware.ram} GB</p>
 *       <p>Cores: {hardware.cores}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useHardwareCapabilities(): HardwareCapabilities | null {
  const manager = useFeatureFlagsManager();
  const [hardware, setHardware] = useState<HardwareCapabilities | null>(null);

  useEffect(() => {
    if (!manager) return;

    try {
      setHardware(manager.getHardwareCapabilities());
    } catch (e) {
      // Not initialized yet
    }

    const listener: FlagEventListener = (event: FlagEvent) => {
      if (event.type === 'hardware_detected') {
        setHardware(manager.getHardwareCapabilities());
      }
    };

    manager.addEventListener('hardware_detected', listener);

    return () => {
      manager.removeEventListener('hardware_detected', listener);
    };
  }, [manager]);

  return hardware;
}

/**
 * Control a feature flag (enable/disable)
 *
 * @returns Object with control functions
 * @example
 * ```tsx
 * function FeatureToggle({ featureId }: { featureId: string }) {
 *   const { enabled, enable, disable, reset } = useFeatureFlagControl(featureId);
 *
 *   return (
 *     <div>
 *       <span>Status: {enabled ? 'On' : 'Off'}</span>
 *       <button onClick={enable}>Enable</button>
 *       <button onClick={disable}>Disable</button>
 *       <button onClick={reset}>Reset</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFeatureFlagControl(featureId: string) {
  const manager = useFeatureFlagsManager();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!manager) return;

    setEnabled(manager.isEnabled(featureId));

    const listener: FlagEventListener = () => {
      setEnabled(manager.isEnabled(featureId));
    };

    manager.addEventListener('*', listener);

    return () => {
      manager.removeEventListener('*', listener);
    };
  }, [manager, featureId]);

  const enable = useCallback(() => {
    manager.enable(featureId);
  }, [manager, featureId]);

  const disable = useCallback(() => {
    manager.disable(featureId);
  }, [manager, featureId]);

  const reset = useCallback(() => {
    manager.reset(featureId);
  }, [manager, featureId]);

  return {
    enabled,
    enable,
    disable,
    reset,
  };
}

/**
 * Get and update user preferences
 *
 * @returns User preferences and update function
 * @example
 * ```tsx
 * function PreferencesPanel() {
 *   const { preferences, updatePreferences } = useFeatureFlagPreferences();
 *
 *   return (
 *     <div>
 *       <label>
 *         <input
 *           type="checkbox"
 *           checked={preferences.optInExperimental}
 *           onChange={(e) => updatePreferences({
 *             optInExperimental: e.target.checked
 *           })}
 *         />
 *         Opt in to experimental features
 *       </label>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFeatureFlagPreferences() {
  const manager = useFeatureFlagsManager();
  const [preferences, setPreferences] = useState<UserPreferences>({
    enabledFeatures: new Set(),
    disabledFeatures: new Set(),
    testBucket: 'control',
    optInExperimental: false,
  });

  useEffect(() => {
    if (!manager) return;

    setPreferences(manager.getUserPreferences());

    const listener: FlagEventListener = (event: FlagEvent) => {
      if (event.type === 'preferences_changed') {
        setPreferences(manager.getUserPreferences());
      }
    };

    manager.addEventListener('preferences_changed', listener);

    return () => {
      manager.removeEventListener('preferences_changed', listener);
    };
  }, [manager]);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    manager.updateUserPreferences(updates);
  }, [manager]);

  return {
    preferences,
    updatePreferences,
  };
}

/**
 * Listen to feature flag events
 *
 * @param eventType - The event type to listen to
 * @param listener - The event listener callback
 * @example
 * ```tsx
 * function EventLogger() {
 *   useFeatureFlagListener('feature_enabled', (event) => {
 *     console.log('Feature enabled:', event.featureId);
 *   });
 *
 *   return null;
 * }
 * ```
 */
export function useFeatureFlagListener(
  eventType: string,
  listener: FlagEventListener
): void {
  const manager = useFeatureFlagsManager();

  useEffect(() => {
    if (!manager) return;

    manager.addEventListener(eventType as any, listener);

    return () => {
      manager.removeEventListener(eventType as any, listener);
    };
  }, [manager, eventType, listener]);
}

/**
 * Feature gating component
 *
 * Conditionally renders children based on feature flag state.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <FeatureGate featureId="ai.local_models" fallback={<BasicChat />}>
 *       <LocalModelRunner />
 *     </FeatureGate>
 *   );
 * }
 * ```
 */
interface FeatureGateProps {
  children: ReactNode;
  featureId: string;
  fallback?: ReactNode;
  loading?: ReactNode;
}

export function FeatureGate({ children, featureId, fallback = null, loading = null }: FeatureGateProps) {
  const context = useContext(FeatureFlagsContext);
  const enabled = useFeatureFlag(featureId);

  // Show loading while initializing
  if (!context.initialized) {
    return <>{loading}</>;
  }

  return <>{enabled ? children : fallback}</>;
}

/**
 * Higher-order component for feature gating
 *
 * @example
 * ```tsx
 * const LocalModelRunner = withFeatureFlag(
 *   'ai.local_models',
 *   MyComponent,
 *   FallbackComponent
 * );
 * ```
 */
export function withFeatureFlag<P extends object>(
  featureId: string,
  Component: React.ComponentType<P>,
  Fallback?: React.ComponentType<P>
) {
  return function FeatureFlagWrapper(props: P) {
    const enabled = useFeatureFlag(featureId);

    if (!enabled && Fallback) {
      return <Fallback {...props} />;
    }

    if (!enabled) {
      return null;
    }

    return <Component {...props} />;
  };
}

/**
 * Debug panel for feature flags (development only)
 *
 * @example
 * ```tsx
 * {process.env.NODE_ENV === 'development' && <FeatureFlagsDebugPanel />}
 * ```
 */
export function FeatureFlagsDebugPanel() {
  const enabled = useEnabledFeatures();
  const disabled = useDisabledFeatures();
  const hardware = useHardwareCapabilities();
  const { preferences } = useFeatureFlagPreferences();

  if (typeof window === 'undefined') {
    return null;
  }

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 10,
      right: 10,
      background: 'rgba(0, 0, 0, 0.9)',
      color: '#fff',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      maxHeight: '400px',
      overflow: 'auto',
      zIndex: 9999,
      fontFamily: 'monospace',
    }}>
      <h3 style={{ margin: '0 0 10px 0' }}>Feature Flags Debug</h3>

      <div style={{ marginBottom: '10px' }}>
        <strong>Hardware:</strong> {hardware?.score}/100 ({hardware?.profile})
        <br />
        <strong>RAM:</strong> {hardware?.ram} GB
        <br />
        <strong>Cores:</strong> {hardware?.cores}
        <br />
        <strong>GPU:</strong> {hardware?.hasGPU ? 'Yes' : 'No'}
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Enabled ({enabled.length}):</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          {enabled.slice(0, 10).map(id => (
            <li key={id}>{id}</li>
          ))}
          {enabled.length > 10 && <li>... and {enabled.length - 10} more</li>}
        </ul>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Disabled ({disabled.length}):</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          {disabled.slice(0, 10).map(id => (
            <li key={id}>{id}</li>
          ))}
          {disabled.length > 10 && <li>... and {disabled.length - 10} more</li>}
        </ul>
      </div>

      <div>
        <strong>Experimental:</strong> {preferences.optInExperimental ? 'Opted In' : 'Opted Out'}
      </div>
    </div>
  );
}
