/**
 * Basic Export Example
 *
 * Demonstrates how to export data to various formats.
 */

import { getExportManager, type DataProvider } from '@superinstance/universal-import-export'

// Sample data provider
const sampleDataProvider: DataProvider = {
  async getConversations() {
    return [
      {
        id: 'conv-1',
        title: 'Example Conversation',
        type: 'ai-assisted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'conv-2',
        title: 'Another Conversation',
        type: 'personal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
  },

  async getMessages(conversationId: string) {
    return [
      {
        id: 'msg-1',
        conversationId,
        type: 'text',
        author: 'user',
        content: { text: 'Hello, world!' },
        timestamp: new Date().toISOString(),
      },
      {
        id: 'msg-2',
        conversationId,
        type: 'text',
        author: { type: 'ai-contact', contactId: 'ai-1', contactName: 'AI Assistant' },
        content: { text: 'Hi! How can I help you today?' },
        timestamp: new Date().toISOString(),
      },
    ]
  },

  async getKnowledge() {
    return [
      {
        id: 'kb-1',
        type: 'note',
        sourceId: 'note-1',
        content: 'This is a knowledge base entry',
        timestamp: new Date().toISOString(),
      },
    ]
  },

  async getContacts() {
    return [
      {
        id: 'contact-1',
        name: 'AI Assistant',
        nickname: 'Assistant',
        createdAt: new Date().toISOString(),
      },
    ]
  },

  async getSettings() {
    return {
      theme: 'dark',
      fontSize: 16,
    }
  },
}

async function basicExport() {
  const exportManager = getExportManager()

  // Example 1: Export to JSON
  console.log('Example 1: Export to JSON')
  const jsonResult = await exportManager.exportData({
    format: 'json',
    scope: 'all',
    dataProvider: sampleDataProvider,
  })

  console.log(`File: ${jsonResult.filename}`)
  console.log(`Size: ${(jsonResult.stats.totalSize / 1024).toFixed(2)} KB`)
  console.log(`Duration: ${jsonResult.stats.duration}ms`)

  // Download the file
  await exportManager.downloadExport(jsonResult)

  // Example 2: Export to Markdown
  console.log('\nExample 2: Export to Markdown')
  const mdResult = await exportManager.exportData({
    format: 'markdown',
    scope: 'conversations',
    dataProvider: sampleDataProvider,
  })

  console.log(`File: ${mdResult.filename}`)
  await exportManager.downloadExport(mdResult)

  // Example 3: Export to CSV
  console.log('\nExample 3: Export to CSV')
  const csvResult = await exportManager.exportData({
    format: 'csv',
    scope: 'conversations',
    dataProvider: sampleDataProvider,
  })

  console.log(`File: ${csvResult.filename}`)
  await exportManager.downloadExport(csvResult)

  // Example 4: Export with date range
  console.log('\nExample 4: Export with date range')
  const dateRangeResult = await exportManager.exportData({
    format: 'json',
    scope: 'conversations',
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31'),
    },
    dataProvider: sampleDataProvider,
  })

  console.log(`Date range export: ${dateRangeResult.stats.conversations} conversations`)

  // Example 5: Quick export methods
  console.log('\nExample 5: Quick export methods')

  const conversationsBlob = await exportManager.exportConversations('json', {
    dataProvider: sampleDataProvider,
  })
  console.log(`Conversations blob size: ${conversationsBlob.size} bytes`)

  const knowledgeBlob = await exportManager.exportKnowledge('markdown', {
    dataProvider: sampleDataProvider,
  })
  console.log(`Knowledge blob size: ${knowledgeBlob.size} bytes`)

  // Example 6: Export history
  console.log('\nExample 6: Export history')
  const history = await exportManager.getExportHistory(10)
  console.log(`Recent exports: ${history.length}`)
  for (const record of history) {
    console.log(`  - ${record.format} / ${record.scope} at ${record.createdAt}`)
  }
}

// Run the example
basicExport().catch(console.error)
