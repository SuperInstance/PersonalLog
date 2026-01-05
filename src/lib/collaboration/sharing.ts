/**
 * Sharing System
 *
 * Manages share links, access control, and share lifecycle.
 */

import {
  ShareLink,
  ShareableType,
  ShareVisibility,
  ShareStatus,
  SharedPermissions,
  ShareAccessRequest,
  ShareId,
  createShareId,
  isShareActive,
} from './types'
import { ValidationError, NotFoundError, StorageError } from '@/lib/errors'

const DB_NAME = 'PersonalLogCollaboration'
const DB_VERSION = 1
const STORE_SHARES = 'shares'
const STORE_REQUESTS = 'access-requests'

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

let db: IDBDatabase | null = null

async function getDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(new StorageError('Failed to open collaboration database', {
      technicalDetails: `DB: ${DB_NAME}, Version: ${DB_VERSION}`,
    }))

    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      // Shares store
      if (!database.objectStoreNames.contains(STORE_SHARES)) {
        const shareStore = database.createObjectStore(STORE_SHARES, { keyPath: 'id' })
        shareStore.createIndex('resourceId', 'resourceId', { unique: false })
        shareStore.createIndex('shareId', 'shareId', { unique: true })
        shareStore.createIndex('status', 'status', { unique: false })
        shareStore.createIndex('expiresAt', 'expiresAt', { unique: false })
      }

      // Access requests store
      if (!database.objectStoreNames.contains(STORE_REQUESTS)) {
        const requestStore = database.createObjectStore(STORE_REQUESTS, { keyPath: 'id' })
        requestStore.createIndex('shareId', 'shareId', { unique: false })
        requestStore.createIndex('status', 'status', { unique: false })
      }
    }
  })
}

// ============================================================================
// PASSWORD HASHING HELPERS
// ============================================================================

/**
 * Verify a password against a stored hash
 * @param password The plain text password to verify
 * @param storedHash The stored hash in format "salt:hash"
 * @returns true if password matches, false otherwise
 */
export async function verifySharePassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (!storedHash) {
    return false
  }

  try {
    const [saltHex, hashHex] = storedHash.split(':')
    if (!saltHex || !hashHex) {
      // Legacy format (no salt) - try direct comparison
      const encoder = new TextEncoder()
      const data = encoder.encode(password)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      return computedHash === storedHash
    }

    // New PBKDF2 format with salt
    const encoder = new TextEncoder()
    const passwordData = encoder.encode(password)

    // Convert salt hex back to bytes
    const salt = new Uint8Array(saltHex.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || [])

    // Derive key using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      'PBKDF2',
      false,
      ['deriveBits']
    )

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    )

    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    return computedHash === hashHex
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}

// ============================================================================
// SHARE LINK MANAGEMENT
// ============================================================================

/**
 * Create a new share link
 */
export async function createShareLink(
  resourceId: string,
  resourceType: ShareableType,
  visibility: ShareVisibility,
  options: {
    password?: string
    permissions?: Partial<SharedPermissions>
    expiresAt?: number
  } = {}
): Promise<ShareLink> {
  if (!resourceId?.trim()) {
    throw new ValidationError('Resource ID cannot be empty', {
      field: 'resourceId',
      value: resourceId,
    })
  }

  const database = await getDB()
  const shareId = createShareId()
  const now = Date.now()

  // Default permissions based on visibility
  const defaultPermissions: SharedPermissions = {
    canView: true,
    canEdit: visibility === 'private',
    canComment: visibility !== 'public',
    canShare: false,
    canDownload: visibility !== 'public',
    canDelete: false,
  }

  const permissions: SharedPermissions = {
    ...defaultPermissions,
    ...options.permissions,
  }

  // Hash password if provided
  let hashedPassword: string | undefined
  if (options.password) {
    // Use PBKDF2 for secure password hashing (suitable for passwords)
    const encoder = new TextEncoder()
    const passwordData = encoder.encode(options.password)

    // Generate a random salt
    const salt = crypto.getRandomValues(new Uint8Array(16))

    // Derive key using PBKDF2 with 100,000 iterations
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      'PBKDF2',
      false,
      ['deriveBits']
    )

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    )

    // Combine salt and hash for storage
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    hashedPassword = `${saltHex}:${hashHex}`
  }

  const share: ShareLink = {
    id: `share_${now}_${Math.random().toString(36).substring(2, 11)}`,
    resourceId,
    resourceType,
    shareId: shareId.toString(),
    visibility,
    password: hashedPassword,
    status: 'active',
    permissions,
    expiresAt: options.expiresAt,
    createdAt: now,
    createdBy: 'current-user', // In production, get from auth
    accessCount: 0,
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_SHARES], 'readwrite')
    const store = transaction.objectStore(STORE_SHARES)
    const request = store.add(share)

    request.onsuccess = () => resolve(share)
    request.onerror = () => reject(new StorageError('Failed to create share link', {
      technicalDetails: request.error?.message,
      cause: request.error || undefined,
    }))
  })
}

