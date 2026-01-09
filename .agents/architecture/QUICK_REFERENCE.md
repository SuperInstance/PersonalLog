# Tool Ecosystem Architecture - Quick Reference

**For:** Tool Developers & Users
**Version:** 1.0.0
**Date:** 2026-01-08

---

## Core Principles (30 Seconds)

1. **Independence First** - Every tool works alone
2. **Optional Synergy** - Tools CAN integrate, never MUST
3. **Strong Interfaces** - TypeScript interfaces define contracts
4. **Event-Driven** - Loose coupling via typed events
5. **Developer Experience** - 5-minute setup, clear errors

---

## Essential Interfaces

### EventEmitter
```typescript
interface EventEmitter<E> {
  on<K extends keyof E>(event: K, fn: (data: E[K]) => void): this;
  emit<K extends keyof E>(event: K, data: E[K]): boolean;
  off<K extends keyof E>(event: K, fn: (data: E[K]) => void): this;
}
```

### LLMProvider
```typescript
interface LLMProvider {
  complete(prompt: string, options?: CompletionOptions): Promise<CompletionResult>;
  streamComplete(prompt: string): AsyncIterable<string>;
  countTokens(text: string): number;
}
```

### Tool
```typescript
interface Tool {
  readonly name: string;
  readonly version: string;
  initialize?(config?: unknown): Promise<void>;
  destroy?(): Promise<void>;
}
```

---

## Integration Patterns (5 Minutes)

### Pattern 1: Optional Dependency
```typescript
// Tool works alone
const spreader = new Spreader({ provider: openaiProvider });

// Tool integrates optionally
const spreader2 = new Spreader({ provider: cascadeRouter });
```

### Pattern 2: Event-Based
```typescript
// Tool A emits
spreader.emit('completed', { result, duration });

// Tool B listens (optional)
spreader.on('completed', async (data) => {
  await analytics.track('spreader_completed', data);
});
```

### Pattern 3: Composition
```typescript
class ResearchKit {
  constructor(
    private spreader: Spreader,
    private vectorStore: VectorStore,
    private analytics: Analytics
  ) {}

  async research(topic: string) {
    const results = await this.spreader.execute(topic);
    await this.vectorStore.index(results);
    await this.analytics.track('completed', { count: results.length });
    return results;
  }
}
```

---

## Event Naming Convention

```typescript
// Format: <tool>:<action>:<status>
'spreader:execution:started'
'spreader:execution:completed'
'spreader:execution:failed'
'cascade-router:request:routed'
'analytics:event:tracked'
```

---

## Standard Data Types

```typescript
// Result wrapper
interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

// Paginated
interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  hasMore: boolean;
}

// Timestamped
interface Timestamped<T> {
  data: T;
  timestamp: number;
}
```

---

## Configuration Best Practices

```typescript
// 1. Provide sensible defaults
const DEFAULT_CONFIG = {
  maxParallelAgents: 3,
  timeout: 30000
};

// 2. Support presets
const PRESETS = {
  fast: { maxParallelAgents: 5 },
  thorough: { maxParallelAgents: 2 }
};

// 3. Environment variables
const config = {
  ...DEFAULT_CONFIG,
  apiKey: process.env.API_KEY
};
```

---

## Error Handling

```typescript
// Use typed errors
class ToolError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
  }
}

// Handle gracefully
try {
  await tool.execute();
} catch (error) {
  if (error instanceof RetryableError) {
    // Retry logic
  } else {
    // Handle fatal error
  }
}
```

---

## Performance Tips

```typescript
// Lazy initialization
private analytics = new Lazy(async () => {
  return new Analytics();
});

// Caching
private cache = new Cache(300000); // 5 min TTL
const result = this.cache.get(key) || await this.fetch(key);

// Streaming
async function* process(data: AsyncIterable<T>) {
  for await (const item of data) {
    yield await transform(item);
  }
}
```

---

## Testing Checklist

- [ ] Unit tests for core logic
- [ ] Mock implementations for interfaces
- [ ] Integration tests for optional features
- [ ] Error handling tests
- [ ] Performance benchmarks
- [ ] Type validation tests

---

## Package.json Template

```json
{
  "name": "@superinstance/my-tool",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist", "README.md", "LICENSE"]
}
```

---

