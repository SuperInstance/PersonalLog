/**
 * PersonalLog Plugin SDK - Type Definitions
 *
 * This module contains all TypeScript types and interfaces for plugin development.
 * Provides comprehensive type safety for plugin creators.
 *
 * @packageDocumentation
 */

import type { Conversation, Message, AIAgent } from '@/types/conversation';

// ============================================================================
// PLUGIN METADATA
// ============================================================================

/**
 * Plugin manifest metadata
 *
 * Required metadata that identifies the plugin and its capabilities.
 */
export interface PluginManifest {
  /** Unique plugin identifier (e.g., 'my-plugin' or '@scope/my-plugin') */
  id: string;

  /** Human-readable plugin name */
  name: string;

  /** Brief description of what the plugin does */
  description: string;

  /** Plugin version (semantic versioning) */
  version: string;

  /** Plugin author information */
  author: string | PluginAuthor;

  /** Minimum PersonalLog version required */
  minAppVersion?: string;

  /** Maximum PersonalLog version supported (optional) */
  maxAppVersion?: string;

  /** Plugin homepage URL */
  homepage?: string;

  /** Plugin repository URL */
  repository?: string;

  /** SPDX license identifier */
  license?: string;

  /** Keywords for plugin discovery */
  keywords?: string[];

  /** Plugin capabilities and permissions */
  capabilities: PluginCapabilities;

  /** Plugin entry points */
  entryPoints: PluginEntryPoints;

  /** Plugin dependencies (optional) */
  dependencies?: PluginDependency[];

  /** Icon for the plugin (base64 or URL) */
  icon?: string;
}

/**
 * Detailed plugin author information
 */
export interface PluginAuthor {
  /** Author name */
  name: string;

  /** Author email */
  email?: string;

  /** Author website */
  url?: string;
}

/**
 * Plugin capabilities and permissions
 *
 * Defines what the plugin can access and modify.
 */
export interface PluginCapabilities {
  /** Can access conversations */
  conversations?: boolean | ConversationCapability;

  /** Can access knowledge base */
  knowledge?: boolean | KnowledgeCapability;

  /** Can access AI providers */
  ai?: boolean | AICapability;

  /** Can access user settings */
  settings?: boolean;

  /** Can add UI elements */
  ui?: boolean | UICapability;

  /** Can make network requests */
  network?: boolean | NetworkCapability;

  /** Can access plugin storage */
  storage?: boolean | StorageCapability;

  /** Can export/import data */
  export?: boolean | ExportCapability;

  /** Custom permissions */
  custom?: Record<string, boolean | string>;
}

/**
 * Conversation access permissions
 */
export interface ConversationCapability {
  /** Can read conversations */
  read?: boolean;

  /** Can create conversations */
  create?: boolean;

  /** Can update conversations */
  update?: boolean;

  /** Can delete conversations */
  delete?: boolean;

  /** Can access specific conversations only */
  scope?: 'all' | 'user' | string[];
}

/**
 * Knowledge base access permissions
 */
export interface KnowledgeCapability {
  /** Can read knowledge entries */
  read?: boolean;

  /** Can add knowledge entries */
  add?: boolean;

  /** Can update knowledge entries */
  update?: boolean;

  /** Can delete knowledge entries */
  delete?: boolean;

  /** Can perform vector searches */
  search?: boolean;
}

/**
 * AI provider access permissions
 */
export interface AICapability {
  /** Can use AI providers */
  use?: boolean;

  /** Can create custom AI providers */
  createProvider?: boolean;

  /** Can access specific providers */
  providers?: string[];
}

/**
 * UI extension permissions
 */
export interface UICapability {
  /** Can add menu items */
  menu?: boolean;

  /** Can add sidebar items */
  sidebar?: boolean;

  /** Can add toolbar items */
  toolbar?: boolean;

  /** Can show modals/dialogs */
  modal?: boolean;

  /** Can inject custom components */
  components?: boolean;

  /** Can create custom views/pages */
  views?: boolean;
}

/**
 * Network access permissions
 */
