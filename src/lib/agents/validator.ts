/**
 * Hardware Requirements Validator
 *
 * Validates agent hardware requirements against detected system profile.
 * Integrates with Round 2 hardware detection system (scoring.ts).
 */

import type { HardwareProfile } from '@/lib/hardware/types';
import { calculateJEPAScore } from '@/lib/hardware/scoring';
import type {
  ValidationRequirement,
  ValidationResult,
  RequirementError,
  ValidationOptions,
  RequirementCheck,
  HardwareRequirement,
  APIRequirement,
  FeatureFlagRequirement,
} from './requirements';
import {
  RequirementErrorCode,
  RequirementValidationError,
  RequirementSeverity,
} from './requirements';

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: ValidationOptions = {
  includeWarnings: true,
  detailedScoring: true,
};

/**
 * Validate requirements against hardware profile
 *
 * @param requirements - Requirements to validate
 * @param hardwareProfile - Detected hardware profile
 * @param options - Validation options
 * @returns Validation result with errors and warnings
 */
export function validateRequirements(
  requirements: ValidationRequirement,
  hardwareProfile: HardwareProfile,
  options: ValidationOptions = DEFAULT_OPTIONS
): ValidationResult {
  const errors: RequirementError[] = [];
  const warnings: string[] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  // Validate hardware requirements
  if (requirements.hardware) {
    const hardwareResult = validateHardwareRequirements(
      requirements.hardware,
      hardwareProfile
    );
    errors.push(...hardwareResult.errors);
    warnings.push(...hardwareResult.warnings);
    totalChecks += hardwareResult.checked;
    passedChecks += hardwareResult.passed;
  }

  // Validate API requirements
  if (requirements.apis && requirements.apis.length > 0) {
    const apiResult = validateAPIRequirements(requirements.apis, hardwareProfile);
    errors.push(...apiResult.errors);
    warnings.push(...apiResult.warnings);
    totalChecks += apiResult.checked;
    passedChecks += apiResult.passed;
  }

  // Validate feature flag requirements (placeholder - to be implemented with feature flag system)
  if (requirements.flags && requirements.flags.length > 0) {
    const flagResult = validateFlagRequirements(requirements.flags);
    errors.push(...flagResult.errors);
    warnings.push(...flagResult.warnings);
    totalChecks += flagResult.checked;
    passedChecks += flagResult.passed;
  }

  // Calculate validation score
  const score = totalChecks > 0 ? passedChecks / totalChecks : 1;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    score,
    checked: {
      total: totalChecks,
      passed: passedChecks,
      failed: totalChecks - passedChecks,
    },
  };
}

/**
 * Validate hardware requirements
 */
