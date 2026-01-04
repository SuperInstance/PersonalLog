/**
 * Extension API
 *
 * Public API for plugins to register extensions with PersonalLog.
 * Provides a clean, type-safe interface for extension registration.
 *
 * @module lib/extensions/api
 */

import type {
  Extension,
  ExtensionId,
  ExtensionPoint,
} from './types';
import {
  ExtensionPriority,
  CommandExtension,
  MessageMiddlewareExtension,
  MessageFilterExtension,
  MessageEnricherExtension,
  SidebarPanelExtension,
  MenuItemExtension,
  ToolbarButtonExtension,
  ModalDialogExtension,
  StatusBarExtension,
  ContextMenuExtension,
  ExportFormatExtension,
  ImportSourceExtension,
  DataTransformerExtension,
  DataValidatorExtension,
  AIProviderExtension,
  MessageProcessorExtension,
  ResponseTransformerExtension,
  AnalyticsMetricExtension,
  AnalyticsAggregatorExtension,
  AnalyticsVisualizationExtension,
  WorkflowTriggerExtension,
  WorkflowActionExtension,
  ThemeExtension,
} from './types';
import { getExtensionManager } from './manager';

// ============================================================================
// EXTENSION BUILDER
// ============================================================================

/**
 * Extension builder for fluent API
 */
export class ExtensionBuilder {
  protected pluginId: string;
  protected extension: Partial<Extension>;
  protected priority: ExtensionPriority = ExtensionPriority.NORMAL;
  protected dependencies: ExtensionId[] = [];
  protected autoActivate = true;

  constructor(pluginId: string, id: string, point: ExtensionPoint, name: string) {
    this.pluginId = pluginId;
    this.extension = {
      id: `${pluginId}.${id}` as ExtensionId,
      point,
      name,
      priority: ExtensionPriority.NORMAL,
      pluginId,
      enabled: true,
      version: '1.0.0',
    };
  }

  /**
   * Set extension description
   */
  description(desc: string): this {
    this.extension.description = desc;
    return this;
  }

  /**
   * Set extension priority
   */
  setPriority(priority: ExtensionPriority): this {
    this.priority = priority;
    this.extension.priority = priority;
    return this;
  }

  /**
   * Add extension dependency
   */
  dependsOn(...deps: ExtensionId[]): this {
    this.dependencies.push(...deps);
    return this;
  }

  /**
   * Set auto-activation
   */
  autoActivate(enabled: boolean): this {
    this.autoActivate = enabled;
    return this;
  }

  /**
   * Set extension version
   */
  version(ver: string): this {
    this.extension.version = ver;
    return this;
  }

  /**
   * Add required permissions
   */
  permissions(...perms: string[]): this {
    this.extension.permissions = perms;
    return this;
  }

  /**
   * Register the extension
   */
  register(): ExtensionId {
    const manager = getExtensionManager();

    if (!this.extension.point || !this.extension.name) {
      throw new Error('Extension must have point and name');
    }

    manager.register(this.extension as Extension, {
      autoActivate: this.autoActivate,
      priority: this.priority,
      dependencies: this.dependencies,
    });

    return this.extension.id;
  }
}

// ============================================================================
// COMMAND EXTENSION BUILDER
// ============================================================================

export class CommandExtensionBuilder extends ExtensionBuilder {
  private command: Partial<CommandExtension> = {};

  constructor(pluginId: string, id: string, title: string) {
    super(pluginId, id, 'command' as ExtensionPoint, title);
    this.command = {
      ...this.extension,
      point: 'command' as ExtensionPoint,
      title,
      handler: null as any,
    };
  }

  /**
   * Set command description
   */
  describe(description: string): this {
    this.command.description = description;
    return this;
  }

  /**
   * Set command icon
   */
  icon(iconName: string): this {
    this.command.icon = iconName;
    return this;
  }

  /**
   * Set keyboard shortcut
   */
  keybinding(shortcut: string): this {
    this.command.keybinding = shortcut;
    return this;
  }

  /**
   * Set command category
   */
  category(cat: string): this {
    this.command.category = cat;
    return this;
  }

  /**
   * Set command handler
   */
  handler(fn: CommandExtension['handler']): this {
    this.command.handler = fn;
    return this;
  }

