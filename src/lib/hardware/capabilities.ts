/**
 * Hardware Capability Evaluation
 *
 * Evaluates hardware capabilities and provides recommendations for
 * optimal feature configuration based on detected hardware.
 */

import type { HardwareProfile, FeatureSupport } from './types';
import type { HardwareTier, JEPACapabilities, HardwareScoreResult } from './scoring';
import { calculateJEPAScore } from './scoring';

/**
 * Feature availability by hardware tier
 */
export interface FeatureAvailability {
  /** Feature ID */
  id: string;
  /** Feature name */
  name: string;
  /** Whether feature is available on this hardware */
  available: boolean;
  /** Reason for unavailability (if not available) */
  reason?: string;
  /** Performance impact (0-100) */
  performanceImpact: number;
  /** Expected performance level */
  expectedPerformance: 'minimal' | 'basic' | 'good' | 'excellent';
}

/**
 * Complete capability assessment
 */
export interface CapabilityAssessment {
  /** Hardware score result */
  score: HardwareScoreResult;
  /** Feature availability matrix */
  features: FeatureAvailability[];
  /** Feature flag recommendations */
  featureFlags: Record<string, boolean>;
  /** Hardware tier description */
  tierDescription: string;
  /** Can use local AI models */
  canUseLocalAI: boolean;
  /** Can use JEPA transcription */
  canUseJEPA: boolean;
  /** Can use real-time transcription */
  canUseRealtimeTranscription: boolean;
  /** Recommended configuration */
  recommendedConfiguration: {
    aiProvider: 'local' | 'api' | 'hybrid';
    transcriptionModel: 'tiny' | 'large' | 'xl' | 'api-only';
    maxBatchSize: number;
    enableCaching: boolean;
    enableOfflineMode: boolean;
  };
}

/**
 * Feature definitions with hardware requirements
 */
const FEATURE_DEFINITIONS: Array<{
  id: string;
  name: string;
  category: string;
  minTier: HardwareTier;
  minScore: number;
  requirements: {
    minRAM?: number;
    minVRAM?: number;
    requiresGPU?: boolean;
    requiresTensorCores?: boolean;
    minCores?: number;
  };
  performanceImpact: number;
}> = [
  // AI Features
  {
    id: 'ai.local_models',
    name: 'Local AI Models',
    category: 'ai',
    minTier: 'mid-range',
    minScore: 30,
    requirements: { minRAM: 8, requiresGPU: true, minCores: 4 },
    performanceImpact: 70,
  },
  {
    id: 'ai.streaming_responses',
    name: 'Streaming AI Responses',
    category: 'ai',
    minTier: 'low-end',
    minScore: 20,
    requirements: {},
    performanceImpact: 10,
  },
  {
    id: 'ai.parallel_processing',
    name: 'Parallel AI Processing',
    category: 'ai',
    minTier: 'high-end',
    minScore: 50,
    requirements: { minRAM: 16, requiresGPU: true, minCores: 8 },
    performanceImpact: 40,
  },
  {
    id: 'ai.voice_input',
    name: 'Voice Input',
    category: 'ai',
    minTier: 'mid-range',
    minScore: 40,
    requirements: { minRAM: 4 },
    performanceImpact: 30,
  },
  {
    id: 'ai.multimodal',
    name: 'Multimodal AI',
    category: 'ai',
    minTier: 'high-end',
    minScore: 60,
    requirements: { minRAM: 16, requiresGPU: true },
    performanceImpact: 80,
  },

  // JEPA Features
  {
    id: 'jepa.transcription',
    name: 'JEPA Transcription',
    category: 'jepa',
    minTier: 'mid-range',
    minScore: 30,
    requirements: { minRAM: 8, requiresGPU: true, minVRAM: 4 },
    performanceImpact: 70,
  },
  {
    id: 'jepa.multimodal',
    name: 'JEPA Multimodal Analysis',
    category: 'jepa',
    minTier: 'high-end',
    minScore: 80,
    requirements: { minRAM: 16, requiresGPU: true, requiresTensorCores: true, minVRAM: 8 },
    performanceImpact: 90,
  },

  // Knowledge Features
  {
    id: 'knowledge.vector_search',
    name: 'Vector Search',
    category: 'knowledge',
    minTier: 'mid-range',
    minScore: 40,
    requirements: { minRAM: 8 },
    performanceImpact: 50,
  },
  {
    id: 'knowledge.hybrid_search',
    name: 'Hybrid Search',
    category: 'knowledge',
    minTier: 'mid-range',
    minScore: 50,
    requirements: { minRAM: 8 },
    performanceImpact: 60,
  },
  {
    id: 'knowledge.embeddings_cache',
    name: 'Embeddings Cache',
    category: 'knowledge',
    minTier: 'low-end',
    minScore: 30,
    requirements: { minRAM: 4 },
    performanceImpact: 20,
  },

  // Media Features
  {
    id: 'media.image_analysis',
    name: 'Image Analysis',
    category: 'media',
    minTier: 'high-end',
    minScore: 50,
    requirements: { minRAM: 8, requiresGPU: true },
    performanceImpact: 60,
  },
  {
    id: 'media.audio_transcription',
    name: 'Audio Transcription',
    category: 'media',
    minTier: 'mid-range',
    minScore: 40,
    requirements: { minRAM: 4 },
    performanceImpact: 50,
  },
  {
    id: 'media.compression',
    name: 'Media Compression',
    category: 'media',
    minTier: 'mid-range',
    minScore: 40,
    requirements: { minRAM: 4 },
    performanceImpact: 40,
  },

  // UI Features
  {
    id: 'ui.virtual_scrolling',
    name: 'Virtual Scrolling',
    category: 'ui',
    minTier: 'low-end',
    minScore: 30,
    requirements: {},
    performanceImpact: 20,
  },
  {
    id: 'ui.animations',
    name: 'UI Animations',
    category: 'ui',
    minTier: 'mid-range',
    minScore: 40,
    requirements: {},
    performanceImpact: 15,
  },

  // Advanced Features
  {
    id: 'advanced.offline_mode',
    name: 'Offline Mode',
    category: 'advanced',
    minTier: 'low-end',
    minScore: 20,
    requirements: {},
    performanceImpact: 0,
  },
  {
    id: 'advanced.background_sync',
    name: 'Background Sync',
    category: 'advanced',
    minTier: 'low-end',
    minScore: 30,
    requirements: {},
    performanceImpact: 20,
  },
  {
    id: 'advanced.encryption',
    name: 'Encryption at Rest',
    category: 'advanced',
    minTier: 'mid-range',
    minScore: 40,
    requirements: { minRAM: 4 },
    performanceImpact: 30,
  },
];

