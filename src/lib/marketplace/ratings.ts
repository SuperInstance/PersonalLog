/**
 * Agent Marketplace Ratings System
 *
 * Submit, retrieve, and manage agent ratings and reviews.
 */

import type { AgentRating } from './types';
import { saveRating, getRatingsForAgent, getUserRating, deleteRating, loadMarketplaceAgent, updateAgentStats } from './storage';
import { ValidationError, NotFoundError, StorageError } from '@/lib/errors';

/**
 * Submit a rating for an agent
 *
 * @param agentId - Agent ID to rate
 * @param userId - User ID submitting rating
 * @param rating - Rating value (1-5)
 * @param review - Optional review text
 * @returns Promise resolving to saved rating
 * @throws {ValidationError} If rating is invalid
 * @throws {NotFoundError} If agent doesn't exist
 * @throws {StorageError} If save fails
 *
 * @example
 * ```typescript
 * const rating = await rateAgent('my-agent-v1', 'user-123', 5, 'Great agent!');
 * console.log(`Rating submitted: ${rating.id}`);
 * ```
 */
export async function rateAgent(
  agentId: string,
  userId: string,
  rating: number,
  review?: string
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

  // Check if agent exists
  const agent = await loadMarketplaceAgent(agentId);
  if (!agent) {
    throw new NotFoundError('marketplace agent', agentId);
  }

  // Check if user already rated
  const existing = await getUserRating(agentId, userId);

  if (existing) {
    // Update existing rating
    const updated: AgentRating = {
      ...existing,
      rating,
      review,
      updatedAt: Date.now(),
    };

    await saveRating(updated);

    // Recalculate average
    await recalculateAverageRating(agentId);

    return updated;
  } else {
    // Create new rating
    const newRating: AgentRating = {
      id: generateRatingId(),
      agentId,
      userId,
      rating,
      review,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveRating(newRating);

    // Recalculate average
    await recalculateAverageRating(agentId);

    return newRating;
  }
}

/**
 * Get all ratings for an agent
 *
 * @param agentId - Agent ID
 * @returns Promise resolving to array of ratings
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const ratings = await getAgentRatings('my-agent-v1');
 * console.log(`Total ratings: ${ratings.length}`);
 * ```
 */
export async function getAgentRatings(agentId: string): Promise<AgentRating[]> {
  if (!agentId?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'agentId',
      value: agentId,
    });
  }

  return getRatingsForAgent(agentId);
}

/**
 * Get average rating for an agent
 *
 * @param agentId - Agent ID
 * @returns Promise resolving to average rating (0 if no ratings)
 * @throws {ValidationError} If agent ID is empty
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const avg = await getAverageRating('my-agent-v1');
 * console.log(`Average rating: ${avg.toFixed(1)} / 5`);
 * ```
 */
export async function getAverageRating(agentId: string): Promise<number> {
  if (!agentId?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'agentId',
      value: agentId,
    });
  }

  const ratings = await getRatingsForAgent(agentId);

  if (ratings.length === 0) {
    return 0;
  }

  const sum = ratings.reduce((total, r) => total + r.rating, 0);
  return sum / ratings.length;
}

/**
 * Get user's rating for an agent
 *
 * @param agentId - Agent ID
 * @param userId - User ID
 * @returns Promise resolving to rating or null if not found
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const rating = await getUserRatingForAgent('my-agent-v1', 'user-123');
 * if (rating) {
 *   console.log(`User rated: ${rating.rating}`);
 * }
 * ```
 */
export async function getUserRatingForAgent(agentId: string, userId: string): Promise<AgentRating | null> {
  if (!agentId?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'agentId',
      value: agentId,
    });
  }

  if (!userId?.trim()) {
    throw new ValidationError('User ID cannot be empty', {
      field: 'userId',
      value: userId,
    });
  }

  return getUserRating(agentId, userId);
}

/**
 * Update a rating
 *
 * @param agentId - Agent ID
 * @param ratingId - Rating ID to update
 * @param newRating - New rating value (1-5)
 * @param newReview - New review text (optional)
 * @returns Promise resolving to updated rating
 * @throws {ValidationError} If inputs are invalid
 * @throws {NotFoundError} If rating doesn't exist
 * @throws {StorageError} If update fails
 *
 * @example
 * ```typescript
 * const updated = await updateRating('my-agent-v1', 'rating-123', 4, 'Updated review');
 * ```
 */
