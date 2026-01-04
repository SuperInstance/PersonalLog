/**
 * Extension System
 *
 * Comprehensive extension point system for PersonalLog.
 * Allows plugins to extend functionality at various points.
 *
 * @module lib/extensions
 */

// Types
export * from './types';

// Core
export { getExtensionRegistry, resetExtensionRegistry } from './registry';
export { getExtensionManager, resetExtensionManager, ExtensionManager } from './manager';

// API
export {
  createExtensionAPI,
  extensions,
  CommandExtensionBuilder,
  MessageMiddlewareBuilder,
  MessageFilterBuilder,
  MessageEnricherBuilder,
  SidebarPanelBuilder,
  MenuItemBuilder,
  ToolbarButtonBuilder,
  ModalDialogBuilder,
  StatusBarBuilder,
  ContextMenuBuilder,
  ExportFormatBuilder,
  ImportSourceBuilder,
  AIProviderBuilder,
  ThemeBuilder,
} from './api';
