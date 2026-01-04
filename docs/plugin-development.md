# Plugin Development Guide

Complete guide to developing plugins for PersonalLog.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Plugin Structure](#plugin-structure)
3. [Plugin Manifest](#plugin-manifest)
4. [Plugin Lifecycle](#plugin-lifecycle)
5. [API Reference](#api-reference)
6. [Best Practices](#best-practices)
7. [Testing](#testing)
8. [Distribution](#distribution)

## Getting Started

### Prerequisites

- Node.js 18+
- TypeScript 5+
- Basic knowledge of React
- Familiarity with PersonalLog

### Project Setup

Create a new plugin project:

```bash
mkdir my-personallog-plugin
cd my-personallog-plugin
npm init -y
```

Install dependencies:

```bash
npm install @personallog/sdk
npm install --save-dev typescript @types/react
```

Configure TypeScript:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "jsx": "react",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

## Plugin Structure

A typical plugin structure:

```
my-plugin/
├── src/
│   ├── index.ts          # Main plugin file
│   ├── components/       # React components (if any)
│   └── utils/           # Helper functions
├── package.json
├── tsconfig.json
└── README.md
```

### Minimal Plugin Example

```typescript
// src/index.ts
import { Plugin, PluginContext, PluginManifest } from '@personallog/sdk';

const manifest: PluginManifest = {
  id: 'my-plugin',
  name: 'My Plugin',
  description: 'Does something cool',
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

export class MyPlugin extends Plugin {
  manifest = manifest;

  async onLoad(context: PluginContext) {
    context.logger.info('Plugin loaded!');
  }
}
```

## Plugin Manifest

The plugin manifest defines metadata and capabilities:

### Required Fields

```typescript
{
  id: string;              // Unique identifier (e.g., 'my-plugin')
  name: string;            // Display name
  description: string;     // What the plugin does
  version: string;         // Semver (e.g., '1.0.0')
  author: string;          // Author name or object
  capabilities: object;    // What the plugin can do
  entryPoints: object;     // Plugin entry points
}
```

### Optional Fields

```typescript
{
  homepage?: string;       // Homepage URL
  repository?: string;     // Repository URL
  license?: string;        // SPDX license identifier
  keywords?: string[];     // Search keywords
  icon?: string;           // Base64 icon or URL
  minAppVersion?: string;  // Minimum PersonalLog version
  maxAppVersion?: string;  // Maximum PersonalLog version
}
```

### Capabilities

Define what your plugin needs to access:

```typescript
capabilities: {
  // Conversation access
  conversations: true | {
    read?: boolean;
    create?: boolean;
    update?: boolean;
    delete?: boolean;
    scope?: 'all' | 'user' | string[];
  },

  // Knowledge base access
  knowledge: true | {
    read?: boolean;
    add?: boolean;
    update?: boolean;
    delete?: boolean;
    search?: boolean;
  },

  // AI provider access
  ai: true | {
    use?: boolean;
    createProvider?: boolean;
    providers?: string[];
  },

  // Settings access
  settings: boolean,

  // UI extensions
  ui: true | {
    menu?: boolean;
    sidebar?: boolean;
    toolbar?: boolean;
    modal?: boolean;
    components?: boolean;
    views?: boolean;
  },

  // Network access
  network: true | {
    http?: boolean;
    domains?: string[];
    rateLimit?: number;  // Requests per minute
  },

  // Storage access
  storage: true | {
    quota?: number;      // Max bytes
    files?: boolean;
    maxFileSize?: number;
  },

  // Custom export/import
  export: true | {
    export?: boolean;
    import?: boolean;
    formats?: string[];
  },
}
```

### Entry Points

Define which features your plugin implements:

```typescript
entryPoints: {
  // Main plugin class
  plugin?: string;

  // AI provider (if creating one)
  aiProvider?: string;

  // Export format handler
  exportFormat?: string;

  // Import format handler
  importFormat?: string;

  // UI extensions
  ui?: {
    menuItems?: MenuItemDefinition[];
    sidebarItems?: SidebarItemDefinition[];
    views?: ViewDefinition[];
    components?: ComponentDefinition[];
  };
}
```

## Plugin Lifecycle

Plugins have four lifecycle hooks:

### onLoad

Called when the plugin is first loaded. Use this to:

- Set up event listeners
- Register UI elements
- Initialize resources
- Register custom providers/formats

```typescript
async onLoad(context: PluginContext) {
  // Store context for later use
  this.context = context;

  // Register UI
  context.ui.registerMenuItem({
    id: 'my-menu',
    label: 'My Menu',
    location: 'main',
    action: 'handleMenu',
  });

  // Listen to events
  const unsubscribe = context.events.on('event', handler);
  this.registerCleanup(unsubscribe); // Auto-cleanup on disable

  // Initialize resources
  await this.initialize();
}
```

### onEnable

Called when the plugin is enabled. Use this to:

- Start active operations
- Begin polling/timers
- Show notifications
- Connect to external services

```typescript
async onEnable(context: PluginContext) {
  // Start timer
  this.timer = setInterval(() => {
    this.doPeriodicTask();
  }, 60000);

  // Show notification
  context.ui.showNotification({
    message: 'Plugin enabled!',
    type: 'success',
  });
}
```

### onDisable

Called when the plugin is disabled. Use this to:

- Stop timers
- Close connections
- Clean up resources
- Unsubscribe from events

```typescript
async onDisable(context: PluginContext) {
  // Stop timer
  if (this.timer) {
    clearInterval(this.timer);
    this.timer = null;
  }

  // Cleanup is automatic if you used registerCleanup
  this.cleanup();
}
```

### onUnload

Called when the plugin is unloaded. Use this to:

- Final cleanup
- Clear storage (optional)
- Release all resources

```typescript
async onUnload(context: PluginContext) {
  // Final cleanup
  this.cleanup();

  // Clear storage if desired
  await context.storage.clear();
}
```

## API Reference

### Data API

Access conversations, knowledge, and settings:

```typescript
const data = this.getData();

// Conversations
const conversations = await data.conversations.list({ limit: 10 });
const conversation = await data.conversations.get('conv-id');
await data.conversations.create({ title: 'New', type: 'personal' });
await data.conversations.update('conv-id', { title: 'Updated' });
await data.conversations.delete('conv-id');
const results = await data.conversations.search('query');

// Watch for changes
const unsubscribe = data.conversations.onChange((type, data) => {
  console.log(type, data);
});

// Knowledge
const entries = await data.knowledge.search('query');
const entry = await data.knowledge.add({ content: 'Text' });
await data.knowledge.update('id', { content: 'Updated' });
await data.knowledge.delete('id');

// Settings
const theme = data.settings.get('theme');
await data.settings.set('theme', 'dark');
```

### UI API

Extend the user interface:

```typescript
const ui = this.getUI();

// Menu items
ui.registerMenuItem({
  id: 'my-menu',
  label: 'My Menu',
  location: 'main',
  action: 'handleClick',
});

// Sidebar items
ui.registerSidebarItem({
  id: 'my-sidebar',
  label: 'My Sidebar',
  path: '/my-plugin',
  order: 100,
});

// Views
ui.registerView({
  id: 'my-view',
  title: 'My View',
  path: '/my-plugin',
  component: MyComponent,
});

// Modals
const result = await ui.showModal({
  title: 'My Modal',
  content: MyModalComponent,
  props: { data: 'value' },
  size: 'medium',
});

// Notifications
ui.showNotification({
  message: 'Success!',
  type: 'success',
  duration: 5000,
  action: {
    label: 'Undo',
    callback: () => console.log('Undo'),
  },
});

// Navigation
ui.navigate('/my-route');
```

### AI API

Interact with AI providers:

```typescript
const ai = this.getAI();

// List providers
const providers = ai.listProviders();

// Chat
const response = await ai.chat({
  providerId: 'openai',
  model: 'gpt-4',
  conversationId: 'conv-id',
  messages: [
    { role: 'user', content: 'Hello!' },
  ],
  temperature: 0.7,
});

// Stream
for await (const chunk of ai.chatStream(request)) {
  console.log(chunk.content);
}

// Custom provider
ai.registerProvider({
  id: 'my-provider',
  name: 'My Provider',
  type: 'local',
  models: [{ id: 'model', name: 'Model', contextWindow: 4096 }],
  chat: async (request) => ({ content: 'Response', model: request.model }),
});
```

### Event API

Subscribe to and emit events:

```typescript
const events = this.getEvents();

// Subscribe
const unsubscribe = events.on('event-name', (data) => {
  console.log(data);
});

// Subscribe once
events.once('event-name', (data) => {
  console.log(data);
});

// Emit
events.emit('my-event', { data: 'value' });

// Unsubscribe
unsubscribe();
```

Built-in events:
- `conversation:created`
- `conversation:updated`
- `conversation:deleted`
- `knowledge:added`
- `settings:changed`
- `plugin:loaded`
- `plugin:enabled`
- `plugin:disabled`

### Storage API

Store plugin data:

```typescript
const storage = this.getStorage();

// Key-value
await storage.set('key', { data: 'value' });
const value = await storage.get('key');
await storage.delete('key');
const keys = await storage.keys();
const size = await storage.getSize();

// Files
await storage.setFile('file-id', file);
const file = await storage.getFile('file-id');
await storage.deleteFile('file-id');
```

### Network API

Make HTTP requests:

```typescript
const network = this.getNetwork();

const data = await network.get('https://api.example.com/data');
const result = await network.post('https://api.example.com/create', { name: 'Test' });
```

### Export/Import API

Custom export/import formats:

```typescript
const exportApi = this.getExport();

// Register format
exportApi.registerExportFormat({
  id: 'my-format',
  name: 'My Format',
  extension: 'myf',
  mimeType: 'application/json',
  handler: async (data) => ({
    data: JSON.stringify(data),
    filename: 'export.myf',
    mimeType: 'application/json',
  }),
});

// Export
await exportApi.exportToFile('my-format', data);
```

## Best Practices

### 1. Error Handling

Always handle errors properly:

```typescript
async onLoad(context: PluginContext) {
  try {
    await this.initialize();
  } catch (error) {
    context.logger.error('Initialization failed', error);
    context.ui.showNotification({
      message: 'Failed to initialize',
      type: 'error',
    });
  }
}
```

### 2. Resource Cleanup

Use `registerCleanup` for automatic cleanup:

```typescript
async onLoad(context: PluginContext) {
  const unsubscribe = context.events.on('event', handler);
  this.registerCleanup(unsubscribe); // Auto-called on disable/unload
}
```

### 3. Type Safety

Use TypeScript for better type safety:

```typescript
interface MyPluginSettings {
  apiKey: string;
  maxResults: number;
}

async onLoad(context: PluginContext) {
  const settings = context.settings.getAll() as MyPluginSettings;
  // Now you have type safety
}
```

### 4. Logging

Use appropriate log levels:

```typescript
logger.debug('Detailed diagnostic info');   // Development only
logger.info('Normal informational message'); // Default
logger.warn('Warning about potential issue'); // Something to watch
logger.error('Error occurred', error);       // Always shown
```

### 5. Validation

Validate user input:

```typescript
async someMethod(input: string) {
  if (!input || input.trim().length === 0) {
    throw new Error('Input cannot be empty');
  }

  // Process input
}
```

### 6. Performance

- Debounce expensive operations
- Use caching where appropriate
- Clean up resources promptly
- Avoid blocking the main thread

## Testing

### Unit Testing

Test your plugin logic:

```typescript
import { MyPlugin } from './index';

describe('MyPlugin', () => {
  it('should initialize correctly', async () => {
    const plugin = new MyPlugin();
    const mockContext = createMockContext();

    await plugin.onLoad(mockContext);

    expect(plugin.context).toBe(mockContext);
  });
});
```

### Integration Testing

Test with real PersonalLog instance:

```typescript
describe('MyPlugin Integration', () => {
  it('should work with PersonalLog', async () => {
    // Load plugin in PersonalLog
    // Test functionality
    // Verify results
  });
});
```

## Distribution

### Building

Build your plugin:

```json
{
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  }
}
```

### Publishing

Publish to npm:

```bash
npm publish
```

### Distribution Options

1. **npm registry** - Public or private
2. **GitHub** - Release with assets
3. **Direct file** - Load from local file
4. **URL** - Load from URL

## Security Considerations

### 1. Validation

- Validate all user input
- Sanitize data before storage
- Check data types and formats

### 2. Permissions

- Request minimum capabilities needed
- Use capability scoping where possible
- Document why each capability is needed

### 3. Data Privacy

- Don't log sensitive information
- Encrypt stored data when appropriate
- Respect user privacy settings

### 4. Network Security

- Use HTTPS for all network requests
- Validate API responses
- Handle errors gracefully

## Troubleshooting

### Plugin Not Loading

1. Check manifest is valid
2. Verify plugin class extends Plugin
3. Check browser console for errors
4. Ensure required capabilities are declared

### Performance Issues

1. Profile your plugin code
2. Check for memory leaks
3. Optimize expensive operations
4. Use debouncing/throttling

### Type Errors

1. Ensure TypeScript is configured correctly
2. Check type definitions
3. Use `// @ts-ignore` sparingly
4. Update SDK if needed

## Resources

- [SDK API Reference](./plugin-api-reference.md)
- [Example Plugins](../examples/plugins)
- [PersonalLog Repository](https://github.com/SuperInstance/PersonalLog)
- [Issue Tracker](https://github.com/SuperInstance/PersonalLog/issues)

## Support

- GitHub Issues: https://github.com/SuperInstance/PersonalLog/issues
- Discussions: https://github.com/SuperInstance/PersonalLog/discussions
- Documentation: https://github.com/SuperInstance/PersonalLog/wiki
