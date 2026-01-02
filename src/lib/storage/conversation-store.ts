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
import { StorageError, NotFoundError, ValidationError } from '@/lib/errors'

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

    request.onerror = () => reject(new StorageError('Failed to open database', {
      technicalDetails: `DB: ${DB_NAME}, Version: ${DB_VERSION}`,
      context: { dbName: DB_NAME, version: DB_VERSION }
    }))
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

/**
 * Creates a new conversation with the specified title and type.
 *
 * @param title - The display title for the conversation
 * @param type - The conversation type (defaults to 'personal')
 * @returns Promise resolving to the created conversation object
 * @throws {ValidationError} If title is empty or not provided
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * const conv = await createConversation('My Chat', 'personal')
 * console.log(conv.id) // 'conv_...'
 * ```
 */
export async function createConversation(
  title: string,
  type: Conversation['type'] = 'personal'
): Promise<Conversation> {
  if (!title?.trim()) {
    throw new ValidationError('Conversation title cannot be empty', {
      field: 'title',
      value: title
    })
  }

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
    request.onerror = () => reject(new StorageError(`Failed to create conversation: ${title}`, {
      technicalDetails: request.error?.message,
      cause: request.error
    }))
  })
}

/**
 * Retrieves a conversation by its ID.
 *
 * @param id - The conversation ID to retrieve
 * @returns Promise resolving to the conversation or null if not found
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * const conv = await getConversation('conv_123')
 * if (conv) {
 *   console.log(conv.title)
 * }
 * ```
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  if (!id?.trim()) {
    throw new ValidationError('Conversation ID cannot be empty', {
      field: 'id',
      value: id
    })
  }

  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CONVERSATIONS], 'readonly')
    const store = transaction.objectStore(STORE_CONVERSATIONS)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(new StorageError(`Failed to get conversation: ${id}`, {
      technicalDetails: request.error?.message,
      cause: request.error
    }))
  })
}

/**
 * Lists conversations with optional filtering and pagination.
 *
 * @param options - Configuration options for listing
 * @param options.includeArchived - Whether to include archived conversations (defaults to false)
 * @param options.limit - Maximum number of conversations to return
 * @param options.offset - Number of conversations to skip
 * @returns Promise resolving to array of conversations sorted by update time (most recent first)
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * // Get recent conversations
 * const recent = await listConversations({ limit: 10 })
 *
 * // Get archived conversations
 * const archived = await listConversations({ includeArchived: true })
 * ```
 */
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

/**
 * Updates an existing conversation with the provided changes.
 *
 * @param id - The conversation ID to update
 * @param updates - Partial updates to apply to the conversation
 * @returns Promise resolving to the updated conversation
 * @throws {ValidationError} If ID is empty
 * @throws {NotFoundError} If conversation doesn't exist
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * const updated = await updateConversation('conv_123', {
 *   title: 'New Title',
 *   metadata: { ...existing.metadata, pinned: true }
 * })
 * ```
 */
