'use client'

/**
 * Data Portability Dashboard
 *
 * Comprehensive UI for importing and exporting data.
 * Provides format selection, preview, conflict resolution, and history tracking.
 */

import { useState, useEffect } from 'react'
import { getExportManager, ExportFormat, ExportScope, ExportOptions, ExportRecord } from '@/lib/export'
import { getImportManager, ImportPreview, ImportOptions, ConflictResolution } from '@/lib/import'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DataPortabilityDashboard() {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'history'>('export')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>([])

  useEffect(() => {
    loadExportHistory()
  }, [])

  const loadExportHistory = async () => {
    const manager = getExportManager()
    const history = await manager.getExportHistory()
    setExportHistory(history)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Data Portability</h1>
        <p className="text-gray-600">
          Import and export your data in multiple formats. You own your data completely.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('export')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'export'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Export
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'import'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Import
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            History
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'export' && (
        <ExportTab exporting={exporting} setExporting={setExporting} />
      )}

      {activeTab === 'import' && (
        <ImportTab importing={importing} setImporting={setImporting} />
      )}

      {activeTab === 'history' && (
        <HistoryTab history={exportHistory} onRefresh={loadExportHistory} />
      )}
    </div>
  )
}

// ============================================================================
// EXPORT TAB
// ============================================================================

