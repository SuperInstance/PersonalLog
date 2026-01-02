/**
 * AI Contact Store
 *
 * IndexedDB-based storage for AI contacts/personas.
 */

import { AIAgent, AIProvider, AgentId, createAgentId } from '@/types/conversation'

const DB_NAME = 'PersonalLogMessenger'
const STORE_AGENTS = 'ai-agents'

// ============================================================================
// DEFAULT AI CONTACTS
// ============================================================================

export const DEFAULT_AGENTS: Partial<AIAgent>[] = [
  {
    name: 'Alex',
    color: 'bg-purple-500',
    config: {
      provider: 'local',
      model: 'default',
      temperature: 0.7,
      maxTokens: 150,
      responseStyle: 'brief',
    },
    personality: {
      systemPrompt: 'You are Alex, a helpful AI assistant. You communicate concisely and friendly.',
      vibeAttributes: [
        { attribute: 'friendliness', value: 0.8, source: 'user-set' },
        { attribute: 'conciseness', value: 0.7, source: 'user-set' },
      ],
      contextConversationIds: [],
      responsePatterns: [],
    },
    capabilities: {
      canSeeWeb: false,
      canSeeFiles: true,
      canHearAudio: true,
      canGenerateImages: false,
    },
  },
  {
    name: 'Researcher',
    color: 'bg-blue-500',
    config: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      temperature: 0.5,
      maxTokens: 300,
      responseStyle: 'balanced',
    },
    personality: {
      systemPrompt: 'You are a Research Assistant. You provide thorough, well-reasoned responses with citations when possible.',
      vibeAttributes: [
        { attribute: 'thoroughness', value: 0.9, source: 'user-set' },
        { attribute: 'formality', value: 0.7, source: 'user-set' },
      ],
      contextConversationIds: [],
      responsePatterns: [],
    },
    capabilities: {
      canSeeWeb: true,
      canSeeFiles: true,
      canHearAudio: true,
      canGenerateImages: false,
    },
  },
  {
    name: 'Creative',
    color: 'bg-pink-500',
    config: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.9,
      maxTokens: 200,
      responseStyle: 'balanced',
    },
    personality: {
      systemPrompt: 'You are a creative assistant. You think outside the box and offer innovative ideas.',
      vibeAttributes: [
        { attribute: 'creativity', value: 0.95, source: 'user-set' },
        { attribute: 'playfulness', value: 0.7, source: 'user-set' },
      ],
      contextConversationIds: [],
      responsePatterns: [],
    },
    capabilities: {
      canSeeWeb: false,
      canSeeFiles: true,
      canHearAudio: false,
      canGenerateImages: true,
    },
  },
]

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function listAgents(): Promise<AIAgent[]> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_AGENTS], 'readonly')
    const store = transaction.objectStore(STORE_AGENTS)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

export async function getAgent(id: string): Promise<AIAgent | null> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_AGENTS], 'readonly')
    const store = transaction.objectStore(STORE_AGENTS)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function createAgent(
  name: string,
  config: Partial<AIAgent['config']> = {},
  personality: Partial<AIAgent['personality']> = {}
): Promise<AIAgent> {
  const database = await getDB()
  const id = createAgentId()
  const now = new Date().toISOString()

  const agent: AIAgent = {
    id,
    name,
    color: getRandomColor(),
    createdAt: now,
    updatedAt: now,
    config: {
      provider: config.provider || 'local',
      model: config.model || 'default',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens || 150,
      responseStyle: config.responseStyle || 'brief',
      escalateToCloud: config.escalateToCloud,
      escalationPatience: config.escalationPatience,
      cloudProvider: config.cloudProvider,
      arrangement: config.arrangement,
      collaboratorIds: config.collaboratorIds,
    },
    personality: {
      systemPrompt: personality.systemPrompt || `You are ${name}, a helpful AI assistant.`,
      vibeAttributes: personality.vibeAttributes || [],
      contextConversationIds: personality.contextConversationIds || [],
      responsePatterns: personality.responsePatterns || [],
    },
    capabilities: {
      canSeeWeb: personality.contextConversationIds?.includes('web') || false,
      canSeeFiles: true,
      canHearAudio: false,
      canGenerateImages: false,
    },
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_AGENTS], 'readwrite')
    const store = transaction.objectStore(STORE_AGENTS)
    const request = store.add(agent)

    request.onsuccess = () => resolve(agent)
    request.onerror = () => reject(request.error)
  })
}

export async function updateAgent(
  id: string,
  updates: Partial<Omit<AIAgent, 'id' | 'createdAt'>>
): Promise<AIAgent> {
  const database = await getDB()
  const existing = await getAgent(id)

  if (!existing) {
    throw new Error(`Agent ${id} not found`)
  }

  const updated: AIAgent = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_AGENTS], 'readwrite')
    const store = transaction.objectStore(STORE_AGENTS)
    const request = store.put(updated)

    request.onsuccess = () => resolve(updated)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteAgent(id: string): Promise<void> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_AGENTS], 'readwrite')
    const store = transaction.objectStore(STORE_AGENTS)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function initializeDefaultAgents(): Promise<void> {
  const existing = await listAgents()

  // Only create defaults if none exist
  if (existing.length === 0) {
    for (const agent of DEFAULT_AGENTS) {
      await createAgent(
        agent.name!,
        agent.config,
        agent.personality
      )
    }
  }
}

// ============================================================================
// VIBE FINE-TUNING
// ============================================================================

export async function updateAgentVibe(
  agentId: string,
  userMessage: string,
  detectedAdjustments: Array<{ attribute: string; newValue: number; reason: string }>
): Promise<AIAgent> {
  const agent = await getAgent(agentId)
  if (!agent) throw new Error('Agent not found')

  const updatedAttributes = [...agent.personality.vibeAttributes]

  for (const adjustment of detectedAdjustments) {
    const existingIndex = updatedAttributes.findIndex(a => a.attribute === adjustment.attribute)

    if (existingIndex >= 0) {
      updatedAttributes[existingIndex] = {
        ...updatedAttributes[existingIndex],
        value: adjustment.newValue,
        source: 'user-set' as const,
      }
    } else {
      updatedAttributes.push({
        attribute: adjustment.attribute,
        value: adjustment.newValue,
        source: 'user-set' as const,
      })
    }
  }

  // Update system prompt based on vibe changes
  const newSystemPrompt = generateSystemPromptFromVibe(agent.name, updatedAttributes)

  return updateAgent(agentId, {
    personality: {
      ...agent.personality,
      systemPrompt: newSystemPrompt,
      vibeAttributes: updatedAttributes,
    },
  })
}

function generateSystemPromptFromVibe(name: string, attributes: Array<{ attribute: string; value: number }>): string {
  const vibeDescriptions: string[] = []

  for (const attr of attributes) {
    const value = attr.value
    const attrName = attr.attribute

    if (value > 0.8) {
      vibeDescriptions.push(`very ${attrName}`)
    } else if (value > 0.5) {
      vibeDescriptions.push(`${attrName}`)
    } else if (value < 0.2) {
      vibeDescriptions.push(`not very ${attrName}`)
    }
  }

  const basePrompt = `You are ${name}, a helpful AI assistant.`

  if (vibeDescriptions.length > 0) {
    return `${basePrompt} You are ${vibeDescriptions.join(', ')}.`
  }

  return basePrompt
}

// ============================================================================
// UTILITIES
// ============================================================================

function getRandomColor(): string {
  const colors = [
    'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500',
    'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

export function getAgentInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}
