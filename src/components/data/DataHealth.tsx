'use client';

/**
 * Data Health Component
 *
 * Displays data health status with checks, issues, and recommendations.
 * Shows overall health score and individual check results.
 */

import React, { useState, useEffect } from 'react';
import { Heart, Activity, AlertCircle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { DataHealth as DataHealthType, performHealthScan, saveHealthCheck, loadHealthCheck } from '@/lib/data';

interface Props {
  onRefresh?: () => void;
}

export function DataHealth({ onRefresh }: Props) {
  const [health, setHealth] = useState<DataHealthType | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const loadHealth = async () => {
    try {
      setLoading(true);
      const saved = loadHealthCheck();
      if (saved) {
        setHealth(saved);
      }
    } catch (error) {
      console.error('Failed to load health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runScan = async () => {
    try {
      setScanning(true);
      const result = await performHealthScan();
      setHealth(result);
      saveHealthCheck(result);
      onRefresh?.();
    } catch (error) {
      console.error('Health scan failed:', error);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="text-center py-8">
          <Heart className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 mb-4">No health data available</p>
          <button
            onClick={runScan}
            disabled={scanning}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {scanning ? 'Scanning...' : 'Run Health Scan'}
          </button>
        </div>
      </div>
    );
  }

  const overallColor = getOverallColor(health.overall);
  const overallBg = getOverallBg(health.overall);

  return (
    <div className="space-y-4">
      {/* Overall Health */}
      <div className={`rounded-xl border-2 p-6 ${overallBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${overallColor.iconBg}`}>
              <Heart className={`w-6 h-6 ${overallColor.iconText}`} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Overall Health
              </h3>
              <div className={`text-2xl font-bold mt-1 capitalize ${overallColor.text}`}>
                {health.overall}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Last scan: {new Date(health.lastScan).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={runScan}
            disabled={scanning}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>
      </div>

      {/* Health Checks */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Health Checks
        </h3>
        <div className="space-y-3">
          {health.checks.map((check) => (
            <HealthCheckRow key={check.name} check={check} />
          ))}
        </div>
      </div>

      {/* Issues */}
      {health.issues.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Issues Found ({health.issues.length})
            </h3>
          </div>
          <div className="space-y-3">
            {health.issues.map((issue) => (
              <IssueRow key={issue.id} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {health.recommendations.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Recommendations
              </h4>
              <ul className="space-y-1">
                {health.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-blue-700 dark:text-blue-300">
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface HealthCheckRowProps {
  check: {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    action?: string;
  };
}

function HealthCheckRow({ check }: HealthCheckRowProps) {
  const getStatusIcon = () => {
    switch (check.status) {
      case 'pass':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warn':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusBg = () => {
    switch (check.status) {
      case 'pass':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'warn':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
      case 'fail':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getStatusBg()}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0 mt-0.5">{getStatusIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
              {check.name}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {check.message}
            </div>
            {check.action && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Suggested: {check.action}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface IssueRowProps {
  issue: {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    category: string;
    message: string;
    details?: string;
    action?: string;
  };
}

function IssueRow({ issue }: IssueRowProps) {
  const getSeverityColor = () => {
    switch (issue.severity) {
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-300',
          icon: 'text-red-500',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
          text: 'text-amber-700 dark:text-amber-300',
          icon: 'text-amber-500',
        };
      case 'info':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
          text: 'text-blue-700 dark:text-blue-300',
          icon: 'text-blue-500',
        };
    }
  };

  const colors = getSeverityColor();

  return (
    <div className={`p-3 rounded-lg border ${colors.bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium uppercase ${colors.text}`}>
              {issue.severity}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              • {issue.category}
            </span>
          </div>
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
            {issue.message}
          </div>
          {issue.details && (
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
              {issue.details}
            </div>
          )}
          {issue.action && (
            <div className="text-xs text-blue-600 dark:text-blue-400">
              Action: {issue.action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getOverallColor(health: DataHealthType['overall']) {
  switch (health) {
    case 'excellent':
      return {
        iconBg: 'bg-green-100 dark:bg-green-900/30',
        iconText: 'text-green-600 dark:text-green-400',
        text: 'text-green-600 dark:text-green-400',
      };
    case 'good':
      return {
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        iconText: 'text-blue-600 dark:text-blue-400',
        text: 'text-blue-600 dark:text-blue-400',
      };
    case 'fair':
      return {
        iconBg: 'bg-amber-100 dark:bg-amber-900/30',
        iconText: 'text-amber-600 dark:text-amber-400',
        text: 'text-amber-600 dark:text-amber-400',
      };
    case 'poor':
      return {
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        iconText: 'text-red-600 dark:text-red-400',
        text: 'text-red-600 dark:text-red-400',
      };
  }
}

function getOverallBg(health: DataHealthType['overall']) {
  switch (health) {
    case 'excellent':
      return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700';
    case 'good':
      return 'bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700';
    case 'fair':
      return 'bg-amber-100 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700';
    case 'poor':
      return 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700';
  }
}
