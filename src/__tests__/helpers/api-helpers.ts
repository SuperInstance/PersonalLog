/**
 * API Test Helpers
 *
 * Helper functions for testing Next.js API routes.
 * Provides utilities for mocking requests, responses, and common test scenarios.
 */

import { NextRequest } from 'next/server'
import { vi, expect } from 'vitest'

// ============================================================================
// REQUEST MOCKING HELPERS
// ============================================================================

/**
 * Create a mock NextRequest with JSON body
 *
 * @example
 * const request = createMockRequest({ body: { message: 'Hello' } })
 */
export function createMockRequest(options: {
  body?: Record<string, unknown>
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'OPTIONS'
  url?: string
  headers?: Record<string, string>
}): NextRequest {
  const {
    body = {},
    method = 'POST',
    url = 'http://localhost:3000/api/test',
    headers = {},
  } = options

  // Create a minimal mock request
  const request = {
    json: async () => body,
    text: async () => JSON.stringify(body),
    url,
    method,
    headers: new Headers(headers),
  } as unknown as NextRequest

  return request
}

/**
 * Create a mock GET request with query parameters
 *
 * @example
 * const request = createMockGETRequest({
 *   url: 'http://localhost:3000/api/conversations?type=personal'
 * })
 */
export function createMockGETRequest(options: {
  url?: string
  params?: Record<string, string>
  headers?: Record<string, string>
}): NextRequest {
  const {
    url = 'http://localhost:3000/api/test',
    params = {},
    headers = {},
  } = options

  // Append query parameters to URL
  const queryString = new URLSearchParams(params).toString()
  const fullUrl = queryString ? `${url}?${queryString}` : url

  const request = {
    url: fullUrl,
    method: 'GET',
    headers: new Headers(headers),
  } as unknown as NextRequest

  return request
}

/**
 * Create a mock DELETE request
 *
 * @example
 * const request = createMockDELETERequest({
 *   url: 'http://localhost:3000/api/conversations?id=123'
 * })
 */
export function createMockDELETERequest(options: {
  url?: string
  params?: Record<string, string>
  headers?: Record<string, string>
}): NextRequest {
  const {
    url = 'http://localhost:3000/api/test',
    params = {},
    headers = {},
  } = options

  // Append query parameters to URL
  const queryString = new URLSearchParams(params).toString()
  const fullUrl = queryString ? `${url}?${queryString}` : url

  const request = {
    url: fullUrl,
    method: 'DELETE',
    headers: new Headers(headers),
  } as unknown as NextRequest

  return request
}

/**
 * Create mock params object for dynamic routes (Next.js 15 compatible)
 *
 * @example
 * const params = createMockParams({ id: 'conversation-123' })
 */
export function createMockParams<T extends Record<string, string>>(
  params: T
): { params: Promise<T> } {
  return { params: Promise.resolve(params) }
}

// ============================================================================
// RESPONSE VALIDATION HELPERS
// ============================================================================

/**
 * Extract JSON data from a Response
 *
 * @example
 * const response = await POST(request)
 * const data = await extractResponseData(response)
 */
export async function extractResponseData<T = Record<string, unknown>>(response: Response): Promise<T> {
  return (await response.json()) as T
}

/**
 * Validate error response format
 *
 * @example
 * expect(response.status).toBe(400)
 * await validateErrorResponse(response, 'Conversation ID required')
 */
export async function validateErrorResponse(
  response: Response,
  expectedErrorMessage?: string
): Promise<void> {
  expect(response.status).toBeGreaterThanOrEqual(400)

  if (expectedErrorMessage) {
    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain(expectedErrorMessage)
  }
}

// ============================================================================
// API PROVIDER MOCKING HELPERS
// ============================================================================

/**
 * Mock AI provider for testing chat endpoints
 *
 * @example
 * const mockProvider = createMockAIProvider({
 *   chatResponse: { content: 'Test response' },
 *   isAvailable: true
 * })
 */
export function createMockAIProvider(options: {
  chatResponse?: {
    content: string
    model?: string
    tokens?: number
    finishReason?: string
  }
  streamResponse?: string[]
  isAvailable?: boolean
}) {
  const {
    chatResponse = { content: 'Test AI response', model: 'test-model' },
    streamResponse = ['chunk1', 'chunk2'],
    isAvailable = true,
  } = options

  return {
    chat: vi.fn().mockResolvedValue(chatResponse),
    chatStream: vi.fn().mockImplementation(async (_req: unknown, callback: (chunk: string) => void) => {
      for (const chunk of streamResponse) {
        callback(chunk)
      }
    }),
    isAvailable: vi.fn().mockResolvedValue(isAvailable),
  }
}

/**
 * Create a mock conversation object
 *
 * @example
 * const conversation = createMockConversation({ id: 'conv-1', title: 'Test' })
 */
