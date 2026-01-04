'use client';

/**
 * Storage Chart Component
 *
 * Interactive donut chart showing storage breakdown by category.
 * Uses SVG for rendering without external dependencies.
 */

import React from 'react';
import { StorageItem } from '@/lib/data';

interface StorageChartProps {
  breakdown: Record<string, StorageItem>;
  size?: number;
}

export function StorageChart({ breakdown, size = 200 }: StorageChartProps) {
  const entries = Object.entries(breakdown).filter(([, item]) => item.sizeBytes > 0);

  // Calculate cumulative percentages
  let cumulativePercent = 0;
  const segments = entries.map(([key, item]) => {
    const startPercent = cumulativePercent;
    cumulativePercent += item.percentage;
    const endPercent = cumulativePercent;

    return { key, item, startPercent, endPercent };
  });

  // Generate SVG path for donut segment
  const getSegmentPath = (startPercent: number, endPercent: number) => {
    const startX = Math.cos(2 * Math.PI * startPercent / 100);
    const startY = Math.sin(2 * Math.PI * startPercent / 100);
    const endX = Math.cos(2 * Math.PI * endPercent / 100);
    const endY = Math.sin(2 * Math.PI * endPercent / 100);

    const largeArcFlag = endPercent - startPercent > 50 ? 1 : 0;

    // Outer circle
    const outerX1 = 50 + 40 * startX;
    const outerY1 = 50 + 40 * startY;
    const outerX2 = 50 + 40 * endX;
    const outerY2 = 50 + 40 * endY;

    // Inner circle
    const innerX1 = 50 + 25 * startX;
    const innerY1 = 50 + 25 * startY;
    const innerX2 = 50 + 25 * endX;
    const innerY2 = 50 + 25 * endY;

    return `
      M ${outerX1} ${outerY1}
      A 40 40 0 ${largeArcFlag} 1 ${outerX2} ${outerY2}
      L ${innerX2} ${innerY2}
      A 25 25 0 ${largeArcFlag} 0 ${innerX1} ${innerY1}
      Z
    `;
  };

  const colors: Record<string, string> = {
    conversations: '#3b82f6', // blue-500
    knowledge: '#8b5cf6', // purple-500
    analytics: '#10b981', // green-500
    cache: '#f59e0b', // amber-500
    backups: '#ef4444', // red-500
    other: '#6b7280', // gray-500
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {segments.map(({ key, startPercent, endPercent }) => (
          <path
            key={key}
            d={getSegmentPath(startPercent, endPercent)}
            fill={colors[key] || colors.other}
            stroke="white"
            strokeWidth="0.5"
            className="transition-opacity hover:opacity-80"
          >
            <title>{breakdown[key].name}: {breakdown[key].size} ({breakdown[key].percentage}%)</title>
          </path>
        ))}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {entries.reduce((sum, [, item]) => sum + item.sizeBytes, 0) > 0
              ? Math.round(entries.reduce((sum, [, item]) => sum + item.percentage, 0))
              : 0}
            %
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Used</div>
        </div>
      </div>
    </div>
  );
}
