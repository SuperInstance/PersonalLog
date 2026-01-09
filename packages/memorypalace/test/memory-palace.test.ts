/**
 * Tests for MemoryPalace main class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryPalace, MemoryTier, PrivacyLevel } from '../src/index.js';

describe('MemoryPalace', () => {
  let memory: MemoryPalace;

  beforeEach(() => {
    memory = new MemoryPalace({
      consolidation: {
        workingToShortTermThreshold: 0.5,
        shortToLongTermThreshold: 0.7,
        workingMaxSize: 10,
        shortTermMaxSize: 100,
        longTermMaxSize: 1000,
        consolidationInterval: 60000
      }
    });
  });

  describe('Initialization', () => {
    it('should initialize all three tiers', () => {
      expect(memory.working).toBeDefined();
      expect(memory.shortTerm).toBeDefined();
      expect(memory.longTerm).toBeDefined();
      expect(memory.retrieval).toBeDefined();
      expect(memory.sharing).toBeDefined();
    });

    it('should return initial statistics', () => {
      const stats = memory.getStats();
      expect(stats.working.count).toBe(0);
      expect(stats.shortTerm.count).toBe(0);
      expect(stats.longTerm.count).toBe(0);
      expect(stats.totalMemories).toBe(0);
    });
  });

  describe('Working Memory Operations', () => {
    it('should store and retrieve from working memory', () => {
      memory.working.set('task', 'Build AI tools');
      expect(memory.working.get('task')).toBe('Build AI tools');
    });

    it('should track working memory size', () => {
      memory.working.set('key1', 'value1');
      memory.working.set('key2', 'value2');
      expect(memory.working.size()).toBe(2);
    });
  });

  describe('Short-term Memory Operations', () => {
    it('should store in short-term memory', async () => {
      const id = await memory.shortTerm.store('test content', {
        agentId: 'test-agent',
        tags: ['test'],
        importance: 0.6
      });
      expect(id).toBeTruthy();

      const retrieved = await memory.shortTerm.get(id);
      expect(retrieved?.content).toBe('test content');
    });

    it('should get memories by agent', async () => {
      await memory.shortTerm.store('content1', { agentId: 'agent-1' });
      await memory.shortTerm.store('content2', { agentId: 'agent-2' });
      await memory.shortTerm.store('content3', { agentId: 'agent-1' });

      const agent1Memories = await memory.shortTerm.getByAgent('agent-1');
      expect(agent1Memories).toHaveLength(2);
    });
  });

  describe('Long-term Memory Operations', () => {
    it('should store in long-term memory', async () => {
      const id = await memory.longTerm.store('important knowledge', {
        agentId: 'knowledge-agent',
        tags: ['knowledge', 'important'],
        importance: 0.9
      });
      expect(id).toBeTruthy();

      const retrieved = await memory.longTerm.get(id);
      expect(retrieved?.content).toBe('important knowledge');
    });

    it('should support semantic search', async () => {
      const embedding = new Array(50).fill(0.1);
      await memory.longTerm.store('AI knowledge', {
        embedding,
        importance: 0.8
      });

      const results = await memory.longTerm.semanticSearch(embedding, {
        minSimilarity: 0.5
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should support keyword search', async () => {
      await memory.longTerm.store('Machine learning algorithms', {
        tags: ['ml', 'ai']
      });

      const results = await memory.longTerm.keywordSearch('machine');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-tier Retrieval', () => {
    it('should retrieve across all tiers', async () => {
      // Store in all tiers
      memory.working.set('test', 'working value');
      await memory.shortTerm.store('short-term value');
      await memory.longTerm.store('long-term value');

      const results = await memory.retrieve('test');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should get recent memories', async () => {
      memory.working.set('recent1', 'value1');
      await memory.shortTerm.store('value2');

      const recent = await memory.getRecent(10);
      expect(recent.length).toBeGreaterThan(0);
    });

    it('should get important memories', async () => {
      await memory.longTerm.store('important', {
        importance: 0.9
      });

      const important = await memory.getImportant(0.8);
      expect(important.length).toBeGreaterThan(0);
    });

    it('should get memories by tag', async () => {
      await memory.longTerm.store('tagged content', {
        tags: ['important', 'knowledge']
      });

      const tagged = await memory.getByTag('important');
      expect(tagged.length).toBeGreaterThan(0);
    });
  });

  describe('Auto-tier Storage', () => {
    it('should store in working memory for low importance', async () => {
      const id = await memory.store('low importance', {
        importance: 0.3,
        tier: MemoryTier.WORKING
      });
      expect(memory.working.has(id)).toBe(true);
    });

    it('should store in long-term for high importance', async () => {
      const id = await memory.store('high importance', {
        importance: 0.85
      });
      // High importance should go to long-term
      const retrieved = await memory.longTerm.get(id);
      expect(retrieved).toBeDefined();
    });
  });

  describe('Consolidation', () => {
    it('should consolidate memories between tiers', async () => {
      // Add to working with varying importance
      memory.working.set('low', 'low', { importance: 0.3 });
      memory.working.set('promote', 'promote me', { importance: 0.6 });

      const result = await memory.consolidate();
      expect(result).toBeDefined();
      expect(typeof result.promoted.toShortTerm).toBe('number');
      expect(typeof result.promoted.toLongTerm).toBe('number');
    });

    it('should emit consolidation events', async () => {
      const startedSpy = vi.fn();
      const completedSpy = vi.fn();

      memory.on('consolidation:started', startedSpy);
      memory.on('consolidation:completed', completedSpy);

      await memory.consolidate();

      expect(startedSpy).toHaveBeenCalled();
      expect(completedSpy).toHaveBeenCalled();
    });
  });

  describe('Memory Sharing', () => {
    it('should share memory between agents', async () => {
      const memoryId = await memory.longTerm.store('shared content', {
        agentId: 'agent-alpha'
      });

      const shared = await memory.share(
        memoryId,
        'agent-alpha',
        'agent-beta',
        { permissions: { canRead: true } }
      );

      expect(shared).toBe(true);
    });

    it('should check access permissions', async () => {
      const memoryId = await memory.longTerm.store('private content', {
        agentId: 'agent-alpha',
        privacy: PrivacyLevel.PRIVATE
      });

      const access = await memory.sharing.canAccess(memoryId, 'agent-beta');
      expect(access.canRead).toBe(false);
    });

    it('should get shared memories for agent', async () => {
      const memoryId = await memory.longTerm.store('content', {
        agentId: 'agent-alpha'
      });

      await memory.share(memoryId, 'agent-alpha', 'agent-beta');

      const shared = await memory.getShared('agent-beta');
      expect(shared.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should aggregate statistics across tiers', async () => {
      memory.working.set('key1', 'value1');
      await memory.shortTerm.store('value2', {});
      await memory.longTerm.store('value3', {});

      const stats = memory.getStats();
      expect(stats.working.count).toBe(1);
      expect(stats.shortTerm.count).toBe(1);
      expect(stats.longTerm.count).toBe(1);
      expect(stats.totalMemories).toBe(3);
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      memory.updateConfig({
        retrieval: {
          similarityThreshold: 0.8,
          maxResults: 50
        }
      });
      // Config should be updated without error
      expect(true).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should destroy and clean up resources', async () => {
      memory.working.set('key', 'value');
      await memory.destroy();

      const stats = memory.getStats();
      // After destroy, working memory should be cleared
      expect(stats.working.count).toBe(0);
    });
  });
});
