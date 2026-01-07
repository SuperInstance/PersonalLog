/**
 * Rating Summary Component
 *
 * Displays rating statistics with distribution bars.
 */

'use client';

import type { RatingStats } from '@/lib/marketplace/types';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RatingSummaryProps {
  /** Rating statistics */
  stats: RatingStats;

  /** Size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Show distribution bars */
  showDistribution?: boolean;

  /** Custom className */
  className?: string;
}

export function RatingSummary({
  stats,
  size = 'md',
  showDistribution = true,
  className = '',
}: RatingSummaryProps) {
  const sizeStyles = {
    sm: {
      container: 'text-sm',
      star: 'w-4 h-4',
      bar: 'h-1.5',
      number: 'text-xs',
    },
    md: {
      container: 'text-base',
      star: 'w-5 h-5',
      bar: 'h-2',
      number: 'text-sm',
    },
    lg: {
      container: 'text-lg',
      star: 'w-6 h-6',
      bar: 'h-2.5',
      number: 'text-base',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Average Rating Display */}
      <div className="flex items-center gap-4">
        {/* Large Average Number */}
        <div className="text-center">
          <div className={cn('font-bold text-gray-900 dark:text-gray-100', styles.container)}>
            {stats.average.toFixed(1)}
          </div>
          <div className={cn('text-gray-500 dark:text-gray-400', styles.number)}>
            out of 5
          </div>
        </div>

        {/* Stars */}
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  styles.star,
                  i < Math.round(stats.average)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                )}
              />
            ))}
          </div>
          <div className={cn('text-gray-600 dark:text-gray-400', styles.number)}>
            Based on {stats.count} {stats.count === 1 ? 'rating' : 'ratings'}
          </div>
        </div>
      </div>

      {/* Distribution Bars */}
      {showDistribution && stats.count > 0 && (
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.distribution[star];
            const percentage = stats.distributionPercentages[star];

            return (
              <div key={star} className="flex items-center gap-2">
                {/* Star Label */}
                <div className="flex items-center gap-1 w-12 flex-shrink-0">
                  <span className={cn('text-gray-600 dark:text-gray-400 font-medium', styles.number)}>
                    {star}
                  </span>
                  <Star className={cn('w-3 h-3 fill-yellow-400 text-yellow-400')} />
                </div>

                {/* Progress Bar */}
                <div className="flex-1 h-full">
                  <div className={cn('bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden', styles.bar)}>
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Count */}
                <div className={cn('text-gray-600 dark:text-gray-400 w-8 text-right', styles.number)}>
                  {count}
                </div>

                {/* Percentage */}
                <div className={cn('text-gray-500 dark:text-gray-500 w-10 text-right', styles.number)}>
                  {percentage.toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No Ratings State */}
      {stats.count === 0 && (
        <div className={cn('text-center text-gray-500 dark:text-gray-400 py-4', styles.number)}>
          No ratings yet. Be the first to rate!
        </div>
      )}
    </div>
  );
}
