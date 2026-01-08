/**
 * Export Manager
 *
 * Main export orchestrator that supports multiple formats and options.
 * Provides a unified interface for exporting data.
 */

import {
  ExportFormat,
  ExportOptions,
  ExportResult,
  ExportSchedule,
  ExportRecord,
} from './types'
import { JSONConverter } from './converters/json'
import { MarkdownConverter } from './converters/markdown'
import { CSVConverter } from './converters/csv'
import { PDFConverter } from './converters/pdf'
import { HTMLConverter } from './converters/html'
import { YAMLConverter } from './converters/yaml'

// ============================================================================
// EXPORT MANAGER
// ============================================================================

export class ExportManager {
  private jsonConverter: JSONConverter
  private markdownConverter: MarkdownConverter
  private csvConverter: CSVConverter
  private pdfConverter: PDFConverter
  private htmlConverter: HTMLConverter
  private yamlConverter: YAMLConverter

  constructor() {
    this.jsonConverter = new JSONConverter()
    this.markdownConverter = new MarkdownConverter()
    this.csvConverter = new CSVConverter()
    this.pdfConverter = new PDFConverter()
    this.htmlConverter = new HTMLConverter()
    this.yamlConverter = new YAMLConverter()
  }

  /**
   * Export data with specified options
   */
  async exportData(options: ExportOptions): Promise<ExportResult> {
    const startTime = Date.now()

    try {
      let data: Blob
      let stats: any

      // Route to appropriate converter
      switch (options.format) {
        case 'json':
          ;({ data, stats } = await this.jsonConverter.exportData(options))
          break

        case 'markdown':
          ;({ data, stats } = await this.markdownConverter.exportData(options))
          break

        case 'csv':
          ;({ data, stats } = await this.csvConverter.exportData(options))
          break

        case 'pdf':
          ;({ data, stats } = await this.pdfConverter.exportData(options))
          break

        case 'html':
          ;({ data, stats } = await this.htmlConverter.exportData(options))
          break

        case 'yaml':
          ;({ data, stats } = await this.yamlConverter.exportData(options))
          break

        case 'zip':
          ;({ data, stats } = await this.exportAsZip(options))
          break

        default:
          throw new Error(`Unsupported export format: ${options.format}`)
      }

      // Generate filename
      const filename = this.generateFilename(options.format, options.scope)

      // Get MIME type
      const mimeType = this.getMimeType(options.format)

      // Record export
      await this.recordExport({
        id: generateId(),
        format: options.format,
        scope: options.scope,
        stats,
        success: true,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      })

      return {
        data,
        filename,
        mimeType,
        stats,
        exportedAt: new Date().toISOString(),
      }
    } catch (error: any) {
      // Record failed export
      await this.recordExport({
        id: generateId(),
        format: options.format,
        scope: options.scope,
        stats: {
          conversations: 0,
          messages: 0,
          knowledgeEntries: 0,
          contacts: 0,
          totalSize: 0,
          duration: Date.now() - startTime,
        },
        success: false,
        error: error.message,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      })

      throw error
    }
  }

  /**
   * Quick export conversations
   */
  async exportConversations(
    format: 'json' | 'markdown' | 'csv' | 'pdf' | 'html' = 'json',
    options?: Partial<ExportOptions>
  ): Promise<Blob> {
    const result = await this.exportData({
      format,
      scope: 'conversations',
      ...options,
    })
    return result.data
  }

  /**
   * Quick export knowledge base
   */
  async exportKnowledge(
    format: 'json' | 'markdown' | 'csv' | 'html' = 'json',
    options?: Partial<ExportOptions>
  ): Promise<Blob> {
    const result = await this.exportData({
      format,
      scope: 'knowledge',
      ...options,
    })
    return result.data
  }

  /**
   * Quick export settings
   */
  async exportSettings(
    format: 'json' | 'yaml' = 'json',
    options?: Partial<ExportOptions>
  ): Promise<Blob> {
    const result = await this.exportData({
      format,
      scope: 'settings',
      ...options,
    })
    return result.data
  }

  /**
   * Export everything (full backup)
   */
  async exportAll(
    format: 'json' | 'zip' = 'json',
    options?: Partial<ExportOptions>
  ): Promise<Blob> {
    const result = await this.exportData({
      format,
      scope: 'all',
      ...options,
    })
    return result.data
  }

  /**
   * Schedule automatic exports
   */
  async scheduleExport(schedule: Omit<ExportSchedule, 'id' | 'createdAt' | 'runCount'>): Promise<string> {
    const id = generateId()

    const newSchedule: ExportSchedule = {
      ...schedule,
      id,
      createdAt: new Date().toISOString(),
      runCount: 0,
    }

    // Save schedule to localStorage
    const schedules = this.getSchedules()
    schedules.push(newSchedule)
    localStorage.setItem('exportSchedules', JSON.stringify(schedules))

    // Set up next run
    this.scheduleNextRun(newSchedule)

    return id
  }

