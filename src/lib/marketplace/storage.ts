/**
 * Agent Marketplace Storage (IndexedDB)
 *
 * Persistent storage for marketplace agents.
 * Separate store from user agents for clear separation.
 */

import type { MarketplaceAgent, AgentRating } from './types';
import type { AgentCategory } from '@/lib/agents/types';
import { StorageError, NotFoundError, ValidationError } from '@/lib/errors';

const DB_NAME = 'PersonalLogMessenger';
const DB_VERSION = 1;
const STORE_MARKETPLACE_AGENTS = 'marketplace-agents';
const STORE_AGENT_RATINGS = 'agent-ratings';

let db: IDBDatabase | null = null;

/**
 * Get IndexedDB instance
 *
 * Opens or returns existing database connection.
 * Shares the same database as conversations for consistency.
 */
async function getDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () =>
      reject(
        new StorageError('Failed to open database', {
          technicalDetails: `DB: ${DB_NAME}, Version: ${DB_VERSION}`,
          context: { dbName: DB_NAME, version: DB_VERSION },
        })
      );

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create marketplace agents store if it doesn't exist
      if (!database.objectStoreNames.contains(STORE_MARKETPLACE_AGENTS)) {
        const agentStore = database.createObjectStore(STORE_MARKETPLACE_AGENTS, { keyPath: 'id' });
        agentStore.createIndex('category', 'category', { unique: false });
        agentStore.createIndex('createdAt', 'marketplace.createdAt', { unique: false });
        agentStore.createIndex('author', 'marketplace.author', { unique: false });
        agentStore.createIndex('visibility', 'marketplace.visibility', { unique: false });
        agentStore.createIndex('downloads', 'marketplace.stats.downloads', { unique: false });
        agentStore.createIndex('rating', 'marketplace.stats.rating', { unique: false });
      }

      // Create ratings store if it doesn't exist
      if (!database.objectStoreNames.contains(STORE_AGENT_RATINGS)) {
        const ratingStore = database.createObjectStore(STORE_AGENT_RATINGS, { keyPath: 'id' });
        ratingStore.createIndex('agentId', 'agentId', { unique: false });
        ratingStore.createIndex('userId', 'userId', { unique: false });
        ratingStore.createIndex('agentId_userId', ['agentId', 'userId'], { unique: true });
      }
    };
  });
}

/**
 * Save a marketplace agent
 *
 * @param agent - Marketplace agent to save
 * @returns Promise resolving to saved agent
 * @throws {ValidationError} If agent ID is empty
 * @throws {StorageError} If database operation fails
 */
