/**
 * PersonalLog Plugin SDK - Plugin Validation
 *
 * Provides validation utilities for plugin manifests and implementations.
 *
 * @packageDocumentation
 */

import type { PluginManifest, PluginCapabilities } from './types';

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

/**
 * Plugin validation error
 */
export class PluginValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: any
  ) {
    super(message);
    this.name = 'PluginValidationError';
  }
}

/**
 * Plugin validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  field: string;
  message: string;
  value?: any;
}

// ============================================================================
// MANIFEST VALIDATION
// ============================================================================

/**
 * Validate a plugin manifest
 *
 * @param manifest - Plugin manifest to validate
 * @returns Validation result
 */
export function validateManifest(manifest: PluginManifest): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!manifest.id) {
    errors.push({
      field: 'id',
      message: 'Plugin ID is required',
    });
  } else {
    // Validate ID format
    if (!/^[a-z0-9-_]+$/.test(manifest.id)) {
      errors.push({
        field: 'id',
        message: 'Plugin ID must contain only lowercase letters, numbers, hyphens, and underscores',
        value: manifest.id,
      });
    }
  }

  if (!manifest.name) {
    errors.push({
      field: 'name',
      message: 'Plugin name is required',
    });
  } else if (manifest.name.length > 100) {
    errors.push({
      field: 'name',
      message: 'Plugin name must be 100 characters or less',
      value: manifest.name,
    });
  }

  if (!manifest.description) {
    errors.push({
      field: 'description',
      message: 'Plugin description is required',
    });
  } else if (manifest.description.length > 500) {
    warnings.push({
      field: 'description',
      message: 'Plugin description is recommended to be 500 characters or less',
      value: manifest.description.length,
    });
  }

  if (!manifest.version) {
    errors.push({
      field: 'version',
      message: 'Plugin version is required',
    });
  } else {
    // Validate semantic versioning
    if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
      errors.push({
        field: 'version',
        message: 'Plugin version must follow semantic versioning (e.g., 1.0.0)',
        value: manifest.version,
      });
    }
  }

  if (!manifest.author) {
    errors.push({
      field: 'author',
      message: 'Plugin author is required',
    });
  }

  // Capabilities validation
  if (!manifest.capabilities) {
    errors.push({
      field: 'capabilities',
      message: 'Plugin capabilities are required',
    });
  } else {
    validateCapabilities(manifest.capabilities, errors, warnings);
  }

  // Entry points validation
  if (!manifest.entryPoints) {
    errors.push({
      field: 'entryPoints',
      message: 'Plugin entry points are required',
    });
  } else {
    validateEntryPoints(manifest, errors, warnings);
  }

  // Optional fields validation
  if (manifest.homepage) {
    if (!isValidUrl(manifest.homepage)) {
      errors.push({
        field: 'homepage',
        message: 'Plugin homepage must be a valid URL',
        value: manifest.homepage,
      });
    }
  }

  if (manifest.repository) {
    if (!isValidUrl(manifest.repository)) {
      errors.push({
        field: 'repository',
        message: 'Plugin repository must be a valid URL',
        value: manifest.repository,
      });
    }
  }

  // Version compatibility validation
  if (manifest.minAppVersion) {
    if (!/^\d+\.\d+\.\d+/.test(manifest.minAppVersion)) {
      errors.push({
        field: 'minAppVersion',
        message: 'Minimum app version must follow semantic versioning',
        value: manifest.minAppVersion,
      });
    }
  }

  if (manifest.maxAppVersion) {
    if (!/^\d+\.\d+\.\d+/.test(manifest.maxAppVersion)) {
      errors.push({
        field: 'maxAppVersion',
        message: 'Maximum app version must follow semantic versioning',
        value: manifest.maxAppVersion,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate plugin capabilities
 */
function validateCapabilities(
  capabilities: PluginCapabilities,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Check if at least one capability is requested
  const hasAnyCapability =
    capabilities.conversations ||
    capabilities.knowledge ||
    capabilities.ai ||
    capabilities.settings ||
    capabilities.ui ||
    capabilities.network ||
    capabilities.storage ||
    capabilities.export;

  if (!hasAnyCapability) {
    warnings.push({
      field: 'capabilities',
      message: 'Plugin has no capabilities - it won\'t be able to do anything',
    });
  }

  // Validate network capability
  if (capabilities.network && typeof capabilities.network === 'object') {
    if (capabilities.network.rateLimit && capabilities.network.rateLimit < 1) {
      errors.push({
        field: 'capabilities.network.rateLimit',
        message: 'Rate limit must be at least 1 request per minute',
        value: capabilities.network.rateLimit,
      });
    }

    if (capabilities.network.domains && capabilities.network.domains.length === 0) {
      warnings.push({
        field: 'capabilities.network.domains',
        message: 'Empty domains list means no network access will be allowed',
      });
    }
  }

  // Validate storage capability
  if (capabilities.storage && typeof capabilities.storage === 'object') {
    if (capabilities.storage.quota && capabilities.storage.quota < 1024) {
      errors.push({
        field: 'capabilities.storage.quota',
        message: 'Storage quota must be at least 1KB (1024 bytes)',
        value: capabilities.storage.quota,
      });
    }

    if (capabilities.storage.maxFileSize && capabilities.storage.maxFileSize < 1) {
      errors.push({
        field: 'capabilities.storage.maxFileSize',
        message: 'Max file size must be at least 1 byte',
        value: capabilities.storage.maxFileSize,
      });
    }
  }
}

/**
 * Validate plugin entry points
 */
function validateEntryPoints(
  manifest: PluginManifest,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const { entryPoints } = manifest;

  // Check if at least one entry point is defined
  const hasAnyEntryPoint =
    entryPoints.plugin ||
    entryPoints.aiProvider ||
    entryPoints.exportFormat ||
    entryPoints.importFormat ||
    entryPoints.ui;

  if (!hasAnyEntryPoint) {
    errors.push({
      field: 'entryPoints',
      message: 'Plugin must have at least one entry point',
    });
  }

  // Validate AI provider entry point
  if (entryPoints.aiProvider) {
    if (!manifest.capabilities.ai) {
      warnings.push({
        field: 'entryPoints.aiProvider',
        message: 'AI provider entry point defined but ai capability not requested',
      });
    }
  }

  // Validate export/import entry points
  if (entryPoints.exportFormat && !manifest.capabilities.export) {
    warnings.push({
      field: 'entryPoints.exportFormat',
      message: 'Export format entry point defined but export capability not requested',
    });
  }

  if (entryPoints.importFormat && !manifest.capabilities.export) {
    warnings.push({
      field: 'entryPoints.importFormat',
      message: 'Import format entry point defined but export capability not requested',
    });
  }

  // Validate UI entry points
  if (entryPoints.ui && !manifest.capabilities.ui) {
    warnings.push({
      field: 'entryPoints.ui',
      message: 'UI entry points defined but ui capability not requested',
    });
  }
}

/**
 * Validate a plugin class
 *
 * Checks if a class implements the required plugin interface.
 *
 * @param PluginClass - Plugin class to validate
 * @returns Validation result
 */
export function validatePluginClass(PluginClass: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check if it's a class
  if (typeof PluginClass !== 'function') {
    errors.push({
      field: 'plugin',
      message: 'Plugin must be a class',
    });
    return { valid: false, errors, warnings };
  }

  // Check if it has a manifest property
  if (!PluginClass.prototype.manifest) {
    errors.push({
      field: 'manifest',
      message: 'Plugin class must have a manifest property',
    });
  }

  // Check if it extends the base Plugin class
  const hasOnLoad = typeof PluginClass.prototype.onLoad === 'function';
  const hasOnEnable = typeof PluginClass.prototype.onEnable === 'function';
  const hasOnDisable = typeof PluginClass.prototype.onDisable === 'function';
  const hasOnUnload = typeof PluginClass.prototype.onUnload === 'function';

  if (!hasOnLoad && !hasOnEnable && !hasOnDisable && !hasOnUnload) {
    warnings.push({
      field: 'lifecycle',
      message: 'Plugin has no lifecycle hooks - it won\'t be able to do anything',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Check if a string is a valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: ValidationResult): string {
  const lines: string[] = [];

  if (!result.valid) {
    lines.push('Plugin validation failed:');
    for (const error of result.errors) {
      lines.push(`  ✗ ${error.field}: ${error.message}`);
      if (error.value !== undefined) {
        lines.push(`    Value: ${JSON.stringify(error.value)}`);
      }
    }
  }

  if (result.warnings.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('Warnings:');
    for (const warning of result.warnings) {
      lines.push(`  ⚠ ${warning.field}: ${warning.message}`);
      if (warning.value !== undefined) {
        lines.push(`    Value: ${JSON.stringify(warning.value)}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Assert that a manifest is valid, throwing if not
 */
export function assertValidManifest(manifest: PluginManifest): void {
  const result = validateManifest(manifest);
  if (!result.valid) {
    throw new PluginValidationError(
      formatValidationErrors(result),
      'manifest',
      manifest
    );
  }
}

// ============================================================================
// MANIFEST BUILDER
// ============================================================================

/**
 * Helper class for building plugin manifests
 */
export class ManifestBuilder {
  private manifest: Partial<PluginManifest> = {
    capabilities: {},
    entryPoints: {},
  };

  setId(id: string): this {
    this.manifest.id = id;
    return this;
  }

  setName(name: string): this {
    this.manifest.name = name;
    return this;
  }

  setDescription(description: string): this {
    this.manifest.description = description;
    return this;
  }

  setVersion(version: string): this {
    this.manifest.version = version;
    return this;
  }

  setAuthor(author: string): this {
    this.manifest.author = author;
    return this;
  }

  setHomepage(homepage: string): this {
    this.manifest.homepage = homepage;
    return this;
  }

  setRepository(repository: string): this {
    this.manifest.repository = repository;
    return this;
  }

  setLicense(license: string): this {
    this.manifest.license = license;
    return this;
  }

  setKeywords(keywords: string[]): this {
    this.manifest.keywords = keywords;
    return this;
  }

  setCapabilities(capabilities: PluginCapabilities): this {
    this.manifest.capabilities = capabilities;
    return this;
  }

  setEntryPoints(entryPoints: PluginManifest['entryPoints']): this {
    this.manifest.entryPoints = entryPoints;
    return this;
  }

  setIcon(icon: string): this {
    this.manifest.icon = icon;
    return this;
  }

  build(): PluginManifest {
    const manifest = this.manifest as PluginManifest;

    // Validate before building
    assertValidManifest(manifest);

    return manifest;
  }
}

/**
 * Create a new manifest builder
 */
export function createManifestBuilder(): ManifestBuilder {
  return new ManifestBuilder();
}
