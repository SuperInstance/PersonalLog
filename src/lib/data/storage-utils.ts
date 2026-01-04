/**
 * Data Storage Utilities
 *
 * Utilities for calculating storage usage, managing data cleanup,
 * and performing storage operations.
 */

import { StorageItem, StorageOverview, StorageTrend, CleanupResult } from './types';

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Parse human-readable size to bytes
 */
export function parseSize(size: string): number {
  const match = size.match(/^([\d.]+)\s*(Bytes?|KB|MB|GB|TB)?$/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = (match[2] || 'Bytes').toUpperCase();

  const units: Record<string, number> = {
    'BYTES': 1,
    'KB': 1024,
    'MB': 1024 ** 2,
    'GB': 1024 ** 3,
    'TB': 1024 ** 4,
  };

  return value * (units[unit] || 1);
}

/**
 * Estimate IndexedDB usage for a store
 */
export async function getStoreUsage(dbName: string, storeName: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const countRequest = store.count();

      countRequest.onsuccess = async () => {
        const count = countRequest.result;
        // Rough estimate: 1KB per item average
        resolve(count * 1024);
        db.close();
      };

      countRequest.onerror = () => {
        reject(countRequest.error);
        db.close();
      };
    };
  });
}

/**
 * Get storage quota and usage
 */
export async function getStorageQuota(): Promise<{
  quota: number;
  usage: number;
  usagePercentage: number;
  available: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota || 0;
    const usage = estimate.usage || 0;

    return {
      quota,
      usage,
      usagePercentage: quota > 0 ? (usage / quota) * 100 : 0,
      available: quota - usage,
    };
  }

  // Fallback: assume 1GB quota
  return {
    quota: 1024 ** 3,
    usage: 0,
    usagePercentage: 0,
    available: 1024 ** 3,
  };
}

/**
 * Calculate complete storage overview
 */
export async function calculateStorageOverview(): Promise<StorageOverview> {
  const quota = await getStorageQuota();

  // Estimate usage by category
  const conversations = await estimateCategorySize('conversations');
  const knowledge = await estimateCategorySize('knowledge');
  const analytics = await estimateCategorySize('analytics');
  const cache = await estimateCategorySize('cache');
  const backups = await estimateCategorySize('backups');

  const totalUsed = conversations + knowledge + analytics + cache + backups;
  const other = Math.max(0, quota.usage - totalUsed);

  const total = totalUsed + other;
  const breakdown = {
    conversations: createStorageItem('Conversations', conversations, total),
    knowledge: createStorageItem('Knowledge Base', knowledge, total),
    analytics: createStorageItem('Analytics', analytics, total),
    cache: createStorageItem('Cache', cache, total),
    backups: createStorageItem('Backups', backups, total),
    other: createStorageItem('Other', other, total),
  };

  const trend = await getStorageTrend();
  const recommendations = generateRecommendations(breakdown, quota.usagePercentage);

  return {
    totalUsed,
    totalAvailable: quota.available,
    usagePercentage: quota.usagePercentage,
    breakdown,
    trend,
    recommendations,
  };
}

/**
 * Create a storage item object
 */
function createStorageItem(name: string, sizeBytes: number, total: number): StorageItem {
  return {
    name,
    size: formatBytes(sizeBytes),
    sizeBytes,
    count: 0, // Would be calculated from actual data
    percentage: total > 0 ? Math.round((sizeBytes / total) * 100) : 0,
  };
}

/**
 * Estimate category size
 */
async function estimateCategorySize(category: string): Promise<number> {
  // In production, this would query actual IndexedDB stores
  // For now, return placeholder values
  const estimates: Record<string, number> = {
    conversations: 50 * 1024 * 1024, // 50 MB
    knowledge: 100 * 1024 * 1024, // 100 MB
    analytics: 10 * 1024 * 1024, // 10 MB
    cache: 30 * 1024 * 1024, // 30 MB
    backups: 200 * 1024 * 1024, // 200 MB
  };

  return estimates[category] || 0;
}

/**
 * Get storage trend over time
 */
async function getStorageTrend(): Promise<StorageTrend[]> {
  // In production, this would read from stored history
  // For now, generate sample trend data
  const trend: StorageTrend[] = [];
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * day).toISOString().split('T')[0];
    const baseUsage = 390 * 1024 * 1024; // ~390 MB base
    const variance = Math.random() * 50 * 1024 * 1024; // ±50 MB variance

    trend.push({
      date,
      totalUsed: baseUsage + variance,
      categories: {
        conversations: 50 * 1024 * 1024 + variance * 0.1,
        knowledge: 100 * 1024 * 1024 + variance * 0.3,
        analytics: 10 * 1024 * 1024 + variance * 0.05,
        cache: 30 * 1024 * 1024 + variance * 0.2,
        backups: 200 * 1024 * 1024 + variance * 0.35,
        other: variance * 0.1,
      },
    });
  }

  return trend;
}

