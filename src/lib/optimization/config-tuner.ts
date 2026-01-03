/**
 * Configuration Tuner
 *
 * Adaptive configuration system using various optimization algorithms
 * to find optimal values for tunable parameters.
 */

import type { OptimizationTarget } from './types';

// ============================================================================
// TUNABLE PARAMETER
// ============================================================================

export interface TunableParameter {
  /** Parameter name */
  name: string;

  /** Original value when created */
  original: number;

  /** Current value */
  current: number;

  /** Minimum allowed value */
  min: number;

  /** Maximum allowed value */
  max: number;

  /** Whether to minimize or maximize this parameter */
  optimize: 'minimize' | 'maximize';

  /** Optimization targets this affects */
  targets: OptimizationTarget[];
}

// ============================================================================
// TUNING OBJECTIVE
// ============================================================================

export interface TuningObjective {
  /** Target metric to optimize */
  metric: OptimizationTarget;

  /** Whether to minimize or maximize */
  direction: 'minimize' | 'maximize';

  /** Weight (0-1) */
  weight: number;
}

// ============================================================================
// TUNING CONSTRAINT
// ============================================================================

export interface TuningConstraint {
  /** Type of constraint */
  type: 'max' | 'min' | 'equals';

  /** Metric to constrain */
  metric: OptimizationTarget;

  /** Threshold value */
  threshold: number;
}

// ============================================================================
// TUNING RESULT
// ============================================================================

export interface TuningResult {
  /** Parameter name */
  parameter: string;

  /** Original value */
  original: number;

  /** Optimized value */
  optimized: number;

  /** Improvement percentage */
  improvement: number;

  /** Objective score */
  score: number;

  /** Iterations performed */
  iterations: number;

  /** Converged */
  converged: boolean;
}

// ============================================================================
// OPTIMIZATION ALGORITHMS
// ============================================================================

/**
 * Hill climbing algorithm
 */
class HillClimbing {
  /**
   * Optimize parameter using hill climbing
   */
  static optimize(
    parameter: TunableParameter,
    objective: (value: number) => number,
    options?: {
      maxIterations?: number;
      stepSize?: number;
      tolerance?: number;
    }
  ): TuningResult {
    const maxIterations = options?.maxIterations ?? 100;
    const stepSize = options?.stepSize ?? (parameter.max - parameter.min) * 0.1;
    const tolerance = options?.tolerance ?? 0.001;

    let current = parameter.current;
    let currentScore = objective(current);
    let iterations = 0;
    let converged = false;

    for (let i = 0; i < maxIterations; i++) {
      iterations++;

      // Try step up
      const up = Math.min(current + stepSize, parameter.max);
      const upScore = objective(up);

      // Try step down
      const down = Math.max(current - stepSize, parameter.min);
      const downScore = objective(down);

      // Choose best direction
      if (upScore > currentScore && upScore >= downScore) {
        if (Math.abs(up - current) < tolerance) {
          converged = true;
          break;
        }
        current = up;
        currentScore = upScore;
      } else if (downScore > currentScore) {
        if (Math.abs(down - current) < tolerance) {
          converged = true;
          break;
        }
        current = down;
        currentScore = downScore;
      } else {
        // Local maximum reached
        converged = true;
        break;
      }
    }

    const improvement = parameter.optimize === 'maximize'
      ? ((current - parameter.original) / parameter.original) * 100
      : ((parameter.original - current) / parameter.original) * 100;

    return {
      parameter: parameter.name,
      original: parameter.current,
      optimized: current,
      improvement,
      score: currentScore,
      iterations,
      converged,
    };
  }
}

/**
 * Bayesian optimization (simplified)
 */
