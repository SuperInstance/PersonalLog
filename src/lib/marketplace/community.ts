/**
 * Community Marketplace
 *
 * Infrastructure for sharing and discovering user-created agents.
 * Users can share their agents, discover community creations, and
 * contribute to a growing ecosystem of agents.
 */

import type { AgentDefinition } from '../agents/types';
import { saveUserAgent, loadUserAgents, deleteUserAgent } from '../agents/storage';

/**
 * Marketplace agent visibility levels
 */
export type MarketplaceVisibility = 'public' | 'private' | 'unlisted';

/**
 * Marketplace statistics
 */
export interface MarketplaceStats {
  /** Number of times downloaded */
  downloads: number;
  /** Number of positive ratings */
  likes: number;
  /** Number of negative ratings */
  dislikes: number;
  /** Average rating (1-5) */
  averageRating: number;
  /** Number of reviews */
  reviewCount: number;
}

/**
 * Marketplace metadata for shared agents
 * Compatible with existing MarketplaceMetadata from types.ts
 */
export interface MarketplaceMetadata {
  /** Whether agent is visible in marketplace */
  visibility: MarketplaceVisibility;
  /** When agent was shared */
  sharedAt: number;
  /** Agent author/creator name */
  author: string;
  /** Author user ID */
  authorId?: string;
  /** Version string */
  version: string;
  /** Detailed description */
  description?: string;
  /** Download statistics */
  stats: MarketplaceStats;
  /** Whether agent is featured on homepage */
  featured: boolean;
  /** Tags for discovery */
  tags: string[];
  /** Number of times forked */
  forks: number;
  /** Last updated timestamp */
  updatedAt: number;
  /** Creation timestamp */
  createdAt: number;
  /** Long form description */
  longDescription?: string;
  /** Screenshots */
  screenshots?: string[];
  /** License */
  license?: string;
  /** Changelog (string array for compatibility) */
  changelog?: string[];
  /** Installation status */
  installation?: {
    installed: boolean;
    installedVersion?: string;
    installedAt?: string;
  };
}

/**
 * Community agent in marketplace
 */
export interface MarketplaceAgent extends AgentDefinition {
  /** Marketplace-specific metadata */
  marketplace: MarketplaceMetadata;
  /** User-provided description for marketplace */
  longDescription?: string;
  /** Installation instructions */
  installInstructions?: string;
}

/**
 * Report reason for inappropriate content
 */
export type ReportReason =
  | 'inappropriate-content'
  | 'spam'
  | 'malware'
  | 'copyright-violation'
  | 'misleading'
  | 'other';

/**
 * Agent report
 */
export interface AgentReport {
  /** Agent ID being reported */
  agentId: string;
  /** Who reported it */
  reportedBy: string;
  /** Report reason */
  reason: ReportReason;
  /** Additional details */
  details: string;
  /** Report timestamp */
  timestamp: number;
  /** Report status */
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
}

/**
 * Share agent to community marketplace
 *
 * @param agent - Agent definition to share
 * @param visibility - Visibility level
 * @returns Promise<string> - Agent ID in marketplace
 */
export async function shareAgent(
  agent: AgentDefinition,
  visibility: MarketplaceVisibility = 'public'
): Promise<string> {
  // Create marketplace metadata
  const marketplaceMeta: MarketplaceMetadata = {
    visibility,
    sharedAt: Date.now(),
    author: agent.metadata.author,
    version: agent.metadata.version,
    description: agent.description,
    stats: {
      downloads: 0,
      likes: 0,
      dislikes: 0,
      averageRating: 0,
      reviewCount: 0,
    },
    featured: false,
    tags: agent.metadata.tags,
    forks: 0,
    updatedAt: Date.now(),
    createdAt: new Date(agent.metadata.createdAt).getTime(),
    license: agent.metadata.license || 'MIT',
  };

  // Create marketplace agent
  const marketplaceAgent: MarketplaceAgent = {
    ...agent,
    marketplace: marketplaceMeta,
  };

  // Save to user agents storage
  await saveUserAgent(marketplaceAgent);

  // If public, add to community feed
  if (visibility === 'public') {
    await addToCommunityFeed(marketplaceAgent.id);
    await notifySubscribers('new_agent', marketplaceAgent);
  }

  return marketplaceAgent.id;
}

/**
 * Get all community agents
 *
 * @param options - Filter and sort options
 * @returns Promise<MarketplaceAgent[]> - Community agents
 */
