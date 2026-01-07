/**
 * Agent Marketplace Reviews System
 *
 * Comprehensive review system with text reviews, helpful voting,
 * edit tracking, and reporting functionality.
 */

import type {
  AgentRating,
  Review,
  ReviewEdit,
  ReviewVote,
  ReviewReport,
} from './types';
import {
  saveRating,
  getRatingsForAgent,
  getUserRating,
  deleteRating,
  loadMarketplaceAgent,
  saveReviewVote,
  getReviewVote,
  saveReviewReport,
  getReviewsForAgent,
  getReviewReports,
} from './storage';
import { ValidationError, NotFoundError, StorageError } from '@/lib/errors';

// ============================================================================
// REVIEW CREATION AND UPDATES
// ============================================================================

/**
 * Create or update a review with text
 *
 * @param agentId - Agent ID being reviewed
 * @param userId - User ID submitting review
 * @param rating - Rating value (1-5)
 * @param reviewTitle - Optional review title
 * @param reviewText - Optional review body text
 * @returns Promise resolving to saved review
 * @throws {ValidationError} If inputs are invalid
 * @throws {NotFoundError} If agent doesn't exist
 * @throws {StorageError} If save fails
 *
 * @example
 * ```typescript
 * const review = await createReview('my-agent-v1', 'user-123', 5, 'Great!', 'This agent is amazing');
 * console.log(`Review created: ${review.id}`);
 * ```
 */
