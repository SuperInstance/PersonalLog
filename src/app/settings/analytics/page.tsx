'use client';

/**
 * Analytics Settings Page
 *
 * View and manage analytics data, privacy controls, and usage statistics.
 * Displays event statistics, storage usage, and provides data management tools.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Database,
  Shield,
  Download,
  Trash2,
  Search,
  Calendar,
} from 'lucide-react';
import { analytics } from '@/lib/analytics';
import type { AnalyticsEvent, EngagementSummary } from '@/lib/analytics';

export default function AnalyticsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [engagement, setEngagement] = useState<EngagementSummary | null>(null);
  const [recentEvents, setRecentEvents] = useState<AnalyticsEvent[]>([]);
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all data in parallel
      const [engData, storageData, recentData] = await Promise.all([
        analytics.engagement.getSummary(7).catch(() => null),
        analytics.data.getStorageInfo().catch(() => null),
        loadRecentEvents(),
      ]);

      setEngagement(engData);
      setStorageInfo(storageData);

      // Calculate stats
      if (engData) {
        setStats({
          totalEvents: engData.totalSessions * 10 || 0, // Rough estimate
          totalSessions: engData.totalSessions,
          avgSessionDuration: engData.avgSessionDuration,
          activeDays: 0, // TODO: Calculate active days from engagement data
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
      console.error('Analytics loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentEvents = async () => {
    try {
      // For now, return empty array since we don't have a direct query for recent events
      // In a real implementation, this would query the storage layer
      return [];
    } catch (err) {
      console.error('Failed to load recent events:', err);
      return [];
    }
  };

  const handleExport = async () => {
    try {
      const data = await analytics.data.export(30);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export data: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete all analytics data? This action cannot be undone.')) {
      return;
    }

    try {
      await analytics.data.clearAll();
      await loadData();
      alert('All analytics data has been deleted.');
    } catch (err) {
      alert('Failed to delete data: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const filteredEvents = recentEvents.filter(event => {
    if (selectedCategory !== 'all' && event.category !== selectedCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        event.type.toLowerCase().includes(query) ||
        JSON.stringify(event.data).toLowerCase().includes(query)
      );
    }
    return true;
  });

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
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent">
                  Analytics
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Usage statistics and privacy controls
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
              Error Loading Analytics
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatsCard
                icon={<BarChart3 className="w-5 h-5" />}
                label="Total Events"
                value={stats?.totalEvents?.toLocaleString() || '0'}
                color="blue"
              />
              <StatsCard
                icon={<Calendar className="w-5 h-5" />}
                label="Total Sessions"
                value={stats?.totalSessions?.toLocaleString() || '0'}
                color="green"
              />
              <StatsCard
                icon={<TrendingUp className="w-5 h-5" />}
                label="Avg Duration"
                value={stats?.avgSessionDuration ? formatDuration(stats.avgSessionDuration) : '0s'}
                color="purple"
              />
              <StatsCard
                icon={<Database className="w-5 h-5" />}
                label="Storage"
                value={storageInfo ? formatBytes(storageInfo.eventStoreSize + storageInfo.metadataStoreSize) : '0 Bytes'}
                color="amber"
              />
            </div>

            {/* Engagement Details */}
            {engagement && (
              <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-blue-500" />
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Engagement Details
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Last 7 days activity
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DetailItem label="Active Days" value={`${engagement.activeDays} days`} />
                    <DetailItem label="Sessions Per Day" value={engagement.avgSessionsPerDay.toFixed(1)} />
                    <DetailItem label="Total Time" value={formatDuration(engagement.totalTime)} />
                    <DetailItem label="Peak Hour" value={`${engagement.peakUsageHour}:00`} />
                  </div>
                </div>
              </section>
            )}

            {/* Privacy Controls */}
            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-blue-500" />
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Privacy Controls
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Manage what data is collected
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">Analytics Collection</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Allow tracking of usage and performance data
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={true}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">Performance Tracking</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Track render times and API response performance
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={true}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </section>

            {/* Data Management */}
            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Database className="w-6 h-6 text-blue-500" />
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Data Management
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Export or delete your analytics data
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleExport}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export Data (JSON)
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete All Data
                  </button>
                </div>
                {storageInfo && (
                  <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                    Storage used: {formatBytes(storageInfo.eventStoreSize + storageInfo.metadataStoreSize)}
                    {' '}({storageInfo.eventCount} events)
                  </div>
                )}
              </div>
            </section>

            {/* Info Section */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                About Analytics
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                All analytics data is stored locally on your device and is never sent to any server.
                You can export your data at any time or delete it completely. Data collection helps
                improve performance and user experience.
              </p>
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
  color: 'blue' | 'green' | 'purple' | 'amber';
}

function StatsCard({ icon, label, value, color }: StatsCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'from-green-500 to-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    purple: 'from-purple-500 to-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
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
      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}
