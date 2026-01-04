/**
 * Plugin System - Core Types
 *
 * Complete type definitions for the PersonalLog plugin system.
 * Supports multiple plugin types with security, lifecycle, and extensibility.
 *
 * @module lib/plugin/types
 */

// ============================================================================
// PLUGIN IDENTIFICATION
// ============================================================================

/**
 * Unique plugin identifier (format: vendor-name.plugin-name)
 */
export type PluginId = string & { readonly __brand: unique symbol };

/**
 * Plugin version (semver format)
 */
export type PluginVersion = string;

/**
 * PersonalLog version requirement (semver range)
 */
export type VersionRequirement = string;

// ============================================================================
// PLUGIN TYPES
// ============================================================================

/**
 * Supported plugin types
 */
export enum PluginType {
  /** Custom UI components, views, buttons */
  UI = 'ui',

  /** Custom data sources, transformers, processors */
  DATA = 'data',

  /** Custom AI providers, processors, routers */
  AI = 'ai',

  /** Custom export formats, destinations */
  EXPORT = 'export',

  /** Custom import sources, parsers */
  IMPORT = 'import',

  /** Custom analytics metrics, visualizations, aggregators */
  ANALYTICS = 'analytics',

  /** Custom workflows, triggers, automations */
  AUTOMATION = 'automation',

  /** Custom themes, styling, visual appearance */
  THEME = 'theme',

  /** Complete feature packs with multiple extensions */
  FEATURE_PACK = 'feature-pack',
}

/**
 * Plugin type-specific configuration
 */
export interface PluginTypeConfig {
  /** UI plugin configuration */
  ui?: {
    /** Custom components to register */
    components?: UIComponentDefinition[];
    /** Custom views/pages */
    views?: UIViewDefinition[];
    /** Custom toolbar buttons */
    toolbarButtons?: ToolbarButtonDefinition[];
    /** Custom sidebar items */
    sidebarItems?: SidebarItemDefinition[];
  };

  /** Data plugin configuration */
  data?: {
    /** Custom data sources */
    sources?: DataSourceDefinition[];
    /** Data transformers */
    transformers?: DataTransformerDefinition[];
    /** Data validators */
    validators?: DataValidatorDefinition[];
  };

  /** AI plugin configuration */
  ai?: {
    /** Custom AI providers */
    providers?: AIProviderDefinition[];
    /** Message processors */
    processors?: MessageProcessorDefinition[];
    /** Custom routing logic */
    routers?: AIRouterDefinition[];
  };

  /** Export plugin configuration */
  export?: {
    /** Export format handlers */
    formats?: ExportFormatDefinition[];
    /** Export destinations */
    destinations?: ExportDestinationDefinition[];
  };

  /** Import plugin configuration */
  import?: {
    /** Import source handlers */
    sources?: ImportSourceDefinition[];
    /** Import format parsers */
    parsers?: ImportParserDefinition[];
  };

  /** Analytics plugin configuration */
  analytics?: {
    /** Custom metrics */
    metrics?: AnalyticsMetricDefinition[];
    /** Custom aggregations */
    aggregations?: AnalyticsAggregationDefinition[];
    /** Custom visualizations */
    visualizations?: AnalyticsVisualizationDefinition[];
  };

  /** Automation plugin configuration */
  automation?: {
    /** Custom workflows */
    workflows?: WorkflowDefinition[];
    /** Custom triggers */
    triggers?: TriggerDefinition[];
    /** Custom actions */
    actions?: ActionDefinition[];
  };

  /** Theme plugin configuration */
  theme?: {
    /** Theme definitions */
    themes?: ThemeDefinition[];
    /** Theme variables */
    variables?: Record<string, string>;
  };

  /** Feature pack configuration */
  featurePack?: {
    /** Bundled plugin IDs */
    plugins?: PluginId[];
    /** Orchestrated features */
    features?: FeatureDefinition[];
  };
}

// ============================================================================
// UI COMPONENT DEFINITIONS
// ============================================================================

/**
 * UI component definition
 */
export interface UIComponentDefinition {
  /** Component ID */
  id: string;

  /** Component name */
  name: string;

  /** Component description */
  description?: string;

  /** Component category */
  category: 'message' | 'conversation' | 'sidebar' | 'header' | 'footer' | 'custom';

  /** Component render function (serialized) */
  render: string;

  /** Component props schema */
  props?: Record<string, PropSchema>;

