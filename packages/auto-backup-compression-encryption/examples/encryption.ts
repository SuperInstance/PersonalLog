/**
 * Encryption Example
 *
 * Demonstrates creating encrypted backups with password protection.
 */

import { createBackup, BackupCrypto } from '@superinstance/auto-backup-compression-encryption'

// Sensitive data that needs encryption
const sensitiveData = {
  credentials: {
    apiKey: 'sk-1234567890abcdef',
    apiSecret: 'secret-key-here'
  },
  personalInfo: {
    ssn: '123-45-6789',
    bankAccount: '987654321'
  }
}

// Create encrypted backup
async function createEncryptedBackup() {
  try {
    // Generate encryption key from password
    const password = 'my-secure-password'
    const salt = BackupCrypto.generateSalt()
    const key = await BackupCrypto.deriveKeyFromPassword(password, salt)

    // Encrypt the sensitive data
    const encrypted = await BackupCrypto.encryptSymmetric(sensitiveData, key)

    // Create backup with encrypted data
    const backup = await createBackup({
      data: {
        encrypted: encrypted,
        salt: salt, // Store salt for later decryption
        hint: 'Use your password to decrypt'
      },
      name: 'Encrypted Backup',
      compress: true
    })

    console.log('Encrypted backup created!')
    console.log(`Backup ID: ${backup.id}`)
    console.log(`Encryption: AES-256-GCM`)
    console.log(`Salt: ${salt}`)

    return { backupId: backup.id, password, salt }
  } catch (error) {
    console.error('Failed to create encrypted backup:', error)
  }
}

// Restore and decrypt backup
async function restoreEncryptedBackup(backupId: string, password: string, salt: string) {
  try {
    // Import getBackup function
    const { getBackup } = await import('@superinstance/auto-backup-compression-encryption')

    // Get the backup
    const backup = await getBackup(backupId)
    if (!backup) {
      throw new Error('Backup not found')
    }

    // Derive key from password
    const key = await BackupCrypto.deriveKeyFromPassword(password, salt)

    // Decrypt the data
    const decrypted = await BackupCrypto.decryptSymmetric(
      backup.data.encrypted,
      key
    )

    if (decrypted.verified) {
      console.log('Decryption successful!')
      console.log('Decrypted data:', decrypted.plaintext)
      return decrypted.plaintext
    } else {
      console.error('Checksum verification failed!')
    }
  } catch (error) {
    console.error('Failed to restore encrypted backup:', error)
  }
}

// Example with wrong password
async function wrongPasswordExample() {
  const { backupId, salt } = await createEncryptedBackup() || {}

  if (!backupId) {
    console.log('Could not create backup')
    return
  }

  console.log('\n--- Testing wrong password ---\n')

  try {
    await restoreEncryptedBackup(backupId, 'wrong-password', salt)
  } catch (error) {
    console.log('Expected error with wrong password:', error)
  }
}

// Run the example
async function runEncryptionExample() {
  console.log('=== Encryption Example ===\n')

  // Create encrypted backup
  const result = await createEncryptedBackup()

  if (!result) {
    console.log('Failed to create encrypted backup')
    return
  }

  const { backupId, password, salt } = result

  console.log('\n---\n')

  // Restore with correct password
  console.log('Restoring with correct password...\n')
  await restoreEncryptedBackup(backupId, password, salt)

  console.log('\n---\n')

  // Test with wrong password
  await wrongPasswordExample()
}

// Uncomment to run
// runEncryptionExample()
