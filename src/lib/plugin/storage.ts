/**
 * Plugin Storage System
 *
 * Complete IndexedDB-based storage for PersonalLog plugins.
 * Handles plugin metadata, permissions, state, installation files, and version management.
 *
 * @module lib/plugin/storage
 */

import type {
  PluginId,
  PluginManifest,
  PluginState,
  Permission,
  PluginRuntimeState,
  PluginStats,
  PluginError,
  PluginSourceType,
} from './types';
import { StorageError, NotFoundError, ValidationError } from '@/lib/errors';

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

const PLUGIN_DB_NAME = 'PersonalLogPlugins';
const PLUGIN_DB_VERSION = 2; // Updated version for new stores

const STORES = {
  MANIFESTS: 'manifests',
  STATES: 'states',
  SETTINGS: 'settings',
  PERMISSIONS: 'permissions',
  FILES: 'plugin-files',
  VERSIONS: 'plugin-versions',
  INSTALLATION_LOGS: 'installation-logs',
} as const;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Plugin file data
 */
export interface PluginFileData {
  /** File ID (auto-generated from IndexedDB) */
  id?: number;

  /** Plugin ID */
  pluginId: PluginId;

  /** File name */
  name: string;

  /** File path relative to plugin root */
  path: string;

  /** File content (base64 encoded for binary files) */
  content: string;

  /** File MIME type */
  mimeType: string;

  /** File size in bytes */
  size: number;

  /** Last modified timestamp */
  lastModified: number;

  /** File hash (SHA-256) for integrity checking */
  hash?: string;
}

/**
 * Plugin version information
 */
export interface PluginVersionInfo {
  /** Version ID (auto-generated from IndexedDB) */
  id?: number;

  /** Plugin ID */
  pluginId: PluginId;

  /** Version */
  version: string;

  /** Installation timestamp */
  installedAt: number;

  /** Source type */
  source: PluginSourceType;

  /** Source URL or path */
  sourceUrl?: string;

  /** Is currently active */
  active: boolean;

  /** Manifest for this version */
  manifest: PluginManifest;

  /** File count */
  fileCount: number;

  /** Total size in bytes */
  totalSize: number;
}

/**
 * Installation log entry
 */
export interface InstallationLog {
  /** Log ID (auto-generated) */
  id: string;

  /** Plugin ID */
  pluginId: PluginId;

  /** Plugin version */
  version: string;

  /** Operation type */
  operation: 'install' | 'update' | 'uninstall' | 'rollback' | 'enable' | 'disable';

  /** Operation status */
  status: 'started' | 'completed' | 'failed';

  /** Timestamp */
  timestamp: number;

  /** Error message (if failed) */
  error?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Plugin permission state
 */
export interface PluginPermissionState {
  /** Plugin ID */
  pluginId: PluginId;

  /** Granted permissions */
  granted: Permission[];

  /** Denied permissions */
  denied: Permission[];

  /** Pending permissions (awaiting user approval) */
  pending: Permission[];

  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * Plugin storage options
 */
export interface PluginStorageOptions {
  /** Auto-clean old versions (keep last N versions) */
  autoCleanVersions?: number;

  /** Calculate file hashes */
  calculateHashes?: boolean;

  /** Compress file data */
  compressData?: boolean;

  /** Maximum plugin size (bytes) */
  maxPluginSize?: number;
}

// ============================================================================
// PLUGIN STORAGE CLASS
// ============================================================================

export class PluginStore {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private options: PluginStorageOptions;

