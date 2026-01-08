/**
 * Permissions & Access Control System
 *
 * Manages user permissions, access policies, and authorization.
 */

import {
  AccessPolicy,
  ResourcePermissions,
  UserGrant,
  PermissionLevel,
  ShareableType,
  canUserPerformAction,
  hasPermissionExpired,
  CollaborationAuditLog,
  AuditAction,
} from './types'
import { ValidationError, NotFoundError, StorageError } from './errors'

const STORE_POLICIES = 'access-policies'
const STORE_AUDIT_LOGS = 'audit-logs'

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

async function getDB(): Promise<IDBDatabase> {
  const DB_NAME = 'RealTimeCollaboration'
  const DB_VERSION = 1

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(new Error('Failed to open database'))

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      // Access policies store
      if (!database.objectStoreNames.contains(STORE_POLICIES)) {
        const policyStore = database.createObjectStore(STORE_POLICIES, { keyPath: 'id' })
        policyStore.createIndex('resourceId', 'resourceId', { unique: false })
        policyStore.createIndex('owner', 'owner', { unique: false })
      }

      // Audit logs store
      if (!database.objectStoreNames.contains(STORE_AUDIT_LOGS)) {
        const logStore = database.createObjectStore(STORE_AUDIT_LOGS, { keyPath: 'id' })
        logStore.createIndex('userId', 'userId', { unique: false })
        logStore.createIndex('resourceId', 'resourceId', { unique: false })
        logStore.createIndex('timestamp', 'timestamp', { unique: false })
        logStore.createIndex('action', 'action', { unique: false })
      }
    }
  })
}

// ============================================================================
// ACCESS POLICY MANAGEMENT
// ============================================================================

/**
 * Create access policy for a resource
 */
export async function createAccessPolicy(
  resourceId: string,
  resourceType: ShareableType,
  owner: string,
  permissions: Partial<ResourcePermissions> = {}
): Promise<AccessPolicy> {
  if (!resourceId?.trim() || !owner?.trim()) {
    throw new ValidationError('Resource ID and owner are required', {
      field: 'resourceId',
    })
  }

  const database = await getDB()
  const now = Date.now()

  const defaultPermissions: ResourcePermissions = {
    defaultPermission: 'owner',
    allowPublicSharing: false,
    requireApprovalForEdit: false,
    allowedRoles: ['owner', 'editor', 'commenter', 'viewer'],
  }

  const policy: AccessPolicy = {
    id: `policy_${now}_${Math.random().toString(36).substring(2, 11)}`,
    resourceId,
    resourceType,
    owner,
    permissions: { ...defaultPermissions, ...permissions },
    userGrants: [],
    roleGrants: [],
    createdAt: now,
    updatedAt: now,
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_POLICIES], 'readwrite')
    const store = transaction.objectStore(STORE_POLICIES)
    const request = store.add(policy)

    request.onsuccess = () => {
      // Log audit event
      logAuditEvent('permission-granted', owner, resourceId, resourceType, {
        policyId: policy.id,
        permission: 'owner',
      }).catch(console.error)

      resolve(policy)
    }

    request.onerror = () => reject(new StorageError('Failed to create access policy', {
      technicalDetails: request.error?.message,
      cause: request.error || undefined,
    }))
  })
}

/**
 * Get access policy for a resource
 */
export async function getAccessPolicy(resourceId: string): Promise<AccessPolicy | null> {
  if (!resourceId?.trim()) {
    throw new ValidationError('Resource ID cannot be empty', {
      field: 'resourceId',
      value: resourceId,
    })
  }

  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_POLICIES], 'readonly')
    const index = transaction.objectStore(STORE_POLICIES).index('resourceId')
    const request = index.get(resourceId)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(new StorageError('Failed to get access policy', {
      technicalDetails: request.error?.message,
      cause: request.error || undefined,
    }))
  })
}

/**
 * Update access policy permissions
 */
