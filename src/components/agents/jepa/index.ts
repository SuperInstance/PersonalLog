/**
 * JEPA Agent Components - Public API
 *
 * Exports all JEPA agent-related components for use in the application.
 *
 * @module components/agents/jepa
 */

export { JEPAConversation } from './JEPAConversation'
export { EmotionIndicator, EmotionTimeline } from './EmotionIndicator'

export type {
  EmotionIndicatorProps,
  EmotionTimelineProps,
} from './EmotionIndicator'

export type {
  JEPAConversationProps,
} from './JEPAConversation'
