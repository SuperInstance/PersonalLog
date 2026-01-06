/**
 * Tests for Context Optimization System
 *
 * Tests importance scoring, redundancy detection, and compression strategies.
 */

import { describe, it, expect } from '@jest/globals'
import { Message } from '@/types/conversation'
import {
  ContextOptimizer,
  estimateMessageTokens,
  estimateTotalTokens,
  hasPreservableMarker,
  addPreservableMarker,
  PRESERVABLE_MARKERS
} from '../optimizer'
import {
  calculateImportance,
  calculateRecency,
  calculateInformationDensity,
  hasKeywords,
  containsCode,
  calculateAllImportance,
  rankByImportance,
  getTopImportant,
  calculateImportanceStatistics
} from '../importance-scoring'
import {
  calculateSimilarity,
  detectRedundancy,
  clusterSimilarMessages,
  applyLosslessCompression,
  applyLossyCompression,
  applyHybridCompression,
  measureCompressionQuality
} from '../compression-strategies'

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMessage(
  id: string,
  text: string,
  author: 'user' | { type: 'ai-contact'; contactId: string; contactName: string } = 'user',
  timestamp?: string
): Message {
  return {
    id,
    conversationId: 'test_conv',
    type: 'text',
    author,
    content: { text },
    timestamp: timestamp || new Date().toISOString(),
    metadata: {}
  }
}

// ============================================================================
// IMPORTANCE SCORING TESTS
// ============================================================================

describe('calculateImportance', () => {
  it('should score recent messages higher', () => {
    const messages = [
      createMessage('msg1', 'Old message'),
      createMessage('msg2', 'Recent message')
    ]

    const score1 = calculateImportance(messages[0], messages, 0)
    const score2 = calculateImportance(messages[1], messages, 1)

    expect(score2.score).toBeGreaterThan(score1.score)
    expect(score2.factors.recency).toBeGreaterThan(score1.factors.recency)
  })

  it('should score messages with questions higher', () => {
    const messages = [
      createMessage('msg1', 'This is a statement'),
      createMessage('msg2', 'How do I implement this feature?')
    ]

    const score1 = calculateImportance(messages[0], messages, 0)
    const score2 = calculateImportance(messages[1], messages, 1)

    expect(score2.factors.hasQuestions).toBe(true)
    expect(score1.factors.hasQuestions).toBe(false)
    expect(score2.score).toBeGreaterThan(score1.score)
  })

  it('should score messages with decisions higher', () => {
    const messages = [
      createMessage('msg1', 'Some random text'),
      createMessage('msg2', 'We decided to use React for the frontend')
    ]

    const score1 = calculateImportance(messages[0], messages, 0)
    const score2 = calculateImportance(messages[1], messages, 1)

    expect(score2.factors.hasDecisions).toBe(true)
    expect(score1.factors.hasDecisions).toBe(false)
    expect(score2.score).toBeGreaterThan(score1.score)
  })

  it('should score messages with code higher', () => {
    const messages = [
      createMessage('msg1', 'Just some text'),
      createMessage('msg2', 'Here is the code:\n```typescript\nconst x = 1\n```')
    ]

    const score1 = calculateImportance(messages[0], messages, 0)
    const score2 = calculateImportance(messages[1], messages, 1)

    expect(score2.factors.hasCode).toBe(true)
    expect(score1.factors.hasCode).toBe(false)
    expect(score2.score).toBeGreaterThan(score1.score)
  })

  it('should score user messages higher than AI messages', () => {
    const messages = [
      createMessage('msg1', 'AI response', { type: 'ai-contact', contactId: 'ai1', contactName: 'AI' }),
      createMessage('msg2', 'User question', 'user')
    ]

    const score1 = calculateImportance(messages[0], messages, 0)
    const score2 = calculateImportance(messages[1], messages, 1)

    expect(score2.factors.isUserMessage).toBe(true)
    expect(score1.factors.isUserMessage).toBe(false)
  })

  it('should calculate information density correctly', () => {
    const msg1 = createMessage('msg1', 'test test test test') // Low density
    const msg2 = createMessage('msg2', 'unique words here') // High density

    const density1 = calculateInformationDensity(msg1)
    const density2 = calculateInformationDensity(msg2)

    expect(density2).toBeGreaterThan(density1)
  })

  it('should handle preservable markers', () => {
    const msg = createMessage('msg1', '[IMPORTANT] This is critical')

    const score = calculateImportance(msg, [msg], 0)

    expect(score.factors.hasPreservable).toBe(true)
    expect(score.score).toBeGreaterThan(0.5)
  })
})

