/**
 * Merge Strategies
 *
 * Defines various strategies for merging child results into parent conversations.
 */

import { SessionSchema } from '../spreader/types';
import {
  ChildResult,
  MergeConflict,
  MergeResult,
  MergeStrategy,
} from './merge-types';

/**
 * Auto-merge strategy - merges when no critical conflicts exist
 */
export class AutoMergeStrategy implements MergeStrategy {
  name = 'auto-merge';
  description = 'Automatically merge if no critical conflicts detected';

  canAutoMerge(conflicts: MergeConflict[]): boolean {
    // Auto-merge if no critical or warning conflicts
    return !conflicts.some(c => c.severity === 'critical' || c.severity === 'warning');
  }

  async merge(
    parent: any,
    child: ChildResult,
    conflicts: MergeConflict[]
  ): Promise<MergeResult> {
    try {
      const mergedSchema = this.mergeSchemas(parent.schema || {}, child.schema);
      const mergedContent = this.mergeContent(
        parent.content || [],
        child.content || []
      );

      return {
        success: true,
        merged: {
          schema: mergedSchema,
          content: mergedContent,
        },
        conflicts,
        conflictsResolved: conflicts.length,
        requiredUserInput: false,
      };
    } catch (error) {
      return {
        success: false,
        merged: { schema: {}, content: [] },
        conflicts,
        conflictsResolved: 0,
        requiredUserInput: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  protected mergeSchemas(
    parent: Partial<SessionSchema>,
    child: Partial<SessionSchema>
  ): Partial<SessionSchema> {
    return {
      project: child.project || parent.project,
      completed: this.dedupeList([
        ...(parent.completed || []),
        ...(child.completed || []),
      ]),
      next: this.dedupeList([...(parent.next || []), ...(child.next || [])]),
      decisions: {
        ...(parent.decisions || {}),
        ...(child.decisions || {}),
      },
      technicalSpecs: this.mergeObjects(
        parent.technicalSpecs || {},
        child.technicalSpecs || {}
      ),
    };
  }

  protected mergeContent(parent: any[], child: any[]): any[] {
    return [...parent, ...child];
  }

  protected dedupeList<T>(list: T[]): T[] {
    return Array.from(new Set(list));
  }

  protected mergeObjects(parent: any, child: any): any {
    return {
      ...parent,
      ...child,
    };
  }
}

/**
 * Keep latest strategy - prefers child values over parent
 */
export class KeepLatestStrategy extends AutoMergeStrategy implements MergeStrategy {
  name = 'keep-latest';
  description = 'Prefer most recent (child) values over parent values';

  canAutoMerge(conflicts: MergeConflict[]): boolean {
    // Can auto-merge even with conflicts - we always prefer child
    return true;
  }

  protected mergeSchemas(
    parent: Partial<SessionSchema>,
    child: Partial<SessionSchema>
  ): Partial<SessionSchema> {
    return {
      project: child.project || parent.project,
      completed: this.dedupeList([
        ...(parent.completed || []),
        ...(child.completed || []),
      ]),
      next: child.next || parent.next, // Prefer child's next
      decisions: {
        ...(parent.decisions || {}),
        ...(child.decisions || {}), // Child decisions override
      },
      technicalSpecs: this.mergeObjects(
        parent.technicalSpecs || {},
        child.technicalSpecs || {}
      ),
    };
  }
}

/**
 * Keep all strategy - preserves all versions with annotations
 */
export class KeepAllStrategy extends AutoMergeStrategy implements MergeStrategy {
  name = 'keep-all';
  description = 'Keep all versions with metadata annotations';

  canAutoMerge(conflicts: MergeConflict[]): boolean {
    return true;
  }

  protected mergeSchemas(
    parent: Partial<SessionSchema>,
    child: Partial<SessionSchema>
  ): Partial<SessionSchema> {
    const merged: any = {
      project: child.project || parent.project,
      completed: this.dedupeList([
        ...(parent.completed || []),
        ...(child.completed || []),
      ]),
      next: this.dedupeList([...(parent.next || []), ...(child.next || [])]),
      decisions: {
        ...(parent.decisions || {}),
        ...(child.decisions || {}),
      },
      technicalSpecs: this.mergeObjects(
        parent.technicalSpecs || {},
        child.technicalSpecs || {}
      ),
    };

    // Add metadata about merge
    if (!merged._mergeMetadata) {
      merged._mergeMetadata = [];
    }
    merged._mergeMetadata.push({
      timestamp: Date.now(),
      source: 'keep-all-strategy',
    });

    return merged;
  }
}

/**
 * Summarize strategy - creates summaries for conflicting content
 */
export class SummarizeStrategy extends AutoMergeStrategy implements MergeStrategy {
  name = 'summarize';
  description = 'Merge and create summary of changes';

  canAutoMerge(conflicts: MergeConflict[]): boolean {
    // Can auto-merge if we can summarize
    return conflicts.length < 10; // Too many conflicts = too complex
  }

  async merge(
    parent: any,
    child: ChildResult,
    conflicts: MergeConflict[]
  ): Promise<MergeResult> {
    const baseResult = await super.merge(parent, child, conflicts);

    if (!baseResult.success) {
      return baseResult;
    }

    // Add summary to content
    const summary = this.generateSummary(parent, child, conflicts);

    return {
      ...baseResult,
      merged: {
        ...baseResult.merged,
        content: [
          ...(baseResult.merged.content || []),
          { type: 'summary', text: summary }
        ],
      },
    };
  }

  private generateSummary(
    parent: any,
    child: ChildResult,
    conflicts: MergeConflict[]
  ): string {
    const parts: string[] = [];

    parts.push(`# Merge Summary for ${child.taskId}`);
    parts.push('');

    // Schema changes
    const completedAdded = (child.schema.completed || []).filter(
      (item) => !(parent.schema?.completed || []).includes(item)
    );
    if (completedAdded.length > 0) {
      parts.push('**Completed:**');
      for (const item of completedAdded) {
        parts.push(`- ${item}`);
      }
      parts.push('');
    }

    // Conflicts resolved
    if (conflicts.length > 0) {
      parts.push('**Conflicts Resolved:**');
      parts.push(`- Total: ${conflicts.length}`);
      parts.push(`- Critical: ${conflicts.filter((c) => c.severity === 'critical').length}`);
      parts.push(`- Warning: ${conflicts.filter((c) => c.severity === 'warning').length}`);
      parts.push(`- Info: ${conflicts.filter((c) => c.severity === 'info').length}`);
      parts.push('');
    }

    return parts.join('\n');
  }
}

/**
 * Ask user strategy - requires user input for resolution
 */
export class AskUserStrategy implements MergeStrategy {
  name = 'ask-user';
  description = 'Prompt user to resolve conflicts';

  canAutoMerge(conflicts: MergeConflict[]): boolean {
    return false; // Always requires user input
  }

  async merge(
    parent: any,
    child: ChildResult,
    conflicts: MergeConflict[]
  ): Promise<MergeResult> {
    // This strategy sets up the UI for user input
    // The actual resolution happens via the UI component
    return {
      success: true,
      merged: {
        schema: parent.schema || {},
        content: parent.content || [],
      },
      conflicts,
      conflictsResolved: 0,
      requiredUserInput: true,
    };
  }
}

/**
 * Strategy registry
 */
export class MergeStrategyRegistry {
  private strategies: Map<string, MergeStrategy> = new Map();

  constructor() {
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies() {
    this.register(new AutoMergeStrategy());
    this.register(new KeepLatestStrategy());
    this.register(new KeepAllStrategy());
    this.register(new SummarizeStrategy());
    this.register(new AskUserStrategy());
  }

  register(strategy: MergeStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  get(name: string): MergeStrategy | undefined {
    return this.strategies.get(name);
  }

  getAll(): MergeStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Select the best strategy based on conflicts
   */
  selectStrategy(conflicts: MergeConflict[]): MergeStrategy {
    // Try strategies in order of preference
    const strategyOrder: string[] = [
      'auto-merge',
      'keep-latest',
      'summarize',
      'keep-all',
      'ask-user',
    ];

    for (const name of strategyOrder) {
      const strategy = this.get(name);
      if (strategy && strategy.canAutoMerge(conflicts)) {
        return strategy;
      }
    }

    // Fall back to ask-user
    return this.get('ask-user')!;
  }
}

/**
 * Singleton instance
 */
export const mergeStrategyRegistry = new MergeStrategyRegistry();
