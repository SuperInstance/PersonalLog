'use client'

/**
 * AgentActivationModal Component
 *
 * Modal dialog for activating agents with detailed information and
 * requirements checking.
 *
 * Features:
 * - Shows agent details (name, description, category)
 * - Displays RequirementCheck component
 * - Activate and Cancel buttons
 * - Friendly confirmation message
 *
 * @example
 * ```typescript
 * <AgentActivationModal
 *   agent={agent}
 *   hardwareProfile={hardwareProfile}
 *   isOpen={true}
 *   onClose={() => closeModal()}
 *   onActivate={() => activateAgent(agent.id)}
 * />
 * ```
 */

import React from 'react';
import { X, Bot, Zap } from 'lucide-react';
import type { AgentDefinition, AgentAvailabilityResult } from '@/lib/agents';
import { RequirementCheck } from './RequirementCheck';

interface AgentActivationModalProps {
  /** Agent definition to activate */
  agent: AgentDefinition;
  /** Current hardware profile */
  hardwareProfile?: any;
  /** Availability check result */
  availability: AgentAvailabilityResult;
  /** Whether modal is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Activate callback */
  onActivate: () => void;
  /** Whether activation is in progress */
  isActivating?: boolean;
}

export function AgentActivationModal({
  agent,
  hardwareProfile,
  availability,
  isOpen,
  onClose,
  onActivate,
  isActivating = false,
}: AgentActivationModalProps) {
  if (!isOpen) return null;

  const available = availability.available;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-modal-title"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl shadow-lg"
              aria-hidden="true"
            >
              {agent.icon}
            </div>
            <div>
              <h2
                id="agent-modal-title"
                className="text-xl font-bold text-slate-900 dark:text-slate-100"
              >
                {agent.name}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {agent.category} Agent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              About this Agent
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {agent.description}
            </p>
          </div>

          {/* Tags */}
          {agent.metadata.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Capabilities
              </h3>
              <div className="flex flex-wrap gap-2">
                {agent.metadata.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Version</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {agent.metadata.version}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Author</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {agent.metadata.author}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Activation Mode</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">
                {agent.activationMode.toLowerCase()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">License</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {agent.metadata.license || 'MIT'}
              </p>
            </div>
          </div>

          {/* Requirements Check - Using simplified version since RequirementCheck from Agent 2 expects different props */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              System Requirements
            </h3>
            <div
              className={`p-4 rounded-lg border ${
                available
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                {available ? (
                  <Bot className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Zap className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      available
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}
                  >
                    {available ? 'Your system meets all requirements' : 'Your system does not meet requirements'}
                  </p>
                  {!available && availability.reason && (
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {availability.reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Missing Requirements Details */}
              {!available && (
                <div className="space-y-2 mt-4">
                  {availability.missingRequirements.hardware.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">
                        Hardware Issues
                      </p>
                      <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                        {availability.missingRequirements.hardware.map((req, idx) => (
                          <li key={idx}>• {req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {availability.missingRequirements.flags.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">
                        Missing Features
                      </p>
                      <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                        {availability.missingRequirements.flags.map((flag, idx) => (
                          <li key={idx}>• {flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {availability.missingRequirements.dependencies.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">
                        Missing Dependencies
                      </p>
                      <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                        {availability.missingRequirements.dependencies.map((dep, idx) => (
                          <li key={idx}>• {dep}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Example Configurations (if available) */}
          {agent.examples && agent.examples.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Example Configurations
              </h3>
              <div className="space-y-2">
                {agent.examples.map((example, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                      {example.name}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {example.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              disabled={isActivating}
              className="px-5 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onActivate}
              disabled={!available || isActivating}
              className={`
                px-6 py-2.5 rounded-lg font-medium transition-all transform hover:scale-105 active:scale-95
                ${
                  available
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
              `}
            >
              {isActivating ? 'Activating...' : available ? 'Activate Agent' : 'Requirements Not Met'}
            </button>
          </div>

          {!available && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">
              Your system does not meet the minimum requirements for this agent.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
