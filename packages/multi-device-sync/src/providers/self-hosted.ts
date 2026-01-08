/**
 * Self-Hosted Sync Provider
 *
 * Synchronization to self-hosted storage solutions:
 * - WebDAV (OwnCloud, Nextcloud)
 * - S3-compatible (MinIO, Wasabi)
 * - Custom API
 */

import {
  SyncProvider,
  ProviderCapabilities,
  SyncProviderType,
  SelfHostedProviderConfig,
  DataDelta,
  SyncResult,
  NetworkStatus,
  SyncError,
} from '../types'
import { NetworkError, ValidationError, StorageError } from '../errors'

// ============================================================================
// TYPES
// ============================================================================

interface SyncMetadata {
  deviceId: string
  lastSync: number
  version: number
  checksum: string
}

interface SyncManifest {
  version: string
  deviceId: string
  timestamp: number
  deltas: {
    conversations: DataDelta[]
    messages: DataDelta[]
    knowledge: DataDelta[]
    contacts: DataDelta[]
    settings: DataDelta[]
    personalization: DataDelta[]
  }
}

// ============================================================================
// SELF-HOSTED PROVIDER
// ============================================================================

export class SelfHostedProvider implements SyncProvider {
  readonly type: SyncProviderType = 'self-hosted'
  private config: SelfHostedProviderConfig
  private lastSync = 0
  private readonly SYNC_MANIFEST_FILE = 'sync-manifest.json'

  constructor(config: SelfHostedProviderConfig) {
    this.config = config
  }

