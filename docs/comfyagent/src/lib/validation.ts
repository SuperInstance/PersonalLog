/**
 * Input Validation and Sanitization Utilities
 *
 * Provides production-ready validation for all inputs
 * Prevents XSS, injection attacks, and invalid data
 */

// ============================================
// VALIDATION RULES
// ============================================

const VALIDATION_RULES = {
  // Note validation
  NOTE_TITLE_MIN_LENGTH: 1,
  NOTE_TITLE_MAX_LENGTH: 200,
  NOTE_CONTENT_MAX_LENGTH: 100000,
  NOTE_TAGS_MAX: 20,
  TAG_MAX_LENGTH: 50,
  FOLDER_MAX_LENGTH: 50,

  // File validation
  FILE_MAX_SIZE: 100 * 1024 * 1024, // 100MB
  FILE_MIN_SIZE: 1, // 1 byte
  IMAGE_MAX_SIZE: 50 * 1024 * 1024, // 50MB
  VIDEO_MAX_SIZE: 500 * 1024 * 1024, // 500MB

  // Search validation
  SEARCH_QUERY_MIN_LENGTH: 1,
  SEARCH_QUERY_MAX_LENGTH: 200,

  // Pagination
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
  MIN_PAGE: 1,
  MAX_PAGE: 1000
};

// ============================================
// SANITIZATION
// ============================================

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string, options: {
  maxLength?: number;
  allowedTags?: string[];
} = {}): string {
  if (!input) return '';

  let sanitized = input;

  // Trim whitespace
  sanitized = sanitized.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Escape HTML special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  // Apply length limit
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
}

/**
 * Sanitize markdown content
 */
export function sanitizeMarkdown(input: string): string {
  if (!input) return '';

  // Preserve markdown syntax while sanitizing HTML
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(input: string): string {
  if (!input) return '';

  return sanitizeString(input)
    .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/\.+/g, '.') // Remove multiple dots
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
    .substring(0, 255); // Limit to 255 characters
}

/**
 * Sanitize folder name
 */
export function sanitizeFolderName(input: string): string {
  return sanitizeString(input, {
    maxLength: VALIDATION_RULES.FOLDER_MAX_LENGTH
  });
}

// ============================================
// VALIDATION
// ============================================

interface ValidationResult {
  isValid: boolean;
  error?: string;
  value?: any;
}

/**
 * Validate note title
 */
export function validateNoteTitle(title: string): ValidationResult {
  if (!title || typeof title !== 'string') {
    return { isValid: false, error: 'Title is required' };
  }

  const sanitized = sanitizeString(title);

  if (sanitized.length < VALIDATION_RULES.NOTE_TITLE_MIN_LENGTH) {
    return { isValid: false, error: 'Title must be at least 1 character' };
  }

  if (sanitized.length > VALIDATION_RULES.NOTE_TITLE_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Title must be less than ${VALIDATION_RULES.NOTE_TITLE_MAX_LENGTH} characters`,
      value: sanitized
    };
  }

  return { isValid: true, value: sanitized };
}

/**
 * Validate note content
 */
export function validateNoteContent(content: string): ValidationResult {
  if (!content || typeof content !== 'string') {
    return { isValid: false, error: 'Content is required' };
  }

  const sanitized = sanitizeMarkdown(content);

  if (sanitized.length > VALIDATION_RULES.NOTE_CONTENT_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Content exceeds maximum length of ${VALIDATION_RULES.NOTE_CONTENT_MAX_LENGTH} characters`,
      value: sanitized
    };
  }

  return { isValid: true, value: sanitized };
}

/**
 * Validate tags array
 */
export function validateTags(tags: string[]): ValidationResult {
  if (!Array.isArray(tags)) {
    return { isValid: false, error: 'Tags must be an array' };
  }

  if (tags.length > VALIDATION_RULES.NOTE_TAGS_MAX) {
    return {
      isValid: false,
      error: `Maximum ${VALIDATION_RULES.NOTE_TAGS_MAX} tags allowed`
    };
  }

  const sanitizedTags = tags
    .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
    .map(tag => sanitizeString(tag, { maxLength: VALIDATION_RULES.TAG_MAX_LENGTH }))
    .filter((tag, index, self) => self.indexOf(tag) === index); // Remove duplicates

  return { isValid: true, value: sanitizedTags };
}

/**
 * Validate folder name
 */
