'use client';

/**
 * Proactive Dashboard Component
 *
 * Displays proactive agent activation suggestions, confidence scores,
 * and user controls for the proactive system.
 */

import React, { useState, useEffect } from 'react';
import { getProactiveEngine } from '@/lib/intelligence/proactive-engine';
import type {
  ProactiveAgentAction,
  ProactivePreferences,
  ProactiveStatistics,
  ProactiveActionHistory,
  ProactiveTriggerType,
} from '@/lib/intelligence/proactive-types';
import { getConfidenceLabel } from '@/lib/intelligence/proactive-confidence';

// ============================================================================
// TYPES
// ============================================================================

interface ProactiveDashboardProps {
  conversationId?: string;
  compact?: boolean;
}

interface SuggestionCardProps {
  action: ProactiveAgentAction;
  onAccept: (actionId: string) => void;
  onDismiss: (actionId: string, feedback?: 'helpful' | 'not_helpful' | 'neutral') => void;
}

interface TriggerToggleProps {
  triggerType: ProactiveTriggerType;
  enabled: boolean;
  autoActivate: boolean;
  minConfidence: number;
  onToggle: (triggerType: ProactiveTriggerType, enabled: boolean) => void;
  onAutoActivateToggle: (triggerType: ProactiveTriggerType, autoActivate: boolean) => void;
  onConfidenceChange: (triggerType: ProactiveTriggerType, confidence: number) => void;
}

// ============================================================================
// SUGGESTION CARD COMPONENT
// ============================================================================

