# PersonalLog Plugin SDK

Complete SDK for building plugins for PersonalLog - an adaptive, self-optimizing AI personal log.

## Features

- **Type-Safe** - Built with TypeScript from the ground up
- **Well-Documented** - Comprehensive JSDoc comments and IntelliSense support
- **Powerful APIs** - Access conversations, knowledge, AI, UI, storage, network, and more
- **Easy to Use** - Intuitive API design with sensible defaults
- **Validation** - Built-in manifest and plugin validation
- **Logging** - Structured logging with context and log levels
- **Events** - Pub/sub event system for plugin communication

## Installation

```bash
npm install @personallog/sdk
```

## Quick Start

### 1. Create Your Plugin

Create a new plugin class that extends the `Plugin` base class:

```typescript
import { Plugin, PluginContext, PluginManifest } from '@personallog/sdk';

// Define your plugin manifest
const manifest: PluginManifest = {
  id: 'my-plugin',
  name: 'My Plugin',
  description: 'Does something amazing',
  version: '1.0.0',
  author: 'Your Name',
  capabilities: {
    conversations: true,
    ui: true,
  },
  entryPoints: {
    plugin: 'MyPlugin',
  },
};

// Create your plugin class
export class MyPlugin extends Plugin {
  manifest = manifest;

  async onLoad(context: PluginContext) {
    this.context = context;

    // Log that we're loaded
    context.logger.info('My Plugin loaded!');

    // Register a menu item
    context.ui.registerMenuItem({
      id: 'my-plugin-menu',
      label: 'My Plugin',
      location: 'main',
      action: 'handleMenuClick',
    });
  }

  async onEnable(context: PluginContext) {
    // Show a notification
    context.ui.showNotification({
      message: 'My Plugin enabled!',
      type: 'success',
    });
  }

  async handleMenuClick() {
    const data = await this.getData().conversations.list();
    this.getLogger().info(`Found ${data.length} conversations`);
  }
}
```

### 2. Package Your Plugin

Create a `package.json` file:

```json
{
  "name": "my-personallog-plugin",
  "version": "1.0.0",
  "description": "My PersonalLog plugin",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "peerDependencies": {
    "@personallog/sdk": "^1.0.0",
    "react": "^19.0.0"
  },
  "devDependencies": {
    "@personallog/sdk": "^1.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 3. Use in PersonalLog

Install your plugin in PersonalLog and it will be automatically loaded!

## Core Concepts

### Plugin Manifest

Every plugin must have a manifest that defines its metadata and capabilities:

```typescript
const manifest: PluginManifest = {
  // Required fields
  id: 'my-plugin',                              // Unique plugin ID
  name: 'My Plugin',                            // Display name
  description: 'What this plugin does',          // Description
  version: '1.0.0',                             // Semver version
  author: 'Your Name',                          // Author

  // Optional metadata
  homepage: 'https://example.com',              // Homepage URL
  repository: 'https://github.com/user/repo',   // Repository URL
  license: 'MIT',                               // License
  keywords: ['productivity', 'automation'],     // Keywords

  // Capabilities (what the plugin can do)
  capabilities: {
    conversations: true,                        // Access conversations
    knowledge: true,                            // Access knowledge base
    ai: true,                                   // Use AI providers
    ui: true,                                   // Add UI elements
    network: true,                              // Make HTTP requests
    storage: true,                              // Store plugin data
    export: true,                               // Custom export formats
  },

  // Entry points
  entryPoints: {
    plugin: 'MyPlugin',                         // Main plugin class
  },
};
```

### Plugin Lifecycle

Plugins have four lifecycle hooks:

```typescript
class MyPlugin extends Plugin {
  // Called when plugin is first loaded
  async onLoad(context: PluginContext) {
    // Initialize plugin, set up event listeners, register UI
  }

  // Called when plugin is enabled
  async onEnable(context: PluginContext) {
    // Start active operations
  }

  // Called when plugin is disabled
  async onDisable(context: PluginContext) {
    // Stop operations, clean up
  }

  // Called when plugin is unloaded
  async onUnload(context: PluginContext) {
    // Final cleanup
  }
}
```

### Plugin Context

The plugin context provides access to all APIs:

```typescript
interface PluginContext {
  manifest: PluginManifest;
  settings: PluginSettings;
  data: DataAPI;
  ui: UIAPI;
  ai: AIAPI;
  events: EventAPI;
  storage: StorageAPI;
  network: NetworkAPI;
  export: ExportAPI;
  logger: Logger;
  utils: UtilsAPI;
}
```

## API Reference

### Data API

Access conversations, knowledge base, and settings:

```typescript
const data = this.getData();

