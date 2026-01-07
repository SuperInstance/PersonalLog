/**
 * Token Estimation Utilities
 *
 * Shared utilities for estimating token counts in messages.
 * Extracted to avoid circular dependencies between optimizer and compression-strategies.
 */

import { Message } from '@/types/conversation'

// ============================================================================
// TOKEN ESTIMATION
// ============================================================================

/**
 * Estimates token count for a message.
 */
export function estimateMessageTokens(message: Message): number {
  let text = ''

  if (message.content.text) {
    text += message.content.text
  }

  if (message.content.systemNote) {
    text += message.content.systemNote
  }

  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4)
}

/**
 * Estimates total token count for an array of messages.
 */
export function estimateTotalTokens(messages: Message[]): number {
  return messages.reduce((sum, msg) => sum + estimateMessageTokens(msg), 0)
}
