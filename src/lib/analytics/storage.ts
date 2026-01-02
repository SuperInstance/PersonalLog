/**
 * Analytics Storage
 *
 * IndexedDB-based storage for analytics events with efficient querying.
 */

import { AnalyticsEvent, AnalyticsConfig, DEFAULT_ANALYTICS_CONFIG } from './types'

// ============================================================================
// DATABASE CONSTANTS
// ============================================================================

const DB_NAME = 'PersonalLogAnalytics'
const DB_VERSION = 1
const STORE_EVENTS = 'events'
const STORE_METADATA = 'metadata'

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

let db: IDBDatabase | null = null

async function getDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(new Error('Failed to open analytics database'))
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      // Events store
      if (!database.objectStoreNames.contains(STORE_EVENTS)) {
        const eventStore = database.createObjectStore(STORE_EVENTS, { keyPath: 'id' })
        eventStore.createIndex('timestamp', 'timestamp', { unique: false })
        eventStore.createIndex('type', 'type', { unique: false })
        eventStore.createIndex('category', 'category', { unique: false })
        eventStore.createIndex('sessionId', 'sessionId', { unique: false })
      }

      // Metadata store
      if (!database.objectStoreNames.contains(STORE_METADATA)) {
        const metaStore = database.createObjectStore(STORE_METADATA, { keyPath: 'key' })
      }
    }
  })
}

// ============================================================================
// EVENT STORAGE
// ============================================================================

/**
 * Analytics event store interface
 */
export interface AnalyticsEventStore {
  addEvents(events: AnalyticsEvent[]): Promise<void>
  addEvent(event: AnalyticsEvent): Promise<void>
  getEvent(id: string): Promise<AnalyticsEvent | null>
  queryEvents(options: QueryOptions): Promise<AnalyticsEvent[]>
  deleteEvents(ids: string[]): Promise<void>
  deleteEventsBefore(date: string): Promise<number>
  countEvents(): Promise<number>
  clearAllEvents(): Promise<void>
}

/**
 * Query options for event storage
 */
interface QueryOptions {
  startTime?: string
  endTime?: string
  types?: string[]
  categories?: string[]
  sessionIds?: string[]
  limit?: number
  offset?: number
  sortOrder?: 'asc' | 'desc'
}

/**
 * IndexedDB implementation of analytics event store
 */
class IndexedDBAnalyticsStore implements AnalyticsEventStore {
  private config: AnalyticsConfig

  constructor(config: AnalyticsConfig = DEFAULT_ANALYTICS_CONFIG) {
    this.config = config
  }

