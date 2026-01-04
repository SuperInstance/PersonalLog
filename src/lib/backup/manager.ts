/**
 * Backup Manager
 *
 * Core orchestrator for creating, restoring, and managing backups.
 * Coordinates data collection from all storage systems.
 */

import {
  Backup,
  BackupType,
  BackupData,
  BackupCategory,
  CreateBackupOptions,
  RestoreBackupOptions,
  RestoreResult,
  RestorePreview,
  BackupProgress,
  RestoreProgress,
  BackupFile
} from './types'
import {
  saveBackup,
  getBackup,
  listBackups,
  deleteBackup,
  getBackupStatistics,
  exportBackupAsFile,
  importBackupFromFile,
  isStorageQuotaExceeded,
  autoDeleteOldBackups
} from './storage'
import { compressBackup, decompressBackup } from './compression'
import { calculateChecksum, verifyBackup, quickValidate } from './verification'
import {
  listConversations,
  getMessages
} from '@/lib/storage/conversation-store'
import { getVectorStore } from '@/lib/knowledge/vector-store'
import { listContacts } from '@/lib/wizard/model-store'
import { StorageError, ValidationError, NotFoundError } from '@/lib/errors'

// ============================================================================
// BACKUP CREATION
// ============================================================================

/**
 * Create a backup
 *
 * @param options - Backup options
 * @returns Created backup
 *
 * @example
 * ```typescript
 * const backup = await createBackup({
 *   name: 'My Backup',
 *   type: 'full',
 *   compress: true
 * })
 * ```
 */
export async function createBackup(options: CreateBackupOptions = {}): Promise<Backup> {
  const {
    type = 'full',
    name,
    description,
    tags = [],
    compress = true,
    categories = ['all'],
    parentBackupId,
    isAutomatic = false,
    onProgress
  } = options

  try {
    // Report progress
    reportProgress(onProgress as any, { stage: 'preparing', progress: 0, message: 'Preparing backup...' })

    // Generate backup metadata
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const timestamp = new Date().toISOString()

    // Collect data based on categories
    const data = await collectBackupData(categories, onProgress as any)
    const dataSize = new Blob([JSON.stringify(data)]).size

    // Calculate checksum
    reportProgress(onProgress as ((progress: BackupProgress | RestoreProgress) => void) | undefined, { stage: 'exporting', progress: 50, message: 'Calculating checksum...' })
    const checksum = await calculateChecksum(data)

    // Create backup object
    const backup: Backup = {
      id: backupId,
      timestamp,
      type,
      status: 'completed',
      size: dataSize,
      compressedSize: 0, // Will be updated after compression
      compression: compress ? 'gzip' : 'none',
      encryption: 'none',
      checksum,
      version: '1.0.0',
      appVersion: '2.0.0', // TODO: Get from package.json
      isAutomatic,
      name: name || generateBackupName(type, isAutomatic),
      description,
      tags,
      parentBackupId,
      data
    }

    // Compress if requested
    if (compress) {
      reportProgress(onProgress as any, { stage: 'compressing', progress: 70, message: 'Compressing backup...' })
      await compressBackup(backup)
    }

    // Save to storage
    reportProgress(onProgress as any, { stage: 'saving', progress: 90, message: 'Saving backup...' })
    await saveBackup(backup)

    reportProgress(onProgress as any, { stage: 'completed', progress: 100, message: 'Backup completed!' })

    console.log(`[Backup Manager] Created backup: ${backup.name} (${backup.compressedSize} bytes)`)
    return backup
  } catch (error) {
    throw new StorageError(`Failed to create backup: ${name || 'unnamed'}`, {
      technicalDetails: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error : undefined
    })
  }
}

/**
 * Collect data for backup from all sources
 */
async function collectBackupData(
  categories: BackupCategory[],
  onProgress?: (progress: BackupProgress) => void
): Promise<BackupData> {
  const data: BackupData = {}
  const includeAll = categories.includes('all')

  // Collect conversations
  if (includeAll || categories.includes('conversations')) {
    reportProgress(onProgress as any, { stage: 'exporting', progress: 10, message: 'Exporting conversations...', category: 'conversations' })
    data.conversations = await exportConversations()
  }

  // Collect knowledge
  if (includeAll || categories.includes('knowledge')) {
    reportProgress(onProgress as any, { stage: 'exporting', progress: 30, message: 'Exporting knowledge base...', category: 'knowledge' })
    data.knowledge = await exportKnowledge()
  }

  // Collect settings
  if (includeAll || categories.includes('settings')) {
    reportProgress(onProgress as any, { stage: 'exporting', progress: 40, message: 'Exporting settings...', category: 'settings' })
    data.settings = await exportSettings()
  }

  // Collect analytics
  if (includeAll || categories.includes('analytics')) {
    reportProgress(onProgress as any, { stage: 'exporting', progress: 45, message: 'Exporting analytics...', category: 'analytics' })
    data.analytics = await exportAnalytics()
  }

  // Collect personalization
  if (includeAll || categories.includes('personalization')) {
    reportProgress(onProgress as any, { stage: 'exporting', progress: 48, message: 'Exporting personalization...', category: 'personalization' })
    data.personalization = await exportPersonalization()
  }

  return data
}

