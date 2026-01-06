/**
 * Unit Tests: Multi-Armed Bandit System
 *
 * Tests all 4 bandit algorithms:
 * - Epsilon-Greedy
 * - UCB1
 * - Thompson Sampling
 * - Adaptive Allocation
 *
 * @coverage Target: 90%+
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MultiArmedBandit,
  compareBanditAlgorithms,
  recommendBanditAlgorithm,
  type BanditAlgorithm,
} from '../multi-armed-bandit';
import type { Variant } from '../types';

describe('MultiArmedBandit', () => {
  let variants: Variant[];
  let bandit: MultiArmedBandit;

  beforeEach(() => {
    variants = [
      { id: 'A', name: 'Variant A', weight: 0.5, config: {}, isControl: true },
      { id: 'B', name: 'Variant B', weight: 0.5, config: {} },
      { id: 'C', name: 'Variant C', weight: 0.5, config: {} },
    ];
    bandit = new MultiArmedBandit({ algorithm: 'thompson-sampling' });
  });

  describe('Epsilon-Greedy Algorithm', () => {
    it('should explore with probability epsilon', () => {
      const egBandit = new MultiArmedBandit({
        algorithm: 'epsilon-greedy',
        epsilon: 0.2,
      });

      let explorationCount = 0;
      const trials = 1000;

      for (let i = 0; i < trials; i++) {
        const selection = egBandit.selectVariant(variants);
        if (selection.explored) {
          explorationCount++;
        }
      }

      const explorationRate = explorationCount / trials;
      expect(explorationRate).toBeGreaterThan(0.15);
      expect(explorationRate).toBeLessThan(0.25);
    });

    it('should exploit best variant when not exploring', () => {
      const egBandit = new MultiArmedBandit({
        algorithm: 'epsilon-greedy',
        epsilon: 0.0, // No exploration
        minPullsPerVariant: 5,
      });

      // Train with rewards
      for (let i = 0; i < 20; i++) {
        const selection = egBandit.selectVariant(variants);
        let reward = 0;

        if (selection.variantId === 'A') reward = 0.3;
        else if (selection.variantId === 'B') reward = 0.7;
        else if (selection.variantId === 'C') reward = 0.5;

        egBandit.updateReward(selection.variantId, reward);
      }

      // Should select best variant (B)
      const selection = egBandit.selectVariant(variants);
      expect(selection.variantId).toBe('B');
    });

    it('should decay exploration over time', () => {
      const egBandit = new MultiArmedBandit({
        algorithm: 'epsilon-greedy',
        epsilon: 0.5,
        decayExploration: true,
        decayRate: 0.9,
      });

      const selections: BanditAlgorithm[] = [];

      for (let i = 0; i < 100; i++) {
        const selection = egBandit.selectVariant(variants);
        selections.push(selection.algorithm);
      }

      // Exploration should decrease over time
      const earlyExploration = selections.slice(0, 30).filter(s => s === 'epsilon-greedy').length;
      const lateExploration = selections.slice(70).filter(s => s === 'epsilon-greedy').length;

      expect(lateExploration).toBeLessThan(earlyExploration);
    });
  });

  describe('UCB1 Algorithm', () => {
    it('should balance exploration and exploitation', () => {
      const ucbBandit = new MultiArmedBandit({
        algorithm: 'ucb1',
        confidenceLevel: 2.0,
      });

      // Train with different rewards
      for (let i = 0; i < 50; i++) {
        const selection = ucbBandit.selectVariant(variants);
        let reward = 0;

        if (selection.variantId === 'A') reward = 0.2;
        else if (selection.variantId === 'B') reward = 0.8;
        else if (selection.variantId === 'C') reward = 0.5;

        ucbBandit.updateReward(selection.variantId, reward);
      }

      const stats = ucbBandit.getArmStatistics();

      // All variants should be pulled at least once
      expect(stats.A.pulls).toBeGreaterThan(0);
      expect(stats.B.pulls).toBeGreaterThan(0);
      expect(stats.C.pulls).toBeGreaterThan(0);

      // Best variant should have highest average
      expect(stats.B.averageReward).toBeGreaterThan(stats.A.averageReward);
      expect(stats.B.averageReward).toBeGreaterThan(stats.C.averageReward);
    });

    it('should prioritize unexplored variants', () => {
      const ucbBandit = new MultiArmedBandit({
        algorithm: 'ucb1',
      });

      // Pull variant A once
      ucbBandit.updateReward('A', 0.5);

      // Next selection should prioritize unexplored variants
      const selection1 = ucbBandit.selectVariant(variants);
      expect(selection1.variantId).not.toBe('A');

      const selection2 = ucbBandit.selectVariant(variants);
      expect(selection2.variantId).not.toBe('A');
    });

    it('should calculate confidence bounds correctly', () => {
      const ucbBandit = new MultiArmedBandit({
        algorithm: 'ucb1',
        confidenceLevel: 2.0,
      });

      // Pull variant A many times
      for (let i = 0; i < 100; i++) {
        ucbBandit.updateReward('A', 0.5);
      }

      // Pull variant B once
      ucbBandit.updateReward('B', 0.5);

      const selection = ucbBandit.selectVariant(variants);

      // B should be selected due to exploration bonus
      expect(selection.variantId).toBe('B');
    });
  });

  describe('Thompson Sampling Algorithm', () => {
    it('should sample from Beta posterior', () => {
      const tsBandit = new MultiArmedBandit({
        algorithm: 'thompson-sampling',
      });

      // Train with different success rates
      for (let i = 0; i < 100; i++) {
        const selection = tsBandit.selectVariant(variants);
        let reward = 0;

        if (selection.variantId === 'A') reward = Math.random() < 0.3 ? 1 : 0;
        else if (selection.variantId === 'B') reward = Math.random() < 0.7 ? 1 : 0;
        else if (selection.variantId === 'C') reward = Math.random() < 0.5 ? 1 : 0;

        tsBandit.updateReward(selection.variantId, reward);
      }

      const stats = tsBandit.getArmStatistics();

      // Best variant should have highest average
      expect(stats.B.averageReward).toBeGreaterThan(stats.A.averageReward);
    });

    it('should handle binary rewards correctly', () => {
      const tsBandit = new MultiArmedBandit({
        algorithm: 'thompson-sampling',
      });

      // Track successes and failures
      let bSuccesses = 0;
      let bFailures = 0;

      for (let i = 0; i < 100; i++) {
        const selection = tsBandit.selectVariant(variants);

        if (selection.variantId === 'B') {
          const reward = Math.random() < 0.8 ? 1 : 0;
          if (reward === 1) bSuccesses++;
          else bFailures++;

          tsBandit.updateReward('B', reward);
        }
      }

      const stats = tsBandit.getArmStatistics();

      // Average should match success rate
      expect(stats.B.averageReward).toBeCloseTo(bSuccesses / (bSuccesses + bFailures), 0.1);
    });

    it('should converge to best variant', () => {
      const tsBandit = new MultiArmedBandit({
        algorithm: 'thompson-sampling',
        minPullsPerVariant: 10,
      });

      // Simulate 1000 pulls
      for (let i = 0; i < 1000; i++) {
        const selection = tsBandit.selectVariant(variants);
        let reward = 0;

        if (selection.variantId === 'A') reward = Math.random() < 0.3 ? 1 : 0;
        else if (selection.variantId === 'B') reward = Math.random() < 0.9 ? 1 : 0;
        else if (selection.variantId === 'C') reward = Math.random() < 0.5 ? 1 : 0;

        tsBandit.updateReward(selection.variantId, reward);
      }

      const best = tsBandit.getBestVariant();
      expect(best).toBe('B');
    });
  });

  describe('Adaptive Allocation Algorithm', () => {
    it('should use softmax for selection', () => {
      const adaptiveBandit = new MultiArmedBandit({
        algorithm: 'adaptive',
        temperature: 1.0,
      });

      // Train with different rewards
      for (let i = 0; i < 50; i++) {
        const selection = adaptiveBandit.selectVariant(variants);
        let reward = 0;

        if (selection.variantId === 'A') reward = 0.2;
        else if (selection.variantId === 'B') reward = 0.8;
        else if (selection.variantId === 'C') reward = 0.5;

        adaptiveBandit.updateReward(selection.variantId, reward);
      }

      // Should select variants based on softmax probabilities
      const stats = adaptiveBandit.getArmStatistics();
      expect(stats.B.averageReward).toBeGreaterThan(stats.A.averageReward);
    });

    it('should adjust temperature correctly', () => {
      const coldBandit = new MultiArmedBandit({
        algorithm: 'adaptive',
        temperature: 0.1,
      });

      const hotBandit = new MultiArmedBandit({
        algorithm: 'adaptive',
        temperature: 10.0,
      });

      // Train both
      for (let i = 0; i < 50; i++) {
        const selection1 = coldBandit.selectVariant(variants);
        const selection2 = hotBandit.selectVariant(variants);

        coldBandit.updateReward(selection1.variantId, 0.5);
        hotBandit.updateReward(selection2.variantId, 0.5);
      }

      // Low temperature should favor exploitation
      // High temperature should encourage exploration
      expect(coldBandit.getBestVariant()).toBeTruthy();
      expect(hotBandit.getBestVariant()).toBeTruthy();
    });

    it('should explore new variants initially', () => {
      const adaptiveBandit = new MultiArmedBandit({
        algorithm: 'adaptive',
        minPullsPerVariant: 10,
      });

      const pulls: Record<string, number> = { A: 0, B: 0, C: 0 };

      for (let i = 0; i < 30; i++) {
        const selection = adaptiveBandit.selectVariant(variants);
        pulls[selection.variantId]++;
        adaptiveBandit.updateReward(selection.variantId, 0.5);
      }

      // All variants should be pulled
      expect(pulls.A).toBeGreaterThan(0);
      expect(pulls.B).toBeGreaterThan(0);
      expect(pulls.C).toBeGreaterThan(0);
    });
  });

  describe('Bandit Statistics', () => {
    it('should track arm statistics correctly', () => {
      const rewards = { A: 10, B: 20, C: 15 };

      rewards.A = 5;
      rewards.B = 10;
      rewards.C = 7;

      for (let i = 0; i < 20; i++) {
        bandit.updateReward('A', 0.5);
      }

      const stats = bandit.getArmStatistics();

      expect(stats.A.variantId).toBe('A');
      expect(stats.A.pulls).toBe(20);
      expect(stats.A.reward).toBe(10);
      expect(stats.A.averageReward).toBeCloseTo(0.5);
    });

    it('should identify best variant correctly', () => {
      // Train with different rewards
      for (let i = 0; i < 50; i++) {
        bandit.updateReward('A', 0.3);
        bandit.updateReward('B', 0.9);
        bandit.updateReward('C', 0.6);
      }

      const best = bandit.getBestVariant();
      expect(best).toBe('B');
    });

    it('should detect convergence', () => {
      // Train bandit to convergence
      for (let i = 0; i < 1000; i++) {
        const selection = bandit.selectVariant(variants);
        let reward = 0;

        if (selection.variantId === 'B') reward = 1;
        else reward = 0;

        bandit.updateReward(selection.variantId, reward);
      }

      expect(bandit.hasConverged()).toBe(true);
    });

    it('should not converge prematurely', () => {
      // Not enough data
      for (let i = 0; i < 10; i++) {
        const selection = bandit.selectVariant(variants);
        bandit.updateReward(selection.variantId, 0.5);
      }

      expect(bandit.hasConverged()).toBe(false);
    });
  });

  describe('Bandit State Management', () => {
    it('should reset state correctly', () => {
      // Train bandit
      for (let i = 0; i < 50; i++) {
        bandit.updateReward('A', 0.5);
      }

      expect(bandit.getArmStatistics().A.pulls).toBe(50);

      // Reset
      bandit.reset();

      expect(bandit.getArmStatistics().A).toBeUndefined();
    });

    it('should export state correctly', () => {
      for (let i = 0; i < 20; i++) {
        bandit.updateReward('A', 0.7);
      }

      const state = bandit.exportState();

      expect(state.posteriors.A).toBeDefined();
      expect(state.posteriors.A.alpha).toBeGreaterThan(0);
      expect(state.posteriors.A.beta).toBeGreaterThan(0);
    });
  });

  describe('Algorithm Comparison', () => {
    it('should compare algorithms correctly', () => {
      const rewards = {
        A: Array(100).fill(0.3),
        B: Array(100).fill(0.8),
        C: Array(100).fill(0.5),
      };

      const comparison = compareBanditAlgorithms(variants, rewards, 500);

      // All algorithms should have results
      expect(comparison['epsilon-greedy']).toBeDefined();
      expect(comparison['ucb1']).toBeDefined();
      expect(comparison['thompson-sampling']).toBeDefined();
      expect(comparison['adaptive']).toBeDefined();

      // Thompson sampling should perform well
      expect(comparison['thompson-sampling'].totalReward).toBeGreaterThan(300);
    });

    it('should identify best performing algorithm', () => {
      const rewards = {
        A: Array(100).fill(0.2),
        B: Array(100).fill(0.9),
        C: Array(100).fill(0.4),
      };

      const comparison = compareBanditAlgorithms(variants, rewards, 500);

      // Find best algorithm
      const algorithms = Object.entries(comparison);
      algorithms.sort((a, b) => b[1].totalReward - a[1].totalReward);

      const best = algorithms[0];

      // Best algorithm should have decent total reward
      expect(best[1].totalReward).toBeGreaterThan(350);
    });
  });

  describe('Algorithm Recommendation', () => {
    it('should recommend epsilon-greedy for low volume', () => {
      const recommendation = recommendBanditAlgorithm(3, 500, 'medium');
      expect(recommendation).toBe('epsilon-greedy');
    });

    it('should recommend UCB1 for many variants', () => {
      const recommendation = recommendBanditAlgorithm(10, 20000, 'medium');
      expect(recommendation).toBe('ucb1');
    });

    it('should recommend Thompson sampling for high variance', () => {
      const recommendation = recommendBanditAlgorithm(3, 5000, 'high');
      expect(recommendation).toBe('thompson-sampling');
    });

    it('should default to Thompson sampling', () => {
      const recommendation = recommendBanditAlgorithm(3, 5000, 'medium');
      expect(recommendation).toBe('thompson-sampling');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty variants', () => {
      expect(() => bandit.selectVariant([])).toThrow('No variants available');
    });

    it('should handle single variant', () => {
      const singleVariant = [variants[0]];
      const selection = bandit.selectVariant(singleVariant);

      expect(selection.variantId).toBe('A');
    });

    it('should handle many variants', () => {
      const manyVariants = Array.from({ length: 100 }, (_, i) => ({
        id: `V${i}`,
        name: `Variant ${i}`,
        weight: 0.01,
        config: {},
      }));

      const selection = bandit.selectVariant(manyVariants);

      expect(manyVariants.some(v => v.id === selection.variantId)).toBe(true);
    });

    it('should handle zero rewards', () => {
      for (let i = 0; i < 20; i++) {
        const selection = bandit.selectVariant(variants);
        bandit.updateReward(selection.variantId, 0);
      }

      const stats = bandit.getArmStatistics();

      Object.values(stats).forEach(arm => {
        expect(arm.averageReward).toBe(0);
      });
    });

    it('should handle all rewards equal', () => {
      for (let i = 0; i < 20; i++) {
        const selection = bandit.selectVariant(variants);
        bandit.updateReward(selection.variantId, 0.5);
      }

      const best = bandit.getBestVariant();

      // Any variant could be best
      expect(['A', 'B', 'C']).toContain(best);
    });
  });

  describe('Configuration', () => {
    it('should use custom epsilon', () => {
      const customBandit = new MultiArmedBandit({
        algorithm: 'epsilon-greedy',
        epsilon: 0.5,
      });

      let explorationCount = 0;
      const trials = 100;

      for (let i = 0; i < trials; i++) {
        const selection = customBandit.selectVariant(variants);
        if (selection.explored) explorationCount++;
      }

      expect(explorationCount / trials).toBeGreaterThan(0.4);
    });

    it('should use custom confidence level', () => {
      const customBandit = new MultiArmedBandit({
        algorithm: 'ucb1',
        confidenceLevel: 3.0,
      });

      for (let i = 0; i < 10; i++) {
        customBandit.updateReward('A', 0.5);
      }

      const selection = customBandit.selectVariant(variants);

      // Should prioritize unexplored variants more with higher confidence
      expect(selection.variantId).not.toBe('A');
    });

    it('should use custom temperature', () => {
      const coldBandit = new MultiArmedBandit({
        algorithm: 'adaptive',
        temperature: 0.01,
      });

      const hotBandit = new MultiArmedBandit({
        algorithm: 'adaptive',
        temperature: 100.0,
      });

      // Both should work without errors
      const coldSelection = coldBandit.selectVariant(variants);
      const hotSelection = hotBandit.selectVariant(variants);

      expect(coldSelection.variantId).toBeTruthy();
      expect(hotSelection.variantId).toBeTruthy();
    });
  });

  describe('Integration with Assignment Engine', () => {
    it('should provide selection metadata', () => {
      const selection = bandit.selectVariant(variants);

      expect(selection.variantId).toBeTruthy();
      expect(selection.algorithm).toBe('thompson-sampling');
      expect(selection.score).toBeGreaterThanOrEqual(0);
      expect(selection.allScores).toBeDefined();
      expect(Object.keys(selection.allScores).length).toBe(3);
    });

    it('should track total pulls', () => {
      expect(bandit['totalPulls']).toBe(0);

      for (let i = 0; i < 10; i++) {
        const selection = bandit.selectVariant(variants);
        bandit.updateReward(selection.variantId, 0.5);
      }

      expect(bandit['totalPulls']).toBe(10);
    });
  });
});
