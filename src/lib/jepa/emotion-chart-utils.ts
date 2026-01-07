/**
 * JEPA Emotion Chart Utilities
 *
 * Utility functions for emotion visualization and chart rendering.
 * Provides color palettes, data transformations, and chart helpers.
 */

import type { EmotionResult, EmotionCategory } from './types';
import type { EmotionRecording } from './emotion-storage';

// ============================================================================
// COLOR PALETTES
// ============================================================================

/**
 * Colorblind-friendly palette for emotions (Okabe-Ito inspired)
 * High contrast, distinguishable for most color vision deficiencies
 */
export const EMOTION_COLORS: Record<EmotionCategory, string> = {
  excited: '#E69F00',      // Orange (high visibility)
  happy: '#009E73',        // Green-blue (distinct from red/green)
  calm: '#56B4E9',         // Sky blue (calm, clear)
  relaxed: '#0072B2',      // Blue (distinct, readable)
  neutral: '#8F8F8F',      // Gray (neutral)
  bored: '#CC79A7',        // Pink (distinct, visible)
  sad: '#949494',          // Dark gray (melancholy)
  angry: '#D55E00',        // Vermilion (red-orange, distinguishable)
  anxious: '#F0E442',      // Yellow (high luminance)
  tense: '#882255',        // Burgundy (dark red-purple)
};

/**
 * Alternative high-contrast palette for dark mode
 */
export const EMOTION_COLORS_DARK: Record<EmotionCategory, string> = {
  excited: '#FFB347',      // Light orange
  happy: '#4DB6AC',        // Teal
  calm: '#64B5F6',         // Light blue
  relaxed: '#42A5F5',      // Bright blue
  neutral: '#B0BEC5',      // Light gray
  bored: '#F48FB1',        // Light pink
  sad: '#78909C',          // Blue-gray
  angry: '#FF7043',        // Coral
  anxious: '#FFF176',      // Light yellow
  tense: '#AD1457',        // Magenta
};

/**
 * VAD dimension colors
 */
export const VAD_COLORS = {
  valence: '#009E73',      // Green for positive
  arousal: '#E69F00',      // Orange for energy
  dominance: '#0072B2',    // Blue for control
};

/**
 * Get color for emotion category
 */
export function getEmotionColor(
  emotion: EmotionCategory,
  darkMode = false
): string {
  const palette = darkMode ? EMOTION_COLORS_DARK : EMOTION_COLORS;
  return palette[emotion] || palette.neutral;
}

/**
 * Get gradient for emotion intensity
 */
export function getEmotionGradient(
  emotion: EmotionCategory,
  darkMode = false
): string {
  const baseColor = getEmotionColor(emotion, darkMode);
  return `linear-gradient(135deg, ${baseColor}88, ${baseColor}22)`;
}

// ============================================================================
// DATA TRANSFORMATIONS
// ============================================================================

/**
 * Convert emotion recordings to chart data points
 */
export interface ChartDataPoint {
  x: number;
  y: number;
  valence: number;
  arousal: number;
  dominance: number;
  timestamp: number;
  emotion: EmotionCategory;
  confidence: number;
}

export function recordingsToChartData(
  recordings: EmotionRecording[]
): ChartDataPoint[] {
  return recordings
    .map((r) => ({
      x: r.timestamp,
      y: r.valence,
      valence: r.valence,
      arousal: r.arousal,
      dominance: r.dominance,
      timestamp: r.timestamp,
      emotion: r.emotion as EmotionCategory,
      confidence: r.confidence,
    }))
    .sort((a, b) => a.x - b.x);
}

/**
 * Group emotions by time period
 */
export interface TimeBucket {
  timestamp: number;
  count: number;
  avgValence: number;
  avgArousal: number;
  avgDominance: number;
  emotions: Record<EmotionCategory, number>;
}

export function groupEmotionsByPeriod(
  recordings: EmotionRecording[],
  period: 'hour' | 'day' | 'week'
): TimeBucket[] {
  const buckets: Record<number, EmotionRecording[]> = {};

  for (const recording of recordings) {
    const date = new Date(recording.timestamp);
    let key: number;

    if (period === 'hour') {
      key = Math.floor(recording.timestamp / (1000 * 60 * 60));
    } else if (period === 'day') {
      key = Math.floor(recording.timestamp / (1000 * 60 * 60 * 24));
    } else {
      key = Math.floor(recording.timestamp / (1000 * 60 * 60 * 24 * 7));
    }

    if (!buckets[key]) {
      buckets[key] = [];
    }
    buckets[key].push(recording);
  }

  return Object.entries(buckets).map(([timestampKey, recs]) => {
    const timestamp =
      parseInt(timestampKey) *
      (period === 'hour'
        ? 1000 * 60 * 60
        : period === 'day'
        ? 1000 * 60 * 60 * 24
        : 1000 * 60 * 60 * 24 * 7);

    const emotions: Record<string, number> = {};
    for (const rec of recs) {
      emotions[rec.emotion] = (emotions[rec.emotion] || 0) + 1;
    }

    return {
      timestamp,
      count: recs.length,
      avgValence: recs.reduce((sum, r) => sum + r.valence, 0) / recs.length,
      avgArousal: recs.reduce((sum, r) => sum + r.arousal, 0) / recs.length,
      avgDominance: recs.reduce((sum, r) => sum + r.dominance, 0) / recs.length,
      emotions: emotions as Record<EmotionCategory, number>,
    };
  });
}