export async function saveMarketplaceAgent(agent: MarketplaceAgent): Promise<MarketplaceAgent> {
  if (!agent.id?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'id',
      value: agent.id,
    });
  }

  const database = await getDB();

  // Update timestamp
  const agentToSave: MarketplaceAgent = {
    ...agent,
    marketplace: {
      ...agent.marketplace,
      updatedAt: Date.now(),
    },
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MARKETPLACE_AGENTS], 'readwrite');
    const store = transaction.objectStore(STORE_MARKETPLACE_AGENTS);
    const request = store.put(agentToSave);

    request.onsuccess = () => resolve(agentToSave);
    request.onerror = () =>
      reject(
        new StorageError(`Failed to save marketplace agent: ${agent.id}`, {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

/**
 * Load a marketplace agent by ID
 *
 * @param agentId - Agent ID to load
 * @returns Promise resolving to agent or null if not found
 * @throws {ValidationError} If agent ID is empty
 * @throws {StorageError} If database operation fails
 */
export async function loadMarketplaceAgent(agentId: string): Promise<MarketplaceAgent | null> {
  if (!agentId?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'agentId',
      value: agentId,
    });
  }

  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MARKETPLACE_AGENTS], 'readonly');
    const store = transaction.objectStore(STORE_MARKETPLACE_AGENTS);
    const request = store.get(agentId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () =>
      reject(
        new StorageError(`Failed to load marketplace agent: ${agentId}`, {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

/**
 * Load all marketplace agents
 *
 * @returns Promise resolving to array of all marketplace agents
 * @throws {StorageError} If database operation fails
 */
export async function loadAllMarketplaceAgents(): Promise<MarketplaceAgent[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MARKETPLACE_AGENTS], 'readonly');
    const store = transaction.objectStore(STORE_MARKETPLACE_AGENTS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () =>
      reject(
        new StorageError('Failed to load marketplace agents', {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

/**
 * Delete a marketplace agent
 *
 * @param agentId - Agent ID to delete
 * @returns Promise that resolves when deletion is complete
 * @throws {ValidationError} If agent ID is empty
 * @throws {NotFoundError} If agent doesn't exist
 * @throws {StorageError} If database operation fails
 */
export async function deleteMarketplaceAgent(agentId: string): Promise<void> {
  if (!agentId?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'agentId',
      value: agentId,
    });
  }

  const database = await getDB();

  // Check if agent exists
  const existing = await loadMarketplaceAgent(agentId);
  if (!existing) {
    throw new NotFoundError('marketplace agent', agentId);
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MARKETPLACE_AGENTS], 'readwrite');
    const store = transaction.objectStore(STORE_MARKETPLACE_AGENTS);
    const request = store.delete(agentId);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(
        new StorageError(`Failed to delete marketplace agent: ${agentId}`, {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

/**
 * Update agent statistics
 *
 * @param agentId - Agent ID to update
 * @param stats - Partial stats to update
 * @returns Promise resolving to updated agent
 * @throws {NotFoundError} If agent doesn't exist
 * @throws {StorageError} If database operation fails
 */
export async function updateAgentStats(
  agentId: string,
  stats: Partial<{ downloads: number; installs: number; rating: number; ratingCount: number }>
): Promise<MarketplaceAgent> {
  const agent = await loadMarketplaceAgent(agentId);
  if (!agent) {
    throw new NotFoundError('marketplace agent', agentId);
  }

  const updated: MarketplaceAgent = {
    ...agent,
    marketplace: {
      ...agent.marketplace,
      stats: {
        ...agent.marketplace.stats,
        ...stats,
        lastUpdated: Date.now(),
      },
    },
  };

  return saveMarketplaceAgent(updated);
}

/**
 * Search marketplace agents
 *
 * @param query - Search query
 * @returns Promise resolving to matching agents
 * @throws {StorageError} If database operation fails
 */
export async function searchMarketplaceAgents(query: string): Promise<MarketplaceAgent[]> {
  const all = await loadAllMarketplaceAgents();

  if (!query.trim()) return all;

  const lowerQuery = query.toLowerCase();

  return all.filter((agent) => {
    const searchText = [
      agent.name,
      agent.description,
      agent.marketplace.description,
      agent.marketplace.tags.join(' '),
      agent.marketplace.author,
    ].join(' ').toLowerCase();

    return searchText.includes(lowerQuery);
  });
}

/**
 * Get marketplace agents by category
 *
 * @param category - Agent category filter
 * @returns Promise resolving to agents in the category
 * @throws {StorageError} If database operation fails
 */
export async function getMarketplaceAgentsByCategory(category: AgentCategory): Promise<MarketplaceAgent[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MARKETPLACE_AGENTS], 'readonly');
    const index = transaction.objectStore(STORE_MARKETPLACE_AGENTS).index('category');
    const request = index.getAll(category);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () =>
      reject(
        new StorageError(`Failed to load marketplace agents by category: ${category}`, {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

/**
 * Get marketplace agents by visibility
 *
 * @param visibility - Visibility level filter
 * @returns Promise resolving to agents with the visibility
 * @throws {StorageError} If database operation fails
 */
export async function getMarketplaceAgentsByVisibility(
  visibility: 'public' | 'private' | 'unlisted'
): Promise<MarketplaceAgent[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MARKETPLACE_AGENTS], 'readonly');
    const index = transaction.objectStore(STORE_MARKETPLACE_AGENTS).index('visibility');
    const request = index.getAll(visibility);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () =>
      reject(
        new StorageError(`Failed to load marketplace agents by visibility: ${visibility}`, {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

/**
 * Increment download count
 *
 * @param agentId - Agent ID
 * @returns Promise resolving to updated agent
 * @throws {NotFoundError} If agent doesn't exist
 */
export async function incrementDownloads(agentId: string): Promise<MarketplaceAgent> {
  const agent = await loadMarketplaceAgent(agentId);
  if (!agent) {
    throw new NotFoundError('marketplace agent', agentId);
  }

  return updateAgentStats(agentId, {
    downloads: agent.marketplace.stats.downloads + 1,
  });
}

/**
 * Increment install count
 *
 * @param agentId - Agent ID
 * @returns Promise resolving to updated agent
 * @throws {NotFoundError} If agent doesn't exist
 */
export async function incrementInstalls(agentId: string): Promise<MarketplaceAgent> {
  const agent = await loadMarketplaceAgent(agentId);
  if (!agent) {
    throw new NotFoundError('marketplace agent', agentId);
  }

  return updateAgentStats(agentId, {
    installs: agent.marketplace.stats.installs + 1,
  });
}

/**
 * Clear all marketplace agents
 *
 * WARNING: Destructive operation!
 *
 * @returns Promise that resolves when all agents are deleted
 * @throws {StorageError} If database operation fails
 */
export async function clearAllMarketplaceAgents(): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MARKETPLACE_AGENTS], 'readwrite');
    const store = transaction.objectStore(STORE_MARKETPLACE_AGENTS);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(
        new StorageError('Failed to clear marketplace agents', {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

// ============================================================================
// RATINGS STORAGE
// ============================================================================

/**
 * Save a rating
 *
 * @param rating - Rating to save
 * @returns Promise resolving to saved rating
 * @throws {StorageError} If database operation fails
 */
export async function saveRating(rating: AgentRating): Promise<AgentRating> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_AGENT_RATINGS], 'readwrite');
    const store = transaction.objectStore(STORE_AGENT_RATINGS);
    const request = store.put(rating);

    request.onsuccess = () => resolve(rating);
    request.onerror = () =>
      reject(
        new StorageError(`Failed to save rating: ${rating.id}`, {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

/**
 * Get all ratings for an agent
 *
 * @param agentId - Agent ID
 * @returns Promise resolving to array of ratings
 * @throws {StorageError} If database operation fails
 */
export async function getRatingsForAgent(agentId: string): Promise<AgentRating[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_AGENT_RATINGS], 'readonly');
    const index = transaction.objectStore(STORE_AGENT_RATINGS).index('agentId');
    const request = index.getAll(agentId);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () =>
      reject(
        new StorageError(`Failed to load ratings for agent: ${agentId}`, {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

/**
 * Get user's rating for an agent
 *
 * @param agentId - Agent ID
 * @param userId - User ID
 * @returns Promise resolving to rating or null if not found
 * @throws {StorageError} If database operation fails
 */
export async function getUserRating(agentId: string, userId: string): Promise<AgentRating | null> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_AGENT_RATINGS], 'readonly');
    const index = transaction.objectStore(STORE_AGENT_RATINGS).index('agentId_userId');
    const request = index.get([agentId, userId]);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () =>
      reject(
        new StorageError(`Failed to load user rating for agent: ${agentId}`, {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

/**
 * Delete a rating
 *
 * @param ratingId - Rating ID to delete
 * @returns Promise that resolves when deletion is complete
 * @throws {StorageError} If database operation fails
 */
export async function deleteRating(ratingId: string): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_AGENT_RATINGS], 'readwrite');
    const store = transaction.objectStore(STORE_AGENT_RATINGS);
    const request = store.delete(ratingId);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(
        new StorageError(`Failed to delete rating: ${ratingId}`, {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

/**
 * Delete all ratings for an agent
 *
 * @param agentId - Agent ID
 * @returns Promise that resolves when deletion is complete
 * @throws {StorageError} If database operation fails
 */
export async function deleteRatingsForAgent(agentId: string): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_AGENT_RATINGS], 'readwrite');
    const index = transaction.objectStore(STORE_AGENT_RATINGS).index('agentId');
    const request = index.openCursor(IDBKeyRange.only(agentId));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = () =>
      reject(
        new StorageError(`Failed to delete ratings for agent: ${agentId}`, {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

/**
 * Load all ratings
 *
 * @returns Promise resolving to array of all ratings
 * @throws {StorageError} If database operation fails
 */
export async function loadAllRatings(): Promise<AgentRating[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_AGENT_RATINGS], 'readonly');
    const store = transaction.objectStore(STORE_AGENT_RATINGS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () =>
      reject(
        new StorageError('Failed to load all ratings', {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}
