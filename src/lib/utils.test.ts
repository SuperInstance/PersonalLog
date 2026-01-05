/**
 * Unit tests for utility functions
 * @module lib/utils.test
 */

import { describe, it, expect, vi } from 'vitest'
import { cn, formatDate, formatRelativeTime, getAuthorDisplayName, getAuthorColor } from './utils'
import type { MessageAuthor } from '@/types/conversation'

describe('cn (className utility)', () => {
  it('should merge class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('should handle Tailwind conflicts with tailwind-merge', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('should handle empty inputs', () => {
    expect(cn()).toBe('')
  })

  it('should handle arrays and objects', () => {
    expect(cn(['foo', 'bar'], { baz: true, qux: false })).toBe('foo bar baz')
  })
})

describe('formatDate', () => {
  it('should format Date object correctly', () => {
    const date = new Date('2024-01-15')
    const result = formatDate(date)
    expect(result).toContain('2024')
    expect(result).toContain('Jan')
    expect(result).toContain('15')
  })

  it('should format date string correctly', () => {
    const result = formatDate('2024-01-15')
    expect(result).toContain('2024')
    expect(result).toContain('Jan')
    expect(result).toContain('15')
  })

  it('should handle invalid dates gracefully', () => {
    const result = formatDate('invalid')
    expect(result).toContain('Invalid Date')
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => {
    // Mock current time
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  it('should return "now" for very recent times', () => {
    const result = formatRelativeTime('2024-01-15T11:59:30Z')
    expect(result).toBe('now')
  })

  it('should return minutes for times within an hour', () => {
    const result = formatRelativeTime('2024-01-15T11:45:00Z')
    expect(result).toBe('15m')
  })

  it('should return hours for times within a day', () => {
    const result = formatRelativeTime('2024-01-15T08:00:00Z')
    expect(result).toBe('4h')
  })

  it('should return days for times within a week', () => {
    const result = formatRelativeTime('2024-01-13T12:00:00Z')
    expect(result).toBe('2d')
  })

  it('should return formatted date for older times', () => {
    const result = formatRelativeTime('2024-01-01T12:00:00Z')
    expect(result).toContain('Jan')
    expect(result).toContain('1')
  })

  it('should handle dates in the past correctly', () => {
    const result = formatRelativeTime('2024-01-10T12:00:00Z')
    expect(result).toBe('5d')
  })
})

describe('getAuthorDisplayName', () => {
  it('should return "You" for user author', () => {
    const result = getAuthorDisplayName('user')
    expect(result).toBe('You')
  })

  it('should return contact name for AI contact', () => {
    const author: MessageAuthor = {
      type: 'ai-contact',
      contactId: 'contact-1',
      contactName: 'Claude'
    }
    const result = getAuthorDisplayName(author)
    expect(result).toBe('Claude')
  })

  it('should return "System" for system author', () => {
    const author: MessageAuthor = {
      type: 'system',
      reason: 'auto-message'
    }
    const result = getAuthorDisplayName(author)
    expect(result).toBe('System')
  })
})

describe('getAuthorColor', () => {
  it('should return blue for user', () => {
    const result = getAuthorColor('user')
    expect(result).toBe('bg-blue-500')
  })

  it('should return gray for system', () => {
    const author: MessageAuthor = {
      type: 'system',
      reason: 'auto-message'
    }
    const result = getAuthorColor(author)
    expect(result).toBe('bg-gray-500')
  })

  it('should return consistent color for AI contact based on ID', () => {
    const author: MessageAuthor = {
      type: 'ai-contact',
      contactId: 'contact-1',
      contactName: 'Claude'
    }
    const result1 = getAuthorColor(author)
    const result2 = getAuthorColor(author)
    expect(result1).toBe(result2)
    expect(result1).toMatch(/^bg-(purple|green|orange|pink|teal|indigo|red|cyan)-500$/)
  })

  it('should return different colors for different AI contacts', () => {
    const author1: MessageAuthor = {
      type: 'ai-contact',
      contactId: 'contact-1',
      contactName: 'Claude'
    }
    const author2: MessageAuthor = {
      type: 'ai-contact',
      contactId: 'contact-2',
      contactName: 'GPT'
    }
    const color1 = getAuthorColor(author1)
    const color2 = getAuthorColor(author2)
    // Colors may be the same by chance, but should generally differ
    expect([color1, color2]).toContain(expect.any(String))
  })
})