// Conversations
const conversations = await data.conversations.list({ limit: 10 });
const conversation = await data.conversations.get('conv-id');
const created = await data.conversations.create({
  title: 'New Conversation',
  type: 'personal',
});

// Knowledge base
const results = await data.knowledge.search('query');
const entry = await data.knowledge.add({
  content: 'Knowledge content',
  metadata: { source: 'plugin' },
});

// Settings
const theme = data.settings.get('theme');
```

### UI API

Extend the user interface:

```typescript
const ui = this.getUI();

// Register menu item
ui.registerMenuItem({
  id: 'my-menu',
  label: 'My Menu',
  location: 'main',
  action: 'handleMenuClick',
});

// Register sidebar item
ui.registerSidebarItem({
  id: 'my-sidebar',
  label: 'My Sidebar',
  path: '/my-plugin',
  order: 100,
});

// Show modal
const result = await ui.showModal({
  title: 'My Modal',
  content: MyModalComponent,
  props: { data: 'value' },
});

// Show notification
ui.showNotification({
  message: 'Operation complete!',
  type: 'success',
  duration: 5000,
});
```

### AI API

Interact with AI providers:

```typescript
const ai = this.getAI();

// List providers
const providers = ai.listProviders();

// Send chat request
const response = await ai.chat({
  providerId: 'openai',
  model: 'gpt-4',
  conversationId: 'conv-id',
  messages: [
    { role: 'user', content: 'Hello!' },
  ],
  temperature: 0.7,
  maxTokens: 1000,
});

// Stream response
for await (const chunk of ai.chatStream(request)) {
  console.log(chunk.content);
}
```

### Custom AI Providers

Create custom AI providers:

```typescript
const ai = this.getAI();

ai.registerProvider({
  id: 'my-provider',
  name: 'My AI Provider',
  type: 'cloud',
  models: [
    {
      id: 'my-model',
      name: 'My Model',
      contextWindow: 4096,
    },
  ],
  chat: async (request) => {
    // Implement chat logic
    return {
      content: 'Response',
      model: request.model,
      tokens: { input: 10, output: 20, total: 30 },
    };
  },
});
```

### Event API

Subscribe to and emit events:

```typescript
const events = this.getEvents();

// Subscribe to events
const unsubscribe = events.on('conversation:created', (data) => {
  console.log('Conversation created:', data);
});

// Subscribe once
events.once('app:ready', () => {
  console.log('App is ready');
});

// Emit custom events
events.emit('my-plugin:action', { data: 'value' });

// Unsubscribe
unsubscribe();
```

Built-in events:
- `conversation:created` - New conversation created
- `conversation:updated` - Conversation updated
- `conversation:deleted` - Conversation deleted
- `knowledge:added` - Knowledge entry added
- `settings:changed` - Setting changed
- `plugin:loaded` - Plugin loaded
- `plugin:enabled` - Plugin enabled
- `plugin:disabled` - Plugin disabled

### Storage API

Store plugin-specific data:

```typescript
const storage = this.getStorage();

// Key-value storage
await storage.set('my-key', { data: 'value' });
const value = await storage.get('my-key');
await storage.delete('my-key');

// File storage
await storage.setFile('file-id', file);
const file = await storage.getFile('file-id');
await storage.deleteFile('file-id');

// List keys
const keys = await storage.keys();

// Get storage size
const size = await storage.getSize();
```

### Network API

Make HTTP requests:

```typescript
const network = this.getNetwork();

// GET request
const data = await network.get('https://api.example.com/data');

// POST request
const result = await network.post('https://api.example.com/create', {
  name: 'Example',
});

// With options
const response = await network.get('https://api.example.com/data', {
  headers: { 'Authorization': 'Bearer token' },
  params: { page: 1, limit: 10 },
  timeout: 5000,
  cache: true,
});
```

### Export/Import API

Create custom export/import formats:

```typescript
const exportApi = this.getExport();

// Register export format
exportApi.registerExportFormat({
  id: 'my-format',
  name: 'My Format',
  extension: 'myf',
  mimeType: 'application/json',
  handler: async (data) => {
    return {
      data: JSON.stringify(data, null, 2),
      filename: 'export.myf',
      mimeType: 'application/json',
    };
  },
});

// Export data
const result = await exportApi.export('my-format', conversations);
await exportApi.exportToFile('my-format', conversations);

