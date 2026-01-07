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
 * - Onboarding tour for first-time users
 * - Help documentation
 * - Toast notifications for actions
 * - Loading states for async operations
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

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronUp, Bot, AlertCircle, Download, Upload, Grid3x3, HelpCircle, Loader2 } from 'lucide-react';
import { agentRegistry } from '@/lib/agents';
import { exportAgent, importAgent } from '@/lib/agents/io';
import { ExportFormat } from '@/lib/marketplace/types';
import type { AgentDefinition, AgentAvailabilityResult } from '@/lib/agents';
import { AgentCard } from './AgentCard';
import { CreateAgentButtonCompact } from '@/components/vibe-coding';
import { TemplateGallery } from './TemplateGallery';
import { AgentOnboarding, useAgentOnboarding } from './AgentOnboarding';
import { AgentHelp } from './AgentHelp';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
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
  /** Callback when custom agent is created */
  onAgentCreated?: (agent: AgentDefinition) => void;
}

export function AgentSection({
  hardwareProfile,
  onActivateAgent,
  collapsed = false,
  showUnavailable = false,
  activeAgentIds = [],
  onAgentCreated,
}: AgentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [agentAvailabilities, setAgentAvailabilities] = useState<Map<string, AgentAvailabilityResult>>(new Map());

  const { shouldShow } = useAgentOnboarding();
  const { showSuccess, showError, showInfo } = useToast();

  // Check agent availabilities when hardware profile changes
  useEffect(() => {
    if (!hardwareProfile) {
      setAgentAvailabilities(new Map());
      return;
    }

    const checkAvailabilities = async () => {
      const allAgents = agentRegistry.getAllAgents();
      const availabilities = new Map<string, AgentAvailabilityResult>();

      await Promise.all(
        allAgents.map(async (agent) => {
          const availability = await agentRegistry.checkAvailability(agent.id, hardwareProfile);
          availabilities.set(agent.id, availability);
        })
      );

      setAgentAvailabilities(availabilities);
    };

    checkAvailabilities();
  }, [hardwareProfile]);

  // Get all agents and check availability
  const { availableAgents, unavailableAgents } = useMemo(() => {
    if (!hardwareProfile || agentAvailabilities.size === 0) {
      return {
        availableAgents: [],
        unavailableAgents: [],
      };
    }

    const allAgents = agentRegistry.getAllAgents();
    const available: Array<{ agent: AgentDefinition; availability: AgentAvailabilityResult }> = [];
    const unavailable: Array<{ agent: AgentDefinition; availability: AgentAvailabilityResult }> = [];

    allAgents.forEach((agent) => {
      const availability = agentAvailabilities.get(agent.id);
      if (availability) {
        if (availability.available) {
          available.push({ agent, availability });
        } else {
          unavailable.push({ agent, availability });
        }
      }
    });

    return { availableAgents: available, unavailableAgents: unavailable };
  }, [hardwareProfile, agentAvailabilities]);

  const totalAgents = availableAgents.length + unavailableAgents.length;

  // Handle export agent
  const handleExportAgent = useCallback(
    async (agent: AgentDefinition) => {
      setIsExporting(true);
      try {
        await exportAgent(agent, ExportFormat.JSON);
        showSuccess(`Agent "${agent.name}" exported successfully!`);
      } catch (error) {
        console.error('Failed to export agent:', error);
        showError(`Failed to export "${agent.name}". Please try again.`);
      } finally {
        setIsExporting(false);
      }
    },
    [showSuccess, showError]
  );

  // Handle import agent
  const handleImportAgent = useCallback(async () => {
    setIsImporting(true);
    try {
      // Create file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.yaml,.yml';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          try {
            const agent = await importAgent(file);
            // Agent is automatically registered during import
            showSuccess(`Agent "${agent.name}" imported successfully!`);
            onAgentCreated?.(agent);
          } catch (error) {
            console.error('Failed to import agent:', error);
            showError('Failed to import agent. Please check the file format and try again.');
          } finally {
            setIsImporting(false);
          }
        }
      };

      input.click();
    } catch (error) {
      console.error('Failed to open file picker:', error);
      showError('Failed to open file picker. Please try again.');
      setIsImporting(false);
    }
  }, [showSuccess, showError, onAgentCreated]);

  // Handle template selection
  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      // Import template
      const { getTemplateById } = require('@/lib/agents/templates/registry');
      const template = getTemplateById(templateId);

      if (template) {
        // Generate a unique ID for the new agent
        const uniqueId = `${template.id}-${Date.now()}`;

        // Create agent from template
        const newAgent: AgentDefinition = {
          ...template,
          id: uniqueId,
          metadata: {
            ...template.metadata,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };

        // Register the agent
        agentRegistry.registerAgent(newAgent);

        // Show success feedback
        showSuccess(`Agent "${template.name}" created from template!`);

        // Notify parent component
        onAgentCreated?.(newAgent);

        // Activate the new agent
        onActivateAgent(uniqueId);
      }
    },
    [onAgentCreated, onActivateAgent, showSuccess]
  );

  if (collapsed) {
    return (
      <div className="px-2 py-2 space-y-1" role="region" aria-label="AI Agents">
        {availableAgents.map(({ agent, availability }) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            availability={availability}
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
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between px-2 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex-1"
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

        {/* Action Buttons */}
        <div className="flex items-center gap-1 ml-2">
          {/* Help Button */}
          <button
            onClick={() => setShowHelp(true)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Get help with agents"
            aria-label="Get help with agents"
          >
            <HelpCircle className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>

          {/* Import Button */}
          <button
            onClick={handleImportAgent}
            disabled={isImporting}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Import agent from file"
            aria-label="Import agent"
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 text-slate-600 dark:text-slate-400 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            )}
          </button>

          {/* Browse Templates Button */}
          <button
            onClick={() => setShowTemplateGallery(true)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Browse agent templates"
            aria-label="Browse agent templates"
          >
            <Grid3x3 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>

          {/* Create Agent Button */}
          <CreateAgentButtonCompact />
        </div>
      </div>

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
                Your hardware doesn&apos;t meet the requirements for any agents
              </p>
            </div>
          )}
        </div>
      )}

      {/* Template Gallery Modal */}
      <Modal
        isOpen={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
        size="xl"
        showCloseButton={false}
        closeOnBackdropClick={true}
        closeOnEscape={true}
        className="h-[80vh]"
      >
        <TemplateGallery
          onSelectTemplate={handleSelectTemplate}
          onClose={() => setShowTemplateGallery(false)}
          hardwareScore={hardwareProfile?.performanceScore || 100}
        />
      </Modal>

      {/* Onboarding Modal */}
      <AgentOnboarding
        isOpen={shouldShow}
        onClose={() => {
          // Handled internally by localStorage
        }}
      />

      {/* Help Modal */}
      <AgentHelp
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  );
}
