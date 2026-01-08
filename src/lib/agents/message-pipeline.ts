/**
 * Agent Message Pipeline
 *
 * Routes messages between users and agents, enabling agents to participate
 * in conversations like humans do - sending messages, responding to user input,
 * and processing in the background.
 */

import type { Message, Conversation } from '@/types/conversation'
import type {
  AgentDefinition,
  AgentConfig,
  AgentState,
} from './types'
import type { HardwareProfile } from '@/lib/hardware/types'
import type { HandlerContext, AgentResponse } from './types'
import { getAgentHandler } from './handlers'
import { performanceTracker } from './performance'
import type { TaskType, TaskOutcome, ErrorType } from './performance-types'

/**
 * Message processing result
 */
export interface MessageProcessResult {
  /** Agent ID */
  agentId: string
  /** Agent response */
  response: AgentResponse
  /** Processing timestamp */
  timestamp: string
  /** Processing duration in milliseconds */
  duration?: number
}

/**
 * Infer task type from agent ID
 *
 * @param agentId - Agent ID
 * @returns Inferred task type
 */
function inferTaskType(agentId: string): TaskType {
  if (agentId.includes('jepa')) {
    return 'analyze' as TaskType;
  }
  if (agentId.includes('spreader')) {
    return 'process' as TaskType;
  }
  if (agentId.includes('generator')) {
    return 'generate' as TaskType;
  }
  if (agentId.includes('retriever')) {
    return 'retrieve' as TaskType;
  }
  return 'custom' as TaskType;
}

/**
 * Infer error type from error message
 *
 * @param errorMessage - Error message
 * @returns Inferred error type
 */
function inferErrorType(errorMessage: string): ErrorType {
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
    return 'validation' as ErrorType;
  }
  if (lowerMessage.includes('not found') || lowerMessage.includes('missing')) {
    return 'not_found' as ErrorType;
  }
  if (lowerMessage.includes('permission') || lowerMessage.includes('unauthorized')) {
    return 'permission' as ErrorType;
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
    return 'network' as ErrorType;
  }
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return 'timeout' as ErrorType;
  }
  if (lowerMessage.includes('hardware') || lowerMessage.includes('gpu') || lowerMessage.includes('memory')) {
    return 'hardware' as ErrorType;
  }
  return 'unknown' as ErrorType;
}

/**
 * Agent message pipeline for routing messages to/from agents
 */
export class AgentMessagePipeline {
  private activeAgents: Map<string, AgentConfig> = new Map()
  private hardwareProfile: HardwareProfile | null = null

  /**
   * Set hardware profile for performance-aware decisions
   */
  setHardwareProfile(profile: HardwareProfile): void {
    this.hardwareProfile = profile
  }

  /**
   * Get current hardware profile
   */
  getHardwareProfile(): HardwareProfile | null {
    return this.hardwareProfile
  }

  /**
   * Activate an agent in a conversation
   */
  activateAgent(agentConfig: AgentConfig): void {
    this.activeAgents.set(agentConfig.agentId, agentConfig)
  }

  /**
   * Deactivate an agent
   */
  deactivateAgent(agentId: string): void {
    this.activeAgents.delete(agentId)
  }

  /**
   * Check if an agent is active
   */
  isAgentActive(agentId: string): boolean {
    return this.activeAgents.has(agentId)
  }

  /**
   * Get all active agents
   */
  getActiveAgents(): AgentConfig[] {
    return Array.from(this.activeAgents.values())
  }

  /**
   * Get active agents for a specific conversation
   */
  getActiveAgentsForConversation(conversationId: string): AgentConfig[] {
    return Array.from(this.activeAgents.values()).filter(
      agent => !agent.conversationId || agent.conversationId === conversationId
    )
  }

  /**
   * Send a message from an agent to a conversation
   */
  async sendAgentMessage(
    agentId: string,
    conversationId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<Message> {
    const agent = this.activeAgents.get(agentId)
    if (!agent) {
      throw new Error(`Agent ${agentId} is not active`)
    }

    // Create agent message
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      conversationId,
      type: 'text',
      author: {
        type: 'ai-contact',
        contactId: agentId,
        contactName: agentId, // Will be resolved to agent name by UI
      },
      content: {
        text: content,
      },
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        isAgentMessage: true,
        agentId,
        agentResponse: {
          type: 'foreground',
          metadata,
        },
      },
    }

