/**
 * Search Engine Tests
 *
 * Comprehensive test suite for the plugin search engine.
 * Tests search, filters, suggestions, history, saved searches, cache, and pagination.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  searchAgents,
  filterByCategory,
  filterByRating,
  getPopularAgents,
  getTopRatedAgents as getTopRatedAgentsSearch,
  getRecentAgents,
  getRecentlyUpdatedAgents,
  getAgentsByTag,
  getAgentsByAuthor,
  advancedSearch,
  getSearchSuggestions,
  getSearchHistory,
  addToSearchHistory,
  clearSearchHistory,
  getSavedSearches,
  saveSearch,
  deleteSavedSearch,
  getCachedResults,
  cacheResults,
  clearSearchCache,
  paginateResults,
  searchAgentsWithCache,
  searchAgentsPaginated,
} from '../search';
import type { MarketplaceAgent, SearchResult } from '../types';
import { AgentCategory, ActivationMode } from '@/lib/agents/types';

// Mock storage
const mockAgents: MarketplaceAgent[] = [
  {
    id: 'agent-1',
    name: 'Research Assistant',
    description: 'AI-powered research assistant',
    icon: '🔬',
    category: AgentCategory.KNOWLEDGE,
    activationMode: ActivationMode.FOREGROUND,
    initialState: { status: 'idle' } as any,
    metadata: { version: '1.0.0', author: 'John Doe' } as any,
    marketplace: {
      author: 'John Doe',
      version: '1.0.0',
      description: 'An AI assistant for research',
      tags: ['research', 'ai', 'knowledge'],
      stats: {
        downloads: 1000,
        installs: 500,
        rating: 4.5,
        ratingCount: 100,
        lastUpdated: Date.now() - 2 * 24 * 60 * 60 * 1000,
        featured: true,
      },
      createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      visibility: 'public',
      license: 'MIT',
    },
  },
  {
    id: 'agent-2',
    name: 'Creative Writer',
    description: 'AI creative writing assistant',
    icon: '✍️',
    category: AgentCategory.CREATIVE,
    activationMode: ActivationMode.FOREGROUND,
    initialState: { status: 'idle' } as any,
    metadata: { version: '1.0.0', author: 'Jane Smith' } as any,
    marketplace: {
      author: 'Jane Smith',
      version: '1.0.0',
      description: 'AI-powered creative writing',
      tags: ['creative', 'writing', 'ai'],
      stats: {
        downloads: 500,
        installs: 250,
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
  {
    id: 'agent-3',
    name: 'Data Analyzer',
    description: 'Analyze your data with AI',
    icon: '📊',
    category: AgentCategory.DATA,
    activationMode: ActivationMode.FOREGROUND,
    initialState: { status: 'idle' } as any,
    metadata: { version: '1.0.0', author: 'John Doe' } as any,
    marketplace: {
      author: 'John Doe',
      version: '1.0.0',
      description: 'Data analysis tool',
      tags: ['data', 'analysis', 'ai'],
      stats: {
        downloads: 1500,
        installs: 750,
        rating: 4.8,
        ratingCount: 200,
        lastUpdated: Date.now() - 10 * 24 * 60 * 60 * 1000,
        featured: true,
      },
      createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
      visibility: 'public',
      license: 'MIT',
    },
  },
];

vi.mock('../storage', () => ({
  loadAllMarketplaceAgents: vi.fn(() => Promise.resolve(mockAgents)),
  getMarketplaceAgentsByCategory: vi.fn((category: AgentCategory) =>
    Promise.resolve(mockAgents.filter((a) => a.category === category))
  ),
  getMarketplaceAgentsByVisibility: vi.fn((visibility: string) =>
    Promise.resolve(mockAgents.filter((a) => a.marketplace.visibility === visibility))
  ),
}));

describe('Search Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSearchHistory();
    clearSearchCache();
  });

  afterEach(() => {
    clearSearchCache();
  });

  describe('searchAgents', () => {
    it('should return all agents when query is empty', async () => {
      const results = await searchAgents('');

      expect(results).toBeDefined();
      expect(results.length).toBe(mockAgents.length);
    });

    it('should filter by name', async () => {
      const results = await searchAgents('research');

      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        const nameMatch = result.name.toLowerCase().includes('research');
        const descMatch = result.description.toLowerCase().includes('research');
        const marketDescMatch = result.marketplace.description.toLowerCase().includes('research');
        const tagMatch = result.marketplace.tags.some((t) => t.toLowerCase().includes('research'));
        expect(nameMatch || descMatch || marketDescMatch || tagMatch).toBe(true);
      });
    });

    it('should filter by tag', async () => {
      const results = await searchAgents('ai');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by author', async () => {
      const results = await searchAgents('john doe');

      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.marketplace.author.toLowerCase()).toContain('john doe');
      });
    });

    it('should calculate relevance scores', async () => {
      const results = await searchAgents('research');

      results.forEach((result) => {
        expect(result).toHaveProperty('relevance');
        expect(result.relevance).toBeGreaterThanOrEqual(0);
        expect(result.relevance).toBeLessThanOrEqual(1);
      });
    });

    it('should apply category filter', async () => {
      const results = await searchAgents('', { category: AgentCategory.KNOWLEDGE });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.category).toBe(AgentCategory.KNOWLEDGE);
      });
    });

    it('should apply minimum rating filter', async () => {
      const results = await searchAgents('', { minRating: 4.5 });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.marketplace.stats.rating).toBeGreaterThanOrEqual(4.5);
      });
    });

    it('should apply tags filter', async () => {
      const results = await searchAgents('', { tags: ['ai'] });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.marketplace.tags).toContain('ai');
      });
    });

    it('should apply visibility filter', async () => {
      const results = await searchAgents('', { visibility: 'public' });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.marketplace.visibility).toBe('public');
      });
    });

    it('should apply minimum downloads filter', async () => {
      const results = await searchAgents('', { minDownloads: 1000 });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.marketplace.stats.downloads).toBeGreaterThanOrEqual(1000);
      });
    });

    it('should apply multiple filters', async () => {
      const results = await searchAgents('ai', {
        category: AgentCategory.CREATIVE,
        minRating: 4.0,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.category).toBe(AgentCategory.CREATIVE);
        expect(result.marketplace.stats.rating).toBeGreaterThanOrEqual(4.0);
      });
    });
  });

  describe('filterByCategory', () => {
    it('should return agents in category', async () => {
      const results = await filterByCategory(AgentCategory.KNOWLEDGE);

      expect(results.length).toBeGreaterThan(0);
      results.forEach((agent) => {
        expect(agent.category).toBe(AgentCategory.KNOWLEDGE);
      });
    });
  });

  describe('filterByRating', () => {
    it('should return agents above rating threshold', async () => {
      const results = await filterByRating(4.5);

      expect(results.length).toBeGreaterThan(0);
      results.forEach((agent) => {
        expect(agent.marketplace.stats.rating).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  describe('getPopularAgents', () => {
    it('should return agents sorted by downloads', async () => {
      const results = await getPopularAgents(10);

      expect(results.length).toBeGreaterThan(0);
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1].marketplace.stats.downloads;
        const curr = results[i].marketplace.stats.downloads;
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it('should limit results', async () => {
      const limit = 2;
      const results = await getPopularAgents(limit);

      expect(results.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('getTopRatedAgents', () => {
    it('should return agents sorted by rating', async () => {
      const results = await getTopRatedAgentsSearch(10, 5);

      expect(results.length).toBeGreaterThan(0);
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1].marketplace.stats.rating;
        const curr = results[i].marketplace.stats.rating;
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it('should filter by minimum ratings count', async () => {
      const minRatings = 100;
      const results = await getTopRatedAgentsSearch(10, minRatings);

      results.forEach((agent) => {
        expect(agent.marketplace.stats.ratingCount).toBeGreaterThanOrEqual(minRatings);
      });
    });
  });

  describe('getRecentAgents', () => {
    it('should return agents sorted by creation date', async () => {
      const results = await getRecentAgents(10);

      expect(results.length).toBeGreaterThan(0);
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1].marketplace.createdAt;
        const curr = results[i].marketplace.createdAt;
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  describe('getRecentlyUpdatedAgents', () => {
    it('should return agents sorted by update date', async () => {
      const results = await getRecentlyUpdatedAgents(10);

      expect(results.length).toBeGreaterThan(0);
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1].marketplace.updatedAt;
        const curr = results[i].marketplace.updatedAt;
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  describe('getAgentsByTag', () => {
    it('should return agents with tag', async () => {
      const results = await getAgentsByTag('ai');

      expect(results.length).toBeGreaterThan(0);
      results.forEach((agent) => {
        expect(agent.marketplace.tags).toContain('ai');
      });
    });
  });

  describe('getAgentsByAuthor', () => {
    it('should return agents by author', async () => {
      const results = await getAgentsByAuthor('john doe');

      expect(results.length).toBeGreaterThan(0);
      results.forEach((agent) => {
        expect(agent.marketplace.author.toLowerCase()).toBe('john doe');
      });
    });
  });

  describe('advancedSearch', () => {
    it('should support sorting by name', async () => {
      const results = await advancedSearch({
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(results.length).toBeGreaterThan(0);
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1].name.toLowerCase();
        const curr = results[i].name.toLowerCase();
        expect(prev <= curr).toBe(true);
      }
    });

    it('should support sorting by rating', async () => {
      const results = await advancedSearch({
        sortBy: 'rating',
        sortOrder: 'desc',
      });

      expect(results.length).toBeGreaterThan(0);
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1].marketplace.stats.rating;
        const curr = results[i].marketplace.stats.rating;
        expect(prev >= curr).toBe(true);
      }
    });

    it('should support sorting by downloads', async () => {
      const results = await advancedSearch({
        sortBy: 'downloads',
        sortOrder: 'desc',
      });

      expect(results.length).toBeGreaterThan(0);
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1].marketplace.stats.downloads;
        const curr = results[i].marketplace.stats.downloads;
        expect(prev >= curr).toBe(true);
      }
    });

    it('should support sorting by createdAt', async () => {
      const results = await advancedSearch({
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(results.length).toBeGreaterThan(0);
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1].marketplace.createdAt;
        const curr = results[i].marketplace.createdAt;
        expect(prev >= curr).toBe(true);
      }
    });

    it('should support sorting by updatedAt', async () => {
      const results = await advancedSearch({
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });

      expect(results.length).toBeGreaterThan(0);
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1].marketplace.updatedAt;
        const curr = results[i].marketplace.updatedAt;
        expect(prev >= curr).toBe(true);
      }
    });

    it('should limit results', async () => {
      const limit = 2;
      const results = await advancedSearch({ limit });

      expect(results.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return suggestions for partial query', async () => {
      const suggestions = await getSearchSuggestions('res', 5);

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should return name suggestions', async () => {
      const suggestions = await getSearchSuggestions('research', 5);

      const nameSuggestion = suggestions.find((s) => s.type === 'name');
      expect(nameSuggestion).toBeDefined();
    });

    it('should return tag suggestions', async () => {
      const suggestions = await getSearchSuggestions('ai', 5);

      const tagSuggestion = suggestions.find((s) => s.type === 'tag');
      expect(tagSuggestion).toBeDefined();
    });

    it('should return category suggestions', async () => {
      const suggestions = await getSearchSuggestions('knowledge', 5);

      const categorySuggestion = suggestions.find((s) => s.type === 'category');
      expect(categorySuggestion).toBeDefined();
    });

    it('should return author suggestions', async () => {
      const suggestions = await getSearchSuggestions('john', 5);

      const authorSuggestion = suggestions.find((s) => s.type === 'author');
      expect(authorSuggestion).toBeDefined();
    });

    it('should return empty for short query', async () => {
      const suggestions = await getSearchSuggestions('r', 5);

      expect(suggestions).toEqual([]);
    });

    it('should return empty for empty query', async () => {
      const suggestions = await getSearchSuggestions('', 5);

      expect(suggestions).toEqual([]);
    });

    it('should limit suggestions', async () => {
      const limit = 2;
      const suggestions = await getSearchSuggestions('a', limit);

      expect(suggestions.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('Search History', () => {
    it('should add entry to history', () => {
      addToSearchHistory('test query', 10);

      const history = getSearchHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].query).toBe('test query');
      expect(history[0].resultCount).toBe(10);
    });

    it('should sort history by timestamp (most recent first)', () => {
      addToSearchHistory('query 1', 5);
      addToSearchHistory('query 2', 10);

      const history = getSearchHistory();
      expect(history[0].query).toBe('query 2');
      expect(history[1].query).toBe('query 1');
    });

    it('should replace existing entry with same query', () => {
      addToSearchHistory('test', 5);
      addToSearchHistory('test', 10);

      const history = getSearchHistory();
      const testEntries = history.filter((h) => h.query === 'test');
      expect(testEntries.length).toBe(1);
      expect(testEntries[0].resultCount).toBe(10);
    });

    it('should limit history entries', () => {
      // Add more than MAX_HISTORY_ENTRIES (20)
      for (let i = 0; i < 25; i++) {
        addToSearchHistory(`query ${i}`, i);
      }

      const history = getSearchHistory();
      expect(history.length).toBeLessThanOrEqual(20);
    });

    it('should clear history', () => {
      addToSearchHistory('test', 5);
      clearSearchHistory();

      const history = getSearchHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('Saved Searches', () => {
    it('should save search', () => {
      const saved = saveSearch('My Search', 'test query', { minRating: 4 });

      expect(saved).toBeDefined();
      expect(saved.name).toBe('My Search');
      expect(saved.query).toBe('test query');
      expect(saved.filters).toEqual({ minRating: 4 });
    });

    it('should get saved searches', () => {
      saveSearch('Search 1', 'query 1');
      saveSearch('Search 2', 'query 2');

      const saved = getSavedSearches();
      expect(saved.length).toBeGreaterThan(0);
    });

    it('should delete saved search', () => {
      const saved = saveSearch('To Delete', 'query');
      deleteSavedSearch(saved.id);

      const remaining = getSavedSearches();
      const found = remaining.find((s) => s.id === saved.id);
      expect(found).toBeUndefined();
    });
  });

  describe('Search Cache', () => {
    it('should cache results', () => {
      const results: SearchResult[] = [
        { ...mockAgents[0], relevance: 1 },
      ] as SearchResult[];

      cacheResults('test', undefined, results);

      const cached = getCachedResults('test');
      expect(cached).toEqual(results);
    });

    it('should return null for cache miss', () => {
      const cached = getCachedResults('non-existent');
      expect(cached).toBeNull();
    });

    it('should clear cache', () => {
      const results: SearchResult[] = [
        { ...mockAgents[0], relevance: 1 },
      ] as SearchResult[];

      cacheResults('test', undefined, results);
      clearSearchCache();

      const cached = getCachedResults('test');
      expect(cached).toBeNull();
    });

    it('should handle cache with filters', () => {
      const results: SearchResult[] = [
        { ...mockAgents[0], relevance: 1 },
      ] as SearchResult[];
      const filters = { minRating: 4 };

      cacheResults('test', filters, results);

      const cached = getCachedResults('test', filters);
      expect(cached).toEqual(results);

      const cachedNoFilter = getCachedResults('test');
      expect(cachedNoFilter).toBeNull();
    });
  });

  describe('Pagination', () => {
    it('should paginate results', () => {
      const results = [1, 2, 3, 4, 5];
      const paginated = paginateResults(results, 2, 2);

      expect(paginated.results).toEqual([3, 4]);
      expect(paginated.page).toBe(2);
      expect(paginated.pageSize).toBe(2);
      expect(paginated.totalResults).toBe(5);
      expect(paginated.totalPages).toBe(3);
    });

    it('should handle page out of range', () => {
      const results = [1, 2, 3];
      const paginated = paginateResults(results, 10, 2);

      expect(paginated.page).toBe(2); // Clamped to last page
      expect(paginated.results).toEqual([3]);
    });

    it('should calculate hasNext correctly', () => {
      const results = [1, 2, 3, 4, 5];
      const page1 = paginateResults(results, 1, 2);
      const page2 = paginateResults(results, 2, 2);
      const page3 = paginateResults(results, 3, 2);

      expect(page1.hasNext).toBe(true);
      expect(page2.hasNext).toBe(true);
      expect(page3.hasNext).toBe(false);
    });

    it('should calculate hasPrevious correctly', () => {
      const results = [1, 2, 3, 4, 5];
      const page1 = paginateResults(results, 1, 2);
      const page2 = paginateResults(results, 2, 2);

      expect(page1.hasPrevious).toBe(false);
      expect(page2.hasPrevious).toBe(true);
    });
  });

  describe('searchAgentsWithCache', () => {
    it('should use cache when available', async () => {
      const cachedResults: SearchResult[] = [
        { ...mockAgents[0], relevance: 1 },
      ] as SearchResult[];

      cacheResults('test', undefined, cachedResults);

      const results = await searchAgentsWithCache('test', undefined, true);

      expect(results).toEqual(cachedResults);
    });

    it('should bypass cache when disabled', async () => {
      const cachedResults: SearchResult[] = [
        { ...mockAgents[0], relevance: 1 },
      ] as SearchResult[];

      cacheResults('test', undefined, cachedResults);

      const results = await searchAgentsWithCache('test', undefined, false);

      // Should perform actual search, not use cache
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('searchAgentsPaginated', () => {
    it('should return paginated results', async () => {
      const paginated = await searchAgentsPaginated('', 1, 2);

      expect(paginated).toBeDefined();
      expect(paginated.page).toBe(1);
      expect(paginated.pageSize).toBe(2);
      expect(paginated.results.length).toBeLessThanOrEqual(2);
    });

    it('should calculate total pages correctly', async () => {
      const paginated = await searchAgentsPaginated('', 1, 10);

      expect(paginated.totalPages).toBeGreaterThan(0);
    });
  });
});
