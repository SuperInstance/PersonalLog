/**
 * State Inspector - View and Edit Application State
 *
 * @component components/devtools/StateInspector
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Download, Upload, Eye, Edit3, ChevronRight, ChevronDown } from 'lucide-react';
import { stateInspector } from '../../lib/devtools/state';

interface StateNode {
  key: string;
  value: any;
  type: string;
  children?: StateNode[];
  expanded?: boolean;
}

export function StateInspector() {
  const [state, setState] = useState<Record<string, any>>({});
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Load state
  const loadState = useCallback(async () => {
    try {
      const allState = await stateInspector.inspectAllStates();
      setState(allState);
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }, []);

  useEffect(() => {
    loadState();
    const interval = setInterval(loadState, 2000); // Auto-refresh every 2s
    return () => clearInterval(interval);
  }, [loadState]);

  // Toggle path expansion
  const togglePath = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Build state tree
  const buildStateTree = useCallback((obj: any, path: string = ''): StateNode[] => {
    if (obj === null || obj === undefined) {
      return [{ key: path || 'root', value: obj, type: typeof obj }];
    }

    if (Array.isArray(obj)) {
      return obj.map((item, index) => ({
        key: `${path}[${index}]`,
        value: item,
        type: Array.isArray(item) ? 'array' : typeof item,
        children: typeof item === 'object' && item !== null ? buildStateTree(item, `${path}[${index}]`) : undefined,
      }));
    }

    if (typeof obj === 'object') {
      return Object.entries(obj).map(([key, value]) => ({
        key,
        value,
        type: Array.isArray(value) ? 'array' : typeof value,
        children: typeof value === 'object' && value !== null ? buildStateTree(value, key) : undefined,
      }));
    }

    return [{ key: path || 'root', value: obj, type: typeof obj }];
  }, []);

  // Filter state by search
  const filterState = useCallback((nodes: StateNode[], query: string): StateNode[] => {
    if (!query) return nodes;

    const lowerQuery = query.toLowerCase();

    return nodes.reduce((acc: StateNode[], node) => {
      const matchesKey = node.key.toLowerCase().includes(lowerQuery);
      const matchesValue = JSON.stringify(node.value).toLowerCase().includes(lowerQuery);

      if (matchesKey || matchesValue) {
        acc.push(node);
      } else if (node.children) {
        const filteredChildren = filterState(node.children, query);
        if (filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren });
        }
      }

      return acc;
    }, []);
  }, []);

  // Render state node
  const renderNode = useCallback((node: StateNode, path: string = '', depth: number = 0) => {
    const fullPath = path ? `${path}.${node.key}` : node.key;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedPaths.has(fullPath);
    const isEditing = editingPath === fullPath;

    const typeColor = {
      string: 'text-green-600 dark:text-green-400',
      number: 'text-blue-600 dark:text-blue-400',
      boolean: 'text-purple-600 dark:text-purple-400',
      object: 'text-orange-600 dark:text-orange-400',
      array: 'text-cyan-600 dark:text-cyan-400',
    }[node.type] || 'text-gray-600 dark:text-gray-400';

    return (
      <div key={fullPath} style={{ paddingLeft: `${depth * 16}px` }}>
        <div className="flex items-center gap-1 py-0.5 hover:bg-muted/50 rounded">
          {hasChildren && (
            <button
              onClick={() => togglePath(fullPath)}
              className="p-0.5 hover:bg-muted rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}

          <span className="text-xs font-mono text-muted-foreground">{node.key}:</span>

          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // Save value
                  setEditingPath(null);
                } else if (e.key === 'Escape') {
                  setEditingPath(null);
                }
              }}
              onBlur={() => setEditingPath(null)}
              className="flex-1 px-1 py-0.5 text-xs bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          ) : (
            <>
              <span className={`text-xs font-mono ${typeColor}`}>
                {typeof node.value === 'string' ? `"${node.value}"` : String(node.value)}
              </span>

              <button
                onClick={() => {
                  setEditingPath(fullPath);
                  setEditValue(JSON.stringify(node.value));
                }}
                className="p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>

        {hasChildren && isExpanded && node.children!.map((child) => renderNode(child, fullPath, depth + 1))}
      </div>
    );
  }, [expandedPaths, editingPath, editValue, togglePath]);

  // Get scopes
  const scopes = ['all', 'app', 'plugin', 'theme', 'storage', 'custom'];

  // Filter and build tree
  const filteredState = Object.entries(state).reduce((acc, [key, value]) => {
    if (selectedScope === 'all' || key.startsWith(selectedScope)) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);

  const stateTree = buildStateTree(filteredState);
  const filteredTree = filterState(stateTree, searchQuery);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Application State</h3>

        <div className="flex items-center gap-2">
          <button
            onClick={loadState}
            className="p-1.5 hover:bg-muted rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            className="p-1.5 hover:bg-muted rounded transition-colors"
            title="Export state"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scope Filter */}
      <div className="flex items-center gap-2">
        {scopes.map((scope) => (
          <button
            key={scope}
            onClick={() => setSelectedScope(scope)}
            className={`px-2 py-1 text-xs rounded capitalize transition-colors ${
              selectedScope === scope
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {scope}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search state..."
          className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* State Tree */}
      <div className="space-y-1 overflow-auto max-h-[calc(100vh-300px)]">
        {filteredTree.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            {searchQuery ? 'No matching state found' : 'No state available'}
          </div>
        ) : (
          filteredTree.map((node) => renderNode(node))
        )}
      </div>
    </div>
  );
}
