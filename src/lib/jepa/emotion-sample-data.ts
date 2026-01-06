/**
 * Sample Emotion Data Generator
 *
 * Generates realistic emotion data for testing the emotion trends dashboard.
 */

import { EmotionRecording, storeEmotion } from './emotion-storage';

const EMOTION_TYPES = [
  'happy',
  'excited',
  'joyful',
  'content',
  'calm',
  'grateful',
  'proud',
  'relieved',
  'curious',
  'surprised',
  'confused',
  'sad',
  'disappointed',
  'worried',
  'angry',
  'frustrated',
  'irritated',
  'neutral',
];

/**
 * Generate a random emotion recording with realistic patterns
 */
export function generateRandomEmotion(timestamp?: number): EmotionRecording {
  const now = timestamp || Date.now();
  const hour = new Date(now).getHours();
  const dayOfWeek = new Date(now).getDay();

  // Time-of-day patterns
  let baseValence = 0.5;
  let baseArousal = 0.5;

  // Morning (6-11): Higher valence, moderate arousal
  if (hour >= 6 && hour < 11) {
    baseValence = 0.65;
    baseArousal = 0.55;
  }
  // Mid-day (11-14): Moderate valence, higher arousal
  else if (hour >= 11 && hour < 14) {
    baseValence = 0.55;
    baseArousal = 0.65;
  }
  // Afternoon (14-17): Lower valence (post-lunch dip), lower arousal
  else if (hour >= 14 && hour < 17) {
    baseValence = 0.45;
    baseArousal = 0.45;
  }
  // Evening (17-21): Higher valence, variable arousal
  else if (hour >= 17 && hour < 21) {
    baseValence = 0.6;
    baseArousal = 0.6;
  }
  // Night (21-6): Lower valence, low arousal
  else {
    baseValence = 0.4;
    baseArousal = 0.35;
  }

  // Day-of-week patterns
  // Monday: Lower valence (start of work week)
  if (dayOfWeek === 1) {
    baseValence -= 0.1;
  }
  // Friday: Higher valence (end of work week)
  else if (dayOfWeek === 5) {
    baseValence += 0.15;
  }
  // Saturday/Saturday: Higher valence (weekend)
  else if (dayOfWeek === 0 || dayOfWeek === 6) {
    baseValence += 0.2;
  }

  // Add randomness
  const valence = Math.max(0, Math.min(1, baseValence + (Math.random() - 0.5) * 0.3));
  const arousal = Math.max(0, Math.min(1, baseArousal + (Math.random() - 0.5) * 0.3));
  const dominance = Math.random() * 0.5 + 0.25;

  // Determine emotion based on VAD values
  const emotion = determineEmotion(valence, arousal, dominance);
  const confidence = Math.random() * 0.3 + 0.7;

  return {
    id: `emotion_${now}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: now,
    duration: Math.random() * 300 + 30, // 30-330 seconds
    valence,
    arousal,
    dominance,
    emotion,
    confidence,
    language: 'en',
    conversationId: `conv_${Math.floor(Math.random() * 10)}`,
    hasAudio: Math.random() > 0.7, // 30% have audio
  };
}

/**
 * Determine emotion type from VAD values
 */
function determineEmotion(
  valence: number,
  arousal: number,
  dominance: number
): string {
  // High valence, high arousal
  if (valence > 0.7 && arousal > 0.7) {
    if (dominance > 0.6) return 'excited';
    return 'joyful';
  }

  // High valence, low arousal
  if (valence > 0.7 && arousal < 0.4) {
    if (dominance > 0.6) return 'proud';
    return 'calm';
  }

  // Medium valence
  if (valence > 0.4 && valence <= 0.7) {
    if (arousal > 0.6) return 'curious';
    if (dominance > 0.6) return 'grateful';
    return 'content';
  }

  // Low valence, high arousal
  if (valence < 0.4 && arousal > 0.6) {
    if (dominance > 0.6) return 'angry';
    return 'frustrated';
  }

  // Low valence, low arousal
  if (valence < 0.4) {
    if (arousal < 0.3) return 'sad';
    return 'worried';
  }

  // Default
  return 'neutral';
}

/**
 * Generate sample emotions for a time range
 */
export function generateSampleEmotions(
  startDate: Date,
  endDate: Date,
  recordingsPerDay: number = 10
): EmotionRecording[] {
  const emotions: EmotionRecording[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs);

  for (let day = 0; day < totalDays; day++) {
    const dayStart = startDate.getTime() + day * dayMs;

    for (let i = 0; i < recordingsPerDay; i++) {
      // Random time throughout the day
      const randomOffset = Math.random() * dayMs;
      const timestamp = dayStart + randomOffset;

      emotions.push(generateRandomEmotion(timestamp));
    }
  }

  return emotions.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Generate and store sample emotions
 */
export async function generateAndStoreSampleEmotions(
  startDate: Date,
  endDate: Date,
  recordingsPerDay: number = 10
): Promise<void> {
  const emotions = generateSampleEmotions(startDate, endDate, recordingsPerDay);

  // Store in batches
  const batchSize = 50;
  for (let i = 0; i < emotions.length; i += batchSize) {
    const batch = emotions.slice(i, i + batchSize);
    await Promise.all(batch.map((emotion) => storeEmotion(emotion)));
  }
}

/**
 * Generate quick sample data for the last 7 days
 */
export async function generateQuickSampleData(): Promise<void> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  await generateAndStoreSampleEmotions(startDate, endDate, 8); // 8 recordings per day
}

/**
 * Generate sample data for different scenarios
 */

export async function generateImprovingMoodScenario(): Promise<void> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000); // 2 weeks
  const emotions: EmotionRecording[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = 14;

  for (let day = 0; day < totalDays; day++) {
    const dayStart = startDate.getTime() + day * dayMs;

    // Gradually improving mood
    const improvementFactor = day / totalDays; // 0 to 1

    for (let i = 0; i < 8; i++) {
      const timestamp = dayStart + (i / 8) * dayMs;
      const baseValence = 0.3 + improvementFactor * 0.5; // 0.3 to 0.8
      const valence = Math.max(0, Math.min(1, baseValence + (Math.random() - 0.5) * 0.2));
      const arousal = Math.random() * 0.4 + 0.3;
      const dominance = Math.random() * 0.5 + 0.25;
      const emotion = determineEmotion(valence, arousal, dominance);

      emotions.push({
        id: `emotion_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp,
        duration: Math.random() * 300 + 30,
        valence,
        arousal,
        dominance,
        emotion,
        confidence: Math.random() * 0.3 + 0.7,
        language: 'en',
        hasAudio: false,
      });
    }
  }

  // Store all emotions
  await Promise.all(emotions.map((emotion) => storeEmotion(emotion)));
}

