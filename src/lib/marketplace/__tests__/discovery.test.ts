/**
 * Discovery Engine Tests
 *
 * Comprehensive test suite for the plugin discovery engine.
 * Tests trending, new, top-rated, editor's picks, similarity, and recommendations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getTrendingPlugins,
  getNewPlugins,
  getTopRatedPlugins,
  getEditorsPicks,
  getSimilarPlugins,
  getRecommendedPlugins,
  getPopularByCategory,
  getCategoryStats,
  getSearchSuggestions as getDiscoverySuggestions,
  getPersonalizedFeed,
} from '../discovery';
import type { MarketplaceAgent } from '../types';
import { AgentCategory, ActivationMode } from '@/lib/agents/types';

// Mock storage
const mockAgents: MarketplaceAgent[] = [
  {
    id: 'agent-1',
    name: 'Trending Agent',
    description: 'A trending agent',
    icon: '📈',
    category: AgentCategory.ANALYSIS,
    activationMode: ActivationMode.FOREGROUND,
    initialState: { status: 'idle' } as any,
    metadata: { version: '1.0.0', author: 'Author 1' } as any,
    marketplace: {
      author: 'Author 1',
      version: '1.0.0',
      description: 'Description',
      tags: ['trending', 'popular'],
      stats: {
        downloads: 1000,
        installs: 500,
        rating: 4.5,
        ratingCount: 100,
        lastUpdated: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
        featured: true,
      },
      createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
      visibility: 'public',
      license: 'MIT',
    },
  },
  {
    id: 'agent-2',
    name: 'New Agent',
    description: 'A new agent',
    icon: '✨',
    category: AgentCategory.KNOWLEDGE,
    activationMode: ActivationMode.FOREGROUND,
    initialState: { status: 'idle' } as any,
    metadata: { version: '1.0.0', author: 'Author 2' } as any,
    marketplace: {
      author: 'Author 2',
      version: '1.0.0',
      description: 'Description',
      tags: ['new', 'fresh'],
      stats: {
        downloads: 50,
        installs: 25,
        rating: 5.0,
        ratingCount: 10,
        lastUpdated: Date.now(),
        featured: false,
      },
      createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
      updatedAt: Date.now(),
      visibility: 'public',
      license: 'MIT',
    },
  },
  {
    id: 'agent-3',
    name: 'Top Rated Agent',
    description: 'A top rated agent',
    icon: '⭐',
    category: AgentCategory.CREATIVE,
    activationMode: ActivationMode.FOREGROUND,
    initialState: { status: 'idle' } as any,
    metadata: { version: '1.0.0', author: 'Author 1' } as any,
    marketplace: {
      author: 'Author 1',
      version: '1.0.0',
      description: 'Description',
      tags: ['creative', 'art'],
      stats: {
        downloads: 500,
        installs: 250,
        rating: 4.9,
        ratingCount: 200,
        lastUpdated: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
        featured: true,
      },
      createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000, // 60 days ago
      updatedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
      visibility: 'public',
      license: 'MIT',
    },
  },
  {
    id: 'agent-4',
    name: 'Similar Agent',
    description: 'An agent for similarity testing',
    icon: '🔄',
    category: AgentCategory.ANALYSIS,
    activationMode: ActivationMode.FOREGROUND,
    initialState: { status: 'idle' } as any,
    metadata: { version: '1.0.0', author: 'Author 1' } as any,
    marketplace: {
      author: 'Author 1',
      version: '1.0.0',
      description: 'An analysis agent for testing',
      tags: ['trending', 'analysis'],
      stats: {
        downloads: 300,
        installs: 150,
        rating: 4.0,
        ratingCount: 50,
        lastUpdated: Date.now() - 5 * 24 * 60 * 60 * 1000,
        featured: false,
      },
      createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
      visibility: 'public',
      license: 'MIT',
    },
  },
];

vi.mock('../storage', () => ({
  loadAllMarketplaceAgents: vi.fn(() => Promise.resolve(mockAgents)),
}));

describe('Discovery Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTrendingPlugins', () => {
    it('should return trending plugins with scores', async () => {
      const results = await getTrendingPlugins(10, { days: 7, minDownloads: 10 });

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('plugin');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('reason');
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].score).toBeLessThanOrEqual(1);
    });

    it('should filter by minimum downloads', async () => {
      const results = await getTrendingPlugins(10, { days: 7, minDownloads: 200 });

      results.forEach((result) => {
        expect(result.plugin.marketplace.stats.downloads).toBeGreaterThanOrEqual(200);
      });
    });

    it('should filter by recency', async () => {
      const days = 5;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

      const results = await getTrendingPlugins(10, { days });

      results.forEach((result) => {
        expect(result.plugin.marketplace.updatedAt).toBeGreaterThanOrEqual(cutoff);
      });
    });

    it('should limit results', async () => {
      const limit = 2;
      const results = await getTrendingPlugins(limit);

      expect(results.length).toBeLessThanOrEqual(limit);
    });

    it('should calculate trending score correctly', async () => {
      const results = await getTrendingPlugins(10);

      // More recent and more popular should have higher scores
      const sortedByScore = [...results].sort((a, b) => b.score - a.score);
      expect(results).toEqual(sortedByScore);
    });
  });

  describe('getNewPlugins', () => {
    it('should return newly added plugins', async () => {
      const results = await getNewPlugins(10, 30);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('plugin');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('reason');
    });

    it('should filter by creation date', async () => {
      const days = 10;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

      const results = await getNewPlugins(10, days);

      results.forEach((result) => {
        expect(result.plugin.marketplace.createdAt).toBeGreaterThanOrEqual(cutoff);
      });
    });

    it('should sort by creation date (newest first)', async () => {
      const results = await getNewPlugins(10);

      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1].plugin.marketplace.createdAt;
        const curr = results[i].plugin.marketplace.createdAt;
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it('should limit results', async () => {
      const limit = 2;
      const results = await getNewPlugins(limit);

      expect(results.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('getTopRatedPlugins', () => {
    it('should return top rated plugins', async () => {
      const results = await getTopRatedPlugins(10, 5);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('plugin');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('reason');
    });

    it('should filter by minimum ratings', async () => {
      const minRatings = 50;
      const results = await getTopRatedPlugins(10, minRatings);

      results.forEach((result) => {
        expect(result.plugin.marketplace.stats.ratingCount).toBeGreaterThanOrEqual(minRatings);
      });
    });

    it('should sort by rating (highest first)', async () => {
      const results = await getTopRatedPlugins(10);

      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1].plugin.marketplace.stats.rating;
        const curr = results[i].plugin.marketplace.stats.rating;
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it('should limit results', async () => {
      const limit = 2;
      const results = await getTopRatedPlugins(limit);

      expect(results.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('getEditorsPicks', () => {
    it('should return featured plugins', async () => {
      const results = await getEditorsPicks(10);

      expect(results).toBeDefined();
      results.forEach((result) => {
        expect(result.plugin.marketplace.stats.featured).toBe(true);
      });
    });

    it('should sort by rating (highest first)', async () => {
      const results = await getEditorsPicks(10);

      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1].plugin.marketplace.stats.rating;
        const curr = results[i].plugin.marketplace.stats.rating;
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it('should limit results', async () => {
      const limit = 2;
      const results = await getEditorsPicks(limit);

      expect(results.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('getSimilarPlugins', () => {
    it('should return similar plugins', async () => {
      const results = await getSimilarPlugins('agent-1', 5);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('pluginId');
      expect(results[0]).toHaveProperty('similarity');
      expect(results[0]).toHaveProperty('factors');
    });

    it('should calculate similarity based on category', async () => {
      const results = await getSimilarPlugins('agent-1', 5);

      const sameCategoryResult = results.find((r) => {
        const agent = mockAgents.find((a) => a.id === r.pluginId);
        return agent?.category === AgentCategory.ANALYSIS;
      });

      expect(sameCategoryResult).toBeDefined();
      expect(sameCategoryResult!.factors.some((f) => f.includes('Same category'))).toBe(true);
    });

    it('should calculate similarity based on tags', async () => {
      const results = await getSimilarPlugins('agent-1', 5);

      const similarTagResult = results.find((r) => {
        const agent = mockAgents.find((a) => a.id === r.pluginId);
        return agent?.marketplace.tags.some((tag) =>
          mockAgents[0].marketplace.tags.includes(tag)
        );
      });

      expect(similarTagResult).toBeDefined();
      expect(similarTagResult!.factors.some((f) => f.includes('Common tags'))).toBe(true);
    });

    it('should filter by minimum similarity', async () => {
      const minSimilarity = 0.5;
      const results = await getSimilarPlugins('agent-1', 5, minSimilarity);

      results.forEach((result) => {
        expect(result.similarity).toBeGreaterThanOrEqual(minSimilarity);
      });
    });

    it('should limit results', async () => {
      const limit = 2;
      const results = await getSimilarPlugins('agent-1', limit);

      expect(results.length).toBeLessThanOrEqual(limit);
    });

    it('should exclude the target plugin', async () => {
      const results = await getSimilarPlugins('agent-1', 10);

      const hasTarget = results.some((r) => r.pluginId === 'agent-1');
      expect(hasTarget).toBe(false);
    });

    it('should sort by similarity (highest first)', async () => {
      const results = await getSimilarPlugins('agent-1', 10);

      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1].similarity;
        const curr = results[i].similarity;
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it('should throw error for non-existent plugin', async () => {
      await expect(getSimilarPlugins('non-existent', 5)).rejects.toThrow();
    });
  });

  describe('getRecommendedPlugins', () => {
    it('should return recommendations based on installed plugins', async () => {
      const installed = ['agent-1'];
      const results = await getRecommendedPlugins(installed, 5);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('plugin');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('reason');
    });

    it('should exclude already installed plugins', async () => {
      const installed = ['agent-1', 'agent-2'];
      const results = await getRecommendedPlugins(installed, 10);

      const pluginIds = results.map((r) => r.plugin.id);
      installed.forEach((id) => {
        expect(pluginIds).not.toContain(id);
      });
    });

    it('should fall back to top rated when no plugins installed', async () => {
      const results = await getRecommendedPlugins([], 5);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should limit results', async () => {
      const limit = 2;
      const results = await getRecommendedPlugins(['agent-1'], limit);

      expect(results.length).toBeLessThanOrEqual(limit);
    });

    it('should include similarity-based recommendations', async () => {
      const installed = ['agent-1'];
      const results = await getRecommendedPlugins(installed, 10);

      // Should recommend agent-4 because it's similar to agent-1
      const pluginIds = results.map((r) => r.plugin.id);
      expect(pluginIds).toContain('agent-4');
    });
  });

  describe('getPopularByCategory', () => {
    it('should return popular plugins in category', async () => {
      const results = await getPopularByCategory(AgentCategory.ANALYSIS, 10);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.plugin.category).toBe(AgentCategory.ANALYSIS);
      });
    });

    it('should sort by downloads', async () => {
      const results = await getPopularByCategory(AgentCategory.ANALYSIS, 10);

      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1].plugin.marketplace.stats.downloads;
        const curr = results[i].plugin.marketplace.stats.downloads;
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it('should limit results', async () => {
      const limit = 1;
      const results = await getPopularByCategory(AgentCategory.ANALYSIS, limit);

      expect(results.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('getCategoryStats', () => {
    it('should return statistics for all categories', async () => {
      const stats = await getCategoryStats();

      expect(stats).toBeDefined();
      expect(stats.length).toBeGreaterThan(0);
      stats.forEach((stat) => {
        expect(stat).toHaveProperty('category');
        expect(stat).toHaveProperty('count');
        expect(stat).toHaveProperty('topRated');
        expect(stat.count).toBeGreaterThan(0);
      });
    });

    it('should count plugins correctly', async () => {
      const stats = await getCategoryStats();

      stats.forEach((stat) => {
        const expectedCount = mockAgents.filter((a) => a.category === stat.category).length;
        expect(stat.count).toBe(expectedCount);
      });
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return suggestions for partial query', async () => {
      const suggestions = await getDiscoverySuggestions('trend', 5);

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should return empty for short query', async () => {
      const suggestions = await getDiscoverySuggestions('t', 5);

      expect(suggestions).toEqual([]);
    });

    it('should return empty for empty query', async () => {
      const suggestions = await getDiscoverySuggestions('', 5);

      expect(suggestions).toEqual([]);
    });

    it('should limit suggestions', async () => {
      const limit = 2;
      const suggestions = await getDiscoverySuggestions('a', limit);

      expect(suggestions.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('getPersonalizedFeed', () => {
    it('should return personalized feed', async () => {
      const feed = await getPersonalizedFeed(['agent-1'], {
        trending: 2,
        new: 1,
        topRated: 1,
        recommended: 2,
      });

      expect(feed).toBeDefined();
      expect(feed.length).toBeGreaterThan(0);
    });

    it('should include trending plugins', async () => {
      const feed = await getPersonalizedFeed(['agent-1'], { trending: 2 });

      expect(feed.length).toBeGreaterThan(0);
    });

    it('should include new plugins', async () => {
      const feed = await getPersonalizedFeed(['agent-1'], { new: 2 });

      expect(feed.length).toBeGreaterThan(0);
    });

    it('should include top rated plugins', async () => {
      const feed = await getPersonalizedFeed(['agent-1'], { topRated: 2 });

      expect(feed.length).toBeGreaterThan(0);
    });

    it('should include recommended plugins when installed', async () => {
      const feed = await getPersonalizedFeed(['agent-1'], { recommended: 2 });

      expect(feed.length).toBeGreaterThan(0);
    });

    it('should handle zero installed plugins', async () => {
      const feed = await getPersonalizedFeed([], { recommended: 2 });

      expect(feed).toBeDefined();
      expect(feed.length).toBeGreaterThan(0);
    });
  });
});
