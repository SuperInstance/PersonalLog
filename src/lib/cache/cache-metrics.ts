/**
 * Cache Metrics and Monitoring
 *
 * Tracks cache performance, hit rates, and effectiveness.
 */

interface CacheMetricsEvent {
  type: 'hit' | 'miss' | 'set' | 'delete' | 'invalidate';
  key: string;
  timestamp: number;
  size?: number;
  ttl?: number;
  tags?: string[];
  source?: 'memory' | 'indexeddb' | 'service-worker';
}

interface CacheMetricsSummary {
  totalHits: number;
  totalMisses: number;
  totalSets: number;
  totalDeletes: number;
  totalInvalidations: number;
  hitRate: number;
  averageResponseTime: number;
  totalSizeSaved: number;
  bandwidthSaved: number;
  byTag: Record<string, { hits: number; misses: number; hitRate: number }>;
  bySource: Record<string, { hits: number; misses: number }>;
}

class CacheMetricsCollector {
  private events: CacheMetricsEvent[] = [];
  private maxEvents = 10000; // Keep last 10k events
  private sessionStart = Date.now();
  private responseTimes: number[] = [];
  private maxResponseTimes = 1000; // Keep last 1k response times

  record(event: CacheMetricsEvent): void {
    this.events.push(event);

    // Trim old events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  recordResponseTime(time: number): void {
    this.responseTimes.push(time);

    if (this.responseTimes.length > this.maxResponseTimes) {
      this.responseTimes = this.responseTimes.slice(-this.maxResponseTimes);
    }
  }

  getMetrics(windowMs?: number): CacheMetricsSummary {
    const now = Date.now();
    const cutoff = windowMs ? now - windowMs : this.sessionStart;

    const relevantEvents = this.events.filter((e) => e.timestamp >= cutoff);

    const hits = relevantEvents.filter((e) => e.type === 'hit');
    const misses = relevantEvents.filter((e) => e.type === 'miss');
    const sets = relevantEvents.filter((e) => e.type === 'set');
    const deletes = relevantEvents.filter((e) => e.type === 'delete');
    const invalidates = relevantEvents.filter((e) => e.type === 'invalidate');

    const totalRequests = hits.length + misses.length;
    const hitRate = totalRequests > 0 ? hits.length / totalRequests : 0;

    // Calculate average response time
    const relevantResponseTimes = this.responseTimes.slice(-totalRequests);
    const avgResponseTime =
      relevantResponseTimes.length > 0
        ? relevantResponseTimes.reduce((a, b) => a + b, 0) / relevantResponseTimes.length
        : 0;

    // Calculate by tag
    const byTag: Record<string, { hits: number; misses: number; hitRate: number }> = {};

    hits.forEach((e) => {
      (e.tags || []).forEach((tag) => {
        if (!byTag[tag]) {
          byTag[tag] = { hits: 0, misses: 0, hitRate: 0 };
        }
        byTag[tag].hits++;
      });
    });

    misses.forEach((e) => {
      (e.tags || []).forEach((tag) => {
        if (!byTag[tag]) {
          byTag[tag] = { hits: 0, misses: 0, hitRate: 0 };
        }
        byTag[tag].misses++;
      });
    });

    Object.keys(byTag).forEach((tag) => {
      const tagHits = byTag[tag].hits;
      const tagMisses = byTag[tag].misses;
      byTag[tag].hitRate = tagHits + tagMisses > 0 ? tagHits / (tagHits + tagMisses) : 0;
    });

    // Calculate by source
    const bySource: Record<string, { hits: number; misses: number }> = {};

    hits.forEach((e) => {
      const source = e.source || 'unknown';
      if (!bySource[source]) {
        bySource[source] = { hits: 0, misses: 0 };
      }
      bySource[source].hits++;
    });

    misses.forEach((e) => {
      const source = e.source || 'unknown';
      if (!bySource[source]) {
        bySource[source] = { hits: 0, misses: 0 };
      }
      bySource[source].misses++;
    });

    // Estimate bandwidth saved (rough calculation)
    const avgResponseSize = 5000; // 5KB average response
    const bandwidthSaved = hits.length * avgResponseSize;

    // Estimate total size saved
    const totalSizeSaved = sets.reduce((sum, e) => sum + (e.size || 0), 0);

    return {
      totalHits: hits.length,
      totalMisses: misses.length,
      totalSets: sets.length,
      totalDeletes: deletes.length,
      totalInvalidations: invalidates.length,
      hitRate,
      averageResponseTime: avgResponseTime,
      totalSizeSaved,
      bandwidthSaved,
      byTag,
      bySource,
    };
  }

