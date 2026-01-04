/**
 * DevTools State Inspector
 *
 * Provides utilities for inspecting and manipulating application state.
 * Works with React state, plugin state, theme state, and custom state.
 *
 * @module lib/devtools/state
 */

import type { PluginId } from '../plugin/types';
import type { ThemeId } from '../theme/types';

// ============================================================================
// TYPES
// ============================================================================

export type StateScope = 'app' | 'plugin' | 'theme' | 'storage' | 'custom';

export interface StateSnapshot {
  /** Snapshot ID */
  id: string;

  /** Scope */
  scope: StateScope;

  /** Key */
  key: string;

  /** Value */
  value: any;

  /** Timestamp */
  timestamp: number;

  /** Type */
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'undefined';

  /** Size (bytes, approximate) */
  size?: number;
}

export interface StateDiff {
  /** Path */
  path: string;

  /** Old value */
  oldValue: any;

  /** New value */
  newValue: any;

  /** Change type */
  type: 'added' | 'removed' | 'modified' | 'moved';
}

export interface StateInspector {
  /** Scope */
  scope: StateScope;

  /** Identifier (e.g., plugin ID, theme ID) */
  identifier?: string;

  /** Get state */
  getState(): Promise<any>;

  /** Set state */
  setState?(value: any): Promise<void>;

  /** Get keys */
  getKeys?(): Promise<string[]>;

  /** Watch for changes */
  watch?(callback: (diff: StateDiff) => void): () => void;
}

// ============================================================================
// STATE INSPECTOR REGISTRY
// ============================================================================

class DevToolsStateInspector {
  private inspectors: Map<string, StateInspector> = new Map();
  private snapshots: StateSnapshot[] = [];
  private maxSnapshots = 100;
  private enabled = true;

  // ========================================================================
  // INSPECTOR REGISTRATION
  // ========================================================================

  /**
   * Register inspector
   */
  registerInspector(id: string, inspector: StateInspector): void {
    this.inspectors.set(id, inspector);
  }

  /**
   * Unregister inspector
   */
  unregisterInspector(id: string): void {
    this.inspectors.delete(id);
  }

  /**
   * Get inspector
   */
  getInspector(id: string): StateInspector | undefined {
    return this.inspectors.get(id);
  }

  /**
   * Get all inspectors
   */
  getInspectors(): StateInspector[] {
    return Array.from(this.inspectors.values());
  }

  /**
   * Get inspectors by scope
   */
  getInspectorsByScope(scope: StateScope): StateInspector[] {
    return Array.from(this.inspectors.values()).filter((insp) => insp.scope === scope);
  }

  // ========================================================================
  // STATE INSPECTION
  // ========================================================================

  /**
   * Get state from inspector
   */
  async inspectState(id: string): Promise<any> {
    const inspector = this.inspectors.get(id);
    if (!inspector) {
      throw new Error(`Inspector not found: ${id}`);
    }

    return await inspector.getState();
  }

  /**
   * Get all states
   */
  async inspectAllStates(): Promise<Record<string, any>> {
    const states: Record<string, any> = {};

    for (const [id, inspector] of this.inspectors) {
      try {
        states[id] = await inspector.getState();
      } catch (error) {
        states[id] = { error: error instanceof Error ? error.message : String(error) };
      }
    }

    return states;
  }

  /**
   * Set state
   */
  async setState(id: string, value: any): Promise<void> {
    const inspector = this.inspectors.get(id);
    if (!inspector) {
      throw new Error(`Inspector not found: ${id}`);
    }

    if (!inspector.setState) {
      throw new Error(`Inspector does not support setting state: ${id}`);
    }

    await inspector.setState(value);
  }

  // ========================================================================
  // SNAPSHOTS
  // ========================================================================