class BayesianOptimization {
  /**
   * Optimize using Bayesian approach
   */
  static optimize(
    parameter: TunableParameter,
    objective: (value: number) => number,
    options?: {
      samples?: number;
      explorationFactor?: number;
    }
  ): TuningResult {
    const samples = options?.samples ?? 20;
    const explorationFactor = options?.explorationFactor ?? 0.5;

    // Sample points uniformly
    const sampledPoints: Array<{ value: number; score: number }> = [];
    const range = parameter.max - parameter.min;

    for (let i = 0; i < samples; i++) {
      const value = parameter.min + (Math.random() * range);
      const score = objective(value);
      sampledPoints.push({ value, score });
    }

    // Find best point
    let best = sampledPoints[0];
    for (const point of sampledPoints) {
      if (point.score > best.score) {
        best = point;
      }
    }

    // Refine around best point
    const refineSamples = 5;
    const refineRange = range * 0.1;

    for (let i = 0; i < refineSamples; i++) {
      const value = Math.max(
        parameter.min,
        Math.min(
          parameter.max,
          best.value + (Math.random() - 0.5) * refineRange
        )
      );
      const score = objective(value);
      if (score > best.score) {
        best = { value, score };
      }
    }

    const improvement = parameter.optimize === 'maximize'
      ? ((best.value - parameter.current) / parameter.current) * 100
      : ((parameter.current - best.value) / parameter.current) * 100;

    return {
      parameter: parameter.name,
      original: parameter.current,
      optimized: best.value,
      improvement,
      score: best.score,
      iterations: samples + refineSamples,
      converged: true,
    };
  }
}

/**
 * Multi-armed bandit
 */
class MultiArmedBandit {
  /**
   * Optimize using epsilon-greedy bandit
   */
  static optimize(
    parameter: TunableParameter,
    objective: (value: number) => number,
    options?: {
      rounds?: number;
      epsilon?: number;
    }
  ): TuningResult {
    const rounds = options?.rounds ?? 50;
    const epsilon = options?.epsilon ?? 0.1;

    // Create discrete arms
    const armCount = 10;
    const arms: number[] = [];
    for (let i = 0; i < armCount; i++) {
      arms.push(parameter.min + (i / (armCount - 1)) * (parameter.max - parameter.min));
    }

    // Track arm performance
    const armScores: number[] = new Array(armCount).fill(0);
    const armPulls: number[] = new Array(armCount).fill(0);

    // Pull arms
    for (let round = 0; round < rounds; round++) {
      let armIndex: number;

      // Epsilon-greedy: explore or exploit
      if (Math.random() < epsilon) {
        // Explore: random arm
        armIndex = Math.floor(Math.random() * armCount);
      } else {
        // Exploit: best arm so far
        const avgScores = armScores.map((s, i) =>
          armPulls[i] > 0 ? s / armPulls[i] : 0
        );
        armIndex = avgScores.indexOf(Math.max(...avgScores));
      }

      // Pull arm and get reward
      const reward = objective(arms[armIndex]);
      armScores[armIndex] += reward;
      armPulls[armIndex]++;
    }

    // Return best arm
    const avgScores = armScores.map((s, i) =>
      armPulls[i] > 0 ? s / armPulls[i] : 0
    );
    const bestArm = avgScores.indexOf(Math.max(...avgScores));
    const bestValue = arms[bestArm];

    const improvement = parameter.optimize === 'maximize'
      ? ((bestValue - parameter.current) / parameter.current) * 100
      : ((parameter.current - bestValue) / parameter.current) * 100;

    return {
      parameter: parameter.name,
      original: parameter.current,
      optimized: bestValue,
      improvement,
      score: avgScores[bestArm],
      iterations: rounds,
      converged: true,
    };
  }
}

/**
 * Genetic algorithm
 */
class GeneticAlgorithm {
  private static readonly POPULATION_SIZE = 20;
  private static readonly GENERATIONS = 10;
  private static readonly MUTATION_RATE = 0.1;

