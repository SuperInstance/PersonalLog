/**
 * Hardware Requirements Type Definitions
 *
 * Extended requirement types for agent hardware validation.
 * Integrates with Round 2 hardware detection system.
 */

import type { HardwareProfile } from '@/lib/hardware/types';

/**
 * Requirement error codes for specific failure modes
 */
export enum RequirementErrorCode {
  /** GPU is required but not available */
  GPU_REQUIRED = 'GPU_REQUIRED',
  /** Insufficient RAM */
  INSUFFICIENT_RAM = 'INSUFFICIENT_RAM',
  /** Insufficient CPU cores */
  INSUFFICIENT_CORES = 'INSUFFICIENT_CORES',
  /** JEPA score below minimum */
  JEPA_SCORE_TOO_LOW = 'JEPA_SCORE_TOO_LOW',
  /** Required hardware feature missing */
  HARDWARE_FEATURE_MISSING = 'HARDWARE_FEATURE_MISSING',
  /** Browser API not available */
  API_MISSING = 'API_MISSING',
  /** Feature flag disabled */
  FLAG_DISABLED = 'FLAG_DISABLED',
  /** Network speed too slow */
  NETWORK_TOO_SLOW = 'NETWORK_TOO_SLOW',
  /** Insufficient storage space */
  INSUFFICIENT_STORAGE = 'INSUFFICIENT_STORAGE',
}

/**
 * Hardware requirement specification (extended from agents/types.ts)
 */
export interface HardwareRequirement {
  /** Minimum JEPA score (0-100) required */
  minJEPAScore?: number;
  /** Required hardware features */
  features?: string[];
  /** Minimum RAM in GB */
  minRAM?: number;
  /** Minimum CPU cores */
  minCores?: number;
  /** Whether GPU is required */
  requiresGPU?: boolean;
  /** Minimum network speed in Mbps */
  minNetworkSpeed?: number;
  /** Minimum storage space in GB */
  minStorage?: number;
}

/**
 * API requirement specification
 */
export interface APIRequirement {
  /** API name (e.g., 'webgpu', 'indexeddb') */
  name: string;
  /** Whether API is required */
  required: boolean;
  /** API version constraint (optional) */
  minVersion?: number;
}

/**
 * Feature flag requirement
 */
export interface FeatureFlagRequirement {
  /** Feature flag name */
  name: string;
  /** Whether flag must be enabled */
  enabled: boolean;
}

/**
 * Validation requirement combining all types
 */
export interface ValidationRequirement {
  /** Hardware requirements */
  hardware?: HardwareRequirement;
  /** API requirements */
  apis?: APIRequirement[];
  /** Feature flag requirements */
  flags?: FeatureFlagRequirement[];
}

/**
 * Individual requirement error
 */
export interface RequirementError {
  /** Error code */
  code: RequirementErrorCode;
  /** User-friendly error message */
  message: string;
  /** Technical details */
  details: string;
  /** Requirement that failed */
  requirement: HardwareRequirement | APIRequirement | FeatureFlagRequirement;
  /** Current system value */
  currentValue?: number | boolean;
  /** Required value */
  requiredValue?: number | boolean | string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether all requirements are met */
  valid: boolean;
  /** List of errors (blocking) */
  errors: RequirementError[];
  /** List of warnings (non-blocking) */
  warnings: string[];
  /** Validation score (0-1) */
  score: number;
  /** Checked requirements summary */
  checked: {
    /** Number of requirements checked */
    total: number;
    /** Number passed */
    passed: number;
    /** Number failed */
    failed: number;
  };
}

/**
 * Requirement validation error class
 */
export class RequirementValidationError extends Error {
  public code: RequirementErrorCode;
  public errors: RequirementError[];

  constructor(errors: RequirementError[]) {
    const message = `Hardware requirements validation failed with ${errors.length} error(s)`;
    super(message);
    this.name = 'RequirementValidationError';
    this.code = errors[0]?.code || RequirementErrorCode.GPU_REQUIRED;
    this.errors = errors;
  }
}

/**
 * Helper type for hardware capability checks
 */
export interface CapabilityCheck {
  /** Capability name */
  name: string;
  /** Whether capability is available */
  available: boolean;
  /** Current value */
  currentValue?: number | boolean;
  /** Required value */
  requiredValue?: number | boolean;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Whether to include warnings */
  includeWarnings?: boolean;
  /** Whether to calculate detailed scores */
  detailedScoring?: boolean;
  /** Custom error message formatter */
  formatMessage?: (error: RequirementError) => string;
}

/**
 * Requirement severity level
 */
export enum RequirementSeverity {
  /** Critical - blocks agent activation */
  CRITICAL = 'critical',
  /** Warning - agent may work with limitations */
  WARNING = 'warning',
  /** Info - for informational purposes */
  INFO = 'info',
}

/**
 * Requirement check result with severity
 */
export interface RequirementCheck {
  /** Requirement name */
  name: string;
  /** Severity level */
  severity: RequirementSeverity;
  /** Whether requirement is met */
  passed: boolean;
  /** Error or info message */
  message: string;
  /** Technical details */
  details?: string;
}
