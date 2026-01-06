/**
 * Agent Storage (IndexedDB)
 *
 * Persistent storage for user-created agent definitions.
 * Integrates with the existing IndexedDB pattern used in PersonalLog.
 */

import type { AgentDefinition } from './types';
import { StorageError, NotFoundError, ValidationError } from '@/lib/errors';

const DB_NAME = 'PersonalLogMessenger';
const DB_VERSION = 1;
const STORE_USER_AGENTS = 'user-agents';

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

      // Create user agents store if it doesn't exist
      if (!database.objectStoreNames.contains(STORE_USER_AGENTS)) {
        const agentStore = database.createObjectStore(STORE_USER_AGENTS, { keyPath: 'id' });
        agentStore.createIndex('category', 'category', { unique: false });
        agentStore.createIndex('createdAt', 'metadata.createdAt', { unique: false });
        agentStore.createIndex('author', 'metadata.author', { unique: false });
      }
    };
  });
}

/**
 * Save a user-created agent
 *
 * @param agentDefinition - Agent definition to save
 * @returns Promise resolving to saved agent definition
 * @throws {ValidationError} If agent ID is empty
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * const myAgent = await saveUserAgent({
 *   id: 'my-custom-agent-v1',
 *   name: 'My Agent',
 *   description: 'Does something cool',
 *   icon: '🚀',
 *   category: AgentCategory.CUSTOM,
 *   activationMode: ActivationMode.FOREGROUND,
 *   initialState: { status: AgentState.IDLE },
 *   metadata: {
 *     version: '1.0.0',
 *     author: 'user',
 *     createdAt: new Date().toISOString(),
 *     updatedAt: new Date().toISOString(),
 *     tags: ['custom'],
 *   }
 * });
 * ```
 */