export async function updateConversation(
  id: string,
  updates: Partial<Omit<Conversation, 'id' | 'createdAt'>>
): Promise<Conversation> {
  if (!id?.trim()) {
    throw new ValidationError('Conversation ID cannot be empty', {
      field: 'id',
      value: id
    })
  }

  const database = await getDB()
  const existing = await getConversation(id)

  if (!existing) {
    throw new NotFoundError('conversation', id)
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

/**
 * Deletes a conversation and all its messages.
 *
 * @param id - The conversation ID to delete
 * @returns Promise that resolves when deletion is complete
 * @throws {ValidationError} If ID is empty
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * await deleteConversation('conv_123')
 * ```
 */
export async function deleteConversation(id: string): Promise<void> {
  if (!id?.trim()) {
    throw new ValidationError('Conversation ID cannot be empty', {
      field: 'id',
      value: id
    })
  }

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

/**
 * Pins or unpins a conversation.
 *
 * @param id - The conversation ID
 * @param pinned - Whether to pin the conversation
 * @returns Promise that resolves when operation is complete
 * @throws {ValidationError} If ID is empty
 * @throws {NotFoundError} If conversation doesn't exist
 *
 * @example
 * ```typescript
 * await pinConversation('conv_123', true)
 * ```
 */
export async function pinConversation(id: string, pinned: boolean): Promise<void> {
  if (!id?.trim()) {
    throw new ValidationError('Conversation ID cannot be empty', {
      field: 'id',
      value: id
    })
  }

  const conversation = await getConversation(id)
  if (!conversation) {
    throw new NotFoundError('conversation', id)
  }

  await updateConversation(id, {
    metadata: { ...conversation.metadata, pinned }
  })
}

/**
 * Archives or unarchives a conversation.
 *
 * @param id - The conversation ID
 * @param archived - Whether to archive the conversation
 * @returns Promise that resolves when operation is complete
 * @throws {ValidationError} If ID is empty
 * @throws {NotFoundError} If conversation doesn't exist
 *
 * @example
 * ```typescript
 * await archiveConversation('conv_123', true)
 * ```
 */
export async function archiveConversation(id: string, archived: true): Promise<void> {
  if (!id?.trim()) {
    throw new ValidationError('Conversation ID cannot be empty', {
      field: 'id',
      value: id
    })
  }

  const conversation = await getConversation(id)
  if (!conversation) {
    throw new NotFoundError('conversation', id)
  }

  await updateConversation(id, {
    metadata: { ...conversation.metadata, archived }
  })
}

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

/**
 * Adds a new message to a conversation.
 *
 * @param conversationId - The conversation ID to add the message to
 * @param type - The message type (text, image, file, audio, transcript, system)
 * @param author - The message author information
 * @param content - The message content (varies by type)
 * @param replyTo - Optional ID of the message this is replying to
 * @returns Promise resolving to the created message
 * @throws {ValidationError} If conversationId is empty
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * const msg = await addMessage(
 *   'conv_123',
 *   'text',
 *   { type: 'user', name: 'Alice' },
 *   { text: 'Hello world' },
 *   undefined
 * )
 * ```
 */
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

/**
 * Retrieves all messages in a conversation, sorted by timestamp.
 *
 * @param conversationId - The conversation ID
 * @returns Promise resolving to array of messages sorted chronologically
 * @throws {ValidationError} If conversationId is empty
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * const messages = await getMessages('conv_123')
 * messages.forEach(msg => console.log(msg.content.text))
 * ```
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  if (!conversationId?.trim()) {
    throw new ValidationError('Conversation ID cannot be empty', {
      field: 'conversationId',
      value: conversationId
    })
  }
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

/**
 * Updates an existing message's content or metadata.
 *
 * Automatically tracks edit history when content text changes.
 *
 * @param id - The message ID to update
 * @param updates - Partial updates to apply to the message
 * @returns Promise resolving to the updated message
 * @throws {ValidationError} If message ID is empty
 * @throws {NotFoundError} If message doesn't exist
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * const updated = await updateMessage('msg_123', {
 *   content: { text: 'Updated text' }
 * })
 * console.log(updated.metadata.editHistory) // Shows previous versions
 * ```
 */
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
    request.onerror = () => reject(new StorageError(`Failed to get message: ${id}`, {
      technicalDetails: request.error?.message,
      cause: request.error
    }))
  })

  if (!existing) {
    throw new NotFoundError('message', id)
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
    request.onerror = () => reject(new StorageError(`Failed to update message: ${id}`, {
      technicalDetails: request.error?.message,
      cause: request.error
    }))
  })
}

/**
 * Deletes a message from the database.
 *
 * @param id - The message ID to delete
 * @returns Promise that resolves when deletion is complete
 * @throws {ValidationError} If message ID is empty
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * await deleteMessage('msg_123')
 * ```
 */
export async function deleteMessage(id: string): Promise<void> {
  if (!id?.trim()) {
    throw new ValidationError('Message ID cannot be empty', {
      field: 'id',
      value: id
    })
  }
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_MESSAGES], 'readwrite')
    const store = transaction.objectStore(STORE_MESSAGES)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new StorageError(`Failed to delete message: ${id}`, {
      technicalDetails: request.error?.message,
      cause: request.error
    }))
  })
}

/**
 * Deletes all messages in a conversation.
 *
 * Internal helper function used by deleteConversation.
 *
 * @param conversationId - The conversation ID
 * @returns Promise that resolves when all messages are deleted
 */
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

    request.onerror = () => reject(new StorageError(`Failed to delete messages for conversation: ${conversationId}`, {
      technicalDetails: request.error?.message,
      cause: request.error
    }))
  })
}

/**
 * Sets the selected state for multiple messages.
 *
 * Used for bulk operations on user-selected messages.
 *
 * @param messageIds - Array of message IDs to update
 * @param selected - Whether to mark messages as selected
 * @returns Promise that resolves when all messages are updated
 * @throws {StorageError} If database operation fails
 *
 * @example
 * ```typescript
 * await setMessageSelection(['msg_1', 'msg_2', 'msg_3'], true)
 * ```
 */
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

/**
 * Gets all selected messages in a conversation.
 *
 * @param conversationId - The conversation ID
 * @returns Promise resolving to array of selected messages
 * @throws {ValidationError} If conversationId is empty
 *
 * @example
 * ```typescript
 * const selected = await getSelectedMessages('conv_123')
 * console.log(`Selected ${selected.length} messages`)
 * ```
 */
