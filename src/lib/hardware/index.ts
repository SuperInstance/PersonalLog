/**
 * Hardware Detection Module
 *
 * Comprehensive hardware capability detection for browser environments.
 * Enables adaptive application behavior based on detected capabilities.
 *
 * @example
 * ```typescript
 * import { getHardwareInfo } from '@/lib/hardware';
 *
 * const result = await getHardwareInfo();
 * if (result.success) {
 *   console.log(`Performance Score: ${result.profile.performanceScore}`);
 * }
 * ```
 */

// Main detector functionality
export {
  HardwareDetector,
  getHardwareInfo,
  getPerformanceScore,
  detectCapabilities,
  clearHardwareCache,
  getDetector
} from './detector';

// JEPA scoring and capabilities
export {
  calculateJEPAScore,
  getJEPARequirements,
} from './scoring';

export type {
  HardwareTier,
  JEPACapabilities,
  HardwareScoreResult,
} from './scoring';

// Capability evaluation
export {
  evaluateCapabilities,
  getFeaturesByCategory,
  getOptimizedFeatureSet,
} from './capabilities';

export type {
  FeatureAvailability,
  CapabilityAssessment,
} from './capabilities';

// TypeScript types
export type {
  CPUInfo,
  GPUInfo,
  MemoryInfo,
  StorageInfo,
  NetworkInfo,
  DisplayInfo,
  BrowserInfo,
  FeatureSupport,
  PerformanceClass,
  HardwareProfile,
  PerformanceScoreBreakdown,
  DetectionOptions,
  DetectionResult
} from './types';

// Usage examples (for documentation)
export { examples } from './example';