export interface NetworkCapability {
  /** Can make HTTP requests */
  http?: boolean;

  /** Allowed domains (if restricted) */
  domains?: string[];

  /** Rate limit (requests per minute) */
  rateLimit?: number;
}

/**
 * Storage access permissions
 */
export interface StorageCapability {
  /** Maximum storage quota in bytes */
  quota?: number;

  /** Can store files */
  files?: boolean;

  /** Maximum file size in bytes */
  maxFileSize?: number;
}

/**
 * Export/import permissions
 */
export interface ExportCapability {
  /** Can export data */
  export?: boolean;

  /** Can import data */
  import?: boolean;

  /** Supported formats */
  formats?: string[];
}

/**
 * Plugin entry points
 *
 * Defines which features the plugin implements.
 */
export interface PluginEntryPoints {
  /** Main plugin class */
  plugin?: string;

  /** AI provider (if applicable) */
  aiProvider?: string;

  /** Export format handler (if applicable) */
  exportFormat?: string;

  /** Import format handler (if applicable) */
  importFormat?: string;

  /** UI extensions (if applicable) */
  ui?: UIExtensionPoints;
}

/**
 * UI extension points
 */
export interface UIExtensionPoints {
  /** Menu items to add */
  menuItems?: MenuItemDefinition[];

  /** Sidebar items to add */
  sidebarItems?: SidebarItemDefinition[];

  /** Custom views */
  views?: ViewDefinition[];

  /** Custom components */
  components?: ComponentDefinition[];
}

/**
 * Plugin dependency
 */
export interface PluginDependency {
  /** Plugin ID */
  id: string;

  /** Minimum version required */
  version?: string;

  /** Whether this is a peer dependency (optional) */
  peer?: boolean;
}

// ============================================================================
// UI EXTENSION TYPES
// ============================================================================

/**
 * Menu item definition
 */
export interface MenuItemDefinition {
  /** Unique item ID */
  id: string;

  /** Display label */
  label: string;

  /** Icon (Lucide icon name or custom component) */
  icon?: string;

  /** Parent menu ID (for nested items) */
  parent?: string;

  /** Menu location */
  location: 'main' | 'settings' | 'context';

  /** Sort order */
  order?: number;

  /** Keyboard shortcut */
  shortcut?: string;

  /** Action handler */
  action: string; // Method name on plugin class
}

/**
 * Sidebar item definition
 */
export interface SidebarItemDefinition {
  /** Unique item ID */
  id: string;

  /** Display label */
  label: string;

  /** Icon */
  icon?: string;

  /** Route path */
  path: string;

  /** Sort order */
  order?: number;

  /** Badge count (optional) */
  badge?: string | number;
}

/**
 * Custom view definition
 */
export interface ViewDefinition {
  /** Unique view ID */
  id: string;

  /** View title */
  title: string;

  /** Route path */
  path: string;

  /** View component */
  component: string;

  /** Layout type */
  layout?: 'default' | 'fullscreen' | 'sidebar';
}

/**
 * Custom component definition
 */
export interface ComponentDefinition {
  /** Component ID */
  id: string;

  /** Component location */
  location: 'conversation-header' | 'message-footer' | 'settings-panel' | 'custom';

  /** Component type */
  type: 'react' | 'web-component';

  /** Component implementation */
  component: any; // React component or Web Component constructor

  /** Props to pass to component */
  props?: Record<string, any>;
}

// ============================================================================
// PLUGIN STATE
// ============================================================================

/**
 * Plugin runtime state
 */
export interface PluginState {
  /** Plugin manifest */
  manifest: PluginManifest;

  /** Whether plugin is enabled */
  enabled: boolean;

  /** Plugin instance */
  instance?: Plugin;

  /** Plugin settings */
  settings: Record<string, any>;

  /** Current resource usage */
  resources: PluginResources;

  /** Plugin status */
  status: PluginStatus;

  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Plugin status
 */
export type PluginStatus =
  | 'unloaded'
  | 'loading'
  | 'loaded'
  | 'active'
  | 'inactive'
  | 'error';

/**
 * Plugin resource usage
 */
export interface PluginResources {
  /** Memory usage in bytes */
  memory: number;