export async function updateAccessPolicy(
  resourceId: string,
  updates: Partial<ResourcePermissions>
): Promise<AccessPolicy> {
  const existing = await getAccessPolicy(resourceId)
  if (!existing) {
    throw new NotFoundError('access policy', resourceId)
  }

  const updated: AccessPolicy = {
    ...existing,
    permissions: {
      ...existing.permissions,
      ...updates,
    },
    updatedAt: Date.now(),
  }

  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_POLICIES], 'readwrite')
    const store = transaction.objectStore(STORE_POLICIES)
    const request = store.put(updated)

    request.onsuccess = () => resolve(updated)
    request.onerror = () => reject(new StorageError('Failed to update access policy', {
      technicalDetails: request.error?.message,
      cause: request.error || undefined,
    }))
  })
}

/**
 * Grant permission to user
 */
export async function grantUserPermission(
  resourceId: string,
  userId: string,
  permission: PermissionLevel,
  grantedBy: string,
  options: {
    expiresAt?: number
  } = {}
): Promise<UserGrant> {
  const policy = await getAccessPolicy(resourceId)
  if (!policy) {
    throw new NotFoundError('access policy', resourceId)
  }

  // Check if granter has permission
  const granterPermission = await getUserPermission(resourceId, grantedBy)
  if (!canUserPerformAction(granterPermission, 'grant-permissions')) {
    throw new ValidationError('You do not have permission to grant access', {
      field: 'permission',
      value: granterPermission,
    })
  }

  // Remove existing grant for this user
  const existingGrantIndex = policy.userGrants.findIndex(g => g.userId === userId)
  if (existingGrantIndex >= 0) {
    policy.userGrants.splice(existingGrantIndex, 1)
  }

  // Create new grant
  const grant: UserGrant = {
    userId,
    permission,
    grantedBy,
    grantedAt: Date.now(),
    expiresAt: options.expiresAt,
  }

  policy.userGrants.push(grant)
  policy.updatedAt = Date.now()

  // Save updated policy
  await updateAccessPolicy(resourceId, policy.permissions)

  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_POLICIES], 'readwrite')
    const store = transaction.objectStore(STORE_POLICIES)
    const request = store.put(policy)

    request.onsuccess = async () => {
      // Log audit event
      await logAuditEvent('permission-granted', grantedBy, resourceId, policy.resourceType, {
        targetUserId: userId,
        permission,
      })

      resolve(grant)
    }

    request.onerror = () => reject(new StorageError('Failed to grant user permission', {
      technicalDetails: request.error?.message,
      cause: request.error || undefined,
    }))
  })
}

/**
 * Revoke user permission
 */
export async function revokeUserPermission(
  resourceId: string,
  userId: string,
  revokedBy: string
): Promise<void> {
  const policy = await getAccessPolicy(resourceId)
  if (!policy) {
    throw new NotFoundError('access policy', resourceId)
  }

  // Check if revoker has permission
  const revokerPermission = await getUserPermission(resourceId, revokedBy)
  if (!canUserPerformAction(revokerPermission, 'grant-permissions')) {
    throw new ValidationError('You do not have permission to revoke access', {
      field: 'permission',
      value: revokerPermission,
    })
  }

  // Remove grant
  policy.userGrants = policy.userGrants.filter(g => g.userId !== userId)
  policy.updatedAt = Date.now()

  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_POLICIES], 'readwrite')
    const store = transaction.objectStore(STORE_POLICIES)
    const request = store.put(policy)

    request.onsuccess = async () => {
      // Log audit event
      await logAuditEvent('permission-revoked', revokedBy, resourceId, policy.resourceType, {
        targetUserId: userId,
      })

      resolve()
    }

    request.onerror = () => reject(new StorageError('Failed to revoke user permission', {
      technicalDetails: request.error?.message,
      cause: request.error || undefined,
    }))
  })
}

/**
 * Get user's permission level for a resource
 */
