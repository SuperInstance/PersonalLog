/**
 * Model-Agnostic AI Provider Interface
 *
 * Abstraction layer for different AI providers (local, OpenAI, Anthropic, etc.)
 * Integrated with filtration system for enhanced prompts and processed responses.
 */

import type { ChatRequest, ChatResponse } from '@/types/conversation'
import type { FiltrationConfig } from '@/lib/wizard/models'
import type { EnhancementContext } from '@/lib/wizard/filtration-service'
import { enhancePrompt, processResponse } from '@/lib/wizard/filtration-service'

// ============================================================================
// FILTRATION PROVIDER WRAPPER
// ============================================================================

/**
 * Wraps any AIProvider to add prompt enhancement and response processing
 */
export class FilteredProvider implements AIProvider {
  private provider: AIProvider
  private filtrationConfig: FiltrationConfig

  constructor(provider: AIProvider, filtrationConfig: FiltrationConfig) {
    this.provider = provider
    this.filtrationConfig = filtrationConfig
  }

  get id(): string {
    return this.provider.id
  }

  get name(): string {
    return this.provider.name
  }

  get type(): AIProvider['type'] {
    return this.provider.type
  }

  async isAvailable(): Promise<boolean> {
    return this.provider.isAvailable()
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    // Enhance the prompt
    const enhancementContext = this.buildEnhancementContext(request)
    const { enhanced: filteredPrompt } = enhancePrompt(
      request.prompt,
      this.filtrationConfig,
      enhancementContext
    )

    // Create filtered request
    const filteredRequest: ChatRequest = {
      ...request,
      prompt: filteredPrompt,
    }

    // Get response from underlying provider
    const response = await this.provider.chat(filteredRequest)

    // Process the response
    const { processed: filteredContent } = processResponse(response.content, this.filtrationConfig)

    return {
      ...response,
      content: filteredContent,
    }
  }

  async chatStream(request: ChatRequest, onChunk: (chunk: string) => void): Promise<ChatResponse> {
    // For streaming, we enhance the prompt but process the final response
    const enhancementContext = this.buildEnhancementContext(request)
    const { enhanced: filteredPrompt } = enhancePrompt(
      request.prompt,
      this.filtrationConfig,
      enhancementContext
    )

    const filteredRequest: ChatRequest = {
      ...request,
      prompt: filteredPrompt,
    }

    const response = await this.provider.chatStream(filteredRequest, onChunk)

    // Post-process the complete response
    const { processed: filteredContent } = processResponse(response.content, this.filtrationConfig)

    return {
      ...response,
      content: filteredContent,
    }
  }

  estimateTokens(text: string): number {
    return this.provider.estimateTokens(text)
  }

  getMaxTokens(): number {
    return this.provider.getMaxTokens()
  }

  updateFiltration(config: FiltrationConfig): void {
    this.filtrationConfig = config
  }

  private buildEnhancementContext(request: ChatRequest): EnhancementContext {
    return {
      userMessage: request.prompt,
      conversationHistory: request.messages.slice(-5).map(m => ({
        role: m.author === 'user' ? 'user' : 'assistant',
        content: m.content.text || '',
      })),
      contactNickname: request.agentId,
    }
  }
}

// ============================================================================
// PROVIDER INTERFACE
// ============================================================================

export interface AIProvider {
  id: string
  name: string
  type: 'local' | 'openai' | 'anthropic' | 'google' | 'custom'

  /**
   * Check if provider is available
   */
  isAvailable(): boolean | Promise<boolean>

  /**
   * Generate a chat response
   */
  chat(request: ChatRequest): Promise<ChatResponse>

  /**
   * Stream a chat response
   */
  chatStream(request: ChatRequest, onChunk: (chunk: string) => void): Promise<ChatResponse>

  /**
   * Get estimated token count
   */
  estimateTokens(text: string): number

  /**
   * Get maximum context window
   */
  getMaxTokens(): number
}

// ============================================================================
// LOCAL PROVIDER (WebLLM / Ollama)
// ============================================================================

