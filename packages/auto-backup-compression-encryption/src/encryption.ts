/**
 * Encryption Module
 *
 * Provides encryption and decryption for backup data.
 * Uses Web Crypto API for secure key generation and encryption.
 *
 * Security features:
 * - AES-256-GCM for data encryption
 * - PBKDF2 for key derivation from passwords
 * - SHA-256 for checksums
 */

import { EncryptionError, ValidationError } from './errors'
import type { EncryptionResult, DecryptionResult, KeyPair } from './types'

// ============================================================================
// CRYPTOGRAPHY MANAGER
// ============================================================================

export class BackupCrypto {
  /**
   * Check if Web Crypto API is available
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' &&
           typeof window.crypto !== 'undefined' &&
           typeof window.crypto.subtle !== 'undefined'
  }

  /**
   * Encrypt data with symmetric key (for local storage)
   *
   * @param data - Data to encrypt
   * @param key - Encryption key (base64 encoded)
   * @returns Encryption result with ciphertext, IV, and checksum
   *
   * @example
   * ```typescript
   * const result = await BackupCrypto.encryptSymmetric({ foo: 'bar' }, 'base64-key')
   * console.log(result.ciphertext) // Encrypted data
   * ```
   */
  static async encryptSymmetric(data: unknown, key: string): Promise<EncryptionResult> {
    if (!this.isSupported()) {
      throw new EncryptionError('Web Crypto API not available', {
        technicalDetails: 'crypto.subtle is not available in this environment'
      })
    }

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
      throw new EncryptionError('Failed to encrypt data symmetrically', {
        technicalDetails: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Decrypt data with symmetric key
   *
   * @param encryption - Encryption result containing ciphertext and IV
   * @param key - Decryption key (base64 encoded)
   * @returns Decryption result with plaintext and verification status
   *
   * @example
   * ```typescript
   * const result = await BackupCrypto.decryptSymmetric(encryptionResult, 'base64-key')
   * console.log(result.plaintext) // Decrypted data
   * ```
   */
  static async decryptSymmetric(
    encryption: EncryptionResult,
    key: string
  ): Promise<DecryptionResult> {
    if (!this.isSupported()) {
      throw new EncryptionError('Web Crypto API not available', {
        technicalDetails: 'crypto.subtle is not available in this environment'
      })
    }

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
      throw new EncryptionError('Failed to decrypt data symmetrically', {
        technicalDetails: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Derive key from password (for backup/restore)
   *
   * @param password - User password
   * @param salt - Salt for key derivation (base64 encoded)
   * @returns Derived key (base64 encoded)
   *
   * @example
   * ```typescript
   * const salt = BackupCrypto.generateSalt()
   * const key = await BackupCrypto.deriveKeyFromPassword('my-password', salt)
   * ```
   */
  static async deriveKeyFromPassword(
    password: string,
    salt: string
  ): Promise<string> {
    if (!this.isSupported()) {
      throw new EncryptionError('Web Crypto API not available', {
        technicalDetails: 'crypto.subtle is not available in this environment'
      })
    }

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
   *
   * @returns Salt (base64 encoded)
   *
   * @example
   * ```typescript
   * const salt = BackupCrypto.generateSalt()
   * ```
   */
  static generateSalt(): string {
    if (!this.isSupported()) {
      throw new EncryptionError('Web Crypto API not available', {
        technicalDetails: 'crypto.subtle is not available in this environment'
      })
    }

    const salt = window.crypto.getRandomValues(new Uint8Array(16))
    return this.arrayBufferToBase64(salt.buffer)
  }

  /**
   * Calculate SHA-256 checksum
   *
   * @param data - Data to hash
   * @returns Checksum (base64 encoded)
   *
   * @example
   * ```typescript
   * const checksum = await BackupCrypto.calculateChecksum(dataBuffer)
   * ```
   */
  static async calculateChecksum(data: ArrayBuffer): Promise<string> {
    if (!this.isSupported()) {
      throw new EncryptionError('Web Crypto API not available', {
        technicalDetails: 'crypto.subtle is not available in this environment'
      })
    }

    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
    return this.arrayBufferToBase64(hashBuffer)
  }

  /**
   * Verify checksum
   *
   * @param data - Data to verify
   * @param checksum - Expected checksum
   * @returns True if checksum matches
   *
   * @example
   * ```typescript
   * const isValid = await BackupCrypto.verifyChecksum(dataBuffer, checksum)
   * ```
   */
  static async verifyChecksum(data: ArrayBuffer, checksum: string): Promise<boolean> {
    const calculated = await this.calculateChecksum(data)
    return calculated === checksum
  }

  /**
   * Generate RSA key pair for asymmetric encryption
   *
   * @returns Key pair with public and private keys
   *
   * @example
   * ```typescript
   * const keyPair = await BackupCrypto.generateKeyPair()
   * console.log(keyPair.publicKey) // Use for encryption
   * ```
   */
  static async generateKeyPair(): Promise<KeyPair> {
    if (!this.isSupported()) {
      throw new EncryptionError('Web Crypto API not available', {
        technicalDetails: 'crypto.subtle is not available in this environment'
      })
    }

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

    // Export keys
    const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey)
    const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

    const keyPairData: KeyPair = {
      publicKey: this.arrayBufferToBase64(publicKeyBuffer),
      privateKey: this.arrayBufferToBase64(privateKeyBuffer),
      keyId: this.generateKeyId(),
      createdAt: Date.now(),
    }

    return keyPairData
  }

  /**
   * Encrypt data for another device using public key
   *
   * @param data - Data to encrypt
   * @param recipientPublicKey - Recipient's public key (base64)
   * @returns Encryption result
   *
   * @example
   * ```typescript
   * const result = await BackupCrypto.encryptForDevice(
   *   { foo: 'bar' },
   *   publicKeyString
   * )
   * ```
   */
  static async encryptForDevice(
    data: unknown,
    recipientPublicKey: string
  ): Promise<EncryptionResult> {
    if (!this.isSupported()) {
      throw new EncryptionError('Web Crypto API not available', {
        technicalDetails: 'crypto.subtle is not available in this environment'
      })
    }

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

      return {
        ciphertext: this.arrayBufferToBase64(ciphertext),
        iv: this.arrayBufferToBase64(iv.buffer),
        keyId: this.generateKeyId(),
        checksum,
      }
    } catch (error) {
      throw new EncryptionError('Failed to encrypt data', {
        technicalDetails: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Decrypt data from another device using private key
   *
   * @param encryption - Encryption result
   * @param privateKey - Private key (base64)
   * @returns Decryption result
   *
   * @example
   * ```typescript
   * const result = await BackupCrypto.decryptFromDevice(
   *   encryptionResult,
   *   privateKeyString
   * )
   * ```
   */
  static async decryptFromDevice(
    encryption: EncryptionResult,
    privateKey: string
  ): Promise<DecryptionResult> {
    if (!this.isSupported()) {
      throw new EncryptionError('Web Crypto API not available', {
        technicalDetails: 'crypto.subtle is not available in this environment'
      })
    }

    try {
      // Import private key
      const privateKeyBuffer = this.base64ToArrayBuffer(privateKey)
      const cryptoKey = await window.crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['decrypt']
      )

      // Decrypt ciphertext
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

      // Verify checksum
      const verified = await this.verifyChecksum(ciphertext, encryption.checksum)

      return { plaintext, verified }
    } catch (error) {
      throw new EncryptionError('Failed to decrypt data', {
        technicalDetails: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private static async importSymmetricKey(keyStr: string): Promise<CryptoKey> {
    const keyBuffer = this.base64ToArrayBuffer(keyStr)
    return await window.crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
  }

  private static async importPublicKey(publicKeyStr: string): Promise<CryptoKey> {
    const publicKeyBuffer = this.base64ToArrayBuffer(publicKeyStr)
    return await window.crypto.subtle.importKey(
      'spki',
      publicKeyBuffer,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['encrypt']
    )
  }

  private static generateKeyId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }
}
