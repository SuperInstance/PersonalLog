/**
 * PersonalLog Plugin SDK - UI API Implementation
 *
 * Provides UI extension capabilities for plugins.
 *
 * @packageDocumentation
 */

import type { ReactElement } from 'react';
import type {
  UIAPI,
  MenuItemDefinition,
  SidebarItemDefinition,
  ViewDefinition,
  ModalOptions,
  NotificationOptions,
} from '../types';

// ============================================================================
// UI API IMPLEMENTATION
// ============================================================================

/**
 * UI API implementation
 *
 * Provides methods for extending the UI.
 */
class UIAPIImpl implements UIAPI {
  private menuItems: Map<string, MenuItemDefinition> = new Map();
  private sidebarItems: Map<string, SidebarItemDefinition> = new Map();
  private views: Map<string, ViewDefinition> = new Map();

  // ========================================================================
  // MENU ITEMS
  // ========================================================================

  registerMenuItem(item: MenuItemDefinition): void {
    if (this.menuItems.has(item.id)) {
      throw new Error(`Menu item ${item.id} already registered`);
    }
    this.menuItems.set(item.id, item);

    // Emit event for UI to update
    this.emitEvent('ui:menu-item:registered', item);
  }

  unregisterMenuItem(id: string): void {
    if (!this.menuItems.has(id)) {
      throw new Error(`Menu item ${id} not found`);
    }
    this.menuItems.delete(id);
    this.emitEvent('ui:menu-item:unregistered', { id });
  }

  getMenuItem(id: string): MenuItemDefinition | undefined {
    return this.menuItems.get(id);
  }

  getMenuItems(): MenuItemDefinition[] {
    return Array.from(this.menuItems.values());
  }

  // ========================================================================
  // SIDEBAR ITEMS
  // ========================================================================

  registerSidebarItem(item: SidebarItemDefinition): void {
    if (this.sidebarItems.has(item.id)) {
      throw new Error(`Sidebar item ${item.id} already registered`);
    }
    this.sidebarItems.set(item.id, item);
    this.emitEvent('ui:sidebar-item:registered', item);
  }

  unregisterSidebarItem(id: string): void {
    if (!this.sidebarItems.has(id)) {
      throw new Error(`Sidebar item ${id} not found`);
    }
    this.sidebarItems.delete(id);
    this.emitEvent('ui:sidebar-item:unregistered', { id });
  }

  getSidebarItem(id: string): SidebarItemDefinition | undefined {
    return this.sidebarItems.get(id);
  }

  getSidebarItems(): SidebarItemDefinition[] {
    return Array.from(this.sidebarItems.values()).sort((a, b) => {
      return (a.order || 0) - (b.order || 0);
    });
  }

  // ========================================================================
  // VIEWS
  // ========================================================================

  registerView(view: ViewDefinition): void {
    if (this.views.has(view.id)) {
      throw new Error(`View ${view.id} already registered`);
    }
    this.views.set(view.id, view);
    this.emitEvent('ui:view:registered', view);
  }

  unregisterView(id: string): void {
    if (!this.views.has(id)) {
      throw new Error(`View ${id} not found`);
    }
    this.views.delete(id);
    this.emitEvent('ui:view:unregistered', { id });
  }

  getView(id: string): ViewDefinition | undefined {
    return this.views.get(id);
  }

  getViews(): ViewDefinition[] {
    return Array.from(this.views.values());
  }

  // ========================================================================
  // MODALS
  // ========================================================================

  async showModal<T = any>(options: ModalOptions): Promise<T> {
    return new Promise((resolve, reject) => {
      const modalId = `modal-${Date.now()}-${Math.random()}`;

      this.emitEvent('ui:modal:show', {
        id: modalId,
        ...options,
        onClose: (result: T) => resolve(result),
        onError: (error: Error) => reject(error),
      });
    });
  }

  closeModal(modalId: string): void {
    this.emitEvent('ui:modal:close', { id: modalId });
  }

  // ========================================================================
  // NOTIFICATIONS
  // ========================================================================

  showNotification(options: NotificationOptions): void {
    const notification = {
      id: `notif-${Date.now()}-${Math.random()}`,
      ...options,
    };

    this.emitEvent('ui:notification:show', notification);

    // Auto-dismiss after duration (if specified)
    if (options.duration && options.duration > 0) {
      setTimeout(() => {
        this.emitEvent('ui:notification:dismiss', { id: notification.id });
      }, options.duration);
    }
  }

  dismissNotification(notificationId: string): void {
    this.emitEvent('ui:notification:dismiss', { id: notificationId });
  }

  // ========================================================================
  // NAVIGATION
  // ========================================================================

  navigate(path: string): void {
    this.emitEvent('ui:navigate', { path });
  }

  // ========================================================================
  // EVENT SYSTEM
  // ========================================================================

  private emitEvent(event: string, data?: any): void {
    // Use window custom events for communication with the app
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('plugin-ui-event', {
          detail: { event, data },
        })
      );
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new UI API instance
 *
 * @returns UI API instance
 */
export function createUIAPI(): UIAPI {
  return new UIAPIImpl();
}

export default UIAPIImpl;
