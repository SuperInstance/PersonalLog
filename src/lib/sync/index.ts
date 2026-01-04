/**
 * Sync Module
 *
 * Complete multi-device synchronization system.
 * Supports offline operation, conflict resolution, and multiple sync providers.
 */

// ============================================================================
// CORE
// ============================================================================

export {
  SyncEngine,
  getSyncEngine,
  initializeSyncEngine,
} from './engine'

// ============================================================================
// TYPES
// ============================================================================

export type {
  SyncDirection,
  SyncStatus,
  SyncProviderType,
  SyncProviderConfig,
  SyncResult,
  SyncError,
  Conflict,
  ConflictVersion,
  ConflictResolution,
  ConflictResolutionAction,
  DataDelta,
  DeltaType,
  CollectionType,
  Device,
  DeviceCredentials,
  PairedDevice,
  QueuedChange,
  OfflineQueueStats,
  SyncLogEntry,
  SyncStatistics,
  SyncSettings,
  NetworkStatus,
  SyncProgress,
} from './types'

export { DEFAULT_SYNC_SETTINGS } from './types'

// ============================================================================
// PROVIDERS
// ============================================================================

export {
  SyncProviderFactory,
  type SyncProvider,
  type ProviderCapabilities,
} from './providers'

export { LocalProvider } from './providers/local'
export { SelfHostedProvider } from './providers/self-hosted'
export { CommercialProvider } from './providers/commercial'

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

export {
  ConflictResolver,
  DEFAULT_CONFLICT_CONFIG,
  type ConflictResolverConfig,
} from './conflict'

export {
  mergeArrays,
  deepMerge,
  generateDiff,
} from './conflict'

// ============================================================================
// OFFLINE QUEUE
// ============================================================================

export {
  OfflineQueue,
  getOfflineQueue,
  initializeOfflineQueue,
} from './offline-queue'

// ============================================================================
// CRYPTOGRAPHY
// ============================================================================

export {
  SyncCryptography,
  getSyncCryptography,
  initializeCryptography,
  type KeyPair,
  type EncryptionResult,
  type DecryptionResult,
  type DeviceKeyExchange,
} from './cryptography'

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

import { getSyncEngine } from './engine'

/**
 * Quick sync function
 */
export async function sync(direction?: 'bidirectional' | 'pull' | 'push') {
  const engine = getSyncEngine()
  return await engine.sync(direction)
}

/**
 * Get current sync status
 */
export async function getSyncStatus() {
  const engine = getSyncEngine()
  return await engine.getSyncStatus()
}

/**
 * Register current device for sync
 */
export async function registerDevice(deviceName: string) {
  const engine = getSyncEngine()
  return await engine.registerDevice(deviceName)
}

/**
 * Update sync settings
 */
export async function updateSyncSettings(settings: Partial<{
  enabled: boolean
  autoSync: boolean
  syncInterval: number
  encryptionEnabled: boolean
  conflictResolution: import('./types').ConflictResolution
}>) {
  const engine = getSyncEngine()
  await engine.updateSettings(settings)
}
