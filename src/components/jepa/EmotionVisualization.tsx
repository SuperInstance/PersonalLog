/**
 * JEPA Emotion Visualization Dashboard
 *
 * Comprehensive emotion visualization component with multiple chart types:
 * - 3D VAD scatter plot
 * - Emotion radar chart
 * - Emotion distribution pie chart
 * - Live emotion indicator
 * - Interactive filters and tooltips
 *
 * @module components/jepa/EmotionVisualization
 */

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { EmotionResult, EmotionCategory } from '@/lib/jepa/types';
import { EmotionRecording, EmotionStatistics } from '@/lib/jepa/emotion-storage';
import {
  getEmotionColor,
  getEmotionGradient,
  calculateEmotionDistribution,
  getVADQuadrant,
  formatVADScore,
  getEmotionDescription,
  smoothData,
  type ChartDataPoint,
  type RadarData,
  type VADQuadrant,
} from '@/lib/jepa/emotion-chart-utils';
import { Activity, TrendingUp, PieChart, Radar, Filter } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface EmotionVisualizationProps {
  /** Emotion recordings to visualize */
  recordings: EmotionRecording[];

  /** Computed statistics (optional) */
  statistics?: EmotionStatistics;

  /** Currently live emotion (for real-time display) */
  liveEmotion?: EmotionResult;

  /** Dark mode enabled */
  darkMode?: boolean;

  /** Custom CSS classes */
  className?: string;

  /** Height of charts in pixels */
  chartHeight?: number;

  /** Enable animations */
  animated?: boolean;

  /** Export callback */
  onExport?: (format: 'png' | 'json' | 'csv') => void;
}

export type VisualizationType =
  | 'scatter'
  | 'radar'
  | 'distribution'
  | 'timeline'
  | 'all';

