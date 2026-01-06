/**
 * Pagination Utilities
 *
 * Provides standardized pagination for list endpoints
 * Supports cursor-based and offset-based pagination
 */

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  direction?: 'forward' | 'backward';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
    cursor?: string;
    previousCursor?: string;
  };
  requestId: string;
}

export interface PaginationMetadata {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Default pagination configuration
 */
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MIN_PAGE_SIZE = 1;

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  total: number,
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
): PaginationMetadata {
  const totalPages = Math.ceil(total / pageSize);
  const validatedPage = Math.max(1, Math.min(page, totalPages));

  return {
    total,
    page: validatedPage,
    pageSize,
    totalPages
  };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(params: PaginationParams): {
  isValid: boolean;
  error?: string;
  validated: PaginationParams;
} {
  const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = params;

  const errors: string[] = [];

  // Validate page number
  if (page && (page < 1 || page > 10000)) {
    errors.push('Page number must be between 1 and 10000');
  }

  // Validate page size
  if (pageSize && (pageSize < MIN_PAGE_SIZE || pageSize > MAX_PAGE_SIZE)) {
    errors.push(`Page size must be between ${MIN_PAGE_SIZE} and ${MAX_PAGE_SIZE}`);
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      error: errors.join('; '),
      validated: { page: 1, pageSize: DEFAULT_PAGE_SIZE }
    };
  }

  return {
    isValid: true,
    validated: {
      page: page || 1,
      pageSize: pageSize || DEFAULT_PAGE_SIZE
    }
  };
}

/**
 * Apply pagination to database query
 */
export function applyPaginationToQuery(
  query: any,
  pagination: PaginationParams
): any {
  const validated = validatePagination(pagination);

  if (!validated.isValid) {
    return query;
  }

  const { page, pageSize } = validated.validated;
  const skip = (page - 1) * pageSize;

  return {
    ...query,
    skip,
    take: pageSize
  };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams,
  requestId: string
): PaginationResult<T> {
  const pagination = calculatePagination(total, params.page, params.pageSize);

  return {
    data,
    pagination: {
      ...pagination,
      hasMore: pagination.page < pagination.totalPages,
      cursor: generateCursor(data, params),
      previousCursor: params.direction === 'backward' ? generateCursor(data, params) : undefined
    },
    requestId
  };
}

/**
 * Generate cursor for cursor-based pagination
 */
export function generateCursor<T>(
  data: T[],
  params: PaginationParams
): string | undefined {
  if (!params.cursor && data.length === 0) {
    return undefined;
  }

  const lastItem = data[data.length - 1];
  const id = lastItem.id || lastItem.createdAt;

  return Buffer.from(JSON.stringify({
    id,
    page: params.page || 1,
    pageSize: params.pageSize || DEFAULT_PAGE_SIZE
  })).toString('base64');
}

/**
 * Parse cursor from base64 string
 */
export function parseCursor(cursor: string): {
  id?: string;
  page: number;
  pageSize: number;
} | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

/**
 * Get page range information
 */
export function getPageRange(pagination: PaginationMetadata): {
  start: number;
  end: number;
  total: number;
} {
  const { page, pageSize, total } = pagination;
  const start = Math.min((page - 1) * pageSize + 1, total);
  const end = Math.min(page * pageSize, total);

  return {
    start,
    end,
    total
  };
}

/**
 * Create pagination headers
 */
export function createPaginationHeaders(pagination: PaginationMetadata): Record<string, string> {
  const { page, pageSize, total, totalPages } = pagination;
  const { start, end } = getPageRange(pagination);

  return {
    'X-Pagination-Page': page.toString(),
    'X-Pagination-PageSize': pageSize.toString(),
    'X-Pagination-Total': total.toString(),
    'X-Pagination-Total-Pages': totalPages.toString(),
    'X-Pagination-Range': `${start}-${end}`,
    'X-Pagination-Has-More': pagination.page < pagination.totalPages ? 'true' : 'false'
  };
}

/**
 * Format pagination info for client
 */
export function formatPaginationInfo(pagination: PaginationMetadata): string {
  const { page, pageSize, total, totalPages } = pagination;
  const { start, end } = getPageRange(pagination);

  return `Showing ${start}-${end} of ${total} results (page ${page} of ${totalPages})`;
}

/**
 * Get default pagination params from request
 */
export function getDefaultPaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || `${DEFAULT_PAGE_SIZE}`);
  const cursor = searchParams.get('cursor');
  const direction = (searchParams.get('direction') || 'forward') as 'forward' | 'backward';

  return {
    page,
    pageSize,
    cursor,
    direction
  };
}

/**
 * Apply pagination to list queries
 */
export async function paginateQuery<T>(
  queryFn: () => Promise<T[]>,
  countFn: () => Promise<number>,
  params: PaginationParams
): Promise<PaginationResult<T>> {
  const validated = validatePagination(params);

  if (!validated.isValid) {
    throw new Error(validated.error || 'Invalid pagination parameters');
  }

  const [data, total] = await Promise.all([
    queryFn(),
    countFn()
  ]);

  return {
    data,
    pagination: calculatePagination(total, validated.validated.page, validated.validated.pageSize),
    requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  };
}

/**
 * Limit results with max page size
 */
export function limitResults<T>(data: T[], maxResults: number = MAX_PAGE_SIZE): T[] {
  return data.slice(0, maxResults);
}

/**
 * Get next page params
 */
export function getNextPageParams(currentParams: PaginationParams, total: number): PaginationParams | null {
  const pagination = calculatePagination(total, currentParams.page, currentParams.pageSize);

  if (pagination.page >= pagination.totalPages) {
    return null;
  }

  return {
    ...currentParams,
    page: pagination.page + 1,
    cursor: undefined
  };
}

/**
 * Get previous page params
 */
export function getPreviousPageParams(currentParams: PaginationParams): PaginationParams | null {
  const { page } = validatePagination(currentParams).validated;

  if (page <= 1) {
    return null;
  }

  return {
    ...currentParams,
    page: page - 1,
    cursor: undefined
  };
}

/**
 * Create empty paginated response
 */
export function createEmptyPaginatedResponse(requestId: string): PaginationResult<never> {
  return {
    data: [],
    pagination: {
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      total: 0,
      totalPages: 1,
      hasMore: false
    },
    requestId
  };
}

/**
 * Pagination constants
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE
} as const;
