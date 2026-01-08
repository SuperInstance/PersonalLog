# @superinstance/universal-import-export

A comprehensive, framework-agnostic data import/export system for JavaScript/TypeScript applications. Support for multiple formats including JSON, CSV, Markdown, HTML, PDF, and YAML with built-in validation, conflict resolution, and scheduling capabilities.

## Features

- **Multiple Import Sources**
  - ChatGPT exports
  - Claude exports
  - Generic JSON
  - CSV files
  - Extensible parser system

- **Multiple Export Formats**
  - JSON (native backup format)
  - Markdown (human-readable documentation)
  - CSV (spreadsheet-compatible)
  - HTML (web-viewable)
  - PDF (requires jsPDF)
  - YAML (requires js-yaml)
  - ZIP archives (requires JSZip)

- **Data Validation**
  - Schema validation
  - Type checking
  - Constraint verification
  - Security scanning

- **Conflict Resolution**
  - Automatic conflict detection
  - Multiple resolution strategies
  - Field-by-field comparison
  - Batch resolution support

- **Scheduling**
  - Automatic exports
  - Flexible schedules (daily, weekly, monthly, custom)
  - Export history tracking

## Installation

```bash
npm install @superinstance/universal-import-export
```

## Quick Start

### Basic Import

```typescript
import { getImportManager } from '@superinstance/universal-import-export'

const importManager = getImportManager()

// Import from a file
const file = /* File object from file input */
const preview = await importManager.importFile(file)

// Check for issues
if (preview.errors.length > 0) {
  console.error('Import errors:', preview.errors)
}

if (preview.conflicts.length > 0) {
  console.warn('Conflicts found:', preview.conflicts.length)
}

// Confirm import
const result = await importManager.confirmImport(preview.id)
console.log(`Imported ${result.stats.imported} items`)
```

### Basic Export

```typescript
import { getExportManager } from '@superinstance/universal-import-export'

const exportManager = getExportManager()

// Export data to JSON
const result = await exportManager.exportData({
  format: 'json',
  scope: 'all',
  dataProvider: {
    getConversations: async () => myConversations,
    getMessages: async (id) => getMessages(id),
    getKnowledge: async () => myKnowledge,
    getContacts: async () => myContacts,
    getSettings: async () => mySettings,
  }
})

// Download the file
await exportManager.downloadExport(result)
```

## Usage Examples

### Import from ChatGPT Export

```typescript
import { getImportManager } from '@superinstance/universal-import-export'

const importManager = getImportManager()

const preview = await importManager.importFromChatGPT(file)
console.log(`Found ${preview.items.length} conversations`)

// Import with custom conflict resolution
const resolutions = new Map()
resolutions.set('item_id', 'overwrite')

const result = await importManager.confirmImport(preview.id, resolutions)
```

### Export to Markdown

```typescript
import { getExportManager } from '@superinstance/universal-import-export'

const exportManager = getExportManager()

const result = await exportManager.exportData({
  format: 'markdown',
  scope: 'conversations',
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31'),
  },
  dataProvider: myDataProvider,
})

// Download
await exportManager.downloadExport(result)
```

### Export to CSV

```typescript
import { getExportManager } from '@superinstance/universal-import/export'

const exportManager = getExportManager()

const result = await exportManager.exportData({
  format: 'csv',
  scope: 'conversations',
  dataProvider: myDataProvider,
})

await exportManager.downloadExport(result)
```

### Schedule Automatic Exports

```typescript
import { getExportManager } from '@superinstance/universal-import-export'

const exportManager = getExportManager()

// Schedule daily backups at 2 AM
const scheduleId = await exportManager.scheduleExport({
  name: 'Daily Backup',
  type: 'daily',
  format: 'json',
  scope: 'all',
  config: {
    timeOfDay: '02:00',
    maxExports: 30, // Keep last 30 exports
  },
  options: {
    format: 'json',
    scope: 'all',
    dataProvider: myDataProvider,
  },
  active: true,
})

console.log(`Scheduled export: ${scheduleId}`)
```

### Custom Data Provider

```typescript
import { getExportManager, type DataProvider } from '@superinstance/universal-import-export'

const myDataProvider: DataProvider = {
  async getConversations() {
    // Return your conversations
    return await db.conversations.findMany()
  },

  async getMessages(conversationId: string) {
    // Return messages for a conversation
    return await db.messages.findMany({ where: { conversationId } })
  },

  async getKnowledge() {
    // Return knowledge base entries
    return await db.knowledge.findMany()
  },

  async getContacts() {
    // Return contacts
    return await db.contacts.findMany()
  },

  async getSettings() {
    // Return settings
    return await db.settings.findFirst()
  },
}

const exportManager = getExportManager()
const result = await exportManager.exportData({
  format: 'json',
  scope: 'all',
  dataProvider: myDataProvider,
})
```

### Import with Custom Data Provider

