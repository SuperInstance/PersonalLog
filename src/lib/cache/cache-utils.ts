/**
 * Cache Utilities
 *
 * Provides utilities for HTTP caching, ETag generation, and cache control.
 */

import { NextResponse } from 'next/server';

/**
 * Cache configuration for different resource types
 */
export interface CacheConfig {
  /**
   * Max age in seconds for shared caches (CDNs, proxies)
   */
  sMaxAge?: number;

  /**
   * Max age in seconds for private caches (browsers)
   */
  maxAge?: number;

  /**
   * Whether the resource can be stored in shared caches
   */
  public?: boolean;

  /**
   * Whether the resource must not be cached
   */
  noStore?: boolean;

  /**
   * Whether the cache must validate the state before using stale copy
   */
  mustRevalidate?: boolean;

  /**
   * Whether to serve stale content while revalidating in background
   */
  staleWhileRevalidate?: number;

  /**
   * Whether the resource is immutable (never changes)
   */
  immutable?: boolean;

  /**
   * Cache tag for selective invalidation
   */
  tag?: string;
}

/**
 * Cache tags for different resource types
 */
export const CacheTags = {
  CONVERSATIONS: 'conversations',
  CONVERSATION: (id: string) => `conversation-${id}`,
  MESSAGES: (id: string) => `messages-${id}`,
  MODELS: 'models',
  CONTACTS: 'contacts',
  KNOWLEDGE: 'knowledge',
  KNOWLEDGE_ENTRY: (id: string) => `knowledge-entry-${id}`,
  CHECKPOINTS: 'checkpoints',
  USER_SETTINGS: 'user-settings',
} as const;

/**
 * Generate ETag from data
 * Uses MD5-like hash for simple implementation
 */
export function generateETag(data: string | object): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);

  // Simple hash function (for production, use crypto.subtle)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return `"${Math.abs(hash).toString(16)}"`;
}

/**
 * Generate Cache-Control header value from config
 */
export function generateCacheControl(config: CacheConfig): string {
  const directives: string[] = [];

  if (config.noStore) {
    directives.push('no-store');
    return directives.join(', ');
  }

  if (config.public) {
    directives.push('public');
  }

  if (config.sMaxAge !== undefined) {
    directives.push(`s-maxage=${config.sMaxAge}`);
  }

  if (config.maxAge !== undefined) {
    directives.push(`max-age=${config.maxAge}`);
  }

  if (config.mustRevalidate) {
    directives.push('must-revalidate');
  }

  if (config.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }

  if (config.immutable) {
    directives.push('immutable');
  }

  return directives.join(', ') || 'no-cache';
}

/**
 * Apply cache headers to NextResponse
 */
export function applyCacheHeaders(
  response: NextResponse,
  config: CacheConfig
): NextResponse {
  const cacheControl = generateCacheControl(config);

  response.headers.set('Cache-Control', cacheControl);

  if (config.tag) {
    response.headers.set('Cache-Tag', config.tag);
  }

  return response;
}

/**
 * Predefined cache configurations for different resource types
 */
export const CacheConfigs = {
  /**
   * Static assets - cache aggressively, immutable
   */
  staticAssets: {
    public: true,
    maxAge: 31536000, // 1 year
    immutable: true,
  } as CacheConfig,

  /**
   * API responses that rarely change (models, contacts)
   */
  rarelyChanging: {
    public: true,
    maxAge: 3600, // 1 hour
    sMaxAge: 600, // 10 minutes on CDN
    staleWhileRevalidate: 86400, // 1 day stale while revalidate
  } as CacheConfig,

  /**
   * API responses that change sometimes (conversations list)
   */
  sometimesChanging: {
    public: true,
    maxAge: 300, // 5 minutes
    sMaxAge: 60, // 1 minute on CDN
    staleWhileRevalidate: 3600, // 1 hour stale while revalidate
    mustRevalidate: true,
  } as CacheConfig,

  /**
   * API responses that change frequently (messages, knowledge search)
   */
  frequentlyChanging: {
    public: true,
    maxAge: 60, // 1 minute
    mustRevalidate: true,
  } as CacheConfig,

  /**
   * Personalized data - never cache publicly
   */
  personalized: {
    maxAge: 0,
    mustRevalidate: true,
  } as CacheConfig,

  /**
   * Dynamic data - never cache
   */
  dynamic: {
    noStore: true,
  } as CacheConfig,
} as const;

/**
 * Check if request has conditional headers (If-None-Match, If-Modified-Since)
 */
export function checkConditionalRequest(request: Request): {
  etag: string | null;
  modifiedSince: string | null;
} {
  return {
    etag: request.headers.get('If-None-Match'),
    modifiedSince: request.headers.get('If-Modified-Since'),
  };
}

/**
 * Create 304 Not Modified response if ETag matches
 */
export function createNotModifiedResponse(): NextResponse {
  return new NextResponse(null, { status: 304 });
}

/**
 * Calculate Last-Modified date from data
 */
export function getLastModified(data: { updatedAt?: string; createdAt?: string }): string {
  return data.updatedAt || data.createdAt || new Date().toISOString();
}
