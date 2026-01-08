/**
 * Collaboration System Type Definitions
 *
 * Comprehensive types for real-time collaboration, sharing,
 * comments, and access control.
 */

// ============================================================================
// COLLABORATION TYPES
// ============================================================================

export type ShareableType = 'conversation' | 'knowledge' | 'message'

export type ShareVisibility = 'public' | 'password-protected' | 'restricted' | 'private'

export type ShareStatus = 'active' | 'expired' | 'revoked' | 'pending' | 'deleted'

export type PermissionLevel = 'owner' | 'editor' | 'commenter' | 'viewer'

export type CollaborationRole = 'owner' | 'editor' | 'viewer' | 'commenter'

// ============================================================================
// SHARE LINKS
// ============================================================================

export interface ShareLink {
  id: string
  resourceId: string
  resourceType: ShareableType
  shareId: string                    // Unique share token
  visibility: ShareVisibility
  password?: string                  // Hashed password
  status: ShareStatus
  permissions: SharedPermissions
  expiresAt?: number
  createdAt: number
  createdBy: string
  accessCount: number
  lastAccessed?: number
}

export interface SharedPermissions {
  canView: boolean
  canEdit: boolean
  canComment: boolean
  canShare: boolean
  canDownload: boolean
  canDelete: boolean
}

export interface ShareAccessRequest {
  id: string
  shareId: string
  requesterName: string
  requesterEmail: string
  message?: string
  status: 'pending' | 'approved' | 'denied'
  requestedAt: number
  processedAt?: number
}

// ============================================================================
// COMMENTS & ANNOTATIONS
// ============================================================================

export interface Comment {
  id: string
  resourceId: string
  resourceType: ShareableType
  parentId?: string                  // For threaded replies
  content: string
  author: CommentAuthor
  timestamp: number
  editedAt?: number
  reactions: CommentReaction[]
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: number
  highlights?: TextHighlight[]
  metadata: CommentMetadata
}

export interface CommentAuthor {
  id: string
  name: string
  email?: string
  avatar?: string
  isCurrentUser: boolean
}

export interface CommentReaction {
  emoji: string
  users: string[]                    // User IDs
  count: number
}

export interface TextHighlight {
  start: number
  end: number
  text: string
  messageId?: string                // For conversation comments
}

export interface CommentMetadata {
  edits: number
  lastEditBy?: string
  mentions: string[]                 // User IDs mentioned
  attachments?: CommentAttachment[]
}

export interface CommentAttachment {
  id: string
  type: 'image' | 'file'
  url: string
  name: string
  size: number
}

// ============================================================================
// REAL-TIME PRESENCE
// ============================================================================

export interface UserPresence {
  userId: string
  userName: string
  avatar?: string
  color: string
  cursor?: CursorPosition
  selection?: TextSelection
  status: PresenceStatus
  lastSeen: number
  currentResource?: {
    type: ShareableType
    id: string
  }
}

export type PresenceStatus = 'active' | 'idle' | 'offline' | 'typing'

export interface CursorPosition {
  resourceId: string
  messageId?: string
  position: number                  // Character position
  x?: number                        // Visual X coordinate
  y?: number                        // Visual Y coordinate
}

export interface TextSelection {
  resourceId: string
  messageId?: string
  start: number
  end: number
  text: string
}

export interface PresenceUpdate {
  userId: string
  presence: Partial<UserPresence>
  timestamp: number
}

// ============================================================================
// REAL-TIME COLLABORATION
// ============================================================================

export interface CollaborationSession {
  id: string
  resourceId: string
  resourceType: ShareableType
  participants: CollaborationParticipant[]
  startedAt: number
  lastActivity: number
}

export interface CollaborationParticipant {
  userId: string
  userName: string
  role: CollaborationRole
  joinedAt: number
  color: string
  cursor?: CursorPosition
  isTyping: boolean
}

export interface CollaborationOperation {
  id: string
  sessionId: string
  userId: string
  type: OperationType
  data: unknown
  timestamp: number
  version: number
  applied: boolean
}

export type OperationType =
  | 'insert'
  | 'delete'
  | 'replace'
  | 'format'
  | 'cursor-move'
  | 'comment-add'
  | 'comment-update'
  | 'comment-delete'
  | 'reaction-add'
  | 'reaction-remove'

// ============================================================================
// PERMISSIONS & ACCESS CONTROL
// ============================================================================

export interface AccessPolicy {
  id: string
  resourceId: string
  resourceType: ShareableType
  owner: string
  permissions: ResourcePermissions
  userGrants: UserGrant[]
  roleGrants: RoleGrant[]
  inheritedFrom?: string
  createdAt: number
  updatedAt: number
}

export interface ResourcePermissions {
  defaultPermission: PermissionLevel
  allowPublicSharing: boolean
  requireApprovalForEdit: boolean
  allowedRoles: PermissionLevel[]
}

export interface UserGrant {
  userId: string
  permission: PermissionLevel
  grantedBy: string
  grantedAt: number
  expiresAt?: number
}

export interface RoleGrant {
  role: string                      // Custom role name
  permissions: PermissionLevel
  grantedBy: string
  grantedAt: number
}

// ============================================================================
// COLLABORATION EVENTS
// ============================================================================

export interface CollaborationEvent {
  id: string
  type: CollaborationEventType
  resourceId: string
  resourceType: ShareableType
  userId: string
  timestamp: number
  data: unknown
}

