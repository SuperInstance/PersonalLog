/**
 * Custom Export Format Plugin
 *
 * Demonstrates how to create custom export/import formats.
 * This example creates a JSON Lines format where each conversation is a JSON object on a separate line.
 */

import { Plugin, PluginContext, PluginManifest, ExportFormat, ImportFormat } from '@/sdk';

// ============================================================================
// PLUGIN MANIFEST
// ============================================================================

const manifest: PluginManifest = {
  id: 'custom-export-format',
  name: 'JSON Lines Export',
  description: 'Export conversations as JSON Lines format (one JSON object per line)',
  version: '1.0.0',
  author: 'PersonalLog Team',
  capabilities: {
    export: true,
  },
  entryPoints: {
    plugin: 'CustomExportPlugin',
  },
};

// ============================================================================
// JSON LINES FORMAT
// ============================================================================

/**
 * Export conversations as JSON Lines format
 *
 * JSON Lines is a format where each line is a valid JSON object.
 * This is useful for streaming and large datasets.
 */
const jsonLinesExportFormat: ExportFormat = {
  id: 'jsonl',
  name: 'JSON Lines',
  extension: 'jsonl',
  mimeType: 'application/x-jsonlines',

  handler: async (data: any) => {
    try {
      let jsonl = '';

      // Handle different data types
      if (Array.isArray(data)) {
        // Array of items - each on its own line
        jsonl = data.map(item => JSON.stringify(item)).join('\n');
      } else if (data.conversations && Array.isArray(data.conversations)) {
        // Export conversations
        jsonl = data.conversations.map((conv: any) => {
          return JSON.stringify({
            id: conv.id,
            title: conv.title,
            type: conv.type,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
            messageCount: conv.messages?.length || 0,
            messages: conv.messages || [],
          });
        }).join('\n');
      } else {
        // Single object
        jsonl = JSON.stringify(data);
      }

      return {
        data: jsonl,
        filename: `export-${Date.now()}.jsonl`,
        mimeType: 'application/x-jsonlines',
      };
    } catch (error) {
      throw new Error(`Export failed: ${error}`);
    }
  },
};

/**
 * Import JSON Lines format
 */
const jsonLinesImportFormat: ImportFormat = {
  id: 'jsonl',
  name: 'JSON Lines',
  extensions: ['jsonl', 'jsonl.txt'],

  handler: async (data: any) => {
    try {
      let text = '';

      // Handle different input types
      if (typeof data === 'string') {
        text = data;
      } else if (data instanceof Blob) {
        text = await data.text();
      } else {
        text = JSON.stringify(data);
      }

      // Parse JSON Lines
      const lines = text.trim().split('\n');
      const items = [];

      for (const line of lines) {
        if (line.trim()) {
          try {
            const item = JSON.parse(line);
            items.push(item);
          } catch (error) {
            console.warn('Failed to parse line:', line);
          }
        }
      }

      return {
        data: items,
        count: items.length,
        warnings: lines.length - items.length > 0
          ? [`${lines.length - items.length} lines could not be parsed`]
          : undefined,
      };
    } catch (error) {
      throw new Error(`Import failed: ${error}`);
    }
  },
};

// ============================================================================
// PLUGIN CLASS
// ============================================================================

export class CustomExportPlugin extends Plugin {
  manifest = manifest;

  async onLoad(context: PluginContext): Promise<void> {
    this.context = context;

    context.logger.info('Custom Export Format Plugin loaded');

    // Register export format
    context.export.registerExportFormat(jsonLinesExportFormat);

    // Register import format
    context.export.registerImportFormat(jsonLinesImportFormat);

    context.logger.info('Registered JSON Lines format');

    // Register menu item for quick export
    context.ui.registerMenuItem({
      id: 'export-jsonl',
      label: 'Export as JSON Lines',
      location: 'main',
      action: 'exportAllConversations',
    });
  }

  async onEnable(context: PluginContext): Promise<void> {
    context.ui.showNotification({
      message: 'JSON Lines export format enabled! Use it from the export menu.',
      type: 'success',
      duration: 5000,
    });
  }

  async onDisable(context: PluginContext): Promise<void> {
    // Unregister formats
    try {
      context.export.unregisterExportFormat('jsonl');
      context.export.unregisterImportFormat('jsonl');
      context.logger.info('Unregistered JSON Lines format');
    } catch (error) {
      context.logger.error('Failed to unregister format:', error);
    }
  }

  async onUnload(context: PluginContext): Promise<void> {
    context.logger.info('Custom Export Format Plugin unloaded');
  }

  /**
   * Export all conversations as JSON Lines
   */
  async exportAllConversations(): Promise<void> {
    const context = this.getContext();

    try {
      // Get all conversations
      const conversations = await context.data.conversations.list({ limit: 1000 });

      context.logger.info(`Exporting ${conversations.length} conversations as JSON Lines`);

      // Export using custom format
      await context.export.exportToFile('jsonl', { conversations });

      context.ui.showNotification({
        message: `Exported ${conversations.length} conversations as JSON Lines`,
        type: 'success',
        duration: 5000,
      });
    } catch (error) {
      context.logger.error('Export failed:', error);
      context.ui.showNotification({
        message: `Export failed: ${error}`,
        type: 'error',
        duration: 5000,
      });
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default CustomExportPlugin;
