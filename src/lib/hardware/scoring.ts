/**
 * Hardware Scoring Algorithm for JEPA Integration
 *
 * Enhanced scoring system that evaluates hardware capabilities specifically
 * for JEPA (Joint Embedding Predictive Architecture) workloads.
 *
 * Scoring Categories:
 * - GPU: Up to 40 points (tensor cores, VRAM, compute capability)
 * - RAM: Up to 30 points (total memory, available memory)
 * - CPU: Up to 20 points (cores, SIMD, threads)
 * - Storage: Up to 10 points (speed, available space)
 */

import type { HardwareProfile, GPUInfo, CPUInfo, MemoryInfo, StorageInfo } from './types';

/**
 * Hardware tier classification
 */
export type HardwareTier =
  | 'low-end'      // 0-20: No GPU, <8GB RAM
  | 'mid-range'    // 20-50: RTX 4050, 8-16GB RAM (PRIMARY TARGET)
  | 'high-end'     // 50-80: RTX 5090, 32GB+ RAM
  | 'extreme';     // 80-100: Jetson Thor, DGX Station

/**
 * JEPA capability assessment
 */
export interface JEPACapabilities {
  /** Can run Tiny-JEPA models */
  tinyJEPA: boolean;
  /** Can run JEPA-Large models */
  largeJEPA: boolean;
  /** Can run JEPA-XL models */
  xlJEPA: boolean;
  /** Can run multimodal JEPA (video + audio) */
  multimodalJEPA: boolean;
  /** Can run real-time transcription */
  realtimeTranscription: boolean;
  /** Can run multiple JEPA models simultaneously */
  multiModel: boolean;
  /** Recommended batch size */
  recommendedBatchSize: number;
  /** Expected performance level */
  performanceLevel: 'minimal' | 'basic' | 'good' | 'excellent';
}

/**
 * Enhanced hardware score with tier classification
 */
export interface HardwareScoreResult {
  /** Overall score (0-100) */
  score: number;
  /** Hardware tier classification */
  tier: HardwareTier;
  /** JEPA capabilities */
  jepa: JEPACapabilities;
  /** Score breakdown */
  breakdown: {
    gpu: number;
    ram: number;
    cpu: number;
    storage: number;
  };
  /** Recommendations */
  recommendations: string[];
}

/**
 * GPU capability assessment for JEPA
 */
interface GPUCapability {
  /** Has tensor cores (NVIDIA) or equivalent */
  hasTensorCores: boolean;
  /** Estimated VRAM in GB */
  vramGB: number;
  /** Compute capability score (0-100) */
  computeScore: number;
  /** Supported compute APIs */
  apis: {
    cuda: boolean;
    metal: boolean;
    webgl: boolean;
    webgpu: boolean;
  };
}

/**
 * Calculate hardware score specifically for JEPA workloads
 */
export function calculateJEPAScore(profile: HardwareProfile): HardwareScoreResult {
  // Get detailed capability assessments
  const gpuCap = assessGPUCapability(profile.gpu);
  const cpuScore = calculateCPUScore(profile.cpu);
  const ramScore = calculateRAMScore(profile.memory);
  const storageScore = calculateStorageScore(profile.storage);

  // Calculate weighted scores
  const gpuScore = Math.min(40,
    (gpuCap.computeScore * 0.4) +
    (gpuCap.vramGB * 4) +
    (gpuCap.hasTensorCores ? 10 : 0)
  );

  const totalScore = Math.min(100, Math.round(
    gpuScore +
    ramScore +
    cpuScore +
    storageScore
  ));

  // Determine tier
  const tier = classifyTier(totalScore);

  // Assess JEPA capabilities
  const jepa = assessJEPACapabilities(totalScore, gpuCap, ramScore, profile);

  // Generate recommendations
  const recommendations = generateRecommendations(totalScore, tier, gpuCap, ramScore, profile);

  return {
    score: totalScore,
    tier,
    jepa,
    breakdown: {
      gpu: Math.round(gpuScore),
      ram: Math.round(ramScore),
      cpu: Math.round(cpuScore),
      storage: Math.round(storageScore),
    },
    recommendations,
  };
}

/**
 * Assess GPU capabilities for JEPA workloads
 */