function validateHardwareRequirements(
  requirement: HardwareRequirement,
  profile: HardwareProfile
): { errors: RequirementError[]; warnings: string[]; checked: number; passed: number } {
  const errors: RequirementError[] = [];
  const warnings: string[] = [];
  let checked = 0;
  let passed = 0;

  // Check JEPA score
  if (requirement.minJEPAScore !== undefined) {
    checked++;
    const jepaResult = calculateJEPAScore(profile);

    if (jepaResult.score < requirement.minJEPAScore) {
      errors.push({
        code: RequirementErrorCode.JEPA_SCORE_TOO_LOW,
        message: `Your system's JEPA score (${jepaResult.score}) is below the required minimum (${requirement.minJEPAScore}).`,
        details: `Current JEPA score: ${jepaResult.score}, Required: ${requirement.minJEPAScore}`,
        requirement,
        currentValue: jepaResult.score,
        requiredValue: requirement.minJEPAScore,
      });
    } else {
      passed++;
    }
  }

  // Check RAM
  if (requirement.minRAM !== undefined) {
    checked++;
    const totalRAM = profile.memory.totalGB || 0;

    if (totalRAM < requirement.minRAM) {
      errors.push({
        code: RequirementErrorCode.INSUFFICIENT_RAM,
        message: `Insufficient RAM. Your system has ${totalRAM}GB, but ${requirement.minRAM}GB is required.`,
        details: `Current RAM: ${totalRAM}GB, Required: ${requirement.minRAM}GB`,
        requirement,
        currentValue: totalRAM,
        requiredValue: requirement.minRAM,
      });
    } else {
      passed++;
    }
  }

  // Check CPU cores
  if (requirement.minCores !== undefined) {
    checked++;
    const cores = profile.cpu.cores;

    if (cores < requirement.minCores) {
      errors.push({
        code: RequirementErrorCode.INSUFFICIENT_CORES,
        message: `Insufficient CPU cores. Your system has ${cores} cores, but ${requirement.minCores} is required.`,
        details: `Current cores: ${cores}, Required: ${requirement.minCores}`,
        requirement,
        currentValue: cores,
        requiredValue: requirement.minCores,
      });
    } else {
      passed++;
    }
  }

  // Check GPU requirement
  if (requirement.requiresGPU !== undefined && requirement.requiresGPU) {
    checked++;

    if (!profile.gpu.available) {
      errors.push({
        code: RequirementErrorCode.GPU_REQUIRED,
        message: 'This agent requires a GPU, but none was detected on your system.',
        details: 'GPU availability: false, Required: true',
        requirement,
        currentValue: profile.gpu.available,
        requiredValue: true,
      });
    } else {
      passed++;
    }
  }

  // Check hardware features
  if (requirement.features && requirement.features.length > 0) {
    for (const feature of requirement.features) {
      checked++;
      const featureCheck = checkHardwareFeature(feature, profile);

      if (!featureCheck.available) {
        errors.push({
          code: RequirementErrorCode.HARDWARE_FEATURE_MISSING,
          message: `Required hardware feature "${feature}" is not available on your system.`,
          details: `Feature: ${feature}, Status: not available`,
          requirement,
          currentValue: false,
          requiredValue: true,
        });
      } else {
        passed++;
      }
    }
  }

  // Check network speed
  if (requirement.minNetworkSpeed !== undefined) {
    checked++;
    const networkSpeed = profile.network.downlinkMbps || 0;

    if (networkSpeed < requirement.minNetworkSpeed && networkSpeed > 0) {
      errors.push({
        code: RequirementErrorCode.NETWORK_TOO_SLOW,
        message: `Network speed is too slow. Your connection: ${networkSpeed}Mbps, Required: ${requirement.minNetworkSpeed}Mbps.`,
        details: `Current speed: ${networkSpeed}Mbps, Required: ${requirement.minNetworkSpeed}Mbps`,
        requirement,
        currentValue: networkSpeed,
        requiredValue: requirement.minNetworkSpeed,
      });
    } else if (networkSpeed === 0) {
      warnings.push('Unable to detect network speed. Proceeding with caution.');
      passed++; // Don't block on undetectable network
    } else {
      passed++;
    }
  }

  // Check storage space
  if (requirement.minStorage !== undefined) {
    checked++;

    if (profile.storage.quota) {
      const availableGB = (profile.storage.quota.quota - profile.storage.quota.usage) / (1024 * 1024 * 1024);

      if (availableGB < requirement.minStorage) {
        errors.push({
          code: RequirementErrorCode.INSUFFICIENT_STORAGE,
          message: `Insufficient storage space. Available: ${availableGB.toFixed(1)}GB, Required: ${requirement.minStorage}GB.`,
          details: `Available storage: ${availableGB.toFixed(1)}GB, Required: ${requirement.minStorage}GB`,
          requirement,
          currentValue: availableGB,
          requiredValue: requirement.minStorage,
        });
      } else {
        passed++;
      }
    } else {
      warnings.push('Unable to detect available storage space. Proceeding with caution.');
      passed++; // Don't block on undetectable storage
    }
  }

  return { errors, warnings, checked, passed };
}

/**
 * Validate API requirements
 */
