/**
 * Conflict Resolution System
 *
 * Handles conflicts during import operations.
 */

import {
  ImportConflict,
  ConflictType,
  ConflictResolution,
  ImportItem,
  FieldComparison,
} from './types'
import { listConversations, getConversation } from '@/lib/storage/conversation-store'

// ============================================================================
// CONFLICT RESOLVER
// ============================================================================

export class ConflictResolver {
  /**
   * Detect all conflicts for import items
   */
  async detectConflicts(items: ImportItem[]): Promise<ImportConflict[]> {
    const conflicts: ImportConflict[] = []

    for (const item of items) {
      const itemConflicts = await this.detectItemConflicts(item)
      conflicts.push(...itemConflicts)
    }

    return conflicts
  }

  /**
   * Detect conflicts for a single item
   */
  async detectItemConflicts(item: ImportItem): Promise<ImportConflict[]> {
    const conflicts: ImportConflict[] = []

    // Check for duplicate ID
    const existingById = await getConversation(item.sourceId)
    if (existingById) {
      conflicts.push({
        id: `conflict_${item.sourceId}_id`,
        item,
        existing: existingById,
        type: 'duplicate-id',
        description: `An item with ID "${item.sourceId}" already exists`,
        suggestedResolution: 'rename',
        fieldComparison: this.compareFields(item.data, existingById),
      })
    }

    // Check for duplicate title
    const allConversations = await listConversations()
    const withSameTitle = allConversations.find(c => c.title === item.title)
    if (withSameTitle && withSameTitle.id !== item.sourceId) {
      conflicts.push({
        id: `conflict_${item.sourceId}_title`,
        item,
        existing: withSameTitle,
        type: 'duplicate-title',
        description: `A conversation with title "${item.title}" already exists`,
        suggestedResolution: 'skip',
      })
    }

    return conflicts
  }

  /**
   * Resolve a conflict using the specified resolution strategy
   */
  async resolveConflict(
    conflict: ImportConflict,
    resolution: ConflictResolution
  ): Promise<any> {
    switch (resolution) {
      case 'skip':
        // Don't import the item
        return null

      case 'overwrite':
        // Replace existing with imported
        return conflict.item.data

      case 'rename':
        // Generate new ID for imported item
        return {
          ...conflict.item.data,
          id: this.generateNewId(),
        }

      case 'merge':
        // Merge data when possible
        return this.mergeData(conflict.item.data, conflict.existing)

      case 'ask':
        // Return conflict for user to decide
        return conflict

      default:
        throw new Error(`Unknown conflict resolution: ${resolution}`)
    }
  }

  /**
   * Apply batch conflict resolution
   */
  async resolveBatchConflicts(
    conflicts: ImportConflict[],
    resolution: ConflictResolution
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>()

    for (const conflict of conflicts) {
      const resolved = await this.resolveConflict(conflict, resolution)
      results.set(conflict.item.sourceId, resolved)
    }

    return results
  }

  /**
   * Generate field-by-field comparison
   */
  private compareFields(imported: any, existing: any): FieldComparison[] {
    const comparisons: FieldComparison[] = []

    // Compare common fields
    const fieldsToCompare = ['title', 'type', 'createdAt', 'updatedAt']

    for (const field of fieldsToCompare) {
      const importedValue = imported[field]
      const existingValue = existing[field]

      comparisons.push({
        field,
        imported: importedValue,
        existing: existingValue,
        matches: JSON.stringify(importedValue) === JSON.stringify(existingValue),
      })
    }

    // Compare message counts
    if (imported.messages && existing.messages) {
      comparisons.push({
        field: 'messageCount',
        imported: imported.messages.length,
        existing: existing.messages.length,
        matches: imported.messages.length === existing.messages.length,
      })
    }

    return comparisons
  }

  /**
   * Merge two data objects
   */
  private mergeData(imported: any, existing: any): any {
    // For now, prefer imported data but keep existing ID
    return {
      ...existing,
      ...imported,
      id: existing.id,
      messages: this.mergeMessages(imported.messages || [], existing.messages || []),
    }
  }

  /**
   * Merge message arrays
   */
  private mergeMessages(imported: any[], existing: any[]): any[] {
    // Combine messages, preferring imported
    const merged = [...existing]

    for (const msg of imported) {
      const existingIndex = merged.findIndex(m => m.id === msg.id)

      if (existingIndex === -1) {
        merged.push(msg)
      } else {
        merged[existingIndex] = msg
      }
    }

    return merged
  }

  /**
   * Generate a new unique ID
   */
  private generateNewId(): string {
    return `import_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Get suggested resolution based on conflict type
   */
  static getSuggestedResolution(conflictType: ConflictType): ConflictResolution {
    switch (conflictType) {
      case 'duplicate-id':
        return 'rename'
      case 'duplicate-title':
        return 'skip'
      case 'data-mismatch':
        return 'ask'
      case 'reference-broken':
        return 'skip'
      case 'constraint-violation':
        return 'skip'
      default:
        return 'ask'
    }
  }
}