function assessGPUCapability(gpu: GPUInfo): GPUCapability {
  const capability: GPUCapability = {
    hasTensorCores: false,
    vramGB: (gpu.vramMB || 2048) / 1024, // Convert MB to GB
    computeScore: 0,
    apis: {
      cuda: false,
      metal: false,
      webgl: gpu.webgl.supported,
      webgpu: gpu.webgpu.supported,
    },
  };

  // Detect tensor cores from GPU renderer string
  const renderer = gpu.renderer?.toLowerCase() || '';

  // NVIDIA GPUs with tensor cores
  if (renderer.includes('nvidia') || renderer.includes('rtx') || renderer.includes('gtc')) {
    capability.hasTensorCores = true;
    capability.apis.cuda = true;

    // RTX 40 series (latest, best performance)
    if (renderer.includes('rtx 40')) {
      capability.computeScore = 100;
    }
    // RTX 30 series
    else if (renderer.includes('rtx 30')) {
      capability.computeScore = 85;
    }
    // RTX 20 series
    else if (renderer.includes('rtx 20')) {
      capability.computeScore = 70;
    }
    // GTX series (no tensor cores, but still good)
    else if (renderer.includes('gtx')) {
      capability.hasTensorCores = false;
      capability.computeScore = 50;
    }
    // Generic NVIDIA
    else {
      capability.computeScore = 60;
    }
  }

  // Apple Silicon (Metal Performance Shaders)
  if (renderer.includes('apple m1') || renderer.includes('apple m2') || renderer.includes('apple m3')) {
    capability.hasTensorCores = true; // Neural Engine
    capability.apis.metal = true;
    capability.vramGB = 8; // Apple Silicon has unified memory

    if (renderer.includes('m3')) {
      capability.computeScore = 90;
    } else if (renderer.includes('m2')) {
      capability.computeScore = 80;
    } else if (renderer.includes('m1')) {
      capability.computeScore = 70;
    }
  }

  // AMD GPUs (ROCm support limited)
  if (renderer.includes('amd') || renderer.includes('radeon')) {
    capability.apis.metal = renderer.includes('amd'); // Some AMD GPUs support Metal on Mac

    if (renderer.includes('rx 7') || renderer.includes('rx 6')) {
      capability.computeScore = 60;
    } else {
      capability.computeScore = 45;
    }
  }

  // Intel GPUs (integrated, limited performance)
  if (renderer.includes('intel')) {
    capability.computeScore = 30;
    capability.vramGB = 2; // Shared memory
  }

  // WebGPU as fallback
  if (gpu.webgpu.supported && !capability.apis.cuda && !capability.apis.metal) {
    capability.computeScore = Math.max(capability.computeScore, 40);
  }

  // WebGL as minimum requirement
  if (gpu.webgl.supported && capability.computeScore === 0) {
    capability.computeScore = 20;
  }

  return capability;
}

/**
 * Calculate CPU score (0-20 points)
 */
function calculateCPUScore(cpu: CPUInfo): number {
  let score = 0;

  // Base score from core count (up to 10 points)
  score += Math.min(10, (cpu.cores / 8) * 10);

  // SIMD support (up to 5 points)
  if (cpu.simd.supported) {
    score += cpu.simd.type === 'wasm' ? 5 : 3;
  }

  // WebAssembly threads (up to 5 points)
  if (cpu.wasm.threads) {
    score += 5;
  }

  return Math.min(20, score);
}

/**
 * Calculate RAM score (0-30 points)
 */
function calculateRAMScore(memory: MemoryInfo): number {
  const totalGB = memory.totalGB || 4;

  // Scale: 4GB = 0 points, 32GB = 30 points
  const score = Math.min(30, ((totalGB - 4) / 28) * 30);

  return Math.max(0, score);
}

/**
 * Calculate storage score (0-10 points)
 */
function calculateStorageScore(storage: StorageInfo): number {
  let score = 0;

  // IndexedDB availability
  if (storage.indexedDB.available) {
    score += 5;
  }

  // Storage quota health
  if (storage.quota) {
    if (storage.quota.usagePercentage < 50) {
      score += 5;
    } else if (storage.quota.usagePercentage < 80) {
      score += 3;
    } else {
      score += 1;
    }
  }

  return score;
}

/**
 * Classify hardware tier based on score
 */
function classifyTier(score: number): HardwareTier {
  if (score <= 20) return 'low-end';
  if (score <= 50) return 'mid-range';
  if (score <= 80) return 'high-end';
  return 'extreme';
}

/**
 * Assess JEPA-specific capabilities
 */