  /**
   * Take snapshot
   */
  async takeSnapshot(id: string, key?: string): Promise<StateSnapshot> {
    const inspector = this.inspectors.get(id);
    if (!inspector) {
      throw new Error(`Inspector not found: ${id}`);
    }

    const value = key ? (await inspector.getState())?.[key] : await inspector.getState();

    const snapshot: StateSnapshot = {
      id: this.generateId(),
      scope: inspector.scope,
      key: key || id,
      value,
      timestamp: Date.now(),
      type: this.getValueType(value),
      size: this.estimateSize(value),
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
  getSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get snapshots by scope
   */
  getSnapshotsByScope(scope: StateScope): StateSnapshot[] {
    return this.snapshots.filter((s) => s.scope === scope);
  }

  /**
   * Get snapshots by key
   */
  getSnapshotsByKey(key: string): StateSnapshot[] {
    return this.snapshots.filter((s) => s.key === key);
  }

  /**
   * Clear snapshots
   */
  clearSnapshots(): void {
    this.snapshots = [];
  }

  /**
   * Restore from snapshot
   */
  async restoreFromSnapshot(snapshotId: string): Promise<void> {
    const snapshot = this.snapshots.find((s) => s.id === snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    // Find inspector
    const inspector = Array.from(this.inspectors.values()).find(
      (insp) => insp.scope === snapshot.scope
    );

    if (!inspector) {
      throw new Error(`No inspector found for scope: ${snapshot.scope}`);
    }

    if (!inspector.setState) {
      throw new Error(`Cannot restore state - inspector does not support setting state`);
    }

    await inspector.setState(snapshot.value);
  }

  // ========================================================================
  // STATE DIFFING
  // ========================================================================

  /**
   * Compare two states
   */
  compare(oldState: any, newState: any, path: string = ''): StateDiff[] {
    const diffs: StateDiff[] = [];

    if (oldState === newState) {
      return diffs;
    }

    const oldType = this.getValueType(oldState);
    const newType = this.getValueType(newState);

    if (oldType !== newType) {
      diffs.push({
        path: path || 'root',
        oldValue: oldState,
        newValue: newState,
        type: 'modified',
      });
      return diffs;
    }

    if (newType === 'object' && oldState && newState) {
      const allKeys = new Set([...Object.keys(oldState), ...Object.keys(newState)]);

      for (const key of allKeys) {
        const keyPath = path ? `${path}.${key}` : key;

        if (!(key in oldState)) {
          diffs.push({
            path: keyPath,
            oldValue: undefined,
            newValue: newState[key],
            type: 'added',
          });
        } else if (!(key in newState)) {
          diffs.push({
            path: keyPath,
            oldValue: oldState[key],
            newValue: undefined,
            type: 'removed',
          });
        } else {
          diffs.push(...this.compare(oldState[key], newState[key], keyPath));
        }
      }
    } else if (newType === 'array' && Array.isArray(oldState) && Array.isArray(newState)) {
      const maxLength = Math.max(oldState.length, newState.length);

      for (let i = 0; i < maxLength; i++) {
        const itemPath = `${path}[${i}]`;

        if (i >= oldState.length) {
          diffs.push({
            path: itemPath,
            oldValue: undefined,
            newValue: newState[i],
            type: 'added',
          });
        } else if (i >= newState.length) {
          diffs.push({
            path: itemPath,
            oldValue: oldState[i],
            newValue: undefined,
            type: 'removed',
          });
        } else {
          diffs.push(...this.compare(oldState[i], newState[i], itemPath));
        }
      }
    } else if (oldState !== newState) {
      diffs.push({
        path: path || 'root',
        oldValue: oldState,
        newValue: newState,
        type: 'modified',
      });
    }

    return diffs;
  }

  /**
   * Compare snapshots
   */
  compareSnapshots(snapshotId1: string, snapshotId2: string): StateDiff[] {
    const snapshot1 = this.snapshots.find((s) => s.id === snapshotId1);
    const snapshot2 = this.snapshots.find((s) => s.id === snapshotId2);

    if (!snapshot1 || !snapshot2) {
      throw new Error('One or both snapshots not found');
    }

    return this.compare(snapshot1.value, snapshot2.value);
  }

  // ========================================================================
  // ENABLE/DISABLE
  // ========================================================================

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  private generateId(): string {
    return `state_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getValueType(value: any): StateSnapshot['type'] {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    return typeof value as 'object' | 'array' | 'string' | 'number' | 'boolean';
  }

  private estimateSize(value: any): number {
    return JSON.stringify(value).length * 2; // Approximate bytes (2 bytes per char)
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let stateInspectorInstance: DevToolsStateInspector | null = null;

export function getDevToolsStateInspector(): DevToolsStateInspector {
  if (!stateInspectorInstance) {
    stateInspectorInstance = new DevToolsStateInspector();
  }
  return stateInspectorInstance;
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const stateInspector = getDevToolsStateInspector();

export const registerInspector = (id: string, inspector: StateInspector) =>
  stateInspector.registerInspector(id, inspector);

export const inspectState = async (id: string) => stateInspector.inspectState(id);

export const takeSnapshot = async (id: string, key?: string) => stateInspector.takeSnapshot(id, key);
