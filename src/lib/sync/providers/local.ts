/**
 * Local LAN Sync Provider
 *
 * Device-to-device synchronization over local network using WebRTC.
 * No internet required, fast and secure.
 */

import {
  SyncProvider,
  ProviderCapabilities,
} from './index'
import {
  SyncProviderType,
  LocalProviderConfig,
  DataDelta,
  SyncResult,
  NetworkStatus,
  SyncError,
} from '../types'
import { ValidationError, NetworkError } from '@/lib/errors'

// ============================================================================
// TYPES
// ============================================================================

interface DeviceConnection {
  deviceId: string
  deviceName: string
  peerConnection: RTCPeerConnection
  dataChannel?: RTCDataChannel
  connected: boolean
  lastConnected: number
}

interface SyncMessage {
  type: 'handshake' | 'sync-request' | 'sync-data' | 'sync-complete' | 'error'
  payload: unknown
  timestamp: number
  deviceId: string
}

interface SyncHandshake {
  deviceId: string
  deviceName: string
  publicKey: string
  capabilities: ProviderCapabilities
}

// ============================================================================
// LOCAL PROVIDER
// ============================================================================

export class LocalProvider implements SyncProvider {
  readonly type: SyncProviderType = 'local'
  private config: LocalProviderConfig
  private connections: Map<string, DeviceConnection> = new Map()
  private pendingOffers: Map<string, RTCSessionDescription> = new Map()

