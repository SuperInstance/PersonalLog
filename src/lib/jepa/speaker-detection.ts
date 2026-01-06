/**
 * JEPA Speaker Detection
 *
 * Identifies speakers in transcripts based on message author and context.
 */

import { Message, MessageAuthor } from '@/types/conversation'
import { SpeakerType, SpeakerDetectionResult, SpeakerOverride } from '@/types/jepa'

/**
 * Detect speaker type from message author
 * @param author - Message author
 * @returns Detected speaker type with confidence and reasoning
 */
export function detectSpeaker(author: MessageAuthor): SpeakerDetectionResult {
  // User messages
  if (author === 'user') {
    return {
      speaker: 'user',
      confidence: 1.0,
      reason: 'Message authored by user',
    }
  }

  // AI Contact messages
  if (typeof author === 'object' && author.type === 'ai-contact') {
    return {
      speaker: 'assistant',
      confidence: 1.0,
      reason: `Message from AI contact: ${author.contactName}`,
    }
  }

  // System messages
  if (typeof author === 'object' && author.type === 'system') {
    return {
      speaker: 'system',
      confidence: 1.0,
      reason: `System message: ${author.reason}`,
    }
  }

  // Unknown
  return {
    speaker: 'unknown',
    confidence: 0.5,
    reason: 'Unable to determine speaker from author',
  }
}

/**
 * Get display name for speaker type
 * @param speaker - Speaker type
 * @param customNames - Map of custom speaker names
 * @returns Display name
 */
export function getSpeakerDisplayName(
  speaker: SpeakerType,
  customNames?: Map<SpeakerType, string>
): string {
  // Check for custom name first
  if (customNames?.has(speaker)) {
    return customNames.get(speaker)!
  }

  // Standard names
  const standardNames: Record<SpeakerType, string> = {
    user: 'User',
    assistant: 'Assistant',
    system: 'System',
    unknown: 'Unknown',
  }

  // If it's a custom speaker ID (detected from diarization)
  if (!standardNames[speaker]) {
    return `Speaker ${speaker}`
  }

  return standardNames[speaker]
}

/**
 * Get speaker color for UI display
 * @param speaker - Speaker type
 * @returns Tailwind CSS color class
 */
export function getSpeakerColor(speaker: SpeakerType): string {
  const colors: Record<string, string> = {
    user: 'bg-blue-500',
    assistant: 'bg-purple-500',
    system: 'bg-gray-500',
    unknown: 'bg-yellow-500',
  }

  // Generate consistent color for custom speaker IDs
  if (!colors[speaker]) {
    const hash = speaker.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
    const colorPalette = [
      'bg-green-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-teal-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-cyan-500',
      'bg-lime-500',
    ]
    return colorPalette[Math.abs(hash) % colorPalette.length]
  }

  return colors[speaker]
}

/**
 * Detect speaker changes in a sequence of messages
 * @param messages - Array of messages
 * @returns Array of indices where speaker changes
 */
export function detectSpeakerChanges(messages: Message[]): number[] {
  const changes: number[] = []

  for (let i = 1; i < messages.length; i++) {
    const prevSpeaker = detectSpeaker(messages[i - 1].author).speaker
    const currSpeaker = detectSpeaker(messages[i].author).speaker

    if (prevSpeaker !== currSpeaker) {
      changes.push(i)
    }
  }

  return changes
}

/**
 * Group messages by speaker
 * @param messages - Array of messages
 * @returns Map of speaker type to their messages
 */
export function groupMessagesBySpeaker(messages: Message[]): Map<SpeakerType, Message[]> {
  const groups = new Map<SpeakerType, Message[]>()

  for (const message of messages) {
    const { speaker } = detectSpeaker(message.author)

    if (!groups.has(speaker)) {
      groups.set(speaker, [])
    }

    groups.get(speaker)!.push(message)
  }

  return groups
}

