/**
 * WebSocket Client for Real-time Collaboration
 *
 * Manages WebSocket connection for real-time updates,
 * presence, and collaborative editing.
 */

import {
  WebSocketMessage,
  PresenceUpdateMessage,
  OperationBroadcastMessage,
  CursorSyncMessage,
  TypingIndicatorMessage,
  UserPresence,
  CollaborationOperation,
} from './types'

export type WebSocketEventListener = (message: WebSocketMessage) => void

export interface WebSocketConfig {
  url: string
  reconnectInterval?: number       // milliseconds
  heartbeatInterval?: number       // milliseconds
  maxReconnectAttempts?: number
}

const MAX_MESSAGE_SIZE = 1024 * 1024 // 1MB max message size
const ERROR_LOG_THROTTLE_MS = 1000 // Throttle error logging to once per second

export class CollaborationWebSocket {
  private ws: WebSocket | null = null
  private config: Required<WebSocketConfig>
  private listeners: Map<WebSocketMessage['type'], Set<WebSocketEventListener>> = new Map()
  private reconnectAttempts = 0
  private reconnectTimer: number | null = null
  private heartbeatTimer: number | null = null
  private isIntentionalClose = false
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected'
  private lastErrorLogTime = 0 // Performance: throttle error logging

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      reconnectInterval: config.reconnectInterval || 3000,
      heartbeatInterval: config.heartbeatInterval || 30000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isIntentionalClose = false
        this.connectionStatus = 'connecting'
        this.ws = new WebSocket(this.config.url)

