/**
 * JEPA Enhanced Emotion Timeline
 *
 * Advanced timeline visualization with smooth animations, zoom,
 * annotations, and interactive features.
 *
 * @module components/jepa/EmotionTimelineEnhanced
 */

'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { EmotionResult, EmotionCategory } from '@/lib/jepa/types';
import { EmotionRecording } from '@/lib/jepa/emotion-storage';
import {
  getEmotionColor,
  getEmotionGradient,
  findTransitions,
  type EmotionTransition,
} from '@/lib/jepa/emotion-chart-utils';
import { ZoomIn, ZoomOut, Maximize2, Download, Tag } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface EmotionTimelineEnhancedProps {
  /** Array of emotion data points over time */
  emotions: EmotionDataPoint[];

  /** Called when user clicks on a specific time */
  onSeek?: (time: number) => void;

  /** Whether seeking is disabled */
  disabled?: boolean;

  /** Custom CSS classes */
  className?: string;

  /** Height of the timeline in pixels */
  height?: number;

  /** Show emotion labels on timeline */
  showLabels?: boolean;

  /** Show confidence scores */
  showConfidence?: boolean;

  /** Enable zoom feature */
  enableZoom?: boolean;

  /** Enable annotations */
  enableAnnotations?: boolean;

  /** Dark mode */
  darkMode?: boolean;
}

export interface EmotionDataPoint {
  /** Time in seconds */
  time: number;

  /** Emotion analysis result */
  emotion: EmotionResult;

  /** Optional label (e.g., transcript segment text) */
  label?: string;
}

export interface EmotionAnnotation {
  /** Time in seconds */
  time: number;

  /** Annotation text */
  text: string;

  /** Annotation color */
  color?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EmotionTimelineEnhanced({
  emotions,
  onSeek,
  disabled = false,
  className = '',
  height = 250,
  showLabels = true,
  showConfidence = false,
  enableZoom = true,
  enableAnnotations = true,
  darkMode = false,
}: EmotionTimelineEnhancedProps) {
  // State
  const [hoveredPoint, setHoveredPoint] = useState<EmotionDataPoint | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [annotations, setAnnotations] = useState<EmotionAnnotation[]>([]);
  const [showAnnotationInput, setShowAnnotationInput] = useState(false);
  const [annotationTime, setAnnotationTime] = useState(0);
  const [annotationText, setAnnotationText] = useState('');

  // Refs
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate timeline boundaries
  const { minTime, maxTime, duration } = useMemo(() => {
    if (emotions.length === 0) {
      return { minTime: 0, maxTime: 1, duration: 1 };
    }

    const times = emotions.map((e) => e.time);
    const min = Math.min(...times);
    const max = Math.max(...times);

    return {
      minTime: min,
      maxTime: max,
      duration: max - min || 1,
    };
  }, [emotions]);

  // Find transitions for smooth animations
  const transitions = useMemo(() => {
    const recordings: EmotionRecording[] = emotions.map((e, i) => ({
      id: `emotion_${i}`,
      timestamp: Date.now() + e.time * 1000,
      duration: 1,
      valence: e.emotion.valence,
      arousal: e.emotion.arousal,
      dominance: e.emotion.dominance,
      emotion: e.emotion.emotion,
      confidence: e.emotion.confidence,
      language: 'en',
      hasAudio: false,
    }));

    return findTransitions(recordings);
  }, [emotions]);

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (disabled) return;

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Handle panning
      if (isDragging && enableZoom) {
        const deltaX = e.clientX - dragStart;
        const maxPan = duration * (zoomLevel - 1) / 2;
        const newPan = Math.max(-maxPan, Math.min(maxPan, panOffset + deltaX / 100));
        setPanOffset(newPan);
        setDragStart(e.clientX);
        return;
      }

      // Find closest emotion point
      const effectiveX = x / zoomLevel;
      const time = minTime + (effectiveX / rect.width) * duration;
      const closest = emotions.reduce((prev, curr) => {
        return Math.abs(curr.time - time) < Math.abs(prev.time - time) ? curr : prev;
      }, emotions[0]);

      if (closest && Math.abs(closest.time - time) < 5) {
        setHoveredPoint(closest);
        setHoverPosition({ x, y });
      } else {
        setHoveredPoint(null);
        setHoverPosition(null);
      }
    },
    [disabled, emotions, minTime, duration, isDragging, dragStart, panOffset, zoomLevel, enableZoom]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
    setHoverPosition(null);
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (disabled || !enableZoom) return;

