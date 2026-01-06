/**
 * Vibe-Coding Conversation Engine
 *
 * A complete system for creating custom AI agents through natural conversation.
 * Users describe what they want, and the system clarifies requirements through
 * a 3-turn process, then generates a complete AgentDefinition.
 *
 * ## Usage Example
 *
 * ```typescript
 * import { createStateMachine } from '@/lib/vibe-coding'
 * import { ProviderFactory } from '@/lib/ai/provider'
 *
 * // 1. Create state machine with AI provider
 * const provider = ProviderFactory.createOpenAI(process.env.OPENAI_API_KEY)
 * const machine = await createStateMachine('conversation-id', provider)
 *
 * // 2. Start the process (extracts requirements from conversation)
 * const result = await machine.start(conversationMessages)
 * console.log('Questions:', result.questions)
 *
 * // 3. User responds, advance to turn 2
 * const response2 = await machine.advanceTurn(conversationMessages, [
 *   'Concise in info responses only',
 *   'All functions',
 *   'Show me what function'
 * ])
 * console.log('Turn 2 Questions:', response2.questions)
 *
 * // 4. User responds again, advance to generation
 * const response3 = await machine.advanceTurn(conversationMessages, [
 *   'Wait indefinitely',
 *   'Show function name and parameters'
 * ])
 *
 * // 5. Generate the agent
 * const agent = await machine.generate(conversationMessages)
 * console.log('Agent Definition:', agent.definition)
 * console.log('Summary:', agent.naturalLanguageSummary)
 *
 * // 6. User approves
 * await machine.approve()
 *
 * // 7. Use the agent definition
 * registerAgent(agent.definition)
 * ```
 */

// Type exports
export type {
  VibeCodingState,
  ClarificationTurn,
  AgentRequirements,
  GeneratedAgent,
  VibeCodingSession,
  StateTransitionOptions,
  QuestionGenerationOptions,
  UserResponse,
  ClarificationResult,
} from './types'

export { VibeCodingError } from './types'

// Main exports
export {
  VibeCodingStateMachine,
  createStateMachine,
  loadStateMachine,
  listSessions,
  cleanupOldSessions,
} from './state-machine'

// Clarification engine
export {
  generateClarificationQuestions,
  parseUserResponses,
} from './clarifier'

// Parser
export {
  extractAgentRequirements,
  analyzeConversationPatterns,
} from './parser'

// Generator
export {
  generateAgentDefinition,
  generateNaturalLanguageSummary,
  validateGeneratedDefinition,
} from './generator'