  /**
   * Optimize using genetic algorithm
   */
  static optimize(
    parameter: TunableParameter,
    objective: (value: number) => number,
    options?: {
      populationSize?: number;
      generations?: number;
      mutationRate?: number;
    }
  ): TuningResult {
    const popSize = options?.populationSize ?? this.POPULATION_SIZE;
    const generations = options?.generations ?? this.GENERATIONS;
    const mutationRate = options?.mutationRate ?? this.MUTATION_RATE;

    // Initialize population
    let population: number[] = [];
    for (let i = 0; i < popSize; i++) {
      population.push(
        parameter.min + Math.random() * (parameter.max - parameter.min)
      );
    }

    // Evolve
    for (let gen = 0; gen < generations; gen++) {
      // Evaluate fitness
      const fitness = population.map(objective);

      // Select best individuals
      const sorted = population
        .map((value, i) => ({ value, fitness: fitness[i] }))
        .sort((a, b) => b.fitness - a.fitness);

      // Keep top 50%
      const survivors = sorted.slice(0, Math.floor(popSize / 2)).map((s) => s.value);

      // Create next generation
      population = [...survivors];
      while (population.length < popSize) {
        // Crossover
        const parent1 = survivors[Math.floor(Math.random() * survivors.length)];
        const parent2 = survivors[Math.floor(Math.random() * survivors.length)];
        let child = (parent1 + parent2) / 2;

        // Mutate
        if (Math.random() < mutationRate) {
          const mutationRange = (parameter.max - parameter.min) * 0.1;
          child += (Math.random() - 0.5) * mutationRange;
          child = Math.max(parameter.min, Math.min(parameter.max, child));
        }

        population.push(child);
      }
    }

    // Return best from final population
    const finalFitness = population.map(objective);
    const bestIndex = finalFitness.indexOf(Math.max(...finalFitness));
    const bestValue = population[bestIndex];

    const improvement = parameter.optimize === 'maximize'
      ? ((bestValue - parameter.current) / parameter.current) * 100
      : ((parameter.current - bestValue) / parameter.current) * 100;

    return {
      parameter: parameter.name,
      original: parameter.current,
      optimized: bestValue,
      improvement,
      score: finalFitness[bestIndex],
      iterations: generations * popSize,
      converged: true,
    };
  }
}

// ============================================================================
// CONFIGURATION TUNER
// ============================================================================

export class ConfigTuner {
  private parameters: Map<string, TunableParameter> = new Map();
  private tuningHistory: TuningResult[] = [];

  /**
   * Register tunable parameter
   */
  registerParameter(parameter: TunableParameter): void {
    this.parameters.set(parameter.name, parameter);
  }

  /**
   * Auto-tune parameter
   */
  async autoTune(
    parameterName: string,
    options: {
      objective?: TuningObjective;
      constraints?: TuningConstraint[];
      exploration?: 'hill_climbing' | 'bayesian' | 'bandit' | 'genetic';
    } = {}
  ): Promise<TuningResult | null> {
    const parameter = this.parameters.get(parameterName);
    if (!parameter) {
      console.error(`Parameter not found: ${parameterName}`);
      return null;
    }

    // Create objective function from constraints
    const objectiveFn = (value: number) => {
      let score = 0;

      // Apply constraints
      if (options.constraints) {
        for (const constraint of options.constraints) {
          const metricValue = this.simulateMetric(constraint.metric, value);

          if (constraint.type === 'max') {
            // Penalize if over threshold
            score += Math.max(0, 1 - (metricValue / constraint.threshold));
          } else if (constraint.type === 'min') {
            // Reward if over threshold
            score += Math.min(1, metricValue / constraint.threshold);
          }
        }
      } else {
        // Default: just normalize value
        score = 1 - ((value - parameter.min) / (parameter.max - parameter.min));
      }

      return score;
    };

    // Select algorithm
    const algorithm = options.exploration ?? 'bayesian';

    let result: TuningResult;
    switch (algorithm) {
      case 'hill_climbing':
        result = HillClimbing.optimize(parameter, objectiveFn);
        break;
      case 'bayesian':
        result = BayesianOptimization.optimize(parameter, objectiveFn);
        break;
      case 'bandit':
        result = MultiArmedBandit.optimize(parameter, objectiveFn);
        break;
      case 'genetic':
        result = GeneticAlgorithm.optimize(parameter, objectiveFn);
        break;
      default:
        result = BayesianOptimization.optimize(parameter, objectiveFn);
    }

    // Store result
    this.tuningHistory.push(result);

    // Update parameter
    parameter.current = result.optimized;

    return result;
  }

