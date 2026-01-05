/**
 * Analytics Events Catalog
 *
 * Comprehensive taxonomy of all analytics events tracked by PersonalLog.
 * Provides event schemas, validation, and factory functions for each event type.
 */

import { EventType, EventData, AnalyticsEvent } from './types'

// ============================================================================
// EVENT METADATA
// ============================================================================

/**
 * Event metadata for documentation and validation
 */
export interface EventMetadata {
  type: EventType
  category: 'user_action' | 'performance' | 'engagement' | 'error' | 'feature_flag' | 'system'
  description: string
  requiredFields: string[]
  optionalFields: string[]
  piiSensitive: boolean
  highVolume: boolean
}

/**
 * Complete event catalog metadata
 */
export const EVENT_CATALOG: Record<EventType, EventMetadata> = {
  // User Actions
  message_sent: {
    type: 'message_sent',
    category: 'user_action',
    description: 'User sent a message in a conversation',
    requiredFields: ['conversationId', 'messageLength', 'hasAttachment'],
    optionalFields: ['attachmentTypes', 'replyToMessage', 'responseTime'],
    piiSensitive: false,
    highVolume: true,
  },
  conversation_created: {
    type: 'conversation_created',
    category: 'user_action',
    description: 'User created a new conversation',
    requiredFields: ['conversationType', 'hasAIContact'],
    optionalFields: [],
    piiSensitive: false,
    highVolume: false,
  },
  conversation_archived: {
    type: 'conversation_archived',
    category: 'user_action',
    description: 'User archived a conversation',
    requiredFields: ['messageCount', 'conversationAge'],
    optionalFields: [],
    piiSensitive: false,
    highVolume: false,
  },
  conversation_deleted: {
    type: 'conversation_deleted',
    category: 'user_action',
    description: 'User deleted a conversation',
    requiredFields: ['messageCount'],
    optionalFields: ['conversationAge'],
    piiSensitive: false,
    highVolume: false,
  },
  settings_changed: {
    type: 'settings_changed',
    category: 'user_action',
    description: 'User changed a setting',
    requiredFields: ['setting', 'previousValue', 'newValue'],
    optionalFields: [],
    piiSensitive: false,
    highVolume: false,
  },
  ai_contact_created: {
    type: 'ai_contact_created',
    category: 'user_action',
    description: 'User created a new AI contact',
    requiredFields: ['provider', 'model', 'customPrompt'],
    optionalFields: [],
    piiSensitive: false,
    highVolume: false,
  },
  ai_contact_modified: {
    type: 'ai_contact_modified',
    category: 'user_action',
    description: 'User modified an AI contact',
    requiredFields: ['provider', 'model'],
    optionalFields: ['customPrompt', 'changes'],
    piiSensitive: false,
    highVolume: false,
  },
  ai_contact_deleted: {
    type: 'ai_contact_deleted',
    category: 'user_action',
    description: 'User deleted an AI contact',
    requiredFields: ['provider'],
    optionalFields: ['model'],
    piiSensitive: false,
    highVolume: false,
  },
  search_performed: {
    type: 'search_performed',
    category: 'user_action',
    description: 'User performed a search',
    requiredFields: ['queryLength', 'resultCount', 'searchType'],
    optionalFields: [],
    piiSensitive: false,
    highVolume: true,
  },
  export_triggered: {
    type: 'export_triggered',
    category: 'user_action',
    description: 'User exported data',
    requiredFields: ['exportType'],
    optionalFields: ['itemCount'],
    piiSensitive: false,
    highVolume: false,
  },
  import_triggered: {
    type: 'import_triggered',
    category: 'user_action',
    description: 'User imported data',
    requiredFields: ['importType'],
    optionalFields: ['itemCount', 'success'],
    piiSensitive: false,
    highVolume: false,
  },

  // Performance
  app_initialized: {
    type: 'app_initialized',
    category: 'performance',
    description: 'App initialization completed',
    requiredFields: ['initTime', 'componentsLoaded'],
    optionalFields: ['failedComponents'],
    piiSensitive: false,
    highVolume: false,
  },
  api_response: {
    type: 'api_response',
    category: 'performance',
    description: 'API call completed',
    requiredFields: ['endpoint', 'method', 'duration', 'success'],
    optionalFields: ['statusCode', 'errorType'],
    piiSensitive: false,
    highVolume: true,
  },
  render_complete: {
    type: 'render_complete',
    category: 'performance',
    description: 'Component rendering completed',
    requiredFields: ['component', 'duration', 'elementCount'],
    optionalFields: [],
    piiSensitive: false,
    highVolume: true,
  },
  storage_operation: {
    type: 'storage_operation',
    category: 'performance',
    description: 'Storage operation completed',
    requiredFields: ['operation', 'store', 'duration', 'success'],
    optionalFields: ['recordCount'],
    piiSensitive: false,
    highVolume: true,
  },
  memory_measurement: {
    type: 'memory_measurement',
    category: 'performance',
    description: 'Memory usage measurement',
    requiredFields: ['usedMB', 'totalMB', 'percentage'],
    optionalFields: ['pressure'],
    piiSensitive: false,
    highVolume: false,
  },

  // Engagement
  session_start: {
    type: 'session_start',
    category: 'engagement',
    description: 'User session started',
    requiredFields: ['source'],
    optionalFields: ['previousSessionTime'],
    piiSensitive: false,
    highVolume: false,
  },
  session_end: {
    type: 'session_end',
    category: 'engagement',
    description: 'User session ended',
    requiredFields: ['duration', 'actionsPerformed', 'messagesSent', 'featuresUsed'],
    optionalFields: [],
    piiSensitive: false,
    highVolume: false,
  },
  feature_used: {
    type: 'feature_used',
    category: 'engagement',
    description: 'User used a feature',
    requiredFields: ['featureId', 'success'],
    optionalFields: ['duration', 'context'],
    piiSensitive: false,
    highVolume: true,
  },
  feature_abandoned: {
    type: 'feature_abandoned',
    category: 'engagement',
    description: 'User abandoned a feature',
    requiredFields: ['featureId', 'duration'],
    optionalFields: ['step', 'reason'],
    piiSensitive: false,
    highVolume: false,
  },
  page_view: {
    type: 'page_view',
    category: 'engagement',
    description: 'User viewed a page',
    requiredFields: ['page'],
    optionalFields: ['referrer', 'loadTime'],
    piiSensitive: false,
    highVolume: true,
  },

  // Errors
  error_occurred: {
    type: 'error_occurred',
    category: 'error',
    description: 'An error occurred',
    requiredFields: ['errorType', 'errorMessage', 'context', 'recoverable'],
    optionalFields: ['stack'],
    piiSensitive: true,
    highVolume: false,
  },
  error_recovered: {
    type: 'error_recovered',
    category: 'error',
    description: 'An error was recovered',
    requiredFields: ['errorType', 'recoveryStrategy', 'recoveryTime'],
    optionalFields: [],
    piiSensitive: false,
    highVolume: false,
  },

  // Feature Flags
  feature_enabled: {
    type: 'feature_enabled',
    category: 'feature_flag',
    description: 'Feature flag was enabled',
    requiredFields: ['featureId', 'reason', 'userInitiated', 'previousState'],
    optionalFields: [],
    piiSensitive: false,
    highVolume: false,
  },
  feature_disabled: {
    type: 'feature_disabled',
    category: 'feature_flag',
    description: 'Feature flag was disabled',
    requiredFields: ['featureId', 'reason', 'userInitiated', 'previousState'],
    optionalFields: [],
    piiSensitive: false,
    highVolume: false,
  },
  feature_evaluated: {
    type: 'feature_evaluated',
    category: 'feature_flag',
    description: 'Feature flag was evaluated',
    requiredFields: ['featureId', 'enabled', 'reason', 'hardwareScore'],
    optionalFields: [],
    piiSensitive: false,
    highVolume: true,
  },

  // System
  hardware_detected: {
    type: 'hardware_detected',
    category: 'system',
    description: 'Hardware detection completed',
    requiredFields: ['cpuCores', 'ramGB', 'gpuPresent'],
    optionalFields: ['gpuModel', 'storageGB'],
    piiSensitive: false,
    highVolume: false,
  },
  benchmark_completed: {
    type: 'benchmark_completed',
    category: 'system',
    description: 'Benchmark test completed',
    requiredFields: ['category', 'overallScore', 'duration', 'testCount'],
    optionalFields: [],
    piiSensitive: false,
    highVolume: false,
  },
  data_compacted: {
    type: 'data_compacted',
    category: 'system',
    description: 'Data compaction completed',
    requiredFields: ['recordsRemoved', 'spaceRecovered', 'duration'],
    optionalFields: [],
    piiSensitive: false,
    highVolume: false,
  },
  data_exported: {
    type: 'data_exported',
    category: 'system',
    description: 'Data export completed',
    requiredFields: ['exportType', 'recordCount', 'fileSize'],
    optionalFields: [],
    piiSensitive: false,
    highVolume: false,
  },

  // Additional engagement events
  conversation_viewed: {
    type: 'conversation_viewed',
    category: 'engagement',
    description: 'User viewed a conversation',
    requiredFields: ['conversationId'],
    optionalFields: ['scrollDepth', 'duration'],
    piiSensitive: false,
    highVolume: true,
  },
  messenger_opened: {
    type: 'messenger_opened',
    category: 'engagement',
    description: 'User opened the messenger interface',
    requiredFields: [],
    optionalFields: ['source'],
    piiSensitive: false,
    highVolume: true,
  },
  knowledge_viewed: {
    type: 'knowledge_viewed',
    category: 'engagement',
    description: 'User viewed the knowledge base',
    requiredFields: [],
    optionalFields: ['query', 'resultCount'],
    piiSensitive: false,
    highVolume: true,
  },
  ai_chat_started: {
    type: 'ai_chat_started',
    category: 'engagement',
    description: 'User started an AI chat',
    requiredFields: ['contactId'],
    optionalFields: ['context'],
    piiSensitive: false,
    highVolume: true,
  },
  previous_session_event: {
    type: 'previous_session_event',
    category: 'engagement',
    description: 'Event from previous session',
    requiredFields: [],
    optionalFields: ['eventType', 'timestamp'],
    piiSensitive: false,
    highVolume: false,
  },

  // Test events (for testing purposes)
  test_event: {
    type: 'test_event',
    category: 'system',
    description: 'Test event for development',
    requiredFields: [],
    optionalFields: ['data'],
    piiSensitive: false,
    highVolume: false,
  },
  test: {
    type: 'test',
    category: 'system',
    description: 'Test event',
    requiredFields: [],
    optionalFields: [],
    piiSensitive: false,
    highVolume: false,
  },
  test1: {
    type: 'test1',
    category: 'system',
    description: 'Test event 1',
    requiredFields: [],
    optionalFields: [],
    piiSensitive: false,
    highVolume: false,
  },
  test2: {
    type: 'test2',
    category: 'system',
    description: 'Test event 2',
    requiredFields: [],
    optionalFields: [],
    piiSensitive: false,
    highVolume: false,
  },
  event1: {
    type: 'event1',
    category: 'system',
    description: 'Event 1',
    requiredFields: [],
    optionalFields: [],
    piiSensitive: false,
    highVolume: false,
  },
  event2: {
    type: 'event2',
    category: 'system',
    description: 'Event 2',
    requiredFields: [],
    optionalFields: [],
    piiSensitive: false,
    highVolume: false,
  },
}

