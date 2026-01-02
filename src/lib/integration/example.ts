/**
 * Integration Layer Usage Examples
 *
 * This file demonstrates how to use the Integration Layer
 * in various scenarios.
 */

import {
  getIntegrationManager,
  initializeIntegration,
  getIntegrationState,
  getCapabilities,
  isFeatureEnabled,
  getEnabledFeatures,
  runDiagnostics,
  type IntegrationEvent,
} from './index';

// ============================================================================
// EXAMPLE 1: Basic Usage
// ============================================================================

export async function basicExample() {
  console.log('=== Example 1: Basic Usage ===\n');

  // Get manager instance (auto-initializes by default)
  const manager = getIntegrationManager({ debug: true });

  // Wait for initialization
  await manager.initialize();

  // Get state
  const state = manager.getState();
  console.log('System Stage:', state.stage);
  console.log('Initialization Time:', state.completedAt! - state.startedAt, 'ms');

  // Get capabilities
  const capabilities = manager.getCapabilities();
  console.log('Performance Class:', capabilities.performanceClass);
  console.log('System Score:', capabilities.systemScore);
  console.log('Using WASM:', capabilities.usingWasm);
}

// ============================================================================
// EXAMPLE 2: Manual Initialization
// ============================================================================

export async function manualInitExample() {
  console.log('=== Example 2: Manual Initialization ===\n');

  // Create manager without auto-initialization
  const manager = getIntegrationManager({ autoInitialize: false });

  // Listen to events
  manager.on('initialization_progress', (event: IntegrationEvent) => {
    const progress = event.data as any;
    console.log(`Progress: ${progress.progress.percentage.toFixed(1)}% - ${progress.progress.current}`);
  });

  manager.on('initialization_complete', (event: IntegrationEvent) => {
    console.log('Initialization complete!');
  });

  // Manually initialize
  await manager.initialize();
}

// ============================================================================
// EXAMPLE 3: Feature Flags
// ============================================================================

export async function featureFlagsExample() {
  console.log('=== Example 3: Feature Flags ===\n');

  // Initialize first
  await initializeIntegration({ debug: false });

  // Check specific feature
  if (isFeatureEnabled('ai-chat')) {
    console.log('✓ AI Chat is enabled');
  } else {
    console.log('✗ AI Chat is disabled');
  }

  // Get all enabled features
  const enabled = getEnabledFeatures();
  console.log('Enabled features:', enabled);

  // Get capabilities for feature flag context
  const capabilities = getCapabilities();
  console.log('Feature flags enabled:', capabilities.featureFlags.enabled.length);
  console.log('Feature flags disabled:', capabilities.featureFlags.disabled.length);
}

// ============================================================================
// EXAMPLE 4: Progressive Enhancement
// ============================================================================

export async function progressiveEnhancementExample() {
  console.log('=== Example 4: Progressive Enhancement ===\n');

  const manager = getIntegrationManager({ autoInitialize: false });

  // Start initialization (non-blocking)
  manager.initialize().then(result => {
    if (result.success) {
      const { capabilities } = result;

      console.log('Enhancing UI based on capabilities...');

      // Enable features based on performance class
      switch (capabilities.performanceClass) {
        case 'premium':
          console.log('✓ Premium: Enabling all features');
          break;
        case 'high':
          console.log('✓ High: Enabling most features');
          break;
        case 'medium':
          console.log('✓ Medium: Enabling standard features');
          break;
        case 'low':
          console.log('✓ Low: Enabling basic features only');
          break;
      }

      // Use WASM if available
      if (capabilities.usingWasm) {
        console.log('✓ WASM: Using accelerated vector operations');
      } else {
        console.log('⚠ WASM: Using JavaScript fallback');
      }
    }
  });

  // Show basic UI immediately
  console.log('Showing basic UI...');
  console.log('Enhancement will happen in background');
}

// ============================================================================
// EXAMPLE 5: Diagnostics
// ============================================================================

export async function diagnosticsExample() {
  console.log('=== Example 5: Diagnostics ===\n');

  await initializeIntegration({ debug: false });

  // Run diagnostics
  const diagnostics = await runDiagnostics();

  console.log('Overall Health:', diagnostics.health);
  console.log('Duration:', diagnostics.duration.toFixed(2), 'ms');
  console.log();

  // Show system-specific results
  for (const [systemName, systemDiag] of Object.entries(diagnostics.systems)) {
    console.log(`${systemName}:`);
    console.log(`  Health: ${systemDiag.health}`);
    console.log(`  Message: ${systemDiag.message}`);

    for (const check of systemDiag.checks) {
      const status = check.passed ? '✓' : '✗';
      console.log(`  ${status} ${check.name} (${check.duration.toFixed(2)}ms)`);
    }
    console.log();
  }

  // Show recommendations
  if (diagnostics.recommendations.length > 0) {
    console.log('Recommendations:');
    for (const rec of diagnostics.recommendations) {
      console.log(`  [${rec.priority.toUpperCase()}] ${rec.recommendation}`);
      if (rec.action) {
        console.log(`    Action: ${rec.action}`);
      }
    }
  }
}

// ============================================================================
// EXAMPLE 6: Error Handling
// ============================================================================

export async function errorHandlingExample() {
  console.log('=== Example 6: Error Handling ===\n');

  try {
    const result = await initializeIntegration({
      debug: true,
      initializationTimeout: 5000,
    });

    if (!result.success) {
      console.error('Initialization failed!');
      console.error('Error:', result.error);

      // Check which systems failed
      const failedSystems: string[] = [];
      for (const [name, status] of Object.entries(result.state.systems)) {
        if (status.stage === 'failed') {
          failedSystems.push(name);
          console.error(`  - ${name}: ${status.error}`);
        }
      }

      // Graceful degradation
      if (failedSystems.includes('hardware')) {
        console.warn('⚠ Using default hardware profile');
      }

      if (failedSystems.includes('native')) {
        console.warn('⚠ Using JavaScript fallback (WASM unavailable)');
      }

      if (failedSystems.includes('flags')) {
        console.warn('⚠ Features unavailable, using defaults');
      }
    } else {
      console.log('✓ All systems initialized successfully');
    }
  } catch (error) {
    console.error('Critical error:', error);
  }
}

// ============================================================================
// EXAMPLE 7: React Hook
// ============================================================================

/**
 * Example React hook for using the integration layer
 *
 * ```tsx
 * import { useIntegration } from '@/lib/integration'
 *
 * function MyComponent() {
 *   const { state, capabilities, initialized } = useIntegration()
 *
 *   if (!initialized) {
 *     return <div>Loading...</div>
 *   }
 *
 *   return (
 *     <div>
 *       <p>Performance: {capabilities.performanceClass}</p>
 *       <p>Score: {capabilities.systemScore}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function useIntegration() {
  // This would be implemented in a separate hooks file
  // For now, it's just a placeholder to show the pattern
  const manager = getIntegrationManager();

  return {
    state: manager.getState(),
    capabilities: manager.getCapabilities(),
    initialized: manager.getState().stage === 'ready',
  };
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

export async function runAllExamples() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║          Integration Layer Usage Examples                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    await basicExample();
    console.log('\n');

    await manualInitExample();
    console.log('\n');

    await featureFlagsExample();
    console.log('\n');

    await progressiveEnhancementExample();
    console.log('\n');

    await diagnosticsExample();
    console.log('\n');

    await errorHandlingExample();
    console.log('\n');

    console.log('✓ All examples completed successfully!');
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Uncomment to run examples when executing this file directly
// runAllExamples();
