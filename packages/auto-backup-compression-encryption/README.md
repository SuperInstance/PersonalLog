# @superinstance/auto-backup-compression-encryption

> Automatic backup system with compression and encryption for browser-based applications

A comprehensive, production-ready backup library for JavaScript/TypeScript applications running in browser environments. Provides automatic backups, gzip compression, AES-256 encryption, integrity verification, and IndexedDB persistence.

## Features

- **Automatic Backups** - Schedule daily, weekly, or monthly backups
- **Compression** - Built-in gzip compression for reduced storage (60-85% size reduction)
- **Encryption** - AES-256-GCM encryption for sensitive data
- **Integrity Verification** - SHA-256 checksums ensure data integrity
- **IndexedDB Storage** - Efficient browser-based backup storage
- **Generic Design** - Works with any JSON-serializable data
- **TypeScript Support** - Full TypeScript definitions included
- **Zero Dependencies** - Uses only browser native APIs
- **Progress Tracking** - Real-time progress callbacks for long operations
- **Import/Export** - Download backups as files, restore from uploads

## Installation

```bash
npm install @superinstance/auto-backup-compression-encryption
```

## Quick Start

```typescript
import { createBackup, restoreBackup } from '@superinstance/auto-backup-compression-encryption'

// Create a backup
const backup = await createBackup({
  data: {
    users: [{ id: 1, name: 'Alice' }],
    settings: { theme: 'dark' }
  },
  name: 'My Backup',
  compress: true
})

console.log(`Backup created: ${backup.id}`)
console.log(`Size: ${backup.compressedSize} bytes`)

// Restore from backup
const result = await restoreBackup(backup.id, {
  verifyBeforeRestore: true
})

if (result.success) {
  console.log('Restored data:', result.data)
}
```

## Use Cases

- **Data Persistence** - Automatic backups of application state
- **Export/Import** - Let users download and restore their data
- **Version Control** - Create snapshots before major changes
- **Disaster Recovery** - Restore from backups after data loss
- **Migration** - Transfer data between devices or environments
- **Archival** - Long-term storage of historical data

## Core Concepts

### Backup

A `Backup` contains:

- **Metadata** - ID, timestamp, name, description, tags
- **Data** - Your JSON-serializable application data
- **Compression** - Gzip compression status and ratios
- **Encryption** - Encryption algorithm and metadata
- **Checksum** - SHA-256 hash for integrity verification

### Compression

Automatically compresses backup data using the browser's native `CompressionStream` API:

```typescript
import { compressData, decompressData } from '@superinstance/auto-backup-compression-encryption'

// Compress data
const compressed = await compressData('{"large":"data"}')
console.log(`Reduced to ${compressed.length} bytes`)

// Decompress data
const original = await decompressData(compressed)
console.log(original) // '{"large":"data"}'
```

### Encryption

Secure encryption using Web Crypto API:

```typescript
import { BackupCrypto } from '@superinstance/auto-backup-compression-encryption'

// Derive key from password
const salt = BackupCrypto.generateSalt()
const key = await BackupCrypto.deriveKeyFromPassword('my-password', salt)

// Encrypt data
const encrypted = await BackupCrypto.encryptSymmetric(
  { sensitive: 'data' },
  key
)

// Decrypt data
const decrypted = await BackupCrypto.decryptSymmetric(encrypted, key)
console.log(decrypted.plaintext) // { sensitive: 'data' }
```

## API Reference

### createBackup

Create a new backup with automatic compression and checksums.

```typescript
const backup = await createBackup({
  data: myData,              // Required: Your JSON-serializable data
  name: 'My Backup',         // Optional: Backup name
  type: 'full',              // Optional: 'full' | 'incremental'
  compress: true,            // Optional: Enable compression (default: true)
  tags: ['production'],      // Optional: Tags for categorization
  isAutomatic: false,        // Optional: Mark as automatic backup
  onProgress: (progress) => { // Optional: Progress callback
    console.log(`${progress.stage}: ${progress.progress}%`)
  }
})
```

### restoreBackup

Restore data from a backup with optional verification.

```typescript
const result = await restoreBackup('backup_id', {
  verifyBeforeRestore: true,  // Optional: Verify checksum before restore
  createPreRestoreBackup: false, // Optional: Backup current state first
  categories: ['users'],      // Optional: Only restore specific categories
  onProgress: (progress) => {
    console.log(`${progress.stage}: ${progress.progress}%`)
  },
  onConfirm: async (preview) => {
    // Optional: Confirm before restore
    return confirm(`Restore ${preview.backupName}?`)
  }
})

if (result.success) {
  console.log('Restored:', result.data)
}
```

### listBackups

List all stored backups with filtering.

```typescript
import { listBackups } from '@superinstance/auto-backup-compression-encryption'

// Get all backups
const backups = await listBackups()

// Filter by type
const fullBackups = await listBackups({ type: 'full' })

// Limit results
const recent = await listBackups({ limit: 10 })

// Pagination
const page1 = await listBackups({ offset: 0, limit: 20 })
```

### deleteBackup

Delete a backup by ID.

```typescript
import { deleteBackupById } from '@superinstance/auto-backup-compression-encryption'

await deleteBackupById('backup_id')
```

### downloadBackup

Download a backup as a file blob.

```typescript
import { downloadBackup } from '@superinstance/auto-backup-compression-encryption'

const blob = await downloadBackup('backup_id')

// Trigger download in browser
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'backup.json.gz'
a.click()
URL.revokeObjectURL(url)
```

### restoreFromUploadedFile

Restore from a user-uploaded backup file.

```typescript
import { restoreFromUploadedFile } from '@superinstance/auto-backup-compression-encryption'

// From file input
const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')
const file = fileInput.files[0]

const result = await restoreFromUploadedFile(file)
if (result.success) {
  console.log('Restored:', result.data)
}
```

