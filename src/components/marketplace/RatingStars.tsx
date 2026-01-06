/**
 * Rating Stars Component
 *
 * Displays and collects agent ratings with interactive stars.
 */

'use client';

import { Star, StarHalf } from 'lucide-react';
import { useState } from 'react';

export interface RatingStarsProps {
  /** Current rating (0-5) */
  rating: number;

  /** Read-only mode (no interaction) */
  readonly?: boolean;

  /** Number of ratings to display */
  ratingCount?: number;

  /** Callback when rating is submitted */
  onRate?: (rating: number) => void;

  /** Size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Show rating count */
  showCount?: boolean;

  /** Custom className */
  className?: string;
}

export function RatingStars({
  rating,
  readonly = true,
  ratingCount,
  onRate,
  size = 'md',
  showCount = true,
  className = '',
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleClick = (value: number) => {
    if (!readonly && onRate) {
      onRate(value);
    }
  };

  const handleMouseEnter = (value: number) => {
    if (!readonly) {
      setHoverRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverRating(0);
    }
  };

  const displayRating = hoverRating || rating;
  const fullStars = Math.floor(displayRating);
  const hasHalfStar = displayRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Full Stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <button
          key={`full-${i}`}
          type="button"
          onClick={() => handleClick(i + 1)}
          onMouseEnter={() => handleMouseEnter(i + 1)}
          onMouseLeave={handleMouseLeave}
          disabled={readonly}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
          aria-label={`Rate ${i + 1} stars`}
        >
          <Star
            className={`${sizeStyles[size]} fill-yellow-400 text-yellow-400`}
          />
        </button>
      ))}

      {/* Half Star */}
      {hasHalfStar && (
        <button
          type="button"
          onClick={() => handleClick(fullStars + 1)}
          onMouseEnter={() => handleMouseEnter(fullStars + 1)}
          onMouseLeave={handleMouseLeave}
          disabled={readonly}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
          aria-label={`Rate ${fullStars + 1} stars`}
        >
          <StarHalf
            className={`${sizeStyles[size]} fill-yellow-400 text-yellow-400`}
          />
        </button>
      )}

      {/* Empty Stars */}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <button
          key={`empty-${i}`}
          type="button"
          onClick={() => handleClick(fullStars + (hasHalfStar ? 1 : 0) + i + 1)}
          onMouseEnter={() => handleMouseEnter(fullStars + (hasHalfStar ? 1 : 0) + i + 1)}
          onMouseLeave={handleMouseLeave}
          disabled={readonly}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
          aria-label={`Rate ${fullStars + (hasHalfStar ? 1 : 0) + i + 1} stars`}
        >
          <Star
            className={`${sizeStyles[size]} text-gray-300 dark:text-gray-600`}
          />
        </button>
      ))}

      {/* Rating Count */}
      {showCount && ratingCount !== undefined && (
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          ({ratingCount.toLocaleString()})
        </span>
      )}

      {/* Numeric Rating */}
      {!readonly && hoverRating > 0 && (
        <span className="ml-2 text-sm font-medium text-yellow-600 dark:text-yellow-400">
          {hoverRating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
