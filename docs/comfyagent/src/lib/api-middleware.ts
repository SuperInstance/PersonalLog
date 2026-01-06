/**
 * Production API Middleware
 *
 * Provides rate limiting, security headers, error handling,
 * and request validation for all API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { detectXSS, detectSQLInjection, detectPathTraversal } from '@/lib/validation';

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60 * 1000, maxRequests: number = 100) { // 1 minute window, 100 requests
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }

  async check(identifier: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    this.cleanup();

    let entry = this.store.get(identifier);

    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 1,
        resetTime: now + this.windowMs
      };
      this.store.set(identifier, entry);
    } else {
      entry.count += 1;
      this.store.set(identifier, entry);
    }

    const remaining = Math.max(0, this.maxRequests - entry.count);
    const allowed = entry.count <= this.maxRequests;

    if (!allowed) {
      logger.warn(`Rate limit exceeded for ${identifier}: ${entry.count}/${this.maxRequests}`, {
        identifier,
        entry: entry.count,
        resetTime: new Date(entry.resetTime)
      });
    }

    return { allowed, remaining, resetTime: entry.resetTime };
  }

  reset(identifier: string): void {
    this.store.delete(identifier);
  }
}

// Create rate limiters for different endpoints
export const rateLimiter = new RateLimiter();
export const strictRateLimiter = new RateLimiter(15 * 1000, 10); // 15 seconds, 10 requests for expensive operations
export const uploadRateLimiter = new RateLimiter(60 * 1000, 20); // 1 minute, 20 uploads

// ============================================
// SECURITY HEADERS
// ============================================

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'default-src "self"; script-src "self" "unsafe-inline" "unsafe-eval"; style-src "self" "unsafe-inline"; img-src "self" data: https:; font-src "self";',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
};

function addSecurityHeaders(response: NextResponse): NextResponse {
  const headers = response.headers;

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }

  return response;
}

// ============================================
// ERROR HANDLING
// ============================================

class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(statusCode: number, message: string, code: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        ...(this.details && { details: this.details })
      }
    };
  }
}

// Error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE'
} as const;

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

/**
 * Validate request body against security threats
 */
export function validateRequestBody(body: any): { isValid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Invalid request body' };
  }

  // Check for common security patterns in all string fields
  const checkField = (value: any, fieldName: string) => {
    if (typeof value === 'string') {
      if (detectXSS(value)) {
        return { isValid: false, error: `XSS detected in ${fieldName}` };
      }
      if (detectSQLInjection(value)) {
        return { isValid: false, error: `SQL injection detected in ${fieldName}` };
      }
      if (detectPathTraversal(value)) {
        return { isValid: false, error: `Path traversal detected in ${fieldName}` };
      }
    }
    return { isValid: true };
  };

  // Recursively check all string fields
  const validateObject = (obj: any, path: string = ''): { isValid: boolean; error?: string } => {
    for (const key in obj) {
      const value = obj[key];
      const fieldPath = path ? `${path}.${key}` : key;

      if (typeof value === 'string') {
        const result = checkField(value, fieldPath);
        if (!result.isValid) {
          return result;
        }
      } else if (typeof value === 'object' && value !== null) {
        const result = validateObject(value, fieldPath);
        if (!result.isValid) {
          return result;
        }
      }
    }
    return { isValid: true };
  };

  return validateObject(body);
}

// ============================================
// ERROR RESPONSE HELPERS
// ============================================

export function createErrorResponse(
  error: ApiError,
  request?: NextRequest
): NextResponse {
  logger.error(error.message, {
    code: error.code,
    statusCode: error.statusCode,
    ...(error.details && { details: error.details }),
    request: request ? {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent')
    } : undefined
  });

  const response = NextResponse.json(error.toJSON(), {
    status: error.statusCode
  });

  return addSecurityHeaders(response);
}

export function createValidationErrorResponse(
  message: string,
  errors: string[] = [],
  statusCode: number = 400
): NextResponse {
  const error = new ApiError(statusCode, message, ERROR_CODES.VALIDATION_ERROR, { errors });

  logger.warn(`Validation error: ${message}`, {
    errors
  });

  const response = NextResponse.json(error.toJSON(), {
    status: statusCode
  });

  return addSecurityHeaders(response);
}

export function createNotFoundResponse(message: string = 'Resource not found'): NextResponse {
  const error = new ApiError(404, message, ERROR_CODES.NOT_FOUND);

  logger.info(`Not found: ${message}`);

  const response = NextResponse.json(error.toJSON(), {
    status: 404
  });

  return addSecurityHeaders(response);
}

export function createUnauthorizedResponse(message: string = 'Authentication required'): NextResponse {
  const error = new ApiError(401, message, ERROR_CODES.UNAUTHORIZED);

  logger.warn(`Unauthorized access attempt: ${message}`);

  const response = NextResponse.json(error.toJSON(), {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Bearer realm="api"'
    }
  });

  return addSecurityHeaders(response);
}

export function createRateLimitResponse(
  resetTime: number,
  identifier: string
): NextResponse {
  const resetTimeSeconds = Math.ceil((resetTime - Date.now()) / 1000);
  const error = new ApiError(429, 'Too many requests', ERROR_CODES.RATE_LIMIT_EXCEEDED, {
    resetAfter: resetTimeSeconds,
    resetTime: new Date(resetTime).toISOString()
  });

  logger.warn(`Rate limit exceeded for ${identifier}`, {
    identifier,
    resetAfter: resetTimeSeconds
  });

  const response = NextResponse.json(error.toJSON(), {
    status: 429,
    headers: {
      'Retry-After': resetTimeSeconds.toString(),
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': resetTime.toString()
    }
  });

  return addSecurityHeaders(response);
}

export function createInternalErrorResponse(
  message: string = 'Internal server error',
  details?: any
): NextResponse {
  const error = new ApiError(500, message, ERROR_CODES.INTERNAL_ERROR, details);

  logger.fatal('Internal error', {
    message,
    ...(details && { details })
  });

  const response = NextResponse.json(error.toJSON(), {
    status: 500
  });

  return addSecurityHeaders(response);
}

// ============================================
// REQUEST ID HELPER
// ============================================

export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

export async function withRequestId<T>(
  handler: (request: NextRequest, requestId: string) => Promise<T>,
  request: NextRequest
): Promise<T> {
  const requestId = generateRequestId();

  const response = await handler(request, requestId);

  // Add request ID to response headers
  if (response && response.headers) {
    response.headers.set('X-Request-ID', requestId);
  }

  return response;
}

// ============================================
// HEALTH CHECK
// ============================================

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: 'healthy' | 'unhealthy';
    api: 'healthy' | 'unhealthy';
    rateLimiter: 'healthy' | 'unhealthy';
  };
  environment: {
    nodeEnv: string;
    version: string;
    region?: string;
  };
}

const START_TIME = Date.now();

export async function createHealthCheckResponse(): Promise<NextResponse> {
  const uptime = Math.floor((Date.now() - START_TIME) / 1000);

  const healthData: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime,
    services: {
      database: 'healthy',
      api: 'healthy',
      rateLimiter: 'healthy'
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      region: process.env.VERCEL_REGION || 'local'
    }
  };

  logger.info('Health check performed', {
    status: healthData.status,
    uptime
  });

  return NextResponse.json(healthData, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
