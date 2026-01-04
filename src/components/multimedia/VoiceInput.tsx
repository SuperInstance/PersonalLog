'use client'

/**
 * VoiceInput Component
 *
 * Voice recording with real-time transcription using Web Speech API.
 */

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react'
import { MediaAttachment } from '@/lib/multimedia/types'

interface VoiceInputProps {
  onTranscript?: (text: string, audio?: MediaAttachment) => void
  onAudioReady?: (audio: MediaAttachment) => void
  language?: string
  disabled?: boolean
  keepAudio?: boolean
  className?: string
}

export default function VoiceInput({
  onTranscript,
  onAudioReady,
  language = 'en-US',
  disabled = false,
  keepAudio = false,
  className = '',
}: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)

  const recognitionRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = (window as any).webkitSpeechRecognition ||
                               (window as any).SpeechRecognition

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = language

      recognitionRef.current.onresult = (event: any) => {
        let interim = ''
        let final = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const text = result[0].transcript

          if (result.isFinal) {
            final += text + ' '
          } else {
            interim += text
          }
        }

        if (final) {
          setTranscript(prev => prev + final)
        }
        setInterimTranscript(interim)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsRecording(false)

        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access to use voice input.')
        }
      }

      recognitionRef.current.onend = () => {
        if (isRecording) {
          // Restart if still recording
          recognitionRef.current?.start()
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause()
        audioElementRef.current = null
      }
    }
  }, [language, isRecording])

  const startRecording = async () => {
    setTranscript('')
    setInterimTranscript('')
    audioChunksRef.current = []

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start()
      }

      // Start audio recording if keeping audio
      if (keepAudio) {
        mediaRecorderRef.current = new MediaRecorder(stream)

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorderRef.current.start()
      }

      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)

      if (error instanceof Error && error.name === 'NotAllowedError') {
        alert('Please allow microphone access to use voice input.')
      } else {
        alert('Failed to access microphone. Please ensure your microphone is connected.')
      }
    }
  }

  const stopRecording = async () => {
    setIsProcessing(true)

    try {
      // Stop speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }

      let audioAttachment: MediaAttachment | undefined

      // Stop audio recording
      if (keepAudio && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
              const audioUrl = URL.createObjectURL(audioBlob)

              audioAttachment = {
                id: `audio_${Date.now()}`,
                type: 'audio',
                url: audioUrl,
                mimeType: 'audio/webm',
                size: audioBlob.size,
                name: `recording_${Date.now()}.webm`,
                status: 'ready',
                metadata: {},
                createdAt: new Date().toISOString(),
              }

              onAudioReady?.(audioAttachment)
              resolve()
            }
          } else {
            resolve()
          }
        })

        // Stop all tracks
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      }

      // Wait for final transcript
      await new Promise(resolve => setTimeout(resolve, 500))

      const finalTranscript = (transcript + interimTranscript).trim()

      if (finalTranscript) {
        onTranscript?.(finalTranscript, audioAttachment)
      }

      setIsRecording(false)
      setIsProcessing(false)
      setTranscript('')
      setInterimTranscript('')
    } catch (error) {
      console.error('Failed to stop recording:', error)
      setIsProcessing(false)
      setIsRecording(false)
    }
  }

  const playAudio = () => {
    if (audioChunksRef.current.length === 0) return

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
    const audioUrl = URL.createObjectURL(audioBlob)

    if (audioElementRef.current) {
      audioElementRef.current.pause()
    }

    audioElementRef.current = new Audio(audioUrl)
    audioElementRef.current.onended = () => setIsPlaying(false)
    audioElementRef.current.play()
    setIsPlaying(true)
  }

  const stopPlayback = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current = null
      setIsPlaying(false)
    }
  }

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const hasSpeechRecognition = typeof window !== 'undefined' &&
    ((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition)

  if (!hasSpeechRecognition) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          disabled={true}
          className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
          title="Voice input not supported in this browser"
        >
          <Mic className="w-5 h-5" />
        </button>
        <span className="text-xs text-slate-500">Voice input not supported</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Live transcript preview */}
      {isRecording && (transcript || interimTranscript) && (
        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 max-w-xs">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {transcript}
            <span className="text-slate-400">{interimTranscript}</span>
          </p>
        </div>
      )}

      {/* Play recorded audio */}
      {!isRecording && audioChunksRef.current.length > 0 && !isPlaying && (
        <button
          onClick={playAudio}
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
          title="Play recording"
          aria-label="Play recording"
        >
          <Volume2 className="w-5 h-5" />
        </button>
      )}

      {isPlaying && (
        <button
          onClick={stopPlayback}
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
          title="Stop playback"
          aria-label="Stop playback"
        >
          <MicOff className="w-5 h-5" />
        </button>
      )}

      {/* Record button */}
      <button
        onClick={handleToggleRecording}
        disabled={disabled || isProcessing}
        className={`
          relative p-3 rounded-full transition-all
          ${isRecording
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
            : isProcessing
            ? 'bg-slate-300 dark:bg-slate-700 text-slate-500'
            : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title={isRecording ? 'Stop recording' : 'Start voice recording'}
        aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
        aria-pressed={isRecording}
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 text-xs text-red-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          Recording...
        </div>
      )}
    </div>
  )
}