export function createMockConversation(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'conv-123',
    title: 'Test Conversation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create an array of mock conversations
 *
 * @example
 * const conversations = createMockConversations(3)
 */
export function createMockConversations(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) => createMockConversation({
    id: `conv-${i + 1}`,
    title: `Conversation ${i + 1}`,
  }))
}

/**
 * Create a mock message object
 *
 * @example
 * const message = createMockMessage({ role: 'user', content: 'Hello' })
 */
export function createMockMessage(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'msg-123',
    role: 'user',
    content: 'Test message',
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create an array of mock messages
 *
 * @example
 * const messages = createMockMessages(3)
 *
 * @example
 * const messages = createMockMessages(3, { conversationId: 'conv-123' })
 */
export function createMockMessages(
  count: number,
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) => createMockMessage({
    id: `msg-${i + 1}`,
    content: `Message ${i + 1}`,
    ...overrides,
  }))
}

/**
 * Create a mock AI agent/contact object
 *
 * @example
 * const agent = createMockAIAgent({ id: 'agent-1', name: 'Claude' })
 */
export function createMockAIAgent(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'agent-123',
    name: 'Test Agent',
    model: 'test-model',
    provider: 'openai',
    ...overrides,
  }
}

/**
 * Create a mock ModelConfig object with all required fields
 *
 * @example
 * const model = createMockModelConfig({ id: 'model-1', name: 'GPT-4' })
 */
export function createMockModelConfig(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'model-123',
    name: 'Test Model',
    provider: 'openai',
    modelName: 'gpt-4',
    createdAt: new Date().toISOString(),
    isActive: true,
    capabilities: {
      maxContext: 128000,
      supportsStreaming: true,
      supportsImages: false,
      supportsFunctions: true,
      estimatedSpeed: 'fast' as const,
    },
    ...overrides,
  }
}

/**
 * Create an array of mock ModelConfig objects
 *
 * @example
 * const models = createMockModelConfigs(3)
 */
export function createMockModelConfigs(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) => createMockModelConfig({
    id: `model-${i + 1}`,
    name: `Model ${i + 1}`,
  }))
}

/**
 * Create a mock AIContact object with all required fields
 *
 * @example
 * const contact = createMockAIContact({ id: 'contact-1', nickname: 'Claude' })
 */
export function createMockAIContact(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'contact-123',
    nickname: 'Test Contact',
    firstName: 'Test',
    baseModelId: 'model-123',
    systemPrompt: 'You are a helpful assistant.',
    personality: {
      vibeAttributes: [],
      learnedFrom: {
        messageCount: 0,
      },
    },
    contextFiles: [],
    responseStyle: 'balanced' as const,
    temperature: 0.7,
    maxTokens: 2048,
    color: '#000000',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create an array of mock AIContact objects
 *
 * @example
 * const contacts = createMockAIContacts(3)
 */
export function createMockAIContacts(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) => createMockAIContact({
    id: `contact-${i + 1}`,
    nickname: `Contact ${i + 1}`,
  }))
}

/**
 * Mock conversation store for testing conversation endpoints
 *
 * @example
 * const mockStore = createMockConversationStore({
 *   conversations: [mockConversation],
 *   createConversation: mockNewConversation
 * })
 */
export function createMockConversationStore(options: {
  conversations?: unknown[]
  messages?: unknown[]
  createConversation?: unknown
  deleteConversation?: void
  addMessage?: unknown
}) {
  const {
    conversations = [],
    messages = [],
    createConversation = { id: 'new-conv-123', title: 'New Conversation' },
    deleteConversation,
    addMessage = { id: 'new-msg-123', text: 'New message' },
  } = options

  return {
    listConversations: vi.fn().mockResolvedValue(conversations),
    createConversation: vi.fn().mockResolvedValue(createConversation),
    deleteConversation: vi.fn().mockResolvedValue(deleteConversation),
    getMessages: vi.fn().mockResolvedValue(messages),
    addMessage: vi.fn().mockResolvedValue(addMessage),
    updateMessage: vi.fn(),
    deleteMessage: vi.fn().mockResolvedValue(undefined),
  }
}

/**
 * Mock vector store for testing knowledge endpoints
 *
 * @example
 * const mockStore = createMockVectorStore({
 *   searchResults: [{ id: '1', content: 'Test', score: 0.9 }]
 * })
 */
export function createMockVectorStore(options: {
  searchResults?: unknown[]
  entries?: unknown[]
  checkpoints?: unknown[]
  syncResult?: unknown
} = {}) {
  const {
    searchResults = [],
    entries = [],
    checkpoints = [],
    syncResult = { success: true },
  } = options

  return {
    init: vi.fn().mockResolvedValue(undefined),
    hybridSearch: vi.fn().mockResolvedValue(searchResults),
    getEntries: vi.fn().mockResolvedValue(entries),
    getCheckpoints: vi.fn().mockResolvedValue(checkpoints),
    addEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    createCheckpoint: vi.fn(),
    rollbackToCheckpoint: vi.fn(),
    exportForLoRA: vi.fn(),
  }
}

