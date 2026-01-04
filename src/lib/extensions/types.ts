/**
 * Extension System - Type Definitions
 *
 * Complete type system for PersonalLog extension points.
 * Extensions are "hooks" where plugins can attach functionality.
 *
 * @module lib/extensions/types
 */

// ============================================================================
// EXTENSION IDENTIFICATION
// ============================================================================

/**
 * Unique extension identifier (format: plugin-id.extension-name)
 */
export type ExtensionId = string & { readonly __brand: unique symbol };

/**
 * Extension priority for ordering
 */
export enum ExtensionPriority {
  /** Highest priority - runs first */
  CRITICAL = 0,
  /** High priority - runs early */
  HIGH = 10,
  /** Normal priority - default */
  NORMAL = 50,
  /** Low priority - runs late */
  LOW = 90,
  /** Lowest priority - runs last */
  FALLBACK = 100,
}

// ============================================================================
// EXTENSION POINTS
// ============================================================================

/**
 * Extension point types - places where extensions can attach
 */
export enum ExtensionPoint {
  // Command Extensions
  /** Custom commands for command palette */
  COMMAND = 'command',

  /** Keyboard shortcuts */
  KEYBINDING = 'keybinding',

  // Message Extensions
  /** Message transformations before display */
  MESSAGE_MIDDLEWARE = 'message.middleware',

  /** Message filters */
  MESSAGE_FILTER = 'message.filter',

  /** Message enrichers (add metadata) */
  MESSAGE_ENRICHER = 'message.enricher',

  // UI Extensions
  /** Sidebar panels */
  SIDEBAR_PANEL = 'ui.sidebar.panel',

  /** Menu items */
  MENU_ITEM = 'ui.menu.item',

  /** Toolbar buttons */
  TOOLBAR_BUTTON = 'ui.toolbar.button',

  /** Modal dialogs */
  MODAL_DIALOG = 'ui.modal.dialog',

  /** Status bar items */
  STATUS_BAR_ITEM = 'ui.status.item',

  /** Context menu items */
  CONTEXT_MENU_ITEM = 'ui.context.menu',

  // Data Extensions
  /** Custom export formats */
  EXPORT_FORMAT = 'data.export.format',

  /** Custom import sources */
  IMPORT_SOURCE = 'data.import.source',

  /** Data transformers */
  DATA_TRANSFORMER = 'data.transformer',

  /** Data validators */
  DATA_VALIDATOR = 'data.validator',

  // AI Extensions
  /** Custom AI providers */
  AI_PROVIDER = 'ai.provider',

  /** Message processors */
  MESSAGE_PROCESSOR = 'ai.message.processor',

  /** Response transformers */
  RESPONSE_TRANSFORMER = 'ai.response.transformer',

  // Analytics Extensions
  /** Custom metrics */
  ANALYTICS_METRIC = 'analytics.metric',

  /** Analytics aggregators */
  ANALYTICS_AGGREGATOR = 'analytics.aggregator',

  /** Analytics visualizations */
  ANALYTICS_VISUALIZATION = 'analytics.visualization',

  // Workflow Extensions
  /** Workflow triggers */
  WORKFLOW_TRIGGER = 'workflow.trigger',

  /** Workflow actions */
  WORKFLOW_ACTION = 'workflow.action',

  // Theme Extensions
  /** Custom themes */
  THEME = 'theme',
}

// ============================================================================
// EXTENSION DEFINITIONS
// ============================================================================

/**
 * Base extension definition
 */
export interface BaseExtension {
  /** Extension ID */
  id: ExtensionId;

  /** Extension name */
  name: string;

  /** Extension description */
  description?: string;

  /** Extension point */
  point: ExtensionPoint;

  /** Priority for ordering */
  priority: ExtensionPriority;

  /** Plugin ID that created this extension */
  pluginId: string;

  /** Required permissions */
  permissions?: string[];

  /** Extension enabled flag */
  enabled: boolean;

  /** Extension version */
  version: string;
}

// ============================================================================
// COMMAND EXTENSIONS
// ============================================================================

/**
 * Command extension definition
 */
export interface CommandExtension extends BaseExtension {
  point: ExtensionPoint.COMMAND;

  /** Command title */
  title: string;

  /** Command description */
  description: string;

  /** Command icon (lucide icon name) */
  icon?: string;

  /** Keyboard shortcut */
  keybinding?: string;

  /** Command category */
  category?: string;

  /** Command handler */
  handler: CommandHandler;
}

/**
 * Command handler function
 */
export type CommandHandler = (context: CommandContext) => CommandResult | Promise<CommandResult>;

/**
 * Command execution context
 */