function validateAPIRequirements(
  requirements: APIRequirement[],
  profile: HardwareProfile
): { errors: RequirementError[]; warnings: string[]; checked: number; passed: number } {
  const errors: RequirementError[] = [];
  const warnings: string[] = [];
  let checked = 0;
  let passed = 0;

  for (const apiReq of requirements) {
    checked++;
    const apiCheck = checkAPIAvailability(apiReq.name, profile);

    if (!apiCheck.available && apiReq.required) {
      errors.push({
        code: RequirementErrorCode.API_MISSING,
        message: `Required browser API "${apiReq.name}" is not available.`,
        details: `API: ${apiReq.name}, Status: not available`,
        requirement: apiReq,
        currentValue: false,
        requiredValue: true,
      });
    } else if (!apiCheck.available && !apiReq.required) {
      warnings.push(`Optional API "${apiReq.name}" is not available. Some features may be limited.`);
      passed++;
    } else {
      passed++;
    }
  }

  return { errors, warnings, checked, passed };
}

/**
 * Validate feature flag requirements (placeholder)
 */
function validateFlagRequirements(
  requirements: FeatureFlagRequirement[]
): { errors: RequirementError[]; warnings: string[]; checked: number; passed: number } {
  const errors: RequirementError[] = [];
  const warnings: string[] = [];
  let checked = 0;
  let passed = 0;

  // TODO: Integrate with actual feature flag system when implemented
  for (const flag of requirements) {
    checked++;

    // For now, assume all flags are enabled (placeholder)
    // In production, this would check against a feature flag store
    const flagEnabled = true;

    if (flag.enabled !== flagEnabled) {
      errors.push({
        code: RequirementErrorCode.FLAG_DISABLED,
        message: `Required feature flag "${flag.name}" is not ${flag.enabled ? 'enabled' : 'disabled'}.`,
        details: `Flag: ${flag.name}, Required state: ${flag.enabled ? 'enabled' : 'disabled'}`,
        requirement: flag,
        currentValue: flagEnabled,
        requiredValue: flag.enabled,
      });
    } else {
      passed++;
    }
  }

  return { errors, warnings, checked, passed };
}

/**
 * Check if a hardware feature is available
 */
function checkHardwareFeature(feature: string, profile: HardwareProfile): { available: boolean } {
  const featureLower = feature.toLowerCase();

  // GPU tensor cores
  if (featureLower === 'tensor-cores' || featureLower === 'gpu-acceleration') {
    // Check if GPU has tensor cores (NVIDIA RTX, Apple Silicon)
    const renderer = profile.gpu.renderer?.toLowerCase() || '';
    const hasTensorCores =
      renderer.includes('rtx') ||
      renderer.includes('apple m1') ||
      renderer.includes('apple m2') ||
      renderer.includes('apple m3');

    return { available: hasTensorCores };
  }

  // WebGPU
  if (featureLower === 'webgpu') {
    return { available: profile.gpu.webgpu.supported };
  }

  // WebGL
  if (featureLower === 'webgl') {
    return { available: profile.gpu.webgl.supported };
  }

  // SIMD
  if (featureLower === 'simd') {
    return { available: profile.cpu.simd.supported };
  }

  // WebAssembly threads
  if (featureLower === 'wasm-threads') {
    return { available: profile.cpu.wasm.threads };
  }

  // Web Workers
  if (featureLower === 'web-workers') {
    return { available: profile.features.webWorkers };
  }

  // IndexedDB
  if (featureLower === 'indexeddb') {
    return { available: profile.storage.indexedDB.supported };
  }

  // Service Worker
  if (featureLower === 'service-worker') {
    return { available: profile.features.serviceWorker };
  }

  // Default: assume not available
  return { available: false };
}

/**
 * Check if an API is available
 */
function checkAPIAvailability(apiName: string, profile: HardwareProfile): { available: boolean } {
  const apiLower = apiName.toLowerCase();

  // GPU APIs
  if (apiLower === 'webgpu') {
    return { available: profile.gpu.webgpu.supported };
  }

  if (apiLower === 'webgl' || apiLower === 'webgl2') {
    return { available: profile.gpu.webgl.supported };
  }

  // Storage APIs
  if (apiLower === 'indexeddb') {
    return { available: profile.storage.indexedDB.supported };
  }

  if (apiLower === 'storage-api') {
    return { available: profile.storage.quota !== undefined };
  }

  // Worker APIs
  if (apiLower === 'web-worker') {
    return { available: profile.features.webWorkers };
  }

  if (apiLower === 'service-worker') {
    return { available: profile.features.serviceWorker };
  }

  // Communication APIs
  if (apiLower === 'webrtc') {
    return { available: profile.features.webrtc };
  }

  if (apiLower === 'websocket') {
    return { available: profile.features.websockets };
  }

  // Other APIs
  if (apiLower === 'geolocation') {
    return { available: profile.features.geolocation };
  }

  if (apiLower === 'notifications') {
    return { available: profile.features.notifications };
  }

  if (apiLower === 'fullscreen') {
    return { available: profile.features.fullscreen };
  }

  if (apiLower === 'webassembly') {
    return { available: profile.features.webassembly };
  }

  // Default: assume not available
  return { available: false };
}

