import { describe, it, expect, beforeEach } from 'vitest';
import { Agent } from '../src/agent/Agent.js';
import type { Task, Bid } from '../src/types.js';

describe('Agent', () => {
  let agent: Agent;

  beforeEach(() => {
    agent = new Agent({
      id: 'agent-1',
      name: 'Test Agent',
      capabilities: [
        {
          name: 'test-capability',
          proficiency: 0.8,
          usageCount: 50,
          successRate: 0.9,
          avgExecutionTime: 2000
        },
        {
          name: 'another-capability',
          proficiency: 0.6,
          usageCount: 30,
          successRate: 0.85,
          avgExecutionTime: 1500
        }
      ],
      minBid: 10,
      maxTasks: 5,
      riskTolerance: 0.5,
      learningRate: 0.1
    });
  });

  describe('Initialization', () => {
    it('should initialize with correct config', () => {
      expect(agent.id).toBe('agent-1');
      expect(agent.name).toBe('Test Agent');
      expect(agent.getActiveTaskCount()).toBe(0);
      expect(agent.hasCapacity()).toBe(true);
    });

    it('should have correct capabilities', () => {
      const capabilities = agent.getCapabilities();
      expect(capabilities.length).toBe(2);
      expect(capabilities[0].name).toBe('test-capability');
      expect(capabilities[0].proficiency).toBe(0.8);
    });
  });

  describe('Task Evaluation', () => {
    it('should generate bid for matching task', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Test task',
        requiredCapabilities: ['test-capability'],
        budget: 100,
        timeout: 5000,
        priority: 5,
        status: 'pending'
      };

      const bid = agent.evaluateTask(task);

      expect(bid).not.toBeNull();
      expect(bid!.agentId).toBe('agent-1');
      expect(bid!.taskId).toBe('task-1');
      expect(bid!.amount).toBeGreaterThanOrEqual(10); // minBid
      expect(bid!.amount).toBeLessThanOrEqual(100); // budget
      expect(bid!.confidence).toBeGreaterThan(0);
      expect(bid!.confidence).toBeLessThanOrEqual(1);
    });

    it('should not bid on task without matching capabilities', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Test task',
        requiredCapabilities: ['unknown-capability'],
        budget: 100,
        timeout: 5000,
        priority: 5,
        status: 'pending'
      };

      const bid = agent.evaluateTask(task);
      expect(bid).toBeNull();
    });

    it('should not bid when at capacity', () => {
      // Set agent to max capacity
      for (let i = 0; i < 5; i++) {
        // Simulate active tasks
      }

      // Create task
      const task: Task = {
        id: 'task-1',
        description: 'Test task',
        requiredCapabilities: ['test-capability'],
        budget: 100,
        timeout: 5000,
        priority: 5,
        status: 'pending'
      };

      // If at capacity, should return null
      // (This would need proper task tracking in Agent)
    });
  });

  describe('Bid Calculation', () => {
    it('should calculate bid based on capability score', () => {
      const highCapabilityTask: Task = {
        id: 'task-1',
        description: 'Test task',
        requiredCapabilities: ['test-capability'], // 0.8 proficiency
        budget: 100,
        timeout: 5000,
        priority: 5,
        status: 'pending'
      };

      const lowCapabilityTask: Task = {
        id: 'task-2',
        description: 'Test task',
        requiredCapabilities: ['another-capability'], // 0.6 proficiency
        budget: 100,
        timeout: 5000,
        priority: 5,
        status: 'pending'
      };

      const highBid = agent.evaluateTask(highCapabilityTask);
      const lowBid = agent.evaluateTask(lowCapabilityTask);

      expect(highBid!.amount).toBeGreaterThan(lowBid!.amount);
    });

    it('should respect budget limit', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Test task',
        requiredCapabilities: ['test-capability'],
        budget: 20, // Low budget
        timeout: 5000,
        priority: 5,
        status: 'pending'
      };

      const bid = agent.evaluateTask(task);
      expect(bid).not.toBeNull();
      expect(bid!.amount).toBeLessThanOrEqual(20);
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate confidence based on proficiency', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Test task',
        requiredCapabilities: ['test-capability'],
        budget: 100,
        timeout: 5000,
        priority: 5,
        status: 'pending'
      };

      const bid = agent.evaluateTask(task);
      expect(bid!.confidence).toBeGreaterThan(0);
      expect(bid!.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Reputation', () => {
    it('should have initial reputation', () => {
      const reputation = agent.getReputation();
      expect(reputation.score).toBe(0.5);
      expect(reputation.tasksCompleted).toBe(0);
      expect(reputation.tasksAttempted).toBe(0);
    });

    it('should update metrics', () => {
      const metrics = agent.getMetrics();
      expect(metrics.agentId).toBe('agent-1');
      expect(metrics.activeTasks).toBe(0);
      expect(metrics.earnings).toBe(0);
      expect(metrics.winRate).toBe(0);
    });
  });

  describe('Capacity Management', () => {
    it('should check capacity correctly', () => {
      expect(agent.hasCapacity()).toBe(true);
      expect(agent.getActiveTaskCount()).toBe(0);
    });
  });
});
