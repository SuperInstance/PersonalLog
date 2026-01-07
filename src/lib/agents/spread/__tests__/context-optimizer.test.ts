/**
 * Context Optimizer Tests
 *
 * Comprehensive tests for the context optimization engine.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  ContextOptimizerEngine,
  getContextOptimizer,
  resetContextOptimizer,
  type ContextOptimizationResult,
  type TaskContextRequirements,
  type ContextOptimizerConfig
} from '../context-optimizer'
import type { Message } from '@/types/conversation'

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockMessage(
  text: string,
  author: 'user' | { type: 'ai-contact'; contactId: string; contactName: string } | { type: 'system'; reason: string } = 'user',
  options?: Partial<Message>
): Message {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    conversationId: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    type: 'text',
    author,
    content: { text },
    timestamp: new Date().toISOString(),
    metadata: {},
    selected: false,
    ...options
  }
}

function createMockConversation(messageCount: number): Message[] {
  const messages: Message[] = []

  for (let i = 0; i < messageCount; i++) {
    const isUser = i % 2 === 0
    messages.push(createMockMessage(
      `Message ${i}: ${isUser ? 'User question about feature implementation' : 'AI response with technical details and code examples'}`,
      isUser ? 'user' : { type: 'ai-contact', contactId: 'ai1', contactName: 'Assistant' }
    ))
  }

  return messages
}

function estimateTotalTokens(messages: Message[]): number {
  return messages.reduce((sum, msg) => {
    const text = msg.content.text || ''
    return sum + Math.ceil(text.length / 4)
  }, 0)
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('ContextOptimizerEngine', () => {
  let optimizer: ContextOptimizerEngine

  beforeEach(() => {
    resetContextOptimizer()
    optimizer = new ContextOptimizerEngine({
      maxTokens: 10000,
      warningThreshold: 0.6,
      criticalThreshold: 0.85,
      enableMetrics: true,
      logLevel: 'none'
    })
  })

  describe('Basic Optimization', () => {
    it('should not optimize when under warning threshold', async () => {
      const messages = createMockConversation(5)
      const tokens = estimateTotalTokens(messages)

      const result = await optimizer.optimize(messages)

      expect(result.strategy).toBe('none')
      expect(result.optimizedMessages.length).toBe(messages.length)
      expect(result.messagesRemoved).toBe(0)
      expect(result.tokensSaved).toBe(0)
    })

    it('should apply threshold strategy when above warning threshold', async () => {
      const config: Partial<ContextOptimizerConfig> = {
        maxTokens: 100,
        warningThreshold: 0.5,
        criticalThreshold: 0.8
      }
      optimizer.updateConfig(config)

      const messages = createMockConversation(20)
      const result = await optimizer.optimize(messages)

      expect(result.strategy).toBe('threshold')
      expect(result.optimizedMessages.length).toBeLessThan(messages.length)
      expect(result.messagesRemoved).toBeGreaterThan(0)
    })

    it('should apply budget strategy when above critical threshold', async () => {
      const config: Partial<ContextOptimizerConfig> = {
        maxTokens: 50,
        warningThreshold: 0.5,
        criticalThreshold: 0.7
      }
      optimizer.updateConfig(config)

      const messages = createMockConversation(30)
      const result = await optimizer.optimize(messages)

      expect(['budget', 'preserve_only']).toContain(result.strategy)
      expect(result.optimizedTokens).toBeLessThanOrEqual(config.maxTokens! * 1.2)
    })
  })

  describe('Message Preservation', () => {
    it('should preserve messages with [PRESERVE] marker', async () => {
      const config: Partial<ContextOptimizerConfig> = {
        maxTokens: 100,
        warningThreshold: 0.5,
        criticalThreshold: 0.8
      }
      optimizer.updateConfig(config)

      const messages = [
        createMockMessage('[PRESERVE] This must be kept'),
        createMockMessage('Regular message 1'),
        createMockMessage('[PRESERVE] This also must be kept'),
        createMockMessage('Regular message 2'),
        createMockMessage('Regular message 3')
      ]

      const result = await optimizer.optimize(messages)

      expect(result.preservedCount).toBe(2)
      expect(result.optimizedMessages).toContain(messages[0])
      expect(result.optimizedMessages).toContain(messages[2])
    })

    it('should preserve messages with [IMPORTANT] marker', async () => {
      const config: Partial<ContextOptimizerConfig> = {
        maxTokens: 100,
        warningThreshold: 0.5
      }
      optimizer.updateConfig(config)

      const messages = [
        createMockMessage('[IMPORTANT] Critical information'),
        createMockMessage('Regular message')
      ]

      const result = await optimizer.optimize(messages)

      expect(result.preservedCount).toBeGreaterThan(0)
      expect(result.optimizedMessages).toContain(messages[0])
    })

    it('should preserve all marked messages in preserve_only strategy', async () => {
      const config: Partial<ContextOptimizerConfig> = {
        maxTokens: 10,
        warningThreshold: 0.1,
        criticalThreshold: 0.2
      }
      optimizer.updateConfig(config)

      const messages = [
        createMockMessage('[PRESERVE] Keep this'),
        createMockMessage('[KEY] Keep this too'),
        createMockMessage('Regular message 1'),
        createMockMessage('Regular message 2')
      ]

      const result = await optimizer.optimize(messages)

      expect(result.strategy).toBe('preserve_only')
      expect(result.optimizedMessages.length).toBe(2)
      expect(result.optimizedMessages).toContain(messages[0])
      expect(result.optimizedMessages).toContain(messages[1])
    })
  })

  describe('Scoring System', () => {
    it('should score user messages higher than system messages', async () => {
      const messages = [
        createMockMessage('User message', 'user'),
        createMockMessage('System notification', { type: 'system', reason: 'test' }),
        createMockMessage('Another user message', 'user')
      ]

      const result = await optimizer.optimize(messages)

      const userScores = result.scores
        .filter(s => {
          const msg = messages.find(m => m.id === s.messageId)
          return msg?.author === 'user'
        })
        .map(s => s.total)

      const systemScores = result.scores
        .filter(s => {
          const msg = messages.find(m => m.id === s.messageId)
          return typeof msg?.author === 'object' && msg.author.type === 'system'
        })
        .map(s => s.total)

      const avgUserScore = userScores.reduce((a, b) => a + b, 0) / userScores.length
      const avgSystemScore = systemScores.reduce((a, b) => a + b, 0) / systemScores.length

      expect(avgUserScore).toBeGreaterThan(avgSystemScore)
    })

    it('should score recent messages higher', async () => {
      const messages = createMockConversation(50)

      const result = await optimizer.optimize(messages)

      // Last 10 messages should have higher average recency score
      const recentScores = result.scores.slice(-10).map(s => s.recency)
      const oldScores = result.scores.slice(0, 10).map(s => s.recency)

      const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length
      const avgOld = oldScores.reduce((a, b) => a + b, 0) / oldScores.length

      expect(avgRecent).toBeGreaterThan(avgOld)
    })

    it('should assign ranks to scores', async () => {
      const messages = createMockConversation(20)

      const result = await optimizer.optimize(messages)

      result.scores.forEach(score => {
        expect(score.rank).toBeDefined()
        expect(score.rank).toBeGreaterThan(0)
        expect(score.rank).toBeLessThanOrEqual(messages.length)
      })

      // Check that ranks are unique (top scores only)
      const rankedScores = result.scores.filter(s => s.rank !== undefined)
      const topRanks = rankedScores.map(s => s.rank!).slice(0, 10)
      const uniqueRanks = new Set(topRanks)

      expect(uniqueRanks.size).toBe(topRanks.length)
    })
  })

  describe('Task-Specific Optimization', () => {
    it('should optimize for code tasks', async () => {
      const messages = [
        createMockMessage('How do I implement a function?'),
        createMockMessage('Here is the code: function example() { return true; }'),
        createMockMessage('The weather is nice today'), // Irrelevant
        createMockMessage('Another code example with class definitions'),
        createMockMessage('Random conversation about food')
      ]

      const task: TaskContextRequirements = {
        task: 'Implement code feature',
        taskType: 'code',
        keywords: ['function', 'code', 'implement', 'class'],
        minTokens: 100,
        maxTokens: 1000,
        priority: 'high',
        requiredMessageIds: []
      }

      const result = await optimizer.optimizeForTask(messages, task)

      expect(result.strategy).toBe('task_specific')
      expect(result.optimizedMessages.length).toBeLessThanOrEqual(messages.length)

      // Code-related messages should be kept
      const codeRelated = result.optimizedMessages.filter(msg =>
        msg.content.text?.includes('function') ||
        msg.content.text?.includes('code') ||
        msg.content.text?.includes('class')
      )

      expect(codeRelated.length).toBeGreaterThan(0)
    })

    it('should include required messages in task optimization', async () => {
      const messages = [
        createMockMessage('Important requirement 1'),
        createMockMessage('Some other message'),
        createMockMessage('Important requirement 2'),
        createMockMessage('Another message')
      ]

      const task: TaskContextRequirements = {
        task: 'Analyze requirements',
        taskType: 'analysis',
        keywords: ['requirement', 'analyze'],
        minTokens: 50,
        maxTokens: 100,
        priority: 'high',
        requiredMessageIds: [messages[0].id, messages[2].id]
      }

      const result = await optimizer.optimizeForTask(messages, task)

      expect(result.optimizedMessages).toContain(messages[0])
      expect(result.optimizedMessages).toContain(messages[2])
    })

    it('should respect max context size in task optimization', async () => {
      const messages = createMockConversation(100)

      const task: TaskContextRequirements = {
        task: 'Summarize conversation',
        taskType: 'general',
        keywords: [],
        minTokens: 500,
        maxTokens: 1000,
        priority: 'medium',
        requiredMessageIds: []
      }

      const result = await optimizer.optimizeForTask(messages, task)

      // Estimate tokens (rough)
      const estimatedTokens = estimateTotalTokens(result.optimizedMessages)

      // Should be reasonably close to max (allow 20% variance)
      expect(estimatedTokens).toBeLessThanOrEqual(task.maxTokens * 1.2)
    })
  })

  describe('Metrics and Tracking', () => {
    it('should track optimization metrics', async () => {
      const config: Partial<ContextOptimizerConfig> = {
        maxTokens: 100,
        warningThreshold: 0.5,
        enableMetrics: true
      }
      optimizer.updateConfig(config)

      const messages = createMockConversation(50)

      await optimizer.optimize(messages)
      await optimizer.optimize(messages)
      await optimizer.optimize(messages)

      const metrics = optimizer.getMetrics()

      expect(metrics.totalOptimizations).toBe(3)
      expect(metrics.totalMessagesProcessed).toBe(150)
      expect(metrics.lastOptimization).not.toBeNull()
      expect(metrics.firstOptimization).not.toBeNull()
    })

    it('should track strategy usage', async () => {
      const config: Partial<ContextOptimizerConfig> = {
        maxTokens: 10000,
        warningThreshold: 0.6,
        enableMetrics: true
      }
      optimizer.updateConfig(config)

      // Small conversation - no optimization
      await optimizer.optimize(createMockConversation(5))

      // Large conversation - will optimize
      config.maxTokens = 100
      config.warningThreshold = 0.5
      await optimizer.optimize(createMockConversation(50))

      const metrics = optimizer.getMetrics()

      expect(metrics.strategyCounts.none).toBeGreaterThan(0)
      expect(Object.values(metrics.strategyCounts).some(count => count > 0)).toBe(true)
    })

    it('should calculate average savings correctly', async () => {
      const config: Partial<ContextOptimizerConfig> = {
        maxTokens: 100,
        warningThreshold: 0.5,
        enableMetrics: true
      }
      optimizer.updateConfig(config)

      const messages = createMockConversation(30)

      const result1 = await optimizer.optimize(messages)
      const result2 = await optimizer.optimize(messages)

      const metrics = optimizer.getMetrics()

      const expectedAvg = (result1.savingsPercentage + result2.savingsPercentage) / 2

      expect(metrics.avgSavingsPercentage).toBeCloseTo(expectedAvg, 1)
    })

    it('should reset metrics', async () => {
      const config: Partial<ContextOptimizerConfig> = {
        enableMetrics: true
      }
      optimizer.updateConfig(config)

      await optimizer.optimize(createMockConversation(10))

      expect(optimizer.getMetrics().totalOptimizations).toBeGreaterThan(0)

      optimizer.resetMetrics()

      expect(optimizer.getMetrics().totalOptimizations).toBe(0)
      expect(optimizer.getMetrics().totalTokensSaved).toBe(0)
    })
  })

  describe('Configuration', () => {
    it('should use custom configuration', async () => {
      const customConfig: Partial<ContextOptimizerConfig> = {
        maxTokens: 5000,
        warningThreshold: 0.7,
        minScoreThreshold: 0.5,
        enableMetrics: false
      }

      const customOptimizer = new ContextOptimizerEngine(customConfig)

      const config = customOptimizer.getConfig()

      expect(config.maxTokens).toBe(5000)
      expect(config.warningThreshold).toBe(0.7)
      expect(config.minScoreThreshold).toBe(0.5)
      expect(config.enableMetrics).toBe(false)
    })

    it('should update configuration dynamically', async () => {
      const config = optimizer.getConfig()

      expect(config.maxTokens).toBe(10000)

      optimizer.updateConfig({ maxTokens: 20000 })

      const updatedConfig = optimizer.getConfig()

      expect(updatedConfig.maxTokens).toBe(20000)
    })
  })

  describe('Performance', () => {
    it('should process large conversations quickly', async () => {
      const messages = createMockConversation(1000)

      const startTime = performance.now()
      const result = await optimizer.optimize(messages)
      const endTime = performance.now()

      const duration = endTime - startTime

      // Should complete in under 1 second for 1000 messages
      expect(duration).toBeLessThan(1000)
      expect(result.processingTime).toBeLessThan(1000)
    })

    it('should handle empty conversations', async () => {
      const result = await optimizer.optimize([])

      expect(result.optimizedMessages).toEqual([])
      expect(result.messagesRemoved).toBe(0)
      expect(result.strategy).toBe('none')
    })

    it('should handle single message conversations', async () => {
      const messages = [createMockMessage('Single message')]

      const result = await optimizer.optimize(messages)

      expect(result.optimizedMessages.length).toBe(1)
      expect(result.strategy).toBe('none')
    })
  })

  describe('Result Structure', () => {
    it('should return complete result structure', async () => {
      const messages = createMockConversation(10)

      const result = await optimizer.optimize(messages)

      expect(result).toMatchObject({
        originalMessages: expect.any(Array),
        optimizedMessages: expect.any(Array),
        originalTokens: expect.any(Number),
        optimizedTokens: expect.any(Number),
        tokensSaved: expect.any(Number),
        savingsPercentage: expect.any(Number),
        messagesRemoved: expect.any(Number),
        messagesKept: expect.any(Number),
        preservedCount: expect.any(Number),
        scores: expect.any(Array),
        strategy: expect.any(String),
        processingTime: expect.any(Number),
        summary: expect.any(String)
      })
    })

    it('should calculate savings correctly', async () => {
      const config: Partial<ContextOptimizerConfig> = {
        maxTokens: 100,
        warningThreshold: 0.5
      }
      optimizer.updateConfig(config)

      const messages = createMockConversation(20)

      const result = await optimizer.optimize(messages)

      expect(result.tokensSaved).toBe(result.originalTokens - result.optimizedTokens)

      const expectedPercentage = (result.tokensSaved / result.originalTokens) * 100
      expect(result.savingsPercentage).toBeCloseTo(expectedPercentage, 1)
    })
  })
})

describe('Singleton Instance', () => {
  it('should return the same instance', () => {
    const instance1 = getContextOptimizer()
    const instance2 = getContextOptimizer()

    expect(instance1).toBe(instance2)
  })

  it('should reset instance', () => {
    const instance1 = getContextOptimizer()
    resetContextOptimizer()
    const instance2 = getContextOptimizer()

    expect(instance1).not.toBe(instance2)
  })
})
