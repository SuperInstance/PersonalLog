# @superinstance/multi-device-sync

> Multi-device synchronization system with offline support, conflict resolution, and multiple sync providers

## Features

- **Multiple Sync Providers**: LAN sync (WebRTC), self-hosted (WebDAV/S3), commercial cloud (Dropbox, Google Drive, OneDrive, iCloud)
- **Offline-First**: Queue changes when offline, automatically sync when connection restored
- **Conflict Resolution**: Intelligent conflict detection and resolution with multiple strategies
- **End-to-End Encryption**: AES-256-GCM for data, RSA-OAEP for key exchange
- **Real-Time Progress**: Track sync progress with detailed callbacks
- **Device Management**: Register, pair, and manage multiple devices
- **Delta Sync**: Only sync changed data for efficiency
- **Retry Logic**: Exponential backoff for failed syncs

## Installation

```bash
npm install @superinstance/multi-device-sync
```

## Quick Start

```typescript
import { initializeSyncEngine, sync, registerDevice } from '@superinstance/multi-device-sync'

// Initialize sync engine
const engine = await initializeSyncEngine({
  enabled: true,
  autoSync: true,
  syncInterval: 15, // 15 minutes
  encryptionEnabled: true,
})

// Register current device
await registerDevice('My Laptop')

// Register your data collectors
engine.registerDataCollector('conversations', async () => {
  // Return array of data deltas for your conversations
  return [
    {
      id: 'delta_1',
      type: 'update',
      collection: 'conversations',
      itemId: 'conv_1',
      data: { title: 'My Conversation', messages: [] },
      timestamp: Date.now(),
      deviceId: 'device_1',
      version: 1,
      applied: false,
    }
  ]
})

// Register your data appliers
engine.registerDataApplier('conversations', async (delta) => {
  // Apply the delta to your local storage
  console.log('Applying delta:', delta)
})

// Start sync
const result = await sync('bidirectional')
console.log(`Synced ${result.itemsSynced} items`)
```

## Sync Providers

### Local LAN Sync

Sync devices over local network using WebRTC. No internet required.

```typescript
import { SyncProviderFactory } from '@superinstance/multi-device-sync'

const localConfig = {
  type: 'local' as const,
  enabled: true,
  local: {
    deviceId: 'device_123',
    deviceName: 'My Laptop',
    discoveryEnabled: true,
    pairedDevices: [
      {
        deviceId: 'device_456',
        deviceName: 'My Phone',
        publicKey: 'base64_public_key',
        lastConnected: Date.now(),
        trusted: true,
      }
    ],
  },
}

const provider = await SyncProviderFactory.createProvider(localConfig)
await provider.initialize()
await provider.connect()
```

### Self-Hosted Sync

Sync to your own server using WebDAV, S3, or custom API.

```typescript
const selfHostedConfig = {
  type: 'self-hosted' as const,
  enabled: true,
  selfHosted: {
    url: 'https://sync.example.com',
    provider: 'webdav',
    username: 'user',
    password: 'pass',
  },
}

const provider = await SyncProviderFactory.createProvider(selfHostedConfig)
```

### Commercial Cloud Sync

Sync to commercial cloud providers.

```typescript
const commercialConfig = {
  type: 'commercial' as const,
  enabled: true,
  commercial: {
    service: 'dropbox',
    accessToken: 'your_access_token',
  },
}

const provider = await SyncProviderFactory.createProvider(commercialConfig)
```

## Conflict Resolution

Multiple strategies for resolving sync conflicts:

```typescript
import { ConflictResolution } from '@superinstance/multi-device-sync'

const strategies = {
  // Keep local version
  'keep-local': ConflictResolution.KeepLocal,

  // Keep remote version
  'keep-remote': ConflictResolution.KeepRemote,

  // Keep newer version (based on timestamp)
  'keep-newer': ConflictResolution.KeepNewer,

  // Keep older version
  'keep-older': ConflictResolution.KeepOlder,

  // Manually merge both versions
  'manual-merge': ConflictResolution.ManualMerge,

  // Automatically merge non-conflicting fields
  'smart-merge': ConflictResolution.SmartMerge,
}

// Configure default strategy
await engine.updateSettings({
  conflictResolution: 'keep-newer',
})

// Manually resolve a conflict
await engine.resolveConflict('conflict_id', 'keep-local')
```

