'use client'

/**
 * AudioRecorder Component
 *
 * Records audio and converts to text using Web Speech API.
 */

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'

interface AudioRecorderProps {
  onTranscript: (text: string, audioUrl?: string) => void
  keepAudio?: boolean
  language?: string
}

export default function AudioRecorder({
  onTranscript,
  keepAudio = false,
  language = 'en-US',
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')

  const recognitionRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = language

      recognitionRef.current.onresult = (event: any) => {
        let interim = ''
        let final = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            final += transcript + ' '
          } else {
            interim += transcript
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
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [language])

  const startRecording = async () => {
    setTranscript('')
    setInterimTranscript('')

    try {
      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start()
      }

      // Start audio recording if keeping audio
      if (keepAudio) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaRecorderRef.current = new MediaRecorder(stream)
        audioChunksRef.current = []

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
    }
  }

  const stopRecording = async () => {
    setIsProcessing(true)

    try {
      // Stop speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }

      let audioUrl: string | undefined

      // Stop audio recording and create URL
      if (keepAudio && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()

        await new Promise<void>((resolve) => {
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
              audioUrl = URL.createObjectURL(audioBlob)
              resolve()
            }
          } else {
            resolve()
          }
        })
      }

      // Wait a bit for final transcript
      await new Promise(resolve => setTimeout(resolve, 500))

      const finalTranscript = (transcript + interimTranscript).trim()

      if (finalTranscript) {
        onTranscript(finalTranscript, audioUrl)
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

  return (
    <div className="flex items-center gap-2">
      {/* Live transcript preview */}
      {isRecording && (transcript || interimTranscript) && (
        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 max-w-xs">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {transcript}
            <span className="text-slate-400">{interimTranscript}</span>
          </p>
        </div>
      )}

      {/* Record button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={`relative p-3 rounded-full transition-all ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
            : isProcessing
            ? 'bg-slate-300 dark:bg-slate-700 text-slate-500'
            : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
        }`}
        title={isRecording ? 'Stop recording' : 'Start recording'}
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
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          Recording...
        </div>
      )}
    </div>
  )
}