export interface CommandContext {
  /** Extension ID */
  extensionId: ExtensionId;

  /** Arguments passed to command */
  args: Record<string, any>;

  /** Current conversation ID (if applicable) */
  conversationId?: string;

  /** Selected message IDs (if applicable) */
  selectedMessageIds?: string[];

  /** Selected text (if applicable) */
  selectedText?: string;

  /** Current route */
  route?: string;
}

/**
 * Command execution result
 */
export interface CommandResult {
  /** Success flag */
  success: boolean;

  /** Result message */
  message?: string;

  /** Result data */
  data?: any;

  /** Error message */
  error?: string;
}

// ============================================================================
// MESSAGE EXTENSIONS
// ============================================================================

/**
 * Message middleware extension
 */
export interface MessageMiddlewareExtension extends BaseExtension {
  point: ExtensionPoint.MESSAGE_MIDDLEWARE;

  /** Middleware function */
  middleware: MessageMiddleware;
}

/**
 * Message middleware function
 */
export type MessageMiddleware = (
  message: Message,
  context: MessageContext
) => Message | Promise<Message> | null | Promise<null>;

/**
 * Message filter extension
 */
export interface MessageFilterExtension extends BaseExtension {
  point: ExtensionPoint.MESSAGE_FILTER;

  /** Filter function */
  filter: MessageFilter;
}

/**
 * Message filter function
 */
export type MessageFilter = (
  message: Message,
  context: MessageContext
) => boolean | Promise<boolean>;

/**
 * Message enricher extension
 */
export interface MessageEnricherExtension extends BaseExtension {
  point: ExtensionPoint.MESSAGE_ENRICHER;

  /** Enricher function */
  enricher: MessageEnricher;
}

/**
 * Message enricher function
 */
export type MessageEnricher = (
  message: Message,
  context: MessageContext
) => MessageMetadata | Promise<MessageMetadata>;

/**
 * Message context
 */
export interface MessageContext {
  /** Conversation ID */
  conversationId: string;

  /** Message index in conversation */
  index: number;

  /** Total messages in conversation */
  total: number;

  /** Previous message */
  previous?: Message;

  /** Next message */
  next?: Message;

  /** Current user */
  userId?: string;
}

/**
 * Message structure
 */
export interface Message {
  id: string;
  conversationId: string;
  type: 'text' | 'image' | 'audio' | 'system' | 'metadata';
  author: string | object;
  content: any;
  timestamp: string;
  metadata: MessageMetadata;
}

/**
 * Message metadata
 */
export interface MessageMetadata {
  [key: string]: any;
}

// ============================================================================
// UI EXTENSIONS
// ============================================================================

/**
 * Sidebar panel extension
 */
export interface SidebarPanelExtension extends BaseExtension {
  point: ExtensionPoint.SIDEBAR_PANEL;

  /** Panel title */
  title: string;

  /** Panel icon (lucide icon name) */
  icon?: string;

  /** Panel position */
  position: 'top' | 'bottom';

  /** Default open state */
  defaultOpen?: boolean;

  /** Panel render function */
  render: () => React.ReactNode;
}

/**
 * Menu item extension
 */
export interface MenuItemExtension extends BaseExtension {
  point: ExtensionPoint.MENU_ITEM;

  /** Menu location */
  location: 'app' | 'conversation' | 'message' | 'knowledge';

  /** Item label */
  label: string;

  /** Item icon (lucide icon name) */
  icon?: string;

  /** Item position in menu */
  position?: number;

  /** Separator before this item */
  separator?: boolean;

  /** Item action handler */
  action: MenuAction;
}

/**
 * Menu action handler
 */
export type MenuAction = (context: MenuContext) => void | Promise<void>;

/**
 * Menu context
 */
export interface MenuContext {
  /** Extension ID */
  extensionId: ExtensionId;

  /** Target type */
  target: 'conversation' | 'message' | 'knowledge' | 'app';

  /** Target ID */
  targetId?: string;

  /** Additional context data */
  data?: Record<string, any>;
}

/**
 * Toolbar button extension
 */
export interface ToolbarButtonExtension extends BaseExtension {
  point: ExtensionPoint.TOOLBAR_BUTTON;

  /** Button label */
  label: string;

  /** Button icon (lucide icon name) */
  icon?: string;

  /** Button position */
  position: 'left' | 'right';

  /** Button variant */
  variant?: 'default' | 'primary' | 'secondary' | 'danger';

  /** Button click handler */
  onClick: ToolbarAction;
}

/**
 * Toolbar action handler
 */
export type ToolbarAction = (context: ToolbarContext) => void | Promise<void>;

