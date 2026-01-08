/**
 * Recovery Strategies
 *
 * Automatic recovery strategies for common error scenarios.
 * Provides fallback behaviors and graceful degradation.
 */

import {
  WasmError,
  QuotaError,
  HardwareDetectionError,
  CapabilityError,
  NetworkError,
  TimeoutError,
} from './types';
import {
  log,
  registerRecoveryActions,
} from './handler';

// ============================================================================
// WASM RECOVERY STRATEGY
// ============================================================================

/**
 * Recovery strategy for WASM failures
 *
 * When WASM modules fail to load, fall back to JavaScript implementations.
 * This provides a seamless experience with reduced performance.
 */
export class WasmRecoveryStrategy {
  private fallbackCache = new Map<string, unknown>();

  /**
   * Get JavaScript fallback for a WASM module
   */
  async getFallback(moduleName: string): Promise<unknown> {
    // Check cache first
    if (this.fallbackCache.has(moduleName)) {
      return this.fallbackCache.get(moduleName);
    }

    // Log the fallback
    log(new WasmError(`WASM module ${moduleName} unavailable, using JS fallback`, {
      severity: 'low',
      recovery: 'fallback',
      userMessage: `Using JavaScript fallback for ${moduleName}`,
      context: { moduleName },
    }));

    // Load JavaScript fallback
    try {
      const fallback = await this.loadJsFallback(moduleName);
      this.fallbackCache.set(moduleName, fallback);
      return fallback;
    } catch (error) {
      log(error, { component: 'WasmRecoveryStrategy', operation: 'loadJsFallback' } as any);
      throw error;
    }
  }

  /**
   * Load JavaScript fallback implementation
   */
  private async loadJsFallback(moduleName: string): Promise<unknown> {
    // This would dynamically import the JS fallback
    // For now, return a placeholder
    switch (moduleName) {
      case 'vector-search':
        return {
          search: async () => {
            console.log('Using JS fallback for vector search');
            return [];
          },
        };

      case 'audio-processor':
        return {
          process: async (audio: AudioBuffer) => {
            console.log('Using JS fallback for audio processing');
            return audio;
          },
        };

      default:
        throw new Error(`No JS fallback available for ${moduleName}`);
    }
  }

  /**
   * Check if WASM is available
   */
  isWasmAvailable(): boolean {
    return typeof WebAssembly === 'object';
  }

  /**
   * Check if specific WASM features are available
   */
  checkWasmFeatures(): {
    simd: boolean;
    threads: boolean;
    bulkMemory: boolean;
    exceptions: boolean;
  } {
    if (!this.isWasmAvailable()) {
      return { simd: false, threads: false, bulkMemory: false, exceptions: false };
    }

    // Check SIMD
    let simd = false;
    try {
      simd = WebAssembly.validate(
        new Uint8Array([
          0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
          0x01, 0x05, 0x01, 0x00, 0x01, 0x00,
          0x03, 0x02, 0x01, 0x00,
          0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0xfd, 0x0f, 0xfd, 0x0c, 0x0b
        ])
      );
    } catch {}

    return {
      simd,
      threads: typeof SharedArrayBuffer !== 'undefined',
      bulkMemory: true, // Assume available in modern browsers
      exceptions: true, // Assume available in modern browsers
    };
  }
}

// ============================================================================
// STORAGE RECOVERY STRATEGY
// ============================================================================

/**
 * Recovery strategy for storage errors
 *
 * Handles quota exceeded, database corruption, and permission issues.
 */
