/**
 * API Key Authentication Middleware
 *
 * Validates API keys for protected endpoints
 * Supports rate limiting per API key
 * Provides authentication context to route handlers
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateAPIKey,
  hasPermission,
  hasAllPermissions,
  checkAPIKeyRateLimit,
  logAPIKeyRequest
} from '@/lib/api-key-auth';
import { logger, logSecurityEvent } from '@/lib/logger';
import { generateRequestId, createUnauthorizedResponse, createRateLimitResponse } from '@/lib/api-middleware';

/**
 * Authentication Context
 */
export interface AuthContext {
  apiKey: {
    id: string;
    name: string;
    keyPrefix: string;
    type: string;
    permissions: string[];
    rateLimit: number;
    userId?: string;
  };
  requestId: string;
}

/**
 * Authentication Result
 */
interface AuthResult {
  isAuthenticated: boolean;
  apiKey?: any;
  error?: string;
  authContext?: AuthContext;
}

/**
 * Validate API key from request
 */
export async function authenticateRequest(
  request: NextRequest,
  requiredPermissions?: string[]
): Promise<AuthResult> {
  const requestId = generateRequestId();
  const apiKeyHeader = request.headers.get('X-API-Key');

  if (!apiKeyHeader) {
    logSecurityEvent('Missing API key', {
      requestId,
      endpoint: request.nextUrl.pathname,
      method: request.method
    });
    return {
      isAuthenticated: false,
      error: 'API key is required'
    };
  }

  // Validate API key
  const { isValid, apiKey, error } = await validateAPIKey(apiKeyHeader, requiredPermissions);

  if (!isValid) {
    logSecurityEvent('Invalid API key', {
      requestId,
      error,
      endpoint: request.nextUrl.pathname,
      method: request.method
    });
    return {
      isAuthenticated: false,
      error: error || 'Invalid API key'
    };
  }

  // Check rate limit for this API key
  if (apiKey) {
    const { allowed, resetTime, currentCount } = await checkAPIKeyRateLimit(apiKey.id);
    logAPIKeyRequest(apiKey.id);

    if (!allowed) {
      logSecurityEvent('API key rate limit exceeded', {
        requestId,
        apiKeyId: apiKey.id,
        currentCount,
        resetTime: new Date(resetTime).toISOString()
      });
      return {
        isAuthenticated: false,
        error: 'Rate limit exceeded',
        authContext: {
          apiKey,
          requestId,
          rateLimit: {
            allowed: false,
            resetTime: new Date(resetTime),
            currentCount
          }
        }
      };
    }
  }

  // Return successful authentication
  return {
    isAuthenticated: true,
    apiKey,
    authContext: {
      apiKey,
      requestId
    }
  };
}

/**
 * Require authentication (throws error if not authenticated)
 */
export async function requireAuth(
  request: NextRequest,
  requiredPermissions?: string[]
): Promise<AuthContext> {
  const authResult = await authenticateRequest(request, requiredPermissions);

  if (!authResult.isAuthenticated || !authResult.authContext) {
    throw new Error(authResult.error || 'Authentication failed');
  }

  return authResult.authContext;
}

/**
 * Check if user has specific permission
 */
export function hasPermissionByContext(authContext: AuthContext, permission: string): boolean {
  return authContext.apiKey.permissions.includes(permission);
}

/**
 * Create unauthorized response
 */
export function createAuthErrorResponse(error?: string): NextResponse {
  return NextResponse.json({
    version: '1.0.0',
    error: {
      message: error || 'Authentication failed',
      code: 'UNAUTHORIZED'
    }
  }, {
    status: 401,
    headers: {
      'X-Request-ID': generateRequestId()
    }
  });
}

/**
 * Create forbidden response (user doesn't have permission)
 */
