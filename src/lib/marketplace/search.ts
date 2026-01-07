/**
 * Agent Marketplace Search and Filtering
 *
 * Advanced search, filter, and sort functionality for marketplace agents.
 * Features:
 * - Full-text search with relevance scoring
 * - Advanced filtering (category, tags, permissions, ratings)
 * - Multiple sort options (relevance, rating, installs, updated)
 * - Search suggestions and autocomplete
 * - Search history
 * - Saved searches
 * - Cached results for performance
 * - Pagination support
 *
 * @module lib/marketplace/search
 */

import type { MarketplaceAgent, SearchFilters, SearchResult } from './types';
import { loadAllMarketplaceAgents, getMarketplaceAgentsByCategory } from './storage';
import { AgentCategory } from '@/lib/agents/types';

/**
 * Search agents with full-text search and filters
 *
 * @param query - Search query string
 * @param filters - Optional filters to apply
 * @returns Promise resolving to matching agents with relevance scores
 * @throws {StorageError} If search fails
 *
 * @example
 * ```typescript
 * const results = await searchAgents('research', {
 *   category: AgentCategory.KNOWLEDGE,
 *   minRating: 4,
 *   tags: ['academic']
 * });
 * results.forEach(r => console.log(`${r.name} (${r.relevance})`));
 * ```
 */
export async function searchAgents(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
  const all = await loadAllMarketplaceAgents();

  const lowerQuery = query.toLowerCase().trim();

  const matchedAgents = all.filter((agent) => {
    // Full-text search
    const searchText = [
      agent.name,
      agent.description,
      agent.marketplace.description,
      agent.marketplace.longDescription || '',
      agent.marketplace.tags.join(' '),
      agent.marketplace.author,
    ].join(' ').toLowerCase();

    const matchesQuery = !lowerQuery || searchText.includes(lowerQuery);

    if (!matchesQuery) return false;

    // Apply filters
    return applyFilters(agent, filters);
  });

  // Calculate relevance scores
  return matchedAgents.map((agent) => ({
    ...agent,
    relevance: calculateRelevance(agent, lowerQuery),
  }));
}

/**
 * Filter agents by category
 *
 * @param category - Agent category
 * @returns Promise resolving to agents in the category
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const knowledgeAgents = await filterByCategory(AgentCategory.KNOWLEDGE);
 * console.log(`Found ${knowledgeAgents.length} knowledge agents`);
 * ```
 */
export async function filterByCategory(category: AgentCategory): Promise<MarketplaceAgent[]> {
  return getMarketplaceAgentsByCategory(category);
}

/**
 * Filter agents by minimum rating
 *
 * @param minRating - Minimum rating (0-5)
 * @returns Promise resolving to filtered agents
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const highlyRated = await filterByRating(4);
 * console.log(`Found ${highlyRated.length} highly rated agents`);
 * ```
 */
export async function filterByRating(minRating: number): Promise<MarketplaceAgent[]> {
  const all = await loadAllMarketplaceAgents();

  return all.filter((agent) => agent.marketplace.stats.rating >= minRating);
}

/**
 * Get popular agents (most downloads)
 *
 * @param limit - Maximum number of agents to return
 * @returns Promise resolving to popular agents
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const popular = await getPopularAgents(10);
 * popular.forEach((agent, i) => {
 *   console.log(`#${i + 1}: ${agent.name} (${agent.marketplace.stats.downloads} downloads)`);
 * });
 * ```
 */
export async function getPopularAgents(limit: number): Promise<MarketplaceAgent[]> {
  const all = await loadAllMarketplaceAgents();

  return all
    .sort((a, b) => b.marketplace.stats.downloads - a.marketplace.stats.downloads)
    .slice(0, limit);
}

/**
 * Get top-rated agents
 *
 * @param limit - Maximum number of agents to return
 * @param minRatings - Minimum number of ratings required (default: 5)
 * @returns Promise resolving to top-rated agents
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const topRated = await getTopRatedAgents(10);
 * topRated.forEach((agent, i) => {
 *   console.log(`#${i + 1}: ${agent.name} (${agent.marketplace.stats.rating} / 5)`);
 * });
 * ```
 */