export class StorageRecoveryStrategy {
  /**
   * Check storage quota and warn if approaching limit
   */
  async checkStorageQuota(): Promise<{
    usage: number;
    quota: number;
    usagePercentage: number;
    warningThreshold: number;
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const usagePercentage = quota > 0 ? (usage / quota) * 100 : 0;

        // Warn if above 80%
        if (usagePercentage > 80) {
          log(new QuotaError(usage, quota, {
            severity: usagePercentage > 95 ? 'critical' : 'high',
            recovery: 'degraded',
            userMessage: `Storage is ${usagePercentage.toFixed(0)}% full. Consider clearing old data.`,
          }));
        }

        return {
          usage,
          quota,
          usagePercentage,
          warningThreshold: 80,
        };
      } catch (error) {
        log(error, { component: 'StorageRecoveryStrategy', operation: 'checkStorageQuota' } as any);
      }
    }

    // Default values if API not available
    return {
      usage: 0,
      quota: 0,
      usagePercentage: 0,
      warningThreshold: 80,
    };
  }

  /**
   * Attempt to recover storage space
   */
  async recoverSpace(_targetBytes: number): Promise<number> {
    let recovered = 0;

    // Strategy 1: Clear old cached data
    recovered += await this.clearOldCache();

    // Strategy 2: Compact old conversations
    recovered += await this.compactOldConversations();

    // Strategy 3: Clear temporary data
    recovered += await this.clearTemporaryData();

    return recovered;
  }

  /**
   * Clear old cached data
   */
  private async clearOldCache(): Promise<number> {
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cacheNames = await caches.keys();
        let cleared = 0;

        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();

          for (const request of keys) {
            // Delete entries older than 7 days
            const cacheDate = new Date(request.headers.get('date') || '');
            const age = Date.now() - cacheDate.getTime();
            const sevenDays = 7 * 24 * 60 * 60 * 1000;

            if (age > sevenDays) {
              await cache.delete(request);
              cleared++;
            }
          }
        }

        return cleared;
      } catch (error) {
        log(error, { component: 'StorageRecoveryStrategy', operation: 'clearOldCache' } as any);
      }
    }

    return 0;
  }

  /**
   * Compact old conversations
   */
  private async compactOldConversations(): Promise<number> {
    try {
      const conversations = await this.listOldConversations(30); // Older than 30 days
      let compacted = 0;

      for (const conversation of conversations) {
        if (conversation.metadata.messageCount > 100) {
          // This would trigger compaction
          // For now, just count
          compacted++;
        }
      }

      return compacted;
    } catch (error) {
      log(error, { component: 'StorageRecoveryStrategy', operation: 'compactOldConversations' } as any);
      return 0;
    }
  }

  /**
   * Clear temporary data
   */
  private async clearTemporaryData(): Promise<number> {
    try {
      // Clear session storage
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.clear();
      }

      // Clear temp keys from localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        const tempKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('temp_')) {
            tempKeys.push(key);
          }
        }

        tempKeys.forEach(key => localStorage.removeItem(key));
        return tempKeys.length;
      }
    } catch (error) {
      log(error, { component: 'StorageRecoveryStrategy', operation: 'clearTemporaryData' } as any);
    }

    return 0;
  }

  /**
   * List old conversations (helper method)
   */
  private async listOldConversations(_daysOld: number): Promise<any[]> {
    // This would query the conversation store
    // For now, return empty array
    return [];
  }

  /**
   * Request more storage quota
   */
  async requestQuota(requestedBytes: number): Promise<boolean> {
    if (typeof navigator !== 'undefined' && 'storage' in navigator && 'requestPersistent' in navigator.storage) {
      try {
        // @ts-ignore - experimental API
        const granted = await navigator.storage.requestPersistent();
        return granted;
      } catch (error) {
        log(error, { component: 'StorageRecoveryStrategy', operation: 'requestQuota' } as any);
      }
    }

    // Chrome-specific quota management
    if (typeof navigator !== 'undefined' && 'webkitStorageInfo' in navigator) {
      // @ts-ignore - deprecated but may still work
      return new Promise((resolve) => {
        // @ts-ignore
        navigator.webkitStorageInfo.requestQuota(
          (window as any).PERSISTENT,
          requestedBytes,
          (grantedBytes: number) => resolve(grantedBytes > 0),
          () => resolve(false)
        );
      });
    }

    return false;
  }
}

// ============================================================================
// HARDWARE RECOVERY STRATEGY
// ============================================================================

/**
 * Recovery strategy for hardware detection failures
 *
 * Provides sensible defaults when hardware detection fails.
 */
