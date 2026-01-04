/**
 * PersonalLog Plugin SDK - Event System Implementation
 *
 * Provides event subscription and emission capabilities.
 *
 * @packageDocumentation
 */

import type { EventAPI } from '../types';

// ============================================================================
// EVENT API IMPLEMENTATION
// ============================================================================

/**
 * Event API implementation
 *
 * Provides a pub/sub event system for plugins.
 */
class EventAPIImpl implements EventAPI {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private onceListeners: Map<string, Set<(data: any) => void>> = new Map();

  // ========================================================================
  // SUBSCRIPTION
  // ========================================================================

  on<T = any>(event: string, handler: (data: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }

  once<T = any>(event: string, handler: (data: T) => void): () => void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }

    // Wrap handler to auto-remove after first call
    const wrappedHandler = (data: T) => {
      handler(data);
      this.onceListeners.get(event)?.delete(wrappedHandler);
    };

    this.onceListeners.get(event)!.add(wrappedHandler as any);

    // Return unsubscribe function
    return () => {
      this.onceListeners.get(event)?.delete(wrappedHandler as any);
    };
  }

  off(event: string, handler?: (data: any) => void): void {
    if (handler) {
      // Remove specific handler
      this.listeners.get(event)?.delete(handler);
      this.onceListeners.get(event)?.delete(handler);
    } else {
      // Remove all handlers for event
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    }
  }

  // ========================================================================
  // EMISSION
  // ========================================================================

  emit<T = any>(event: string, data: T): void {
    // Call regular listeners
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const handler of listeners) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      }
    }

    // Call once listeners
    const onceListeners = this.onceListeners.get(event);
    if (onceListeners) {
      for (const handler of onceListeners) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in once event handler for ${event}:`, error);
        }
      }
      // Clear once listeners after calling
      onceListeners.clear();
    }

    // Also emit as window event for cross-context communication
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('plugin-event', {
          detail: { event, data },
        })
      );
    }
  }

  // ========================================================================
  // INSPECTION
  // ========================================================================

  events(): string[] {
    const eventNames = new Set<string>();
    for (const event of this.listeners.keys()) {
      eventNames.add(event);
    }
    for (const event of this.onceListeners.keys()) {
      eventNames.add(event);
    }
    return Array.from(eventNames);
  }

  listenerCount(event: string): number {
    const regular = this.listeners.get(event)?.size || 0;
    const once = this.onceListeners.get(event)?.size || 0;
    return regular + once;
  }

  // ========================================================================
  // CLEANUP
  // ========================================================================

  clear(): void {
    this.listeners.clear();
    this.onceListeners.clear();
  }
}

// ============================================================================
// GLOBAL EVENT BUS
// ============================================================================

/**
 * Global event bus for cross-plugin communication
 *
 * Events are namespaced with prefixes:
 * - `conversation:*` - Conversation events
 * - `knowledge:*` - Knowledge base events
 * - `settings:*` - Settings events
 * - `ui:*` - UI events
 * - `ai:*` - AI events
 * - `plugin:*` - Plugin lifecycle events
 * - `custom:*` - Custom plugin events
 */
export const EventBus = new EventAPIImpl();

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new Event API instance
 *
 * @param isolated - If true, creates an isolated event bus (not connected to global)
 * @returns Event API instance
 */
export function createEventAPI(isolated: boolean = false): EventAPI {
  if (isolated) {
    return new EventAPIImpl();
  }
  return EventBus;
}

export default EventAPIImpl;
