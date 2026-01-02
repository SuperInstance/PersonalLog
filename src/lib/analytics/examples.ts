/**
 * Analytics Integration Examples
 *
 * This file demonstrates how to integrate the analytics system
 * with existing PersonalLog components and features.
 */

import {
  analytics,
  trackMessageSent,
  trackFeatureUsed,
  trackError,
  trackAPIResponse,
} from './index'

// ============================================================================
// MESSAGE TRACKING INTEGRATION
// ============================================================================

/**
 * Example: Integrate with conversation store
 *
 * Location: /src/lib/storage/conversation-store.ts
 */

export async function addMessageWithAnalytics(
  conversationId: string,
  type: any,
  author: any,
  content: any,
  replyTo?: string
) {
  const startTime = performance.now()

  try {
    // Original message sending logic
    // const message = await addMessage(conversationId, type, author, content, replyTo)

    // Track the message sent event
    await trackMessageSent({
      conversationId,
      messageLength: content.text?.length || 0,
      hasAttachment: ['image', 'file', 'audio', 'transcript'].includes(type),
      attachmentTypes: content.fileUrl ? [type] : undefined,
      replyToMessage: !!replyTo,
    })

    // return message
  } catch (error) {
    // Track error if sending fails
    await trackError({
      errorType: error.name || 'MessageError',
      errorMessage: error.message,
      context: 'addMessage',
      recoverable: true,
    })
    throw error
  }
}

// ============================================================================
// FEATURE FLAG TRACKING INTEGRATION
// ============================================================================

/**
 * Example: Integrate with feature flag system
 *
 * Location: /src/lib/flags/manager.ts
 */

export async function trackFeatureFlagEvaluation(
  featureId: string,
  enabled: boolean,
  reason: string
) {
  await analytics.track('feature_evaluated', {
    type: 'feature_evaluated',
    featureId,
    enabled,
    reason,
    hardwareScore: 0, // Would come from hardware detection
  })
}

export async function trackFeatureFlagChange(
  featureId: string,
  enabled: boolean,
  userInitiated: boolean
) {
  const eventType = enabled ? 'feature_enabled' : 'feature_disabled'

  await analytics.track(eventType, {
    type: eventType,
    featureId,
    reason: userInitiated ? 'user_override' : 'system',
    userInitiated,
    previousState: enabled ? 'disabled' : 'enabled',
  })
}

// ============================================================================
// BENCHMARK TRACKING INTEGRATION
// ============================================================================

/**
 * Example: Integrate with benchmarking system
 *
 * Location: /src/lib/benchmark/suite.ts
 */

export async function trackBenchmarkCompletion(
  category: string,
  overallScore: number,
  duration: number,
  testCount: number
) {
  await analytics.track('benchmark_completed', {
    type: 'benchmark_completed',
    category,
    overallScore,
    duration,
    testCount,
  })
}

// ============================================================================
// API PERFORMANCE TRACKING
// ============================================================================

/**
 * Example: Wrap API calls with performance tracking
 */

export async function trackedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const startTime = performance.now()
  let success = false
  let statusCode: number | undefined

  try {
    const response = await fetch(url, options)
    success = response.ok
    statusCode = response.status

    // Track API response
    await trackAPIResponse({
      endpoint: url,
      method: options.method || 'GET',
      duration: performance.now() - startTime,
      success,
      statusCode,
    })

    return response
  } catch (error) {
    await trackAPIResponse({
      endpoint: url,
      method: options.method || 'GET',
      duration: performance.now() - startTime,
      success: false,
    })

    // Also track as an error
    await trackError({
      errorType: 'NetworkError',
      errorMessage: error.message,
      context: `fetch:${url}`,
      recoverable: true,
    })

    throw error
  }
}

// ============================================================================
// STORAGE PERFORMANCE TRACKING
// ============================================================================

/**
 * Example: Wrap storage operations with tracking
 */

export async function trackedStorageOperation<T>(
  operation: 'read' | 'write' | 'delete' | 'query',
  storeName: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now()
  let success = false
  let recordCount: number | undefined

  try {
    const result = await fn()
    success = true

    // Try to estimate record count
    if (Array.isArray(result)) {
      recordCount = result.length
    }

    await analytics.track('storage_operation', {
      type: 'storage_operation',
      operation,
      store: storeName,
      duration: performance.now() - startTime,
      recordCount,
      success,
    })

    return result
  } catch (error) {
    await analytics.track('storage_operation', {
      type: 'storage_operation',
      operation,
      store: storeName,
      duration: performance.now() - startTime,
      success: false,
    })

    throw error
  }
}

// ============================================================================
// RENDER PERFORMANCE TRACKING
// ============================================================================

/**
 * Example: Track component render performance
 */

import { useEffect, useRef } from 'react'

export function useRenderTracking(componentName: string) {
  const renderCount = useRef(0)
  const startTime = useRef<number>(performance.now())

  useEffect(() => {
    renderCount.current++
    const duration = performance.now() - startTime.current

    // Track render completion (debounced or sampled)
    if (renderCount.current % 10 === 0) {
      analytics.track('render_complete', {
        type: 'render_complete',
        component: componentName,
        duration,
        elementCount: document.querySelectorAll('*').length,
      })
    }

    startTime.current = performance.now()
  })
}

// ============================================================================
// APP INITIALIZATION TRACKING
// ============================================================================