/**
 * Evaluate complete hardware capabilities
 */
export function evaluateCapabilities(profile: HardwareProfile): CapabilityAssessment {
  // Calculate hardware score
  const scoreResult = calculateJEPAScore(profile);

  // Evaluate feature availability
  const features = evaluateFeatureAvailability(profile, scoreResult);

  // Generate feature flag recommendations
  const featureFlags = generateFeatureFlagRecommendations(features, scoreResult);

  // Get tier description
  const tierDescription = getTierDescription(scoreResult.tier);

  // Determine key capabilities
  const canUseLocalAI = scoreResult.score >= 30;
  const canUseJEPA = scoreResult.jepa.tinyJEPA;
  const canUseRealtimeTranscription = scoreResult.jepa.realtimeTranscription;

  // Generate recommended configuration
  const recommendedConfiguration = generateRecommendedConfiguration(scoreResult);

  return {
    score: scoreResult,
    features,
    featureFlags,
    tierDescription,
    canUseLocalAI,
    canUseJEPA,
    canUseRealtimeTranscription,
    recommendedConfiguration,
  };
}

/**
 * Evaluate feature availability based on hardware
 */
function evaluateFeatureAvailability(
  profile: HardwareProfile,
  scoreResult: HardwareScoreResult
): FeatureAvailability[] {
  const { score, tier, jepa } = scoreResult;
  const vramGB = (profile.gpu.vramMB || 0) / 1024;
  const ramGB = profile.memory.totalGB || 0;
  const hasTensorCores = (profile.gpu.renderer?.toLowerCase().includes('rtx') ||
                        profile.gpu.renderer?.toLowerCase().includes('apple m')) ?? false;

  return FEATURE_DEFINITIONS.map(definition => {
    const available = score >= definition.minScore &&
                      tierMet(tier, definition.minTier) &&
                      checkRequirements(definition.requirements, {
                        ramGB,
                        vramGB,
                        hasGPU: profile.gpu.available,
                        hasTensorCores,
                        cores: profile.cpu.cores,
                      });

    const reason = available ? undefined : getUnavailabilityReason(definition, score, tier, ramGB, vramGB);

    // Determine expected performance
    let expectedPerformance: 'minimal' | 'basic' | 'good' | 'excellent' = 'minimal';
    if (score >= 80) expectedPerformance = 'excellent';
    else if (score >= 60) expectedPerformance = 'good';
    else if (score >= 40) expectedPerformance = 'basic';

    return {
      id: definition.id,
      name: definition.name,
      available,
      reason,
      performanceImpact: definition.performanceImpact,
      expectedPerformance,
    };
  });
}

/**
 * Check if tier meets minimum requirement
 */
function tierMet(current: HardwareTier, minimum: HardwareTier): boolean {
  const tierOrder: HardwareTier[] = ['low-end', 'mid-range', 'high-end', 'extreme'];
  const currentIndex = tierOrder.indexOf(current);
  const minimumIndex = tierOrder.indexOf(minimum);
  return currentIndex >= minimumIndex;
}

/**
 * Check if hardware requirements are met
 */
