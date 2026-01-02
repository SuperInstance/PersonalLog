/**
 * Filtration Service
 *
 * Enhances prompts before sending to AI and post-processes responses.
 * Makes the AI feel like "your chatbot but better and more useful."
 */

import type { FiltrationConfig } from './models'

export interface EnhancementContext {
  userMessage: string
  conversationHistory?: Array<{ role: string; content: string }>
  contactNickname?: string
  contactPersonality?: Record<string, number>
}

export interface ProcessedPrompt {
  enhanced: string
  original: string
  enhancements: string[]
}

export interface ProcessedResponse {
  processed: string
  original: string
  improvements: string[]
  keyPoints?: string[]
}

// ============================================================================
// PROMPT ENHANCEMENT
// ============================================================================

/**
 * Enhance the user's prompt before sending to AI
 */
export function enhancePrompt(
  prompt: string,
  config: FiltrationConfig,
  context?: EnhancementContext
): ProcessedPrompt {
  let enhanced = prompt
  const enhancements: string[] = []

  // Start with original
  const original = prompt

  // Apply clarity enhancement
  if (config.promptEnhancement.addClarity) {
    enhanced = addClarity(enhanced)
    enhancements.push('clarity')
  }

  // Apply structure enhancement
  if (config.promptEnhancement.addStructure) {
    enhanced = addStructure(enhanced)
    enhancements.push('structure')
  }

  // Apply context enhancement
  if (config.promptEnhancement.addContext && context) {
    const contextualized = addContext(enhanced, context)
    if (contextualized !== enhanced) {
      enhanced = contextualized
      enhancements.push('context')
    }
  }

  // Apply custom instructions
  if (config.customInstructions) {
    enhanced = applyCustomInstructions(enhanced, config.customInstructions)
    enhancements.push('custom')
  }

  return { enhanced, original, enhancements }
}

/**
 * Add clarity by expanding abbreviations and clarifying ambiguous terms
 */
function addClarity(prompt: string): string {
  let clarified = prompt

  // Common abbreviations to expand
  const abbreviations: Record<string, string> = {
    'pls': 'please',
    'plz': 'please',
    'thx': 'thanks',
    'ty': 'thank you',
    'u': 'you',
    'ur': 'your',
    'r': 'are',
    'btw': 'by the way',
    'imo': 'in my opinion',
    'imho': 'in my humble opinion',
    'afaik': 'as far as I know',
    'fyi': 'for your information',
    'tbh': 'to be honest',
    'ngl': 'not gonna lie',
  }

  for (const [abbr, expansion] of Object.entries(abbreviations)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi')
    clarified = clarified.replace(regex, expansion)
  }

  // Add specificity for vague requests
  const vaguePatterns = [
    { pattern: /help me with/i, replacement: 'Please provide detailed guidance on' },
    { pattern: /tell me about/i, replacement: 'Please provide a comprehensive explanation of' },
    { pattern: /what is/i, replacement: 'Could you explain what' },
    { pattern: /how do i/i, replacement: 'Could you provide step-by-step instructions for how to' },
  ]

  for (const { pattern, replacement } of vaguePatterns) {
    clarified = clarified.replace(pattern, replacement)
  }

  return clarified
}

/**
 * Add structure by organizing the prompt logically
 */
function addStructure(prompt: string): string {
  // Check if prompt already has structure
  const hasStructure = /^#+\s|^-\s|^\d+\.\s/m.test(prompt)

  if (hasStructure) {
    return prompt // Already structured
  }

  // For multi-part questions, add structure
  const parts = prompt.split(/[.!?]+\s+/).filter(p => p.trim().length > 10)

  if (parts.length > 1) {
    // It's a multi-part query - add numbered structure
    return parts.map((part, i) => `${i + 1}. ${part.trim()}`).join('\n\n')
  }

  // For single queries, add a clear framing
  return prompt
}

/**
 * Add contextual information based on conversation and contact
 */
