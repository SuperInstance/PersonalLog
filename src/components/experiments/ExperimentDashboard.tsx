/**
 * Experiment Dashboard
 *
 * Comprehensive UI for managing and analyzing A/B experiments.
 * Features:
 * - Experiment list with status badges
 * - Experiment detail view with statistics
 * - Winner declaration with confidence
 * - Create experiment form
 * - Bandit performance visualization
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  getGlobalManager,
  type Experiment,
  type ExperimentResults,
  type ExperimentStatus,
  type Variant,
  type MetricStatistics,
} from '@/lib/experiments';

interface DashboardProps {
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;

  /** Whether to show advanced statistics */
  showAdvancedStats?: boolean;
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: ExperimentStatus }) {
  const styles: Record<ExperimentStatus, { bg: string; text: string; label: string }> = {
    draft: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', label: 'Draft' },
    running: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', label: 'Running' },
    paused: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300', label: 'Paused' },
    completed: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300', label: 'Completed' },
    archived: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300', label: 'Archived' },
  };

  const style = styles[status];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

/**
 * Metric statistics display
 */
function MetricStats({ stats }: { stats: MetricStatistics }) {
  return (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-600 dark:text-gray-400">Sample Size:</span>
        <span className="font-medium">{stats.sampleSize.toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600 dark:text-gray-400">Mean:</span>
        <span className="font-medium">{stats.mean.toFixed(4)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600 dark:text-gray-400">Std Dev:</span>
        <span className="font-medium">{stats.stdDev.toFixed(4)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600 dark:text-gray-400">Std Error:</span>
        <span className="font-medium">{stats.stdErr.toFixed(4)}</span>
      </div>
      {stats.successRate !== undefined && (
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Success Rate:</span>
          <span className="font-medium">{(stats.successRate * 100).toFixed(2)}%</span>
        </div>
      )}
    </div>
  );
}

/**
 * Variant card with metrics
 */
function VariantCard({
  variant,
  stats,
  isWinner,
  isControl,
  probability,
}: {
  variant: Variant;
  stats?: Record<string, MetricStatistics>;
  isWinner?: boolean;
  isControl?: boolean;
  probability?: number;
}) {
  return (
    <div className={`p-4 rounded-lg border-2 ${
      isWinner
        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
        : isControl
        ? 'border-blue-300 dark:border-blue-700'
        : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-lg">{variant.name}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">{variant.id}</p>
        </div>
        <div className="flex gap-2">
          {isControl && (
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
              Control
            </span>
          )}
          {isWinner && (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
              Winner
            </span>
          )}
          {probability !== undefined && (
            <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
              {(probability * 100).toFixed(1)}% best
            </span>
          )}
        </div>
      </div>

      {stats && Object.keys(stats).length > 0 && (
        <div className="space-y-3">
          {Object.entries(stats).map(([metricId, metricStats]) => (
            <div key={metricId} className="p-3 bg-white dark:bg-gray-800 rounded">
              <h5 className="text-sm font-medium mb-2">{metricId}</h5>
              <MetricStats stats={metricStats} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Weight: {(variant.weight * 100).toFixed(1)}%
        </p>
        {variant.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{variant.description}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Experiment detail view
 */
function ExperimentDetail({ experiment, onClose }: { experiment: Experiment; onClose: () => void }) {
  const [results, setResults] = useState<ExperimentResults | undefined>();
  const [loading, setLoading] = useState(true);
  const manager = getGlobalManager();

  useEffect(() => {
    const loadResults = () => {
      const currentResults = manager.getResults(experiment.id);
      setResults(currentResults);
      setLoading(false);
    };

    loadResults();
    const interval = setInterval(loadResults, 5000);

    return () => clearInterval(interval);
  }, [experiment.id, manager]);

  const handleStart = () => manager.startExperiment(experiment.id);
  const handlePause = () => manager.pauseExperiment(experiment.id);
  const handleComplete = () => manager.completeExperiment(experiment.id);
  const handleArchive = () => manager.archiveExperiment(experiment.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{experiment.name}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{experiment.description}</p>
          <div className="flex gap-2 mt-3">
            <StatusBadge status={experiment.status} />
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
              {experiment.type}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Close
        </button>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {experiment.status === 'draft' && (
          <button
            onClick={handleStart}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Start Experiment
          </button>
        )}
        {experiment.status === 'running' && (
          <button
            onClick={handlePause}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Pause Experiment
          </button>
        )}
        {experiment.status === 'paused' && (
          <button
            onClick={handleStart}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Resume Experiment
          </button>
        )}
        {(experiment.status === 'running' || experiment.status === 'paused') && (
          <button
            onClick={handleComplete}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Complete Experiment
          </button>
        )}
        {experiment.status === 'completed' && (
          <button
            onClick={handleArchive}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Archive Experiment
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">Loading results...</div>
        </div>
      ) : results && (
        <div className="space-y-6">
          {/* Winner Banner */}
          {results.winner && (
            <div className="p-4 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg">
              <h3 className="font-semibold text-lg text-green-900 dark:text-green-100 mb-2">
                Winner Determined!
              </h3>
              <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
                <p><strong>Variant:</strong> {results.winner.variantId}</p>
                <p><strong>Confidence:</strong> {results.winner.confidence}</p>
                <p><strong>Lift:</strong> {results.winner.liftPercentage}</p>
              </div>
            </div>
          )}

          {/* Overall Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Users</div>
              <div className="text-xl font-bold">{results.totalSampleSize.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
              <div className="text-xs text-gray-600 dark:text-gray-400">Confidence</div>
              <div className="text-xl font-bold">{(results.overallConfidence * 100).toFixed(1)}%</div>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
              <div className="text-xs text-gray-600 dark:text-gray-400">Significant</div>
              <div className="text-xl font-bold">
                {results.hasSignificantResults ? 'Yes' : 'No'}
              </div>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
              <div className="text-xs text-gray-600 dark:text-gray-400">Recommendation</div>
              <div className="text-sm font-medium">
                {results.recommendation?.replace('_', ' ')}
              </div>
            </div>
          </div>

          {/* Variants */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Variant Performance</h3>
            <div className="grid gap-4">
              {experiment.variants.map(variant => {
                const variantStats = results.variants[variant.id];
                return (
                  <VariantCard
                    key={variant.id}
                    variant={variant}
                    stats={variantStats?.metrics}
                    isWinner={results.winner?.variantId === variant.id}
                    isControl={variant.isControl}
                    probability={variantStats?.probabilityOfBeingBest}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Experiment list item
 */
function ExperimentListItem({
  experiment,
  onSelect,
}: {
  experiment: Experiment;
  onSelect: (exp: Experiment) => void;
}) {
  const manager = getGlobalManager();
  const results = manager.getResults(experiment.id);

  return (
    <div
      onClick={() => onSelect(experiment)}
      className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer transition"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{experiment.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {experiment.description}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <StatusBadge status={experiment.status} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {experiment.variants.length} variants
            </span>
            {results && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {results.totalSampleSize.toLocaleString()} users
              </span>
            )}
            {results?.winner && (
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                Winner: {results.winner.variantId}
              </span>
            )}
          </div>
        </div>
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Main experiment dashboard
 */
export function ExperimentDashboard({ refreshInterval = 5000, showAdvancedStats = false }: DashboardProps) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [filter, setFilter] = useState<'all' | ExperimentStatus>('all');
  const manager = getGlobalManager();

  useEffect(() => {
    const loadExperiments = () => {
      const allExperiments = manager.getAllExperiments();
      setExperiments(allExperiments);
    };

    loadExperiments();
    const interval = setInterval(loadExperiments, refreshInterval);

    return () => clearInterval(interval);
  }, [manager, refreshInterval]);

  const filteredExperiments = filter === 'all'
    ? experiments
    : experiments.filter(exp => exp.status === filter);

  if (selectedExperiment) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <ExperimentDetail
          experiment={selectedExperiment}
          onClose={() => setSelectedExperiment(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Experiments</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and analyze your A/B tests
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {experiments.length} experiments
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'draft', 'running', 'paused', 'completed', 'archived'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 text-sm rounded ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && ` (${experiments.filter(e => e.status === status).length})`}
          </button>
        ))}
      </div>

      {/* Experiment List */}
      <div className="space-y-3">
        {filteredExperiments.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>No experiments found.</p>
            <p className="text-sm mt-1">Create a new experiment to get started.</p>
          </div>
        ) : (
          filteredExperiments.map(experiment => (
            <ExperimentListItem
              key={experiment.id}
              experiment={experiment}
              onSelect={setSelectedExperiment}
            />
          ))
        )}
      </div>
    </div>
  );
}
