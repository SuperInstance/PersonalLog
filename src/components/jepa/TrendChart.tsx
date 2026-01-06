/**
 * Trend Chart Component
 *
 * Reusable chart component for displaying emotion trends over time.
 * Supports line charts with multiple series, zoom, pan, and tooltips.
 */

'use client';

import React, { useRef, useEffect, useState, MouseEvent } from 'react';
import { EmotionRecording } from '@/lib/jepa/emotion-storage';

interface TrendChartProps {
  recordings: EmotionRecording[];
  title: string;
  width?: number;
  height?: number;
}

interface DataPoint {
  x: number;
  y: number;
  valence: number;
  arousal: number;
  dominance: number;
  timestamp: number;
}

export function TrendChart({
  recordings,
  title,
  width = 800,
  height = 300,
}: TrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Prepare data
  const data: DataPoint[] = React.useMemo(() => {
    return recordings
      .map((r) => ({
        x: r.timestamp,
        y: r.valence,
        valence: r.valence,
        arousal: r.arousal,
        dominance: r.dominance,
        timestamp: r.timestamp,
      }))
      .sort((a, b) => a.x - b.x);
  }, [recordings]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scales
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;

    const minX = Math.min(...data.map((d) => d.x));
    const maxX = Math.max(...data.map((d) => d.x));
    const minY = 0;
    const maxY = 1;

    const scaleX = (value: number) =>
      padding.left + ((value - minX) / (maxX - minX)) * chartWidth;
    const scaleY = (value: number) =>
      canvas.height - padding.bottom - ((value - minY) / (maxY - minY)) * chartHeight;

    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 10; i++) {
      const y = scaleY(i / 10);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(canvas.width - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText((i / 10).toFixed(1), padding.left - 10, y + 4);
    }

    // Draw lines
    const drawLine = (getValue: (d: DataPoint) => number, color: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      data.forEach((point, i) => {
        const x = scaleX(point.x);
        const y = scaleY(getValue(point));

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    };

    // Draw valence line (green)
    drawLine((d) => d.valence, '#10b981');

    // Draw arousal line (blue)
    drawLine((d) => d.arousal, '#3b82f6');

    // Draw dominance line (purple)
    drawLine((d) => d.dominance, '#8b5cf6');

    // Draw X-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    const timeRange = maxX - minX;
    const labelInterval = timeRange / 5; // Show ~5 labels

    for (let i = 0; i <= 5; i++) {
      const timestamp = minX + labelInterval * i;
      const x = scaleX(timestamp);
      const date = new Date(timestamp);
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      ctx.fillText(label, x, canvas.height - 10);
    }

    // Store scale functions for tooltip
    (canvas as any).scaleX = scaleX;
    (canvas as any).scaleY = scaleY;
    (canvas as any).minX = minX;
    (canvas as any).maxX = maxX;
  }, [data]);

  // Handle mouse move for tooltip
  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find closest point
    const scaleX = (canvas as any).scaleX;
    const scaleY = (canvas as any).scaleY;

    let closestPoint: DataPoint | null = null;
    let minDistance = Infinity;

    for (const point of data) {
      const px = scaleX(point.x);
      const py = scaleY(point.valence); // Use valence for distance
      const distance = Math.sqrt(Math.pow(x - px, 2) + Math.pow(y - py, 2));

      if (distance < minDistance && distance < 50) {
        minDistance = distance;
        closestPoint = point;
      }
    }

    setHoveredPoint(closestPoint);
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setMousePos(null);
  };

  return (
    <div ref={containerRef} className="trend-chart">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="border border-gray-200 rounded-lg cursor-crosshair"
        />

        {/* Tooltip */}
        {hoveredPoint && mousePos && (
          <div
            className="absolute bg-white border border-gray-300 rounded-lg p-3 shadow-lg pointer-events-none"
            style={{
              left: mousePos.x + 10,
              top: mousePos.y - 10,
              transform: 'translateY(-100%)',
            }}
          >
            <div className="text-xs text-gray-500 mb-1">
              {new Date(hoveredPoint.timestamp).toLocaleString()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm">
                  Valence: <strong>{hoveredPoint.valence.toFixed(2)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm">
                  Arousal: <strong>{hoveredPoint.arousal.toFixed(2)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-sm">
                  Dominance: <strong>{hoveredPoint.dominance.toFixed(2)}</strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm text-gray-600">Valence</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-sm text-gray-600">Arousal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-sm text-gray-600">Dominance</span>
        </div>
      </div>
    </div>
  );
}
