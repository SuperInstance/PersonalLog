/**
 * Vector Store - Self-Improving Knowledge System
 *
 * Dual storage system:
 * 1. Vector DB - Embeddings for semantic search (invisible worker)
 * 2. Standard DB - Editable twin with full content (user browsable)
 *
 * Supports checkpoints, rollback, and LoRA training export.
 *
 * Performance: Uses WASM-accelerated vector operations when available,
 * with automatic JavaScript fallback for unsupported browsers.
 */

import { listConversations, getMessages } from '@/lib/storage/conversation-store'
import { listContacts } from '@/lib/wizard/model-store'
import { getVectorOps } from '@/lib/native/bridge'
import { StorageError, NotFoundError, ValidationError } from '@/lib/errors'
import {
  cosineSimilarity,
  estimateTokens as estimateTokensUtil,
  DEFAULT_EMBEDDING_DIM,
  MAX_EMBEDDING_CACHE_SIZE,
  MIN_KEYWORD_LENGTH,
  KEYWORD_MATCH_BOOST,
  DEFAULT_SIMILARITY_THRESHOLD,
  DEFAULT_SEARCH_LIMIT,
  KEY_POINT_EXTRACTION_LIMIT,
  MESSAGE_IMPORTANCE_LENGTH_LIMIT,
  MESSAGE_LENGTH_WEIGHT,
  REPLY_IMPORTANCE_BOOST,
  SELECTION_IMPORTANCE_BOOST,
} from '@/lib/vector/utils'

// ============================================================================
// TYPES
// ============================================================================

export interface KnowledgeEntry {
  id: string
  type: 'conversation' | 'message' | 'document' | 'contact'
  sourceId: string  // Reference to conversation/message ID
  content: string
  embedding?: number[]  // Vector embedding
  metadata: {
    timestamp: string
    author?: string
    contactId?: string
    conversationId?: string
    tags?: string[]
    importance?: number  // 0-1, calculated from engagement
    starred?: boolean
  }
  editable: boolean  // Whether user can edit this entry
  editedContent?: string  // User-modified version
  editedAt?: string
}

export interface Checkpoint {
  id: string
  name: string
  createdAt: string
  entryCount: number
  isStarred: boolean
  description?: string
  tags: string[]
  vectorHash: string  // Hash of all embedding vectors at checkpoint time
}

export interface LoRAExport {
  checkpointId: string
  format: 'jsonl' | 'json' | 'parquet'
  entries: Array<{
    text: string
    metadata: Record<string, unknown>
  }>
  statistics: {
    totalEntries: number
    totalTokens: number
    avgQuality: number
    dateRange: { start: string; end: string }
  }
}

export interface KnowledgeSearchOptions {
  limit?: number
  threshold?: number
  types?: KnowledgeEntry['type'][]
  dateRange?: { start: string; end: string }
  tags?: string[]
  starredOnly?: boolean
}

export interface KnowledgeSearchResult {
  entry: KnowledgeEntry
  similarity: number
  highlights?: string[]  // Relevant snippets
}

// ============================================================================
// VECTOR STORE
// ============================================================================

const DB_NAME = 'PersonalLogKnowledge'
const DB_VERSION = 1

class VectorStore {
  private db: IDBDatabase | null = null
  private embeddingCache = new Map<string, number[]>()
  private cacheAccessOrder: string[] = []  // Track access order for LRU eviction
  private readonly embeddingDim = DEFAULT_EMBEDDING_DIM
  private readonly maxCacheSize = MAX_EMBEDDING_CACHE_SIZE
  private vectorOps: Awaited<ReturnType<typeof getVectorOps>> | null = null

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    // Initialize WASM vector operations (async, don't block)
    getVectorOps().then(ops => {
      this.vectorOps = ops
      console.log('[VectorStore] Native ops loaded:', ops ? 'success' : 'fallback')
    }).catch(err => {
      console.warn('[VectorStore] Failed to load native ops, using JS fallback:', err)
    })
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(new StorageError('Failed to open knowledge database', {
        technicalDetails: `DB: ${DB_NAME}, Version: ${DB_VERSION}`,
        context: { dbName: DB_NAME, version: DB_VERSION }
      }))

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result

