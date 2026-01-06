/**
 * Agent Communication Protocol
 *
 * Message routing, validation, and helper functions.
 */

import { agentEventBus } from './event-bus';
import type { AgentMessage, AgentAddress, MessageType, MessagePayloads } from './types';

/**
 * Validate message structure
 * @param message - Message to validate
 * @returns True if valid
 */
export function validateMessage(message: AgentMessage): boolean {
  // Check required fields
  if (!message.id || typeof message.id !== 'string') return false;
  if (!message.from || !message.from.agentId || !message.from.type) return false;
  if (!message.to || !message.to.agentId || !message.to.type) return false;
  if (!message.type || typeof message.type !== 'string') return false;
  if (message.payload === undefined) return false;
  if (!message.timestamp || typeof message.timestamp !== 'number') return false;
  if (!['low', 'normal', 'high'].includes(message.priority)) return false;
  if (!['pending', 'delivered', 'failed'].includes(message.status)) return false;

  // Validate timestamp is recent (within 1 minute of now)
  const now = Date.now();
  if (Math.abs(now - message.timestamp) > 60000) {
    console.warn('[Protocol] Message timestamp is too old or in the future');
    return false;
  }

  return true;
}

/**
 * Create agent address
 * @param agentId - Agent ID
 * @param type - Address type
 * @returns Agent address
 */
export function createAgentAddress(
  agentId: AgentAddress['agentId'],
  type: AgentAddress['type'] = 'agent'
): AgentAddress {
  return { agentId, type };
}

/**
 * Send a message from one agent to another
 * @param from - Sender agent ID
 * @param to - Recipient agent ID (or 'broadcast')
 * @param type - Message type
 * @param payload - Message payload
 * @param priority - Message priority
 * @returns Created message
 */
export function sendMessage<T extends MessageType>(
  from: string,
  to: string,
  type: T,
  payload: MessagePayloads[T],
  priority: 'low' | 'normal' | 'high' = 'normal'
): AgentMessage<T> {
  const message: AgentMessage<T> = {
    id: crypto.randomUUID(),
    from: createAgentAddress(from),
    to: createAgentAddress(to),
    type,
    payload,
    timestamp: Date.now(),
    priority,
    status: 'pending'
  };

  // Validate before sending
  if (!validateMessage(message as AgentMessage)) {
    console.error('[Protocol] Invalid message:', message);
    throw new Error('Invalid message structure');
  }

  // Publish to event bus
  agentEventBus.publish(message as AgentMessage);

  return message;
}

/**
 * Send a broadcast message to all agents
 * @param from - Sender agent ID
 * @param type - Message type
 * @param payload - Message payload
 * @param priority - Message priority
 * @returns Created message
 */
export function broadcastMessage<T extends MessageType>(
  from: string,
  type: T,
  payload: MessagePayloads[T],
  priority: 'low' | 'normal' | 'high' = 'normal'
): AgentMessage<T> {
  return sendMessage(from, 'broadcast', type, payload, priority);
}

/**
 * Send a request and wait for response
 * @param from - Sender agent ID
 * @param to - Recipient agent ID
 * @param type - Message type
 * @param payload - Message payload
 * @param timeout - Timeout in milliseconds
 * @returns Promise that resolves with response message
 */
export function sendRequest<T extends MessageType>(
  from: string,
  to: string,
  type: T,
  payload: MessagePayloads[T],
  timeout = 5000
): Promise<AgentMessage> {
  return new Promise((resolve, reject) => {
    const correlationId = crypto.randomUUID();
    const message = sendMessage(from, to, type, payload, 'normal');

    // Set correlation ID for request/response matching
    (message as AgentMessage).correlationId = correlationId;

    // Subscribe for response
    const unsubscribe = agentEventBus.subscribe(from, (response: AgentMessage) => {
      if (response.correlationId === correlationId) {
        unsubscribe();
        clearTimeout(timeoutId);
        resolve(response);
      }
    });

    // Timeout handler
    const timeoutId = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Request timeout: ${type} from ${from} to ${to}`));
    }, timeout);
  });
}

/**
 * Route message to appropriate handler
 * @param message - Message to route
 * @returns True if message was routed successfully
 */
export function routeMessage(message: AgentMessage): boolean {
  try {
    // Validate message
    if (!validateMessage(message)) {
      console.error('[Protocol] Failed to route invalid message:', message);
      return false;
    }

    // Publish to event bus (which handles routing)
    agentEventBus.publish(message);
    return true;
  } catch (error) {
    console.error('[Protocol] Error routing message:', error);
    return false;
  }
}

/**
 * Create a response message
 * @param originalMessage - Original message to respond to
 * @param from - Responding agent ID
 * @param payload - Response payload
 * @returns Response message
 */
export function createResponse<T extends MessageType>(
  originalMessage: AgentMessage,
  from: string,
  type: T,
  payload: MessagePayloads[T]
): AgentMessage<T> {
  return {
    id: crypto.randomUUID(),
    from: createAgentAddress(from),
    to: originalMessage.from,
    type,
    payload,
    timestamp: Date.now(),
    correlationId: originalMessage.correlationId || originalMessage.id,
    priority: originalMessage.priority,
    status: 'pending'
  };
}

/**
 * Send a response to a message
 * @param originalMessage - Original message to respond to
 * @param from - Responding agent ID
 * @param type - Response message type
 * @param payload - Response payload
 * @returns Sent response message
 */
export function sendResponse<T extends MessageType>(
  originalMessage: AgentMessage,
  from: string,
  type: T,
  payload: MessagePayloads[T]
): AgentMessage<T> {
  const response = createResponse(originalMessage, from, type, payload);
  agentEventBus.publish(response as AgentMessage);
  return response;
}

/**
 * Message acknowledgment system
 */
export class MessageAcknowledgment {
  private pendingAcknowledgments = new Map<string, {
    resolve: (message: AgentMessage) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  /**
   * Wait for acknowledgment
   * @param messageId - Message ID to wait for acknowledgment
   * @param timeout - Timeout in milliseconds
   * @returns Promise that resolves when acknowledgment is received
   */
  waitForAcknowledgment(messageId: string, timeout = 3000): Promise<AgentMessage> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingAcknowledgments.delete(messageId);
        reject(new Error(`Acknowledgment timeout for message ${messageId}`));
      }, timeout);

      this.pendingAcknowledgments.set(messageId, {
        resolve,
        reject,
        timeout: timeoutId
      });
    });
  }

  /**
   * Acknowledge a message
   * @param messageId - Message ID being acknowledged
   * @param acknowledgment - Acknowledgment message
   */
  acknowledge(messageId: string, acknowledgment: AgentMessage): void {
    const pending = this.pendingAcknowledgments.get(messageId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingAcknowledgments.delete(messageId);
      pending.resolve(acknowledgment);
    }
  }

  /**
   * Clear all pending acknowledgments
   */
  clear(): void {
    const pending = Array.from(this.pendingAcknowledgments.values());
    for (const { timeout, reject } of pending) {
      clearTimeout(timeout);
      reject(new Error('Acknowledgment system cleared'));
    }
    this.pendingAcknowledgments.clear();
  }
}

/**
 * Global acknowledgment system instance
 */
export const acknowledgmentSystem = new MessageAcknowledgment();
