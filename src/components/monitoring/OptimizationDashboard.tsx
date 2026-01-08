/**
 * Optimization Dashboard
 *
 * Visual interface for the adaptive optimization system.
 * Shows active triggers, optimization history, effectiveness charts,
 * and provides manual controls.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { getOptimizationEngine } from '@/lib/monitoring/optimization-engine';
import type {
  OptimizationTrigger,
  Optimization,
  OptimizationExecution,
  RuleStatistics,
} from '@/lib/monitoring/optimization-types';

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: 'p-6 space-y-6',
  header: 'flex items-center justify-between',
  title: 'text-2xl font-bold text-gray-900 dark:text-gray-100',
  grid: 'grid grid-cols-1 lg:grid-cols-2 gap-6',
  card: 'bg-white dark:bg-gray-800 rounded-lg shadow-md p-6',
  cardHeader: 'flex items-center justify-between mb-4',
  cardTitle: 'text-lg font-semibold text-gray-900 dark:text-gray-100',
  badge: (color: 'green' | 'yellow' | 'red' | 'blue' | 'gray') => {
    const colors = {
      green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };
    return `px-2 py-1 rounded text-xs font-medium ${colors[color]}`;
  },
  button: 'px-4 py-2 rounded font-medium transition-colors',
  buttonPrimary: 'bg-blue-600 text-white hover:bg-blue-700',
  buttonSecondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200',
  buttonDanger: 'bg-red-600 text-white hover:bg-red-700',
  table: 'w-full text-sm',
  tableHead: 'bg-gray-50 dark:bg-gray-700',
  tableRow: 'border-b dark:border-gray-700',
  tableCell: 'px-4 py-3',
  input: 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
  label: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1',
};

// ============================================================================
// COMPONENTS
// ============================================================================

interface StatusBadgeProps {
  status: 'running' | 'stopped';
}

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={styles.badge(status === 'running' ? 'green' : 'gray')}>
      {status === 'running' ? 'Running' : 'Stopped'}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: OptimizationTrigger['priority'];
}

function PriorityBadge({ priority }: PriorityBadgeProps) {
  const colors = {
    critical: 'red',
    high: 'yellow',
    medium: 'blue',
    low: 'gray',
  } as const;

  return (
    <span className={styles.badge(colors[priority])}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

interface EffectivenessBarProps {
  effectiveness: number;
}

function EffectivenessBar({ effectiveness }: EffectivenessBarProps) {
  const getColor = () => {
    if (effectiveness >= 70) return 'bg-green-500';
    if (effectiveness >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${getColor()}`}
        style={{ width: `${Math.min(100, Math.max(0, effectiveness))}%` }}
      />
    </div>
  );
}

interface TriggerCardProps {
  trigger: OptimizationTrigger;
  statistics?: RuleStatistics;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (trigger: OptimizationTrigger) => void;
}

function TriggerCard({ trigger, statistics, onToggle, onEdit }: TriggerCardProps) {
  return (
    <div className="border rounded-lg p-4 dark:border-gray-700 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">{trigger.name}</h3>
          <PriorityBadge priority={trigger.priority} />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={trigger.enabled}
            onChange={(e) => onToggle(trigger.id, e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">Enabled</span>
        </label>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">{trigger.description}</p>

      <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
        <div>Conditions: {trigger.conditions.length}</div>
        <div>Optimization: {trigger.optimizationId}</div>
        <div>Cooldown: {trigger.cooldown / 1000}s</div>
        {statistics && (
          <div>
            Triggered: {statistics.triggerCount}x | Effectiveness:{' '}
            {Math.round(statistics.avgEffectiveness)}%
          </div>
        )}
      </div>

      <button
        onClick={() => onEdit(trigger)}
        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        Edit
      </button>
    </div>
  );
}

interface ExecutionRowProps {
  execution: OptimizationExecution;
  optimization: Optimization | undefined;
}

function ExecutionRow({ execution, optimization }: ExecutionRowProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: OptimizationExecution['status']) => {
    switch (status) {
      case 'completed':
        return styles.badge('green');
      case 'failed':
        return styles.badge('red');
      case 'running':
        return styles.badge('blue');
      case 'rolled-back':
        return styles.badge('yellow');
      default:
        return styles.badge('gray');
    }
  };

  return (
    <tr className={styles.tableRow}>
      <td className={styles.tableCell}>
        <div className="font-medium">{optimization?.name || execution.optimizationId}</div>
        {execution.triggerId !== 'manual' && (
          <div className="text-xs text-gray-500">Trigger: {execution.triggerId}</div>
        )}
      </td>
      <td className={styles.tableCell}>
        <span className={getStatusColor(execution.status)}>{execution.status}</span>
        {execution.rolledBack && (
          <span className="ml-1 text-xs text-gray-500">(Rolled back)</span>
        )}
      </td>
      <td className={styles.tableCell}>{formatDate(execution.triggeredAt)}</td>
      <td className={styles.tableCell}>
        {execution.duration ? `${execution.duration}ms` : '-'}
      </td>
      <td className={styles.tableCell}>
        {execution.effectiveness !== undefined ? (
          <div className="w-24">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>{execution.effectiveness}%</span>
            </div>
            <EffectivenessBar effectiveness={execution.effectiveness} />
          </div>
        ) : (
          '-'
        )}
      </td>
    </tr>
  );
}

// ============================================================================
// MAIN DASHBOARD
// ============================================================================

export default function OptimizationDashboard() {
  const [running, setRunning] = useState(false);
  const [triggers, setTriggers] = useState<OptimizationTrigger[]>([]);
  const [optimizations, setOptimizations] = useState<Optimization[]>([]);
  const [executions, setExecutions] = useState<OptimizationExecution[]>([]);
  const [statistics, setStatistics] = useState<Record<string, RuleStatistics>>({});
  const [selectedTrigger, setSelectedTrigger] = useState<OptimizationTrigger | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const engine = getOptimizationEngine();

  // Load data
  const loadData = () => {
    setTriggers(engine.getTriggers());
    setOptimizations(engine.getOptimizations());
    setExecutions(engine.getExecutionHistory(50));
    setStatistics(engine.getRuleStatistics());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const handleToggleEngine = () => {
    if (running) {
      engine.stop();
      setRunning(false);
    } else {
      engine.start();
      setRunning(true);
    }
  };

  const handleToggleTrigger = (id: string, enabled: boolean) => {
    engine.setTriggerEnabled(id, enabled);
    loadData();
  };

  const handleManualTrigger = async (optimizationId: string) => {
    try {
      await engine.triggerOptimization(optimizationId);
      loadData();
    } catch (error) {
      console.error('Failed to trigger optimization:', error);
    }
  };

  const handleEditTrigger = (trigger: OptimizationTrigger) => {
    setSelectedTrigger(trigger);
    setShowEditModal(true);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Optimization Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Automatic performance optimization and monitoring
          </p>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={running ? 'running' : 'stopped'} />
          <button
            onClick={handleToggleEngine}
            className={`${styles.button} ${running ? styles.buttonDanger : styles.buttonPrimary}`}
          >
            {running ? 'Stop Engine' : 'Start Engine'}
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={styles.card}>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {triggers.filter((t) => t.enabled).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Active Triggers</div>
        </div>
        <div className={styles.card}>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {executions.filter((e) => e.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Successful Optimizations</div>
        </div>
        <div className={styles.card}>
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {executions.filter((e) => e.rolledBack).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Rollbacks</div>
        </div>
        <div className={styles.card}>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {optimizations.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Available Optimizations</div>
        </div>
      </div>

      {/* Triggers and Optimizations */}
      <div className={styles.grid}>
        {/* Active Triggers */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Active Triggers</h2>
            <span className="text-sm text-gray-500">
              {triggers.filter((t) => t.enabled).length} / {triggers.length} enabled
            </span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {triggers.map((trigger) => (
              <TriggerCard
                key={trigger.id}
                trigger={trigger}
                statistics={statistics[trigger.id]}
                onToggle={handleToggleTrigger}
                onEdit={handleEditTrigger}
              />
            ))}
          </div>
        </div>

        {/* Manual Optimization Controls */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Manual Optimizations</h2>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {optimizations.map((opt) => (
              <div
                key={opt.id}
                className="border rounded-lg p-3 dark:border-gray-700 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{opt.name}</div>
                  <div className="text-xs text-gray-500">{opt.description}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Tags: {opt.tags.join(', ')}
                  </div>
                </div>
                <button
                  onClick={() => handleManualTrigger(opt.id)}
                  className={`${styles.button} ${styles.buttonSecondary} text-sm`}
                >
                  Run
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Execution History */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Execution History</h2>
          <button onClick={loadData} className={`${styles.button} ${styles.buttonSecondary} text-sm`}>
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={`${styles.tableCell} text-left`}>Optimization</th>
                <th className={`${styles.tableCell} text-left`}>Status</th>
                <th className={`${styles.tableCell} text-left`}>Triggered</th>
                <th className={`${styles.tableCell} text-left`}>Duration</th>
                <th className={`${styles.tableCell} text-left`}>Effectiveness</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((execution) => (
                <ExecutionRow
                  key={execution.id}
                  execution={execution}
                  optimization={optimizations.find((o) => o.id === execution.optimizationId)}
                />
              ))}
              {executions.length === 0 && (
                <tr>
                  <td colSpan={5} className={`${styles.tableCell} text-center text-gray-500`}>
                    No executions yet. Start the engine to see optimization history.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal (simplified) */}
      {showEditModal && selectedTrigger && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Trigger</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={styles.label}>Name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={selectedTrigger.name}
                  readOnly
                />
              </div>

              <div>
                <label className={styles.label}>Description</label>
                <textarea
                  className={styles.input}
                  rows={3}
                  value={selectedTrigger.description}
                  readOnly
                />
              </div>

              <div>
                <label className={styles.label}>Priority</label>
                <select className={styles.input} value={selectedTrigger.priority} disabled>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className={styles.label}>Cooldown (milliseconds)</label>
                <input
                  type="number"
                  className={styles.input}
                  value={selectedTrigger.cooldown}
                  readOnly
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Trigger Conditions ({selectedTrigger.conditions.length})
                </p>
                <ul className="mt-2 space-y-1 text-blue-800 dark:text-blue-200">
                  {selectedTrigger.conditions.map((cond, i) => (
                    <li key={i}>
                      {cond.metric} {cond.operator} {JSON.stringify(cond.threshold)}
                      {cond.duration && ` for ${cond.duration / 1000}s`}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className={`${styles.button} ${styles.buttonSecondary}`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
