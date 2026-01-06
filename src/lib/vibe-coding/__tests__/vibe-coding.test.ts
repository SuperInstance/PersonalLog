/**
 * Vibe-Coding Engine Tests
 */

import { describe, it, expect } from 'vitest'
import type { Message } from '@/types/conversation'
import { VibeCodingState } from '../types'
import {
  generateClarificationQuestions,
  parseUserResponses,
} from '../clarifier'
import { extractAgentRequirements } from '../parser'
import { generateAgentDefinition } from '../generator'
import { VibeCodingStateMachine } from '../state-machine'

// Mock AI provider
const mockProvider: any = {
  id: 'test-provider',
  name: 'Test Provider',
  type: 'openai',

  async isAvailable() {
    return true
  },

  async chat(request: any) {
    // Return mock responses based on prompt
    if (request.prompt.includes('Generate 3 targeted clarification questions')) {
      return {
        content: `1. Should I be concise in ALL responses, or only when providing information?
2. When you say "ask before calling functions", which functions specifically?
3. Should I show you what function I'm about to call, or ask permission in general?`,
        model: 'test-model',
        tokens: { input: 100, output: 50, total: 150 },
        finishReason: 'stop',
      }
    }

    if (request.prompt.includes('Update the requirements based on')) {
      return {
        content: `{\n  "personality": {\n    "tone": "professional",\n    "verbosity": "concise",\n    "style": "direct"\n  },\n  "constraints": {\n    "briefByDefault": true,\n    "askForClarification": true,\n    "functionCallPermission": "always_ask"\n  }\n}`,
        model: 'test-model',
        tokens: { input: 100, output: 50, total: 150 },
        finishReason: 'stop',
      }
    }

    if (request.prompt.includes('Analyze these conversation patterns')) {
      return {
        content: `{\n  "personality": {\n    "verbosity": "concise"\n  },\n  "constraints": {\n    "briefByDefault": true\n  }\n}`,
        model: 'test-model',
        tokens: { input: 100, output: 50, total: 150 },
        finishReason: 'stop',
      }
    }

    return {
      content: 'Mock response',
      model: 'test-model',
      tokens: { input: 100, output: 50, total: 150 },
      finishReason: 'stop',
    }
  },

  async chatStream(request: any, onChunk: any) {
    return this.chat(request)
  },

  estimateTokens(text: string) {
    return Math.ceil(text.length / 4)
  },

  getMaxTokens() {
    return 4000
  },
}

