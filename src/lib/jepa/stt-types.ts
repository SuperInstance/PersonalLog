/**
 * JEPA STT (Speech-to-Text) Type Definitions
 *
 * Types for Whisper.cpp integration, transcription pipeline, and model management.
 */

// ============================================================================
// STT ENGINE TYPES
// ============================================================================

export type STTBackend = 'whisper-local' | 'whisper-cloudflare' | 'whisper-openai' | 'deepgram'

export type STTStatus = 'idle' | 'initializing' | 'ready' | 'loading-model' | 'transcribing' | 'error'

export type WhisperModelSize = 'tiny' | 'base' | 'small' | 'medium' | 'large'

export interface STTConfig {
  backend: STTBackend
  modelSize: WhisperModelSize
  language: string
  enableTimestamps: boolean
  enableTranslation: boolean
  maxAudioLength: number // seconds
}

export interface STTCapabilities {
  supportsRealtime: boolean
  supportsBatch: boolean
  supportsDiarization: boolean
  supportsTranslation: boolean
  maxAudioLength: number
  supportedLanguages: string[]
}

// ============================================================================
// TRANSCRIPT TYPES
// ============================================================================

export interface TranscriptSegment {
  id: string
  text: string
  startTime: number // milliseconds
  endTime: number // milliseconds
  confidence: number // 0-1
  speaker?: string // if diarization enabled
}

export interface Transcript {
  id: string
  text: string
  segments: TranscriptSegment[]
  language: string
  duration: number // milliseconds
  confidence: number // 0-1
  metadata: TranscriptMetadata
}

export interface TranscriptMetadata {
  backend: STTBackend
  modelSize: WhisperModelSize
  createdAt: string
  processingTime: number // milliseconds
  audioLength: number // milliseconds
  wordCount: number
}

// ============================================================================
// MODEL MANAGEMENT TYPES
// ============================================================================

export interface WhisperModelInfo {
  name: string
  size: WhisperModelSize
  url: string
  fileSize: number // bytes
  sha256?: string
  description: string
  languages: string[]
}

export interface ModelDownloadProgress {
  modelName: string
  downloadedBytes: number
  totalBytes: number
  percentage: number
  speed: number // bytes/second
  remainingTime: number // seconds
}

export type ModelDownloadStatus = 'idle' | 'downloading' | 'completed' | 'failed'

export interface ModelState {
  status: ModelDownloadStatus
  progress?: ModelDownloadProgress
  error?: string
  availableModels: WhisperModelInfo[]
  downloadedModels: WhisperModelSize[]
}

// ============================================================================
// TRANSCRIPTION REQUEST TYPES
// ============================================================================

export interface TranscriptionRequest {
  id: string
  audioData: ArrayBuffer | Float32Array
  format: 'wav' | 'mp3' | 'ogg' | 'webm'
  sampleRate: number
  language?: string
  enableTimestamps: boolean
  enableWordTimestamps: boolean
  enableTranslation?: boolean
  targetLanguage?: string
}

export interface TranscriptionProgress {
  requestId: string
  status: STTStatus
  progress: number // 0-1
  currentSegment?: number
  totalSegments?: number
  partialText?: string
}

// ============================================================================
// API TYPES (Cloudflare/OpenAI/Deepgram)
// ============================================================================

export interface CloudflareWhisperConfig {
  accountId: string
  apiToken: string
  model: 'base' | 'small'
}

export interface OpenAIWhisperConfig {
  apiKey: string
  model: 'whisper-1'
}

