# PersonalLog Messenger - Complete Implementation

## Overview

A messenger-style interface for stream-of-thought note-taking, conversation management, and AI interaction. The system grows in intelligence naturally through use.

## File Structure

```
PersonalLog/
├── src/
│   ├── app/
│   │   ├── page.tsx                           # Landing page (redirects to /messenger)
│   │   ├── layout.tsx                         # Root layout
│   │   ├── globals.css                        # Global styles
│   │   ├── (messenger)/                      # Messenger route group
│   │   │   ├── layout.tsx                     # Messenger layout
│   │   │   ├── page.tsx                       # Main messenger page
│   │   │   └── conversation/[id]/page.tsx    # Individual conversation
│   │   └── (longform)/                       # Long-form route group
│   │       ├── layout.tsx                     # Long-form layout
│   │       └── conversation/[id]/page.tsx    # Long-form conversation view
│   │
│   ├── components/
│   │   ├── messenger/
│   │   │   ├── ConversationList.tsx           # Sidebar conversation list
│   │   │   ├── ChatArea.tsx                   # Main chat interface
│   │   │   ├── MessageBubble.tsx              # Individual message display
│   │   │   ├── MessageSelectionBar.tsx        # Selection toolbar
│   │   │   └── NewChatDialog.tsx              # New chat from selection
│   │   ├── ai-contacts/
│   │   │   ├── AIContactsPanel.tsx            # AI contacts sidebar
│   │   │   └── AdvancedOptions.tsx            # AI settings modal
│   │   ├── media/
│   │   │   ├── AudioRecorder.tsx              # Audio recording with STT
│   │   │   └── FileUploader.tsx               # File/image upload
│   │   └── compaction/
│   │       └── CompactionDialog.tsx           # Conversation compaction UI
│   │
│   ├── lib/
│   │   ├── storage/
│   │   │   ├── conversation-store.ts         # IndexedDB conversation storage
│   │   │   └── ai-contact-store.ts            # AI contact/persona storage
│   │   ├── ai/
│   │   │   ├── provider.ts                    # Model-agnostic AI providers
│   │   │   └── multibot.ts                   # Multi-bot chat handler
│   │   └── utils.ts                           # Utility functions
│   │
│   └── types/
│       └── conversation.ts                    # All TypeScript types
│
└── PERSONALLOG_MESSENGER_SPEC.md              # Full specification
```

## Core Features Implemented

### ✅ 1. Messenger-Style Interface
- WhatsApp/Telegram-like UI
- Stream-of-thought messaging to self
- Conversation list with search and pinning
- Collapsible sidebar
- Message selection (multi-select)
- Read receipts (checkmarks)

### ✅ 2. Message Selection & AI Chat
- Tap to select messages
- Selection toolbar appears with actions:
  - Send to AI in this chat
  - Start new chat with selected messages
  - Copy selection
- Non-selected messages provide context

### ✅ 3. AI Contact System
- Default AI personas: Alex, Researcher, Creative
- Create custom AI contacts
- Per-conversation AI settings
- Save and reuse AI personalities

### ✅ 4. Vibe-Fine-Tuning
- Adjust AI personality through natural language
- "Be more enthusiastic" → updates personality attributes
- Visual feedback showing what changed
- Personality sliders (creativity, friendliness, etc.)
- System prompt editing

### ✅ 5. Brief Response Mode (Messenger)
- Default in messenger view
- Configurable response length (100/300/500 tokens)
- Temperature control (precise → creative)
- AI instructed to be concise

### ✅ 6. Long-Form View
- Separate tab for detailed responses
- Document-style message display
- Markdown formatting support
- Token usage display
- Toggle between messenger and long-form

### ✅ 7. Media Support
- **Images**: Upload and display in messages
- **Files**: PDF, docs, text files
- **Audio Recording**: Web Speech API for STT
  - Real-time transcript preview
  - Option to keep or discard audio
  - Recording indicator
- Drag-and-drop file upload

### ✅ 8. Conversation Compaction
- Triggered at token limit (default 80%)
- Three strategies: Summarize, Extract Key, Custom
- Select messages to preserve
- Option to start new conversation with summary
- Original conversation archived

### ✅ 9. Model-Agnostic Backend
- **Local Provider**: Ollama, WebLLM
- **OpenAI Provider**: GPT-4o-mini, etc.
- **Anthropic Provider**: Claude 3 Haiku
- **Escalation**: Local → Cloud with patience setting
- Streaming support for all providers