// Register import format
exportApi.registerImportFormat({
  id: 'my-format',
  name: 'My Format',
  extensions: ['myf'],
  handler: async (data) => {
    const parsed = JSON.parse(data);
    return {
      data: parsed,
      count: parsed.length,
    };
  },
});

// Import data
const result = await exportApi.import('my-format', fileContent);
```

### Logger

Log messages with context:

```typescript
const logger = this.getLogger();

logger.debug('Detailed debug information');
logger.info('Informational message');
logger.warn('Warning message');
logger.error('Error message', error);

// Create child logger with context
const childLogger = logger.child({ component: 'MyComponent' });
childLogger.info('Message with component context');
```

### Utils API

Utility functions:

```typescript
const utils = this.getUtils();

// Generate ID
const id = utils.generateId();

// Debounce function
const debounced = utils.debounce(myFunction, 300);

// Format date
const formatted = utils.formatDate(new Date(), 'ISO');

// Deep clone
const cloned = utils.deepClone(object);

// String utilities
const slug = utils.slugify('Hello World!'); // 'hello-world'
const truncated = utils.truncate(text, 100);

// Validation
const isValid = utils.isValidEmail('user@example.com');

// Array utilities
const chunks = utils.chunk(array, 10);
const unique = utils.unique(array);

// Async utilities
await utils.sleep(1000);
const result = await utils.retry(myFunction, 3, 1000);
```

## Plugin Settings

Plugins can store their own settings:

```typescript
const settings = this.getSettings();

// Get setting
const apiKey = settings.get('apiKey', '');

// Set setting
await settings.set('apiKey', 'new-key');

// Watch for changes
settings.onChange((key, value) => {
  console.log(`Setting ${key} changed to`, value);
});
```

## Validation

Validate your plugin before distribution:

```typescript
import { validatePlugin, validateManifest, formatValidationErrors } from '@personallog/sdk';

// Validate plugin class
if (validatePlugin(MyPlugin)) {
  console.log('Plugin is valid!');
}

// Validate manifest
const result = validateManifest(manifest);
if (!result.valid) {
  console.error(formatValidationErrors(result));
}
```

## Best Practices

### 1. Error Handling

Always handle errors properly:

```typescript
async onLoad(context: PluginContext) {
  try {
    await this.initialize();
  } catch (error) {
    context.logger.error('Failed to initialize', error);
    context.ui.showNotification({
      message: 'Failed to initialize plugin',
      type: 'error',
    });
  }
}
```

### 2. Cleanup

Clean up resources in `onDisable` and `onUnload`:

```typescript
async onDisable(context: PluginContext) {
  // Stop timers
  if (this.timer) {
    clearInterval(this.timer);
  }

  // Unsubscribe from events
  this.cleanup(); // Call base cleanup method
}

async onUnload(context: PluginContext) {
  await this.cleanup();
  await context.storage.clear();
}
```

### 3. Use Cleanup Functions

Register cleanup functions for automatic cleanup:

```typescript
async onLoad(context: PluginContext) {
  // Register event listener with cleanup
  const unsubscribe = context.events.on('event', handler);
  this.registerCleanup(unsubscribe);

  // All registered cleanup functions are called automatically
}
```

### 4. Type Safety

Use TypeScript for better type safety:

```typescript
interface MyPluginSettings {
  apiKey: string;
  maxResults: number;
}

async onLoad(context: PluginContext) {
  const settings = context.settings.getAll() as MyPluginSettings;
  // Now you have type-safe settings
}
```

### 5. Logging

Use appropriate log levels:

```typescript
logger.debug('Detailed diagnostic info');     // Only in debug mode
logger.info('Normal informational message');  // Default level
logger.warn('Warning about potential issue'); // Something to watch
logger.error('Error occurred', error);        // Always shown
```

## Examples

See the `/examples/plugins` directory for complete examples:

- **hello-world** - Simple plugin with UI
- **custom-ai** - Custom AI provider
- **custom-export** - Custom export format
- **ui-extension** - Complex UI extensions

## Troubleshooting

### Plugin Not Loading

Check:
1. Manifest is valid (use `validateManifest`)
2. Plugin class extends `Plugin`
3. Required capabilities are declared
4. No TypeScript errors

### Can't Access Data

Check:
1. Required capabilities are in manifest
2. Plugin is enabled
3. Check browser console for errors

### UI Not Showing

Check:
1. UI capability is declared
2. Menu/view is registered in `onLoad`
3. Paths are correct

## Support

- GitHub: https://github.com/SuperInstance/PersonalLog
- Issues: https://github.com/SuperInstance/PersonalLog/issues

## License

MIT
