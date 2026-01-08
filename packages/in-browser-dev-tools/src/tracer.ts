/**
 * DevTools Tracer - Performance Tracing
 *
 * Provides performance measurement utilities including render timing,
 * execution timing, and memory profiling.
 *
 * @module tracer
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TraceSpan {
  /** Span ID */
  id: string;

  /** Span name */
  name: string;

  /** Parent span ID */
  parentId?: string;

  /** Start timestamp */
  startTime: number;

  /** End timestamp */
  endTime?: number;

  /** Duration (ms) */
  duration?: number;

  /** Span category */
  category: TraceCategory;

  /** Additional metadata */
  metadata?: Record<string, any>;

  /** Status */
  status: 'pending' | 'completed' | 'error';

  /** Error message (if errored) */
  error?: string;
}

export type TraceCategory =
  | 'render'
  | 'api'
  | 'plugin'
  | 'theme'
  | 'storage'
  | 'computation'
  | 'network'
  | 'custom';

export interface TraceMetrics {
  /** Total spans */
  totalSpans: number;

  /** Completed spans */
  completedSpans: number;

  /** Pending spans */
  pendingSpans: number;

  /** Errored spans */
  erroredSpans: number;

  /** Average duration (ms) */
  avgDuration: number;

  /** Min duration (ms) */
  minDuration: number;

  /** Max duration (ms) */
  maxDuration: number;

  /** Total duration (ms) */
  totalDuration: number;

  /** Spans by category */
  byCategory: Record<TraceCategory, number>;

  /** Spans by status */
  byStatus: Record<string, number>;
}

export interface PerformanceSnapshot {
  /** Timestamp */
  timestamp: number;

  /** Memory usage (MB) */
  memoryUsedMB: number;

  /** Memory limit (MB) */
  memoryLimitMB?: number;

  /** JS heap size (MB) */
  jsHeapSizeMB: number;

  /** FPS */
  fps?: number;

  /** Custom metrics */
  customMetrics?: Record<string, number>;
}

// ============================================================================
// TRACER CLASS
// ============================================================================

class DevToolsTracer {
  private spans: Map<string, TraceSpan> = new Map();
  private rootSpans: Set<string> = new Set();
  private snapshots: PerformanceSnapshot[] = [];
  private maxSnapshots = 100;
  private enabled = true;

  // ========================================================================
  // SPAN MANAGEMENT
  // ========================================================================

  /**
   * Start a new span
   */
  startSpan(name: string, category: TraceCategory, parentId?: string, metadata?: Record<string, any>): string {
    if (!this.enabled) {
      return '';
    }

    const id = this.generateId();
    const span: TraceSpan = {
      id,
      name,
      parentId,
      startTime: performance.now(),
      category,
      metadata,
      status: 'pending',
    };

    this.spans.set(id, span);

    if (!parentId) {
      this.rootSpans.add(id);
    }

    return id;
  }

  /**
   * End a span
   */
  endSpan(id: string, error?: string): void {
    const span = this.spans.get(id);
    if (!span || span.endTime) {
      return;
    }

    span.endTime = performance.now();
    span.duration = span.endTime - span.startTime;
    span.status = error ? 'error' : 'completed';

    if (error) {
      span.error = error;
    }
  }

  /**
   * Get span
   */
  getSpan(id: string): TraceSpan | undefined {
    return this.spans.get(id);
  }

  /**
   * Get all spans
   */
  getSpans(): TraceSpan[] {
    return Array.from(this.spans.values());
  }

  /**
   * Get root spans
   */
  getRootSpans(): TraceSpan[] {
    return Array.from(this.rootSpans).map((id) => this.spans.get(id)!).filter(Boolean);
  }

  /**
   * Get child spans
   */
  getChildSpans(parentId: string): TraceSpan[] {
    return Array.from(this.spans.values()).filter((span) => span.parentId === parentId);
  }

  /**
   * Get span tree
   */
  getSpanTree(): (TraceSpan & { children: TraceSpan[] })[] {
    const buildTree = (parentId?: string): (TraceSpan & { children: TraceSpan[] })[] => {
      const children = Array.from(this.spans.values())
        .filter((span) => span.parentId === parentId)
        .map((span) => ({
          ...span,
          children: buildTree(span.id),
        }));

      return children.sort((a, b) => a.startTime - b.startTime);
    };

    return buildTree();
  }

  /**
   * Clear all spans
   */
  clearSpans(): void {
    this.spans.clear();
    this.rootSpans.clear();
  }

  // ========================================================================
  // METRICS
  // ========================================================================