/**
 * Get detailed requirement checks for UI display
 *
 * @param requirements - Requirements to check
 * @param hardwareProfile - Detected hardware profile
 * @returns Array of requirement checks with severity
 */
export function getRequirementChecks(
  requirements: ValidationRequirement,
  hardwareProfile: HardwareProfile
): RequirementCheck[] {
  const checks: RequirementCheck[] = [];

  // Hardware requirement checks
  if (requirements.hardware) {
    // JEPA Score
    if (requirements.hardware.minJEPAScore !== undefined) {
      const jepaResult = calculateJEPAScore(hardwareProfile);
      const passed = jepaResult.score >= requirements.hardware.minJEPAScore;

      checks.push({
        name: 'JEPA Score',
        severity: RequirementSeverity.CRITICAL,
        passed,
        message: passed
          ? `JEPA score: ${jepaResult.score} / ${requirements.hardware.minJEPAScore} required`
          : `JEPA score: ${jepaResult.score} (need ${requirements.hardware.minJEPAScore})`,
        details: `Your hardware score: ${jepaResult.score}, Minimum required: ${requirements.hardware.minJEPAScore}`,
      });
    }

    // RAM
    if (requirements.hardware.minRAM !== undefined) {
      const totalRAM = hardwareProfile.memory.totalGB || 0;
      const passed = totalRAM >= requirements.hardware.minRAM;

      checks.push({
        name: 'Memory (RAM)',
        severity: RequirementSeverity.CRITICAL,
        passed,
        message: passed
          ? `${totalRAM}GB RAM available (${requirements.hardware.minRAM}GB required)`
          : `${totalRAM}GB RAM (need ${requirements.hardware.minRAM}GB)`,
        details: `Current: ${totalRAM}GB, Required: ${requirements.hardware.minRAM}GB`,
      });
    }

    // CPU Cores
    if (requirements.hardware.minCores !== undefined) {
      const cores = hardwareProfile.cpu.cores;
      const passed = cores >= requirements.hardware.minCores;

      checks.push({
        name: 'CPU Cores',
        severity: RequirementSeverity.CRITICAL,
        passed,
        message: passed
          ? `${cores} CPU cores (${requirements.hardware.minCores} required)`
          : `${cores} cores (need ${requirements.hardware.minCores})`,
        details: `Current: ${cores}, Required: ${requirements.hardware.minCores}`,
      });
    }

    // GPU
    if (requirements.hardware.requiresGPU) {
      const passed = hardwareProfile.gpu.available;

      checks.push({
        name: 'GPU',
        severity: RequirementSeverity.CRITICAL,
        passed,
        message: passed
          ? `GPU detected: ${hardwareProfile.gpu.renderer || 'Unknown GPU'}`
          : 'No GPU detected',
        details: passed
          ? `GPU: ${hardwareProfile.gpu.renderer}`
          : 'This agent requires a GPU to function',
      });
    }

    // Network Speed
    if (requirements.hardware.minNetworkSpeed !== undefined) {
      const networkSpeed = hardwareProfile.network.downlinkMbps || 0;
      const passed = networkSpeed >= requirements.hardware.minNetworkSpeed || networkSpeed === 0;

      checks.push({
        name: 'Network Speed',
        severity: networkSpeed === 0 ? RequirementSeverity.INFO : RequirementSeverity.WARNING,
        passed,
        message: networkSpeed === 0
          ? 'Network speed undetectable'
          : passed
          ? `${networkSpeed}Mbps available (${requirements.hardware.minNetworkSpeed}Mbps required)`
          : `${networkSpeed}Mbps (need ${requirements.hardware.minNetworkSpeed}Mbps)`,
        details: `Current: ${networkSpeed}Mbps, Required: ${requirements.hardware.minNetworkSpeed}Mbps`,
      });
    }

    // Storage
    if (requirements.hardware.minStorage !== undefined) {
      const hasQuota = hardwareProfile.storage.quota !== undefined;

      checks.push({
        name: 'Storage Space',
        severity: hasQuota ? RequirementSeverity.CRITICAL : RequirementSeverity.INFO,
        passed: hasQuota,
        message: hasQuota
          ? 'Storage space check passed'
          : 'Unable to detect storage space',
        details: hasQuota
          ? `Available: ${((hardwareProfile.storage.quota!.quota - hardwareProfile.storage.quota!.usage) / (1024 * 1024 * 1024)).toFixed(1)}GB`
          : 'Storage API not available',
      });
    }
  }

  // API requirement checks
  if (requirements.apis) {
    for (const api of requirements.apis) {
      const available = checkAPIAvailability(api.name, hardwareProfile).available;
      const passed = available || !api.required;

      checks.push({
        name: `API: ${api.name}`,
        severity: api.required ? RequirementSeverity.CRITICAL : RequirementSeverity.INFO,
        passed,
        message: available
          ? `${api.name} API available`
          : api.required
          ? `${api.name} API not available (required)`
          : `${api.name} API not available (optional)`,
        details: `API: ${api.name}, Required: ${api.required}, Available: ${available}`,
      });
    }
  }

  // Feature flag checks
  if (requirements.flags) {
    for (const flag of requirements.flags) {
      // TODO: Integrate with actual feature flag system
      checks.push({
        name: `Feature Flag: ${flag.name}`,
        severity: RequirementSeverity.INFO,
        passed: true,
        message: `Feature flag "${flag.name}" is ${flag.enabled ? 'enabled' : 'disabled'}`,
        details: `Flag: ${flag.name}, State: ${flag.enabled ? 'enabled' : 'disabled'}`,
      });
    }
  }

  return checks;
}

