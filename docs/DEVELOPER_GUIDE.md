# PersonalLog Developer Guide

Complete guide for developers contributing to or building on PersonalLog.

## Table of Contents

1. [Introduction](#introduction)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Architecture](#architecture)
5. [Core Systems](#core-systems)
6. [Testing](#testing)
7. [Building & Deployment](#building--deployment)
8. [Contributing](#contributing)
9. [Coding Standards](#coding-standards)
10. [Resources](#resources)

---

## Introduction

### Tech Stack

- **Framework**: Next.js 15 (React 19, App Router)
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4
- **State Management**: React hooks + Context API
- **Storage**: IndexedDB (via custom storage layer)
- **AI Integration**: Multi-provider architecture
- **Performance**: WebAssembly (Rust) for vector operations
- **Testing**: Vitest (unit), Playwright (E2E)
- **Build Tool**: Next.js built-in (Turbopack)

### Key Principles

- **Type Safety**: Strict TypeScript, zero type errors
- **Performance**: Optimized rendering, WASM acceleration
- **Accessibility**: WCAG 2.1 AA compliance
- **Privacy**: Local-first, user data protection
- **Extensibility**: Plugin system for customization
- **Testing**: High test coverage (>80%)

---

## Development Setup

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **pnpm**: 8.0.0 or higher (recommended)
- **Rust**: stable toolchain (for WASM module)
- **Git**: for version control

### Initial Setup

```bash
# Clone repository
git clone https://github.com/SuperInstance/PersonalLog.git
cd PersonalLog

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Install Rust toolchain (for WASM)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

### Environment Variables

Create `.env.local`:

```bash
# Application
NODE_ENV=development
PORT=3002

# AI Provider API Keys (optional - for testing)
OPENAI_API_KEY=sk-test...
ANTHROPIC_API_KEY=sk-ant-test...

# Storage
PACKAGES_PATH=../packages
```

### Development Server

```bash
# Start development server (with WASM build)
pnpm dev

# Server runs on http://localhost:3002
```

**Development Features:**
- Hot Module Replacement (HMR)
- Fast Refresh
- TypeScript checking
- ESLint watching
- WASM auto-rebuild

### IDE Setup

**VS Code (Recommended):**

Install extensions:
- ESLint
- Prettier
- TypeScript Vue Plugin (if using Vue)
- Tailwind CSS IntelliSense
- Error Lens (for inline errors)

**Recommended Settings:**
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## Project Structure

```
PersonalLog/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (messenger)/       # Messenger layout group
│   │   ├── (longform)/        # Longform layout group
│   │   ├── api/               # API routes
│   │   ├── chat/              # Chat feature
│   │   ├── knowledge/         # Knowledge feature
│   │   ├── settings/          # Settings pages
│   │   ├── setup/             # Setup wizard
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   │
│   ├── components/            # React components
│   │   ├── ai-contacts/       # AI contact management
│   │   ├── cache/             # Cache management UI
│   │   ├── dashboard/         # Dashboard widgets
│   │   ├── errors/            # Error handling
│   │   ├── experiments/       # A/B testing UI
│   │   ├── knowledge/         # Knowledge browser
│   │   ├── media/             # Media handling
│   │   ├── messenger/         # Messenger components
│   │   ├── personalization/   # Personalization UI
│   │   ├── providers/         # Context providers
│   │   ├── setup/             # Setup wizard
│   │   ├── settings/          # Settings components
│   │   ├── ui/                # Reusable UI components
│   │   └── wizard/            # Wizard components
│   │
│   ├── lib/                   # Core libraries
│   │   ├── ai/                # AI provider integration
│   │   ├── analytics/         # Analytics pipeline
│   │   ├── backup/            # Backup system
│   │   ├── cache/             # Caching layer
│   │   ├── data/              # Data management
│   │   ├── errors/            # Error monitoring
│   │   ├── experiments/       # A/B testing framework
│   │   ├── export/            # Data export
│   │   ├── extensions/        # Plugin system
│   │   ├── flags/             # Feature flags
│   │   ├── hardware/          # Hardware detection
│   │   ├── import/            # Data import
│   │   ├── intelligence/      # Intelligence hub
│   │   ├── knowledge/         # Knowledge management
│   │   ├── native/            # WASM bridge
│   │   ├── optimization/      # Performance optimization
│   │   ├── personalization/   # Preference learning
│   │   ├── plugin/            # Plugin SDK
│   │   ├── storage/           # IndexedDB wrapper
│   │   ├── sync/              # Sync system
│   │   ├── theme/             # Theme management
│   │   ├── vector/            # Vector operations
│   │   └── wizard/            # Wizard framework
│   │
│   ├── types/                 # TypeScript types
│   │   ├── conversation.ts    # Conversation types
│   │   ├── modules.ts         # Module types
│   │   └── ...                # Other types
│   │
│   ├── hooks/                 # React hooks
│   │   ├── useToast.tsx       # Toast notifications
│   │   └── ...                # Other hooks
│   │
│   └── styles/                # Global styles
│       └── globals.css
│
├── tests/                     # Test files
│   ├── unit/                  # Unit tests (Vitest)
│   ├── integration/           # Integration tests
│   ├── e2e/                   # E2E tests (Playwright)
│   ├── a11y/                  # Accessibility tests
│   └── performance/           # Performance tests
│
├── native/                    # Native WASM modules
│   └── rust/                  # Rust source
│       ├── src/
│       │   ├── lib.rs         # WASM entry point
│       │   └── vector.rs      # Vector operations
│       ├── Cargo.toml         # Rust config
│       └── pkg/               # Generated WASM (gitignored)
│
├── docs/                      # Documentation
│   ├── USER_GUIDE.md
│   ├── DEVELOPER_GUIDE.md
│   ├── ARCHITECTURE.md
│   └── ...
│
├── public/                    # Static assets
├── scripts/                   # Build/utility scripts
├── .env.example               # Environment template
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Project metadata
```

---

## Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│  (React Components, Pages, UI Elements)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                    │
│  (Custom Hooks, Context Providers, Services)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                         Data Layer                           │
│  (IndexedDB Storage, API Clients, Cache)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Native Layer                            │
│  (WebAssembly, Browser APIs)                                │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Patterns

**Provider Pattern:**
- Context providers for global state
- Feature-specific providers (Analytics, Experiments, etc.)
- Hierarchical provider composition

**Plugin System:**
- Capability-based permissions
- Extension points for UI, data, AI
- Sandboxed execution environment

**Storage Abstraction:**
- Unified storage API
- Automatic migration between versions
- Backup and sync support

**Feature Flags:**
- Runtime feature enablement
- Performance-based gating
- A/B testing integration

---

## Core Systems

### 1. AI Provider System

**Architecture:**
```
AIProvider Interface
├── OpenAIProvider
├── AnthropicProvider
├── GoogleProvider
├── MistralProvider
└── CustomProvider (user-defined)
```

**Key Files:**
- `/src/lib/ai/`: AI provider implementations
- `/src/lib/ai/providers/`: Individual provider classes
- `/src/types/ai.ts`: AI types and interfaces

**Adding a New Provider:**

```typescript
// src/lib/ai/providers/myprovider.ts
import { AIProvider, ChatRequest, ChatResponse } from '@/types/ai';

export class MyProvider extends AIProvider {
  async chat(request: ChatRequest): Promise<ChatResponse> {
    // Implementation
  }

  async streamChat(
    request: ChatRequest
  ): AsyncIterable<ChatResponse> {
    // Streaming implementation
  }
}
```

**Register Provider:**
```typescript
// src/lib/ai/registry.ts
registerProvider({
  id: 'myprovider',
  name: 'My Provider',
  type: 'cloud',
  factory: (config) => new MyProvider(config),
});
```

### 2. Storage System

**Architecture:**
```
Storage Layer
├── IndexedDB Wrapper
├── Cache Layer
├── Backup System
└── Sync System
```

**Key Files:**
- `/src/lib/storage/`: Storage implementation
- `/src/lib/cache/`: Caching layer
- `/src/lib/backup/`: Backup system

**Usage:**

```typescript
import { storage } from '@/lib/storage';

// Store data
await storage.set('key', { data: 'value' });

// Retrieve data
const value = await storage.get('key');

// Watch for changes
storage.onChange('key', (newValue) => {
  console.log('Changed:', newValue);
});
```

**Collections:**
```typescript
// Conversations
const conversations = storage.collection('conversations');
await conversations.add({ title: 'New Chat' });

// Knowledge
const knowledge = storage.collection('knowledge');
await knowledge.add({ content: 'Entry' });
```

### 3. Knowledge System

**Architecture:**
```
Knowledge System
├── Vector Store (WASM-accelerated)
├── Embedding Generator
├── Search Engine
└── Checkpoint System
```

**Key Files:**
- `/src/lib/knowledge/`: Knowledge management
- `/src/lib/vector/`: Vector operations
- `/src/lib/native/`: WASM bridge

**Adding Knowledge:**

```typescript
import { knowledgeStore } from '@/lib/knowledge';

await knowledgeStore.add({
  title: 'My Entry',
  content: 'Content here',
  tags: ['tag1', 'tag2'],
  metadata: { source: 'manual' },
});
```

**Semantic Search:**

```typescript
const results = await knowledgeStore.search('query', {
  limit: 10,
  threshold: 0.7,
});
```

### 4. Plugin System

**Architecture:**
```
Plugin System
├── Plugin Manager
├── Capability Checker
├── Sandbox
└── Extension Points
```

**Key Files:**
- `/src/lib/plugin/`: Plugin SDK
- `/src/lib/extensions/`: Extension framework

**Plugin Structure:**

```typescript
import { Plugin, PluginContext } from '@personallog/sdk';

export class MyPlugin extends Plugin {
  manifest = {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    capabilities: {
      conversations: { read: true },
      ui: true,
    },
  };

  async onLoad(context: PluginContext) {
    // Initialize
  }

  async onEnable(context: PluginContext) {
    // Enable
  }
}
```

**See:** [Plugin Development Guide](./plugin-development.md)

### 5. Intelligence System

**Architecture:**
```
Intelligence Hub
├── Analytics Pipeline
├── Experiments Framework
├── Optimization Engine
├── Personalization Engine
└── Feature Flags
```

**Key Files:**
- `/src/lib/analytics/`: Analytics
- `/src/lib/experiments/`: A/B testing
- `/src/lib/optimization/`: Performance tuning
- `/src/lib/personalization/`: Learning
- `/src/lib/flags/`: Feature flags

**Usage:**

```typescript
import { analytics } from '@/lib/analytics';

// Track event
analytics.track('button_clicked', {
  button: 'send',
  location: 'chat',
});

// Track page view
analytics.page('knowledge');

// Get insights
const insights = await analytics.getInsights();
```

---

## Testing

### Test Structure

```
tests/
├── unit/              # Vitest unit tests
│   ├── lib/
│   │   ├── vector.test.ts
│   │   └── storage.test.ts
│   └── components/
│       └── Button.test.tsx
│
├── integration/       # Integration tests
│   └── api/
│       └── chat.test.ts
│
├── e2e/              # Playwright E2E tests
│   ├── messenger.spec.ts
│   └── knowledge.spec.ts
│
├── a11y/             # Accessibility tests
│   └── navigation.spec.ts
│
└── performance/       # Performance tests
    └── load-times.spec.ts
```

### Unit Testing

**Run Unit Tests:**
```bash
pnpm test:unit
```

**Watch Mode:**
```bash
pnpm test:watch
```

**Coverage:**
```bash
pnpm test:coverage
```

**Example:**

```typescript
// tests/unit/lib/vector.test.ts
import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from '@/lib/vector';

describe('cosineSimilarity', () => {
  it('calculates similarity correctly', () => {
    const a = [1, 2, 3];
    const b = [1, 2, 3];
    const result = cosineSimilarity(a, b);
    expect(result).toBeCloseTo(1.0);
  });

  it('handles orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    const result = cosineSimilarity(a, b);
    expect(result).toBeCloseTo(0.0);
  });
});
```

### Integration Testing

**Run Integration Tests:**
```bash
pnpm test:integration
```

**Example:**

```typescript
// tests/integration/api/chat.test.ts
import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/chat/route';

describe('/api/chat', () => {
  it('responds to chat requests', async () => {
    const request = new Request('http://localhost:3002/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello',
        conversationId: 'test',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('content');
  });
});
```

### E2E Testing

**Run E2E Tests:**
```bash
pnpm test:e2e
```

**UI Mode:**
```bash
pnpm test:e2e:ui
```

**Example:**

```typescript
// tests/e2e/messenger.spec.ts
import { test, expect } from '@playwright/test';

test('create new conversation', async ({ page }) => {
  await page.goto('/messenger');

  // Click new chat button
  await page.click('[data-testid="new-chat-button"]');

  // Type message
  await page.fill('[data-testid="message-input"]', 'Hello AI');

  // Send
  await page.click('[data-testid="send-button"]');

  // Assert response appears
  await expect(page.locator('[data-testid="message-response"]'))
    .toBeVisible();
});
```

### Accessibility Testing

**Run A11y Tests:**
```bash
pnpm test:a11y
```

**Example:**

```typescript
// tests/a11y/navigation.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage is accessible', async ({ page }) => {
  await page.goto('/');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Performance Testing

**Run Performance Tests:**
```bash
pnpm test:perf
```

**Metrics:**
- Load time
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- Time to Interactive (TTI)

---

## Building & Deployment

### Local Build

**Development Build:**
```bash
pnpm build
```

**Production Build:**
```bash
NODE_ENV=production pnpm build
```

**Build Output:**
- `.next/` - Build artifacts
- `out/` - Static export (if using static export)

### WASM Build

**Development WASM:**
```bash
pnpm build:wasm
```

**Release WASM:**
```bash
pnpm build:wasm:release
```

**Watch WASM:**
```bash
pnpm watch:wasm
```

### Deployment

#### Vercel (Recommended)

**Automatic Deployment:**
1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push

**Manual Deployment:**
```bash
vercel --prod
```

**Environment Variables:**
```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
BUILD_WASM=false
```

#### Docker

**Build Image:**
```bash
docker build -t personallog .
```

**Run Container:**
```bash
docker run -p 3000:3000 personallog
```

#### Static Export

**Generate Static Site:**
```bash
# Update next.config.ts for static export
pnpm build
```

**Deploy to CDN:**
- Upload `out/` directory
- Configure SPA routing
- Handle dynamic routes

---

## Contributing

### Workflow

1. **Fork Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/PersonalLog.git
   cd PersonalLog
   ```

2. **Create Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Write code following standards
   - Add tests for new features
   - Update documentation

4. **Test Changes**
   ```bash
   pnpm test
   pnpm type-check
   pnpm lint
   ```

5. **Commit**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

6. **Push**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create Pull Request**
   - Describe your changes
   - Link related issues
   - Request review

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or tooling

**Examples:**
```
feat(ai): add support for Claude 3 models
fix(storage): resolve race condition in cache
docs(readme): update installation instructions
test(e2e): add messenger flow tests
```

### Pull Request Guidelines

**Title:**
```
[type]: Brief description
```

**Body:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] All tests passing

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Added tests for changes
- [ ] All tests passing
```

### Code Review Process

1. **Automated Checks**
   - TypeScript compilation
   - ESLint checks
   - Test suite
   - Build verification

2. **Manual Review**
   - Code quality
   - Architecture alignment
   - Performance impact
   - Security considerations

3. **Approval & Merge**
   - At least one approval required
   - All checks must pass
   - Resolve review comments
   - Squash merge to main

---

## Coding Standards

### TypeScript

**Strict Mode Enabled:**
- All files must pass strict type checking
- No implicit any types
- Explicit return types on exports
- Strict null checks

**Best Practices:**

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

async function getUser(id: string): Promise<User> {
  const user = await storage.get<User>(id);
  if (!user) throw new Error('User not found');
  return user;
}

// ❌ Bad
async function getUser(id: any) {
  return storage.get(id);
}
```

### React

**Functional Components:**
- Use functional components with hooks
- No class components
- Props interface defined

```typescript
// ✅ Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

// ❌ Bad
export class Button extends Component {
  render() {
    return <button>{this.props.label}</button>;
  }
}
```

**Hooks:**
- Follow rules of hooks
- Custom hooks prefixed with `use`
- Extract complex logic to custom hooks

```typescript
// ✅ Good
function useChat(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = chatStore.onChange(conversationId, setMessages);
    return unsubscribe;
  }, [conversationId]);

  return { messages };
}

// ❌ Bad
function useChat(condition: boolean) {
  if (condition) {
    useEffect(() => {}, []); // Rule violation
  }
}
```

### Styling

**Tailwind CSS:**
- Utility-first approach
- Responsive design
- Dark mode support

```typescript
// ✅ Good
<div className="flex flex-col gap-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">

// ❌ Bad
<div style={{ display: 'flex', flexDirection: 'column', padding: '24px' }}>
```

**Component Variants:**
Use `class-variance-authority` for variants:

```typescript
const buttonVariants = cva(
  'rounded-lg font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-blue-500 text-white hover:bg-blue-600',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
      },
      size: {
        small: 'px-3 py-1 text-sm',
        medium: 'px-4 py-2',
        large: 'px-6 py-3 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'medium',
    },
  }
);
```

### Error Handling

**Async Errors:**
- Always handle async errors
- Use error boundaries for React
- Log errors appropriately

```typescript
// ✅ Good
async function sendMessage(message: string) {
  try {
    const response = await api.chat(message);
    return response;
  } catch (error) {
    logger.error('Failed to send message', error);
    showErrorNotification('Failed to send message');
    throw error; // Re-throw for caller to handle
  }
}

// ❌ Bad
async function sendMessage(message: string) {
  return await api.chat(message); // Unhandled rejection
}
```

**Error Boundaries:**

```typescript
interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### Performance

**Memoization:**
- Use `useMemo` for expensive computations
- Use `useCallback` for event handlers
- Memoize list items

```typescript
// ✅ Good
const filteredMessages = useMemo(
  () => messages.filter(m => m.conversationId === id),
  [messages, id]
);

const handleClick = useCallback(() => {
  sendMessage(message);
}, [message]);

// ❌ Bad
const filteredMessages = messages.filter(m => m.conversationId === id); // Recomputed every render

const handleClick = () => sendMessage(message); // New function every render
```

**Code Splitting:**
- Use dynamic imports for heavy components
- Split by route with Next.js automatic splitting

```typescript
// ✅ Good
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton />,
});

// ❌ Bad
import { HeavyChart } from './HeavyChart'; // Loaded immediately
```

### Accessibility

**ARIA Attributes:**
- Use semantic HTML
- Add ARIA labels where needed
- Keyboard navigation support

```typescript
// ✅ Good
<button
  onClick={action}
  aria-label="Close dialog"
  className="close-button"
>
  <XIcon />
</button>

// ❌ Bad
<div onClick={action}>
  <XIcon />
</div>
```

**Focus Management:**
- Manage focus in modals
- Restore focus after closing
- Visible focus indicators

```typescript
// ✅ Good
useEffect(() => {
  if (isOpen) {
    dialogRef.current?.focus();
  }
  return () => {
    previousFocusRef.current?.focus();
  };
}, [isOpen]);
```

---

## Resources

### Documentation

- [User Guide](./USER_GUIDE.md) - End user documentation
- [Architecture](./ARCHITECTURE.md) - System architecture
- [Plugin Development](./plugin-development.md) - Build plugins
- [Settings Guide](./SETTINGS_GUIDE.md) - Settings documentation
- [Testing Guide](./TESTING.md) - Testing documentation
- [Build Guide](./BUILD.md) - Build and deployment

### External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [WebAssembly](https://webassembly.org/)
- [Rust & wasm-bindgen](https://rustwasm.github.io/docs/wasm-bindgen/)

### Community

- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share ideas
- **Discord**: (coming soon) Real-time chat

### Getting Help

**Stuck?** Here's what to do:

1. **Search existing issues** - Your problem might be solved
2. **Read the docs** - Comprehensive guides available
3. **Ask on Discussions** - Community is helpful
4. **Create an issue** - For bugs and feature requests

**When creating issues, include:**
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, version)
- Screenshots if applicable
- Minimal reproduction case

---

## Next Steps

Now that you're set up:

1. **Explore the codebase** - Understand the architecture
2. **Pick an issue** - Start with good first issue label
3. **Join discussions** - Engage with the community
4. **Contribute** - Submit your first pull request

**Happy coding!**

---

*Last Updated: 2026-01-03*
*Version: 1.0.0*
