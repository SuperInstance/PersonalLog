/**
 * AI Model Catalog
 *
 * Comprehensive catalog of available AI models with capabilities, pricing,
 * performance metrics, and benchmarks.
 */

import type { AIModel, ModelCapabilities } from './types'

// ============================================================================
// MODEL CATALOG
// ============================================================================

/**
 * Complete catalog of available AI models.
 *
 * This catalog includes major cloud providers (OpenAI, Anthropic, Google)
 * as well as local models (Ollama, WebLLM) and edge providers (Cloudflare).
 */
export const AVAILABLE_MODELS: AIModel[] = [
  // ==========================================================================
  // OPENAI MODELS
  // ==========================================================================

  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    capabilities: {
      code: true,
      math: true,
      creative: true,
      analysis: true,
      multimodal: true,
      tools: true,
      streaming: true
    },
    performance: {
      speed: 'fast',
      quality: 'high',
      reliability: 0.99
    },
    pricing: {
      inputCost: 10, // $10 per 1M tokens
      outputCost: 30,
      freeTierTokens: undefined
    },
    limits: {
      maxTokens: 128000,
      requestsPerMinute: 500
    },
    benchmarks: {
      avgResponseTime: 2.0,
      avgTokensPerSecond: 100
    }
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    capabilities: {
      code: true,
      math: true,
      creative: true,
      analysis: true,
      multimodal: true,
      tools: true,
      streaming: true
    },
    performance: {
      speed: 'fast',
      quality: 'high',
      reliability: 0.99
    },
    pricing: {
      inputCost: 2.50,
      outputCost: 10
    },
    limits: {
      maxTokens: 128000,
      requestsPerMinute: 500
    },
    benchmarks: {
      avgResponseTime: 1.5,
      avgTokensPerSecond: 120
    }
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    capabilities: {
      code: true,
      math: false,
      creative: true,
      analysis: true,
      multimodal: true,
      tools: true,
      streaming: true
    },
    performance: {
      speed: 'fast',
      quality: 'medium',
      reliability: 0.98
    },
    pricing: {
      inputCost: 0.15,
      outputCost: 0.60
    },
    limits: {
      maxTokens: 128000,
      requestsPerMinute: 500
    },
    benchmarks: {
      avgResponseTime: 0.8,
      avgTokensPerSecond: 150
    }
  },

  // ==========================================================================
  // ANTHROPIC MODELS
  // ==========================================================================

  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    capabilities: {
      code: true,
      math: true,
      creative: true,
      analysis: true,
      multimodal: true,
      tools: true,
      streaming: true
    },
    performance: {
      speed: 'medium',
      quality: 'high',
      reliability: 0.98
    },
    pricing: {
      inputCost: 15,
      outputCost: 75
    },
    limits: {
      maxTokens: 200000,
      requestsPerMinute: 50
    },
    benchmarks: {
      avgResponseTime: 4.0,
      avgTokensPerSecond: 80
    }
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    capabilities: {
      code: true,
      math: true,
      creative: true,
      analysis: true,
      multimodal: true,
      tools: true,
      streaming: true
    },
    performance: {
      speed: 'fast',
      quality: 'high',
      reliability: 0.98
    },
    pricing: {
      inputCost: 3,
      outputCost: 15
    },
    limits: {
      maxTokens: 200000,
      requestsPerMinute: 50
    },
    benchmarks: {
      avgResponseTime: 2.5,
      avgTokensPerSecond: 95
    }
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    capabilities: {
      code: false,
      math: false,
      creative: true,
      analysis: true,
      multimodal: true,
      tools: false,
      streaming: true
    },
    performance: {
      speed: 'fast',
      quality: 'medium',
      reliability: 0.97
    },
    pricing: {
      inputCost: 0.25,
      outputCost: 1.25
    },
    limits: {
      maxTokens: 200000,
      requestsPerMinute: 200
    },
    benchmarks: {
      avgResponseTime: 1.0,
      avgTokensPerSecond: 120
    }
  },

  // ==========================================================================
  // GOOGLE MODELS
  // ==========================================================================

  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    capabilities: {
      code: true,
      math: true,
      creative: true,
      analysis: true,
      multimodal: true,
      tools: true,
      streaming: true
    },
    performance: {
      speed: 'fast',
      quality: 'high',
      reliability: 0.97
    },
    pricing: {
      inputCost: 1.25,
      outputCost: 5
    },
    limits: {
      maxTokens: 1000000, // 1M token context!
      requestsPerMinute: 60
    },
    benchmarks: {
      avgResponseTime: 2.0,
      avgTokensPerSecond: 90
    }
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    capabilities: {
      code: true,
      math: true,
      creative: true,
      analysis: true,
      multimodal: true,
      tools: true,
      streaming: true
    },
    performance: {
      speed: 'fast',
      quality: 'medium',
      reliability: 0.96
    },
    pricing: {
      inputCost: 0.075,
      outputCost: 0.30
    },
    limits: {
      maxTokens: 1000000,
      requestsPerMinute: 60
    },
    benchmarks: {
      avgResponseTime: 0.8,
      avgTokensPerSecond: 140
    }
  },

  // ==========================================================================
  // LOCAL MODELS (Ollama, WebLLM)
  // ==========================================================================

  {
    id: 'phi-3-mini',
    name: 'Phi-3 Mini',
    provider: 'local',
    capabilities: {
      code: true,
      math: true,
      creative: false,
      analysis: false,
      multimodal: false,
      tools: false,
      streaming: false
    },
    performance: {
      speed: 'medium',
      quality: 'low',
      reliability: 0.85
    },
    pricing: {
      inputCost: 0, // Free (local)
      outputCost: 0
    },
    limits: {
      maxTokens: 128000,
      requestsPerMinute: 10 // Hardware limited
    },
    benchmarks: {
      avgResponseTime: 5.0,
      avgTokensPerSecond: 40
    }
  },
  {
    id: 'llama-3.1-8b',
    name: 'Llama 3.1 8B',
    provider: 'local',
    capabilities: {
      code: true,
      math: false,
      creative: true,
      analysis: false,
      multimodal: false,
      tools: false,
      streaming: true
    },
    performance: {
      speed: 'medium',
      quality: 'medium',
      reliability: 0.90
    },
    pricing: {
      inputCost: 0,
      outputCost: 0
    },
    limits: {
      maxTokens: 128000,
      requestsPerMinute: 10
    },
    benchmarks: {
      avgResponseTime: 4.0,
      avgTokensPerSecond: 50
    }
  },
  {
    id: 'mistral-7b',
    name: 'Mistral 7B',
    provider: 'local',
    capabilities: {
      code: true,
      math: false,
      creative: true,
      analysis: true,
      multimodal: false,
      tools: false,
      streaming: true
    },
    performance: {
      speed: 'medium',
      quality: 'medium',
      reliability: 0.88
    },
    pricing: {
      inputCost: 0,
      outputCost: 0
    },
    limits: {
      maxTokens: 32000,
      requestsPerMinute: 10
    },
    benchmarks: {
      avgResponseTime: 3.5,
      avgTokensPerSecond: 55
    }
  },

  // ==========================================================================
  // EDGE MODELS (Cloudflare Workers AI)
  // ==========================================================================

  {
    id: 'cf-llama-2',
    name: 'Cloudflare Llama 2',
    provider: 'cloudflare',
    capabilities: {
      code: false,
      math: false,
      creative: true,
      analysis: false,
      multimodal: false,
      tools: false,
      streaming: true
    },
    performance: {
      speed: 'fast',
      quality: 'low',
      reliability: 0.92
    },
    pricing: {
      inputCost: 0.10, // Estimated
      outputCost: 0.10
    },
    limits: {
      maxTokens: 4096,
      requestsPerMinute: 1000
    },
    benchmarks: {
      avgResponseTime: 1.0,
      avgTokensPerSecond: 80
    }
  }
]