  /**
   * Initialize self-hosted provider
   */
  async initialize(): Promise<void> {
    console.log('[SelfHostedProvider] Initializing with provider:', this.config.provider)

    // Validate config
    if (!this.config.url) {
      throw new ValidationError('URL is required for self-hosted sync', {
        field: 'url',
        value: this.config.url
      })
    }

    // Test connection
    await this.testConnection()
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.testConnection()
      return true
    } catch {
      return false
    }
  }

  /**
   * Connect to self-hosted storage
   */
  async connect(): Promise<void> {
    console.log('[SelfHostedProvider] Connecting to', this.config.url)

    switch (this.config.provider) {
      case 'webdav':
        await this.connectWebDAV()
        break

      case 's3':
        await this.connectS3()
        break

      case 'custom-api':
        await this.connectCustomAPI()
        break
    }
  }

  /**
   * Disconnect from storage
   */
  async disconnect(): Promise<void> {
    console.log('[SelfHostedProvider] Disconnecting')
    this.lastSync = 0
  }

  /**
   * Push deltas to remote storage
   */
  async push(deltas: DataDelta[]): Promise<SyncResult> {
    const startTime = Date.now()
    const errors: SyncError[] = []
    let itemsSynced = 0
    let bytesTransferred = 0

    try {
      // Fetch current manifest
      const currentManifest = await this.fetchManifest()

      // Merge deltas with existing manifest
      const updatedManifest = this.mergeDeltasToManifest(currentManifest, deltas)

      // Serialize manifest
      const manifestData = JSON.stringify(updatedManifest, null, 2)
      bytesTransferred = manifestData.length

      // Upload manifest
      await this.uploadManifest(manifestData)

      itemsSynced = deltas.length

      return {
        success: errors.length === 0,
        direction: 'push',
        itemsSynced,
        bytesTransferred,
        duration: Date.now() - startTime,
        conflicts: [],
        errors,
        timestamp: Date.now(),
        provider: this.type,
      }
    } catch (error) {
      errors.push({
        code: 'network-failed',
        message: 'Failed to push deltas to self-hosted storage',
        retryable: true,
        details: error,
      })

      return {
        success: false,
        direction: 'push',
        itemsSynced: 0,
        bytesTransferred: 0,
        duration: Date.now() - startTime,
        conflicts: [],
        errors,
        timestamp: Date.now(),
        provider: this.type,
      }
    }
  }

  /**
   * Pull deltas from remote storage
   */
  async pull(since?: number): Promise<{ deltas: DataDelta[], lastSync: number }> {
    try {
      const manifest = await this.fetchManifest()

      if (!manifest) {
        return { deltas: [], lastSync: Date.now() }
      }

      // Filter deltas by timestamp
      let allDeltas: DataDelta[] = [
        ...manifest.deltas.conversations,
        ...manifest.deltas.messages,
        ...manifest.deltas.knowledge,
        ...manifest.deltas.contacts,
        ...manifest.deltas.settings,
        ...manifest.deltas.personalization,
      ]

      if (since) {
        allDeltas = allDeltas.filter(d => d.timestamp > since)
      }

      return {
        deltas: allDeltas,
        lastSync: manifest.timestamp,
      }
    } catch (error) {
      console.error('[SelfHostedProvider] Pull failed:', error)
      return { deltas: [], lastSync: Date.now() }
    }
  }

  /**
   * Get network status
   */
  async getNetworkStatus(): Promise<NetworkStatus> {
    const start = Date.now()

    try {
      await this.testConnection()
      const latency = Date.now() - start

      return {
        online: true,
        wifi: true,
        latency,
        bandwidth: 100000000, // 100 Mbps estimate
      }
    } catch {
      return {
        online: false,
        wifi: false,
      }
    }
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities {
    return {
      maxPayloadSize: 50 * 1024 * 1024, // 50MB
      supportsEncryption: true,
      supportsCompression: true,
      supportsDeltaSync: true,
      supportsBatching: true,
      realTimeSync: false,
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.disconnect()
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private async connectWebDAV(): Promise<void> {
    // WebDAV connection test
    const url = this.config.url
    const headers = this.getAuthHeaders()

    const response = await fetch(url, {
      method: 'PROPFIND',
      headers: {
        ...headers,
        'Depth': '0',
      },
    })

    if (!response.ok) {
      throw new NetworkError('WebDAV connection failed', {
        technicalDetails: `WebDAV PROPFIND failed: ${response.statusText} (status: ${response.status})`
      })
    }
  }

  private async connectS3(): Promise<void> {
    // S3 connection test - list buckets
    const url = this.buildS3Url('')
    const headers = this.getS3Headers('GET', '', '')

    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      throw new NetworkError('S3 connection failed', {
        technicalDetails: `S3 GET failed: ${response.statusText} (status: ${response.status})`
      })
    }
  }

  private async connectCustomAPI(): Promise<void> {
    const url = `${this.config.url}/health`
    const headers = this.getAuthHeaders()

    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      throw new NetworkError('Custom API connection failed', {
        technicalDetails: `Health check failed: ${response.statusText} (status: ${response.status})`
      })
    }
  }

  private async testConnection(): Promise<void> {
    switch (this.config.provider) {
      case 'webdav':
        return await this.connectWebDAV()

      case 's3':
        return await this.connectS3()

      case 'custom-api':
        return await this.connectCustomAPI()
    }
  }

  private async fetchManifest(): Promise<SyncManifest | null> {
    const url = await this.getManifestUrl()
    const headers = this.getAuthHeaders()

    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      throw new StorageError('Failed to fetch sync manifest', {
        technicalDetails: `HTTP ${response.status}: ${response.statusText}`
      })
    }

    const data = await response.text()
    return JSON.parse(data)
  }

  private async uploadManifest(manifestData: string): Promise<void> {
    const url = await this.getManifestUrl()
    const headers = this.getAuthHeaders()

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Length': manifestData.length.toString(),
      },
      body: manifestData,
    })

    if (!response.ok) {
      throw new StorageError('Failed to upload sync manifest', {
        technicalDetails: `HTTP ${response.status}: ${response.statusText}`
      })
    }
  }

  private mergeDeltasToManifest(
    currentManifest: SyncManifest | null,
    newDeltas: DataDelta[]
  ): SyncManifest {
    const timestamp = Date.now()
    const deviceId = this.generateDeviceId()

    if (!currentManifest) {
      // Create new manifest
      return {
        version: '1.0',
        deviceId,
        timestamp,
        deltas: {
          conversations: newDeltas.filter(d => d.collection === 'conversations'),
          messages: newDeltas.filter(d => d.collection === 'messages'),
          knowledge: newDeltas.filter(d => d.collection === 'knowledge'),
          contacts: newDeltas.filter(d => d.collection === 'contacts'),
          settings: newDeltas.filter(d => d.collection === 'settings'),
          personalization: newDeltas.filter(d => d.collection === 'personalization'),
        },
      }
    }

    // Merge deltas into existing manifest
    return {
      ...currentManifest,
      timestamp,
      deltas: {
        conversations: this.mergeDeltaArray(
          currentManifest.deltas.conversations,
          newDeltas.filter(d => d.collection === 'conversations')
        ),
        messages: this.mergeDeltaArray(
          currentManifest.deltas.messages,
          newDeltas.filter(d => d.collection === 'messages')
        ),
        knowledge: this.mergeDeltaArray(
          currentManifest.deltas.knowledge,
          newDeltas.filter(d => d.collection === 'knowledge')
        ),
        contacts: this.mergeDeltaArray(
          currentManifest.deltas.contacts,
          newDeltas.filter(d => d.collection === 'contacts')
        ),
        settings: this.mergeDeltaArray(
          currentManifest.deltas.settings,
          newDeltas.filter(d => d.collection === 'settings')
        ),
        personalization: this.mergeDeltaArray(
          currentManifest.deltas.personalization,
          newDeltas.filter(d => d.collection === 'personalization')
        ),
      },
    }
  }

  private mergeDeltaArray(existing: DataDelta[], newDeltas: DataDelta[]): DataDelta[] {
    const deltaMap = new Map<string, DataDelta>()

    // Add existing deltas
    for (const delta of existing) {
      deltaMap.set(delta.id, delta)
    }

    // Add/overwrite with new deltas
    for (const delta of newDeltas) {
      deltaMap.set(delta.id, delta)
    }

    return Array.from(deltaMap.values())
  }

  private async getManifestUrl(): Promise<string> {
    switch (this.config.provider) {
      case 'webdav':
        return `${this.config.url}/${this.config.path || 'personallog'}/${this.SYNC_MANIFEST_FILE}`

      case 's3':
        return this.buildS3Url(this.SYNC_MANIFEST_FILE)

      case 'custom-api':
        return `${this.config.url}/sync/manifest`
    }
  }

  private buildS3Url(key: string): string {
    const { url, bucket, region } = this.config

    if (!bucket) {
      return url
    }

    // S3 path style URL
    const baseUrl = url || `https://s3.${region}.amazonaws.com`
    return `${baseUrl}/${bucket}/${key}`
  }

  private getAuthHeaders(): Record<string, string> {
    switch (this.config.provider) {
      case 'webdav':
        if (this.config.username && this.config.password) {
          const credentials = btoa(`${this.config.username}:${this.config.password}`)
          return { 'Authorization': `Basic ${credentials}` }
        }
        return {}

      case 'custom-api':
        if (this.config.username && this.config.password) {
          const credentials = btoa(`${this.config.username}:${this.config.password}`)
          return { 'Authorization': `Basic ${credentials}` }
        }
        return {}

      case 's3':
        return this.getS3Headers('GET', '', '')

      default:
        return {}
    }
  }

  private getS3Headers(method: string, contentType: string, contentMd5: string): Record<string, string> {
    // Simplified S3 auth (in production, use AWS SDK)
    if (this.config.accessKey && this.config.secretKey) {
      return {
        'X-Amz-Date': new Date().toISOString().replace(/[:\-]|\.\d{3}/g, ''),
        'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
        // Full signature would go here
      }
    }
    return {}
  }

  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('self-hosted-device-id')
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      localStorage.setItem('self-hosted-device-id', deviceId)
    }
    return deviceId
  }
}
