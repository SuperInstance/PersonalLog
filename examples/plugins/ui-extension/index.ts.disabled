/**
 * UI Extension Plugin
 *
 * Demonstrates advanced UI extensions including:
 * - Custom sidebar items
 * - Custom views
 * - Modal dialogs
 * - Notifications with actions
 */

import { Plugin, PluginContext, PluginManifest } from '@/sdk';

// ============================================================================
// PLUGIN MANIFEST
// ============================================================================

const manifest: PluginManifest = {
  id: 'ui-extension-plugin',
  name: 'UI Extensions Demo',
  description: 'Demonstrates advanced UI extension capabilities',
  version: '1.0.0',
  author: 'PersonalLog Team',
  capabilities: {
    ui: {
      menu: true,
      sidebar: true,
      modal: true,
      views: true,
    },
    conversations: true,
  },
  entryPoints: {
    plugin: 'UIExtensionPlugin',
  },
};

// ============================================================================
// PLUGIN CLASS
// ============================================================================

export class UIExtensionPlugin extends Plugin {
  manifest = manifest;
  private stats = {
    menuClicks: 0,
    modalOpens: 0,
    notificationsShown: 0,
  };

  async onLoad(context: PluginContext): Promise<void> {
    this.context = context;

    context.logger.info('UI Extension Plugin loaded');

    // Register sidebar item
    context.ui.registerSidebarItem({
      id: 'ui-demo-sidebar',
      label: 'UI Demo',
      path: '/plugins/ui-demo',
      icon: 'Layout',
      order: 100,
    });

    // Register menu items
    context.ui.registerMenuItem({
      id: 'ui-demo-show-modal',
      label: 'Show Demo Modal',
      location: 'main',
      action: 'showDemoModal',
      order: 100,
    });

    context.ui.registerMenuItem({
      id: 'ui-demo-show-notification',
      label: 'Show Demo Notification',
      location: 'main',
      action: 'showDemoNotification',
      order: 101,
    });

    context.ui.registerMenuItem({
      id: 'ui-demo-show-stats',
      label: 'Show Plugin Stats',
      location: 'main',
      action: 'showStats',
      order: 102,
    });

    // Register custom view
    context.ui.registerView({
      id: 'ui-demo-view',
      title: 'UI Extensions Demo',
      path: '/plugins/ui-demo',
      component: 'UIDemoView',
      layout: 'default',
    });

    // Listen for events
    context.events.on('conversation:created', (data: any) => {
      context.logger.info('New conversation created, updating stats');
    });
  }

  async onEnable(context: PluginContext): Promise<void> {
    context.ui.showNotification({
      message: 'UI Extensions Demo enabled! Check the sidebar and menu.',
      type: 'success',
      duration: 5000,
    });
  }

  async onDisable(context: PluginContext): Promise<void> {
    context.ui.showNotification({
      message: 'UI Extensions Demo disabled',
      type: 'info',
      duration: 3000,
    });
  }

  async onUnload(context: PluginContext): Promise<void> {
    context.logger.info('UI Extension Plugin unloaded');
  }

  /**
   * Show demo modal with interactive elements
   */
  async showDemoModal(): Promise<void> {
    const context = this.getContext();
    const ui = context.ui;

    this.stats.modalOpens++;

    try {
      // Show modal with confirmation
      const result = await ui.showModal({
        title: 'UI Extensions Demo',
        content: {
          type: 'confirmation',
          message: 'This is a demo modal. Would you like to see a notification?',
        },
        size: 'medium',
        closable: true,
      });

      if (result) {
        ui.showNotification({
          message: 'Modal confirmed!',
          type: 'success',
          duration: 3000,
        });
      } else {
        ui.showNotification({
          message: 'Modal cancelled',
          type: 'info',
          duration: 3000,
        });
      }

      context.logger.info(`Modal opened (count: ${this.stats.modalOpens})`);
    } catch (error) {
      context.logger.error('Modal error:', error);
    }
  }

  /**
   * Show demo notification with action button
   */
  async showDemoNotification(): Promise<void> {
    const context = this.getContext();
    const ui = context.ui;

    this.stats.notificationsShown++;

    ui.showNotification({
      message: 'This is a demo notification with an action button',
      type: 'info',
      duration: 0, // Don't auto-dismiss
      action: {
        label: 'Click Me',
        callback: () => {
          ui.showNotification({
            message: 'Action button clicked!',
            type: 'success',
            duration: 3000,
          });
        },
      },
    });

    context.logger.info(`Notification shown (count: ${this.stats.notificationsShown})`);
  }

  /**
   * Show plugin statistics
   */
  async showStats(): Promise<void> {
    const context = this.getContext();
    const ui = context.ui;

    this.stats.menuClicks++;

    const message = `
Plugin Statistics:
- Menu clicks: ${this.stats.menuClicks}
- Modal opens: ${this.stats.modalOpens}
- Notifications shown: ${this.stats.notificationsShown}
    `.trim();

    ui.showNotification({
      message,
      type: 'info',
      duration: 8000,
    });

    context.logger.info('Stats displayed:', this.stats);
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default UIExtensionPlugin;
