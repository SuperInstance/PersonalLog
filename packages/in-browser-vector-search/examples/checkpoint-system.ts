/**
 * Checkpoint System Example
 *
 * Demonstrates checkpoint creation, rollback, and management.
 */

import { VectorStore } from '@superinstance/in-browser-vector-search'

async function checkpointExample() {
  const store = new VectorStore()
  await store.init()

  console.log('✅ Vector store initialized')

  // Add initial entries
  console.log('\n📝 Adding initial entries...')
  await store.addEntries([
    {
      type: 'document',
      sourceId: 'doc1',
      content: 'Initial document 1',
      metadata: { timestamp: new Date().toISOString() },
      editable: true
    },
    {
      type: 'document',
      sourceId: 'doc2',
      content: 'Initial document 2',
      metadata: { timestamp: new Date().toISOString() },
      editable: true
    }
  ])

  // Create a checkpoint
  console.log('\n💾 Creating checkpoint "Initial State"...')
  const checkpoint1 = await store.createCheckpoint('Initial State', {
    description: 'Baseline state before modifications',
    tags: ['baseline', 'stable'],
    isStarred: true
  })
  console.log(`Checkpoint created: ${checkpoint1.id}`)
  console.log(`Entry count: ${checkpoint1.entryCount}`)

  // Add more entries
  console.log('\n📝 Adding more entries...')
  await store.addEntries([
    {
      type: 'document',
      sourceId: 'doc3',
      content: 'Additional document 3',
      metadata: { timestamp: new Date().toISOString() },
      editable: true
    },
    {
      type: 'document',
      sourceId: 'doc4',
      content: 'Additional document 4',
      metadata: { timestamp: new Date().toISOString() },
      editable: true
    }
  ])

  // List all entries before rollback
  let allEntries = await store.getEntries()
  console.log(`\n📦 Total entries: ${allEntries.length}`)

  // Create another checkpoint
  console.log('\n💾 Creating checkpoint "Before Cleanup"...')
  const checkpoint2 = await store.createCheckpoint('Before Cleanup', {
    description: 'State before removing old entries',
    tags: ['pre-cleanup']
  })

  // List all checkpoints
  console.log('\n📋 All checkpoints:')
  const checkpoints = await store.getCheckpoints()
  checkpoints.forEach((cp, index) => {
    console.log(`\n${index + 1}. ${cp.name}`)
    console.log(`   ID: ${cp.id}`)
    console.log(`   Entries: ${cp.entryCount}`)
    console.log(`   Starred: ${cp.isStarred ? '⭐' : '☆'}`)
    console.log(`   Tags: ${cp.tags.join(', ')}`)
    if (cp.description) {
      console.log(`   Description: ${cp.description}`)
    }
  })

  // Rollback to first checkpoint
  console.log(`\n⏪  Rolling back to "${checkpoint1.name}"...`)
  const { restored, removed } = await store.rollbackToCheckpoint(checkpoint1.id)
  console.log(`Restored: ${restored} entries`)
  console.log(`Removed: ${removed} entries`)

  // Check entries after rollback
  allEntries = await store.getEntries()
  console.log(`\n📦 Total entries after rollback: ${allEntries.length}`)

  // Get latest starred checkpoint
  const stable = await store.getLatestStableCheckpoint()
  console.log(`\n⭐ Latest stable checkpoint: ${stable?.name || 'None'}`)

  // Star/unstar a checkpoint
  console.log('\n⭐ Starring checkpoint...')
  await store.setCheckpointStarred(checkpoint2.id, true)
  const updated = await store.getCheckpoint(checkpoint2.id)
  console.log(`Checkpoint "${updated?.name}" is now starred: ${updated?.isStarred}`)

  console.log('\n✅ Example complete!')
}

// Helper function to get checkpoint by ID
async function getCheckpoint(store: VectorStore, id: string) {
  const checkpoints = await store.getCheckpoints()
  return checkpoints.find(cp => cp.id === id) || null
}

checkpointExample().catch(console.error)
