/**
 * Plugin System - Public API
 *
 * Complete plugin system for PersonalLog enabling third-party extensions.
 * Provides secure, permission-controlled plugin execution with sandboxing.
 *
 * @module lib/plugin
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Export enums as both types and values
export { PluginType, Permission, PluginState, PluginEventType } from './types';

export type {
  // Core identification
  PluginId,
  PluginVersion,
  VersionRequirement,

  // Plugin types
  PluginTypeConfig,

  // Plugin type definitions
  UIComponentDefinition,
  UIViewDefinition,
  ToolbarButtonDefinition,
  SidebarItemDefinition,
  DataSourceDefinition,
  DataTransformerDefinition,
  DataValidatorDefinition,
  AIProviderDefinition,
  ModelDefinition,
  MessageProcessorDefinition,
  AIRouterDefinition,
  ExportFormatDefinition,
  ExportDestinationDefinition,
  ImportSourceDefinition,
  ImportParserDefinition,
  AnalyticsMetricDefinition,
  AnalyticsAggregationDefinition,
  AnalyticsVisualizationDefinition,
  WorkflowDefinition,
  WorkflowStep,
  TriggerDefinition,
  ActionDefinition,
  ThemeDefinition,
  FeatureDefinition,

  // Prop schema
  PropSchema,

  // Permissions
  PermissionScope,

  // Manifest
  PluginManifest,
  PluginDependency,
  ResourceLimits,
  SettingSchema,
  CommandDefinition,
  MenuDefinition,
  MenuItemDefinition,
  KeybindingDefinition,
  LanguageDefinition,

  // State
  PluginRuntimeState,
  PluginStats,
  PluginError,

  // Installation
  PluginSourceType,
  PluginInstallResult,
  PluginValidationResult,
  ValidationError,
  ValidationWarning,

  // API
  PluginAPIContext,
  PluginLogger,
  PluginStorage,
  PluginEventBus,
  PluginAPISurface,
  PluginActivationContext,
  PluginHooks,
  PluginActivateHook,
  PluginDeactivateHook,
  PluginUninstallHook,
  PluginSettingsChangeHook,

  // Sandbox
  SandboxConfig,
  SandboxResult,

  // Events
  PluginEvent,
  PluginEventListener,
} from './types';

// ============================================================================
// CLASS EXPORTS
// ============================================================================

export {
  PluginRegistry,
  getPluginRegistry,
  initializePluginRegistry,
} from './registry';

export {
  PermissionManager,
  PermissionValidator,
  getPermissionManager,
  initializePermissionManager,
} from './permissions';

export {
  PluginSandbox,
  SandboxManager,
  getSandboxManager,
} from './sandbox';

export {
  createPluginAPI,
  createPluginContext,
} from './api';

export {
  PluginLoader,
  validateManifest,
  validatePluginCode,
  validateVersionCompatibility,
  getPluginLoader,
  initializePluginLoader,
} from './loader';

export {
  PluginManager,
  getPluginManager,
  initializePluginManager,
} from './manager';

// ============================================================================
// UNIFIED API
// ============================================================================

import { PluginManager, getPluginManager } from './manager';
import { PluginLoader, getPluginLoader } from './loader';
import { getPermissionManager } from './permissions';
import { getPluginRegistry } from './registry';
import type {
  PluginManifest,
  PluginId,
  PluginRuntimeState,
  PluginEvent,
  PluginEventType,
  PluginEventListener,
  Permission,
} from './types';

/**
 * Unified plugin system API
 */
class PluginSystemAPI {
  private manager: PluginManager;
  private loader: PluginLoader;
  private permissionManager = getPermissionManager();
  private registry = getPluginRegistry();

