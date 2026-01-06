/**
 * Agent Import/Export Utilities
 *
 * Helper functions for exporting and importing agent definitions.
 * Integrates with marketplace export functionality.
 */

import type { AgentDefinition } from './types';
import type { MarketplaceAgent, ExportFormat } from '@/lib/marketplace/types';
import { downloadAgentFile } from '@/lib/marketplace/export';
import { validateAgentOrThrow, sanitizeAgentForExport } from './validation';

/**
 * Export agent to file
 *
 * @param agent - Agent definition to export
 * @param format - Export format (json or yaml)
 * @returns Promise that resolves when download is triggered
 * @throws {ValidationError} If agent is invalid
 * @throws {Error} If download fails
 *
 * @example
 * ```typescript
 * await exportAgent(myAgent, 'json');
 * // File downloads as "my-agent-v1.json"
 * ```
 */
export async function exportAgent(agent: AgentDefinition, format: ExportFormat): Promise<void> {
  // Validate agent before export
  validateAgentOrThrow(agent);

  // Sanitize for export
  const sanitized = sanitizeAgentForExport(agent);

  // Convert to MarketplaceAgent format (required for download function)
  const marketplaceAgent: MarketplaceAgent = {
    ...sanitized,
    marketplace: {
      author: sanitized.metadata.author,
      version: sanitized.metadata.version,
      description: sanitized.description,
      longDescription: sanitized.description,
      tags: sanitized.metadata.tags,
      stats: {
        downloads: 0,
        installs: 0,
        rating: 0,
        ratingCount: 0,
        lastUpdated: Date.now(),
      },
      createdAt: new Date(sanitized.metadata.createdAt).getTime(),
      updatedAt: Date.now(),
      visibility: 'private',
      license: 'MIT',
    },
  };

  // Trigger download
  await downloadAgentFile(marketplaceAgent, format);
}

/**
 * Export multiple agents to a single file
 *
 * @param agents - Array of agent definitions to export
 * @param format - Export format (json or yaml)
 * @param filename - Custom filename (optional)
 * @returns Promise that resolves when download is triggered
 * @throws {ValidationError} If any agent is invalid
 * @throws {Error} If download fails
 *
 * @example
 * ```typescript
 * await exportMultipleAgents([agent1, agent2], 'json', 'my-agents');
 * // File downloads as "my-agents.json"
 * ```
 */
export async function exportMultipleAgents(
  agents: AgentDefinition[],
  format: ExportFormat,
  filename?: string
): Promise<void> {
  // Validate all agents
  agents.forEach((agent) => validateAgentOrThrow(agent));

  // Convert to MarketplaceAgent format
  const marketplaceAgents: MarketplaceAgent[] = agents.map((agent) => {
    const sanitized = sanitizeAgentForExport(agent);

    return {
      ...sanitized,
      marketplace: {
        author: sanitized.metadata.author,
        version: sanitized.metadata.version,
        description: sanitized.description,
        longDescription: sanitized.description,
        tags: sanitized.metadata.tags,
        stats: {
          downloads: 0,
          installs: 0,
          rating: 0,
          ratingCount: 0,
          lastUpdated: Date.now(),
        },
        createdAt: new Date(sanitized.metadata.createdAt).getTime(),
        updatedAt: Date.now(),
        visibility: 'private',
        license: 'MIT',
      },
    };
  });

  // Import download function
  const { downloadMultipleAgents: download } = await import('@/lib/marketplace/export');

  // Trigger download
  await download(marketplaceAgents, format, filename);
}

/**
 * Import agent from file
 *
 * @param file - File to import
 * @returns Promise resolving to imported agent definition
 * @throws {ValidationError} If file is invalid
 * @throws {Error} If import fails
 *
 * @example
 * ```typescript
 * const agent = await importAgent(file);
 * console.log(`Imported: ${agent.name}`);
 * ```
 */
export async function importAgent(file: File): Promise<AgentDefinition> {
  // Import the marketplace import function
  const { importAgentFromFile } = await import('@/lib/marketplace/import');

  // Import using marketplace function
  const result = await importAgentFromFile(file);

  if (!result.imported) {
    throw new Error(result.error || 'Import failed');
  }

  // Load the imported agent
  const { loadMarketplaceAgent } = await import('@/lib/marketplace/storage');
  const agent = await loadMarketplaceAgent(result.agentId!);

  if (!agent) {
    throw new Error(`Failed to load imported agent: ${result.agentId}`);
  }

  return agent;
}

/**
 * Import multiple agents from files
 *
 * @param files - Files to import
 * @returns Promise resolving to array of imported agent definitions
 * @throws {ValidationError} If any file is invalid
 * @throws {Error} If import fails
 *
 * @example
 * ```typescript
 * const agents = await importMultipleAgents([file1, file2]);
 * console.log(`Imported ${agents.length} agents`);
 * ```
 */
export async function importMultipleAgents(files: File[]): Promise<AgentDefinition[]> {
  const agents: AgentDefinition[] = [];
  const errors: Array<{ file: string; error: string }> = [];

  for (const file of files) {
    try {
      const agent = await importAgent(file);
      agents.push(agent);
    } catch (error) {
      errors.push({
        file: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (errors.length > 0) {
    console.warn('Some agents failed to import:', errors);
  }

  return agents;
}

/**
 * Convert AgentDefinition to export format JSON
 *
 * @param agent - Agent definition to convert
 * @returns JSON string ready for export
 * @throws {ValidationError} If agent is invalid
 *
 * @example
 * ```typescript
 * const json = await agentToJSON(myAgent);
 * console.log(json);
 * ```
 */
export async function agentToJSON(agent: AgentDefinition): Promise<string> {
  validateAgentOrThrow(agent);
  const sanitized = sanitizeAgentForExport(agent);
  return JSON.stringify(sanitized, null, 2);
}

/**
 * Parse agent from JSON
 *
 * @param json - JSON string to parse
 * @returns Parsed agent definition
 * @throws {ValidationError} If JSON is invalid
 *
 * @example
 * ```typescript
 * const agent = await agentFromJSON(jsonString);
 * console.log(`Parsed: ${agent.name}`);
 * ```
 */
export async function agentFromJSON(json: string): Promise<AgentDefinition> {
  let data: unknown;

  try {
    data = JSON.parse(json);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }

  // Validate
  validateAgentOrThrow(data);

  return data as AgentDefinition;
}
