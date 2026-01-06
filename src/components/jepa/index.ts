/**
 * JEPA Components - Public API
 *
 * Exports all JEPA-related React components.
 */

// Recording Controls
export {
  RecordingControls,
  CompactRecordingControls,
  type RecordingControlsProps,
  type CompactRecordingControlsProps,
} from './RecordingControls'

// Recording Status
export {
  RecordingStatus,
  RecordingStatusBadge,
  RecordingPulse,
  type RecordingStatusProps,
  type RecordingStatusBadgeProps,
  type RecordingPulseProps,
} from './RecordingStatus'

// Timestamp
export { Timestamp, type TimestampProps } from './Timestamp'

// Audio Controls (existing)
export { AudioControls } from './AudioControls'

// Export Controls (existing)
export { ExportControls, ExportButton } from './ExportControls'

// Audio Visualization
export {
  AudioVisualizer,
  type AudioVisualizerProps,
} from './AudioVisualizer'

// Spectrogram
export {
  Spectrogram,
  type SpectrogramProps,
} from './Spectrogram'

// Realtime Visualizer
export {
  RealtimeVisualizer,
  CompactRealtimeVisualizer,
  type RealtimeVisualizerProps,
  type CompactRealtimeVisualizerProps,
} from './RealtimeVisualizer'

// Emotion Legend
export {
  EmotionLegend,
  CompactEmotionLegend,
  EmotionBadge,
  EmotionIcon,
  EmotionStats,
  type EmotionLegendProps,
  type CompactEmotionLegendProps,
  type EmotionBadgeProps,
  type EmotionIconProps,
  type EmotionStatsProps,
} from './EmotionLegend'
