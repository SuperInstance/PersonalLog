/**
 * Vibe-Coding Clarification Engine
 *
 * Generates intelligent clarification questions based on user input
 * and conversation context to refine agent requirements.
 */

import type { Message, AIProvider } from './types'
import type { AgentRequirements, QuestionGenerationOptions } from './vibe-types'
import { VibeCodingError } from './vibe-types'

/**
 * Generates clarification questions for a given turn
 *
 * @param conversation - Conversation history
 * @param currentRequirements - Requirements extracted so far
 * @param turnNumber - Current turn number (1, 2, or 3)
 * @param provider - AI provider to use for question generation
 * @param options - Generation options
 * @returns Array of clarification questions
 */
export async function generateClarificationQuestions(
  conversation: Message[],
  currentRequirements: Partial<AgentRequirements>,
  turnNumber: number,
  provider: AIProvider,
  options: QuestionGenerationOptions = {}
): Promise<string[]> {
  const maxQuestions = options.maxQuestions || 3

  // Build context for question generation
  const context = buildQuestionContext(conversation, currentRequirements, turnNumber)

  try {
    // Use AI to generate targeted questions
    const prompt = buildQuestionPrompt(context, turnNumber, maxQuestions, options.focusAreas)

    const response = await provider.chat({
      conversationId: 'vibe-coding',
      agentId: 'system',
      messages: conversation.slice(-5), // Last 5 messages for context
      prompt,
      stream: false,
    })

    // Parse questions from response
    const questions = parseQuestionsFromResponse(response.content)

    // Ensure we have the right number of questions
    return questions.slice(0, maxQuestions)
  } catch (error) {
    console.error('Failed to generate AI questions, falling back to templates:', error)

    // Fallback to template-based questions
    return generateTemplateQuestions(currentRequirements, turnNumber, maxQuestions)
  }
}

/**
 * Parses user responses to extract requirements
 *
 * @param responses - User's response text
 * @param questions - Questions that were asked
 * @param currentRequirements - Current requirements to update
 * @param provider - AI provider for parsing
 * @returns Updated requirements
 */
export async function parseUserResponses(
  responses: string[],
  questions: string[],
  currentRequirements: Partial<AgentRequirements>,
  provider: AIProvider
): Promise<Partial<AgentRequirements>> {
  try {
    const prompt = buildParsePrompt(responses, questions, currentRequirements)

    const response = await provider.chat({
      conversationId: 'vibe-coding',
      agentId: 'system',
      messages: [],
      prompt,
      stream: false,
    })

    // Extract JSON from response
    const jsonMatch = response.content.match(/```json\n?([\s\S]*?)\n?```/) ||
                     response.content.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      throw new VibeCodingError(
        'Failed to parse requirements from response',
        'INVALID_RESPONSE',
        { response: response.content }
      )
    }

    const parsedRequirements = JSON.parse(jsonMatch[1] || jsonMatch[0])

    // Merge with existing requirements
    return {
      ...currentRequirements,
      ...parsedRequirements,
    }
  } catch (error) {
    console.error('Failed to parse responses with AI, using heuristic extraction:', error)

    // Fallback to heuristic extraction
    return extractRequirementsHeuristic(responses, questions, currentRequirements)
  }
}

/**
 * Builds context for question generation
 */
function buildQuestionContext(
  conversation: Message[],
  requirements: Partial<AgentRequirements>,
  turnNumber: number
): string {
  const recentMessages = conversation.slice(-10).map(m => {
    const author = m.author === 'user' ? 'User' : 'Assistant'
    return `${author}: ${m.content.text || ''}`
  }).join('\n')

  const requirementsContext = requirements
    ? `\nCurrent understanding:\n${JSON.stringify(requirements, null, 2)}`
    : ''

  return `
Recent conversation:
${recentMessages}
${requirementsContext}

Turn: ${turnNumber} of 3
`
}

/**
 * Builds prompt for question generation
 */
function buildQuestionPrompt(
  context: string,
  _turnNumber: number,
  maxQuestions: number,
  focusAreas?: string[]
): string {
  const focusInstructions = focusAreas?.length
    ? `\nFocus areas: ${focusAreas.join(', ')}`
    : ''

  return `You are helping a user create a custom AI agent through a 3-turn clarification process.

${context}

Your task: Generate ${maxQuestions} targeted clarification questions to better understand what the user wants.
${focusInstructions}

Turn 1 focus: Basic understanding - personality, tone, general purpose
Turn 2 focus: Specific behaviors - constraints, permissions, special requirements
Turn 3 focus: Final details - edge cases, preferences, confirmation

Guidelines:
- Ask specific, actionable questions
- Avoid yes/no questions when possible
- Build on what the user has already said
- Don't repeat information already provided
- Number your questions clearly

Respond with ONLY the questions, one per line, like this:
1. First question?
2. Second question?
3. Third question?`
}

/**
 * Parses questions from AI response
 */
function parseQuestionsFromResponse(response: string): string[] {
  const lines = response.split('\n').filter(line => line.trim())

  const questions: string[] = []

  for (const line of lines) {
    // Match numbered questions
    const match = line.match(/^\d+\.\s*(.+?)[.?]?$/)
    if (match) {
      questions.push(match[1].trim())
    }
  }

  // If no numbered questions found, try to extract bullet points
  if (questions.length === 0) {
    for (const line of lines) {
      const match = line.match(/^[-•]\s*(.+?)[.?]?$/)
      if (match) {
        questions.push(match[1].trim())
      }
    }
  }

  return questions
}

/**
 * Generates template-based questions (fallback)
 */
