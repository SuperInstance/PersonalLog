/**
 * Chat API Route
 *
 * Handles AI chat requests using the configured provider.
 * Supports streaming responses and multiple AI contacts.
 */

import { NextRequest, NextResponse } from 'next/server'
import { OpenAIProvider, AnthropicProvider, LocalAIProvider } from '@/lib/ai/provider'
import { getFilterSettings } from '@/lib/wizard/model-store'
import { DEFAULT_FILTRATION } from '@/lib/wizard/models'
import type { FiltrationConfig } from '@/lib/wizard/models'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

interface ChatRequest {
  messages: Array<{ role: string; content: string }>
  contactId?: string
  provider?: 'openai' | 'anthropic' | 'local' | 'custom'
  prompt?: string
  stream?: boolean
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// Get API key from headers or environment
function getApiKey(provider: string): string | null {
  const headers = Headers.prototype ? new Headers() : (global as any).requestHeaders
  // Check environment variables
  if (provider === 'openai') return process.env.OPENAI_API_KEY || null
  if (provider === 'anthropic') return process.env.ANTHROPIC_API_KEY || null
  if (provider === 'xai') return process.env.XAI_API_KEY || null
  if (provider === 'deepseek') return process.env.DEEPSEEK_API_KEY || null
  if (provider === 'kimi') return process.env.KIMI_API_KEY || null
  if (provider === 'zai') return process.env.ZAI_API_KEY || null
  return null
}

// Create provider instance
function createProvider(provider: string, apiKey?: string) {
  switch (provider) {
    case 'openai':
      if (!apiKey) throw new Error('OpenAI API key required')
      return new OpenAIProvider(apiKey)
    case 'anthropic':
      if (!apiKey) throw new Error('Anthropic API key required')
      return new AnthropicProvider(apiKey)
    case 'local':
    case 'ollama':
      return new LocalAIProvider()
    default:
      // Default to local
      return new LocalAIProvider()
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { messages, contactId, provider = 'local', prompt, stream = false } = body

    // Get the last user message as prompt if not provided
    const userPrompt = prompt || messages.filter(m => m.role === 'user').pop()?.content || ''

    // Get API key for the provider
    const apiKey = getApiKey(provider)

    // Create provider instance
    const aiProvider = createProvider(provider, apiKey || undefined)

    // Check if provider is available
    const available = await aiProvider.isAvailable()
    if (!available) {
      return NextResponse.json(
        { error: `${provider} provider is not available` },
        { status: 503 }
      )
    }

    // Build chat request
    const chatRequest: any = {
      prompt: userPrompt,
      messages: messages.map(m => ({
        author: m.role === 'user' ? 'user' : 'ai',
        content: { text: m.content },
        timestamp: new Date().toISOString(),
      })),
      agentId: contactId,
    }

    // Handle streaming
    if (stream) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            await aiProvider.chatStream(chatRequest, (chunk: string) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`))
            })
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error) {
            controller.error(error)
          }
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Non-streaming response
    const response = await aiProvider.chat(chatRequest)

    return NextResponse.json({
      content: response.content,
      model: response.model,
      tokens: response.tokens,
      finishReason: response.finishReason,
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