  /** Required permissions */
  permissions?: Permission[];
}

/**
 * UI view definition
 */
export interface UIViewDefinition {
  /** View ID */
  id: string;

  /** View name */
  name: string;

  /** View path (e.g., /plugins/my-view) */
  path: string;

  /** View description */
  description?: string;

  /** View icon (lucide icon name) */
  icon?: string;

  /** View render function (serialized) */
  render: string;

  /** Required permissions */
  permissions?: Permission[];
}

/**
 * Toolbar button definition
 */
export interface ToolbarButtonDefinition {
  /** Button ID */
  id: string;

  /** Button label */
  label: string;

  /** Button icon (lucide icon name) */
  icon?: string;

  /** Button position */
  position: 'primary' | 'secondary';

  /** Button action handler (serialized) */
  onClick: string;

  /** Required permissions */
  permissions?: Permission[];
}

/**
 * Sidebar item definition
 */
export interface SidebarItemDefinition {
  /** Item ID */
  id: string;

  /** Item label */
  label: string;

  /** Item icon (lucide icon name) */
  icon?: string;

  /** Item path */
  path: string;

  /** Required permissions */
  permissions?: Permission[];
}

/**
 * Property schema for UI components
 */
export interface PropSchema {
  /** Prop type */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'function';

  /** Required flag */
  required?: boolean;

  /** Default value */
  default?: any;

  /** Description */
  description?: string;

  /** Validation constraints */
  constraints?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

// ============================================================================
// DATA DEFINITIONS
// ============================================================================

/**
 * Data source definition
 */
export interface DataSourceDefinition {
  /** Source ID */
  id: string;

  /** Source name */
  name: string;

  /** Source description */
  description?: string;

  /** Source type */
  type: 'api' | 'database' | 'file' | 'stream' | 'custom';

  /** Connection config schema */
  configSchema?: Record<string, any>;

  /** Fetch function (serialized) */
  fetch: string;

  /** Required permissions */
  permissions?: Permission[];
}

/**
 * Data transformer definition
 */
export interface DataTransformerDefinition {
  /** Transformer ID */
  id: string;

  /** Transformer name */
  name: string;

  /** Transformer description */
  description?: string;

  /** Input schema */
  inputSchema: Record<string, any>;

  /** Output schema */
  outputSchema: Record<string, any>;

  /** Transform function (serialized) */
  transform: string;

  /** Required permissions */
  permissions?: Permission[];
}

/**
 * Data validator definition
 */
export interface DataValidatorDefinition {
  /** Validator ID */
  id: string;

  /** Validator name */
  name: string;

  /** Validator description */
  description?: string;

  /** Validation schema */
  schema: Record<string, any>;

  /** Validate function (serialized) */
  validate: string;

  /** Required permissions */
  permissions?: Permission[];
}

// ============================================================================
// AI DEFINITIONS
// ============================================================================

/**
 * AI provider definition
 */
export interface AIProviderDefinition {
  /** Provider ID */
  id: string;

  /** Provider name */
  name: string;

  /** Provider description */
  description?: string;

  /** Provider type */
  type: 'completion' | 'chat' | 'embedding' | 'image' | 'multimodal';

  /** Model configuration */
  models?: ModelDefinition[];

  /** Configuration schema */
  configSchema?: Record<string, any>;

  /** Generate function (serialized) */
  generate: string;

  /** Required permissions */
  permissions?: Permission[];
}

/**
 * Model definition
 */
export interface ModelDefinition {
  /** Model ID */
  id: string;

  /** Model name */
  name: string;

  /** Model capabilities */
  capabilities: string[];

  /** Model parameters */
  parameters?: Record<string, any>;
}

/**
 * Message processor definition
 */
export interface MessageProcessorDefinition {
  /** Processor ID */
  id: string;

  /** Processor name */
  name: string;

  /** Processor description */
  description?: string;

  /** Process function (serialized) */
  process: string;

  /** Required permissions */
  permissions?: Permission[];
}

/**
 * AI router definition
 */
export interface AIRouterDefinition {
  /** Router ID */
  id: string;

  /** Router name */
  name: string;

  /** Router description */
  description?: string;

  /** Route function (serialized) */
  route: string;

  /** Required permissions */
  permissions?: Permission[];
}

// ============================================================================
// EXPORT/IMPORT DEFINITIONS
// ============================================================================

/**
 * Export format definition
 */
export interface ExportFormatDefinition {
  /** Format ID */
  id: string;

