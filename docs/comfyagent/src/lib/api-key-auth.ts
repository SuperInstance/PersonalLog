/**
 * API Key Authentication System
 *
 * Provides secure API key generation, validation, and management
 * Supports multiple API keys per user with permissions and rate limiting
 */

import { db } from '@/lib/db';
import { logger, logSecurityEvent } from '@/lib/logger';
import { generateApiKey as generateSecureKey, compareApiKey as hashAndCompare } from '@/lib/validation';

/**
 * API Key types and permissions
 */
export enum APIKeyType {
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
  ADMIN = 'admin'
}

export enum APIKeyPermission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin',
  UPLOAD = 'upload',
  TRANSCRIBE = 'transcribe'
}

/**
 * API Key model interface
 */
export interface APIKey {
  id: string;
  userId?: string;
  name: string;
  keyHash: string;
  keyPrefix: string; // First 8 characters for identification
  type: APIKeyType;
  permissions: APIKeyPermission[];
  rateLimit: number; // Requests per minute
  expiresIn?: Date;
  lastUsedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  metadata?: Record<string, any>;
}

/**
 * API Key creation request
 */
export interface CreateAPIKeyRequest {
  name: string;
  type: APIKeyType;
  permissions: APIKeyPermission[];
  rateLimit?: number;
  expiresAt?: Date | number;
  metadata?: Record<string, any>;
}

/**
 * Generate secure API key
 * Format: prefix_key_randomString (e.g., sk_live_abc123def456)
 */
function generateAPIKey(type: APIKeyType): { prefix: string; key: string } {
  const prefixes: Record<APIKeyType, string> = {
    [APIKeyType.BASIC]: 'sk_basic',
    [APIKeyType.PREMIUM]: 'sk_premium',
    [APIKeyType.ENTERPRISE]: 'sk_enterprise',
    [APIKeyType.ADMIN]: 'sk_admin'
  };

  const prefix = prefixes[type];
  const randomString = Math.random().toString(36).substring(2, 15) +
                     Math.random().toString(36).substring(2, 15);
  const key = `${prefix}_${randomString}`;

  return { prefix, key };
}

/**
 * Create API key for user
 */
export async function createAPIKey(
  userId: string | undefined,
  request: CreateAPIKeyRequest
): Promise<APIKey> {
  const { prefix, key } = generateAPIKey(request.type);

  // Hash the API key for secure storage
  const keyHash = generateSecureKey(key);

  const apiKey = await db.apiKey.create({
    data: {
      userId,
      name: request.name,
      keyHash,
      keyPrefix: prefix,
      type: request.type,
      permissions: request.permissions,
      rateLimit: request.rateLimit || getDefaultRateLimit(request.type),
      expiresIn: request.expiresAt ? new Date(request.expiresAt) : undefined,
      isActive: true,
      createdAt: new Date(),
      metadata: request.metadata || {}
    }
  });

  logger.info(`API key created for user: ${userId}`, {
    keyId: apiKey.id,
    name: request.name,
    type: request.type
  });

  // Return the plain text key only once (this is the only time it's shown)
  return {
    ...apiKey,
    key: `${prefix}_${keyHash.substring(0, 8)}` // Masked for display
  };
}

/**
 * Validate API key from request
 */
export async function validateAPIKey(
  apiKey: string,
  requiredPermissions?: APIKeyPermission[]
): Promise<{ isValid: boolean; apiKey?: APIKey; error?: string }> {
  if (!apiKey) {
    return {
      isValid: false,
      error: 'API key is required'
    };
  }

  // Extract key prefix and hash
  const parts = apiKey.split('_');
  if (parts.length !== 3) {
    logSecurityEvent('Invalid API key format', {
      keyFormat: `${parts.length} parts (expected 3)`
    });
    return {
      isValid: false,
      error: 'Invalid API key format'
    };
  }

  const prefix = parts.slice(0, 2).join('_'); // sk_live or sk_test
  const keyHash = parts[2]; // Last part is the hash

  // Find API key in database
  const dbKey = await db.apiKey.findFirst({
    where: {
      keyPrefix: prefix,
      keyHash: keyHash,
      isActive: true
    }
  });

  if (!dbKey) {
    logSecurityEvent('Invalid or inactive API key', {
      prefix,
      hash: keyHash.substring(0, 8) + '...'
    });
    return {
      isValid: false,
      error: 'Invalid or inactive API key'
    };
  }

  // Check if API key has expired
  if (dbKey.expiresIn && dbKey.expiresIn < new Date()) {
    logSecurityEvent('Expired API key used', {
      keyId: dbKey.id,
      expiredAt: dbKey.expiresIn
    });
    return {
      isValid: false,
      error: 'API key has expired'
    };
  }

  // Check if API key has required permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission =>
      dbKey.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      logSecurityEvent('API key lacks required permissions', {
        keyId: dbKey.id,
        requiredPermissions,
        actualPermissions: dbKey.permissions
      });
      return {
        isValid: false,
        error: 'API key lacks required permissions',
        apiKey: dbKey
      };
    }
  }

  // Update last used timestamp
  await db.apiKey.update({
    where: { id: dbKey.id },
    data: { lastUsedAt: new Date() }
  });

  return {
    isValid: true,
    apiKey: dbKey
  };
}

