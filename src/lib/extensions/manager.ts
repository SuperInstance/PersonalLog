/**
 * Extension Manager
 *
 * Manages extension lifecycle, execution, and coordination.
 * Provides high-level API for working with extensions.
 *
 * @module lib/extensions/manager
 */

import type {
  Extension,
  ExtensionId,
  ExtensionPoint,
  ExtensionExecutionContext,
  ExtensionExecutionResult,
  ExtensionRegistryEntry,
  Message,
  CommandContext,
  CommandResult,
} from './types';
import { getExtensionRegistry } from './registry';

// ============================================================================
// EXTENSION MANAGER CLASS
// ============================================================================

export class ExtensionManager {
  private registry = getExtensionRegistry();
  private executionQueue: Map<ExtensionPoint, Array<() => void>> = new Map();

  // ========================================================================
  // REGISTRATION
  // ========================================================================

  /**
   * Register an extension
   */
  register(
    extension: Extension,
    options?: {
      autoActivate?: boolean;
      priority?: number;
      dependencies?: ExtensionId[];
    }
  ): void {
    const entry = this.registry.register(extension, options || {});

    // Auto-activate if enabled
    if (options?.autoActivate !== false && entry.runtime.enabled) {
      this.activate(extension.id);
    }
  }

  /**
   * Unregister an extension
   */
  unregister(extensionId: ExtensionId): void {
    this.registry.unregister(extensionId);
  }

