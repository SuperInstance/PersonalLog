/**
 * Model Store
 *
 * IndexedDB storage for AI models and AI contacts.
 */

import type {
  ModelConfig,
  ModelProvider,
  AIContact,
  ContextFile,
  generateModelId,
  generateContactId,
} from './models'

const DB_NAME = 'PersonalLogModels'
const DB_VERSION = 1
const STORE_MODELS = 'models'
const STORE_CONTACTS = 'contacts'

let db: IDBDatabase | null = null

async function getDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(new Error('Failed to open models database'))
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      if (!database.objectStoreNames.contains(STORE_MODELS)) {
        const modelStore = database.createObjectStore(STORE_MODELS, { keyPath: 'id' })
        modelStore.createIndex('provider', 'provider', { unique: false })
        modelStore.createIndex('isActive', 'isActive', { unique: false })
      }

      if (!database.objectStoreNames.contains(STORE_CONTACTS)) {
        const contactStore = database.createObjectStore(STORE_CONTACTS, { keyPath: 'id' })
        contactStore.createIndex('baseModelId', 'baseModelId', { unique: false })
        contactStore.createIndex('nickname', 'nickname', { unique: false })
      }
    }
  })
}

// ============================================================================
// MODEL STORAGE
// ============================================================================

export async function addModel(model: Omit<ModelConfig, 'id' | 'createdAt'>): Promise<ModelConfig> {
  const database = await getDB()

  const newModel: ModelConfig = {
    ...model,
    id: `model_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    createdAt: new Date().toISOString(),
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MODELS], 'readwrite')
    const store = transaction.objectStore(STORE_MODELS)
    const request = store.add(newModel)

    request.onsuccess = () => resolve(newModel)
    request.onerror = () => reject(request.error)
  })
}

export async function listModels(provider?: ModelProvider): Promise<ModelConfig[]> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MODELS], 'readonly')
    const store = transaction.objectStore(STORE_MODELS)
    const request = store.getAll()

    request.onsuccess = () => {
      let models = request.result || []
      if (provider) {
        models = models.filter((m: ModelConfig) => m.provider === provider)
      }
      resolve(models)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function getModel(id: string): Promise<ModelConfig | null> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MODELS], 'readonly')
    const store = transaction.objectStore(STORE_MODELS)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function updateModel(id: string, updates: Partial<ModelConfig>): Promise<ModelConfig> {
  const database = await getDB()
  const existing = await getModel(id)

  if (!existing) {
    throw new Error(`Model ${id} not found`)
  }

  const updated: ModelConfig = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MODELS], 'readwrite')
    const store = transaction.objectStore(STORE_MODELS)
    const request = store.put(updated)

    request.onsuccess = () => resolve(updated)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteModel(id: string): Promise<void> {
  const database = await getDB()

  // Also delete all contacts that use this model
  const contacts = await listContacts(id)
  for (const contact of contacts) {
    await deleteContact(contact.id)
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MODELS], 'readwrite')
    const store = transaction.objectStore(STORE_MODELS)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function setModelActive(id: string, isActive: boolean): Promise<void> {
  await updateModel(id, { isActive })
}

// ============================================================================
// AI CONTACT STORAGE
// ============================================================================

export async function createContact(
  contact: Omit<AIContact, 'id' | 'createdAt' | 'updatedAt' | 'version'>
): Promise<AIContact> {
  const database = await getDB()

  const newContact: AIContact = {
    ...contact,
    id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CONTACTS], 'readwrite')
    const store = transaction.objectStore(STORE_CONTACTS)
    const request = store.add(newContact)

    request.onsuccess = () => resolve(newContact)
    request.onerror = () => reject(request.error)
  })
}

export async function listContacts(baseModelId?: string): Promise<AIContact[]> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CONTACTS], 'readonly')
    const store = transaction.objectStore(STORE_CONTACTS)
    const request = store.getAll()

    request.onsuccess = () => {
      let contacts = request.result || []
      if (baseModelId) {
        contacts = contacts.filter((c: AIContact) => c.baseModelId === baseModelId)
      }
      // Sort by updatedAt
      contacts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      resolve(contacts)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function getContact(id: string): Promise<AIContact | null> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CONTACTS], 'readonly')
    const store = transaction.objectStore(STORE_CONTACTS)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function updateContact(
  id: string,
  updates: Partial<Omit<AIContact, 'id' | 'createdAt' | 'version'>>
): Promise<AIContact> {
  const database = await getDB()
  const existing = await getContact(id)

  if (!existing) {
    throw new Error(`Contact ${id} not found`)
  }

  const updated: AIContact = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    version: existing.version,
    updatedAt: new Date().toISOString(),
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CONTACTS], 'readwrite')
    const store = transaction.objectStore(STORE_CONTACTS)
    const request = store.put(updated)

    request.onsuccess = () => resolve(updated)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteContact(id: string): Promise<void> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CONTACTS], 'readwrite')
    const store = transaction.objectStore(STORE_CONTACTS)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Create a new version of a contact (for research scenarios)
 */
export async function forkContact(
  originalId: string,
  updates: Partial<Omit<AIContact, 'id' | 'createdAt' | 'version' | 'parentContactId'>> = {}
): Promise<AIContact> {
  const original = await getContact(originalId)
  if (!original) {
    throw new Error(`Contact ${originalId} not found`)
  }

  return createContact({
    ...original,
    ...updates,
    parentContactId: originalId,
  })
}

// ============================================================================
// CONTEXT FILES
// ============================================================================

export async function addContextFile(
  contactId: string,
  file: Omit<ContextFile, 'id' | 'addedAt'>
): Promise<ContextFile> {
  const contact = await getContact(contactId)
  if (!contact) {
    throw new Error(`Contact ${contactId} not found`)
  }

  const newFile: ContextFile = {
    ...file,
    id: `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    addedAt: new Date().toISOString(),
  }

  await updateContact(contactId, {
    contextFiles: [...contact.contextFiles, newFile],
  })

  return newFile
}

export async function removeContextFile(contactId: string, fileId: string): Promise<void> {
  const contact = await getContact(contactId)
  if (!contact) {
    throw new Error(`Contact ${contactId} not found`)
  }

  await updateContact(contactId, {
    contextFiles: contact.contextFiles.filter(f => f.id !== fileId),
  })
}

// ============================================================================
// FILTER SETTINGS STORAGE
// ============================================================================

const FILTER_SETTINGS_KEY = 'filter_settings'

export async function getFilterSettings(): Promise<any> {
  if (typeof window === 'undefined') return {}

  const stored = localStorage.getItem(FILTER_SETTINGS_KEY)
  return stored ? JSON.parse(stored) : {}
}

export async function setFilterSettings(settings: any): Promise<void> {
  if (typeof window === 'undefined') return

  localStorage.setItem(FILTER_SETTINGS_KEY, JSON.stringify(settings))
}
