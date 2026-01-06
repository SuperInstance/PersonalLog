/**
 * JEPA (Joint Embedding Predictive Architecture) - Audio Capture Types
 *
 * Type definitions for audio capture, buffering, and transcription system.
 */

// ============================================================================
// AUDIO CONFIGURATION
// ============================================================================

export const AUDIO_CONFIG = {
  /**
   * Sample rate in Hz (44.1kHz = CD quality)
   */
  SAMPLE_RATE: 44100,

  /**
   * Bit depth for audio processing (16-bit)
   */
  BIT_DEPTH: 16,

  /**
   * Number of audio channels (1 = mono for speech)
   */
  CHANNELS: 1,

  /**
   * Buffer window size in milliseconds (64ms for JEPA processing)
   */
  BUFFER_WINDOW_MS: 64,

  /**
   * Buffer window size in samples
   * Calculated as: (SAMPLE_RATE * BUFFER_WINDOW_MS) / 1000
   * (44100 * 64) / 1000 = 2822.4 samples ≈ 2822 samples
   */
  BUFFER_WINDOW_SAMPLES: 2822,

  /**
   * Preferred MIME type for audio recording
   */
  PREFERRED_MIME_TYPE: 'audio/webm;codecs=opus',

  /**
   * Fallback MIME types if preferred is not supported
   */
  FALLBACK_MIME_TYPES: [
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/mp3',
    'audio/wav',
  ],
} as const

// ============================================================================
// RECORDING STATE
// ============================================================================

export type RecordingState =
  | 'idle'       // Not recording, no permissions requested yet
  | 'requesting' // Requesting microphone permissions
  | 'ready'      // Permissions granted, ready to record
  | 'recording'  // Currently recording audio
  | 'paused'     // Recording paused
  | 'stopped'    // Recording stopped, buffers available
  | 'error'      // Error occurred

export interface AudioState {
  state: RecordingState
  error?: string
  permissionsGranted: boolean
  duration: number // Recording duration in milliseconds
  bufferSize: number // Number of buffered audio windows
}

// ============================================================================
// AUDIO DATA TYPES
// ============================================================================

/**
 * Single audio buffer window (64ms of audio data)
 */
export interface AudioWindow {
  /**
   * Float32Array of audio samples
   * Length: BUFFER_WINDOW_SAMPLES (2822 samples at 44.1kHz)
   */
  samples: Float32Array

  /**
   * Timestamp when this window was captured (relative to recording start)
   */
  timestamp: number

  /**
   * Window index in the recording sequence
   */
  index: number
}

/**
 * Complete audio recording with metadata
 */
export interface AudioRecording {
  /**
   * Unique identifier for this recording
   */
  id: string

  /**
   * Array of audio windows (64ms each)
   */
  windows: AudioWindow[]

  /**
   * Recording metadata
   */
  metadata: AudioMetadata

  /**
   * Raw audio blob (for export/backup)
   */
  blob?: Blob
}

/**
 * Metadata about an audio recording
 */
export interface AudioMetadata {
  /**
   * When recording started
   */
  startTime: string

  /**
   * When recording ended
   */
  endTime: string

  /**
   * Duration in milliseconds
   */
  duration: number

  /**
   * Sample rate in Hz
   */
  sampleRate: number

  /**
   * Number of channels
   */
  channels: number

  /**
   * MIME type of the audio format
   */
  mimeType: string

  /**
   * Number of audio windows captured
   */
  windowCount: number

  /**
   * Audio levels (min/max/average for visualization)
   */
  levels: AudioLevels
}

/**
 * Audio level metrics for visualization
 */
export interface AudioLevels {
  /**
   * Minimum amplitude (0.0 to 1.0)
   */
  min: number

  /**
   * Maximum amplitude (0.0 to 1.0)
   */
  max: number

  /**
   * Average amplitude (0.0 to 1.0)
   */
  average: number

  /**
   * Per-window levels for waveform visualization
   */
  waveform: number[]
}

// ============================================================================
// MICROPHONE DEVICES
// ============================================================================

export interface MicrophoneDevice {
  deviceId: string
  label: string
  groupId?: string
}

// ============================================================================
// AUDIO CONTEXT TYPES
// ============================================================================

export interface AudioContextConfig {
  sampleRate: number
  latencyHint: 'interactive' | 'balanced' | 'playback' | number
}

// ============================================================================
// CALLBACK TYPES
// ============================================================================

export type AudioDataCallback = (window: AudioWindow) => void
export type RecordingStateCallback = (state: AudioState) => void
export type ErrorCallback = (error: Error) => void

// ============================================================================
// HELPER TYPES
// ============================================================================

export type RecordingId = string & { readonly __brand: 'RecordingId' }

export function createRecordingId(): RecordingId {
  return `rec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}` as RecordingId
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class AudioCaptureError extends Error {
  constructor(
    message: string,
    public code: AudioErrorCode,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'AudioCaptureError'
  }
}

export type AudioErrorCode =
  | 'PERMISSION_DENIED'
  | 'DEVICE_NOT_FOUND'
  | 'UNSUPPORTED_BROWSER'
  | 'INITIALIZATION_FAILED'
  | 'RECORDING_FAILED'
  | 'CONTEXT_CLOSED'
  | 'BUFFER_OVERFLOW'
  | 'INVALID_CONFIG'

// ============================================================================
// EMOTION TYPES
// ============================================================================

/**
 * Emotion categories based on VAD model
 */
export type EmotionCategory =
  | 'excited'    // High valence, high arousal
  | 'happy'      // High valence, medium arousal
  | 'calm'       // High valence, low arousal
  | 'relaxed'    // Medium valence, low arousal
  | 'neutral'    // Medium valence, medium arousal
  | 'bored'      // Low valence, low arousal
  | 'sad'        // Low valence, medium arousal
  | 'angry'      // Low valence, high arousal
  | 'anxious'    // Medium valence, high arousal
  | 'tense'      // Low valence, high arousal

/**
 * Emotion analysis result from JEPA model
 */
export interface EmotionResult {
  /**
   * Valence (positive/negative) score (0-1)
   * 0 = most negative, 1 = most positive
   */
  valence: number

  /**
   * Arousal (intensity) score (0-1)
   * 0 = calm/relaxed, 1 = excited/agitated
   */
  arousal: number

  /**
   * Dominance (control) score (0-1)
   * 0 = submissive/weak, 1 = dominant/powerful
   */
  dominance: number

  /**
   * Categorized emotion label
   */
  emotion: EmotionCategory

  /**
   * Confidence score (0-1)
   */
  confidence: number

  /**
   * Detected language (optional)
   */
  language?: string
}

/**
 * VAD (Valence-Arousal-Dominance) coordinates
 */
export interface VADCoordinates {
  valence: number
  arousal: number
  dominance: number
}

/**
 * Emotion metadata for storage
 */
export interface EmotionMetadata {
  recordingId: string
  timestamp: number
  duration: number
  language: string
  conversationId?: string
  agentId?: string
}