function SuggestionCard({ action, onAccept, onDismiss }: SuggestionCardProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const confidenceLabel = getConfidenceLabel(action.confidence);

  if (dismissed) {
    return null;
  }

  const handleAccept = () => {
    onAccept(action.id);
    setDismissed(true);
  };

  const handleDismiss = () => {
    setShowFeedback(true);
  };

  const handleFeedback = (feedback: 'helpful' | 'not_helpful' | 'neutral') => {
    onDismiss(action.id, feedback);
    setDismissed(true);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-3 border-l-4 border-blue-500">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🤖</span>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                Suggestion: {action.agentId}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {action.reason}
              </p>
            </div>
          </div>

          <div className="ml-8 space-y-2">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Expected benefit:</strong> {action.expectedBenefit}
            </p>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Confidence:
              </span>
              <span
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded"
                style={{
                  backgroundColor: confidenceLabel.color === 'green' ? '#d1fae5' :
                                 confidenceLabel.color === 'blue' ? '#dbeafe' :
                                 confidenceLabel.color === 'yellow' ? '#fef3c7' :
                                 confidenceLabel.color === 'orange' ? '#fed7aa' : '#fee2e2',
                  color: confidenceLabel.color === 'green' ? '#065f46' :
                        confidenceLabel.color === 'blue' ? '#1e40af' :
                        confidenceLabel.color === 'yellow' ? '#92400e' :
                        confidenceLabel.color === 'orange' ? '#9a3412' : '#991b1b',
                }}
              >
                <span>{confidenceLabel.icon}</span>
                <span>{confidenceLabel.label} ({(action.confidence * 100).toFixed(0)}%)</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 ml-4">
          {!showFeedback ? (
            <>
              <button
                onClick={handleAccept}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded transition-colors"
              >
                Accept
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded transition-colors"
              >
                Dismiss
              </button>
            </>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={() => handleFeedback('helpful')}
                className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium rounded transition-colors"
                title="Helpful"
              >
                👍
              </button>
              <button
                onClick={() => handleFeedback('neutral')}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors"
                title="Neutral"
              >
                😐
              </button>
              <button
                onClick={() => handleFeedback('not_helpful')}
                className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded transition-colors"
                title="Not helpful"
              >
                👎
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TRIGGER TOGGLE COMPONENT
// ============================================================================

function TriggerToggle({
  triggerType,
  enabled,
  autoActivate,
  minConfidence,
  onToggle,
  onAutoActivateToggle,
  onConfidenceChange,
}: TriggerToggleProps) {
  const triggerLabel = triggerType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(triggerType, e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="font-medium text-gray-900 dark:text-white text-sm">
            {triggerLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 dark:text-gray-400">Auto-activate</label>
          <input
            type="checkbox"
            checked={autoActivate}
            onChange={(e) => onAutoActivateToggle(triggerType, e.target.checked)}
            disabled={!enabled}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
        </div>
      </div>

      {enabled && (
        <div className="ml-6">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-400">
              Min Confidence: {(minConfidence * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.4"
              max="1.0"
              step="0.05"
              value={minConfidence}
              onChange={(e) => onConfidenceChange(triggerType, parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function ProactiveDashboard({ conversationId, compact = false }: ProactiveDashboardProps) {
  const [suggestions, setSuggestions] = useState<ProactiveAgentAction[]>([]);
  const [statistics, setStatistics] = useState<ProactiveStatistics | null>(null);
  const [preferences, setPreferences] = useState<ProactivePreferences | null>(null);
  const [history, setHistory] = useState<ProactiveActionHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'settings' | 'history' | 'stats'>('suggestions');
  const [enabled, setEnabled] = useState(true);

  // Load data from engine
  useEffect(() => {
    const engine = getProactiveEngine();

    const loadData = () => {
      setSuggestions(engine.getProactiveSuggestions());
      setStatistics(engine.getStatistics());
      setPreferences(engine.getPreferences());
      setHistory(engine.getActionHistory());
    };

    loadData();

    // Refresh periodically
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const handleAcceptSuggestion = (actionId: string) => {
    const engine = getProactiveEngine();
    engine.executeProactiveAction(actionId);

    // Refresh data
    setSuggestions(engine.getProactiveSuggestions());
    setStatistics(engine.getStatistics());
  };

  const handleDismissSuggestion = (
    actionId: string,
    feedback?: 'helpful' | 'not_helpful' | 'neutral'
  ) => {
    const engine = getProactiveEngine();
    engine.dismissProactiveAction(actionId, feedback);

    // Refresh data
    setSuggestions(engine.getProactiveSuggestions());
    setStatistics(engine.getStatistics());
  };

  const handleToggleTrigger = (triggerType: ProactiveTriggerType, enabled: boolean) => {
    const engine = getProactiveEngine();
    const prefs = engine.getPreferences();
    prefs.triggerPreferences[triggerType].enabled = enabled;
    engine.updatePreferences(prefs);
    setPreferences(prefs);
  };

  const handleToggleAutoActivate = (triggerType: ProactiveTriggerType, autoActivate: boolean) => {
    const engine = getProactiveEngine();
    const prefs = engine.getPreferences();
    prefs.triggerPreferences[triggerType].autoActivate = autoActivate;
    engine.updatePreferences(prefs);
    setPreferences(prefs);
  };

  const handleConfidenceChange = (triggerType: ProactiveTriggerType, confidence: number) => {
    const engine = getProactiveEngine();
    const prefs = engine.getPreferences();
    prefs.triggerPreferences[triggerType].minConfidence = confidence;
    engine.updatePreferences(prefs);
    setPreferences(prefs);
  };

  const handleToggleEnabled = () => {
    const engine = getProactiveEngine();
    const prefs = engine.getPreferences();
    prefs.enabled = !enabled;
    engine.updatePreferences(prefs);
    setEnabled(!enabled);
    setPreferences(prefs);
  };

  if (compact) {
    // Compact mode - just show active suggestions
    return (
      <div className="proactive-dashboard-compact">
        {suggestions.slice(0, 2).map((action) => (
          <SuggestionCard
            key={action.id}
            action={action}
            onAccept={handleAcceptSuggestion}
            onDismiss={handleDismissSuggestion}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="proactive-dashboard bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Proactive Agent Activation
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Anticipating your needs before you ask
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
          <button
            onClick={handleToggleEnabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-4">
          {['suggestions', 'settings', 'history', 'stats'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'suggestions' && suggestions.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded-full">
                  {suggestions.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'suggestions' && (
          <div>
            {suggestions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No proactive suggestions at the moment</p>
                <p className="text-sm mt-2">Suggestions will appear here when agents can help</p>
              </div>
            ) : (
              suggestions.map((action) => (
                <SuggestionCard
                  key={action.id}
                  action={action}
                  onAccept={handleAcceptSuggestion}
                  onDismiss={handleDismissSuggestion}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'settings' && preferences && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Trigger Preferences
            </h3>

            <div className="space-y-1">
              {Object.entries(preferences.triggerPreferences).map(([triggerType, pref]) => (
                <TriggerToggle
                  key={triggerType}
                  triggerType={triggerType as ProactiveTriggerType}
                  enabled={pref.enabled}
                  autoActivate={pref.autoActivate}
                  minConfidence={pref.minConfidence}
                  onToggle={handleToggleTrigger}
                  onAutoActivateToggle={handleToggleAutoActivate}
                  onConfidenceChange={handleConfidenceChange}
                />
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                💡 Tips
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                <li>• Enable triggers for tasks you do frequently</li>
                <li>• Adjust confidence thresholds to be more or less aggressive</li>
                <li>• Auto-activate for highly reliable triggers</li>
                <li>• Your feedback helps the system learn your preferences</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Action History
            </h3>

            {history.length === 0 ? (
              <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                No proactive actions yet
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {history.slice().reverse().map((record) => (
                  <div
                    key={record.actionId}
                    className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {record.agentId}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          record.executed
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {record.userResponse === 'accept' ? 'Accepted' : 'Dismissed'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Confidence: {(record.confidence * 100).toFixed(0)}% |
                      {' '}
                      {new Date(record.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && statistics && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Performance Statistics
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statistics.totalSuggestions}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Suggestions
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(statistics.acceptanceRate * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Acceptance Rate
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(statistics.avgConfidence * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Avg Confidence
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(statistics.anticipation.avgTime / 1000)}s
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Avg Anticipation Time
                </div>
              </div>
            </div>

            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Per-Trigger Statistics
            </h4>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(statistics.triggerStats).map(([triggerType, stats]: [string, any]) => (
                <div key={triggerType} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 dark:text-white text-sm">
                      {triggerType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {stats.triggerCount} triggers
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <span>Acceptance: {(stats.acceptanceRate * 100).toFixed(0)}%</span>
                    <span>Avg Confidence: {(stats.avgConfidence * 100).toFixed(0)}%</span>
                    <span>Feedback: {stats.feedbackScore.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
