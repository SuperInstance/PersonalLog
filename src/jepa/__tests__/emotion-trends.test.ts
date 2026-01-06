/**
 * Tests for Emotion Trend Tracker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EmotionTrendTracker } from '@/lib/jepa/emotion-trends';
import type { EmotionRecording } from '@/lib/jepa/emotion-storage';

describe('EmotionTrendTracker', () => {
  let tracker: EmotionTrendTracker;
  let testRecordings: EmotionRecording[];

  beforeEach(() => {
    tracker = new EmotionTrendTracker();

    const now = Date.now();
    testRecordings = [
      {
        id: 'test-1',
        timestamp: now,
        duration: 10,
        valence: 0.8,
        arousal: 0.7,
        dominance: 0.6,
        emotion: 'happy',
        confidence: 0.9,
        language: 'en',
        hasAudio: true,
      },
      {
        id: 'test-2',
        timestamp: now + 1000,
        duration: 12,
        valence: 0.3,
        arousal: 0.4,
        dominance: 0.3,
        emotion: 'sad',
        confidence: 0.8,
        language: 'en',
        hasAudio: true,
      },
      {
        id: 'test-3',
        timestamp: now + 2000,
        duration: 8,
        valence: 0.6,
        arousal: 0.5,
        dominance: 0.5,
        emotion: 'neutral',
        confidence: 0.7,
        language: 'en',
        hasAudio: false,
      },
    ];
  });

  describe('computeStatistics', () => {
    it('should compute statistics for recordings', async () => {
      const stats = await tracker.computeStatistics(testRecordings);

      expect(stats.valence.mean).toBeCloseTo((0.8 + 0.3 + 0.6) / 3);
      expect(stats.arousal.mean).toBeCloseTo((0.7 + 0.4 + 0.5) / 3);
      expect(stats.dominance.mean).toBeCloseTo((0.6 + 0.3 + 0.5) / 3);
    });

    it('should compute min and max correctly', async () => {
      const stats = await tracker.computeStatistics(testRecordings);

      expect(stats.valence.min).toBe(0.3);
      expect(stats.valence.max).toBe(0.8);
    });

    it('should compute standard deviation', async () => {
      const stats = await tracker.computeStatistics(testRecordings);

      expect(stats.valence.std).toBeGreaterThan(0);
      expect(stats.arousal.std).toBeGreaterThan(0);
    });

    it('should compute median correctly', async () => {
      const stats = await tracker.computeStatistics(testRecordings);

      expect(stats.valence.median).toBeCloseTo(0.6, 1);
    });

    it('should return zero statistics for empty recordings', async () => {
      const stats = await tracker.computeStatistics([]);

      expect(stats.valence.mean).toBe(0);
      expect(stats.arousal.mean).toBe(0);
      expect(stats.dominance.mean).toBe(0);
    });

    it('should compute emotion distribution', async () => {
      const stats = await tracker.computeStatistics(testRecordings);

      expect(stats.emotionDistribution.happy).toBeCloseTo(1 / 3);
      expect(stats.emotionDistribution.sad).toBeCloseTo(1 / 3);
      expect(stats.emotionDistribution.neutral).toBeCloseTo(1 / 3);
    });
  });

  describe('detectPatterns', () => {
    it('should detect time-of-day patterns', async () => {
      // Create recordings at different hours
      const now = new Date();
      now.setHours(9, 0, 0, 0);

      const morningRecordings: EmotionRecording[] = Array.from({ length: 10 }, (_, i) => ({
        id: `test-${i}`,
        timestamp: now.getTime() + i * 1000,
        duration: 10,
        valence: 0.3, // Low valence
        arousal: 0.5,
        dominance: 0.5,
        emotion: 'sad',
        confidence: 0.8,
        language: 'en',
        hasAudio: true,
      }));

      const patterns = await tracker.detectPatterns(morningRecordings);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some((p) => p.type === 'low_valence_time')).toBe(true);
    });

    it('should detect day-of-week patterns', async () => {
      // Create recordings on Monday
      const mondayDate = new Date('2024-01-01T09:00:00'); // Monday

      const mondayRecordings: EmotionRecording[] = Array.from({ length: 10 }, (_, i) => ({
        id: `test-${i}`,
        timestamp: mondayDate.getTime() + i * 1000,
        duration: 10,
        valence: 0.8, // High valence
        arousal: 0.6,
        dominance: 0.6,
        emotion: 'happy',
        confidence: 0.9,
        language: 'en',
        hasAudio: true,
      }));

      const patterns = await tracker.detectPatterns(mondayRecordings);

      expect(patterns.some((p) => p.type === 'high_valence_day')).toBe(true);
    });

    it('should detect improving mood trend', async () => {
      const now = Date.now();
      const trendRecordings: EmotionRecording[] = Array.from({ length: 20 }, (_, i) => ({
        id: `test-${i}`,
        timestamp: now + i * 1000,
        duration: 10,
        valence: 0.3 + i * 0.02, // Increasing valence
        arousal: 0.5,
        dominance: 0.5,
        emotion: i < 10 ? 'sad' : 'happy',
        confidence: 0.8,
        language: 'en',
        hasAudio: true,
      }));

      const patterns = await tracker.detectPatterns(trendRecordings);

      expect(patterns.some((p) => p.type === 'improving_mood')).toBe(true);
    });

    it('should detect declining mood trend', async () => {
      const now = Date.now();
      const trendRecordings: EmotionRecording[] = Array.from({ length: 20 }, (_, i) => ({
        id: `test-${i}`,
        timestamp: now + i * 1000,
        duration: 10,
        valence: 0.8 - i * 0.02, // Decreasing valence
        arousal: 0.5,
        dominance: 0.5,
        emotion: i < 10 ? 'happy' : 'sad',
        confidence: 0.8,
        language: 'en',
        hasAudio: true,
      }));

      const patterns = await tracker.detectPatterns(trendRecordings);

      expect(patterns.some((p) => p.type === 'declining_mood')).toBe(true);
    });

    it('should return empty patterns for insufficient data', async () => {
      const patterns = await tracker.detectPatterns(testRecordings.slice(0, 3));

      expect(patterns).toHaveLength(0);
    });
  });

  describe('getHeatmapData', () => {
    it('should generate heatmap data by day and hour', async () => {
      const now = new Date('2024-01-01T09:00:00'); // Monday

      const recordings: EmotionRecording[] = Array.from({ length: 5 }, (_, i) => ({
        id: `test-${i}`,
        timestamp: now.getTime() + i * 1000,
        duration: 10,
        valence: 0.7,
        arousal: 0.6,
        dominance: 0.5,
        emotion: 'happy',
        confidence: 0.8,
        language: 'en',
        hasAudio: true,
      }));

      const heatmapData = await tracker.getHeatmapData(recordings);

      expect(heatmapData.Mon).toBeDefined();
      expect(heatmapData.Mon[9]).toBeDefined();
      expect(heatmapData.Mon[9].valence).toBeGreaterThan(0);
      expect(heatmapData.Mon[9].count).toBe(5);
    });

    it('should initialize all days and hours', async () => {
      const heatmapData = await tracker.getHeatmapData([]);

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (const day of days) {
        expect(heatmapData[day]).toBeDefined();
        for (let hour = 0; hour < 24; hour++) {
          expect(heatmapData[day][hour]).toBeDefined();
        }
      }
    });
  });

  describe('getAggregatedStats', () => {
    it('should aggregate statistics by hour', async () => {
      const now = Date.now();
      const hourlyRecordings: EmotionRecording[] = [
        {
          id: 'test-1',
          timestamp: now,
          duration: 10,
          valence: 0.5,
          arousal: 0.5,
          dominance: 0.5,
          emotion: 'neutral',
          confidence: 0.8,
          language: 'en',
          hasAudio: true,
        },
        {
          id: 'test-2',
          timestamp: now + 60 * 60 * 1000, // 1 hour later
          duration: 10,
          valence: 0.7,
          arousal: 0.6,
          dominance: 0.6,
          emotion: 'happy',
          confidence: 0.9,
          language: 'en',
          hasAudio: true,
        },
      ];

      const aggregated = await tracker.getAggregatedStats(hourlyRecordings, 'hour');

      expect(aggregated).toHaveLength(2);
      expect(aggregated[0].stats.valence.mean).toBeCloseTo(0.5);
      expect(aggregated[1].stats.valence.mean).toBeCloseTo(0.7);
    });

    it('should aggregate statistics by day', async () => {
      const now = Date.now();
      const dailyRecordings: EmotionRecording[] = [
        {
          id: 'test-1',
          timestamp: now,
          duration: 10,
          valence: 0.5,
          arousal: 0.5,
          dominance: 0.5,
          emotion: 'neutral',
          confidence: 0.8,
          language: 'en',
          hasAudio: true,
        },
        {
          id: 'test-2',
          timestamp: now + 24 * 60 * 60 * 1000, // 1 day later
          duration: 10,
          valence: 0.7,
          arousal: 0.6,
          dominance: 0.6,
          emotion: 'happy',
          confidence: 0.9,
          language: 'en',
          hasAudio: true,
        },
      ];

      const aggregated = await tracker.getAggregatedStats(dailyRecordings, 'day');

      expect(aggregated).toHaveLength(2);
      expect(aggregated[0].stats.valence.mean).toBeCloseTo(0.5);
      expect(aggregated[1].stats.valence.mean).toBeCloseTo(0.7);
    });

    it('should return sorted results by timestamp', async () => {
      const now = Date.now();
      const recordings: EmotionRecording[] = [
        {
          id: 'test-2',
          timestamp: now + 2000,
          duration: 10,
          valence: 0.7,
          arousal: 0.6,
          dominance: 0.6,
          emotion: 'happy',
          confidence: 0.9,
          language: 'en',
          hasAudio: true,
        },
        {
          id: 'test-1',
          timestamp: now,
          duration: 10,
          valence: 0.5,
          arousal: 0.5,
          dominance: 0.5,
          emotion: 'neutral',
          confidence: 0.8,
          language: 'en',
          hasAudio: true,
        },
      ];

      const aggregated = await tracker.getAggregatedStats(recordings, 'hour');

      expect(aggregated[0].timestamp).toBeLessThan(aggregated[1].timestamp);
    });
  });
});
