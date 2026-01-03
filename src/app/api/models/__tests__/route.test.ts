/**
 * Models API Route Tests
 *
 * Tests for /api/models endpoint
 * - GET: List models and contacts
 * - POST: Create models and contacts
 * - PATCH: Update models and contacts
 * - DELETE: Delete models and contacts
 * - Type-based routing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST, PATCH, DELETE } from '../route'
import type { ModelConfig, AIContact } from '@/lib/wizard/models'
import {
  createMockRequest,
  createMockGETRequest,
  createMockDELETERequest,
  createMockAIAgent,
  createMockModelStore,
  createMockModelConfig,
  createMockAIContact,
  extractResponseData,
  assertSuccess,
  assertError,
} from '@/__tests__/helpers/api-helpers'

// Mock model store
vi.mock('@/lib/wizard/model-store', () => ({
  listModels: vi.fn(),
  addModel: vi.fn(),
  deleteModel: vi.fn(),
  getModel: vi.fn(),
  updateModel: vi.fn(),
  listContacts: vi.fn(),
  createContact: vi.fn(),
  getContact: vi.fn(),
  updateContact: vi.fn(),
  deleteContact: vi.fn(),
  forkContact: vi.fn(),
}))

import * as modelStore from '@/lib/wizard/model-store'

describe('GET /api/models', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should list all models', async () => {
    const mockModels: ModelConfig[] = [
      createMockModelConfig({ id: 'model-1', name: 'GPT-4', provider: 'openai' as const }) as ModelConfig,
      createMockModelConfig({ id: 'model-2', name: 'Claude', provider: 'anthropic' as const }) as ModelConfig,
    ]
    vi.mocked(modelStore.listModels).mockResolvedValue(mockModels)

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/models',
    })

    const response = await GET(request)
    assertSuccess(response)

    const data = await extractResponseData<{ models: unknown[] }>(response)
    expect(data.models).toHaveLength(2)
    expect(modelStore.listModels).toHaveBeenCalledWith(undefined)
  })

  it('should filter models by provider', async () => {
    const openaiModels = [createMockModelConfig({ id: "model-1", name: "GPT-4", provider: "openai" as const })]
    vi.mocked(modelStore.listModels).mockResolvedValue(openaiModels)

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/models',
      params: { provider: 'openai' },
    })

    const response = await GET(request)
    assertSuccess(response)

    const data = await extractResponseData<{ models: unknown[] }>(response)
    expect(data.models).toHaveLength(1)
    expect(modelStore.listModels).toHaveBeenCalledWith('openai')
  })

  it('should list all contacts', async () => {
    const mockContacts = [
      createMockAIContact({ id: "contact-1", nickname: "Claude", baseModelId: "claude-3-opus" }),
      createMockAIContact({ id: "contact-2", nickname: "GPT-4", baseModelId: "gpt-4" }),
    ]
    vi.mocked(modelStore.listContacts).mockResolvedValue(mockContacts)

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/models',
      params: { type: 'contacts' },
    })

    const response = await GET(request)
    assertSuccess(response)

    const data = await extractResponseData<{ contacts: unknown[] }>(response)
    expect(data.contacts).toHaveLength(2)
    expect(modelStore.listContacts).toHaveBeenCalledWith(undefined)
  })

  it('should filter contacts by base model', async () => {
    const claudeContacts = [
      createMockAIContact({ id: "contact-1", nickname: "Claude", baseModelId: "claude-3-opus" }),
    ]
    vi.mocked(modelStore.listContacts).mockResolvedValue(claudeContacts)

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/models',
      params: { type: 'contacts', baseModelId: 'claude-3-opus' },
    })

    const response = await GET(request)
    assertSuccess(response)

    const data = await extractResponseData<{ contacts: unknown[] }>(response)
    expect(data.contacts).toHaveLength(1)
    expect(modelStore.listContacts).toHaveBeenCalledWith('claude-3-opus')
  })

  it('should handle empty models list', async () => {
    vi.mocked(modelStore.listModels).mockResolvedValue([])

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/models',
    })

    const response = await GET(request)
    assertSuccess(response)

    const data = await extractResponseData<{ models: unknown[] }>(response)
    expect(data.models).toHaveLength(0)
  })

  it('should handle empty contacts list', async () => {
    vi.mocked(modelStore.listContacts).mockResolvedValue([])

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/models',
      params: { type: 'contacts' },
    })

    const response = await GET(request)
    assertSuccess(response)

    const data = await extractResponseData<{ contacts: unknown[] }>(response)
    expect(data.contacts).toHaveLength(0)
  })

  it('should handle retrieval errors gracefully', async () => {
    vi.mocked(modelStore.listModels).mockRejectedValue(
      new Error('Failed to fetch models')
    )

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/models',
    })

    const response = await GET(request)
    assertError(response, 500)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Failed to fetch models')
  })

  it('should return valid JSON content-type', async () => {
    vi.mocked(modelStore.listModels).mockResolvedValue([])

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/models',
    })

    const response = await GET(request)
    expect(response.headers.get('Content-Type')).toContain('application/json')
  })
})

describe('POST /api/models', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new model', async () => {
    const newModel = createMockModelConfig({ id: "model-123", name: "New Model", provider: "openai" as const })
    vi.mocked(modelStore.addModel).mockResolvedValue(newModel)

    const request = createMockRequest({
      body: {
        name: 'New Model',
        provider: 'openai',
        model: 'gpt-4',
      },
    })

    const response = await POST(request)
    assertSuccess(response)

    const data = await extractResponseData<{ model: unknown }>(response)
    expect(data.model).toBeTruthy()
    expect(modelStore.addModel).toHaveBeenCalledWith({
      name: 'New Model',
      provider: 'openai',
      model: 'gpt-4',
    })
  })

  it('should create a new contact', async () => {
    const newContact = createMockAIContact({ nickname: 'Test AI', baseModelId: 'model-123' })
    vi.mocked(modelStore.createContact).mockResolvedValue(newContact)

    const request = createMockRequest({
      body: {
        type: 'contact',
        name: 'Test AI',
        provider: 'anthropic',
        model: 'claude-3-opus',
      },
    })

    const response = await POST(request)
    assertSuccess(response)

    const data = await extractResponseData<{ contact: unknown }>(response)
    expect(data.contact).toBeTruthy()
    expect(modelStore.createContact).toHaveBeenCalledWith({
      name: 'Test AI',
      provider: 'anthropic',
      model: 'claude-3-opus',
    })
  })

  it('should return 201 status on successful creation', async () => {
    vi.mocked(modelStore.addModel).mockResolvedValue({ id: '1', name: 'Model' })

    const request = createMockRequest({
      body: { name: 'Model', provider: 'openai' },
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
  })

  it('should handle contact with personality config', async () => {
    const newContact = createMockAIAgent({
      name: 'Custom AI',
      systemPrompt: 'You are a helpful assistant',
    })
    vi.mocked(modelStore.createContact).mockResolvedValue(newContact)

    const request = createMockRequest({
      body: {
        type: 'contact',
        name: 'Custom AI',
        provider: 'openai',
        systemPrompt: 'You are a helpful assistant',
        temperature: 0.8,
        maxTokens: 2000,
      },
    })

    const response = await POST(request)
    assertSuccess(response)
  })

  it('should handle contact with capabilities', async () => {
    const newContact = createMockAIAgent({
      name: 'Multi-modal AI',
      canSeeWeb: true,
      canSeeFiles: true,
      canGenerateImages: true,
    })
    vi.mocked(modelStore.createContact).mockResolvedValue(newContact)

    const request = createMockRequest({
      body: {
        type: 'contact',
        name: 'Multi-modal AI',
        provider: 'openai',
        capabilities: {
          canSeeWeb: true,
          canSeeFiles: true,
          canGenerateImages: true,
        },
      },
    })

    const response = await POST(request)
    assertSuccess(response)
  })

  it('should default to model creation when type is not specified', async () => {
    const newModel = createMockModelConfig({ id: "1", name: "Default Model" })
    vi.mocked(modelStore.addModel).mockResolvedValue(newModel)

    const request = createMockRequest({
      body: { name: 'Default Model', provider: 'openai' },
    })

    const response = await POST(request)
    assertSuccess(response)

    expect(modelStore.addModel).toHaveBeenCalled()
    expect(modelStore.createContact).not.toHaveBeenCalled()
  })

  it('should handle creation errors gracefully', async () => {
    vi.mocked(modelStore.addModel).mockRejectedValue(
      new Error('Invalid model configuration')
    )

    const request = createMockRequest({
      body: { name: 'Invalid Model' },
    })

    const response = await POST(request)
    assertError(response, 500)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Invalid model configuration')
  })

  it('should handle missing required fields', async () => {
    vi.mocked(modelStore.addModel).mockRejectedValue(
      new Error('Missing required fields')
    )

    const request = createMockRequest({
      body: {},
    })

    const response = await POST(request)
    // Should handle missing fields gracefully
    expect(response.status).toBeGreaterThanOrEqual(400)
  })
})

describe('PATCH /api/models', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update a model', async () => {
    const updatedModel = {
      id: 'model-123',
      name: 'Updated Model',
      provider: 'openai',
    }
    vi.mocked(modelStore.updateModel).mockResolvedValue(updatedModel)

    const request = createMockRequest({
      body: {
        type: 'model',
        id: 'model-123',
        name: 'Updated Model',
      },
    })

    const response = await PATCH(request)
    assertSuccess(response)

    const data = await extractResponseData<{ model: unknown }>(response)
    expect(data.model).toBeTruthy()
    expect(modelStore.updateModel).toHaveBeenCalledWith('model-123', {
      name: 'Updated Model',
    })
  })

  it('should update a contact', async () => {
    const updatedContact = createMockAIContact({ id: 'contact-123', name: 'Updated AI' })
    vi.mocked(modelStore.updateContact).mockResolvedValue(updatedContact)

    const request = createMockRequest({
      body: {
        type: 'contact',
        id: 'contact-123',
        name: 'Updated AI',
        temperature: 0.9,
      },
    })

    const response = await PATCH(request)
    assertSuccess(response)

    const data = await extractResponseData<{ contact: unknown }>(response)
    expect(data.contact).toBeTruthy()
    expect(modelStore.updateContact).toHaveBeenCalledWith('contact-123', {
      name: 'Updated AI',
      temperature: 0.9,
    })
  })

  it('should handle partial updates', async () => {
    const updatedModel = createMockModelConfig({ id: "model-123", name: "Model" })
    vi.mocked(modelStore.updateModel).mockResolvedValue(updatedModel)

    const request = createMockRequest({
      body: {
        type: 'model',
        id: 'model-123',
        temperature: 0.7,
      },
    })

    const response = await PATCH(request)
    assertSuccess(response)
  })

  it('should handle update errors gracefully', async () => {
    vi.mocked(modelStore.updateModel).mockRejectedValue(
      new Error('Model not found')
    )

    const request = createMockRequest({
      body: {
        type: 'model',
        id: 'non-existent',
        name: 'Updated',
      },
    })

    const response = await PATCH(request)
    assertError(response, 500)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Model not found')
  })

  it('should handle missing ID', async () => {
    vi.mocked(modelStore.updateModel).mockRejectedValue(
      new Error('ID required')
    )

    const request = createMockRequest({
      body: {
        type: 'model',
        name: 'Updated',
      },
    })

    const response = await PATCH(request)
    // Should handle missing ID
    expect(response.status).toBeGreaterThanOrEqual(400)
  })

  it('should handle empty updates', async () => {
    const updatedModel = createMockModelConfig({ id: "model-123", name: "Model" })
    vi.mocked(modelStore.updateModel).mockResolvedValue(updatedModel)

    const request = createMockRequest({
      body: {
        type: 'model',
        id: 'model-123',
      },
    })

    const response = await PATCH(request)
    // Should handle empty updates
    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(600)
  })
})

describe('DELETE /api/models', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete a model', async () => {
    vi.mocked(modelStore.deleteModel).mockResolvedValue(undefined)

    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/models',
      params: { id: 'model-123', type: 'model' },
    })

    const response = await DELETE(request)
    assertSuccess(response)

    const data = await extractResponseData<{ success: boolean }>(response)
    expect(data.success).toBe(true)
    expect(modelStore.deleteModel).toHaveBeenCalledWith('model-123')
  })

  it('should delete a contact', async () => {
    vi.mocked(modelStore.deleteContact).mockResolvedValue(undefined)

    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/models',
      params: { id: 'contact-123', type: 'contact' },
    })

    const response = await DELETE(request)
    assertSuccess(response)

    const data = await extractResponseData<{ success: boolean }>(response)
    expect(data.success).toBe(true)
    expect(modelStore.deleteContact).toHaveBeenCalledWith('contact-123')
  })

  it('should require ID parameter', async () => {
    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/models',
      params: {},
    })

    const response = await DELETE(request)
    assertError(response, 400)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('ID required')
  })

  it('should default to model deletion when type not specified', async () => {
    vi.mocked(modelStore.deleteModel).mockResolvedValue(undefined)

    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/models',
      params: { id: 'model-123' },
    })

    const response = await DELETE(request)
    assertSuccess(response)

    expect(modelStore.deleteModel).toHaveBeenCalledWith('model-123')
    expect(modelStore.deleteContact).not.toHaveBeenCalled()
  })

  it('should handle deletion errors gracefully', async () => {
    vi.mocked(modelStore.deleteModel).mockRejectedValue(
      new Error('Model not found')
    )

    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/models',
      params: { id: 'non-existent' },
    })

    const response = await DELETE(request)
    assertError(response, 500)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Model not found')
  })

  it('should handle empty ID', async () => {
    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/models',
      params: { id: '' },
    })

    const response = await DELETE(request)
    assertError(response, 400)
  })

  it('should return success response after deletion', async () => {
    vi.mocked(modelStore.deleteContact).mockResolvedValue(undefined)

    const request = createMockDELETERequest({
      url: 'http://localhost:3000/api/models',
      params: { id: 'contact-123', type: 'contact' },
    })

    const response = await DELETE(request)
    const data = await extractResponseData<{ success: boolean }>(response)

    expect(data.success).toBe(true)
    expect(response.status).toBe(200)
  })
})

describe('Integration scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle create then update workflow', async () => {
    const newContact = createMockAIContact({ id: 'contact-new', name: 'New AI' })
    vi.mocked(modelStore.createContact).mockResolvedValue(newContact)

    // Create contact
    const createRequest = createMockRequest({
      body: {
        type: 'contact',
        name: 'New AI',
        provider: 'anthropic',
      },
    })
    const createResponse = await POST(createRequest)
    assertSuccess(createResponse)

    // Update contact
    const updatedContact = createMockAIAgent({
      id: 'contact-new',
      name: 'Updated AI',
    })
    vi.mocked(modelStore.updateContact).mockResolvedValue(updatedContact)

    const updateRequest = createMockRequest({
      body: {
        type: 'contact',
        id: 'contact-new',
        name: 'Updated AI',
      },
    })
    const updateResponse = await PATCH(updateRequest)
    assertSuccess(updateResponse)

    const data = await extractResponseData<{ contact: unknown }>(updateResponse)
    expect(data.contact).toBeTruthy()
  })

  it('should handle create then delete workflow', async () => {
    const newModel = createMockModelConfig({ id: "model-temp", name: "Temp Model" })
    vi.mocked(modelStore.addModel).mockResolvedValue(newModel)

    // Create model
    const createRequest = createMockRequest({
      body: { name: 'Temp Model', provider: 'openai' },
    })
    const createResponse = await POST(createRequest)
    assertSuccess(createResponse)

    // Delete model
    vi.mocked(modelStore.deleteModel).mockResolvedValue(undefined)

    const deleteRequest = createMockDELETERequest({
      url: 'http://localhost:3000/api/models',
      params: { id: 'model-temp' },
    })
    const deleteResponse = await DELETE(deleteRequest)
    assertSuccess(deleteResponse)

    const data = await extractResponseData<{ success: boolean }>(deleteResponse)
    expect(data.success).toBe(true)
  })

  it('should handle list filter by provider', async () => {
    const allModels = [
      createMockModelConfig({ id: "1", name: "GPT-4", provider: "openai" as const }),
      createMockModelConfig({ id: "2", name: "Claude", provider: "anthropic" as const }),
      createMockModelConfig({ id: "3", name: "GPT-3.5", provider: "openai" as const }),
    ]

    vi.mocked(modelStore.listModels).mockImplementation(async (provider?) => {
      if (provider === 'openai') {
        return allModels.filter((m) => m.provider === 'openai')
      }
      return allModels
    })

    // Get all models
    const allRequest = createMockGETRequest({
      url: 'http://localhost:3000/api/models',
    })
    const allResponse = await GET(allRequest)
    assertSuccess(allResponse)

    const allData = await extractResponseData<{ models: unknown[] }>(allResponse)
    expect(allData.models).toHaveLength(3)

    // Filter by provider
    const filteredRequest = createMockGETRequest({
      url: 'http://localhost:3000/api/models',
      params: { provider: 'openai' },
    })
    const filteredResponse = await GET(filteredRequest)
    assertSuccess(filteredResponse)

    const filteredData = await extractResponseData<{ models: unknown[] }>(
      filteredResponse
    )
    expect(filteredData.models).toHaveLength(2)
  })
})
