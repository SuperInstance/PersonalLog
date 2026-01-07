/**
 * Hello World Plugin
 *
 * A simple plugin demonstrating the basics of PersonalLog plugin development.
 * This plugin shows how to:
 * - Use lifecycle hooks (onActivate, onDeactivate)
 * - Register UI components
 * - Register commands
 * - Store and retrieve data
 * - Use the logger
 * - Handle settings changes
 *
 * @module examples/hello-world
 */

import type {
  PluginActivationContext,
  PluginAPIContext
} from '../../../../src/lib/plugin/types';

// ========================================
// TYPE DEFINITIONS
// ========================================

interface GreetingData {
  count: number;
  lastGreeting: string;
  lastTimestamp?: number;
}

interface HelloWorldSettings {
  greeting: string;
  showTimestamp: boolean;
}

// ========================================
// LIFECYCLE HOOKS
// ========================================

/**
 * Called when the plugin is activated
 *
 * @param context - Plugin activation context with API access
 */
export async function onActivate(
  context: PluginActivationContext
): Promise<void> {
  const { api, logger, settings, storage } = context;

  logger.info('Hello World plugin activating!', {
    version: context.version,
    permissions: context.permissions
  });

  // Initialize storage if needed
  const data = await storage.get('greeting-data');
  if (!data) {
    await storage.set('greeting-data', {
      count: 0,
      lastGreeting: 'Never',
      lastTimestamp: Date.now()
    });
  }

  // Register UI component
  registerGreetingComponent(api, settings);

  // Register command
  registerGreetingCommand(api);

  // Listen for messages
  setupMessageListener(api.events, context);

  logger.info('Hello World plugin activated successfully!');
}

/**
 * Called when the plugin is deactivated
 *
 * @param context - Plugin API context
 */
export async function onDeactivate(
  context: PluginAPIContext
): Promise<void> {
  context.logger.info('Hello World plugin deactivating');

  // Components and commands are automatically unregistered
  // Clean up any resources if needed
}

/**
 * Called when plugin settings change
 *
 * @param newSettings - New settings values
 * @param oldSettings - Previous settings values
 * @param context - Plugin API context
 */
export async function onSettingsChange(
  newSettings: Record<string, any>,
  oldSettings: Record<string, any>,
  context: PluginAPIContext
): Promise<void> {
  const settings = newSettings as HelloWorldSettings;

  context.logger.info('Settings changed', {
    old: oldSettings,
    new: newSettings
  });

  // React to specific setting changes
  if (newSettings.greeting !== oldSettings.greeting) {
    context.logger.info(`Greeting updated to: "${settings.greeting}"`);

    // Track analytics event
    await context.api.analytics.trackEvent('greeting.changed', {
      newGreeting: settings.greeting
    });
  }
}

/**
 * Called when the plugin is uninstalled
 *
 * @param context - Plugin API context
 */
export async function onUninstall(
  context: PluginAPIContext
): Promise<void> {
  context.logger.info('Hello World plugin uninstalling');

  // Clean up all plugin data
  await context.storage.clear();

  context.logger.info('All plugin data cleared');
}

// ========================================
// COMPONENT REGISTRATION
// ========================================

/**
 * Register the greeting UI component
 *
 * @param api - Plugin API surface
 * @param settings - Plugin settings
 */
function registerGreetingComponent(
  api: any,
  settings: HelloWorldSettings
): void {
  api.ui.registerComponent({
    id: 'hello-world-greeting',
    name: 'Hello World Greeting',
    description: 'Displays a customizable greeting',
    category: 'header',
    render: `({ context }) => {
      const [greeting, setGreeting] = React.useState(
        context.settings.greeting || 'Hello, World!'
      );

      return React.createElement('div', {
        style: {
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: '8px',
          marginBottom: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }
      },
        React.createElement('h2', {
          style: { margin: 0, fontSize: '1.5em' }
        }, greeting)
      );
    }`
  });
}

// ========================================
// COMMAND REGISTRATION
// ========================================

/**
 * Register the greeting command
 *
 * @param api - Plugin API surface
 */
function registerGreetingCommand(api: any): void {
  api.commands.register({
    id: 'helloworld.say-hello',
    title: 'Say Hello',
    description: 'Display a hello message in the current conversation',
    handler: 'async (context) => { return await sayHello(context); }'
  });
}

/**
 * Execute the say hello command
 *
 * @param context - Plugin API context
 * @returns The greeting message
 */
async function sayHello(context: PluginAPIContext): Promise<string> {
  const settings = (context.settings || {}) as HelloWorldSettings;
  const greeting = settings.greeting || 'Hello, World!';

  // Update statistics
  const data = await context.storage.get('greeting-data') as GreetingData;
  const updatedData: GreetingData = {
    count: (data?.count || 0) + 1,
    lastGreeting: greeting,
    lastTimestamp: settings.showTimestamp ? Date.now() : undefined
  };
  await context.storage.set('greeting-data', updatedData);

  // Log the greeting
  context.logger.info('Greeting sent', {
    greeting,
    count: updatedData.count
  });

  return greeting;
}

// ========================================
// EVENT LISTENERS
// ========================================

/**
 * Setup message listener
 *
 * @param events - Event bus
 * @param context - Plugin context
 */
function setupMessageListener(
  events: any,
  context: PluginAPIContext
): void {
  events.on('message:received', async (message: any) => {
    context.logger.debug('Message received', {
      messageId: message.id,
      conversationId: message.conversationId
    });

    // Track message received
    await context.api.analytics.trackEvent('message.received', {
      pluginId: context.pluginId,
      messageType: message.type
    });
  });
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get current greeting from settings
 *
 * @param context - Plugin API context
 * @returns The current greeting message
 */
export async function getGreeting(
  context: PluginAPIContext
): Promise<string> {
  const settings = await context.api.settings.getAll();
  return (settings.greeting as string) || 'Hello, World!';
}

/**
 * Set greeting in settings
 *
 * @param context - Plugin API context
 * @param greeting - New greeting message
 */
export async function setGreeting(
  context: PluginAPIContext,
  greeting: string
): Promise<void> {
  await context.api.settings.set('greeting', greeting);
  context.logger.info(`Greeting updated to: "${greeting}"`);
}

/**
 * Get greeting statistics
 *
 * @param context - Plugin API context
 * @returns Greeting usage statistics
 */
export async function getGreetingStats(
  context: PluginAPIContext
): Promise<GreetingData> {
  const data = await context.storage.get('greeting-data');
  return data || {
    count: 0,
    lastGreeting: 'Never',
    lastTimestamp: undefined
  };
}

/**
 * Reset greeting statistics
 *
 * @param context - Plugin API context
 */
export async function resetGreetingStats(
  context: PluginAPIContext
): Promise<void> {
  await context.storage.set('greeting-data', {
    count: 0,
    lastGreeting: 'Never',
    lastTimestamp: Date.now()
  });
  context.logger.info('Greeting statistics reset');
}