export interface DeepgramConfig {
  apiKey: string
  model: string
  language: string
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type STTErrorType =
  | 'model-not-found'
  | 'model-download-failed'
  | 'audio-capture-failed'
  | 'audio-format-unsupported'
  | 'transcription-failed'
  | 'api-key-missing'
  | 'api-quota-exceeded'
  | 'network-error'
  | 'browser-not-supported'
  | 'permission-denied'
  | 'initialization-failed'
  | 'unknown'

export class STTError extends Error {
  constructor(
    public type: STTErrorType,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'STTError'
  }
}

// ============================================================================
// CALLBACK TYPES
// ============================================================================

export type TranscriptCallback = (transcript: Transcript) => void
export type ProgressCallback = (progress: TranscriptionProgress) => void
export type ErrorCallback = (error: STTError) => void
export type PartialTranscriptCallback = (partialText: string) => void

// ============================================================================
// REAL-TIME TRANSCRIPTION TYPES
// ============================================================================

export interface RealtimeTranscriptionSession {
  id: string
  isActive: boolean
  startTime: number
  audioChunks: Array<{
    data: Float32Array
    timestamp: number
  }>
  currentTranscript: string
  segments: TranscriptSegment[]
}

export interface RealtimeTranscriptionOptions {
  language?: string
  enablePartialResults: boolean
  enableInterimResults: boolean
  chunkDuration: number // milliseconds
  maxDelay: number // milliseconds
}

// ============================================================================
// FALLBACK STRATEGY TYPES
// ============================================================================

export interface FallbackStrategy {
  enabled: boolean
  backends: STTBackend[]
  retryOnFailure: boolean
  maxRetries: number
  timeout: number // milliseconds
}

// ============================================================================
// PERFORMANCE METRICS
// ============================================================================

export interface STTMetrics {
  totalTranscriptions: number
  successfulTranscriptions: number
  failedTranscriptions: number
  averageProcessingTime: number
  averageRealtimeFactor: number // processing time / audio duration
  modelLoadTime: number
  cacheHitRate: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const WHISPER_SAMPLE_RATE = 16000
export const WHISPER_CHANNELS = 1

export const DEFAULT_STT_CONFIG: STTConfig = {
  backend: 'whisper-local',
  modelSize: 'tiny',
  language: 'en',
  enableTimestamps: true,
  enableTranslation: false,
  maxAudioLength: 300, // 5 minutes
}

export const WHISPER_MODELS: Record<WhisperModelSize, WhisperModelInfo> = {
  tiny: {
    name: 'whisper-tiny',
    size: 'tiny',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
    fileSize: 40 * 1024 * 1024, // 40MB
    description: 'Fastest model, English-only, good for real-time',
    languages: ['en'],
  },
  base: {
    name: 'whisper-base',
    size: 'base',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
    fileSize: 80 * 1024 * 1024, // 80MB
    description: 'Balanced speed and accuracy, English-only',
    languages: ['en'],
  },
  small: {
    name: 'whisper-small',
    size: 'small',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin',
    fileSize: 250 * 1024 * 1024, // 250MB
    description: 'Better accuracy, English-only',
    languages: ['en'],
  },
  medium: {
    name: 'whisper-medium',
    size: 'medium',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en.bin',
    fileSize: 520 * 1024 * 1024, // 520MB
    description: 'High accuracy, English-only',
    languages: ['en'],
  },
  large: {
    name: 'whisper-large-v3',
    size: 'large',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin',
    fileSize: 1024 * 1024 * 1024, // 1GB
    description: 'Best accuracy, multilingual (99 languages)',
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'],
  },
}

export const STT_CAPABILITIES: Record<STTBackend, STTCapabilities> = {
  'whisper-local': {
    supportsRealtime: true,
    supportsBatch: true,
    supportsDiarization: false,
    supportsTranslation: true,
    maxAudioLength: 600,
    supportedLanguages: WHISPER_MODELS.large.languages,
  },
  'whisper-cloudflare': {
    supportsRealtime: false,
    supportsBatch: true,
    supportsDiarization: false,
    supportsTranslation: false,
    maxAudioLength: 300,
    supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja'],
  },
  'whisper-openai': {
    supportsRealtime: false,
    supportsBatch: true,
    supportsDiarization: false,
    supportsTranslation: false,
    maxAudioLength: 600,
    supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja'],
  },
  deepgram: {
    supportsRealtime: true,
    supportsBatch: true,
    supportsDiarization: true,
    supportsTranslation: false,
    maxAudioLength: 3600,
    supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'],
  },
}
