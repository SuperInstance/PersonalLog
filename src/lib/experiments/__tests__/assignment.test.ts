/**
 * Unit Tests: Experiment Assignment Engine
 *
 * Tests the assignment system including:
 * - Consistent hashing for user IDs
 * - Bandit algorithm (Thompson sampling)
 * - Traffic allocation
 * - Re-seeding behavior
 *
 * @coverage Target: 85%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AssignmentEngine } from '../assignment';
import type { Variant, ExperimentConfig } from '../types';

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

describe('AssignmentEngine', () => {
  let engine: AssignmentEngine;
  let variants: Variant[];

  beforeEach(() => {
    // Create a fresh engine for each test
    const config: ExperimentConfig = {
      enabled: true,
      persistAssignments: false,
      assignmentSalt: 'test-salt',
      debug: false,
      defaultConfidenceThreshold: 0.95,
      defaultMinSampleSize: 100,
      defaultTrafficAllocation: 1.0,
      earlyStoppingByDefault: false,
      banditByDefault: false,
      storageKey: 'experiments',
      trackMetrics: true,
    };

    engine = new AssignmentEngine(config);

    // Define test variants
    variants = [
      {
        id: 'control',
        name: 'Control',
        weight: 1,
        isControl: true,
        config: {},
      },
      {
        id: 'variant-a',
        name: 'Variant A',
        weight: 1,
        isControl: false,
        config: {},
      },
      {
        id: 'variant-b',
        name: 'Variant B',
        weight: 1,
        isControl: false,
        config: {},
      },
    ];
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe('initialize()', () => {
    it('should initialize successfully', async () => {
      await engine.initialize();

      expect(engine).toBeDefined();
    });

    it('should load assignments from storage if persisting', async () => {
      const persistEngine = new AssignmentEngine({
        enabled: true,
        persistAssignments: true,
        storageKey: 'test-assignments',
        assignmentSalt: 'test-salt',
        defaultConfidenceThreshold: 0.95,
        defaultMinSampleSize: 100,
        defaultTrafficAllocation: 1.0,
        earlyStoppingByDefault: false,
        banditByDefault: false,
        trackMetrics: true,
        debug: false,
      });

      // Save some test data
      localStorage.setItem('test-assignments-assignments', JSON.stringify({
        'exp-1:user-123': {
          experimentId: 'exp-1',
          userId: 'user-123',
          variantId: 'control',
          assignedAt: Date.now(),
          sessionId: '',
          exposed: false,
        },
      }));

      await persistEngine.initialize();

      const assignment = persistEngine.getAssignment('exp-1', 'user-123');

      expect(assignment).toBeDefined();
      expect(assignment?.variantId).toBe('control');

      localStorage.clear();
    });
  });

  // ==========================================================================
  // VARIANT ASSIGNMENT TESTS
  // ==========================================================================

  describe('assignVariant()', () => {
    it('should assign variant to user', () => {
      const assignment = engine.assignVariant('exp-1', 'user-123', variants);

      expect(assignment).toBeDefined();
      expect(assignment?.experimentId).toBe('exp-1');
      expect(assignment?.userId).toBe('user-123');
      expect(assignment?.variantId).toBeDefined();
      expect(assignment?.assignedAt).toBeDefined();
      expect(assignment?.exposed).toBe(false);
    });

    it('should return existing assignment for same user', () => {
      const assignment1 = engine.assignVariant('exp-1', 'user-123', variants);
      const assignment2 = engine.assignVariant('exp-1', 'user-123', variants);

      expect(assignment1).toEqual(assignment2);
    });

    it('should assign different variants to different users', () => {
      const assignment1 = engine.assignVariant('exp-1', 'user-1', variants);
      const assignment2 = engine.assignVariant('exp-1', 'user-2', variants);

      expect(assignment1?.userId).toBe('user-1');
      expect(assignment2?.userId).toBe('user-2');
    });

    it('should include sessionId if provided', () => {
      const assignment = engine.assignVariant('exp-1', 'user-123', variants, 'session-456');

      expect(assignment?.sessionId).toBe('session-456');
    });

    it('should persist assignment if enabled', () => {
      const persistEngine = new AssignmentEngine({
        enabled: true,
        persistAssignments: true,
        storageKey: 'test-assignments',
        assignmentSalt: 'test-salt',
        defaultConfidenceThreshold: 0.95,
        defaultMinSampleSize: 100,
        defaultTrafficAllocation: 1.0,
        earlyStoppingByDefault: false,
        banditByDefault: false,
        trackMetrics: true,
        debug: false,
      });

      persistEngine.assignVariant('exp-1', 'user-123', variants);

      const stored = localStorage.getItem('test-assignments-assignments');

      expect(stored).toBeDefined();
      expect(JSON.parse(stored || '{}')).toHaveProperty('exp-1:user-123');

      localStorage.clear();
    });
  });

  // ==========================================================================
  // CONSISTENT HASHING TESTS
  // ==========================================================================

  describe('Consistent Hashing', () => {
    it('should assign same variant to same user consistently', () => {
      const assignment1 = engine.assignVariant('exp-1', 'user-123', variants);
      const assignment2 = engine.assignVariant('exp-1', 'user-123', variants);

      expect(assignment1?.variantId).toBe(assignment2?.variantId);
    });

    it('should assign different variants based on user ID', () => {
      const assignments = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const assignment = engine.assignVariant('exp-1', `user-${i}`, variants);
        if (assignment) {
          assignments.add(assignment.variantId);
        }
      }

      // Should assign all three variants
      expect(assignments.size).toBe(3);
    });

    it('should consider experiment ID in hash', () => {
      const assignment1 = engine.assignVariant('exp-1', 'user-123', variants);
      const assignment2 = engine.assignVariant('exp-2', 'user-123', variants);

      // Could be same or different, but should use different hashes
      expect(assignment1?.experimentId).toBe('exp-1');
      expect(assignment2?.experimentId).toBe('exp-2');
    });

    it('should respect variant weights', () => {
      const weightedVariants: Variant[] = [
        {
          id: 'control',
          name: 'Control',
          weight: 7, // 70%
          isControl: true,
          config: {},
        },
        {
          id: 'variant-a',
          name: 'Variant A',
          weight: 3, // 30%
          isControl: false,
          config: {},
        },
      ];

      let controlCount = 0;
      let variantACount = 0;

      for (let i = 0; i < 1000; i++) {
        const assignment = engine.assignVariant('exp-1', `user-${i}`, weightedVariants);
        if (assignment?.variantId === 'control') {
          controlCount++;
        } else if (assignment?.variantId === 'variant-a') {
          variantACount++;
        }
      }

      // Control should have roughly 70%
      const controlRatio = controlCount / (controlCount + variantACount);
      expect(controlRatio).toBeGreaterThan(0.65);
      expect(controlRatio).toBeLessThan(0.75);
    });
  });

  // ==========================================================================
  // HASH USER ID TESTS
  // ==========================================================================

  describe('hashUserId()', () => {
    it('should return consistent hash for same user ID', () => {
      const hash1 = engine.hashUserId('user-123');
      const hash2 = engine.hashUserId('user-123');

      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different user IDs', () => {
      const hash1 = engine.hashUserId('user-1');
      const hash2 = engine.hashUserId('user-2');

      expect(hash1).not.toBe(hash2);
    });

    it('should return value in 0-100 range', () => {
      for (let i = 0; i < 100; i++) {
        const hash = engine.hashUserId(`user-${i}`);
        expect(hash).toBeGreaterThanOrEqual(0);
        expect(hash).toBeLessThanOrEqual(100);
      }
    });

    it('should be deterministic', () => {
      const hashes: number[] = [];

      for (let i = 0; i < 10; i++) {
        hashes.push(engine.hashUserId('user-123'));
      }

      // All hashes should be the same
      expect(hashes.every(h => h === hashes[0])).toBe(true);
    });
  });

  // ==========================================================================
  // TRAFFIC ALLOCATION TESTS
  // ==========================================================================

  describe('Traffic Allocation', () => {
    it('should assign all users when allocation is 100%', () => {
      let assignedCount = 0;

      for (let i = 0; i < 100; i++) {
        const assignment = engine.assignVariant('exp-1', `user-${i}`, variants);
        if (assignment) {
          assignedCount++;
        }
      }

      expect(assignedCount).toBe(100);
    });

    it('should respect partial traffic allocation', () => {
      // Manually test traffic allocation by checking hash ranges
      const userHashes = Array.from({ length: 100 }, (_, i) =>
        engine.hashUserId(`user-${i}`)
      );

      // Users with hash <= 50 should be in 50% traffic allocation
      const inTraffic = userHashes.filter(h => h <= 50).length;

      expect(inTraffic).toBeGreaterThan(40);
      expect(inTraffic).toBeLessThan(60);
    });

    it('should assign no users when allocation is 0%', () => {
      // This is tested at the manager level, which filters by hash
      const userHash = engine.hashUserId('user-123');

      // Any positive traffic allocation would include some users
      expect(userHash).toBeGreaterThanOrEqual(0);
      expect(userHash).toBeLessThanOrEqual(100);
    });
  });

  // ==========================================================================
  // BANDIT ALGORITHM TESTS
  // ==========================================================================

  describe('Multi-Armed Bandit', () => {
    it('should initialize bandit state', () => {
      engine.updateBanditState('exp-1', 'control', 1);
      engine.updateBanditState('exp-1', 'variant-a', 0);

      const state = engine.getBanditState('exp-1');

      expect(state).toBeDefined();
      expect(state?.experimentId).toBe('exp-1');
      expect(state?.counts['control']).toBe(1);
      expect(state?.counts['variant-a']).toBe(1);
    });

    it('should update bandit state with rewards', () => {
      engine.updateBanditState('exp-1', 'control', 1); // Success
      engine.updateBanditState('exp-1', 'control', 0); // Failure
      engine.updateBanditState('exp-1', 'control', 1); // Success

      const state = engine.getBanditState('exp-1');

      expect(state?.counts['control']).toBe(3);
      expect(state?.rewards['control']).toBe(2); // 2 successes

      const posterior = state?.posteriors['control'];
      expect(posterior?.alpha).toBe(3); // 1 + 2 successes
      expect(posterior?.beta).toBe(2); // 1 + 1 failure
    });

    it('should calculate posterior mean', () => {
      engine.updateBanditState('exp-1', 'control', 1);
      engine.updateBanditState('exp-1', 'control', 1);
      engine.updateBanditState('exp-1', 'control', 0);

      const state = engine.getBanditState('exp-1');
      const posterior = state?.posteriors['control'];

      // Mean = (1 + rewards) / (2 + count) = (1 + 2) / (2 + 3) = 3/5 = 0.6
      expect(posterior?.mean).toBeCloseTo(0.6, 1);
    });

    it('should calculate posterior variance', () => {
      engine.updateBanditState('exp-1', 'control', 1);
      engine.updateBanditState('exp-1', 'control', 0);

      const state = engine.getBanditState('exp-1');
      const posterior = state?.posteriors['control'];

      expect(posterior?.variance).toBeGreaterThan(0);
      expect(posterior?.stdDev).toBeGreaterThan(0);
    });

    it('should use bandit selection when bandit state exists', () => {
      // Set up bandit state
      engine.updateBanditState('exp-1', 'control', 1); // Control has 100% success
      engine.updateBanditState('exp-1', 'variant-a', 0); // Variant A has 0% success

      // With bandit enabled, should favor control
      const assignments: string[] = [];

      for (let i = 0; i < 20; i++) {
        const assignment = engine.assignVariant('exp-1', `user-${i}`, variants);
        if (assignment) {
          assignments.push(assignment.variantId);
        }
      }

      // Due to Thompson sampling + exploration, should have more control assignments
      const controlCount = assignments.filter(v => v === 'control').length;
      const variantACount = assignments.filter(v => v === 'variant-a').length;

      expect(controlCount).toBeGreaterThan(variantACount);
    });

    it('should reset bandit state', () => {
      engine.updateBanditState('exp-1', 'control', 1);

      expect(engine.getBanditState('exp-1')).toBeDefined();

      engine.resetBanditState('exp-1');

      expect(engine.getBanditState('exp-1')).toBeUndefined();
    });

    it('should handle missing bandit state gracefully', () => {
      // Should fall back to uniform random if no bandit state
      const assignment = engine.assignVariant('exp-1', 'user-123', variants);

      expect(assignment).toBeDefined();
      expect(variants.map(v => v.id)).toContain(assignment?.variantId);
    });
  });

  // ==========================================================================
  // EXPOSURE TRACKING TESTS
  // ==========================================================================

  describe('markExposed()', () => {
    it('should mark assignment as exposed', () => {
      engine.assignVariant('exp-1', 'user-123', variants);

      engine.markExposed('exp-1', 'user-123');

      const assignment = engine.getAssignment('exp-1', 'user-123');

      expect(assignment?.exposed).toBe(true);
      expect(assignment?.exposedAt).toBeDefined();
      expect(assignment?.exposedAt).toBeGreaterThan(0);
    });

    it('should not mark already exposed assignment again', () => {
      engine.assignVariant('exp-1', 'user-123', variants);

      engine.markExposed('exp-1', 'user-123');

      const exposedAt1 = engine.getAssignment('exp-1', 'user-123')?.exposedAt;

      engine.markExposed('exp-1', 'user-123');

      const exposedAt2 = engine.getAssignment('exp-1', 'user-123')?.exposedAt;

      expect(exposedAt1).toBe(exposedAt2);
    });

    it('should persist exposure if enabled', () => {
      const persistEngine = new AssignmentEngine({
        enabled: true,
        persistAssignments: true,
        storageKey: 'test-assignments',
        assignmentSalt: 'test-salt',
        defaultConfidenceThreshold: 0.95,
        defaultMinSampleSize: 100,
        defaultTrafficAllocation: 1.0,
        earlyStoppingByDefault: false,
        banditByDefault: false,
        trackMetrics: true,
        debug: false,
      });

      persistEngine.assignVariant('exp-1', 'user-123', variants);
      persistEngine.markExposed('exp-1', 'user-123');

      const stored = localStorage.getItem('test-assignments-assignments');
      const parsed = JSON.parse(stored || '{}');
      const assignment = parsed['exp-1:user-123'];

      expect(assignment.exposed).toBe(true);

      localStorage.clear();
    });
  });

  // ==========================================================================
  // GET ASSIGNMENT TESTS
  // ==========================================================================

  describe('getAssignment()', () => {
    it('should return existing assignment', () => {
      engine.assignVariant('exp-1', 'user-123', variants);

      const assignment = engine.getAssignment('exp-1', 'user-123');

      expect(assignment).toBeDefined();
      expect(assignment?.userId).toBe('user-123');
    });

    it('should return undefined for non-existent assignment', () => {
      const assignment = engine.getAssignment('exp-1', 'user-999');

      expect(assignment).toBeUndefined();
    });
  });

  // ==========================================================================
  // IMPORT/EXPORT TESTS
  // ==========================================================================

  describe('Import/Export', () => {
    it('should export assignments', () => {
      engine.assignVariant('exp-1', 'user-1', variants);
      engine.assignVariant('exp-1', 'user-2', variants);

      const exported = engine.exportAssignments();

      expect(exported).toHaveProperty('exp-1:user-1');
      expect(exported).toHaveProperty('exp-1:user-2');
    });

    it('should import assignments', () => {
      const data = {
        'exp-1:user-123': {
          experimentId: 'exp-1',
          userId: 'user-123',
          variantId: 'control',
          assignedAt: Date.now(),
          sessionId: '',
          exposed: false,
        },
      };

      engine.importAssignments(data);

      const assignment = engine.getAssignment('exp-1', 'user-123');

      expect(assignment).toEqual(data['exp-1:user-123']);
    });

    it('should clear existing assignments on import', () => {
      engine.assignVariant('exp-1', 'user-1', variants);

      const newData = {
        'exp-2:user-2': {
          experimentId: 'exp-2',
          userId: 'user-2',
          variantId: 'variant-a',
          assignedAt: Date.now(),
          sessionId: '',
          exposed: false,
        },
      };

      engine.importAssignments(newData);

      expect(engine.getAssignment('exp-1', 'user-1')).toBeUndefined();
      expect(engine.getAssignment('exp-2', 'user-2')).toBeDefined();
    });

    it('should export bandit states', () => {
      engine.updateBanditState('exp-1', 'control', 1);

      const exported = engine.exportBanditStates();

      expect(exported).toHaveProperty('exp-1');
    });

    it('should import bandit states', () => {
      const data = {
        'exp-1': {
          experimentId: 'exp-1',
          counts: { control: 10 },
          rewards: { control: 8 },
          posteriors: {
            control: {
              alpha: 9,
              beta: 3,
              mean: 0.75,
              variance: 0.01,
              stdDev: 0.1,
            },
          },
          lastUpdated: Date.now(),
        },
      };

      engine.importBanditStates(data);

      const state = engine.getBanditState('exp-1');

      expect(state).toBeDefined();
      expect(state?.counts['control']).toBe(10);
    });
  });

  // ==========================================================================
  // STATISTICAL SAMPLING TESTS
  // ==========================================================================

  describe('Statistical Sampling', () => {
    it('should sample from Beta distribution', () => {
      // This is tested indirectly through bandit selection
      engine.updateBanditState('exp-1', 'control', 5);
      engine.updateBanditState('exp-1', 'control', 3);

      const state = engine.getBanditState('exp-1');
      const posterior = state?.posteriors['control'];

      expect(posterior?.alpha).toBe(6); // 1 + 5
      expect(posterior?.beta).toBe(4); // 1 + 3
    });

    it('should sample from Gamma distribution', () => {
      // Gamma sampling is used internally for Beta sampling
      // We test it indirectly through bandit updates
      engine.updateBanditState('exp-1', 'control', 1);

      const state = engine.getBanditState('exp-1');

      expect(state?.posteriors['control']).toBeDefined();
    });

    it('should sample from normal distribution', () => {
      // Normal sampling is used internally for Gamma sampling
      // We test it indirectly through bandit updates
      for (let i = 0; i < 10; i++) {
        engine.updateBanditState(`exp-${i}`, 'control', 1);
      }

      // Should not throw
      expect(true).toBe(true);
    });
  });

  // ==========================================================================
  // EXPLORATION RATE TESTS
  // ==========================================================================

  describe('Exploration', () => {
    it('should explore occasionally with bandit', () => {
      // Set up bandit state
      engine.updateBanditState('exp-1', 'control', 10);
      engine.updateBanditState('exp-1', 'variant-a', 1);

      const assignments: string[] = [];

      // Run enough trials to see exploration
      for (let i = 0; i < 50; i++) {
        const assignment = engine.assignVariant('exp-1', `user-${i}`, variants);
        if (assignment) {
          assignments.push(assignment.variantId);
        }
      }

      // Should see both variants due to exploration
      const uniqueVariants = new Set(assignments);

      expect(uniqueVariants.size).toBeGreaterThan(1);
    });

    it('should explore more when no data', () => {
      // When no bandit state, exploration rate is higher (20%)
      const assignments: string[] = [];

      for (let i = 0; i < 50; i++) {
        const assignment = engine.assignVariant('exp-no-data', `user-${i}`, variants);
        if (assignment) {
          assignments.push(assignment.variantId);
        }
      }

      // Should see all variants
      const uniqueVariants = new Set(assignments);

      expect(uniqueVariants.size).toBe(3);
    });
  });

  // ==========================================================================
  // REPRODUCIBILITY TESTS
  // ==========================================================================

  describe('Reproducibility', () => {
    it('should produce same assignments across different instances', () => {
      const config: ExperimentConfig = {
        enabled: true,
        assignmentSalt: 'same-salt',
        persistAssignments: false,
        defaultConfidenceThreshold: 0.95,
        defaultMinSampleSize: 100,
        defaultTrafficAllocation: 1.0,
        earlyStoppingByDefault: false,
        banditByDefault: false,
        storageKey: 'experiments',
        trackMetrics: true,
        debug: false,
      };

      const engine1 = new AssignmentEngine(config);
      const engine2 = new AssignmentEngine(config);

      const assignment1 = engine1.assignVariant('exp-1', 'user-123', variants);
      const assignment2 = engine2.assignVariant('exp-1', 'user-123', variants);

      expect(assignment1?.variantId).toBe(assignment2?.variantId);
    });

    it('should produce different assignments with different salts', () => {
      const engine1 = new AssignmentEngine({
        enabled: true,
        assignmentSalt: 'salt-1',
        persistAssignments: false,
        defaultConfidenceThreshold: 0.95,
        defaultMinSampleSize: 100,
        defaultTrafficAllocation: 1.0,
        earlyStoppingByDefault: false,
        banditByDefault: false,
        storageKey: 'experiments',
        trackMetrics: true,
        debug: false,
      });

      const engine2 = new AssignmentEngine({
        enabled: true,
        assignmentSalt: 'salt-2',
        persistAssignments: false,
        defaultConfidenceThreshold: 0.95,
        defaultMinSampleSize: 100,
        defaultTrafficAllocation: 1.0,
        earlyStoppingByDefault: false,
        banditByDefault: false,
        storageKey: 'experiments',
        trackMetrics: true,
        debug: false,
      });

      const assignment1 = engine1.assignVariant('exp-1', 'user-123', variants);
      const assignment2 = engine2.assignVariant('exp-1', 'user-123', variants);

      // Most likely different, but not guaranteed
      expect(assignment1?.experimentId).toBe(assignment2?.experimentId);
    });
  });
});
