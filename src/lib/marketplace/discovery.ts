/**
 * Plugin Marketplace Discovery Engine
 *
 * Advanced discovery features for finding plugins:
 * - Trending plugins (high install velocity)
 * - New plugins (recently added)
 * - Top rated (highest average ratings)
 * - Editor's picks (curated)
 * - Similar plugins (based on tags/category)
 * - Recommended plugins (based on installed)
 *
 * @module lib/marketplace/discovery
 */

import type { MarketplaceAgent } from './types';
import { loadAllMarketplaceAgents } from './storage';
import { AgentCategory } from '@/lib/agents/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Trending calculation options
 */
export interface TrendingOptions {
  /** Number of days to consider (default: 7) */
  days?: number;
  /** Minimum downloads required (default: 10) */
  minDownloads?: number;
  /** Weight for recency vs popularity (0-1, default: 0.5) */
  recencyWeight?: number;
}

/**
 * Discovery result with metadata
 */
export interface DiscoveryResult {
  /** Plugin */
  plugin: MarketplaceAgent;
  /** Score/relevance */
  score: number;
  /** Reason for inclusion */
  reason: string;
}

/**
 * Similarity score between plugins
 */
export interface PluginSimilarity {
  /** Plugin ID */
  pluginId: string;
  /** Similarity score (0-1) */
  similarity: number;
  /** Matching factors */
  factors: string[];
}

// ============================================================================
// TRENDING PLUGINS
// ============================================================================

/**
 * Get trending plugins (high install velocity)
 *
 * Combines recency with popularity to find plugins gaining traction.
 *
 * @param limit - Maximum number of plugins to return
 * @param options - Trending calculation options
 * @returns Promise resolving to trending plugins
 * @throws {Error} If retrieval fails
 *
 * @example
 * ```typescript
 * const trending = await getTrendingPlugins(10, { days: 7, minDownloads: 10 });
 * trending.forEach((result, i) => {
 *   console.log(`#${i + 1}: ${result.plugin.name} (${result.score})`);
 * });
 * ```
 */
export async function getTrendingPlugins(
  limit: number,
  options: TrendingOptions = {}
): Promise<DiscoveryResult[]> {
  const { days = 7, minDownloads = 10, recencyWeight = 0.5 } = options;

  const all = await loadAllMarketplaceAgents();

  // Calculate cutoff
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  // Filter recently updated plugins with minimum downloads
  const recent = all.filter(
    (agent) =>
      agent.marketplace.updatedAt >= cutoff && agent.marketplace.stats.downloads >= minDownloads
  );

  // Calculate trending scores
  const withScores = recent.map((agent) => {
    // Recency score (0-1, higher for more recent)
    const daysSinceUpdate = (Date.now() - agent.marketplace.updatedAt) / (24 * 60 * 60 * 1000);
    const recencyScore = 1 - daysSinceUpdate / days;

    // Popularity score (0-1, based on downloads)
    const maxDownloads = Math.max(...recent.map((a) => a.marketplace.stats.downloads));
    const popularityScore = maxDownloads > 0 ? agent.marketplace.stats.downloads / maxDownloads : 0;

    // Combined score
    const score = recencyScore * recencyWeight + popularityScore * (1 - recencyWeight);

    return {
      plugin: agent,
      score,
      reason: `Trending with ${agent.marketplace.stats.downloads} downloads`,
    };
  });

  // Sort by score and return top N
  withScores.sort((a, b) => b.score - a.score);

  return withScores.slice(0, limit);
}

// ============================================================================
// NEW PLUGINS
// ============================================================================

/**
 * Get newly added plugins
 *
 * @param limit - Maximum number of plugins to return
 * @param days - Number of days to consider (default: 30)
 * @returns Promise resolving to new plugins
 * @throws {Error} If retrieval fails
 *
 * @example
 * ```typescript
 * const newPlugins = await getNewPlugins(10, 30);
 * console.log(`Found ${newPlugins.length} new plugins`);
 * ```
 */
export async function getNewPlugins(limit: number, days = 30): Promise<DiscoveryResult[]> {
  const all = await loadAllMarketplaceAgents();

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  // Filter recently created plugins
  const recent = all.filter((agent) => agent.marketplace.createdAt >= cutoff);

  // Sort by creation date (newest first)
  recent.sort((a, b) => b.marketplace.createdAt - a.marketplace.createdAt);

  // Convert to discovery results
  const results: DiscoveryResult[] = recent.slice(0, limit).map((plugin) => ({
    plugin,
    score: 1 - (Date.now() - plugin.marketplace.createdAt) / (days * 24 * 60 * 60 * 1000),
    reason: `Added ${getRelativeTime(plugin.marketplace.createdAt)}`,
  }));

  return results;
}

