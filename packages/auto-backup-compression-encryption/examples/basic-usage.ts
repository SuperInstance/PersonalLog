/**
 * Basic Usage Example
 *
 * Demonstrates creating and restoring backups with minimal configuration.
 */

import { createBackup, restoreBackup } from '@superinstance/auto-backup-compression-encryption'

// Sample data to backup
const appData = {
  users: [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' }
  ],
  settings: {
    theme: 'dark',
    language: 'en',
    notifications: true
  },
  posts: [
    { id: 1, title: 'First Post', content: 'Hello World!' },
    { id: 2, title: 'Second Post', content: 'More content' }
  ]
}

// Create a backup
async function basicBackupExample() {
  try {
    const backup = await createBackup({
      data: appData,
      name: 'My App Backup',
      compress: true
    })

    console.log('Backup created successfully!')
    console.log(`ID: ${backup.id}`)
    console.log(`Name: ${backup.name}`)
    console.log(`Size: ${backup.compressedSize} bytes`)
    console.log(`Compression: ${backup.compression}`)
    console.log(`Checksum: ${backup.checksum}`)

    return backup.id
  } catch (error) {
    console.error('Backup failed:', error)
  }
}

// Restore from backup
async function basicRestoreExample(backupId: string) {
  try {
    const result = await restoreBackup(backupId, {
      verifyBeforeRestore: true
    })

    if (result.success) {
      console.log('Restore successful!')
      console.log('Restored data:', result.data)
      console.log('Items restored:', result.itemsRestored)
      console.log('Duration:', result.duration, 'ms')
    } else {
      console.error('Restore failed:', result.errors)
    }
  } catch (error) {
    console.error('Restore failed:', error)
  }
}

// Run the example
async function runExample() {
  console.log('=== Basic Backup/Restore Example ===\n')

  // Create backup
  const backupId = await basicBackupExample()
  if (!backupId) {
    console.log('Backup creation failed')
    return
  }

  console.log('\n---\n')

  // Restore backup
  await basicRestoreExample(backupId)
}

// Uncomment to run
// runExample()
