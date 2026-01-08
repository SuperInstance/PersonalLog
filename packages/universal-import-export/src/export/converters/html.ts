/**
 * HTML Converter
 *
 * Converts data to HTML format for web viewing.
 */

import { ExportOptions, ExportStats } from '../types'

export interface HTMLOptions {
  includeStyles: boolean
  theme: 'light' | 'dark' | 'auto'
  includeNav: boolean
  includeSearch: boolean
  responsive: boolean
}

export class HTMLConverter {
  /**
   * Export data to HTML format
   */
  async exportData(options: ExportOptions, htmlOptions: Partial<HTMLOptions> = {}): Promise<{
    data: Blob
    stats: ExportStats
  }> {
    const startTime = Date.now()
    const finalOptions: HTMLOptions = {
      includeStyles: htmlOptions.includeStyles ?? true,
      theme: htmlOptions.theme ?? 'light',
      includeNav: htmlOptions.includeNav ?? true,
      includeSearch: htmlOptions.includeSearch ?? false,
      responsive: htmlOptions.responsive ?? true,
    }

    const provider = options.dataProvider
    let stats: ExportStats = {
      conversations: 0,
      messages: 0,
      knowledgeEntries: 0,
      contacts: 0,
      totalSize: 0,
      duration: 0,
    }

    // Generate HTML content
    let html = this.generateHeader(finalOptions)

    if (options.scope === 'all' || options.scope === 'conversations') {
      const conversations = provider?.getConversations ? await provider.getConversations() : []
      stats.conversations = conversations.length
      html += '<section id="conversations"><h2>Conversations</h2>'
      for (const conv of conversations) {
        html += `<div class="conversation"><h3>${this.escapeHtml(conv.title || 'Untitled')}</h3>`
        html += `<p>Created: ${new Date(conv.createdAt).toLocaleString()}</p>`
        html += '</div>'
      }
      html += '</section>'
    }

    html += this.generateFooter()

    // Create blob
    const encoder = new TextEncoder()
    const bytes = encoder.encode(html)
    stats.totalSize = bytes.length
    stats.duration = Date.now() - startTime

    const blob = new Blob([bytes], { type: 'text/html' })

    return { data: blob, stats }
  }

  private generateHeader(_options: HTMLOptions): string {
    // const theme = _options.theme === 'auto' ? '@media (prefers-color-scheme: dark)' : ''
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Data Export</title>
  ${_options.includeStyles ? `<style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .conversation { margin-bottom: 2rem; padding: 1rem; border: 1px solid #ddd; border-radius: 8px; }
  </style>` : ''}
</head>
<body>
  <h1>Data Export</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
`
  }

  private generateFooter(): string {
    return '</body>\n</html>'
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}