/**
 * Toolbar context
 */
export interface ToolbarContext {
  /** Extension ID */
  extensionId: ExtensionId;

  /** Current route */
  route?: string;

  /** Current conversation ID */
  conversationId?: string;
}

/**
 * Modal dialog extension
 */
export interface ModalDialogExtension extends BaseExtension {
  point: ExtensionPoint.MODAL_DIALOG;

  /** Dialog title */
  title: string;

  /** Dialog size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';

  /** Dialog render function */
  render: (props: DialogRenderProps) => React.ReactNode;
}

/**
 * Dialog render props
 */
export interface DialogRenderProps {
  /** Close dialog callback */
  onClose: () => void;

  /** Dialog data */
  data?: any;
}

/**
 * Status bar item extension
 */
export interface StatusBarExtension extends BaseExtension {
  point: ExtensionPoint.STATUS_BAR_ITEM;

  /** Item position */
  position: 'left' | 'right';

  /** Item priority for ordering */
  order?: number;

  /** Item render function */
  render: () => React.ReactNode;
}

/**
 * Context menu item extension
 */
export interface ContextMenuExtension extends BaseExtension {
  point: ExtensionPoint.CONTEXT_MENU_ITEM;

  /** Context type */
  context: 'message' | 'conversation' | 'knowledge' | 'text';

  /** Item label */
  label: string;

  /** Item icon (lucide icon name) */
  icon?: string;

  /** Item position */
  position?: number;

  /** Separator before this item */
  separator?: boolean;

  /** Item action handler */
  action: ContextMenuAction;
}

/**
 * Context menu action handler
 */
export type ContextMenuAction = (context: ContextMenuContext) => void | Promise<void>;

/**
 * Context menu context
 */
export interface ContextMenuContext extends MenuContext {
  /** Event that triggered context menu */
  event: MouseEvent | React.MouseEvent;
}

// ============================================================================
// DATA EXTENSIONS
// ============================================================================

/**
 * Export format extension
 */
export interface ExportFormatExtension extends BaseExtension {
  point: ExtensionPoint.EXPORT_FORMAT;

  /** Format name */
  name: string;

  /** Format extension */
  extension: string;

  /** MIME type */
  mimeType: string;

  /** Format description */
  description?: string;

  /** Export function */
  export: (data: ExportData) => ExportResult | Promise<ExportResult>;
}

/**
 * Export data
 */
export interface ExportData {
  /** Data type */
  type: 'conversations' | 'messages' | 'knowledge' | 'settings' | 'all';

  /** Data to export */
  data: any;

  /** Export options */
  options?: Record<string, any>;
}

/**
 * Export result
 */
export interface ExportResult {
  /** Exported content */
  content: string | Blob;

  /** Filename */
  filename: string;

  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Import source extension
 */
export interface ImportSourceExtension extends BaseExtension {
  point: ExtensionPoint.IMPORT_SOURCE;

  /** Source name */
  name: string;

  /** Source description */
  description?: string;

  /** Supported formats */
  formats: string[];

  /** Import function */
  import: (data: ImportData) => ImportResult | Promise<ImportResult>;
}

/**
 * Import data
 */
export interface ImportData {
  /** File being imported */
  file?: File;

  /** Content being imported */
  content?: string;

  /** Import options */
  options?: Record<string, any>;
}

/**
 * Import result
 */
export interface ImportResult {
  /** Success flag */
  success: boolean;

  /** Imported items */
  items: any[];

  /** Error message */
  error?: string;

  /** Warnings */
  warnings?: string[];
}

/**
 * Data transformer extension
 */
export interface DataTransformerExtension extends BaseExtension {
  point: ExtensionPoint.DATA_TRANSFORMER;

  /** Input schema */
  inputSchema: Record<string, any>;

  /** Output schema */
  outputSchema: Record<string, any>;

  /** Transform function */
  transform: (data: any) => any | Promise<any>;
}

/**
 * Data validator extension
 */
export interface DataValidatorExtension extends BaseExtension {
  point: ExtensionPoint.DATA_VALIDATOR;

  /** Validation schema */
  schema: Record<string, any>;

  /** Validate function */
  validate: (data: any) => ValidationResult | Promise<ValidationResult>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Valid flag */
  valid: boolean;

  /** Validation errors */
  errors: ValidationError[];

  /** Validation warnings */
  warnings?: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Field path */
  field: string;

  /** Error message */
  message: string;

  /** Error code */
  code?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Field path */
  field: string;

  /** Warning message */
  message: string;

