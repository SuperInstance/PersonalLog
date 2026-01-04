/**
 * Collaboration System
 *
 * Complete collaboration system for PersonalLog.
 * Includes sharing, comments, real-time collaboration, presence tracking,
 * and access control.
 */

// ============================================================================
// TYPES
// ============================================================================

export * from './types'

// ============================================================================
// SHARING
// ============================================================================

export {
  createShareLink,
  getShareLink,
  getShareLinkByToken,
  listShareLinks,
  updateShareLink,
  revokeShareLink,
  deleteShareLink,
  accessShare,
  generateShareUrl,
  validateSharePermissions,
  createAccessRequest,
  getAccessRequests,
  processAccessRequest,
  cleanupExpiredShares,
  getShareStatistics,
} from './sharing'

// ============================================================================
// COMMENTS
// ============================================================================

export {
  addComment,
  getComment,
  getComments,
  getCommentThread,
  updateComment,
  deleteComment,
  resolveComment,
  addReaction,
  removeReaction,
  searchComments,
  getCommentsByUser,
  getCommentsMentioningUser,
  getUnresolvedComments,
  getCommentStatistics,
  validateHighlight,
  parseCommentContent,
} from './comments'

// ============================================================================
// REAL-TIME COLLABORATION
// ============================================================================

export {
  CollaborationWebSocket,
  CollaborationClient,
  getCollaborationClient,
  initializeCollaborationClient,
} from './websocket'

// ============================================================================
// PRESENCE
// ============================================================================

export {
  PresenceManager,
  CursorRenderer,
  SelectionHighlighter,
  getPresenceManager,
  initializePresenceManager,
} from './presence'

// ============================================================================
// PERMISSIONS
// ============================================================================

export {
  createAccessPolicy,
  getAccessPolicy,
  updateAccessPolicy,
  grantUserPermission,
  revokeUserPermission,
  getUserPermission,
  checkPermission,
  listUserGrants,
  getAccessPolicies,
  logAuditEvent,
  getAuditLogs,
  getUserAuditLogs,
  getAuditStatistics,
  batchCheckPermissions,
  exportAccessPolicy,
  importAccessPolicy,
} from './permissions'

// ============================================================================
// INITIALIZATION
// ============================================================================

import { CollaborationClient } from './websocket'
import { PresenceManager } from './presence'

export interface CollaborationConfig {
  userId: string
  userName: string
  websocketUrl?: string
  userColor?: string
  idleTimeout?: number
}

export class CollaborationSystem {
  private client: CollaborationClient | null = null
  private presence: PresenceManager | null = null
  private initialized = false

  /**
   * Initialize collaboration system
   */
  async initialize(config: CollaborationConfig): Promise<void> {
    if (this.initialized) {
      console.warn('[CollaborationSystem] Already initialized')
      return
    }

    try {
      // TODO: Initialize WebSocket client when implemented
      // this.client = getCollaborationClient(config.userId, {
      //   url: config.websocketUrl || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
      //   reconnectInterval: 3000,
      //   heartbeatInterval: 30000,
      //   maxReconnectAttempts: 10,
      // })

      // await this.client?.connect()

      // TODO: Initialize presence manager when implemented
      // this.presence = getPresenceManager(
      //   config.userId,
      //   config.userName,
      //   this.client,
      //   {
      //     userColor: config.userColor,
      //     idleTimeout: config.idleTimeout || 300000,
      //   }
      // )

      // await this.presence?.initialize()

      this.initialized = true
      console.log('[CollaborationSystem] Initialized')
    } catch (error) {
      console.error('[CollaborationSystem] Initialization failed:', error)
      throw error
    }
  }

  /**
   * Get collaboration client
   */
  getClient(): CollaborationClient {
    if (!this.client) {
      throw new Error('Collaboration system not initialized')
    }
    return this.client
  }

  /**
   * Get presence manager
   */
  getPresence(): PresenceManager {
    if (!this.presence) {
      throw new Error('Collaboration system not initialized')
    }
    return this.presence
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    if (this.presence) {
      this.presence.cleanup()
      this.presence = null
    }

    if (this.client) {
      this.client.disconnect()
      this.client = null
    }

    this.initialized = false
    console.log('[CollaborationSystem] Cleaned up')
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let globalCollaboration: CollaborationSystem | null = null

export function getCollaborationSystem(): CollaborationSystem {
  if (!globalCollaboration) {
    globalCollaboration = new CollaborationSystem()
  }
  return globalCollaboration
}

export async function initializeCollaboration(config: CollaborationConfig): Promise<CollaborationSystem> {
  const system = getCollaborationSystem()
  await system.initialize(config)
  return system
}
