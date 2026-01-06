/**
 * Emotion Trend Tracker
 *
 * Analyzes emotion patterns over time, computes statistics,
 * and detects meaningful patterns in emotional data.
 */

import {
  EmotionRecording,
  EmotionStatistics,
  EmotionPattern,
  EmotionQuery,
  queryEmotions,
  storeEmotion,
} from './emotion-storage';

// ============================================================================
// STATISTICAL UTILITIES
// ============================================================================

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function std(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce((result, item) => {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

// ============================================================================
// EMOTION TREND TRACKER
// ============================================================================

export class EmotionTrendTracker {
  /**
   * Record an emotion for trend analysis
   */
  async recordEmotion(emotion: EmotionRecording): Promise<void> {
    await storeEmotion(emotion);
  }

  /**
   * Get emotion recordings for a date range
   */
  async getRecordings(startDate: Date, endDate: Date): Promise<EmotionRecording[]> {
    return queryEmotions({ startDate, endDate });
  }

  /**
   * Compute statistics for a set of recordings
   */
  async computeStatistics(recordings: EmotionRecording[]): Promise<EmotionStatistics> {
    if (recordings.length === 0) {
      return {
        valence: { mean: 0, std: 0, min: 0, max: 0, median: 0 },
        arousal: { mean: 0, std: 0, min: 0, max: 0, median: 0 },
        dominance: { mean: 0, std: 0, min: 0, max: 0, median: 0 },
        emotionDistribution: {},
      };
    }

    const valences = recordings.map((r) => r.valence);
    const arousals = recordings.map((r) => r.arousal);
    const dominances = recordings.map((r) => r.dominance);

    return {
      valence: {
        mean: mean(valences),
        std: std(valences),
        min: Math.min(...valences),
        max: Math.max(...valences),
        median: median(valences),
      },
      arousal: {
        mean: mean(arousals),
        std: std(arousals),
        min: Math.min(...arousals),
        max: Math.max(...arousals),
        median: median(arousals),
      },
      dominance: {
        mean: mean(dominances),
        std: std(dominances),
        min: Math.min(...dominances),
        max: Math.max(...dominances),
        median: median(dominances),
      },
      emotionDistribution: this.computeEmotionDistribution(recordings),
    };
  }

  /**
   * Compute emotion distribution (frequency of each emotion)
   */
  private computeEmotionDistribution(
    recordings: EmotionRecording[]
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const recording of recordings) {
      const emotion = recording.emotion;
      distribution[emotion] = (distribution[emotion] || 0) + 1;
    }

    // Normalize to percentages
    const total = recordings.length;
    for (const emotion in distribution) {
      distribution[emotion] /= total;
    }

    return distribution;
  }

  /**
   * Detect patterns in emotion data
   */
  async detectPatterns(recordings: EmotionRecording[]): Promise<EmotionPattern[]> {
    const patterns: EmotionPattern[] = [];

    if (recordings.length < 5) {
      return patterns; // Need at least 5 recordings to detect patterns
    }

    // Time-of-day patterns
    const hourPatterns = this.analyzeByHour(recordings);
    patterns.push(...hourPatterns);

    // Day-of-week patterns
    const dayPatterns = this.analyzeByDayOfWeek(recordings);
    patterns.push(...dayPatterns);

    // Trend patterns (improving, declining)
    const trendPatterns = this.analyzeTrends(recordings);
    patterns.push(...trendPatterns);

    // Conversation context patterns
    const contextPatterns = this.analyzeByContext(recordings);
    patterns.push(...contextPatterns);

    return patterns;
  }

  /**
   * Analyze patterns by hour of day
   */
  private analyzeByHour(recordings: EmotionRecording[]): EmotionPattern[] {
    const byHour = groupBy(recordings, (r) => new Date(r.timestamp).getHours().toString());
    const patterns: EmotionPattern[] = [];

    for (const [hour, hourRecordings] of Object.entries(byHour)) {
      if (hourRecordings.length < 5) continue; // Need minimum data

      const valences = hourRecordings.map((r) => r.valence);
      const arousals = hourRecordings.map((r) => r.arousal);
      const avgValence = mean(valences);
      const avgArousal = mean(arousals);

      // Check for low valence pattern
      if (avgValence < 0.4) {
        patterns.push({
          type: 'low_valence_time',
          description: `More negative emotions around ${parseInt(hour)}:00`,
          hour: parseInt(hour),
          confidence: 0.8,
          suggestions: [
            'Schedule important tasks for other times',
            'Take breaks during this time',
            'Consider self-care activities',
          ],
        });
      }

      // Check for high arousal pattern
      if (avgArousal > 0.7) {
        patterns.push({
          type: 'high_arousal_time',
          description: `High energy and intensity around ${parseInt(hour)}:00`,
          hour: parseInt(hour),
          confidence: 0.8,
          suggestions: [
            'Good time for focused work',
            'Consider exercise or physical activity',
            'Channel energy into creative tasks',
          ],
        });
      }

      // Check for positive pattern
      if (avgValence > 0.7) {
        patterns.push({
          type: 'high_valence_time',
          description: `More positive emotions around ${parseInt(hour)}:00`,
          hour: parseInt(hour),
          confidence: 0.8,
          suggestions: [
            'Schedule important activities during this time',
            'Social interactions tend to go well',
            'Good time for challenging tasks',
          ],
        });
      }
    }

    return patterns;
  }

  /**
   * Analyze patterns by day of week
   */
  private analyzeByDayOfWeek(recordings: EmotionRecording[]): EmotionPattern[] {
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const byDay = groupBy(recordings, (r) => DAYS[new Date(r.timestamp).getDay()]);
    const patterns: EmotionPattern[] = [];

    for (const [day, dayRecordings] of Object.entries(byDay)) {
      if (dayRecordings.length < 5) continue; // Need minimum data

      const valences = dayRecordings.map((r) => r.valence);
      const avgValence = mean(valences);

      // Check for low valence pattern
      if (avgValence < 0.4) {
        patterns.push({
          type: 'low_valence_day',
          description: `More negative emotions on ${day}`,
          dayOfWeek: day,
          confidence: 0.75,
          suggestions: [
            'Plan lighter activities for this day',
            'Schedule extra self-care',
            'Consider what makes this day challenging',
          ],
        });
      }

      // Check for positive pattern
      if (avgValence > 0.7) {
        patterns.push({
          type: 'high_valence_day',
          description: `More positive emotions on ${day}`,
          dayOfWeek: day,
          confidence: 0.75,
          suggestions: [
            'Leverage this day for important tasks',
            'Schedule social activities',
            'Note what makes this day good',
          ],
        });
      }
    }

    return patterns;
  }

  /**
   * Analyze trends over time
   */
  private analyzeTrends(recordings: EmotionRecording[]): EmotionPattern[] {
    const patterns: EmotionPattern[] = [];

    // Sort by timestamp
    const sorted = [...recordings].sort((a, b) => a.timestamp - b.timestamp);

    if (sorted.length < 10) {
      return patterns; // Need more data for trend analysis
    }

    // Split into first half and second half
    const mid = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);

    const firstValences = firstHalf.map((r) => r.valence);
    const secondValences = secondHalf.map((r) => r.valence);
    const firstAvgValence = mean(firstValences);
    const secondAvgValence = mean(secondValences);

    // Check for improving trend
    if (secondAvgValence > firstAvgValence + 0.1) {
      patterns.push({
        type: 'improving_mood',
        description: 'Your mood has been improving over time',
        confidence: 0.7,
        suggestions: [
          "Keep doing what you're doing!",
          'Track what is working well',
          'Share your success strategies',
        ],
      });
    }

    // Check for declining trend
    if (secondAvgValence < firstAvgValence - 0.1) {
      patterns.push({
        type: 'declining_mood',
        description: 'Your mood has been declining over time',
        confidence: 0.7,
        suggestions: [
          'Consider what might be causing this',
          'Take time for self-care',
          'Reach out for support if needed',
        ],
      });
    }

    // Check for stability
    if (Math.abs(secondAvgValence - firstAvgValence) < 0.05) {
      patterns.push({
        type: 'stable_mood',
        description: 'Your mood has been stable over time',
        confidence: 0.7,
        suggestions: [
          'Consistency is valuable',
          'Look for patterns in your stable mood',
          'Consider if you want more variation',
        ],
      });
    }

    return patterns;
  }

  /**
   * Analyze patterns by conversation context
   */
  private analyzeByContext(recordings: EmotionRecording[]): EmotionPattern[] {
    const patterns: EmotionPattern[] = [];

    // Group by conversation
    const byConversation = groupBy(recordings, (r) => r.conversationId || 'unknown');

    for (const [conversationId, conversationRecordings] of Object.entries(byConversation)) {
      if (conversationRecordings.length < 3) continue; // Need minimum data
      if (conversationId === 'unknown') continue; // Skip unknown conversations

      const valences = conversationRecordings.map((r) => r.valence);
      const avgValence = mean(valences);

      // Check for consistently positive conversations
      if (avgValence > 0.7) {
        patterns.push({
          type: 'positive_conversation',
          description: `Positive emotional pattern in conversation`,
          confidence: 0.7,
          suggestions: [
            'This conversation context works well for you',
            'Consider what makes it positive',
          ],
        });
      }

      // Check for consistently negative conversations
      if (avgValence < 0.4) {
        patterns.push({
          type: 'negative_conversation',
          description: `Negative emotional pattern in conversation`,
          confidence: 0.7,
          suggestions: [
            'This conversation may be stressful',
            'Consider setting boundaries',
            'Think about what triggers negative emotions',
          ],
        });
      }
    }

    return patterns;
  }

  /**
   * Get emotion heatmap data
   */
  async getHeatmapData(
    recordings: EmotionRecording[]
  ): Promise<Record<string, Record<number, { valence: number; count: number }>>> {
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data: Record<string, Record<number, { valence: number; count: number }>> = {
      Sun: {},
      Mon: {},
      Tue: {},
      Wed: {},
      Thu: {},
      Fri: {},
      Sat: {},
    };

    // Initialize all hours
    for (const day of DAYS) {
      for (let hour = 0; hour < 24; hour++) {
        data[day][hour] = { valence: 0, count: 0 };
      }
    }

    // Aggregate data
    for (const recording of recordings) {
      const date = new Date(recording.timestamp);
      const day = DAYS[date.getDay()];
      const hour = date.getHours();

      data[day][hour].valence += recording.valence;
      data[day][hour].count += 1;
    }

    // Compute averages
    for (const day of DAYS) {
      for (let hour = 0; hour < 24; hour++) {
        const { valence, count } = data[day][hour];
        if (count > 0) {
          data[day][hour].valence = valence / count;
        }
      }
    }

    return data;
  }

  /**
   * Get aggregated statistics by time period
   */
  async getAggregatedStats(
    recordings: EmotionRecording[],
    period: 'hour' | 'day' | 'week'
  ): Promise<Array<{ timestamp: number; stats: EmotionStatistics }>> {
    const grouped: Record<number, EmotionRecording[]> = {};

    for (const recording of recordings) {
      const date = new Date(recording.timestamp);
      let key: number;

      if (period === 'hour') {
        key = Math.floor(recording.timestamp / (1000 * 60 * 60)); // Hour buckets
      } else if (period === 'day') {
        key = Math.floor(recording.timestamp / (1000 * 60 * 60 * 24)); // Day buckets
      } else {
        key = Math.floor(recording.timestamp / (1000 * 60 * 60 * 24 * 7)); // Week buckets
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(recording);
    }

    // Compute stats for each period
    const result = await Promise.all(
      Object.entries(grouped).map(async ([timestamp, periodRecordings]) => ({
        timestamp: parseInt(timestamp) * (period === 'hour' ? 1000 * 60 * 60 : period === 'day' ? 1000 * 60 * 60 * 24 : 1000 * 60 * 60 * 24 * 7),
        stats: await this.computeStatistics(periodRecordings),
      }))
    );

    return result.sort((a, b) => a.timestamp - b.timestamp);
  }
}
