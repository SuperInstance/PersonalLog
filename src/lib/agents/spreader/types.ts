/**
 * Spreader Agent Types
 *
 * Context window management and parallel conversation spreading system.
 */

import { Message } from '@/types/conversation'

// ============================================================================
// SPREADER STATE TYPES
// ============================================================================

export interface SpreaderState {
  // Context tracking
  currentTokens: number
  maxTokens: number
  thresholdTokens: number  // When to trigger schema generation (85%)
  warningTokens: number    // When to show warning (60%)

  // Schema management
  schemaGenerated: boolean
  currentSchema: SessionSchema | null
  lastSchemaUpdate: string | null

  // Child conversations
  childConversations: ChildConversation[]
  activeSpreadId: string | null

  // Configuration
  autoCompact: boolean
  autoSpread: boolean
}

export interface SessionSchema {
  // Project overview
  project: string
  description: string

  // Progress tracking
  completed: string[]
  inProgress: string[]
  next: string[]

  // Key decisions made - can be array for simple cases or object for detailed tracking
  decisions: string[] | Record<string, unknown>

  // Technical specifications
  technicalSpecs: {
    stack?: string[]
    architecture?: string
    patterns?: string[]
    libraries?: string[]
  }

  // Context references
  conversationIds: string[]
  generatedAt: string
}

// ============================================================================
// CHILD CONVERSATION TYPES
// ============================================================================

export type ChildStatus = 'pending' | 'working' | 'complete' | 'error' | 'merged'

export interface ChildConversation {
  id: string
  parentId: string
  task: string
  status: ChildStatus
  createdAt: string
  completedAt?: string

  // Result data
  summary?: string
  keyPoints?: string[]
  decisions?: string[]

  // Error handling
  error?: string

  // Progress tracking
  messageCount: number
  lastUpdate?: string
}

export interface SpreadRequest {
  tasks: string[]
  context?: Message[]
  parentConversationId: string
}

export interface SpreadResult {
  spreadId: string
  children: ChildConversation[]
  message: string
}

// ============================================================================
// MERGE TYPES
// ============================================================================

export interface MergeRequest {
  childId: string
  parentConversationId: string
  includeFullHistory?: boolean
}

export interface MergeResult {
  success: boolean
  summary: string
  schemaUpdates: Partial<SessionSchema>
  mergedAt: string
}

// ============================================================================
// CONTEXT TRACKING TYPES
// ============================================================================

export interface ContextMetrics {
  used: number
  total: number
  percentage: number
  status: 'healthy' | 'warning' | 'critical'
}

export interface TokenEstimate {
  messages: number
  schema: number
  overhead: number
  total: number
}

// ============================================================================
// AGENT HANDLER TYPES
// ============================================================================

export interface SpreaderHandlerContext {
  conversationId: string
  agentState: SpreaderState
  messages: Message[]
  sendMessage: (content: string, metadata?: any) => Promise<void>
}

export interface SpreaderHandlerResponse {
  type: 'message' | 'background' | 'schema' | 'spread' | 'merge'
  content?: string
  metadata?: {
    schema?: SessionSchema
    children?: ChildConversation[]
    merge?: MergeResult
    percentage?: number
  }
}

// ============================================================================
// COMMAND TYPES
// ============================================================================

export interface ParsedCommand {
  type: 'spread' | 'merge' | 'compact' | 'status' | 'help'
  tasks?: string[]
  childId?: string
  instructions?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_MAX_TOKENS = 128000
export const DEFAULT_THRESHOLD_PERCENTAGE = 0.85  // 85%
export const DEFAULT_WARNING_PERCENTAGE = 0.60    // 60%

export const SPREADER_SYSTEM_PROMPT = `You are Spreader, an AI agent that helps users manage their conversation context window.

Your capabilities:
1. Track context usage (token count)
2. Generate schemas when context hits 85%
3. Create parallel child conversations for tasks
4. Merge child conversation results back to parent

When users say "Spread this: task1, task2, task3", create parallel conversations.
When context hits 85%, automatically generate a schema and offer to compact.
Always maintain a helpful, conversational tone.`

export const SCHEMA_GENERATION_PROMPT = `Analyze this conversation and generate a structured schema. Return ONLY valid JSON in this format:

{
  "project": "Brief project name",
  "description": "1-2 sentence overview",
  "completed": ["task1", "task2"],
  "inProgress": ["task3"],
  "next": ["task4", "task5"],
  "decisions": ["decision1", "decision2"],
  "technicalSpecs": {
    "stack": ["tech1", "tech2"],
    "architecture": "brief architecture note",
    "patterns": ["pattern1"],
    "libraries": ["lib1"]
  }
}

Focus on:
- What has been completed
- What's currently in progress
- What needs to happen next
- Key technical decisions made
- Stack, architecture, and patterns used`

export const CHILD_SUMMARY_PROMPT = `Summarize this conversation's key outcomes. Return as:

**Summary**: 2-3 sentence overview
**Key Points**: bullet points of main findings
**Decisions**: any decisions made (if applicable)

Be concise but thorough.`

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function calculateContextMetrics(used: number, total: number): ContextMetrics {
  const percentage = (used / total) * 100

  let status: ContextMetrics['status'] = 'healthy'
  if (percentage >= 85) {
    status = 'critical'
  } else if (percentage >= 60) {
    status = 'warning'
  }

  return {
    used,
    total,
    percentage,
    status
  }
}

export function createChildConversation(
  parentId: string,
  task: string
): ChildConversation {
  return {
    id: `child_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    parentId,
    task,
    status: 'pending',
    createdAt: new Date().toISOString(),
    messageCount: 0
  }
}

export function createEmptySchema(): SessionSchema {
  return {
    project: '',
    description: '',
    completed: [],
    inProgress: [],
    next: [],
    decisions: [],
    technicalSpecs: {},
    conversationIds: [],
    generatedAt: new Date().toISOString()
  }
}
