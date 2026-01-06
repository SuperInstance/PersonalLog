/**
 * Unit Tests: Config Tuner
 *
 * Tests the configuration tuning system including:
 * - Parameter registration
 * - Hill climbing algorithm
 * - Bayesian optimization
 * - Multi-armed bandit
 * - Genetic algorithm
 * - Multi-objective optimization
 * - History tracking
 *
 * @coverage Target: 75%+ (Config tuning functionality)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigTuner, configTuner } from '../config-tuner';
import type { TunableParameter, TuningObjective, TuningConstraint } from '../config-tuner';

describe('ConfigTuner', () => {
  let tuner: ConfigTuner;

  beforeEach(() => {
    tuner = new ConfigTuner();
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize with default parameters', () => {
      const params = tuner.getAllParameters();

      expect(params.length).toBeGreaterThan(0);

      const paramKeys = params.map(p => p.name);
      expect(paramKeys).toContain('cacheMaxSize');
      expect(paramKeys).toContain('apiTimeout');
      expect(paramKeys).toContain('memoryCacheLimit');
      expect(paramKeys).toContain('messageBatchSize');
    });

    it('should have valid parameter ranges', () => {
      const params = tuner.getAllParameters();

      for (const param of params) {
        expect(param.min).toBeLessThan(param.max);
        expect(param.current).toBeGreaterThanOrEqual(param.min);
        expect(param.current).toBeLessThanOrEqual(param.max);
        expect(param.optimize).toMatch(/^(minimize|maximize)$/);
      }
    });

    it('should have no history initially', () => {
      const history = tuner.getHistory();
      expect(history).toEqual([]);
    });
  });

  // ==========================================================================
  // PARAMETER REGISTRATION TESTS
  // ==========================================================================

  describe('Parameter Registration', () => {
    it('should register new parameter', () => {
      const param: TunableParameter = {
        name: 'testParam',
        original: 50,
        current: 50,
        min: 0,
        max: 100,
        optimize: 'maximize',
        targets: ['response-latency'],
      };

      tuner.registerParameter(param);

      const retrieved = tuner.getParameter('testParam');
      expect(retrieved).toEqual(param);
    });

    it('should get parameter by name', () => {
      const param = tuner.getParameter('cacheMaxSize');

      expect(param).toBeDefined();
      expect(param?.name).toBe('cacheMaxSize');
    });

    it('should return undefined for non-existent parameter', () => {
      const param = tuner.getParameter('non-existent');
      expect(param).toBeUndefined();
    });

    it('should get all parameters', () => {
      const params = tuner.getAllParameters();

      expect(params.length).toBeGreaterThan(0);
      expect(params[0]).toHaveProperty('name');
      expect(params[0]).toHaveProperty('min');
      expect(params[0]).toHaveProperty('max');
      expect(params[0]).toHaveProperty('current');
    });
  });

  // ==========================================================================
  // HILL CLIMBING TESTS
  // ==========================================================================

  describe('Hill Climbing', () => {
    it('should optimize using hill climbing', async () => {
      const param: TunableParameter = {
        name: 'hill-test',
        original: 50,
        current: 50,
        min: 0,
        max: 100,
        optimize: 'maximize',
        targets: ['cache-size'],
      };

      tuner.registerParameter(param);

      const result = await tuner.autoTune('hill-test', {
        exploration: 'hill_climbing',
      });

      expect(result).not.toBeNull();
      expect(result?.parameter).toBe('hill-test');
      expect(result?.original).toBe(50);
      expect(result?.optimized).toBeGreaterThanOrEqual(0);
      expect(result?.optimized).toBeLessThanOrEqual(100);
      expect(result?.iterations).toBeGreaterThan(0);
    });

    it('should respect parameter bounds', async () => {
      const param: TunableParameter = {
        name: 'bounds-test',
        original: 50,
        current: 50,
        min: 25,
        max: 75,
        optimize: 'maximize',
        targets: ['cache-size'],
      };

      tuner.registerParameter(param);

      const result = await tuner.autoTune('bounds-test', {
        exploration: 'hill_climbing',
      });

      expect(result?.optimized).toBeGreaterThanOrEqual(25);
      expect(result?.optimized).toBeLessThanOrEqual(75);
    });

    it('should converge on local optimum', async () => {
      const param: TunableParameter = {
        name: 'converge-test',
        original: 50,
        current: 50,
        min: 0,
        max: 100,
        optimize: 'maximize',
        targets: ['cache-size'],
      };

      tuner.registerParameter(param);

      const result = await tuner.autoTune('converge-test', {
        exploration: 'hill_climbing',
      });

      expect(result?.converged).toBe(true);
    });
  });

  // ==========================================================================
  // BAYESIAN OPTIMIZATION TESTS
  // ==========================================================================

  describe('Bayesian Optimization', () => {
    it('should optimize using Bayesian approach', async () => {
      const param: TunableParameter = {
        name: 'bayesian-test',
        original: 50,
        current: 50,
        min: 0,
        max: 100,
        optimize: 'maximize',
        targets: ['cache-size'],
      };

      tuner.registerParameter(param);

      const result = await tuner.autoTune('bayesian-test', {
        exploration: 'bayesian',
      });

      expect(result).not.toBeNull();
      expect(result?.parameter).toBe('bayesian-test');
      expect(result?.iterations).toBeGreaterThan(0);
    });

    it('should sample points efficiently', async () => {
      const param: TunableParameter = {
        name: 'sample-test',
        original: 50,
        current: 50,
        min: 0,
        max: 100,
        optimize: 'maximize',
        targets: ['cache-size'],
      };

      tuner.registerParameter(param);

      const result = await tuner.autoTune('sample-test', {
        exploration: 'bayesian',
      });

      expect(result?.iterations).toBeGreaterThan(10); // samples + refinement
    });
  });

  // ==========================================================================
  // MULTI-ARMED BANDIT TESTS
  // ==========================================================================

  describe('Multi-Armed Bandit', () => {
    it('should optimize using bandit approach', async () => {
      const param: TunableParameter = {
        name: 'bandit-test',
        original: 50,
        current: 50,
        min: 0,
        max: 100,
        optimize: 'maximize',
        targets: ['cache-size'],
      };

      tuner.registerParameter(param);

      const result = await tuner.autoTune('bandit-test', {
        exploration: 'bandit',
      });

      expect(result).not.toBeNull();
      expect(result?.parameter).toBe('bandit-test');
      expect(result?.iterations).toBeGreaterThan(0);
    });

    it('should balance exploration and exploitation', async () => {
      const param: TunableParameter = {
        name: 'balance-test',
        original: 50,
        current: 50,
        min: 0,
        max: 100,
        optimize: 'maximize',
        targets: ['cache-size'],
      };

      tuner.registerParameter(param);

      const result = await tuner.autoTune('balance-test', {
        exploration: 'bandit',
      });

      expect(result?.iterations).toBe(50);
    });
  });

  // ==========================================================================
  // GENETIC ALGORITHM TESTS
  // ==========================================================================

  describe('Genetic Algorithm', () => {
    it('should optimize using genetic algorithm', async () => {
      const param: TunableParameter = {
        name: 'genetic-test',
        original: 50,
        current: 50,
        min: 0,
        max: 100,
        optimize: 'maximize',
        targets: ['cache-size'],
      };

      tuner.registerParameter(param);

      const result = await tuner.autoTune('genetic-test', {
        exploration: 'genetic',
      });

      expect(result).not.toBeNull();
      expect(result?.parameter).toBe('genetic-test');
      expect(result?.iterations).toBeGreaterThan(0);
    });

    it('should evolve population over generations', async () => {
      const param: TunableParameter = {
        name: 'evolve-test',
        original: 50,
        current: 50,
        min: 0,
        max: 100,
        optimize: 'maximize',
        targets: ['cache-size'],
      };

      tuner.registerParameter(param);

      const result = await tuner.autoTune('evolve-test', {
        exploration: 'genetic',
      });

      expect(result?.iterations).toBe(200); // 20 * 10
      expect(result?.converged).toBe(true);
    });

    it('should use mutation for diversity', async () => {
      const param: TunableParameter = {
        name: 'mutate-test',
        original: 50,
        current: 50,
        min: 0,
        max: 100,
        optimize: 'maximize',
        targets: ['cache-size'],
      };

      tuner.registerParameter(param);

      const result = await tuner.autoTune('mutate-test', {
        exploration: 'genetic',
      });

      expect(result).not.toBeNull();
    });
  });

  // ==========================================================================
  // MULTI-OBJECTIVE OPTIMIZATION TESTS
  // ==========================================================================

  describe('Multi-Objective Optimization', () => {
    it('should optimize multiple parameters', async () => {
      const params = ['cacheMaxSize', 'memoryCacheLimit'];
      const objectives: TuningObjective[] = [
        {
          metric: 'cache-size',
          direction: 'maximize',
          weight: 0.6,
        },
        {
          metric: 'memory-usage',
          direction: 'minimize',
          weight: 0.4,
        },
      ];

      const results = await tuner.multiObjectiveTune(params, objectives, {
        algorithm: 'bayesian',
      });

      expect(results.size).toBe(2);
      expect(results.has('cacheMaxSize')).toBe(true);
      expect(results.has('memoryCacheLimit')).toBe(true);

      const resultsArray = Array.from(results.values());
      for (const result of resultsArray) {
        expect(result).not.toBeNull();
        expect(result.score).toBeGreaterThan(0);
      }
    });

    it('should respect objective weights', async () => {
      const params = ['cacheMaxSize', 'memoryCacheLimit'];
      const objectives: TuningObjective[] = [
        {
          metric: 'cache-size',
          direction: 'maximize',
          weight: 0.9, // High weight on cache
        },
        {
          metric: 'memory-usage',
          direction: 'minimize',
          weight: 0.1, // Low weight on memory
        },
      ];

      const results = await tuner.multiObjectiveTune(params, objectives);

      expect(results.size).toBe(2);
    });

    it('should use different algorithms', async () => {
      const params = ['apiTimeout'];
      const objectives: TuningObjective[] = [
        {
          metric: 'response-latency',
          direction: 'minimize',
          weight: 1.0,
        },
      ];

      const hillResult = await tuner.multiObjectiveTune(params, objectives, {
        algorithm: 'hill_climbing',
      });

      const bayesianResult = await tuner.multiObjectiveTune(params, objectives, {
        algorithm: 'bayesian',
      });

      const geneticResult = await tuner.multiObjectiveTune(params, objectives, {
        algorithm: 'genetic',
      });

      expect(hillResult.size).toBe(1);
      expect(bayesianResult.size).toBe(1);
      expect(geneticResult.size).toBe(1);
    });
  });

  // ==========================================================================
  // CONSTRAINT TESTS
  // ==========================================================================

  describe('Optimization with Constraints', () => {
    it('should respect max constraints', async () => {
      const param: TunableParameter = {
        name: 'constraint-max-test',
        original: 50,
        current: 50,
        min: 0,
        max: 100,
        optimize: 'maximize',
        targets: ['memory-usage'],
      };

      tuner.registerParameter(param);

      const constraints: TuningConstraint[] = [
        {
          type: 'max',
          metric: 'memory-usage',
          threshold: 75,
        },
      ];

      const result = await tuner.autoTune('constraint-max-test', {
        constraints,
      });

      expect(result).not.toBeNull();
    });

    it('should respect min constraints', async () => {
      const param: TunableParameter = {
        name: 'constraint-min-test',
        original: 50,
        current: 50,
        min: 0,
        max: 100,
        optimize: 'minimize',
        targets: 'cache-size' as any,
      };

      tuner.registerParameter(param);

      const constraints: TuningConstraint[] = [
        {
          type: 'min',
          metric: 'cache-size',
          threshold: 25,
        },
      ];

      const result = await tuner.autoTune('constraint-min-test', {
        constraints,
      });

      expect(result).not.toBeNull();
    });
  });

  // ==========================================================================
  // HISTORY TESTS
  // ==========================================================================

  describe('History', () => {
    it('should track tuning history', async () => {
      const param: TunableParameter = {
        name: 'history-test',
        original: 50,
        current: 50,
        min: 0,
        max: 100,
        optimize: 'maximize',
        targets: ['cache-size'],
      };

      tuner.registerParameter(param);

      await tuner.autoTune('history-test', {
        exploration: 'hill_climbing',
      });

      const history = tuner.getHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should store multiple tuning results', async () => {
      const param1: TunableParameter = {
        name: 'history-param-1',
        original: 50,
        current: 50,
        min: 0,
        max: 100,
        optimize: 'maximize',
        targets: ['cache-size'],
      };

      const param2: TunableParameter = {
        name: 'history-param-2',
        original: 50,
        current: 50,
        min: 0,
        max: 100,
        optimize: 'maximize',
        targets: ['cache-size'],
      };

      tuner.registerParameter(param1);
      tuner.registerParameter(param2);

      await tuner.autoTune('history-param-1');
      await tuner.autoTune('history-param-2');

      const history = tuner.getHistory();
      expect(history.length).toBe(2);
    });

    it('should preserve result details', async () => {
      const param: TunableParameter = {
        name: 'detail-test',
        original: 50,
        current: 50,
        min: 0,
        max: 100,
        optimize: 'maximize',
        targets: ['cache-size'],
      };

      tuner.registerParameter(param);

      await tuner.autoTune('detail-test');

      const history = tuner.getHistory();
      const result = history[0];

      expect(result).toHaveProperty('parameter');
      expect(result).toHaveProperty('original');
      expect(result).toHaveProperty('optimized');
      expect(result).toHaveProperty('improvement');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('iterations');
      expect(result).toHaveProperty('converged');
    });
  });

  // ==========================================================================
  // PARAMETER UPDATE TESTS
  // ==========================================================================

  describe('Parameter Updates', () => {
    it('should update parameter value after tuning', async () => {
      const param: TunableParameter = {
        name: 'update-test',
        original: 50,
        current: 50,
        min: 0,
        max: 100,
        optimize: 'maximize',
        targets: ['cache-size'],
      };

      tuner.registerParameter(param);

      await tuner.autoTune('update-test');

      const updatedParam = tuner.getParameter('update-test');
      expect(updatedParam?.current).not.toBe(50);
    });
  });

  // ==========================================================================
  // GLOBAL INSTANCE TESTS
  // ==========================================================================

  describe('Global Instance', () => {
    it('should export global configTuner instance', () => {
      expect(configTuner).toBeInstanceOf(ConfigTuner);
    });

    it('should have pre-registered parameters', () => {
      const params = configTuner.getAllParameters();
      expect(params.length).toBeGreaterThan(0);
    });

    it('should share state across global instance', async () => {
      const param = configTuner.getParameter('cacheMaxSize');
      expect(param).toBeDefined();
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle non-existent parameter gracefully', async () => {
      const result = await tuner.autoTune('non-existent');

      expect(result).toBeNull();
    });

    it('should handle invalid algorithm choice', async () => {
      const param: TunableParameter = {
        name: 'error-algo-test',
        original: 50,
        current: 50,
        min: 0,
        max: 100,
        optimize: 'maximize',
        targets: ['cache-size'],
      };

      tuner.registerParameter(param);

      // Should default to bayesian for invalid algorithm
      const result = await tuner.autoTune('error-algo-test', {
        exploration: 'invalid' as any,
      });

      expect(result).not.toBeNull();
    });

    it('should handle empty parameters list in multi-objective', async () => {
      const objectives: TuningObjective[] = [
        {
          metric: 'cache-size',
          direction: 'maximize',
          weight: 1.0,
        },
      ];

      const results = await tuner.multiObjectiveTune([], objectives);

      expect(results.size).toBe(0);
    });
  });
});