export function validateFolderName(folder: string): ValidationResult {
  if (!folder || typeof folder !== 'string') {
    return { isValid: false, error: 'Folder name is required' };
  }

  const sanitized = sanitizeFolderName(folder);

  if (sanitized.length < VALIDATION_RULES.NOTE_TITLE_MIN_LENGTH) {
    return { isValid: false, error: 'Folder name must be at least 1 character' };
  }

  return { isValid: true, value: sanitized };
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: string): ValidationResult {
  if (!query || typeof query !== 'string') {
    return { isValid: false, error: 'Search query is required' };
  }

  const sanitized = sanitizeString(query, {
    maxLength: VALIDATION_RULES.SEARCH_QUERY_MAX_LENGTH
  });

  if (sanitized.length < VALIDATION_RULES.SEARCH_QUERY_MIN_LENGTH) {
    return { isValid: false, error: 'Search query must be at least 1 character' };
  }

  return { isValid: true, value: sanitized };
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File, options: {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
} = {}): ValidationResult {
  if (!file) {
    return { isValid: false, error: 'File is required' };
  }

  const maxSize = options.maxSize || VALIDATION_RULES.FILE_MAX_SIZE;

  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size exceeds maximum of ${maxSize / (1024 * 1024)}MB`
    };
  }

  if (file.size < VALIDATION_RULES.FILE_MIN_SIZE) {
    return { isValid: false, error: 'File is empty' };
  }

  // Check file type
  if (options.allowedTypes && options.allowedTypes.length > 0) {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();

    const isAllowed = options.allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExtension === type.substring(1);
      }
      return mimeType.includes(type);
    });

    if (!isAllowed) {
      return {
        isValid: false,
        error: `File type not allowed. Allowed types: ${options.allowedTypes.join(', ')}`
      };
    }
  }

  return {
    isValid: true,
    value: file
  };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(options: {
  page?: number;
  limit?: number;
}): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    value: {}
  };

  if (options.page !== undefined) {
    const page = Number(options.page);
    if (isNaN(page) || page < VALIDATION_RULES.MIN_PAGE) {
      return { isValid: false, error: 'Page must be a valid number' };
    }
    if (page > VALIDATION_RULES.MAX_PAGE) {
      return {
        isValid: false,
        error: `Page cannot exceed ${VALIDATION_RULES.MAX_PAGE}`
      };
    }
    result.value = { ...result.value, page };
  }

  if (options.limit !== undefined) {
    const limit = Number(options.limit);
    if (isNaN(limit) || limit < VALIDATION_RULES.MIN_LIMIT) {
      return { isValid: false, error: 'Limit must be a valid number' };
    }
    if (limit > VALIDATION_RULES.MAX_LIMIT) {
      return {
        isValid: false,
        error: `Limit cannot exceed ${VALIDATION_RULES.MAX_LIMIT}`
      };
    }
    result.value = { ...result.value, limit };
  }

  return result;
}

// ============================================
// REQUEST VALIDATION
// ============================================

interface NoteRequest {
  title?: string;
  content?: string;
  description?: string;
  tags?: string[];
  folder?: string;
  projectId?: string;
  isPinned?: boolean;
}

/**
 * Validate note creation/update request
 */
export function validateNoteRequest(request: NoteRequest): ValidationResult {
  const errors: string[] = [];
  const validated: NoteRequest = {};

  if (request.title) {
    const titleResult = validateNoteTitle(request.title);
    if (!titleResult.isValid) {
      errors.push(titleResult.error || 'Invalid title');
    } else {
      validated.title = titleResult.value;
    }
  }

  if (request.content) {
    const contentResult = validateNoteContent(request.content);
    if (!contentResult.isValid) {
      errors.push(contentResult.error || 'Invalid content');
    } else {
      validated.content = contentResult.value;
    }
  }

  if (request.tags) {
    const tagsResult = validateTags(request.tags);
    if (!tagsResult.isValid) {
      errors.push(tagsResult.error || 'Invalid tags');
    } else {
      validated.tags = tagsResult.value;
    }
  }

  if (request.folder) {
    const folderResult = validateFolderName(request.folder);
    if (!folderResult.isValid) {
      errors.push(folderResult.error || 'Invalid folder');
    } else {
      validated.folder = folderResult.value;
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      error: errors.join('; ')
    };
  }

  return { isValid: true, value: validated };
}

// ============================================
// SECURITY VALIDATION
// ============================================

/**
 * Detect potential XSS attacks
 */
export function detectXSS(input: string): boolean {
  if (!input || typeof input !== 'string') return false;

  const xssPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+=/i,
    /<iframe/i,
    /<embed/i,
    /<object/i,
    /<img/i,
    /<svg/i
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Detect SQL injection attempts
 */
export function detectSQLInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false;

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|UNION|EXEC|SCRIPT)\b)/i,
    /(['"]).*?\s*([SELECT|INSERT|UPDATE|DELETE|FROM|WHERE])/i,
    /--|\#|\/\*/i, // SQL comments
    /;\s*(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/i
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Detect path traversal attempts
 */
export function detectPathTraversal(input: string): boolean {
  if (!input || typeof input !== 'string') return false;

  const pathPatterns = [
    /\.\.[\/\\]/, // Directory traversal
    /[\/\\]\.\.[\/\\]/, // Parent directory
    /[\/\\]\.\./, // Relative path
    /[\/\\]\.\.\.[\/\\]/, // Multiple parent directories
    /%2e|%25/, // URL encoding bypass
    /\.\.[\/\\]/i
  ];

  return pathPatterns.some(pattern => pattern.test(input));
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Validate and return first error (or null if valid)
 */
export function validateOrThrow<T>(value: T, validator: (v: T) => ValidationResult): T {
  const result = validator(value);

  if (!result.isValid) {
    throw new Error(result.error || 'Validation failed');
  }

  return result.value as T;
}

/**
 * Batch validate multiple values
 */
export function validateBatch<T>(items: T[], validator: (v: T) => ValidationResult): {
  valid: T[];
  invalid: Array<{ item: T; error: string }>;
} {
  const valid: T[] = [];
  const invalid: Array<{ item: T; error: string }> = [];

  for (const item of items) {
    const result = validator(item);
    if (result.isValid) {
      valid.push(item);
    } else {
      invalid.push({ item, error: result.error || 'Validation failed' });
    }
  }

  return { valid, invalid };
}
