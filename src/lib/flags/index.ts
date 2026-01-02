/**
 * Feature Flags System - Public API
 *
 * Main entry point for the feature flag system.
 * Re-exports all public APIs for convenient importing.
 */

// Types
export type {
  HardwareScore,
  HardwareProfile,
  FeatureState,
  FeatureCategory,
  FeatureFlag,
  HardwareCapabilities,
  UserPreferences,
  EvaluationContext,
  EvaluationResult,
  FeatureMetrics,
  FeatureFlagsConfig,
  FlagEventType,
  FlagEvent,
  FlagEventListener,
  IFeatureFlagRegistry,
  IFeatureFlagManager,
} from './types';

// Registry
export {
  DEFAULT_FEATURES,
  FeatureFlagRegistry,
  getGlobalRegistry,
  resetGlobalRegistry,
} from './registry';

// Manager
export {
  FeatureFlagManager,
  getGlobalManager,
  resetGlobalManager,
  initializeFeatureFlags,
} from './manager';

// Hooks
export {
  // Provider
  FeatureFlagsProvider,
  // Hooks
  useFeatureFlagsManager,
  useFeatureFlag,
  useFeatureFlagResult,
  useFeatureFlags,
  useEnabledFeatures,
  useDisabledFeatures,
  useHardwareCapabilities,
  useFeatureFlagControl,
  useFeatureFlagPreferences,
  useFeatureFlagListener,
  // Components
  FeatureGate,
  withFeatureFlag,
  FeatureFlagsDebugPanel,
} from './hooks';
