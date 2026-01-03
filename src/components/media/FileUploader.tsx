'use client'

/**
 * FileUploader Component
 *
 * Handles file and image uploads for messages.
 */

import { useState, useRef, useCallback } from 'react'
import { Paperclip, X, Image as ImageIcon, File } from 'lucide-react'

interface FileUploaderProps {
  onFileSelect: (file: FilePreview) => void
  accept?: string
  maxSize?: number // in bytes
}

export interface FilePreview {
  file: File
  url: string
  type: 'image' | 'file'
  name: string
  size: number
}

export default function FileUploader({
  onFileSelect,
  accept = 'image/*,.pdf,.doc,.docx,.txt',
  maxSize = 10 * 1024 * 1024, // 10MB default
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<FilePreview | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((file: File): FilePreview | null => {
    // Check file size
    if (file.size > maxSize) {
      alert(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`)
      return null
    }

    // Determine file type
    const isImage = file.type.startsWith('image/')
    const url = URL.createObjectURL(file)

    return {
      file,
      url,
      type: isImage ? 'image' : 'file',
      name: file.name,
      size: file.size,
    }
  }, [maxSize])

  const handleFile = useCallback((file: File) => {
    const processed = processFile(file)
    if (processed) {
      setPreview(processed)
      onFileSelect(processed)
    }
  }, [processFile, onFileSelect])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  const clearPreview = () => {
    if (preview?.url) {
      URL.revokeObjectURL(preview.url)
    }
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Upload button */}
      {!preview && (
        <button
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`p-2 rounded-lg transition-all ${
            isDragging
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
          }`}
          title="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>
      )}

      {/* Preview */}
      {preview && (
        <div className="relative">
          {preview.type === 'image' ? (
            <div className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt={preview.name}
                className="max-h-32 max-w-64 rounded-lg object-cover"
              />
              <button
                onClick={clearPreview}
                className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 max-w-64">
              <File className="w-8 h-8 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {preview.name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(preview.size)}
                </p>
              </div>
              <button
                onClick={clearPreview}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
