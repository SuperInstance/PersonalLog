/**
 * Agent Communication System Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import {
  agentEventBus,
  AgentEventBus,
  MessageType,
  type AgentMessage,
  sendMessage,
  broadcastMessage,
  validateMessage,
  createAgentAddress,
  type MessageFilter
} from '../index'

describe('Agent Communication System', () => {
  beforeEach(() => {
    // Reset event bus before each test
    agentEventBus.reset()
  })

  afterEach(() => {
    // Clean up after each test
    agentEventBus.reset()
  })

  describe('Event Bus', () => {
    it('should subscribe and unsubscribe agents', () => {
      let receivedMessage: AgentMessage | null = null
      const handler = (message: AgentMessage) => {
        receivedMessage = message
      }

      // Subscribe
      const unsubscribe = agentEventBus.subscribe('test-agent', handler)
      expect(agentEventBus.isSubscribed('test-agent')).toBe(true)

      // Send message
      agentEventBus.publish({
        id: crypto.randomUUID(),
        from: { agentId: 'sender', type: 'agent' },
        to: { agentId: 'test-agent', type: 'agent' },
        type: MessageType.AGENT_STATUS,
        payload: { status: 'active', capabilities: [], load: 0 },
        timestamp: Date.now(),
        priority: 'normal',
        status: 'pending'
      })

      expect(receivedMessage).not.toBeNull()
      expect(receivedMessage?.type).toBe(MessageType.AGENT_STATUS)

      // Unsubscribe
      unsubscribe()
      expect(agentEventBus.isSubscribed('test-agent')).toBe(false)
    })

    it('should broadcast messages to all subscribers except sender', () => {
      const received: string[] = []

      agentEventBus.subscribe('agent1', () => received.push('agent1'))
      agentEventBus.subscribe('agent2', () => received.push('agent2'))
      agentEventBus.subscribe('agent3', () => received.push('agent3'))

      // Broadcast from agent1
      broadcastMessage(
        'agent1',
        MessageType.AGENT_STATUS,
        { status: 'active', capabilities: [], load: 0 },
        'normal'
      )

      // Should receive only agent2 and agent3
      expect(received).toEqual(['agent2', 'agent3'])
    })

    it('should maintain message history', () => {
      // Send multiple messages
      for (let i = 0; i < 5; i++) {
        broadcastMessage(
          'test',
          MessageType.AGENT_STATUS,
          { status: 'active', capabilities: [], load: 0 },
          'normal'
        )
      }

      const history = agentEventBus.getHistory()
      expect(history.length).toBe(5)
    })

    it('should filter message history', () => {
      // Send different types of messages
      sendMessage('agent1', 'agent2', MessageType.AGENT_STATUS, { status: 'active', capabilities: [], load: 0 }, 'normal')
      sendMessage('agent1', 'agent2', MessageType.CONTEXT_CRITICAL, { percentage: 85, tokensUsed: 100000, tokensTotal: 128000, schema: {} }, 'normal')

      // Filter by type
      const statusMessages = agentEventBus.getHistory({ type: MessageType.AGENT_STATUS })
      expect(statusMessages.length).toBe(1)
      expect(statusMessages[0].type).toBe(MessageType.AGENT_STATUS)

      // Filter by from agent
      const fromAgent1 = agentEventBus.getHistory({ from: 'agent1' })
      expect(fromAgent1.length).toBe(2)
    })

    it('should track statistics', () => {
      agentEventBus.reset()

      // Send messages
      broadcastMessage('test', MessageType.AGENT_STATUS, { status: 'active', capabilities: [], load: 0 }, 'normal')
      broadcastMessage('test', MessageType.HEARTBEAT, { timestamp: Date.now(), uptime: 1000 }, 'low')

      const stats = agentEventBus.getStats()
      expect(stats.totalSent).toBe(2)
      expect(stats.byType[MessageType.AGENT_STATUS]).toBe(1)
      expect(stats.byType[MessageType.HEARTBEAT]).toBe(1)
    })
  })

  describe('Message Protocol', () => {
    it('should validate message structure', () => {
      const validMessage: AgentMessage = {
        id: crypto.randomUUID(),
        from: { agentId: 'sender', type: 'agent' },
        to: { agentId: 'receiver', type: 'agent' },
        type: MessageType.AGENT_STATUS,
        payload: { status: 'active', capabilities: [], load: 0 },
        timestamp: Date.now(),
        priority: 'normal',
        status: 'pending'
      }

      expect(validateMessage(validMessage)).toBe(true)

      // Invalid message (missing required field)
      const invalidMessage = { ...validMessage, id: '' }
      expect(validateMessage(invalidMessage)).toBe(false)
    })

    it('should create agent addresses', () => {
      const address = createAgentAddress('test-agent', 'agent')
      expect(address.agentId).toBe('test-agent')
      expect(address.type).toBe('agent')
    })

    it('should send messages with correct structure', () => {
      let received: AgentMessage | null = null
      agentEventBus.subscribe('receiver', (msg) => { received = msg })

      const message = sendMessage(
        'sender',
        'receiver',
        MessageType.AGENT_STATUS,
        { status: 'active', capabilities: ['test'], load: 0.5 },
        'high'
      )

      expect(message.from.agentId).toBe('sender')
      expect(message.to.agentId).toBe('receiver')
      expect(message.type).toBe(MessageType.AGENT_STATUS)
      expect(message.priority).toBe('high')
      expect(received).not.toBeNull()
    })

    it('should broadcast messages to all agents', () => {
      const received: string[] = []

      agentEventBus.subscribe('agent1', () => received.push('agent1'))
      agentEventBus.subscribe('agent2', () => received.push('agent2'))

      broadcastMessage(
        'sender',
        MessageType.HEARTBEAT,
        { timestamp: Date.now(), uptime: 1000 },
        'low'
      )

      expect(received).toContain('agent1')
      expect(received).toContain('agent2')
    })
  })

  describe('Message Types', () => {
    it('should handle user state change messages', () => {
      let received: AgentMessage | null = null
      agentEventBus.subscribe('receiver', (msg) => { received = msg })

      sendMessage(
        'jepa-v1',
        'receiver',
        MessageType.USER_EMOTION_CHANGE,
        {
          emotion: 'frustrated',
          valence: 0.2,
          arousal: 0.8,
          confidence: 0.9
        },
        'normal'
      )

      expect(received?.type).toBe(MessageType.USER_EMOTION_CHANGE)
      expect(received?.payload).toMatchObject({
        emotion: 'frustrated',
        valence: 0.2,
        arousal: 0.8,
        confidence: 0.9
      })
    })

    it('should handle context critical messages', () => {
      let received: AgentMessage | null = null
      agentEventBus.subscribe('receiver', (msg) => { received = msg })

      sendMessage(
        'spreader-v1',
        'receiver',
        MessageType.CONTEXT_CRITICAL,
        {
          percentage: 85,
          tokensUsed: 108800,
          tokensTotal: 128000,
          schema: {}
        },
        'high'
      )

      expect(received?.type).toBe(MessageType.CONTEXT_CRITICAL)
      expect(received?.priority).toBe('high')
    })

    it('should handle collaboration request messages', () => {
      let received: AgentMessage | null = null
      agentEventBus.subscribe('receiver', (msg) => { received = msg })

      sendMessage(
        'agent1',
        'agent2',
        MessageType.COLLAB_REQUEST,
        {
          action: 'analyze_emotion',
          params: { transcript: 'Test message' }
        },
        'normal'
      )

      expect(received?.type).toBe(MessageType.COLLAB_REQUEST)
      expect(received?.payload.action).toBe('analyze_emotion')
    })
  })

  describe('Message Routing', () => {
    it('should route messages to specific agents', () => {
      const agent1Received: AgentMessage[] = []
      const agent2Received: AgentMessage[] = []

      agentEventBus.subscribe('agent1', (msg) => agent1Received.push(msg))
      agentEventBus.subscribe('agent2', (msg) => agent2Received.push(msg))

      // Send to agent1 only
      sendMessage(
        'sender',
        'agent1',
        MessageType.AGENT_STATUS,
        { status: 'active', capabilities: [], load: 0 },
        'normal'
      )

      expect(agent1Received.length).toBe(1)
      expect(agent2Received.length).toBe(0)
    })

    it('should handle multiple subscribers for same agent', () => {
      let count1 = 0
      let count2 = 0

      agentEventBus.subscribe('agent1', () => count1++)
      agentEventBus.subscribe('agent1', () => count2++)

      sendMessage(
        'sender',
        'agent1',
        MessageType.AGENT_STATUS,
        { status: 'active', capabilities: [], load: 0 },
        'normal'
      )

      expect(count1).toBe(1)
      expect(count2).toBe(1)
    })
  })

  describe('Priority Levels', () => {
    it('should handle high priority messages', () => {
      let received: AgentMessage | null = null
      agentEventBus.subscribe('receiver', (msg) => { received = msg })

      sendMessage(
        'sender',
        'receiver',
        MessageType.USER_FRUSTRATION_DETECTED,
        {
          valence: 0.2,
          arousal: 0.8,
          confidence: 0.9,
          recentMessages: []
        },
        'high'
      )

      expect(received?.priority).toBe('high')
    })

    it('should filter by minimum priority', () => {
      // Send messages with different priorities
      sendMessage('agent1', 'agent2', MessageType.AGENT_STATUS, { status: 'active', capabilities: [], load: 0 }, 'low')
      sendMessage('agent1', 'agent2', MessageType.CONTEXT_CRITICAL, { percentage: 85, tokensUsed: 100000, tokensTotal: 128000, schema: {} }, 'high')

      // Filter by high priority
      const highPriority = agentEventBus.getHistory({ minPriority: 'high' })
      expect(highPriority.length).toBe(1)
      expect(highPriority[0].priority).toBe('high')
    })
  })

  describe('Error Handling', () => {
    it('should handle handler errors gracefully', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation()

      agentEventBus.subscribe('agent', () => {
        throw new Error('Handler error')
      })

      // Should not throw
      expect(() => {
        agentEventBus.publish({
          id: crypto.randomUUID(),
          from: { agentId: 'sender', type: 'agent' },
          to: { agentId: 'agent', type: 'agent' },
          type: MessageType.AGENT_STATUS,
          payload: { status: 'active', capabilities: [], load: 0 },
          timestamp: Date.now(),
          priority: 'normal',
          status: 'pending'
        })
      }).not.toThrow()

      expect(consoleError).toHaveBeenCalled()
      consoleError.mockRestore()
    })

    it('should mark undelivered messages as failed', () => {
      // Send to non-existent agent
      agentEventBus.publish({
        id: crypto.randomUUID(),
        from: { agentId: 'sender', type: 'agent' },
        to: { agentId: 'non-existent', type: 'agent' },
        type: MessageType.AGENT_STATUS,
        payload: { status: 'active', capabilities: [], load: 0 },
        timestamp: Date.now(),
        priority: 'normal',
        status: 'pending'
      })

      const history = agentEventBus.getHistory()
      const lastMessage = history[history.length - 1]
      expect(lastMessage.status).toBe('failed')
    })
  })

  describe('Cleanup', () => {
    it('should clear message history', () => {
      // Send messages
      broadcastMessage('test', MessageType.AGENT_STATUS, { status: 'active', capabilities: [], load: 0 }, 'normal')
      broadcastMessage('test', MessageType.HEARTBEAT, { timestamp: Date.now(), uptime: 1000 }, 'low')

      expect(agentEventBus.getHistory().length).toBe(2)

      agentEventBus.clearHistory()
      expect(agentEventBus.getHistory().length).toBe(0)
    })

    it('should reset event bus completely', () => {
      agentEventBus.subscribe('agent1', () => {})
      agentEventBus.subscribe('agent2', () => {})

      broadcastMessage('test', MessageType.AGENT_STATUS, { status: 'active', capabilities: [], load: 0 }, 'normal')

      expect(agentEventBus.getSubscribers().length).toBe(2)
      expect(agentEventBus.getHistory().length).toBe(1)

      agentEventBus.reset()

      expect(agentEventBus.getSubscribers().length).toBe(0)
      expect(agentEventBus.getHistory().length).toBe(0)
    })
  })
})
