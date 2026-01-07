/**
 * Review Form Component
 *
 * Form for submitting agent ratings and reviews.
 */

'use client';

import { useState } from 'react';
import type { AgentRating } from '@/lib/marketplace/types';
import { RatingStars } from './RatingStars';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export interface ReviewFormProps {
  /** Agent ID being reviewed */
  agentId: string;

  /** Existing rating (if updating) */
  existingRating?: AgentRating;

  /** Callback when form is submitted */
  onSubmit: (rating: number, reviewTitle?: string, review?: string) => Promise<void>;

  /** Callback when form is cancelled */
  onCancel?: () => void;

  /** Submit button text */
  submitText?: string;

  /** Show title field */
  showTitle?: boolean;

  /** Maximum review length */
  maxReviewLength?: number;

  /** Maximum title length */
  maxTitleLength?: number;

  /** Custom className */
  className?: string;
}

export function ReviewForm({
  agentId,
  existingRating,
  onSubmit,
  onCancel,
  submitText = 'Submit Review',
  showTitle = true,
  maxReviewLength = 1000,
  maxTitleLength = 100,
  className = '',
}: ReviewFormProps) {
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [reviewTitle, setReviewTitle] = useState(existingRating?.reviewTitle || '');
  const [review, setReview] = useState(existingRating?.review || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (review.length > maxReviewLength) {
      setError(`Review must be less than ${maxReviewLength} characters`);
      return;
    }

    if (reviewTitle.length > maxTitleLength) {
      setError(`Title must be less than ${maxTitleLength} characters`);
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(rating, reviewTitle || undefined, review || undefined);
      // Reset form on success
      if (!existingRating) {
        setRating(0);
        setReviewTitle('');
        setReview('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setRating(existingRating?.rating || 0);
    setReviewTitle(existingRating?.reviewTitle || '');
    setReview(existingRating?.review || '');
    setError(null);
    onCancel?.();
  };

  const isDirty =
    rating !== (existingRating?.rating || 0) ||
    reviewTitle !== (existingRating?.reviewTitle || '') ||
    review !== (existingRating?.review || '');

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        </div>
      )}

      {/* Rating Stars */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Rating <span className="text-red-500">*</span>
        </label>
        <RatingStars
          rating={rating}
          onRate={setRating}
          readonly={false}
          showCount={false}
          size="lg"
        />
        {rating > 0 && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            You rated this {rating} {rating === 1 ? 'star' : 'stars'}
          </p>
        )}
      </div>

      {/* Review Title */}
      {showTitle && (
        <div>
          <label htmlFor="review-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Review Title (Optional)
          </label>
          <input
            type="text"
            id="review-title"
            value={reviewTitle}
            onChange={(e) => setReviewTitle(e.target.value)}
            placeholder="Summarize your review"
            maxLength={maxTitleLength}
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-1 text-right">
            <span className={cn(
              'text-xs',
              reviewTitle.length >= maxTitleLength
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400'
            )}>
              {reviewTitle.length} / {maxTitleLength}
            </span>
          </div>
        </div>
      )}

      {/* Review Text */}
      <div>
        <label htmlFor="review-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Your Review (Optional)
        </label>
        <textarea
          id="review-text"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Tell others about your experience with this agent..."
          rows={5}
          maxLength={maxReviewLength}
          className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
        <div className="mt-1 text-right">
          <span className={cn(
            'text-xs',
            review.length >= maxReviewLength
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-500 dark:text-gray-400'
          )}>
            {review.length} / {maxReviewLength}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          variant="default"
          disabled={!isDirty || rating === 0 || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : submitText}
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}

        {existingRating && isDirty && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
            Updating your existing review
          </span>
        )}
      </div>

      {/* Guidelines */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <strong>Review Guidelines:</strong> Be honest, specific, and helpful. Focus on the agent's features,
          performance, and usability. Avoid spam or offensive content.
        </p>
      </div>
    </form>
  );
}
