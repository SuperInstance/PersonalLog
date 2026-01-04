/**
 * Media Processing Utilities
 *
 * Core utilities for processing images, audio, and video files.
 */

import {
  MediaAttachment,
  MediaMetadata,
  MediaType,
  MediaError,
  MediaErrorCode,
  createMediaId,
  getFileExtension,
  getMediaType,
  formatFileSize,
} from './types'

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_AUDIO_SIZE = 25 * 1024 * 1024 // 25MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

// ============================================================================
// FILE VALIDATION
// ============================================================================

export interface ValidationResult {
  valid: boolean
  error?: MediaError
}

export function validateFile(file: File): ValidationResult {
  // Check file size
  const mediaType = getMediaType(file.type)
  const maxSize = getMaxFileSize(mediaType)

  if (file.size > maxSize) {
    return {
      valid: false,
      error: new MediaError(
        `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`,
        'FILE_TOO_LARGE',
        { actualSize: file.size, maxSize }
      ),
    }
  }

  // Check file type
  if (!isAllowedFileType(file)) {
    return {
      valid: false,
      error: new MediaError(
        `File type ${file.type} is not supported`,
        'INVALID_FORMAT',
        { fileType: file.type }
      ),
    }
  }

  return { valid: true }
}

export function isAllowedFileType(file: File): boolean {
  const mediaType = getMediaType(file.type)

  switch (mediaType) {
    case 'image':
      return ALLOWED_IMAGE_TYPES.includes(file.type)
    case 'audio':
      return ALLOWED_AUDIO_TYPES.includes(file.type)
    case 'video':
      return ALLOWED_VIDEO_TYPES.includes(file.type)
    default:
      return false
  }
}

export function getMaxFileSize(mediaType: MediaType): number {
  switch (mediaType) {
    case 'image':
      return MAX_IMAGE_SIZE
    case 'audio':
      return MAX_AUDIO_SIZE
    case 'video':
      return MAX_VIDEO_SIZE
    default:
      return DEFAULT_MAX_FILE_SIZE
  }
}

// ============================================================================
// MEDIA METADATA EXTRACTION
// ============================================================================

export async function extractMetadata(
  file: File,
  mediaType: MediaType
): Promise<MediaMetadata> {
  const metadata: MediaMetadata = {
    format: getFileExtension(file.type) as any,
  }

  if (mediaType === 'image') {
    Object.assign(metadata, await extractImageMetadata(file))
  } else if (mediaType === 'audio' || mediaType === 'video') {
    Object.assign(metadata, await extractMediaMetadata(file, mediaType))
  }

  return metadata
}

async function extractImageMetadata(file: File): Promise<Partial<MediaMetadata>> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({
        width: img.width,
        height: img.height,
        aspectRatio: calculateAspectRatio(img.width, img.height),
      })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({})
    }

    img.src = url
  })
}

async function extractMediaMetadata(
  file: File,
  mediaType: MediaType
): Promise<Partial<MediaMetadata>> {
  return new Promise((resolve) => {
    const media = mediaType === 'audio' ? new Audio() : document.createElement('video') as HTMLVideoElement
    const url = URL.createObjectURL(file)

    media.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve({
        duration: media.duration,
      })
    }

    media.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({})
    }

    media.src = url
  })
}

function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
  const divisor = gcd(width, height)
  return `${width / divisor}:${height / divisor}`
}

// ============================================================================
// IMAGE PROCESSING
// ============================================================================

export interface ImageResizeOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0-1
  format?: 'image/jpeg' | 'image/png' | 'image/webp'
}

export async function resizeImage(
  file: File,
  options: ImageResizeOptions = {}
): Promise<Blob> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.9,
    format = 'image/jpeg',
  } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // Calculate new dimensions
      let { width, height } = calculateDimensions(
        img.width,
        img.height,
        maxWidth,
        maxHeight
      )

      // Create canvas
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new MediaError('Failed to get canvas context', 'PROCESSING_FAILED'))
        return
      }

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new MediaError('Failed to resize image', 'PROCESSING_FAILED'))
          }
        },
        format,
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new MediaError('Failed to load image', 'PROCESSING_FAILED'))
    }

    img.src = url
  })
}

function calculateDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height }
  }

  const widthRatio = maxWidth / width
  const heightRatio = maxHeight / height
  const ratio = Math.min(widthRatio, heightRatio)

  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