/**
 * Check API key permissions
 */
export function hasPermission(apiKey: APIKey, permission: APIKeyPermission): boolean {
  return apiKey.permissions.includes(permission);
}

/**
 * Check if API key has multiple permissions (all required)
 */
export function hasAllPermissions(apiKey: APIKey, permissions: APIKeyPermission[]): boolean {
  return permissions.every(permission => apiKey.permissions.includes(permission));
}

/**
 * Get default rate limit based on API key type
 */
function getDefaultRateLimit(type: APIKeyType): number {
  const limits: Record<APIKeyType, number> = {
    [APIKeyType.BASIC]: 100,        // 100 requests/minute
    [APIKeyType.PREMIUM]: 500,     // 500 requests/minute
    [APIKeyType.ENTERPRISE]: 1000,  // 1000 requests/minute
    [APIKeyType.ADMIN]: 2000       // 2000 requests/minute
  };

  return limits[type];
}

/**
 * Get API key rate limit
 */
export async function getAPIKeyRateLimit(apiKey: APIKey): Promise<number> {
  return apiKey.rateLimit;
}

/**
 * Check if API key is rate limited
 */
export async function checkAPIKeyRateLimit(
  apiKeyId: string,
  requests: Map<string, number[]>,
  windowMs: number = 60000 // 1 minute
): Promise<{ allowed: boolean; resetTime: number; currentCount: number }> {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get recent requests for this API key
  const keyRequests = requests.get(apiKeyId) || [];
  const recentRequests = keyRequests.filter(timestamp => timestamp > windowStart);

  const currentCount = recentRequests.length;
  const rateLimit = await db.apiKey.findUnique({
    where: { id: apiKeyId },
    select: { rateLimit: true }
  });

  if (!rateLimit) {
    return {
      allowed: true,
      resetTime: now + windowMs,
      currentCount
    };
  }

  const limit = rateLimit.rateLimit;
  const allowed = currentCount < limit;

  return {
    allowed,
    resetTime: now + windowMs,
    currentCount
  };
}

/**
 * Log API key request (for rate limiting)
 */
export function logAPIKeyRequest(
  apiKeyId: string,
  requests: Map<string, number[]>
): void {
  const now = Date.now();
  const keyRequests = requests.get(apiKeyId) || [];

  keyRequests.push(now);

  // Clean old requests (older than 1 minute)
  const oneMinuteAgo = now - 60000;
  const recentRequests = keyRequests.filter(timestamp => timestamp > oneMinuteAgo);

  requests.set(apiKeyId, recentRequests);
}

/**
 * Revoke API key
 */
export async function revokeAPIKey(
  apiKeyId: string,
  userId: string | undefined
): Promise<boolean> {
  try {
    const apiKey = await db.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId,
        isActive: true
      }
    });

    if (!apiKey) {
      return false;
    }

    // Mark as inactive instead of deleting (audit trail)
    await db.apiKey.update({
      where: { id: apiKeyId },
      data: {
        isActive: false,
        metadata: {
          ...apiKey.metadata,
          revokedAt: new Date().toISOString()
        }
      }
    });

    logger.info(`API key revoked: ${apiKeyId}`, {
      userId,
      revokedAt: new Date()
    });

    return true;
  } catch (error) {
    logger.error(`Failed to revoke API key: ${apiKeyId}`, error);
    return false;
  }
}

/**
 * List all API keys for user
 */
export async function listAPIKeys(
  userId: string | undefined,
  options: {
    includeInactive?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<APIKey[]> {
  const where: any = {
    isActive: true
  };

  if (userId) {
    where.userId = userId;
  }

  if (!options.includeInactive) {
    where.isActive = true;
  }

  const apiKeys = await db.apiKey.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options.limit || undefined,
    skip: options.offset || undefined
  });

  return apiKeys;
}