describe('calculateRecency', () => {
  it('should give highest score to most recent message', () => {
    const score1 = calculateRecency(9, 10) // Oldest
    const score2 = calculateRecency(5, 10) // Middle
    const score3 = calculateRecency(0, 10) // Newest

    expect(score3).toBeGreaterThan(score2)
    expect(score2).toBeGreaterThan(score1)
  })

  it('should return 1 for single message', () => {
    const score = calculateRecency(0, 1)
    expect(score).toBe(1)
  })

  it('should use exponential decay', () => {
    const score1 = calculateRecency(0, 10)
    const score2 = calculateRecency(10, 20)

    expect(score1).toBeCloseTo(1, 1)
    expect(score2).toBeLessThan(0.5)
  })
})

describe('calculateAllImportance', () => {
  it('should score all messages in conversation', () => {
    const messages = [
      createMessage('msg1', 'First message'),
      createMessage('msg2', 'Second message'),
      createMessage('msg3', 'Third message')
    ]

    const scores = calculateAllImportance(messages)

    expect(scores).toHaveLength(3)
    expect(scores[0].messageId).toBe('msg1')
    expect(scores[1].messageId).toBe('msg2')
    expect(scores[2].messageId).toBe('msg3')
  })
})

describe('rankByImportance', () => {
  it('should rank messages by importance score', () => {
    const messages = [
      createMessage('msg1', 'Low importance'),
      createMessage('msg2', 'High importance? Decided! Code: ```'),
      createMessage('msg3', 'Medium importance')
    ]

    const scores = calculateAllImportance(messages)
    const ranked = rankByImportance(scores)

    expect(ranked[0].rank).toBe(1)
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score)
    expect(ranked[1].score).toBeGreaterThanOrEqual(ranked[2].score)
  })
})

describe('getTopImportant', () => {
  it('should return top N messages', () => {
    const messages = [
      createMessage('msg1', 'Message 1'),
      createMessage('msg2', 'Message 2'),
      createMessage('msg3', 'Message 3'),
      createMessage('msg4', 'Message 4'),
      createMessage('msg5', 'Message 5')
    ]

    const top = getTopImportant(messages, 3)

    expect(top).toHaveLength(3)
    expect(top[0].score.rank).toBe(1)
    expect(top[1].score.rank).toBe(2)
    expect(top[2].score.rank).toBe(3)
  })
})

// ============================================================================
// REDUNDANCY DETECTION TESTS
// ============================================================================

describe('calculateSimilarity', () => {
  it('should detect identical messages', () => {
    const msg1 = createMessage('msg1', 'This is a test message')
    const msg2 = createMessage('msg2', 'This is a test message')

    const similarity = calculateSimilarity(msg1, msg2)

    expect(similarity).toBeGreaterThan(0.95)
  })

  it('should detect similar messages', () => {
    const msg1 = createMessage('msg1', 'How do I implement authentication')
    const msg2 = createMessage('msg2', 'How to implement authentication in the app')

    const similarity = calculateSimilarity(msg1, msg2)

    expect(similarity).toBeGreaterThan(0.5)
    expect(similarity).toBeLessThan(1.0)
  })

  it('should detect dissimilar messages', () => {
    const msg1 = createMessage('msg1', 'Talk about database design')
    const msg2 = createMessage('msg2', 'The weather is nice today')

    const similarity = calculateSimilarity(msg1, msg2)

    expect(similarity).toBeLessThan(0.3)
  })

  it('should handle empty messages', () => {
    const msg1 = createMessage('msg1', '')
    const msg2 = createMessage('msg2', '')

    const similarity = calculateSimilarity(msg1, msg2)

    expect(similarity).toBe(1)
  })
})

