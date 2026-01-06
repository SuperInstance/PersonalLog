/**
 * Agent Communication System
 *
 * Type-safe event-driven communication system for inter-agent collaboration.
 *
 * @module lib/agents/communication
 */

// Types
export type {
  AgentMessage,
  AgentAddress,
  MessageHandler,
  Subscription,
  MessageFilter,
  MessageStats,
  MessagePayloads,
  AgentId
} from './types'

export { MessageType } from './types'

// Event Bus
export { AgentEventBus, agentEventBus } from './event-bus'

// Protocol
export {
  sendMessage,
  broadcastMessage,
  sendRequest,
  routeMessage,
  createResponse,
  sendResponse,
  validateMessage,
  createAgentAddress,
  acknowledgmentSystem,
  MessageAcknowledgment
} from './protocol'

// Integrations
export {
  JEPAAgentCommunicationHandler,
  SpreaderAgentCommunicationHandler,
  setupAgentCommunication
} from './integrations'