export async function generateThumbnail(
  file: File,
  size: number = 200
): Promise<string> {
  const resized = await resizeImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
  })

  return URL.createObjectURL(resized)
}

// ============================================================================
// AUDIO PROCESSING
// ============================================================================

export interface AudioProcessingOptions {
  normalize?: boolean
  trim?: boolean
  maxDuration?: number // in seconds
}

export async function processAudio(
  file: File,
  options: AudioProcessingOptions = {}
): Promise<Blob> {
  // Basic implementation - returns original file
  // In production, you'd use Web Audio API for processing
  return new Blob([file], { type: file.type })
}

export async function generateWaveform(
  audioUrl: string
): Promise<number[]> {
  // Generate waveform data for audio visualization
  // Returns array of amplitude values (0-1)
  return []
}

// ============================================================================
// VIDEO PROCESSING
// ============================================================================

export interface VideoProcessingOptions {
  generateThumbnail?: boolean
  thumbnailTimestamp?: number // in seconds
  compress?: boolean
}

export async function processVideo(
  file: File,
  options: VideoProcessingOptions = {}
): Promise<{ blob?: Blob; thumbnail?: string }> {
  const result: { blob?: Blob; thumbnail?: string } = {}

  if (options.generateThumbnail) {
    result.thumbnail = await generateVideoThumbnail(file, options.thumbnailTimestamp)
  }

  if (options.compress) {
    // Video compression would require a library like ffmpeg.wasm
    // For now, return original
    result.blob = new Blob([file], { type: file.type })
  } else {
    result.blob = new Blob([file], { type: file.type })
  }

  return result
}

async function generateVideoThumbnail(
  file: File,
  timestamp: number = 1
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)

    video.currentTime = timestamp

    video.onloadeddata = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new MediaError('Failed to get canvas context', 'PROCESSING_FAILED'))
        return
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          if (blob) {
            resolve(URL.createObjectURL(blob))
          } else {
            reject(new MediaError('Failed to generate thumbnail', 'PROCESSING_FAILED'))
          }
        },
        'image/jpeg',
        0.8
      )
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new MediaError('Failed to load video', 'PROCESSING_FAILED'))
    }

    video.src = url
  })
}

// ============================================================================
// FILE CONVERSION
// ============================================================================

export async function convertFile(
  file: File,
  targetType: MediaType
): Promise<Blob> {
  const sourceType = getMediaType(file.type)

  if (sourceType === targetType) {
    return new Blob([file], { type: file.type })
  }

  // Add conversion logic here
  // For now, just return original
  return new Blob([file], { type: file.type })
}

// ============================================================================
// MEDIA CREATION
// ============================================================================

export async function createMediaAttachment(
  file: File,
  options: {
    generateThumbnail?: boolean
    status?: 'uploading' | 'processing' | 'ready'
  } = {}
): Promise<MediaAttachment> {
  // Validate file
  const validation = validateFile(file)
  if (!validation.valid) {
    throw validation.error!
  }

  const mediaType = getMediaType(file.type)
  const metadata = await extractMetadata(file, mediaType)

  let thumbnail: string | undefined
  if (options.generateThumbnail && mediaType === 'image') {
    thumbnail = await generateThumbnail(file)
  }

  return {
    id: createMediaId(),
    type: mediaType,
    url: URL.createObjectURL(file),
    thumbnail,
    mimeType: file.type,
    size: file.size,
    name: file.name,
    status: options.status || 'ready',
    metadata,
    createdAt: new Date().toISOString(),
  }
}

export function revokeMediaUrl(media: MediaAttachment): void {
  if (media.url.startsWith('blob:')) {
    URL.revokeObjectURL(media.url)
  }
  if (media.thumbnail && media.thumbnail.startsWith('blob:')) {
    URL.revokeObjectURL(media.thumbnail)
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function downloadMedia(media: MediaAttachment): void {
  const a = document.createElement('a')
  a.href = media.url
  a.download = media.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new MediaError('Failed to read file', 'PROCESSING_FAILED'))
    reader.readAsDataURL(file)
  })
}

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new MediaError('Failed to read file', 'PROCESSING_FAILED'))
    reader.readAsArrayBuffer(file)
  })
}
