/**
 * Vibe-Coding State Machine
 *
 * Manages the 3-turn clarification process and state transitions.
 * Persists state to IndexedDB for resilience.
 */

import type { Message } from '@/types/conversation'
import type { AIProvider } from '@/lib/ai/provider'
import {
  VibeCodingState,
  type VibeCodingSession,
  type ClarificationTurn,
  type AgentRequirements,
  type StateTransitionOptions,
  type ClarificationResult,
  type GeneratedAgent,
} from './types'
import { VibeCodingError } from './types'
import { generateClarificationQuestions, parseUserResponses } from './clarifier'
import { extractAgentRequirements, analyzeConversationPatterns } from './parser'
import { generateAgentDefinition } from './generator'

const DB_NAME = 'PersonalLogVibeCoding'
const DB_VERSION = 1
const STORE_SESSIONS = 'sessions'

// ============================================================================
// DATABASE
// ============================================================================

let db: IDBDatabase | null = null

async function getDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(new Error(`Failed to open vibe-coding database: ${request.error}`))
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      if (!database.objectStoreNames.contains(STORE_SESSIONS)) {
        const store = database.createObjectStore(STORE_SESSIONS, { keyPath: 'sessionId' })
        store.createIndex('conversationId', 'conversationId', { unique: false })
        store.createIndex('state', 'state', { unique: false })
      }
    }
  })
}

/**
 * Saves session to IndexedDB
 */
async function saveSession(session: VibeCodingSession): Promise<void> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_SESSIONS], 'readwrite')
    const store = transaction.objectStore(STORE_SESSIONS)
    const request = store.put(session)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Loads session from IndexedDB
 */
async function loadSession(sessionId: string): Promise<VibeCodingSession | null> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_SESSIONS], 'readonly')
    const store = transaction.objectStore(STORE_SESSIONS)
    const request = store.get(sessionId)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Deletes session from IndexedDB
 */
async function deleteSession(sessionId: string): Promise<void> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_SESSIONS], 'readwrite')
    const store = transaction.objectStore(STORE_SESSIONS)
    const request = store.delete(sessionId)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ============================================================================
// STATE MACHINE CLASS
// ============================================================================

export class VibeCodingStateMachine {
  private session: VibeCodingSession
  private provider: AIProvider