  /** Format name */
  name: string;

  /** Format extension */
  extension: string;

  /** MIME type */
  mimeType: string;

  /** Export function (serialized) */
  export: string;

  /** Required permissions */
  permissions?: Permission[];
}

/**
 * Export destination definition
 */
export interface ExportDestinationDefinition {
  /** Destination ID */
  id: string;

  /** Destination name */
  name: string;

  /** Destination description */
  description?: string;

  /** Destination type */
  type: 'filesystem' | 'cloud' | 'api' | 'custom';

  /** Upload function (serialized) */
  upload: string;

  /** Configuration schema */
  configSchema?: Record<string, any>;

  /** Required permissions */
  permissions?: Permission[];
}

/**
 * Import source definition
 */
export interface ImportSourceDefinition {
  /** Source ID */
  id: string;

  /** Source name */
  name: string;

  /** Source description */
  description?: string;

  /** Source type */
  type: 'filesystem' | 'cloud' | 'api' | 'custom';

  /** Fetch function (serialized) */
  fetch: string;

  /** Configuration schema */
  configSchema?: Record<string, any>;

  /** Required permissions */
  permissions?: Permission[];
}

/**
 * Import parser definition
 */
export interface ImportParserDefinition {
  /** Parser ID */
  id: string;

  /** Parser name */
  name: string;

  /** Parser description */
  description?: string;

  /** Supported formats */
  formats: string[];

  /** Parse function (serialized) */
  parse: string;

  /** Required permissions */
  permissions?: Permission[];
}

// ============================================================================
// ANALYTICS DEFINITIONS
// ============================================================================

/**
 * Analytics metric definition
 */
export interface AnalyticsMetricDefinition {
  /** Metric ID */
  id: string;

  /** Metric name */
  name: string;

  /** Metric description */
  description?: string;

  /** Metric type */
  type: 'counter' | 'gauge' | 'histogram' | 'summary';

  /** Metric value type */
  valueType: 'number' | 'string' | 'boolean';

  /** Collection function (serialized) */
  collect: string;

  /** Required permissions */
  permissions?: Permission[];
}

/**
 * Analytics aggregation definition
 */
export interface AnalyticsAggregationDefinition {
  /** Aggregation ID */
  id: string;

  /** Aggregation name */
  name: string;

  /** Aggregation description */
  description?: string;

  /** Aggregation type */
  type: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'percentile' | 'custom';

  /** Aggregate function (serialized) */
  aggregate: string;

  /** Required permissions */
  permissions?: Permission[];
}

/**
 * Analytics visualization definition
 */
export interface AnalyticsVisualizationDefinition {
  /** Visualization ID */
  id: string;

  /** Visualization name */
  name: string;

  /** Visualization description */
  description?: string;

  /** Visualization type */
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'custom';

  /** Render function (serialized) */
  render: string;

  /** Required permissions */
  permissions?: Permission[];
}

// ============================================================================
// AUTOMATION DEFINITIONS
// ============================================================================

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  /** Workflow ID */
  id: string;

  /** Workflow name */
  name: string;

  /** Workflow description */
  description?: string;

  /** Workflow triggers */
  triggers: string[];

  /** Workflow steps */
  steps: WorkflowStep[];

  /** Required permissions */
  permissions?: Permission[];
}

/**
 * Workflow step
 */
export interface WorkflowStep {
  /** Step ID */
  id: string;

  /** Step name */
  name: string;

  /** Step action */
  action: string;

  /** Step parameters */
  parameters?: Record<string, any>;

  /** Step condition */
  condition?: string;
}

/**
 * Trigger definition
 */
export interface TriggerDefinition {
  /** Trigger ID */
  id: string;

  /** Trigger name */
  name: string;

  /** Trigger description */
  description?: string;

  /** Trigger type */
  type: 'event' | 'schedule' | 'condition' | 'manual' | 'custom';

  /** Trigger config */
  config?: Record<string, any>;

  /** Evaluate function (serialized) */
  evaluate: string;

  /** Required permissions */
  permissions?: Permission[];
}

/**
 * Action definition
 */
export interface ActionDefinition {
  /** Action ID */
  id: string;

  /** Action name */
  name: string;

  /** Action description */
  description?: string;

  /** Execute function (serialized) */
  execute: string;

  /** Required permissions */
  permissions?: Permission[];
}

