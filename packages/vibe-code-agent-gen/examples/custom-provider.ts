/**
 * Custom Provider Example
 *
 * Demonstrates how to integrate @superinstance/vibe-code-agent-gen
 * with different AI providers (OpenAI, Anthropic, local models, etc).
 */

import { createStateMachine } from '../src'
import type { AIProvider, ChatRequest, ChatResponse } from '../src'

// ============================================================================
// OPENAI PROVIDER
// ============================================================================

class OpenAIProvider implements AIProvider {
  id = 'openai'
  name = 'OpenAI'
  type = 'openai'

  constructor(private apiKey: string, private model = 'gpt-4') {}

  async isAvailable(): Promise<boolean> {
    try {
      // Simple health check
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: request.prompt },
          ...request.messages.map(m => ({
            role: m.author === 'user' ? 'user' : 'assistant',
            content: m.content.text || '',
          })),
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      content: data.choices[0].message.content,
      model: this.model,
      tokens: {
        input: data.usage.prompt_tokens,
        output: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      },
      finishReason: data.choices[0].finish_reason,
    }
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  getMaxTokens(): number {
    return 8192
  }
}

// ============================================================================
// ANTHROPIC PROVIDER
// ============================================================================

class AnthropicProvider implements AIProvider {
  id = 'anthropic'
  name = 'Anthropic'
  type = 'anthropic'

  constructor(private apiKey: string, private model = 'claude-3-opus-20240229') {}

  async isAvailable(): Promise<boolean> {
    // Anthropic doesn't have a simple health check endpoint
    return true
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        system: request.prompt,
        messages: request.messages.map(m => ({
          role: m.author === 'user' ? 'user' : 'assistant',
          content: m.content.text || '',
        })),
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      content: data.content[0].text,
      model: this.model,
      tokens: {
        input: data.usage.input_tokens,
        output: data.usage.output_tokens,
        total: data.usage.input_tokens + data.usage.output_tokens,
      },
      finishReason: data.stop_reason,
    }
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  getMaxTokens(): number {
    return 200000
  }
}

// ============================================================================
// LOCAL MODEL PROVIDER (OLLAMA)
// ============================================================================

class OllamaProvider implements AIProvider {
  id = 'ollama'
  name = 'Ollama'
  type = 'local'

  constructor(private baseUrl = 'http://localhost:11434', private model = 'llama2') {}

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      return response.ok
    } catch {
      return false
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: request.prompt },
          ...request.messages.map(m => ({
            role: m.author === 'user' ? 'user' : 'assistant',
            content: m.content.text || '',
          })),
        ],
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      content: data.message.content,
      model: this.model,
      tokens: {
        input: data.prompt_eval_count || 0,
        output: data.eval_count || 0,
        total: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      finishReason: 'stop',
    }
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  getMaxTokens(): number {
    return 4096
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

async function exampleOpenAI() {
  console.log('=== OpenAI Example ===\n')

  const provider = new OpenAIProvider(process.env.OPENAI_API_KEY || 'sk-...')
  const machine = await createStateMachine('conv-openai', provider)

  // Use the machine...
  console.log('OpenAI provider ready')
}

async function exampleAnthropic() {
  console.log('=== Anthropic Example ===\n')

  const provider = new AnthropicProvider(process.env.ANTHROPIC_API_KEY || 'sk-ant-...')
  const machine = await createStateMachine('conv-anthropic', provider)

  // Use the machine...
  console.log('Anthropic provider ready')
}

async function exampleOllama() {
  console.log('=== Ollama Example ===\n')

  const provider = new OllamaProvider('http://localhost:11434', 'llama2')
  const machine = await createStateMachine('conv-ollama', provider)

  // Use the machine...
  console.log('Ollama provider ready')
}

// ============================================================================
// PROVIDER FACTORY
// ============================================================================

type ProviderType = 'openai' | 'anthropic' | 'ollama'

function createProvider(type: ProviderType, config: any): AIProvider {
  switch (type) {
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.model)
    case 'anthropic':
      return new AnthropicProvider(config.apiKey, config.model)
    case 'ollama':
      return new OllamaProvider(config.baseUrl, config.model)
    default:
      throw new Error(`Unknown provider type: ${type}`)
  }
}

async function exampleFactory() {
  console.log('=== Provider Factory Example ===\n')

  // Use environment variables or config
  const provider = createProvider('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
  })

  const machine = await createStateMachine('conv-factory', provider)
  console.log('Provider created via factory')
}

// Run examples
async function main() {
  await exampleOpenAI()
  await exampleAnthropic()
  await exampleOllama()
  await exampleFactory()
}

main().catch(console.error)
