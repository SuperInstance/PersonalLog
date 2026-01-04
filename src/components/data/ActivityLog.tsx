'use client';

/**
 * Activity Log Component
 *
 * Displays chronological list of data operations with filtering and export.
 * Shows operation status, duration, and details.
 */

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, Loader2, Download, Trash2, Filter } from 'lucide-react';
import { DataOperation, LogFilter, getActivityLogs, exportActivityLogsAsCSV, clearActivityLogs } from '@/lib/data';

interface Props {
  limit?: number;
  showFilters?: boolean;
}

export function ActivityLog({ limit = 20, showFilters = true }: Props) {
  const [logs, setLogs] = useState<DataOperation[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<DataOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LogFilter>({});
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await getActivityLogs();
      setLogs(data.slice(0, limit));
      setFilteredLogs(data.slice(0, limit));
    } catch (error) {
      console.error('Failed to load activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [limit]);

  useEffect(() => {
    applyFilter();
  }, [filter, logs]);

  const applyFilter = async () => {
    if (Object.keys(filter).length === 0) {
      setFilteredLogs(logs);
      return;
    }

    try {
      const filtered = await getActivityLogs({ ...filter, search: filter.search });
      setFilteredLogs(filtered);
    } catch (error) {
      console.error('Failed to filter logs:', error);
    }
  };

  const handleExport = async () => {
    try {
      const csv = await exportActivityLogsAsCSV(filter);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-log-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all activity logs?')) {
      return;
    }

    try {
      await clearActivityLogs();
      setLogs([]);
      setFilteredLogs([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const toggleTypeFilter = (type: DataOperation['type']) => {
    setFilter(prev => {
      const types = prev.types || [];
      const newTypes = types.includes(type)
        ? types.filter(t => t !== type)
        : [...types, type];
      return { ...prev, types: newTypes.length > 0 ? newTypes : undefined };
    });
  };

  const toggleStatusFilter = (status: DataOperation['status']) => {
    setFilter(prev => {
      const statuses = prev.status || [];
      const newStatuses = statuses.includes(status)
        ? statuses.filter(s => s !== status)
        : [...statuses, status];
      return { ...prev, status: newStatuses.length > 0 ? newStatuses : undefined };
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Activity Log
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Recent data operations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showFilters && (
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
                title="Filter logs"
              >
                <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                {Object.keys(filter).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full text-xs text-white flex items-center justify-center">
                    {[...(filter.types || []), ...(filter.status || [])].length}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={handleExport}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Export as CSV"
            >
              <Download className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <button
              onClick={handleClear}
              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Clear logs"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
            </button>
          </div>
        </div>

        {/* Filter Menu */}
        {showFilterMenu && showFilters && (
          <FilterMenu
            filter={filter}
            onToggleType={toggleTypeFilter}
            onToggleStatus={toggleStatusFilter}
            onClearFilters={() => setFilter({})}
            onClose={() => setShowFilterMenu(false)}
          />
        )}
      </div>

      {/* Log Entries */}
      <div className="space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
            <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              {Object.keys(filter).length > 0 ? 'No logs match the current filters' : 'No activity logged yet'}
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => <LogEntry key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}

interface FilterMenuProps {
  filter: LogFilter;
  onToggleType: (type: DataOperation['type']) => void;
  onToggleStatus: (status: DataOperation['status']) => void;
  onClearFilters: () => void;
  onClose: () => void;
}

function FilterMenu({ filter, onToggleType, onToggleStatus, onClearFilters, onClose }: FilterMenuProps) {
  const types: DataOperation['type'][] = ['backup', 'restore', 'sync', 'export', 'import', 'cleanup', 'optimize', 'verify'];
  const statuses: DataOperation['status'][] = ['success', 'failed', 'in_progress'];

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-slate-900 dark:text-slate-100">Filter Logs</h4>
        <button
          onClick={onClearFilters}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type Filters */}
        <div>
          <h5 className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
            Operation Type
          </h5>
          <div className="flex flex-wrap gap-2">
            {types.map((type) => (
              <FilterBadge
                key={type}
                label={type}
                selected={!!filter.types?.includes(type)}
                onClick={() => onToggleType(type)}
              />
            ))}
          </div>
        </div>

        {/* Status Filters */}
        <div>
          <h5 className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
            Status
          </h5>
          <div className="flex flex-wrap gap-2">
            {statuses.map((status) => (
              <FilterBadge
                key={status}
                label={status}
                selected={!!filter.status?.includes(status)}
                onClick={() => onToggleStatus(status)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FilterBadgeProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

function FilterBadge({ label, selected, onClick }: FilterBadgeProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
        selected
          ? 'bg-blue-500 text-white'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
      }`}
    >
      {label}
    </button>
  );
}

interface LogEntryProps {
  log: DataOperation;
}

function LogEntry({ log }: LogEntryProps) {
  const getStatusIcon = () => {
    switch (log.status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'in_progress':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-slate-500" />;
    }
  };

  const getTypeColor = () => {
    const colors: Record<DataOperation['type'], string> = {
      backup: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      restore: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      sync: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      export: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
      import: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      cleanup: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      optimize: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800',
      verify: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    };
    return colors[log.type];
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getStatusIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getTypeColor()}`}>
              {log.type}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {new Date(log.timestamp).toLocaleString()}
            </span>
          </div>
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
            {log.details.description}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            {log.details.itemsAffected !== undefined && (
              <span>Items: {log.details.itemsAffected}</span>
            )}
            {log.details.sizeProcessed && (
              <span>Size: {(log.details.sizeProcessed / 1024 / 1024).toFixed(2)} MB</span>
            )}
            {log.details.duration && (
              <span>Duration: {(log.details.duration / 1000).toFixed(2)}s</span>
            )}
          </div>
          {log.details.error && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2">
              Error: {log.details.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
