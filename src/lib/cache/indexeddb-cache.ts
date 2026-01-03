/**
 * IndexedDB Cache Layer
 *
 * Provides persistent caching for API responses and computed data
 * with automatic versioning, TTL, and LRU eviction.
 */

import { StorageError } from '@/lib/errors';

const CACHE_DB_NAME = 'PersonalLogCache';
const CACHE_DB_VERSION = 1;
const STORE_CACHE = 'cache';
const STORE_METADATA = 'metadata';

interface CacheEntry<T = any> {
  key: string;
  data: T;
  etag?: string;
  createdAt: number;
  expiresAt: number;
  lastAccessed: number;
  accessCount: number;
  size: number;
}

interface CacheMetadata {
  version: number;
  totalSize: number;
  entryCount: number;
  lastCleanup: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum size in bytes (approximate)
  tags?: string[]; // Cache tags for selective invalidation
  etag?: string; // ETag for cache validation
}

let db: IDBDatabase | null = null;

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

async function getDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);

    request.onerror = () =>
      reject(new StorageError('Failed to open cache database', {
        severity: 'high',
        recovery: 'fallback',
        userMessage: 'Unable to access cache database. Your data may not be saved properly.',
        technicalDetails: `DB: ${CACHE_DB_NAME}, Version: ${CACHE_DB_VERSION}`,
        context: { dbName: CACHE_DB_NAME, version: CACHE_DB_VERSION },
      }));

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Cache store
      if (!database.objectStoreNames.contains(STORE_CACHE)) {
        const store = database.createObjectStore(STORE_CACHE, { keyPath: 'key' });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
        store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      }

      // Metadata store
      if (!database.objectStoreNames.contains(STORE_METADATA)) {
        database.createObjectStore(STORE_METADATA, { keyPath: 'key' });
      }

      // Initialize metadata
      const metadata: CacheMetadata = {
        version: CACHE_DB_VERSION,
        totalSize: 0,
        entryCount: 0,
        lastCleanup: Date.now(),
      };

      const transaction = event.target as IDBTransaction;
      const metadataStore = transaction.objectStore(STORE_METADATA);
      metadataStore.add({ key: 'metadata', ...metadata });
    };
  });
}

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

/**
 * Estimate size of data in bytes
 */
function estimateSize(data: any): number {
  return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
}

/**
 * Get cached data by key
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CACHE], 'readwrite');
    const store = transaction.objectStore(STORE_CACHE);
    const request = store.get(key);

    request.onsuccess = () => {
      const entry = request.result as CacheEntry<T> | undefined;

      if (!entry) {
        resolve(null);
        return;
      }

      // Check expiration
      if (entry.expiresAt < Date.now()) {
        store.delete(key);
        resolve(null);
        return;
      }

      // Update access metadata
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      store.put(entry);

      resolve(entry.data);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Set cached data with options
 */
export async function setCached<T>(
  key: string,
  data: T,
  options: CacheOptions = {}
): Promise<void> {
  const database = await getDB();

  const ttl = options.ttl ?? 3600000; // Default 1 hour
  const size = estimateSize(data);

  const entry: CacheEntry<T> = {
    key,
    data,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttl,
    lastAccessed: Date.now(),
    accessCount: 0,
    size,
    ...(options.etag && { etag: options.etag }),
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CACHE, STORE_METADATA], 'readwrite');
    const cacheStore = transaction.objectStore(STORE_CACHE);
    const metadataStore = transaction.objectStore(STORE_METADATA);

    // Add or update cache entry
    const request = cacheStore.put(entry);

    request.onsuccess = () => {
      // Update metadata
      const metaRequest = metadataStore.get('metadata');

      metaRequest.onsuccess = () => {
        const metadata = metaRequest.result as CacheMetadata;

        // If updating existing entry, subtract old size
        cacheStore.count().onsuccess = (event) => {
          const count = (event.target as IDBRequest).result;
          metadata.entryCount = count;
          metadata.totalSize += size;

          metadataStore.put(metadata);
          resolve();
        };
      };

      metaRequest.onerror = () => reject(metaRequest.error);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete cached data by key
 */
export async function deleteCached(key: string): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CACHE], 'readwrite');
    const store = transaction.objectStore(STORE_CACHE);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all cache
 */
