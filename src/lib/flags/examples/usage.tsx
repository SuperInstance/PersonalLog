/**
 * Feature Flags System - Usage Examples
 *
 * This file contains comprehensive examples of how to use
 * the feature flag system in various scenarios.
 */

import React, { useState, useEffect } from 'react';
import {
  FeatureFlagsProvider,
  useFeatureFlag,
  useFeatureFlagResult,
  useFeatureFlags,
  useEnabledFeatures,
  useHardwareCapabilities,
  useFeatureFlagControl,
  FeatureGate,
  withFeatureFlag,
} from '../index';

// ============================================================================
// Example 1: Basic Feature Check
// ============================================================================

function StreamingChat() {
  return <div>Streaming chat interface...</div>;
}

function BasicChat() {
  return <div>Basic chat interface...</div>;
}

function ChatInterface() {
  // Simple boolean check
  const hasStreaming = useFeatureFlag('ai.streaming_responses');

  if (hasStreaming) {
    return <StreamingChat />;
  }

  return <BasicChat />;
}

// ============================================================================
// Example 2: Detailed Evaluation with User Feedback
// ============================================================================

function FeatureNotAvailable({ reason, missingDependencies }: {
  reason: string;
  missingDependencies: string[];
}) {
  return (
    <div className="alert alert-warning">
      <h3>Feature Not Available</h3>
      <p>{reason}</p>
      {missingDependencies.length > 0 && (
        <p>
          Requires: {missingDependencies.join(', ')}
        </p>
      )}
    </div>
  );
}

function LocalModelRunner() {
  return <div>Running local models...</div>;
}

function LocalModelFeature() {
  // Get detailed evaluation result
  const result = useFeatureFlagResult('ai.local_models');

  if (!result?.enabled) {
    return (
      <FeatureNotAvailable
        reason={!result ? 'Feature not available' : (result.reason || 'Unknown reason')}
        missingDependencies={!result ? [] : (result.missingDependencies || [])}
      />
    );
  }

  return <LocalModelRunner />;
}

// ============================================================================
// Example 3: Multiple Features Check
// ============================================================================

function MediaToolbar() {
  // Check multiple features at once
  const flags = useFeatureFlags([
    'media.audio_recording',
    'media.video_support',
    'media.file_uploads',
    'media.image_processing',
  ]);

  return (
    <div className="toolbar">
      <h3>Media Tools</h3>
      {flags.get('media.audio_recording') && (
        <button>Record Audio</button>
      )}
      {flags.get('media.video_support') && (
        <button>Record Video</button>
      )}
      {flags.get('media.file_uploads') && (
        <button>Upload File</button>
      )}
      {flags.get('media.image_processing') && (
        <button>Process Image</button>
      )}
    </div>
  );
}

// ============================================================================
// Example 4: Feature Gate Component
// ============================================================================

function VectorSearchInterface() {
  return <div>Vector search powered by AI...</div>;
}

function BasicSearchInterface() {
  return <div>Basic text search...</div>;
}

function SearchInterface() {
  return (
    <FeatureGate
      featureId="knowledge.vector_search"
      fallback={<BasicSearchInterface />}
    >
      <VectorSearchInterface />
    </FeatureGate>
  );
}

// ============================================================================
// Example 5: User-Controlled Feature Toggle
// ============================================================================

function FeatureToggle({ featureId, label }: { featureId: string; label: string }) {
  const { enabled, enable, disable } = useFeatureFlagControl(featureId);

  return (
    <div className="feature-toggle">
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => e.target.checked ? enable() : disable()}
        />
        {label}
      </label>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="settings">
      <h2>Feature Settings</h2>
      <FeatureToggle featureId="ui.animations" label="UI Animations" />
      <FeatureToggle featureId="knowledge.auto_sync" label="Auto-Sync Knowledge" />
      <FeatureToggle featureId="ai.parallel_processing" label="Parallel Processing" />
    </div>
  );
}

// ============================================================================
// Example 6: Hardware-Aware Features
// ============================================================================