function ExportTab({ exporting, setExporting }: { exporting: boolean; setExporting: (v: boolean) => void }) {
  const [format, setFormat] = useState<ExportFormat>('json')
  const [scope, setScope] = useState<ExportScope>('all')
  const [includeAttachments, setIncludeAttachments] = useState(false)
  const [compress, setCompress] = useState(false)

  const handleExport = async () => {
    setExporting(true)

    try {
      const manager = getExportManager()
      const options: ExportOptions = {
        format,
        scope,
        includeAttachments,
        compress,
      }

      const result = await manager.exportData(options)

      // Download file
      await manager.downloadExport(result)

      // Refresh history
      // (handled by useEffect in parent)
    } catch (error: any) {
      console.error('Export failed:', error)
      alert(`Export failed: ${error.message}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Export Data</h2>

        {/* Format Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Export Format
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFormat(opt.value)}
                className={`p-4 rounded-lg border-2 text-center transition-colors ${
                  format === opt.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">{opt.icon}</div>
                <div className="font-medium">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-1">{opt.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Scope Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Scope
          </label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as ExportScope)}
            className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md"
          >
            {SCOPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Options */}
        <div className="mb-6 space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeAttachments}
              onChange={(e) => setIncludeAttachments(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Include media attachments</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={compress}
              onChange={(e) => setCompress(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Compress output</span>
          </label>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          {exporting ? 'Exporting...' : 'Export Data'}
        </button>
      </div>

      {/* Scheduled Exports */}
      <ScheduledExports />
    </div>
  )
}

// ============================================================================
// IMPORT TAB
// ============================================================================

function ImportTab({ importing, setImporting }: { importing: boolean; setImporting: (v: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    setPreview(null)
  }

  const handlePreview = async () => {
    if (!file) return

    setImporting(true)

    try {
      const manager = getImportManager()
      const result = await manager.importFile(file)
      setPreview(result)
    } catch (error: any) {
      console.error('Preview failed:', error)
      alert(`Preview failed: ${error.message}`)
    } finally {
      setImporting(false)
    }
  }

  const handleImport = async () => {
    if (!preview) return

    setImporting(true)

    try {
      const manager = getImportManager()
      const result = await manager.confirmImport(preview.id)

      if (result.success) {
        alert(`Import successful! ${result.stats.imported} items imported.`)
        setPreview(null)
        setFile(null)
      } else {
        alert(`Import completed with errors. Check console for details.`)
      }
    } catch (error: any) {
      console.error('Import failed:', error)
      alert(`Import failed: ${error.message}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Import Data</h2>

        {/* File Upload */}
        {!preview && (
          <div
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              setDragActive(false)
              const dropped = e.dataTransfer.files[0]
              if (dropped) handleFileSelect(dropped)
            }}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
          >
            <input
              type="file"
              onChange={(e) => {
                const selected = e.target.files?.[0]
                if (selected) handleFileSelect(selected)
              }}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="text-4xl mb-2">📁</div>
              <div className="font-medium mb-1">
                {file ? file.name : 'Drop file here or click to browse'}
              </div>
              <div className="text-sm text-gray-500">
                Supports: PersonalLog, ChatGPT, Claude, CSV, JSON
              </div>
            </label>
          </div>
        )}

        {/* File Info & Preview Button */}
        {file && !preview && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">{file.name}</div>
                <div className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB
                </div>
              </div>
            </div>

            <button
              onClick={handlePreview}
              disabled={importing}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
            >
              {importing ? 'Previewing...' : 'Preview Import'}
            </button>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <ImportPreviewComponent preview={preview} onConfirm={handleImport} importing={importing} />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// IMPORT PREVIEW COMPONENT
// ============================================================================

function ImportPreviewComponent({
  preview,
  onConfirm,
  importing,
}: {
  preview: ImportPreview
  onConfirm: () => void
  importing: boolean
}) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Select all items by default
    const allIds = new Set(preview.items.map(i => i.sourceId))
    setSelectedItems(allIds)
  }, [preview])

  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const toggleAll = () => {
    if (selectedItems.size === preview.items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(preview.items.map(i => i.sourceId)))
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <div className="text-2xl font-bold">{preview.items.length}</div>
          <div className="text-sm text-gray-600">Items</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-orange-600">{preview.conflicts.length}</div>
          <div className="text-sm text-gray-600">Conflicts</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-yellow-600">{preview.warnings.length}</div>
          <div className="text-sm text-gray-600">Warnings</div>
        </div>
        <div>
          <div className="text-2xl font-bold">
            {(preview.estimatedSize / 1024 / 1024).toFixed(2)} MB
          </div>
          <div className="text-sm text-gray-600">Size</div>
        </div>
      </div>

      {/* Warnings/Errors */}
      {preview.warnings.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="font-medium text-yellow-800 mb-2">Warnings</div>
          <ul className="text-sm text-yellow-700 space-y-1">
            {preview.warnings.map((w, i) => (
              <li key={i}>• {w.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Conflicts */}
      {preview.conflicts.length > 0 && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="font-medium text-orange-800 mb-2">
            {preview.conflicts.length} Conflict(s) Detected
          </div>
          <div className="text-sm text-orange-700">
            Conflicts will be resolved using the &quot;Rename&quot; strategy.
          </div>
        </div>
      )}

      {/* Items */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={selectedItems.size === preview.items.length}
              onChange={toggleAll}
              className="mr-2"
            />
            <span className="font-medium">Select All</span>
          </label>
          <span className="text-sm text-gray-600">
            {selectedItems.size} of {preview.items.length} selected
          </span>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {preview.items.map((item) => (
            <div
              key={item.sourceId}
              className={`px-4 py-3 border-b flex items-start ${
                item.hasConflicts ? 'bg-orange-50' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={selectedItems.has(item.sourceId)}
                onChange={() => toggleItem(item.sourceId)}
                className="mt-1 mr-3"
              />
              <div className="flex-1">
                <div className="font-medium">{item.title}</div>
                <div className="text-sm text-gray-600">
                  {item.type} • {(item.size / 1024).toFixed(2)} KB
                </div>
                {item.hasConflicts && (
                  <div className="text-xs text-orange-600 mt-1">⚠️ Conflict detected</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-4">
        <button
          onClick={onConfirm}
          disabled={importing || selectedItems.size === 0 || !preview.canImport}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          {importing ? 'Importing...' : `Import ${selectedItems.size} Items`}
        </button>

        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// HISTORY TAB
// ============================================================================

function HistoryTab({
  history,
  onRefresh
}: {
  history: ExportRecord[]
  onRefresh: () => void
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Export History</h2>
        <button
          onClick={onRefresh}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No export history yet. Export your data to see it here.
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((record) => (
            <div key={record.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {record.format.toUpperCase()} - {record.scope}
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(record.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm ${record.success ? 'text-green-600' : 'text-red-600'}`}>
                    {record.success ? '✓ Success' : '✗ Failed'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {record.stats.conversations} conversations
                  </div>
                </div>
              </div>
              {record.error && (
                <div className="mt-2 text-sm text-red-600">{record.error}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// SCHEDULED EXPORTS COMPONENT
// ============================================================================

function ScheduledExports() {
  const [scheduling, setScheduling] = useState(false)

  const handleSchedule = async () => {
    setScheduling(true)
    try {
      const manager = getExportManager()
      await manager.scheduleExport({
        name: 'Daily Backup',
        type: 'daily',
        format: 'json',
        scope: 'all',
        config: {
          timeOfDay: '02:00',
          maxExports: 7,
        },
        options: {
          format: 'json',
          scope: 'all',
        },
        active: true,
        nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      alert('Export scheduled successfully!')
    } catch (error: any) {
      alert(`Failed to schedule export: ${error.message}`)
    } finally {
      setScheduling(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Scheduled Exports</h3>
      <div className="text-sm text-gray-600 mb-4">
        Automatic daily backups at 2:00 AM
      </div>
      <button
        onClick={handleSchedule}
        disabled={scheduling}
        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-gray-400"
      >
        {scheduling ? 'Scheduling...' : 'Enable Daily Backups'}
      </button>
    </div>
  )
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FORMAT_OPTIONS = [
  { value: 'json' as ExportFormat, label: 'JSON', icon: '📄', description: 'Native format' },
  { value: 'markdown' as ExportFormat, label: 'Markdown', icon: '📝', description: 'Human-readable' },
  { value: 'csv' as ExportFormat, label: 'CSV', icon: '📊', description: 'Spreadsheet' },
  { value: 'html' as ExportFormat, label: 'HTML', icon: '🌐', description: 'Web viewable' },
]

const SCOPE_OPTIONS = [
  { value: 'all' as ExportScope, label: 'All Data' },
  { value: 'conversations' as ExportScope, label: 'Conversations Only' },
  { value: 'knowledge' as ExportScope, label: 'Knowledge Base Only' },
  { value: 'settings' as ExportScope, label: 'Settings Only' },
]
