/**
 * JEPA Transcription Pipeline
 *
 * Coordinates audio capture with STT processing for real-time transcription.
 * Handles audio buffering, chunking, and timestamp alignment.
 */

import type {
  AudioRecording,
  AudioWindow,
  AudioState,
  RecordingState,
} from './types'
import type {
  STTBackend,
  STTConfig,
  Transcript,
  TranscriptionRequest,
  TranscriptionProgress,
  STTError,
} from './stt-types'
import { STTEngine } from './stt-engine'

export interface PipelineConfig {
  stt: STTConfig
  chunkDuration: number // milliseconds - how often to transcribe
  maxDelay: number // milliseconds - max delay before transcription
  enablePartialResults: boolean
  enableInterimResults: boolean
}

export interface TranscriptionSession {
  id: string
  isActive: boolean
  startTime: number
  audioChunks: AudioWindow[]
  currentTranscript: string
  segments: Array<{
    text: string
    startTime: number
    endTime: number
    isFinal: boolean
  }>
}

export type SessionStateCallback = (session: TranscriptionSession) => void
export type PartialTranscriptCallback = (text: string, isFinal: boolean) => void

export class TranscriptionPipeline {
  private engine: STTEngine
  private config: PipelineConfig
  private currentSession: TranscriptionSession | null = null
  private transcriptionTimer: number | null = null
  private isInitialized = false

  // Callbacks
  private callbacks: {
    onSessionUpdate?: SessionStateCallback
    onPartialTranscript?: PartialTranscriptCallback
    onTranscriptComplete?: (transcript: Transcript) => void
    onError?: (error: STTError) => void
  } = {}

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = {
      stt: {
        backend: 'whisper-local',
        modelSize: 'tiny',
        language: 'en',
        enableTimestamps: true,
        enableTranslation: false,
        maxAudioLength: 300,
      },
      chunkDuration: 5000, // 5 seconds
      maxDelay: 10000, // 10 seconds
      enablePartialResults: true,
      enableInterimResults: true,
      ...config,
    }

