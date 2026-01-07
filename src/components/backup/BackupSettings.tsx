/**
 * Backup Settings Component
 *
 * Comprehensive settings interface for backup, recovery, snapshots,
 * and integrity checking.
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Tabs, TabsList, Tab, TabsPanel } from '@/components/ui/Tabs'
import { BackupRecovery } from './BackupRecovery'
import { RollbackControls } from './RollbackControls'
import { IntegrityReportView } from './IntegrityReport'
import {
  Backup,
  listBackups,
  deleteBackup,
  getStatistics,
  createBackup,
  BackupProgress,
  RestoreResult,
  IntegrityReport,
  SnapshotMetadata,
  RollbackResult
} from '@/lib/backup'
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Shield,
  Clock,
  HardDrive,
  CheckCircle
} from 'lucide-react'

type Tab = 'backups' | 'snapshots' | 'integrity'

export function BackupSettings() {
  const [activeTab, setActiveTab] = useState<Tab>('backups')
  const [backups, setBackups] = useState<Backup[]>([])
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null)
  const [loading, setLoading] = useState(true)
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [backupProgress, setBackupProgress] = useState<BackupProgress | null>(null)
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null)
  const [integrityReport, setIntegrityReport] = useState<IntegrityReport | null>(null)
  const [checkingIntegrity, setCheckingIntegrity] = useState(false)
  const [statistics, setStatistics] = useState<any>(null)

  // Load backups
  const loadBackups = useCallback(async () => {
    setLoading(true)
    try {
      const [loadedBackups, stats] = await Promise.all([
        listBackups(),
        getStatistics()
      ])
      setBackups(loadedBackups)
      setStatistics(stats)
    } catch (error) {
      console.error('Failed to load backups:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBackups()
  }, [loadBackups])

  // Create backup
  const handleCreateBackup = async () => {
    setCreatingBackup(true)
    setBackupProgress(null)

    try {
      await createBackup({
        name: `Manual backup - ${new Date().toLocaleString()}`,
        compress: true,
        onProgress: (progress) => {
          setBackupProgress(progress)
        }
      })

      await loadBackups()
      setBackupProgress(null)
    } catch (error) {
      console.error('Failed to create backup:', error)
    } finally {
      setCreatingBackup(false)
    }
  }

  // Delete backup
  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) {
      return
    }

    try {
      await deleteBackup(backupId)
      await loadBackups()
    } catch (error) {
      console.error('Failed to delete backup:', error)
    }
  }

  // Check integrity
  const handleCheckIntegrity = async (backup: Backup) => {
    setCheckingIntegrity(true)
    try {
      const { generateIntegrityReport } = await import('@/lib/backup/integrity')
      const report = await generateIntegrityReport(backup)
      setIntegrityReport(report)
      setActiveTab('integrity')
    } catch (error) {
      console.error('Failed to check integrity:', error)
    } finally {
      setCheckingIntegrity(false)
    }
  }

  // Handle restore complete
  const handleRestoreComplete = (result: RestoreResult) => {
    setRestoreResult(result)
    setSelectedBackup(null)
  }

  // Handle snapshot created
  const handleSnapshotCreated = (snapshot: SnapshotMetadata) => {
    console.log('Snapshot created:', snapshot)
  }

  // Handle rollback complete
  const handleRollbackComplete = (result: RollbackResult) => {
    console.log('Rollback completed:', result)
    // Reload backups as data may have changed
    loadBackups()
  }

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  // Render backups tab
  const renderBackupsTab = () => {
    return (
      <div className="space-y-4">
        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <Database className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
              <p className="text-2xl font-bold">{statistics.totalBackups}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Backups</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <HardDrive className="w-5 h-5 text-green-600 dark:text-green-400 mb-2" />
              <p className="text-2xl font-bold">{formatBytes(statistics.totalSize)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Size</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2" />
              <p className="text-2xl font-bold">
                {statistics.lastBackup
                  ? new Date(statistics.lastBackup).toLocaleDateString()
                  : 'Never'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Last Backup</p>
            </div>
          </div>
        )}

        {/* Create backup */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Backups</h3>
          <Button
            onClick={handleCreateBackup}
            disabled={creatingBackup}
          >
            <Database className="w-4 h-4 mr-2" />
            {creatingBackup ? 'Creating...' : 'Create Backup'}
          </Button>
        </div>

        {/* Backup progress */}
        {backupProgress && (
          <Alert variant="info">
            <AlertDescription>
              <div className="mb-2">{backupProgress.message}</div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${backupProgress.progress}%` }}
                />
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Backups list */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading backups...</div>
        ) : backups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No backups yet</p>
            <p className="text-sm">Create your first backup to protect your data</p>
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{backup.name}</h4>
                    {backup.isAutomatic && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                        Auto
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(backup.timestamp).toLocaleString()}
                    </span>
                    <span className="flex items-center">
                      <HardDrive className="w-3 h-3 mr-1" />
                      {formatBytes(backup.compressedSize)}
                    </span>
                  </div>
                  {backup.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {backup.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCheckIntegrity(backup)}
                    disabled={checkingIntegrity}
                  >
                    <Shield className="w-4 h-4 mr-1" />
                    Check
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedBackup(backup)}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteBackup(backup.id)}
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Restore UI */}
        {selectedBackup && (
          <div className="mt-4 border-t pt-4">
            <BackupRecovery
              backup={selectedBackup}
              onRestoreComplete={handleRestoreComplete}
              onCancel={() => setSelectedBackup(null)}
            />
          </div>
        )}

        {/* Restore result */}
        {restoreResult && restoreResult.success && (
          <Alert variant="success">
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              Backup restored successfully! {restoreResult.preRestoreBackupCreated && 'A pre-restore backup was created for safety.'}
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Backup & Recovery</h2>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Tab)}>
        <TabsList className="mb-4">
          <Tab value="backups">Backups</Tab>
          <Tab value="snapshots">Snapshots</Tab>
          <Tab value="integrity">Integrity</Tab>
        </TabsList>

        <TabsPanel value="backups">
          {renderBackupsTab()}
        </TabsPanel>

        <TabsPanel value="snapshots">
          <RollbackControls
            onSnapshotCreated={handleSnapshotCreated}
            onRollbackComplete={handleRollbackComplete}
          />
        </TabsPanel>

        <TabsPanel value="integrity">
          {integrityReport ? (
            <IntegrityReportView
              report={integrityReport}
              onDismiss={() => setIntegrityReport(null)}
              showDetails
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No integrity report yet</p>
              <p className="text-sm">Check a backup's integrity to see a detailed report</p>
            </div>
          )}
        </TabsPanel>
      </Tabs>
    </Card>
  )
}
