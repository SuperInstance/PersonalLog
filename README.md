# PersonalLog

A local-first personal journal, mood tracker, and messenger-style log.

**Current status:** beta / pre-production. The repo has real, working foundations, but large parts of the UI are scaffolded or mocked-up and the JavaScript unit-test suite is not yet reliable. See [Current status](#current-status) below for an honest breakdown.

## What it actually is

PersonalLog is three things in one repo:

1. **Python package `personal_log`** — in-memory journaling primitives (entries, journal, mood tracking, analytics, JSON/CSV/Markdown export).
2. **Rust/WASM native module** — fast vector math (`cosine_similarity`, `dot_product`, `batch_cosine_similarity`, etc.) for the knowledge-base similarity search.
3. **Next.js 15 web app** — a messenger-style UI for conversations, knowledge base, settings, plugins, JEPA emotion visualization, and more.

Data stays in the browser (IndexedDB) by default; the Python package is a separate local library, not a hosted backend.

## Verified working today ✅

| Component | What was verified | Result |
|-----------|-------------------|--------|
| `personal_log` Python package | `pip install -e '.[dev]'` + `pytest` | **42 passed** |
| Rust native vector ops | `cargo test` in `native/rust` | **3 passed** |
| Next.js static build | `pnpm build` | **succeeds** |
| TypeScript type check | `pnpm type-check` | **clean** |
| ESLint | `pnpm lint` | **0 errors**, 610 warnings |

These are the commands that were run personally; do not treat anything else as guaranteed.

## Partial / caveat ⚠️

- **Frontend pages exist** but many are UI shells or wireframes (settings panels, marketplace, plugins, analytics dashboards). They render and type-check; not all of them are wired to real, persistent behavior.
- **AI chat** has provider adapters (OpenAI, Anthropic, local/Ollama) but requires you to bring your own API keys or a running local endpoint. It is not a turnkey hosted AI.
- **Knowledge base / vector search** uses the Rust/WASM math, but embeddings are currently hash-based placeholders, not a trained embedding model. Semantic search is therefore limited.
- **WASM acceleration** compiles and loads with a JS fallback, but the claimed 3–4× benchmarks were not reproduced in this pass.
- **Plugin system** has example manifests and a UI, but the examples are `.disabled` and real plugin loading is incomplete.
- **Unit tests (`pnpm test:unit`)** currently hang or fail en masse because jsdom lacks mocks for IndexedDB, `HTMLCanvasElement`, WebAssembly, etc. They need a dedicated test-hardening pass before they can be required in CI.

## Aspirational / not yet real 🔮

- Multi-provider AI with one-click setup.
- Real sentence-transformer embeddings in the browser or via a local service.
- End-to-end encrypted sync between devices.
- A published package on npm or PyPI.
- Production-grade Playwright e2e/smoke suite.
- SIMD-optimized WASM paths.

## Quick start

### Prerequisites

- Node.js ≥ 18 and pnpm ≥ 8
- Python ≥ 3.10 (for the `personal_log` package)
- Rust + `wasm-pack` (only if you want to rebuild the WASM module)

### Web app

```bash
pnpm install
pnpm build        # must pass before deploy
pnpm dev          # http://localhost:3002
```

The dev server starts on port `3002`.

### Python package

```bash
# using a venv is recommended
pip install -e '.[dev]'
pytest -v
```

### Rust native module

```bash
cd native/rust
cargo test
# or, to rebuild WASM for the web app:
# cd ../.. && pnpm build:wasm
```

## Project layout

```
personal_log/          # Python journaling / mood / analytics package
native/rust/           # Rust → WebAssembly vector math
src/                   # Next.js app (pages, components, lib)
packages/              # Other SuperInstance packages (excluded from root TS build)
tests/                 # Python tests + Playwright e2e/smoke/performance specs
```

## CI

`.github/workflows/ci.yml` runs real checks on every push:

- Python package install + `pytest`
- Rust `cargo test`
- `pnpm install`, `pnpm type-check`, `pnpm lint`, `pnpm build`

It does **not** run `pnpm test:unit` yet because the suite is not in a passing state.

## Package publish status

- **npm:** `package.json` is marked `"private": true`. There is no published `personallog` package on npm.
- **PyPI:** `pyproject.toml` names the package `personal-log`, but it is not published on PyPI.

Do not install this from a package registry; install from source.

## Current status

This branch is a production-hardening cleanup pass. The repo root was previously cluttered with AI-session status reports; those have been moved to `docs/archive/` so the root only contains the files a newcomer actually needs. The build now type-checks and compiles, the Python and Rust tests pass, and CI runs real commands instead of fake-green placeholders. The remaining hard problem is the JavaScript unit tests, which need proper browser-API mocking before CI can enforce them.

## License

MIT
