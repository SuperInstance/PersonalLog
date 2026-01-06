/**
 * JEPA Timestamp Formatter
 *
 * Handles consistent timestamp formatting for transcripts.
 */

export type TimestampFormat = 'hh:mm:ss' | 'hh:mm' | 'seconds'

/**
 * Format seconds into HH:MM:SS format
 * @param seconds - Time in seconds
 * @param format - Desired format
 * @returns Formatted timestamp string
 */
export function formatTimestamp(
  seconds: number,
  format: TimestampFormat = 'hh:mm:ss'
): string {
  if (format === 'seconds') {
    return seconds.toFixed(1)
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const pad = (num: number): string => num.toString().padStart(2, '0')

  if (format === 'hh:mm') {
    return `${pad(hours)}:${pad(minutes)}`
  }

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
}

/**
 * Format seconds into SRT timestamp format (HH:MM:SS,mmm)
 * @param seconds - Time in seconds
 * @returns SRT-formatted timestamp
 */
export function formatSRTTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const millis = Math.round((seconds % 1) * 1000)

  const pad = (num: number, length: number = 2): string =>
    num.toString().padStart(length, '0')

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(millis, 3)}`
}

/**
 * Parse a formatted timestamp back into seconds
 * @param timestamp - Formatted timestamp (HH:MM:SS or HH:MM:SS,mmm)
 * @returns Time in seconds
 */
export function parseTimestamp(timestamp: string): number {
  // Handle SRT format (HH:MM:SS,mmm)
  if (timestamp.includes(',')) {
    const [time, millis] = timestamp.split(',')
    const parts = time.split(':').map(Number)
    const seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
    return seconds + parseInt(millis) / 1000
  }

  // Handle standard format (HH:MM:SS or HH:MM)
  const parts = timestamp.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    return parts[0] * 3600 + parts[1] * 60
  }

  return 0
}

/**
 * Get duration between two timestamps in human-readable format
 * @param startSeconds - Start time in seconds
 * @param endSeconds - End time in seconds
 * @returns Human-readable duration (e.g., "5 minutes 30 seconds")
 */
export function formatDuration(startSeconds: number, endSeconds: number): string {
  const duration = Math.abs(endSeconds - startSeconds)
  const minutes = Math.floor(duration / 60)
  const seconds = Math.floor(duration % 60)

  if (minutes === 0) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  } else if (seconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`
  }
}

/**
 * Format ISO timestamp into readable date/time
 * @param isoTimestamp - ISO 8601 timestamp
 * @param includeTime - Whether to include time
 * @returns Formatted date string
 */
export function formatISODate(isoTimestamp: string, includeTime: boolean = true): string {
  const date = new Date(isoTimestamp)

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }

  if (includeTime) {
    Object.assign(options, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  return date.toLocaleDateString('en-US', options)
}

/**
 * Get current timestamp in ISO format
 * @returns Current ISO timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Calculate seconds from start of session
 * @param startTime - Session start timestamp (ISO)
 * @param currentTime - Current timestamp (ISO)
 * @returns Seconds elapsed
 */
export function calculateElapsedSeconds(startTime: string, currentTime: string): number {
  const start = new Date(startTime).getTime()
  const current = new Date(currentTime).getTime()
  return (current - start) / 1000
}

/**
 * Validate timestamp format
 * @param timestamp - Timestamp string to validate
 * @returns True if valid format
 */
export function isValidTimestamp(timestamp: string): boolean {
  // Check for HH:MM:SS format
  const standardFormat = /^\d{2}:\d{2}:\d{2}$/.test(timestamp)

  // Check for HH:MM format
  const shortFormat = /^\d{2}:\d{2}$/.test(timestamp)

  // Check for SRT format (HH:MM:SS,mmm)
  const srtFormat = /^\d{2}:\d{2}:\d{2},\d{3}$/.test(timestamp)

  // Check for ISO format
  let isoFormat = false
  try {
    const date = new Date(timestamp)
    isoFormat = date.toISOString() === timestamp || !isNaN(date.getTime())
  } catch {
    isoFormat = false
  }

  return standardFormat || shortFormat || srtFormat || isoFormat
}

/**
 * Format seconds for display in various contexts
 * @param seconds - Time in seconds
 * @param context - Usage context
 * @returns Appropriately formatted time string
 */
export function formatTimeForContext(
  seconds: number,
  context: 'tooltip' | 'inline' | 'header' | 'short'
): string {
  switch (context) {
    case 'tooltip':
      return formatTimestamp(seconds, 'hh:mm:ss')
    case 'inline':
      return `[${formatTimestamp(seconds, 'hh:mm:ss')}]`
    case 'header':
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      if (hours > 0) {
        return `${hours}h ${minutes}m`
      }
      return `${minutes}m`
    case 'short':
      return formatTimestamp(seconds, 'hh:mm')
    default:
      return formatTimestamp(seconds, 'hh:mm:ss')
  }
}
