/**
 * Emotion Trends System Tests
 *
 * Tests for emotion trends analysis and visualization.
 * IndexedDB-dependent tests are skipped in Node environment.
 */

import { describe, it, expect } from 'vitest';

describe('Emotion Trends System', () => {
  describe('Sample Data Generation (No IndexedDB Required)', () => {
    it('should generate random emotion', async () => {
      const { generateRandomEmotion } = await import('@/lib/jepa/emotion-sample-data');

      const emotion = generateRandomEmotion();

      expect(emotion).toHaveProperty('id');
      expect(emotion).toHaveProperty('timestamp');
      expect(emotion).toHaveProperty('valence');
      expect(emotion).toHaveProperty('arousal');
      expect(emotion).toHaveProperty('dominance');
      expect(emotion).toHaveProperty('emotion');
      expect(emotion).toHaveProperty('confidence');

      // Validate ranges
      expect(emotion.valence).toBeGreaterThanOrEqual(0);
      expect(emotion.valence).toBeLessThanOrEqual(1);
      expect(emotion.arousal).toBeGreaterThanOrEqual(0);
      expect(emotion.arousal).toBeLessThanOrEqual(1);
      expect(emotion.dominance).toBeGreaterThanOrEqual(0);
      expect(emotion.dominance).toBeLessThanOrEqual(1);
    });

    it('should generate sample emotions for date range', async () => {
      const { generateSampleEmotions } = await import('@/lib/jepa/emotion-sample-data');
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      const emotions = generateSampleEmotions(startDate, endDate, 10);

      expect(emotions.length).toBe(70); // 7 days * 10 per day

      // Should be sorted by timestamp
      for (let i = 1; i < emotions.length; i++) {
        expect(emotions[i].timestamp).toBeGreaterThanOrEqual(emotions[i - 1].timestamp);
      }
    });

    it('should respect time-of-day patterns in generated data', async () => {
      const { generateRandomEmotion } = await import('@/lib/jepa/emotion-sample-data');

      // Morning (6-11): Should tend toward higher valence
      const morningTimestamp = new Date();
      morningTimestamp.setHours(8, 0, 0, 0);

      // Night (21-6): Should tend toward lower valence
      const nightTimestamp = new Date();
      nightTimestamp.setHours(23, 0, 0, 0);

      const morningEmotions = Array.from({ length: 20 }, () =>
        generateRandomEmotion(morningTimestamp.getTime() + Math.random() * 1000)
      );
      const nightEmotions = Array.from({ length: 20 }, () =>
        generateRandomEmotion(nightTimestamp.getTime() + Math.random() * 1000)
      );

      const morningAvgValence =
        morningEmotions.reduce((sum: number, e: any) => sum + e.valence, 0) / morningEmotions.length;
      const nightAvgValence =
        nightEmotions.reduce((sum: number, e: any) => sum + e.valence, 0) / nightEmotions.length;

      // Morning should generally have higher valence
      expect(morningAvgValence).toBeGreaterThan(nightAvgValence);
    });
  });

  describe('Emotion Trend Tracker (No IndexedDB Required)', () => {
    it('should compute statistics for recordings', async () => {
      const { EmotionTrendTracker } = await import('@/lib/jepa/emotion-trends');
      const tracker = new EmotionTrendTracker();

      const recordings = [
        {
          id: 'test_1',
          timestamp: Date.now(),
          duration: 60,
          valence: 0.8,
          arousal: 0.7,
          dominance: 0.6,
          emotion: 'happy',
          confidence: 0.9,
          language: 'en',
          hasAudio: false,
        },
        {
          id: 'test_2',
          timestamp: Date.now() + 1000,
          duration: 60,
          valence: 0.4,
          arousal: 0.5,
          dominance: 0.4,
          emotion: 'sad',
          confidence: 0.8,
          language: 'en',
          hasAudio: false,
        },
      ];

      const stats = await tracker.computeStatistics(recordings);

      expect(stats.valence.mean).toBeCloseTo(0.6, 1);
      expect(stats.arousal.mean).toBeCloseTo(0.6, 1);
      expect(stats.dominance.mean).toBeCloseTo(0.5, 1);
      expect(stats.emotionDistribution['happy']).toBe(0.5);
      expect(stats.emotionDistribution['sad']).toBe(0.5);
    });

    it('should detect improving mood pattern', async () => {
      const { EmotionTrendTracker } = await import('@/lib/jepa/emotion-trends');
      const tracker = new EmotionTrendTracker();

      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      // Generate recordings with improving mood
      const recordings = [];
      for (let i = 0; i < 20; i++) {
        const timestamp = now - (20 - i) * dayMs;
        const valence = 0.3 + (i / 20) * 0.5; // 0.3 to 0.8

        recordings.push({
          id: `test_${i}`,
          timestamp,
          duration: 60,
          valence,
          arousal: 0.5,
          dominance: 0.5,
          emotion: valence > 0.6 ? 'happy' : 'neutral',
          confidence: 0.8,
          language: 'en',
          hasAudio: false,
        });
      }

      const patterns = await tracker.detectPatterns(recordings);

      // Should detect improving mood pattern
      const improvingPattern = patterns.find((p: any) => p.type === 'improving_mood');
      expect(improvingPattern).toBeDefined();
      expect(improvingPattern?.description).toContain('improving');
    });

    it('should generate heatmap data', async () => {
      const { EmotionTrendTracker } = await import('@/lib/jepa/emotion-trends');
      const tracker = new EmotionTrendTracker();

      const now = Date.now();

      const recordings = [];
      for (let i = 0; i < 50; i++) {
        recordings.push({
          id: `test_${i}`,
          timestamp: now - i * 60 * 60 * 1000, // Every hour
          duration: 60,
          valence: Math.random(),
          arousal: Math.random(),
          dominance: Math.random(),
          emotion: 'neutral',
          confidence: 0.8,
          language: 'en',
          hasAudio: false,
        });
      }

      const heatmap = await tracker.getHeatmapData(recordings);

      // Should have all days of week
      expect(heatmap).toHaveProperty('Sun');
      expect(heatmap).toHaveProperty('Mon');
      expect(heatmap).toHaveProperty('Tue');
      expect(heatmap).toHaveProperty('Wed');
      expect(heatmap).toHaveProperty('Thu');
      expect(heatmap).toHaveProperty('Fri');
      expect(heatmap).toHaveProperty('Sat');

      // Each day should have 24 hours
      expect(Object.keys(heatmap['Mon'])).toHaveLength(24);
    });

    it('should detect time-of-day patterns', async () => {
      const { EmotionTrendTracker } = await import('@/lib/jepa/emotion-trends');
      const tracker = new EmotionTrendTracker();

      const now = Date.now();

      // Generate recordings with clear time-of-day pattern
      const recordings = [];
      for (let day = 0; day < 10; day++) {
        for (let hour = 6; hour < 12; hour++) {
          // Morning: high valence
          recordings.push({
            id: `test_${day}_${hour}`,
            timestamp: now - day * 24 * 60 * 60 * 1000 - hour * 60 * 60 * 1000,
            duration: 60,
            valence: 0.7 + Math.random() * 0.2,
            arousal: 0.6,
            dominance: 0.5,
            emotion: 'happy',
            confidence: 0.8,
            language: 'en',
            hasAudio: false,
          });
        }
      }

      const patterns = await tracker.detectPatterns(recordings);

      // Should detect high valence time pattern
      const highValencePattern = patterns.find((p: any) => p.type === 'high_valence_time');
      expect(highValencePattern).toBeDefined();
    });

    it('should get aggregated stats by time period', async () => {
      const { EmotionTrendTracker } = await import('@/lib/jepa/emotion-trends');
      const tracker = new EmotionTrendTracker();

      const now = Date.now();

      const recordings = [];
      for (let i = 0; i < 20; i++) {
        recordings.push({
          id: `test_${i}`,
          timestamp: now - i * 60 * 60 * 1000, // Every hour
          duration: 60,
          valence: 0.5 + Math.random() * 0.3,
          arousal: 0.5 + Math.random() * 0.3,
          dominance: 0.5 + Math.random() * 0.3,
          emotion: 'neutral',
          confidence: 0.8,
          language: 'en',
          hasAudio: false,
        });
      }

      const stats = await tracker.getAggregatedStats(recordings, 'hour');

      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0]).toHaveProperty('timestamp');
      expect(stats[0]).toHaveProperty('stats');
    });

    it('should detect day-of-week patterns', async () => {
      const { EmotionTrendTracker } = await import('@/lib/jepa/emotion-trends');
      const tracker = new EmotionTrendTracker();

      const now = Date.now();

      // Generate recordings with weekly pattern - need at least 5 recordings per day
      const recordings = [];
      for (let day = 0; day < 28; day++) {
        for (let i = 0; i < 5; i++) {
          const timestamp = now - day * 24 * 60 * 60 * 1000 - i * 60 * 60 * 1000;
          const date = new Date(timestamp);
          const dayOfWeek = date.getDay();
          const valence = dayOfWeek === 0 || dayOfWeek === 6 ? 0.8 : 0.4; // Weekend high

          recordings.push({
            id: `test_${day}_${i}`,
            timestamp,
            duration: 60,
            valence,
            arousal: 0.6,
            dominance: 0.5,
            emotion: valence > 0.6 ? 'happy' : 'neutral',
            confidence: 0.8,
            language: 'en',
            hasAudio: false,
          });
        }
      }

      const patterns = await tracker.detectPatterns(recordings);

      // Should detect high valence day pattern (weekend)
      const highValencePattern = patterns.find((p: any) => p.type === 'high_valence_day');
      expect(highValencePattern).toBeDefined();
    });

    it('should detect stable mood', async () => {
      const { EmotionTrendTracker } = await import('@/lib/jepa/emotion-trends');
      const tracker = new EmotionTrendTracker();

      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      // Generate recordings with stable mood
      const recordings = [];
      for (let i = 0; i < 20; i++) {
        recordings.push({
          id: `test_${i}`,
          timestamp: now - i * dayMs,
          duration: 60,
          valence: 0.5 + Math.random() * 0.1, // Very narrow range
          arousal: 0.5,
          dominance: 0.5,
          emotion: 'neutral',
          confidence: 0.8,
          language: 'en',
          hasAudio: false,
        });
      }

      const patterns = await tracker.detectPatterns(recordings);

      // Should detect stable mood pattern
      const stablePattern = patterns.find((p: any) => p.type === 'stable_mood');
      expect(stablePattern).toBeDefined();
      expect(stablePattern?.description).toContain('stable');
    });
  });
});
