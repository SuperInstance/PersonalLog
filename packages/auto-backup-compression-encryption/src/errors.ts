/**
 * Error handling utilities
 */

export class BackupError extends Error {
  constructor(
    message: string,
    public options?: {
      technicalDetails?: string
      context?: Record<string, unknown>
      cause?: Error
    }
  ) {
    super(message)
    this.name = 'BackupError'
  }
}

export class CompressionError extends BackupError {
  constructor(message: string, options?: { technicalDetails?: string; context?: Record<string, unknown>; cause?: Error }) {
    super(message, options)
    this.name = 'CompressionError'
  }
}

export class EncryptionError extends BackupError {
  constructor(message: string, options?: { technicalDetails?: string; context?: Record<string, unknown>; cause?: Error }) {
    super(message, options)
    this.name = 'EncryptionError'
  }
}

export class ValidationError extends BackupError {
  constructor(message: string, options?: { field?: string; value?: unknown; context?: Record<string, unknown> }) {
    super(message, options)
    this.name = 'ValidationError'
  }
}

export class StorageError extends BackupError {
  constructor(message: string, options?: { technicalDetails?: string; context?: Record<string, unknown>; cause?: Error }) {
    super(message, options)
    this.name = 'StorageError'
  }
}

export class NotFoundError extends BackupError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, { context: { resource, id } })
    this.name = 'NotFoundError'
  }
}

export class QuotaError extends BackupError {
  constructor(message: string, options?: { technicalDetails?: string; context?: Record<string, unknown> }) {
    super(message, options)
    this.name = 'QuotaError'
  }
}
