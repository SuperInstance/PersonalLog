/**
 * Semantic Retrieval - Cross-tier semantic search with ranking
 *
 * Provides intelligent memory retrieval across all tiers using
 * vector similarity and importance scoring.
 */

import { Memory, MemoryTier, RetrievalResult, MemoryQuery } from '../types.js';
import { WorkingMemory } from '../storage/working-memory.js';
import { ShortTermMemory } from '../storage/short-term-memory.js';
import { LongTermMemory } from '../storage/long-term-memory.js';

/**
 * Configuration for semantic retrieval
 */
export interface SemanticRetrievalConfig {
  tierWeights: {
    working: number;
    shortTerm: number;
    longTerm: number;
  };
  importanceWeight: number;      // Weight for importance in ranking
  recencyWeight: number;         // Weight for recency in ranking
  accessWeight: number;          // Weight for access frequency in ranking
  maxResultsPerTier: number;
  similarityThreshold: number;
}

/**
 * Result from semantic search with detailed scoring
 */
export interface SemanticSearchResult extends RetrievalResult {
  score: number;                 // Combined relevance score
  components: {
    similarity: number;
    importance: number;
    recency: number;
    access: number;
  };
}

/**
 * Semantic retrieval engine with cross-tier search
 */
export class SemanticRetrieval {
  private working: WorkingMemory;
  private shortTerm: ShortTermMemory;
  private longTerm: LongTermMemory;
  private config: SemanticRetrievalConfig;

  constructor(
    working: WorkingMemory,
    shortTerm: ShortTermMemory,
    longTerm: LongTermMemory,
    config: Partial<SemanticRetrievalConfig> = {}
  ) {
    this.working = working;
    this.shortTerm = shortTerm;
    this.longTerm = longTerm;
    this.config = {
      tierWeights: {
        working: config.tierWeights?.working ?? 3.0,      // Boost working memory
        shortTerm: config.tierWeights?.shortTerm ?? 1.5,
        longTerm: config.tierWeights?.longTerm ?? 1.0
      },
      importanceWeight: config.importanceWeight ?? 0.2,
      recencyWeight: config.recencyWeight ?? 0.15,
      accessWeight: config.accessWeight ?? 0.1,
      maxResultsPerTier: config.maxResultsPerTier ?? 50,
      similarityThreshold: config.similarityThreshold ?? 0.6
    };
  }

  /**
   * Search across all memory tiers
   * @param query - Search query with embedding
   * @returns Ranked results from all tiers
   */
  async retrieve(query: MemoryQuery): Promise<SemanticSearchResult[]> {
    const results: SemanticSearchResult[] = [];
    const now = Date.now();

    // Search working memory
    const workingResults = await this.searchWorkingMemory(query, now);
    results.push(...workingResults);

    // Search short-term memory
    const shortTermResults = await this.searchShortTermMemory(query, now);
    results.push(...shortTermResults);

    // Search long-term memory
    const longTermResults = await this.searchLongTermMemory(query, now);
    results.push(...longTermResults);

    // Sort by combined score
    results.sort((a, b) => b.score - a.score);

    // Apply max results limit
    return results.slice(0, query.maxResults ?? 100);
  }

  /**
   * Retrieve only from specific tiers
   */
  async retrieveFromTiers(
    query: MemoryQuery,
    tiers: MemoryTier[]
  ): Promise<SemanticSearchResult[]> {
    const results: SemanticSearchResult[] = [];
    const now = Date.now();

    if (tiers.includes(MemoryTier.WORKING)) {
      results.push(...await this.searchWorkingMemory(query, now));
    }

    if (tiers.includes(MemoryTier.SHORT_TERM)) {
      results.push(...await this.searchShortTermMemory(query, now));
    }

    if (tiers.includes(MemoryTier.LONG_TERM)) {
      results.push(...await this.searchLongTermMemory(query, now));
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, query.maxResults ?? 100);
  }

