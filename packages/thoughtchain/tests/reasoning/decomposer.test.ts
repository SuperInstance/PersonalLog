/**
 * Query Decomposition Tests
 *
 * Tests for breaking complex queries into reasoning steps,
 * identifying dependencies, and planning execution order.
 *
 * SEO Keywords:
 * - query decomposition
 * - reasoning steps
 * - chain-of-thought
 * - query planning
 * - step-by-step reasoning
 */

import { describe, it, expect } from 'vitest';
import { QueryDecomposer } from '../../src/decomposition.js';
import type { ThoughtChainConfig } from '../../src/types.js';

describe('Query Decomposer', () => {
  describe('Basic Decomposition', () => {
    it('should decompose simple queries', () => {
      const query = 'What is the capital of France?';
      const decomposition = QueryDecomposer.decompose(query);

      expect(decomposition.originalQuery).toBe(query);
      expect(decomposition.steps).toBeDefined();
      expect(decomposition.steps.length).toBeGreaterThan(0);
      expect(decomposition.executionOrder).toBeDefined();
      expect(decomposition.totalSteps).toBe(decomposition.steps.length);
    });

    it('should decompose complex queries into steps', () => {
      const query = 'Explain how photosynthesis works and why it is important for life on Earth';
      const decomposition = QueryDecomposer.decompose(query, { steps: 5 });

      expect(decomposition.steps.length).toBe(5);

      // Verify step structure
      decomposition.steps.forEach((step, index) => {
        expect(step.step).toBe(index + 1);
        expect(step.question).toBeDefined();
        expect(step.dependencies).toBeDefined();
        expect(step.complexity).toMatch(/^(low|medium|high)$/);
      });
    });

    it('should handle custom step counts', () => {
      const query = 'Analyze the economic impact of climate change';
      const steps3 = QueryDecomposer.decompose(query, { steps: 3 });
      const steps7 = QueryDecomposer.decompose(query, { steps: 7 });

      expect(steps3.steps.length).toBe(3);
      expect(steps7.steps.length).toBe(7);
    });

    it('should analyze query complexity correctly', () => {
      const simpleQuery = 'What is 2 + 2?';
      const mediumQuery = 'Explain the causes of World War I';
      const complexQuery = 'Analyze the relationship between quantum mechanics and general relativity';

      const simpleDecomp = QueryDecomposer.decompose(simpleQuery);
      const mediumDecomp = QueryDecomposer.decompose(mediumQuery);
      const complexDecomp = QueryDecomposer.decompose(complexQuery);

      // Simple queries should have low complexity steps
      const hasLowComplexity = simpleDecomp.steps.some(s => s.complexity === 'low');
      expect(hasLowComplexity).toBe(true);

      // Complex queries should have high complexity steps
      const hasHighComplexity = complexDecomp.steps.some(s => s.complexity === 'high');
      expect(hasHighComplexity).toBe(true);
    });
  });

  describe('Dependency Management', () => {
    it('should identify dependencies between steps', () => {
      const query = 'How does a computer work?';
      const decomposition = QueryDecomposer.decompose(query, { steps: 5 });

      // At least some steps should have dependencies
      const stepsWithDeps = decomposition.steps.filter(s => s.dependencies.length > 0);
      expect(stepsWithDeps.length).toBeGreaterThan(0);

      // Dependencies should be valid (refer to existing steps)
      decomposition.steps.forEach(step => {
        step.dependencies.forEach(dep => {
          expect(dep).toBeGreaterThan(0);
          expect(dep).toBeLessThanOrEqual(step.step);
        });
      });
    });

    it('should respect dependencies in execution order', () => {
      const query = 'Explain the process of protein synthesis';
      const decomposition = QueryDecomposer.decompose(query, { steps: 5 });

      // Execution order should be valid topological sort
      const executed = new Set<number>();

      decomposition.executionOrder.forEach(stepNum => {
        const step = decomposition.steps.find(s => s.step === stepNum);
        expect(step).toBeDefined();

        // All dependencies should be executed before this step
        step!.dependencies.forEach(dep => {
          expect(executed.has(dep)).toBe(true);
        });

        executed.add(stepNum);
      });
    });

    it('should handle circular dependencies gracefully', () => {
      const query = 'Complex query with multiple aspects';
      const decomposition = QueryDecomposer.decompose(query, { steps: 5 });

      // Should not produce circular dependencies
      const hasCircular = decomposition.steps.some(step =>
        step.dependencies.includes(step.step)
      );

      expect(hasCircular).toBe(false);
    });

    it('should allow parallel execution where possible', () => {
      const query = 'Compare and contrast different approaches to problem solving';
      const decomposition = QueryDecomposer.decompose(query, { steps: 8 });

      const optimization = QueryDecomposer.optimizeForParallel(decomposition);

      expect(optimization.parallelGroups).toBeDefined();
      expect(optimization.parallelGroups.length).toBeGreaterThan(0);

      // Some groups should have multiple steps (parallelizable)
      const hasParallelGroups = optimization.parallelGroups.some(g => g.length > 1);
      expect(hasParallelGroups).toBe(true);
    });
  });

  describe('Context Generation', () => {
    it('should generate context from completed steps', () => {
      const completedSteps = [
        { step: 1, thought: 'Identified key concepts', confidence: 0.95 },
        { step: 2, thought: 'Retrieved relevant information', confidence: 0.90 },
        { step: 3, thought: 'Analyzed relationships', confidence: 0.88 },
      ];

      const context = QueryDecomposer.generateContext(completedSteps);

      expect(context).toBeDefined();
      expect(context.length).toBeGreaterThan(0);
      expect(context).toContain('Step 1');
      expect(context).toContain('Step 2');
      expect(context).toContain('Step 3');
      expect(context).toContain('confidence');
    });

    it('should handle empty completed steps', () => {
      const context = QueryDecomposer.generateContext([]);
      expect(context).toBe('');
    });

    it('should maintain step order in context', () => {
      const completedSteps = [
        { step: 3, thought: 'Third step', confidence: 0.90 },
        { step: 1, thought: 'First step', confidence: 0.95 },
        { step: 2, thought: 'Second step', confidence: 0.92 },
      ];

      const context = QueryDecomposer.generateContext(completedSteps);

      // Steps should appear in order
      const step1Index = context.indexOf('Step 1');
      const step2Index = context.indexOf('Step 2');
      const step3Index = context.indexOf('Step 3');

      expect(step1Index).toBeLessThan(step2Index);
      expect(step2Index).toBeLessThan(step3Index);
    });
  });

  describe('Parallel Optimization', () => {
    it('should identify parallelizable steps', () => {
      const query = 'Analyze multiple independent factors';
      const decomposition = QueryDecomposer.decompose(query, { steps: 10 });

      const optimization = QueryDecomposer.optimizeForParallel(decomposition);

      expect(optimization.parallelGroups).toBeDefined();
      expect(optimization.estimatedSpeedup).toBeGreaterThan(1.0);
    });

    it('should calculate speedup estimates correctly', () => {
      const query = 'Process multiple parallel tasks';
      const decomposition = QueryDecomposer.decompose(query, { steps: 8 });

      const optimization = QueryDecomposer.optimizeForParallel(decomposition);

      // Speedup should be reasonable (1.0 to number of parallel groups)
      expect(optimization.estimatedSpeedup).toBeGreaterThan(1.0);
      expect(optimization.estimatedSpeedup).toBeLessThanOrEqual(optimization.parallelGroups.length);
    });

    it('should respect dependencies in parallel groups', () => {
      const query = 'Complex multi-step analysis';
      const decomposition = QueryDecomposer.decompose(query, { steps: 6 });

      const optimization = QueryDecomposer.optimizeForParallel(decomposition);

      // Steps in the same group should not have dependencies on each other
      optimization.parallelGroups.forEach(group => {
        group.forEach(stepNum => {
          const step = decomposition.steps.find(s => s.step === stepNum);
          expect(step).toBeDefined();

          // Check that no other step in the group is a dependency
          const otherStepsInGroup = group.filter(s => s !== stepNum);
          otherStepsInGroup.forEach(otherStepNum => {
            expect(step!.dependencies).not.toContain(otherStepNum);
          });
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short queries', () => {
      const query = 'AI?';
      const decomposition = QueryDecomposer.decompose(query);

      expect(decomposition.steps).toBeDefined();
      expect(decomposition.steps.length).toBeGreaterThan(0);
    });

    it('should handle very long queries', () => {
      const query = 'Analyze the impact of ' +
        'climate change on global agriculture, ' +
        'considering factors such as temperature changes, ' +
        'water availability, soil quality, pest patterns, ' +
        'and adaptation strategies in different regions';

      const decomposition = QueryDecomposer.decompose(query, { steps: 10 });

      expect(decomposition.steps).toBeDefined();
      expect(decomposition.steps.length).toBe(10);
    });

    it('should handle queries with special characters', () => {
      const query = 'What is 2+2? How about 3*3? What about sqrt(16)?';
      const decomposition = QueryDecomposer.decompose(query);

      expect(decomposition.steps).toBeDefined();
    });

    it('should handle multi-language queries', () => {
      const query = 'What is the meaning of life? ¿Cuál es el sentido de la vida?';
      const decomposition = QueryDecomposer.decompose(query);

      expect(decomposition.steps).toBeDefined();
    });
  });

  describe('Integration with Configuration', () => {
    it('should respect configuration options', () => {
      const query = 'Complex analysis task';
      const config: ThoughtChainConfig = {
        steps: 7,
        confidenceThreshold: 0.85,
        backtrackOnLowConfidence: true,
        maxBacktrackAttempts: 2,
      };

      const decomposition = QueryDecomposer.decompose(query, config);

      expect(decomposition.steps.length).toBe(7);
    });

    it('should handle default configuration', () => {
      const query = 'Default configuration test';
      const decomposition = QueryDecomposer.decompose(query);

      // Should use default steps (5)
      expect(decomposition.steps.length).toBe(5);
    });
  });

  describe('Performance', () => {
    it('should decompose queries quickly', () => {
      const query = 'Performance test query with moderate complexity';

      const start = performance.now();
      const decomposition = QueryDecomposer.decompose(query, { steps: 10 });
      const end = performance.now();

      const duration = end - start;

      expect(decomposition.steps).toBeDefined();
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should handle batch decomposition efficiently', () => {
      const queries = Array.from({ length: 50 }, (_, i) => `Query ${i}: Explain topic ${i}`);

      const start = performance.now();
      const decompositions = queries.map(q => QueryDecomposer.decompose(q));
      const end = performance.now();

      const duration = end - start;
      const avgDuration = duration / queries.length;

      expect(decompositions.length).toBe(queries.length);
      expect(avgDuration).toBeLessThan(50); // Average < 50ms per query
    });
  });

  describe('Reasoning Quality', () => {
    it('should generate meaningful sub-questions', () => {
      const query = 'How does the internet work?';
      const decomposition = QueryDecomposer.decompose(query, { steps: 5 });

      // Each step should have a meaningful question
      decomposition.steps.forEach(step => {
        expect(step.question).toBeDefined();
        expect(step.question.length).toBeGreaterThan(10);
        expect(step.question).toContain('?');
      });
    });

    it('should progress logically through steps', () => {
      const query = 'Explain the process of scientific discovery';
      const decomposition = QueryDecomposer.decompose(query, { steps: 5 });

      // Early steps should be foundational
      const earlySteps = decomposition.steps.slice(0, 2);
      const lateSteps = decomposition.steps.slice(-2);

      // Early steps should have fewer dependencies
      const earlyDeps = earlySteps.reduce((sum, s) => sum + s.dependencies.length, 0);
      const lateDeps = lateSteps.reduce((sum, s) => sum + s.dependencies.length, 0);

      expect(earlyDeps).toBeLessThanOrEqual(lateDeps);
    });

    it('should cover all aspects of the query', () => {
      const query = 'Analyze the environmental and economic impacts of renewable energy';
      const decomposition = QueryDecomposer.decompose(query, { steps: 6 });

      const allQuestions = decomposition.steps.map(s => s.question.toLowerCase()).join(' ');

      // Should cover environmental aspects
      expect(allQuestions).toMatch(/environmental|energy|renewable/);

      // Should cover economic aspects
      expect(allQuestions).toMatch(/economic|cost|impact/);
    });
  });
});
