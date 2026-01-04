/**
 * YAML Converter
 *
 * Converts PersonalLog data to YAML format.
 * Ideal for configuration files and version control.
 */

import { ExportOptions, ExportStats, YAMLExportOptions } from '../types'

export type { YAMLExportOptions }
import { listConversations, getMessages } from '@/lib/storage/conversation-store'

export class YAMLConverter {
  private defaultOptions: YAMLExportOptions = {
    indent: 2,
    sortKeys: false,
    flowStyle: false,
  }

  /**
   * Export data to YAML format
   */
  async exportData(
    options: ExportOptions,
    yamlOptions: Partial<YAMLExportOptions> = {}
  ): Promise<{ data: Blob; stats: ExportStats }> {
    const startTime = Date.now()
    const finalOptions = { ...this.defaultOptions, ...yamlOptions }

    let yaml = ''
    let stats: ExportStats = {
      conversations: 0,
      messages: 0,
      knowledgeEntries: 0,
      contacts: 0,
      totalSize: 0,
      duration: 0,
    }

    // Add header
    yaml += `# PersonalLog Export\n`
    yaml += `# Exported: ${new Date().toISOString()}\n`
    yaml += `# Scope: ${options.scope}\n\n`

    // Export metadata
    yaml += `metadata:\n`
    yaml += `  version: "1.0.0"\n`
    yaml += `  exportedAt: ${new Date().toISOString()}\n`
    yaml += `  scope: ${options.scope}\n\n`

    // Export based on scope
    if (options.scope === 'all' || options.scope === 'conversations') {
      const { content, stats: convStats } = await this.exportConversations(
        options.dateRange,
        finalOptions
      )
      yaml += content
      stats.conversations = stats.conversations
      stats.messages = stats.messages
    }

    // Create blob
    const encoder = new TextEncoder()
    const bytes = encoder.encode(yaml)
    stats.totalSize = bytes.length
    stats.duration = Date.now() - startTime

    const blob = new Blob([bytes], { type: 'text/yaml' })

    return { data: blob, stats }
  }

  /**
   * Export conversations to YAML
   */
  private async exportConversations(
    dateRange: { start: Date; end: Date } | undefined,
    options: YAMLExportOptions
  ): Promise<{ content: string; stats: { conversations: number; messages: number } }> {
    const conversations = await listConversations({ includeArchived: true })
    let yaml = 'conversations:\n'
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

      yaml += `  - id: ${conv.id}\n`
      yaml += `    title: ${this.quoteString(conv.title)}\n`
      yaml += `    type: ${conv.type}\n`
      yaml += `    createdAt: ${conv.createdAt}\n`
      yaml += `    updatedAt: ${conv.updatedAt}\n`
      yaml += `    messageCount: ${messages.length}\n`

      if (messages.length > 0) {
        yaml += `    messages:\n`

        for (const msg of messages.slice(0, 10)) {
          // Limit to first 10 messages for YAML
          yaml += `      - id: ${msg.id}\n`
          yaml += `        author: ${JSON.stringify(msg.author)}\n`
          yaml += `        timestamp: ${msg.timestamp}\n`

          if (msg.content.text) {
            const text = msg.content.text.slice(0, 200) // Truncate long text
            yaml += `        content: ${this.quoteString(text)}\n`
          }

          if (msg.content.media) {
            yaml += `        media: ${msg.content.media.name}\n`
          }
        }

        if (messages.length > 10) {
          yaml += `      # ... ${messages.length - 10} more messages\n`
        }
      }

      yaml += '\n'
    }

    return {
      content: yaml,
      stats: { conversations: conversations.length, messages: messageCount },
    }
  }

  /**
   * Quote string for YAML if necessary
   */
  private quoteString(str: string): string {
    if (!str) return '""'

    // Check if string needs quoting
    const needsQuotes =
      str.includes(':') ||
      str.includes('#') ||
      str.includes('\n') ||
      str.startsWith(' ') ||
      str.endsWith(' ')

    if (!needsQuotes) {
      return str
    }

    // Escape special characters and quote
    return JSON.stringify(str)
  }
}