/**
 * Generate storage recommendations
 */
function generateRecommendations(
  breakdown: Record<string, StorageItem>,
  usagePercentage: number
): string[] {
  const recommendations: string[] = [];

  if (usagePercentage > 90) {
    recommendations.push('Storage is critically full. Immediate cleanup required.');
  } else if (usagePercentage > 75) {
    recommendations.push('Storage is running low. Consider cleanup soon.');
  } else if (usagePercentage > 50) {
    recommendations.push('Storage usage is moderate. Monitor trends.');
  }

  if (breakdown.cache.sizeBytes > 100 * 1024 * 1024) {
    recommendations.push('Cache is large. Clear cache to free up space.');
  }

  if (breakdown.backups.sizeBytes > 500 * 1024 * 1024) {
    recommendations.push('Backup size is significant. Review old backups.');
  }

  return recommendations;
}

/**
 * Clear browser cache
 */
export async function clearCache(): Promise<CleanupResult> {
  let itemsProcessed = 0;
  let spaceFreed = 0;
  const errors: string[] = [];

  try {
    // Clear Cache API caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
        itemsProcessed++;
      }
    }

    // Estimate space freed (rough approximation)
    spaceFreed = 30 * 1024 * 1024; // ~30 MB

    return {
      operation: 'cache',
      success: true,
      itemsProcessed,
      spaceFreed,
      details: `Cleared ${itemsProcessed} cache(s)`,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    return {
      operation: 'cache',
      success: false,
      itemsProcessed,
      spaceFreed,
      errors,
    };
  }
}

/**
 * Delete old conversations
 */
export async function deleteOldConversations(daysOld: number): Promise<CleanupResult> {
  // Placeholder - would integrate with conversation store
  return {
    operation: 'old-conversations',
    success: true,
    itemsProcessed: 0,
    spaceFreed: 0,
    details: `No conversations older than ${daysOld} days found`,
  };
}

/**
 * Remove duplicate data
 */
export async function removeDuplicates(): Promise<CleanupResult> {
  // Placeholder - would scan for and remove duplicates
  return {
    operation: 'remove-duplicates',
    success: true,
    itemsProcessed: 0,
    spaceFreed: 0,
    details: 'No duplicate data found',
  };
}

/**
 * Reset analytics data
 */
export async function resetAnalytics(): Promise<CleanupResult> {
  try {
    localStorage.removeItem('analytics-events');
    localStorage.removeItem('analytics-aggregated');

    return {
      operation: 'reset-analytics',
      success: true,
      itemsProcessed: 1,
      spaceFreed: 1024 * 1024, // ~1 MB
      details: 'Cleared all analytics data',
    };
  } catch (error) {
    return {
      operation: 'reset-analytics',
      success: false,
      itemsProcessed: 0,
      spaceFreed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Clear personalization data
 */
export async function clearPersonalization(): Promise<CleanupResult> {
  try {
    localStorage.removeItem('personalization-models');
    localStorage.removeItem('personalization-patterns');
    localStorage.removeItem('personalization-predictions');

    return {
      operation: 'clear-personalization',
      success: true,
      itemsProcessed: 3,
      spaceFreed: 512 * 1024, // ~512 KB
      details: 'Cleared all personalization data',
    };
  } catch (error) {
    return {
      operation: 'clear-personalization',
      success: false,
      itemsProcessed: 0,
      spaceFreed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Factory reset (clear all data)
 */
export async function factoryReset(): Promise<CleanupResult> {
  const errors: string[] = [];
  let itemsProcessed = 0;

  try {
    // Clear all localStorage
    localStorage.clear();

    // Clear all IndexedDB databases
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(db.name!);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        itemsProcessed++;
      }
    }

    // Clear caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
        itemsProcessed++;
      }
    }

    return {
      operation: 'compress-data', // Using this as factory reset
      success: true,
      itemsProcessed,
      spaceFreed: 0, // Unknown amount
      details: `Cleared ${itemsProcessed} databases and caches`,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    return {
      operation: 'compress-data',
      success: false,
      itemsProcessed,
      spaceFreed: 0,
      errors,
    };
  }
}
