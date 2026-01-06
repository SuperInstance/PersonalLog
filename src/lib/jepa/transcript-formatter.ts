/**
 * JEPA Transcript Formatter
 *
 * Converts JEPA transcript data into formatted markdown with timestamps,
 * speaker labels, and proper formatting.
 */

import {
  JEPA_Transcript,
  JEPA_TranscriptSegment,
  MarkdownFormatOptions,
  FormattedTranscript,
  SpeakerType,
} from '@/types/jepa'

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_FORMAT_OPTIONS: MarkdownFormatOptions = {
  includeTimestamps: true,
  includeSpeakerNames: true,
  includeMetadata: true,
  includeAudioLinks: false,
  timestampFormat: 'hh:mm:ss',
  separator: 'line',
  includeConfidence: false,
}

// ============================================================================
// TIMESTAMP FORMATTING
// ============================================================================

/**
 * Format seconds into HH:MM:SS format
 */
export function formatTimestamp(seconds: number, format: 'hh:mm:ss' | 'hh:mm' | 'seconds' = 'hh:mm:ss'): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const pad = (num: number) => num.toString().padStart(2, '0')

  switch (format) {
    case 'hh:mm:ss':
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
    case 'hh:mm':
      return `${pad(hours)}:${pad(minutes)}`
    case 'seconds':
      return seconds.toFixed(1)
  }
}

/**
 * Format ISO date string into readable format
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================================================
// SPEAKER DISPLAY NAMES
// ============================================================================

/**
 * Get display name for a speaker
 */
export function getSpeakerDisplayName(speaker: SpeakerType): string {
  const speakerNames: Record<SpeakerType, string> = {
    'user': 'User',
    'assistant': 'Claude',
    'system': 'System',
    'unknown': 'Unknown',
  }

  // If it's a custom speaker ID from diarization, return it capitalized
  if (!speakerNames[speaker as SpeakerType]) {
    return speaker.charAt(0).toUpperCase() + speaker.slice(1)
  }

  return speakerNames[speaker as SpeakerType] || speaker
}

/**
 * Get color class for a speaker
 */
export function getSpeakerColor(speaker: SpeakerType): string {
  const colors: Record<SpeakerType, string> = {
    'user': 'text-blue-600 dark:text-blue-400',
    'assistant': 'text-purple-600 dark:text-purple-400',
    'system': 'text-gray-600 dark:text-gray-400',
    'unknown': 'text-gray-500 dark:text-gray-500',
  }

  return colors[speaker as SpeakerType] || 'text-gray-600 dark:text-gray-400'
}

// ============================================================================
// MARKDOWN GENERATION
// ============================================================================

/**
 * Convert a single segment to markdown format
 */
