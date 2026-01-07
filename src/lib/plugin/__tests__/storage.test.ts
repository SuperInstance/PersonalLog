/**
 * Plugin Storage Tests
 *
 * Comprehensive tests for plugin storage system.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  PluginStore,
  PluginFileData,
  PluginVersionInfo,
  PluginPermissionState,
  InstallationLog,
} from '../storage';
import type {
  PluginManifest,
  PluginRuntimeState,
  PluginState,
  PluginSourceType,
} from '../types';
import { PluginType, Permission } from '../types';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createTestManifest(overrides?: Partial<PluginManifest>): PluginManifest {
  return {
    id: `test-plugin-${Date.now()}` as any,
    name: 'Test Plugin',
    description: 'A test plugin',
    version: '1.0.0',
    minAppVersion: '1.0.0',
    author: {
      name: 'Test Author',
      email: 'test@example.com',
    },
    license: 'MIT',
    type: [PluginType.UI],
    keywords: ['test'],
    categories: ['testing'],
    permissions: [Permission.READ_CONVERSATIONS],
    defaultSettings: {
      testOption: true,
    },
    ...overrides,
  };
}

function createTestState(pluginId: string, overrides?: Partial<PluginRuntimeState>): PluginRuntimeState {
  return {
    id: pluginId as any,
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
    installedAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function createTestFile(pluginId: string, overrides?: Partial<PluginFileData>): PluginFileData {
  return {
    pluginId: pluginId as any,
    name: 'test.js',
    path: '/test.js',
    content: 'console.log("test");',
    mimeType: 'application/javascript',
    size: 25,
    lastModified: Date.now(),
    hash: 'abc123',
    ...overrides,
  };
}

async function cleanDatabase(): Promise<void> {
  const databases = await indexedDB.databases();
  for (const db of databases) {
    if (db.name?.startsWith('PersonalLogPlugins')) {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(db.name!);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('PluginStore', () => {
  let store: PluginStore;

  beforeEach(async () => {
    await cleanDatabase();
    store = new PluginStore();
    await store.initialize();
  });

  afterEach(async () => {
    await store.close();
    await cleanDatabase();
  });

  // ========================================================================
  // MANIFEST STORAGE
  // ========================================================================

  describe('Manifest Storage', () => {
    it('should store and retrieve manifest', async () => {
      const manifest = createTestManifest();
      await store.storeManifest(manifest);

      const retrieved = await store.getManifest(manifest.id);
      expect(retrieved).toEqual(manifest);
    });

    it('should return null for non-existent manifest', async () => {
      const retrieved = await store.getManifest('non-existent' as any);
      expect(retrieved).toBeNull();
    });

    it('should get all manifests', async () => {
      const manifest1 = createTestManifest({ id: 'plugin-1' as any, name: 'Plugin 1' });
      const manifest2 = createTestManifest({ id: 'plugin-2' as any, name: 'Plugin 2' });

      await store.storeManifest(manifest1);
      await store.storeManifest(manifest2);

      const all = await store.getAllManifests();
      expect(all).toHaveLength(2);
      expect(all.find(m => m.id === manifest1.id)).toBeDefined();
      expect(all.find(m => m.id === manifest2.id)).toBeDefined();
    });

    it('should update existing manifest', async () => {
      const manifest = createTestManifest({ version: '1.0.0' });
      await store.storeManifest(manifest);

      const updated = { ...manifest, version: '2.0.0', description: 'Updated description' };
      await store.storeManifest(updated);

      const retrieved = await store.getManifest(manifest.id);
      expect(retrieved?.version).toBe('2.0.0');
      expect(retrieved?.description).toBe('Updated description');
    });

    it('should delete manifest', async () => {
      const manifest = createTestManifest();
      await store.storeManifest(manifest);

      await store.deleteManifest(manifest.id);

      const retrieved = await store.getManifest(manifest.id);
      expect(retrieved).toBeNull();
    });
  });

  // ========================================================================
  // STATE STORAGE
  // ========================================================================

  describe('State Storage', () => {
    it('should store and retrieve state', async () => {
      const pluginId = 'test-plugin' as any;
      const state = createTestState(pluginId);

      await store.storeState(state);

      const retrieved = await store.getState(pluginId);
      expect(retrieved).toEqual(state);
    });

    it('should return null for non-existent state', async () => {
      const retrieved = await store.getState('non-existent' as any);
      expect(retrieved).toBeNull();
    });

    it('should get all states', async () => {
      const state1 = createTestState('plugin-1' as any);
      const state2 = createTestState('plugin-2' as any);

      await store.storeState(state1);
      await store.storeState(state2);

      const all = await store.getAllStates();
      expect(all).toHaveLength(2);
    });

    it('should update state fields', async () => {
      const pluginId = 'test-plugin' as any;
      const state = createTestState(pluginId, { enabled: false });

      await store.storeState(state);
      await store.updateState(pluginId, { enabled: true, state: 'active' as PluginState });

      const retrieved = await store.getState(pluginId);
      expect(retrieved?.enabled).toBe(true);
      expect(retrieved?.state).toBe('active');
    });

    it('should update timestamp on state update', async () => {
      const pluginId = 'test-plugin' as any;
      const state = createTestState(pluginId);

      await store.storeState(state);

      const originalTimestamp = state.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await store.updateState(pluginId, { enabled: true });

      const retrieved = await store.getState(pluginId);
      expect(retrieved?.updatedAt).toBeGreaterThan(originalTimestamp);
    });

    it('should delete state', async () => {
      const pluginId = 'test-plugin' as any;
      const state = createTestState(pluginId);

      await store.storeState(state);
      await store.deleteState(pluginId);

      const retrieved = await store.getState(pluginId);
      expect(retrieved).toBeNull();
    });
  });

  // ========================================================================
  // PERMISSION STORAGE
  // ========================================================================

  describe('Permission Storage', () => {
    it('should store and retrieve permissions', async () => {
      const pluginId = 'test-plugin' as any;
      const permissions: PluginPermissionState = {
        pluginId,
        granted: [Permission.READ_CONVERSATIONS],
        denied: [Permission.DELETE_CONVERSATIONS],
        pending: [Permission.NETWORK_REQUEST],
        lastUpdated: Date.now(),
      };

      await store.storePermissions(permissions);

      const retrieved = await store.getPermissions(pluginId);
      expect(retrieved).toEqual(permissions);
    });

    it('should update permissions', async () => {
      const pluginId = 'test-plugin' as any;
      const permissions: PluginPermissionState = {
        pluginId,
        granted: [],
        denied: [],
        pending: [],
        lastUpdated: Date.now(),
      };

      await store.storePermissions(permissions);
      await store.updatePermissions(pluginId, {
        granted: [Permission.READ_CONVERSATIONS],
      });

      const retrieved = await store.getPermissions(pluginId);
      expect(retrieved?.granted).toContain(Permission.READ_CONVERSATIONS);
    });

    it('should delete permissions', async () => {
      const pluginId = 'test-plugin' as any;
      const permissions: PluginPermissionState = {
        pluginId,
        granted: [],
        denied: [],
        pending: [],
        lastUpdated: Date.now(),
      };

      await store.storePermissions(permissions);
      await store.deletePermissions(pluginId);

      const retrieved = await store.getPermissions(pluginId);
      expect(retrieved).toBeNull();
    });
  });

  // ========================================================================
  // FILE STORAGE
  // ========================================================================

  describe('File Storage', () => {
    it('should store and retrieve file', async () => {
      const pluginId = 'test-plugin' as any;
      const file = createTestFile(pluginId);

      const fileId = await store.storeFile(file);
      expect(fileId).toBeDefined();

      const retrieved = await store.getFile(pluginId, file.path);
      expect(retrieved).toEqual(file);
    });

    it('should store multiple files', async () => {
      const pluginId = 'test-plugin' as any;
      const files = [
        createTestFile(pluginId, { path: '/file1.js', name: 'file1.js' }),
        createTestFile(pluginId, { path: '/file2.js', name: 'file2.js' }),
        createTestFile(pluginId, { path: '/file3.js', name: 'file3.js' }),
      ];

      const fileIds = await store.storeFiles(files);
      expect(fileIds).toHaveLength(3);

      const retrieved = await store.getAllFiles(pluginId);
      expect(retrieved).toHaveLength(3);
    });

    it('should get all files for plugin', async () => {
      const pluginId = 'test-plugin' as any;
      const file1 = createTestFile(pluginId, { path: '/file1.js' });
      const file2 = createTestFile(pluginId, { path: '/file2.js' });

      await store.storeFile(file1);
      await store.storeFile(file2);

      const files = await store.getAllFiles(pluginId);
      expect(files).toHaveLength(2);
      expect(files.find(f => f.path === '/file1.js')).toBeDefined();
      expect(files.find(f => f.path === '/file2.js')).toBeDefined();
    });

    it('should delete file', async () => {
      const pluginId = 'test-plugin' as any;
      const file = createTestFile(pluginId);

      const fileId = await store.storeFile(file);
      await store.deleteFile(fileId);

      const retrieved = await store.getFile(pluginId, file.path);
      expect(retrieved).toBeNull();
    });

    it('should delete all files', async () => {
      const pluginId = 'test-plugin' as any;
      const files = [
        createTestFile(pluginId, { path: '/file1.js' }),
        createTestFile(pluginId, { path: '/file2.js' }),
      ];

      await store.storeFiles(files);
      await store.deleteAllFiles(pluginId);

      const retrieved = await store.getAllFiles(pluginId);
      expect(retrieved).toHaveLength(0);
    });

    it('should calculate total plugin size', async () => {
      const pluginId = 'test-plugin' as any;
      const files = [
        createTestFile(pluginId, { size: 100 }),
        createTestFile(pluginId, { path: '/file2.js', size: 200 }),
        createTestFile(pluginId, { path: '/file3.js', size: 300 }),
      ];

      await store.storeFiles(files);

      const totalSize = await store.getPluginTotalSize(pluginId);
      expect(totalSize).toBe(600);
    });
  });

  // ========================================================================
  // VERSION MANAGEMENT
  // ========================================================================

  describe('Version Management', () => {
    it('should store and retrieve version', async () => {
      const pluginId = 'test-plugin' as any;
      const manifest = createTestManifest({ id: pluginId, version: '1.0.0' });

      const version: PluginVersionInfo = {
        pluginId,
        version: '1.0.0',
        installedAt: Date.now(),
        source: 'file' as PluginSourceType,
        active: true,
        manifest,
        fileCount: 1,
        totalSize: 1000,
      };

      const versionId = await store.storeVersion(version);
      expect(versionId).toBeDefined();

      const retrieved = await store.getVersion(pluginId, '1.0.0');
      expect(retrieved).toEqual(version);
    });

    it('should get all versions', async () => {
      const pluginId = 'test-plugin' as any;
      const manifest1 = createTestManifest({ id: pluginId, version: '1.0.0' });
      const manifest2 = createTestManifest({ id: pluginId, version: '2.0.0' });

      const version1: PluginVersionInfo = {
        pluginId,
        version: '1.0.0',
        installedAt: Date.now(),
        source: 'file' as PluginSourceType,
        active: false,
        manifest: manifest1,
        fileCount: 1,
        totalSize: 1000,
      };

      const version2: PluginVersionInfo = {
        pluginId,
        version: '2.0.0',
        installedAt: Date.now() + 1000,
        source: 'file' as PluginSourceType,
        active: true,
        manifest: manifest2,
        fileCount: 2,
        totalSize: 2000,
      };

      await store.storeVersion(version1);
      await store.storeVersion(version2);

      const versions = await store.getAllVersions(pluginId);
      expect(versions).toHaveLength(2);
    });

    it('should get active version', async () => {
      const pluginId = 'test-plugin' as any;
      const manifest = createTestManifest({ id: pluginId, version: '1.0.0' });

      const version1: PluginVersionInfo = {
        pluginId,
        version: '1.0.0',
        installedAt: Date.now(),
        source: 'file' as PluginSourceType,
        active: true,
        manifest,
        fileCount: 1,
        totalSize: 1000,
      };

      await store.storeVersion(version1);

      const active = await store.getActiveVersion(pluginId);
      expect(active).toEqual(version1);
    });

    it('should set active version', async () => {
      const pluginId = 'test-plugin' as any;
      const manifest1 = createTestManifest({ id: pluginId, version: '1.0.0' });
      const manifest2 = createTestManifest({ id: pluginId, version: '2.0.0' });

      const version1: PluginVersionInfo = {
        pluginId,
        version: '1.0.0',
        installedAt: Date.now(),
        source: 'file' as PluginSourceType,
        active: true,
        manifest: manifest1,
        fileCount: 1,
        totalSize: 1000,
      };

      const version2: PluginVersionInfo = {
        pluginId,
        version: '2.0.0',
        installedAt: Date.now() + 1000,
        source: 'file' as PluginSourceType,
        active: false,
        manifest: manifest2,
        fileCount: 2,
        totalSize: 2000,
      };

      await store.storeVersion(version1);
      await store.storeVersion(version2);
      await store.setActiveVersion(pluginId, '2.0.0');

      const v1 = await store.getVersion(pluginId, '1.0.0');
      const v2 = await store.getVersion(pluginId, '2.0.0');

      expect(v1?.active).toBe(false);
      expect(v2?.active).toBe(true);
    });

    it('should clean old versions', async () => {
      const pluginId = 'test-plugin' as any;
      const baseTime = Date.now();

      // Create 5 versions
      for (let i = 1; i <= 5; i++) {
        const manifest = createTestManifest({ id: pluginId, version: `${i}.0.0` });
        const version: PluginVersionInfo = {
          pluginId,
          version: `${i}.0.0`,
          installedAt: baseTime + i * 1000,
          source: 'file' as PluginSourceType,
          active: i === 5, // Last one is active
          manifest,
          fileCount: i,
          totalSize: i * 1000,
        };

        await store.storeVersion(version);
      }

      // Keep only 3 versions
      await store.cleanOldVersions(pluginId, 3);

      const versions = await store.getAllVersions(pluginId);
      expect(versions.length).toBeLessThanOrEqual(3);
    });

    it('should not delete active version when cleaning', async () => {
      const pluginId = 'test-plugin' as any;
      const baseTime = Date.now();

      // Create old active version
      const manifest1 = createTestManifest({ id: pluginId, version: '1.0.0' });
      const version1: PluginVersionInfo = {
        pluginId,
        version: '1.0.0',
        installedAt: baseTime,
        source: 'file' as PluginSourceType,
        active: true,
        manifest: manifest1,
        fileCount: 1,
        totalSize: 1000,
      };

      await store.storeVersion(version1);
      await store.cleanOldVersions(pluginId, 1);

      const versions = await store.getAllVersions(pluginId);
      expect(versions).toHaveLength(1);
      expect(versions[0].active).toBe(true);
    });
  });

  // ========================================================================
  // INSTALLATION LOGS
  // ========================================================================

  describe('Installation Logs', () => {
    it('should add installation log', async () => {
      const logId = await store.addInstallationLog({
        pluginId: 'test-plugin' as any,
        version: '1.0.0',
        operation: 'install',
        status: 'completed',
        timestamp: Date.now(),
      });

      expect(logId).toBeDefined();
    });

    it('should get installation logs for plugin', async () => {
      const pluginId = 'test-plugin' as any;

      await store.addInstallationLog({
        pluginId,
        version: '1.0.0',
        operation: 'install',
        status: 'completed',
        timestamp: Date.now() - 2000,
      });

      await store.addInstallationLog({
        pluginId,
        version: '2.0.0',
        operation: 'update',
        status: 'completed',
        timestamp: Date.now() - 1000,
      });

      const logs = await store.getInstallationLogs(pluginId);
      expect(logs).toHaveLength(2);
    });

    it('should limit installation logs', async () => {
      const pluginId = 'test-plugin' as any;

      for (let i = 0; i < 10; i++) {
        await store.addInstallationLog({
          pluginId,
          version: '1.0.0',
          operation: 'install',
          status: 'completed',
          timestamp: Date.now() + i,
        });
      }

      const logs = await store.getInstallationLogs(pluginId, 5);
      expect(logs).toHaveLength(5);
    });

    it('should sort logs by timestamp descending', async () => {
      const pluginId = 'test-plugin' as any;

      await store.addInstallationLog({
        pluginId,
        version: '1.0.0',
        operation: 'install',
        status: 'completed',
        timestamp: 1000,
      });

      await store.addInstallationLog({
        pluginId,
        version: '2.0.0',
        operation: 'update',
        status: 'completed',
        timestamp: 2000,
      });

      await store.addInstallationLog({
        pluginId,
        version: '3.0.0',
        operation: 'update',
        status: 'completed',
        timestamp: 3000,
      });

      const logs = await store.getInstallationLogs(pluginId);
      expect(logs[0].timestamp).toBeGreaterThan(logs[1].timestamp);
      expect(logs[1].timestamp).toBeGreaterThan(logs[2].timestamp);
    });

    it('should delete log', async () => {
      const logId = await store.addInstallationLog({
        pluginId: 'test-plugin' as any,
        version: '1.0.0',
        operation: 'install',
        status: 'completed',
        timestamp: Date.now(),
      });

      await store.deleteLog(String(logId));

      const logs = await store.getInstallationLogs('test-plugin' as any);
      expect(logs).toHaveLength(0);
    });
  });

  // ========================================================================
  // PLUGIN LIFECYCLE
  // ========================================================================

  describe('Plugin Lifecycle', () => {
    it('should install plugin completely', async () => {
      const manifest = createTestManifest();
      const files = [createTestFile(manifest.id)];

      await store.installPlugin(manifest, files, 'file' as PluginSourceType);

      // Verify all data is stored
      const storedManifest = await store.getManifest(manifest.id);
      expect(storedManifest).toEqual(manifest);

      const state = await store.getState(manifest.id);
      expect(state?.state).toBe('installed');

      const storedFiles = await store.getAllFiles(manifest.id);
      expect(storedFiles).toHaveLength(1);

      const version = await store.getActiveVersion(manifest.id);
      expect(version?.version).toBe(manifest.version);
      expect(version?.active).toBe(true);

      const logs = await store.getInstallationLogs(manifest.id);
      expect(logs).toHaveLength(2); // started + completed
      expect(logs[1].status).toBe('completed');
    });

    it('should log installation failure', async () => {
      const manifest = createTestManifest();

      // Try to install with invalid data (will throw)
      try {
        await store.installPlugin(manifest, [], 'file' as PluginSourceType);
      } catch (error) {
        // Expected error
      }

      const logs = await store.getInstallationLogs(manifest.id);
      const failedLog = logs.find(l => l.status === 'failed');
      expect(failedLog).toBeDefined();
    });

    it('should uninstall plugin completely', async () => {
      const manifest = createTestManifest();
      const files = [createTestFile(manifest.id)];

      await store.installPlugin(manifest, files, 'file' as PluginSourceType);
      await store.uninstallPlugin(manifest.id);

      // Verify all data is deleted
      const storedManifest = await store.getManifest(manifest.id);
      expect(storedManifest).toBeNull();

      const state = await store.getState(manifest.id);
      expect(state).toBeNull();

      const storedFiles = await store.getAllFiles(manifest.id);
      expect(storedFiles).toHaveLength(0);

      const versions = await store.getAllVersions(manifest.id);
      expect(versions).toHaveLength(0);
    });

    it('should update plugin to new version', async () => {
      const manifest1 = createTestManifest({ version: '1.0.0' });
      const files1 = [createTestFile(manifest1.id)];

      await store.installPlugin(manifest1, files1, 'file' as PluginSourceType);

      const manifest2 = createTestManifest({
        id: manifest1.id,
        version: '2.0.0',
        description: 'Updated plugin',
      });
      const files2 = [
        createTestFile(manifest2.id, { path: '/file2.js', size: 500 }),
      ];

      await store.updatePlugin(manifest2.id, manifest2, files2);

      // Verify new version is active
      const version = await store.getActiveVersion(manifest2.id);
      expect(version?.version).toBe('2.0.0');

      // Verify manifest is updated
      const storedManifest = await store.getManifest(manifest2.id);
      expect(storedManifest?.version).toBe('2.0.0');
      expect(storedManifest?.description).toBe('Updated plugin');

      // Verify old version is deactivated
      const oldVersion = await store.getVersion(manifest2.id, '1.0.0');
      expect(oldVersion?.active).toBe(false);

      // Verify logs
      const logs = await store.getInstallationLogs(manifest2.id);
      const updateLog = logs.find(l => l.operation === 'update');
      expect(updateLog).toBeDefined();
    });

    it('should rollback update on failure', async () => {
      const manifest1 = createTestManifest({ version: '1.0.0' });
      const files1 = [createTestFile(manifest1.id)];

      await store.installPlugin(manifest1, files1, 'file' as PluginSourceType);

      const manifest2 = createTestManifest({
        id: manifest1.id,
        version: '2.0.0',
      });

      // Try to update with invalid data (will throw)
      try {
        await store.updatePlugin(manifest2.id, manifest2, []);
      } catch (error) {
        // Expected error
      }

      // Verify old version is still active
      const activeVersion = await store.getActiveVersion(manifest1.id);
      expect(activeVersion?.version).toBe('1.0.0');
      expect(activeVersion?.active).toBe(true);
    });
  });

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  describe('Utility Methods', () => {
    it('should export plugin data', async () => {
      const manifest = createTestManifest();
      const files = [createTestFile(manifest.id)];

      await store.installPlugin(manifest, files, 'file' as PluginSourceType);

      const exported = await store.exportPlugin(manifest.id);

      expect(exported.manifest).toEqual(manifest);
      expect(exported.files).toHaveLength(1);
      expect(exported.versions).toHaveLength(1);
      expect(exported.state).toBeDefined();
    });

    it('should import plugin data', async () => {
      const manifest = createTestManifest();
      const files = [createTestFile(manifest.id)];

      await store.installPlugin(manifest, files, 'file' as PluginSourceType);
      const exported = await store.exportPlugin(manifest.id);

      // Clean up
      await store.uninstallPlugin(manifest.id);

      // Import
      await store.importPlugin(exported);

      // Verify imported data
      const importedManifest = await store.getManifest(manifest.id);
      expect(importedManifest).toEqual(manifest);

      const importedFiles = await store.getAllFiles(manifest.id);
      expect(importedFiles).toHaveLength(1);
    });

    it('should get storage statistics', async () => {
      const manifest1 = createTestManifest({ id: 'plugin-1' as any });
      const manifest2 = createTestManifest({ id: 'plugin-2' as any });

      await store.installPlugin(
        manifest1,
        [createTestFile(manifest1.id, { size: 1000 })],
        'file' as PluginSourceType
      );

      await store.installPlugin(
        manifest2,
        [
          createTestFile(manifest2.id, { size: 2000 }),
          createTestFile(manifest2.id, { path: '/file2.js', size: 3000 }),
        ],
        'file' as PluginSourceType
      );

      const stats = await store.getStorageStats();

      expect(stats.totalPlugins).toBe(2);
      expect(stats.totalFiles).toBe(3);
      expect(stats.totalSize).toBe(6000);
      expect(stats.totalVersions).toBe(2);
      expect(stats.breakdown[manifest1.id].fileCount).toBe(1);
      expect(stats.breakdown[manifest1.id].size).toBe(1000);
      expect(stats.breakdown[manifest2.id].fileCount).toBe(2);
      expect(stats.breakdown[manifest2.id].size).toBe(5000);
    });
  });

  // ========================================================================
  // ERROR HANDLING
  // ========================================================================

  describe('Error Handling', () => {
    it('should handle operations when database is closed', async () => {
      await store.close();

      await expect(
        store.getManifest('test' as any)
      ).rejects.toThrow();

      // Reinitialize for cleanup
      await store.initialize();
    });

    it('should handle concurrent operations', async () => {
      const manifest = createTestManifest();

      // Perform multiple concurrent operations
      await Promise.all([
        store.storeManifest(manifest),
        store.storeState(createTestState(manifest.id)),
        store.storeFile(createTestFile(manifest.id)),
      ]);

      const retrieved = await store.getManifest(manifest.id);
      expect(retrieved).toBeDefined();
    });
  });
});
