/**
 * Vibe-Coding Agent Generator
 *
 * Generates complete AgentDefinition objects from extracted requirements.
 * Creates both the structured definition and natural language summary.
 */

import type { AgentDefinition, AgentCategory, ActivationMode, AgentState } from './types'
import type { AgentRequirements, GeneratedAgent } from './vibe-types'

/**
 * Generates a complete AgentDefinition from requirements
 *
 * @param requirements - Extracted agent requirements
 * @returns Generated agent with definition and summary
 */
export function generateAgentDefinition(requirements: AgentRequirements): GeneratedAgent {
  // Generate unique ID
  const id = generateAgentId(requirements)

  // Build definition
  const definition: AgentDefinition = {
    id,
    name: requirements.name || 'Custom Agent',
    description: requirements.description || buildDescription(requirements),
    icon: requirements.icon || '🤖',
    category: determineCategory(requirements),
    activationMode: 'foreground' as ActivationMode,
    initialState: {
      status: 'idle' as AgentState,
      lastActive: new Date().toISOString(),
    },
    metadata: {
      version: '1.0.0',
      author: 'User (via Vibe-Coding)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: generateTags(requirements),
      license: 'MIT',
    },
  }

  // Validate definition
  const warnings = validateGeneratedDefinition(definition)

  // Generate natural language summary
  const naturalLanguageSummary = generateNaturalLanguageSummary(requirements)

  // Calculate confidence
  const confidence = calculateConfidence(requirements)

  return {
    definition,
    naturalLanguageSummary,
    confidence,
    warnings,
  }
}

/**
 * Generates human-readable summary of agent
 *
 * @param requirements - Agent requirements
 * @returns Formatted summary string
 */
export function generateNaturalLanguageSummary(requirements: AgentRequirements): string {
  const lines: string[] = []

  // Header
  lines.push(`# ${requirements.name || 'Custom Agent'} ${requirements.icon || '🤖'}`)
  lines.push('')

  // Description
  if (requirements.description) {
    lines.push(`**Description:** ${requirements.description}`)
    lines.push('')
  }

  // Use Case
  lines.push('## 🎯 Purpose')
  lines.push(requirements.useCase || 'General assistance')
  lines.push('')

  // Personality
  lines.push('## 🎭 Personality')
  lines.push(`- **Tone:** ${capitalize(requirements.personality.tone)}`)
  lines.push(`- **Verbosity:** ${capitalize(requirements.personality.verbosity)}`)
  lines.push(`- **Style:** ${capitalize(requirements.personality.style)}`)
  lines.push('')

  // Behavior
  lines.push('## ⚙️ Behavior')

  const behaviors: string[] = []
  if (requirements.constraints.briefByDefault) {
    behaviors.push('Provides concise responses by default')
  }
  if (requirements.constraints.askForClarification) {
    behaviors.push('Asks for clarification when needed')
  }
  if (requirements.constraints.functionCallPermission === 'always_ask') {
    behaviors.push('Always asks permission before calling functions')
    if (requirements.constraints.functionPermissionTimeout === null) {
      behaviors.push('Waits indefinitely for your response')
    } else {
      behaviors.push(`Waits ${requirements.constraints.functionPermissionTimeout / 1000}s before timing out`)
    }
  }
  if (requirements.constraints.showReasoning) {
    behaviors.push('Shows reasoning before responding')
  }

  behaviors.forEach(b => lines.push(`- ${b}`))
  lines.push('')

  // Capabilities
  lines.push('## 🔧 Capabilities')
  const capabilities = []
  if (requirements.capabilities.canSeeWeb) capabilities.push('🌐 Web browsing')
  if (requirements.capabilities.canSeeFiles) capabilities.push('📁 File access')
  if (requirements.capabilities.canHearAudio) capabilities.push('🎵 Audio processing')
  if (requirements.capabilities.canGenerateImages) capabilities.push('🖼️ Image generation')

  if (capabilities.length > 0) {
    capabilities.forEach(c => lines.push(`- ${c}`))
  } else {
    lines.push('- Standard chat capabilities')
  }
  lines.push('')

  // Special Instructions
  if (requirements.specialInstructions.length > 0) {
    lines.push('## 📋 Special Instructions')
    requirements.specialInstructions.forEach((instruction, i) => {
      lines.push(`${i + 1}. ${capitalize(instruction)}`)
    })
    lines.push('')
  }

  // Call to action
  lines.push('---')
  lines.push('')
  lines.push('**Ready to activate?** [Yes] [No] [Edit]')

  return lines.join('\n')
}

