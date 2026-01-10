import { describe, it, expect, beforeEach } from 'vitest';
import { MarketEngine } from '../src/market/MarketEngine.js';
import type { Task, Bid, TaskResult } from '../src/types.js';

describe('MarketEngine', () => {
  let market: MarketEngine;

  beforeEach(() => {
    market = new MarketEngine({
      type: 'double-auction',
      transactionFee: 0.05,
      reputationSystem: true,
      reputationWeight: 0.3,
      minReputation: 0.3
    });
  });

  describe('Task Posting', () => {
    it('should post a task successfully', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Test task',
        requiredCapabilities: ['test'],
        budget: 100,
        timeout: 5000,
        priority: 5,
        status: 'pending'
      };

      market.postTask(task);

      const retrieved = market.getTask('task-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.status).toBe('posted');
    });

    it('should track task statistics', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Test task',
        requiredCapabilities: ['test'],
        budget: 100,
        timeout: 5000,
        priority: 5,
        status: 'pending'
      };

      market.postTask(task);

      const stats = market.getStats();
      expect(stats.totalTasks).toBe(1);
      expect(stats.pendingTasks).toBe(1);
    });
  });

  describe('Bid Placement', () => {
    it('should accept valid bid', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Test task',
        requiredCapabilities: ['test'],
        budget: 100,
        timeout: 5000,
        priority: 5,
        status: 'pending'
      };

      market.postTask(task);

      const bid: Bid = {
        id: 'bid-1',
        agentId: 'agent-1',
        taskId: 'task-1',
        amount: 50,
        estimatedDuration: 2000,
        confidence: 0.8,
        timestamp: Date.now(),
        status: 'pending'
      };

      const result = market.placeBid(bid);
      expect(result).toBe(true);

      const stats = market.getStats();
      expect(stats.totalBids).toBe(1);
    });

    it('should reject bid over budget', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Test task',
        requiredCapabilities: ['test'],
        budget: 100,
        timeout: 5000,
        priority: 5,
        status: 'pending'
      };

      market.postTask(task);

      const bid: Bid = {
        id: 'bid-1',
        agentId: 'agent-1',
        taskId: 'task-1',
        amount: 150, // Over budget
        estimatedDuration: 2000,
        confidence: 0.8,
        timestamp: Date.now(),
        status: 'pending'
      };

      const result = market.placeBid(bid);
      expect(result).toBe(false);
    });
  });

  describe('Bid Matching', () => {
    it('should match best bid', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Test task',
        requiredCapabilities: ['test'],
        budget: 100,
        timeout: 5000,
        priority: 5,
        status: 'pending'
      };

      market.postTask(task);

      // Place multiple bids
      const bids: Bid[] = [
        {
          id: 'bid-1',
          agentId: 'agent-1',
          taskId: 'task-1',
          amount: 80,
          estimatedDuration: 2000,
          confidence: 0.9,
          timestamp: Date.now(),
          status: 'pending'
        },
        {
          id: 'bid-2',
          agentId: 'agent-2',
          taskId: 'task-1',
          amount: 60,
          estimatedDuration: 3000,
          confidence: 0.7,
          timestamp: Date.now(),
          status: 'pending'
        }
      ];

      for (const bid of bids) {
        market.placeBid(bid);
      }

      // Best bid should be matched (agent-1 with higher confidence)
      const activeMatches = market.getActiveMatches();
      expect(activeMatches.length).toBe(1);
      expect(activeMatches[0].agentId).toBe('agent-1'); // Higher confidence wins
    });
  });

  describe('Reputation System', () => {
    it('should update agent reputation on successful completion', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Test task',
        requiredCapabilities: ['test'],
        budget: 100,
        timeout: 5000,
        priority: 5,
        status: 'pending'
      };

      market.postTask(task);

      const bid: Bid = {
        id: 'bid-1',
        agentId: 'agent-1',
        taskId: 'task-1',
        amount: 50,
        estimatedDuration: 2000,
        confidence: 0.8,
        timestamp: Date.now(),
        status: 'pending'
      };

      market.placeBid(bid);

      // Wait for match
      const activeMatches = market.getActiveMatches();
      expect(activeMatches.length).toBe(1);

      // Complete with success
      const result: TaskResult = {
        taskId: 'task-1',
        agentId: 'agent-1',
        output: { success: true },
        executionTime: 2000,
        quality: 0.9,
        success: true
      };

      market.completeMatch(activeMatches[0].id, result);

      // Check reputation increased
      const reputation = market.getAgentReputation('agent-1');
      expect(reputation).toBeGreaterThan(0.5); // Should increase from default
    });

    it('should decrease reputation on failure', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Test task',
        requiredCapabilities: ['test'],
        budget: 100,
        timeout: 5000,
        priority: 5,
        status: 'pending'
      };

      market.postTask(task);

      const bid: Bid = {
        id: 'bid-1',
        agentId: 'agent-1',
        taskId: 'task-1',
        amount: 50,
        estimatedDuration: 2000,
        confidence: 0.8,
        timestamp: Date.now(),
        status: 'pending'
      };

      market.placeBid(bid);

      // Wait for match
      const activeMatches = market.getActiveMatches();
      expect(activeMatches.length).toBe(1);

      // Complete with failure
      const result: TaskResult = {
        taskId: 'task-1',
        agentId: 'agent-1',
        output: null,
        executionTime: 2000,
        quality: 0,
        success: false,
        error: 'Test failure'
      };

      market.completeMatch(activeMatches[0].id, result);

      // Check reputation decreased
      const reputation = market.getAgentReputation('agent-1');
      expect(reputation).toBeLessThan(0.5); // Should decrease from default
    });
  });

  describe('Market Statistics', () => {
    it('should track statistics accurately', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Test task',
        requiredCapabilities: ['test'],
        budget: 100,
        timeout: 5000,
        priority: 5,
        status: 'pending'
      };

      market.postTask(task);

      const bid: Bid = {
        id: 'bid-1',
        agentId: 'agent-1',
        taskId: 'task-1',
        amount: 50,
        estimatedDuration: 2000,
        confidence: 0.8,
        timestamp: Date.now(),
        status: 'pending'
      };

      market.placeBid(bid);

      const stats = market.getStats();
      expect(stats.totalTasks).toBe(1);
      expect(stats.totalBids).toBe(1);
      expect(stats.avgBidAmount).toBe(50);
    });
  });

  describe('Task Cancellation', () => {
    it('should cancel task successfully', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Test task',
        requiredCapabilities: ['test'],
        budget: 100,
        timeout: 5000,
        priority: 5,
        status: 'pending'
      };

      market.postTask(task);

      const cancelled = market.cancelTask('task-1');
      expect(cancelled).toBe(true);

      const retrieved = market.getTask('task-1');
      expect(retrieved?.status).toBe('failed');
    });
  });

  describe('Bid Withdrawal', () => {
    it('should withdraw bid successfully', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Test task',
        requiredCapabilities: ['test'],
        budget: 100,
        timeout: 5000,
        priority: 5,
        status: 'pending'
      };

      market.postTask(task);

      const bid: Bid = {
        id: 'bid-1',
        agentId: 'agent-1',
        taskId: 'task-1',
        amount: 50,
        estimatedDuration: 2000,
        confidence: 0.8,
        timestamp: Date.now(),
        status: 'pending'
      };

      market.placeBid(bid);

      const withdrawn = market.withdrawBid('bid-1');
      expect(withdrawn).toBe(true);
    });
  });
});