/**
 * Example: Track app initialization
 *
 * Location: app/layout.tsx or root component
 */

export async function trackAppInitialization(
  components: string[],
  failedComponents: string[] = []
) {
  const initTime = performance.now()

  await analytics.track('app_initialized', {
    type: 'app_initialized',
    initTime,
    componentsLoaded: components,
    failedComponents: failedComponents.length ? failedComponents : undefined,
  })
}

// ============================================================================
// SEARCH TRACKING
// ============================================================================

/**
 * Example: Track search usage
 */

export async function trackSearch(
  query: string,
  resultCount: number,
  searchType: 'conversations' | 'messages' | 'global'
) {
  await analytics.track('search_performed', {
    type: 'search_performed',
    queryLength: query.length,
    resultCount,
    searchType,
  })
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Example: Track session start/end
 *
 * The analytics collector handles this automatically,
 * but you can customize it if needed.
 */

export async function trackCustomSessionStart(source: 'direct' | 'notification' | 'link') {
  await analytics.track('session_start', {
    type: 'session_start',
    source,
  })
}

export async function trackCustomSessionEnd(duration: number, stats: {
  actionsPerformed: number
  messagesSent: number
  featuresUsed: string[]
}) {
  await analytics.track('session_end', {
    type: 'session_end',
    duration,
    ...stats,
  })
}

// ============================================================================
// ERROR HANDLING INTEGRATION
// ============================================================================

/**
 * Example: Global error handler
 *
 * Location: Root component or error boundary
 */

export function setupGlobalErrorTracking() {
  // Track JavaScript errors
  window.addEventListener('error', (event) => {
    trackError({
      errorType: event.error?.name || 'Error',
      errorMessage: event.message,
      context: 'global',
      recoverable: true,
      stack: event.error?.stack,
    })
  })

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    trackError({
      errorType: 'UnhandledRejection',
      errorMessage: event.reason?.message || String(event.reason),
      context: 'promise',
      recoverable: false,
    })
  })
}

// ============================================================================
// SETTINGS CHANGES
// ============================================================================

/**
 * Example: Track setting changes
 */

export async function trackSettingChange(
  setting: string,
  previousValue: string | boolean | number,
  newValue: string | boolean | number
) {
  await analytics.track('settings_changed', {
    type: 'settings_changed',
    setting,
    previousValue,
    newValue,
  })
}

// ============================================================================
// AI CONTACT TRACKING
// ============================================================================

/**
 * Example: Track AI contact/persona creation
 */

export async function trackAIContactCreated(
  provider: string,
  model: string,
  customPrompt: boolean
) {
  await analytics.track('ai_contact_created', {
    type: 'ai_contact_created',
    provider,
    model,
    customPrompt,
  })
}

// ============================================================================
// CONVERSATION TRACKING
// ============================================================================

/**
 * Example: Track conversation lifecycle
 */

export async function trackConversationCreated(
  conversationType: string,
  hasAIContact: boolean
) {
  await analytics.track('conversation_created', {
    type: 'conversation_created',
    conversationType,
    hasAIContact,
  })
}

export async function trackConversationArchived(
  messageCount: number,
  conversationAge: number
) {
  await analytics.track('conversation_archived', {
    type: 'conversation_archived',
    messageCount,
    conversationAge,
  })
}

// ============================================================================
// COMPLETE WORKFLOW EXAMPLE
// ============================================================================

/**
 * Example: Complete analytics-integrated feature
 *
 * This shows how to build a new feature with full analytics tracking
 */

export async function createSmartSummary(conversationId: string) {
  const featureStartTime = performance.now()

  try {
    // Track feature usage start
    // (You could track start separately if needed)

    // Step 1: Fetch conversation (tracked storage operation)
    const conversation = await trackedStorageOperation(
      'read',
      'conversations',
      () => fetchConversation(conversationId)
    )

    // Step 2: Fetch messages (tracked storage operation)
    const messages = await trackedStorageOperation(
      'read',
      'messages',
      () => fetchMessages(conversationId)
    )

    // Step 3: Call AI API (tracked API call)
    const summary = await trackedFetch('/api/summarize', {
      method: 'POST',
      body: JSON.stringify({ messages }),
      headers: { 'Content-Type': 'application/json' },
    }).then(r => r.json())

    // Step 4: Save summary (tracked storage operation)
    await trackedStorageOperation('write', 'conversations', () =>
      saveSummary(conversationId, summary)
    )

    // Track successful feature usage
    await trackFeatureUsed({
      featureId: 'smart-summary',
      duration: performance.now() - featureStartTime,
      success: true,
      context: {
        conversationId,
        messageCount: messages.length,
        summaryLength: summary.text?.length || 0,
      },
    })

    return summary
  } catch (error) {
    // Track feature failure
    await trackFeatureUsed({
      featureId: 'smart-summary',
      duration: performance.now() - featureStartTime,
      success: false,
      context: {
        error: error.message,
      },
    })

    // Track the error
    await trackError({
      errorType: error.name,
      errorMessage: error.message,
      context: 'smart-summary',
      recoverable: true,
    })

    throw error
  }
}

// Helper functions (would be implemented elsewhere)
async function fetchConversation(id: string) {
  // Implementation
  return {}
}

async function fetchMessages(id: string) {
  // Implementation
  return []
}

async function saveSummary(id: string, summary: any) {
  // Implementation
}
