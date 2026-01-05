/**
 * Unit Tests: Experiment Manager
 *
 * Tests the A/B experiment management system including:
 * - Experiment registration and validation
 * - Variant assignment
 * - Metric tracking
 * - Experiment lifecycle (start, pause, complete, archive)
 * - Opt-out handling
 *
 * @coverage Target: 85%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ExperimentManager,
  getGlobalManager,
  resetGlobalManager,
} from '../manager';
import type { Experiment, ExperimentConfig } from '../types';

// Mock dependencies
vi.mock('../assignment', () => ({
  AssignmentEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(() => Promise.resolve()),
    assignVariant: vi.fn(() => ({
      experimentId: 'exp-1',
      userId: 'user-1',
      variantId: 'variant-1',
      assignedAt: Date.now(),
      sessionId: '',
      exposed: false,
    })),
    getAssignment: vi.fn(() => undefined),
    hashUserId: vi.fn(() => 50),
    exportAssignments: vi.fn(() => ({})),
    importAssignments: vi.fn(),
  })),
}));

vi.mock('../metrics', () => ({
  MetricsTracker: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(() => Promise.resolve()),
    track: vi.fn(),
    getExperimentMetrics: vi.fn(() => []),
    clearExperimentData: vi.fn(),
    exportMetrics: vi.fn(() => []),
    importMetrics: vi.fn(),
  })),
}));

vi.mock('../statistics', () => ({
  StatisticalAnalyzer: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(() => Promise.resolve()),
    analyze: vi.fn(() => ({
      winner: { variantId: 'variant-1' },
      overallConfidence: 0.95,
      totalSampleSize: 1000,
    })),
    exportBanditStates: vi.fn(() => []),
    importBanditStates: vi.fn(),
  })),
}));

describe('ExperimentManager', () => {
  let manager: ExperimentManager;

  beforeEach(() => {
    // Reset global manager
    resetGlobalManager();

    // Create a fresh manager for each test
    manager = new ExperimentManager({
      enabled: true,
      persistAssignments: false, // Don't persist in tests
      trackMetrics: true,
      debug: false,
    });

    // Mock localStorage
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value.toString();
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
      };
    })();

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(async () => {
    // Clean up
    vi.clearAllMocks();
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe('initialize()', () => {
    it('should initialize successfully', async () => {
      await manager.initialize();

      expect(manager['initialized']).toBe(true);
    });

    it('should not initialize twice', async () => {
      await manager.initialize();
      await manager.initialize();

      expect(manager['initialized']).toBe(true);
    });

    it('should initialize subsystems', async () => {
      await manager.initialize();

      expect(manager['assignmentEngine'].initialize).toHaveBeenCalled();
      expect(manager['metricsTracker'].initialize).toHaveBeenCalled();
      expect(manager['statisticalAnalyzer'].initialize).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // EXPERIMENT CREATION TESTS
  // ==========================================================================

  describe('createExperiment()', () => {
    it('should create experiment with generated ID', () => {
      const experiment = manager.createExperiment({
        name: 'Test Experiment',
        type: 'ui',
        variants: [
          {
            id: 'control',
            name: 'Control',
            weight: 1,
            isControl: true,
            config: {},
          },
          {
            id: 'variant-1',
            name: 'Variant 1',
            weight: 1,
            isControl: false,
            config: {},
          },
        ],
        metrics: [
          {
            id: 'click-rate',
            name: 'Click Rate',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      expect(experiment.id).toBeDefined();
      expect(experiment.id).toMatch(/^exp-/);
      expect(experiment.name).toBe('Test Experiment');
      expect(experiment.status).toBe('draft');
    });

    it('should set timestamps on creation', () => {
      const beforeCreate = Date.now();
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });
      const afterCreate = Date.now();

      expect(experiment.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(experiment.createdAt).toBeLessThanOrEqual(afterCreate);
      expect(experiment.updatedAt).toBe(experiment.createdAt);
    });

    it('should normalize variant weights', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 3, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      expect(experiment.variants[0].weight).toBeCloseTo(0.75, 1);
      expect(experiment.variants[1].weight).toBeCloseTo(0.25, 1);
    });

    it('should validate experiment has at least 2 variants', () => {
      expect(() => {
        manager.createExperiment({
          name: 'Invalid',
          type: 'ui',
          variants: [
            { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          ],
          metrics: [
            {
              id: 'metric',
              name: 'Metric',
              primary: true,
              type: 'binary',
              direction: 'maximize',
            },
          ],
          trafficAllocation: 1.0,
          confidenceThreshold: 0.95,
        });
      }).toThrow('must have at least 2 variants');
    });

    it('should validate experiment has at least one metric', () => {
      expect(() => {
        manager.createExperiment({
          name: 'Invalid',
          type: 'ui',
          variants: [
            { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
            { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
          ],
          metrics: [],
          trafficAllocation: 1.0,
          confidenceThreshold: 0.95,
        });
      }).toThrow('must have at least one metric');
    });

    it('should validate experiment has exactly one primary metric', () => {
      expect(() => {
        manager.createExperiment({
          name: 'Invalid',
          type: 'ui',
          variants: [
            { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
            { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
          ],
          metrics: [
            {
              id: 'metric-1',
              name: 'Metric 1',
              primary: true,
              type: 'binary',
              direction: 'maximize',
            },
            {
              id: 'metric-2',
              name: 'Metric 2',
              primary: true,
              type: 'binary',
              direction: 'maximize',
            },
          ],
          trafficAllocation: 1.0,
          confidenceThreshold: 0.95,
        });
      }).toThrow('must have exactly one primary metric');
    });

    it('should validate traffic allocation range', () => {
      expect(() => {
        manager.createExperiment({
          name: 'Invalid',
          type: 'ui',
          variants: [
            { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
            { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
          ],
          metrics: [
            {
              id: 'metric',
              name: 'Metric',
              primary: true,
              type: 'binary',
              direction: 'maximize',
            },
          ],
          trafficAllocation: 1.5,
          confidenceThreshold: 0.95,
        });
      }).toThrow('Traffic allocation must be between 0 and 1');
    });

    it('should validate confidence threshold range', () => {
      expect(() => {
        manager.createExperiment({
          name: 'Invalid',
          type: 'ui',
          variants: [
            { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
            { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
          ],
          metrics: [
            {
              id: 'metric',
              name: 'Metric',
              primary: true,
              type: 'binary',
              direction: 'maximize',
            },
          ],
          trafficAllocation: 1.0,
          confidenceThreshold: 1.5,
        });
      }).toThrow('Confidence threshold must be between 0 and 1');
    });

    it('should validate exactly one control variant', () => {
      expect(() => {
        manager.createExperiment({
          name: 'Invalid',
          type: 'ui',
          variants: [
            { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false },
            { id: 'variant-2', name: 'Variant 2', weight: 1, isControl: false },
          ],
          metrics: [
            {
              id: 'metric',
              name: 'Metric',
              primary: true,
              type: 'binary',
              direction: 'maximize',
            },
          ],
          trafficAllocation: 1.0,
          confidenceThreshold: 0.95,
        });
      }).toThrow('must have exactly one control variant');
    });

    it('should store experiment', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      const retrieved = manager.getExperiment(experiment.id);

      expect(retrieved).toEqual(experiment);
    });
  });

  // ==========================================================================
  // EXPERIMENT LIFECYCLE TESTS
  // ==========================================================================

  describe('startExperiment()', () => {
    it('should start draft experiment', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      manager.startExperiment(experiment.id);

      expect(experiment.status).toBe('running');
      expect(experiment.startTime).toBeDefined();
      expect(experiment.startTime).toBeGreaterThan(0);
    });

    it('should start paused experiment', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      experiment.status = 'paused';
      manager.startExperiment(experiment.id);

      expect(experiment.status).toBe('running');
    });

    it('should not start running experiment', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      experiment.status = 'running';

      expect(() => manager.startExperiment(experiment.id)).toThrow(
        'cannot be started from status: running'
      );
    });

    it('should throw for non-existent experiment', () => {
      expect(() => manager.startExperiment('non-existent')).toThrow(
        'Experiment not found'
      );
    });
  });

  describe('pauseExperiment()', () => {
    it('should pause running experiment', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      experiment.status = 'running';
      manager.pauseExperiment(experiment.id);

      expect(experiment.status).toBe('paused');
    });

    it('should not pause non-running experiment', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      expect(() => manager.pauseExperiment(experiment.id)).toThrow(
        'cannot be paused from status: draft'
      );
    });
  });

  describe('resumeExperiment()', () => {
    it('should resume paused experiment', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      experiment.status = 'paused';
      manager.resumeExperiment(experiment.id);

      expect(experiment.status).toBe('running');
    });

    it('should not resume non-paused experiment', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      expect(() => manager.resumeExperiment(experiment.id)).toThrow(
        'cannot be resumed from status: draft'
      );
    });
  });

  describe('completeExperiment()', () => {
    it('should complete running experiment', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      experiment.status = 'running';
      manager.completeExperiment(experiment.id);

      expect(experiment.status).toBe('completed');
      expect(experiment.endTime).toBeDefined();
    });

    it('should not complete non-running experiment', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      expect(() => manager.completeExperiment(experiment.id)).toThrow(
        'cannot be completed from status: draft'
      );
    });
  });

  describe('archiveExperiment()', () => {
    it('should archive completed experiment', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      experiment.status = 'completed';
      manager.archiveExperiment(experiment.id);

      expect(experiment.status).toBe('archived');
    });

    it('should not archive non-completed experiment', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      expect(() => manager.archiveExperiment(experiment.id)).toThrow(
        'Only completed experiments can be archived'
      );
    });
  });

  describe('deleteExperiment()', () => {
    it('should delete draft experiment', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      manager.deleteExperiment(experiment.id);

      const retrieved = manager.getExperiment(experiment.id);
      expect(retrieved).toBeUndefined();
    });

    it('should delete archived experiment', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      experiment.status = 'archived';
      manager.deleteExperiment(experiment.id);

      const retrieved = manager.getExperiment(experiment.id);
      expect(retrieved).toBeUndefined();
    });

    it('should not delete running experiment', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      experiment.status = 'running';

      expect(() => manager.deleteExperiment(experiment.id)).toThrow(
        'Cannot delete experiment with status: running'
      );
    });
  });

  // ==========================================================================
  // VARIANT ASSIGNMENT TESTS
  // ==========================================================================

  describe('assignVariant()', () => {
    it('should assign variant to user', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      experiment.status = 'running';

      const variant = manager.assignVariant(experiment.id, 'user-123');

      expect(variant).toBeDefined();
      expect(variant?.id).toBe('variant-1');
    });

    it('should return null for non-running experiment', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      const variant = manager.assignVariant(experiment.id, 'user-123');

      expect(variant).toBeNull();
    });

    it('should return null for non-existent experiment', () => {
      const variant = manager.assignVariant('non-existent', 'user-123');

      expect(variant).toBeNull();
    });

    it('should respect traffic allocation', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 0.5,
        confidenceThreshold: 0.95,
      });

      experiment.status = 'running';

      // Mock hashUserId to return a value outside traffic allocation
      manager['assignmentEngine'].hashUserId = vi.fn(() => 75);

      const variant = manager.assignVariant(experiment.id, 'user-123');

      expect(variant).toBeNull();
    });
  });

  // ==========================================================================
  // METRIC TRACKING TESTS
  // ==========================================================================

  describe('trackMetric()', () => {
    it('should track metric when enabled', () => {
      manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      manager.trackMetric('exp-1', 'variant-1', 'metric', 1.0);

      expect(manager['metricsTracker'].track).toHaveBeenCalledWith({
        experimentId: 'exp-1',
        variantId: 'variant-1',
        metricId: 'metric',
        value: 1.0,
        timestamp: expect.any(Number),
        userId: undefined,
        sessionId: undefined,
      });
    });

    it('should not track when disabled', () => {
      manager.updateConfig({ trackMetrics: false });

      manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      manager.trackMetric('exp-1', 'variant-1', 'metric', 1.0);

      expect(manager['metricsTracker'].track).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // QUERY TESTS
  // ==========================================================================

  describe('getExperiment()', () => {
    it('should return experiment by ID', () => {
      const experiment = manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      const retrieved = manager.getExperiment(experiment.id);

      expect(retrieved).toEqual(experiment);
    });

    it('should return undefined for non-existent experiment', () => {
      const retrieved = manager.getExperiment('non-existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllExperiments()', () => {
    it('should return all experiments', () => {
      manager.createExperiment({
        name: 'Test 1',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      manager.createExperiment({
        name: 'Test 2',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      const all = manager.getAllExperiments();

      expect(all).toHaveLength(2);
    });
  });

  describe('getExperimentsByStatus()', () => {
    it('should filter experiments by status', () => {
      const exp1 = manager.createExperiment({
        name: 'Test 1',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      const exp2 = manager.createExperiment({
        name: 'Test 2',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      exp2.status = 'running';

      const draftExperiments = manager.getExperimentsByStatus('draft');
      const runningExperiments = manager.getExperimentsByStatus('running');

      expect(draftExperiments).toHaveLength(1);
      expect(runningExperiments).toHaveLength(1);
    });
  });

  // ==========================================================================
  // CONFIGURATION TESTS
  // ==========================================================================

  describe('Configuration', () => {
    it('should use default config', () => {
      const defaultManager = new ExperimentManager();

      const config = defaultManager['config'];

      expect(config.enabled).toBe(true);
      expect(config.defaultConfidenceThreshold).toBe(0.95);
      expect(config.defaultMinSampleSize).toBe(100);
      expect(config.persistAssignments).toBe(true);
      expect(config.trackMetrics).toBe(true);
    });

    it('should merge custom config with defaults', () => {
      const customManager = new ExperimentManager({
        defaultConfidenceThreshold: 0.99,
        defaultMinSampleSize: 200,
      });

      const config = customManager['config'];

      expect(config.defaultConfidenceThreshold).toBe(0.99);
      expect(config.defaultMinSampleSize).toBe(200);
      expect(config.enabled).toBe(true); // Default
    });

    it('should update config at runtime', () => {
      manager.updateConfig({ debug: true });

      expect(manager['config'].debug).toBe(true);
    });

    it('should respect enabled flag', () => {
      manager.updateConfig({ enabled: false });

      expect(manager['config'].enabled).toBe(false);
    });
  });

  // ==========================================================================
  // EVENT LISTENER TESTS
  // ==========================================================================

  describe('Event Listeners', () => {
    it('should add event listener', () => {
      const listener = vi.fn();

      manager.addEventListener('experiment_created', listener);

      expect(manager['listeners'].has('experiment_created')).toBe(true);
    });

    it('should remove event listener', () => {
      const listener = vi.fn();

      manager.addEventListener('experiment_created', listener);
      manager.removeEventListener('experiment_created', listener);

      const listeners = manager['listeners'].get('experiment_created');

      expect(listeners).not.toContain(listener);
    });

    it('should call listeners on event', () => {
      const listener = vi.fn();

      manager.addEventListener('experiment_created', listener);

      manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      expect(listener).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GLOBAL MANAGER TESTS
  // ==========================================================================

  describe('Global Manager', () => {
    it('should return same instance', () => {
      const instance1 = getGlobalManager();
      const instance2 = getGlobalManager();

      expect(instance1).toBe(instance2);
    });

    it('should reset global manager', () => {
      const instance1 = getGlobalManager();
      resetGlobalManager();
      const instance2 = getGlobalManager();

      expect(instance1).not.toBe(instance2);
    });
  });

  // ==========================================================================
  // IMPORT/EXPORT TESTS
  // ==========================================================================

  describe('Import/Export', () => {
    it('should export experiments', () => {
      manager.createExperiment({
        name: 'Test',
        type: 'ui',
        variants: [
          { id: 'control', name: 'Control', weight: 1, isControl: true, config: {} },
          { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false, config: {} },
        ],
        metrics: [
          {
            id: 'metric',
            name: 'Metric',
            primary: true,
            type: 'binary',
            direction: 'maximize',
          },
        ],
        trafficAllocation: 1.0,
        confidenceThreshold: 0.95,
      });

      const exported = manager.exportExperiments();

      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);

      expect(parsed.experiments).toBeDefined();
      expect(parsed.experiments.length).toBeGreaterThan(0);
    });

    it('should import experiments', () => {
      const data = JSON.stringify({
        experiments: [
          {
            id: 'exp-imported',
            name: 'Imported',
            type: 'ui',
            variants: [
              { id: 'control', name: 'Control', weight: 1, isControl: true },
              { id: 'variant-1', name: 'Variant 1', weight: 1, isControl: false },
            ],
            metrics: [
              {
                id: 'metric',
                name: 'Metric',
                primary: true,
                type: 'binary',
                direction: 'maximize',
              },
            ],
            trafficAllocation: 1.0,
            confidenceThreshold: 0.95,
            status: 'draft',
            startTime: null,
            endTime: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        assignments: {},
        metrics: [],
        banditStates: [],
      });

      manager.importExperiments(data);

      const imported = manager.getExperiment('exp-imported');

      expect(imported).toBeDefined();
      expect(imported?.name).toBe('Imported');
    });

    it('should throw on invalid import data', () => {
      expect(() => manager.importExperiments('invalid json')).toThrow(
        'Failed to import experiments'
      );
    });
  });
});