  constructor() {
    this.manager = getPluginManager();
    this.loader = getPluginLoader();
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  /**
   * Initialize plugin system
   */
  async initialize(): Promise<void> {
    await this.registry.initialize();
    await this.manager.initialize();
  }

  /**
   * Shutdown plugin system
   */
  async shutdown(): Promise<void> {
    await this.manager.shutdown();
    await this.registry.close();
  }

  // ========================================================================
  // PLUGIN INSTALLATION
  // ========================================================================

  /**
   * Install plugin from manifest and code
   */
  async install(manifest: PluginManifest, code: string): Promise<void> {
    const result = await this.manager.installFromManifest(manifest, code);
    if (!result.success) {
      throw new Error(result.error || 'Installation failed');
    }
  }

  /**
   * Install plugin from file
   */
  async installFromFile(file: File): Promise<void> {
    const result = await this.loader.loadFromFile(file);
    if (!result.success) {
      throw new Error(result.error || 'Installation failed');
    }
  }

  /**
   * Install plugin from URL
   */
  async installFromURL(url: string): Promise<void> {
    const result = await this.loader.loadFromURL(url);
    if (!result.success) {
      throw new Error(result.error || 'Installation failed');
    }
  }

  /**
   * Uninstall plugin
   */
  async uninstall(pluginId: PluginId): Promise<void> {
    await this.manager.uninstall(pluginId);
  }

  // ========================================================================
  // PLUGIN ACTIVATION
  // ========================================================================

  /**
   * Enable plugin
   */
  async enable(pluginId: PluginId): Promise<void> {
    await this.manager.enable(pluginId);
  }

  /**
   * Disable plugin
   */
  async disable(pluginId: PluginId): Promise<void> {
    await this.manager.disable(pluginId);
  }

  /**
   * Activate plugin
   */
  async activate(pluginId: PluginId): Promise<void> {
    await this.manager.activate(pluginId);
  }

  /**
   * Deactivate plugin
   */
  async deactivate(pluginId: PluginId): Promise<void> {
    await this.manager.deactivate(pluginId);
  }

  // ========================================================================
  // PLUGIN QUERIES
  // ========================================================================

  /**
   * Get all installed plugins
   */
  async getInstalled(): Promise<PluginManifest[]> {
    return this.manager.getInstalledPlugins();
  }

  /**
   * Get active plugins
   */
  async getActive(): Promise<PluginManifest[]> {
    return this.manager.getActivePlugins();
  }

  /**
   * Get plugin manifest
   */
  async getManifest(pluginId: PluginId): Promise<PluginManifest | null> {
    return this.registry.getManifest(pluginId);
  }

  /**
   * Get plugin state
   */
  async getState(pluginId: PluginId): Promise<PluginRuntimeState | null> {
    return this.manager.getPluginState(pluginId);
  }

  /**
   * Check if plugin is active
   */
  isActive(pluginId: PluginId): boolean {
    return this.manager.isPluginActive(pluginId);
  }

  /**
   * Get plugin errors
   */
  async getErrors(pluginId: PluginId): Promise<any[]> {
    return this.manager.getPluginErrors(pluginId);
  }

  // ========================================================================
  // PLUGIN SETTINGS
  // ========================================================================

  /**
   * Update plugin settings
   */
  async updateSettings(pluginId: PluginId, settings: Record<string, any>): Promise<void> {
    await this.manager.updateSettings(pluginId, settings);
  }

  /**
   * Get plugin settings
   */
  async getSettings(pluginId: PluginId): Promise<Record<string, any>> {
    return this.registry.getPluginSettings(pluginId);
  }

  // ========================================================================
  // PERMISSIONS
  // ========================================================================

  /**
   * Grant permission to plugin
   */
  grantPermission(pluginId: PluginId, permission: Permission): void {
    this.permissionManager.grantPermission(pluginId, permission);
  }

  /**
   * Revoke permission from plugin
   */
  revokePermission(pluginId: PluginId, permission: Permission): void {
    this.permissionManager.revokePermission(pluginId, permission);
  }

  /**
   * Check if plugin has permission
   */
  hasPermission(pluginId: PluginId, permission: Permission): boolean {
    return this.permissionManager.hasPermission(pluginId, permission);
  }

  /**
   * Get granted permissions
   */
  getPermissions(pluginId: PluginId): Permission[] {
    return this.permissionManager.getGrantedPermissions(pluginId);
  }

  // ========================================================================
  // EVENTS
  // ========================================================================

  /**
   * Subscribe to plugin events
   */
  on(eventType: PluginEventType, listener: PluginEventListener): void {
    this.manager.on(eventType, listener);
  }

  /**
   * Unsubscribe from plugin events
   */
  off(eventType: PluginEventType, listener: PluginEventListener): void {
    this.manager.off(eventType, listener);
  }

  // ========================================================================
  // EXECUTION
  // ========================================================================

  /**
   * Execute plugin function
   */
  async execute<T = any>(
    pluginId: PluginId,
    functionName: string,
    args?: any[]
  ): Promise<T> {
    return this.manager.executeFunction<T>(pluginId, functionName, args);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const pluginSystem = new PluginSystemAPI();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Initialize plugin system
 */
export async function setupPlugins(): Promise<void> {
  await pluginSystem.initialize();
}

/**
 * Install plugin
 */
export async function installPlugin(
  manifest: PluginManifest,
  code: string
): Promise<void> {
  await pluginSystem.install(manifest, code);
}

/**
 * Uninstall plugin
 */
export async function uninstallPlugin(pluginId: PluginId): Promise<void> {
  await pluginSystem.uninstall(pluginId);
}

/**
 * Enable plugin
 */
export async function enablePlugin(pluginId: PluginId): Promise<void> {
  await pluginSystem.enable(pluginId);
}

/**
 * Disable plugin
 */
export async function disablePlugin(pluginId: PluginId): Promise<void> {
  await pluginSystem.disable(pluginId);
}

/**
 * Get installed plugins
 */
export async function getInstalledPlugins(): Promise<PluginManifest[]> {
  return pluginSystem.getInstalled();
}

/**
 * Get active plugins
 */
export async function getActivePlugins(): Promise<PluginManifest[]> {
  return pluginSystem.getActive();
}

/**
 * Check if plugin is active
 */
export function isPluginActive(pluginId: PluginId): boolean {
  return pluginSystem.isActive(pluginId);
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default pluginSystem;

// Re-export as named export for convenience
export { pluginSystem };