export async function getTopRatedAgents(limit: number, minRatings = 5): Promise<MarketplaceAgent[]> {
  const all = await loadAllMarketplaceAgents();

  return all
    .filter((agent) => agent.marketplace.stats.ratingCount >= minRatings)
    .sort((a, b) => b.marketplace.stats.rating - a.marketplace.stats.rating)
    .slice(0, limit);
}

/**
 * Get recently added agents
 *
 * @param limit - Maximum number of agents to return
 * @returns Promise resolving to recent agents
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const recent = await getRecentAgents(10);
 * recent.forEach((agent) => {
 *   console.log(`${agent.name} added ${new Date(agent.marketplace.createdAt).toLocaleDateString()}`);
 * });
 * ```
 */
export async function getRecentAgents(limit: number): Promise<MarketplaceAgent[]> {
  const all = await loadAllMarketplaceAgents();

  return all
    .sort((a, b) => b.marketplace.createdAt - a.marketplace.createdAt)
    .slice(0, limit);
}

/**
 * Get recently updated agents
 *
 * @param limit - Maximum number of agents to return
 * @returns Promise resolving to recently updated agents
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const updated = await getRecentlyUpdatedAgents(10);
 * updated.forEach((agent) => {
 *   console.log(`${agent.name} updated ${new Date(agent.marketplace.updatedAt).toLocaleDateString()}`);
 * });
 * ```
 */
export async function getRecentlyUpdatedAgents(limit: number): Promise<MarketplaceAgent[]> {
  const all = await loadAllMarketplaceAgents();

  return all
    .sort((a, b) => b.marketplace.updatedAt - a.marketplace.updatedAt)
    .slice(0, limit);
}

/**
 * Get agents by tag
 *
 * @param tag - Tag to filter by
 * @returns Promise resolving to agents with the tag
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const academicAgents = await getAgentsByTag('academic');
 * console.log(`Found ${academicAgents.length} academic agents`);
 * ```
 */
export async function getAgentsByTag(tag: string): Promise<MarketplaceAgent[]> {
  const all = await loadAllMarketplaceAgents();

  const lowerTag = tag.toLowerCase();

  return all.filter((agent) => agent.marketplace.tags.some((t) => t.toLowerCase() === lowerTag));
}

/**
 * Get agents by author
 *
 * @param author - Author name to filter by
 * @returns Promise resolving to agents by the author
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const myAgents = await getAgentsByAuthor('My Name');
 * console.log(`Found ${myAgents.length} agents by me`);
 * ```
 */
export async function getAgentsByAuthor(author: string): Promise<MarketplaceAgent[]> {
  const all = await loadAllMarketplaceAgents();

  const lowerAuthor = author.toLowerCase();

  return all.filter((agent) => agent.marketplace.author.toLowerCase() === lowerAuthor);
}

/**
 * Get agents by visibility
 *
 * @param visibility - Visibility level
 * @returns Promise resolving to agents with the visibility
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const publicAgents = await getAgentsByVisibility('public');
 * console.log(`Found ${publicAgents.length} public agents`);
 * ```
 */
export async function getAgentsByVisibility(visibility: 'public' | 'private' | 'unlisted'): Promise<MarketplaceAgent[]> {
  const { getMarketplaceAgentsByVisibility } = await import('./storage');
  return getMarketplaceAgentsByVisibility(visibility);
}

/**
 * Get trending agents (recent + popular)
 *
 * Combines download velocity with recency.
 *
 * @param limit - Maximum number of agents to return
 * @param days - Number of days to consider (default: 7)
 * @returns Promise resolving to trending agents
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const trending = await getTrendingAgents(10);
 * console.log('Trending this week:');
 * trending.forEach((agent, i) => {
 *   console.log(`#${i + 1}: ${agent.name}`);
 * });
 * ```
 */
export async function getTrendingAgents(limit: number, days = 7): Promise<MarketplaceAgent[]> {
  const all = await loadAllMarketplaceAgents();

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  // Filter agents updated recently
  const recent = all.filter((agent) => agent.marketplace.updatedAt >= cutoff);

  // Calculate trend score (downloads + rating bonus)
  const withScores = recent.map((agent) => ({
    agent,
    score: agent.marketplace.stats.downloads + agent.marketplace.stats.rating * 10,
  }));

  // Sort by score
  withScores.sort((a, b) => b.score - a.score);

  return withScores.slice(0, limit).map((s) => s.agent);
}

