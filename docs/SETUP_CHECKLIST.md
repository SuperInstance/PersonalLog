# WASM Development Setup Checklist

Use this checklist to verify your environment is properly configured for WASM development.

## Prerequisites Check

### 1. Node.js and pnpm

```bash
# Check Node.js version (should be >= 18.0.0)
node --version
# Expected output: v18.x.x or higher

# Check pnpm version (should be >= 8.0.0)
pnpm --version
# Expected output: 8.x.x or higher
```

**Status:** ❌ Not checked / ✅ Passed

---

### 2. Rust Toolchain

```bash
# Check Rust version
rustc --version
# Expected output: rustc 1.x.x (or similar)

# Check Cargo version
cargo --version
# Expected output: cargo 1.x.x

# Check if wasm32 target is installed
rustup target list | grep wasm32-unknown-unknown
# Expected output: wasm32-unknown-unknown (installed)
```

**If not installed:**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Add WASM target
rustup target add wasm32-unknown-unknown
```

**Status:** ❌ Not checked / ✅ Passed

---

### 3. wasm-pack

```bash
# Check wasm-pack version
wasm-pack --version
# Expected output: wasm-pack 0.x.x
```

**If not installed:**
```bash
cargo install wasm-pack
```

**Status:** ❌ Not checked / ✅ Passed

---

### 4. Optional Development Tools

```bash
# cargo-watch for auto-rebuild on file changes
cargo install cargo-watch

# Verify installation
cargo watch --version
```

**Status:** ❌ Not checked / ✅ Passed / ⚠️ Optional

---

## Installation Verification

### 5. Install Dependencies

```bash
pnpm install
# Expected output: Packages installed successfully
```

**Status:** ❌ Not checked / ✅ Passed

---

### 6. Build WASM (Development)

```bash
pnpm run build:wasm
# Expected output:
#   Compiled wasm-pack successfully
#   WASM file created at native/rust/pkg/
```

**Verify artifacts exist:**
```bash
ls -lh native/rust/pkg/
# Expected files:
#   personallog_native.js
#   personallog_native_bg.wasm
#   personallog_native.d.ts
#   package.json
```

**Status:** ❌ Not checked / ✅ Passed

---

### 7. Verify WASM Build

```bash
pnpm run verify:wasm
# Expected output:
#   ✓ WASM module loaded
#   ✓ All vector operations passed
#   ✓ Performance metrics reported
```

**Status:** ❌ Not checked / ✅ Passed

---

## Development Workflow Test

### 8. Start Development Server

```bash
pnpm dev
# Expected output:
#   ✓ WASM built successfully
#   ✓ Next.js dev server running on port 3002
```

**Test in browser:**
- Open http://localhost:3002
- Check browser console for WASM errors
- Verify app loads without errors

**Status:** ❌ Not checked / ✅ Passed

---

### 9. Test WASM Watch Mode (Optional)

```bash
# In a separate terminal
pnpm run watch:wasm

# Make a change to native/rust/src/lib.rs
# Expected: WASM rebuilds automatically
```

**Status:** ❌ Not checked / ✅ Passed / ⚠️ Optional

---

## Production Build Test

### 10. Build Production Release

```bash
pnpm build
# Expected output:
#   ✓ WASM release build (optimized)
#   ✓ Next.js production build
#   ✓ Build completed successfully
```

**Check WASM file size:**
```bash
ls -lh native/rust/pkg/personallog_native_bg.wasm
# Expected: ~100 KB (optimized)
# Warning if: > 500 KB
```

**Status:** ❌ Not checked / ✅ Passed

---

### 11. Run Tests

```bash
# Run all tests
pnpm test

# Run WASM tests only
pnpm run test:wasm

# Expected: All tests pass
```

**Status:** ❌ Not checked / ✅ Passed

---

## Performance Verification

### 12. Benchmark Performance

```bash
pnpm run verify:wasm
# Check the performance output:
#   Operations/sec should be > 10,000
#   For 384-dimensional vectors
```

**Expected performance:**
- Cosine similarity: ~50,000 ops/sec
- Dot product: ~100,000 ops/sec

**Status:** ❌ Not checked / ✅ Passed

---

## Troubleshooting Common Issues

### Issue: "wasm-pack: command not found"

**Solution:**
```bash
cargo install wasm-pack
# Restart your terminal after installation
```

---

### Issue: "target 'wasm32-unknown-unknown' not installed"

**Solution:**
```bash
rustup target add wasm32-unknown-unknown
```

---

### Issue: Build is very slow

**Solution:**
- First builds take 30-60 seconds (normal)
- Subsequent builds use cache and are fast (5-10 seconds)
- Ensure you have enough RAM (8GB+ recommended)

---

### Issue: WASM file is too large

**Solution:**
```bash
# Ensure you're using release mode
pnpm run clean:wasm
pnpm run build:wasm:release

# Check Cargo.toml has optimization flags
# (already configured in the project)
```

---

## Environment Summary

**Your Setup:**
- OS: _______________
- Node.js: _______________
- pnpm: _______________
- Rust: _______________
- wasm-pack: _______________
- cargo-watch: _______________ (optional)

**Last Updated:** _______________

---

## Quick Reference Commands

```bash
# Daily development
pnpm dev                    # Start dev server with auto-build
pnpm run watch:wasm         # Auto-rebuild WASM on changes

# Building
pnpm run build:wasm         # Development build
pnpm run build:wasm:release # Production build (optimized)
pnpm build                  # Full Next.js build

# Testing
pnpm test                   # All tests
pnpm run test:wasm          # WASM unit tests
pnpm run verify:wasm        # Comprehensive verification

# Cleanup
pnpm run clean:wasm         # Clean WASM artifacts
pnpm clean                  # Clean everything
```

---

## Need Help?

- **Full Build Guide:** See [BUILD.md](./BUILD.md)
- **Quick Start:** See [WASM_QUICK_START.md](./WASM_QUICK_START.md)
- **CI/CD Docs:** See [.github/README.md](../.github/README.md)
- **Issues:** https://github.com/SuperInstance/PersonalLog/issues

---

**Checklist Version:** 1.0
**Last Updated:** 2025-01-02