/**
 * Get API key details
 */
export async function getAPIKeyDetails(
  apiKeyId: string,
  userId: string | undefined
): Promise<APIKey | null> {
  const apiKey = await db.apiKey.findFirst({
    where: {
      id: apiKeyId,
      userId,
      isActive: true
    }
  });

  return apiKey;
}

/**
 * Update API key metadata
 */
export async function updateAPIKey(
  apiKeyId: string,
  userId: string | undefined,
  updates: {
    name?: string;
    permissions?: APIKeyPermission[];
    rateLimit?: number;
    expiresAt?: Date | number;
    metadata?: Record<string, any>;
  }
): Promise<APIKey | null> {
  try {
    const updateData: any = {};

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (updates.permissions !== undefined) {
      updateData.permissions = updates.permissions;
    }

    if (updates.rateLimit !== undefined) {
      updateData.rateLimit = updates.rateLimit;
    }

    if (updates.expiresAt !== undefined) {
      updateData.expiresIn = new Date(updates.expiresAt);
    }

    if (updates.metadata !== undefined) {
      updateData.metadata = updates.metadata;
    }

    const apiKey = await db.apiKey.update({
      where: {
        id: apiKeyId,
        userId,
        isActive: true
      },
      data: updateData
    });

    logger.info(`API key updated: ${apiKeyId}`, {
      userId,
      updates
    });

    return apiKey;
  } catch (error) {
    logger.error(`Failed to update API key: ${apiKeyId}`, error);
    return null;
  }
}

/**
 * Delete API key permanently
 */
export async function deleteAPIKey(
  apiKeyId: string,
  userId: string | undefined
): Promise<boolean> {
  try {
    const apiKey = await db.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId
      }
    });

    if (!apiKey) {
      return false;
    }

    await db.apiKey.delete({
      where: { id: apiKeyId }
    });

    logger.info(`API key deleted: ${apiKeyId}`, {
      userId,
      name: apiKey.name
    });

    return true;
  } catch (error) {
    logger.error(`Failed to delete API key: ${apiKeyId}`, error);
    return false;
  }
}

/**
 * Get API key statistics
 */
export async function getAPIKeyStatistics(userId?: string): Promise<{
  totalKeys: number;
  activeKeys: number;
  expiredKeys: number;
  byType: Record<APIKeyType, number>;
}> {
  const where: any = {};

  if (userId) {
    where.userId = userId;
  }

  const apiKeys = await db.apiKey.findMany({
    where,
    select: {
      isActive: true,
      type: true,
      expiresIn: true
    }
  });

  const stats = {
    totalKeys: apiKeys.length,
    activeKeys: 0,
    expiredKeys: 0,
    byType: {
      [APIKeyType.BASIC]: 0,
      [APIKeyType.PREMIUM]: 0,
      [APIKeyType.ENTERPRISE]: 0,
      [APIKeyType.ADMIN]: 0
    }
  };

  for (const key of apiKeys) {
    if (key.isActive) {
      stats.activeKeys++;
    }

    if (key.expiresIn && key.expiresIn < new Date()) {
      stats.expiredKeys++;
    }

    stats.byType[key.type]++;
  }

  return stats;
}

/**
 * Clean up expired API keys
 */
export async function cleanupExpiredAPIKeys(): Promise<number> {
  const now = new Date();

  const expiredKeys = await db.apiKey.findMany({
    where: {
      isActive: true,
      expiresIn: { lt: now }
    },
    select: { id: true }
  });

  if (expiredKeys.length === 0) {
    return 0;
  }

  // Mark expired keys as inactive
  for (const key of expiredKeys) {
    await db.apiKey.update({
      where: { id: key.id },
      data: { isActive: false }
    });
  }

  logger.info(`Cleaned up ${expiredKeys.length} expired API keys`, {
    cleanedCount: expiredKeys.length
  });

  return expiredKeys.length;
}

export default {
  createAPIKey,
  validateAPIKey,
  hasPermission,
  hasAllPermissions,
  getAPIKeyRateLimit,
  checkAPIKeyRateLimit,
  logAPIKeyRequest,
  revokeAPIKey,
  listAPIKeys,
  getAPIKeyDetails,
  updateAPIKey,
  deleteAPIKey,
  getAPIKeyStatistics,
  cleanupExpiredAPIKeys
};
