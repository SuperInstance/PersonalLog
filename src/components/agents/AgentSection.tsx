'use client'

/**
 * AgentSection Component
 *
 * Displays the "AI Agents" section in the messenger sidebar.
 * Lists all available agents with filtering by hardware compatibility.
 *
 * Features:
 * - Section header with collapsible toggle
 * - Lists agents from registry
 * - Filters/hides unavailable agents (with option to show)
 * - Shows count of available vs total agents
 *
 * @example
 * ```typescript
 * <AgentSection
 *   hardwareProfile={hardwareProfile}
 *   onActivateAgent={(agent) => openActivationModal(agent)}
 *   collapsed={false}
 * />
 * ```
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Bot, AlertCircle } from 'lucide-react';
import { agentRegistry } from '@/lib/agents';
import type { AgentDefinition, AgentAvailabilityResult } from '@/lib/agents';
import { AgentCard } from './AgentCard';
import type { HardwareProfile } from '@/lib/hardware';

interface AgentSectionProps {
  /** Current hardware profile for availability checking */
  hardwareProfile?: HardwareProfile | null;
  /** Callback when agent is clicked */
  onActivateAgent: (agentId: string) => void;
  /** Whether section is collapsed */
  collapsed?: boolean;
  /** Whether to show unavailable agents */
  showUnavailable?: boolean;
  /** Active agent IDs */
  activeAgentIds?: string[];
}

export function AgentSection({
  hardwareProfile,
  onActivateAgent,
  collapsed = false,
  showUnavailable = false,
  activeAgentIds = [],
}: AgentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Get all agents and check availability
  const { availableAgents, unavailableAgents } = useMemo(() => {
    if (!hardwareProfile) {
      return {
        availableAgents: [],
        unavailableAgents: [],
      };
    }

    const allAgents = agentRegistry.getAllAgents();
    const available: Array<{ agent: AgentDefinition; availability: AgentAvailabilityResult }> = [];
    const unavailable: Array<{ agent: AgentDefinition; availability: AgentAvailabilityResult }> = [];

    allAgents.forEach((agent) => {
      const availability = agentRegistry.checkAvailability(agent.id, hardwareProfile);
      if (availability.available) {
        available.push({ agent, availability });
      } else {
        unavailable.push({ agent, availability });
      }
    });

    return { availableAgents: available, unavailableAgents: unavailable };
  }, [hardwareProfile]);

  const totalAgents = availableAgents.length + unavailableAgents.length;

  if (collapsed) {
    return (
      <div className="px-2 py-2 space-y-1" role="region" aria-label="AI Agents">
        {availableAgents.map(({ agent }) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            availability={agentRegistry.checkAvailability(agent.id, hardwareProfile!)}
            active={activeAgentIds.includes(agent.id)}
            onClick={() => onActivateAgent(agent.id)}
            compact
          />
        ))}
      </div>
    );
  }

  return (
    <div className="px-2 py-3" role="region" aria-label="AI Agents">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-2 py-1.5 mb-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        aria-expanded={isExpanded}
        aria-controls="agent-list"
      >
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-indigo-500" aria-hidden="true" />
          <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            AI Agents
          </h3>
          <span
            className="text-xs text-slate-400 dark:text-slate-500"
            aria-label={`${availableAgents.length} of ${totalAgents} agents available`}
          >
            ({availableAgents.length}/{totalAgents})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
        )}
      </button>

      {/* Agent List */}
      {isExpanded && (
        <div id="agent-list" className="space-y-2" role="list">
          {/* Available Agents */}
          {availableAgents.length > 0 && (
            <div className="space-y-1">
              {availableAgents.map(({ agent, availability }) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  availability={availability}
                  active={activeAgentIds.includes(agent.id)}
                  onClick={() => onActivateAgent(agent.id)}
                />
              ))}
            </div>
          )}

          {/* Unavailable Agents (optional) */}
          {showUnavailable && unavailableAgents.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2 px-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                <h4 className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Unavailable
                </h4>
              </div>
              <div className="space-y-1">
                {unavailableAgents.map(({ agent, availability }) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    availability={availability}
                    active={activeAgentIds.includes(agent.id)}
                    onClick={() => onActivateAgent(agent.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {availableAgents.length === 0 && (
            <div className="py-6 px-3 text-center">
              <Bot
                className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700"
                aria-hidden="true"
              />
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                No agents available
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Your hardware doesn't meet the requirements for any agents
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
