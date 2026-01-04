/**
 * Extension Registry
 *
 * Central registry for managing extensions across all extension points.
 * Handles registration, storage, retrieval, and lifecycle management.
 *
 * @module lib/extensions/registry
 */

import type {
  Extension,
  ExtensionId,
  ExtensionPoint,
  ExtensionRuntimeState,
  ExtensionRegistryEntry,
  ExtensionRegistrationOptions,
} from './types';
import { ExtensionState } from './types';

// ============================================================================
// EXTENSION REGISTRY CLASS
// ============================================================================

export class ExtensionRegistry {
  private extensions: Map<ExtensionId, ExtensionRegistryEntry> = new Map();
  private byPoint: Map<ExtensionPoint, Set<ExtensionId>> = new Map();
  private byPlugin: Map<string, Set<ExtensionId>> = new Map();

  // ========================================================================
  // REGISTRATION
  // ========================================================================

  /**
   * Register an extension
   */
  register(
    extension: Extension,
    options: ExtensionRegistrationOptions = {}
  ): ExtensionRegistryEntry {
    const existing = this.extensions.get(extension.id);

    if (existing) {
      throw new Error(`Extension already registered: ${extension.id}`);
    }

    // Create runtime state
    const runtime: ExtensionRuntimeState = {
      id: extension.id,
      state: ExtensionState.REGISTERED,
      enabled: options.autoActivate !== false,
      activationCount: 0,
      executionCount: 0,
      errorCount: 0,
      avgExecutionTime: 0,
      errors: [],
      metadata: {},
    };

    // Create registry entry
    const entry: ExtensionRegistryEntry = {
      extension,
      runtime,
      options: {
        autoActivate: true,
        priority: extension.priority,
        dependencies: [],
        settings: {},
        ...options,
      },
      registeredAt: Date.now(),
    };

    // Store extension
    this.extensions.set(extension.id, entry);

    // Index by point
    if (!this.byPoint.has(extension.point)) {
      this.byPoint.set(extension.point, new Set());
    }
    this.byPoint.get(extension.point)!.add(extension.id);

    // Index by plugin
    if (!this.byPlugin.has(extension.pluginId)) {
      this.byPlugin.set(extension.pluginId, new Set());
    }
    this.byPlugin.get(extension.pluginId)!.add(extension.id);

    return entry;
  }

  /**
   * Unregister an extension
   */
  unregister(extensionId: ExtensionId): boolean {
    const entry = this.extensions.get(extensionId);

    if (!entry) {
      return false;
    }

    // Deactivate if active
    if (entry.runtime.state === 'active') {
      this.deactivate(extensionId);
    }

    // Remove from indexes
    this.byPoint.get(entry.extension.point)?.delete(extensionId);
    this.byPlugin.get(entry.extension.pluginId)?.delete(extensionId);

    // Remove extension
    this.extensions.delete(extensionId);

    return true;
  }

  /**
   * Unregister all extensions from a plugin
   */
  unregisterByPlugin(pluginId: string): number {
    const extensionIds = this.byPlugin.get(pluginId);

    if (!extensionIds) {
      return 0;
    }

    let count = 0;
    for (const extensionId of extensionIds) {
      if (this.unregister(extensionId)) {
        count++;
      }
    }

    return count;
  }

  // ========================================================================
  // RETRIEVAL
  // ========================================================================

  /**
   * Get extension by ID
   */
  get(extensionId: ExtensionId): ExtensionRegistryEntry | undefined {
    return this.extensions.get(extensionId);
  }

  /**
   * Check if extension exists
   */
  has(extensionId: ExtensionId): boolean {
    return this.extensions.has(extensionId);
  }

  /**
   * Get all extensions
   */
  getAll(): ExtensionRegistryEntry[] {
    return Array.from(this.extensions.values());
  }

  /**
   * Get extensions by point
   */
  getByPoint(point: ExtensionPoint): ExtensionRegistryEntry[] {
    const extensionIds = this.byPoint.get(point);

    if (!extensionIds) {
      return [];
    }

    return Array.from(extensionIds)
      .map((id) => this.extensions.get(id)!)
      .filter((entry) => entry.runtime.enabled);
  }

  /**
   * Get extensions by plugin
   */
  getByPlugin(pluginId: string): ExtensionRegistryEntry[] {
    const extensionIds = this.byPlugin.get(pluginId);

    if (!extensionIds) {
      return [];
    }

    return Array.from(extensionIds)
      .map((id) => this.extensions.get(id)!)
      .filter((entry) => entry.runtime.enabled);
  }

