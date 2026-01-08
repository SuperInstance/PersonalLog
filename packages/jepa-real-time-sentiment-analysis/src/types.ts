/**
 * JEPA (Joint Embedding Predictive Architecture) - Sentiment Analysis Types
 *
 * Type definitions for sentiment analysis from audio and text.
 * Uses VAD (Valence-Arousal-Dominance) model for sentiment classification.
 */

// ============================================================================
// SENTIMENT CATEGORY TYPES
// ============================================================================

/**
 * Sentiment categories based on VAD (Valence-Arousal-Dominance) model
 *
 * These categories represent different sentiment states in a multi-dimensional
 * affective space:
 * - Valence: Positive vs Negative (0 = negative, 1 = positive)
 * - Arousal: High vs Low energy/intensity (0 = calm, 1 = excited/agitated)
 * - Dominance: Control vs Submissive (0 = weak, 1 = dominant/powerful)
 */
export type SentimentCategory =
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

// ============================================================================
// SENTIMENT ANALYSIS RESULT TYPES
// ============================================================================

/**
 * Sentiment analysis result from JEPA model
 *
 * Represents a complete sentiment assessment with VAD coordinates
 * and categorical classification.
 */
export interface SentimentResult {
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
   * Categorized sentiment label
   */
  sentiment: SentimentCategory

  /**
   * Confidence score (0-1)
   * Higher values indicate greater certainty in the classification
   */
  confidence: number

  /**
   * Detected language (optional)
   * ISO 639-1 language code (e.g., 'en', 'es', 'fr')
   */
  language?: string
}

/**
 * VAD (Valence-Arousal-Dominance) coordinates
 *
 * Raw dimensional representation of sentiment without categorization
 */
export interface VADCoordinates {
  valence: number
  arousal: number
  dominance: number
}

/**
 * Sentiment metadata for storage
 *
 * Additional context information for sentiment recordings
 */
export interface SentimentMetadata {
  recordingId: string
  timestamp: number
  duration: number
  language: string
  conversationId?: string
  agentId?: string
}

// ============================================================================
// AUDIO-RELATED TYPES
// ============================================================================

/**
 * Audio features for sentiment analysis
 *
 * Extracted acoustic features used as input to the sentiment model
 */
export interface AudioFeatures {
  mfcc: number[]
  spectral: SpectralFeatures
  prosodic: ProsodicFeatures
}

/**
 * Spectral features from audio
 *
 * Frequency-domain characteristics of the audio signal
 */
export interface SpectralFeatures {
  centroid: number
  bandwidth: number
  flux: number
  rolloff: number
  zcr: number
}

/**
 * Prosodic features from audio
 *
 * Melody, rhythm, and intonation characteristics
 */
export interface ProsodicFeatures {
  energy: number
  pitch: number
  jitter: number
  shimmer: number
}

// ============================================================================
// TEXT-RELATED TYPES
// ============================================================================

/**
 * Sentiment pattern for text analysis
 *
 * Defines keyword, emoji, and punctuation patterns associated with each sentiment
 */
export interface SentimentPattern {
  /** Words/phrases indicating this sentiment */
  keywords: string[]
  /** Emojis indicating this sentiment */
  emojis: string[]
  /** Punctuation patterns */
  punctuation?: string[]
  /** Weight for this pattern (higher = stronger signal) */
  weight: number
  /** VAD values for this sentiment */
  vad: { valence: number; arousal: number; dominance: number }
  /** Type identifier */
  type?: string
  /** Description */
  description?: string
  /** Confidence score */
  confidence?: number
}

/**
 * Sentiment detection from text
 *
 * Result of analyzing text for sentiment content
 */
export interface TextSentimentDetection {
  /** Primary sentiment detected */
  sentiment: SentimentCategory
  /** Secondary sentiments detected (if any) */
  secondarySentiments?: Array<{ sentiment: SentimentCategory; confidence: number }>
  /** Valence: positive (0.6-1.0) vs negative (0.0-0.4) */
  valence: number
  /** Arousal: energy/intensity (0.0-1.0) */
  arousal: number
  /** Dominance: confidence/assertiveness (0.0-1.0) */
  dominance: number
  /** Overall confidence in detection (0.0-1.0) */
  confidence: number
  /** Evidence supporting this detection */
  evidence: string[]
}

/**
 * Context window for text sentiment analysis
 *
 * Provides conversation context for more accurate sentiment detection
 */
export interface TextContextWindow {
  /** Previous messages in conversation */
  previousMessages: Array<{ text: string; sentiment?: SentimentCategory; speaker?: string }>
  /** Current speaker */
  speaker: string
  /** Conversation topic (if known) */
  topic?: string
}

// ============================================================================
// STORAGE TYPES
// ============================================================================

/**
 * Sentiment recording for storage
 *
 * Complete sentiment data with metadata for persistence
 */
export interface SentimentRecording {
  id: string
  timestamp: number
  duration: number

  // Sentiment scores
  valence: number
  arousal: number
  dominance: number

  // Computed
  sentiment: string
  confidence: number

  // Context
  conversationId?: string
  agentId?: string
  language: string

  // Metadata
  hasAudio: boolean
  audioPath?: string
  transcript?: string
}

/**
 * Sentiment statistics
 *
 * Aggregated statistics across multiple sentiment recordings
 */
export interface SentimentStatistics {
  valence: Statistic
  arousal: Statistic
  dominance: Statistic
  sentimentDistribution: Record<string, number>
}

/**
 * Statistical measures
 */
export interface Statistic {
  mean: number
  std: number
  min: number
  max: number
  median: number
}

/**
 * Sentiment trend pattern detected over time
 *
 * Recurrent patterns in sentiment data
 */
export interface SentimentTrendPattern {
  type: string
  description: string
  confidence: number
  hour?: number
  dayOfWeek?: string
  suggestions?: string[]
}

/**
 * Query for sentiment data
 *
 * Filters for querying stored sentiment recordings
 */
export interface SentimentQuery {
  startDate?: Date
  endDate?: Date
  conversationId?: string
  agentId?: string
  sentiment?: string
  minValence?: number
  maxValence?: number
  minArousal?: number
  maxArousal?: number
}

// ============================================================================
// MODEL TYPES
// ============================================================================

/**
 * Model configuration for JEPA sentiment model
 */
export interface SentimentModelConfig {
  modelSize: 'tiny' | 'base' | 'small' | 'medium' | 'large'
  sampleRate: number
  bufferSize: number
  enableStreaming: boolean
}

/**
 * Inference options
 */
export interface SentimentInferenceOptions {
  includeSecondarySentiments?: boolean
  minimumConfidence?: number
  timeout?: number
}

/**
 * Inference result
 */
export interface SentimentInferenceResult {
  sentiment: SentimentCategory
  vad: VADCoordinates
  confidence: number
  inferenceTime: number
  featureExtractionTime: number
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Sentiment analysis error
 */
export class SentimentAnalysisError extends Error {
  constructor(
    message: string,
    public code: SentimentErrorCode,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'SentimentAnalysisError'
  }
}

export type SentimentErrorCode =
  | 'MODEL_NOT_LOADED'
  | 'FEATURE_EXTRACTION_FAILED'
  | 'INFERENCE_FAILED'
  | 'INVALID_AUDIO_FORMAT'
  | 'STORAGE_ERROR'
  | 'QUERY_FAILED'