// ============================================================================
// EVENT FACTORIES
// ============================================================================

/**
 * Create a message sent event
 */
export function createMessageSentEvent(data: {
  conversationId: string
  messageLength: number
  hasAttachment: boolean
  attachmentTypes?: string[]
  replyToMessage?: boolean
  responseTime?: number
}): EventData {
  return {
    type: 'message_sent',
    ...data,
  }
}

/**
 * Create a conversation created event
 */
export function createConversationCreatedEvent(data: {
  conversationType: string
  hasAIContact: boolean
}): EventData {
  return {
    type: 'conversation_created',
    ...data,
  }
}

/**
 * Create a settings changed event
 */
export function createSettingsChangedEvent(data: {
  setting: string
  previousValue: string | boolean | number
  newValue: string | boolean | number
}): EventData {
  return {
    type: 'settings_changed',
    ...data,
  }
}

/**
 * Create an AI contact created event
 */
export function createAIContactCreatedEvent(data: {
  provider: string
  model: string
  customPrompt: boolean
}): EventData {
  return {
    type: 'ai_contact_created',
    ...data,
  }
}

/**
 * Create a search performed event
 */
export function createSearchPerformedEvent(data: {
  queryLength: number
  resultCount: number
  searchType: 'conversations' | 'messages' | 'global'
}): EventData {
  return {
    type: 'search_performed',
    ...data,
  }
}