/**
 * Validates generated agent definition
 *
 * @param definition - Agent definition to validate
 * @returns Array of warning messages (empty if valid)
 */
export function validateGeneratedDefinition(definition: AgentDefinition): string[] {
  const warnings: string[] = []

  // Check required fields
  if (!definition.id) {
    warnings.push('Missing agent ID')
  }
  if (!definition.name) {
    warnings.push('Missing agent name')
  }
  if (!definition.description) {
    warnings.push('Missing agent description')
  }

  // Check for reasonable values
  if (definition.name.length > 100) {
    warnings.push('Agent name is very long (>100 characters)')
  }
  if (definition.description.length > 500) {
    warnings.push('Agent description is very long (>500 characters)')
  }

  return warnings
}

/**
 * Generates a unique agent ID from requirements
 */
function generateAgentId(requirements: AgentRequirements): string {
  const baseName = requirements.name?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'custom-agent'

  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)

  return `${baseName}-${timestamp}-${random}`
}

/**
 * Determines agent category from requirements
 */
function determineCategory(requirements: AgentRequirements): AgentCategory {
  const useCase = requirements.useCase.toLowerCase()
  const style = requirements.personality.style.toLowerCase()

  if (useCase.includes('analyz') || style.includes('analytical')) {
    return 'analysis'
  }
  if (useCase.includes('creative') || style.includes('creative')) {
    return 'creative'
  }
  if (useCase.includes('task') || useCase.includes('automat')) {
    return 'automation'
  }
  if (useCase.includes('knowled') || useCase.includes('search') || useCase.includes('browse')) {
    return 'knowledge'
  }

  return 'custom'
}

/**
 * Builds description from requirements
 */
function buildDescription(requirements: AgentRequirements): string {
  const parts: string[] = []

  // Personality
  parts.push(`A ${requirements.personality.tone} ${requirements.personality.style} assistant`)

  // Verbosity
  if (requirements.personality.verbosity === 'concise') {
    parts.push('that provides concise responses')
  } else if (requirements.personality.verbosity === 'detailed') {
    parts.push('that provides detailed, comprehensive responses')
  }

  // Key constraint
  if (requirements.constraints.functionCallPermission === 'always_ask') {
    parts.push('and asks permission before taking actions')
  }

  return parts.join(' ') + '.'
}

/**
 * Generates tags from requirements
 */
function generateTags(requirements: AgentRequirements): string[] {
  const tags: string[] = ['custom', 'vibe-coded']

  // Add personality tags
  tags.push(requirements.personality.tone)
  tags.push(requirements.personality.style)

  // Add capability tags
  if (requirements.capabilities.canSeeWeb) tags.push('web-browsing')
  if (requirements.capabilities.canSeeFiles) tags.push('file-access')
  if (requirements.capabilities.canHearAudio) tags.push('audio')
  if (requirements.capabilities.canGenerateImages) tags.push('image-gen')

  // Add constraint tags
  if (requirements.constraints.briefByDefault) tags.push('concise')
  if (requirements.constraints.askForClarification) tags.push('clarifying')

  return tags
}

/**
 * Calculates confidence score for requirements
 */
function calculateConfidence(requirements: AgentRequirements): number {
  let confidence = 0.5 // Base confidence

  // Higher confidence if user provided specific details
  if (requirements.name && requirements.name !== 'Custom Agent') {
    confidence += 0.1
  }
  if (requirements.description && requirements.description.length > 20) {
    confidence += 0.1
  }
  if (requirements.useCase && requirements.useCase.length > 10) {
    confidence += 0.1
  }

  // Higher confidence for more specific constraints
  if (requirements.constraints.functionCallPermission !== 'auto_approve_safe') {
    confidence += 0.05
  }
  if (requirements.constraints.maxResponseTokens) {
    confidence += 0.05
  }

  // Higher confidence for special instructions
  if (requirements.specialInstructions.length > 0) {
    confidence += Math.min(0.1, requirements.specialInstructions.length * 0.02)
  }

  return Math.min(1.0, confidence)
}

/**
 * Capitalizes first letter of string
 */
function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
