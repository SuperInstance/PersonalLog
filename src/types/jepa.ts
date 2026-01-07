/**
 * JEPA (Joint Embedding Predictive Architecture) - Type Definitions
 *
 * Types for audio transcription, speaker identification, and transcript export.
 */

import { Message, MessageAuthor, TranscriptionSegment } from './conversation'

// ============================================================================
// JEPA TRANSCRIPT TYPES
// ============================================================================

export interface JEPA_Transcript {
  id: string
  conversationId: string
  sessionId: string
  startedAt: string
  endedAt?: string
  duration: number  // in seconds
  segments: JEPA_TranscriptSegment[]
  metadata: JEPA_TranscriptMetadata
}

export interface JEPA_TranscriptSegment {
  id: string
  speaker: SpeakerType
  text: string
  timestamp: string  // ISO timestamp
  startTime: number  // seconds from start
  endTime: number    // seconds from start
  confidence: number // 0-1
  metadata?: SegmentMetadata
}

export interface SegmentMetadata {
  isInterjection?: boolean
  emotionDetected?: EmotionType
  keywords?: string[]
  emotionConfidence?: number // 0-1
  secondaryEmotions?: EmotionType[]
  isEdited?: boolean
  editedAt?: string
}

/**
 * Comprehensive emotion type for text-based emotion detection
 */
export type EmotionType =
  | 'happy'
  | 'excited'
  | 'joyful'
  | 'content'
  | 'calm'
  | 'grateful'
  | 'proud'
  | 'relieved'
  | 'curious'
  | 'surprised'
  | 'confused'
  | 'sad'
  | 'disappointed'
  | 'worried'
  | 'angry'
  | 'frustrated'
  | 'irritated'
  | 'neutral'

export interface JEPA_TranscriptMetadata {
  totalSpeakers: number
  speakers: SpeakerInfo[]
  language: string
  audioQuality: 'excellent' | 'good' | 'fair' | 'poor'
  audioKept: boolean
  audioUrl?: string
  processingTime: number  // milliseconds
}

export interface SpeakerInfo {
  id: SpeakerType
  name: string
  color?: string
  segmentCount: number
  speakingTime: number  // total seconds
}

// ============================================================================
// SPEAKER IDENTIFICATION TYPES
// ============================================================================

export type SpeakerType =
  | 'user'
  | 'assistant'
  | 'system'
  | 'unknown'
  | string  // For detected speaker IDs from diarization

export interface SpeakerDetectionResult {
  speaker: SpeakerType
  confidence: number
  reason: string
}

export interface SpeakerOverride {
  segmentId: string
  originalSpeaker: SpeakerType
  newSpeaker: SpeakerType
  reason: string
  timestamp: string
}

// ============================================================================
// MARKDOWN FORMATTING TYPES
// ============================================================================

export interface MarkdownFormatOptions {
  includeTimestamps: boolean
  includeSpeakerNames: boolean
  includeMetadata: boolean
  includeAudioLinks: boolean
  timestampFormat: 'hh:mm:ss' | 'hh:mm' | 'seconds'
  separator: 'line' | 'dash' | 'none'
  includeConfidence: boolean
}

export interface FormattedTranscript {
  markdown: string
  metadata: FormatMetadata
}

export interface FormatMetadata {
  totalSegments: number
  totalWords: number
  totalCharacters: number
  estimatedReadingTime: number  // minutes
  speakers: SpeakerType[]
  dateRange: {
    start: string
    end: string
  }
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type ExportFormat = 'markdown' | 'txt' | 'json' | 'srt'

export interface ExportOptions {
  format: ExportFormat
  filename?: string
  includeMetadata: boolean
  includeTimestamps: boolean
  timestampFormat?: 'hh:mm:ss' | 'hh:mm' | 'seconds'
}

export interface ExportResult {
  success: boolean
  format: ExportFormat
  data: string | Blob
  filename: string
  size: number  // bytes
  error?: string
}

// ============================================================================
// SUBTITLES/CAPTIONS TYPES (Future)
// ============================================================================

export interface SubtitleEntry {
  index: number
  startTime: string  // HH:MM:SS,mmm
  endTime: string    // HH:MM:SS,mmm
  text: string
}

export interface SRTFormat {
  entries: SubtitleEntry[]
}

// ============================================================================
// JEPA SESSION TYPES
// ============================================================================

export interface JEPASession {
  id: string
  conversationId: string
  startedAt: string
  status: 'recording' | 'processing' | 'completed' | 'failed'
  duration?: number
  transcript?: JEPA_Transcript
  error?: string
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type SpeakerMap = Map<SpeakerType, SpeakerInfo>

export interface TranscriptStatistics {
  messageCount: number
  wordCount: number
  characterCount: number
  speakerBreakdown: Map<SpeakerType, {
    messageCount: number
    wordCount: number
    speakingTime: number
  }>
  averageSegmentLength: number
  longestSegment: {
    text: string
    duration: number
    speaker: SpeakerType
  }
}