export class LocalAIProvider implements AIProvider {
  id = 'local'
  name = 'Local AI'
  type = 'local' as const

  private model: string = 'default'
  private baseUrl: string = 'http://localhost:11434'  // Default Ollama

  constructor(config?: { model?: string; baseUrl?: string }) {
    if (config?.model) this.model = config.model
    if (config?.baseUrl) this.baseUrl = config.baseUrl
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const prompt = this.buildPrompt(request)

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: request.agentId ? 0.7 : 0.5,  // Would get from agent config
            num_predict: 500,
          },
        }),
        signal: AbortSignal.timeout(60000),
      })

      if (!response.ok) {
        throw new Error(`Local AI error: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        content: data.response,
        model: this.model,
        tokens: {
          input: this.estimateTokens(prompt),
          output: this.estimateTokens(data.response),
          total: this.estimateTokens(prompt) + this.estimateTokens(data.response),
        },
        finishReason: data.done ? 'stop' : 'length',
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Local AI timed out')
      }
      throw error
    }
  }

  async chatStream(request: ChatRequest, onChunk: (chunk: string) => void): Promise<ChatResponse> {
    const prompt = this.buildPrompt(request)
    let fullResponse = ''

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: true,
          options: {
            temperature: 0.7,
            num_predict: 500,
          },
        }),
        signal: AbortSignal.timeout(60000),
      })

      if (!response.ok) {
        throw new Error(`Local AI error: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter((line: string) => line.trim())

        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            if (data.response) {
              fullResponse += data.response
              onChunk(data.response)
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      return {
        content: fullResponse,
        model: this.model,
        tokens: {
          input: this.estimateTokens(prompt),
          output: this.estimateTokens(fullResponse),
          total: this.estimateTokens(prompt) + this.estimateTokens(fullResponse),
        },
        finishReason: 'stop',
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Local AI timed out')
      }
      throw error
    }
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  getMaxTokens(): number {
    return 4096  // Typical local model context
  }

  private buildPrompt(request: ChatRequest): string {
    const contextMessages = request.messages.slice(-10)  // Last 10 messages for context
    let prompt = ''

    for (const msg of contextMessages) {
      const author = msg.author === 'user' ? 'User' : 'Assistant'
      prompt += `${author}: ${msg.content.text || ''}\n`
    }

    prompt += `User: ${request.prompt}\nAssistant:`
    return prompt
  }
}

// ============================================================================
// OPENAI PROVIDER
// ============================================================================

export class OpenAIProvider implements AIProvider {
  id = 'openai'
  name = 'OpenAI'
  type = 'openai' as const

  private apiKey: string
  private baseUrl: string = 'https://api.openai.com/v1'

  constructor(apiKey: string, config?: { baseUrl?: string }) {
    this.apiKey = apiKey
    if (config?.baseUrl) this.baseUrl = config.baseUrl
  }

  async isAvailable(): Promise<boolean> {
    return this.apiKey.length > 0
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const messages = this.formatMessages(request)

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      content: data.choices[0].message.content,
      model: data.model,
      tokens: {
        input: data.usage.prompt_tokens,
        output: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      },
      finishReason: data.choices[0].finish_reason,
    }
  }

  async chatStream(request: ChatRequest, onChunk: (chunk: string) => void): Promise<ChatResponse> {
    const messages = this.formatMessages(request)
    let fullResponse = ''

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 500,
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter((line: string) => line.trim().startsWith('data:'))

      for (const line of lines) {
        const data = JSON.parse(line.replace('data: ', ''))
        const content = data.choices[0]?.delta?.content
        if (content) {
          fullResponse += content
          onChunk(content)
        }
      }
    }

    return {
      content: fullResponse,
      model: 'gpt-4o-mini',
      tokens: {
        input: 0,
        output: 0,
        total: 0,
      },
      finishReason: 'stop',
    }
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  getMaxTokens(): number {
    return 128000  // GPT-4o-mini context
  }

  private formatMessages(request: ChatRequest): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = []

    for (const msg of request.messages.slice(-10)) {
      messages.push({
        role: msg.author === 'user' ? 'user' : 'assistant',
        content: msg.content.text || '',
      })
    }

    messages.push({
      role: 'user',
      content: request.prompt,
    })

    return messages
  }
}

