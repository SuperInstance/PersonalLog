/**
 * JEPA Conversation Component
 *
 * Main conversation UI for the JEPA emotional subtext analyzer.
 * Embedded controls, real-time emotion display, and transcript panel.
 *
 * @module components/agents/jepa/JEPAConversation
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Mic, MicOff, Pause, Play, Download, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { RecordingControls } from '@/components/jepa/RecordingControls'
import { EmotionIndicator, EmotionTimeline } from './EmotionIndicator'
import { getJEPAAgent, type JEPAAgentState, type EmotionAnalysis } from '@/lib/agents/jepa-agent'
import type { Message } from '@/types/conversation'
import { getAudioStateManager } from '@/lib/jepa/audio-state'
import { getSpeakerDisplayName, mergeSpeakerDetection } from '@/lib/jepa/speaker-detection'

export interface JEPAConversationProps {
  /** Current conversation messages */
  messages: Message[]

  /** Whether component is visible */
  visible?: boolean

  /** Additional CSS classes */
  className?: string
}

export function JEPAConversation({
  messages,
  visible = true,
  className = '',
}: JEPAConversationProps) {
  const [agentState, setAgentState] = useState<JEPAAgentState>(() => getJEPAAgent().getState())
  const [transcriptVisible, setTranscriptVisible] = useState(false)
  const [lastEmotion, setLastEmotion] = useState<EmotionAnalysis | null>(null)
  const [showWelcome, setShowWelcome] = useState(true)

  const agent = useMemo(() => getJEPAAgent(), [])

  // Subscribe to agent state changes
  useEffect(() => {
    const unsubscribes = [
      agent.on('state_changed', (state: JEPAAgentState) => {
        setAgentState(state)
      }),
      agent.on('emotion_analyzed', (data: { emotion: EmotionAnalysis }) => {
        setLastEmotion(data.emotion)
      }),
      agent.on('recording_started', () => {
        setShowWelcome(false)
      }),
    ]

    return () => {
      unsubscribes.forEach(unsub => unsub())
    }
  }, [agent])

  // Initialize agent on mount
  useEffect(() => {
    if (visible) {
      agent.initialize().catch(error => {
        console.error('Failed to initialize JEPA agent:', error)
      })
    }
  }, [agent, visible])

  // Process messages for emotion analysis
  useEffect(() => {
    if (!visible || messages.length === 0) return

    const userMessages = messages.filter(m => m.author === 'user')
    if (userMessages.length === 0) return

    // Analyze most recent user message
    const latestMessage = userMessages[userMessages.length - 1]
    agent.processMessage(latestMessage)
  }, [messages, agent, visible])

  // Recording controls
  const handleStartRecording = useCallback(async () => {
    try {
      await agent.startRecording()
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }, [agent])

  const handleStopRecording = useCallback(() => {
    agent.stopRecording()
  }, [agent])

  const handlePauseRecording = useCallback(() => {
    agent.pauseRecording()
  }, [agent])

  const handleResumeRecording = useCallback(async () => {
    try {
      await agent.resumeRecording()
    } catch (error) {
      console.error('Failed to resume recording:', error)
    }
  }, [agent])

  // Export transcript
  const handleExportTranscript = useCallback(async () => {
    try {
      const markdown = await agent.exportTranscript()
      // TODO: Show success notification
    } catch (error) {
      console.error('Failed to export transcript:', error)
    }
  }, [agent])

  // Get recording state
  const recordingState = agentState.recordingState
  const audioStateManager = getAudioStateManager()
  const currentAudioState = audioStateManager.getCurrentState()
  const hasPermission = currentAudioState.permissionsGranted
  const hasError = recordingState === 'error'

  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className={`jepa-conversation flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
            🎙️
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">JEPA</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">Emotional Subtext Analyzer</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Duration display */}
          {agentState.status === 'running' && agentState.recordingDuration > 0 && (
            <div className="text-sm font-mono text-slate-600 dark:text-slate-400">
              {formatDuration(agentState.recordingDuration)}
            </div>
          )}

          {/* Export button */}
          {agentState.transcript.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportTranscript}
              className="gap-1.5"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Welcome message */}
        {showWelcome && agentState.transcript.length === 0 && (
          <div className="p-6">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🎙️</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Welcome to JEPA!
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                    I&apos;m your emotional subtext analyzer. I listen to our conversations and analyze the
                    emotional undertones in real-time.
                  </p>

                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>
                        <strong>Valence:</strong> Positive vs negative sentiment
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500">✓</span>
                      <span>
                        <strong>Arousal:</strong> Energy and intensity level
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-purple-500">✓</span>
                      <span>
                        <strong>Dominance:</strong> Confidence and assertiveness
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Just start talking normally, and I&apos;ll work in the background. Click &quot;Start Recording&quot; to begin!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages with emotion indicators */}
        <div className="space-y-4 p-4">
          {messages
            .filter(m => m.author === 'user')
            .map(message => {
              // Find emotion analysis for this message
              const messageEmotion = agentState.emotions.find(
                e => Math.abs(e.timestamp - new Date(message.timestamp).getTime()) < 5000
              )

              return (
                <div
                  key={message.id}
                  className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
                >
                  {/* Message content */}
                  <div className="text-sm text-slate-900 dark:text-slate-100 mb-2">
                    {message.content.text}
                  </div>

                  {/* Emotion indicator */}
                  {messageEmotion && (
                    <div className="mt-2">
                      <EmotionIndicator emotion={messageEmotion} compact />
                    </div>
                  )}
                </div>
              )
            })}

          {messages.filter(m => m.author === 'user').length === 0 && !showWelcome && (
            <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">
              Start a conversation to see emotion analysis here
            </div>
          )}
        </div>

        {/* Emotion timeline */}
        {agentState.emotions.length > 3 && (
          <div className="px-4 pb-4">
            <EmotionTimeline emotions={agentState.emotions} />
          </div>
        )}
      </div>

      {/* Recording controls footer */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between">
          {/* Recording controls */}
          <RecordingControls
            state={recordingState}
            hasPermission={hasPermission}
            hasError={hasError}
            onStart={handleStartRecording}
            onStop={handleStopRecording}
            onPause={handlePauseRecording}
            onResume={handleResumeRecording}
          />

          {/* Transcript panel toggle */}
          {agentState.transcript.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTranscriptVisible(!transcriptVisible)}
              className="gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              Transcript
              {transcriptVisible ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>

        {/* Collapsible transcript panel */}
        {transcriptVisible && agentState.transcript.length > 0 && (
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Transcript ({agentState.transcript.length} segments)
            </div>
            <div className="space-y-2">
              {agentState.transcript.map(segment => (
                <div
                  key={segment.id}
                  className="text-sm text-slate-700 dark:text-slate-300"
                >
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {getSpeakerDisplayName(segment.speaker)}:
                  </span>{' '}
                  {segment.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status message */}
        {agentState.error && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{agentState.error}</p>
          </div>
        )}

        {agentState.status === 'running' && !agentState.error && (
          <div className="mt-3 text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Listening... Analyzing emotions in real-time
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
