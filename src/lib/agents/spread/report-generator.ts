/**
 * Spread Report Generator
 *
 * Generates detailed reports of spread operations in various formats.
 */

import {
  SpreadEvent,
  getSpreadAnalytics,
  EfficiencyReport,
  SuccessRateReport
} from './analytics'
import { formatDuration, formatCost, formatPercentage } from './metrics'

// ============================================================================
// TYPES
// ============================================================================

export interface SpreadReport {
  spreadId: string
  event: SpreadEvent
  efficiency: EfficiencyReport
  successRate: SuccessRateReport
  generatedAt: number
}

export interface ReportOptions {
  includeTaskDetails?: boolean
  includeQualityMetrics?: boolean
  includeCharts?: boolean
  format?: 'pdf' | 'json' | 'html'
}

// ============================================================================
// REPORT GENERATOR CLASS
// ============================================================================

export class SpreadReportGenerator {
  private analytics = getSpreadAnalytics()

  /**
   * Generate a comprehensive report for a spread
   */
  async generateReport(spreadId: string, options: ReportOptions = {}): Promise<SpreadReport> {
    // Get all data
    const event = await this.analytics.getSpread(spreadId)
    if (!event) {
      throw new Error(`Spread ${spreadId} not found`)
    }

    const efficiency = await this.analytics.calculateEfficiency(spreadId)
    const successRate = await this.analytics.calculateSuccessRate(spreadId)

    return {
      spreadId,
      event,
      efficiency,
      successRate,
      generatedAt: Date.now()
    }
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport(report: SpreadReport): Promise<string> {
    const { event, efficiency, successRate, generatedAt } = report

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spread Report: ${report.spreadId.slice(0, 8)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: #f5f5f5;
      padding: 20px;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }

    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }

    .header p {
      opacity: 0.9;
      font-size: 14px;
    }

    .section {
      padding: 30px;
      border-bottom: 1px solid #e5e5e5;
    }

    .section:last-child {
      border-bottom: none;
    }

    .section h2 {
      font-size: 20px;
      margin-bottom: 20px;
      color: #333;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }

    .metric {
      background: #f9f9f9;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      border: 1px solid #e5e5e5;
    }

    .metric-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .metric-value {
      font-size: 28px;
      font-weight: bold;
      color: #667eea;
    }

    .metric-sub {
      font-size: 12px;
      color: #999;
      margin-top: 4px;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }

    .table th,
    .table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e5e5;
    }

    .table th {
      background: #f9f9f9;
      font-weight: 600;
      color: #333;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .table tr:hover {
      background: #f9f9f9;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-complete {
      background: #d4edda;
      color: #155724;
    }

    .status-failed {
      background: #f8d7da;
      color: #721c24;
    }

    .status-pending {
      background: #fff3cd;
      color: #856404;
    }

    .progress-bar {
      width: 100%;
      height: 24px;
      background: #e5e5e5;
      border-radius: 12px;
      overflow: hidden;
      margin: 10px 0;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: 600;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 20px;
    }

    .summary-item {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 8px;
    }

    .summary-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }

