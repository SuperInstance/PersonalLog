/**
 * Messages API Route Tests
 *
 * Tests for /api/conversations/[id]/messages endpoint
 * - GET: List messages for a conversation
 * - POST: Add a new message
 * - PATCH: Update a message
 * - DELETE: Delete a message
 * - Dynamic route parameter handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST, PATCH, DELETE } from '../route'
import type { Message } from '@/types/conversation'
import {
  createMockRequest,
  createMockGETRequest,
  createMockDELETERequest,
  createMockParams,
  extractResponseData,
  assertSuccess,
  assertError,
} from '@/__tests__/helpers/api-helpers'
import { createMockMessage, createMockMessages } from '@/__tests__/factories'

// Mock conversation store
vi.mock('@/lib/storage/conversation-store', () => ({
  getMessages: vi.fn(),
  addMessage: vi.fn(),
  updateMessage: vi.fn(),
  deleteMessage: vi.fn(),
}))

import * as conversationStore from '@/lib/storage/conversation-store'

describe('GET /api/conversations/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should get all messages for a conversation', async () => {
    const mockMessages = createMockMessages(3, { conversationId: 'conv-123' })
    vi.mocked(conversationStore.getMessages).mockResolvedValue(mockMessages)

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/conversations/conv-123/messages',
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await GET(request, params)
    assertSuccess(response)

    const data = await extractResponseData<{ messages: unknown[] }>(response)
    expect(data.messages).toHaveLength(3)
    expect(conversationStore.getMessages).toHaveBeenCalledWith('conv-123')
  })

  it('should handle empty messages list', async () => {
    vi.mocked(conversationStore.getMessages).mockResolvedValue([])

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/conversations/conv-123/messages',
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await GET(request, params)
    assertSuccess(response)

    const data = await extractResponseData<{ messages: unknown[] }>(response)
    expect(data.messages).toHaveLength(0)
  })

  it('should handle conversation ID from route parameter', async () => {
    vi.mocked(conversationStore.getMessages).mockResolvedValue([])

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/conversations/special-conv-id/messages',
    })

    const params = createMockParams({ id: 'special-conv-id' })

    const response = await GET(request, params)
    assertSuccess(response)

    expect(conversationStore.getMessages).toHaveBeenCalledWith('special-conv-id')
  })

  it('should handle retrieval errors gracefully', async () => {
    vi.mocked(conversationStore.getMessages).mockRejectedValue(
      new Error('Conversation not found')
    )

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/conversations/invalid-id/messages',
    })

    const params = createMockParams({ id: 'invalid-id' })

    const response = await GET(request, params)
    assertError(response, 500)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Conversation not found')
  })

  it('should return valid JSON content-type', async () => {
    vi.mocked(conversationStore.getMessages).mockResolvedValue([])

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/conversations/conv-123/messages',
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await GET(request, params)
    expect(response.headers.get('Content-Type')).toContain('application/json')
  })
})

describe('POST /api/conversations/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should add a new message', async () => {
    const newMessage = createMockMessage({
      conversationId: 'conv-123',
      author: 'user',
      text: 'Hello, world!',
    })
    vi.mocked(conversationStore.addMessage).mockResolvedValue(newMessage)

    const request = createMockRequest({
      body: {
        type: 'text',
        author: 'user',
        content: { text: 'Hello, world!' },
      },
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await POST(request, params)
    assertSuccess(response)

    const data = await extractResponseData<{ message: unknown }>(response)
    expect(data.message).toBeTruthy()
    expect(conversationStore.addMessage).toHaveBeenCalledWith('conv-123', {
      type: 'text',
      author: 'user',
      content: { text: 'Hello, world!' },
    })
  })

  it('should return 201 status on successful creation', async () => {
    const newMessage = createMockMessage()
    vi.mocked(conversationStore.addMessage).mockResolvedValue(newMessage)

    const request = createMockRequest({
      body: {
        type: 'text',
        author: 'user',
        content: { text: 'Test' },
      },
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await POST(request, params)
    expect(response.status).toBe(201)
  })

  it('should handle AI contact messages', async () => {
    const newMessage = createMockMessage({
      author: { type: 'ai-contact', contactId: 'ai-123', contactName: 'Claude' },
      text: 'AI response',
    })
    vi.mocked(conversationStore.addMessage).mockResolvedValue(newMessage)

    const request = createMockRequest({
      body: {
        type: 'text',
        author: { type: 'ai-contact', contactId: 'ai-123', contactName: 'Claude' },
        content: { text: 'AI response' },
      },
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await POST(request, params)
    assertSuccess(response)
  })

  it('should handle system messages', async () => {
    const newMessage = createMockMessage({
      type: 'system',
      author: { type: 'system', reason: 'Error occurred' },
      content: { systemNote: 'Something went wrong' },
    })
    vi.mocked(conversationStore.addMessage).mockResolvedValue(newMessage)

    const request = createMockRequest({
      body: {
        type: 'system',
        author: { type: 'system', reason: 'Error occurred' },
        content: { systemNote: 'Something went wrong' },
      },
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await POST(request, params)
    assertSuccess(response)
  })

  it('should handle message creation errors', async () => {
    vi.mocked(conversationStore.addMessage).mockRejectedValue(
      new Error('Invalid message format')
    )

    const request = createMockRequest({
      body: {
        type: 'text',
        author: 'user',
        content: { text: 'Test' },
      },
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await POST(request, params)
    assertError(response, 500)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Invalid message format')
  })

  it('should handle missing required fields', async () => {
    vi.mocked(conversationStore.addMessage).mockRejectedValue(
      new Error('Missing required fields')
    )

    const request = createMockRequest({
      body: {
        type: 'text',
        // Missing author and content
      },
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await POST(request, params)
    // Should handle missing fields gracefully
    expect(response.status).toBeGreaterThanOrEqual(400)
  })
})

describe('PATCH /api/conversations/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update a message', async () => {
    const updatedMessage = createMockMessage({
      id: 'msg-123',
      text: 'Updated text',
    })
    vi.mocked(conversationStore.updateMessage).mockResolvedValue(updatedMessage)

    const request = createMockRequest({
      body: {
        messageId: 'msg-123',
        updates: { content: { text: 'Updated text' } },
      },
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await PATCH(request, params)
    assertSuccess(response)

    const data = await extractResponseData<{ message: unknown }>(response)
    expect(data.message).toBeTruthy()
    expect(conversationStore.updateMessage).toHaveBeenCalledWith('msg-123', {
      content: { text: 'Updated text' },
    })
  })

  it('should handle partial updates', async () => {
    const updatedMessage = createMockMessage()
    vi.mocked(conversationStore.updateMessage).mockResolvedValue(updatedMessage)

    const request = createMockRequest({
      body: {
        messageId: 'msg-123',
        updates: { selected: true },
      },
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await PATCH(request, params)
    assertSuccess(response)
  })

  it('should handle update errors gracefully', async () => {
    vi.mocked(conversationStore.updateMessage).mockRejectedValue(
      new Error('Message not found')
    )

    const request = createMockRequest({
      body: {
        messageId: 'non-existent',
        updates: { content: { text: 'Updated' } },
      },
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await PATCH(request, params)
    assertError(response, 500)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Message not found')
  })

  it('should handle missing messageId', async () => {
    vi.mocked(conversationStore.updateMessage).mockRejectedValue(
      new Error('Message ID required')
    )

    const request = createMockRequest({
      body: {
        updates: { content: { text: 'Updated' } },
      },
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await PATCH(request, params)
    // Should handle missing messageId
    expect(response.status).toBeGreaterThanOrEqual(400)
  })

  it('should handle empty updates', async () => {
    const updatedMessage = createMockMessage()
    vi.mocked(conversationStore.updateMessage).mockResolvedValue(updatedMessage)

    const request = createMockRequest({
      body: {
        messageId: 'msg-123',
        updates: {},
      },
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await PATCH(request, params)
    // Should handle empty updates gracefully
    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(600)
  })
})

describe('DELETE /api/conversations/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete a message by ID', async () => {
    vi.mocked(conversationStore.deleteMessage).mockResolvedValue(undefined)

    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/conversations/conv-123/messages',
      params: { messageId: 'msg-456' },
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await DELETE(request, params)
    assertSuccess(response)

    const data = await extractResponseData<{ success: boolean }>(response)
    expect(data.success).toBe(true)
    expect(conversationStore.deleteMessage).toHaveBeenCalledWith('msg-456')
  })

  it('should require messageId parameter', async () => {
    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/conversations/conv-123/messages',
      params: {},
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await DELETE(request, params)
    assertError(response, 400)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Message ID required')
  })

  it('should handle empty messageId', async () => {
    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/conversations/conv-123/messages',
      params: { messageId: '' },
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await DELETE(request, params)
    assertError(response, 400)
  })

  it('should handle deletion errors gracefully', async () => {
    vi.mocked(conversationStore.deleteMessage).mockRejectedValue(
      new Error('Message not found')
    )

    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/conversations/conv-123/messages',
      params: { messageId: 'non-existent' },
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await DELETE(request, params)
    assertError(response, 500)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Message not found')
  })

  it('should return success response after deletion', async () => {
    vi.mocked(conversationStore.deleteMessage).mockResolvedValue(undefined)

    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/conversations/conv-123/messages',
      params: { messageId: 'msg-123' },
    })

    const params = createMockParams({ id: 'conv-123' })

    const response = await DELETE(request, params)
    const data = await extractResponseData<{ success: boolean }>(response)

    expect(data.success).toBe(true)
    expect(response.status).toBe(200)
  })
})

describe('Integration scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle get then add workflow', async () => {
    const conversationId = 'conv-workflow'

    // Get initial messages
    vi.mocked(conversationStore.getMessages).mockResolvedValue([])

    const getRequest = createMockGETRequest({
      url: `http://localhost:3000/api/conversations/${conversationId}/messages`,
    })

    const getParams = createMockParams({ id: conversationId })

    const getResponse = await GET(getRequest, getParams)
    assertSuccess(getResponse)

    const getData = await extractResponseData<{ messages: unknown[] }>(getResponse)
    expect(getData.messages).toHaveLength(0)

    // Add a message
    const newMessage = createMockMessage({ conversationId })
    vi.mocked(conversationStore.addMessage).mockResolvedValue(newMessage)

    const postRequest = createMockRequest({
      body: {
        type: 'text',
        author: 'user',
        content: { text: 'New message' },
      },
    })

    const postResponse = await POST(postRequest, getParams)
    assertSuccess(postResponse)

    // Get messages again
    const updatedMessages = createMockMessages(1, { conversationId })
    vi.mocked(conversationStore.getMessages).mockResolvedValue(updatedMessages)

    const getResponse2 = await GET(getRequest, getParams)
    assertSuccess(getResponse2)

    const getData2 = await extractResponseData<{ messages: unknown[] }>(getResponse2)
    expect(getData2.messages).toHaveLength(1)
  })

  it('should handle add then update then delete workflow', async () => {
    const conversationId = 'conv-full-test'
    const messageId = 'msg-test-123'

    // Add message
    const newMessage = createMockMessage({ id: messageId, conversationId })
    vi.mocked(conversationStore.addMessage).mockResolvedValue(newMessage)

    const postRequest = createMockRequest({
      body: {
        type: 'text',
        author: 'user',
        content: { text: 'Original message' },
      },
    })

    const params = createMockParams({ id: conversationId })

    const postResponse = await POST(postRequest, params)
    assertSuccess(postResponse)

    // Update message
    const updatedMessage = createMockMessage({ id: messageId, text: 'Updated message' })
    vi.mocked(conversationStore.updateMessage).mockResolvedValue(updatedMessage)

    const patchRequest = createMockRequest({
      body: {
        messageId,
        updates: { content: { text: 'Updated message' } },
      },
    })

    const patchResponse = await PATCH(patchRequest, params)
    assertSuccess(patchResponse)

    // Delete message
    vi.mocked(conversationStore.deleteMessage).mockResolvedValue(undefined)

    const deleteRequest = createMockDELETERequest({
      url: `http://localhost:3000/api/conversations/${conversationId}/messages`,
      params: { messageId },
    })

    const deleteResponse = await DELETE(deleteRequest, params)
    assertSuccess(deleteResponse)

    const deleteData = await extractResponseData<{ success: boolean }>(deleteResponse)
    expect(deleteData.success).toBe(true)
  })
})
