/**
 * Integration Layer Types
 *
 * Defines the state and event types for the integration manager
 * that orchestrates all hardware-aware systems.
 */

import type { HardwareProfile, PerformanceClass } from '../hardware/types';
import type { BenchmarkSuiteResult } from '../benchmark/types';
import type {
  HardwareCapabilities,
  EvaluationResult,
  FeatureMetrics,
} from '../flags/types';
import type { WasmFeatures } from '../native/bridge';

// ============================================================================
// INTEGRATION STATE
// ============================================================================

/**
 * Initialization stage for each system
 */
export type InitializationStage =
  | 'pending'     // Not yet started
  | 'initializing' // In progress
  | 'ready'       // Successfully initialized
  | 'failed'      // Failed to initialize
  | 'disabled';   // Intentionally disabled

/**
 * Status of a single system
 */
export interface SystemStatus {
  /** Current initialization stage */
  stage: InitializationStage;
  /** Timestamp when initialization started (ms) */
  startedAt?: number;
  /** Timestamp when initialization completed (ms) */
  completedAt?: number;
  /** Initialization time in milliseconds */
  initTime?: number;
  /** Error message if failed */
  error?: string;
  /** Whether the system is currently active */
  active: boolean;
}

/**
 * Overall initialization progress
 */
export interface InitializationProgress {
  /** Total number of systems */
  total: number;
  /** Number of completed systems */
  completed: number;
  /** Number of failed systems */
  failed: number;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Current system being initialized */
  current: string;
  /** Estimated time remaining (ms) */
  eta: number;
}

/**
 * Complete integration state
 */
export interface IntegrationState {
  /** Timestamp when integration started */
  startedAt: number;
  /** Timestamp when integration completed (undefined if not complete) */
  completedAt?: number;
  /** Overall initialization stage */
  stage: 'initializing' | 'ready' | 'failed';
  /** Status of each system */
  systems: {
    hardware: SystemStatus;
    native: SystemStatus;
    flags: SystemStatus;
    benchmarks: SystemStatus;
  };
  /** Current initialization progress */
  progress: InitializationProgress;
}

// ============================================================================
// CAPABILITIES
// ============================================================================

/**
 * Computed capabilities from all systems
 */
export interface Capabilities {
  /** Hardware profile (from hardware detection) */
  hardware?: HardwareProfile;
  /** Hardware capabilities (from feature flags) */
  hardwareCapabilities?: HardwareCapabilities;
  /** WASM features (from native bridge) */
  wasmFeatures?: WasmFeatures;
  /** Whether WASM is being used */
  usingWasm: boolean;
  /** Performance class (computed from hardware) */
  performanceClass?: PerformanceClass;
  /** Overall system score (0-100) */
  systemScore: number;
  /** Feature flag evaluation results */
  featureFlags: {
    enabled: string[];
    disabled: string[];
    results: Map<string, EvaluationResult>;
  };
  /** Benchmark results (if run) */
  benchmarks?: BenchmarkSuiteResult;
  /** Feature metrics (if tracking enabled) */
  featureMetrics?: Map<string, FeatureMetrics>;
}

// ============================================================================
// DIAGNOSTIC RESULTS
// ============================================================================

/**
 * Result of running diagnostics
 */
export interface DiagnosticResults {
  /** Timestamp when diagnostics were run */
  timestamp: number;
  /** Overall health status */
  health: 'healthy' | 'degraded' | 'unhealthy';
  /** System-specific diagnostics */
  systems: {
    hardware: SystemDiagnostic;
    native: SystemDiagnostic;
    flags: SystemDiagnostic;
    benchmarks: SystemDiagnostic;
  };
  /** Recommendations */
  recommendations: Recommendation[];
  /** Total diagnostic time (ms) */
  duration: number;
}

/**
 * Diagnostic result for a single system
 */
export interface SystemDiagnostic {
  /** System name */
  name: string;
  /** Health status */
  health: 'healthy' | 'degraded' | 'unhealthy';
  /** Diagnostics checks performed */
  checks: DiagnosticCheck[];
  /** Overall status message */
  message: string;
}

/**
 * Single diagnostic check
 */
export interface DiagnosticCheck {
  /** Check name */
  name: string;
  /** Whether check passed */
  passed: boolean;
  /** Check result/value */
  value?: unknown;
  /** Expected value (if applicable) */
  expected?: unknown;
  /** Additional information */
  info?: string;
  /** Time taken for check (ms) */
  duration: number;
}

/**
 * Recommendation from diagnostics
 */
export interface Recommendation {
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  /** System this recommendation applies to */
  system: string;
  /** Human-readable recommendation */
  recommendation: string;
  /** Expected impact */
  impact: 'high' | 'medium' | 'low';
  /** Actionable suggestion */
  action?: string;
}

// ============================================================================
// EVENTS
// ============================================================================

/**
 * Integration event types
 */
export type IntegrationEventType =
  | 'initialization_started'
  | 'initialization_progress'
  | 'initialization_complete'
  | 'initialization_failed'
  | 'system_status_changed'
  | 'capabilities_updated'
  | 'diagnostics_started'
  | 'diagnostics_complete'
  | 'error';

/**
 * Base event interface
 */
export interface IntegrationEvent {
  /** Event type */
  type: IntegrationEventType;
  /** Event timestamp */
  timestamp: number;
  /** Event-specific data */
  data: unknown;
}

/**
 * Initialization progress event data
 */
export interface InitializationProgressEvent {
  /** Current progress */
  progress: InitializationProgress;
  /** System being initialized */
  system: keyof IntegrationState['systems'];
}

/**
 * System status changed event data
 */
export interface SystemStatusChangedEvent {
  /** System that changed */
  system: keyof IntegrationState['systems'];
  /** New status */
  status: SystemStatus;
  /** Previous status */
  previousStatus: SystemStatus;
}

/**
 * Capabilities updated event data
 */
export interface CapabilitiesUpdatedEvent {
  /** New capabilities */
  capabilities: Capabilities;
  /** What changed */
  changes: string[];
}

/**
 * Error event data
 */
export interface ErrorEvent {
  /** Error message */
  error: string;
  /** System that caused the error */
  system?: keyof IntegrationState['systems'];
  /** Error details */
  details?: unknown;
}

/**
 * Event listener type
 */
export type IntegrationEventListener = (event: IntegrationEvent) => void;

// ============================================================================
// MANAGER CONFIGURATION
// ============================================================================

/**
 * Configuration options for the integration manager
 */
export interface IntegrationConfig {
  /** Whether to auto-initialize on creation (default: true) */
  autoInitialize?: boolean;
  /** Whether to run benchmarks during initialization (default: false) */
  runBenchmarks?: boolean;
  /** Whether to enable debug logging (default: false) */
  debug?: boolean;
  /** Initialization timeout in milliseconds (default: 30000) */
  initializationTimeout?: number;
  /** Whether to track feature flag metrics (default: true) */
  trackMetrics?: boolean;
  /** Custom feature flags configuration */
  featureFlags?: {
    autoPerformanceGate?: boolean;
    performanceThreshold?: number;
  };
  /** Custom hardware detection options */
  hardwareDetection?: {
    detailedGPU?: boolean;
    checkQuota?: boolean;
    detectWebGL?: boolean;
  };
}

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Result of initialization
 */
export interface InitializationResult {
  /** Whether initialization was successful */
  success: boolean;
  /** Final integration state */
  state: IntegrationState;
  /** Capabilities after initialization */
  capabilities: Capabilities;
  /** Error message if failed */
  error?: string;
  /** Total initialization time (ms) */
  duration: number;
}
