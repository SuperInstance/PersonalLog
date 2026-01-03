/**
 * Unit tests for Conversation Store
 * @module lib/storage/conversation-store.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createConversation,
  getConversation,
  listConversations,
  updateConversation,
  deleteConversation,
  pinConversation,
  archiveConversation,
  addMessage,
  getMessages,
  updateMessage,
  deleteMessage,
  setMessageSelection,
  getSelectedMessages,
  clearSelection,
  compactConversation,
  estimateTokens,
  getConversationTokenCount,
  searchConversations,
} from './conversation-store'
import { ValidationError, NotFoundError, StorageError } from '@/lib/errors'

// Mock IndexedDB
const mockDB = {
  transaction: vi.fn(),
  close: vi.fn(),
}

const mockStore = {
  add: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  index: vi.fn(),
}

const mockRequest: {
  result: any;
  error: any;
  onsuccess: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
} = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null,
}

describe('Conversation Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset IndexedDB mock
    global.indexedDB = {
      open: vi.fn(() => ({
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: mockDB,
      })),
    } as any
  })

  describe('createConversation', () => {
    it('should create a new conversation with valid title', async () => {
      const mockTransaction = {
        objectStore: vi.fn(() => mockStore),
      }
      mockDB.transaction.mockReturnValue(mockTransaction)

      mockStore.add.mockImplementation(() => {
        const request = { ...mockRequest, result: { id: 'conv-1' } }
        if (request.onsuccess) request.onsuccess({ target: request } as any)
        return request
      })

      const result = await createConversation('Test Conversation')

      expect(result).toHaveProperty('id')
      expect(result.title).toBe('Test Conversation')
      expect(result.type).toBe('personal')
      expect(result.metadata.messageCount).toBe(0)
      expect(result.metadata.pinned).toBe(false)
      expect(result.metadata.archived).toBe(false)
    })

    it('should throw ValidationError for empty title', async () => {
      await expect(createConversation('')).rejects.toThrow(ValidationError)
      await expect(createConversation('   ')).rejects.toThrow(ValidationError)
    })

    it('should create conversation with custom type', async () => {
      const mockTransaction = {
        objectStore: vi.fn(() => mockStore),
      }
      mockDB.transaction.mockReturnValue(mockTransaction)

      mockStore.add.mockImplementation(() => {
        const request = { ...mockRequest, result: { id: 'conv-1' } }
        if (request.onsuccess) request.onsuccess({ target: request } as any)
        return request
      })

      const result = await createConversation('Work', 'personal')

      expect(result.type).toBe('personal')
    })
  })

  describe('getConversation', () => {
    it('should retrieve existing conversation', async () => {
      const mockConversation = {
        id: 'conv-1',
        title: 'Test',
        type: 'personal' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        messages: [],
        aiContacts: [],
        settings: {
          responseMode: 'messenger' as const,
          compactOnLimit: true,
          compactStrategy: 'summarize' as const,
        },
        metadata: {
          messageCount: 0,
          totalTokens: 0,
          hasMedia: false,
          tags: [],
          pinned: false,
          archived: false,
        },
      }

      const mockTransaction = {
        objectStore: vi.fn(() => mockStore),
      }
      mockDB.transaction.mockReturnValue(mockTransaction)

      mockStore.get.mockImplementation(() => {
        const request = { ...mockRequest, result: mockConversation }
        if (request.onsuccess) request.onsuccess({ target: request } as any)
        return request
      })

      const result = await getConversation('conv-1')

      expect(result).toEqual(mockConversation)
    })

    it('should return null for non-existent conversation', async () => {
      const mockTransaction = {
        objectStore: vi.fn(() => mockStore),
      }
      mockDB.transaction.mockReturnValue(mockTransaction)

      mockStore.get.mockImplementation(() => {
        const request = { ...mockRequest, result: undefined }
        if (request.onsuccess) request.onsuccess({ target: request } as any)
        return request
      })

      const result = await getConversation('non-existent')

      expect(result).toBeNull()
    })

    it('should throw ValidationError for empty ID', async () => {
      await expect(getConversation('')).rejects.toThrow(ValidationError)
    })
  })

  describe('updateConversation', () => {
    it('should update conversation with valid data', async () => {
      const existing = {
        id: 'conv-1',
        title: 'Old Title',
        type: 'personal' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        messages: [],
        aiContacts: [],
        settings: {
          responseMode: 'messenger' as const,
          compactOnLimit: true,
          compactStrategy: 'summarize' as const,
        },
        metadata: {
          messageCount: 0,
          totalTokens: 0,
          hasMedia: false,
          tags: [],
          pinned: false,
          archived: false,
        },
      }

      const mockTransaction = {
        objectStore: vi.fn(() => mockStore),
      }
      mockDB.transaction.mockReturnValue(mockTransaction)

      // Mock getConversation
      mockStore.get.mockImplementation(() => {
        const request = { ...mockRequest, result: existing }
        if (request.onsuccess) request.onsuccess({ target: request } as any)
        return request
      })

      mockStore.put.mockImplementation(() => {
        const request = { ...mockRequest }
        if (request.onsuccess) request.onsuccess({ target: request } as any)
        return request
      })

      const result = await updateConversation('conv-1', { title: 'New Title' })

      expect(result.title).toBe('New Title')
      expect(result.id).toBe('conv-1')
      expect(result.createdAt).toBe(existing.createdAt)
      expect(result.updatedAt).not.toBe(existing.updatedAt)
    })

    it('should throw NotFoundError for non-existent conversation', async () => {
      const mockTransaction = {
        objectStore: vi.fn(() => mockStore),
      }
      mockDB.transaction.mockReturnValue(mockTransaction)

      mockStore.get.mockImplementation(() => {
        const request = { ...mockRequest, result: null }
        if (request.onsuccess) request.onsuccess({ target: request } as any)
        return request
      })

      await expect(
        updateConversation('non-existent', { title: 'New Title' })
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('pinConversation', () => {
    it('should pin a conversation', async () => {
      const existing = {
        id: 'conv-1',
        title: 'Test',
        type: 'personal' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        messages: [],
        aiContacts: [],
        settings: {
          responseMode: 'messenger' as const,
          compactOnLimit: true,
          compactStrategy: 'summarize' as const,
        },
        metadata: {
          messageCount: 0,
          totalTokens: 0,
          hasMedia: false,
          tags: [],
          pinned: false,
          archived: false,
        },
      }

      const mockTransaction = {
        objectStore: vi.fn(() => mockStore),
      }
      mockDB.transaction.mockReturnValue(mockTransaction)

      mockStore.get.mockImplementation(() => {
        const request = { ...mockRequest, result: existing }
        if (request.onsuccess) request.onsuccess({ target: request } as any)
        return request
      })

      mockStore.put.mockImplementation(() => {
        const request = { ...mockRequest }
        if (request.onsuccess) request.onsuccess({ target: request } as any)
        return request
      })

      await pinConversation('conv-1', true)

      expect(mockStore.put).toHaveBeenCalled()
    })
  })

  describe('archiveConversation', () => {
    it('should archive a conversation', async () => {
      const existing = {
        id: 'conv-1',
        title: 'Test',
        type: 'personal' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        messages: [],
        aiContacts: [],
        settings: {
          responseMode: 'messenger' as const,
          compactOnLimit: true,
          compactStrategy: 'summarize' as const,
        },
        metadata: {
          messageCount: 0,
          totalTokens: 0,
          hasMedia: false,
          tags: [],
          pinned: false,
          archived: false,
        },
      }

      const mockTransaction = {
        objectStore: vi.fn(() => mockStore),
      }
      mockDB.transaction.mockReturnValue(mockTransaction)

      mockStore.get.mockImplementation(() => {
        const request = { ...mockRequest, result: existing }
        if (request.onsuccess) request.onsuccess({ target: request } as any)
        return request
      })

      mockStore.put.mockImplementation(() => {
        const request = { ...mockRequest }
        if (request.onsuccess) request.onsuccess({ target: request } as any)
        return request
      })

      await archiveConversation('conv-1', true)

      expect(mockStore.put).toHaveBeenCalled()
    })
  })

  describe('addMessage', () => {
    it('should add a message to conversation', async () => {
      const mockMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        type: 'text' as const,
        author: 'user',
        content: { text: 'Hello' },
        timestamp: '2024-01-01T00:00:00Z',
        metadata: {},
      }

      const mockConversation = {
        id: 'conv-1',
        title: 'Test',
        type: 'personal' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        messages: [],
        aiContacts: [],
        settings: {
          responseMode: 'messenger' as const,
          compactOnLimit: true,
          compactStrategy: 'summarize' as const,
        },
        metadata: {
          messageCount: 0,
          totalTokens: 0,
          hasMedia: false,
          tags: [],
          pinned: false,
          archived: false,
        },
      }

      const mockTransaction = {
        objectStore: vi.fn(() => mockStore),
      }
      mockDB.transaction.mockReturnValue(mockTransaction)

      let callCount = 0
      mockStore.add.mockImplementation(() => {
        const request = { ...mockRequest, result: mockMessage }
        if (request.onsuccess) request.onsuccess({ target: request } as any)
        return request
      })

      mockStore.get.mockImplementation(() => {
        const request = { ...mockRequest, result: mockConversation }
        if (request.onsuccess) request.onsuccess({ target: request } as any)
        return request
      })

      mockStore.put.mockImplementation(() => {
        const request = { ...mockRequest }
        if (request.onsuccess) request.onsuccess({ target: request } as any)
        callCount++
        return request
      })

      const result = await addMessage('conv-1', 'text', 'user', { text: 'Hello' })

      expect(result.content.text).toBe('Hello')
      expect(result.conversationId).toBe('conv-1')
      expect(mockStore.add).toHaveBeenCalled()
    })
  })

  describe('estimateTokens', () => {
    it('should estimate tokens for short text', async () => {
      const result = await estimateTokens('Hello world')
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(10)
    })

    it('should estimate tokens for long text', async () => {
      const text = 'a'.repeat(1000)
      const result = await estimateTokens(text)
      expect(result).toBeGreaterThan(200)
      expect(result).toBeLessThan(300)
    })

    it('should handle empty string', async () => {
      const result = await estimateTokens('')
      expect(result).toBe(0)
    })
  })

  describe('searchConversations', () => {
    it('should return all conversations when query is empty', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          title: 'Test 1',
          type: 'personal' as const,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          messages: [],
          aiContacts: [],
          settings: {
            responseMode: 'messenger' as const,
            compactOnLimit: true,
            compactStrategy: 'summarize' as const,
          },
          metadata: {
            messageCount: 0,
            totalTokens: 0,
            hasMedia: false,
            tags: [],
            pinned: false,
            archived: false,
          },
        },
      ]

      const mockTransaction = {
        objectStore: vi.fn(() => mockStore),
      }
      mockDB.transaction.mockReturnValue(mockTransaction)

      const mockIndex = {
        openCursor: vi.fn(() => {
          const request = { ...mockRequest }
          if (request.onsuccess) {
            // Simulate cursor returning results then ending
            let cursorCalled = false
            request.onsuccess({
              target: {
                result: cursorCalled ? null : {
                  value: mockConversations[0],
                  continue: vi.fn(),
                },
              },
            } as any)
            cursorCalled = true
          }
          return request
        }),
      }

      mockStore.index.mockReturnValue(mockIndex)

      const results = await searchConversations('')

      expect(results).toHaveLength(1)
    })
  })
})
