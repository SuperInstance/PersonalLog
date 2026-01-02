/**
 * Ollama Service
 *
 * Discovers and manages local Ollama models.
 */

import type { ModelConfig, HardwareConstraints } from './models'

export interface OllamaModel {
  name: string
  size: number  // in bytes
  modified_at: string
  digest: string
  details?: {
    format: string
    family: string
    families: string[] | null
    parameter_size: string
    quantization_level: string
  }
}

export interface OllamaHardwareInfo {
  hasGpu: boolean
  gpuName?: string
  vramTotal?: number  // GB
  vramUsed?: number
  ramTotal?: number  // GB
  ramUsed?: number
  canParallel: boolean
  maxConcurrent?: number
}

const DEFAULT_OLLAMA_URL = 'http://localhost:11434'

export class OllamaService {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || DEFAULT_OLLAMA_URL
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Get list of available models
   */
  async listModels(): Promise<OllamaModel[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`)
    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.models || []
  }

  /**
   * Get hardware information
   */
  async getHardwareInfo(): Promise<OllamaHardwareInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ps`)
      if (!response.ok) {
        // ps endpoint might not be available, return defaults
        return this.getDefaultHardwareInfo()
      }

      const data = await response.json()

      // Parse GPU info from processes
      const hasGpu = data.models?.some((m: any) =>
        m.details?.gpu?.name || m.details?.gpu?.vram
      )

      // Estimate VRAM from GPU info
      let vramTotal: number | undefined
      const gpuModel = data.models?.find((m: any) => m.details?.gpu?.name)
      if (gpuModel?.details?.gpu) {
        // Rough estimate based on common GPUs
        vramTotal = this.estimateVRAM(gpuModel.details.gpu.name)
      }

      return {
        hasGpu,
        gpuName: gpuModel?.details?.gpu?.name,
        vramTotal,
        canParallel: !hasGpu || (vramTotal && vramTotal >= 16), // Need 16GB+ for parallel
        maxConcurrent: this.estimateMaxConcurrent(vramTotal, hasGpu),
      }
    } catch {
      return this.getDefaultHardwareInfo()
    }
  }

  /**
   * Pull a new model
   */
  async pullModel(modelName: string, onProgress?: (progress: number) => void): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
    })

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.trim())

      for (const line of lines) {
        try {
          const data = JSON.parse(line)
          if (data.status === 'success' && data.total) {
            const progress = (data.completed / data.total) * 100
            onProgress?.(progress)
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(modelName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    })

    if (!response.ok) {
      throw new Error(`Failed to delete model: ${response.statusText}`)
    }
  }

  /**
   * Convert Ollama model to ModelConfig
   */
  async createModelConfig(ollamaModel: OllamaModel): Promise<ModelConfig> {
    const hardware = await this.getHardwareInfo()

    // Estimate size in GB
    const sizeGb = ollamaModel.size / (1024 * 1024 * 1024)

    // Determine hardware constraints
    const hardwareConstraints: HardwareConstraints = {
      requiresGpu: false, // Ollama can run on CPU
      vramGb: sizeGb * 1.2, // Rough estimate
      ramGb: sizeGb * 1.5,
      canParallel: hardware.canParallel && sizeGb < 8,
      maxConcurrent: hardware.maxConcurrent,
    }

    return {
      id: `ollama_${ollamaModel.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
      name: ollamaModel.name,
      provider: 'ollama',
      modelName: ollamaModel.name,
      baseUrl: this.baseUrl,
      isActive: true,
      hardwareConstraints,
      capabilities: {
        maxContext: this.estimateContext(ollamaModel),
        supportsStreaming: true,
        supportsImages: false,
        supportsFunctions: false,
        estimatedSpeed: this.estimateSpeed(ollamaModel, hardware),
      },
    }
  }

  /**
   * Run a model check to see if it's loaded
   */
  async isModelLoaded(modelName: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/api/tags`)
    if (!response.ok) return false

    const data = await response.json()
    return data.models?.some((m: OllamaModel) => m.name === modelName)
  }

  /**
   * Estimate context window from model details
   */
  private estimateContext(model: OllamaModel): number {
    const name = model.name.toLowerCase()

    if (name.includes('45b') || name.includes('70b') || name.includes('405b')) {
      return 128000 // Large models
    } else if (name.includes('8b') || name.includes('7b') || name.includes('13b')) {
      return 32768 // Mid-size models
    } else if (name.includes('3b') || name.includes('1b')) {
      return 8192 // Small models
    }

    // Check details
    if (model.details) {
      if (model.details.parameter_size?.includes('70B') || model.details.parameter_size?.includes('405B')) {
        return 128000
      } else if (model.details.parameter_size?.includes('8B') || model.details.parameter_size?.includes('7B')) {
        return 32768
      }
    }

    return 8192 // Default
  }

  /**
   * Estimate response speed
   */
  private estimateSpeed(model: OllamaModel, hardware: OllamaHardwareInfo): 'fast' | 'medium' | 'slow' {
    if (!hardware.hasGpu) return 'slow'

    const name = model.name.toLowerCase()
    if (name.includes('1b') || name.includes('3b')) return 'fast'
    if (name.includes('7b') || name.includes('8b')) return 'medium'

    return 'slow'
  }

  /**
   * Estimate VRAM from GPU name
   */
  private estimateVRAM(gpuName: string): number {
    const name = gpuName.toLowerCase()

    if (name.includes('4090') || name.includes('rtx 4090')) return 24
    if (name.includes('3090') || name.includes('rtx 3090')) return 24
    if (name.includes('4080')) return 16
    if (name.includes('4070')) return 12
    if (name.includes('4060')) return 8
    if (name.includes('3080') || name.includes('3070')) return 8
    if (name.includes('a100')) return 40 // or 80
    if (name.includes('h100')) return 80 // or 40
    if (name.includes('v100')) return 16

    return 8 // Default estimate
  }

  /**
   * Estimate max concurrent models based on VRAM
   */
  private estimateMaxConcurrent(vramGb?: number, hasGpu?: boolean): number {
    if (!hasGpu) return 1 // CPU-only, can only run one at a time
    if (!vramGb) return 1

    // Rough estimate: 8GB per model
    return Math.max(1, Math.floor(vramGb / 8))
  }

  /**
   * Get default hardware info when unavailable
   */
  private getDefaultHardwareInfo(): OllamaHardwareInfo {
    return {
      hasGpu: false,
      canParallel: false,
      maxConcurrent: 1,
    }
  }

  /**
   * Get running processes
   */
  async getRunningProcesses(): Promise<Array<{ name: string; pid: number }>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ps`)
      if (!response.ok) return []

      const data = await response.json()
      return data.models?.map((m: any) => ({
        name: m.name,
        pid: m.pid,
      })) || []
    } catch {
      return []
    }
  }

  /**
   * Get model info including size and parameters
   */
  async getModelInfo(modelName: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    })

    if (!response.ok) {
      throw new Error(`Failed to get model info: ${response.statusText}`)
    }

    return await response.json()
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let ollamaService: OllamaService | null = null

export function getOllamaService(baseUrl?: string): OllamaService {
  if (!ollamaService) {
    ollamaService = new OllamaService(baseUrl)
  }
  return ollamaService
}
