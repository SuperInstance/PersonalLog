/**
 * PersonalLog Messenger - Type Definitions
 *
 * Core types for the messenger-style note-taking and AI interaction system.
 */

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export type MessageType = 'text' | 'image' | 'file' | 'audio' | 'transcript' | 'system'

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
  selected?: boolean
  replyTo?: string
  metadata: MessageMetadata
}

export interface MessageContent {
  text?: string
  media?: MediaAttachment
  audioTranscript?: AudioTranscript
  compaction?: CompactionInfo
  systemNote?: string
}

export interface MediaAttachment {
  type: 'image' | 'file' | 'audio'
  url: string
  mimeType: string
  size: number
  name: string
  thumbnail?: string
}

export interface AudioTranscript {
  text: string
  audioUrl?: string  // Only if user chose to keep audio
  audioKept: boolean
  duration: number
  confidence?: number
}

export interface CompactionInfo {
  originalMessageCount: number
  originalMessageIds: string[]
  summary: string
  preserved: string[]  // Key points preserved verbatim
  compactedAt: string
}

export interface MessageMetadata {
  tokens?: number
  model?: string
  selectedForAI?: boolean
  editHistory?: MessageEdit[]
  reaction?: string
  // Agent-specific fields
  isAgentMessage?: boolean
  agentId?: string
  agentResponse?: {
    type: 'background' | 'foreground'
    metadata?: Record<string, unknown>
  }
}

export interface MessageEdit {
  timestamp: string
  previousContent: string
}

// ============================================================================
// CONVERSATION TYPES
// ============================================================================

export type ConversationType = 'personal' | 'ai-assisted' | 'transcript' | 'reference'

export type ResponseMode = 'messenger' | 'long-form'

export type CompactStrategy = 'summarize' | 'extract-key' | 'user-directed'

export interface Conversation {
  id: string
  title: string
  type: ConversationType
  createdAt: string
  updatedAt: string
  messages: Message[]
  aiContacts: AIAgent[]  // AI agents active in this conversation
  settings: ConversationSettings
  metadata: ConversationMetadata
}

export interface ConversationSettings {
  responseMode: ResponseMode
  compactOnLimit: boolean
  compactStrategy: CompactStrategy
  escalationThreshold?: number  // Seconds before local→cloud escalation
}

export interface ConversationMetadata {
  messageCount: number
  totalTokens: number
  hasMedia: boolean
  tags: string[]
  pinned: boolean
  archived: boolean
}

// ============================================================================
// AI CONTACT TYPES
// ============================================================================

export type AIProvider = 'local' | 'openai' | 'anthropic' | 'google' | 'custom'

export type ResponseStyle = 'brief' | 'balanced' | 'detailed'

export type MultiBotArrangement = 'parallel' | 'series'

export interface AIAgent {
  id: string
  name: string
  avatar?: string
  color?: string
  createdAt: string
  updatedAt: string
  config: AIConfig
  personality: PersonalityProfile
  capabilities: AgentCapabilities
}

export interface AIConfig {
  // Model selection
  provider: AIProvider
  model: string

  // Generation settings
  temperature: number
  maxTokens: number
  responseStyle: ResponseStyle

  // Escalation (for local models)
  escalateToCloud?: boolean
  escalationPatience?: number  // Seconds before escalating
  cloudProvider?: AIProvider

  // Multi-bot
  arrangement?: MultiBotArrangement
  collaboratorIds?: string[]  // Other AI contact IDs
}

export interface PersonalityProfile {
  systemPrompt: string
  vibeAttributes: VibeAttribute[]
  contextConversationIds: string[]  // Conversations that shaped personality
  responsePatterns: ResponsePattern[]
}

export interface VibeAttribute {
  attribute: string
  value: number
  source: 'user-set' | 'learned'
}

export interface ResponsePattern {
  trigger: string
  response: string
  confidence: number
}

export interface AgentCapabilities {
  canSeeWeb: boolean
  canSeeFiles: boolean
  canHearAudio: boolean
  canGenerateImages: boolean
}

// ============================================================================
// GLOBAL SETTINGS TYPES
// ============================================================================

export interface GlobalSettings {
  defaultAI: DefaultAISettings
  escalation: EscalationSettings
  privacy: PrivacySettings
  compaction: CompactionSettings
  ui: UISettings
}

export interface DefaultAISettings {
  provider: AIProvider
  model: string
  temperature: number
  responseStyle: ResponseStyle
}

export interface EscalationSettings {
  enabled: boolean
  defaultPatience: number
  cloudProvider: AIProvider
}