  /**
   * Get recent memories from all tiers
   */
  async getRecent(limit: number = 20): Promise<SemanticSearchResult[]> {
    const results: SemanticSearchResult[] = [];
    const now = Date.now();

    // Get from working memory
    for (const memory of this.working.getAll()) {
      results.push(this.scoreResult(memory, 1.0, MemoryTier.WORKING, now));
    }

    // Get from short-term
    const shortTermMemories = await this.shortTerm.getByTimeRange(
      now - 3600000, // Last hour
      now
    );
    for (const memory of shortTermMemories) {
      results.push(this.scoreResult(memory, 1.0, MemoryTier.SHORT_TERM, now));
    }

    // Get from long-term (recent ones)
    const allLongTerm = await this.longTerm.getAll();
    const recentLongTerm = allLongTerm
      .filter(m => now - m.lastAccessed < 86400000) // Last day
      .slice(0, 10);
    for (const memory of recentLongTerm) {
      results.push(this.scoreResult(memory, 1.0, MemoryTier.LONG_TERM, now));
    }

    results.sort((a, b) => b.components.recency - a.components.recency);
    return results.slice(0, limit);
  }

  /**
   * Get important memories from all tiers
   */
  async getImportant(minImportance: number = 0.7): Promise<SemanticSearchResult[]> {
    const results: SemanticSearchResult[] = [];
    const now = Date.now();

    // Get from working
    for (const memory of this.working.getByImportance(minImportance)) {
      results.push(this.scoreResult(memory, 1.0, MemoryTier.WORKING, now));
    }

    // Get from short-term
    for (const memory of await this.shortTerm.getByImportance(minImportance)) {
      results.push(this.scoreResult(memory, 1.0, MemoryTier.SHORT_TERM, now));
    }

    // Get from long-term
    for (const memory of await this.longTerm.getByImportance(minImportance)) {
      results.push(this.scoreResult(memory, 1.0, MemoryTier.LONG_TERM, now));
    }

    results.sort((a, b) => b.components.importance - a.components.importance);
    return results;
  }

  /**
   * Get memories by tags across all tiers
   */
  async getByTags(tags: string[]): Promise<SemanticSearchResult[]> {
    const results: SemanticSearchResult[] = [];
    const now = Date.now();

    for (const tag of tags) {
      // Working memory
      for (const memory of this.working.getByTag(tag)) {
        results.push(this.scoreResult(memory, 1.0, MemoryTier.WORKING, now));
      }

      // Short-term
      for (const memory of await this.shortTerm.getByTag(tag)) {
        results.push(this.scoreResult(memory, 1.0, MemoryTier.SHORT_TERM, now));
      }

      // Long-term
      for (const memory of await this.longTerm.getByTag(tag)) {
        results.push(this.scoreResult(memory, 1.0, MemoryTier.LONG_TERM, now));
      }
    }

    // Deduplicate by memory ID
    const seen = new Set<string>();
    const unique: SemanticSearchResult[] = [];

    for (const result of results) {
      if (!seen.has(result.memory.id)) {
        seen.add(result.memory.id);
        unique.push(result);
      }
    }

    return unique;
  }

  /**
   * Search working memory
   */
  private async searchWorkingMemory(
    query: MemoryQuery,
    now: number
  ): Promise<SemanticSearchResult[]> {
    const results: SemanticSearchResult[] = [];

    for (const memory of this.working.getAll()) {
      // Apply filters
      if (query.agentId && memory.agentId !== query.agentId) continue;
      if (query.minImportance && memory.importance < query.minImportance) continue;
      if (query.tags && query.tags.length > 0) {
        if (!query.tags.some(t => memory.tags.includes(t))) continue;
      }

      // Calculate similarity if query provided
      let similarity = 1.0;
      if (query.query) {
        similarity = this.calculateTextSimilarity(query.query, memory);
        if (similarity < this.config.similarityThreshold) continue;
      }

      results.push(this.scoreResult(memory, similarity, MemoryTier.WORKING, now));
    }

    return results.slice(0, this.config.maxResultsPerTier);
  }

