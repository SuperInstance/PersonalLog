/**
 * Sync Cryptography Module
 *
 * Provides end-to-end encryption for synchronized data.
 * Uses Web Crypto API for secure key generation and encryption.
 *
 * Security features:
 * - AES-256-GCM for data encryption
 * - RSA-OAEP for key exchange
 * - SHA-256 for checksums
 * - Key derivation using PBKDF2
 */

import { ValidationError, StorageError } from '@/lib/errors'

// ============================================================================
// TYPES
// ============================================================================

export interface KeyPair {
  publicKey: string    // Base64 encoded
  privateKey: string   // Base64 encoded
  keyId: string        // Unique key identifier
  createdAt: number
}

export interface EncryptionResult {
  ciphertext: string   // Base64 encoded
  iv: string          // Base64 encoded initialization vector
  keyId: string
  checksum: string    // SHA-256 hash
}

export interface DecryptionResult {
  plaintext: unknown
  verified: boolean   // Checksum verification
}

export interface DeviceKeyExchange {
  deviceId: string
  publicKey: string
  keyId: string
  signature: string   // Signature of publicKey + deviceId
  timestamp: number
}

// ============================================================================
// CRYPTOGRAPHY MANAGER
// ============================================================================

export class SyncCryptography {
  private keyPair: CryptoKeyPair | null = null
  private keyPairData: KeyPair | null = null
  private sessionKeys: Map<string, CryptoKey> = new Map() // keyId -> key
  private readonly keyStoragePrefix = 'sync-crypto-'

  /**
   * Initialize cryptography manager
   */
  async initialize(): Promise<void> {
    if (!this.hasWebCrypto()) {
      throw new ValidationError('Web Crypto API not available', {
        field: 'crypto',
        context: { userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown' }
      })
    }

    // Try to load existing key pair
    await this.loadKeyPair()
  }

  /**
   * Generate or load device key pair
   */
  async getOrCreateKeyPair(): Promise<KeyPair> {
    if (this.keyPair) {
      return this.keyPairData!
    }

    // Try to load from storage
    const stored = await this.loadKeyPair()
    if (stored) {
      return stored
    }

    // Generate new key pair
    return await this.generateKeyPair()
  }

  /**
   * Generate new RSA key pair for device
   */
  async generateKeyPair(): Promise<KeyPair> {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    )

    this.keyPair = keyPair

    // Export keys
    const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey)
    const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

    const keyPairData: KeyPair = {
      publicKey: this.arrayBufferToBase64(publicKeyBuffer),
      privateKey: this.arrayBufferToBase64(privateKeyBuffer),
      keyId: this.generateKeyId(),
      createdAt: Date.now(),
    }

    this.keyPairData = keyPairData

    // Store in IndexedDB
    await this.storeKeyPair(keyPairData)

