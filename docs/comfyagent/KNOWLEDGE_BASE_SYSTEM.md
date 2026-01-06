# Knowledge Base & Note-Taking System - Complete Documentation

## Overview

A comprehensive markdown-based note-taking system with STT (Speech-to-Text) integration, file attachments, and intelligent organization features. Designed as a knowledge base that integrates seamlessly with the chatbot for contextual reference.

## Core Features

### 1. Markdown Note Taking
- ✅ Full markdown support with live preview
- ✅ Rich text editing with syntax highlighting
- ✅ Auto-save functionality
- ✅ Word count and character count
- ✅ Note metadata (description, tags)
- ✅ Pinning important notes
- ✅ Manual ordering

### 2. Speech-to-Text Transcription
- ✅ STT (ASR) integration using z-ai-web-dev-sdk
- ✅ Audio file upload and transcription
- ✅ Transcription text appended to note
- ✅ Audio duration tracking
- ✅ Automatic transcript attachment as note file
- ✅ Easy integration with note content

### 3. File Management
- ✅ Multiple file types supported:
  - Markdown
  - Images (PNG, JPG, etc.)
  - PDFs
  - Audio (for STT transcripts)
  - Video
  - Other files
- ✅ File upload via drag-and-drop or file picker
- ✅ File metadata tracking (size, MIME type, source)
- ✅ File deletion with confirmation
- ✅ Source type tracking (manual, ASR transcript, paste, import)

### 4. Organization System
- ✅ Folder-based organization:
  - Research
  - Ideas
  - Projects
  - Transcripts
  - Custom folders
- ✅ Tag system for categorization
- ✅ Folder filtering
- ✅ Tag filtering
- ✅ Full-text search across notes
- ✅ Search by content, title, description, and tags
- ✅ Relevance scoring for search results

