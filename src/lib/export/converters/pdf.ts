/**
 * PDF Converter
 *
 * Converts PersonalLog data to PDF format for professional reports.
 * Uses jsPDF library for PDF generation.
 */

import { ExportOptions, ExportStats, PDFExportOptions } from '../types'

export type { PDFExportOptions }
import { listConversations, getMessages } from '@/lib/storage/conversation-store'

export class PDFConverter {
  private defaultOptions: PDFExportOptions = {
    pageSize: 'A4',
    orientation: 'portrait',
    includePageNumbers: true,
    includeTOC: true,
    fontFamily: 'helvetica',
    fontSize: 12,
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
  }

  /**
   * Export data to PDF format
   * Note: This is a simplified version. For full PDF support, install jsPDF:
   * npm install jspdf jspdf-autotable
   */
  async exportData(
    options: ExportOptions,
    pdfOptions: Partial<PDFExportOptions> = {}
  ): Promise<{ data: Blob; stats: ExportStats }> {
    const startTime = Date.now()
    const finalOptions = { ...this.defaultOptions, ...pdfOptions }

    // For now, generate HTML and print to PDF
    // In production, use jsPDF library
    const { data: htmlData } = await this.exportAsHTML(options)

    let stats: ExportStats = {
      conversations: 0,
      messages: 0,
      knowledgeEntries: 0,
      contacts: 0,
      totalSize: htmlData.size,
      duration: Date.now() - startTime,
    }

    // Note: Actual PDF generation would use jsPDF here
    // For now, we return the HTML as a placeholder
    console.warn('PDF export requires jsPDF library. Install with: npm install jspdf jspdf-autotable')

    return { data: htmlData, stats }
  }

  /**
   * Export as HTML (can be printed to PDF)
   */
  private async exportAsHTML(options: ExportOptions): Promise<{ data: Blob }> {
    const conversations = await listConversations({ includeArchived: true })
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PersonalLog Export</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { page-break-before: always; }
    .conversation { margin-bottom: 30px; page-break-inside: avoid; }
    .message { margin: 10px 0; padding: 10px; border-left: 3px solid #ccc; }
    .user { background: #f0f0f0; }
    .ai { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>PersonalLog Export</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
`

    for (const conv of conversations) {
      const messages = await getMessages(conv.id)

      html += `<div class="conversation">
        <h2>${this.escapeHTML(conv.title)}</h2>
        <p><small>${new Date(conv.createdAt).toLocaleString()}</small></p>
      `

      for (const msg of messages) {
        const author = msg.author === 'user' ? 'You' : 'AI'
        const typeClass = msg.author === 'user' ? 'user' : 'ai'

        html += `<div class="message ${typeClass}">
          <strong>${author}:</strong> ${this.escapeHTML(msg.content.text || '')}
        </div>`
      }

      html += '</div>'
    }

    html += '</body></html>'

    const blob = new Blob([html], { type: 'text/html' })
    return { data: blob }
  }

  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}
