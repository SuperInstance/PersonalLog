/**
 * Conversation Store
 *
 * IndexedDB-based storage for conversations and messages.
 * Supports offline operation and local-first approach.
 */

import {
  Conversation,
  ConversationId,
  createConversationId,
  createMessageId,
  Message,
  MessageAuthor,
  CompactStrategy,
} from '@/types/conversation'

const DB_NAME = 'PersonalLogMessenger'
const DB_VERSION = 1
const STORE_CONVERSATIONS = 'conversations'
const STORE_MESSAGES = 'messages'
const STORE_AGENTS = 'ai-agents'

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

let db: IDBDatabase | null = null

async function getDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(new Error('Failed to open database'))
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      // Conversations store
      if (!database.objectStoreNames.contains(STORE_CONVERSATIONS)) {
        const convStore = database.createObjectStore(STORE_CONVERSATIONS, { keyPath: 'id' })
        convStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        convStore.createIndex('pinned', 'metadata.pinned', { unique: false })
        convStore.createIndex('archived', 'metadata.archived', { unique: false })
      }

      // Messages store
      if (!database.objectStoreNames.contains(STORE_MESSAGES)) {
        const msgStore = database.createObjectStore(STORE_MESSAGES, { keyPath: 'id' })
        msgStore.createIndex('conversationId', 'conversationId', { unique: false })
        msgStore.createIndex('timestamp', 'timestamp', { unique: false })
      }

      // AI Agents store
      if (!database.objectStoreNames.contains(STORE_AGENTS)) {
        const agentStore = database.createObjectStore(STORE_AGENTS, { keyPath: 'id' })
        agentStore.createIndex('name', 'name', { unique: false })
      }
    }
  })
}

// ============================================================================
// CONVERSATION OPERATIONS
// ============================================================================

export async function createConversation(
  title: string,
  type: Conversation['type'] = 'personal'
): Promise<Conversation> {
  const database = await getDB()
  const id = createConversationId()
  const now = new Date().toISOString()

  const conversation: Conversation = {
    id,
    title,
    type,
    createdAt: now,
    updatedAt: now,
    messages: [],
    aiContacts: [],
    settings: {
      responseMode: 'messenger',
      compactOnLimit: true,
      compactStrategy: 'summarize',
    },
    metadata: {
      messageCount: 0,
      totalTokens: 0,
      hasMedia: false,
      tags: [],
      pinned: false,
      archived: false,
    },
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CONVERSATIONS], 'readwrite')
    const store = transaction.objectStore(STORE_CONVERSATIONS)
    const request = store.add(conversation)

    request.onsuccess = () => resolve(conversation)
    request.onerror = () => reject(request.error)
  })
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CONVERSATIONS], 'readonly')
    const store = transaction.objectStore(STORE_CONVERSATIONS)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function listConversations(options: {
  includeArchived?: boolean
  limit?: number
  offset?: number
} = {}): Promise<Conversation[]> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CONVERSATIONS], 'readonly')
    const store = transaction.objectStore(STORE_CONVERSATIONS)
    const index = store.index('updatedAt')
    const request = index.openCursor(null, 'prev')  // Most recent first

    const results: Conversation[] = []
    let skipped = 0

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result

      if (cursor) {
        const conv = cursor.value as Conversation

        // Filter archived if not requested
        if (!options.includeArchived && conv.metadata.archived) {
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

        results.push(conv)
        cursor.continue()
      } else {
        resolve(results)
      }
    }

    request.onerror = () => reject(request.error)
  })
}

export async function updateConversation(
  id: string,
  updates: Partial<Omit<Conversation, 'id' | 'createdAt'>>
): Promise<Conversation> {
  const database = await getDB()
  const existing = await getConversation(id)

  if (!existing) {
    throw new Error(`Conversation ${id} not found`)
  }

  const updated: Conversation = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CONVERSATIONS], 'readwrite')
    const store = transaction.objectStore(STORE_CONVERSATIONS)
    const request = store.put(updated)

    request.onsuccess = () => resolve(updated)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteConversation(id: string): Promise<void> {
  const database = await getDB()

  // First delete all messages in the conversation
  await deleteMessagesByConversation(id)

  // Then delete the conversation
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CONVERSATIONS], 'readwrite')
    const store = transaction.objectStore(STORE_CONVERSATIONS)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function pinConversation(id: string, pinned: boolean): Promise<void> {
  const conversation = await getConversation(id)
  if (!conversation) throw new Error('Conversation not found')

  await updateConversation(id, {
    metadata: { ...conversation.metadata, pinned }
  })
}

