/**
 * Checksum Utilities
 *
 * Provides checksum calculation and validation for data integrity.
 * Uses Web Crypto API for secure hashing.
 */

import { ValidationError } from '@/lib/errors';

// ============================================================================
// CHECKSUM CALCULATION
// ============================================================================

/**
 * Calculate SHA-256 checksum of a string
 */
export async function calculateChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculate checksum of an object
 */
export async function calculateObjectChecksum(obj: unknown): Promise<string> {
  const jsonString = JSON.stringify(obj);
  return calculateChecksum(jsonString);
}

/**
 * Calculate checksum of multiple values
 */
export async function calculateCombinedChecksum(...values: unknown[]): Promise<string> {
  const combined = values.map(v =>
    typeof v === 'string' ? v : JSON.stringify(v)
  ).join('|');
  return calculateChecksum(combined);
}

// ============================================================================
// CHECKSUM VALIDATION
// ============================================================================

/**
 * Validate data against expected checksum
 */
export async function validateChecksum(
  data: string,
  expectedChecksum: string
): Promise<boolean> {
  const actualChecksum = await calculateChecksum(data);
  return actualChecksum === expectedChecksum;
}

/**
 * Validate object checksum
 */
export async function validateObjectChecksum(
  obj: unknown,
  expectedChecksum: string
): Promise<boolean> {
  const actualChecksum = await calculateObjectChecksum(obj);
  return actualChecksum === expectedChecksum;
}

/**
 * Verify checksum and throw if invalid
 */
export async function verifyChecksum(
  data: string,
  expectedChecksum: string,
  context?: string
): Promise<void> {
  const isValid = await validateChecksum(data, expectedChecksum);
  if (!isValid) {
    throw new ValidationError('Checksum validation failed', {
      field: 'checksum',
      context: { context, expectedChecksum },
      technicalDetails: `Data checksum does not match expected value`
    });
  }
}

// ============================================================================
// CHECKSUM STORAGE
// ============================================================================

/**
 * Checksum storage interface
 */
export interface ChecksumStore {
  set(id: string, checksum: string): Promise<void>;
  get(id: string): Promise<string | null>;
  has(id: string): Promise<boolean>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * In-memory checksum store
 */
class MemoryChecksumStore implements ChecksumStore {
  private store = new Map<string, string>();

  async set(id: string, checksum: string): Promise<void> {
    this.store.set(id, checksum);
  }

  async get(id: string): Promise<string | null> {
    return this.store.get(id) || null;
  }

  async has(id: string): Promise<boolean> {
    return this.store.has(id);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

/**
 * IndexedDB-based checksum store
 */
class IndexedDBChecksumStore implements ChecksumStore {
  private static DB_NAME = 'PersonalLogChecksums';
  private static STORE_NAME = 'checksums';
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IndexedDBChecksumStore.DB_NAME, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IndexedDBChecksumStore.STORE_NAME)) {
          db.createObjectStore(IndexedDBChecksumStore.STORE_NAME);
        }
      };
    });
  }

  async set(id: string, checksum: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IndexedDBChecksumStore.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(IndexedDBChecksumStore.STORE_NAME);
      const request = store.put(checksum, id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get(id: string): Promise<string | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IndexedDBChecksumStore.STORE_NAME], 'readonly');
      const store = transaction.objectStore(IndexedDBChecksumStore.STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async has(id: string): Promise<boolean> {
    const checksum = await this.get(id);
    return checksum !== null;
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IndexedDBChecksumStore.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(IndexedDBChecksumStore.STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IndexedDBChecksumStore.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(IndexedDBChecksumStore.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// ============================================================================
// CHECKSUM MANAGER
// ============================================================================

/**
 * Checksum manager for tracking data integrity
 */
export class ChecksumManager {
  private store: ChecksumStore;
  private enabled: boolean = true;

  constructor(useIndexedDB: boolean = true) {
    this.store = useIndexedDB
      ? new IndexedDBChecksumStore()
      : new MemoryChecksumStore();
  }

  /**
   * Enable checksum tracking
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable checksum tracking
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Check if checksum tracking is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Calculate and store checksum
   */
  async storeChecksum(id: string, data: unknown): Promise<string> {
    if (!this.enabled) return '';

    const checksum = await calculateObjectChecksum(data);
    await this.store.set(id, checksum);
    return checksum;
  }

  /**
   * Verify data against stored checksum
   */
  async verify(id: string, data: unknown): Promise<boolean> {
    if (!this.enabled) return true;

    const storedChecksum = await this.store.get(id);
    if (!storedChecksum) return false;

    return validateObjectChecksum(data, storedChecksum);
  }

  /**
   * Get stored checksum
   */
  async getChecksum(id: string): Promise<string | null> {
    return this.store.get(id);
  }

  /**
   * Update checksum
   */
  async updateChecksum(id: string, data: unknown): Promise<string> {
    return this.storeChecksum(id, data);
  }

  /**
   * Remove checksum
   */
  async removeChecksum(id: string): Promise<void> {
    await this.store.delete(id);
  }

  /**
   * Clear all checksums
   */
  async clearAll(): Promise<void> {
    await this.store.clear();
  }

  /**
   * Check if checksum exists
   */
  async hasChecksum(id: string): Promise<boolean> {
    return this.store.has(id);
  }
}

// ============================================================================
// BATCH CHECKSUM OPERATIONS
// ============================================================================

/**
 * Calculate checksums for multiple items
 */
export async function calculateBatchChecksums(
  items: Array<{ id: string; data: unknown }>
): Promise<Map<string, string>> {
  const checksums = new Map<string, string>();

  await Promise.all(
    items.map(async ({ id, data }) => {
      const checksum = await calculateObjectChecksum(data);
      checksums.set(id, checksum);
    })
  );

  return checksums;
}

/**
 * Validate multiple checksums
 */
export async function validateBatchChecksums(
  items: Array<{ id: string; data: unknown }>,
  manager: ChecksumManager
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  await Promise.all(
    items.map(async ({ id, data }) => {
      const valid = await manager.verify(id, data);
      results.set(id, valid);
    })
  );

  return results;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a hash-based ID
 */
export async function generateHashId(data: string): Promise<string> {
  const checksum = await calculateChecksum(data);
  return `hash_${checksum.substring(0, 16)}`;
}

/**
 * Compare two checksums
 */
export function compareChecksums(checksum1: string, checksum2: string): boolean {
  return checksum1 === checksum2;
}

/**
 * Format checksum for display
 */
export function formatChecksum(checksum: string, length: number = 8): string {
  if (checksum.length <= length) return checksum;
  return `${checksum.substring(0, length)}...`;
}
