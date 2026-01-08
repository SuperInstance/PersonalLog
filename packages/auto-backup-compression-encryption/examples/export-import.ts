/**
 * Export/Import Example
 *
 * Demonstrates downloading backups as files and restoring from uploaded files.
 */

import {
  createBackup,
  downloadBackup,
  restoreFromUploadedFile
} from '@superinstance/auto-backup-compression-encryption'

// Sample application data
const appState = {
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  data: {
    users: [
      { id: 1, name: 'Alice', settings: { theme: 'dark' } },
      { id: 2, name: 'Bob', settings: { theme: 'light' } }
    ],
    posts: [
      { id: 1, title: 'Welcome', content: 'First post!' }
    ]
  }
}

/**
 * Export data to a downloadable file
 */
async function exportToFile() {
  try {
    // Create backup
    const backup = await createBackup({
      data: appState,
      name: 'App Export',
      compress: true
    })

    // Download as file
    const blob = await downloadBackup(backup.id)

    // Trigger browser download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup-${backup.id}.json.gz`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log(`Exported to: backup-${backup.id}.json.gz`)
    console.log(`File size: ${blob.size} bytes`)

    return backup.id
  } catch (error) {
    console.error('Export failed:', error)
  }
}

/**
 * Import data from an uploaded file
 */
async function importFromFile(file: File) {
  try {
    // Show preview
    console.log(`Importing from: ${file.name}`)
    console.log(`File size: ${file.size} bytes`)

    // Restore from file
    const result = await restoreFromUploadedFile(file, {
      verifyBeforeRestore: true,
      onConfirm: async (preview) => {
        // Show confirmation dialog
        const message = `Restore "${preview.backupName}"?\n` +
          `Date: ${preview.backupDate}\n` +
          `Items: ${JSON.stringify(preview.itemsToRestore, null, 2)}\n` +
          `Size: ${preview.backupSize} bytes`

        return window.confirm(message)
      }
    })

    if (result.success) {
      console.log('Import successful!')
      console.log('Data:', result.data)
      console.log('Items restored:', result.itemsRestored)
      return result.data
    } else {
      console.error('Import failed:', result.errors)
    }
  } catch (error) {
    console.error('Import failed:', error)
  }
}

/**
 * Set up file input for importing
 */
function setupFileInput() {
  const fileInput = document.getElementById('file-input') as HTMLInputElement

  fileInput?.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    await importFromFile(file)
  })
}

/**
 * Create HTML UI for export/import
 */
function createUI() {
  const container = document.createElement('div')
  container.innerHTML = `
    <h2>Backup Export/Import</h2>

    <div>
      <h3>Export</h3>
      <button id="export-btn">Download Backup</button>
    </div>

    <div>
      <h3>Import</h3>
      <input type="file" id="file-input" accept=".json,.gz" />
    </div>

    <div id="status"></div>
  `

  document.body.appendChild(container)

  // Export button
  const exportBtn = document.getElementById('export-btn') as HTMLButtonElement
  exportBtn?.addEventListener('click', async () => {
    const status = document.getElementById('status')
    status!.textContent = 'Exporting...'

    try {
      await exportToFile()
      status!.textContent = 'Export complete!'
    } catch (error) {
      status!.textContent = `Export failed: ${error}`
    }
  })

  // File input
  setupFileInput()
}

// Example usage
async function runExample() {
  console.log('=== Export/Import Example ===\n')

  // Export
  console.log('Exporting data...\n')
  const backupId = await exportToFile()

  console.log('\n---\n')

  // For import, you need a file input element
  console.log('To test import:')
  console.log('1. Call createUI() to create the interface')
  console.log('2. Click "Download Backup" to export')
  console.log('3. Use the file input to import the downloaded file')
}

// Uncomment to create UI
// createUI()

// Uncomment to run export example
// runExample()
