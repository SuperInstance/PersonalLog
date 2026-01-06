/**
 * JEPA Transcription Page
 *
 * Main page for JEPA (Joint Embedding Predictive Architecture) audio transcription.
 * Features markdown transcript display with timestamps, speaker identification, and export controls.
 */

'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { JEPA_Transcript } from '@/types/jepa'
import { TranscriptDisplay } from '@/components/jepa/TranscriptDisplay'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  transcriptToMarkdown,
  copyTranscriptToClipboard,
  downloadTranscript,
} from '@/lib/jepa/transcript-formatter'

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
  const [showBetaModal, setShowBetaModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<string | null>(null)

  // Check if user has seen beta disclaimer
  useEffect(() => {
    const hasSeenBeta = localStorage.getItem('jepa_beta_seen')
    if (!hasSeenBeta) {
      setShowBetaModal(true)
    }

    // Load mock transcript for demo
    setTranscript(mockTranscript)
  }, [])

  const handleStartRecording = () => {
    setIsRecording(true)
    // TODO: Implement actual recording logic (Round 2)
    console.log('Starting recording...')
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    // TODO: Implement actual stop recording logic (Round 2)
    console.log('Stopping recording...')
  }

  const handleCopyTranscript = async () => {
    if (!transcript) return

    const success = await copyTranscriptToClipboard(transcript, 'markdown')
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadTranscript = () => {
    if (!transcript) return
    downloadTranscript(transcript, 'markdown')
  }

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
                >
                  <Mic className="w-4 h-4" />
                  Start Recording
                </Button>
              ) : (
                <Button
                  onClick={handleStopRecording}
                  variant="destructive"
                  className="flex items-center gap-2"
                  size="lg"
                >
                  <Square className="w-4 h-4" />
                  Stop Recording
                </Button>
              )}
            </div>
          </div>

          {/* Export Controls */}
          <div className="flex items-center justify-between px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
              {transcript && (
                <>
                  <span>{transcript.segments.length} segments</span>
                  <span>•</span>
                  <span>{transcript.metadata.language}</span>
                  <span>•</span>
                  <span>
                    {Math.floor(transcript.duration / 60)}:
                    {(transcript.duration % 60).toString().padStart(2, '0')}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleCopyTranscript}
                variant="outline"
                size="sm"
                disabled={!transcript}
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button
                onClick={handleDownloadTranscript}
                variant="outline"
                size="sm"
                disabled={!transcript}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
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
    </>
  )
}
