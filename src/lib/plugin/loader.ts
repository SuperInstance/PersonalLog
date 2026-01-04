/**
 * Plugin Loader
 *
 * Handles loading, validation, and initialization of plugins.
 * Supports loading from files, URLs, or bundled code.
 *
 * @module lib/plugin/loader
 */

import type {
  PluginManifest,
  PluginId,
  PluginSourceType,
  PluginInstallResult,
  PluginValidationResult,
  ValidationError,
  ValidationWarning,
} from './types';
import { getPluginRegistry } from './registry';

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================+

/**
 * Validate plugin manifest
 */
export function validateManifest(manifest: any): PluginValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!manifest.id) {
    errors.push({
      field: 'id',
      message: 'Plugin ID is required',
      code: 'REQUIRED_FIELD',
    });
  } else if (!/^[a-z0-9]+(\.[a-z0-9]+)+$/i.test(manifest.id)) {
    errors.push({
      field: 'id',
      message: 'Plugin ID must be in format: vendor-name.plugin-name',
      code: 'INVALID_FORMAT',
    });
  }

  if (!manifest.name) {
    errors.push({
      field: 'name',
      message: 'Plugin name is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!manifest.description) {
    errors.push({
      field: 'description',
      message: 'Plugin description is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!manifest.version) {
    errors.push({
      field: 'version',
      message: 'Plugin version is required',
      code: 'REQUIRED_FIELD',
    });
  } else if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
    errors.push({
      field: 'version',
      message: 'Version must be in semver format (e.g., 1.0.0)',
      code: 'INVALID_FORMAT',
    });
  }

  if (!manifest.minAppVersion) {
    errors.push({
      field: 'minAppVersion',
      message: 'Minimum app version is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!manifest.author || !manifest.author.name) {
    errors.push({
      field: 'author.name',
      message: 'Author name is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!manifest.license) {
    warnings.push({
      field: 'license',
      message: 'License not specified',
      code: 'MISSING_LICENSE',
    });
  }

  if (!manifest.type || manifest.type.length === 0) {
    errors.push({
      field: 'type',
      message: 'At least one plugin type is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!manifest.permissions || manifest.permissions.length === 0) {
    warnings.push({
      field: 'permissions',
      message: 'Plugin requests no permissions',
      code: 'NO_PERMISSIONS',
    });
  }

  // Validate dependencies
  if (manifest.dependencies) {
    for (const dep of manifest.dependencies) {
      if (!dep.id) {
        errors.push({
          field: 'dependencies',
          message: 'Dependency must have an ID',
          code: 'INVALID_DEPENDENCY',
        });
      }
      if (!dep.version) {
        errors.push({
          field: 'dependencies',
          message: `Dependency ${dep.id} must have a version requirement`,
          code: 'INVALID_DEPENDENCY',
        });
      }
    }
  }

  // Validate resource limits
  if (manifest.resourceLimits) {
    const { maxCpuPercent, maxMemoryMB, maxStorageMB } = manifest.resourceLimits;

    if (maxCpuPercent !== undefined && (maxCpuPercent < 0 || maxCpuPercent > 100)) {
      errors.push({
        field: 'resourceLimits.maxCpuPercent',
        message: 'CPU limit must be between 0 and 100',
        code: 'INVALID_VALUE',
      });
    }

    if (maxMemoryMB !== undefined && maxMemoryMB < 0) {
      errors.push({
        field: 'resourceLimits.maxMemoryMB',
        message: 'Memory limit must be positive',
        code: 'INVALID_VALUE',
      });
    }

    if (maxStorageMB !== undefined && maxStorageMB < 0) {
      errors.push({
        field: 'resourceLimits.maxStorageMB',
        message: 'Storage limit must be positive',
        code: 'INVALID_VALUE',
      });
    }
  }

  // Check for plugin type conflicts
  if (manifest.type && manifest.type.length > 1) {
    warnings.push({
      field: 'type',
      message: 'Plugin has multiple types - ensure this is intentional',
      code: 'MULTIPLE_TYPES',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate plugin code
 */
export function validatePluginCode(code: string): PluginValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check for dangerous code patterns
  const dangerousPatterns = [
    { pattern: /eval\s*\(/, message: 'Use of eval() is dangerous', code: 'DANGEROUS_CODE' },
    {
      pattern: /new\s+Function\s*\(/,
      message: 'Use of new Function() is dangerous',
      code: 'DANGEROUS_CODE',
    },
    { pattern: /import\s+.*\s+from\s+['"]http/, message: 'External HTTP imports', code: 'EXTERNAL_IMPORT' },
  ];

  for (const { pattern, message, code } of dangerousPatterns) {
    if (pattern.test(code)) {
      errors.push({
        field: 'code',
        message,
        code,
      });
    }
  }

  // Check for code size
  const maxSize = 1024 * 1024; // 1MB
  if (code.length > maxSize) {
    errors.push({
      field: 'code',
      message: `Plugin code exceeds maximum size of ${maxSize} bytes`,
      code: 'CODE_TOO_LARGE',
    });
  }

  // Basic syntax check
  try {
    // This will throw if there's a syntax error
    new Function(code);
  } catch (error) {
    errors.push({
      field: 'code',
      message: `Syntax error: ${error instanceof Error ? error.message : String(error)}`,
      code: 'SYNTAX_ERROR',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate plugin version compatibility
 */
export function validateVersionCompatibility(
  manifest: PluginManifest,
  appVersion: string
): { compatible: boolean; reason?: string } {
  // Simple semver comparison (for now)
  const minVersion = manifest.minAppVersion;
  const maxVersion = manifest.maxAppVersion;

  // Parse versions
  const parseVersion = (v: string) => v.split('.').map(Number);

  const appParts = parseVersion(appVersion);
  const minParts = parseVersion(minVersion);

  // Check minimum version
  for (let i = 0; i < 3; i++) {
    if (appParts[i] < minParts[i]) {
      return {
        compatible: false,
        reason: `App version ${appVersion} is below minimum required ${minVersion}`,
      };
    }
    if (appParts[i] > minParts[i]) break;
  }

  // Check maximum version (if specified)
  if (maxVersion) {
    const maxParts = parseVersion(maxVersion);
    for (let i = 0; i < 3; i++) {
      if (appParts[i] > maxParts[i]) {
        return {
          compatible: false,
          reason: `App version ${appVersion} exceeds maximum supported ${maxVersion}`,
        };
      }
      if (appParts[i] < maxParts[i]) break;
    }
  }

  return { compatible: true };
}

// ============================================================================
// PLUGIN LOADER CLASS
// ============================================================================

export class PluginLoader {
  private registry = getPluginRegistry();

  /**
   * Load plugin from manifest and code
   */
  async loadPlugin(
    manifest: PluginManifest,
    code: string,
    source: PluginSourceType = 'builtin' as PluginSourceType
  ): Promise<PluginInstallResult> {
    try {
      // Validate manifest
      const manifestValidation = validateManifest(manifest);
      if (!manifestValidation.valid) {
        return {
          success: false,
          error: `Invalid manifest: ${manifestValidation.errors.map((e) => e.message).join(', ')}`,
        };
      }

      // Validate code
      const codeValidation = validatePluginCode(code);
      if (!codeValidation.valid) {
        return {
          success: false,
          error: `Invalid code: ${codeValidation.errors.map((e) => e.message).join(', ')}`,
        };
      }

      // Check if plugin already exists
      const existing = await this.registry.getManifest(manifest.id);
      if (existing) {
        return {
          success: false,
          error: `Plugin already installed: ${manifest.id}`,
        };
      }

      // Check dependencies
      if (manifest.dependencies) {
        for (const dep of manifest.dependencies) {
          const depManifest = await this.registry.getManifest(dep.id);
          if (!depManifest && dep.required) {
            return {
              success: false,
              error: `Required dependency not found: ${dep.id}`,
            };
          }
        }
      }

      // Register manifest
      await this.registry.registerManifest(manifest);

      // Create runtime state
      await this.registry.createRuntimeState(manifest.id, source);

      // Store plugin code (in a real implementation, this would be in IndexedDB)
      await this.storePluginCode(manifest.id, code);

      return {
        success: true,
        pluginId: manifest.id,
        warnings: [
          ...manifestValidation.warnings.map((w) => w.message),
          ...codeValidation.warnings.map((w) => w.message),
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Load plugin from file
   */
  async loadFromFile(file: File): Promise<PluginInstallResult> {
    try {
      // Read file
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate structure
      if (!data.manifest || !data.code) {
        return {
          success: false,
          error: 'Invalid plugin file: missing manifest or code',
        };
      }

      return this.loadPlugin(data.manifest, data.code, 'file' as PluginSourceType);
    } catch (error) {
      return {
        success: false,
        error: `Failed to load plugin file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Load plugin from URL
   */
  async loadFromURL(url: string): Promise<PluginInstallResult> {
    try {
      // Fetch plugin
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Validate structure
      if (!data.manifest || !data.code) {
        return {
          success: false,
          error: 'Invalid plugin data: missing manifest or code',
        };
      }

      return this.loadPlugin(data.manifest, data.code, 'url' as PluginSourceType);
    } catch (error) {
      return {
        success: false,
        error: `Failed to load plugin from URL: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Load plugin from bundle (multiple plugins)
   */
  async loadFromBundle(data: {
    plugins: Array<{ manifest: PluginManifest; code: string }>;
  }): Promise<PluginInstallResult[]> {
    const results: PluginInstallResult[] = [];

    for (const plugin of data.plugins) {
      const result = await this.loadPlugin(plugin.manifest, plugin.code);
      results.push(result);
    }

    return results;
  }

  /**
   * Get plugin code
   */
  async getPluginCode(pluginId: PluginId): Promise<string | null> {
    return this.retrievePluginCode(pluginId);
  }

  /**
   * Store plugin code
   */
  private async storePluginCode(pluginId: PluginId, code: string): Promise<void> {
    // Store in IndexedDB (using a separate store for code)
    // For now, we'll use IndexedDB through the registry
    const db = (this.registry as any).db;
    if (!db) {
      throw new Error('Registry not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['plugin-code'], 'readwrite');
      let store: IDBObjectStore;

      if (!db.objectStoreNames.contains('plugin-code')) {
        store = transaction.db.createObjectStore('plugin-code', { keyPath: 'pluginId' });
      } else {
        store = transaction.objectStore('plugin-code');
      }

      const request = store.put({ pluginId, code });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieve plugin code
   */
  private async retrievePluginCode(pluginId: PluginId): Promise<string | null> {
    const db = (this.registry as any).db;
    if (!db) {
      throw new Error('Registry not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['plugin-code'], 'readonly');
      const store = transaction.objectStore('plugin-code');
      const request = store.get(pluginId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.code || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete plugin code
   */
  async deletePluginCode(pluginId: PluginId): Promise<void> {
    const db = (this.registry as any).db;
    if (!db) {
      throw new Error('Registry not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['plugin-code'], 'readwrite');
      const store = transaction.objectStore('plugin-code');
      const request = store.delete(pluginId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Unload plugin
   */
  async unloadPlugin(pluginId: PluginId): Promise<void> {
    // Delete code
    await this.deletePluginCode(pluginId);

    // Delete manifest and state
    await this.registry.deleteManifest(pluginId);
    await this.registry.deleteRuntimeState(pluginId);
    await this.registry.deletePluginSettings(pluginId);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let pluginLoaderInstance: PluginLoader | null = null;

/**
 * Get plugin loader instance
 */
export function getPluginLoader(): PluginLoader {
  if (!pluginLoaderInstance) {
    pluginLoaderInstance = new PluginLoader();
  }
  return pluginLoaderInstance;
}

/**
 * Initialize plugin loader
 */
export async function initializePluginLoader(): Promise<PluginLoader> {
  const loader = getPluginLoader();
  // Ensure registry is initialized
  await loader['registry'].initialize();
  return loader;
}
