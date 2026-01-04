/**
 * Hello World Plugin
 *
 * A simple plugin that demonstrates the basics of plugin development.
 * Adds a menu item that shows a notification when clicked.
 */

import { Plugin, PluginContext, PluginManifest } from '@/sdk';

// ============================================================================
// PLUGIN MANIFEST
// ============================================================================

const manifest: PluginManifest = {
  id: 'hello-world',
  name: 'Hello World',
  description: 'A simple plugin that says hello',
  version: '1.0.0',
  author: 'PersonalLog Team',
  capabilities: {
    ui: true,
  },
  entryPoints: {
    plugin: 'HelloWorldPlugin',
  },
};

// ============================================================================
// PLUGIN CLASS
// ============================================================================

export class HelloWorldPlugin extends Plugin {
  manifest = manifest;
  private clickCount = 0;

  /**
   * Called when plugin is loaded
   */
  async onLoad(context: PluginContext): Promise<void> {
    this.context = context;

    context.logger.info('Hello World Plugin loaded!');

    // Register menu item
    context.ui.registerMenuItem({
      id: 'hello-world-menu',
      label: 'Say Hello',
      location: 'main',
      action: 'sayHello',
      order: 1000,
    });

    // Listen for custom events
    context.events.on('hello-world:greet', (data) => {
      context.logger.info('Greet event received:', data);
    });
  }

  /**
   * Called when plugin is enabled
   */
  async onEnable(context: PluginContext): Promise<void> {
    context.ui.showNotification({
      message: 'Hello World Plugin enabled! Click "Say Hello" in the menu.',
      type: 'success',
      duration: 5000,
    });
  }

  /**
   * Called when plugin is disabled
   */
  async onDisable(context: PluginContext): Promise<void> {
    context.ui.showNotification({
      message: 'Goodbye! Hello World Plugin disabled.',
      type: 'info',
      duration: 3000,
    });
  }

  /**
   * Called when plugin is unloaded
   */
  async onUnload(context: PluginContext): Promise<void> {
    context.logger.info('Hello World Plugin unloaded');
  }

  /**
   * Menu action handler
   */
  async sayHello(): Promise<void> {
    const context = this.getContext();
    const ui = context.ui;
    const logger = context.logger;

    this.clickCount++;

    // Show notification
    ui.showNotification({
      message: `Hello, World! (Clicked ${this.clickCount} times)`,
      type: 'success',
      duration: 3000,
    });

    // Log
    logger.info(`Hello button clicked (count: ${this.clickCount})`);

    // Emit event
    context.events.emit('hello-world:greet', {
      count: this.clickCount,
      timestamp: new Date().toISOString(),
    });
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default HelloWorldPlugin;
