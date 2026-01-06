/**
 * Agent Marketplace Search and Filtering
 *
 * Search, filter, and sort marketplace agents.
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
