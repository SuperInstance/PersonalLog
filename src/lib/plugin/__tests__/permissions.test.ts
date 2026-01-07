/**
 * Plugin Permission System Tests
 *
 * Comprehensive tests for plugin permission management including:
 * - Permission state management (3-state model)
 * - Permission requests and grants
 * - Permission validation
 * - Dangerous permission handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PermissionManager,
  PermissionValidator,
  PermissionState,
  PERMISSION_DESCRIPTIONS,
  DANGEROUS_PERMISSIONS,
  PERMISSION_CATEGORIES,
  type PluginPermissionSummary,
  type PermissionCheckResult,
} from '../permissions';
import { Permission } from '../types';
import { PluginId } from '../types';

// ============================================================================
// TEST UTILITIES
// ============================================================================

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

function createMockPluginStore() {
  const store = {
    getPermissions: vi.fn(),
    storePermissions: vi.fn(),
    updatePermissions: vi.fn(),
    deletePermissions: vi.fn(),
  };
  return store;
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('PermissionManager', () => {
  let manager: PermissionManager;
  let mockStore: ReturnType<typeof createMockPluginStore>;

  beforeEach(async () => {
    await cleanDatabase();
    manager = new PermissionManager();
    mockStore = createMockPluginStore();

    // Mock the plugin store module
    vi.doMock('../storage', () => ({
      getPluginStore: () => mockStore,
    }));
  });

  // ========================================================================
  // PERMISSION CHECKING
  // ========================================================================

  describe('Permission Checking', () => {
    it('should return granted for existing permission', async () => {
      const pluginId = 'test.plugin' as PluginId;
      mockStore.getPermissions.mockResolvedValue({
        pluginId,
        granted: [Permission.READ_CONVERSATIONS],
        denied: [],
        pending: [],
        lastUpdated: Date.now(),
      });

      const result = await manager.checkPermission(pluginId, Permission.READ_CONVERSATIONS);

      expect(result.granted).toBe(true);
      expect(result.state).toBe(PermissionState.GRANTED);
      expect(result.reason).toBeUndefined();
    });

    it('should return denied for denied permission', async () => {
      const pluginId = 'test.plugin' as PluginId;
      mockStore.getPermissions.mockResolvedValue({
        pluginId,
        granted: [],
        denied: [Permission.DELETE_CONVERSATIONS],
        pending: [],
        lastUpdated: Date.now(),
      });

      const result = await manager.checkPermission(pluginId, Permission.DELETE_CONVERSATIONS);

      expect(result.granted).toBe(false);
      expect(result.state).toBe(PermissionState.DENIED);
      expect(result.reason).toBe('Permission was denied by user');
    });

    it('should return prompt for pending permission', async () => {
      const pluginId = 'test.plugin' as PluginId;
      mockStore.getPermissions.mockResolvedValue({
        pluginId,
        granted: [],
        denied: [],
        pending: [Permission.NETWORK_REQUEST],
        lastUpdated: Date.now(),
      });

      const result = await manager.checkPermission(pluginId, Permission.NETWORK_REQUEST);

      expect(result.granted).toBe(false);
      expect(result.state).toBe(PermissionState.PROMPT);
      expect(result.reason).toBe('Permission awaiting user approval');
    });

    it('should return prompt for non-existent permission state', async () => {
      const pluginId = 'test.plugin' as PluginId;
      mockStore.getPermissions.mockResolvedValue(null);

      const result = await manager.checkPermission(pluginId, Permission.READ_CONVERSATIONS);

      expect(result.granted).toBe(false);
      expect(result.state).toBe(PermissionState.PROMPT);
      expect(result.reason).toBe('Permission not yet requested');
    });

    it('should check permissions synchronously via hasPermission', () => {
      const pluginId = 'test.plugin' as PluginId;
      manager.grantPermissions(pluginId, [Permission.READ_CONVERSATIONS]);

      const hasPermission = manager.hasPermission(pluginId, Permission.READ_CONVERSATIONS);
      expect(hasPermission).toBe(true);
    });

    it('should check if plugin has all permissions', () => {
      const pluginId = 'test.plugin' as PluginId;
      manager.grantPermissions(pluginId, [
        Permission.READ_CONVERSATIONS,
        Permission.WRITE_CONVERSATIONS,
        Permission.READ_MESSAGES,
      ]);

      const hasAll = manager.hasAllPermissions(pluginId, [
        Permission.READ_CONVERSATIONS,
        Permission.WRITE_CONVERSATIONS,
      ]);
      expect(hasAll).toBe(true);

      const missing = manager.hasAllPermissions(pluginId, [
        Permission.READ_CONVERSATIONS,
        Permission.EXECUTE_CODE,
      ]);
      expect(missing).toBe(false);
    });

    it('should check if plugin has any of the permissions', () => {
      const pluginId = 'test.plugin' as PluginId;
      manager.grantPermissions(pluginId, [Permission.READ_CONVERSATIONS]);

      const hasAny = manager.hasAnyPermission(pluginId, [
        Permission.READ_CONVERSATIONS,
        Permission.EXECUTE_CODE,
      ]);
      expect(hasAny).toBe(true);

      const hasNone = manager.hasAnyPermission(pluginId, [
        Permission.EXECUTE_CODE,
        Permission.NETWORK_REQUEST,
      ]);
      expect(hasNone).toBe(false);
    });
  });

  // ========================================================================
  // PERMISSION GRANTING
  // ========================================================================

  describe('Permission Granting', () => {
    it('should grant permission to plugin', async () => {
      const pluginId = 'test.plugin' as PluginId;
      mockStore.getPermissions.mockResolvedValue(null);
      mockStore.storePermissions.mockResolvedValue(undefined);

      await manager.grantPermission(pluginId, Permission.READ_CONVERSATIONS);

      expect(mockStore.storePermissions).toHaveBeenCalledWith({
        pluginId,
        granted: [Permission.READ_CONVERSATIONS],
        denied: [],
        pending: [],
        lastUpdated: expect.any(Number),
      });
      expect(manager.hasPermission(pluginId, Permission.READ_CONVERSATIONS)).toBe(true);
    });

    it('should grant permission and remove from denied/pending', async () => {
      const pluginId = 'test.plugin' as PluginId;
      mockStore.getPermissions.mockResolvedValue({
        pluginId,
        granted: [],
        denied: [Permission.READ_CONVERSATIONS],
        pending: [Permission.WRITE_CONVERSATIONS],
        lastUpdated: Date.now(),
      });
      mockStore.updatePermissions.mockResolvedValue(undefined);

      await manager.grantPermission(pluginId, Permission.READ_CONVERSATIONS);

      expect(mockStore.updatePermissions).toHaveBeenCalledWith(pluginId, {
        granted: expect.arrayContaining([Permission.READ_CONVERSATIONS]),
        denied: expect.not.arrayContaining([Permission.READ_CONVERSATIONS]),
        pending: expect.not.arrayContaining([Permission.READ_CONVERSATIONS]),
      });
    });

    it('should grant multiple permissions', async () => {
      const pluginId = 'test.plugin' as PluginId;
      mockStore.getPermissions.mockResolvedValue(null);
      mockStore.storePermissions.mockResolvedValue(undefined);

      await manager.grantPermissions(pluginId, [
        Permission.READ_CONVERSATIONS,
        Permission.WRITE_CONVERSATIONS,
        Permission.READ_MESSAGES,
      ]);

      expect(mockStore.storePermissions).toHaveBeenCalled();
      expect(manager.hasPermission(pluginId, Permission.READ_CONVERSATIONS)).toBe(true);
      expect(manager.hasPermission(pluginId, Permission.WRITE_CONVERSATIONS)).toBe(true);
      expect(manager.hasPermission(pluginId, Permission.READ_MESSAGES)).toBe(true);
    });
  });

  // ========================================================================
  // PERMISSION REVOCATION
  // ========================================================================

  describe('Permission Revocation', () => {
    it('should revoke permission from plugin', async () => {
      const pluginId = 'test.plugin' as PluginId;
      manager.grantPermissions(pluginId, [Permission.READ_CONVERSATIONS]);

      mockStore.getPermissions.mockResolvedValue({
        pluginId,
        granted: [Permission.READ_CONVERSATIONS],
        denied: [],
        pending: [],
        lastUpdated: Date.now(),
      });
      mockStore.updatePermissions.mockResolvedValue(undefined);

      await manager.revokePermission(pluginId, Permission.READ_CONVERSATIONS);

      expect(manager.hasPermission(pluginId, Permission.READ_CONVERSATIONS)).toBe(false);
      expect(mockStore.updatePermissions).toHaveBeenCalled();
    });

    it('should add revoked permission to denied list', async () => {
      const pluginId = 'test.plugin' as PluginId;
      mockStore.getPermissions.mockResolvedValue({
        pluginId,
        granted: [Permission.READ_CONVERSATIONS],
        denied: [],
        pending: [],
        lastUpdated: Date.now(),
      });
      mockStore.updatePermissions.mockResolvedValue(undefined);

      await manager.revokePermission(pluginId, Permission.READ_CONVERSATIONS);

      expect(mockStore.updatePermissions).toHaveBeenCalledWith(pluginId, {
        granted: expect.not.arrayContaining([Permission.READ_CONVERSATIONS]),
        denied: expect.arrayContaining([Permission.READ_CONVERSATIONS]),
        pending: expect.any(Array),
      });
    });

    it('should revoke all permissions from plugin', async () => {
      const pluginId = 'test.plugin' as PluginId;
      manager.grantPermissions(pluginId, [
        Permission.READ_CONVERSATIONS,
        Permission.WRITE_CONVERSATIONS,
      ]);

      mockStore.deletePermissions.mockResolvedValue(undefined);

      await manager.revokeAllPermissions(pluginId);

      expect(mockStore.deletePermissions).toHaveBeenCalledWith(pluginId);
      expect(manager.hasPermission(pluginId, Permission.READ_CONVERSATIONS)).toBe(false);
      expect(manager.hasPermission(pluginId, Permission.WRITE_CONVERSATIONS)).toBe(false);
    });

    it('should reset permission to prompt state', async () => {
      const pluginId = 'test.plugin' as PluginId;
      mockStore.getPermissions.mockResolvedValue({
        pluginId,
        granted: [Permission.READ_CONVERSATIONS],
        denied: [],
        pending: [],
        lastUpdated: Date.now(),
      });
      mockStore.updatePermissions.mockResolvedValue(undefined);

      await manager.resetPermission(pluginId, Permission.READ_CONVERSATIONS);

      expect(mockStore.updatePermissions).toHaveBeenCalledWith(pluginId, {
        granted: expect.not.arrayContaining([Permission.READ_CONVERSATIONS]),
        denied: expect.not.arrayContaining([Permission.READ_CONVERSATIONS]),
        pending: expect.arrayContaining([Permission.READ_CONVERSATIONS]),
      });
    });
  });

  // ========================================================================
  // PERMISSION QUERIES
  // ========================================================================

  describe('Permission Queries', () => {
    it('should get granted permissions for plugin', () => {
      const pluginId = 'test.plugin' as PluginId;
      const permissions = [
        Permission.READ_CONVERSATIONS,
        Permission.WRITE_CONVERSATIONS,
        Permission.READ_MESSAGES,
      ];
      manager.grantPermissions(pluginId, permissions);

      const granted = manager.getGrantedPermissions(pluginId);

      expect(granted).toEqual(expect.arrayContaining(permissions));
      expect(granted).toHaveLength(3);
    });

    it('should return empty array for plugin with no permissions', () => {
      const pluginId = 'test.plugin' as PluginId;
      const granted = manager.getGrantedPermissions(pluginId);

      expect(granted).toEqual([]);
    });

    it('should get all plugins with specific permission', () => {
      const plugin1 = 'plugin1' as PluginId;
      const plugin2 = 'plugin2' as PluginId;
      const plugin3 = 'plugin3' as PluginId;

      manager.grantPermissions(plugin1, [Permission.READ_CONVERSATIONS]);
      manager.grantPermissions(plugin2, [Permission.WRITE_CONVERSATIONS]);
      manager.grantPermissions(plugin3, [Permission.READ_CONVERSATIONS, Permission.WRITE_CONVERSATIONS]);

      const plugins = manager.getPluginsWithPermission(Permission.READ_CONVERSATIONS);

      expect(plugins).toContain(plugin1);
      expect(plugins).toContain(plugin3);
      expect(plugins).not.toContain(plugin2);
    });

    it('should get permission summary for plugin', async () => {
      const pluginId = 'test.plugin' as PluginId;
      mockStore.getPermissions.mockResolvedValue({
        pluginId,
        granted: [Permission.READ_CONVERSATIONS],
        denied: [Permission.EXECUTE_CODE],
        pending: [Permission.NETWORK_REQUEST],
        lastUpdated: Date.now(),
      });

      const summary = await manager.getPluginPermissions(pluginId);

      expect(summary.pluginId).toBe(pluginId);
      expect(summary.granted).toContain(Permission.READ_CONVERSATIONS);
      expect(summary.denied).toContain(Permission.EXECUTE_CODE);
      expect(summary.pending).toContain(Permission.NETWORK_REQUEST);
      expect(summary.lastUpdated).toBeGreaterThan(0);
    });

    it('should return empty summary for non-existent plugin', async () => {
      const pluginId = 'test.plugin' as PluginId;
      mockStore.getPermissions.mockResolvedValue(null);

      const summary = await manager.getPluginPermissions(pluginId);

      expect(summary.pluginId).toBe(pluginId);
      expect(summary.granted).toEqual([]);
      expect(summary.denied).toEqual([]);
      expect(summary.pending).toEqual([]);
    });

    it('should get missing permissions', () => {
      const pluginId = 'test.plugin' as PluginId;
      manager.grantPermissions(pluginId, [Permission.READ_CONVERSATIONS]);

      const required = [
        Permission.READ_CONVERSATIONS,
        Permission.WRITE_CONVERSATIONS,
        Permission.EXECUTE_CODE,
      ];

      const missing = manager.getMissingPermissions(pluginId, required);

      expect(missing).toContain(Permission.WRITE_CONVERSATIONS);
      expect(missing).toContain(Permission.EXECUTE_CODE);
      expect(missing).not.toContain(Permission.READ_CONVERSATIONS);
    });
  });

  // ========================================================================
  // PERMISSION REQUESTS
  // ========================================================================

  describe('Permission Requests', () => {
    it('should create permission request', async () => {
      const pluginId = 'test.plugin' as PluginId;
      mockStore.getPermissions.mockResolvedValue(null);
      mockStore.storePermissions.mockResolvedValue(undefined);

      const requestPromise = manager.requestPermission(pluginId, Permission.READ_CONVERSATIONS, {
        reason: 'Need to read conversations',
      });

      // Get pending requests
      const pending = manager.getPendingRequests();
      expect(pending).toHaveLength(1);
      expect(pending[0].pluginId).toBe(pluginId);
      expect(pending[0].permission).toBe(Permission.READ_CONVERSATIONS);
      expect(pending[0].reason).toBe('Need to read conversations');
    });

    it('should return existing state if already decided', async () => {
      const pluginId = 'test.plugin' as PluginId;
      mockStore.getPermissions.mockResolvedValue({
        pluginId,
        granted: [Permission.READ_CONVERSATIONS],
        denied: [],
        pending: [],
        lastUpdated: Date.now(),
      });

      const result = await manager.requestPermission(pluginId, Permission.READ_CONVERSATIONS);

      expect(result.granted).toBe(true);
      expect(result.state).toBe(PermissionState.GRANTED);
    });

    it('should get pending requests for plugin', async () => {
      const pluginId = 'test.plugin' as PluginId;
      mockStore.getPermissions.mockResolvedValue(null);
      mockStore.storePermissions.mockResolvedValue(undefined);

      manager.requestPermission(pluginId, Permission.READ_CONVERSATIONS);
      manager.requestPermission(pluginId, Permission.WRITE_CONVERSATIONS);

      const pluginPending = manager.getPendingRequestsForPlugin(pluginId);

      expect(pluginPending).toHaveLength(2);
    });

    it('should resolve permission request', async () => {
      const pluginId = 'test.plugin' as PluginId;
      mockStore.getPermissions.mockResolvedValue(null);

      let resolved = false;
      const requestPromise = manager.requestPermission(pluginId, Permission.READ_CONVERSATIONS);
      requestPromise.then(() => {
        resolved = true;
      });

      const pending = manager.getPendingRequests()[0];
      mockStore.storePermissions.mockResolvedValue(undefined);

      await manager.resolvePermissionRequest(pending.id, PermissionState.GRANTED, true);

      expect(resolved).toBe(true);
    });

    it('should request multiple permissions in batch', async () => {
      const pluginId = 'test.plugin' as PluginId;
      mockStore.getPermissions.mockResolvedValue(null);
      mockStore.storePermissions.mockResolvedValue(undefined);

      const { allGranted, results } = await manager.requestPermissions(
        pluginId,
        [Permission.READ_CONVERSATIONS, Permission.WRITE_CONVERSATIONS]
      );

      expect(results).toBeDefined();
      expect(results[Permission.READ_CONVERSATIONS]).toBeDefined();
      expect(results[Permission.WRITE_CONVERSATIONS]).toBeDefined();
    });
  });

  // ========================================================================
  // PERMISSION VALIDATION
  // ========================================================================

  describe('Permission Validation', () => {
    it('should validate manifest permissions', () => {
      const manifest = {
        id: 'test.plugin' as any,
        name: 'Test',
        description: 'Test',
        version: '1.0.0',
        minAppVersion: '1.0.0',
        author: { name: 'Test' },
        license: 'MIT',
        type: [],
        keywords: [],
        categories: [],
        permissions: [Permission.READ_CONVERSATIONS, 'invalid:permission' as any],
      };

      const result = manager.validateManifestPermissions(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid permission: invalid:permission');
    });

    it('should warn about dangerous permission combinations', () => {
      const manifest = {
        id: 'test.plugin' as any,
        name: 'Test',
        description: 'Test',
        version: '1.0.0',
        minAppVersion: '1.0.0',
        author: { name: 'Test' },
        license: 'MIT',
        type: [],
        keywords: [],
        categories: [],
        permissions: [Permission.EXECUTE_CODE, Permission.NETWORK_REQUEST],
      };

      const result = manager.validateManifestPermissions(manifest);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should warn about dangerous permissions', () => {
      const manifest = {
        id: 'test.plugin' as any,
        name: 'Test',
        description: 'Test',
        version: '1.0.0',
        minAppVersion: '1.0.0',
        author: { name: 'Test' },
        license: 'MIT',
        type: [],
        keywords: [],
        categories: [],
        permissions: [Permission.EXECUTE_CODE],
      };

      const result = manager.validateManifestPermissions(manifest);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('dangerous'))).toBe(true);
    });

    it('should filter allowed resources based on permission', () => {
      const pluginId = 'test.plugin' as PluginId;
      manager.grantPermissions(pluginId, [Permission.READ_CONVERSATIONS]);

      const resources = ['conv1', 'conv2', 'conv3'];
      const filtered = manager.filterAllowedResources(
        pluginId,
        Permission.READ_CONVERSATIONS,
        resources
      );

      expect(filtered).toEqual(resources);
    });

    it('should return empty resources when permission denied', () => {
      const pluginId = 'test.plugin' as PluginId;
      const resources = ['conv1', 'conv2', 'conv3'];
      const filtered = manager.filterAllowedResources(
        pluginId,
        Permission.READ_CONVERSATIONS,
        resources
      );

      expect(filtered).toEqual([]);
    });
  });

  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================

  describe('State Management', () => {
    it('should export permission state', () => {
      const plugin1 = 'plugin1' as PluginId;
      const plugin2 = 'plugin2' as PluginId;

      manager.grantPermissions(plugin1, [Permission.READ_CONVERSATIONS]);
      manager.grantPermissions(plugin2, [Permission.WRITE_CONVERSATIONS]);

      const state = manager.exportState();

      expect(state[plugin1]).toContain(Permission.READ_CONVERSATIONS);
      expect(state[plugin2]).toContain(Permission.WRITE_CONVERSATIONS);
    });

    it('should import permission state', () => {
      const plugin1 = 'plugin1' as PluginId;
      const plugin2 = 'plugin2' as PluginId;

      const state = {
        [plugin1]: [Permission.READ_CONVERSATIONS],
        [plugin2]: [Permission.WRITE_CONVERSATIONS],
      };

      manager.importState(state);

      expect(manager.hasPermission(plugin1, Permission.READ_CONVERSATIONS)).toBe(true);
      expect(manager.hasPermission(plugin2, Permission.WRITE_CONVERSATIONS)).toBe(true);
    });

    it('should clear all permissions', () => {
      const plugin1 = 'plugin1' as PluginId;
      const plugin2 = 'plugin2' as PluginId;

      manager.grantPermissions(plugin1, [Permission.READ_CONVERSATIONS]);
      manager.grantPermissions(plugin2, [Permission.WRITE_CONVERSATIONS]);

      manager.clearAll();

      expect(manager.hasPermission(plugin1, Permission.READ_CONVERSATIONS)).toBe(false);
      expect(manager.hasPermission(plugin2, Permission.WRITE_CONVERSATIONS)).toBe(false);
    });
  });
});

// ============================================================================
// PERMISSION VALIDATOR TESTS
// ============================================================================

describe('PermissionValidator', () => {
  let manager: PermissionManager;

  beforeEach(() => {
    manager = new PermissionManager();
  });

  it('should validate permission request', () => {
    const pluginId = 'test.plugin' as PluginId;
    manager.grantPermissions(pluginId, [Permission.READ_CONVERSATIONS]);

    const result = PermissionValidator.validateRequest(
      pluginId,
      Permission.READ_CONVERSATIONS,
      manager
    );

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should deny invalid permission request', () => {
    const pluginId = 'test.plugin' as PluginId;

    const result = PermissionValidator.validateRequest(
      pluginId,
      Permission.READ_CONVERSATIONS,
      manager
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('should validate multiple permissions', () => {
    const pluginId = 'test.plugin' as PluginId;
    manager.grantPermissions(pluginId, [
      Permission.READ_CONVERSATIONS,
      Permission.WRITE_CONVERSATIONS,
    ]);

    const result = PermissionValidator.validatePermissions(
      pluginId,
      [Permission.READ_CONVERSATIONS, Permission.WRITE_CONVERSATIONS],
      manager
    );

    expect(result.allowed).toBe(true);
    expect(result.allowedPermissions).toHaveLength(2);
    expect(result.deniedPermissions).toHaveLength(0);
  });

  it('should identify denied permissions in batch validation', () => {
    const pluginId = 'test.plugin' as PluginId;
    manager.grantPermissions(pluginId, [Permission.READ_CONVERSATIONS]);

    const result = PermissionValidator.validatePermissions(
      pluginId,
      [Permission.READ_CONVERSATIONS, Permission.WRITE_CONVERSATIONS],
      manager
    );

    expect(result.allowed).toBe(false);
    expect(result.allowedPermissions).toContain(Permission.READ_CONVERSATIONS);
    expect(result.deniedPermissions).toContain(Permission.WRITE_CONVERSATIONS);
  });

  it('should map operations to permissions', () => {
    const permission = PermissionValidator.requiresPermission('conversations:list');
    expect(permission).toBe(Permission.READ_CONVERSATIONS);

    const msgPermission = PermissionValidator.requiresPermission('messages:create');
    expect(msgPermission).toBe(Permission.WRITE_MESSAGES);

    const unknown = PermissionValidator.requiresPermission('unknown:operation');
    expect(unknown).toBeNull();
  });
});

// ============================================================================
// PERMISSION CONSTANTS TESTS
// ============================================================================

describe('Permission Constants', () => {
  it('should have descriptions for all permissions', () => {
    Object.values(Permission).forEach(permission => {
      expect(PERMISSION_DESCRIPTIONS[permission]).toBeDefined();
      expect(typeof PERMISSION_DESCRIPTIONS[permission]).toBe('string');
    });
  });

  it('should have dangerous permissions marked', () => {
    expect(DANGEROUS_PERMISSIONS.has(Permission.EXECUTE_CODE)).toBe(true);
    expect(DANGEROUS_PERMISSIONS.has(Permission.WRITE_SETTINGS)).toBe(true);
    expect(DANGEROUS_PERMISSIONS.has(Permission.NETWORK_REQUEST)).toBe(true);
  });

  it('should have permission categories organized', () => {
    expect(PERMISSION_CATEGORIES.conversations).toBeDefined();
    expect(PERMISSION_CATEGORIES.messages).toBeDefined();
    expect(PERMISSION_CATEGORIES.knowledge).toBeDefined();
    expect(PERMISSION_CATEGORIES.analytics).toBeDefined();
    expect(PERMISSION_CATEGORIES.settings).toBeDefined();
    expect(PERMISSION_CATEGORIES.network).toBeDefined();
    expect(PERMISSION_CATEGORIES.storage).toBeDefined();
    expect(PERMISSION_CATEGORIES.ui).toBeDefined();
    expect(PERMISSION_CATEGORIES.system).toBeDefined();
  });

  it('should have all permissions in categories', () => {
    const categorizedPermissions = new Set<Permission>();
    Object.values(PERMISSION_CATEGORIES).forEach(category => {
      category.permissions.forEach(permission => {
        categorizedPermissions.add(permission);
      });
    });

    Object.values(Permission).forEach(permission => {
      expect(categorizedPermissions.has(permission)).toBe(true);
    });
  });
});
