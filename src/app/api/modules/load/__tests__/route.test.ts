/**
 * Modules Load API Route Tests
 *
 * Tests for POST /api/modules/load endpoint
 * - Load a module into memory
 * - Update module status and resources
 * - Error handling for invalid requests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import {
  createMockRequest,
  createMockModuleRegistry,
  extractResponseData,
  assertSuccess,
  assertError,
} from '@/__tests__/helpers/api-helpers'

// Mock module registry
vi.mock('@/lib/module-registry', () => ({
  getOrInitRegistry: vi.fn(),
}))

import { getOrInitRegistry } from '@/lib/module-registry'

describe('POST /api/modules/load', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load a module successfully', async () => {
    const mockModule = {
      id: 'test-module',
      name: 'Test Module',
      loaded: false,
      status: 'idle',
    }

    const mockRegistry = createMockModuleRegistry({
      modules: [mockModule],
      stats: { totalModules: 1, loadedModules: 0, failedModules: 0 },
    })

    vi.mocked(getOrInitRegistry).mockResolvedValue(mockRegistry as any)

    const request = createMockRequest({
      body: { moduleId: 'test-module' },
    })

    const response = await POST(request)
    assertSuccess(response)

    const data = await extractResponseData<{
      success: boolean
      message: string
      module: unknown
    }>(response)

    expect(data.success).toBe(true)
    expect(data.message).toContain('loaded successfully')
    expect(data.module).toBeTruthy()
    expect(mockRegistry.getModuleState).toHaveBeenCalledWith('test-module')
  })

  it('should update module status to loaded', async () => {
    const mockModule = {
      id: 'test-module',
      loaded: false,
      status: 'idle',
    }

    const mockRegistry = createMockModuleRegistry({ modules: [mockModule] })
    vi.mocked(getOrInitRegistry).mockResolvedValue(mockRegistry as any)

    const request = createMockRequest({
      body: { moduleId: 'test-module' },
    })

    const response = await POST(request)
    assertSuccess(response)

    expect(mockRegistry.updateModuleStatus).toHaveBeenCalledWith(
      'test-module',
      'loaded'
    )
  })

  it('should update module resources after loading', async () => {
    const mockModule = {
      id: 'test-module',
      loaded: false,
      status: 'idle',
    }

    const mockRegistry = createMockModuleRegistry({ modules: [mockModule] })
    vi.mocked(getOrInitRegistry).mockResolvedValue(mockRegistry as any)

    const request = createMockRequest({
      body: { moduleId: 'test-module' },
    })

    const response = await POST(request)
    assertSuccess(response)

    expect(mockRegistry.updateModuleResources).toHaveBeenCalledWith(
      'test-module',
      expect.objectContaining({
        cpu: expect.any(Number),
        memory: expect.any(Number),
      })
    )
  })

  it('should return success if module already loaded', async () => {
    const mockModule = {
      id: 'test-module',
      loaded: true,
      status: 'loaded',
    }

    const mockRegistry = createMockModuleRegistry({ modules: [mockModule] })
    vi.mocked(getOrInitRegistry).mockResolvedValue(mockRegistry as any)

    const request = createMockRequest({
      body: { moduleId: 'test-module' },
    })

    const response = await POST(request)
    assertSuccess(response)

    const data = await extractResponseData<{ success: boolean; message: string }>(response)
    expect(data.success).toBe(true)
    expect(data.message).toContain('already loaded')
  })

  it('should require moduleId parameter', async () => {
    const mockRegistry = createMockModuleRegistry()
    vi.mocked(getOrInitRegistry).mockResolvedValue(mockRegistry as any)

    const request = createMockRequest({
      body: {},
    })

    const response = await POST(request)
    assertError(response, 400)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Module ID is required')
  })

  it('should handle empty moduleId', async () => {
    const mockRegistry = createMockModuleRegistry()
    vi.mocked(getOrInitRegistry).mockResolvedValue(mockRegistry as any)

    const request = createMockRequest({
      body: { moduleId: '' },
    })

    const response = await POST(request)
    assertError(response, 400)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Module ID is required')
  })

  it('should handle module not found', async () => {
    const mockRegistry = createMockModuleRegistry({ modules: [] })
    vi.mocked(getOrInitRegistry).mockResolvedValue(mockRegistry as any)

    const request = createMockRequest({
      body: { moduleId: 'non-existent-module' },
    })

    const response = await POST(request)
    assertError(response, 404)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Module not found')
  })

  it('should handle loading errors gracefully', async () => {
    const mockModule = {
      id: 'test-module',
      loaded: false,
      status: 'idle',
    }

    const mockRegistry = createMockModuleRegistry({ modules: [mockModule] })

    // Mock an error during loading
    mockRegistry.updateModuleStatus = vi.fn().mockImplementation(() => {
      throw new Error('Failed to load module')
    })

    vi.mocked(getOrInitRegistry).mockResolvedValue(mockRegistry as any)

    const request = createMockRequest({
      body: { moduleId: 'test-module' },
    })

    const response = await POST(request)
    assertError(response, 500)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Failed to load module')
  })

  it('should update status to loading before loaded', async () => {
    const mockModule = {
      id: 'test-module',
      loaded: false,
      status: 'idle',
    }

    const statusUpdates: string[] = []
    const mockRegistry = createMockModuleRegistry({ modules: [mockModule] })

    mockRegistry.updateModuleStatus = vi.fn().mockImplementation((id, status) => {
      statusUpdates.push(status)
    })

    vi.mocked(getOrInitRegistry).mockResolvedValue(mockRegistry as any)

    const request = createMockRequest({
      body: { moduleId: 'test-module' },
    })

    const response = await POST(request)
    assertSuccess(response)

    // Should have updated status to 'loading' then 'loaded'
    expect(statusUpdates).toContain('loading')
    expect(statusUpdates).toContain('loaded')
  })

  it('should handle registry initialization errors', async () => {
    vi.mocked(getOrInitRegistry).mockRejectedValue(
      new Error('Registry initialization failed')
    )

    const request = createMockRequest({
      body: { moduleId: 'test-module' },
    })

    const response = await POST(request)
    assertError(response, 500)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Registry initialization failed')
  })

  it('should return loaded module with updated state', async () => {
    const unloadedModule = {
      id: 'test-module',
      loaded: false,
      status: 'idle',
      resources: { cpu: 0, memory: 0 },
    }

    const loadedModule = {
      id: 'test-module',
      loaded: true,
      status: 'loaded',
      resources: { cpu: 15, memory: 120 },
    }

    const mockRegistry = createMockModuleRegistry({ modules: [unloadedModule] })

    // Simulate module state update
    mockRegistry.getModuleState = vi.fn().mockReturnValue(loadedModule)

    vi.mocked(getOrInitRegistry).mockResolvedValue(mockRegistry as any)

    const request = createMockRequest({
      body: { moduleId: 'test-module' },
    })

    const response = await POST(request)
    assertSuccess(response)

    const data = await extractResponseData<{
      module: { loaded: boolean; status: string }
    }>(response)

    expect(data.module.loaded).toBe(true)
    expect(data.module.status).toBe('loaded')
  })
})
