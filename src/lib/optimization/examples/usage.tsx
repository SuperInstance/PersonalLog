/**
 * Auto-Optimization Usage Examples
 *
 * This file demonstrates how to integrate and use the auto-optimization
 * engine in PersonalLog.
 */

'use client';

import { useEffect, useState } from 'react';
import {
  createOptimizationEngine,
  allRules,
  type HealthStatus,
  type OptimizationSuggestions,
  type OptimizationRecord,
} from '@/lib/optimization';

// ============================================================================
// EXAMPLE 1: Basic Setup
// ============================================================================

export function BasicOptimizationSetup() {
  useEffect(() => {
    // Create engine with conservative defaults
    const engine = createOptimizationEngine({
      enabled: true,
      monitorInterval: 5000, // Check every 5 seconds
      analysisInterval: 30000, // Analyze every 30 seconds
      autoApply: false, // Don't auto-apply, require manual approval
      persistState: true, // Save history to localStorage
    });

    // Register all pre-built rules
    for (const rule of allRules) {
      engine.registerRule(rule);
    }

    // Start monitoring
    engine.start();

    // Cleanup on unmount
    return () => {
      engine.stop();
    };
  }, []);

  return <div>Optimization engine running</div>;
}

// ============================================================================
// EXAMPLE 2: Health Dashboard
// ============================================================================

