/**
 * Agent Feature Checker
 *
 * Centralized utility for checking agent feature requirements.
 * Combines hardware detection with feature flag validation to provide
 * clear feedback about agent availability.
 */

import type { HardwareProfile } from '@/lib/hardware/types';
import type { EvaluationResult } from '@/lib/flags/types';
import { initializeFeatureFlags } from '@/lib/flags';

/**
 * Feature check result
 */
export interface FeatureCheckResult {
  /** Whether the feature is available */
  available: boolean;
  /** Feature ID */
  featureId: string;
  /** Feature name */
  featureName: string;
  /** Why the feature is unavailable (if not available) */
  reason?: string;
  /** Whether user can enable the feature */
  userOverridable: boolean;
  /** Hardware score */
  hardwareScore: number;
  /** Missing hardware requirements */
  missingHardware: string[];
  /** Whether this is an experimental feature */
  experimental: boolean;
  /** Suggestion for enabling the feature */
  suggestion?: string;
}

/**
 * Comprehensive agent feature check
 */
export interface AgentFeatureCheck {
  /** Whether agent can run */
  canRun: boolean;
  /** Feature flag checks */
  features: FeatureCheckResult[];
  /** Overall missing requirements */
  missingRequirements: {
    /** Missing feature flags */
    flags: string[];
    /** Missing hardware */
    hardware: string[];
  };
  /** Suggestions for enabling agent */
  suggestions: string[];
}

/**
 * Cache for feature flag manager
 */
let flagManager: Awaited<ReturnType<typeof initializeFeatureFlags>> | null = null;

/**
 * Get or initialize feature flag manager
 */
async function getFlagManager() {
  if (!flagManager) {
    flagManager = await initializeFeatureFlags();
  }
  return flagManager;
}

/**
 * Check a single feature flag
 *
 * @param featureId - Feature flag ID to check
 * @returns Feature check result
 */
export async function checkFeature(featureId: string): Promise<FeatureCheckResult> {
  const manager = await getFlagManager();
  const registry = manager['registry']; // Access registry
  const feature = registry.getFeature(featureId);

  if (!feature) {
    return {
      available: false,
      featureId,
      featureName: featureId,
      reason: 'Feature flag not found in registry',
      userOverridable: false,
      hardwareScore: 0,
      missingHardware: [],
      experimental: false,
      suggestion: 'Contact support about this feature',
    };
  }

  // Get evaluation result
  let evaluation: EvaluationResult;
  try {
    evaluation = manager.evaluate(featureId);
  } catch (error) {
    // Manager not initialized or other error
    return {
      available: false,
      featureId,
      featureName: feature.name,
      reason: 'Feature flag system not initialized',
      userOverridable: feature.userOverridable,
      hardwareScore: 0,
      missingHardware: [],
      experimental: feature.experimental,
      suggestion: 'Refresh the page and try again',
    };
  }

  // Parse reason for missing hardware
  const missingHardware: string[] = [];
  if (!evaluation.enabled) {
    if (evaluation.reason?.includes('RAM')) {
      missingHardware.push('RAM');
    }
    if (evaluation.reason?.includes('cores') || evaluation.reason?.includes('CPU')) {
      missingHardware.push('CPU cores');
    }
    if (evaluation.reason?.includes('GPU')) {
      missingHardware.push('GPU');
    }
    if (evaluation.reason?.includes('Network') || evaluation.reason?.includes('network')) {
      missingHardware.push('Network speed');
    }
    if (evaluation.reason?.includes('score')) {
      missingHardware.push('Hardware score');
    }
  }

  // Generate suggestion
  const suggestion = generateSuggestion(feature, evaluation, missingHardware);

  return {
    available: evaluation.enabled,
    featureId,
    featureName: feature.name,
    reason: evaluation.enabled ? undefined : evaluation.reason,
    userOverridable: feature.userOverridable,
    hardwareScore: evaluation.hardwareScore || 0,
    missingHardware,
    experimental: feature.experimental,
    suggestion: evaluation.enabled ? undefined : suggestion,
  };
}

/**
 * Check all required features for an agent
 *
 * @param requiredFlags - Array of required feature flag IDs
 * @returns Agent feature check result
 */
export async function checkAgentFeatures(requiredFlags: string[]): Promise<AgentFeatureCheck> {
  const features: FeatureCheckResult[] = [];
  const missingFlags: string[] = [];
  const missingHardware: string[] = [];
  const suggestions: string[] = [];

  // Check each feature
  for (const flagId of requiredFlags) {
    const result = await checkFeature(flagId);
    features.push(result);

    if (!result.available) {
      missingFlags.push(flagId);
      missingHardware.push(...result.missingHardware);

      if (result.suggestion) {
        suggestions.push(result.suggestion);
      }
    }
  }

  // Deduplicate suggestions
  const uniqueSuggestions = Array.from(new Set(suggestions));

  return {
    canRun: missingFlags.length === 0,
    features,
    missingRequirements: {
      flags: missingFlags,
      hardware: Array.from(new Set(missingHardware)),
    },
    suggestions: uniqueSuggestions,
  };
}

