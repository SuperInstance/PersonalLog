/**
 * Conflict Resolution Module
 *
 * Intelligent conflict resolution for synchronized data.
 * Supports multiple strategies: last-write-wins, manual merge, smart merge.
 */

import {
  Conflict,
  ConflictVersion,
  ConflictResolution,
  ConflictResolutionAction,
  DataDelta,
  CollectionType
} from './types'
import { ValidationError, NotFoundError } from './errors'

// ============================================================================
// CONFLICT RESOLUTION OPTIONS
// ============================================================================

export interface ConflictResolverConfig {
  defaultStrategy: ConflictResolution
  autoResolveAgeThreshold: number  // milliseconds, auto-resolve if conflict older than this
  preferLocalChanges: boolean       // When smart merging, prefer local edits
  enableSmartMerge: boolean         // Enable automatic smart merging
}

export const DEFAULT_CONFLICT_CONFIG: ConflictResolverConfig = {
  defaultStrategy: 'keep-newer',
  autoResolveAgeThreshold: 7 * 24 * 60 * 60 * 1000, // 7 days
  preferLocalChanges: false,
  enableSmartMerge: true,
}

// ============================================================================
// CONFLICT RESOLVER
// ============================================================================

export class ConflictResolver {
  private conflicts: Map<string, Conflict> = new Map()
  private resolutionHistory: ConflictResolutionAction[] = []
  private config: ConflictResolverConfig

  constructor(config: Partial<ConflictResolverConfig> = {}) {
    this.config = { ...DEFAULT_CONFLICT_CONFIG, ...config }
  }

  /**
   * Detect conflicts between local and remote data
   */
  detectConflicts(
    localDeltas: DataDelta[],
    remoteDeltas: DataDelta[]
  ): Conflict[] {
    const conflicts: Conflict[] = []
    const remoteMap = new Map(remoteDeltas.map(d => [d.itemId, d]))

    for (const localDelta of localDeltas) {
      const remoteDelta = remoteMap.get(localDelta.itemId)

      if (!remoteDelta) continue

      // Check if there's a conflict
      if (this.isConflict(localDelta, remoteDelta)) {
        const conflict: Conflict = {
          id: this.generateConflictId(),
          type: this.getConflictType(localDelta.collection),
          itemId: localDelta.itemId,
          localVersion: {
            data: localDelta.data,
            timestamp: localDelta.timestamp,
            deviceId: localDelta.deviceId,
            version: localDelta.version,
            checksum: localDelta.checksum,
          },
          remoteVersion: {
            data: remoteDelta.data,
            timestamp: remoteDelta.timestamp,
            deviceId: remoteDelta.deviceId,
            version: remoteDelta.version,
            checksum: remoteDelta.checksum,
          },
          detectedAt: Date.now(),
          resolved: false,
        }

        conflicts.push(conflict)
        this.conflicts.set(conflict.id, conflict)
      }
    }

    return conflicts
  }

  /**
   * Resolve a conflict using specified strategy
   */
  async resolveConflict(
    conflictId: string,
    resolution: ConflictResolution,
    mergedData?: unknown
  ): Promise<ConflictResolutionAction> {
    const conflict = this.conflicts.get(conflictId)
    if (!conflict) {
      throw new NotFoundError('conflict', conflictId)
    }

    let resolvedData: unknown

    switch (resolution) {
      case 'keep-local':
        resolvedData = conflict.localVersion.data
        break

      case 'keep-remote':
        resolvedData = conflict.remoteVersion.data
        break

      case 'keep-newer':
        resolvedData = conflict.localVersion.timestamp > conflict.remoteVersion.timestamp
          ? conflict.localVersion.data
          : conflict.remoteVersion.data
        break

      case 'keep-older':
        resolvedData = conflict.localVersion.timestamp < conflict.remoteVersion.timestamp
          ? conflict.localVersion.data
          : conflict.remoteVersion.data
        break

      case 'manual-merge':
        if (!mergedData) {
          throw new ValidationError('Merged data required for manual merge', {
            field: 'mergedData'
          })
        }
        resolvedData = mergedData
        break

      case 'smart-merge':
        if (!this.config.enableSmartMerge) {
          throw new ValidationError('Smart merge is not enabled', {
            field: 'smartMerge'
          })
        }
        resolvedData = await this.smartMerge(conflict)
        break

      default:
        throw new ValidationError(`Unknown resolution strategy: ${resolution}`, {
          field: 'resolution',
          value: resolution
        })
    }

    // Mark conflict as resolved
    conflict.resolved = true

    const action: ConflictResolutionAction = {
      conflictId,
      resolution,
      mergedData: resolvedData as object,
      resolvedAt: Date.now(),
    }

    this.resolutionHistory.push(action)

    return action
  }

