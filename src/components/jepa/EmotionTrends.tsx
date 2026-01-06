/**
 * Emotion Trends Component
 *
 * Main component for displaying emotion trend analysis including
 * line charts, distribution, heatmap, and pattern insights.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EmotionTrendTracker } from '@/lib/jepa/emotion-trends';
import {
  EmotionRecording,
  EmotionStatistics,
  EmotionPattern,
  downloadEmotions,
} from '@/lib/jepa/emotion-storage';
import { TrendChart } from './TrendChart';

type TimeRange = 'week' | 'month' | 'year';

export function EmotionTrends() {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [recordings, setRecordings] = useState<EmotionRecording[]>([]);
  const [statistics, setStatistics] = useState<EmotionStatistics | null>(null);
  const [patterns, setPatterns] = useState<EmotionPattern[]>([]);
  const [heatmapData, setHeatmapData] = useState<Record<string, Record<number, { valence: number; count: number }>>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  async function loadData() {
    setIsLoading(true);
    try {
      const endDate = new Date();
      const startDate = getStartDate(timeRange);

      const tracker = new EmotionTrendTracker();
      const [loadedRecordings, detectedPatterns, heatmap] = await Promise.all([
        tracker.getRecordings(startDate, endDate),
        tracker.detectPatterns([]).then((p) => p), // Will be recalculated
        tracker.getHeatmapData([]).then((h) => h), // Will be recalculated
      ]);

      // Compute patterns and heatmap with actual data
      const [finalStats, finalPatterns, finalHeatmap] = await Promise.all([
        tracker.computeStatistics(loadedRecordings),
        tracker.detectPatterns(loadedRecordings),
        tracker.getHeatmapData(loadedRecordings),
      ]);

      setRecordings(loadedRecordings);
      setStatistics(finalStats);
      setPatterns(finalPatterns);
      setHeatmapData(finalHeatmap);
    } catch (error) {
      console.error('Failed to load emotion trends:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExport(format: 'csv' | 'json') {
    try {
      await downloadEmotions(recordings, format);
    } catch (error) {
      console.error('Failed to export emotions:', error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading emotion trends...</div>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">No emotion recordings yet</div>
        <div className="text-sm text-gray-400">
          Start recording emotions to see trends and patterns
        </div>
      </div>
    );
  }

  return (
    <div className="emotion-trends space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Emotion Trends</h2>

        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeRange === 'week'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setTimeRange('week')}
            >
              Week
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeRange === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setTimeRange('month')}
            >
              Month
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeRange === 'year'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setTimeRange('year')}
            >
              Year
            </button>
          </div>

          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              onClick={() => handleExport('csv')}
            >
              Export CSV
            </button>
            <button
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
              onClick={() => handleExport('json')}
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      {statistics && <StatisticsSummary statistics={statistics} />}

      {/* VAD Chart */}
      {recordings.length > 0 && (
        <TrendChart recordings={recordings} title="Valence, Arousal, Dominance Over Time" />
      )}

      {/* Emotion Distribution */}
      {statistics && <EmotionDistribution distribution={statistics.emotionDistribution} />}

      {/* Time Heatmap */}
      <EmotionHeatmap heatmapData={heatmapData} />

      {/* Pattern Insights */}
      {patterns.length > 0 && <PatternInsights patterns={patterns} />}
    </div>
  );
}

// ============================================================================
// SUMMARY STATISTICS
// ============================================================================

interface StatisticsSummaryProps {
  statistics: EmotionStatistics;
}

function StatisticsSummary({ statistics }: StatisticsSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        label="Average Valence"
        value={statistics.valence.mean}
        format="percentage"
        color="green"
      />
      <StatCard
        label="Average Arousal"
        value={statistics.arousal.mean}
        format="percentage"
        color="blue"
      />
      <StatCard
        label="Average Dominance"
        value={statistics.dominance.mean}
        format="percentage"
        color="purple"
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  format: 'percentage' | 'number';
  color?: 'green' | 'blue' | 'purple';
}

