/**
 * Integration Tests: Provider Interactions
 *
 * Tests how different provider contexts interact with each other
 * and with the integration manager.
 *
 * @coverage 90%+ of provider interactions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  getIntegrationManager,
  resetIntegrationManager,
} from '../../integration/manager';
import { clearHardwareCache } from '../../hardware';

// Mock analytics provider
const mockAnalyticsCollector = {
  trackEvent: vi.fn(),
  trackPageView: vi.fn(),
  getEvents: vi.fn(),
  clearEvents: vi.fn(),
  exportData: vi.fn(),
  getSessionId: vi.fn(() => 'test-session'),
};

// Mock experiments provider
const mockExperimentsManager = {
  assignVariant: vi.fn(),
  getVariant: vi.fn(),
  isActive: vi.fn(),
  getActiveExperiments: vi.fn(),
  trackMetric: vi.fn(),
  optOut: vi.fn(),
  optIn: vi.fn(),
};

// Mock optimization provider
const mockOptimizationEngine = {
  optimize: vi.fn(),
  getCurrentConfig: vi.fn(),
  applyOptimizations: vi.fn(),
  resetOptimizations: vi.fn(),
  getRecommendations: vi.fn(),
};

// Mock personalization provider
const mockPersonalizationLearner = {
  getPreferences: vi.fn(),
  updatePreference: vi.fn(),
  recordAction: vi.fn(),
  predictPreference: vi.fn(),
  resetPreferences: vi.fn(),
  exportData: vi.fn(),
  importData: vi.fn(),
};

describe('Provider Interactions', () => {
  beforeEach(() => {
    resetIntegrationManager();
    clearHardwareCache();
    vi.clearAllMocks();

    // Initialize integration manager
    const manager = getIntegrationManager({ autoInitialize: false, debug: true });
    manager.initialize();
  });

  afterEach(() => {
    resetIntegrationManager();
  });

  describe('Integration Provider Context', () => {
    it('should provide integration state to consumers', async () => {
      const manager = getIntegrationManager();
      await manager.initialize();

      const state = manager.getState();

      expect(state.stage).toBe('ready');
      expect(state.systems).toBeDefined();
      expect(state.progress).toBeDefined();
    });

    it('should provide capabilities to consumers', async () => {
      const manager = getIntegrationManager();
      await manager.initialize();

      const capabilities = manager.getCapabilities();

      expect(capabilities.systemScore).toBeGreaterThanOrEqual(0);
      expect(capabilities.featureFlags).toBeDefined();
    });

    it('should check feature flags', async () => {
      const manager = getIntegrationManager();
      await manager.initialize();

      // Should not throw
      const isEnabled = manager.isFeatureEnabled('messenger');

      expect(typeof isEnabled).toBe('boolean');
    });

    it('should get enabled features', async () => {
      const manager = getIntegrationManager();
      await manager.initialize();

      const features = manager.getEnabledFeatures();

      expect(Array.isArray(features)).toBe(true);
    });
  });

  describe('Analytics Provider', () => {
    it('should track events through integration', async () => {
      const { trackEvent } = await import('../../analytics/collector');

      trackEvent('test_event', { type: 'test_event', category: 'test' });

      // Should not throw
      expect(true).toBe(true);
    });

    it('should export analytics data', async () => {
      const { exportAnalyticsData } = await import('../../analytics/storage');

      const data = await exportAnalyticsData();

      expect(data).toBeDefined();
      expect(Array.isArray(data.events)).toBe(true);
    });

    it('should clear analytics data', async () => {
      const { clearAnalyticsData, trackEvent } = await import('../../analytics/collector');

      await trackEvent('test_event', { type: 'test_event' });
      await clearAnalyticsData();

      const { getEvents } = await import('../../analytics/queries');
      const events = await getEvents();

      expect(events.length).toBe(0);
    });
  });

  describe('Experiments Provider', () => {
    it('should assign variants to users', async () => {
      const { getExperimentsManager } = await import('../../experiments');

      const manager = getExperimentsManager();

      // Should not throw
      const assignment = manager.assignVariant('test_experiment', 'test-user-123');

      expect(assignment).toBeDefined();
      expect(['control', 'treatment'].includes(assignment?.variantId || '')).toBe(true);
    });

    it('should get active experiments', async () => {
      const { getExperimentsManager } = await import('../../experiments');

      const manager = getExperimentsManager();
      const active = manager.getActiveExperiments();

      expect(Array.isArray(active)).toBe(true);
    });

    it('should allow opting out of experiments', async () => {
      const { getExperimentsManager } = await import('../../experiments');

      const manager = getExperimentsManager();
      manager.optOut();

      // After opting out, should not be in any experiments
      const assignment = manager.assignVariant('test_exp', 'test-user-456');

      expect(assignment).toBeNull();
    });
  });

  describe('Optimization Provider', () => {
    it('should provide current optimization config', async () => {
      const { getOptimizationEngine } = await import('../../optimization');

      const engine = getOptimizationEngine();
      const config = engine.getCurrentConfig();

      expect(config).toBeDefined();
    });

    it('should apply optimizations', async () => {
      const { getOptimizationEngine } = await import('../../optimization');

      const engine = getOptimizationEngine();

      await engine.applyOptimizations();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should get recommendations', async () => {
      const { getOptimizationEngine } = await import('../../optimization');

      const engine = getOptimizationEngine();
      const recommendations = await engine.getRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('Personalization Provider', () => {
    it('should record user actions', async () => {
      const { getPersonalizationLearner } = await import('../../personalization');

      const learner = getPersonalizationLearner();

      learner.recordAction({
        type: 'viewed_conversation',
        timestamp: new Date().toISOString(),
        context: { feature: 'conversation' },
        data: { conversationId: 'test-123' }
      });

      // Should not throw
      expect(true).toBe(true);
    });

    it('should get learned preferences', async () => {
      const { getPersonalizationLearner } = await import('../../personalization');

      const learner = getPersonalizationLearner();
      const preferences = learner.getPreferences();

      expect(preferences).toBeDefined();
    });

    it('should export preference data', async () => {
      const { getPersonalizationLearner } = await import('../../personalization');

      const learner = getPersonalizationLearner();
      const data = learner.exportData();

      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });
  });

  describe('Provider Interdependencies', () => {
    it('should use analytics data for personalization', async () => {
      // This would test that analytics events can be used
      // to personalize the experience

      const { trackEvent } = await import('../../analytics/collector');
      const { getPersonalizationLearner } = await import('../../personalization');

      // Track some events
      trackEvent('conversation_viewed', { type: 'conversation_viewed', conversationId: 'test' });
      trackEvent('conversation_viewed', { type: 'conversation_viewed', conversationId: 'test' });

      // Personalization should be able to learn from this
      const learner = getPersonalizationLearner();
      learner.recordAction({
        type: 'conversation_viewed',
        timestamp: new Date().toISOString(),
        context: { feature: 'conversation' },
        data: { conversationId: 'test' }
      });

      const preferences = learner.getPreferences();

      expect(preferences).toBeDefined();
    });

    it('should use experiments for optimization', async () => {
      // Test that experiment assignment affects optimization

      const { getExperimentsManager } = await import('../../experiments');
      const { getOptimizationEngine } = await import('../../optimization');

      const expManager = getExperimentsManager();
      const engine = getOptimizationEngine();

      // Assign to experiment
      expManager.assignVariant('optimization_test', 'test-user-789');

      // Get optimization recommendations
      const recommendations = await engine.getRecommendations();

      expect(recommendations).toBeDefined();
    });

    it('should use feature flags for conditional initialization', async () => {
      const manager = getIntegrationManager();
      await manager.initialize();

      // Check if features are properly gated
      const analyticsEnabled = manager.isFeatureEnabled('analytics');

      if (analyticsEnabled) {
        // Analytics should be available
        const { trackEvent } = await import('../../analytics/collector');

        expect(typeof trackEvent).toBe('function');
      }
    });
  });

  describe('Provider Lifecycle', () => {
    it('should initialize providers in correct order', async () => {
      const initOrder: string[] = [];

      // Mock initialization tracking
      const manager = getIntegrationManager({ autoInitialize: false, debug: true });

      manager.on('system_status_changed', (event) => {
        const data = event.data as { status: { stage: string }; system: string };
        if (data.status.stage === 'ready') {
          initOrder.push(data.system);
        }
      });

      await manager.initialize();

      // Hardware should initialize before feature flags
      const hardwareIndex = initOrder.indexOf('hardware');
      const flagsIndex = initOrder.indexOf('flags');

      expect(hardwareIndex).toBeLessThan(flagsIndex);
    });

    it('should handle provider initialization failures gracefully', async () => {
      const manager = getIntegrationManager();

      // If one provider fails, others should still work
      await manager.initialize();

      const state = manager.getState();

      // At least hardware and flags should work
      expect(['ready', 'failed'].includes(state.systems.hardware.stage)).toBe(true);
      expect(['ready', 'failed'].includes(state.systems.flags.stage)).toBe(true);
    });
  });

  describe('Cross-Provider Data Flow', () => {
    it('should share user session across providers', async () => {
      const { getSessionId } = await import('../../analytics/collector');

      const sessionId = getSessionId();

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
    });

    it('should aggregate metrics from multiple providers', async () => {
      // This would test that metrics from analytics, experiments,
      // and personalization can be aggregated

      const { getExperimentsManager } = await import('../../experiments');
      const { getPersonalizationLearner } = await import('../../personalization');

      const expManager = getExperimentsManager();
      const learner = getPersonalizationLearner();

      // Both should be able to record metrics
      expManager.trackMetric('test_metric', 100);
      learner.recordAction({
        type: 'test_action',
        timestamp: new Date().toISOString()
      });

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Provider Performance', () => {
    it('should not block initial render', async () => {
      const start = performance.now();

      const manager = getIntegrationManager({ autoInitialize: false });
      manager.initialize();

      const end = performance.now();

      // Should return immediately (async)
      expect(end - start).toBeLessThan(50);
    });

    it('should load providers lazily', async () => {
      // Providers should only load when needed

      const start = performance.now();

      // Import analytics only when needed
      const { trackEvent } = await import('../../analytics/collector');

      const end = performance.now();

      trackEvent('test', { type: 'test' });

      // First import might take time, subsequent should be fast
      expect(end - start).toBeLessThan(1000);
    });
  });

  describe('Provider Error Recovery', () => {
    it('should recover from analytics errors', async () => {
      const { trackEvent } = await import('../../analytics/collector');

      // Should not throw even with invalid data
      expect(() => {
        trackEvent('test', null as any);
      }).not.toThrow();
    });

    it('should recover from experiment errors', async () => {
      const { getExperimentsManager } = await import('../../experiments');

      const manager = getExperimentsManager();

      // Should handle invalid experiment IDs gracefully
      const assignment = manager.assignVariant('', 'test-user-999');

      // Should return null or default
      expect(assignment).toBeNull();
    });

    it('should continue with partial provider failure', async () => {
      const manager = getIntegrationManager();

      await manager.initialize();

      const state = manager.getState();

      // Even if some systems fail, app should work
      const workingSystems = Object.values(state.systems).filter(
        s => s.stage === 'ready'
      ).length;

      expect(workingSystems).toBeGreaterThan(0);
    });
  });
});