### verifyBackup

Verify backup integrity with checksums.

```typescript
import { verifyBackup } from '@superinstance/auto-backup-compression-encryption'

const verification = await verifyBackup(backup)

if (verification.valid) {
  console.log('Backup is valid')
} else {
  console.error('Backup errors:', verification.integrityChecks)
}
```

## Examples

### Example 1: Automatic Daily Backups

```typescript
import { createBackup } from '@superinstance/auto-backup-compression-encryption'

// Create automatic daily backup
async function dailyBackup() {
  const backup = await createBackup({
    data: getApplicationState(), // Your function to get current state
    name: `Daily Backup ${new Date().toLocaleDateString()}`,
    isAutomatic: true,
    compress: true,
    tags: ['daily', 'automatic']
  })

  console.log(`Backup ${backup.id} created successfully`)
}

// Run every day at 2 AM
setInterval(() => {
  const hour = new Date().getHours()
  if (hour === 2) {
    dailyBackup()
  }
}, 60 * 60 * 1000) // Check every hour
```

### Example 2: Export/Import User Data

```typescript
import { createBackup, downloadBackup, restoreFromUploadedFile } from '@superinstance/auto-backup-compression-encryption'

// Export button
async function exportUserData() {
  const backup = await createBackup({
    data: {
      userData: getUserData(),
      preferences: getUserPreferences()
    },
    name: 'User Export',
    compress: true
  })

  const blob = await downloadBackup(backup.id)
  downloadBlob(blob, 'my-data.json.gz')
}

// Import button
async function importUserData(file: File) {
  const result = await restoreFromUploadedFile(file, {
    verifyBeforeRestore: true,
    onConfirm: async (preview) => {
      return confirm(`Import ${preview.itemsToRestore} items?`)
    }
  })

  if (result.success) {
    applyUserData(result.data)
    alert('Data imported successfully!')
  }
}
```

### Example 3: Encrypted Backups

```typescript
import { createBackup, BackupCrypto } from '@superinstance/auto-backup-compression-encryption'

async function createEncryptedBackup(data: any, password: string) {
  // Generate encryption key from password
  const salt = BackupCrypto.generateSalt()
  const key = await BackupCrypto.deriveKeyFromPassword(password, salt)

  // Encrypt sensitive data
  const encrypted = await BackupCrypto.encryptSymmetric(data, key)

  // Create backup with encrypted data
  const backup = await createBackup({
    data: {
      encrypted: encrypted,
      salt: salt // Store salt for decryption
    },
    name: 'Encrypted Backup',
    compress: true
  })

  return backup
}

async function restoreEncryptedBackup(backupId: string, password: string) {
  const backup = await getBackup(backupId)

  // Derive key from password
  const key = await BackupCrypto.deriveKeyFromPassword(password, backup.data.salt)

  // Decrypt data
  const decrypted = await BackupCrypto.decryptSymmetric(backup.data.encrypted, key)

  return decrypted.plaintext
}
```

### Example 4: Backup with Progress Tracking

```typescript
import { createBackup } from '@superinstance/auto-backup-compression-encryption'

async function createBackupWithProgress(data: any) {
  const backup = await createBackup({
    data: data,
    name: 'Large Backup',
    compress: true,
    onProgress: (progress) => {
      const progressBar = document.getElementById('progress')
      const progressText = document.getElementById('progress-text')

      if (progressBar) {
        progressBar.style.width = `${progress.progress}%`
      }

      if (progressText) {
        progressText.textContent = `${progress.stage}: ${progress.message}`
      }

      console.log(`[${progress.stage}] ${progress.progress}%: ${progress.message}`)
    }
  })

  return backup
}
```

## Browser Support

- **Chrome/Edge** 80+ (CompressionStream support)
- **Firefox** 113+ (CompressionStream support)
- **Safari** 16.4+ (CompressionStream support)

For older browsers, consider using a polyfill for `CompressionStream`/`DecompressionStream`.

## Storage

Backups are stored in IndexedDB using a dedicated database named `AutoBackupSystem`. This provides:

- **Large Capacity** - Typically hundreds of MB or GB depending on disk space
- **Async Operations** - Non-blocking backup/restore operations
- **Transaction Safety** - ACID guarantees for data integrity
- **Browser Isolation** - Each origin has isolated storage

## Performance

Typical compression ratios for different data types:

| Data Type | Original | Compressed | Ratio |
|-----------|----------|------------|-------|
| JSON text | 1 MB | 200 KB | 80% |
| Array data | 5 MB | 1.2 MB | 76% |
| Repetitive | 10 MB | 500 KB | 95% |
| Binary | 1 MB | 950 KB | 5% |

## Security Considerations

- **Encryption Keys** - Never store encryption keys in localStorage or backup data
- **Password Derivation** - Uses PBKDF2 with 100,000 iterations
- **Key Length** - AES-256-GCM provides 256-bit security
- **Integrity** - SHA-256 checksums detect tampering
- **HTTPS** - Always use HTTPS when transmitting encrypted backups

## Limitations

- **Browser Only** - Requires browser environment (IndexedDB, Web Crypto API)
- **Storage Quota** - Limited by browser storage quota
- **JSON Only** - Data must be JSON-serializable
- **Single Origin** - Backups cannot be shared across origins

## License

MIT

## Repository

https://github.com/SuperInstance/Auto-Backup-Compression-Encryption

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Support

- **Issues**: https://github.com/SuperInstance/Auto-Backup-Compression-Encryption/issues
- **Discussions**: https://github.com/SuperInstance/Auto-Backup-Compression-Encryption/discussions