export async function getCommunityAgents(options?: {
  category?: string;
  sort?: 'trending' | 'recent' | 'popular' | 'featured';
  limit?: number;
  tags?: string[];
}): Promise<MarketplaceAgent[]> {
  // Load all agents from storage
  const allAgents = await loadUserAgents();

  // Filter to only public agents
  let agents = allAgents.filter(
    (agent): agent is MarketplaceAgent =>
      'marketplace' in agent && (agent as MarketplaceAgent).marketplace.visibility === 'public'
  );

  // Filter by category
  if (options?.category) {
    agents = agents.filter((agent) => agent.category === options.category);
  }

  // Filter by tags
  if (options?.tags && options.tags.length > 0) {
    agents = agents.filter((agent) =>
      options.tags!.some((tag) => agent.marketplace.tags.includes(tag))
    );
  }

  // Sort
  switch (options?.sort) {
    case 'trending':
      // Trending = high recent downloads
      agents.sort((a, b) => {
        const aTrend =
          a.marketplace.stats.downloads /
          Math.max(1, (Date.now() - a.marketplace.sharedAt) / (1000 * 60 * 60 * 24)); // per day
        const bTrend =
          b.marketplace.stats.downloads /
          Math.max(1, (Date.now() - b.marketplace.sharedAt) / (1000 * 60 * 60 * 24));
        return bTrend - aTrend;
      });
      break;

    case 'recent':
      agents.sort((a, b) => b.marketplace.updatedAt - a.marketplace.updatedAt);
      break;

    case 'popular':
      agents.sort((a, b) => b.marketplace.stats.downloads - a.marketplace.stats.downloads);
      break;

    case 'featured':
      agents = agents.filter((agent) => agent.marketplace.featured);
      agents.sort((a, b) => b.marketplace.stats.downloads - a.marketplace.stats.downloads);
      break;

    default:
      // Default: sort by downloads (popular)
      agents.sort((a, b) => b.marketplace.stats.downloads - a.marketplace.stats.downloads);
  }

  // Limit results
  if (options?.limit) {
    agents = agents.slice(0, options.limit);
  }

  return agents;
}

/**
 * Get trending agents this week
 */
export async function getTrendingAgents(limit: number = 10): Promise<MarketplaceAgent[]> {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const agents = await getCommunityAgents({
    sort: 'trending',
    limit: limit * 3, // Get more to filter
  });

  // Filter to agents with significant activity this week
  return agents
    .filter((agent) => agent.marketplace.stats.downloads > 10)
    .slice(0, limit);
}

/**
 * Get new agents this week
 */
export async function getNewAgents(limit: number = 10): Promise<MarketplaceAgent[]> {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const agents = await getCommunityAgents({
    sort: 'recent',
    limit: limit * 2,
  });

  // Filter to agents created this week
  return agents.filter((agent) => agent.marketplace.sharedAt > oneWeekAgo).slice(0, limit);
}

/**
 * Get featured agents
 */
export async function getFeaturedAgents(limit: number = 6): Promise<MarketplaceAgent[]> {
  return getCommunityAgents({
    sort: 'featured',
    limit,
  });
}

/**
 * Download agent from marketplace
 *
 * @param agentId - Agent ID to download
 * @returns Promise<MarketplaceAgent> - Downloaded agent
 */
export async function downloadAgent(agentId: string): Promise<MarketplaceAgent> {
  const agents = await loadUserAgents();
  const agent = agents.find((a): a is MarketplaceAgent => a.id === agentId && 'marketplace' in a);

  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  // Increment download count
  agent.marketplace.stats.downloads += 1;
  agent.marketplace.updatedAt = Date.now();

  // Save updated stats
  await saveUserAgent(agent);

  return agent;
}

/**
 * Rate agent
 *
 * @param agentId - Agent ID to rate
 * @param rating - Rating from 1-5
 * @param like - Whether user liked the agent
 */
export async function rateAgent(
  agentId: string,
  rating: number,
  like?: boolean
): Promise<void> {
  const agents = await loadUserAgents();
  const agent = agents.find((a): a is MarketplaceAgent => a.id === agentId && 'marketplace' in a);

  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  // Update stats
  if (like === true) {
    agent.marketplace.stats.likes += 1;
  } else if (like === false) {
    agent.marketplace.stats.dislikes += 1;
  }

  // Update average rating
  const currentTotal = agent.marketplace.stats.averageRating * agent.marketplace.stats.reviewCount;
  agent.marketplace.stats.reviewCount += 1;
  agent.marketplace.stats.averageRating = (currentTotal + rating) / agent.marketplace.stats.reviewCount;

  agent.marketplace.updatedAt = Date.now();

  await saveUserAgent(agent);
}

/**
 * Fork agent (create copy)
 *
 * @param agentId - Agent ID to fork
 * @param newAuthor - Author of the forked version
 * @returns Promise<string> - New agent ID
 */