/**
 * Get all unique tags
 *
 * @returns Promise resolving to array of unique tags
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const tags = await getAllTags();
 * console.log('Available tags:', tags);
 * ```
 */
export async function getAllTags(): Promise<string[]> {
  const all = await loadAllMarketplaceAgents();

  const tagSet = new Set<string>();

  all.forEach((agent) => {
    agent.marketplace.tags.forEach((tag) => tagSet.add(tag));
  });

  return Array.from(tagSet).sort();
}

/**
 * Get all unique authors
 *
 * @returns Promise resolving to array of unique authors
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const authors = await getAllAuthors();
 * console.log('Available authors:', authors);
 * ```
 */
export async function getAllAuthors(): Promise<string[]> {
  const all = await loadAllMarketplaceAgents();

  const authorSet = new Set<string>();

  all.forEach((agent) => {
    authorSet.add(agent.marketplace.author);
  });

  return Array.from(authorSet).sort();
}

/**
 * Advanced search with multiple criteria
 *
 * @param criteria - Search criteria object
 * @returns Promise resolving to matching agents
 * @throws {StorageError} If search fails
 *
 * @example
 * ```typescript
 * const results = await advancedSearch({
 *   query: 'research',
 *   category: AgentCategory.KNOWLEDGE,
 *   minRating: 4,
 *   tags: ['academic', 'science'],
 *   author: 'Specific Author',
 *   sortBy: 'rating',
 *   sortOrder: 'desc'
 * });
 * ```
 */