export async function archiveConversation(id: string, archived: true): Promise<void> {
  const conversation = await getConversation(id)
  if (!conversation) throw new Error('Conversation not found')

  await updateConversation(id, {
    metadata: { ...conversation.metadata, archived }
  })
}

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

export async function addMessage(
  conversationId: string,
  type: Message['type'],
  author: MessageAuthor,
  content: Omit<Message['content'], 'audioTranscript' | 'compaction' | 'systemNote'> & Partial<Pick<Message['content'], 'audioTranscript' | 'compaction' | 'systemNote'>>,
  replyTo?: string
): Promise<Message> {
  const database = await getDB()

  const message: Message = {
    id: createMessageId(),
    conversationId,
    type,
    author,
    content: content as Message['content'],
    timestamp: new Date().toISOString(),
    replyTo,
    metadata: {},
  }

  // Add message
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction([STORE_MESSAGES], 'readwrite')
    const store = transaction.objectStore(STORE_MESSAGES)
    const request = store.add(message)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })

  // Update conversation metadata
  const conversation = await getConversation(conversationId)
  if (conversation) {
    await updateConversation(conversationId, {
      updatedAt: message.timestamp,
      metadata: {
        ...conversation.metadata,
        messageCount: conversation.metadata.messageCount + 1,
        hasMedia: conversation.metadata.hasMedia || ['image', 'file', 'audio', 'transcript'].includes(type),
      },
    })
  }

  return message
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MESSAGES], 'readonly')
    const index = transaction.objectStore(STORE_MESSAGES).index('conversationId')
    const request = index.getAll(conversationId)

    request.onsuccess = () => {
      const messages = (request.result || []) as Message[]
      // Sort by timestamp
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      resolve(messages)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function updateMessage(
  id: string,
  updates: Partial<Omit<Message, 'id' | 'conversationId' | 'timestamp'>>
): Promise<Message> {
  const database = await getDB()

  // First get the existing message
  const existing = await new Promise<Message | null>((resolve, reject) => {
    const transaction = database.transaction([STORE_MESSAGES], 'readonly')
    const store = transaction.objectStore(STORE_MESSAGES)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })

  if (!existing) {
    throw new Error(`Message ${id} not found`)
  }

  // Track edit history if content changed
  let editHistory = existing.metadata.editHistory || []
  if (updates.content && updates.content.text !== existing.content.text) {
    editHistory = [
      ...editHistory,
      {
        timestamp: new Date().toISOString(),
        previousContent: existing.content.text || '',
      }
    ]
  }

  const updated: Message = {
    ...existing,
    ...updates,
    id: existing.id,
    conversationId: existing.conversationId,
    timestamp: existing.timestamp,
    metadata: {
      ...existing.metadata,
      ...updates.metadata,
      editHistory,
    },
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MESSAGES], 'readwrite')
    const store = transaction.objectStore(STORE_MESSAGES)
    const request = store.put(updated)

    request.onsuccess = () => resolve(updated)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteMessage(id: string): Promise<void> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MESSAGES], 'readwrite')
    const store = transaction.objectStore(STORE_MESSAGES)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function deleteMessagesByConversation(conversationId: string): Promise<void> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MESSAGES], 'readwrite')
    const index = transaction.objectStore(STORE_MESSAGES).index('conversationId')
    const request = index.openCursor(IDBKeyRange.only(conversationId))

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else {
        resolve()
      }
    }

    request.onerror = () => reject(request.error)
  })
}

export async function setMessageSelection(
  messageIds: string[],
  selected: boolean
): Promise<void> {
  const database = await getDB()

  const promises = messageIds.map(id =>
    new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([STORE_MESSAGES], 'readwrite')
      const store = transaction.objectStore(STORE_MESSAGES)
      const getReq = store.get(id)

      getReq.onsuccess = () => {
        const msg = getReq.result
        if (msg) {
          msg.selected = selected
          const putReq = store.put(msg)
          putReq.onsuccess = () => resolve()
          putReq.onerror = () => reject(putReq.error)
        } else {
          resolve()
        }
      }
      getReq.onerror = () => reject(getReq.error)
    })
  )

  await Promise.all(promises)
}

export async function getSelectedMessages(conversationId: string): Promise<Message[]> {
  const messages = await getMessages(conversationId)
  return messages.filter(m => m.selected)
}

export async function clearSelection(conversationId: string): Promise<void> {
  const selected = await getMessages(conversationId)
  const selectedIds = selected.filter(m => m.selected).map(m => m.id)
  if (selectedIds.length > 0) {
    await setMessageSelection(selectedIds, false)
  }
}