// ============================================================================
// THEME DEFINITIONS
// ============================================================================

/**
 * Theme definition
 */
export interface ThemeDefinition {
  /** Theme ID */
  id: string;

  /** Theme name */
  name: string;

  /** Theme description */
  description?: string;

  /** Theme type */
  type: 'light' | 'dark' | 'custom';

  /** Theme colors */
  colors: Record<string, string>;

  /** Theme fonts */
  fonts?: Record<string, string>;

  /** Theme spacing */
  spacing?: Record<string, string>;

  /** Theme breakpoints */
  breakpoints?: Record<string, string>;

  /** Required permissions */
  permissions?: Permission[];
}

/**
 * Feature definition
 */
export interface FeatureDefinition {
  /** Feature ID */
  id: string;

  /** Feature name */
  name: string;

  /** Feature description */
  description?: string;

  /** Feature type */
  type: string;

  /** Feature configuration */
  config: Record<string, any>;

  /** Required permissions */
  permissions?: Permission[];
}

// ============================================================================
// PERMISSIONS
// ============================================================================

/**
 * Plugin permissions
 */
export enum Permission {
  // Core permissions
  READ_CONVERSATIONS = 'conversations:read',
  WRITE_CONVERSATIONS = 'conversations:write',
  DELETE_CONVERSATIONS = 'conversations:delete',

  READ_MESSAGES = 'messages:read',
  WRITE_MESSAGES = 'messages:write',
  DELETE_MESSAGES = 'messages:delete',

  READ_KNOWLEDGE = 'knowledge:read',
  WRITE_KNOWLEDGE = 'knowledge:write',
  DELETE_KNOWLEDGE = 'knowledge:delete',

  READ_CONTACTS = 'contacts:read',
  WRITE_CONTACTS = 'contacts:write',
  DELETE_CONTACTS = 'contacts:delete',

  // Analytics permissions
  READ_ANALYTICS = 'analytics:read',
  WRITE_ANALYTICS = 'analytics:write',

  // Settings permissions
  READ_SETTINGS = 'settings:read',
  WRITE_SETTINGS = 'settings:write',

  // Network permissions
  NETWORK_REQUEST = 'network:request',

  // Storage permissions
  READ_STORAGE = 'storage:read',
  WRITE_STORAGE = 'storage:write',

  // UI permissions
  MODIFY_UI = 'ui:modify',
  SHOW_NOTIFICATIONS = 'notifications:show',

  // System permissions
  READ_SYSTEM = 'system:read',
  EXECUTE_CODE = 'code:execute',
}

/**
 * Permission scope
 */
export interface PermissionScope {
  /** Permission */
  permission: Permission;

  /** Allowed resources (empty = all) */
  resources: string[];

  /** Constraints */
  constraints?: Record<string, any>;
}

// ============================================================================
// PLUGIN MANIFEST
// ============================================================================

/**
 * Plugin manifest - describes plugin metadata and capabilities
 */
export interface PluginManifest {
  /** Unique plugin identifier */
  id: PluginId;

  /** Plugin name */
  name: string;

  /** Plugin description */
  description: string;

  /** Plugin version */
  version: PluginVersion;

  /** Minimum PersonalLog version required */
  minAppVersion: VersionRequirement;

  /** Maximum PersonalLog version supported (optional) */
  maxAppVersion?: VersionRequirement;

  /** Plugin author */
  author: {
    /** Author name */
    name: string;

    /** Author email */
    email?: string;

    /** Author website */
    website?: string;
  };

  /** Plugin license */
  license: string;

  /** Plugin homepage */
  homepage?: string;

  /** Plugin repository */
  repository?: string;

  /** Plugin bugs/issue tracker */
  bugs?: string;

  /** Plugin type(s) */
  type: PluginType[];

  /** Plugin keywords */
  keywords: string[];

  /** Plugin categories */
  categories: string[];

  /** Plugin icon (base64 or URL) */
  icon?: string;

  /** Plugin screenshots */
  screenshots?: string[];

  /** Required permissions */
  permissions: Permission[];

  /** Optional permissions (requested at runtime) */
  optionalPermissions?: Permission[];

  /** Plugin type-specific configuration */
  config?: PluginTypeConfig;

  /** Plugin dependencies */
  dependencies?: PluginDependency[];

  /** Resource limits */
  resourceLimits?: ResourceLimits;