        this.ws.onopen = () => {
          console.log('[CollaborationWebSocket] Connected')
          this.connectionStatus = 'connected'
          this.reconnectAttempts = 0
          this.startHeartbeat()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            // Performance: Add message size limit to prevent DoS
            if (event.data.length > MAX_MESSAGE_SIZE) {
              throw new Error(`Message size exceeds limit (${event.data.length} > ${MAX_MESSAGE_SIZE})`)
            }

            const message = JSON.parse(event.data) as WebSocketMessage

            // Performance: Basic validation before processing
            if (!message || typeof message !== 'object') {
              throw new Error('Invalid message: not an object')
            }

            if (!message.type || !message.timestamp) {
              throw new Error('Invalid message: missing required fields')
            }

            this.handleMessage(message)
          } catch (error) {
            // Performance: Throttle error logging to prevent log spam
            const now = Date.now()
            if (now - this.lastErrorLogTime > ERROR_LOG_THROTTLE_MS) {
              console.error('[CollaborationWebSocket] Failed to parse message:', error)
              this.lastErrorLogTime = now
            }
          }
        }

        this.ws.onerror = (error) => {
          console.error('[CollaborationWebSocket] Error:', error)
          this.connectionStatus = 'error'
          reject(error)
        }

        this.ws.onclose = (event) => {
          console.log('[CollaborationWebSocket] Closed:', event.code, event.reason)
          this.connectionStatus = 'disconnected'
          this.stopHeartbeat()

          if (!this.isIntentionalClose) {
            this.scheduleReconnect()
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionalClose = true

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.stopHeartbeat()

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting')
      this.ws = null
    }
  }

  /**
   * Send message to server
   */
  send(type: WebSocketMessage['type'], payload: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[CollaborationWebSocket] Cannot send message: not connected')
      return
    }

    const message: WebSocketMessage = {
      type,
      id: this.generateMessageId(),
      timestamp: Date.now(),
      payload,
    }

    try {
      this.ws.send(JSON.stringify(message))
    } catch (error) {
      console.error('[CollaborationWebSocket] Failed to send message:', error)
    }
  }

  /**
   * Add event listener for message type
   */
  on(type: WebSocketMessage['type'], listener: WebSocketEventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }

    this.listeners.get(type)!.add(listener)

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(listener)
    }
  }

  /**
   * Get connection status
   */
  getStatus(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    return this.connectionStatus
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private handleMessage(message: WebSocketMessage): void {
    // Handle pong
    if (message.type === 'pong') {
      return
    }

    // Emit to listeners
    const listeners = this.listeners.get(message.type)
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(message)
        } catch (error) {
          console.error(`[CollaborationWebSocket] Listener error for ${message.type}:`, error)
        }
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[CollaborationWebSocket] Max reconnect attempts reached')
      return
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectAttempts++
    const delay = this.config.reconnectInterval * Math.min(this.reconnectAttempts, 5)

    console.log(`[CollaborationWebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    this.reconnectTimer = window.setTimeout(async () => {
      try {
        await this.connect()
      } catch (error) {
        console.error('[CollaborationWebSocket] Reconnect failed:', error)
      }
    }, delay)
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()

    this.heartbeatTimer = window.setInterval(() => {
      if (this.isConnected()) {
        this.send('ping', {})
      }
    }, this.config.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }
}

// ============================================================================
// COLLABORATION CLIENT
// ============================================================================

export class CollaborationClient {
  private ws: CollaborationWebSocket
  private currentUserId: string
  private currentPresence: UserPresence | null = null
  private sessionParticipants: Map<string, UserPresence> = new Map()
  private typingIndicators: Map<string, Set<string>> = new Map()

  constructor(
    userId: string,
    config: WebSocketConfig
  ) {
    this.currentUserId = userId
    this.ws = new CollaborationWebSocket(config)
    this.setupEventHandlers()
  }

  /**
   * Connect to collaboration server
   */
  async connect(): Promise<void> {
    await this.ws.connect()
  }

  /**
   * Disconnect from collaboration server
   */
  disconnect(): void {
    this.ws.disconnect()
  }

  /**
   * Join a collaboration session
   */
  joinSession(resourceId: string, resourceType: 'conversation' | 'knowledge' | 'message'): void {
    this.ws.send('session-join', {
      userId: this.currentUserId,
      resourceId,
      resourceType,
    })
  }

  /**
   * Leave a collaboration session
   */
  leaveSession(resourceId: string): void {
    this.ws.send('session-leave', {
      userId: this.currentUserId,
      resourceId,
    })
  }

  /**
   * Update current user's presence
   */
  updatePresence(presence: Partial<UserPresence>): void {
    this.currentPresence = {
      ...this.currentPresence,
      ...presence,
      userId: this.currentUserId,
      lastSeen: Date.now(),
    } as UserPresence

    this.ws.send('presence-update', {
      userId: this.currentUserId,
      presence: this.currentPresence,
    })
  }

  /**
   * Broadcast a collaboration operation
   */
  broadcastOperation(operation: CollaborationOperation): void {
    this.ws.send('operation-broadcast', {
      operation: {
        ...operation,
        userId: this.currentUserId,
      },
    })
  }

  /**
   * Send cursor position
   */
  sendCursor(cursor: UserPresence['cursor']): void {
    if (!cursor) return

    this.updatePresence({
      cursor,
      status: 'active',
    })
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(resourceId: string, isTyping: boolean): void {
    this.ws.send('typing-indicator', {
      userId: this.currentUserId,
      resourceId,
      isTyping,
    })

    this.updatePresence({
      status: isTyping ? 'typing' : 'active',
    })
  }

  /**
   * Get current session participants
   */
  getParticipants(): UserPresence[] {
    return Array.from(this.sessionParticipants.values())
  }

  /**
   * Get users currently typing
   */
  getTypingUsers(resourceId: string): string[] {
    const typing = this.typingIndicators.get(resourceId)
    return typing ? Array.from(typing).filter(id => id !== this.currentUserId) : []
  }

  /**
   * Subscribe to presence updates
   */
  onPresenceUpdate(callback: (presence: UserPresence) => void): () => void {
    return this.ws.on('presence-update', (message) => {
      const update = message as PresenceUpdateMessage
      callback((update.payload as any).presence)
    })
  }

  /**
   * Subscribe to collaboration operations
   */
  onOperation(callback: (operation: CollaborationOperation) => void): () => void {
    return this.ws.on('operation-broadcast', (message) => {
      const broadcast = message as OperationBroadcastMessage
      callback(broadcast.payload.operation)
    })
  }

  /**
   * Subscribe to cursor updates
   */
  onCursorUpdate(callback: (userId: string, cursor: UserPresence['cursor']) => void): () => void {
    return this.ws.on('cursor-sync', (message) => {
      const sync = message as CursorSyncMessage
      callback(sync.payload.userId, sync.payload.cursor)
    })
  }

  /**
   * Subscribe to typing indicators
   */
  onTypingIndicator(callback: (userId: string, resourceId: string, isTyping: boolean) => void): () => void {
    return this.ws.on('typing-indicator', (message) => {
      const indicator = message as TypingIndicatorMessage
      const { userId, resourceId, isTyping } = indicator.payload
      callback(userId, resourceId, isTyping)
    })
  }

  /**
   * Subscribe to user join events
   */
  onUserJoin(callback: (userId: string, presence: UserPresence) => void): () => void {
    return this.ws.on('session-join', (message) => {
      const payload = message.payload as any
      callback(payload.userId, payload.presence)
    })
  }

  /**
   * Subscribe to user leave events
   */
  onUserLeave(callback: (userId: string) => void): () => void {
    return this.ws.on('session-leave', (message) => {
      const payload = message.payload as any
      callback(payload.userId)
    })
  }

  /**
   * Get connection status
   */
  getStatus(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    return this.ws.getStatus()
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private setupEventHandlers(): void {
    // Handle presence updates
    this.ws.on('presence-update', (message) => {
      const update = message as PresenceUpdateMessage
      const presence = (update.payload as any).presence as UserPresence

      if (presence.userId !== this.currentUserId) {
        this.sessionParticipants.set(presence.userId, presence)
      }
    })

    // Handle typing indicators
    this.ws.on('typing-indicator', (message) => {
      const indicator = message as TypingIndicatorMessage
      const { userId, resourceId, isTyping } = indicator.payload

      if (userId === this.currentUserId) return

      let typing = this.typingIndicators.get(resourceId)
      if (!typing) {
        typing = new Set()
        this.typingIndicators.set(resourceId, typing)
      }

      if (isTyping) {
        typing.add(userId)
      } else {
        typing.delete(userId)
      }

      // Auto-remove after 3 seconds of no updates
      if (isTyping) {
        setTimeout(() => {
          typing?.delete(userId)
        }, 3000)
      }
    })

    // Handle user leave
    this.ws.on('session-leave', (message) => {
      const payload = message.payload as any
      this.sessionParticipants.delete(payload.userId)
    })
  }
}

// ============================================================================
// FACTORY
// ============================================================================

let globalClient: CollaborationClient | null = null

export function getCollaborationClient(
  userId: string,
  config?: WebSocketConfig
): CollaborationClient {
  if (!globalClient) {
    const defaultConfig: WebSocketConfig = {
      url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
      reconnectInterval: 3000,
      heartbeatInterval: 30000,
      maxReconnectAttempts: 10,
    }

    globalClient = new CollaborationClient(
      userId,
      config || defaultConfig
    )
  }

  return globalClient
}

export async function initializeCollaborationClient(
  userId: string,
  config?: WebSocketConfig
): Promise<CollaborationClient> {
  const client = getCollaborationClient(userId, config)
  await client.connect()
  return client
}
