/**
 * Conflict Detection System
 *
 * Intelligently detects merge conflicts between parent and child conversations,
 * including schema conflicts, content contradictions, and overlapping changes.
 */

import { SessionSchema } from '../spreader/types';
import {
  ChildResult,
  MergeConflict,
} from './merge-types';

export class ConflictDetector {
  /**
   * Detect all conflicts between parent schema and child results
   */
  async detectConflicts(
    parentSchema: Partial<SessionSchema>,
    childResults: ChildResult[]
  ): Promise<MergeConflict[]> {
    const conflicts: MergeConflict[] = [];

    for (const result of childResults) {
      // Detect schema conflicts
      const schemaConflicts = this.detectSchemaConflicts(
        parentSchema,
        result.schema
      );
      conflicts.push(...schemaConflicts);

      // Detect content contradictions
      const contentConflicts = this.detectContentConflicts(result);
      conflicts.push(...contentConflicts);
    }

    // Detect contradictions between multiple child results
    if (childResults.length > 1) {
      const contradictions = this.detectContradictions(childResults);
      conflicts.push(...contradictions);
    }

    // Detect overlapping changes
    const overlaps = this.detectOverlaps(childResults);
    conflicts.push(...overlaps);

    return this.deduplicateConflicts(conflicts);
  }

