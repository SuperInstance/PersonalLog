/**
 * Integration test for complete message sending flow
 * @module lib/__tests__/integration/message-flow.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createConversation,
  addMessage,
  getConversation,
  getMessages,
  updateConversation,
} from '@/lib/storage/conversation-store'
import { LocalAIProvider, ProviderFactory } from '@/lib/ai/provider'
import { enhancePrompt, processResponse } from '@/lib/wizard/filtration-service'
import type { FiltrationConfig } from '@/lib/wizard/models'

describe('Message Sending Flow Integration', () => {
  let conversationId: string
  let provider: LocalAIProvider

  beforeEach(async () => {
    // Create a test conversation
    const conv = await createConversation('Test Chat', 'personal')
    conversationId = conv.id

    // Setup provider
    provider = ProviderFactory.createLocal({
      model: 'llama2',
      baseUrl: 'http://localhost:11434',
    })
  })

  afterEach(async () => {
    // Cleanup would go here in real implementation
  })

  it('should send message and receive AI response', async () => {
    // Mock fetch for this test
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'This is a test response',
        done: true,
      }),
    }) as any

    // Add user message
    const userMessage = await addMessage(
      conversationId,
      'text',
      'user',
      { text: 'Hello, how are you?' }
    )

    expect(userMessage.content.text).toBe('Hello, how are you?')
    expect(userMessage.author).toBe('user')

    // Get AI response
    const aiResponse = await provider.chat({
      conversationId,
      agentId: 'test-agent',
      messages: [userMessage],
      prompt: 'Hello, how are you?',
      stream: false,
    })

    expect(aiResponse.content).toBe('This is a test response')

    // Add AI message to conversation
    const aiMessage = await addMessage(
      conversationId,
      'text',
      { type: 'ai-contact', contactId: 'test-agent', contactName: 'Test AI' },
      { text: aiResponse.content }
    )

    expect(aiMessage.content.text).toBe('This is a test response')
    expect(aiMessage.author).toEqual({
      type: 'ai-contact',
      contactId: 'test-agent',
      contactName: 'Test AI',
    })

    // Verify conversation state
    const conversation = await getConversation(conversationId)
    expect(conversation).toBeDefined()
    expect(conversation?.metadata.messageCount).toBeGreaterThan(0)

    // Verify messages
    const messages = await getMessages(conversationId)
    expect(messages).toHaveLength(2)
    expect(messages[0].author).toBe('user')
    expect(messages[1].author).toEqual({
      type: 'ai-contact',
      contactId: 'test-agent',
      contactName: 'Test AI',
    })
  })

  it('should integrate with filtration system', async () => {
    const filtrationConfig: FiltrationConfig = {
      promptEnhancement: {
        addClarity: true,
        addStructure: true,
        addContext: true,
      },
      responsePostProcessing: {
        removeFiller: true,
        improveFormatting: false,
        extractKeyPoints: false,
      },
    }

    // Enhance user prompt
    const { enhanced } = enhancePrompt(
      'What is the capital of France?',
      filtrationConfig,
      {
        userMessage: 'What is the capital of France?',
        conversationHistory: [],
        contactNickname: 'Test',
      }
    )

    // Just verify it returns something
    expect(enhanced).toBeTruthy()

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'The capital of France is Paris. It is a beautiful city.',
        done: true,
      }),
    }) as any

    // Get AI response
    const response = await provider.chat({
      conversationId,
      agentId: 'test-agent',
      messages: [],
      prompt: enhanced,
      stream: false,
    })

    // Process response
    const { processed } = processResponse(response.content, filtrationConfig)

    expect(processed).toBeDefined()

    // Add messages
    await addMessage(conversationId, 'text', 'user', {
      text: 'What is the capital of France?',
    })
    await addMessage(
      conversationId,
      'text',
      { type: 'ai-contact', contactId: 'test-agent', contactName: 'Test AI' },
      { text: processed }
    )

    // Verify
    const messages = await getMessages(conversationId)
    expect(messages).toHaveLength(2)
  })

  it('should handle message threading with replyTo', async () => {
    // Add original message
    const original = await addMessage(
      conversationId,
      'text',
      'user',
      { text: 'Tell me a joke' }
    )

    // Add reply
    const reply = await addMessage(
      conversationId,
      'text',
      { type: 'ai-contact', contactId: 'test-agent', contactName: 'Test AI' },
      { text: 'Why did the chicken cross the road?' },
      original.id
    )

    expect(reply.replyTo).toBe(original.id)

    // Verify threading
    const messages = await getMessages(conversationId)
    expect(messages[1].replyTo).toBe(messages[0].id)
  })

  it('should update conversation metadata on new messages', async () => {
    const initialConv = await getConversation(conversationId)
    const initialCount = initialConv?.metadata.messageCount || 0

    await addMessage(conversationId, 'text', 'user', { text: 'Test' })

    const updatedConv = await getConversation(conversationId)
    expect(updatedConv?.metadata.messageCount).toBe(initialCount + 1)
  })

  it('should handle conversation pinning', async () => {
    // Check initial state
    const conv1 = await getConversation(conversationId)
    expect(conv1?.metadata.pinned).toBe(false)

    // Pin conversation
    await updateConversation(conversationId, {
      metadata: { ...conv1!.metadata, pinned: true },
    })

    // Verify pinned
    const conv2 = await getConversation(conversationId)
    expect(conv2?.metadata.pinned).toBe(true)
  })
})
