/**
 * Agent Event Bus
 *
 * Pub/sub messaging system for agent communication.
 */

import type {
  AgentMessage,
  MessageHandler,
  Subscription,
  MessageFilter,
  MessageStats,
  MessageType
} from './types';

/**
 * Agent Event Bus - Singleton pub/sub messaging system
 */
export class AgentEventBus {
  private subscriptions: Map<string, MessageHandler[]> = new Map();
  private messageHistory: AgentMessage[] = [];
  private maxHistory = 100;
  private stats: MessageStats = {
    totalSent: 0,
    totalReceived: 0,
    byType: {} as Record<MessageType, number>,
    byAgent: {},
    errorRate: 0,
    avgResponseTime: 0
  };

  /**
   * Subscribe an agent to receive messages
   * @param agentId - Agent ID to subscribe
   * @param handler - Message handler function
   * @returns Unsubscribe function
   */
  subscribe(agentId: string, handler: MessageHandler): () => void {
    if (!this.subscriptions.has(agentId)) {
      this.subscriptions.set(agentId, []);
    }

    this.subscriptions.get(agentId)!.push(handler);

    // Debug log
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AgentEventBus] ${agentId} subscribed`);
    }

    // Return unsubscribe function
    return () => {
      const handlers = this.subscriptions.get(agentId);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
          if (handlers.length === 0) {
            this.subscriptions.delete(agentId);
          }
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`[AgentEventBus] ${agentId} unsubscribed`);
      }
    };
  }

  /**
   * Unsubscribe a specific handler
   * @param agentId - Agent ID
   * @param handler - Handler to remove
   */
  unsubscribe(agentId: string, handler: MessageHandler): void {
    const handlers = this.subscriptions.get(agentId);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        if (handlers.length === 0) {
          this.subscriptions.delete(agentId);
        }
      }
    }
  }

  /**
   * Publish a message to the event bus
   * @param message - Message to publish
   */
  publish(message: AgentMessage): void {
    // Update stats
    this.stats.totalSent++;
    this.stats.byType[message.type] = (this.stats.byType[message.type] || 0) + 1;
    this.stats.byAgent[message.from.agentId] =
      (this.stats.byAgent[message.from.agentId] || 0) + 1;

    // Add to history
    this.messageHistory.push({ ...message, status: 'delivered' });
    if (this.messageHistory.length > this.maxHistory) {
      this.messageHistory.shift();
    }

    // Route to specific agent or broadcast
    const delivered = this.routeMessage(message);

    // Update delivery status
    if (!delivered) {
      const lastMessage = this.messageHistory[this.messageHistory.length - 1];
      if (lastMessage) {
        lastMessage.status = 'failed';
      }
    }

    // Debug log
    if (process.env.NODE_ENV === 'development') {
      const priorityIcon = message.priority === 'high' ? '🔴' : message.priority === 'normal' ? '🟡' : '🟢';
      console.log(
        `[AgentEventBus] ${priorityIcon} ${message.from.agentId} → ${message.to.agentId}: ${message.type}`
      );
      if (message.priority === 'high') {
        console.log(`[AgentEventBus] Payload:`, message.payload);
      }
    }
  }

  /**
   * Broadcast a message to all subscribed agents
   * @param message - Message to broadcast (to field will be set to 'broadcast')
   */
  broadcast(message: Omit<AgentMessage, 'to'>): void {
    this.publish({
      ...message,
      to: { agentId: 'broadcast', type: 'broadcast' }
    } as AgentMessage);
  }

  /**
   * Route message to appropriate handler(s)
   * @param message - Message to route
   * @returns True if message was delivered to at least one handler
   */
  private routeMessage(message: AgentMessage): boolean {
    let delivered = false;

    if (message.to.agentId === 'broadcast') {
      // Send to all subscribers
      const entries = Array.from(this.subscriptions.entries());
      for (const [agentId, handlers] of entries) {
        // Don't broadcast to sender
        if (agentId !== message.from.agentId) {
          handlers.forEach(handler => {
            try {
              handler(message);
              this.stats.totalReceived++;
              delivered = true;
            } catch (error) {
              console.error(`[AgentEventBus] Error in handler for ${agentId}:`, error);
            }
          });
        }
      }
    } else {
      // Send to specific agent
      const handlers = this.subscriptions.get(message.to.agentId);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message);
            this.stats.totalReceived++;
            delivered = true;
          } catch (error) {
            console.error(`[AgentEventBus] Error in handler for ${message.to.agentId}:`, error);
          }
        });
      } else {
        // No handler registered for this agent
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[AgentEventBus] No handler registered for ${message.to.agentId}`);
        }
      }
    }

    return delivered;
  }

  /**
   * Get message history with optional filtering
   * @param filter - Optional filter criteria
   * @returns Filtered message history
   */
  getHistory(filter?: MessageFilter): AgentMessage[] {
    if (!filter) return [...this.messageHistory];

    return this.messageHistory.filter(msg => {
      if (filter.from && msg.from.agentId !== filter.from) return false;
      if (filter.to && msg.to.agentId !== filter.to) return false;
      if (filter.type && msg.type !== filter.type) return false;
      if (filter.startTime && msg.timestamp < filter.startTime) return false;
      if (filter.endTime && msg.timestamp > filter.endTime) return false;
      if (filter.minPriority) {
        const priorityOrder = { low: 0, normal: 1, high: 2 };
        if (priorityOrder[msg.priority] < priorityOrder[filter.minPriority]) return false;
      }
      return true;
    });
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
  }

  /**
   * Get event bus statistics
   * @returns Message statistics
   */
  getStats(): MessageStats {
    return { ...this.stats };
  }

  /**
   * Get list of subscribed agents
   * @returns Array of agent IDs
   */
  getSubscribers(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Check if an agent is subscribed
   * @param agentId - Agent ID to check
   * @returns True if subscribed
   */
  isSubscribed(agentId: string): boolean {
    return this.subscriptions.has(agentId);
  }

  /**
   * Reset the event bus (mainly for testing)
   */
  reset(): void {
    this.subscriptions.clear();
    this.messageHistory = [];
    this.stats = {
      totalSent: 0,
      totalReceived: 0,
      byType: {} as Record<MessageType, number>,
      byAgent: {},
      errorRate: 0,
      avgResponseTime: 0
    };
  }
}

/**
 * Singleton instance
 */
export const agentEventBus = new AgentEventBus();
