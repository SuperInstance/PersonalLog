/**
 * Test Data Factories
 *
 * Factory functions for creating test data with sensible defaults.
 * Use these to reduce test boilerplate and ensure consistent test data.
 */

import type {
  Conversation,
  Message,
  MessageAuthor,
  MessageType,
  ConversationType,
  AIAgent,
  AIProvider,
} from '@/types/conversation';
import {
  createConversationId,
  createMessageId,
  createAgentId,
} from '@/types/conversation';

// ============================================================================
// CONVERSATION FACTORY
// ============================================================================

export interface ConversationFactoryOptions {
  id?: string;
  title?: string;
  type?: ConversationType;
  createdAt?: string;
  updatedAt?: string;
  messageCount?: number;
  totalTokens?: number;
  pinned?: boolean;
  archived?: boolean;
  tags?: string[];
}

/**
 * Create a mock conversation with sensible defaults
 *
 * @example
 * const conv = createMockConversation()
 * const custom = createMockConversation({ title: 'My Test', pinned: true })
 */
export function createMockConversation(
  overrides: ConversationFactoryOptions = {}
): Conversation {
  const now = new Date().toISOString();
  const id = overrides.id || createConversationId();

  return {
    id,
    title: overrides.title || 'Test Conversation',
    type: overrides.type || 'personal',
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    messages: [],
    aiContacts: [],
    settings: {
      responseMode: 'messenger',
      compactOnLimit: true,
      compactStrategy: 'summarize',
    },
    metadata: {
      messageCount: overrides.messageCount || 0,
      totalTokens: overrides.totalTokens || 0,
      hasMedia: false,
      tags: overrides.tags || [],
      pinned: overrides.pinned || false,
      archived: overrides.archived || false,
    },
  };
}

/**
 * Create multiple mock conversations
 */
export function createMockConversations(
  count: number,
  overrides: ConversationFactoryOptions = {}
): Conversation[] {
  return Array.from({ length: count }, (_, i) =>
    createMockConversation({
      ...overrides,
      title: overrides.title || `Test Conversation ${i + 1}`,
    })
  );
}

// ============================================================================
// MESSAGE FACTORY
// ============================================================================

export interface MessageFactoryOptions {
  id?: string;
  conversationId?: string;
  type?: MessageType;
  author?: MessageAuthor;
  text?: string;
  timestamp?: string;
  selected?: boolean;
  replyTo?: string;
  tokens?: number;
  model?: string;
}

/**
 * Create a mock message with sensible defaults
 *
 * @example
 * const msg = createMockMessage()
 * const userMsg = createMockMessage({ author: 'user', text: 'Hello' })
 * const aiMsg = createMockMessage({
 *   author: { type: 'ai-contact', contactId: '123', contactName: 'Bot' },
 *   text: 'Hi there!'
 * })
 */
export function createMockMessage(
  overrides: MessageFactoryOptions = {}
): Message {
  const now = new Date().toISOString();
  const id = overrides.id || createMessageId();
  const conversationId = overrides.conversationId || createConversationId();

  // Default to user author if not specified
  const author: MessageAuthor = overrides.author || 'user';

  return {
    id,
    conversationId,
    type: overrides.type || 'text',
    author,
    content: {
      text: overrides.text || 'Test message content',
    },
    timestamp: overrides.timestamp || now,
    selected: overrides.selected || false,
    replyTo: overrides.replyTo,
    metadata: {
      tokens: overrides.tokens,
      model: overrides.model,
    },
  };
}

/**
 * Create multiple mock messages
 */
export function createMockMessages(
  count: number,
  overrides: MessageFactoryOptions & {
    conversationId?: string;
  } = {}
): Message[] {
  const conversationId = overrides.conversationId || createConversationId();

  return Array.from({ length: count }, (_, i) =>
    createMockMessage({
      ...overrides,
      conversationId,
      text: overrides.text || `Test message ${i + 1}`,
    })
  );
}

/**
 * Create a user message (convenience wrapper)
 */
export function createMockUserMessage(
  text: string,
  conversationId?: string
): Message {
  return createMockMessage({
    author: 'user',
    text,
    conversationId,
  });
}

/**
 * Create an AI message (convenience wrapper)
 */
export function createMockAIMessage(
  text: string,
  contactId: string,
  contactName: string,
  conversationId?: string
): Message {
  return createMockMessage({
    author: { type: 'ai-contact', contactId, contactName },
    text,
    conversationId,
  });
}

/**
 * Create a system message (convenience wrapper)
 */
export function createMockSystemMessage(
  text: string,
  reason: string,
  conversationId?: string
): Message {
  return createMockMessage({
    type: 'system',
    author: { type: 'system', reason },
    content: { systemNote: text },
    conversationId,
  });
}

// ============================================================================
// AI AGENT FACTORY
// ============================================================================

