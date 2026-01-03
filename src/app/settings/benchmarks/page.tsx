'use client';

/**
 * Benchmarks Settings Page
 *
 * Run and view benchmark results to measure system performance.
 * Displays results with visual indicators and recommendations.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Clock, TrendingUp } from 'lucide-react';
import { BenchmarkSuite } from '@/lib/benchmark/suite';
import type { BenchmarkSuiteResult } from '@/lib/benchmark/types';
import { BenchmarkResults } from '@/components/settings/BenchmarkResults';

export default function BenchmarksPage() {
  const [suite, setSuite] = useState<BenchmarkSuiteResult | undefined>();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBenchmark, setCurrentBenchmark] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<BenchmarkSuiteResult[]>([]);

  useEffect(() => {
    // Load history from localStorage
    const savedHistory = localStorage.getItem('benchmark-history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
        if (parsed.length > 0) {
          setSuite(parsed[0]); // Show most recent
        }
      } catch (err) {
        console.error('Failed to load benchmark history:', err);
      }
    }
  }, []);

  const runBenchmarks = async () => {
    setRunning(true);
    setProgress(0);
    setError(null);
    setCurrentBenchmark(undefined);

    try {
      const benchmarkSuite = new BenchmarkSuite();

      const startTime = Date.now();

      const result = await benchmarkSuite.runAll({
        onProgress: (progress) => {
          setProgress(progress.progress);
          setCurrentBenchmark(progress.current);
        },
      });

      const duration = Date.now() - startTime;
      console.log(`Benchmarks completed in ${duration}ms`);

      setSuite(result);

      // Save to history
      const newHistory = [result, ...history].slice(0, 10); // Keep last 10
      setHistory(newHistory);
      localStorage.setItem('benchmark-history', JSON.stringify(newHistory));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Benchmark error:', err);
    } finally {
      setRunning(false);
      setProgress(0);
      setCurrentBenchmark(undefined);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/settings"
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Benchmarks
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Measure system performance
                </p>
              </div>
            </div>
            {!running && (
              <div className="text-right text-sm text-slate-600 dark:text-slate-400">
                {history.length > 0 && (
                  <span>{history.length} run{history.length !== 1 ? 's' : ''} recorded</span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
              Benchmark Error
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Current Results */}
        <BenchmarkResults
          suite={suite}
          running={running}
          progress={progress}
          currentBenchmark={currentBenchmark}
          onRun={runBenchmarks}
        />

        {/* Historical Results */}
        {!running && history.length > 1 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Historical Results
            </h2>
            <div className="space-y-3">
              {history.slice(1).map((historicalSuite, index) => (
                <HistoryCard
                  key={index}
                  suite={historicalSuite}
                  onSelect={() => setSuite(historicalSuite)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            About Benchmarks
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
            Benchmarks measure your system's performance across various operations including vector math,
            storage I/O, rendering, memory allocation, and network requests. Results are stored locally
            and can help identify performance bottlenecks.
          </p>
          <div className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
            <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Note: Benchmarks may take 30-60 seconds to complete. For best results, close other
              applications and avoid interacting with the browser during testing.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

interface HistoryCardProps {
  suite: BenchmarkSuiteResult;
  onSelect: () => void;
}

function HistoryCard({ suite, onSelect }: HistoryCardProps) {
  const date = new Date(suite.timestamp);
  const timeAgo = getTimeAgo(date);

  return (
    <button
      onClick={onSelect}
      className="w-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-left"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
            {suite.overallScore}
          </div>
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">
              {suite.results.length} benchmarks
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {timeAgo}
            </div>
          </div>
        </div>
        <div className="text-right text-sm text-slate-600 dark:text-slate-400">
          {date.toLocaleString()}
        </div>
      </div>
    </button>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}