  /**
   * Calculate metrics
   */
  calculateMetrics(): TraceMetrics {
    const spans = Array.from(this.spans.values());
    const completed = spans.filter((s) => s.status === 'completed' && s.duration !== undefined);

    const durations = completed.map((s) => s.duration!);
    const byCategory: Partial<Record<TraceCategory, number>> = {};
    const byStatus: Record<string, number> = {};

    for (const span of spans) {
      byCategory[span.category] = (byCategory[span.category] || 0) + 1;
      byStatus[span.status] = (byStatus[span.status] || 0) + 1;
    }

    return {
      totalSpans: spans.length,
      completedSpans: completed.length,
      pendingSpans: spans.filter((s) => s.status === 'pending').length,
      erroredSpans: spans.filter((s) => s.status === 'error').length,
      avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      totalDuration: durations.reduce((a, b) => a + b, 0),
      byCategory: byCategory as Record<TraceCategory, number>,
      byStatus,
    };
  }

  /**
   * Get spans by category
   */
  getSpansByCategory(category: TraceCategory): TraceSpan[] {
    return Array.from(this.spans.values()).filter((span) => span.category === category);
  }

  /**
   * Get slowest spans
   */
  getSlowestSpans(limit: number = 10): TraceSpan[] {
    return Array.from(this.spans.values())
      .filter((span) => span.status === 'completed' && span.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, limit);
  }

  // ========================================================================
  // PERFORMANCE SNAPSHOTS
  // ========================================================================

  /**
   * Take performance snapshot
   */
  takeSnapshot(customMetrics?: Record<string, number>): PerformanceSnapshot | undefined {
    if (!this.enabled) {
      return undefined;
    }

    // Check if performance.memory is available (Chrome only)
    const memory = (performance as any).memory;

    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      memoryUsedMB: memory ? memory.usedJSHeapSize / 1024 / 1024 : 0,
      memoryLimitMB: memory ? memory.jsHeapSizeLimit / 1024 / 1024 : undefined,
      jsHeapSizeMB: memory ? memory.totalJSHeapSize / 1024 / 1024 : 0,
      customMetrics,
    };

    this.snapshots.push(snapshot);

    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Get snapshots
   */
  getSnapshots(): PerformanceSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Clear snapshots
   */
  clearSnapshots(): void {
    this.snapshots = [];
  }

  /**
   * Get memory trend
   */
  getMemoryTrend(): Array<{ timestamp: number; usedMB: number }> {
    return this.snapshots.map((s) => ({
      timestamp: s.timestamp,
      usedMB: s.memoryUsedMB,
    }));
  }

  // ========================================================================
  // CONVENIENCE METHODS
  // ========================================================================

  /**
   * Trace async function
   */
  async trace<T>(
    name: string,
    category: TraceCategory,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const id = this.startSpan(name, category, undefined, metadata);

    try {
      const result = await fn();
      this.endSpan(id);
      return result;
    } catch (error) {
      this.endSpan(id, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Trace sync function
   */
  traceSync<T>(
    name: string,
    category: TraceCategory,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const id = this.startSpan(name, category, undefined, metadata);

    try {
      const result = fn();
      this.endSpan(id);
      return result;
    } catch (error) {
      this.endSpan(id, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Measure render time
   */
  measureRender(componentName: string, renderFn: () => void): void {
    const id = this.startSpan(`render: ${componentName}`, 'render');
    renderFn();
    this.endSpan(id);
  }

  // ========================================================================
  // ENABLE/DISABLE
  // ========================================================================

  /**
   * Set enabled
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export traces
   */
  exportTraces(): string {
    return JSON.stringify(
      {
        spans: Array.from(this.spans.values()),
        snapshots: this.snapshots,
        exportedAt: Date.now(),
      },
      null,
      2
    );
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let tracerInstance: DevToolsTracer | null = null;

export function getDevToolsTracer(): DevToolsTracer {
  if (!tracerInstance) {
    tracerInstance = new DevToolsTracer();
  }
  return tracerInstance;
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const tracer = getDevToolsTracer();

export const startSpan = (name: string, category: TraceCategory, parentId?: string, metadata?: Record<string, any>) =>
  tracer.startSpan(name, category, parentId, metadata);

export const endSpan = (id: string, error?: string) => tracer.endSpan(id);

export const trace = async <T>(
  name: string,
  category: TraceCategory,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> => tracer.trace(name, category, fn, metadata);

export const traceSync = <T>(
  name: string,
  category: TraceCategory,
  fn: () => T,
  metadata?: Record<string, any>
): T => tracer.traceSync(name, category, fn, metadata);
