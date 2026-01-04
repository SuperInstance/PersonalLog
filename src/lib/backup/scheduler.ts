/**
 * Backup Scheduler
 *
 * Automated backup scheduling using service workers and background sync.
 * Supports daily, weekly, and monthly backup schedules.
 */

import {
  BackupSchedule,
  BackupScheduleInterval,
  Backup,
  BackupType,
  CreateBackupOptions,
  BackupProgress
} from './types'
import { saveBackup, listBackups, deleteBackup, saveMetadata, getMetadata } from './storage'
import { StorageError } from '@/lib/errors'

// ============================================================================
// SCHEDULER CONSTANTS
// ============================================================================

const SCHEDULES_KEY = 'backup_schedules'
const LAST_RUN_KEY = 'backup_last_run'

// ============================================================================
// SCHEDULER STATE
// ============================================================================

let schedulerInterval: number | null = null
let activeSchedules = new Map<string, BackupSchedule>()

// ============================================================================
// SCHEDULE MANAGEMENT
// ============================================================================

/**
 * Create a new backup schedule
 *
 * @param interval - Schedule interval (daily, weekly, monthly)
 * @param options - Schedule options
 * @returns Created schedule
 */
export async function createSchedule(
  interval: BackupScheduleInterval,
  options: {
    timeOfDay?: string // HH:MM format
    dayOfWeek?: number // 1-7 (1=Monday)
    dayOfMonth?: number // 1-31
    backupType?: BackupType
    retentionCount?: number
    retentionDays?: number
    compress?: boolean
    categories?: string[]
  } = {}
): Promise<BackupSchedule> {
  const schedule: BackupSchedule = {
    id: `schedule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    interval,
    enabled: true,
    timeOfDay: options.timeOfDay || '02:00', // Default 2 AM
    dayOfWeek: options.dayOfWeek,
    dayOfMonth: options.dayOfMonth,
    backupType: options.backupType || 'full',
    retentionCount: options.retentionCount || 7,
    retentionDays: options.retentionDays || 30,
    compress: options.compress !== false,
    categories: (options.categories as any) || ['all'],
    nextBackup: calculateNextBackup(interval, options.timeOfDay, options.dayOfWeek, options.dayOfMonth),
    successfulBackups: 0,
    failedBackups: 0
  }

  // Save schedule
  const schedules = await getSchedules()
  schedules.set(schedule.id, schedule)
  await saveSchedules(schedules)

  // Start scheduler if not running
  await startScheduler()

  console.log(`[Backup Scheduler] Created schedule: ${schedule.id} (${interval})`)
  return schedule
}

/**
 * Get all schedules
 *
 * @returns Map of schedule ID to schedule
 */
export async function getSchedules(): Promise<Map<string, BackupSchedule>> {
  try {
    const stored = await getMetadata<Record<string, BackupSchedule>>(SCHEDULES_KEY)

    if (!stored) {
      return new Map()
    }

    return new Map(Object.entries(stored))
  } catch (error) {
    console.error('[Backup Scheduler] Failed to get schedules:', error)
    return new Map()
  }
}

/**
 * Save schedules to storage
 */
async function saveSchedules(schedules: Map<string, BackupSchedule>): Promise<void> {
  const obj = Object.fromEntries(schedules)
  await saveMetadata(SCHEDULES_KEY, obj)
}

/**
 * Update a schedule
 *
 * @param scheduleId - Schedule ID
 * @param updates - Partial updates to apply
 * @returns Updated schedule
 */
export async function updateSchedule(
  scheduleId: string,
  updates: Partial<BackupSchedule>
): Promise<BackupSchedule> {
  const schedules = await getSchedules()
  const schedule = schedules.get(scheduleId)

  if (!schedule) {
    throw new StorageError(`Schedule not found: ${scheduleId}`, {
      context: { scheduleId }
    })
  }

  const updated: BackupSchedule = {
    ...schedule,
    ...updates,
    id: schedule.id // Preserve ID
  }

  // Recalculate next backup if timing changed
  if (updates.interval || updates.timeOfDay || updates.dayOfWeek || updates.dayOfMonth) {
    updated.nextBackup = calculateNextBackup(
      updated.interval,
      updated.timeOfDay,
      updated.dayOfWeek,
      updated.dayOfMonth
    )
  }

  schedules.set(scheduleId, updated)
  await saveSchedules(schedules)

  console.log(`[Backup Scheduler] Updated schedule: ${scheduleId}`)
  return updated
}

/**
 * Delete a schedule
 *
 * @param scheduleId - Schedule ID
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  const schedules = await getSchedules()
  if (!schedules.delete(scheduleId)) {
    throw new StorageError(`Schedule not found: ${scheduleId}`, {
      context: { scheduleId }
    })
  }

  await saveSchedules(schedules)
  console.log(`[Backup Scheduler] Deleted schedule: ${scheduleId}`)
}

/**
 * Enable or disable a schedule
 *
 * @param scheduleId - Schedule ID
 * @param enabled - Whether to enable
 */
export async function setScheduleEnabled(scheduleId: string, enabled: boolean): Promise<void> {
  await updateSchedule(scheduleId, { enabled })
}

// ============================================================================
// SCHEDULER CONTROL
// ============================================================================

/**
 * Start the backup scheduler
 *
 * Checks every minute for due backups and runs them.
 */
export async function startScheduler(): Promise<void> {
  if (schedulerInterval !== null) {
    console.log('[Backup Scheduler] Already running')
    return
  }

  console.log('[Backup Scheduler] Starting')

  // Load schedules
  const schedules = await getSchedules()
  activeSchedules = schedules

  // Check immediately for any due backups
  await checkDueBackups()

  // Check every minute
  schedulerInterval = window.setInterval(async () => {
    await checkDueBackups()
  }, 60 * 1000)

  console.log(`[Backup Scheduler] Started with ${activeSchedules.size} schedules`)
}

/**
 * Stop the backup scheduler
 */
export function stopScheduler(): void {
  if (schedulerInterval !== null) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
    console.log('[Backup Scheduler] Stopped')
  }
}

/**
 * Check for due backups and run them
 */
async function checkDueBackups(): Promise<void> {
  try {
    const now = new Date()
    const schedules = await getSchedules()

    for (const [scheduleId, schedule] of schedules) {
      if (!schedule.enabled) continue

      const nextBackupTime = new Date(schedule.nextBackup)

      // Check if schedule is due
      if (now >= nextBackupTime) {
        console.log(`[Backup Scheduler] Running scheduled backup: ${scheduleId}`)

        // Run the backup
        const result = await runScheduledBackup(schedule)

        // Update schedule
        const updated = await getSchedules()
        const current = updated.get(scheduleId)
        if (current) {
          current.lastBackup = now.toISOString()
          current.nextBackup = calculateNextBackup(
            current.interval,
            current.timeOfDay,
            current.dayOfWeek,
            current.dayOfMonth
          )

          if (result.success) {
            current.successfulBackups++
          } else {
            current.failedBackups++
          }

          updated.set(scheduleId, current)
          await saveSchedules(updated)
          activeSchedules = updated
        }
      }
    }
  } catch (error) {
    console.error('[Backup Scheduler] Check failed:', error)
  }
}

/**
 * Run a scheduled backup
 *
 * @param schedule - Schedule to run
 * @returns Backup result
 */
async function runScheduledBackup(schedule: BackupSchedule): Promise<{
  success: boolean
  backupId?: string
  error?: string
}> {
  try {
    // Import BackupManager to avoid circular dependency
    const { createBackup } = await import('./manager')

    const options: CreateBackupOptions = {
      type: schedule.backupType,
      name: generateBackupName(schedule),
      isAutomatic: true,
      compress: schedule.compress,
      categories: schedule.categories as any
    }

    const backup = await createBackup(options)

    console.log(`[Backup Scheduler] Backup completed: ${backup.id}`)
    return { success: true, backupId: backup.id }
  } catch (error) {
    console.error(`[Backup Scheduler] Backup failed:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate next backup time based on schedule
 */
function calculateNextBackup(
  interval: BackupScheduleInterval,
  timeOfDay: string = '02:00',
  dayOfWeek?: number,
  dayOfMonth?: number
): string {
  const now = new Date()
  const [hours, minutes] = timeOfDay.split(':').map(Number)
  let next = new Date()

  next.setHours(hours, minutes, 0, 0)

  switch (interval) {
    case 'daily':
      // If time has passed today, schedule for tomorrow
      if (next <= now) {
        next.setDate(next.getDate() + 1)
      }
      break

    case 'weekly':
      if (dayOfWeek === undefined) dayOfWeek = 1 // Monday

      // Set to specified day of week
      const currentDay = next.getDay()
      const daysUntil = (dayOfWeek - currentDay + 7) % 7

      next.setDate(next.getDate() + (daysUntil === 0 ? 7 : daysUntil))

      // If time has passed on that day, move to next week
      if (next <= now) {
        next.setDate(next.getDate() + 7)
      }
      break

    case 'monthly':
      if (dayOfMonth === undefined) dayOfMonth = 1

      // Set to specified day of month
      next.setDate(dayOfMonth)

      // If time has passed, move to next month
      if (next <= now) {
        next.setMonth(next.getMonth() + 1)
      }

      // Handle overflow (e.g., day 31 in February)
      if (next.getDate() !== dayOfMonth) {
        next.setDate(0) // Last day of previous month
        next.setMonth(next.getMonth() + 1)
      }
      break
  }

  return next.toISOString()
}

/**
 * Generate backup name for scheduled backup
 */
function generateBackupName(schedule: BackupSchedule): string {
  const date = new Date().toLocaleDateString()
  const time = schedule.timeOfDay.replace(':', '')

  return `Scheduled ${schedule.interval} backup - ${date} ${time}`
}

/**
 * Get next scheduled backup time across all schedules
 *
 * @returns Next backup time or null if no schedules
 */
export async function getNextScheduledBackup(): Promise<Date | null> {
  const schedules = await getSchedules()
  const enabled = Array.from(schedules.values()).filter(s => s.enabled)

  if (enabled.length === 0) return null

  const nextTimes = enabled.map(s => new Date(s.nextBackup))
  nextTimes.sort((a, b) => a.getTime() - b.getTime())

  return nextTimes[0]
}

/**
 * Get backup schedule history
 *
 * @returns Array of recent backup runs
 */
export async function getScheduleHistory(): Promise<Array<{
  scheduleId: string
  lastRun: string | null
  successfulBackups: number
  failedBackups: number
  nextRun: string
}>> {
  const schedules = await getSchedules()

  return Array.from(schedules.entries()).map(([id, schedule]) => ({
    scheduleId: id,
    lastRun: schedule.lastBackup || null,
    successfulBackups: schedule.successfulBackups,
    failedBackups: schedule.failedBackups,
    nextRun: schedule.nextBackup
  }))
}

/**
 * Manually trigger a scheduled backup
 *
 * @param scheduleId - Schedule ID to run
 * @returns Backup result
 */
export async function triggerScheduledBackup(scheduleId: string): Promise<{
  success: boolean
  backupId?: string
  error?: string
}> {
  const schedules = await getSchedules()
  const schedule = schedules.get(scheduleId)

  if (!schedule) {
    throw new StorageError(`Schedule not found: ${scheduleId}`, {
      context: { scheduleId }
    })
  }

  if (!schedule.enabled) {
    throw new StorageError(`Schedule is disabled: ${scheduleId}`, {
      context: { scheduleId }
    })
  }

  console.log(`[Backup Scheduler] Manually triggered: ${scheduleId}`)
  return await runScheduledBackup(schedule)
}
