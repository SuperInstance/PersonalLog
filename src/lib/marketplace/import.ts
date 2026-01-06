/**
 * Agent Marketplace Import
 *
 * Import agents from JSON or YAML files with validation and conflict resolution.
 */

import type { MarketplaceAgent, ExportedAgentData, ImportResult, ImportValidation, ConflictResolution } from './types';
import { saveMarketplaceAgent, loadMarketplaceAgent, deleteMarketplaceAgent } from './storage';
import { agentRegistry } from '@/lib/agents';
import { ValidationError, StorageError } from '@/lib/errors';

const FORMAT_VERSION = 'personallog-agent-v1';

/**
 * Import agent from JSON
 *
 * @param json - JSON string to import
 * @returns Promise resolving to import result
 * @throws {ValidationError} If JSON is invalid
 * @throws {StorageError} If import fails
 *
 * @example
 * ```typescript
 * const result = await importAgentFromJSON(jsonString);
 * if (result.imported) {
 *   console.log(`Imported agent: ${result.agentId}`);
 * }
 * ```
 */
export async function importAgentFromJSON(json: string): Promise<ImportResult> {
  let data: ExportedAgentData;

  try {
    data = JSON.parse(json);
  } catch (error) {
    throw new ValidationError('Invalid JSON format', {
      field: 'json',
      value: json,
      context: { error },
    });
  }

  return importAgentWithData(data);
}

/**
 * Import agent from YAML
 *
 * @param yaml - YAML string to import
 * @returns Promise resolving to import result
 * @throws {ValidationError} If YAML is invalid
 * @throws {StorageError} If import fails
 *
 * @example
 * ```typescript
 * const result = await importAgentFromYAML(yamlString);
 * if (result.imported) {
 *   console.log(`Imported agent: ${result.agentId}`);
 * }
 * ```
 */
export async function importAgentFromYAML(yamlString: string): Promise<ImportResult> {
  let data: ExportedAgentData;

  try {
    const yaml = await import('js-yaml');
    data = yaml.load(yamlString) as ExportedAgentData;
  } catch (error) {
    throw new ValidationError('Invalid YAML format', {
      field: 'yaml',
      value: yamlString,
      context: { error },
    });
  }

  return importAgentWithData(data);
}

/**
 * Import agent with full validation pipeline
 *
 * @param data - Exported agent data
 * @param resolveConflict - Optional conflict resolution strategy
 * @returns Promise resolving to import result
 * @throws {ValidationError} If validation fails
 * @throws {StorageError} If import fails
 *
 * @example
 * ```typescript
 * const result = await importAgentWithValidation(data, 'rename');
 * ```
 */
export async function importAgentWithValidation(
  data: ExportedAgentData,
  resolveConflict?: ConflictResolution
): Promise<ImportResult> {
  // 1. Validate
  const validation = validateImport(data);
  if (!validation.valid) {
    throw new ValidationError('Agent validation failed', {
      context: { errors: validation.errors, warnings: validation.warnings },
    });
  }

  // 2. Convert to MarketplaceAgent
  const agent = convertToMarketplaceAgent(data);

  // 3. Check for conflicts
  const existing = await loadMarketplaceAgent(agent.id);

  if (existing) {
    if (resolveConflict === 'skip') {
      return { imported: false, skipped: true };
    } else if (resolveConflict === 'replace') {
      await deleteMarketplaceAgent(agent.id);
    } else if (resolveConflict === 'rename') {
      agent.id = `${agent.id}-imported-${Date.now()}`;
    } else if (resolveConflict === 'merge') {
      // Merge: Keep existing marketplace metadata, update agent definition
      agent.marketplace = { ...existing.marketplace };
    } else {
      // No resolution provided - return conflict info
      return {
        imported: false,
        error: `Agent with ID ${agent.id} already exists. Please specify conflict resolution strategy.`,
      };
    }
  }

  // 4. Save to IndexedDB
  try {
    await saveMarketplaceAgent(agent);
  } catch (error) {
    throw new StorageError(`Failed to save imported agent: ${agent.id}`, {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined,
    });
  }

  // 5. Register in agent registry (if not already registered)
  try {
    if (!agentRegistry.getAgent(agent.id)) {
      agentRegistry.registerAgent(agent);
    }
  } catch (error) {
    // Registry error is not critical - log but don't fail import
    console.warn(`Failed to register imported agent in registry: ${agent.id}`, error);
  }

  return { imported: true, agentId: agent.id };
}