    return keyPairData
  }

  /**
   * Encrypt data for another device
   */
  async encryptForDevice(
    data: unknown,
    recipientPublicKey: string,
    recipientKeyId: string
  ): Promise<EncryptionResult> {
    try {
      // Generate session key
      const sessionKey = await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256,
        },
        true,
        ['encrypt', 'decrypt']
      )

      // Encrypt data with session key
      const iv = window.crypto.getRandomValues(new Uint8Array(12))
      const dataJson = JSON.stringify(data)
      const dataBuffer = new TextEncoder().encode(dataJson)

      const ciphertext = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        sessionKey,
        dataBuffer
      )

      // Encrypt session key with recipient's public key
      const recipientKey = await this.importPublicKey(recipientPublicKey)
      const sessionKeyBuffer = await window.crypto.subtle.exportKey('raw', sessionKey)
      const encryptedSessionKey = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP',
        },
        recipientKey,
        sessionKeyBuffer
      )

      // Calculate checksum
      const checksum = await this.calculateChecksum(ciphertext)

      // Store session key for potential decryption
      this.sessionKeys.set(recipientKeyId, sessionKey)

      return {
        ciphertext: this.arrayBufferToBase64(ciphertext),
        iv: this.arrayBufferToBase64(iv.buffer),
        keyId: recipientKeyId,
        checksum,
      }
    } catch (error) {
      throw new StorageError('Failed to encrypt data', {
        technicalDetails: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Decrypt data from another device
   */
  async decryptFromDevice(
    encryption: EncryptionResult,
    senderPublicKey?: string
  ): Promise<DecryptionResult> {
    try {
      // Get session key
      const sessionKey = this.sessionKeys.get(encryption.keyId)
      if (!sessionKey) {
        throw new ValidationError('Session key not found', {
          field: 'keyId',
          value: encryption.keyId
        })
      }

      // Decrypt ciphertext
      const ciphertext = this.base64ToArrayBuffer(encryption.ciphertext)
      const iv = this.base64ToArrayBuffer(encryption.iv)

      const plaintextBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        sessionKey,
        ciphertext
      )

      const plaintextJson = new TextDecoder().decode(plaintextBuffer)
      const plaintext = JSON.parse(plaintextJson)

      // Verify checksum
      const verified = await this.verifyChecksum(ciphertext, encryption.checksum)

      return { plaintext, verified }
    } catch (error) {
      throw new StorageError('Failed to decrypt data', {
        technicalDetails: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Encrypt data with symmetric key (for local storage)
   */
  async encryptSymmetric(data: unknown, key: string): Promise<EncryptionResult> {
    try {
      const cryptoKey = await this.importSymmetricKey(key)
      const iv = window.crypto.getRandomValues(new Uint8Array(12))
      const dataJson = JSON.stringify(data)
      const dataBuffer = new TextEncoder().encode(dataJson)

      const ciphertext = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        cryptoKey,
        dataBuffer
      )

      const checksum = await this.calculateChecksum(ciphertext)

      return {
        ciphertext: this.arrayBufferToBase64(ciphertext),
        iv: this.arrayBufferToBase64(iv.buffer),
        keyId: 'symmetric',
        checksum,
      }
    } catch (error) {
      throw new StorageError('Failed to encrypt data symmetrically', {
        technicalDetails: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Decrypt data with symmetric key
   */
  async decryptSymmetric(
    encryption: EncryptionResult,
    key: string
  ): Promise<DecryptionResult> {
    try {
      const cryptoKey = await this.importSymmetricKey(key)
      const ciphertext = this.base64ToArrayBuffer(encryption.ciphertext)
      const iv = this.base64ToArrayBuffer(encryption.iv)

      const plaintextBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        cryptoKey,
        ciphertext
      )

      const plaintextJson = new TextDecoder().decode(plaintextBuffer)
      const plaintext = JSON.parse(plaintextJson)

      const verified = await this.verifyChecksum(ciphertext, encryption.checksum)

      return { plaintext, verified }
    } catch (error) {
      throw new StorageError('Failed to decrypt data symmetrically', {
        technicalDetails: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Calculate SHA-256 checksum
   */
  async calculateChecksum(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
    return this.arrayBufferToBase64(hashBuffer)
  }

  /**
   * Verify checksum
   */
  async verifyChecksum(data: ArrayBuffer, checksum: string): Promise<boolean> {
    const calculated = await this.calculateChecksum(data)
    return calculated === checksum
  }

  /**
   * Sign key exchange data
   */
  async signKeyExchange(exchange: Omit<DeviceKeyExchange, 'signature'>): Promise<string> {
    if (!this.keyPair) {
      throw new ValidationError('Key pair not initialized', { field: 'keyPair' })
    }

    const dataToSign = JSON.stringify({
      deviceId: exchange.deviceId,
      publicKey: exchange.publicKey,
      keyId: exchange.keyId,
      timestamp: exchange.timestamp,
    })

    const dataBuffer = new TextEncoder().encode(dataToSign)
    const signature = await window.crypto.subtle.sign(
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      this.keyPair.privateKey,
      dataBuffer
    )

    return this.arrayBufferToBase64(signature)
  }

  /**
   * Verify key exchange signature
   */
  async verifyKeyExchange(
    exchange: DeviceKeyExchange,
    signerPublicKey: string
  ): Promise<boolean> {
    try {
      const publicKey = await this.importPublicKey(signerPublicKey)

      const dataToVerify = JSON.stringify({
        deviceId: exchange.deviceId,
        publicKey: exchange.publicKey,
        keyId: exchange.keyId,
        timestamp: exchange.timestamp,
      })

      const dataBuffer = new TextEncoder().encode(dataToVerify)
      const signatureBuffer = this.base64ToArrayBuffer(exchange.signature)

      const isValid = await window.crypto.subtle.verify(
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256',
        },
        publicKey,
        signatureBuffer,
        dataBuffer
      )

      return isValid
    } catch {
      return false
    }
  }

  /**
   * Derive key from password (for backup/restore)
   */
  async deriveKeyFromPassword(
    password: string,
    salt: string
  ): Promise<string> {
    const encoder = new TextEncoder()
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )

    const saltBuffer = this.base64ToArrayBuffer(salt)

    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )

    const exportedKey = await window.crypto.subtle.exportKey('raw', key)
    return this.arrayBufferToBase64(exportedKey)
  }

  /**
   * Generate random salt for key derivation
   */
  generateSalt(): string {
    const salt = window.crypto.getRandomValues(new Uint8Array(16))
    return this.arrayBufferToBase64(salt.buffer)
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private hasWebCrypto(): boolean {
    return typeof window !== 'undefined' &&
           typeof window.crypto !== 'undefined' &&
           typeof window.crypto.subtle !== 'undefined'
  }

  private async loadKeyPair(): Promise<KeyPair | null> {
    try {
      const stored = localStorage.getItem(this.keyStoragePrefix + 'keypair')
      if (!stored) {
        return null
      }

      const keyPairData: KeyPair = JSON.parse(stored)

      // Import keys
      const publicKeyBuffer = this.base64ToArrayBuffer(keyPairData.publicKey)
      const privateKeyBuffer = this.base64ToArrayBuffer(keyPairData.privateKey)

      const publicKey = await window.crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['encrypt']
      )

      const privateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['decrypt']
      )

      this.keyPair = { publicKey, privateKey }
      this.keyPairData = keyPairData

      return keyPairData
    } catch {
      return null
    }
  }

  private async storeKeyPair(keyPair: KeyPair): Promise<void> {
    try {
      localStorage.setItem(this.keyStoragePrefix + 'keypair', JSON.stringify(keyPair))
    } catch (error) {
      throw new StorageError('Failed to store key pair', {
        technicalDetails: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  private async importPublicKey(publicKeyStr: string): Promise<CryptoKey> {
    const publicKeyBuffer = this.base64ToArrayBuffer(publicKeyStr)
    return await window.crypto.subtle.importKey(
      'spki',
      publicKeyBuffer,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['encrypt']
    )
  }

  private async importSymmetricKey(keyStr: string): Promise<CryptoKey> {
    const keyBuffer = this.base64ToArrayBuffer(keyStr)
    return await window.crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
  }

  private generateKeyId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let globalCrypto: SyncCryptography | null = null

export function getSyncCryptography(): SyncCryptography {
  if (!globalCrypto) {
    globalCrypto = new SyncCryptography()
  }
  return globalCrypto
}

export async function initializeCryptography(): Promise<void> {
  const crypto = getSyncCryptography()
  await crypto.initialize()
}
