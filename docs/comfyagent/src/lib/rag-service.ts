/**
 * RAG (Retrieval-Augmented Generation) Service
 *
 * This service implements a hybrid approach:
 * 1. Vector embeddings for AI retrieval (similarity search)
 * 2. Database storage for human editing (reflection)
 *
 * The vector system enables efficient context retrieval,
 * while the database serves as a human-editable reflection
 * that grows organically with user interaction.
 */

import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// ============================================
// EMBEDDING GENERATION
// ============================================

/**
 * Generate embedding for text content
 * Uses z-ai-web-dev-sdk for text embeddings
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const zai = await ZAI.create();

    // Note: In a real implementation, you'd use a dedicated embedding endpoint
    // For now, we'll simulate embeddings based on the LLM's understanding
    // In production, integrate with OpenAI embeddings, Cohere, or similar

    // Simplified approach: Use text characteristics to generate pseudo-embeddings
    // This is a placeholder - real embeddings require an embedding model
    const words = text.toLowerCase().split(/\s+/);
    const vector = new Array(384).fill(0); // 384 dimensions (common embedding size)

    words.forEach((word, idx) => {
      const charCodeSum = word.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const dim = (idx * 7 + charCodeSum) % 384;
      vector[dim] += (charCodeSum % 10) / 10;
    });

    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] = vector[i] / magnitude;
      }
    }

    return vector;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================
// IN-MEMORY VECTOR INDEX
// ============================================

interface VectorEntry {
  id: string;
  type: 'conversation' | 'project' | 'creative_element' | 'project_memory';
  embedding: number[];
  content: string;
  metadata: {
    projectId?: string;
    timestamp: Date;
    [key: string]: any;
  };
}

// Simple in-memory vector store
// In production, replace with a proper vector database (Pinecone, Qdrant, Weaviate)
class VectorStore {
  private entries: Map<string, VectorEntry> = new Map();
  private indexBuilt: boolean = false;

  /**
   * Add entry to vector store
   */
  async addEntry(entry: VectorEntry): Promise<void> {
    this.entries.set(entry.id, entry);
    this.indexBuilt = false;
  }

  /**
   * Build spatial index for faster search
   */
  buildIndex(): void {
    this.indexBuilt = true;
    // In a real vector DB, this would build HNSW or IVF index
  }

  /**
   * Search for similar entries
   */
  async search(
    query: string,
    topK: number = 5,
    filters?: {
      type?: VectorEntry['type'];
      projectId?: string;
      minImportance?: number;
    }
  ): Promise<VectorEntry[]> {
    if (!this.indexBuilt) {
      this.buildIndex();
    }

    const queryEmbedding = await generateEmbedding(query);

    const results: Array<{ entry: VectorEntry; similarity: number }> = [];

    for (const [id, entry] of this.entries.entries()) {
      // Apply filters
      if (filters?.type && entry.type !== filters.type) continue;
      if (filters?.projectId && entry.metadata.projectId !== filters.projectId) continue;

      const similarity = cosineSimilarity(queryEmbedding, entry.embedding);

      // Filter by importance (stored in metadata)
      if (filters?.minImportance) {
        const importance = entry.metadata.importance || 0.5;
        if (importance < filters.minImportance) continue;
      }

      results.push({ entry, similarity });
    }

    // Sort by similarity and return top K
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map(r => r.entry);
  }

  /**
   * Get entry by ID
   */
  getEntry(id: string): VectorEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Remove entry
   */
  removeEntry(id: string): void {
    this.entries.delete(id);
    this.indexBuilt = false;
  }

  /**
   * Get all entries for a project
   */
  getProjectEntries(projectId: string): VectorEntry[] {
    return Array.from(this.entries.values()).filter(
      entry => entry.metadata.projectId === projectId
    );
  }
}

// Global vector store instance
export const vectorStore = new VectorStore();

// ============================================
// RAG RETRIEVAL SERVICE
// ============================================

interface RetrievedContext {
  content: string;
  source: string;
  type: string;
  similarity: number;
  metadata: any;
}

/**
 * Retrieve relevant context for a query
 */
