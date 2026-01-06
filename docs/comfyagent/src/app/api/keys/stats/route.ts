import { NextRequest, NextResponse } from 'next/server';
import { getAPIKeyStatistics } from '@/lib/api-key-auth';
import { logger, logApiRequest, logApiResponse, logApiError } from '@/lib/logger';
import { generateRequestId, createErrorResponse } from '@/lib/api-middleware';

/**
 * API Key Statistics API
 *
 * Provides statistics and insights about API key usage
 */

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    logApiRequest('/api/keys/stats', 'GET', {
      requestId,
      userId
    });

    // In production, userId would come from authenticated session
    const stats = await getAPIKeyStatistics(userId || undefined);

    logApiResponse('/api/keys/stats', 'GET', 200, Date.now() - startTime, {
      requestId,
      stats
    });

    const response = NextResponse.json({
      version: '1.0.0',
      data: {
        statistics: stats,
        insights: {
          mostUsedType: Object.entries(stats.byType)
            .sort(([, a], [, b]) => b - a)[0][0],
          averageUsage: Object.values(stats.byType).reduce((a, b) => a + b, 0) / Object.keys(stats.byType).length,
          activeRatio: stats.totalKeys > 0 ? ((stats.activeKeys / stats.totalKeys) * 100).toFixed(2) + '%' : '0%'
        }
      },
      requestId
    });

    return response;
  } catch (error) {
    logApiError('/api/keys/stats', 'GET', error);
    return createErrorResponse('Failed to fetch API key statistics');
  }
}