  /** CPU usage percentage */
  cpu: number;

  /** Storage usage in bytes */
  storage: number;

  /** Network usage in bytes */
  network: number;

  /** Last update timestamp */
  lastUpdate: Date;
}

// ============================================================================
// PLUGIN CONTEXT
// ============================================================================

/**
 * Plugin context provided to plugins
 *
 * Contains APIs and utilities that plugins can use.
 */
export interface PluginContext {
  /** Plugin manifest */
  manifest: PluginManifest;

  /** Plugin settings */
  settings: PluginSettings;

  /** Data access APIs */
  data: DataAPI;

  /** UI extension APIs */
  ui: UIAPI;

  /** AI provider APIs */
  ai: AIAPI;

  /** Event system */
  events: EventAPI;

  /** Storage API */
  storage: StorageAPI;

  /** Network API */
  network: NetworkAPI;

  /** Export/import APIs */
  export: ExportAPI;

  /** Logger */
  logger: Logger;

  /** Utilities */
  utils: UtilsAPI;
}

/**
 * Plugin settings API
 */
export interface PluginSettings {
  /** Get a setting value */
  get<T = any>(key: string, defaultValue?: T): T | undefined;

  /** Set a setting value */
  set<T = any>(key: string, value: T): Promise<void>;

  /** Get all settings */
  getAll(): Record<string, any>;

  /** Watch for setting changes */
  onChange(callback: (key: string, value: any) => void): () => void;
}

// ============================================================================
// DATA API
// ============================================================================

/**
 * Data access API
 *
 * Provides access to conversations, knowledge, and other data.
 */
export interface DataAPI {
  /** Conversation operations */
  conversations: ConversationAPI;

  /** Knowledge base operations */
  knowledge: KnowledgeAPI;

  /** Settings operations */
  settings: SettingsAPI;
}

/**
 * Conversation API
 */
export interface ConversationAPI {
  /** Get a conversation by ID */
  get(id: string): Promise<Conversation | null>;

  /** List conversations with optional filters */
  list(options?: ConversationListOptions): Promise<Conversation[]>;

  /** Create a new conversation */
  create(data: CreateConversationData): Promise<Conversation>;

  /** Update a conversation */
  update(id: string, data: UpdateConversationData): Promise<Conversation>;

  /** Delete a conversation */
  delete(id: string): Promise<void>;

  /** Search conversations */
  search(query: string): Promise<Conversation[]>;

  /** Watch for conversation changes */
  onChange(callback: ConversationChangeCallback): () => void;
}

/**
 * Conversation list options
 */
export interface ConversationListOptions {
  /** Include archived conversations */
  includeArchived?: boolean;

  /** Limit results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Filter by type */
  type?: string;

  /** Filter by tags */
  tags?: string[];
}

/**
 * Create conversation data
 */
export interface CreateConversationData {
  title: string;
  type?: Conversation['type'];
  settings?: Partial<Conversation['settings']>;
}

/**
 * Update conversation data
 */
export interface UpdateConversationData {
  title?: string;
  settings?: Partial<Conversation['settings']>;
  metadata?: Partial<Conversation['metadata']>;
}

/**
 * Conversation change callback
 */
export type ConversationChangeCallback = (
  type: 'created' | 'updated' | 'deleted',
  conversation: Conversation | string
) => void;

/**
 * Knowledge API
 */
export interface KnowledgeAPI {
  /** Search knowledge base */
  search(query: string, options?: KnowledgeSearchOptions): Promise<KnowledgeEntry[]>;

  /** Get a knowledge entry by ID */
  get(id: string): Promise<KnowledgeEntry | null>;

  /** Add a knowledge entry */
  add(entry: AddKnowledgeEntry): Promise<KnowledgeEntry>;

  /** Update a knowledge entry */
  update(id: string, data: Partial<KnowledgeEntry>): Promise<KnowledgeEntry>;

