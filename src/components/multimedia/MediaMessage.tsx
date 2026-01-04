'use client'

/**
 * MediaMessage Component
 *
 * Render media attachments within chat messages.
 */

import { useState } from 'react'
import {
  Image as ImageIcon,
  FileAudio,
  FileVideo,
  Play,
  Pause,
  Download,
  Maximize2,
  File,
} from 'lucide-react'
import { MediaAttachment } from '@/lib/multimedia/types'
import { formatFileSize } from '@/lib/multimedia/types'

interface MediaMessageProps {
  media: MediaAttachment
  isUser?: boolean
  onDownload?: () => void
  onExpand?: () => void
  className?: string
}

export default function MediaMessage({
  media,
  isUser = false,
  onDownload,
  onExpand,
  className = '',
}: MediaMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsPlaying(!isPlaying)
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDownload) {
      onDownload()
    } else {
      // Default download behavior
      const a = document.createElement('a')
      a.href = media.url
      a.download = media.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onExpand) {
      onExpand()
    } else {
      setIsExpanded(true)
    }
  }

  const handleCloseExpand = () => {
    setIsExpanded(false)
    setIsPlaying(false)
  }

  const renderMedia = (expanded = false) => {
    const baseClass = expanded ? 'max-w-4xl max-h-[80vh]' : 'max-w-full max-h-96'

    switch (media.type) {
      case 'image':
        return (
          <div className="relative group">
            <img
              src={expanded ? media.url : (media.thumbnail || media.url)}
              alt={media.name}
              className={`${baseClass} w-full h-auto rounded-lg object-contain`}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
              <button
                onClick={handleExpand}
                className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white"
                aria-label="Expand image"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white"
                aria-label="Download image"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
            {media.metadata?.width && media.metadata?.height && !expanded && (
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs text-white">
                {media.metadata.width}x{media.metadata.height}
              </div>
            )}
          </div>
        )

      case 'audio':
        return (
          <div className={`bg-slate-100 dark:bg-slate-800 rounded-lg p-4 ${expanded ? 'max-w-2xl' : 'max-w-sm'}`}>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayPause}
                className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {media.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatFileSize(media.size)}
                  {media.metadata?.duration && ` • ${Math.floor(media.metadata.duration / 60)}:${Math.floor(media.metadata.duration % 60).toString().padStart(2, '0')}`}
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
                aria-label="Download audio"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
            <audio
              src={media.url}
              className="hidden"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
          </div>
        )

      case 'video':
        return (
          <div className="relative group">
            <video
              src={media.url}
              controls
              autoPlay={isPlaying}
              className={`${baseClass} w-full rounded-lg`}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleDownload}
                className="p-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-lg text-white"
                aria-label="Download video"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
            {media.metadata?.duration && !expanded && (
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs text-white">
                {Math.floor(media.metadata.duration / 60)}:{Math.floor(media.metadata.duration % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-lg p-3 max-w-xs">
            <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
              <File className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {media.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatFileSize(media.size)}
              </p>
            </div>
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
              aria-label="Download file"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )
    }
  }

  return (
    <>
      <div className={className}>
        {renderMedia(false)}
      </div>

      {/* Expanded view modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={handleCloseExpand}
          role="dialog"
          aria-modal="true"
          aria-label="Expanded media view"
        >
          <button
            onClick={handleCloseExpand}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
            aria-label="Close"
          >
            ×
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            {renderMedia(true)}
          </div>
        </div>
      )}
    </>
  )
}

// Thumbnail version for compact display
export function MediaThumbnail({
  media,
  onClick,
  className = '',
}: {
  media: MediaAttachment
  onClick?: () => void
  className?: string
}) {
  const getIcon = () => {
    switch (media.type) {
      case 'image':
        return ImageIcon
      case 'audio':
        return FileAudio
      case 'video':
        return FileVideo
      default:
        return File
    }
  }

  const Icon = getIcon()

  return (
    <button
      onClick={onClick}
      className={`
        relative aspect-square rounded-lg overflow-hidden border-2
        border-slate-200 dark:border-slate-700 hover:border-blue-500
        transition-all ${className}
      `}
      aria-label={`View ${media.name}`}
    >
      {media.type === 'image' ? (
        <img
          src={media.thumbnail || media.url}
          alt={media.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Icon className="w-12 h-12 text-slate-400" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 backdrop-blur-sm">
        <p className="text-xs text-white truncate">{media.name}</p>
      </div>
    </button>
  )
}
