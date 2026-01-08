/**
 * Scheduling Example
 *
 * Demonstrates automatic export scheduling.
 */

import { getExportManager } from '@superinstance/universal-import-export'

async function schedulingExample() {
  const exportManager = getExportManager()

  // Sample data provider
  const dataProvider = {
    async getConversations() {
      return [
        {
          id: 'conv-1',
          title: 'Scheduled Export Example',
          type: 'ai-assisted',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
    },
    async getMessages(_id: string) {
      return []
    },
    async getKnowledge() {
      return []
    },
    async getContacts() {
      return []
    },
    async getSettings() {
      return {}
    },
  }

  // Example 1: Schedule daily backup at 2 AM
  console.log('Example 1: Daily backup')
  const dailyScheduleId = await exportManager.scheduleExport({
    name: 'Daily Backup',
    type: 'daily',
    format: 'json',
    scope: 'all',
    config: {
      timeOfDay: '02:00',
      maxExports: 30, // Keep last 30 exports
    },
    options: {
      format: 'json',
      scope: 'all',
      dataProvider,
    },
    active: true,
    nextRunAt: new Date().toISOString(),
  })

  console.log(`Daily schedule created: ${dailyScheduleId}`)

  // Example 2: Schedule weekly export
  console.log('\nExample 2: Weekly export')
  const weeklyScheduleId = await exportManager.scheduleExport({
    name: 'Weekly Knowledge Export',
    type: 'weekly',
    format: 'markdown',
    scope: 'knowledge',
    config: {
      maxExports: 52, // Keep one year of exports
    },
    options: {
      format: 'markdown',
      scope: 'knowledge',
      dataProvider,
    },
    active: true,
    nextRunAt: new Date().toISOString(),
  })

  console.log(`Weekly schedule created: ${weeklyScheduleId}`)

  // Example 3: Schedule custom interval export
  console.log('\nExample 3: Custom interval (every 6 hours)')
  const customScheduleId = await exportManager.scheduleExport({
    name: 'Frequent Backup',
    type: 'custom',
    format: 'json',
    scope: 'conversations',
    config: {
      intervalMinutes: 360, // 6 hours
      maxExports: 28, // Keep one week of exports
    },
    options: {
      format: 'json',
      scope: 'conversations',
      dataProvider,
    },
    active: true,
    nextRunAt: new Date().toISOString(),
  })

  console.log(`Custom schedule created: ${customScheduleId}`)

  // Example 4: List all schedules
  console.log('\nExample 4: List all schedules')
  const schedules = exportManager.getSchedules()
  console.log(`Total schedules: ${schedules.length}`)
  for (const schedule of schedules) {
    console.log(`  - ${schedule.name} (${schedule.type})`)
    console.log(`    Next run: ${schedule.nextRunAt}`)
    console.log(`    Active: ${schedule.active}`)
  }

  // Example 5: Update a schedule
  console.log('\nExample 5: Update schedule')
  await exportManager.updateSchedule(dailyScheduleId, {
    active: false, // Pause the schedule
  })
  console.log(`Schedule ${dailyScheduleId} paused`)

  // Example 6: Delete a schedule
  console.log('\nExample 6: Delete schedule')
  await exportManager.deleteSchedule(weeklyScheduleId)
  console.log(`Schedule ${weeklyScheduleId} deleted`)

  // Example 7: Export history
  console.log('\nExample 7: Export history')
  const history = await exportManager.getExportHistory(10)
  console.log(`Recent exports: ${history.length}`)
  for (const record of history.slice(0, 5)) {
    console.log(`  - ${record.format} / ${record.scope}`)
    console.log(`    Success: ${record.success}`)
    console.log(`    Date: ${record.createdAt}`)
    if (record.stats) {
      console.log(`    Items: ${record.stats.conversations} conversations`)
    }
  }

  // Example 8: Clear export history
  console.log('\nExample 8: Clear history')
  await exportManager.clearExportHistory()
  console.log('Export history cleared')
}

// Run the example
schedulingExample().catch(console.error)
