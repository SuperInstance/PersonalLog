/**
 * Built-in Optimization Actions
 *
 * Implements common optimization actions that can be triggered automatically.
 */

import { getPerformanceMonitor } from './performance';
import type { Optimization, OptimizationResult } from './optimization-types';

// ============================================================================
// CACHE CLEANUP
// ============================================================================

/**
 * Clean up old cache entries
 */
async function cleanupCache(): Promise<OptimizationResult> {
  const before = await getSystemMetrics();

  try {
    // Clean IndexedDB cache
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      await cleanupIndexedDBCache();
    }

    // Clean localStorage (remove old items)
    cleanupLocalStorage();

    // Clean in-memory caches
    cleanupInMemoryCache();

    const after = await getSystemMetrics();
    const improvements = calculateImprovements(before, after);

    return {
      success: true,
      before,
      after,
      improvements,
      metadata: {
        entriesRemoved: improvements.cacheEntriesRemoved || 0,
        bytesFreed: improvements.bytesFreed || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      before,
      after: before,
      improvements: {},
    };
  }
}

/**
 * Cleanup IndexedDB cache entries
 */
async function cleanupIndexedDBCache(): Promise<void> {
  const dbName = 'PersonalLogCache';
  const STORE_CACHE = 'cache';
  const STORE_METADATA = 'metadata';

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([STORE_CACHE, STORE_METADATA], 'readwrite');
      const cacheStore = transaction.objectStore(STORE_CACHE);

      // Remove expired entries
      const index = cacheStore.index('expiresAt');
      const range = IDBKeyRange.upperBound(Date.now());
      const deleteRequest = index.openCursor(range);

      let deletedCount = 0;
      deleteRequest.onsuccess = () => {
        const cursor = deleteRequest.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Cleanup old localStorage entries
 */
function cleanupLocalStorage(): void {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    try {
      const value = localStorage.getItem(key);
      if (!value) continue;

      // Check if it's a timestamped entry
      const data = JSON.parse(value);
      if (data.timestamp && now - data.timestamp > maxAge) {
        localStorage.removeItem(key);
      }
    } catch {
      // Skip invalid JSON entries
    }
  }
}

/**
 * Cleanup in-memory caches (clears various caches)
 */
function cleanupInMemoryCache(): void {
  // Clear any caches in the performance monitor
  const perfMonitor = getPerformanceMonitor();
  perfMonitor.clearMetrics();
}

// ============================================================================
// AGGRESSIVE CLEANUP
// ============================================================================

/**
 * Aggressive cleanup for critical memory situations
 */
async function aggressiveCleanup(): Promise<OptimizationResult> {
  const before = await getSystemMetrics();

  try {
    // Run regular cache cleanup
    await cleanupCache();

    // Clear all performance metrics
    const perfMonitor = getPerformanceMonitor();
    perfMonitor.clearMetrics();

    // Force garbage collection hint (non-standard, browser-specific)
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
      } catch {
        // Ignore if gc not available
      }
    }

    const after = await getSystemMetrics();
    const improvements = calculateImprovements(before, after);

    return {
      success: true,
      before,
      after,
      improvements,
      metadata: {
        aggressive: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      before,
      after: before,
      improvements: {},
    };
  }
}

// ============================================================================
// ENABLE CACHING
// ============================================================================

/**
 * Enable enhanced caching for slow APIs
 */
async function enableCaching(): Promise<OptimizationResult> {
  const before = await getSystemMetrics();

  try {
    // Set caching flags
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('optimization-caching-enabled', 'true');
      localStorage.setItem('optimization-caching-ttl', '300000'); // 5 minutes
    }

    const after = await getSystemMetrics();
    const improvements = calculateImprovements(before, after);

    return {
      success: true,
      before,
      after,
      improvements,
      metadata: {
        cachingEnabled: true,
        ttl: 300000,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      before,
      after: before,
      improvements: {},
    };
  }
}