    this.engine = new STTEngine({
      config: this.config.stt,
      onTranscript: this.handleTranscriptComplete.bind(this),
      onProgress: this.handleTranscriptionProgress.bind(this),
      onError: this.handleError.bind(this),
    })
  }

  /**
   * Initialize the pipeline
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      await this.engine.initialize()
      this.isInitialized = true
      console.log('TranscriptionPipeline: Initialized')
    } catch (error) {
      console.error('TranscriptionPipeline: Initialization failed', error)
      throw error
    }
  }

  /**
   * Start a new transcription session
   */
  async startSession(options?: { language?: string }): Promise<TranscriptionSession> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    // Stop existing session if any
    if (this.currentSession?.isActive) {
      await this.stopSession()
    }

    // Create new session
    this.currentSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      isActive: true,
      startTime: Date.now(),
      audioChunks: [],
      currentTranscript: '',
      segments: [],
    }

    // Update language if specified
    if (options?.language) {
      this.engine.updateConfig({ language: options.language })
    }

    // Start periodic transcription
    this.startPeriodicTranscription()

    // Notify callback
    this.callbacks.onSessionUpdate?.(this.currentSession)

    console.log('TranscriptionPipeline: Session started', this.currentSession.id)
    return this.currentSession
  }

  /**
   * Add audio data to the current session
   */
  async addAudioData(window: AudioWindow): Promise<void> {
    if (!this.currentSession?.isActive) {
      console.warn('TranscriptionPipeline: No active session')
      return
    }

    this.currentSession.audioChunks.push(window)

    // Notify callback of interim results if enabled
    if (this.config.enableInterimResults) {
      const chunkText = `[Audio chunk ${this.currentSession.audioChunks.length}]`
      this.callbacks.onPartialTranscript?.(chunkText, false)
    }
  }

  /**
   * Stop the current transcription session
   */
  async stopSession(): Promise<Transcript | null> {
    if (!this.currentSession?.isActive) {
      return null
    }

    console.log('TranscriptionPipeline: Stopping session')

    // Stop periodic transcription
    this.stopPeriodicTranscription()

    // Transcribe remaining audio
    let finalTranscript: Transcript | null = null
    if (this.currentSession.audioChunks.length > 0) {
      finalTranscript = await this.transcribeCurrentChunks()
    }

    // Mark session as inactive
    this.currentSession.isActive = false
    this.callbacks.onSessionUpdate?.(this.currentSession)

    return finalTranscript
  }

  /**
   * Transcribe a complete recording
   */
  async transcribeRecording(recording: AudioRecording): Promise<Transcript> {
    try {
      // Convert audio windows to Float32Array
      const audioData = this.combineAudioWindows(recording.windows)

      // Create transcription request
      const request: TranscriptionRequest = {
        id: `req_${Date.now()}`,
        audioData: audioData.buffer as ArrayBuffer,
        format: 'wav',
        sampleRate: recording.metadata.sampleRate,
        language: this.config.stt.language,
        enableTimestamps: true,
        enableWordTimestamps: false,
      }

      // Transcribe
      const transcript = await this.engine.transcribe(request)

      console.log('TranscriptionPipeline: Recording transcribed', {
        duration: recording.metadata.duration,
        text: transcript.text.substring(0, 100) + '...',
      })

      return transcript
    } catch (error) {
      console.error('TranscriptionPipeline: Recording transcription failed', error)
      throw error
    }
  }

  /**
   * Get current session state
   */
  getCurrentSession(): TranscriptionSession | null {
    return this.currentSession
  }

  /**
   * Set callbacks
   */
  on(event: 'sessionUpdate', callback: SessionStateCallback): void
  on(event: 'partialTranscript', callback: PartialTranscriptCallback): void
  on(event: 'transcriptComplete', callback: (transcript: Transcript) => void): void
  on(event: 'error', callback: (error: STTError) => void): void
  on(event: string, callback: unknown): void {
    switch (event) {
      case 'sessionUpdate':
        this.callbacks.onSessionUpdate = callback as SessionStateCallback
        break
      case 'partialTranscript':
        this.callbacks.onPartialTranscript = callback as PartialTranscriptCallback
        break
      case 'transcriptComplete':
        this.callbacks.onTranscriptComplete = callback as (transcript: Transcript) => void
        break
      case 'error':
        this.callbacks.onError = callback as (error: STTError) => void
        break
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.stopPeriodicTranscription()

    if (this.currentSession?.isActive) {
      await this.stopSession()
    }

    await this.engine.cleanup()
    this.isInitialized = false

    console.log('TranscriptionPipeline: Cleaned up')
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private startPeriodicTranscription(): void {
    // Clear existing timer
    if (this.transcriptionTimer !== null) {
      clearInterval(this.transcriptionTimer)
    }

    // Start new timer
    this.transcriptionTimer = window.setInterval(async () => {
      if (this.currentSession?.isActive) {
        await this.transcribeCurrentChunks()
      }
    }, this.config.chunkDuration)
  }

  private stopPeriodicTranscription(): void {
    if (this.transcriptionTimer !== null) {
      clearInterval(this.transcriptionTimer)
      this.transcriptionTimer = null
    }
  }

  private async transcribeCurrentChunks(): Promise<Transcript | null> {
    if (!this.currentSession || this.currentSession.audioChunks.length === 0) {
      return null
    }

    try {
      // Combine audio chunks
      const audioData = this.combineAudioWindows(this.currentSession.audioChunks)

      // Create transcription request
      const request: TranscriptionRequest = {
        id: `${this.currentSession.id}_${Date.now()}`,
        audioData: audioData.buffer as ArrayBuffer,
        format: 'wav',
        sampleRate: 44100, // From AUDIO_CONFIG
        language: this.config.stt.language,
        enableTimestamps: true,
        enableWordTimestamps: false,
      }

      // Transcribe
      const transcript = await this.engine.transcribe(request)

      // Update session
      if (transcript.text) {
        this.currentSession.currentTranscript = transcript.text
        this.currentSession.segments = [
          ...this.currentSession.segments,
          ...transcript.segments.map((seg) => ({
            ...seg,
            isFinal: true,
          })),
        ]

        // Notify callbacks
        this.callbacks.onPartialTranscript?.(transcript.text, true)
        this.callbacks.onSessionUpdate?.(this.currentSession)
      }

      // Clear processed chunks
      this.currentSession.audioChunks = []

      return transcript
    } catch (error) {
      console.error('TranscriptionPipeline: Chunk transcription failed', error)
      this.handleError(error as STTError)
      return null
    }
  }

  private combineAudioWindows(windows: AudioWindow[]): Float32Array {
    // Calculate total length
    const totalLength = windows.reduce((sum, window) => sum + window.samples.length, 0)

    // Combine all windows
    const combined = new Float32Array(totalLength)
    let offset = 0

    for (const window of windows) {
      combined.set(window.samples, offset)
      offset += window.samples.length
    }

    return combined
  }

  private handleTranscriptComplete(transcript: Transcript): void {
    console.log('TranscriptionPipeline: Transcript complete', {
      id: transcript.id,
      text: transcript.text.substring(0, 100) + '...',
    })

    this.callbacks.onTranscriptComplete?.(transcript)
  }

  private handleTranscriptionProgress(progress: TranscriptionProgress): void {
    // Could be used to show progress UI
    console.debug('TranscriptionPipeline: Progress', progress)
  }

  private handleError(error: STTError): void {
    console.error('TranscriptionPipeline: Error', error)
    this.callbacks.onError?.(error)
  }
}