  /** Delete a knowledge entry */
  delete(id: string): Promise<void>;

  /** List all knowledge entries */
  list(options?: KnowledgeListOptions): Promise<KnowledgeEntry[]>;
}

/**
 * Knowledge entry
 */
export interface KnowledgeEntry {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Knowledge search options
 */
export interface KnowledgeSearchOptions {
  /** Limit results */
  limit?: number;

  /** Minimum similarity score (0-1) */
  threshold?: number;

  /** Filter by metadata */
  filter?: Record<string, any>;
}

/**
 * Add knowledge entry data
 */
export interface AddKnowledgeEntry {
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Knowledge list options
 */
export interface KnowledgeListOptions {
  /** Limit results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Filter by metadata */
  filter?: Record<string, any>;
}

/**
 * Settings API
 */
export interface SettingsAPI {
  /** Get a global setting */
  get<T = any>(key: string): T | undefined;

  /** Set a global setting */
  set<T = any>(key: string, value: T): Promise<void>;

  /** Get all settings */
  getAll(): Record<string, any>;

  /** Watch for setting changes */
  onChange(callback: (key: string, value: any) => void): () => void;
}

// ============================================================================
// UI API
// ============================================================================

/**
 * UI extension API
 *
 * Allows plugins to add UI elements.
 */
export interface UIAPI {
  /** Register a menu item */
  registerMenuItem(item: MenuItemDefinition): void;

  /** Unregister a menu item */
  unregisterMenuItem(id: string): void;

  /** Register a sidebar item */
  registerSidebarItem(item: SidebarItemDefinition): void;

  /** Unregister a sidebar item */
  unregisterSidebarItem(id: string): void;

  /** Register a custom view */
  registerView(view: ViewDefinition): void;

  /** Unregister a view */
  unregisterView(id: string): void;

  /** Show a modal/dialog */
  showModal(modal: ModalOptions): Promise<any>;

  /** Show a notification */
  showNotification(notification: NotificationOptions): void;

  /** Navigate to a route */
  navigate(path: string): void;
}

/**
 * Modal options
 */
export interface ModalOptions {
  /** Modal title */
  title: string;

  /** Modal content (React component) */
  content: any;

  /** Modal props */
  props?: Record<string, any>;

  /** Modal size */
  size?: 'small' | 'medium' | 'large' | 'fullscreen';

  /** Whether modal can be closed */
  closable?: boolean;
}

/**
 * Notification options
 */
export interface NotificationOptions {
  /** Notification message */
  message: string;

  /** Notification type */
  type?: 'info' | 'success' | 'warning' | 'error';

  /** Duration in milliseconds (0 = indefinite) */
  duration?: number;

  /** Action button */
  action?: {
    label: string;
    callback: () => void;
  };
}

// ============================================================================
// AI API
// ============================================================================

/**
 * AI provider API
 *
 * Allows plugins to interact with AI providers.
 */
export interface AIAPI {
  /** List available AI providers */
  listProviders(): AIProviderInfo[];

  /** Get a specific AI provider */
  getProvider(id: string): AIProviderInfo | null;

  /** Send a chat request */
  chat(request: ChatRequest): Promise<ChatResponse>;

  /** Stream a chat response */
  chatStream(request: ChatRequest): AsyncIterable<ChatStreamChunk>;

  /** Register a custom AI provider */
  registerProvider(provider: CustomAIProvider): void;

  /** Unregister a custom AI provider */
  unregisterProvider(id: string): void;
}

/**
 * AI provider information
 */
export interface AIProviderInfo {
  id: string;
  name: string;
  type: 'local' | 'cloud' | 'custom';
  capabilities: {
    streaming?: boolean;
    images?: boolean;
    files?: boolean;
    webSearch?: boolean;
  };
  models: AIModelInfo[];
}

/**
 * AI model information
 */
export interface AIModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  maxTokens?: number;
}

/**
 * Chat request
 */
export interface ChatRequest {
  /** Provider ID */
  providerId: string;

