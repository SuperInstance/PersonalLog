/**
 * DevTools Console - Enhanced Logging Console
 *
 * @component components/devtools/Console
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Search, Filter, ChevronDown, ChevronRight, Bug } from 'lucide-react';
import { logger, type LogLevel, type LogCategory, type LogEntry } from '../../lib/devtools/logger';

export function DevToolsConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<LogCategory | 'all'>('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Subscribe to logs
  useEffect(() => {
    const unsubscribe = logger.subscribe((entry) => {
      setLogs((prev) => [entry, ...prev].slice(0, 500)); // Keep last 500
    });

    // Load existing logs
    setLogs(logger.getLogs());

    return unsubscribe;
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current && logs.length > 0) {
      containerRef.current.scrollTop = 0;
    }
  }, [logs]);

  // Clear logs
  const clearLogs = () => {
    logger.clear();
    setLogs([]);
  };

  // Toggle log expansion
  const toggleLogExpansion = (id: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    // Level filter
    if (levelFilter !== 'all' && log.level !== levelFilter) {
      return false;
    }

    // Category filter
    if (categoryFilter !== 'all' && log.category !== categoryFilter) {
      return false;
    }

    // Search filter
    if (filter) {
      const search = filter.toLowerCase();
      return (
        log.message.toLowerCase().includes(search) ||
        JSON.stringify(log.data).toLowerCase().includes(search)
      );
    }

    return true;
  });

  // Get level icon
  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'debug':
        return <Bug className="w-3 h-3 text-gray-500" />;
      case 'info':
        return <div className="w-3 h-3 rounded-full bg-blue-500" />;
      case 'warn':
        return <div className="w-3 h-3 rounded-full bg-yellow-500" />;
      case 'error':
        return <div className="w-3 h-3 rounded-full bg-red-500" />;
    }
  };

  // Get level color
  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'debug':
        return 'text-gray-500';
      case 'info':
        return 'text-blue-500';
      case 'warn':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
    }
  };

  const categories: Array<LogCategory | 'all'> = [
    'all',
    'plugin',
    'theme',
    'api',
    'ui',
    'storage',
    'performance',
    'network',
    'system',
    'general',
  ];

  const levels: Array<LogLevel | 'all'> = ['all', 'debug', 'info', 'warn', 'error'];

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="p-2 border-b border-border space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search logs..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as LogLevel | 'all')}
            className="px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {levels.map((level) => (
              <option key={level} value={level} className="capitalize">
                {level}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as LogCategory | 'all')}
            className="px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {categories.map((category) => (
              <option key={category} value={category} className="capitalize">
                {category}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          <button
            onClick={clearLogs}
            className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Logs */}
      <div ref={containerRef} className="flex-1 overflow-auto p-2 space-y-1">
        {filteredLogs.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            {logs.length === 0 ? 'No logs yet' : 'No logs match your filters'}
          </div>
        ) : (
          filteredLogs.map((log) => {
            const hasData = log.data !== undefined;
            const isExpanded = expandedLogs.has(log.id);

            return (
              <div key={log.id} className="font-mono text-xs hover:bg-muted/50 rounded p-1">
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => toggleLogExpansion(log.id)}
                    className="mt-0.5 hover:bg-muted rounded transition-colors"
                  >
                    {hasData ? (
                      isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )
                    ) : null}
                  </button>

                  {getLevelIcon(log.level)}

                  <span className="text-muted-foreground">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>

                  <span className="text-muted-foreground capitalize">[{log.category}]</span>

                  {log.source && (
                    <span className="text-muted-foreground">[{log.source}]</span>
                  )}

                  <span className={getLevelColor(log.level)}>{log.message}</span>
                </div>

                {/* Data */}
                {hasData && isExpanded && (
                  <div className="mt-1 ml-6 p-2 bg-muted rounded overflow-auto max-h-40">
                    <pre className="text-xs">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Stack trace */}
                {log.stack && isExpanded && (
                  <div className="mt-1 ml-6 p-2 bg-destructive/10 text-destructive text-xs rounded overflow-auto max-h-40">
                    <pre>{log.stack}</pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
