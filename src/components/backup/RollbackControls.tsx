/**
 * Rollback Controls UI Component
 *
 * User interface for creating snapshots and rolling back to previous states.
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  SnapshotMetadata,
  RollbackResult,
  RollbackProgress,
  CreateSnapshotOptions,
  SnapshotType
} from '@/lib/backup/rollback'
import { RollbackManager } from '@/lib/backup/rollback'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Progress } from '@/components/ui/Progress'
import { formatBytes } from '@/lib/backup/compression'
import {
  History,
  Camera,
  RotateCcw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Tag,
  Calendar
} from 'lucide-react'

interface RollbackControlsProps {
  onSnapshotCreated?: (snapshot: SnapshotMetadata) => void
  onRollbackComplete?: (result: RollbackResult) => void
}

type View = 'snapshots' | 'create-snapshot' | 'confirm-rollback' | 'rolling-back' | 'result'

export function RollbackControls({ onSnapshotCreated, onRollbackComplete }: RollbackControlsProps) {
  const [view, setView] = useState<View>('snapshots')
  const [snapshots, setSnapshots] = useState<SnapshotMetadata[]>([])
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<RollbackProgress | null>(null)
  const [result, setResult] = useState<RollbackResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [snapshotName, setSnapshotName] = useState('')
  const [snapshotDescription, setSnapshotDescription] = useState('')
  const [snapshotType, setSnapshotType] = useState<SnapshotType>('manual')

  const manager = new RollbackManager()

  // Load snapshots on mount
  useEffect(() => {
    loadSnapshots()
  }, [])

  const loadSnapshots = async () => {
    setLoading(true)
    try {
      const loaded = await manager.listSnapshots()
      setSnapshots(loaded)
    } catch (error) {
      console.error('Failed to load snapshots:', error)
    } finally {
      setLoading(false)
    }
  }

  // Create snapshot
  const handleCreateSnapshot = async () => {
    setLoading(true)
    setError(null)

    try {
      const snapshot = await manager.createSnapshot({
        name: snapshotName || undefined,
        description: snapshotDescription || undefined,
        type: snapshotType,
        compress: true,
        onProgress: (prog) => {
          setProgress(prog as any)
        }
      })

      if (onSnapshotCreated) {
        onSnapshotCreated(snapshot)
      }

      await loadSnapshots()
      setView('result')
      setResult({ success: true } as any)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create snapshot')
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  // Start rollback
  const handleStartRollback = (snapshot: SnapshotMetadata) => {
    setSelectedSnapshot(snapshot)
    setView('confirm-rollback')
    setError(null)
  }

  // Confirm rollback
  const handleConfirmRollback = async () => {
    if (!selectedSnapshot) return

    setLoading(true)
    setError(null)

    try {
      const rollbackResult = await manager.rollback(selectedSnapshot.id, {
        createPreRollbackSnapshot: true,
        verifyBeforeRollback: true,
        onProgress: (prog) => {
          setProgress(prog)
        }
      })

      setResult(rollbackResult)

      if (rollbackResult.success && onRollbackComplete) {
        onRollbackComplete(rollbackResult)
      }

      setView('result')
      await loadSnapshots()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Rollback failed')
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  // Delete snapshot
  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (!confirm('Are you sure you want to delete this snapshot?')) {
      return
    }

    setLoading(true)
    try {
      await manager.deleteSnapshot(snapshotId)
      await loadSnapshots()
    } catch (error) {
      console.error('Failed to delete snapshot:', error)
    } finally {
      setLoading(false)
    }
  }

  // Render snapshots list
  if (view === 'snapshots') {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <History className="w-5 h-5 mr-2" />
            <h3 className="text-lg font-semibold">Snapshots</h3>
          </div>
          <Button
            size="sm"
            onClick={() => setView('create-snapshot')}
          >
            <Camera className="w-4 h-4 mr-2" />
            New Snapshot
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : snapshots.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No snapshots yet</p>
            <p className="text-sm">Create a snapshot to save your current state</p>
          </div>
        ) : (
          <div className="space-y-2">
            {snapshots.map(snapshot => (
              <div
                key={snapshot.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{snapshot.name}</h4>
                    {snapshot.type === 'auto' && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                        Auto
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(snapshot.timestamp).toLocaleString()}
                    </span>
                    <span className="flex items-center">
                      <Tag className="w-3 h-3 mr-1" />
                      {formatBytes(snapshot.compressedSize)}
                    </span>
                  </div>
                  {snapshot.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {snapshot.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStartRollback(snapshot)}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Rollback
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteSnapshot(snapshot.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    )
  }

  // Render create snapshot form
  if (view === 'create-snapshot') {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Camera className="w-5 h-5 mr-2" />
            <h3 className="text-lg font-semibold">Create Snapshot</h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setView('snapshots')}
          >
            Cancel
          </Button>
        </div>

        {progress ? (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">
                  {progress.message}
                </span>
                <span className="font-medium">{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Snapshot type */}
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={snapshotType}
                onChange={(e) => setSnapshotType(e.target.value as SnapshotType)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="manual">Manual</option>
                <option value="pre-change">Pre-change</option>
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Name (optional)</label>
              <input
                type="text"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder="e.g., Before major changes"
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <textarea
                value={snapshotDescription}
                onChange={(e) => setSnapshotDescription(e.target.value)}
                placeholder="What this snapshot captures..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
              />
            </div>

            {/* Info */}
            <Alert variant="info">
              <AlertDescription>
                Snapshots capture your current data state. You can rollback to any snapshot later.
              </AlertDescription>
            </Alert>

            {/* Error */}
            {error && (
              <Alert variant="error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={handleCreateSnapshot}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Snapshot'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setView('snapshots')}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>
    )
  }

  // Render confirm rollback
  if (view === 'confirm-rollback' && selectedSnapshot) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <RotateCcw className="w-5 h-5 mr-2" />
            <h3 className="text-lg font-semibold">Confirm Rollback</h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setView('snapshots')}
          >
            Cancel
          </Button>
        </div>

        <div className="space-y-4">
          {/* Snapshot info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-semibold mb-2">{selectedSnapshot.name}</h4>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {new Date(selectedSnapshot.timestamp).toLocaleString()}
              </div>
              <div className="flex items-center">
                <Tag className="w-4 h-4 mr-2" />
                {formatBytes(selectedSnapshot.compressedSize)}
              </div>
              {selectedSnapshot.description && (
                <p className="mt-2">{selectedSnapshot.description}</p>
              )}
            </div>
          </div>

          {/* Warning */}
          <Alert variant="warning">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Rolling back will replace your current data with the snapshot data. A pre-rollback snapshot will be created automatically so you can undo this action.
            </AlertDescription>
          </Alert>

          {/* Error */}
          {error && (
            <Alert variant="error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={handleConfirmRollback}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Rolling back...' : 'Confirm Rollback'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setView('snapshots')}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  // Render rollback progress
  if (view === 'rolling-back' && progress) {
    return (
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <RotateCcw className="w-5 h-5 mr-2 animate-spin" />
          <h3 className="text-lg font-semibold">Rolling Back</h3>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                {progress.message}
              </span>
              <span className="font-medium">{progress.progress}%</span>
            </div>
            <Progress value={progress.progress} />
          </div>

          {progress.category && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Processing: {progress.category}
            </div>
          )}

          {progress.itemsProcessed !== undefined && progress.totalItems !== undefined && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {progress.itemsProcessed} / {progress.totalItems} items
            </div>
          )}
        </div>
      </Card>
    )
  }

  // Render result
  if (view === 'result' && result) {
    const isSuccess = result.success

    return (
      <Card className="p-6">
        <div className="flex items-center mb-4">
          {isSuccess ? (
            <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
          ) : (
            <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
          )}
          <h3 className="text-lg font-semibold">
            {isSuccess ? 'Operation Completed' : 'Operation Failed'}
          </h3>
        </div>

        <div className="space-y-4">
          {isSuccess ? (
            <>
              <Alert variant="success">
                <AlertDescription>
                  {result.preRollbackSnapshotId
                    ? 'Rollback completed successfully. A pre-rollback snapshot was created.'
                    : 'Operation completed successfully!'}
                </AlertDescription>
              </Alert>

              {result.itemsRolledBack && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Items Affected</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Conversations:</span>
                      <span className="font-medium">{result.itemsRolledBack.conversations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Knowledge entries:</span>
                      <span className="font-medium">{result.itemsRolledBack.knowledge}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Settings:</span>
                      <span className="font-medium">{result.itemsRolledBack.settings}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Alert variant="error">
              <AlertDescription>
                {result.errors?.[0]?.message || 'An unknown error occurred'}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={() => setView('snapshots')}
              className="flex-1"
            >
              Done
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return null
}