  /** Plugin settings schema */
  settingsSchema?: Record<string, SettingSchema>;

  /** Default settings */
  defaultSettings?: Record<string, any>;

  /** Plugin entry points */
  entryPoints?: {
    /** Main entry point */
    main?: string;

    /** Background worker */
    worker?: string;

    /** Content script */
    content?: string;
  };

  /** Contribution points */
  contributes?: {
    /** Commands */
    commands?: CommandDefinition[];

    /** Menus */
    menus?: MenuDefinition[];

    /** Keybindings */
    keybindings?: KeybindingDefinition[];

    /** Languages */
    languages?: LanguageDefinition[];
  };
}

/**
 * Plugin dependency
 */
export interface PluginDependency {
  /** Plugin ID */
  id: PluginId;

  /** Version requirement */
  version: VersionRequirement;

  /** Required flag (error if not met) */
  required: boolean;
}

/**
 * Resource limits for plugin
 */
export interface ResourceLimits {
  /** Maximum CPU usage (%) */
  maxCpuPercent?: number;

  /** Maximum memory usage (MB) */
  maxMemoryMB?: number;

  /** Maximum storage usage (MB) */
  maxStorageMB?: number;

  /** Maximum network requests per minute */
  maxNetworkRequestsPerMinute?: number;

  /** Maximum execution time (ms) */
  maxExecutionTime?: number;

  /** Maximum file size (MB) */
  maxFileSizeMB?: number;
}

/**
 * Setting schema
 */
export interface SettingSchema {
  /** Setting type */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'enum';

  /** Setting label */
  label: string;

  /** Setting description */
  description?: string;

  /** Required flag */
  required?: boolean;

  /** Default value */
  default?: any;

  /** Enum options (for enum type) */
  options?: Array<{ value: any; label: string }>;

  /** Validation constraints */
  constraints?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

/**
 * Command definition
 */
export interface CommandDefinition {
  /** Command ID */
  id: string;

  /** Command title */
  title: string;

  /** Command description */
  description?: string;

  /** Command handler (serialized) */
  handler: string;

  /** Required permissions */
  permissions?: Permission[];
}

/**
 * Menu definition
 */
export interface MenuDefinition {
  /** Menu ID */
  id: string;

  /** Menu label */
  label: string;

  /** Menu position */
  position: 'app' | 'context' | 'editor';

  /** Menu items */
  items: MenuItemDefinition[];
}

/**
 * Menu item definition
 */
export interface MenuItemDefinition {
  /** Item ID */
  id: string;

  /** Item label */
  label: string;

  /** Item icon (lucide icon name) */
  icon?: string;

  /** Item action */
  action: string;

  /** Required permissions */
  permissions?: Permission[];
}

/**
 * Keybinding definition
 */
export interface KeybindingDefinition {
  /** Keybinding ID */
  id: string;

  /** Keybinding command */
  command: string;

  /** Keybinding keys */
  key: string;

  /** Keybinding context */
  context?: 'global' | 'editor' | 'terminal';
}

/**
 * Language definition
 */
export interface LanguageDefinition {
  /** Language ID */
  id: string;

  /** Language extensions */
  extensions: string[];

  /** Language aliases */
  aliases?: string[];

  /** Language configuration */
  config?: Record<string, any>;
}

// ============================================================================
// PLUGIN STATE
// ============================================================================

/**
 * Plugin lifecycle state
 */
export enum PluginState {
  /** Plugin is installed but not loaded */
  INSTALLED = 'installed',

  /** Plugin is loading */
  LOADING = 'loading',

  /** Plugin is loaded and active */
  ACTIVE = 'active',

  /** Plugin is deactivated but installed */
  INACTIVE = 'inactive',

  /** Plugin has errors */
  ERROR = 'error',

  /** Plugin is being uninstalled */
  UNINSTALLING = 'uninstalling',
}

/**
 * Plugin runtime state
 */
export interface PluginRuntimeState {
  /** Plugin ID */
  id: PluginId;

  /** Plugin state */
  state: PluginState;

  /** Plugin enabled flag */
  enabled: boolean;

  /** Plugin settings */
  settings: Record<string, any>;

  /** Granted permissions */
  grantedPermissions: Permission[];

  /** Plugin statistics */
  stats: PluginStats;

  /** Plugin errors */
  errors: PluginError[];

  /** Last activated timestamp */
  lastActivated?: number;

  /** Last deactivated timestamp */
  lastDeactivated?: number;