describe('detectRedundancy', () => {
  it('should detect duplicate messages', () => {
    const messages = [
      createMessage('msg1', 'This is a duplicate message'),
      createMessage('msg2', 'This is a duplicate message'),
      createMessage('msg3', 'Unique message')
    ]

    const redundancy = detectRedundancy(messages, 0.9)

    expect(redundancy.redundantMessages).toHaveLength(1)
    expect(redundancy.redundantMessages[0].reason).toBe('duplicate')
    expect(redundancy.duplicateCount).toBe(1)
  })

  it('should detect similar messages', () => {
    const messages = [
      createMessage('msg1', 'How to implement auth'),
      createMessage('msg2', 'How do I implement authentication'),
      createMessage('msg3', 'Completely different topic')
    ]

    const redundancy = detectRedundancy(messages, 0.6)

    expect(redundancy.redundantMessages.length).toBeGreaterThan(0)
    expect(redundancy.similarCount).toBeGreaterThan(0)
  })

  it('should calculate token savings correctly', () => {
    const messages = [
      createMessage('msg1', 'Duplicate message text'),
      createMessage('msg2', 'Duplicate message text'),
      createMessage('msg3', 'Another message')
    ]

    const redundancy = detectRedundancy(messages, 0.9)

    expect(redundancy.totalRedundantTokens).toBeGreaterThan(0)
    expect(redundancy.compressionRatio).toBeGreaterThan(0)
    expect(redundancy.compressionRatio).toBeLessThanOrEqual(1)
  })

  it('should handle empty conversation', () => {
    const redundancy = detectRedundancy([], 0.85)

    expect(redundancy.redundantMessages).toHaveLength(0)
    expect(redundancy.totalRedundantTokens).toBe(0)
  })
})

describe('clusterSimilarMessages', () => {
  it('should group similar messages', () => {
    const messages = [
      createMessage('msg1', 'Topic A message 1'),
      createMessage('msg2', 'Topic A message 2'),
      createMessage('msg3', 'Topic B message'),
      createMessage('msg4', 'Topic A message 3')
    ]

    const clusters = clusterSimilarMessages(messages, 0.5)

    expect(clusters.length).toBeGreaterThan(0)
    // Should have at least one cluster with multiple messages
    const multiMsgCluster = clusters.find(c => c.length > 1)
    expect(multiMsgCluster).toBeDefined()
  })
})

// ============================================================================
// COMPRESSION TESTS
// ============================================================================

describe('ContextOptimizer', () => {
  it('should not compress if under target', async () => {
    const optimizer = new ContextOptimizer()
    const messages = [
      createMessage('msg1', 'Short message'),
      createMessage('msg2', 'Another short message')
    ]

    const result = await optimizer.compressContext(messages, 10000, 'hybrid')

    expect(result.strategy).toBe('none')
    expect(result.compressedMessages).toHaveLength(2)
    expect(result.compressionRatio).toBe(0)
  })

  it('should compress with lossless strategy', async () => {
    const optimizer = new ContextOptimizer()
    const messages = [
      createMessage('msg1', 'Important message 1'),
      createMessage('msg2', 'Duplicate message'),
      createMessage('msg3', 'Duplicate message'),
      createMessage('msg4', 'Important message 2')
    ]

    const result = await optimizer.compressContext(messages, 50, 'lossless')

    expect(result.strategy).toBe('lossless')
    expect(result.compressedMessages.length).toBeLessThan(messages.length)
  })

  it('should compress with lossy strategy', async () => {
    const optimizer = new ContextOptimizer()
    const messages = [
      createMessage('msg1', 'High importance message with decisions and questions?'),
      createMessage('msg2', 'Low importance message without any keywords'),
      createMessage('msg3', 'Another low importance message'),
      createMessage('msg4', 'Critical decision made here!')
    ]

    const result = await optimizer.compressContext(messages, 100, 'lossy')

    expect(result.strategy).toBe('lossy')
    expect(result.compressedMessages.length).toBeLessThanOrEqual(messages.length)
  })

  it('should compress with hybrid strategy', async () => {
    const optimizer = new ContextOptimizer()
    const messages = [
      createMessage('msg1', 'Important message 1'),
      createMessage('msg2', 'Duplicate message'),
      createMessage('msg3', 'Duplicate message'),
      createMessage('msg4', 'Low importance filler text'),
      createMessage('msg5', 'Critical decision!')
    ]

    const result = await optimizer.compressContext(messages, 100, 'hybrid')

    expect(result.strategy).toBe('hybrid')
    expect(result.compressedTokens).toBeLessThan(result.originalTokens)
    expect(result.compressionRatio).toBeGreaterThan(0)
  })

  it('should preserve messages with markers', async () => {
    const optimizer = new ContextOptimizer()
    const messages = [
      createMessage('msg1', 'Normal message'),
      createMessage('msg2', '[IMPORTANT] This must be preserved'),
      createMessage('msg3', 'Another normal message')
    ]

    const result = await optimizer.compressContext(messages, 50, 'lossy')

    const preserved = result.compressedMessages.find(m => m.id === 'msg2')
    expect(preserved).toBeDefined()
  })
})

