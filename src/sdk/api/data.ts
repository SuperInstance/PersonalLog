/**
 * PersonalLog Plugin SDK - Data API Implementation
 *
 * Provides access to conversations, knowledge base, and settings.
 *
 * @packageDocumentation
 */

import type {
  DataAPI,
  ConversationAPI,
  KnowledgeAPI,
  SettingsAPI,
  Conversation,
  ConversationListOptions,
  CreateConversationData,
  UpdateConversationData,
  ConversationChangeCallback,
  KnowledgeEntry,
  KnowledgeSearchOptions,
  AddKnowledgeEntry,
  KnowledgeListOptions,
} from '../types';

// Import conversation store functions
import {
  getConversation,
  listConversations,
  createConversation as createConv,
  updateConversation as updateConv,
  deleteConversation as deleteConv,
  searchConversations as searchConv,
} from '@/lib/storage/conversation-store';

// ============================================================================
// CONVERSATION API
// ============================================================================

/**
 * Conversation API implementation
 *
 * Provides methods for accessing and managing conversations.
 */
class ConversationAPIImpl implements ConversationAPI {
  private changeCallbacks: Set<ConversationChangeCallback> = new Set();

  async get(id: string): Promise<Conversation | null> {
    try {
      return await getConversation(id);
    } catch (error) {
      throw new Error(`Failed to get conversation ${id}: ${error}`);
    }
  }

  async list(options?: ConversationListOptions): Promise<Conversation[]> {
    try {
      return await listConversations({
        includeArchived: options?.includeArchived,
        limit: options?.limit,
        offset: options?.offset,
      });
    } catch (error) {
      throw new Error(`Failed to list conversations: ${error}`);
    }
  }

  async create(data: CreateConversationData): Promise<Conversation> {
    try {
      const conversation = await createConv(data.title, data.type);
      this.notifyChange('created', conversation);
      return conversation;
    } catch (error) {
      throw new Error(`Failed to create conversation: ${error}`);
    }
  }

  async update(id: string, data: UpdateConversationData): Promise<Conversation> {
    try {
      const updated = await updateConv(id, data);
      this.notifyChange('updated', updated);
      return updated;
    } catch (error) {
      throw new Error(`Failed to update conversation ${id}: ${error}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await deleteConv(id);
      this.notifyChange('deleted', id);
    } catch (error) {
      throw new Error(`Failed to delete conversation ${id}: ${error}`);
    }
  }

  async search(query: string): Promise<Conversation[]> {
    try {
      return await searchConv(query);
    } catch (error) {
      throw new Error(`Failed to search conversations: ${error}`);
    }
  }

  onChange(callback: ConversationChangeCallback): () => void {
    this.changeCallbacks.add(callback);
    return () => {
      this.changeCallbacks.delete(callback);
    };
  }

  private notifyChange(
    type: 'created' | 'updated' | 'deleted',
    conversation: Conversation | string
  ): void {
    for (const callback of this.changeCallbacks) {
      try {
        callback(type, conversation);
      } catch (error) {
        console.error('Conversation change callback failed:', error);
      }
    }
  }
}

// ============================================================================
// KNOWLEDGE API
// ============================================================================

/**
 * Knowledge API implementation
 *
 * Provides methods for accessing and managing the knowledge base.
 */
class KnowledgeAPIImpl implements KnowledgeAPI {
  async search(
    query: string,
    options?: KnowledgeSearchOptions
  ): Promise<KnowledgeEntry[]> {
    try {
      // Import vector store
      const vectorStore = await import('@/lib/knowledge/vector-store');
      const results = await vectorStore.default.search(query, {
        limit: options?.limit || 10,
        threshold: options?.threshold || 0.7,
      });

      return results.map((r: any) => ({
        id: r.id,
        content: r.content,
        metadata: r.metadata,
        embedding: r.embedding,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
    } catch (error) {
      throw new Error(`Failed to search knowledge base: ${error}`);
    }
  }

  async get(id: string): Promise<KnowledgeEntry | null> {
    try {
      const vectorStore = await import('@/lib/knowledge/vector-store');
      const entry = await vectorStore.default.get(id);
      return entry;
    } catch (error) {
      throw new Error(`Failed to get knowledge entry ${id}: ${error}`);
    }
  }

  async add(entry: AddKnowledgeEntry): Promise<KnowledgeEntry> {
    try {
      const vectorStore = await import('@/lib/knowledge/vector-store');
      const added = await vectorStore.default.add(entry.content, entry.metadata);
      return added;
    } catch (error) {
      throw new Error(`Failed to add knowledge entry: ${error}`);
    }
  }

  async update(id: string, data: Partial<KnowledgeEntry>): Promise<KnowledgeEntry> {
    try {
      const vectorStore = await import('@/lib/knowledge/vector-store');
      const updated = await vectorStore.default.update(id, data);
      return updated;
    } catch (error) {
      throw new Error(`Failed to update knowledge entry ${id}: ${error}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const vectorStore = await import('@/lib/knowledge/vector-store');
      await vectorStore.default.delete(id);
    } catch (error) {
      throw new Error(`Failed to delete knowledge entry ${id}: ${error}`);
    }
  }

  async list(options?: KnowledgeListOptions): Promise<KnowledgeEntry[]> {
    try {
      const vectorStore = await import('@/lib/knowledge/vector-store');
      const entries = await vectorStore.default.list({
        limit: options?.limit,
        offset: options?.offset,
        filter: options?.filter,
      });
      return entries;
    } catch (error) {
      throw new Error(`Failed to list knowledge entries: ${error}`);
    }
  }
}

// ============================================================================
// SETTINGS API
// ============================================================================

/**
 * Settings API implementation
 *
 * Provides methods for accessing and managing app settings.
 */
class SettingsAPIImpl implements SettingsAPI {
  private changeCallbacks: Map<string, Set<(value: any) => void>> = new Map();
  private allCallbacks: Set<(key: string, value: any) => void> = new Set();

