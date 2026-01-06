/**
 * JEPA Transcript Segment with Language Support
 *
 * Displays individual transcript segments with language detection,
 * speaker labels, timestamps, and confidence scores.
 * Supports RTL languages and proper text direction.
 *
 * @components/jepa/TranscriptSegment
 */

'use client'

import { useState } from 'react'
import { getLanguage, type LanguageDetectionResult } from '@/lib/jepa/languages'
import type { EmotionAnalysis } from '@/lib/agents/jepa-agent'
import { EmotionIndicator } from '@/components/agents/jepa/EmotionIndicator'

// ============================================================================
// TYPES
// ============================================================================

export interface TranscriptSegmentData {
  id: string
  text: string
  startTime: number // milliseconds
  endTime: number // milliseconds
  confidence: number // 0-1
  speaker?: string
  language?: string
  emotion?: EmotionAnalysis
}

interface TranscriptSegmentProps {
  segment: TranscriptSegmentData
  languageDetection?: LanguageDetectionResult
  onLanguageOverride?: (segmentId: string, languageCode: string) => void
  showEmotion?: boolean
  className?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format timestamp in MM:SS format
 */
function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Format duration
 */
function formatDuration(startTime: number, endTime: number): string {
  const duration = endTime - startTime
  return formatTime(duration)
}

/**
 * Get confidence color
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return '#10b981' // green-500
  if (confidence >= 0.7) return '#f59e0b' // amber-500
  return '#ef4444' // red-500
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TranscriptSegment({
  segment,
  languageDetection,
  onLanguageOverride,
  showEmotion = true,
  className = '',
}: TranscriptSegmentProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Get language info
  const languageCode = segment.language || languageDetection?.language || 'en'
  const language = getLanguage(languageCode)
  const isRTL = language?.rtl ?? false

  // Format data
  const startTime = formatTime(segment.startTime)
  const duration = formatDuration(segment.startTime, segment.endTime)
  const confidencePercent = Math.round(segment.confidence * 100)
  const confidenceColor = getConfidenceColor(segment.confidence)

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value
    onLanguageOverride?.(segment.id, newLanguage)
  }

  return (
    <div
      className={`transcript-segment ${isRTL ? 'rtl' : 'ltr'} ${isExpanded ? 'expanded' : ''} ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header: timestamp, speaker, language */}
      <div className="segment-header">
        <div className="segment-time">
          <span className="timestamp" title={`Start time: ${startTime}`}>
            {startTime}
          </span>
          <span className="duration" title={`Duration: ${duration}`}>
            ({duration})
          </span>
        </div>

        {segment.speaker && (
          <span className="segment-speaker" title="Speaker">
            {segment.speaker}
          </span>
        )}

        {language && (
          <div className="segment-language">
            <span className="language-flag" role="img" aria-label={language.name}>
              {language.flag}
            </span>
            <span className="language-code">{language.code}</span>

            {onLanguageOverride && (
              <select
                className="language-override"
                value={languageCode}
                onChange={handleLanguageChange}
                aria-label={`Change language for segment`}
                title="Override detected language"
              >
                <option value="en">🇺🇸 English</option>
                <option value="es">🇪🇸 Spanish</option>
                <option value="zh">🇨🇳 Chinese</option>
                <option value="ja">🇯🇵 Japanese</option>
                <option value="fr">🇫🇷 French</option>
                <option value="de">🇩🇪 German</option>
                <option value="it">🇮🇹 Italian</option>
                <option value="pt">🇵🇹 Portuguese</option>
                <option value="ko">🇰🇷 Korean</option>
                <option value="hi">🇮🇳 Hindi</option>
                <option value="ru">🇷🇺 Russian</option>
                <option value="ar">🇸🇦 Arabic</option>
              </select>
            )}
          </div>
        )}

        <div className="segment-confidence" title={`Confidence: ${confidencePercent}%`}>
          <div
            className="confidence-dot"
            style={{ backgroundColor: confidenceColor }}
            role="presentation"
          />
          <span className="confidence-text">{confidencePercent}%</span>
        </div>

        <button
          className="expand-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? 'Show less' : 'Show more'}
          aria-expanded={isExpanded}
          type="button"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Main text content */}
      <div className="segment-content">
        <p className="segment-text" lang={languageCode} dir={isRTL ? 'rtl' : 'ltr'}>
          {segment.text}
        </p>

        {/* Emotion analysis */}
        {showEmotion && segment.emotion && isExpanded && (
          <div className="segment-emotion">
            <EmotionIndicator emotion={segment.emotion} compact />
          </div>
        )}
      </div>

      {/* Metadata (shown when expanded) */}
      {isExpanded && (
        <div className="segment-metadata">
          <div className="metadata-item">
            <span className="metadata-label">Segment ID:</span>
            <span className="metadata-value">{segment.id}</span>
          </div>

          <div className="metadata-item">
            <span className="metadata-label">Start:</span>
            <span className="metadata-value">{segment.startTime}ms</span>
          </div>

          <div className="metadata-item">
            <span className="metadata-label">End:</span>
            <span className="metadata-value">{segment.endTime}ms</span>
          </div>

          <div className="metadata-item">
            <span className="metadata-label">Language:</span>
            <span className="metadata-value">
              {language?.flag} {language?.name} ({languageCode})
            </span>
          </div>

          {segment.emotion && (
            <>
              <div className="metadata-item">
                <span className="metadata-label">Valence:</span>
                <span className="metadata-value">{segment.emotion.valence.toFixed(2)}</span>
              </div>

              <div className="metadata-item">
                <span className="metadata-label">Arousal:</span>
                <span className="metadata-value">{segment.emotion.arousal.toFixed(2)}</span>
              </div>

              <div className="metadata-item">
                <span className="metadata-label">Dominance:</span>
                <span className="metadata-value">{segment.emotion.dominance.toFixed(2)}</span>
              </div>

              <div className="metadata-item">
                <span className="metadata-label">Emotions:</span>
                <span className="metadata-value">{segment.emotion.emotions.join(', ')}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// SEGMENT LIST COMPONENT
// ============================================================================

interface TranscriptSegmentListProps {
  segments: TranscriptSegmentData[]
  languageDetections?: Map<string, LanguageDetectionResult>
  onLanguageOverride?: (segmentId: string, languageCode: string) => void
  showEmotion?: boolean
  className?: string
}

export function TranscriptSegmentList({
  segments,
  languageDetections,
  onLanguageOverride,
  showEmotion = true,
  className = '',
}: TranscriptSegmentListProps) {
  if (segments.length === 0) {
    return (
      <div className={`transcript-segment-list empty ${className}`}>
        <p className="empty-message">No transcript segments available</p>
      </div>
    )
  }

  return (
    <div className={`transcript-segment-list ${className}`}>
      {segments.map(segment => (
        <TranscriptSegment
          key={segment.id}
          segment={segment}
          languageDetection={languageDetections?.get(segment.id)}
          onLanguageOverride={onLanguageOverride}
          showEmotion={showEmotion}
        />
      ))}
    </div>
  )
}

// ============================================================================
// STYLES (to be moved to CSS module)
// ============================================================================

export const transcriptSegmentStyles = `
.transcript-segment {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: var(--color-background, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.transcript-segment:hover {
  border-color: var(--color-primary, #3b82f6);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.transcript-segment.rtl {
  text-align: right;
}

.segment-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.segment-time {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
}

.timestamp {
  font-weight: 600;
}

.duration {
  color: var(--color-text-tertiary, #9ca3af);
}

.segment-speaker {
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--color-primary-light, #dbeafe);
  color: var(--color-primary, #3b82f6);
  border-radius: 0.25rem;
}

.segment-language {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.125rem 0.5rem;
  background: var(--color-background-secondary, #f3f4f6);
  border-radius: 0.25rem;
}

.language-flag {
  font-size: 1rem;
  line-height: 1;
}

.language-code {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
}

.language-override {
  padding: 0.125rem 0.25rem;
  font-size: 0.75rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.25rem;
  background: var(--color-background, #ffffff);
  color: var(--color-text-primary, #111827);
  cursor: pointer;
}

.language-override:hover {
  border-color: var(--color-primary, #3b82f6);
}

.segment-confidence {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-left: auto;
}

.confidence-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}

.confidence-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
}

.expand-toggle {
  padding: 0.25rem 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
  background: transparent;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.expand-toggle:hover {
  background: var(--color-background-secondary, #f3f4f6);
  color: var(--color-text-primary, #111827);
}

.segment-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.segment-text {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text-primary, #111827);
}

.segment-emotion {
  display: flex;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.segment-metadata {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--color-background-secondary, #f3f4f6);
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.metadata-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.metadata-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
}

.metadata-value {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
  color: var(--color-text-primary, #111827);
}

.transcript-segment-list {
  display: flex;
  flex-direction: column;
}

.transcript-segment-list.empty {
  padding: 2rem;
  text-align: center;
}

.empty-message {
  margin: 0;
  color: var(--color-text-secondary, #6b7280);
  font-style: italic;
}
`
