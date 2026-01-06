'use client';

/**
 * RequirementCheck Component
 *
 * Displays system compatibility for agents before activation.
 * Shows checkmarks (✅) and crosses (❌) for each requirement
 * with user-friendly error messages.
 */

import { useMemo } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, Cpu, HardDrive, Wifi, Database } from 'lucide-react';
import type { HardwareProfile } from '@/lib/hardware/types';
import type { ValidationRequirement, ValidationResult, RequirementCheck as RequirementCheckType } from '@/lib/agents/requirements';
import { validateRequirements, getRequirementChecks, getUpgradeSuggestions } from '@/lib/agents/validator';
import { RequirementSeverity } from '@/lib/agents/requirements';

interface RequirementCheckProps {
  /** Agent requirements to validate */
  requirements: ValidationRequirement;
  /** Detected hardware profile */
  hardwareProfile: HardwareProfile;
  /** Agent name for display */
  agentName?: string;
  /** Agent icon for display */
  agentIcon?: string;
  /** Callback when user clicks activate */
  onActivate?: () => void;
  /** Custom activate button text */
  activateButtonText?: string;
  /** Whether to show upgrade suggestions */
  showSuggestions?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get icon for requirement check
 */
function getRequirementIcon(requirementName: string) {
  const name = requirementName.toLowerCase();

  if (name.includes('cpu') || name.includes('cores') || name.includes('processor')) {
    return Cpu;
  }
  if (name.includes('memory') || name.includes('ram')) {
    return HardDrive;
  }
  if (name.includes('network') || name.includes('speed') || name.includes('connection')) {
    return Wifi;
  }
  if (name.includes('storage') || name.includes('disk')) {
    return Database;
  }

  return undefined;
}

/**
 * Get severity icon
 */
function getSeverityIcon(passed: boolean, severity: RequirementSeverity) {
  if (passed) {
    return <CheckCircle2 className="w-5 h-5 text-green-500" />;
  }

  switch (severity) {
    case RequirementSeverity.CRITICAL:
      return <XCircle className="w-5 h-5 text-red-500" />;
    case RequirementSeverity.WARNING:
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    case RequirementSeverity.INFO:
      return <Info className="w-5 h-5 text-blue-500" />;
  }
}

/**
 * Get severity background color
 */
function getSeverityBgColor(passed: boolean, severity: RequirementSeverity): string {
  if (passed) {
    return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
  }

  switch (severity) {
    case RequirementSeverity.CRITICAL:
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    case RequirementSeverity.WARNING:
      return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
    case RequirementSeverity.INFO:
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
  }
}

/**
 * RequirementCheck Component
 */
export function RequirementCheck({
  requirements,
  hardwareProfile,
  agentName = 'Agent',
  agentIcon = '🤖',
  onActivate,
  activateButtonText = 'Activate Agent',
  showSuggestions = true,
  className = '',
}: RequirementCheckProps) {
  // Validate requirements
  const validationResult: ValidationResult = useMemo(() => {
    return validateRequirements(requirements, hardwareProfile);
  }, [requirements, hardwareProfile]);

  // Get detailed requirement checks
  const requirementChecks: RequirementCheckType[] = useMemo(() => {
    return getRequirementChecks(requirements, hardwareProfile);
  }, [requirements, hardwareProfile]);

  // Get upgrade suggestions
  const suggestions = useMemo(() => {
    return showSuggestions ? getUpgradeSuggestions(validationResult) : [];
  }, [validationResult, showSuggestions]);

  const canActivate = validationResult.valid;
  const hasWarnings = validationResult.warnings.length > 0;

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl">
              {agentIcon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {agentName}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                System Compatibility Check
              </p>
            </div>
          </div>

          {/* Validation Score Badge */}
          <div className={`px-4 py-2 rounded-lg font-medium ${
            canActivate
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}>
            {canActivate ? '✅ Compatible' : '❌ Not Compatible'}
          </div>
        </div>
      </div>

      {/* Requirement Checks */}
      <div className="p-6 space-y-3">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
          System Requirements
        </h4>

        {requirementChecks.map((check, index) => {
          const IconComponent = getRequirementIcon(check.name);
          const SeverityIcon = getSeverityIcon(check.passed, check.severity);
          const bgColor = getSeverityBgColor(check.passed, check.severity);

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border ${bgColor} transition-all`}
            >
              <div className="flex items-start gap-3">
                {SeverityIcon}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {check.name}
                    </span>
                    {IconComponent && <IconComponent className="w-4 h-4 text-slate-500" />}
                  </div>

                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {check.message}
                  </p>

                  {check.details && !check.passed && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {check.details}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Warnings */}
        {hasWarnings && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h5 className="font-medium text-amber-900 dark:text-amber-400 mb-1">
                  Warnings
                </h5>
                <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                  {validationResult.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Suggestions */}
        {!canActivate && suggestions.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h5 className="font-medium text-blue-900 dark:text-blue-400 mb-2">
                  Suggestions to Enable This Agent
                </h5>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer with Activate Button */}
      <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {validationResult.checked.total > 0 && (
              <>
                <span className="font-medium">{validationResult.checked.passed}</span>
                {' '}of{' '}
                <span className="font-medium">{validationResult.checked.total}</span>
                {' '}requirements met
              </>
            )}
          </div>

          <button
            onClick={onActivate}
            disabled={!canActivate}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all transform hover:scale-105 active:scale-95 ${
              canActivate
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-md hover:shadow-lg'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            {canActivate ? activateButtonText : 'Requirements Not Met'}
          </button>
        </div>

        {/* Additional info for non-compatible systems */}
        {!canActivate && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Your system does not meet the minimum requirements. Please upgrade your hardware or try a different agent.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Compact version of RequirementCheck for inline display
 */
interface RequirementCheckCompactProps {
  requirements: ValidationRequirement;
  hardwareProfile: HardwareProfile;
  className?: string;
}

export function RequirementCheckCompact({
  requirements,
  hardwareProfile,
  className = '',
}: RequirementCheckCompactProps) {
  const validationResult = useMemo(() => {
    return validateRequirements(requirements, hardwareProfile);
  }, [requirements, hardwareProfile]);

  const canActivate = validationResult.valid;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {canActivate ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-xs font-medium text-green-700 dark:text-green-400">
            Requirements met
          </span>
        </>
      ) : (
        <>
          <XCircle className="w-4 h-4 text-red-500" />
          <span className="text-xs font-medium text-red-700 dark:text-red-400">
            {validationResult.errors.length} requirement(s) not met
          </span>
        </>
      )}
    </div>
  );
}
