/**
 * Plugin Lifecycle Manager
 *
 * Manages plugin activation, deactivation, and lifecycle hooks.
 * Coordinates with sandbox and registry for complete lifecycle management.
 *
 * @module lib/plugin/manager
 */

import type {
  PluginId,
  PluginManifest,
  PluginState,
  PluginRuntimeState,
  PluginHooks,
  PluginEventType,
  PluginEvent,
  PluginEventListener,
  Permission,
  SandboxConfig,
} from './types';
import { getPluginRegistry } from './registry';
import { getPermissionManager } from './permissions';
import { getSandboxManager } from './sandbox';
import { createPluginContext, createPluginAPI } from './api';
import { getPluginLoader } from './loader';

// ============================================================================
// PLUGIN MANAGER CLASS
// ============================================================================

export class PluginManager {
  private registry = getPluginRegistry();
  private permissionManager = getPermissionManager();
  private sandboxManager = getSandboxManager();
  private loader = getPluginLoader();

  private eventListeners: Map<PluginEventType, Set<PluginEventListener>> = new Map();

private activePlugins: Map<PluginId, any> = new Map(); // Plugin instances

  /**
   * Initialize plugin manager
   */
  async initialize(): Promise<void> {
    await this.registry.initialize();

    // Activate all plugins that were active before shutdown
    const states = await this.registry.getAllRuntimeStates();
    for (const state of states) {
      if (state.enabled && state.state === ('active' as PluginState)) {
        try {
          await this.activate(state.id);
        } catch (error) {
          console.error(`Failed to reactivate plugin ${state.id}:`, error);
        }
      }
    }
  }

  /**
   * Shutdown plugin manager
   */
  async shutdown(): Promise<void> {
    // Deactivate all active plugins
    const activeIds = Array.from(this.activePlugins.keys());
    for (const pluginId of activeIds) {
      try {
        await this.deactivate(pluginId);
      } catch (error) {
        console.error(`Failed to deactivate plugin ${pluginId}:`, error);
      }
    }

    // Clean up sandboxes
    this.sandboxManager.removeAll();

    // Close registry
    await this.registry.close();
  }

  // ========================================================================
  // PLUGIN ACTIVATION
  // ========================================================================

