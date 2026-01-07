/**
 * JEPA Transcript Timeline
 *
 * Visual timeline representation of transcript segments with confidence visualization.
 * Supports clicking to seek audio, speaker segmentation, and interactive editing.
 *
 * @components/jepa/TranscriptTimeline
 */

'use client'

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { JEPA_Transcript, JEPA_TranscriptSegment, SpeakerType } from '@/types/jepa'
import { getConfidenceColorClasses, formatTimestamp } from '@/lib/jepa/transcript-formatter'
import { getSpeakerDisplayName, getSpeakerColor } from '@/lib/jepa/transcript-formatter'
import { Play, Pause, Scissors, Edit3, Save, X } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export interface TranscriptTimelineProps {
  /**
   * Transcript to display
   */
  transcript: JEPA_Transcript | null

  /**
   * Current playback position in milliseconds
   */
  currentTime?: number

  /**
   * Total duration in milliseconds
   */
  totalDuration?: number

  /**
   * Whether to show confidence visualization
   */
  showConfidence?: boolean

  /**
   * Whether to show speaker segments
   */
  showSpeakers?: boolean

  /**
   * Whether to enable seeking by clicking timeline
   */
  enableSeek?: boolean

  /**
   * Callback when timeline is clicked to seek
   */
  onSeek?: (time: number) => void

  /**
   * Callback when segment is clicked
   */
  onSegmentClick?: (segment: JEPA_TranscriptSegment) => void

  /**
   * Callback when transcript is edited
   */
  onTranscriptEdit?: (editedTranscript: JEPA_Transcript) => void

  /**
   * Height of timeline in pixels
   */
  height?: number

  /**
   * Additional CSS classes
   */
  className?: string
}

interface TimelineSegment {
  id: string
  segment: JEPA_TranscriptSegment
  x: number // percentage
  width: number // percentage
  speaker: SpeakerType
  confidence: number
}

interface EditingState {
  isEditing: boolean
  segmentId: string | null
  splitPosition: number | null // milliseconds
}

// ============================================================================
// TIMELINE SEGMENT COMPONENT
// ============================================================================

interface TimelineSegmentBarProps {
  segment: TimelineSegment
  isSelected: boolean
  showConfidence: boolean
  onClick: () => void
}

