/**
 * User Presence Tracking System
 *
 * Tracks and manages user presence, cursors, and activity
 * for real-time collaboration.
 */

import {
  UserPresence,
  CursorPosition,
  TextSelection,
  generateUserColor,
} from './types'
import { CollaborationClient } from './websocket'

// ============================================================================
// PRESENCE MANAGER
// ============================================================================

export class PresenceManager {
  private client: CollaborationClient
  private currentUserId: string
  private localPresence: UserPresence
  private presenceCache: Map<string, UserPresence> = new Map()
  private cleanupTimer: number | null = null
  private idleTimeout: number
  private listeners: Set<(presences: UserPresence[]) => void> = new Set()

  constructor(
    userId: string,
    userName: string,
    client: CollaborationClient,
    options: {
      userColor?: string
      idleTimeout?: number         // milliseconds
    } = {}
  ) {
    this.client = client
    this.currentUserId = userId

    this.idleTimeout = options.idleTimeout || 300000 // 5 minutes default

    this.localPresence = {
      userId,
      userName,
      color: options.userColor || generateUserColor(userId),
      status: 'active',
      lastSeen: Date.now(),
    }

    this.setupIdleDetection()
    this.setupPresenceSync()
  }

  /**
   * Initialize presence manager
   */
  async initialize(): Promise<void> {
    // Subscribe to presence updates
    this.client.onPresenceUpdate((presence) => {
      if (presence.userId !== this.currentUserId) {
        this.presenceCache.set(presence.userId, presence)
        this.notifyListeners()
      }
    })

    // Subscribe to user join/leave
    this.client.onUserJoin((userId, presence) => {
      if (userId !== this.currentUserId) {
        this.presenceCache.set(userId, presence)
        this.notifyListeners()
      }
    })

    this.client.onUserLeave((userId) => {
      this.presenceCache.delete(userId)
      this.notifyListeners()
    })

    // Initial presence update
    await this.updatePresence()
  }

  /**
   * Update current user's presence
   */
  async updatePresence(updates?: Partial<UserPresence>): Promise<void> {
    this.localPresence = {
      ...this.localPresence,
      ...updates,
      lastSeen: Date.now(),
    }

    this.client.updatePresence(this.localPresence)
    this.presenceCache.set(this.currentUserId, this.localPresence)
    this.notifyListeners()
  }

  /**
   * Update cursor position
   */
  async updateCursor(cursor: CursorPosition): Promise<void> {
    await this.updatePresence({
      cursor,
      status: 'active',
    })
  }

  /**
   * Update text selection
   */
  async updateSelection(selection: TextSelection): Promise<void> {
    await this.updatePresence({
      selection,
      status: 'active',
    })
  }

  /**
   * Set typing status
   */
  async setTyping(resourceId: string, isTyping: boolean): Promise<void> {
    this.client.sendTypingIndicator(resourceId, isTyping)

    if (isTyping) {
      await this.updatePresence({
        status: 'typing',
        currentResource: {
          type: 'conversation', // Determine from context
          id: resourceId,
        },
      })
    } else {
      await this.updatePresence({
        status: 'active',
      })
    }
  }

  /**
   * Go idle
   */
  async goIdle(): Promise<void> {
    await this.updatePresence({
      status: 'idle',
    })
  }

  /**
   * Go offline
   */
  async goOffline(): Promise<void> {
    await this.updatePresence({
      status: 'offline',
    })
  }

  /**
   * Come back online
   */
  async comeOnline(): Promise<void> {
    await this.updatePresence({
      status: 'active',
    })
  }

  /**
   * Get all active presences
   */
  getActivePresences(): UserPresence[] {
    return Array.from(this.presenceCache.values()).filter(
      p => p.status !== 'offline' &&
      Date.now() - p.lastSeen < this.idleTimeout
    )
  }

  /**
   * Get presences for a specific resource
   */
  getPresencesForResource(resourceId: string): UserPresence[] {
    return this.getActivePresences().filter(
      p => p.currentResource?.id === resourceId
    )
  }

  /**
   * Get cursors for a specific resource
   */
  getCursorsForResource(resourceId: string): Map<string, CursorPosition> {
    const cursors = new Map<string, CursorPosition>()

    for (const presence of this.getPresencesForResource(resourceId)) {
      if (presence.cursor && presence.userId !== this.currentUserId) {
        cursors.set(presence.userId, presence.cursor)
      }
    }

    return cursors
  }

  /**
   * Get typing users for a resource
   */
  getTypingUsers(resourceId: string): UserPresence[] {
    return this.getPresencesForResource(resourceId).filter(
      p => p.status === 'typing'
    )
  }

  /**
   * Subscribe to presence changes
   */
  onPresenceChange(callback: (presences: UserPresence[]) => void): () => void {
    this.listeners.add(callback)

    // Call immediately with current presences
    callback(this.getActivePresences())

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }

    this.goOffline()
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private setupPresenceSync(): void {
    // Sync presence every 30 seconds
    this.cleanupTimer = window.setInterval(async () => {
      await this.updatePresence()
    }, 30000)
  }

