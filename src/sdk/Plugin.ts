/**
 * PersonalLog Plugin SDK - Base Plugin Class
 *
 * This module provides the base Plugin class that all plugins should extend.
 * Includes lifecycle hooks, context management, and utility methods.
 *
 * @packageDocumentation
 */

import type {
  PluginManifest,
  PluginContext,
  PluginSettings,
  Logger,
  DataAPI,
  UIAPI,
  AIAPI,
  EventAPI,
  StorageAPI,
  NetworkAPI,
  ExportAPI,
  UtilsAPI,
} from './types';

// ============================================================================
// BASE PLUGIN CLASS
// ============================================================================

/**
 * Base Plugin Class
 *
 * All plugins should extend this class. It provides:
 * - Lifecycle hooks (onLoad, onEnable, onDisable, onUnload)
 * - Access to plugin APIs (data, ui, ai, events, storage, network, export)
 * - Plugin settings management
 * - Logging utilities
 *
 * @example
 * ```typescript
 * import { Plugin } from '@personallog/sdk';
 *
 * export class MyPlugin extends Plugin {
 *   async onLoad(context: PluginContext) {
 *     this.context = context;
 *     context.logger.info('My plugin loaded!');
 *   }
 *
 *   async onEnable(context: PluginContext) {
 *     context.ui.showNotification({
 *       message: 'My plugin enabled!',
 *       type: 'success'
 *     });
 *   }
 * }
 * ```
 */
export abstract class Plugin {
  /** Plugin manifest */
  public readonly manifest: PluginManifest;

  /** Plugin context (set by the app during initialization) */
  protected context?: PluginContext;

  /** Event unsubscribe functions (for cleanup) */
  private cleanupFunctions: Array<() => void> = [];

  constructor(manifest: PluginManifest) {
    this.manifest = manifest;
  }

  // ========================================================================
  // LIFECYCLE HOOKS
  // ========================================================================

  /**
   * Called when the plugin is first loaded.
   *
   * Use this to initialize your plugin, set up event listeners,
   * register UI elements, etc.
   *
   * @param context - Plugin context containing APIs and utilities
   *
   * @example
   * ```typescript
   * async onLoad(context: PluginContext) {
   *   this.context = context;
   *
   *   // Register UI elements
   *   context.ui.registerMenuItem({
   *     id: 'my-plugin-menu',
   *     label: 'My Plugin',
   *     location: 'main',
   *     action: 'handleMenuClick'
   *   });
   *
   *   // Listen to events
   *   const unsubscribe = context.events.on('conversation:created', (data) => {
   *     this.handleConversationCreated(data);
   *   });
   *   this.registerCleanup(unsubscribe);
   * }
   * ```
   */
  protected async onLoad?(context: PluginContext): Promise<void>;

  /**
   * Called when the plugin is enabled.
   *
   * Use this to start active operations, begin polling, etc.
   *
   * @param context - Plugin context containing APIs and utilities
   *
   * @example
   * ```typescript
   * async onEnable(context: PluginContext) {
   *   // Start periodic tasks
   *   this.interval = setInterval(() => {
   *     this.doPeriodicTask();
   *   }, 60000);
   *
   *   // Show notification
   *   context.ui.showNotification({
   *     message: 'Plugin enabled',
   *     type: 'success'
   *   });
   * }
   * ```
   */
  protected async onEnable?(context: PluginContext): Promise<void>;

  /**
   * Called when the plugin is disabled.
   *
   * Use this to stop active operations, clean up resources, etc.
   *
   * @param context - Plugin context containing APIs and utilities
   *
   * @example
   * ```typescript
   * async onDisable(context: PluginContext) {
   *   // Stop periodic tasks
   *   if (this.interval) {
   *     clearInterval(this.interval);
   *     this.interval = null;
   *   }
   *
   *   // Clean up event listeners
   *   this.cleanup();
   * }
   * ```
   */
  protected async onDisable?(context: PluginContext): Promise<void>;

  /**
   * Called when the plugin is unloaded.
   *
   * Use this for final cleanup, releasing resources, etc.
   *
   * @param context - Plugin context containing APIs and utilities
   *
   * @example
   * ```typescript
   * async onUnload(context: PluginContext) {
   *   // Clean up all registered cleanup functions
   *   this.cleanup();
   *
   *   // Clear plugin data if needed
   *   await context.storage.clear();
   * }
   * ```
   */
  protected async onUnload?(context: PluginContext): Promise<void>;

  /**
   * Called when app settings change.
   *
   * @param key - Setting key that changed
   * @param value - New setting value
   *
   * @example
   * ```typescript
   * async onSettingsChange(key: string, value: any) {
   *   if (key === 'theme') {
   *     this.updateTheme(value);
   *   }
   * }
   * ```
   */
  protected async onSettingsChange?(key: string, value: any): Promise<void>;

  // ========================================================================
  // CONTEXT MANAGEMENT
  // ========================================================================

  /**
   * Get the plugin context.
   *
   * @throws {Error} If context is not set (plugin not initialized)
   * @returns Plugin context
   *
   * @example
   * ```typescript
   * const context = this.getContext();
   * context.logger.info('Context retrieved');
   * ```
   */
  protected getContext(): PluginContext {
    if (!this.context) {
      throw new Error(
        'Plugin context not set. Plugin may not be properly initialized.'
      );
    }
    return this.context;
  }

  /**
   * Set the plugin context (called by the app).
   *
   * @internal
   */
  _setContext(context: PluginContext): void {
    this.context = context;
  }

  // ========================================================================
  // API ACCESSORS
  // ========================================================================

