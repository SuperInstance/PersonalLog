/**
 * CSV Converter
 *
 * Converts data to CSV format for spreadsheet compatibility.
 * Ideal for data analysis and reporting.
 */

import { ExportOptions, ExportStats, DataProvider } from '../types'

export interface CSVOptions {
  delimiter: ',' | ';' | '\t'
  includeHeaders: boolean
  dateFormat: 'ISO' | 'US' | 'EU' | 'timestamp'
  multilineHandling: 'wrap' | 'escape' | 'truncate'
}

export class CSVConverter {
  /**
   * Export data to CSV format
   */
  async exportData(options: ExportOptions, csvOptions: Partial<CSVOptions> = {}): Promise<{
    data: Blob
    stats: ExportStats
  }> {
    const startTime = Date.now()
    const finalOptions: CSVOptions = {
      delimiter: csvOptions.delimiter ?? ',',
      includeHeaders: csvOptions.includeHeaders ?? true,
      dateFormat: csvOptions.dateFormat ?? 'ISO',
      multilineHandling: csvOptions.multilineHandling ?? 'wrap',
    }

    let csv = ''
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
      const convResult = await this.exportConversations(
        provider,
        options.dateRange,
        finalOptions
      )
      csv += convResult.content
      stats.conversations = convResult.stats.conversations
      stats.messages = convResult.stats.messages
    }

    // Create blob
    const encoder = new TextEncoder()
    const bytes = encoder.encode(csv)
    stats.totalSize = bytes.length
    stats.duration = Date.now() - startTime

    const mimeType = finalOptions.delimiter === '\t' ? 'text/tab-separated-values' : 'text/csv'
    const blob = new Blob([bytes], { type: mimeType })

    return { data: blob, stats }
  }

  /**
   * Export conversations to CSV
   */
  private async exportConversations(
    provider: DataProvider | undefined,
    dateRange: { start: Date; end: Date } | undefined,
    options: CSVOptions
  ): Promise<{ content: string; stats: { conversations: number; messages: number } }> {
    const conversations = provider?.getConversations ? await provider.getConversations() : []
    let csv = ''
    let messageCount = 0

    // Headers
    if (options.includeHeaders) {
      csv += this.formatRow(
        ['Date', 'Conversation ID', 'Title', 'Type', 'Message ID', 'Author', 'Content'],
        options
      )
    }

    // Messages
    for (const conv of conversations) {
      // Apply date range filter
      if (dateRange) {
        const convDate = new Date(conv.createdAt)
        if (convDate < dateRange.start || convDate > dateRange.end) {
          continue
        }
      }

      // Get messages
      const messages = provider?.getMessages ? await provider.getMessages(conv.id) : conv.messages || []
      messageCount += messages.length

      for (const msg of messages) {
        const row = [
          this.formatDate(msg.timestamp, options.dateFormat),
          conv.id,
          conv.title || '',
          conv.type,
          msg.id,
          this.getAuthorName(msg.author),
          this.formatContent(msg.content?.text || '', options),
        ]

        csv += this.formatRow(row, options)
      }
    }

    return {
      content: csv,
      stats: { conversations: conversations.length, messages: messageCount },
    }
  }

  /**
   * Format a row of values
   */
  private formatRow(values: string[], options: CSVOptions): string {
    const delimiter = options.delimiter
    const formatted = values.map(v => this.formatValue(v, options))
    return formatted.join(delimiter) + '\n'
  }

  /**
   * Format a single value
   */
  private formatValue(value: string, options: CSVOptions): string {
    if (!value) return '""'

    // Check if value needs quoting
    const needsQuotes =
      value.includes(delimiterToString(options.delimiter)) ||
      value.includes('"') ||
      value.includes('\n') ||
      value.includes('\r')

    if (!needsQuotes) {
      return value
    }

    // Handle multiline content
    if (value.includes('\n') || value.includes('\r')) {
      switch (options.multilineHandling) {
        case 'wrap':
          return `"${value.replace(/"/g, '""')}"`
        case 'escape':
          return `"${value.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`
        case 'truncate':
          return `"${value.slice(0, 100).replace(/"/g, '""')}..."`
      }
    }

    // Standard quoting
    return `"${value.replace(/"/g, '""')}"`
  }

  /**
   * Format content for CSV
   */
  private formatContent(content: string, _options: CSVOptions): string {
    // Remove excessive whitespace
    content = content.trim().replace(/\s+/g, ' ')

    // Truncate if too long
    if (content.length > 1000) {
      content = content.slice(0, 997) + '...'
    }

    return content
  }

  /**
   * Format date according to specified format
   */
  private formatDate(timestamp: string, format: CSVOptions['dateFormat']): string {
    const date = new Date(timestamp)

    switch (format) {
      case 'ISO':
        return date.toISOString()
      case 'US':
        return date.toLocaleDateString('en-US')
      case 'EU':
        return date.toLocaleDateString('en-GB')
      case 'timestamp':
        return date.getTime().toString()
      default:
        return date.toISOString()
    }
  }

  /**
   * Get display name for message author
   */
  private getAuthorName(author: any): string {
    if (author === 'user') return 'You'
    if (typeof author === 'object' && author?.type === 'ai-contact') {
      return author.contactName || 'AI'
    }
    return 'Unknown'
  }
}

/**
 * Convert delimiter to string representation
 */
function delimiterToString(delimiter: CSVOptions['delimiter']): string {
  switch (delimiter) {
    case ',':
      return ','
    case ';':
      return ';'
    case '\t':
      return 'TAB'
    default:
      return ','
  }
}
