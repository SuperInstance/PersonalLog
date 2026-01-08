/**
 * Conflict Resolution Example
 *
 * Demonstrates handling sync conflicts
 */

import {
  initializeSyncEngine,
  ConflictResolver,
  type Conflict,
  type ConflictResolution,
} from '@superinstance/multi-device-sync'

async function demonstrateConflicts() {
  const engine = await initializeSyncEngine({
    enabled: true,
    conflictResolution: 'keep-newer', // Default strategy
  })

  // Listen for conflicts
  engine.onStatusChange((status) => {
    if (status === 'conflict') {
      console.log('⚠️  Conflicts detected!')
      handleConflicts()
    }
  })

  // Perform sync (may create conflicts)
  try {
    await engine.sync('bidirectional')
  } catch (error) {
    console.error('Sync failed:', error)
  }
}

async function handleConflicts() {
  const engine = await initializeSyncEngine()

  // Get unresolved conflicts
  const status = await engine.getSyncStatus()
  if (status.pendingConflicts > 0) {
    console.log(`Found ${status.pendingConflicts} conflicts`)

    // Strategy 1: Auto-resolve with default strategy
    console.log('Auto-resolving conflicts...')
    // Conflicts are auto-resolved during sync using default strategy

    // Strategy 2: Manual resolution
    // You can also manually resolve conflicts:

    // For example, let user choose
    const resolution: ConflictResolution = await promptUserForResolution()

    // Apply resolution
    await engine.resolveConflict('conflict_id', resolution)
  }
}

async function promptUserForResolution(): Promise<ConflictResolution> {
  // In a real app, show UI to let user choose
  const options = [
    'keep-local',      // Keep my version
    'keep-remote',     // Keep their version
    'keep-newer',      // Keep newer version
    'keep-older',      // Keep older version
    'manual-merge',    // Manually merge both
    'smart-merge',     // Auto-merge non-conflicting fields
  ]

  console.log('Resolution options:', options)

  // Return user's choice
  return 'keep-newer'
}

// Example: Manual merge
async function manualMergeExample() {
  const engine = await initializeSyncEngine()

  // Get conflict details
  const status = await engine.getSyncStatus()

  // Suppose we have a conflict with these versions:
  const localVersion = {
    title: 'My Document',
    content: 'Local content',
    tags: ['important', 'work'],
  }

  const remoteVersion = {
    title: 'My Document',
    content: 'Remote content',
    tags: ['important'],
  }

  // Manual merge: combine non-conflicting fields
  const mergedData = {
    title: localVersion.title,
    content: localVersion.content, // Or remoteVersion.content
    tags: [...new Set([...localVersion.tags, ...remoteVersion.tags])],
  }

  // Apply manual merge
  await engine.resolveConflict('conflict_id', 'manual-merge')
}

// Example: Smart merge
async function smartMergeExample() {
  const resolver = new ConflictResolver({
    defaultStrategy: 'smart-merge',
    enableSmartMerge: true,
    autoResolveAgeThreshold: 7 * 24 * 60 * 60 * 1000, // 7 days
  })

  // Smart merge automatically combines non-conflicting fields
  // For example:
  // Local:  { title: 'Doc', content: 'A', tags: ['x'] }
  // Remote: { title: 'Doc', content: 'A', tags: ['y'] }
  // Result: { title: 'Doc', content: 'A', tags: ['x', 'y'] }

  console.log('Smart merge enabled for non-overlapping changes')
}

// Example: Conflict statistics
async function conflictStats() {
  const engine = await initializeSyncEngine()

  // After sync, check conflict stats
  const stats = await engine.getStatistics()
  console.log('Conflict statistics:', {
    resolved: stats.conflictsResolved,
    pending: stats.conflictsPending,
  })
}

demonstrateConflicts().catch(console.error)
