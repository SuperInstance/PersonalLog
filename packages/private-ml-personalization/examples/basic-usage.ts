/**
 * Example 1: Basic Usage
 *
 * This example demonstrates the core functionality of the personalization system
 * including setting preferences, recording actions, and learning from behavior.
 */

import {
  getPersonalizationAPI,
  PreferenceKey,
  saveUserModel,
  loadUserModel
} from '@superinstance/private-ml-personalization'

// Initialize the API
const api = getPersonalizationAPI()

// Example 1: Set and Get Preferences
console.log('=== Example 1: Set and Get Preferences ===')

// Set theme explicitly
api.set('ui.theme', 'dark')
console.log('Theme:', api.get<'light' | 'dark'>('ui.theme')) // Output: dark

// Set font size
api.set('ui.fontSize', 1.15)
console.log('Font Size:', api.get<number>('ui.fontSize')) // Output: 1.15

// Set communication preferences
api.set('communication.responseLength', 'detailed')
api.set('communication.tone', 'casual')
api.set('communication.useEmojis', true)

console.log('Response Length:', api.get('communication.responseLength')) // Output: detailed
console.log('Tone:', api.get('communication.tone')) // Output: casual

// Example 2: Learn from User Actions
console.log('\n=== Example 2: Learn from User Actions ===')

// Simulate user behavior
api.recordAction({
  type: 'theme-changed',
  timestamp: new Date().toISOString(),
  data: { value: 'dark' }
})

api.recordAction({
  type: 'feature-used',
  timestamp: new Date().toISOString(),
  context: { feature: 'search', view: 'dashboard' }
})

api.recordAction({
  type: 'session-ended',
  timestamp: new Date().toISOString(),
  context: { duration: 1800000 } // 30 minutes
})

// Get learning statistics
const stats = api.getStats()
console.log('Total Actions Recorded:', stats.learning.totalActionsRecorded)
console.log('Learning Enabled:', stats.learning.enabled)

// Example 3: Preference Explanations
console.log('\n=== Example 3: Preference Explanations ===')

// Explain why a preference is set
const explanation = api.explain('ui.theme')
console.log('Theme Explanation:', explanation.reason)
console.log('Confidence:', explanation.confidence)
console.log('Source:', explanation.source)

// Example 4: Reset and Learning
console.log('\n=== Example 4: Reset and Learning ===')

// Reset a preference to default
api.reset('ui.fontSize')
console.log('Font Size after reset:', api.get('ui.fontSize')) // Output: 1.0 (default)

// Toggle learning
api.toggleLearning(false)
console.log('Learning Enabled:', api.getStats().learning.enabled) // Output: false

// Example 5: Storage
console.log('\n=== Example 5: Persistent Storage ===')

async function storageExample() {
  // Save to IndexedDB
  await saveUserModel('user-123', api.getModel('user-123').toUserModel())
  console.log('Model saved to IndexedDB')

  // Load from IndexedDB
  const loaded = await loadUserModel('user-123')
  console.log('Model loaded:', loaded ? 'Yes' : 'No')

  // Export as JSON
  const exported = await api.exportData('user-123')
  console.log('Export timestamp:', exported.timestamp)
  console.log('Export patterns:', exported.patterns)
}

storageExample().catch(console.error)

// Example 6: Multiple Users
console.log('\n=== Example 6: Multiple Users ===')

// Set preferences for different users
api.set('ui.theme', 'dark', 'user-1')
api.set('ui.theme', 'light', 'user-2')

console.log('User 1 Theme:', api.get('ui.theme', 'user-1')) // Output: dark
console.log('User 2 Theme:', api.get('ui.theme', 'user-2')) // Output: light

// Get statistics for specific user
const user1Stats = api.getStats('user-1')
console.log('User 1 Actions:', user1Stats.learning.totalActionsRecorded)

console.log('\n=== Basic Usage Complete ===')
