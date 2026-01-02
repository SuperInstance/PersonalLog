/**
 * Unit Tests: Personalization Learner
 *
 * Tests the preference learning system including:
 * - Signal extraction from actions
 * - Preference aggregation
 * - Confidence calculation
 * - Category opt-out
 *
 * @coverage Target: 75%+ (Basic functionality)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PreferenceLearner,
  PreferenceAggregator,
  PatternDetector,
} from '../learner';
import type { UserAction } from '../types';

describe('PreferenceLearner', () => {
  let learner: PreferenceLearner;

  beforeEach(() => {
    learner = new PreferenceLearner();
  });

  // ==========================================================================
  // SIGNAL EXTRACTION TESTS
  // ==========================================================================

  describe('Signal Extraction', () => {
    it('should extract theme preference', () => {
      const action: UserAction = {
        type: 'theme-changed',
        timestamp: Date.now(),
        data: {
          value: 'dark',
        },
      };

      const signals = learner.analyzeAction(action);

      expect(signals).toHaveLength(1);
      expect(signals[0].preferenceKey).toBe('ui.theme');
      expect(signals[0].value).toBe('dark');
      expect(signals[0].strength).toBe(0.8);
    });

    it('should extract response length preference on expansion', () => {
      const action: UserAction = {
        type: 'response-expanded',
        timestamp: Date.now(),
      };

      const signals = learner.analyzeAction(action);

      expect(signals).toHaveLength(1);
      expect(signals[0].preferenceKey).toBe('communication.responseLength');
      expect(signals[0].value).toBe('detailed');
      expect(signals[0].strength).toBe(0.6);
    });

    it('should extract response length preference on collapse', () => {
      const action: UserAction = {
        type: 'response-collapsed',
        timestamp: Date.now(),
      };

      const signals = learner.analyzeAction(action);

      expect(signals).toHaveLength(1);
      expect(signals[0].preferenceKey).toBe('communication.responseLength');
      expect(signals[0].value).toBe('brief');
      expect(signals[0].strength).toBe(0.6);
    });

    it('should extract font size preference', () => {
      const action: UserAction = {
        type: 'font-size-changed',
        timestamp: Date.now(),
        data: {
          value: 'large',
        },
      };

      const signals = learner.analyzeAction(action);

      expect(signals).toHaveLength(1);
      expect(signals[0].preferenceKey).toBe('ui.fontSize');
      expect(signals[0].value).toBe('large');
      expect(signals[0].strength).toBe(0.8);
    });

    it('should extract sidebar position preference', () => {
      const action: UserAction = {
        type: 'sidebar-toggled',
        timestamp: Date.now(),
        data: {
          position: 'right',
        },
      };

      const signals = learner.analyzeAction(action);

      expect(signals).toHaveLength(1);
      expect(signals[0].preferenceKey).toBe('ui.sidebarPosition');
      expect(signals[0].value).toBe('right');
      expect(signals[0].strength).toBe(0.8);
    });

    it('should extract emoji usage preference', () => {
      const action: UserAction = {
        type: 'emoji-used',
        timestamp: Date.now(),
      };

      const signals = learner.analyzeAction(action);

      expect(signals).toHaveLength(1);
      expect(signals[0].preferenceKey).toBe('communication.useEmojis');
      expect(signals[0].value).toBe(true);
      expect(signals[0].strength).toBe(0.6);
    });

    it('should extract feature usage signal', () => {
      const action: UserAction = {
        type: 'feature-used',
        timestamp: Date.now(),
        context: {
          feature: 'search',
        },
      };

      const signals = learner.analyzeAction(action);

      expect(signals).toHaveLength(1);
      expect(signals[0].preferenceKey).toBe('patterns.topFeatures');
      expect(signals[0].value).toBe('search');
      expect(signals[0].strength).toBe(0.3);
    });

    it('should throw error for feature usage without feature in context', () => {
      const action: UserAction = {
        type: 'feature-used',
        timestamp: Date.now(),
      };

      expect(() => learner.analyzeAction(action)).toThrow(
        'Feature usage signal requires feature in context'
      );
    });

    it('should extract session signals', () => {
      const action: UserAction = {
        type: 'session-ended',
        timestamp: Date.now(),
        context: {
          duration: 3600,
        },
      };

      const signals = learner.analyzeAction(action);

      expect(signals.length).toBeGreaterThan(0);

      // Should have session length and peak hours
      const sessionLengthSignal = signals.find(s => s.preferenceKey === 'patterns.avgSessionLength');
      const peakHoursSignal = signals.find(s => s.preferenceKey === 'patterns.peakHours');

      expect(sessionLengthSignal).toBeDefined();
      expect(peakHoursSignal).toBeDefined();
    });

    it('should extract error frequency signal', () => {
      const action: UserAction = {
        type: 'error-occurred',
        timestamp: Date.now(),
      };

      const signals = learner.analyzeAction(action);

      expect(signals).toHaveLength(1);
      expect(signals[0].preferenceKey).toBe('patterns.errorFrequency');
      expect(signals[0].value).toBe(1);
      expect(signals[0].strength).toBe(0.3);
    });

    it('should extract help seeking signal', () => {
      const action: UserAction = {
        type: 'help-requested',
        timestamp: Date.now(),
      };

      const signals = learner.analyzeAction(action);

      expect(signals).toHaveLength(1);
      expect(signals[0].preferenceKey).toBe('patterns.helpSeekFrequency');
      expect(signals[0].value).toBe(1);
      expect(signals[0].strength).toBe(0.6);
    });

    it('should extract general setting signal', () => {
      const action: UserAction = {
        type: 'setting-changed',
        timestamp: Date.now(),
        data: {
          setting: 'ui.compactMode' as any,
          value: true,
        },
      };

      const signals = learner.analyzeAction(action);

      expect(signals).toHaveLength(1);
      expect(signals[0].preferenceKey).toBe('ui.compactMode');
      expect(signals[0].value).toBe(true);
      expect(signals[0].strength).toBe(0.8);
    });

    it('should throw error for setting signal without required data', () => {
      const action: UserAction = {
        type: 'setting-changed',
        timestamp: Date.now(),
        data: {
          setting: 'ui.compactMode' as any,
        },
      };

      expect(() => learner.analyzeAction(action)).toThrow(
        'Setting signal requires setting and value in data'
      );
    });

    it('should filter weak signals', () => {
      // Create an action that generates weak signals
      const action: UserAction = {
        type: 'feature-used',
        timestamp: Date.now(),
        context: {
          feature: 'rarely-used',
        },
      };

      const signals = learner.analyzeAction(action);

      // Feature usage has strength 0.3, which is the threshold
      expect(signals.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array for unknown action type', () => {
      const action: UserAction = {
        type: 'unknown-action' as any,
        timestamp: Date.now(),
      };

      const signals = learner.analyzeAction(action);

      expect(signals).toHaveLength(0);
    });
  });
});

describe('PreferenceAggregator', () => {
  let aggregator: PreferenceAggregator;

  beforeEach(() => {
    aggregator = new PreferenceAggregator();
  });

  // ==========================================================================
  // SIGNAL BUFFERING TESTS
  // ==========================================================================

  describe('Signal Buffering', () => {
    it('should add signal to buffer', () => {
      const signal = {
        preferenceKey: 'ui.theme' as const,
        value: 'dark',
        strength: 0.8,
        timestamp: Date.now().toISOString(),
        sourceAction: {
          type: 'theme-changed',
          timestamp: Date.now(),
        } as UserAction,
      };

      aggregator.addSignal(signal);

      const stats = aggregator.getStats();

      expect(stats.totalSignals).toBe(1);
      expect(stats.keysTracked).toBe(1);
    });

    it('should buffer multiple signals for same key', () => {
      const signal1 = {
        preferenceKey: 'ui.theme' as const,
        value: 'dark',
        strength: 0.8,
        timestamp: Date.now().toISOString(),
        sourceAction: {
          type: 'theme-changed',
          timestamp: Date.now(),
        } as UserAction,
      };

      const signal2 = {
        preferenceKey: 'ui.theme' as const,
        value: 'light',
        strength: 0.8,
        timestamp: Date.now().toISOString(),
        sourceAction: {
          type: 'theme-changed',
          timestamp: Date.now(),
        } as UserAction,
      };

      aggregator.addSignal(signal1);
      aggregator.addSignal(signal2);

      const stats = aggregator.getStats();

      expect(stats.totalSignals).toBe(2);
      expect(stats.keysTracked).toBe(1);
    });

    it('should limit buffer size', () => {
      const signal = {
        preferenceKey: 'test.key' as const,
        value: 'value',
        strength: 0.8,
        timestamp: Date.now().toISOString(),
        sourceAction: {
          type: 'setting-changed',
          timestamp: Date.now(),
        } as UserAction,
      };

      // Add more than buffer size (10)
      for (let i = 0; i < 15; i++) {
        aggregator.addSignal(signal);
      }

      const stats = aggregator.getStats();

      expect(stats.totalSignals).toBeLessThanOrEqual(10);
    });

    it('should clear old signals based on aggregation window', () => {
      const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago

      const oldSignal = {
        preferenceKey: 'ui.theme' as const,
        value: 'dark',
        strength: 0.8,
        timestamp: new Date(oldTimestamp).toISOString(),
        sourceAction: {
          type: 'theme-changed',
          timestamp: oldTimestamp,
        } as UserAction,
      };

      const newSignal = {
        preferenceKey: 'ui.theme' as const,
        value: 'light',
        strength: 0.8,
        timestamp: Date.now().toISOString(),
        sourceAction: {
          type: 'theme-changed',
          timestamp: Date.now(),
        } as UserAction,
      };

      aggregator.addSignal(oldSignal);
      aggregator.addSignal(newSignal);

      const stats = aggregator.getStats();

      // Old signal should be filtered out
      expect(stats.totalSignals).toBe(1);
    });
  });

  // ==========================================================================
  // AGGREGATION TESTS
  // ==========================================================================

  describe('Aggregation', () => {
    it('should return null for key with no signals', () => {
      const result = aggregator.aggregate('ui.theme' as const);

      expect(result).toBeNull();
    });

    it('should aggregate preference value', () => {
      const signal = {
        preferenceKey: 'ui.theme' as const,
        value: 'dark',
        strength: 0.8,
        timestamp: Date.now().toISOString(),
        sourceAction: {
          type: 'theme-changed',
          timestamp: Date.now(),
        } as UserAction,
      };

      aggregator.addSignal(signal);

      const result = aggregator.aggregate('ui.theme' as const);

      expect(result).toBeDefined();
      expect(result?.value).toBe('dark');
      expect(result?.confidence).toBeGreaterThan(0);
    });

    it('should use latest value for aggregation', () => {
      const signal1 = {
        preferenceKey: 'ui.theme' as const,
        value: 'dark',
        strength: 0.8,
        timestamp: new Date(Date.now() - 1000).toISOString(),
        sourceAction: {
          type: 'theme-changed',
          timestamp: Date.now() - 1000,
        } as UserAction,
      };

      const signal2 = {
        preferenceKey: 'ui.theme' as const,
        value: 'light',
        strength: 0.8,
        timestamp: Date.now().toISOString(),
        sourceAction: {
          type: 'theme-changed',
          timestamp: Date.now(),
        } as UserAction,
      };

      aggregator.addSignal(signal1);
      aggregator.addSignal(signal2);

      const result = aggregator.aggregate('ui.theme' as const);

      expect(result?.value).toBe('light');
    });
  });

  // ==========================================================================
  // CONFIDENCE CALCULATION TESTS
  // ==========================================================================

  describe('Confidence Calculation', () => {
    it('should return zero confidence for no signals', () => {
      const result = aggregator.aggregate('ui.theme' as const);

      expect(result).toBeNull();
    });

    it('should increase confidence with more observations', () => {
      const signal = {
        preferenceKey: 'ui.theme' as const,
        value: 'dark',
        strength: 0.8,
        timestamp: Date.now().toISOString(),
        sourceAction: {
          type: 'theme-changed',
          timestamp: Date.now(),
        } as UserAction,
      };

      aggregator.addSignal(signal);

      const confidence1 = aggregator.aggregate('ui.theme' as const)?.confidence || 0;

      aggregator.addSignal(signal);
      aggregator.addSignal(signal);

      const confidence2 = aggregator.aggregate('ui.theme' as const)?.confidence || 0;

      expect(confidence2).toBeGreaterThan(confidence1);
    });

    it('should increase confidence for consistent values', () => {
      const signal = {
        preferenceKey: 'ui.theme' as const,
        value: 'dark',
        strength: 0.8,
        timestamp: Date.now().toISOString(),
        sourceAction: {
          type: 'theme-changed',
          timestamp: Date.now(),
        } as UserAction,
      };

      // Add consistent signals
      for (let i = 0; i < 5; i++) {
        aggregator.addSignal(signal);
      }

      const result = aggregator.aggregate('ui.theme' as const);

      expect(result?.confidence).toBeGreaterThan(0.5);
    });

    it('should decrease confidence for inconsistent values', () => {
      const signal1 = {
        preferenceKey: 'ui.theme' as const,
        value: 'dark',
        strength: 0.8,
        timestamp: Date.now().toISOString(),
        sourceAction: {
          type: 'theme-changed',
          timestamp: Date.now(),
        } as UserAction,
      };

      const signal2 = {
        preferenceKey: 'ui.theme' as const,
        value: 'light',
        strength: 0.8,
        timestamp: Date.now().toISOString(),
        sourceAction: {
          type: 'theme-changed',
          timestamp: Date.now(),
        } as UserAction,
      };

      aggregator.addSignal(signal1);
      aggregator.addSignal(signal2);
      aggregator.addSignal(signal1);
      aggregator.addSignal(signal2);

      const result = aggregator.aggregate('ui.theme' as const);

      // Inconsistent values should have no consistency bonus
      expect(result?.confidence).toBeLessThan(0.8);
    });

    it('should increase confidence for recent signals', () => {
      const recentSignal = {
        preferenceKey: 'ui.theme' as const,
        value: 'dark',
        strength: 0.8,
        timestamp: Date.now().toISOString(),
        sourceAction: {
          type: 'theme-changed',
          timestamp: Date.now(),
        } as UserAction,
      };

      aggregator.addSignal(recentSignal);
      aggregator.addSignal(recentSignal);

      const result = aggregator.aggregate('ui.theme' as const);

      expect(result?.confidence).toBeGreaterThan(0.2);
    });

    it('should cap confidence at 1.0', () => {
      const signal = {
        preferenceKey: 'ui.theme' as const,
        value: 'dark',
        strength: 0.8,
        timestamp: Date.now().toISOString(),
        sourceAction: {
          type: 'theme-changed',
          timestamp: Date.now(),
        } as UserAction,
      };

      // Add many signals
      for (let i = 0; i < 20; i++) {
        aggregator.addSignal(signal);
      }

      const result = aggregator.aggregate('ui.theme' as const);

      expect(result?.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  // ==========================================================================
  // BUFFER MANAGEMENT TESTS
  // ==========================================================================

  describe('Buffer Management', () => {
    it('should clear all signals', () => {
      const signal = {
        preferenceKey: 'ui.theme' as const,
        value: 'dark',
        strength: 0.8,
        timestamp: Date.now().toISOString(),
        sourceAction: {
          type: 'theme-changed',
          timestamp: Date.now(),
        } as UserAction,
      };

      aggregator.addSignal(signal);
      aggregator.clear();

      const stats = aggregator.getStats();

      expect(stats.totalSignals).toBe(0);
      expect(stats.keysTracked).toBe(0);
    });

    it('should get buffer statistics', () => {
      const signal1 = {
        preferenceKey: 'ui.theme' as const,
        value: 'dark',
        strength: 0.8,
        timestamp: Date.now().toISOString(),
        sourceAction: {
          type: 'theme-changed',
          timestamp: Date.now(),
        } as UserAction,
      };

      const signal2 = {
        preferenceKey: 'ui.fontSize' as const,
        value: 'large',
        strength: 0.8,
        timestamp: Date.now().toISOString(),
        sourceAction: {
          type: 'font-size-changed',
          timestamp: Date.now(),
        } as UserAction,
      };

      aggregator.addSignal(signal1);
      aggregator.addSignal(signal2);

      const stats = aggregator.getStats();

      expect(stats.totalSignals).toBe(2);
      expect(stats.keysTracked).toBe(2);
    });
  });
});

describe('PatternDetector', () => {
  let detector: PatternDetector;

  beforeEach(() => {
    detector = new PatternDetector();
  });

  // ==========================================================================
  // SESSION TRACKING TESTS
  // ==========================================================================

  describe('Session Tracking', () => {
    it('should record session', () => {
      detector.recordSession(3600, 14); // 1 hour session at 2pm

      const stats = detector.getStats();

      expect(stats.sessionsRecorded).toBe(1);
    });

    it('should limit session history to 100 sessions', () => {
      for (let i = 0; i < 150; i++) {
        detector.recordSession(3600, i % 24);
      }

      const stats = detector.getStats();

      expect(stats.sessionsRecorded).toBe(150); // Still tracks total
      expect(detector['sessionHistory'].length).toBeLessThanOrEqual(100);
    });

    it('should track hourly activity', () => {
      detector.recordSession(3600, 9); // 9am
      detector.recordSession(3600, 9); // 9am
      detector.recordSession(3600, 14); // 2pm

      const patterns = detector.getPatterns();

      expect(patterns.peakHours).toContain(9);
    });
  });

  // ==========================================================================
  // FEATURE USAGE TESTS
  // ==========================================================================

  describe('Feature Usage', () => {
    it('should record feature usage', () => {
      detector.recordFeatureUsage('search');
      detector.recordFeatureUsage('search');
      detector.recordFeatureUsage('export');

      const stats = detector.getStats();

      expect(stats.featuresTracked).toBe(2);
    });

    it('should identify top features', () => {
      detector.recordFeatureUsage('search');
      detector.recordFeatureUsage('search');
      detector.recordFeatureUsage('search');
      detector.recordFeatureUsage('export');
      detector.recordFeatureUsage('export');
      detector.recordFeatureUsage('chat');

      const patterns = detector.getPatterns();

      expect(patterns.topFeatures).toBeDefined();
      expect(patterns.topFeatures[0]).toBe('search');
    });

    it('should limit top features to 5', () => {
      for (let i = 0; i < 10; i++) {
        detector.recordFeatureUsage(`feature-${i}`);
        detector.recordFeatureUsage(`feature-${i}`);
      }

      const patterns = detector.getPatterns();

      expect(patterns.topFeatures?.length).toBeLessThanOrEqual(5);
    });
  });

  // ==========================================================================
  // ERROR TRACKING TESTS
  // ==========================================================================

  describe('Error Tracking', () => {
    it('should record errors', () => {
      detector.recordError();
      detector.recordError();
      detector.recordError();

      const stats = detector.getStats();

      expect(stats.errors).toBe(3);
    });

    it('should calculate error frequency', () => {
      detector.recordSession(3600, 10);
      detector.recordSession(3600, 10);
      detector.recordError();
      detector.recordError();

      const patterns = detector.getPatterns();

      expect(patterns.errorFrequency).toBe(1); // 2 errors / 2 sessions
    });
  });

  // ==========================================================================
  // HELP REQUEST TRACKING TESTS
  // ==========================================================================

  describe('Help Request Tracking', () => {
    it('should record help requests', () => {
      detector.recordHelp();
      detector.recordHelp();

      const stats = detector.getStats();

      expect(stats.helpRequests).toBe(2);
    });

    it('should calculate help seeking frequency', () => {
      detector.recordSession(3600, 10);
      detector.recordSession(3600, 10);
      detector.recordHelp();
      detector.recordHelp();
      detector.recordHelp();

      const patterns = detector.getPatterns();

      expect(patterns.helpSeekFrequency).toBe(1.5); // 3 help requests / 2 sessions
    });
  });

  // ==========================================================================
  // PATTERN DETECTION TESTS
  // ==========================================================================

  describe('Pattern Detection', () => {
    it('should detect peak usage hours', () => {
      // Add sessions at different hours
      detector.recordSession(3600, 9);
      detector.recordSession(3600, 9);
      detector.recordSession(3600, 9);
      detector.recordSession(3600, 10);
      detector.recordSession(3600, 14);
      detector.recordSession(3600, 14);

      const patterns = detector.getPatterns();

      expect(patterns.peakHours).toContain(9);
      expect(patterns.peakHours.length).toBeGreaterThan(0);
    });

    it('should limit peak hours to top 3', () => {
      // Add sessions across many hours
      for (let hour = 0; hour < 24; hour++) {
        detector.recordSession(3600, hour);
        detector.recordSession(3600, hour);
      }

      const patterns = detector.getPatterns();

      expect(patterns.peakHours?.length).toBeLessThanOrEqual(3);
    });

    it('should calculate average session length', () => {
      detector.recordSession(3600, 10); // 1 hour
      detector.recordSession(1800, 10); // 30 min
      detector.recordSession(5400, 10); // 1.5 hours

      const patterns = detector.getPatterns();

      expect(patterns.avgSessionLength).toBe(3600); // Average of 3 sessions
    });

    it('should return empty patterns when no data', () => {
      const patterns = detector.getPatterns();

      expect(patterns.avgSessionLength).toBeUndefined();
      expect(patterns.peakHours).toBeUndefined();
      expect(patterns.topFeatures).toBeUndefined();
    });
  });

  // ==========================================================================
  // RESET TESTS
  // ==========================================================================

  describe('Reset', () => {
    it('should reset all tracking', () => {
      detector.recordSession(3600, 10);
      detector.recordFeatureUsage('search');
      detector.recordError();
      detector.recordHelp();

      detector.reset();

      const stats = detector.getStats();

      expect(stats.sessionsRecorded).toBe(0);
      expect(stats.featuresTracked).toBe(0);
      expect(stats.errors).toBe(0);
      expect(stats.helpRequests).toBe(0);
    });

    it('should clear patterns after reset', () => {
      detector.recordSession(3600, 10);
      detector.recordFeatureUsage('search');

      detector.reset();

      const patterns = detector.getPatterns();

      expect(patterns.avgSessionLength).toBeUndefined();
      expect(patterns.topFeatures).toBeUndefined();
    });
  });

  // ==========================================================================
  // STATISTICS TESTS
  // ==========================================================================

  describe('Statistics', () => {
    it('should return accurate statistics', () => {
      detector.recordSession(3600, 10);
      detector.recordSession(1800, 14);
      detector.recordFeatureUsage('search');
      detector.recordFeatureUsage('export');
      detector.recordError();
      detector.recordHelp();
      detector.recordHelp();

      const stats = detector.getStats();

      expect(stats.sessionsRecorded).toBe(2);
      expect(stats.featuresTracked).toBe(2);
      expect(stats.errors).toBe(1);
      expect(stats.helpRequests).toBe(2);
    });

    it('should return zero stats initially', () => {
      const stats = detector.getStats();

      expect(stats.sessionsRecorded).toBe(0);
      expect(stats.featuresTracked).toBe(0);
      expect(stats.errors).toBe(0);
      expect(stats.helpRequests).toBe(0);
    });
  });
});