export type CollaborationEventType =
  | 'user-joined'
  | 'user-left'
  | 'cursor-moved'
  | 'text-edited'
  | 'comment-added'
  | 'comment-updated'
  | 'comment-deleted'
  | 'reaction-added'
  | 'permission-changed'
  | 'share-created'
  | 'share-accessed'
  | 'share-revoked'

// ============================================================================
// WEBSOCKET MESSAGES
// ============================================================================

export interface WebSocketMessage {
  type: WSMessageType
  id: string
  timestamp: number
  payload: unknown
}

export type WSMessageType =
  | 'presence-update'
  | 'operation-broadcast'
  | 'cursor-sync'
  | 'comment-sync'
  | 'typing-indicator'
  | 'session-join'
  | 'session-leave'
  | 'error'
  | 'ping'
  | 'pong'

export interface PresenceUpdateMessage extends WebSocketMessage {
  type: 'presence-update'
  payload: {
    userId: string
    presence: UserPresence
  }
}

export interface OperationBroadcastMessage extends WebSocketMessage {
  type: 'operation-broadcast'
  payload: {
    operation: CollaborationOperation
  }
}

export interface CursorSyncMessage extends WebSocketMessage {
  type: 'cursor-sync'
  payload: {
    userId: string
    cursor: CursorPosition
  }
}

export interface TypingIndicatorMessage extends WebSocketMessage {
  type: 'typing-indicator'
  payload: {
    userId: string
    resourceId: string
    isTyping: boolean
  }
}

// ============================================================================
// COLLABORATION SETTINGS
// ============================================================================

export interface CollaborationSettings {
  enabled: boolean
  realTimeEnabled: boolean
  showPresenceIndicators: boolean
  showCursors: boolean
  typingIndicatorEnabled: boolean
  autoSaveInterval: number          // milliseconds
  conflictResolution: 'last-write-wins' | 'operational-transform' | 'crdt'
  maxParticipants: number
  allowAnonymousAccess: boolean
  defaultShareExpiration: number    // days, 0 = never
  requirePasswordForPublicLinks: boolean
  enableAccessRequests: boolean
  notificationPreferences: NotificationPreferences
}

export interface NotificationPreferences {
  onUserJoin: boolean
  onUserLeave: boolean
  onCommentAdd: boolean
  onCommentMention: boolean
  onEditConflict: boolean
  onShareAccess: boolean
}

export const DEFAULT_COLLABORATION_SETTINGS: CollaborationSettings = {
  enabled: true,
  realTimeEnabled: true,
  showPresenceIndicators: true,
  showCursors: true,
  typingIndicatorEnabled: true,
  autoSaveInterval: 5000,
  conflictResolution: 'operational-transform',
  maxParticipants: 10,
  allowAnonymousAccess: false,
  defaultShareExpiration: 30,
  requirePasswordForPublicLinks: false,
  enableAccessRequests: true,
  notificationPreferences: {
    onUserJoin: true,
    onUserLeave: false,
    onCommentAdd: true,
    onCommentMention: true,
    onEditConflict: true,
    onShareAccess: true,
  },
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface CollaborationAuditLog {
  id: string
  timestamp: number
  action: AuditAction
  userId: string
  resourceId?: string
  resourceType?: ShareableType
  details: unknown
  ipAddress?: string
  userAgent?: string
}

export type AuditAction =
  | 'share-created'
  | 'share-accessed'
  | 'share-revoked'
  | 'permission-granted'
  | 'permission-revoked'
  | 'comment-added'
  | 'comment-edited'
  | 'comment-deleted'
  | 'comment-resolved'
  | 'access-requested'
  | 'access-approved'
  | 'access-denied'
  | 'session-joined'
  | 'session-left'
  | 'data-exported'

// ============================================================================
// BRANDED TYPES
// ============================================================================

export type ShareId = string & { readonly __brand: 'ShareId' }
export type CommentId = string & { readonly __brand: 'CommentId' }
export type SessionId = string & { readonly __brand: 'SessionId' }

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function createShareId(): ShareId {
  return `share_${Date.now()}_${Math.random().toString(36).substring(2, 11)}` as ShareId
}

export function createCommentId(): CommentId {
  return `comment_${Date.now()}_${Math.random().toString(36).substring(2, 11)}` as CommentId
}

export function createSessionId(): SessionId {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}` as SessionId
}

export function generateUserColor(userId: string): string {
  const hash = userId.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e'
  ]
  return colors[Math.abs(hash) % colors.length]
}

export function canUserPerformAction(
  permission: PermissionLevel,
  action: 'view' | 'edit' | 'comment' | 'share' | 'delete' | 'grant-permissions'
): boolean {
  const permissionsMatrix = {
    owner: ['view', 'edit', 'comment', 'share', 'delete', 'grant-permissions'],
    editor: ['view', 'edit', 'comment'],
    commenter: ['view', 'comment'],
    viewer: ['view'],
  }

  return permissionsMatrix[permission]?.includes(action) || false
}

export function hasPermissionExpired(grant: UserGrant): boolean {
  if (!grant.expiresAt) return false
  return grant.expiresAt < Date.now()
}

export function isShareActive(share: ShareLink): boolean {
  if (share.status !== 'active') return false
  if (share.expiresAt && share.expiresAt < Date.now()) {
    return false
  }
  return true
}