  /**
   * Register command extension
   */
  register(): ExtensionId {
    const manager = getExtensionManager();
    manager.register(this.command as CommandExtension, {
      autoActivate: this.autoActivate,
      priority: this.priority,
      dependencies: this.dependencies,
    });
    return this.command.id!;
  }
}

// ============================================================================
// MESSAGE EXTENSION BUILDERS
// ============================================================================

export class MessageMiddlewareBuilder extends ExtensionBuilder {
  private middleware: Partial<MessageMiddlewareExtension> = {};

  constructor(pluginId: string, id: string, name: string) {
    super(pluginId, id, 'message.middleware' as ExtensionPoint, name);
    this.middleware = {
      ...this.extension,
      point: 'message.middleware' as ExtensionPoint,
      middleware: null as any,
    };
  }

  /**
   * Set middleware function
   */
  process(fn: MessageMiddlewareExtension['middleware']): this {
    this.middleware.middleware = fn;
    return this;
  }

  register(): ExtensionId {
    const manager = getExtensionManager();
    manager.register(this.middleware as MessageMiddlewareExtension, {
      autoActivate: this.autoActivate,
      priority: this.priority,
      dependencies: this.dependencies,
    });
    return this.middleware.id!;
  }
}

export class MessageFilterBuilder extends ExtensionBuilder {
  private filter: Partial<MessageFilterExtension> = {};

  constructor(pluginId: string, id: string, name: string) {
    super(pluginId, id, 'message.filter' as ExtensionPoint, name);
    this.filter = {
      ...this.extension,
      point: 'message.filter' as ExtensionPoint,
      filter: null as any,
    };
  }

  /**
   * Set filter function
   */
  test(fn: MessageFilterExtension['filter']): this {
    this.filter.filter = fn;
    return this;
  }

  register(): ExtensionId {
    const manager = getExtensionManager();
    manager.register(this.filter as MessageFilterExtension, {
      autoActivate: this.autoActivate,
      priority: this.priority,
      dependencies: this.dependencies,
    });
    return this.filter.id!;
  }
}

export class MessageEnricherBuilder extends ExtensionBuilder {
  private enricher: Partial<MessageEnricherExtension> = {};

  constructor(pluginId: string, id: string, name: string) {
    super(pluginId, id, 'message.enricher' as ExtensionPoint, name);
    this.enricher = {
      ...this.extension,
      point: 'message.enricher' as ExtensionPoint,
      enricher: null as any,
    };
  }

  /**
   * Set enricher function
   */
  enrich(fn: MessageEnricherExtension['enricher']): this {
    this.enricher.enricher = fn;
    return this;
  }

  register(): ExtensionId {
    const manager = getExtensionManager();
    manager.register(this.enricher as MessageEnricherExtension, {
      autoActivate: this.autoActivate,
      priority: this.priority,
      dependencies: this.dependencies,
    });
    return this.enricher.id!;
  }
}

// ============================================================================
// UI EXTENSION BUILDERS
// ============================================================================

export class SidebarPanelBuilder extends ExtensionBuilder {
  private panel: Partial<SidebarPanelExtension> = {};

  constructor(pluginId: string, id: string, title: string) {
    super(pluginId, id, 'ui.sidebar.panel' as ExtensionPoint, title);
    this.panel = {
      ...this.extension,
      point: 'ui.sidebar.panel' as ExtensionPoint,
      title,
      position: 'bottom',
      render: null as any,
    };
  }

  /**
   * Set panel icon
   */
  icon(iconName: string): this {
    this.panel.icon = iconName;
    return this;
  }

  /**
   * Set panel position
   */
  position(pos: 'top' | 'bottom'): this {
    this.panel.position = pos;
    return this;
  }

  /**
   * Set default open state
   */
  defaultOpen(open: boolean): this {
    this.panel.defaultOpen = open;
    return this;
  }

  /**
   * Set render function
   */
  render(fn: SidebarPanelExtension['render']): this {
    this.panel.render = fn;
    return this;
  }

  register(): ExtensionId {
    const manager = getExtensionManager();
    manager.register(this.panel as SidebarPanelExtension, {
      autoActivate: this.autoActivate,
      priority: this.priority,
      dependencies: this.dependencies,
    });
    return this.panel.id!;
  }
}

export class MenuItemBuilder extends ExtensionBuilder {
  private item: Partial<MenuItemExtension> = {};