export async function generateWeeklyPatternScenario(): Promise<void> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 28 * 24 * 60 * 60 * 1000); // 4 weeks
  const emotions: EmotionRecording[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = 28;

  for (let day = 0; day < totalDays; day++) {
    const dayStart = startDate.getTime() + day * dayMs;
    const dayOfWeek = new Date(dayStart).getDay();

    // Weekend pattern: higher valence
    let baseValence = dayOfWeek === 0 || dayOfWeek === 6 ? 0.7 : 0.5;

    // Monday blues
    if (dayOfWeek === 1) {
      baseValence = 0.35;
    }

    for (let i = 0; i < 8; i++) {
      const timestamp = dayStart + (i / 8) * dayMs;
      const valence = Math.max(0, Math.min(1, baseValence + (Math.random() - 0.5) * 0.2));
      const arousal = Math.random() * 0.4 + 0.3;
      const dominance = Math.random() * 0.5 + 0.25;
      const emotion = determineEmotion(valence, arousal, dominance);

      emotions.push({
        id: `emotion_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp,
        duration: Math.random() * 300 + 30,
        valence,
        arousal,
        dominance,
        emotion,
        confidence: Math.random() * 0.3 + 0.7,
        language: 'en',
        hasAudio: false,
      });
    }
  }

  // Store all emotions
  await Promise.all(emotions.map((emotion) => storeEmotion(emotion)));
}

export async function generateTimeOfDayPatternScenario(): Promise<void> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000); // 2 weeks
  const emotions: EmotionRecording[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = 14;

  for (let day = 0; day < totalDays; day++) {
    const dayStart = startDate.getTime() + day * dayMs;

    for (let hour = 0; hour < 24; hour++) {
      const timestamp = dayStart + hour * 60 * 60 * 1000;

      // Time-of-day pattern
      let baseValence = 0.5;
      let baseArousal = 0.5;

      if (hour >= 6 && hour < 11) {
        baseValence = 0.7;
        baseArousal = 0.6;
      } else if (hour >= 11 && hour < 14) {
        baseValence = 0.6;
        baseArousal = 0.7;
      } else if (hour >= 14 && hour < 17) {
        baseValence = 0.4;
        baseArousal = 0.4;
      } else if (hour >= 17 && hour < 21) {
        baseValence = 0.65;
        baseArousal = 0.6;
      } else {
        baseValence = 0.35;
        baseArousal = 0.3;
      }

      const valence = Math.max(0, Math.min(1, baseValence + (Math.random() - 0.5) * 0.15));
      const arousal = Math.max(0, Math.min(1, baseArousal + (Math.random() - 0.5) * 0.15));
      const dominance = Math.random() * 0.5 + 0.25;
      const emotion = determineEmotion(valence, arousal, dominance);

      emotions.push({
        id: `emotion_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp,
        duration: Math.random() * 300 + 30,
        valence,
        arousal,
        dominance,
        emotion,
        confidence: Math.random() * 0.3 + 0.7,
        language: 'en',
        hasAudio: false,
      });
    }
  }

  // Store all emotions
  await Promise.all(emotions.map((emotion) => storeEmotion(emotion)));
}

/**
 * Clear all sample data
 */
export async function clearSampleEmotions(): Promise<void> {
  const { deleteAllEmotions } = await import('./emotion-storage');
  await deleteAllEmotions();
}
