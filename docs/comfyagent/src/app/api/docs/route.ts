import { NextRequest, NextResponse } from 'next/server';
import {
  generateOpenAPISpec,
  generateMarkdownDocumentation,
  generateHTMLDocumentation
} from '@/lib/api-doc-generator';
import { logger, logApiRequest, logApiResponse, logApiError } from '@/lib/logger';
import { generateRequestId } from '@/lib/api-middleware';

/**
 * API Documentation Endpoint
 *
 * Serves OpenAPI 3.0 specification and interactive documentation
 * Supports JSON spec, HTML documentation, and Markdown
 */

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'html'; // 'html', 'json', 'markdown'

    logApiRequest('/api/docs', 'GET', {
      requestId,
      format
    });

    // Check if endpoint is public (no auth required)
    // API docs are public for easy access
    if (format === 'json') {
      // Return OpenAPI JSON spec
      const spec = await generateOpenAPISpec();

      logApiResponse('/api/docs/openapi.json', 'GET', 200, Date.now() - startTime, {
        requestId
      });

      return NextResponse.json(spec, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    } else if (format === 'markdown') {
      // Return Markdown documentation
      const markdown = await generateMarkdownDocumentation();

      logApiResponse('/api/docs/openapi.md', 'GET', 200, Date.now() - startTime, {
        requestId
      });

      return new NextResponse(markdown, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    } else {
      // Return HTML documentation with Swagger UI
      const html = await generateHTMLDocumentation();

      logApiResponse('/api/docs/index.html', 'GET', 200, Date.now() - startTime, {
        requestId
      });

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
      });
    }
  } catch (error) {
    logApiError('/api/docs', 'GET', error);

    return NextResponse.json({
      version: '1.0.0',
      error: {
        message: 'Failed to generate API documentation',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error?.toString() : undefined
      },
      requestId
    }, {
      status: 500,
      headers: {
        'X-Request-ID': requestId
      }
    });
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(request: NextRequest) {
  const requestId = generateRequestId();

  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'X-Request-ID': requestId
    }
  });
}