// ============================================================================
// CONVERSATION COMPACTING
// ============================================================================

export async function compactConversation(
  conversationId: string,
  strategy: CompactStrategy,
  prioritizeIds: string[] = [],
  userInstructions?: string
): Promise<{ compactedMessage: Message; archivedIds: string[] }> {
  const conversation = await getConversation(conversationId)
  if (!conversation) throw new Error('Conversation not found')

  const messages = await getMessages(conversationId)

  // Separate messages to keep vs compact
  const toKeep = new Set(prioritizeIds)
  const toCompact = messages.filter(m => !toKeep.has(m.id))

  if (toCompact.length === 0) {
    throw new Error('No messages to compact')
  }

  // Generate summary based on strategy
  let summary = ''
  let preserved: string[] = []

  switch (strategy) {
    case 'summarize':
      summary = generateSummary(toCompact, userInstructions)
      break
    case 'extract-key':
      const result = extractKeyPoints(toCompact)
      summary = result.summary
      preserved = result.points
      break
    case 'user-directed':
      summary = userInstructions || 'Conversation compacted per user instructions.'
      break
  }

  // Create compaction message
  const compactedMessage: Message = {
    id: createMessageId(),
    conversationId,
    type: 'system',
    author: { type: 'system', reason: 'compaction' },
    content: {
      systemNote: `Earlier conversation compacted (${toCompact.length} messages)`,
      compaction: {
        originalMessageCount: toCompact.length,
        originalMessageIds: toCompact.map(m => m.id),
        summary,
        preserved,
        compactedAt: new Date().toISOString(),
      },
    },
    timestamp: new Date().toISOString(),
    metadata: {},
  }

  // Add compaction message
  await addMessage(
    conversationId,
    'system',
    { type: 'system', reason: 'compaction' },
    {
      systemNote: compactedMessage.content.systemNote,
      compaction: compactedMessage.content.compaction,
    }
  )

  // Delete compacted messages (or mark them for archive)
  // For now, we'll delete them but in production they'd be archived
  for (const msg of toCompact) {
    await deleteMessage(msg.id)
  }

  return {
    compactedMessage,
    archivedIds: toCompact.map(m => m.id),
  }
}

function generateSummary(messages: Message[], instructions?: string): string {
  // Simple summary generation - in production, use AI
  const userMessages = messages.filter(m => m.author === 'user')
  const aiMessages = messages.filter(m => m.author !== 'user')

  if (instructions) {
    return `${instructions}\n\nThis summary covers ${messages.length} messages from ${userMessages.length} user contributions and ${aiMessages.length} AI responses.`
  }

  return `Conversation summary covering ${messages.length} messages. Topics discussed included various points with ${userMessages.length} user messages and ${aiMessages.length} AI responses.`
}

function extractKeyPoints(messages: Message[]): { summary: string; points: string[] } {
  const userTexts = messages
    .filter(m => m.author === 'user' && m.content.text)
    .map(m => m.content.text!)

  // Simple key point extraction - in production, use AI
  const points = userTexts.slice(0, 5)  // Keep first 5 user messages verbatim
  const summary = `Key points from ${messages.length} messages: ${userTexts.length - points.length} additional messages were summarized.`

  return { summary, points }
}

// ============================================================================
// TOKEN COUNTING
// ============================================================================

export async function estimateTokens(text: string): Promise<number> {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4)
}

export async function getConversationTokenCount(conversationId: string): Promise<number> {
  const messages = await getMessages(conversationId)

  let total = 0
  for (const msg of messages) {
    if (msg.content.text) {
      total += await estimateTokens(msg.content.text)
    }
    if (msg.metadata.tokens) {
      total = msg.metadata.tokens  // Use actual token count if available
    }
  }

  return total
}

// ============================================================================
// SEARCH
// ============================================================================

export async function searchConversations(query: string): Promise<Conversation[]> {
  const all = await listConversations({ includeArchived: false, limit: 100 })

  if (!query.trim()) return all

  const lowerQuery = query.toLowerCase()

  // Search in conversation titles and messages
  const results: Conversation[] = []

  for (const conv of all) {
    // Check title
    if (conv.title.toLowerCase().includes(lowerQuery)) {
      results.push(conv)
      continue
    }

    // Check messages
    const messages = await getMessages(conv.id)
    const hasMatchingMessage = messages.some(m =>
      m.content.text?.toLowerCase().includes(lowerQuery)
    )

    if (hasMatchingMessage) {
      results.push(conv)
    }
  }

  return results
}
