/**
 * Agent Message Handlers
 *
 * Provides a registration system for agent-specific message handlers.
 * Handlers define how agents respond to user messages and process content.
 */

import type { HandlerContext, AgentResponse, AgentHandler } from './types';

/**
 * Handler registry mapping agent IDs to their handlers
 */
const handlerRegistry: Map<string, AgentHandler> = new Map();

/**
 * Register a handler for an agent
 *
 * @param agentId - The agent ID
 * @param handler - The handler function
 *
 * @example
 * ```typescript
 * registerAgentHandler('my-agent', async (message, context) => {
 *   return {
 *     type: 'message',
 *     content: 'Hello from my agent!',
 *   };
 * });
 * ```
 */
export function registerAgentHandler(agentId: string, handler: AgentHandler): void {
  handlerRegistry.set(agentId, handler);
}

/**
 * Unregister a handler for an agent
 *
 * @param agentId - The agent ID
 */
export function unregisterAgentHandler(agentId: string): void {
  handlerRegistry.delete(agentId);
}

/**
 * Get the handler for an agent
 *
 * @param agentId - The agent ID
 * @returns The handler function or undefined if not registered
 */
export function getAgentHandler(agentId: string): AgentHandler | undefined {
  return handlerRegistry.get(agentId);
}

/**
 * Check if an agent has a registered handler
 *
 * @param agentId - The agent ID
 * @returns True if handler is registered
 */
export function hasAgentHandler(agentId: string): boolean {
  return handlerRegistry.has(agentId);
}

/**
 * Get all registered agent IDs
 *
 * @returns Array of agent IDs with registered handlers
 */
export function getRegisteredAgentIds(): string[] {
  return Array.from(handlerRegistry.keys());
}

/**
 * Clear all registered handlers (useful for testing)
 */
export function clearAgentHandlers(): void {
  handlerRegistry.clear();
}