        // Knowledge entries store
        if (!database.objectStoreNames.contains('entries')) {
          const entriesStore = database.createObjectStore('entries', { keyPath: 'id' })
          entriesStore.createIndex('type', 'type', { unique: false })
          entriesStore.createIndex('sourceId', 'sourceId', { unique: false })
          entriesStore.createIndex('timestamp', 'metadata.timestamp', { unique: false })
          entriesStore.createIndex('starred', 'metadata.starred', { unique: false })
        }

        // Checkpoints store
        if (!database.objectStoreNames.contains('checkpoints')) {
          const checkpointsStore = database.createObjectStore('checkpoints', { keyPath: 'id' })
          checkpointsStore.createIndex('createdAt', 'createdAt', { unique: false })
          checkpointsStore.createIndex('isStarred', 'isStarred', { unique: false })
        }

        // Embedding cache store
        if (!database.objectStoreNames.contains('embeddings')) {
          const embeddingStore = database.createObjectStore('embeddings', { keyPath: 'textHash' })
          embeddingStore.createIndex('vector', 'embedding', { unique: false })
        }
      }
    })
  }

  // ==========================================================================
  // ENTRY MANAGEMENT
  // ==========================================================================

  /**
   * Adds a knowledge entry with automatically generated embedding.
   *
   * @param entry - The entry to add (embedding will be generated)
   * @returns Promise resolving to the complete entry with embedding
   * @throws {StorageError} If database operation fails
   * @throws {ValidationError} If entry content is empty
   *
   * @example
   * ```typescript
   * const entry = await vectorStore.addEntry({
   *   id: 'ke_123',
   *   type: 'message',
   *   sourceId: 'msg_456',
   *   content: 'Important information',
   *   metadata: { timestamp: new Date().toISOString() },
   *   editable: true
   * })
   * ```
   */
  async addEntry(entry: Omit<KnowledgeEntry, 'embedding'>): Promise<KnowledgeEntry> {
    if (!entry.content?.trim()) {
      throw new ValidationError('Knowledge entry content cannot be empty', {
        field: 'content',
        value: entry.content
      })
    }
    await this.ensureInitialized()

    // Generate embedding
    const embedding = await this.generateEmbedding(entry.content)

    const fullEntry: KnowledgeEntry = {
      ...entry,
      id: entry.id || `ke_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      embedding,
    }

    // Store in IndexedDB
    await this.putEntry(fullEntry)

    return fullEntry
  }

  /**
   * Adds multiple knowledge entries efficiently.
   *
   * Processes entries sequentially to avoid blocking.
   *
   * @param entries - Array of entries to add
   * @returns Promise resolving to array of complete entries with embeddings
   * @throws {StorageError} If database operation fails
   *
   * @example
   * ```typescript
   * const results = await vectorStore.addEntries([
   *   { type: 'message', sourceId: 'msg1', content: 'Text 1', ... },
   *   { type: 'message', sourceId: 'msg2', content: 'Text 2', ... }
   * ])
   * ```
   */
  async addEntries(entries: Omit<KnowledgeEntry, 'embedding'>[]): Promise<KnowledgeEntry[]> {
    await this.ensureInitialized()

    const results: KnowledgeEntry[] = []

    // Process in batches to avoid blocking
    for (const entry of entries) {
      const fullEntry = await this.addEntry(entry)
      results.push(fullEntry)
    }

    return results
  }

  /**
   * Updates an existing knowledge entry.
   *
   * If content changes, generates a new embedding and marks entry as edited.
   *
   * @param id - The entry ID to update
   * @param updates - Partial updates to apply
   * @returns Promise resolving to the updated entry
   * @throws {ValidationError} If ID is empty
   * @throws {NotFoundError} If entry doesn't exist
   * @throws {StorageError} If database operation fails
   *
   * @example
   * ```typescript
   * const updated = await vectorStore.updateEntry('ke_123', {
   *   content: 'Updated content'
   * })
   * console.log(updated.editedContent) // 'Updated content'
   * ```
   */
  async updateEntry(
    id: string,
    updates: Partial<Pick<KnowledgeEntry, 'content' | 'editedContent' | 'metadata'>>
  ): Promise<KnowledgeEntry> {
    await this.ensureInitialized()

    if (!id?.trim()) {
      throw new ValidationError('Knowledge entry ID cannot be empty', {
        field: 'id',
        value: id
      })
    }

    const existing = await this.getEntry(id)
    if (!existing) {
      throw new NotFoundError('knowledge entry', id)
    }

    let newContent = existing.content

    // If content changed, mark as edited
    if (updates.content && updates.content !== existing.content) {
      newContent = updates.content
      updates.editedContent = updates.content
      updates.editedAt = new Date().toISOString()
    }

    // Update embedding if content changed
    const embedding = updates.content
      ? await this.generateEmbedding(updates.content)
      : existing.embedding

    const updated: KnowledgeEntry = {
      ...existing,
      ...updates,
      content: newContent,
      embedding,
    }

    await this.putEntry(updated)

    return updated
  }

  /**
   * Retrieves a knowledge entry by its ID.
   *
   * @param id - The entry ID to retrieve
   * @returns Promise resolving to the entry or null if not found
   * @throws {StorageError} If database operation fails
   *
   * @example
   * ```typescript
   * const entry = await vectorStore.getEntry('ke_123')
   * if (entry) {
   *   console.log(entry.content)
   * }
   * ```
   */
  async getEntry(id: string): Promise<KnowledgeEntry | null> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['entries'], 'readonly')
      const store = transaction.objectStore('entries')
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Retrieves knowledge entries with optional filtering and pagination.
   *
   * @param filter - Optional filters to apply
   * @param filter.type - Filter by entry type
   * @param filter.sourceId - Filter by source ID
   * @param filter.starred - Filter by starred status
   * @param filter.limit - Maximum number of entries to return
   * @param filter.offset - Number of entries to skip
   * @returns Promise resolving to array of filtered entries
   * @throws {StorageError} If database operation fails
   *
   * @example
   * ```typescript
   * // Get starred message entries
   * const entries = await vectorStore.getEntries({
   *   type: 'message',
   *   starred: true,
   *   limit: 10
   * })
   * ```
   */
  async getEntries(filter?: {
    type?: KnowledgeEntry['type']
    sourceId?: string
    starred?: boolean
    limit?: number
    offset?: number
  }): Promise<KnowledgeEntry[]> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['entries'], 'readonly')
      const store = transaction.objectStore('entries')
      const request = store.getAll()

      request.onsuccess = () => {
        let results = request.result || []

        // Apply filters
        if (filter?.type) {
          results = results.filter((e: KnowledgeEntry) => e.type === filter.type)
        }
        if (filter?.sourceId) {
          results = results.filter((e: KnowledgeEntry) => e.sourceId === filter.sourceId)
        }
        if (filter?.starred !== undefined) {
          results = results.filter((e: KnowledgeEntry) => e.metadata.starred === filter.starred)
        }

        // Sort by timestamp
        results.sort((a: KnowledgeEntry, b: KnowledgeEntry) =>
          new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
        )

        // Apply pagination
        if (filter?.offset) {
          results = results.slice(filter.offset)
        }
        if (filter?.limit) {
          results = results.slice(0, filter.limit)
        }

        resolve(results)
      }
      request.onerror = () => reject(new StorageError('Failed to get knowledge entries', {
        technicalDetails: request.error?.message,
        cause: request.error
      }))
    })
  }

  /**
   * Deletes a knowledge entry by its ID.
   *
   * @param id - The entry ID to delete
   * @returns Promise that resolves when deletion is complete
   * @throws {ValidationError} If ID is empty
   * @throws {StorageError} If database operation fails
   *
   * @example
   * ```typescript
   * await vectorStore.deleteEntry('ke_123')
   * ```
   */
  async deleteEntry(id: string): Promise<void> {
    if (!id?.trim()) {
      throw new ValidationError('Knowledge entry ID cannot be empty', {
        field: 'id',
        value: id
      })
    }
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['entries'], 'readwrite')
      const store = transaction.objectStore('entries')
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // ==========================================================================
  // SEMANTIC SEARCH
  // ==========================================================================

  /**
   * Performs semantic search for similar entries using vector similarity.
   *
   * @param query - The search query text
   * @param options - Search configuration options
   * @param options.limit - Maximum number of results to return (default: 10)
   * @param options.threshold - Minimum similarity threshold (default: 0.7)
   * @param options.types - Filter by entry types
   * @param options.dateRange - Filter by date range
   * @param options.tags - Filter by tags
   * @param options.starredOnly - Only return starred entries
   * @returns Promise resolving to array of search results with similarity scores
   * @throws {ValidationError} If query is empty
   * @throws {StorageError} If database operation fails
   *
   * @example
   * ```typescript
   * const results = await vectorStore.search('project deadline', {
   *   limit: 5,
   *   threshold: 0.8,
   *   types: ['message']
   * })
   * results.forEach(r => {
   *   console.log(`${r.similarity}: ${r.entry.content}`)
   * })
   * ```
   */
  async search(
    query: string,
    options: KnowledgeSearchOptions = {}
  ): Promise<KnowledgeSearchResult[]> {
    if (!query?.trim()) {
      throw new ValidationError('Search query cannot be empty', {
        field: 'query',
        value: query
      })
    }

    await this.ensureInitialized()

    const {
      limit = DEFAULT_SEARCH_LIMIT,
      threshold = DEFAULT_SIMILARITY_THRESHOLD,
      types,
      dateRange,
      tags,
      starredOnly = false,
    } = options

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query)

    // Get all entries (with filters)
    let entries = await this.getEntries()

    // Apply type filter
    if (types && types.length > 0) {
      entries = entries.filter(e => types.includes(e.type))
    }

    // Apply date range filter
    if (dateRange) {
      entries = entries.filter(e => {
        const ts = new Date(e.metadata.timestamp).getTime()
        return ts >= new Date(dateRange.start).getTime() &&
               ts <= new Date(dateRange.end).getTime()
      })
    }

    // Apply tag filter
    if (tags && tags.length > 0) {
      entries = entries.filter(e =>
        e.metadata.tags?.some(t => tags.includes(t))
      )
    }

    // Apply starred filter
    if (starredOnly) {
      entries = entries.filter(e => e.metadata.starred)
    }

    // Calculate similarities
    const results: KnowledgeSearchResult[] = entries
      .map(entry => ({
        entry,
        similarity: this.cosineSimilarity(queryEmbedding, entry.embedding || []),
      }))
      .filter(r => r.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    return results
  }

  /**
   * Performs hybrid search combining semantic and keyword matching.
   *
   * Boosts semantic search results with keyword matching for better relevance.
   *
   * @param query - The search query text
   * @param options - Search configuration options (same as search())
   * @returns Promise resolving to array of search results with boosted scores
   *
   * @example
   * ```typescript
   * const results = await vectorStore.hybridSearch('important meeting', {
   *   limit: 10
   * })
   * ```
   */
  async hybridSearch(
    query: string,
    options: KnowledgeSearchOptions = {}
  ): Promise<KnowledgeSearchResult[]> {
    const semanticResults = await this.search(query, options)

    // Add keyword matching boost
    const queryLower = query.toLowerCase()
    const keywords = queryLower.split(/\s+/).filter(w => w.length >= MIN_KEYWORD_LENGTH)

    return semanticResults.map(result => {
      const contentLower = result.entry.content.toLowerCase()
      const keywordMatches = keywords.filter(k => contentLower.includes(k)).length

      // Boost score based on keyword matches
      const keywordBoost = keywordMatches * KEYWORD_MATCH_BOOST

      return {
        ...result,
        similarity: Math.min(1, result.similarity + keywordBoost),
      }
    }).sort((a, b) => b.similarity - a.similarity)
  }

  // ==========================================================================
  // CHECKPOINTS
  // ==========================================================================

  // ==========================================================================
  // CHECKPOINTS
  // ==========================================================================

  /**
   * Creates a checkpoint of the current knowledge state.
   *
   * Checkpoints allow you to save and restore knowledge states.
   *
   * @param name - Descriptive name for the checkpoint
   * @param options - Additional checkpoint options
   * @param options.description - Optional detailed description
   * @param options.tags - Optional tags for categorization
   * @param options.isStarred - Whether to mark as starred (stable)
   * @returns Promise resolving to the created checkpoint
   * @throws {StorageError} If database operation fails
   *
   * @example
   * ```typescript
   * const checkpoint = await vectorStore.createCheckpoint('Before reindex', {
   *   description: 'State before rebuilding knowledge base',
   *   tags: ['stable', 'pre-migration'],
   *   isStarred: true
   * })
   * ```
   */
  async createCheckpoint(name: string, options?: {
    description?: string
    tags?: string[]
    isStarred?: boolean
  }): Promise<Checkpoint> {
    await this.ensureInitialized()

    const entries = await this.getEntries()

    // Calculate hash of all vectors
    const vectorHash = await this.hashVectors(entries)

    const checkpoint: Checkpoint = {
      id: `cp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name,
      createdAt: new Date().toISOString(),
      entryCount: entries.length,
      isStarred: options?.isStarred || false,
      description: options?.description,
      tags: options?.tags || [],
      vectorHash,
    }

    // Store checkpoint
    await this.putCheckpoint(checkpoint)

    return checkpoint
  }

  /**
   * Retrieves all checkpoints, sorted by creation time (newest first).
   *
   * @returns Promise resolving to array of checkpoints
   * @throws {StorageError} If database operation fails
   *
   * @example
   * ```typescript
   * const checkpoints = await vectorStore.getCheckpoints()
   * checkpoints.forEach(cp => {
   *   console.log(`${cp.name}: ${cp.entryCount} entries`)
   * })
   * ```
   */
  async getCheckpoints(): Promise<Checkpoint[]> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['checkpoints'], 'readonly')
      const store = transaction.objectStore('checkpoints')
      const request = store.getAll()

      request.onsuccess = () => {
        const checkpoints = request.result || []
        // Sort by creation time, newest first
        checkpoints.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        resolve(checkpoints)
      }
      request.onerror = () => reject(new StorageError('Failed to get checkpoints', {
        technicalDetails: request.error?.message,
        cause: request.error
      }))
    })
  }

  /**
   * Stars or unstars a checkpoint.
   *
   * Starred checkpoints are considered stable/reference points.
   *
   * @param checkpointId - The checkpoint ID
   * @param starred - Whether to star the checkpoint
   * @returns Promise resolving to the updated checkpoint
   * @throws {ValidationError} If checkpointId is empty
   * @throws {NotFoundError} If checkpoint doesn't exist
   *
   * @example
   * ```typescript
   * await vectorStore.setCheckpointStarred('cp_123', true)
   * ```
   */
  async setCheckpointStarred(checkpointId: string, starred: boolean): Promise<Checkpoint> {
    if (!checkpointId?.trim()) {
      throw new ValidationError('Checkpoint ID cannot be empty', {
        field: 'checkpointId',
        value: checkpointId
      })
    }

    const checkpoint = await this.getCheckpoint(checkpointId)
    if (!checkpoint) {
      throw new NotFoundError('checkpoint', checkpointId)
    }

    const updated: Checkpoint = {
      ...checkpoint,
      isStarred: starred,
    }

    await this.putCheckpoint(updated)

    return updated
  }

  /**
   * Rolls back the knowledge base to a previous checkpoint.
   *
   * Removes entries created after the checkpoint and restores edited entries
   * to their original state at checkpoint time.
   *
   * @param checkpointId - The checkpoint to roll back to
   * @returns Promise resolving to counts of restored and removed entries
   * @throws {ValidationError} If checkpointId is empty
   * @throws {NotFoundError} If checkpoint doesn't exist
   * @throws {StorageError} If database operation fails
   *
   * @example
   * ```typescript
   * const { restored, removed } = await vectorStore.rollbackToCheckpoint('cp_123')
   * console.log(`Restored ${restored} entries, removed ${removed}`)
   * ```
   */
  async rollbackToCheckpoint(checkpointId: string): Promise<{ restored: number; removed: number }> {
    if (!checkpointId?.trim()) {
      throw new ValidationError('Checkpoint ID cannot be empty', {
        field: 'checkpointId',
        value: checkpointId
      })
    }

    const checkpoint = await this.getCheckpoint(checkpointId)
    if (!checkpoint) {
      throw new NotFoundError('checkpoint', checkpointId)
    }

    // Get current entries
    const currentEntries = await this.getEntries()

    // Remove all entries created after checkpoint
    const checkpointTime = new Date(checkpoint.createdAt).getTime()
    const toRemove = currentEntries.filter(e =>
      new Date(e.metadata.timestamp).getTime() > checkpointTime
    )

    for (const entry of toRemove) {
      await this.deleteEntry(entry.id)
    }

    // Restore any edited entries to their original state
    const entriesToRestore = currentEntries.filter(e =>
      e.editedContent &&
      new Date(e.editedAt || 0).getTime() <= checkpointTime
    )

    for (const entry of entriesToRestore) {
      await this.updateEntry(entry.id, {
        content: entry.content,
        editedContent: undefined,
        editedAt: undefined,
      })
    }

    return {
      restored: entriesToRestore.length,
      removed: toRemove.length,
    }
  }

  /**
   * Gets the latest starred (stable) checkpoint.
   *
   * @returns Promise resolving to the checkpoint or null if none starred
   *
   * @example
   * ```typescript
   * const stable = await vectorStore.getLatestStableCheckpoint()
   * if (stable) {
   *   console.log(`Latest stable: ${stable.name}`)
   * }
   * ```
   */
  async getLatestStableCheckpoint(): Promise<Checkpoint | null> {
    const checkpoints = await this.getCheckpoints()
    return checkpoints.find(cp => cp.isStarred) || null
  }

  // ==========================================================================
  // LORA TRAINING EXPORT
  // ==========================================================================

  /**
   * Exports knowledge entries for LoRA training.
   *
   * Exports entries from checkpoint time in specified format.
   *
   * @param checkpointId - Optional checkpoint to export from (defaults to latest starred)
   * @param format - Export format ('jsonl', 'json', or 'parquet')
   * @returns Promise resolving to export data with statistics
   * @throws {ValidationError} If no checkpoint found
   * @throws {StorageError} If database operation fails
   *
   * @example
   * ```typescript
   * const export = await vectorStore.exportForLoRA(undefined, 'jsonl')
   * console.log(`Exporting ${export.statistics.totalEntries} entries`)
   * ```
   */
  async exportForLoRA(checkpointId?: string, format: LoRAExport['format'] = 'jsonl'): Promise<LoRAExport> {
    // Use starred checkpoint if none specified
    const targetCheckpoint = checkpointId
      ? await this.getCheckpoint(checkpointId)
      : await this.getLatestStableCheckpoint()

    if (!targetCheckpoint) {
      throw new Error('No checkpoint specified and no starred checkpoint found')
    }

    // Get entries from checkpoint time
    const checkpointTime = new Date(targetCheckpoint.createdAt).getTime()
    const entries = await this.getEntries()
    const validEntries = entries.filter(e =>
      new Date(e.metadata.timestamp).getTime() <= checkpointTime
    )

    // Calculate statistics
    const totalTokens = validEntries.reduce((sum, e) =>
      sum + this.estimateTokens(e.content), 0
    )
    const avgQuality = validEntries.reduce((sum, e) =>
      sum + (e.metadata.importance || 0.5), 0
    ) / validEntries.length

    const dates = validEntries.map(e => new Date(e.metadata.timestamp).getTime())
    const dateRange = {
      start: new Date(Math.min(...dates)).toISOString(),
      end: new Date(Math.max(...dates)).toISOString(),
    }

    // Format entries
    const exportEntries = validEntries.map(e => ({
      text: e.editedContent || e.content,
      metadata: {
        id: e.id,
        type: e.type,
        sourceId: e.sourceId,
        timestamp: e.metadata.timestamp,
        author: e.metadata.author,
        tags: e.metadata.tags,
        importance: e.metadata.importance,
      },
    }))

    return {
      checkpointId: targetCheckpoint.id,
      format,
      entries: exportEntries,
      statistics: {
        totalEntries: validEntries.length,
        totalTokens,
        avgQuality,
        dateRange,
      },
    }
  }

  // ==========================================================================
  // AUTO-SYNC FROM CONVERSATIONS
  // ==========================================================================

  /**
   * Synchronizes conversations and contacts to the knowledge base.
   *
   * Adds new messages as knowledge entries and updates existing ones.
   * Called periodically to keep knowledge base current.
   *
   * @returns Promise resolving to counts of added and updated entries
   * @throws {StorageError} If database operation fails
   *
   * @example
   * ```typescript
   * const { added, updated } = await vectorStore.syncConversations()
   * console.log(`Synced: ${added} added, ${updated} updated`)
   * ```
   */
  async syncConversations(): Promise<{ added: number; updated: number }> {
    const conversations = await listConversations()
    const contacts = await listContacts()

    let added = 0
    let updated = 0

    for (const conv of conversations) {
      const messages = await getMessages(conv.id)

      for (const msg of messages) {
        // Skip empty messages
        if (!msg.content.text && !msg.content.image) continue

        const textContent = msg.content.text || '[Image]'

        // Check if already exists
        const existing = await this.getEntry(`msg_${msg.id}`)

        if (existing) {
          // Update if content changed
          if (existing.content !== textContent) {
            await this.updateEntry(existing.id, { content: textContent })
            updated++
          }
        } else {
          // Add new entry
          await this.addEntry({
            id: `msg_${msg.id}`,
            type: 'message',
            sourceId: msg.id,
            content: textContent,
            metadata: {
              timestamp: msg.timestamp,
              author: msg.author,
              conversationId: conv.id,
              importance: this.calculateImportance(msg),
            },
            editable: true,
          })
          added++
        }
      }
    }

    // Add contact system prompts as knowledge
    for (const contact of contacts) {
      const existing = await this.getEntry(`contact_${contact.id}`)

      if (!existing) {
        await this.addEntry({
          id: `contact_${contact.id}`,
          type: 'contact',
          sourceId: contact.id,
          content: `System prompt for ${contact.nickname}: ${contact.systemPrompt}`,
          metadata: {
            timestamp: contact.createdAt,
            tags: ['system-prompt', 'personality'],
            importance: 0.8,
          },
          editable: true,
        })
        added++
      }
    }

    return { added, updated }
  }

  // ==========================================================================
  // EMBEDDING GENERATION
  // ==========================================================================

  /**
   * Generate embedding for text
   * Uses a simple hash-based approach for now.
   * Can be replaced with real embeddings from WebLLM or API.
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const normalized = text.toLowerCase().trim()

    // Check cache
    if (this.embeddingCache.has(normalized)) {
      // Update access order for LRU
      const index = this.cacheAccessOrder.indexOf(normalized)
      if (index > -1) {
        this.cacheAccessOrder.splice(index, 1)
      }
      this.cacheAccessOrder.push(normalized)
      return this.embeddingCache.get(normalized)!
    }

    // Simple hash-based embedding (placeholder for real embedding model)
    const embedding = this.hashEmbedding(normalized, EMBEDDING_DIM)

    // Cache it with LRU eviction
    this.setCachedEmbedding(normalized, embedding)

    return embedding
  }

  /**
   * Cache an embedding with LRU eviction
   */
  private setCachedEmbedding(key: string, embedding: number[]): void {
    // If cache is full, evict least recently used entry
    if (this.embeddingCache.size >= this.maxCacheSize) {
      const lruKey = this.cacheAccessOrder.shift()
      if (lruKey) {
        this.embeddingCache.delete(lruKey)
      }
    }

    // Add new entry
    this.embeddingCache.set(key, embedding)
    this.cacheAccessOrder.push(key)
  }

  /**
   * Simple hash-based embedding (for demo - replace with real embeddings)
   */
  private hashEmbedding(text: string, dimensions: number): number[] {
    const { hashEmbedding: createHashEmbedding } = require('@/lib/vector/utils')
    return createHashEmbedding(text, dimensions)
  }

  /**
   * Calculate cosine similarity between two vectors
   *
   * Uses WASM-accelerated implementation when available,
   * falls back to pure JavaScript otherwise.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    // Try to use WASM implementation
    if (this.vectorOps) {
      try {
        return this.vectorOps.cosine_similarity(a, b)
      } catch (e) {
        console.warn('[VectorStore] WASM cosine_similarity failed, using JS fallback:', e)
      }
    }

    // JavaScript fallback using shared utility
    return cosineSimilarity(a, b)
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.init()
    }
  }

  private async putEntry(entry: KnowledgeEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['entries'], 'readwrite')
      const store = transaction.objectStore('entries')
      const request = store.put(entry)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  private async getCheckpoint(id: string): Promise<Checkpoint | null> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['checkpoints'], 'readonly')
      const store = transaction.objectStore('checkpoints')
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  private async putCheckpoint(checkpoint: Checkpoint): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['checkpoints'], 'readwrite')
      const store = transaction.objectStore('checkpoints')
      const request = store.put(checkpoint)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  private async hashVectors(entries: KnowledgeEntry[]): Promise<string> {
    // Simple hash of all vector data
    const combined = entries
      .map(e => e.embedding?.slice(0, 10).join(',') || '')
      .join('|')

    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i)
      hash = hash & hash
    }

    return Math.abs(hash).toString(16)
  }

  private estimateTokens(text: string): number {
    return estimateTokensUtil(text)
  }

  private calculateImportance(msg: any): number {
    let importance = 0.5

    // Longer messages are more important
    if (msg.content.text) {
      importance += Math.min(MESSAGE_LENGTH_WEIGHT, msg.content.text.length / MESSAGE_IMPORTANCE_LENGTH_LIMIT)
    }

    // Messages with replies are more important
    if (msg.replyTo) {
      importance += REPLY_IMPORTANCE_BOOST
    }

    // Selected messages are important
    if (msg.selected) {
      importance += SELECTION_IMPORTANCE_BOOST
    }

    return Math.min(1, importance)
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let vectorStore: VectorStore | null = null

/**
 * Gets the singleton VectorStore instance.
 *
 * Creates the instance on first call and reuses it for subsequent calls.
 *
 * @returns The VectorStore singleton instance
 *
 * @example
 * ```typescript
 * const store = getVectorStore()
 * await store.init()
 * await store.addEntry({ ... })
 * ```
 */
export function getVectorStore(): VectorStore {
  if (!vectorStore) {
    vectorStore = new VectorStore()
  }
  return vectorStore
}

// Export types
export type { KnowledgeEntry, Checkpoint, LoRAExport, KnowledgeSearchOptions, KnowledgeSearchResult }
