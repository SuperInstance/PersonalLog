/**
 * JEPA Real-time Transcription Display
 *
 * Displays streaming speech-to-text results with confidence visualization,
 * interim results (gray text), and smooth animations. Supports inline editing
 * and multi-language display with RTL support.
 *
 * @components/jepa/RealtimeTranscription
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { JEPA_Transcript, SpeakerType } from '@/types/jepa'
import {
  formatTranscriptForDisplay,
  formatConfidence,
  getConfidenceColorClasses,
  formatTimestamp,
  getTextDirection,
  mergeEditWithTranscript,
  isCJKText,
} from '@/lib/jepa/transcript-formatter'
import { getSpeakerDisplayName } from '@/lib/jepa/transcript-formatter'
import { User, Bot, AlertCircle, Edit3, Check, X } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export interface RealtimeTranscriptionProps {
  /**
   * Current transcript with finalized segments
   */
  transcript: JEPA_Transcript | null

  /**
   * Interim/transient text from streaming STT (not yet finalized)
   */
  interimText?: string

  /**
   * Whether currently recording
   */
  isRecording?: boolean

  /**
   * Whether to show confidence scores
   */
  showConfidence?: boolean

  /**
   * Whether to enable inline editing
   */
  enableEditing?: boolean

  /**
   * Whether to auto-scroll to latest segment
   */
  autoScroll?: boolean

  /**
   * Callback when segment is clicked
   */
  onSegmentClick?: (segmentId: string, startTime: number) => void

  /**
   * Callback when transcript is edited
   */
  onTranscriptEdit?: (editedTranscript: JEPA_Transcript) => void

  /**
   * Additional CSS classes
   */
  className?: string
}

interface EditingState {
  segmentId: string | null
  originalText: string
  editedText: string
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Word-level confidence display
 */
interface WordDisplayProps {
  word: string
  confidence: number
  isInterim?: boolean
  showConfidence?: boolean
}

function WordDisplay({ word, confidence, isInterim = false, showConfidence = false }: WordDisplayProps) {
  const colors = getConfidenceColorClasses(confidence)

  return (
    <span
      className={`
        inline transition-all duration-200
        ${isInterim ? 'text-slate-400 dark:text-slate-600' : colors.text}
        ${showConfidence && confidence < 0.7 ? 'underline decoration-dotted decoration-2 underline-offset-2' : ''}
      `}
      title={showConfidence ? `${formatConfidence(confidence)} confidence` : undefined}
    >
      {word}
    </span>
  )
}

/**
 * Individual segment with editing support
 */
interface SegmentDisplayProps {
  id: string
  speaker: SpeakerType
  text: string
  startTime: number // milliseconds
  endTime: number // milliseconds
  confidence: number
  isInterim?: boolean
  isEditing?: boolean
  showConfidence?: boolean
  textDirection?: 'ltr' | 'rtl'
  onClick?: () => void
  onEditStart?: () => void
  onEditSave?: (editedText: string) => void
  onEditCancel?: () => void
}

function SegmentDisplay({
  id,
  speaker,
  text,
  startTime,
  endTime,
  confidence,
  isInterim = false,
  isEditing = false,
  showConfidence = false,
  textDirection = 'ltr',
  onClick,
  onEditStart,
  onEditSave,
  onEditCancel,
}: SegmentDisplayProps) {
  const [editText, setEditText] = useState(text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const speakerName = getSpeakerDisplayName(speaker)
  const colors = getConfidenceColorClasses(confidence)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    onEditSave?.(editText)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      onEditCancel?.()
    }
  }