describe('Vibe-Coding Engine', () => {
  describe('generateClarificationQuestions', () => {
    it('should generate questions for turn 1', async () => {
      const questions = await generateClarificationQuestions(
        [],
        {},
        1,
        mockProvider
      )

      expect(questions).toBeDefined()
      expect(questions.length).toBeGreaterThan(0)
      expect(questions.length).toBeLessThanOrEqual(3)
    })

    it('should generate questions for turn 2', async () => {
      const questions = await generateClarificationQuestions(
        [],
        {
          personality: {
            tone: 'professional',
            verbosity: 'balanced',
            style: 'direct',
          },
        },
        2,
        mockProvider
      )

      expect(questions).toBeDefined()
      expect(questions.length).toBeGreaterThan(0)
    })
  })

  describe('parseUserResponses', () => {
    it('should extract requirements from user responses', async () => {
      const questions = [
        'Should I be concise in ALL responses?',
        'Which functions should I ask permission for?',
      ]

      const responses = [
        'Concise in info responses only',
        'All functions',
      ]

      const requirements = await parseUserResponses(
        responses,
        questions,
        {},
        mockProvider
      )

      expect(requirements).toBeDefined()
      expect(requirements.personality).toBeDefined()
    })
  })

  describe('extractAgentRequirements', () => {
    it('should extract requirements from conversation', async () => {
      const conversation: Message[] = [
        {
          id: '1',
          conversationId: 'test',
          type: 'text',
          author: 'user',
          content: { text: 'I want a concise assistant' },
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      ]

      const requirements = await extractAgentRequirements(
        conversation,
        mockProvider
      )

      expect(requirements).toBeDefined()
      expect(requirements.personality).toBeDefined()
      expect(requirements.constraints).toBeDefined()
      expect(requirements.capabilities).toBeDefined()
    })
  })

  describe('generateAgentDefinition', () => {
    it('should generate complete agent definition', () => {
      const requirements = {
        name: 'Test Agent',
        icon: '🤖',
        description: 'A test agent',
        personality: {
          tone: 'professional' as const,
          verbosity: 'concise' as const,
          style: 'direct' as const,
        },
        constraints: {
          briefByDefault: true,
          askForClarification: true,
          functionCallPermission: 'always_ask' as const,
          functionPermissionTimeout: 30000,
          showReasoning: false,
        },
        capabilities: {
          canSeeWeb: false,
          canSeeFiles: true,
          canHearAudio: false,
          canGenerateImages: false,
        },
        useCase: 'Testing',
        specialInstructions: [],
      }

      const result = generateAgentDefinition(requirements)

      expect(result).toBeDefined()
      expect(result.definition).toBeDefined()
      expect(result.definition.id).toBeDefined()
      expect(result.definition.name).toBe('Test Agent')
      expect(result.naturalLanguageSummary).toBeDefined()
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
      expect(result.warnings).toBeDefined()
    })

    it('should generate natural language summary', () => {
      const requirements = {
        name: 'Concise Assistant',
        icon: '💬',
        description: 'Provides concise responses',
        personality: {
          tone: 'professional' as const,
          verbosity: 'concise' as const,
          style: 'direct' as const,
        },
        constraints: {
          briefByDefault: true,
          askForClarification: true,
          functionCallPermission: 'always_ask' as const,
          functionPermissionTimeout: null,
          showReasoning: false,
        },
        capabilities: {
          canSeeWeb: false,
          canSeeFiles: true,
          canHearAudio: false,
          canGenerateImages: false,
        },
        useCase: 'Quick information',
        specialInstructions: [],
      }

      const result = generateAgentDefinition(requirements)

      expect(result.naturalLanguageSummary).toContain('Concise Assistant')
      expect(result.naturalLanguageSummary).toContain('💬')
      expect(result.naturalLanguageSummary).toContain('concise')
    })
  })

  describe('VibeCodingStateMachine', () => {
    it('should create new session', async () => {
      const machine = new VibeCodingStateMachine('test-conv', mockProvider)
      await machine.initialize()

      const session = machine.getSession()
      expect(session.sessionId).toBeDefined()
      expect(session.conversationId).toBe('test-conv')
      expect(session.state).toBe(VibeCodingState.IDLE)
    })

    it('should start clarification process', async () => {
      const machine = new VibeCodingStateMachine('test-conv', mockProvider)
      await machine.initialize()

      const result = await machine.start([])

      expect(result.nextState).toBe(VibeCodingState.CLARIFYING_TURN_1)
      expect(result.questions).toBeDefined()
      expect(result.questions!.length).toBeGreaterThan(0)
    })

    it('should advance through turns', async () => {
      const machine = new VibeCodingStateMachine('test-conv', mockProvider)
      await machine.initialize()

      await machine.start([])

      const result2 = await machine.advanceTurn([], ['Response 1', 'Response 2'])
      expect(result2.nextState).toBe(VibeCodingState.CLARIFYING_TURN_2)

      const result3 = await machine.advanceTurn([], ['Response 3', 'Response 4'])
      expect(result3.nextState).toBe(VibeCodingState.GENERATING)
      expect(result3.canGenerate).toBe(true)
    })

    it('should generate agent definition', async () => {
      const machine = new VibeCodingStateMachine('test-conv', mockProvider)
      await machine.initialize()

      await machine.start([])
      await machine.advanceTurn([], ['Response 1', 'Response 2'])
      await machine.advanceTurn([], ['Response 3', 'Response 4'])

      const agent = await machine.generate([])

      expect(agent).toBeDefined()
      expect(agent.definition).toBeDefined()
      expect(agent.naturalLanguageSummary).toBeDefined()
    })

    it('should approve and complete', async () => {
      const machine = new VibeCodingStateMachine('test-conv', mockProvider)
      await machine.initialize()

      await machine.start([])
      await machine.advanceTurn([], ['Response 1'])
      await machine.advanceTurn([], ['Response 2'])
      await machine.generate([])

      await machine.approve()

      const session = machine.getSession()
      expect(session.state).toBe(VibeCodingState.COMPLETED)
    })

    it('should cancel session', async () => {
      const machine = new VibeCodingStateMachine('test-conv', mockProvider)
      await machine.initialize()

      await machine.start([])
      await machine.cancel()

      const session = machine.getSession()
      expect(session.state).toBe(VibeCodingState.CANCELLED)
    })

    it('should reset session', async () => {
      const machine = new VibeCodingStateMachine('test-conv', mockProvider)
      await machine.initialize()

      await machine.start([])
      await machine.reset()

      const session = machine.getSession()
      expect(session.state).toBe(VibeCodingState.IDLE)
      expect(session.turns).toHaveLength(0)
    })
  })
})
