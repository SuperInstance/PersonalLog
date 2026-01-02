'use client';

/**
 * Feature Flag Toggle Component
 *
 * Displays individual feature flags with toggle switches.
 * Shows feature state, reason for current state, and hardware requirements.
 */

import { Check, X, AlertTriangle, Lock, Zap, Info } from 'lucide-react';
import type { FeatureFlag, EvaluationResult } from '@/lib/flags/types';

interface FeatureFlagToggleProps {
  feature: FeatureFlag;
  evaluation?: EvaluationResult;
  onToggle?: (featureId: string, enabled: boolean) => void;
  disabled?: boolean;
}

export function FeatureFlagToggle({
  feature,
  evaluation,
  onToggle,
  disabled = false
}: FeatureFlagToggleProps) {
  const isEnabled = evaluation?.enabled ?? feature.state === 'enabled';
  const isUserOverride = evaluation?.userOverride ?? false;
  const isBlocked = feature.state === 'blocked';
  const isForced = feature.state === 'forced';
  const isHardwareGated = !isEnabled && !isUserOverride && feature.minHardwareScore > 0;

  const handleToggle = () => {
    if (disabled || !feature.userOverridable) return;
    onToggle?.(feature.id, !isEnabled);
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-lg border transition-all ${
      isHardwareGated
        ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10'
        : 'border-slate-200 dark:border-slate-800'
    }`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Toggle Switch */}
          <div className="flex-shrink-0 pt-1">
            {feature.userOverridable ? (
              <button
                onClick={handleToggle}
                disabled={disabled}
                className={`
                  relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  ${isEnabled ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <span
                  className={`
                    absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200
                    ${isEnabled ? 'translate-x-6' : 'translate-x-0'}
                  `}
                />
              </button>
            ) : (
              <div className="w-12 h-6 flex items-center justify-center">
                {isEnabled ? (
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
              </div>
            )}
          </div>

          {/* Feature Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                {feature.name}
              </h4>

              {/* Status Badges */}
              {isUserOverride && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs font-medium rounded-full">
                  <Zap className="w-3 h-3" />
                  Override
                </span>
              )}

              {feature.experimental && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-medium rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  Experimental
                </span>
              )}

              {!feature.userOverridable && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs font-medium rounded-full">
                  <Lock className="w-3 h-3" />
                  Auto
                </span>
              )}
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {feature.description}
            </p>

            {/* Status Message */}
            {evaluation && evaluation.reason && (
              <div className={`mt-2 text-xs flex items-center gap-1 ${
                isHardwareGated
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-slate-500 dark:text-slate-400'
              }`}>
                {isHardwareGated && <AlertTriangle className="w-3 h-3" />}
                <Info className="w-3 h-3" />
                {evaluation.reason}
              </div>
            )}

            {/* Hardware Requirements */}
            {feature.minHardwareScore > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {feature.minHardwareScore > 0 && (
                  <RequirementBadge
                    label="Min Score"
                    value={feature.minHardwareScore}
                    met={evaluation?.hardwareScore ? evaluation.hardwareScore >= feature.minHardwareScore : false}
                  />
                )}
                {feature.minRAM && (
                  <RequirementBadge
                    label="Min RAM"
                    value={`${feature.minRAM} GB`}
                    met={true}
                  />
                )}
                {feature.minCores && (
                  <RequirementBadge
                    label="Min Cores"
                    value={feature.minCores}
                    met={true}
                  />
                )}
                {feature.requiresGPU && (
                  <RequirementBadge
                    label="GPU"
                    value="Required"
                    met={evaluation?.missingDependencies ? !evaluation.missingDependencies.includes('gpu') : true}
                  />
                )}
              </div>
            )}

            {/* Performance Impact */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>Performance Impact</span>
                <span className="font-medium">{feature.performanceImpact}%</span>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-colors ${
                    feature.performanceImpact < 30
                      ? 'bg-green-500'
                      : feature.performanceImpact < 60
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(feature.performanceImpact, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        {feature.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {feature.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface RequirementBadgeProps {
  label: string;
  value: string | number;
  met: boolean;
}

function RequirementBadge({ label, value, met }: RequirementBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
      met
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    }`}>
      {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}: {value}
    </span>
  );
}
