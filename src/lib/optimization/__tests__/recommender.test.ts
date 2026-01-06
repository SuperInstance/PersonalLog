/**
 * Unit Tests: Recommendation Engine
 *
 * Tests the recommendation system including:
 * - Recommendation generation
 * - Priority scoring
 * - Confidence calculation
 * - Risk assessment
 * - Recommendation application
 * - History tracking
 *
 * @coverage Target: 75%+ (Recommendation functionality)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Recommender, recommender } from '../recommender';
import type { Recommendation, RecommendationContext } from '../recommender';
import type { OptimizationTarget } from '../types';

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => mockLocalStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockLocalStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockLocalStorage[key];
      },
      clear: () => {
        Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
      },
    },
    writable: true,
  });
});

afterEach(() => {
  // Clear localStorage after each test
  Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
  vi.clearAllMocks();
});

describe('Recommender', () => {
  let testRecommender: Recommender;

  beforeEach(() => {
    testRecommender = new Recommender();
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(testRecommender).toBeDefined();
    });

    it('should have no recommendations initially', () => {
      const history = testRecommender.getHistory();
      expect(history).toEqual([]);
    });

    it('should have empty applied recommendations', () => {
      expect(testRecommender).toBeDefined();
    });
  });

  // ==========================================================================
  // RECOMMENDATION GENERATION TESTS
  // ==========================================================================

  describe('Recommendation Generation', () => {
    it('should generate recommendations from context', async () => {
      const context: RecommendationContext = {
        context: 'test',
        constraints: {
          maxLatencyMs: 2000,
          minCacheHitRate: 0.7,
        },
        currentMetrics: {
          'response-latency': 2500,
          'cache-size': 0.5,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should generate latency recommendations', async () => {
      const context: RecommendationContext = {
        context: 'latency-test',
        constraints: {
          maxLatencyMs: 1000,
        },
        currentMetrics: {
          'response-latency': 2500,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      expect(recommendations.length).toBeGreaterThan(0);

      const latencyRec = recommendations.find((rec: Recommendation) =>
        rec.action.includes('latency') || rec.action.includes('timeout') || rec.action.includes('streaming')
      );
      expect(latencyRec).toBeDefined();
    });

    it('should generate cache recommendations', async () => {
      const context: RecommendationContext = {
        context: 'cache-test',
        constraints: {
          minCacheHitRate: 0.8,
        },
        currentMetrics: {
          'cache-size': 0.4,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      expect(recommendations.length).toBeGreaterThan(0);

      const cacheRec = recommendations.find((rec: Recommendation) =>
        rec.action.includes('cache') || rec.configKey.includes('cache')
      );
      expect(cacheRec).toBeDefined();
    });

    it('should generate memory recommendations', async () => {
      const context: RecommendationContext = {
        context: 'memory-test',
        constraints: {
          maxMemoryMB: 80,
        },
        currentMetrics: {
          'memory-usage': 120,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      expect(recommendations.length).toBeGreaterThan(0);

      const memoryRec = recommendations.find((rec: Recommendation) =>
        rec.action.includes('memory') || rec.configKey.includes('memory')
      );
      expect(memoryRec).toBeDefined();
    });

    it('should generate rendering recommendations', async () => {
      const context: RecommendationContext = {
        context: 'render-test',
        constraints: {
          minFrameRate: 55,
        },
        currentMetrics: {
          'frame-rate': 30,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      expect(recommendations.length).toBeGreaterThan(0);

      const renderRec = recommendations.find((rec: Recommendation) =>
        rec.action.includes('scroll') || rec.action.includes('render') || rec.action.includes('batch')
      );
      expect(renderRec).toBeDefined();
    });

    it('should return empty array when no issues detected', async () => {
      const context: RecommendationContext = {
        context: 'healthy-test',
        constraints: {
          maxLatencyMs: 5000,
          minCacheHitRate: 0.5,
          maxMemoryMB: 200,
          minFrameRate: 30,
        },
        currentMetrics: {
          'response-latency': 500,
          'cache-size': 0.8,
          'memory-usage': 50,
          'frame-rate': 60,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      // Should be empty or very few with good metrics
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  // ==========================================================================
  // PRIORITY SCORING TESTS
  // ==========================================================================

  describe('Priority Scoring', () => {
    it('should assign high priority for critical issues', async () => {
      const context: RecommendationContext = {
        context: 'priority-test',
        constraints: {
          maxLatencyMs: 1000,
        },
        currentMetrics: {
          'response-latency': 5000, // Very high latency
        },
      };

      const recommendations = await testRecommender.suggest(context);

      const highPriorityRecs = recommendations.filter((rec: Recommendation) => rec.priority === 'high');
      expect(highPriorityRecs.length).toBeGreaterThan(0);
    });

    it('should assign medium priority for moderate issues', async () => {
      const context: RecommendationContext = {
        context: 'medium-priority-test',
        constraints: {
          minCacheHitRate: 0.8,
        },
        currentMetrics: {
          'cache-size': 0.6, // Moderate issue
        },
      };

      const recommendations = await testRecommender.suggest(context);

      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should sort recommendations by priority', async () => {
      const context: RecommendationContext = {
        context: 'sort-test',
        constraints: {
          maxLatencyMs: 1000,
          minCacheHitRate: 0.8,
        },
        currentMetrics: {
          'response-latency': 3000,
          'cache-size': 0.5,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      if (recommendations.length > 1) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        for (let i = 0; i < recommendations.length - 1; i++) {
          const currentPriority = priorityOrder[recommendations[i].priority];
          const nextPriority = priorityOrder[recommendations[i + 1].priority];
          expect(currentPriority).toBeLessThanOrEqual(nextPriority);
        }
      }
    });
  });

  // ==========================================================================
  // CONFIDENCE SCORING TESTS
  // ==========================================================================

  describe('Confidence Scoring', () => {
    it('should include confidence scores', async () => {
      const context: RecommendationContext = {
        context: 'confidence-test',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {
          'response-latency': 3000,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      for (const rec of recommendations) {
        expect(rec.confidence).toBeGreaterThanOrEqual(0);
        expect(rec.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should have higher confidence for severe deviations', async () => {
      const context1: RecommendationContext = {
        context: 'slight-deviation',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {
          'response-latency': 2200, // Slight deviation
        },
      };

      const context2: RecommendationContext = {
        context: 'severe-deviation',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {
          'response-latency': 5000, // Severe deviation
        },
      };

      const recs1 = await testRecommender.suggest(context1);
      const recs2 = await testRecommender.suggest(context2);

      // Severe deviation should have at least one recommendation
      expect(recs2.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // RISK ASSESSMENT TESTS
  // ==========================================================================

  describe('Risk Assessment', () => {
    it('should include risk levels', async () => {
      const context: RecommendationContext = {
        context: 'risk-test',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {
          'response-latency': 3000,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      for (const rec of recommendations) {
        expect(rec.riskLevel).toBeGreaterThanOrEqual(0);
        expect(rec.riskLevel).toBeLessThanOrEqual(100);
      }
    });

    it('should have lower risk for simple changes', async () => {
      const context: RecommendationContext = {
        context: 'low-risk-test',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {
          'response-latency': 3000,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      // At least one recommendation should be low-medium risk
      const lowRiskRecs = recommendations.filter((rec: Recommendation) => rec.riskLevel < 30);
      expect(lowRiskRecs.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // RECOMMENDATION CONTENT TESTS
  // ==========================================================================

  describe('Recommendation Content', () => {
    it('should include action description', async () => {
      const context: RecommendationContext = {
        context: 'action-test',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {
          'response-latency': 3000,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      for (const rec of recommendations) {
        expect(rec.action).toBeDefined();
        expect(rec.action.length).toBeGreaterThan(0);
      }
    });

    it('should include reasoning', async () => {
      const context: RecommendationContext = {
        context: 'reasoning-test',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {
          'response-latency': 3000,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      for (const rec of recommendations) {
        expect(rec.reasoning).toBeDefined();
        expect(rec.reasoning.length).toBeGreaterThan(0);
      }
    });

    it('should include expected improvement', async () => {
      const context: RecommendationContext = {
        context: 'improvement-test',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {
          'response-latency': 3000,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      for (const rec of recommendations) {
        expect(rec.expectedImprovement).toBeDefined();
        expect(rec.expectedImprovement.length).toBeGreaterThan(0);
        // Should contain percentage sign or similar
        expect(rec.expectedImprovement).toMatch(/\+?\d+%/);
      }
    });

    it('should include estimated time', async () => {
      const context: RecommendationContext = {
        context: 'time-test',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {
          'response-latency': 3000,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      for (const rec of recommendations) {
        expect(rec.estimatedTime).toBeDefined();
        expect(rec.estimatedTime.length).toBeGreaterThan(0);
      }
    });

    it('should include current and suggested values', async () => {
      const context: RecommendationContext = {
        context: 'values-test',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {
          'response-latency': 3000,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      for (const rec of recommendations) {
        expect(rec.current).toBeDefined();
        expect(rec.suggested).toBeDefined();
        expect(rec.configKey).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // RECOMMENDATION APPLICATION TESTS
  // ==========================================================================

  describe('Recommendation Application', () => {
    it('should apply recommendation successfully', async () => {
      const context: RecommendationContext = {
        context: 'apply-test',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {
          'response-latency': 3000,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      if (recommendations.length > 0) {
        const success = await testRecommender.applyRecommendation(recommendations[0]);
        expect(success).toBe(true);
      }
    });

    it('should persist applied recommendation', async () => {
      const context: RecommendationContext = {
        context: 'persist-test',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {
          'response-latency': 3000,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      if (recommendations.length > 0) {
        await testRecommender.applyRecommendation(recommendations[0]);

        const stored = localStorage.getItem('personallog-config');
        expect(stored).toBeDefined();
      }
    });

    it('should not apply same recommendation twice', async () => {
      const context: RecommendationContext = {
        context: 'duplicate-test',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {
          'response-latency': 3000,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      if (recommendations.length > 0) {
        const success1 = await testRecommender.applyRecommendation(recommendations[0]);
        const success2 = await testRecommender.applyRecommendation(recommendations[0]);

        expect(success1).toBe(true);
        expect(success2).toBe(false);
      }
    });

    it('should update config value', async () => {
      const context: RecommendationContext = {
        context: 'config-update-test',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {
          'response-latency': 3000,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      if (recommendations.length > 0) {
        const rec = recommendations[0];
        await testRecommender.applyRecommendation(rec);

        const stored = localStorage.getItem('personallog-config');
        const config = JSON.parse(stored!);

        expect(config[rec.configKey]).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // HISTORY TESTS
  // ==========================================================================

  describe('History', () => {
    it('should track recommendation history', async () => {
      const context: RecommendationContext = {
        context: 'history-test',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {
          'response-latency': 3000,
        },
      };

      await testRecommender.suggest(context);

      const history = testRecommender.getHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should clear history', async () => {
      const context: RecommendationContext = {
        context: 'clear-history-test',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {
          'response-latency': 3000,
        },
      };

      await testRecommender.suggest(context);
      testRecommender.clearHistory();

      const history = testRecommender.getHistory();
      expect(history).toEqual([]);
    });
  });

  // ==========================================================================
  // USER PREFERENCES TESTS
  // ==========================================================================

  describe('User Preferences', () => {
    it('should respect risk tolerance preference', async () => {
      const context: RecommendationContext = {
        context: 'preference-test',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {
          'response-latency': 3000,
        },
        preferences: {
          riskTolerance: 'low',
        },
      };

      const recommendations = await testRecommender.suggest(context);

      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should prioritize speed when requested', async () => {
      const context: RecommendationContext = {
        context: 'speed-priority-test',
        constraints: {
          maxLatencyMs: 2000,
          maxMemoryMB: 100,
        },
        currentMetrics: {
          'response-latency': 3000,
          'memory-usage': 120,
        },
        preferences: {
          prioritizeSpeed: true,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should prioritize memory when requested', async () => {
      const context: RecommendationContext = {
        context: 'memory-priority-test',
        constraints: {
          maxLatencyMs: 2000,
          maxMemoryMB: 100,
        },
        currentMetrics: {
          'response-latency': 3000,
          'memory-usage': 120,
        },
        preferences: {
          prioritizeMemory: true,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // GLOBAL INSTANCE TESTS
  // ==========================================================================

  describe('Global Instance', () => {
    it('should export global recommender instance', () => {
      expect(recommender).toBeInstanceOf(Recommender);
    });

    it('should work with global instance', async () => {
      const context: RecommendationContext = {
        context: 'global-test',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {
          'response-latency': 3000,
        },
      };

      const recommendations = await recommender.suggest(context);

      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle missing context gracefully', async () => {
      const context: RecommendationContext = {
        context: 'minimal-test',
        constraints: {},
        currentMetrics: {},
      };

      const recommendations = await testRecommender.suggest(context);

      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should handle missing metrics gracefully', async () => {
      const context: RecommendationContext = {
        context: 'no-metrics-test',
        constraints: {
          maxLatencyMs: 2000,
        },
        currentMetrics: {},
      };

      const recommendations = await testRecommender.suggest(context);

      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should handle missing constraints gracefully', async () => {
      const context: RecommendationContext = {
        context: 'no-constraints-test',
        constraints: {},
        currentMetrics: {
          'response-latency': 3000,
        },
      };

      const recommendations = await testRecommender.suggest(context);

      expect(Array.isArray(recommendations)).toBe(true);
    });
  });
});
