/**
 * Rating System Tests
 *
 * Comprehensive test suite for the marketplace rating system.
 * Tests rating submission, retrieval, calculation, and statistics.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  rateAgent,
  getAgentRatings,
  getAverageRating,
  getUserRatingForAgent,
  updateRating,
  deleteRatingForAgent,
  getRatingDistribution,
  getRatingStats,
  getAgentReviews,
  markReviewHelpful,
  getTopRatedAgents,
} from '../ratings';
import type { AgentRating } from '../types';
import {
  calculateBayesianAverage,
  calculateDistribution,
  calculateRatingStats,
  calculateConfidenceInterval,
  calculateRatingTrend,
  calculateQualityScore,
  calculatePercentileRank,
  normalizeRating,
  roundRating,
  calculateWeightedRating,
} from '../rating-calculator';

// Mock IndexedDB
const mockRatings: Map<string, AgentRating[]> = new Map();
const mockAgents: Map<string, any> = new Map();

// Mock storage functions
vi.mock('../storage', () => ({
  saveRating: async (rating: AgentRating) => {
    const agentRatings = mockRatings.get(rating.agentId) || [];
    const existingIndex = agentRatings.findIndex((r) => r.userId === rating.userId);

    if (existingIndex >= 0) {
      agentRatings[existingIndex] = rating;
    } else {
      agentRatings.push(rating);
    }

    mockRatings.set(rating.agentId, agentRatings);
    return rating;
  },

  getRatingsForAgent: async (agentId: string) => {
    return mockRatings.get(agentId) || [];
  },

  getUserRating: async (agentId: string, userId: string) => {
    const agentRatings = mockRatings.get(agentId) || [];
    return agentRatings.find((r) => r.userId === userId) || null;
  },

  deleteRating: async (ratingId: string) => {
    for (const [agentId, ratings] of mockRatings.entries()) {
      const filtered = ratings.filter((r) => r.id !== ratingId);
      if (filtered.length !== ratings.length) {
        mockRatings.set(agentId, filtered);
        return;
      }
    }
  },

  loadMarketplaceAgent: async (agentId: string) => {
    return mockAgents.get(agentId) || null;
  },

  loadAllRatings: async () => {
    const all: AgentRating[] = [];
    for (const ratings of mockRatings.values()) {
      all.push(...ratings);
    }
    return all;
  },

  updateAgentStats: async (agentId: string, stats: any) => {
    const agent = mockAgents.get(agentId);
    if (agent) {
      agent.marketplace.stats = {
        ...agent.marketplace.stats,
        ...stats,
      };
      return agent;
    }
    throw new Error('Agent not found');
  },

  loadAllMarketplaceAgents: async () => {
    return Array.from(mockAgents.values());
  },
}));

describe('Rating System', () => {
  beforeEach(() => {
    // Reset mocks
    mockRatings.clear();
    mockAgents.clear();

    // Setup test agents
    mockAgents.set('agent-1', {
      id: 'agent-1',
      name: 'Test Agent 1',
      marketplace: {
        stats: {
          downloads: 100,
          installs: 50,
          rating: 0,
          ratingCount: 0,
          lastUpdated: Date.now(),
        },
      },
    });

    mockAgents.set('agent-2', {
      id: 'agent-2',
      name: 'Test Agent 2',
      marketplace: {
        stats: {
          downloads: 200,
          installs: 100,
          rating: 4.5,
          ratingCount: 10,
          lastUpdated: Date.now(),
        },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rateAgent', () => {
    it('should submit a new rating', async () => {
      const rating = await rateAgent('agent-1', 'user-1', 5, 'Excellent agent!');

      expect(rating).toBeDefined();
      expect(rating.agentId).toBe('agent-1');
      expect(rating.userId).toBe('user-1');
      expect(rating.rating).toBe(5);
      expect(rating.review).toBe('Excellent agent!');
      expect(rating.id).toMatch(/^rating-/);
    });

    it('should update existing rating', async () => {
      await rateAgent('agent-1', 'user-1', 5, 'Great!');
      const updated = await rateAgent('agent-1', 'user-1', 4, 'Good but not perfect');

      expect(updated.rating).toBe(4);
      expect(updated.review).toBe('Good but not perfect');
    });

    it('should throw error for invalid rating', async () => {
      await expect(rateAgent('agent-1', 'user-1', 0)).rejects.toThrow();
      await expect(rateAgent('agent-1', 'user-1', 6)).rejects.toThrow();
    });

    it('should throw error for empty user ID', async () => {
      await expect(rateAgent('agent-1', '', 5)).rejects.toThrow();
      await expect(rateAgent('agent-1', '   ', 5)).rejects.toThrow();
    });

    it('should throw error for non-existent agent', async () => {
      await expect(rateAgent('non-existent', 'user-1', 5)).rejects.toThrow();
    });

    it('should allow optional review', async () => {
      const rating = await rateAgent('agent-1', 'user-1', 5);

      expect(rating.review).toBeUndefined();
      expect(rating.rating).toBe(5);
    });
  });

  describe('getAgentRatings', () => {
    it('should return empty array for agent with no ratings', async () => {
      const ratings = await getAgentRatings('agent-1');
      expect(ratings).toEqual([]);
    });

    it('should return all ratings for an agent', async () => {
      await rateAgent('agent-1', 'user-1', 5);
      await rateAgent('agent-1', 'user-2', 4);
      await rateAgent('agent-1', 'user-3', 3);

      const ratings = await getAgentRatings('agent-1');
      expect(ratings).toHaveLength(3);
    });

    it('should throw error for empty agent ID', async () => {
      await expect(getAgentRatings('')).rejects.toThrow();
    });
  });

  describe('getAverageRating', () => {
    it('should return 0 for agent with no ratings', async () => {
      const avg = await getAverageRating('agent-1');
      expect(avg).toBe(0);
    });

    it('should calculate average correctly', async () => {
      await rateAgent('agent-1', 'user-1', 5);
      await rateAgent('agent-1', 'user-2', 4);
      await rateAgent('agent-1', 'user-3', 3);

      const avg = await getAverageRating('agent-1');
      expect(avg).toBe(4); // (5 + 4 + 3) / 3
    });

    it('should handle decimal averages', async () => {
      await rateAgent('agent-1', 'user-1', 5);
      await rateAgent('agent-1', 'user-2', 4);

      const avg = await getAverageRating('agent-1');
      expect(avg).toBe(4.5);
    });
  });

  describe('getUserRatingForAgent', () => {
    it('should return null for user who has not rated', async () => {
      const rating = await getUserRatingForAgent('agent-1', 'user-1');
      expect(rating).toBeNull();
    });

    it('should return user rating if exists', async () => {
      await rateAgent('agent-1', 'user-1', 5);

      const rating = await getUserRatingForAgent('agent-1', 'user-1');
      expect(rating).not.toBeNull();
      expect(rating?.rating).toBe(5);
    });

    it('should only return rating for specific user', async () => {
      await rateAgent('agent-1', 'user-1', 5);
      await rateAgent('agent-1', 'user-2', 3);

      const rating1 = await getUserRatingForAgent('agent-1', 'user-1');
      const rating2 = await getUserRatingForAgent('agent-1', 'user-2');

      expect(rating1?.rating).toBe(5);
      expect(rating2?.rating).toBe(3);
    });
  });

  describe('updateRating', () => {
    it('should update rating', async () => {
      const original = await rateAgent('agent-1', 'user-1', 5, 'Great');
      const updated = await updateRating('agent-1', original.id, 4, 'Good');

      expect(updated.rating).toBe(4);
      expect(updated.review).toBe('Good');
    });

    it('should throw error for non-existent rating', async () => {
      await expect(updateRating('agent-1', 'non-existent', 4)).rejects.toThrow();
    });

    it('should throw error for invalid rating', async () => {
      const original = await rateAgent('agent-1', 'user-1', 5);
      await expect(updateRating('agent-1', original.id, 6)).rejects.toThrow();
    });
  });

  describe('deleteRatingForAgent', () => {
    it('should delete rating', async () => {
      const rating = await rateAgent('agent-1', 'user-1', 5);
      await deleteRatingForAgent('agent-1', rating.id);

      const ratings = await getAgentRatings('agent-1');
      expect(ratings).toHaveLength(0);
    });

    it('should throw error for non-existent rating', async () => {
      await expect(deleteRatingForAgent('agent-1', 'non-existent')).rejects.toThrow();
    });
  });

  describe('getRatingDistribution', () => {
    it('should return empty distribution for no ratings', async () => {
      const distribution = await getRatingDistribution('agent-1');
      expect(distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    });

    it('should calculate distribution correctly', async () => {
      await rateAgent('agent-1', 'user-1', 5);
      await rateAgent('agent-1', 'user-2', 5);
      await rateAgent('agent-1', 'user-3', 4);
      await rateAgent('agent-1', 'user-4', 3);

      const distribution = await getRatingDistribution('agent-1');
      expect(distribution[5]).toBe(2);
      expect(distribution[4]).toBe(1);
      expect(distribution[3]).toBe(1);
      expect(distribution[2]).toBe(0);
      expect(distribution[1]).toBe(0);
    });
  });

  describe('getRatingStats', () => {
    it('should return zero stats for no ratings', async () => {
      const stats = await getRatingStats('agent-1');
      expect(stats.average).toBe(0);
      expect(stats.count).toBe(0);
    });

    it('should calculate stats correctly', async () => {
      await rateAgent('agent-1', 'user-1', 5);
      await rateAgent('agent-1', 'user-2', 5);
      await rateAgent('agent-1', 'user-3', 4);

      const stats = await getRatingStats('agent-1');
      expect(stats.average).toBeCloseTo(4.67, 1);
      expect(stats.count).toBe(3);
      expect(stats.distribution[5]).toBe(2);
      expect(stats.distribution[4]).toBe(1);
      expect(stats.distributionPercentages[5]).toBeCloseTo(66.67, 1);
    });
  });

  describe('getAgentReviews', () => {
    beforeEach(async () => {
      // Create multiple reviews
      for (let i = 1; i <= 15; i++) {
        const agentId = `agent-${i}`;
        // Create agent first
        mockAgents.set(agentId, {
          id: agentId,
          name: `Agent ${i}`,
          marketplace: {
            stats: {
              downloads: 100,
              installs: 50,
              rating: 0,
              ratingCount: 0,
              lastUpdated: Date.now(),
            },
          },
        });
        await rateAgent(agentId, `user-${i}`, i % 5 + 1, `Review ${i}`);
      }
    });

    it('should return paginated reviews', async () => {
      const result = await getAgentReviews('agent-1', 1, 5);
      expect(result.reviews).toHaveLength(1); // Only 1 review for agent-1
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(5);
      expect(result.totalReviews).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should sort by recent', async () => {
      const result = await getAgentReviews('agent-1', 1, 10, 'recent');
      expect(result.reviews).toBeDefined();
    });

    it('should validate page size', async () => {
      await expect(getAgentReviews('agent-1', 1, 0)).rejects.toThrow();
      await expect(getAgentReviews('agent-1', 1, 101)).rejects.toThrow();
    });
  });

  describe('markReviewHelpful', () => {
    it('should increment helpful count', async () => {
      const rating = await rateAgent('agent-1', 'user-1', 5);
      const updated = await markReviewHelpful(rating.id, 'user-2');

      expect(updated.helpful).toBe(1);
      expect(updated.userMarkedHelpful).toBe(true);
    });

    it('should throw error if already marked', async () => {
      const rating = await rateAgent('agent-1', 'user-1', 5);
      await markReviewHelpful(rating.id, 'user-2');

      await expect(markReviewHelpful(rating.id, 'user-2')).rejects.toThrow();
    });
  });

  describe('getTopRatedAgents', () => {
    beforeEach(async () => {
      // Create agents with different ratings
      for (let i = 1; i <= 10; i++) {
        const agentId = `top-agent-${i}`;
        mockAgents.set(agentId, {
          id: agentId,
          name: `Agent ${i}`,
          marketplace: {
            stats: {
              rating: 3 + (i % 3),
              ratingCount: i,
              downloads: 100,
              installs: 50,
              lastUpdated: Date.now(),
            },
          },
        });
      }
    });

    it('should return top rated agents', async () => {
      const top = await getTopRatedAgents(5, 3);
      expect(top).toHaveLength(5);
    });

    it('should respect minimum ratings threshold', async () => {
      const top = await getTopRatedAgents(10, 5);
      top.forEach((agent) => {
        const agentData = mockAgents.get(agent.agentId);
        expect(agentData?.marketplace.stats.ratingCount).toBeGreaterThanOrEqual(5);
      });
    });
  });
});

describe('Rating Calculator', () => {
  let testRatings: AgentRating[];

  beforeEach(() => {
    const now = Date.now();
    testRatings = [
      { id: '1', agentId: 'agent-1', userId: 'user-1', rating: 5, createdAt: now, updatedAt: now },
      { id: '2', agentId: 'agent-1', userId: 'user-2', rating: 4, createdAt: now - 1000, updatedAt: now - 1000 },
      { id: '3', agentId: 'agent-1', userId: 'user-3', rating: 5, createdAt: now - 2000, updatedAt: now - 2000 },
      { id: '4', agentId: 'agent-1', userId: 'user-4', rating: 3, createdAt: now - 3000, updatedAt: now - 3000 },
      { id: '5', agentId: 'agent-1', userId: 'user-5', rating: 4, createdAt: now - 4000, updatedAt: now - 4000 },
    ];
  });

  describe('calculateBayesianAverage', () => {
    it('should return 0 for no ratings', () => {
      const result = calculateBayesianAverage([]);
      expect(result).toBe(0);
    });

    it('should weight low sample sizes toward global mean', () => {
      const fewRatings = testRatings.slice(0, 2); // Only 2 ratings
      const bayesian = calculateBayesianAverage(fewRatings, 5, 3.5);

      const simpleAvg = fewRatings.reduce((sum, r) => sum + r.rating, 0) / fewRatings.length;

      // Bayesian should be closer to global mean (3.5) than simple avg
      expect(Math.abs(bayesian - 3.5)).toBeLessThan(Math.abs(simpleAvg - 3.5));
    });

    it('should converge to simple average with large sample', () => {
      const manyRatings = [...testRatings, ...testRatings, ...testRatings]; // 15 ratings
      const bayesian = calculateBayesianAverage(manyRatings, 5, 3.5);

      const simpleAvg = manyRatings.reduce((sum, r) => sum + r.rating, 0) / manyRatings.length;

      // Should be very close with large sample
      expect(Math.abs(bayesian - simpleAvg)).toBeLessThan(0.2);
    });
  });

  describe('calculateDistribution', () => {
    it('should return empty distribution for no ratings', () => {
      const distribution = calculateDistribution([]);
      expect(Object.values(distribution).every((d) => d.count === 0)).toBe(true);
    });

    it('should calculate distribution correctly', () => {
      const distribution = calculateDistribution(testRatings);

      expect(distribution[5].count).toBe(2);
      expect(distribution[4].count).toBe(2);
      expect(distribution[3].count).toBe(1);
      expect(distribution[5].percentage).toBe(40);
      expect(distribution[4].percentage).toBe(40);
      expect(distribution[3].percentage).toBe(20);
    });
  });

  describe('calculateRatingStats', () => {
    it('should return zero stats for no ratings', () => {
      const stats = calculateRatingStats([]);
      expect(stats.average).toBe(0);
      expect(stats.count).toBe(0);
      expect(stats.median).toBe(0);
    });

    it('should calculate average correctly', () => {
      const stats = calculateRatingStats(testRatings);
      expect(stats.average).toBe(4.2); // (5+4+5+3+4)/5
    });

    it('should calculate median correctly', () => {
      const stats = calculateRatingStats(testRatings);
      expect(stats.median).toBe(4); // Middle value of [3,4,4,5,5]
    });

    it('should calculate mode correctly', () => {
      const stats = calculateRatingStats(testRatings);
      expect(stats.mode).toBe(5); // 5 appears 2 times, 4 appears 2 times (both modes)
    });

    it('should calculate standard deviation', () => {
      const stats = calculateRatingStats(testRatings);
      expect(stats.standardDeviation).toBeGreaterThan(0);
      expect(stats.standardDeviation).toBeLessThan(2);
    });

    it('should identify min and max', () => {
      const stats = calculateRatingStats(testRatings);
      expect(stats.min).toBe(3);
      expect(stats.max).toBe(5);
    });
  });

  describe('calculateConfidenceInterval', () => {
    it('should return zero interval for no ratings', () => {
      const ci = calculateConfidenceInterval([]);
      expect(ci.lower).toBe(0);
      expect(ci.upper).toBe(0);
    });

    it('should return point estimate for single rating', () => {
      const ci = calculateConfidenceInterval([testRatings[0]]);
      expect(ci.lower).toBe(5);
      expect(ci.upper).toBe(5);
      expect(ci.margin).toBe(0);
    });

    it('should calculate valid interval', () => {
      const ci = calculateConfidenceInterval(testRatings);
      expect(ci.lower).toBeGreaterThan(0);
      expect(ci.upper).toBeLessThanOrEqual(5);
      expect(ci.margin).toBeGreaterThan(0);
      expect(ci.upper).toBeGreaterThan(ci.lower);
    });
  });

  describe('calculateRatingTrend', () => {
    it('should return stable for insufficient data', () => {
      const trend = calculateRatingTrend([testRatings[0]]);
      expect(trend.direction).toBe('stable');
      expect(trend.confidence).toBe('low');
    });

    it('should detect improving trend', () => {
      const improvingRatings = [
        { ...testRatings[0], rating: 3, createdAt: 1000 },
        { ...testRatings[1], rating: 4, createdAt: 2000 },
        { ...testRatings[2], rating: 5, createdAt: 3000 },
      ];

      const trend = calculateRatingTrend(improvingRatings);
      expect(trend.direction).toBe('improving');
      expect(trend.change).toBeGreaterThan(0);
    });

    it('should detect declining trend', () => {
      const decliningRatings = [
        { ...testRatings[0], rating: 5, createdAt: 1000 },
        { ...testRatings[1], rating: 4, createdAt: 2000 },
        { ...testRatings[2], rating: 3, createdAt: 3000 },
      ];

      const trend = calculateRatingTrend(decliningRatings);
      expect(trend.direction).toBe('declining');
      expect(trend.change).toBeLessThan(0);
    });
  });

  describe('calculateQualityScore', () => {
    it('should return 0 for no ratings', () => {
      const score = calculateQualityScore([]);
      expect(score).toBe(0);
    });

    it('should calculate high score for excellent ratings', () => {
      const excellentRatings = Array(10).fill(null).map((_, i) => ({
        ...testRatings[0],
        rating: 5,
        id: `${i}`,
      }));

      const score = calculateQualityScore(excellentRatings);
      expect(score).toBeGreaterThan(70);
    });

    it('should calculate low score for poor ratings', () => {
      const poorRatings = Array(10).fill(null).map((_, i) => ({
        ...testRatings[0],
        rating: 1,
        id: `${i}`,
      }));

      const score = calculateQualityScore(poorRatings);
      expect(score).toBeLessThan(30);
    });
  });

  describe('calculatePercentileRank', () => {
    it('should return 0 for empty array', () => {
      const percentile = calculatePercentileRank(4.0, []);
      expect(percentile).toBe(0);
    });

    it('should calculate percentile correctly', () => {
      const allRatings = [3.0, 3.5, 4.0, 4.2, 4.5, 4.8];
      const percentile = calculatePercentileRank(4.5, allRatings);

      expect(percentile).toBeGreaterThan(50);
      expect(percentile).toBeLessThan(100);
    });

    it('should return high percentile for highest rating', () => {
      const allRatings = [3.0, 3.5, 4.0, 4.5];
      const percentile = calculatePercentileRank(4.5, allRatings);
      expect(percentile).toBe(87.5); // (3 + 0.5 * 1) / 4 * 100
    });
  });

  describe('normalizeRating', () => {
    it('should normalize to different scale', () => {
      const normalized = normalizeRating(4, 1, 5, 0, 100);
      expect(normalized).toBe(75);
    });

    it('should handle edge values', () => {
      expect(normalizeRating(1, 1, 5, 0, 10)).toBe(0);
      expect(normalizeRating(5, 1, 5, 0, 10)).toBe(10);
    });

    it('should clamp to target range', () => {
      expect(normalizeRating(6, 1, 5, 0, 10)).toBe(10);
      expect(normalizeRating(0, 1, 5, 0, 10)).toBe(0);
    });
  });

  describe('roundRating', () => {
    it('should round to nearest 0.5', () => {
      expect(roundRating(4.3)).toBe(4.5);
      expect(roundRating(4.2)).toBe(4.0);
      expect(roundRating(4.7)).toBe(4.5);
      expect(roundRating(4.8)).toBe(5.0);
    });

    it('should handle exact values', () => {
      expect(roundRating(4.0)).toBe(4.0);
      expect(roundRating(4.5)).toBe(4.5);
      expect(roundRating(5.0)).toBe(5.0);
    });
  });

  describe('calculateWeightedRating', () => {
    it('should return 0 for no ratings', () => {
      const weighted = calculateWeightedRating([]);
      expect(weighted).toBe(0);
    });

    it('should weight recent ratings higher', () => {
      const now = Date.now();
      const ratings = [
        { ...testRatings[0], rating: 5, createdAt: now },
        { ...testRatings[1], rating: 3, createdAt: now - 365 * 24 * 60 * 60 * 1000 }, // 1 year ago
      ];

      const weighted = calculateWeightedRating(ratings, 0.01);
      const simple = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

      // Weighted should be higher than simple average (recent 5 has more weight)
      expect(weighted).toBeGreaterThan(simple);
    });

    it('should return simple average for same-time ratings', () => {
      const sameTime = testRatings.map((r) => ({ ...r, createdAt: Date.now() }));
      const weighted = calculateWeightedRating(sameTime);
      const simple = sameTime.reduce((sum, r) => sum + r.rating, 0) / sameTime.length;

      expect(weighted).toBeCloseTo(simple, 1);
    });
  });
});
