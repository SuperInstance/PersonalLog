import { NextRequest, NextResponse } from 'next/server';
import { createHealthCheckResponse, generateRequestId } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  // Simple health check
  try {
    const healthResponse = await createHealthCheckResponse();
    return NextResponse.json(healthResponse, {
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: 0,
      services: {
        database: 'unhealthy',
        api: 'unhealthy',
        rateLimiter: 'unhealthy'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        version: '1.0.0'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: {
        'X-Request-ID': requestId,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}
