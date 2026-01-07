/**
 * Reviews List Component
 *
 * Displays paginated list of reviews with sorting options.
 */

'use client';

import { useState, useEffect } from 'react';
import type { AgentRating } from '@/lib/marketplace/types';
import { ReviewCard } from './ReviewCard';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronDown, TrendingUp, ThumbsUp, SortAsc, SortDesc } from 'lucide-react';

export interface ReviewsListProps {
  /** Agent ID */
  agentId: string;

  /** Initial reviews to display */
  initialReviews?: AgentRating[];

  /** Callback when helpful is clicked */
  onMarkHelpful?: (reviewId: string) => void;

  /** Whether user can mark helpful */
  canMarkHelpful?: boolean;

  /** Reviews per page */
  pageSize?: number;

  /** Custom className */
  className?: string;
}

type SortOption = 'recent' | 'helpful' | 'rating-high' | 'rating-low';

const sortOptions: Array<{ value: SortOption; label: string; icon: typeof TrendingUp }> = [
  { value: 'recent', label: 'Most Recent', icon: ChevronDown },
  { value: 'helpful', label: 'Most Helpful', icon: ThumbsUp },
  { value: 'rating-high', label: 'Highest Rated', icon: SortDesc },
  { value: 'rating-low', label: 'Lowest Rated', icon: SortAsc },
];

export function ReviewsList({
  agentId,
  initialReviews = [],
  onMarkHelpful,
  canMarkHelpful = true,
  pageSize = 5,
  className = '',
}: ReviewsListProps) {
  const [reviews, setReviews] = useState<AgentRating[]>(initialReviews);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [isLoading, setIsLoading] = useState(false);

  const totalPages = Math.ceil(reviews.length / pageSize);
  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const displayedReviews = reviews.slice(startIdx, endIdx);

  // Sort reviews
  useEffect(() => {
    const sorted = [...reviews].sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return b.createdAt - a.createdAt;
        case 'helpful':
          return (b.helpful || 0) - (a.helpful || 0);
        case 'rating-high':
          return b.rating - a.rating;
        case 'rating-low':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });
    setReviews(sorted);
  }, [sortBy]);

  // Reset to page 1 when sort changes
  useEffect(() => {
    setPage(1);
  }, [sortBy]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarkHelpful = (reviewId: string) => {
    if (onMarkHelpful) {
      onMarkHelpful(reviewId);
      // Update local state
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, helpful: (r.helpful || 0) + 1, userMarkedHelpful: true }
            : r
        )
      );
    }
  };

  if (reviews.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <p className="text-gray-500 dark:text-gray-400">No reviews yet. Be the first to review!</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Reviews ({reviews.length})
        </h3>

        {/* Sort Dropdown */}
        <div className="relative group">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {displayedReviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onMarkHelpful={handleMarkHelpful}
            canMarkHelpful={canMarkHelpful}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              const isCurrentPage = pageNum === page;

              // Show first, last, current, and adjacent pages
              const showPage =
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= page - 1 && pageNum <= page + 1);

              if (!showPage) {
                // Show ellipsis
                if (pageNum === page - 2 || pageNum === page + 2) {
                  return (
                    <span
                      key={pageNum}
                      className="px-2 text-sm text-gray-500 dark:text-gray-400"
                    >
                      ...
                    </span>
                  );
                }
                return null;
              }

              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handlePageChange(pageNum)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                    isCurrentPage
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
          >
            Next
            <ChevronLeft className="w-4 h-4 ml-1 rotate-180" />
          </Button>
        </div>
      )}

      {/* Results Info */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        Showing {startIdx + 1}-{Math.min(endIdx, reviews.length)} of {reviews.length} reviews
      </div>
    </div>
  );
}
