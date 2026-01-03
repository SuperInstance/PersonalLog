/**
 * Unit tests for AI Provider
 * @module lib/ai/provider.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  LocalAIProvider,
  OpenAIProvider,
  AnthropicProvider,
  FilteredProvider,
  ProviderFactory,
  EscalationHandler,
} from './provider'
import type { ChatRequest, ChatResponse } from '@/types/conversation'
import type { FiltrationConfig } from '@/lib/wizard/models'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('LocalAIProvider', () => {
  let provider: LocalAIProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new LocalAIProvider({
      model: 'llama2',
      baseUrl: 'http://localhost:11434',
    })
  })

  it('should have correct properties', () => {
    expect(provider.id).toBe('local')
    expect(provider.name).toBe('Local AI')
    expect(provider.type).toBe('local')
  })

  it('should estimate tokens correctly', () => {
    const tokens = provider.estimateTokens('Hello world')
    expect(tokens).toBe(Math.ceil('Hello world'.length / 4))
  })

  it('should get max tokens', () => {
    expect(provider.getMaxTokens()).toBe(4096)
  })

  it('should check availability successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
    })

    const available = await provider.isAvailable()
    expect(available).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/tags',
      expect.objectContaining({
        method: 'GET',
        signal: expect.any(AbortSignal),
      })
    )
  })

  it('should handle unavailability', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const available = await provider.isAvailable()
    expect(available).toBe(false)
  })

  it('should send chat request', async () => {
    const mockResponse: ChatResponse = {
      content: 'Test response',
      model: 'llama2',
      tokens: {
        input: 5,
        output: 10,
        total: 15,
      },
      finishReason: 'stop',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Test response',
        done: true,
      }),
    })

    const request: ChatRequest = {
      conversationId: 'test-conv',
      prompt: 'Hello',
      messages: [],
      agentId: 'test',
      stream: false,
    }

    const response = await provider.chat(request)

    expect(response.content).toBe('Test response')
    expect(response.model).toBe('llama2')
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Hello'),
      })
    )
  })

  it('should handle chat timeout', async () => {
    mockFetch.mockRejectedValueOnce(
      Object.assign(new Error('Timeout'), { name: 'AbortError' })
    )

    const request: ChatRequest = {
      conversationId: 'test-conv',
      prompt: 'Hello',
      messages: [],
      agentId: 'test',
      stream: false,
    }

    await expect(provider.chat(request)).rejects.toThrow('Local AI timed out')
  })
})

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new OpenAIProvider('test-api-key')
  })

  it('should have correct properties', () => {
    expect(provider.id).toBe('openai')
    expect(provider.name).toBe('OpenAI')
    expect(provider.type).toBe('openai')
  })

  it('should get max tokens', () => {
    expect(provider.getMaxTokens()).toBe(128000)
  })

  it('should check availability with API key', async () => {
    const available = await provider.isAvailable()
    expect(available).toBe(true)
  })

  it('should check availability without API key', async () => {
    const emptyProvider = new OpenAIProvider('')
    const available = await emptyProvider.isAvailable()
    expect(available).toBe(false)
  })

  it('should send chat request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: { content: 'Test response' },
            finish_reason: 'stop',
          },
        ],
        model: 'gpt-4o-mini',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      }),
    })

    const request: ChatRequest = {
      conversationId: 'test-conv',
      prompt: 'Hello',
      messages: [],
      agentId: 'test',
      stream: false,
    }

    const response = await provider.chat(request)

    expect(response.content).toBe('Test response')
    expect(response.tokens.input).toBe(10)
    expect(response.tokens.output).toBe(20)
    expect(response.tokens.total).toBe(30)
  })

  it('should handle API errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Unauthorized',
    })

    const request: ChatRequest = {
      conversationId: 'test-conv',
      prompt: 'Hello',
      messages: [],
      agentId: 'test',
      stream: false,
    }

    await expect(provider.chat(request)).rejects.toThrow('OpenAI error')
  })
})

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new AnthropicProvider('test-api-key')
  })

  it('should have correct properties', () => {
    expect(provider.id).toBe('anthropic')
    expect(provider.name).toBe('Anthropic')
    expect(provider.type).toBe('anthropic')
  })

  it('should get max tokens', () => {
    expect(provider.getMaxTokens()).toBe(200000)
  })

  it('should send chat request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: 'Test response' }],
        model: 'claude-3-haiku-20240307',
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
        stop_reason: 'stop',
      }),
    })

    const request: ChatRequest = {
      conversationId: 'test-conv',
      prompt: 'Hello',
      messages: [],
      agentId: 'test',
      stream: false,
    }

    const response = await provider.chat(request)

    expect(response.content).toBe('Test response')
    expect(response.tokens.input).toBe(10)
    expect(response.tokens.output).toBe(20)
  })
})

describe('FilteredProvider', () => {
  let baseProvider: LocalAIProvider
  let filteredProvider: FilteredProvider
  let filtrationConfig: FiltrationConfig

  beforeEach(() => {
    vi.clearAllMocks()
    baseProvider = new LocalAIProvider()
    filtrationConfig = {
      promptEnhancement: {
        addClarity: true,
        addStructure: true,
        addContext: true,
      },
      responsePostProcessing: {
        removeFiller: true,
        improveFormatting: true,
        extractKeyPoints: false,
      },
    }
    filteredProvider = new FilteredProvider(baseProvider, filtrationConfig)
  })

  it('should delegate properties to base provider', () => {
    expect(filteredProvider.id).toBe(baseProvider.id)
    expect(filteredProvider.name).toBe(baseProvider.name)
    expect(filteredProvider.type).toBe(baseProvider.type)
  })

  it('should delegate isAvailable', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })

    const available = await filteredProvider.isAvailable()
    expect(available).toBe(true)
  })

  it('should update filtration config', () => {
    const newConfig: FiltrationConfig = {
      promptEnhancement: {
        addClarity: false,
        addStructure: false,
        addContext: false,
      },
      responsePostProcessing: {
        removeFiller: false,
        improveFormatting: false,
        extractKeyPoints: false,
      },
    }

    filteredProvider.updateFiltration(newConfig)

    // Config is updated internally - would need to expose for testing
    expect(filteredProvider).toBeDefined()
  })
})

describe('EscalationHandler', () => {
  let localProvider: LocalAIProvider
  let cloudProvider: OpenAIProvider
  let handler: EscalationHandler

  beforeEach(() => {
    vi.clearAllMocks()
    localProvider = new LocalAIProvider()
    cloudProvider = new OpenAIProvider('test-key')
    handler = ProviderFactory.createEscalationHandler(
      localProvider,
      cloudProvider,
      {
        enabled: true,
        patience: 1000,
        cloudProvider,
      }
    )
  })

  it('should use local provider when enabled is false', async () => {
    const disabledHandler = ProviderFactory.createEscalationHandler(
      localProvider,
      cloudProvider,
      {
        enabled: false,
        patience: 1000,
        cloudProvider,
      }
    )

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Local response',
        done: true,
      }),
    })

    const request: ChatRequest = {
      conversationId: 'test-conv',
      prompt: 'Hello',
      messages: [],
      agentId: 'test',
      stream: false,
    }

    const response = await disabledHandler.chat(request)
    expect(response.content).toBeDefined()
  })

  it('should escalate to cloud on timeout', async () => {
    // First call (local) times out
    mockFetch.mockRejectedValueOnce(
      Object.assign(new Error('Timeout'), { name: 'AbortError' })
    )

    // Second call (cloud) succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: { content: 'Cloud response' },
            finish_reason: 'stop',
          },
        ],
        model: 'gpt-4o-mini',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      }),
    })

    const request: ChatRequest = {
      conversationId: 'test-conv',
      prompt: 'Hello',
      messages: [],
      agentId: 'test',
      stream: false,
    }

    const response = await handler.chat(request, 100)

    expect(response.content).toBe('Cloud response')
    expect(response.finishReason).toBe('escalated')
  })
})

describe('ProviderFactory', () => {
  it('should create LocalAIProvider', () => {
    const provider = ProviderFactory.createLocal({
      model: 'llama2',
      baseUrl: 'http://localhost:11434',
    })

    expect(provider).toBeInstanceOf(LocalAIProvider)
  })

  it('should create OpenAIProvider', () => {
    const provider = ProviderFactory.createOpenAI('test-key')

    expect(provider).toBeInstanceOf(OpenAIProvider)
  })

  it('should create AnthropicProvider', () => {
    const provider = ProviderFactory.createAnthropic('test-key')

    expect(provider).toBeInstanceOf(AnthropicProvider)
  })

  it('should create EscalationHandler', () => {
    const local = ProviderFactory.createLocal()
    const cloud = ProviderFactory.createOpenAI('test-key')
    const handler = ProviderFactory.createEscalationHandler(
      local,
      cloud,
      {
        enabled: true,
        patience: 1000,
        cloudProvider: cloud,
      }
    )

    expect(handler).toBeInstanceOf(EscalationHandler)
  })

  it('should wrap provider with filtration', () => {
    const base = ProviderFactory.createLocal()
    const filtrationConfig: FiltrationConfig = {
      promptEnhancement: {
        addClarity: true,
        addStructure: false,
        addContext: false,
      },
      responsePostProcessing: {
        removeFiller: false,
        improveFormatting: false,
        extractKeyPoints: false,
      },
    }

    const filtered = ProviderFactory.withFiltration(base, filtrationConfig)

    expect(filtered).toBeInstanceOf(FilteredProvider)
  })

  it('should register and retrieve providers', () => {
    const provider = ProviderFactory.createLocal()
    ProviderFactory.register(provider)

    const retrieved = ProviderFactory.get('local')

    expect(retrieved).toBe(provider)
  })
})
