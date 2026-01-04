/**
 * PersonalLog Plugin SDK
 *
 * Complete SDK for building plugins for PersonalLog.
 *
 * @packageDocumentation
 */

// Export base Plugin class
export { Plugin } from './Plugin';
export type { PluginLifecycle } from './Plugin';

// Export types
export type {
  // Core types
  PluginManifest,
  PluginAuthor,
  PluginCapabilities,
  ConversationCapability,
  KnowledgeCapability,
  AICapability,
  UICapability,
  NetworkCapability,
  StorageCapability,
  ExportCapability,
  PluginEntryPoints,
  UIExtensionPoints,
  MenuItemDefinition,
  SidebarItemDefinition,
  ViewDefinition,
  ComponentDefinition,
  PluginDependency,
  // State types
  PluginState,
  PluginStatus,
  PluginResources,
  // Context types
  PluginContext,
  PluginSettings,
  // Data API
  DataAPI,
  ConversationAPI,
  KnowledgeAPI,
  SettingsAPI,
  ConversationListOptions,
  CreateConversationData,
  UpdateConversationData,
  ConversationChangeCallback,
  KnowledgeEntry,
  KnowledgeSearchOptions,
  AddKnowledgeEntry,
  KnowledgeListOptions,
  // UI API
  UIAPI,
  ModalOptions,
  NotificationOptions,
  // AI API
  AIAPI,
  AIProviderInfo,
  AIModelInfo,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  CustomAIProvider,
  // Event API
  EventAPI,
  // Storage API
  StorageAPI,
  // Network API
  NetworkAPI,
  RequestOptions,
  // Export API
  ExportAPI,
  ExportFormat,
  ImportFormat,
  ExportResult,
  ImportResult,
  // Utils API
  UtilsAPI,
  // Logger
  Logger,
} from './types';

// Export validation
export {
  validateManifest,
  validatePluginClass,
  assertValidManifest,
  formatValidationErrors,
  ManifestBuilder,
  createManifestBuilder,
  PluginValidationError,
} from './validation';
export type { ValidationResult, ValidationError, ValidationWarning } from './validation';

// Export logger
export {
  createLogger,
  getLogHistory,
  clearLogHistory,
  logHistory,
  LogLevel,
  LogLevelNames,
} from './logger';
export type { LogEntry } from './logger';

// Export event bus
export { EventBus } from './api/events';

// Re-export commonly used types from core app
export type { Conversation, Message, AIAgent } from '@/types/conversation';

// ============================================================================
// SDK INFO
// ============================================================================

/**
 * SDK version
 */
export const SDK_VERSION = '1.0.0';

/**
 * SDK info
 */
export const SDK_INFO = {
  name: '@personallog/sdk',
  version: SDK_VERSION,
  description: 'PersonalLog Plugin SDK',
  homepage: 'https://github.com/SuperInstance/PersonalLog',
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a plugin manifest with sensible defaults
 *
 * @param id - Plugin ID
 * @param name - Plugin name
 * @param description - Plugin description
 * @returns Plugin manifest builder
 *
 * @example
 * ```typescript
 * import { createPluginManifest } from '@personallog/sdk';
 *
 * const manifest = createPluginManifest('my-plugin', 'My Plugin', 'Does something cool')
 *   .setVersion('1.0.0')
 *   .setAuthor('Your Name')
 *   .setCapabilities({ ui: true })
 *   .build();
 * ```
 */
export function createPluginManifest(id: string, name: string, description: string) {
  const { createManifestBuilder } = require('./validation');
  return createManifestBuilder()
    .setId(id)
    .setName(name)
    .setDescription(description)
    .setVersion('1.0.0')
    .setAuthor('Unknown');
}

/**
 * Validate a plugin at runtime
 *
 * @param PluginClass - Plugin class to validate
 * @returns true if valid, throws if not
 *
 * @example
 * ```typescript
 * import { validatePlugin } from '@personallog/sdk';
 *
 * class MyPlugin extends Plugin {
 *   // ...
 * }
 *
 * if (validatePlugin(MyPlugin)) {
 *   console.log('Plugin is valid!');
 * }
 * ```
 */
export function validatePlugin(PluginClass: any): boolean {
  const { validatePluginClass, assertValidManifest } = require('./validation');

  // Validate class structure
  const classResult = validatePluginClass(PluginClass);
  if (!classResult.valid) {
    throw new Error(`Plugin class validation failed:\n${classResult.errors.map(e => `  - ${e.field}: ${e.message}`).join('\n')}`);
  }

  // Validate manifest
  if (PluginClass.prototype.manifest) {
    try {
      assertValidManifest(PluginClass.prototype.manifest);
    } catch (error) {
      throw new Error(`Plugin manifest validation failed: ${error}`);
    }
  }

  return true;
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  Plugin,
  SDK_VERSION,
  SDK_INFO,
  createPluginManifest,
  validatePlugin,
};
