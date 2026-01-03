/**
 * Cache Invalidation Strategies
 *
 * Provides utilities for intelligent cache invalidation.
 */

import { deleteCached, invalidateCacheByTag } from './indexeddb-cache';

/**
 * Invalidation strategy types
 */
export type InvalidationStrategy =
  | 'time-based'
  | 'event-based'
  | 'version-based'
  | 'selective'
  | 'aggressive';

/**
 * Invalidation trigger events
 */
export type InvalidationEvent =
  | 'conversation-updated'
  | 'conversation-deleted'
  | 'message-added'
  | 'message-updated'
  | 'message-deleted'
  | 'model-updated'
  | 'model-deleted'
  | 'contact-updated'
  | 'contact-deleted'
  | 'knowledge-synced'
  | 'checkpoint-created'
  | 'user-logout';

/**
 * Invalidation rule configuration
 */
interface InvalidationRule {
  event: InvalidationEvent;
  strategy: InvalidationStrategy;
  tags?: string[];
  keys?: string[];
  ttl?: number;
  delay?: number; // Delay in milliseconds before invalidating
}

/**
 * Invalidation queue for delayed invalidations
 */
class InvalidationQueue {
  private queue: Map<string, NodeJS.Timeout> = new Map();

  schedule(key: string, action: () => void, delay: number): void {
    // Clear existing timer for this key
    const existing = this.queue.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    // Schedule new invalidation
    const timer = setTimeout(() => {
      action();
      this.queue.delete(key);
    }, delay);

    this.queue.set(key, timer);
  }

  cancel(key: string): void {
    const timer = this.queue.get(key);
    if (timer) {
      clearTimeout(timer);
      this.queue.delete(key);
    }
  }

  cancelAll(): void {
    this.queue.forEach((timer) => clearTimeout(timer));
    this.queue.clear();
  }
}

const invalidationQueue = new InvalidationQueue();

/**
 * Default invalidation rules
 */
const DEFAULT_RULES: InvalidationRule[] = [
  {
    event: 'conversation-updated',
    strategy: 'selective',
    tags: ['conversations'],
    delay: 100, // Debounce rapid updates
  },
  {
    event: 'conversation-deleted',
    strategy: 'aggressive',
    tags: ['conversations'],
  },
  {
    event: 'message-added',
    strategy: 'selective',
    keys: [], // Will be populated with conversation-specific keys
  },
  {
    event: 'message-updated',
    strategy: 'selective',
    keys: [],
  },
  {
    event: 'message-deleted',
    strategy: 'selective',
    keys: [],
  },
  {
    event: 'model-updated',
    strategy: 'selective',
    tags: ['models', 'contacts'],
    delay: 500,
  },
  {
    event: 'model-deleted',
    strategy: 'aggressive',
    tags: ['models'],
  },
  {
    event: 'knowledge-synced',
    strategy: 'selective',
    tags: ['knowledge', 'checkpoints'],
  },
  {
    event: 'user-logout',
    strategy: 'aggressive',
    tags: [], // Invalidates all cached data
  },
];

/**
 * Execute invalidation based on rule
 */
async function executeInvalidation(rule: InvalidationRule, context?: Record<string, any>): Promise<void> {
  switch (rule.strategy) {
    case 'selective':
      // Invalidate specific tags or keys
      if (rule.tags) {
        for (const tag of rule.tags) {
          await invalidateCacheByTag(tag);
        }
      }

      if (rule.keys && context?.conversationId) {
        // Invalidate conversation-specific keys
        const conversationKeys = rule.keys.map((key) =>
          key.replace('{conversationId}', context.conversationId)
        );
        for (const key of conversationKeys) {
          await deleteCached(key);
        }
      }
      break;

    case 'aggressive':
      // Invalidate all related caches
      if (rule.tags) {
        for (const tag of rule.tags) {
          await invalidateCacheByTag(tag);
        }
      }

      // Also invalidate service worker cache
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'INVALIDATE_CACHE',
          data: {
            pattern: rule.tags ? new RegExp(rule.tags.join('|')) : /.*/,
          },
        });
      }
      break;

    case 'event-based':
      // Invalidate based on specific event
      if (rule.tags) {
        for (const tag of rule.tags) {
          await invalidateCacheByTag(tag);
        }
      }
      break;

    case 'version-based':
      // Invalidate by version (e.g., app update)
      const { clearCache } = await import('./indexeddb-cache');
      await clearCache();
      break;

    case 'time-based':
      // Let TTL handle expiration
      break;
  }
}