  /**
   * Detect conflicts in schema fields
   */
  private detectSchemaConflicts(
    parent: Partial<SessionSchema>,
    child: Partial<SessionSchema>
  ): MergeConflict[] {
    const conflicts: MergeConflict[] = [];

    // Check completed list conflicts (lowercase in SessionSchema)
    const parentCompleted = new Set(parent.completed || []);
    const childCompleted = new Set(child.completed || []);

    for (const item of childCompleted) {
      if (parentCompleted.has(item)) {
        conflicts.push({
          id: `completed-${item}`,
          type: 'schema',
          severity: 'warning',
          location: 'completed',
          description: `"${item}" appears in both parent and child completed lists`,
          options: ['keep-one', 'merge-both', 'keep-child'],
          suggestions: [
            'Keep the child version (most recent work)',
            'Merge both entries (no duplication)',
          ],
        });
      }
    }

    // Check next list conflicts (lowercase)
    const parentNext = new Set(parent.next || []);
    const childNext = new Set(child.next || []);

    for (const item of childNext) {
      if (parentCompleted.has(item)) {
        conflicts.push({
          id: `next-completed-${item}`,
          type: 'schema',
          severity: 'info',
          location: 'next',
          description: `"${item}" is in child's next list but already in parent's completed list`,
          options: ['remove-from-next', 'add-to-completed', 'keep-both'],
          suggestions: [
            'Remove from next (already completed)',
            'Move to completed (if child completed it)',
          ],
        });
      }
    }

    // Check decisions conflicts (contradictory decisions)
    const parentDecisions: Record<string, string> = {};
    const childDecisions: Record<string, string> = {};

    // Convert decisions array to object if needed
    if (Array.isArray(parent.decisions)) {
      for (const d of parent.decisions) {
        const parts = d.split(':');
        if (parts.length === 2) {
          parentDecisions[parts[0].trim()] = parts[1].trim();
        } else {
          parentDecisions[d] = d;
        }
      }
    }
    if (Array.isArray(child.decisions)) {
      for (const d of child.decisions) {
        const parts = d.split(':');
        if (parts.length === 2) {
          childDecisions[parts[0].trim()] = parts[1].trim();
        } else {
          childDecisions[d] = d;
        }
      }
    }

    for (const [key, childValue] of Object.entries(childDecisions)) {
      if (key in parentDecisions) {
        const parentValue = parentDecisions[key];
        if (!this.areValuesEqual(parentValue, childValue)) {
          conflicts.push({
            id: `decision-${key}`,
            type: 'contradiction',
            severity: 'critical',
            location: `decisions.${key}`,
            description: `Contradictory decisions for "${key}": parent="${JSON.stringify(parentValue)}" vs child="${JSON.stringify(childValue)}"`,
            options: ['keep-parent', 'keep-child', 'merge', 'ask-user'],
            suggestions: [
              'Keep parent decision (more authoritative)',
              'Keep child decision (more recent work)',
              'Merge both decisions if complementary',
              'Ask user which to prefer',
            ],
            parentValue,
            childValue,
          });
        }
      }
    }

    // Check technicalSpecs conflicts (lowercase, camelCase)
    const parentSpecs = parent.technicalSpecs || {};
    const childSpecs = child.technicalSpecs || {};

    for (const [key, childValue] of Object.entries(childSpecs)) {
      if (key in parentSpecs) {
        const parentValue = (parentSpecs as Record<string, unknown>)[key];
        if (!this.areValuesEqual(parentValue, childValue)) {
          conflicts.push({
            id: `spec-${key}`,
            type: 'schema',
            severity: 'warning',
            location: `technicalSpecs.${key}`,
            description: `Differing technical specs for "${key}"`,
            options: ['keep-parent', 'keep-child', 'merge-objects'],
            suggestions: [
              'Keep parent spec (established baseline)',
              'Keep child spec (most recent work)',
              'Merge objects (combine keys)',
            ],
            parentValue,
            childValue,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect conflicts within content
   */
  private detectContentConflicts(result: ChildResult): MergeConflict[] {
    const conflicts: MergeConflict[] = [];

    // Check if content has conflicting markers
    if (result.content && result.content.length > 0) {
      const contentStr = JSON.stringify(result.content);

      // Look for conflict markers
      const conflictPatterns = [
        /<<<<<<<|=======|>>>>>>>/g, // Git-style conflicts
        /TODO.*conflict/gi,
        /CONFLICT:/gi,
      ];

      for (const pattern of conflictPatterns) {
        if (pattern.test(contentStr)) {
          conflicts.push({
            id: `content-markers-${result.taskId}`,
            type: 'content',
            severity: 'warning',
            location: 'content',
            description: `Content contains unresolved conflict markers in "${result.taskId}"`,
            options: ['resolve-markers', 'ask-user'],
            suggestions: [
              'Resolve conflict markers automatically',
              'Ask user to review content',
            ],
          });
          break;
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect contradictions between multiple child results
   */
  private detectContradictions(results: ChildResult[]): MergeConflict[] {
    const conflicts: MergeConflict[] = [];

    // Compare each pair of results
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const result1 = results[i];
        const result2 = results[j];

        const contradictions = this.compareResults(result1, result2);
        conflicts.push(...contradictions);
      }
    }

    return conflicts;
  }

  /**
   * Compare two child results for contradictions
   */
  private compareResults(
    result1: ChildResult,
    result2: ChildResult
  ): MergeConflict[] {
    const conflicts: MergeConflict[] = [];

    // Compare summaries if both exist
    if (result1.summary && result2.summary) {
      // Check for obvious contradictions
      const contradictionKeywords = [
        ['not', 'definitely'],
        ['never', 'always'],
        ['cannot', 'can'],
        ['impossible', 'possible'],
        ['failed', 'succeeded'],
      ];

      for (const [word1, word2] of contradictionKeywords) {
        const hasWord1 = result1.summary.toLowerCase().includes(word1) ||
                         result2.summary.toLowerCase().includes(word1);
        const hasWord2 = result1.summary.toLowerCase().includes(word2) ||
                         result2.summary.toLowerCase().includes(word2);

        if (hasWord1 && hasWord2) {
          conflicts.push({
            id: `contradiction-${result1.taskId}-${result2.taskId}`,
            type: 'contradiction',
            severity: 'critical',
            location: 'summary',
            description: `Potentially contradictory findings between "${result1.taskId}" and "${result2.taskId}"`,
            options: ['keep-first', 'keep-second', 'merge', 'ask-user'],
            suggestions: [
              `Keep ${result1.taskId} version`,
              `Keep ${result2.taskId} version`,
              'Merge both summaries with clarification',
              'Ask user to review',
            ],
          });
          break;
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect overlapping changes in child results
   */
  private detectOverlaps(results: ChildResult[]): MergeConflict[] {
    const conflicts: MergeConflict[] = [];

    // Check for overlapping completed items (lowercase)
    const allCompleted = new Map<string, string[]>();

    for (const result of results) {
      const completed = result.schema.completed || [];
      for (const item of completed) {
        if (!allCompleted.has(item)) {
          allCompleted.set(item, []);
        }
        allCompleted.get(item)!.push(result.taskId);
      }
    }

    // Report overlaps
    for (const [item, taskIds] of allCompleted.entries()) {
      if (taskIds.length > 1) {
        conflicts.push({
          id: `overlap-completed-${item}`,
          type: 'content',
          severity: 'info',
          location: 'completed',
          description: `"${item}" was completed by multiple tasks: ${taskIds.join(', ')}`,
          options: ['keep-one', 'merge-all', 'dedupe'],
          suggestions: [
            'Keep one entry (deduplicate)',
            'Note which tasks completed it',
          ],
        });
      }
    }

    return conflicts;
  }

  /**
   * Remove duplicate conflicts
   */
  private deduplicateConflicts(conflicts: MergeConflict[]): MergeConflict[] {
    const seen = new Set<string>();
    const unique: MergeConflict[] = [];

    for (const conflict of conflicts) {
      if (!seen.has(conflict.id)) {
        seen.add(conflict.id);
        unique.push(conflict);
      }
    }

    return unique;
  }

  /**
   * Check if two values are equal (deep comparison for objects)
   */
  private areValuesEqual(val1: any, val2: any): boolean {
    if (val1 === val2) return true;
    if (typeof val1 !== typeof val2) return false;
    if (typeof val1 === 'object' && val1 !== null && val2 !== null) {
      return JSON.stringify(val1) === JSON.stringify(val2);
    }
    return false;
  }
}

/**
 * Singleton instance
 */
export const conflictDetector = new ConflictDetector();
