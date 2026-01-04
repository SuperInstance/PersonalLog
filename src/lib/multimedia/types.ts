/**
 * Multi-Media Type Definitions
 *
 * Complete type system for multi-modal AI support including images, audio, and video.
 */

// ============================================================================
// MEDIA TYPES
// ============================================================================

export type MediaType = 'image' | 'audio' | 'video' | 'file'

export type ImageFormat = 'png' | 'jpg' | 'jpeg' | 'webp' | 'gif' | 'svg'
export type AudioFormat = 'mp3' | 'wav' | 'webm' | 'ogg' | 'm4a'
export type VideoFormat = 'mp4' | 'webm' | 'mov' | 'avi' | 'mkv'

export type MediaStatus = 'uploading' | 'processing' | 'ready' | 'error'

export type ImageGenerationProvider = 'dalle' | 'stable-diffusion' | 'midjourney'
export type AudioGenerationProvider = 'elevenlabs' | 'openai' | 'google'
export type TranscriptionProvider = 'whisper' | 'google' | 'deepgram'

// ============================================================================
// MEDIA ATTACHMENT
// ============================================================================

export interface MediaAttachment {
  id: string
  type: MediaType
  url: string
  thumbnail?: string
  mimeType: string
  size: number
  name: string
  status: MediaStatus
  metadata?: MediaMetadata
  createdAt: string
}

