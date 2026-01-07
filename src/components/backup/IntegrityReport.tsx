/**
 * Integrity Report UI Component
 *
 * Displays backup integrity status, issues found, and recommendations.
 */

'use client'

import { IntegrityReport, CategoryIntegrityResult } from '@/lib/backup/integrity'
import { Card } from '@/components/ui/Card'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useState } from 'react'

interface IntegrityReportProps {
  report: IntegrityReport
  onDismiss?: () => void
  showDetails?: boolean
}

export function IntegrityReportView({ report, onDismiss, showDetails = false }: IntegrityReportProps) {
  const [showDetailedResults, setShowDetailedResults] = useState(showDetails)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const getStatusIcon = (status: IntegrityReport['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-orange-500" />
      case 'corrupted':
        return <XCircle className="w-5 h-5 text-red-500" />
    }
  }

  const getStatusColor = (status: IntegrityReport['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400'
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'critical':
        return 'text-orange-600 dark:text-orange-400'
      case 'corrupted':
        return 'text-red-600 dark:text-red-400'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'text-blue-600 dark:text-blue-400'
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'high':
        return 'text-orange-600 dark:text-orange-400'
      case 'critical':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          {getStatusIcon(report.status)}
          <h3 className="text-lg font-semibold ml-2">Integrity Report</h3>
        </div>
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>

      {/* Overall status */}
      <div className="space-y-4">
        {/* Status and score */}
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-2xl font-bold ${getStatusColor(report.status)}`}>
              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {report.canRestore
                ? 'This backup can be safely restored'
                : 'This backup has issues that should be reviewed'}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${getScoreColor(report.score)}`}>
              {report.score}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Integrity Score</p>
          </div>
        </div>

        {/* Score bar */}
        <div>
          <Progress value={report.score} />
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {report.validItems}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Valid Items</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {report.corruptedItems}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Corrupted Items</p>
          </div>
        </div>

        {/* Top issues */}
        {report.topIssues.length > 0 && (
          <Alert variant={report.status === 'healthy' ? 'success' : report.status === 'warning' ? 'warning' : 'error'}>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <div className="font-semibold mb-1">Issues Found:</div>
              <ul className="list-disc list-inside space-y-1">
                {report.topIssues.map((issue, idx) => (
                  <li key={idx} className="text-sm">{issue}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Info className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              <h4 className="font-semibold">Recommendations</h4>
            </div>
            <ul className="space-y-1">
              {report.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                  • {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Toggle details */}
        {report.details && (
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetailedResults(!showDetailedResults)}
              className="w-full"
            >
              {showDetailedResults ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Show Details
                </>
              )}
            </Button>

            {showDetailedResults && (
              <div className="mt-4 space-y-4">
                {/* Category breakdown */}
                <div>
                  <h4 className="font-semibold mb-2">Category Breakdown</h4>
                  <div className="space-y-2">
                    {Object.entries(report.details.categories).map(([key, category]) => (
                      <CategoryResult
                        key={key}
                        category={category}
                        isExpanded={expandedCategories.has(key)}
                        onToggle={() => toggleCategory(key)}
                        getSeverityColor={getSeverityColor}
                      />
                    ))}
                  </div>
                </div>

                {/* Error count by severity */}
                <div>
                  <h4 className="font-semibold mb-2">Errors by Severity</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Critical:</span>
                      <span className={`font-medium ${getSeverityColor('critical')}`}>
                        {report.errorsBySeverity.critical}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">High:</span>
                      <span className={`font-medium ${getSeverityColor('high')}`}>
                        {report.errorsBySeverity.high}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Medium:</span>
                      <span className={`font-medium ${getSeverityColor('medium')}`}>
                        {report.errorsBySeverity.medium}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Low:</span>
                      <span className={`font-medium ${getSeverityColor('low')}`}>
                        {report.errorsBySeverity.low}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

interface CategoryResultProps {
  category: CategoryIntegrityResult
  isExpanded: boolean
  onToggle: () => void
  getSeverityColor: (severity: string) => string
}

function CategoryResult({ category, isExpanded, onToggle, getSeverityColor }: CategoryResultProps) {
  const getStatusBadgeColor = (status: CategoryIntegrityResult['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'critical':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
      case 'missing':
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium capitalize">{category.category}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${getStatusBadgeColor(category.status)}`}>
            {category.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {category.validCount}/{category.itemCount} valid
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t space-y-2">
          {/* Score */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Score:</span>
            <Progress value={category.score} className="flex-1" />
            <span className="text-sm font-medium">{category.score}/100</span>
          </div>

          {/* Errors */}
          {category.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Errors:</p>
              <div className="space-y-1">
                {category.errors.slice(0, 5).map((error, idx) => (
                  <div key={idx} className="text-xs p-2 bg-white dark:bg-gray-900 rounded">
                    <div className="flex items-start gap-2">
                      <span className={`font-medium ${getSeverityColor(error.severity)}`}>
                        {error.severity.toUpperCase()}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">{error.message}</span>
                    </div>
                  </div>
                ))}
                {category.errors.length > 5 && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    +{category.errors.length - 5} more errors
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {category.warnings.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Warnings:</p>
              <ul className="space-y-1">
                {category.warnings.slice(0, 3).map((warning, idx) => (
                  <li key={idx} className="text-xs text-gray-700 dark:text-gray-300">
                    • {warning}
                  </li>
                ))}
                {category.warnings.length > 3 && (
                  <li className="text-xs text-gray-600 dark:text-gray-400">
                    +{category.warnings.length - 3} more warnings
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* No issues */}
          {category.errors.length === 0 && category.warnings.length === 0 && (
            <p className="text-sm text-green-600 dark:text-green-400">No issues detected</p>
          )}
        </div>
      )}
    </div>
  )
}