export async function retrieveContext(
  query: string,
  projectId: string,
  options: {
    includeCrossProject?: boolean;
    topK?: number;
    minSimilarity?: number;
  } = {}
): Promise<RetrievedContext[]> {
  const {
    includeCrossProject = true,
    topK = 10,
    minSimilarity = 0.3
  } = options;

  // Search project-specific context
  const projectResults = await vectorStore.search(
    query,
    Math.ceil(topK / 2),
    {
      type: undefined, // All types
      projectId
    }
  );

  // Optionally search cross-project context
  let crossProjectResults: VectorEntry[] = [];
  if (includeCrossProject) {
    crossProjectResults = await vectorStore.search(
      query,
      Math.ceil(topK / 2),
      {
        type: 'creative_element' // Focus on reusable elements
      }
    );
  }

  // Combine and deduplicate
  const allResults = [...projectResults, ...crossProjectResults];
  const seen = new Set<string>();
  const filteredResults: VectorEntry[] = [];

  for (const result of allResults) {
    if (!seen.has(result.id)) {
      seen.add(result.id);
      filteredResults.push(result);
    }
  }

  // Format as retrieved context
  return filteredResults
    .slice(0, topK)
    .map(entry => ({
      content: entry.content,
      source: entry.id,
      type: entry.type,
      similarity: cosineSimilarity(
        await generateEmbedding(query),
        entry.embedding
      ),
      metadata: entry.metadata
    }))
    .filter(ctx => ctx.similarity >= minSimilarity);
}

// ============================================
// EMBEDDING SYNC WITH DATABASE
// ============================================

/**
 * Sync project conversations with vector store
 */
export async function syncProjectConversations(projectId: string): Promise<void> {
  const conversations = await db.chatMessage.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' }
  });

  for (const conversation of conversations) {
    const embedding = await generateEmbedding(conversation.content);

    await vectorStore.addEntry({
      id: `conversation_${conversation.id}`,
      type: 'conversation',
      embedding,
      content: conversation.content,
      metadata: {
        projectId,
        role: conversation.role,
        timestamp: conversation.createdAt
      }
    });
  }
}

/**
 * Sync project memories with vector store
 */
export async function syncProjectMemories(projectId: string): Promise<void> {
  const memories = await db.projectMemory.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' }
  });

  for (const memory of memories) {
    const embedding = await generateEmbedding(
      `${memory.title}: ${memory.description} ${memory.content}`
    );

    await vectorStore.addEntry({
      id: `memory_${memory.id}`,
      type: 'project_memory',
      embedding,
      content: `${memory.title}: ${memory.description}`,
      metadata: {
        projectId,
        category: memory.category,
        importance: memory.importance,
        confidence: memory.confidence,
        timestamp: memory.createdAt
      }
    });
  }
}

/**
 * Sync creative elements with vector store
 */
export async function syncCreativeElements(projectId: string): Promise<void> {
  const elements = await db.creativeElement.findMany({
    where: { projectId }
  });

  for (const element of elements) {
    const embedding = await generateEmbedding(
      `${element.name}: ${element.description} ${element.visualTags || ''}`
    );

    await vectorStore.addEntry({
      id: `element_${element.id}`,
      type: 'creative_element',
      embedding,
      content: `${element.name}: ${element.description}`,
      metadata: {
        projectId,
        type: element.type,
        styleTags: element.styleTags,
        moodTags: element.moodTags,
        timestamp: element.createdAt
      }
    });
  }
}

/**

/**
 * Full project sync with vector store
 */
export async function syncProject(projectId: string): Promise<void> {
  await Promise.all([
    syncProjectConversations(projectId),
    syncProjectMemories(projectId),
    syncCreativeElements(projectId),
    syncNotes(projectId)
  ]);
}

/**
 * Sync notes with vector store
 */
export async function syncNotes(projectId?: string): Promise<void> {
  const notes = await db.note.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { createdAt: 'desc' }
  });

  for (const note of notes) {
    const embedding = await generateEmbedding(
      `${note.title}: ${note.content}`
    );

    await vectorStore.addEntry({
      id: `note_${note.id}`,
      type: 'note',
      embedding,
      content: note.content,
      metadata: {
        projectId,
        folder: note.folder,
        isPinned: note.isPinned,
        wordCount: note.wordCount,
        timestamp: note.createdAt
      }
    });
  }
}