export interface AIAgentFactoryOptions {
  id?: string;
  name?: string;
  avatar?: string;
  color?: string;
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  canSeeWeb?: boolean;
  canSeeFiles?: boolean;
  canHearAudio?: boolean;
  canGenerateImages?: boolean;
}

/**
 * Create a mock AI agent with sensible defaults
 *
 * @example
 * const agent = createMockAIAgent()
 * const customAgent = createMockAIAgent({
 *   name: 'Claude',
 *   provider: 'anthropic',
 *   model: 'claude-3-opus'
 * })
 */
export function createMockAIAgent(
  overrides: AIAgentFactoryOptions = {}
): AIAgent {
  const now = new Date().toISOString();
  const id = overrides.id || createAgentId();

  return {
    id,
    name: overrides.name || 'Test AI Agent',
    avatar: overrides.avatar,
    color: overrides.color,
    createdAt: now,
    updatedAt: now,
    config: {
      provider: overrides.provider || 'openai',
      model: overrides.model || 'gpt-4',
      temperature: overrides.temperature ?? 0.7,
      maxTokens: overrides.maxTokens ?? 2000,
      responseStyle: 'balanced',
    },
    personality: {
      systemPrompt: overrides.systemPrompt || 'You are a helpful AI assistant.',
      vibeAttributes: [],
      contextConversationIds: [],
      responsePatterns: [],
    },
    capabilities: {
      canSeeWeb: overrides.canSeeWeb ?? false,
      canSeeFiles: overrides.canSeeFiles ?? true,
      canHearAudio: overrides.canHearAudio ?? false,
      canGenerateImages: overrides.canGenerateImages ?? false,
    },
  };
}

// ============================================================================
// HARDWARE PROFILE FACTORY
// ============================================================================

export interface HardwareProfileFactoryOptions {
  score?: number;
  cores?: number;
  ram?: number;
  hasGPU?: boolean;
  gpuModel?: string;
  browser?: string;
  platform?: string;
}

/**
 * Create a mock hardware profile
 *
 * @example
 * const profile = createMockHardwareProfile()
 * const highEnd = createMockHardwareProfile({ score: 90, cores: 16, ram: 32 })
 */
export function createMockHardwareProfile(
  overrides: HardwareProfileFactoryOptions = {}
): HardwareProfileFactoryOptions & {
  browser: string;
  platform: string;
} {
  return {
    score: overrides.score ?? 50,
    cores: overrides.cores ?? 4,
    ram: overrides.ram ?? 8,
    hasGPU: overrides.hasGPU ?? false,
    gpuModel: overrides.gpuModel,
    browser: overrides.browser || 'Chrome',
    platform: overrides.platform || 'Win32',
  };
}

// ============================================================================
// ERROR CONTEXT FACTORY
// ============================================================================

export interface ErrorContextFactoryOptions {
  component?: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  additional?: Record<string, unknown>;
}

/**
 * Create a mock error context
 */
export function createMockErrorContext(
  overrides: ErrorContextFactoryOptions = {}
): ErrorContextFactoryOptions {
  return {
    component: overrides.component || 'TestComponent',
    operation: overrides.operation || 'testOperation',
    userId: overrides.userId || 'test-user-123',
    sessionId: overrides.sessionId || 'test-session-456',
    additional: overrides.additional,
  };
}

// ============================================================================
// CONVERSATION WITH MESSAGES FACTORY
// ============================================================================

export interface ConversationWithMessagesOptions {
  conversation?: ConversationFactoryOptions;
  messageCount?: number;
  includeAIMessages?: boolean;
  aiContactId?: string;
  aiContactName?: string;
}

/**
 * Create a conversation with messages (convenience wrapper)
 *
 * @example
 * const conv = createMockConversationWithMessages({ messageCount: 5 })
 * const withAI = createMockConversationWithMessages({
 *   messageCount: 10,
 *   includeAIMessages: true,
 *   aiContactName: 'Claude'
 * })
 */
export function createMockConversationWithMessages(
  options: ConversationWithMessagesOptions = {}
): Conversation & { messages: Message[] } {
  const conversation = createMockConversation(options.conversation);
  const messageCount = options.messageCount || 3;

  const messages: Message[] = [];
  const aiContactId = options.aiContactId || createAgentId();
  const aiContactName = options.aiContactName || 'Test AI';

  for (let i = 0; i < messageCount; i++) {
    // Alternate between user and AI
    if (options.includeAIMessages && i % 2 === 1) {
      messages.push(
        createMockAIMessage(
          `AI response ${i + 1}`,
          aiContactId,
          aiContactName,
          conversation.id
        )
      );
    } else {
      messages.push(
        createMockUserMessage(`User message ${i + 1}`, conversation.id)
      );
    }
  }

  return {
    ...conversation,
    messages,
    metadata: {
      ...conversation.metadata,
      messageCount: messages.length,
      totalTokens: messages.reduce((sum, msg) => sum + (msg.metadata.tokens || 0), 0),
    },
  };
}
