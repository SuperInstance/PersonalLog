'use client';

/**
 * World Model Dashboard Component
 *
 * Visualizes JEPA-style world model predictions including:
 * - Current conversation state
 * - Predicted future states (timeline)
 * - Agent need predictions
 * - Resource forecasts
 * - Anomaly detection alerts
 * - State transition graph
 *
 * Part of Neural MPC Phase 2: World Model Foundation
 */

import { useState, useEffect } from 'react';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Activity,
  Clock,
  Zap,
  Users,
  BarChart3,
  ChevronRight,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import type {
  ConversationState,
  PredictedState,
  AgentNeedPrediction,
  ResourcePrediction,
  AnomalyDetection,
} from '@/lib/intelligence/world-model-types';

// ============================================================================
// TYPES
// ============================================================================

interface WorldModelDashboardProps {
  currentState?: ConversationState | null;
  predictions?: PredictedState[];
  agentNeeds?: AgentNeedPrediction[];
  resourcePrediction?: ResourcePrediction;
  anomalies?: AnomalyDetection[];
  onRefresh?: () => void;
  loading?: boolean;
}

interface StateVisualizationProps {
  state: Partial<ConversationState>;
  label: string;
  confidence?: number;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * State visualization card
 */
function StateVisualization({ state, label, confidence }: StateVisualizationProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</h4>
        {confidence !== undefined && (
          <span
            className={`text-xs font-medium ${
              confidence >= 0.7
                ? 'text-green-600 dark:text-green-400'
                : confidence >= 0.4
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {(confidence * 100).toFixed(0)}% conf.
          </span>
        )}
      </div>

      {/* Emotion State */}
      {state.emotionState && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-600 dark:text-slate-400">Emotion</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{state.emotionState.category}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-xs text-slate-500">Valence</div>
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${(state.emotionState.valence || 0) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Arousal</div>
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{ width: `${(state.emotionState.arousal || 0) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Dominance</div>
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${(state.emotionState.dominance || 0) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Agents */}
      {state.activeAgents && state.activeAgents.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-600 dark:text-slate-400">Active Agents</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{state.activeAgents.length}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {state.activeAgents.slice(0, 3).map((agent) => (
              <span
                key={agent}
                className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
              >
                {agent}
              </span>
            ))}
            {state.activeAgents.length > 3 && (
              <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                +{state.activeAgents.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Task Type */}
      {state.currentTaskType && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-600 dark:text-slate-400">Current Task</span>
            <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">
              {state.currentTaskType.replace('_', ' ')}
            </span>
          </div>
        </div>
      )}

      {/* User Intent */}
      {state.userIntent && (
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-600 dark:text-slate-400">User Intent</span>
            <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">{state.userIntent}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Prediction timeline component
 */
function PredictionTimeline({ predictions }: { predictions: PredictedState[] }) {
  if (!predictions || predictions.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 text-center">
        <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-slate-600 dark:text-slate-400">No predictions available</p>
      </div>
    );
  }

  // Group by horizon
  const byHorizon = new Map<number, PredictedState[]>();
  for (const pred of predictions) {
    if (!byHorizon.has(pred.horizon)) {
      byHorizon.set(pred.horizon, []);
    }
    byHorizon.get(pred.horizon)!.push(pred);
  }

  return (
    <div className="space-y-3">
      {Array.from(byHorizon.entries())
        .sort(([a], [b]) => a - b)
        .map(([horizon, preds]) => (
          <div key={horizon} className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Step {horizon} (~{horizon * 10}s ahead)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
              {preds.slice(0, 4).map((pred, idx) => (
                <StateVisualization
                  key={`${horizon}-${idx}`}
                  state={pred.state}
                  label={`Prediction ${idx + 1}`}
                  confidence={pred.confidence}
                />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

/**
 * Agent need prediction component
 */
function AgentNeedsCard({ needs }: { needs: AgentNeedPrediction[] }) {
  if (!needs || needs.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 text-center">
        <Users className="w-6 h-6 text-slate-400 mx-auto mb-1" />
        <p className="text-xs text-slate-600 dark:text-slate-400">No agent predictions</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {needs.slice(0, 5).map((need) => (
        <div
          key={need.agentId}
          className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{need.agentId}</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {(need.probability * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-slate-500">
              in {((need.timeframe / 1000) | 0)}s
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Resource prediction component
 */
function ResourcePredictionCard({ prediction }: { prediction: ResourcePrediction }) {
  if (!prediction) {
    return null;
  }

  const utilization = prediction.tokenUsage / 50000; // Assume 50k max

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-5 h-5 text-blue-500" />
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Resource Forecast</h4>
      </div>

      {/* Token Usage */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-600 dark:text-slate-400">Token Usage</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {prediction.tokenUsage.toLocaleString()}
          </span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
            style={{ width: `${Math.min(100, utilization * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>P5: {prediction.lowerBound.toLocaleString()}</span>
          <span>P95: {prediction.upperBound.toLocaleString()}</span>
        </div>
      </div>

      {/* Time Estimate */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-600 dark:text-slate-400">Est. Time</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {((prediction.timeMs / 1000) | 0)}s
          </span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${Math.min(100, (prediction.timeMs / 30000) * 100)}%` }}
          />
        </div>
      </div>

      {/* Confidence */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">Confidence</span>
        <span
          className={`font-medium ${
            prediction.confidence >= 0.7
              ? 'text-green-600 dark:text-green-400'
              : prediction.confidence >= 0.4
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {(prediction.confidence * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

/**
 * Anomaly alerts component
 */
function AnomalyAlerts({ anomalies }: { anomalies: AnomalyDetection[] }) {
  if (!anomalies || anomalies.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
        <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
        <p className="text-xs text-green-700 dark:text-green-400">No anomalies detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {anomalies.map((anomaly, idx) => (
        <div
          key={idx}
          className={`p-3 rounded-lg border ${
            anomaly.severity >= 0.7
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : anomaly.severity >= 0.4
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          }`}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle
              className={`w-4 h-4 mt-0.5 ${
                anomaly.severity >= 0.7
                  ? 'text-red-500'
                  : anomaly.severity >= 0.4
                  ? 'text-yellow-500'
                  : 'text-blue-500'
              }`}
            />
            <div className="flex-1">
              <p className="text-xs font-medium text-slate-900 dark:text-slate-100 mb-1">
                {anomaly.description}
              </p>
              {anomaly.suggestions && anomaly.suggestions.length > 0 && (
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                  {anomaly.suggestions.map((suggestion, i) => (
                    <li key={i}>• {suggestion}</li>
                  ))}
                </ul>
              )}
            </div>
            <span className="text-xs font-medium text-slate-500">
              {(anomaly.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD
// ============================================================================

export function WorldModelDashboard({
  currentState,
  predictions = [],
  agentNeeds = [],
  resourcePrediction,
  anomalies = [],
  onRefresh,
  loading = false,
}: WorldModelDashboardProps) {
  const [selectedTab, setSelectedTab] = useState<
    'overview' | 'predictions' | 'agents' | 'resources' | 'anomalies'
  >('overview');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">World Model</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              JEPA-style predictive state estimation
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-slate-600 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'predictions', label: 'Predictions', icon: TrendingUp },
          { id: 'agents', label: 'Agent Needs', icon: Users },
          { id: 'resources', label: 'Resources', icon: BarChart3 },
          { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'anomalies' && anomalies.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                {anomalies.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {selectedTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current State */}
            {currentState && (
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Current State</h3>
                <StateVisualization state={currentState} label="Now" confidence={1} />
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Prediction Summary
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Total Predictions</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{predictions.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">High Confidence</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {predictions.filter((p) => p.confidence >= 0.7).length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Agents Needed</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{agentNeeds.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Anomalies</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">{anomalies.length}</span>
                </div>
              </div>
            </div>

            {/* Resource Forecast */}
            {resourcePrediction && <ResourcePredictionCard prediction={resourcePrediction} />}

            {/* Agent Needs */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Recommended Agents
              </h3>
              <AgentNeedsCard needs={agentNeeds} />
            </div>

            {/* Anomalies */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Anomaly Detection</h3>
              <AnomalyAlerts anomalies={anomalies} />
            </div>
          </div>
        )}

        {selectedTab === 'predictions' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Future State Predictions
            </h3>
            <PredictionTimeline predictions={predictions} />
          </div>
        )}

        {selectedTab === 'agents' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Agent Need Predictions
            </h3>
            <AgentNeedsCard needs={agentNeeds} />
          </div>
        )}

        {selectedTab === 'resources' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Resource Forecasts</h3>
            {resourcePrediction ? (
              <ResourcePredictionCard prediction={resourcePrediction} />
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 text-center">
                <BarChart3 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400">No resource predictions available</p>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'anomalies' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Detected Anomalies</h3>
            <AnomalyAlerts anomalies={anomalies} />
          </div>
        )}
      </div>
    </div>
  );
}