// ============================================================================
// MODEL LOOKUP UTILITIES
// ============================================================================

/**
 * Get a model by ID.
 */
export function getModelById(id: string): AIModel | undefined {
  return AVAILABLE_MODELS.find(m => m.id === id)
}

/**
 * Get all models by provider.
 */
export function getModelsByProvider(provider: AIModel['provider']): AIModel[] {
  return AVAILABLE_MODELS.filter(m => m.provider === provider)
}

/**
 * Get all models with a specific capability.
 */
export function modelsWithCapability(
  capability: keyof ModelCapabilities
): AIModel[] {
  return AVAILABLE_MODELS.filter(m => m.capabilities[capability])
}

/**
 * Get models sorted by cost (cheapest first).
 */
export function getModelsByCost(
  estimatedTokens: { input: number; output: number }
): AIModel[] {
  return [...AVAILABLE_MODELS].sort((a, b) => {
    const costA = (estimatedTokens.input / 1e6) * a.pricing.inputCost +
                  (estimatedTokens.output / 1e6) * a.pricing.outputCost
    const costB = (estimatedTokens.input / 1e6) * b.pricing.inputCost +
                  (estimatedTokens.output / 1e6) * b.pricing.outputCost
    return costA - costB
  })
}

/**
 * Get models sorted by speed (fastest first).
 */
export function getModelsBySpeed(): AIModel[] {
  return [...AVAILABLE_MODELS].sort((a, b) =>
    b.benchmarks.avgTokensPerSecond - a.benchmarks.avgTokensPerSecond
  )
}

/**
 * Get models sorted by quality (highest first).
 */
export function getModelsByQuality(): AIModel[] {
  const qualityOrder = { high: 3, medium: 2, low: 1 }
  return [...AVAILABLE_MODELS].sort((a, b) =>
    qualityOrder[b.performance.quality] - qualityOrder[a.performance.quality]
  )
}

/**
 * Get free-tier models.
 */
export function getFreeModels(): AIModel[] {
  return AVAILABLE_MODELS.filter(m =>
    m.pricing.inputCost === 0 && m.pricing.outputCost === 0
  )
}

/**
 * Get models that can handle a specific context size.
 */
export function modelsWithContext(minTokens: number): AIModel[] {
  return AVAILABLE_MODELS.filter(m => m.limits.maxTokens >= minTokens)
}

// ============================================================================
// MODEL STATISTICS
// ============================================================================

export const MODEL_CATALOG_STATS = {
  totalModels: AVAILABLE_MODELS.length,
  byProvider: {
    openai: getModelsByProvider('openai').length,
    anthropic: getModelsByProvider('anthropic').length,
    google: getModelsByProvider('google').length,
    local: getModelsByProvider('local').length,
    cloudflare: getModelsByProvider('cloudflare').length
  },
  withCode: modelsWithCapability('code').length,
  withMath: modelsWithCapability('math').length,
  withMultimodal: modelsWithCapability('multimodal').length,
  freeModels: getFreeModels().length,
  avgCostPer1M: AVAILABLE_MODELS.reduce((sum, m) =>
    sum + m.pricing.inputCost + m.pricing.outputCost, 0
  ) / AVAILABLE_MODELS.length
}
