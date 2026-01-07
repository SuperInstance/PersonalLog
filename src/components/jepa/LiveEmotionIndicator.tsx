/**
 * JEPA Live Emotion Indicator
 *
 * Real-time emotion display component with smooth animations,
 * pulse effects, and confidence indicators for live recording.
 *
 * @module components/jepa/LiveEmotionIndicator
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EmotionResult, EmotionCategory } from '@/lib/jepa/types';
import { getEmotionColor, getEmotionGradient, formatVADScore } from '@/lib/jepa/emotion-chart-utils';
import { Activity, Mic, MicOff, Signal } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface LiveEmotionIndicatorProps {
  /** Current emotion result */
  emotion: EmotionResult | null;

  /** Is currently recording */
  isRecording: boolean;

  /** Show detailed breakdown */
  showDetails?: boolean;

  /** Size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Dark mode */
  darkMode?: boolean;

  /** Custom CSS classes */
  className?: string;

  /** Animation duration in ms */
  animationDuration?: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LiveEmotionIndicator({
  emotion,
  isRecording,
  showDetails = true,
  size = 'md',
  darkMode = false,
  className = '',
  animationDuration = 500,
}: LiveEmotionIndicatorProps) {
  const [previousEmotion, setPreviousEmotion] = useState<EmotionCategory | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Animation on emotion change
  useEffect(() => {
    if (emotion && emotion.emotion !== previousEmotion) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), animationDuration);
      setPreviousEmotion(emotion.emotion);
    }
  }, [emotion, previousEmotion, animationDuration]);

  // Pulse animation during recording
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setPulsePhase((prev) => (prev + 1) % 3);
    }, 500);

    return () => clearInterval(interval);
  }, [isRecording]);

  // Size configurations
  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          container: 'p-3',
          icon: 'w-8 h-8',
          text: 'text-base',
          subtext: 'text-xs',
          meterHeight: 'h-1',
        };
      case 'lg':
        return {
          container: 'p-6',
          icon: 'w-16 h-16',
          text: 'text-3xl',
          subtext: 'text-sm',
          meterHeight: 'h-3',
        };
      default:
        return {
          container: 'p-4',
          icon: 'w-12 h-12',
          text: 'text-xl',
          subtext: 'text-xs',
          meterHeight: 'h-2',
        };
    }
  }, [size]);

  // Emotion color and gradient
  const emotionColor = emotion ? getEmotionColor(emotion.emotion, darkMode) : '#9ca3af';
  const emotionGradient = emotion ? getEmotionGradient(emotion.emotion, darkMode) : 'transparent';

  // Get emotion description
  const getEmotionDescription = (emotionCategory: EmotionCategory): string => {
    const descriptions: Record<EmotionCategory, string> = {
      excited: 'High energy & positive',
      happy: 'Positive & pleasant',
      calm: 'Peaceful & relaxed',
      relaxed: 'At ease & comfortable',
      neutral: 'Balanced & steady',
      bored: 'Low energy & unengaged',
      sad: 'Low energy & negative',
      angry: 'High energy & negative',
      anxious: 'Worried & uneasy',
      tense: 'Stressed & tight',
    };
    return descriptions[emotionCategory] || '';
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div
      className={`live-emotion-indicator ${className} transition-all duration-300 ${
        isAnimating ? 'scale-105' : 'scale-100'
      }`}
    >
      <div
        className={`${sizeConfig.container} rounded-xl border transition-all duration-300`}
        style={{
          background: isRecording ? emotionGradient : 'transparent',
          borderColor: emotionColor,
          boxShadow: isRecording && emotion ? `0 0 20px ${emotionColor}40` : 'none',
        }}
      >
        {/* Header with recording status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isRecording ? (
              <>
                <div className={`w-2 h-2 rounded-full bg-red-500 animate-pulse`} />
                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                  Recording
                </span>
              </>
            ) : (
              <>
                <div className={`w-2 h-2 rounded-full bg-slate-400`} />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Idle
                </span>
              </>
            )}
          </div>

          {/* Signal strength indicator */}
          {emotion && isRecording && (
            <div className="flex items-center gap-1">
              <Signal
                className="w-4 h-4"
                style={{
                  color: emotionColor,
                  opacity: emotion.confidence,
                }}
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {Math.round(emotion.confidence * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Main emotion display */}
        <div className="flex items-center gap-4">
          {/* Icon with pulse animation */}
          <div className="relative">
            {/* Pulse rings */}
            {isRecording && emotion && pulsePhase > 0 && (
              <>
                <div
                  className={`absolute inset-0 rounded-full opacity-20`}
                  style={{
                    background: emotionColor,
                    transform: `scale(${1 + pulsePhase * 0.3})`,
                    transition: 'transform 0.5s ease-out',
                  }}
                />
                {pulsePhase > 1 && (
                  <div
                    className={`absolute inset-0 rounded-full opacity-10`}
                    style={{
                      background: emotionColor,
                      transform: `scale(${1 + (pulsePhase - 1) * 0.3})`,
                      transition: 'transform 0.5s ease-out',
                    }}
                  />
                )}
              </>
            )}

            {/* Main icon */}
            <div
              className={`${sizeConfig.icon} rounded-full flex items-center justify-center transition-all duration-300`}
              style={{
                backgroundColor: emotion ? emotionColor : '#9ca3af',
                transform: isAnimating ? 'scale(1.1) rotate(5deg)' : 'scale(1) rotate(0deg)',
              }}
            >
              {isRecording ? (
                <Mic className="w-1/2 h-1/2 text-white" />
              ) : (
                <MicOff className="w-1/2 h-1/2 text-white" />
              )}
            </div>
          </div>

          {/* Emotion label and description */}
          <div className="flex-1">
            {emotion ? (
              <>
                <div
                  className={`${sizeConfig.text} font-bold capitalize transition-all duration-300`}
                  style={{ color: emotionColor }}
                >
                  {emotion.emotion}
                </div>
                <div className={`${sizeConfig.subtext} text-slate-600 dark:text-slate-400 mt-0.5`}>
                  {getEmotionDescription(emotion.emotion)}
                </div>
              </>
            ) : (
              <>
                <div className={`${sizeConfig.text} font-bold text-slate-600 dark:text-slate-400`}>
                  No emotion
                </div>
                <div className={`${sizeConfig.subtext} text-slate-500 dark:text-slate-500 mt-0.5`}>
                  Waiting for audio...
                </div>
              </>
            )}
          </div>
        </div>

        {/* VAD Meters */}
        {showDetails && emotion && (
          <div className="mt-4 space-y-2">
            {/* Valence Meter */}
            <VADMeter
              label="Valence"
              value={emotion.valence}
              color="#22c55e"
              height={sizeConfig.meterHeight}
              darkMode={darkMode}
            />

            {/* Arousal Meter */}
            <VADMeter
              label="Arousal"
              value={emotion.arousal}
              color="#f59e0b"
              height={sizeConfig.meterHeight}
              darkMode={darkMode}
            />

            {/* Dominance Meter */}
            <VADMeter
              label="Dominance"
              value={emotion.dominance}
              color="#3b82f6"
              height={sizeConfig.meterHeight}
              darkMode={darkMode}
            />
          </div>
        )}

        {/* Confidence meter */}
        {showDetails && emotion && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
              <span>Confidence</span>
              <span>{formatVADScore(emotion.confidence)}</span>
            </div>
            <div className={`w-full ${sizeConfig.meterHeight} bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden`}>
              <div
                className={`h-full transition-all duration-300`}
                style={{
                  width: `${emotion.confidence * 100}%`,
                  backgroundColor: emotionColor,
                }}
              />
            </div>
          </div>
        )}

        {/* Activity indicator */}
        {isRecording && (
          <div className="mt-3 flex items-center gap-2">
            <Activity className="w-3 h-3 text-green-500 animate-pulse" />
            <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 animate-shimmer" style={{ animation: 'shimmer 1s infinite' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface VADMeterProps {
  label: string;
  value: number;
  color: string;
  height: string;
  darkMode: boolean;
}

function VADMeter({ label, value, color, height, darkMode }: VADMeterProps) {
  const percentage = value * 100;

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
        <span>{label}</span>
        <span>{percentage.toFixed(0)}%</span>
      </div>
      <div className={`w-full ${height} bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden`}>
        <div
          className={`h-full transition-all duration-300 ease-out`}
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// CSS ANIMATIONS
// ============================================================================

const styles = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  .animate-shimmer {
    animation: shimmer 1s infinite;
  }

  .animate-shimmer::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    animation: shimmer 1s infinite;
  }
`;

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('live-emotion-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'live-emotion-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

LiveEmotionIndicator.displayName = 'LiveEmotionIndicator';
