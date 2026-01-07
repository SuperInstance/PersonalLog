/**
 * Rating Calculator Module
 *
 * Advanced rating calculations for marketplace agents.
 * Includes Bayesian averaging, distribution analysis, and trend detection.
 */

import type { AgentRating, RatingStats } from './types';

/**
 * Calculate Bayesian average rating
 *
 * Uses Bayesian estimation to avoid bias for agents with few ratings.
 * Formula: (C * m + sum(ratings)) / (C + n)
 * Where:
 * - C = confidence factor (minimum ratings threshold)
 * - m = global mean rating
 * - n = number of ratings for this agent
 *
 * @param ratings - Array of ratings
 * @param confidenceFactor - Minimum ratings for confidence (default: 5)
 * @param globalMean - Global average rating (default: 3.5)
 * @returns Bayesian average (0-5)
 *
 * @example
 * ```typescript
 * const bayesianAvg = calculateBayesianAverage([5, 5, 5], 5, 3.5);
 * // Returns weighted average that accounts for low sample size
 * ```
 */
export function calculateBayesianAverage(
  ratings: AgentRating[],
  confidenceFactor: number = 5,
  globalMean: number = 3.5
): number {
  if (ratings.length === 0) {
    return 0;
  }

  const n = ratings.length;
  const sum = ratings.reduce((total, r) => total + r.rating, 0);

  // Bayesian average formula
  const bayesianAvg = (confidenceFactor * globalMean + sum) / (confidenceFactor + n);

  return Math.min(5, Math.max(0, bayesianAvg));
}

/**
 * Calculate rating distribution
 *
 * Computes the count and percentage of each star rating (1-5).
 *
 * @param ratings - Array of ratings
 * @returns Distribution object with counts and percentages
 *
 * @example
 * ```typescript
 * const distribution = calculateDistribution([5, 4, 5, 3, 5]);
 * console.log(distribution[5]); // { count: 3, percentage: 60 }
 * ```
 */
export function calculateDistribution(
  ratings: AgentRating[]
): Record<number, { count: number; percentage: number }> {
  const distribution: Record<number, { count: number; percentage: number }> = {
    1: { count: 0, percentage: 0 },
    2: { count: 0, percentage: 0 },
    3: { count: 0, percentage: 0 },
    4: { count: 0, percentage: 0 },
    5: { count: 0, percentage: 0 },
  };

  if (ratings.length === 0) {
    return distribution;
  }

  // Count each rating
  ratings.forEach((rating) => {
    const star = Math.round(rating.rating);
    if (star >= 1 && star <= 5) {
      distribution[star].count++;
    }
  });

  // Calculate percentages
  for (let i = 1; i <= 5; i++) {
    distribution[i].percentage = (distribution[i].count / ratings.length) * 100;
  }

  return distribution;
}

/**
 * Calculate rating statistics
 *
 * Computes comprehensive statistics including average, median, mode,
 * standard deviation, and distribution.
 *
 * @param ratings - Array of ratings
 * @returns Complete rating statistics
 *
 * @example
 * ```typescript
 * const stats = calculateRatingStats([5, 4, 5, 3, 5]);
 * console.log(stats.average); // 4.4
 * console.log(stats.median);  // 5
 * console.log(stats.mode);    // 5
 * ```
 */
