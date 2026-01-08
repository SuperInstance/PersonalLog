/**
 * Basic Import Example
 *
 * Demonstrates how to import data from various sources.
 */

import { getImportManager } from '@superinstance/universal-import-export'

async function basicImport() {
  const importManager = getImportManager()

  // Example 1: Import from a file
  console.log('Example 1: Import from file')
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

  if (fileInput?.files?.[0]) {
    const file = fileInput.files[0]

    // Create a preview
    const preview = await importManager.importFile(file)

    console.log(`Source type: ${preview.sourceType}`)
    console.log(`Items found: ${preview.items.length}`)
    console.log(`Conflicts: ${preview.conflicts.length}`)
    console.log(`Warnings: ${preview.warnings.length}`)
    console.log(`Errors: ${preview.errors.length}`)

    // Check if import can proceed
    if (!preview.canImport) {
      console.error('Cannot import due to blocking errors:', preview.errors)
      return
    }

    // Confirm import
    const result = await importManager.confirmImport(preview.id)

    console.log(`Import successful: ${result.success}`)
    console.log(`Imported: ${result.stats.imported} items`)
    console.log(`Skipped: ${result.stats.skipped} items`)
    console.log(`Duration: ${result.duration}ms`)
  }

  // Example 2: Import from ChatGPT export
  console.log('\nExample 2: Import from ChatGPT')
  const chatgptFile = /* Get ChatGPT export file */ null as unknown as File

  if (chatgptFile) {
    const preview = await importManager.importFromChatGPT(chatgptFile)
    console.log(`ChatGPT conversations: ${preview.items.length}`)

    // Handle conflicts
    if (preview.conflicts.length > 0) {
      const resolutions = new Map<string, 'skip' | 'overwrite' | 'rename' | 'merge'>()

      // Auto-resolve all conflicts by renaming
      for (const conflict of preview.conflicts) {
        resolutions.set(conflict.item.sourceId, 'rename')
      }

      const result = await importManager.confirmImport(preview.id, resolutions)
      console.log(`Imported with resolved conflicts: ${result.success}`)
    }
  }

  // Example 3: Import from JSON
  console.log('\nExample 3: Import from JSON')
  const jsonData = {
    version: '1.0.0',
    metadata: {
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      scope: 'conversations',
      itemCount: 1,
    },
    conversations: [
      {
        id: 'conv-1',
        title: 'Example Conversation',
        type: 'ai-assisted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: 'msg-1',
            type: 'text',
            author: 'user',
            content: { text: 'Hello!' },
            timestamp: new Date().toISOString(),
          },
        ],
      },
    ],
  }

  const jsonPreview = await importManager.importFromJSON(jsonData)
  console.log(`JSON items: ${jsonPreview.items.length}`)
}

// Run the example
basicImport().catch(console.error)