describe('applyLosslessCompression', () => {
  it('should remove only duplicates', () => {
    const messages = [
      createMessage('msg1', 'Unique message 1'),
      createMessage('msg2', 'Duplicate message'),
      createMessage('msg3', 'Duplicate message'),
      createMessage('msg4', 'Unique message 2')
    ]

    const redundancy = detectRedundancy(messages, 0.95)
    const compressed = applyLosslessCompression(messages, redundancy)

    expect(compressed).toHaveLength(3)
    expect(compressed.find(m => m.id === 'msg1')).toBeDefined()
    expect(compressed.find(m => m.id === 'msg2') || compressed.find(m => m.id === 'msg3')).toBeDefined()
    expect(compressed.find(m => m.id === 'msg4')).toBeDefined()
  })
})

describe('applyLossyCompression', () => {
  it('should keep high-importance messages', () => {
    const messages = [
      createMessage('msg1', 'High importance? Decision made!'),
      createMessage('msg2', 'Low importance filler'),
      createMessage('msg3', 'Another low importance message')
    ]

    const compressed = applyLossyCompression(messages, 200, 0.3)

    expect(compressed.length).toBeLessThan(messages.length)
    expect(compressed.find(m => m.id === 'msg1')).toBeDefined()
  })
})

describe('measureCompressionQuality', () => {
  it('should measure information preservation', () => {
    const original = [
      createMessage('msg1', 'Message 1'),
      createMessage('msg2', 'Message 2'),
      createMessage('msg3', 'Message 3')
    ]

    const compressed = [
      createMessage('msg1', 'Message 1'),
      createMessage('msg2', 'Message 2')
    ]

    const quality = measureCompressionQuality(original, compressed)

    expect(quality.preservedInformation).toBeGreaterThan(0)
    expect(quality.preservedInformation).toBeLessThanOrEqual(1)
    expect(quality.overallScore).toBeGreaterThan(0)
    expect(quality.overallScore).toBeLessThanOrEqual(1)
  })

  it('should detect perfect preservation', () => {
    const original = [
      createMessage('msg1', 'Message 1'),
      createMessage('msg2', 'Message 2')
    ]

    const compressed = [
      createMessage('msg1', 'Message 1'),
      createMessage('msg2', 'Message 2')
    ]

    const quality = measureCompressionQuality(original, compressed)

    expect(quality.semanticPreservation).toBeCloseTo(1)
    expect(quality.structuralIntegrity).toBe(1)
  })
})

// ============================================================================
// TOKEN ESTIMATION TESTS
// ============================================================================

describe('estimateMessageTokens', () => {
  it('should estimate tokens for text message', () => {
    const msg = createMessage('msg1', 'This is a test message with some text')

    const tokens = estimateMessageTokens(msg)

    expect(tokens).toBeGreaterThan(0)
    // Rough approximation: ~4 chars per token
    expect(tokens).toBeCloseTo(Math.ceil(msg.content.text!.length / 4), -1)
  })

  it('should handle empty messages', () => {
    const msg = createMessage('msg1', '')

    const tokens = estimateMessageTokens(msg)

    expect(tokens).toBe(0)
  })

  it('should include system notes in estimation', () => {
    const msg: Message = {
      ...createMessage('msg1', 'Text content'),
      content: {
        text: 'Text content',
        systemNote: 'System note here'
      }
    }

    const tokens = estimateMessageTokens(msg)

    expect(tokens).toBeGreaterThan(0)
  })
})