export class HardwareRecoveryStrategy {
  private defaults = {
    cpu: {
      cores: 4,
      concurrency: 4,
      architecture: undefined,
      simd: { supported: false },
      wasm: {
        supported: typeof WebAssembly === 'object',
        simd: false,
        threads: false,
        bulkMemory: false,
        exceptions: false,
      },
    },
    gpu: {
      available: false,
      webgpu: { supported: false },
      webgl: { supported: false, version: 0 },
    },
    memory: {
      totalGB: 4,
      hasMemoryAPI: false,
      jsHeap: undefined,
    },
    storage: {
      indexedDB: {
        supported: typeof window !== 'undefined' && !!window.indexedDB,
        available: typeof window !== 'undefined' && !!window.indexedDB,
      },
    },
    network: {
      hasNetworkAPI: false,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    },
  };

  /**
   * Get default hardware profile
   */
  getDefaults(): unknown {
    return { ...this.defaults };
  }

  /**
   * Detect with fallback to defaults
   */
  async detectWithFallback<T>(detectionFn: () => Promise<T>, defaultFallback: T): Promise<T> {
    try {
      return await detectionFn();
    } catch (error) {
      log(new HardwareDetectionError('Hardware detection failed, using defaults', {
        technicalDetails: error instanceof Error ? error.message : String(error),
      }));

      return defaultFallback;
    }
  }

  /**
   * Estimate performance score from basic info
   */
  estimatePerformanceScore(): number {
    let score = 50; // Base score

    // CPU cores
    const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
    score += Math.min((cores / 16) * 20, 20);

    // Memory (rough estimate)
    const memory = typeof navigator !== 'undefined' ? ((navigator as any).deviceMemory || 4) : 4;
    score += Math.min((memory / 16) * 20, 20);

    // GPU (assume available if WebGL exists)
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      if (gl) {
        score += 20;
      }
    }

    // Network
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      score += 10;
    }

    return Math.min(Math.round(score), 100);
  }
}

// ============================================================================
// NETWORK RECOVERY STRATEGY
// ============================================================================

/**
 * Recovery strategy for network errors
 *
 * Handles offline mode and request retries.
 */
export class NetworkRecoveryStrategy {
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  /**
   * Fetch with automatic retry
   */
  async fetchWithRetry(
    url: string,
    options?: RequestInit,
    retries: number = this.maxRetries
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);

      // Retry on 5xx errors
      if (response.status >= 500 && retries > 0) {
        throw new Error(`Server error: ${response.status}`);
      }

      return response;
    } catch (error) {
      if (retries > 0 && (typeof navigator === 'undefined' || navigator.onLine)) {
        // Wait before retrying
        await this.delay(this.retryDelay * (this.maxRetries - retries + 1));
        return this.fetchWithRetry(url, options, retries - 1);
      }

      throw new NetworkError(`Failed to fetch ${url}`, {
        url,
        context: { retries: this.maxRetries - retries },
      });
    }
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }

  /**
   * Wait for connection
   */
  async waitForConnection(timeout: number = 30000): Promise<boolean> {
    if (typeof navigator === 'undefined' || navigator.onLine) return true;

    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      const handler = () => {
        window.removeEventListener('online', handler);
        resolve(true);
      };

      window.addEventListener('online', handler);

      // Timeout
      setTimeout(() => {
        window.removeEventListener('online', handler);
        resolve(false);
      }, timeout);
    });
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get cached response (if available)
   */
  async getCached(url: string): Promise<Response | undefined> {
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open('central-error-manager');
        return cache.match(url);
      } catch (error) {
        log(error, { component: 'NetworkRecoveryStrategy', operation: 'getCached' } as any);
      }
    }

    return undefined;
  }

  /**
   * Cache response
   */
  async cacheResponse(url: string, response: Response): Promise<void> {
    if (typeof window !== 'undefined' && 'caches' in window && response.ok) {
      try {
        const cache = await caches.open('central-error-manager');
        await cache.put(url, response.clone());
      } catch (error) {
        log(error, { component: 'NetworkRecoveryStrategy', operation: 'cacheResponse' } as any);
      }
    }
  }
}

// ============================================================================
// TIMEOUT RECOVERY STRATEGY
// ============================================================================