function addContext(prompt: string, context: EnhancementContext): string {
  let contextualized = prompt

  // Add conversation context if available
  if (context.conversationHistory && context.conversationHistory.length > 0) {
    const recentTopics = extractRecentTopics(context.conversationHistory.slice(-3))
    if (recentTopics.length > 0) {
      contextualized = `Context: We've been discussing ${recentTopics.join(', ')}.\n\n${contextualized}`
    }
  }

  // Add personality-based context for AI contacts
  if (context.contactPersonality) {
    const dominantTraits = getDominantTraits(context.contactPersonality)
    if (dominantTraits.length > 0) {
      const traitHints = getTraitHints(dominantTraits)
      contextualized = `${contextualized}\n\nPlease respond in a way that is ${traitHints.join(', ')}.`
    }
  }

  return contextualized
}

/**
 * Apply user's custom instructions
 */
function applyCustomInstructions(prompt: string, instructions: string): string {
  return `${instructions}\n\n${prompt}`
}

// ============================================================================
// RESPONSE POST-PROCESSING
// ============================================================================

/**
 * Post-process AI response to make it more useful
 */
export function processResponse(
  response: string,
  config: FiltrationConfig
): ProcessedResponse {
  let processed = response
  const improvements: string[] = []
  const keyPoints: string[] = []

  const original = response

  // Remove filler
  if (config.responsePostProcessing.removeFiller) {
    processed = removeFiller(processed)
    improvements.push('filler-removed')
  }

  // Improve formatting
  if (config.responsePostProcessing.improveFormatting) {
    processed = improveFormatting(processed)
    improvements.push('formatting-improved')
  }

  // Extract key points
  if (config.responsePostProcessing.extractKeyPoints) {
    const points = extractKeyPoints(processed)
    keyPoints.push(...points)
    improvements.push('key-points-extracted')
  }

  return { processed, original, improvements, keyPoints }
}

/**
 * Remove filler phrases and redundancies
 */
