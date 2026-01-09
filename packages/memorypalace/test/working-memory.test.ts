/**
 * Tests for WorkingMemory
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkingMemory } from '../src/storage/working-memory.js';

describe('WorkingMemory', () => {
  let working: WorkingMemory;

  beforeEach(() => {
    working = new WorkingMemory({
      maxSize: 10,
      enableAutoEviction: true,
      defaultAgentId: 'test-agent'
    });
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', () => {
      working.set('key1', 'value1');
      expect(working.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(working.get('nonexistent')).toBeUndefined();
    });

    it('should check if key exists', () => {
      working.set('key1', 'value1');
      expect(working.has('key1')).toBe(true);
      expect(working.has('key2')).toBe(false);
    });

    it('should delete keys', () => {
      working.set('key1', 'value1');
      expect(working.delete('key1')).toBe(true);
      expect(working.has('key1')).toBe(false);
      expect(working.delete('nonexistent')).toBe(false);
    });

    it('should clear all memories', () => {
      working.set('key1', 'value1');
      working.set('key2', 'value2');
      working.clear();
      expect(working.size()).toBe(0);
    });
  });

  describe('Auto-eviction', () => {
    it('should evict least important when over capacity', () => {
      const config = { maxSize: 3 };
      const wm = new WorkingMemory(config);

      wm.set('low', 'low importance', { importance: 0.1 });
      wm.set('mid', 'mid importance', { importance: 0.5 });
      wm.set('high', 'high importance', { importance: 0.9 });

      // This should trigger eviction of 'low'
      wm.set('new', 'new item', { importance: 0.3 });

      expect(wm.has('low')).toBe(false);
      expect(wm.has('mid')).toBe(true);
      expect(wm.has('high')).toBe(true);
      expect(wm.has('new')).toBe(true);
    });

    it('should evict by recency when importance is equal', () => {
      const wm = new WorkingMemory({ maxSize: 2 });

      wm.set('first', 'first', { importance: 0.5 });
      // Access first to make it more recent
      wm.get('first');
      wm.set('second', 'second', { importance: 0.5 });

      // Third item should evict second (least recently accessed)
      wm.set('third', 'third', { importance: 0.5 });

      expect(wm.has('first')).toBe(true);
      expect(wm.has('second')).toBe(false);
      expect(wm.has('third')).toBe(true);
    });
  });

  describe('Importance Management', () => {
    it('should update importance', () => {
      working.set('key1', 'value1', { importance: 0.5 });
      working.updateImportance('key1', 0.8);
      expect(working.getMemory('key1')?.importance).toBe(0.8);
    });

    it('should clamp importance to 0-1 range', () => {
      working.set('key1', 'value1');
      working.updateImportance('key1', 1.5);
      expect(working.getMemory('key1')?.importance).toBe(1);

      working.updateImportance('key1', -0.5);
      expect(working.getMemory('key1')?.importance).toBe(0);
    });
  });

  describe('Tag Management', () => {
    it('should add tags to memory', () => {
      working.set('key1', 'value1', { tags: ['tag1'] });
      working.addTags('key1', ['tag2', 'tag3']);
      const mem = working.getMemory('key1');
      expect(mem?.tags).toContain('tag1');
      expect(mem?.tags).toContain('tag2');
      expect(mem?.tags).toContain('tag3');
    });

    it('should remove tags from memory', () => {
      working.set('key1', 'value1', { tags: ['tag1', 'tag2', 'tag3'] });
      working.removeTags('key1', ['tag2']);
      const mem = working.getMemory('key1');
      expect(mem?.tags).toContain('tag1');
      expect(mem?.tags).not.toContain('tag2');
      expect(mem?.tags).toContain('tag3');
    });

    it('should get memories by tag', () => {
      working.set('key1', 'value1', { tags: ['important', 'work'] });
      working.set('key2', 'value2', { tags: ['work'] });
      working.set('key3', 'value3', { tags: ['personal'] });

      const workMemories = working.getByTag('work');
      expect(workMemories).toHaveLength(2);
      expect(workMemories.map(m => m.id)).toContain('key1');
      expect(workMemories.map(m => m.id)).toContain('key2');
    });
  });

  describe('Agent Filtering', () => {
    it('should get memories by agent', () => {
      working.set('key1', 'value1', { agentId: 'agent-1' });
      working.set('key2', 'value2', { agentId: 'agent-2' });
      working.set('key3', 'value3', { agentId: 'agent-1' });

      const agent1Memories = working.getByAgent('agent-1');
      expect(agent1Memories).toHaveLength(2);
    });
  });

  describe('Importance Sorting', () => {
    it('should get memories sorted by importance', () => {
      working.set('key1', 'value1', { importance: 0.3 });
      working.set('key2', 'value2', { importance: 0.9 });
      working.set('key3', 'value3', { importance: 0.5 });

      const sorted = working.getByImportance(0.4);
      expect(sorted).toHaveLength(2);
      expect(sorted[0].id).toBe('key2');
      expect(sorted[1].id).toBe('key3');
    });
  });

  describe('Statistics', () => {
    it('should return correct stats', () => {
      working.set('key1', 'value1', { agentId: 'agent-1', importance: 0.5 });
      working.set('key2', 'value2', { agentId: 'agent-2', importance: 0.7 });

      const stats = working.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(10);
      expect(stats.byAgent['agent-1']).toBe(1);
      expect(stats.byAgent['agent-2']).toBe(1);
      expect(stats.averageImportance).toBeCloseTo(0.6);
    });

    it('should track access counts', () => {
      working.set('key1', 'value1');
      working.get('key1');
      working.get('key1');
      working.get('key1');

      const stats = working.getStats();
      expect(stats.totalAccesses).toBe(3);
    });
  });

  describe('Events', () => {
    it('should emit memory:created on set', () => {
      return new Promise<void>((resolve) => {
        working.on('memory:created', (data: any) => {
          expect(data.memoryId).toBe('test-key');
          working.removeAllListeners();
          resolve();
        });
        working.set('test-key', 'value');
      });
    });

    it('should emit memory:accessed on get', () => {
      return new Promise<void>((resolve) => {
        working.set('test-key', 'value');
        working.once('memory:accessed', (data: any) => {
          expect(data.memoryId).toBe('test-key');
          resolve();
        });
        working.get('test-key');
      });
    });

    it('should emit memory:evicted on delete', () => {
      return new Promise<void>((resolve) => {
        working.set('test-key', 'value');
        working.once('memory:evicted', (data: any) => {
          expect(data.memoryId).toBe('test-key');
          resolve();
        });
        working.delete('test-key');
      });
    });
  });
});