```typescript
import { getImportManager, type ImportDataProvider } from '@superinstance/universal-import-export'

const myDataProvider: ImportDataProvider = {
  async getItemById(id: string) {
    return await db.conversations.findUnique({ where: { id } })
  },

  async getAllItems() {
    return await db.conversations.findMany()
  },

  async createItem(data: any) {
    return await db.conversations.create({ data })
  },

  async addMessages(itemId: string, messages: any[]) {
    for (const msg of messages) {
      await db.messages.create({
        data: { ...msg, conversationId: itemId }
      })
    }
  },
}

const importManager = new ImportManager(myDataProvider)
const preview = await importManager.importFile(file)
```

### Validation

```typescript
import { ImportValidator } from '@superinstance/universal-import-export'

const validator = new ImportValidator()

const result = await validator.validate(myData)

if (!result.valid) {
  console.log('Schema errors:', result.schema.errors)
  console.log('Type errors:', result.types.errors)
  console.log('Constraint violations:', result.constraints.violations)
  console.log('Security issues:', result.security.issues)
}
```

### Conflict Resolution

```typescript
import { ConflictResolver } from '@superinstance/universal-import-export'

const resolver = new ConflictResolver(myDataProvider)

// Detect conflicts
const conflicts = await resolver.detectConflicts(items)

// Resolve conflicts
for (const conflict of conflicts) {
  const resolved = await resolver.resolveConflict(conflict, 'rename')
  // Use resolved data...
}

// Batch resolution
const resolutions = await resolver.resolveBatchConflicts(conflicts, 'skip')
```

## API Reference

### ImportManager

Main class for managing imports.

#### Methods

- `importFile(file: File, options?: Partial<ImportOptions>): Promise<ImportPreview>`
- `importFromChatGPT(file: File): Promise<ImportPreview>`
- `importFromClaude(file: File): Promise<ImportPreview>`
- `importFromJSON(jsonData: any): Promise<ImportPreview>`
- `importFromCSV(file: File): Promise<ImportPreview>`
- `confirmImport(previewId: string, conflictResolutions?: Map<string, ConflictResolution>): Promise<ImportResult>`
- `validateData(data: any): Promise<ValidationResult>`

### ExportManager

Main class for managing exports.

#### Methods

- `exportData(options: ExportOptions): Promise<ExportResult>`
- `exportConversations(format, options?): Promise<Blob>`
- `exportKnowledge(format, options?): Promise<Blob>`
- `exportSettings(format, options?): Promise<Blob>`
- `exportAll(format, options?): Promise<Blob>`
- `scheduleExport(schedule): Promise<string>`
- `downloadExport(result): Promise<void>`

## Types

### ImportOptions

```typescript
interface ImportOptions {
  conflictResolution: 'skip' | 'overwrite' | 'rename' | 'merge' | 'ask'
  validate: boolean
  preview: boolean
  mode: 'full' | 'selective' | 'merge' | 'replace'
  skipDuplicates: boolean
  preserveIds: boolean
  mapContacts: boolean
  createBackup: boolean
}
```

### ExportOptions

```typescript
interface ExportOptions {
  format: 'json' | 'markdown' | 'csv' | 'pdf' | 'html' | 'yaml' | 'zip'
  scope: 'all' | 'conversations' | 'knowledge' | 'settings' | 'analytics' | 'contacts'
  dateRange?: { start: Date; end: Date }
  includeAttachments?: boolean
  compress?: boolean
  dataProvider?: DataProvider
}
```

### DataProvider

```typescript
interface DataProvider {
  getConversations?: (options?: any) => Promise<any[]>
  getMessages?: (conversationId: string) => Promise<any[]>
  getKnowledge?: () => Promise<any[]>
  getContacts?: () => Promise<any[]>
  getSettings?: () => Promise<any>
}
```

## Advanced Features

### Custom Parsers

Extend the import system with custom parsers:

```typescript
import { ImportManager } from '@superinstance/universal-import-export'

class CustomParser {
  async parse(content: string): Promise<any[]> {
    // Your parsing logic
    return parsedData
  }

  static detectFormat(content: string): boolean {
    // Format detection logic
    return true
  }
}
```

### Custom Converters

Extend the export system with custom converters:

```typescript
import { ExportOptions, ExportStats } from '@superinstance/universal-import-export'

class CustomConverter {
  async exportData(options: ExportOptions): Promise<{ data: Blob; stats: ExportStats }> {
    // Your export logic
    return { data: blob, stats }
  }
}
```

## Browser Support

- Modern browsers with ES2022 support
- Uses Blob, File, and localStorage APIs
- Compatible with all major browsers

## Dependencies

- Zero runtime dependencies for core functionality
- Optional dependencies for advanced features:
  - `jszip` for ZIP export
  - `jspdf` for PDF export
  - `js-yaml` for YAML export

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please use the [GitHub issue tracker](https://github.com/SuperInstance/universal-import-export/issues).
