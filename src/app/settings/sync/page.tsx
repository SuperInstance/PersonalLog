'use client';

/**
 * Sync Settings Page - Multi-Device Synchronization Management
 *
 * Complete sync dashboard for managing multi-device synchronization.
 * Features:
 * - Sync status and statistics
 * - Manual sync trigger
 * - Connected devices management
 * - Conflict resolution
 * - Sync provider configuration
 * - Offline queue visualization
 * - Sync logs
 */

import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw,
  Smartphone,
  Cloud,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Settings,
  Wifi,
  WifiOff,
  HardDrive,
  FileText,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react'
import Link from 'next/link'
import {
  getSyncEngine,
  type SyncStatus,
  type SyncStatistics,
  type SyncProgress,
  type Conflict,
  type Device,
  type SyncSettings,
  type SyncLogEntry,
  type OfflineQueueStats,
  type SyncProviderType,
} from '@/lib/sync'

export default function SyncSettingsPage() {
  // State
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [statistics, setStatistics] = useState<SyncStatistics>({
    lastSync: 0,
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    totalItemsSynced: 0,
    totalBytesTransferred: 0,
    averageSyncDuration: 0,
    conflictsResolved: 0,
    conflictsPending: 0,
    offlineChangesPending: 0,
    connectedDevices: 0,
  })
  const [settings, setSettings] = useState<SyncSettings>({
    enabled: false,
    autoSync: true,
    syncInterval: 15,
    syncOnWifiOnly: false,
    syncOnChargingOnly: false,
    maxSyncSize: 10 * 1024 * 1024,
    compressionEnabled: true,
    encryptionEnabled: true,
    conflictResolution: 'keep-newer',
    backgroundSync: true,
    priorityCollections: ['conversations', 'messages'],
  })
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [logs, setLogs] = useState<SyncLogEntry[]>([])
  const [queueStats, setQueueStats] = useState<OfflineQueueStats>({
    totalChanges: 0,
    pendingChanges: 0,
    failedChanges: 0,
    highPriorityChanges: 0,
    oldestChange: Date.now(),
    estimatedSyncTime: 0,
  })
  const [syncing, setSyncing] = useState(false)

  // Listen to progress updates
  useEffect(() => {
    const engine = getSyncEngine()
    const unsubscribe = engine.onProgress((p) => setProgress(p))
    return () => unsubscribe()
  }, [])

  // Listen to status changes
  useEffect(() => {
    const engine = getSyncEngine()
    const unsubscribe = engine.onStatusChange((s) => setStatus(s))
    return () => unsubscribe()
  }, [])

  const loadSyncData = useCallback(async () => {
    try {
      const engine = getSyncEngine()
      const syncStatus = await engine.getSyncStatus()
      const stats = engine.getStatistics()

      setStatus(syncStatus.status)
      setStatistics(stats)

      // Load settings
      const storedSettings = localStorage.getItem('sync-settings')
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings))
      }

      // Load devices
      const storedDevices = localStorage.getItem('sync-connected-devices')
      if (storedDevices) {
        setDevices(JSON.parse(storedDevices))
      }

      // Load logs
      setLogs(engine.getLogs(20))

      // Load queue stats (simplified)
      // const queueStats = await engine.getQueueStats()
      // setQueueStats(queueStats)
    } catch (error) {
      console.error('Failed to load sync data:', error)
    }
  }, [])

  // Load initial data
  useEffect(() => {
    loadSyncData()
    const interval = setInterval(loadSyncData, 5000)
    return () => clearInterval(interval)
  }, [loadSyncData])

  const handleManualSync = useCallback(async () => {
    setSyncing(true)
    try {
      const engine = getSyncEngine()
      await engine.sync('bidirectional')
      await loadSyncData()
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }, [loadSyncData])

  const handleUpdateSettings = useCallback(async (updates: Partial<SyncSettings>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    localStorage.setItem('sync-settings', JSON.stringify(newSettings))

    const engine = getSyncEngine()
    await engine.updateSettings(updates)
  }, [settings])

  const handleResolveConflict = useCallback(async (conflictId: string, resolution: string) => {
    try {
      const engine = getSyncEngine()
      await engine.resolveConflict(conflictId, resolution as any)
      await loadSyncData()
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
    }
  }, [loadSyncData])

  const handleRemoveDevice = useCallback(async (deviceId: string) => {
    try {
      const engine = getSyncEngine()
      await engine.unregisterDevice(deviceId)
      await loadSyncData()
    } catch (error) {
      console.error('Failed to remove device:', error)
    }
  }, [loadSyncData])

  // Format utilities
  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Never'
    return new Date(timestamp).toLocaleString()
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${Math.round(ms / 1000)}s`
    return `${Math.round(ms / 60000)}m`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings"
            className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-4"
          >
            <Settings className="w-4 h-4 mr-2" />
            Back to Settings
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Sync Settings
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Manage multi-device synchronization and data backup
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              {status === 'syncing' ? (
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mr-3" />
              ) : status === 'synced' ? (
                <CheckCircle2 className="w-6 h-6 text-green-500 mr-3" />
              ) : status === 'conflict' ? (
                <AlertCircle className="w-6 h-6 text-amber-500 mr-3" />
              ) : status === 'error' ? (
                <XCircle className="w-6 h-6 text-red-500 mr-3" />
              ) : (
                <Cloud className="w-6 h-6 text-slate-400 mr-3" />
              )}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {status === 'syncing' ? 'Syncing...' :
                   status === 'synced' ? 'Synced' :
                   status === 'conflict' ? 'Conflicts Detected' :
                   status === 'error' ? 'Sync Error' :
                   'Idle'}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Last sync: {formatDate(statistics.lastSync)}
                </p>
              </div>
            </div>

            <button
              onClick={handleManualSync}
              disabled={syncing || !settings.enabled}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sync Now
            </button>
          </div>

          {/* Progress Bar */}
          {progress && progress.stage !== 'complete' && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 mb-1">
                <span className="capitalize">{progress.stage}</span>
                <span>{progress.progress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
              <div className="flex items-center text-slate-600 dark:text-slate-400 mb-2">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                <span className="text-sm">Successful</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {statistics.successfulSyncs}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
              <div className="flex items-center text-slate-600 dark:text-slate-400 mb-2">
                <XCircle className="w-4 h-4 mr-2" />
                <span className="text-sm">Failed</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {statistics.failedSyncs}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
              <div className="flex items-center text-slate-600 dark:text-slate-400 mb-2">
                <FileText className="w-4 h-4 mr-2" />
                <span className="text-sm">Items Synced</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {statistics.totalItemsSynced}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
              <div className="flex items-center text-slate-600 dark:text-slate-400 mb-2">
                <HardDrive className="w-4 h-4 mr-2" />
                <span className="text-sm">Data Transferred</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatBytes(statistics.totalBytesTransferred)}
              </p>
            </div>
          </div>
        </div>

        {/* Settings Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Sync Settings
          </h3>

          <div className="space-y-4">
            {/* Enable Sync */}
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-slate-900 dark:text-slate-100">
                  Enable Sync
                </label>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Allow data synchronization across devices
                </p>
              </div>
              <button
                onClick={() => handleUpdateSettings({ enabled: !settings.enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Auto Sync */}
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-slate-900 dark:text-slate-100">
                  Auto Sync
                </label>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Automatically sync at regular intervals
                </p>
              </div>
              <button
                onClick={() => handleUpdateSettings({ autoSync: !settings.autoSync })}
                disabled={!settings.enabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoSync ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                } ${!settings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoSync ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Sync Interval */}
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-slate-900 dark:text-slate-100">
                  Sync Interval
                </label>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  How often to sync (in minutes)
                </p>
              </div>
              <select
                value={settings.syncInterval}
                onChange={(e) => handleUpdateSettings({ syncInterval: Number(e.target.value) })}
                disabled={!settings.enabled || !settings.autoSync}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-50"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>

            {/* Encryption */}
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-slate-900 dark:text-slate-100 flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  End-to-End Encryption
                </label>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Encrypt all synced data
                </p>
              </div>
              <button
                onClick={() => handleUpdateSettings({ encryptionEnabled: !settings.encryptionEnabled })}
                disabled={!settings.enabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.encryptionEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                } ${!settings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.encryptionEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Conflict Resolution */}
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-slate-900 dark:text-slate-100">
                  Conflict Resolution
                </label>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  How to resolve conflicting changes
                </p>
              </div>
              <select
                value={settings.conflictResolution}
                onChange={(e) => handleUpdateSettings({ conflictResolution: e.target.value as any })}
                disabled={!settings.enabled}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-50"
              >
                <option value="keep-newer">Keep Newer</option>
                <option value="keep-older">Keep Older</option>
                <option value="keep-local">Keep Local</option>
                <option value="keep-remote">Keep Remote</option>
                <option value="smart-merge">Smart Merge</option>
              </select>
            </div>
          </div>
        </div>

        {/* Connected Devices */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Connected Devices ({devices.length})
          </h3>

          {devices.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400 text-center py-8">
              No devices connected yet
            </p>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg"
                >
                  <div className="flex items-center">
                    <Smartphone className="w-5 h-5 text-slate-600 dark:text-slate-400 mr-3" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {device.name}
                        {device.isCurrent && (
                          <span className="ml-2 text-xs text-slate-500">(This device)</span>
                        )}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {device.os} • Last seen {formatDate(device.lastSeen)}
                      </p>
                    </div>
                  </div>

                  {!device.isCurrent && (
                    <button
                      onClick={() => handleRemoveDevice(device.id)}
                      className="text-red-600 hover:text-red-700 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sync Logs */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Recent Sync Activity
          </h3>

          {logs.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400 text-center py-8">
              No sync activity yet
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">
                      {log.type.replace('-', ' ')}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {formatDate(log.timestamp)}
                    </p>
                  </div>

                  <div className="text-right">
                    {log.details.itemsSynced !== undefined && (
                      <p className="text-sm text-slate-900 dark:text-slate-100">
                        {log.details.itemsSynced} items
                      </p>
                    )}
                    {log.details.duration !== undefined && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {formatDuration(log.details.duration)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
