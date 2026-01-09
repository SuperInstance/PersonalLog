/**
 * HTML reporter - generates interactive HTML dashboard
 */

import type { SuiteResult, ReporterOptions } from '../types.js';
import { writeFileSync } from 'fs';
import { formatTime, formatNumber, formatPercentage } from '../statistics.js';

/**
 * Generate HTML report
 */
export function reportHtml(
  results: SuiteResult[],
  options: ReporterOptions = {}
): string {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Benchmark Results</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            background: white;
            border-radius: 10px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
            color: #667eea;
            margin-bottom: 10px;
        }

        .header .meta {
            color: #666;
            font-size: 14px;
        }

        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }

        .summary-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .summary-card h3 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 18px;
        }

        .stat {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
        }

        .stat:last-child {
            border-bottom: none;
        }

        .stat-label {
            color: #666;
        }

        .stat-value {
            font-weight: 600;
            color: #333;
        }

        .suite {
            background: white;
            border-radius: 10px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .suite-header {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #667eea;
        }

        .suite-header h2 {
            color: #667eea;
            margin-bottom: 5px;
        }

        .suite-header .description {
            color: #666;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #f0f0f0;
        }

        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #333;
        }

        tr:hover {
            background: #f8f9fa;
        }

        .success {
            color: #10b981;
        }

        .error {
            color: #ef4444;
        }

        .metric {
            font-family: 'Courier New', monospace;
            font-weight: 600;
        }

        .bar-container {
            width: 100%;
            height: 20px;
            background: #f0f0f0;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 10px;
        }

        .bar {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            transition: width 0.3s ease;
        }

        .regression {
            background: #ef4444;
        }

        .improvement {
            background: #10b981;
        }

        .footer {
            text-align: center;
            color: white;
            padding: 20px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Performance Benchmark Results</h1>
            <div class="meta">
                Generated: ${new Date().toISOString()}<br>
                Environment: ${process.platform} ${process.arch} | Node ${process.version}
            </div>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Overview</h3>
                <div class="stat">
                    <span class="stat-label">Total Suites:</span>
                    <span class="stat-value">${results.length}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Total Benchmarks:</span>
                    <span class="stat-value">${results.reduce((sum, s) => sum + s.results.length, 0)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Total Time:</span>
                    <span class="stat-value">${formatTime(results.reduce((sum, s) => sum + s.totalTime, 0))}</span>
                </div>
            </div>

            ${generateSummaryCards(results)}
        </div>

        ${generateSuiteSections(results)}
    </div>

    <div class="footer">
        Generated by @superinstance/benchmark-suite
    </div>
</body>
</html>`;

  if (options.output) {
    writeFileSync(options.output, html);
    console.log(`\n📄 HTML report saved to: ${options.output}`);
  }

  return html;
}

/**
 * Generate summary cards
 */
function generateSummaryCards(results: SuiteResult[]): string {
  const fastestBenchmark = results
    .flatMap(s => s.results.filter(r => !r.error))
    .sort((a, b) => a.avgTime - b.avgTime)[0];

  const slowestBenchmark = results
    .flatMap(s => s.results.filter(r => !r.error))
    .sort((a, b) => b.avgTime - a.avgTime)[0];

  const highestThroughput = results
    .flatMap(s => s.results.filter(r => !r.error))
    .sort((a, b) => b.opsPerSecond - a.opsPerSecond)[0];

  return `
    <div class="summary-card">
        <h3>🚀 Fastest Benchmark</h3>
        <div class="stat">
            <span class="stat-label">Name:</span>
            <span class="stat-value">${fastestBenchmark?.name || 'N/A'}</span>
        </div>
        <div class="stat">
            <span class="stat-label">Time:</span>
            <span class="stat-value metric">${formatTime(fastestBenchmark?.avgTime || 0)}</span>
        </div>
    </div>

    <div class="summary-card">
        <h3>📈 Highest Throughput</h3>
        <div class="stat">
            <span class="stat-label">Name:</span>
            <span class="stat-value">${highestThroughput?.name || 'N/A'}</span>
        </div>
        <div class="stat">
            <span class="stat-label">Ops/sec:</span>
            <span class="stat-value metric">${formatNumber(highestThroughput?.opsPerSecond || 0)}</span>
        </div>
    </div>

    <div class="summary-card">
        <h3>⚠️ Slowest Benchmark</h3>
        <div class="stat">
            <span class="stat-label">Name:</span>
            <span class="stat-value">${slowestBenchmark?.name || 'N/A'}</span>
        </div>
        <div class="stat">
            <span class="stat-label">Time:</span>
            <span class="stat-value metric">${formatTime(slowestBenchmark?.avgTime || 0)}</span>
        </div>
    </div>
  `;
}

/**
 * Generate suite sections
 */
function generateSuiteSections(results: SuiteResult[]): string {
  return results.map(suite => `
    <div class="suite">
        <div class="suite-header">
            <h2>${suite.name}</h2>
            <div class="description">
                Total time: ${formatTime(suite.totalTime)} |
                Benchmarks: ${suite.results.length}
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Benchmark</th>
                    <th>Avg Time</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>Median</th>
                    <th>Std Dev</th>
                    <th>Ops/sec</th>
                    <th>Success Rate</th>
                </tr>
            </thead>
            <tbody>
                ${suite.results.map(result => {
                  if (result.error) {
                    return `<tr>
                        <td colspan="8" class="error">❌ ${result.name}: ${result.error}</td>
                    </tr>`;
                  }

                  const maxTime = Math.max(...suite.results.filter(r => !r.error).map(r => r.avgTime));
                  const barWidth = (result.avgTime / maxTime) * 100;

                  return `<tr>
                        <td><strong>${result.name}</strong></td>
                        <td class="metric">${formatTime(result.avgTime)}</td>
                        <td class="metric">${formatTime(result.minTime)}</td>
                        <td class="metric">${formatTime(result.maxTime)}</td>
                        <td class="metric">${formatTime(result.medianTime)}</td>
                        <td class="metric">${formatTime(result.stdDev)}</td>
                        <td class="metric success">${formatNumber(result.opsPerSecond)}</td>
                        <td class="metric">${(result.successRate * 100).toFixed(1)}%</td>
                    </tr>
                    <tr>
                        <td colspan="8">
                            <div class="bar-container">
                                <div class="bar" style="width: ${barWidth}%"></div>
                            </div>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    </div>
  `).join('');
}