    .summary-value {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>Spread Report</h1>
      <p>
        Generated: ${new Date(generatedAt).toLocaleString()}<br>
        Spread ID: ${report.spreadId.slice(0, 8)}
      </p>
    </div>

    <!-- Efficiency Metrics -->
    <div class="section">
      <h2>⚡ Efficiency Metrics</h2>

      <div class="metrics">
        <div class="metric">
          <div class="metric-label">Tasks</div>
          <div class="metric-value">${efficiency.taskCount}</div>
        </div>

        <div class="metric">
          <div class="metric-label">Time Saved</div>
          <div class="metric-value">${formatDuration(efficiency.timeSaved)}</div>
          <div class="metric-sub">${formatPercentage(efficiency.timeSavedPercentage)} faster</div>
        </div>

        <div class="metric">
          <div class="metric-label">Cost Saved</div>
          <div class="metric-value">$${efficiency.costSaved.toFixed(4)}</div>
          <div class="metric-sub">${formatPercentage(efficiency.costSavedPercentage)} cheaper</div>
        </div>

        <div class="metric">
          <div class="metric-label">Efficiency Score</div>
          <div class="metric-value">${efficiency.efficiencyScore.toFixed(1)}</div>
          <div class="metric-sub">out of 100</div>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">Serial Duration</div>
          <div class="summary-value">${formatDuration(efficiency.serialDuration)}</div>
        </div>

        <div class="summary-item">
          <div class="summary-label">Parallel Duration</div>
          <div class="summary-value">${formatDuration(efficiency.parallelDuration)}</div>
        </div>

        <div class="summary-item">
          <div class="summary-label">Serial Cost</div>
          <div class="summary-value">$${efficiency.serialCost.toFixed(4)}</div>
        </div>

        <div class="summary-item">
          <div class="summary-label">Actual Cost</div>
          <div class="summary-value">$${efficiency.actualCost.toFixed(4)}</div>
        </div>
      </div>
    </div>

    <!-- Success Rate -->
    <div class="section">
      <h2>🎯 Success Rate</h2>

      <div class="progress-bar">
        <div class="progress-fill" style="width: ${successRate.overallRate * 100}%">
          ${formatPercentage(successRate.overallRate * 100)}
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">Successful Tasks</div>
          <div class="summary-value">${successRate.successCount}</div>
        </div>

        <div class="summary-item">
          <div class="summary-label">Failed Tasks</div>
          <div class="summary-value">${successRate.failCount}</div>
        </div>
      </div>

      <h3 style="margin-top: 20px; margin-bottom: 10px; font-size: 16px;">By Task Type</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Success</th>
            <th>Failed</th>
            <th>Rate</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(successRate.byType).map(([type, data]) => `
            <tr>
              <td>${type}</td>
              <td>${data.success}</td>
              <td>${data.fail}</td>
              <td>${formatPercentage(data.rate * 100)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Task Details -->
    <div class="section">
      <h2>📋 Task Details</h2>

      <table class="table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Model</th>
            <th>Duration</th>
            <th>Cost</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${event.tasks.map(task => `
            <tr>
              <td>${task.task}</td>
              <td>${task.model}</td>
              <td>${task.duration ? formatDuration(task.duration) : 'N/A'}</td>
              <td>$${task.cost.toFixed(6)}</td>
              <td>
                <span class="status-badge status-${task.status}">
                  ${task.status}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Quality Metrics -->
    ${event.quality.resultQuality > 0 ? `
    <div class="section">
      <h2>✨ Quality Metrics</h2>

      <div class="metrics">
        <div class="metric">
          <div class="metric-label">Result Quality</div>
          <div class="metric-value">${event.quality.resultQuality}/5</div>
        </div>

        <div class="metric">
          <div class="metric-label">Conflict Rate</div>
          <div class="metric-value">${event.quality.conflictRate.toFixed(2)}</div>
          <div class="metric-sub">conflicts per merge</div>
        </div>

        <div class="metric">
          <div class="metric-label">Auto-Merge Rate</div>
          <div class="metric-value">${formatPercentage(event.quality.autoMergeRate * 100)}</div>
        </div>
      </div>
    </div>
    ` : ''}
  </div>
</body>
</html>`
  }

  /**
   * Export report as JSON
   */
  async exportToJSON(report: SpreadReport): Promise<string> {
    return JSON.stringify(report, null, 2)
  }

  /**
   * Export report as HTML string (for PDF conversion)
   */
  async exportToHTML(report: SpreadReport): Promise<string> {
    return this.generateHTMLReport(report)
  }

  /**
   * Generate a summary report for multiple spreads
   */
  async generateSummaryReport(spreadIds: string[]): Promise<{
    totalSpreads: number
    totalTasks: number
    overallEfficiency: number
    overallSuccessRate: number
    totalTimeSaved: number
    totalCostSaved: number
    bestSpread: string
    worstSpread: string
  }> {
    const reports = await Promise.all(
      spreadIds.map(id => this.generateReport(id))
    )

    const totalTasks = reports.reduce((sum, r) => sum + r.efficiency.taskCount, 0)
    const overallEfficiency = reports.reduce((sum, r) => sum + r.efficiency.efficiencyScore, 0) / reports.length
    const overallSuccessRate = reports.reduce((sum, r) => sum + r.successRate.overallRate, 0) / reports.length
    const totalTimeSaved = reports.reduce((sum, r) => sum + r.efficiency.timeSaved, 0)
    const totalCostSaved = reports.reduce((sum, r) => sum + r.efficiency.costSaved, 0)

    const sortedByEfficiency = [...reports].sort((a, b) => b.efficiency.efficiencyScore - a.efficiency.efficiencyScore)
    const bestSpread = sortedByEfficiency[0]?.spreadId || ''
    const worstSpread = sortedByEfficiency[sortedByEfficiency.length - 1]?.spreadId || ''

    return {
      totalSpreads: reports.length,
      totalTasks,
      overallEfficiency,
      overallSuccessRate,
      totalTimeSaved,
      totalCostSaved,
      bestSpread,
      worstSpread
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Download a report as a file
 */
export function downloadReport(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  URL.revokeObjectURL(url)
}

/**
 * Open HTML report in new tab (for printing to PDF)
 */
export function openHTMLReport(html: string): void {
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)

  window.open(url, '_blank')

  // Note: URL will be revoked when the tab is closed
}
