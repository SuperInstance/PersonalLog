/**
 * JEPA STT Engine - Main Interface
 *
 * Unified interface for all STT backends (local Whisper, Cloudflare, OpenAI, Deepgram).
 * Provides automatic fallback, error handling, and progress tracking.
 */

import type {
  STTBackend,
  STTConfig,
  STTStatus,
  STTCapabilities,
  TranscriptionRequest,
  Transcript,
  TranscriptionProgress,
  FallbackStrategy,
  STTMetrics,
  TranscriptCallback,
  ProgressCallback,
  ErrorCallback,
} from './stt-types'
import { DEFAULT_STT_CONFIG, STTError } from './stt-types'

// Import backend implementations (will be created)
// import { WhisperLocalEngine } from './whisper-wrapper'
// import { CloudflareWhisperEngine } from './cloudflare-whisper'
// import { OpenAIWhisperEngine } from './openai-whisper'
// import { DeepgramEngine } from './deepgram'

export interface STEngineOptions {
  config?: Partial<STTConfig>
  fallbackStrategy?: Partial<FallbackStrategy>
  onTranscript?: TranscriptCallback
  onProgress?: ProgressCallback
  onError?: ErrorCallback
}

export class STTEngine {
  private config: STTConfig
  private fallbackStrategy: FallbackStrategy
  private currentBackend: STTBackend
  private status: STTStatus = 'idle'
  private metrics: STTMetrics

  private callbacks: {
    onTranscript?: TranscriptCallback
    onProgress?: ProgressCallback
    onError?: ErrorCallback
  }

  // Backend instances (lazy loaded)
  private backends: Map<STTBackend, any> = new Map()

  constructor(options: STEngineOptions = {}) {
    this.config = { ...DEFAULT_STT_CONFIG, ...options.config }
    this.fallbackStrategy = {
      enabled: true,
      backends: ['whisper-local', 'whisper-cloudflare', 'whisper-openai', 'deepgram'],
      retryOnFailure: true,
      maxRetries: 2,
      timeout: 30000,
      ...options.fallbackStrategy,
    }
    this.currentBackend = this.config.backend
    this.metrics = this.initializeMetrics()
    this.callbacks = {
      onTranscript: options.onTranscript,
      onProgress: options.onProgress,
      onError: options.onError,
    }
  }

  /**
   * Initialize the STT engine
   */
  async initialize(): Promise<void> {
    this.setStatus('initializing')

    try {
      // Initialize the primary backend
      const backend = await this.getBackend(this.currentBackend)
      if (backend && typeof backend.initialize === 'function') {
        await backend.initialize()
      }

      this.setStatus('ready')
    } catch (error) {
      this.handleError(error as Error)
      throw error
    }
  }

  /**
   * Transcribe audio data
   */
  async transcribe(
    request: TranscriptionRequest,
    options?: { backend?: STTBackend }
  ): Promise<Transcript> {
    const backend = options?.backend || this.currentBackend

    this.setStatus('transcribing')
    this.metrics.totalTranscriptions++

    const startTime = Date.now()

    try {
      // Try primary backend
      const result = await this.transcribeWithBackend(backend, request)

      // Update metrics
      const processingTime = Date.now() - startTime
      this.metrics.successfulTranscriptions++
      this.metrics.averageProcessingTime =
        (this.metrics.averageProcessingTime * (this.metrics.successfulTranscriptions - 1) +
          processingTime) /
        this.metrics.successfulTranscriptions
      this.metrics.averageRealtimeFactor =
        processingTime / result.metadata.audioLength

      this.setStatus('ready')
      this.callbacks.onTranscript?.(result)

      return result
    } catch (error) {
      return this.handleTranscriptionError(error as Error, request, startTime)
    }
  }

  /**
   * Real-time transcription (streaming)
   */
  async startRealtimeTranscription(
    onPartialResult: (text: string) => void,
    options?: {
      language?: string
      chunkDuration?: number
    }
  ): Promise<() => Promise<void>> {
    const backend = this.backends.get(this.currentBackend)

    if (!backend || !backend.supportsRealtime) {
      throw new STTError(
        'browser-not-supported',
        `Backend ${this.currentBackend} does not support real-time transcription`
      )
    }

    if (typeof backend.startRealtimeTranscription !== 'function') {
      throw new STTError(
        'browser-not-supported',
        'Real-time transcription not implemented for this backend'
      )
    }

    return backend.startRealtimeTranscription(onPartialResult, options)
  }

  /**
   * Get current status
   */
  getStatus(): STTStatus {
    return this.status
  }

