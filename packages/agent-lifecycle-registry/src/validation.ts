/**
 * Agent Definition Validation
 *
 * Validates agent definitions for import/export operations.
 * Provides detailed error messages for debugging and user feedback.
 */

import type { AgentDefinition } from './types';
import { AgentCategory, ActivationMode, AgentState } from './types';

/**
 * Validation error
 */
export class ValidationError extends Error {
  public readonly errors: Array<{ field: string; message: string; value?: unknown }>;
  public readonly warnings: Array<{ field: string; message: string; value?: unknown }>;

  constructor(
    message: string,
    errors: Array<{ field: string; message: string; value?: unknown }> = [],
    warnings: Array<{ field: string; message: string; value?: unknown }> = []
  ) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
    this.warnings = warnings;
  }
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether the agent definition is valid */
  valid: boolean;
  /** Validation errors (blocking) */
  errors: Array<{ field: string; message: string; value?: unknown }>;
  /** Validation warnings (non-blocking) */
  warnings: Array<{ field: string; message: string; value?: unknown }>;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Whether to allow optional fields to be missing */
  allowMissingOptional?: boolean;
  /** Whether to validate against current hardware */
  checkHardware?: boolean;
}

/**
 * Validate agent definition
 *
 * @param definition - Agent definition to validate
 * @param options - Validation options
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateAgentDefinition(myAgent);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateAgentDefinition(
  definition: unknown,
  options: ValidationOptions = {}
): ValidationResult {
  const errors: Array<{ field: string; message: string; value?: unknown }> = [];
  const warnings: Array<{ field: string; message: string; value?: unknown }> = [];

  // Type check
  if (!definition || typeof definition !== 'object') {
    errors.push({
      field: 'root',
      message: 'Agent definition must be an object',
      value: definition,
    });
    return { valid: false, errors, warnings };
  }

  const agent = definition as Record<string, unknown>;

  // Required fields
  if (!agent.id || typeof agent.id !== 'string' || !agent.id.trim()) {
    errors.push({
      field: 'id',
      message: 'Agent ID is required and must be a non-empty string',
      value: agent.id,
    });
  } else {
    // Validate ID format
    if (!/^[a-z0-9-]+$/.test(agent.id)) {
      errors.push({
        field: 'id',
        message: 'Agent ID must contain only lowercase letters, numbers, and hyphens',
        value: agent.id,
      });
    }
  }

  if (!agent.name || typeof agent.name !== 'string' || !agent.name.trim()) {
    errors.push({
      field: 'name',
      message: 'Agent name is required and must be a non-empty string',
      value: agent.name,
    });
  } else if (agent.name.length > 100) {
    errors.push({
      field: 'name',
      message: 'Agent name must be 100 characters or less',
      value: agent.name.length,
    });
  }

  if (!agent.description || typeof agent.description !== 'string' || !agent.description.trim()) {
    errors.push({
      field: 'description',
      message: 'Agent description is required and must be a non-empty string',
      value: agent.description,
    });
  } else if (agent.description.length > 500) {
    warnings.push({
      field: 'description',
      message: 'Agent description is recommended to be 500 characters or less',
      value: agent.description.length,
    });
  }

  if (!agent.icon || typeof agent.icon !== 'string' || !agent.icon.trim()) {
    errors.push({
      field: 'icon',
      message: 'Agent icon is required (emoji or icon identifier)',
      value: agent.icon,
    });
  }

  // Category validation
  if (!agent.category) {
    errors.push({
      field: 'category',
      message: 'Agent category is required',
      value: agent.category,
    });
  } else {
    const validCategories: AgentCategory[] = [
      AgentCategory.ANALYSIS,
      AgentCategory.KNOWLEDGE,
      AgentCategory.CREATIVE,
      AgentCategory.AUTOMATION,
      AgentCategory.COMMUNICATION,
      AgentCategory.DATA,
      AgentCategory.CUSTOM,
    ];
    if (!validCategories.includes(agent.category as AgentCategory)) {
      errors.push({
        field: 'category',
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        value: agent.category,
      });
    }
  }

  // Activation mode validation
  if (!agent.activationMode) {
    errors.push({
      field: 'activationMode',
      message: 'Agent activation mode is required',
      value: agent.activationMode,
    });
  } else {
    const validModes: ActivationMode[] = [
      ActivationMode.BACKGROUND,
      ActivationMode.FOREGROUND,
      ActivationMode.HYBRID,
      ActivationMode.SCHEDULED,
    ];
    if (!validModes.includes(agent.activationMode as ActivationMode)) {
      errors.push({
        field: 'activationMode',
        message: `Invalid activation mode. Must be one of: ${validModes.join(', ')}`,
        value: agent.activationMode,
      });
    }
  }

  // Initial state validation
  if (!agent.initialState || typeof agent.initialState !== 'object') {
    errors.push({
      field: 'initialState',
      message: 'Agent initial state is required and must be an object',
      value: agent.initialState,
    });
  } else {
    const state = agent.initialState as Record<string, unknown>;
    if (!state.status) {
      errors.push({
        field: 'initialState.status',
        message: 'Initial state status is required',
        value: state.status,
      });
    } else {
      const validStates: AgentState[] = [
        AgentState.IDLE,
        AgentState.RUNNING,
        AgentState.PAUSED,
        AgentState.ERROR,
        AgentState.DISABLED,
      ];
      if (!validStates.includes(state.status as AgentState)) {
        errors.push({
          field: 'initialState.status',
          message: `Invalid state. Must be one of: ${validStates.join(', ')}`,
          value: state.status,
        });
      }
    }
  }

  // Metadata validation
  if (!agent.metadata || typeof agent.metadata !== 'object') {
    errors.push({
      field: 'metadata',
      message: 'Agent metadata is required and must be an object',
      value: agent.metadata,
    });
  } else {
    const metadata = agent.metadata as Record<string, unknown>;

    if (!metadata.version || typeof metadata.version !== 'string' || !metadata.version.trim()) {
      errors.push({
        field: 'metadata.version',
        message: 'Metadata version is required',
        value: metadata.version,
      });
    } else if (!/^\d+\.\d+\.\d+$/.test(metadata.version as string)) {
      warnings.push({
        field: 'metadata.version',
        message: 'Version should follow semver format (e.g., 1.0.0)',
        value: metadata.version,
      });
    }

    if (!metadata.author || typeof metadata.author !== 'string' || !metadata.author.trim()) {
      errors.push({
        field: 'metadata.author',
        message: 'Metadata author is required',
        value: metadata.author,
      });
    }

    if (!metadata.createdAt || typeof metadata.createdAt !== 'string') {
      warnings.push({
        field: 'metadata.createdAt',
        message: 'Metadata createdAt is recommended',
        value: metadata.createdAt,
      });
    } else if (isNaN(Date.parse(metadata.createdAt as string))) {
      errors.push({
        field: 'metadata.createdAt',
        message: 'Metadata createdAt must be a valid ISO date string',
        value: metadata.createdAt,
      });
    }

    if (!metadata.updatedAt || typeof metadata.updatedAt !== 'string') {
      warnings.push({
        field: 'metadata.updatedAt',
        message: 'Metadata updatedAt is recommended',
        value: metadata.updatedAt,
      });
    }

    if (!Array.isArray(metadata.tags)) {
      errors.push({
        field: 'metadata.tags',
        message: 'Metadata tags must be an array',
        value: metadata.tags,
      });
    } else if ((metadata.tags as unknown[]).length === 0) {
      warnings.push({
        field: 'metadata.tags',
        message: 'Adding tags to metadata is recommended for better discoverability',
        value: metadata.tags,
      });
    }
  }

  // Requirements validation (optional but recommended)
  if (agent.requirements) {
    if (typeof agent.requirements !== 'object') {
      errors.push({
        field: 'requirements',
        message: 'Requirements must be an object',
        value: agent.requirements,
      });
    } else {
      const reqs = agent.requirements as Record<string, unknown>;

      if (reqs.hardware && typeof reqs.hardware !== 'object') {
        errors.push({
          field: 'requirements.hardware',
          message: 'Hardware requirements must be an object',
          value: reqs.hardware,
        });
      }

      if (reqs.flags && typeof reqs.flags !== 'object') {
        errors.push({
          field: 'requirements.flags',
          message: 'Feature flag requirements must be an object',
          value: reqs.flags,
        });
      }

      if (reqs.dependencies && !Array.isArray(reqs.dependencies)) {
        errors.push({
          field: 'requirements.dependencies',
          message: 'Agent dependencies must be an array',
          value: reqs.dependencies,
        });
      }
    }
  } else {
    warnings.push({
      field: 'requirements',
      message: 'Specifying requirements is recommended for better compatibility checking',
    });
  }

  // Config schema validation (optional)
  if (agent.configSchema && typeof agent.configSchema !== 'object') {
    errors.push({
      field: 'configSchema',
      message: 'Config schema must be an object',
      value: agent.configSchema,
    });
  }

  // Examples validation (optional)
  if (agent.examples && !Array.isArray(agent.examples)) {
    errors.push({
      field: 'examples',
      message: 'Examples must be an array',
      value: agent.examples,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate and throw if invalid
 *
 * @param definition - Agent definition to validate
 * @param options - Validation options
 * @throws {ValidationError} If validation fails
 *
 * @example
 * ```typescript
 * try {
 *   validateAgentOrThrow(myAgent);
 *   // Agent is valid
 * } catch (error) {
 *   console.error('Validation failed:', error.message);
 * }
 * ```
 */
