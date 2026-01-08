/**
 * LAN Sync Example
 *
 * Demonstrates local network device-to-device sync using WebRTC
 */

import {
  initializeSyncEngine,
  registerDevice,
  sync,
} from '@superinstance/multi-device-sync'
import { LocalProvider } from '@superinstance/multi-device-sync'

async function setupLANSync() {
  // Initialize sync engine
  const engine = await initializeSyncEngine({
    enabled: true,
    autoSync: true,
    syncInterval: 5, // 5 minutes
  })

  // Register this device
  const credentials = await registerDevice('My Laptop')
  console.log('Device registered:', credentials.deviceId)

  // Setup LAN sync provider
  const lanConfig = {
    type: 'local' as const,
    enabled: true,
    local: {
      deviceId: credentials.deviceId,
      deviceName: 'My Laptop',
      discoveryEnabled: true,
      pairedDevices: [
        // Add paired devices here
        // {
        //   deviceId: 'device_456',
        //   deviceName: 'My Phone',
        //   publicKey: credentials.encryptionKey,
        //   lastConnected: Date.now(),
        //   trusted: true,
        // }
      ],
    },
  }

  // Store config
  localStorage.setItem('sync-provider-config', JSON.stringify(lanConfig))

  // Listen to sync progress
  engine.onProgress((progress) => {
    console.log(`[LAN Sync] ${progress.stage}: ${progress.progress}%`)
  })

  // Start sync
  try {
    const result = await sync('bidirectional')
    console.log('LAN sync complete:', result)
  } catch (error) {
    console.error('LAN sync failed:', error)
  }
}

// Device Pairing Example
async function pairWithDevice() {
  const provider = new LocalProvider({
    deviceId: 'device_123',
    deviceName: 'Device A',
    discoveryEnabled: true,
    pairedDevices: [],
  })

  await provider.initialize()

  // Create offer for pairing
  const offer = await provider.generatePairingOffer('Device B')

  // In a real app, you'd exchange this offer via QR code, manual entry, etc.
  console.log('Pairing offer:', offer)

  // Other device would create answer and accept
  // const answer = await otherDevice.acceptPairing(offer)
  // await provider.acceptPairingAnswer(answer)
}

setupLANSync().catch(console.error)