  /**
   * Get extensions by state
   */
  getByState(state: ExtensionState): ExtensionRegistryEntry[] {
    return Array.from(this.extensions.values()).filter(
      (entry) => entry.runtime.state === state
    );
  }

  /**
   * Get active extensions for a point (sorted by priority)
   */
  getActive(point: ExtensionPoint): ExtensionRegistryEntry[] {
    const extensions = this.getByPoint(point);
    return extensions
      .filter((entry) => entry.runtime.state === 'active')
      .sort((a, b) => a.extension.priority - b.extension.priority);
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  /**
   * Activate an extension
   */
  activate(extensionId: ExtensionId): boolean {
    const entry = this.extensions.get(extensionId);

    if (!entry) {
      throw new Error(`Extension not found: ${extensionId}`);
    }

    if (!entry.runtime.enabled) {
      return false;
    }

    if (entry.runtime.state === 'active') {
      return true;
    }

    // Check dependencies
    const deps = entry.options.dependencies || [];
    for (const depId of deps) {
      const depEntry = this.extensions.get(depId);
      if (!depEntry || depEntry.runtime.state !== 'active') {
        throw new Error(
          `Extension dependency not active: ${depId} (required by ${extensionId})`
        );
      }
    }

    // Update state
    entry.runtime.state = 'active' as ExtensionState;
    entry.runtime.activationCount++;
    entry.runtime.lastExecution = Date.now();

    return true;
  }

  /**
   * Deactivate an extension
   */
  deactivate(extensionId: ExtensionId): boolean {
    const entry = this.extensions.get(extensionId);

    if (!entry || entry.runtime.state !== 'active') {
      return false;
    }

    entry.runtime.state = 'registered' as ExtensionState;
    return true;
  }

  /**
   * Enable an extension
   */
  enable(extensionId: ExtensionId): boolean {
    const entry = this.extensions.get(extensionId);

    if (!entry) {
      return false;
    }

    entry.runtime.enabled = true;

    // Auto-activate if enabled
    if (entry.options.autoActivate !== false) {
      this.activate(extensionId);
    }

    return true;
  }

  /**
   * Disable an extension
   */
  disable(extensionId: ExtensionId): boolean {
    const entry = this.extensions.get(extensionId);

    if (!entry) {
      return false;
    }

    // Deactivate first
    this.deactivate(extensionId);

    entry.runtime.enabled = false;
    return true;
  }

  // ========================================================================
  // EXECUTION TRACKING
  // ========================================================================

  /**
   * Record extension execution
   */
  recordExecution(
    extensionId: ExtensionId,
    executionTime: number,
    success: boolean,
    error?: string
  ): void {
    const entry = this.extensions.get(extensionId);

    if (!entry) {
      return;
    }

    entry.runtime.executionCount++;
    entry.runtime.lastExecution = Date.now();

    // Update average execution time
    const currentAvg = entry.runtime.avgExecutionTime;
    const count = entry.runtime.executionCount;
    entry.runtime.avgExecutionTime =
      (currentAvg * (count - 1) + executionTime) / count;

    if (!success) {
      entry.runtime.errorCount++;
    }

    if (error) {
      entry.runtime.errors.push({
        id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'execution',
        message: error,
        stack: new Error().stack,
      });

      // Keep only last 100 errors
      if (entry.runtime.errors.length > 100) {
        entry.runtime.errors.shift();
      }
    }
  }

  /**
   * Clear extension errors
   */
  clearErrors(extensionId: ExtensionId): boolean {
    const entry = this.extensions.get(extensionId);

    if (!entry) {
      return false;
    }

    entry.runtime.errors = [];
    return true;
  }

  // ========================================================================
  // QUERIES
  // ========================================================================

  /**
   * Get extension count
   */
  count(): number {
    return this.extensions.size;
  }

  /**
   * Get extension count by point
   */
  countByPoint(point: ExtensionPoint): number {
    return this.byPoint.get(point)?.size || 0;
  }

  /**
   * Get extension count by plugin
   */
  countByPlugin(pluginId: string): number {
    return this.byPlugin.get(pluginId)?.size || 0;
  }

  /**
   * Get active extension count
   */
  activeCount(): number {
    return Array.from(this.extensions.values()).filter(
      (entry) => entry.runtime.state === 'active'
    ).length;
  }

  /**
   * Check if plugin has extensions
   */
  pluginHasExtensions(pluginId: string): boolean {
    return this.byPlugin.has(pluginId) && this.byPlugin.get(pluginId)!.size > 0;
  }

  /**
   * Get all extension points
   */
  getPoints(): ExtensionPoint[] {
    return Array.from(this.byPoint.keys());
  }

  /**
   * Get all plugin IDs with extensions
   */
  getPluginIds(): string[] {
    return Array.from(this.byPlugin.keys());
  }

  // ========================================================================
  // VALIDATION
  // ========================================================================

  /**
   * Validate extension dependencies
   */
  validateDependencies(extensionId: ExtensionId): {
    valid: boolean;
    missing: ExtensionId[];
    inactive: ExtensionId[];
  } {
    const entry = this.extensions.get(extensionId);

    if (!entry) {
      return { valid: false, missing: [extensionId], inactive: [] };
    }

    const deps = entry.options.dependencies || [];
    const missing: ExtensionId[] = [];
    const inactive: ExtensionId[] = [];

    for (const depId of deps) {
      const depEntry = this.extensions.get(depId);
      if (!depEntry) {
        missing.push(depId);
      } else if (depEntry.runtime.state !== 'active') {
        inactive.push(depId);
      }
    }

    return {
      valid: missing.length === 0 && inactive.length === 0,
      missing,
      inactive,
    };
  }

  /**
   * Detect circular dependencies
   */
  detectCircularDependencies(extensionId: ExtensionId): ExtensionId[][] {
    const circles: ExtensionId[][] = [];
    const visited = new Set<ExtensionId>();
    const path: ExtensionId[] = [];

    const dfs = (id: ExtensionId): boolean => {
      if (path.includes(id)) {
        // Found a cycle
        const cycleStart = path.indexOf(id);
        circles.push([...path.slice(cycleStart), id]);
        return true;
      }

      if (visited.has(id)) {
        return false;
      }

      visited.add(id);
      path.push(id);

      const entry = this.extensions.get(id);
      const deps = entry?.options.dependencies || [];

      for (const depId of deps) {
        if (dfs(depId)) {
          return true;
        }
      }

      path.pop();
      return false;
    };

    dfs(extensionId);
    return circles;
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Clear all extensions
   */
  clear(): void {
    // Deactivate all active extensions
    for (const entry of this.extensions.values()) {
      if (entry.runtime.state === 'active') {
        this.deactivate(entry.extension.id);
      }
    }

    this.extensions.clear();
    this.byPoint.clear();
    this.byPlugin.clear();
  }

  /**
   * Export registry state
   */
  exportState(): {
    extensions: Array<{
      extension: Extension;
      runtime: ExtensionRuntimeState;
      options: ExtensionRegistrationOptions;
    }>;
  } {
    return {
      extensions: Array.from(this.extensions.values()).map((entry) => ({
        extension: entry.extension,
        runtime: entry.runtime,
        options: entry.options,
      })),
    };
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total: number;
    active: number;
    inactive: number;
    byPoint: Record<string, number>;
    byPlugin: Record<string, number>;
    totalExecutions: number;
    totalErrors: number;
  } {
    const byPoint: Record<string, number> = {};
    const byPlugin: Record<string, number> = {};

    for (const point of this.byPoint.keys()) {
      byPoint[point] = this.byPoint.get(point)!.size;
    }

    for (const pluginId of this.byPlugin.keys()) {
      byPlugin[pluginId] = this.byPlugin.get(pluginId)!.size;
    }

    let totalExecutions = 0;
    let totalErrors = 0;

    for (const entry of this.extensions.values()) {
      totalExecutions += entry.runtime.executionCount;
      totalErrors += entry.runtime.errorCount;
    }

    return {
      total: this.extensions.size,
      active: this.activeCount(),
      inactive: this.extensions.size - this.activeCount(),
      byPoint,
      byPlugin,
      totalExecutions,
      totalErrors,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let registryInstance: ExtensionRegistry | null = null;

/**
 * Get extension registry instance
 */
export function getExtensionRegistry(): ExtensionRegistry {
  if (!registryInstance) {
    registryInstance = new ExtensionRegistry();
  }
  return registryInstance;
}

/**
 * Reset extension registry (mainly for testing)
 */
export function resetExtensionRegistry(): void {
  registryInstance = null;
}