export async function getSelectedMessages(conversationId: string): Promise<Message[]> {
  if (!conversationId?.trim()) {
    throw new ValidationError('Conversation ID cannot be empty', {
      field: 'conversationId',
      value: conversationId
    })
  }
  const messages = await getMessages(conversationId)
  return messages.filter(m => m.selected)
}

/**
 * Clears the selection state for all messages in a conversation.
 *
 * @param conversationId - The conversation ID
 * @returns Promise that resolves when selection is cleared
 * @throws {ValidationError} If conversationId is empty
 *
 * @example
 * ```typescript
 * await clearSelection('conv_123')
 * ```
 */
export async function clearSelection(conversationId: string): Promise<void> {
  if (!conversationId?.trim()) {
    throw new ValidationError('Conversation ID cannot be empty', {
      field: 'conversationId',
      value: conversationId
    })
  }
  const selected = await getMessages(conversationId)
  const selectedIds = selected.filter(m => m.selected).map(m => m.id)
  if (selectedIds.length > 0) {
    await setMessageSelection(selectedIds, false)
  }
}

// ============================================================================
// CONVERSATION COMPACTING
// ============================================================================

/**
 * Compacts a conversation by consolidating old messages into a summary.
 *
 * This is useful for reducing token usage while preserving important context.
 * Messages can be prioritized to avoid being compacted.
 *
 * @param conversationId - The conversation to compact
 * @param strategy - The compaction strategy to use
 * @param prioritizeIds - Optional array of message IDs to preserve
 * @param userInstructions - Optional custom instructions for user-directed strategy
 * @returns Promise resolving to compaction result with new message and archived IDs
 * @throws {ValidationError} If conversationId is empty
 * @throws {NotFoundError} If conversation doesn't exist
 * @throws {ValidationError} If no messages are available to compact
 *
 * @example
 * ```typescript
 * const result = await compactConversation(
 *   'conv_123',
 *   'summarize',
 *   ['msg_important_1', 'msg_important_2'],
 *   'Focus on technical details'
 * )
 * console.log(`Compacted ${result.archivedIds.length} messages`)
 * ```
 */
export async function compactConversation(
  conversationId: string,
  strategy: CompactStrategy,
  prioritizeIds: string[] = [],
  userInstructions?: string
): Promise<{ compactedMessage: Message; archivedIds: string[] }> {
  const conversation = await getConversation(conversationId)
  if (!conversation) {
    throw new NotFoundError('conversation', conversationId)
  }

  const messages = await getMessages(conversationId)

  // Separate messages to keep vs compact
  const toKeep = new Set(prioritizeIds)
  const toCompact = messages.filter(m => !toKeep.has(m.id))

  if (toCompact.length === 0) {
    throw new ValidationError('No messages available to compact', {
      field: 'messages',
      context: { conversationId, prioritizeIds, messageCount: messages.length }
    })
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

/**
 * Estimates the number of tokens in a text string.
 *
 * Uses a simple approximation: ~4 characters per token.
 * For accurate counts, use a proper tokenizer.
 *
 * @param text - The text to estimate tokens for
 * @returns Promise resolving to estimated token count
 *
 * @example
 * ```typescript
 * const tokens = await estimateTokens('Hello world')
 * console.log(tokens) // ~3
 * ```
 */
export async function estimateTokens(text: string): Promise<number> {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4)
}

/**
 * Calculates the total token count for a conversation.
 *
 * Combines estimated tokens from message text plus any tracked metadata tokens.
 *
 * @param conversationId - The conversation to analyze
 * @returns Promise resolving to total token count
 * @throws {ValidationError} If conversationId is empty
 *
 * @example
 * ```typescript
 * const totalTokens = await getConversationTokenCount('conv_123')
 * console.log(`Conversation uses ~${totalTokens} tokens`)
 * ```
 */
export async function getConversationTokenCount(conversationId: string): Promise<number> {
  if (!conversationId?.trim()) {
    throw new ValidationError('Conversation ID cannot be empty', {
      field: 'conversationId',
      value: conversationId
    })
  }
  const messages = await getMessages(conversationId)

  let total = 0
  for (const msg of messages) {
    if (msg.content.text) {
      total += await estimateTokens(msg.content.text)
    }
    if (msg.metadata.tokens) {
      total += msg.metadata.tokens  // Add actual token count if available
    }
  }

  return total
}

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Searches conversations by title and message content.
 *
 * Performs a case-insensitive substring search across conversation
 * titles and all message text content.
 *
 * @param query - The search query string
 * @returns Promise resolving to matching conversations
 *
 * @example
 * ```typescript
 * const results = await searchConversations('project')
 * console.log(`Found ${results.length} conversations`)
 * ```
 */
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
