'use client'

/**
 * MediaGallery Component
 *
 * Display and manage a gallery of media attachments (images, audio, video).
 */

import { useState } from 'react'
import {
  X,
  Download,
  Maximize2,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  FileAudio,
  FileVideo,
} from 'lucide-react'
import { MediaAttachment } from '@/lib/multimedia/types'
import { downloadMedia, revokeMediaUrl } from '@/lib/multimedia/processor'

interface MediaGalleryProps {
  media: MediaAttachment[]
  onRemove?: (mediaId: string) => void
  className?: string
}

export default function MediaGallery({ media, onRemove, className = '' }: MediaGalleryProps) {
  const [selectedMedia, setSelectedMedia] = useState<MediaAttachment | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState(false)

  if (media.length === 0) {
    return null
  }

  const handleMediaClick = (mediaItem: MediaAttachment, index: number) => {
    setSelectedMedia(mediaItem)
    setSelectedIndex(index)
  }

  const handleClose = () => {
    setSelectedMedia(null)
    setIsPlaying(false)
  }

  const handlePrevious = () => {
    const newIndex = selectedIndex > 0 ? selectedIndex - 1 : media.length - 1
    setSelectedMedia(media[newIndex])
    setSelectedIndex(newIndex)
    setIsPlaying(false)
  }

  const handleNext = () => {
    const newIndex = selectedIndex < media.length - 1 ? selectedIndex + 1 : 0
    setSelectedMedia(media[newIndex])
    setSelectedIndex(newIndex)
    setIsPlaying(false)
  }

  const handleDownload = (mediaItem: MediaAttachment) => {
    downloadMedia(mediaItem)
  }

  const handleRemove = (mediaId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (onRemove) {
      revokeMediaUrl(media.find(m => m.id === mediaId)!)
      onRemove(mediaId)
    }
  }

  const getMediaIcon = (mediaItem: MediaAttachment) => {
    switch (mediaItem.type) {
      case 'image':
        return ImageIcon
      case 'audio':
        return FileAudio
      case 'video':
        return FileVideo
      default:
        return ImageIcon
    }
  }

  return (
    <>
      {/* Thumbnail grid */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 ${className}`}>
        {media.map((mediaItem, index) => {
          const MediaIcon = getMediaIcon(mediaItem)

          return (
            <div
              key={mediaItem.id}
              onClick={() => handleMediaClick(mediaItem, index)}
              className="relative group aspect-square cursor-pointer rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all"
              role="button"
              tabIndex={0}
              aria-label={`View ${mediaItem.name}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleMediaClick(mediaItem, index)
                }
              }}
            >
              {mediaItem.type === 'image' ? (
                <img
                  src={mediaItem.thumbnail || mediaItem.url}
                  alt={mediaItem.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <MediaIcon className="w-12 h-12 text-slate-400" />
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Maximize2 className="w-6 h-6 text-white" />
              </div>

              {/* Remove button */}
              {onRemove && (
                <button
                  onClick={(e) => handleRemove(mediaItem.id, e)}
                  className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Remove ${mediaItem.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Type badge */}
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-xs text-white">
                {mediaItem.type}
              </div>
            </div>
          )
        })}
      </div>

      {/* Lightbox */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="Media preview"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
            aria-label="Close preview"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation buttons */}
          {media.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePrevious()
                }}
                className="absolute left-4 p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                aria-label="Previous media"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleNext()
                }}
                className="absolute right-4 p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                aria-label="Next media"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          {/* Media content */}
          <div
            className="max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedMedia.type === 'image' ? (
              <img
                src={selectedMedia.url}
                alt={selectedMedia.name}
                className="max-w-full max-h-full object-contain"
              />
            ) : selectedMedia.type === 'audio' ? (
              <div className="bg-slate-900 rounded-lg p-8 w-full max-w-md">
                <audio
                  src={selectedMedia.url}
                  controls
                  autoPlay
                  className="w-full"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                <div className="mt-4 space-y-2">
                  <p className="text-white font-medium">{selectedMedia.name}</p>
                  <p className="text-slate-400 text-sm">
                    {(selectedMedia.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            ) : selectedMedia.type === 'video' ? (
              <video
                src={selectedMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-full"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : null}
          </div>

          {/* Actions bar */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleDownload(selectedMedia)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
              aria-label="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            {media.length > 1 && (
              <>
                <span className="text-white text-sm px-2">
                  {selectedIndex + 1} / {media.length}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