/**
 * Trigger cache invalidation based on event
 */
export async function invalidateCache(
  event: InvalidationEvent,
  context?: Record<string, any>
): Promise<void> {
  // Find matching rules
  const rules = DEFAULT_RULES.filter((rule) => rule.event === event);

  for (const rule of rules) {
    if (rule.delay && rule.delay > 0) {
      // Schedule delayed invalidation
      invalidationQueue.schedule(event, () => {
        executeInvalidation(rule, context);
      }, rule.delay);
    } else {
      // Immediate invalidation
      await executeInvalidation(rule, context);
    }
  }
}

/**
 * Create conversation-specific invalidation keys
 */
export function createConversationKeys(conversationId: string): string[] {
  return [
    `conversation:${conversationId}`,
    `messages:${conversationId}`,
    `/api/conversations/${conversationId}/messages`,
    `/api/conversations/${conversationId}`,
  ];
}

/**
 * Create model-specific invalidation keys
 */
export function createModelKeys(modelId: string): string[] {
  return [
    `model:${modelId}`,
    `contact:${modelId}`,
    `/api/models?id=${modelId}`,
  ];
}

/**
 * Create knowledge-specific invalidation keys
 */
export function createKnowledgeKeys(entryId: string): string[] {
  return [
    `knowledge:${entryId}`,
    `knowledge-entry:${entryId}`,
    `/api/knowledge?action=entry&id=${entryId}`,
  ];
}

/**
 * Debounced invalidation for rapid updates
 */
export function debouncedInvalidate(
  key: string,
  invalidateFn: () => Promise<void>,
  delay: number = 1000
): () => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(async () => {
      await invalidateFn();
      timeoutId = null;
    }, delay);
  };
}

/**
 * Batch invalidation for multiple operations
 */
export async function batchInvalidate(
  invalidations: Array<{ event: InvalidationEvent; context?: Record<string, any> }>
): Promise<void> {
  // Group by event to avoid duplicate invalidations
  const grouped = new Map<InvalidationEvent, Record<string, any>[]>();

  for (const inv of invalidations) {
    const existing = grouped.get(inv.event) || [];
    existing.push(inv.context || {});
    grouped.set(inv.event, existing);
  }

  // Execute invalidations
  for (const [event, contexts] of grouped) {
    await invalidateCache(event, contexts[0]); // Use first context
  }
}

/**
 * Invalidation hooks for common patterns
 */
export const CacheInvalidationHooks = {
  // After adding a message
  afterMessageAdd: (conversationId: string) =>
    invalidateCache('message-added', { conversationId }),

  // After updating a message
  afterMessageUpdate: (conversationId: string) =>
    invalidateCache('message-updated', { conversationId }),

  // After deleting a message
  afterMessageDelete: (conversationId: string) =>
    invalidateCache('message-deleted', { conversationId }),

  // After updating a conversation
  afterConversationUpdate: () =>
    invalidateCache('conversation-updated'),

  // After deleting a conversation
  afterConversationDelete: () =>
    invalidateCache('conversation-deleted'),

  // After updating models/contacts
  afterModelUpdate: () =>
    invalidateCache('model-updated'),

  // After deleting a model
  afterModelDelete: () =>
    invalidateCache('model-deleted'),

  // After knowledge sync
  afterKnowledgeSync: () =>
    invalidateCache('knowledge-synced'),

  // On user logout
  onLogout: () =>
    invalidateCache('user-logout'),
};
