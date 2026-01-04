# PersonalLog Frequently Asked Questions

Common questions and answers about PersonalLog.

## Table of Contents

1. [General](#general)
2. [Installation & Setup](#installation--setup)
3. [Features & Usage](#features--usage)
4. [AI & Chat](#ai--chat)
5. [Knowledge Management](#knowledge-management)
6. [Privacy & Security](#privacy--security)
7. [Performance](#performance)
8. [Troubleshooting](#troubleshooting)
9. [Development](#development)
10. [Plugins](#plugins)

---

## General

### What is PersonalLog?

PersonalLog is an AI-powered personal knowledge and communication hub. It combines:
- Messenger-style AI conversations with customizable AI contacts
- Intelligent knowledge base with semantic search
- Local-first architecture for privacy
- Multiple AI provider support
- Plugin system for extensibility

### Is PersonalLog free?

Yes! PersonalLog is completely free and open-source (MIT license). You can use it, modify it, and distribute it however you like.

### What browsers are supported?

PersonalLog works on all modern browsers that support:
- Chrome/Edge 57+
- Firefox 52+
- Safari 11+
- Opera 44+

Some advanced features (WebAssembly SIMD) require newer browser versions, but PersonalLog will gracefully fall back to older methods.

### Is there a mobile app?

PersonalLog is a Progressive Web App (PWA) that works on mobile browsers. You can:
- Access it via your mobile browser
- Add to home screen for app-like experience
- Use offline on supported devices

A native mobile app is on the roadmap for future development.

### Can I use PersonalLog offline?

Yes! PersonalLog is designed to work offline:
- All data stored locally on your device
- Features work without internet connection
- AI features require online (for API calls to AI providers)
- Sync requires internet (optional feature)

---

## Installation & Setup

### How do I install PersonalLog?

**Option 1: Use Hosted Version**
Simply visit the URL and start using (when deployed)

**Option 2: Self-Host**
```bash
git clone https://github.com/SuperInstance/PersonalLog.git
cd PersonalLog
pnpm install
pnpm dev
```

**Option 3: Docker**
```bash
docker build -t personallog .
docker run -p 3000:3000 personallog
```

### Do I need an API key to use PersonalLog?

You need API keys to use AI features. PersonalLog supports:
- OpenAI
- Anthropic (Claude)
- Google (Gemini)
- Mistral AI
- And 10+ other providers

You can use PersonalLog without AI features for knowledge management, but AI functionality requires at least one provider configured.

### Where do I get API keys?

Each AI provider has their own signup process:
- **OpenAI**: platform.openai.com
- **Anthropic**: console.anthropic.com
- **Google**: makersuite.google.com
- **Mistral**: mistral.ai

Most offer free tiers to get started.

### Can I use PersonalLog without API keys?

Yes, but with limited functionality:
- Knowledge management works fully
- Settings and configuration work
- AI chat features will be disabled
- Some optimizations may be limited

### How do I configure multiple AI providers?

1. Navigate to Settings → AI Providers
2. Click "Add Provider"
3. Select provider type
4. Enter API key
5. Configure models
6. Save
7. Repeat for additional providers

You can then assign different AI Contacts to use different providers.

---

## Features & Usage

### How do I create an AI Contact?

1. Navigate to Setup → Contacts
2. Click "Create Contact"
3. Fill in:
   - Name
   - Role
   - Personality traits
   - Expertise areas
   - Model selection
4. Save

Your contact will appear in the messenger sidebar.

### Can I use PersonalLog for group chats?

Not currently. PersonalLog focuses on 1-on-1 conversations with AI contacts. Group chat is on the roadmap for future releases.

### How do I organize my conversations?

Conversations are automatically organized by:
- Date (newest first)
- AI Contact
- Archival status

You can also:
- Search conversations
- Archive old conversations
- Delete unwanted conversations
- Export conversations for backup

### What's the difference between archiving and deleting?

**Archiving:**
- Conversation hidden from main view
- Still searchable
- Can be unarchived
- Data preserved

**Deleting:**
- Conversation permanently removed
- Not searchable
- Cannot be recovered
- Data deleted

### How do I search for conversations?

Use the search bar in the messenger sidebar:
- Searches message content
- Searches conversation titles
- Filters by contact
- Filters by date range

Results appear instantly as you type.

---

## AI & Chat

### Which AI models are supported?

PersonalLog supports models from:
- **OpenAI**: GPT-4, GPT-3.5-Turbo
- **Anthropic**: Claude 3 Opus, Sonnet, Haiku
- **Google**: Gemini Pro, Gemini Ultra
- **Mistral**: Mistral Large, Mistral 7B
- **Together AI**: 40+ open source models
- **Groq**: Llama 2, Mixtral
- **Perplexity**: Perplexity models
- And more...

### Can I use local AI models?

Yes! You can:
1. Use providers like Together AI or Groq that offer local models
2. Install a custom provider plugin for local models (Ollama, etc.)
3. Run local models and connect via API

Local model support will be enhanced in future releases.

### How do context files work?

Context files provide additional information to AI:

**Adding Context:**
1. Open a conversation
2. Click the context button (paperclip icon)
3. Choose:
   - Knowledge entries (search and add)
   - Files (upload documents)
   - Previous conversations (reference past chats)
4. Selected context appears above chat

**Benefits:**
- AI has more relevant information
- Better, more contextual responses
- No need to repeat information
- Leverages your knowledge base

### What are AI Contact personalities?

Personalities define how an AI Contact responds:

**Personality Traits:**
- Tone (formal, casual, friendly, professional)
- Communication style (concise, detailed, creative)
- Behavior (helpful, critical, encouraging)
- Expertise (technical, general, specialized)

**Example:**
- "Research Assistant" - Analytical, thorough, citation-focused
- "Creative Writer" - Imaginative, descriptive, storyteller
- "Code Expert" - Technical, precise, problem-solving

You can create unlimited custom personalities.

### Can I share conversations between AI Contacts?

Not directly. Each conversation is tied to a single AI Contact. However, you can:
- Export a conversation
- Import it to a new conversation with a different contact
- Copy messages between conversations

---

## Knowledge Management

### What is the knowledge base?

The knowledge base is your personal information repository:
- Store notes, ideas, information
- Semantic search finds related concepts
- Attach to conversations as context
- Export for training AI models
- Organized with tags and collections

### How does semantic search work?

PersonalLog uses vector embeddings for intelligent search:
- Each knowledge entry converted to vector representation
- Queries also converted to vectors
- Similarity calculated between query and entries
- Results ranked by semantic similarity

**Example:**
- Query: "How do I handle authentication?"
- Finds: Entries about OAuth, JWT, login flows, security

**Benefits:**
- Find related concepts, not just exact matches
- Natural language queries work great
- Discovers connections you might miss

### What's the difference between tags and collections?

**Tags:**
- Applied to individual entries
- Multiple tags per entry
- Quick filtering
- Great for cross-cutting organization

**Collections:**
- Group related entries
- Hierarchical structure
- Manual organization
- Good for structured content

Use both together for powerful organization!

### Can I import my existing notes?

Yes! PersonalLog supports importing from:
- Markdown files
- JSON files
- CSV files
- Plain text files

Navigate to Knowledge → Import to get started.

### What are checkpoints?

Checkpoints save your knowledge base state:
- Create snapshot before major changes
- Roll back if needed
- Experiment safely
- Multiple checkpoints supported

**Use Cases:**
- Before bulk imports
- Before major reorganization
- Before risky experiments
- For version control

---

## Privacy & Security

### Is my data private?

Yes! PersonalLog is designed for privacy:
- All data stored locally on your device
- No third-party tracking or analytics
- API keys stored locally only
- Optional encrypted sync (future)
- Full data export and deletion

### Where is my data stored?

PersonalLog uses IndexedDB for storage:
- Browser-local database
- Persistent across sessions
- No server required
- Accessible only by your browser

**Location:**
- Chrome: `~/.config/google-chrome/Default/IndexedDB`
- Firefox: `~/.mozilla/firefox/profile/storage/default`
- Safari: `~/Library/Safari/Databases`

### Can I sync data across devices?

Sync is planned for future releases:
- Optional encrypted sync
- Choose storage provider
- Cross-device compatibility
- Conflict resolution

For now, use export/import to manually transfer data.

### Are my conversations private?

Yes! Conversations are:
- Stored locally only
- Never sent to third parties
- Only shared with AI provider (for API calls)
- Accessible only by you

AI providers may store conversations according to their privacy policies. Check provider policies for details.

### Can I delete all my data?

Yes! You can:
1. Export data first (recommended)
2. Navigate to Settings → Intelligence
3. Click "Delete All Data"
4. Confirm (multiple confirmations required)
5. All data permanently removed

**Warning:** This action is irreversible!

---

## Performance

### Why is PersonalLog slow?

PersonalLog automatically optimizes based on your device. If it's slow:

**Quick Fixes:**
1. Check performance class (Settings → System)
2. Run benchmarks (Settings → Benchmarks)
3. Disable heavy features if needed
4. Clear old data
5. Try compacting storage

**Performance Classes:**
- Low (0-30): Basic features, no animations
- Medium (31-60): Standard features, reduced effects
- High (61-85): Full features, standard effects
- Ultra (86-100): All features, maximum quality

### Does PersonalLog work on low-end devices?

Yes! PersonalLog adapts to your hardware:
- Automatic performance detection
- Feature auto-gating
- Optimized rendering
- Efficient storage

For very low-end devices, consider:
- Disable animations
- Limit knowledge base size
- Archive old conversations
- Use lightweight AI models

### How much storage does PersonalLog use?

It depends on usage:
- **Empty**: ~5MB (application code)
- **Light use**: 10-50MB
- **Heavy use**: 100-500MB
- **Very heavy**: 1GB+ (lots of conversations/knowledge)

You can check usage in Settings → System.

### Can I limit storage usage?

Yes! You can:
- Set knowledge base limits
- Auto-archive old conversations
- Regular cleanup
- Export and delete old data

Future releases will have more granular storage controls.

---

## Troubleshooting

### PersonalLog won't load

**Try these steps:**
1. Check browser compatibility
2. Clear browser cache
3. Disable browser extensions
4. Try incognito/private mode
5. Check browser console for errors
6. Try a different browser

### AI not responding

**Check:**
1. API key is valid
2. Provider is enabled
3. Internet connection is active
4. API quota not exceeded
5. Try a different provider

### Search not working

**Solutions:**
1. Ensure knowledge base has entries
2. Try broader search terms
3. Check if feature is enabled
4. Rebuild search index if needed
5. Clear browser cache

### Data disappeared

**First steps:**
1. Don't panic! Data is likely still there
2. Try refreshing the page
3. Check if you're in the right view
4. Use search to find items
5. Check archived items

**If still missing:**
1. Check Settings → System for storage info
2. Try restoring from backup
3. Check browser console for errors
4. Contact support via GitHub

---

## Development

### How do I contribute?

See [CONTRIBUTING.md](../CONTRIBUTING.md) for complete guide.

**Quick Start:**
```bash
git clone https://github.com/SuperInstance/PersonalLog.git
cd PersonalLog
pnpm install
pnpm dev
```

### What tech stack does PersonalLog use?

- **Framework**: Next.js 15 (React 19)
- **Language**: TypeScript 5 (strict)
- **Styling**: Tailwind CSS 4
- **Storage**: IndexedDB
- **Performance**: WebAssembly (Rust)
- **Testing**: Vitest, Playwright

### How do I build PersonalLog?

```bash
# Development build
pnpm build

# Production build
NODE_ENV=production pnpm build

# With WASM
pnpm build:wasm:release
pnpm build
```

### Can I create plugins?

Yes! See [Plugin Development Guide](./plugin-development.md).

**Plugin Capabilities:**
- Add AI providers
- Create custom UI
- Integrate external services
- Export/import formats
- Automate workflows

---

## Plugins

### What are plugins?

Plugins extend PersonalLog functionality:
- Add new features
- Integrate external services
- Customize behavior
- Automate workflows

### Where can I find plugins?

Official plugin directory coming soon! For now:
- Check GitHub discussions
- Browse community repositories
- Build your own (see plugin development guide)

### Are plugins safe?

Plugins require permissions for:
- Conversations (read/create/update/delete)
- Knowledge (search/add/update/delete)
- AI (use providers, create new ones)
- Network (HTTP requests)
- Storage (store data)
- UI (add menus, sidebars)

**Always review permissions before installing!**

### How do I create a plugin?

See [Plugin Development Guide](./plugin-development.md) for complete documentation.

**Basic Structure:**
```typescript
import { Plugin, PluginContext } from '@personallog/sdk';

export class MyPlugin extends Plugin {
  manifest = {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
  };

  async onLoad(context: PluginContext) {
    // Initialize
  }
}
```

---

## Still Have Questions?

**Resources:**
- [User Guide](./USER_GUIDE.md)
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [GitHub Issues](https://github.com/SuperInstance/PersonalLog/issues)
- [GitHub Discussions](https://github.com/SuperInstance/PersonalLog/discussions)

**Getting Help:**
1. Search existing documentation and issues
2. Create a GitHub discussion for questions
3. Report bugs via GitHub issues
4. Join our community (links coming soon)

---

*Last Updated: 2026-01-03*
