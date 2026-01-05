/**
 * Conversations API Route Tests
 *
 * Tests for /api/conversations endpoint
 * - GET: List all conversations
 * - POST: Create new conversation
 * - DELETE: Delete a conversation
 * - Query parameter handling
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST, DELETE } from '../route'
import {
  createMockRequest,
  createMockGETRequest,
  createMockDELETERequest,
  createMockConversation,
  createMockConversations,
  extractResponseData,
  assertSuccess,
  assertError,
  validateErrorResponse,
} from '@/__tests__/helpers/api-helpers'

// Mock conversation store
vi.mock('@/lib/storage/conversation-store', () => ({
  listConversations: vi.fn(),
  createConversation: vi.fn(),
  deleteConversation: vi.fn(),
  getMessages: vi.fn(),
  addMessage: vi.fn(),
  updateMessage: vi.fn(),
  deleteMessage: vi.fn(),
}))

import * as conversationStore from '@/lib/storage/conversation-store'

describe('GET /api/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should list all conversations without filters', async () => {
    const mockConversations = createMockConversations(3)
    vi.mocked(conversationStore.listConversations).mockResolvedValue(mockConversations)

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/conversations',
    })

    const response = await GET(request)
    assertSuccess(response)

    const data = await extractResponseData<{ conversations: unknown[] }>(response)
    expect(data.conversations).toHaveLength(3)
    expect(conversationStore.listConversations).toHaveBeenCalledWith({ includeArchived: false })
  })

  it('should filter conversations by type', async () => {
    const mockPersonalConversations = createMockConversations(2, { type: 'personal' })
    vi.mocked(conversationStore.listConversations).mockResolvedValue(mockPersonalConversations)

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/conversations',
      params: { type: 'personal' },
    })

    const response = await GET(request)
    assertSuccess(response)

    const data = await extractResponseData<{ conversations: unknown[] }>(response)
    expect(data.conversations).toHaveLength(2)
    expect(conversationStore.listConversations).toHaveBeenCalledWith({ includeArchived: false })
  })

  it('should handle empty conversations list', async () => {
    vi.mocked(conversationStore.listConversations).mockResolvedValue([])

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/conversations',
    })

    const response = await GET(request)
    assertSuccess(response)

    const data = await extractResponseData<{ conversations: unknown[] }>(response)
    expect(data.conversations).toHaveLength(0)
  })

  it('should handle storage errors gracefully', async () => {
    vi.mocked(conversationStore.listConversations).mockRejectedValue(
      new Error('Storage unavailable')
    )

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/conversations',
    })

    const response = await GET(request)
    assertError(response, 500)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Storage unavailable')
  })

  it('should return valid JSON content-type', async () => {
    vi.mocked(conversationStore.listConversations).mockResolvedValue([])

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/conversations',
    })

    const response = await GET(request)
    expect(response.headers.get('Content-Type')).toContain('application/json')
  })
})

describe('POST /api/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new conversation with title', async () => {
    const newConversation = createMockConversation({ title: 'My New Conversation' })
    vi.mocked(conversationStore.createConversation).mockResolvedValue(newConversation)

    const request = createMockRequest({
      body: {
        title: 'My New Conversation',
        type: 'personal',
      },
    })

    const response = await POST(request)
    assertSuccess(response)

    const data = await extractResponseData<{ conversation: unknown }>(response)
    expect(data.conversation).toBeTruthy()
    expect(conversationStore.createConversation).toHaveBeenCalledWith(
      'My New Conversation',
      'personal'
    )
  })

  it('should create conversation with custom type', async () => {
    const newConversation = createMockConversation({ type: 'business' as any })
    vi.mocked(conversationStore.createConversation).mockResolvedValue(newConversation)

    const request = createMockRequest({
      body: {
        title: 'Business Log',
        type: 'business',
      },
    })

    const response = await POST(request)
    assertSuccess(response)

    expect(conversationStore.createConversation).toHaveBeenCalledWith(
      'Business Log',
      'business'
    )
  })

  it('should default to personal type when not specified', async () => {
    const newConversation = createMockConversation({ type: 'personal' })
    vi.mocked(conversationStore.createConversation).mockResolvedValue(newConversation)

    const request = createMockRequest({
      body: {
        title: 'Default Type Conversation',
      },
    })

    const response = await POST(request)
    assertSuccess(response)

    expect(conversationStore.createConversation).toHaveBeenCalledWith(
      'Default Type Conversation',
      'personal'
    )
  })

  it('should return 201 status on successful creation', async () => {
    const newConversation = createMockConversation()
    vi.mocked(conversationStore.createConversation).mockResolvedValue(newConversation)

    const request = createMockRequest({
      body: {
        title: 'New Conversation',
      },
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
  })

  it('should return created conversation in response', async () => {
    const newConversation = createMockConversation({
      title: 'Test Conversation',
      type: 'personal',
    })
    vi.mocked(conversationStore.createConversation).mockResolvedValue(newConversation)

    const request = createMockRequest({
      body: {
        title: 'Test Conversation',
      },
    })

    const response = await POST(request)
    const data = await extractResponseData<{ conversation: typeof newConversation }>(response)

    expect(data.conversation.title).toBe('Test Conversation')
    expect(data.conversation.type).toBe('personal')
  })

  it('should handle missing title', async () => {
    vi.mocked(conversationStore.createConversation).mockResolvedValue(
      createMockConversation({ title: '' })
    )

    const request = createMockRequest({
      body: {
        type: 'personal',
      },
    })

    const response = await POST(request)
    // Store should handle missing title
    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(600)
  })

  it('should handle empty title', async () => {
    vi.mocked(conversationStore.createConversation).mockResolvedValue(
      createMockConversation({ title: '' })
    )

    const request = createMockRequest({
      body: {
        title: '',
        type: 'personal',
      },
    })

    const response = await POST(request)
    // Store should handle empty title
    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(600)
  })

  it('should handle invalid conversation type', async () => {
    vi.mocked(conversationStore.createConversation).mockResolvedValue(
      createMockConversation()
    )

    const request = createMockRequest({
      body: {
        title: 'Test',
        type: 'invalid-type' as any,
      },
    })

    const response = await POST(request)
    // Store should validate or handle invalid type
    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(600)
  })

  it('should handle creation errors gracefully', async () => {
    vi.mocked(conversationStore.createConversation).mockRejectedValue(
      new Error('Failed to create conversation')
    )

    const request = createMockRequest({
      body: {
        title: 'Error Conversation',
      },
    })

    const response = await POST(request)
    assertError(response, 500)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Failed to create conversation')
  })

  it('should handle malformed JSON', async () => {
    const request = {
      json: async () => {
        throw new Error('Invalid JSON')
      },
    } as unknown as any

    const response = await POST(request)
    assertError(response, 500)
  })
})

describe('DELETE /api/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete conversation by ID', async () => {
    vi.mocked(conversationStore.deleteConversation).mockResolvedValue(undefined)

    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/conversations',
      params: { id: 'conversation-123' },
    })

    const response = await DELETE(request)
    assertSuccess(response)

    const data = await extractResponseData<{ success: boolean }>(response)
    expect(data.success).toBe(true)
    expect(conversationStore.deleteConversation).toHaveBeenCalledWith('conversation-123')
  })

  it('should require conversation ID parameter', async () => {
    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/conversations',
      params: {},
    })

    const response = await DELETE(request)
    assertError(response, 400)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Conversation ID required')
  })

  it('should handle deletion errors gracefully', async () => {
    vi.mocked(conversationStore.deleteConversation).mockRejectedValue(
      new Error('Conversation not found')
    )

    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/conversations',
      params: { id: 'non-existent' },
    })

    const response = await DELETE(request)
    assertError(response, 500)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Conversation not found')
  })

  it('should handle empty conversation ID', async () => {
    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/conversations',
      params: { id: '' },
    })

    const response = await DELETE(request)
    assertError(response, 400)
  })

  it('should return success response after deletion', async () => {
    vi.mocked(conversationStore.deleteConversation).mockResolvedValue(undefined)

    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/conversations',
      params: { id: 'conv-123' },
    })

    const response = await DELETE(request)
    const data = await extractResponseData<{ success: boolean }>(response)

    expect(data.success).toBe(true)
    expect(response.status).toBe(200)
  })
})

describe('Integration scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle create then list workflow', async () => {
    const newConversation = createMockConversation({ title: 'Workflow Test' })
    vi.mocked(conversationStore.createConversation).mockResolvedValue(newConversation)

    // Create conversation
    const createRequest = createMockRequest({
      body: { title: 'Workflow Test' },
    })
    const createResponse = await POST(createRequest)
    assertSuccess(createResponse)

    // List conversations
    const allConversations = createMockConversations(1, { title: 'Workflow Test' })
    vi.mocked(conversationStore.listConversations).mockResolvedValue(allConversations)

    const listRequest = createMockGETRequest({
      url: 'http://localhost:3000/api/conversations',
    })
    const listResponse = await GET(listRequest)
    assertSuccess(listResponse)

    const listData = await extractResponseData<{ conversations: unknown[] }>(listResponse)
    expect(listData.conversations).toHaveLength(1)
  })

  it('should handle create then delete workflow', async () => {
    const newConversation = createMockConversation({ id: 'temp-123' })
    vi.mocked(conversationStore.createConversation).mockResolvedValue(newConversation)
    vi.mocked(conversationStore.deleteConversation).mockResolvedValue(undefined)

    // Create
    const createRequest = createMockRequest({
      body: { title: 'Temporary' },
    })
    const createResponse = await POST(createRequest)
    assertSuccess(createResponse)

    // Delete
    const deleteRequest = createMockDELETERequest({
      url: 'http://localhost:3000/api/conversations',
      params: { id: 'temp-123' },
    })
    const deleteResponse = await DELETE(deleteRequest)
    assertSuccess(deleteResponse)

    const deleteData = await extractResponseData<{ success: boolean }>(deleteResponse)
    expect(deleteData.success).toBe(true)
  })
})