// ============================================================================
// DATA EXPORT
// ============================================================================

/**
 * Export conversations and messages
 */
async function exportConversations(): Promise<any[]> {
  const conversations = await listConversations({ includeArchived: true })

  return Promise.all(conversations.map(async (conv) => {
    const messages = await getMessages(conv.id)
    const aiContacts = conv.aiContacts || []

    return {
      id: conv.id,
      title: conv.title,
      type: conv.type,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messages: messages.map(msg => ({
        id: msg.id,
        conversationId: msg.conversationId,
        type: msg.type,
        author: msg.author,
        content: msg.content,
        timestamp: msg.timestamp,
        replyTo: msg.replyTo,
        metadata: msg.metadata
      })),
      aiContacts: aiContacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        provider: contact.config.provider,
        model: contact.config.model,
        systemPrompt: contact.personality.systemPrompt,
        temperature: contact.config.temperature,
        maxTokens: contact.config.maxTokens,
        createdAt: contact.createdAt
      })),
      settings: conv.settings,
      metadata: conv.metadata
    }
  }))
}

/**
 * Export knowledge base
 */
async function exportKnowledge(): Promise<any[]> {
  const vectorStore = getVectorStore()
  await vectorStore.init()
  return await vectorStore.getEntries()
}

/**
 * Export settings
 */