  /** Installation timestamp */
  installedAt: number;

  /** Update timestamp */
  updatedAt: number;
}

/**
 * Plugin statistics
 */
export interface PluginStats {
  /** Total activation count */
  activationCount: number;

  /** Total execution count */
  executionCount: number;

  /** Total error count */
  errorCount: number;

  /** Total CPU time (ms) */
  cpuTime: number;

  /** Peak memory usage (MB) */
  peakMemoryMB: number;

  /** Total network requests */
  networkRequests: number;

  /** Total storage used (MB) */
  storageUsedMB: number;

  /** Average execution time (ms) */
  avgExecutionTime: number;
}

/**
 * Plugin error
 */
export interface PluginError {
  /** Error ID */
  id: string;

  /** Error timestamp */
  timestamp: number;

  /** Error type */
  type: 'load' | 'runtime' | 'permission' | 'resource' | 'validation';

  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Error stack */
  stack?: string;

  /** Error context */
  context?: Record<string, any>;
}

// ============================================================================
// PLUGIN INSTALLATION
// ============================================================================

/**
 * Plugin source type
 */
export enum PluginSourceType {
  /** Local file */
  FILE = 'file',

  /** URL */
  URL = 'url',

  /** Marketplace */
  MARKETPLACE = 'marketplace',

  /** Built-in */
  BUILTIN = 'builtin',
}

/**
 * Plugin installation result
 */
export interface PluginInstallResult {
  /** Success flag */
  success: boolean;

  /** Plugin ID */
  pluginId?: PluginId;

  /** Error message */
  error?: string;

  /** Validation warnings */
  warnings?: string[];
}

/**
 * Plugin validation result
 */
export interface PluginValidationResult {
  /** Valid flag */
  valid: boolean;

  /** Validation errors */
  errors: ValidationError[];

  /** Validation warnings */
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Error field */
  field: string;

  /** Error message */
  message: string;

  /** Error code */
  code: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Warning field */
  field: string;

  /** Warning message */
  message: string;

  /** Warning code */
  code: string;
}

// ============================================================================
// PLUGIN API
// ============================================================================

/**
 * Plugin API context
 */
export interface PluginAPIContext {
  /** Plugin ID */
  pluginId: PluginId;

  /** Plugin version */
  version: PluginVersion;

  /** Granted permissions */
  permissions: Permission[];

  /** Plugin settings */
  settings: Record<string, any>;

  /** Logger */
  logger: PluginLogger;

  /** Storage */
  storage: PluginStorage;

  /** Event bus */
  events: PluginEventBus;
}

/**
 * Plugin logger
 */
export interface PluginLogger {
  /** Log debug message */
  debug(message: string, ...args: any[]): void;

  /** Log info message */
  info(message: string, ...args: any[]): void;

  /** Log warning */
  warn(message: string, ...args: any[]): void;

  /** Log error */
  error(message: string, ...args: any[]): void;
}

/**
 * Plugin storage
 */
export interface PluginStorage {
  /** Get item */
  get(key: string): Promise<any>;

  /** Set item */
  set(key: string, value: any): Promise<void>;

  /** Delete item */
  delete(key: string): Promise<void>;

  /** List keys */
  keys(): Promise<string[]>;

  /** Clear all */
  clear(): Promise<void>;
}

/**
 * Plugin event bus
 */
export interface PluginEventBus {
  /** Subscribe to event */
  on(event: string, handler: (...args: any[]) => void): void;

  /** Unsubscribe from event */
  off(event: string, handler: (...args: any[]) => void): void;

  /** Emit event */
  emit(event: string, ...args: any[]): void;
}

/**
 * Plugin activation context
 */
export interface PluginActivationContext extends PluginAPIContext {
  /** API surface */
  api: PluginAPISurface;
}

/**
 * Plugin API surface - exposed to plugins
 */
export interface PluginAPISurface {
  /** Version */
  version: string;

  /** Commands */
  commands: {
    register(command: CommandDefinition): void;
    execute(commandId: string, ...args: any[]): Promise<any>;
    unregister(commandId: string): void;
  };

  /** UI */
  ui: {
    registerComponent(component: UIComponentDefinition): void;
    registerView(view: UIViewDefinition): void;
    registerToolbarButton(button: ToolbarButtonDefinition): void;
    registerSidebarItem(item: SidebarItemDefinition): void;
  };