  /**
   * Get the data API.
   *
   * @returns Data API for accessing conversations, knowledge, and settings
   *
   * @example
   * ```typescript
   * const data = this.getData();
   * const conversations = await data.conversations.list();
   * ```
   */
  protected getData(): DataAPI {
    return this.getContext().data;
  }

  /**
   * Get the UI API.
   *
   * @returns UI API for adding UI elements
   *
   * @example
   * ```typescript
   * const ui = this.getUI();
   * ui.showNotification({ message: 'Hello!', type: 'info' });
   * ```
   */
  protected getUI(): UIAPI {
    return this.getContext().ui;
  }

  /**
   * Get the AI API.
   *
   * @returns AI API for interacting with AI providers
   *
   * @example
   * ```typescript
   * const ai = this.getAI();
   * const response = await ai.chat({ ... });
   * ```
   */
  protected getAI(): AIAPI {
    return this.getContext().ai;
  }

  /**
   * Get the events API.
   *
   * @returns Events API for subscribing to and emitting events
   *
   * @example
   * ```typescript
   * const events = this.getEvents();
   * events.on('my-event', (data) => console.log(data));
   * ```
   */
  protected getEvents(): EventAPI {
    return this.getContext().events;
  }

  /**
   * Get the storage API.
   *
   * @returns Storage API for plugin-specific data storage
   *
   * @example
   * ```typescript
   * const storage = this.getStorage();
   * await storage.set('my-key', { data: 'value' });
   * ```
   */
  protected getStorage(): StorageAPI {
    return this.getContext().storage;
  }

  /**
   * Get the network API.
   *
   * @returns Network API for making HTTP requests
   *
   * @example
   * ```typescript
   * const network = this.getNetwork();
   * const data = await network.get('https://api.example.com/data');
   * ```
   */
  protected getNetwork(): NetworkAPI {
    return this.getContext().network;
  }

  /**
   * Get the export API.
   *
   * @returns Export API for custom export/import formats
   *
   * @example
   * ```typescript
   * const exportApi = this.getExport();
   * exportApi.registerExportFormat({ ... });
   * ```
   */
  protected getExport(): ExportAPI {
    return this.getContext().export;
  }

  /**
   * Get the logger.
   *
   * @returns Logger for logging messages
   *
   * @example
   * ```typescript
   * const logger = this.getLogger();
   * logger.info('Plugin initialized');
   * logger.error('Something went wrong', error);
   * ```
   */
  protected getLogger(): Logger {
    return this.getContext().logger;
  }

  /**
   * Get the settings API.
   *
   * @returns Settings API for plugin settings
   *
   * @example
   * ```typescript
   * const settings = this.getSettings();
   * const value = settings.get('my-setting', 'default');
   * await settings.set('my-setting', 'new-value');
   * ```
   */
  protected getSettings(): PluginSettings {
    return this.getContext().settings;
  }

  /**
   * Get the utilities API.
   *
   * @returns Utilities API for helper functions
   *
   * @example
   * ```typescript
   * const utils = this.getUtils();
   * const id = utils.generateId();
   * const cloned = utils.deepClone(obj);
   * ```
   */
  protected getUtils(): UtilsAPI {
    return this.getContext().utils;
  }

  // ========================================================================
  // CLEANUP MANAGEMENT
  // ========================================================================

  /**
   * Register a cleanup function to be called during disable/unload.
   *
   * Use this to track resources that need cleanup.
   *
   * @param fn - Cleanup function to call
   *
   * @example
   * ```typescript
   * const unsubscribe = events.on('event', handler);
   * this.registerCleanup(unsubscribe);
   * ```
   */
  protected registerCleanup(fn: () => void): void {
    this.cleanupFunctions.push(fn);
  }

  /**
   * Run all registered cleanup functions.
   *
   * This is called automatically during onDisable and onUnload,
   * but can be called manually if needed.
   *
   * @example
   * ```typescript
   * cleanup() {
   *   super.cleanup();
   *   // Additional cleanup
   * }
   * ```
   */
  protected cleanup(): void {
    for (const fn of this.cleanupFunctions) {
      try {
        fn();
      } catch (error) {
        this.getLogger().warn('Cleanup function failed:', error);
      }
    }
    this.cleanupFunctions = [];
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Check if the plugin has a specific capability.
   *
   * @param capability - Capability to check
   * @returns True if plugin has the capability
   *
   * @example
   * ```typescript
   * if (this.hasCapability('conversations')) {
   *   // Access conversations
   * }
   * ```
   */
  protected hasCapability(capability: keyof PluginManifest['capabilities']): boolean {
    return !!this.manifest.capabilities[capability];
  }

  /**
   * Get plugin setting value.
   *
   * Convenience method for accessing plugin settings.
   *
   * @param key - Setting key
   * @param defaultValue - Default value if setting doesn't exist
   * @returns Setting value or default
   *
   * @example
   * ```typescript
   * const apiKey = this.getSetting('apiKey', '');
   * ```
   */
  protected getSetting<T = any>(key: string, defaultValue?: T): T | undefined {
    return this.getSettings().get<T>(key, defaultValue);
  }

  /**
   * Set plugin setting value.
   *
   * Convenience method for updating plugin settings.
   *
   * @param key - Setting key
   * @param value - New value
   *
   * @example
   * ```typescript
   * await this.setSetting('apiKey', 'new-key');
   * ```
   */
  protected async setSetting<T = any>(key: string, value: T): Promise<void> {
    return this.getSettings().set<T>(key, value);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default Plugin;
