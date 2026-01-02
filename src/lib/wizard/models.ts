/**
 * Model Configuration Types
 *
 * Types for storing and managing AI models and their configurations.
 */

// ============================================================================
// MODEL PROVIDERS
// ============================================================================

export type ModelProvider =
  | 'openai'
  | 'xai'
  | 'anthropic'
  | 'deepseek'
  | 'kimi'
  | 'zai'
  | 'zai-coder'
  | 'ollama'
  | 'custom'

export interface ModelConfig {
  id: string
  name: string  // Display name
  provider: ModelProvider
  modelName: string  // API model name
  baseUrl?: string  // For custom providers
  apiKey?: string
  createdAt: string
  isActive: boolean
  hardwareConstraints?: HardwareConstraints
  capabilities: ModelCapabilities
}

export interface HardwareConstraints {
  requiresGpu: boolean
  vramGb?: number
  ramGb?: number
  canParallel: boolean  // Can run multiple instances
  maxConcurrent?: number
}

export interface ModelCapabilities {
  maxContext: number  // tokens
  supportsStreaming: boolean
  supportsImages: boolean
  supportsFunctions: boolean
  estimatedSpeed: 'fast' | 'medium' | 'slow'
}

// ============================================================================
// AI CONTACT (DERIVED FROM MODELS)
// ============================================================================

export interface AIContact {
  id: string
  nickname: string  // User's chosen name
  firstName: string  // For calling into conversation
  baseModelId: string  // Reference to base ModelConfig
  systemPrompt: string
  personality: PersonalitySettings
  contextFiles: ContextFile[]
  responseStyle: 'brief' | 'balanced' | 'detailed'
  temperature: number
  maxTokens: number
  color: string  // Avatar color
  version?: number  // For multiple versions
  parentContactId?: string  // For version tracking
  createdAt: string
  updatedAt: string
}

export interface PersonalitySettings {
  vibeAttributes: VibeAttribute[]
  conversationId?: string  // If created from conversation
  learnedFrom: {
    conversationId?: string
    messageCount: number
  }
}

export interface VibeAttribute {
  attribute: string
  value: number
  source: 'manual' | 'learned'
}

export interface ContextFile {
  id: string
  name: string
  type: 'knowledge' | 'style' | 'instruction'
  content: string
  addedAt: string
}

// ============================================================================
// PROVIDER TEMPLATES
// ============================================================================

export interface ProviderTemplate {
  id: ModelProvider
  name: string
  icon: string
  baseUrl: string
  defaultModel: string
  models: string[]
  requiresApiKey: boolean
  apiKeyUrl: string
  color: string
}

export const PROVIDER_TEMPLATES: ProviderTemplate[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🔷',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-mini', 'o1-preview'],
    requiresApiKey: true,
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    color: 'bg-emerald-500',
  },
  {
    id: 'xai',
    name: 'X.ai (Grok)',
    icon: '𝕏',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-beta',
    models: ['grok-beta', 'grok-vision-beta'],
    requiresApiKey: true,
    apiKeyUrl: 'https://console.x.ai/',
    color: 'bg-slate-800',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🤖',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-3-5-haiku-20241022',
    models: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
    requiresApiKey: true,
    apiKeyUrl: 'https://console.anthropic.com/',
    color: 'bg-amber-600',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: '🔮',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-coder'],
    requiresApiKey: true,
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    color: 'bg-blue-600',
  },
  {
    id: 'kimi',
    name: 'Kimi (Moonshot AI)',
    icon: '🌙',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    requiresApiKey: true,
    apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
    color: 'bg-indigo-500',
  },
  {
    id: 'zai',
    name: 'Z.ai',
    icon: '⚡',
    baseUrl: 'https://api.z.com/v1',
    defaultModel: 'zai-pro',
    models: ['zai-pro', 'zai-standard', 'zai-fast'],
    requiresApiKey: true,
    apiKeyUrl: 'https://www.z.com/',
    color: 'bg-yellow-500',
  },
  {
    id: 'zai-coder',
    name: 'Z.ai Coder',
    icon: '💻',
    baseUrl: 'https://api.z.com/v1',
    defaultModel: 'zai-coder-pro',
    models: ['zai-coder-pro', 'zai-coder-standard'],
    requiresApiKey: true,
    apiKeyUrl: 'https://www.z.com/',
    color: 'bg-cyan-500',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    icon: '🦙',
    baseUrl: 'http://localhost:11434',
    defaultModel: 'llama3.2',
    models: [],  // Discovered dynamically
    requiresApiKey: false,
    apiKeyUrl: '',
    color: 'bg-purple-600',
  },
  {
    id: 'custom',
    name: 'Custom API',
    icon: '🔧',
    baseUrl: '',
    defaultModel: '',
    models: [],
    requiresApiKey: true,
    apiKeyUrl: '',
    color: 'bg-slate-500',
  },
]

