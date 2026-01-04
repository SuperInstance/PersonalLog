/**
 * Plugin Registry
 *
 * Persistent storage and management of installed plugins using IndexedDB.
 * Handles plugin installation, storage, retrieval, and lifecycle state.
 *
 * @module lib/plugin/registry
 */

import type {
  PluginManifest,
  PluginId,
  PluginRuntimeState,
  PluginState,
  PluginStats,
  PluginError,
  PluginSourceType,
} from './types';

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

const PLUGIN_DB_NAME = 'PersonalLogPlugins';
const PLUGIN_DB_VERSION = 1;

const STORES = {
  MANIFESTS: 'manifests',
  STATES: 'states',
  SETTINGS: 'settings',
} as const;

// ============================================================================
// PLUGIN REGISTRY CLASS
// ============================================================================

export class PluginRegistry {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize registry database
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
        reject(new Error(`Failed to open plugin database: ${request.error}`));
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
          manifestStore.createIndex('author', 'author.name', { unique: false });
          manifestStore.createIndex('version', 'version', { unique: false });
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
          db.createObjectStore(STORES.SETTINGS, {
            keyPath: 'pluginId',
          });
        }
      };
    });
  }

  /**
   * Close registry database
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  // ========================================================================
  // MANIFEST MANAGEMENT
  // ========================================================================

  /**
   * Register plugin manifest
   */
  async registerManifest(manifest: PluginManifest): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MANIFESTS], 'readwrite');
      const store = transaction.objectStore(STORES.MANIFESTS);
      const request = store.put(manifest);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
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
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all plugin manifests
   */
  async getAllManifests(): Promise<PluginManifest[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MANIFESTS], 'readonly');
      const store = transaction.objectStore(STORES.MANIFESTS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
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
      request.onerror = () => reject(request.error);
    });
  }

  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================

  /**
   * Create plugin runtime state
   */
  async createRuntimeState(
    pluginId: PluginId,
    source: PluginSourceType
  ): Promise<void> {
    await this.ensureInitialized();

    const now = Date.now();
    const state: PluginRuntimeState = {
      id: pluginId,
      state: 'installed' as PluginState,
      enabled: false,
      settings: {},
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
      installedAt: now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STATES], 'readwrite');
      const store = transaction.objectStore(STORES.STATES);
      const request = store.add(state);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get plugin runtime state
   */
  async getRuntimeState(pluginId: PluginId): Promise<PluginRuntimeState | null> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STATES], 'readonly');
      const store = transaction.objectStore(STORES.STATES);
      const request = store.get(pluginId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update plugin runtime state
   */
  async updateRuntimeState(
    pluginId: PluginId,
    updates: Partial<PluginRuntimeState>
  ): Promise<void> {
    await this.ensureInitialized();

    const state = await this.getRuntimeState(pluginId);
    if (!state) {
      throw new Error(`Plugin state not found: ${pluginId}`);
    }

    const updatedState: PluginRuntimeState = {
      ...state,
      ...updates,
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STATES], 'readwrite');
      const store = transaction.objectStore(STORES.STATES);
      const request = store.put(updatedState);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete plugin runtime state
   */
  async deleteRuntimeState(pluginId: PluginId): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STATES], 'readwrite');
      const store = transaction.objectStore(STORES.STATES);
      const request = store.delete(pluginId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all plugin states
   */
  async getAllRuntimeStates(): Promise<PluginRuntimeState[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STATES], 'readonly');
      const store = transaction.objectStore(STORES.STATES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get plugins by state
   */
  async getPluginsByState(state: PluginState): Promise<PluginRuntimeState[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STATES], 'readonly');
      const store = transaction.objectStore(STORES.STATES);
      const index = store.index('state');
      const request = index.getAll(state);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get enabled plugins
   */
  async getEnabledPlugins(): Promise<PluginRuntimeState[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.STATES], 'readonly');
      const store = transaction.objectStore(STORES.STATES);
      const index = store.index('enabled');
      const request = index.getAll(IDBKeyRange.only(true));

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ========================================================================
  // SETTINGS MANAGEMENT
  // ========================================================================

  /**
   * Get plugin settings
   */
  async getPluginSettings(pluginId: PluginId): Promise<Record<string, any>> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SETTINGS], 'readonly');
      const store = transaction.objectStore(STORES.SETTINGS);
      const request = store.get(pluginId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.settings || {});
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update plugin settings
   */
  async updatePluginSettings(
    pluginId: PluginId,
    settings: Record<string, any>
  ): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SETTINGS], 'readwrite');
      const store = transaction.objectStore(STORES.SETTINGS);
      const request = store.put({ pluginId, settings });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete plugin settings
   */
  async deletePluginSettings(pluginId: PluginId): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SETTINGS], 'readwrite');
      const store = transaction.objectStore(STORES.SETTINGS);
      const request = store.delete(pluginId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ========================================================================
  // STATISTICS MANAGEMENT
  // ========================================================================

  /**
   * Update plugin statistics
   */
  async updatePluginStats(
    pluginId: PluginId,
    updates: Partial<PluginStats>
  ): Promise<void> {
    const state = await this.getRuntimeState(pluginId);
    if (!state) {
      throw new Error(`Plugin state not found: ${pluginId}`);
    }

    const updatedStats: PluginStats = {
      ...state.stats,
      ...updates,
    };

    await this.updateRuntimeState(pluginId, { stats: updatedStats });
  }

  /**
   * Add plugin error
   */
  async addPluginError(
    pluginId: PluginId,
    error: Omit<PluginError, 'id' | 'timestamp'>
  ): Promise<void> {
    const state = await this.getRuntimeState(pluginId);
    if (!state) {
      throw new Error(`Plugin state not found: ${pluginId}`);
    }

    const newError: PluginError = {
      ...error,
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    const errors = [...state.errors, newError].slice(-100); // Keep last 100 errors
    await this.updateRuntimeState(pluginId, {
      errors,
      stats: {
        ...state.stats,
        errorCount: state.stats.errorCount + 1,
      },
    });
  }

  /**
   * Clear plugin errors
   */
  async clearPluginErrors(pluginId: PluginId): Promise<void> {
    const state = await this.getRuntimeState(pluginId);
    if (!state) {
      throw new Error(`Plugin state not found: ${pluginId}`);
    }

    await this.updateRuntimeState(pluginId, { errors: [] });
  }

  // ========================================================================
  // QUERY HELPERS
  // ========================================================================

  /**
   * Check if plugin is installed
   */
  async isPluginInstalled(pluginId: PluginId): Promise<boolean> {
    const manifest = await this.getManifest(pluginId);
    return manifest !== null;
  }

  /**
   * Get installed plugins count
   */
  async getInstalledCount(): Promise<number> {
    const manifests = await this.getAllManifests();
    return manifests.length;
  }

  /**
   * Get active plugins count
   */
  async getActiveCount(): Promise<number> {
    const activeStates = await this.getPluginsByState('active' as PluginState);
    return activeStates.length;
  }

  /**
   * Search plugins by name or description
   */
  async searchPlugins(query: string): Promise<PluginManifest[]> {
    const manifests = await this.getAllManifests();
    const lowerQuery = query.toLowerCase();

    return manifests.filter(
      (m) =>
        m.name.toLowerCase().includes(lowerQuery) ||
        m.description.toLowerCase().includes(lowerQuery) ||
        m.keywords.some((k) => k.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get plugins by category
   */
  async getPluginsByCategory(category: string): Promise<PluginManifest[]> {
    const manifests = await this.getAllManifests();
    return manifests.filter((m) => m.categories.includes(category));
  }

  /**
   * Get plugins by author
   */
  async getPluginsByAuthor(author: string): Promise<PluginManifest[]> {
    const manifests = await this.getAllManifests();
    return manifests.filter((m) => m.author.name === author);
  }

  // ========================================================================
  // MAINTENANCE
  // ========================================================================

  /**
   * Clear all plugin data (use with caution)
   */
  async clearAll(): Promise<void> {
    await this.ensureInitialized();

    const stores = [STORES.MANIFESTS, STORES.STATES, STORES.SETTINGS];

    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Export all plugin data
   */
  async exportData(): Promise<{
    manifests: PluginManifest[];
    states: PluginRuntimeState[];
    settings: Record<string, Record<string, any>>;
  }> {
    const [manifests, states] = await Promise.all([
      this.getAllManifests(),
      this.getAllRuntimeStates(),
    ]);

    const settings: Record<string, Record<string, any>> = {};

    for (const state of states) {
      settings[state.id] = await this.getPluginSettings(state.id);
    }

    return { manifests, states, settings };
  }

  /**
   * Import plugin data
   */
  async importData(data: {
    manifests: PluginManifest[];
    states: PluginRuntimeState[];
    settings: Record<string, Record<string, any>>;
  }): Promise<void> {
    await this.ensureInitialized();

    // Import manifests
    for (const manifest of data.manifests) {
      await this.registerManifest(manifest);
    }

    // Import states
    for (const state of data.states) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([STORES.STATES], 'readwrite');
        const store = transaction.objectStore(STORES.STATES);
        const request = store.put(state);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    // Import settings
    for (const [pluginId, settings] of Object.entries(data.settings)) {
      await this.updatePluginSettings(pluginId as PluginId, settings);
    }
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let registryInstance: PluginRegistry | null = null;

/**
 * Get plugin registry instance
 */
export function getPluginRegistry(): PluginRegistry {
  if (!registryInstance) {
    registryInstance = new PluginRegistry();
  }
  return registryInstance;
}

/**
 * Initialize plugin registry
 */
export async function initializePluginRegistry(): Promise<PluginRegistry> {
  const registry = getPluginRegistry();
  await registry.initialize();
  return registry;
}
