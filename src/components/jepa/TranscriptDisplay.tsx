/**
 * JEPA Transcript Display Component
 *
 * Renders transcript segments with timestamps, speakers, and markdown formatting.
 * Supports auto-scroll during recording and manual scrolling.
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { JEPA_Transcript, JEPA_TranscriptSegment, SpeakerType } from '@/types/jepa'
import { Timestamp } from './Timestamp'
import { getSpeakerDisplayName, getSpeakerColor } from '@/lib/jepa/transcript-formatter'
import { User, Bot, AlertCircle } from 'lucide-react'

export interface TranscriptDisplayProps {
  /**
   * The transcript to display
   */
  transcript: JEPA_Transcript | null

  /**
   * Whether currently recording (for auto-scroll)
   */
  isRecording?: boolean

  /**
   * Whether to auto-scroll to latest segment
   */
  autoScroll?: boolean

  /**
   * Currently highlighted segment ID
   */
  highlightedSegmentId?: string | null

  /**
   * Callback when a segment is clicked
   */
  onSegmentClick?: (segment: JEPA_TranscriptSegment) => void

  /**
   * Callback when timestamp is clicked
   */
  onTimestampClick?: (seconds: number) => void

  /**
   * Additional CSS classes
   */
  className?: string
}

export function TranscriptDisplay({
  transcript,
  isRecording = false,
  autoScroll = true,
  highlightedSegmentId = null,
  onSegmentClick,
  onTimestampClick,
  className = '',
}: TranscriptDisplayProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [userScrolled, setUserScrolled] = useState(false)

  // Auto-scroll to bottom when new segments arrive during recording
  useEffect(() => {
    if (
      autoScroll &&
      isRecording &&
      !userScrolled &&
      scrollContainerRef.current &&
      transcript?.segments.length
    ) {
      const scrollElement = scrollContainerRef.current
      scrollElement.scrollTop = scrollElement.scrollHeight
    }
  }, [transcript?.segments.length, isRecording, autoScroll, userScrolled])

  // Detect manual scrolling
  const handleScroll = () => {
    if (!scrollContainerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100

    // If user scrolled up from bottom, disable auto-scroll
    if (!isAtBottom && transcript?.segments.length) {
      setUserScrolled(true)
    } else if (isAtBottom) {
      setUserScrolled(false)
    }
  }

  // Get speaker icon
  const getSpeakerIcon = (speaker: SpeakerType) => {
    switch (speaker) {
      case 'user':
        return <User className="w-4 h-4" />
      case 'assistant':
        return <Bot className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  // Render empty state
  if (!transcript || transcript.segments.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 ${className}`}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
              No transcript yet
            </p>
            <p className="text-sm">
              {isRecording
                ? 'Start speaking to see your transcript here...'
                : 'Record audio to generate a transcript'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className={`flex flex-col h-full overflow-y-auto ${className}`}
      aria-live="polite"
      aria-label="Transcript content"
    >
      <div className="flex-1 space-y-4 p-6">
        {/* Transcript Header */}
        <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Transcript
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {new Date(transcript.startedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-500">
            <span>{transcript.segments.length} segments</span>
            <span>•</span>
            <span>{transcript.metadata.language}</span>
            {isRecording && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1.5 text-red-500">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Recording...
                </span>
              </>
            )}
          </div>
        </div>

        {/* Transcript Segments */}
        <div className="space-y-6">
          {transcript.segments.map((segment, index) => {
            const isHighlighted = segment.id === highlightedSegmentId
            const speakerName = getSpeakerDisplayName(segment.speaker)
            const speakerColor = getSpeakerColor(segment.speaker)

            return (
              <div
                key={segment.id}
                className={`
                  group relative -mx-2 px-2 py-3 rounded-lg transition-all duration-200
                  ${isHighlighted
                    ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 dark:ring-blue-400'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }
                  ${onSegmentClick ? 'cursor-pointer' : ''}
                `}
                onClick={() => onSegmentClick?.(segment)}
                role="article"
                aria-label={`${speakerName} at ${formatTime(segment.startTime)}`}
              >
                {/* Segment Header */}
                <div className="flex items-center gap-2 mb-2">
                  {/* Speaker Icon */}
                  <div className={`flex items-center gap-1.5 ${speakerColor}`}>
                    {getSpeakerIcon(segment.speaker)}
                    <span className="text-sm font-semibold">
                      {speakerName}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <Timestamp
                    seconds={segment.startTime}
                    showIcon={false}
                    onClick={() => onTimestampClick?.(segment.startTime)}
                    className="text-xs"
                  />

                  {/* Confidence Score (if available) */}
                  {segment.confidence !== undefined && segment.confidence < 0.8 && (
                    <span
                      className="text-xs text-amber-600 dark:text-amber-400"
                      title={`Confidence: ${Math.round(segment.confidence * 100)}%`}
                    >
                      ⚠️ {Math.round(segment.confidence * 100)}%
                    </span>
                  )}
                </div>

                {/* Segment Text */}
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {segment.text}
                </p>

                {/* Segment Metadata */}
                {segment.metadata && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {segment.metadata.isInterjection && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                        Interjection
                      </span>
                    )}
                    {segment.metadata.emotionDetected && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        {segment.metadata.emotionDetected}
                      </span>
                    )}
                  </div>
                )}

                {/* Segment Index (for debugging) */}
                {process.env.NODE_ENV === 'development' && (
                  <span className="absolute top-0 right-0 text-[10px] text-slate-400 dark:text-slate-600">
                    #{index + 1}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Auto-scroll Indicator */}
        {userScrolled && isRecording && (
          <button
            onClick={() => {
              setUserScrolled(false)
              scrollContainerRef.current?.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: 'smooth',
              })
            }}
            className="fixed bottom-8 right-8 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium animate-bounce"
            aria-label="Scroll to latest"
          >
            <span>↓</span>
            <span>New segments below</span>
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Format time in seconds to readable string
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
