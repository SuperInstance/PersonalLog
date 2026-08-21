/**
 * Shared IndexedDB Connection
 *
 * Single source of truth for opening the PersonalLogMessenger database.
 *
 * IMPORTANT: Multiple modules (conversation-store, ai-contact-store,
 * agents/storage) all share this database. IndexedDB's onupgradeneeded
 * fires only for the FIRST connection at a given version, so all object
 * stores MUST be created in this one handler. Previously each module had
 * its own getDB() with a partial onupgradeneeded, causing whichever
 * module opened first to create only its own stores — the rest failed
 * with "One of the specified object stores was not found".
 */

import { StorageError } from '@/lib/errors';

const DB_NAME = 'PersonalLogMessenger';
const DB_VERSION = 1;

const STORE_CONVERSATIONS = 'conversations';
const STORE_MESSAGES = 'messages';
const STORE_AGENTS = 'ai-agents';
const STORE_USER_AGENTS = 'user-agents';

let db: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Opens (and caches) the shared PersonalLogMessenger database.
 *
 * All object stores are created in a single onupgradeneeded handler so
 * the schema is consistent regardless of which consumer connects first.
 */
export async function getDB(): Promise<IDBDatabase> {
  if (db) return db;
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
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

      // Conversations store
      if (!database.objectStoreNames.contains(STORE_CONVERSATIONS)) {
        const convStore = database.createObjectStore(STORE_CONVERSATIONS, { keyPath: 'id' });
        convStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        convStore.createIndex('pinned', 'metadata.pinned', { unique: false });
        convStore.createIndex('archived', 'metadata.archived', { unique: false });
      }

      // Messages store
      if (!database.objectStoreNames.contains(STORE_MESSAGES)) {
        const msgStore = database.createObjectStore(STORE_MESSAGES, { keyPath: 'id' });
        msgStore.createIndex('conversationId', 'conversationId', { unique: false });
        msgStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // AI Agents store (used by ai-contact-store)
      if (!database.objectStoreNames.contains(STORE_AGENTS)) {
        const agentStore = database.createObjectStore(STORE_AGENTS, { keyPath: 'id' });
        agentStore.createIndex('name', 'name', { unique: false });
      }

      // User Agents store (used by agents/storage)
      if (!database.objectStoreNames.contains(STORE_USER_AGENTS)) {
        const userAgentStore = database.createObjectStore(STORE_USER_AGENTS, { keyPath: 'id' });
        userAgentStore.createIndex('category', 'category', { unique: false });
        userAgentStore.createIndex('createdAt', 'metadata.createdAt', { unique: false });
        userAgentStore.createIndex('author', 'metadata.author', { unique: false });
      }
    };
  });

  return dbPromise;
}

export { DB_NAME, DB_VERSION };
