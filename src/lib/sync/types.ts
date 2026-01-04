/**
 * Sync System Type Definitions
 *
 * Comprehensive types for multi-device synchronization.
 * Supports offline operation, conflict resolution, and multiple sync providers.
 */

// ============================================================================
// SYNC DIRECTIONS
// ============================================================================

export type SyncDirection = 'bidirectional' | 'pull' | 'push'

export type SyncStatus =
  | 'idle'           // Not syncing, no changes
  | 'syncing'        // Currently syncing
  | 'synced'         // Successfully synced
  | 'offline'        // Working offline
  | 'conflict'       // Has unresolved conflicts
  | 'error'          // Sync error occurred

// ============================================================================
// SYNC PROVIDERS
// ============================================================================

export type SyncProviderType =
  | 'local'          // LAN sync (WebRTC)
  | 'self-hosted'    // Self-hosted (WebDAV/S3/custom API)
  | 'commercial'     // Commercial cloud (Dropbox, Google Drive, etc.)

export interface SyncProviderConfig {
  type: SyncProviderType
  enabled: boolean
  lastSync?: number
  // Provider-specific config
  local?: LocalProviderConfig
  selfHosted?: SelfHostedProviderConfig
  commercial?: CommercialProviderConfig
}

export interface LocalProviderConfig {
  deviceId: string
  deviceName: string
  discoveryEnabled: boolean
  pairedDevices: PairedDevice[]
}

export interface SelfHostedProviderConfig {
  url: string
  provider: 'webdav' | 's3' | 'custom-api'
  username?: string
  password?: string
  accessKey?: string
  secretKey?: string
  bucket?: string
  region?: string
  path?: string
}

export interface CommercialProviderConfig {
  service: 'dropbox' | 'google-drive' | 'onedrive' | 'icloud'
  accessToken: string
  refreshToken?: string
  expiry?: number
}

// ============================================================================
// DEVICE MANAGEMENT
// ============================================================================

export interface Device {
  id: string
  name: string
  type: 'desktop' | 'mobile' | 'tablet'
  os: string
  lastSeen: number
  isCurrent: boolean
  capabilities: DeviceCapabilities
}

export interface DeviceCapabilities {
  maxSyncSize: number        // Max payload size in bytes
  supportsEncryption: boolean
  supportsCompression: boolean
  supportsDeltaSync: boolean
}

export interface DeviceCredentials {
  deviceId: string
  apiKey: string
  encryptionKey: string
  registeredAt: number
}

export interface PairedDevice {
  deviceId: string
  deviceName: string
  publicKey: string
  lastConnected: number
  trusted: boolean
}

// ============================================================================
// DATA DELTAS
// ============================================================================

export type DeltaType = 'create' | 'update' | 'delete'

export interface DataDelta {
  id: string                    // Unique delta ID
  type: DeltaType
  collection: CollectionType
  itemId: string                // ID of the item being changed
  data: unknown                 // Item data (for create/update)
  timestamp: number
  deviceId: string              // Which device made the change
  version: number               // Item version number
  checksum?: string             // For integrity verification
  applied: boolean              // Whether this delta has been applied
}

export type CollectionType =
  | 'conversations'
  | 'messages'
  | 'knowledge'
  | 'contacts'
  | 'settings'
  | 'personalization'

// ============================================================================
// SYNC RESULTS
// ============================================================================

export interface SyncResult {
  success: boolean
  direction: SyncDirection
  itemsSynced: number
  bytesTransferred: number
  duration: number              // milliseconds
  conflicts: Conflict[]
  errors: SyncError[]
  timestamp: number
  provider: SyncProviderType
}

export interface SyncError {
  code: SyncErrorCode
  message: string
  collection?: CollectionType
  itemId?: string
  retryable: boolean
  details?: unknown
}

export type SyncErrorCode =
  | 'network-failed'
  | 'authentication-failed'
  | 'quota-exceeded'
  | 'conflict-detected'
  | 'validation-failed'
  | 'provider-unavailable'
  | 'encryption-failed'
  | 'timeout'
  | 'unknown'

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

export interface Conflict {
  id: string
  type: 'conversation' | 'knowledge' | 'settings' | 'message'
  itemId: string
  localVersion: ConflictVersion
  remoteVersion: ConflictVersion
  detectedAt: number
  resolved: boolean
}

export interface ConflictVersion {
  data: unknown
  timestamp: number
  deviceId: string
  version: number
  checksum?: string
}

export type ConflictResolution =
  | 'keep-local'
  | 'keep-remote'
  | 'keep-newer'
  | 'keep-older'
  | 'manual-merge'
  | 'smart-merge'

export interface ConflictResolutionAction {
  conflictId: string
  resolution: ConflictResolution
  mergedData?: unknown         // For manual-merge
  resolvedAt: number
}

// ============================================================================
// OFFLINE QUEUE
// ============================================================================

export interface QueuedChange {
  id: string
  delta: DataDelta
  retryCount: number
  maxRetries: number
  nextRetryAt?: number
  priority: 'high' | 'medium' | 'low'
  queuedAt: number
}

export interface OfflineQueueStats {
  totalChanges: number
  pendingChanges: number
  failedChanges: number
  highPriorityChanges: number
  oldestChange: number
  estimatedSyncTime: number    // milliseconds
}

// ============================================================================
// SYNC LOGS
// ============================================================================

export interface SyncLogEntry {
  id: string
  timestamp: number
  type: 'sync-start' | 'sync-complete' | 'sync-error' | 'conflict-detected' | 'conflict-resolved'
  provider: SyncProviderType
  direction: SyncDirection
  details: {
    itemsSynced?: number
    conflicts?: number
    errors?: number
    duration?: number
    errorMessage?: string
  }
}

// ============================================================================
// SYNC STATISTICS
// ============================================================================

export interface SyncStatistics {
  lastSync: number
  totalSyncs: number
  successfulSyncs: number
  failedSyncs: number
  totalItemsSynced: number
  totalBytesTransferred: number
  averageSyncDuration: number
  conflictsResolved: number
  conflictsPending: number
  offlineChangesPending: number
  connectedDevices: number
}

// ============================================================================
// SYNC SETTINGS
// ============================================================================

export interface SyncSettings {
  enabled: boolean
  autoSync: boolean
  syncInterval: number           // minutes
  syncOnWifiOnly: boolean
  syncOnChargingOnly: boolean
  maxSyncSize: number            // bytes
  compressionEnabled: boolean
  encryptionEnabled: boolean
  conflictResolution: ConflictResolution
  backgroundSync: boolean
  priorityCollections: CollectionType[]
}

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  enabled: false,
  autoSync: true,
  syncInterval: 15,              // 15 minutes
  syncOnWifiOnly: false,
  syncOnChargingOnly: false,
  maxSyncSize: 10 * 1024 * 1024, // 10MB
  compressionEnabled: true,
  encryptionEnabled: true,
  conflictResolution: 'keep-newer',
  backgroundSync: true,
  priorityCollections: ['conversations', 'messages'],
}

// ============================================================================
// NETWORK STATUS
// ============================================================================

export interface NetworkStatus {
  online: boolean
  wifi: boolean
  latency?: number               // milliseconds
  bandwidth?: number             // bytes per second
}

// ============================================================================
// SYNC PROGRESS
// ============================================================================

export interface SyncProgress {
  stage: 'preparing' | 'uploading' | 'downloading' | 'merging' | 'verifying' | 'complete'
  progress: number               // 0-100
  currentItem?: string
  totalItems?: number
  processedItems?: number
  bytesTransferred?: number
  totalBytes?: number
  estimatedTimeRemaining?: number  // milliseconds
}