export function calculateRatingStats(ratings: AgentRating[]): {
  average: number;
  median: number;
  mode: number;
  standardDeviation: number;
  min: number;
  max: number;
  count: number;
  distribution: Record<number, number>;
  distributionPercentages: Record<number, number>;
} {
  const count = ratings.length;

  if (count === 0) {
    return {
      average: 0,
      median: 0,
      mode: 0,
      standardDeviation: 0,
      min: 0,
      max: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      distributionPercentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  // Calculate average
  const sum = ratings.reduce((total, r) => total + r.rating, 0);
  const average = sum / count;

  // Calculate median
  const sorted = [...ratings].map((r) => r.rating).sort((a, b) => a - b);
  const mid = Math.floor(count / 2);
  const median = count % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  // Calculate mode
  const frequency: Record<number, number> = {};
  ratings.forEach((r) => {
    frequency[r.rating] = (frequency[r.rating] || 0) + 1;
  });
  const mode = parseInt(
    Object.keys(frequency).reduce((a, b) => (frequency[parseInt(a)] > frequency[parseInt(b)] ? a : b))
  );

  // Calculate standard deviation
  const variance = ratings.reduce((total, r) => total + Math.pow(r.rating - average, 2), 0) / count;
  const standardDeviation = Math.sqrt(variance);

  // Calculate distribution
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach((r) => {
    const star = Math.round(r.rating);
    if (star >= 1 && star <= 5) {
      distribution[star]++;
    }
  });

  const distributionPercentages: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (let i = 1; i <= 5; i++) {
    distributionPercentages[i] = (distribution[i] / count) * 100;
  }

  return {
    average,
    median,
    mode,
    standardDeviation,
    min: Math.min(...sorted),
    max: Math.max(...sorted),
    count,
    distribution,
    distributionPercentages,
  };
}

/**
 * Calculate rating confidence interval
 *
 * Computes the 95% confidence interval for the average rating.
 * Uses the t-distribution for small sample sizes.
 *
 * @param ratings - Array of ratings
 * @returns Confidence interval object
 *
 * @example
 * ```typescript
 * const ci = calculateConfidenceInterval([5, 4, 5, 3, 5]);
 * console.log(ci.lower); // 3.2
 * console.log(ci.upper); // 5.0
 * ```
 */
export function calculateConfidenceInterval(
  ratings: AgentRating[],
  confidence: number = 0.95
): { lower: number; upper: number; margin: number } {
  const count = ratings.length;

  if (count === 0) {
    return { lower: 0, upper: 0, margin: 0 };
  }

  if (count === 1) {
    const rating = ratings[0].rating;
    return { lower: rating, upper: rating, margin: 0 };
  }

  const stats = calculateRatingStats(ratings);
  const standardError = stats.standardDeviation / Math.sqrt(count);

  // Approximate t-value for 95% confidence (conservative)
  // For larger samples, this approaches 1.96
  const tValue = count < 30 ? 2.0 : 1.96;

  const margin = tValue * standardError;
  const lower = Math.max(0, stats.average - margin);
  const upper = Math.min(5, stats.average + margin);

  return { lower, upper, margin };
}

/**
 * Calculate rating trend
 *
 * Analyzes ratings over time to detect trends (improving, declining, stable).
 *
 * @param ratings - Array of ratings
 * @returns Trend analysis result
 *
 * @example
 * ```typescript
 * const trend = calculateRatingTrend([rating1, rating2, rating3]);
 * console.log(trend.direction); // 'improving' | 'declining' | 'stable'
 * ```
 */
export function calculateRatingTrend(
  ratings: AgentRating[]
): {
  direction: 'improving' | 'declining' | 'stable';
  recentAverage: number;
  olderAverage: number;
  change: number;
  confidence: 'low' | 'medium' | 'high';
} {
  if (ratings.length < 3) {
    return {
      direction: 'stable',
      recentAverage: 0,
      olderAverage: 0,
      change: 0,
      confidence: 'low',
    };
  }

  // Sort by time
  const sorted = [...ratings].sort((a, b) => a.createdAt - b.createdAt);

  // Split into recent and older halves
  const mid = Math.floor(sorted.length / 2);
  const older = sorted.slice(0, mid);
  const recent = sorted.slice(mid);

  const olderAvg = older.reduce((sum, r) => sum + r.rating, 0) / older.length;
  const recentAvg = recent.reduce((sum, r) => sum + r.rating, 0) / recent.length;

  const change = recentAvg - olderAvg;

  let direction: 'improving' | 'declining' | 'stable';
  if (change > 0.3) {
    direction = 'improving';
  } else if (change < -0.3) {
    direction = 'declining';
  } else {
    direction = 'stable';
  }

  // Confidence based on sample size
  let confidence: 'low' | 'medium' | 'high';
  if (ratings.length < 5) {
    confidence = 'low';
  } else if (ratings.length < 20) {
    confidence = 'medium';
  } else {
    confidence = 'high';
  }

  return {
    direction,
    recentAverage: recentAvg,
    olderAverage: olderAvg,
    change,
    confidence,
  };
}

/**
 * Calculate rating quality score
 *
 * Computes a quality score (0-100) based on:
 * - Average rating
 * - Number of ratings
 * - Distribution skew (prefer positive)
 * - Standard deviation (consistency)
 *
 * @param ratings - Array of ratings
 * @param globalMean - Global average rating for context
 * @returns Quality score (0-100)
 *
 * @example
 * ```typescript
 * const score = calculateQualityScore([5, 5, 5, 4, 5], 3.5);
 * console.log(score); // 95 (high quality)
 * ```
 */
export function calculateQualityScore(ratings: AgentRating[], globalMean: number = 3.5): number {
  if (ratings.length === 0) {
    return 0;
  }

  const stats = calculateRatingStats(ratings);

  // Rating score (0-40 points)
  const ratingScore = (stats.average / 5) * 40;

  // Volume score (0-30 points, logarithmic scale)
  const volumeScore = Math.min(30, Math.log10(ratings.length + 1) * 10);

  // Distribution score (0-20 points, prefer positive skew)
  const positiveRatio = (stats.distribution[4] + stats.distribution[5]) / stats.count;
  const distributionScore = positiveRatio * 20;

  // Consistency score (0-10 points, lower std dev is better)
  const consistencyScore = Math.max(0, 10 - stats.standardDeviation * 2);

  const totalScore = ratingScore + volumeScore + distributionScore + consistencyScore;

  return Math.min(100, Math.max(0, totalScore));
}

/**
 * Calculate percentile rank
 *
 * Computes the percentile rank of an agent's rating among all agents.
 *
 * @param agentRating - Agent's average rating
 * @param allRatings - Array of all agents' average ratings
 * @returns Percentile rank (0-100)
 *
 * @example
 * ```typescript
 * const percentile = calculatePercentileRank(4.5, [3.0, 3.5, 4.0, 4.2, 4.5, 4.8]);
 * console.log(percentile); // 83.3 (top 17%)
 * ```
 */
export function calculatePercentileRank(agentRating: number, allRatings: number[]): number {
  if (allRatings.length === 0) {
    return 0;
  }

  const count = allRatings.length;
  const worse = allRatings.filter((r) => r < agentRating).length;
  const same = allRatings.filter((r) => r === agentRating).length;

  // Percentile = (worse + 0.5 * same) / total * 100
  const percentile = ((worse + 0.5 * same) / count) * 100;

  return Math.min(100, Math.max(0, percentile));
}

/**
 * Normalize rating
 *
 * Normalizes a rating to a different scale.
 * Useful for comparing across different rating systems.
 *
 * @param rating - Original rating
 * @param originalMin - Original scale minimum
 * @param originalMax - Original scale maximum
 * @param targetMin - Target scale minimum
 * @param targetMax - Target scale maximum
 * @returns Normalized rating
 *
 * @example
 * ```typescript
 * const normalized = normalizeRating(4, 1, 5, 0, 100);
 * console.log(normalized); // 75
 * ```
 */
export function normalizeRating(
  rating: number,
  originalMin: number,
  originalMax: number,
  targetMin: number,
  targetMax: number
): number {
  const originalRange = originalMax - originalMin;
  const targetRange = targetMax - targetMin;

  const normalized = ((rating - originalMin) / originalRange) * targetRange + targetMin;

  return Math.min(targetMax, Math.max(targetMin, normalized));
}

/**
 * Round rating to nearest 0.5
 *
 * Rounds a rating to the nearest half-star.
 *
 * @param rating - Rating to round
 * @returns Rounded rating
 *
 * @example
 * ```typescript
 * console.log(roundRating(4.3)); // 4.5
 * console.log(roundRating(4.2)); // 4.0
 * ```
 */
export function roundRating(rating: number): number {
  return Math.round(rating * 2) / 2;
}

/**
 * Calculate weighted rating
 *
 * Calculates a weighted average where more recent ratings have higher weight.
 *
 * @param ratings - Array of ratings
 * @param decayRate - Exponential decay rate (default: 0.1)
 * @returns Weighted average rating
 *
 * @example
 * ```typescript
 * const weighted = calculateWeightedRating([rating1, rating2, rating3], 0.1);
 * // Recent ratings have more influence
 * ```
 */
export function calculateWeightedRating(ratings: AgentRating[], decayRate: number = 0.1): number {
  if (ratings.length === 0) {
    return 0;
  }

  const now = Date.now();
  const oldestTime = Math.min(...ratings.map((r) => r.createdAt));

  let weightedSum = 0;
  let totalWeight = 0;

  ratings.forEach((rating) => {
    const age = now - rating.createdAt;
    const ageInDays = age / (1000 * 60 * 60 * 24);

    // Exponential decay weight
    const weight = Math.exp(-decayRate * ageInDays);

    weightedSum += rating.rating * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