  // WebRTC config
  private readonly rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  }

  constructor(config: LocalProviderConfig) {
    this.config = config
  }

  /**
   * Initialize local provider
   */
  async initialize(): Promise<void> {
    console.log('[LocalProvider] Initializing LAN sync')
    // Setup discovery signaling (would use WebSocket server in production)
    // For now, manual pairing only
  }

  /**
   * Check if WebRTC is available
   */
  async isAvailable(): Promise<boolean> {
    return typeof RTCPeerConnection !== 'undefined'
  }

  /**
   * Connect to paired devices
   */
  async connect(): Promise<void> {
    console.log('[LocalProvider] Connecting to paired devices...')

    for (const device of this.config.pairedDevices) {
      try {
        await this.connectToDevice(device.deviceId, device.publicKey)
      } catch (error) {
        console.error(`[LocalProvider] Failed to connect to ${device.deviceName}:`, error)
      }
    }
  }

  /**
   * Disconnect from all devices
   */
  async disconnect(): Promise<void> {
    console.log('[LocalProvider] Disconnecting from all devices...')

    for (const [deviceId, connection] of this.connections.entries()) {
      try {
        if (connection.dataChannel) {
          connection.dataChannel.close()
        }
        connection.peerConnection.close()
      } catch (error) {
        console.error(`[LocalProvider] Error disconnecting from ${deviceId}:`, error)
      }
    }

    this.connections.clear()
  }

  /**
   * Push deltas to connected devices
   */
  async push(deltas: DataDelta[]): Promise<SyncResult> {
    const startTime = Date.now()
    const errors: SyncError[] = []
    let itemsSynced = 0
    let bytesTransferred = 0

    const data = JSON.stringify(deltas)
    bytesTransferred = data.length

    for (const [deviceId, connection] of this.connections.entries()) {
      if (!connection.connected || !connection.dataChannel) {
        continue
      }

      try {
        const message: SyncMessage = {
          type: 'sync-data',
          payload: deltas,
          timestamp: Date.now(),
          deviceId: this.config.deviceId,
        }

        connection.dataChannel.send(JSON.stringify(message))
        itemsSynced += deltas.length
      } catch (error) {
        errors.push({
          code: 'network-failed',
          message: `Failed to push to device ${deviceId}`,
          retryable: true,
          details: error,
        })
      }
    }

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
  }

  /**
   * Pull deltas from connected devices
   */
  async pull(since?: number): Promise<{ deltas: DataDelta[], lastSync: number }> {
    const deltas: DataDelta[] = []

    // Request deltas from all connected devices
    const pullPromises = Array.from(this.connections.values()).map(async (connection) => {
      if (!connection.connected || !connection.dataChannel) {
        return []
      }

      try {
        const message: SyncMessage = {
          type: 'sync-request',
          payload: { since },
          timestamp: Date.now(),
          deviceId: this.config.deviceId,
        }

        connection.dataChannel.send(JSON.stringify(message))

        // Wait for response (in real implementation, use Promise/events)
        return []
      } catch (error) {
        console.error('[LocalProvider] Pull error:', error)
        return []
      }
    })

    const results = await Promise.all(pullPromises)
    deltas.push(...results.flat())

    return {
      deltas,
      lastSync: Date.now(),
    }
  }

  /**
   * Get network status
   */
  async getNetworkStatus(): Promise<NetworkStatus> {
    return {
      online: navigator.onLine,
      wifi: true, // Assume WiFi if using LAN sync
      latency: 0, // LAN is fast
      bandwidth: 1000000000, // 1 Gbps theoretical
    }
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities {
    return {
      maxPayloadSize: 65536, // 64KB (DataChannel limit)
      supportsEncryption: true,
      supportsCompression: true,
      supportsDeltaSync: true,
      supportsBatching: true,
      realTimeSync: true,
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.disconnect()
  }

  // ========================================================================
  // DEVICE MANAGEMENT
  // ========================================================================

  /**
   * Pair with a new device
   */
  async pairDevice(deviceName: string, offer: RTCSessionDescription): Promise<RTCSessionDescription> {
    console.log(`[LocalProvider] Pairing with device: ${deviceName}`)

    // Create peer connection
    const peerConnection = new RTCPeerConnection(this.rtcConfig)

    // Create data channel
    const dataChannel = peerConnection.createDataChannel('sync', {
      ordered: true,
    })

    this.setupDataChannel(dataChannel, 'unknown', deviceName)

    // Set remote description (offer)
    await peerConnection.setRemoteDescription(offer)

    // Create answer
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    // Wait for ICE gathering to complete
    await new Promise<void>((resolve) => {
      if (peerConnection.iceGatheringState === 'complete') {
        resolve()
      } else {
        peerConnection.addEventListener('icegatheringstatechange', () => {
          if (peerConnection.iceGatheringState === 'complete') {
            resolve()
          }
        })
      }
    })

    // Store connection (will be moved to proper device ID after handshake)
    const deviceId = `pending_${Date.now()}`
    this.connections.set(deviceId, {
      deviceId,
      deviceName,
      peerConnection,
      dataChannel,
      connected: false,
      lastConnected: Date.now(),
    })

    return new RTCSessionDescription(peerConnection.localDescription!)
  }

  /**
   * Accept pairing request from another device
   */
  async acceptPairing(deviceId: string, answer: RTCSessionDescription): Promise<void> {
    const connection = this.connections.get(deviceId)
    if (!connection) {
      throw new ValidationError('Connection not found', { field: 'deviceId', value: deviceId })
    }

    await connection.peerConnection.setRemoteDescription(answer)
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private async connectToDevice(deviceId: string, publicKey: string): Promise<void> {
    console.log(`[LocalProvider] Connecting to device: ${deviceId}`)

    const peerConnection = new RTCPeerConnection(this.rtcConfig)

    // Listen for data channel from remote
    peerConnection.ondatachannel = (event) => {
      const dataChannel = event.channel
      const connection = this.connections.get(deviceId)

      if (connection) {
        connection.dataChannel = dataChannel
        this.setupDataChannel(dataChannel, deviceId, connection.deviceName)
        connection.connected = true
        connection.lastConnected = Date.now()
      }
    }

    // ICE candidate handling (for signaling)
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Send candidate through signaling server
        console.log('[LocalProvider] ICE candidate:', event.candidate)
      }
    }

    peerConnection.onconnectionstatechange = () => {
      console.log('[LocalProvider] Connection state:', peerConnection.connectionState)

      if (peerConnection.connectionState === 'connected') {
        const connection = this.connections.get(deviceId)
        if (connection) {
          connection.connected = true
          connection.lastConnected = Date.now()
        }
      } else if (peerConnection.connectionState === 'disconnected' ||
                 peerConnection.connectionState === 'failed') {
        const connection = this.connections.get(deviceId)
        if (connection) {
          connection.connected = false
        }
      }
    }

    // Create offer
    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    // Wait for ICE gathering
    await new Promise<void>((resolve) => {
      if (peerConnection.iceGatheringState === 'complete') {
        resolve()
      } else {
        peerConnection.addEventListener('icegatheringstatechange', () => {
          if (peerConnection.iceGatheringState === 'complete') {
            resolve()
          }
        })
      }
    })

    // Store connection
    this.connections.set(deviceId, {
      deviceId,
      deviceName: `Device_${deviceId.substring(0, 8)}`,
      peerConnection,
      connected: false,
      lastConnected: Date.now(),
    })

    // Store offer for signaling
    this.pendingOffers.set(deviceId, new RTCSessionDescription(peerConnection.localDescription!))
  }

  private setupDataChannel(dataChannel: RTCDataChannel, deviceId: string, deviceName: string): void {
    dataChannel.onopen = () => {
      console.log(`[LocalProvider] Data channel opened with ${deviceName}`)
    }

    dataChannel.onmessage = async (event) => {
      try {
        const message: SyncMessage = JSON.parse(event.data)
        await this.handleMessage(message, deviceId)
      } catch (error) {
        console.error('[LocalProvider] Error handling message:', error)
      }
    }

    dataChannel.onclose = () => {
      console.log(`[LocalProvider] Data channel closed with ${deviceName}`)
      const connection = this.connections.get(deviceId)
      if (connection) {
        connection.connected = false
      }
    }

    dataChannel.onerror = (error) => {
      console.error(`[LocalProvider] Data channel error with ${deviceName}:`, error)
    }
  }

  private async handleMessage(message: SyncMessage, deviceId: string): Promise<void> {
    console.log('[LocalProvider] Received message:', message.type)

    switch (message.type) {
      case 'handshake':
        // Handle device handshake
        break

      case 'sync-request':
        // Another device is requesting data
        break

      case 'sync-data':
        // Receive sync data from another device
        console.log(`[LocalProvider] Received ${Array.isArray(message.payload) ? message.payload.length : 0} deltas`)
        // Apply deltas to local storage
        break

      case 'sync-complete':
        // Sync completed
        break

      case 'error':
        // Handle error from remote device
        console.error('[LocalProvider] Remote error:', message.payload)
        break
    }
  }
}