// ============================================================================
// TOP RATED PLUGINS
// ============================================================================

/**
 * Get top rated plugins
 *
 * @param limit - Maximum number of plugins to return
 * @param minRatings - Minimum number of ratings required (default: 5)
 * @returns Promise resolving to top rated plugins
 * @throws {Error} If retrieval fails
 *
 * @example
 * ```typescript
 * const topRated = await getTopRatedPlugins(10, 5);
 * topRated.forEach((result, i) => {
 *   console.log(`#${i + 1}: ${result.plugin.name} (${result.plugin.marketplace.stats.rating}/5)`);
 * });
 * ```
 */
export async function getTopRatedPlugins(
  limit: number,
  minRatings = 5
): Promise<DiscoveryResult[]> {
  const all = await loadAllMarketplaceAgents();

  // Filter by minimum ratings
  const qualified = all.filter((agent) => agent.marketplace.stats.ratingCount >= minRatings);

  // Sort by rating
  qualified.sort((a, b) => b.marketplace.stats.rating - a.marketplace.stats.rating);

  // Convert to discovery results
  const results: DiscoveryResult[] = qualified.slice(0, limit).map((plugin) => ({
    plugin,
    score: plugin.marketplace.stats.rating / 5,
    reason: `${plugin.marketplace.stats.rating.toFixed(1)}★ from ${plugin.marketplace.stats.ratingCount} ratings`,
  }));

  return results;
}

// ============================================================================
// EDITOR'S PICKS
// ============================================================================

/**
 * Get editor's pick plugins (curated selection)
 *
 * Currently based on featured flag in stats. In production, this would
 * be manually curated by the marketplace team.
 *
 * @param limit - Maximum number of plugins to return
 * @returns Promise resolving to editor's picks
 * @throws {Error} If retrieval fails
 *
 * @example
 * ```typescript
 * const picks = await getEditorsPicks(10);
 * console.log(`Found ${picks.length} editor's picks`);
 * ```
 */
export async function getEditorsPicks(limit: number): Promise<DiscoveryResult[]> {
  const all = await loadAllMarketplaceAgents();

  // Filter featured plugins
  const featured = all.filter((agent) => agent.marketplace.stats.featured);

  // Sort by rating (featured with higher ratings first)
  featured.sort((a, b) => b.marketplace.stats.rating - a.marketplace.stats.rating);

  // Convert to discovery results
  const results: DiscoveryResult[] = featured.slice(0, limit).map((plugin) => ({
    plugin,
    score: plugin.marketplace.stats.rating / 5,
    reason: "Editor's pick",
  }));

  return results;
}

// ============================================================================
// SIMILAR PLUGINS
// ============================================================================

/**
 * Calculate similarity between two plugins
 *
 * @param plugin1 - First plugin
 * @param plugin2 - Second plugin
 * @returns Similarity score (0-1) and matching factors
 */
function calculateSimilarity(plugin1: MarketplaceAgent, plugin2: MarketplaceAgent): PluginSimilarity {
  const factors: string[] = [];
  let score = 0;

  // Category match (high weight)
  if (plugin1.category === plugin2.category) {
    score += 0.4;
    factors.push(`Same category: ${plugin1.category}`);
  }

  // Tag overlap (medium weight)
  const commonTags = plugin1.marketplace.tags.filter((tag) =>
    plugin2.marketplace.tags.includes(tag)
  );
  if (commonTags.length > 0) {
    const tagScore = commonTags.length / Math.max(plugin1.marketplace.tags.length, plugin2.marketplace.tags.length);
    score += tagScore * 0.3;
    factors.push(`Common tags: ${commonTags.join(', ')}`);
  }

  // Author match (medium weight)
  if (plugin1.marketplace.author === plugin2.marketplace.author) {
    score += 0.2;
    factors.push(`Same author: ${plugin1.marketplace.author}`);
  }

  // Similar description (low weight)
  const words1 = new Set(plugin1.description.toLowerCase().split(/\s+/));
  const words2 = new Set(plugin2.description.toLowerCase().split(/\s+/));
  const commonWords = [...words1].filter((word) => words2.has(word) && word.length > 3);
  if (commonWords.length > 5) {
    score += 0.1;
    factors.push('Similar descriptions');
  }

  return {
    pluginId: plugin2.id,
    similarity: Math.min(score, 1),
    factors,
  };
}

/**
 * Get plugins similar to a given plugin
 *
 * @param pluginId - Plugin ID to find similarities for
 * @param limit - Maximum number of similar plugins to return
 * @param minSimilarity - Minimum similarity score (0-1, default: 0.3)
 * @returns Promise resolving to similar plugins
 * @throws {Error} If plugin not found or retrieval fails
 *
 * @example
 * ```typescript
 * const similar = await getSimilarPlugins('my-plugin-v1', 5);
 * similar.forEach((result) => {
 *   console.log(`${result.plugin.name}: ${result.similarity.toFixed(2)} - ${result.factors.join(', ')}`);
 * });
 * ```
 */
