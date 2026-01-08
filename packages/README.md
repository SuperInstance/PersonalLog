# Open Source Tool Packages

This directory contains two open-source tools extracted from PersonalLog, ready for GitHub release.

## Packages

### 1. Spreader Tool 📚

**Purpose**: Parallel multi-agent information gathering and synthesis

**Location**: `./spreader-tool/`
**Repository**: https://github.com/SuperInstance/Spreader-tool
**npm**: `@superinstance/spreader`

**Status**: ✅ READY FOR RELEASE

**Key Features**:
- Spawn multiple specialist agents simultaneously
- Full context architecture
- Intelligent summarization (Ralph Wiggum mode)
- Model-agnostic (works with any LLM)
- Beautiful CLI interface
- Markdown output with index generation

### 2. Cascade Router 🔄

**Purpose**: Intelligent LLM routing with cost optimization

**Location**: `./cascade-router/`
**Repository**: https://github.com/SuperInstance/CascadeRouter
**npm**: `@superinstance/cascade-router`

**Status**: ✅ READY FOR RELEASE

**Key Features**:
- 6 intelligent routing strategies
- Token budget management
- Rate limiting
- Progress monitoring
- Cost optimization
- Automatic failover

## Quick Start

### Prerequisites

1. Create GitHub repositories:
   - https://github.com/new → Create `Spreader-tool`
   - https://github.com/new → Create `CascadeRouter`

2. Ensure both repositories:
   - Are public
   - Have MIT license
   - Are empty (we'll push everything)

### Push to GitHub

```bash
# Make push script executable
chmod +x scripts/push-to-github.sh

# Run the push script
./scripts/push-to-github.sh
```

The script will:
1. Initialize git repositories
2. Commit all files
3. Add remote origins
4. Push to GitHub (with confirmation)

### Manual Push (Alternative)

**Spreader**:
```bash
cd spreader-tool
git init
git add .
git commit -m "Initial release: Spreader v1.0.0"
git branch -M main
git remote add origin https://github.com/SuperInstance/Spreader-tool.git
git push -u origin main
```

**Cascade Router**:
```bash
cd cascade-router
git init
git add .
git commit -m "Initial release: Cascade Router v1.0.0"
git branch -M main
git remote add origin https://github.com/SuperInstance/CascadeRouter.git
git push -u origin main
```

## Verification

Both packages have been verified:

✅ Build successfully (TypeScript compiles)
✅ All documentation complete
✅ GitHub templates created
✅ CI/CD workflows configured
✅ Release notes prepared
✅ Security policies documented
✅ Contributing guidelines complete

See `GITHUB_PREPARATION_REPORT.md` for full details.

## Package Structure

```
packages/
├── spreader-tool/          # Spreader package
│   ├── src/               # Source code
│   ├── dist/              # Compiled JS (generated)
│   ├── examples/          # Example configurations
│   ├── docs/              # Documentation
│   ├── tests/             # Test files
│   ├── .github/           # GitHub templates & workflows
│   ├── README.md          # Main documentation
│   ├── package.json       # Package metadata
│   └── ...                # Other files
│
├── cascade-router/        # Cascade Router package
│   ├── src/               # Source code
│   ├── dist/              # Compiled JS (generated)
│   ├── examples/          # Example configurations
│   ├── docs/              # Documentation
│   ├── tests/             # Test files
│   ├── .github/           # GitHub templates & workflows
│   ├── README.md          # Main documentation
│   ├── package.json       # Package metadata
│   └── ...                # Other files
│
├── scripts/               # Utility scripts
│   └── push-to-github.sh  # Automated push script
│
├── GITHUB_PREPARATION_REPORT.md  # Full preparation report
└── README.md                      # This file
```

## Post-Release Steps

After pushing to GitHub:

1. **Create Releases** (v1.0.0)
   - Go to Releases → Draft new release
   - Tag: `v1.0.0`
   - Copy content from RELEASE_NOTES.md
   - Publish release

2. **Configure npm Publishing**
   - Create npm automation token
   - Add to repository secrets: `NPM_TOKEN`
   - Publish via GitHub Actions or manually

3. **Enable GitHub Actions**
   - CI should auto-enable
   - Verify workflows run successfully
   - Fix any issues

4. **Announce**
   - Share on social media
   - Post in relevant communities
   - Write blog post

## Documentation

- **Full Report**: See `GITHUB_PREPARATION_REPORT.md`
- **Spreader Docs**: See `spreader-tool/docs/`
- **Cascade Docs**: See `cascade-router/docs/`
- **Examples**: See `spreader-tool/examples/` and `cascade-router/examples/`

## Support

For questions or issues:
- GitHub Issues: https://github.com/SuperInstance/Spreader-tool/issues
- Email: support@superinstance.github.io

## License

Both packages are released under the MIT License.

---

**Status**: ✅ READY FOR GITHUB RELEASE

**Date**: January 7, 2026