export async function advancedSearch(criteria: {
  query?: string;
  category?: AgentCategory;
  minRating?: number;
  tags?: string[];
  author?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  sortBy?: 'name' | 'rating' | 'downloads' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}): Promise<MarketplaceAgent[]> {
  let results = await searchAgents(criteria.query || '', {
    category: criteria.category,
    minRating: criteria.minRating,
    tags: criteria.tags,
    visibility: criteria.visibility,
  });

  // Apply additional filters
  if (criteria.author) {
    results = results.filter((r) => r.marketplace.author.toLowerCase() === criteria.author!.toLowerCase());
  }

  // Sort
  if (criteria.sortBy) {
    results.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (criteria.sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'rating':
          aVal = a.marketplace.stats.rating;
          bVal = b.marketplace.stats.rating;
          break;
        case 'downloads':
          aVal = a.marketplace.stats.downloads;
          bVal = b.marketplace.stats.downloads;
          break;
        case 'createdAt':
          aVal = a.marketplace.createdAt;
          bVal = b.marketplace.createdAt;
          break;
        case 'updatedAt':
          aVal = a.marketplace.updatedAt;
          bVal = b.marketplace.updatedAt;
          break;
        default:
          return 0;
      }

      if (criteria.sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  }

  // Apply limit
  if (criteria.limit) {
    results = results.slice(0, criteria.limit);
  }

  return results;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Apply filters to agent
 */
function applyFilters(agent: MarketplaceAgent, filters?: SearchFilters): boolean {
  if (!filters) return true;

  // Category filter
  if (filters.category && agent.category !== filters.category) {
    return false;
  }

  // Rating filter
  if (filters.minRating !== undefined && agent.marketplace.stats.rating < filters.minRating) {
    return false;
  }

  // Tags filter (agent must have at least one of the specified tags)
  if (filters.tags && filters.tags.length > 0) {
    const hasTag = filters.tags.some((tag) => agent.marketplace.tags.includes(tag));
    if (!hasTag) return false;
  }

  // Visibility filter
  if (filters.visibility && agent.marketplace.visibility !== filters.visibility) {
    return false;
  }

  // Downloads filter
  if (filters.minDownloads !== undefined && agent.marketplace.stats.downloads < filters.minDownloads) {
    return false;
  }

  return true;
}

/**
 * Calculate relevance score for search result
 */
function calculateRelevance(agent: MarketplaceAgent, query: string): number {
  if (!query) return 1;

  let score = 0;

  // Name match (highest weight)
  if (agent.name.toLowerCase().includes(query)) {
    score += 0.5;
    if (agent.name.toLowerCase() === query) {
      score += 0.3; // Exact match bonus
    }
  }

  // Description match
  if (agent.description.toLowerCase().includes(query)) {
    score += 0.2;
  }

  // Marketplace description match
  if (agent.marketplace.description.toLowerCase().includes(query)) {
    score += 0.2;
  }

  // Tag match
  if (agent.marketplace.tags.some((tag) => tag.toLowerCase().includes(query))) {
    score += 0.3;
  }

  // Author match
  if (agent.marketplace.author.toLowerCase().includes(query)) {
    score += 0.1;
  }

  // Normalize to 0-1
  return Math.min(score, 1);
}

// ============================================================================
// SEARCH SUGGESTIONS & AUTOCOMPLETE
// ============================================================================

/**
 * Search suggestion type
 */
export interface SearchSuggestion {
  /** Suggestion text */
  text: string;
  /** Suggestion type */
  type: 'name' | 'tag' | 'category' | 'author';
  /** Matching plugin IDs (if applicable) */
  pluginIds?: string[];
}

/**
 * Get search suggestions for autocomplete
 *
 * @param partialQuery - Partial search query
 * @param limit - Maximum number of suggestions to return
 * @returns Promise resolving to search suggestions
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const suggestions = await getSearchSuggestions('res', 5);
 * suggestions.forEach(s => {
 *   console.log(`${s.text} (${s.type})`);
 * });
 * ```
 */
export async function getSearchSuggestions(
  partialQuery: string,
  limit = 5
): Promise<SearchSuggestion[]> {
  if (!partialQuery || partialQuery.length < 2) {
    return [];
  }

  const all = await loadAllMarketplaceAgents();
  const lowerQuery = partialQuery.toLowerCase();
  const suggestions: SearchSuggestion[] = [];

  // Find matching plugin names
  const nameMatches = all.filter((agent) => agent.name.toLowerCase().includes(lowerQuery));
  for (const agent of nameMatches.slice(0, 2)) {
    suggestions.push({
      text: agent.name,
      type: 'name',
      pluginIds: [agent.id],
    });
  }

  // Find matching tags
  const tagSet = new Set<string>();
  for (const agent of all) {
    for (const tag of agent.marketplace.tags) {
      if (tag.toLowerCase().includes(lowerQuery)) {
        tagSet.add(tag);
      }
    }
  }
  for (const tag of Array.from(tagSet).slice(0, 2)) {
    suggestions.push({
      text: tag,
      type: 'tag',
    });
  }

  // Find matching categories
  for (const category of Object.values(AgentCategory)) {
    if (category.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        text: category,
        type: 'category',
      });
      break;
    }
  }

  // Find matching authors
  const authorSet = new Set<string>();
  for (const agent of all) {
    if (agent.marketplace.author.toLowerCase().includes(lowerQuery)) {
      authorSet.add(agent.marketplace.author);
    }
  }
  for (const author of Array.from(authorSet).slice(0, 1)) {
    suggestions.push({
      text: author,
      type: 'author',
    });
  }

  return suggestions.slice(0, limit);
}

// ============================================================================
// SEARCH HISTORY
// ============================================================================

/**
 * Search history entry
 */
export interface SearchHistoryEntry {
  /** Query text */
  query: string;
  /** Timestamp */
  timestamp: number;
  /** Result count */
  resultCount: number;
  /** Filters applied */
  filters?: SearchFilters;
}

const MAX_HISTORY_ENTRIES = 20;
let searchHistory: SearchHistoryEntry[] = [];

/**
 * Get search history
 *
 * @returns Search history entries (most recent first)
 *
 * @example
 * ```typescript
 * const history = getSearchHistory();
 * history.forEach(entry => {
 *   console.log(`${entry.query} (${entry.resultCount} results)`);
 * });
 * ```
 */