/**
 * Recovery strategy for timeout errors
 *
 * Handles operation timeouts gracefully.
 */
export class TimeoutRecoveryStrategy {
  /**
   * Run with timeout
   */
  async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    fallback?: () => Promise<T>
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new TimeoutError('Operation', timeoutMs)), timeoutMs)
      ),
    ]).catch(async (error) => {
      if (error instanceof TimeoutError) {
        log(error);

        if (fallback) {
          return fallback();
        }

        throw error;
      }

      throw error;
    });
  }

  /**
   * Debounce an operation
   */
  debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId as ReturnType<typeof setTimeout>);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }

  /**
   * Throttle an operation
   */
  throttle<T extends (...args: any[]) => any>(
    fn: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }
}

// ============================================================================
// GLOBAL RECOVERY STRATEGY REGISTRATION
// ============================================================================

/**
 * Initialize all recovery strategies with the error handler
 */
export function initializeRecoveryStrategies(): void {
  // WASM recovery
  registerRecoveryActions('wasm-fallback', () => [
    {
      label: 'Continue with JavaScript Mode',
      action: () => {
        // Enable JS fallback mode
        console.log('JS fallback mode enabled');
      },
      primary: true,
    },
    {
      label: 'Learn More About WASM Requirements',
      action: () => {
        if (typeof window !== 'undefined') {
          window.open('/docs/wasm-requirements', '_blank');
        }
      },
    },
  ]);

  // Storage recovery
  registerRecoveryActions('quota', (error) => {
    if (error instanceof QuotaError) {
      const usageMB = Math.round(error.usedBytes / (1024 * 1024));
      const totalMB = Math.round(error.totalBytes / (1024 * 1024));

      return [
        {
          label: `Clear Old Data (${usageMB}MB / ${totalMB}MB used)`,
          action: async () => {
            const strategy = new StorageRecoveryStrategy();
            await strategy.recoverSpace(error.totalBytes * 0.1); // Try to recover 10%
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          },
          primary: true,
          dangerous: true,
        },
        {
          label: 'Enable Automatic Compaction',
          action: () => {
            // Enable auto-compaction in settings
            console.log('Auto-compaction enabled');
          },
        },
      ];
    }

    return [];
  });

  // Network recovery
  registerRecoveryActions('network', () => {
    const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

    return [
      {
        label: isOffline ? 'Go Offline' : 'Retry',
        action: () => {
          if (isOffline) {
            // Enable offline mode
            console.log('Offline mode enabled');
          } else {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }
        },
        primary: true,
      },
      {
        label: 'Check Connection Status',
        action: () => {
          if (typeof window !== 'undefined') {
            window.open('/docs/network-status', '_blank');
          }
        },
      },
    ];
  });

  // Capability recovery
  registerRecoveryActions('capability', (error) => {
    if (error instanceof CapabilityError) {
      return [
        {
          label: 'Continue Without This Feature',
          action: () => {
            // Disable the feature
            console.log(`Feature ${error.feature} disabled`);
          },
          primary: true,
        },
        {
          label: 'See System Requirements',
          action: () => {
            if (typeof window !== 'undefined') {
              window.open('/docs/requirements', '_blank');
            }
          },
        },
      ];
    }

    return [];
  });

  // Hardware recovery
  registerRecoveryActions('system', (error) => {
    if (error instanceof HardwareDetectionError) {
      return [
        {
          label: 'Use Default Settings',
          action: () => {
            // Apply defaults
            console.log('Default settings applied');
          },
          primary: true,
        },
        {
          label: 'Run Diagnostics',
          action: () => {
            if (typeof window !== 'undefined') {
              window.open('/settings/diagnostics', '_blank');
            }
          },
        },
      ];
    }

    return [];
  });
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const wasmRecovery = new WasmRecoveryStrategy();
export const storageRecovery = new StorageRecoveryStrategy();
export const hardwareRecovery = new HardwareRecoveryStrategy();
export const networkRecovery = new NetworkRecoveryStrategy();
export const timeoutRecovery = new TimeoutRecoveryStrategy();
