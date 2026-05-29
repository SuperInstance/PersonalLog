# PersonalLog

**AI-powered personal knowledge and communication hub** — messenger-style AI conversations, intelligent knowledge management, and local-first architecture.

## What This Gives You

- **Messenger-style AI chat** — talk to AI contacts with unique personalities and expertise
- **Semantic knowledge base** — vector-powered search finds related concepts, not just keywords
- **Multi-provider AI** — OpenAI, Anthropic, Google, Mistral, Groq, Perplexity, and 10+ more
- **Local-first** — your data stays on your device, private and secure
- **WebAssembly acceleration** — 3-4x faster operations for heavy computation
- **Plugin system** — extensible architecture for custom workflows
- **Next.js + Rust + Python** — full-stack with WASM-optimized hot paths

## Quick Start

```bash
git clone https://github.com/SuperInstance/PersonalLog.git
cd PersonalLog
pnpm install
pnpm dev
```

Open [localhost:3002](http://localhost:3002).

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React, TypeScript |
| AI | Multi-provider (OpenAI, Anthropic, Google, etc.) |
| Search | Vector embeddings with semantic similarity |
| Performance | Rust → WebAssembly for hot paths |
| Backend | Python (journaling, mood tracking, analytics) |

## Testing

```bash
pnpm test
pytest  # Python backend
```

## How It Fits

The personal companion layer of the SuperInstance ecosystem. Uses `SmartCRDT` for state sync, `plato-memory` for persistence, and the `a2a-protocol` for multi-agent messaging.

## License

MIT
