/**
 * Plugin Permission System Tests
 *
 * Comprehensive tests for plugin permission management including:
 * - Permission state management (3-state model)
 * - Permission requests and grants
 * - Permission validation
 * - Dangerous permission handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
import { getPluginStore } from '../storage';
import type { PluginPermissionState } from '../storage';

// This file previously mocked '../storage' (first vi.doMock in beforeEach,
// later a hoisted vi.mock). Both variants were unreliable because
// permissions.ts loads getPluginStore() through dynamic import('./storage')
// inside every method, and under vitest those dynamic imports do not
// consistently resolve to the mocked module - some calls slipped through to
// the real storage module, opening a 'PersonalLogPlugins' IndexedDB
// connection that nothing closed. IndexedDB blocks deleteDatabase() while
// any connection is open, so cleanDatabase() deadlocked at hook timeout.
// The real PluginStore works against fake-indexeddb, so these tests now run
// against the real store and assert persisted state instead of mock calls.

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
  // Retained for reference; the suite now runs against the real PluginStore.
  return getPluginStore();
}

/** Seed a permission state directly in the real plugin store. */
async function seedPermissions(state: PluginPermissionState): Promise<void> {
  await getPluginStore().storePermissions(state);
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('PermissionManager', () => {
  let manager: PermissionManager;

  beforeEach(async () => {
    await cleanDatabase();
    manager = new PermissionManager();
  });

  afterEach(async () => {
    // Close the real plugin store connection. IndexedDB blocks
    // deleteDatabase() while any connection is open, so without this the
    // next test's cleanDatabase() hangs at hook timeout.
    try {
      await getPluginStore().close();
    } catch {
      // store may not have been opened in this test
    }
  });

  // ========================================================================
  // PERMISSION CHECKING
  // ========================================================================

  describe('Permission Checking', () => {
    it('should return granted for existing permission', async () => {
      const pluginId = 'test.plugin' as PluginId;
      await seedPermissions({
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
      await seedPermissions({
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
      await seedPermissions({
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
      // (no existing permission state - empty store)

      const result = await manager.checkPermission(pluginId, Permission.READ_CONVERSATIONS);

      expect(result.granted).toBe(false);
      expect(result.state).toBe(PermissionState.PROMPT);
      expect(result.reason).toBe('Permission not yet requested');
    });

    it('should check permissions synchronously via hasPermission', async () => {
      const pluginId = 'test.plugin' as PluginId;
      // grantPermissions is async (dynamic storage import); await it before
      // checking the in-memory cache synchronously.
      await manager.grantPermissions(pluginId, [Permission.READ_CONVERSATIONS]);

      const hasPermission = manager.hasPermission(pluginId, Permission.READ_CONVERSATIONS);
      expect(hasPermission).toBe(true);
    });

    it('should check if plugin has all permissions', async () => {
      const pluginId = 'test.plugin' as PluginId;
      await manager.grantPermissions(pluginId, [
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

    it('should check if plugin has any of the permissions', async () => {
      const pluginId = 'test.plugin' as PluginId;
      await manager.grantPermissions(pluginId, [Permission.READ_CONVERSATIONS]);

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
      // (no existing permission state - empty store)

      await manager.grantPermission(pluginId, Permission.READ_CONVERSATIONS);

      const stored = await getPluginStore().getPermissions(pluginId);
      expect(stored).not.toBeNull();
      expect(stored!.pluginId).toBe(pluginId);
      expect(stored!.granted).toEqual([Permission.READ_CONVERSATIONS]);
      expect(stored!.denied).toEqual([]);
      expect(stored!.pending).toEqual([]);
      expect(stored!.lastUpdated).toBeGreaterThan(0);
      expect(manager.hasPermission(pluginId, Permission.READ_CONVERSATIONS)).toBe(true);
    });

    it('should grant permission and remove from denied/pending', async () => {
      const pluginId = 'test.plugin' as PluginId;
      await seedPermissions({
        pluginId,
        granted: [],
        denied: [Permission.READ_CONVERSATIONS],
        pending: [Permission.WRITE_CONVERSATIONS],
        lastUpdated: Date.now(),
      });

      await manager.grantPermission(pluginId, Permission.READ_CONVERSATIONS);

      const stored = await getPluginStore().getPermissions(pluginId);
      expect(stored!.granted).toEqual(expect.arrayContaining([Permission.READ_CONVERSATIONS]));
      expect(stored!.denied).toEqual(expect.not.arrayContaining([Permission.READ_CONVERSATIONS]));
      expect(stored!.pending).toEqual(expect.not.arrayContaining([Permission.READ_CONVERSATIONS]));
    });

    it('should grant multiple permissions', async () => {
      const pluginId = 'test.plugin' as PluginId;
      // (no existing permission state - empty store)

      await manager.grantPermissions(pluginId, [
        Permission.READ_CONVERSATIONS,
        Permission.WRITE_CONVERSATIONS,
        Permission.READ_MESSAGES,
      ]);

      const stored = await getPluginStore().getPermissions(pluginId);
      expect(stored).not.toBeNull();
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
      // Await: an un-awaited grant races the revoke below and leaks a pending
      // promise across test boundaries.
      await manager.grantPermissions(pluginId, [Permission.READ_CONVERSATIONS]);

      await seedPermissions({
        pluginId,
        granted: [Permission.READ_CONVERSATIONS],
        denied: [],
        pending: [],
        lastUpdated: Date.now(),
      });

      await manager.revokePermission(pluginId, Permission.READ_CONVERSATIONS);

      expect(manager.hasPermission(pluginId, Permission.READ_CONVERSATIONS)).toBe(false);
      const stored = await getPluginStore().getPermissions(pluginId);
      expect(stored!.granted).toEqual(expect.not.arrayContaining([Permission.READ_CONVERSATIONS]));
    });

    it('should add revoked permission to denied list', async () => {
      const pluginId = 'test.plugin' as PluginId;
      await seedPermissions({
        pluginId,
        granted: [Permission.READ_CONVERSATIONS],
        denied: [],
        pending: [],
        lastUpdated: Date.now(),
      });

      await manager.revokePermission(pluginId, Permission.READ_CONVERSATIONS);

      const stored = await getPluginStore().getPermissions(pluginId);
      expect(stored!.granted).toEqual(expect.not.arrayContaining([Permission.READ_CONVERSATIONS]));
      expect(stored!.denied).toEqual(expect.arrayContaining([Permission.READ_CONVERSATIONS]));
    });

    it('should revoke all permissions from plugin', async () => {
      const pluginId = 'test.plugin' as PluginId;
      await manager.grantPermissions(pluginId, [
        Permission.READ_CONVERSATIONS,
        Permission.WRITE_CONVERSATIONS,
      ]);


      await manager.revokeAllPermissions(pluginId);

      expect(await getPluginStore().getPermissions(pluginId)).toBeNull();
      expect(manager.hasPermission(pluginId, Permission.READ_CONVERSATIONS)).toBe(false);
      expect(manager.hasPermission(pluginId, Permission.WRITE_CONVERSATIONS)).toBe(false);
    });

    it('should reset permission to prompt state', async () => {
      const pluginId = 'test.plugin' as PluginId;
      await seedPermissions({
        pluginId,
        granted: [Permission.READ_CONVERSATIONS],
        denied: [],
        pending: [],
        lastUpdated: Date.now(),
      });

      await manager.resetPermission(pluginId, Permission.READ_CONVERSATIONS);

      const stored = await getPluginStore().getPermissions(pluginId);
      expect(stored!.granted).toEqual(expect.not.arrayContaining([Permission.READ_CONVERSATIONS]));
      expect(stored!.denied).toEqual(expect.not.arrayContaining([Permission.READ_CONVERSATIONS]));
      expect(stored!.pending).toEqual(expect.arrayContaining([Permission.READ_CONVERSATIONS]));
    });
  });

  // ========================================================================
  // PERMISSION QUERIES
  // ========================================================================

  describe('Permission Queries', () => {
    it('should get granted permissions for plugin', async () => {
      const pluginId = 'test.plugin' as PluginId;
      const permissions = [
        Permission.READ_CONVERSATIONS,
        Permission.WRITE_CONVERSATIONS,
        Permission.READ_MESSAGES,
      ];
      // grantPermissions is async (dynamic storage import) - await it
      // before reading the in-memory cache.
      await manager.grantPermissions(pluginId, permissions);

      const granted = manager.getGrantedPermissions(pluginId);

      expect(granted).toEqual(expect.arrayContaining(permissions));
      expect(granted).toHaveLength(3);
    });

    it('should return empty array for plugin with no permissions', () => {
      const pluginId = 'test.plugin' as PluginId;
      const granted = manager.getGrantedPermissions(pluginId);

      expect(granted).toEqual([]);
    });

    it('should get all plugins with specific permission', async () => {
      const plugin1 = 'plugin1' as PluginId;
      const plugin2 = 'plugin2' as PluginId;
      const plugin3 = 'plugin3' as PluginId;

      await manager.grantPermissions(plugin1, [Permission.READ_CONVERSATIONS]);
      await manager.grantPermissions(plugin2, [Permission.WRITE_CONVERSATIONS]);
      await manager.grantPermissions(plugin3, [Permission.READ_CONVERSATIONS, Permission.WRITE_CONVERSATIONS]);

      const plugins = manager.getPluginsWithPermission(Permission.READ_CONVERSATIONS);

      expect(plugins).toContain(plugin1);
      expect(plugins).toContain(plugin3);
      expect(plugins).not.toContain(plugin2);
    });

    it('should get permission summary for plugin', async () => {
      const pluginId = 'test.plugin' as PluginId;
      await seedPermissions({
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
      // (no existing permission state - empty store)

      const summary = await manager.getPluginPermissions(pluginId);

      expect(summary.pluginId).toBe(pluginId);
      expect(summary.granted).toEqual([]);
      expect(summary.denied).toEqual([]);
      expect(summary.pending).toEqual([]);
    });

    it('should get missing permissions', async () => {
      const pluginId = 'test.plugin' as PluginId;
      await manager.grantPermissions(pluginId, [Permission.READ_CONVERSATIONS]);

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
      // (no existing permission state - empty store)

      const requestPromise = manager.requestPermission(pluginId, Permission.READ_CONVERSATIONS, {
        reason: 'Need to read conversations',
      });

      // The request registers asynchronously (dynamic storage import inside
      // requestPermission) - wait for it to be fully PARKED before resolving.
      await vi.waitFor(() => {
        expect(manager.getPendingRequests()).toHaveLength(1);
        expect((manager as any).pendingResolvers.size).toBe(1);
      });

      // Get pending requests
      const pending = manager.getPendingRequests();
      expect(pending[0].pluginId).toBe(pluginId);
      expect(pending[0].permission).toBe(Permission.READ_CONVERSATIONS);
      expect(pending[0].reason).toBe('Need to read conversations');

      // Clean up: resolve the parked request so nothing dangles
      await manager.resolvePermissionRequest(pending[0].id, PermissionState.DENIED, true);
      await requestPromise;
    });

    it('should return existing state if already decided', async () => {
      const pluginId = 'test.plugin' as PluginId;
      await seedPermissions({
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
      // (no existing permission state - empty store)

      const p1 = manager.requestPermission(pluginId, Permission.READ_CONVERSATIONS);
      const p2 = manager.requestPermission(pluginId, Permission.WRITE_CONVERSATIONS);

      // Wait until both requests are fully PARKED (queued AND their
      // user-approval promises registered). Resolving before the park would
      // drop the resolver and leave the promise chain running past the test,
      // racing database teardown and reopening the store after afterEach
      // closed it (which blocks the next test's cleanDatabase()).
      await vi.waitFor(() => {
        expect(manager.getPendingRequestsForPlugin(pluginId)).toHaveLength(2);
        expect((manager as any).pendingResolvers.size).toBe(2);
      });

      const pluginPending = manager.getPendingRequestsForPlugin(pluginId);

      expect(pluginPending).toHaveLength(2);

      // Settle the parked requests so nothing dangles across tests
      for (const req of pluginPending) {
        await manager.resolvePermissionRequest(req.id, PermissionState.DENIED, true);
      }
      await Promise.all([p1, p2]);
    });

    it('should resolve permission request', async () => {
      const pluginId = 'test.plugin' as PluginId;
      // (no existing permission state - empty store)

      let resolved = false;
      const requestPromise = manager.requestPermission(pluginId, Permission.READ_CONVERSATIONS);
      requestPromise.then(() => {
        resolved = true;
      });

      // Wait for the request to fully park, then resolve it like the UI would.
      await vi.waitFor(() => {
        expect(manager.getPendingRequests()).toHaveLength(1);
        expect((manager as any).pendingResolvers.size).toBe(1);
      });
      const pending = manager.getPendingRequests()[0];

      await manager.resolvePermissionRequest(pending.id, PermissionState.GRANTED, true);
      await requestPromise;

      expect(resolved).toBe(true);
    });

    it('should request multiple permissions in batch', async () => {
      const pluginId = 'test.plugin' as PluginId;
      // (no existing permission state - empty store)

      // requestPermissions parks on user approval for each PROMPT permission
      // (resolvePermissionRequest is the UI hook). Drive the approvals.
      const batchPromise = manager.requestPermissions(
        pluginId,
        [Permission.READ_CONVERSATIONS, Permission.WRITE_CONVERSATIONS]
      );

      for (let i = 0; i < 2; i++) {
        await vi.waitFor(() => {
          expect(manager.getPendingRequests()).toHaveLength(1);
          expect((manager as any).pendingResolvers.size).toBe(1);
        });
        const req = manager.getPendingRequests()[0];
        await manager.resolvePermissionRequest(req.id, PermissionState.GRANTED, true);
      }

      const { allGranted, results } = await batchPromise;

      expect(results).toBeDefined();
      expect(results[Permission.READ_CONVERSATIONS]).toBeDefined();
      expect(results[Permission.WRITE_CONVERSATIONS]).toBeDefined();
      expect(allGranted).toBe(true);
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

    it('should filter allowed resources based on permission', async () => {
      const pluginId = 'test.plugin' as PluginId;
      await manager.grantPermissions(pluginId, [Permission.READ_CONVERSATIONS]);

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
    it('should export permission state', async () => {
      const plugin1 = 'plugin1' as PluginId;
      const plugin2 = 'plugin2' as PluginId;

      await manager.grantPermissions(plugin1, [Permission.READ_CONVERSATIONS]);
      await manager.grantPermissions(plugin2, [Permission.WRITE_CONVERSATIONS]);

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

    it('should clear all permissions', async () => {
      const plugin1 = 'plugin1' as PluginId;
      const plugin2 = 'plugin2' as PluginId;

      await manager.grantPermissions(plugin1, [Permission.READ_CONVERSATIONS]);
      await manager.grantPermissions(plugin2, [Permission.WRITE_CONVERSATIONS]);

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

  it('should validate permission request', async () => {
    const pluginId = 'test.plugin' as PluginId;
    await manager.grantPermissions(pluginId, [Permission.READ_CONVERSATIONS]);

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

  it('should validate multiple permissions', async () => {
    const pluginId = 'test.plugin' as PluginId;
    await manager.grantPermissions(pluginId, [
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

  it('should identify denied permissions in batch validation', async () => {
    const pluginId = 'test.plugin' as PluginId;
    await manager.grantPermissions(pluginId, [Permission.READ_CONVERSATIONS]);

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