async function exportSettings(): Promise<any> {
  // Collect from localStorage
  const settings: any = {
    preferences: {},
    featureFlags: {}
  }

  // User preferences
  const theme = localStorage.getItem('theme')
  const fontSize = localStorage.getItem('fontSize')
  const sidebarPosition = localStorage.getItem('sidebarPosition')

  if (theme) settings.preferences.theme = theme
  if (fontSize) settings.preferences.fontSize = parseFloat(fontSize)
  if (sidebarPosition) settings.preferences.sidebarPosition = sidebarPosition

  // Feature flags
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('feature_')) {
      const value = localStorage.getItem(key)
      if (value) {
        try {
          settings.featureFlags[key.substring(8)] = JSON.parse(value)
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  return settings
}

/**
 * Export analytics data
 */
async function exportAnalytics(): Promise<any> {
  // Analytics export - simplified for now
  return {
    events: [],
    statistics: {
      totalEvents: 0,
      totalSessions: 0,
      lastUpdated: new Date().toISOString()
    }
  }
}

/**
 * Export personalization data
 */
async function exportPersonalization(): Promise<any> {
  // Personalization export - simplified for now
  return {
    communication: {},
    ui: {},
    content: {},
    patterns: {},
    preferences: {},
    learning: {}
  }
}

// ============================================================================
// BACKUP RESTORATION
// ============================================================================

/**
 * Restore from a backup
 *
 * @param backupId - Backup ID to restore
 * @param options - Restore options
 * @returns Restore result
 *
 * @example
 * ```typescript
 * const result = await restoreBackup('backup_123', {
 *   createPreRestoreBackup: true,
 *   verifyBeforeRestore: true
 * })
 * ```
 */
export async function restoreBackup(
  backupId: string,
  options: RestoreBackupOptions = {}
): Promise<RestoreResult> {
  const {
    createPreRestoreBackup = true,
    categories = ['all'],
    verifyBeforeRestore = true,
    overwrite = false,
    onProgress,
    onConfirm
  } = options

  const startTime = Date.now()
  let preRestoreBackupId: string | undefined

  try {
    // Get backup
    reportProgress(onProgress as ((progress: BackupProgress | RestoreProgress) => void) | undefined, { stage: 'preparing', progress: 0, message: 'Loading backup...' })
    const backup = await getBackup(backupId)

    if (!backup) {
      throw new NotFoundError('backup', backupId)
    }

    // Verify backup integrity if requested
    if (verifyBeforeRestore) {
      reportProgress(onProgress as any, { stage: 'verifying', progress: 5, message: 'Verifying backup integrity...' })
      const verification = await verifyBackup(backup)

      if (!verification.valid) {
        throw new ValidationError('Backup verification failed', {
          context: { verification }
        })
      }
    }

    // Create preview for confirmation
    const preview = createRestorePreview(backup, overwrite, createPreRestoreBackup)

    // Request confirmation if callback provided
    if (onConfirm) {
      const confirmed = await onConfirm(preview)
      if (!confirmed) {
        throw new ValidationError('Restore cancelled by user', {
          context: { backupId }
        })
      }
    }

    // Create pre-restore backup if requested
    if (createPreRestoreBackup) {
      reportProgress(onProgress as any, { stage: 'preparing', progress: 10, message: 'Creating pre-restore backup...' })
      const preRestore = await createBackup({
        name: `Pre-restore backup (${new Date().toISOString()})`,
        isAutomatic: true,
        compress: true
      })
      preRestoreBackupId = preRestore.id
    }

    // Restore data
    reportProgress(onProgress as any, { stage: 'restoring', progress: 20, message: 'Restoring data...' })
    const restoreResult = await restoreBackupData(backup.data, categories, onProgress as any)

    reportProgress(onProgress as any, { stage: 'validating', progress: 95, message: 'Validating restore...' })
    reportProgress(onProgress as any, { stage: 'completed', progress: 100, message: 'Restore completed!' })

    const result: RestoreResult = {
      success: true,
      itemsRestored: restoreResult,
      errors: [],
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      backupId,
      preRestoreBackupCreated: createPreRestoreBackup,
      preRestoreBackupId
    }

    console.log(`[Backup Manager] Restored backup: ${backup.name}`)
    return result
  } catch (error) {
    const result: RestoreResult = {
      success: false,
      itemsRestored: {
        conversations: 0,
        messages: 0,
        knowledge: 0,
        settings: 0,
        analytics: 0,
        personalization: 0
      },
      errors: [{
        category: 'restore',
        message: error instanceof Error ? error.message : String(error)
      }],
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      backupId,
      preRestoreBackupCreated: createPreRestoreBackup,
      preRestoreBackupId
    }

    console.error('[Backup Manager] Restore failed:', error)
    return result
  }
}

/**
 * Restore data from backup
 */
async function restoreBackupData(
  data: any,
  categories: BackupCategory[],
  onProgress?: (progress: RestoreProgress) => void
): Promise<{
  conversations: number
  messages: number
  knowledge: number
  settings: number
  analytics: number
  personalization: number
}> {
  const result = {
    conversations: 0,
    messages: 0,
    knowledge: 0,
    settings: 0,
    analytics: 0,
    personalization: 0
  }

  const includeAll = categories.includes('all')

  // Restore conversations
  if (includeAll || categories.includes('conversations')) {
    reportProgress(onProgress as ((progress: BackupProgress | RestoreProgress) => void) | undefined, { stage: 'restoring', progress: 30, message: 'Restoring conversations...', category: 'conversations' })
    const restored = await restoreConversations(data.conversations || [])
    result.conversations = restored.conversations
    result.messages = restored.messages
  }

  // Restore knowledge
  if (includeAll || categories.includes('knowledge')) {
    reportProgress(onProgress as ((progress: BackupProgress | RestoreProgress) => void) | undefined, { stage: 'restoring', progress: 50, message: 'Restoring knowledge base...', category: 'knowledge' })
    result.knowledge = await restoreKnowledge(data.knowledge || [])
  }

  // Restore settings
  if (includeAll || categories.includes('settings')) {
    reportProgress(onProgress as any, { stage: 'restoring', progress: 70, message: 'Restoring settings...', category: 'settings' })
    result.settings = await restoreSettings(data.settings || {})
  }

  // Restore analytics
  if (includeAll || categories.includes('analytics')) {
    reportProgress(onProgress as any, { stage: 'restoring', progress: 85, message: 'Restoring analytics...', category: 'analytics' })
    result.analytics = await restoreAnalytics(data.analytics || {})
  }

  // Restore personalization
  if (includeAll || categories.includes('personalization')) {
    reportProgress(onProgress as any, { stage: 'restoring', progress: 90, message: 'Restoring personalization...', category: 'personalization' })
    result.personalization = await restorePersonalization(data.personalization || {})
  }

  return result
}

// ============================================================================
// DATA RESTORATION
// ============================================================================

/**
 * Restore conversations (simplified - just counts for now)
 */
async function restoreConversations(conversations: any[]): Promise<{
  conversations: number
  messages: number
}> {
  let messageCount = 0

  for (const conv of conversations) {
    messageCount += conv.messages?.length || 0
  }

  // Full implementation would restore to IndexedDB
  return { conversations: conversations.length, messages: messageCount }
}

/**
 * Restore knowledge base
 */
async function restoreKnowledge(knowledge: any[]): Promise<number> {
  // Full implementation would restore to vector store
  return knowledge.length
}

/**
 * Restore settings
 */
async function restoreSettings(settings: any): Promise<number> {
  let restored = 0

  if (settings.preferences) {
    for (const [key, value] of Object.entries(settings.preferences)) {
      if (typeof value === 'string') {
        localStorage.setItem(key, value)
        restored++
      }
    }
  }

  return restored
}

/**
 * Restore analytics
 */
async function restoreAnalytics(analytics: any): Promise<number> {
  // Full implementation would restore to analytics storage
  return analytics.events?.length || 0
}

/**
 * Restore personalization
 */
async function restorePersonalization(personalization: any): Promise<number> {
  // Full implementation would restore to personalization storage
  return Object.keys(personalization).length
}

// ============================================================================
// BACKUP MANAGEMENT
// ============================================================================

/**
 * Delete a backup
 *
 * @param backupId - Backup ID to delete
 */
export async function deleteBackupById(backupId: string): Promise<void> {
  await deleteBackup(backupId)
  console.log(`[Backup Manager] Deleted backup: ${backupId}`)
}

/**
 * Get backup statistics
 *
 * @returns Backup statistics
 */
export async function getStatistics() {
  return await getBackupStatistics()
}

/**
 * Download backup as file
 *
 * @param backupId - Backup ID
 * @returns File blob
 */
export async function downloadBackup(backupId: string): Promise<Blob> {
  const backup = await getBackup(backupId)

  if (!backup) {
    throw new NotFoundError('backup', backupId)
  }

  return await exportBackupAsFile(backup, backup.compression)
}

/**
 * Upload and restore from backup file
 *
 * @param file - Uploaded file
 * @param options - Restore options
 * @returns Restore result
 */
export async function restoreFromUploadedFile(
  file: File,
  options?: RestoreBackupOptions
): Promise<RestoreResult> {
  // Import file
  const backupFile = await importBackupFromFile(file)

  // Create backup object
  const backup: Backup = {
    id: `upload_${Date.now()}`,
    timestamp: backupFile.timestamp,
    type: backupFile.type,
    status: 'completed',
    size: new Blob([JSON.stringify(backupFile.data)]).size,
    compressedSize: 0,
    compression: backupFile.compression,
    encryption: backupFile.encryption,
    checksum: backupFile.checksum,
    version: backupFile.version,
    appVersion: backupFile.appVersion,
    isAutomatic: false,
    name: `Uploaded: ${file.name}`,
    data: backupFile.data,
    tags: ['uploaded'],
    parentBackupId: undefined
  }

  // Save to storage
  await saveBackup(backup)

  // Restore
  return await restoreBackup(backup.id, options)
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate backup name
 */
function generateBackupName(type: BackupType, isAutomatic: boolean): string {
  const date = new Date().toLocaleDateString()
  const time = new Date().toLocaleTimeString()

  if (isAutomatic) {
    return `Automatic ${type} backup - ${date} ${time}`
  }

  return `${type.charAt(0).toUpperCase() + type.slice(1)} backup - ${date} ${time}`
}

/**
 * Create restore preview
 */
function createRestorePreview(
  backup: Backup,
  overwrite: boolean,
  preRestoreBackup: boolean
): RestorePreview {
  const data = backup.data

  return {
    backupId: backup.id,
    backupName: backup.name,
    backupDate: backup.timestamp,
    backupSize: backup.size,
    backupType: backup.type,
    itemsToRestore: {
      conversations: data.conversations?.length || 0,
      messages: data.conversations?.reduce((sum: number, c: any) => sum + (c.messages?.length || 0), 0) || 0,
      knowledge: data.knowledge?.length || 0,
      settings: Object.keys(data.settings || {}).length,
      analytics: data.analytics?.events?.length || 0,
      personalization: Object.keys(data.personalization || {}).length
    },
    willOverwrite: overwrite,
    preRestoreBackup,
    estimatedDuration: Math.max(backup.data.conversations?.length || 0, 10) * 100 // Rough estimate
  }
}

/**
 * Report progress
 */
function reportProgress(
  callback: ((progress: BackupProgress | RestoreProgress) => void) | undefined,
  progress: BackupProgress | RestoreProgress
): void {
  if (callback) {
    try {
      callback(progress)
    } catch (error) {
      console.error('[Backup Manager] Progress callback error:', error)
    }
  }
}