  /**
   * Get all export schedules
   */
  getSchedules(): ExportSchedule[] {
    try {
      const data = localStorage.getItem('exportSchedules')
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  /**
   * Update a schedule
   */
  async updateSchedule(id: string, updates: Partial<ExportSchedule>): Promise<void> {
    const schedules = this.getSchedules()
    const index = schedules.findIndex(s => s.id === id)

    if (index === -1) {
      throw new Error(`Schedule not found: ${id}`)
    }

    schedules[index] = { ...schedules[index], ...updates }
    localStorage.setItem('exportSchedules', JSON.stringify(schedules))

    // Reschedule if active
    if (schedules[index].active) {
      this.scheduleNextRun(schedules[index])
    }
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(id: string): Promise<void> {
    const schedules = this.getSchedules()
    const filtered = schedules.filter(s => s.id !== id)
    localStorage.setItem('exportSchedules', JSON.stringify(filtered))
  }

  /**
   * Get export history
   */
  async getExportHistory(limit = 50): Promise<ExportRecord[]> {
    try {
      const data = localStorage.getItem('exportHistory')
      const history: ExportRecord[] = data ? JSON.parse(data) : []

      // Sort by date descending
      history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      // Limit results
      return history.slice(0, limit)
    } catch {
      return []
    }
  }

  /**
   * Clear export history
   */
  async clearExportHistory(): Promise<void> {
    localStorage.removeItem('exportHistory')
  }

  /**
   * Download export to user's computer
   */
  async downloadExport(result: ExportResult): Promise<void> {
    const url = URL.createObjectURL(result.data)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Export as ZIP archive
   */
  private async exportAsZip(options: ExportOptions): Promise<{ data: Blob; stats: any }> {
    // Export JSON data
    const { data: jsonData, stats } = await this.jsonConverter.exportData(options)

    // Note: For actual ZIP support, need JSZip library
    // For now, return JSON as-is
    console.warn('ZIP export requires JSZip library. Install with: npm install jszip')

    return { data: jsonData, stats }
  }

  /**
   * Generate filename for export
   */
  private generateFilename(format: ExportFormat, scope: string): string {
    const date = new Date().toISOString().split('T')[0]
    const time = new Date().toTimeString().slice(0, 5).replace(':', '-')
    const ext = this.getFileExtension(format)
    return `export-${scope}-${date}-${time}.${ext}`
  }

  /**
   * Get MIME type for format
   */
  private getMimeType(format: ExportFormat): string {
    const types: Record<ExportFormat, string> = {
      json: 'application/json',
      markdown: 'text/markdown',
      csv: 'text/csv',
      pdf: 'application/pdf',
      html: 'text/html',
      yaml: 'text/yaml',
      zip: 'application/zip',
    }
    return types[format]
  }

  /**
   * Get file extension for format
   */
  private getFileExtension(format: ExportFormat): string {
    const exts: Record<ExportFormat, string> = {
      json: 'json',
      markdown: 'md',
      csv: 'csv',
      pdf: 'pdf',
      html: 'html',
      yaml: 'yaml',
      zip: 'zip',
    }
    return exts[format]
  }

  /**
   * Record export in history
   */
  private async recordExport(record: ExportRecord): Promise<void> {
    const history = await this.getExportHistory()
    history.unshift(record)

    // Limit history size
    if (history.length > 100) {
      history.splice(100)
    }

    localStorage.setItem('exportHistory', JSON.stringify(history))
  }

  /**
   * Schedule next run for automatic export
   */
  private scheduleNextRun(schedule: ExportSchedule): void {
    // Calculate next run time
    const nextRunAt = this.calculateNextRun(schedule)
    schedule.nextRunAt = nextRunAt

    // Save updated schedule
    const schedules = this.getSchedules()
    const index = schedules.findIndex(s => s.id === schedule.id)
    if (index !== -1) {
      schedules[index] = schedule
      localStorage.setItem('exportSchedules', JSON.stringify(schedules))
    }

    // Note: In production, use a service worker or background task
    // For now, this is a placeholder
    console.log(`Export scheduled for: ${nextRunAt}`)
  }

  /**
   * Calculate next run time based on schedule type
   */
  private calculateNextRun(schedule: ExportSchedule): string {
    const now = new Date()

    switch (schedule.type) {
      case 'once':
        return now.toISOString()

      case 'daily':
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        if (schedule.config.timeOfDay) {
          const [hours, minutes] = schedule.config.timeOfDay.split(':').map(Number)
          tomorrow.setHours(hours, minutes, 0, 0)
        }
        return tomorrow.toISOString()

      case 'weekly':
        const nextWeek = new Date(now)
        nextWeek.setDate(nextWeek.getDate() + 7)
        return nextWeek.toISOString()

      case 'monthly':
        const nextMonth = new Date(now)
        nextMonth.setMonth(nextMonth.getMonth() + 1)
        return nextMonth.toISOString()

      case 'custom':
        if (schedule.config.intervalMinutes) {
          const nextCustom = new Date(now.getTime() + schedule.config.intervalMinutes * 60 * 1000)
          return nextCustom.toISOString()
        }
        return now.toISOString()

      default:
        return now.toISOString()
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return `export_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// ============================================================================
// SINGLETON
// ============================================================================

let exportManager: ExportManager | null = null

/**
 * Get the export manager singleton
 */
export function getExportManager(): ExportManager {
  if (!exportManager) {
    exportManager = new ExportManager()
  }
  return exportManager
}
