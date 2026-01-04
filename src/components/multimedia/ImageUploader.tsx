'use client'

/**
 * ImageUploader Component
 *
 * Upload and preview images with drag-and-drop support.
 */

import { useState, useCallback, useRef } from 'react'
import { Image as ImageIcon, Upload, X, Loader2 } from 'lucide-react'
import { MediaAttachment, MediaError } from '@/lib/multimedia/types'
import { createMediaAttachment, revokeMediaUrl } from '@/lib/multimedia/processor'
import { uploadManager, handleDragEvent, hasFiles } from '@/lib/multimedia/upload'

interface ImageUploaderProps {
  onImageSelect?: (media: MediaAttachment) => void
  onImagesSelect?: (media: MediaAttachment[]) => void
  maxFiles?: number
  maxSize?: number // in bytes
  accept?: string // MIME types
  disabled?: boolean
  className?: string
}

export default function ImageUploader({
  onImageSelect,
  onImagesSelect,
  maxFiles = 1,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = 'image/*',
  disabled = false,
  className = '',
}: ImageUploaderProps) {
  const [images, setImages] = useState<MediaAttachment[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: File[]) => {
    if (disabled || files.length === 0) return

    setError(null)
    setIsUploading(true)

    try {
      const newImages: MediaAttachment[] = []

      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new MediaError(`File ${file.name} is not an image`, 'INVALID_FORMAT')
        }

        // Validate file size
        if (maxSize && file.size > maxSize) {
          throw new MediaError(
            `Image ${file.name} exceeds maximum size of ${maxSize / 1024 / 1024}MB`,
            'FILE_TOO_LARGE'
          )
        }

        // Create media attachment
        const media = await createMediaAttachment(file, {
          generateThumbnail: true,
          status: 'ready',
        })

        newImages.push(media)
      }

      // Check max files limit
      const totalImages = images.length + newImages.length
      if (maxFiles && totalImages > maxFiles) {
        throw new MediaError(
          `Cannot add more than ${maxFiles} images`,
          'FILE_TOO_LARGE'
        )
      }

      // Update state
      const updatedImages = [...images, ...newImages]
      setImages(updatedImages)

      // Callbacks
      if (newImages.length === 1 && onImageSelect) {
        onImageSelect(newImages[0])
      } else if (onImagesSelect) {
        onImagesSelect(updatedImages)
      }
    } catch (err) {
      const message = err instanceof MediaError ? err.message : 'Failed to upload image'
      setError(message)
    } finally {
      setIsUploading(false)
    }
  }, [disabled, maxSize, maxFiles, images, onImageSelect, onImagesSelect])

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)

    if (disabled || !hasFiles(event)) return

    const files = Array.from(event.dataTransfer.files)
    handleFiles(files)
  }, [disabled, handleFiles])

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
  }, [])

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    handleFiles(files)
    // Reset input
    event.target.value = ''
  }, [handleFiles])

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click()
    }
  }, [disabled, isUploading])

  const handleRemove = useCallback((index: number) => {
    if (disabled) return

    const imageToRemove = images[index]
    revokeMediaUrl(imageToRemove)

    const updatedImages = images.filter((_, i) => i !== index)
    setImages(updatedImages)

    if (onImagesSelect) {
      onImagesSelect(updatedImages)
    }
  }, [disabled, images, onImagesSelect])

  const handleClear = useCallback(() => {
    if (disabled) return

    images.forEach(image => revokeMediaUrl(image))
    setImages([])

    if (onImagesSelect) {
      onImagesSelect([])
    }
  }, [disabled, images, onImagesSelect])

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Upload Zone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer
          ${isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isUploading ? 'pointer-events-none' : ''}
        `}
        role="button"
        tabIndex={0}
        aria-label="Upload images"
        aria-disabled={disabled}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleFileInput}
          disabled={disabled || isUploading}
          className="hidden"
          aria-label="Upload images"
        />

        {/* Upload content */}
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          {isUploading ? (
            <>
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Uploading...</p>
            </>
          ) : (
            <>
              <div className={`
                p-4 rounded-full transition-colors
                ${isDragging ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-800'}
              `}>
                {images.length > 0 ? (
                  <ImageIcon className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                ) : (
                  <Upload className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {isDragging ? 'Drop images here' : 'Upload images'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Drag and drop or click to browse
                  {maxFiles && ` (max ${maxFiles} file${maxFiles > 1 ? 's' : ''})`}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="relative group"
            >
              <img
                src={image.url}
                alt={image.name}
                className="w-24 h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
              />
              {!disabled && (
                <button
                  onClick={() => handleRemove(index)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Remove ${image.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/60 rounded-b-lg">
                <p className="text-xs text-white truncate">{image.name}</p>
              </div>
            </div>
          ))}

          {/* Clear all button */}
          {!disabled && images.length > 1 && (
            <button
              onClick={handleClear}
              className="w-24 h-24 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 transition-colors text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
              aria-label="Clear all images"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