/**
 * Import agent from file
 *
 * Detects format automatically and imports.
 *
 * @param file - File to import
 * @returns Promise resolving to import result
 * @throws {ValidationError} If file is invalid
 * @throws {StorageError} If import fails
 *
 * @example
 * ```typescript
 * // From file input
 * const file = fileInput.files[0];
 * const result = await importAgentFromFile(file);
 * ```
 */
export async function importAgentFromFile(file: File): Promise<ImportResult> {
  // 1. Read file
  const content = await readFileContent(file);

  // 2. Detect format
  const format = detectFileFormat(content, file.name);

  // 3. Parse and import
  try {
    if (format === 'json') {
      return await importAgentFromJSON(content);
    } else {
      return await importAgentFromYAML(content);
    }
  } catch (error) {
    throw new ValidationError(`Failed to import agent from file: ${file.name}`, {
      context: { error },
    });
  }
}

/**
 * Import multiple agents from file
 *
 * @param file - File containing multiple agents
 * @param resolveConflict - Conflict resolution strategy
 * @returns Promise resolving to array of import results
 * @throws {ValidationError} If file is invalid
 * @throws {StorageError} If import fails
 *
 * @example
 * ```typescript
 * const results = await importMultipleAgentsFromFile(file, 'rename');
 * console.log(`Imported ${results.filter(r => r.imported).length} agents`);
 * ```
 */
