'use client'

/**
 * AgentCard Component
 *
 * Displays a single agent in the sidebar list with distinct styling
 * to differentiate from human contacts.
 *
 * Features:
 * - Gradient border to distinguish from human contacts
 * - Status indicator (available, unavailable, active)
 * - Hover effects with smooth transitions
 * - Shows agent icon, name, and description
 *
 * @example
 * ```typescript
 * <AgentCard
 *   agent={agent}
 *   hardwareProfile={hardwareProfile}
 *   available={available}
 *   onClick={() => handleActivate(agent)}
 * />
 * ```
 */

import React from 'react';
import type { AgentDefinition, AgentAvailabilityResult } from '@/lib/agents';

interface AgentCardProps {
  /** Agent definition */
  agent: AgentDefinition;
  /** Availability check result */
  availability: AgentAvailabilityResult;
  /** Whether agent is currently active */
  active?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Compact mode for collapsed sidebar */
  compact?: boolean;
}

export function AgentCard({
  agent,
  availability,
  active = false,
  onClick,
  compact = false,
}: AgentCardProps) {
  const available = availability.available;
  const hasMissingReqs =
    availability.missingRequirements.hardware.length > 0 ||
    availability.missingRequirements.flags.length > 0 ||
    availability.missingRequirements.dependencies.length > 0;

  // Status indicator
  const getStatusIndicator = () => {
    if (active) {
      return <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />;
    }
    if (available) {
      return <div className="w-2 h-2 rounded-full bg-green-500" />;
    }
    return <div className="w-2 h-2 rounded-full bg-red-500" />;
  };

  if (compact) {
    return (
      <div
        onClick={available ? onClick : undefined}
        className={`
          relative w-12 h-12 mx-auto rounded-xl flex items-center justify-center cursor-pointer
          transition-all duration-200 transform hover:scale-110 active:scale-95
          ${
            available
              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg cursor-pointer'
              : 'bg-gradient-to-br from-slate-400 to-slate-500 cursor-not-allowed opacity-60'
          }
          ${active ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900' : ''}
        `}
        title={`${agent.name}: ${agent.description}${!available ? ' (Not available)' : ''}`}
      >
        <span className="text-2xl" aria-hidden="true">
          {agent.icon}
        </span>
        {active && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-900" />
        )}
      </div>
    );
  }

  return (
    <div
      onClick={available ? onClick : undefined}
      className={`
        group relative flex items-start gap-3 p-3 rounded-xl
        transition-all duration-200 transform
        ${available ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : 'cursor-not-allowed opacity-70'}
        ${
          active
            ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-300 dark:border-blue-700 shadow-md'
            : 'bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 border-2 border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-sm'
        }
        ${
          !available && hasMissingReqs
            ? 'border-l-4 border-l-red-400'
            : 'border-l-4 border-l-transparent'
        }
      `}
      role="listitem"
      tabIndex={available ? 0 : undefined}
      onKeyDown={(e) => {
        if (available && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`${agent.name}, ${agent.description}${
        !available ? ', not available' : ''
      }${active ? ', currently active' : ''}`}
    >
      {/* Gradient border effect (subtle) */}
      <div
        className={`
          absolute left-0 top-2 bottom-2 w-1 rounded-full
          ${available ? 'bg-gradient-to-b from-indigo-500 to-purple-600' : 'bg-gradient-to-b from-red-400 to-red-600'}
        `}
        aria-hidden="true"
      />

      {/* Avatar/Icon */}
      <div className="relative flex-shrink-0" aria-hidden="true">
        <div
          className={`
            w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-md
            transition-all duration-200
            ${
              available
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 group-hover:from-indigo-600 group-hover:to-purple-700'
                : 'bg-gradient-to-br from-slate-400 to-slate-500'
            }
          `}
        >
          {agent.icon}
        </div>

        {/* Status indicator */}
        <div className="absolute -bottom-1 -right-1 flex items-center justify-center">
          {getStatusIndicator()}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pl-2">
        <div className="flex items-center justify-between mb-0.5">
          <h3
            className={`
              font-semibold truncate transition-colors
              ${
                available
                  ? 'text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400'
              }
            `}
          >
            {agent.name}
          </h3>
          {!available && (
            <span
              className="text-xs text-red-500 dark:text-red-400 flex-shrink-0 ml-2"
              aria-label="Not available"
            >
              ⚠
            </span>
          )}
        </div>
        <p
          className={`
            text-sm truncate transition-colors
            ${
              available
                ? 'text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                : 'text-slate-400 dark:text-slate-500'
            }
          `}
        >
          {agent.description}
        </p>

        {/* Category badge */}
        <div className="mt-1.5">
          <span
            className={`
            inline-block px-2 py-0.5 text-xs font-medium rounded-full
            ${
              available
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            }
          `}
          >
            {agent.category}
          </span>
        </div>
      </div>

      {/* Warning icon for unavailable agents */}
      {!available && hasMissingReqs && (
        <div
          className="absolute top-2 right-2 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-sm"
          aria-label="Requirements not met"
        >
          <span className="text-xs" aria-hidden="true">
            !
          </span>
        </div>
      )}
    </div>
  );
}
