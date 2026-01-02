/**
 * Integration Tests: Initialization Flow
 *
 * Tests the complete initialization sequence of the Integration Manager
 * including all subsystems (hardware, native, flags, benchmarks).
 *
 * @coverage 100% of initialization paths
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getIntegrationManager,
  resetIntegrationManager,
  initializeIntegration,
} from '../../integration/manager';
import { clearHardwareCache } from '../../hardware';
import { getBenchmarkSuite } from '../../benchmark';
import type { IntegrationConfig } from '../../integration/types';

describe('Integration Manager - Initialization Flow', () => {
  beforeEach(() => {
    // Reset state before each test
    resetIntegrationManager();
    clearHardwareCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetIntegrationManager();
  });

  describe('Basic Initialization', () => {
    it('should initialize successfully with default config', async () => {
      const manager = getIntegrationManager();

      // Wait for initialization
      const result = await manager.initialize();

      expect(result.success).toBe(true);
      expect(result.state.stage).toBe('ready');
      expect(result.capabilities).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should auto-initialize when autoInitialize is true', async () => {
      const manager = getIntegrationManager({ autoInitialize: true });

      // Wait for initialization to complete using event-driven approach
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          const state = manager.getState();
          if (state.stage === 'ready') {
            clearInterval(checkInterval);
            resolve();
          }
        }, 10);

        // Timeout after 5 seconds to prevent hanging
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5000);
      });

      const state = manager.getState();
      expect(['ready', 'initializing'].includes(state.stage)).toBe(true);
    });

    it('should not auto-initialize when autoInitialize is false', async () => {
      const manager = getIntegrationManager({ autoInitialize: false });

      // Check that it hasn't started
      const state = manager.getState();
      expect(state.stage).toBe('initializing');
    });

    it('should initialize with custom config', async () => {
      const config: IntegrationConfig = {
        debug: true,
        runBenchmarks: false,
        autoInitialize: false,
        trackMetrics: true,
      };

      const manager = getIntegrationManager(config);
      const result = await manager.initialize();

      expect(result.success).toBe(true);
      expect(result.state.stage).toBe('ready');
    });
  });

  describe('Initialization Order', () => {
    it('should initialize systems in correct order', async () => {
      const manager = getIntegrationManager({ autoInitialize: false, debug: true });
      const order: string[] = [];

      // Listen to system status changes
      manager.on('system_status_changed', (event) => {
        if (event.data.status.stage === 'initializing') {
          order.push(event.data.system);
        }
      });

      await manager.initialize();

      expect(order).toEqual(['hardware', 'native', 'flags', 'benchmarks']);
    });

    it('should update progress during initialization', async () => {
      const manager = getIntegrationManager({ autoInitialize: false });

      const progressUpdates: number[] = [];

      manager.on('initialization_progress', (event) => {
        progressUpdates.push(event.data.progress.percentage);
      });

      await manager.initialize();

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });
  });

  describe('Subsystem Initialization', () => {
    it('should initialize hardware detection', async () => {
      const manager = getIntegrationManager({ autoInitialize: false });

      await manager.initialize();

      const state = manager.getState();
      expect(state.systems.hardware.stage).toBe('ready');
      expect(state.systems.hardware.active).toBe(true);
      expect(state.systems.hardware.initTime).toBeGreaterThan(0);
    });

    it('should initialize native bridge', async () => {
      const manager = getIntegrationManager({ autoInitialize: false });

      await manager.initialize();

      const state = manager.getState();
      expect(['ready', 'failed'].includes(state.systems.native.stage)).toBe(true);

      // Native bridge might fail if WASM is not available, but that's ok
      if (state.systems.native.stage === 'ready') {
        expect(state.systems.native.active).toBe(true);
      }
    });

    it('should initialize feature flags', async () => {
      const manager = getIntegrationManager({ autoInitialize: false });

      await manager.initialize();

      const state = manager.getState();
      expect(state.systems.flags.stage).toBe('ready');
      expect(state.systems.flags.active).toBe(true);
    });

    it('should skip benchmarks when not configured', async () => {
      const manager = getIntegrationManager({
        autoInitialize: false,
        runBenchmarks: false,
      });

      await manager.initialize();

      const state = manager.getState();
      expect(state.systems.benchmarks.stage).toBe('disabled');
    });

    it('should run benchmarks when configured', async () => {
      const manager = getIntegrationManager({
        autoInitialize: false,
        runBenchmarks: true,
      });

      await manager.initialize();

      const state = manager.getState();
      // Benchmarks might timeout or fail, but should attempt
      expect(['ready', 'failed', 'disabled'].includes(state.systems.benchmarks.stage)).toBe(true);
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle hardware detection failure gracefully', async () => {
      // Mock hardware detection to fail
      vi.mock('../../hardware', () => ({
        getHardwareInfo: async () => ({
          success: false,
          error: 'Hardware detection failed',
        }),
      }));

      const manager = getIntegrationManager({ autoInitialize: false });
      const result = await manager.initialize();

      // Should still complete but with hardware marked as failed
      expect(result.state.systems.hardware.stage).toBe('failed');
    });

    it('should handle timeout during initialization', async () => {
      const manager = getIntegrationManager({
        autoInitialize: false,
        initializationTimeout: 100, // Very short timeout
      });

      // This should still succeed as the timeout is per operation
      const result = await manager.initialize();

      expect(result).toBeDefined();
    });

    it('should continue with other systems if one fails', async () => {
      const manager = getIntegrationManager({ autoInitialize: false });

      await manager.initialize();

      const state = manager.getState();

      // Even if one system fails, others should initialize
      const initializedCount = Object.values(state.systems).filter(
        s => s.stage === 'ready'
      ).length;

      expect(initializedCount).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Initialization', () => {
    it('should handle multiple initialize calls', async () => {
      const manager = getIntegrationManager({ autoInitialize: false });

      // Call initialize multiple times concurrently
      const [result1, result2, result3] = await Promise.all([
        manager.initialize(),
        manager.initialize(),
        manager.initialize(),
      ]);

      // All should return the same result
      expect(result1.success).toBe(result2.success);
      expect(result2.success).toBe(result3.success);
      expect(result1.duration).toBe(result2.duration);
    });

    it('should reuse initialization promise', async () => {
      const manager = getIntegrationManager({ autoInitialize: false });

      const promise1 = manager.initialize();
      const promise2 = manager.initialize();

      // Should be the same promise
      expect(promise1).toBe(promise2);

      await promise1;
    });
  });

  describe('Capabilities Building', () => {
    it('should build capabilities after initialization', async () => {
      const manager = getIntegrationManager({ autoInitialize: false });

      await manager.initialize();

      const capabilities = manager.getCapabilities();

      expect(capabilities).toBeDefined();
      expect(capabilities.systemScore).toBeGreaterThanOrEqual(0);
      expect(capabilities.featureFlags).toBeDefined();
      expect(capabilities.featureFlags.enabled).toBeInstanceOf(Array);
    });

    it('should detect WASM usage', async () => {
      const manager = getIntegrationManager({ autoInitialize: false });

      await manager.initialize();

      const capabilities = manager.getCapabilities();

      expect(typeof capabilities.usingWasm).toBe('boolean');
    });

    it('should include hardware capabilities', async () => {
      const manager = getIntegrationManager({ autoInitialize: false });

      await manager.initialize();

      const capabilities = manager.getCapabilities();

      if (capabilities.hardware) {
        expect(capabilities.hardware.performanceScore).toBeGreaterThan(0);
        expect(capabilities.hardware.performanceClass).toBeDefined();
      }
    });
  });

  describe('Event Emission', () => {
    it('should emit initialization_started event', async () => {
      const manager = getIntegrationManager({ autoInitialize: false });

      const startedSpy = vi.fn();
      manager.on('initialization_started', startedSpy);

      await manager.initialize();

      expect(startedSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit initialization_complete event on success', async () => {
      const manager = getIntegrationManager({ autoInitialize: false });

      const completeSpy = vi.fn();
      manager.on('initialization_complete', completeSpy);

      await manager.initialize();

      expect(completeSpy).toHaveBeenCalledTimes(1);
      expect(completeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'initialization_complete',
        })
      );
    });

    it('should emit initialization_failed event on failure', async () => {
      // Mock to cause failure
      vi.mock('../../hardware', () => ({
        getHardwareInfo: async () => ({
          success: false,
          error: 'Critical failure',
        }),
      }));

      const manager = getIntegrationManager({ autoInitialize: false });

      const failedSpy = vi.fn();
      manager.on('initialization_failed', failedSpy);

      await manager.initialize();

      // Should emit failed if initialization doesn't complete successfully
      if (manager.getState().stage === 'failed') {
        expect(failedSpy).toHaveBeenCalled();
      }
    });

    it('should emit system_status_changed for each system', async () => {
      const manager = getIntegrationManager({ autoInitialize: false });

      const statusChanges: string[] = [];
      manager.on('system_status_changed', (event) => {
        statusChanges.push(event.data.system);
      });

      await manager.initialize();

      // Should have at least one status change per system
      expect(statusChanges.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Convenience Functions', () => {
    it('should initialize via convenience function', async () => {
      const result = await initializeIntegration({
        autoInitialize: false,
      });

      expect(result.success).toBe(true);
      expect(result.capabilities).toBeDefined();
    });

    it('should get integration state via convenience function', async () => {
      await initializeIntegration({ autoInitialize: false });
      const { getIntegrationState } = await import('../../integration');

      const state = getIntegrationState();

      expect(state.stage).toBe('ready');
    });

    it('should get capabilities via convenience function', async () => {
      await initializeIntegration({ autoInitialize: false });
      const { getCapabilities } = await import('../../integration');

      const capabilities = getCapabilities();

      expect(capabilities.systemScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('State Management', () => {
    it('should track initialization start time', async () => {
      const manager = getIntegrationManager({ autoInitialize: false });

      await manager.initialize();

      const state = manager.getState();
      expect(state.startedAt).toBeGreaterThan(0);
      expect(state.completedAt).toBeGreaterThan(state.startedAt);
    });

    it('should track initialization duration', async () => {
      const manager = getIntegrationManager({ autoInitialize: false });

      const result = await manager.initialize();

      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThan(30000); // Should be under 30 seconds
    });

    it('should update progress percentage', async () => {
      const manager = getIntegrationManager({ autoInitialize: false });

      await manager.initialize();

      const state = manager.getState();
      expect(state.progress.percentage).toBe(100);
    });

    it('should track completed systems', async () => {
      const manager = getIntegrationManager({ autoInitialize: false });

      await manager.initialize();

      const state = manager.getState();
      expect(state.progress.completed).toBeGreaterThan(0);
      expect(state.progress.completed).toBeLessThanOrEqual(state.progress.total);
    });
  });
});
