'use client';

/**
 * Experiments Settings Page
 *
 * View active A/B tests, variant assignments, and manage experiment participation.
 * Displays experiment details, metrics, and provides opt-out controls.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Flask,
  GitBranch,
  Scale,
  ToggleLeft,
  RotateCcw,
  Info,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { getGlobalManager } from '@/lib/experiments';
import type { Experiment, UserAssignment } from '@/lib/experiments';

export default function ExperimentsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [assignments, setAssignments] = useState<Map<string, UserAssignment>>(new Map());
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [optedOut, setOptedOut] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const manager = getGlobalManager();

      // Get all experiments
      const allExperiments = manager.getAllExperiments();
      setExperiments(allExperiments);

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
      // Clear assignment storage
      localStorage.removeItem('personallog-experiments-assignments');

      // Clear opt-outs
      setOptedOut(new Set());
      localStorage.removeItem('experiment-opt-outs');

      // Reload data
      await loadData();

      alert('All experiment assignments have been reset.');
    } catch (err) {
      alert('Failed to reset assignments: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
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

  const activeExperiments = experiments.filter(exp => exp.status === 'active');
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
                <Flask className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-600 bg-clip-text text-transparent">
                  Experiments
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  A/B tests and variant assignments
                </p>
              </div>
            </div>
            <button
              onClick={handleResetRandomization}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Assignments
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <StatsCard
                icon={<Flask className="w-5 h-5" />}
                label="Active Experiments"
                value={activeExperiments.length.toString()}
                color="purple"
              />
              <StatsCard
                icon={<CheckCircle2 className="w-5 h-5" />}
                label="Participating"
                value={assignments.size.toString()}
                color="green"
              />
              <StatsCard
                icon={<ToggleLeft className="w-5 h-5" />}
                label="Opted Out"
                value={optedOut.size.toString()}
                color="amber"
              />
            </div>

            {/* Active Experiments */}
            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Flask className="w-6 h-6 text-purple-500" />
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Active Experiments
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      A/B tests you're currently participating in
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {activeExperiments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <Flask className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No active experiments at this time</p>
                  </div>
                ) : (
                  activeExperiments.map((experiment) => {
                    const assignment = assignments.get(experiment.id);
                    const isOptedOut = optedOut.has(experiment.id);

                    return (
                      <ExperimentCard
                        key={experiment.id}
                        experiment={experiment}
                        assignment={assignment}
                        isOptedOut={isOptedOut}
                        onOptOut={() => handleOptOut(experiment.id)}
                        onOptIn={() => handleOptIn(experiment.id)}
                        onViewDetails={() => setSelectedExperiment(experiment)}
                        getVariantColor={getVariantColor}
                      />
                    );
                  })
                )}
              </div>
            </section>

            {/* Completed Experiments */}
            {completedExperiments.length > 0 && (
              <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Completed Experiments
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Past experiments and their results
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {completedExperiments.map((experiment) => {
                    const assignment = assignments.get(experiment.id);

                    return (
                      <ExperimentCard
                        key={experiment.id}
                        experiment={experiment}
                        assignment={assignment}
                        isOptedOut={false}
                        onOptOut={() => {}}
                        onOptIn={() => {}}
                        onViewDetails={() => setSelectedExperiment(experiment)}
                        getVariantColor={getVariantColor}
                      />
                    );
                  })}
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
                When you participate, you're randomly assigned to a variant (control or experimental).
                Your participation helps us determine which version works better.
              </p>
              <div className="space-y-2 text-sm text-purple-700 dark:text-purple-300">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  <span><strong>Variant Assignment:</strong> Randomly assigned when experiment starts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  <span><strong>Opt Out:</strong> You can leave any experiment at any time</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  <span><strong>Reset:</strong> Re-roll your assignments if desired</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Experiment Details Modal */}
      {selectedExperiment && (
        <ExperimentDetailsModal
          experiment={selectedExperiment}
          assignment={assignments.get(selectedExperiment.id)}
          onClose={() => setSelectedExperiment(null)}
          getVariantColor={getVariantColor}
        />
      )}
    </div>
  );
}

interface ExperimentCardProps {
  experiment: Experiment;
  assignment?: UserAssignment;
  isOptedOut: boolean;
  onOptOut: () => void;
  onOptIn: () => void;
  onViewDetails: () => void;
  getVariantColor: (variant: string) => string;
}

function ExperimentCard({
  experiment,
  assignment,
  isOptedOut,
  onOptOut,
  onOptIn,
  onViewDetails,
  getVariantColor,
}: ExperimentCardProps) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
            {experiment.name}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
            {experiment.description}
          </p>
        </div>
        <button
          onClick={onViewDetails}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Info className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {assignment && !isOptedOut && (
        <div className="mb-3">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getVariantColor(assignment.variant)}`}>
            <GitBranch className="w-3 h-3" />
            {assignment.variant}
          </span>
          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
            Assigned {formatDate(assignment.assignedAt)}
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
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {experiment.variants.length} variants
        </div>
        {!isOptedOut && experiment.status === 'active' && (
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
  );
}

interface ExperimentDetailsModalProps {
  experiment: Experiment;
  assignment?: UserAssignment;
  onClose: () => void;
  getVariantColor: (variant: string) => string;
}

function ExperimentDetailsModal({
  experiment,
  assignment,
  onClose,
  getVariantColor,
}: ExperimentDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto"
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

        <div className="p-6 space-y-6">
          {/* Your Assignment */}
          {assignment && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Your Assignment
              </h3>
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getVariantColor(assignment.variant)}`}>
                  <GitBranch className="w-4 h-4" />
                  {assignment.variant}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Assigned {formatDate(assignment.assignedAt)}
                </span>
              </div>
            </div>
          )}

          {/* All Variants */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              All Variants
            </h3>
            <div className="space-y-2">
              {experiment.variants.map((variant) => (
                <div
                  key={variant.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getVariantColor(variant.id)}`}>
                      {variant.id}
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {variant.weight * 100}% traffic
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Experiment Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <DetailItem label="Status" value={experiment.status} />
            <DetailItem label="Type" value={experiment.type} />
            <DetailItem label="Started" value={formatDate(experiment.startedAt)} />
            <DetailItem
              label="Traffic Allocation"
              value={`${experiment.trafficAllocation * 100}%`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'purple' | 'green' | 'amber';
}

function StatsCard({ icon, label, value, color }: StatsCardProps) {
  const colorClasses = {
    purple: 'from-purple-500 to-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    green: 'from-green-500 to-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
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
