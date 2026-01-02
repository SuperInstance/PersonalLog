/**
 * Skeleton Component
 *
 * Loading placeholder components with shimming animation.
 * Provides visual feedback while content is loading.
 */

'use client'

import { HTMLAttributes } from 'react'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  ...props
}: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-slate-200 dark:bg-slate-800 rounded'

  const variants = {
    text: 'h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  }

  const variantStyles = variants[variant]

  const customStyles = {
    ...(width !== undefined && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height !== undefined && { height: typeof height === 'number' ? `${height}px` : height }),
  }

  return (
    <div
      className={`${baseStyles} ${variantStyles} ${className}`}
      style={customStyles}
      {...props}
    />
  )
}

/**
 * SkeletonList - For loading list items
 */
export interface SkeletonListProps {
  count?: number
  variant?: 'text' | 'circular' | 'rectangular'
}

export function SkeletonList({ count = 3, variant = 'rectangular' }: SkeletonListProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          variant={variant}
          className={variant === 'rectangular' ? 'h-20 w-full' : ''}
        />
      ))}
    </div>
  )
}

/**
 * SkeletonText - For loading text blocks
 */
export interface SkeletonTextProps {
  lines?: number
  className?: string
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          className={index === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  )
}

/**
 * SkeletonAvatar - For loading user avatars
 */
export interface SkeletonAvatarProps {
  size?: number
  className?: string
}

export function SkeletonAvatar({ size = 40, className = '' }: SkeletonAvatarProps) {
  return <Skeleton variant="circular" width={size} height={size} className={className} />
}