  /**
   * Get capabilities of current backend
   */
  getCapabilities(): STTCapabilities {
    const backend = this.backends.get(this.currentBackend)
    return backend?.getCapabilities() || {
      supportsRealtime: false,
      supportsBatch: false,
      supportsDiarization: false,
      supportsTranslation: false,
      maxAudioLength: 0,
      supportedLanguages: [],
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): STTMetrics {
    return { ...this.metrics }
  }

  /**
   * Switch to a different backend
   */
  async switchBackend(backend: STTBackend): Promise<void> {
    if (backend === this.currentBackend) return

    this.currentBackend = backend

    // Initialize new backend if needed
    const backendInstance = await this.getBackend(backend)
    if (backendInstance && typeof backendInstance.initialize === 'function') {
      await backendInstance.initialize()
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<STTConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    for (const [name, backend] of this.backends) {
      if (backend && typeof backend.cleanup === 'function') {
        await backend.cleanup()
      }
    }
    this.backends.clear()
    this.setStatus('idle')
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private setStatus(status: STTStatus): void {
    this.status = status
    this.callbacks.onProgress?.({
      requestId: 'system',
      status,
      progress: 0,
    })
  }

  private async getBackend(backend: STTBackend): Promise<any> {
    if (this.backends.has(backend)) {
      return this.backends.get(backend)
    }

    let backendInstance: any

    switch (backend) {
      case 'whisper-local':
        const { WhisperLocalEngine } = await import('./whisper-wrapper')
        backendInstance = new WhisperLocalEngine(this.config)
        break

      case 'whisper-cloudflare':
        // Will be implemented in cloudflare-whisper.ts
        // const { CloudflareWhisperEngine } = await import('./cloudflare-whisper')
        // backendInstance = new CloudflareWhisperEngine(this.config)
        throw new STTError(
          'api-key-missing',
          'Cloudflare Whisper backend not yet implemented'
        )

      case 'whisper-openai':
        // Will be implemented in openai-whisper.ts
        // const { OpenAIWhisperEngine } = await import('./openai-whisper')
        // backendInstance = new OpenAIWhisperEngine(this.config)
        throw new STTError(
          'api-key-missing',
          'OpenAI Whisper backend not yet implemented'
        )

      case 'deepgram':
        // Will be implemented in deepgram.ts
        // const { DeepgramEngine } = await import('./deepgram')
        // backendInstance = new DeepgramEngine(this.config)
        throw new STTError(
          'api-key-missing',
          'Deepgram backend not yet implemented'
        )

      default:
        throw new STTError('unknown', `Unknown backend: ${backend}`)
    }

    this.backends.set(backend, backendInstance)
    return backendInstance
  }

  private async transcribeWithBackend(
    backend: STTBackend,
    request: TranscriptionRequest
  ): Promise<Transcript> {
    const backendInstance = await this.getBackend(backend)

    if (!backendInstance) {
      throw new STTError('unknown', `Backend ${backend} not available`)
    }

    if (typeof backendInstance.transcribe !== 'function') {
      throw new STTError('unknown', `Backend ${backend} does not support transcription`)
    }

    return backendInstance.transcribe(request, {
      onProgress: (progress: TranscriptionProgress) => {
        this.callbacks.onProgress?.(progress)
      },
    })
  }

  private async handleTranscriptionError(
    error: Error,
    request: TranscriptionRequest,
    startTime: number
  ): Promise<Transcript> {
    this.metrics.failedTranscriptions++

    // Try fallback backends if enabled
    if (this.fallbackStrategy.enabled && this.fallbackStrategy.backends.length > 1) {
      const currentIndex = this.fallbackStrategy.backends.indexOf(this.currentBackend)

      for (let i = currentIndex + 1; i < this.fallbackStrategy.backends.length; i++) {
        const fallbackBackend = this.fallbackStrategy.backends[i]

        try {
          console.log(`STT: Falling back to ${fallbackBackend}`)
          return await this.transcribeWithBackend(fallbackBackend, request)
        } catch (fallbackError) {
          console.error(`STT: Fallback to ${fallbackBackend} failed:`, fallbackError)
        }
      }
    }

    // All fallbacks failed
    this.handleError(error)
    throw error
  }

  private handleError(error: Error): void {
    this.setStatus('error')
    this.callbacks.onError?.(
      error instanceof STTError
        ? error
        : new STTError('unknown', error.message, { originalError: error })
    )
  }

  private initializeMetrics(): STTMetrics {
    return {
      totalTranscriptions: 0,
      successfulTranscriptions: 0,
      failedTranscriptions: 0,
      averageProcessingTime: 0,
      averageRealtimeFactor: 0,
      modelLoadTime: 0,
      cacheHitRate: 0,
    }
  }
}

// Re-export STTError for convenience
export { STTError } from './stt-types'
