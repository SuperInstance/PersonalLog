/**
 * JEPA Real-Time Sentiment Analysis
 *
 * A comprehensive sentiment analysis library for audio and text using
 * JEPA (Joint Embedding Predictive Architecture) with VAD (Valence-Arousal-Dominance) scoring.
 *
 * @packageDocumentation
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  // Core types
  SentimentCategory,
  SentimentResult,
  VADCoordinates,
  SentimentMetadata,

  // Audio types
  AudioFeatures,
  SpectralFeatures,
  ProsodicFeatures,

  // Text types
  TextSentimentDetection,
  SentimentPattern,
  TextContextWindow,

  // Storage types
  SentimentRecording,
  SentimentStatistics,
  Statistic,
  SentimentTrendPattern,
  SentimentQuery,

  // Model types
  SentimentModelConfig,
  SentimentInferenceOptions,
  SentimentInferenceResult,

  // Error types
  SentimentAnalysisError,
  SentimentErrorCode,

  // WebGPU types
  WebGPUConfig,
  WebGPUDeviceInfo,
  WebGPUPerformanceMetrics,
  WebGPUComputePipeline,
  WebGPUMemoryBuffers,
  WebGPUInferenceResult,
} from './types'

// ============================================================================
// TEXT SENTIMENT ANALYSIS EXPORTS
// ============================================================================

export {
  detectSentiment,
  detectSentimentsBatch,
  extractEmojis,
  getSentimentTypes,
  getSentimentPattern,
  isPositiveSentiment,
  isHighArousal,
  getSentimentIntensity,
} from './text-sentiment-analyzer'

// ============================================================================
// WEBGPU SENTIMENT ANALYSIS EXPORTS
// ============================================================================

export {
  WebGPUSentimentAnalyzer,
  isWebGPUAvailable,
  createWebGPUSentimentAnalyzer,
  detectSentimentGPU,
} from './webgpu-sentiment-analyzer'

// ============================================================================
// VERSION
// ============================================================================

export const VERSION = '1.0.0'
export const PACKAGE_NAME = '@superinstance/jepa-real-time-sentiment-analysis'
