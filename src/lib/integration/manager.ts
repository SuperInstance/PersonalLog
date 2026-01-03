/**
 * Integration Manager
 *
 * Orchestrates all hardware-aware systems and provides a unified API.
 * Manages initialization order, dependencies, and provides observability.
 */

import type {
  IntegrationState,
  SystemStatus,
  InitializationStage,
  InitializationProgress,
  Capabilities,
  DiagnosticResults,
  SystemDiagnostic,
  Recommendation,
  IntegrationEvent,
  InitializationProgressEvent,
  SystemStatusChangedEvent,
  CapabilitiesUpdatedEvent,
  ErrorEvent,
  IntegrationConfig,
  InitializationResult,
} from './types';

import { getHardwareInfo, clearHardwareCache } from '../hardware';
import { getBenchmarkSuite, type BenchmarkSuite as BenchmarkSuiteResult } from '../benchmark';
import { initializeFeatureFlags, getGlobalManager, type FeatureFlagManager } from '../flags';
import { loadWasmModule, getWasmFeatures, isUsingWasm } from '../native/bridge';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: Required<IntegrationConfig> = {
  autoInitialize: true,
  runBenchmarks: false,
  debug: false,
  initializationTimeout: 30000,
  trackMetrics: true,
  featureFlags: {
    autoPerformanceGate: true,
    performanceThreshold: 1000,
  },
  hardwareDetection: {
    detailedGPU: true,
    checkQuota: false,
    detectWebGL: true,
  },
};

// ============================================================================
// INTEGRATION MANAGER CLASS
// ============================================================================

export class IntegrationManager {
  private state: IntegrationState;
  private config: Required<IntegrationConfig>;
  private capabilities: Capabilities;
  private listeners: Map<string, Array<(event: IntegrationEvent) => void>>;
  private initializationPromise: Promise<InitializationResult> | null = null;
  private featureFlagManager: FeatureFlagManager | null = null;