## TypeScript Config

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "declaration": true,
    "sourceMap": true,
    "moduleResolution": "bundler"
  }
}
```

---

## Tool Independence Checklist

**Level 10: Perfect Independence**
- ✅ Zero dependencies
- ✅ Pure browser/node APIs
- ✅ Works completely alone

**Level 9: Near Perfect**
- ✅ Minimal dependencies
- ✅ Only standard APIs
- ✅ Optional integration

**Level 7-8: Moderate**
- ✅ Optional dependencies
- ✅ Works alone, better with others
- ✅ Clear integration points

**Level 5-6: Integration Heavy**
- ✅ Designed for composition
- ✅ Requires some interfaces
- ✅ Optional enhancements

---

## Quick Start Template

```typescript
import { Tool, EventEmitter } from '@superinstance/core-interfaces';

interface MyToolEvents {
  started: { timestamp: number };
  completed: { result: unknown; duration: number };
  failed: { error: Error };
}

export class MyTool extends EventEmitter<MyToolEvents> implements Tool {
  readonly name = 'my-tool';
  readonly version = '1.0.0';

  constructor(private config: MyToolConfig) {
    super();
  }

  async initialize() {
    this.emit('started', { timestamp: Date.now() });
  }

  async execute(input: string) {
    try {
      const result = await this.doWork(input);
      this.emit('completed', {
        result,
        duration: Date.now() - this.startTime
      });
      return result;
    } catch (error) {
      this.emit('failed', { error: error as Error });
      throw error;
    }
  }

  private async doWork(input: string) {
    // Implementation
  }
}
```

---

## Common Patterns

### Adapter Pattern
```typescript
class ThirdPartyAdapter implements LLMProvider {
  constructor(private client: ThirdPartyClient) {}

  async complete(prompt: string) {
    const response = await this.client.generate({ prompt });
    return {
      text: response.text,
      tokensUsed: response.tokens,
      finishReason: 'stop',
      model: 'third-party'
    };
  }
}
```

### Middleware Pattern
```typescript
interface Middleware {
  before?: (ctx: any) => Promise<void>;
  after?: (ctx: any, result: any) => Promise<void>;
}

class Tool {
  use(middleware: Middleware) {
    this.middleware.push(middleware);
  }

  async execute(input: string) {
    for (const mw of this.middleware) {
      await mw.before?.({ input });
    }

    const result = await this.doWork(input);

    for (const mw of this.middleware) {
      await mw.after?.({ input }, result);
    }

    return result;
  }
}
```

---

## Documentation Checklist

- [ ] README with 5-minute quick start
- [ ] API reference (all public methods)
- [ ] Type definitions exported
- [ ] Integration examples
- [ ] Error handling guide
- [ ] Performance characteristics
- [ ] TypeScript types in JSDoc

---

## Build Commands

```bash
# Type check
npm run type-check

# Build
npm run build

# Test
npm run test

# Publish
npm run publish
```

---

## Common Mistakes to Avoid

❌ **Hard dependencies on other tools**
```typescript
// BAD
import { OtherTool } from '@superinstance/other-tool';
const tool = new OtherTool(); // Required
```

✅ **Optional dependencies**
```typescript
// GOOD
constructor(config: { otherTool?: OtherTool }) {
  this.otherTool = config.otherTool; // Optional
}
```

❌ **Tight coupling**
```typescript
// BAD
class Tool {
  async execute() {
    const data = await otherTool.getData();
    return transform(data);
  }
}
```

✅ **Interface-based coupling**
```typescript
// GOOD
interface DataProvider {
  getData(): Promise<Data>;
}

class Tool {
  constructor(private provider: DataProvider) {}
  async execute() {
    const data = await this.provider.getData();
    return transform(data);
  }
}
```

---

## Performance Targets

- ⚡ Initialization: <100ms
- ⚡ First operation: <500ms
- ⚡ Memory footprint: <10MB base
- ⚡ Bundle size: <100KB minified

---

## Success Metrics

**For Tool Authors:**
- ✅ Zero TypeScript errors
- ✅ 80%+ test coverage
- ✅ All examples working
- ✅ Clear documentation

**For Tool Users:**
- ✅ 5-minute setup
- ✅ Works immediately
- ✅ Clear error messages
- ✅ Easy integration

---

## Resources

- **Full Architecture:** `tool-ecosystem-design.md`
- **Visual Guide:** `VISUAL_SUMMARY.md`
- **Examples:** `packages/integration-examples/`
- **Issue Tracker:** GitHub Issues
- **Discussions:** GitHub Discussions

---

**Need Help?**
- Check full architecture document
- Review integration examples
- Open GitHub issue
- Join Discord discussion

---

**Quick Reference Version:** 1.0.0
**Last Updated:** 2026-01-08
**Status:** Ready for Use