/**
 * Get a share link by ID
 */
export async function getShareLink(id: string): Promise<ShareLink | null> {
  if (!id?.trim()) {
    throw new ValidationError('Share ID cannot be empty', {
      field: 'id',
      value: id,
    })
  }

  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_SHARES], 'readonly')
    const store = transaction.objectStore(STORE_SHARES)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(new StorageError('Failed to get share link', {
      technicalDetails: request.error?.message,
      cause: request.error || undefined,
    }))
  })
}

/**
 * Get a share link by share token
 */
export async function getShareLinkByToken(token: string): Promise<ShareLink | null> {
  if (!token?.trim()) {
    throw new ValidationError('Share token cannot be empty', {
      field: 'token',
      value: token,
    })
  }

  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_SHARES], 'readonly')
    const index = transaction.objectStore(STORE_SHARES).index('shareId')
    const request = index.get(token)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(new StorageError('Failed to get share link', {
      technicalDetails: request.error?.message,
      cause: request.error || undefined,
    }))
  })
}

/**
 * List all share links for a resource
 */
export async function listShareLinks(resourceId: string): Promise<ShareLink[]> {
  if (!resourceId?.trim()) {
    throw new ValidationError('Resource ID cannot be empty', {
      field: 'resourceId',
      value: resourceId,
    })
  }

  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_SHARES], 'readonly')
    const index = transaction.objectStore(STORE_SHARES).index('resourceId')
    const request = index.getAll(resourceId)

    request.onsuccess = () => {
      const shares = (request.result || []) as ShareLink[]
      resolve(shares.filter(s => s.status !== 'deleted'))
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Update share link
 */
export async function updateShareLink(
  id: string,
  updates: Partial<Omit<ShareLink, 'id' | 'resourceId' | 'resourceType' | 'shareId' | 'createdAt' | 'createdBy'>>
): Promise<ShareLink> {
  const existing = await getShareLink(id)
  if (!existing) {
    throw new NotFoundError('share link', id)
  }

  // Hash new password if provided
  let hashedPassword: string | undefined
  if (updates.password && updates.password !== existing.password) {
    // Use PBKDF2 for secure password hashing (suitable for passwords)
    const encoder = new TextEncoder()
    const passwordData = encoder.encode(updates.password)

    // Generate a random salt
    const salt = crypto.getRandomValues(new Uint8Array(16))

    // Derive key using PBKDF2 with 100,000 iterations
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      'PBKDF2',
      false,
      ['deriveBits']
    )

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    )

    // Combine salt and hash for storage
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    hashedPassword = `${saltHex}:${hashHex}`
  }

  const updated: ShareLink = {
    ...existing,
    ...updates,
    password: hashedPassword || existing.password,
    id: existing.id,
  }

  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_SHARES], 'readwrite')
    const store = transaction.objectStore(STORE_SHARES)
    const request = store.put(updated)

    request.onsuccess = () => resolve(updated)
    request.onerror = () => reject(new StorageError('Failed to update share link', {
      technicalDetails: request.error?.message,
      cause: request.error || undefined,
    }))
  })
}

/**
 * Revoke a share link
 */
export async function revokeShareLink(id: string): Promise<void> {
  const existing = await getShareLink(id)
  if (!existing) {
    throw new NotFoundError('share link', id)
  }

  await updateShareLink(id, { status: 'revoked' })
}

/**
 * Delete a share link permanently
 */
export async function deleteShareLink(id: string): Promise<void> {
  if (!id?.trim()) {
    throw new ValidationError('Share ID cannot be empty', {
      field: 'id',
      value: id,
    })
  }

  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_SHARES], 'readwrite')
    const store = transaction.objectStore(STORE_SHARES)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new StorageError('Failed to delete share link', {
      technicalDetails: request.error?.message,
      cause: request.error || undefined,
    }))
  })
}

/**
 * Access a shared resource
 */
export async function accessShare(
  shareId: string,
  password?: string
): Promise<{ share: ShareLink; hasAccess: boolean; reason?: string }> {
  const share = await getShareLinkByToken(shareId)

  if (!share) {
    return {
      share: null as any,
      hasAccess: false,
      reason: 'Share link not found',
    }
  }

  // Check if share is active
  if (!isShareActive(share)) {
    return {
      share,
      hasAccess: false,
      reason: share.status === 'expired' ? 'Share link has expired' : 'Share link has been revoked',
    }
  }

  // Check password if required
  if (share.visibility === 'password-protected' && share.password) {
    if (!password) {
      return {
        share,
        hasAccess: false,
        reason: 'Password required',
      }
    }

    // Use Web Crypto API to hash password
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    if (passwordHash !== share.password) {
      return {
        share,
        hasAccess: false,
        reason: 'Invalid password',
      }
    }
  }

  // Update access count and last accessed
  await updateShareLink(share.id, {
    accessCount: share.accessCount + 1,
    lastAccessed: Date.now(),
  })

  return {
    share,
    hasAccess: true,
  }
}

