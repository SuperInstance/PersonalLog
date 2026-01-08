/**
 * Import Manager
 *
 * Main import orchestrator that supports multiple sources and formats.
 * Provides preview, validation, and conflict resolution.
 */

import {
  ImportSourceType,
  ImportOptions,
  ImportPreview,
  ImportItem,
  ImportConflict,
  ImportResult,
  ConflictResolution,
  ImportWarning,
  ImportError,
  ValidationResult,
} from './types'
import { ChatGPTParser } from './parsers/chatgpt'
import { ClaudeParser } from './parsers/claude'
import { CSVParser } from './parsers/csv'
import { ImportValidator } from './validation'
import { ConflictResolver, ConflictDataProvider } from './conflict'

// ============================================================================
// IMPORT DATA PROVIDER INTERFACE
// ============================================================================

export interface ImportDataProvider extends ConflictDataProvider {
  /** Create a new conversation/item */
  createItem(data: any): Promise<any>
  /** Add messages to an item */
  addMessages(itemId: string, messages: any[]): Promise<void>
}

// ============================================================================
// IMPORT MANAGER
// ============================================================================

export class ImportManager {
  private chatgptParser: ChatGPTParser
  private claudeParser: ClaudeParser
  private csvParser: CSVParser
  private validator: ImportValidator
  private conflictResolver: ConflictResolver
  private dataProvider?: ImportDataProvider

  // Store for previews
  private previews: Map<string, ImportPreview> = new Map()

  constructor(dataProvider?: ImportDataProvider) {
    this.chatgptParser = new ChatGPTParser()
    this.claudeParser = new ClaudeParser()
    this.csvParser = new CSVParser()
    this.validator = new ImportValidator()
    this.conflictResolver = new ConflictResolver(dataProvider)
    this.dataProvider = dataProvider
  }

  /**
   * Import from file
   */
  async importFile(
    file: File,
    options: Partial<ImportOptions> = {}
  ): Promise<ImportPreview> {
    const content = await file.text()

    // Detect source type
    const sourceType = this.detectSourceType(content, file.name)

    // Parse content
    const data = await this.parseContent(content, sourceType)

    // Create preview
    const preview = await this.createPreview(file, sourceType, data, options)

    // Store preview
    this.previews.set(preview.id, preview)

    return preview
  }

  /**
   * Import from ChatGPT export
   */
  async importFromChatGPT(file: File): Promise<ImportPreview> {
    const content = await file.text()
    const data = await this.chatgptParser.parse(content)

    return this.createPreview(
      file,
      'chatgpt',
      data,
      {
        conflictResolution: 'rename',
        validate: true,
        preview: true,
        mode: 'merge',
        skipDuplicates: false,
        preserveIds: false,
        mapContacts: true,
        createBackup: true,
      }
    )
  }

  /**
   * Import from Claude export
   */
  async importFromClaude(file: File): Promise<ImportPreview> {
    const content = await file.text()
    const data = await this.claudeParser.parse(content)

    return this.createPreview(
      file,
      'claude',
      data,
      {
        conflictResolution: 'rename',
        validate: true,
        preview: true,
        mode: 'merge',
        skipDuplicates: false,
        preserveIds: false,
        mapContacts: true,
        createBackup: true,
      }
    )
  }

  /**
   * Import from JSON
   */
  async importFromJSON(jsonData: any): Promise<ImportPreview> {
    // Validate JSON structure
    if (jsonData.version && jsonData.metadata) {
      // Native format
      const data = jsonData.conversations || []

      return this.createPreview(
        new File([], 'import.json'),
        'application',
        data,
        {
          conflictResolution: 'ask',
          validate: true,
          preview: true,
          mode: 'merge',
          skipDuplicates: false,
          preserveIds: true,
          mapContacts: false,
          createBackup: true,
        }
      )
    } else {
      // Generic JSON array
      const data = Array.isArray(jsonData) ? jsonData : [jsonData]
      return this.createPreview(
        new File([], 'import.json'),
        'json',
        data,
        {
          conflictResolution: 'ask',
          validate: true,
          preview: true,
          mode: 'merge',
          skipDuplicates: false,
          preserveIds: false,
          mapContacts: false,
          createBackup: true,
        }
      )
    }
  }

  /**
   * Import from CSV
   */
  async importFromCSV(file: File): Promise<ImportPreview> {
    const content = await file.text()
    const delimiter = CSVParser.detectDelimiter(content)
    const rows = await this.csvParser.parse(content, { delimiter })

    // Convert CSV rows to conversations
    const conversations = this.convertCSVToConversations(rows)

    return this.createPreview(
      file,
      'csv',
      conversations,
      {
        conflictResolution: 'skip',
        validate: true,
        preview: true,
        mode: 'full',
        skipDuplicates: true,
        preserveIds: false,
        mapContacts: false,
        createBackup: false,
      }
    )
  }