  constructor(conversationId: string, provider: AIProvider, existingSessionId?: string) {
    if (existingSessionId) {
      // Load existing session (will be initialized asynchronously)
      this.session = {
        sessionId: existingSessionId,
        conversationId,
        state: VibeCodingState.IDLE,
        turns: [],
        requirements: this.getDefaultRequirements(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    } else {
      // Create new session
      this.session = {
        sessionId: `vibe-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        conversationId,
        state: VibeCodingState.IDLE,
        turns: [],
        requirements: this.getDefaultRequirements(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    this.provider = provider
  }

  /**
   * Initializes the state machine (loads existing session if provided)
   */
  async initialize(): Promise<void> {
    if (this.session.turns.length > 0) {
      const loaded = await loadSession(this.session.sessionId)
      if (loaded) {
        this.session = loaded
      }
    }
  }

  /**
   * Starts the vibe-coding process
   */
  async start(conversation: Message[]): Promise<ClarificationResult> {
    if (this.session.state !== VibeCodingState.IDLE) {
      throw new VibeCodingError(
        `Cannot start: session is in ${this.session.state} state`,
        'INVALID_STATE'
      )
    }

    // Extract initial requirements
    this.session.requirements = await extractAgentRequirements(conversation, this.provider)

    // Move to first clarification turn
    this.session.state = VibeCodingState.CLARIFYING_TURN_1
    await this.save()

    // Generate questions for turn 1
    const questions = await generateClarificationQuestions(
      conversation,
      this.session.requirements,
      1,
      this.provider
    )

    return {
      nextState: this.session.state,
      questions,
      canGenerate: false,
    }
  }

  /**
   * Advances the state machine with user response
   */
  async advanceTurn(
    conversation: Message[],
    userResponses: string[],
    options?: StateTransitionOptions
  ): Promise<ClarificationResult> {
    const currentState = this.session.state

    // Validate state
    if (
      currentState !== VibeCodingState.CLARIFYING_TURN_1 &&
      currentState !== VibeCodingState.CLARIFYING_TURN_2
    ) {
      throw new VibeCodingError(
        `Cannot advance turn from ${currentState} state`,
        'INVALID_STATE'
      )
    }

    // Determine turn number
    const turnNumber = currentState === VibeCodingState.CLARIFYING_TURN_1 ? 1 : 2

    // Get questions that were asked
    const questions = this.session.turns[turnNumber - 1]?.questions || []

    // Parse user responses
    const updatedRequirements = await parseUserResponses(
      userResponses,
      questions,
      this.session.requirements,
      this.provider
    )

    // Update requirements
    this.session.requirements = {
      ...this.session.requirements,
      ...updatedRequirements,
    } as AgentRequirements

    // Create turn record
    const turn: ClarificationTurn = {
      turnNumber,
      questions,
      responses: userResponses,
      timestamp: new Date().toISOString(),
    }

    this.session.turns.push(turn)

    // Check if user wants to skip ahead
    if (options?.skipAhead || turnNumber === 2) {
      // Move to generation
      this.session.state = VibeCodingState.GENERATING
      await this.save()

      return {
        nextState: this.session.state,
        canGenerate: true,
      }
    }

    // Advance to next turn
    const nextTurn = turnNumber + 1
    this.session.state =
      nextTurn === 2
        ? VibeCodingState.CLARIFYING_TURN_2
        : VibeCodingState.GENERATING

    await this.save()

    // Generate questions for next turn (if not generating)
    if (this.session.state === VibeCodingState.CLARIFYING_TURN_2) {
      const questions = await generateClarificationQuestions(
        conversation,
        this.session.requirements,
        2,
        this.provider
      )

      return {
        nextState: this.session.state,
        questions,
        canGenerate: false,
      }
    }

    return {
      nextState: this.session.state,
      canGenerate: true,
    }
  }

  /**
   * Generates the final agent definition
   */
  async generate(conversation: Message[]): Promise<GeneratedAgent> {
    if (this.session.state !== VibeCodingState.GENERATING) {
      throw new VibeCodingError(
        `Cannot generate from ${this.session.state} state`,
        'INVALID_STATE'
      )
    }

    // Analyze conversation patterns for final refinement
    this.session.requirements = await analyzeConversationPatterns(
      conversation,
      this.session.requirements,
      this.provider
    )

    // Generate agent
    const generated = generateAgentDefinition(this.session.requirements)

    // Store in session
    this.session.generatedAgent = generated
    this.session.state = VibeCodingState.PREVIEW
    await this.save()

    return generated
  }

  /**
   * Approves and finalizes the agent
   */
  async approve(): Promise<void> {
    if (this.session.state !== VibeCodingState.PREVIEW) {
      throw new VibeCodingError(
        `Cannot approve from ${this.session.state} state`,
        'INVALID_STATE'
      )
    }

    this.session.state = VibeCodingState.COMPLETED
    await this.save()
  }

  /**
   * Cancels the vibe-coding session
   */
  async cancel(): Promise<void> {
    this.session.state = VibeCodingState.CANCELLED
    await this.save()
  }

  /**
   * Resets the session for editing
   */
  async reset(): Promise<void> {
    this.session.state = VibeCodingState.IDLE
    this.session.turns = []
    this.session.requirements = this.getDefaultRequirements()
    this.session.generatedAgent = undefined
    await this.save()
  }

  /**
   * Gets current session state
   */
  getSession(): VibeCodingSession {
    return { ...this.session }
  }

  /**
   * Gets current requirements
   */
  getRequirements(): AgentRequirements {
    return { ...this.session.requirements }
  }

  /**
   * Updates requirements manually (for editing)
   */
  async updateRequirements(updates: Partial<AgentRequirements>): Promise<void> {
    this.session.requirements = {
      ...this.session.requirements,
      ...updates,
    }
    await this.save()
  }

  /**
   * Generates preview without advancing state
   */
  async preview(): Promise<GeneratedAgent> {
    if (!this.session.requirements) {
      throw new VibeCodingError(
        'No requirements to preview',
        'INVALID_STATE'
      )
    }

    return generateAgentDefinition(this.session.requirements)
  }

  /**
   * Cleans up the session
   */
  async cleanup(): Promise<void> {
    await deleteSession(this.session.sessionId)
  }

  /**
   * Saves session to database
   */
  private async save(): Promise<void> {
    this.session.updatedAt = new Date().toISOString()
    await saveSession(this.session)
  }

  /**
   * Gets default requirements
   */
  private getDefaultRequirements(): AgentRequirements {
    return {
      name: 'Custom Agent',
      icon: '🤖',
      description: 'A custom AI agent created through conversation',
      personality: {
        tone: 'professional',
        verbosity: 'balanced',
        style: 'direct',
      },
      constraints: {
        briefByDefault: false,
        askForClarification: true,
        functionCallPermission: 'auto_approve_safe',
        functionPermissionTimeout: 30000,
        showReasoning: false,
      },
      capabilities: {
        canSeeWeb: false,
        canSeeFiles: true,
        canHearAudio: false,
        canGenerateImages: false,
      },
      useCase: 'General assistance',
      specialInstructions: [],
    }
  }
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Creates a new state machine for a conversation
 */
export async function createStateMachine(
  conversationId: string,
  provider: AIProvider
): Promise<VibeCodingStateMachine> {
  const machine = new VibeCodingStateMachine(conversationId, provider)
  await machine.initialize()
  return machine
}

/**
 * Loads an existing state machine
 */
export async function loadStateMachine(
  sessionId: string,
  provider: AIProvider
): Promise<VibeCodingStateMachine> {
  const session = await loadSession(sessionId)
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`)
  }

  const machine = new VibeCodingStateMachine(session.conversationId, provider, sessionId)
  await machine.initialize()
  return machine
}

/**
 * Lists active sessions for a conversation
 */
export async function listSessions(conversationId: string): Promise<VibeCodingSession[]> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_SESSIONS], 'readonly')
    const index = transaction.objectStore(STORE_SESSIONS).index('conversationId')
    const request = index.getAll(conversationId)

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Cleans up old sessions
 */
export async function cleanupOldSessions(olderThanDays: number = 7): Promise<void> {
  const database = await getDB()
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_SESSIONS], 'readwrite')
    const store = transaction.objectStore(STORE_SESSIONS)
    const request = store.openCursor()

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        const session = cursor.value as VibeCodingSession
        const timestamp = new Date(session.createdAt).getTime()

        if (timestamp < cutoff) {
          cursor.delete()
        }

        cursor.continue()
      } else {
        resolve()
      }
    }

    request.onerror = () => reject(request.error)
  })
}