function removeFiller(response: string): string {
  let cleaned = response

  // Filler phrases to remove
  const fillerPhrases = [
    "I'd be happy to help you with that.",
    "I'd be happy to help!",
    "I'll do my best to assist you.",
    "Let me help you with that.",
    "Certainly! I'd be glad to help.",
    "Sure thing!",
    "Of course!",
    "Absolutely!",
    "As an AI language model,",
    "As an AI assistant,",
    "As a language model,",
    "Please let me know if you need anything else.",
    "Let me know if you have any other questions.",
    "Hope this helps!",
    "Hope that helps!",
    "Is there anything else I can help with?",
  ]

  for (const filler of fillerPhrases) {
    const regex = new RegExp(filler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    cleaned = cleaned.replace(regex, '')
  }

  // Remove excessive "As mentioned before" type phrases
  cleaned = cleaned.replace(/As I (mentioned|said|noted)( earlier)?(,)?/gi, '')
  cleaned = cleaned.replace(/Like I (said|mentioned)( before)?(,)?/gi, '')

  // Clean up double spaces and sentence fragments left behind
  cleaned = cleaned.replace(/\s+([.!?])\s+/g, '$1 ').trim()
  cleaned = cleaned.replace(/\s{2,}/g, ' ')
  cleaned = cleaned.replace(/^,?\s*/, '') // Remove leading comma
  cleaned = cleaned.replace(/,\s*$/g, '.') // Fix trailing comma

  return cleaned
}

/**
 * Improve formatting for readability
 */
function improveFormatting(response: string): string {
  let formatted = response

  // Ensure bullet points are consistent
  formatted = formatted.replace(/^[\u2022\u25CB]\s*/gm, '- ')
  formatted = formatted.replace(/^(\d+)\)\s*/gm, '$1. ')

  // Add spacing before numbered lists if missing
  formatted = formatted.replace(/([^\n])(\n\d+\.)/g, '$1\n\n$2')

  // Fix code blocks that don't have proper fencing
  if (formatted.includes('```') === false) {
    // Look for indented code-like content
    const codePattern = /(?:\n|^)(    {2,}|\t{1,})([^\n]+)/g
    const matches = [...formatted.matchAll(codePattern)]
    if (matches.length >= 2) {
      // It's probably code, wrap it
      formatted = formatted.replace(codePattern, '\n    $2')
      // Add fences (simplified - would need more complex logic for real implementation)
    }
  }

  // Fix run-on sentences that should be bullet lists
  formatted = formatted.replace(/([a-z])(, and |, )([A-Z][a-z]+:)/g, '$1\n\n$3')

  // Ensure proper spacing around headers
  formatted = formatted.replace(/([^\n])(\n#{1,3}\s)/g, '$1\n\n$2')

  return formatted
}

/**
 * Extract key points from response
 */
export function extractKeyPoints(response: string): string[] {
  const points: string[] = []

  // Look for explicit "key point" indicators
  const keyPointPatterns = [
    /(?:key point|main point|important|takeaway)(?:s)?:?\s*([^\n]+)/gi,
    /(?:-|\*|\d+\.)\s+\*\*([^\*]+)\*\*:?/g,
  ]

  for (const pattern of keyPointPatterns) {
    const matches = [...response.matchAll(pattern)]
    for (const match of matches) {
      const point = match[1]?.trim()
      if (point && point.length > 5 && point.length < 200) {
        points.push(point)
      }
    }
  }

  // If no explicit points found, extract sentences with emphasis
  if (points.length === 0) {
    const emphaticPattern = /(?:\*\*|__)([^\*_]+?)(?:\*\*|__)/g
    const matches = [...response.matchAll(emphaticPattern)]
    for (const match of matches) {
      const point = match[1]?.trim()
      if (point && point.length > 5 && point.length < 200) {
        points.push(point)
      }
    }
  }

  // Still no points? Extract first sentences from paragraphs
  if (points.length === 0) {
    const paragraphs = response.split(/\n\n+/)
    for (const para of paragraphs) {
      const firstSentence = para.match(/^[^.!?]+[.!?]/)
      if (firstSentence && firstSentence[0].length > 20 && firstSentence[0].length < 200) {
        points.push(firstSentence[0].trim())
        if (points.length >= 5) break
      }
    }
  }

  return points.slice(0, 7) // Max 7 key points
}

// ============================================================================
// CONTEXT ANALYSIS
// ============================================================================

/**
 * Extract topics from recent conversation history
 */
function extractRecentTopics(messages: Array<{ role: string; content: string }>): string[] {
  const topics: string[] = []

  for (const msg of messages) {
    // Simple keyword extraction (would use NLP in production)
    const words = msg.content.toLowerCase().match(/\b[a-z]{4,}\b/g) || []
    const nouns = words.filter(w => ['what', 'that', 'this', 'from', 'have'].includes(w) === false)

    // Get most frequent words
    const frequency = new Map<string, number>()
    for (const word of nouns) {
      frequency.set(word, (frequency.get(word) || 0) + 1)
    }

    const sorted = [...frequency.entries()].sort((a, b) => b[1] - a[1])
    const topWords = sorted.slice(0, 3).map(([word]) => word)
    topics.push(...topWords)

    if (topics.length >= 5) break
  }

  return [...new Set(topics)]
}

/**
 * Get dominant personality traits
 */
function getDominantTraits(personality: Record<string, number>): string[] {
  const traits = Object.entries(personality)
    .filter(([_, value]) => value > 0.6)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([trait]) => trait)

  return traits
}

/**
 * Get human-readable hints for traits
 */
function getTraitHints(traits: string[]): string[] {
  const hints: Record<string, string> = {
    creativity: 'creative and original',
    friendliness: 'warm and friendly',
    conciseness: 'concise and to the point',
    formality: 'professional and formal',
    humor: 'engaging with appropriate humor',
    empathy: 'empathetic and understanding',
    assertiveness: 'confident and direct',
    curiosity: 'inquisitive and thought-provoking',
  }

  return traits.map(t => hints[t] || t)
}

// ============================================================================
// QUICK HELPERS
// ============================================================================

/**
 * Quick enhancement with default settings
 */
export function quickEnhance(prompt: string, context?: EnhancementContext): string {
  return enhancePrompt(prompt, DEFAULT_FILTRATION, context).enhanced
}

/**
 * Quick processing with default settings
 */
export function quickProcess(response: string): string {
  return processResponse(response, DEFAULT_FILTRATION).processed
}

// Import default
import { DEFAULT_FILTRATION } from './models'
