/**
 * Documentation Preloading Module
 *
 * Exports all preloading functionality for reducing agent ramp-up time.
 *
 * **Main Exports:**
 * - `DocCache` - IndexedDB-based document cache
 * - `DocsPreloader` - Intelligent document preloader
 * - `getDocCache()` - Get global cache instance
 * - `getDocsPreloader()` - Get global preloader instance
 *
 * **Usage:**
 * ```typescript
 * import { getDocsPreloader } from '@/lib/preload';
 *
 * const preloader = getDocsPreloader();
 *
 * // Preload for predicted agent
 * const result = await preloader.preloadDocs(AgentCategory.ANALYSIS);
 * console.log(`Preloaded ${result.fetched} docs, ${result.fromCache} from cache`);
 * ```
 */

export {
  DocCache,
  getDocCache,
  resetDocCache,
  type CacheEntry,
  type CacheStats,
  type CacheConfig,
} from './doc-cache';

export {
  DocsPreloader,
  getDocsPreloader,
  resetDocsPreloader,
  type DocEntry,
  type PreloadStatus,
  type PreloadResult,
  type PreloadConfig,
} from './docs-preloader';
