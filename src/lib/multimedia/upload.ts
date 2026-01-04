/**
 * Media Upload Handler
 *
 * Handles uploading files to storage and tracking upload progress.
 */

import {
  MediaAttachment,
  MediaUploadOptions,
  MediaUploadProgress,
  MediaUploadResult,
  MediaError,
  MediaErrorCode,
} from './types'
import { createMediaAttachment, revokeMediaUrl } from './processor'
import type { MediaType } from './types'

// ============================================================================
// CONFIGURATION
// ============================================================================

interface UploadConfig {
  endpoint?: string
  maxSize?: number
  allowedTypes?: MediaType[]
  chunkSize?: number // For chunked uploads
  maxRetries?: number
}

// ============================================================================
// UPLOAD MANAGER
// ============================================================================

class MediaUploadManager {
  private uploads = new Map<string, MediaUploadProgress>()
  private abortControllers = new Map<string, AbortController>()

  async uploadFile(
    file: File,
    options: MediaUploadOptions = {}
  ): Promise<MediaUploadResult> {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      throw new MediaError(
        `File size exceeds maximum allowed size of ${options.maxSize} bytes`,
        'FILE_TOO_LARGE'
      )
    }

    // Check allowed types
    if (options.allowedTypes && !this.isAllowedType(file, options.allowedTypes)) {
      throw new MediaError(
        `File type ${file.type} is not allowed`,
        'INVALID_FORMAT'
      )
    }

    // Create abort controller
    const abortController = new AbortController()
    this.abortControllers.set(uploadId, abortController)

    try {
      // Process file
      const media = await createMediaAttachment(file, {
        generateThumbnail: options.generateThumbnail,
        status: 'uploading',
      })

      // Initialize progress
      const progress: MediaUploadProgress = {
        loaded: 0,
        total: file.size,
        percentage: 0,
      }
      this.uploads.set(uploadId, progress)

      // Simulate upload (in production, this would upload to a server)
      await this.simulateUpload(progress, abortController.signal)

      // Update status
      media.status = 'ready'

      return {
        media,
        thumbnail: media.thumbnail,
      }
    } catch (error) {
      if (error instanceof MediaError) throw error

      throw new MediaError(
        `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPLOAD_FAILED'
      )
    } finally {
      this.abortControllers.delete(uploadId)
      this.uploads.delete(uploadId)
    }
  }

  async uploadMultipleFiles(
    files: File[],
    options: MediaUploadOptions = {}
  ): Promise<MediaUploadResult[]> {
    const results: MediaUploadResult[] = []

    for (const file of files) {
      const result = await this.uploadFile(file, options)
      results.push(result)
    }

    return results
  }

  cancelUpload(uploadId: string): void {
    const controller = this.abortControllers.get(uploadId)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(uploadId)
      this.uploads.delete(uploadId)
    }
  }

  getProgress(uploadId: string): MediaUploadProgress | undefined {
    return this.uploads.get(uploadId)
  }

  private isAllowedType(file: File, allowedTypes: MediaType[]): boolean {
    const mediaType = this.getMediaType(file)
    return allowedTypes.includes(mediaType)
  }

  private getMediaType(file: File): MediaType {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('audio/')) return 'audio'
    if (file.type.startsWith('video/')) return 'video'
    return 'file'
  }

  private async simulateUpload(
    progress: MediaUploadProgress,
    signal: AbortSignal
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (signal.aborted) {
          clearInterval(interval)
          reject(new MediaError('Upload cancelled', 'UPLOAD_FAILED'))
          return
        }

        // Simulate upload progress
        const chunkSize = progress.total / 20
        progress.loaded = Math.min(progress.loaded + chunkSize, progress.total)
        progress.percentage = Math.round((progress.loaded / progress.total) * 100)

        if (progress.loaded >= progress.total) {
          clearInterval(interval)
          resolve()
        }
      }, 100)
    })
  }
}

// ============================================================================
// UPLOAD HOOK
// ============================================================================

export const uploadManager = new MediaUploadManager()

export interface UseMediaUploadOptions {
  onProgress?: (progress: MediaUploadProgress) => void
  onSuccess?: (result: MediaUploadResult) => void
  onError?: (error: MediaError) => void
  multiple?: boolean
  accept?: string // MIME types, e.g., 'image/*,audio/*'
}

export async function handleFileSelect(
  event: React.ChangeEvent<HTMLInputElement>,
  options: UseMediaUploadOptions & MediaUploadOptions = {}
): Promise<MediaUploadResult | MediaUploadResult[]> {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) {
    throw new MediaError('No files selected', 'UPLOAD_FAILED')
  }

  try {
    if (options.multiple) {
      const results = await uploadManager.uploadMultipleFiles(files, options)
      options.onSuccess?.(results[0]) // Call with first result for compatibility
      return results
    } else {
      const result = await uploadManager.uploadFile(files[0], options)
      options.onSuccess?.(result)
      return result
    }
  } catch (error) {
    if (error instanceof MediaError) {
      options.onError?.(error)
      throw error
    }
    throw new MediaError(
      `File selection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UPLOAD_FAILED'
    )
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function createFileInputHandler(
  options: UseMediaUploadOptions & MediaUploadOptions = {}
): (event: React.ChangeEvent<HTMLInputElement>) => Promise<void> {
  return async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      await handleFileSelect(event, options)
    } catch (error) {
      // Error already handled in handleFileSelect
      console.error('File upload error:', error)
    } finally {
      // Reset input
      event.target.value = ''
    }
  }
}