/**
 * Create an app initialized event
 */
export function createAppInitializedEvent(data: {
  initTime: number
  componentsLoaded: string[]
  failedComponents?: string[]
}): EventData {
  return {
    type: 'app_initialized',
    ...data,
  }
}

/**
 * Create an API response event
 */
export function createAPIResponseEvent(data: {
  endpoint: string
  method: string
  duration: number
  success: boolean
  statusCode?: number
  errorType?: string
}): EventData {
  return {
    type: 'api_response',
    ...data,
  }
}

/**
 * Create a render complete event
 */
export function createRenderCompleteEvent(data: {
  component: string
  duration: number
  elementCount: number
}): EventData {
  return {
    type: 'render_complete',
    ...data,
  }
}

/**
 * Create a session start event
 */
export function createSessionStartEvent(data: {
  source: 'direct' | 'notification' | 'link'
  previousSessionTime?: number
}): EventData {
  return {
    type: 'session_start',
    ...data,
  }
}

/**
 * Create a session end event
 */
export function createSessionEndEvent(data: {
  duration: number
  actionsPerformed: number
  messagesSent: number
  featuresUsed: string[]
}): EventData {
  return {
    type: 'session_end',
    ...data,
  }
}

/**
 * Create a feature used event
 */
export function createFeatureUsedEvent(data: {
  featureId: string
  duration?: number
  success: boolean
  context?: Record<string, unknown>
}): EventData {
  return {
    type: 'feature_used',
    ...data,
  }
}

