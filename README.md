# PersonalLog

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D8.0.0-orange)](https://pnpm.io)
[![Next](https://img.shields.io/badge/Next.js-15.3-black)](https://nextjs.org)
[![Rust](https://img.shields.io/badge/rust-stable-orange.svg)](https://www.rust-lang.org)
[![WASM](https://img.shields.io/badge/WebAssembly-2.0-purple.svg)](https://webassembly.org)

A personal application for everyday use. Streamlined default that can add any tool, featuring high-performance native WebAssembly modules.

## Overview

PersonalLog is your personal command center for daily activities. It provides a clean, focused interface for:

- Daily note-taking and journaling
- Task management
- Quick access to AI tools
- Personal knowledge management

## Features

- **Clean Interface** - Streamlined for daily use
- **Module System** - Add tools as needed
- **AI-Powered** - Built-in chat and memory
- **Local-First** - Your data stays on your machine
- **Dark Mode** - Full dark mode support with system preference detection
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+ (recommended) or npm/yarn
- Rust stable toolchain (for WASM module)

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