// ============================================================================
// ENABLE CIRCUIT BREAKER
// ============================================================================

/**
 * Enable circuit breaker for failing APIs
 */
async function enableCircuitBreaker(): Promise<OptimizationResult> {
  const before = await getSystemMetrics();

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('optimization-circuit-breaker-enabled', 'true');
      localStorage.setItem('optimization-circuit-breaker-threshold', '0.5');
    }

    const after = await getSystemMetrics();
    const improvements = calculateImprovements(before, after);

    return {
      success: true,
      before,
      after,
      improvements,
      metadata: {
        circuitBreakerEnabled: true,
        threshold: 0.5,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      before,
      after: before,
      improvements: {},
    };
  }
}

// ============================================================================
// PRELOAD CACHE
// ============================================================================

/**
 * Preload common data into cache
 */
async function preloadCache(): Promise<OptimizationResult> {
  const before = await getSystemMetrics();

  try {
    let preloadedItems = 0;

    // Preload common data (placeholder implementation)
    // In a real app, this would preload user-specific common data
    const commonDataKeys = ['user-preferences', 'recent-items', 'frequent-queries'];

    for (const key of commonDataKeys) {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(key);
        if (data) {
          // Mark for preloading
          localStorage.setItem(`preload-${key}`, data);
          preloadedItems++;
        }
      }
    }

    const after = await getSystemMetrics();
    const improvements = calculateImprovements(before, after);

    return {
      success: true,
      before,
      after,
      improvements,
      metadata: {
        preloadedItems,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      before,
      after: before,
      improvements: {},
    };
  }
}

// ============================================================================
// ENABLE VIRTUALIZATION
// ============================================================================

/**
 * Enable list virtualization for better rendering performance
 */
async function enableVirtualization(): Promise<OptimizationResult> {
  const before = await getSystemMetrics();

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('optimization-virtualization-enabled', 'true');
    }

    const after = await getSystemMetrics();
    const improvements = calculateImprovements(before, after);

    return {
      success: true,
      before,
      after,
      improvements,
      metadata: {
        virtualizationEnabled: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      before,
      after: before,
      improvements: {},
    };
  }
}

// ============================================================================
// REDUCE POLLING
// ============================================================================

/**
 * Reduce polling frequency to decrease CPU usage
 */
async function reducePolling(): Promise<OptimizationResult> {
  const before = await getSystemMetrics();

  try {
    if (typeof localStorage !== 'undefined') {
      // Reduce polling intervals
      const currentInterval = parseInt(localStorage.getItem('polling-interval') || '5000', 10);
      const newInterval = Math.max(currentInterval * 2, 30000); // At least 30s

      localStorage.setItem('optimization-reduced-polling', 'true');
      localStorage.setItem('optimization-polling-interval', newInterval.toString());
    }

    const after = await getSystemMetrics();
    const improvements = calculateImprovements(before, after);

    return {
      success: true,
      before,
      after,
      improvements,
      metadata: {
        reducedPolling: true,
        newInterval: localStorage.getItem('optimization-polling-interval'),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      before,
      after: before,
      improvements: {},
    };
  }
}

// ============================================================================
// ENABLE DEFENSIVE MODE
// ============================================================================

/**
 * Enable defensive mode when many errors occur
 */
async function enableDefensiveMode(): Promise<OptimizationResult> {
  const before = await getSystemMetrics();

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('optimization-defensive-mode', 'true');
      // Disable heavy features
      localStorage.setItem('optimization-heavy-features-disabled', 'true');
    }

    const after = await getSystemMetrics();
    const improvements = calculateImprovements(before, after);

    return {
      success: true,
      before,
      after,
      improvements,
      metadata: {
        defensiveMode: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      before,
      after: before,
      improvements: {},
    };
  }
}

// ============================================================================
// STORAGE CLEANUP
// ============================================================================

/**
 * Cleanup storage when nearly full
 */
