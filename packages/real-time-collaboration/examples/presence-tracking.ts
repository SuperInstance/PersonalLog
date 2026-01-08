/**
 * Example 3: Presence Tracking
 *
 * Demonstrates real-time presence and cursor tracking
 */

import {
  initializeCollaborationClient,
  initializePresenceManager,
  type CollaborationClient,
  type PresenceManager
} from '@superinstance/real-time-collaboration'

async function presenceTrackingExample() {
  const userId = 'user-123'
  const userName = 'Alice Johnson'

  // 1. Initialize WebSocket connection
  const client: CollaborationClient = await initializeCollaborationClient(userId, {
    url: 'wss://your-server.com/collaboration',
    reconnectInterval: 3000,
    heartbeatInterval: 30000,
    maxReconnectAttempts: 10,
  })

  console.log('Connected to collaboration server')

  // 2. Initialize presence manager
  const presence: PresenceManager = await initializePresenceManager(
    userId,
    userName,
    client,
    {
      userColor: '#3b82f6',
      idleTimeout: 300000, // 5 minutes
    }
  )

  console.log('Presence tracking initialized')

  // 3. Join a collaboration session
  client.joinSession('doc-123', 'knowledge')
  console.log('Joined session')

  // 4. Update cursor position
  await presence.updateCursor({
    resourceId: 'doc-123',
    position: 150,
    x: 250,
    y: 400,
  })

  console.log('Cursor position updated')

  // 5. Set typing indicator
  await presence.setTyping('doc-123', true)
  console.log('Typing indicator set')

  // 6. Subscribe to presence changes
  const unsubscribe = presence.onPresenceChange((presences) => {
    console.log('Active users:', presences.length)

    presences.forEach(p => {
      console.log(`- ${p.userName} is ${p.status}`)

      if (p.cursor) {
        console.log(`  Cursor at position ${p.cursor.position}`)

        // Render cursor in UI
        renderUserCursor(p.userId, p.userName, p.cursor, p.color)
      }

      if (p.status === 'typing') {
        // Show typing indicator
        showTypingIndicator(p.userName, p.color)
      }
    })
  })

  // 7. Get presences for specific resource
  const resourcePresences = presence.getPresencesForResource('doc-123')
  console.log('Users on this resource:', resourcePresences.length)

  // 8. Get typing users
  const typingUsers = presence.getTypingUsers('doc-123')
  console.log('Currently typing:', typingUsers.map(p => p.userName))

  // 9. Go idle (simulating user inactivity)
  setTimeout(async () => {
    await presence.goIdle()
    console.log('User went idle')

    // Come back online
    setTimeout(async () => {
      await presence.comeOnline()
      console.log('User came back online')
    }, 2000)
  }, 5000)

  // 10. Cleanup
  setTimeout(() => {
    unsubscribe()
    presence.cleanup()
    client.disconnect()
    console.log('Cleaned up')
  }, 10000)
}

// Helper functions (these would be implemented in your UI)
function renderUserCursor(
  userId: string,
  userName: string,
  cursor: { position: number; x?: number; y?: number },
  color: string
) {
  console.log(`Rendering cursor for ${userName} at`, cursor)
  // In a real app, this would render a cursor element in the DOM
}

function showTypingIndicator(userName: string, color: string) {
  console.log(`${userName} is typing...`)
  // In a real app, this would show a typing indicator in the UI
}

// Run the example
presenceTrackingExample().catch(console.error)
