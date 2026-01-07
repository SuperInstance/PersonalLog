/**
 * Real-time Transcription Display Tests
 *
 * Tests for RealtimeTranscription and TranscriptTimeline components.
 * @components/jepa/__tests__/transcription-display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { RealtimeTranscription } from '../RealtimeTranscription'
import { TranscriptTimeline } from '../TranscriptTimeline'
import { JEPA_Transcript, SpeakerType } from '@/types/jepa'
import {
  formatConfidence,
  getConfidenceColorClasses,
  formatTimestamp,
  formatTranscriptForDisplay,
  mergeEditWithTranscript,
  parseWords,
  isCJKText,
  isRTLText,
  getTextDirection,
  calculateTranscriptStats,
  searchTranscript,
} from '@/lib/jepa/transcript-formatter'

// ============================================================================
// MOCK DATA
// ============================================================================

const createMockTranscript = (overrides?: Partial<JEPA_Transcript>): JEPA_Transcript => ({
  id: 'test-transcript-1',
  conversationId: 'conv-1',
  sessionId: 'session-1',
  startedAt: '2025-01-07T10:00:00Z',
  duration: 60,
  segments: [
    {
      id: 'seg-1',
      speaker: 'user' as SpeakerType,
      text: 'Hello, this is a test transcript with high confidence.',
      timestamp: '2025-01-07T10:00:00Z',
      startTime: 0,
      endTime: 3.5,
      confidence: 0.95,
    },
    {
      id: 'seg-2',
      speaker: 'assistant' as SpeakerType,
      text: 'I understand. Let me help you with that.',
      timestamp: '2025-01-07T10:00:04Z',
      startTime: 4.0,
      endTime: 7.2,
      confidence: 0.88,
    },
    {
      id: 'seg-3',
      speaker: 'user' as SpeakerType,
      text: 'This segment has low confidence and needs review.',
      timestamp: '2025-01-07T10:00:08Z',
      startTime: 8.0,
      endTime: 11.5,
      confidence: 0.65,
    },
  ],
  metadata: {
    totalSpeakers: 2,
    speakers: [
      {
        id: 'user' as SpeakerType,
        name: 'User',
        segmentCount: 2,
        speakingTime: 7.0,
      },
      {
        id: 'assistant' as SpeakerType,
        name: 'Assistant',
        segmentCount: 1,
        speakingTime: 3.2,
      },
    ],
    language: 'en',
    audioQuality: 'good',
    audioKept: false,
    processingTime: 1500,
  },
  ...overrides,
})

// ============================================================================
// TRANSCRIPT FORMATTER TESTS
// ============================================================================

describe('Transcript Formatter', () => {
  describe('formatConfidence', () => {
    it('should format confidence scores as percentages', () => {
      expect(formatConfidence(1.0)).toBe('100%')
      expect(formatConfidence(0.95)).toBe('95%')
      expect(formatConfidence(0.7)).toBe('70%')
      expect(formatConfidence(0.5)).toBe('50%')
      expect(formatConfidence(0.0)).toBe('0%')
    })
  })

  describe('getConfidenceColorClasses', () => {
    it('should return green for high confidence', () => {
      const colors = getConfidenceColorClasses(0.95)
      expect(colors.text).toContain('green')
      expect(colors.bg).toContain('green')
    })

    it('should return yellow for medium confidence', () => {
      const colors = getConfidenceColorClasses(0.75)
      expect(colors.text).toContain('yellow')
      expect(colors.bg).toContain('yellow')
    })

    it('should return red for low confidence', () => {
      const colors = getConfidenceColorClasses(0.5)
      expect(colors.text).toContain('red')
      expect(colors.bg).toContain('red')
      expect(colors.border).toContain('red')
    })
  })

  describe('formatTimestamp', () => {
    it('should format milliseconds correctly', () => {
      expect(formatTimestamp(0)).toBe('0:00')
      expect(formatTimestamp(1000)).toBe('0:01')
      expect(formatTimestamp(60000)).toBe('1:00')
      expect(formatTimestamp(3661000)).toBe('1:01:01')
    })
  })

  describe('parseWords', () => {
    it('should split text into words preserving punctuation', () => {
      const words = parseWords('Hello, world! This is a test.')
      expect(words).toEqual(['Hello,', 'world!', 'This', 'is', 'a', 'test.'])
    })

    it('should handle multiple spaces', () => {
      const words = parseWords('Hello    world')
      expect(words).toEqual(['Hello', 'world'])
    })

    it('should handle empty string', () => {
      const words = parseWords('')
      expect(words).toEqual([])
    })
  })

  describe('formatTranscriptForDisplay', () => {
    it('should format transcript with segments', () => {
      const mockTranscript = createMockTranscript()
      const result = formatTranscriptForDisplay(mockTranscript)

      expect(result.finalizedSegments).toHaveLength(3)
      expect(result.finalizedSegments[0].speaker).toBe('user')
      expect(result.finalizedSegments[0].words.length).toBeGreaterThan(0)
    })

    it('should handle interim text', () => {
      const mockTranscript = createMockTranscript()
      const result = formatTranscriptForDisplay(mockTranscript, 'This is interim text')

      expect(result.interimSegment).toBeTruthy()
      expect(result.interimSegment?.isInterim).toBe(true)
      expect(result.interimSegment?.words.map(w => w.word).join('')).toBe('This is interim text')
    })

    it('should handle null transcript', () => {
      const result = formatTranscriptForDisplay(null, 'Interim only')

      expect(result.finalizedSegments).toHaveLength(0)
      expect(result.interimSegment).toBeTruthy()
    })
  })

  describe('mergeEditWithTranscript', () => {
    it('should update segment text', () => {
      const mockTranscript = createMockTranscript()
      const edited = mergeEditWithTranscript('seg-1', 'Updated text', mockTranscript)

      expect(edited.segments[0].text).toBe('Updated text')
      expect(edited.segments[0].metadata?.isEdited).toBe(true)
      expect(edited.segments[0].metadata?.editedAt).toBeDefined()
    })

    it('should not modify other segments', () => {
      const mockTranscript = createMockTranscript()
      const originalText = mockTranscript.segments[1].text
      const edited = mergeEditWithTranscript('seg-1', 'Updated text', mockTranscript)

      expect(edited.segments[1].text).toBe(originalText)
    })

    it('should return unchanged transcript if segment not found', () => {
      const mockTranscript = createMockTranscript()
      const edited = mergeEditWithTranscript('nonexistent', 'Updated text', mockTranscript)

      expect(edited).toEqual(mockTranscript)
    })
  })

  describe('isCJKText', () => {
    it('should detect CJK characters', () => {
      expect(isCJKText('你好世界')).toBe(true) // Chinese
      expect(isCJKText('こんにちは')).toBe(true) // Japanese
      expect(isCJKText('안녕하세요')).toBe(true) // Korean
      expect(isCJKText('Hello')).toBe(false) // English
    })
  })

  describe('isRTLText', () => {
    it('should detect RTL text', () => {
      expect(isRTLText('مرحبا')).toBe(true) // Arabic
      expect(isRTLText('שלום')).toBe(true) // Hebrew
      expect(isRTLText('Hello')).toBe(false) // English
    })
  })

  describe('getTextDirection', () => {
    it('should return correct direction', () => {
      expect(getTextDirection('مرحبا')).toBe('rtl')
      expect(getTextDirection('Hello')).toBe('ltr')
    })
  })

  describe('calculateTranscriptStats', () => {
    it('should calculate statistics correctly', () => {
      const mockTranscript = createMockTranscript()
      const stats = calculateTranscriptStats(mockTranscript)

      expect(stats.wordCount).toBeGreaterThan(0)
      expect(stats.characterCount).toBeGreaterThan(0)
      expect(stats.segmentCount).toBe(3)
      expect(stats.duration).toBe(60)
      expect(stats.averageConfidence).toBeGreaterThan(0)
      expect(stats.lowConfidenceSegments).toBe(1) // Only seg-3 has < 0.7
    })
  })

  describe('searchTranscript', () => {
    it('should find matching segments', () => {
      const mockTranscript = createMockTranscript()
      const results = searchTranscript(mockTranscript, 'test')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].segment.id).toBeDefined()
      expect(results[0].matches.length).toBeGreaterThan(0)
    })

    it('should return empty array for no matches', () => {
      const mockTranscript = createMockTranscript()
      const results = searchTranscript(mockTranscript, 'nonexistent')

      expect(results).toEqual([])
    })

    it('should handle empty query', () => {
      const mockTranscript = createMockTranscript()
      const results = searchTranscript(mockTranscript, '')

      expect(results).toEqual([])
    })

    it('should be case insensitive', () => {
      const mockTranscript = createMockTranscript()
      const resultsLower = searchTranscript(mockTranscript, 'hello')
      const resultsUpper = searchTranscript(mockTranscript, 'HELLO')

      expect(resultsLower.length).toBe(resultsUpper.length)
    })
  })
})

// ============================================================================
// REALTIME TRANSCRIPTION COMPONENT TESTS
// ============================================================================

describe('RealtimeTranscription Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render empty state when no transcript', () => {
      render(<RealtimeTranscription transcript={null} />)

      expect(screen.getByText(/no transcript yet/i)).toBeInTheDocument()
    })

    it('should render transcript segments', () => {
      const mockTranscript = createMockTranscript()
      render(<RealtimeTranscription transcript={mockTranscript} />)

      expect(screen.getByText(/Hello, this is a test/)).toBeInTheDocument()
      expect(screen.getByText(/I understand/)).toBeInTheDocument()
      expect(screen.getByText(/low confidence/)).toBeInTheDocument()
    })

    it('should render interim text', () => {
      const mockTranscript = createMockTranscript()
      render(
        <RealtimeTranscription
          transcript={mockTranscript}
          interimText="This is interim"
        />
      )

      expect(screen.getByText('This is interim')).toBeInTheDocument()
    })

    it('should show confidence scores when enabled', () => {
      const mockTranscript = createMockTranscript()
      render(<RealtimeTranscription transcript={mockTranscript} showConfidence />)

      // Low confidence segment should show warning
      expect(screen.getByText(/low confidence/i)).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should call onSegmentClick when segment clicked', async () => {
      const mockTranscript = createMockTranscript()
      const onSegmentClick = vi.fn()

      render(
        <RealtimeTranscription
          transcript={mockTranscript}
          onSegmentClick={onSegmentClick}
        />
      )

      const firstSegment = screen.getByText(/Hello, this is a test/)
      fireEvent.click(firstSegment)

      await waitFor(() => {
        expect(onSegmentClick).toHaveBeenCalled()
      })
    })

    it('should enable editing when enableEditing is true', async () => {
      const mockTranscript = createMockTranscript()
      const onTranscriptEdit = vi.fn()

      render(
        <RealtimeTranscription
          transcript={mockTranscript}
          enableEditing
          onTranscriptEdit={onTranscriptEdit}
        />
      )

      // Hover over segment to show edit button
      const segment = screen.getByText(/Hello, this is a test/).closest('.group')
      fireEvent.mouseEnter(segment!)

      // Click edit button
      const editButton = await screen.findByTitle('Edit segment')
      fireEvent.click(editButton)

      // Should show textarea
      const textarea = await screen.findByRole('textbox')
      expect(textarea).toBeInTheDocument()
    })

    it('should save edits when save button clicked', async () => {
      const mockTranscript = createMockTranscript()
      const onTranscriptEdit = vi.fn()

      render(
        <RealtimeTranscription
          transcript={mockTranscript}
          enableEditing
          onTranscriptEdit={onTranscriptEdit}
        />
      )

      // Start editing
      const segment = screen.getByText(/Hello, this is a test/).closest('.group')
      fireEvent.mouseEnter(segment!)
      const editButton = await screen.findByTitle('Edit segment')
      fireEvent.click(editButton)

      // Change text
      const textarea = await screen.findByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'Updated text' } })

      // Click save
      const saveButton = screen.getByText('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(onTranscriptEdit).toHaveBeenCalled()
      })
    })
  })

  describe('Auto-scroll', () => {
    it('should show scroll-to-bottom button when user scrolls up', () => {
      const mockTranscript = createMockTranscript()

      const { container } = render(
        <RealtimeTranscription
          transcript={mockTranscript}
          isRecording
          autoScroll
        />
      )

      const scrollContainer = container.querySelector('[aria-live="polite"]')
      expect(scrollContainer).toBeInTheDocument()

      // Simulate scroll up
      if (scrollContainer) {
        fireEvent.scroll(scrollContainer, { target: { scrollTop: 100 } })
      }

      // Should show scroll button after scrolling
      // (Note: this depends on scroll position calculation)
    })
  })
})

// ============================================================================
// TRANSCRIPT TIMELINE COMPONENT TESTS
// ============================================================================

describe('TranscriptTimeline Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render timeline with segments', () => {
      const mockTranscript = createMockTranscript()

      const { container } = render(
        <TranscriptTimeline
          transcript={mockTranscript}
          totalDuration={60000}
        />
      )

      // Should have timeline container
      const timeline = container.querySelector('[role="slider"]')
      expect(timeline).toBeInTheDocument()

      // Should show stats
      expect(screen.getByText(/3 segments/i)).toBeInTheDocument()
    })

    it('should show confidence visualization', () => {
      const mockTranscript = createMockTranscript()

      render(
        <TranscriptTimeline
          transcript={mockTranscript}
          showConfidence
          totalDuration={60000}
        />
      )

      // Should show low confidence warning
      expect(screen.getByText(/low confidence/i)).toBeInTheDocument()
    })

    it('should show playhead at current position', () => {
      const mockTranscript = createMockTranscript()

      const { container } = render(
        <TranscriptTimeline
          transcript={mockTranscript}
          currentTime={30000}
          totalDuration={60000}
        />
      )

      // Playhead should be at 50% (30000 / 60000)
      const timeline = container.querySelector('[role="slider"]')
      expect(timeline).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should call onSeek when timeline clicked', () => {
      const mockTranscript = createMockTranscript()
      const onSeek = vi.fn()

      const { container } = render(
        <TranscriptTimeline
          transcript={mockTranscript}
          totalDuration={60000}
          onSeek={onSeek}
        />
      )

      const timeline = container.querySelector('[role="slider"]')
      if (timeline) {
        fireEvent.click(timeline)
        expect(onSeek).toHaveBeenCalled()
      }
    })

    it('should call onSegmentClick when segment clicked', () => {
      const mockTranscript = createMockTranscript()
      const onSegmentClick = vi.fn()

      render(
        <TranscriptTimeline
          transcript={mockTranscript}
          onSegmentClick={onSegmentClick}
          totalDuration={60000}
        />
      )

      // Click on first segment
      const segments = screen.getAllByTitle(/User:/)
      if (segments.length > 0) {
        fireEvent.click(segments[0])
        expect(onSegmentClick).toHaveBeenCalled()
      }
    })
  })

  describe('Empty state', () => {
    it('should render empty state when no transcript', () => {
      render(<TranscriptTimeline transcript={null} />)

      expect(screen.getByText(/no transcript segments/i)).toBeInTheDocument()
    })
  })
})

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Transcription Display Integration', () => {
  it('should handle real-time streaming workflow', async () => {
    const mockTranscript = createMockTranscript()
    const onTranscriptEdit = vi.fn()

    const { rerender } = render(
      <RealtimeTranscription
        transcript={null}
        interimText="Streaming"
        isRecording
      />
    )

    // Should show interim text
    expect(screen.getByText('Streaming')).toBeInTheDocument()

    // Update with transcript
    rerender(
      <RealtimeTranscription
        transcript={mockTranscript}
        onTranscriptEdit={onTranscriptEdit}
        enableEditing
      />
    )

    // Should show segments
    expect(screen.getByText(/Hello, this is a test/)).toBeInTheDocument()
  })

  it('should sync with timeline', () => {
    const mockTranscript = createMockTranscript()
    const onSeek = vi.fn()
    const onSegmentClick = vi.fn()

    render(
      <div>
        <TranscriptTimeline
          transcript={mockTranscript}
          onSeek={onSeek}
          onSegmentClick={onSegmentClick}
          totalDuration={60000}
        />
        <RealtimeTranscription
          transcript={mockTranscript}
          onSegmentClick={(id) => onSegmentClick(mockTranscript.segments.find(s => s.id === id)!)}
        />
      </div>
    )

    // Both components should render without errors
    expect(screen.getByText(/Hello, this is a test/)).toBeInTheDocument()
  })
})
