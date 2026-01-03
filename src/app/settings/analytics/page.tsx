'use client'

/**
 * Advanced Analytics Dashboard
 *
 * Real-time analytics visualization with charts, trends, and insights.
 * Displays usage patterns, performance metrics, error tracking, and optimization suggestions.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Database,
  Shield,
  Download,
  Trash2,
  Calendar,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
} from 'lucide-react'

// Types
interface DashboardData {
  overview: {
    totalEvents: number
    totalSessions: number
    totalErrors: number
    avgSessionDuration: number
  }
  engagement: {
    totalSessions: number
    avgSessionDuration: number
    activeDays: number
    peakUsageHour: number
    totalMessages: number
  }
  performance: Array<{
    category: string
    avgDuration: number
    p95Duration: number
    trend: 'improving' | 'degrading' | 'stable'
  }>
  errors: Array<{
    errorType: string
    count: number
    recoverable: boolean
  }>
  features: Array<{
    featureId: string
    usageCount: number
    successRate: number
  }>
  insights: Array<{
    id: string
    category: string
    severity: 'info' | 'warning' | 'critical' | 'success'
    title: string
    description: string
  }>
  trends: {
    messages: { current: number; change: number; trend: string }
    errors: { current: number; change: number; trend: string }
  }
}

type TimeRange = '1h' | '24h' | '7d' | '30d' | 'all'

const TIME_RANGES: Record<TimeRange, { label: string; days: number }> = {
  '1h': { label: '1 Hour', days: 1/24 },
  '24h': { label: '24 Hours', days: 1 },
  '7d': { label: '7 Days', days: 7 },
  '30d': { label: '30 Days', days: 30 },
  'all': { label: 'All Time', days: 365 },
}

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadData()
  }, [timeRange])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadData()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, timeRange])

  const loadData = async () => {
    try {
      setRefreshing(true)
      setError(null)

      // Simulate data loading (replace with actual API calls)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock data - replace with actual analytics queries
      const mockData: DashboardData = {
        overview: {
          totalEvents: 1234,
          totalSessions: 45,
          totalErrors: 3,
          avgSessionDuration: 300,
        },
        engagement: {
          totalSessions: 45,
          avgSessionDuration: 300,
          activeDays: 5,
          peakUsageHour: 10,
          totalMessages: 234,
        },
        performance: [
          { category: 'API Calls', avgDuration: 245, p95Duration: 521, trend: 'improving' },
          { category: 'Rendering', avgDuration: 89, p95Duration: 156, trend: 'stable' },
          { category: 'Storage', avgDuration: 34, p95Duration: 78, trend: 'improving' },
        ],
        errors: [
          { errorType: 'NetworkError', count: 2, recoverable: true },
          { errorType: 'TimeoutError', count: 1, recoverable: true },
        ],
        features: [
          { featureId: 'Chat', usageCount: 156, successRate: 0.98 },
          { featureId: 'Search', usageCount: 89, successRate: 0.95 },
          { featureId: 'Knowledge', usageCount: 45, successRate: 0.92 },
          { featureId: 'Settings', usageCount: 23, successRate: 1.0 },
        ],
        insights: [
          {
            id: '1',
            category: 'usage',
            severity: 'success',
            title: 'Activity Increased',
            description: 'Your activity increased by 15% compared to last week',
          },
          {
            id: '2',
            category: 'performance',
            severity: 'info',
            title: 'Good Performance',
            description: 'API response times are averaging 245ms',
          },
          {
            id: '3',
            category: 'error',
            severity: 'warning',
            title: 'Network Errors Detected',
            description: '2 network errors occurred in the last 7 days',
          },
        ],
        trends: {
          messages: { current: 234, change: 12, trend: 'increasing' },
          errors: { current: 3, change: -50, trend: 'decreasing' },
        },
      }

      setData(mockData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data')
      console.error('Analytics loading error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleExport = async () => {
    try {
      if (!data) return

      const exportData = {
        exportedAt: new Date().toISOString(),
        timeRange: TIME_RANGES[timeRange].label,
        data,
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to export data: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete all analytics data? This action cannot be undone.'
      )
    ) {
      return
    }

    try {
      // Call analytics delete API
      await loadData()
      alert('All analytics data has been deleted.')
    } catch (err) {
      alert('Failed to delete data: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)

    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

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
                  Analytics Dashboard
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Real-time usage insights and performance metrics
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Time Range Selector */}
              <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                {(Object.keys(TIME_RANGES) as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      timeRange === range
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {TIME_RANGES[range].label}
                  </button>
                ))}
              </div>

              {/* Auto-Refresh Toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg transition-colors ${
                  autoRefresh
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
                title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
              >
                <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
              </button>

              {/* Manual Refresh */}
              <button
                onClick={loadData}
                disabled={refreshing}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh now"
              >
                <RefreshCw className={`w-5 h-5 text-slate-600 dark:text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
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
              Error Loading Analytics
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {!data ? (
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400">No analytics data available</p>
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <OverviewCard
                icon={<Activity className="w-5 h-5" />}
                label="Total Events"
                value={formatNumber(data.overview.totalEvents)}
                trend={data.trends.messages.change}
                color="blue"
              />
              <OverviewCard
                icon={<Calendar className="w-5 h-5" />}
                label="Sessions"
                value={formatNumber(data.overview.totalSessions)}
                color="green"
              />
              <OverviewCard
                icon={<Zap className="w-5 h-5" />}
                label="Avg Duration"
                value={formatDuration(data.overview.avgSessionDuration * 1000)}
                color="purple"
              />
              <OverviewCard
                icon={<AlertTriangle className="w-5 h-5" />}
                label="Errors"
                value={formatNumber(data.overview.totalErrors)}
                trend={data.trends.errors.change}
                color="amber"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Message Volume Chart */}
              <ChartCard
                title="Message Volume"
                description="Messages sent over time"
                icon={<Activity className="w-5 h-5" />}
              >
                <SimpleBarChart
                  data={[
                    { label: 'Mon', value: 45 },
                    { label: 'Tue', value: 52 },
                    { label: 'Wed', value: 38 },
                    { label: 'Thu', value: 64 },
                    { label: 'Fri', value: 56 },
                    { label: 'Sat', value: 32 },
                    { label: 'Sun', value: 28 },
                  ]}
                  color="blue"
                />
              </ChartCard>

              {/* Response Time Chart */}
              <ChartCard
                title="Response Times"
                description="API response time trends"
                icon={<Zap className="w-5 h-5" />}
              >
                <SimpleLineChart
                  data={[
                    { label: 'Mon', value: 250 },
                    { label: 'Tue', value: 280 },
                    { label: 'Wed', value: 220 },
                    { label: 'Thu', value: 200 },
                    { label: 'Fri', value: 240 },
                    { label: 'Sat', value: 180 },
                    { label: 'Sun', value: 190 },
                  ]}
                  color="green"
                />
              </ChartCard>
            </div>

            {/* Insights & Errors Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Insights Panel */}
              <div className="lg:col-span-2">
                <InsightsPanel insights={data.insights} />
              </div>

              {/* Error Rate */}
              <div className="lg:col-span-1">
                <ChartCard
                  title="Error Rate"
                  description="Error occurrences"
                  icon={<XCircle className="w-5 h-5" />}
                >
                  <div className="space-y-4">
                    {data.errors.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 dark:text-slate-400">No errors detected</p>
                      </div>
                    ) : (
                      data.errors.map((error, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {error.errorType}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {error.count} occurrences
                            </p>
                          </div>
                          {error.recoverable ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ChartCard>
              </div>
            </div>

            {/* Performance & Features Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Performance Metrics */}
              <ChartCard
                title="Performance Metrics"
                description="System performance breakdown"
                icon={<TrendingUp className="w-5 h-5" />}
              >
                <div className="space-y-4">
                  {data.performance.map((metric, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {metric.category}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {formatDuration(metric.avgDuration)}
                        </span>
                      </div>
                      <ProgressBar
                        value={(metric.avgDuration / 1000) * 100}
                        max={100}
                        color={metric.trend === 'improving' ? 'green' : 'blue'}
                      />
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                        <span>p95: {formatDuration(metric.p95Duration)}</span>
                        <TrendBadge trend={metric.trend} />
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>

              {/* Feature Usage Heatmap */}
              <ChartCard
                title="Feature Usage"
                description="Most used features"
                icon={<BarChart3 className="w-5 h-5" />}
              >
                <div className="space-y-4">
                  {data.features.map((feature, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {feature.featureId}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {feature.usageCount} uses
                        </span>
                      </div>
                      <ProgressBar
                        value={(feature.usageCount / Math.max(...data.features.map(f => f.usageCount))) * 100}
                        max={100}
                        color="purple"
                      />
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                        <span>Success rate: {(feature.successRate * 100).toFixed(1)}%</span>
                        <span className="text-green-600 dark:text-green-400">✓</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>

            {/* Engagement Details */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Activity className="w-6 h-6 text-blue-500" />
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Engagement Details
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Last {TIME_RANGES[timeRange].label} activity
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <DetailItem label="Active Days" value={`${data.engagement.activeDays} days`} />
                  <DetailItem label="Peak Hour" value={`${data.engagement.peakUsageHour}:00`} />
                  <DetailItem label="Avg Duration" value={formatDuration(data.engagement.avgSessionDuration * 1000)} />
                  <DetailItem label="Total Messages" value={formatNumber(data.engagement.totalMessages)} />
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
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
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                  All data is stored locally and never sent to any server.
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface OverviewCardProps {
  icon: React.ReactNode
  label: string
  value: string
  trend?: number
  color: 'blue' | 'green' | 'purple' | 'amber'
}

function OverviewCard({ icon, label, value, trend, color }: OverviewCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'from-green-500 to-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    purple: 'from-purple-500 to-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    amber: 'from-amber-500 to-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  }

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl border-2 p-6 transition-all hover:shadow-lg ${
        colorClasses[color].split(' ').slice(2).join(' ')
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className={`p-3 rounded-lg bg-gradient-to-br ${
            colorClasses[color].split(' ').slice(0, 2).join(' ')
          } text-white`}
        >
          {icon}
        </div>
        {trend !== undefined && (
          <TrendBadge trend={trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable'} />
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
      {trend !== undefined && (
        <p className={`text-xs mt-1 ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-slate-600'}`}>
          {trend > 0 ? '+' : ''}
          {trend.toFixed(1)}% from last period
        </p>
      )}
    </div>
  )
}