  get<T = any>(key: string): T | undefined {
    try {
      // Try to get from localStorage (client-side)
      if (typeof window !== 'undefined') {
        const value = localStorage.getItem(`setting:${key}`);
        return value ? JSON.parse(value) : undefined;
      }
      return undefined;
    } catch (error) {
      console.error(`Failed to get setting ${key}:`, error);
      return undefined;
    }
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`setting:${key}`, JSON.stringify(value));
      }
      this.notifyChange(key, value);
    } catch (error) {
      throw new Error(`Failed to set setting ${key}: ${error}`);
    }
  }

  getAll(): Record<string, any> {
    try {
      const settings: Record<string, any> = {};
      if (typeof window !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('setting:')) {
            const settingKey = key.substring(8); // Remove 'setting:' prefix
            const value = localStorage.getItem(key);
            if (value) {
              try {
                settings[settingKey] = JSON.parse(value);
              } catch {
                settings[settingKey] = value;
              }
            }
          }
        }
      }
      return settings;
    } catch (error) {
      console.error('Failed to get all settings:', error);
      return {};
    }
  }

  onChange(callback: (key: string, value: any) => void): () => void {
    this.allCallbacks.add(callback);
    return () => {
      this.allCallbacks.delete(callback);
    };
  }

  private notifyChange(key: string, value: any): void {
    // Notify all callbacks
    for (const callback of this.allCallbacks) {
      try {
        callback(key, value);
      } catch (error) {
        console.error('Settings change callback failed:', error);
      }
    }

    // Notify key-specific callbacks
    const keyCallbacks = this.changeCallbacks.get(key);
    if (keyCallbacks) {
      for (const callback of keyCallbacks) {
        try {
          callback(value);
        } catch (error) {
          console.error('Setting change callback failed:', error);
        }
      }
    }
  }
}

// ============================================================================
// DATA API
// ============================================================================

/**
 * Data API implementation
 *
 * Provides access to all data-related APIs.
 */
class DataAPIImpl implements DataAPI {
  public readonly conversations: ConversationAPI;
  public readonly knowledge: KnowledgeAPI;
  public readonly settings: SettingsAPI;

  constructor() {
    this.conversations = new ConversationAPIImpl();
    this.knowledge = new KnowledgeAPIImpl();
    this.settings = new SettingsAPIImpl();
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new Data API instance
 *
 * @returns Data API instance
 */
export function createDataAPI(): DataAPI {
  return new DataAPIImpl();
}

export default DataAPIImpl;
