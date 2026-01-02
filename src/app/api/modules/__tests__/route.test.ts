/**
 * Modules API Route Tests (List)
 *
 * Tests for GET /api/modules endpoint
 * - List all modules
 * - Return module statistics
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import {
  createMockGETRequest,
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

describe('GET /api/modules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should list all modules', async () => {
    const mockModules = [
      { id: 'module-1', name: 'Module 1', loaded: false },
      { id: 'module-2', name: 'Module 2', loaded: true },
      { id: 'module-3', name: 'Module 3', loaded: false },
    ]

    const mockRegistry = createMockModuleRegistry({
      modules: mockModules,
      stats: {
        totalModules: 3,
        loadedModules: 1,
        failedModules: 0,
      },
    })

    vi.mocked(getOrInitRegistry).mockResolvedValue(mockRegistry as any)

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/modules',
    })

    const response = await GET(request)
    assertSuccess(response)

    const data = await extractResponseData<{
      success: boolean
      modules: unknown[]
      stats: unknown
    }>(response)

    expect(data.success).toBe(true)
    expect(data.modules).toHaveLength(3)
    expect(data.stats).toEqual({
      totalModules: 3,
      loadedModules: 1,
      failedModules: 0,
    })
    expect(mockRegistry.getAllModules).toHaveBeenCalled()
    expect(mockRegistry.getStatistics).toHaveBeenCalled()
  })

  it('should handle empty modules list', async () => {
    const mockRegistry = createMockModuleRegistry({
      modules: [],
      stats: { totalModules: 0, loadedModules: 0, failedModules: 0 },
    })

    vi.mocked(getOrInitRegistry).mockResolvedValue(mockRegistry as any)

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/modules',
    })

    const response = await GET(request)
    assertSuccess(response)

    const data = await extractResponseData<{ modules: unknown[] }>(response)
    expect(data.modules).toHaveLength(0)
  })

  it('should include module state information', async () => {
    const mockModules = [
      {
        id: 'test-module',
        name: 'Test Module',
        loaded: true,
        status: 'loaded',
        resources: { cpu: 10, memory: 100 },
      },
    ]

    const mockRegistry = createMockModuleRegistry({ modules: mockModules })
    vi.mocked(getOrInitRegistry).mockResolvedValue(mockRegistry as any)

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/modules',
    })

    const response = await GET(request)
    assertSuccess(response)

    const data = await extractResponseData<{ modules: unknown[] }>(response)
    expect(data.modules[0]).toHaveProperty('loaded')
    expect(data.modules[0]).toHaveProperty('status')
  })

  it('should handle initialization errors gracefully', async () => {
    vi.mocked(getOrInitRegistry).mockRejectedValue(
      new Error('Failed to initialize registry')
    )

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/modules',
    })

    const response = await GET(request)
    assertError(response, 500)

    const data = await extractResponseData<{ error: string }>(response)
    expect(data.error).toContain('Failed to initialize registry')
  })

  it('should return valid JSON content-type', async () => {
    const mockRegistry = createMockModuleRegistry()
    vi.mocked(getOrInitRegistry).mockResolvedValue(mockRegistry as any)

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/modules',
    })

    const response = await GET(request)
    expect(response.headers.get('Content-Type')).toContain('application/json')
  })

  it('should include accurate statistics', async () => {
    const mockModules = [
      { id: 'm1', loaded: true },
      { id: 'm2', loaded: false },
      { id: 'm3', loaded: true },
      { id: 'm4', loaded: false },
    ]

    const mockRegistry = createMockModuleRegistry({
      modules: mockModules,
      stats: { totalModules: 4, loadedModules: 2, failedModules: 0 },
    })

    vi.mocked(getOrInitRegistry).mockResolvedValue(mockRegistry as any)

    const request = createMockGETRequest({
      url: 'http://localhost:3000/api/modules',
    })

    const response = await GET(request)
    assertSuccess(response)

    const data = await extractResponseData<{
      stats: { totalModules: number; loadedModules: number; failedModules: number }
    }>(response)

    expect(data.stats.totalModules).toBe(4)
    expect(data.stats.loadedModules).toBe(2)
  })
})