function generateTemplateQuestions(
  _requirements: Partial<AgentRequirements>,
  turnNumber: number,
  maxQuestions: number
): string[] {
  const templates: Record<number, string[][]> = {
    1: [
      [
        'Should I be concise in ALL responses, or only when providing information?',
        'When you say "ask before calling functions", which functions specifically?',
        'Should I show you what function I\'m about to call, or ask permission in general?',
      ],
      [
        'What tone would you like me to use when responding?',
        'Should I be direct and to-the-point, or more conversational?',
        'Any specific topics or domains I should focus on?',
      ],
    ],
    2: [
      [
        'How should I handle it if you don\'t respond to my permission request?',
        'Do you want me to wait indefinitely, timeout after 30s, or proceed anyway?',
        'Any specific format for showing function details?',
      ],
      [
        'Should I ask for clarification when your request is ambiguous?',
        'How detailed should my reasoning be before responding?',
        'Any topics or words I should avoid?',
      ],
    ],
    3: [
      [
        'Anything else I should know about your preferences?',
        'Would you like me to learn from our conversations over time?',
        'Should I proactively suggest improvements or only respond when asked?',
      ],
      [
        'Any final adjustments to how I should behave?',
        'What should I do when I\'m not sure how to respond?',
        'Would you like me to provide explanations for my actions?',
      ],
    ],
  }

  // Select template set based on turn
  const turnTemplates = templates[turnNumber] || templates[1]

  // Return random subset
  const shuffled = turnTemplates[Math.floor(Math.random() * turnTemplates.length)]
  return shuffled.slice(0, maxQuestions)
}

/**
 * Builds prompt for response parsing
 */
function buildParsePrompt(
  responses: string[],
  questions: string[],
  currentRequirements: Partial<AgentRequirements>
): string {
  return `You are extracting agent requirements from user responses.

Questions asked:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

User responses:
${responses.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Current requirements:
${JSON.stringify(currentRequirements, null, 2)}

Your task: Update the requirements based on the user's responses.
Extract specific values for:
- personality (tone, verbosity, style)
- constraints (briefByDefault, askForClarification, functionCallPermission, etc.)
- capabilities (canSeeWeb, canSeeFiles, canHearAudio, canGenerateImages)
- useCase (description of purpose)
- specialInstructions (array of specific requirements)

Respond with a JSON object containing the updated requirements. Format:
\`\`\`json
{
  "personality": { ... },
  "constraints": { ... },
  "capabilities": { ... },
  "useCase": "...",
  "specialInstructions": ["...", "..."]
}
\`\`\`

Rules:
- Keep existing values if user didn't specify
- Infer reasonable defaults from context
- specialInstructions should be an array of specific requirements mentioned
- Use exact values from enums where specified above`
}

/**
 * Heuristic requirement extraction (fallback)
 */
function extractRequirementsHeuristic(
  responses: string[],
  _questions: string[],
  current: Partial<AgentRequirements>
): Partial<AgentRequirements> {
  const requirements: Partial<AgentRequirements> = {
    ...current,
    personality: current.personality || {
      tone: 'professional',
      verbosity: 'balanced',
      style: 'direct',
    },
    constraints: current.constraints || {
      briefByDefault: false,
      askForClarification: true,
      functionCallPermission: 'auto_approve_safe',
      functionPermissionTimeout: 30000,
      showReasoning: false,
    },
    capabilities: current.capabilities || {
      canSeeWeb: false,
      canSeeFiles: true,
      canHearAudio: false,
      canGenerateImages: false,
    },
    specialInstructions: current.specialInstructions || [],
  }

  const allText = responses.join(' ').toLowerCase()

  // Extract tone
  if (allText.includes('casual') || allText.includes('friendly')) {
    requirements.personality!.tone = 'casual'
  } else if (allText.includes('formal') || allText.includes('professional')) {
    requirements.personality!.tone = 'professional'
  }

  // Extract verbosity
  if (allText.includes('concise') || allText.includes('brief') || allText.includes('short')) {
    requirements.personality!.verbosity = 'concise'
  } else if (allText.includes('detailed') || allText.includes('comprehensive')) {
    requirements.personality!.verbosity = 'detailed'
  }

  // Extract function call permission
  if (allText.includes('always ask') || allText.includes('permission')) {
    requirements.constraints!.functionCallPermission = 'always_ask'
  } else if (allText.includes('never call') || allText.includes('no functions')) {
    requirements.constraints!.functionCallPermission = 'never_call'
  }

  // Extract timeout preference
  if (allText.includes('wait indefinitely') || allText.includes('no timeout')) {
    requirements.constraints!.functionPermissionTimeout = null
  } else if (allText.includes('timeout')) {
    const match = allText.match(/(\d+)\s*(second|minute)/)
    if (match) {
      const value = parseInt(match[1])
      requirements.constraints!.functionPermissionTimeout =
        match[2] === 'minute' ? value * 60000 : value * 1000
    }
  }

  // Extract brief mode
  if (allText.includes('all responses') && allText.includes('concise')) {
    requirements.constraints!.briefByDefault = true
  }

  // Extract capabilities
  if (allText.includes('web') || allText.includes('browse') || allText.includes('internet')) {
    requirements.capabilities!.canSeeWeb = true
  }
  if (allText.includes('audio') || allText.includes('voice') || allText.includes('hear')) {
    requirements.capabilities!.canHearAudio = true
  }
  if (allText.includes('image') || allText.includes('picture') || allText.includes('generate')) {
    requirements.capabilities!.canGenerateImages = true
  }

  return requirements
}
