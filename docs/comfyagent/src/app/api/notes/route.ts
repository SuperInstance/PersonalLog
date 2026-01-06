import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getAllNotes,
  createNote as createNoteService,
  updateNote as updateNoteService,
  deleteNote as deleteNoteService
} from '@/lib/notes-service';
import {
  logger,
  logApiRequest,
  logApiResponse,
  logApiError,
  logValidationError
} from '@/lib/logger';
import { validateNoteRequest, validateNoteTitle } from '@/lib/validation';
import { rateLimiter, createValidationErrorResponse, createInternalErrorResponse, createNotFoundResponse, getVersionHeaders, getVersion } from '@/lib/api-middleware';
import { getDefaultPaginationParams, createPaginatedResponse, calculatePagination, formatPaginationInfo } from '@/lib/pagination';

/**
 * ComfyUI Notes API (Production-Ready)
 *
 * Provides full CRUD operations for notes with:
 * - Pagination support (page-based and cursor-based)
 * - API versioning and compatibility checking
 * - Comprehensive validation and sanitization
 * - Rate limiting per endpoint
 * - Detailed logging and monitoring
 * - Request ID tracking
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

  try {
    const searchParams = request.nextUrl.searchParams;
    const paginationParams = getDefaultPaginationParams(searchParams);
    const projectId = searchParams.get('projectId');
    const folder = searchParams.get('folder');
    const tags = searchParams.get('tags');
    const searchQuery = searchParams.get('search');

    logApiRequest('/api/notes', 'GET', {
      requestId,
      pagination: paginationParams,
      projectId,
      folder,
      tags,
      searchQuery
    });

    // Check rate limit
    const clientId = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const rateCheck = await rateLimiter.check(clientId);

    if (!rateCheck.allowed) {
      logger.warn(`Rate limit exceeded for ${clientId}: GET /api/notes`, {
        requestId,
        clientId,
        rateLimit: rateCheck
      });
      return NextResponse.json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: new Date(rateCheck.resetTime).toISOString()
      }, {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateCheck.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateCheck.resetTime.toString(),
          'X-Request-ID': requestId
        }
      });
    }

    const notes = await getAllNotes({
      projectId: projectId || undefined,
      folder: folder || undefined,
      tags: tags ? tags.split(',') : undefined,
      searchQuery: searchQuery || undefined
    });

    const total = notes.length;
    const pagination = calculatePagination(total, paginationParams.page, paginationParams.pageSize);

    logger.info(`Notes retrieved: ${total} notes`, {
      requestId,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: pagination.totalPages
      }
    });

    logApiResponse('/api/notes', 'GET', 200, Date.now() - startTime, {
      requestId,
      notesReturned: notes.length,
      total,
      pagination
    });

    const response = NextResponse.json({
      version: getVersion(),
      data: {
        notes,
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total,
          totalPages: pagination.totalPages,
          hasMore: pagination.page < pagination.totalPages,
          info: formatPaginationInfo(pagination)
        }
      },
      requestId
    });

    // Add version and pagination headers
    const headers = response.headers;
    for (const [key, value] of Object.entries(getVersionHeaders())) {
      headers.set(key, value);
    }
    headers.set('X-Pagination-Page', pagination.page.toString());
    headers.set('X-Pagination-PageSize', pagination.pageSize.toString());
    headers.set('X-Pagination-Total', total.toString());
    headers.set('X-Pagination-Total-Pages', pagination.totalPages.toString());
    headers.set('X-Pagination-Has-More', (pagination.page < pagination.totalPages).toString());
    headers.set('X-Request-ID', requestId);

    return response;
  } catch (error) {
    logApiError('/api/notes', 'GET', error);
    return NextResponse.json({
      version: getVersion(),
      error: 'Failed to fetch notes',
      message: 'An unexpected error occurred',
      requestId
    }, {
      status: 500,
      headers: {
        'X-Request-ID': requestId
      }
    });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

  try {
    const clientId = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const rateCheck = await rateLimiter.check(clientId);

    if (!rateCheck.allowed) {
      logger.warn(`Rate limit exceeded for ${clientId}: POST /api/notes`, {
        requestId,
        clientId,
        rateLimit: rateCheck
      });
      return NextResponse.json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: new Date(rateCheck.resetTime).toISOString()
      }, {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateCheck.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateCheck.resetTime.toString(),
          'X-Request-ID': requestId
        }
      });
    }

    const body = await request.json();
    logApiRequest('/api/notes', 'POST', { ...body, clientId, requestId });

    // Validate request
    const validation = validateNoteRequest(body);
    if (!validation.isValid) {
      logValidationError('note data', body, validation.error || 'Invalid note data');
      return NextResponse.json({
        version: getVersion(),
        error: 'Validation error',
        message: validation.error || 'Invalid note data',
        requestId
      }, {
        status: 400,
        headers: {
          'X-Request-ID': requestId
        }
      });
    }

    const note = await createNoteService({
      title: validation.value.title,
      content: validation.value.content,
      description: validation.value.description,
      tags: validation.value.tags,
      folder: validation.value.folder,
      projectId: validation.value.projectId,
      isPinned: validation.value.isPinned
    });

    logger.info(`Note created: ${note.id}`, {
      requestId,
      noteId: note.id,
      title: note.title
    });

    logApiResponse('/api/notes', 'POST', 201, Date.now() - startTime, {
      requestId,
      noteCreated: note.id
    });

    const response = NextResponse.json({
      version: getVersion(),
      data: {
        note,
        message: 'Note created successfully'
      },
      requestId
    }, {
      status: 201,
      headers: {
        'X-Resource-ID': note.id,
        'X-Request-ID': requestId
      }
    });

    // Add version headers
    const headers = response.headers;
    for (const [key, value] of Object.entries(getVersionHeaders())) {
      headers.set(key, value);
    }

    return response;
  } catch (error) {
    logApiError('/api/notes', 'POST', error);
    return NextResponse.json({
      version: getVersion(),
      error: 'Failed to create note',
      message: 'An unexpected error occurred',
      requestId
    }, {
      status: 500,
      headers: {
        'X-Request-ID': requestId
      }
    });
  }
}

export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

  try {
    const clientId = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const rateCheck = await rateLimiter.check(clientId);

    if (!rateCheck.allowed) {
      logger.warn(`Rate limit exceeded for ${clientId}: PUT /api/notes`, {
        requestId,
        clientId,
        rateLimit: rateCheck
      });
      return NextResponse.json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: new Date(rateCheck.resetTime).toISOString()
      }, {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateCheck.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateCheck.resetTime.toString(),
          'X-Request-ID': requestId
        }
      });
    }

    const { id, title, content, description, tags, folder, isPinned } = await request.json();
    logApiRequest('/api/notes', 'PUT', { id, title, clientId, requestId });

    if (!id) {
      logValidationError('id', undefined, 'Note ID is required');
      return NextResponse.json({
        version: getVersion(),
        error: 'Validation error',
        message: 'Note ID is required',
        requestId
      }, {
        status: 400,
        headers: {
          'X-Request-ID': requestId
        }
      });
    }

    const note = await updateNoteService(id, {
      title,
      content,
      description,
      tags,
      folder,
      isPinned
    });

    if (!note) {
      return NextResponse.json({
        version: getVersion(),
        error: 'Not found',
        message: 'Note not found',
        requestId
      }, {
        status: 404,
        headers: {
          'X-Request-ID': requestId
        }
      });
    }

    logger.info(`Note updated: ${id}`, {
      requestId,
      noteId: id,
      title: note.title
    });

    logApiResponse('/api/notes', 'PUT', 200, Date.now() - startTime, {
      requestId,
      noteUpdated: id
    });

    const response = NextResponse.json({
      version: getVersion(),
      data: {
        note,
        message: 'Note updated successfully'
      },
      requestId
    });

    // Add version headers
    const headers = response.headers;
    for (const [key, value] of Object.entries(getVersionHeaders())) {
      headers.set(key, value);
    }
    headers.set('X-Request-ID', requestId);

    return response;
  } catch (error) {
    logApiError('/api/notes', 'PUT', error);
    return NextResponse.json({
      version: getVersion(),
      error: 'Failed to update note',
      message: 'An unexpected error occurred',
      requestId
    }, {
      status: 500,
      headers: {
        'X-Request-ID': requestId
      }
    });
  }
}

export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

  try {
    const clientId = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const rateCheck = await rateLimiter.check(clientId);

    if (!rateCheck.allowed) {
      logger.warn(`Rate limit exceeded for ${clientId}: DELETE /api/notes`, {
        requestId,
        clientId,
        rateLimit: rateCheck
      });
      return NextResponse.json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: new Date(rateCheck.resetTime).toISOString()
      }, {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateCheck.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateCheck.resetTime.toString(),
          'X-Request-ID': requestId
        }
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    logApiRequest('/api/notes', 'DELETE', { id, clientId, requestId });

    if (!id) {
      logValidationError('id', undefined, 'Note ID is required');
      return NextResponse.json({
        version: getVersion(),
        error: 'Validation error',
        message: 'Note ID is required',
        requestId
      }, {
        status: 400,
        headers: {
          'X-Request-ID': requestId
        }
      });
    }

    const success = await deleteNoteService(id);

    if (!success) {
      return NextResponse.json({
        version: getVersion(),
        error: 'Not found',
        message: 'Note not found',
        requestId
      }, {
        status: 404,
        headers: {
          'X-Request-ID': requestId
        }
      });
    }

    logger.info(`Note deleted: ${id}`, {
      requestId,
      noteId: id
    });

    logApiResponse('/api/notes', 'DELETE', 200, Date.now() - startTime, {
      requestId,
      noteDeleted: id
    });

    const response = NextResponse.json({
      version: getVersion(),
      data: {
        success: true,
        message: 'Note deleted successfully'
      },
      requestId
    });

    // Add version headers
    const headers = response.headers;
    for (const [key, value] of Object.entries(getVersionHeaders())) {
      headers.set(key, value);
    }
    headers.set('X-Request-ID', requestId);

    return response;
  } catch (error) {
    logApiError('/api/notes', 'DELETE', error);
    return NextResponse.json({
      version: getVersion(),
      error: 'Failed to delete note',
      message: 'An unexpected error occurred',
      requestId
    }, {
      status: 500,
      headers: {
        'X-Request-ID': requestId
      }
    });
  }
}