  /**
   * Add multiple events in a transaction
   */
  async addEvents(events: AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return

    const database = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_EVENTS], 'readwrite')
      const store = transaction.objectStore(STORE_EVENTS)

      events.forEach(event => {
        store.put(event)
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Add a single event
   */
  async addEvent(event: AnalyticsEvent): Promise<void> {
    await this.addEvents([event])
  }

  /**
   * Get event by ID
   */
  async getEvent(id: string): Promise<AnalyticsEvent | null> {
    const database = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_EVENTS], 'readonly')
      const store = transaction.objectStore(STORE_EVENTS)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Query events with filters
   */
  async queryEvents(options: QueryOptions = {}): Promise<AnalyticsEvent[]> {
    const database = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_EVENTS], 'readonly')
      const store = transaction.objectStore(STORE_EVENTS)
      const index = store.index('timestamp')

      // Build range
      let range: IDBKeyRange | null = null
      if (options.startTime && options.endTime) {
        range = IDBKeyRange.bound(options.startTime, options.endTime)
      } else if (options.startTime) {
        range = IDBKeyRange.lowerBound(options.startTime)
      } else if (options.endTime) {
        range = IDBKeyRange.upperBound(options.endTime)
      }

      const direction = options.sortOrder === 'asc' ? 'next' : 'prev'
      const request = range ? index.openCursor(range, direction) : index.openCursor(null, direction)

      const results: AnalyticsEvent[] = []
      let skipped = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result

        if (cursor) {
          const evt = cursor.value as AnalyticsEvent

          // Apply filters
          if (options.types && !options.types.includes(evt.type)) {
            cursor.continue()
            return
          }

          if (options.categories && !options.categories.includes(evt.category)) {
            cursor.continue()
            return
          }

          if (options.sessionIds && !options.sessionIds.includes(evt.sessionId)) {
            cursor.continue()
            return
          }

          // Handle offset
          if (options.offset && skipped < options.offset) {
            skipped++
            cursor.continue()
            return
          }

          // Handle limit
          if (options.limit && results.length >= options.limit) {
            resolve(results)
            return
          }

          results.push(evt)
          cursor.continue()
        } else {
          resolve(results)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete events by IDs
   */
  async deleteEvents(ids: string[]): Promise<void> {
    if (ids.length === 0) return

    const database = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_EVENTS], 'readwrite')
      const store = transaction.objectStore(STORE_EVENTS)

      ids.forEach(id => {
        store.delete(id)
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Delete events before a certain date (for retention)
   */
  async deleteEventsBefore(date: string): Promise<number> {
    const database = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_EVENTS], 'readwrite')
      const store = transaction.objectStore(STORE_EVENTS)
      const index = store.index('timestamp')
      const range = IDBKeyRange.upperBound(date, true) // Exclude events exactly at the timestamp

      const request = index.openCursor(range)
      let count = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          count++
          cursor.continue()
        } else {
          resolve(count)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Count total events
   */
  async countEvents(): Promise<number> {
    const database = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_EVENTS], 'readonly')
      const store = transaction.objectStore(STORE_EVENTS)
      const request = store.count()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clear all events
   */
  async clearAllEvents(): Promise<void> {
    const database = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_EVENTS], 'readwrite')
      const store = transaction.objectStore(STORE_EVENTS)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

// ============================================================================
// METADATA STORAGE
// ============================================================================

/**
 * Metadata store interface
 */
interface MetadataStore {
  set(key: string, value: unknown): Promise<void>
  get(key: string): Promise<unknown>
  delete(key: string): Promise<void>
}

/**
 * IndexedDB implementation of metadata store
 */
class IndexedDBMetadataStore implements MetadataStore {
  async set(key: string, value: unknown): Promise<void> {
    const database = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_METADATA], 'readwrite')
      const store = transaction.objectStore(STORE_METADATA)
      const request = store.put({ key, value })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async get(key: string): Promise<unknown> {
    const database = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_METADATA], 'readonly')
      const store = transaction.objectStore(STORE_METADATA)
      const request = store.get(key)

      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.value : null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async delete(key: string): Promise<void> {
    const database = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_METADATA], 'readwrite')
      const store = transaction.objectStore(STORE_METADATA)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

// ============================================================================
// EXPORTED INSTANCES
// ============================================================================

/**
 * Global event store instance
 */
export const analyticsEventStore = new IndexedDBAnalyticsStore()

/**
 * Global metadata store instance
 */
export const analyticsMetadataStore: MetadataStore = new IndexedDBMetadataStore()

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Apply retention policy to old events
 */
export async function applyRetentionPolicy(retentionDays: number): Promise<number> {
  if (retentionDays === 0) return 0 // No retention

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
  const cutoffISO = cutoffDate.toISOString()

  return analyticsEventStore.deleteEventsBefore(cutoffISO)
}

/**
 * Get storage size estimate
 */
export async function getStorageSize(): Promise<{
  eventCount: number
  estimatedSizeBytes: number
}> {
  const eventCount = await analyticsEventStore.countEvents()

  // Rough estimation: average event ~500 bytes
  const estimatedSizeBytes = eventCount * 500

  return {
    eventCount,
    estimatedSizeBytes,
  }
}
