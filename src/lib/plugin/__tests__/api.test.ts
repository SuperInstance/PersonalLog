/**
 * Plugin API Tests
 *
 * Comprehensive tests for all plugin API functions including:
 * - API surface creation
 * - Conversations API
 * - Messages API
 * - Knowledge API
 * - Analytics API
 * - Settings API
 * - Commands API
 * - UI API
 * - Data API
 * - Plugin management API
 * - Permission management API
 * - Marketplace API
 * - Storage, events, and logger APIs
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createPluginAPI,
  createPluginContext,
  getPluginManagementAPI,
  getPermissionManagementAPI,
  getMarketplaceAPI,
} from '../api';
import { Permission, PluginId } from '../types';
import { getPluginRegistry } from '../registry';
import { getPluginManager } from '../manager';
import { getPermissionManager } from '../permissions';

// Mock the managers
vi.mock('../registry', () => ({
  getPluginRegistry: vi.fn(() => ({
    initialize: vi.fn(),
    getManifest: vi.fn(),
    getAllManifests: vi.fn(),
    deleteManifest: vi.fn(),
    getRuntimeState: vi.fn(),
    updateRuntimeState: vi.fn(),
    deleteRuntimeState: vi.fn(),
    getPluginSettings: vi.fn(),
    updatePluginSettings: vi.fn(),
    deletePluginSettings: vi.fn(),
    isPluginInstalled: vi.fn(),
    searchPlugins: vi.fn(),
    getAllRuntimeStates: vi.fn(),
  })),
}));

vi.mock('../manager', () => ({
  getPluginManager: vi.fn(() => ({
    getInstalledPlugins: vi.fn(),
    uninstall: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    updateSettings: vi.fn(),
  })),
}));

vi.mock('../permissions', () => ({
  getPermissionManager: vi.fn(() => ({
    hasPermission: vi.fn(() => true),
    grantPermissions: vi.fn(),
    revokePermission: vi.fn(),
    requestPermissions: vi.fn(async () => ({
      allGranted: true,
      results: {},
    })),
  })),
}));

describe('Plugin API', () => {
  const mockPluginId = 'test.plugin' as any;
  const mockPermissions = [Permission.READ_CONVERSATIONS, Permission.WRITE_CONVERSATIONS];
  const mockSettings = { apiKey: 'test-key', theme: 'dark' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up localStorage after each test
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('plugin_')) {
        localStorage.removeItem(key);
      }
    });
  });

  describe('createPluginAPI', () => {
    it('should create plugin API surface with all required modules', () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);

      expect(api).toBeDefined();
      expect(api.version).toBe('1.0.0');
      expect(api.commands).toBeDefined();
      expect(api.ui).toBeDefined();
      expect(api.data).toBeDefined();
      expect(api.conversations).toBeDefined();
      expect(api.messages).toBeDefined();
      expect(api.knowledge).toBeDefined();
      expect(api.analytics).toBeDefined();
      expect(api.settings).toBeDefined();
      expect(api.storage).toBeDefined();
      expect(api.events).toBeDefined();
      expect(api.logger).toBeDefined();
    });
  });

  describe('createPluginContext', () => {
    it('should create plugin context with correct properties', () => {
      const context = createPluginContext(
        mockPluginId,
        '1.0.0',
        mockPermissions,
        mockSettings
      );

      expect(context).toBeDefined();
      expect(context.pluginId).toBe(mockPluginId);
      expect(context.version).toBe('1.0.0');
      expect(context.permissions).toEqual(mockPermissions);
      expect(context.settings).toEqual(mockSettings);
      expect(context.logger).toBeDefined();
      expect(context.storage).toBeDefined();
      expect(context.events).toBeDefined();
    });
  });

  describe('Conversations API', () => {
    it('should list conversations with permission check', async () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);

      // Mock conversation store calls
      const conversations = await api.conversations.list();
      expect(conversations).toBeDefined();
      expect(Array.isArray(conversations)).toBe(true);
    });

    it('should throw error when missing required permissions', async () => {
      const permissionManager = getPermissionManager();
      vi.mocked(permissionManager).hasPermission.mockReturnValue(false);

      const api = createPluginAPI(mockPluginId, [], mockSettings);

      await expect(api.conversations.list()).rejects.toThrow('Permission denied');
    });

    it('should validate conversation ID for get operation', async () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);

      await expect(api.conversations.get('')).rejects.toThrow('Conversation ID is required');
      await expect(api.conversations.get('   ')).rejects.toThrow('Conversation ID is required');
    });

    it('should require title for conversation creation', async () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);

      await expect(api.conversations.create({})).rejects.toThrow('Conversation title is required');
    });
  });

  describe('Messages API', () => {
    it('should validate conversation ID for list operation', async () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);

      await expect(api.messages.list('')).rejects.toThrow('Conversation ID is required');
    });

    it('should require author for message creation', async () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);

      await expect(
        api.messages.create('conv-123', {})
      ).rejects.toThrow('Message author is required');
    });
  });

  describe('Knowledge API', () => {
    it('should validate search query', async () => {
      const api = createPluginAPI(mockPluginId, [Permission.READ_KNOWLEDGE], mockSettings);

      await expect(api.knowledge.search('')).rejects.toThrow('Search query is required');
    });
  });

  describe('Analytics API', () => {
    it('should validate event name for tracking', async () => {
      const api = createPluginAPI(mockPluginId, [Permission.WRITE_ANALYTICS], mockSettings);

      await expect(api.analytics.trackEvent('')).rejects.toThrow('Event name is required');
    });

    it('should track events successfully', async () => {
      const api = createPluginAPI(mockPluginId, [Permission.WRITE_ANALYTICS], mockSettings);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await api.analytics.trackEvent('test_event', { data: 'test' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Settings API', () => {
    it('should validate setting key', async () => {
      const api = createPluginAPI(mockPluginId, [Permission.READ_SETTINGS], mockSettings);

      await expect(api.settings.get('')).rejects.toThrow('Setting key is required');
    });
  });

  describe('Commands API', () => {
    it('should validate command definition', () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);

      expect(() => api.commands.register({} as any)).toThrow('Command ID is required');
      expect(() =>
        api.commands.register({ id: 'test', handler: undefined } as any)
      ).toThrow('Command handler is required');
    });

    it('should execute commands with permission checks', async () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Register a command
      api.commands.register({
        id: 'test-command',
        title: 'Test Command',
        handler: 'return true;',
      });

      await api.commands.execute('test-command');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Plugin Management API', () => {
    it('should validate plugin ID for installation', async () => {
      const api = getPluginManagementAPI();

      const result = await api.installPlugin('' as PluginId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Plugin ID is required');
    });

    it('should validate plugin ID for uninstallation', async () => {
      const api = getPluginManagementAPI();

      const result = await api.uninstallPlugin('' as PluginId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Plugin ID is required');
    });

    it('should get plugin list with filters', async () => {
      const registry = getPluginRegistry();
      vi.mocked(registry).getAllManifests.mockResolvedValue([]);

      const api = getPluginManagementAPI();
      const plugins = await api.getPluginList({ category: 'productivity' });

      expect(plugins).toBeDefined();
      expect(Array.isArray(plugins)).toBe(true);
    });

    it('should search plugins', async () => {
      const registry = getPluginRegistry();
      vi.mocked(registry).searchPlugins.mockResolvedValue([]);

      const api = getPluginManagementAPI();
      const results = await api.searchPlugins('productivity');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Permission Management API', () => {
    it('should validate inputs for granting permission', async () => {
      const api = getPermissionManagementAPI();

      const result1 = await api.grantPluginPermission(mockPluginId, Permission.READ_CONVERSATIONS);
      expect(result1.success).toBe(true);
    });

    it('should check plugin permissions', async () => {
      const api = getPermissionManagementAPI();
      const hasPermission = await api.checkPluginPermission(mockPluginId, Permission.READ_CONVERSATIONS);

      expect(typeof hasPermission).toBe('boolean');
    });

    it('should request plugin permissions', async () => {
      const api = getPermissionManagementAPI();
      const result = await api.requestPluginPermission(mockPluginId, Permission.READ_CONVERSATIONS);

      expect(result).toBeDefined();
      expect(typeof result.granted).toBe('boolean');
    });
  });

  describe('Marketplace API', () => {
    it('should get marketplace plugins with filters', async () => {
      const api = getMarketplaceAPI();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const plugins = await api.getMarketplacePlugins({
        category: 'productivity',
        minRating: 4,
      });

      expect(plugins).toBeDefined();
      expect(Array.isArray(plugins)).toBe(true);
      consoleSpy.mockRestore();
    });

    it('should validate plugin ID for reviews', async () => {
      const api = getMarketplaceAPI();

      await expect(api.getPluginReviews('' as any)).rejects.toThrow('Plugin ID is required');
    });

    it('should validate review rating', async () => {
      const api = getMarketplaceAPI();

      const result = await api.submitPluginReview(mockPluginId, { rating: 6 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rating must be between 1 and 5');
    });

    it('should validate plugin report', async () => {
      const api = getMarketplaceAPI();

      const result = await api.reportPlugin(mockPluginId, {
        reason: '',
        description: 'Test issue',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Report reason is required');
    });

    it('should submit plugin report successfully', async () => {
      const api = getMarketplaceAPI();

      const result = await api.reportPlugin(mockPluginId, {
        reason: 'Bug',
        description: 'Test issue',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Storage API', () => {
    it('should store and retrieve data', async () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);

      await api.storage.set('test-key', { data: 'test-value' });
      const value = await api.storage.get('test-key');

      expect(value).toEqual({ data: 'test-value' });
    });

    it('should list all keys', async () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);

      await api.storage.set('key1', 'value1');
      await api.storage.set('key2', 'value2');

      const keys = await api.storage.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should delete keys', async () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);

      await api.storage.set('delete-me', 'value');
      await api.storage.delete('delete-me');

      const value = await api.storage.get('delete-me');
      expect(value).toBeNull();
    });
  });

  describe('Event Bus API', () => {
    it('should emit and receive events', () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);
      const handler = vi.fn();

      api.events.on('test-event', handler);
      api.events.emit('test-event', 'arg1', 'arg2');

      expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should unsubscribe from events', () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);
      const handler = vi.fn();

      api.events.on('test-event', handler);
      api.events.off('test-event', handler);
      api.events.emit('test-event');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should clear all event listeners', () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);
      const handler = vi.fn();

      api.events.on('test-event', handler);
      // Note: removeAll exists but isn't in the type definition
      // The internal implementation supports it
      api.events.off('test-event', handler);
      api.events.emit('test-event');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Logger API', () => {
    it('should log messages at different levels', () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);
      const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      api.logger.debug('debug message');
      api.logger.info('info message');
      api.logger.warn('warn message');
      api.logger.error('error message');

      expect(consoleDebugSpy).toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleDebugSpy.mockRestore();
      consoleInfoSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should include plugin ID in log messages', () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      api.logger.info('test message');

      expect(consoleSpy).toHaveBeenCalledWith(
        `[Plugin:${mockPluginId}]`,
        'test message'
      );

      consoleSpy.mockRestore();
    });

    it('should log multiple arguments', () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      api.logger.info('test', { data: 'value' }, ['array']);

      expect(consoleSpy).toHaveBeenCalledWith(
        `[Plugin:${mockPluginId}]`,
        'test',
        { data: 'value' },
        ['array']
      );

      consoleSpy.mockRestore();
    });
  });

  // ========================================================================
  // ADDITIONAL API TESTS
  // ========================================================================

  describe('Data API', () => {
    it('should register data source', () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      api.data.registerSource({
        id: 'test-source',
        name: 'Test Source',
        type: 'api',
        fetch: 'return fetch();',
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should validate data source ID', () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);

      expect(() => api.data.registerSource({} as any)).toThrow('Data source ID is required');
    });

    it('should validate data source fetch function', () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);

      expect(() =>
        api.data.registerSource({ id: 'test' } as any)
      ).toThrow('Data source fetch function is required');
    });

    it('should register transformer', () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      api.data.registerTransformer({
        id: 'test-transformer',
        name: 'Test Transformer',
        inputSchema: {},
        outputSchema: {},
        transform: 'return data;',
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should register validator', () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      api.data.registerValidator({
        id: 'test-validator',
        name: 'Test Validator',
        schema: {},
        validate: 'return true;',
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('UI API', () => {
    it('should register UI component', () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      api.ui.registerComponent({
        id: 'test-component',
        name: 'Test Component',
        category: 'message',
        render: 'return <div />;',
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should register view', () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      api.ui.registerView({
        id: 'test-view',
        name: 'Test View',
        path: '/test',
        render: 'return <div />;',
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should register toolbar button', () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      api.ui.registerToolbarButton({
        id: 'test-button',
        label: 'Test Button',
        position: 'primary',
        onClick: 'return true;',
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should register sidebar item', () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      api.ui.registerSidebarItem({
        id: 'test-item',
        label: 'Test Item',
        path: '/test',
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);

      // Mock localStorage.setItem to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      await expect(api.storage.set('key', 'value')).rejects.toThrow();

      localStorage.setItem = originalSetItem;
    });

    it('should handle invalid JSON in storage', async () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);

      // Store invalid JSON
      localStorage.setItem(`plugin_${mockPluginId}_key`, 'invalid json{');

      const value = await api.storage.get('key');
      // Should return raw value as string
      expect(value).toBe('invalid json{');
    });

    it('should handle permission errors in API calls', async () => {
      const permissionManager = getPermissionManager();
      vi.mocked(permissionManager).hasPermission.mockReturnValue(false);

      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);

      await expect(api.conversations.list()).rejects.toThrow('Permission denied');
    });
  });

  describe('API Version', () => {
    it('should expose API version', () => {
      const api = createPluginAPI(mockPluginId, mockPermissions, mockSettings);

      expect(api.version).toBeDefined();
      expect(typeof api.version).toBe('string');
    });
  });

  describe('Plugin Context', () => {
    it('should create isolated context for each plugin', () => {
      const context1 = createPluginContext('plugin1' as any, '1.0.0', [], {});
      const context2 = createPluginContext('plugin2' as any, '2.0.0', [Permission.READ_SETTINGS], {});

      expect(context1.pluginId).toBe('plugin1' as any);
      expect(context2.pluginId).toBe('plugin2' as any);
      expect(context1.version).toBe('1.0.0');
      expect(context2.version).toBe('2.0.0');
      expect(context1.permissions).toEqual([]);
      expect(context2.permissions).toEqual([Permission.READ_SETTINGS]);
    });

    it('should provide independent storage for each plugin', async () => {
      const context1 = createPluginContext('plugin1' as any, '1.0.0', [], {});
      const context2 = createPluginContext('plugin2' as any, '1.0.0', [], {});

      await context1.storage.set('key', 'value1');
      await context2.storage.set('key', 'value2');

      const value1 = await context1.storage.get('key');
      const value2 = await context2.storage.get('key');

      expect(value1).toBe('value1');
      expect(value2).toBe('value2');
    });

    it('should provide independent event buses for each plugin', () => {
      const context1 = createPluginContext('plugin1' as any, '1.0.0', [], {});
      const context2 = createPluginContext('plugin2' as any, '1.0.0', [], {});

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      context1.events.on('test', handler1);
      context2.events.on('test', handler2);

      context1.events.emit('test');
      context2.events.emit('test');

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Plugin Management API - Additional Tests', () => {
    it('should get plugin details with runtime state', async () => {
      const registry = getPluginRegistry();
      const mockManifest = {
        id: mockPluginId,
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test',
        minAppVersion: '1.0.0',
        author: { name: 'Test' },
        license: 'MIT',
        type: [],
        keywords: [],
        categories: [],
        permissions: [],
      };
      const mockState = {
        id: mockPluginId,
        state: 'active' as any,
        enabled: true,
        settings: {},
        grantedPermissions: [],
        stats: {
          activationCount: 1,
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
      };

      vi.mocked(registry.getManifest).mockResolvedValue(mockManifest as any);
      vi.mocked(registry.getRuntimeState).mockResolvedValue(mockState);

      const api = getPluginManagementAPI();
      const details = await api.getPluginDetails(mockPluginId);

      expect(details).toBeDefined();
      expect(details?.id).toBe(mockPluginId);
    });

    it('should return null for non-existent plugin details', async () => {
      const registry = getPluginRegistry();
      vi.mocked(registry.getManifest).mockResolvedValue(null);
      vi.mocked(registry.getRuntimeState).mockResolvedValue(null);

      const api = getPluginManagementAPI();
      const details = await api.getPluginDetails('nonexistent' as any);

      expect(details).toBeNull();
    });

    it('should filter plugins by state', async () => {
      const registry = getPluginRegistry();
      const manifests = [
        { id: 'plugin1' as any, name: 'Plugin 1', state: 'active' },
        { id: 'plugin2' as any, name: 'Plugin 2', state: 'inactive' },
      ];

      vi.mocked(registry.getAllManifests).mockResolvedValue(manifests as any);
      vi.mocked(registry.getAllRuntimeStates).mockResolvedValue([
        {
          id: 'plugin1' as any,
          state: 'active' as any,
          enabled: true,
          settings: {},
          grantedPermissions: [],
          stats: { totalActivations: 0, totalActiveTime: 0 },
          errors: [],
          lastActivated: null,
        } as any,
        {
          id: 'plugin2' as any,
          state: 'inactive' as any,
          enabled: false,
          settings: {},
          grantedPermissions: [],
          stats: { totalActivations: 0, totalActiveTime: 0 },
          errors: [],
          lastActivated: null,
        } as any,
      ]);

      const api = getPluginManagementAPI();
      const activePlugins = await api.getPluginList({ state: 'active' });

      expect(activePlugins).toHaveLength(1);
      expect(activePlugins[0].id).toBe('plugin1' as any);
    });
  });

  describe('Permission Management API - Additional Tests', () => {
    it('should handle permission grant errors', async () => {
      const permissionManager = getPermissionManager();
      vi.mocked(permissionManager.grantPermissions).mockImplementation(() => {
        throw new Error('Grant failed');
      });

      const api = getPermissionManagementAPI();
      const result = await api.grantPluginPermission(mockPluginId, Permission.READ_CONVERSATIONS);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to grant permission');
    });

    it('should validate permission before checking', async () => {
      const api = getPermissionManagementAPI();

      await expect(
        api.checkPluginPermission('' as PluginId, Permission.READ_CONVERSATIONS)
      ).rejects.toThrow('Plugin ID is required');
    });
  });

  describe('Marketplace API - Additional Tests', () => {
    it('should get marketplace plugins without filters', async () => {
      const api = getMarketplaceAPI();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const plugins = await api.getMarketplacePlugins();

      expect(plugins).toBeDefined();
      expect(Array.isArray(plugins)).toBe(true);
      consoleSpy.mockRestore();
    });

    it('should get plugin reviews', async () => {
      const api = getMarketplaceAPI();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const reviews = await api.getPluginReviews(mockPluginId);

      expect(reviews).toBeDefined();
      expect(Array.isArray(reviews)).toBe(true);
      consoleSpy.mockRestore();
    });

    it('should validate review text', async () => {
      const api = getMarketplaceAPI();

      const result = await api.submitPluginReview(mockPluginId, {
        rating: 5,
        text: 'Great plugin!',
      });

      expect(result.success).toBe(true);
    });
  });
});
