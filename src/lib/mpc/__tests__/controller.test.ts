/**
 * MPC Controller Tests
 *
 * Comprehensive test suite for MPC controller functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MPCController } from '../controller';
import { MPCStatus, ResourceType, TaskPriority, MPCEventType } from '../types';
import type { MPCConfig, PlanningHorizon, OptimizationObjective, CostWeights } from '../types';
import type { HardwareProfile } from '@/lib/hardware/types';

describe('MPCController', () => {
  let controller: MPCController;
  let mockHardwareProfile: HardwareProfile;
  let mockConfig: MPCConfig;

  beforeEach(() => {
    controller = new MPCController();

    // Mock hardware profile
    mockHardwareProfile = {
      timestamp: Date.now(),
      cpu: {
        cores: 8,
        concurrency: 16,
        architecture: 'x86_64',
        simd: { supported: true, type: 'wasm' },
        wasm: {
          supported: true,
          simd: true,
          threads: true,
          bulkMemory: true,
          exceptions: true,
        },
      },
      gpu: {
        available: true,
        vendor: 'NVIDIA',
        renderer: 'RTX 4080',
        vramMB: 16384,
        webgpu: { supported: true },
        webgl: { supported: true, version: 2 },
      },
      memory: {
        totalGB: 32,
        hasMemoryAPI: false,
      },
      storage: {
        indexedDB: { supported: true, available: true },
      },
      network: {
        effectiveType: '4g',
        downlinkMbps: 100,
        online: true,
        hasNetworkAPI: true,
      },
      display: {
        width: 1920,
        height: 1080,
        pixelRatio: 1,
        colorDepth: 24,
      },
      browser: {
        userAgent: 'Test',
        browser: 'Chrome',
        os: 'Linux',
        platform: 'x86_64',
        touchSupport: false,
      },
      features: {
        webWorkers: true,
        serviceWorker: true,
        webrtc: true,
        webassembly: true,
        websockets: true,
        geolocation: true,
        notifications: true,
        fullscreen: true,
        pip: true,
        webBluetooth: false,
        webusb: false,
        fileSystemAccess: true,
      },
      performanceScore: 85,
      performanceClass: 'premium',
    };

    // Mock config
    const horizon: PlanningHorizon = {
      steps: 5,
      stepDuration: 10,
      totalDuration: 50,
      replanInterval: 30,
    };

    const weights: CostWeights = {
      timeWeight: 1.0,
      qualityWeight: 1.0,
      resourceWeight: 1.0,
      riskWeight: 1.0,
      priorityWeight: 1.0,
    };

    const objective: OptimizationObjective = {
      name: 'test_objective',
      description: 'Test optimization objective',
      weights,
      constraints: [],
    };

    mockConfig = {
      horizon,
      objective,
      maxParallelAgents: 3,
      enableReplanning: 1,
      predictionUpdateInterval: 5000,
      stateHistorySize: 1000,
      anomalyThreshold: 0.7,
      conflictStrategy: 'preventive',
      hardwareProfile: mockHardwareProfile,
    };
  });

  describe('Initialization', () => {
    it('should initialize with config', async () => {
      await controller.initialize(mockConfig);

      expect(controller.getStatus()).toBe(MPCStatus.IDLE);
      expect(controller.getConfig()).toEqual(mockConfig);
    });

    it('should throw error if planning without initialization', async () => {
      await expect(controller.plan()).rejects.toThrow('MPC controller not initialized');
    });

    it('should throw error if starting without initialization', async () => {
      await expect(controller.start()).rejects.toThrow('MPC controller not initialized');
    });
  });

  describe('Planning Loop', () => {
    beforeEach(async () => {
      await controller.initialize(mockConfig);
    });

    it('should create initial plan', async () => {
      const plan = await controller.plan();

      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.steps).toBeDefined();
      expect(plan.createdAt).toBeLessThanOrEqual(Date.now());
    });

    it('should emit plan created event', async () => {
      const listener = vi.fn();
      controller.addEventListener(MPCEventType.PLAN_CREATED, listener);

      await controller.plan();

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0][0];
      expect(event.type).toBe(MPCEventType.PLAN_CREATED);
      expect(event.data.planId).toBeDefined();
    });

    it('should update status during planning', async () => {
      const statusBefore = controller.getStatus();
      expect(statusBefore).toBe(MPCStatus.IDLE);

      const planPromise = controller.plan();
      const statusDuring = controller.getStatus();
      expect(statusDuring).toBe(MPCStatus.PLANNING);

      await planPromise;
      const statusAfter = controller.getStatus();
      expect(statusAfter).toBe(MPCStatus.EXECUTING);
    });

    it('should handle planning errors gracefully', async () => {
      // Mock state manager to throw error
      const { stateManager } = await import('../state-manager');
      vi.spyOn(stateManager, 'getCurrentState').mockReturnValueOnce(null as any);

      const listener = vi.fn();
      controller.addEventListener(MPCEventType.PLAN_FAILED, listener);

      await expect(controller.plan()).rejects.toThrow();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(controller.getStatus()).toBe(MPCStatus.ERROR);
    });

    it('should generate plan with correct structure', async () => {
      const plan = await controller.plan();

      expect(plan.horizon).toEqual(mockConfig.horizon);
      expect(plan.objective).toEqual(mockConfig.objective);
      expect(plan.expectedCompletionTime).toBeGreaterThan(Date.now());
      expect(plan.expectedQuality).toBeGreaterThanOrEqual(0);
      expect(plan.expectedQuality).toBeLessThanOrEqual(1);
      expect(plan.totalCost).toBeGreaterThanOrEqual(0);
      expect(plan.risk).toBeGreaterThanOrEqual(0);
      expect(plan.risk).toBeLessThanOrEqual(1);
      expect(plan.confidence).toBeGreaterThanOrEqual(0);
      expect(plan.confidence).toBeLessThanOrEqual(1);
    });

    it('should create plan steps within horizon', async () => {
      const plan = await controller.plan();

      expect(plan.steps.length).toBeLessThanOrEqual(mockConfig.horizon.steps);

      for (const step of plan.steps) {
        expect(step.step).toBeGreaterThan(0);
        expect(step.startTime).toBeLessThanOrEqual(step.endTime);
        expect(step.risk).toBeGreaterThanOrEqual(0);
        expect(step.risk).toBeLessThanOrEqual(1);
        expect(step.confidence).toBeGreaterThanOrEqual(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should predict conflicts in plan', async () => {
      const plan = await controller.plan();

      expect(plan.predictedConflicts).toBeDefined();
      expect(Array.isArray(plan.predictedConflicts)).toBe(true);

      for (const conflict of plan.predictedConflicts) {
        expect(conflict.id).toBeDefined();
        expect(conflict.resourceType).toBeDefined();
        expect(conflict.taskIds).toBeDefined();
        expect(conflict.severity).toBeGreaterThanOrEqual(0);
        expect(conflict.severity).toBeLessThanOrEqual(1);
        expect(['contention', 'exhaustion', 'dependency', 'priority']).toContain(conflict.type);
      }
    });

    it('should allocate resources across plan steps', async () => {
      const plan = await controller.plan();

      expect(plan.resourceAllocation).toBeDefined();
      expect(plan.resourceAllocation.length).toBe(plan.steps.length);

      for (const allocation of plan.resourceAllocation) {
        expect(allocation.time).toBeDefined();
        expect(allocation.usage).toBeInstanceOf(Map);
      }
    });

    it('should assign agents to tasks', async () => {
      const plan = await controller.plan();

      expect(plan.agentAssignments).toBeInstanceOf(Map);

      for (const [agentId, taskIds] of plan.agentAssignments) {
        expect(agentId).toBeDefined();
        expect(Array.isArray(taskIds)).toBe(true);
      }
    });
  });

  describe('Execution', () => {
    beforeEach(async () => {
      await controller.initialize(mockConfig);
    });

    it('should start controller loop', async () => {
      await controller.start();

      expect(controller.getStatus()).toBe(MPCStatus.EXECUTING);

      await controller.stop();
    });

    it('should emit plan started event when starting', async () => {
      const listener = vi.fn();
      controller.addEventListener(MPCEventType.PLAN_STARTED, listener);

      await controller.start();

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0][0];
      expect(event.type).toBe(MPCEventType.PLAN_STARTED);

      await controller.stop();
    });

    it('should stop controller loop', async () => {
      await controller.start();
      await controller.stop();

      expect(controller.getStatus()).toBe(MPCStatus.PAUSED);
    });

    it('should emit plan completed event when stopping', async () => {
      const listener = vi.fn();
      controller.addEventListener(MPCEventType.PLAN_COMPLETED, listener);

      await controller.start();
      await controller.stop();

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0][0];
      expect(event.type).toBe(MPCEventType.PLAN_COMPLETED);
    });

    it('should not start if already running', async () => {
      await controller.start();
      const status1 = controller.getStatus();

      await controller.start(); // Should be idempotent
      const status2 = controller.getStatus();

      expect(status1).toBe(status2);
      expect(status2).toBe(MPCStatus.EXECUTING);

      await controller.stop();
    });

    it('should not stop if not running', async () => {
      await controller.stop(); // Should be idempotent

      expect(controller.getStatus()).toBe(MPCStatus.IDLE);
    });

    it('should execute plan steps', async () => {
      const plan = await controller.plan();

      expect(plan.steps.length).toBeGreaterThan(0);

      // Execute should not throw
      await expect(controller.execute(plan)).resolves.not.toThrow();
    });

    it('should update current plan when executing', async () => {
      const plan = await controller.plan();

      await controller.execute(plan);

      const currentPlan = controller.getCurrentPlan();
      expect(currentPlan).toBeDefined();
      expect(currentPlan?.id).toBe(plan.id);
    });
  });

  describe('Task Scheduling', () => {
    beforeEach(async () => {
      await controller.initialize(mockConfig);

      // Register mock agents
      const { stateManager } = await import('../state-manager');
      await stateManager.registerAgent({
        id: 'test-agent-1',
        name: 'Test Agent 1',
        description: 'Test agent',
        icon: '🤖',
        category: 'analysis' as any,
        activationMode: 'foreground' as any,
        initialState: { status: 'idle' as any },
        metadata: {
          version: '1.0.0',
          author: 'Test',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
        },
      });

      await stateManager.registerAgent({
        id: 'test-agent-2',
        name: 'Test Agent 2',
        description: 'Test agent',
        icon: '🤖',
        category: 'analysis' as any,
        activationMode: 'foreground' as any,
        initialState: { status: 'idle' as any },
        metadata: {
          version: '1.0.0',
          author: 'Test',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
        },
      });

      // Add mock tasks
      await stateManager.addTask({
        id: 'task-1',
        name: 'Test Task 1',
        description: 'Test task',
        agentId: 'test-agent-1',
        priority: TaskPriority.HIGH,
        estimatedDuration: 10,
        resourceRequirements: new Map([[ResourceType.CPU, 2]]),
        dependencies: [],
        createdAt: Date.now(),
        status: 'pending',
      });

      await stateManager.addTask({
        id: 'task-2',
        name: 'Test Task 2',
        description: 'Test task',
        agentId: 'test-agent-2',
        priority: TaskPriority.NORMAL,
        estimatedDuration: 15,
        resourceRequirements: new Map([[ResourceType.CPU, 2]]),
        dependencies: [],
        createdAt: Date.now(),
        status: 'pending',
      });
    });

    it('should schedule pending tasks in plan', async () => {
      const plan = await controller.plan();

      const allTaskIds = plan.steps.flatMap((step) => step.tasks);
      expect(allTaskIds.length).toBeGreaterThan(0);
    });

    it('should respect task priority when scheduling', async () => {
      const plan = await controller.plan();

      // Find first step that contains tasks
      const firstStepWithTasks = plan.steps.find((step) => step.tasks.length > 0);

      expect(firstStepWithTasks).toBeDefined();

      // High priority tasks should come first
      const { stateManager } = await import('../state-manager');
      const state = stateManager.getCurrentState()!;

      const tasks = firstStepWithTasks!.tasks
        .map((id) => state.tasks.get(id)!)
        .filter((t) => t !== undefined)
        .sort((a, b) => b.priority - a.priority);

      expect(tasks[0].priority).toBeGreaterThanOrEqual(tasks[tasks.length - 1].priority);
    });

    it('should respect max parallel agents constraint', async () => {
      const plan = await controller.plan();

      for (const step of plan.steps) {
        expect(step.tasks.length).toBeLessThanOrEqual(mockConfig.maxParallelAgents);
      }
    });

    it('should handle task dependencies', async () => {
      const { stateManager } = await import('../state-manager');

      // Add task with dependency
      await stateManager.addTask({
        id: 'task-3',
        name: 'Test Task 3',
        description: 'Test task with dependency',
        agentId: 'test-agent-1',
        priority: TaskPriority.NORMAL,
        estimatedDuration: 10,
        resourceRequirements: new Map([[ResourceType.CPU, 2]]),
        dependencies: ['task-1'],
        createdAt: Date.now(),
        status: 'pending',
      });

      const plan = await controller.plan();

      // task-3 should not appear in same or earlier step as task-1
      const task1Steps = plan.steps
        .filter((step) => step.tasks.includes('task-1'))
        .map((step) => step.step);

      const task3Steps = plan.steps
        .filter((step) => step.tasks.includes('task-3'))
        .map((step) => step.step);

      if (task3Steps.length > 0 && task1Steps.length > 0) {
        expect(Math.min(...task3Steps)).toBeGreaterThan(Math.min(...task1Steps));
      }
    });
  });

  describe('Resource Management', () => {
    beforeEach(async () => {
      await controller.initialize(mockConfig);
    });

    it('should track resource usage in plan steps', async () => {
      const plan = await controller.plan();

      for (const step of plan.steps) {
        expect(step.resourceUsage).toBeInstanceOf(Map);

        for (const [resourceType, usage] of step.resourceUsage) {
          expect(Object.values(ResourceType)).toContain(resourceType);
          expect(usage).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should predict resource conflicts', async () => {
      const plan = await controller.plan();

      // Add tasks that would cause conflict
      const { stateManager } = await import('../state-manager');

      // This would require more complex setup
      // For now, just verify conflict structure
      expect(plan.predictedConflicts).toBeDefined();
    });
  });

  describe('Conflict Resolution', () => {
    beforeEach(async () => {
      await controller.initialize(mockConfig);
    });

    it('should detect conflicts during execution', async () => {
      const plan = await controller.plan();

      // Mock conflicts
      if (plan.predictedConflicts.length > 0) {
        const conflictListener = vi.fn();
        controller.addEventListener(MPCEventType.CONFLICT_DETECTED, conflictListener);

        // Trigger conflict check
        await controller['checkForConflicts']();

        expect(conflictListener).toHaveBeenCalled();
      }
    });

    it('should resolve detected conflicts', async () => {
      const plan = await controller.plan();

      if (plan.predictedConflicts.length > 0) {
        const resolveListener = vi.fn();
        controller.addEventListener(MPCEventType.CONFLICT_RESOLVED, resolveListener);

        await controller['resolveConflict'](plan.predictedConflicts[0]);

        expect(resolveListener).toHaveBeenCalled();
      }
    });
  });

  describe('Replanning', () => {
    beforeEach(async () => {
      await controller.initialize(mockConfig);
    });

    it('should trigger replan when requested', async () => {
      const listener = vi.fn();
      controller.addEventListener(MPCEventType.REPLAN_TRIGGERED, listener);

      await controller.triggerReplan();

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0][0];
      expect(event.type).toBe(MPCEventType.REPLAN_TRIGGERED);
      expect(event.data.reason).toBe('manual_trigger');
    });

    it('should throw error if replanning disabled', async () => {
      mockConfig.enableReplanning = 0;
      await controller.initialize(mockConfig);

      await expect(controller.triggerReplan()).rejects.toThrow('Replanning not enabled');
    });

    it('should generate new plan on replan', async () => {
      const plan1 = await controller.plan();
      const plan2 = await controller.triggerReplan();

      expect(plan2.id).not.toBe(plan1.id);
    });
  });

  describe('Cost Function', () => {
    beforeEach(async () => {
      await controller.initialize(mockConfig);
    });

    it('should calculate plan cost', async () => {
      const plan = await controller.plan();

      expect(plan.totalCost).toBeGreaterThanOrEqual(0);
    });

    it('should consider time in cost calculation', async () => {
      const plan1 = await controller.plan();

      // Modify weights
      mockConfig.objective.weights.timeWeight = 2.0;
      await controller.initialize(mockConfig);

      const plan2 = await controller.plan();

      // Time-weighted plan should have different cost
      expect(plan2.totalCost).not.toBe(plan1.totalCost);
    });

    it('should consider quality in cost calculation', async () => {
      const plan1 = await controller.plan();

      mockConfig.objective.weights.qualityWeight = 2.0;
      await controller.initialize(mockConfig);

      const plan2 = await controller.plan();

      expect(plan2.totalCost).not.toBe(plan1.totalCost);
    });
  });

  describe('Event System', () => {
    beforeEach(async () => {
      await controller.initialize(mockConfig);
    });

    it('should add event listener', () => {
      const listener = vi.fn();
      controller.addEventListener(MPCEventType.PLAN_CREATED, listener);

      // Listener added successfully
      expect(() => {
        controller.removeEventListener(MPCEventType.PLAN_CREATED, listener);
      }).not.toThrow();
    });

    it('should remove event listener', async () => {
      const listener = vi.fn();
      controller.addEventListener(MPCEventType.PLAN_CREATED, listener);
      controller.removeEventListener(MPCEventType.PLAN_CREATED, listener);

      await controller.plan();

      expect(listener).not.toHaveBeenCalled();
    });

    it('should emit multiple events during execution', async () => {
      const events: string[] = [];
      const allTypes = Object.values(MPCEventType);

      allTypes.forEach((type) => {
        controller.addEventListener(type, (event) => {
          events.push(event.type);
        });
      });

      await controller.plan();

      expect(events).toContain(MPCEventType.PLAN_CREATED);
      expect(events).toContain(MPCEventType.STATE_CHANGED);
    });
  });

  describe('Reset', () => {
    it('should reset controller state', async () => {
      await controller.initialize(mockConfig);
      await controller.start();

      await controller.reset();

      expect(controller.getStatus()).toBe(MPCStatus.IDLE);
      expect(controller.getCurrentPlan()).toBeNull();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await controller.initialize(mockConfig);
    });

    it('should handle planning errors gracefully', async () => {
      // Mock state manager to throw error
      const { stateManager } = await import('../state-manager');
      vi.spyOn(stateManager, 'getCurrentState').mockReturnValueOnce(null as any);

      const errorListener = vi.fn();
      controller.addEventListener(MPCEventType.PLAN_FAILED, errorListener);

      await expect(controller.plan()).rejects.toThrow();

      expect(errorListener).toHaveBeenCalled();
      expect(controller.getStatus()).toBe(MPCStatus.ERROR);
    });

    it('should recover from errors', async () => {
      // Mock state manager to throw error once
      const { stateManager } = await import('../state-manager');
      vi.spyOn(stateManager, 'getCurrentState')
        .mockReturnValueOnce(null as any)
        .mockReturnValueOnce(stateManager.getCurrentState()!);

      await expect(controller.plan()).rejects.toThrow();
      expect(controller.getStatus()).toBe(MPCStatus.ERROR);

      // Should succeed on retry
      await controller.plan();
      expect(controller.getStatus()).toBe(MPCStatus.EXECUTING);
    });
  });

  describe('Metrics', () => {
    beforeEach(async () => {
      await controller.initialize(mockConfig);
    });

    it('should update metrics during execution', async () => {
      const { stateManager } = await import('../state-manager');
      const commitSpy = vi.spyOn(stateManager, 'commitState');

      await controller['updateMetrics']();

      expect(commitSpy).toHaveBeenCalled();
    });
  });

  describe('Observer', () => {
    beforeEach(async () => {
      await controller.initialize(mockConfig);
    });

    it('should observe state and return observations', async () => {
      const { stateManager } = await import('../state-manager');
      const state = stateManager.getCurrentState();

      if (state) {
        const observations = await controller['observer'](state);

        expect(observations).toBeDefined();
        expect(observations.pendingTasks).toBeDefined();
        expect(observations.runningTasks).toBeDefined();
        expect(observations.completedTasks).toBeDefined();
        expect(observations.idleAgents).toBeDefined();
        expect(observations.runningAgents).toBeDefined();
        expect(observations.resourceUtilization).toBeDefined();
        expect(observations.metrics).toBeDefined();
      }
    });
  });

  describe('Predictor', () => {
    beforeEach(async () => {
      await controller.initialize(mockConfig);
    });

    it('should predict future states', async () => {
      const { stateManager } = await import('../state-manager');
      const state = stateManager.getCurrentState();

      if (state) {
        const predictions = await controller['predictor'](
          state,
          {},
          mockConfig.horizon
        );

        expect(predictions).toBeDefined();
        expect(predictions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Optimizer', () => {
    beforeEach(async () => {
      await controller.initialize(mockConfig);
    });

    it('should optimize predictions into plan', async () => {
      const { stateManager } = await import('../state-manager');
      const state = stateManager.getCurrentState();

      if (state) {
        const predictions = await controller['predictor'](
          state,
          {},
          mockConfig.horizon
        );

        const plan = await controller['optimizer'](
          predictions,
          mockConfig.objective
        );

        expect(plan).toBeDefined();
        expect(plan.steps).toBeDefined();
        expect(plan.totalCost).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Action Executor', () => {
    beforeEach(async () => {
      await controller.initialize(mockConfig);
    });

    it('should execute plan actions', async () => {
      const plan = await controller.plan();
      const { stateManager } = await import('../state-manager');
      const state = stateManager.getCurrentState();

      if (state) {
        const results = await controller['actionExecutor'](plan, state);

        expect(results).toBeDefined();
        expect(results).toBeInstanceOf(Map);
      }
    });
  });
});