  /**
   * Search short-term memory
   */
  private async searchShortTermMemory(
    query: MemoryQuery,
    now: number
  ): Promise<SemanticSearchResult[]> {
    const searchResults = await this.shortTerm.search(query.query || '', {
      agentId: query.agentId,
      tags: query.tags,
      minImportance: query.minImportance,
      limit: this.config.maxResultsPerTier
    });

    return searchResults.map(memory => {
      const similarity = query.query
        ? this.calculateTextSimilarity(query.query, memory)
        : 1.0;
      return this.scoreResult(memory, similarity, MemoryTier.SHORT_TERM, now);
    });
  }

  /**
   * Search long-term memory
   */
  private async searchLongTermMemory(
    query: MemoryQuery,
    now: number
  ): Promise<SemanticSearchResult[]> {
    let memories: Memory[];

    if (query.embedding) {
      // Semantic search with embedding
      const semanticResults = await this.longTerm.semanticSearch(query.embedding, {
        agentId: query.agentId,
        tags: query.tags,
        minImportance: query.minImportance,
        maxResults: this.config.maxResultsPerTier,
        minSimilarity: this.config.similarityThreshold
      });
      memories = semanticResults.map(r => r.memory);
    } else {
      // Keyword search
      const keywordResults = await this.longTerm.keywordSearch(query.query || '', {
        agentId: query.agentId,
        tags: query.tags,
        minImportance: query.minImportance,
        maxResults: this.config.maxResultsPerTier
      });
      memories = keywordResults.map(r => r.memory);
    }

    return memories.map(memory => {
      const similarity = query.embedding ? 0.8 : 1.0;
      return this.scoreResult(memory, similarity, MemoryTier.LONG_TERM, now);
    });
  }

  /**
   * Score a memory with all ranking factors
   */
  private scoreResult(
    memory: Memory,
    similarity: number,
    tier: MemoryTier,
    now: number
  ): SemanticSearchResult {
    // Calculate individual components
    const importance = memory.importance;

    // Recency: 1.0 for very recent, decays over time
    const hoursSinceAccess = (now - memory.lastAccessed) / 3600000;
    const recency = Math.max(0.1, 1.0 - (hoursSinceAccess / 168)); // Decay over a week

    // Access: normalized by max expected accesses
    const access = Math.min(1.0, memory.accessCount / 100);

    // Get tier weight
    const tierWeight = this.config.tierWeights[
      tier === MemoryTier.WORKING ? 'working' :
      tier === MemoryTier.SHORT_TERM ? 'shortTerm' : 'longTerm'
    ];

    // Calculate combined score
    const score = (
      similarity * 0.5 +
      importance * this.config.importanceWeight +
      recency * this.config.recencyWeight +
      access * this.config.accessWeight
    ) * tierWeight;

    return {
      memory,
      relevance: similarity,
      tier,
      score,
      components: {
        similarity,
        importance,
        recency,
        access
      }
    };
  }

  /**
   * Calculate text similarity (simple keyword matching)
   */
  private calculateTextSimilarity(query: string, memory: Memory): number {
    const queryLower = query.toLowerCase();
    const queryWords = new Set(queryLower.split(/\s+/).filter(w => w.length > 2));

    if (queryWords.size === 0) return 1.0;

    const contentStr = JSON.stringify(memory.content).toLowerCase();
    const tagsStr = memory.tags.join(' ').toLowerCase();

    let matches = 0;
    for (const word of queryWords) {
      if (contentStr.includes(word) || tagsStr.includes(word)) {
        matches++;
      }
    }

    return matches / queryWords.size;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<SemanticRetrievalConfig>): void {
    Object.assign(this.config, updates);
  }
}