export async function createReview(
  agentId: string,
  userId: string,
  rating: number,
  reviewTitle?: string,
  reviewText?: string
): Promise<AgentRating> {
  // Validate rating
  if (rating < 1 || rating > 5) {
    throw new ValidationError('Rating must be between 1 and 5', {
      field: 'rating',
      value: rating,
    });
  }

  // Validate user ID
  if (!userId?.trim()) {
    throw new ValidationError('User ID cannot be empty', {
      field: 'userId',
      value: userId,
    });
  }

  // Validate review lengths
  if (reviewTitle && reviewTitle.length > 200) {
    throw new ValidationError('Review title must be 200 characters or less', {
      field: 'reviewTitle',
      value: reviewTitle.length,
    });
  }

  if (reviewText && reviewText.length > 5000) {
    throw new ValidationError('Review text must be 5000 characters or less', {
      field: 'reviewText',
      value: reviewText.length,
    });
  }

  // Check if agent exists
  const agent = await loadMarketplaceAgent(agentId);
  if (!agent) {
    throw new NotFoundError('marketplace agent', agentId);
  }

  // Check if user already reviewed
  const existing = await getUserRating(agentId, userId);

  if (existing) {
    // Update existing review
    const updated: AgentRating = {
      ...existing,
      rating,
      reviewTitle,
      review: reviewText,
      updatedAt: Date.now(),
      editHistory: [
        ...(existing.editHistory || []),
        {
          timestamp: Date.now(),
          previousRating: existing.rating,
          previousTitle: existing.reviewTitle,
          previousText: existing.review,
        },
      ],
    };

    await saveRating(updated);
    return updated;
  } else {
    // Create new review
    const newReview: AgentRating = {
      id: generateReviewId(),
      agentId,
      userId,
      userName: undefined, // Will be filled in by UI layer
      rating,
      reviewTitle,
      review: reviewText,
      helpful: 0,
      userMarkedHelpful: false,
      reported: false,
      editHistory: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveRating(newReview);
    return newReview;
  }
}

/**
 * Edit an existing review
 *
 * @param reviewId - Review ID to edit
 * @param newRating - New rating value (1-5)
 * @param newReviewTitle - New review title
 * @param newReviewText - New review text
 * @returns Promise resolving to updated review
 * @throws {ValidationError} If inputs are invalid
 * @throws {NotFoundError} If review doesn't exist
 * @throws {StorageError} If update fails
 *
 * @example
 * ```typescript
 * const updated = await editReview('review-123', 4, 'Updated title', 'Updated text');
 * ```
 */
export async function editReview(
  reviewId: string,
  newRating: number,
  newReviewTitle?: string,
  newReviewText?: string
): Promise<AgentRating> {
  // Validate rating
  if (newRating < 1 || newRating > 5) {
    throw new ValidationError('Rating must be between 1 and 5', {
      field: 'rating',
      value: newRating,
    });
  }

  // Validate review ID
  if (!reviewId?.trim()) {
    throw new ValidationError('Review ID cannot be empty', {
      field: 'reviewId',
      value: reviewId,
    });
  }

  // Get all reviews to find the one to update
  const reviews = await getReviewsForAgent('');
  const existing = reviews.find((r) => r.id === reviewId);

  if (!existing) {
    throw new NotFoundError('review', reviewId);
  }

  // Track edit history
  const editEntry: ReviewEdit = {
    timestamp: Date.now(),
    previousRating: existing.rating,
    previousTitle: existing.reviewTitle,
    previousText: existing.review,
  };

  // Update review
  const updated: AgentRating = {
    ...existing,
    rating: newRating,
    reviewTitle: newReviewTitle,
    review: newReviewText,
    editHistory: [...(existing.editHistory || []), editEntry],
    updatedAt: Date.now(),
  };

  await saveRating(updated);
  return updated;
}

/**
 * Delete a review
 *
 * @param reviewId - Review ID to delete
 * @returns Promise that resolves when deletion is complete
 * @throws {ValidationError} If review ID is empty
 * @throws {NotFoundError} If review doesn't exist
 * @throws {StorageError} If deletion fails
 *
 * @example
 * ```typescript
 * await deleteReview('review-123');
 * ```
 */
export async function deleteReview(reviewId: string): Promise<void> {
  if (!reviewId?.trim()) {
    throw new ValidationError('Review ID cannot be empty', {
      field: 'reviewId',
      value: reviewId,
    });
  }

  // Check if review exists
  const reviews = await getReviewsForAgent('');
  const existing = reviews.find((r) => r.id === reviewId);

  if (!existing) {
    throw new NotFoundError('review', reviewId);
  }

  await deleteRating(reviewId);
}

// ============================================================================
// REVIEW RETRIEVAL
// ============================================================================

/**
 * Get reviews for an agent with pagination and sorting
 *
 * @param agentId - Agent ID
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of reviews per page
 * @param sortBy - Sort order
 * @param filterByRating - Optional filter by rating (1-5)
 * @returns Promise resolving to paginated reviews
 * @throws {ValidationError} If inputs are invalid
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const result = await getReviews('my-agent-v1', 1, 10, 'recent', 5);
 * console.log(`Page ${result.page} of ${result.totalPages}`);
 * ```
 */
export async function getReviews(
  agentId: string,
  page: number = 1,
  pageSize: number = 10,
  sortBy: 'recent' | 'helpful' | 'rating-high' | 'rating-low' = 'recent',
  filterByRating?: number
): Promise<{
  reviews: Review[];
  page: number;
  pageSize: number;
  totalReviews: number;
  totalPages: number;
}> {
  if (!agentId?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'agentId',
      value: agentId,
    });
  }

  if (page < 1) {
    throw new ValidationError('Page must be at least 1', {
      field: 'page',
      value: page,
    });
  }

  if (pageSize < 1 || pageSize > 100) {
    throw new ValidationError('Page size must be between 1 and 100', {
      field: 'pageSize',
      value: pageSize,
    });
  }

  let ratings = await getRatingsForAgent(agentId);

  // Filter by rating if specified
  if (filterByRating !== undefined) {
    if (filterByRating < 1 || filterByRating > 5) {
      throw new ValidationError('Filter rating must be between 1 and 5', {
        field: 'filterByRating',
        value: filterByRating,
      });
    }
    ratings = ratings.filter((r) => r.rating === filterByRating);
  }

  // Sort reviews
  switch (sortBy) {
    case 'recent':
      ratings.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case 'helpful':
      ratings.sort((a, b) => (b.helpful || 0) - (a.helpful || 0));
      break;
    case 'rating-high':
      ratings.sort((a, b) => b.rating - a.rating);
      break;
    case 'rating-low':
      ratings.sort((a, b) => a.rating - b.rating);
      break;
  }

  const totalReviews = ratings.length;
  const totalPages = Math.ceil(totalReviews / pageSize);

  // Paginate
  const start = (page - 1) * pageSize;
  const paginatedRatings = ratings.slice(start, start + pageSize);

  // Convert to Review type with formatted dates
  const reviews: Review[] = paginatedRatings.map((rating) => ({
    ...rating,
    formattedDate: new Date(rating.createdAt).toLocaleDateString(),
    relativeTime: formatRelativeTime(rating.createdAt),
  }));

  return {
    reviews,
    page,
    pageSize,
    totalReviews,
    totalPages,
  };
}