  /**
   * Preview import before confirming
   */
  async previewImport(file: File): Promise<ImportPreview> {
    return this.importFile(file)
  }

  /**
   * Confirm and execute import
   */
  async confirmImport(
    previewId: string,
    conflictResolutions?: Map<string, ConflictResolution>
  ): Promise<ImportResult> {
    const startTime = Date.now()

    // Get preview
    const preview = this.previews.get(previewId)
    if (!preview) {
      throw new Error(`Preview not found: ${previewId}`)
    }

    const result: ImportResult = {
      success: false,
      imported: [],
      skipped: [],
      conflictsResolved: [],
      warnings: preview.warnings,
      errors: preview.errors,
      stats: {
        total: preview.items.length,
        imported: 0,
        skipped: 0,
        conflicts: preview.conflicts.length,
        conversations: 0,
        messages: 0,
        knowledgeEntries: 0,
        contacts: 0,
        storageUsed: 0,
      },
      importedAt: new Date().toISOString(),
      duration: 0,
    }

    try {
      // Resolve conflicts
      const resolvedItems = await this.resolveConflicts(
        preview,
        conflictResolutions
      )

      // Import items
      for (const item of preview.items) {
        if (!item.selected) {
          result.skipped.push({
            type: item.type,
            sourceId: item.sourceId,
            reason: 'Not selected',
          })
          continue
        }

        const resolved = resolvedItems.get(item.sourceId)
        if (!resolved) {
          result.skipped.push({
            type: item.type,
            sourceId: item.sourceId,
            reason: 'Conflict resolution: skip',
          })
          continue
        }

        try {
          await this.importItem(resolved)
          result.imported.push({
            type: item.type,
            sourceId: item.sourceId,
            targetId: resolved.id || item.sourceId,
            title: item.title,
          })

          result.stats.imported++

          if (item.type === 'conversation') {
            result.stats.conversations++
            result.stats.messages += item.data.messages?.length || 0
          }
        } catch (error: any) {
          result.errors.push({
            code: 'IMPORT_ERROR',
            message: error.message,
            itemIds: [item.sourceId],
            blocking: false,
          })
        }
      }

      result.success = result.errors.filter(e => e.blocking).length === 0
      result.duration = Date.now() - startTime

      return result
    } catch (error: any) {
      result.success = false
      result.errors.push({
        code: 'IMPORT_FAILED',
        message: error.message,
        itemIds: [],
        blocking: true,
      })
      result.duration = Date.now() - startTime

      return result
    }
  }

  /**
   * Validate imported data
   */
  async validateData(data: any): Promise<ValidationResult> {
    return this.validator.validate(data)
  }