/**
 * Mock module registry for testing module endpoints
 *
 * @example
 * const mockRegistry = createMockModuleRegistry({
 *   modules: [{ id: 'test-module', name: 'Test', loaded: false }]
 * })
 */
export function createMockModuleRegistry(options: {
  modules?: unknown[]
  stats?: {
    totalModules?: number
    loadedModules?: number
    failedModules?: number
  }
}) {
  const {
    modules = [],
    stats = { totalModules: modules.length, loadedModules: 0, failedModules: 0 },
  } = options

  return {
    getAllModules: vi.fn().mockReturnValue(modules),
    getModuleState: vi.fn().mockImplementation((id: string) => modules.find((m: any) => m.id === id)),
    updateModuleStatus: vi.fn(),
    updateModuleResources: vi.fn(),
    getStatistics: vi.fn().mockReturnValue(stats),
  }
}

/**
 * Mock model store for testing models/contacts endpoints
 *
 * @example
 * const mockStore = createMockModelStore({
 *   models: [{ id: 'model-1', name: 'GPT-4' }],
 *   contacts: [{ id: 'contact-1', name: 'Claude' }]
 * })
 */
export function createMockModelStore(options: {
  models?: unknown[]
  contacts?: unknown[]
}) {
  const { models = [], contacts = [] } = options

  return {
    listModels: vi.fn().mockResolvedValue(models),
    addModel: vi.fn(),
    deleteModel: vi.fn(),
    getModel: vi.fn(),
    updateModel: vi.fn(),
    listContacts: vi.fn().mockResolvedValue(contacts),
    createContact: vi.fn(),
    getContact: vi.fn(),
    updateContact: vi.fn(),
    deleteContact: vi.fn(),
    forkContact: vi.fn(),
  }
}

// ============================================================================
// ENVIRONMENT MOCKING HELPERS
// ============================================================================

/**
 * Mock environment variables for API keys
 *
 * @example
 * mockEnvKeys({ OPENAI_API_KEY: 'sk-test', ANTHROPIC_API_KEY: 'sk-ant-test' })
 * // ... run tests ...
 * restoreEnvKeys()
 */
export function mockEnvKeys(keys: Record<string, string>): () => void {
  const originalEnv = { ...process.env }

  // Set mock values
  for (const [key, value] of Object.entries(keys)) {
    process.env[key] = value
  }

  // Return restore function
  return () => {
    for (const key of Object.keys(keys)) {
      if (originalEnv[key] !== undefined) {
        process.env[key] = originalEnv[key]
      } else {
        delete process.env[key]
      }
    }
  }
}

/**
 * Restore environment variables to original values
 *
 * @example
 * restoreEnvKeys()
 */
export function restoreEnvKeys(): void {
  // This is a no-op now since mockEnvKeys returns a restore function
  // Kept for backwards compatibility
}

/**
 * Legacy restore environment function alias
 */
export const restoreEnv = restoreEnvKeys

// ============================================================================
// STREAMING RESPONSE HELPERS
// ============================================================================

/**
 * Read chunks from a streaming response
 *
 * @example
 * const response = await POST(request)
 * const chunks = await readStreamChunks(response)
 * expect(chunks).toEqual(['chunk1', 'chunk2'])
 */
export async function readStreamChunks(response: Response): Promise<string[]> {
  const chunks: string[] = []
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  if (!reader) {
    throw new Error('Response body is not readable')
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

    for (const line of lines) {
      const data = line.replace('data: ', '').trim()
      if (data === '[DONE]') continue

      try {
        const parsed = JSON.parse(data)
        if (parsed.content) {
          chunks.push(parsed.content)
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }

  return chunks
}

// ============================================================================
// COMMON ASSERTION HELPERS
// ============================================================================

/**
 * Assert response has success status code
 */
export function assertSuccess(response: Response): void {
  expect(response.status).toBeGreaterThanOrEqual(200)
  expect(response.status).toBeLessThan(300)
}

/**
 * Assert response has error status code
 */
export function assertError(
  response: Response,
  expectedStatus?: number
): void {
  expect(response.status).toBeGreaterThanOrEqual(400)
  if (expectedStatus) {
    expect(response.status).toBe(expectedStatus)
  }
}

/**
 * Assert response contains expected data structure
 */
export async function assertResponseStructure<T extends Record<string, unknown>>(
  response: Response,
  expectedFields: (keyof T)[]
): Promise<void> {
  const data = await extractResponseData<T>(response)

  for (const field of expectedFields) {
    expect(data).toHaveProperty(field as string)
  }
}
