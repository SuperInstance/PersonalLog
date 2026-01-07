# Quick Note Plugin

Quickly capture and organize notes from your conversations.

## Features

- **Auto-Capture**: Automatically mark messages as notes with `/note`
- **Quick Commands**: Fast note capture via command palette
- **Tagging**: Use hashtags to organize notes (#important, #todo, etc.)
- **Search**: Full-text search through all notes
- **Export**: Export notes to JSON for backup
- **Notes View**: Dedicated view for managing notes

## Installation

1. Copy the plugin to your PersonalLog plugins directory
2. Enable the plugin in settings
3. Configure auto-capture and note marker

## Usage

### Auto-Capture Notes

When auto-capture is enabled, any message containing `/note` will be automatically captured:

```
This is important /note
```

### Manual Capture

1. Select a message
2. Open command palette (Ctrl/Cmd + Shift + P)
3. Select "Capture Note"

### View Notes

Navigate to `/plugins/quicknotes` to see all your notes.

### Search Notes

Use the search box to filter notes by content or tags.

### Export Notes

Click "Export" to download all notes as JSON.

## Settings

- **Auto-Capture**: Automatically capture messages with note marker
- **Note Marker**: Text that marks a message as a note (default: `/note`)
- **Maximum Notes**: Maximum number of notes to store (default: 100)

## API Usage

```typescript
// Get all notes
const notes = await listNotes(context);

// Get notes from specific conversation
const convNotes = await getNotesByConversation(context, 'conv-id');

// Search notes
const results = await searchNotes(context, 'important');

// Delete a note
await deleteNote(context, 'note-id');

// Clear all notes
await clearAllNotes(context);

// Export notes
const json = await exportNotes(context);

// Import notes
await importNotes(context, jsonString);
```

## Development

Built with TypeScript and PersonalLog Plugin SDK.

## License

MIT

## Author

PersonalLog Team
