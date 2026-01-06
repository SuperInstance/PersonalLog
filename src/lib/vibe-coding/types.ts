/**
 * Vibe-Coding Conversation Engine Types
 *
 * Type definitions for creating custom AI agents through natural conversation.
 * Enables users to define agent behavior through a 3-turn clarification loop.
 */

import type { Message, AIAgent } from '@/types/conversation'
import type { AgentDefinition } from '@/lib/agents/types'

/**
 * State machine states for vibe-coding process
 */
export enum VibeCodingState {
  /** Not currently vibe-coding */
  IDLE = 'idle',
  /** First turn of clarification */
  CLARIFYING_TURN_1 = 'clarifying_turn_1',
  /** Second turn of clarification */
  CLARIFYING_TURN_2 = 'clarifying_turn_2',
  /** Generating agent definition */
  GENERATING = 'generating',
  /** Agent ready for preview */
  PREVIEW = 'preview',
  /** Agent approved and created */
  COMPLETED = 'completed',
  /** Process cancelled */
  CANCELLED = 'cancelled',
}

/**
 * Single clarification turn data
 */
export interface ClarificationTurn {
  /** Turn number (1, 2, or 3) */
  turnNumber: number
  /** Questions asked in this turn */
  questions: string[]
  /** User's responses to the questions */
  responses: string[]
  /** Timestamp of turn completion */
  timestamp: string
}

/**
 * Extracted agent requirements from conversation
 */
export interface AgentRequirements {
  /** Agent name (if specified) */
  name?: string
  /** Agent icon/emoji (if specified) */
  icon?: string
  /** Agent description */
  description?: string
  /** Personality and tone */
  personality: {
    /** Communication style */
    tone: 'professional' | 'casual' | 'friendly' | 'formal' | 'playful' | 'technical'
    /** Response verbosity */
    verbosity: 'concise' | 'balanced' | 'detailed'
    /** Communication approach */
    style: 'direct' | 'empathetic' | 'analytical' | 'creative' | 'educational'
  }
  /** Behavioral constraints */
  constraints: {
    /** Whether to be brief by default */
    briefByDefault: boolean
    /** Whether to ask for clarification */
    askForClarification: boolean
    /** Maximum response tokens */
    maxResponseTokens?: number
    /** Function call permission mode */
    functionCallPermission: 'always_ask' | 'auto_approve_safe' | 'never_call'
    /** Function permission timeout (ms, null = wait indefinitely) */
    functionPermissionTimeout: number | null
    /** Whether to show reasoning/thoughts */
    showReasoning: boolean
  }
  /** Capabilities */
  capabilities: {
    /** Can browse the web */
    canSeeWeb: boolean
    /** Can access files */
    canSeeFiles: boolean
    /** Can process audio */
    canHearAudio: boolean
    /** Can generate images */
    canGenerateImages: boolean
  }
  /** Use case description */
  useCase: string
  /** Special instructions or requirements */
  specialInstructions: string[]
}

/**
 * Generated agent with metadata
 */
export interface GeneratedAgent {
  /** Complete agent definition */
  definition: AgentDefinition
  /** Human-readable summary of what the agent does */
  naturalLanguageSummary: string
  /** Confidence in requirements extraction (0-1) */
  confidence: number
  /** Any warnings or notes about the generated agent */
  warnings: string[]
}

/**
 * Vibe-coding session state
 */
export interface VibeCodingSession {
  /** Unique session identifier */
  sessionId: string
  /** Conversation ID where vibe-coding is happening */
  conversationId: string
  /** Current state */
  state: VibeCodingState
  /** Clarification turns completed so far */
  turns: ClarificationTurn[]
  /** Accumulated requirements from all turns */
  requirements: AgentRequirements
  /** Generated agent (when in PREVIEW or COMPLETED state) */
  generatedAgent?: GeneratedAgent
  /** Session timestamp */
  createdAt: string
  /** Last updated timestamp */
  updatedAt: string
}

/**
 * State transition options
 */
export interface StateTransitionOptions {
  /** Whether to skip remaining clarification turns */
  skipAhead?: boolean
  /** Custom requirements override (for testing) */
  requirementsOverride?: Partial<AgentRequirements>
}

/**
 * Clarification question generation options
 */
export interface QuestionGenerationOptions {
  /** Maximum number of questions to generate */
  maxQuestions?: number
  /** Focus areas for questions */
  focusAreas?: ('personality' | 'constraints' | 'capabilities' | 'use_case')[]
}

/**
 * Vibe-coding error types
 */
export class VibeCodingError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_STATE' | 'INVALID_RESPONSE' | 'GENERATION_FAILED' | 'VALIDATION_FAILED',
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'VibeCodingError'
  }
}

/**
 * User response to clarification questions
 */
export interface UserResponse {
  /** Response text */
  text: string
  /** Response timestamp */
  timestamp: string
  /** Selected messages (if user pointed to examples) */
  selectedMessageIds?: string[]
}

/**
 * Clarification result
 */
export interface ClarificationResult {
  /** Next state */
  nextState: VibeCodingState
  /** Questions for next turn (if any) */
  questions?: string[]
  /** Whether generation can proceed */
  canGenerate: boolean
}
