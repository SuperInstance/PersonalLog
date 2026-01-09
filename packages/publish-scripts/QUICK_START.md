# Quick Start: Publishing Phase 1 Packages

**5-Minute Guide to Publishing Phase 1 Packages to npm**

## Prerequisites (2 minutes)

1. **Create npm account**
   - Go to https://npmjs.com/signup
   - Verify your email

2. **Login to npm**
   ```bash
   npm login
   # Enter username, password, and email
   # Verify with 2FA if enabled
   ```

3. **Verify login**
   ```bash
   npm whoami
   # Should show your username
   ```

## Quick Workflow (3 minutes)

### Step 1: Check Readiness (30 seconds)

```bash
cd /mnt/c/users/casey/personallog/packages/publish-scripts

# Run dry-run to verify everything is ready
./dry-run.sh
```

**Expected output:** All checks pass ✅

### Step 2: Publish (1 minute)

```bash
# Publish all packages to npm
./publish-all.sh --publish
```

**What happens:**
- Builds each package
- Runs tests
- Publishes to npm
- Creates git tags
- Pushes tags to GitHub

### Step 3: Verify (30 seconds)

```bash
# Verify packages are on npm
./verify.sh
```

**Expected output:** All packages verified ✅

### Step 4: Create GitHub Releases (1 minute)

```bash
# Create tags and GitHub releases
./tag-release.sh
```

**What happens:**
- Creates git tags
- Pushes to GitHub
- Creates GitHub releases with notes

## That's It! 🎉

Your packages are now published:

- **@superinstance/webgpu-profiler** on npm
- **@superinstance/vector-search** on npm
- **@superinstance/jepa-sentiment** on npm

## Verify Installation

Test that packages install correctly:

```bash
# Create test directory
mkdir /tmp/test-packages
cd /tmp/test-packages
npm init -y

# Install each package
npm install @superinstance/webgpu-profiler
npm install @superinstance/vector-search
npm install @superinstance/jepa-sentiment

# Verify they work
ls node_modules/@superinstance/
```

## What to Do If Something Fails

### dry-run fails

```bash
# Check specific package
./dry-run.sh browser-gpu-profiler

# Fix issues in package directory
cd /mnt/c/users/casey/personallog/packages/browser-gpu-profiler

# Common fixes:
npm run build        # If build fails
npm test            # If tests fail
npm run type-check  # If TypeScript errors
npm run lint        # If lint errors
```

### publish fails

```bash
# Check npm login
npm whoami

# Re-login if needed
npm login

# Check package name availability
npm view @superinstance/webgpu-profiler
# Should fail (package doesn't exist yet)
```

### verify fails

```bash
# Wait a few minutes for npm to update
# Then try again
./verify.sh

# Check package on npmjs.com
# https://www.npmjs.com/package/@superinstance/webgpu-profiler
```

## Next Steps

1. **Update documentation**
   - Update README files with installation instructions
   - Add npm badges

2. **Share your packages**
   - Tweet about your packages
   - Post on Reddit (r/javascript, r/typescript)
   - Share in Discord communities

3. **Monitor usage**
   - Check npm download stats
   - Respond to issues and PRs
   - Gather feedback

## Full Documentation

For comprehensive documentation, see:
- **CHECKLIST.md** - Detailed pre-publish checklist
- **README.md** - Complete script documentation

## Need Help?

- npm docs: https://docs.npmjs.com/
- GitHub docs: https://docs.github.com/
- Package README files

---

**Time to publish: ~5 minutes**
**Packages published: 3**
**Status: Ready to ship! 🚀**