function TimelineSegmentBar({
  segment,
  isSelected,
  showConfidence,
  onClick,
}: TimelineSegmentBarProps) {
  const colors = getConfidenceColorClasses(segment.confidence)
  const speakerColor = getSpeakerColor(segment.speaker)

  const barStyle = {
    left: `${segment.x}%`,
    width: `${segment.width}%`,
  }

  return (
    <div
      className={`
        absolute top-0 bottom-0 cursor-pointer transition-all duration-200
        hover:opacity-80 group
        ${isSelected ? 'ring-2 ring-blue-500 z-10' : 'z-0'}
      `}
      style={barStyle}
      onClick={onClick}
      title={`
        ${getSpeakerDisplayName(segment.speaker)}: ${segment.segment.text.substring(0, 50)}...
        Time: ${formatTimestamp(segment.segment.startTime * 1000)}
        Confidence: ${Math.round(segment.confidence * 100)}%
      `}
    >
      {/* Main segment bar */}
      <div
        className={`
          h-full rounded-sm transition-all
          ${showConfidence ? colors.bg.replace('bg-', 'bg-').replace('/30', '/50') : speakerColor}
          ${isSelected ? 'opacity-100' : 'opacity-60'}
        `}
      />

      {/* Confidence overlay (if showing confidence) */}
      {showConfidence && segment.confidence < 0.7 && (
        <div className="absolute inset-0 bg-red-500/20 animate-pulse" />
      )}

      {/* Hover effect */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors rounded-sm" />
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TranscriptTimeline({
  transcript,
  currentTime = 0,
  totalDuration = 0,
  showConfidence = true,
  showSpeakers = true,
  enableSeek = true,
  onSeek,
  onSegmentClick,
  onTranscriptEdit,
  height = 120,
  className = '',
}: TranscriptTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const [hoverPosition, setHoverPosition] = useState<number | null>(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [editingState, setEditingState] = useState<EditingState>({
    isEditing: false,
    segmentId: null,
    splitPosition: null,
  })

  // Calculate timeline segments
  const timelineSegments = useMemo(() => {
    if (!transcript || transcript.segments.length === 0) return []

    const duration = totalDuration || transcript.duration * 1000
    const segments: TimelineSegment[] = []

    transcript.segments.forEach(seg => {
      const startMs = seg.startTime * 1000
      const endMs = seg.endTime * 1000
      const x = (startMs / duration) * 100
      const width = ((endMs - startMs) / duration) * 100

      segments.push({
        id: seg.id,
        segment: seg,
        x,
        width,
        speaker: seg.speaker,
        confidence: seg.confidence ?? 1.0,
      })
    })

    return segments
  }, [transcript, totalDuration])

  // Calculate current playhead position
  const playheadPosition = useMemo(() => {
    if (!transcript || totalDuration === 0) return 0
    return (currentTime / totalDuration) * 100
  }, [currentTime, totalDuration, transcript])

  // Handle timeline click for seeking
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableSeek || !timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const time = percentage * totalDuration

    onSeek?.(time)
  }, [enableSeek, onSeek, totalDuration])

  // Handle mouse move for hover position
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const time = percentage * totalDuration

    setHoverPosition(time)
  }, [totalDuration])

  const handleMouseLeave = useCallback(() => {
    setHoverPosition(null)
  }, [])

  // Handle segment click
  const handleSegmentClick = useCallback((segment: JEPA_TranscriptSegment) => {
    setSelectedSegmentId(segment.id)
    onSegmentClick?.(segment)
  }, [onSegmentClick])

  // Get speakers for legend
  const speakers = useMemo(() => {
    if (!transcript) return []

    const speakerSet = new Set<SpeakerType>()
    transcript.segments.forEach(seg => speakerSet.add(seg.speaker))

    return Array.from(speakerSet).map(speaker => ({
      id: speaker,
      name: getSpeakerDisplayName(speaker),
      color: getSpeakerColor(speaker),
    }))
  }, [transcript])

  // Calculate stats
  const stats = useMemo(() => {
    if (!transcript) return null

    const totalSegments = transcript.segments.length
    const lowConfidenceSegments = transcript.segments.filter(
      seg => (seg.confidence ?? 1.0) < 0.7
    ).length
    const avgConfidence = transcript.segments.reduce(
      (sum, seg) => sum + (seg.confidence ?? 1.0),
      0
    ) / totalSegments

    return {
      totalSegments,
      lowConfidenceSegments,
      avgConfidence: Math.round(avgConfidence * 100),
    }
  }, [transcript])

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header with stats */}
      {stats && (
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <span>{stats.totalSegments} segments</span>
            {showConfidence && stats.lowConfidenceSegments > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {stats.lowConfidenceSegments} low confidence
              </span>
            )}
            {showConfidence && (
              <span>Avg: {stats.avgConfidence}%</span>
            )}
          </div>

          {/* Speaker legend */}
          {showSpeakers && speakers.length > 1 && (
            <div className="flex items-center gap-2">
              {speakers.map(speaker => (
                <div
                  key={speaker.id}
                  className="flex items-center gap-1 text-xs"
                >
                  <div
                    className={`w-2 h-2 rounded ${speaker.color.replace('text-', 'bg-')}`}
                  />
                  <span className="text-slate-600 dark:text-slate-400">
                    {speaker.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Timeline container */}
        <div
          ref={timelineRef}
          className={`
            relative w-full rounded-lg overflow-hidden cursor-pointer
            bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
          `}
          style={{ height: `${height}px` }}
          onClick={handleTimelineClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          role="slider"
          aria-label="Transcript timeline"
          aria-valuemin={0}
          aria-valuemax={totalDuration}
          aria-valuenow={currentTime}
          aria-valuetext={formatTimestamp(currentTime)}
        >
          {/* Background grid */}
          <div className="absolute inset-0 grid grid-cols-10 gap-px">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-200/50 dark:bg-slate-700/50 h-full"
              />
            ))}
          </div>

          {/* Segment bars */}
          {timelineSegments.map(segment => (
            <TimelineSegmentBar
              key={segment.id}
              segment={segment}
              isSelected={selectedSegmentId === segment.id}
              showConfidence={showConfidence}
              onClick={() => handleSegmentClick(segment.segment)}
            />
          ))}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20 pointer-events-none"
            style={{ left: `${playheadPosition}%` }}
          >
            {/* Playhead knob */}
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full shadow-lg" />
          </div>

          {/* Hover indicator */}
          {hoverPosition !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500 z-15 pointer-events-none"
              style={{ left: `${(hoverPosition / totalDuration) * 100}%` }}
            />
          )}
        </div>

        {/* Time labels */}
        <div className="flex justify-between mt-1 px-1">
          <span className="text-xs text-slate-500 dark:text-slate-500 font-mono">
            {formatTimestamp(0)}
          </span>
          {totalDuration > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-500 font-mono">
              {formatTimestamp(totalDuration)}
            </span>
          )}
        </div>

        {/* Hover tooltip */}
        {hoverPosition !== null && (
          <div
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs rounded whitespace-nowrap z-30 pointer-events-none"
          >
            {formatTimestamp(hoverPosition)}
          </div>
        )}
      </div>

      {/* Selected segment info */}
      {selectedSegmentId && transcript && (
        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
          {(() => {
            const segment = transcript.segments.find(s => s.id === selectedSegmentId)
            if (!segment) return null

            const colors = getConfidenceColorClasses(segment.confidence ?? 1.0)

            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${getSpeakerColor(segment.speaker)}`}>
                      {getSpeakerDisplayName(segment.speaker)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-500 font-mono">
                      {formatTimestamp(segment.startTime * 1000)} - {formatTimestamp(segment.endTime * 1000)}
                    </span>
                  </div>

                  {showConfidence && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${colors.bg} ${colors.text}`}>
                      {Math.round((segment.confidence ?? 1.0) * 100)}% confidence
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {segment.text}
                </p>
              </div>
            )
          })()}
        </div>
      )}

      {/* Empty state */}
      {!transcript || timelineSegments.length === 0 ? (
        <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-600">
          <p className="text-sm">No transcript segments to display</p>
        </div>
      ) : null}
    </div>
  )
}