  /** Model ID */
  model: string;

  /** Conversation ID */
  conversationId: string;

  /** Messages to send */
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;

  /** Generation parameters */
  temperature?: number;
  maxTokens?: number;
}

/**
 * Chat response
 */
export interface ChatResponse {
  /** Response text */
  content: string;

  /** Model used */
  model: string;

  /** Token usage */
  tokens?: {
    input: number;
    output: number;
    total: number;
  };

  /** Finish reason */
  finishReason?: 'stop' | 'length' | 'error';

  /** Error if failed */
  error?: string;
}

/**
 * Chat stream chunk
 */
export interface ChatStreamChunk {
  /** Content delta */
  content?: string;

  /** Whether this is the last chunk */
  done?: boolean;

  /** Error if failed */
  error?: string;
}

/**
 * Custom AI provider
 */
export interface CustomAIProvider {
  /** Provider ID */
  id: string;

  /** Provider name */
  name: string;

  /** Provider type */
  type: 'local' | 'cloud';

  /** Available models */
  models: AIModelInfo[];

  /** Chat handler */
  chat: (request: ChatRequest) => Promise<ChatResponse>;

  /** Stream chat handler (optional) */
  chatStream?: (request: ChatRequest) => AsyncIterable<ChatStreamChunk>;
}

// ============================================================================
// EVENT API
// ============================================================================

/**
 * Event system API
 *
 * Allows plugins to subscribe to and emit events.
 */
export interface EventAPI {
  /** Subscribe to an event */
  on<T = any>(event: string, handler: (data: T) => void): () => void;

  /** Subscribe to an event once */
  once<T = any>(event: string, handler: (data: T) => void): () => void;

  /** Unsubscribe from an event */
  off(event: string, handler?: (data: any) => void): void;

  /** Emit an event */
  emit<T = any>(event: string, data: T): void;

  /** List all registered events */
  events(): string[];
}

// ============================================================================
// STORAGE API
// ============================================================================

/**
 * Storage API
 *
 * Provides plugin-specific storage.
 */
export interface StorageAPI {
  /** Get a value */
  get<T = any>(key: string): Promise<T | null>;

  /** Set a value */
  set<T = any>(key: string, value: T): Promise<void>;

  /** Delete a value */
  delete(key: string): Promise<void>;

  /** List all keys */
  keys(): Promise<string[]>;

  /** Clear all data */
  clear(): Promise<void>;

  /** Get storage size in bytes */
  getSize(): Promise<number>;

  /** Store a file */
  setFile(key: string, file: File | Blob): Promise<void>;

  /** Get a file */
  getFile(key: string): Promise<Blob | null>;

  /** Delete a file */
  deleteFile(key: string): Promise<void>;
}

// ============================================================================
// NETWORK API
// ============================================================================

/**
 * Network API
 *
 * Provides controlled HTTP access.
 */
export interface NetworkAPI {
  /** Make a GET request */
  get<T = any>(url: string, options?: RequestOptions): Promise<T>;

  /** Make a POST request */
  post<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T>;

  /** Make a PUT request */
  put<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T>;

  /** Make a DELETE request */
  delete<T = any>(url: string, options?: RequestOptions): Promise<T>;

  /** Make a PATCH request */
  patch<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T>;
}

/**
 * Request options
 */
export interface RequestOptions {
  /** Request headers */
  headers?: Record<string, string>;

  /** Query parameters */
  params?: Record<string, string | number>;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Request body (for POST/PUT/PATCH) */
  body?: any;

  /** Whether to cache the response */
  cache?: boolean;
}

// ============================================================================
// EXPORT API
// ============================================================================

/**
 * Export/import API
 *
 * Allows plugins to add custom export/import formats.
 */
export interface ExportAPI {
  /** Register an export format */
  registerExportFormat(format: ExportFormat): void;

  /** Register an import format */
  registerImportFormat(format: ImportFormat): void;

  /** Unregister an export format */
  unregisterExportFormat(id: string): void;

  /** Unregister an import format */
  unregisterImportFormat(id: string): void;

