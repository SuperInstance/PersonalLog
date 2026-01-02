/**
 * Modules Unload API Route Tests
 *
 * Tests for POST /api/modules/unload endpoint
 * - Unload a loaded module
 * - Reset module status and resources
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

describe('POST /api/modules/unload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should unload a module successfully', async () => {
    const mockModule = {
      id: 'test-module',
      loaded: true,
      status: 'loaded',
      resources: { cpu: 10, memory: 100 },
    }

    const mockRegistry = createMockModuleRegistry({
      modules: [mockModule],
      stats: { totalModules: 1, loadedModules: 1, failedModules: 0 },
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
    expect(data.message).toContain('unloaded successfully')
    expect(data.module).toBeTruthy()
    expect(mockRegistry.getModuleState).toHaveBeenCalledWith('test-module')
  })

  it('should update module status to idle', async () => {
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

    expect(mockRegistry.updateModuleStatus).toHaveBeenCalledWith('test-module', 'idle')
  })

  it('should reset module resources to zero', async () => {
    const mockModule = {
      id: 'test-module',
      loaded: true,
      status: 'loaded',
      resources: { cpu: 25, memory: 150 },
    }

    const mockRegistry = createMockModuleRegistry({ modules: [mockModule] })
    vi.mocked(getOrInitRegistry).mockResolvedValue(mockRegistry as any)

    const request = createMockRequest({
      body: { moduleId: 'test-module' },
    })

    const response = await POST(request)
    assertSuccess(response)

    expect(mockRegistry.updateModuleResources).toHaveBeenCalledWith('test-module', {
      cpu: 0,
      memory: 0,
    })
  })

  it('should return success if module already unloaded', async () => {
    const mockModule = {
      id: 'test-module',
      loaded: false,
      status: 'idle',
      resources: { cpu: 0, memory: 0 },
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
    expect(data.message).toContain('already unloaded')
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

  it('should handle unloading errors gracefully', async () => {
    const mockModule = {
      id: 'test-module',
      loaded: true,
      status: 'loaded',
    }

    const mockRegistry = createMockModuleRegistry({ modules: [mockModule] })

    // Mock an error during unloading
    mockRegistry.updateModuleStatus = vi.fn().mockImplementation(() => {
      throw new Error('Failed to unload module')
    })

    vi.mocked(getOrInitRegistry).mockResolvedValue(mockRegistry as any)

    const request = createMockRequest({
      body: { moduleId: 'test-module' },
    })

    const response = await POST(request)
    assertError(response, 500)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Failed to unload module')
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

  it('should return unloaded module with reset state', async () => {
    const loadedModule = {
      id: 'test-module',
      loaded: true,
      status: 'loaded',
      resources: { cpu: 20, memory: 130 },
    }

    const unloadedModule = {
      id: 'test-module',
      loaded: false,
      status: 'idle',
      resources: { cpu: 0, memory: 0 },
    }

    const mockRegistry = createMockModuleRegistry({ modules: [loadedModule] })

    // Simulate module state update
    mockRegistry.getModuleState = vi.fn().mockReturnValue(unloadedModule)

    vi.mocked(getOrInitRegistry).mockResolvedValue(mockRegistry as any)

    const request = createMockRequest({
      body: { moduleId: 'test-module' },
    })

    const response = await POST(request)
    assertSuccess(response)

    const data = await extractResponseData<{
      module: { loaded: boolean; status: string; resources: { cpu: number; memory: number } }
    }>(response)

    expect(data.module.loaded).toBe(false)
    expect(data.module.status).toBe('idle')
    expect(data.module.resources.cpu).toBe(0)
    expect(data.module.resources.memory).toBe(0)
  })

  it('should not call status update if already unloaded', async () => {
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

    // Should not update status since already unloaded
    expect(mockRegistry.updateModuleStatus).not.toHaveBeenCalled()
    expect(mockRegistry.updateModuleResources).not.toHaveBeenCalled()
  })
})
