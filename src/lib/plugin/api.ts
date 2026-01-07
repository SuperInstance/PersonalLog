/**
 * Plugin API Surface
 *
 * Public API exposed to plugins for interacting with PersonalLog.
 * Provides safe, permission-controlled access to application features.
 *
 * @module lib/plugin/api
 */

import type {
  PluginId,
  PluginManifest,
  PluginAPISurface as IPluginAPISurface,
  PluginAPIContext,
  PluginLogger,
  PluginStorage,
  PluginEventBus,
  CommandDefinition,
  UIComponentDefinition,
  UIViewDefinition,
  ToolbarButtonDefinition,
  SidebarItemDefinition,
  DataSourceDefinition,
  DataTransformerDefinition,
  DataValidatorDefinition,
} from './types';
import { Permission } from './types';
import { getPermissionManager } from './permissions';
import { getPluginManager } from './manager';
import { getPluginRegistry } from './registry';
import * as ConversationStore from '@/lib/storage/conversation-store';

// ============================================================================
// LOGGER IMPLEMENTATION
// ============================================================================

class PluginLoggerImpl implements PluginLogger {
  constructor(private pluginId: PluginId) {}

  debug(message: string, ...args: any[]): void {
    console.debug(`[Plugin:${this.pluginId}]`, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    console.info(`[Plugin:${this.pluginId}]`, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[Plugin:${this.pluginId}]`, message, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[Plugin:${this.pluginId}]`, message, ...args);
  }
}

// ============================================================================
// STORAGE IMPLEMENTATION
// ============================================================================

class PluginStorageImpl implements PluginStorage {
  private storePrefix: string;

  constructor(pluginId: PluginId) {
    this.storePrefix = `plugin_${pluginId}_`;
  }

  async get(key: string): Promise<any> {
    const fullKey = this.storePrefix + key;
    const item = localStorage.getItem(fullKey);
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  }

  async set(key: string, value: any): Promise<void> {
    const fullKey = this.storePrefix + key;
    try {
      localStorage.setItem(fullKey, JSON.stringify(value));
    } catch (error) {
      throw new Error(`Failed to store plugin data: ${error}`);
    }
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.storePrefix + key;
    localStorage.removeItem(fullKey);
  }

  async keys(): Promise<string[]> {
    const prefix = this.storePrefix;
    const allKeys = Object.keys(localStorage);
    return allKeys
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.substring(prefix.length));
  }

  async clear(): Promise<void> {
    const keys = await this.keys();
    for (const key of keys) {
      await this.delete(key);
    }
  }
}

// ============================================================================
// EVENT BUS IMPLEMENTATION
// ============================================================================+

type EventHandler = (...args: any[]) => void;

class PluginEventBusImpl implements PluginEventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      // Convert Set to Array to avoid iteration issues
      const handlersArray = Array.from(handlers);
      for (const handler of handlersArray) {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      }
    }
  }

  removeAll(): void {
    this.listeners.clear();
  }
}

// ============================================================================
// CONVERSATIONS API
// ============================================================================+

class ConversationsAPI {
  constructor(private pluginId: PluginId) {}

  private checkPermission(permission: Permission): void {
    const manager = getPermissionManager();
    const hasPermission = manager.hasPermission(this.pluginId, permission);
    if (!hasPermission) {
      throw new Error(`Permission denied: ${permission} required for this operation`);
    }
  }

