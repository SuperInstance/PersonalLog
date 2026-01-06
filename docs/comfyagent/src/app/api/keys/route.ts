import { NextRequest, NextResponse } from 'next/server';
import {
  createAPIKey,
  listAPIKeys,
  getAPIKeyDetails,
  updateAPIKey,
  deleteAPIKey,
  getAPIKeyStatistics
} from '@/lib/api-key-auth';
import { logger, logApiRequest, logApiResponse, logApiError, logSecurityEvent } from '@/lib/logger';
import { generateRequestId, createErrorResponse, createValidationErrorResponse, createInternalErrorResponse } from '@/lib/api-middleware';

/**
 * API Key Management API
 *
 * Provides endpoints for creating, listing, updating, and revoking API keys
 * Supports multiple key types with different permission levels
 */

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const limit = searchParams.get('limit');

    logApiRequest('/api/keys', 'GET', {
      requestId,
      userId,
      includeInactive,
      limit
    });

    // In production, userId would come from authenticated session
    // For now, we'll allow listing without auth (for development)
    const apiKeys = await listAPIKeys(userId || undefined, {
      includeInactive,
      limit: limit ? parseInt(limit) : undefined
    });

    logApiResponse('/api/keys', 'GET', 200, Date.now() - startTime, {
      requestId,
      keyCount: apiKeys.length
    });

    const response = NextResponse.json({
      version: '1.0.0',
      data: {
        apiKeys: apiKeys.map(key => ({
          id: key.id,
          name: key.name,
          keyPrefix: key.keyPrefix,
          type: key.type,
          permissions: key.permissions ? JSON.parse(key.permissions) : [],
          rateLimit: key.rateLimit,
          isActive: key.isActive,
          expiresAt: key.expiresIn,
          createdAt: key.createdAt,
          lastUsedAt: key.lastUsedAt
        })),
        total: apiKeys.length
      },
      requestId
    });

    return response;
  } catch (error) {
    logApiError('/api/keys', 'GET', error);
    return createInternalErrorResponse('Failed to fetch API keys');
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const {
      name,
      type = 'BASIC',
      permissions = ['READ'],
      rateLimit,
      expiresAt,
      metadata
    } = await request.json();

    logApiRequest('/api/keys', 'POST', {
      requestId,
      name,
      type,
      permissions,
      rateLimit,
      expiresAt
    });

    // Validate request
    if (!name) {
      return createValidationErrorResponse('Name is required');
    }

    if (name.length < 3 || name.length > 100) {
      return createValidationErrorResponse('Name must be between 3 and 100 characters');
    }

    if (metadata && typeof metadata !== 'object') {
      return createValidationErrorResponse('Metadata must be an object');
    }

    // In production, userId would come from authenticated session
    const userId = undefined; // For now

    // Create API key
    const apiKey = await createAPIKey(userId, {
      name,
      type,
      permissions,
      rateLimit,
      expiresAt,
      metadata
    });

    logger.info(`API key created: ${apiKey.id}`, {
      requestId,
      keyId: apiKey.id,
      name: apiKey.name,
      type: apiKey.type
    });

    logApiResponse('/api/keys', 'POST', 201, Date.now() - startTime, {
      requestId,
      keyId: apiKey.id
    });

    const response = NextResponse.json({
      version: '1.0.0',
      data: {
        apiKey: {
          id: apiKey.id,
          key: apiKey.key, // Only returned once at creation
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          type: apiKey.type,
          permissions: apiKey.permissions ? JSON.parse(apiKey.permissions) : [],
          rateLimit: apiKey.rateLimit,
          isActive: apiKey.isActive,
          expiresAt: apiKey.expiresIn,
          createdAt: apiKey.createdAt
        },
        message: 'API key created successfully',
        warning: 'Please save this API key securely. It will not be shown again.'
      },
      requestId
    }, {
      status: 201,
      headers: {
        'X-Resource-ID': apiKey.id
      }
    });

    return response;
  } catch (error) {
    logApiError('/api/keys', 'POST', error);
    return createInternalErrorResponse('Failed to create API key');
  }
}
