/**
 * Automatic Performance Instrumentation
 *
 * Provides automatic wrapping of common operations for performance tracking.
 * Includes wrappers for fetch, IndexedDB, React rendering, and more.
 */

import { getPerformanceTracker, OperationCategory } from './performance-tracker';

/**
 * Instrument fetch API
 */
export function instrumentFetch(): void {
  if (typeof window === 'undefined' || !window.fetch) return;

  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const tracker = getPerformanceTracker();
    const id = tracker.startOperation(`fetch-${url}`, 'network', { url, method: init?.method });

    try {
      const response = await originalFetch(input, init);
      tracker.endOperation(id, response.ok, {
        status: response.status,
        statusText: response.statusText,
      });
      return response;
    } catch (error) {
      tracker.endOperation(id, false, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  };
}

/**
 * Instrument IndexedDB operations
 */
export class InstrumentedIDB {
  private dbName: string;
  private tracker = getPerformanceTracker();

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  async open(version?: number): Promise<IDBDatabase> {
    const id = this.tracker.startOperation(`idb-open-${this.dbName}`, 'database', {
      dbName: this.dbName,
    });

    try {
      const request = indexedDB.open(this.dbName, version);
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      this.tracker.endOperation(id, true);
      return db;
    } catch (error) {
      this.tracker.endOperation(id, false, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async transaction(stores: string[], mode: IDBTransactionMode = 'readonly'): Promise<IDBTransaction> {
    const id = this.tracker.startOperation(`idb-transaction-${this.dbName}`, 'database', {
      stores,
      mode,
    });

    try {
      const db = await this.open();
      const transaction = db.transaction(stores, mode);

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          this.tracker.endOperation(id, true);
          resolve(transaction);
        };
        transaction.onerror = () => {
          this.tracker.endOperation(id, false, {
            error: transaction.error?.message || 'Transaction failed',
          });
          reject(transaction.error);
        };
      });
    } catch (error) {
      this.tracker.endOperation(id, false, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async get(storeName: string, key: IDBValidKey): Promise<unknown> {
    const id = this.tracker.startOperation(`idb-get-${this.dbName}-${storeName}`, 'database', {
      storeName,
      key,
    });

    try {
      const db = await this.open();
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      const result = await new Promise<unknown>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      this.tracker.endOperation(id, true);
      db.close();
      return result;
    } catch (error) {
      this.tracker.endOperation(id, false, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getAll(storeName: string): Promise<unknown[]> {
    const id = this.tracker.startOperation(`idb-getAll-${this.dbName}-${storeName}`, 'database', {
      storeName,
    });

    try {
      const db = await this.open();
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      const result = await new Promise<unknown[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      this.tracker.endOperation(id, true, { count: result.length });
      db.close();
      return result;
    } catch (error) {
      this.tracker.endOperation(id, false, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async put(storeName: string, value: unknown, key?: IDBValidKey): Promise<IDBValidKey> {
    const id = this.tracker.startOperation(`idb-put-${this.dbName}-${storeName}`, 'database', {
      storeName,
      hasKey: !!key,
    });

    try {
      const db = await this.open();
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value, key);

      const result = await new Promise<IDBValidKey>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      this.tracker.endOperation(id, true);
      db.close();
      return result;
    } catch (error) {
      this.tracker.endOperation(id, false, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const id = this.tracker.startOperation(`idb-delete-${this.dbName}-${storeName}`, 'database', {
      storeName,
      key,
    });

    try {
      const db = await this.open();
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      this.tracker.endOperation(id, true);
      db.close();
    } catch (error) {
      this.tracker.endOperation(id, false, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async clear(storeName: string): Promise<void> {
    const id = this.tracker.startOperation(`idb-clear-${this.dbName}-${storeName}`, 'database', {
      storeName,
    });

    try {
      const db = await this.open();
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      this.tracker.endOperation(id, true);
      db.close();
    } catch (error) {
      this.tracker.endOperation(id, false, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

/**
 * Instrument React rendering with Profiler
 */
export interface ReactProfilerData {
  componentName: string;
  renderTime: number;
  timestamp: number;
}

export function usePerformanceInstrumentation(componentName: string): {
  onRender: (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => void;
} {
  const tracker = getPerformanceTracker();

  const onRender = (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    const operationId = tracker.startOperation(`react-${componentName}`, 'render', {
      phase,
      actualDuration,
      baseDuration,
    });

    tracker.endOperation(operationId, true, {
      componentName,
      phase,
      renderTime: commitTime - startTime,
    });
  };

  return { onRender };
}

/**
 * Wrap any function with performance tracking
 */
export function trackFunction<T extends (...args: unknown[]) => ReturnType<T>>(
  name: string,
  category: OperationCategory,
  fn: T
): T {
  const tracker = getPerformanceTracker();

  return ((...args: unknown[]) => {
    const id = tracker.startOperation(name, category);
    try {
      const result = fn(...args);
      tracker.endOperation(id, true);
      return result;
    } catch (error) {
      tracker.endOperation(id, false, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }) as T;
}

/**
 * Wrap any async function with performance tracking
 */
export function trackAsyncFunction<T extends (...args: unknown[]) => Promise<ReturnType<T>>>(
  name: string,
  category: OperationCategory,
  fn: T
): T {
  const tracker = getPerformanceTracker();

  return (async (...args: unknown[]) => {
    const id = tracker.startOperation(name, category);
    try {
      const result = await fn(...args);
      tracker.endOperation(id, true);
      return result;
    } catch (error) {
      tracker.endOperation(id, false, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }) as T;
}

/**
 * Create a performance-measured wrapper for an object's methods
 */
export function trackObject<T extends Record<string, unknown>>(
  name: string,
  category: OperationCategory,
  obj: T
): T {
  const wrapped = {} as T;

  for (const key in obj) {
    if (typeof obj[key] === 'function') {
      const fn = obj[key] as (...args: unknown[]) => unknown;
      // Simple type casting to avoid complex type inference
      wrapped[key] = trackFunction(`${name}.${key}`, category, fn as any);
    } else {
      wrapped[key] = obj[key];
    }
  }

  return wrapped;
}

/**
 * Measure time for a block of code
 */
export function measure<T>(name: string, category: OperationCategory, fn: () => T): T {
  const tracker = getPerformanceTracker();
  return tracker.trackOperation(name, category, fn);
}

/**
 * Measure time for an async block of code
 */
export async function measureAsync<T>(
  name: string,
  category: OperationCategory,
  fn: () => Promise<T>
): Promise<T> {
  const tracker = getPerformanceTracker();
  return tracker.trackOperationAsync(name, category, fn);
}

/**
 * Monitor long tasks using PerformanceObserver
 */
export function monitorLongTasks(callback: (task: { duration: number; startTime: number }) => void): () => void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return () => {};
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        callback({
          duration: entry.duration,
          startTime: entry.startTime,
        });
      }
    });

    observer.observe({ entryTypes: ['longtask'] });

    // Return cleanup function
    return () => observer.disconnect();
  } catch (e) {
    console.warn('Long task monitoring not supported');
    return () => {};
  }
}

/**
 * Monitor resource loading
 */
export function monitorResourceLoading(
  callback: (resource: {
    name: string;
    duration: number;
    size: number;
    type: string;
  }) => void
): () => void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return () => {};
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
        callback({
          name: entry.name,
          duration: entry.duration,
          size: entry.transferSize,
          type: entry.initiatorType,
        });
      }
    });

    observer.observe({ entryTypes: ['resource'] });

    return () => observer.disconnect();
  } catch (e) {
    console.warn('Resource loading monitoring not supported');
    return () => {};
  }
}

/**
 * Monitor page navigation timing
 */
export function monitorPageNavigation(): {
  domContentLoaded: number | null;
  loadComplete: number | null;
  totalTime: number | null;
} {
  if (typeof window === 'undefined' || !window.performance) {
    return {
      domContentLoaded: null,
      loadComplete: null,
      totalTime: null,
    };
  }

  const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

  if (!navigationTiming) {
    return {
      domContentLoaded: null,
      loadComplete: null,
      totalTime: null,
    };
  }

  return {
    domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart,
    loadComplete: navigationTiming.loadEventEnd - navigationTiming.loadEventStart,
    totalTime: navigationTiming.loadEventEnd - navigationTiming.fetchStart,
  };
}

/**
 * Initialize all automatic instrumentation
 */
export function initializeInstrumentation(options: {
  fetch?: boolean;
  indexedDB?: boolean;
  longTasks?: boolean;
  resourceLoading?: boolean;
} = {}): void {
  if (options.fetch !== false) {
    instrumentFetch();
  }

  if (options.longTasks !== false) {
    const tracker = getPerformanceTracker();
    monitorLongTasks((task) => {
      const id = tracker.startOperation('long-task', 'custom', {
        duration: task.duration,
      });
      tracker.endOperation(id, true, {
        duration: task.duration,
      });
    });
  }

  if (options.resourceLoading !== false) {
    const tracker = getPerformanceTracker();
    monitorResourceLoading((resource) => {
      const id = tracker.startOperation(`resource-${resource.type}`, 'network', {
        name: resource.name,
        type: resource.type,
      });
      tracker.endOperation(id, true, {
        duration: resource.duration,
        size: resource.size,
      });
    });
  }
}
