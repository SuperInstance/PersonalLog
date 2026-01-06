/**
 * Auto-Merge Engine
 *
 * Orchestrates conflict detection, strategy selection, and merging
 * of child conversation results into parent conversations.
 */

import { SessionSchema } from '../spreader/types';
import { Conversation } from '@/types/conversation';
import {
  ChildResult,
  MergeConflict,
  MergeOptions,
  MergeResult,
  ConflictResolution,
} from './merge-types';
import { conflictDetector } from './conflict-detection';
import { mergeStrategyRegistry } from './merge-strategies';

/**
 * Auto-merge engine for intelligently merging child results
 */
export class AutoMergeEngine {
  /**
   * Merge a child result into the parent conversation
   */
  async mergeChildResult(
    parentConversation: Conversation,
    parentSchema: Partial<SessionSchema>,
    childResult: ChildResult,
    options: MergeOptions = {}
  ): Promise<MergeResult> {
    try {
      // Step 1: Detect conflicts
      const conflicts = await conflictDetector.detectConflicts(
        parentSchema || {},
        [childResult]
      );

      // Step 2: Choose strategy
      const strategy =
        options.strategy || mergeStrategyRegistry.selectStrategy(conflicts);

      // Step 3: Apply merge
      const result = await strategy.merge(
        {
          schema: parentSchema || {},
          content: parentConversation.messages || [],
        },
        childResult,
        conflicts
      );

      // Step 4: Update parent if successful
      if (result.success && !result.requiredUserInput) {
        // Return the merged schema - caller is responsible for saving
        // Step 5: Notify user
        if (options.notifyUser !== false) {
          await this.notifyUser(parentConversation.id, childResult, result);
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        merged: { schema: {}, content: [] },
        conflicts: [],
        conflictsResolved: 0,
        requiredUserInput: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Apply user-provided conflict resolutions
   */
  async applyUserResolution(
    parentConversation: Conversation,
    parentSchema: Partial<SessionSchema>,
    childResult: ChildResult,
    resolutions: ConflictResolution[]
  ): Promise<MergeResult> {
    // Get conflicts
    const conflicts = await conflictDetector.detectConflicts(
      parentSchema || {},
      [childResult]
    );

    // Apply resolutions
    const resolvedSchema = this.applyResolutions(
      parentSchema || {},
      childResult.schema,
      conflicts,
      resolutions
    );

    // Notify user
    await this.notifyUser(parentConversation.id, childResult, {
      success: true,
      merged: {
        schema: resolvedSchema,
        content: childResult.content,
      },
      conflicts,
      conflictsResolved: resolutions.length,
      requiredUserInput: true,
    });

    return {
      success: true,
      merged: {
        schema: resolvedSchema,
        content: childResult.content || [],
      },
      conflicts,
      conflictsResolved: resolutions.length,
      requiredUserInput: true,
    };
  }

  /**
   * Detect conflicts without merging
   */
  async previewConflicts(
    parentSchema: Partial<SessionSchema>,
    childResult: ChildResult
  ): Promise<MergeConflict[]> {
    return conflictDetector.detectConflicts(
      parentSchema || {},
      [childResult]
    );
  }

  /**
   * Update parent conversation schema (removed - caller handles persistence)
   * @deprecated Schema updates are now handled by the caller
   */
  private async updateParentSchema(
    conversationId: string,
    merged: { schema: Partial<SessionSchema>; content?: any[] }
  ): Promise<void> {
    // This method is deprecated - schema updates are handled by the Spreader agent
    // which manages its own state
    throw new Error('Schema updates must be handled by the Spreader agent');
  }

  /**
   * Notify user of merge result
   */
  private async notifyUser(
    conversationId: string,
    childResult: ChildResult,
    mergeResult: MergeResult
  ): Promise<void> {
    // Import from conversation store
    const { addMessage } = await import('@/lib/storage/conversation-store');

    const content = this.formatMergeNotification(childResult, mergeResult);

    await addMessage(
      conversationId,
      'text',
      { type: 'ai-contact', contactId: 'spreader-v1', contactName: 'Auto-Merge Agent' },
      { text: content }
    );
  }

  /**
   * Format merge notification message
   */
  private formatMergeNotification(
    childResult: ChildResult,
    mergeResult: MergeResult
  ): string {
    const parts: string[] = [];

    parts.push(`# Merge Result: ${childResult.taskId}`);
    parts.push('');

    if (mergeResult.success) {
      parts.push('✅ **Merge successful**');

      if (childResult.summary) {
        parts.push('');
        parts.push('**Summary:**');
        parts.push(childResult.summary);
      }

      parts.push('');
      parts.push('**Schema Updates:**');
      parts.push(
        `- Completed: ${mergeResult.merged.schema.completed?.length || 0} items`
      );
      parts.push(`- Next: ${mergeResult.merged.schema.next?.length || 0} items`);
      parts.push(
        `- Decisions: ${Object.keys(mergeResult.merged.schema.decisions || {}).length} items`
      );

      if (mergeResult.conflictsResolved > 0) {
        parts.push('');
        parts.push(`**Conflicts Resolved:** ${mergeResult.conflictsResolved}`);
      }

      if (mergeResult.requiredUserInput) {
        parts.push('');
        parts.push(
          '⚠️ **User input required** - Please review and apply resolutions'
        );
      }
    } else {
      parts.push('❌ **Merge failed**');
      if (mergeResult.errorMessage) {
        parts.push('');
        parts.push(`Error: ${mergeResult.errorMessage}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Apply conflict resolutions to schema
   */
  private applyResolutions(
    parentSchema: Partial<SessionSchema>,
    childSchema: Partial<SessionSchema>,
    conflicts: MergeConflict[],
    resolutions: ConflictResolution[]
  ): Partial<SessionSchema> {
    const resolved: Partial<SessionSchema> = {
      project: childSchema.project || parentSchema.project,
      completed: [...(parentSchema.completed || [])],
      next: [...(parentSchema.next || [])],
      decisions: Array.isArray(parentSchema.decisions)
        ? [...parentSchema.decisions]
        : [],
      technicalSpecs: { ...(parentSchema.technicalSpecs || {}) },
    };

    // Build resolution map
    const resolutionMap = new Map<string, ConflictResolution>();
    for (const r of resolutions) {
      resolutionMap.set(r.conflictId, r);
    }

    // Apply each resolution
    for (const conflict of conflicts) {
      const resolution = resolutionMap.get(conflict.id);
      if (!resolution) continue;

      switch (resolution.resolution) {
        case 'keep-parent':
          // Parent values already in resolved, do nothing
          break;

        case 'keep-child':
          this.applyChildValue(resolved, conflict);
          break;

        case 'merge-both':
          this.applyMergedValue(resolved, conflict, parentSchema, childSchema);
          break;

        case 'keep-one':
        case 'dedupe':
          this.applyDedupeValue(resolved, conflict, parentSchema, childSchema);
          break;

        case 'merge-objects':
          this.applyMergedObjects(resolved, conflict, parentSchema, childSchema);
          break;

        case 'ask-user':
          // User provided custom value
          if (resolution.customValue !== undefined) {
            this.applyCustomValue(resolved, conflict, resolution.customValue);
          }
          break;
      }
    }

    // Add non-conflicting child values
    const nonConflictingCompleted = (childSchema.completed || []).filter(
      (item) => !conflicts.some((c) => c.location === 'completed' && c.description.includes(item))
    );
    resolved.completed = [
      ...(resolved.completed || []),
      ...nonConflictingCompleted,
    ].filter((v, i, a) => a.indexOf(v) === i);

    const nonConflictingNext = (childSchema.next || []).filter(
      (item) => !conflicts.some((c) => c.location === 'next' && c.description.includes(item))
    );
    resolved.next = [...(resolved.next || []), ...nonConflictingNext].filter(
      (v, i, a) => a.indexOf(v) === i
    );

    return resolved;
  }

  private applyChildValue(
    resolved: Partial<SessionSchema>,
    conflict: MergeConflict
  ): void {
    const path = conflict.location.split('.');
    if (path[0] === 'decisions' && path[1]) {
      if (conflict.childValue !== undefined) {
        // Ensure decisions is an object for indexed access
        if (!resolved.decisions || Array.isArray(resolved.decisions)) {
          resolved.decisions = {};
        }
        (resolved.decisions as Record<string, unknown>)[path[1]] = conflict.childValue;
      }
    }
  }

  private applyMergedValue(
    resolved: Partial<SessionSchema>,
    conflict: MergeConflict,
    parent: Partial<SessionSchema>,
    child: Partial<SessionSchema>
  ): void {
    const path = conflict.location.split('.');
    if (path[0] === 'decisions' && path[1]) {
      const parentVal = this.getDecisionValue(parent.decisions, path[1]);
      const childVal = this.getDecisionValue(child.decisions, path[1]);
      // Ensure decisions is an object for indexed access
      if (!resolved.decisions || Array.isArray(resolved.decisions)) {
        resolved.decisions = {};
      }
      // Create merged representation
      (resolved.decisions as Record<string, unknown>)[path[1]] = {
        _merged: true,
        parent: parentVal,
        child: childVal,
      };
    }
  }

  private getDecisionValue(
    decisions: string[] | Record<string, unknown> | undefined,
    key: string
  ): unknown {
    if (!decisions) return undefined;
    if (Array.isArray(decisions)) return undefined;
    return decisions[key];
  }

  private applyDedupeValue(
    resolved: Partial<SessionSchema>,
    conflict: MergeConflict,
    parent: Partial<SessionSchema>,
    child: Partial<SessionSchema>
  ): void {
    const match = conflict.description.match(/"([^"]+)"/);
    if (match) {
      const value = match[1];
      if (conflict.location === 'completed') {
        resolved.completed = [
          ...(resolved.completed || []).filter((v) => v !== value),
          value,
        ].filter((v, i, a) => a.indexOf(v) === i);
      } else if (conflict.location === 'next') {
        resolved.next = [
          ...(resolved.next || []).filter((v) => v !== value),
          value,
        ].filter((v, i, a) => a.indexOf(v) === i);
      }
    }
  }

  private applyMergedObjects(
    resolved: Partial<SessionSchema>,
    conflict: MergeConflict,
    parent: Partial<SessionSchema>,
    child: Partial<SessionSchema>
  ): void {
    const path = conflict.location.split('.');
    if (path[0] === 'technicalSpecs' && path[1]) {
      if (!resolved.technicalSpecs) {
        resolved.technicalSpecs = {};
      }
      // Use type assertion for indexed access
      const specs = resolved.technicalSpecs as Record<string, unknown>;
      const parentSpecs = parent.technicalSpecs as Record<string, unknown> | undefined;
      const childSpecs = child.technicalSpecs as Record<string, unknown> | undefined;

      specs[path[1]] = {
        ...(parentSpecs?.[path[1]] || {}),
        ...(childSpecs?.[path[1]] || {}),
      };
    }
  }

  private applyCustomValue(
    resolved: Partial<SessionSchema>,
    conflict: MergeConflict,
    customValue: any
  ): void {
    const path = conflict.location.split('.');
    if (path[0] === 'decisions' && path[1]) {
      // Ensure decisions is an object for indexed access
      if (!resolved.decisions || Array.isArray(resolved.decisions)) {
        resolved.decisions = {};
      }
      (resolved.decisions as Record<string, unknown>)[path[1]] = customValue;
    }
  }
}

/**
 * Singleton instance
 */
export const autoMergeEngine = new AutoMergeEngine();