export function createForbiddenResponse(requiredPermission: string): NextResponse {
  return NextResponse.json({
    version: '1.0.0',
    error: {
      message: `Insufficient permissions. Required: ${requiredPermission}`,
      code: 'FORBIDDEN'
    }
  }, {
    status: 403,
    headers: {
      'X-Request-ID': generateRequestId()
    }
  });
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitExceededResponse(resetTime: number): NextResponse {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

  return NextResponse.json({
    version: '1.0.0',
    error: {
      message: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    retryAfter: new Date(resetTime).toISOString()
  }, {
    status: 429,
    headers: {
      'Retry-After': retryAfter.toString(),
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': resetTime.toString(),
      'X-Request-ID': generateRequestId()
    }
  });
}

/**
 * Authentication wrapper for route handlers
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, authContext: AuthContext) => Promise<NextResponse>,
  options?: {
    requiredPermissions?: string[];
    optional?: boolean; // If true, doesn't throw error on auth failure
  } = {}
): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(request, options.requiredPermissions);

    if (!authResult.isAuthenticated || !authResult.authContext) {
      if (options.optional) {
        return handler(request, {
          apiKey: null,
          requestId: generateRequestId()
        } as AuthContext);
      }

      return createAuthErrorResponse(authResult.error);
    }

    return handler(request, authResult.authContext);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Authentication failed')) {
      return createAuthErrorResponse(error.message);
    }

    logger.error('Authentication error', error);
    return NextResponse.json({
      version: '1.0.0',
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }
    }, {
      status: 500,
      headers: {
        'X-Request-ID': generateRequestId()
      }
    });
  }
}

/**
 * Require specific permission
 */
export function requirePermission(
  authContext: AuthContext,
  requiredPermission: string
): AuthContext {
  if (!hasPermissionByContext(authContext, requiredPermission)) {
    throw new Error(`Forbidden: Requires ${requiredPermission} permission`);
  }

  return authContext;
}

/**
 * Require all specified permissions
 */
export function requireAllPermissions(
  authContext: AuthContext,
  requiredPermissions: string[]
): AuthContext {
  const hasAll = requiredPermissions.every(perm =>
    hasPermissionByContext(authContext, perm)
  );

  if (!hasAll) {
    throw new Error(`Forbidden: Requires ${requiredPermissions.join(', ')} permissions`);
  }

  return authContext;
}

/**
 * Check if request is from public endpoint (no auth required)
 */
export function isPublicEndpoint(pathname: string): boolean {
  const publicEndpoints = [
    '/api/health',
    '/api/docs',
    '/api/openapi.json'
  ];

  return publicEndpoints.some(endpoint => pathname.startsWith(endpoint));
}

/**
 * Extract auth context from request (if already authenticated)
 */
export function extractAuthContext(request: NextRequest): AuthContext | null {
  const authHeader = request.headers.get('X-Auth-Context');

  if (!authHeader) {
    return null;
  }

  try {
    const authContext = JSON.parse(authHeader);
    return authContext;
  } catch {
    return null;
  }
}

/**
 * Add auth context to request headers (for internal use)
 */
export function addAuthContextToRequest(request: Request, authContext: AuthContext): Request {
  const modified = new Request(request);

  modified.headers.set('X-Auth-Context', JSON.stringify(authContext));

  return modified;
}

/**
 * Rate limiting middleware specifically for API keys
 */
export async function withAPIKeyRateLimit(
  request: NextRequest,
  handler: (request: NextRequest, authContext: AuthContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = generateRequestId();

  // First authenticate
  const authResult = await authenticateRequest(request);

  if (!authResult.isAuthenticated || !authResult.authContext) {
    return createAuthErrorResponse(authResult.error);
  }

  const { apiKey, rateLimit } = authResult.authContext;

  // Check if rate limit check was already done in authentication
  if ((authResult.authContext as any).rateLimit) {
    return handler(request, authResult.authContext);
  }

  return handler(request, authResult.authContext);
}

export default {
  authenticateRequest,
  requireAuth,
  hasPermissionByContext,
  requirePermission,
  requireAllPermissions,
  createAuthErrorResponse,
  createForbiddenResponse,
  createRateLimitExceededResponse,
  withAuth,
  withAPIKeyRateLimit,
  isPublicEndpoint,
  extractAuthContext,
  addAuthContextToRequest
};
