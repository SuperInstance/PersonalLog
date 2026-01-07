# Plugin API Reference

**Complete API documentation for PersonalLog plugins**

---

## Table of Contents

1. [Overview](#overview)
2. [Plugin Context](#plugin-context)
3. [Commands API](#commands-api)
4. [UI API](#ui-api)
5. [Data API](#data-api)
6. [Conversations API](#conversations-api)
7. [Messages API](#messages-api)
8. [Knowledge API](#knowledge-api)
9. [Analytics API](#analytics-api)
10. [Settings API](#settings-api)
11. [Storage API](#storage-api)
12. [Events API](#events-api)
13. [Logger API](#logger-api)
14. [Lifecycle Hooks](#lifecycle-hooks)

---

## Overview

The Plugin API provides a comprehensive interface for plugins to interact with PersonalLog. All APIs are:

- **Permission-controlled**: Requires explicit permissions
- **Type-safe**: Full TypeScript support
- **Async-first**: Uses Promises for operations
- **Error-aware**: Clear error messages

### API Version

Current API Version: `1.0.0`

```typescript
api.version // '1.0.0'
```

---

## Plugin Context

The plugin context is passed to lifecycle hooks and provides access to all APIs.

```typescript
interface PluginAPIContext {
  pluginId: string;           // Unique plugin identifier
  version: string;            // Plugin version
  permissions: Permission[];  // Granted permissions
  settings: Record<string, any>; // Plugin settings
  logger: PluginLogger;       // Logger
  storage: PluginStorage;     // Plugin storage
  events: PluginEventBus;     // Event bus
}

interface PluginActivationContext extends PluginAPIContext {
  api: PluginAPISurface;      // Full API surface
}
```

### Example Usage

```typescript
export async function onActivate(context: PluginActivationContext) {
  const { pluginId, version, permissions, api } = context;

  context.logger.info('Plugin activating', {
    pluginId,
    version,
    permissions: permissions.length
  });

  // Access API
  await api.conversations.list();
}
```

---

## Commands API

Register and execute custom commands.

### register(command)

Register a new command.

```typescript
api.commands.register(command: CommandDefinition): void
```

**Parameters:**

```typescript
interface CommandDefinition {
  id: string;                  // Unique command ID
  title: string;               // Display name
  description?: string;        // Command description
  handler: string;             // Serialized handler function
  permissions?: Permission[];  // Required permissions
}
```

**Example:**

```typescript
api.commands.register({
  id: 'myplugin.greet',
  title: 'Greet User',
  description: 'Display a greeting message',
  handler: 'async (context) => { return "Hello!"; }'
});
```

### execute(commandId, ...args)

Execute a registered command.

```typescript
await api.commands.execute(commandId: string, ...args: any[]): Promise<any>
```

**Example:**

```typescript
const result = await api.commands.execute('myplugin.greet', 'World');
console.log(result); // "Hello, World!"
```

### unregister(commandId)

Unregister a command.

```typescript
api.commands.unregister(commandId: string): void
```

**Example:**

```typescript
api.commands.unregister('myplugin.greet');
```

---

## UI API

Register UI components, views, and interface elements.

### registerComponent(component)

Register a UI component.

```typescript
api.ui.registerComponent(component: UIComponentDefinition): void
```

**Parameters:**

```typescript
interface UIComponentDefinition {
  id: string;                    // Component ID
  name: string;                  // Component name
  description?: string;          // Component description
  category: 'message' | 'conversation' | 'sidebar' | 'header' | 'footer' | 'custom';
  render: string;                // Serialized render function
  props?: Record<string, PropSchema>; // Props schema
  permissions?: Permission[];    // Required permissions
}
```

**Example:**

```typescript
api.ui.registerComponent({
  id: 'my-widget',
  name: 'My Widget',
  description: 'A custom widget',
  category: 'message',
  render: `({ context, message }) => {
    return React.createElement('div', {
      style: { padding: '10px', background: '#f0f0f0' }
    }, 'Widget Content');
  }`
});
```

### registerView(view)

Register a custom view/page.

```typescript
api.ui.registerView(view: UIViewDefinition): void
```

**Parameters:**

```typescript
interface UIViewDefinition {
  id: string;                  // View ID
  name: string;                // View name
  path: string;                // View path (e.g., /plugins/my-view)
  description?: string;        // View description
  icon?: string;               // Lucide icon name
  render: string;              // Serialized render function
  permissions?: Permission[];  // Required permissions
}
```

**Example:**

```typescript
api.ui.registerView({
  id: 'my-dashboard',
  name: 'My Dashboard',
  path: '/plugins/my-dashboard',
  description: 'Custom dashboard',
  icon: 'LayoutDashboard',
  render: `({ context }) => {
    return React.createElement('div', {},
      React.createElement('h1', {}, 'My Dashboard')
    );
  }`
});
```

### registerToolbarButton(button)

Register a toolbar button.

```typescript
api.ui.registerToolbarButton(button: ToolbarButtonDefinition): void
```

**Example:**

```typescript
api.ui.registerToolbarButton({
  id: 'my-action',
  label: 'My Action',
  icon: 'Play',
  position: 'primary',
  onClick: 'async (context) => { await doAction(); }'
});
```

### registerSidebarItem(item)

Register a sidebar item.

```typescript
api.ui.registerSidebarItem(item: SidebarItemDefinition): void
```

**Example:**

```typescript
api.ui.registerSidebarItem({
  id: 'my-page',
  label: 'My Page',
  icon: 'FileText',
  path: '/plugins/my-page'
});
```

---

## Data API

Register data sources, transformers, and validators.

### registerSource(source)

Register a data source.

```typescript
api.data.registerSource(source: DataSourceDefinition): void
```

**Parameters:**

```typescript
interface DataSourceDefinition {
  id: string;                  // Source ID
  name: string;                // Source name
  description?: string;        // Source description
  type: 'api' | 'database' | 'file' | 'stream' | 'custom';
  configSchema?: Record<string, any>; // Configuration schema
  fetch: string;               // Serialized fetch function
  permissions?: Permission[];  // Required permissions
}
```

**Example:**

```typescript
api.data.registerSource({
  id: 'my-api',
  name: 'My API',
  description: 'Fetch data from external API',
  type: 'api',
  fetch: 'async (config) => { return await fetch(config.url).then(r => r.json()); }'
});
```

### registerTransformer(transformer)

Register a data transformer.

```typescript
api.data.registerTransformer(transformer: DataTransformerDefinition): void
```

**Example:**

```typescript
api.data.registerTransformer({
  id: 'uppercase-transformer',
  name: 'Uppercase Transformer',
  description: 'Convert strings to uppercase',
  inputSchema: { type: 'string' },
  outputSchema: { type: 'string' },
  transform: 'async (data) => { return data.toUpperCase(); }'
});
```

### registerValidator(validator)

Register a data validator.

```typescript
api.data.registerValidator(validator: DataValidatorDefinition): void
```

**Example:**

```typescript
api.data.registerValidator({
  id: 'email-validator',
  name: 'Email Validator',
  description: 'Validate email addresses',
  schema: {
    type: 'string',
    format: 'email'
  },
  validate: 'async (data) => { return /^[^@]+@[^@]+$/.test(data); }'
});
```

---

## Conversations API

Manage conversations.

### list()

List all conversations.

```typescript
await api.conversations.list(): Promise<Conversation[]>
```

**Permission Required:** `conversations:read`

**Example:**

```typescript
const conversations = await api.conversations.list();
conversations.forEach(conv => {
  console.log(`${conv.id}: ${conv.title}`);
});
```

### get(id)

Get a specific conversation.

```typescript
await api.conversations.get(id: string): Promise<Conversation>
```

**Permission Required:** `conversations:read`

**Parameters:**
- `id`: Conversation ID

**Example:**

```typescript
const conversation = await api.conversations.get('conv-123');
console.log(conversation.title);
```

### create(data)

Create a new conversation.

```typescript
await api.conversations.create(data: {
  title: string;
  type?: string;
}): Promise<Conversation>
```

**Permission Required:** `conversations:write`

**Example:**

```typescript
const conversation = await api.conversations.create({
  title: 'My New Conversation',
  type: 'personal'
});
```

### update(id, data)

Update a conversation.

```typescript
await api.conversations.update(id: string, data: Partial<Conversation>): Promise<void>
```

**Permission Required:** `conversations:write`

**Example:**

```typescript
await api.conversations.update('conv-123', {
  title: 'Updated Title'
});
```

### delete(id)

Delete a conversation.

```typescript
await api.conversations.delete(id: string): Promise<void>
```

**Permission Required:** `conversations:delete`

**Example:**

```typescript
await api.conversations.delete('conv-123');
```

---

## Messages API

Manage messages within conversations.

### list(conversationId)

List messages in a conversation.

```typescript
await api.messages.list(conversationId: string): Promise<Message[]>
```

**Permission Required:** `messages:read`

**Example:**

```typescript
const messages = await api.messages.list('conv-123');
messages.forEach(msg => {
  console.log(`${msg.author}: ${msg.content}`);
});
```

### get(id)

Get a specific message.

```typescript
await api.messages.get(id: string): Promise<Message>
```

**Permission Required:** `messages:read`

**Example:**

```typescript
const message = await api.messages.get('msg-456');
console.log(message.content);
```

### create(conversationId, data)

Create a new message.

```typescript
await api.messages.create(conversationId: string, data: {
  type?: string;
  author: string;
  content: string;
  replyTo?: string;
}): Promise<Message>
```

**Permission Required:** `messages:write`

**Example:**

```typescript
const message = await api.messages.create('conv-123', {
  type: 'text',
  author: 'User',
  content: 'Hello, world!'
});
```

### update(id, data)

Update a message.

```typescript
await api.messages.update(id: string, data: Partial<Message>): Promise<void>
```

**Permission Required:** `messages:write`

**Example:**

```typescript
await api.messages.update('msg-456', {
  content: 'Updated message'
});
```

### delete(id)

Delete a message.

```typescript
await api.messages.delete(id: string): Promise<void>
```

**Permission Required:** `messages:delete`

**Example:**

```typescript
await api.messages.delete('msg-456');
```

---

## Knowledge API

Access and manage the knowledge base.

### search(query, options?)

Search the knowledge base.

```typescript
await api.knowledge.search(query: string, options?: {
  limit?: number;
  category?: string;
}): Promise<KnowledgeEntry[]>
```

**Permission Required:** `knowledge:read`

**Example:**

```typescript
const results = await api.knowledge.search('JavaScript', {
  limit: 10,
  category: 'programming'
});
```

### get(id)

Get a knowledge entry.

```typescript
await api.knowledge.get(id: string): Promise<KnowledgeEntry>
```

**Permission Required:** `knowledge:read`

**Example:**

```typescript
const entry = await api.knowledge.get('entry-789');
console.log(entry.content);
```

### create(data)

Create a knowledge entry.

```typescript
await api.knowledge.create(data: {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}): Promise<KnowledgeEntry>
```

**Permission Required:** `knowledge:write`

**Example:**

```typescript
const entry = await api.knowledge.create({
  title: 'JavaScript Tips',
  content: 'Use const by default...',
  category: 'programming',
  tags: ['javascript', 'best-practices']
});
```

### update(id, data)

Update a knowledge entry.

```typescript
await api.knowledge.update(id: string, data: Partial<KnowledgeEntry>): Promise<void>
```

**Permission Required:** `knowledge:write`

**Example:**

```typescript
await api.knowledge.update('entry-789', {
  content: 'Updated content'
});
```

### delete(id)

Delete a knowledge entry.

```typescript
await api.knowledge.delete(id: string): Promise<void>
```

**Permission Required:** `knowledge:delete`

**Example:**

```typescript
await api.knowledge.delete('entry-789');
```

---

## Analytics API

Track and query analytics.

### trackEvent(event, data?)

Track an analytics event.

```typescript
await api.analytics.trackEvent(event: string, data?: any): Promise<void>
```

**Permission Required:** `analytics:write`

**Example:**

```typescript
await api.analytics.trackEvent('plugin.feature_used', {
  feature: 'export',
  format: 'pdf'
});
```

### getMetrics(options?)

Get analytics metrics.

```typescript
await api.analytics.getMetrics(options?: {
  startDate?: Date;
  endDate?: Date;
  events?: string[];
}): Promise<AnalyticsData>
```

**Permission Required:** `analytics:read`

**Example:**

```typescript
const metrics = await api.analytics.getMetrics({
  startDate: new Date('2025-01-01'),
  events: ['plugin.feature_used']
});
```

### query(query)

Execute a custom analytics query.

```typescript
await api.analytics.query(query: {
  type: 'aggregate' | 'filter' | 'group';
  field?: string;
  operation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  filters?: Record<string, any>;
}): Promise<any[]>
```

**Permission Required:** `analytics:read`

**Example:**

```typescript
const results = await api.analytics.query({
  type: 'aggregate',
  field: 'duration',
  operation: 'avg',
  filters: {
    event: 'plugin.feature_used'
  }
});
```

---

## Settings API

Manage plugin settings.

### get(key)

Get a setting value.

```typescript
await api.settings.get(key: string): Promise<any>
```

**Permission Required:** `settings:read`

**Example:**

```typescript
const apiKey = await api.settings.get('apiKey');
```

### set(key, value)

Set a setting value.

```typescript
await api.settings.set(key: string, value: any): Promise<void>
```

**Permission Required:** `settings:write`

**Example:**

```typescript
await api.settings.set('apiKey', 'new-api-key');
```

### getAll()

Get all settings.

```typescript
await api.settings.getAll(): Promise<Record<string, any>>
```

**Permission Required:** `settings:read`

**Example:**

```typescript
const settings = await api.settings.getAll();
console.log(settings);
```

---

## Storage API

Plugin-specific data storage.

### get(key)

Get a value from storage.

```typescript
await context.storage.get(key: string): Promise<any>
```

**Example:**

```typescript
const data = await context.storage.get('my-key');
```

### set(key, value)

Set a value in storage.

```typescript
await context.storage.set(key: string, value: any): Promise<void>
```

**Example:**

```typescript
await context.storage.set('my-key', { foo: 'bar' });
```

### delete(key)

Delete a value from storage.

```typescript
await context.storage.delete(key: string): Promise<void>
```

**Example:**

```typescript
await context.storage.delete('my-key');
```

### keys()

List all keys in storage.

```typescript
await context.storage.keys(): Promise<string[]>
```

**Example:**

```typescript
const keys = await context.storage.keys();
console.log(keys); // ['key1', 'key2', ...]
```

### clear()

Clear all storage.

```typescript
await context.storage.clear(): Promise<void>
```

**Example:**

```typescript
await context.storage.clear();
```

---

## Events API

Event bus for inter-plugin communication.

### on(event, handler)

Subscribe to an event.

```typescript
context.events.on(event: string, handler: (...args: any[]) => void): void
```

**Example:**

```typescript
context.events.on('message:received', (message) => {
  console.log('New message:', message);
});
```

### off(event, handler)

Unsubscribe from an event.

```typescript
context.events.off(event: string, handler: (...args: any[]) => void): void
```

**Example:**

```typescript
const handler = (message) => console.log(message);
context.events.on('message:received', handler);
// Later...
context.events.off('message:received', handler);
```

### emit(event, ...args)

Emit an event.

```typescript
context.events.emit(event: string, ...args: any[]): void
```

**Example:**

```typescript
context.events.emit('custom:event', { data: 'value' });
```

### Available Events

| Event | Description | Payload |
|-------|-------------|---------|
| `message:received` | New message received | `Message` |
| `message:sent` | Message sent | `Message` |
| `conversation:created` | Conversation created | `Conversation` |
| `conversation:updated` | Conversation updated | `Conversation` |
| `plugin.activated` | Plugin activated | `{ pluginId: string }` |
| `plugin.deactivated` | Plugin deactivated | `{ pluginId: string }` |

---

## Logger API

Logging utility for plugins.

### debug(message, ...args)

Log debug message.

```typescript
context.logger.debug(message: string, ...args: any[]): void
```

**Example:**

```typescript
context.logger.debug('Debug info', { data: 'value' });
```

### info(message, ...args)

Log info message.

```typescript
context.logger.info(message: string, ...args: any[]): void
```

**Example:**

```typescript
context.logger.info('Plugin activated successfully');
```

### warn(message, ...args)

Log warning.

```typescript
context.logger.warn(message: string, ...args: any[]): void
```

**Example:**

```typescript
context.logger.warn('Deprecated API used', { api: 'old-api' });
```

### error(message, ...args)

Log error.

```typescript
context.logger.error(message: string, ...args: any[]): void
```

**Example:**

```typescript
context.logger.error('Operation failed', error);
```

---

## Lifecycle Hooks

Hooks called during plugin lifecycle.

### onActivate(context)

Called when plugin is activated.

```typescript
async function onActivate(context: PluginActivationContext): Promise<void>
```

**Example:**

```typescript
export async function onActivate(context: PluginActivationContext) {
  context.logger.info('Plugin activating');

  // Initialize plugin
  await initializePlugin(context);
}
```

### onDeactivate(context)

Called when plugin is deactivated.

```typescript
async function onDeactivate(context: PluginAPIContext): Promise<void>
```

**Example:**

```typescript
export async function onDeactivate(context: PluginAPIContext) {
  context.logger.info('Plugin deactivating');

  // Cleanup
  await context.storage.clear();
}
```

### onSettingsChange(newSettings, oldSettings, context)

Called when settings change.

```typescript
async function onSettingsChange(
  newSettings: Record<string, any>,
  oldSettings: Record<string, any>,
  context: PluginAPIContext
): Promise<void>
```

**Example:**

```typescript
export async function onSettingsChange(
  newSettings: Record<string, any>,
  oldSettings: Record<string, any>,
  context: PluginAPIContext
) {
  context.logger.info('Settings changed', { newSettings, oldSettings });

  // React to changes
  if (newSettings.apiKey !== oldSettings.apiKey) {
    await reinitializeWithNewKey(newSettings.apiKey);
  }
}
```

### onUninstall(context)

Called when plugin is uninstalled.

```typescript
async function onUninstall(context: PluginAPIContext): Promise<void>
```

**Example:**

```typescript
export async function onUninstall(context: PluginAPIContext) {
  context.logger.info('Plugin uninstalling');

  // Final cleanup
  await context.storage.clear();
  await context.api.analytics.trackEvent('plugin.uninstalled');
}
```

---

## Type Definitions

### Permission Enum

```typescript
enum Permission {
  // Conversations
  READ_CONVERSATIONS = 'conversations:read',
  WRITE_CONVERSATIONS = 'conversations:write',
  DELETE_CONVERSATIONS = 'conversations:delete',

  // Messages
  READ_MESSAGES = 'messages:read',
  WRITE_MESSAGES = 'messages:write',
  DELETE_MESSAGES = 'messages:delete',

  // Knowledge
  READ_KNOWLEDGE = 'knowledge:read',
  WRITE_KNOWLEDGE = 'knowledge:write',
  DELETE_KNOWLEDGE = 'knowledge:delete',

  // Contacts
  READ_CONTACTS = 'contacts:read',
  WRITE_CONTACTS = 'contacts:write',
  DELETE_CONTACTS = 'contacts:delete',

  // Analytics
  READ_ANALYTICS = 'analytics:read',
  WRITE_ANALYTICS = 'analytics:write',

  // Settings
  READ_SETTINGS = 'settings:read',
  WRITE_SETTINGS = 'settings:write',

  // Network
  NETWORK_REQUEST = 'network:request',

  // Storage
  READ_STORAGE = 'storage:read',
  WRITE_STORAGE = 'storage:write',

  // UI
  MODIFY_UI = 'ui:modify',
  SHOW_NOTIFICATIONS = 'notifications:show',

  // System
  READ_SYSTEM = 'system:read',
  EXECUTE_CODE = 'code:execute',
}
```

---

## Error Handling

All API methods can throw errors. Handle them appropriately:

```typescript
try {
  await api.conversations.create({
    title: 'New Conversation'
  });
} catch (error) {
  if (error.message.includes('Permission denied')) {
    context.logger.error('Insufficient permissions');
  } else if (error.message.includes('Validation failed')) {
    context.logger.error('Invalid data');
  } else {
    context.logger.error('Unknown error', error);
  }
}
```

---

**Last Updated:** 2025-01-07
**API Version:** 1.0.0