export type FilterType = 'emotion' | 'valence' | 'arousal' | 'dominance' | 'none';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EmotionVisualization({
  recordings,
  statistics,
  liveEmotion,
  darkMode = false,
  className = '',
  chartHeight = 300,
  animated = true,
  onExport,
}: EmotionVisualizationProps) {
  // State
  const [selectedType, setSelectedType] = useState<VisualizationType>('all');
  const [filterType, setFilterType] = useState<FilterType>('none');
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionCategory | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Refs for canvas elements
  const scatterCanvasRef = useRef<HTMLCanvasElement>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);
  const distributionCanvasRef = useRef<HTMLCanvasElement>(null);

  // Process data
  const chartData = useMemo(() => {
    const data: ChartDataPoint[] = recordings.map((r) => ({
      x: r.timestamp,
      y: r.valence,
      valence: r.valence,
      arousal: r.arousal,
      dominance: r.dominance,
      timestamp: r.timestamp,
      emotion: r.emotion as EmotionCategory,
      confidence: r.confidence,
    }));
    return data.sort((a, b) => a.timestamp - b.timestamp);
  }, [recordings]);

  const radarData = useMemo(() => {
    return calculateEmotionDistribution(recordings);
  }, [recordings]);

  const filteredData = useMemo(() => {
    if (filterType === 'none' && !selectedEmotion) return chartData;

    return chartData.filter((point) => {
      if (selectedEmotion && point.emotion !== selectedEmotion) return false;
      return true;
    });
  }, [chartData, filterType, selectedEmotion]);

  // Render charts
  useEffect(() => {
    if (selectedType === 'scatter' || selectedType === 'all') {
      renderScatterPlot();
    }
  }, [selectedType, filteredData, darkMode]);

  useEffect(() => {
    if (selectedType === 'radar' || selectedType === 'all') {
      renderRadarChart();
    }
  }, [selectedType, radarData, darkMode]);

  useEffect(() => {
    if (selectedType === 'distribution' || selectedType === 'all') {
      renderDistributionChart();
    }
  }, [selectedType, radarData, darkMode]);

  // ==========================================================================
  // SCATTER PLOT RENDERER
  // ==========================================================================

  const renderScatterPlot = useCallback(() => {
    const canvas = scatterCanvasRef.current;
    if (!canvas || filteredData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    // Draw axes
    ctx.strokeStyle = darkMode ? '#475569' : '#cbd5e1';
    ctx.lineWidth = 1;

    // X-axis (Arousal)
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Y-axis (Valence)
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // Draw quadrant labels
    ctx.font = '12px sans-serif';
    ctx.fillStyle = darkMode ? '#94a3b8' : '#64748b';
    ctx.textAlign = 'center';

    ctx.fillText('Low Energy', width / 2, height - 10);
    ctx.fillText('Arousal →', width - 30, height - padding / 2);
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Valence →', 0, 0);
    ctx.restore();

    // Draw quadrants background
    const quadrants = [
      { x: width / 2, y: height / 2 - padding, color: '#dcfce7' }, // Top-right (high valence, high arousal)
      { x: width / 2, y: height - padding / 2, color: '#f1f5f9' }, // Bottom-right
      { x: padding + (width / 2 - padding) / 2, y: height / 2 - padding, color: '#fee2e2' }, // Top-left
      { x: padding + (width / 2 - padding) / 2, y: height - padding / 2, color: '#f8fafc' }, // Bottom-left
    ];

    quadrants.forEach((q) => {
      ctx.fillStyle = darkMode ? '#1e293b' : q.color;
      ctx.fillRect(
        q.x - (width - 2 * padding) / 4,
        q.y - (height - 2 * padding) / 4,
        (width - 2 * padding) / 2,
        (height - 2 * padding) / 2
      );
    });

    // Plot data points
    filteredData.forEach((point) => {
      const x = padding + (point.arousal * (width - 2 * padding));
      const y = height - padding - (point.valence * (height - 2 * padding));

      const color = getEmotionColor(point.emotion, darkMode);

      // Draw point
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = darkMode ? '#1e293b' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Highlight hovered point
      if (hoveredPoint === point) {
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });

    // Draw live emotion if available
    if (liveEmotion) {
      const x = padding + (liveEmotion.arousal * (width - 2 * padding));
      const y = height - padding - (liveEmotion.valence * (height - 2 * padding));

      // Pulsing circle
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, 2 * Math.PI);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
    }
  }, [filteredData, hoveredPoint, liveEmotion, darkMode]);

  // ==========================================================================
  // RADAR CHART RENDERER
  // ==========================================================================

  const renderRadarChart = useCallback(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas || radarData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;
    const maxValue = Math.max(...radarData.map((d) => d.value));

    // Draw radar grid
    ctx.strokeStyle = darkMode ? '#475569' : '#cbd5e1';
    ctx.lineWidth = 1;

    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      const r = (radius / 5) * i;
      for (let j = 0; j <= radarData.length; j++) {
        const angle = (j / radarData.length) * 2 * Math.PI - Math.PI / 2;
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw axes
    for (let i = 0; i < radarData.length; i++) {
      const angle = (i / radarData.length) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Labels
      const labelX = centerX + (radius + 20) * Math.cos(angle);
      const labelY = centerY + (radius + 20) * Math.sin(angle);
      ctx.font = '11px sans-serif';
      ctx.fillStyle = darkMode ? '#94a3b8' : '#64748b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(radarData[i].emotion, labelX, labelY);
    }

    // Draw data polygon
    ctx.beginPath();
    radarData.forEach((data, i) => {
      const angle = (i / radarData.length) * 2 * Math.PI - Math.PI / 2;
      const r = (data.value / maxValue) * radius;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [radarData, darkMode]);

  // ==========================================================================
  // DISTRIBUTION CHART RENDERER
  // ==========================================================================

  const renderDistributionChart = useCallback(() => {
    const canvas = distributionCanvasRef.current;
    if (!canvas || radarData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;

    let startAngle = -Math.PI / 2;

    radarData.forEach((data) => {
      const sliceAngle = (data.percentage / 100) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = getEmotionColor(data.emotion, darkMode);
      ctx.fill();
      ctx.strokeStyle = darkMode ? '#1e293b' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw label
      const labelAngle = startAngle + sliceAngle / 2;
      const labelX = centerX + (radius * 0.7) * Math.cos(labelAngle);
      const labelY = centerY + (radius * 0.7) * Math.sin(labelAngle);

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(data.percentage)}%`, labelX, labelY);

      startAngle = endAngle;
    });
  }, [radarData, darkMode]);

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  const handleScatterMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = scatterCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Find closest point
      let closest: ChartDataPoint | null = null;
      let minDistance = Infinity;

      filteredData.forEach((point) => {
        const px = 40 + point.arousal * (canvas.width - 80);
        const py = canvas.height - 40 - point.valence * (canvas.height - 80);
        const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);

        if (distance < 20 && distance < minDistance) {
          minDistance = distance;
          closest = point;
        }
      });

      setHoveredPoint(closest);
    },
    [filteredData]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (recordings.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-12 ${className}`}>
        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <Activity className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
          No emotion data available
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
          Record some emotions to see visualizations
        </p>
      </div>
    );
  }

  return (
    <div className={`emotion-visualization space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Emotion Visualization
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Interactive emotion analysis dashboard
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View type selector */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as VisualizationType)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
          >
            <option value="all">All Charts</option>
            <option value="scatter">VAD Scatter</option>
            <option value="radar">Radar Chart</option>
            <option value="distribution">Distribution</option>
          </select>

          {/* Export button */}
          {onExport && (
            <button
              onClick={() => onExport('png')}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
            >
              Export
            </button>
          )}
        </div>
      </div>

      {/* Live Emotion Indicator */}
      {liveEmotion && (
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-green-900 dark:text-green-100 capitalize">
                Live: {liveEmotion.emotion}
              </div>
              <div className="text-xs text-green-700 dark:text-green-300">
                {getEmotionDescription(liveEmotion.emotion)}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-green-700 dark:text-green-300">
              <div>
                <span className="font-medium">Valence:</span> {formatVADScore(liveEmotion.valence)}
              </div>
              <div>
                <span className="font-medium">Arousal:</span>{' '}
                {formatVADScore(liveEmotion.arousal)}
              </div>
              <div>
                <span className="font-medium">Dominance:</span>{' '}
                {formatVADScore(liveEmotion.dominance)}
              </div>
              <div>
                <span className="font-medium">Confidence:</span>{' '}
                {Math.round(liveEmotion.confidence * 100)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VAD Scatter Plot */}
        {(selectedType === 'scatter' || selectedType === 'all') && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold">VAD Scatter Plot</h3>
            </div>
            <div className="relative">
              <canvas
                ref={scatterCanvasRef}
                width={500}
                height={chartHeight}
                onMouseMove={handleScatterMouseMove}
                onMouseLeave={() => setHoveredPoint(null)}
                className="w-full cursor-crosshair"
              />
              {hoveredPoint && (
                <div className="absolute top-2 right-2 p-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs shadow-lg">
                  <div className="font-semibold capitalize mb-1">{hoveredPoint.emotion}</div>
                  <div>Valence: {hoveredPoint.valence.toFixed(2)}</div>
                  <div>Arousal: {hoveredPoint.arousal.toFixed(2)}</div>
                  <div>Dominance: {hoveredPoint.dominance.toFixed(2)}</div>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-600 dark:text-slate-400">
              <span>Y-axis: Valence (Positive/Negative)</span>
              <span>•</span>
              <span>X-axis: Arousal (Energy)</span>
            </div>
          </div>
        )}

        {/* Radar Chart */}
        {(selectedType === 'radar' || selectedType === 'all') && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Radar className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold">Emotion Radar</h3>
            </div>
            <div className="flex justify-center">
              <canvas
                ref={radarCanvasRef}
                width={400}
                height={chartHeight}
                className="max-w-full"
              />
            </div>
          </div>
        )}

        {/* Distribution Chart */}
        {(selectedType === 'distribution' || selectedType === 'all') && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold">Emotion Distribution</h3>
            </div>
            <div className="flex justify-center">
              <canvas
                ref={distributionCanvasRef}
                width={400}
                height={chartHeight}
                className="max-w-full"
              />
            </div>
          </div>
        )}

        {/* Statistics Summary */}
        {statistics && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold">Statistics Summary</h3>
            </div>
            <div className="space-y-4">
              <StatRow label="Average Valence" value={statistics.valence.mean} color="green" />
              <StatRow label="Average Arousal" value={statistics.arousal.mean} color="orange" />
              <StatRow label="Average Dominance" value={statistics.dominance.mean} color="blue" />
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

interface StatRowProps {
  label: string;
  value: number;
  color: 'green' | 'orange' | 'blue';
}

function StatRow({ label, value, color }: StatRowProps) {
  const colors = {
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    blue: 'bg-blue-500',
  };

  const percentage = value * 100;

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-slate-700 dark:text-slate-300">{label}</span>
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
        <div
          className={`${colors[color]} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

EmotionVisualization.displayName = 'EmotionVisualization';