  private setupIdleDetection(): void {
    let lastActivity = Date.now()

    // Track user activity
    const activityEvents = [
      'mousedown', 'keydown', 'scroll', 'touchstart',
      'mousemove', 'click'
    ]

    const handleActivity = () => {
      lastActivity = Date.now()

      // Come back online if idle
      if (this.localPresence.status === 'idle' || this.localPresence.status === 'offline') {
        this.comeOnline()
      }
    }

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    // Check for idle every minute
    setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivity

      if (timeSinceActivity > this.idleTimeout && this.localPresence.status === 'active') {
        this.goIdle()
      }
    }, 60000)

    // Store interval for cleanup
    this.cleanupTimer = window.setInterval(() => {
      // Check for stale presences
      const now = Date.now()
      for (const [userId, presence] of this.presenceCache.entries()) {
        if (now - presence.lastSeen > this.idleTimeout && presence.status !== 'offline') {
          // Mark as offline
          presence.status = 'offline'
          this.presenceCache.set(userId, presence)
          this.notifyListeners()
        }
      }
    }, 60000)
  }

  private notifyListeners(): void {
    const presences = this.getActivePresences()

    for (const listener of this.listeners) {
      try {
        listener(presences)
      } catch (error) {
        console.error('[PresenceManager] Listener error:', error)
      }
    }
  }
}

// ============================================================================
// CURSOR RENDERER
// ============================================================================

export interface CursorRendererOptions {
  container: HTMLElement
  userId: string
  userName: string
  color: string
  position: CursorPosition
}

export class CursorRenderer {
  private cursorElement: HTMLElement | null = null
  private labelElement: HTMLElement | null = null
  private container: HTMLElement

  constructor(options: CursorRendererOptions) {
    this.container = options.container
    this.createCursorElement(options)
  }

  /**
   * Update cursor position
   */
  update(position: CursorPosition): void {
    if (!this.cursorElement) return

    // In a real implementation, calculate position from text offset
    // For now, use x/y if provided
    if (position.x !== undefined && position.y !== undefined) {
      this.cursorElement.style.left = `${position.x}px`
      this.cursorElement.style.top = `${position.y}px`
    }

    // Update label if on different message
    if (position.messageId) {
      this.updateLabel(`📍 ${position.messageId}`)
    }
  }

  /**
   * Remove cursor from DOM
   */
  remove(): void {
    this.cursorElement?.remove()
    this.labelElement?.remove()
    this.cursorElement = null
    this.labelElement = null
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private createCursorElement(options: CursorRendererOptions): void {
    // Create cursor pointer
    this.cursorElement = document.createElement('div')
    this.cursorElement.className = 'collaboration-cursor'
    this.cursorElement.style.cssText = `
      position: absolute;
      width: 2px;
      height: 20px;
      background-color: ${options.color};
      pointer-events: none;
      transition: all 0.1s ease-out;
      z-index: 1000;
    `

    // Create cursor label
    this.labelElement = document.createElement('div')
    this.labelElement.className = 'collaboration-cursor-label'
    this.labelElement.textContent = options.userName
    this.labelElement.style.cssText = `
      position: absolute;
      top: -24px;
      left: 4px;
      padding: 2px 8px;
      background-color: ${options.color};
      color: white;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      pointer-events: none;
      transition: all 0.1s ease-out;
      z-index: 1000;
    `

    this.cursorElement.appendChild(this.labelElement)
    this.container.appendChild(this.cursorElement)
  }

  private updateLabel(text: string): void {
    if (this.labelElement) {
      this.labelElement.textContent = text
    }
  }
}

// ============================================================================
// SELECTION HIGHLIGHTER
// ============================================================================

export interface SelectionRange {
  start: number
  end: number
  color: string
  userId: string
  userName: string
}

export class SelectionHighlighter {
  private container: HTMLElement
  private highlights: Map<string, { element: HTMLElement; range: SelectionRange }> = new Map()

  constructor(container: HTMLElement) {
    this.container = container
  }

  /**
   * Update selection highlight for a user
   */
  updateHighlight(userId: string, userName: string, range: SelectionRange): void {
    // Remove existing highlight for this user
    this.removeHighlight(userId)

    // Create new highlight
    const highlight = this.createHighlight(range, userName)
    this.highlights.set(userId, { element: highlight, range })

    // Insert into container
    // In a real implementation, this would use Range API to highlight text
    this.container.appendChild(highlight)
  }

  /**
   * Remove selection highlight for a user
   */
  removeHighlight(userId: string): void {
    const existing = this.highlights.get(userId)
    if (existing) {
      existing.element.remove()
      this.highlights.delete(userId)
    }
  }

  /**
   * Clear all highlights
   */
  clearAll(): void {
    for (const { element } of this.highlights.values()) {
      element.remove()
    }
    this.highlights.clear()
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private createHighlight(range: SelectionRange, userName: string): HTMLElement {
    const highlight = document.createElement('div')
    highlight.className = 'collaboration-selection-highlight'
    highlight.style.cssText = `
      position: absolute;
      background-color: ${range.color}33;
      border-left: 2px solid ${range.color};
      pointer-events: none;
      transition: all 0.1s ease-out;
    `

    // Add tooltip with user name
    const tooltip = document.createElement('div')
    tooltip.textContent = userName
    tooltip.style.cssText = `
      position: absolute;
      top: -20px;
      left: 0;
      padding: 2px 6px;
      background-color: ${range.color};
      color: white;
      border-radius: 3px;
      font-size: 11px;
      white-space: nowrap;
    `

    highlight.appendChild(tooltip)

    return highlight
  }
}

// ============================================================================
// FACTORY
// ============================================================================

let globalPresenceManager: PresenceManager | null = null

export function getPresenceManager(
  userId: string,
  userName: string,
  client: CollaborationClient,
  options?: {
    userColor?: string
    idleTimeout?: number
  }
): PresenceManager {
  if (!globalPresenceManager) {
    globalPresenceManager = new PresenceManager(userId, userName, client, options)
  }

  return globalPresenceManager
}

export async function initializePresenceManager(
  userId: string,
  userName: string,
  client: CollaborationClient,
  options?: {
    userColor?: string
    idleTimeout?: number
  }
): Promise<PresenceManager> {
  const manager = getPresenceManager(userId, userName, client, options)
  await manager.initialize()
  return manager
}