export async function getSimilarPlugins(
  pluginId: string,
  limit: number,
  minSimilarity = 0.3
): Promise<PluginSimilarity[]> {
  const all = await loadAllMarketplaceAgents();

  // Find the target plugin
  const target = all.find((agent) => agent.id === pluginId);
  if (!target) {
    throw new Error(`Plugin not found: ${pluginId}`);
  }

  // Calculate similarities
  const similarities: PluginSimilarity[] = all
    .filter((agent) => agent.id !== pluginId)
    .map((agent) => calculateSimilarity(target, agent))
    .filter((sim) => sim.similarity >= minSimilarity);

  // Sort by similarity and return top N
  similarities.sort((a, b) => b.similarity - a.similarity);

  return similarities.slice(0, limit);
}

// ============================================================================
// RECOMMENDED PLUGINS
// ============================================================================

/**
 * Get recommended plugins based on installed plugins
 *
 * Analyzes installed plugins to recommend similar ones the user might like.
 *
 * @param installedPluginIds - Array of installed plugin IDs
 * @param limit - Maximum number of recommendations to return
 * @returns Promise resolving to recommended plugins
 * @throws {Error} If retrieval fails
 *
 * @example
 * ```typescript
 * const installed = ['plugin-1', 'plugin-2'];
 * const recommended = await getRecommendedPlugins(installed, 5);
 * recommended.forEach((result) => {
 *   console.log(`${result.plugin.name}: ${result.reason}`);
 * });
 * ```
 */
