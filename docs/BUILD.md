# PersonalLog Build Guide

This guide covers building PersonalLog, including the native WebAssembly (WASM) module.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Build](#development-build)
- [Production Build](#production-build)
- [WASM Build Process](#wasm-build-process)
- [Build Scripts](#build-scripts)
- [CI/CD](#cicd)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **Rust** stable toolchain (for WASM builds)
- **wasm-pack** >= 0.12.0

### Installing Rust Toolchain

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WASM target
rustup target add wasm32-unknown-unknown

# Install wasm-pack
cargo install wasm-pack
```

### Verifying Installation

```bash
node --version   # Should be >= 18.0.0
pnpm --version   # Should be >= 8.0.0
rustc --version  # Should show stable version
wasm-pack --version
```

## Quick Start

```bash
# Clone the repository
git clone https://github.com/SuperInstance/PersonalLog.git
cd PersonalLog

# Install dependencies
pnpm install

# Run development server (builds WASM automatically)
pnpm dev
```

The app will be available at `http://localhost:3002`

## Development Build

### Automatic WASM Build

The development server automatically builds WASM before starting:

```bash
pnpm dev
```

This runs:
1. `predev` hook - Builds WASM in development mode
2. Next.js dev server on port 3002

### Manual WASM Build

```bash
# Build WASM in development mode (faster, larger)
pnpm run build:wasm

# Build WASM in release mode (slower, optimized)
pnpm run build:wasm:release
```

### Watching for Changes

For automatic WASM rebuilds during development:

```bash
pnpm run watch:wasm
```

This requires `cargo-watch`:
```bash
cargo install cargo-watch
```

## Production Build

### Full Production Build

```bash
pnpm build
```

This runs:
1. `prebuild` hook - Builds WASM in release mode (optimized)
2. Next.js production build
3. TypeScript compilation
4. Asset optimization

### Production Server

```bash
pnpm build
pnpm start
```

The production server runs on the default Next.js port (usually 3000).

## WASM Build Process

### Build Modes

| Mode | Command | Size | Speed | Use Case |
|------|---------|------|-------|----------|
| **Dev** | `build:wasm` | ~500 KB | Fast | Development |
| **Release** | `build:wasm:release` | ~100 KB | Slow | Production |

### What Gets Built

```
native/rust/pkg/
├── personallog_native.js          # JavaScript glue code
├── personallog_native_bg.wasm     # WebAssembly binary
├── personallog_native.d.ts        # TypeScript definitions
└── package.json                   # Package metadata
```

### WASM Optimization

Release builds use these optimizations:

- **Size optimization** (`opt-level = "s"`)
- **Link-time optimization** (`lto = true`)
- **Debug symbol stripping** (`strip = true`)
- **Binary size reduction** (`wasm-opt -Oz`)

### Cargo.toml Configuration

```toml
[profile.release]
opt-level = "s"     # Optimize for size
lto = true          # Link-time optimization
debug = false       # No debug info
strip = true        # Strip symbols

[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-Oz", "--enable-mutable-globals", "--enable-sign-ext"]
```

## Build Scripts

### Available Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start development server (builds WASM) |
| `build` | Production build (builds WASM in release mode) |
| `start` | Start production server |
| `build:wasm` | Build WASM in development mode |
| `build:wasm:release` | Build WASM in release mode |
| `watch:wasm` | Watch and rebuild WASM on changes |
| `clean` | Clean all build artifacts |
| `clean:wasm` | Clean only WASM artifacts |
| `test:wasm` | Run WASM unit tests |
| `test:wasm:browser` | Run WASM tests in browser |
| `verify:wasm` | Verify WASM build and functionality |
| `test` | Run all tests (WASM + TypeScript) |
| `lint` | Run ESLint |
| `type-check` | Run TypeScript type checking |

### NPM Hooks

```json
{
  "predev": "npm run build:wasm",
  "prebuild": "npm run build:wasm:release"
}
```

These hooks ensure WASM is always built before running the app.

## CI/CD

### GitHub Actions

PersonalLog uses GitHub Actions for automated testing:

#### WASM Workflow (`.github/workflows/wasm.yml`)

Triggers:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`
- Manual workflow dispatch

Jobs:
1. **Build WASM** - Compile and verify WASM
2. **Test WASM** - Run unit and integration tests
3. **Integration Test** - Test with Next.js build
4. **Benchmark** - Performance benchmarks (main branch only)

#### CI Workflow (`.github/workflows/ci.yml`)

Runs on every push/PR:
- Linting
- Type checking
- Production build

### Caching

The CI/CD pipeline caches:
- Cargo registry and index
- Cargo build artifacts
- Node modules (pnpm store)

This reduces build times by 50-70%.

### Build Status

Check the Actions tab in GitHub to see build status:
- https://github.com/SuperInstance/PersonalLog/actions

## Troubleshooting

### WASM Build Fails

#### Error: "wasm-pack: command not found"

**Solution:** Install wasm-pack
```bash
cargo install wasm-pack
```

#### Error: "target 'wasm32-unknown-unknown' not installed"

**Solution:** Add WASM target to Rust
```bash
rustup target add wasm32-unknown-unknown
```

#### Error: "error: linker 'link.exe' not found" (Windows)

**Solution:** Install Microsoft C++ Build Tools
1. Download Visual Studio Installer
2. Install "Desktop development with C++"

### Build is Slow

#### Development builds take too long

**Solution 1:** Skip WASM rebuild if unchanged
```bash
# The predev hook only rebuilds if needed
pnpm dev
```

**Solution 2:** Use release mode for better performance
```bash
pnpm run build:wasm:release
pnpm dev
```

### TypeScript Errors

#### Error: "Cannot find module 'personallog_native'"

**Solution:** Build WASM first
```bash
pnpm run build:wasm
pnpm run type-check
```

### Out of Memory During Build

**Solution:** Increase Node.js memory limit
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm build
```

### WASM File Too Large

If the WASM file exceeds 1 MB:

1. Check build mode (use release)
2. Review dependencies
3. Enable more aggressive optimization
4. Consider code splitting

```toml
# Cargo.toml
[profile.release]
opt-level = "z"  # Even more aggressive size optimization
codegen-units = 1  # Better optimization
```

### Verification Fails

Run the verbose verification script:
```bash
node scripts/verify-wasm.js
```

This will show:
- Which artifacts are missing
- Which tests are failing
- Performance metrics

## Advanced Topics

### Custom Build Configuration

#### Modify Next.js Webpack Config

Edit `next.config.ts`:
```ts
webpack: (config, { isServer }) => {
  config.experiments = {
    ...config.experiments,
    asyncWebAssembly: true,
  };
  return config;
}
```

#### Enable Experimental Features

```toml
# Cargo.toml
[dependencies]
wasm-bindgen = { version = "0.2", features = ["nightly"] }
```

### Performance Tuning

#### SIMD Acceleration

WebAssembly SIMD provides 2-4x speedup for vector operations:

1. Enable in Cargo.toml:
```toml
[features]
default = ["console_error_panic_hook"]
simd = []
```

2. Build with SIMD:
```bash
cd native/rust
RUSTFLAGS="-C target-feature=+simd128" wasm-pack build --release --target web
```

Note: Requires browser support for SIMD.

#### Memory Optimization

Use the `wee_alloc` allocator for smaller binary size:

```toml
[dependencies]
wee_alloc = { version = "0.4", optional = true }

[features]
default = ["console_error_panic_hook", "wee_alloc"]
```

### Local Development with Docker

```dockerfile
FROM node:20
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
RUN cargo install wasm-pack
WORKDIR /app
```

## Build Artifacts

### File Sizes (Typical)

| File | Dev Size | Release Size |
|------|----------|--------------|
| `personallog_native_bg.wasm` | ~500 KB | ~100 KB |
| `personallog_native.js` | ~20 KB | ~20 KB |
| `.next/` (full app) | ~5 MB | ~2 MB |

### Output Locations

```
PersonalLog/
├── .next/                    # Next.js build output
├── native/rust/pkg/          # WASM build output
│   ├── *.js                 # JavaScript glue
│   ├── *.wasm               # WASM binary
│   └── *.d.ts               # TypeScript definitions
└── out/                      # Static export (if configured)
```

## Best Practices

### Before Committing

1. **Run tests:**
   ```bash
   pnpm test
   ```

2. **Type check:**
   ```bash
   pnpm type-check
   ```

3. **Lint:**
   ```bash
   pnpm lint
   ```

4. **Verify WASM:**
   ```bash
   pnpm verify:wasm
   ```

### Before Deploying

1. **Clean build:**
   ```bash
   pnpm clean
   pnpm build
   ```

2. **Test production build locally:**
   ```bash
   pnpm build
   pnpm start
   ```

3. **Check WASM size:**
   ```bash
   ls -lh native/rust/pkg/personallog_native_bg.wasm
   ```

### Performance Monitoring

```bash
# Run benchmark
node -e "
const pkg = require('./native/rust/pkg/personallog_native.js');
const iterations = 10000;
const v1 = new Float32Array(384).fill(0).map(() => Math.random());
const v2 = new Float32Array(384).fill(0).map(() => Math.random());

const start = performance.now();
for (let i = 0; i < iterations; i++) {
  pkg.cosine_similarity(v1, v2);
}
console.log(\`\${(iterations / (performance.now() - start) * 1000).toFixed(0)} ops/sec\`);
"
```

## Getting Help

- **Documentation:** See `docs/` directory
- **Issues:** https://github.com/SuperInstance/PersonalLog/issues
- **Discussions:** https://github.com/SuperInstance/PersonalLog/discussions

## Additional Resources

- [Rust and WebAssembly](https://rustwasm.github.io/docs/book/)
- [wasm-pack Documentation](https://rustwasm.github.io/wasm-pack/)
- [Next.js Build API](https://nextjs.org/docs/api-reference/next.config.js/introduction)
- [WebAssembly Optimization](https://webassembly.org/docs/future-features)

---

**Last Updated:** 2025-01-02
**Build System Version:** 2.0