export function OptimizationDashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestions | null>(null);
  const [engine, setEngine] = useState<any>(null);

  useEffect(() => {
    const optEngine = createOptimizationEngine({
      autoApply: false,
      debug: true, // Enable debug logging
    });

    // Register rules
    allRules.forEach((rule) => optEngine.registerRule(rule));

    // Start
    optEngine.start();

    setEngine(optEngine);

    // Update health every 5 seconds
    const healthInterval = setInterval(() => {
      setHealth(optEngine.getHealthStatus());
    }, 5000);

    // Listen for optimization suggestions
    const listener = async () => {
      const sugg = await optEngine.suggestOptimizations();
      setSuggestions(sugg);
    };

    optEngine.addEventListener('optimization-suggested', listener);

    // Get initial suggestions
    listener();

    return () => {
      clearInterval(healthInterval);
      optEngine.stop();
    };
  }, []);

  if (!health || !suggestions) {
    return <div>Loading optimization data...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Health Score */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">System Health</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Overall</div>
            <div className="text-2xl font-bold">{health.overall.toFixed(0)}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Performance</div>
            <div className="text-2xl font-bold">{health.performance.toFixed(0)}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Quality</div>
            <div className="text-2xl font-bold">{health.quality.toFixed(0)}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Resources</div>
            <div className="text-2xl font-bold">{health.resources.toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {/* Active Issues */}
      {health.issues.length > 0 && (
        <div className="bg-red-50 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-red-900">Active Issues</h2>
          <div className="space-y-2">
            {health.issues.map((issue, idx) => (
              <div key={idx} className="bg-white p-3 rounded">
                <div className="font-medium">{issue.metric}</div>
                <div className="text-sm text-gray-600">{issue.description}</div>
                <div className="text-sm text-red-600">
                  Severity: {(issue.severity * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimization Suggestions */}
      {suggestions.count > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Optimization Suggestions</h2>

          {/* High Priority */}
          {suggestions.high.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-red-700 mb-2">High Priority</h3>
              <div className="space-y-3">
                {suggestions.high.map((candidate) => (
                  <OptimizationSuggestionCard
                    key={candidate.rule.id}
                    candidate={candidate}
                    onApply={() => engine?.applyOptimization(candidate.rule.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Medium Priority */}
          {suggestions.medium.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-yellow-700 mb-2">Medium Priority</h3>
              <div className="space-y-3">
                {suggestions.medium.map((candidate) => (
                  <OptimizationSuggestionCard
                    key={candidate.rule.id}
                    candidate={candidate}
                    onApply={() => engine?.applyOptimization(candidate.rule.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Low Priority */}
          {suggestions.low.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-green-700 mb-2">Low Priority</h3>
              <div className="space-y-3">
                {suggestions.low.map((candidate) => (
                  <OptimizationSuggestionCard
                    key={candidate.rule.id}
                    candidate={candidate}
                    onApply={() => engine?.applyOptimization(candidate.rule.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Optimizations */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Recent Optimizations</h2>
        <div className="space-y-2">
          {health.recentOptimizations.map((record) => (
            <div key={record.id} className="border p-3 rounded">
              <div className="font-medium">{record.ruleName}</div>
              <div className="text-sm text-gray-600">
                Status: {record.status}
                {record.improvementPercent && (
                  <span className="ml-2 text-green-600">
                    Improvement: {record.improvementPercent.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(record.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface OptimizationSuggestionCardProps {
  candidate: any;
  onApply: () => void;
}

function OptimizationSuggestionCard({
  candidate,
  onApply,
}: OptimizationSuggestionCardProps) {
  const { rule, confidence, estimatedImprovement, reasoning } = candidate;

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-semibold">{rule.name}</h4>
          <p className="text-sm text-gray-600">{rule.description}</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-sm font-medium text-blue-600">
            {(confidence * 100).toFixed(0)}% confident
          </div>
          <div className="text-xs text-gray-500">
            Risk: {rule.riskLevel}/100
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-700 mb-3">{reasoning}</div>

      <div className="flex justify-between items-center">
        <div className="text-sm">
          <span className="text-green-600 font-medium">
            ~{estimatedImprovement * 100}% improvement
          </span>
          <span className="text-gray-500 ml-2">
            Effort: {rule.effort}
          </span>
        </div>
        <button
          onClick={onApply}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Apply
        </button>
      </div>

      {rule.requiresConsent && (
        <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
          ⚠️ This optimization requires your consent as it may have significant effects.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Auto-Apply Setup
// ============================================================================

export function AutoApplyOptimization() {
  useEffect(() => {
    const engine = createOptimizationEngine({
      autoApply: true, // Enable auto-apply
      maxAutoApplyRisk: 20, // Only auto-apply low-risk optimizations
      requireConsent: true, // Still require consent for major changes
      monitorInterval: 5000,
      analysisInterval: 30000,
    });

    // Register only auto-safe rules
    for (const rule of allRules) {
      if (rule.autoApplySafe && rule.riskLevel <= 20) {
        engine.registerRule(rule);
      }
    }

    engine.start();

    // Listen to what's being applied
    engine.addEventListener('optimization-applied', (event: any) => {
      console.log('Auto-applied:', event.data.ruleId);

      // Notify user
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Optimization Applied', {
          body: event.data.record.ruleName,
        });
      }
    });

    return () => {
      engine.stop();
    };
  }, []);

  return (
    <div className="p-4 bg-green-50 rounded-lg">
      <h3 className="font-semibold text-green-900">Auto-Optimization Active</h3>
      <p className="text-sm text-green-700">
        Safe optimizations will be applied automatically to improve performance.
      </p>
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Custom Rule
// ============================================================================

import type { OptimizationRule } from '@/lib/optimization';

const customRule: OptimizationRule = {
  id: 'optimize-conversation-loading',
  name: 'Optimize Conversation Loading',
  description: 'Increase batch size for loading conversations',
  category: 'performance',
  targets: ['initial-load-time'],
  priority: 'medium',
  effort: 'trivial',
  impact: 'moderate',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 10,
  rollbackTimeout: 120000,
  tags: ['conversations', 'performance', 'custom'],
  conditions: [
    {
      metric: 'initial-load-time',
      operator: 'gt',
      threshold: 2000, // > 2s
      duration: 10000,
      sampleSize: 3,
    },
  ],
  configChanges: [
    {
      key: 'conversations.batchSize',
      value: 50,
      type: 'number',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 5,
    confidenceLevel: 0.95,
    minImprovementPercent: 10,
    maxDegradationPercent: 15,
    metrics: [
      {
        target: 'initial-load-time',
        mustImprove: true,
        tolerance: 25,
      },
    ],
  },
};

export function CustomRuleExample() {
  useEffect(() => {
    const engine = createOptimizationEngine();

    // Register default rules
    allRules.forEach((rule) => engine.registerRule(rule));

    // Add custom rule
    engine.registerRule(customRule);

    engine.start();

    return () => {
      engine.stop();
    };
  }, []);

  return <div>Running with custom optimization rule</div>;
}

// ============================================================================
// EXAMPLE 5: React Hook
// ============================================================================

function useOptimizationEngine() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestions | null>(null);
  const [engine, setEngine] = useState<any>(null);

  useEffect(() => {
    const optEngine = createOptimizationEngine({
      autoApply: false,
      persistState: true,
    });

    allRules.forEach((rule) => optEngine.registerRule(rule));
    optEngine.start();
    setEngine(optEngine);

    // Initial data
    setHealth(optEngine.getHealthStatus());
    optEngine.suggestOptimizations().then(setSuggestions);

    // Set up intervals
    const healthInterval = setInterval(
      () => setHealth(optEngine.getHealthStatus()),
      5000
    );

    const suggestionListener = () => {
      optEngine.suggestOptimizations().then(setSuggestions);
    };

    optEngine.addEventListener('optimization-suggested', suggestionListener);

    return () => {
      clearInterval(healthInterval);
      optEngine.stop();
    };
  }, []);

  return {
    health,
    suggestions,
    applyOptimization: (ruleId: string) => engine?.applyOptimization(ruleId),
    rollbackOptimization: (recordId: string) =>
      engine?.rollbackOptimization(recordId),
    getHistory: (limit?: number) => engine?.getHistory(limit),
  };
}

// Usage
export function MyComponent() {
  const { health, suggestions, applyOptimization } = useOptimizationEngine();

  if (!health) return <div>Loading...</div>;

  return (
    <div>
      <div>Health: {health.overall.toFixed(0)}%</div>
      {suggestions?.high.map((candidate) => (
        <div key={candidate.rule.id}>
          {candidate.rule.name}
          <button onClick={() => applyOptimization(candidate.rule.id)}>
            Apply
          </button>
        </div>
      ))}
    </div>
  );
}
