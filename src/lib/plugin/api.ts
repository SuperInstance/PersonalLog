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
import { Permission, PermissionValidator } from './permissions';
import { getPermissionManager } from './permissions';

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
      for (const handler of handlers) {
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
    const result = PermissionValidator.validateRequest(
      this.pluginId,
      permission,
      manager
    );
    if (!result.allowed) {
      throw new Error(result.reason || 'Permission denied');
    }
  }

  async list(): Promise<any[]> {
    this.checkPermission(Permission.READ_CONVERSATIONS);
    // TODO: Implement actual API call
    return [];
  }

  async get(id: string): Promise<any> {
    this.checkPermission(Permission.READ_CONVERSATIONS);
    // TODO: Implement actual API call
    return null;
  }

  async create(data: any): Promise<any> {
    this.checkPermission(Permission.WRITE_CONVERSATIONS);
    // TODO: Implement actual API call
    return null;
  }

  async update(id: string, data: any): Promise<void> {
    this.checkPermission(Permission.WRITE_CONVERSATIONS);
    // TODO: Implement actual API call
  }

  async delete(id: string): Promise<void> {
    this.checkPermission(Permission.DELETE_CONVERSATIONS);
    // TODO: Implement actual API call
  }
}

// ============================================================================
// MESSAGES API
// ============================================================================+

class MessagesAPI {
  constructor(private pluginId: PluginId) {}

  private checkPermission(permission: Permission): void {
    const manager = getPermissionManager();
    const result = PermissionValidator.validateRequest(
      this.pluginId,
      permission,
      manager
    );
    if (!result.allowed) {
      throw new Error(result.reason || 'Permission denied');
    }
  }

  async list(conversationId: string): Promise<any[]> {
    this.checkPermission(Permission.READ_MESSAGES);
    // TODO: Implement actual API call
    return [];
  }

  async get(id: string): Promise<any> {
    this.checkPermission(Permission.READ_MESSAGES);
    // TODO: Implement actual API call
    return null;
  }

  async create(conversationId: string, data: any): Promise<any> {
    this.checkPermission(Permission.WRITE_MESSAGES);
    // TODO: Implement actual API call
    return null;
  }

  async update(id: string, data: any): Promise<void> {
    this.checkPermission(Permission.WRITE_MESSAGES);
    // TODO: Implement actual API call
  }

  async delete(id: string): Promise<void> {
    this.checkPermission(Permission.DELETE_MESSAGES);
    // TODO: Implement actual API call
  }
}

// ============================================================================
// KNOWLEDGE API
// ============================================================================+

class KnowledgeAPI {
  constructor(private pluginId: PluginId) {}

  private checkPermission(permission: Permission): void {
    const manager = getPermissionManager();
    const result = PermissionValidator.validateRequest(
      this.pluginId,
      permission,
      manager
    );
    if (!result.allowed) {
      throw new Error(result.reason || 'Permission denied');
    }
  }

  async search(query: string, options?: any): Promise<any[]> {
    this.checkPermission(Permission.READ_KNOWLEDGE);
    // TODO: Implement actual API call
    return [];
  }

  async get(id: string): Promise<any> {
    this.checkPermission(Permission.READ_KNOWLEDGE);
    // TODO: Implement actual API call
    return null;
  }

  async create(data: any): Promise<any> {
    this.checkPermission(Permission.WRITE_KNOWLEDGE);
    // TODO: Implement actual API call
    return null;
  }

  async update(id: string, data: any): Promise<void> {
    this.checkPermission(Permission.WRITE_KNOWLEDGE);
    // TODO: Implement actual API call
  }

  async delete(id: string): Promise<void> {
    this.checkPermission(Permission.DELETE_KNOWLEDGE);
    // TODO: Implement actual API call
  }
}

// ============================================================================
// ANALYTICS API
// ============================================================================+

class AnalyticsAPI {
  constructor(private pluginId: PluginId) {}

  private checkPermission(permission: Permission): void {
    const manager = getPermissionManager();
    const result = PermissionValidator.validateRequest(
      this.pluginId,
      permission,
      manager
    );
    if (!result.allowed) {
      throw new Error(result.reason || 'Permission denied');
    }
  }

  async trackEvent(event: string, data?: any): Promise<void> {
    this.checkPermission(Permission.WRITE_ANALYTICS);
    // TODO: Implement actual API call
  }

  async getMetrics(options?: any): Promise<any> {
    this.checkPermission(Permission.READ_ANALYTICS);
    // TODO: Implement actual API call
    return null;
  }

  async query(query: any): Promise<any> {
    this.checkPermission(Permission.READ_ANALYTICS);
    // TODO: Implement actual API call
    return null;
  }
}

// ============================================================================
// SETTINGS API
// ============================================================================+

class SettingsAPI {
  constructor(private pluginId: PluginId) {}

  private checkPermission(permission: Permission): void {
    const manager = getPermissionManager();
    const result = PermissionValidator.validateRequest(
      this.pluginId,
      permission,
      manager
    );
    if (!result.allowed) {
      throw new Error(result.reason || 'Permission denied');
    }
  }

  async get(key: string): Promise<any> {
    this.checkPermission(Permission.READ_SETTINGS);
    // TODO: Implement actual API call
    return null;
  }

  async set(key: string, value: any): Promise<void> {
    this.checkPermission(Permission.WRITE_SETTINGS);
    // TODO: Implement actual API call
  }

  async getAll(): Promise<Record<string, any>> {
    this.checkPermission(Permission.READ_SETTINGS);
    // TODO: Implement actual API call
    return {};
  }
}

// ============================================================================
// COMMANDS API
// ============================================================================+

class CommandsAPI {
  private commands: Map<string, CommandDefinition> = new Map();

  constructor(private pluginId: PluginId) {}

  register(command: CommandDefinition): void {
    // TODO: Register command globally
    this.commands.set(command.id, command);
  }

  async execute(commandId: string, ...args: any[]): Promise<any> {
    const command = this.commands.get(commandId);
    if (!command) {
      throw new Error(`Command not found: ${commandId}`);
    }

    // TODO: Execute command with permission checks
    return null;
  }

  unregister(commandId: string): void {
    this.commands.delete(commandId);
    // TODO: Unregister globally
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
    // TODO: Register data source globally
    console.log(`[${this.pluginId}] Registering data source:`, source.id);
  }

  registerTransformer(transformer: DataTransformerDefinition): void {
    // TODO: Register transformer globally
    console.log(`[${this.pluginId}] Registering transformer:`, transformer.id);
  }

  registerValidator(validator: DataValidatorDefinition): void {
    // TODO: Register validator globally
    console.log(`[${this.pluginId}] Registering validator:`, validator.id);
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
