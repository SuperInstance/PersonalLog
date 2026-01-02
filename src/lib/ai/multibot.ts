/**
 * Multi-Bot Chat Handler
 *
 * Manages parallel and series conversations with multiple AI agents.
 */

import type { AIAgent, ChatRequest, ChatResponse, MultiBotResponse, Message } from '@/types/conversation'
import type { AIProvider } from './provider'

// ============================================================================
// MULTI-BOT ARRANGEMENTS
// ============================================================================

export type MultiBotArrangement = 'parallel' | 'series'

export interface MultiBotChatOptions {
  arrangement: MultiBotArrangement
  agents: AIAgent[]
  userPrompt: string
  contextMessages: Message[]
  providers: Map<string, AIProvider>
}

export interface MultiBotResult {
  responses: MultiBotResponse[]
  arrangement: MultiBotArrangement
  totalTime: number
}

// ============================================================================
// PARALLEL MULTI-BOT
// ============================================================================

/**
 * All bots respond simultaneously to the same prompt
 */
export async function parallelChat(options: MultiBotChatOptions): Promise<MultiBotResult> {
  const startTime = Date.now()

  const responses = await Promise.all(
    options.agents.map(async (agent) => {
      try {
        const provider = options.providers.get(agent.config.provider)
        if (!provider) {
          throw new Error(`No provider found for ${agent.config.provider}`)
        }

        const request: ChatRequest = {
          conversationId: '',  // Would be filled in
          agentId: agent.id,
          messages: options.contextMessages,
          prompt: options.userPrompt,
          stream: false,
        }

        const response = await provider.chat(request)

        return {
          agentId: agent.id,
          agentName: agent.name,
          response: {
            ...response,
            content: formatResponseForAgent(response.content, agent),
          },
        }
      } catch (error) {
        return {
          agentId: agent.id,
          agentName: agent.name,
          response: {
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            model: agent.config.model,
            tokens: { input: 0, output: 0, total: 0 },
            finishReason: 'stop',
          },
        }
      }
    })
  )

  return {
    responses,
    arrangement: 'parallel',
    totalTime: Date.now() - startTime,
  }
}

// ============================================================================
// SERIES MULTI-BOT
// ============================================================================

/**
 * Each bot responds sequentially, seeing previous bot responses
 */