// ============================================================================
// ANTHROPIC PROVIDER
// ============================================================================

export class AnthropicProvider implements AIProvider {
  id = 'anthropic'
  name = 'Anthropic'
  type = 'anthropic' as const

  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async isAvailable(): Promise<boolean> {
    return this.apiKey.length > 0
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const messages = this.formatMessages(request)
    const systemPrompt = this.getSystemPrompt(request)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic error: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      content: data.content[0].text,
      model: data.model,
      tokens: {
        input: data.usage.input_tokens,
        output: data.usage.output_tokens,
        total: data.usage.input_tokens + data.usage.output_tokens,
      },
      finishReason: data.stop_reason,
    }
  }

  async chatStream(request: ChatRequest, onChunk: (chunk: string) => void): Promise<ChatResponse> {
    // Streaming implementation similar to OpenAI
    return this.chat(request)
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  getMaxTokens(): number {
    return 200000  // Claude 3 Haiku context
  }

  private formatMessages(request: ChatRequest): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = []

    for (const msg of request.messages.slice(-10)) {
      messages.push({
        role: msg.author === 'user' ? 'user' : 'assistant',
        content: msg.content.text || '',
      })
    }

    messages.push({
      role: 'user',
      content: request.prompt,
    })

    return messages
  }

  private getSystemPrompt(request: ChatRequest): string {
    // Would get from agent configuration
    return 'You are a helpful AI assistant.'
  }
}

// ============================================================================
// ESCALATION HANDLER
// ============================================================================

export interface EscalationConfig {
  enabled: boolean
  patience: number  // milliseconds
  cloudProvider: AIProvider
}

export class EscalationHandler {
  private localProvider: AIProvider
  private cloudProvider: AIProvider
  private config: EscalationConfig

  constructor(
    localProvider: AIProvider,
    cloudProvider: AIProvider,
    config: EscalationConfig
  ) {
    this.localProvider = localProvider
    this.cloudProvider = cloudProvider
    this.config = config
  }

  async chat(request: ChatRequest, timeout?: number): Promise<ChatResponse> {
    if (!this.config.enabled) {
      return this.localProvider.chat(request)
    }

    const patience = timeout || this.config.patience

    try {
      // Try local provider with timeout
      const response = await this.withTimeout(
        this.localProvider.chat(request),
        patience
      )
      return response
    } catch (error) {
      // Escalate to cloud
      console.log('Local provider timed out, escalating to cloud...')
      const cloudResponse = await this.cloudProvider.chat(request)

      return {
        ...cloudResponse,
        finishReason: 'escalated',
      }
    }
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), ms)
      ),
    ])
  }
}

// ============================================================================
// PROVIDER FACTORY
// ============================================================================

export class ProviderFactory {
  private static providers = new Map<string, AIProvider>()

  static register(provider: AIProvider) {
    this.providers.set(provider.id, provider)
  }

  static get(id: string): AIProvider | undefined {
    return this.providers.get(id)
  }

  static createLocal(config?: { model?: string; baseUrl?: string }): LocalAIProvider {
    return new LocalAIProvider(config)
  }

  static createOpenAI(apiKey: string, config?: { baseUrl?: string }): OpenAIProvider {
    return new OpenAIProvider(apiKey, config)
  }

  static createAnthropic(apiKey: string): AnthropicProvider {
    return new AnthropicProvider(apiKey)
  }

  static createEscalationHandler(
    local: AIProvider,
    cloud: AIProvider,
    config: EscalationConfig
  ): EscalationHandler {
    return new EscalationHandler(local, cloud, config)
  }

  /**
   * Wrap any provider with filtration
   */
  static withFiltration(
    provider: AIProvider,
    filtrationConfig: FiltrationConfig
  ): FilteredProvider {
    return new FilteredProvider(provider, filtrationConfig)
  }
}