  /**
   * Resolve import conflict
   */
  async resolveConflict(conflict: ImportConflict): Promise<void> {
    const resolved = await this.conflictResolver.resolveConflict(
      conflict,
      conflict.resolution || conflict.suggestedResolution
    )

    if (resolved && resolved !== conflict) {
      // Apply resolution
      await this.applyResolution(conflict, resolved)
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Detect source type from content
   */
  private detectSourceType(content: string, _filename: string): ImportSourceType {
    // Try ChatGPT format
    if (ChatGPTParser.detectFormat(content)) {
      return 'chatgpt'
    }

    // Try Claude format
    if (ClaudeParser.detectFormat(content)) {
      return 'claude'
    }

    // Try CSV format
    if (CSVParser.detectFormat(content)) {
      return 'csv'
    }

    // Try JSON format
    try {
      const data = JSON.parse(content)
      if (data.version && data.metadata) {
        return 'application'
      }
    } catch {
      // Not JSON
    }

    // Default to generic JSON
    return 'json'
  }

  /**
   * Parse content based on source type
   */
  private async parseContent(content: string, sourceType: ImportSourceType): Promise<any[]> {
    switch (sourceType) {
      case 'chatgpt':
        return this.chatgptParser.parse(content)

      case 'claude':
        return this.claudeParser.parse(content)

      case 'csv':
        return this.csvParser.parse(content)

      case 'json':
      case 'application':
        const data = JSON.parse(content)
        return data.conversations || Array.isArray(data) ? data : [data]

      default:
        throw new Error(`Unsupported source type: ${sourceType}`)
    }
  }

  /**
   * Create import preview
   */
  private async createPreview(
    file: File,
    sourceType: ImportSourceType,
    data: any[],
    _options: Partial<ImportOptions>
  ): Promise<ImportPreview> {
    const previewId = generatePreviewId()

    // Convert data to import items
    const items: ImportItem[] = data.map((item, index) => ({
      type: 'conversation',
      sourceId: item.id || `import_${index}`,
      targetId: undefined,
      title: item.title || 'Untitled',
      data: item,
      selected: true,
      hasConflicts: false,
      size: JSON.stringify(item).length,
    }))

    // Validate data
    const validation = await this.validateData(data)

    // Detect conflicts
    const conflicts = await this.conflictResolver.detectConflicts(items)

    // Mark items with conflicts
    for (const conflict of conflicts) {
      const item = items.find(i => i.sourceId === conflict.item.sourceId)
      if (item) {
        item.hasConflicts = true
      }
    }

    // Generate warnings
    const warnings: ImportWarning[] = []

    if (!validation.valid) {
      warnings.push({
        code: 'VALIDATION_WARNINGS',
        message: 'Data validation found issues',
        itemIds: items.map(i => i.sourceId),
        severity: 'medium',
      })
    }

    if (conflicts.length > 0) {
      warnings.push({
        code: 'CONFLICTS_DETECTED',
        message: `${conflicts.length} conflict(s) detected`,
        itemIds: conflicts.map(c => c.item.sourceId),
        severity: 'high',
      })
    }

    // Generate errors
    const errors: ImportError[] = []

    if (validation.security.issues.filter(i => i.severity === 'high').length > 0) {
      errors.push({
        code: 'SECURITY_ISSUES',
        message: 'High-risk security issues detected',
        itemIds: validation.security.issues.filter(i => i.severity === 'high').map(i => i.itemIds[0]),
        blocking: true,
      })
    }

    // Calculate estimated size
    const estimatedSize = items.reduce((sum, item) => sum + item.size, 0)

    return {
      id: previewId,
      sourceType,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
      },
      items,
      conflicts,
      warnings,
      errors,
      estimatedSize,
      canImport: errors.filter(e => e.blocking).length === 0,
      validation,
      generatedAt: new Date().toISOString(),
    }
  }

  /**
   * Resolve all conflicts for a preview
   */
  private async resolveConflicts(
    preview: ImportPreview,
    conflictResolutions?: Map<string, ConflictResolution>
  ): Promise<Map<string, any>> {
    const resolved = new Map<string, any>()

    for (const item of preview.items) {
      // Get conflict for this item
      const conflict = preview.conflicts.find(c => c.item.sourceId === item.sourceId)

      if (!conflict) {
        // No conflict, use original data
        resolved.set(item.sourceId, item.data)
        continue
      }

      // Get resolution strategy
      const resolution = conflictResolutions?.get(item.sourceId) ||
                        conflict.resolution ||
                        conflict.suggestedResolution

      // Apply resolution
      const resolvedData = await this.conflictResolver.resolveConflict(conflict, resolution)
      resolved.set(item.sourceId, resolvedData)
    }

    return resolved
  }

  /**
   * Import a single item
   */
  private async importItem(data: any): Promise<void> {
    if (!this.dataProvider) {
      throw new Error('No data provider configured. Cannot import items.')
    }

    // Create conversation/item
    const item = await this.dataProvider.createItem(data)

    // Import messages
    if (data.messages && Array.isArray(data.messages)) {
      await this.dataProvider.addMessages(item.id, data.messages)
    }
  }

  /**
   * Apply conflict resolution
   */
  private async applyResolution(_conflict: ImportConflict, _resolved: any): Promise<void> {
    // Implementation depends on resolution type
    // For now, this is a placeholder
  }

  /**
   * Convert CSV rows to conversations
   */
  private convertCSVToConversations(rows: any[]): any[] {
    // Simple conversion - group by conversation
    const conversationsMap = new Map<string, any>()

    for (const row of rows) {
      const convId = row.Conversation || 'import'
      const title = row.Title || 'Imported Conversation'

      if (!conversationsMap.has(convId)) {
        conversationsMap.set(convId, {
          id: convId,
          title,
          type: 'personal',
          messages: [],
        })
      }

      const conv = conversationsMap.get(convId)

      if (row.Message || row.Content) {
        conv.messages.push({
          id: generatePreviewId(),
          conversationId: convId,
          type: 'text',
          author: row.Author === 'You' ? 'user' : {
            type: 'ai-contact',
            contactId: 'csv-import',
            contactName: row.Author || 'AI',
          },
          content: { text: row.Message || row.Content },
          timestamp: row.Date || new Date().toISOString(),
        })
      }
    }

    return Array.from(conversationsMap.values())
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generatePreviewId(): string {
  return `preview_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// ============================================================================
// SINGLETON
// ============================================================================

let importManager: ImportManager | null = null

/**
 * Get the import manager singleton
 */
export function getImportManager(): ImportManager {
  if (!importManager) {
    importManager = new ImportManager()
  }
  return importManager
}