  const getSpeakerIcon = () => {
    switch (speaker) {
      case 'user':
        return <User className="w-4 h-4" />
      case 'assistant':
        return <Bot className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  return (
    <div
      className={`
        group relative -mx-2 px-3 py-2.5 rounded-lg transition-all duration-200
        ${isInterim
          ? 'bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }
        ${onClick && !isEditing ? 'cursor-pointer' : ''}
      `}
      onClick={!isEditing ? onClick : undefined}
      dir={textDirection}
    >
      {/* Segment Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
          {getSpeakerIcon()}
          <span>{speakerName}</span>
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-500 font-mono">
          {formatTimestamp(startTime)}
        </span>

        {showConfidence && !isInterim && confidence < 0.9 && (
          <span
            className={`
              text-xs font-semibold px-1.5 py-0.5 rounded
              ${colors.bg} ${colors.text}
            `}
            title={`Confidence: ${formatConfidence(confidence)}`}
          >
            {formatConfidence(confidence)}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isEditing && onEditStart && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEditStart()
              }}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
              title="Edit segment"
              type="button"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Segment Text */}
      {isEditing ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-2 text-sm bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={Math.min(5, text.split('\n').length)}
            dir={textDirection}
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center gap-1"
              type="button"
            >
              <Check className="w-3.5 h-3.5" />
              Save
            </button>
            <button
              onClick={onEditCancel}
              className="px-3 py-1 text-sm bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded flex items-center gap-1"
              type="button"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p
          className={`
            text-sm leading-relaxed
            ${isInterim ? 'text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}
            ${isCJKText(text) ? 'font-normal' : ''}
          `}
        >
          {text}
        </p>
      )}

      {/* Confidence indicator for low confidence segments */}
      {showConfidence && !isInterim && confidence < 0.7 && !isEditing && (
        <div className={`mt-2 text-xs ${colors.text} flex items-center gap-1`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span>Low confidence - may need review</span>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RealtimeTranscription({
  transcript,
  interimText = '',
  isRecording = false,
  showConfidence = true,
  enableEditing = true,
  autoScroll = true,
  onSegmentClick,
  onTranscriptEdit,
  className = '',
}: RealtimeTranscriptionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const [userScrolled, setUserScrolled] = useState(false)
  const [editingState, setEditingState] = useState<EditingState>({
    segmentId: null,
    originalText: '',
    editedText: '',
  })

  // Format transcript for display
  const { finalizedSegments, interimSegment } = formatTranscriptForDisplay(transcript, interimText)

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (autoScroll && !userScrolled && endRef.current) {
      // Use optional chaining for test environments
      endRef.current.scrollIntoView?.({ behavior: 'smooth' })
    }
  }, [finalizedSegments.length, interimText, autoScroll, userScrolled])

  // Detect manual scrolling
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100

    if (!isAtBottom && finalizedSegments.length > 0) {
      setUserScrolled(true)
    } else if (isAtBottom) {
      setUserScrolled(false)
    }
  }, [finalizedSegments.length])

  // Start editing segment
  const handleEditStart = useCallback((segmentId: string, originalText: string) => {
    setEditingState({
      segmentId,
      originalText,
      editedText: originalText,
    })
  }, [])

  // Save edit
  const handleEditSave = useCallback((editedText: string) => {
    if (!transcript || !editingState.segmentId) return

    const editedTranscript = mergeEditWithTranscript(
      editingState.segmentId,
      editedText,
      transcript
    )

    onTranscriptEdit?.(editedTranscript)

    setEditingState({
      segmentId: null,
      originalText: '',
      editedText: '',
    })
  }, [transcript, editingState.segmentId, onTranscriptEdit])

  // Cancel edit
  const handleEditCancel = useCallback(() => {
    setEditingState({
      segmentId: null,
      originalText: '',
      editedText: '',
    })
  }, [])

  // Handle segment click
  const handleSegmentClick = useCallback((segmentId: string, startTime: number) => {
    onSegmentClick?.(segmentId, startTime)
  }, [onSegmentClick])

  // Scroll to bottom button
  const scrollToBottom = useCallback(() => {
    setUserScrolled(false)
    endRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [])

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Scrollable content area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-4"
        aria-live="polite"
        aria-label="Real-time transcription"
      >
        {/* Empty state */}
        {finalizedSegments.length === 0 && !interimText && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Bot className="w-8 h-8" />
              </div>
              <div>
                <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
                  {isRecording ? 'Listening...' : 'No transcript yet'}
                </p>
                <p className="text-sm mt-1">
                  {isRecording
                    ? 'Start speaking to see real-time transcription'
                    : 'Record audio to generate a transcript'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Transcript segments */}
        <div className="space-y-3 max-w-4xl mx-auto">
          {finalizedSegments.map((segment) => {
            const isEditing = editingState.segmentId === segment.id
            const segmentText = segment.words.map(w => w.word).join('')

            return (
              <SegmentDisplay
                key={segment.id}
                id={segment.id}
                speaker={segment.speaker}
                text={segmentText}
                startTime={segment.startTime}
                endTime={segment.endTime}
                confidence={segment.confidence}
                isInterim={false}
                isEditing={isEditing}
                showConfidence={showConfidence}
                textDirection={getTextDirection(segmentText)}
                onClick={() => handleSegmentClick(segment.id, segment.startTime)}
                onEditStart={
                  enableEditing
                    ? () => handleEditStart(segment.id, segmentText)
                    : undefined
                }
                onEditSave={handleEditSave}
                onEditCancel={handleEditCancel}
              />
            )
          })}

          {/* Interim (unfinalized) text */}
          {interimSegment && (
            <SegmentDisplay
              key={interimSegment.id}
              id={interimSegment.id}
              speaker={interimSegment.speaker}
              text={interimSegment.words.map(w => w.word).join(' ')}
              startTime={interimSegment.startTime}
              endTime={interimSegment.endTime}
              confidence={interimSegment.confidence}
              isInterim={true}
              showConfidence={false}
              textDirection={getTextDirection(
                interimSegment.words.map(w => w.word).join(' ')
              )}
            />
          )}
        </div>

        {/* Scroll anchor */}
        <div ref={endRef} />
      </div>

      {/* Scroll-to-bottom indicator */}
      {userScrolled && isRecording && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-8 right-8 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium animate-bounce"
          aria-label="Scroll to latest"
          type="button"
        >
          <span>↓</span>
          <span>New text below</span>
        </button>
      )}

      {/* Stats footer */}
      {transcript && (
        <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-3 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <span>{finalizedSegments.length} segments</span>
              <span>•</span>
              <span>{transcript.metadata.language}</span>
            </div>

            {isRecording && (
              <div className="flex items-center gap-2 text-red-500">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>Recording...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