// ============================================================================
// FILTRATION SYSTEM
// ============================================================================

export interface FiltrationConfig {
  promptEnhancement: {
    addClarity: boolean
    addStructure: boolean
    addContext: boolean
  }
  responsePostProcessing: {
    removeFiller: boolean
    improveFormatting: boolean
    extractKeyPoints: boolean
  }
  customInstructions?: string
}

export const DEFAULT_FILTRATION: FiltrationConfig = {
  promptEnhancement: {
    addClarity: true,
    addStructure: true,
    addContext: true,
  },
  responsePostProcessing: {
    removeFiller: true,
    improveFormatting: true,
    extractKeyPoints: false,
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function generateModelId(): string {
  return `model_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

export function generateContactId(): string {
  return `contact_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

export function getProviderTemplate(provider: ModelProvider): ProviderTemplate {
  return PROVIDER_TEMPLATES.find(t => t.id === provider) || PROVIDER_TEMPLATES[8]  // custom
}

export function getModelCapabilities(provider: ModelProvider, modelName: string): ModelCapabilities {
  // Base capabilities based on provider
  const baseCapabilities: Record<ModelProvider, Partial<ModelCapabilities>> = {
    openai: { supportsStreaming: true, supportsImages: true, supportsFunctions: true, estimatedSpeed: 'fast' },
    xai: { supportsStreaming: true, supportsImages: false, supportsFunctions: false, estimatedSpeed: 'fast' },
    anthropic: { supportsStreaming: true, supportsImages: true, supportsFunctions: true, estimatedSpeed: 'medium' },
    deepseek: { supportsStreaming: true, supportsImages: false, supportsFunctions: false, estimatedSpeed: 'fast' },
    kimi: { supportsStreaming: true, supportsImages: false, supportsFunctions: false, estimatedSpeed: 'medium' },
    zai: { supportsStreaming: true, supportsImages: false, supportsFunctions: false, estimatedSpeed: 'fast' },
    'zai-coder': { supportsStreaming: true, supportsImages: false, supportsFunctions: false, estimatedSpeed: 'fast' },
    ollama: { supportsStreaming: true, supportsImages: false, supportsFunctions: false, estimatedSpeed: 'medium' },
    custom: { supportsStreaming: true, supportsImages: false, supportsFunctions: false, estimatedSpeed: 'medium' },
  }

  const base = baseCapabilities[provider] || {}

  // Estimate context from model name
  let maxContext = 8192
  if (modelName.includes('32k') || modelName.includes('128')) maxContext = 128000
  else if (modelName.includes('8k')) maxContext = 8192
  else if (modelName.includes('gpt-4o') || modelName.includes('claude-3')) maxContext = 128000
  else if (modelName.includes('haiku')) maxContext = 200000

  return {
    maxContext,
    supportsStreaming: true,
    supportsImages: false,
    supportsFunctions: false,
    estimatedSpeed: 'medium',
    ...base,
  }
}
