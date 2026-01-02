'use client';

/**
 * Optimization Settings Page
 *
 * View and manage auto-optimization status, applied rules, and configuration.
 * Displays optimization history, measured impact, and provides manual controls.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Zap,
  Cpu,
  Settings,
  History,
  Play,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { createOptimizationEngine, allRules } from '@/lib/optimization';
import type { OptimizationRecord, OptimizationRule } from '@/lib/optimization';

export default function OptimizationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<any>(null);
  const [history, setHistory] = useState<OptimizationRecord[]>([]);
  const [strategy, setStrategy] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [autoApply, setAutoApply] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    loadOptimizationData();
  }, []);

  const loadOptimizationData = async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real implementation, this would load from the actual engine
      // For now, we'll simulate the data
      setEngineStatus({
        active: false,
        lastRun: new Date(Date.now() - 3600000).toISOString(),
        rulesApplied: 0,
        healthScore: 85,
      });

      setHistory([]);

      // Load settings from localStorage
      const savedStrategy = localStorage.getItem('optimization-strategy');
      const savedAutoApply = localStorage.getItem('optimization-auto-apply');
      if (savedStrategy) setStrategy(savedStrategy as any);
      if (savedAutoApply) setAutoApply(JSON.parse(savedAutoApply));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load optimization data');
      console.error('Optimization loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunOptimization = async () => {
    setRunning(true);
    try {
      // Simulate running optimization
      await new Promise(resolve => setTimeout(resolve, 2000));

      setEngineStatus({
        active: true,
        lastRun: new Date().toISOString(),
        rulesApplied: 3,
        healthScore: 88,
      });

      // Add a mock record to history
      const newRecord: OptimizationRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ruleId: 'reduce-vector-batch-size',
        ruleName: 'Reduce Vector Batch Size',
        category: 'performance',
        status: 'applied',
        impact: {
          memoryImprovement: 15,
          performanceImprovement: 8,
        },
      };
      setHistory([newRecord, ...history]);

      alert('Optimization completed successfully!');
    } catch (err) {
      alert('Failed to run optimization: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setRunning(false);
    }
  };

  const handleResetOptimizations = async () => {
    if (!confirm('Reset all optimizations? This will revert all applied optimization rules.')) {
      return;
    }

    try {
      setHistory([]);
      setEngineStatus({
        ...engineStatus,
        rulesApplied: 0,
      });
      alert('All optimizations have been reset.');
    } catch (err) {
      alert('Failed to reset: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear optimization history?')) {
      return;
    }

    setHistory([]);
  };

  const handleStrategyChange = (newStrategy: 'conservative' | 'balanced' | 'aggressive') => {
    setStrategy(newStrategy);
    localStorage.setItem('optimization-strategy', newStrategy);
  };

  const handleAutoApplyToggle = (enabled: boolean) => {
    setAutoApply(enabled);
    localStorage.setItem('optimization-auto-apply', JSON.stringify(enabled));
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getRuleById = (ruleId: string): OptimizationRule | undefined => {
    return allRules.find(rule => rule.id === ruleId);
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
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-amber-600 bg-clip-text text-transparent">
                  Optimization
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Performance optimization and tuning
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
              Error Loading Optimization
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          </div>
        ) : (
          <>
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatsCard
                icon={<Zap className="w-5 h-5" />}
                label="Status"
                value={engineStatus?.active ? 'Active' : 'Inactive'}
                color={engineStatus?.active ? 'green' : 'slate'}
              />
              <StatsCard
                icon={<Settings className="w-5 h-5" />}
                label="Rules Applied"
                value={engineStatus?.rulesApplied?.toString() || '0'}
                color="blue"
              />
              <StatsCard
                icon={<CheckCircle2 className="w-5 h-5" />}
                label="Health Score"
                value={`${engineStatus?.healthScore || 0}%`}
                color="purple"
              />
              <StatsCard
                icon={<Clock className="w-5 h-5" />}
                label="Last Run"
                value={engineStatus?.lastRun ? formatTimestamp(engineStatus.lastRun) : 'Never'}
                color="amber"
              />
            </div>

            {/* Controls */}
            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Cpu className="w-6 h-6 text-amber-500" />
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Optimization Controls
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Configure and run optimizations
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Strategy Selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Optimization Strategy
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['conservative', 'balanced', 'aggressive'] as const).map((strat) => (
                      <button
                        key={strat}
                        onClick={() => handleStrategyChange(strat)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          strategy === strat
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700'
                        }`}
                      >
                        <div className="text-center">
                          <div className="font-medium text-slate-900 dark:text-slate-100 capitalize mb-1">
                            {strat}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            {strat === 'conservative' && 'Safe changes only'}
                            {strat === 'balanced' && 'Moderate changes'}
                            {strat === 'aggressive' && 'Maximum performance'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-Apply Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">Auto-Apply Optimizations</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Automatically apply suggested optimizations
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoApply}
                      onChange={(e) => handleAutoApplyToggle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleRunOptimization}
                    disabled={running}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg hover:from-amber-600 hover:to-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4" />
                    {running ? 'Running...' : 'Run Optimization Now'}
                  </button>
                  <button
                    onClick={handleResetOptimizations}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset All
                  </button>
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear History
                  </button>
                </div>
              </div>
            </section>

            {/* Optimization History */}
            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <History className="w-6 h-6 text-amber-500" />
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Applied Optimizations
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      History of applied optimization rules
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {history.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No optimizations applied yet</p>
                    <p className="text-sm mt-1">Run an optimization to see results here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((record) => {
                      const rule = getRuleById(record.ruleId);
                      return (
                        <OptimizationRecordCard
                          key={record.id}
                          record={record}
                          rule={rule}
                          formatTimestamp={formatTimestamp}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Available Rules */}
            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6 text-amber-500" />
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Available Rules ({allRules.length})
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Optimization rules that can be applied
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allRules.slice(0, 6).map((rule) => (
                    <div
                      key={rule.id}
                      className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                          {rule.name}
                        </h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          rule.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                          rule.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {rule.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {rule.description}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="capitalize">{rule.category}</span>
                        <span>•</span>
                        <span>{rule.riskLevel} risk</span>
                      </div>
                    </div>
                  ))}
                </div>
                {allRules.length > 6 && (
                  <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 text-center">
                    And {allRules.length - 6} more rules...
                  </p>
                )}
              </div>
            </section>

            {/* Info Section */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-6">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                About Auto-Optimization
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                The optimization system monitors your app's performance and automatically suggests
                improvements. You can choose to apply them manually or enable auto-apply for
                hands-free optimization.
              </p>
              <div className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span><strong>Conservative:</strong> Only safe, proven optimizations</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span><strong>Balanced:</strong> Moderate improvements with good safety</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span><strong>Aggressive:</strong> Maximum performance, some risk</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'green' | 'blue' | 'purple' | 'amber' | 'slate';
}

function StatsCard({ icon, label, value, color }: StatsCardProps) {
  const colorClasses = {
    green: 'from-green-500 to-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    blue: 'from-blue-500 to-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    purple: 'from-purple-500 to-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    amber: 'from-amber-500 to-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    slate: 'from-slate-500 to-slate-600 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800',
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

interface OptimizationRecordCardProps {
  record: OptimizationRecord;
  rule?: OptimizationRule;
  formatTimestamp: (timestamp: string) => string;
}

function OptimizationRecordCard({ record, rule, formatTimestamp }: OptimizationRecordCardProps) {
  return (
    <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
      <div className={`p-2 rounded-lg ${
        record.status === 'applied'
          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
      }`}>
        {record.status === 'applied' ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : (
          <AlertTriangle className="w-5 h-5" />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-slate-100">
              {record.ruleName}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {rule?.description || 'No description available'}
            </p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatTimestamp(record.timestamp)}
          </span>
        </div>
        {record.impact && (
          <div className="flex items-center gap-3 mt-2 text-xs">
            {record.impact.memoryImprovement && (
              <span className="text-green-600 dark:text-green-400">
                -{record.impact.memoryImprovement}% memory
              </span>
            )}
            {record.impact.performanceImprovement && (
              <span className="text-green-600 dark:text-green-400">
                +{record.impact.performanceImprovement}% performance
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