### ✅ 10. Multi-Bot Chat
- **Parallel Mode**: All bots respond simultaneously
- **Series Mode**: Each bot sees previous responses
- Combine multiple perspectives
- Configurable collaborator list

## Data Models

### Conversation
```typescript
{
  id: string
  title: string
  type: 'personal' | 'ai-assisted' | 'transcript'
  messages: Message[]
  aiContacts: AIAgent[]
  settings: {
    responseMode: 'messenger' | 'long-form'
    compactOnLimit: boolean
    compactStrategy: 'summarize' | 'extract-key' | 'user-directed'
  }
  metadata: {
    messageCount: number
    totalTokens: number
    hasMedia: boolean
    pinned: boolean
    archived: boolean
  }
}
```

### Message
```typescript
{
  id: string
  conversationId: string
  type: 'text' | 'image' | 'file' | 'audio' | 'transcript' | 'system'
  author: 'user' | { type: 'ai-contact', contactId: string, contactName: string }
  content: {
    text?: string
    media?: MediaAttachment
    audioTranscript?: AudioTranscript
    compaction?: CompactionInfo
  }
  timestamp: string
  selected?: boolean
  replyTo?: string
  metadata: {
    tokens?: number
    model?: string
    editHistory?: MessageEdit[]
  }
}
```

### AI Contact
```typescript
{
  id: string
  name: string
  color: string  // Tailwind color class
  config: {
    provider: 'local' | 'openai' | 'anthropic'
    model: string
    temperature: number
    maxTokens: number
    responseStyle: 'brief' | 'balanced' | 'detailed'
    escalateToCloud?: boolean
    escalationPatience?: number
    arrangement?: 'parallel' | 'series'
    collaboratorIds?: string[]
  }
  personality: {
    systemPrompt: string
    vibeAttributes: VibeAttribute[]
    contextConversationIds: string[]
  }
}
```

## Key Interactions

### Message Selection → AI Chat
1. User taps messages (multi-select)
2. Toolbar appears: [AI Reply] [New Chat] [Copy]
3. Choose action and optionally select AI contact
4. AI receives selected messages as prompt context
5. Full conversation visible as additional context

### Vibe-Fine-Tuning
1. User: "Be more enthusiastic"
2. System detects personality request
3. Shows "Vibe Update" panel with changes:
   - enthusiasm: 0.3 → 0.7
   - useEmojis: false → true
4. User confirms or adjusts
5. AI contact updated with new vibe

### Context Compaction
1. At 80% token limit, system shows warning
2. User clicks "Review & Compact"
3. Select compaction strategy
4. Choose messages to preserve
5. System generates summary
6. Original messages archived, summary added

### Model Escalation
1. User sends message
2. Local model attempts response (30s timeout)
3. If timeout/error, escalate to cloud
4. Response marked as "escalated"
5. User can adjust patience setting

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript 5
- **Styling**: Tailwind CSS 4
- **Storage**: IndexedDB (local-first)
- **AI**: Model-agnostic (Ollama, OpenAI, Anthropic)
- **STT**: Web Speech API
- **Icons**: Lucide React

## Running the App

```bash
cd /mnt/c/users/casey/PersonalLog
pnpm install
pnpm dev
```

App runs on port 3002:
- Main page: http://localhost:3002
- Messenger: http://localhost:3002/messenger
- Long-form: http://localhost:3002/longform/[conversation-id]

## Default AI Contacts

1. **Alex** (Purple) - Friendly general assistant
2. **Researcher** (Blue) - Thorough, well-reasoned responses
3. **Creative** (Pink) - Innovative, outside-the-box ideas

## Privacy & Data

- All data stored locally in IndexedDB
- No external calls unless cloud AI configured
- User controls escalation settings
- Audio deleted after STT unless "keep audio" enabled

## Future Enhancements

- [ ] Full transcript support for long recordings
- [ ] Image analysis (vision capabilities)
- [ ] Voice mode for AI responses (TTS)
- [ ] Conversation folders/tags
- [ ] Export conversations (markdown, PDF)
- [ ] Cloud sync (optional)
- [ ] Mobile app (React Native)
- [ ] End-to-end encryption for cloud sync
