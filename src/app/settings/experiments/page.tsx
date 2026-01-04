'use client';

/**
 * Experiments Settings Page - Enhanced
 *
 * Complete A/B testing dashboard with:
 * - Real-time experiment monitoring
 * - Statistical analysis and visualization
 * - Experiment creation and management
 * - Sample size calculator
 * - Results export
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  TestTube,
  GitBranch,
  Scale,
  ToggleLeft,
  RotateCcw,
  Info,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  Plus,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  BarChart3,
  Download,
  Upload,
  Calculator,
  Eye,
  EyeOff,
  Zap,
  Award,
} from 'lucide-react';
import { getGlobalManager, initializeExampleExperiments, calculateSampleSize } from '@/lib/experiments';
import type { Experiment, UserAssignment, ExperimentResults } from '@/lib/experiments';

export default function ExperimentsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [results, setResults] = useState<Map<string, ExperimentResults>>(new Map());
  const [assignments, setAssignments] = useState<Map<string, UserAssignment>>(new Map());
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [selectedResults, setSelectedResults] = useState<ExperimentResults | null>(null);
  const [optedOut, setOptedOut] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const manager = getGlobalManager();

      // Initialize example experiments if first time
      if (!initialized) {
        initializeExampleExperiments();
        setInitialized(true);
      }

      // Get all experiments
      const allExperiments = manager.getAllExperiments();
      setExperiments(allExperiments);

      // Get results for all experiments
      const resultsMap = new Map<string, ExperimentResults>();
      for (const exp of allExperiments) {
        try {
          const expResults = manager.getResults(exp.id);
          if (expResults) {
            resultsMap.set(exp.id, expResults);
          }
        } catch (err) {
          // Skip experiments without results
        }
      }
      setResults(resultsMap);

      // Get assignments
      const assignmentMap = new Map<string, UserAssignment>();
      for (const exp of allExperiments) {
        try {
          const assignment = manager.getAssignment(exp.id, 'user-1');
          if (assignment) {
            assignmentMap.set(exp.id, assignment);
          }
        } catch (err) {
          console.error(`Failed to get assignment for ${exp.id}:`, err);
        }
      }
      setAssignments(assignmentMap);

      // Load opt-out status from localStorage
      const savedOptOuts = localStorage.getItem('experiment-opt-outs');
      if (savedOptOuts) {
        setOptedOut(new Set(JSON.parse(savedOptOuts)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experiments');
      console.error('Experiments loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExperiment = async (experimentId: string) => {
    try {
      const manager = getGlobalManager();
      manager.startExperiment(experimentId);
      await loadData();
    } catch (err) {
      alert('Failed to start experiment: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handlePauseExperiment = async (experimentId: string) => {
    try {
      const manager = getGlobalManager();
      manager.pauseExperiment(experimentId);
      await loadData();
    } catch (err) {
      alert('Failed to pause experiment: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleCompleteExperiment = async (experimentId: string) => {
    if (!confirm('Complete this experiment? This will determine a winner and stop data collection.')) {
      return;
    }

    try {
      const manager = getGlobalManager();
      manager.completeExperiment(experimentId);
      await loadData();
    } catch (err) {
      alert('Failed to complete experiment: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleOptOut = async (experimentId: string) => {
    const newOptedOut = new Set(optedOut);
    newOptedOut.add(experimentId);
    setOptedOut(newOptedOut);
    localStorage.setItem('experiment-opt-outs', JSON.stringify([...newOptedOut]));
  };

  const handleOptIn = async (experimentId: string) => {
    const newOptedOut = new Set(optedOut);
    newOptedOut.delete(experimentId);
    setOptedOut(newOptedOut);
    localStorage.setItem('experiment-opt-outs', JSON.stringify([...newOptedOut]));
  };

  const handleResetRandomization = async () => {
    if (!confirm('Reset all experiment assignments? You will be re-assigned to new variants.')) {
      return;
    }

    try {
      localStorage.removeItem('personallog-experiments-assignments');
      setOptedOut(new Set());
      localStorage.removeItem('experiment-opt-outs');
      await loadData();
      alert('All experiment assignments have been reset.');
    } catch (err) {
      alert('Failed to reset assignments: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleExportData = async () => {
    try {
      const manager = getGlobalManager();
      const data = manager.exportExperiments();

      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `experiments-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export data: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const manager = getGlobalManager();
      manager.importExperiments(text);
      await loadData();
      alert('Experiments imported successfully!');
    } catch (err) {
      alert('Failed to import data: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }

    // Reset input
    event.target.value = '';
  };

  const handleViewResults = (experiment: Experiment) => {
    const expResults = results.get(experiment.id);
    setSelectedExperiment(experiment);
    setSelectedResults(expResults || null);
  };

  const getExperimentStatus = (experiment: Experiment) => {
    const expResults = results.get(experiment.id);

    if (experiment.status === 'completed' && expResults?.winner) {
      return {
        icon: <Award className="w-4 h-4" />,
        text: 'Winner: ' + expResults.winner.variantId,
        color: 'text-green-600 dark:text-green-400',
      };
    }

    if (experiment.status === 'running') {
      return {
        icon: <Play className="w-4 h-4" />,
        text: 'Running',
        color: 'text-blue-600 dark:text-blue-400',
      };
    }

    if (experiment.status === 'paused') {
      return {
        icon: <Pause className="w-4 h-4" />,
        text: 'Paused',
        color: 'text-amber-600 dark:text-amber-400',
      };
    }

    return {
      icon: <Eye className="w-4 h-4" />,
      text: experiment.status,
      color: 'text-slate-600 dark:text-slate-400',
    };
  };

  const formatDate = (date: number | string | Date) => {
    const d = typeof date === 'number' ? new Date(date) :
              typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  };

  const getVariantColor = (variant: string) => {
    const colors: Record<string, string> = {
      control: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
      variant_a: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
      variant_b: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700',
      variant_c: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
    };
    return colors[variant] || colors.control;
  };

  const activeExperiments = experiments.filter(exp => exp.status === 'running');
  const draftExperiments = experiments.filter(exp => exp.status === 'draft');
  const completedExperiments = experiments.filter(exp => exp.status === 'completed');

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
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <TestTube className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-600 bg-clip-text text-transparent">
                  Experiments
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  A/B testing framework and analytics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCalculator(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                <Calculator className="w-4 h-4" />
                Sample Size
              </button>
              <button
                onClick={handleExportData}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleResetRandomization}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
              Error Loading Experiments
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <StatsCard
                icon={<TestTube className="w-5 h-5" />}
                label="Active Experiments"
                value={activeExperiments.length.toString()}
                color="purple"
              />
              <StatsCard
                icon={<CheckCircle2 className="w-5 h-5" />}
                label="Completed"
                value={completedExperiments.length.toString()}
                color="green"
              />
              <StatsCard
                icon={<Users className="w-5 h-5" />}
                label="Participating"
                value={assignments.size.toString()}
                color="blue"
              />
              <StatsCard
                icon={<ToggleLeft className="w-5 h-5" />}
                label="Opted Out"
                value={optedOut.size.toString()}
                color="amber"
              />
            </div>

            {/* Draft Experiments */}
            {draftExperiments.length > 0 && (
              <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Eye className="w-6 h-6 text-slate-500" />
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                          Draft Experiments
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Ready to start
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {draftExperiments.map((experiment) => (
                    <ExperimentCard
                      key={experiment.id}
                      experiment={experiment}
                      assignment={assignments.get(experiment.id)}
                      results={results.get(experiment.id)}
                      isOptedOut={optedOut.has(experiment.id)}
                      onOptOut={() => handleOptOut(experiment.id)}
                      onOptIn={() => handleOptIn(experiment.id)}
                      onStart={() => handleStartExperiment(experiment.id)}
                      onViewResults={() => handleViewResults(experiment)}
                      getVariantColor={getVariantColor}
                      getExperimentStatus={getExperimentStatus}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Active Experiments */}
            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <TestTube className="w-6 h-6 text-purple-500" />
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Active Experiments
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Currently running and collecting data
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {activeExperiments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <TestTube className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No active experiments at this time</p>
                  </div>
                ) : (
                  activeExperiments.map((experiment) => (
                    <ExperimentCard
                      key={experiment.id}
                      experiment={experiment}
                      assignment={assignments.get(experiment.id)}
                      results={results.get(experiment.id)}
                      isOptedOut={optedOut.has(experiment.id)}
                      onOptOut={() => handleOptOut(experiment.id)}
                      onOptIn={() => handleOptIn(experiment.id)}
                      onPause={() => handlePauseExperiment(experiment.id)}
                      onComplete={() => handleCompleteExperiment(experiment.id)}
                      onViewResults={() => handleViewResults(experiment)}
                      getVariantColor={getVariantColor}
                      getExperimentStatus={getExperimentStatus}
                    />
                  ))
                )}
              </div>
            </section>

            {/* Completed Experiments */}
            {completedExperiments.length > 0 && (
              <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <Award className="w-6 h-6 text-green-500" />
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Completed Experiments
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Past experiments with results
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {completedExperiments.map((experiment) => (
                    <ExperimentCard
                      key={experiment.id}
                      experiment={experiment}
                      assignment={assignments.get(experiment.id)}
                      results={results.get(experiment.id)}
                      isOptedOut={false}
                      onOptOut={() => {}}
                      onOptIn={() => {}}
                      onViewResults={() => handleViewResults(experiment)}
                      getVariantColor={getVariantColor}
                      getExperimentStatus={getExperimentStatus}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Info Section */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-6">
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                About A/B Testing
              </h3>
              <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                Experiments help us test different variations of features to improve your experience.
                When you participate, you&apos;re randomly assigned to a variant (control or experimental).
                Your participation helps us determine which version works better through statistical analysis.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-purple-700 dark:text-purple-300">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 flex-shrink-0" />
                  <span><strong>Variant Assignment:</strong> Consistent hashing ensures you always get the same variant</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 flex-shrink-0" />
                  <span><strong>Bayesian Analysis:</strong> Probability-based winner determination</span>
                </div>
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 flex-shrink-0" />
                  <span><strong>Opt Out:</strong> You can leave any experiment at any time</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Experiment Results Modal */}
      {selectedExperiment && (
        <ExperimentResultsModal
          experiment={selectedExperiment}
          results={selectedResults}
          assignment={assignments.get(selectedExperiment.id)}
          onClose={() => {
            setSelectedExperiment(null);
            setSelectedResults(null);
          }}
          getVariantColor={getVariantColor}
        />
      )}

      {/* Sample Size Calculator Modal */}
      {showCalculator && (
        <SampleSizeCalculator
          onClose={() => setShowCalculator(false)}
        />
      )}
    </div>
  );
}

interface ExperimentCardProps {
  experiment: Experiment;
  assignment?: UserAssignment;
  results?: ExperimentResults;
  isOptedOut: boolean;
  onOptOut: () => void;
  onOptIn: () => void;
  onStart?: () => void;
  onPause?: () => void;
  onComplete?: () => void;
  onViewResults: () => void;
  getVariantColor: (variant: string) => string;
  getExperimentStatus: (experiment: Experiment) => { icon: React.ReactNode; text: string; color: string };
}

function ExperimentCard({
  experiment,
  assignment,
  results,
  isOptedOut,
  onOptOut,
  onOptIn,
  onStart,
  onPause,
  onComplete,
  onViewResults,
  getVariantColor,
  getExperimentStatus,
}: ExperimentCardProps) {
  const status = getExperimentStatus(experiment);

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              {experiment.name}
            </h3>
            <span className={`flex items-center gap-1 text-xs font-medium ${status.color}`}>
              {status.icon}
              {status.text}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
            {experiment.description}
          </p>
        </div>
        <button
          onClick={onViewResults}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <BarChart3 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {results && results.totalSampleSize > 0 && (
        <div className="mb-3 flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {results.totalSampleSize.toLocaleString()} samples
          </span>
          {results.winner && (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <Award className="w-3 h-3" />
              Winner: {results.winner.variantId} ({results.winner.confidence})
            </span>
          )}
        </div>
      )}

      {assignment && !isOptedOut && (
        <div className="mb-3">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getVariantColor(assignment.variantId)}`}>
            <GitBranch className="w-3 h-3" />
            {assignment.variantId}
          </span>
          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
            Assigned {formatDate(new Date(assignment.assignedAt))}
          </span>
        </div>
      )}

      {isOptedOut && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
            <XCircle className="w-3 h-3" />
            Opted Out
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>{experiment.variants.length} variants</span>
          <span>{experiment.metrics.length} metrics</span>
          {experiment.targetSampleSize && (
            <span>Target: {experiment.targetSampleSize.toLocaleString()}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {experiment.status === 'draft' && onStart && (
            <button
              onClick={onStart}
              className="text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 flex items-center gap-1"
            >
              <Play className="w-3 h-3" />
              Start
            </button>
          )}
          {experiment.status === 'running' && onPause && (
            <button
              onClick={onPause}
              className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1"
            >
              <Pause className="w-3 h-3" />
              Pause
            </button>
          )}
          {experiment.status === 'running' && onComplete && results && results.totalSampleSize >= (experiment.targetSampleSize || 100) && (
            <button
              onClick={onComplete}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
            >
              <Award className="w-3 h-3" />
              Complete
            </button>
          )}
          {!isOptedOut && experiment.status === 'running' && (
            <button
              onClick={onOptOut}
              className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Opt Out
            </button>
          )}
          {isOptedOut && (
            <button
              onClick={onOptIn}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Rejoin
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatsCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: 'purple' | 'green' | 'blue' | 'amber' }) {
  const colorClasses = {
    purple: 'from-purple-500 to-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    green: 'from-green-500 to-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    blue: 'from-blue-500 to-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    amber: 'from-amber-500 to-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border-2 p-6 transition-all hover:shadow-lg ${colorClasses[color].split(' ').slice(2).join(' ')}`}>
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color].split(' ').slice(0, 2).join(' ')} text-white`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

interface ExperimentResultsModalProps {
  experiment: Experiment;
  results: ExperimentResults | null;
  assignment?: UserAssignment;
  onClose: () => void;
  getVariantColor: (variant: string) => string;
}

function ExperimentResultsModal({
  experiment,
  results,
  assignment,
  onClose,
  getVariantColor,
}: ExperimentResultsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-4xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                {experiment.name}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {experiment.description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <XCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Your Assignment */}
          {assignment && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Your Assignment
              </h3>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getVariantColor(assignment.variantId)}`}>
                  <GitBranch className="w-4 h-4" />
                  {assignment.variantId}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {/* Results */}
          {results ? (
            <>
              {/* Winner */}
              {results.winner && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                      Winning Variant
                    </h3>
                  </div>
                  <div className="text-lg font-bold text-green-900 dark:text-green-100 mb-1">
                    {results.winner.variantId}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <div>Confidence: {results.winner.confidence}</div>
                    <div>Lift: {results.winner.liftPercentage}</div>
                    <div>Recommendation: {results.recommendation}</div>
                  </div>
                </div>
              )}

              {/* Variant Statistics */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Variant Performance
                </h3>
                <div className="space-y-3">
                  {Object.entries(results.variants).map(([variantId, stats]) => (
                    <div
                      key={variantId}
                      className="border border-slate-200 dark:border-slate-800 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getVariantColor(variantId)}`}>
                          {variantId}
                        </span>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {stats.totalUsers.toLocaleString()} users
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="space-y-2">
                        {Object.entries(stats.metrics).map(([metricId, metricStats]) => {
                          const metric = experiment.metrics.find(m => m.id === metricId);
                          return (
                            <div key={metricId} className="flex items-center justify-between text-sm">
                              <span className="text-slate-700 dark:text-slate-300">
                                {metric?.name || metricId}
                              </span>
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {(metricStats.mean * 100).toFixed(2)}%
                              </span>
                            </div>
                          );
                        })}

                        {stats.probabilityOfBeingBest !== undefined && (
                          <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-slate-700 dark:text-slate-300">
                              Probability of Being Best
                            </span>
                            <span className="font-bold text-purple-600 dark:text-purple-400">
                              {(stats.probabilityOfBeingBest * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {results.totalSampleSize.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Total Samples
                  </div>
                </div>
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {(results.overallConfidence * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Confidence
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No results available yet</p>
            </div>
          )}

          {/* Experiment Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <DetailItem label="Status" value={experiment.status} />
            <DetailItem label="Type" value={experiment.type} />
            <DetailItem label="Objective" value={experiment.objective} />
            <DetailItem
              label="Traffic Allocation"
              value={`${experiment.trafficAllocation * 100}%`}
            />
            <DetailItem label="Confidence Threshold" value={`${(experiment.confidenceThreshold * 100).toFixed(0)}%`} />
            <DetailItem
              label="Early Stopping"
              value={experiment.earlyStoppingEnabled ? 'Enabled' : 'Disabled'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface DetailItemProps {
  label: string;
  value: string | number;
}

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">
        {value}
      </div>
    </div>
  );
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString();
}

// Sample Size Calculator Modal
function SampleSizeCalculator({ onClose }: { onClose: () => void }) {
  const [metricType, setMetricType] = useState<'binary' | 'continuous'>('binary');
  const [baseline, setBaseline] = useState(10);
  const [mde, setMde] = useState(2);
  const [relativeMDE, setRelativeMDE] = useState(true);
  const [variants, setVariants] = useState(2);
  const [result, setResult] = useState<{ sampleSize: string; explanation: string } | null>(null);

  const handleCalculate = () => {
    try {
      const calculated = calculateSampleSize({
        metricType,
        baseline: baseline / 100,
        mde: mde / 100,
        power: 0.80,
        alpha: 0.05,
        variants,
        relativeMDE,
      });

      setResult({
        sampleSize: calculated.sampleSize.toLocaleString(),
        explanation: calculated.explanation,
      });
    } catch (err) {
      alert('Calculation error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Sample Size Calculator
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Calculate required sample size for your experiment
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <XCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Metric Type
            </label>
            <select
              value={metricType}
              onChange={(e) => setMetricType(e.target.value as 'binary' | 'continuous')}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="binary">Binary (conversion rate, success rate)</option>
              <option value="continuous">Continuous (duration, revenue)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Baseline (%)
            </label>
            <input
              type="number"
              value={baseline}
              onChange={(e) => setBaseline(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              placeholder="10"
            />
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Expected baseline conversion rate or mean value
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Minimum Detectable Effect (MDE): {mde}%
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={mde}
              onChange={(e) => setMde(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="relativeMDE"
                checked={relativeMDE}
                onChange={(e) => setRelativeMDE(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="relativeMDE" className="text-sm text-slate-700 dark:text-slate-300">
                Relative to baseline ({(baseline * mde / 100).toFixed(2)}% absolute)
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Number of Variants
            </label>
            <input
              type="number"
              min="2"
              max="10"
              value={variants}
              onChange={(e) => setVariants(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            onClick={handleCalculate}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            Calculate Sample Size
          </button>

          {result && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100 mb-2">
                {result.sampleSize} per variant
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                {result.explanation}
              </p>
            </div>
          )}

          <div className="text-xs text-slate-600 dark:text-slate-400">
            <strong>Assumptions:</strong> 80% statistical power, 95% confidence level,
            Bonferroni correction for multiple comparisons.
          </div>
        </div>
      </div>
    </div>
  );
}