/**
 * Format error message for user display
 *
 * @param error - Requirement error
 * @returns Formatted error message
 */
export function formatErrorMessage(error: RequirementError): string {
  return error.message;
}

/**
 * Get upgrade suggestions based on validation result
 *
 * @param result - Validation result
 * @returns Array of upgrade suggestions
 */
export function getUpgradeSuggestions(result: ValidationResult): string[] {
  const suggestions: string[] = [];

  for (const error of result.errors) {
    switch (error.code) {
      case RequirementErrorCode.GPU_REQUIRED:
        suggestions.push('Upgrade to a system with a dedicated GPU (NVIDIA RTX or Apple Silicon recommended)');
        break;
      case RequirementErrorCode.INSUFFICIENT_RAM:
        suggestions.push('Upgrade your system RAM to meet the minimum requirement');
        break;
      case RequirementErrorCode.INSUFFICIENT_CORES:
        suggestions.push('Consider using a system with more CPU cores');
        break;
      case RequirementErrorCode.JEPA_SCORE_TOO_LOW:
        suggestions.push('Upgrade your hardware (GPU, RAM, or CPU) to improve your JEPA score');
        break;
      case RequirementErrorCode.HARDWARE_FEATURE_MISSING:
        suggestions.push('Ensure your hardware supports the required features (e.g., tensor cores, WebGPU)');
        break;
      case RequirementErrorCode.API_MISSING:
        suggestions.push('Update your browser to a version that supports the required APIs');
        break;
      case RequirementErrorCode.NETWORK_TOO_SLOW:
        suggestions.push('Connect to a faster network or reduce network-intensive features');
        break;
      case RequirementErrorCode.INSUFFICIENT_STORAGE:
        suggestions.push('Free up storage space or increase your browser storage quota');
        break;
      default:
        suggestions.push('Address the hardware requirements listed above');
        break;
    }
  }

  return suggestions;
}