/**
 * Get reviews by user
 *
 * @param userId - User ID
 * @returns Promise resolving to array of user's reviews
 * @throws {ValidationError} If user ID is empty
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const userReviews = await getUserReviews('user-123');
 * console.log(`User has ${userReviews.length} reviews`);
 * ```
 */
export async function getUserReviews(userId: string): Promise<Review[]> {
  if (!userId?.trim()) {
    throw new ValidationError('User ID cannot be empty', {
      field: 'userId',
      value: userId,
    });
  }

  const allReviews = await getReviewsForAgent('');
  const userReviews = allReviews.filter((r) => r.userId === userId);

  return userReviews.map((rating) => ({
    ...rating,
    formattedDate: new Date(rating.createdAt).toLocaleDateString(),
    relativeTime: formatRelativeTime(rating.createdAt),
  }));
}

/**
 * Get review by ID
 *
 * @param reviewId - Review ID
 * @returns Promise resolving to review or null if not found
 * @throws {ValidationError} If review ID is empty
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const review = await getReview('review-123');
 * if (review) {
 *   console.log(`Review: ${review.review}`);
 * }
 * ```
 */
export async function getReview(reviewId: string): Promise<Review | null> {
  if (!reviewId?.trim()) {
    throw new ValidationError('Review ID cannot be empty', {
      field: 'reviewId',
      value: reviewId,
    });
  }

  const allReviews = await getReviewsForAgent('');
  const review = allReviews.find((r) => r.id === reviewId);

  if (!review) {
    return null;
  }

  return {
    ...review,
    formattedDate: new Date(review.createdAt).toLocaleDateString(),
    relativeTime: formatRelativeTime(review.createdAt),
  };
}

// ============================================================================
// HELPFUL VOTING
// ============================================================================

/**
 * Mark a review as helpful
 *
 * @param reviewId - Review ID
 * @param userId - User ID marking as helpful
 * @returns Promise resolving to updated review
 * @throws {ValidationError} If inputs are invalid
 * @throws {NotFoundError} If review doesn't exist
 * @throws {StorageError} If update fails
 *
 * @example
 * ```typescript
 * const updated = await markReviewHelpful('review-123', 'user-456');
 * console.log(`Helpful count: ${updated.helpful}`);
 * ```
 */