function HardwareInfo() {
  const hardware = useHardwareCapabilities();

  if (!hardware) {
    return <div>Detecting hardware...</div>;
  }

  return (
    <div className="hardware-info">
      <h3>System Information</h3>
      <dl>
        <dt>Hardware Score</dt>
        <dd>{hardware.score}/100 ({hardware.profile})</dd>

        <dt>Memory</dt>
        <dd>{hardware.ram} GB</dd>

        <dt>CPU Cores</dt>
        <dd>{hardware.cores}</dd>

        <dt>GPU</dt>
        <dd>{hardware.hasGPU ? 'Yes' : 'No'}</dd>

        <dt>Network</dt>
        <dd>{hardware.networkSpeed} Mbps</dd>

        <dt>Device Type</dt>
        <dd>{hardware.deviceType}</dd>
      </dl>
    </div>
  );
}

// ============================================================================
// Example 7: Conditional Styling Based on Hardware
// ============================================================================

function AdaptiveComponent() {
  const hardware = useHardwareCapabilities();
  const hasAnimations = useFeatureFlag('ui.animations');

  const style = {
    transition: hasAnimations ? 'all 0.3s ease' : 'none',
    // Reduce complexity on lower-end devices
    fontSize: hardware && hardware.score < 40 ? '14px' : '16px',
  };

  return (
    <div style={style}>
      This component adapts to your hardware capabilities
    </div>
  );
}

// ============================================================================
// Example 8: Batch Feature Display
// ============================================================================

