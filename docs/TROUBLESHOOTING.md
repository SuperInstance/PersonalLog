# PersonalLog Troubleshooting Guide

Solutions to common issues and problems with PersonalLog.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [AI & Chat Problems](#ai--chat-problems)
3. [Knowledge Base Issues](#knowledge-base-issues)
4. [Performance Problems](#performance-problems)
5. [Storage & Data Issues](#storage--data-issues)
6. [Browser-Specific Issues](#browser-specific-issues)
7. [Development Issues](#development-issues)
8. [Error Messages](#error-messages)
9. [Getting Help](#getting-help)

---

## Installation Issues

### pnpm install fails

**Symptoms:**
- Errors during dependency installation
- Missing packages
- Version conflicts

**Solutions:**

1. **Update pnpm:**
   ```bash
   npm install -g pnpm@latest
   ```

2. **Clear pnpm store:**
   ```bash
   pnpm store prune
   pnpm install
   ```

3. **Try with npm:**
   ```bash
   npm install
   ```

4. **Node version too old:**
   ```bash
   # Check version
   node --version  # Should be 18+

   # Update if needed
   # Using nvm:
   nvm install 18
   nvm use 18
   ```

### Dev server won't start

**Symptoms:**
- `pnpm dev` fails
- Port already in use
- Server crashes immediately

**Solutions:**

1. **Port already in use:**
   ```bash
   # Use different port
   pnpm dev -- -p 3003

   # Or kill process on port 3002
   # Linux/Mac:
   lsof -ti:3002 | xargs kill -9

   # Windows:
   netstat -ano | findstr :3002
   taskkill /PID <PID> /F
   ```

2. **Clear build cache:**
   ```bash
   rm -rf .next
   pnpm dev
   ```

3. **Check for syntax errors:**
   ```bash
   pnpm type-check
   pnpm lint
   ```

### Build fails

**Symptoms:**
- `pnpm build` errors
- TypeScript compilation fails
- Webpack errors

**Solutions:**

1. **Fix TypeScript errors:**
   ```bash
   pnpm type-check
   # Fix reported errors, then retry build
   ```

2. **Fix ESLint errors:**
   ```bash
   pnpm lint
   # Fix reported errors, then retry build
   ```

3. **Clean rebuild:**
   ```bash
   rm -rf .next node_modules
   pnpm install
   pnpm build
   ```

4. **Check Node version:**
   ```bash
   node --version  # Must be 18+
   ```

### WASM build fails

**Symptoms:**
- `pnpm build:wasm` errors
- Rust compilation fails
- wasm-pack not found

**Solutions:**

1. **Install Rust:**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Install wasm-pack:**
   ```bash
   cargo install wasm-pack
   ```

3. **Add WASM target:**
   ```bash
   rustup target add wasm32-unknown-unknown
   ```

4. **Build WASM separately:**
   ```bash
   cd native/rust
   wasm-pack build --target web --weak-refs --out-dir pkg
   ```

---

## AI & Chat Problems

### AI not responding

**Symptoms:**
- Messages not sending
- No response from AI
- Loading spinner forever

**Solutions:**

1. **Check API key:**
   - Verify API key is valid
   - Check for typos
   - Regenerate key if needed

2. **Check provider status:**
   - Visit provider status page
   - Check for outages
   - Verify service is operational

3. **Test connection:**
   - Go to Settings → AI Providers
   - Click on provider
   - Click "Test Connection"

4. **Check quota:**
   - Verify you haven't exceeded rate limits
   - Check billing is set up
   - Review usage dashboard

5. **Try different provider:**
   - Add backup provider
   - Switch temporarily
   - Compare results

### Slow AI responses

**Symptoms:**
- Long wait times for responses
- Streaming is slow
- Timeout errors

**Solutions:**

1. **Use faster model:**
   - Switch from GPT-4 to GPT-3.5
   - Use Haiku instead of Opus
   - Use provider's fastest model

2. **Reduce context:**
   - Clear conversation history
   - Remove context files
   - Start new conversation

3. **Check internet:**
   - Test connection speed
   - Try wired connection
   - Disable VPN temporarily

4. **Check provider load:**
   - Try at different time
   - Switch providers
   - Use regional endpoints

### Inappropriate AI responses

**Symptoms:**
- Responses not matching personality
- Tone is wrong
- Content not relevant

**Solutions:**

1. **Adjust AI Contact personality:**
   - Edit contact
   - Refine personality traits
   - Update system prompt
   - Test changes

2. **Check context:**
   - Verify context is relevant
   - Remove confusing context
   - Add clarifying information

3. **Try different model:**
   - Some models better for certain tasks
   - Experiment with different providers
   - Compare responses

4. **Regenerate response:**
   - Click regenerate button
   - May get better response
   - Can adjust settings first

### Context not working

**Symptoms:**
- AI doesn't use provided context
- Context files ignored
- Knowledge entries not referenced

**Solutions:**

1. **Verify context is attached:**
   - Check context panel is visible
   - Verify files are attached
   - Ensure entries are selected

2. **Check context size:**
   - May exceed token limit
   - Reduce context amount
   - Use larger context window model

3. **Check model capabilities:**
   - Some models handle context better
   - Try different model
   - Verify provider supports context

---

## Knowledge Base Issues

### Search not working

**Symptoms:**
- No search results
- Results not relevant
- Search is slow

**Solutions:**

1. **Check for entries:**
   - Verify knowledge base has content
   - Create test entry
   - Wait for indexing

2. **Rebuild index:**
   - Go to Settings → System
   - Click "Rebuild Search Index"
   - Wait for completion

3. **Try different query:**
   - Use broader terms
   - Try natural language
   - Search for exact phrases

4. **Check feature is enabled:**
   - Go to Settings → Features
   - Verify "Advanced Search" is enabled

### Entries not saving

**Symptoms:**
- Save button doesn't work
- Entries disappear
- Changes not persisting

**Solutions:**

1. **Check browser storage:**
   - Verify IndexedDB is enabled
   - Check available storage space
   - Clear browser cache

2. **Check for errors:**
   - Open browser console
   - Look for error messages
   - Report errors if found

3. **Try different browser:**
   - Test in another browser
   - Verify issue is browser-specific
   - Check browser compatibility

4. **Check storage quota:**
   - Go to Settings → System
   - View storage usage
   - Delete old data if needed

### Import fails

**Symptoms:**
- Import errors
- File not recognized
- Data not appearing

**Solutions:**

1. **Check file format:**
   - Verify supported format (JSON, MD, CSV)
   - Check file structure
   - Validate file syntax

2. **Validate JSON:**
   ```bash
   # For JSON files
   cat import.json | jq .

   # Or use online JSON validator
   ```

3. **Map fields correctly:**
   - Review field mapping
   - Ensure required fields present
   - Check data types match

4. **Try smaller batch:**
   - Import fewer entries at once
   - Split large files
   - Import incrementally

---

## Performance Problems

### Application is slow

**Symptoms:**
- Laggy interface
- Slow page loads
- Jerky animations

**Solutions:**

1. **Check performance class:**
   - Go to Settings → System
   - View performance score
   - See optimizations applied

2. **Run benchmarks:**
   - Go to Settings → Benchmarks
   - Run full benchmark suite
   - Follow recommendations

3. **Adjust settings:**
   - Disable animations
   - Reduce image quality
   - Use compact message density
   - Disable heavy features

4. **Clear old data:**
   - Archive old conversations
   - Delete unused knowledge entries
   - Clear analytics data
   - Compact storage

### High memory usage

**Symptoms:**
- Browser using lots of RAM
- Tabs crashing
- System slowdown

**Solutions:**

1. **Restart browser:**
   - Close all tabs
   - Fully quit browser
   - Reopen PersonalLog

2. **Reduce data:**
   - Archive old conversations
   - Limit knowledge base size
   - Clear caches

3. **Check for memory leaks:**
   - Open browser DevTools
   - Monitor memory over time
   - Report if memory grows indefinitely

4. **Use lighter features:**
   - Disable analytics
   - Disable personalization
   - Use simpler models

### Storage quota exceeded

**Symptoms:**
- Can't save new data
- Storage errors
- "Quota exceeded" messages

**Solutions:**

1. **Check usage:**
   - Go to Settings → System
   - View storage breakdown
   - Identify largest items

2. **Free up space:**
   - Delete old conversations
   - Remove large knowledge entries
   - Clear analytics data

3. **Export and delete:**
   - Export data first
   - Delete from app
   - Store export externally

4. **Compact storage:**
   - Go to Settings → System
   - Click "Compact Storage"
   - Wait for completion

---

## Storage & Data Issues

### Data disappeared

**Symptoms:**
- Conversations missing
- Knowledge entries gone
- Settings reset

**Solutions:**

1. **Don't panic!**
   - Data is likely still there
   - Try refreshing page
   - Check different views

2. **Check for filters:**
   - Clear search filters
   - Check archived items
   - View all conversations

3. **Check different browser:**
   - May be browser-specific
   - Try another browser
   - Verify data still exists

4. **Restore from backup:**
   - Go to Settings → Backup
   - Click "Restore"
   - Select backup file
   - Confirm restore

5. **Check browser storage:**
   - Developer Tools → Application → Storage
   - Verify IndexedDB exists
   - Check for data

### Can't export data

**Symptoms:**
- Export fails
- File not downloading
- Incomplete export

**Solutions:**

1. **Check browser permissions:**
   - Allow downloads
   - Allow multiple downloads
   - Check popup blocker

2. **Try different format:**
   - Export as JSON instead of Markdown
   - Try individual exports instead of all data
   - Use browser console for errors

3. **Reduce data size:**
   - Export specific categories
   - Filter by date range
   - Export incrementally

4. **Clear storage first:**
   - May have corrupted data
   - Clear and retry export
   - Use backup if available

### Sync not working

**Symptoms:**
- Changes not syncing
- Conflicts appearing
- Sync errors

**Note:** Sync is planned for future release. If you're testing sync features:

**Solutions:**

1. **Check network:**
   - Verify internet connection
   - Check firewall settings
   - Try different network

2. **Re-authenticate:**
   - Sign out and sign back in
   - Re-enter credentials
   - Verify account is active

3. **Resolve conflicts:**
   - Review conflict dialog
   - Choose which version to keep
   - Or keep both versions

4. **Check server status:**
   - Verify sync service is operational
   - Check for service notifications
   - Try again later

---

## Browser-Specific Issues

### Chrome/Edge

**Flash of unstyled content:**
- Usually harmless
- Clears on first load
- Can't be fully eliminated

**Extension conflicts:**
- Disable extensions temporarily
- Try incognito mode
- Identify conflicting extension

### Firefox

**IndexedDB disabled:**
- Check settings → Privacy & Security
- Verify "Cookies and Site Data" is allowed
- Check for site-specific exceptions

**Strict tracking protection:**
- May break some features
- Add exception for PersonalLog
- Or use standard protection

### Safari

**Storage limits:**
- Safari has stricter limits
- May need to clear old data more often
- Use export for backup

**Cross-site tracking:**
- May block features
- Disable "Prevent Cross-Site Tracking"
- Or add exception

### Mobile Browsers

**Limited space:**
- Mobile browsers have less storage
- Archive old conversations regularly
- Keep knowledge base lean

**Performance:**
- Mobile devices slower
- Use performance optimizations
- Disable animations

---

## Development Issues

### Type errors

**Symptoms:**
- `tsc --noEmit` fails
- Type errors in editor
- Can't build

**Solutions:**

1. **Fix type errors:**
   ```bash
   pnpm type-check
   # Address each error
   ```

2. **Update types:**
   ```bash
   pnpm install --save-dev @types/*
   ```

3. **Use ts-ignore sparingly:**
   ```typescript
   // @ts-ignore - Only when absolutely necessary
   problematicCode();
   ```

### Test failures

**Symptoms:**
- Tests failing
- Can't run tests
- Coverage low

**Solutions:**

1. **Update tests:**
   ```bash
   pnpm test:unit
   # Fix failing tests
   ```

2. **Clear test cache:**
   ```bash
   rm -rf coverage
   pnpm test:coverage
   ```

3. **Update snapshots:**
   ```bash
   pnpm test:unit -u
   ```

### Hot reload not working

**Symptoms:**
- Changes not appearing
- Need to refresh manually
- Slow updates

**Solutions:**

1. **Restart dev server:**
   ```bash
   # Stop server (Ctrl+C)
   pnpm dev
   ```

2. **Clear .next:**
   ```bash
   rm -rf .next
   pnpm dev
   ```

3. **Check for errors:**
   - Look at terminal output
   - Check browser console
   - Fix any errors found

---

## Error Messages

### "Failed to fetch"

**Meaning:** Network request failed

**Solutions:**
- Check internet connection
- Verify API endpoint is correct
- Check for CORS issues
- Try different network

### "Insufficient quota"

**Meaning:** Exceeded API rate limit or usage limit

**Solutions:**
- Check provider dashboard
- Verify billing is set up
- Wait for quota to reset
- Upgrade plan if needed

### "Context window exceeded"

**Meaning:** Too much context for model

**Solutions:**
- Reduce conversation history
- Remove context files
- Use model with larger context
- Start new conversation

### "Storage quota exceeded"

**Meaning:** Browser storage limit reached

**Solutions:**
- Delete old data
- Archive conversations
- Clear analytics
- Compact storage

### "Provider not configured"

**Meaning:** AI provider not set up

**Solutions:**
- Go to Settings → AI Providers
- Add provider
- Enter API key
- Test connection

---

## Getting Help

### Self-Service

1. **Search documentation:**
   - [User Guide](./USER_GUIDE.md)
   - [FAQ](./FAQ.md)
   - [Setup Guide](./SETUP.md)

2. **Search existing issues:**
   - [GitHub Issues](https://github.com/SuperInstance/PersonalLog/issues)
   - Check closed issues too

3. **Check discussions:**
   - [GitHub Discussions](https://github.com/SuperInstance/PersonalLog/discussions)
   - Someone may have solved your problem

### Ask for Help

**When creating an issue:**

1. **Search first** - Don't create duplicate issues

2. **Use template:**
   ```markdown
   ## Description
   Brief description of problem

   ## Steps to Reproduce
   1. Step one
   2. Step two
   3. Step three

   ## Expected Behavior
   What should happen

   ## Actual Behavior
   What actually happens

   ## Environment
   - OS:
   - Browser:
   - PersonalLog version:

   ## Screenshots
   If applicable, add screenshots

   ## Additional Context
   Any other relevant information
   ```

3. **Include diagnostic info:**
   - Go to Settings → Intelligence
   - Click "Run Diagnostics"
   - Export results
   - Attach to issue

### Community Resources

- **Documentation:** `/docs` folder in repo
- **GitHub Issues:** Bug reports and feature requests
- **GitHub Discussions:** Questions and community
- **Discord:** (coming soon)

### Professional Support

Professional support options coming soon for:
- Enterprise deployments
- Custom integrations
- Priority bug fixes
- Feature development

---

Still stuck? Don't hesitate to reach out. The community is here to help!

---

*Last Updated: 2026-01-03*
