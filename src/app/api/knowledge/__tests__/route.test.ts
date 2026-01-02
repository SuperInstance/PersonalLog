/**
 * Knowledge API Route Tests
 *
 * Tests for /api/knowledge endpoint
 * - GET: Search, list entries, checkpoints, status
 * - POST: Sync, add/update entries, create checkpoints, rollback, export
 * - DELETE: Delete entries or checkpoints
 * - Vector store operations
 * - Sync worker operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST, DELETE } from '../route'
import {
  createMockRequest,
  createMockGETRequest,
  createMockDELETERequest,
  createMockVectorStore,
  extractResponseData,
  assertSuccess,
  assertError,
} from '@/__tests__/helpers/api-helpers'

// Mock vector store
vi.mock('@/lib/knowledge/vector-store', () => ({
  getVectorStore: vi.fn(),
}))

// Mock sync worker
vi.mock('@/lib/knowledge/sync-worker', () => ({
  getSyncWorker: vi.fn(),
}))

import { getVectorStore } from '@/lib/knowledge/vector-store'
import { getSyncWorker } from '@/lib/knowledge/sync-worker'

describe('GET /api/knowledge', () => {
  let mockStore: ReturnType<typeof createMockVectorStore>

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore = createMockVectorStore()

    vi.mocked(getVectorStore).mockReturnValue(mockStore as any)
    vi.mocked(getSyncWorker).mockReturnValue({
      getStatus: vi.fn().mockReturnValue({ status: 'idle', progress: 0 }),
    } as any)
  })

  it('should perform hybrid search with query', async () => {
    const searchResults = [
      { id: '1', content: 'Test result', score: 0.9 },
      { id: '2', content: 'Another result', score: 0.8 },
    ]
    mockStore.hybridSearch = vi.fn().mockResolvedValue(searchResults)

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/knowledge',
      params: { action: 'search', query: 'test query' },
    })

    const response = await GET(request)
    assertSuccess(response)

    const data = await extractResponseData<{
      results: unknown[]
      count: number
    }>(response)

    expect(data.results).toHaveLength(2)
    expect(data.count).toBe(2)
    expect(mockStore.hybridSearch).toHaveBeenCalledWith('test query', {
      limit: 10,
      threshold: 0.7,
    })
  })

  it('should support custom search parameters', async () => {
    mockStore.hybridSearch = vi.fn().mockResolvedValue([])

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/knowledge',
      params: {
        action: 'search',
        query: 'test',
        limit: '20',
        threshold: '0.8',
      },
    })

    const response = await GET(request)
    assertSuccess(response)

    expect(mockStore.hybridSearch).toHaveBeenCalledWith('test', {
      limit: 20,
      threshold: 0.8,
    })
  })

  it('should list knowledge entries', async () => {
    const entries = [
      { id: '1', type: 'document', content: 'Doc 1' },
      { id: '2', type: 'note', content: 'Note 1' },
    ]
    mockStore.getEntries = vi.fn().mockResolvedValue(entries)

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/knowledge',
      params: { action: 'entries' },
    })

    const response = await GET(request)
    assertSuccess(response)

    const data = await extractResponseData<{ entries: unknown[] }>(response)
    expect(data.entries).toHaveLength(2)
    expect(mockStore.getEntries).toHaveBeenCalledWith({ type: undefined })
  })

  it('should filter entries by type', async () => {
    mockStore.getEntries = vi.fn().mockResolvedValue([])

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/knowledge',
      params: { action: 'entries', type: 'document' },
    })

    const response = await GET(request)
    assertSuccess(response)

    expect(mockStore.getEntries).toHaveBeenCalledWith({ type: 'document' })
  })

  it('should list checkpoints', async () => {
    const checkpoints = [
      { id: 'cp-1', name: 'Checkpoint 1', createdAt: '2024-01-01' },
      { id: 'cp-2', name: 'Checkpoint 2', createdAt: '2024-01-02' },
    ]
    mockStore.getCheckpoints = vi.fn().mockResolvedValue(checkpoints)

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/knowledge',
      params: { action: 'checkpoints' },
    })

    const response = await GET(request)
    assertSuccess(response)

    const data = await extractResponseData<{ checkpoints: unknown[] }>(response)
    expect(data.checkpoints).toHaveLength(2)
  })

  it('should get sync worker status', async () => {
    const mockSyncWorker = {
      getStatus: vi.fn().mockReturnValue({
        status: 'syncing',
        progress: 0.5,
        currentFile: 'test.txt',
      }),
    }
    vi.mocked(getSyncWorker).mockReturnValue(mockSyncWorker as any)

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/knowledge',
      params: { action: 'status' },
    })

    const response = await GET(request)
    assertSuccess(response)

    const data = await extractResponseData<{ status: unknown }>(response)
    expect(data.status).toEqual({
      status: 'syncing',
      progress: 0.5,
      currentFile: 'test.txt',
    })
  })

  it('should return error for unknown action', async () => {
    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/knowledge',
      params: { action: 'unknown' },
    })

    const response = await GET(request)
    assertError(response, 400)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Unknown action')
  })

  it('should handle search errors gracefully', async () => {
    mockStore.hybridSearch = vi.fn().mockRejectedValue(new Error('Search failed'))

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/knowledge',
      params: { action: 'search', query: 'test' },
    })

    const response = await GET(request)
    assertError(response, 500)
  })

  it('should handle missing query for search', async () => {
    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/knowledge',
      params: { action: 'search' },
    })

    const response = await GET(request)
    assertError(response, 400)
  })
})

describe('POST /api/knowledge', () => {
  let mockStore: ReturnType<typeof createMockVectorStore>

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore = createMockVectorStore()

    vi.mocked(getVectorStore).mockReturnValue(mockStore as any)
    vi.mocked(getSyncWorker).mockReturnValue({
      sync: vi.fn().mockResolvedValue({ success: true, entriesProcessed: 10 }),
    } as any)
  })

  it('should trigger knowledge sync', async () => {
    const mockSyncWorker = {
      sync: vi.fn().mockResolvedValue({ success: true, entriesProcessed: 10 }),
    }
    vi.mocked(getSyncWorker).mockReturnValue(mockSyncWorker as any)

    const request = createMockRequest({
      body: { action: 'sync' },
    })

    const response = await POST(request)
    assertSuccess(response)

    const data = await extractResponseData<{ result: unknown }>(response)
    expect(data.result).toEqual({ success: true, entriesProcessed: 10 })
    expect(mockSyncWorker.sync).toHaveBeenCalled()
  })

  it('should add a new knowledge entry', async () => {
    const newEntry = { id: 'entry-1', content: 'New entry', type: 'note' }
    mockStore.addEntry = vi.fn().mockResolvedValue(newEntry)

    const request = createMockRequest({
      body: {
        action: 'add-entry',
        entry: { content: 'New entry', type: 'note' },
      },
    })

    const response = await POST(request)
    assertSuccess(response)

    const data = await extractResponseData<{ entry: unknown }>(response)
    expect(data.entry).toBeTruthy()
    expect(mockStore.addEntry).toHaveBeenCalledWith({
      content: 'New entry',
      type: 'note',
    })
  })

  it('should update a knowledge entry', async () => {
    const updatedEntry = { id: 'entry-1', content: 'Updated content' }
    mockStore.updateEntry = vi.fn().mockResolvedValue(updatedEntry)

    const request = createMockRequest({
      body: {
        action: 'update-entry',
        id: 'entry-1',
        updates: { content: 'Updated content' },
      },
    })

    const response = await POST(request)
    assertSuccess(response)

    const data = await extractResponseData<{ entry: unknown }>(response)
    expect(data.entry).toBeTruthy()
    expect(mockStore.updateEntry).toHaveBeenCalledWith('entry-1', {
      content: 'Updated content',
    })
  })

  it('should create a checkpoint', async () => {
    const checkpoint = {
      id: 'cp-1',
      name: 'Test Checkpoint',
      description: 'Test description',
      tags: ['test'],
    }
    mockStore.createCheckpoint = vi.fn().mockResolvedValue(checkpoint)

    const request = createMockRequest({
      body: {
        action: 'create-checkpoint',
        name: 'Test Checkpoint',
        description: 'Test description',
        tags: ['test'],
      },
    })

    const response = await POST(request)
    assertSuccess(response)

    const data = await extractResponseData<{ checkpoint: unknown }>(response)
    expect(data.checkpoint).toBeTruthy()
    expect(mockStore.createCheckpoint).toHaveBeenCalledWith('Test Checkpoint', {
      description: 'Test description',
      tags: ['test'],
    })
  })

  it('should rollback to checkpoint', async () => {
    mockStore.rollbackToCheckpoint = vi.fn().mockResolvedValue({
      success: true,
      entriesRestored: 5,
    })

    const request = createMockRequest({
      body: {
        action: 'rollback',
        checkpointId: 'cp-1',
      },
    })

    const response = await POST(request)
    assertSuccess(response)

    const data = await extractResponseData<{ result: unknown }>(response)
    expect(data.result).toEqual({ success: true, entriesRestored: 5 })
    expect(mockStore.rollbackToCheckpoint).toHaveBeenCalledWith('cp-1')
  })

  it('should export knowledge for LoRA training', async () => {
    const exportData = {
      format: 'jsonl',
      entries: 10,
      size: 1024,
    }
    mockStore.exportForLoRA = vi.fn().mockResolvedValue(exportData)

    const request = createMockRequest({
      body: {
        action: 'export',
        checkpointId: 'cp-1',
        format: 'jsonl',
      },
    })

    const response = await POST(request)
    assertSuccess(response)

    const data = await extractResponseData<{ export: unknown }>(response)
    expect(data.export).toEqual(exportData)
    expect(mockStore.exportForLoRA).toHaveBeenCalledWith('cp-1', 'jsonl')
  })

  it('should support different export formats', async () => {
    mockStore.exportForLoRA = vi.fn().mockResolvedValue({})

    const request = createMockRequest({
      body: {
        action: 'export',
        checkpointId: 'cp-1',
        format: 'json',
      },
    })

    const response = await POST(request)
    assertSuccess(response)

    expect(mockStore.exportForLoRA).toHaveBeenCalledWith('cp-1', 'json')
  })

  it('should default export format to jsonl', async () => {
    mockStore.exportForLoRA = vi.fn().mockResolvedValue({})

    const request = createMockRequest({
      body: {
        action: 'export',
        checkpointId: 'cp-1',
      },
    })

    const response = await POST(request)
    assertSuccess(response)

    expect(mockStore.exportForLoRA).toHaveBeenCalledWith('cp-1', 'jsonl')
  })

  it('should return error for unknown action', async () => {
    const request = createMockRequest({
      body: { action: 'unknown-action' },
    })

    const response = await POST(request)
    assertError(response, 400)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Unknown action')
  })

  it('should handle sync errors gracefully', async () => {
    const mockSyncWorker = {
      sync: vi.fn().mockRejectedValue(new Error('Sync failed')),
    }
    vi.mocked(getSyncWorker).mockReturnValue(mockSyncWorker as any)

    const request = createMockRequest({
      body: { action: 'sync' },
    })

    const response = await POST(request)
    assertError(response, 500)
  })

  it('should handle add entry errors', async () => {
    mockStore.addEntry = vi.fn().mockRejectedValue(new Error('Invalid entry'))

    const request = createMockRequest({
      body: {
        action: 'add-entry',
        entry: { content: 'Test' },
      },
    })

    const response = await POST(request)
    assertError(response, 500)
  })
})

describe('DELETE /api/knowledge', () => {
  let mockStore: ReturnType<typeof createMockVectorStore>

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore = createMockVectorStore()

    vi.mocked(getVectorStore).mockReturnValue(mockStore as any)
  })

  it('should delete a knowledge entry', async () => {
    mockStore.deleteEntry = vi.fn().mockResolvedValue(undefined)

    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/knowledge',
      params: { action: 'entry', id: 'entry-123' },
    })

    const response = await DELETE(request)
    assertSuccess(response)

    const data = await extractResponseData<{ success: boolean }>(response)
    expect(data.success).toBe(true)
    expect(mockStore.deleteEntry).toHaveBeenCalledWith('entry-123')
  })

  it('should require ID parameter', async () => {
    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/knowledge',
      params: { action: 'entry' },
    })

    const response = await DELETE(request)
    assertError(response, 400)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('ID required')
  })

  it('should require action parameter', async () => {
    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/knowledge',
      params: { id: 'entry-123' },
    })

    const response = await DELETE(request)
    assertError(response, 400)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Unknown action')
  })

  it('should handle deletion errors gracefully', async () => {
    mockStore.deleteEntry = vi
      .fn()
      .mockRejectedValue(new Error('Entry not found'))

    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/knowledge',
      params: { action: 'entry', id: 'non-existent' },
    })

    const response = await DELETE(request)
    assertError(response, 500)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Entry not found')
  })

  it('should handle empty ID', async () => {
    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/knowledge',
      params: { action: 'entry', id: '' },
    })

    const response = await DELETE(request)
    assertError(response, 400)
  })
})

describe('Integration scenarios', () => {
  let mockStore: ReturnType<typeof createMockVectorStore>

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore = createMockVectorStore()

    vi.mocked(getVectorStore).mockReturnValue(mockStore as any)
    vi.mocked(getSyncWorker).mockReturnValue({
      sync: vi.fn().mockResolvedValue({ success: true }),
      getStatus: vi.fn().mockReturnValue({ status: 'idle' }),
    } as any)
  })

  it('should handle sync then search workflow', async () => {
    const mockSyncWorker = {
      sync: vi.fn().mockResolvedValue({ success: true, entriesProcessed: 5 }),
    }
    vi.mocked(getSyncWorker).mockReturnValue(mockSyncWorker as any)

    // Trigger sync
    const postRequest = createMockRequest({
      body: { action: 'sync' },
    })
    const postResponse = await POST(postRequest)
    assertSuccess(postResponse)

    // Search knowledge
    mockStore.hybridSearch = vi.fn().mockResolvedValue([
      { id: '1', content: 'Result 1' },
    ])

    const getRequest = createMockGETRequest({
      url: 'http://localhost:3000/api/knowledge',
      params: { action: 'search', query: 'test' },
    })
    const getResponse = await GET(getRequest)
    assertSuccess(getResponse)

    const data = await extractResponseData<{
      results: unknown[]
      count: number
    }>(getResponse)
    expect(data.results).toHaveLength(1)
  })

  it('should handle add entry then create checkpoint workflow', async () => {
    // Add entry
    const newEntry = { id: 'entry-1', content: 'New entry' }
    mockStore.addEntry = vi.fn().mockResolvedValue(newEntry)

    const addRequest = createMockRequest({
      body: {
        action: 'add-entry',
        entry: { content: 'New entry' },
      },
    })
    const addResponse = await POST(addRequest)
    assertSuccess(addResponse)

    // Create checkpoint
    const checkpoint = { id: 'cp-1', name: 'Checkpoint' }
    mockStore.createCheckpoint = vi.fn().mockResolvedValue(checkpoint)

    const cpRequest = createMockRequest({
      body: {
        action: 'create-checkpoint',
        name: 'Checkpoint',
      },
    })
    const cpResponse = await POST(cpRequest)
    assertSuccess(cpResponse)

    const data = await extractResponseData<{ checkpoint: unknown }>(cpResponse)
    expect(data.checkpoint).toBeTruthy()
  })

  it('should handle export then rollback workflow', async () => {
    // Export
    mockStore.exportForLoRA = vi.fn().mockResolvedValue({
      format: 'jsonl',
      entries: 10,
    })

    const exportRequest = createMockRequest({
      body: {
        action: 'export',
        checkpointId: 'cp-1',
      },
    })
    const exportResponse = await POST(exportRequest)
    assertSuccess(exportResponse)

    // Rollback
    mockStore.rollbackToCheckpoint = vi.fn().mockResolvedValue({
      success: true,
    })

    const rollbackRequest = createMockRequest({
      body: {
        action: 'rollback',
        checkpointId: 'cp-1',
      },
    })
    const rollbackResponse = await POST(rollbackRequest)
    assertSuccess(rollbackResponse)

    const data = await extractResponseData<{ result: unknown }>(rollbackResponse)
    expect(data.result).toEqual({ success: true })
  })
})
