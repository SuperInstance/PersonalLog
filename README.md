# PersonalLog

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D8.0.0-orange)](https://pnpm.io)
[![Next](https://img.shields.io/badge/Next.js-15.3-black)](https://nextjs.org)
[![Rust](https://img.shields.io/badge/rust-stable-orange.svg)](https://www.rust-lang.org)
[![WASM](https://img.shields.io/badge/WebAssembly-2.0-purple.svg)](https://webassembly.org)
[![Build Status](https://img.shields.io/github/actions/workflow/status/SuperInstance/PersonalLog/ci.yml?branch=main)](https://github.com/SuperInstance/PersonalLog/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-%3E80%25-brightgreen)](https://github.com/SuperInstance/PersonalLog/tree/main/tests)
[![Code Style](https://img.shields.io/badge/code%20style-prettier-ff69b4)](https://prettier.io)

**PersonalLog** is your AI-powered personal knowledge and communication hub. A messenger-style interface for AI conversations, intelligent knowledge management, and seamless everyday productivity.

## Overview

PersonalLog combines the simplicity of a chat interface with the power of AI and the organization of a knowledge base. It's your personal AI companion that learns from you, grows with you, and helps you accomplish more every day.

### What Makes PersonalLog Different?

- **Messenger-Style AI Conversations**: Chat with AI contacts that have unique personalities
- **Intelligent Knowledge Base**: Semantic search finds related concepts, not just exact matches
- **Local-First Architecture**: Your data stays on your device, private and secure
- **Multi-Provider AI Support**: Use OpenAI, Anthropic, Google, Mistral, and 10+ more
- **Performance-Optimized**: WebAssembly acceleration for 3-4x faster operations
- **Plugin System**: Extensible architecture for custom workflows
- **Privacy-Focused**: No third-party tracking, end-to-end encryption for sync

## Key Features

### AI Messaging

- **AI Contact System**: Create AI contacts with unique personalities and areas of expertise
- **Multi-Provider Support**: OpenAI, Anthropic Claude, Google Gemini, Mistral, Together AI, Groq, Perplexity, and more
- **Context-Aware Conversations**: Attach knowledge entries, files, and past conversations as context
- **Streaming Responses**: Watch AI responses generate in real-time
- **Conversation Management**: Search, archive, export, and delete conversations
- **Message Selection**: Select, copy, regenerate, and perform bulk actions on messages

### Knowledge Management

- **Semantic Search**: Find information using natural language queries
- **Vector Embeddings**: AI-powered search finds related concepts, not just exact matches
- **Tags & Collections**: Organize knowledge with flexible tagging and collections
- **Context Integration**: Attach knowledge entries to AI conversations for better responses
- **Import/Export**: Bring your existing notes, export for training AI models
- **Checkpoint System**: Save knowledge base states and roll back when needed

### Intelligence & Optimization

- **Hardware Detection**: Automatic device capability detection and performance classification
- **Auto-Optimization**: System automatically adjusts based on your device's performance
- **Feature Flags**: Runtime feature enablement with performance-based gating
- **Analytics**: Usage tracking to understand and improve your experience
- **A/B Testing**: Experiment framework for testing improvements
- **Personalization**: System learns your preferences and adapts

### Data Management

- **Backup & Restore**: Automatic and manual backups with one-click restore
- **Data Portability**: Export all data in standard JSON format
- **Import**: Bring in data from other platforms
- **Sync (Coming Soon)**: Encrypted cross-device synchronization
- **Storage Management**: Monitor usage, compact storage, clean up old data

### Developer Experience

- **Plugin System**: Extend functionality with custom plugins
- **Type-Safe**: Built with TypeScript in strict mode
- **Testing**: Comprehensive test coverage (>80%)
- **Documentation**: Extensive guides for users and developers
- **Performance**: WebAssembly acceleration for compute-intensive operations

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+ (recommended) or npm/yarn
- Rust stable toolchain (for WASM module, optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/PersonalLog.git
cd PersonalLog

# Install dependencies
pnpm install

# Copy environment template and configure
cp .env.example .env.local
```

### Development

```bash
# Start development server on port 3002
pnpm dev

# Open http://localhost:3002
```

### Production Build

```bash
# Build for production (includes optimized WASM)
pnpm build

# Start production server
pnpm start
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Application
NODE_ENV=development
PORT=3002

# Optional: AI Provider API Keys
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# GOOGLE_API_KEY=...

# Storage Paths
PACKAGES_PATH=../packages
```

## Native WASM Module

PersonalLog includes a native WebAssembly module for high-performance vector operations. The WASM build is automated:

- **Development:** Builds automatically with `pnpm dev`
- **Production:** Builds optimized release version with `pnpm build`
- **Manual:** Run `pnpm build:wasm` or `pnpm build:wasm:release`

**Requirements for WASM development:**
- Rust stable toolchain
- wasm-pack
- wasm32-unknown-unknown target

Quick setup:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

For detailed build instructions, troubleshooting, and CI/CD information, see [BUILD.md](./docs/BUILD.md) or [WASM_QUICK_START.md](./docs/WASM_QUICK_START.md).

## Deployment

PersonalLog is configured for seamless deployment to Vercel:

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SuperInstance/PersonalLog)

**One-click deployment:**
1. Click the button above
2. Connect your GitHub account
3. Configure environment variables (see below)
4. Deploy!

### Environment Variables for Production

Required for production deployment:

```bash
# Required
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
BUILD_WASM=false

# Optional: Add AI provider API keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

See [`.env.example`](./.env.example) for all available variables.

### Deployment Documentation

For comprehensive deployment guides, including:
- Environment configuration
- Preview deployments
- Custom domains
- Monitoring and analytics
- Troubleshooting and rollbacks

See [DEPLOYMENT.md](./DEPLOYMENT.md)

### Alternative: Netlify

PersonalLog also supports Netlify deployment. See [DEPLOYMENT.md](./DEPLOYMENT.md#netlify-alternative) for configuration.

## Tech Stack

- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Utility-first styling
- **Rust/WASM** - High-performance native modules

## Development Notes

### Hot Module Reloading

In development mode, Next.js hot-reloads modules when files change. This can reset global state. In production, state persists properly across requests.

### WASM Build Process

The WASM module is built automatically during development and production builds. Manual builds are available via:
- `pnpm build:wasm` - Development build
- `pnpm build:wasm:release` - Optimized release build

## License

MIT - see [LICENSE](./LICENSE) for details.

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md)

## Documentation

### User Documentation

- **[User Guide](./docs/USER_GUIDE.md)** - Complete guide for using PersonalLog
- **[Setup Guide](./docs/SETUP.md)** - Detailed installation and configuration
- **[FAQ](./docs/FAQ.md)** - Frequently asked questions
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Solutions to common issues
- **[Settings Guide](./docs/SETTINGS_GUIDE.md)** - Settings and customization

### Developer Documentation

- **[Developer Guide](./docs/DEVELOPER_GUIDE.md)** - Development workflow and architecture
- **[Architecture](./docs/ARCHITECTURE.md)** - System architecture and design
- **[Contributing](./CONTRIBUTING.md)** - Contribution guidelines
- **[Plugin Development](./docs/plugin-development.md)** - Building plugins
- **[Testing Guide](./docs/TESTING.md)** - Testing strategy

### Technical Documentation

- **[BUILD.md](./docs/BUILD.md)** - Build and deployment instructions
- **[WASM Quick Start](./docs/WASM_QUICK_START.md)** - WebAssembly module setup
- **[Native Architecture](./docs/NATIVE_ARCHITECTURE.md)** - Native module architecture
- **[NATIVE_SETUP.md](./docs/NATIVE_SETUP.md)** - Native development setup

## Features

### AI Messaging

- Messenger-style interface for AI conversations
- Multiple AI provider support (OpenAI, Anthropic, Google, Mistral, and more)
- AI Contact system with customizable personalities
- Context-aware conversations (attach knowledge, files, past chats)
- Streaming AI responses
- Conversation search and archival
- Message selection and bulk operations

### Knowledge Management

- Semantic search with vector embeddings
- Natural language queries
- Tags and collections for organization
- Context integration with AI conversations
- Import from Markdown, JSON, CSV
- Export for AI model training
- Checkpoint system for version control

### Intelligence & Optimization

- Hardware detection and performance classification
- Automatic performance optimization
- Feature flags with runtime enablement
- Usage analytics
- A/B testing framework
- Personalization learning
- Benchmarking tools

### Data Management

- Backup and restore
- Data export (JSON, Markdown, CSV)
- Data import from external sources
- Cross-device sync (coming soon)
- Storage quota management
- Data portability and GDPR compliance

### Developer Experience

- Plugin system for extensibility
- TypeScript strict mode
- Comprehensive test coverage (>80%)
- WebAssembly acceleration (3-4x faster)
- Hot module reloading
- Extensive documentation

## Performance

PersonalLog is optimized for performance:

- **WebAssembly Acceleration**: 3-4x faster vector operations
- **Hardware Detection**: Automatic device capability detection
- **Auto-Optimization**: Performance-based feature gating
- **Intelligent Caching**: 75%+ cache hit rate
- **Code Splitting**: Lazy loading for faster initial load
- **Virtual Scrolling**: Efficient rendering of large lists

## Browser Support

PersonalLog works on all modern browsers:

- Chrome/Edge 57+
- Firefox 52+
- Safari 11+
- Opera 44+

Advanced features (WebAssembly SIMD) require newer browser versions, but PersonalLog gracefully falls back to compatible methods.

## Privacy & Security

PersonalLog is designed with privacy in mind:

- **Local-First**: All data stored locally on your device
- **No Tracking**: No third-party analytics or tracking
- **API Key Security**: Keys stored locally, never shared
- **Optional Encryption**: End-to-end encryption for sync (coming soon)
- **Data Portability**: Full export and deletion capabilities
- **GDPR Compliant**: Supports all GDPR rights

## Roadmap

### Current Version (v1.0)

- ✅ Messenger-style AI conversations
- ✅ Multi-provider AI support
- ✅ AI Contact system
- ✅ Knowledge base with semantic search
- ✅ WebAssembly acceleration
- ✅ Plugin system foundation
- ✅ Comprehensive testing

### Upcoming Features

- 🔄 Cross-device sync (Q1 2026)
- 🔄 Mobile apps (Q2 2026)
- 🔄 Advanced plugin marketplace (Q2 2026)
- 🔄 Collaboration features (Q3 2026)
- 🔄 Multi-modal AI (images, audio, video) (Q3 2026)

See [ROADMAP.md](./ROADMAP.md) for detailed roadmap.

## Community

### Getting Help

- **Documentation**: Start with [User Guide](./docs/USER_GUIDE.md)
- **FAQ**: Check [FAQ](./docs/FAQ.md)
- **Issues**: Report bugs on [GitHub Issues](https://github.com/SuperInstance/PersonalLog/issues)
- **Discussions**: Ask questions on [GitHub Discussions](https://github.com/SuperInstance/PersonalLog/discussions)

### Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Areas for contribution:**
- Bug fixes
- New features
- Documentation improvements
- Test coverage
- Plugin development
- Performance optimization

### Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [React](https://react.dev) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Rust](https://www.rust-lang.org/) - WebAssembly modules
- [Vitest](https://vitest.dev/) - Testing
- [Playwright](https://playwright.dev/) - E2E testing

---

**Built with ❤️ by the PersonalLog team**

*For more information, visit [GitHub](https://github.com/SuperInstance/PersonalLog)*

---

## 📐 Internal Architecture

### Directory Structure

```
personalLog/
├── src/
│   ├── components/
│   │   ├── messenger/          # AI chat UI (ChatArea, MessageBubble, ConversationList)
│   │   ├── agents/             # AI agent system (spreader, DAG, multi-model)
│   │   ├── knowledge/          # Knowledge base UI
│   │   ├── jepa/               # Emotion analysis & audio visualization
│   │   ├── providers/          # App-level context providers
│   │   ├── backup/             # Backup & recovery UI
│   │   ├── marketplace/        # Agent marketplace UI
│   │   └── ui/                 # Reusable UI primitives
│   ├── lib/
│   │   ├── agents/             # Agent logic (spreader, communication, tasks)
│   │   ├── plugin/             # Plugin system (loader, sandbox, registry, permissions)
│   │   ├── jepa/               # Emotion analysis, STT/ASR, language detection
│   │   ├── optimization/       # Auto-tuner, profiler, feature flags, recommendations
│   │   ├── notifications/      # Smart notification engine
│   │   └── prediction/         # Agent transition prediction
│   ├── packages/               # Publishable packages
│   │   ├── ai-smart-notifications/  # Notification engine
│   │   ├── in-browser-dev-tools/    # Developer tools
│   │   ├── benchmark-suite/         # Performance benchmarks
│   │   ├── universal-import-export/  # Data portability
│   │   └── vibe-code-agent-gen/     # Agent code generation
│   └── app/                     # Next.js App Router pages
├── native/rust/                # WASM module (vector operations, embeddings)
├── tests/
│   ├── e2e/                    # Playwright end-to-end tests
│   ├── smoke/                  # Smoke tests (15 suites)
│   ├── performance/            # Bundle size & performance regression
│   └── api/                    # API endpoint tests
├── docs/                       # User & developer documentation
└── examples/plugins/           # Plugin examples
```

### Data Flow

```
User Input
    │
    ▼
┌──────────────┐    ┌──────────────────┐    ┌────────────────┐
│  Chat UI     │───▶│  Agent Spreader  │───▶│  AI Providers  │
│  (React)     │    │  (Multi-Model)   │    │  (10+ LLMs)    │
└──────────────┘    └──────┬───────────┘    └───────┬────────┘
                           │                         │
                    ┌──────▼─────────────────────────▼──────┐
                    │        Context Manager                │
                    │  (Knowledge + Files + History)         │
                    └──────────────────┬────────────────────┘
                                       │
                    ┌──────────────────▼────────────────────┐
                    │     WASM Vector Engine (Rust)         │
                    │  Embeddings · Similarity · Search      │
                    └──────────────────────────────────────┘
```

### Key Subsystems

| Subsystem | Purpose | Technology |
|-----------|---------|------------|
| **Agent Spreader** | Distributes queries across multiple AI models for consensus | TypeScript, DAG executor |
| **Plugin System** | Extensible architecture for custom workflows | Sandbox, dynamic loader |
| **WASM Engine** | High-performance vector operations (3-4x faster) | Rust → wasm-pack |
| **Intelligence** | Hardware detection, feature flags, A/B testing | Custom framework |
| **JEPA Engine** | Emotion analysis, STT, language detection | ONNX Runtime, Whisper |

---

## 📋 Data Format

### Conversation Entry

```json
{
  "id": "uuid-v4",
  "type": "message",
  "role": "user | assistant",
  "content": "string",
  "timestamp": "ISO-8601",
  "agentId": "string | null",
  "metadata": {
    "model": "gpt-4o | claude-3.5-sonnet | ...",
    "provider": "openai | anthropic | ...",
    "tokens": { "input": 150, "output": 320 },
    "duration": 2400,
    "confidence": 0.95
  }
}
```

### Knowledge Entry

```json
{
  "id": "uuid-v4",
  "title": "string",
  "content": "markdown string",
  "tags": ["tag1", "tag2"],
  "collection": "string | null",
  "embedding": "Float32Array (vector)",
  "source": { "type": "manual | import | ai-generated", "origin": "string" },
  "checkpoint": { "version": 1, "previousId": "uuid | null" },
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

### AI Contact (Agent)

```json
{
  "id": "uuid-v4",
  "name": "string",
  "personality": "string",
  "expertise": ["domain1", "domain2"],
  "model": "gpt-4o",
  "provider": "openai",
  "systemPrompt": "string",
  "avatar": "string | null",
  "isDefault": false,
  "stats": {
    "conversationsCount": 42,
    "totalMessages": 380,
    "lastUsedAt": "ISO-8601"
  }
}
```

### Export Format

PersonalLog supports export in multiple formats:
- **JSON** — Full structured data (conversations, knowledge, contacts)
- **Markdown** — Human-readable formatted export
- **CSV** — Tabular data for spreadsheet import
- **Backup** — Encrypted binary backup with one-click restore

---

## 🔧 Plugin System

Plugins extend PersonalLog with custom functionality:

```
example-plugin/
├── manifest.json       # Plugin metadata (name, version, permissions)
├── src/
│   └── main.ts         # Plugin entry point
└── package.json        # Dependencies
```

```typescript
// manifest.json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Custom plugin for PersonalLog",
  "permissions": ["knowledge:read", "conversation:write"],
  "entry": "src/main.ts"
}
```

---

<img src="callsign1.jpg" width="128" alt="callsign">