export async function forkAgent(agentId: string, newAuthor: string): Promise<string> {
  const agents = await loadUserAgents();
  const originalAgent = agents.find((a) => a.id === agentId && 'marketplace' in a);

  if (!originalAgent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  // Increment fork count on original
  if ('marketplace' in originalAgent) {
    (originalAgent as MarketplaceAgent).marketplace.forks += 1;
    await saveUserAgent(originalAgent);
  }

  // Create fork
  const originalMarketplace = (originalAgent as MarketplaceAgent).marketplace;
  const forkedAgent: MarketplaceAgent = {
    ...JSON.parse(JSON.stringify(originalAgent)), // Deep clone
    id: `${agentId}-fork-${Date.now()}`,
    name: `${originalAgent.name} (Fork)`,
    metadata: {
      ...originalAgent.metadata,
      author: newAuthor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    marketplace: {
      ...originalMarketplace,
      sharedAt: Date.now(),
      author: newAuthor,
      description: originalAgent.description,
      version: originalAgent.metadata.version,
      createdAt: Date.now(),
      stats: {
        downloads: 0,
        likes: 0,
        dislikes: 0,
        averageRating: 0,
        reviewCount: 0,
      },
      featured: false,
      forks: 0,
      updatedAt: Date.now(),
      visibility: 'unlisted', // Forks start as unlisted
      license: originalMarketplace.license || 'MIT',
    },
  };

  await saveUserAgent(forkedAgent);

  return forkedAgent.id;
}

/**
 * Report inappropriate agent
 *
 * @param agentId - Agent ID to report
 * @param reason - Report reason
 * @param details - Additional details
 * @param reporter - Who is reporting
 */
export async function reportAgent(
  agentId: string,
  reason: ReportReason,
  details: string,
  reporter: string
): Promise<void> {
  const report: AgentReport = {
    agentId,
    reportedBy: reporter,
    reason,
    details,
    timestamp: Date.now(),
    status: 'pending',
  };

  // Store report (in real implementation, send to server)
  const reports = await loadReports();
  reports.push(report);
  await saveReports(reports);

  // In production, notify moderators
  console.warn(`[Marketplace] Agent ${agentId} reported for ${reason}`);
}

/**
 * Feature agent on homepage
 *
 * @param agentId - Agent ID to feature
 * @param featured - Whether to feature or unfeature
 */
export async function featureAgent(agentId: string, featured: boolean = true): Promise<void> {
  const agents = await loadUserAgents();
  const agent = agents.find((a): a is MarketplaceAgent => a.id === agentId && 'marketplace' in a);

  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  agent.marketplace.featured = featured;
  agent.marketplace.updatedAt = Date.now();

  await saveUserAgent(agent);
}

/**
 * Update shared agent
 *
 * @param agentId - Agent ID to update
 * @param updates - Updates to apply
 */
export async function updateSharedAgent(
  agentId: string,
  updates: Partial<MarketplaceAgent>
): Promise<void> {
  const agents = await loadUserAgents();
  const index = agents.findIndex((a) => a.id === agentId);

  if (index === -1) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  // Merge updates
  const currentAgent = agents[index] as MarketplaceAgent;
  agents[index] = {
    ...agents[index],
    ...updates,
    marketplace: {
      ...currentAgent.marketplace,
      ...(updates.marketplace || {}),
      updatedAt: Date.now(),
    },
  } as MarketplaceAgent;

  await saveUserAgent(agents[index] as MarketplaceAgent);
}

/**
 * Delete agent from marketplace
 *
 * @param agentId - Agent ID to delete
 */
export async function deleteSharedAgent(agentId: string): Promise<void> {
  await deleteUserAgent(agentId);
}

/**
 * Search community agents
 *
 * @param query - Search query
 * @param options - Filter options
 */
export async function searchCommunityAgents(
  query: string,
  options?: {
    category?: string;
    limit?: number;
  }
): Promise<MarketplaceAgent[]> {
  const allAgents = await getCommunityAgents();

  const lowerQuery = query.toLowerCase();

  // Search in name, description, tags
  const results = allAgents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(lowerQuery) ||
      agent.description.toLowerCase().includes(lowerQuery) ||
      agent.marketplace.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );

  // Filter by category if specified
  const filtered = options?.category
    ? results.filter((agent) => agent.category === options.category)
    : results;

  // Limit results
  return options?.limit ? filtered.slice(0, options.limit) : filtered;
}

// ============ Helper Functions ============

/**
 * Add agent to community feed
 */
async function addToCommunityFeed(agentId: string): Promise<void> {
  // In production: Add to database/feed system
  console.log(`[Marketplace] Added ${agentId} to community feed`);
}

/**
 * Notify subscribers of new content
 */
async function notifySubscribers(
  type: 'new_agent' | 'updated_agent',
  agent: MarketplaceAgent
): Promise<void> {
  // In production: Send push notifications/webhooks
  console.log(`[Marketplace] Notified subscribers: ${type} - ${agent.name}`);
}

/**
 * Load all reports
 */
async function loadReports(): Promise<AgentReport[]> {
  // In production: Load from database
  try {
    const stored = localStorage.getItem('agent_reports');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save reports
 */
async function saveReports(reports: AgentReport[]): Promise<void> {
  // In production: Save to database
  try {
    localStorage.setItem('agent_reports', JSON.stringify(reports));
  } catch (error) {
    console.error('[Marketplace] Failed to save reports:', error);
  }
}

/**
 * Get all reports (admin only)
 */
export async function getReports(): Promise<AgentReport[]> {
  return loadReports();
}

/**
 * Get agent reviews (placeholder for future)
 */
export async function getAgentReviews(agentId: string): Promise<
  Array<{
    id: string;
    agentId: string;
    author: string;
    rating: number;
    comment: string;
    timestamp: number;
  }>
> {
  // In production: Load from database
  return [];
}
