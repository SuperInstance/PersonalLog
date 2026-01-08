/**
 * Export Scheduler
 *
 * Manages automatic export schedules and triggers.
 * Runs periodic exports based on user-defined schedules.
 */

import { ExportSchedule } from './types'
import { getExportManager } from './manager'

// ============================================================================
// EXPORT SCHEDULER
// ============================================================================

export class ExportScheduler {
  private schedules: Map<string, NodeJS.Timeout> = new Map()
  private checkInterval: NodeJS.Timeout | null = null

  /**
   * Start the scheduler
   */
  start(): void {
    // Check every minute for due exports
    this.checkInterval = setInterval(() => {
      this.checkDueExports()
    }, 60 * 1000) as unknown as NodeJS.Timeout

    // Load and schedule existing schedules
    this.loadSchedules()
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    // Clear all schedule timeouts
    this.schedules.forEach(timeout => clearTimeout(timeout))
    this.schedules.clear()

    // Clear check interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  /**
   * Add a new schedule
   */
  addSchedule(schedule: ExportSchedule): void {
    if (!schedule.active) {
      return
    }

    // Calculate initial delay
    const delay = this.calculateDelay(schedule)

    // Set timeout
    const timeout = setTimeout(() => {
      this.executeSchedule(schedule)
      this.reschedule(schedule)
    }, delay) as unknown as NodeJS.Timeout

    this.schedules.set(schedule.id, timeout)

    console.log(`[ExportScheduler] Scheduled ${schedule.name} for ${new Date(Date.now() + delay).toISOString()}`)
  }

  /**
   * Remove a schedule
   */
  removeSchedule(scheduleId: string): void {
    const timeout = this.schedules.get(scheduleId)
    if (timeout) {
      clearTimeout(timeout)
      this.schedules.delete(scheduleId)
    }
  }

  /**
   * Update a schedule
   */
  updateSchedule(schedule: ExportSchedule): void {
    // Remove existing timeout
    this.removeSchedule(schedule.id)

    // Add updated schedule
    if (schedule.active) {
      this.addSchedule(schedule)
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Load schedules from storage and set them up
   */
  private loadSchedules(): void {
    try {
      const data = localStorage.getItem('exportSchedules')
      if (!data) return

      const schedules: ExportSchedule[] = JSON.parse(data)

      for (const schedule of schedules) {
        if (schedule.active) {
          this.addSchedule(schedule)
        }
      }

      console.log(`[ExportScheduler] Loaded ${schedules.length} schedules`)
    } catch (error) {
      console.error('[ExportScheduler] Error loading schedules:', error)
    }
  }

  /**
   * Check for exports that are due
   */
  private checkDueExports(): void {
    const manager = getExportManager()
    const schedules = manager.getSchedules()
    const now = Date.now()

    for (const schedule of schedules) {
      if (!schedule.active) continue

      const nextRun = new Date(schedule.nextRunAt).getTime()

      if (nextRun <= now) {
        this.executeSchedule(schedule)
        this.reschedule(schedule)
      }
    }
  }

  /**
   * Execute a scheduled export
   */
  private async executeSchedule(schedule: ExportSchedule): Promise<void> {
    console.log(`[ExportScheduler] Executing scheduled export: ${schedule.name}`)

    try {
      const manager = getExportManager()

      // Perform export
      await manager.exportData(schedule.options)

      // Update schedule stats
      schedule.lastRunAt = new Date().toISOString()
      schedule.runCount++

      // Save updated schedule
      await manager.updateSchedule(schedule.id, schedule)

      console.log(`[ExportScheduler] Export completed: ${schedule.name}`)
    } catch (error: any) {
      console.error(`[ExportScheduler] Export failed: ${schedule.name}`, error)

      // Update schedule with error
      schedule.lastRunAt = new Date().toISOString()
      schedule.runCount++

      const manager = getExportManager()
      await manager.updateSchedule(schedule.id, schedule)
    }
  }

  /**
   * Reschedule after execution
   */
  private reschedule(schedule: ExportSchedule): void {
    // Remove current timeout
    this.removeSchedule(schedule.id)

    // Calculate next run time
    const delay = this.calculateNextDelay(schedule)
    const nextRunAt = new Date(Date.now() + delay).toISOString()

    // Update schedule
    schedule.nextRunAt = nextRunAt

    // Set new timeout
    if (schedule.active) {
      const timeout = setTimeout(() => {
        this.executeSchedule(schedule)
        this.reschedule(schedule)
      }, delay) as unknown as NodeJS.Timeout

      this.schedules.set(schedule.id, timeout)
    }
  }

  /**
   * Calculate delay until first run
   */
  private calculateDelay(schedule: ExportSchedule): number {
    const nextRun = new Date(schedule.nextRunAt).getTime()
    const now = Date.now()
    return Math.max(0, nextRun - now)
  }

  /**
   * Calculate delay for recurring runs
   */
  private calculateNextDelay(schedule: ExportSchedule): number {
    const config = schedule.config

    switch (schedule.type) {
      case 'once':
        return Infinity // Don't reschedule

      case 'daily':
        return 24 * 60 * 60 * 1000

      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000

      case 'monthly':
        // Approximate as 30 days
        return 30 * 24 * 60 * 60 * 1000

      case 'custom':
        if (config.intervalMinutes) {
          return config.intervalMinutes * 60 * 1000
        }
        return 24 * 60 * 60 * 1000 // Default to daily

      default:
        return 24 * 60 * 60 * 1000
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let scheduler: ExportScheduler | null = null

/**
 * Get the export scheduler singleton
 */
export function getExportScheduler(): ExportScheduler {
  if (!scheduler) {
    scheduler = new ExportScheduler()
    scheduler.start()
  }
  return scheduler
}

/**
 * Stop the scheduler (call when app is shutting down)
 */
export function stopExportScheduler(): void {
  if (scheduler) {
    scheduler.stop()
    scheduler = null
  }
}