export function getSearchHistory(): SearchHistoryEntry[] {
  return [...searchHistory].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Add entry to search history
 *
 * @param query - Search query
 * @param resultCount - Number of results
 * @param filters - Filters applied
 *
 * @example
 * ```typescript
 * addToSearchHistory('research', 15, { category: AgentCategory.KNOWLEDGE });
 * ```
 */
export function addToSearchHistory(
  query: string,
  resultCount: number,
  filters?: SearchFilters
): void {
  // Remove existing entry with same query
  searchHistory = searchHistory.filter((entry) => entry.query !== query);

  // Add new entry at the beginning
  searchHistory.unshift({
    query,
    timestamp: Date.now(),
    resultCount,
    filters,
  });

  // Keep only the most recent entries
  searchHistory = searchHistory.slice(0, MAX_HISTORY_ENTRIES);

  // Persist to localStorage
  try {
    localStorage.setItem('marketplace-search-history', JSON.stringify(searchHistory));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear search history
 *
 * @example
 * ```typescript
 * clearSearchHistory();
 * ```
 */
export function clearSearchHistory(): void {
  searchHistory = [];
  try {
    localStorage.removeItem('marketplace-search-history');
  } catch {
    // Ignore storage errors
  }
}

/**
 * Load search history from localStorage
 */
export function loadSearchHistory(): void {
  try {
    const stored = localStorage.getItem('marketplace-search-history');
    if (stored) {
      searchHistory = JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
}

// Load history on module init
loadSearchHistory();

// ============================================================================
// SAVED SEARCHES
// ============================================================================

/**
 * Saved search
 */
export interface SavedSearch {
  /** Unique ID */
  id: string;
  /** Name for the saved search */
  name: string;
  /** Query */
  query: string;
  /** Filters */
  filters?: SearchFilters;
  /** Created timestamp */
  createdAt: number;
}

let savedSearches: SavedSearch[] = [];

/**
 * Get all saved searches
 *
 * @returns Saved searches
 *
 * @example
 * ```typescript
 * const saved = getSavedSearches();
 * saved.forEach(s => {
 *   console.log(`${s.name}: ${s.query}`);
 * });
 * ```
 */
export function getSavedSearches(): SavedSearch[] {
  return [...savedSearches];
}

/**
 * Save a search
 *
 * @param name - Name for the saved search
 * @param query - Search query
 * @param filters - Filters to save
 * @returns Created saved search
 *
 * @example
 * ```typescript
 * const saved = saveSearch('My Research Plugins', 'research', {
 *   category: AgentCategory.KNOWLEDGE,
 *   minRating: 4
 * });
 * ```
 */
export function saveSearch(name: string, query: string, filters?: SearchFilters): SavedSearch {
  const saved: SavedSearch = {
    id: `saved-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name,
    query,
    filters,
    createdAt: Date.now(),
  };

  savedSearches.push(saved);

  // Persist to localStorage
  try {
    localStorage.setItem('marketplace-saved-searches', JSON.stringify(savedSearches));
  } catch {
    // Ignore storage errors
  }

  return saved;
}

/**
 * Delete a saved search
 *
 * @param id - Saved search ID
 *
 * @example
 * ```typescript
 * deleteSavedSearch('saved-1234567890-abc123');
 * ```
 */
export function deleteSavedSearch(id: string): void {
  savedSearches = savedSearches.filter((s) => s.id !== id);

  // Persist to localStorage
  try {
    localStorage.setItem('marketplace-saved-searches', JSON.stringify(savedSearches));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Load saved searches from localStorage
 */
export function loadSavedSearches(): void {
  try {
    const stored = localStorage.getItem('marketplace-saved-searches');
    if (stored) {
      savedSearches = JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
}

// Load saved searches on module init
loadSavedSearches();

// ============================================================================
// SEARCH CACHE
// ============================================================================

/**
 * Cached search result
 */
interface CachedSearch {
  /** Query */
  query: string;
  /** Filters */
  filters?: SearchFilters;
  /** Results */
  results: SearchResult[];
  /** Timestamp */
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const searchCache = new Map<string, CachedSearch>();

/**
 * Generate cache key
 */
function getCacheKey(query: string, filters?: SearchFilters): string {
  return JSON.stringify({ query, filters });
}

/**
 * Get cached results if available and not expired
 *
 * @param query - Search query
 * @param filters - Search filters
 * @returns Cached results or null
 */
export function getCachedResults(query: string, filters?: SearchFilters): SearchResult[] | null {
  const key = getCacheKey(query, filters);
  const cached = searchCache.get(key);

  if (!cached) {
    return null;
  }

  // Check if expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }

  return cached.results;
}

/**
 * Cache search results
 *
 * @param query - Search query
 * @param filters - Search filters
 * @param results - Results to cache
 */
export function cacheResults(query: string, filters: SearchFilters | undefined, results: SearchResult[]): void {
  const key = getCacheKey(query, filters);

  // Clean old entries
  for (const [cacheKey, cached] of searchCache.entries()) {
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      searchCache.delete(cacheKey);
    }
  }

  // Add new entry
  searchCache.set(key, {
    query,
    filters,
    results,
    timestamp: Date.now(),
  });
}

/**
 * Clear search cache
 *
 * @example
 * ```typescript
 * clearSearchCache();
 * ```
 */
export function clearSearchCache(): void {
  searchCache.clear();
}

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Paginated search result
 */
export interface PaginatedResult<T> {
  /** Results for current page */
  results: T[];
  /** Current page number (1-indexed) */
  page: number;
  /** Page size */
  pageSize: number;
  /** Total number of results */
  totalResults: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there's a next page */
  hasNext: boolean;
  /** Whether there's a previous page */
  hasPrevious: boolean;
}

/**
 * Paginate search results
 *
 * @param results - All search results
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of results per page
 * @returns Paginated results
 *
 * @example
 * ```typescript
 * const paginated = paginateResults(searchResults, 2, 10);
 * console.log(`Page ${paginated.page} of ${paginated.totalPages}`);
 * ```
 */
export function paginateResults<T>(
  results: T[],
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const totalResults = results.length;
  const totalPages = Math.ceil(totalResults / pageSize);

  // Clamp page number
  const clampedPage = Math.max(1, Math.min(page, totalPages));

  const start = (clampedPage - 1) * pageSize;
  const end = start + pageSize;
  const paginatedResults = results.slice(start, end);

  return {
    results: paginatedResults,
    page: clampedPage,
    pageSize,
    totalResults,
    totalPages,
    hasNext: clampedPage < totalPages,
    hasPrevious: clampedPage > 1,
  };
}

// ============================================================================
// ENHANCED SEARCH WITH CACHE
// ============================================================================

/**
 * Search agents with caching
 *
 * @param query - Search query string
 * @param filters - Optional filters to apply
 * @param useCache - Whether to use cache (default: true)
 * @returns Promise resolving to matching agents with relevance scores
 * @throws {StorageError} If search fails
 *
 * @example
 * ```typescript
 * const results = await searchAgentsWithCache('research', {
 *   category: AgentCategory.KNOWLEDGE,
 *   minRating: 4
 * });
 * ```
 */
export async function searchAgentsWithCache(
  query: string,
  filters?: SearchFilters,
  useCache = true
): Promise<SearchResult[]> {
  // Check cache first
  if (useCache) {
    const cached = getCachedResults(query, filters);
    if (cached) {
      return cached;
    }
  }

  // Perform search
  const results = await searchAgents(query, filters);

  // Cache results
  if (useCache) {
    cacheResults(query, filters, results);
  }

  return results;
}

/**
 * Search agents with pagination
 *
 * @param query - Search query string
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of results per page
 * @param filters - Optional filters to apply
 * @returns Promise resolving to paginated results
 * @throws {StorageError} If search fails
 *
 * @example
 * ```typescript
 * const paginated = await searchAgentsPaginated('research', 1, 10, {
 *   category: AgentCategory.KNOWLEDGE
 * });
 * console.log(`Found ${paginated.totalResults} results`);
 * ```
 */
export async function searchAgentsPaginated(
  query: string,
  page: number,
  pageSize: number,
  filters?: SearchFilters
): Promise<PaginatedResult<SearchResult>> {
  const allResults = await searchAgentsWithCache(query, filters);

  return paginateResults(allResults, page, pageSize);
}
