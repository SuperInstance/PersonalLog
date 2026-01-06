/**
 * JEPA Library - Public API
 *
 * Exports all JEPA (Joint Embedding Predictive Architecture) functionality
 * for audio transcription, speaker identification, and transcript export.
 */

// Audio Capture Types
export * from './types'

// Audio Capture System
export {
  AudioCapture,
  getAudioCapture,
  disposeAudioCapture,
} from './audio-capture'

// Audio Buffer Management
export {
  AudioBuffer,
  createJEPABuffer,
  convertWebAudioBufferToFloat32,
} from './audio-buffer'

// Audio State Management
export {
  AudioStateManager,
  getAudioStateManager,
  resetAudioStateManager,
} from './audio-state'

// Timestamp formatting
export {
  formatTimestamp,
  formatSRTTimestamp,
  parseTimestamp,
  formatDuration,
  formatISODate,
  getCurrentTimestamp,
  calculateElapsedSeconds,
  isValidTimestamp,
  formatTimeForContext,
} from './timestamp-formatter'

// Speaker detection
export {
  detectSpeaker,
  getSpeakerDisplayName,
  getSpeakerColor,
  detectSpeakerChanges,
  groupMessagesBySpeaker,
  calculateSpeakerStats,
  createSpeakerOverride,
  isValidSpeakerOverride,
  mergeSpeakerDetection,
  isHumanSpeaker,
  isAutomatedSpeaker,
  getSpeakerPriority,
  sortSpeakersByPriority,
} from './speaker-detection'

// Markdown formatting
export {
  formatTranscriptToMarkdown,
  formatMessagesToMarkdown,
  downloadMarkdownFile,
  copyMarkdownToClipboard,
  generateTranscriptFilename,
} from './markdown-formatter'

// Emotion storage and tracking
export {
  storeEmotion,
  storeEmotionsBatch,
  getEmotionsByDateRange,
  queryEmotions,
  getEmotion,
  deleteEmotion,
  deleteAllEmotions,
  getEmotionCount,
  exportEmotionsCSV,
  exportEmotionsJSON,
  downloadEmotions,
  closeEmotionDB,
  type EmotionRecording,
  type EmotionStatistics,
  type Statistic,
  type EmotionPattern,
  type EmotionQuery,
} from './emotion-storage'

export {
  EmotionTrendTracker,
} from './emotion-trends'

// Audio Feature Extraction (NEW)
export {
  extractMFCC,
  extractSpectralFeatures,
  extractProsodicFeatures,
  normalizeFeatures,
  type AudioFeatures,
  type SpectralFeatures,
  type ProsodicFeatures,
} from './audio-features'

// JEPA Model Integration (NEW)
export {
  JEPAModel,
  getJEPAModel,
  disposeJEPAModel,
  type ModelConfig,
  type InferenceOptions,
  type InferenceResult,
} from './model-integration'

// Emotion Inference Pipeline (NEW)
export {
  EmotionInferencePipeline,
  FallbackEmotionAnalyzer,
  getEmotionPipeline,
  disposeEmotionPipeline,
  analyzeEmotion,
  type EmotionResult,
  type VADScores,
} from './emotion-inference'

// Waveform Rendering (NEW)
export {
  drawWaveform,
  drawEmotionRegions,
  drawPlayhead,
  drawCompleteVisualization,
  exportCanvasAsPNG,
  calculateOptimalZoom,
  timeToX,
  xToTime,
  getEmotionColor,
  getEmotionLabels,
  getEmotionDisplayName,
  type WaveformRenderOptions,
  type EmotionRegion,
  type EmotionLabel,
  type EmotionRenderOptions,
} from './waveform-renderer'

// Spectrogram Rendering (NEW)
export {
  computeFFT,
  applyHammingWindow,
  applyHanningWindow,
  computeSpectrogram,
  computeFrameSpectrogram,
  drawSpectrogram,
  magnitudeToColor,
  binToFrequency,
  frequencyToBin,
  frameToTime,
  timeToFrame,
  type SpectrogramRenderOptions,
  type ColorScheme,
} from './spectrogram-renderer'