  async list(): Promise<any[]> {
    this.checkPermission(Permission.READ_CONVERSATIONS);
    try {
      return await ConversationStore.listConversations();
    } catch (error) {
      throw new Error(`Failed to list conversations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async get(id: string): Promise<any> {
    this.checkPermission(Permission.READ_CONVERSATIONS);
    if (!id?.trim()) {
      throw new Error('Conversation ID is required');
    }
    try {
      const conversation = await ConversationStore.getConversation(id);
      if (!conversation) {
        throw new Error(`Conversation not found: ${id}`);
      }
      return conversation;
    } catch (error) {
      throw new Error(`Failed to get conversation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async create(data: any): Promise<any> {
    this.checkPermission(Permission.WRITE_CONVERSATIONS);
    if (!data?.title?.trim()) {
      throw new Error('Conversation title is required');
    }
    try {
      return await ConversationStore.createConversation(data.title, data.type || 'personal');
    } catch (error) {
      throw new Error(`Failed to create conversation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async update(id: string, data: any): Promise<void> {
    this.checkPermission(Permission.WRITE_CONVERSATIONS);
    if (!id?.trim()) {
      throw new Error('Conversation ID is required');
    }
    if (!data || Object.keys(data).length === 0) {
      throw new Error('Update data is required');
    }
    try {
      await ConversationStore.updateConversation(id, data);
    } catch (error) {
      throw new Error(`Failed to update conversation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async delete(id: string): Promise<void> {
    this.checkPermission(Permission.DELETE_CONVERSATIONS);
    if (!id?.trim()) {
      throw new Error('Conversation ID is required');
    }
    try {
      await ConversationStore.deleteConversation(id);
    } catch (error) {
      throw new Error(`Failed to delete conversation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// ============================================================================
// MESSAGES API
// ============================================================================+

class MessagesAPI {
  constructor(private pluginId: PluginId) {}

  private checkPermission(permission: Permission): void {
    const manager = getPermissionManager();
    const hasPermission = manager.hasPermission(this.pluginId, permission);
    if (!hasPermission) {
      throw new Error(`Permission denied: ${permission} required for this operation`);
    }
  }

  async list(conversationId: string): Promise<any[]> {
    this.checkPermission(Permission.READ_MESSAGES);
    if (!conversationId?.trim()) {
      throw new Error('Conversation ID is required');
    }
    try {
      return await ConversationStore.getMessages(conversationId);
    } catch (error) {
      throw new Error(`Failed to list messages: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async get(id: string): Promise<any> {
    this.checkPermission(Permission.READ_MESSAGES);
    // Get all messages and filter by ID (ConversationStore doesn't have get by ID)
    // This is inefficient but functional for now
    const conversations = await ConversationStore.listConversations();
    for (const conv of conversations) {
      const messages = await ConversationStore.getMessages(conv.id);
      const message = messages.find(m => m.id === id);
      if (message) {
        return message;
      }
    }
    throw new Error(`Message not found: ${id}`);
  }

  async create(conversationId: string, data: any): Promise<any> {
    this.checkPermission(Permission.WRITE_MESSAGES);
    if (!conversationId?.trim()) {
      throw new Error('Conversation ID is required');
    }
    if (!data || !data.author) {
      throw new Error('Message author is required');
    }
    try {
      return await ConversationStore.addMessage(
        conversationId,
        data.type || 'text',
        data.author,
        data.content,
        data.replyTo
      );
    } catch (error) {
      throw new Error(`Failed to create message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async update(id: string, data: any): Promise<void> {
    this.checkPermission(Permission.WRITE_MESSAGES);
    if (!id?.trim()) {
      throw new Error('Message ID is required');
    }
    if (!data || Object.keys(data).length === 0) {
      throw new Error('Update data is required');
    }
    try {
      await ConversationStore.updateMessage(id, data);
    } catch (error) {
      throw new Error(`Failed to update message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async delete(id: string): Promise<void> {
    this.checkPermission(Permission.DELETE_MESSAGES);
    if (!id?.trim()) {
      throw new Error('Message ID is required');
    }
    try {
      await ConversationStore.deleteMessage(id);
    } catch (error) {
      throw new Error(`Failed to delete message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// ============================================================================
// KNOWLEDGE API
// ============================================================================+

class KnowledgeAPI {
  constructor(private pluginId: PluginId) {}

  private checkPermission(permission: Permission): void {
    const manager = getPermissionManager();
    const hasPermission = manager.hasPermission(this.pluginId, permission);
    if (!hasPermission) {
      throw new Error(`Permission denied: ${permission} required for this operation`);
    }
  }

  async search(query: string, options?: any): Promise<any[]> {
    this.checkPermission(Permission.READ_KNOWLEDGE);
    if (!query?.trim()) {
      throw new Error('Search query is required');
    }
    // Placeholder for knowledge search implementation
    // In production, this would connect to a knowledge base store
    return [];
  }

  async get(id: string): Promise<any> {
    this.checkPermission(Permission.READ_KNOWLEDGE);
    if (!id?.trim()) {
      throw new Error('Knowledge ID is required');
    }
    // Placeholder for knowledge retrieval implementation
    throw new Error('Knowledge base not yet implemented');
  }

  async create(data: any): Promise<any> {
    this.checkPermission(Permission.WRITE_KNOWLEDGE);
    if (!data || Object.keys(data).length === 0) {
      throw new Error('Knowledge data is required');
    }
    // Placeholder for knowledge creation implementation
    throw new Error('Knowledge base not yet implemented');
  }

  async update(id: string, data: any): Promise<void> {
    this.checkPermission(Permission.WRITE_KNOWLEDGE);
    if (!id?.trim()) {
      throw new Error('Knowledge ID is required');
    }
    if (!data || Object.keys(data).length === 0) {
      throw new Error('Update data is required');
    }
    // Placeholder for knowledge update implementation
    throw new Error('Knowledge base not yet implemented');
  }

  async delete(id: string): Promise<void> {
    this.checkPermission(Permission.DELETE_KNOWLEDGE);
    if (!id?.trim()) {
      throw new Error('Knowledge ID is required');
    }
    // Placeholder for knowledge deletion implementation
    throw new Error('Knowledge base not yet implemented');
  }
}

// ============================================================================
// ANALYTICS API
// ============================================================================+

class AnalyticsAPI {
  constructor(private pluginId: PluginId) {}

  private checkPermission(permission: Permission): void {
    const manager = getPermissionManager();
    const hasPermission = manager.hasPermission(this.pluginId, permission);
    if (!hasPermission) {
      throw new Error(`Permission denied: ${permission} required for this operation`);
    }
  }

  async trackEvent(event: string, data?: any): Promise<void> {
    this.checkPermission(Permission.WRITE_ANALYTICS);
    if (!event?.trim()) {
      throw new Error('Event name is required');
    }
    // Placeholder for analytics tracking implementation
    // In production, this would send events to analytics store
    console.log(`[Plugin:${this.pluginId}] Analytics event:`, event, data);
  }

  async getMetrics(options?: any): Promise<any> {
    this.checkPermission(Permission.READ_ANALYTICS);
    // Placeholder for analytics metrics retrieval
    // In production, this would query analytics store
    return {
      events: [],
      metrics: {},
    };
  }

  async query(query: any): Promise<any> {
    this.checkPermission(Permission.READ_ANALYTICS);
    if (!query || Object.keys(query).length === 0) {
      throw new Error('Query is required');
    }
    // Placeholder for analytics query implementation
    return [];
  }
}

// ============================================================================
// SETTINGS API
// ============================================================================+

class SettingsAPI {
  constructor(private pluginId: PluginId) {}

  private checkPermission(permission: Permission): void {
    const manager = getPermissionManager();
    const hasPermission = manager.hasPermission(this.pluginId, permission);
    if (!hasPermission) {
      throw new Error(`Permission denied: ${permission} required for this operation`);
    }
  }

  async get(key: string): Promise<any> {
    this.checkPermission(Permission.READ_SETTINGS);
    if (!key?.trim()) {
      throw new Error('Setting key is required');
    }
    try {
      const registry = getPluginRegistry();
      const settings = await registry.getPluginSettings(this.pluginId);
      return settings[key];
    } catch (error) {
      throw new Error(`Failed to get setting: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async set(key: string, value: any): Promise<void> {
    this.checkPermission(Permission.WRITE_SETTINGS);
    if (!key?.trim()) {
      throw new Error('Setting key is required');
    }
    try {
      const registry = getPluginRegistry();
      const currentSettings = await registry.getPluginSettings(this.pluginId);
      const updatedSettings = { ...currentSettings, [key]: value };
      await registry.updatePluginSettings(this.pluginId, updatedSettings);

      // Notify plugin manager of settings change
      const manager = getPluginManager();
      await manager.updateSettings(this.pluginId, updatedSettings);
    } catch (error) {
      throw new Error(`Failed to set setting: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getAll(): Promise<Record<string, any>> {
    this.checkPermission(Permission.READ_SETTINGS);
    try {
      const registry = getPluginRegistry();
      return await registry.getPluginSettings(this.pluginId);
    } catch (error) {
      throw new Error(`Failed to get settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// ============================================================================
// COMMANDS API
// ============================================================================+

class CommandsAPI {
  private commands: Map<string, CommandDefinition> = new Map();

  constructor(private pluginId: PluginId) {}

  register(command: CommandDefinition): void {
    if (!command?.id?.trim()) {
      throw new Error('Command ID is required');
    }
    if (!command?.handler) {
      throw new Error('Command handler is required');
    }
    // Store command locally
    this.commands.set(command.id, command);
    // TODO: Register command globally in command registry
    console.log(`[Plugin:${this.pluginId}] Registered command:`, command.id);
  }

  async execute(commandId: string, ...args: any[]): Promise<any> {
    if (!commandId?.trim()) {
      throw new Error('Command ID is required');
    }
    const command = this.commands.get(commandId);
    if (!command) {
      throw new Error(`Command not found: ${commandId}`);
    }

    // Check command permissions
    const permissionManager = getPermissionManager();
    if (command.permissions) {
      for (const permission of command.permissions) {
        if (!permissionManager.hasPermission(this.pluginId, permission)) {
          throw new Error(`Permission denied: ${permission} required for command ${commandId}`);
        }
      }
    }

    // Execute command handler
    try {
      // In production, this would execute the serialized handler safely
      console.log(`[Plugin:${this.pluginId}] Executing command:`, commandId, args);
      return null;
    } catch (error) {
      throw new Error(`Command execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  unregister(commandId: string): void {
    if (!commandId?.trim()) {
      throw new Error('Command ID is required');
    }
    if (!this.commands.has(commandId)) {
      throw new Error(`Command not found: ${commandId}`);
    }
    this.commands.delete(commandId);
    // TODO: Unregister from global command registry
    console.log(`[Plugin:${this.pluginId}] Unregistered command:`, commandId);
  }
}

// ============================================================================
// UI API
// ============================================================================+

class UIAPI {
  constructor(private pluginId: PluginId) {}

  registerComponent(component: UIComponentDefinition): void {
    // TODO: Register component globally
    console.log(`[${this.pluginId}] Registering component:`, component.id);
  }

  registerView(view: UIViewDefinition): void {
    // TODO: Register view globally
    console.log(`[${this.pluginId}] Registering view:`, view.id);
  }

  registerToolbarButton(button: ToolbarButtonDefinition): void {
    // TODO: Register button globally
    console.log(`[${this.pluginId}] Registering toolbar button:`, button.id);
  }

  registerSidebarItem(item: SidebarItemDefinition): void {
    // TODO: Register sidebar item globally
    console.log(`[${this.pluginId}] Registering sidebar item:`, item.id);
  }
}

// ============================================================================
// DATA API
// ============================================================================+

class DataAPI {
  constructor(private pluginId: PluginId) {}

  registerSource(source: DataSourceDefinition): void {
    if (!source?.id?.trim()) {
      throw new Error('Data source ID is required');
    }
    if (!source?.fetch) {
      throw new Error('Data source fetch function is required');
    }
    // TODO: Register data source globally in data registry
    console.log(`[Plugin:${this.pluginId}] Registering data source:`, source.id);
  }

  registerTransformer(transformer: DataTransformerDefinition): void {
    if (!transformer?.id?.trim()) {
      throw new Error('Transformer ID is required');
    }
    if (!transformer?.transform) {
      throw new Error('Transformer transform function is required');
    }
    // TODO: Register transformer globally in data registry
    console.log(`[Plugin:${this.pluginId}] Registering transformer:`, transformer.id);
  }

  registerValidator(validator: DataValidatorDefinition): void {
    if (!validator?.id?.trim()) {
      throw new Error('Validator ID is required');
    }
    if (!validator?.validate) {
      throw new Error('Validator validate function is required');
    }
    // TODO: Register validator globally in data registry
    console.log(`[Plugin:${this.pluginId}] Registering validator:`, validator.id);
  }
}

// ============================================================================
// PLUGIN MANAGEMENT API
// ============================================================================+

/**
 * Plugin Management API
 *
 * Provides functions for managing plugins (install, uninstall, enable, disable, etc.)
 * These functions are typically called by the marketplace or admin interfaces.
 */
export class PluginManagementAPI {
  /**
   * Install a plugin
   */
  async installPlugin(pluginId: PluginId, version?: string): Promise<{ success: boolean; error?: string }> {
    if (!pluginId?.trim()) {
      return { success: false, error: 'Plugin ID is required' };
    }

    try {
      const manager = getPluginManager();
      const registry = getPluginRegistry();

      // Check if already installed
      const isInstalled = await registry.isPluginInstalled(pluginId);
      if (isInstalled) {
        return { success: false, error: 'Plugin is already installed' };
      }

      // TODO: Download plugin from marketplace
      // For now, this is a placeholder
      return { success: false, error: 'Plugin installation from marketplace not yet implemented' };
    } catch (error) {
      return {
        success: false,
        error: `Installation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: PluginId): Promise<{ success: boolean; error?: string }> {
    if (!pluginId?.trim()) {
      return { success: false, error: 'Plugin ID is required' };
    }

    try {
      const manager = getPluginManager();
      const registry = getPluginRegistry();

      // Check if installed
      const isInstalled = await registry.isPluginInstalled(pluginId);
      if (!isInstalled) {
        return { success: false, error: 'Plugin is not installed' };
      }

      // Uninstall the plugin
      await manager.uninstall(pluginId);

      // Remove from registry
      await registry.deleteManifest(pluginId);
      await registry.deleteRuntimeState(pluginId);
      await registry.deletePluginSettings(pluginId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Uninstallation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: PluginId): Promise<{ success: boolean; error?: string }> {
    if (!pluginId?.trim()) {
      return { success: false, error: 'Plugin ID is required' };
    }

    try {
      const manager = getPluginManager();
      await manager.enable(pluginId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to enable plugin: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: PluginId): Promise<{ success: boolean; error?: string }> {
    if (!pluginId?.trim()) {
      return { success: false, error: 'Plugin ID is required' };
    }

    try {
      const manager = getPluginManager();
      await manager.disable(pluginId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to disable plugin: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Update a plugin to a specific version
   */
  async updatePlugin(pluginId: PluginId, version?: string): Promise<{ success: boolean; error?: string }> {
    if (!pluginId?.trim()) {
      return { success: false, error: 'Plugin ID is required' };
    }

    try {
      const registry = getPluginRegistry();

      // Check if installed
      const isInstalled = await registry.isPluginInstalled(pluginId);
      if (!isInstalled) {
        return { success: false, error: 'Plugin is not installed' };
      }

      // TODO: Download and install update from marketplace
      // For now, this is a placeholder
      return { success: false, error: 'Plugin updates not yet implemented' };
    } catch (error) {
      return {
        success: false,
        error: `Update failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get detailed information about a plugin
   */
  async getPluginDetails(pluginId: PluginId): Promise<PluginManifest | null> {
    if (!pluginId?.trim()) {
      throw new Error('Plugin ID is required');
    }

    try {
      const registry = getPluginRegistry();
      const manifest = await registry.getManifest(pluginId);
      const state = await registry.getRuntimeState(pluginId);

      if (!manifest) {
        return null;
      }

      // Return manifest with runtime state info
      return {
        ...manifest,
        // Add runtime info as custom properties
        ...(state ? { runtimeState: state } : {}),
      } as PluginManifest & { runtimeState?: typeof state };
    } catch (error) {
      throw new Error(`Failed to get plugin details: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get list of all plugins with optional filters
   */
  async getPluginList(filters?: {
    category?: string;
    type?: string;
    enabled?: boolean;
    state?: string;
  }): Promise<PluginManifest[]> {
    try {
      const registry = getPluginRegistry();
      let manifests = await registry.getAllManifests();

      // Apply filters
      if (filters) {
        if (filters.category) {
          manifests = manifests.filter(m => m.categories.includes(filters.category!));
        }
        if (filters.type) {
          manifests = manifests.filter(m => m.type.includes(filters.type as any));
        }
        if (filters.enabled !== undefined) {
          const states = await registry.getAllRuntimeStates();
          const enabledIds = new Set(
            states.filter(s => s.enabled).map(s => s.id)
          );
          manifests = manifests.filter(m => enabledIds.has(m.id) === filters.enabled);
        }
        if (filters.state) {
          const states = await registry.getAllRuntimeStates();
          const stateIds = new Set(
            states.filter(s => s.state === filters.state).map(s => s.id)
          );
          manifests = manifests.filter(m => stateIds.has(m.id));
        }
      }

      return manifests;
    } catch (error) {
      throw new Error(`Failed to get plugin list: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search for plugins by query
   */
  async searchPlugins(query: string): Promise<PluginManifest[]> {
    if (!query?.trim()) {
      throw new Error('Search query is required');
    }

    try {
      const registry = getPluginRegistry();
      return await registry.searchPlugins(query);
    } catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get list of installed plugins
   */
  async getInstalledPlugins(): Promise<PluginManifest[]> {
    try {
      const manager = getPluginManager();
      return await manager.getInstalledPlugins();
    } catch (error) {
      throw new Error(`Failed to get installed plugins: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get permissions for a specific plugin
   */
  async getPluginPermissions(pluginId: PluginId): Promise<{
    required: Permission[];
    granted: Permission[];
    optional: Permission[];
  }> {
    if (!pluginId?.trim()) {
      throw new Error('Plugin ID is required');
    }

    try {
      const registry = getPluginRegistry();
      const manifest = await registry.getManifest(pluginId);
      const state = await registry.getRuntimeState(pluginId);

      if (!manifest) {
        throw new Error(`Plugin not found: ${pluginId}`);
      }

      return {
        required: manifest.permissions,
        granted: state?.grantedPermissions || [],
        optional: manifest.optionalPermissions || [],
      };
    } catch (error) {
      throw new Error(`Failed to get plugin permissions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// ============================================================================
// PERMISSION MANAGEMENT API
// ============================================================================+

/**
 * Permission Management API
 *
 * Provides functions for managing plugin permissions
 */
export class PermissionManagementAPI {
  /**
   * Grant a permission to a plugin
   */
  async grantPluginPermission(
    pluginId: PluginId,
    permission: Permission
  ): Promise<{ success: boolean; error?: string }> {
    if (!pluginId?.trim()) {
      return { success: false, error: 'Plugin ID is required' };
    }
    if (!permission) {
      return { success: false, error: 'Permission is required' };
    }

    try {
      const permissionManager = getPermissionManager();
      permissionManager.grantPermissions(pluginId, [permission]);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to grant permission: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Revoke a permission from a plugin
   */
  async revokePluginPermission(
    pluginId: PluginId,
    permission: Permission
  ): Promise<{ success: boolean; error?: string }> {
    if (!pluginId?.trim()) {
      return { success: false, error: 'Plugin ID is required' };
    }
    if (!permission) {
      return { success: false, error: 'Permission is required' };
    }

    try {
      const permissionManager = getPermissionManager();
      permissionManager.revokePermission(pluginId, permission);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to revoke permission: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check if a plugin has a specific permission
   */
  async checkPluginPermission(
    pluginId: PluginId,
    permission: Permission
  ): Promise<boolean> {
    if (!pluginId?.trim()) {
      throw new Error('Plugin ID is required');
    }
    if (!permission) {
      throw new Error('Permission is required');
    }

    try {
      const permissionManager = getPermissionManager();
      return permissionManager.hasPermission(pluginId, permission);
    } catch (error) {
      throw new Error(`Failed to check permission: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Request a permission for a plugin (user prompt)
   */
  async requestPluginPermission(
    pluginId: PluginId,
    permission: Permission
  ): Promise<{ granted: boolean; error?: string }> {
    if (!pluginId?.trim()) {
      return { granted: false, error: 'Plugin ID is required' };
    }
    if (!permission) {
      return { granted: false, error: 'Permission is required' };
    }

    try {
      const permissionManager = getPermissionManager();
      // TODO: Show user prompt for permission request
      // For now, auto-grant for testing
      const result = await permissionManager.requestPermissions(pluginId, [permission]);
      return {
        granted: result.granted.includes(permission),
      };
    } catch (error) {
      return {
        granted: false,
        error: `Failed to request permission: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

// ============================================================================
// MARKETPLACE API
// ============================================================================+

/**
 * Plugin Marketplace API
 *
 * Provides functions for interacting with the plugin marketplace
 */
export class MarketplaceAPI {
  /**
   * Get all available plugins from marketplace
   */
  async getMarketplacePlugins(filters?: {
    category?: string;
    type?: string;
    featured?: boolean;
    minRating?: number;
  }): Promise<any[]> {
    try {
      // TODO: Connect to actual marketplace API
      // For now, return empty array
      console.log('Fetching marketplace plugins with filters:', filters);
      return [];
    } catch (error) {
      throw new Error(`Failed to get marketplace plugins: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get reviews for a plugin
   */
  async getPluginReviews(pluginId: PluginId): Promise<any[]> {
    if (!pluginId?.trim()) {
      throw new Error('Plugin ID is required');
    }

    try {
      // TODO: Connect to actual marketplace API
      console.log(`Fetching reviews for plugin: ${pluginId}`);
      return [];
    } catch (error) {
      throw new Error(`Failed to get plugin reviews: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Submit a review for a plugin
   */
  async submitPluginReview(
    pluginId: PluginId,
    review: {
      rating: number;
      text?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    if (!pluginId?.trim()) {
      return { success: false, error: 'Plugin ID is required' };
    }
    if (!review || review.rating < 1 || review.rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' };
    }

    try {
      // TODO: Connect to actual marketplace API
      console.log(`Submitting review for plugin ${pluginId}:`, review);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to submit review: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Report a plugin for violating terms or issues
   */
  async reportPlugin(
    pluginId: PluginId,
    issue: {
      reason: string;
      description: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    if (!pluginId?.trim()) {
      return { success: false, error: 'Plugin ID is required' };
    }
    if (!issue?.reason?.trim()) {
      return { success: false, error: 'Report reason is required' };
    }
    if (!issue?.description?.trim()) {
      return { success: false, error: 'Report description is required' };
    }

    try {
      // TODO: Connect to actual marketplace API
      console.log(`Reporting plugin ${pluginId}:`, issue);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to report plugin: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

// ============================================================================
// PLUGIN API SURFACE
// ============================================================================+

export function createPluginAPI(
  pluginId: PluginId,
  permissions: Permission[],
  settings: Record<string, any>
): IPluginAPISurface {
  const logger = new PluginLoggerImpl(pluginId);
  const storage = new PluginStorageImpl(pluginId);
  const events = new PluginEventBusImpl();

  return {
    version: '1.0.0',

    commands: new CommandsAPI(pluginId),

    ui: new UIAPI(pluginId),

    data: new DataAPI(pluginId),

    conversations: new ConversationsAPI(pluginId),

    messages: new MessagesAPI(pluginId),

    knowledge: new KnowledgeAPI(pluginId),

    analytics: new AnalyticsAPI(pluginId),

    settings: new SettingsAPI(pluginId),

    storage,

    events,

    logger,
  };
}

// ============================================================================
// PLUGIN CONTEXT CREATOR
// ============================================================================+

export function createPluginContext(
  pluginId: PluginId,
  version: string,
  permissions: Permission[],
  settings: Record<string, any>
): PluginAPIContext {
  const logger = new PluginLoggerImpl(pluginId);
  const storage = new PluginStorageImpl(pluginId);
  const events = new PluginEventBusImpl();

  return {
    pluginId,
    version,
    permissions,
    settings,
    logger,
    storage,
    events,
  };
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Get plugin management API instance
 */
export function getPluginManagementAPI(): PluginManagementAPI {
  return new PluginManagementAPI();
}

/**
 * Get permission management API instance
 */
export function getPermissionManagementAPI(): PermissionManagementAPI {
  return new PermissionManagementAPI();
}

/**
 * Get marketplace API instance
 */
export function getMarketplaceAPI(): MarketplaceAPI {
  return new MarketplaceAPI();
}