/**
 * Calculate emotion distribution for radar chart
 */
export interface RadarData {
  emotion: EmotionCategory;
  value: number;
  percentage: number;
}

export function calculateEmotionDistribution(
  recordings: EmotionRecording[]
): RadarData[] {
  const counts: Record<string, number> = {};

  for (const rec of recordings) {
    counts[rec.emotion] = (counts[rec.emotion] || 0) + 1;
  }

  const total = recordings.length;
  return Object.entries(counts)
    .map(([emotion, count]) => ({
      emotion: emotion as EmotionCategory,
      value: count,
      percentage: (count / total) * 100,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Smooth data using moving average
 */
export function smoothData(
  data: number[],
  windowSize = 5
): number[] {
  if (data.length < windowSize) return data;

  const smoothed: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(data.length, i + Math.floor(windowSize / 2) + 1);
    const window = data.slice(start, end);
    smoothed.push(window.reduce((sum, v) => sum + v, 0) / window.length);
  }

  return smoothed;
}

/**
 * Find emotion transitions (changes between emotion categories)
 */
export interface EmotionTransition {
  timestamp: number;
  fromEmotion: EmotionCategory;
  toEmotion: EmotionCategory;
  confidence: number;
}

export function findTransitions(
  recordings: EmotionRecording[]
): EmotionTransition[] {
  const sorted = [...recordings].sort((a, b) => a.timestamp - b.timestamp);
  const transitions: EmotionTransition[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (prev.emotion !== curr.emotion) {
      transitions.push({
        timestamp: curr.timestamp,
        fromEmotion: prev.emotion as EmotionCategory,
        toEmotion: curr.emotion as EmotionCategory,
        confidence: curr.confidence,
      });
    }
  }

  return transitions;
}

// ============================================================================
// CHART RENDERING HELPERS
// ============================================================================

/**
 * Scale value from input range to output range
 */
export function scaleValue(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(
  timestamp: number,
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  const date = new Date(timestamp);

  switch (format) {
    case 'short':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    case 'long':
      return date.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    default:
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
  }
}

/**
 * Format VAD score for display
 */
export function formatVADScore(score: number): string {
  return (score * 100).toFixed(0) + '%';
}

/**
 * Get emotion description
 */
export function getEmotionDescription(emotion: EmotionCategory): string {
  const descriptions: Record<EmotionCategory, string> = {
    excited: 'High energy, positive emotion',
    happy: 'Positive, pleasant emotion',
    calm: 'Relaxed, peaceful state',
    relaxed: 'At ease, comfortable',
    neutral: 'Balanced, middle ground',
    bored: 'Low energy, unengaged',
    sad: 'Negative, low energy',
    angry: 'Negative, high energy',
    anxious: 'Worried, uneasy feeling',
    tense: 'Stressed, tight feeling',
  };

  return descriptions[emotion] || 'Unknown emotion';
}

/**
 * Get emotion quadrant in VAD space
 */
export interface VADQuadrant {
  quadrant: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  description: string;
  typicalEmotions: EmotionCategory[];
}

export function getVADQuadrant(
  valence: number,
  arousal: number
): VADQuadrant {
  const highValence = valence > 0.5;
  const highArousal = arousal > 0.5;

  if (highValence && highArousal) {
    return {
      quadrant: 'Q1',
      description: 'High energy, positive',
      typicalEmotions: ['excited', 'happy'],
    };
  } else if (highValence && !highArousal) {
    return {
      quadrant: 'Q2',
      description: 'Low energy, positive',
      typicalEmotions: ['calm', 'relaxed'],
    };
  } else if (!highValence && !highArousal) {
    return {
      quadrant: 'Q3',
      description: 'Low energy, negative',
      typicalEmotions: ['sad', 'bored'],
    };
  } else {
    return {
      quadrant: 'Q4',
      description: 'High energy, negative',
      typicalEmotions: ['angry', 'anxious', 'tense'],
    };
  }
}

// ============================================================================
// ANIMATION HELPERS
// ============================================================================

/**
 * Easing function for smooth animations
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Animate value from start to end over duration
 */
export function animateValue(
  start: number,
  end: number,
  duration: number,
  callback: (value: number) => void
): void {
  const startTime = performance.now();

  function update(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);
    const value = start + (end - start) * eased;

    callback(value);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// ============================================================================
// ACCESSIBILITY
// ============================================================================

/**
 * Get accessible color contrast ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  // Simplified contrast calculation
  // In production, use full WCAG calculation
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);

  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate relative luminance (simplified)
 */
function getLuminance(color: string): number {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  const linearR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const linearG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const linearB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
}

/**
 * Generate chart data URL for export
 */
export function chartToDataURL(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpeg' = 'png',
  quality = 1.0
): string {
  return canvas.toDataURL(`image/${format}`, quality);
}

/**
 * Download chart as image
 */
export function downloadChart(
  canvas: HTMLCanvasElement,
  filename: string
): void {
  const dataURL = chartToDataURL(canvas);
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  link.click();
}
