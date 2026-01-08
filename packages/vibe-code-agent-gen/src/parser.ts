/**
 * Vibe-Coding Requirement Parser
 *
 * Analyzes conversation history to extract and understand agent requirements.
 * Uses both AI-based parsing and heuristic extraction for robustness.
 */

import type { Message, AIProvider } from './types'
import type { AgentRequirements } from './vibe-types'
import { VibeCodingError } from './vibe-types'

/**
 * Extracts agent requirements from full conversation
 *
 * @param conversation - Complete conversation history
 * @param provider - AI provider for analysis
 * @returns Extracted requirements
 */
export async function extractAgentRequirements(
  conversation: Message[],
  provider: AIProvider
): Promise<AgentRequirements> {
  try {
    // Build conversation context
    const conversationText = formatConversation(conversation)

    const prompt = buildExtractionPrompt(conversationText)

    const response = await provider.chat({
      conversationId: 'vibe-coding',
      agentId: 'system',
      messages: conversation.slice(-10),
      prompt,
      stream: false,
    })

    // Parse JSON from response
    const jsonMatch = response.content.match(/```json\n?([\s\S]*?)\n?```/) ||
                     response.content.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      throw new VibeCodingError(
        'Failed to extract requirements from conversation',
        'INVALID_RESPONSE',
        { response: response.content }
      )
    }

    const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])

    // Validate and fill in defaults
    return validateAndNormalizeRequirements(parsed)
  } catch (error) {
    console.error('AI extraction failed, using heuristic analysis:', error)

    // Fallback to heuristic extraction
    return extractRequirementsHeuristic(conversation)
  }
}

/**
 * Analyzes conversation to infer additional requirements
 *
 * @param conversation - Conversation history
 * @param requirements - Current requirements to enhance
 * @param provider - AI provider
 * @returns Enhanced requirements
 */
export async function analyzeConversationPatterns(
  conversation: Message[],
  requirements: AgentRequirements,
  provider: AIProvider
): Promise<AgentRequirements> {
  try {
    const userMessages = conversation.filter(m => m.author === 'user')
    const aiMessages = conversation.filter(m => m.author !== 'user')

    // Analyze patterns
    const avgUserLength = averageLength(userMessages)
    const avgAILength = averageLength(aiMessages)

    const prompt = `Analyze these conversation patterns and suggest agent requirements:

User message statistics:
- Average length: ${avgUserLength.toFixed(0)} characters
- Total messages: ${userMessages.length}

AI message statistics:
- Average length: ${avgAILength.toFixed(0)} characters
- Total messages: ${aiMessages.length}

Current requirements:
${JSON.stringify(requirements, null, 2)}

Based on these patterns, suggest adjustments to:
1. Verbosity level (does user prefer brief or detailed responses?)
2. Tone (formal vs casual based on user's language)
3. Ask-for-clarification (does user give detailed instructions or brief ones?)
4. Brief-by-default (should AI keep responses short?)

Respond with JSON only, containing the updated requirements fields:
\`\`\`json
{
  "personality": {
    "verbosity": "concise|balanced|detailed",
    "tone": "professional|casual|friendly|formal|playful|technical",
    "style": "direct|empathetic|analytical|creative|educational"
  },
  "constraints": {
    "briefByDefault": true|false,
    "askForClarification": true|false
  }
}
\`\`\``

    const response = await provider.chat({
      conversationId: 'vibe-coding',
      agentId: 'system',
      messages: [],
      prompt,
      stream: false,
    })

    const jsonMatch = response.content.match(/```json\n?([\s\S]*?)\n?```/) ||
                     response.content.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[1] || jsonMatch[0])

      // Merge suggestions
      return {
        ...requirements,
        personality: {
          ...requirements.personality,
          ...suggestions.personality,
        },
        constraints: {
          ...requirements.constraints,
          ...suggestions.constraints,
        },
      }
    }
  } catch (error) {
    console.error('Pattern analysis failed:', error)
  }

  return requirements
}

/**
 * Formats conversation for analysis
 */
function formatConversation(conversation: Message[]): string {
  return conversation.map(m => {
    const author = m.author === 'user' ? 'User' : 'Assistant'
    return `${author}: ${m.content.text || ''}`
  }).join('\n')
}

/**
 * Builds prompt for requirement extraction
 */
