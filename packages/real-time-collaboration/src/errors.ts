/**
 * Error Types for Real-Time Collaboration
 *
 * Lightweight error classes compatible with the collaboration system.
 */

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

export class CollaborationError extends Error {
  public readonly name: string = 'CollaborationError'
  public readonly technicalDetails?: string
  public readonly cause?: Error

  constructor(
    message: string,
    options: {
      technicalDetails?: string
      cause?: Error
    } = {}
  ) {
    super(message)
    this.technicalDetails = options.technicalDetails
    this.cause = options.cause

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CollaborationError)
    }
  }
}

// ============================================================================
// SPECIFIC ERROR TYPES
// ============================================================================

export class ValidationError extends CollaborationError {
  readonly name: string = 'ValidationError'

  constructor(
    message: string,
    options: {
      field?: string
      value?: unknown
      technicalDetails?: string
      cause?: Error
    } = {}
  ) {
    const details = options.field
      ? `Field: ${options.field}${options.value !== undefined ? `, Value: ${JSON.stringify(options.value)}` : ''}`
      : options.technicalDetails

    super(message, {
      technicalDetails: details,
      cause: options.cause,
    })
  }
}

export class NotFoundError extends CollaborationError {
  readonly name: string = 'NotFoundError'

  constructor(
    resourceType: string,
    resourceId: string,
    options: {
      technicalDetails?: string
      cause?: Error
    } = {}
  ) {
    super(`${resourceType} not found: ${resourceId}`, options)
  }
}

export class StorageError extends CollaborationError {
  readonly name: string = 'StorageError'

  constructor(
    message: string,
    options: {
      technicalDetails?: string
      cause?: Error
    } = {}
  ) {
    super(message, options)
  }
}

export class PermissionError extends CollaborationError {
  readonly name: string = 'PermissionError'

  constructor(
    message: string,
    options: {
      technicalDetails?: string
      cause?: Error
    } = {}
  ) {
    super(message, options)
  }
}

export class NetworkError extends CollaborationError {
  readonly name: string = 'NetworkError'

  constructor(
    message: string,
    options: {
      technicalDetails?: string
      cause?: Error
    } = {}
  ) {
    super(message, options)
  }
}
