/**
 * JSON Converter
 *
 * Converts data to/from native JSON format.
 * This is the primary format for backups and full exports.
 */

import {
  NativeExport,
  ExportOptions,
  ExportStats,
  DataProvider,
} from '../types'

// ============================================================================
// JSON CONVERTER
// ============================================================================

export class JSONConverter {
  /**
   * Export data to JSON format
   */
  async exportData(options: ExportOptions): Promise<{ data: Blob; stats: ExportStats }> {
    const startTime = Date.now()
    const exportData: NativeExport = {
      version: '1.0.0',
      metadata: {
        exportedAt: new Date().toISOString(),
        appVersion: '1.0.0',
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

    const provider = options.dataProvider

    // Export based on scope
    if (options.scope === 'all' || options.scope === 'conversations') {
      if (provider?.getConversations) {
        const conversations = await this.exportConversations(provider, options.dateRange)
        exportData.conversations = conversations.conversations
        stats.conversations = conversations.stats.conversations
        stats.messages = conversations.stats.messages
      }
    }

    if (options.scope === 'all' || options.scope === 'knowledge') {
      if (provider?.getKnowledge) {
        const knowledge = await this.exportKnowledge(provider, options.dateRange)
        exportData.knowledge = knowledge.entries
        stats.knowledgeEntries = knowledge.stats.entries
      }
    }

    if (options.scope === 'all' || options.scope === 'contacts') {
      if (provider?.getContacts) {
        const contacts = await this.exportContacts(provider)
        exportData.contacts = contacts.contacts
        stats.contacts = contacts.stats.contacts
      }
    }

    if (options.scope === 'all' || options.scope === 'settings') {
      if (provider?.getSettings) {
        exportData.settings = await provider.getSettings()
      }
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
    provider: DataProvider,
    dateRange?: { start: Date; end: Date }
  ): Promise<{ conversations: any[]; stats: { conversations: number; messages: number } }> {
    const conversations = provider.getConversations ? await provider.getConversations() : []
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
      const messages = provider.getMessages ? await provider.getMessages(conv.id) : conv.messages || []
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
    provider: DataProvider,
    dateRange?: { start: Date; end: Date }
  ): Promise<{ entries: any[]; stats: { entries: number } }> {
    let entries = provider.getKnowledge ? await provider.getKnowledge() : []

    // Apply date range filter
    if (dateRange && entries.length > 0) {
      entries = entries.filter((e: any) => {
        const entryDate = new Date(e.timestamp || e.createdAt)
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
  private async exportContacts(
    provider: DataProvider
  ): Promise<{ contacts: any[]; stats: { contacts: number } }> {
    const contacts = provider.getContacts ? await provider.getContacts() : []

    return {
      contacts,
      stats: { contacts: contacts.length },
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
