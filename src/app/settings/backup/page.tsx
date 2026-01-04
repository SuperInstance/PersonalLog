/**
 * Backup Dashboard
 *
 * Comprehensive UI for managing backups, scheduling, and restoration.
 */

'use client'

import { useState, useEffect } from 'react'
import {
  createBackup,
  restoreBackup,
  deleteBackupById,
  getStatistics,
  downloadBackup,
  restoreFromUploadedFile,
  listBackups,
  Backup,
  BackupStatistics,
  RestoreResult,
  BackupProgress,
  RestoreProgress,
  RestorePreview,
  createSchedule,
  getSchedules,
  deleteSchedule,
  setScheduleEnabled,
  triggerScheduledBackup,
  BackupSchedule,
  formatBytes
} from '@/lib/backup'

export default function BackupDashboard() {
  // State
  const [backups, setBackups] = useState<Backup[]>([])
  const [statistics, setStatistics] = useState<BackupStatistics | null>(null)
  const [schedules, setSchedules] = useState<BackupSchedule[]>([])
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null)
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [activeTab, setActiveTab] = useState<'backups' | 'schedules' | 'upload'>('backups')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [showRestorePreview, setShowRestorePreview] = useState(false)
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null)
  const [progress, setProgress] = useState<BackupProgress | RestoreProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [backupsList, stats, schedulesList] = await Promise.all([
        listBackups(),
        getStatistics(),
        getSchedules()
      ])

      setBackups(backupsList)
      setStatistics(stats)
      setSchedules(Array.from(schedulesList.values()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups')
      console.error('Failed to load backups:', err)
    }
  }

  // Create backup
  const handleCreateBackup = async (type: 'full' | 'incremental') => {
    setIsCreatingBackup(true)
    setError(null)

    try {
      const backup = await createBackup({
        type,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} backup ${new Date().toLocaleString()}`,
        compress: true,
        onProgress: setProgress
      })

      await loadData()
      setIsCreatingBackup(false)
      setProgress(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup')
      setIsCreatingBackup(false)
      setProgress(null)
    }
  }

  // Restore backup
  const handleRestoreBackup = async (backupId: string) => {
    setShowRestorePreview(false)
    setIsRestoring(true)
    setError(null)
    setProgress(null)

    try {
      const result = await restoreBackup(backupId, {
        createPreRestoreBackup: true,
        verifyBeforeRestore: true,
        onConfirm: async (preview) => {
          setRestorePreview(preview)
          setShowRestorePreview(true)
          return false // Don't restore yet, wait for confirmation
        }
      })

      // If we got here without preview, restore was successful
      if (result.success) {
        await loadData()
        setIsRestoring(false)
        alert('Backup restored successfully!')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore backup')
      setIsRestoring(false)
    }
  }

  // Confirm restore
  const handleConfirmRestore = async () => {
    if (!restorePreview) return

    setShowRestorePreview(false)
    setIsRestoring(true)

    try {
      const result = await restoreBackup(restorePreview.backupId, {
        createPreRestoreBackup: true,
        verifyBeforeRestore: true,
        onProgress: setProgress
      })

      await loadData()
      setIsRestoring(false)
      setProgress(null)

      if (result.success) {
        alert(`Restore completed! ${result.itemsRestored.conversations} conversations, ${result.itemsRestored.messages} messages restored.`)
      } else {
        alert(`Restore completed with errors: ${result.errors.map(e => e.message).join(', ')}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore backup')
      setIsRestoring(false)
      setProgress(null)
    }
  }

  // Delete backup
  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
      return
    }

    try {
      await deleteBackupById(backupId)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete backup')
    }
  }

  // Download backup
  const handleDownloadBackup = async (backupId: string) => {
    try {
      const blob = await downloadBackup(backupId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${backupId}.json${blob.type.includes('gzip') ? '.gz' : ''}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download backup')
    }
  }

  // Upload and restore
  const handleUploadRestore = async () => {
    if (!uploadFile) return

    setIsRestoring(true)
    setError(null)

    try {
      const result = await restoreFromUploadedFile(uploadFile, {
        createPreRestoreBackup: true,
        verifyBeforeRestore: true,
        onProgress: setProgress
      })

      await loadData()
      setIsRestoring(false)
      setUploadFile(null)

      if (result.success) {
        alert('Backup uploaded and restored successfully!')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore from file')
      setIsRestoring(false)
    }
  }

  // Create schedule
  const handleCreateSchedule = async (interval: 'daily' | 'weekly' | 'monthly') => {
    try {
      await createSchedule(interval, {
        timeOfDay: '02:00',
        backupType: 'full',
        retentionCount: 7,
        compress: true
      })

      await loadData()
      alert(`Created ${interval} backup schedule`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule')
    }
  }

  // Delete schedule
  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      await deleteSchedule(scheduleId)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete schedule')
    }
  }

  // Toggle schedule
  const handleToggleSchedule = async (scheduleId: string, enabled: boolean) => {
    try {
      await setScheduleEnabled(scheduleId, enabled)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schedule')
    }
  }

  // Trigger scheduled backup
  const handleTriggerBackup = async (scheduleId: string) => {
    try {
      const result = await triggerScheduledBackup(scheduleId)
      if (result.success) {
        alert('Scheduled backup completed successfully')
        await loadData()
      } else {
        alert(`Backup failed: ${result.error}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger backup')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Backup & Restore</h1>
        <p className="text-gray-600">
          Create, manage, and restore backups of all your data
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}

      {/* Progress Display */}
      {progress && (
        <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
          <div className="flex items-center justify-between mb-2">
            <span>{progress.message}</span>
            <span>{progress.progress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-blue-600">{statistics.totalBackups}</div>
            <div className="text-sm text-gray-600">Total Backups</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-green-600">{formatBytes(statistics.totalSize)}</div>
            <div className="text-sm text-gray-600">Total Size</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-purple-600">{statistics.byType.full.count}</div>
            <div className="text-sm text-gray-600">Full Backups</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-orange-600">{statistics.storageUsage.percentage.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Storage Used</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('backups')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'backups'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Backups
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'schedules'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Schedules
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Upload & Restore
          </button>
        </nav>
      </div>

      {/* Backups Tab */}
      {activeTab === 'backups' && (
        <div>
          {/* Create Backup Buttons */}
          <div className="mb-6 flex space-x-4">
            <button
              onClick={() => handleCreateBackup('full')}
              disabled={isCreatingBackup}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreatingBackup ? 'Creating...' : 'Create Full Backup'}
            </button>
            <button
              onClick={() => handleCreateBackup('incremental')}
              disabled={isCreatingBackup}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isCreatingBackup ? 'Creating...' : 'Create Incremental Backup'}
            </button>
          </div>

          {/* Backups List */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {backups.map((backup) => (
                    <tr key={backup.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{backup.name}</div>
                        {backup.description && (
                          <div className="text-sm text-gray-500">{backup.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(backup.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          backup.type === 'full' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {backup.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatBytes(backup.compressedSize)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleRestoreBackup(backup.id)}
                          disabled={isRestoring}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handleDownloadBackup(backup.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(backup.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {backups.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        No backups yet. Create your first backup above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Schedules Tab */}
      {activeTab === 'schedules' && (
        <div>
          {/* Create Schedule Buttons */}
          <div className="mb-6 flex space-x-4">
            <button
              onClick={() => handleCreateSchedule('daily')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Daily Schedule
            </button>
            <button
              onClick={() => handleCreateSchedule('weekly')}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Create Weekly Schedule
            </button>
            <button
              onClick={() => handleCreateSchedule('monthly')}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Create Monthly Schedule
            </button>
          </div>

          {/* Schedules List */}
          <div className="space-y-4">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">
                      {schedule.interval.charAt(0).toUpperCase() + schedule.interval.slice(1)} Backup
                    </h3>
                    <p className="text-sm text-gray-500">
                      {schedule.timeOfDay} · {schedule.backupType} · Keeps {schedule.retentionCount} backups
                    </p>
                    <p className="text-sm text-gray-500">
                      Next: {new Date(schedule.nextBackup).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      Success: {schedule.successfulBackups} · Failed: {schedule.failedBackups}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={schedule.enabled}
                        onChange={(e) => handleToggleSchedule(schedule.id, e.target.checked)}
                        className="mr-2"
                      />
                      Enabled
                    </label>
                    <button
                      onClick={() => handleTriggerBackup(schedule.id)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Run Now
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {schedules.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No schedules yet. Create a schedule above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="bg-white p-8 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Upload Backup File</h2>
          <p className="text-gray-600 mb-6">
            Upload a backup file to restore your data. This will create a pre-restore backup automatically.
          </p>

          <div className="mb-6">
            <input
              type="file"
              accept=".json,.json.gz,.gz"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {uploadFile && (
            <div className="mb-6 p-4 bg-gray-50 rounded">
              <div className="text-sm">
                <div><strong>File:</strong> {uploadFile.name}</div>
                <div><strong>Size:</strong> {formatBytes(uploadFile.size)}</div>
                <div><strong>Type:</strong> {uploadFile.type || 'Unknown'}</div>
              </div>
            </div>
          )}

          <button
            onClick={handleUploadRestore}
            disabled={!uploadFile || isRestoring}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isRestoring ? 'Restoring...' : 'Upload & Restore'}
          </button>
        </div>
      )}

      {/* Restore Preview Modal */}
      {showRestorePreview && restorePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Confirm Restore</h2>

            <div className="space-y-4 mb-6">
              <div>
                <strong>Backup:</strong> {restorePreview.backupName}
              </div>
              <div>
                <strong>Date:</strong> {new Date(restorePreview.backupDate).toLocaleString()}
              </div>
              <div>
                <strong>Size:</strong> {formatBytes(restorePreview.backupSize)}
              </div>
              <div>
                <strong>Type:</strong> {restorePreview.backupType}
              </div>

              <div className="mt-4">
                <strong>Items to restore:</strong>
                <ul className="list-disc list-inside mt-2 text-sm">
                  <li>{restorePreview.itemsToRestore.conversations} conversations</li>
                  <li>{restorePreview.itemsToRestore.messages} messages</li>
                  <li>{restorePreview.itemsToRestore.knowledge} knowledge entries</li>
                  <li>{restorePreview.itemsToRestore.settings} settings</li>
                  <li>{restorePreview.itemsToRestore.analytics} analytics events</li>
                  <li>{restorePreview.itemsToRestore.personalization} personalization items</li>
                </ul>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <strong>Warning:</strong> This will overwrite your current data.
                {restorePreview.preRestoreBackup && (
                  <span> A pre-restore backup will be created automatically.</span>
                )}
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isRestoring ? 'Restoring...' : 'Confirm Restore'}
              </button>
              <button
                onClick={() => setShowRestorePreview(false)}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