export interface MediaMetadata {
  width?: number
  height?: number
  duration?: number // for audio/video in seconds
  format?: ImageFormat | AudioFormat | VideoFormat
  bitrate?: number // for audio/video
  fps?: number // for video
  aspectRatio?: string
  caption?: string
  alt?: string
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================

export interface ImageGenerationRequest {
  prompt: string
  negativePrompt?: string
  provider: ImageGenerationProvider
  model?: string
  size?: ImageSize
  style?: string
  quality?: 'standard' | 'hd'
  numberOfImages?: number
  seed?: number
}

export type ImageSize =
  | '256x256'
  | '512x512'
  | '1024x1024'
  | '1792x1024'
  | '1024x1792'

export interface ImageGenerationResponse {
  images: GeneratedImage[]
  provider: ImageGenerationProvider
  model: string
  tokensUsed?: number
  cost?: number
}

export interface GeneratedImage {
  url: string
  revisedPrompt?: string
  seed?: number
}

// ============================================================================
// AUDIO GENERATION (TEXT-TO-SPEECH)
// ============================================================================

export interface AudioGenerationRequest {
  text: string
  provider: AudioGenerationProvider
  voice: string
  speed?: number
  outputFormat?: AudioFormat
}

export interface AudioGenerationResponse {
  audioUrl: string
  duration: number
  provider: AudioGenerationProvider
  voice: string
  tokensUsed?: number
  cost?: number
}

export interface Voice {
  id: string
  name: string
  provider: AudioGenerationProvider
  language: string
  gender: 'male' | 'female' | 'neutral'
  sampleUrl?: string
}

// ============================================================================
// AUDIO TRANSCRIPTION (SPEECH-TO-TEXT)
// ============================================================================

export interface TranscriptionRequest {
  audioUrl: string
  provider: TranscriptionProvider
  language?: string
  diarization?: boolean // Identify different speakers
  timestamps?: boolean
}

export interface TranscriptionResponse {
  text: string
  provider: TranscriptionProvider
  language: string
  duration: number
  segments?: TranscriptionSegment[]
  speakers?: string[]
  confidence?: number
}

export interface TranscriptionSegment {
  text: string
  speaker?: string
  startTime: number
  endTime: number
  confidence: number
}

// ============================================================================
// VIDEO PROCESSING
// ============================================================================

export interface VideoProcessingRequest {
  videoUrl: string
  operations: VideoOperation[]
}

export type VideoOperation =
  | { type: 'transcribe' }
  | { type: 'extract-frames'; count: number }
  | { type: 'generate-thumbnail'; timestamp: number }
  | { type: 'compress'; quality: number }

export interface VideoProcessingResponse {
  originalUrl: string
  transcript?: TranscriptionResponse
  frames?: string[] // image URLs
  thumbnail?: string
  compressedUrl?: string
}

// ============================================================================
// VISION (IMAGE ANALYSIS)
// ============================================================================

export interface VisionRequest {
  imageUrl: string
  prompt: string
  maxTokens?: number
  detail?: 'low' | 'high' | 'auto'
}

export interface VisionResponse {
  description: string
  model: string
  tokensUsed: {
    input: number
    output: number
    total: number
  }
  cost?: number
}

// ============================================================================
// MEDIA UPLOAD
// ============================================================================

export interface MediaUploadOptions {
  maxSize?: number // in bytes
  allowedTypes?: MediaType[]
  generateThumbnail?: boolean
  compress?: boolean
}

export interface MediaUploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface MediaUploadResult {
  media: MediaAttachment
  thumbnail?: string
}

// ============================================================================
// MULTI-MODAL MESSAGE
// ============================================================================

export interface MultiModalMessage {
  text?: string
  media?: MediaAttachment[]
  audio?: MediaAttachment
  video?: MediaAttachment
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class MediaError extends Error {
  constructor(
    message: string,
    public code: MediaErrorCode,
    public details?: any
  ) {
    super(message)
    this.name = 'MediaError'
  }
}

export type MediaErrorCode =
  | 'FILE_TOO_LARGE'
  | 'INVALID_FORMAT'
  | 'UPLOAD_FAILED'
  | 'GENERATION_FAILED'
  | 'TRANSCRIPTION_FAILED'
  | 'PROCESSING_FAILED'
  | 'QUOTA_EXCEEDED'
  | 'API_KEY_MISSING'
  | 'NETWORK_ERROR'
  | 'UNSUPPORTED_MEDIA_TYPE'

// ============================================================================
// SETTINGS
// ============================================================================

export interface MultiModalSettings {
  images: ImageSettings
  audio: AudioSettings
  video: VideoSettings
  transcription: TranscriptionSettings
}

export interface ImageSettings {
  generationEnabled: boolean
  defaultProvider: ImageGenerationProvider
  defaultModel: string
  defaultSize: ImageSize
  maxFileSize: number
  autoGenerateCaptions: boolean
}

export interface AudioSettings {
  recordingEnabled: boolean
  transcriptionEnabled: boolean
  generationEnabled: boolean
  defaultVoice: string
  defaultProvider: TranscriptionProvider | AudioGenerationProvider
  maxDuration: number // in seconds
  autoTranscribe: boolean
  keepAudio: boolean
}

export interface VideoSettings {
  uploadEnabled: boolean
  transcriptionEnabled: boolean
  maxFileSize: number
  autoTranscribe: boolean
  generateThumbnails: boolean
}

export interface TranscriptionSettings {
  enabled: boolean
  defaultProvider: TranscriptionProvider
  autoDetectLanguage: boolean
  enableDiarization: boolean
  includeTimestamps: boolean
}

// ============================================================================
// PROVIDER CONFIGS
// ============================================================================

export interface DalleConfig {
  apiKey: string
  model: 'dall-e-2' | 'dall-e-3'
  size: ImageSize
  quality: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
}

export interface StableDiffusionConfig {
  apiKey: string
  model: string
  width: number
  height: number
  steps: number
  cfgScale: number
}

export interface ElevenLabsConfig {
  apiKey: string
  voiceId: string
  model: string
}

export interface WhisperConfig {
  apiKey: string
  model: 'whisper-1' | 'whisper-large-v3'
  language?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function createMediaId(): string {
  return `media_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

export function isImageMedia(media: MediaAttachment): boolean {
  return media.type === 'image'
}

export function isAudioMedia(media: MediaAttachment): boolean {
  return media.type === 'audio'
}

export function isVideoMedia(media: MediaAttachment): boolean {
  return media.type === 'video'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  }
  return extensions[mimeType] || 'bin'
}

export function getMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'
  return 'file'
}