export async function importMultipleAgentsFromFile(
  file: File,
  resolveConflict: ConflictResolution = 'rename'
): Promise<ImportResult[]> {
  const content = await readFileContent(file);
  const format = detectFileFormat(content, file.name);

  let agents: ExportedAgentData[];

  try {
    if (format === 'json') {
      const data = JSON.parse(content);
      agents = Array.isArray(data) ? data : [data];
    } else {
      const yaml = await import('js-yaml');
      const data = yaml.loadAll(content);
      agents = data as ExportedAgentData[];
    }
  } catch (error) {
    throw new ValidationError(`Failed to parse agent file: ${file.name}`, {
      context: { error },
    });
  }

  const results: ImportResult[] = [];

  for (const agentData of agents) {
    try {
      const result = await importAgentWithValidation(agentData, resolveConflict);
      results.push(result);
    } catch (error) {
      results.push({
        imported: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Validate imported data
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateImport(data: ExportedAgentData): ImportValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check format version
  if (!data.format || data.format !== FORMAT_VERSION) {
    warnings.push(`Unexpected format version: ${data.format || '(missing)'}`);
  }

  // Check agent definition
  if (!data.agent) {
    errors.push('Missing agent definition');
    return { valid: false, errors, warnings };
  }

  // Check required agent fields
  if (!data.agent.id?.trim()) {
    errors.push('Agent ID is required');
  }
  if (!data.agent.name?.trim()) {
    errors.push('Agent name is required');
  }
  if (!data.agent.description?.trim()) {
    errors.push('Agent description is required');
  }
  if (!data.agent.icon?.trim()) {
    errors.push('Agent icon is required');
  }
  if (!data.agent.category) {
    errors.push('Agent category is required');
  }
  if (!data.agent.activationMode) {
    errors.push('Agent activation mode is required');
  }

  // Check marketplace metadata
  if (!data.marketplace) {
    errors.push('Missing marketplace metadata');
    return { valid: false, errors, warnings };
  }

  if (!data.marketplace.author?.trim()) {
    errors.push('Marketplace author is required');
  }
  if (!data.marketplace.version?.trim()) {
    errors.push('Marketplace version is required');
  }
  if (!data.marketplace.description?.trim()) {
    errors.push('Marketplace description is required');
  }
  if (!Array.isArray(data.marketplace.tags)) {
    errors.push('Marketplace tags must be an array');
  }

  // Check agent metadata
  if (!data.agent.metadata?.version?.trim()) {
    errors.push('Agent metadata version is required');
  }
  if (!data.agent.metadata?.author?.trim()) {
    errors.push('Agent metadata author is required');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Check for conflicts
 *
 * @param agent - Agent to check
 * @returns Promise resolving to existing agent if conflict exists
 */
export async function checkForConflicts(agent: MarketplaceAgent): Promise<MarketplaceAgent | null> {
  return loadMarketplaceAgent(agent.id);
}

/**
 * Resolve conflict with UI
 *
 * This is a placeholder for UI integration.
 * In a real implementation, this would show a modal/dialog.
 *
 * @param existing - Existing agent
 * @param imported - Imported agent
 * @returns Promise resolving to conflict resolution strategy
 */
export async function promptConflictResolution(
  existing: MarketplaceAgent,
  imported: MarketplaceAgent
): Promise<ConflictResolution> {
  // This should be implemented by UI layer
  // For now, default to 'rename'
  console.warn('Conflict resolution UI not implemented. Using default: rename');

  // Log conflict details
  console.log('Conflict detected:', {
    existing: {
      id: existing.id,
      name: existing.name,
      version: existing.marketplace.version,
    },
    imported: {
      id: imported.id,
      name: imported.name,
      version: imported.marketplace.version,
    },
  });

  return 'rename';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Import agent from parsed data
 */
async function importAgentWithData(data: ExportedAgentData): Promise<ImportResult> {
  const validation = validateImport(data);
  if (!validation.valid) {
    throw new ValidationError('Invalid agent data', {
      context: { errors: validation.errors, warnings: validation.warnings },
    });
  }

  const agent = convertToMarketplaceAgent(data);

  // Check for conflicts
  const existing = await loadMarketplaceAgent(agent.id);
  if (existing) {
    return {
      imported: false,
      error: `Agent with ID ${agent.id} already exists. Use conflict resolution strategy.`,
    };
  }

  // Save
  await saveMarketplaceAgent(agent);

  // Register in agent registry
  try {
    if (!agentRegistry.getAgent(agent.id)) {
      agentRegistry.registerAgent(agent);
    }
  } catch (error) {
    console.warn(`Failed to register imported agent: ${agent.id}`, error);
  }

  return { imported: true, agentId: agent.id };
}

/**
 * Convert exported data to MarketplaceAgent
 */
function convertToMarketplaceAgent(data: ExportedAgentData): MarketplaceAgent {
  return {
    ...data.agent,
    marketplace: {
      ...data.marketplace,
      // Re-initialize stats for import
      stats: {
        downloads: 0,
        installs: 0,
        rating: 0,
        ratingCount: 0,
        lastUpdated: Date.now(),
      },
      // Set timestamps
      createdAt: data.marketplace.createdAt || Date.now(),
      updatedAt: Date.now(),
    },
  };
}

/**
 * Read file content as text
 */
async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new ValidationError(`Failed to read file: ${file.name}`, {
        context: { error: reader.error },
      }));

    reader.readAsText(file);
  });
}

/**
 * Detect file format from content and extension
 */
function detectFileFormat(content: string, filename: string): 'json' | 'yaml' {
  const trimmed = content.trim();

  // Check extension first
  if (filename.endsWith('.json')) {
    return 'json';
  }
  if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
    return 'yaml';
  }

  // Fall back to content detection
  if (trimmed.startsWith('{')) {
    return 'json';
  }

  // Default to YAML
  return 'yaml';
}