  clear(): void {
    this.events = [];
    this.responseTimes = [];
    this.sessionStart = Date.now();
  }

  export(): string {
    return JSON.stringify({
      events: this.events,
      responseTimes: this.responseTimes,
      sessionStart: this.sessionStart,
      exportDate: Date.now(),
    });
  }

  import(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.events = parsed.events || [];
      this.responseTimes = parsed.responseTimes || [];
      this.sessionStart = parsed.sessionStart || Date.now();
    } catch (error) {
      console.error('Failed to import metrics:', error);
    }
  }
}

// Global instance
const metricsCollector = new CacheMetricsCollector();

export function recordCacheEvent(event: CacheMetricsEvent): void {
  metricsCollector.record(event);
}

export function recordCacheResponseTime(time: number): void {
  metricsCollector.recordResponseTime(time);
}

export function getCacheMetrics(windowMs?: number): CacheMetricsSummary {
  return metricsCollector.getMetrics(windowMs);
}

export function clearCacheMetrics(): void {
  metricsCollector.clear();
}

export function exportCacheMetrics(): string {
  return metricsCollector.export();
}

export function importCacheMetrics(data: string): void {
  metricsCollector.import(data);
}

/**
 * Performance monitoring wrapper
 */
export function withCacheMetrics<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: { key?: string; tags?: string[]; source?: CacheMetricsEvent['source'] } = {}
): T {
  return (async (...args: any[]) => {
    const startTime = performance.now();

    try {
      const result = await fn(...args);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      recordCacheResponseTime(responseTime);
      recordCacheEvent({
        type: 'hit',
        key: options.key || 'unknown',
        timestamp: Date.now(),
        tags: options.tags,
        source: options.source,
      });

      return result;
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      recordCacheResponseTime(responseTime);
      recordCacheEvent({
        type: 'miss',
        key: options.key || 'unknown',
        timestamp: Date.now(),
        tags: options.tags,
        source: options.source,
      });

      throw error;
    }
  }) as T;
}

/**
 * Cache metrics display component data helper
 */
export function formatMetricsForDisplay(metrics: CacheMetricsSummary): {
  summary: Array<{ label: string; value: string; trend?: 'up' | 'down' | 'neutral' }>;
  breakdown: Array<{ category: string; value: string; percentage: number }>;
  recommendations: string[];
} {
  const hitRatePercent = (metrics.hitRate * 100).toFixed(1);
  const bandwidthSavedMB = (metrics.bandwidthSaved / (1024 * 1024)).toFixed(2);
  const avgResponseTimeMs = metrics.averageResponseTime.toFixed(0);

  const summary = [
    {
      label: 'Cache Hit Rate',
      value: `${hitRatePercent}%`,
      trend: (metrics.hitRate > 0.8 ? 'up' : metrics.hitRate < 0.5 ? 'down' : 'neutral') as any,
    },
    {
      label: 'Bandwidth Saved',
      value: `${bandwidthSavedMB} MB`,
      trend: 'up',
    },
    {
      label: 'Avg Response Time',
      value: `${avgResponseTimeMs} ms`,
      trend: metrics.averageResponseTime < 100 ? 'up' : 'neutral',
    },
    {
      label: 'Total Cache Hits',
      value: metrics.totalHits.toString(),
      trend: 'up',
    },
  ];

  const breakdown = Object.entries(metrics.byTag).map(([tag, data]) => ({
    category: tag,
    value: `${(data.hitRate * 100).toFixed(1)}%`,
    percentage: data.hitRate * 100,
  }));

  const recommendations: string[] = [];

  if (metrics.hitRate < 0.5) {
    recommendations.push('Cache hit rate is below 50%. Consider increasing TTL values.');
  }

  if (metrics.hitRate > 0.95) {
    recommendations.push('Cache hit rate is excellent! Consider if you can reduce cache size.');
  }

  if (metrics.averageResponseTime > 200) {
    recommendations.push('Average response time is high. Consider optimizing cache implementation.');
  }

  Object.entries(metrics.byTag).forEach(([tag, data]) => {
    if (data.hitRate < 0.3 && data.hits + data.misses > 100) {
      recommendations.push(
        `Tag "${tag}" has low hit rate. Review caching strategy for this data.`
      );
    }
  });

  return { summary, breakdown, recommendations };
}
