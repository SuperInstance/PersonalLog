# GitHub Workflows

This directory contains automated CI/CD workflows for PersonalLog.

## Workflows

### 1. CI Workflow (`ci.yml`)

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch

**Jobs:**
- **Lint:** Runs ESLint
- **Type Check:** Validates TypeScript types
- **Build:** Creates production Next.js build

**Status Badge:**
```markdown
![CI](https://github.com/SuperInstance/PersonalLog/workflows/CI/badge.svg)
```

### 2. WASM Workflow (`wasm.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Changes to `native/rust/**` files
- Manual dispatch

**Jobs:**
- **Build WASM:** Compiles Rust to WebAssembly
  - Sets up Rust toolchain
  - Installs wasm-pack
  - Builds development and release versions
  - Checks file size
  - Uploads artifacts

- **Test WASM:** Runs WASM unit tests
  - Runs `wasm-pack test --node`
  - Runs Rust cargo tests
  - Runs Clippy linter
  - Checks code formatting

- **Integration Test:** Tests with Next.js
  - Downloads WASM artifacts
  - Installs Node dependencies
  - Verifies WASM loading
  - Type checks
  - Builds Next.js app

- **Benchmark:** Performance testing (main branch only)
  - Runs vector operation benchmarks
  - Reports ops/sec metrics

**Status Badge:**
```markdown
![WASM](https://github.com/SuperInstance/PersonalLog/workflows/WASM%20Build%20%26%20Test/badge.svg)
```

### 3. Release Workflow (`release.yml`)

**Triggers:**
- Creating release tags

**Jobs:**
- Builds and creates GitHub releases
- Publishes packages (when configured)

## Caching Strategies

### Cargo Dependencies
```yaml
- ~/.cargo/registry
- ~/.cargo/git
- native/rust/target
```

### Node Dependencies
```yaml
- ~/.pnpm-store
- node_modules
```

Cache keys use hash of lock files for automatic invalidation.

## Artifacts

### WASM Artifacts
- **Name:** `wasm-package`
- **Contents:** `native/rust/pkg/`
- **Retention:** 7 days
- **Used by:** Integration tests

### Build Artifacts
- **Name:** `dist`
- **Contents:** `.next/`
- **Retention:** 7 days
- **Used by:** Deployment

## Local Testing

Test workflows locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
choco install act  # Windows

# Run CI workflow
act push

# Run WASM workflow
act -j build-wasm
```

## Workflow Status

View workflow runs at:
- https://github.com/SuperInstance/PersonalLog/actions

## Secrets Required

Currently, no secrets are required for public workflows.

When implementing package publishing, add:
- `NPM_TOKEN` - For npm registry
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

## Contributing

When adding new workflows:
1. Use consistent naming: `kebab-case`
2. Add status badges to README.md
3. Document triggers and jobs
4. Test locally with `act`
5. Update this README

## Troubleshooting

### Workflow Fails Locally but Passes in CI
- Check environment variables
- Verify tool versions match CI
- Ensure all secrets are available

### WASM Build Timeout
- Increase `timeout-minutes` in workflow
- Check for infinite loops in Rust code
- Reduce optimization level temporarily

### Caching Issues
- Clear cache: Delete cache key in Actions settings
- Force rebuild: Push empty commit with `[ci cache-clear]`

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Rust in Actions](https://github.com/actions-rs)
