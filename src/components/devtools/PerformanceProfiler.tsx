/**
 * Performance Profiler - View Render Times and Execution Metrics
 *
 * @component components/devtools/PerformanceProfiler
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Clock, Cpu, MemoryStick, Gauge, Zap } from 'lucide-react';
import { tracer } from '../../lib/devtools/tracer';

export function PerformanceProfiler() {
  const [fps, setFps] = useState(60);
  const [memory, setMemory] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [metrics, setMetrics] = useState(tracer.calculateMetrics());
  const [slowestSpans, setSlowestSpans] = useState(tracer.getSlowestSpans(10));

  // Update FPS
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const updateFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(updateFPS);
    };

    const rafId = requestAnimationFrame(updateFPS);

    return () => cancelAnimationFrame(rafId);
  }, []);

  // Update memory
  useEffect(() => {
    const updateMemory = () => {
      const mem = (performance as any).memory;
      if (mem) {
        setMemory(Math.round(mem.usedJSHeapSize / 1024 / 1024));
      }
    };

    updateMemory();
    const interval = setInterval(updateMemory, 1000);

    return () => clearInterval(interval);
  }, []);

  // Update metrics
  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(tracer.calculateMetrics());
      setSlowestSpans(tracer.getSlowestSpans(10));
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 1000);

    return () => clearInterval(interval);
  }, []);

  // Toggle recording
  const toggleRecording = () => {
    setIsRecording((prev) => !prev);
    tracer.setEnabled(!isRecording);
  };

  // Clear traces
  const clearTraces = () => {
    tracer.clearSpans();
    setMetrics(tracer.calculateMetrics());
    setSlowestSpans([]);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Real-time Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-green-500" />
            <span className="text-xs font-semibold">FPS</span>
          </div>
          <div className="text-2xl font-bold">{fps}</div>
          {fps < 30 && (
            <div className="text-xs text-red-500 mt-1">Poor performance</div>
          )}
          {fps >= 30 && fps < 50 && (
            <div className="text-xs text-yellow-500 mt-1">Acceptable</div>
          )}
          {fps >= 50 && (
            <div className="text-xs text-green-500 mt-1">Good</div>
          )}
        </div>

        <div className="bg-muted rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <MemoryStick className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold">Memory</span>
          </div>
          <div className="text-2xl font-bold">{memory} MB</div>
          {memory > 500 && (
            <div className="text-xs text-red-500 mt-1">High memory usage</div>
          )}
          {memory <= 500 && memory > 200 && (
            <div className="text-xs text-yellow-500 mt-1">Moderate</div>
          )}
          {memory <= 200 && (
            <div className="text-xs text-green-500 mt-1">Good</div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleRecording}
          className={`px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-2 ${
            isRecording
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-primary text-primary-foreground'
          }`}
        >
          <Zap className="w-4 h-4" />
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>

        <button
          onClick={clearTraces}
          className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded transition-colors"
        >
          Clear Traces
        </button>
      </div>

      {/* Metrics Summary */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Trace Metrics</h3>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-muted rounded p-2">
            <div className="font-semibold">Total Spans</div>
            <div className="text-lg">{metrics.totalSpans}</div>
          </div>
          <div className="bg-muted rounded p-2">
            <div className="font-semibold">Completed</div>
            <div className="text-lg text-green-500">{metrics.completedSpans}</div>
          </div>
          <div className="bg-muted rounded p-2">
            <div className="font-semibold">Errored</div>
            <div className="text-lg text-red-500">{metrics.erroredSpans}</div>
          </div>
          <div className="bg-muted rounded p-2">
            <div className="font-semibold">Avg Duration</div>
            <div className="text-lg">{metrics.avgDuration.toFixed(2)}ms</div>
          </div>
          <div className="bg-muted rounded p-2">
            <div className="font-semibold">Min Duration</div>
            <div className="text-lg">{metrics.minDuration.toFixed(2)}ms</div>
          </div>
          <div className="bg-muted rounded p-2">
            <div className="font-semibold">Max Duration</div>
            <div className="text-lg">{metrics.maxDuration.toFixed(2)}ms</div>
          </div>
        </div>
      </div>

      {/* Slowest Spans */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Slowest Operations</h3>
        <div className="space-y-1">
          {slowestSpans.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">
              No traces recorded yet. Start recording to capture performance data.
            </div>
          ) : (
            slowestSpans.map((span) => (
              <div key={span.id} className="bg-muted rounded p-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-xs font-mono">{span.name}</div>
                    <div className="text-xs text-muted-foreground">{span.category}</div>
                  </div>
                  <div className="text-sm font-semibold">{span.duration?.toFixed(2)}ms</div>
                </div>
                {span.duration && span.duration > 100 && (
                  <div className="mt-1 h-1 bg-background rounded overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${Math.min(100, span.duration / 10)}%` }}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* By Category */}
      <div>
        <h3 className="text-sm font-semibold mb-2">By Category</h3>
        <div className="space-y-1">
          {Object.entries(metrics.byCategory).map(([category, count]) => (
            <div key={category} className="flex items-center gap-2">
              <div className="w-24 text-xs capitalize">{category}</div>
              <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${(count / metrics.totalSpans) * 100}%` }}
                />
              </div>
              <div className="w-8 text-xs text-right">{count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