/**
 * Generate helpful suggestion for enabling a feature
 *
 * @param feature - Feature flag definition
 * @param evaluation - Evaluation result
 * @param missingHardware - Missing hardware requirements
 * @returns Suggestion string
 */
function generateSuggestion(
  feature: any,
  evaluation: EvaluationResult,
  missingHardware: string[]
): string {
  // User override case
  if (evaluation.userOverride) {
    if (evaluation.enabled) {
      return 'Feature manually enabled';
    } else {
      return 'Feature manually disabled. Enable in Settings > Features.';
    }
  }

  // Experimental feature case
  if (feature.experimental && evaluation.reason?.includes('Experimental')) {
    return 'This is an experimental feature. Enable "Experimental Features" in Settings > Features to opt in.';
  }

  // Missing dependencies case
  if (evaluation.missingDependencies && evaluation.missingDependencies.length > 0) {
    return `Enable required dependencies: ${evaluation.missingDependencies.join(', ')}`;
  }

  // Hardware cases
  if (missingHardware.length > 0) {
    if (missingHardware.includes('GPU')) {
      if (feature.id.startsWith('jepa.')) {
        return 'JEPA requires a GPU. Consider upgrading to a system with NVIDIA RTX or Apple Silicon.';
      }
      return 'This feature requires a GPU. Consider upgrading to a system with dedicated graphics.';
    }

    if (missingHardware.includes('RAM')) {
      const minRAM = feature.minRAM;
      return `This feature requires at least ${minRAM}GB of RAM. Your system has insufficient memory.`;
    }

    if (missingHardware.includes('CPU cores')) {
      const minCores = feature.minCores;
      return `This feature requires at least ${minCores} CPU cores for optimal performance.`;
    }

    if (missingHardware.includes('Hardware score')) {
      const minScore = feature.minHardwareScore;
      const currentScore = evaluation.hardwareScore;
      return `Your hardware score (${currentScore}) is below the required ${minScore}. Upgrade your hardware for better performance.`;
    }
  }

  // Default suggestion
  if (feature.userOverridable) {
    return `You can enable this feature in Settings > Features if you want to try it anyway.`;
  }

  return 'This feature is not available on your current system configuration.';
}

/**
 * Get all available features (enabled + meets hardware requirements)
 *
 * @returns Array of available feature IDs
 */
export async function getAvailableFeatures(): Promise<string[]> {
  const manager = await getFlagManager();
  return manager.getEnabledFeatures();
}

/**
 * Get all disabled features with reasons
 *
 * @returns Map of feature ID to reason
 */
export async function getDisabledFeatures(): Promise<Map<string, string>> {
  const manager = await getFlagManager();
  const disabledIds = manager.getDisabledFeatures();
  const reasons = new Map<string, string>();

  for (const id of disabledIds) {
    try {
      const evaluation = manager.evaluate(id);
      reasons.set(id, evaluation.reason || 'Unknown reason');
    } catch {
      reasons.set(id, 'Unable to evaluate');
    }
  }

  return reasons;
}

/**
 * Check if JEPA transcription is available
 *
 * @returns Feature check result for JEPA transcription
 */
export async function checkJEPATranscription(): Promise<FeatureCheckResult> {
  return checkFeature('jepa.transcription');
}

/**
 * Check if local AI models are available
 *
 * @returns Feature check result for local AI models
 */
export async function checkLocalAI(): Promise<FeatureCheckResult> {
  return checkFeature('ai.local_models');
}

/**
 * Check if multimodal AI is available
 *
 * @returns Feature check result for multimodal AI
 */
export async function checkMultimodalAI(): Promise<FeatureCheckResult> {
  return checkFeature('ai.multimodal');
}

/**
 * Format feature check result for user display
 *
 * @param result - Feature check result
 * @returns Formatted message
 */
export function formatFeatureCheckResult(result: FeatureCheckResult): string {
  if (result.available) {
    return `${result.featureName}: Available`;
  }

  let message = `${result.featureName}: Not available`;

  if (result.reason) {
    message += `\n  Reason: ${result.reason}`;
  }

  if (result.suggestion) {
    message += `\n  Suggestion: ${result.suggestion}`;
  }

  if (result.missingHardware.length > 0) {
    message += `\n  Missing: ${result.missingHardware.join(', ')}`;
  }

  return message;
}

/**
 * Format agent feature check for user display
 *
 * @param check - Agent feature check result
 * @returns Formatted message
 */
export function formatAgentFeatureCheck(check: AgentFeatureCheck): string {
  if (check.canRun) {
    return 'All required features are available.';
  }

  let message = 'Agent cannot run:';

  if (check.missingRequirements.flags.length > 0) {
    message += `\n  Missing features: ${check.missingRequirements.flags.join(', ')}`;
  }

  if (check.missingRequirements.hardware.length > 0) {
    message += `\n  Missing hardware: ${check.missingRequirements.hardware.join(', ')}`;
  }

  if (check.suggestions.length > 0) {
    message += '\n\nSuggestions:';
    check.suggestions.forEach((suggestion, i) => {
      message += `\n  ${i + 1}. ${suggestion}`;
    });
  }

  return message;
}

/**
 * Reset feature flag manager cache (useful for testing)
 */
export function resetFeatureCheckerCache(): void {
  flagManager = null;
}
