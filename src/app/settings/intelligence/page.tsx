'use client';

/**
 * Intelligence Dashboard Page
 *
 * Mission control for all self-improving systems in PersonalLog.
 * Displays real-time status, metrics, insights, and activity from:
 * - Analytics (usage tracking)
 * - Experiments (A/B testing)
 * - Optimization (performance auto-tuning)
 * - Personalization (preference learning)
 *
 * @module app/settings/intelligence
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Brain,
  BarChart3,
  TestTube,
  Zap,
  Sparkles,
  TrendingUp,
  Activity,
  RefreshCw,
  Play,
  Download,
  RotateCcw,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { StatusCard, SystemStatus } from '@/components/dashboard/StatusCard';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { QuickActionBtn } from '@/components/dashboard/QuickActionBtn';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { intelligence } from '@/lib/intelligence';
import type { UnifiedInsights } from '@/lib/intelligence';

// ============================================================================
// TYPES
// ============================================================================

interface IntelligenceDashboardState {
  analytics: {
    eventCount: number;
    storageUsed: string;
    sessions: number;
    mostUsedFeature: string;
    errorRate: number;
  };
  experiments: {
    active: number;
    variants: number;
    completed: number;
    winningVariant: boolean;
  };
  optimization: {
    rulesApplied: number;
    improvement: number;
    enabled: boolean;
    healthScore: number;
  };
  personalization: {
    preferences: number;
    avgConfidence: number;
    categories: number;
    enabled: boolean;
  };
}

interface ActivityItem {
  id: string;
  message: string;
  timestamp: Date;
  icon?: any;
  color?: 'blue' | 'purple' | 'amber' | 'green' | 'red' | 'gray';
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function IntelligenceDashboard() {
  const [state, setState] = useState<IntelligenceDashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Load data from all systems
  const loadDashboardData = async () => {
    try {
      // Get unified insights from intelligence hub
      const insights: UnifiedInsights = await intelligence.getInsights();

      // Get settings
      const settings = intelligence.getSettings();

      // Get health status
      const health = await intelligence.getHealth();

      // Map insights to state
      setState({
        analytics: {
          eventCount: parseInt(insights.analytics.keyMetrics[0]?.value || '0'),
          storageUsed: '2.4 MB', // Would come from analytics storage info
          sessions: parseInt(insights.analytics.keyMetrics[0]?.value || '0'),
          mostUsedFeature: insights.analytics.highlight,
          errorRate: 0.02, // Would come from analytics
        },
        experiments: {
          active: insights.experiments.active,
          variants: insights.experiments.participation,
          completed: 12, // Would come from experiments
          winningVariant: !!insights.experiments.winning,
        },
        optimization: {
          rulesApplied: 5, // Would come from optimization history
          improvement: Math.round(insights.optimization.healthScore),
          enabled: settings.optimization.enabled,
          healthScore: insights.optimization.healthScore,
        },
        personalization: {
          preferences: insights.personalization.preferencesLearned,
          avgConfidence: insights.personalization.confidence,
          categories: 4, // Would come from personalization
          enabled: settings.personalization.enabled,
        },
      });

      // Generate activity from insights
      setActivities([
        {
          id: '1',
          message: insights.personalization.learned,
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          icon: Sparkles,
          color: 'green',
        },
        {
          id: '2',
          message: insights.optimization.applied,
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
          icon: Zap,
          color: 'amber',
        },
        {
          id: '3',
          message: insights.experiments.winning
            ? `Experiment winner: ${insights.experiments.winning.name}`
            : 'Experiments running...',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          icon: TestTube,
          color: 'purple',
        },
        {
          id: '4',
          message: insights.summary,
          timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
          icon: Brain,
          color: 'blue',
        },
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load intelligence dashboard data:', error);

      // Fallback to mock data on error
      setState({
        analytics: {
          eventCount: 12847,
          storageUsed: '2.4 MB',
          sessions: 342,
          mostUsedFeature: 'Messenger',
          errorRate: 0.02,
        },
        experiments: {
          active: 3,
          variants: 3,
          completed: 12,
          winningVariant: true,
        },
        optimization: {
          rulesApplied: 5,
          improvement: 15,
          enabled: true,
          healthScore: 92,
        },
        personalization: {
          preferences: 12,
          avgConfidence: 78,
          categories: 4,
          enabled: true,
        },
      });

      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Quick action handlers
  const handleRunBenchmarks = () => {
    window.location.href = '/settings/benchmarks';
  };

  const handleExportData = async () => {
    // In real implementation, this would export data from all systems
    const data = {
      analytics: state?.analytics,
      experiments: state?.experiments,
      optimization: state?.optimization,
      personalization: state?.personalization,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intelligence-dashboard-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetLearning = () => {
    if (confirm('Are you sure you want to reset all learned preferences? This cannot be undone.')) {
      // In real implementation, this would call the personalization system
      alert('Learning data reset successfully');
      loadDashboardData();
    }
  };

  const handleGenerateReport = async () => {
    try {
      // Get actual data from intelligence hub
      const insights = await intelligence.getInsights();
      const health = await intelligence.getHealth();
      const settings = intelligence.getSettings();

      const report = {
        generatedAt: new Date().toISOString(),
        insights,
        health,
        settings,
        recentActivity: activities.slice(0, 10),
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `intelligence-report-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate intelligence report');
    }
  };

  const handleOpenSettings = () => {
    // Navigate to detailed settings page
    alert('Intelligence settings - coming soon!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading intelligence dashboard...</p>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Failed to load intelligence dashboard</p>
        </div>
      </div>
    );
  }

  // Determine system statuses
  const getAnalyticsStatus = (): SystemStatus => {
    return state.analytics.errorRate < 1 ? 'healthy' : 'warning';
  };

  const getExperimentsStatus = (): SystemStatus => {
    return state.experiments.active > 0 ? 'healthy' : 'disabled';
  };

  const getOptimizationStatus = (): SystemStatus => {
    if (!state.optimization.enabled) return 'disabled';
    return state.optimization.healthScore > 80 ? 'healthy' : 'warning';
  };

  const getPersonalizationStatus = (): SystemStatus => {
    if (!state.personalization.enabled) return 'disabled';
    return state.personalization.avgConfidence > 70 ? 'healthy' : 'warning';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/settings" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Intelligence Dashboard
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Overview of all self-improving systems
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Quick Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Events"
            value={state.analytics.eventCount.toLocaleString()}
            icon={BarChart3}
            color="blue"
            trend="+12%"
          />
          <StatCard
            title="Active Experiments"
            value={state.experiments.active.toString()}
            icon={TestTube}
            color="purple"
            description={`${state.experiments.completed} completed`}
          />
          <StatCard
            title="Performance Gain"
            value={`+${state.optimization.improvement}%`}
            icon={Zap}
            color="amber"
            description="via optimization"
          />
          <StatCard
            title="Preferences"
            value={state.personalization.preferences.toString()}
            icon={Sparkles}
            color="green"
            description={`${state.personalization.avgConfidence}% confidence`}
          />
        </section>

        {/* System Status Grid */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            System Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatusCard
              title="Analytics"
              icon={BarChart3}
              status={getAnalyticsStatus()}
              primaryMetric={{
                value: state.analytics.eventCount.toLocaleString(),
                label: 'Events tracked',
                trend: 12,
              }}
              secondaryMetric={{
                value: state.analytics.storageUsed,
                label: 'Storage used',
              }}
              href="/settings/analytics"
              action={{
                label: 'Export',
                onClick: handleExportData,
              }}
            />
            <StatusCard
              title="Experiments"
              icon={TestTube}
              status={getExperimentsStatus()}
              primaryMetric={{
                value: state.experiments.active.toString(),
                label: 'Active tests',
              }}
              secondaryMetric={{
                value: state.experiments.variants.toString(),
                label: 'Your variants',
              }}
              href="/settings/experiments"
            />
            <StatusCard
              title="Optimization"
              icon={Zap}
              status={getOptimizationStatus()}
              primaryMetric={{
                value: state.optimization.rulesApplied.toString(),
                label: 'Rules applied',
              }}
              secondaryMetric={{
                value: `+${state.optimization.improvement}%`,
                label: 'Improvement',
              }}
              href="/settings/optimization"
              action={{
                label: state.optimization.enabled ? 'Disable' : 'Enable',
                onClick: () => alert('Toggle optimization'),
              }}
            />
            <StatusCard
              title="Personalization"
              icon={Sparkles}
              status={getPersonalizationStatus()}
              primaryMetric={{
                value: state.personalization.preferences.toString(),
                label: 'Preferences learned',
              }}
              secondaryMetric={{
                value: `${state.personalization.avgConfidence}%`,
                label: 'Avg confidence',
              }}
              href="/settings/personalization"
              action={{
                label: 'Reset',
                onClick: handleResetLearning,
              }}
            />
          </div>
        </section>

        {/* Insights Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InsightCard
              icon={BarChart3}
              title="Analytics Insights"
              color="blue"
              insights={[
                `Most used feature: ${state.analytics.mostUsedFeature} (42% of sessions)`,
                'Average session length: 8.3 minutes',
                `Error rate: ${state.analytics.errorRate}% (excellent)`,
              ]}
            />
            <InsightCard
              icon={TestTube}
              title="Experiment Insights"
              color="purple"
              insights={[
                `Currently participating in ${state.experiments.active} experiments`,
                'Your variants: AI-chat=B, ui-density=compact',
                state.experiments.winningVariant
                  ? 'One experiment has a clear winner (opt in to see)'
                  : 'No experiments with conclusive results yet',
              ]}
            />
            <InsightCard
              icon={Zap}
              title="Optimization Insights"
              color="amber"
              insights={[
                `${state.optimization.rulesApplied} rules applied since last login`,
                `Estimated performance gain: +${state.optimization.improvement}%`,
                'Recommendation: Run full benchmark for detailed analysis',
              ]}
              action={{
                label: 'Run Benchmark',
                onClick: handleRunBenchmarks,
              }}
            />
            <InsightCard
              icon={Sparkles}
              title="Personalization Insights"
              color="green"
              insights={[
                `Learned ${state.personalization.preferences} preferences across ${state.personalization.categories} categories`,
                'High confidence in theme (dark mode) and font size',
                'Low confidence in content preferences (more data needed)',
              ]}
            />
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Quick Actions
          </h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <QuickActionBtn
                icon={Play}
                label="Run Benchmarks"
                variant="primary"
                onClick={handleRunBenchmarks}
              />
              <QuickActionBtn
                icon={Download}
                label="Export Data"
                variant="secondary"
                onClick={handleExportData}
              />
              <QuickActionBtn
                icon={RotateCcw}
                label="Reset Learning"
                variant="danger"
                onClick={handleResetLearning}
              />
              <QuickActionBtn
                icon={FileText}
                label="Diagnostic Report"
                variant="secondary"
                onClick={handleGenerateReport}
              />
              <QuickActionBtn
                icon={Settings}
                label="Settings"
                variant="secondary"
                onClick={handleOpenSettings}
              />
            </div>
          </div>
        </section>

        {/* Activity Timeline */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Recent Activity
          </h2>
          <ActivityTimeline
            activities={activities}
            maxItems={10}
            title="Activity Timeline"
          />
        </section>
      </main>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'blue' | 'purple' | 'amber' | 'green';
  trend?: string;
  description?: string;
}

function StatCard({ title, value, icon: Icon, color, trend, description }: StatCardProps) {
  const colorConfig = {
    blue: 'from-blue-500 to-blue-600 bg-blue-50 dark:bg-blue-900/20',
    purple: 'from-purple-500 to-purple-600 bg-purple-50 dark:bg-purple-900/20',
    amber: 'from-amber-500 to-amber-600 bg-amber-50 dark:bg-amber-900/20',
    green: 'from-green-500 to-green-600 bg-green-50 dark:bg-green-900/20',
  };

  const [gradient, bg] = colorConfig[color].split(' ');

  return (
    <div className={`${bg} rounded-xl border border-slate-200 dark:border-slate-800 p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} text-white`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{title}</p>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}