  /** Data */
  data: {
    registerSource(source: DataSourceDefinition): void;
    registerTransformer(transformer: DataTransformerDefinition): void;
    registerValidator(validator: DataValidatorDefinition): void;
  };

  /** Conversations */
  conversations: {
    list(): Promise<any[]>;
    get(id: string): Promise<any>;
    create(data: any): Promise<any>;
    update(id: string, data: any): Promise<void>;
    delete(id: string): Promise<void>;
  };

  /** Messages */
  messages: {
    list(conversationId: string): Promise<any[]>;
    get(id: string): Promise<any>;
    create(conversationId: string, data: any): Promise<any>;
    update(id: string, data: any): Promise<void>;
    delete(id: string): Promise<void>;
  };

  /** Knowledge */
  knowledge: {
    search(query: string, options?: any): Promise<any[]>;
    get(id: string): Promise<any>;
    create(data: any): Promise<any>;
    update(id: string, data: any): Promise<void>;
    delete(id: string): Promise<void>;
  };

  /** Analytics */
  analytics: {
    trackEvent(event: string, data?: any): Promise<void>;
    getMetrics(options?: any): Promise<any>;
    query(query: any): Promise<any>;
  };

  /** Settings */
  settings: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    getAll(): Promise<Record<string, any>>;
  };

  /** Storage */
  storage: PluginStorage;

  /** Events */
  events: PluginEventBus;

  /** Logger */
  logger: PluginLogger;
}

// ============================================================================
// PLUGIN LIFECYCLE HOOKS
// ============================================================================

/**
 * Plugin activation hook
 */
export type PluginActivateHook = (
  context: PluginActivationContext
) => Promise<void> | void;

/**
 * Plugin deactivation hook
 */
export type PluginDeactivateHook = (
  context: PluginAPIContext
) => Promise<void> | void;

/**
 * Plugin uninstall hook
 */
export type PluginUninstallHook = (
  context: PluginAPIContext
) => Promise<void> | void;

/**
 * Plugin settings change hook
 */
export type PluginSettingsChangeHook = (
  newSettings: Record<string, any>,
  oldSettings: Record<string, any>,
  context: PluginAPIContext
) => Promise<void> | void;

/**
 * Plugin lifecycle hooks
 */
export interface PluginHooks {
  /** Called when plugin is activated */
  onActivate?: PluginActivateHook;

  /** Called when plugin is deactivated */
  onDeactivate?: PluginDeactivateHook;

  /** Called when plugin is uninstalled */
  onUninstall?: PluginUninstallHook;

  /** Called when plugin settings change */
  onSettingsChange?: PluginSettingsChangeHook;
}

// ============================================================================
// SANDBOX
// ============================================================================

/**
 * Sandbox configuration
 */
export interface SandboxConfig {
  /** Plugin ID */
  pluginId: PluginId;

  /** Granted permissions */
  permissions: Permission[];

  /** Resource limits */
  resourceLimits: ResourceLimits;

  /** Sandbox timeout (ms) */
  timeout: number;
}

/**
 * Sandbox execution result
 */
export interface SandboxResult<T = any> {
  /** Success flag */
  success: boolean;

  /** Result data */
  data?: T;

  /** Error message */
  error?: string;

  /** Execution time (ms) */
  executionTime: number;

  /** Memory used (MB) */
  memoryUsed: number;
}

// ============================================================================
// EVENTS
// ============================================================================

/**
 * Plugin event types
 */
export enum PluginEventType {
  /** Plugin installed */
  INSTALLED = 'plugin.installed',

  /** Plugin uninstalled */
  UNINSTALLED = 'plugin.uninstalled',

  /** Plugin activated */
  ACTIVATED = 'plugin.activated',

  /** Plugin deactivated */
  DEACTIVATED = 'plugin.deactivated',

  /** Plugin updated */
  UPDATED = 'plugin.updated',

  /** Plugin error */
  ERROR = 'plugin.error',

  /** Plugin settings changed */
  SETTINGS_CHANGED = 'plugin.settings_changed',
}

/**
 * Plugin event
 */
export interface PluginEvent {
  /** Event type */
  type: PluginEventType;

  /** Plugin ID */
  pluginId: PluginId;

  /** Event timestamp */
  timestamp: number;

  /** Event data */
  data?: any;
}

/**
 * Plugin event listener
 */
export type PluginEventListener = (event: PluginEvent) => void;
