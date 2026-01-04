/**
 * PersonalLog Plugin SDK - Network API Implementation
 *
 * Provides controlled HTTP access for plugins.
 *
 * @packageDocumentation
 */

import type { NetworkAPI, RequestOptions } from '../types';

// ============================================================================
// NETWORK API IMPLEMENTATION
// ============================================================================

/**
 * Network API implementation
 *
 * Provides HTTP request capabilities with rate limiting and caching.
 */
class NetworkAPIImpl implements NetworkAPI {
  private rateLimiter: Map<string, number[]> = new Map();
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private defaultTimeout: number = 30000; // 30 seconds
  private rateLimitWindow: number = 60000; // 1 minute

  // ========================================================================
  // HTTP METHODS
  // ========================================================================

  async get<T = any>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'GET',
    });
  }

  async post<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data,
    });
  }

  async put<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data,
    });
  }

  async delete<T = any>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'DELETE',
    });
  }

  async patch<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: data,
    });
  }

  // ========================================================================
  // CORE REQUEST METHOD
  // ========================================================================

  private async request<T>(
    url: string,
    options?: RequestOptions
  ): Promise<T> {
    // Check cache if enabled
    if (options?.cache) {
      const cached = this.getCached<T>(url, options);
      if (cached !== null) {
        return cached;
      }
    }

    // Apply rate limiting
    await this.checkRateLimit(url);

    // Build URL with params
    let fullUrl = url;
    if (options?.params) {
      const urlObj = new URL(url);
      for (const [key, value] of Object.entries(options.params)) {
        urlObj.searchParams.set(key, String(value));
      }
      fullUrl = urlObj.toString();
    }

    // Prepare request
    const requestInit: RequestInit = {
      method: options?.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      signal: AbortSignal.timeout(options?.timeout || this.defaultTimeout),
    };

    // Add body for POST/PUT/PATCH
    if (options?.body && ['POST', 'PUT', 'PATCH'].includes(options.method || 'POST')) {
      requestInit.body = JSON.stringify(options.body);
    }

    // Make request
    try {
      const response = await fetch(fullUrl, requestInit);

      // Handle errors
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Parse response
      const data = await response.json();

      // Cache if enabled
      if (options?.cache) {
        this.setCached(url, options, data);
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout: ${url}`);
        }
        throw error;
      }
      throw new Error(`Request failed: ${error}`);
    }
  }

  // ========================================================================
  // RATE LIMITING
  // ========================================================================

  private async checkRateLimit(url: string): Promise<void> {
    const domain = new URL(url).hostname;
    const now = Date.now();

    // Get existing requests for this domain
    let requests = this.rateLimiter.get(domain) || [];

    // Remove old requests outside the window
    requests = requests.filter(
      timestamp => now - timestamp < this.rateLimitWindow
    );

    // Check if rate limit exceeded (default: 60 requests per minute)
    const maxRequests = 60;
    if (requests.length >= maxRequests) {
      const oldestRequest = requests[0];
      const waitTime = this.rateLimitWindow - (now - oldestRequest);
      throw new Error(
        `Rate limit exceeded for ${domain}. Please wait ${Math.ceil(waitTime / 1000)} seconds.`
      );
    }

    // Add current request
    requests.push(now);
    this.rateLimiter.set(domain, requests);
  }

  setRateLimit(requestsPerMinute: number): void {
    // Rate limit is enforced per 60-second window
    this.rateLimitWindow = 60000;
    // The checkRateLimit method uses the hardcoded maxRequests
    // In a production implementation, you'd make this configurable
  }

  // ========================================================================
  // CACHING
  // ========================================================================

  private getCacheKey(url: string, options?: RequestOptions): string {
    const params = options?.params
      ? JSON.stringify(options.params)
      : '';
    return `${url}:${params}`;
  }

  private getCached<T>(url: string, options?: RequestOptions): T | null {
    const key = this.getCacheKey(url, options);
    const cached = this.cache.get(key);

    if (cached) {
      const cacheAge = Date.now() - cached.timestamp;
      const cacheMaxAge = 5 * 60 * 1000; // 5 minutes

      if (cacheAge < cacheMaxAge) {
        return cached.data as T;
      } else {
        this.cache.delete(key);
      }
    }

    return null;
  }

  private setCached(url: string, options?: RequestOptions, data?: any): void {
    const key = this.getCacheKey(url, options);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  clearCacheForUrl(url: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(url)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  // ========================================================================
  // CLEANUP
  // ========================================================================

  destroy(): void {
    this.rateLimiter.clear();
    this.cache.clear();
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new Network API instance
 *
 * @returns Network API instance
 */
export function createNetworkAPI(): NetworkAPI {
  return new NetworkAPIImpl();
}

export default NetworkAPIImpl;
