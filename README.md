# PersonalLog

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D8.0.0-orange)](https://pnpm.io)
[![Next](https://img.shields.io/badge/Next.js-15.3-black)](https://nextjs.org)
[![Rust](https://img.shields.io/badge/rust-stable-orange.svg)](https://www.rust-lang.org)
[![WASM](https://img.shields.io/badge/WebAssembly-2.0-purple.svg)](https://webassembly.org)

A SuperInstance application for everyday personal use. Streamlined default that can add any tool, featuring high-performance native WebAssembly modules.

## Overview

PersonalLog is your personal command center for the SuperInstance ecosystem. It provides a clean, focused interface for:

- Daily note-taking and journaling
- Task management
- Quick access to AI tools
- Personal knowledge management

## Features

- **Clean Interface** - Streamlined for daily use
- **Module System** - Add SuperInstance tools as needed
- **AI-Powered** - Built-in chat and memory
- **Local-First** - Your data stays on your machine

## Quick Start

```bash
git clone https://github.com/SuperInstance/PersonalLog.git
cd PersonalLog
pnpm install
pnpm dev
```

Visit http://localhost:3002

## Development

```bash
# Install dependencies
pnpm install

# Run dev server (builds WASM automatically)
pnpm dev

# Build for production
pnpm build

# Type check
pnpm type-check
```

### Native WASM Module

PersonalLog includes a native WebAssembly module for high-performance vector operations. The WASM build is automated:

- **Development:** Builds automatically with `pnpm dev`
- **Production:** Builds optimized release version with `pnpm build`
- **Manual:** Run `pnpm build:wasm` or `pnpm build:wasm:release`

For detailed build instructions, troubleshooting, and CI/CD information, see [BUILD.md](./docs/BUILD.md) or [WASM_QUICK_START.md](./docs/WASM_QUICK_START.md).

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

## Tech Stack

- Next.js 15
- React 19
- TypeScript 5
- Tailwind CSS 4

## License

MIT

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md)

### Key Features

- **Module Dashboard** - View all available modules at a glance with status indicators
- **Module Catalog** - Browse, search, and filter modules by category or status
- **Dynamic Loading** - Load/unload modules on demand with one click
- **Resource Monitoring** - Real-time CPU and memory usage visualization
- **API Key Management** - Secure configuration for cloud LLM providers
- **Dark Mode** - Full dark mode support with system preference detection
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+ (recommended) or npm/yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/SuperInstance/SuperInstanceCore.git
cd SuperInstanceCore/core-app

# Install dependencies
pnpm install

# Optional: Copy environment template and configure
cp .env.example .env.local
```

### Development

```bash
# Start development server on port 3001
pnpm dev

# Open http://localhost:3001
```

### Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Available Modules

### Foundation Primitives (v1.0.0)

Core utilities that other modules depend on:

| Package | Description |
|---------|-------------|
| `@superinstance/async` | Async utilities: retry, timeout, throttle, batch, queue |
| `@superinstance/validate` | Schema validation with Zod |
| `@superinstance/cache` | High-performance caching with LRU and TTL |
| `@superinstance/events` | Type-safe event emitter primitives |
| `@superinstance/config` | Configuration management with Zod validation |
| `@superinstance/storage` | Unified storage abstraction (memory, IndexedDB, SQLite, PostgreSQL) |
| `@superinstance/provider-base` | Base classes for LLM/TTS/ASR providers |
| `@superinstance/logger` | Production-safe structured logging |

### Feature Packages (v1.0.0)

Higher-level modules built on foundation primitives:

| Package | Description |
|---------|-------------|
| `@superinstance/chat` | Type-safe LLM chat abstraction (OpenAI, Anthropic, Z-AI) |
| `@superinstance/tts` | Text-to-speech synthesis (OpenAI, ElevenLabs, Z-AI) |
| `@superinstance/asr` | Speech recognition and transcription |
| `@superinstance/memory` | Four-layer memory system with semantic search |
| `@superinstance/dreamer` | Cognitive intelligence with 5-level abstraction |
| `@superinstance/rag` | Retrieval-augmented generation toolkit |
| `@superinstance/knowledge-tensor` | Multi-dimensional knowledge operations |
| `@superinstance/abstraction` | Pattern detection and insight generation |
| `@superinstance/content-analyzer` | Multi-modal content analysis (text, image, URL) |
| `@superinstance/personalization` | User preference learning and adaptation |
| `@superinstance/event-runtime` | Real-time WebSocket event infrastructure |
| `@superinstance/audio-workspace` | Audio editing UI with timeline and waveform |
| `@superinstance/agent-factory` | Create specialized AI agents through conversation |
| `@superinstance/script-editor` | Monaco-based script editing component |
| `@superinstance/error-handler` | Retry logic, circuit breaker, error aggregation |

## Project Structure

```
core-app/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── api/                  # API routes
│   │   │   └── modules/          # Module management endpoints
│   │   ├── catalog/              # Module catalog page
│   │   ├── settings/             # Settings page
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Dashboard (home page)
│   │   ├── globals.css           # Global styles with CSS variables
│   │   ├── global-error.tsx      # Global error boundary
│   │   ├── global-not-found.tsx  # Global 404 page
│   │   └── sitemap.ts            # SEO sitemap generator
│   ├── components/               # React components
│   │   └── module-card.tsx       # Module display card
│   ├── lib/                     # Utility libraries
│   │   ├── module-registry.ts    # Module discovery and state management
│   │   └── utils.ts              # Utility functions (cn helper)
│   └── types/                   # TypeScript definitions
│       └── modules.ts            # Module-related types
├── public/                       # Static assets
│   └── robots.txt               # SEO robots.txt
├── .env.example                 # Environment variable template
├── .gitignore                   # Git ignore patterns
├── LICENSE                      # MIT License
├── next.config.ts              # Next.js configuration
├── package.json                # Dependencies and scripts
├── README.md                   # This file
├── tailwind.config.ts          # Tailwind CSS configuration
└── tsconfig.json               # TypeScript configuration
```

## API Endpoints

### GET /api/modules

Returns all discovered modules with their current states and aggregate statistics.

**Response:**
```json
{
  "success": true,
  "modules": [
    {
      "id": "@superinstance/async",
      "metadata": { /* package.json contents */ },
      "installed": true,
      "loaded": false,
      "resources": { "cpu": 0, "memory": 0, "disk": 0, "lastUpdate": "..." },
      "status": "idle",
      "category": "foundation"
    }
  ],
  "stats": {
    "total": 23,
    "foundation": 8,
    "feature": 15,
    "loaded": 0,
    "installed": 23
  }
}
```

### POST /api/modules/load

Loads a module into memory.

**Request:**
```json
{
  "moduleId": "@superinstance/async"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Module @superinstance/async loaded successfully",
  "module": { /* updated module state */ }
}
```

### POST /api/modules/unload

Unloads a module from memory.

**Request:**
```json
{
  "moduleId": "@superinstance/async"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Module @superinstance/async unloaded successfully",
  "module": { /* updated module state */ }
}
```

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Port for the development server (default: 3001)
PORT=3001

# Path to the SuperInstance packages directory (relative or absolute)
# Default: ../packages
PACKAGES_PATH=../packages

# Optional: API keys for development (recommended to use Settings UI instead)
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# GOOGLE_API_KEY=...

# Node environment
NODE_ENV=development
```

## Configuration

### Packages Path

The app looks for SuperInstance modules in the directory specified by `PACKAGES_PATH`.

By default, it uses `../packages` (relative to the core-app directory), which works for the standard monorepo layout:

```
SuperInstanceCore/
├── packages/          # Module packages live here
│   ├── async/
│   ├── chat/
│   └── ...
└── core-app/          # This application
```

For custom layouts, set `PACKAGES_PATH` to an absolute path or adjust the relative path.

## Technologies

- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Utility-first styling
- **Lucide React** - Beautiful icon library
- **class-variance-authority** - Component variant system
- **clsx & tailwind-merge** - Conditional class utilities

## Development Notes

### Hot Module Reloading

In development mode, Next.js hot-reloads modules when files change. This can reset global state, including the module registry. The module state will reset on file changes - this is expected behavior in development.

In production, module state persists properly across requests.

### Module Loading

The current implementation simulates module loading with a 1-second delay. The actual dynamic import functionality would be implemented based on the specific module system architecture.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions:
- GitHub Issues: https://github.com/SuperInstance/SuperInstanceCore/issues
- Documentation: https://github.com/SuperInstance/SuperInstanceCore/wiki

---

**SuperInstance** - Modular toolkit ecosystem for intelligent applications.