  constructor(pluginId: string, id: string, label: string, location: MenuItemExtension['location']) {
    super(pluginId, id, 'ui.menu.item' as ExtensionPoint, label);
    this.item = {
      ...this.extension,
      point: 'ui.menu.item' as ExtensionPoint,
      label,
      location,
      action: null as any,
    };
  }

  /**
   * Set item icon
   */
  icon(iconName: string): this {
    this.item.icon = iconName;
    return this;
  }

  /**
   * Set item position in menu
   */
  position(pos: number): this {
    this.item.position = pos;
    return this;
  }

  /**
   * Add separator before item
   */
  separator(): this {
    this.item.separator = true;
    return this;
  }

  /**
   * Set action handler
   */
  action(fn: MenuItemExtension['action']): this {
    this.item.action = fn;
    return this;
  }

  register(): ExtensionId {
    const manager = getExtensionManager();
    manager.register(this.item as MenuItemExtension, {
      autoActivate: this.autoActivate,
      priority: this.priority,
      dependencies: this.dependencies,
    });
    return this.item.id!;
  }
}

export class ToolbarButtonBuilder extends ExtensionBuilder {
  private button: Partial<ToolbarButtonExtension> = {};

  constructor(pluginId: string, id: string, label: string, position: 'left' | 'right') {
    super(pluginId, id, 'ui.toolbar.button' as ExtensionPoint, label);
    this.button = {
      ...this.extension,
      point: 'ui.toolbar.button' as ExtensionPoint,
      label,
      position,
      onClick: null as any,
    };
  }

  /**
   * Set button icon
   */
  icon(iconName: string): this {
    this.button.icon = iconName;
    return this;
  }

  /**
   * Set button variant
   */
  variant(variant: 'default' | 'primary' | 'secondary' | 'danger'): this {
    this.button.variant = variant;
    return this;
  }

  /**
   * Set click handler
   */
  onClick(fn: ToolbarButtonExtension['onClick']): this {
    this.button.onClick = fn;
    return this;
  }

  register(): ExtensionId {
    const manager = getExtensionManager();
    manager.register(this.button as ToolbarButtonExtension, {
      autoActivate: this.autoActivate,
      priority: this.priority,
      dependencies: this.dependencies,
    });
    return this.button.id!;
  }
}

export class ModalDialogBuilder extends ExtensionBuilder {
  private dialog: Partial<ModalDialogExtension> = {};

  constructor(pluginId: string, id: string, title: string) {
    super(pluginId, id, 'ui.modal.dialog' as ExtensionPoint, title);
    this.dialog = {
      ...this.extension,
      point: 'ui.modal.dialog' as ExtensionPoint,
      title,
      size: 'md',
      render: null as any,
    };
  }

  /**
   * Set dialog size
   */
  size(size: 'sm' | 'md' | 'lg' | 'xl' | 'full'): this {
    this.dialog.size = size;
    return this;
  }

  /**
   * Set render function
   */
  render(fn: ModalDialogExtension['render']): this {
    this.dialog.render = fn;
    return this;
  }

  register(): ExtensionId {
    const manager = getExtensionManager();
    manager.register(this.dialog as ModalDialogExtension, {
      autoActivate: this.autoActivate,
      priority: this.priority,
      dependencies: this.dependencies,
    });
    return this.dialog.id!;
  }
}

export class StatusBarBuilder extends ExtensionBuilder {
  private item: Partial<StatusBarExtension> = {};

  constructor(pluginId: string, id: string) {
    super(pluginId, id, 'ui.status.item' as ExtensionPoint, id);
    this.item = {
      ...this.extension,
      point: 'ui.status.item' as ExtensionPoint,
      position: 'right',
      render: null as any,
    };
  }

  /**
   * Set item position
   */
  position(pos: 'left' | 'right'): this {
    this.item.position = pos;
    return this;
  }

  /**
   * Set item priority
   */
  order(n: number): this {
    this.item.order = n;
    return this;
  }

  /**
   * Set render function
   */
  render(fn: StatusBarExtension['render']): this {
    this.item.render = fn;
    return this;
  }

  register(): ExtensionId {
    const manager = getExtensionManager();
    manager.register(this.item as StatusBarExtension, {
      autoActivate: this.autoActivate,
      priority: this.priority,
      dependencies: this.dependencies,
    });
    return this.item.id!;
  }
}

