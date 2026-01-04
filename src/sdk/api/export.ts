/**
 * PersonalLog Plugin SDK - Export/Import API Implementation
 *
 * Provides custom export/import format capabilities for plugins.
 *
 * @packageDocumentation
 */

import type { ExportAPI, ExportFormat, ImportFormat, ExportResult, ImportResult } from '../types';

// ============================================================================
// EXPORT/IMPORT API IMPLEMENTATION
// ============================================================================

/**
 * Export/Import API implementation
 *
 * Provides methods for registering and using custom export/import formats.
 */
class ExportAPIImpl implements ExportAPI {
  private exportFormats: Map<string, ExportFormat> = new Map();
  private importFormats: Map<string, ImportFormat> = new Map();

  // ========================================================================
  // EXPORT FORMATS
  // ========================================================================

  registerExportFormat(format: ExportFormat): void {
    if (this.exportFormats.has(format.id)) {
      throw new Error(`Export format ${format.id} already registered`);
    }

    // Validate format
    if (!format.id || !format.name || !format.extension || !format.mimeType) {
      throw new Error('Export format must have id, name, extension, and mimeType');
    }
    if (typeof format.handler !== 'function') {
      throw new Error('Export format must have a handler function');
    }

    this.exportFormats.set(format.id, format);
    this.emitEvent('export:format:registered', { id: format.id });
  }

  unregisterExportFormat(id: string): void {
    if (!this.exportFormats.has(id)) {
      throw new Error(`Export format ${id} not found`);
    }
    this.exportFormats.delete(id);
    this.emitEvent('export:format:unregistered', { id });
  }

  getExportFormat(id: string): ExportFormat | undefined {
    return this.exportFormats.get(id);
  }

  getExportFormats(): ExportFormat[] {
    return Array.from(this.exportFormats.values());
  }

  // ========================================================================
  // IMPORT FORMATS
  // ========================================================================

  registerImportFormat(format: ImportFormat): void {
    if (this.importFormats.has(format.id)) {
      throw new Error(`Import format ${format.id} already registered`);
    }

    // Validate format
    if (!format.id || !format.name || !format.extensions || format.extensions.length === 0) {
      throw new Error('Import format must have id, name, and extensions');
    }
    if (typeof format.handler !== 'function') {
      throw new Error('Import format must have a handler function');
    }

    this.importFormats.set(format.id, format);
    this.emitEvent('import:format:registered', { id: format.id });
  }

  unregisterImportFormat(id: string): void {
    if (!this.importFormats.has(id)) {
      throw new Error(`Import format ${id} not found`);
    }
    this.importFormats.delete(id);
    this.emitEvent('import:format:unregistered', { id });
  }

  getImportFormat(id: string): ImportFormat | undefined {
    return this.importFormats.get(id);
  }

  getImportFormats(): ImportFormat[] {
    return Array.from(this.importFormats.values());
  }

  // ========================================================================
  // EXPORT
  // ========================================================================

  async export(formatId: string, data: any): Promise<ExportResult> {
    const format = this.exportFormats.get(formatId);
    if (!format) {
      throw new Error(`Export format ${formatId} not found`);
    }

    try {
      const result = await format.handler(data);

      // Validate result
      if (!result.data || !result.filename || !result.mimeType) {
        throw new Error('Export handler must return data, filename, and mimeType');
      }

      return result;
    } catch (error) {
      throw new Error(`Export failed: ${error}`);
    }
  }

  async exportToFile(formatId: string, data: any): Promise<void> {
    const result = await this.export(formatId, data);

    // Create blob and download
    const blob = new Blob([result.data], { type: result.mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ========================================================================
  // IMPORT
  // ========================================================================

  async import(formatId: string, data: any): Promise<ImportResult> {
    const format = this.importFormats.get(formatId);
    if (!format) {
      throw new Error(`Import format ${formatId} not found`);
    }

    try {
      const result = await format.handler(data);

      // Validate result
      if (!result.data || typeof result.count !== 'number') {
        throw new Error('Import handler must return data and count');
      }

      return result;
    } catch (error) {
      throw new Error(`Import failed: ${error}`);
    }
  }

  async importFromFile(formatId: string, file: File): Promise<ImportResult> {
    // Read file
    const data = await this.readFile(file);

    // Import using format handler
    return this.import(formatId, data);
  }

  async importFromFileAuto(file: File): Promise<ImportResult> {
    // Detect format from file extension
    const format = this.detectFormatFromFile(file);
    if (!format) {
      throw new Error(`No import format found for file ${file.name}`);
    }

    return this.importFromFile(format.id, file);
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  private detectFormatFromFile(file: File): ImportFormat | undefined {
    const extension = file.name.split('.').pop()?.toLowerCase();

    for (const format of this.importFormats.values()) {
      if (format.extensions.includes(extension || '')) {
        return format;
      }
    }

    return undefined;
  }

  private async readFile(file: File): Promise<any> {
    const text = await file.text();

    // Try to parse as JSON
    try {
      return JSON.parse(text);
    } catch {
      // Return as text if not JSON
      return text;
    }
  }

  // ========================================================================
  // EVENT SYSTEM
  // ========================================================================

  private emitEvent(event: string, data?: any): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('plugin-export-event', {
          detail: { event, data },
        })
      );
    }
  }

  // ========================================================================
  // CLEANUP
  // ========================================================================

  clear(): void {
    this.exportFormats.clear();
    this.importFormats.clear();
  }
}

// ============================================================================
// BUILT-IN FORMATS
// ============================================================================

/**
 * Register built-in export formats
 */
export function registerBuiltinFormats(api: ExportAPIImpl): void {
  // JSON export format
  api.registerExportFormat({
    id: 'json',
    name: 'JSON',
    extension: 'json',
    mimeType: 'application/json',
    handler: async (data) => {
      return {
        data: JSON.stringify(data, null, 2),
        filename: `export-${Date.now()}.json`,
        mimeType: 'application/json',
      };
    },
  });

  // JSON import format
  api.registerImportFormat({
    id: 'json',
    name: 'JSON',
    extensions: ['json'],
    handler: async (data) => {
      let parsed: any;
      if (typeof data === 'string') {
        parsed = JSON.parse(data);
      } else {
        parsed = data;
      }

      return {
        data: parsed,
        count: Array.isArray(parsed) ? parsed.length : 1,
      };
    },
  });

  // Markdown export format (for conversations)
  api.registerExportFormat({
    id: 'markdown',
    name: 'Markdown',
    extension: 'md',
    mimeType: 'text/markdown',
    handler: async (data) => {
      // Convert conversation to markdown
      let markdown = '';

      if (data.conversations) {
        for (const conv of data.conversations) {
          markdown += `# ${conv.title}\n\n`;
          for (const msg of conv.messages) {
            const author = msg.author === 'user' ? 'You' : msg.author;
            markdown += `## ${author}\n\n${msg.content.text || ''}\n\n`;
          }
          markdown += '---\n\n';
        }
      } else if (data.text) {
        markdown = data.text;
      } else {
        markdown = JSON.stringify(data, null, 2);
      }

      return {
        data: markdown,
        filename: `export-${Date.now()}.md`,
        mimeType: 'text/markdown',
      };
    },
  });
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new Export API instance
 *
 * @returns Export API instance
 */
export function createExportAPI(): ExportAPI {
  const api = new ExportAPIImpl();
  registerBuiltinFormats(api);
  return api;
}

export default ExportAPIImpl;