  constructor(options: PluginStorageOptions = {}) {
    this.options = {
      autoCleanVersions: 3,
      calculateHashes: false,
      compressData: false,
      maxPluginSize: 50 * 1024 * 1024, // 50 MB default
      ...options,
    };
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initialize plugin storage database
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(PLUGIN_DB_NAME, PLUGIN_DB_VERSION);

      request.onerror = () => {
        reject(new StorageError('Failed to open plugin storage database', {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
          context: { dbName: PLUGIN_DB_NAME, version: PLUGIN_DB_VERSION }
        }));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create manifests store
        if (!db.objectStoreNames.contains(STORES.MANIFESTS)) {
          const manifestStore = db.createObjectStore(STORES.MANIFESTS, {
            keyPath: 'id',
          });
          manifestStore.createIndex('name', 'name', { unique: false });
          manifestStore.createIndex('version', 'version', { unique: false });
          manifestStore.createIndex('author', 'author.name', { unique: false });
        }

        // Create states store
        if (!db.objectStoreNames.contains(STORES.STATES)) {
          const stateStore = db.createObjectStore(STORES.STATES, {
            keyPath: 'id',
          });
          stateStore.createIndex('state', 'state', { unique: false });
          stateStore.createIndex('enabled', 'enabled', { unique: false });
        }

        // Create settings store
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          const settingsStore = db.createObjectStore(STORES.SETTINGS, {
            keyPath: 'pluginId',
          });
        }

        // Create permissions store
        if (!db.objectStoreNames.contains(STORES.PERMISSIONS)) {
          const permissionsStore = db.createObjectStore(STORES.PERMISSIONS, {
            keyPath: 'pluginId',
          });
        }

        // Create plugin files store
        if (!db.objectStoreNames.contains(STORES.FILES)) {
          const filesStore = db.createObjectStore(STORES.FILES, {
            keyPath: 'id',
            autoIncrement: true,
          });
          filesStore.createIndex('pluginId', 'pluginId', { unique: false });
          filesStore.createIndex('path', ['pluginId', 'path'], { unique: true });
        }

        // Create versions store
        if (!db.objectStoreNames.contains(STORES.VERSIONS)) {
          const versionsStore = db.createObjectStore(STORES.VERSIONS, {
            keyPath: 'id',
            autoIncrement: true,
          });
          versionsStore.createIndex('pluginId', 'pluginId', { unique: false });
          versionsStore.createIndex('version', ['pluginId', 'version'], { unique: true });
        }

        // Create installation logs store
        if (!db.objectStoreNames.contains(STORES.INSTALLATION_LOGS)) {
          const logsStore = db.createObjectStore(STORES.INSTALLATION_LOGS, {
            keyPath: 'id',
            autoIncrement: true,
          });
          logsStore.createIndex('pluginId', 'pluginId', { unique: false });
          logsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Close storage database
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
  }

  // ========================================================================
  // MANIFEST STORAGE
  // ========================================================================

  /**
   * Store plugin manifest
   */
  async storeManifest(manifest: PluginManifest): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MANIFESTS], 'readwrite');
      const store = transaction.objectStore(STORES.MANIFESTS);
      const request = store.put(manifest);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError(`Failed to store manifest for ${manifest.id}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }));
    });
  }

  /**
   * Get plugin manifest
   */
  async getManifest(pluginId: PluginId): Promise<PluginManifest | null> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MANIFESTS], 'readonly');
      const store = transaction.objectStore(STORES.MANIFESTS);
      const request = store.get(pluginId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new StorageError(`Failed to get manifest for ${pluginId}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }));
    });
  }

  /**
   * Get all manifests
   */
  async getAllManifests(): Promise<PluginManifest[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MANIFESTS], 'readonly');
      const store = transaction.objectStore(STORES.MANIFESTS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new StorageError('Failed to get all manifests', {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }));
    });
  }

  /**
   * Delete plugin manifest
   */
  async deleteManifest(pluginId: PluginId): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MANIFESTS], 'readwrite');
      const store = transaction.objectStore(STORES.MANIFESTS);
      const request = store.delete(pluginId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError(`Failed to delete manifest for ${pluginId}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }));
    });
  }

  // ========================================================================
  // STATE STORAGE
  // ========================================================================

  /**
   * Store plugin runtime state
   */
  async storeState(state: PluginRuntimeState): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STATES], 'readwrite');
      const store = transaction.objectStore(STORES.STATES);
      const request = store.put(state);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError(`Failed to store state for ${state.id}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }));
    });
  }

  /**
   * Get plugin runtime state
   */
  async getState(pluginId: PluginId): Promise<PluginRuntimeState | null> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STATES], 'readonly');
      const store = transaction.objectStore(STORES.STATES);
      const request = store.get(pluginId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new StorageError(`Failed to get state for ${pluginId}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }));
    });
  }

  /**
   * Get all runtime states
   */
  async getAllStates(): Promise<PluginRuntimeState[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STATES], 'readonly');
      const store = transaction.objectStore(STORES.STATES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new StorageError('Failed to get all states', {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }));
    });
  }

  /**
   * Update plugin state
   */
  async updateState(
    pluginId: PluginId,
    updates: Partial<Omit<PluginRuntimeState, 'id' | 'installedAt' | 'updatedAt'>>
  ): Promise<void> {
    const existing = await this.getState(pluginId);
    if (!existing) {
      throw new NotFoundError('plugin state', pluginId);
    }

    const updated: PluginRuntimeState = {
      ...existing,
      ...updates,
      id: existing.id,
      installedAt: existing.installedAt,
      updatedAt: Date.now(),
    };

    await this.storeState(updated);
  }

  /**
   * Delete plugin state
   */
  async deleteState(pluginId: PluginId): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STATES], 'readwrite');
      const store = transaction.objectStore(STORES.STATES);
      const request = store.delete(pluginId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError(`Failed to delete state for ${pluginId}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }));
    });
  }

  // ========================================================================
  // PERMISSION STORAGE
  // ========================================================================

  /**
   * Store plugin permissions
   */
  async storePermissions(permissions: PluginPermissionState): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PERMISSIONS], 'readwrite');
      const store = transaction.objectStore(STORES.PERMISSIONS);
      const request = store.put(permissions);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError(`Failed to store permissions for ${permissions.pluginId}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }));
    });
  }

  /**
   * Get plugin permissions
   */
  async getPermissions(pluginId: PluginId): Promise<PluginPermissionState | null> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PERMISSIONS], 'readonly');
      const store = transaction.objectStore(STORES.PERMISSIONS);
      const request = store.get(pluginId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new StorageError(`Failed to get permissions for ${pluginId}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }));
    });
  }

  /**
   * Update plugin permissions
   */
  async updatePermissions(
    pluginId: PluginId,
    updates: Partial<Omit<PluginPermissionState, 'pluginId' | 'lastUpdated'>>
  ): Promise<void> {
    const existing = await this.getPermissions(pluginId);
    if (!existing) {
      throw new NotFoundError('plugin permissions', pluginId);
    }

    const updated: PluginPermissionState = {
      ...existing,
      ...updates,
      pluginId: existing.pluginId,
      lastUpdated: Date.now(),
    };

    await this.storePermissions(updated);
  }

  /**
   * Delete plugin permissions
   */
  async deletePermissions(pluginId: PluginId): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PERMISSIONS], 'readwrite');
      const store = transaction.objectStore(STORES.PERMISSIONS);
      const request = store.delete(pluginId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError(`Failed to delete permissions for ${pluginId}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }));
    });
  }

  // ========================================================================
  // FILE STORAGE
  // ========================================================================

  /**
   * Store plugin file
   */
  async storeFile(fileData: PluginFileData): Promise<number> {
    await this.ensureInitialized();

    // Check file size
    if (this.options.maxPluginSize) {
      const currentSize = await this.getPluginTotalSize(fileData.pluginId);
      if (currentSize + fileData.size > this.options.maxPluginSize) {
        throw new ValidationError('Plugin size exceeds maximum', {
          field: 'size',
          value: fileData.size,
          context: {
            maxSize: this.options.maxPluginSize,
            currentSize,
            pluginId: fileData.pluginId
          }
        });
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.FILES], 'readwrite');
      const store = transaction.objectStore(STORES.FILES);
      const request = store.add(fileData);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(new StorageError(`Failed to store file ${fileData.path}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined,
        context: { pluginId: fileData.pluginId, path: fileData.path }
      }));
    });
  }

  /**
   * Store multiple plugin files
   */
  async storeFiles(files: PluginFileData[]): Promise<number[]> {
    const results: number[] = [];

    for (const file of files) {
      const id = await this.storeFile(file);
      results.push(id);
    }

    return results;
  }

  /**
   * Get plugin file by path
   */
  async getFile(pluginId: PluginId, path: string): Promise<PluginFileData | null> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.FILES], 'readonly');
      const store = transaction.objectStore(STORES.FILES);
      const index = store.index('path');
      const request = index.get([pluginId, path]);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new StorageError(`Failed to get file ${path}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined,
        context: { pluginId, path }
      }));
    });
  }

  /**
   * Get all plugin files
   */
  async getAllFiles(pluginId: PluginId): Promise<PluginFileData[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.FILES], 'readonly');
      const store = transaction.objectStore(STORES.FILES);
      const index = store.index('pluginId');
      const request = index.getAll(pluginId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new StorageError(`Failed to get files for ${pluginId}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined,
        context: { pluginId }
      }));
    });
  }

  /**
   * Delete plugin file
   */
  async deleteFile(fileId: number): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.FILES], 'readwrite');
      const store = transaction.objectStore(STORES.FILES);
      const request = store.delete(fileId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError(`Failed to delete file ${fileId}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }));
    });
  }

  /**
   * Delete all plugin files
   */
  async deleteAllFiles(pluginId: PluginId): Promise<void> {
    const files = await this.getAllFiles(pluginId);

    for (const file of files) {
      if (file.id !== undefined) {
        await this.deleteFile(file.id);
      }
    }
  }

  /**
   * Get plugin total storage size
   */
  async getPluginTotalSize(pluginId: PluginId): Promise<number> {
    const files = await this.getAllFiles(pluginId);
    return files.reduce((total, file) => total + file.size, 0);
  }

  // ========================================================================
  // VERSION MANAGEMENT
  // ========================================================================

  /**
   * Store plugin version info
   */
  async storeVersion(version: PluginVersionInfo): Promise<number> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.VERSIONS], 'readwrite');
      const store = transaction.objectStore(STORES.VERSIONS);
      const request = store.add(version);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(new StorageError(`Failed to store version ${version.version}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined,
        context: { pluginId: version.pluginId, version: version.version }
      }));
    });
  }

  /**
   * Get plugin version info
   */
  async getVersion(pluginId: PluginId, version: string): Promise<PluginVersionInfo | null> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.VERSIONS], 'readonly');
      const store = transaction.objectStore(STORES.VERSIONS);
      const index = store.index('version');
      const request = index.get([pluginId, version]);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new StorageError(`Failed to get version ${version}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined,
        context: { pluginId, version }
      }));
    });
  }

  /**
   * Get all plugin versions
   */
  async getAllVersions(pluginId: PluginId): Promise<PluginVersionInfo[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.VERSIONS], 'readonly');
      const store = transaction.objectStore(STORES.VERSIONS);
      const index = store.index('pluginId');
      const request = index.getAll(pluginId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new StorageError(`Failed to get versions for ${pluginId}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined,
        context: { pluginId }
      }));
    });
  }

  /**
   * Get active version for plugin
   */
  async getActiveVersion(pluginId: PluginId): Promise<PluginVersionInfo | null> {
    const versions = await this.getAllVersions(pluginId);
    return versions.find(v => v.active) || null;
  }

  /**
   * Set active version for plugin
   */
  async setActiveVersion(pluginId: PluginId, version: string): Promise<void> {
    const versions = await this.getAllVersions(pluginId);

    // Deactivate all versions
    for (const v of versions) {
      v.active = false;
      await this.updateVersion(v);
    }

    // Activate specified version
    const targetVersion = await this.getVersion(pluginId, version);
    if (targetVersion) {
      targetVersion.active = true;
      await this.updateVersion(targetVersion);
    }
  }

  /**
   * Update version info
   */
  async updateVersion(version: PluginVersionInfo): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.VERSIONS], 'readwrite');
      const store = transaction.objectStore(STORES.VERSIONS);
      const request = store.put(version);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError(`Failed to update version ${version.version}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined,
        context: { pluginId: version.pluginId, version: version.version }
      }));
    });
  }

  /**
   * Delete version info
   */
  async deleteVersion(versionId: number): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.VERSIONS], 'readwrite');
      const store = transaction.objectStore(STORES.VERSIONS);
      const request = store.delete(versionId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError(`Failed to delete version ${versionId}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }));
    });
  }

  /**
   * Clean old versions (keep only last N)
   */
  async cleanOldVersions(pluginId: PluginId, keepCount: number = this.options.autoCleanVersions || 3): Promise<void> {
    const versions = await this.getAllVersions(pluginId);

    if (versions.length <= keepCount) {
      return;
    }

    // Sort by installation date (newest first)
    versions.sort((a, b) => b.installedAt - a.installedAt);

    // Keep first N versions
    const toKeep = versions.slice(0, keepCount);
    const toDelete = versions.slice(keepCount);

    // Delete old versions
    for (const version of toDelete) {
      if (version.id !== undefined && !version.active) {
        await this.deleteVersion(version.id);
      }
    }
  }

  // ========================================================================
  // INSTALLATION LOGS
  // ========================================================================

  /**
   * Add installation log entry
   */
  async addInstallationLog(log: Omit<InstallationLog, 'id'>): Promise<number> {
    await this.ensureInitialized();

    const logEntry: InstallationLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.INSTALLATION_LOGS], 'readwrite');
      const store = transaction.objectStore(STORES.INSTALLATION_LOGS);
      const request = store.add(logEntry);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(new StorageError('Failed to add installation log', {
        technicalDetails: request.error?.message,
        cause: request.error || undefined,
        context: { pluginId: log.pluginId, operation: log.operation }
      }));
    });
  }

  /**
   * Get installation logs for plugin
   */
  async getInstallationLogs(pluginId: PluginId, limit?: number): Promise<InstallationLog[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.INSTALLATION_LOGS], 'readonly');
      const store = transaction.objectStore(STORES.INSTALLATION_LOGS);
      const index = store.index('pluginId');
      const request = index.getAll(pluginId);

      request.onsuccess = () => {
        let logs = (request.result || []) as InstallationLog[];
        // Sort by timestamp descending
        logs.sort((a, b) => b.timestamp - a.timestamp);
        // Apply limit if specified
        if (limit) {
          logs = logs.slice(0, limit);
        }
        resolve(logs);
      };
      request.onerror = () => reject(new StorageError(`Failed to get logs for ${pluginId}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined,
        context: { pluginId }
      }));
    });
  }

  /**
   * Get all installation logs
   */
  async getAllInstallationLogs(limit?: number): Promise<InstallationLog[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.INSTALLATION_LOGS], 'readonly');
      const store = transaction.objectStore(STORES.INSTALLATION_LOGS);
      const request = store.getAll();

      request.onsuccess = () => {
        let logs = (request.result || []) as InstallationLog[];
        // Sort by timestamp descending
        logs.sort((a, b) => b.timestamp - a.timestamp);
        // Apply limit if specified
        if (limit) {
          logs = logs.slice(0, limit);
        }
        resolve(logs);
      };
      request.onerror = () => reject(new StorageError('Failed to get all logs', {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }));
    });
  }

  /**
   * Clear old installation logs
   */
  async clearOldLogs(olderThan: number): Promise<void> {
    const logs = await this.getAllInstallationLogs();
    const now = Date.now();

    for (const log of logs) {
      if (now - log.timestamp > olderThan) {
        await this.deleteLog(log.id);
      }
    }
  }

  /**
   * Delete installation log
   */
  async deleteLog(logId: string): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.INSTALLATION_LOGS], 'readwrite');
      const store = transaction.objectStore(STORES.INSTALLATION_LOGS);
      const request = store.delete(logId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError(`Failed to delete log ${logId}`, {
        technicalDetails: request.error?.message,
        cause: request.error || undefined
      }));
    });
  }

  // ========================================================================
  // PLUGIN LIFECYCLE OPERATIONS
  // ========================================================================

  /**
   * Install plugin (complete operation)
   */
  async installPlugin(
    manifest: PluginManifest,
    files: PluginFileData[],
    source: PluginSourceType,
    sourceUrl?: string
  ): Promise<void> {
    const pluginId = manifest.id;

    // Log installation start
    await this.addInstallationLog({
      pluginId,
      version: manifest.version,
      operation: 'install',
      status: 'started',
      timestamp: Date.now(),
    });

    try {
      // Store manifest
      await this.storeManifest(manifest);

      // Store files
      await this.storeFiles(files);

      // Create runtime state
      await this.storeState({
        id: pluginId,
        state: 'installed' as PluginState,
        enabled: false,
        settings: manifest.defaultSettings || {},
        grantedPermissions: [],
        stats: {
          activationCount: 0,
          executionCount: 0,
          errorCount: 0,
          cpuTime: 0,
          peakMemoryMB: 0,
          networkRequests: 0,
          storageUsedMB: 0,
          avgExecutionTime: 0,
        },
        errors: [],
        installedAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create permissions state
      await this.storePermissions({
        pluginId,
        granted: manifest.permissions || [],
        denied: [],
        pending: manifest.optionalPermissions || [],
        lastUpdated: Date.now(),
      });

      // Store version info
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      await this.storeVersion({
        pluginId,
        version: manifest.version,
        installedAt: Date.now(),
        source,
        sourceUrl,
        active: true,
        manifest,
        fileCount: files.length,
        totalSize,
      });

      // Clean old versions
      await this.cleanOldVersions(pluginId);

      // Log installation success
      await this.addInstallationLog({
        pluginId,
        version: manifest.version,
        operation: 'install',
        status: 'completed',
        timestamp: Date.now(),
      });
    } catch (error) {
      // Log installation failure
      await this.addInstallationLog({
        pluginId,
        version: manifest.version,
        operation: 'install',
        status: 'failed',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Uninstall plugin (complete operation)
   */
  async uninstallPlugin(pluginId: PluginId): Promise<void> {
    // Get current version for logging
    const currentVersion = await this.getActiveVersion(pluginId);

    // Log uninstallation start
    await this.addInstallationLog({
      pluginId,
      version: currentVersion?.version || 'unknown',
      operation: 'uninstall',
      status: 'started',
      timestamp: Date.now(),
    });

    try {
      // Delete all plugin data
      await this.deleteManifest(pluginId);
      await this.deleteState(pluginId);
      await this.deletePermissions(pluginId);
      await this.deleteAllFiles(pluginId);

      // Delete all version info
      const versions = await this.getAllVersions(pluginId);
      for (const version of versions) {
        if (version.id !== undefined) {
          await this.deleteVersion(version.id);
        }
      }

      // Log uninstallation success
      await this.addInstallationLog({
        pluginId,
        version: currentVersion?.version || 'unknown',
        operation: 'uninstall',
        status: 'completed',
        timestamp: Date.now(),
      });
    } catch (error) {
      // Log uninstallation failure
      await this.addInstallationLog({
        pluginId,
        version: currentVersion?.version || 'unknown',
        operation: 'uninstall',
        status: 'failed',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Update plugin to new version
   */
  async updatePlugin(
    pluginId: PluginId,
    newManifest: PluginManifest,
    newFiles: PluginFileData[]
  ): Promise<void> {
    // Get current version
    const currentVersion = await this.getActiveVersion(pluginId);
    if (!currentVersion) {
      throw new NotFoundError('plugin version', pluginId);
    }

    // Log update start
    await this.addInstallationLog({
      pluginId,
      version: newManifest.version,
      operation: 'update',
      status: 'started',
      timestamp: Date.now(),
      metadata: { fromVersion: currentVersion.version },
    });

    try {
      // Deactivate current version
      currentVersion.active = false;
      await this.updateVersion(currentVersion);

      // Store new manifest
      await this.storeManifest(newManifest);

      // Delete old files and store new files
      await this.deleteAllFiles(pluginId);
      await this.storeFiles(newFiles);

      // Store new version info
      const totalSize = newFiles.reduce((sum, f) => sum + f.size, 0);
      await this.storeVersion({
        pluginId,
        version: newManifest.version,
        installedAt: Date.now(),
        source: currentVersion.source,
        sourceUrl: currentVersion.sourceUrl,
        active: true,
        manifest: newManifest,
        fileCount: newFiles.length,
        totalSize,
      });

      // Update runtime state
      await this.updateState(pluginId, {
        state: 'installed' as PluginState,
      });

      // Clean old versions
      await this.cleanOldVersions(pluginId);

      // Log update success
      await this.addInstallationLog({
        pluginId,
        version: newManifest.version,
        operation: 'update',
        status: 'completed',
        timestamp: Date.now(),
        metadata: { fromVersion: currentVersion.version },
      });
    } catch (error) {
      // Rollback on failure
      currentVersion.active = true;
      await this.updateVersion(currentVersion);

      // Log update failure
      await this.addInstallationLog({
        pluginId,
        version: newManifest.version,
        operation: 'update',
        status: 'failed',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error),
        metadata: { fromVersion: currentVersion.version },
      });

      throw error;
    }
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Export plugin data (for backup)
   */
  async exportPlugin(pluginId: PluginId): Promise<{
    manifest: PluginManifest;
    state: PluginRuntimeState;
    files: PluginFileData[];
    versions: PluginVersionInfo[];
    permissions: PluginPermissionState | null;
  }> {
    const manifest = await this.getManifest(pluginId);
    const state = await this.getState(pluginId);
    const files = await this.getAllFiles(pluginId);
    const versions = await this.getAllVersions(pluginId);
    const permissions = await this.getPermissions(pluginId);

    if (!manifest || !state) {
      throw new NotFoundError('plugin data', pluginId);
    }

    return {
      manifest,
      state,
      files,
      versions,
      permissions,
    };
  }

  /**
   * Import plugin data (from backup)
   */
  async importPlugin(data: {
    manifest: PluginManifest;
    state: PluginRuntimeState;
    files: PluginFileData[];
    versions: PluginVersionInfo[];
    permissions?: PluginPermissionState | null;
  }): Promise<void> {
    const { manifest, state, files, versions, permissions } = data;

    // Store manifest
    await this.storeManifest(manifest);

    // Store state
    await this.storeState(state);

    // Store files
    await this.storeFiles(files);

    // Store versions
    for (const version of versions) {
      await this.storeVersion(version);
    }

    // Store permissions if provided
    if (permissions) {
      await this.storePermissions(permissions);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalPlugins: number;
    totalFiles: number;
    totalSize: number;
    totalVersions: number;
    breakdown: Record<PluginId, { fileCount: number; size: number; versionCount: number }>;
  }> {
    const manifests = await this.getAllManifests();
    const breakdown: Record<string, { fileCount: number; size: number; versionCount: number }> = {};

    let totalFiles = 0;
    let totalSize = 0;
    let totalVersions = 0;

    for (const manifest of manifests) {
      const files = await this.getAllFiles(manifest.id);
      const versions = await this.getAllVersions(manifest.id);
      const size = files.reduce((sum, f) => sum + f.size, 0);

      breakdown[manifest.id] = {
        fileCount: files.length,
        size,
        versionCount: versions.length,
      };

      totalFiles += files.length;
      totalSize += size;
      totalVersions += versions.length;
    }

    return {
      totalPlugins: manifests.length,
      totalFiles,
      totalSize,
      totalVersions,
      breakdown,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let pluginStoreInstance: PluginStore | null = null;

/**
 * Get plugin store instance
 */
export function getPluginStore(options?: PluginStorageOptions): PluginStore {
  if (!pluginStoreInstance) {
    pluginStoreInstance = new PluginStore(options);
  }
  return pluginStoreInstance;
}

/**
 * Initialize plugin store
 */
export async function initializePluginStore(options?: PluginStorageOptions): Promise<PluginStore> {
  const store = getPluginStore(options);
  await store.initialize();
  return store;
}