  /**
   * Auto-resolve conflicts using default strategy
   */
  async autoResolveConflicts(): Promise<ConflictResolutionAction[]> {
    const actions: ConflictResolutionAction[] = []
    const now = Date.now()

    for (const [conflictId, conflict] of this.conflicts.entries()) {
      if (conflict.resolved) continue

      // Auto-resolve old conflicts
      const conflictAge = now - conflict.detectedAt
      if (conflictAge > this.config.autoResolveAgeThreshold) {
        const action = await this.resolveConflict(conflictId, this.config.defaultStrategy)
        actions.push(action)
        continue
      }

      // Try smart merge for safe conflicts
      if (this.config.enableSmartMerge && this.canSmartMerge(conflict)) {
        try {
          const action = await this.resolveConflict(conflictId, 'smart-merge')
          actions.push(action)
        } catch (error) {
          console.warn(`[ConflictResolver] Failed to smart merge conflict ${conflictId}:`, error)
        }
      }
    }

    return actions
  }

  /**
   * Get all unresolved conflicts
   */
  getUnresolvedConflicts(): Conflict[] {
    return Array.from(this.conflicts.values()).filter(c => !c.resolved)
  }

  /**
   * Get conflict by ID
   */
  getConflict(conflictId: string): Conflict | undefined {
    return this.conflicts.get(conflictId)
  }

  /**
   * Get resolution history
   */
  getResolutionHistory(): ConflictResolutionAction[] {
    return [...this.resolutionHistory]
  }

  /**
   * Clear resolved conflicts
   */
  clearResolvedConflicts(): void {
    for (const [id, conflict] of this.conflicts.entries()) {
      if (conflict.resolved) {
        this.conflicts.delete(id)
      }
    }
  }

  /**
   * Get conflict statistics
   */
  getConflictStats(): {
    total: number
    resolved: number
    unresolved: number
    byType: Record<string, number>
  } {
    const conflicts = Array.from(this.conflicts.values())
    const resolved = conflicts.filter(c => c.resolved).length
    const unresolved = conflicts.length - resolved

    const byType: Record<string, number> = {}
    for (const conflict of conflicts) {
      byType[conflict.type] = (byType[conflict.type] || 0) + 1
    }

    return {
      total: conflicts.length,
      resolved,
      unresolved,
      byType,
    }
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Check if two deltas conflict
   */
  private isConflict(local: DataDelta, remote: DataDelta): boolean {
    // Both modified the same item
    if (local.itemId !== remote.itemId) return false
    if (local.collection !== remote.collection) return false

    // Both are updates or creates (not deletes)
    if (local.type === 'delete' || remote.type === 'delete') {
      return false
    }

    // Both were modified around the same time (within sync window)
    // Assuming sync interval is 15 minutes, use 5 min buffer
    const SYNC_WINDOW = 5 * 60 * 1000
    const timeDiff = Math.abs(local.timestamp - remote.timestamp)

    if (timeDiff < SYNC_WINDOW) {
      // Both modified around the same time - potential conflict
      return true
    }

    // One is newer but both modified
    return true
  }

  /**
   * Get conflict type from collection
   */
  private getConflictType(collection: CollectionType): Conflict['type'] {
    switch (collection) {
      case 'conversations':
      case 'messages':
        return 'conversation'
      case 'knowledge':
        return 'knowledge'
      case 'settings':
        return 'settings'
      default:
        return 'conversation'
    }
  }

  /**
   * Check if conflict can be smart merged
   */
  private canSmartMerge(conflict: Conflict): boolean {
    // Can only merge objects
    if (
      typeof conflict.localVersion.data !== 'object' ||
      typeof conflict.remoteVersion.data !== 'object' ||
      conflict.localVersion.data === null ||
      conflict.remoteVersion.data === null
    ) {
      return false
    }

    // Can't merge arrays
    if (Array.isArray(conflict.localVersion.data) || Array.isArray(conflict.remoteVersion.data)) {
      return false
    }

    // Check for conflicting property values
    const localData = conflict.localVersion.data as Record<string, unknown>
    const remoteData = conflict.remoteVersion.data as Record<string, unknown>

    const localKeys = new Set(Object.keys(localData))
    const remoteKeys = new Set(Object.keys(remoteData))

    // Check for overlapping keys with different values
    for (const key of localKeys) {
      if (remoteKeys.has(key)) {
        const localValue = localData[key]
        const remoteValue = remoteData[key]

        if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
          // Conflicting values - can't auto merge
          return false
        }
      }
    }

    return true
  }

