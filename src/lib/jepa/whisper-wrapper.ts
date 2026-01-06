/**
 * Whisper.cpp Wrapper - Browser-based Local Speech-to-Text
 *
 * Integrates Whisper.cpp via WebAssembly for local, privacy-preserving STT.
 *
 * This is the main interface for Whisper.cpp STT, wrapping the low-level
 * WASM integration with a cleaner API for the STT engine.
 *
 * @see https://github.com/ggerganov/whisper.cpp
 * @see https://github.com/ggerganov/whisper.cpp/tree/master/examples/whisper.wasm
 */

import type {
  STTConfig,
  STTCapabilities,
  TranscriptionRequest,
  Transcript,
  TranscriptionProgress,
  WhisperModelSize,
  ModelDownloadProgress,
  ModelDownloadStatus,
  ModelState,
} from './stt-types'
import {
  WHISPER_SAMPLE_RATE,
  WHISPER_CHANNELS,
  WHISPER_MODELS,
  STTError,
} from './stt-types'
import { WhisperSTT, WHISPER_LANGUAGES } from './whisper-wasm'
import { preprocessAudio } from './audio-preprocessing'

export class WhisperLocalEngine {
  private config: STTConfig
  private whisper: WhisperSTT | null = null
  private isInitialized = false
  private modelState: ModelState

  constructor(config: STTConfig) {
    this.config = config
    this.modelState = {
      status: 'idle',
      availableModels: Object.values(WHISPER_MODELS),
      downloadedModels: [],
    }
  }

  /**
   * Initialize Whisper.cpp WASM module
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('[WhisperLocalEngine] Initializing...')

    try {
      // Create Whisper STT instance
      this.whisper = new WhisperSTT(this.config)

      // Load WASM module and model
      await this.whisper.load((progress) => {
        this.modelState.progress = progress
      })

      // Update model state
      this.modelState.status = 'completed'
      this.modelState.downloadedModels = [this.config.modelSize]

      this.isInitialized = true
      console.log('[WhisperLocalEngine] Initialized successfully')
    } catch (error) {
      console.error('[WhisperLocalEngine] Initialization failed:', error)
      this.modelState.status = 'failed'
      this.modelState.error = (error as Error).message

      throw new STTError(
        'initialization-failed',
        `Failed to initialize Whisper: ${(error as Error).message}`,
        { originalError: error }
      )
    }
  }

  /**
   * Transcribe audio using local Whisper model
   */
  async transcribe(
    request: TranscriptionRequest,
    callbacks?: {
      onProgress?: (progress: TranscriptionProgress) => void
    }
  ): Promise<Transcript> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (!this.whisper) {
      throw new STTError('initialization-failed', 'Whisper not initialized')
    }

    console.log('[WhisperLocalEngine] Starting transcription...')

    try {
      // Convert audio data to AudioBuffer
      let audioBuffer: AudioBuffer

      if (request.audioData instanceof Float32Array) {
        // Create AudioBuffer from Float32Array
        const audioContext = new AudioContext({ sampleRate: request.sampleRate })
        audioBuffer = audioContext.createBuffer(
          1,
          request.audioData.length,
          request.sampleRate
        )
        audioBuffer.getChannelData(0).set(request.audioData)
      } else {
        // Decode ArrayBuffer to AudioBuffer
        const audioContext = new AudioContext({ sampleRate: request.sampleRate })
        audioBuffer = await audioContext.decodeAudioData(request.audioData.slice(0))
      }

      callbacks?.onProgress?.({
        requestId: request.id,
        status: 'transcribing',
        progress: 0,
      })

      // Preprocess audio
      const processedAudio = await preprocessAudio(audioBuffer, {
        targetSampleRate: WHISPER_SAMPLE_RATE,
        normalize: true,
      })

      callbacks?.onProgress?.({
        requestId: request.id,
        status: 'transcribing',
        progress: 0.5,
      })

      // Transcribe
      const startTime = Date.now()
      const result = await this.whisper.transcribe(processedAudio, {
        language: request.language || this.config.language || undefined,
        enableWordTimestamps: request.enableWordTimestamps,
        enableTranslation: request.enableTranslation,
      })
      const processingTime = Date.now() - startTime

      console.log(`[WhisperLocalEngine] Transcription complete in ${processingTime}ms`)

      // Convert to Transcript format
      const transcript: Transcript = {
        id: request.id,
        text: result.text,
        segments: result.segments.map(seg => ({
          id: `seg_${seg.id}`,
          text: seg.text,
          startTime: seg.start * 1000, // Convert to milliseconds
          endTime: seg.end * 1000,
          confidence: seg.confidence,
        })),
        language: result.language,
        duration: result.duration * 1000, // Convert to milliseconds
        confidence: result.confidence,
        metadata: {
          backend: 'whisper-local',
          modelSize: this.config.modelSize,
          createdAt: new Date().toISOString(),
          processingTime,
          audioLength: result.duration * 1000,
          wordCount: result.text.split(/\s+/).length,
        },
      }

      callbacks?.onProgress?.({
        requestId: request.id,
        status: 'ready',
        progress: 1,
      })

      return transcript
    } catch (error) {
      console.error('[WhisperLocalEngine] Transcription failed:', error)

      throw new STTError(
        'transcription-failed',
        `Transcription failed: ${(error as Error).message}`,
        { originalError: error }
      )
    }
  }

  /**
   * Download Whisper model
   */
  async downloadModel(
    modelSize: WhisperModelSize,
    onProgress?: (progress: ModelDownloadProgress) => void
  ): Promise<void> {
    console.log(`[WhisperLocalEngine] Downloading model ${modelSize}...`)

    this.modelState.status = 'downloading'

    try {
      // Create temporary Whisper instance for download
      const whisper = new WhisperSTT({ ...this.config, modelSize })

      await whisper.load(onProgress)

      // Update state
      this.modelState.status = 'completed'
      this.modelState.downloadedModels.push(modelSize)
      this.modelState.progress = undefined

      console.log(`[WhisperLocalEngine] Model ${modelSize} downloaded successfully`)
    } catch (error) {
      this.modelState.status = 'failed'
      this.modelState.error = (error as Error).message

      throw new STTError(
        'model-download-failed',
        `Failed to download model ${modelSize}: ${(error as Error).message}`,
        { originalError: error }
      )
    }
  }

  /**
   * Get model state
   */
  getModelState(): ModelState {
    return { ...this.modelState }
  }

  /**
   * Get backend capabilities
   */
  getCapabilities(): STTCapabilities {
    return {
      supportsRealtime: true,
      supportsBatch: true,
      supportsDiarization: false,
      supportsTranslation: true,
      maxAudioLength: 600,
      supportedLanguages: Object.keys(WHISPER_LANGUAGES),
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.whisper) {
      await this.whisper.cleanup()
      this.whisper = null
    }
    this.isInitialized = false
  }
}

// Re-export types and constants
export type { STTError } from './stt-types'
export { WHISPER_LANGUAGES }