  /**
   * Multi-objective optimization
   */
  async multiObjectiveTune(
    parameters: string[],
    objectives: TuningObjective[],
    options?: {
      algorithm?: 'hill_climbing' | 'bayesian' | 'genetic';
      maxIterations?: number;
    }
  ): Promise<Map<string, TuningResult>> {
    const results = new Map<string, TuningResult>();

    for (const paramName of parameters) {
      const param = this.parameters.get(paramName);
      if (!param) continue;

      // Create multi-objective function
      const objectiveFn = (value: number) => {
        let totalScore = 0;
        let totalWeight = 0;

        for (const obj of objectives) {
          const metricValue = this.simulateMetric(obj.metric, value);
          const normalizedScore = metricValue / 100; // Assume metrics are 0-100

          if (obj.direction === 'maximize') {
            totalScore += normalizedScore * obj.weight;
          } else {
            totalScore += (1 - normalizedScore) * obj.weight;
          }

          totalWeight += obj.weight;
        }

        return totalWeight > 0 ? totalScore / totalWeight : 0;
      };

      const algorithm = options?.algorithm ?? 'bayesian';
      let result: TuningResult;

      switch (algorithm) {
        case 'hill_climbing':
          result = HillClimbing.optimize(param, objectiveFn, {
            maxIterations: options?.maxIterations,
          });
          break;
        case 'genetic':
          result = GeneticAlgorithm.optimize(param, objectiveFn);
          break;
        default:
          result = BayesianOptimization.optimize(param, objectiveFn);
      }

      results.set(paramName, result);
      param.current = result.optimized;
      this.tuningHistory.push(result);
    }

    return results;
  }

  /**
   * Get tuning history
   */
  getHistory(): TuningResult[] {
    return [...this.tuningHistory];
  }

  /**
   * Get parameter
   */
  getParameter(name: string): TunableParameter | undefined {
    return this.parameters.get(name);
  }

  /**
   * Get all parameters
   */
  getAllParameters(): TunableParameter[] {
    return Array.from(this.parameters.values());
  }

  /**
   * Simulate metric value for given parameter value
   * (In real implementation, this would actually measure the metric)
   */
  private simulateMetric(metric: OptimizationTarget, parameterValue: number): number {
    // Simplified simulation - in reality would measure actual performance
    switch (metric) {
      case 'cache-size':
        // Higher cache size = better hit rate (diminishing returns)
        return Math.min(100, parameterValue / 100);

      case 'response-latency':
        // Lower timeout = lower latency (up to a point)
        return Math.max(0, 100 - (parameterValue / 500) * 100);

      case 'memory-usage':
        // Higher cache limit = higher memory usage
        return Math.min(100, parameterValue / 2);

      default:
        return 50;
    }
  }
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

/**
 * Global config tuner instance
 */
export const configTuner = new ConfigTuner();

// Initialize with default parameters
configTuner.registerParameter({
  name: 'cacheMaxSize',
  original: 1000,
  current: 1000,
  min: 100,
  max: 10000,
  optimize: 'maximize',
  targets: ['cache-size'],
});

configTuner.registerParameter({
  name: 'apiTimeout',
  original: 10000,
  current: 10000,
  min: 5000,
  max: 30000,
  optimize: 'minimize',
  targets: ['response-latency'],
});

configTuner.registerParameter({
  name: 'memoryCacheLimit',
  original: 50,
  current: 50,
  min: 10,
  max: 200,
  optimize: 'minimize',
  targets: ['memory-usage'],
});

configTuner.registerParameter({
  name: 'messageBatchSize',
  original: 50,
  current: 50,
  min: 10,
  max: 100,
  optimize: 'maximize',
  targets: ['response-latency'],
});