  /** Export data using a format */
  export(formatId: string, data: any): Promise<ExportResult>;

  /** Export data to file */
  exportToFile(formatId: string, data: any): Promise<void>;

  /** Import data using a format */
  import(formatId: string, data: any): Promise<ImportResult>;

  /** Import data from file */
  importFromFile(formatId: string, file: File): Promise<ImportResult>;

  /** Import from file with auto-detection */
  importFromFileAuto(file: File): Promise<ImportResult>;
}

/**
 * Export format
 */
export interface ExportFormat {
  /** Format ID */
  id: string;

  /** Format name */
  name: string;

  /** File extension */
  extension: string;

  /** MIME type */
  mimeType: string;

  /** Export handler */
  handler: (data: any) => Promise<ExportResult>;
}

/**
 * Import format
 */
export interface ImportFormat {
  /** Format ID */
  id: string;

  /** Format name */
  name: string;

  /** Supported file extensions */
  extensions: string[];

  /** Import handler */
  handler: (data: any) => Promise<ImportResult>;
}

/**
 * Export result
 */
export interface ExportResult {
  /** Exported data */
  data: any;

  /** File name */
  filename: string;

  /** MIME type */
  mimeType: string;
}

/**
 * Import result
 */
export interface ImportResult {
  /** Imported data */
  data: any;

  /** Number of items imported */
  count: number;

  /** Any warnings or errors */
  warnings?: string[];
}

// ============================================================================
// UTILITIES API
// ============================================================================

/**
 * Utilities API
 *
 * Provides helper functions.
 */
export interface UtilsAPI {
  /** Generate a unique ID */
  generateId(): string;

  /** Debounce a function */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void;

  /** Throttle a function */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void;

  /** Format a date */
  formatDate(date: Date, format?: string): string;

  /** Parse a date */
  parseDate(dateString: string): Date | null;

  /** Clone an object deeply */
  deepClone<T>(obj: T): T;

  /** Merge objects deeply */
  deepMerge<T extends Record<string, any>>(
    target: T,
    ...sources: Partial<T>[]
  ): T;
}

// ============================================================================
// LOGGER
// ============================================================================

/**
 * Plugin logger
 *
 * Provides logging utilities with context.
 */
export interface Logger {
  /** Log debug message */
  debug(message: string, ...args: any[]): void;

  /** Log info message */
  info(message: string, ...args: any[]): void;

  /** Log warning message */
  warn(message: string, ...args: any[]): void;

  /** Log error message */
  error(message: string, ...args: any[]): void;

  /** Create a child logger with additional context */
  child(context: Record<string, any>): Logger;
}

// ============================================================================
// PLUGIN LIFECYCLE
// ============================================================================

/**
 * Plugin lifecycle hooks
 *
 * Methods that plugins can implement to handle lifecycle events.
 */
export interface PluginLifecycle {
  /** Called when plugin is loaded */
  onLoad?(context: PluginContext): Promise<void> | void;

  /** Called when plugin is enabled */
  onEnable?(context: PluginContext): Promise<void> | void;

  /** Called when plugin is disabled */
  onDisable?(context: PluginContext): Promise<void> | void;

  /** Called when plugin is unloaded */
  onUnload?(context: PluginContext): Promise<void> | void;

  /** Called when app settings change */
  onSettingsChange?(key: string, value: any): Promise<void> | void;
}

// ============================================================================
// PLUGIN CLASS
// ============================================================================

/**
 * Base plugin class
 *
 * All plugins should extend this class.
 */
export abstract class Plugin implements PluginLifecycle {
  /** Plugin manifest */
  readonly manifest: PluginManifest;

  /** Plugin context (set by the app) */
  protected context?: PluginContext;

  constructor(manifest: PluginManifest) {
    this.manifest = manifest;
  }

  /** Get the plugin context (throws if not set) */
  protected getContext(): PluginContext {
    if (!this.context) {
      throw new Error('Plugin context not set. Plugin may not be properly initialized.');
    }
    return this.context;
  }
}