function buildExtractionPrompt(conversationText: string): string {
  return `You are analyzing a conversation to extract requirements for a custom AI agent.

Conversation:
${conversationText}

Your task: Extract what kind of AI agent the user wants to create.

Look for:
1. **Personality & Tone**
   - Tone: professional, casual, friendly, formal, playful, technical
   - Verbosity: concise (brief), balanced, detailed (comprehensive)
   - Style: direct, empathetic, analytical, creative, educational

2. **Constraints**
   - briefByDefault: should responses be brief by default?
   - askForClarification: should AI ask when unsure?
   - maxResponseTokens: any length limits mentioned?
   - functionCallPermission: always_ask, auto_approve_safe, or never_call
   - functionPermissionTimeout: wait time in ms (null = indefinite)
   - showReasoning: should AI show its thinking?

3. **Capabilities**
   - canSeeWeb: web browsing mentioned?
   - canSeeFiles: file access needed?
   - canHearAudio: audio processing?
   - canGenerateImages: image generation?

4. **Use Case**
   - What is this agent for?

5. **Special Instructions**
   - Array of specific requirements mentioned

Respond with JSON only:
\`\`\`json
{
  "name": "Agent name if mentioned",
  "icon": "emoji icon if mentioned",
  "description": "Brief description",
  "personality": {
    "tone": "professional|casual|friendly|formal|playful|technical",
    "verbosity": "concise|balanced|detailed",
    "style": "direct|empathetic|analytical|creative|educational"
  },
  "constraints": {
    "briefByDefault": false,
    "askForClarification": true,
    "maxResponseTokens": null,
    "functionCallPermission": "auto_approve_safe",
    "functionPermissionTimeout": 30000,
    "showReasoning": false
  },
  "capabilities": {
    "canSeeWeb": false,
    "canSeeFiles": true,
    "canHearAudio": false,
    "canGenerateImages": false
  },
  "useCase": "Description of purpose",
  "specialInstructions": ["specific requirement 1", "specific requirement 2"]
}
\`\`\`

If a requirement isn't mentioned, use reasonable defaults for a general-purpose assistant.`
}

/**
 * Validates and normalizes requirements
 */
function validateAndNormalizeRequirements(parsed: any): AgentRequirements {
  return {
    name: parsed.name || 'Custom Agent',
    icon: parsed.icon || '🤖',
    description: parsed.description || 'A custom AI agent created through conversation',
    personality: {
      tone: parsed.personality?.tone || 'professional',
      verbosity: parsed.personality?.verbosity || 'balanced',
      style: parsed.personality?.style || 'direct',
    },
    constraints: {
      briefByDefault: parsed.constraints?.briefByDefault || false,
      askForClarification: parsed.constraints?.askForClarification ?? true,
      maxResponseTokens: parsed.constraints?.maxResponseTokens || undefined,
      functionCallPermission: parsed.constraints?.functionCallPermission || 'auto_approve_safe',
      functionPermissionTimeout: parsed.constraints?.functionPermissionTimeout ?? 30000,
      showReasoning: parsed.constraints?.showReasoning || false,
    },
    capabilities: {
      canSeeWeb: parsed.capabilities?.canSeeWeb || false,
      canSeeFiles: parsed.capabilities?.canSeeFiles ?? true,
      canHearAudio: parsed.capabilities?.canHearAudio || false,
      canGenerateImages: parsed.capabilities?.canGenerateImages || false,
    },
    useCase: parsed.useCase || 'General assistance',
    specialInstructions: parsed.specialInstructions || [],
  }
}

/**
 * Heuristic requirement extraction (fallback)
 */
function extractRequirementsHeuristic(conversation: Message[]): AgentRequirements {
  const userMessages = conversation.filter(m => m.author === 'user')
  const allText = userMessages.map(m => m.content.text || '').join(' ').toLowerCase()

  const requirements: AgentRequirements = {
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

  // Analyze tone from user language
  if (allText.includes('hey') || allText.includes('hi') || allText.includes('casual')) {
    requirements.personality.tone = 'casual'
  } else if (allText.includes('please') || allText.includes('would you')) {
    requirements.personality.tone = 'professional'
  }

  // Analyze verbosity preference
  if (allText.includes('concise') || allText.includes('brief') || allText.includes('short')) {
    requirements.personality.verbosity = 'concise'
    requirements.constraints.briefByDefault = true
  } else if (allText.includes('detailed') || allText.includes('comprehensive') || allText.includes('thorough')) {
    requirements.personality.verbosity = 'detailed'
  }

  // Analyze style
  if (allText.includes('creative') || allText.includes('imaginative')) {
    requirements.personality.style = 'creative'
  } else if (allText.includes('analytical') || allText.includes('data')) {
    requirements.personality.style = 'analytical'
  } else if (allText.includes('teach') || allText.includes('explain')) {
    requirements.personality.style = 'educational'
  }

  // Function call permissions
  if (allText.includes('ask') && allText.includes('permission')) {
    requirements.constraints.functionCallPermission = 'always_ask'
  }

  // Capabilities
  requirements.capabilities.canSeeWeb = allText.includes('web') || allText.includes('internet')
  requirements.capabilities.canHearAudio = allText.includes('audio') || allText.includes('voice')
  requirements.capabilities.canGenerateImages = allText.includes('image') || allText.includes('picture')

  // Extract special instructions
  const sentences = allText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0)
  requirements.specialInstructions = sentences.slice(0, 5)

  return requirements
}

/**
 * Calculates average message length
 */
function averageLength(messages: Message[]): number {
  if (messages.length === 0) return 0

  const totalLength = messages.reduce((sum, m) => {
    return sum + (m.content.text?.length || 0)
  }, 0)

  return totalLength / messages.length
}
