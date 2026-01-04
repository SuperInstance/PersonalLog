/**
 * JSON Converter
 *
 * Converts PersonalLog data to/from native JSON format.
 * This is the primary format for backups and full exports.
 */

import {
  PersonalLogExport,
  ExportFormat,
  ExportScope,
  ExportOptions,
  ExportStats,
} from '../types'
import { listConversations, getMessages } from '@/lib/storage/conversation-store'
import { getVectorStore } from '@/lib/knowledge/vector-store'
import { listContacts } from '@/lib/wizard/model-store'

// ============================================================================
// JSON CONVERTER
// ============================================================================

export class JSONConverter {
  /**
   * Export data to JSON format
   */
  async exportData(options: ExportOptions): Promise<{ data: Blob; stats: ExportStats }> {
    const startTime = Date.now()
    const exportData: PersonalLogExport = {
      version: '1.0.0',
      metadata: {
        exportedAt: new Date().toISOString(),
        appVersion: '2.0.0',
        scope: options.scope,
        itemCount: 0,
      },
    }

    let stats: ExportStats = {
      conversations: 0,
      messages: 0,
      knowledgeEntries: 0,
      contacts: 0,
      totalSize: 0,
      duration: 0,
    }

    // Export based on scope
    if (options.scope === 'all' || options.scope === 'conversations') {
      const conversations = await this.exportConversations(options.dateRange)
      exportData.conversations = conversations.conversations
      stats.conversations = conversations.stats.conversations
      stats.messages = conversations.stats.messages
    }

    if (options.scope === 'all' || options.scope === 'knowledge') {
      const knowledge = await this.exportKnowledge(options.dateRange)
      exportData.knowledge = knowledge.entries
      stats.knowledgeEntries = knowledge.stats.entries
    }

    if (options.scope === 'all' || options.scope === 'contacts') {
      const contacts = await this.exportContacts()
      exportData.contacts = contacts.contacts
      stats.contacts = contacts.stats.contacts
    }

    if (options.scope === 'all' || options.scope === 'settings') {
      exportData.settings = await this.exportSettings()
    }

    // Update metadata
    exportData.metadata.itemCount =
      stats.conversations +
      stats.messages +
      stats.knowledgeEntries +
      stats.contacts

    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2)
    const encoder = new TextEncoder()
    const bytes = encoder.encode(jsonString)
    stats.totalSize = bytes.length
    stats.duration = Date.now() - startTime

    // Create blob
    const blob = new Blob([bytes], { type: 'application/json' })

    return { data: blob, stats }
  }

  /**
   * Export conversations with messages
   */
  private async exportConversations(
    dateRange?: { start: Date; end: Date }
  ): Promise<{ conversations: any[]; stats: { conversations: number; messages: number } }> {
    const conversations = await listConversations({ includeArchived: true })
    const result: any[] = []
    let messageCount = 0

    for (const conv of conversations) {
      // Apply date range filter
      if (dateRange) {
        const convDate = new Date(conv.createdAt)
        if (convDate < dateRange.start || convDate > dateRange.end) {
          continue
        }
      }

      // Get messages
      const messages = await getMessages(conv.id)
      messageCount += messages.length

      result.push({
        ...conv,
        messages,
      })
    }

    return {
      conversations: result,
      stats: { conversations: result.length, messages: messageCount },
    }
  }

  /**
   * Export knowledge entries
   */
  private async exportKnowledge(
    dateRange?: { start: Date; end: Date }
  ): Promise<{ entries: any[]; stats: { entries: number } }> {
    const store = getVectorStore()
    await store.init()

    let entries = await store.getEntries()

    // Apply date range filter
    if (dateRange) {
      entries = entries.filter(e => {
        const entryDate = new Date(e.metadata.timestamp)
        return entryDate >= dateRange.start && entryDate <= dateRange.end
      })
    }

    return {
      entries,
      stats: { entries: entries.length },
    }
  }

  /**
   * Export AI contacts
   */
  private async exportContacts(): Promise<{ contacts: any[]; stats: { contacts: number } }> {
    const contacts = await listContacts()

    return {
      contacts,
      stats: { contacts: contacts.length },
    }
  }

  /**
   * Export settings
   */
  private async exportSettings(): Promise<any> {
    // Get settings from localStorage
    const settings: any = {}

    try {
      const theme = localStorage.getItem('theme')
      if (theme) settings.theme = theme

      const fontSize = localStorage.getItem('fontSize')
      if (fontSize) settings.fontSize = fontSize

      // Add more settings as needed
    } catch (error) {
      console.warn('Error exporting settings:', error)
    }

    return settings
  }

  /**
   * Import data from JSON format
   */
  async importData(jsonData: PersonalLogExport): Promise<ImportResult> {
    const startTime = Date.now()
    const result: ImportResult = {
      conversations: 0,
      messages: 0,
      knowledgeEntries: 0,
      contacts: 0,
      errors: [],
      duration: 0,
    }

    try {
      // Validate version
      if (jsonData.version !== '1.0.0') {
        throw new Error(`Unsupported export version: ${jsonData.version}`)
      }

      // Import conversations
      if (jsonData.conversations) {
        for (const conv of jsonData.conversations) {
          try {
            // Import logic here
            result.conversations++
            result.messages += conv.messages?.length || 0
          } catch (error: any) {
            result.errors.push({
              type: 'conversation',
              id: conv.id,
              error: error.message,
            })
          }
        }
      }

      // Import knowledge entries
      if (jsonData.knowledge) {
        for (const entry of jsonData.knowledge) {
          try {
            // Import logic here
            result.knowledgeEntries++
          } catch (error: any) {
            result.errors.push({
              type: 'knowledge',
              id: entry.id,
              error: error.message,
            })
          }
        }
      }

      // Import contacts
      if (jsonData.contacts) {
        for (const contact of jsonData.contacts) {
          try {
            // Import logic here
            result.contacts++
          } catch (error: any) {
            result.errors.push({
              type: 'contact',
              id: contact.id,
              error: error.message,
            })
          }
        }
      }

      result.duration = Date.now() - startTime
      return result
    } catch (error: any) {
      throw new Error(`JSON import failed: ${error.message}`)
    }
  }

  /**
   * Validate JSON data structure
   */
  validateJSON(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check required fields
    if (!data.version) {
      errors.push('Missing version field')
    }

    if (!data.metadata) {
      errors.push('Missing metadata field')
    }

    if (!data.metadata?.exportedAt) {
      errors.push('Missing metadata.exportedAt field')
    }

    // Validate data types
    if (data.conversations && !Array.isArray(data.conversations)) {
      errors.push('conversations must be an array')
    }

    if (data.knowledge && !Array.isArray(data.knowledge)) {
      errors.push('knowledge must be an array')
    }

    if (data.contacts && !Array.isArray(data.contacts)) {
      errors.push('contacts must be an array')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

interface ImportResult {
  conversations: number
  messages: number
  knowledgeEntries: number
  contacts: number
  errors: Array<{ type: string; id: string; error: string }>
  duration: number
}