function segmentToMarkdown(
  segment: JEPA_TranscriptSegment,
  options: MarkdownFormatOptions
): string {
  const lines: string[] = []

  // Speaker header with timestamp
  if (options.includeSpeakerNames || options.includeTimestamps) {
    const speakerName = options.includeSpeakerNames
      ? getSpeakerDisplayName(segment.speaker)
      : ''

    const timestamp = options.includeTimestamps
      ? formatTimestamp(segment.startTime, options.timestampFormat)
      : ''

    // Format: ## [timestamp] Speaker
    const header = `## [${timestamp}] ${speakerName}`.trim()
    lines.push(header)
  }

  // Segment text
  lines.push(segment.text)

  // Optional confidence
  if (options.includeConfidence && segment.confidence !== undefined) {
    const confidencePercent = Math.round(segment.confidence * 100)
    lines.push(`_Confidence: ${confidencePercent}%_`)
  }

  // Separator
  if (options.separator === 'line') {
    lines.push('---')
  } else if (options.separator === 'dash') {
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Convert transcript metadata to markdown
 */
function metadataToMarkdown(transcript: JEPA_Transcript): string {
  const lines: string[] = []

  lines.push('# Transcript Metadata')
  lines.push('')
  lines.push(`- **Session ID:** ${transcript.sessionId}`)
  lines.push(`- **Date:** ${formatDate(transcript.startedAt)}`)
  lines.push(`- **Duration:** ${formatTimestamp(transcript.duration)}`)
  lines.push(`- **Language:** ${transcript.metadata.language}`)
  lines.push(`- **Speakers:** ${transcript.metadata.totalSpeakers}`)

  if (transcript.metadata.audioKept && transcript.metadata.audioUrl) {
    lines.push(`- **Audio:** [Download Audio](${transcript.metadata.audioUrl})`)
  }

  lines.push('')

  // Speaker breakdown
  if (transcript.metadata.speakers.length > 0) {
    lines.push('## Speakers')
    lines.push('')

    transcript.metadata.speakers.forEach(speaker => {
      const name = getSpeakerDisplayName(speaker.id)
      const time = formatTimestamp(speaker.speakingTime)
      lines.push(`- **${name}:** ${speaker.segmentCount} segments, ${time} speaking time`)
    })

    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Convert full transcript to markdown
 */
export function transcriptToMarkdown(
  transcript: JEPA_Transcript,
  options: Partial<MarkdownFormatOptions> = {}
): FormattedTranscript {
  const opts = { ...DEFAULT_FORMAT_OPTIONS, ...options }
  const lines: string[] = []

  // Title
  lines.push(`# Transcript - ${new Date(transcript.startedAt).toLocaleDateString()}`)
  lines.push('')

  // Metadata section
  if (opts.includeMetadata) {
    lines.push(metadataToMarkdown(transcript))
  }

  // Transcript segments
  lines.push('## Transcript')
  lines.push('')

  transcript.segments.forEach((segment, index) => {
    // Add separator between segments (except first)
    if (index > 0 && opts.separator !== 'none') {
      lines.push('')
    }

    lines.push(segmentToMarkdown(segment, opts))
  })

  // Calculate statistics
  const totalWords = transcript.segments.reduce(
    (sum, seg) => sum + seg.text.split(/\s+/).length,
    0
  )

  const totalCharacters = transcript.segments.reduce(
    (sum, seg) => sum + seg.text.length,
    0
  )

  const estimatedReadingTime = Math.ceil(totalWords / 200) // 200 words per minute

  const speakers = Array.from(
    new Set(transcript.segments.map(seg => seg.speaker))
  )

  return {
    markdown: lines.join('\n'),
    metadata: {
      totalSegments: transcript.segments.length,
      totalWords,
      totalCharacters: totalCharacters,
      estimatedReadingTime,
      speakers,
      dateRange: {
        start: transcript.startedAt,
        end: transcript.endedAt || transcript.startedAt,
      },
    },
  }
}

// ============================================================================
// PLAIN TEXT GENERATION
// ============================================================================

/**
 * Convert transcript to plain text (no markdown formatting)
 */
export function transcriptToPlainText(
  transcript: JEPA_Transcript,
  options: Partial<MarkdownFormatOptions> = {}
): string {
  const { markdown } = transcriptToMarkdown(transcript, options)

  // Remove markdown formatting
  return markdown
    .replace(/^#+\s/gm, '') // Remove headers
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '') // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/^---$/gm, '') // Remove separators
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
}

// ============================================================================
// EXPORT HELPERS
// ============================================================================

/**
 * Download transcript as a file
 */
export function downloadTranscript(
  transcript: JEPA_Transcript,
  format: 'markdown' | 'txt' | 'json',
  filename?: string
): void {
  let content: string
  let mimeType: string

  switch (format) {
    case 'markdown':
      const { markdown } = transcriptToMarkdown(transcript)
      content = markdown
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
    `transcript_${new Date(transcript.startedAt).toISOString().split('T')[0]}.${format}`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Copy transcript to clipboard
 */
export async function copyTranscriptToClipboard(
  transcript: JEPA_Transcript,
  format: 'markdown' | 'plain' = 'markdown'
): Promise<boolean> {
  try {
    const content =
      format === 'markdown'
        ? transcriptToMarkdown(transcript).markdown
        : transcriptToPlainText(transcript)

    await navigator.clipboard.writeText(content)
    return true
  } catch (error) {
    console.error('Failed to copy transcript to clipboard:', error)
    return false
  }
}
