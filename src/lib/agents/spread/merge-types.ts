/**
 * Auto-Merge Engine Type Definitions
 *
 * Provides types for conflict detection, merge strategies, and resolution.
 */

import { SessionSchema } from '../spreader/types';

/**
 * Result from a child conversation that needs to be merged
 */
export interface ChildResult {
  taskId: string;
  conversationId: string;
  summary?: string;
  schema: Partial<SessionSchema>;
  content?: any[];
  timestamp: number;
}

/**
 * A merge conflict that needs resolution
 */
export interface MergeConflict {
  id: string;
  type: 'schema' | 'content' | 'contradiction';
  severity: 'critical' | 'warning' | 'info';
  location: string;
  description: string;
  options: string[];
  suggestions: string[];
  parentValue?: any;
  childValue?: any;
}

/**
 * Result of a merge operation
 */
export interface MergeResult {
  success: boolean;
  merged: {
    schema: Partial<SessionSchema>;
    content?: any[];
  };
  conflicts: MergeConflict[];
  conflictsResolved: number;
  requiredUserInput: boolean;
  errorMessage?: string;
}

/**
 * Merge strategy interface
 */
export interface MergeStrategy {
  name: string;
  description: string;
  canAutoMerge(conflicts: MergeConflict[]): boolean;
  merge(
    parent: any,
    child: ChildResult,
    conflicts: MergeConflict[]
  ): Promise<MergeResult>;
}

/**
 * Options for merge operation
 */
export interface MergeOptions {
  strategy?: MergeStrategy;
  autoResolveThreshold?: 'critical' | 'warning' | 'info';
  preferParent?: boolean;
  notifyUser?: boolean;
}

/**
 * Conflict resolution chosen by user
 */
export interface ConflictResolution {
  conflictId: string;
  resolution: string;
  customValue?: any;
}
