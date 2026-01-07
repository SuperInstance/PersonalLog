/**
 * Review Card Component
 *
 * Displays an individual review with rating, text, and metadata.
 */

'use client';

import { ThumbsUp, User } from 'lucide-react';
import type { AgentRating } from '@/lib/marketplace/types';
import { RatingStars } from './RatingStars';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export interface ReviewCardProps {
  /** Review to display */
  review: AgentRating;

  /** Callback when helpful is clicked */
  onMarkHelpful?: (reviewId: string) => void;

  /** Whether current user can mark helpful */
  canMarkHelpful?: boolean;

  /** Whether to show full review text */
  showFullText?: boolean;

  /** Custom className */
  className?: string;
}

export function ReviewCard({
  review,
  onMarkHelpful,
  canMarkHelpful = true,
  showFullText = false,
  className = '',
}: ReviewCardProps) {
  const [isHelpful, setIsHelpful] = useState(review.userMarkedHelpful || false);
  const [helpfulCount, setHelpfulCount] = useState(review.helpful || 0);

  const handleMarkHelpful = () => {
    if (onMarkHelpful && !isHelpful && canMarkHelpful) {
      onMarkHelpful(review.id);
      setIsHelpful(true);
      setHelpfulCount((prev) => prev + 1);
    }
  };

  const reviewText = review.review || '';
  const shouldTruncate = !showFullText && reviewText.length > 300;
  const displayText = shouldTruncate ? reviewText.substring(0, 300) + '...' : reviewText;

  return (
    <div className={cn('p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700', className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          {/* Review Title */}
          {review.reviewTitle && (
            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1">
              {review.reviewTitle}
            </h4>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {/* User */}
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {review.userName || 'Anonymous User'}
              </span>
            </div>

            {/* Rating */}
            <RatingStars rating={review.rating} size="sm" showCount={false} readonly />

            {/* Date */}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatRelativeTime(new Date(review.createdAt).toISOString())}
            </span>
          </div>
        </div>
      </div>

      {/* Review Text */}
      {review.review && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
          {displayText}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3">
        {/* Helpful Button */}
        <button
          type="button"
          onClick={handleMarkHelpful}
          disabled={isHelpful || !canMarkHelpful}
          className={cn(
            'flex items-center gap-1.5 text-xs transition-colors',
            isHelpful || !canMarkHelpful
              ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer'
          )}
        >
          <ThumbsUp className={cn('w-3.5 h-3.5', isHelpful && 'fill-current')} />
          <span>
            Helpful ({helpfulCount})
          </span>
        </button>

        {/* Verified Badge (if applicable) */}
        {review.helpful && review.helpful >= 5 && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            Top Reviewer
          </span>
        )}
      </div>
    </div>
  );
}