export async function seriesChat(options: MultiBotChatOptions): Promise<MultiBotResult> {
  const startTime = Date.now()
  const responses: MultiBotResponse[] = []
  let accumulatedContext = options.contextMessages

  for (const agent of options.agents) {
    try {
      const provider = options.providers.get(agent.config.provider)
      if (!provider) {
        throw new Error(`No provider found for ${agent.config.provider}`)
      }

      // Build prompt that includes previous bot responses
      let prompt = options.userPrompt
      if (responses.length > 0) {
        prompt += '\n\nPrevious responses from other AIs:\n'
        for (const prev of responses) {
          prompt += `\n${prev.agentName}: ${prev.response.content.substring(0, 200)}...\n`
        }
        prompt += '\nPlease provide your perspective, building on or differing from the above.'
      }

      const request: ChatRequest = {
        conversationId: '',
        agentId: agent.id,
        messages: accumulatedContext,
        prompt,
        stream: false,
      }

      const response = await provider.chat(request)

      responses.push({
        agentId: agent.id,
        agentName: agent.name,
        response: {
          ...response,
          content: formatResponseForAgent(response.content, agent),
        },
      })

      // Add this bot's response to context for next bot
      accumulatedContext = [
        ...accumulatedContext,
        {
          id: `temp_${agent.id}`,
          conversationId: '',
          type: 'text' as const,
          author: { type: 'ai-contact', contactId: agent.id, contactName: agent.name },
          content: { text: response.content },
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      ]
    } catch (error) {
      responses.push({
        agentId: agent.id,
        agentName: agent.name,
        response: {
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          model: agent.config.model,
          tokens: { input: 0, output: 0, total: 0 },
          finishReason: 'stop',
        },
      })
    }
  }

  return {
    responses,
    arrangement: 'series',
    totalTime: Date.now() - startTime,
  }
}

// ============================================================================
// RESPONSE FORMATTING
// ============================================================================

function formatResponseForAgent(content: string, agent: AIAgent): string {
  // Apply agent's response style
  switch (agent.config.responseStyle) {
    case 'brief':
      return content.split('\n').slice(0, 3).join('\n')
    case 'detailed':
      return content
    case 'balanced':
    default:
      // Keep it reasonably concise but complete
      if (content.length > 1000) {
        return content.substring(0, 1000) + '...'
      }
      return content
  }
}

// ============================================================================
// MULTI-BOT SERVICE
// ============================================================================

export class MultiBotService {
  private providers: Map<string, AIProvider>

  constructor(providers: Map<string, AIProvider>) {
    this.providers = providers
  }

  async chat(options: MultiBotChatOptions): Promise<MultiBotResult> {
    if (options.agents.length === 0) {
      throw new Error('No agents provided for multi-bot chat')
    }

    if (options.agents.length === 1) {
      // Single agent, simple chat
      const agent = options.agents[0]
      const provider = this.providers.get(agent.config.provider)
      if (!provider) {
        throw new Error(`No provider found for ${agent.config.provider}`)
      }

      const request: ChatRequest = {
        conversationId: '',
        agentId: agent.id,
        messages: options.contextMessages,
        prompt: options.userPrompt,
        stream: false,
      }

      const response = await provider.chat(request)

      return {
        responses: [{
          agentId: agent.id,
          agentName: agent.name,
          response,
        }],
        arrangement: options.arrangement,
        totalTime: 0,
      }
    }

    // Multiple agents
    switch (options.arrangement) {
      case 'parallel':
        return parallelChat(options)
      case 'series':
        return seriesChat(options)
      default:
        return parallelChat(options)
    }
  }

  /**
   * Format multi-bot response for display
   */
  formatResult(result: MultiBotResult): string {
    if (result.responses.length === 1) {
      return result.responses[0].response.content
    }

    let output = ''

    if (result.arrangement === 'parallel') {
      output = `Here are responses from ${result.responses.length} AI assistants:\n\n`

      for (const r of result.responses) {
        output += `**${r.agentName}**:\n${r.response.content}\n\n`
      }
    } else {
      output = `Sequential responses from ${result.responses.length} AI assistants:\n\n`

      for (const r of result.responses) {
        output += `**${r.agentName}** (after ${result.responses.filter(x => x.agentId !== r.agentId).length} others):\n${r.response.content}\n\n`
      }
    }

    return output.trim()
  }

  /**
   * Get combined response as a single message
   */
  getCombinedResponse(result: MultiBotResult): {
    content: string
    agentIds: string[]
    modelNames: string[]
  } {
    return {
      content: this.formatResult(result),
      agentIds: result.responses.map(r => r.agentId),
      modelNames: result.responses.map(r => r.response.model || 'unknown'),
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a chat request from conversation state
 */
export function createChatRequest(
  conversationId: string,
  agentId: string,
  contextMessages: Message[],
  userPrompt: string
): ChatRequest {
  return {
    conversationId,
    agentId,
    messages: contextMessages,
    prompt: userPrompt,
    stream: false,
  }
}

/**
 * Validate multi-bot configuration
 */
export function validateMultiBotConfig(agents: AIAgent[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (agents.length === 0) {
    errors.push('At least one agent must be selected')
  }

  if (agents.length > 5) {
    errors.push('Maximum 5 agents allowed in multi-bot chat')
  }

  // Check for duplicate agents
  const ids = new Set(agents.map(a => a.id))
  if (ids.size !== agents.length) {
    errors.push('Duplicate agents detected')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