/**
 * Calculate speaking statistics per speaker
 * @param messages - Array of messages
 * @returns Map of speaker type to statistics
 */
export function calculateSpeakerStats(
  messages: Message[]
): Map<SpeakerType, { messageCount: number; wordCount: number; characterCount: number }> {
  const stats = new Map<SpeakerType, { messageCount: number; wordCount: number; characterCount: number }>()

  for (const message of messages) {
    const { speaker } = detectSpeaker(message.author)

    if (!stats.has(speaker)) {
      stats.set(speaker, {
        messageCount: 0,
        wordCount: 0,
        characterCount: 0,
      })
    }

    const current = stats.get(speaker)!
    const text = message.content.text || ''

    current.messageCount++
    current.wordCount += text.split(/\s+/).filter(Boolean).length
    current.characterCount += text.length
  }

  return stats
}

/**
 * Apply speaker override to a segment
 * @param segmentId - Segment ID
 * @param originalSpeaker - Original speaker
 * @param newSpeaker - New speaker to assign
 * @param reason - Reason for override
 * @returns Speaker override record
 */
export function createSpeakerOverride(
  segmentId: string,
  originalSpeaker: SpeakerType,
  newSpeaker: SpeakerType,
  reason: string
): SpeakerOverride {
  return {
    segmentId,
    originalSpeaker,
    newSpeaker,
    reason,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Validate speaker override
 * @param override - Speaker override to validate
 * @returns True if valid
 */
export function isValidSpeakerOverride(override: SpeakerOverride): boolean {
  return (
    !!override.segmentId &&
    !!override.originalSpeaker &&
    !!override.newSpeaker &&
    !!override.reason &&
    override.originalSpeaker !== override.newSpeaker &&
    !!override.timestamp
  )
}

/**
 * Merge speaker detection results from diarization with message authors
 * @param detectedSpeaker - Speaker detected from audio diarization
 * @param messageAuthor - Message author
 * @returns Final speaker determination
 */
export function mergeSpeakerDetection(
  detectedSpeaker: SpeakerType | null,
  messageAuthor: MessageAuthor
): SpeakerDetectionResult {
  const authorResult = detectSpeaker(messageAuthor)

  // If we have high-confidence author detection, use it
  if (authorResult.confidence === 1.0) {
    return authorResult
  }

  // If we have diarization result, use it
  if (detectedSpeaker && detectedSpeaker !== 'unknown') {
    return {
      speaker: detectedSpeaker,
      confidence: 0.8,
      reason: 'Detected from audio diarization',
    }
  }

  // Fall back to author detection
  return authorResult
}

/**
 * Check if speaker is human (user) vs AI/system
 * @param speaker - Speaker type
 * @returns True if human speaker
 */
export function isHumanSpeaker(speaker: SpeakerType): boolean {
  return speaker === 'user'
}

/**
 * Check if speaker is automated (AI, system)
 * @param speaker - Speaker type
 * @returns True if automated speaker
 */
export function isAutomatedSpeaker(speaker: SpeakerType): boolean {
  return speaker === 'assistant' || speaker === 'system'
}

/**
 * Get speaker priority for ordering in transcripts
 * @param speaker - Speaker type
 * @returns Priority number (lower = higher priority)
 */
export function getSpeakerPriority(speaker: SpeakerType): number {
  const priorities: Record<SpeakerType, number> = {
    user: 1,
    assistant: 2,
    system: 3,
    unknown: 4,
  }

  // Custom speakers get lower priority
  if (!priorities[speaker]) {
    return 5
  }

  return priorities[speaker]
}

/**
 * Sort speakers by priority
 * @param speakers - Array of speaker types
 * @returns Sorted array
 */
export function sortSpeakersByPriority(speakers: SpeakerType[]): SpeakerType[] {
  return [...speakers].sort((a, b) => getSpeakerPriority(a) - getSpeakerPriority(b))
}
