/**
 * Agent Marketplace Export
 *
 * Export agents to JSON or YAML files for sharing and backup.
 */

import type { MarketplaceAgent, ExportedAgentData } from './types';
import { ExportFormat } from './types';
import { ValidationError, StorageError } from '@/lib/errors';

const FORMAT_VERSION = 'personallog-agent-v1';

/**
 * Export agent to JSON
 *
 * @param agent - Agent to export
 * @returns JSON string
 * @throws {ValidationError} If agent is invalid
 *
 * @example
 * ```typescript
 * const json = await exportAgentToJSON(myAgent);
 * console.log(json);
 * ```
 */
export async function exportAgentToJSON(agent: MarketplaceAgent): Promise<string> {
  // Validate before export
  const validation = validateExport(agent);
  if (!validation.valid) {
    throw new ValidationError('Agent validation failed', {
      context: { errors: validation.errors },
    });
  }

  const data: ExportedAgentData = {
    format: FORMAT_VERSION,
    agent: {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      icon: agent.icon,
      category: agent.category,
      requirements: agent.requirements,
      activationMode: agent.activationMode,
      initialState: agent.initialState,
      metadata: agent.metadata,
      configSchema: agent.configSchema,
      examples: agent.examples,
    },
    marketplace: agent.marketplace,
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Export agent to YAML
 *
 * @param agent - Agent to export
 * @returns YAML string
 * @throws {ValidationError} If agent is invalid
 *
 * @example
 * ```typescript
 * const yaml = await exportAgentToYAML(myAgent);
 * console.log(yaml);
 * ```
 */
export async function exportAgentToYAML(agent: MarketplaceAgent): Promise<string> {
  // Validate before export
  const validation = validateExport(agent);
  if (!validation.valid) {
    throw new ValidationError('Agent validation failed', {
      context: { errors: validation.errors },
    });
  }

  const yaml = await import('js-yaml');
  const data: ExportedAgentData = {
    format: FORMAT_VERSION,
    agent: {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      icon: agent.icon,
      category: agent.category,
      requirements: agent.requirements,
      activationMode: agent.activationMode,
      initialState: agent.initialState,
      metadata: agent.metadata,
      configSchema: agent.configSchema,
      examples: agent.examples,
    },
    marketplace: agent.marketplace,
    exportedAt: new Date().toISOString(),
  };

  return yaml.dump(data, {
    indent: 2,
    lineWidth: -1, // Don't line wrap
    noRefs: true, // Don't use anchors/aliases
    sortKeys: false, // Keep field order
  });
}

/**
 * Export multiple agents
 *
 * @param agents - Array of agents to export
 * @param format - Export format (JSON or YAML)
 * @returns Array of export strings (one per agent)
 * @throws {ValidationError} If any agent is invalid
 * @throws {StorageError} If export fails
 *
 * @example
 * ```typescript
 * const exports = await exportMultipleAgents([agent1, agent2], 'json');
 * exports.forEach((json, i) => {
 *   console.log(`Agent ${i + 1}:`, json);
 * });
 * ```
 */
export async function exportMultipleAgents(
  agents: MarketplaceAgent[],
  format: ExportFormat
): Promise<string[]> {
  const exports: string[] = [];

  for (const agent of agents) {
    try {
      if (format === ExportFormat.JSON) {
        exports.push(await exportAgentToJSON(agent));
      } else {
        exports.push(await exportAgentToYAML(agent));
      }
    } catch (error) {
      throw new StorageError(`Failed to export agent: ${agent.id}`, {
        technicalDetails: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  return exports;
}

/**
 * Download agent file
 *
 * Triggers browser download of agent export file.
 *
 * @param agent - Agent to download
 * @param format - Export format
 * @throws {ValidationError} If agent is invalid
 * @throws {StorageError} If download fails
 *
 * @example
 * ```typescript
 * await downloadAgentFile(myAgent, 'json');
 * // File downloads as "my-agent-v1.json"
 * ```
 */
export async function downloadAgentFile(agent: MarketplaceAgent, format: ExportFormat): Promise<void> {
  let content: string;
  let mimeType: string;

  try {
    if (format === ExportFormat.JSON) {
      content = await exportAgentToJSON(agent);
      mimeType = 'application/json';
    } else {
      content = await exportAgentToYAML(agent);
      mimeType = 'text/yaml';
    }
  } catch (error) {
    throw new StorageError(`Failed to prepare agent file for download: ${agent.id}`, {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined,
    });
  }

  // Create file blob
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  // Create download link
  const link = document.createElement('a');
  link.href = url;
  link.download = `${agent.id}.${format}`;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download multiple agents as a single file
 *
 * Creates a JSON array or YAML multi-document file.
 *
 * @param agents - Array of agents to download
 * @param format - Export format
 * @param filename - Custom filename (optional)
 * @throws {ValidationError} If any agent is invalid
 * @throws {StorageError} If download fails
 *
 * @example
 * ```typescript
 * await downloadMultipleAgents([agent1, agent2], 'json', 'my-agents');
 * // File downloads as "my-agents.json"
 * ```
 */
export async function downloadMultipleAgents(
  agents: MarketplaceAgent[],
  format: ExportFormat,
  filename?: string
): Promise<void> {
  let content: string;
  let mimeType: string;

  try {
    if (format === ExportFormat.JSON) {
      // Export as JSON array
      const exports = await exportMultipleAgents(agents, ExportFormat.JSON);
      const parsedExports = exports.map((exp) => JSON.parse(exp));
      content = JSON.stringify(parsedExports, null, 2);
      mimeType = 'application/json';
    } else {
      // Export as YAML multi-document
      const yaml = await import('js-yaml');
      const exports = await exportMultipleAgents(agents, ExportFormat.YAML);
      const parsedExports = exports.map((exp) => yaml.load(exp));
      content = parsedExports.map((doc) => yaml.dump(doc, { indent: 2 })).join('---\n');
      mimeType = 'text/yaml';
    }
  } catch (error) {
    throw new StorageError('Failed to prepare agents file for download', {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined,
    });
  }

  // Create file blob
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  // Create download link
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `agents-${Date.now()}.${format}`;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate export data
 *
 * @param data - Data to validate
 * @returns Validation result with errors if invalid
 */
export function validateExport(data: ExportedAgentData | MarketplaceAgent): {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Handle MarketplaceAgent
  if ('marketplace' in data) {
    const agent = data as MarketplaceAgent;

    // Required fields
    if (!agent.id?.trim()) {
      errors.push('Agent ID is required');
    }
    if (!agent.name?.trim()) {
      errors.push('Agent name is required');
    }
    if (!agent.description?.trim()) {
      errors.push('Agent description is required');
    }
    if (!agent.icon?.trim()) {
      errors.push('Agent icon is required');
    }
    if (!agent.category) {
      errors.push('Agent category is required');
    }
    if (!agent.activationMode) {
      errors.push('Agent activation mode is required');
    }

    // Marketplace metadata
    if (!agent.marketplace?.author?.trim()) {
      errors.push('Marketplace author is required');
    }
    if (!agent.marketplace?.version?.trim()) {
      errors.push('Marketplace version is required');
    }
    if (!agent.marketplace?.description?.trim()) {
      errors.push('Marketplace description is required');
    }
    if (!Array.isArray(agent.marketplace?.tags)) {
      errors.push('Marketplace tags must be an array');
    }
    if (!agent.marketplace?.license?.trim()) {
      warnings.push('Marketplace license is recommended');
    }

    // Metadata
    if (!agent.metadata?.version?.trim()) {
      errors.push('Agent metadata version is required');
    }
    if (!agent.metadata?.author?.trim()) {
      errors.push('Agent metadata author is required');
    }
  }
  // Handle ExportedAgentData
  else {
    const exported = data as ExportedAgentData;

    if (exported.format !== FORMAT_VERSION) {
      warnings.push(`Unknown format version: ${exported.format}`);
    }

    if (!exported.agent) {
      errors.push('Exported data missing agent definition');
    }

    if (!exported.marketplace) {
      errors.push('Exported data missing marketplace metadata');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Get export filename for agent
 *
 * @param agent - Agent to get filename for
 * @param format - Export format
 * @returns Filename string
 *
 * @example
 * ```typescript
 * const filename = getExportFilename(myAgent, 'json');
 * // Returns: "my-agent-v1.json"
 * ```
 */
export function getExportFilename(agent: MarketplaceAgent, format: ExportFormat): string {
  return `${agent.id}.${format}`;
}

/**
 * Prepare agent for export
 *
 * Ensures agent is ready for export by validating and sanitizing data.
 *
 * @param agent - Agent to prepare
 * @returns Prepared agent ready for export
 * @throws {ValidationError} If agent cannot be prepared
 *
 * @example
 * ```typescript
 * const prepared = await prepareAgentForExport(myAgent);
 * const json = await exportAgentToJSON(prepared);
 * ```
 */
export async function prepareAgentForExport(agent: MarketplaceAgent): Promise<MarketplaceAgent> {
  // Validate
  const validation = validateExport(agent);
  if (!validation.valid) {
    throw new ValidationError('Agent cannot be exported', {
      context: { errors: validation.errors },
    });
  }

  // Sanitize (remove sensitive data if any)
  const prepared: MarketplaceAgent = {
    ...agent,
    // Ensure marketplace metadata is complete
    marketplace: {
      ...agent.marketplace,
      // Reset stats when exporting (will be re-initialized on import)
      stats: {
        downloads: 0,
        installs: 0,
        rating: 0,
        ratingCount: 0,
        lastUpdated: Date.now(),
      },
    },
  };

  return prepared;
}
