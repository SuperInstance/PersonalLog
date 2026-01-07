/**
 * Backup Recovery UI Component
 *
 * User interface for restoring backups with preview, confirmation,
 * and progress tracking.
 */

'use client'

import { useState, useCallback } from 'react'
import { Backup, RestorePreview, RestoreResult, RestoreProgress } from '@/lib/backup/types'
import { restoreFromBackup, previewRestore } from '@/lib/backup/recovery'
import { generateIntegrityReport } from '@/lib/backup/integrity'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Progress } from '@/components/ui/Progress'
import { formatBytes } from '@/lib/backup/compression'
import { AlertCircle, CheckCircle, Clock, Database, ArrowLeft } from 'lucide-react'

interface BackupRecoveryProps {
  backup: Backup
  onRestoreComplete?: (result: RestoreResult) => void
  onCancel?: () => void
}

interface RestoreState {
  stage: 'preview' | 'confirming' | 'restoring' | 'completed' | 'error'
  preview?: RestorePreview
  progress?: RestoreProgress
  result?: RestoreResult
  error?: string
  integrityChecked?: boolean
  integrityScore?: number
}

export function BackupRecovery({ backup, onRestoreComplete, onCancel }: BackupRecoveryProps) {
  const [state, setState] = useState<RestoreState>({
    stage: 'preview'
  })

  const [loading, setLoading] = useState(false)

  // Load preview
  const loadPreview = useCallback(async () => {
    setLoading(true)
    try {
      const [preview, integrityReport] = await Promise.all([
        previewRestore(backup.id),
        generateIntegrityReport(backup)
      ])

      setState(prev => ({
        ...prev,
        stage: 'confirming',
        preview,
        integrityChecked: true,
        integrityScore: integrityReport.score
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        stage: 'error',
        error: error instanceof Error ? error.message : 'Failed to load backup preview'
      }))
    } finally {
      setLoading(false)
    }
  }, [backup.id])

  // Confirm and start restore
  const startRestore = useCallback(async () => {
    setState(prev => ({ ...prev, stage: 'restoring' }))

    const result = await restoreFromBackup(backup.id, {
      createPreRestoreBackup: true,
      verifyBeforeRestore: true,
      onProgress: (progress) => {
        setState(prev => ({ ...prev, progress }))
      }
    })

    setState(prev => ({
      ...prev,
      stage: result.success ? 'completed' : 'error',
      result
    }))

    if (result.success && onRestoreComplete) {
      onRestoreComplete(result)
    }
  }, [backup.id, onRestoreComplete])

  // Format duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${Math.round(ms / 1000)}s`
    return `${Math.round(ms / 60000)}m`
  }

  // Render preview stage
  if (state.stage === 'preview') {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Restore Backup</h3>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Backup:</strong> {backup.name}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Date:</strong> {new Date(backup.timestamp).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Size:</strong> {formatBytes(backup.size)}
            </p>
          </div>

          <Button
            onClick={loadPreview}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Loading...' : 'Preview Restore'}
          </Button>
        </div>
      </Card>
    )
  }

  // Render confirming stage
  if (state.stage === 'confirming' && state.preview) {
    const preview = state.preview
    const items = [
      { label: 'Conversations', value: preview.itemsToRestore.conversations },
      { label: 'Messages', value: preview.itemsToRestore.messages },
      { label: 'Knowledge entries', value: preview.itemsToRestore.knowledge },
      { label: 'Settings', value: preview.itemsToRestore.settings },
      { label: 'Analytics events', value: preview.itemsToRestore.analytics },
      { label: 'Personalization items', value: preview.itemsToRestore.personalization }
    ]

    const totalItems = items.reduce((sum, item) => sum + item.value, 0)

    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Confirm Restore</h3>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {/* Integrity score */}
          {state.integrityChecked && state.integrityScore !== undefined && (
            <Alert
              variant={state.integrityScore >= 90 ? 'success' : state.integrityScore >= 70 ? 'warning' : 'error'}
            >
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>Integrity Check:</strong> {state.integrityScore}/100
                {state.integrityScore >= 90
                  ? ' - Backup is healthy and safe to restore'
                  : state.integrityScore >= 70
                  ? ' - Backup has minor issues but should be safe'
                  : ' - Backup has issues, proceed with caution'
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Items to restore */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Items to Restore: {totalItems}</h4>
            <div className="space-y-1">
              {items.map(item => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{item.label}:</span>
                  <span className="font-medium">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Estimated time */}
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4 mr-2" />
            <span>Estimated time: {formatDuration(preview.estimatedDuration)}</span>
          </div>

          {/* Pre-restore backup notice */}
          {preview.preRestoreBackup && (
            <Alert variant="info">
              <Database className="w-4 h-4" />
              <AlertDescription>
                A safety backup will be created before restoring. You can always rollback if needed.
              </AlertDescription>
            </Alert>
          )}

          {/* Warning */}
          <Alert variant="warning">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Restoring will replace your current data. Make sure you have a backup if needed.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={startRestore}
              className="flex-1"
            >
              Restore Backup
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>
    )
  }

  // Render restoring stage
  if (state.stage === 'restoring' && state.progress) {
    const progress = state.progress

    const stageMessages = {
      verifying: 'Verifying backup integrity...',
      preparing: 'Preparing restore...',
      restoring: 'Restoring data...',
      validating: 'Validating restore...',
      completed: 'Restore completed!'
    }

    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Restoring Backup</h3>

        <div className="space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                {stageMessages[progress.stage]}
              </span>
              <span className="font-medium">{progress.progress}%</span>
            </div>
            <Progress value={progress.progress} />
          </div>

          {/* Category info */}
          {progress.category && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Processing: {progress.category}
            </div>
          )}

          {/* Items info */}
          {/* {progress.itemsProcessed !== undefined && progress.totalItems !== undefined && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {progress.itemsProcessed} / {progress.totalItems} items
            </div>
          )} */}
        </div>
      </Card>
    )
  }

  // Render completed stage
  if (state.stage === 'completed' && state.result) {
    const result = state.result
    const items = result.itemsRestored

    return (
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
          <h3 className="text-lg font-semibold">Restore Completed</h3>
        </div>

        <div className="space-y-4">
          {/* Success message */}
          <Alert variant="success">
            <AlertDescription>
              Backup restored successfully in {formatDuration(result.duration)}!
            </AlertDescription>
          </Alert>

          {/* Restored items */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Items Restored</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Conversations:</span>
                <span className="font-medium">{items.conversations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Messages:</span>
                <span className="font-medium">{items.messages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Knowledge entries:</span>
                <span className="font-medium">{items.knowledge}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Settings:</span>
                <span className="font-medium">{items.settings}</span>
              </div>
            </div>
          </div>

          {/* Pre-restore backup info */}
          {result.preRestoreBackupCreated && result.preRestoreBackupId && (
            <Alert variant="info">
              <Database className="w-4 h-4" />
              <AlertDescription>
                Pre-restore backup created: {result.preRestoreBackupId}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="default" onClick={onCancel} className="flex-1">
              Done
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  // Render error stage
  if (state.stage === 'error') {
    return (
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
          <h3 className="text-lg font-semibold">Restore Failed</h3>
        </div>

        <div className="space-y-4">
          {/* Error message */}
          <Alert variant="error">
            <AlertDescription>
              {state.error || 'An unknown error occurred during restore'}
            </AlertDescription>
          </Alert>

          {/* Result errors if available */}
          {state.result?.errors && state.result.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Errors</h4>
              <ul className="space-y-1 text-sm">
                {state.result.errors.map((error, idx) => (
                  <li key={idx} className="text-gray-700 dark:text-gray-300">
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadPreview} className="flex-1">
              Try Again
            </Button>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>
    )
  }

  return null
}