  /**
   * Activate plugin
   */
  async activate(pluginId: PluginId): Promise<void> {
    // Get manifest
    const manifest = await this.registry.getManifest(pluginId);
    if (!manifest) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    // Check if already active
    if (this.activePlugins.has(pluginId)) {
      throw new Error(`Plugin already active: ${pluginId}`);
    }

    // Get runtime state
    const state = await this.registry.getRuntimeState(pluginId);
    if (!state) {
      throw new Error(`Plugin state not found: ${pluginId}`);
    }

    // Update state to loading
    await this.registry.updateRuntimeState(pluginId, {
      state: 'loading' as PluginState,
    });

    try {
      // Request permissions
      const { allGranted, results } = await this.permissionManager.requestPermissions(
        pluginId,
        manifest.permissions
      );

      if (!allGranted) {
        // Check which permissions were denied
        const denied = Object.entries(results)
          .filter(([_, result]) => !result.granted)
          .map(([perm, _]) => perm);

        // For now, we'll allow activation even if some permissions are denied
        // The plugin will get permission errors when trying to use those features
        console.warn(`Plugin ${pluginId} denied permissions:`, denied);
      }

      // Permissions are already granted by the requestPermissions method

      // Get plugin settings
      const settings = await this.registry.getPluginSettings(pluginId);

      // Extract granted permissions from results
      const granted = Object.entries(results)
        .filter(([_, result]) => result.granted)
        .map(([perm, _]) => perm as Permission);

      // Create plugin context
      const context = createPluginContext(
        pluginId,
        manifest.version,
        granted,
        settings
      );

      // Create sandbox
      const sandboxConfig: SandboxConfig = {
        pluginId,
        permissions: granted,
        resourceLimits: manifest.resourceLimits || {},
        timeout: 30000, // 30 second default timeout
      };

      const sandbox = this.sandboxManager.createSandbox(sandboxConfig);

      // Get plugin code
      const code = await this.loader.getPluginCode(pluginId);
      if (!code) {
        throw new Error('Plugin code not found');
      }

      // Initialize sandbox with plugin code
      await sandbox.initialize(code, context);

      // Get plugin API
      const api = createPluginAPI(pluginId, granted, settings);

      // Create activation context
      const activationContext = {
        ...context,
        api,
      };

      // Call plugin activate hook if exists
      try {
        await sandbox.execute('onActivate', [activationContext]);
      } catch (error) {
        // Hook might not exist, that's okay
        console.debug(`No onActivate hook for ${pluginId} or it failed`);
      }

      // Store plugin instance
      this.activePlugins.set(pluginId, { sandbox, api, context });

      // Update state to active
      await this.registry.updateRuntimeState(pluginId, {
        state: 'active' as PluginState,
        enabled: true,
        lastActivated: Date.now(),
        stats: {
          ...state.stats,
          activationCount: state.stats.activationCount + 1,
        },
      });

      // Emit activated event
      this.emitEvent({
        type: 'plugin.activated' as PluginEventType,
        pluginId,
        timestamp: Date.now(),
      });
    } catch (error) {
      // Update state to error
      await this.registry.updateRuntimeState(pluginId, {
        state: 'error' as PluginState,
        enabled: false,
      });

      await this.registry.addPluginError(pluginId, {
        type: 'load',
        code: 'ACTIVATION_FAILED',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }

  /**
   * Deactivate plugin
   */
  async deactivate(pluginId: PluginId): Promise<void> {
    // Check if active
    const pluginInstance = this.activePlugins.get(pluginId);
    if (!pluginInstance) {
      throw new Error(`Plugin not active: ${pluginId}`);
    }

    const { sandbox, context } = pluginInstance;

    try {
      // Call plugin deactivate hook if exists
      try {
        await sandbox.execute('onDeactivate', [context]);
      } catch (error) {
        // Hook might not exist, that's okay
        console.debug(`No onDeactivate hook for ${pluginId} or it failed`);
      }

      // Terminate sandbox
      sandbox.terminate();
      this.sandboxManager.removeSandbox(pluginId);

      // Remove from active plugins
      this.activePlugins.delete(pluginId);

      // Update state
      await this.registry.updateRuntimeState(pluginId, {
        state: 'inactive' as PluginState,
        enabled: false,
        lastDeactivated: Date.now(),
      });

      // Emit deactivated event
      this.emitEvent({
        type: 'plugin.deactivated' as PluginEventType,
        pluginId,
        timestamp: Date.now(),
      });
    } catch (error) {
      await this.registry.addPluginError(pluginId, {
        type: 'runtime',
        code: 'DEACTIVATION_FAILED',
        message: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Uninstall plugin
   */
  async uninstall(pluginId: PluginId): Promise<void> {
    // Deactivate if active
    if (this.activePlugins.has(pluginId)) {
      await this.deactivate(pluginId);
    }

    // Get manifest
    const manifest = await this.registry.getManifest(pluginId);
    if (!manifest) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    // Get plugin code for cleanup
    const code = await this.loader.getPluginCode(pluginId);
    if (code) {
      const context = createPluginContext(
        pluginId,
        manifest.version,
        [],
        {}
      );

      // Create temporary sandbox for cleanup
      const sandbox = this.sandboxManager.createSandbox({
        pluginId,
        permissions: [],
        resourceLimits: {},
        timeout: 5000,
      });

      await sandbox.initialize(code, context);

      // Call uninstall hook
      try {
        await sandbox.execute('onUninstall', [context]);
      } catch (error) {
        console.debug(`No onUninstall hook for ${pluginId} or it failed`);
      }

      sandbox.terminate();
    }

    // Revoke all permissions
    this.permissionManager.revokeAllPermissions(pluginId);

    // Unload plugin
    await this.loader.unloadPlugin(pluginId);

    // Emit uninstalled event
    this.emitEvent({
      type: 'plugin.uninstalled' as PluginEventType,
      pluginId,
      timestamp: Date.now(),
    });
  }

  /**
   * Update plugin settings
   */
  async updateSettings(
    pluginId: PluginId,
    newSettings: Record<string, any>
  ): Promise<void> {
    // Get current settings
    const oldSettings = await this.registry.getPluginSettings(pluginId);

    // Update settings in registry
    await this.registry.updatePluginSettings(pluginId, newSettings);

    // Call settings change hook if plugin is active
    const pluginInstance = this.activePlugins.get(pluginId);
    if (pluginInstance) {
      const { sandbox, context } = pluginInstance;

      try {
        await sandbox.execute('onSettingsChange', [newSettings, oldSettings, context]);
      } catch (error) {
        console.debug(`No onSettingsChange hook for ${pluginId} or it failed`);
      }

      // Update context with new settings
      context.settings = newSettings;
    }

    // Emit settings changed event
    this.emitEvent({
      type: 'plugin.settings_changed' as PluginEventType,
      pluginId,
      timestamp: Date.now(),
      data: { oldSettings, newSettings },
    });
  }

  // ========================================================================
  // PLUGIN EXECUTION
  // ========================================================================

  /**
   * Execute plugin function
   */
  async executeFunction<T = any>(
    pluginId: PluginId,
    functionName: string,
    args: any[] = []
  ): Promise<T> {
    const pluginInstance = this.activePlugins.get(pluginId);
    if (!pluginInstance) {
      throw new Error(`Plugin not active: ${pluginId}`);
    }

    const { sandbox } = pluginInstance;
    const result = await (sandbox.execute as any)(functionName, args) as any;

    if (!result.success) {
      throw new Error(result.error || 'Execution failed');
    }

    // Update stats
    const state = await this.registry.getRuntimeState(pluginId);
    if (state) {
      await this.registry.updatePluginStats(pluginId, {
        executionCount: state.stats.executionCount + 1,
        cpuTime: state.stats.cpuTime + result.executionTime,
        peakMemoryMB: Math.max(state.stats.peakMemoryMB, result.memoryUsed),
        avgExecutionTime:
          (state.stats.avgExecutionTime * state.stats.executionCount + result.executionTime) /
          (state.stats.executionCount + 1),
      });
    }

    return result.data!;
  }

  // ========================================================================
  // PLUGIN QUERIES
  // ========================================================================

  /**
   * Get all installed plugins
   */
  async getInstalledPlugins(): Promise<PluginManifest[]> {
    return this.registry.getAllManifests();
  }

  /**
   * Get active plugins
   */
  async getActivePlugins(): Promise<PluginManifest[]> {
    const activeIds = Array.from(this.activePlugins.keys());
    const manifests: PluginManifest[] = [];

    for (const id of activeIds) {
      const manifest = await this.registry.getManifest(id);
      if (manifest) {
        manifests.push(manifest);
      }
    }

    return manifests;
  }

  /**
   * Get plugin state
   */
  async getPluginState(pluginId: PluginId): Promise<PluginRuntimeState | null> {
    return this.registry.getRuntimeState(pluginId);
  }

  /**
   * Check if plugin is active
   */
  isPluginActive(pluginId: PluginId): boolean {
    return this.activePlugins.has(pluginId);
  }

  /**
   * Get plugin errors
   */
  async getPluginErrors(pluginId: PluginId): Promise<any[]> {
    const state = await this.registry.getRuntimeState(pluginId);
    return state?.errors || [];
  }

  // ========================================================================
  // EVENT MANAGEMENT
  // ========================================================================

  /**
   * Subscribe to plugin events
   */
  on(eventType: PluginEventType, listener: PluginEventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);
  }

  /**
   * Unsubscribe from plugin events
   */
  off(eventType: PluginEventType, listener: PluginEventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventType);
      }
    }
  }

  /**
   * Emit plugin event
   */
  private emitEvent(event: PluginEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in plugin event listener:`, error);
        }
      }
    }
  }

  // ========================================================================
  // PLUGIN INSTALLATION
  // ========================================================================

  /**
   * Install plugin
   */
  async installFromManifest(
    manifest: PluginManifest,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    const result = await this.loader.loadPlugin(manifest, code);

    if (result.success) {
      // Emit installed event
      this.emitEvent({
        type: 'plugin.installed' as PluginEventType,
        pluginId: manifest.id,
        timestamp: Date.now(),
      });
    }

    return result;
  }

  /**
   * Enable plugin
   */
  async enable(pluginId: PluginId): Promise<void> {
    const state = await this.registry.getRuntimeState(pluginId);
    if (!state) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (state.enabled) {
      return; // Already enabled
    }

    await this.registry.updateRuntimeState(pluginId, { enabled: true });
    await this.activate(pluginId);
  }

  /**
   * Disable plugin
   */
  async disable(pluginId: PluginId): Promise<void> {
    const state = await this.registry.getRuntimeState(pluginId);
    if (!state) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (!state.enabled) {
      return; // Already disabled
    }

    if (this.activePlugins.has(pluginId)) {
      await this.deactivate(pluginId);
    }

    await this.registry.updateRuntimeState(pluginId, { enabled: false });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let pluginManagerInstance: PluginManager | null = null;

/**
 * Get plugin manager instance
 */
export function getPluginManager(): PluginManager {
  if (!pluginManagerInstance) {
    pluginManagerInstance = new PluginManager();
  }
  return pluginManagerInstance;
}

/**
 * Initialize plugin manager
 */
export async function initializePluginManager(): Promise<PluginManager> {
  const manager = getPluginManager();
  await manager.initialize();
  return manager;
}
