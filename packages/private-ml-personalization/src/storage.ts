/**
 * PersonalLog - Personalization Storage
 *
 * IndexedDB-based storage for user personalization models.
 */

import type { UserModel, StoredUserModel } from './types'

const DB_NAME = 'PersonalLogPersonalization'
const DB_VERSION = 1
const STORE_MODELS = 'user-models'

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

let db: IDBDatabase | null = null

async function getDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(new Error('Failed to open personalization database'))
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      // User models store
      if (!database.objectStoreNames.contains(STORE_MODELS)) {
        const store = database.createObjectStore(STORE_MODELS, { keyPath: 'userId' })
        store.createIndex('lastUpdated', 'model.learning.lastActionAt', { unique: false })
      }
    }
  })
}

// ============================================================================
// MODEL OPERATIONS
// ============================================================================

/**
 * Save user model to storage
 */
export async function saveUserModel(userId: string, model: UserModel): Promise<void> {
  const database = await getDB()

  const stored: StoredUserModel = {
    version: 1,
    userId,
    model,
    checksum: generateChecksum(model),
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MODELS], 'readwrite')
    const store = transaction.objectStore(STORE_MODELS)
    const request = store.put(stored)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Load user model from storage
 */
export async function loadUserModel(userId: string): Promise<UserModel | null> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MODELS], 'readonly')
    const store = transaction.objectStore(STORE_MODELS)
    const request = store.get(userId)

    request.onsuccess = () => {
      const result = request.result as StoredUserModel | undefined

      if (!result) {
        resolve(null)
        return
      }

      // Verify checksum
      const checksum = generateChecksum(result.model)
      if (checksum !== result.checksum) {
        console.warn('Personalization model checksum mismatch, data may be corrupted')
      }

      resolve(result.model)
    }

    request.onerror = () => reject(request.error)
  })
}

/**
 * Delete user model from storage
 */
export async function deleteUserModel(userId: string): Promise<void> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MODELS], 'readwrite')
    const store = transaction.objectStore(STORE_MODELS)
    const request = store.delete(userId)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * List all user models
 */
export async function listUserModels(): Promise<UserModel[]> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MODELS], 'readonly')
    const store = transaction.objectStore(STORE_MODELS)
    const request = store.getAll()

    request.onsuccess = () => {
      const results = request.result as StoredUserModel[]
      resolve(results.map(r => r.model))
    }

    request.onerror = () => reject(request.error)
  })
}

/**
 * Clear all user models
 */
export async function clearAllModels(): Promise<void> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MODELS], 'readwrite')
    const store = transaction.objectStore(STORE_MODELS)
    const request = store.clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ============================================================================
// EXPORT/IMPORT
// ============================================================================

/**
 * Export user model as JSON
 */
export async function exportUserModel(userId: string): Promise<string> {
  const model = await loadUserModel(userId)
  if (!model) {
    throw new Error(`User model for ${userId} not found`)
  }

  return JSON.stringify(model, null, 2)
}

/**
 * Import user model from JSON
 */
export async function importUserModel(userId: string, json: string): Promise<UserModel> {
  try {
    const model = JSON.parse(json) as UserModel

    // Validate basic structure
    if (!model.userId || model.userId !== userId) {
      throw new Error('User ID mismatch')
    }

    if (!model.preferences || !model.learning) {
      throw new Error('Invalid model structure')
    }

    // Save to storage
    await saveUserModel(userId, model)

    return model
  } catch (error) {
    throw new Error(`Failed to import user model: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Export user model as file download
 */
export async function exportUserModelAsFile(userId: string, filename?: string): Promise<void> {
  const json = await exportUserModel(userId)

  if (typeof window === 'undefined') {
    throw new Error('File export only works in browser environment')
  }

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `personallog-${userId}-${Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Import user model from file
 */
export async function importUserModelFromFile(userId: string, file: File): Promise<UserModel> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const json = e.target?.result as string
        const model = await importUserModel(userId, json)
        resolve(model)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

// ============================================================================
// BACKUP/RESTORE
// ============================================================================

/**
 * Create backup of all user models
 */
export async function createBackup(): Promise<string> {
  const models = await listUserModels()

  const backup = {
    version: 1,
    timestamp: new Date().toISOString(),
    models,
  }

  return JSON.stringify(backup, null, 2)
}

/**
 * Restore backup (replace all models)
 */
export async function restoreBackup(backupJson: string): Promise<void> {
  try {
    const backup = JSON.parse(backupJson)

    if (!backup.version || !backup.models) {
      throw new Error('Invalid backup format')
    }

    // Clear existing models
    await clearAllModels()

    // Restore from backup
    const promises = backup.models.map((model: UserModel) =>
      saveUserModel(model.userId, model)
    )

    await Promise.all(promises)
  } catch (error) {
    throw new Error(`Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate simple checksum for data integrity
 */
function generateChecksum(model: UserModel): string {
  const str = JSON.stringify(model)
  let hash = 0

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(16)
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  modelCount: number
  totalSize: number
  lastUpdated: string | null
}> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MODELS], 'readonly')
    const store = transaction.objectStore(STORE_MODELS)
    const countRequest = store.count()
    const getAllRequest = store.getAll()

    Promise.all([
      new Promise<number>((res, rej) => {
        countRequest.onsuccess = () => res(countRequest.result)
        countRequest.onerror = () => rej(countRequest.error)
      }),
      new Promise<StoredUserModel[]>((res, rej) => {
        getAllRequest.onsuccess = () => res(getAllRequest.result as StoredUserModel[])
        getAllRequest.onerror = () => rej(getAllRequest.error)
      }),
    ])
      .then(([count, models]) => {
        const totalSize = JSON.stringify(models).length
        const lastUpdated = models.length > 0
          ? models.reduce((latest, m) => {
              const updated = m.model.learning.lastActionAt
              return updated > latest ? updated : latest
            }, models[0].model.learning.lastActionAt)
          : null

        resolve({
          modelCount: count,
          totalSize,
          lastUpdated,
        })
      })
      .catch(reject)
  })
}

/**
 * Clear all personalization data (for privacy/delete account)
 */
export async function clearAllPersonalizationData(): Promise<void> {
  // Close database if open
  if (db) {
    db.close()
    db = null
  }

  // Delete entire database
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => {
      console.warn('Database deletion blocked, will close connections and retry')
      // Try again after a short delay
      setTimeout(() => {
        const retry = indexedDB.deleteDatabase(DB_NAME)
        retry.onsuccess = () => resolve()
        retry.onerror = () => reject(retry.error)
      }, 1000)
    }
  })
}
