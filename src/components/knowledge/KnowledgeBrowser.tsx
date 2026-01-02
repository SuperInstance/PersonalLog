/**
 * Knowledge Browser Component
 *
 * UI for browsing, searching, and editing the knowledge base.
 * Includes chatbot help for searching.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Star, Edit, Undo, Download, RefreshCw, Filter, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { getVectorStore, type KnowledgeEntry, type Checkpoint, type KnowledgeSearchResult } from '@/lib/knowledge/vector-store'

interface KnowledgeBrowserProps {
  className?: string
}

export function KnowledgeBrowser({ className = '' }: KnowledgeBrowserProps) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<KnowledgeEntry[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null)
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null)
  const [editContent, setEditContent] = useState('')
  const [activeTab, setActiveTab] = useState<'browse' | 'search' | 'checkpoints'>('browse')
  const [filters, setFilters] = useState({
    type: 'all',
    starred: false,
    dateRange: 'all' as 'all' | 'today' | 'week' | 'month',
  })
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const vectorStore = getVectorStore()

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  // Apply filters
  useEffect(() => {
    applyFilters()
  }, [entries, filters])

  const loadData = async () => {
    try {
      await vectorStore.init()
      const [loadedEntries, loadedCheckpoints] = await Promise.all([
        vectorStore.getEntries(),
        vectorStore.getCheckpoints(),
      ])
      setEntries(loadedEntries)
      setFilteredEntries(loadedEntries)
      setCheckpoints(loadedCheckpoints)
    } catch (error) {
      console.error('Failed to load knowledge:', error)
    }
  }

  const applyFilters = () => {
    let filtered = [...entries]

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(e => e.type === filters.type)
    }

    // Starred filter
    if (filters.starred) {
      filtered = filtered.filter(e => e.metadata.starred)
    }

    // Date filter
    if (filters.dateRange !== 'all') {
      const now = Date.now()
      const cutoffs: Record<string, number> = {
        today: now - 24 * 60 * 60 * 1000,
        week: now - 7 * 24 * 60 * 60 * 1000,
        month: now - 30 * 24 * 60 * 60 * 1000,
      }
      filtered = filtered.filter(e =>
        new Date(e.metadata.timestamp).getTime() > cutoffs[filters.dateRange]
      )
    }

    setFilteredEntries(filtered)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setActiveTab('browse')
      return
    }

    setIsSearching(true)
    try {
      const results = await vectorStore.hybridSearch(searchQuery, {
        limit: 50,
        threshold: 0.3,
        types: filters.type === 'all' ? undefined : [filters.type as KnowledgeEntry['type']],
      })
      setFilteredEntries(results.map(r => r.entry))
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSync = async () => {
    try {
      const { added, updated } = await vectorStore.syncConversations()
      await loadData()
      alert(`Synced: ${added} added, ${updated} updated`)
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  const handleCreateCheckpoint = async () => {
    const name = prompt('Checkpoint name:', `Checkpoint ${new Date().toLocaleString()}`)
    if (!name) return

    try {
      const checkpoint = await vectorStore.createCheckpoint(name, {
        description: 'Manual checkpoint',
      })
      await loadData()
      alert(`Created checkpoint: ${checkpoint.name} (${checkpoint.entryCount} entries)`)
    } catch (error) {
      console.error('Failed to create checkpoint:', error)
    }
  }

  const handleStarEntry = async (entryId: string, starred: boolean) => {
    try {
      const entry = entries.find((e: KnowledgeEntry) => e.id === entryId)
      if (entry) {
        await vectorStore.updateEntry(entryId, {
          metadata: { ...entry.metadata, starred },
        })
      }
      await loadData()
    } catch (error) {
      console.error('Failed to star entry:', error)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingEntry) return

    try {
      await vectorStore.updateEntry(editingEntry.id, {
        content: editContent,
      })
      setEditingEntry(null)
      await loadData()
    } catch (error) {
      console.error('Failed to save edit:', error)
    }
  }

  const handleRollback = async (checkpointId: string) => {
    const confirmed = confirm('This will restore knowledge to this checkpoint. Continue?')
    if (!confirmed) return

    try {
      const result = await vectorStore.rollbackToCheckpoint(checkpointId)
      await loadData()
      alert(`Rollback complete: ${result.restored} restored, ${result.removed} removed`)
    } catch (error) {
      console.error('Rollback failed:', error)
    }
  }

  const handleExport = async (checkpointId?: string) => {
    try {
      const exportData = await vectorStore.exportForLoRA(checkpointId, 'jsonl')

      // Create download
      const blob = new Blob([
        exportData.entries.map(e => JSON.stringify(e)).join('\n')
      ], { type: 'application/jsonl' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `knowledge-export-${checkpointId || 'latest'}.jsonl`
      a.click()
      URL.revokeObjectURL(url)

      alert(`Exported ${exportData.statistics.totalEntries} entries (${exportData.statistics.totalTokens} tokens)`)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const toggleSection = (id: string) => {
    setExpandedSections((prev: Record<string, boolean>) => ({ ...prev, [id]: !prev[id] }))
  }

  const formatEntryContent = (entry: KnowledgeEntry) => {
    const content = entry.editedContent || entry.content
    if (content.length > 200) {
      return content.substring(0, 200) + '...'
    }
    return content
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Knowledge Base
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSync}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Sync
          </Button>
          <Button variant="outline" size="sm" onClick={handleCreateCheckpoint}>
            <Star className="w-4 h-4 mr-1" />
            Checkpoint
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b dark:border-gray-700">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'browse'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Browse ({filteredEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'search'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Search
        </button>
        <button
          onClick={() => setActiveTab('checkpoints')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'checkpoints'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Checkpoints ({checkpoints.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'checkpoints' ? (
          <CheckpointsView
            checkpoints={checkpoints}
            onRollback={handleRollback}
            onExport={handleExport}
            onStar={async (id, starred) => {
              await vectorStore.setCheckpointStarred(id, starred)
              await loadData()
            }}
          />
        ) : (
          <div className="flex h-full">
            {/* List Panel */}
            <div className="w-1/2 border-r dark:border-gray-700 overflow-y-auto">
              {/* Search Bar */}
              <div className="p-4 border-b dark:border-gray-700">
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search knowledge..."
                    className="flex-1"
                  />
                  <Button onClick={handleSearch} disabled={isSearching}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mt-2">
                  <select
                    value={filters.type}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(f => ({ ...f, type: e.target.value }))}
                    className="text-xs px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-600"
                  >
                    <option value="all">All Types</option>
                    <option value="conversation">Conversations</option>
                    <option value="message">Messages</option>
                    <option value="contact">Contacts</option>
                    <option value="document">Documents</option>
                  </select>

                  <select
                    value={filters.dateRange}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(f => ({ ...f, dateRange: e.target.value as any }))}
                    className="text-xs px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-600"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>

                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.starred}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(f => ({ ...f, starred: e.target.checked }))}
                      className="rounded"
                    />
                    Starred
                  </label>
                </div>
              </div>

              {/* Entries List */}
              <div className="divide-y dark:divide-gray-700">
                {filteredEntries.map((entry: KnowledgeEntry, index: number) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    isExpanded={expandedSections[entry.id]}
                    onClick={() => {
                      setSelectedEntry(entry)
                      toggleSection(entry.id)
                    }}
                    onStar={(starred) => handleStarEntry(entry.id, starred)}
                  />
                ))}

                {filteredEntries.length === 0 && (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No entries found. Try syncing or adjusting filters.
                  </div>
                )}
              </div>
            </div>

            {/* Detail Panel */}
            <div className="w-1/2 overflow-y-auto">
              {editingEntry ? (
                <EditView
                  entry={editingEntry}
                  content={editContent}
                  onChange={setEditContent}
                  onSave={handleSaveEdit}
                  onCancel={() => {
                    setEditingEntry(null)
                    setEditContent('')
                  }}
                />
              ) : selectedEntry ? (
                <DetailView
                  entry={selectedEntry}
                  onEdit={() => {
                    setEditingEntry(selectedEntry)
                    setEditContent(selectedEntry.editedContent || selectedEntry.content)
                  }}
                />
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  Select an entry to view details
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ==========================================================================
// SUB-COMPONENTS
// ==========================================================================

interface EntryRowProps {
  entry: KnowledgeEntry
  isExpanded: boolean
  onClick: () => void
  onStar: (starred: boolean) => void
}

function EntryRow({ entry, isExpanded, onClick, onStar }: EntryRowProps) {
  const typeColors = {
    conversation: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    message: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    document: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    contact: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  }

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer group"
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onStar(!entry.metadata.starred)
        }}
        className="flex-shrink-0 mt-1"
      >
        <Star
          className={`w-4 h-4 ${
            entry.metadata.starred
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300 dark:text-gray-600'
          }`}
        />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-1.5 py-0.5 rounded ${typeColors[entry.type]}`}>
            {entry.type}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(entry.metadata.timestamp).toLocaleString()}
          </span>
          {entry.editedContent && (
            <span className="text-xs text-orange-600 dark:text-orange-400">
              Edited
            </span>
          )}
        </div>
        <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
          {entry.editedContent || entry.content}
        </p>
      </div>

      {isExpanded ? (
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-2" />
      ) : (
        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-2" />
      )}
    </div>
  )
}

interface DetailViewProps {
  entry: KnowledgeEntry
  onEdit: () => void
}

function DetailView({ entry, onEdit }: DetailViewProps) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
            {entry.type}
          </span>
          {entry.metadata.starred && (
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="w-4 h-4 mr-1" />
          Edit
        </Button>
      </div>

      <div className="prose dark:prose-invert max-w-none text-sm">
        <p className="whitespace-pre-wrap">{entry.content}</p>
      </div>

      {entry.editedContent && (
        <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <p className="text-xs text-orange-700 dark:text-orange-300 mb-1">
            Original version:
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
            {entry.content}
          </p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t dark:border-gray-700">
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">ID</dt>
            <dd className="font-mono text-gray-900 dark:text-white">{entry.id}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Source</dt>
            <dd className="font-mono text-gray-900 dark:text-white">{entry.sourceId}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Created</dt>
            <dd className="text-gray-900 dark:text-white">
              {new Date(entry.metadata.timestamp).toLocaleString()}
            </dd>
          </div>
          {entry.editedAt && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Edited</dt>
              <dd className="text-gray-900 dark:text-white">
                {new Date(entry.editedAt).toLocaleString()}
              </dd>
            </div>
          )}
          {entry.metadata.importance !== undefined && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Importance</dt>
              <dd className="text-gray-900 dark:text-white">
                {Math.round(entry.metadata.importance * 100)}%
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}

interface EditViewProps {
  entry: KnowledgeEntry
  content: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

function EditView({ entry, content, onChange, onSave, onCancel }: EditViewProps) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900 dark:text-white">
          Editing: {entry.type}
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSave}>
            Save
          </Button>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          This edit will be stored separately from the original. You can rollback to the original at any time.
        </p>
      </div>
    </div>
  )
}

interface CheckpointsViewProps {
  checkpoints: Checkpoint[]
  onRollback: (id: string) => void
  onExport: (id?: string) => void
  onStar: (id: string, starred: boolean) => void
}

function CheckpointsView({ checkpoints, onRollback, onExport, onStar }: CheckpointsViewProps) {
  return (
    <div className="p-4 overflow-y-auto">
      <div className="space-y-3">
        {checkpoints.map(cp => (
          <Card key={cp.id} className={`p-4 ${cp.isStarred ? 'ring-2 ring-yellow-400' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {cp.name}
                  </h4>
                  {cp.isStarred && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 rounded-full">
                      Stable
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {cp.entryCount} entries • {new Date(cp.createdAt).toLocaleString()}
                </p>
                {cp.description && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                    {cp.description}
                  </p>
                )}
                {cp.tags.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {cp.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <button
                  onClick={() => onStar(cp.id, !cp.isStarred)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title={cp.isStarred ? 'Unmark as stable' : 'Mark as stable'}
                >
                  <Star className={`w-4 h-4 ${cp.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                </button>
                <button
                  onClick={() => onExport(cp.id)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Export for LoRA training"
                >
                  <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => onRollback(cp.id)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Rollback to this checkpoint"
                >
                  <Undo className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </Card>
        ))}

        {checkpoints.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No checkpoints yet.</p>
            <p className="text-sm mt-1">Create a checkpoint to save the current knowledge state.</p>
          </div>
        )}
      </div>
    </div>
  )
}
