/**
 * Tests for JEPA Markdown Formatter
 */

import { describe, it, expect } from 'vitest'
import {
  formatTimestamp,
  formatDuration,
  formatISODate,
} from '../timestamp-formatter'
import {
  detectSpeaker,
  getSpeakerDisplayName,
  calculateSpeakerStats,
} from '../speaker-detection'
import {
  formatTranscriptToMarkdown,
  formatMessagesToMarkdown,
} from '../markdown-formatter'
import { JEPA_Transcript } from '@/types/jepa'
import { Message } from '@/types/conversation'

describe('JEPA Markdown Formatter', () => {
  describe('formatTimestamp', () => {
    it('should format seconds into HH:MM:SS', () => {
      expect(formatTimestamp(3661, 'hh:mm:ss')).toBe('01:01:01')
      expect(formatTimestamp(65, 'hh:mm:ss')).toBe('00:01:05')
      expect(formatTimestamp(0, 'hh:mm:ss')).toBe('00:00:00')
    })

    it('should format seconds into HH:MM', () => {
      expect(formatTimestamp(3661, 'hh:mm')).toBe('01:01')
      expect(formatTimestamp(65, 'hh:mm')).toBe('00:01')
    })

    it('should format seconds as decimal', () => {
      expect(formatTimestamp(65.5, 'seconds')).toBe('65.5')
    })
  })

  describe('formatDuration', () => {
    it('should format duration in human-readable format', () => {
      expect(formatDuration(0, 90)).toBe('1 minute 30 seconds')
      expect(formatDuration(0, 45)).toBe('45 seconds')
      expect(formatDuration(0, 120)).toBe('2 minutes')
    })
  })

  describe('detectSpeaker', () => {
    it('should detect user speaker', () => {
      const result = detectSpeaker('user')
      expect(result.speaker).toBe('user')
      expect(result.confidence).toBe(1.0)
    })

    it('should detect AI assistant', () => {
      const result = detectSpeaker({
        type: 'ai-contact',
        contactId: 'test-agent',
        contactName: 'Claude',
      })
      expect(result.speaker).toBe('assistant')
      expect(result.confidence).toBe(1.0)
    })

    it('should detect system speaker', () => {
      const result = detectSpeaker({
        type: 'system',
        reason: 'Auto-generated',
      })
      expect(result.speaker).toBe('system')
      expect(result.confidence).toBe(1.0)
    })
  })

  describe('getSpeakerDisplayName', () => {
    it('should return display name for known speakers', () => {
      expect(getSpeakerDisplayName('user')).toBe('User')
      expect(getSpeakerDisplayName('assistant')).toBe('Assistant')
      expect(getSpeakerDisplayName('system')).toBe('System')
    })

    it('should return formatted name for custom speakers', () => {
      expect(getSpeakerDisplayName('speaker-1')).toBe('Speaker speaker-1')
    })
  })

  describe('formatMessagesToMarkdown', () => {
    it('should format empty message list', () => {
      const messages: Message[] = []
      const result = formatMessagesToMarkdown(messages, 'test-session')
      expect(result.markdown).toContain('# Conversation Transcript')
      expect(result.metadata.totalSegments).toBe(0)
    })

    it('should format messages with metadata', () => {
      const messages: Message[] = [
        {
          id: '1',
          conversationId: 'conv-1',
          type: 'text',
          author: 'user',
          content: { text: 'Hello!' },
          timestamp: '2025-01-04T10:00:00Z',
          metadata: {},
        },
        {
          id: '2',
          conversationId: 'conv-1',
          type: 'text',
          author: {
            type: 'ai-contact',
            contactId: 'claude',
            contactName: 'Claude',
          },
          content: { text: 'Hi there!' },
          timestamp: '2025-01-04T10:00:05Z',
          metadata: {},
        },
      ]

      const result = formatMessagesToMarkdown(messages, 'test-session', {
        includeMetadata: true,
        includeTimestamps: true,
        includeSpeakerNames: true,
      })

      expect(result.markdown).toContain('# Conversation Transcript')
      expect(result.markdown).toContain('Hello!')
      expect(result.markdown).toContain('Hi there!')
      expect(result.markdown).toContain('User')
      expect(result.markdown).toContain('Assistant')
      expect(result.metadata.totalSegments).toBe(2)
      expect(result.metadata.speakers).toContain('user')
      expect(result.metadata.speakers).toContain('assistant')
    })
  })

  describe('calculateSpeakerStats', () => {
    it('should calculate statistics for speakers', () => {
      const messages: Message[] = [
        {
          id: '1',
          conversationId: 'conv-1',
          type: 'text',
          author: 'user',
          content: { text: 'Hello world!' },
          timestamp: '2025-01-04T10:00:00Z',
          metadata: {},
        },
        {
          id: '2',
          conversationId: 'conv-1',
          type: 'text',
          author: 'user',
          content: { text: 'How are you?' },
          timestamp: '2025-01-04T10:00:05Z',
          metadata: {},
        },
      ]

      const stats = calculateSpeakerStats(messages)
      const userStats = stats.get('user')

      expect(userStats).toBeDefined()
      expect(userStats?.messageCount).toBe(2)
      expect(userStats?.wordCount).toBe(6)
    })
  })
})
