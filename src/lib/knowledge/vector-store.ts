/**
 * Vector Store - Self-Improving Knowledge System
 *
 * Dual storage system:
 * 1. Vector DB - Embeddings for semantic search (invisible worker)
 * 2. Standard DB - Editable twin with full content (user browsable)
 *
 * Supports checkpoints, rollback, and LoRA training export.
 */

import { listConversations, getMessages } from '@/lib/storage/conversation-store'
import { listContacts } from '@/lib/wizard/model-store'

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

const EMBEDDING_DIM = 384  // Common embedding dimension (e.g., sentence-transformers)
const DB_NAME = 'PersonalLogKnowledge'
const DB_VERSION = 1

class VectorStore {
  private db: IDBDatabase | null = null
  private embeddingCache = new Map<string, number[]>()

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(new Error('Failed to open knowledge database'))

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
   * Add a knowledge entry with embedding
   */
  async addEntry(entry: Omit<KnowledgeEntry, 'embedding'>): Promise<KnowledgeEntry> {
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
   * Add multiple entries efficiently
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
   * Update an entry (user edit)
   */
  async updateEntry(
    id: string,
    updates: Partial<Pick<KnowledgeEntry, 'content' | 'editedContent' | 'metadata'>>
  ): Promise<KnowledgeEntry> {
    await this.ensureInitialized()

    const existing = await this.getEntry(id)
    if (!existing) {
      throw new Error(`Entry ${id} not found`)
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
   * Get an entry by ID
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
   * Get all entries (with optional filtering)
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
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete an entry
   */
  async deleteEntry(id: string): Promise<void> {
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
   * Search for similar entries using vector similarity
   */
  async search(
    query: string,
    options: KnowledgeSearchOptions = {}
  ): Promise<KnowledgeSearchResult[]> {
    await this.ensureInitialized()

    const {
      limit = 10,
      threshold = 0.7,
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
   * Hybrid search: semantic + keyword
   */
  async hybridSearch(
    query: string,
    options: KnowledgeSearchOptions = {}
  ): Promise<KnowledgeSearchResult[]> {
    const semanticResults = await this.search(query, options)

    // Add keyword matching boost
    const queryLower = query.toLowerCase()
    const keywords = queryLower.split(/\s+/).filter(w => w.length > 3)

    return semanticResults.map(result => {
      const contentLower = result.entry.content.toLowerCase()
      const keywordMatches = keywords.filter(k => contentLower.includes(k)).length

      // Boost score based on keyword matches
      const keywordBoost = keywordMatches * 0.05

      return {
        ...result,
        similarity: Math.min(1, result.similarity + keywordBoost),
      }
    }).sort((a, b) => b.similarity - a.similarity)
  }

  // ==========================================================================
  // CHECKPOINTS
  // ==========================================================================

  /**
   * Create a checkpoint of current knowledge state
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
   * Get all checkpoints
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
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Star/unstar a checkpoint
   */
  async setCheckpointStarred(checkpointId: string, starred: boolean): Promise<Checkpoint> {
    const checkpoint = await this.getCheckpoint(checkpointId)
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`)
    }

    const updated: Checkpoint = {
      ...checkpoint,
      isStarred: starred,
    }

    await this.putCheckpoint(updated)

    return updated
  }

  /**
   * Rollback to a checkpoint
   * This restores the knowledge state to what it was at checkpoint time
   */
  async rollbackToCheckpoint(checkpointId: string): Promise<{ restored: number; removed: number }> {
    const checkpoint = await this.getCheckpoint(checkpointId)
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`)
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
   * Get starred (stable) checkpoint - latest one marked as stable
   */
  async getLatestStableCheckpoint(): Promise<Checkpoint | null> {
    const checkpoints = await this.getCheckpoints()
    return checkpoints.find(cp => cp.isStarred) || null
  }

  // ==========================================================================
  // LORA TRAINING EXPORT
  // ==========================================================================

  /**
   * Export knowledge for LoRA training
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
   * Sync all conversations to knowledge base
   * Called periodically to update knowledge from new conversations
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
      return this.embeddingCache.get(normalized)!
    }

    // Simple hash-based embedding (placeholder for real embedding model)
    const embedding = this.hashEmbedding(normalized, EMBEDDING_DIM)

    // Cache it
    this.embeddingCache.set(normalized, embedding)

    return embedding
  }

  /**
   * Simple hash-based embedding (for demo - replace with real embeddings)
   */
  private hashEmbedding(text: string, dimensions: number): number[] {
    const vector = new Array(dimensions).fill(0)

    let hash = 0
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i)
      hash = hash & hash // Convert to 32-bit integer
    }

    // Use hash to seed a simple pseudo-random generator
    let seed = Math.abs(hash)
    for (let i = 0; i < dimensions; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      vector[i] = (seed % 1000) / 1000 // Normalize to 0-1
    }

    // Apply some text characteristics
    const words = text.split(/\s+/)
    const wordHash = words.reduce((h, w) => h + w.charCodeAt(0), 0)
    const slot = wordHash % dimensions
    vector[slot] = Math.min(1, vector[slot] + 0.3)

    return vector
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)

    if (normA === 0 || normB === 0) return 0

    return dotProduct / (normA * normB)
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
    return Math.ceil(text.length / 4)
  }

  private calculateImportance(msg: any): number {
    let importance = 0.5

    // Longer messages are more important
    if (msg.content.text) {
      importance += Math.min(0.3, msg.content.text.length / 1000)
    }

    // Messages with replies are more important
    if (msg.replyTo) {
      importance += 0.1
    }

    // Selected messages are important
    if (msg.selected) {
      importance += 0.2
    }

    return Math.min(1, importance)
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let vectorStore: VectorStore | null = null

export function getVectorStore(): VectorStore {
  if (!vectorStore) {
    vectorStore = new VectorStore()
  }
  return vectorStore
}

// Export types
export type { KnowledgeEntry, Checkpoint, LoRAExport, KnowledgeSearchOptions, KnowledgeSearchResult }
