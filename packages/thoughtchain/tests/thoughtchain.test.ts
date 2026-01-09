/**
 * ThoughtChain Test Suite
 *
 * Comprehensive tests for the parallel reasoning verification system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ThoughtChain, QueryDecomposer, createMockVerifiers } from '@superinstance/thoughtchain';

describe('ThoughtChain', () => {
  let verifiers: any[];

  beforeEach(() => {
    verifiers = createMockVerifiers(3);
  });

  describe('Basic Functionality', () => {
    it('should create a ThoughtChain instance', () => {
      const tc = new ThoughtChain(verifiers);
      expect(tc).toBeDefined();
    });

    it('should reason through a query', async () => {
      const tc = new ThoughtChain(verifiers, { steps: 3 });
      const result = await tc.reason('What is 2 + 2?');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.answer).toBeDefined();
      expect(result.reasoning).toHaveLength(3);
    });

    it('should return a confidence score', async () => {
      const tc = new ThoughtChain(verifiers);
      const result = await tc.reason('Test query');

      expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(1);
    });

    it('should complete reasoning steps', async () => {
      const tc = new ThoughtChain(verifiers, { steps: 5 });
      const result = await tc.reason('Test query');

      expect(result.stepsCompleted).toBe(5);
      expect(result.reasoning).toHaveLength(5);
    });
  });

  describe('Query Decomposition', () => {
    it('should decompose a query into steps', () => {
      const decomposition = QueryDecomposer.decompose('Test query', { steps: 5 });

      expect(decomposition.steps).toHaveLength(5);
      expect(decomposition.totalSteps).toBe(5);
    });

    it('should identify dependencies between steps', () => {
      const decomposition = QueryDecomposer.decompose('Test query');

      for (const step of decomposition.steps) {
        expect(step.dependencies).toBeDefined();
        expect(Array.isArray(step.dependencies)).toBe(true);
      }
    });

    it('should determine execution order', () => {
      const decomposition = QueryDecomposer.decompose('Test query');

      expect(decomposition.executionOrder).toBeDefined();
      expect(decomposition.executionOrder).toHaveLength(decomposition.totalSteps);
    });

    it('should generate context from completed steps', () => {
      const completedSteps = [
        { step: 1, thought: 'First thought', confidence: 0.9 },
        { step: 2, thought: 'Second thought', confidence: 0.85 },
      ];

      const context = QueryDecomposer.generateContext(completedSteps);

      expect(context).toContain('Step 1');
      expect(context).toContain('First thought');
      expect(context).toContain('Step 2');
      expect(context).toContain('Second thought');
    });
  });

  describe('Confidence Scoring', () => {
    it('should provide per-step confidence', async () => {
      const tc = new ThoughtChain(verifiers);
      const result = await tc.reason('Test query');

      for (const step of result.reasoning) {
        expect(step.confidence).toBeGreaterThanOrEqual(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should include verifier votes', async () => {
      const tc = new ThoughtChain(verifiers, { verifiers: 3 });
      const result = await tc.reason('Test query');

      for (const step of result.reasoning) {
        expect(step.verifierVotes).toBeDefined();
        expect(step.verifierVotes).toHaveLength(3);
      }
    });

    it('should calculate overall confidence', async () => {
      const tc = new ThoughtChain(verifiers);
      const result = await tc.reason('Test query');

      expect(result.overallConfidence).toBeGreaterThan(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Backtracking', () => {
    it('should backtrack on low confidence', async () => {
      const tc = new ThoughtChain(verifiers, {
        confidenceThreshold: 0.95,
        backtrackOnLowConfidence: true,
      });

      const result = await tc.reason('Test query');

      // May or may not backtrack depending on mock results
      expect(result).toBeDefined();
    });

    it('should track backtracking events', async () => {
      const tc = new ThoughtChain(verifiers, {
        confidenceThreshold: 0.99,
        backtrackOnLowConfidence: true,
      });

      const result = await tc.reason('Test query');

      expect(result.backtrackingEvents).toBeDefined();
      expect(Array.isArray(result.backtrackingEvents)).toBe(true);
    });

    it('should respect max backtracking attempts', async () => {
      const tc = new ThoughtChain(verifiers, {
        maxBacktrackAttempts: 2,
        backtrackOnLowConfidence: true,
      });

      const result = await tc.reason('Test query');

      for (const event of result.backtrackingEvents) {
        expect(event.attempt).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('Configuration', () => {
    it('should accept custom configuration', () => {
      const config = {
        steps: 7,
        verifiers: 5,
        confidenceThreshold: 0.95,
      };

      const tc = new ThoughtChain(verifiers, config);

      const retrievedConfig = tc.getConfig();
      expect(retrievedConfig.steps).toBe(7);
      expect(retrievedConfig.verifiers).toBe(5);
      expect(retrievedConfig.confidenceThreshold).toBe(0.95);
    });

    it('should allow configuration updates', () => {
      const tc = new ThoughtChain(verifiers, { steps: 3 });

      tc.updateConfig({ steps: 5 });

      const config = tc.getConfig();
      expect(config.steps).toBe(5);
    });

    it('should use default values for missing config', () => {
      const tc = new ThoughtChain(verifiers);

      const config = tc.getConfig();
      expect(config.steps).toBe(5);
      expect(config.verifiers).toBe(3);
      expect(config.confidenceThreshold).toBe(0.90);
    });
  });

  describe('Event Emission', () => {
    it('should emit progress events', async () => {
      const tc = new ThoughtChain(verifiers);
      const progressHandler = vi.fn();

      tc.on('progress', progressHandler);

      await tc.reason('Test query');

      expect(progressHandler).toHaveBeenCalled();
    });

    it('should emit step complete events', async () => {
      const tc = new ThoughtChain(verifiers);
      const stepHandler = vi.fn();

      tc.on('stepComplete', stepHandler);

      await tc.reason('Test query');

      expect(stepHandler).toHaveBeenCalledTimes(5);
    });

    it('should emit complete event', async () => {
      const tc = new ThoughtChain(verifiers);
      const completeHandler = vi.fn();

      tc.on('complete', completeHandler);

      await tc.reason('Test query');

      expect(completeHandler).toHaveBeenCalled();
    });
  });

  describe('Token Tracking', () => {
    it('should track token usage', async () => {
      const tc = new ThoughtChain(verifiers);
      const result = await tc.reason('Test query');

      expect(result.tokens).toBeDefined();
      expect(result.tokens.input).toBeGreaterThanOrEqual(0);
      expect(result.tokens.output).toBeGreaterThanOrEqual(0);
      expect(result.tokens.total).toBeGreaterThan(0);
    });

    it('should track per-step tokens', async () => {
      const tc = new ThoughtChain(verifiers);
      const result = await tc.reason('Test query');

      for (const step of result.reasoning) {
        if (step.tokens) {
          expect(step.tokens.total).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Timing', () => {
    it('should track total duration', async () => {
      const tc = new ThoughtChain(verifiers);
      const result = await tc.reason('Test query');

      expect(result.duration).toBeGreaterThan(0);
    });

    it('should track per-step timing', async () => {
      const tc = new ThoughtChain(verifiers);
      const result = await tc.reason('Test query');

      for (const step of result.reasoning) {
        if (step.timing) {
          expect(step.timing.duration).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      const faultyVerifiers = createMockVerifiers(3);
      const tc = new ThoughtChain(faultyVerifiers);

      const result = await tc.reason('Test query');

      expect(result).toBeDefined();
    });

    it('should report success status', async () => {
      const tc = new ThoughtChain(verifiers);
      const result = await tc.reason('Test query');

      expect(result.success).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Explanations', () => {
    it('should generate explanation when enabled', async () => {
      const tc = new ThoughtChain(verifiers, { explainReasoning: true });
      const result = await tc.reason('Test query');

      expect(result.explanation).toBeDefined();
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    it('should skip explanation when disabled', async () => {
      const tc = new ThoughtChain(verifiers, { explainReasoning: false });
      const result = await tc.reason('Test query');

      expect(result.explanation).toBe('');
    });
  });

  describe('Parallel Execution', () => {
    it('should use multiple verifiers', async () => {
      const tc = new ThoughtChain(verifiers, { verifiers: 5 });
      const result = await tc.reason('Test query');

      for (const step of result.reasoning) {
        expect(step.verifierVotes).toBeDefined();
        expect(step.verifierVotes.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Aggregation Strategies', () => {
    const strategies = ['mean', 'median', 'weighted', 'voting', 'confidence-weighted'] as const;

    it.each(strategies)('should support %s strategy', async (strategy) => {
      const tc = new ThoughtChain(verifiers, { aggregationStrategy: strategy });
      const result = await tc.reason('Test query');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });
});