export async function markReviewHelpful(reviewId: string, userId: string): Promise<AgentRating> {
  if (!reviewId?.trim()) {
    throw new ValidationError('Review ID cannot be empty', {
      field: 'reviewId',
      value: reviewId,
    });
  }

  if (!userId?.trim()) {
    throw new ValidationError('User ID cannot be empty', {
      field: 'userId',
      value: userId,
    });
  }

  // Check if review exists
  const allReviews = await getReviewsForAgent('');
  const review = allReviews.find((r) => r.id === reviewId);

  if (!review) {
    throw new NotFoundError('review', reviewId);
  }

  // Prevent self-voting
  if (review.userId === userId) {
    throw new ValidationError('You cannot mark your own review as helpful', {
      field: 'userId',
      value: userId,
    });
  }

  // Check if already voted
  const existingVote = await getReviewVote(reviewId, userId);
  if (existingVote) {
    throw new ValidationError('You have already marked this review as helpful', {
      field: 'userId',
      value: userId,
    });
  }

  // Record vote
  const vote: ReviewVote = {
    id: `vote-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    reviewId,
    userId,
    createdAt: Date.now(),
  };
  await saveReviewVote(vote);

  // Update review helpful count
  const updated: AgentRating = {
    ...review,
    helpful: (review.helpful || 0) + 1,
    userMarkedHelpful: true,
    updatedAt: Date.now(),
  };

  await saveRating(updated);
  return updated;
}

/**
 * Unmark a review as helpful
 *
 * @param reviewId - Review ID
 * @param userId - User ID unmarking
 * @returns Promise resolving to updated review
 * @throws {ValidationError} If inputs are invalid
 * @throws {NotFoundError} If review or vote doesn't exist
 * @throws {StorageError} If update fails
 *
 * @example
 * ```typescript
 * const updated = await unmarkReviewHelpful('review-123', 'user-456');
 * ```
 */
export async function unmarkReviewHelpful(reviewId: string, userId: string): Promise<AgentRating> {
  if (!reviewId?.trim()) {
    throw new ValidationError('Review ID cannot be empty', {
      field: 'reviewId',
      value: reviewId,
    });
  }

  if (!userId?.trim()) {
    throw new ValidationError('User ID cannot be empty', {
      field: 'userId',
      value: userId,
    });
  }

  // Check if review exists
  const allReviews = await getReviewsForAgent('');
  const review = allReviews.find((r) => r.id === reviewId);

  if (!review) {
    throw new NotFoundError('review', reviewId);
  }

  // Check if vote exists
  const vote = await getReviewVote(reviewId, userId);
  if (!vote) {
    throw new ValidationError('You have not marked this review as helpful', {
      field: 'userId',
      value: userId,
    });
  }

  // Remove vote
  await deleteReviewVote(reviewId, userId);

  // Update review helpful count
  const updated: AgentRating = {
    ...review,
    helpful: Math.max((review.helpful || 0) - 1, 0),
    userMarkedHelpful: false,
    updatedAt: Date.now(),
  };

  await saveRating(updated);
  return updated;
}

/**
 * Check if user has marked review as helpful
 *
 * @param reviewId - Review ID
 * @param userId - User ID
 * @returns Promise resolving to true if marked helpful
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const isHelpful = await hasMarkedHelpful('review-123', 'user-456');
 * if (isHelpful) {
 *   console.log('User has marked this as helpful');
 * }
 * ```
 */
export async function hasMarkedHelpful(reviewId: string, userId: string): Promise<boolean> {
  const vote = await getReviewVote(reviewId, userId);
  return vote !== null;
}

// ============================================================================
// REVIEW REPORTING
// ============================================================================

/**
 * Report a review for moderation
 *
 * @param reviewId - Review ID to report
 * @param userId - User ID reporting
 * @param reason - Report reason
 * @param details - Additional details (optional)
 * @returns Promise resolving to created report
 * @throws {ValidationError} If inputs are invalid
 * @throws {NotFoundError} If review doesn't exist
 * @throws {StorageError} If save fails
 *
 * @example
 * ```typescript
 * const report = await reportReview('review-123', 'user-456', 'spam', 'This is spam content');
 * ```
 */
export async function reportReview(
  reviewId: string,
  userId: string,
  reason: 'spam' | 'offensive' | 'inappropriate' | 'fake' | 'other',
  details?: string
): Promise<ReviewReport> {
  if (!reviewId?.trim()) {
    throw new ValidationError('Review ID cannot be empty', {
      field: 'reviewId',
      value: reviewId,
    });
  }

  if (!userId?.trim()) {
    throw new ValidationError('User ID cannot be empty', {
      field: 'userId',
      value: userId,
    });
  }

  // Check if review exists
  const allReviews = await getReviewsForAgent('');
  const review = allReviews.find((r) => r.id === reviewId);

  if (!review) {
    throw new NotFoundError('review', reviewId);
  }

  // Prevent self-reporting
  if (review.userId === userId) {
    throw new ValidationError('You cannot report your own review', {
      field: 'userId',
      value: userId,
    });
  }

  // Create report
  const report: ReviewReport = {
    id: generateReportId(),
    reviewId,
    userId,
    reason,
    details,
    status: 'pending',
    createdAt: Date.now(),
    reviewedAt: undefined,
    reviewedBy: undefined,
    action: undefined,
  };

  await saveReviewReport(report);

  // Mark review as reported
  const updated: AgentRating = {
    ...review,
    reported: true,
    updatedAt: Date.now(),
  };

  await saveRating(updated);

  return report;
}

/**
 * Get all reports for a review
 *
 * @param reviewId - Review ID
 * @returns Promise resolving to array of reports
 * @throws {ValidationError} If review ID is empty
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const reports = await getReviewReports('review-123');
 * console.log(`Review has ${reports.length} reports`);
 * ```
 */
export async function getReportsForReview(reviewId: string): Promise<ReviewReport[]> {
  if (!reviewId?.trim()) {
    throw new ValidationError('Review ID cannot be empty', {
      field: 'reviewId',
      value: reviewId,
    });
  }

  return getReviewReports(reviewId);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique review ID
 */
function generateReviewId(): string {
  return `review-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate unique report ID
 */
function generateReportId(): string {
  return `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format relative time (e.g., "2 days ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) {
    return 'just now';
  } else if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (days < 30) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else if (months < 12) {
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else {
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
}

/**
 * Delete review vote (internal helper)
 */
async function deleteReviewVote(reviewId: string, userId: string): Promise<void> {
  const { deleteReviewVote: deleteVote } = await import('./storage');
  await deleteVote(reviewId, userId);
}
