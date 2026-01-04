/**
 * HTML Converter
 *
 * Converts PersonalLog data to HTML format for web viewing.
 * Ideal for sharing, archiving, and printing.
 */

import { ExportOptions, ExportStats } from '../types'
import { listConversations, getMessages } from '@/lib/storage/conversation-store'
import { getVectorStore } from '@/lib/knowledge/vector-store'
import { listContacts } from '@/lib/wizard/model-store'

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
      includeSearch: htmlOptions.includeSearch ?? true,
      responsive: htmlOptions.responsive ?? true,
    }

    let html = ''
    let stats: ExportStats = {
      conversations: 0,
      messages: 0,
      knowledgeEntries: 0,
      contacts: 0,
      totalSize: 0,
      duration: 0,
    }

    // Generate HTML document
    html += this.generateHeader(finalOptions)

    if (finalOptions.includeNav) {
      html += this.generateNavigation(options)
    }

    html += '<main>\n'

    // Export based on scope
    if (options.scope === 'all' || options.scope === 'conversations') {
      const convResult = await this.exportConversations(options.dateRange)
      html += convResult.content
      stats.conversations = convResult.stats.conversations
      stats.messages = convResult.stats.messages
    }

    if (options.scope === 'all' || options.scope === 'knowledge') {
      const { content, stats: knowledgeStats } = await this.exportKnowledge(options.dateRange)
      html += content
      stats.knowledgeEntries = knowledgeStats.entries
    }

    if (options.scope === 'all' || options.scope === 'contacts') {
      const { content, stats: contactStats } = await this.exportContacts()
      html += content
      stats.contacts = contactStats.contacts
    }

    html += '</main>\n'
    html += this.generateFooter(finalOptions)

    // Create blob
    const encoder = new TextEncoder()
    const bytes = encoder.encode(html)
    stats.totalSize = bytes.length
    stats.duration = Date.now() - startTime

    const blob = new Blob([bytes], { type: 'text/html' })

    return { data: blob, stats }
  }

  /**
   * Generate HTML document header
   */
  private generateHeader(options: HTMLOptions): string {
    return `<!DOCTYPE html>
<html lang="en" data-theme="${options.theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PersonalLog Export</title>
  ${options.includeStyles ? this.generateStyles(options) : ''}
  ${options.includeSearch ? this.generateSearchScript() : ''}
</head>
<body>
`
  }

  /**
   * Generate CSS styles
   */
  private generateStyles(options: HTMLOptions): string {
    return `<style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f5f5f5;
      --text-primary: #000000;
      --text-secondary: #666666;
      --border-color: #e0e0e0;
      --accent-color: #0066cc;
      --user-bg: #e3f2fd;
      --ai-bg: #f3e5f5;
      --system-bg: #fff3e0;
    }

    [data-theme="dark"] {
      --bg-primary: #1a1a1a;
      --bg-secondary: #2d2d2d;
      --text-primary: #ffffff;
      --text-secondary: #aaaaaa;
      --border-color: #404040;
      --accent-color: #4dabf7;
      --user-bg: #1e3a5f;
      --ai-bg: #3d2a5f;
      --system-bg: #5f3a1e;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background-color: var(--bg-secondary);
      color: var(--text-primary);
      line-height: 1.6;
    }

    header {
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border-color);
      padding: 2rem;
      text-align: center;
    }

    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .meta {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    ${options.includeNav ? this.generateNavStyles() : ''}

    main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .section {
      background: var(--bg-primary);
      border-radius: 8px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .section h2 {
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--accent-color);
    }

    .conversation {
      margin-bottom: 3rem;
    }

    .conversation-header {
      background: var(--bg-secondary);
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }

    .conversation-title {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .conversation-meta {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .message {
      margin: 1rem 0;
      padding: 1rem;
      border-radius: 8px;
      border-left: 4px solid var(--accent-color);
    }

    .message.user {
      background: var(--user-bg);
      border-left-color: #2196f3;
    }

    .message.ai {
      background: var(--ai-bg);
      border-left-color: #9c27b0;
    }

    .message.system {
      background: var(--system-bg);
      border-left-color: #ff9800;
    }

    .message-author {
      font-weight: bold;
      margin-bottom: 0.5rem;
    }

    .message-content {
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .message-time {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-top: 0.5rem;
    }

    .knowledge-entry {
      padding: 1rem;
      border-bottom: 1px solid var(--border-color);
    }

    .knowledge-entry:last-child {
      border-bottom: none;
    }

    .contact-card {
      padding: 1rem;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      margin-bottom: 1rem;
    }

    ${options.responsive ? `
    @media (max-width: 768px) {
      main {
        padding: 1rem;
      }
      .section {
        padding: 1rem;
      }
    }
    ` : ''}
  </style>`
  }

  /**
   * Generate navigation styles
   */
  private generateNavStyles(): string {
    return `
    nav {
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border-color);
      padding: 1rem 2rem;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    nav ul {
      list-style: none;
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
    }

    nav a {
      color: var(--text-primary);
      text-decoration: none;
      font-weight: 500;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      transition: background 0.2s;
    }

    nav a:hover {
      background: var(--bg-secondary);
    }

    #search-container {
      margin-left: auto;
    }

    #search-input {
      padding: 0.5rem 1rem;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      width: 200px;
    }
    `
  }

  /**
   * Generate navigation menu
   */
  private generateNavigation(options: ExportOptions): string {
    let nav = '<nav><ul>'

    if (options.scope === 'all' || options.scope === 'conversations') {
      nav += '<li><a href="#conversations">Conversations</a></li>'
    }

    if (options.scope === 'all' || options.scope === 'knowledge') {
      nav += '<li><a href="#knowledge">Knowledge Base</a></li>'
    }

    if (options.scope === 'all' || options.scope === 'contacts') {
      nav += '<li><a href="#contacts">AI Contacts</a></li>'
    }

    nav += '</ul>'

    if (this.includeSearch(options)) {
      nav += '<div id="search-container"><input type="text" id="search-input" placeholder="Search..."></div>'
    }

    nav += '</nav>\n'

    return nav
  }

  /**
   * Generate search script
   */
  private generateSearchScript(): string {
    return `
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.addEventListener('input', function(e) {
          const query = e.target.value.toLowerCase();
          const messages = document.querySelectorAll('.message-content');
          messages.forEach(msg => {
            const text = msg.textContent.toLowerCase();
            msg.parentElement.style.display = text.includes(query) ? 'block' : 'none';
          });
        });
      }
    });
  </script>
`
  }

  /**
   * Export conversations to HTML
   */
  private async exportConversations(
    dateRange: { start: Date; end: Date } | undefined
  ): Promise<{ content: string; stats: { conversations: number; messages: number } }> {
    const conversations = await listConversations({ includeArchived: true })
    let html = '<section id="conversations" class="section">\n<h2>Conversations</h2>\n'
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

      html += '<div class="conversation">\n'
      html += '<div class="conversation-header">\n'
      html += `<h3 class="conversation-title">${this.escapeHTML(conv.title)}</h3>\n`
      html += `<div class="conversation-meta">`
      html += `Created: ${new Date(conv.createdAt).toLocaleString()} | `
      html += `Updated: ${new Date(conv.updatedAt).toLocaleString()} | `
      html += `${messages.length} messages`
      html += `</div>\n`
      html += '</div>\n'

      // Messages
      for (const msg of messages) {
        const messageType = this.getMessageType(msg.author)
        const authorName = this.getAuthorName(msg.author)

        html += `<div class="message ${messageType}">\n`
        html += `<div class="message-author">${this.escapeHTML(authorName)}</div>\n`

        if (msg.content.text) {
          html += `<div class="message-content">${this.escapeHTML(msg.content.text)}</div>\n`
        }

        if (msg.content.media) {
          html += `<div class="message-content">[Media: ${this.escapeHTML(msg.content.media.name)}]</div>\n`
        }

        if (msg.timestamp) {
          html += `<div class="message-time">${new Date(msg.timestamp).toLocaleString()}</div>\n`
        }

        html += '</div>\n'
      }

      html += '</div>\n'
    }

    html += '</section>\n'

    return {
      content: html,
      stats: { conversations: conversations.length, messages: messageCount },
    }
  }

  /**
   * Export knowledge entries to HTML
   */
  private async exportKnowledge(
    dateRange: { start: Date; end: Date } | undefined
  ): Promise<{ content: string; stats: { entries: number } }> {
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

    let html = '<section id="knowledge" class="section">\n<h2>Knowledge Base</h2>\n'

    for (const entry of entries) {
      html += '<div class="knowledge-entry">\n'
      html += `<h4>${entry.type.toUpperCase()}: ${entry.sourceId}</h4>\n`

      if (entry.metadata.timestamp) {
        html += `<div class="meta">${new Date(entry.metadata.timestamp).toLocaleString()}</div>\n`
      }

      if (entry.editedContent) {
        html += `<p><strong>Original:</strong> ${this.escapeHTML(entry.content)}</p>\n`
        html += `<p><strong>Edited:</strong> ${this.escapeHTML(entry.editedContent)}</p>\n`
      } else {
        html += `<p>${this.escapeHTML(entry.content)}</p>\n`
      }

      if (entry.metadata.tags && entry.metadata.tags.length > 0) {
        html += `<div class="meta">Tags: ${entry.metadata.tags.join(', ')}</div>\n`
      }

      html += '</div>\n'
    }

    html += '</section>\n'

    return {
      content: html,
      stats: { entries: entries.length },
    }
  }

  /**
   * Export AI contacts to HTML
   */
  private async exportContacts(): Promise<{ content: string; stats: { contacts: number } }> {
    const contacts = await listContacts()
    let html = '<section id="contacts" class="section">\n<h2>AI Contacts</h2>\n'

    for (const contact of contacts) {
      const c = contact as any
      html += '<div class="contact-card">\n'
      html += `<h3>${this.escapeHTML(c.name || c.nickname || 'AI Contact')}</h3>\n`
      html += `<p><strong>Model:</strong> ${this.escapeHTML(c.config?.model || c.model || 'Unknown')}</p>\n`
      html += `<p><strong>Created:</strong> ${new Date(contact.createdAt).toLocaleString()}</p>\n`

      if (c.personality?.systemPrompt || c.systemPrompt) {
        html += '<p><strong>System Prompt:</strong></p>\n'
        html += `<pre>${this.escapeHTML(c.personality?.systemPrompt || c.systemPrompt || '')}</pre>\n`
      }

      html += '</div>\n'
    }

    html += '</section>\n'

    return {
      content: html,
      stats: { contacts: contacts.length },
    }
  }

  /**
   * Generate document footer
   */
  private generateFooter(options: HTMLOptions): string {
    return `<footer style="text-align: center; padding: 2rem; color: var(--text-secondary);">
    <p>Generated by PersonalLog v2.0.0 on ${new Date().toLocaleString()}</p>
  </footer>
</body>
</html>`
  }

  /**
   * Get message type class
   */
  private getMessageType(author: any): string {
    if (author === 'user') return 'user'
    if (typeof author === 'object' && author.type === 'ai-contact') return 'ai'
    if (typeof author === 'object' && author.type === 'system') return 'system'
    return ''
  }

  /**
   * Get display name for message author
   */
  private getAuthorName(author: any): string {
    if (author === 'user') return 'You'
    if (typeof author === 'object' && author.type === 'ai-contact') {
      return author.contactName || 'AI'
    }
    if (typeof author === 'object' && author.type === 'system') {
      return 'System'
    }
    return 'Unknown'
  }

  /**
   * Escape HTML special characters
   */
  private escapeHTML(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }
    return text.replace(/[&<>"']/g, m => map[m])
  }

  /**
   * Check if search should be included
   */
  private includeSearch(options: ExportOptions): boolean {
    return options.scope === 'all' || options.scope === 'conversations'
  }
}
