/**
 * Spread Analytics Dashboard
 *
 * Comprehensive analytics visualization for spread operations.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  getSpreadAnalytics,
  SpreadMetrics,
  EfficiencyReport,
  SuccessRateReport
} from '@/lib/agents/spread/analytics'
import {
  formatDuration,
  formatPercentage,
  calculateTrend,
  type TimeSeriesDataPoint
} from '@/lib/agents/spread/metrics'
import {
  SpreadReportGenerator,
  downloadReport,
  openHTMLReport
} from '@/lib/agents/spread/report-generator'

// ============================================================================
// TYPES
// ============================================================================

interface DateRange {
  start: Date
  end: Date
}

interface SpreadAnalyticsDashboardProps {
  className?: string
}

// ============================================================================
// COMPONENTS
// ============================================================================

export function SpreadAnalyticsDashboard({ className }: SpreadAnalyticsDashboardProps) {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    end: new Date()
  })
  const [metrics, setMetrics] = useState<SpreadMetrics | null>(null)
  const [efficiencyTrend, setEfficiencyTrend] = useState<EfficiencyReport[]>([])
  const [successTrend, setSuccessTrend] = useState<SuccessRateReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSpreadId, setSelectedSpreadId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      const analytics = getSpreadAnalytics()

      // Get metrics
      const metricsData = await analytics.getMetrics(dateRange.start, dateRange.end)
      setMetrics(metricsData)

      // Get all spreads
      const spreads = await analytics.getAllSpreads(dateRange.start, dateRange.end)

      // Get efficiency reports
      const efficiencyReports = await Promise.all(
        spreads.map(async (s) => {
          try {
            return await analytics.calculateEfficiency(s.spreadId)
          } catch {
            return null
          }
        })
      )
      setEfficiencyTrend(efficiencyReports.filter((r): r is EfficiencyReport => r !== null))

      // Get success rates
      const successReports = await Promise.all(
        spreads.map(async (s) => {
          try {
            return await analytics.calculateSuccessRate(s.spreadId)
          } catch {
            return null
          }
        })
      )
      setSuccessTrend(successReports.filter((r): r is SuccessRateReport => r !== null))
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleExportReport(format: 'pdf' | 'json' | 'html') {
    if (!selectedSpreadId) return

    setExporting(true)
    try {
      const generator = new SpreadReportGenerator()
      const report = await generator.generateReport(selectedSpreadId)

      if (format === 'json') {
        const json = await generator.exportToJSON(report)
        downloadReport(json, `spread-report-${selectedSpreadId.slice(0, 8)}.json`, 'application/json')
      } else if (format === 'html') {
        const html = await generator.exportToHTML(report)
        downloadReport(html, `spread-report-${selectedSpreadId.slice(0, 8)}.html`, 'text/html')
      } else if (format === 'pdf') {
        const html = await generator.exportToHTML(report)
        openHTMLReport(html)
      }
    } catch (error) {
      console.error('Error exporting report:', error)
    } finally {
      setExporting(false)
    }
  }

  function handleExportAllData() {
    const analytics = getSpreadAnalytics()
    analytics.exportData().then(json => {
      downloadReport(json, `spread-analytics-${Date.now()}.json`, 'application/json')
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Spread Analytics
        </h2>
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      {/* Overview Metrics */}
      {metrics && <OverviewMetrics metrics={metrics} />}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {efficiencyTrend.length > 0 && (
          <EfficiencyChart data={efficiencyTrend} onSelect={setSelectedSpreadId} />
        )}
        {successTrend.length > 0 && (
          <SuccessRateChart data={successTrend} />
        )}
      </div>

      {/* Spread Details */}
      {selectedSpreadId && (
        <SpreadDetails
          spreadId={selectedSpreadId}
          onExport={handleExportReport}
          exporting={exporting}
        />
      )}

      {/* Individual Spreads Table */}
      {efficiencyTrend.length > 0 && (
        <SpreadsTable
          data={efficiencyTrend}
          selectedId={selectedSpreadId}
          onSelect={setSelectedSpreadId}
        />
      )}

      {/* Export Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleExportAllData}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors text-sm"
        >
          Export All Data (JSON)
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function OverviewMetrics({ metrics }: { metrics: SpreadMetrics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <MetricCard
        label="Total Spreads"
        value={metrics.totalSpreads.toString()}
        icon="📊"
      />
      <MetricCard
        label="Tasks Completed"
        value={metrics.successfulTasks.toString()}
        icon="✅"
      />
      <MetricCard
        label="Avg Time Saved"
        value={formatDuration(metrics.avgTimeSaved)}
        icon="⏱️"
      />
      <MetricCard
        label="Avg Cost Saved"
        value={`$${metrics.avgCostSaved.toFixed(4)}`}
        icon="💰"
      />
      <MetricCard
        label="Success Rate"
        value={formatPercentage(metrics.avgSuccessRate * 100)}
        icon="🎯"
      />
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon
}: {
  label: string
  value: string
  icon: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {value}
      </div>
    </div>
  )
}

interface DateRangeSelectorProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const ranges = [
    { label: '24h', days: 1 },
    { label: '7d', days: 7 },
    { label: '30d', days: 30 },
    { label: '90d', days: 90 }
  ]

  return (
    <div className="flex gap-2">
      {ranges.map(range => (
        <button
          key={range.label}
          onClick={() => {
            const end = new Date()
            const start = new Date(end.getTime() - range.days * 24 * 60 * 60 * 1000)
            onChange({ start, end })
          }}
          className={cn(
            'px-3 py-1 rounded-md text-sm transition-colors',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'text-gray-700 dark:text-gray-300'
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}

interface EfficiencyChartProps {
  data: EfficiencyReport[]
  onSelect: (id: string) => void
}

function EfficiencyChart({ data, onSelect }: EfficiencyChartProps) {
  const maxTimeSaved = Math.max(...data.map(d => d.timeSavedPercentage))
  const maxCostSaved = Math.max(...data.map(d => d.costSavedPercentage))

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Efficiency Over Time
      </h3>

      <div className="space-y-3">
        {data.slice(-10).map((report, i) => (
          <div
            key={report.spreadId}
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-2 transition-colors"
            onClick={() => onSelect(report.spreadId)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {report.spreadId.slice(0, 8)}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {report.efficiencyScore.toFixed(1)} / 100
              </span>
            </div>

            {/* Time saved bar */}
            <div className="mb-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">Time</span>
                <span className="text-green-600 dark:text-green-400">
                  {formatPercentage(report.timeSavedPercentage)}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${(report.timeSavedPercentage / maxTimeSaved) * 100}%` }}
                />
              </div>
            </div>

            {/* Cost saved bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">Cost</span>
                <span className="text-blue-600 dark:text-blue-400">
                  {formatPercentage(report.costSavedPercentage)}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${(report.costSavedPercentage / maxCostSaved) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface SuccessRateChartProps {
  data: SuccessRateReport[]
}

function SuccessRateChart({ data }: SuccessRateChartProps) {
  // Aggregate by task type
  const byType: Record<string, { total: number; success: number; fail: number }> = {}

  for (const report of data) {
    for (const [type, stats] of Object.entries(report.byType)) {
      if (!byType[type]) {
        byType[type] = { total: 0, success: 0, fail: 0 }
      }
      byType[type].total += stats.success + stats.fail
      byType[type].success += stats.success
      byType[type].fail += stats.fail
    }
  }

  const typeData = Object.entries(byType).map(([type, stats]) => ({
    type,
    rate: stats.total > 0 ? stats.success / stats.total : 0,
    total: stats.total
  })).sort((a, b) => b.rate - a.rate)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Success Rate by Task Type
      </h3>

      <div className="space-y-3">
        {typeData.map(({ type, rate, total }) => (
          <div key={type}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600 dark:text-gray-400 capitalize">{type}</span>
              <span className="text-gray-900 dark:text-gray-100">
                {formatPercentage(rate * 100)} ({total} tasks)
              </span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                style={{ width: `${rate * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface SpreadsTableProps {
  data: EfficiencyReport[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function SpreadsTable({ data, selectedId, onSelect }: SpreadsTableProps) {
  const sorted = [...data].sort((a, b) => b.efficiencyScore - a.efficiencyScore)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Individual Spreads
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Spread ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tasks
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Time Saved
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Cost Saved
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Efficiency
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sorted.map(report => (
              <tr
                key={report.spreadId}
                className={cn(
                  'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors',
                  selectedId === report.spreadId && 'bg-blue-50 dark:bg-blue-900/20'
                )}
                onClick={() => onSelect(report.spreadId)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-mono">
                  {report.spreadId.slice(0, 8)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {report.taskCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                  {formatPercentage(report.timeSavedPercentage)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400">
                  {formatPercentage(report.costSavedPercentage)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden max-w-[100px]">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${report.efficiencyScore}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {report.efficiencyScore.toFixed(1)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface SpreadDetailsProps {
  spreadId: string
  onExport: (format: 'pdf' | 'json' | 'html') => void
  exporting: boolean
}

function SpreadDetails({ spreadId, onExport, exporting }: SpreadDetailsProps) {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadReport() {
      setLoading(true)
      try {
        const generator = new SpreadReportGenerator()
        const data = await generator.generateReport(spreadId)
        setReport(data)
      } catch (error) {
        console.error('Error loading report:', error)
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [spreadId])

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (!report) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Spread Details: {spreadId.slice(0, 8)}
        </h3>

        <div className="flex gap-2">
          <button
            onClick={() => onExport('html')}
            disabled={exporting}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-md text-sm transition-colors"
          >
            Export HTML
          </button>
          <button
            onClick={() => onExport('json')}
            disabled={exporting}
            className="px-3 py-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-md text-sm transition-colors"
          >
            Export JSON
          </button>
          <button
            onClick={() => onExport('pdf')}
            disabled={exporting}
            className="px-3 py-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-md text-sm transition-colors"
          >
            Print / PDF
          </button>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Tasks
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {report.efficiency.taskCount}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Time Saved
          </div>
          <div className="text-xl font-bold text-green-600 dark:text-green-400">
            {formatDuration(report.efficiency.timeSaved)}
            <span className="text-sm ml-1">
              ({formatPercentage(report.efficiency.timeSavedPercentage)})
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Cost Saved
          </div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
            ${report.efficiency.costSaved.toFixed(4)}
            <span className="text-sm ml-1">
              ({formatPercentage(report.efficiency.costSavedPercentage)})
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Efficiency Score
          </div>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
            {report.efficiency.efficiencyScore.toFixed(1)} / 100
          </div>
        </div>
      </div>

      {/* Task list */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Tasks
        </h4>

        <div className="space-y-2">
          {report.event.tasks.map((task: any, i: number) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              <div className="flex-1">
                <div className="text-sm text-gray-900 dark:text-gray-100">
                  {i + 1}. {task.task}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {task.model} · {task.duration ? formatDuration(task.duration) : 'N/A'}
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400">
                ${task.cost.toFixed(6)}
              </div>

              <div className="ml-4">
                <span className={cn(
                  'px-2 py-1 rounded text-xs font-medium',
                  task.status === 'complete' && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                  task.status === 'failed' && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                  task.status === 'pending' && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                )}>
                  {task.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
