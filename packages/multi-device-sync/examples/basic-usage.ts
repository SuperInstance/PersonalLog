/**
 * Basic Usage Example
 *
 * Demonstrates basic multi-device sync functionality
 */

import {
  initializeSyncEngine,
  sync,
  registerDevice,
  getSyncStatus,
  type SyncEngine,
  type DataDelta,
} from '../src'

// Sample data store (in real app, use your own storage)
interface Message {
  id: string
  text: string
  timestamp: number
  version: number
}

class MessageStore {
  private messages: Map<string, Message> = new Map()

  async getAll(): Promise<Message[]> {
    return Array.from(this.messages.values())
  }

  async get(id: string): Promise<Message | undefined> {
    return this.messages.get(id)
  }

  async create(message: Message): Promise<void> {
    this.messages.set(message.id, message)
  }

  async update(id: string, data: Partial<Message>): Promise<void> {
    const existing = this.messages.get(id)
    if (existing) {
      this.messages.set(id, { ...existing, ...data })
    }
  }

  async delete(id: string): Promise<void> {
    this.messages.delete(id)
  }
}

// Initialize
async function main() {
  const messageStore = new MessageStore()

  // Add some messages
  await messageStore.create({
    id: 'msg_1',
    text: 'Hello, world!',
    timestamp: Date.now(),
    version: 1,
  })

  // Initialize sync engine
  const engine = await initializeSyncEngine({
    enabled: true,
    autoSync: false, // We'll sync manually
    encryptionEnabled: true,
  })

  // Register device
  await registerDevice('My Device')

  // Register data collector
  engine.registerDataCollector('messages', async () => {
    const messages = await messageStore.getAll()

    return messages.map(msg => ({
      id: `delta_${msg.id}_${Date.now()}`,
      type: 'update',
      collection: 'messages' as const,
      itemId: msg.id,
      data: msg,
      timestamp: msg.timestamp,
      deviceId: 'current_device',
      version: msg.version,
      applied: false,
    }))
  })

  // Register data applier
  engine.registerDataApplier('messages', async (delta: DataDelta) => {
    const message = delta.data as Message

    if (delta.type === 'create' || delta.type === 'update') {
      await messageStore.create(message)
    } else if (delta.type === 'delete') {
      await messageStore.delete(delta.itemId)
    }
  })

  // Listen to progress
  engine.onProgress((progress: { progress: number; stage: string }) => {
    console.log(`Sync progress: ${progress.progress}% - ${progress.stage}`)
  })

  // Listen to status changes
  engine.onStatusChange((status: string) => {
    console.log('Sync status:', status)
  })

  // Perform sync
  try {
    const result = await sync('bidirectional')
    console.log('Sync complete:', {
      itemsSynced: result.itemsSynced,
      duration: result.duration,
      conflicts: result.conflicts.length,
    })
  } catch (error) {
    console.error('Sync failed:', error)
  }

  // Check status
  const status = await getSyncStatus()
  console.log('Current status:', status)
}

// Run example
main().catch(console.error)