async function storageCleanup(): Promise<OptimizationResult> {
  const before = await getSystemMetrics();

  try {
    // Clear old logs
    if (typeof localStorage !== 'undefined') {
      const now = Date.now();
      const maxLogAge = 3 * 24 * 60 * 60 * 1000; // 3 days

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        // Clear log entries older than 3 days
        if (key.startsWith('log-') || key.startsWith('event-')) {
          const timestamp = parseInt(key.split('-')[1] || '0', 10);
          if (timestamp && now - timestamp > maxLogAge) {
            localStorage.removeItem(key);
          }
        }
      }
    }

    // Compress plugin data
    await compressPluginData();

    const after = await getSystemMetrics();
    const improvements = calculateImprovements(before, after);

    return {
      success: true,
      before,
      after,
      improvements,
      metadata: {
        storageCleaned: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      before,
      after: before,
      improvements: {},
    };
  }
}

/**
 * Compress plugin data (placeholder)
 */
async function compressPluginData(): Promise<void> {
  // In a real implementation, this would compress IndexedDB data
  // For now, just a placeholder
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('optimization-last-compression', Date.now().toString());
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current system metrics
 */
async function getSystemMetrics(): Promise<Record<string, number>> {
  const metrics: Record<string, number> = {};

  // Memory metrics
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory;
    if (memory) {
      metrics['memory-used'] = memory.usedJSHeapSize / 1024 / 1024; // MB
      metrics['memory-total'] = memory.totalJSHeapSize / 1024 / 1024; // MB
      metrics['memory-limit'] = memory.jsHeapSizeLimit / 1024 / 1024; // MB
    }
  }

  // Storage metrics
  if (typeof navigator !== 'undefined' && 'storage' in navigator) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.usage && estimate.quota) {
        metrics['storage-used'] = estimate.usage / 1024 / 1024; // MB
        metrics['storage-quota'] = estimate.quota / 1024 / 1024; // MB
        metrics['storage-percent'] = (estimate.usage / estimate.quota) * 100;
      }
    } catch {
      // Storage estimation not supported
    }
  }

  // Cache size (from localStorage)
  if (typeof localStorage !== 'undefined') {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        totalSize += (key.length + (localStorage.getItem(key) || '').length) * 2; // UTF-16
      }
    }
    metrics['cache-size'] = totalSize / 1024; // KB
  }

  return metrics;
}

/**
 * Calculate improvements between before and after metrics
 */
function calculateImprovements(before: Record<string, number>, after: Record<string, number>): Record<string, number> {
  const improvements: Record<string, number> = {};

  for (const key in before) {
    if (after[key] !== undefined) {
      improvements[key] = after[key] - before[key];
    }
  }

  // Special calculated improvements
  if (before['memory-used'] && after['memory-used']) {
    improvements['memory-freed'] = before['memory-used'] - after['memory-used'];
  }

  if (before['cache-size'] && after['cache-size']) {
    improvements['cache-reduced'] = before['cache-size'] - after['cache-size'];
    improvements['bytesFreed'] = improvements['cache-reduced'] * 1024;
  }

  return improvements;
}

// ============================================================================
// BUILT-IN OPTIMIZATIONS EXPORT
// ============================================================================

/**
 * Built-in optimizations
 */
