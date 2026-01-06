/**
 * Schema Generation Utilities
 *
 * LLM-based schema generation for conversation summarization.
 */

import { Message } from '@/types/conversation'
import { SessionSchema, SCHEMA_GENERATION_PROMPT, createEmptySchema } from './types'
import { OpenAIProvider, AnthropicProvider, LocalAIProvider } from '@/lib/ai/provider'

// ============================================================================
// SCHEMA GENERATION
// ============================================================================

/**
 * Generates a conversation schema using LLM analysis.
 *
 * @param messages - Conversation messages to analyze
 * @param provider - AI provider to use (defaults to 'local')
 * @returns Promise resolving to generated schema
 *
 * @example
 * ```typescript
 * const schema = await generateSchema(messages, 'anthropic')
 * console.log(schema.project) // "Building a todo app"
 * ```
 */
export async function generateSchema(
  messages: Message[],
  provider: 'openai' | 'anthropic' | 'local' = 'local'
): Promise<SessionSchema> {
  if (messages.length === 0) {
    return createEmptySchema()
  }

  try {
    // Build conversation text for LLM
    const conversationText = buildConversationText(messages)

    // Get API key
    const apiKey = getApiKey(provider)

    // Create provider
    const aiProvider = createProvider(provider, apiKey)

    // Check availability
    const available = await aiProvider.isAvailable()
    if (!available) {
      console.warn(`${provider} not available, using fallback schema generation`)
      return generateFallbackSchema(messages)
    }

    // Call LLM
    const response = await aiProvider.chat({
      conversationId: 'spreader-schema',
      agentId: 'spreader-schema',
      messages: [
        {
          author: { type: 'system', reason: 'schema-generation' },
          content: { text: SCHEMA_GENERATION_PROMPT },
          timestamp: new Date().toISOString()
        } as any,
        {
          author: 'user',
          content: { text: conversationText },
          timestamp: new Date().toISOString()
        } as any
      ],
      prompt: SCHEMA_GENERATION_PROMPT,
      stream: false
    })

    // Parse JSON response
    const parsed = parseSchemaResponse(response.content)

    // Add metadata
    return {
      ...parsed,
      conversationIds: Array.from(new Set(messages.map(m => m.conversationId))),
      generatedAt: new Date().toISOString()
    }

  } catch (error) {
    console.error('Schema generation failed:', error)
    return generateFallbackSchema(messages)
  }
}

/**
 * Generates a child conversation summary for merging.
 *
 * @param childMessages - Messages from child conversation
 * @param provider - AI provider to use
 * @returns Promise resolving to summary text
 */
export async function generateChildSummary(
  childMessages: Message[],
  provider: 'openai' | 'anthropic' | 'local' = 'local'
): Promise<string> {
  if (childMessages.length === 0) {
    return 'No conversation to summarize.'
  }

  try {
    const conversationText = buildConversationText(childMessages)
    const apiKey = getApiKey(provider)
    const aiProvider = createProvider(provider, apiKey)

    const available = await aiProvider.isAvailable()
    if (!available) {
      return generateFallbackSummary(childMessages)
    }

    const response = await aiProvider.chat({
      conversationId: 'spreader-summary',
      agentId: 'spreader-summary',
      messages: [{
        author: 'user',
        content: { text: conversationText },
        timestamp: new Date().toISOString()
      } as any],
      prompt: 'Summarize this conversation\'s key outcomes:\n\n' + conversationText,
      stream: false
    })

    return response.content

  } catch (error) {
    console.error('Child summary generation failed:', error)
    return generateFallbackSummary(childMessages)
  }
}

/**
 * Updates an existing schema with merged child conversation data.
 *
 * @param currentSchema - Existing schema
 * @param childSummary - Summary from child conversation
 * @returns Updated schema
 */
export function updateSchemaWithMerge(
  currentSchema: SessionSchema,
  childSummary: string
): SessionSchema {
  return {
    ...currentSchema,
    completed: [
      ...currentSchema.completed,
      `[Merged] ${childSummary.slice(0, 100)}...`
    ],
    generatedAt: new Date().toISOString()
  }
}

// ============================================================================
// FALLBACK METHODS
// ============================================================================

/**
 * Generates a schema without LLM (simple extraction).
 */
