/**
 * Vibe-Code-Agent-Gen - Type Definitions
 *
 * Standalone types for the agent generation system.
 * These types are designed to work independently of any specific application.
 */

// ============================================================================
// MESSAGE TYPES (for conversation context)
// ============================================================================

export type MessageType = 'text' | 'image' | 'file' | 'audio' | 'system'

export type MessageAuthor =
  | 'user'
  | { type: 'ai-contact'; contactId: string; contactName: string }
  | { type: 'system'; reason: string }

export interface Message {
  id: string
  conversationId: string
  type: MessageType
  author: MessageAuthor
  content: MessageContent
  timestamp: string
  metadata?: MessageMetadata
}

export interface MessageContent {
  text?: string
  [key: string]: unknown
}

export interface MessageMetadata {
  tokens?: number
  model?: string
  [key: string]: unknown
}

// ============================================================================
// AGENT TYPES (for generated definitions)
// ============================================================================

export type AgentCategory =
  | 'analysis'
  | 'knowledge'
  | 'creative'
  | 'automation'
  | 'communication'
  | 'data'
  | 'custom'

export type ActivationMode =
  | 'background'
  | 'foreground'
  | 'hybrid'
  | 'scheduled'

export type AgentState =
  | 'idle'
  | 'running'
  | 'paused'
  | 'error'
  | 'disabled'

export interface AgentDefinition {
  id: string
  name: string
  description: string
  icon: string
  category: AgentCategory
  activationMode: ActivationMode
  initialState: {
    status: AgentState
    lastActive: string
  }
  metadata: {
    version: string
    author: string
    createdAt: string
    updatedAt: string
    tags: string[]
    license?: string
  }
}

// ============================================================================
// AI PROVIDER TYPES (for LLM integration)
// ============================================================================

export interface AIProvider {
  id: string
  name: string
  type: string

  isAvailable(): Promise<boolean>

  chat(request: ChatRequest): Promise<ChatResponse>

  estimateTokens(text: string): number
  getMaxTokens(): number
}

export interface ChatRequest {
  conversationId: string
  agentId: string
  messages: Message[]
  prompt: string
  stream: boolean
  [key: string]: unknown
}

export interface ChatResponse {
  content: string
  model: string
  tokens: {
    input: number
    output: number
    total: number
  }
  finishReason: string
  [key: string]: unknown
}
