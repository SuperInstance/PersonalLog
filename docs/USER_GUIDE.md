# PersonalLog User Guide

Complete guide for using PersonalLog, your AI-powered personal knowledge and communication hub.

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Core Features](#core-features)
4. [AI Messaging](#ai-messaging)
5. [Knowledge Management](#knowledge-management)
6. [Settings & Customization](#settings--customization)
7. [Data Management](#data-management)
8. [Plugins & Extensions](#plugins--extensions)
9. [Tips & Best Practices](#tips--best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is PersonalLog?

PersonalLog is a personal AI companion and knowledge management system that helps you:

- **Chat with AI**: Multiple AI providers with customizable personalities
- **Manage Knowledge**: Store, search, and retrieve information intelligently
- **Stay Organized**: Keep track of conversations, notes, and ideas
- **Work Offline**: Full functionality without internet connection
- **Stay Private**: All data stored locally on your device

### Key Features

- Messenger-style interface for AI conversations
- Knowledge base with semantic search
- Multiple AI provider support (OpenAI, Anthropic, Google, and more)
- AI Contact system with personality tuning
- Local-first architecture with optional sync
- Plugin system for extensibility
- Dark mode with system preference detection
- Responsive design for all devices

---

## Getting Started

### First-Time Setup

When you first open PersonalLog, you'll be guided through setup:

1. **Welcome**: Overview of PersonalLog features
2. **Configure**: Set up AI providers and preferences
3. **Create Contacts**: Design your AI contacts with personalities
4. **Complete**: Start using PersonalLog!

### Setting Up AI Providers

To use AI features, you need to configure at least one AI provider:

1. Navigate to **Settings** → **Appearance** → **AI Providers**
2. Click **Add Provider**
3. Select your provider (OpenAI, Anthropic, etc.)
4. Enter your API key
5. Choose default models
6. Click **Save**

**Supported Providers:**
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google (Gemini)
- Mistral AI
- Together AI
- Groq
- Perplexity
- And more...

### Creating Your First AI Contact

AI Contacts give your AI conversations personality and context:

1. Navigate to **Setup** → **Contacts**
2. Click **Create Contact**
3. Fill in details:
   - **Name**: What to call this contact
   - **Role**: Assistant, expert, friend, etc.
   - **Personality**: Traits, tone, behavior
   - **Expertise**: Areas of knowledge
   - **Model**: Which AI model to use
4. Click **Save**

Your contact will appear in the messenger sidebar, ready to chat!

---

## Core Features

### Navigation

PersonalLog has multiple main sections:

- **Messenger** (`/messenger`): AI conversations
- **Knowledge** (`/knowledge`): Knowledge base management
- **Setup** (`/setup`): Configuration and contacts
- **Settings** (`/settings`): App settings and preferences
- **Catalog** (`/catalog`): Browse and manage modules

### Keyboard Shortcuts

Speed up your workflow with keyboard shortcuts:

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Quick search |
| `Cmd/Ctrl + N` | New conversation |
| `Cmd/Ctrl + /` | Show all shortcuts |
| `Esc` | Close modal/drawer |
| `Arrow Keys` | Navigate lists |

Press `Cmd/Ctrl + /` anywhere in the app to see all available shortcuts.

### Dark Mode

PersonalLog automatically detects your system theme preference. You can also manually toggle:

1. Navigate to **Settings** → **Appearance**
2. Toggle **Dark Mode**

Options:
- **System** (default): Follows OS preference
- **Light**: Always light theme
- **Dark**: Always dark theme

---

## AI Messaging

### Starting a Conversation

1. Click the **New Chat** button (or `Cmd/Ctrl + N`)
2. Select an AI Contact from the sidebar
3. Type your message
4. Press Enter to send

### Conversation Context

Add context to conversations for better AI responses:

1. Open a conversation
2. Click the **Context** button (paperclip icon)
3. Choose from:
   - **Knowledge Entries**: Search and add from knowledge base
   - **Files**: Upload documents
   - **Previous Conversations**: Reference past chats
4. Selected context appears above the chat

### Message Features

**Message Selection:**
- Click messages to select
- Shift+click for range selection
- Cmd/Ctrl+click for multiple selection
- Actions: Copy, delete, export, regenerate

**Streaming Responses:**
Watch AI responses generate in real-time. Click **Stop** to halt generation.

**Message History:**
All conversations are saved automatically. Search them by:
- Content
- Date
- AI Contact
- Custom tags

### AI Contact Personalities

Each AI Contact has unique traits:

**Pre-configured Contacts:**
- **Research Assistant**: Analytical, thorough, citation-focused
- **Creative Writer**: Imaginative, descriptive, storyteller
- **Code Expert**: Technical, precise, problem-solving
- **Life Coach**: Supportive, motivational, practical

**Custom Contacts:**
Create your own with custom:
- System prompts
- Personality traits
- Response styles
- Knowledge areas
- Temperature and other AI parameters

### Conversation Management

**Search Conversations:**
1. Click the search icon in the sidebar
2. Type your query
3. Results appear instantly with highlighted matches

**Archive Conversations:**
1. Right-click a conversation
2. Select **Archive**
3. Archived conversations are hidden but searchable

**Delete Conversations:**
1. Right-click a conversation
2. Select **Delete**
3. Confirm deletion

**Export Conversations:**
1. Select a conversation
2. Click the **Export** button
3. Choose format (JSON, Markdown, Text)
4. Download the file

---

## Knowledge Management

### Adding Knowledge

Knowledge entries help the AI remember important information:

**Ways to Add:**
1. **Manual Entry**:
   - Navigate to **Knowledge**
   - Click **Add Entry**
   - Enter title and content
   - Click **Save**

2. **From Conversations**:
   - During a chat, click the **Save to Knowledge** button
   - Add title and tags
   - Click **Save**

3. **Import**:
   - Navigate to **Knowledge** → **Import**
   - Choose file (Markdown, JSON, CSV)
   - Map fields
   - Click **Import**

### Organizing Knowledge

**Tags:**
- Add tags to entries for easy organization
- Click tags to filter entries
- Create tag-based views

**Collections:**
- Group related entries
- Create custom collections
- Share collections across conversations

**Checkpoints:**
- Save knowledge base state at any time
- Roll back to previous checkpoints
- Useful before major changes

### Semantic Search

PersonalLog uses vector embeddings for intelligent search:

1. Navigate to **Knowledge**
2. Type your query in natural language
3. Results ranked by semantic similarity
4. Find related concepts, not just exact matches

**Example:**
- Query: "How do I handle authentication?"
- Finds: Entries about OAuth, JWT, login flows, security best practices

### Knowledge Browser

Visual exploration of your knowledge base:

1. Navigate to **Knowledge** → **Browser**
2. View entries as cards or list
3. Filter by tags, date, relevance
4. Click entry for details
5. Edit or delete as needed

### LoRA Training Data Export

Export knowledge for training custom AI models:

1. Navigate to **Knowledge** → **Export**
2. Select **LoRA Training Data**
3. Choose entries to include
4. Export as JSONL format
5. Use for fine-tuning local models

---

## Settings & Customization

### System Settings

View your device capabilities and performance:

**Hardware Information:**
- CPU cores and architecture
- Available memory
- GPU details
- Performance score (0-100)
- Performance class (low/medium/high/ultra)

**Performance Classes:**
- **Low** (0-30): Basic features, no animations
- **Medium** (31-60): Standard features, reduced effects
- **High** (61-85): Full features, standard effects
- **Ultra** (86-100): All features, maximum quality

Access: **Settings** → **System**

### Feature Flags

Control which features are enabled:

Access: **Settings** → **Features**

| Feature | Description | Default |
|---------|-------------|---------|
| Messenger | AI conversations | Enabled |
| Knowledge | Knowledge management | Enabled |
| Advanced Search | Full-text search | Auto |
| Analytics | Usage tracking | Enabled |
| Experiments | A/B testing participation | Enabled |
| Optimization | Auto performance tuning | Enabled |

**Auto-performance gating**: Features automatically adjust based on your device's performance class.

### Appearance

Customize the look and feel:

Access: **Settings** → **Appearance**

- **Theme**: Light, Dark, or System
- **Font Size**: Small, Medium, Large
- **Message Density**: Compact, Comfortable, Spacious
- **Sidebar Width**: Adjust sidebar size
- **Color Accent**: Choose accent color

### AI Providers

Manage AI service connections:

Access: **Settings** → **Appearance** → **AI Providers**

**Add Provider:**
1. Click **Add Provider**
2. Select provider type
3. Enter API key
4. Configure models
5. Test connection
6. Save

**Edit Provider:**
1. Click on provider
2. Update settings
3. Save changes

**Delete Provider:**
1. Click on provider
2. Click **Delete**
3. Confirm deletion

### Benchmarks

Test your device's performance:

Access: **Settings** → **Benchmarks**

**Run Benchmarks:**
1. Click **Run Benchmarks**
2. Wait for completion (5-30 seconds)
3. View results

**Benchmark Categories:**
- Vector Operations
- Memory Performance
- Render Speed
- Network Latency
- Storage Speed

**Use Results:**
- Understand your device's capabilities
- Optimize feature settings
- Compare with other devices

### Analytics

View usage statistics:

Access: **Settings** → **Analytics**

**What's Tracked:**
- Page views
- Feature usage
- Session duration
- Performance metrics

**What's NOT Tracked:**
- Passwords or sensitive data
- Conversation content
- Keystrokes or mouse movements
- Personal information

**Export Analytics:**
1. Click **Export**
2. Download JSON file
3. Analyze offline

**Delete Analytics:**
1. Click **Delete**
2. Confirm deletion
3. Data permanently removed

---

## Data Management

### Backup

Protect your data with regular backups:

Access: **Settings** → **Backup**

**Create Backup:**
1. Click **Create Backup**
2. Choose backup location
3. Wait for completion
4. Store backup safely

**Automatic Backups:**
- Toggle on for automatic daily backups
- Choose backup time
- Specify retention policy

**Restore from Backup:**
1. Click **Restore**
2. Select backup file
3. Preview contents
4. Confirm restore

**Warning**: Restore overwrites current data. Backup first!

### Sync

Sync data across devices (future feature):

Access: **Settings** → **Sync**

**Sync Methods:**
- **Local Sync**: Same network (Wi-Fi)
- **Cloud Sync**: Encrypted cloud storage
- **Manual Sync**: File-based export/import

**Setup Sync:**
1. Choose sync method
2. Configure settings
3. Connect devices
4. Start syncing

### Data Portability

Export and import your data:

Access: **Settings** → **Data Portability**

**Export Options:**
- **All Data**: Complete export
- **Conversations**: Chat history
- **Knowledge**: Knowledge base
- **Settings**: App configuration
- **Analytics**: Usage data

**Import Data:**
1. Choose export file
2. Preview contents
3. Select what to import
4. Confirm import

**Formats Supported:**
- JSON (recommended)
- CSV (for spreadsheets)
- Markdown (for documents)

### Data Deletion

Delete your data safely:

**Selective Deletion:**
- Individual conversations
- Specific knowledge entries
- Analytics data
- Learned preferences

**Complete Deletion:**
1. Navigate to **Settings** → **Intelligence**
2. Click **Delete All Data**
3. Confirm (multiple confirmations required)
4. All data permanently removed

**Warning**: Complete deletion cannot be undone!

---

## Plugins & Extensions

### Plugin System

Extend PersonalLog functionality with plugins:

Access: **Settings** → **Plugins**

**What Plugins Can Do:**
- Add new AI providers
- Create custom export formats
- Extend the user interface
- Integrate external services
- Automate workflows

### Installing Plugins

**From File:**
1. Download plugin file
2. Click **Install Plugin**
3. Select file
4. Review permissions
5. Confirm installation

**From URL:**
1. Click **Install Plugin**
2. Enter plugin URL
3. Review permissions
4. Confirm installation

### Managing Plugins

**Enable/Disable:**
1. Navigate to **Settings** → **Plugins**
2. Find plugin
3. Toggle on/off

**Configure:**
1. Click on plugin
2. Adjust settings
3. Save changes

**Uninstall:**
1. Click on plugin
2. Click **Uninstall**
3. Confirm deletion

### Plugin Permissions

Plugins request permissions for:

- **Conversations**: Read/create/update/delete
- **Knowledge**: Search/add/update/delete
- **AI**: Use providers or create new ones
- **Network**: Make HTTP requests
- **Storage**: Store plugin data
- **UI**: Add menus, sidebars, modals

**Review permissions carefully before installing!**

---

## Tips & Best Practices

### Knowledge Management

**Best Practices:**
- Add tags to every entry
- Write clear, descriptive titles
- Break complex topics into multiple entries
- Regularly review and update entries
- Use checkpoints before bulk changes

**Search Tips:**
- Use natural language queries
- Include related concepts
- Don't worry about exact terms
- Semantic search finds related ideas

### AI Conversations

**Getting Better Responses:**
- Be specific in your requests
- Provide relevant context
- Use appropriate AI contacts for tasks
- Save important insights to knowledge
- Reference previous conversations when helpful

**Creating Effective AI Contacts:**
- Clear system prompts
- Specific personality traits
- Defined expertise areas
- Appropriate temperature (creative vs. focused)
- Test and iterate

### Performance Optimization

**For Low-End Devices:**
- Enable auto-optimization
- Disable resource-intensive features
- Use compact message density
- Limit knowledge base size
- Regular cleanup of old data

**For High-End Devices:**
- Run benchmarks
- Enable all features
- Use maximum quality settings
- Large knowledge bases work great

### Privacy & Security

**Best Practices:**
- Keep API keys secure
- Regular backups
- Review plugin permissions
- Export data periodically
- Understand what's tracked in analytics

**Local-First:**
- All data stored locally by default
- No third-party tracking
- Optional encrypted sync
- Full data export capability

---

## Troubleshooting

### Common Issues

**AI Not Responding:**
- Check API key is valid
- Verify provider is enabled
- Check internet connection
- Try a different provider
- Check rate limits

**Search Not Working:**
- Ensure knowledge base has entries
- Try broader search terms
- Check if feature is enabled
- Rebuild search index if needed

**Performance Issues:**
- Check performance class
- Run benchmarks
- Disable heavy features
- Clear old data
- Try compacting storage

**Sync Not Working:**
- Verify network connection
- Check sync settings
- Ensure both devices compatible
- Try manual sync
- Check for error messages

### Getting Help

**Documentation:**
- [README](../README.md): Overview and quick start
- [Developer Guide](./DEVELOPER_GUIDE.md): For developers
- [Plugin Development](./plugin-development.md): Build plugins
- [Settings Guide](./SETTINGS_GUIDE.md): Detailed settings

**Community:**
- GitHub Issues: Report bugs
- GitHub Discussions: Ask questions
- Plugin Directory: Discover plugins

**Debug Info:**
Access diagnostic information:
1. Navigate to **Settings** → **Intelligence**
2. Click **Run Diagnostics**
3. View detailed system status
4. Export for sharing with support

---

## Next Steps

Now that you understand PersonalLog's features:

1. **Explore**: Try all the features
2. **Customize**: Set up your AI contacts
3. **Organize**: Build your knowledge base
4. **Automate**: Install helpful plugins
5. **Backup**: Protect your data

**Enjoy using PersonalLog!**

---

*Last Updated: 2026-01-03*
*Version: 1.0.0*
