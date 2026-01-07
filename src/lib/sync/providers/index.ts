/**
 * Sync Provider Registry
 *
 * Manages available sync providers and factory functions.
 */

import { SyncProviderType, SyncProviderConfig, SyncProvider, ProviderCapabilities } from '../types'
import { LocalProvider } from './local'
import { SelfHostedProvider } from './self-hosted'
import { CommercialProvider } from './commercial'

// Re-export types for convenience
export type { SyncProvider, ProviderCapabilities } from '../types'

// ============================================================================
// PROVIDER FACTORY
// ============================================================================

export class SyncProviderFactory {
  /**
   * Create provider instance from config
   */
  static async createProvider(config: SyncProviderConfig): Promise<SyncProvider> {
    switch (config.type) {
      case 'local':
        return new LocalProvider(config.local!)

      case 'self-hosted':
        return new SelfHostedProvider(config.selfHosted!)

      case 'commercial':
        return new CommercialProvider(config.commercial!)

      default:
        throw new Error(`Unknown provider type: ${config.type}`)
    }
  }

  /**
   * Validate provider config
   */
  static validateConfig(config: SyncProviderConfig): boolean {
    if (!config.enabled) return false

    switch (config.type) {
      case 'local':
        return !!config.local?.deviceId && !!config.local?.deviceName

      case 'self-hosted':
        return !!config.selfHosted?.url && !!config.selfHosted?.provider

      case 'commercial':
        return !!config.commercial?.service && !!config.commercial?.accessToken

      default:
        return false
    }
  }

  /**
   * Get default config for provider type
   */
  static getDefaultConfig(type: SyncProviderType): Partial<SyncProviderConfig> {
    switch (type) {
      case 'local':
        return {
          type: 'local',
          enabled: false,
          local: {
            deviceId: '',
            deviceName: '',
            discoveryEnabled: true,
            pairedDevices: [],
          },
        }

      case 'self-hosted':
        return {
          type: 'self-hosted',
          enabled: false,
          selfHosted: {
            url: '',
            provider: 'webdav',
          },
        }

      case 'commercial':
        return {
          type: 'commercial',
          enabled: false,
          commercial: {
            service: 'dropbox',
            accessToken: '',
          },
        }

      default:
        return {}
    }
  }
}

// Export all providers
export { LocalProvider } from './local'
export { SelfHostedProvider } from './self-hosted'
export { CommercialProvider } from './commercial'
