/**
 * Tests for Emotion Storage
 */

import {
  storeEmotion,
  queryEmotions,
  getEmotionsByDateRange,
  exportEmotionsCSV,
  exportEmotionsJSON,
  deleteAllEmotions,
  type EmotionRecording,
} from '@/lib/jepa/emotion-storage';

describe('Emotion Storage', () => {
  beforeEach(async () => {
    // Clear all emotions before each test
    await deleteAllEmotions();
  });

  describe('storeEmotion', () => {
    it('should store an emotion recording', async () => {
      const emotion: EmotionRecording = {
        id: 'test-1',
        timestamp: Date.now(),
        duration: 10.5,
        valence: 0.7,
        arousal: 0.6,
        dominance: 0.5,
        emotion: 'happy',
        confidence: 0.9,
        language: 'en',
        hasAudio: true,
      };

      await storeEmotion(emotion);

      const results = await queryEmotions({});
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(emotion);
    });

    it('should store multiple emotion recordings', async () => {
      const emotions: EmotionRecording[] = [
        {
          id: 'test-1',
          timestamp: Date.now(),
          duration: 10.5,
          valence: 0.7,
          arousal: 0.6,
          dominance: 0.5,
          emotion: 'happy',
          confidence: 0.9,
          language: 'en',
          hasAudio: true,
        },
        {
          id: 'test-2',
          timestamp: Date.now() + 1000,
          duration: 15.2,
          valence: 0.3,
          arousal: 0.4,
          dominance: 0.3,
          emotion: 'sad',
          confidence: 0.8,
          language: 'en',
          hasAudio: true,
        },
      ];

      await Promise.all(emotions.map((e) => storeEmotion(e)));

      const results = await queryEmotions({});
      expect(results).toHaveLength(2);
    });
  });

  describe('queryEmotions', () => {
    beforeEach(async () => {
      // Store test data
      const now = Date.now();
      const emotions: EmotionRecording[] = [
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
          conversationId: 'conv-1',
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
          conversationId: 'conv-2',
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
          conversationId: 'conv-1',
          hasAudio: false,
        },
      ];

      await Promise.all(emotions.map((e) => storeEmotion(e)));
    });

    it('should query all emotions', async () => {
      const results = await queryEmotions({});
      expect(results).toHaveLength(3);
    });

    it('should filter by conversation ID', async () => {
      const results = await queryEmotions({ conversationId: 'conv-1' });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.conversationId === 'conv-1')).toBe(true);
    });

    it('should filter by emotion', async () => {
      const results = await queryEmotions({ emotion: 'happy' });
      expect(results).toHaveLength(1);
      expect(results[0].emotion).toBe('happy');
    });

    it('should filter by valence range', async () => {
      const results = await queryEmotions({ minValence: 0.5 });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.valence >= 0.5)).toBe(true);
    });

    it('should filter by arousal range', async () => {
      const results = await queryEmotions({ maxArousal: 0.5 });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.arousal <= 0.5)).toBe(true);
    });

    it('should filter by date range', async () => {
      const now = Date.now();
      const startDate = new Date(now - 1000);
      const endDate = new Date(now + 1500);

      const results = await queryEmotions({ startDate, endDate });
      expect(results).toHaveLength(2);
    });
  });

  describe('getEmotionsByDateRange', () => {
    it('should get emotions within date range', async () => {
      const now = Date.now();
      const emotions: EmotionRecording[] = [
        {
          id: 'test-1',
          timestamp: now - 2000,
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
          timestamp: now,
          duration: 10,
          valence: 0.6,
          arousal: 0.5,
          dominance: 0.5,
          emotion: 'happy',
          confidence: 0.8,
          language: 'en',
          hasAudio: true,
        },
        {
          id: 'test-3',
          timestamp: now + 2000,
          duration: 10,
          valence: 0.4,
          arousal: 0.5,
          dominance: 0.5,
          emotion: 'sad',
          confidence: 0.8,
          language: 'en',
          hasAudio: true,
        },
      ];

      await Promise.all(emotions.map((e) => storeEmotion(e)));

      const startDate = new Date(now - 1000);
      const endDate = new Date(now + 1000);

      const results = await getEmotionsByDateRange(startDate, endDate);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test-2');
    });
  });

  describe('exportEmotionsCSV', () => {
    it('should export emotions to CSV format', async () => {
      const emotion: EmotionRecording = {
        id: 'test-1',
        timestamp: 1609459200000, // 2021-01-01 00:00:00
        duration: 10.5,
        valence: 0.7,
        arousal: 0.6,
        dominance: 0.5,
        emotion: 'happy',
        confidence: 0.9,
        language: 'en',
        conversationId: 'conv-1',
        hasAudio: true,
      };

      const csv = await exportEmotionsCSV([emotion]);

      expect(csv).toContain('Timestamp');
      expect(csv).toContain('Valence');
      expect(csv).toContain('Arousal');
      expect(csv).toContain('0.700');
      expect(csv).toContain('0.600');
    });
  });

  describe('exportEmotionsJSON', () => {
    it('should export emotions to JSON format', async () => {
      const emotion: EmotionRecording = {
        id: 'test-1',
        timestamp: Date.now(),
        duration: 10.5,
        valence: 0.7,
        arousal: 0.6,
        dominance: 0.5,
        emotion: 'happy',
        confidence: 0.9,
        language: 'en',
        hasAudio: true,
      };

      const json = await exportEmotionsJSON([emotion]);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toEqual(emotion);
    });
  });
});