export class ContextMenuBuilder extends ExtensionBuilder {
  private item: Partial<ContextMenuExtension> = {};

  constructor(
    pluginId: string,
    id: string,
    label: string,
    context: ContextMenuExtension['context']
  ) {
    super(pluginId, id, 'ui.context.menu' as ExtensionPoint, label);
    this.item = {
      ...this.extension,
      point: 'ui.context.menu' as ExtensionPoint,
      label,
      context,
      action: null as any,
    };
  }

  /**
   * Set item icon
   */
  icon(iconName: string): this {
    this.item.icon = iconName;
    return this;
  }

  /**
   * Set item position
   */
  position(pos: number): this {
    this.item.position = pos;
    return this;
  }

  /**
   * Add separator
   */
  separator(): this {
    this.item.separator = true;
    return this;
  }

  /**
   * Set action handler
   */
  action(fn: ContextMenuExtension['action']): this {
    this.item.action = fn;
    return this;
  }

  register(): ExtensionId {
    const manager = getExtensionManager();
    manager.register(this.item as ContextMenuExtension, {
      autoActivate: this.autoActivate,
      priority: this.priority,
      dependencies: this.dependencies,
    });
    return this.item.id!;
  }
}

// ============================================================================
// DATA EXTENSION BUILDERS
// ============================================================================

export class ExportFormatBuilder extends ExtensionBuilder {
  private format: Partial<ExportFormatExtension> = {};

  constructor(pluginId: string, id: string, name: string, extension: string) {
    super(pluginId, id, 'data.export.format' as ExtensionPoint, name);
    this.format = {
      ...this.extension,
      point: 'data.export.format' as ExtensionPoint,
      name,
      extension,
      mimeType: 'text/plain',
      export: null as any,
    };
  }

  /**
   * Set MIME type
   */
  mimeType(type: string): this {
    this.format.mimeType = type;
    return this;
  }

  /**
   * Set description
   */
  describe(desc: string): this {
    this.format.description = desc;
    return this;
  }

  /**
   * Set export function
   */
  export(fn: ExportFormatExtension['export']): this {
    this.format.export = fn;
    return this;
  }

  register(): ExtensionId {
    const manager = getExtensionManager();
    manager.register(this.format as ExportFormatExtension, {
      autoActivate: this.autoActivate,
      priority: this.priority,
      dependencies: this.dependencies,
    });
    return this.format.id!;
  }
}

export class ImportSourceBuilder extends ExtensionBuilder {
  private source: Partial<ImportSourceExtension> = {};

  constructor(pluginId: string, id: string, name: string, formats: string[]) {
    super(pluginId, id, 'data.import.source' as ExtensionPoint, name);
    this.source = {
      ...this.extension,
      point: 'data.import.source' as ExtensionPoint,
      name,
      formats,
      import: null as any,
    };
  }

  /**
   * Set description
   */
  describe(desc: string): this {
    this.source.description = desc;
    return this;
  }

  /**
   * Set import function
   */
  import(fn: ImportSourceExtension['import']): this {
    this.source.import = fn;
    return this;
  }

  register(): ExtensionId {
    const manager = getExtensionManager();
    manager.register(this.source as ImportSourceExtension, {
      autoActivate: this.autoActivate,
      priority: this.priority,
      dependencies: this.dependencies,
    });
    return this.source.id!;
  }
}

// ============================================================================
// AI EXTENSION BUILDERS
// ============================================================================

export class AIProviderBuilder extends ExtensionBuilder {
  private provider: Partial<AIProviderExtension> = {};

  constructor(
    pluginId: string,
    id: string,
    name: string,
    type: AIProviderExtension['type'],
    models: string[]
  ) {
    super(pluginId, id, 'ai.provider' as ExtensionPoint, name);
    this.provider = {
      ...this.extension,
      point: 'ai.provider' as ExtensionPoint,
      name,
      type,
      models,
      generate: null as any,
    };
  }

  /**
   * Set configuration schema
   */
  configSchema(schema: Record<string, any>): this {
    this.provider.configSchema = schema;
    return this;
  }

  /**
   * Set generate function
   */
  generate(fn: AIProviderExtension['generate']): this {
    this.provider.generate = fn;
    return this;
  }

