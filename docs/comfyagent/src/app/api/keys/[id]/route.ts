import { NextRequest, NextResponse } from 'next/server';
import {
  getAPIKeyDetails,
  updateAPIKey,
  deleteAPIKey,
  revokeAPIKey
} from '@/lib/api-key-auth';
import { logger, logApiRequest, logApiResponse, logApiError } from '@/lib/logger';
import { generateRequestId, createErrorResponse, createValidationErrorResponse, createNotFoundResponse, createInternalErrorResponse } from '@/lib/api-middleware';

/**
 * Individual API Key Operations
 *
 * GET /api/keys/[id] - Get API key details
 * PUT /api/keys/[id] - Update API key
 * DELETE /api/keys/[id] - Delete API key
 */

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    logApiRequest(`/api/keys/${id}`, 'GET', {
      requestId,
      userId
    });

    // In production, userId would come from authenticated session
    // For now, we'll allow getting without auth (for development)

    const apiKey = await getAPIKeyDetails(id, userId || undefined);

    if (!apiKey) {
      return createNotFoundResponse('API key not found');
    }

    logApiResponse(`/api/keys/${id}`, 'GET', 200, Date.now() - startTime, {
      requestId,
      keyId: id
    });

    const response = NextResponse.json({
      version: '1.0.0',
      data: {
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          type: apiKey.type,
          permissions: apiKey.permissions ? JSON.parse(apiKey.permissions) : [],
          rateLimit: apiKey.rateLimit,
          isActive: apiKey.isActive,
          expiresAt: apiKey.expiresIn,
          createdAt: apiKey.createdAt,
          lastUsedAt: apiKey.lastUsedAt
        }
      },
      requestId
    });

    return response;
  } catch (error) {
    logApiError(`/api/keys/${id}`, 'GET', error);
    return createInternalErrorResponse('Failed to fetch API key');
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    const {
      name,
      permissions,
      rateLimit,
      expiresAt,
      metadata
    } = await request.json();

    logApiRequest(`/api/keys/${id}`, 'PUT', {
      requestId,
      userId,
      name,
      permissions,
      rateLimit
    });

    // In production, userId would come from authenticated session
    // For now, we'll allow updating without auth (for development)

    if (!name && !permissions && !rateLimit && !expiresAt) {
      return createValidationErrorResponse('At least one field must be provided to update');
    }

    const updated = await updateAPIKey(id, userId || undefined, {
      name,
      permissions,
      rateLimit,
      expiresAt,
      metadata
    });

    if (!updated) {
      return createNotFoundResponse('API key not found');
    }

    logger.info(`API key updated: ${id}`, {
      requestId,
      keyId: id,
      name,
      updatedBy: userId
    });

    logApiResponse(`/api/keys/${id}`, 'PUT', 200, Date.now() - startTime, {
      requestId,
      keyId: id
    });

    const response = NextResponse.json({
      version: '1.0.0',
      data: {
        apiKey: {
          id: updated.id,
          name: updated.name,
          keyPrefix: updated.keyPrefix,
          type: updated.type,
          permissions: updated.permissions ? JSON.parse(updated.permissions) : [],
          rateLimit: updated.rateLimit,
          isActive: updated.isActive,
          expiresAt: updated.expiresIn,
          createdAt: updated.createdAt,
          lastUsedAt: updated.lastUsedAt
        },
        message: 'API key updated successfully'
      },
      requestId
    });

    return response;
  } catch (error) {
    logApiError(`/api/keys/${id}`, 'PUT', error);
    return createInternalErrorResponse('Failed to update API key');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    logApiRequest(`/api/keys/${id}`, 'DELETE', {
      requestId,
      userId
    });

    // In production, userId would come from authenticated session
    // For now, we'll allow deleting without auth (for development)

    const success = await deleteAPIKey(id, userId || undefined);

    if (!success) {
      return createNotFoundResponse('API key not found');
    }

    logger.info(`API key deleted: ${id}`, {
      requestId,
      keyId: id,
      deletedBy: userId
    });

    logApiResponse(`/api/keys/${id}`, 'DELETE', 200, Date.now() - startTime, {
      requestId,
      keyId: id
    });

    const response = NextResponse.json({
      version: '1.0.0',
      data: {
        success: true,
        message: 'API key deleted successfully'
      },
      requestId
    });

    return response;
  } catch (error) {
    logApiError(`/api/keys/${id}`, 'DELETE', error);
    return createInternalErrorResponse('Failed to delete API key');
  }
}