export interface PrivacySettings {
  localOnly: boolean
  dataRetention: number  // days, 0 = forever
  anonymizeCloud: boolean
}

export interface CompactionSettings {
  autoCompact: boolean
  threshold: number  // tokens
  defaultStrategy: CompactStrategy
  warnBeforeCompact: boolean
}

export interface UISettings {
  theme: 'light' | 'dark' | 'auto'
  sidebarWidth: number
  fontSize: 'small' | 'medium' | 'large'
  showTimestamps: boolean
  showTokenCounts: boolean
}

// ============================================================================
// AI REQUEST/RESPONSE TYPES
// ============================================================================

export interface ChatRequest {
  conversationId: string
  agentId: string
  messages: Message[]  // Context messages
  prompt: string  // Current user message
  selectedMessageIds?: string[]  // Messages explicitly selected for context
  stream: boolean
}

export interface ChatResponse {
  content: string
  model: string
  tokens: {
    input: number
    output: number
    total: number
  }
  finishReason: 'stop' | 'length' | 'escalated'
  escalated?: boolean  // True if response came from cloud due to escalation
  thoughts?: string  // Optional AI reasoning (if supported)
}

export interface MultiBotResponse {
  agentId: string
  agentName: string
  response: ChatResponse
}

// ============================================================================
// SELECTION TYPES
// ============================================================================

export interface MessageSelection {
  conversationId: string
  messageIds: string[]
  action: 'send-to-ai' | 'new-chat' | 'compact' | 'export'
}

export interface AIActionOptions {
  targetConversationId?: string  // For 'send-to-ai'
  createNewConversation?: boolean  // For 'new-chat'
  agentId?: string  // Which AI to use
  includeContext?: boolean  // Include non-selected messages as context
}

// ============================================================================
// COMPACTION TYPES
// ============================================================================

export interface CompactionRequest {
  conversationId: string
  strategy: CompactStrategy
  prioritizeIds?: string[]  // Messages to prioritize keeping
  userInstructions?: string  // Custom compaction instructions
  startNewConversation?: boolean
}

export interface CompactionResult {
  compactedMessage: Message
  archivedMessageIds: string[]
  newConversationId?: string
  tokensSaved: number
}

// ============================================================================
// TRANSCRIPTION TYPES
// ============================================================================

export interface TranscriptionRequest {
  audioUrl: string
  language?: string
  speakerDiarization?: boolean
  keepAudio: boolean
}

export interface TranscriptionResult {
  text: string
  duration: number
  segments: TranscriptionSegment[]
  speakers?: string[]
}

export interface TranscriptionSegment {
  speaker?: string
  text: string
  startTime: number
  endTime: number
  confidence: number
}

// ============================================================================
// VIBE FINE-TUNING TYPES
// ============================================================================

export interface VibeAdjustment {
  attribute: string
  previousValue: number
  newValue: number
  confidence: number
  reason: string  // Why the change was suggested
}

export interface VibeUpdateResult {
  adjustments: VibeAdjustment[]
  updatedSystemPrompt: string
  userMessage: string  // What triggered the update
}

// ============================================================================
// BRANDED TYPES
// ============================================================================

export type ConversationId = string & { readonly __brand: 'ConversationId' }
export type MessageId = string & { readonly __brand: 'MessageId' }
export type AgentId = string & { readonly __brand: 'AgentId' }

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function createConversationId(): ConversationId {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}` as ConversationId
}

export function createMessageId(): MessageId {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}` as MessageId
}

export function createAgentId(): AgentId {
  return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 11)}` as AgentId
}

export function isUserAuthor(author: MessageAuthor): author is 'user' {
  return author === 'user'
}

export function isAIAuthor(author: MessageAuthor): author is { type: 'ai-contact'; contactId: string; contactName: string } {
  return typeof author === 'object' && author.type === 'ai-contact'
}

export function getAuthorDisplayName(author: MessageAuthor): string {
  if (author === 'user') return 'You'
  if (typeof author === 'object' && author.type === 'ai-contact') return author.contactName
  return 'System'
}

export function getAuthorColor(author: MessageAuthor): string {
  if (author === 'user') return 'bg-blue-500'
  if (typeof author === 'object' && author.type === 'ai-contact') {
    // Generate consistent color based on contact ID
    const hash = author.contactId.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
    const colors = [
      'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500',
      'bg-teal-500', 'bg-indigo-500', 'bg-red-500', 'bg-cyan-500'
    ]
    return colors[Math.abs(hash) % colors.length]
  }
  return 'bg-gray-500'
}