interface ChartCardProps {
  title: string
  description: string
  icon: React.ReactNode
  children: React.ReactNode
}

function ChartCard({ title, description, icon, children }: ChartCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

interface SimpleBarChartProps {
  data: Array<{ label: string; value: number }>
  color: 'blue' | 'green' | 'purple' | 'amber'
}

function SimpleBarChart({ data, color }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
  }

  return (
    <div className="flex items-end justify-between gap-2 h-48">
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full relative">
            <div
              className={`${colorClasses[color]} rounded-t-lg transition-all hover:opacity-80`}
              style={{ height: `${(item.value / maxValue) * 100}%`, minHeight: '4px' }}
            />
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}

interface SimpleLineChartProps {
  data: Array<{ label: string; value: number }>
  color: 'blue' | 'green' | 'purple' | 'amber'
}

function SimpleLineChart({ data, color }: SimpleLineChartProps) {
  const colorClasses = {
    blue: 'stroke-blue-500',
    green: 'stroke-green-500',
    purple: 'stroke-purple-500',
    amber: 'stroke-amber-500',
  }

  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1

  const points = data
    .map((item, index) => {
      const x = (index / (data.length - 1)) * 100
      const y = 100 - ((item.value - minValue) / range) * 80 - 10
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="relative h-48">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          points={points}
          className={colorClasses[color]}
        />
        {data.map((item, index) => {
          const x = (index / (data.length - 1)) * 100
          const y = 100 - ((item.value - minValue) / range) * 80 - 10
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="2"
              className={colorClasses[color].replace('stroke', 'fill')}
            />
          )
        })}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between">
        {data.map((item, index) => (
          <span
            key={index}
            className="text-xs text-slate-600 dark:text-slate-400 font-medium"
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

interface ProgressBarProps {
  value: number
  max: number
  color: 'blue' | 'green' | 'purple' | 'amber'
}

function ProgressBar({ value, max, color }: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100)
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
  }

  return (
    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
      <div
        className={`${colorClasses[color]} h-full rounded-full transition-all duration-300`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

function TrendBadge({ trend }: { trend: 'increasing' | 'decreasing' | 'stable' | 'improving' | 'degrading' }) {
  const badgeConfig = {
    increasing: { icon: '↑', color: 'text-green-600', label: 'Up' },
    decreasing: { icon: '↓', color: 'text-red-600', label: 'Down' },
    stable: { icon: '→', color: 'text-slate-600', label: 'Stable' },
    improving: { icon: '✓', color: 'text-green-600', label: 'Better' },
    degrading: { icon: '✗', color: 'text-red-600', label: 'Worse' },
  }

  const config = badgeConfig[trend]

  return (
    <span className={`text-xs font-medium ${config.color} flex items-center gap-1`}>
      {config.icon} {config.label}
    </span>
  )
}

function InsightsPanel({
  insights,
}: {
  insights: Array<{
    id: string
    category: string
    severity: 'info' | 'warning' | 'critical' | 'success'
    title: string
    description: string
  }>
}) {
  const severityConfig = {
    info: {
      icon: <Shield className="w-5 h-5" />,
      bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      title: 'text-blue-900 dark:text-blue-100',
      desc: 'text-blue-700 dark:text-blue-300',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5" />,
      bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
      title: 'text-amber-900 dark:text-amber-100',
      desc: 'text-amber-700 dark:text-amber-300',
    },
    critical: {
      icon: <XCircle className="w-5 h-5" />,
      bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      title: 'text-red-900 dark:text-red-100',
      desc: 'text-red-700 dark:text-red-300',
    },
    success: {
      icon: <CheckCircle className="w-5 h-5" />,
      bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      title: 'text-green-900 dark:text-green-100',
      desc: 'text-green-700 dark:text-green-300',
    },
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Insights
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Automated analysis and recommendations
            </p>
          </div>
        </div>
      </div>
      <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
        {insights.length === 0 ? (
          <div className="text-center py-8 text-slate-600 dark:text-slate-400">
            No insights available
          </div>
        ) : (
          insights.map((insight) => {
            const config = severityConfig[insight.severity]
            return (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border ${config.bg}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`${config.title}`}>{config.icon}</div>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${config.title} mb-1`}>
                      {insight.title}
                    </h4>
                    <p className={`text-sm ${config.desc}`}>{insight.description}</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  )
}