  /**
   * Smart merge two conflicting objects
   */
  private async smartMerge(conflict: Conflict): Promise<unknown> {
    if (!this.canSmartMerge(conflict)) {
      throw new ValidationError('Conflict cannot be smart merged', {
        field: 'conflict',
        value: conflict.id
      })
    }

    const localData = conflict.localVersion.data as Record<string, unknown>
    const remoteData = conflict.remoteVersion.data as Record<string, unknown>

    // Merge objects, combining unique keys
    const merged: Record<string, unknown> = { ...localData }

    for (const [key, value] of Object.entries(remoteData)) {
      if (!(key in merged)) {
        merged[key] = value
      }
    }

    return merged
  }

  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }
}

// ============================================================================
// MERGE HELPERS
// ============================================================================

/**
 * Merge two arrays by concatenating (with deduplication)
 */
export function mergeArrays<T>(
  local: T[],
  remote: T[],
  keyFn?: (item: T) => string
): T[] {
  if (!keyFn) {
    // Simple concatenation with deduplication
    const merged = [...local]
    for (const item of remote) {
      if (!merged.includes(item)) {
        merged.push(item)
      }
    }
    return merged
  }

  // Key-based deduplication
  const mergedMap = new Map<string, T>()

  for (const item of local) {
    const key = keyFn(item)
    mergedMap.set(key, item)
  }

  for (const item of remote) {
    const key = keyFn(item)
    if (!mergedMap.has(key)) {
      mergedMap.set(key, item)
    }
  }

  return Array.from(mergedMap.values())
}

/**
 * Merge two objects deeply
 */
export function deepMerge<T extends Record<string, unknown>>(
  local: T,
  remote: Partial<T>
): T {
  const result: any = { ...local }

  for (const [key, remoteValue] of Object.entries(remote)) {
    const localValue = result[key]

    if (typeof remoteValue === 'object' && remoteValue !== null && !Array.isArray(remoteValue)) {
      if (typeof localValue === 'object' && localValue !== null && !Array.isArray(localValue)) {
        // Recursively merge nested objects
        result[key] = deepMerge(
          localValue as Record<string, unknown>,
          remoteValue as Record<string, unknown>
        )
      } else {
        // Remote has nested object, local doesn't
        result[key] = remoteValue
      }
    } else if (remoteValue !== undefined) {
      // Primitive value or array - use remote value
      result[key] = remoteValue
    }
  }

  return result
}

/**
 * Generate a diff between two objects
 */
export function generateDiff<T extends Record<string, unknown>>(
  original: T,
  modified: T
): Partial<T> {
  const diff: Partial<T> = {}

  for (const [key, modifiedValue] of Object.entries(modified)) {
    const originalValue = original[key as keyof T]

    if (JSON.stringify(originalValue) !== JSON.stringify(modifiedValue)) {
      diff[key as keyof T] = modifiedValue as T[keyof T]
    }
  }

  return diff
}
