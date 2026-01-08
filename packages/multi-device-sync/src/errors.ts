/**
 * Error handling for multi-device sync
 */

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

export class SyncError extends Error {
  public readonly code: string
  public readonly details?: unknown
  public readonly cause?: Error

  constructor(message: string, options?: { details?: unknown; cause?: Error }) {
    super(message)
    this.name = this.constructor.name
    this.code = this.constructor.name
    this.details = options?.details
    this.cause = options?.cause

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

// ============================================================================
// SPECIFIC ERROR TYPES
// ============================================================================

export class ValidationError extends SyncError {
  constructor(message: string, options?: { field?: string; value?: unknown; context?: Record<string, unknown> }) {
    super(message, { details: options })
  }
}

export class NetworkError extends SyncError {
  constructor(message: string, options?: { technicalDetails?: string; url?: string; cause?: Error }) {
    super(message, { details: options })
  }
}

export class StorageError extends SyncError {
  constructor(message: string, options?: { technicalDetails?: string; cause?: Error }) {
    super(message, options)
  }
}

export class NotFoundError extends SyncError {
  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType} not found: ${resourceId}`, { details: { resourceType, resourceId } })
  }
}

export class AuthenticationError extends SyncError {
  constructor(message: string, options?: { provider?: string }) {
    super(message, { details: options })
  }
}

export class ConflictError extends SyncError {
  constructor(message: string, options?: { conflicts?: number }) {
    super(message, { details: options })
  }
}

export class QuotaExceededError extends SyncError {
  constructor(message: string, options?: { quota?: number; usage?: number }) {
    super(message, { details: options })
  }
}

export class TimeoutError extends SyncError {
  constructor(message: string, options?: { timeout?: number }) {
    super(message, { details: options })
  }
}

export class ProviderUnavailableError extends SyncError {
  constructor(message: string, options?: { provider?: string }) {
    super(message, { details: options })
  }
}

export class EncryptionError extends SyncError {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, options)
  }
}