function checkRequirements(
  requirements: {
    minRAM?: number;
    minVRAM?: number;
    requiresGPU?: boolean;
    requiresTensorCores?: boolean;
    minCores?: number;
  },
  hardware: {
    ramGB: number;
    vramGB: number;
    hasGPU: boolean;
    hasTensorCores: boolean;
    cores: number;
  }
): boolean {
  if (requirements.minRAM && hardware.ramGB < requirements.minRAM) {
    return false;
  }

  if (requirements.minVRAM && hardware.vramGB < requirements.minVRAM) {
    return false;
  }

  if (requirements.requiresGPU && !hardware.hasGPU) {
    return false;
  }

  if (requirements.requiresTensorCores && !hardware.hasTensorCores) {
    return false;
  }

  if (requirements.minCores && hardware.cores < requirements.minCores) {
    return false;
  }

  return true;
}

/**
 * Get reason for feature unavailability
 */
function getUnavailabilityReason(
  definition: typeof FEATURE_DEFINITIONS[0],
  score: number,
  tier: HardwareTier,
  ramGB: number,
  vramGB: number
): string {
  if (score < definition.minScore) {
    return `Hardware score too low (${score} < ${definition.minScore})`;
  }

  if (!tierMet(tier, definition.minTier)) {
    return `Hardware tier too low (${tier} < ${definition.minTier})`;
  }

  if (definition.requirements.minRAM && ramGB < definition.requirements.minRAM) {
    return `Insufficient RAM (${ramGB}GB < ${definition.requirements.minRAM}GB)`;
  }

  if (definition.requirements.minVRAM && vramGB < definition.requirements.minVRAM) {
    return `Insufficient VRAM (${vramGB}GB < ${definition.requirements.minVRAM}GB)`;
  }

  if (definition.requirements.requiresGPU) {
    return 'GPU required but not available';
  }

  if (definition.requirements.requiresTensorCores) {
    return 'Tensor cores required (RTX series or Apple Silicon)';
  }

  if (definition.requirements.minCores) {
    return `Insufficient CPU cores (< ${definition.requirements.minCores})`;
  }

  return 'Hardware requirements not met';
}

/**
 * Generate feature flag recommendations
 */
function generateFeatureFlagRecommendations(
  features: FeatureAvailability[],
  scoreResult: HardwareScoreResult
): Record<string, boolean> {
  const flags: Record<string, boolean> = {};

  features.forEach(feature => {
    // Enable feature if available and performance impact is acceptable
    flags[feature.id] = feature.available &&
                       (scoreResult.score >= 50 || feature.performanceImpact < 60);
  });

  return flags;
}

/**
 * Get tier description
 */
function getTierDescription(tier: HardwareTier): string {
  switch (tier) {
    case 'low-end':
      return 'Your system has limited hardware capabilities. Some advanced features will be disabled for optimal performance.';
    case 'mid-range':
      return 'Your system has moderate hardware capabilities. Most features will work well, with some limitations on advanced AI features.';
    case 'high-end':
      return 'Your system has strong hardware capabilities. All features should perform well.';
    case 'extreme':
      return 'Your system has exceptional hardware capabilities. You can use all features at maximum performance.';
  }
}

/**
 * Generate recommended configuration
 */
function generateRecommendedConfiguration(
  scoreResult: HardwareScoreResult
): CapabilityAssessment['recommendedConfiguration'] {
  const { score, jepa } = scoreResult;

  // Determine AI provider
  let aiProvider: 'local' | 'api' | 'hybrid';
  if (score >= 50) {
    aiProvider = 'local';
  } else if (score >= 30) {
    aiProvider = 'hybrid';
  } else {
    aiProvider = 'api';
  }

  // Determine transcription model
  let transcriptionModel: 'tiny' | 'large' | 'xl' | 'api-only';
  if (jepa.xlJEPA) {
    transcriptionModel = 'xl';
  } else if (jepa.largeJEPA) {
    transcriptionModel = 'large';
  } else if (jepa.tinyJEPA) {
    transcriptionModel = 'tiny';
  } else {
    transcriptionModel = 'api-only';
  }

  return {
    aiProvider,
    transcriptionModel,
    maxBatchSize: jepa.recommendedBatchSize,
    enableCaching: score >= 30,
    enableOfflineMode: score >= 20,
  };
}

/**
 * Get features by category
 */
export function getFeaturesByCategory(
  assessment: CapabilityAssessment,
  category: string
): FeatureAvailability[] {
  return assessment.features.filter(f => {
    const definition = FEATURE_DEFINITIONS.find(d => d.id === f.id);
    return definition?.category === category;
  });
}

/**
 * Get performance-optimized feature set
 */
export function getOptimizedFeatureSet(
  assessment: CapabilityAssessment,
  targetPerformance: 'minimal' | 'basic' | 'good' | 'excellent'
): string[] {
  const performanceOrder: Array<'minimal' | 'basic' | 'good' | 'excellent'> =
    ['minimal', 'basic', 'good', 'excellent'];
  const targetIndex = performanceOrder.indexOf(targetPerformance);

  return assessment.features
    .filter(f => {
      const perfIndex = performanceOrder.indexOf(f.expectedPerformance);
      return f.available && perfIndex >= targetIndex;
    })
    .map(f => f.id);
}