function StatCard({ label, value, format, color = 'green' }: StatCardProps) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  const textColorClasses = {
    green: 'text-green-700',
    blue: 'text-blue-700',
    purple: 'text-purple-700',
  };

  const displayValue = format === 'percentage' ? `${(value * 100).toFixed(1)}%` : value.toFixed(2);

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${textColorClasses[color]}`}>{displayValue}</div>
    </div>
  );
}

// ============================================================================
// EMOTION DISTRIBUTION
// ============================================================================

interface EmotionDistributionProps {
  distribution: Record<string, number>;
}

function EmotionDistribution({ distribution }: EmotionDistributionProps) {
  const data = useMemo(() => {
    return Object.entries(distribution)
      .map(([emotion, percentage]) => ({
        emotion,
        percentage: percentage * 100,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [distribution]);

  const maxPercentage = Math.max(...data.map((d) => d.percentage), 1);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Emotion Distribution</h3>

      <div className="space-y-3">
        {data.map(({ emotion, percentage }) => (
          <div key={emotion} className="distribution-item">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium capitalize text-gray-700">{emotion}</span>
              <span className="text-sm text-gray-500">{percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(percentage / maxPercentage) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EMOTION HEATMAP
// ============================================================================

interface EmotionHeatmapProps {
  heatmapData: Record<string, Record<number, { valence: number; count: number }>>;
}

function EmotionHeatmap({ heatmapData }: EmotionHeatmapProps) {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const valenceToColor = (valence: number, count: number): string => {
    if (count === 0) return '#f3f4f6'; // Gray for no data

    // Red (negative) to Green (positive)
    const hue = valence * 120; // 0 = red, 120 = green
    const saturation = 70;
    const lightness = 60 + valence * 20; // Higher valence = lighter

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Emotion Heatmap (by Day and Hour)</h3>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Hour labels */}
          <div className="flex ml-12 mb-2">
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className="w-6 text-xs text-gray-500 text-center"
                style={{ flex: '0 0 24px' }}
              >
                {i % 3 === 0 ? i : ''}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {DAYS.map((day) => (
            <div key={day} className="flex items-center mb-1">
              <span className="w-12 text-xs text-gray-600 font-medium mr-2">{day}</span>

              {Array.from({ length: 24 }, (_, hour) => {
                const data = heatmapData[day]?.[hour] || { valence: 0, count: 0 };
                const color = valenceToColor(data.valence, data.count);

                return (
                  <div
                    key={hour}
                    className="heatmap-cell border border-gray-100"
                    style={{
                      flex: '0 0 24px',
                      height: '24px',
                      backgroundColor: color,
                    }}
                    title={`${day} ${hour}:00 - Valence: ${data.valence.toFixed(2)} (${
                      data.count
                    } recordings)`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <span className="text-sm text-gray-600">Negative</span>
        <div className="w-48 h-4 rounded" style={{ background: 'linear-gradient(to right, hsl(0, 70%, 60%), hsl(120, 70%, 80%))' }} />
        <span className="text-sm text-gray-600">Positive</span>
      </div>
    </div>
  );
}

// ============================================================================
// PATTERN INSIGHTS
// ============================================================================

interface PatternInsightsProps {
  patterns: EmotionPattern[];
}

function PatternInsights({ patterns }: PatternInsightsProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Pattern Insights</h3>

      <div className="space-y-4">
        {patterns.map((pattern) => (
          <div
            key={pattern.type}
            className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="font-medium text-gray-900 capitalize">
                {pattern.type.replace(/_/g, ' ')}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(pattern.confidence * 100)}% confidence
              </span>
            </div>

            <p className="text-sm text-gray-700 mb-3">{pattern.description}</p>

            {pattern.suggestions && pattern.suggestions.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <strong className="text-sm text-blue-900">Suggestions:</strong>
                <ul className="mt-2 space-y-1">
                  {pattern.suggestions.map((suggestion, i) => (
                    <li key={i} className="text-sm text-blue-800 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

function getStartDate(range: TimeRange): Date {
  const now = new Date();

  switch (range) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}