export function triggerFileInput(
  accept: string = '*',
  multiple: boolean = false
): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = accept
  input.multiple = multiple

  const event = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true,
  })

  input.dispatchEvent(event)
}

export async function uploadFromDataURL(
  dataUrl: string,
  filename: string,
  options: MediaUploadOptions = {}
): Promise<MediaUploadResult> {
  // Convert data URL to blob
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const file = new File([blob], filename, { type: blob.type })

  return uploadManager.uploadFile(file, options)
}

export async function uploadFromBlob(
  blob: Blob,
  filename: string,
  options: MediaUploadOptions = {}
): Promise<MediaUploadResult> {
  const file = new File([blob], filename, { type: blob.type })
  return uploadManager.uploadFile(file, options)
}

// ============================================================================
// DRAG AND DROP
// ============================================================================

export interface DropZoneOptions {
  onDrop: (files: File[]) => void
  onDragEnter?: (event: React.DragEvent) => void
  onDragLeave?: (event: React.DragEvent) => void
  onDragOver?: (event: React.DragEvent) => void
  accept?: string
  multiple?: boolean
}

export function handleDragEvent(
  event: React.DragEvent,
  options: DropZoneOptions
): void {
  event.preventDefault()
  event.stopPropagation()

  switch (event.type) {
    case 'dragenter':
    case 'dragover':
      options.onDragOver?.(event)
      break
    case 'dragleave':
      options.onDragLeave?.(event)
      break
    case 'drop':
      options.onDragLeave?.(event)
      const files = Array.from(event.dataTransfer.files)

      // Filter by accepted types
      let filteredFiles = files
      if (options.accept) {
        const acceptedTypes = options.accept.split(',').map(t => t.trim())
        filteredFiles = files.filter(file =>
          acceptedTypes.some(type => {
            if (type.endsWith('/*')) {
              return file.type.startsWith(type.replace('*', ''))
            }
            return file.type === type
          })
        )
      }

      // Handle multiple
      if (!options.multiple && filteredFiles.length > 1) {
        filteredFiles = [filteredFiles[0]]
      }

      if (filteredFiles.length > 0) {
        options.onDrop(filteredFiles)
      }
      break
  }
}

export function isDragEventWithType(event: React.DragEvent, mimeType: string): boolean {
  return Array.from(event.dataTransfer.types).includes(mimeType)
}

export function hasFiles(event: React.DragEvent): boolean {
  return isDragEventWithType(event, 'Files')
}