function generateFallbackSchema(messages: Message[]): SessionSchema {
  const userMessages = messages.filter(m => m.author === 'user')
  const aiMessages = messages.filter(m => m.author !== 'user')

  // Extract key information from recent messages
  const recentMessages = messages.slice(-10)
  const topics = extractTopics(recentMessages)

  return {
    project: 'Conversation',
    description: `Conversation with ${messages.length} messages (${userMessages.length} user, ${aiMessages.length} AI)`,
    completed: topics.completed,
    inProgress: topics.inProgress,
    next: ['Continue conversation...'],
    decisions: [],
    technicalSpecs: {},
    conversationIds: Array.from(new Set(messages.map(m => m.conversationId))),
    generatedAt: new Date().toISOString()
  }
}

/**
 * Generates a simple summary without LLM.
 */
function generateFallbackSummary(messages: Message[]): string {
  const userMessages = messages.filter(m => m.author === 'user')
  const aiMessages = messages.filter(m => m.author !== 'user')

  return `Conversation summary: ${userMessages.length} user messages, ${aiMessages.length} AI responses. ` +
    `Started ${new Date(messages[0].timestamp).toLocaleDateString()}.`
}

/**
 * Extracts topics from messages (simple heuristic).
 */
function extractTopics(messages: Message[]): { completed: string[]; inProgress: string[] } {
  const completed: string[] = []
  const inProgress: string[] = []

  // Look for action-oriented messages
  const actionWords = ['finished', 'completed', 'done', 'built', 'created', 'implemented']
  const progressWords = ['working', 'building', 'creating', 'implementing', 'in progress']

  for (const msg of messages) {
    const text = msg.content.text?.toLowerCase() || ''

    if (actionWords.some(word => text.includes(word))) {
      completed.push(msg.content.text?.slice(0, 50) || 'Completed task')
    } else if (progressWords.some(word => text.includes(word))) {
      inProgress.push(msg.content.text?.slice(0, 50) || 'In progress')
    }
  }

  return { completed, inProgress }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Builds a text representation of the conversation.
 */
function buildConversationText(messages: Message[]): string {
  return messages
    .map(m => {
      const author = m.author === 'user' ? 'User' : 'AI'
      const text = m.content.text || ''
      return `${author}: ${text}`
    })
    .join('\n')
}

/**
 * Parses LLM response to extract JSON schema.
 */
function parseSchemaResponse(content: string): SessionSchema {
  try {
    // Try direct JSON parse first
    const parsed = JSON.parse(content)
    return validateSchema(parsed)
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1])
        return validateSchema(parsed)
      } catch {
        // Fall through to default
      }
    }

    // Return empty schema if parsing fails
    return createEmptySchema()
  }
}

/**
 * Validates and normalizes schema structure.
 */
function validateSchema(schema: any): SessionSchema {
  return {
    project: schema.project || '',
    description: schema.description || '',
    completed: Array.isArray(schema.completed) ? schema.completed : [],
    inProgress: Array.isArray(schema.inProgress) ? schema.inProgress : [],
    next: Array.isArray(schema.next) ? schema.next : [],
    decisions: Array.isArray(schema.decisions) ? schema.decisions : [],
    technicalSpecs: {
      stack: Array.isArray(schema.technicalSpecs?.stack) ? schema.technicalSpecs.stack : [],
      architecture: schema.technicalSpecs?.architecture || '',
      patterns: Array.isArray(schema.technicalSpecs?.patterns) ? schema.technicalSpecs.patterns : [],
      libraries: Array.isArray(schema.technicalSpecs?.libraries) ? schema.technicalSpecs.libraries : []
    },
    conversationIds: [],
    generatedAt: new Date().toISOString()
  }
}

/**
 * Gets API key for provider.
 */
function getApiKey(provider: string): string | undefined {
  if (provider === 'openai') return process.env.OPENAI_API_KEY
  if (provider === 'anthropic') return process.env.ANTHROPIC_API_KEY
  return undefined
}

/**
 * Creates provider instance.
 */
function createProvider(provider: string, apiKey?: string) {
  switch (provider) {
    case 'openai':
      if (!apiKey) throw new Error('OpenAI API key required')
      return new OpenAIProvider(apiKey)
    case 'anthropic':
      if (!apiKey) throw new Error('Anthropic API key required')
      return new AnthropicProvider(apiKey)
    case 'local':
    default:
      return new LocalAIProvider()
  }
}
