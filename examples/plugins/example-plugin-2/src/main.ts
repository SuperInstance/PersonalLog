/**
 * Quick Note Plugin
 *
 * Quickly capture and organize notes from conversations.
 * This plugin demonstrates:
 * - Message content analysis
 * - Data storage and retrieval
 * - Custom UI components
 * - Command registration
 * - Settings-based behavior
 * - Data export functionality
 *
 * @module examples/quick-note
 */

import type {
  PluginActivationContext,
  PluginAPIContext
} from '../../../../src/lib/plugin/types';

// ========================================
// TYPE DEFINITIONS
// ========================================

interface Note {
  id: string;
  content: string;
  sourceMessageId: string;
  conversationId: string;
  timestamp: number;
  tags: string[];
}

interface QuickNoteSettings {
  autoCapture: boolean;
  noteMarker: string;
  maxNotes: number;
}

// ========================================
// LIFECYCLE HOOKS
// ========================================

/**
 * Called when the plugin is activated
 *
 * @param context - Plugin activation context
 */
export async function onActivate(
  context: PluginActivationContext
): Promise<void> {
  const { api, events, logger, settings } = context;

  logger.info('Quick Note plugin activating!');

  // Setup auto-capture if enabled
  if (settings.autoCapture) {
    setupAutoCapture(api, events, settings);
  }

  // Register note capture command
  api.commands.register({
    id: 'quicknote.capture',
    title: 'Capture Note',
    description: 'Capture the selected message as a note',
    handler: 'async (context, messageId) => { return await captureNote(context, messageId); }'
  });

  // Register list notes command
  api.commands.register({
    id: 'quicknote.list',
    title: 'List Notes',
    description: 'Show all captured notes',
    handler: 'async (context) => { return await listNotes(context); }'
  });

  // Register export notes command
  api.commands.register({
    id: 'quicknote.export',
    title: 'Export Notes',
    description: 'Export notes to JSON',
    handler: 'async (context) => { return await exportNotes(context); }'
  });

  // Register notes view
  api.ui.registerView({
    id: 'quicknote-view',
    name: 'Quick Notes',
    path: '/plugins/quicknotes',
    description: 'View and manage your quick notes',
    icon: 'FileText',
    render: getNotesViewRenderer()
  });

  logger.info('Quick Note plugin activated successfully!');
}

/**
 * Called when the plugin is deactivated
 *
 * @param context - Plugin API context
 */
export async function onDeactivate(
  context: PluginAPIContext
): Promise<void> {
  context.logger.info('Quick Note plugin deactivating');
}

/**
 * Called when plugin settings change
 *
 * @param newSettings - New settings
 * @param oldSettings - Previous settings
 * @param context - Plugin context
 */
export async function onSettingsChange(
  newSettings: Record<string, any>,
  oldSettings: Record<string, any>,
  context: PluginAPIContext
): Promise<void> {
  context.logger.info('Settings changed', { newSettings, oldSettings });

  // React to note marker change
  if (newSettings.noteMarker !== oldSettings.noteMarker) {
    context.logger.info(`Note marker changed to: "${newSettings.noteMarker}"`);
  }
}

/**
 * Called when plugin is uninstalled
 *
 * @param context - Plugin context
 */
export async function onUninstall(
  context: PluginAPIContext
): Promise<void> {
  context.logger.info('Quick Note plugin uninstalling');

  // Export notes before cleanup
  const notes = await getAllNotes(context);
  if (notes.length > 0) {
    await context.storage.set('notes-backup', notes);
    context.logger.info(`Backed up ${notes.length} notes`);
  }

  // Clean up all data
  await context.storage.clear();
}

// ========================================
// NOTE CAPTURE
// ========================================

/**
 * Setup automatic note capture from messages
 *
 * @param api - Plugin API
 * @param events - Event bus
 * @param settings - Plugin settings
 */
function setupAutoCapture(
  api: any,
  events: any,
  settings: QuickNoteSettings
): void {
  events.on('message:received', async (message: any) => {
    // Check if message contains note marker
    const content = message.content || '';
    if (content.includes(settings.noteMarker)) {
      await captureNoteFromMessage(api, message, settings);
    }
  });
}

/**
 * Capture a note from a message
 *
 * @param api - Plugin API
 * @param message - Message object
 * @param settings - Plugin settings
 */