export async function getUserPermission(
  resourceId: string,
  userId: string
): Promise<PermissionLevel> {
  const policy = await getAccessPolicy(resourceId)

  if (!policy) {
    return 'viewer' // Default to viewer if no policy exists
  }

  // Owner has full access
  if (policy.owner === userId) {
    return 'owner'
  }

  // Check user grants
  const userGrant = policy.userGrants.find(g => g.userId === userId)

  if (userGrant) {
    // Check if expired
    if (hasPermissionExpired(userGrant)) {
      return policy.permissions.defaultPermission
    }

    return userGrant.permission
  }

  // Check role grants (simplified - in production, would check user's roles)
  // For now, return default permission
  return policy.permissions.defaultPermission
}

/**
 * Check if user can perform action
 */
export async function checkPermission(
  resourceId: string,
  userId: string,
  action: 'view' | 'edit' | 'comment' | 'share' | 'delete' | 'grant-permissions'
): Promise<boolean> {
  const permission = await getUserPermission(resourceId, userId)
  return canUserPerformAction(permission, action)
}

/**
 * List all user grants for a resource
 */
export async function listUserGrants(resourceId: string): Promise<UserGrant[]> {
  const policy = await getAccessPolicy(resourceId)

  if (!policy) {
    return []
  }

  // Filter out expired grants
  return policy.userGrants.filter(g => !hasPermissionExpired(g))
}

/**
 * Get access policy for multiple resources
 */
export async function getAccessPolicies(resourceIds: string[]): Promise<Map<string, AccessPolicy>> {
  const policies = new Map<string, AccessPolicy>()

  for (const resourceId of resourceIds) {
    const policy = await getAccessPolicy(resourceId)
    if (policy) {
      policies.set(resourceId, policy)
    }
  }

  return policies
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log an audit event
 */
export async function logAuditEvent(
  action: AuditAction,
  userId: string,
  resourceId?: string,
  resourceType?: ShareableType,
  details?: unknown
): Promise<CollaborationAuditLog> {
  const database = await getDB()
  const now = Date.now()

  const log: CollaborationAuditLog = {
    id: `audit_${now}_${Math.random().toString(36).substring(2, 11)}`,
    timestamp: now,
    action,
    userId,
    resourceId,
    resourceType,
    details,
    ipAddress: await getClientIP(),
    userAgent: navigator.userAgent,
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_AUDIT_LOGS], 'readwrite')
    const store = transaction.objectStore(STORE_AUDIT_LOGS)
    const request = store.add(log)

    request.onsuccess = () => resolve(log)
    request.onerror = () => reject(new StorageError('Failed to log audit event', {
      technicalDetails: request.error?.message,
      cause: request.error || undefined,
    }))
  })
}

/**
 * Get audit logs for a resource
 */
export async function getAuditLogs(
  resourceId: string,
  options: {
    limit?: number
    offset?: number
    actions?: AuditAction[]
    startTime?: number
    endTime?: number
  } = {}
): Promise<CollaborationAuditLog[]> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_AUDIT_LOGS], 'readonly')
    const index = transaction.objectStore(STORE_AUDIT_LOGS).index('resourceId')
    const request = index.getAll(resourceId)

    request.onsuccess = () => {
      let logs = (request.result || []) as CollaborationAuditLog[]

      // Filter by actions
      if (options.actions && options.actions.length > 0) {
        logs = logs.filter(log => options.actions!.includes(log.action))
      }

      // Filter by time range
      if (options.startTime) {
        logs = logs.filter(log => log.timestamp >= options.startTime!)
      }

      if (options.endTime) {
        logs = logs.filter(log => log.timestamp <= options.endTime!)
      }

      // Sort by timestamp (newest first)
      logs.sort((a, b) => b.timestamp - a.timestamp)

      // Apply pagination
      if (options.offset) {
        logs = logs.slice(options.offset)
      }

      if (options.limit) {
        logs = logs.slice(0, options.limit)
      }

      resolve(logs)
    }

    request.onerror = () => reject(request.error)
  })
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  options: {
    limit?: number
    startTime?: number
    endTime?: number
  } = {}
): Promise<CollaborationAuditLog[]> {
  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_AUDIT_LOGS], 'readonly')
    const index = transaction.objectStore(STORE_AUDIT_LOGS).index('userId')
    const request = index.getAll(userId)

    request.onsuccess = () => {
      let logs = (request.result || []) as CollaborationAuditLog[]

      // Filter by time range
      if (options.startTime) {
        logs = logs.filter(log => log.timestamp >= options.startTime!)
      }

      if (options.endTime) {
        logs = logs.filter(log => log.timestamp <= options.endTime!)
      }

      // Sort by timestamp (newest first)
      logs.sort((a, b) => b.timestamp - a.timestamp)

      // Apply limit
      if (options.limit) {
        logs = logs.slice(0, options.limit)
      }

      resolve(logs)
    }

    request.onerror = () => reject(request.error)
  })
}

