/**
 * Agent Message Handlers
 *
 * Provides a registration system for agent-specific message handlers.
 * Handlers define how agents respond to user messages and process content.
 */

import type { Message } from '@/types/conversation'
import type { HandlerContext, AgentResponse, AgentHandler } from './types'

/**
 * Handler registry mapping agent IDs to their handlers
 */
const handlerRegistry: Map<string, AgentHandler> = new Map()

/**
 * Register a handler for an agent
 *
 * @param agentId - The agent ID
 * @param handler - The handler function
 */
export function registerAgentHandler(agentId: string, handler: AgentHandler): void {
  handlerRegistry.set(agentId, handler)
}

/**
 * Unregister a handler for an agent
 *
 * @param agentId - The agent ID
 */
export function unregisterAgentHandler(agentId: string): void {
  handlerRegistry.delete(agentId)
}

/**
 * Get the handler for an agent
 *
 * @param agentId - The agent ID
 * @returns The handler function or undefined if not registered
 */
export function getAgentHandler(agentId: string): AgentHandler | undefined {
  return handlerRegistry.get(agentId)
}

/**
 * Check if an agent has a registered handler
 *
 * @param agentId - The agent ID
 * @returns True if handler is registered
 */
export function hasAgentHandler(agentId: string): boolean {
  return handlerRegistry.has(agentId)
}

/**
 * Get all registered agent IDs
 *
 * @returns Array of agent IDs with registered handlers
 */
export function getRegisteredAgentIds(): string[] {
  return Array.from(handlerRegistry.keys())
}

/**
 * Clear all registered handlers (useful for testing)
 */
export function clearAgentHandlers(): void {
  handlerRegistry.clear()
}

// ============================================================================
// DEFAULT HANDLERS
// ============================================================================

/**
 * JEPA (Joint Embedding Predictive Architecture) Handler
 *
 * Background agent that processes audio transcripts to analyze emotions
 * and extract meaningful patterns from speech.
 *
 * Integrates with the JEPA agent handler for real-time emotion analysis.
 */
export const jepaHandler: AgentHandler = async (
  message: Message,
  context: HandlerContext
): Promise<AgentResponse> => {
  // Import JEPA agent handler to process messages
  const { getJEPAAgent } = await import('./jepa-agent')

  try {
    const jepaAgent = getJEPAAgent()

    // Process message for emotion analysis
    const emotion = await jepaAgent.processMessage(message)

    if (emotion) {
      return {
        type: 'background',
        metadata: {
          emotion,
          processedAt: new Date().toISOString(),
          agentId: 'jepa-emotional-analyzer-v1',
        },
      }
    }

    // No emotion to analyze (e.g., non-user message)
    return { type: 'background' }
  } catch (error) {
    console.error('JEPA handler error:', error)
    return {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error in JEPA analysis',
    }
  }
}

/**
 * Spreader Handler
 *
 * Foreground agent that helps spread knowledge across conversations
 * by creating parallel discussions on related topics.
 */
export const spreaderHandler: AgentHandler = async (
  message: Message,
  context: HandlerContext
): Promise<AgentResponse> => {
  const text = message.content.text?.toLowerCase() || ''

  // Check for spread command
  if (text.startsWith('spread this:')) {
    const commandText = text.substring('spread this:'.length).trim()
    const topics = parseSpreadTopics(commandText)

    // In a real implementation, this would:
    // 1. Create parallel conversations for each topic
    // 2. Share relevant context from current conversation
    // 3. Set up cross-conversation references

    return {
      type: 'message',
      content: `Creating ${topics.length} parallel conversation${topics.length > 1 ? 's' : ''} for: ${topics.join(', ')}`,
      metadata: {
        action: 'spread',
        topics,
        sourceConversationId: context.conversationId,
      },
    }
  }

  // Check for help request
  if (text.includes('help') || text.includes('how to use spreader')) {
    return {
      type: 'message',
      content: `I'm Spreader! I help you branch conversations into parallel discussions.

To use me:
1. Type "spread this: [topic1, topic2, ...]" to create parallel conversations
2. I'll share context from this conversation to each new one
3. Each conversation will focus on a different aspect

Example: "spread this: pros, cons, alternatives"`,
      metadata: {
        action: 'help',
      },
    }
  }

  // Not a command, process silently
  return { type: 'background' }
}