export async function getRecommendedPlugins(
  installedPluginIds: string[],
  limit: number
): Promise<DiscoveryResult[]> {
  const all = await loadAllMarketplaceAgents();

  // Find installed plugins
  const installed = all.filter((agent) => installedPluginIds.includes(agent.id));

  if (installed.length === 0) {
    // No installed plugins, return top rated as fallback
    return await getTopRatedPlugins(limit);
  }

  // Calculate recommendations based on similarities
  const recommendations = new Map<string, { score: number; reasons: string[] }>();

  for (const installedPlugin of installed) {
    const similar = await getSimilarPlugins(installedPlugin.id, limit * 2, 0.2);

    for (const sim of similar) {
      // Skip if already installed
      if (installedPluginIds.includes(sim.pluginId)) {
        continue;
      }

      const plugin = all.find((p) => p.id === sim.pluginId);
      if (!plugin) continue;

      if (!recommendations.has(sim.pluginId)) {
        recommendations.set(sim.pluginId, { score: 0, reasons: [] });
      }

      const rec = recommendations.get(sim.pluginId)!;
      rec.score += sim.similarity;
      rec.reasons.push(`Similar to "${installedPlugin.name}"`);
    }
  }

  // Convert to discovery results
  const results: DiscoveryResult[] = [];

  for (const [pluginId, { score, reasons }] of recommendations.entries()) {
    const plugin = all.find((p) => p.id === pluginId);
    if (!plugin) continue;

    // Normalize score by number of installed plugins
    const normalizedScore = score / installed.length;

    results.push({
      plugin,
      score: normalizedScore,
      reason: reasons.slice(0, 2).join(', '),
    });
  }

  // Sort by score and return top N
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

// ============================================================================
// CATEGORY BROWSING
// ============================================================================

/**
 * Get popular plugins by category
 *
 * @param category - Agent category
 * @param limit - Maximum number of plugins to return
 * @returns Promise resolving to popular plugins in category
 * @throws {Error} If retrieval fails
 *
 * @example
 * ```typescript
 * const knowledgePlugins = await getPopularByCategory(AgentCategory.KNOWLEDGE, 10);
 * console.log(`Found ${knowledgePlugins.length} knowledge plugins`);
 * ```
 */
export async function getPopularByCategory(
  category: AgentCategory,
  limit: number
): Promise<DiscoveryResult[]> {
  const all = await loadAllMarketplaceAgents();

  // Filter by category
  const inCategory = all.filter((agent) => agent.category === category);

  // Sort by downloads
  inCategory.sort((a, b) => b.marketplace.stats.downloads - a.marketplace.stats.downloads);

  // Convert to discovery results
  const maxDownloads = Math.max(...inCategory.map((a) => a.marketplace.stats.downloads), 1);

  const results: DiscoveryResult[] = inCategory.slice(0, limit).map((plugin) => ({
    plugin,
    score: plugin.marketplace.stats.downloads / maxDownloads,
    reason: `${plugin.marketplace.stats.downloads} downloads`,
  }));

  return results;
}

/**
 * Get all categories with plugin counts
 *
 * @returns Promise resolving to category statistics
 * @throws {Error} If retrieval fails
 *
 * @example
 * ```typescript
 * const categories = await getCategoryStats();
 * categories.forEach((stat) => {
 *   console.log(`${stat.category}: ${stat.count} plugins`);
 * });
 * ```
 */
export async function getCategoryStats(): Promise<
  Array<{ category: AgentCategory; count: number; topRated: string }>
> {
  const all = await loadAllMarketplaceAgents();

  const stats = new Map<AgentCategory, { count: number; totalRating: number; topRated: string }>();

  for (const agent of all) {
    if (!stats.has(agent.category)) {
      stats.set(agent.category, { count: 0, totalRating: 0, topRated: agent.name });
    }

    const stat = stats.get(agent.category)!;
    stat.count++;
    stat.totalRating += agent.marketplace.stats.rating;

    // Update top rated if this one has higher rating
    const currentTop = all.find((a) => a.name === stat.topRated);
    if (!currentTop || agent.marketplace.stats.rating > currentTop.marketplace.stats.rating) {
      stat.topRated = agent.name;
    }
  }

  // Convert to array
  return Array.from(stats.entries()).map(([category, stat]) => ({
    category,
    count: stat.count,
    topRated: stat.topRated,
  }));
}

// ============================================================================
// SEARCH SUGGESTIONS
// ============================================================================

/**
 * Get search suggestions based on partial query
 *
 * @param partialQuery - Partial search query
 * @param limit - Maximum number of suggestions to return
 * @returns Promise resolving to search suggestions
 * @throws {Error} If retrieval fails
 *
 * @example
 * ```typescript
 * const suggestions = await getSearchSuggestions('res', 5);
 * console.log('Suggestions:', suggestions);
 * // ['research assistant', 'resume builder', 'resource manager', ...]
 * ```
 */
export async function getSearchSuggestions(partialQuery: string, limit = 5): Promise<string[]> {
  if (!partialQuery || partialQuery.length < 2) {
    return [];
  }

  const all = await loadAllMarketplaceAgents();
  const lowerQuery = partialQuery.toLowerCase();
  const suggestions = new Set<string>();

  // Add matching plugin names
  for (const agent of all) {
    if (agent.name.toLowerCase().includes(lowerQuery)) {
      suggestions.add(agent.name);
    }

    // Add matching tags
    for (const tag of agent.marketplace.tags) {
      if (tag.toLowerCase().includes(lowerQuery)) {
        suggestions.add(tag);
      }
    }

    // Add matching categories
    if (agent.category.toLowerCase().includes(lowerQuery)) {
      suggestions.add(agent.category);
    }

    if (suggestions.size >= limit) {
      break;
    }
  }

  return Array.from(suggestions).slice(0, limit);
}

// ============================================================================
// PERSONALIZED DISCOVERY
// ============================================================================

/**
 * Get personalized discovery feed
 *
 * Combines trending, new, top-rated, and recommendations into a
 * personalized feed based on user's installed plugins.
 *
 * @param installedPluginIds - Array of installed plugin IDs
 * @param options - Discovery options
 * @returns Promise resolving to personalized feed
 * @throws {Error} If retrieval fails
 *
 * @example
 * ```typescript
 * const feed = await getPersonalizedFeed(['plugin-1', 'plugin-2'], {
 *   trending: 3,
 *   new: 2,
 *   topRated: 2,
 *   recommended: 3
 * });
 * feed.forEach((result) => {
 *   console.log(`${result.plugin.name} - ${result.reason}`);
 * });
 * ```
 */
export async function getPersonalizedFeed(
  installedPluginIds: string[],
  options: {
    trending?: number;
    new?: number;
    topRated?: number;
    recommended?: number;
  } = {}
): Promise<DiscoveryResult[]> {
  const {
    trending = 3,
    new: newPlugins = 2,
    topRated = 2,
    recommended = 3,
  } = options;

  const feed: DiscoveryResult[] = [];

  // Get trending
  const trendingResults = await getTrendingPlugins(trending);
  feed.push(...trendingResults);

  // Get new
  const newResults = await getNewPlugins(newPlugins);
  feed.push(...newResults);

  // Get top rated
  const topRatedResults = await getTopRatedPlugins(topRated);
  feed.push(...topRatedResults);

  // Get recommended
  if (installedPluginIds.length > 0) {
    const recommendedResults = await getRecommendedPlugins(installedPluginIds, recommended);
    feed.push(...recommendedResults);
  }

  return feed;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get relative time string
 */
function getRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}