      setIsDragging(true);
      setDragStart(e.clientX);
    },
    [disabled, enableZoom]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (disabled || !onSeek || isDragging) return;

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const effectiveX = x / zoomLevel;
      const time = minTime + (effectiveX / rect.width) * duration;
      onSeek(time);
    },
    [disabled, onSeek, minTime, duration, zoomLevel, isDragging]
  );

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev * 1.5, 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev / 1.5, 1));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
    setPanOffset(0);
  }, []);

  const handleAddAnnotation = useCallback(() => {
    if (!enableAnnotations || !hoveredPoint) return;

    setAnnotationTime(hoveredPoint.time);
    setShowAnnotationInput(true);
  }, [enableAnnotations, hoveredPoint]);

  const handleSaveAnnotation = useCallback(() => {
    if (annotationText.trim()) {
      setAnnotations((prev) => [
        ...prev,
        {
          time: annotationTime,
          text: annotationText.trim(),
          color: '#f59e0b',
        },
      ]);
    }
    setShowAnnotationInput(false);
    setAnnotationText('');
  }, [annotationTime, annotationText]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (emotions.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-sm text-slate-500 dark:text-slate-400">No emotion data available</p>
      </div>
    );
  }

  return (
    <div className={`emotion-timeline-enhanced ${className}`}>
      {/* Timeline Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Emotion Timeline
        </h3>
        <div className="flex items-center gap-2">
          {hoveredPoint && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {formatTime(hoveredPoint.time)}
            </div>
          )}
          {enableZoom && (
            <>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 10}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                disabled={zoomLevel === 1}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                title="Reset zoom"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* SVG Timeline */}
      <div className="relative">
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
          style={{
            cursor: disabled ? 'not-allowed' : onSeek ? 'pointer' : 'default',
          }}
        >
          <g transform={`scale(${zoomLevel})`}>
            {/* Background Grid */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-slate-100 dark:text-slate-800"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Emotion Regions with smooth gradients */}
            {emotions.map((point, index) => {
              const nextPoint = emotions[index + 1];
              if (!nextPoint) return null;

              const x = ((point.time - minTime) / duration) * 100;
              const nextX = ((nextPoint.time - minTime) / duration) * 100;
              const width = nextX - x;

              const color = getEmotionColor(point.emotion.emotion as EmotionCategory, darkMode);

              return (
                <g key={index}>
                  <rect
                    x={`${x}%`}
                    y="0"
                    width={`${width}%`}
                    height="100%"
                    fill={color}
                    opacity="0.15"
                  />
                  {/* Transition indicator */}
                  {transitions.some((t) => Math.abs(t.timestamp / 1000 - point.time) < 0.5) && (
                    <line
                      x1={`${nextX}%`}
                      y1="0"
                      x2={`${nextX}%`}
                      y2="100%"
                      stroke={color}
                      strokeWidth="2"
                      strokeDasharray="4,2"
                      opacity="0.5"
                    />
                  )}
                </g>
              );
            })}

            {/* Arousal Line (Intensity) with smooth curve */}
            <path
              d={generateSmoothPath(emotions, minTime, duration, 'arousal', height)}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              opacity="0.8"
              vectorEffect="non-scaling-stroke"
            />

            {/* Valence Line (Positive/Negative) with smooth curve */}
            <path
              d={generateSmoothPath(emotions, minTime, duration, 'valence', height)}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.5"
              opacity="0.8"
              vectorEffect="non-scaling-stroke"
            />

            {/* Dominance Line (Control) with smooth curve */}
            <path
              d={generateSmoothPath(emotions, minTime, duration, 'dominance', height)}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              opacity="0.8"
              vectorEffect="non-scaling-stroke"
            />

            {/* Data Points with hover effect */}
            {emotions.map((point, index) => {
              const x = ((point.time - minTime) / duration) * 100;
              const y = 100 - point.emotion.arousal * 100;
              const color = getEmotionColor(point.emotion.emotion as EmotionCategory, darkMode);
              const isHovered = hoveredPoint === point;

              return (
                <g key={index}>
                  {/* Glow effect for hovered point */}
                  {isHovered && (
                    <circle
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r="12"
                      fill={color}
                      opacity="0.2"
                      className="animate-pulse"
                    />
                  )}

                  {/* Main point */}
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r={isHovered ? 6 : 4}
                    fill={color}
                    className="transition-all duration-300"
                    opacity={isHovered ? 1 : 0.7}
                  />
                </g>
              );
            })}

            {/* Annotations */}
            {annotations.map((annotation, index) => {
              const x = ((annotation.time - minTime) / duration) * 100;

              return (
                <g key={`annotation-${index}`}>
                  <line
                    x1={`${x}%`}
                    y1="0"
                    x2={`${x}%`}
                    y2="100%"
                    stroke={annotation.color || '#f59e0b'}
                    strokeWidth="2"
                    strokeDasharray="8,4"
                  />
                  <rect
                    x={`${x}%`}
                    y="5"
                    width="80"
                    height="20"
                    fill={annotation.color || '#f59e0b'}
                    rx="4"
                    transform={`translate(-40, 0)`}
                  />
                  <text
                    x={`${x}%`}
                    y="19"
                    fill="white"
                    fontSize="10"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {annotation.text.slice(0, 10)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && hoverPosition && (
          <div
            className="absolute z-10 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs rounded-lg shadow-lg pointer-events-none transition-opacity duration-200"
            style={{
              left: hoverPosition.x,
              top: hoverPosition.y - 100,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-semibold capitalize">{hoveredPoint.emotion.emotion}</div>
            <div className="mt-1 space-y-0.5">
              <div>Valence: {hoveredPoint.emotion.valence.toFixed(2)}</div>
              <div>Arousal: {hoveredPoint.emotion.arousal.toFixed(2)}</div>
              <div>Dominance: {hoveredPoint.emotion.dominance.toFixed(2)}</div>
              {showConfidence && (
                <div>Confidence: {(hoveredPoint.emotion.confidence * 100).toFixed(0)}%</div>
              )}
            </div>
            {hoveredPoint.label && (
              <div className="mt-2 pt-2 border-t border-slate-700 dark:border-slate-300 italic opacity-80">
                "{hoveredPoint.label.slice(0, 50)}
                {hoveredPoint.label.length > 50 ? '...' : ''}"
              </div>
            )}
            {enableAnnotations && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddAnnotation();
                }}
                className="mt-2 text-xs flex items-center gap-1 hover:underline"
              >
                <Tag className="w-3 h-3" />
                Add annotation
              </button>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-green-500" />
          <span>Valence (Positive/Negative)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-amber-500" />
          <span>Arousal (Intensity)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-blue-500" />
          <span>Dominance (Control)</span>
        </div>
      </div>

      {/* Annotation Input Modal */}
      {showAnnotationInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add Annotation</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Annotate emotion at {formatTime(annotationTime)}
            </p>
            <input
              type="text"
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
              placeholder="Enter annotation text..."
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowAnnotationInput(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAnnotation}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Save Annotation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format time in M:SS format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate smooth path using bezier curves
 */
function generateSmoothPath(
  emotions: EmotionDataPoint[],
  minTime: number,
  duration: number,
  key: 'valence' | 'arousal' | 'dominance',
  height: number
): string {
  if (emotions.length === 0) return '';

  const points = emotions.map((point) => {
    const x = ((point.time - minTime) / duration) * 100;
    const y = 100 - (point.emotion[key] * 100);
    return { x, y };
  });

  if (points.length === 1) {
    return `M ${points[0].x},${points[0].y}`;
  }

  // Create smooth bezier curves
  let path = `M ${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cp1x = prev.x + (curr.x - prev.x) / 3;
    const cp1y = prev.y;
    const cp2x = curr.x - (curr.x - prev.x) / 3;
    const cp2y = curr.y;

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
  }

  return path;
}

EmotionTimelineEnhanced.displayName = 'EmotionTimelineEnhanced';