    return message
  }

  /**
   * Process a user message through active agents
   *
   * Routes the message to all active agents and collects their responses.
   * Background agents process silently, foreground agents generate visible messages.
   */
  async processUserMessage(
    message: Message,
    conversation: Conversation
  ): Promise<MessageProcessResult[]> {
    // Only process user messages
    if (message.author !== 'user') {
      return []
    }

    // Get active agents for this conversation
    const activeAgents = this.getActiveAgentsForConversation(conversation.id)

    if (activeAgents.length === 0) {
      return []
    }

    // Process message through each agent
    const results: MessageProcessResult[] = []

    for (const agentConfig of activeAgents) {
      const startTime = Date.now()
      const taskType = inferTaskType(agentConfig.agentId)

      try {
        // Get handler for this agent
        const handler = getAgentHandler(agentConfig.agentId)

        if (!handler) {
          // No handler registered, skip
          continue
        }

        // Create handler context
        const context: HandlerContext = {
          conversationId: conversation.id,
          agentState: agentConfig.state.status,
          hardwareProfile: this.hardwareProfile || {} as HardwareProfile,
          conversation,
          message,
        }

        // Execute handler
        const response = await handler(message, context)

        // Calculate duration
        const duration = Date.now() - startTime

        // Store result
        results.push({
          agentId: agentConfig.agentId,
          response,
          timestamp: new Date().toISOString(),
          duration,
        })

        // Update agent state
        if (response.type === 'message' || response.type === 'background') {
          agentConfig.state.status = 'idle' as AgentState
          agentConfig.state.lastActive = new Date().toISOString()
        } else if (response.type === 'error') {
          agentConfig.state.status = 'error' as AgentState
          agentConfig.state.error = response.error
        }

        // Track performance (background, don't await)
        performanceTracker
          .recordAgentExecution(agentConfig.agentId, taskType, {
            outcome: response.type === 'error' ? ('failure' as TaskOutcome) : ('success' as TaskOutcome),
            duration,
            errorType: response.error ? inferErrorType(response.error) : undefined,
            errorMessage: response.error,
            resources: {
              cpu: 0.5, // Placeholder - would need actual measurement
              memory: 1024000, // Placeholder - would need actual measurement
            },
            conversationId: conversation.id,
          })
          .catch((error) => {
            // Silently fail to avoid disrupting agent execution
            console.warn('Failed to record agent performance:', error)
          })

      } catch (error) {
        // Calculate duration even for failures
        const duration = Date.now() - startTime
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // Handler execution failed
        results.push({
          agentId: agentConfig.agentId,
          response: {
            type: 'error',
            error: errorMessage,
          },
          timestamp: new Date().toISOString(),
          duration,
        })

        agentConfig.state.status = 'error' as AgentState
        agentConfig.state.error = errorMessage

        // Track performance (background, don't await)
        performanceTracker
          .recordAgentExecution(agentConfig.agentId, taskType, {
            outcome: 'failure' as TaskOutcome,
            duration,
            errorType: inferErrorType(errorMessage),
            errorMessage,
            resources: {
              cpu: 0.5,
              memory: 1024000,
            },
            conversationId: conversation.id,
          })
          .catch((err) => {
            console.warn('Failed to record agent performance:', err)
          })
      }
    }

    return results
  }

  /**
   * Create a new agent-specific conversation
   */
  async createAgentConversation(agentId: string, initialMessage?: string): Promise<Conversation> {
    const now = new Date().toISOString()

    const conversation: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      title: `Chat with ${agentId}`,
      type: 'ai-assisted',
      createdAt: now,
      updatedAt: now,
      messages: [],
      aiContacts: [],
      settings: {
        responseMode: 'messenger',
        compactOnLimit: true,
        compactStrategy: 'summarize',
      },
      metadata: {
        messageCount: 0,
        totalTokens: 0,
        hasMedia: false,
        tags: ['agent'],
        pinned: false,
        archived: false,
      },
    }

    // Add initial message if provided
    if (initialMessage) {
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        conversationId: conversation.id,
        type: 'text',
        author: {
          type: 'ai-contact',
          contactId: agentId,
          contactName: agentId,
        },
        content: {
          text: initialMessage,
        },
        timestamp: now,
        metadata: {
          isAgentMessage: true,
          agentId,
        },
      }
      conversation.messages.push(message)
      conversation.metadata.messageCount = 1
    }

    return conversation
  }

  /**
   * Check if a conversation is primarily with an agent
   */
  isAgentConversation(conversationId: string): boolean {
    const activeAgents = this.getActiveAgentsForConversation(conversationId)
    return activeAgents.length > 0
  }

  /**
   * Get agent information for message display
   */
  getAgentInfo(agentId: string): { name: string; icon: string } | null {
    const agent = this.activeAgents.get(agentId)
    if (!agent) {
      return null
    }

    // Return basic info - will be enhanced with registry lookup
    return {
      name: agentId,
      icon: '🤖',
    }
  }
}

// Global pipeline instance
let globalPipeline: AgentMessagePipeline | null = null

/**
 * Get the global agent message pipeline instance
 */
export function getAgentMessagePipeline(): AgentMessagePipeline {
  if (!globalPipeline) {
    globalPipeline = new AgentMessagePipeline()
  }
  return globalPipeline
}

/**
 * Reset the global pipeline (useful for testing)
 */
export function resetAgentMessagePipeline(): void {
  globalPipeline = null
}
