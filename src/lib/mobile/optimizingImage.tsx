/**
 * Optimized Image Component
 *
 * Mobile-optimized image component with:
 * - Lazy loading
 * - WebP format support
 * - Responsive srcset
 * - Blur placeholder
 * - Progressive loading
 *
 * @module mobile/image
 */

'use client'

import { useRef, useState, forwardRef } from 'react'
import { useLazyImage } from '@/lib/mobile/useLazyLoad'

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string
  srcset?: string
  alt: string
  width?: number
  height?: number
  placeholder?: 'blur' | 'color'
  blurDataURL?: string
  className?: string
}

export const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({
    src,
    srcset,
    alt,
    width,
    height,
    placeholder = 'blur',
    blurDataURL = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23ccc" width="400" height="300"/%3E%3C/svg%3E',
    className = '',
    ...props
  }, externalRef) => {
    const internalRef = useRef<HTMLImageElement>(null)
    const ref = (externalRef || internalRef) as React.RefObject<HTMLImageElement>

    const [isLoaded, setIsLoaded] = useState(false)
    const [hasError, setHasError] = useState(false)

    const { currentSrc } = useLazyImage(
      ref,
      src,
      srcset,
      {
        threshold: 0.01,
        rootMargin: '50px',
      }
    )

    const handleLoad = () => {
      setIsLoaded(true)
    }

    const handleError = () => {
      setHasError(true)
    }

    // Generate WebP srcset
    const generateWebPSrcset = (originalSrcset: string): string => {
      return originalSrcset
        .split(',')
        .map((part) => {
          const [url, descriptor] = part.trim().split(' ')
          const webpUrl = url.replace(/\.(jpg|jpeg|png)$/i, '.webp')
          return `${webpUrl} ${descriptor || ''}`.trim()
        })
        .join(', ')
    }

    const webpSrcset = srcset ? generateWebPSrcset(srcset) : undefined

    return (
      <div
        className={`relative overflow-hidden ${className}`}
        style={{ width, height }}
      >
        {/* Placeholder */}
        {placeholder === 'blur' && !isLoaded && (
          <img
            src={blurDataURL}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110 transition-opacity duration-300"
            style={{ opacity: isLoaded ? 0 : 1 }}
          />
        )}

        {/* Actual image */}
        <img
          ref={ref}
          src={currentSrc}
          srcSet={webpSrcset}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...props}
        />

        {/* Error state */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
            <svg
              className="w-12 h-12 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>
    )
  }
)

OptimizedImage.displayName = 'OptimizedImage'
