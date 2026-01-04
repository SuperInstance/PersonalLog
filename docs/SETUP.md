# PersonalLog Setup Guide

Complete guide to setting up and configuring PersonalLog.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation](#installation)
3. [Initial Configuration](#initial-configuration)
4. [AI Provider Setup](#ai-provider-setup)
5. [Creating AI Contacts](#creating-ai-contacts)
6. [Knowledge Base Setup](#knowledge-base-setup)
7. [Optional Configurations](#optional-configurations)
8. [Verification](#verification)
9. [Next Steps](#next-steps)

---

## System Requirements

### Minimum Requirements

- **Browser**: Chrome 57+, Firefox 52+, Safari 11+, Edge 16+
- **RAM**: 2GB
- **Storage**: 100MB available
- **Network**: Required for AI features (optional for other features)

### Recommended Requirements

- **Browser**: Latest Chrome/Firefox/Safari/Edge
- **RAM**: 4GB+
- **Storage**: 500MB+ available
- **Network**: Stable internet connection

### Development Requirements

- **Node.js**: 18.0.0 or higher
- **pnpm**: 8.0.0 or higher (or npm/yarn)
- **Rust**: stable toolchain (for WASM development, optional)
- **Git**: for version control

---

## Installation

### Option 1: Use Hosted Version (Easiest)

1. Visit the deployed PersonalLog URL
2. Bookmark the page
3. Proceed to [Initial Configuration](#initial-configuration)

### Option 2: Self-Host Development

```bash
# 1. Clone repository
git clone https://github.com/SuperInstance/PersonalLog.git
cd PersonalLog

# 2. Install dependencies
pnpm install

# 3. Create environment file
cp .env.example .env.local

# 4. Start development server
pnpm dev
```

Visit `http://localhost:3002`

### Option 3: Docker Deployment

```bash
# 1. Build image
docker build -t personallog .

# 2. Run container
docker run -p 3000:3000 personallog
```

Visit `http://localhost:3000`

### Option 4: Production Build

```bash
# 1. Clone and install
git clone https://github.com/SuperInstance/PersonalLog.git
cd PersonalLog
pnpm install

# 2. Build for production
NODE_ENV=production pnpm build

# 3. Start production server
pnpm start
```

Visit `http://localhost:3002`

---

## Initial Configuration

### First Launch Wizard

When you first open PersonalLog, you'll be guided through setup:

#### Step 1: Welcome
- Overview of PersonalLog features
- Introduction to key concepts
- Option to skip wizard

#### Step 2: Configure
- Set display name
- Choose theme (light/dark/system)
- Configure basic preferences

#### Step 3: AI Providers
- Add at least one AI provider
- Enter API keys
- Test connection
- Choose default models

#### Step 4: AI Contacts
- Create your first AI contact
- Choose personality
- Select model
- Save contact

#### Step 5: Complete
- Review configuration
- Start using PersonalLog!

### Manual Configuration

If you skip the wizard, you can configure later:

**Settings → Appearance**
- Theme
- Font size
- Message density

**Settings → AI Providers**
- Add providers
- Configure models

**Setup → Contacts**
- Create AI contacts
- Customize personalities

---

## AI Provider Setup

### OpenAI

**Get API Key:**
1. Visit platform.openai.com
2. Sign up or log in
3. Navigate to API keys
4. Create new key
5. Copy key

**Configure in PersonalLog:**
1. Go to Settings → Appearance → AI Providers
2. Click "Add Provider"
3. Select "OpenAI"
4. Enter API key
5. Choose models:
   - GPT-4 (recommended)
   - GPT-3.5-Turbo (faster, cheaper)
6. Test connection
7. Save

**Pricing (as of 2026):**
- GPT-4: ~$0.03/1K tokens (input), $0.06/1K tokens (output)
- GPT-3.5-Turbo: ~$0.0015/1K tokens (input), $0.002/1K tokens (output)

### Anthropic (Claude)

**Get API Key:**
1. Visit console.anthropic.com
2. Sign up or log in
3. Navigate to API keys
4. Create new key
5. Copy key

**Configure in PersonalLog:**
1. Go to Settings → Appearance → AI Providers
2. Click "Add Provider"
3. Select "Anthropic"
4. Enter API key
5. Choose models:
   - Claude 3 Opus (most capable)
   - Claude 3 Sonnet (balanced)
   - Claude 3 Haiku (fastest)
6. Test connection
7. Save

**Pricing (as of 2026):**
- Opus: ~$0.015/1K tokens (input), $0.075/1K tokens (output)
- Sonnet: ~$0.003/1K tokens (input), $0.015/1K tokens (output)
- Haiku: ~$0.00025/1K tokens (input), $0.00125/1K tokens (output)

### Google (Gemini)

**Get API Key:**
1. Visit makersuite.google.com
2. Sign up or log in
3. Navigate to API keys
4. Create new key
5. Copy key

**Configure in PersonalLog:**
1. Go to Settings → Appearance → AI Providers
2. Click "Add Provider"
3. Select "Google"
4. Enter API key
5. Choose models:
   - Gemini Pro
   - Gemini Ultra (if available)
6. Test connection
7. Save

### Multiple Providers

You can configure multiple providers:
1. Add each provider following steps above
2. Assign different AI Contacts to different providers
3. Switch between providers based on task
4. Compare responses across providers

**Benefits:**
- Redundancy if one fails
- Different strengths for different tasks
- Cost optimization (use cheaper for simple tasks)
- Feature access (some features provider-specific)

---

## Creating AI Contacts

### Basic Contact

1. Navigate to **Setup** → **Contacts**
2. Click **Create Contact**
3. Fill in:
   - **Name**: "My Assistant"
   - **Role**: "General Assistant"
   - **Model**: Select from configured providers
4. Click **Save**

### Custom Personality

**Personality Options:**
- **Tone**: Formal, Casual, Professional, Friendly
- **Style**: Concise, Detailed, Creative, Analytical
- **Behavior**: Helpful, Critical, Encouraging, Neutral
- **Expertise**: General, Technical, Creative, Scientific

**Example: Research Assistant**
- Name: "Research Buddy"
- Role: "Research Assistant"
- Personality:
  - Tone: Professional
  - Style: Detailed
  - Behavior: Helpful, Thorough
  - Expertise: Academic, Technical
- Model: Claude 3 Opus

### Multiple Contacts

Create different contacts for different purposes:
- **Work Assistant**: Professional, task-focused
- **Creative Partner**: Imaginative, brainstorming
- **Code Helper**: Technical, precise
- **Learning Coach**: Encouraging, explanatory

**Benefits:**
- Specialized assistance
- Context preservation
- Task-appropriate responses
- Personalized experience

---

## Knowledge Base Setup

### First Entry

1. Navigate to **Knowledge**
2. Click **Add Entry**
3. Enter:
   - **Title**: "Welcome to My Knowledge Base"
   - **Content**: Any information you want to store
   - **Tags**: "general", "getting-started"
4. Click **Save**

### Import Existing Notes

**From Markdown:**
1. Navigate to **Knowledge** → **Import**
2. Select "Markdown Files"
3. Choose files to import
4. Map fields if needed
5. Click **Import**

**From JSON/CSV:**
1. Navigate to **Knowledge** → **Import**
2. Select format
3. Upload file
4. Map fields
5. Import

### Organize with Tags

**Tag Strategy:**
- By topic: "programming", "cooking", "ideas"
- By project: "project-website", "project-book"
- By status: "active", "archived", "reference"
- By source: "from-chat", "manual-entry", "imported"

**Best Practices:**
- Use consistent tag names
- Limit to 3-5 tags per entry
- Create tag hierarchies with slashes: "work/project-1"

### Create Collections

1. Navigate to **Knowledge**
2. Click **Collections** tab
3. Click **New Collection**
4. Name: "Work Projects"
5. Add entries to collection
6. Save

**Use Collections For:**
- Project-specific knowledge
- Research on topics
- Frequently accessed information
- Organized workflows

---

## Optional Configurations

### Backup Setup

**Enable Automatic Backups:**
1. Navigate to **Settings** → **Backup**
2. Toggle **Automatic Backups**
3. Choose frequency (daily, weekly)
4. Choose retention (keep last N backups)
5. Click **Save**

**Manual Backup:**
1. Navigate to **Settings** → **Backup**
2. Click **Create Backup**
3. Download backup file
4. Store in safe location

### Appearance Customization

**Theme:**
1. Navigate to **Settings** → **Appearance**
2. Choose theme:
   - System (follows OS)
   - Light
   - Dark
3. Adjust if needed:
   - Font size (small, medium, large)
   - Message density (compact, comfortable, spacious)
   - Sidebar width

### Performance Tuning

**Automatic Optimization:**
1. Navigate to **Settings** → **Optimization**
2. Toggle **Auto-Optimization**
3. PersonalLog will adjust based on your device

**Manual Overrides:**
1. Navigate to **Settings** → **Optimization**
2. Adjust specific settings:
   - Animation quality
   - Image quality
   - Feature enablement
3. Click **Save**

### Analytics & Experiments

**Enable Analytics:**
1. Navigate to **Settings** → **Features**
2. Toggle **Analytics**
3. Choose what to track:
   - Page views
   - Feature usage
   - Performance metrics

**Participate in Experiments:**
1. Navigate to **Settings** → **Experiments**
2. Toggle **Participate in Experiments**
3. Get early access to new features
4. Help improve PersonalLog

---

## Verification

### Test AI Features

1. Go to **Messenger**
2. Click your AI contact
3. Send a test message: "Hello!"
4. Should receive a response

**If not working:**
- Check API key is valid
- Verify provider is enabled
- Check internet connection
- See [Troubleshooting](./TROUBLESHOOTING.md)

### Test Knowledge Search

1. Go to **Knowledge**
2. Create a test entry with unique content
3. Wait a moment for indexing
4. Search for content from the entry
5. Should appear in results

### Test Backup

1. Navigate to **Settings** → **Backup**
2. Click **Create Backup**
3. Download backup file
4. Verify file exists

### Check System Status

1. Navigate to **Settings** → **System**
2. Review:
   - Hardware information
   - Performance score
   - Storage usage
   - Feature support

---

## Next Steps

### Learn the Basics

- Read [User Guide](./USER_GUIDE.md)
- Explore all features
- Try different AI contacts
- Build your knowledge base

### Advanced Features

- Create custom AI personalities
- Set up knowledge workflows
- Install plugins (when available)
- Configure sync (when available)

### Stay Updated

- Star the GitHub repo
- Watch for releases
- Join community discussions
- Provide feedback

### Get Help

- [FAQ](./FAQ.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [GitHub Issues](https://github.com/SuperInstance/PersonalLog/issues)
- [GitHub Discussions](https://github.com/SuperInstance/PersonalLog/discussions)

---

## Troubleshooting Setup Issues

### Installation Fails

**If `pnpm install` fails:**
```bash
# Try with npm instead
npm install

# Or clear cache and retry
pnpm store prune
pnpm install
```

### Dev Server Won't Start

**If `pnpm dev` fails:**
1. Check if port 3002 is available
2. Try different port: `pnpm dev -- -p 3003`
3. Clear `.next` folder: `rm -rf .next`
4. Reinstall dependencies

### API Key Not Working

**If AI provider connection fails:**
1. Verify API key is correct
2. Check key has necessary permissions
3. Verify billing is set up (if required)
4. Try regenerating API key
5. Check provider status page

### Build Errors

**If `pnpm build` fails:**
1. Check Node.js version: `node --version` (should be 18+)
2. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules
   pnpm install
   ```
3. Check TypeScript errors: `pnpm type-check`
4. Check linting: `pnpm lint`

---

Congratulations! You're now set up and ready to use PersonalLog. Enjoy your AI-powered personal knowledge assistant!

---

*Last Updated: 2026-01-03*
