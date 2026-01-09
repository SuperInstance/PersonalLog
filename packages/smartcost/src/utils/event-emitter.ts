/**
 * Simple EventEmitter Implementation
 *
 * Lightweight event emitter to avoid external dependencies
 */

export type EventHandler = (...args: any[]) => void;

export class EventEmitter {
  private events: Map<string, EventHandler[]> = new Map();

  /**
   * Register event handler
   */
  public on(event: string, handler: EventHandler): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(handler);
    return this;
  }

  /**
   * Register one-time event handler
   */
  public once(event: string, handler: EventHandler): this {
    const onceHandler = (...args: any[]) => {
      handler(...args);
      this.off(event, onceHandler);
    };
    return this.on(event, onceHandler);
  }

  /**
   * Remove event handler
   */
  public off(event: string, handler: EventHandler): this {
    const handlers = this.events.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  /**
   * Emit event
   */
  public emit(event: string, ...args: any[]): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Remove all event handlers
   */
  public removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  /**
   * Get event handler count
   */
  public listenerCount(event: string): number {
    const handlers = this.events.get(event);
    return handlers ? handlers.length : 0;
  }
}