  /** Warning code */
  code?: string;
}

// ============================================================================
// AI EXTENSIONS
// ============================================================================

/**
 * AI provider extension
 */
export interface AIProviderExtension extends BaseExtension {
  point: ExtensionPoint.AI_PROVIDER;

  /** Provider name */
  name: string;

  /** Provider type */
  type: 'completion' | 'chat' | 'embedding' | 'image' | 'multimodal';

  /** Supported models */
  models: string[];

  /** Configuration schema */
  configSchema?: Record<string, any>;

  /** Generate function */
  generate: (request: AIRequest) => AIResponse | Promise<AIResponse>;
}

/**
 * AI request
 */
export interface AIRequest {
  /** Model ID */
  model: string;

  /** Messages */
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;

  /** Generation parameters */
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    [key: string]: any;
  };

  /** Provider configuration */
  config?: Record<string, any>;
}

/**
 * AI response
 */
export interface AIResponse {
  /** Generated text */
  text: string;

  /** Usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Message processor extension
 */
export interface MessageProcessorExtension extends BaseExtension {
  point: ExtensionPoint.MESSAGE_PROCESSOR;

  /** Processor name */
  name: string;

  /** Processing stage */
  stage: 'before' | 'after' | 'both';

  /** Process function */
  process: (message: Message, context: MessageContext) => Message | Promise<Message>;
}

/**
 * Response transformer extension
 */
export interface ResponseTransformerExtension extends BaseExtension {
  point: ExtensionPoint.RESPONSE_TRANSFORMER;

  /** Transformer name */
  name: string;

  /** Transform function */
  transform: (response: AIResponse) => AIResponse | Promise<AIResponse>;
}

// ============================================================================
// ANALYTICS EXTENSIONS
// ============================================================================

/**
 * Analytics metric extension
 */
export interface AnalyticsMetricExtension extends BaseExtension {
  point: ExtensionPoint.ANALYTICS_METRIC;

  /** Metric name */
  name: string;

  /** Metric type */
  type: 'counter' | 'gauge' | 'histogram' | 'summary';

  /** Metric description */
  description?: string;

  /** Collect function */
  collect: () => any | Promise<any>;
}

/**
 * Analytics aggregator extension
 */
export interface AnalyticsAggregatorExtension extends BaseExtension {
  point: ExtensionPoint.ANALYTICS_AGGREGATOR;

  /** Aggregator name */
  name: string;

  /** Aggregation type */
  type: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'percentile' | 'custom';

  /** Aggregate function */
  aggregate: (data: any[]) => any | Promise<any>;
}

/**
 * Analytics visualization extension
 */
export interface AnalyticsVisualizationExtension extends BaseExtension {
  point: ExtensionPoint.ANALYTICS_VISUALIZATION;

  /** Visualization name */
  name: string;

  /** Visualization type */
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'custom';

  /** Visualization description */
  description?: string;

  /** Render function */
  render: (data: any) => React.ReactNode;
}

// ============================================================================
// WORKFLOW EXTENSIONS
// ============================================================================

/**
 * Workflow trigger extension
 */
export interface WorkflowTriggerExtension extends BaseExtension {
  point: ExtensionPoint.WORKFLOW_TRIGGER;

  /** Trigger name */
  name: string;

  /** Trigger type */
  type: 'event' | 'schedule' | 'condition' | 'manual' | 'custom';

  /** Trigger configuration */
  config?: Record<string, any>;

  /** Evaluate function */
  evaluate: (context: WorkflowContext) => boolean | Promise<boolean>;
}

/**
 * Workflow action extension
 */
export interface WorkflowActionExtension extends BaseExtension {
  point: ExtensionPoint.WORKFLOW_ACTION;

  /** Action name */
  name: string;

  /** Action description */
  description?: string;

  /** Action parameters schema */
  parameters?: Record<string, any>;

  /** Execute function */
  execute: (context: WorkflowContext) => WorkflowActionResult | Promise<WorkflowActionResult>;
}

/**
 * Workflow context
 */
export interface WorkflowContext {
  /** Trigger event */
  event?: any;

  /** Workflow data */
  data: Record<string, any>;

  /** Previous action results */
  results?: Record<string, any>;
}

/**
 * Workflow action result
 */
export interface WorkflowActionResult {
  /** Success flag */
  success: boolean;

  /** Result data */
  data?: any;

  /** Error message */
  error?: string;

  /** Next action to execute */
  next?: string;
}

// ============================================================================
// THEME EXTENSIONS
// ============================================================================

/**
 * Theme extension
 */
export interface ThemeExtension extends BaseExtension {
  point: ExtensionPoint.THEME;

