/**
 * JEPA Transcription Page
 *
 * Main page for JEPA (Joint Embedding Predictive Architecture) audio transcription.
 * Features markdown transcript display with timestamps, speaker identification, and export controls.
 * Includes real-time audio waveform visualization during recording.
 * Enhanced with emotion analysis, multi-language support, keyboard shortcuts, and accessibility.
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Metadata } from 'next'
import {
  Mic,
  MicOff,
  Square,
  Copy,
  Download,
  FileText,
  AlertCircle,
  Info,
  Pause,
  Play,
  TrendingUp,
  Database,
  Keyboard,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import { JEPA_Transcript } from '@/types/jepa'
import { TranscriptDisplay } from '@/components/jepa/TranscriptDisplay'
import { AudioWaveformWithControls } from '@/components/jepa/AudioWaveform'
import { EmotionTrends } from '@/components/jepa/EmotionTrends'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tabs, TabsList, Tab, TabsPanel } from '@/components/ui/Tabs'
import {
  transcriptToMarkdown,
  copyTranscriptToClipboard,
  downloadTranscript,
} from '@/lib/jepa/transcript-formatter'
import { getAudioCapture } from '@/lib/jepa/audio-capture'
import { generateQuickSampleData } from '@/lib/jepa/emotion-sample-data'
import { detectEmotion } from '@/lib/jepa/emotion-text-analyzer'
import { detectLanguageFromTranscript } from '@/lib/jepa/language-detection'
import type { WaveformState } from '@/components/jepa/AudioWaveform'
import { useToast } from '@/hooks/useToast'

// Mock transcript data for demo
const mockTranscript: JEPA_Transcript = {
  id: 'jepa_demo_001',
  conversationId: 'conv_demo',
  sessionId: 'session_001',
  startedAt: new Date().toISOString(),
  duration: 180,
  segments: [
    {
      id: 'seg_001',
      speaker: 'user',
      text: 'Hello, can you help me with something?',
      timestamp: new Date().toISOString(),
      startTime: 0,
      endTime: 2.5,
      confidence: 0.95,
    },
    {
      id: 'seg_002',
      speaker: 'assistant',
      text: 'Of course! What can I help you with today?',
      timestamp: new Date().toISOString(),
      startTime: 2.5,
      endTime: 5.2,
      confidence: 0.98,
    },
    {
      id: 'seg_003',
      speaker: 'user',
      text: 'I\'m trying to understand how JEPA transcription works. Can you explain it?',
      timestamp: new Date().toISOString(),
      startTime: 5.2,
      endTime: 10.8,
      confidence: 0.92,
    },
    {
      id: 'seg_004',
      speaker: 'assistant',
      text: 'JEPA stands for Joint Embedding Predictive Architecture. It\'s a research feature that uses advanced AI to transcribe audio with speaker identification, emotion detection, and high accuracy.',
      timestamp: new Date().toISOString(),
      startTime: 10.8,
      endTime: 22.5,
      confidence: 0.97,
    },
  ],
  metadata: {
    totalSpeakers: 2,
    speakers: [
      {
        id: 'user',
        name: 'User',
        color: '#3b82f6',
        segmentCount: 2,
        speakingTime: 8.1,
      },
      {
        id: 'assistant',
        name: 'Claude',
        color: '#8b5cf6',
        segmentCount: 2,
        speakingTime: 14.4,
      },
    ],
    language: 'en',
    audioQuality: 'good',
    audioKept: false,
    processingTime: 1500,
  },
}

export default function JEPAPage() {
  const [transcript, setTranscript] = useState<JEPA_Transcript | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showBetaModal, setShowBetaModal] = useState(false)
  const [showKeyboardModal, setShowKeyboardModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<string | null>(null)
  const [audioCapture] = useState(() => getAudioCapture())
  const [analyser, setAnalyser] = useState(audioCapture.getAnalyser())
  const [waveformState, setWaveformState] = useState<WaveformState>('idle')
  const [activeTab, setActiveTab] = useState<'transcript' | 'trends'>('transcript')
  const [isGeneratingData, setIsGeneratingData] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const { showSuccess, showError, showInfo, showWarning } = useToast()

  // Enhanced emotion analysis for transcript
  const transcriptEmotion = useMemo(() => {
    if (!transcript || transcript.segments.length === 0) return null

    // Combine all segment text for emotion analysis
    const fullText = transcript.segments.map(s => s.text).join(' ')
    const emotion = detectEmotion(fullText)

    // Detect language from first segment (async but we'll use a default for now)
    // In a real implementation, you'd want to useState for this
    const language = 'en' // Default to English for now

    return {
      ...emotion,
      language,
      languageConfidence: 0.8,
    }
  }, [transcript])

  // Check if user has seen beta disclaimer
  useEffect(() => {
    const hasSeenBeta = localStorage.getItem('jepa_beta_seen')
    if (!hasSeenBeta) {
      setShowBetaModal(true)
    }

    // Load mock transcript for demo
    setTranscript(mockTranscript)

    // Initialize audio capture
    audioCapture.initialize().catch(console.error)

    // Subscribe to state changes
    const unsubscribe = audioCapture.onStateChange((state) => {
      switch (state.state) {
        case 'recording':
          setWaveformState('recording')
          setIsRecording(true)
          setIsPaused(false)
          break
        case 'paused':
          setWaveformState('paused')
          setIsPaused(true)
          break
        case 'idle':
        case 'stopped':
          setWaveformState('idle')
          setIsRecording(false)
          setIsPaused(false)
          break
        default:
          break
      }
      // Update analyser reference
      setAnalyser(audioCapture.getAnalyser())
    })

    return () => {
      unsubscribe()
    }
  }, [audioCapture])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // R - Start/Stop recording
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        if (isRecording) {
          handleStopRecording()
        } else {
          handleStartRecording()
        }
      }

      // P - Pause/Resume
      if ((e.key === 'p' || e.key === 'P') && isRecording) {
        e.preventDefault()
        handlePauseToggle()
      }

      // T - Switch to trends tab
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        setActiveTab(activeTab === 'transcript' ? 'trends' : 'transcript')
      }

      // ? - Show keyboard shortcuts
      if (e.key === '?') {
        e.preventDefault()
        setShowKeyboardModal(true)
      }

      // Esc - Close modals
      if (e.key === 'Escape') {
        if (showBetaModal) {
          handleBetaAcknowledge()
        }
        if (showKeyboardModal) {
          setShowKeyboardModal(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRecording, isPaused, activeTab, showBetaModal, showKeyboardModal])

  const handleStartRecording = useCallback(async () => {
    try {
      await audioCapture.startRecording()
      setWaveformState('recording')
      setIsRecording(true)
      setIsPaused(false)
      showSuccess('Recording started', 3000)
    } catch (error) {
      console.error('Failed to start recording:', error)
      showError('Failed to start recording. Please check microphone permissions.')
    }
  }, [audioCapture, showSuccess, showError])

  const handleStopRecording = useCallback(() => {
    audioCapture.stopRecording()
    setWaveformState('idle')
    setIsRecording(false)
    setIsPaused(false)
    showInfo('Recording stopped', 3000)
  }, [audioCapture, showInfo])

  const handlePauseToggle = useCallback(() => {
    if (isPaused) {
      audioCapture.resumeRecording()
      setWaveformState('recording')
      setIsPaused(false)
      showSuccess('Recording resumed', 2000)
    } else {
      audioCapture.pauseRecording()
      setWaveformState('paused')
      setIsPaused(true)
      showInfo('Recording paused', 2000)
    }
  }, [audioCapture, isPaused, showSuccess, showInfo])

  const handleCopyTranscript = useCallback(async () => {
    if (!transcript) return

    try {
      const success = await copyTranscriptToClipboard(transcript, 'markdown')
      if (success) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        showSuccess('Transcript copied to clipboard!')
      } else {
        showError('Failed to copy transcript')
      }
    } catch (error) {
      console.error('Failed to copy transcript:', error)
      showError('Failed to copy transcript')
    }
  }, [transcript, showSuccess, showError])

  const handleDownloadTranscript = useCallback(() => {
    if (!transcript) return
    try {
      downloadTranscript(transcript, 'markdown')
      showSuccess('Transcript downloaded successfully!')
    } catch (error) {
      console.error('Failed to download transcript:', error)
      showError('Failed to download transcript')
    }
  }, [transcript, showSuccess, showError])

  const handleTimestampClick = (seconds: number) => {
    console.log('Timestamp clicked:', seconds)
    // TODO: Implement audio seeking (Round 3)
  }

  const handleSegmentClick = (segmentId: string) => {
    setHighlightedSegmentId(segmentId)
    setTimeout(() => setHighlightedSegmentId(null), 2000)
  }

  const handleBetaAcknowledge = () => {
    localStorage.setItem('jepa_beta_seen', 'true')
    setShowBetaModal(false)
  }

  const handleGenerateSampleData = async () => {
    setIsGeneratingData(true)
    try {
      await generateQuickSampleData()
      // Force refresh of trends tab
      setActiveTab('trends')
      showSuccess('Sample data generated! Check the Emotion Trends tab.')
    } catch (error) {
      console.error('Failed to generate sample data:', error)
      showError('Failed to generate sample data. Please try again.')
    } finally {
      setIsGeneratingData(false)
    }
  }

  return (
    <>
      <div className="flex flex-col h-screen bg-white dark:bg-slate-950">
        {/* Header */}
        <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  JEPA Transcription
                </h1>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span>Beta Research Feature</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <button
                    onClick={() => setShowKeyboardModal(true)}
                    className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                    aria-label="Show keyboard shortcuts (Press ?)"
                    title="Keyboard shortcuts (?)"
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Recording Controls */}
            <div className="flex items-center gap-3">
              {!isRecording ? (
                <Button
                  onClick={handleStartRecording}
                  className="flex items-center gap-2"
                  size="lg"
                  aria-label="Start recording (Press R)"
                >
                  <Mic className="w-4 h-4" />
                  <span className="hidden sm:inline">Start Recording</span>
                  <span className="sm:hidden">Record</span>
                </Button>
              ) : (
                <Button
                  onClick={handleStopRecording}
                  variant="destructive"
                  className="flex items-center gap-2"
                  size="lg"
                  aria-label="Stop recording (Press R)"
                >
                  <Square className="w-4 h-4" />
                  <span className="hidden sm:inline">Stop Recording</span>
                  <span className="sm:hidden">Stop</span>
                </Button>
              )}
            </div>
          </div>

          {/* Export Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-slate-600 dark:text-slate-400">
              {transcript && (
                <>
                  <span>{transcript.segments.length} segments</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{transcript.metadata.language}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>
                    {Math.floor(transcript.duration / 60)}:
                    {(transcript.duration % 60).toString().padStart(2, '0')}
                  </span>
                </>
              )}
            </div>

            {/* Emotion Analysis Display */}
            {transcriptEmotion && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">
                  {transcriptEmotion.emotion}
                </span>
                <span className="text-xs text-slate-500">
                  ({Math.round(transcriptEmotion.confidence * 100)}%)
                </span>
                {transcriptEmotion.language && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500 uppercase">{transcriptEmotion.language}</span>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                onClick={handleCopyTranscript}
                variant="outline"
                size="sm"
                disabled={!transcript}
                className="flex items-center gap-2"
                aria-label="Copy transcript to clipboard"
              >
                <Copy className="w-4 h-4" />
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
              </Button>
              <Button
                onClick={handleDownloadTranscript}
                variant="outline"
                size="sm"
                disabled={!transcript}
                className="flex items-center gap-2"
                aria-label="Download transcript"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content with Tabs */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Waveform Visualization (shown during recording) */}
          {isRecording && (
            <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <AudioWaveformWithControls
                analyser={analyser}
                state={waveformState}
                width={800}
                height={200}
                onPauseToggle={handlePauseToggle}
                pauseDisabled={false}
                showPauseButton={true}
                className="mx-auto"
              />
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'transcript' | 'trends')} className="flex-1 flex flex-col">
            <div className="px-6 pt-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <TabsList>
                <Tab value="transcript" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Transcript
                </Tab>
                <Tab value="trends" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Emotion Trends
                </Tab>
              </TabsList>
            </div>

            {/* Transcript Panel */}
            <TabsPanel value="transcript" className="flex-1 overflow-hidden">
              {transcript ? (
                <TranscriptDisplay
                  transcript={transcript}
                  isRecording={isRecording}
                  autoScroll={true}
                  highlightedSegmentId={highlightedSegmentId}
                  onTimestampClick={handleTimestampClick}
                  onSegmentClick={(segment) => handleSegmentClick(segment.id)}
                  className="h-full"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Mic className="w-10 h-10" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-slate-700 dark:text-slate-300">
                        No transcript yet
                      </p>
                      <p className="text-sm mt-2">
                        Start a recording to generate a transcript
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsPanel>

            {/* Emotion Trends Panel */}
            <TabsPanel value="trends" className="flex-1 overflow-auto p-6">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      Emotion Trends Dashboard
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Track your emotional patterns over time
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerateSampleData}
                    disabled={isGeneratingData}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Database className="w-4 h-4" />
                    {isGeneratingData ? 'Generating...' : 'Generate Sample Data'}
                  </Button>
                </div>
                <EmotionTrends />
              </div>
            </TabsPanel>
          </Tabs>
        </main>
      </div>

      {/* Beta Disclaimer Modal */}
      <Modal
        isOpen={showBetaModal}
        onClose={handleBetaAcknowledge}
        title="JEPA Transcription - Beta Feature"
        size="md"
        footer={
          <Button onClick={handleBetaAcknowledge} className="w-full">
            I Understand
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                Research Feature
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                JEPA transcription is an experimental beta feature. It may not always be accurate
                and is subject to change.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 dark:text-slate-100">What it does:</strong>
                <p className="mt-1">
                  Transcribes audio with speaker identification, emotion detection, and
                  subtext analysis using Joint Embedding Predictive Architecture.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 dark:text-slate-100">Current limitations:</strong>
                <ul className="mt-1 list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                  <li>Requires an active internet connection</li>
                  <li>May have lower accuracy with multiple speakers</li>
                  <li>Processing time depends on audio length</li>
                  <li>Beta quality - may contain errors</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 dark:text-slate-100">Privacy:</strong>
                <p className="mt-1">
                  Audio is processed securely and can be deleted after transcription. You can
                  choose whether to keep the original audio file.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Keyboard Shortcuts Modal */}
      <Modal
        isOpen={showKeyboardModal}
        onClose={() => setShowKeyboardModal(false)}
        title="Keyboard Shortcuts"
        size="sm"
        footer={
          <Button onClick={() => setShowKeyboardModal(false)} className="w-full">
            Got it
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Mic className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Start/Stop Recording</span>
            </div>
            <kbd className="px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded">
              R
            </kbd>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Pause className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Pause/Resume Recording</span>
            </div>
            <kbd className="px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded">
              P
            </kbd>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Switch to Trends Tab</span>
            </div>
            <kbd className="px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded">
              T
            </kbd>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-3">
              <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Close Modals</span>
            </div>
            <kbd className="px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded">
              Esc
            </kbd>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Keyboard className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Show This Help</span>
            </div>
            <kbd className="px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded">
              ?
            </kbd>
          </div>
        </div>
      </Modal>
    </>
  )
}