/**
 * Generate share URL
 */
export function generateShareUrl(shareId: string, baseUrl: string = window.location.origin): string {
  return `${baseUrl}/share/${shareId}`
}

/**
 * Validate share permissions
 */
export function validateSharePermissions(
  share: ShareLink,
  action: 'view' | 'edit' | 'comment' | 'share' | 'download' | 'delete'
): boolean {
  switch (action) {
    case 'view':
      return share.permissions.canView
    case 'edit':
      return share.permissions.canEdit
    case 'comment':
      return share.permissions.canComment
    case 'share':
      return share.permissions.canShare
    case 'download':
      return share.permissions.canDownload
    case 'delete':
      return share.permissions.canDelete
    default:
      return false
  }
}

// ============================================================================
// ACCESS REQUESTS
// ============================================================================

/**
 * Create access request
 */
export async function createAccessRequest(
  shareId: string,
  requesterName: string,
  requesterEmail: string,
  message?: string
): Promise<ShareAccessRequest> {
  if (!shareId?.trim() || !requesterName?.trim() || !requesterEmail?.trim()) {
    throw new ValidationError('Missing required fields', {
      field: 'accessRequest',
    })
  }

  const database = await getDB()
  const now = Date.now()

  const request: ShareAccessRequest = {
    id: `request_${now}_${Math.random().toString(36).substring(2, 11)}`,
    shareId,
    requesterName,
    requesterEmail,
    message,
    status: 'pending',
    requestedAt: now,
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_REQUESTS], 'readwrite')
    const store = transaction.objectStore(STORE_REQUESTS)
    const req = store.add(request)

    req.onsuccess = () => resolve(request)
    req.onerror = () => reject(new StorageError('Failed to create access request', {
      technicalDetails: req.error?.message,
      cause: req.error || undefined,
    }))
  })
}

/**
 * Get pending access requests for a share
 */
export async function getAccessRequests(shareId: string): Promise<ShareAccessRequest[]> {
  if (!shareId?.trim()) {
    throw new ValidationError('Share ID cannot be empty', {
      field: 'shareId',
      value: shareId,
    })
  }

  const database = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_REQUESTS], 'readonly')
    const index = transaction.objectStore(STORE_REQUESTS).index('shareId')
    const request = index.getAll(shareId)

    request.onsuccess = () => {
      const requests = (request.result || []) as ShareAccessRequest[]
      resolve(requests.filter(r => r.status === 'pending'))
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Process access request
 */
export async function processAccessRequest(
  requestId: string,
  action: 'approve' | 'deny'
): Promise<ShareAccessRequest> {
  const database = await getDB()

  // Get the request
  const existing = await new Promise<ShareAccessRequest | null>((resolve, reject) => {
    const transaction = database.transaction([STORE_REQUESTS], 'readonly')
    const store = transaction.objectStore(STORE_REQUESTS)
    const request = store.get(requestId)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })

  if (!existing) {
    throw new NotFoundError('access request', requestId)
  }

  const updated: ShareAccessRequest = {
    ...existing,
    status: action === 'approve' ? 'approved' : 'denied',
    processedAt: Date.now(),
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_REQUESTS], 'readwrite')
    const store = transaction.objectStore(STORE_REQUESTS)
    const request = store.put(updated)

    request.onsuccess = () => resolve(updated)
    request.onerror = () => reject(new StorageError('Failed to process access request', {
      technicalDetails: request.error?.message,
      cause: request.error || undefined,
    }))
  })
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clean up expired share links
 */
export async function cleanupExpiredShares(): Promise<number> {
  const database = await getDB()
  const now = Date.now()
  let cleaned = 0

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_SHARES], 'readwrite')
    const store = transaction.objectStore(STORE_SHARES)
    const index = store.index('expiresAt')
    const request = index.openCursor(IDBKeyRange.upperBound(now))

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result

      if (cursor) {
        const share = cursor.value as ShareLink
        if (share.expiresAt && share.expiresAt < now && share.status === 'active') {
          share.status = 'expired'
          cursor.update(share)
          cleaned++
        }
        cursor.continue()
      } else {
        resolve(cleaned)
      }
    }

    request.onerror = () => reject(request.error)
  })
}

/**
 * Get share statistics
 */
export async function getShareStatistics(resourceId: string): Promise<{
  totalShares: number
  activeShares: number
  totalAccessCount: number
  pendingRequests: number
}> {
  const shares = await listShareLinks(resourceId)
  const active = shares.filter(s => isShareActive(s))

  let totalAccessCount = 0
  let pendingRequests = 0

  for (const share of shares) {
    totalAccessCount += share.accessCount
    const requests = await getAccessRequests(share.id)
    pendingRequests += requests.length
  }

  return {
    totalShares: shares.length,
    activeShares: active.length,
    totalAccessCount,
    pendingRequests,
  }
}