  constructor(config: IntegrationConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.listeners = new Map();

    // Initialize state
    this.state = this.createInitialState();

    // Initialize capabilities with defaults
    this.capabilities = {
      usingWasm: false,
      systemScore: 50,
      featureFlags: {
        enabled: [],
        disabled: [],
        results: new Map(),
      },
    };

    // Auto-initialize if enabled
    if (this.config.autoInitialize) {
      this.initialize().catch(error => {
        this.log('Auto-initialization failed:', error);
        this.emitError('Auto-initialization failed', error);
      });
    }
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Initialize all systems in the correct order
   */
  async initialize(): Promise<InitializationResult> {
    // Return existing promise if already initializing
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    const startTime = performance.now();
    this.state.startedAt = startTime;
    this.state.stage = 'initializing';

    this.log('[Integration] Starting initialization...');

    this.emit({
      type: 'initialization_started',
      timestamp: Date.now(),
      data: { config: this.config },
    });

    // Create initialization promise
    this.initializationPromise = this.runInitialization(startTime);

    try {
      const result = await this.initializationPromise;

      if (result.success) {
        this.state.stage = 'ready';
        this.state.completedAt = performance.now();
        this.capabilities = result.capabilities;

        this.log('[Integration] Initialization complete in', result.duration, 'ms');

        this.emit({
          type: 'initialization_complete',
          timestamp: Date.now(),
          data: result,
        });
      } else {
        this.state.stage = 'failed';
        this.state.completedAt = performance.now();

        this.log('[Integration] Initialization failed:', result.error);

        this.emit({
          type: 'initialization_failed',
          timestamp: Date.now(),
          data: result,
        });
      }

      return result;
    } catch (error) {
      this.state.stage = 'failed';
      this.state.completedAt = performance.now();
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.log('[Integration] Initialization error:', errorMessage);

      this.emitError('Initialization failed', error);

      return {
        success: false,
        state: this.getState(),
        capabilities: this.capabilities,
        error: errorMessage,
        duration: performance.now() - startTime,
      };
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Get current integration state
   */
  getState(): IntegrationState {
    return { ...this.state };
  }

  /**
   * Get current capabilities
   */
  getCapabilities(): Capabilities {
    return { ...this.capabilities };
  }

  /**
   * Run full diagnostic suite
   */
  async runDiagnostics(): Promise<DiagnosticResults> {
    const startTime = performance.now();

    this.log('[Integration] Running diagnostics...');

    this.emit({
      type: 'diagnostics_started',
      timestamp: Date.now(),
      data: {},
    });

    const systemDiagnostics = {
      hardware: await this.diagnoseHardware(),
      native: await this.diagnoseNative(),
      flags: await this.diagnoseFlags(),
      benchmarks: await this.diagnoseBenchmarks(),
    };

    // Determine overall health
    const healthStatuses = Object.values(systemDiagnostics).map(d => d.health);
    let health: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (healthStatuses.includes('unhealthy')) {
      health = 'unhealthy';
    } else if (healthStatuses.includes('degraded')) {
      health = 'degraded';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(systemDiagnostics);

    const results: DiagnosticResults = {
      timestamp: Date.now(),
      health,
      systems: systemDiagnostics,
      recommendations,
      duration: performance.now() - startTime,
    };

    this.log('[Integration] Diagnostics complete:', health);

    this.emit({
      type: 'diagnostics_complete',
      timestamp: Date.now(),
      data: results,
    });

    return results;
  }

  /**
   * Add event listener
   * @returns Unsubscribe function to remove the listener
   */
  on(eventType: IntegrationEvent['type'], listener: (event: IntegrationEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);

    // Return unsubscribe function
    return () => {
      this.off(eventType, listener);
    };
  }

  /**
   * Remove event listener
   */
  off(eventType: IntegrationEvent['type'], listener: (event: IntegrationEvent) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Cleanup all event listeners and reset state
   * Call this when destroying the IntegrationManager to prevent memory leaks
   */
  cleanup(): void {
    // Clear all event listeners
    this.listeners.clear();

    // Reset initialization promise
    this.initializationPromise = null;

    // Reset state
    this.state = this.createInitialState();

    // Clear feature flag manager
    this.featureFlagManager = null;

    this.log('[Integration] Cleaned up');
  }

  /**
   * Check if a specific feature flag is enabled
   */
  isFeatureEnabled(featureId: string): boolean {
    if (!this.featureFlagManager) {
      this.log('[Integration] Feature flag manager not initialized');
      return false;
    }

    try {
      return this.featureFlagManager.isEnabled(featureId);
    } catch (error) {
      this.log('[Integration] Error checking feature flag:', error);
      return false;
    }
  }

  /**
   * Get enabled features
   */
  getEnabledFeatures(): string[] {
    if (!this.featureFlagManager) {
      return [];
    }

    try {
      return this.featureFlagManager.getEnabledFeatures();
    } catch (error) {
      this.log('[Integration] Error getting enabled features:', error);
      return [];
    }
  }

  // ==========================================================================
  // PRIVATE METHODS - INITIALIZATION
  // ==========================================================================

  private createInitialState(): IntegrationState {
    const createStatus = (): SystemStatus => ({
      stage: 'pending',
      active: false,
    });

    return {
      startedAt: 0,
      stage: 'initializing',
      systems: {
        hardware: createStatus(),
        native: createStatus(),
        flags: createStatus(),
        benchmarks: createStatus(),
      },
      progress: {
        total: 4,
        completed: 0,
        failed: 0,
        percentage: 0,
        current: '',
        eta: 0,
      },
    };
  }

  private async runInitialization(startTime: number): Promise<InitializationResult> {
    const initializationOrder = [
      { name: 'hardware', init: () => this.initializeHardware() },
      { name: 'native', init: () => this.initializeNative() },
      { name: 'flags', init: () => this.initializeFlags() },
      { name: 'benchmarks', init: () => this.initializeBenchmarks() },
    ] as const;

    for (const { name, init } of initializationOrder) {
      const systemStart = performance.now();

      // Update progress
      this.updateProgress(name);

      // Update system status
      this.updateSystemStatus(name, {
        stage: 'initializing',
        startedAt: systemStart,
        active: true,
      });

      try {
        await init();

        const initTime = performance.now() - systemStart;
        this.state.progress.completed++;

        this.updateSystemStatus(name, {
          stage: 'ready',
          completedAt: performance.now(),
          initTime,
          active: true,
        });

        this.log(`[Integration] ${name} initialized in ${initTime.toFixed(2)}ms`);
      } catch (error) {
        const initTime = performance.now() - systemStart;
        this.state.progress.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);

        this.updateSystemStatus(name, {
          stage: 'failed',
          completedAt: performance.now(),
          initTime,
          error: errorMessage,
          active: false,
        });

        this.log(`[Integration] ${name} initialization failed:`, errorMessage);

        // Don't throw - continue with other systems
      }

      // Update progress percentage
      this.state.progress.percentage = (this.state.progress.completed / this.state.progress.total) * 100;
    }

    // Build capabilities
    const capabilities = await this.buildCapabilities();

    const duration = performance.now() - startTime;

    // Check if we had any critical failures
    const hasCriticalFailure =
      this.state.systems.hardware.stage === 'failed' ||
      this.state.systems.flags.stage === 'failed';

    return {
      success: !hasCriticalFailure,
      state: this.getState(),
      capabilities,
      duration,
    };
  }

  private async initializeHardware(): Promise<void> {
    this.log('[Integration] Initializing hardware detection...');

    const result = await getHardwareInfo(this.config.hardwareDetection);

    if (!result.success || !result.profile) {
      throw new Error(result.error || 'Hardware detection failed');
    }

    this.log('[Integration] Hardware profile:', {
      performanceScore: result.profile.performanceScore,
      performanceClass: result.profile.performanceClass,
      cpu: result.profile.cpu.cores,
      memory: result.profile.memory.totalGB,
    });
  }

  private async initializeNative(): Promise<void> {
    this.log('[Integration] Initializing native WASM bridge...');

    // Non-blocking initialization - let it load in background
    const wasmLoaded = await Promise.race([
      loadWasmModule(),
      new Promise<boolean>(resolve => setTimeout(() => resolve(false), 5000)),
    ]);

    if (!wasmLoaded) {
      this.log('[Integration] WASM not available, using JS fallback');
    } else {
      const features = getWasmFeatures();
      this.log('[Integration] WASM loaded:', {
        supported: features.supported,
        simd: features.simd,
      });
    }
  }

  private async initializeFlags(): Promise<void> {
    this.log('[Integration] Initializing feature flags...');

    this.featureFlagManager = await initializeFeatureFlags({
      debug: this.config.debug,
      trackMetrics: this.config.trackMetrics,
      autoPerformanceGate: this.config.featureFlags.autoPerformanceGate,
      performanceThreshold: this.config.featureFlags.performanceThreshold,
    });

    const enabledFeatures = this.featureFlagManager.getEnabledFeatures();
    this.log('[Integration] Feature flags initialized:', {
      enabled: enabledFeatures.length,
      total: enabledFeatures.length,
    });
  }

  private async initializeBenchmarks(): Promise<void> {
    if (!this.config.runBenchmarks) {
      this.log('[Integration] Benchmarks skipped (not configured to run)');
      this.updateSystemStatus('benchmarks', {
        stage: 'disabled',
        active: false,
      });
      return;
    }

    this.log('[Integration] Running benchmark suite...');

    // Benchmarks are expensive, so we run them with a timeout
    const suite = getBenchmarkSuite();

    const result = await Promise.race([
      suite.runAll({
        skipExpensive: true,
        onProgress: progress => {
          this.log(`[Integration] Benchmark progress: ${progress.progress.toFixed(1)}%`);
        },
      }),
      new Promise<BenchmarkSuiteResult>((_, reject) =>
        setTimeout(() => reject(new Error('Benchmark timeout')), 10000)
      ),
    ]);

    this.log('[Integration] Benchmarks complete:', {
      overallScore: (result as any).overallScore,
      recommendations: (result as any).recommendations?.length || 0,
    });
  }

  private async buildCapabilities(): Promise<Capabilities> {
    const capabilities: Capabilities = {
      usingWasm: isUsingWasm(),
      systemScore: 50,
      featureFlags: {
        enabled: [],
        disabled: [],
        results: new Map(),
      },
    };

    // Get hardware capabilities
    try {
      const hardwareResult = await getHardwareInfo(this.config.hardwareDetection);
      if (hardwareResult.success && hardwareResult.profile) {
        capabilities.hardware = hardwareResult.profile;
        capabilities.performanceClass = hardwareResult.profile.performanceClass;
        capabilities.systemScore = hardwareResult.profile.performanceScore;
      }
    } catch (error) {
      this.log('[Integration] Error getting hardware info:', error);
    }

    // Get WASM features
    try {
      capabilities.wasmFeatures = getWasmFeatures();
      capabilities.usingWasm = isUsingWasm();
    } catch (error) {
      this.log('[Integration] Error getting WASM features:', error);
    }

    // Get feature flags
    if (this.featureFlagManager) {
      try {
        capabilities.hardwareCapabilities = this.featureFlagManager.getHardwareCapabilities();
        capabilities.featureFlags.enabled = this.featureFlagManager.getEnabledFeatures();
        capabilities.featureFlags.disabled = this.featureFlagManager.getDisabledFeatures();

        // Get all feature evaluation results
        const allFeatures = [
          'messenger',
          'knowledge',
          'ai-chat',
          'advanced-search',
          'offline-mode',
          'analytics',
        ];
        for (const featureId of allFeatures) {
          try {
            const result = this.featureFlagManager.evaluate(featureId);
            capabilities.featureFlags.results.set(featureId, result);
          } catch {
            // Feature might not exist, skip
          }
        }
      } catch (error) {
        this.log('[Integration] Error getting feature flags:', error);
      }
    }

    return capabilities;
  }

  // ==========================================================================
  // PRIVATE METHODS - DIAGNOSTICS
  // ==========================================================================

  private async diagnoseHardware(): Promise<SystemDiagnostic> {
    const checks = [];
    const startTime = performance.now();

    try {
      const result = await getHardwareInfo({ detailedGPU: false, checkQuota: false });

      checks.push({
        name: 'hardware_detection',
        passed: result.success,
        value: result.success ? result.profile : undefined,
        duration: performance.now() - startTime,
      });

      if (result.success && result.profile) {
        checks.push({
          name: 'performance_score',
          passed: result.profile.performanceScore > 30,
          value: result.profile.performanceScore,
          expected: '> 30',
          duration: 0,
        });

        checks.push({
          name: 'feature_support',
          passed: result.profile.features.webassembly && result.profile.features.webWorkers,
          value: result.profile.features,
          duration: 0,
        });
      }

      const allPassed = checks.every(c => c.passed);

      return {
        name: 'Hardware Detection',
        health: allPassed ? 'healthy' : result.success ? 'degraded' : 'unhealthy',
        checks,
        message: result.success
          ? `Hardware profile loaded (score: ${result.profile?.performanceScore})`
          : 'Hardware detection failed',
      };
    } catch (error) {
      return {
        name: 'Hardware Detection',
        health: 'unhealthy',
        checks: [],
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async diagnoseNative(): Promise<SystemDiagnostic> {
    const checks = [];
    const startTime = performance.now();

    try {
      const features = getWasmFeatures();
      const usingWasm = isUsingWasm();

      checks.push({
        name: 'wasm_support',
        passed: features.supported,
        value: features,
        duration: performance.now() - startTime,
      });

      checks.push({
        name: 'wasm_loaded',
        passed: usingWasm || !features.supported,
        value: usingWasm,
        expected: 'true if supported',
        duration: 0,
      });

      const allPassed = checks.every(c => c.passed);

      return {
        name: 'Native Bridge',
        health: allPassed ? 'healthy' : 'degraded',
        checks,
        message: usingWasm
          ? 'WASM acceleration active'
          : features.supported
            ? 'WASM supported but not loaded (using JS fallback)'
            : 'WASM not supported (using JS fallback)',
      };
    } catch (error) {
      return {
        name: 'Native Bridge',
        health: 'degraded',
        checks: [],
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async diagnoseFlags(): Promise<SystemDiagnostic> {
    const checks = [];
    const startTime = performance.now();

    if (!this.featureFlagManager) {
      return {
        name: 'Feature Flags',
        health: 'unhealthy',
        checks: [],
        message: 'Feature flag manager not initialized',
      };
    }

    try {
      const hardware = this.featureFlagManager.getHardwareCapabilities();
      const enabled = this.featureFlagManager.getEnabledFeatures();
      const disabled = this.featureFlagManager.getDisabledFeatures();

      checks.push({
        name: 'manager_initialized',
        passed: true,
        value: { hardware, enabledCount: enabled.length },
        duration: performance.now() - startTime,
      });

      checks.push({
        name: 'hardware_capabilities',
        passed: hardware.score > 0,
        value: hardware,
        duration: 0,
      });

      const allPassed = checks.every(c => c.passed);

      return {
        name: 'Feature Flags',
        health: allPassed ? 'healthy' : 'degraded',
        checks,
        message: `${enabled.length} features enabled, ${disabled.length} disabled`,
      };
    } catch (error) {
      return {
        name: 'Feature Flags',
        health: 'unhealthy',
        checks: [],
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async diagnoseBenchmarks(): Promise<SystemDiagnostic> {
    const startTime = performance.now();

    if (this.state.systems.benchmarks.stage === 'disabled') {
      return {
        name: 'Benchmarks',
        health: 'healthy',
        checks: [
          {
            name: 'benchmarks_status',
            passed: true,
            value: 'disabled',
            duration: performance.now() - startTime,
          },
        ],
        message: 'Benchmarks are disabled (not run during initialization)',
      };
    }

    if (this.state.systems.benchmarks.stage !== 'ready') {
      return {
        name: 'Benchmarks',
        health: 'degraded',
        checks: [],
        message: `Benchmarks not run (${this.state.systems.benchmarks.stage})`,
      };
    }

    return {
      name: 'Benchmarks',
      health: 'healthy',
      checks: [
        {
          name: 'benchmarks_completed',
          passed: true,
          duration: performance.now() - startTime,
        },
      ],
      message: 'Benchmarks completed successfully',
    };
  }

  private generateRecommendations(systemDiagnostics: DiagnosticResults['systems']): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const [systemName, diagnostic] of Object.entries(systemDiagnostics)) {
      if (diagnostic.health === 'unhealthy') {
        recommendations.push({
          priority: 'high',
          system: systemName,
          recommendation: `System ${systemName} is unhealthy and may not function correctly`,
          impact: 'high',
          action: 'Check browser compatibility and console for errors',
        });
      } else if (diagnostic.health === 'degraded') {
        recommendations.push({
          priority: 'medium',
          system: systemName,
          recommendation: `System ${systemName} is running in degraded mode`,
          impact: 'medium',
          action: diagnostic.message,
        });
      }
    }

    return recommendations;
  }

  // ==========================================================================
  // PRIVATE METHODS - STATE MANAGEMENT
  // ==========================================================================

  private updateSystemStatus(
    system: keyof IntegrationState['systems'],
    updates: Partial<SystemStatus>
  ): void {
    const previousStatus = { ...this.state.systems[system] };
    this.state.systems[system] = {
      ...this.state.systems[system],
      ...updates,
    };

    this.emit({
      type: 'system_status_changed',
      timestamp: Date.now(),
      data: {
        system,
        status: this.state.systems[system],
        previousStatus,
      } as any,
    });
  }

  private updateProgress(system: string): void {
    const progress: InitializationProgress = {
      ...this.state.progress,
      current: system,
      eta: 0, // TODO: Calculate ETA
    };

    this.state.progress = progress;

    this.emit({
      type: 'initialization_progress',
      timestamp: Date.now(),
      data: {
        progress,
        system: system as keyof IntegrationState['systems'],
      } as any,
    });
  }

  // ==========================================================================
  // PRIVATE METHODS - EVENTS
  // ==========================================================================

  private emit(event: IntegrationEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`[Integration] Error in event listener for ${event.type}:`, error);
        }
      });
    }

    // Also emit to wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('[Integration] Error in wildcard event listener:', error);
        }
      });
    }
  }

  private emitError(message: string, details?: unknown): void {
    this.emit({
      type: 'error',
      timestamp: Date.now(),
      data: {
        error: message,
        details,
      } as any,
    });
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[Integration]', ...args);
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let globalManager: IntegrationManager | null = null;

/**
 * Get the global integration manager instance
 */
export function getIntegrationManager(config?: IntegrationConfig): IntegrationManager {
  if (!globalManager) {
    globalManager = new IntegrationManager(config);
  }
  return globalManager;
}

/**
 * Reset the global integration manager (useful for testing)
 */
export function resetIntegrationManager(): void {
  globalManager = null;
}