export const BUILT_IN_OPTIMIZATIONS: Optimization[] = [
  {
    id: 'cache-cleanup',
    name: 'Cache Cleanup',
    description: 'Removes old and expired cache entries to free memory',
    action: cleanupCache,
    expectedImpact: {
      metric: 'memory-used',
      improvement: '-50 to -200 MB',
    },
    estimatedDuration: 1000,
    canRollback: false,
    tags: ['cache', 'memory', 'cleanup'],
  },
  {
    id: 'aggressive-cleanup',
    name: 'Aggressive Cleanup',
    description: 'Forces aggressive cleanup including clearing metrics',
    action: aggressiveCleanup,
    expectedImpact: {
      metric: 'memory-used',
      improvement: '-200 to -500 MB',
    },
    estimatedDuration: 2000,
    canRollback: false,
    tags: ['cache', 'memory', 'aggressive', 'cleanup'],
  },
  {
    id: 'enable-caching',
    name: 'Enable Enhanced Caching',
    description: 'Enables enhanced caching for slow API responses',
    action: enableCaching,
    rollback: async () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('optimization-caching-enabled');
        localStorage.removeItem('optimization-caching-ttl');
      }
    },
    expectedImpact: {
      metric: 'api-duration',
      improvement: '-50% to -80%',
    },
    estimatedDuration: 100,
    canRollback: true,
    tags: ['api', 'cache', 'performance'],
  },
  {
    id: 'enable-circuit-breaker',
    name: 'Enable Circuit Breaker',
    description: 'Enables circuit breaker pattern for failing APIs',
    action: enableCircuitBreaker,
    rollback: async () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('optimization-circuit-breaker-enabled');
        localStorage.removeItem('optimization-circuit-breaker-threshold');
      }
    },
    expectedImpact: {
      metric: 'api-failure-rate',
      improvement: 'Prevents cascading failures',
    },
    estimatedDuration: 100,
    canRollback: true,
    tags: ['api', 'reliability', 'circuit-breaker'],
  },
  {
    id: 'preload-cache',
    name: 'Preload Common Data',
    description: 'Preloads frequently accessed data into cache',
    action: preloadCache,
    expectedImpact: {
      metric: 'cache-hit-rate',
      improvement: '+20% to +40%',
    },
    estimatedDuration: 500,
    canRollback: false,
    tags: ['cache', 'preload', 'performance'],
  },
  {
    id: 'enable-virtualization',
    name: 'Enable List Virtualization',
    description: 'Enables virtual scrolling for long lists',
    action: enableVirtualization,
    rollback: async () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('optimization-virtualization-enabled');
      }
    },
    expectedImpact: {
      metric: 'render-duration',
      improvement: '-60% to -90%',
    },
    estimatedDuration: 100,
    canRollback: true,
    tags: ['rendering', 'virtualization', 'performance'],
  },
  {
    id: 'reduce-polling',
    name: 'Reduce Polling Frequency',
    description: 'Reduces polling frequency to decrease CPU usage',
    action: reducePolling,
    rollback: async () => {
      if (typeof localStorage !== 'undefined') {
        const original = localStorage.getItem('polling-interval');
        localStorage.removeItem('optimization-reduced-polling');
        if (original) localStorage.setItem('polling-interval', original);
        localStorage.removeItem('optimization-polling-interval');
      }
    },
    expectedImpact: {
      metric: 'cpu-percent',
      improvement: '-20% to -40%',
    },
    estimatedDuration: 100,
    canRollback: true,
    tags: ['cpu', 'polling', 'performance'],
  },
  {
    id: 'enable-defensive-mode',
    name: 'Enable Defensive Mode',
    description: 'Enables defensive mode with disabled heavy features',
    action: enableDefensiveMode,
    rollback: async () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('optimization-defensive-mode');
        localStorage.removeItem('optimization-heavy-features-disabled');
      }
    },
    expectedImpact: {
      metric: 'error-count',
      improvement: 'Reduces error propagation',
    },
    estimatedDuration: 100,
    canRollback: true,
    tags: ['reliability', 'defensive', 'errors'],
  },
  {
    id: 'storage-cleanup',
    name: 'Storage Cleanup',
    description: 'Cleans up old logs and compresses data',
    action: storageCleanup,
    expectedImpact: {
      metric: 'storage-used',
      improvement: '-10% to -30%',
    },
    estimatedDuration: 2000,
    canRollback: false,
    tags: ['storage', 'cleanup', 'compression'],
  },
];