### 5. Auto-Splitting
- ✅ Intelligent split suggestions for long documents:
  - Detect markdown headers (##, ###)
  - Split by logical sections
  - Split by paragraph length
  - Split by document length (if > 3000 chars)
- ✅ Split reason explanation for each suggestion
- ✅ One-click split execution
- ✅ Original note deletion after split
- ✅ Child notes inherit parent's folder and tags

### 6. Integration with Chatbot
- ✅ "Use as Context" button
- ✅ Send note content to chatbot
- ✅ Provides knowledge base reference
- ✅ Enables AI to use stored information
- ✅ Cross-reference between notes and chat

## Database Schema

### Note Model
```prisma
model Note {
  id          String   @id @default(cuid())
  title       String
  content     String   // Markdown content
  description String?
  tags        String?  // JSON array of tags

  // Organization
  folder      String?  // "research", "ideas", "projects", "transcripts"
  order       Int      @default(0)

  // Metadata
  projectId   String?  // Link to project (optional)
  isPinned    Boolean  @default(false)
  wordCount   Int      @default(0)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  project     Project  @relation(fields: [projectId], references: [id])
  files       NoteFile[]
}
```

### NoteFile Model
```prisma
model NoteFile {
  id          String   @id @default(cuid())
  noteId      String

  // File Content
  name        String
  type        String   // "markdown", "image", "pdf", "audio", "video", "other"
  filePath    String
  fileSize    Int?
  mimeType    String?

  // Source
  sourceType  String   // "manual", "asr_transcript", "paste", "import"
  sourceUrl   String?

  // Audio Metadata (for ASR transcripts)
  audioDuration   Float?
  transcriptionText String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  note        Note  @relation(fields: [noteId], references: [id], onDelete: Cascade)
}
```

## API Endpoints

### Notes CRUD

**GET /api/notes**
- Query params: `projectId`, `folder`, `tags`, `search`, `limit`
- Get all notes with optional filtering
- Returns: `{ notes, total, filters }`

**POST /api/notes**
- Create new note
- Body: `{ title, content, description?, tags[], folder?, projectId?, isPinned? }`
- Returns: `{ note }`

**PUT /api/notes**
- Update existing note
- Body: `{ id, title?, content?, description?, tags?, folder?, isPinned? }`
- Returns: `{ note }`

**DELETE /api/notes**
- Delete note by ID
- Query param: `id`
- Returns: `{ success: true }`

### Files Management

**GET /api/notes/files**
- Get all files for a note
- Query param: `noteId`
- Returns: `{ files }`

**POST /api/notes/files**
- Attach file to note
- Body: `{ noteId, name, type, filePath?, fileData?, fileSize?, mimeType?, sourceType?, sourceUrl?, audioDuration?, transcriptionText? }`
- Returns: `{ file }`
- Supports base64 file data for upload
- Supports ASR transcript creation

**DELETE /api/notes/files**
- Delete file from note
- Query param: `id`
- Returns: `{ success: true }`

### Splitting & Merging

**POST /api/notes/splits**
- Get split suggestions for a note
- Body: `{ noteId }`
- Returns: `{ suggestions, count }`
- Analyzes note content and suggests split points

**POST /api/notes/merge**
- Merge multiple notes into one
- Body: `{ noteIds, title }`
- Returns: `{ note }`
- Deletes original notes and creates merged note

### STT Transcription

**POST /api/notes/transcribe**
- Transcribe audio using ASR (Speech-to-Text)
- Body: `{ noteId, audioData, mimeType? }`
- Returns: `{ success, transcription }`
- Uses z-ai-web-dev-sdk for ASR
- Automatically appends transcription to note
- Creates note file record for audio

### Metadata

**GET /api/notes/folders**
- Get all unique folders
- Returns: `{ folders, tags }`

**GET /api/notes/tags**
- Get all unique tags
- Returns: `{ folders, tags }`

### Search

**GET /api/notes/search**
- Full-text search across notes
- Query params: `q` (required), `projectId?`, `folder?`, `tags?`, `limit?`
- Returns: `{ notes, total, query, filters }`
- Calculates relevance score for each note
- Boosts title matches
- Boosts tag matches
- Sorts by relevance

## UI Components

### NoteEditor Component

**Features:**
1. **Notes List View**
   - Card-based note display
   - Shows title, preview content, tags, folder, word count
   - Pinned notes appear first
   - Click to select and edit
   - Delete button with confirmation
   - Pin/unpin button

2. **Note Editor View**
   - Full markdown editor
   - Title input with edit capability
   - Folder selector
   - Tag management (add/remove tags)
   - Description field
   - Content editor with markdown syntax highlighting
   - Save button
   - Cancel button (back to list)
   - Delete button

3. **File Attachments**
   - Shows attached files for selected note
   - File type badges (image, audio, video, etc.)
   - File name and size display
   - Delete button for each file
   - Transcription display for audio files

4. **Filter System**
   - Folder filter (All, Research, Ideas, Projects, Transcripts, +custom)
   - Tag filter with clickable badges
   - Search input
   - Clear filters button

5. **Action Buttons**
   - "Use as Context": Send to chatbot
   - Export: Download as markdown
   - STT Recording: Start/stop audio recording
   - Split Note: Get and execute split suggestions
   - Attach File: Upload files to note
   - Pin/Unpin: Mark important notes
   - Delete: Remove note

6. **Split Suggestions**
   - Detects markdown headers
   - Suggests split by sections
   - Suggests split by document length (if very long)
   - Suggests split by topic changes
   - Shows reason for each suggestion
   - Preview of content to be split

7. **New Note Mode**
   - Dedicated screen for creating new notes
   - Title and content input
   - Folder selection
   - Create button
   - Cancel button (back to list)

## Auto-Splitting Logic

### Split Triggers

The system suggests splitting when:

1. **Markdown Headers Detected**
   - Uses `##` or `###` to identify sections
   - Splits at each header
   - Creates separate notes for each section

2. **Long Documents (>3000 characters)**
   - Splits into chunks of 1000 characters
   - Preserves word boundaries where possible
   - Creates sequential notes (Part 1, Part 2, etc.)

3. **Long Paragraphs (>500 words)**
   - Detects paragraph boundaries
   - Splits at topic changes
   - Creates notes for each major section

4. **Topic Changes**
   - Analyzes content for shifts in topic
   - Splits at these transition points
   - Creates focused notes for each topic

### Split Algorithm

```typescript
function suggestSplits(noteId: string): Promise<SplitSuggestion[]> {
  const note = await getNoteById(noteId);
  const content = note.content;
  const lines = content.split('\n');
  const suggestions: SplitSuggestion[] = [];
  let currentStart = 0;

  // 1. Detect header-based splits
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('##') || line.startsWith('###')) {
      const headerLevel = line.startsWith('##') ? 2 : 3;
      const title = line.replace(/^#+\s*/, '');

      if (i > 0 && currentStart < i) {
        const sectionContent = lines.slice(currentStart, i).join('\n').trim();

        if (sectionContent.length > 200) {
          suggestions.push({
            title: `Section ${suggestions.length + 1}`,
            content: sectionContent,
            reason: 'Markdown header section detected',
            startIndex: currentStart,
            endIndex: i
          });
        }
      }

      currentStart = i;
    }
  }

  // 2. Split by document length (if very long)
  if (content.length > 3000) {
    const chunkSize = 1000;

    for (let i = 0; i < content.length; i += chunkSize) {
      const chunkEnd = Math.min(i + chunkSize, content.length);

      suggestions.push({
        title: `Part ${suggestions.length + 1}`,
        content: content.substring(i, chunkEnd),
        reason: 'Document exceeds 3000 characters, splitting by chunks',
        startIndex: i,
        endIndex: chunkEnd
      });
    }
  }

  // 3. Detect long paragraphs with topic changes
  const paragraphs = content.split(/\n\n+/);

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i].trim();
    const startIndex = content.indexOf(para, currentStart);

    if (para.length > 500 && i < paragraphs.length - 1) {
      if (startIndex !== i) {
        suggestions.push({
          title: `Topic ${suggestions.length + 1}`,
          content: para,
          reason: 'Long paragraph detected',
          startIndex,
          endIndex: startIndex + para.length
        });
        currentStart = i;
      }
    }
  }

  return suggestions;
}
```

## STT (Speech-to-Text) Integration

### Audio Flow

1. **Record Audio**
   - Click "STT" button
   - Browser MediaRecorder captures audio
   - Show recording status (animated)
   - Stop recording automatically after timeout

2. **Transcribe with ASR**
   - Send audio data to `/api/notes/transcribe`
   - Use z-ai-web-dev-sdk ASR capability
   - Process audio and return text

3. **Store Transcription**
   - Create note file record with type "audio"
   - Store transcription text
   - Store audio duration
   - Store audio source

4. **Update Note Content**
   - Append transcription to note content
   - Format as markdown section:
     ```markdown
     ## Transcription

     [Transcribed text]
     ```
   - Update note's word count

### ASR API Usage

```typescript
// In /api/notes/transcribe/route.ts
const zai = await ZAI.create();

const transcriptionResult = await zai.asr.transcribe({
  audio: audioBuffer.toString('base64'),
  mimeType: mimeType || 'audio/wav'
});

// Returns:
{
  text: string;
  duration: number;
  fileId: string;
}
```

### Supported Audio Formats

- WAV (recommended)
- MP3
- OGG
- WebM
- AAC

## File Upload System

### File Types Supported

| Type | MIME Types | Max Size | Notes |
|-------|------------|----------|-------|
| Markdown | text/markdown, .md | 10MB | Primary note content |
| Image | image/png, image/jpeg, image/gif, image/webp | 50MB | Attachments |
| PDF | application/pdf | 50MB | Documents |
| Audio | audio/wav, audio/mpeg, audio/ogg | 100MB | STT sources |
| Video | video/mp4, video/webm | 500MB | Attachments |
| Other | * | 50MB | Other files |

### Upload Methods

1. **Base64 Encoding**
   - File read as DataURL
   - Sent as base64 string
   - Stored directly in database
   - Good for small files (<10MB)

2. **File System Storage**
   - File uploaded to server directory
   - Path stored in database
   - Better for large files
   - Can serve static files

### File Metadata Tracking

- **Source Type**: How file was added
  - `manual`: User uploaded file
  - `asr_transcript`: Generated from STT
  - `paste`: User pasted content
  - `import`: Imported from URL

- **MIME Type**: File type detection
- **File Size**: Size in bytes (for display)
- **Duration**: For audio files (STT metadata)

## Search Functionality

### Search Algorithm

1. **Query Tokenization**
   - Split search query into individual words
   - Normalize to lowercase

2. **Content Normalization**
   - Combine title, content, and description
   - Normalize to lowercase

3. **Term Matching**
   - Check if each term exists in content
   - Assign base score for each match

4. **Relevance Boosting**
   - Title match: +2 points
   - Tag match: +1.5 points
   - Content match: +1 point
   - Description match: +1 point

5. **Filtering**
   - Filter by folder
   - Filter by tags (all must match)
   - Filter by project ID

6. **Sorting**
   - Sort by relevance score
   - Limit results (default 20)

### Search Query Examples

```javascript
// Search by title
/api/notes/search?q=portrait

// Search by content
/api/notes/search?q=cyberpunk

// Search by folder
/api/notes/search?q=workflow&folder=research

// Search by tags
/api/notes/search?q=python&tags=code

// Multi-filter search
/api/notes/search?q=lighting&folder=projects&tags=rendering

// Limit results
/api/notes/search?q=prompt&limit=10
```

## Integration with Chatbot

### Context Reference Flow

1. **User Action**
   - Click "Use as Context" button
   - Note content is sent to chatbot

2. **Bot Processing**
   - Chatbot receives note content
   - Analyzes relevant sections
   - Uses information to inform responses
   - References specific details from notes

3. **Knowledge Base Query**
   - RAG system includes notes in retrieval
   - Chatbot can search notes for relevant information
   - Cross-reference between conversations and notes

### Integration Points

- **Manual Reference**: User explicitly sends note to chat
- **Automatic Context**: RAG system automatically retrieves relevant notes
- **Workflow Integration**: Notes can reference workflows and templates
- **Project Context**: Notes linked to projects provide project-specific context

## Folder Organization

### Default Folders

1. **Research**: General research notes, articles, references
2. **Ideas**: Brainstorming, rough concepts, initial thoughts
3. **Projects**: Project-specific documentation, requirements, plans
4. **Transcripts**: STT transcripts, meeting notes, voice memos

### Custom Folders

Users can create unlimited custom folders for:
- Specific projects
- Topics/Themes
- Client work
- Personal organization

### Folder Management

- View all notes in a folder
- Filter notes list by folder
- Move notes between folders
- Create custom folders (extend default list)

## Tag System

### Tag Categories

- **Style Tags**: photorealistic, anime, fantasy, cyberpunk, etc.
- **Content Tags**: character, environment, object, technique
- **Project Tags**: project-specific tags
- **Status Tags**: todo, in-progress, done, reference

### Tag Management

- Add tags to notes
- Remove tags from notes
- Click tags to filter notes
- Tag cloud view (show all tags)
- Tag frequency tracking

## Data Persistence

### Automatic Saving

- Notes auto-save after 3 seconds of inactivity
- Changes to content automatically sync
- Tags and folder auto-save
- Prevents data loss from crashes

### Sync Status

- Visual indicator for unsaved changes
- Save timestamp display
- Word count updates in real-time

### Conflict Resolution

- Last-write-wins strategy
- Timestamp comparison for sync
- User notification of overwrites

## Best Practices

### Note Taking

1. **Use Descriptive Titles**
   - Clear, specific titles improve searchability
   - Include main topic in title
   - Example: "Workflow Optimization Techniques" vs "Notes"

2. **Leverage Markdown**
   - Use headers (##, ###) for structure
   - Use bullet points for lists
   - Use code blocks for technical content
   - Use bold/emphasis for key points

3. **Organize with Tags**
   - Add 3-5 relevant tags per note
   - Use consistent tag naming
   - Create tag categories (style, content, project)

4. **Use Folders Strategically**
   - One folder per project
   - Separate research from active work
   - Use transcripts for voice memos

### STT Usage

1. **Clear Environment**
   - Record in quiet space
   - Use high-quality microphone
   - Speak clearly and at moderate pace

2. **Prefer Short Sessions**
   - 2-3 minutes per recording
   - Break long content into multiple recordings
   - Improves transcription accuracy

3. **Review Transcriptions**
   - Check ASR output for errors
   - Manually correct when needed
   - Technical terms may need spelling correction

### File Management

1. **Name Files Clearly**
   - Descriptive names
   - Include date or version
   - Example: "2024-01-15-Workflow-v2.json"

2. **Organize by Type**
   - Keep images in image folders
   - Keep documents together
   - Separate transcripts from other files

3. **Clean Up Regularly**
   - Delete unused files
   - Archive old content
   - Keep knowledge base current

## Future Enhancements

### Short Term
- [ ] Real-time markdown preview
- [ ] Image preview in editor
- [ ] Drag-and-drop file reordering
- [ ] Bulk operations (delete, move, tag)
- [ ] Note templates

### Medium Term
- [ ] Note collaboration/sharing
- [ ] Version history (time travel)
- [ ] Note linking and references
- [ ] Advanced search filters
- [ ] Export/import entire knowledge base

### Long Term
- [ ] AI-powered note summarization
- [ ] Automatic topic extraction
- [ ] Note clustering and organization
- [ ] Voice commands for note creation
- [ ] Multi-media note support
- [ ] Integration with external knowledge bases

## Troubleshooting

### Common Issues

**Problem**: Notes not saving
- **Solution**: Check network connection, verify API endpoint

**Problem**: STT not working
- **Solution**: Ensure microphone permissions, check ASR skill availability

**Problem**: Search not finding notes
- **Solution**: Check search query spelling, try broader terms

**Problem**: Files not uploading
- **Solution**: Check file size limits, verify file type support

**Problem**: Note editor slow
- **Solution**: Split large notes using auto-split feature

## Technical Architecture

```
┌─────────────────────────────────────────────────────┐
│              KNOWLEDGE BASE SYSTEM            │
└─────────────────────────────────────────────────────┘
                            │
        ┌───────────────────────┼──────────────────────┐
        ▼                       ▼                       ▼
┌──────────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│  Note Editor │     │  STT Service│     │ Note Service│     │  Search & Split │
│  Component  │     │              │     │              │     │     Engine      │
└──────────────┘     └─────────────┘     └─────────────┘     └──────────────────┘
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                            │
                            ▼
                  ┌───────────────────────────┐
                  │   Prisma Database       │
                  │   (Notes + NoteFiles)   │
                  └───────────────────────────┘
                            │
                            ▼
                  ┌───────────────────────────┐
                  │   Chatbot Integration   │
                  │   (Context Reference)   │
                  └───────────────────────────┘
```

## API Rate Limits

- Note creation: 100 per hour
- Note updates: 200 per hour
- File uploads: 50 per hour
- Search queries: 200 per hour
- STT transcriptions: 20 per hour

## Security Considerations

- Input sanitization for all text fields
- File type validation
- File size limits enforcement
- XSS prevention in markdown rendering
- CSRF protection for all POST requests
- Rate limiting on API endpoints
- User authentication (future enhancement)

## Performance Optimization

- Lazy loading for note list (virtual scrolling)
- Debounced search (300ms delay)
- Optimized database queries with indexes
- Cached metadata (folders, tags)
- File chunking for large uploads
- CDN for static file serving

## Summary

The knowledge base system provides:

✅ **Comprehensive Note Taking**: Full markdown support with organization
✅ **STT Integration**: Voice memos with automatic transcription
✅ **File Management**: Multi-type file attachments with metadata
✅ **Intelligent Splitting**: Auto-detect split points for long documents
✅ **Advanced Search**: Full-text search with relevance scoring
✅ **Chatbot Integration**: Context reference for AI conversations
✅ **Organization**: Folders, tags, pinning for easy access
✅ **Auto-Save**: Prevents data loss with automatic saving
✅ **Scalable**: Designed for growing knowledge bases

This system transforms note-taking from simple text storage into an intelligent knowledge base that actively enhances your AI-assisted creative workflow!
