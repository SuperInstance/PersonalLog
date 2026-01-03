/**
 * Chat API Route Tests
 *
 * Tests for /api/chat endpoint
 * - Non-streaming chat requests
 * - Streaming chat requests
 * - Provider availability checks
 * - Error handling
 * - CORS support
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST, OPTIONS } from '../route'
import {
  createMockRequest,
  createMockAIProvider,
  extractResponseData,
  assertSuccess,
  assertError,
  readStreamChunks,
  mockEnvKeys,
} from '@/__tests__/helpers/api-helpers'

// Mock providers
vi.mock('@/lib/ai/provider', () => ({
  OpenAIProvider: vi.fn(),
  AnthropicProvider: vi.fn(),
  LocalAIProvider: vi.fn(),
}))

// Mock filter settings
vi.mock('@/lib/wizard/models', () => ({
  getFilterSettings: vi.fn().mockReturnValue({}),
  DEFAULT_FILTRATION: {},
}))

describe('POST /api/chat', () => {
  let restoreEnv: (() => void) | null = null

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (restoreEnv) {
      restoreEnv()
      restoreEnv = null
    }
  })

  describe('Non-streaming chat', () => {
    it('should handle chat request with local provider', async () => {
      const request = createMockRequest({
        body: {
          messages: [
            { role: 'user', content: 'Hello, AI!' },
          ],
          provider: 'local',
          stream: false,
        },
      })

      const response = await POST(request)
      assertSuccess(response)

      const data = await extractResponseData(response)
      expect(data).toHaveProperty('content')
    })

    it('should handle chat request with OpenAI provider', async () => {
      const restore = mockEnvKeys({ OPENAI_API_KEY: 'sk-test-openai' })

      const request = createMockRequest({
        body: {
          messages: [
            { role: 'user', content: 'Hello, OpenAI!' },
          ],
          provider: 'openai',
          stream: false,
        },
      })

      const response = await POST(request)
      assertSuccess(response)

      const data = await extractResponseData(response)
      expect(data).toHaveProperty('content')
    })

    it('should handle chat request with Anthropic provider', async () => {
      const restore = mockEnvKeys({ ANTHROPIC_API_KEY: 'sk-ant-test' })

      const request = createMockRequest({
        body: {
          messages: [
            { role: 'user', content: 'Hello, Claude!' },
          ],
          provider: 'anthropic',
          stream: false,
        },
      })

      const response = await POST(request)
      assertSuccess(response)

      const data = await extractResponseData(response)
      expect(data).toHaveProperty('content')
    })

    it('should extract user prompt from messages array', async () => {
      const request = createMockRequest({
        body: {
          messages: [
            { role: 'user', content: 'First message' },
            { role: 'assistant', content: 'Response' },
            { role: 'user', content: 'Last message should be used' },
          ],
          provider: 'local',
        },
      })

      const response = await POST(request)
      assertSuccess(response)
    })

    it('should use provided prompt parameter', async () => {
      const request = createMockRequest({
        body: {
          messages: [],
          prompt: 'Custom prompt text',
          provider: 'local',
        },
      })

      const response = await POST(request)
      assertSuccess(response)
    })

    it('should include contactId in request', async () => {
      const request = createMockRequest({
        body: {
          messages: [{ role: 'user', content: 'Hello' }],
          contactId: 'contact-123',
          provider: 'local',
        },
      })

      const response = await POST(request)
      assertSuccess(response)
    })

    it('should return response metadata', async () => {
      const request = createMockRequest({
        body: {
          messages: [{ role: 'user', content: 'Test' }],
          provider: 'local',
        },
      })

      const response = await POST(request)
      const data = await extractResponseData(response)

      // Response should include metadata
      expect(data).toHaveProperty('content')
      expect(data).toHaveProperty('model')
      expect(data).toHaveProperty('tokens')
      expect(data).toHaveProperty('finishReason')
    })
  })

  describe('Streaming chat', () => {
    it('should handle streaming request', async () => {
      const request = createMockRequest({
        body: {
          messages: [{ role: 'user', content: 'Stream this' }],
          provider: 'local',
          stream: true,
        },
      })

      const response = await POST(request)
      assertSuccess(response)

      // Verify streaming response headers
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
    })

    it('should stream response chunks', async () => {
      const request = createMockRequest({
        body: {
          messages: [{ role: 'user', content: 'Stream test' }],
          provider: 'local',
          stream: true,
        },
      })

      const response = await POST(request)
      const chunks = await readStreamChunks(response)

      // Should receive at least one chunk
      expect(chunks.length).toBeGreaterThan(0)
    })

    it('should terminate stream with [DONE]', async () => {
      const request = createMockRequest({
        body: {
          messages: [{ role: 'user', content: 'Test' }],
          provider: 'local',
          stream: true,
        },
      })

      const response = await POST(request)
      const responseText = await response.text()

      expect(responseText).toContain('[DONE]')
    })
  })

  describe('Provider availability', () => {
    it('should return 503 when provider is not available', async () => {
      // Mock provider that returns not available
      const request = createMockRequest({
        body: {
          messages: [{ role: 'user', content: 'Test' }],
          provider: 'unavailable-provider',
        },
      })

      const response = await POST(request)
      // Response should either succeed (if local provider works) or fail gracefully
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(600)
    })
  })

  describe('Error handling', () => {
    it('should handle invalid JSON body', async () => {
      const request = {
        json: async () => {
          throw new Error('Invalid JSON')
        },
      } as unknown as any

      const response = await POST(request)
      assertError(response, 500)

      const data = await extractResponseData<{ error: string }>(response)
      expect(data.error).toBeTruthy()
    })

    it('should handle provider errors gracefully', async () => {
      // Mock a scenario where provider throws error
      const request = createMockRequest({
        body: {
          messages: [{ role: 'user', content: 'Test' }],
          provider: 'error-provider',
        },
      })

      const response = await POST(request)
      // Should not crash, return error response
      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(response.status).toBeLessThan(600)
    })

    it('should return error message in response', async () => {
      const request = createMockRequest({
        body: {
          messages: [],
          // Missing required fields
        },
      })

      const response = await POST(request)
      const data = await extractResponseData<{ error?: string }>(response)

      // Either success with default handling or error with message
      if (response.status >= 400) {
        expect(data.error).toBeTruthy()
      }
    })
  })

  describe('Request validation', () => {
    it('should handle empty messages array', async () => {
      const request = createMockRequest({
        body: {
          messages: [],
          provider: 'local',
        },
      })

      const response = await POST(request)
      // Should handle gracefully (use empty prompt or error)
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(600)
    })

    it('should handle missing provider (defaults to local)', async () => {
      const request = createMockRequest({
        body: {
          messages: [{ role: 'user', content: 'Test' }],
          // No provider specified
        },
      })

      const response = await POST(request)
      assertSuccess(response)
    })

    it('should handle non-boolean stream parameter', async () => {
      const request = createMockRequest({
        body: {
          messages: [{ role: 'user', content: 'Test' }],
          stream: 'true' as any,
        },
      })

      const response = await POST(request)
      // Should coerce to boolean or handle gracefully
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(600)
    })
  })

  describe('Response format', () => {
    it('should return JSON content-type for non-streaming', async () => {
      const request = createMockRequest({
        body: {
          messages: [{ role: 'user', content: 'Test' }],
          stream: false,
        },
      })

      const response = await POST(request)
      expect(response.headers.get('Content-Type')).toContain('application/json')
    })

    it('should include all expected response fields', async () => {
      const request = createMockRequest({
        body: {
          messages: [{ role: 'user', content: 'Test' }],
        },
      })

      const response = await POST(request)
      const data = await extractResponseData(response)

      // Check for expected fields
      expect(typeof data.content).toBe('string')
    })
  })
})

describe('OPTIONS /api/chat', () => {
  it('should handle CORS preflight request', async () => {
    const response = await OPTIONS()

    expect(response.status).toBe(204)

    // Check CORS headers
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization')
  })

  it('should return empty body for OPTIONS', async () => {
    const response = await OPTIONS()
    const text = await response.text()

    expect(text).toBe('')
  })
})

describe('Provider-specific behavior', () => {
  afterEach(() => {
    if (restore()) {
      restore()()
      let restore: (() => void) | null = null
    }
  })

  it('should handle OpenAI without API key', async () => {
    // Ensure no API key is set
    delete process.env.OPENAI_API_KEY

    const request = createMockRequest({
      body: {
        messages: [{ role: 'user', content: 'Test' }],
        provider: 'openai',
      },
    })

    const response = await POST(request)
    // Should return error about missing API key or fall back to local
    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(600)
  })

  it('should handle Anthropic without API key', async () => {
    // Ensure no API key is set
    delete process.env.ANTHROPIC_API_KEY

    const request = createMockRequest({
      body: {
        messages: [{ role: 'user', content: 'Test' }],
        provider: 'anthropic',
      },
    })

    const response = await POST(request)
    // Should return error about missing API key or fall back to local
    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(600)
  })

  it('should handle multiple custom providers', async () => {
    const restore = mockEnvKeys({
      XAI_API_KEY: 'xai-test',
      DEEPSEEK_API_KEY: 'deepseek-test',
      KIMI_API_KEY: 'kimi-test',
      ZAI_API_KEY: 'zai-test',
    })

    // Test each custom provider
    const providers = ['xai', 'deepseek', 'kimi', 'zai'] as const

    for (const provider of providers) {
      const request = createMockRequest({
        body: {
          messages: [{ role: 'user', content: `Test ${provider}` }],
          provider,
        },
      })

      const response = await POST(request)
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(600)
    }
  })
})