  /**
   * Unregister all extensions from a plugin
   */
  unregisterByPlugin(pluginId: string): void {
    this.registry.unregisterByPlugin(pluginId);
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  /**
   * Activate an extension
   */
  activate(extensionId: ExtensionId): boolean {
    try {
      return this.registry.activate(extensionId);
    } catch (error) {
      console.error(`Failed to activate extension ${extensionId}:`, error);
      return false;
    }
  }

  /**
   * Deactivate an extension
   */
  deactivate(extensionId: ExtensionId): boolean {
    return this.registry.deactivate(extensionId);
  }

  /**
   * Enable an extension
   */
  enable(extensionId: ExtensionId): boolean {
    return this.registry.enable(extensionId);
  }

  /**
   * Disable an extension
   */
  disable(extensionId: ExtensionId): boolean {
    return this.registry.disable(extensionId);
  }

  // ========================================================================
  // EXECUTION
  // ========================================================================

  /**
   * Execute extensions for a point
   */
  async execute(
    point: ExtensionPoint,
    data: any,
    options?: {
      stopOnError?: boolean;
      returnEarly?: boolean;
      timeout?: number;
    }
  ): Promise<ExtensionExecutionResult[]> {
    const extensions = this.registry.getActive(point);

    if (extensions.length === 0) {
      return [];
    }

    const results: ExtensionExecutionResult[] = [];

    for (const entry of extensions) {
      const startTime = Date.now();
      let success = true;
      let result: any;
      let error: string | undefined;

      try {
        // Execute extension based on point type
        result = await this.executeExtension(entry, data);

        // Record execution
        const executionTime = Date.now() - startTime;
        this.registry.recordExecution(entry.extension.id, executionTime, true);

        // Add result
        results.push({
          extensionId: entry.extension.id,
          success: true,
          data: result,
          executionTime,
        });

        // Return early if requested and result is not null
        if (options?.returnEarly && result !== null && result !== undefined) {
          return results;
        }
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : String(err);

        // Record execution failure
        const executionTime = Date.now() - startTime;
        this.registry.recordExecution(entry.extension.id, executionTime, false, error);

        // Add error result
        results.push({
          extensionId: entry.extension.id,
          success: false,
          executionTime,
          error,
        });

        // Stop on error if requested
        if (options?.stopOnError) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Execute a specific extension
   */
  private async executeExtension(
    entry: ExtensionRegistryEntry,
    data: any
  ): Promise<any> {
    const ext = entry.extension;

    switch (ext.point) {
      case 'command':
        return await this.executeCommand(ext as any, data);

      case 'message.middleware':
        return await this.executeMessageMiddleware(ext as any, data);

      case 'message.filter':
        return await this.executeMessageFilter(ext as any, data);

      case 'message.enricher':
        return await this.executeMessageEnricher(ext as any, data);

      case 'data.export.format':
        return await this.executeExport(ext as any, data);

      case 'data.import.source':
        return await this.executeImport(ext as any, data);

      case 'data.transformer':
        return await this.executeTransform(ext as any, data);

      case 'data.validator':
        return await this.executeValidate(ext as any, data);

      case 'ai.provider':
        return await this.executeAIProvider(ext as any, data);

      default:
        return null;
    }
  }

  /**
   * Execute command extension
   */
  private async executeCommand(
    ext: any,
    context: CommandContext
  ): Promise<CommandResult> {
    return await ext.handler(context);
  }

  /**
   * Execute message middleware
   */
  private async executeMessageMiddleware(ext: any, data: any): Promise<Message | null> {
    const { message, context } = data;
    return await ext.middleware(message, context);
  }

  /**
   * Execute message filter
   */
  private async executeMessageFilter(ext: any, data: any): Promise<boolean> {
    const { message, context } = data;
    return await ext.filter(message, context);
  }

  /**
   * Execute message enricher
   */
  private async executeMessageEnricher(ext: any, data: any): Promise<any> {
    const { message, context } = data;
    return await ext.enricher(message, context);
  }

  /**
   * Execute export format
   */
  private async executeExport(ext: any, data: any): Promise<any> {
    return await ext.export(data);
  }

  /**
   * Execute import source
   */
  private async executeImport(ext: any, data: any): Promise<any> {
    return await ext.import(data);
  }

  /**
   * Execute data transformer
   */
  private async executeTransform(ext: any, data: any): Promise<any> {
    return await ext.transform(data);
  }

  /**
   * Execute data validator
   */
  private async executeValidate(ext: any, data: any): Promise<any> {
    return await ext.validate(data);
  }

  /**
   * Execute AI provider
   */
  private async executeAIProvider(ext: any, data: any): Promise<any> {
    return await ext.generate(data);
  }

  // ========================================================================
  // SPECIFIC EXTENSION POINT HELPERS
  // ========================================================================

  /**
   * Execute message middleware pipeline
   */
  async processMessage(message: Message, context: any): Promise<Message> {
    const results = await this.execute('message.middleware', { message, context });

    // Apply transformations in order
    let processedMessage = message;
    for (const result of results) {
      if (result.success && result.data) {
        processedMessage = result.data;
      }
    }

    return processedMessage;
  }

  /**
   * Filter messages using filter extensions
   */
  async filterMessage(message: Message, context: any): Promise<boolean> {
    const results = await this.execute('message.filter', { message, context });

    // All filters must pass (return true)
    return results.every((r) => r.success !== false && r.data !== false);
  }

  /**
   * Enrich message metadata using enricher extensions
   */
  async enrichMessage(message: Message, context: any): Promise<Record<string, any>> {
    const results = await this.execute('message.enricher', { message, context });

    // Merge all metadata
    const metadata: Record<string, any> = { ...message.metadata };
    for (const result of results) {
      if (result.success && result.data) {
        Object.assign(metadata, result.data);
      }
    }

    return metadata;
  }

  /**
   * Execute command by ID
   */
  async executeCommandById(
    commandId: string,
    context: CommandContext
  ): Promise<CommandResult> {
    const entry = this.registry.get(commandId as ExtensionId);

    if (!entry || entry.extension.point !== 'command') {
      return {
        success: false,
        error: `Command not found: ${commandId}`,
      };
    }

    if (entry.runtime.state !== 'active') {
      return {
        success: false,
        error: `Command not active: ${commandId}`,
      };
    }

    const startTime = Date.now();
    try {
      const result = await (entry.extension as any).handler(context);

      const executionTime = Date.now() - startTime;
      this.registry.recordExecution(commandId as ExtensionId, executionTime, true);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.registry.recordExecution(
        commandId as ExtensionId,
        executionTime,
        false,
        errorMessage
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get export formats
   */
  getExportFormats(): Array<{ id: string; name: string; extension: string }> {
    const extensions = this.registry.getActive('data.export.format');
    return extensions.map((e) => ({
      id: e.extension.id,
      name: (e.extension as any).name,
      extension: (e.extension as any).extension,
    }));
  }

  /**
   * Get import sources
   */
  getImportSources(): Array<{ id: string; name: string; formats: string[] }> {
    const extensions = this.registry.getActive('data.import.source');
    return extensions.map((e) => ({
      id: e.extension.id,
      name: (e.extension as any).name,
      formats: (e.extension as any).formats,
    }));
  }

  /**
   * Get AI providers
   */
  getAIProviders(): Array<{ id: string; name: string; type: string; models: string[] }> {
    const extensions = this.registry.getActive('ai.provider');
    return extensions.map((e) => ({
      id: e.extension.id,
      name: (e.extension as any).name,
      type: (e.extension as any).type,
      models: (e.extension as any).models,
    }));
  }

  /**
   * Get commands
   */
  getCommands(): Array<{
    id: string;
    title: string;
    description: string;
    icon?: string;
    keybinding?: string;
    category?: string;
  }> {
    const extensions = this.registry.getActive('command');
    return extensions.map((e) => ({
      id: e.extension.id,
      title: (e.extension as any).title,
      description: (e.extension as any).description,
      icon: (e.extension as any).icon,
      keybinding: (e.extension as any).keybinding,
      category: (e.extension as any).category,
    }));
  }

  /**
   * Get UI extensions for a specific point
   */
  getUIExtensions(point: string): Extension[] {
    const extensions = this.registry.getActive(point as ExtensionPoint);
    return extensions.map((e) => e.extension);
  }

  // ========================================================================
  // QUERIES
  // ========================================================================

  /**
   * Get extension by ID
   */
  get(extensionId: ExtensionId): ExtensionRegistryEntry | undefined {
    return this.registry.get(extensionId);
  }

  /**
   * Check if extension exists
   */
  has(extensionId: ExtensionId): boolean {
    return this.registry.has(extensionId);
  }

  /**
   * Get all extensions
   */
  getAll(): ExtensionRegistryEntry[] {
    return this.registry.getAll();
  }

  /**
   * Get extensions by point
   */
  getByPoint(point: ExtensionPoint): ExtensionRegistryEntry[] {
    return this.registry.getByPoint(point);
  }

  /**
   * Get extensions by plugin
   */
  getByPlugin(pluginId: string): ExtensionRegistryEntry[] {
    return this.registry.getByPlugin(pluginId);
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return this.registry.getStats();
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Clear all extensions
   */
  clear(): void {
    this.registry.clear();
  }

  /**
   * Reset manager state
   */
  reset(): void {
    this.clear();
    this.executionQueue.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let managerInstance: ExtensionManager | null = null;

/**
 * Get extension manager instance
 */
export function getExtensionManager(): ExtensionManager {
  if (!managerInstance) {
    managerInstance = new ExtensionManager();
  }
  return managerInstance;
}

/**
 * Reset extension manager (mainly for testing)
 */
export function resetExtensionManager(): void {
  managerInstance = null;
}