/**
 * Get audit statistics
 */
export async function getAuditStatistics(
  resourceId: string,
  startTime?: number
): Promise<{
  totalEvents: number
  eventsByAction: Record<AuditAction, number>
  uniqueUsers: number
  mostActiveUser?: { userId: string; count: number }
}> {
  const logs = startTime
    ? await getAuditLogs(resourceId, { startTime })
    : await getAuditLogs(resourceId)

  const eventsByAction: Record<AuditAction, number> = {
    'share-created': 0,
    'share-accessed': 0,
    'share-revoked': 0,
    'permission-granted': 0,
    'permission-revoked': 0,
    'comment-added': 0,
    'comment-edited': 0,
    'comment-deleted': 0,
    'comment-resolved': 0,
    'access-requested': 0,
    'access-approved': 0,
    'access-denied': 0,
    'session-joined': 0,
    'session-left': 0,
    'data-exported': 0,
  }

  const userCounts: Record<string, number> = {}
  let mostActiveUser: { userId: string; count: number } | undefined

  for (const log of logs) {
    eventsByAction[log.action]++
    userCounts[log.userId] = (userCounts[log.userId] || 0) + 1
  }

  // Find most active user
  for (const [userId, count] of Object.entries(userCounts)) {
    if (!mostActiveUser || count > mostActiveUser.count) {
      mostActiveUser = { userId, count }
    }
  }

  return {
    totalEvents: logs.length,
    eventsByAction,
    uniqueUsers: Object.keys(userCounts).length,
    mostActiveUser,
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get client IP address
 */
async function getClientIP(): Promise<string | undefined> {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip
  } catch {
    return undefined
  }
}

/**
 * Batch check permissions for multiple resources
 */
export async function batchCheckPermissions(
  resourceIds: string[],
  userId: string,
  action: 'view' | 'edit' | 'comment' | 'share' | 'delete' | 'grant-permissions'
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>()

  for (const resourceId of resourceIds) {
    const hasPermission = await checkPermission(resourceId, userId, action)
    results.set(resourceId, hasPermission)
  }

  return results
}

/**
 * Export access policy (for backup)
 */
export async function exportAccessPolicy(resourceId: string): Promise<string> {
  const policy = await getAccessPolicy(resourceId)

  if (!policy) {
    throw new NotFoundError('access policy', resourceId)
  }

  return JSON.stringify(policy, null, 2)
}

/**
 * Import access policy (from backup)
 */
export async function importAccessPolicy(
  policyJson: string
): Promise<AccessPolicy> {
  try {
    const policy = JSON.parse(policyJson) as AccessPolicy

    // Validate structure
    if (!policy.resourceId || !policy.owner) {
      throw new ValidationError('Invalid policy format', {
        field: 'policy',
      })
    }

    const database = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_POLICIES], 'readwrite')
      const store = transaction.objectStore(STORE_POLICIES)
      const request = store.put(policy)

      request.onsuccess = () => resolve(policy)
      request.onerror = () => reject(new StorageError('Failed to import access policy', {
        technicalDetails: request.error?.message,
        cause: request.error || undefined,
      }))
    })
  } catch (error) {
    throw new ValidationError('Invalid policy JSON', {
      field: 'policyJson',
      value: policyJson,
    })
  }
}