/**
 * Summary Handler
 *
 * Background agent that automatically generates summaries when conversations
 * reach certain length thresholds.
 */
export const summaryHandler: AgentHandler = async (
  message: Message,
  context: HandlerContext
): Promise<AgentResponse> => {
  // Check if conversation has reached summary threshold
  const messageCount = context.conversation.messages.length
  const SUMMARY_THRESHOLD = 20 // Generate summary every 20 messages

  if (messageCount < SUMMARY_THRESHOLD || messageCount % SUMMARY_THRESHOLD !== 0) {
    return { type: 'background' }
  }

  // In a real implementation, this would:
  // 1. Analyze recent messages for key points
  // 2. Extract decisions and action items
  // 3. Create a concise summary

  const summary = {
    messageCount,
    timeRange: {
      start: context.conversation.createdAt,
      end: context.conversation.updatedAt,
    },
    keyPoints: [
      'Discussion covered multiple topics',
      'Several decisions were made',
      'Action items were identified',
    ],
  }

  // Return a system message with the summary
  return {
    type: 'message',
    content: `📝 Conversation Summary (${messageCount} messages)

• ${summary.keyPoints[0]}
• ${summary.keyPoints[1]}
• ${summary.keyPoints[2]}`,
    metadata: {
      action: 'summary',
      summary,
    },
  }
}

/**
 * Task Handler
 *
 * Foreground agent that extracts and tracks action items from conversations.
 */
export const taskHandler: AgentHandler = async (
  message: Message,
  context: HandlerContext
): Promise<AgentResponse> => {
  const text = message.content.text?.toLowerCase() || ''

  // Look for task keywords
  const taskPatterns = [
    /(?:need to|should|must|have to)\s+(.+?)(?:\.|$)/gi,
    /todo:?\s*(.+?)(?:\.|$)/gi,
    /task:?\s*(.+?)(?:\.|$)/gi,
    /action item:?\s*(.+?)(?:\.|$)/gi,
  ]

  const tasks: string[] = []
  for (const pattern of taskPatterns) {
    const matches = text.match(pattern)
    if (matches) {
      tasks.push(...matches.map(m => m.trim()))
    }
  }

  if (tasks.length === 0) {
    return { type: 'background' }
  }

  return {
    type: 'message',
    content: `📋 Found ${tasks.length} task${tasks.length > 1 ? 's' : ''}:
${tasks.map((task, i) => `${i + 1}. ${task}`).join('\n')}

Would you like me to add these to your task list?`,
    metadata: {
      action: 'tasks_detected',
      tasks,
    },
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract topics from transcript text
 */
function extractTopics(text: string): string[] {
  // Simple topic extraction based on common patterns
  const words = text.toLowerCase().split(/\s+/)
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])

  // Count word frequency
  const frequency: Map<string, number> = new Map()
  for (const word of words) {
    if (word.length > 3 && !stopWords.has(word)) {
      frequency.set(word, (frequency.get(word) || 0) + 1)
    }
  }

  // Get top 3 most frequent words
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word)
}

/**
 * Parse spread topics from command text
 */
function parseSpreadTopics(text: string): string[] {
  // Try comma-separated list
  const commaSeparated = text.split(',').map(t => t.trim()).filter(t => t.length > 0)
  if (commaSeparated.length > 1) {
    return commaSeparated
  }

  // Try "and" separated list
  const andSeparated = text.split(/\s+and\s+/i).map(t => t.trim()).filter(t => t.length > 0)
  if (andSeparated.length > 1) {
    return andSeparated
  }

  // Single topic
  return [text]
}

// ============================================================================
// DEFAULT REGISTRATIONS
// ============================================================================

/**
 * Register all default agent handlers
 *
 * Call this during app initialization to set up the built-in agents.
 */
export function registerDefaultHandlers(): void {
  registerAgentHandler('jepa', jepaHandler)
  registerAgentHandler('spreader', spreaderHandler)
  registerAgentHandler('summary', summaryHandler)
  registerAgentHandler('task', taskHandler)
}