export async function updateRating(
  agentId: string,
  ratingId: string,
  newRating: number,
  newReview?: string
): Promise<AgentRating> {
  // Validate rating
  if (newRating < 1 || newRating > 5) {
    throw new ValidationError('Rating must be between 1 and 5', {
      field: 'rating',
      value: newRating,
    });
  }

  // Validate IDs
  if (!agentId?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'agentId',
      value: agentId,
    });
  }

  if (!ratingId?.trim()) {
    throw new ValidationError('Rating ID cannot be empty', {
      field: 'ratingId',
      value: ratingId,
    });
  }

  // Get existing rating
  const ratings = await getRatingsForAgent(agentId);
  const existing = ratings.find((r) => r.id === ratingId);

  if (!existing) {
    throw new NotFoundError('rating', ratingId);
  }

  // Update rating
  const updated: AgentRating = {
    ...existing,
    rating: newRating,
    review: newReview,
    updatedAt: Date.now(),
  };

  await saveRating(updated);

  // Recalculate average
  await recalculateAverageRating(agentId);

  return updated;
}

/**
 * Delete a rating
 *
 * @param agentId - Agent ID
 * @param ratingId - Rating ID to delete
 * @returns Promise that resolves when deletion is complete
 * @throws {ValidationError} If inputs are invalid
 * @throws {NotFoundError} If rating doesn't exist
 * @throws {StorageError} If deletion fails
 *
 * @example
 * ```typescript
 * await deleteRatingForAgent('my-agent-v1', 'rating-123');
 * ```
 */
export async function deleteRatingForAgent(agentId: string, ratingId: string): Promise<void> {
  // Validate IDs
  if (!agentId?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'agentId',
      value: agentId,
    });
  }

  if (!ratingId?.trim()) {
    throw new ValidationError('Rating ID cannot be empty', {
      field: 'ratingId',
      value: ratingId,
    });
  }

  // Check if rating exists
  const ratings = await getRatingsForAgent(agentId);
  const existing = ratings.find((r) => r.id === ratingId);

  if (!existing) {
    throw new NotFoundError('rating', ratingId);
  }

  // Delete rating
  await deleteRating(ratingId);

  // Recalculate average
  await recalculateAverageRating(agentId);
}

/**
 * Get rating distribution for an agent
 *
 * @param agentId - Agent ID
 * @returns Promise resolving to distribution object
 * @throws {ValidationError} If agent ID is empty
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const distribution = await getRatingDistribution('my-agent-v1');
 * console.log(`5 stars: ${distribution[5]}`);
 * console.log(`4 stars: ${distribution[4]}`);
 * ```
 */
export async function getRatingDistribution(agentId: string): Promise<Record<number, number>> {
  if (!agentId?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'agentId',
      value: agentId,
    });
  }

  const ratings = await getRatingsForAgent(agentId);

  const distribution: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  ratings.forEach((r) => {
    distribution[r.rating]++;
  });

  return distribution;
}

/**
 * Get top-rated agents
 *
 * @param limit - Maximum number of agents to return
 * @param minRatings - Minimum number of ratings required (default: 1)
 * @returns Promise resolving to array of agent IDs and ratings
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const topRated = await getTopRatedAgents(10, 5);
 * console.log('Top rated agents:', topRated);
 * ```
 */
export async function getTopRatedAgents(limit: number, minRatings = 1): Promise<Array<{ agentId: string; rating: number }>> {
  const { loadAllMarketplaceAgents } = await import('./storage');
  const agents = await loadAllMarketplaceAgents();

  // Filter by minimum ratings
  const qualified = agents.filter((a) => a.marketplace.stats.ratingCount >= minRatings);

  // Sort by rating
  const sorted = qualified.sort((a, b) => b.marketplace.stats.rating - a.marketplace.stats.rating);

  // Return top N
  return sorted.slice(0, limit).map((a) => ({
    agentId: a.id,
    rating: a.marketplace.stats.rating,
  }));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Recalculate average rating for an agent
 */
async function recalculateAverageRating(agentId: string): Promise<void> {
  const ratings = await getRatingsForAgent(agentId);

  const average = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0;

  await updateAgentStats(agentId, {
    rating: average,
    ratingCount: ratings.length,
  });
}

/**
 * Generate unique rating ID
 */
function generateRatingId(): string {
  return `rating-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
