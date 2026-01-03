/**
 * Cache Hook
 *
 * React hook for client-side caching with IndexedDB backend.
 * Provides automatic cache invalidation and background updates.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getCached,
  setCached,
  deleteCached,
  invalidateCacheByTag,
  getCacheStats,
  autoMaintenance,
} from './indexeddb-cache';

export interface CacheHookOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  ttl?: number;
  staleWhileRevalidate?: boolean;
  tags?: string[];
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export interface CacheState<T> {
  data: T | null;
  isLoading: boolean;
  isStale: boolean;
  error: Error | null;
  lastUpdated: number | null;
}

/**
 * React hook for cached data fetching
 */
export function useCache<T>({
  key,
  fetcher,
  ttl = 3600000, // 1 hour default
  staleWhileRevalidate = true,
  tags,
  onSuccess,
  onError,
}: CacheHookOptions<T>): CacheState<T> & { refetch: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchData = useCallback(async (useCache = true) => {
    setIsLoading(true);
    setError(null);

    try {
      // Try cache first
      if (useCache) {
        const cached = await getCached<T>(key);

        if (cached) {
          setData(cached);
          setIsStale(true);

          // Background refresh if stale-while-revalidate is enabled
          if (staleWhileRevalidate) {
            fetcher()
              .then((fresh) => {
                setCached(key, fresh, { ttl, tags });
                setData(fresh);
                setIsStale(false);
                setLastUpdated(Date.now());
                onSuccess?.(fresh);
              })
              .catch((err) => {
                console.error('Background refresh failed:', err);
              });
          }

          setIsLoading(false);
          return;
        }
      }

      // No cache or cache miss, fetch fresh data
      const fresh = await fetcher();
      await setCached(key, fresh, { ttl, tags });

      setData(fresh);
      setIsStale(false);
      setLastUpdated(Date.now());
      onSuccess?.(fresh);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, ttl, tags, staleWhileRevalidate, onSuccess, onError]);

  const refetch = useCallback(() => fetchData(false), [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    isStale,
    error,
    lastUpdated,
    refetch,
  };
}

/**
 * Hook for cache statistics
 */
export function useCacheStats() {
  const [stats, setStats] = useState({
    totalSize: 0,
    entryCount: 0,
    oldestEntry: 0,
    newestEntry: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const refreshStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const cacheStats = await getCacheStats();
      setStats(cacheStats);
    } catch (err) {
      console.error('Failed to get cache stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return { stats, isLoading, refreshStats };
}

/**
 * Hook for cache management
 */
export function useCacheManager() {
  const [isClearing, setIsClearing] = useState(false);

  const clearCache = useCallback(async () => {
    setIsClearing(true);
    try {
      const { clearCache } = await import('./indexeddb-cache');
      await clearCache();
    } catch (err) {
      console.error('Failed to clear cache:', err);
      throw err;
    } finally {
      setIsClearing(false);
    }
  }, []);

  const invalidateByTag = useCallback(async (tag: string) => {
    try {
      await invalidateCacheByTag(tag);
    } catch (err) {
      console.error('Failed to invalidate cache:', err);
      throw err;
    }
  }, []);

  const runMaintenance = useCallback(async () => {
    try {
      await autoMaintenance();
    } catch (err) {
      console.error('Failed to run maintenance:', err);
      throw err;
    }
  }, []);

  return {
    clearCache,
    invalidateByTag,
    runMaintenance,
    isClearing,
  };
}

/**
 * Prefetch multiple cache keys
 */
export async function prefetchMultiple<T>(
  queries: Array<{ key: string; fetcher: () => Promise<T>; ttl?: number; tags?: string[] }>,
  options: { concurrency?: number } = {}
): Promise<void> {
  const { concurrency = 5 } = options;
  const results: Promise<void>[] = [];

  for (let i = 0; i < queries.length; i += concurrency) {
    const batch = queries.slice(i, i + concurrency);

    const batchPromises = batch.map(async ({ key, fetcher, ttl, tags }) => {
      // Check if already cached
      const cached = await getCached(key);
      if (!cached) {
        const data = await fetcher();
        await setCached(key, data, { ttl, tags: tags });
      }
    });

    results.push(...batchPromises);
    await Promise.all(batchPromises);
  }
}

/**
 * Cache multiple related queries together
 */
export function useMultiCache<T extends Record<string, any>>(
  queries: Record<keyof T, { fetcher: () => Promise<any>; ttl?: number; tags?: string[] }>,
  prefix: string
): {
  data: Partial<T>;
  isLoading: boolean;
  errors: Record<keyof T, Error | null>;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<Partial<T>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<keyof T, Error | null>>(
    {} as Record<keyof T, Error | null>
  );

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const results = { ...data };
    const newErrors = { ...errors };

    await Promise.all(
      Object.entries(queries).map(async ([key, { fetcher, ttl, tags }]) => {
        const cacheKey = `${prefix}:${key}`;

        try {
          const cached = await getCached(cacheKey);

          if (cached) {
            results[key as keyof T] = cached as T[keyof T];
            newErrors[key as keyof T] = null;
          } else {
            const fresh = await fetcher();
            await setCached(cacheKey, fresh, { ttl, tags });
            results[key as keyof T] = fresh;
            newErrors[key as keyof T] = null;
          }
        } catch (err) {
          newErrors[key as keyof T] = err instanceof Error ? err : new Error('Unknown error');
        }
      })
    );

    setData(results);
    setErrors(newErrors);
    setIsLoading(false);
  }, [queries, prefix, data, errors]);

  const refetch = useCallback(async () => {
    setIsLoading(true);

    const results: Partial<T> = {};
    const newErrors: Record<keyof T, Error | null> = {} as Record<keyof T, Error | null>;

    await Promise.all(
      Object.entries(queries).map(async ([key, { fetcher, ttl, tags }]) => {
        const cacheKey = `${prefix}:${key}`;

        try {
          const fresh = await fetcher();
          await setCached(cacheKey, fresh, { ttl, tags });
          results[key as keyof T] = fresh;
          newErrors[key as keyof T] = null;
        } catch (err) {
          newErrors[key as keyof T] = err instanceof Error ? err : new Error('Unknown error');
        }
      })
    );

    setData(results);
    setErrors(newErrors);
    setIsLoading(false);
  }, [queries]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, isLoading, errors, refetch };
}