export function validateAgentOrThrow(
  definition: unknown,
  options: ValidationOptions = {}
): asserts definition is AgentDefinition {
  const result = validateAgentDefinition(definition, options);

  if (!result.valid) {
    const errorMessages = result.errors.map((e) => `[${e.field}] ${e.message}`).join('\n');
    throw new ValidationError(`Agent validation failed:\n${errorMessages}`, result.errors, result.warnings);
  }
}

/**
 * Format validation errors for user display
 *
 * @param result - Validation result
 * @returns Formatted error message
 *
 * @example
 * ```typescript
 * const result = validateAgentDefinition(myAgent);
 * if (!result.valid) {
 *   const message = formatValidationErrors(result);
 *   alert(message);
 * }
 * ```
 */
export function formatValidationErrors(result: ValidationResult): string {
  if (result.valid) {
    return 'Agent definition is valid';
  }

  const lines: string[] = ['Agent validation failed:'];

  if (result.errors.length > 0) {
    lines.push('\nErrors:');
    result.errors.forEach((error) => {
      lines.push(`  • ${error.field}: ${error.message}`);
    });
  }

  if (result.warnings.length > 0) {
    lines.push('\nWarnings:');
    result.warnings.forEach((warning) => {
      lines.push(`  • ${warning.field}: ${warning.message}`);
    });
  }

  return lines.join('\n');
}

/**
 * Validate agent ID format
 *
 * @param id - Agent ID to validate
 * @returns True if valid
 */
export function isValidAgentId(id: string): boolean {
  return /^[a-z0-9-]+$/u.test(id) && id.length > 0 && id.length <= 50;
}

/**
 * Sanitize agent definition for export
 *
 * Removes sensitive or unnecessary data before export.
 *
 * @param definition - Agent definition to sanitize
 * @returns Sanitized agent definition
 */
export function sanitizeAgentForExport(definition: AgentDefinition): AgentDefinition {
  // Create a deep copy
  const sanitized = JSON.parse(JSON.stringify(definition)) as AgentDefinition;

  // Remove sensitive data if any (none currently, but placeholder for future)
  // e.g., internal state, cache data, etc.

  // Ensure metadata has proper timestamps
  if (!sanitized.metadata.createdAt) {
    sanitized.metadata.createdAt = new Date().toISOString();
  }
  sanitized.metadata.updatedAt = new Date().toISOString();

  return sanitized;
}
