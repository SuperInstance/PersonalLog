/**
 * PersonalLog Plugin SDK - Storage API Implementation
 *
 * Provides plugin-specific data storage.
 *
 * @packageDocumentation
 */

import type { StorageAPI } from '../types';

// ============================================================================
// STORAGE API IMPLEMENTATION
// ============================================================================

/**
 * Storage API implementation
 *
 * Provides IndexedDB-based storage for plugins.
 */
class StorageAPIImpl implements StorageAPI {
  private pluginId: string;
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;

  constructor(pluginId: string) {
    this.pluginId = pluginId;
    this.dbName = `PersonalLogPluginStorage_${pluginId}`;
    this.storeName = 'storage';
  }

  // ========================================================================
  // DATABASE INITIALIZATION
  // ========================================================================

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        reject(new Error(`Failed to open storage database: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create storage store
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }

        // Create files store
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files');
        }
      };
    });
  }

  // ========================================================================
  // KEY-VALUE STORAGE
  // ========================================================================

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          reject(new Error(`Failed to get key ${key}: ${request.error}`));
        };
      });
    } catch (error) {
      throw new Error(`Storage get failed: ${error}`);
    }
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(value, key);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          reject(new Error(`Failed to set key ${key}: ${request.error}`));
        };
      });
    } catch (error) {
      throw new Error(`Storage set failed: ${error}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          reject(new Error(`Failed to delete key ${key}: ${request.error}`));
        };
      });
    } catch (error) {
      throw new Error(`Storage delete failed: ${error}`);
    }
  }

  async keys(): Promise<string[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAllKeys();

        request.onsuccess = () => {
          resolve(request.result as string[]);
        };

        request.onerror = () => {
          reject(new Error(`Failed to get keys: ${request.error}`));
        };
      });
    } catch (error) {
      throw new Error(`Storage keys failed: ${error}`);
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => {
          reject(new Error(`Failed to clear storage: ${request.error}`));
        };
      });
    } catch (error) {
      throw new Error(`Storage clear failed: ${error}`);
    }
  }

  // ========================================================================
  // STORAGE SIZE
  // ========================================================================

  async getSize(): Promise<number> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);

        let totalSize = 0;
        const request = store.openCursor();

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const value = cursor.value;
            totalSize += new Blob([JSON.stringify(value)]).size;
            cursor.continue();
          } else {
            resolve(totalSize);
          }
        };

        request.onerror = () => {
          reject(new Error(`Failed to calculate size: ${request.error}`));
        };
      });
    } catch (error) {
      throw new Error(`Storage size calculation failed: ${error}`);
    }
  }

  // ========================================================================
  // FILE STORAGE
  // ========================================================================

  async setFile(key: string, file: File | Blob): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        const request = store.put(file, key);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          reject(new Error(`Failed to store file ${key}: ${request.error}`));
        };
      });
    } catch (error) {
      throw new Error(`File storage failed: ${error}`);
    }
  }

  async getFile(key: string): Promise<Blob | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          reject(new Error(`Failed to get file ${key}: ${request.error}`));
        };
      });
    } catch (error) {
      throw new Error(`File retrieval failed: ${error}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          reject(new Error(`Failed to delete file ${key}: ${request.error}`));
        };
      });
    } catch (error) {
      throw new Error(`File deletion failed: ${error}`);
    }
  }

  async getFileSize(key: string): Promise<number> {
    const file = await this.getFile(key);
    if (!file) return 0;
    return file.size;
  }

  async listFiles(): Promise<string[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const request = store.getAllKeys();

        request.onsuccess = () => {
          resolve(request.result as string[]);
        };

        request.onerror = () => {
          reject(new Error(`Failed to list files: ${request.error}`));
        };
      });
    } catch (error) {
      throw new Error(`File list failed: ${error}`);
    }
  }

  // ========================================================================
  // CLEANUP
  // ========================================================================

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async destroy(): Promise<void> {
    await this.close();

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(new Error(`Failed to destroy storage: ${request.error}`));
      };
    });
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new Storage API instance for a plugin
 *
 * @param pluginId - Plugin ID
 * @returns Storage API instance
 */
export function createStorageAPI(pluginId: string): StorageAPI {
  return new StorageAPIImpl(pluginId);
}

export default StorageAPIImpl;