describe('estimateTotalTokens', () => {
  it('should sum tokens across messages', () => {
    const messages = [
      createMessage('msg1', 'Message one'),
      createMessage('msg2', 'Message two'),
      createMessage('msg3', 'Message three')
    ]

    const total = estimateTotalTokens(messages)

    expect(total).toBeGreaterThan(0)
    const expected = messages.reduce((sum, msg) => sum + estimateMessageTokens(msg), 0)
    expect(total).toBe(expected)
  })

  it('should handle empty array', () => {
    const total = estimateTotalTokens([])
    expect(total).toBe(0)
  })
})

// ============================================================================
// PRESERVABLE MARKERS TESTS
// ============================================================================

describe('hasPreservableMarker', () => {
  it('should detect [PRESERVE] marker', () => {
    const msg = createMessage('msg1', '[PRESERVE] This must stay')

    expect(hasPreservableMarker(msg)).toBe(true)
  })

  it('should detect [IMPORTANT] marker', () => {
    const msg = createMessage('msg1', '[IMPORTANT] Critical info')

    expect(hasPreservableMarker(msg)).toBe(true)
  })

  it('should detect [DECISION] marker', () => {
    const msg = createMessage('msg1', '[DECISION] We chose this approach')

    expect(hasPreservableMarker(msg)).toBe(true)
  })

  it('should detect markers case-insensitively', () => {
    const msg = createMessage('msg1', '[preserve] lowercase marker')

    expect(hasPreservableMarker(msg)).toBe(true)
  })

  it('should return false for messages without markers', () => {
    const msg = createMessage('msg1', 'Just a normal message')

    expect(hasPreservableMarker(msg)).toBe(false)
  })
})

describe('addPreservableMarker', () => {
  it('should add marker to message', () => {
    const msg = createMessage('msg1', 'Original text')

    const marked = addPreservableMarker(msg, '[PRESERVE]')

    expect(marked.content.text).toBe('[PRESERVE] Original text')
  })
})

describe('PRESERVABLE_MARKERS', () => {
  it('should have all required markers', () => {
    const markerStrings = PRESERVABLE_MARKERS.map(m => m.marker)

    expect(markerStrings).toContain('[PRESERVE]')
    expect(markerStrings).toContain('[IMPORTANT]')
    expect(markerStrings).toContain('[DECISION]')
    expect(markerStrings).toContain('[KEY]')
    expect(markerStrings).toContain('[CRITICAL]')
  })

  it('should have priority values', () => {
    PRESERVABLE_MARKERS.forEach(marker => {
      expect(marker.priority).toBeGreaterThan(0)
      expect(marker.priority).toBeLessThanOrEqual(100)
      expect(marker.description).toBeDefined()
    })
  })
})

// ============================================================================
// STATISTICS TESTS
// ============================================================================

describe('calculateImportanceStatistics', () => {
  it('should calculate mean correctly', () => {
    const messages = [
      createMessage('msg1', 'Message 1'),
      createMessage('msg2', 'Message 2'),
      createMessage('msg3', 'Message 3')
    ]

    const scores = calculateAllImportance(messages)
    const stats = calculateImportanceStatistics(scores)

    expect(stats.mean).toBeGreaterThan(0)
    expect(stats.mean).toBeLessThanOrEqual(1)
  })

  it('should calculate distribution', () => {
    const messages = Array.from({ length: 20 }, (_, i) =>
      createMessage(`msg${i}`, `Message ${i}`)
    )

    const scores = calculateAllImportance(messages)
    const stats = calculateImportanceStatistics(scores)

    expect(stats.distribution.low + stats.distribution.medium + stats.distribution.high).toBe(20)
  })

  it('should handle empty array', () => {
    const stats = calculateImportanceStatistics([])

    expect(stats.mean).toBe(0)
    expect(stats.median).toBe(0)
    expect(stats.min).toBe(0)
    expect(stats.max).toBe(0)
  })
})