function FeaturesList() {
  const enabledFeatures = useEnabledFeatures();

  return (
    <div className="features-list">
      <h3>Enabled Features ({enabledFeatures.length})</h3>
      <ul>
        {enabledFeatures.map(featureId => (
          <li key={featureId}>{featureId}</li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Example 9: Higher-Order Component Usage
// ============================================================================

class MyComponent extends React.Component {
  render() {
    return <div>My component with local models</div>;
  }
}

class FallbackComponent extends React.Component {
  render() {
    return <div>Fallback: Local models not available</div>;
  }
}

// Wrap with feature flag
const LocalModelComponent = withFeatureFlag(
  'ai.local_models',
  MyComponent,
  FallbackComponent
);

// ============================================================================
// Example 10: App Initialization
// ============================================================================

function App() {
  return (
    <FeatureFlagsProvider config={{
      debug: process.env.NODE_ENV === 'development',
      persistPreferences: true,
      trackMetrics: true,
      autoPerformanceGate: true,
    }}>
      <ChatInterface />
      <SearchInterface />
      <MediaToolbar />
      <HardwareInfo />
      <SettingsPanel />
      <FeaturesList />

      {/* Debug panel only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-panel">
          {/* FeatureFlagsDebugPanel would go here */}
          <div>Feature Flags Debug Panel (Development Only)</div>
        </div>
      )}
    </FeatureFlagsProvider>
  );
}

// ============================================================================
// Example 11: Performance-Aware Feature Loading
// ============================================================================

function HeavyComputation() {
  return <div>Running heavy computation...</div>;
}

function OptimizedComputation() {
  return <div>Running optimized computation...</div>;
}

function AdaptiveComputation() {
  const hardware = useHardwareCapabilities();
  const useHeavy = useFeatureFlag('ai.parallel_processing');

  // Only use heavy computation if hardware supports it
  if (!hardware || hardware.score < 50) {
    return <OptimizedComputation />;
  }

  if (useHeavy) {
    return <HeavyComputation />;
  }

  return <OptimizedComputation />;
}

// ============================================================================
// Example 12: Progressive Enhancement
// ============================================================================

function BaseExperience() {
  return <div>Basic experience that works everywhere</div>;
}

function EnhancedExperience() {
  return <div>Enhanced experience with all the bells and whistles</div>;
}

function ProgressiveApp() {
  const hasEnhancements = useFeatureFlags([
    'ui.animations',
    'ui.themes',
    'ui.syntax_highlighting',
    'knowledge.vector_search',
  ]);

  const allEnabled = Array.from(hasEnhancements.values()).every(v => v);

  if (allEnabled) {
    return <EnhancedExperience />;
  }

  return <BaseExperience />;
}

// ============================================================================
// Example 13: Feature Dependencies Explanation
// ============================================================================

function FeatureWithDependencies() {
  const result = useFeatureFlagResult('ai.multibot');

  if (!result?.enabled && result?.missingDependencies && result.missingDependencies.length > 0) {
    return (
      <div className="dependency-warning">
        <h3>Multi-Bot Conversations</h3>
        <p>This feature requires:</p>
        <ul>
          {result.missingDependencies.map(dep => (
            <li key={dep}>{dep}</li>
          ))}
        </ul>
        <p>Please enable these features first.</p>
      </div>
    );
  }

  if (result?.enabled) {
    return <div>Multi-Bot Conversations Active</div>;
  }

  return <div>Feature not available</div>;
}

// ============================================================================
// Example 14: Event Listening (Advanced)
// ============================================================================

import { useFeatureFlagsManager, type FlagEvent } from '../index';

function FeatureChangeLogger() {
  const manager = useFeatureFlagsManager();

  useEffect(() => {
    const handleFeatureEnabled = (event: FlagEvent) => {
      console.log('Feature enabled:', event.featureId);
      // Track analytics
      // Send to monitoring
      // Update UI
    };

    const handleFeatureDisabled = (event: FlagEvent) => {
      console.log('Feature disabled:', event.featureId);
    };

    const handlePerformanceDegraded = (event: FlagEvent) => {
      console.warn('Performance degraded:', event.data);
      // Consider disabling features
      // Show user warning
    };

    manager.addEventListener('feature_enabled', handleFeatureEnabled);
    manager.addEventListener('feature_disabled', handleFeatureDisabled);
    manager.addEventListener('performance_degraded', handlePerformanceDegraded);

    return () => {
      manager.removeEventListener('feature_enabled', handleFeatureEnabled);
      manager.removeEventListener('feature_disabled', handleFeatureDisabled);
      manager.removeEventListener('performance_degraded', handlePerformanceDegraded);
    };
  }, [manager]);

  return null; // This component doesn't render anything
}

// ============================================================================
// Example 15: Server-Side Rendering Considerations
// ============================================================================

import { useRouter } from 'next/router';

function SSRSafeFeature() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const hasFeature = useFeatureFlag('ui.animations');

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Only check feature flags on client side
  if (!isClient || !router.isReady) {
    return <div>Loading...</div>;
  }

  return hasFeature ? <AnimatedUI /> : <StaticUI />;
}

// Helper components for the example above
function AnimatedUI() {
  return <div>Animated UI</div>;
}

function StaticUI() {
  return <div>Static UI</div>;
}

// ============================================================================
// Example 16: Testing with Feature Flags
// ============================================================================

// In your test file - this is example code, not executed in this file
// To properly type this, these would be in a separate .test.tsx file

/*
import { renderHook, act } from '@testing-library/react';
import { useFeatureFlag, initializeFeatureFlags } from '../index';
import { getGlobalManager } from '../manager';

describe('Feature Flags', () => {
  beforeEach(async () => {
    // Initialize with test config
    await initializeFeatureFlags({
      debug: true,
      persistPreferences: false,
      trackMetrics: false,
    });
  });

  test('should check feature flag', () => {
    const { result } = renderHook(() => useFeatureFlag('ui.animations'));

    expect(result.current).toBe(true);
  });

  test('should react to feature changes', async () => {
    const { result } = renderHook(() => useFeatureFlag('ui.animations'));

    expect(result.current).toBe(true);

    // Disable feature
    const manager = getGlobalManager();
    await act(async () => {
      manager.disable('ui.animations');
    });

    expect(result.current).toBe(false);
  });
});
*/

// ============================================================================
// Example 17: Migrating from Hardcoded Checks
// ============================================================================

// BEFORE (hardcoded):
// function ChatInterface() {
//   const [hasStreaming, setHasStreaming] = useState(
//     navigator.hardwareConcurrency >= 4
//   );
//   ...
// }

// AFTER (with feature flags):
function ChatInterfaceMigrated() {
  const hasStreaming = useFeatureFlag('ai.streaming_responses');

  // Feature flag handles hardware detection internally
  return hasStreaming ? <StreamingChat /> : <BasicChat />;
}

// ============================================================================
// Example 18: Feature Rollout Strategy
// ============================================================================

function NewFeature() {
  const result = useFeatureFlagResult('experimental.new_feature');

  // Track usage
  useEffect(() => {
    if (result?.enabled && typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('new_feature_viewed', {
        variant: result.variant,
      });
    }
  }, [result]);

  if (!result?.enabled) {
    return null; // Silent rollout - users don't know it exists
  }

  return <div>New feature is available!</div>;
}
