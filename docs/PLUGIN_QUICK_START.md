# Plugin Quick Start Guide

**Get your first plugin running in 10 minutes**

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Creating Your First Plugin](#creating-your-first-plugin)
3. [Plugin Structure](#plugin-structure)
4. [Step-by-Step Tutorial](#step-by-step-tutorial)
5. [Testing Your Plugin](#testing-your-plugin)
6. [Common Patterns](#common-patterns)
7. [Debugging Tips](#debugging-tips)
8. [Next Steps](#next-steps)

---

## Prerequisites

Before creating a plugin, ensure you have:

- **Node.js** 18+ and npm/yarn installed
- **TypeScript** knowledge
- **PersonalLog** application running
- Basic understanding of **React** (for UI plugins)
- **Git** for version control

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/personallog.git
cd personallog

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## Creating Your First Plugin

### Quick Start: Using the Template

The fastest way to create a plugin is using the plugin template:

```bash
# Create plugin from template
npx create-personallog-plugin my-first-plugin

# Navigate to plugin directory
cd my-first-plugin

# Install dependencies
npm install

# Start development
npm run dev
```

### Manual Setup

If you prefer manual setup:

```bash
# Create plugin directory
mkdir my-plugin
cd my-plugin

# Initialize npm project
npm init -y

# Install PersonalLog plugin SDK
npm install @personallog/plugin-sdk

# Create plugin structure
mkdir src
touch src/main.ts
touch manifest.json
```

---

## Plugin Structure

### Minimal Plugin Structure

```
my-plugin/
├── manifest.json       # Plugin metadata
├── src/
│   └── main.ts         # Plugin entry point
├── package.json        # npm package file
└── README.md          # Documentation
```

### Complete Plugin Structure

```
my-plugin/
├── manifest.json          # Plugin metadata
├── src/
│   ├── main.ts            # Main entry point
│   ├── ui/                # UI components
│   │   ├── Component.tsx
│   │   └── View.tsx
│   ├── api/               # API wrappers
│   │   └── client.ts
│   ├── utils/             # Utilities
│   │   └── helpers.ts
│   └── types/             # TypeScript types
│       └── index.ts
├── public/                # Static assets
│   └── icon.png
├── tests/                 # Test files
│   └── main.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Step-by-Step Tutorial

### Step 1: Create Manifest

Create `manifest.json`:

```json
{
  "id": "mycompany.hello-world",
  "name": "Hello World Plugin",
  "description": "A simple plugin that says hello",
  "version": "1.0.0",
  "minAppVersion": "1.0.0",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "license": "MIT",
  "type": ["ui"],
  "keywords": ["hello", "world", "demo"],
  "categories": ["utilities"],
  "permissions": [
    "messages:write"
  ],
  "settingsSchema": {
    "greeting": {
      "type": "string",
      "label": "Greeting Message",
      "description": "The greeting to display",
      "default": "Hello, World!",
      "required": false
    }
  },
  "defaultSettings": {
    "greeting": "Hello, World!"
  }
}
```

### Step 2: Create Plugin Code

Create `src/main.ts`:

```typescript
/**
 * Hello World Plugin
 *
 * A simple plugin that demonstrates the basics of plugin development
 */

import type { PluginActivationContext, PluginAPIContext } from '@personallog/plugin-sdk';

// ========================================
// LIFECYCLE HOOKS
// ========================================

/**
 * Called when plugin is activated
 */
export async function onActivate(context: PluginActivationContext): Promise<void> {
  const { api, logger, settings } = context;

  logger.info('Hello World plugin activating!');

  // Register a simple UI component
  api.ui.registerComponent({
    id: 'hello-world-display',
    name: 'Hello World Display',
    description: 'Displays a greeting message',
    category: 'message',
    render: `({ context }) => {
      const [greeting, setGreeting] = React.useState(
        context.settings.greeting || 'Hello, World!'
      );

      return React.createElement('div', {
        style: {
          padding: '20px',
          background: '#f0f0f0',
          borderRadius: '8px',
          textAlign: 'center'
        }
      },
      React.createElement('h2', {}, greeting),
      React.createElement('p', {}, 'Welcome to the Hello World plugin!')
      );
    }`
  });

  // Register a command
  api.commands.register({
    id: 'hello-world.say-hello',
    title: 'Say Hello',
    description: 'Display a hello message',
    handler: 'async (context) => { await context.api.messages.create("conv-id", { type: "text", author: "HelloWorld", content: context.settings.greeting }); }'
  });

  logger.info('Hello World plugin activated successfully!');
}

/**
 * Called when plugin is deactivated
 */
export async function onDeactivate(context: PluginAPIContext): Promise<void> {
  context.logger.info('Hello World plugin deactivating');

  // Cleanup if needed
  // Note: Components and commands are automatically unregistered
}

/**
 * Called when plugin settings change
 */
export async function onSettingsChange(
  newSettings: Record<string, any>,
  oldSettings: Record<string, any>,
  context: PluginAPIContext
): Promise<void> {
  context.logger.info('Settings changed', {
    old: oldSettings,
    new: newSettings
  });

  // React to setting changes
  if (newSettings.greeting !== oldSettings.greeting) {
    context.logger.info(`Greeting changed to: ${newSettings.greeting}`);
  }
}

/**
 * Called when plugin is uninstalled
 */
export async function onUninstall(context: PluginAPIContext): Promise<void> {
  context.logger.info('Hello World plugin uninstalling');

  // Clean up plugin data
  await context.storage.clear();

  context.logger.info('All plugin data cleared');
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get current greeting from settings
 */
export async function getGreeting(context: PluginAPIContext): Promise<string> {
  const settings = await context.api.settings.getAll();
  return settings.greeting || 'Hello, World!';
}

/**
 * Set greeting in settings
 */
export async function setGreeting(
  context: PluginAPIContext,
  greeting: string
): Promise<void> {
  await context.api.settings.set('greeting', greeting);
  context.logger.info(`Greeting updated to: ${greeting}`);
}
```

### Step 3: Create Package File

Create `package.json`:

```json
{
  "name": "my-hello-world-plugin",
  "version": "1.0.0",
  "description": "A simple hello world plugin",
  "main": "dist/main.js",
  "types": "dist/main.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest",
    "package": "npm run build && zip -r plugin.zip dist manifest.json"
  },
  "keywords": ["personallog", "plugin"],
  "author": "Your Name",
  "license": "MIT",
  "devDependencies": {
    "@personallog/plugin-sdk": "^1.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

### Step 4: Create TypeScript Config

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Step 5: Build Plugin

```bash
# Build the plugin
npm run build

# Package for distribution
npm run package
```

This creates `plugin.zip` ready for installation.

---

## Testing Your Plugin

### Local Testing

1. **Install Plugin Locally:**

```bash
# In PersonalLog directory
npm run plugin:install -- --path=/path/to/my-plugin
```

2. **Enable Plugin:**

```bash
npm run plugin:enable -- --id=mycompany.hello-world
```

3. **View Logs:**

```bash
npm run plugin:logs -- --id=mycompany.hello-world
```

### Manual Testing

```typescript
// tests/manual.test.ts
import { describe, it, expect } from 'vitest';
import { createTestContext } from '@personallog/plugin-sdk/testing';

describe('Hello World Plugin', () => {
  it('should activate successfully', async () => {
    const context = createTestContext({
      settings: { greeting: 'Test Greeting' }
    });

    // Import and activate plugin
    const { onActivate } = await import('../src/main');
    await onActivate(context);

    // Verify registration
    expect(context.api.ui.registerComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'hello-world-display'
      })
    );
  });

  it('should get greeting correctly', async () => {
    const context = createTestContext({
      settings: { greeting: 'Test' }
    });

    const { getGreeting } = await import('../src/main');
    const greeting = await getGreeting(context);

    expect(greeting).toBe('Test');
  });
});
```

### Automated Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

---

## Common Patterns

### Pattern 1: Message Listener

```typescript
export async function onActivate(context: PluginActivationContext) {
  const { api, events } = context;

  // Listen for new messages
  events.on('message:received', async (message) => {
    context.logger.info('New message received', message);

    // Process message
    await processMessage(message, context);
  });
}

async function processMessage(message: any, context: PluginAPIContext) {
  // Store in plugin cache
  const cache = await context.storage.get('messageCache') || [];
  cache.push(message);
  await context.storage.set('messageCache', cache);
}
```

### Pattern 2: Periodic Task

```typescript
export async function onActivate(context: PluginActivationContext) {
  const { events } = context;

  // Run every minute
  const interval = setInterval(async () => {
    await performPeriodicTask(context);
  }, 60000);

  // Cleanup on deactivate
  events.on('plugin:deactivate', () => {
    clearInterval(interval);
  });
}

async function performPeriodicTask(context: PluginAPIContext) {
  context.logger.info('Running periodic task');

  // Do work
  const stats = await context.api.analytics.getMetrics();

  // Store results
  await context.storage.set('last-stats', stats);
}
```

### Pattern 3: Command Handler

```typescript
export async function onActivate(context: PluginActivationContext) {
  const { api } = context;

  // Register multiple commands
  api.commands.register({
    id: 'myplugin.start',
    title: 'Start Task',
    description: 'Start a background task',
    handler: 'async (context) => { await startTask(context); }'
  });

  api.commands.register({
    id: 'myplugin.stop',
    title: 'Stop Task',
    description: 'Stop the background task',
    handler: 'async (context) => { await stopTask(context); }'
  });
}

async function startTask(context: PluginAPIContext) {
  await context.storage.set('taskRunning', true);
  context.logger.info('Task started');
}

async function stopTask(context: PluginAPIContext) {
  await context.storage.set('taskRunning', false);
  context.logger.info('Task stopped');
}
```

### Pattern 4: UI Component with State

```typescript
api.ui.registerComponent({
  id: 'my-counter',
  name: 'Counter',
  category: 'message',
  render: `() => {
    const [count, setCount] = React.useState(0);

    return React.createElement('div', { className: 'counter' },
      React.createElement('p', {}, `Count: ${count}`),
      React.createElement('button', {
        onClick: () => setCount(c => c + 1)
      }, 'Increment'),
      React.createElement('button', {
        onClick: () => setCount(0)
      }, 'Reset')
    );
  }`
});
```

### Pattern 5: Data Fetching with Cache

```typescript
async function fetchDataWithCache(
  context: PluginAPIContext,
  url: string,
  ttl: number = 3600000
): Promise<any> {
  const cacheKey = `cache-${url}`;
  const cached = await context.storage.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < ttl) {
    context.logger.info('Using cached data');
    return cached.data;
  }

  // Fetch fresh data
  const response = await fetch(url);
  const data = await response.json();

  // Cache result
  await context.storage.set(cacheKey, {
    data,
    timestamp: Date.now()
  });

  return data;
}
```

---

## Debugging Tips

### Enable Debug Logging

```typescript
export async function onActivate(context: PluginActivationContext) {
  // Set log level
  context.logger.setLevel('debug');

  context.logger.debug('Debug mode enabled');
  context.logger.debug('Context:', context);
}
```

### Error Handling

```typescript
export async function onActivate(context: PluginActivationContext) {
  try {
    await riskyOperation(context);
  } catch (error) {
    context.logger.error('Operation failed', {
      error: error.message,
      stack: error.stack
    });

    // Report error
    await context.api.analytics.trackEvent('plugin.error', {
      message: error.message
    });
  }
}
```

### Performance Monitoring

```typescript
export async function onActivate(context: PluginActivationContext) {
  const startTime = Date.now();

  // Do work
  await initializePlugin(context);

  const duration = Date.now() - startTime;
  context.logger.info(`Plugin activated in ${duration}ms`);

  // Track performance
  await context.api.analytics.trackEvent('plugin.performance', {
    duration
  });
}
```

### Using DevTools

1. **Open Browser DevTools** (F12)
2. **Go to Console** - See plugin logs
3. **Go to Network** - Monitor API calls
4. **Go to Application** - Check IndexedDB storage

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Plugin not activating | Check manifest.json for errors |
| Permission denied | Add required permissions to manifest |
| Module not found | Ensure all imports are correct |
| Type errors | Run `npm run type-check` |
| Storage error | Clear plugin storage and retry |

---

## Next Steps

### Learn More

- [Plugin System Architecture](./PLUGIN_SYSTEM.md) - Deep dive into plugin architecture
- [Plugin API Reference](./PLUGIN_API_REFERENCE.md) - Complete API documentation
- [Plugin Examples](./PLUGIN_EXAMPLES.md) - Real-world plugin examples

### Advanced Topics

1. **UI Components**: Create rich interactive components
2. **Data Processing**: Transform and validate data
3. **AI Integration**: Add custom AI providers
4. **Export/Import**: Handle data import/export
5. **Analytics**: Track custom metrics

### Community

- Join the [PersonalLog Discord](https://discord.gg/personallog)
- Browse the [Plugin Marketplace](https://plugins.personallog.ai)
- Contribute to the [Plugin Templates](https://github.com/personallog/plugins)

### Publishing

When your plugin is ready:

1. Test thoroughly
2. Write documentation
3. Create plugin package
4. Submit to marketplace
5. Get community feedback

---

**Happy Plugin Development!** 🚀

---

**Last Updated:** 2025-01-07
**Plugin System Version:** 1.0.0