async function captureNoteFromMessage(
  api: any,
  message: any,
  settings: QuickNoteSettings
): Promise<void> {
  const context = api.context;
  const content = message.content.replace(settings.noteMarker, '').trim();

  const note: Note = {
    id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content,
    sourceMessageId: message.id,
    conversationId: message.conversationId,
    timestamp: Date.now(),
    tags: extractTags(content)
  };

  await saveNote(context, note);
  context.logger.info('Note captured', { noteId: note.id });
}

/**
 * Capture a note manually
 *
 * @param context - Plugin context
 * @param messageId - Message ID to capture
 * @returns The captured note
 */
export async function captureNote(
  context: PluginAPIContext,
  messageId: string
): Promise<Note> {
  const message = await context.api.messages.get(messageId);
  const settings = (context.settings || {}) as QuickNoteSettings;

  const note: Note = {
    id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content: message.content,
    sourceMessageId: messageId,
    conversationId: message.conversationId,
    timestamp: Date.now(),
    tags: extractTags(message.content)
  };

  await saveNote(context, note);
  context.logger.info('Note captured manually', { noteId: note.id });

  // Track analytics
  await context.api.analytics.trackEvent('note.captured', {
    noteId: note.id,
    conversationId: note.conversationId
  });

  return note;
}

/**
 * Save a note to storage
 *
 * @param context - Plugin context
 * @param note - Note to save
 */
async function saveNote(
  context: PluginAPIContext,
  note: Note
): Promise<void> {
  const notes = await getAllNotes(context);
  const settings = (context.settings || {}) as QuickNoteSettings;

  // Add new note
  notes.unshift(note);

  // Trim to max notes
  if (notes.length > settings.maxNotes) {
    notes.splice(settings.maxNotes);
  }

  await context.storage.set('notes', notes);
}

// ========================================
// NOTE RETRIEVAL
// ========================================

/**
 * Get all notes
 *
 * @param context - Plugin context
 * @returns Array of notes
 */
export async function getAllNotes(
  context: PluginAPIContext
): Promise<Note[]> {
  return await context.storage.get('notes') || [];
}

/**
 * Get notes by conversation
 *
 * @param context - Plugin context
 * @param conversationId - Conversation ID
 * @returns Array of notes
 */
export async function getNotesByConversation(
  context: PluginAPIContext,
  conversationId: string
): Promise<Note[]> {
  const allNotes = await getAllNotes(context);
  return allNotes.filter(note => note.conversationId === conversationId);
}

/**
 * Search notes
 *
 * @param context - Plugin context
 * @param query - Search query
 * @returns Array of matching notes
 */