/**
 * Create an error occurred event
 */
export function createErrorOccurredEvent(data: {
  errorType: string
  errorMessage: string
  context: string
  recoverable: boolean
  stack?: string
}): EventData {
  return {
    type: 'error_occurred',
    ...data,
  }
}

/**
 * Create a feature enabled event
 */
export function createFeatureEnabledEvent(data: {
  featureId: string
  reason: string
  userInitiated: boolean
  previousState: string
}): EventData {
  return {
    type: 'feature_enabled',
    ...data,
  }
}

/**
 * Create a benchmark completed event
 */
export function createBenchmarkCompletedEvent(data: {
  category: string
  overallScore: number
  duration: number
  testCount: number
}): EventData {
  return {
    type: 'benchmark_completed',
    ...data,
  }
}

// ============================================================================
// EVENT VALIDATION
// ============================================================================

/**
 * Validate event data against event metadata
 */
export function validateEventData(type: EventType, data: Partial<EventData>): {
  valid: boolean
  missing: string[]
} {
  const metadata = EVENT_CATALOG[type]
  if (!metadata) {
    return { valid: false, missing: [] }
  }

  const missing: string[] = []

  for (const field of metadata.requiredFields) {
    if (!(field in data)) {
      missing.push(field)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * Check if event type is PII sensitive
 */
export function isPIISensitive(type: EventType): boolean {
  return EVENT_CATALOG[type]?.piiSensitive || false
}

/**
 * Check if event type is high volume
 */
export function isHighVolumeEvent(type: EventType): boolean {
  return EVENT_CATALOG[type]?.highVolume || false
}

/**
 * Get event metadata
 */
export function getEventMetadata(type: EventType): EventMetadata | undefined {
  return EVENT_CATALOG[type]
}

// ============================================================================
// EVENT CONSTANTS
// ============================================================================

/**
 * Event categories for filtering
 */
export const EVENT_CATEGORIES = {
  USER_ACTION: 'user_action',
  PERFORMANCE: 'performance',
  ENGAGEMENT: 'engagement',
  ERROR: 'error',
  FEATURE_FLAG: 'feature_flag',
  SYSTEM: 'system',
} as const

/**
 * High volume event types (require batching)
 */
export const HIGH_VOLUME_EVENTS: EventType[] = [
  'message_sent',
  'api_response',
  'render_complete',
  'storage_operation',
  'search_performed',
  'feature_used',
  'page_view',
  'feature_evaluated',
]

/**
 * PII sensitive events (require extra care)
 */
export const PII_SENSITIVE_EVENTS: EventType[] = ['error_occurred']

/**
 * Core events for essential analytics
 */
export const CORE_EVENTS: EventType[] = [
  'session_start',
  'session_end',
  'message_sent',
  'feature_used',
  'error_occurred',
]

/**
 * Performance events
 */
export const PERFORMANCE_EVENTS: EventType[] = [
  'app_initialized',
  'api_response',
  'render_complete',
  'storage_operation',
  'memory_measurement',
]
