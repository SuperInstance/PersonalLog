# PersonalLog Developer Guide - Volume 1: Getting Started

**Version:** 1.0.0
**Last Updated:** 2025-01-04

---

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Development Environment Setup](#development-environment-setup)
4. [Project Structure](#project-structure)
5. [Core Technologies](#core-technologies)
6. [Building the Project](#building-the-project)
7. [Running Development Server](#running-development-server)
8. [Testing](#testing)
9. [Debugging](#debugging)
10. [Next Steps](#next-steps)

---

## Introduction

Welcome to the PersonalLog Developer Guide! This comprehensive multi-volume guide covers everything you need to know to develop, extend, and contribute to PersonalLog.

### What is PersonalLog?

PersonalLog is an **AI-powered personal knowledge and communication hub** built with modern web technologies. It combines:

- **Messenger-style AI conversations** with multiple providers
- **Intelligent knowledge management** with semantic search
- **Local-first architecture** for privacy and offline operation
- **WebAssembly acceleration** for performance
- **Plugin system** for extensibility
- **Advanced features** like sync, backup, collaboration, and multi-modal AI

### Target Audience

This guide is for:
- **Contributors** who want to improve PersonalLog
- **Developers** building plugins or extensions
- **Researchers** studying the codebase
- **DevOps engineers** deploying PersonalLog

### Guide Structure

This guide is organized into multiple volumes:

- **Volume 1:** Getting Started (this volume)
- **Volume 2:** Architecture Deep Dive
- **Volume 3:** Core Systems
- **Volume 4:** Plugin Development
- **Volume 5:** Testing & Quality Assurance
- **Volume 6:** Performance Optimization
- **Volume 7:** Deployment & Operations
- **Volume 8:** Contributing Guidelines

---

## Prerequisites

Before setting up your development environment, ensure you have:

### Required Software

| Software | Minimum Version | Recommended | Purpose |
|----------|----------------|-------------|---------|
| **Node.js** | 18.0.0 | 20.x LTS | JavaScript runtime |
| **pnpm** | 8.0.0 | 9.x | Package manager (fastest, most efficient) |
| **Git** | 2.30 | Latest | Version control |
| **VS Code** | 1.80 | Latest | Recommended IDE |
| **TypeScript** | 5.0 | Latest (auto-installed) | Type system |

### Optional but Recommended

| Software | Purpose |
|----------|---------|
| **Rust** | Native module development (1.70+) |
| **WASI SDK** | WebAssembly compilation |
| **Docker** | Containerized testing |
| **Chrome DevTools** | Browser debugging |
| **Postman** | API testing |

### System Requirements

**Minimum:**
- CPU: Dual-core 2.0 GHz
- RAM: 4 GB
- Storage: 2 GB free space
- OS: Windows 10+, macOS 12+, or Linux (Ubuntu 20.04+)

**Recommended:**
- CPU: Quad-core 3.0 GHz
- RAM: 16 GB
- Storage: 10 GB SSD
- OS: Windows 11, macOS 13+, or Linux (Ubuntu 22.04+)

### Knowledge Prerequisites

You should be familiar with:

- **JavaScript/TypeScript** - Intermediate level
- **React** - Components, hooks, state management
- **Next.js** - App Router, Server Components
- **IndexedDB** - Browser storage
- **Git** - Version control workflows
- **Command Line** - Terminal operations

**Helpful but not required:**
- WebAssembly
- Rust
- Vector databases
- Machine learning concepts

---

## Development Environment Setup

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/SuperInstance/PersonalLog.git

# Navigate into the project
cd PersonalLog

# Verify the branch
git branch
```

### Step 2: Install Dependencies

**Using pnpm (Recommended):**

```bash
# Install pnpm globally if not already installed
npm install -g pnpm

# Install project dependencies
pnpm install
```

**Using npm:**

```bash
npm install
```

**Using yarn:**

```bash
yarn install
```

**What gets installed:**

- **React 19** - UI library
- **Next.js 15.5** - React framework
- **TypeScript 5** - Type system
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **And 200+ other dependencies**

### Step 3: Environment Configuration

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

**Edit `.env.local` and configure:**

```env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3002
NODE_ENV=development

# AI Providers (Optional for development)
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
GOOGLE_API_KEY=your-key-here

# Feature Flags
NEXT_PUBLIC_ENABLE_WASM=true
NEXT_PUBLIC_ENABLE_NATIVE=true

# Development
NEXT_PUBLIC_DEV_MODE=true
```

**⚠️ IMPORTANT:** Never commit `.env.local` to Git! It contains sensitive API keys.

### Step 4: Verify Installation

```bash
# Check Node version
node --version  # Should be 18.0.0 or higher

# Check pnpm version
pnpm --version  # Should be 8.0.0 or higher

# Verify TypeScript
pnpm type-check  # Should report no errors

# Verify build
pnpm build  # Should complete successfully
```

### Step 5: IDE Setup (VS Code)

**Recommended Extensions:**

Install these VS Code extensions for the best development experience:

```bash
# Install from command line
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension pkief.material-icon-theme
code --install-extension ms-playwright.playwright
```

**Configure VS Code Settings:**

Create `.vscode/settings.json`:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## Project Structure

Understanding the project structure is essential for effective development.

### Top-Level Structure

```
PersonalLog/
├── .agents/              # Autonomous agent orchestration docs
├── .github/              # GitHub templates and workflows
├── docs/                 # Documentation (31+ files)
├── public/               # Static assets
├── scripts/              # Build and utility scripts
├── src/                  # Source code (main directory)
├── tests/                # Test files
├── .env.example          # Environment template
├── .eslintrc.json        # ESLint configuration
├── .gitignore            # Git ignore rules
├── next.config.ts        # Next.js configuration
├── package.json          # Project metadata
├── pnpm-lock.yaml        # Dependency lock file
├── tsconfig.json         # TypeScript configuration
├── vitest.config.ts      # Vitest configuration
└── playwright.config.ts  # Playwright configuration
```

### Source Code Structure (`src/`)

```
src/
├── app/                      # Next.js App Router pages
│   ├── (messenger)/          # Messenger route group
│   │   ├── conversation/     # Conversation pages
│   │   ├── forum/            # Forum page
│   │   ├── knowledge/        # Knowledge browser
│   │   ├── page.tsx          # Main messenger page
│   │   └── layout.tsx        # Messenger layout
│   ├── (settings)/           # Settings route group
│   │   └── settings/         # Settings pages
│   ├── api/                  # API routes
│   │   ├── chat/             # Chat endpoint
│   │   ├── conversations/    # Conversations endpoints
│   │   ├── knowledge/        # Knowledge endpoints
│   │   ├── models/           # Models endpoint
│   │   └── modules/          # Native modules endpoints
│   ├── debug/                # Debug page
│   ├── setup/                # Setup flow
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page
│
├── components/               # React components
│   ├── messenger/            # Messenger components
│   ├── knowledge/            # Knowledge components
│   ├── settings/             # Settings components
│   ├── ui/                   # Reusable UI components
│   ├── providers/            # Context providers
│   └── ...                   # Other component categories
│
├── lib/                      # Core libraries and utilities
│   ├── ai/                   # AI provider integrations
│   ├── analytics/            # Analytics system
│   ├── backup/               # Backup system
│   ├── collaboration/        # Collaboration features
│   ├── data/                 # Data management
│   ├── errors/               # Error handling
│   ├── experiments/          # A/B testing
│   ├── export/               # Data export
│   ├── extensions/           # Extension system
│   ├── hardware/             # Hardware detection
│   ├── import/               # Data import
│   ├── intelligence/         # Intelligence hub
│   ├── knowledge/            # Knowledge system
│   ├── multimedia/           # Multi-modal AI
│   ├── native/               # Native module bridge
│   ├── optimization/         # Auto-optimization
│   ├── personalization/      # Personalization engine
│   ├── plugin/               # Plugin system
│   ├── storage/              # IndexedDB storage
│   ├── sync/                 # Sync system
│   ├── theme/                # Theme system
│   └── ...                   # Other utilities
│
├── hooks/                    # React hooks
│   ├── useAIProvider.ts      # AI provider hook
│   ├── useConversation.ts    # Conversation hook
│   ├── useKnowledge.ts       # Knowledge hook
│   └── ...                   # Other hooks
│
├── types/                    # TypeScript type definitions
│   ├── ai.ts                 # AI types
│   ├── conversation.ts       # Conversation types
│   ├── knowledge.ts          # Knowledge types
│   └── ...                   # Other types
│
└── utils/                    # Utility functions
    ├── format.ts             # Formatting utilities
    ├── validation.ts         # Validation utilities
    └── ...                   # Other utilities
```

### Key Directories Explained

#### `/src/app/` - Next.js App Router

Contains all pages and API routes using Next.js 13+ App Router.

**Route Groups:**
- `(messenger)` - Main application interface
- `(settings)` - Settings and configuration
- No prefix - Public pages (setup, debug, etc.)

#### `/src/components/` - React Components

All UI components organized by feature:

- **messenger/** - Chat interface components
- **knowledge/** - Knowledge browser components
- **ui/** - Reusable UI components (Button, Modal, etc.)
- **providers/** - React Context providers

#### `/src/lib/` - Core Libraries

Business logic and utilities:

- **ai/** - AI provider integrations (OpenAI, Anthropic, etc.)
- **storage/** - IndexedDB storage layer
- **knowledge/** - Vector database and semantic search
- **plugin/** - Plugin system and SDK
- **theme/** - Theme management
- **sync/** - Multi-device sync
- And 20+ other systems

#### `/src/hooks/` - Custom React Hooks

Reusable React hooks for state management and side effects.

#### `/src/types/` - TypeScript Definitions

Shared type definitions used across the application.

---

## Core Technologies

PersonalLog is built with modern web technologies optimized for performance and developer experience.

### 1. Next.js 15.5

**Why Next.js?**
- **App Router** - Latest routing with React Server Components
- **File-based routing** - Intuitive URL structure
- **API routes** - Built-in backend endpoints
- **Optimization** - Automatic code splitting and optimization
- **Great DX** - Fast refresh, TypeScript support

**Key Features Used:**
- Server Components for performance
- Streaming responses for AI chat
- Static generation where possible
- API routes for backend logic

**Resources:**
- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)

### 2. React 19

**Why React?**
- **Component-based** - Reusable UI building blocks
- **Hooks** - Powerful state management
- **Huge ecosystem** - Libraries and tools
- **Performance** - Concurrent rendering, automatic batching

**Key Hooks Used:**
- `useState` - Local state
- `useEffect` - Side effects
- `useCallback` - Memoized callbacks
- `useMemo` - Memoized values
- `useContext` - Context consumption
- Custom hooks - Domain-specific logic

**Resources:**
- [React Documentation](https://react.dev)
- [Hooks Reference](https://react.dev/reference/react)

### 3. TypeScript 5

**Why TypeScript?**
- **Type safety** - Catch errors at compile time
- **Better DX** - IntelliSense, refactoring
- **Documentation** - Types as documentation
- **Scalability** - Easier to maintain large codebases

**Configuration:**

```json
{
  "compilerOptions": {
    "strict": true,              // Enable all strict options
    "noUnusedLocals": true,      // Error on unused locals
    "noUnusedParameters": true,  // Error on unused params
    "noImplicitReturns": true,   // Error on missing returns
    "forceConsistentCasingInFileNames": true
  }
}
```

**Resources:**
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### 4. Tailwind CSS

**Why Tailwind?**
- **Utility-first** - Rapid UI development
- **Consistent design** - Design system built-in
- **Dark mode** - Easy theme switching
- **Small bundle** - Only used styles included

**Configuration:**

```javascript
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '...',
        secondary: '...',
      }
    }
  }
}
```

**Resources:**
- [Tailwind Documentation](https://tailwindcss.com/docs)
- [Tailwind UI](https://tailwindui.com/)

### 5. Zustand

**Why Zustand?**
- **Simple** - Easy to learn and use
- **Lightweight** - Small bundle size
- **No boilerplate** - Less code than Redux
- **TypeScript support** - Excellent type inference

**Example Store:**

```typescript
import { create } from 'zustand'

type ConversationStore = {
  conversations: Conversation[]
  activeConversation: string | null
  setActiveConversation: (id: string) => void
}

export const useConversationStore = create<ConversationStore>((set) => ({
  conversations: [],
  activeConversation: null,
  setActiveConversation: (id) => set({ activeConversation: id })
}))
```

**Resources:**
- [Zustand Documentation](https://github.com/pmndrs/zustand)

### 6. IndexedDB

**Why IndexedDB?**
- **Local storage** - No server required
- **Large capacity** - Hundreds of MB to GB
- **Async API** - Non-blocking operations
- **Offline-first** - Works without internet

**Wrapper Used:**

PersonalLog uses a custom IndexedDB wrapper in `/src/lib/storage/`.

**Resources:**
- [IndexedDB Guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

### 7. WebAssembly (Optional)

**Why WebAssembly?**
- **Performance** - Near-native speed
- **Vector operations** - 3-4x faster than JavaScript
- **Portable** - Run on any platform

**Used For:**
- Vector dot product operations
- L2 norm calculations
- Cosine similarity

**Resources:**
- [WebAssembly Guide](https://webassembly.org/)

---

## Building the Project

### Development Build

```bash
# Start development server
pnpm dev

# Output:
# > next dev -p 3002
# - ready started server on 0.0.0.0:3002, url: http://localhost:3002
```

The development server:
- Runs on port 3002
- Supports hot reload
- Shows error overlays
- Enables fast refresh

### Production Build

```bash
# Build for production
pnpm build

# Output:
# ▲ Next.js 15.5.9
# Creating an optimized production build ...
# ✓ Compiled successfully
# Route (app)                              Size
# ├ ○ /                                   731 B
# └ ... (28 routes)
```

The production build:
- Minifies JavaScript
- Optimizes images
- Generates static pages
- Creates server bundle

### Build Output

Build artifacts are in `.next/`:

```
.next/
├── server/               # Server-side code
├── static/               # Static assets
├── cache/                # Build cache
└── types/                # TypeScript types
```

### Build Options

```bash
# Clean build (remove .next first)
rm -rf .next && pnpm build

# Build with analysis
ANALYZE=true pnpm build

# Build without telemetry
NEXT_TELEMETRY_DISABLED=1 pnpm build
```

---

## Running Development Server

### Start Dev Server

```bash
pnpm dev
```

**Access:** http://localhost:3002

### Development Features

- **Hot Module Replacement (HMR)** - Changes appear instantly
- **Fast Refresh** - Component state preserved
- **Error Overlay** - In-browser error display
- **Type Checking** - Real-time type errors

### Useful Scripts

```bash
# Run on custom port
PORT=4000 pnpm dev

# Enable turbo mode (faster)
pnpm dev --turbo

# Run with debug logging
DEBUG=* pnpm dev
```

### Common Issues

**Port already in use:**
```bash
# Kill process on port 3002
npx kill-port 3002

# Or use different port
PORT=4000 pnpm dev
```

**Module not found:**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
pnpm install
```

---

## Testing

### Test Frameworks

PersonalLog uses multiple testing frameworks:

| Framework | Purpose | Config |
|-----------|---------|--------|
| **Vitest** | Unit tests | `vitest.config.ts` |
| **Playwright** | E2E tests | `playwright.config.ts` |
| **React Testing Library** | Component tests | Included with Vitest |

### Running Tests

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# E2E tests only
pnpm test:e2e

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Writing Tests

**Unit Test Example:**

```typescript
import { describe, it, expect } from 'vitest'
import { add } from './math'

describe('Math utilities', () => {
  it('should add two numbers', () => {
    expect(add(1, 2)).toBe(3)
  })
})
```

**Component Test Example:**

```typescript
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

**E2E Test Example:**

```typescript
import { test, expect } from '@playwright/test'

test('user can create conversation', async ({ page }) => {
  await page.goto('http://localhost:3002')
  await page.click('[data-testid="new-conversation"]')
  await expect(page.locator('input')).toBeVisible()
})
```

### Test Coverage

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html
```

**Target Coverage:**
- Statements: >80%
- Branches: >75%
- Functions: >80%
- Lines: >80%

---

## Debugging

### Chrome DevTools

**Opening DevTools:**
- Press `F12` or `Cmd+Option+I` (Mac)
- Right-click → Inspect
- `Ctrl+Shift+I` (Windows/Linux)

**Useful Tabs:**
- **Elements** - Inspect DOM and styles
- **Console** - View logs and errors
- **Network** - Monitor API calls
- **Application** - View IndexedDB, localStorage
- **Performance** - Profile performance
- **React DevTools** - Inspect React components

### VS Code Debugger

**Configuration (.vscode/launch.json):**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "pnpm dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3002"
    }
  ]
}
```

**Breakpoints:**
- Click in the gutter to set breakpoint
- Press `F5` to start debugging
- Use debug toolbar to step through code

### Console Debugging

**Logging:**

```typescript
// Basic logging
console.log('Variable:', variable)

// Grouped logging
console.group('User data')
console.log('Name:', user.name)
console.log('Age:', user.age)
console.groupEnd()

// Table logging
console.table(arrayOfObjects)

// Error logging
console.error('Error:', error)

// Warning logging
console.warn('Warning:', warning)
```

**Conditional Logging:**

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data)
}
```

### React DevTools

**Installation:**
- Chrome: [React DevTools Extension](https://chrome.google.com/webstore)
- Firefox: [React DevTools Extension](https://addons.mozilla.org/en-US/firefox/)

**Features:**
- **Components** - Inspect React component tree
- **Profiler** - Measure component performance
- **Props & State** - View component data

### Source Maps

Source maps are enabled in development, allowing you to debug TypeScript source files directly in the browser.

**In next.config.ts:**

```typescript
module.exports = {
  productionBrowserSourceMaps: true, // Enable for production
}
```

---

## Next Steps

You've completed Volume 1: Getting Started! You now have:

✅ Development environment set up
✅ Project structure understood
✅ Core technologies learned
✅ Build process mastered
✅ Development server running
✅ Tests configured
✅ Debugging tools ready

**Continue to Volume 2: Architecture Deep Dive**

In Volume 2, you'll learn:
- System architecture overview
- Data flow and state management
- Component architecture
- Storage layer design
- AI integration architecture
- Security and privacy model

**Or jump to:**
- [Volume 3: Core Systems](./DEVELOPER_GUIDE_VOL3.md) - Core functionality deep dive
- [Volume 4: Plugin Development](./DEVELOPER_GUIDE_VOL4.md) - Building plugins
- [Volume 5: Testing & QA](./DEVELOPER_GUIDE_VOL5.md) - Quality assurance

---

## Additional Resources

### Official Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Tailwind CSS](https://tailwindcss.com/docs)

### PersonalLog Documentation

- [Architecture](./ARCHITECTURE.md) - System architecture
- [API Reference](./API_REFERENCE.md) - API endpoints
- [Testing Guide](./TESTING.md) - Testing methodology
- [Contributing Guide](../CONTRIBUTING.md) - Contribution workflow

### Community

- [GitHub Issues](https://github.com/SuperInstance/PersonalLog/issues)
- [GitHub Discussions](https://github.com/SuperInstance/PersonalLog/discussions)
- [Contributing Guide](../CONTRIBUTING.md)

---

**Volume 1 Complete!** 🎉

*Continue to [Volume 2: Architecture Deep Dive](./DEVELOPER_GUIDE_VOL2.md)*