export async function clearCache(): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CACHE, STORE_METADATA], 'readwrite');
    const cacheStore = transaction.objectStore(STORE_CACHE);
    const metadataStore = transaction.objectStore(STORE_METADATA);

    const clearRequest = cacheStore.clear();

    clearRequest.onsuccess = () => {
      // Reset metadata
      const metadata: CacheMetadata = {
        version: CACHE_DB_VERSION,
        totalSize: 0,
        entryCount: 0,
        lastCleanup: Date.now(),
      };

      metadataStore.put({ key: 'metadata', ...metadata });
      resolve();
    };

    clearRequest.onerror = () => reject(clearRequest.error);
  });
}

/**
 * Invalidate cache by tag pattern
 */
export async function invalidateCacheByTag(tagPattern: string): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CACHE], 'readwrite');
    const store = transaction.objectStore(STORE_CACHE);
    const index = store.index('tags');

    const request = index.openCursor(IDBKeyRange.only(tagPattern));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;

      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Clean up expired entries
 */
export async function cleanupExpiredEntries(): Promise<number> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CACHE], 'readwrite');
    const store = transaction.objectStore(STORE_CACHE);
    const index = store.index('expiresAt');

    const now = Date.now();
    let deletedCount = 0;

    const request = index.openCursor(IDBKeyRange.upperBound(now));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;

      if (cursor) {
        cursor.delete();
        deletedCount++;
        cursor.continue();
      } else {
        // Update last cleanup time
        const metadataStore = transaction.objectStore(STORE_METADATA);
        const metaRequest = metadataStore.get('metadata');

        metaRequest.onsuccess = () => {
          const metadata = metaRequest.result as CacheMetadata;
          metadata.lastCleanup = now;
          metadataStore.put(metadata);
          resolve(deletedCount);
        };

        metaRequest.onerror = () => reject(metaRequest.error);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Evict least recently used entries to free space
 */
export async function evictLRU(targetSize: number): Promise<number> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CACHE, 'readwrite']);
    const store = transaction.objectStore(STORE_CACHE);
    const index = store.index('lastAccessed');

    let currentSize = 0;
    let evictedCount = 0;

    // Get all entries sorted by lastAccessed
    const request = index.openCursor(null, 'next');

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;

      if (cursor) {
        const entry = cursor.value as CacheEntry;
        currentSize += entry.size;

        // If we're over target size, evict this entry
        if (currentSize > targetSize) {
          cursor.delete();
          evictedCount++;
        }

        cursor.continue();
      } else {
        resolve(evictedCount);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalSize: number;
  entryCount: number;
  oldestEntry: number;
  newestEntry: number;
  hitRate?: number;
}> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CACHE, STORE_METADATA], 'readonly');
    const cacheStore = transaction.objectStore(STORE_CACHE);
    const metadataStore = transaction.objectStore(STORE_METADATA);

    const metaRequest = metadataStore.get('metadata');

    metaRequest.onsuccess = () => {
      const metadata = metaRequest.result as CacheMetadata;

      const countRequest = cacheStore.count();

      countRequest.onsuccess = () => {
        const entryCount = countRequest.result;

        const allRequest = cacheStore.getAll();

        allRequest.onsuccess = () => {
          const entries = allRequest.result as CacheEntry[];

          if (entries.length === 0) {
            resolve({
              totalSize: metadata.totalSize,
              entryCount: 0,
              oldestEntry: 0,
              newestEntry: 0,
            });
            return;
          }

          const oldestEntry = Math.min(...entries.map((e) => e.createdAt));
          const newestEntry = Math.max(...entries.map((e) => e.createdAt));

          resolve({
            totalSize: metadata.totalSize,
            entryCount,
            oldestEntry,
            newestEntry,
          });
        };

        allRequest.onerror = () => reject(allRequest.error);
      };

      countRequest.onerror = () => reject(countRequest.error);
    };

    metaRequest.onerror = () => reject(metaRequest.error);
  });
}

/**
 * Auto-maintenance: clean expired and evict if necessary
 */
export async function autoMaintenance(maxSize: number = 50 * 1024 * 1024): Promise<void> {
  // Clean expired entries
  await cleanupExpiredEntries();

  // Check total size and evict if necessary
  const stats = await getCacheStats();

  if (stats.totalSize > maxSize) {
    await evictLRU(Math.floor(maxSize * 0.8)); // Evict to 80% of max
  }
}