  /** Theme name */
  name: string;

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
}

// ============================================================================
// EXTENSION UNION
// ============================================================================

/**
 * All extension types
 */
export type Extension =
  | CommandExtension
  | MessageMiddlewareExtension
  | MessageFilterExtension
  | MessageEnricherExtension
  | SidebarPanelExtension
  | MenuItemExtension
  | ToolbarButtonExtension
  | ModalDialogExtension
  | StatusBarExtension
  | ContextMenuExtension
  | ExportFormatExtension
  | ImportSourceExtension
  | DataTransformerExtension
  | DataValidatorExtension
  | AIProviderExtension
  | MessageProcessorExtension
  | ResponseTransformerExtension
  | AnalyticsMetricExtension
  | AnalyticsAggregatorExtension
  | AnalyticsVisualizationExtension
  | WorkflowTriggerExtension
  | WorkflowActionExtension
  | ThemeExtension;

// ============================================================================
// EXTENSION STATE
// ============================================================================

/**
 * Extension state
 */
export enum ExtensionState {
  /** Extension is registered but not active */
  REGISTERED = 'registered',

  /** Extension is active and running */
  ACTIVE = 'active',

  /** Extension is paused/disabled */
  PAUSED = 'paused',

  /** Extension has errors */
  ERROR = 'error',
}

/**
 * Extension runtime state
 */
export interface ExtensionRuntimeState {
  /** Extension ID */
  id: ExtensionId;

  /** Extension state */
  state: ExtensionState;

  /** Extension enabled flag */
  enabled: boolean;

  /** Activation count */
  activationCount: number;

  /** Execution count */
  executionCount: number;

  /** Error count */
  errorCount: number;

  /** Last execution time */
  lastExecution?: number;

  /** Average execution time (ms) */
  avgExecutionTime: number;

  /** Extension errors */
  errors: ExtensionError[];

  /** Extension metadata */
  metadata: Record<string, any>;
}

/**
 * Extension error
 */
export interface ExtensionError {
  /** Error ID */
  id: string;

  /** Error timestamp */
  timestamp: number;

  /** Error type */
  type: 'activation' | 'execution' | 'validation' | 'runtime';

  /** Error message */
  message: string;

  /** Error stack */
  stack?: string;

  /** Error context */
  context?: Record<string, any>;
}

// ============================================================================
// EXTENSION REGISTRY
// ============================================================================

/**
 * Extension registration options
 */
export interface ExtensionRegistrationOptions {
  /** Auto-activate extension */
  autoActivate?: boolean;

  /** Extension priority */
  priority?: ExtensionPriority;

  /** Extension dependencies */
  dependencies?: ExtensionId[];

  /** Extension settings */
  settings?: Record<string, any>;
}

/**
 * Extension registry entry
 */
export interface ExtensionRegistryEntry {
  /** Extension definition */
  extension: Extension;

  /** Runtime state */
  runtime: ExtensionRuntimeState;

  /** Registration options */
  options: ExtensionRegistrationOptions;

  /** Registered timestamp */
  registeredAt: number;
}

// ============================================================================
// EXTENSION EXECUTION
// ============================================================================

/**
 * Extension execution context
 */
export interface ExtensionExecutionContext {
  /** Extension point */
  point: ExtensionPoint;

  /** Execution data */
  data: any;

  /** Execution options */
  options?: {
    /** Stop on first error */
    stopOnError?: boolean;

    /** Return early on result */
    returnEarly?: boolean;

    /** Execution timeout (ms) */
    timeout?: number;
  };
}

/**
 * Extension execution result
 */
export interface ExtensionExecutionResult {
  /** Extension ID */
  extensionId: ExtensionId;

  /** Success flag */
  success: boolean;

  /** Result data */
  data?: any;

  /** Execution time (ms) */
  executionTime: number;

  /** Error message */
  error?: string;
}

// ============================================================================
// EXTENSION EVENTS
// ============================================================================

/**
 * Extension event types
 */
export enum ExtensionEventType {
  /** Extension registered */
  REGISTERED = 'extension.registered',

  /** Extension unregistered */
  UNREGISTERED = 'extension.unregistered',

  /** Extension activated */
  ACTIVATED = 'extension.activated',

  /** Extension deactivated */
  DEACTIVATED = 'extension.deactivated',

  /** Extension executed */
  EXECUTED = 'extension.executed',

  /** Extension error */
  ERROR = 'extension.error',
}

/**
 * Extension event
 */
export interface ExtensionEvent {
  /** Event type */
  type: ExtensionEventType;

  /** Extension ID */
  extensionId: ExtensionId;

  /** Event timestamp */
  timestamp: number;

  /** Event data */
  data?: any;
}
