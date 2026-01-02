# WASM Build Quick Reference

Fast reference for PersonalLog WASM build commands.

## First Time Setup

```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Add WASM target
rustup target add wasm32-unknown-unknown

# Install wasm-pack
cargo install wasm-pack

# Install Node dependencies
pnpm install

# Build WASM and start dev server
pnpm dev
```

## Daily Development

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Start dev server (auto-builds WASM) |
| `pnpm build` | Production build (optimized WASM) |
| `pnpm test` | Run all tests |
| `pnpm verify:wasm` | Verify WASM build and run tests |

## WASM-Specific Commands

| Command | Description |
|---------|-------------|
| `pnpm build:wasm` | Build WASM (dev mode) |
| `pnpm build:wasm:release` | Build WASM (optimized) |
| `pnpm clean:wasm` | Clean WASM artifacts |
| `pnpm verify:wasm` | Comprehensive WASM verification |
| `pnpm test:wasm` | Run WASM unit tests |
| `pnpm watch:wasm` | Auto-rebuild on file changes |

## Build Workflow

```
┌─────────────────┐
│  Edit Rust Code │
│  (native/rust/) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│  pnpm watch:wasm │ ───► │  Auto-rebuild   │
└─────────────────┘      └────────┬────────┘
                                  │
                                  ▼
                          ┌─────────────────┐
                          │  Browser Tests  │
                          └─────────────────┘
```

## Troubleshooting

### WASM not found
```bash
# Check if wasm-pack is installed
wasm-pack --version

# If not found, install it
cargo install wasm-pack
```

### Build fails
```bash
# Clean and rebuild
pnpm clean:wasm
pnpm build:wasm
```

### Type errors
```bash
# Rebuild WASM and regenerate TypeScript definitions
pnpm build:wasm
pnpm type-check
```

## File Locations

```
PersonalLog/
├── native/rust/
│   ├── src/              # Rust source code
│   ├── Cargo.toml        # Rust dependencies
│   └── pkg/              # WASM build output
│       ├── *.js          # JavaScript glue
│       ├── *.wasm        # WASM binary
│       └── *.d.ts        # TypeScript definitions
├── scripts/
│   └── verify-wasm.js    # Verification script
└── .github/workflows/
    └── wasm.yml          # CI/CD configuration
```

## Performance Tips

1. **Development:** Use `pnpm watch:wasm` for automatic rebuilds
2. **Production:** Always use `pnpm build:wasm:release`
3. **Testing:** Run `pnpm verify:wasm` to catch issues early
4. **Optimization:** Release builds are 5x smaller than dev builds

## Getting Help

- Full guide: `docs/BUILD.md`
- Rust/WASM docs: https://rustwasm.github.io/docs/book/
- Issue tracker: https://github.com/SuperInstance/PersonalLog/issues
