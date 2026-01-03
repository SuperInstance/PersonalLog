'use client';

/**
 * Benchmark Results Component
 *
 * Displays benchmark results with visual bars, charts, and comparisons.
 * Shows individual benchmarks and overall performance metrics.
 */

import { Play, BarChart3, TrendingUp, Clock } from 'lucide-react';
import type { BenchmarkResult, BenchmarkSuiteResult, Recommendation } from '@/lib/benchmark/types';

interface BenchmarkResultsProps {
  suite?: BenchmarkSuiteResult;
  running?: boolean;
  progress?: number;
  currentBenchmark?: string;
  onRun?: () => void;
}

export function BenchmarkResults({
  suite,
  running = false,
  progress = 0,
  currentBenchmark,
  onRun
}: BenchmarkResultsProps) {
  if (!suite && !running) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          No Benchmarks Yet
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
          Run benchmarks to measure your system's performance across vector operations, storage, rendering, memory, and network.
        </p>
        <button
          onClick={onRun}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
        >
          <Play className="w-5 h-5" />
          Run Benchmarks
        </button>
      </div>
    );
  }

  if (running) {
    return <BenchmarkProgress progress={progress} current={currentBenchmark} />;
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      {suite && (
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-100 uppercase tracking-wide">
                Overall Score
              </h3>
              <div className="text-5xl font-bold mt-2">{suite.overallScore}</div>
              <p className="text-blue-100 mt-2 text-sm">
                Based on {suite.results.length} benchmarks
              </p>
            </div>
            <TrendingUp className="w-16 h-16 opacity-50" />
          </div>
        </div>
      )}

      {/* Benchmark Categories */}
      {suite && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Performance by Category
          </h4>
          <div className="grid gap-4">
            {Object.entries(
              suite.results.reduce((acc, result) => {
                if (!acc[result.category]) {
                  acc[result.category] = [];
                }
                acc[result.category].push(result);
                return acc;
              }, {} as Record<string, BenchmarkResult[]>)
            ).map(([category, results]) => (
              <CategoryCard key={category} category={category} results={results} />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {suite && suite.recommendations.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-6">
          <h4 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-4">
            Recommendations
          </h4>
          <div className="space-y-3">
            {suite.recommendations.map((rec, index) => (
              <RecommendationItem key={index} recommendation={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Run Again Button */}
      <button
        onClick={onRun}
        disabled={running}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Play className="w-5 h-5" />
        Run Benchmarks Again
      </button>
    </div>
  );
}

interface BenchmarkProgressProps {
  progress: number;
  current?: string;
}

function BenchmarkProgress({ progress, current }: BenchmarkProgressProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 relative">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-slate-200 dark:text-slate-700"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={226}
              strokeDashoffset={226 - (226 * progress) / 100}
              className="text-blue-600 dark:text-blue-400 transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Running Benchmarks...
        </h3>
        {current && (
          <p className="text-slate-600 dark:text-slate-400">
            {current}
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Clock className="w-4 h-4" />
          <span>This may take a few moments</span>
        </div>
      </div>
    </div>
  );
}

interface CategoryCardProps {
  category: string;
  results: BenchmarkResult[];
}

function CategoryCard({ category, results }: CategoryCardProps) {
  const avgScore = results.reduce((sum, r) => sum + r.mean, 0) / results.length;

  const categoryColors: Record<string, string> = {
    vector: 'blue',
    storage: 'green',
    render: 'purple',
    memory: 'amber',
    network: 'cyan',
  };

  const color = categoryColors[category] || 'slate';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className={`px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-${color}-50 dark:bg-${color}-900/20`}>
        <div className="flex items-center justify-between">
          <h5 className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
            {category}
          </h5>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {results.length} benchmark{results.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {results.map(result => (
          <BenchmarkBar key={result.id} result={result} />
        ))}
      </div>
    </div>
  );
}

interface BenchmarkBarProps {
  result: BenchmarkResult;
}

function BenchmarkBar({ result }: BenchmarkBarProps) {
  const maxResult = result.max * 1.2; // Add some headroom
  const percentage = (result.mean / maxResult) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-900 dark:text-slate-100">{result.name}</span>
        <span className="text-slate-600 dark:text-slate-400">
          {result.mean.toFixed(2)} {result.unit}
        </span>
      </div>
      <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span>Min: {result.min.toFixed(2)}</span>
        <span>Max: {result.max.toFixed(2)}</span>
        <span>StdDev: {result.stdDev.toFixed(2)}</span>
        <span>{result.iterations} iterations</span>
      </div>
    </div>
  );
}

interface RecommendationItemProps {
  recommendation: Recommendation;
}

function RecommendationItem({ recommendation }: RecommendationItemProps) {
  const priorityColors = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <div className="flex gap-3">
      <div className={`flex-shrink-0 px-2 py-1 rounded text-xs font-semibold uppercase ${priorityColors[recommendation.priority]}`}>
        {recommendation.priority}
      </div>
      <div className="flex-1">
        <p className="text-sm text-amber-900 dark:text-amber-100">{recommendation.recommendation}</p>
        {recommendation.reasoning && (
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{recommendation.reasoning}</p>
        )}
      </div>
    </div>
  );
}