export async function searchNotes(
  context: PluginAPIContext,
  query: string
): Promise<Note[]> {
  const allNotes = await getAllNotes(context);
  const lowerQuery = query.toLowerCase();

  return allNotes.filter(note =>
    note.content.toLowerCase().includes(lowerQuery) ||
    note.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * List notes with optional filtering
 *
 * @param context - Plugin context
 * @param options - Filter options
 * @returns Array of notes
 */
export async function listNotes(
  context: PluginAPIContext,
  options?: {
    limit?: number;
    conversationId?: string;
    tag?: string;
  }
): Promise<Note[]> {
  let notes = await getAllNotes(context);

  // Filter by conversation
  if (options?.conversationId) {
    notes = notes.filter(n => n.conversationId === options.conversationId);
  }

  // Filter by tag
  if (options?.tag) {
    notes = notes.filter(n => n.tags.includes(options.tag as string));
  }

  // Apply limit
  if (options?.limit) {
    notes = notes.slice(0, options.limit);
  }

  return notes;
}

// ========================================
// NOTE MANAGEMENT
// ========================================

/**
 * Delete a note
 *
 * @param context - Plugin context
 * @param noteId - Note ID to delete
 */
export async function deleteNote(
  context: PluginAPIContext,
  noteId: string
): Promise<void> {
  const notes = await getAllNotes(context);
  const filtered = notes.filter(n => n.id !== noteId);

  await context.storage.set('notes', filtered);
  context.logger.info('Note deleted', { noteId });
}

/**
 * Clear all notes
 *
 * @param context - Plugin context
 */
export async function clearAllNotes(
  context: PluginAPIContext
): Promise<void> {
  await context.storage.delete('notes');
  context.logger.info('All notes cleared');
}

// ========================================
// NOTE EXPORT
// ========================================

/**
 * Export notes to JSON
 *
 * @param context - Plugin context
 * @returns JSON string of notes
 */
export async function exportNotes(
  context: PluginAPIContext
): Promise<string> {
  const notes = await getAllNotes(context);

  const exportData = {
    exportedAt: new Date().toISOString(),
    totalNotes: notes.length,
    notes
  };

  const json = JSON.stringify(exportData, null, 2);

  context.logger.info('Notes exported', {
    count: notes.length
  });

  return json;
}

/**
 * Import notes from JSON
 *
 * @param context - Plugin context
 * @param json - JSON string to import
 */
export async function importNotes(
  context: PluginAPIContext,
  json: string
): Promise<void> {
  const data = JSON.parse(json);
  const notes = data.notes || [];

  await context.storage.set('notes', notes);

  context.logger.info('Notes imported', {
    count: notes.length
  });
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Extract tags from note content
 *
 * @param content - Note content
 * @returns Array of tags
 */
function extractTags(content: string): string[] {
  const tagRegex = /#(\w+)/g;
  const tags: string[] = [];
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    tags.push(match[1]);
  }

  return tags;
}

/**
 * Get notes view renderer
 *
 * @returns Serialized render function
 */
function getNotesViewRenderer(): string {
  return `
    async ({ context }) => {
      const [notes, setNotes] = React.useState([]);
      const [filter, setFilter] = React.useState('');
      const [loading, setLoading] = React.useState(true);

      // Load notes on mount
      React.useEffect(() => {
        loadNotes(context).then(data => {
          setNotes(data);
          setLoading(false);
        });
      }, [context]);

      // Filter notes
      const filtered = filter
        ? notes.filter(n =>
            n.content.toLowerCase().includes(filter.toLowerCase()) ||
            n.tags.some(t => t.toLowerCase().includes(filter.toLowerCase()))
          )
        : notes;

      return React.createElement('div', { style: { padding: '20px' } },
        // Header
        React.createElement('div', {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }
        },
          React.createElement('h2', {}, 'Quick Notes'),
          React.createElement('button', {
            onClick: () => exportAllNotes(context),
            style: {
              padding: '8px 16px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }
          }, 'Export')
        ),

        // Search
        React.createElement('input', {
          type: 'text',
          placeholder: 'Search notes...',
          value: filter,
          onChange: (e) => setFilter(e.target.value),
          style: {
            width: '100%',
            padding: '12px',
            marginBottom: '20px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '16px'
          }
        }),

        // Notes list
        loading
          ? React.createElement('div', {}, 'Loading...')
          : React.createElement('div', {},
              filtered.length === 0
                ? React.createElement('p', {
                    style: { textAlign: 'center', color: '#888' }
                  }, 'No notes found')
                : filtered.map(note =>
                    React.createElement('div', {
                      key: note.id,
                      style: {
                        padding: '16px',
                        marginBottom: '12px',
                        background: '#f9f9f9',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0'
                      }
                    },
                      // Content
                      React.createElement('p', {
                        style: { margin: '0 0 8px 0', whiteSpace: 'pre-wrap' }
                      }, note.content),

                      // Tags
                      note.tags.length > 0 && React.createElement('div', {
                        style: { marginBottom: '8px' }
                      },
                        note.tags.map(tag =>
                          React.createElement('span', {
                            key: tag,
                            style: {
                              display: 'inline-block',
                              padding: '2px 8px',
                              marginRight: '4px',
                              background: '#e0f0ff',
                              borderRadius: '4px',
                              fontSize: '0.875em',
                              color: '#0066cc'
                            }
                          }, '#' + tag)
                        )
                      ),

                      // Meta
                      React.createElement('div', {
                        style: {
                          fontSize: '0.75em',
                          color: '#888'
                        }
                      }, new Date(note.timestamp).toLocaleString())
                    )
                  )
            )
      );
    }
  `;
}

// Helper for renderer
async function loadNotes(context: any): Promise<Note[]> {
  return await context.storage.get('notes') || [];
}

async function exportAllNotes(context: any): Promise<void> {
  const notes = await context.storage.get('notes') || [];
  const json = JSON.stringify(notes, null, 2);

  // Download file
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notes-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