export async function saveUserAgent(agentDefinition: AgentDefinition): Promise<AgentDefinition> {
  if (!agentDefinition.id?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'id',
      value: agentDefinition.id,
    });
  }

  const database = await getDB();

  // Add/update timestamp
  const agentToSave: AgentDefinition = {
    ...agentDefinition,
    metadata: {
      ...agentDefinition.metadata,
      updatedAt: new Date().toISOString(),
    },
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_USER_AGENTS], 'readwrite');
    const store = transaction.objectStore(STORE_USER_AGENTS);
    const request = store.put(agentToSave);

    request.onsuccess = () => resolve(agentToSave);
    request.onerror = () =>
      reject(
        new StorageError(`Failed to save agent: ${agentDefinition.id}`, {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

/**
 * Load a user agent by ID
 *
 * @param agentId - Agent ID to load
 * @returns Promise resolving to agent definition or null if not found
 * @throws {ValidationError} If agent ID is empty
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * const agent = await loadUserAgent('my-custom-agent-v1');
 * if (agent) {
 *   console.log(agent.name);
 * }
 * ```
 */
export async function loadUserAgent(agentId: string): Promise<AgentDefinition | null> {
  if (!agentId?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'agentId',
      value: agentId,
    });
  }

  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_USER_AGENTS], 'readonly');
    const store = transaction.objectStore(STORE_USER_AGENTS);
    const request = store.get(agentId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () =>
      reject(
        new StorageError(`Failed to load agent: ${agentId}`, {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

/**
 * Load all user agents
 *
 * @returns Promise resolving to array of all user agent definitions
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * const agents = await loadUserAgents();
 * console.log(`Found ${agents.length} user agents`);
 * ```
 */
export async function loadUserAgents(): Promise<AgentDefinition[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_USER_AGENTS], 'readonly');
    const store = transaction.objectStore(STORE_USER_AGENTS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () =>
      reject(
        new StorageError('Failed to load user agents', {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

/**
 * Delete a user agent
 *
 * @param agentId - Agent ID to delete
 * @returns Promise that resolves when deletion is complete
 * @throws {ValidationError} If agent ID is empty
 * @throws {NotFoundError} If agent doesn't exist
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * await deleteUserAgent('my-custom-agent-v1');
 * ```
 */
export async function deleteUserAgent(agentId: string): Promise<void> {
  if (!agentId?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'agentId',
      value: agentId,
    });
  }

  const database = await getDB();

  // Check if agent exists
  const existing = await loadUserAgent(agentId);
  if (!existing) {
    throw new NotFoundError('agent', agentId);
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_USER_AGENTS], 'readwrite');
    const store = transaction.objectStore(STORE_USER_AGENTS);
    const request = store.delete(agentId);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(
        new StorageError(`Failed to delete agent: ${agentId}`, {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

/**
 * Update a user agent
 *
 * @param agentId - Agent ID to update
 * @param updates - Partial updates to apply
 * @returns Promise resolving to updated agent definition
 * @throws {ValidationError} If agent ID is empty
 * @throws {NotFoundError} If agent doesn't exist
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * const updated = await updateUserAgent('my-custom-agent-v1', {
 *   name: 'Updated Name',
 *   description: 'Updated description',
 * });
 * ```
 */
export async function updateUserAgent(
  agentId: string,
  updates: Partial<Omit<AgentDefinition, 'id'>>
): Promise<AgentDefinition> {
  if (!agentId?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'agentId',
      value: agentId,
    });
  }

  const existing = await loadUserAgent(agentId);
  if (!existing) {
    throw new NotFoundError('agent', agentId);
  }

  const updated: AgentDefinition = {
    ...existing,
    ...updates,
    id: existing.id,
    metadata: {
      ...existing.metadata,
      ...(updates.metadata || {}),
      updatedAt: new Date().toISOString(),
    },
  };

  return saveUserAgent(updated);
}

/**
 * Search user agents by query
 *
 * @param query - Search query (matches name, description, tags)
 * @returns Promise resolving to matching agent definitions
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * const results = await searchUserAgents('analysis');
 * console.log(`Found ${results.length} matching agents`);
 * ```
 */
export async function searchUserAgents(query: string): Promise<AgentDefinition[]> {
  const all = await loadUserAgents();

  if (!query.trim()) return all;

  const lowerQuery = query.toLowerCase();

  return all.filter((agent) => {
    return (
      agent.name.toLowerCase().includes(lowerQuery) ||
      agent.description.toLowerCase().includes(lowerQuery) ||
      agent.metadata.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  });
}

/**
 * Get user agents by category
 *
 * @param category - Agent category filter
 * @returns Promise resolving to agents in the category
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * const customAgents = await getUserAgentsByCategory(AgentCategory.CUSTOM);
 * ```
 */
export async function getUserAgentsByCategory(category: string): Promise<AgentDefinition[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_USER_AGENTS], 'readonly');
    const index = transaction.objectStore(STORE_USER_AGENTS).index('category');
    const request = index.getAll(category);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () =>
      reject(
        new StorageError(`Failed to load agents by category: ${category}`, {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

/**
 * Clear all user agents
 *
 * WARNING: This is a destructive operation!
 *
 * @returns Promise that resolves when all agents are deleted
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * await clearAllUserAgents();
 * console.log('All user agents deleted');
 * ```
 */
export async function clearAllUserAgents(): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_USER_AGENTS], 'readwrite');
    const store = transaction.objectStore(STORE_USER_AGENTS);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(
        new StorageError('Failed to clear user agents', {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

/**
 * Export all user agents as JSON
 *
 * Useful for backup/restore functionality.
 *
 * @returns Promise resolving to JSON string of all agents
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * const json = await exportUserAgents();
 * console.log(json);
 * ```
 */
export async function exportUserAgents(): Promise<string> {
  const agents = await loadUserAgents();
  return JSON.stringify(agents, null, 2);
}

/**
 * Import user agents from JSON
 *
 * @param json - JSON string of agent definitions
 * @param overwrite - Whether to overwrite existing agents with same ID
 * @returns Promise resolving to number of agents imported
 * @throws {ValidationError} If JSON is invalid
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * const json = '[{"id": "agent-1", ...}]';
 * const count = await importUserAgents(json, true);
 * console.log(`Imported ${count} agents`);
 * ```
 */
export async function importUserAgents(json: string, overwrite = false): Promise<number> {
  let agents: AgentDefinition[];

  try {
    agents = JSON.parse(json);
  } catch (error) {
    throw new ValidationError('Invalid JSON format', {
      field: 'json',
      value: json,
      context: { error },
    });
  }

  if (!Array.isArray(agents)) {
    throw new ValidationError('JSON must be an array of agents', {
      field: 'json',
      value: json,
    });
  }

  let imported = 0;

  for (const agent of agents) {
    try {
      // Check if agent exists
      const existing = await loadUserAgent(agent.id);

      if (existing && !overwrite) {
        continue; // Skip existing agents
      }

      await saveUserAgent(agent);
      imported++;
    } catch (error) {
      console.error(`Failed to import agent ${agent.id}:`, error);
      // Continue with other agents
    }
  }

  return imported;
}