function assessJEPACapabilities(
  score: number,
  gpu: GPUCapability,
  ramScore: number,
  profile: HardwareProfile
): JEPACapabilities {
  const capabilities: JEPACapabilities = {
    tinyJEPA: false,
    largeJEPA: false,
    xlJEPA: false,
    multimodalJEPA: false,
    realtimeTranscription: false,
    multiModel: false,
    recommendedBatchSize: 1,
    performanceLevel: 'minimal',
  };

  // Low-end (0-20): Basic API streaming only
  if (score >= 20) {
    capabilities.tinyJEPA = true;
    capabilities.recommendedBatchSize = 1;
    capabilities.performanceLevel = 'minimal';
  }

  // Mid-range (20-50): Tiny-JEPA enabled
  if (score >= 30 && gpu.vramGB >= 4) {
    capabilities.tinyJEPA = true;
    capabilities.recommendedBatchSize = 2;
    capabilities.performanceLevel = 'basic';
  }

  if (score >= 40 && gpu.vramGB >= 6) {
    capabilities.realtimeTranscription = true;
    capabilities.recommendedBatchSize = 4;
  }

  // High-end (50-80): JEPA-Large enabled
  if (score >= 50 && gpu.vramGB >= 8) {
    capabilities.largeJEPA = true;
    capabilities.recommendedBatchSize = 8;
    capabilities.performanceLevel = 'good';
  }

  if (score >= 60 && gpu.hasTensorCores) {
    capabilities.multimodalJEPA = true;
    capabilities.recommendedBatchSize = 12;
  }

  if (score >= 70 && gpu.vramGB >= 12) {
    capabilities.multiModel = true;
    capabilities.recommendedBatchSize = 16;
  }

  // Extreme (80-100): All features enabled
  if (score >= 80 && gpu.vramGB >= 16) {
    capabilities.xlJEPA = true;
    capabilities.multimodalJEPA = true;
    capabilities.multiModel = true;
    capabilities.recommendedBatchSize = 32;
    capabilities.performanceLevel = 'excellent';
  }

  return capabilities;
}

/**
 * Generate hardware upgrade recommendations
 */
function generateRecommendations(
  score: number,
  tier: HardwareTier,
  gpu: GPUCapability,
  ramScore: number,
  profile: HardwareProfile
): string[] {
  const recommendations: string[] = [];

  // Low-end tier recommendations
  if (tier === 'low-end') {
    recommendations.push('Your system is below minimum requirements for JEPA features.');
    recommendations.push('Consider upgrading to a system with at least 8GB RAM and a dedicated GPU.');

    if (!profile.gpu.available) {
      recommendations.push('No GPU detected. A GPU is required for JEPA transcription.');
    }

    if ((profile.memory.totalGB || 0) < 8) {
      recommendations.push('Insufficient RAM. Upgrade to at least 8GB for basic JEPA features.');
    }

    return recommendations;
  }

  // Mid-range tier recommendations
  if (tier === 'mid-range') {
    recommendations.push('Your system supports Tiny-JEPA models for basic transcription.');

    if (gpu.vramGB < 6) {
      recommendations.push('Upgrade to a GPU with 6GB+ VRAM for better JEPA performance.');
    }

    if (ramScore < 15) {
      recommendations.push('Consider upgrading to 16GB RAM for improved multitasking.');
    }

    if (!gpu.hasTensorCores) {
      recommendations.push('For best performance, consider an NVIDIA RTX or Apple Silicon GPU.');
    }

    return recommendations;
  }

  // High-end tier recommendations
  if (tier === 'high-end') {
    recommendations.push('Your system is well-suited for JEPA transcription features.');
    recommendations.push('You can run both Tiny-JEPA and JEPA-Large models.');

    if (!gpu.hasTensorCores) {
      recommendations.push('A GPU with tensor cores (RTX series) would improve performance further.');
    }

    if (ramScore < 25) {
      recommendations.push('32GB RAM is recommended for heavy JEPA workloads.');
    }

    return recommendations;
  }

  // Extreme tier
  recommendations.push('Excellent! Your system can run all JEPA features at maximum performance.');
  recommendations.push('You can run multiple JEPA models simultaneously and process 4K multimodal content.');

  return recommendations;
}

/**
 * Get minimum hardware requirements for each JEPA feature
 */
export function getJEPARequirements(): Record<string, { minScore: number; description: string }> {
  return {
    tiny_jepa: {
      minScore: 30,
      description: 'Tiny-JEPA transcription (minimum: RTX 4050, 8GB RAM)',
    },
    large_jepa: {
      minScore: 50,
      description: 'JEPA-Large transcription (minimum: RTX 4070, 16GB RAM)',
    },
    xl_jepa: {
      minScore: 80,
      description: 'JEPA-XL transcription (minimum: RTX 5090, 32GB RAM)',
    },
    multimodal: {
      minScore: 60,
      description: 'Multimodal JEPA (video + audio analysis)',
    },
    realtime: {
      minScore: 40,
      description: 'Real-time transcription (minimum: 6GB VRAM)',
    },
    multi_model: {
      minScore: 70,
      description: 'Multiple JEPA models simultaneously',
    },
  };
}
