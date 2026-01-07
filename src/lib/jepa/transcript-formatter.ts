/**
 * JEPA Transcript Formatter
 *
 * Utilities for formatting and manipulating transcript data for display.
 * Handles confidence visualization, word-level timing, and text formatting.
 */

import type { JEPA_Transcript, JEPA_TranscriptSegment, SpeakerType } from '@/types/jepa'
import type { TranscriptSegment } from './stt-types'
import { getSpeakerDisplayName, getSpeakerColor } from './speaker-detection'

// Re-export speaker functions for convenience
export { getSpeakerDisplayName, getSpeakerColor } from './speaker-detection'

// Re-export markdown functions with alias for compatibility
export {
  formatTranscriptToMarkdown as transcriptToMarkdown,
  generateTranscriptFilename,
} from './markdown-formatter'

/**
 * Convert transcript to plain text (for compatibility)
 * This is a simplified version that strips markdown
 */
export function transcriptToPlainText(
  transcript: JEPA_Transcript,
  options: Partial<any> = {}
): string {
  // Join all segment texts with newlines
  return transcript.segments
    .map(seg => `${getSpeakerDisplayName(seg.speaker)}: ${seg.text}`)
    .join('\n\n')
}

/**
 * Download transcript as a file (for compatibility)
 */
export function downloadTranscript(
  transcript: JEPA_Transcript,
  format: 'markdown' | 'txt' | 'json' = 'markdown',
  filename?: string
): void {
  let content: string
  let mimeType: string

  switch (format) {
    case 'markdown':
      // Use plain text for now - markdown formatter can be integrated later
      content = transcriptToPlainText(transcript)
      mimeType = 'text/markdown'
      break
    case 'txt':
      content = transcriptToPlainText(transcript)
      mimeType = 'text/plain'
      break
    case 'json':
      content = JSON.stringify(transcript, null, 2)
      mimeType = 'application/json'
      break
  }

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download =
    filename ||
    `transcript_${new Date(transcript.startedAt).toISOString().split('T')[0]}.${format === 'markdown' ? 'md' : format}`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Copy transcript to clipboard (for compatibility)
 */
export async function copyTranscriptToClipboard(
  transcript: JEPA_Transcript,
  format: 'markdown' | 'plain' = 'markdown'
): Promise<boolean> {
  try {
    const content =
      format === 'markdown'
        ? transcriptToPlainText(transcript)
        : transcriptToPlainText(transcript)

    await navigator.clipboard.writeText(content)
    return true
  } catch (error) {
    console.error('Failed to copy transcript to clipboard:', error)
    return false
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface FormattedWord {
  word: string
  confidence: number
  startTime?: number // milliseconds
  endTime?: number // milliseconds
  isPunctuation: boolean
}

export interface FormattedSegment {
  id: string
  words: FormattedWord[]
  speaker: SpeakerType
  startTime: number // milliseconds
  endTime: number // milliseconds
  confidence: number // 0-1
  isInterim: boolean
}

export interface ConfidenceLevel {
  level: 'high' | 'medium' | 'low'
  color: string
  bgColor: string
  threshold: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const CONFIDENCE_LEVELS: Record<string, ConfidenceLevel> = {
  high: {
    level: 'high',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    threshold: 0.9,
  },
  medium: {
    level: 'medium',
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    threshold: 0.7,
  },
  low: {
    level: 'low',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    threshold: 0.0,
  },
}

export const PUNCTUATION_REGEX = /[.,!?;:，！？；：、""''（）【】《》]/g

// ============================================================================
// CONFIDENCE VISUALIZATION
// ============================================================================

/**
 * Get confidence level for a given confidence score
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.9) return CONFIDENCE_LEVELS.high
  if (confidence >= 0.7) return CONFIDENCE_LEVELS.medium
  return CONFIDENCE_LEVELS.low
}

/**
 * Get color classes for confidence score
 */
export function getConfidenceColorClasses(confidence: number): {
  text: string
  bg: string
  border: string
} {
  const level = getConfidenceLevel(confidence)
  return {
    text: level.color,
    bg: level.bgColor,
    border: level.level === 'low' ? 'border-red-300 dark:border-red-700' : '',
  }
}

/**
 * Format confidence score as percentage
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

// ============================================================================
// TEXT FORMATTING
// ============================================================================

/**
 * Split text into words with punctuation
 */
export function parseWords(text: string): string[] {
  return text.split(/(\s+)/).filter(word => word.trim().length > 0)
}

/**
 * Check if a word is punctuation
 */
export function isPunctuation(word: string): boolean {
  return PUNCTUATION_REGEX.test(word)
}

/**
 * Format transcript segment into words with confidence
 */
export function formatSegmentWords(
  segment: JEPA_TranscriptSegment | TranscriptSegment,
  defaultConfidence: number = 1.0
): FormattedWord[] {
  const words = parseWords(segment.text)
  const segmentConfidence = segment.confidence ?? defaultConfidence

  return words.map(word => ({
    word,
    confidence: isPunctuation(word) ? 1.0 : segmentConfidence,
    startTime: segment.startTime,
    endTime: segment.endTime,
    isPunctuation: isPunctuation(word),
  }))
}

/**
 * Format transcript for real-time display
 */
export function formatTranscriptForDisplay(
  transcript: JEPA_Transcript | null,
  interimText?: string
): {
  finalizedSegments: FormattedSegment[]
  interimSegment: FormattedSegment | null
} {
  const finalizedSegments: FormattedSegment[] = []
  let interimSegment: FormattedSegment | null = null

  if (!transcript) {
    // Create interim segment from text
    if (interimText) {
      interimSegment = {
        id: `interim_${Date.now()}`,
        words: parseWords(interimText).map(word => ({
          word,
          confidence: 0.5,
          isPunctuation: isPunctuation(word),
        })),
        speaker: 'user',
        startTime: 0,
        endTime: 0,
        confidence: 0.5,
        isInterim: true,
      }
    }
    return { finalizedSegments, interimSegment }
  }

  // Format finalized segments
  finalizedSegments.push(
    ...transcript.segments.map(segment => ({
      id: segment.id,
      words: formatSegmentWords(segment),
      speaker: segment.speaker,
      startTime: segment.startTime * 1000, // Convert to milliseconds
      endTime: segment.endTime * 1000,
      confidence: segment.confidence,
      isInterim: false,
    }))
  )

  // Add interim segment if provided
  if (interimText) {
    interimSegment = {
      id: `interim_${Date.now()}`,
      words: parseWords(interimText).map(word => ({
        word,
        confidence: 0.5,
        isPunctuation: isPunctuation(word),
      })),
      speaker: transcript.segments.length > 0
        ? transcript.segments[transcript.segments.length - 1].speaker
        : 'user',
      startTime: 0,
      endTime: 0,
      confidence: 0.5,
      isInterim: true,
    }
  }

  return { finalizedSegments, interimSegment }
}

// ============================================================================
// TEXT EDITING
// ============================================================================

/**
 * Parse edited text back into words
 */
export function parseEditedText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Merge edits with original transcript
 */
export function mergeEditWithTranscript(
  segmentId: string,
  editedText: string,
  originalTranscript: JEPA_Transcript
): JEPA_Transcript {
  const segmentIndex = originalTranscript.segments.findIndex(s => s.id === segmentId)

  if (segmentIndex === -1) {
    return originalTranscript
  }

  const updatedSegments = [...originalTranscript.segments]
  updatedSegments[segmentIndex] = {
    ...updatedSegments[segmentIndex],
    text: editedText,
    metadata: {
      ...updatedSegments[segmentIndex].metadata,
      isEdited: true,
      editedAt: new Date().toISOString(),
    },
  }

  return {
    ...originalTranscript,
    segments: updatedSegments,
  }
}

/**
 * Check if transcript has been edited
 */
export function hasEdits(transcript: JEPA_Transcript): boolean {
  return transcript.segments.some(seg => seg.metadata?.isEdited === true)
}

// ============================================================================
// TIMESTAMP FORMATTING
// ============================================================================

/**
 * Format milliseconds to HH:MM:SS
 */
export function formatTimestamp(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Format milliseconds to duration string (e.g., "5:23")
 */
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Format milliseconds to compact duration (e.g., "5m 23s")
 */
export function formatCompactDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

/**
 * Detect if text contains CJK characters
 */
export function isCJKText(text: string): boolean {
  const cjkRegex = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/
  return cjkRegex.test(text)
}

/**
 * Detect if text is RTL (right-to-left)
 */
export function isRTLText(text: string): boolean {
  const rtlRegex = /[\u0591-\u07ff\ufb1d-\ufdff]/
  return rtlRegex.test(text)
}

/**
 * Get text direction from content
 */
export function getTextDirection(text: string): 'ltr' | 'rtl' {
  return isRTLText(text) ? 'rtl' : 'ltr'
}

// ============================================================================
// EXPORT HELPERS
// ============================================================================

/**
 * Calculate transcript statistics
 */
export function calculateTranscriptStats(transcript: JEPA_Transcript): {
  wordCount: number
  characterCount: number
  segmentCount: number
  duration: number
  averageConfidence: number
  lowConfidenceSegments: number
} {
  const wordCount = transcript.segments.reduce(
    (sum, seg) => sum + seg.text.split(/\s+/).length,
    0
  )

  const characterCount = transcript.segments.reduce(
    (sum, seg) => sum + seg.text.length,
    0
  )

  const totalConfidence = transcript.segments.reduce(
    (sum, seg) => sum + (seg.confidence ?? 1.0),
    0
  )

  const lowConfidenceSegments = transcript.segments.filter(
    seg => (seg.confidence ?? 1.0) < 0.7
  ).length

  return {
    wordCount,
    characterCount,
    segmentCount: transcript.segments.length,
    duration: transcript.duration,
    averageConfidence: totalConfidence / transcript.segments.length,
    lowConfidenceSegments,
  }
}

/**
 * Search transcript for text
 */
export function searchTranscript(
  transcript: JEPA_Transcript,
  query: string
): Array<{
  segment: JEPA_TranscriptSegment
  matches: Array<{ start: number; end: number; text: string }>
}> {
  if (!query.trim()) return []

  const results: Array<{
    segment: JEPA_TranscriptSegment
    matches: Array<{ start: number; end: number; text: string }>
  }> = []

  const regex = new RegExp(query, 'gi')

  transcript.segments.forEach(segment => {
    const matches: Array<{ start: number; end: number; text: string }> = []
    let match

    while ((match = regex.exec(segment.text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
      })
    }

    if (matches.length > 0) {
      results.push({ segment, matches })
    }
  })

  return results
}

/**
 * Get speaker breakdown from transcript
 */
export function getSpeakerBreakdown(
  transcript: JEPA_Transcript
): Map<SpeakerType, { segmentCount: number; wordCount: number; duration: number }> {
  const breakdown = new Map<
    SpeakerType,
    { segmentCount: number; wordCount: number; duration: number }
  >()

  transcript.segments.forEach(segment => {
    const current = breakdown.get(segment.speaker) || {
      segmentCount: 0,
      wordCount: 0,
      duration: 0,
    }

    breakdown.set(segment.speaker, {
      segmentCount: current.segmentCount + 1,
      wordCount: current.wordCount + segment.text.split(/\s+/).length,
      duration: current.duration + (segment.endTime - segment.startTime),
    })
  })

  return breakdown
}
