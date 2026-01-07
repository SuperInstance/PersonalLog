/**
 * Data Integrity Dashboard Component
 *
 * Displays system-wide data integrity status with interactive repair controls.
 * Shows integrity scores, issues by severity, and provides repair actions.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Wrench,
  Eye,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  FileQuestion,
} from 'lucide-react';
import {
  checkSystemIntegrity,
  quickIntegrityCheck,
  type SystemIntegrityResult,
  type IntegrityIssue,
} from '@/lib/backup/data-integrity';
import {
  repairSystem,
  getRepairSuggestion,
  estimateRepairSafety,
  type RepairResult,
  type RepairOptions,
} from '@/lib/backup/repair';

// ============================================================================
// TYPES
// ============================================================================

interface IntegrityDashboardProps {
  /** Auto-refresh interval (ms) */
  refreshInterval?: number;

  /** Show/hide header */
  showHeader?: boolean;

  /** Compact mode */
  compact?: boolean;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Overall integrity score display
 */
function IntegrityScoreDisplay({ result }: { result: SystemIntegrityResult | null }) {
  if (!result) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
      </div>
    );
  }

  const statusColors = {
    healthy: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    critical: 'text-red-600 dark:text-red-400',
  };

  const scoreColor = result.score >= 80 ? 'green' : result.score >= 50 ? 'yellow' : 'red';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          System Integrity
        </h2>
        <div className={`flex items-center gap-2 ${statusColors[result.status]}`}>
          {result.status === 'healthy' && <CheckCircle className="w-5 h-5" />}
          {result.status === 'warning' && <AlertTriangle className="w-5 h-5" />}
          {result.status === 'critical' && <XCircle className="w-5 h-5" />}
          <span className="capitalize font-medium">{result.status}</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className={`text-${scoreColor}-200 dark:text-${scoreColor}-900`}
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 56}`}
              strokeDashoffset={`${2 * Math.PI * 56 * (1 - result.score / 100)}`}
              className={`text-${scoreColor}-500 dark:text-${scoreColor}-400`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              {result.score}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Issues</span>
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {result.totalIssues}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Repairable</span>
            <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {result.repairableIssues.length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Last Check</span>
            <span className="text-sm text-gray-500 dark:text-gray-500">
              {new Date(result.timestamp).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Issues list component
 */
function IssuesList({
  title,
  issues,
  severity,
  expanded,
  onToggle,
}: {
  title: string;
  issues: IntegrityIssue[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  expanded: boolean;
  onToggle: () => void;
}) {
  const severityColors = {
    critical: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    high: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
    medium: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    low: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
  };

  const severityTextColors = {
    critical: 'text-red-700 dark:text-red-400',
    high: 'text-orange-700 dark:text-orange-400',
    medium: 'text-yellow-700 dark:text-yellow-400',
    low: 'text-blue-700 dark:text-blue-400',
  };

  if (issues.length === 0) {
    return null;
  }

  return (
    <div className={`border-l-4 ${severityColors[severity]} rounded-r-lg overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
          <span className={`font-semibold ${severityTextColors[severity]}`}>
            {title}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityTextColors[severity]} bg-white/50`}>
            {issues.length}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          {issues.map((issue) => (
            <IssueItem key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Single issue item
 */
function IssueItem({ issue }: { issue: IntegrityIssue }) {
  const [showDetails, setShowDetails] = useState(false);
  const repairSuggestion = getRepairSuggestion(issue);
  const safetyLevel = estimateRepairSafety(issue);

  const safetyColors = {
    safe: 'text-green-600 dark:text-green-400',
    caution: 'text-yellow-600 dark:text-yellow-400',
    dangerous: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {issue.store.database}.{issue.store.store}
            </span>
            {issue.recordId && (
              <span className="text-xs text-gray-500 dark:text-gray-500">
                ID: {issue.recordId}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {issue.description}
          </p>
          {issue.field && (
            <span className="text-xs text-gray-500 dark:text-gray-500">
              Field: {issue.field}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {issue.repairable && repairSuggestion && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
              title="View repair details"
            >
              <Wrench className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {showDetails && repairSuggestion && (
        <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Repair Suggestion
            </span>
            <span className={`text-xs font-medium ${safetyColors[safetyLevel]}`}>
              {safetyLevel}
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{repairSuggestion}</p>
          {issue.expected && issue.actual && (
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              <div>Expected: {issue.expected}</div>
              <div>Actual: {issue.actual}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Database breakdown
 */
function DatabaseBreakdown({ result }: { result: SystemIntegrityResult }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {result.databases.map((db) => (
        <div
          key={db.database}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
        >
          <button
            onClick={() => setExpanded(expanded === db.database ? null : db.database)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {db.database}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-500">
                ({db.stores.length} stores)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {db.score}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {db.totalIssues} issues
                </div>
              </div>
              {expanded === db.database ? (
                <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </div>
          </button>

          {expanded === db.database && (
            <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:border-gray-700">
              {db.stores.map((store) => (
                <div key={store.store.store} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {store.store.store}
                    </span>
                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                      <span>{store.totalRecords} records</span>
                      <span>{store.validRecords} valid</span>
                      <span>{store.issues.length} issues</span>
                      <span className="font-semibold">{store.score}/100</span>
                    </div>
                  </div>
                  {store.issues.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {store.issues.slice(0, 5).map((issue) => (
                        <span
                          key={issue.id}
                          className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                          {issue.type}
                        </span>
                      ))}
                      {store.issues.length > 5 && (
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          +{store.issues.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Repair dialog
 */
function RepairDialog({
  result,
  onRepair,
  onClose,
}: {
  result: SystemIntegrityResult;
  onRepair: (options: RepairOptions) => Promise<void>;
  onClose: () => void;
}) {
  const [autoRepair, setAutoRepair] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [createBackup, setCreateBackup] = useState(true);
  const [isRepairing, setIsRepairing] = useState(false);

  const handleRepair = async () => {
    setIsRepairing(true);
    try {
      await onRepair({
        autoRepair,
        dryRun,
        createBackup,
      });
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wrench className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Repair Data Issues
          </h3>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Found {result.repairableIssues.length} repairable issues out of {result.totalIssues} total issues.
          </p>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={createBackup}
              onChange={(e) => setCreateBackup(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Create backup before repair
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Dry run (preview changes)
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRepair}
              onChange={(e) => setAutoRepair(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Auto-repair all issues
            </span>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRepair}
            disabled={isRepairing}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
          >
            {isRepairing ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Repairing...
              </span>
            ) : (
              'Start Repair'
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isRepairing}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function IntegrityDashboard({
  refreshInterval,
  showHeader = true,
  compact = false,
}: IntegrityDashboardProps) {
  const [result, setResult] = useState<SystemIntegrityResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    critical: true,
    high: true,
    medium: false,
    low: false,
  });
  const [showRepairDialog, setShowRepairDialog] = useState(false);
  const [repairResult, setRepairResult] = useState<RepairResult | null>(null);

  // Load integrity data
  const loadIntegrity = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await checkSystemIntegrity({
        onProgress: (progress, message) => {
          console.log(`[Integrity] ${progress}% - ${message}`);
        },
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error('[Integrity] Failed to load:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadIntegrity();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(() => {
      loadIntegrity();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Handle repair
  const handleRepair = async (options: RepairOptions) => {
    if (!result) return;

    try {
      const repairData = await repairSystem(result, {
        ...options,
        onProgress: (progress, message) => {
          console.log(`[Repair] ${progress}% - ${message}`);
        },
      });

      setRepairResult(repairData);
      setShowRepairDialog(false);

      // Reload integrity after repair
      await loadIntegrity();
    } catch (err) {
      console.error('[Repair] Failed:', err);
    }
  };

  if (isLoading && !result) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm">
        <div className="flex items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
          <span className="text-gray-700 dark:text-gray-300">Checking system integrity...</span>
        </div>
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <XCircle className="w-6 h-6" />
          <div>
            <div className="font-semibold">Failed to load integrity data</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Data Integrity
            </h1>
          </div>
          <button
            onClick={loadIntegrity}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      )}

      {/* Score Display */}
      <IntegrityScoreDisplay result={result} />

      {/* Quick Actions */}
      {result && result.repairableIssues.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Repair Available
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {result.repairableIssues.length} issues can be automatically repaired
              </p>
            </div>
            <button
              onClick={() => setShowRepairDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Wrench className="w-4 h-4" />
              Repair Issues
            </button>
          </div>
        </div>
      )}

      {/* Issues by Severity */}
      {result && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Issues by Severity
          </h2>
          <IssuesList
            title="Critical Issues"
            issues={result.criticalIssues}
            severity="critical"
            expanded={expandedSections.critical}
            onToggle={() =>
              setExpandedSections((prev) => ({ ...prev, critical: !prev.critical }))
            }
          />
          <IssuesList
            title="High Severity Issues"
            issues={result.highIssues}
            severity="high"
            expanded={expandedSections.high}
            onToggle={() =>
              setExpandedSections((prev) => ({ ...prev, high: !prev.high }))
            }
          />
          <IssuesList
            title="Medium Severity Issues"
            issues={result.mediumIssues}
            severity="medium"
            expanded={expandedSections.medium}
            onToggle={() =>
              setExpandedSections((prev) => ({ ...prev, medium: !prev.medium }))
            }
          />
          <IssuesList
            title="Low Severity Issues"
            issues={result.lowIssues}
            severity="low"
            expanded={expandedSections.low}
            onToggle={() =>
              setExpandedSections((prev) => ({ ...prev, low: !prev.low }))
            }
          />
        </div>
      )}

      {/* Database Breakdown */}
      {result && !compact && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Database Breakdown
          </h2>
          <DatabaseBreakdown result={result} />
        </div>
      )}

      {/* Summary Statistics */}
      {result && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {result.summary.totalDatabases}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Databases</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {result.summary.totalStores}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Stores</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {result.summary.totalRecords.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Records</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {result.summary.validRecords.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Valid</div>
            </div>
          </div>
        </div>
      )}

      {/* Repair Dialog */}
      {showRepairDialog && result && (
        <RepairDialog
          result={result}
          onRepair={handleRepair}
          onClose={() => setShowRepairDialog(false)}
        />
      )}

      {/* Repair Result */}
      {repairResult && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Repair Complete
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status</span>
              <span className={`font-medium ${repairResult.success ? 'text-green-600' : 'text-yellow-600'}`}>
                {repairResult.success ? 'Success' : 'Partial'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Repaired</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {repairResult.repairedIssues.length} issues
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Requires Review</span>
              <span className="font-medium text-yellow-600">
                {repairResult.requiresManualReview.length} issues
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Records Affected</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {repairResult.recordsAffected}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Duration</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {repairResult.duration}ms
              </span>
            </div>
          </div>
          <button
            onClick={() => setRepairResult(null)}
            className="mt-4 w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