  register(): ExtensionId {
    const manager = getExtensionManager();
    manager.register(this.provider as AIProviderExtension, {
      autoActivate: this.autoActivate,
      priority: this.priority,
      dependencies: this.dependencies,
    });
    return this.provider.id!;
  }
}

// ============================================================================
// THEME EXTENSION BUILDER
// ============================================================================

export class ThemeBuilder extends ExtensionBuilder {
  private theme: Partial<ThemeExtension> = {};

  constructor(pluginId: string, id: string, name: string) {
    super(pluginId, id, 'theme' as ExtensionPoint, name);
    this.theme = {
      ...this.extension,
      point: 'theme' as ExtensionPoint,
      name,
      type: 'custom',
      colors: {},
    };
  }

  /**
   * Set theme type
   */
  type(type: 'light' | 'dark' | 'custom'): this {
    this.theme.type = type;
    return this;
  }

  /**
   * Set theme colors
   */
  colors(colors: Record<string, string>): this {
    this.theme.colors = colors;
    return this;
  }

  /**
   * Set theme fonts
   */
  fonts(fonts: Record<string, string>): this {
    this.theme.fonts = fonts;
    return this;
  }

  register(): ExtensionId {
    const manager = getExtensionManager();
    manager.register(this.theme as ThemeExtension, {
      autoActivate: this.autoActivate,
      priority: this.priority,
      dependencies: this.dependencies,
    });
    return this.theme.id!;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Create extension API for a plugin
 */
export function createExtensionAPI(pluginId: string) {
  return {
    /**
     * Create a command extension
     */
    command(id: string, title: string) {
      return new CommandExtensionBuilder(pluginId, id, title);
    },

    /**
     * Create a message middleware extension
     */
    messageMiddleware(id: string, name: string) {
      return new MessageMiddlewareBuilder(pluginId, id, name);
    },

    /**
     * Create a message filter extension
     */
    messageFilter(id: string, name: string) {
      return new MessageFilterBuilder(pluginId, id, name);
    },

    /**
     * Create a message enricher extension
     */
    messageEnricher(id: string, name: string) {
      return new MessageEnricherBuilder(pluginId, id, name);
    },

    /**
     * Create a sidebar panel extension
     */
    sidebarPanel(id: string, title: string) {
      return new SidebarPanelBuilder(pluginId, id, title);
    },

    /**
     * Create a menu item extension
     */
    menuItem(id: string, label: string, location: MenuItemExtension['location']) {
      return new MenuItemBuilder(pluginId, id, label, location);
    },

    /**
     * Create a toolbar button extension
     */
    toolbarButton(id: string, label: string, position: 'left' | 'right') {
      return new ToolbarButtonBuilder(pluginId, id, label, position);
    },

    /**
     * Create a modal dialog extension
     */
    modalDialog(id: string, title: string) {
      return new ModalDialogBuilder(pluginId, id, title);
    },

    /**
     * Create a status bar item extension
     */
    statusBarItem(id: string) {
      return new StatusBarBuilder(pluginId, id);
    },

    /**
     * Create a context menu item extension
     */
    contextMenuItem(id: string, label: string, context: ContextMenuExtension['context']) {
      return new ContextMenuBuilder(pluginId, id, label, context);
    },

    /**
     * Create an export format extension
     */
    exportFormat(id: string, name: string, extension: string) {
      return new ExportFormatBuilder(pluginId, id, name, extension);
    },

    /**
     * Create an import source extension
     */
    importSource(id: string, name: string, formats: string[]) {
      return new ImportSourceBuilder(pluginId, id, name, formats);
    },

    /**
     * Create an AI provider extension
     */
    aiProvider(id: string, name: string, type: AIProviderExtension['type'], models: string[]) {
      return new AIProviderBuilder(pluginId, id, name, type, models);
    },

    /**
     * Create a theme extension
     */
    theme(id: string, name: string) {
      return new ThemeBuilder(pluginId, id, name);
    },
  };
}

/**
 * Global extension API
 *
 * Usage:
 * ```ts
 * import { extensions } from '@/lib/extensions';
 *
 * // Register a command
 * extensions.command('my-command', 'My Command')
 *   .describe('Does something cool')
 *   .handler(async (ctx) => ({ success: true }))
 *   .register();
 * ```
 */
export const extensions = createExtensionAPI('app');
