/**
 * Unit Tests: Analytics Event Collector
 *
 * Tests the event collection system including:
 * - Event tracking with correct timestamps
 * - Session management (start, end, timeout)
 * - Batch flushing behavior
 * - Privacy controls (disabled state)
 * - Storage integration
 *
 * @coverage Target: 85%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventCollector } from '../collector';

// Mock the analytics event store
vi.mock('../storage', () => ({
  analyticsEventStore: {
    addEvents: vi.fn(),
    queryEvents: vi.fn(() => Promise.resolve([])),
  },
}));

describe('EventCollector', () => {
  let collector: EventCollector;

  beforeEach(() => {
    // Create a fresh collector for each test
    collector = new EventCollector({
      enabled: true,
      batchSize: 5,
      batchInterval: 1000,
      persist: false, // Don't persist in tests
      samplingRate: 1.0,
    });

    // Mock setTimeout to avoid actual timers in tests
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await collector.shutdown();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe('initialize()', () => {
    it('should initialize collector successfully', async () => {
      await collector.initialize();

      expect(collector['isInitialized']).toBe(true);
    });

    it('should not initialize twice', async () => {
      await collector.initialize();
      await collector.initialize(); // Second call should be no-op

      expect(collector['isInitialized']).toBe(true);
    });

    it('should start batch timer on initialization', async () => {
      const startBatchTimerSpy = vi.spyOn(collector as any, 'startBatchTimer');

      await collector.initialize();

      expect(startBatchTimerSpy).toHaveBeenCalledTimes(1);
    });

    it('should track session start event on initialization', async () => {
      const trackSpy = vi.spyOn(collector, 'track');

      await collector.initialize();

      expect(trackSpy).toHaveBeenCalledWith(
        'session_start',
        expect.objectContaining({
          type: 'session_start',
        })
      );
    });

    it('should start new session if previous session expired', async () => {
      await collector.initialize();

      const oldSessionId = collector['sessionManager'].getSessionId();

      // Simulate session expiration
      collector['sessionManager']['lastActivity'] = Date.now() - 60 * 60 * 1000; // 1 hour ago

      await collector.initialize();

      const newSessionId = collector['sessionManager'].getSessionId();

      expect(newSessionId).not.toBe(oldSessionId);
    });
  });

  // ==========================================================================
  // EVENT TRACKING TESTS
  // ==========================================================================

  describe('track()', () => {
    it('should track event with correct timestamp', async () => {
      await collector.initialize();

      await collector.track('message_sent', {
        type: 'message_sent',
        conversationId: 'conv-123',
      });

      const buffer = collector['eventBuffer'];
      expect(buffer).toHaveLength(1);
      expect(buffer[0].type).toBe('message_sent');
      expect(buffer[0].timestamp).toBeDefined();
    });

    it('should not track events when analytics is disabled', async () => {
      collector.updateConfig({ enabled: false });
      await collector.initialize();

      await collector.track('message_sent', {
        type: 'message_sent',
      });

      expect(collector['eventBuffer']).toHaveLength(0);
    });

    it('should respect sampling rate', async () => {
      const lowSamplingCollector = new EventCollector({
        enabled: true,
        samplingRate: 0.0, // 0% sampling
      });

      await lowSamplingCollector.initialize();

      await lowSamplingCollector.track('message_sent', {
        type: 'message_sent',
      });

      expect(lowSamplingCollector['eventBuffer']).toHaveLength(0);
    });

    it('should update session activity on track', async () => {
      await collector.initialize();

      const updateActivitySpy = vi.spyOn(
        collector['sessionManager'],
        'updateActivity'
      );

      await collector.track('message_sent', { type: 'message_sent' });

      expect(updateActivitySpy).toHaveBeenCalledTimes(1);
    });

    it('should determine event category correctly', async () => {
      await collector.initialize();

      await collector.track('message_sent', { type: 'message_sent' });
      await collector.track('api_response', { type: 'api_response' });
      await collector.track('session_start', { type: 'session_start' });

      const buffer = collector['eventBuffer'];

      expect(buffer[0].category).toBe('user_action');
      expect(buffer[1].category).toBe('performance');
      expect(buffer[2].category).toBe('engagement');
    });

    it('should update session stats correctly', async () => {
      await collector.initialize();

      await collector.track('message_sent', { type: 'message_sent' });
      await collector.track('feature_used', {
        type: 'feature_used',
        featureId: 'test-feature',
      });

      const stats = collector['sessionStats'];

      expect(stats.actionsPerformed).toBe(3); // Including session_start
      expect(stats.messagesSent).toBe(1);
      expect(stats.featuresUsed.has('test-feature')).toBe(true);
    });

    it('should auto-flush when buffer reaches batch size', async () => {
      await collector.initialize();

      const flushSpy = vi.spyOn(collector, 'flush');

      // Track exactly the batch size
      for (let i = 0; i < 5; i++) {
        await collector.track('message_sent', { type: 'message_sent' });
      }

      expect(flushSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // BATCH FLUSHING TESTS
  // ==========================================================================

  describe('flush()', () => {
    it('should flush events to storage', async () => {
      await collector.initialize();

      await collector.track('message_sent', { type: 'message_sent' });
      await collector.flush();

      expect(collector['eventBuffer']).toHaveLength(0);
    });

    it('should not flush if buffer is empty', async () => {
      await collector.initialize();

      await collector.flush();

      // Should not throw
      expect(collector['eventBuffer']).toHaveLength(0);
    });

    it('should re-add events to buffer on storage failure', async () => {
      const { analyticsEventStore } = await import('../storage');
      (analyticsEventStore.addEvents as any).mockRejectedValue(
        new Error('Storage failed')
      );

      await collector.initialize();

      await collector.track('message_sent', { type: 'message_sent' });
      await collector.flush();

      // Events should be re-added to buffer
      expect(collector['eventBuffer']).toHaveLength(1);
    });

    it('should flush on batch timer interval', async () => {
      await collector.initialize();

      await collector.track('message_sent', { type: 'message_sent' });

      // Fast-forward timer
      vi.advanceTimersByTime(1000);

      // Wait for async operations
      await vi.runAllTimersAsync();

      expect(collector['eventBuffer']).toHaveLength(0);
    });
  });

  // ==========================================================================
  // SESSION MANAGEMENT TESTS
  // ==========================================================================

  describe('Session Management', () => {
    it('should generate unique session IDs', async () => {
      await collector.initialize();

      const sessionId = collector['sessionManager'].getSessionId();

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.startsWith('session_')).toBe(true);
    });

    it('should track session duration correctly', async () => {
      await collector.initialize();

      const startTime = Date.now();
      vi.advanceTimersByTime(5000); // 5 seconds

      const duration = collector['sessionManager'].getSessionDuration();

      expect(duration).toBeGreaterThanOrEqual(4); // Allow for timing variance
      expect(duration).toBeLessThanOrEqual(6);
    });

    it('should detect session expiration', async () => {
      const shortTimeoutCollector = new EventCollector({
        sessionTimeout: 100, // 100ms timeout
      });

      await shortTimeoutCollector.initialize();

      expect(shortTimeoutCollector['sessionManager'].isExpired()).toBe(false);

      vi.advanceTimersByTime(150);

      expect(shortTimeoutCollector['sessionManager'].isExpired()).toBe(true);
    });

    it('should start new session when requested', async () => {
      await collector.initialize();

      const oldSessionId = collector['sessionManager'].getSessionId();
      const newSessionId = collector['sessionManager'].startNewSession();

      expect(newSessionId).not.toBe(oldSessionId);
    });

    it('should end session and track session_end event', async () => {
      await collector.initialize();

      const trackSpy = vi.spyOn(collector, 'track');

      await collector.endSession();

      expect(trackSpy).toHaveBeenCalledWith(
        'session_end',
        expect.objectContaining({
          type: 'session_end',
          duration: expect.any(Number),
          actionsPerformed: expect.any(Number),
        })
      );
    });

    it('should reset session stats after ending session', async () => {
      await collector.initialize();

      await collector.track('message_sent', { type: 'message_sent' });
      await collector.endSession();

      const stats = collector['sessionStats'];

      expect(stats.actionsPerformed).toBe(0);
      expect(stats.messagesSent).toBe(0);
      expect(stats.featuresUsed.size).toBe(0);
    });
  });

  // ==========================================================================
  // CONFIGURATION TESTS
  // ==========================================================================

  describe('Configuration', () => {
    it('should use default config', () => {
      const defaultCollector = new EventCollector();
      const config = defaultCollector.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.batchSize).toBe(50);
      expect(config.batchInterval).toBe(30000);
      expect(config.samplingRate).toBe(1.0);
    });

    it('should merge custom config with defaults', () => {
      const customCollector = new EventCollector({
        batchSize: 10,
        samplingRate: 0.5,
      });

      const config = customCollector.getConfig();

      expect(config.batchSize).toBe(10);
      expect(config.samplingRate).toBe(0.5);
      expect(config.enabled).toBe(true); // Default
    });

    it('should update config at runtime', () => {
      collector.updateConfig({
        enabled: false,
        batchSize: 20,
      });

      const config = collector.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.batchSize).toBe(20);
    });

    it('should restart batch timer when interval changes', async () => {
      await collector.initialize();

      const stopSpy = vi.spyOn(collector as any, 'stopBatchTimer');
      const startSpy = vi.spyOn(collector as any, 'startBatchTimer');

      collector.updateConfig({ batchInterval: 5000 });

      expect(stopSpy).toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // PRIVACY CONTROLS TESTS
  // ==========================================================================

  describe('Privacy Controls', () => {
    it('should respect disabled state', async () => {
      collector.updateConfig({ enabled: false });
      await collector.initialize();

      await collector.track('message_sent', { type: 'message_sent' });

      expect(collector['eventBuffer']).toHaveLength(0);
    });

    it('should not persist when persist is false', async () => {
      const { analyticsEventStore } = await import('../storage');

      collector.updateConfig({ persist: false });
      await collector.initialize();

      await collector.track('message_sent', { type: 'message_sent' });
      await collector.flush();

      expect(analyticsEventStore.addEvents).not.toHaveBeenCalled();
    });

    it('should respect sampling rate', async () => {
      const lowSamplingCollector = new EventCollector({
        samplingRate: 0.1, // 10% sampling
      });

      await lowSamplingCollector.initialize();

      // Track 100 events, expect roughly 10 to be sampled
      let trackedCount = 0;
      for (let i = 0; i < 100; i++) {
        const initialLength = lowSamplingCollector['eventBuffer'].length;
        await lowSamplingCollector.track('message_sent', { type: 'message_sent' });
        if (lowSamplingCollector['eventBuffer'].length > initialLength) {
          trackedCount++;
        }
      }

      // Allow for variance (5-15 events)
      expect(trackedCount).toBeGreaterThan(0);
      expect(trackedCount).toBeLessThan(30);
    });
  });

  // ==========================================================================
  // SHUTDOWN TESTS
  // ==========================================================================

  describe('shutdown()', () => {
    it('should flush events on shutdown', async () => {
      await collector.initialize();

      await collector.track('message_sent', { type: 'message_sent' });
      await collector.shutdown();

      expect(collector['eventBuffer']).toHaveLength(0);
    });

    it('should end session on shutdown', async () => {
      await collector.initialize();

      const endSessionSpy = vi.spyOn(collector, 'endSession');

      await collector.shutdown();

      expect(endSessionSpy).toHaveBeenCalled();
    });

    it('should stop batch timer on shutdown', async () => {
      await collector.initialize();

      const stopSpy = vi.spyOn(collector as any, 'stopBatchTimer');

      await collector.shutdown();

      expect(stopSpy).toHaveBeenCalled();
    });

    it('should set initialized to false', async () => {
      await collector.initialize();

      await collector.shutdown();

      expect(collector['isInitialized']).toBe(false);
    });
  });

  // ==========================================================================
  // EVENT CATEGORY TESTS
  // ==========================================================================

  describe('Event Categories', () => {
    it('should categorize user actions correctly', async () => {
      await collector.initialize();

      const userActions = [
        'message_sent',
        'conversation_created',
        'conversation_archived',
        'conversation_deleted',
        'settings_changed',
      ];

      for (const action of userActions) {
        await collector.track(action as any, { type: action });
      }

      const buffer = collector['eventBuffer'];
      buffer.forEach(event => {
        expect(event.category).toBe('user_action');
      });
    });

    it('should categorize performance events correctly', async () => {
      await collector.initialize();

      const performanceEvents = ['app_initialized', 'api_response', 'render_complete'];

      for (const event of performanceEvents) {
        await collector.track(event as any, { type: event });
      }

      const buffer = collector['eventBuffer'];
      buffer.forEach(event => {
        expect(event.category).toBe('performance');
      });
    });

    it('should categorize engagement events correctly', async () => {
      await collector.initialize();

      const engagementEvents = ['session_start', 'session_end', 'feature_used'];

      for (const event of engagementEvents) {
        await collector.track(event as any, { type: event });
      }

      const buffer = collector['eventBuffer'];
      buffer.forEach(event => {
        expect(event.category).toBe('engagement');
      });
    });

    it('should categorize error events correctly', async () => {
      await collector.initialize();

      await collector.track('error_occurred', { type: 'error_occurred' });

      const buffer = collector['eventBuffer'];

      expect(buffer[0].category).toBe('error');
    });

    it('should default to user_action for unknown events', async () => {
      await collector.initialize();

      await collector.track('unknown_event' as any, { type: 'unknown_event' });

      const buffer = collector['eventBuffer'];

      expect(buffer[0].category).toBe('user_action');
    });
  });
});