## Offline Queue

Changes are automatically queued when offline and synced when connection is restored:

```typescript
import { getOfflineQueue } from '@superinstance/multi-device-sync'

const queue = await getOfflineQueue()
await queue.initialize()

// Get queue statistics
const stats = await queue.getQueueStats()
console.log(`Pending changes: ${stats.pendingChanges}`)
console.log(`Estimated sync time: ${stats.estimatedSyncTime}ms`)

// Listen to queue events
queue.onChange((change) => {
  console.log('New change queued:', change.delta.id)
})

queue.onSync((changes) => {
  console.log(`Syncing ${changes.length} changes`)
})
```

## End-to-End Encryption

Encrypt data before syncing:

```typescript
import { getSyncCryptography } from '@superinstance/multi-device-sync'

const crypto = await getSyncCryptography()
await crypto.initialize()

// Generate key pair for device
const keyPair = await crypto.getOrCreateKeyPair()

// Encrypt data for another device
const encrypted = await crypto.encryptForDevice(
  { sensitive: 'data' },
  recipientPublicKey,
  recipientKeyId
)

// Decrypt data from another device
const decrypted = await crypto.decryptFromDevice(encrypted)
```

## Sync Progress

Monitor sync progress in real-time:

```typescript
engine.onProgress((progress) => {
  console.log(`Stage: ${progress.stage}`)
  console.log(`Progress: ${progress.progress}%`)
  console.log(`Item: ${progress.currentItem} of ${progress.totalItems}`)
})

engine.onStatusChange((status) => {
  console.log('Status:', status)
  // 'idle' | 'syncing' | 'synced' | 'offline' | 'conflict' | 'error'
})
```

## Advanced Usage

### Custom Data Collection

```typescript
// Register collector for your data types
engine.registerDataCollector('messages', async () => {
  const messages = await db.messages.getAll()

  return messages.map(msg => ({
    id: `delta_${msg.id}`,
    type: 'update' as const,
    collection: 'messages' as const,
    itemId: msg.id,
    data: msg,
    timestamp: msg.updatedAt,
    deviceId: engine.currentDevice?.id || 'unknown',
    version: msg.version,
    applied: false,
  }))
})
```

### Custom Data Application

```typescript
// Register applier for your data types
engine.registerDataApplier('messages', async (delta) => {
  const message = delta.data as Message

  if (delta.type === 'create') {
    await db.messages.create(message)
  } else if (delta.type === 'update') {
    await db.messages.update(delta.itemId, message)
  } else if (delta.type === 'delete') {
    await db.messages.delete(delta.itemId)
  }
})
```

### Manual Sync Control

```typescript
// Pull only
await sync('pull')

// Push only
await sync('push');

// Bidirectional
await sync('bidirectional')
```

## API Reference

### SyncEngine

Main synchronization engine.

```typescript
class SyncEngine {
  // Initialize sync engine
  initialize(): Promise<void>

  // Start sync process
  sync(direction?: SyncDirection): Promise<SyncResult>

  // Register device
  registerDevice(deviceName: string): Promise<DeviceCredentials>

  // Get sync status
  getSyncStatus(): Promise<SyncStatusInfo>

  // Resolve conflict
  resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void>

  // Update settings
  updateSettings(updates: Partial<SyncSettings>): Promise<void>

  // Progress callbacks
  onProgress(callback: (progress: SyncProgress) => void): () => void
  onStatusChange(callback: (status: SyncStatus) => void): () => void

  // Cleanup
  cleanup(): Promise<void>

  // Register custom collectors/appliers
  registerDataCollector(collection: string, collector: () => Promise<DataDelta[]>): void
  registerDataApplier(collection: string, applier: (delta: DataDelta) => Promise<void>): void
}
```

## Types

```typescript
type SyncDirection = 'bidirectional' | 'pull' | 'push'

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'conflict' | 'error'

type ConflictResolution =
  | 'keep-local'
  | 'keep-remote'
  | 'keep-newer'
  | 'keep-older'
  | 'manual-merge'
  | 'smart-merge'

type CollectionType = 'conversations' | 'messages' | 'knowledge' | 'contacts' | 'settings' | 'personalization'
```

## License

MIT

## Repository

https://github.com/SuperInstance/multi-device-sync
