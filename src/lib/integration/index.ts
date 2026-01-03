/**
 * Integration Layer - Public API
 *
 * Provides a unified entry point for all hardware-aware systems.
 * Manages initialization, state, and provides observable capabilities.
 *
 * @example
 * ```typescript
 * import { getIntegrationManager } from '@/lib/integration'
 *
 * // Get the manager instance (auto-initializes by default)
 * const manager = _getIntegrationManager()
 *
 * // Wait for initialization
 * await manager.initialize()
 *
 * // Get current state
 * const state = manager.getState()
 * console.log('Status:', state.stage)
 *
 * // Get capabilities
 * const capabilities = manager.getCapabilities()
 * console.log('Performance Class:', capabilities.performanceClass)
 *
 * // Check feature flags
 * if (manager.isFeatureEnabled('ai-chat')) {
 *   // Enable AI chat feature
 * }
 *
 * // Run diagnostics
 * const diagnostics = await manager.runDiagnostics()
 * console.log('Health:', diagnostics.health)
 *
 * // Listen to events
 * manager.on('initialization_complete', (event) => {
 *   console.log('Initialized!', event.data)
 * })
 * ```
 */

// ============================================================================
// MAIN EXPORTS
// ============================================================================

export { IntegrationManager, getIntegrationManager, resetIntegrationManager } from './manager';

// Import getIntegrationManager for use in convenience functions below
import { getIntegrationManager as _getIntegrationManager } from './manager';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  // State
  IntegrationState,
  SystemStatus,
  InitializationStage,
  InitializationProgress,
  // Capabilities
  Capabilities,
  // Diagnostics
  DiagnosticResults,
  SystemDiagnostic,
  Recommendation,
  // Events
  IntegrationEvent,
  IntegrationEventType,
  InitializationProgressEvent,
  SystemStatusChangedEvent,
  CapabilitiesUpdatedEvent,
  ErrorEvent,
  IntegrationEventListener,
  // Configuration
  IntegrationConfig,
  // Results
  InitializationResult,
} from './types';

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Quick initialization function
 *
 * @example
 * ```typescript
 * import { initializeIntegration } from '@/lib/integration'
 *
 * const { success, capabilities } = await initializeIntegration({
 *   debug: true,
 *   runBenchmarks: false,
 * })
 *
 * if (success) {
 *   console.log('System ready!', capabilities.performanceClass)
 * }
 * ```
 */
export async function initializeIntegration(
  config?: import('./types').IntegrationConfig
): Promise<import('./types').InitializationResult> {
  const manager = _getIntegrationManager({ ...config, autoInitialize: false });
  return manager.initialize();
}

/**
 * Get current integration state (convenience function)
 *
 * @example
 * ```typescript
 * import { getIntegrationState } from '@/lib/integration'
 *
 * const state = getIntegrationState()
 * console.log('Stage:', state.stage)
 * ```
 */
export function getIntegrationState(): import('./types').IntegrationState {
  return _getIntegrationManager().getState();
}

/**
 * Get current capabilities (convenience function)
 *
 * @example
 * ```typescript
 * import { getCapabilities } from '@/lib/integration'
 *
 * const capabilities = getCapabilities()
 * console.log('Performance Score:', capabilities.systemScore)
 * ```
 */
export function getCapabilities(): import('./types').Capabilities {
  return _getIntegrationManager().getCapabilities();
}

/**
 * Check if a feature is enabled (convenience function)
 *
 * @example
 * ```typescript
 * import { isFeatureEnabled } from '@/lib/integration'
 *
 * if (isFeatureEnabled('ai-chat')) {
 *   // Show AI chat feature
 * }
 * ```
 */
export function isFeatureEnabled(featureId: string): boolean {
  return _getIntegrationManager().isFeatureEnabled(featureId);
}

/**
 * Get list of enabled features (convenience function)
 *
 * @example
 * ```typescript
 * import { getEnabledFeatures } from '@/lib/integration'
 *
 * const features = getEnabledFeatures()
 * console.log('Enabled features:', features)
 * ```
 */
export function getEnabledFeatures(): string[] {
  return _getIntegrationManager().getEnabledFeatures();
}

/**
 * Run diagnostics (convenience function)
 *
 * @example
 * ```typescript
 * import { runDiagnostics } from '@/lib/integration'
 *
 * const diagnostics = await runDiagnostics()
 * console.log('Health:', diagnostics.health)
 * diagnostics.recommendations.forEach(rec => {
 *   console.log(`- ${rec.recommendation}`)
 * })
 * ```
 */
export async function runDiagnostics(): Promise<import('./types').DiagnosticResults> {
  return _getIntegrationManager().runDiagnostics();
}
