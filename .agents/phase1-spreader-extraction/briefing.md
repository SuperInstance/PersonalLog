# Phase 1: Spreader Tool Extraction - Agent Briefings

**Date:** 2026-01-07
**Status:** 🎯 READY TO LAUNCH
**Priority:** URGENT - High interest from community
**Timeline:** Days 1-3
**Repository:** https://github.com/SuperInstance/Spreader-tool

---

## Mission: Extract Spreader as Production-Ready Standalone Tool

Transform the PersonalLog-integrated Spreader agent into a completely independent, model-agnostic, CLI-based tool for parallel multi-agent information gathering.

**What Makes Spreader Special:**
- **Full Context Architecture:** Each specialist thread gets COMPLETE parent conversation context
- **Ralph Wiggum Mode:** Last agent summarizes work for efficient handoff
- **Specialist Coordination:** Different agents (researcher, coder, architect, etc.) work in parallel
- **Progressive Refinement:** Each thread can recontextualize from full parent as needed
- **Smart Output:** Organized Markdown files + index.md for AI/human consumption

**Target Use Cases:**
1. Research topic gathering (multiple perspectives in parallel)
2. Architecture specification (system design, database, API, etc.)
3. World building (geography, cultures, history, etc.)
4. Code analysis (security, performance, maintainability, etc.)

**3 Agents Will Deploy:**

---

## Agent 1: Core Spreader Engine Extraction

**Mission:** Extract and refactor core Spreader logic as framework-agnostic engine

### Your Responsibilities

#### 1. Study Current Implementation
Read and understand:
- `src/lib/agents/spreader/spreader-agent.ts` - Main agent logic
- `src/lib/agents/spreader/dag.ts` - DAG orchestration
- `src/lib/agents/spreader/dag-executor.ts` - DAG execution
- `src/lib/agents/spreader/optimizer.ts` - Token optimization
- `src/lib/agents/spreader/compression-strategies.ts` - Context compression

#### 2. Extract Core Engine (Framework-Agnostic)
Create new standalone package structure:

```typescript
// src/core/engine.ts
export class SpreaderEngine {
  // Main orchestration logic
  async executeSpread(config: SpreadConfig): Promise<SpreadResult>

  // Coordinate parallel specialists
  private async coordinateSpecialists(specialists: Specialist[]): Promise<SpecialistResult[]>

  // Manage full context distribution
  private async distributeContext(parentContext: FullContext, specialists: Specialist[])

  // Collect and merge results
  private async mergeResults(results: SpecialistResult[]): Promise<MergedResult>
}
```

**Key Requirements:**
- ✅ Remove ALL PersonalLog dependencies (no Next.js, no IndexedDB)
- ✅ Remove all UI dependencies (React, etc.)
- ✅ Make it pure Node.js/TypeScript
- ✅ Each specialist receives FULL parent context
- ✅ Support context compaction for long threads
- ✅ Implement Ralph Wiggum summarization

#### 3. Implement Full Context Architecture

```typescript
// src/core/context-manager.ts
export class ContextManager {
  // Distribute complete parent context to each specialist
  distributeContext(parent: FullContext, specialist: Specialist): ContextPackage

  // Compaction for long threads (recursive with time limit)
  compactContext(context: FullContext, options: CompactionOptions): CompactContext

  // Recontextualization - specialist can request full parent context
  async recontextualize(specialistId: string, reason: string): Promise<FullContext>

  // Search across previous threads (when needed)
  searchPreviousThreads(query: string, threads: Thread[]): Promise<SearchResults>
}
```

#### 4. Implement Ralph Wiggum Summarization

```typescript
// src/core/summarizer.ts
export class RalphWiggumSummarizer {
  // Last agent summarizes their work for next specialist
  async summarizeSpecialistWork(result: SpecialistResult): Promise<HandoffSummary>

  // Create handoff package for next specialist
  async createHandoff(summary: HandoffSummary, fullContext: FullContext): HandoffPackage

  // Ensure context efficiency - what next specialist needs to know
  async extractRelevantContext(summary: HandoffSummary, fullContext: FullContext): Promise<RelevantContext>
}
```

**Summarization Strategy:**
- Each specialist ends with: "What I did, what I found, what you need to know"
- Next specialist receives: Previous summary + full parent context
- Can search previous threads if needed (but usually not necessary)

#### 5. Implement Specialist Coordination

```typescript
// src/core/specialist.ts
export class Specialist {
  id: string
  role: SpecialistRole  // 'researcher' | 'coder' | 'architect' | 'world-builder' | etc.
  systemPrompt: string
  provider: LLMProvider

  // Execute specialist task with full context
  async execute(task: string, context: FullContext, previousSummary?: string): Promise<SpecialistResult>

  // Summarize work for next specialist (Ralph Wiggum mode)
  async summarizeWork(result: SpecialistResult): Promise<string>
}
```

**Specialist Types:**
- Researcher: Gather information from multiple sources
- Coder: Write/implement code
- Architect: Design system architecture
- World Builder: Create world elements (geography, cultures, etc.)
- Analyst: Analyze from specific perspective
- Critic: Review and critique
- Synthesizer: Combine multiple perspectives

#### 6. Configuration Schema

```typescript
// src/types.ts
export interface SpreadConfig {
  // Request to spread across specialists
  request: string

  // Parent context (full conversation history)
  parentContext: FullContext

  // Specialists to spawn
  specialists: SpecialistConfig[]

  // Output configuration
  output: {
    format: 'markdown' | 'json'
    directory: string
    createIndex: boolean
    includeTimestamps: boolean
  }

  // Context management
  context: {
    compactAfter: number  // Tokens threshold for compaction
    compactStrategy: 'recursive' | 'summary' | 'both'
    recontextualizeAllowed: boolean
    includePreviousThreads: boolean
  }

  // Progress monitoring
  monitoring: {
    checkinInterval: number  // Seconds
    showProgress: boolean
    verbose: boolean
  }
}

export interface SpecialistConfig {
  id: string
  role: string
  systemPrompt: string
  provider: string  // 'openai' | 'anthropic' | 'ollama' | 'mcp'
  model?: string
  temperature?: number
  maxTokens?: number
}
```

### Files to Create

1. **Core Engine** (900+ lines)
   - `packages/spreader-tool/src/core/engine.ts`
   - `packages/spreader-tool/src/core/context-manager.ts`
   - `packages/spreader-tool/src/core/specialist.ts`
   - `packages/spreader-tool/src/core/summarizer.ts`
   - `packages/spreader-tool/src/core/coordinator.ts`

2. **Types** (300+ lines)
   - `packages/spreader-tool/src/types.ts`

3. **Utilities** (400+ lines)
   - `packages/spreader-tool/src/utils/context-utils.ts`
   - `packages/spreader-tool/src/utils/token-counter.ts`
   - `packages/spreader-tool/src/utils/async-helpers.ts`

4. **Tests** (600+ lines, 80+ tests)
   - `packages/spreader-tool/src/core/__tests__/engine.test.ts`
   - `packages/spreader-tool/src/core/__tests__/context-manager.test.ts`
   - `packages/spreader-tool/src/core/__tests__/specialist.test.ts`
   - `packages/spreader-tool/src/core/__tests__/summarizer.test.ts`

### Success Criteria
- ✅ Core engine extracted (zero PersonalLog dependencies)
- ✅ Full context distribution working
- ✅ Ralph Wiggum summarization implemented
- ✅ Context compaction for long threads
- ✅ Recontextualization support
- ✅ Zero TypeScript errors
- ✅ 80+ test cases passing

---

## Agent 2: CLI Interface & Output Management

**Mission:** Create intuitive CLI and file-system output system

### Your Responsibilities

#### 1. CLI Interface

Create beautiful CLI with these commands:

```bash
# Initialize new spread project
spreader init <project-name>

# Execute a spread
spreader run <request>
  --specialists researcher,coder,architect
  --providers openai,anthropic
  --output ./spreads/my-topic

# Check progress of running spread
spreader status <spread-id>

# View results
spreader results <spread-id>

# List all spreads
spreader list

# Configure default providers
spreader config set provider.openai.key sk-...
spreader config set provider.anthropic.key sk-...

# Show spread configuration
spreader show <spread-id>

# Cancel running spread
spreader cancel <spread-id>
```

#### 2. CLI Implementation

```typescript
// src/cli/index.ts
#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { SpreaderCLI } from './cli-handler'

const program = new Command()

program
  .name('spreader')
  .description('Parallel multi-agent information gathering tool')
  .version('1.0.0')

program
  .command('init <project-name>')
  .description('Initialize new spread project')
  .action(initProject)

program
  .command('run <request>')
  .description('Execute a spread')
  .option('-s, --specialists <types>', 'Specialist types (comma-separated)')
  .option('-p, --providers <names>', 'LLM providers')
  .option('-o, --output <dir>', 'Output directory')
  .option('-c, --config <file>', 'Config file')
  .action(runSpread)

program
  .command('status <spread-id>')
  .description('Check spread status')
  .action(showStatus)

program
  .command('results <spread-id>')
  .description('Show spread results')
  .action(showResults)

program.parse()
```

**UI Requirements:**
- Use chalk for beautiful colored output
- Use ora for loading spinners
- Use cli-progress3 for progress bars
- Clear, helpful error messages
- Verbose mode for debugging

#### 3. File-System Output

**Default Output Structure:**
```
spreads/my-topic/
├── specialist-01-researcher.md
├── specialist-02-architect.md
├── specialist-03-coder.md
├── specialist-04-critic.md
└── index.md  (summarizes all, provides navigation)
```

**Markdown Format:**

```markdown
# Specialist: Researcher

**Role:** Research and gather information
**Provider:** OpenAI GPT-4
**Timestamp:** 2026-01-07 10:30:15 UTC
**Tokens Used:** 2,456

## Task
Research the current state of quantum computing, focusing on:
- Recent breakthroughs (2024-2025)
- Major players and their approaches
- Practical applications and timeline

## Context from Parent
[Full parent conversation included here]

## Summary of Previous Work
[If not first specialist: summary from previous agent]

## My Research Findings
[Specialist's complete work here]

## Handoff Summary
**What I Did:** Comprehensive research on quantum computing state
**What I Found:** [Key findings summary]
**What You Need to Know:** [Critical context for next specialist]
```

**index.md Format:**

```markdown
# Spread: My Topic

**Date:** 2026-01-07 10:30:00 UTC
**Request:** [Original request]
**Specialists:** 4
**Status:** ✅ Complete

## Overview
[Brief summary of entire spread]

## Specialists

1. **Researcher** ✅
   - File: [specialist-01-researcher.md](specialist-01-researcher.md)
   - Tokens: 2,456
   - Summary: [One-sentence summary]

2. **Architect** ✅
   - File: [specialist-02-architect.md](specialist-02-architect.md)
   - Tokens: 3,102
   - Summary: [One-sentence summary]

[... etc ...]

## Key Insights
[Synthesized insights from all specialists]

## Next Steps
[Suggested actions based on spread results]

---

*Generated by Spreader v1.0.0*
```

#### 4. Output Manager

```typescript
// src/output/markdown-writer.ts
export class MarkdownWriter {
  // Write specialist result to markdown file
  async writeSpecialistResult(
    specialist: Specialist,
    result: SpecialistResult,
    outputDir: string
  ): Promise<string>  // Returns file path

  // Write index file
  async writeIndex(
    config: SpreadConfig,
    results: SpecialistResult[],
    outputDir: string
  ): Promise<void>

  // Format specialist markdown
  private formatSpecialistMarkdown(specialist: Specialist, result: SpecialistResult): string

  // Format index markdown
  private formatIndexMarkdown(config: SpreadConfig, results: SpecialistResult[]): string
}
```

#### 5. Configuration Management

```typescript
// spread.config.json
{
  "$schema": "https://spreader.tool/schema/config.json",
  "providers": {
    "openai": {
      "apiKey": "${OPENAI_API_KEY}",
      "defaultModel": "gpt-4-turbo",
      "baseURL": "https://api.openai.com/v1"
    },
    "anthropic": {
      "apiKey": "${ANTHROPIC_API_KEY}",
      "defaultModel": "claude-3-opus-20240229"
    },
    "ollama": {
      "baseURL": "http://localhost:11434",
      "defaultModel": "llama2"
    }
  },
  "defaults": {
    "specialists": ["researcher", "architect", "coder"],
    "provider": "openai",
    "outputDirectory": "./spreads",
    "compactAfter": 8000,
    "checkinInterval": 30
  }
}
```

### Files to Create

1. **CLI** (700+ lines)
   - `packages/spreader-tool/src/cli/index.ts`
   - `packages/spreader-tool/src/cli/commands/init.ts`
   - `packages/spreader-tool/src/cli/commands/run.ts`
   - `packages/spreader-tool/src/cli/commands/status.ts`
   - `packages/spreader-tool/src/cli/commands/results.ts`
   - `packages/spreader-tool/src/cli/commands/config.ts`
   - `packages/spreader-tool/src/cli/ui/spinner.ts`
   - `packages/spreader-tool/src/cli/ui/progress.ts`

2. **Output Management** (500+ lines)
   - `packages/spreader-tool/src/output/markdown-writer.ts`
   - `packages/spreader-tool/src/output/index-generator.ts`
   - `packages/spreader-tool/src/output/formatter.ts`

3. **Configuration** (300+ lines)
   - `packages/spreader-tool/src/config/manager.ts`
   - `packages/spreader-tool/src/config/schema.ts`
   - `packages/spreader-tool/src/config/defaults.ts`

4. **Tests** (500+ lines, 60+ tests)
   - `packages/spreader-tool/src/cli/__tests__/cli.test.ts`
   - `packages/spreader-tool/src/output/__tests__/markdown-writer.test.ts`
   - `packages/spreader-tool/src/config/__tests__/config.test.ts`

### Success Criteria
- ✅ CLI functional with all commands
- ✅ Beautiful UI (colors, spinners, progress bars)
- ✅ Markdown output working (specialists + index)
- ✅ Configuration file support
- ✅ Zero TypeScript errors
- ✅ 60+ test cases

---

## Agent 3: Provider Integration & Documentation

**Mission:** Integrate multiple LLM providers and create comprehensive documentation

### Your Responsibilities

#### 1. Provider Interface

```typescript
// src/providers/provider.ts
export interface LLMProvider {
  name: string
  type: 'openai' | 'anthropic' | 'ollama' | 'mcp' | 'custom'

  // Stream completion
  async complete(
    prompt: string,
    options: CompletionOptions
  ): Promise<CompletionResult>

  // Stream completion with progress
  async streamComplete(
    prompt: string,
    options: CompletionOptions,
    onProgress: (delta: string) => void
  ): Promise<CompletionResult>

  // Count tokens (for cost tracking)
  countTokens(text: string): number

  // Validate configuration
  validateConfig(config: any): boolean
}

export interface CompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stopSequences?: string[]
  systemPrompt?: string
}

export interface CompletionResult {
  text: string
  tokensUsed: number
  finishReason: 'stop' | 'length' | 'content_filter'
  model: string
}
```

#### 2. Provider Implementations

**OpenAI Provider:**
```typescript
// src/providers/openai.ts
export class OpenAIProvider implements LLMProvider {
  name = 'openai'
  type = 'openai' as const
  private client: OpenAI

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL })
  }

  async complete(prompt: string, options: CompletionOptions): Promise<CompletionResult> {
    // Implementation
  }

  countTokens(text: string): number {
    // Use tiktoken or estimation
    return Math.ceil(text.length / 4)
  }
}
```

**Anthropic Provider:**
```typescript
// src/providers/anthropic.ts
export class AnthropicProvider implements LLMProvider {
  name = 'anthropic'
  type = 'anthropic' as const
  private client: Anthropic

  constructor(config: AnthropicConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey })
  }

  async complete(prompt: string, options: CompletionOptions): Promise<CompletionResult> {
    // Implementation with Claude API
  }
}
```

**Ollama Provider (Local Models):**
```typescript
// src/providers/ollama.ts
export class OllamaProvider implements LLMProvider {
  name = 'ollama'
  type = 'ollama' as const
  private baseURL: string

  constructor(config: OllamaConfig) {
    this.baseURL = config.baseURL || 'http://localhost:11434'
  }

  async complete(prompt: string, options: CompletionOptions): Promise<CompletionResult> {
    // Call Ollama API
    const response = await fetch(`${this.baseURL}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        model: options.model || 'llama2',
        prompt,
        stream: false
      })
    })
    // Parse and return result
  }
}
```

**MCP Provider (Model Context Protocol):**
```typescript
// src/providers/mcp.ts
export class MCPProvider implements LLMProvider {
  name = 'mcp'
  type = 'mcp' as const
  private serverURL: string

  async complete(prompt: string, options: CompletionOptions): Promise<CompletionResult> {
    // Call MCP server
  }
}
```

#### 3. Provider Registry

```typescript
// src/providers/registry.ts
export class ProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map()

  register(provider: LLMProvider): void {
    this.providers.set(provider.name, provider)
  }

  get(name: string): LLMProvider | undefined {
    return this.providers.get(name)
  }

  list(): string[] {
    return Array.from(this.providers.keys())
  }

  async autoDetect(): Promise<void> {
    // Auto-detect available providers
    // - Check env variables (OPENAI_API_KEY, ANTHROPIC_API_KEY)
    // - Check if Ollama is running (localhost:11434)
    // - Check MCP servers
  }
}
```

#### 4. Comprehensive Documentation

Create world-class documentation:

**README.md** (Structure):
```markdown
# Spreader Tool

[Logo]

> Parallel multi-agent information gathering for the AI age

## What is Spreader?

Spreader spawns multiple specialist agents in parallel, each with FULL context of your request, to gather comprehensive information from multiple perspectives.

## Why Spreader?

- **Full Context Architecture**: Every specialist sees your complete conversation history
- **Ralph Wiggum Mode**: Efficient handoffs with smart summaries
- **Model-Agnostic**: Works with OpenAI, Anthropic, Ollama, MCP, or custom
- **Parallel Processing**: Get results 3-10x faster than sequential
- **Beautiful Output**: Organized Markdown files + AI-ready index

## Quick Start

\`\`\`bash
npm install -g @superinstance/spreader

spreader init my-project
cd my-project
spreader run "Research quantum computing breakthroughs from 2024-2025"
\`\`\`

## Features

- [x] Parallel specialist execution
- [x] Full parent context distribution
- [x] Context compaction for long threads
- [x] Progress monitoring and check-ins
- [x] Multiple LLM provider support
- [x] Beautiful markdown output
- [x] Extensible specialist system

## Use Cases

1. **Research**: Multiple researchers explore different aspects
2. **Architecture**: Architect, database expert, API designer work in parallel
3. **World Building**: Geography, culture, history specialists build together
4. **Code Analysis**: Security, performance, maintainability analyzed together

## Documentation

- [Getting Started](docs/getting-started.md)
- [Configuration Guide](docs/configuration.md)
- [Specialist Reference](docs/specialists.md)
- [Provider Setup](docs/providers.md)
- [Output Format](docs/output.md)
- [Examples](docs/examples.md)

## Community

- GitHub: https://github.com/SuperInstance/Spreader-tool
- Issues: https://github.com/SuperInstance/Spreader-tool/issues
- Discussions: https://github.com/SuperInstance/Spreader-tool/discussions

## License

MIT © 2026 SuperInstance

---

*"Spreader makes parallel multi-agent research accessible to everyone."*
```

**Getting Started Guide** (docs/getting-started.md):
- 5-minute setup walkthrough
- Installation instructions
- First spread example
- Configuration basics
- Troubleshooting

**API Reference** (docs/api.md):
- All public functions
- TypeScript types
- Configuration options
- Provider interface
- Event system

**Examples** (docs/examples.md):
1. Research spread (quantum computing)
2. Architecture spread (microservices design)
3. World building spread (fantasy kingdom)
4. Code analysis spread (security audit)

#### 5. Example Spreads

Create ready-to-run examples:

```json
// examples/research-spread.json
{
  "request": "Research the current state of quantum computing, focusing on recent breakthroughs (2024-2025), major players and their approaches, and practical applications with timeline",
  "specialists": [
    {
      "id": "researcher-1",
      "role": "researcher",
      "systemPrompt": "You are a research specialist. Your job is to gather comprehensive information from multiple sources and synthesize key findings.",
      "provider": "openai",
      "model": "gpt-4-turbo"
    },
    {
      "id": "analyst-1",
      "role": "analyst",
      "systemPrompt": "You are an industry analyst. Your job is to analyze market dynamics, competitive landscape, and business implications.",
      "provider": "anthropic",
      "model": "claude-3-opus-20240229"
    },
    {
      "id": "synthesizer-1",
      "role": "synthesizer",
      "systemPrompt": "You are a synthesis specialist. Your job is to combine multiple perspectives into coherent insights and identify patterns.",
      "provider": "openai",
      "model": "gpt-4-turbo"
    }
  ],
  "output": {
    "directory": "./spreads/quantum-computing-research",
    "format": "markdown",
    "createIndex": true
  }
}
```

### Files to Create

1. **Providers** (1,200+ lines)
   - `packages/spreader-tool/src/providers/provider.ts` (interface)
   - `packages/spreader-tool/src/providers/openai.ts`
   - `packages/spreader-tool/src/providers/anthropic.ts`
   - `packages/spreader-tool/src/providers/ollama.ts`
   - `packages/spreader-tool/src/providers/mcp.ts`
   - `packages/spreader-tool/src/providers/registry.ts`

2. **Documentation** (2,000+ lines)
   - `packages/spreader-tool/README.md`
   - `packages/spreader-tool/docs/getting-started.md`
   - `packages/spreader-tool/docs/configuration.md`
   - `packages/spreader-tool/docs/specialists.md`
   - `packages/spreader-tool/docs/providers.md`
   - `packages/spreader-tool/docs/output.md`
   - `packages/spreader-tool/docs/api.md`
   - `packages/spreader-tool/docs/examples.md`

3. **Examples** (800+ lines)
   - `packages/spreader-tool/examples/research-spread.json`
   - `packages/spreader-tool/examples/architecture-spread.json`
   - `packages/spreader-tool/examples/world-building-spread.json`
   - `packages/spreader-tool/examples/code-analysis-spread.json`
   - `packages/spreader-tool/examples/.spreads/` (example outputs)

4. **Tests** (400+ lines, 40+ tests)
   - `packages/spreader-tool/src/providers/__tests__/openai.test.ts`
   - `packages/spreader-tool/src/providers/__tests__/anthropic.test.ts`
   - `packages/spreader-tool/src/providers/__tests__/ollama.test.ts`
   - `packages/spreader-tool/src/providers/__tests__/registry.test.ts`

### Success Criteria
- ✅ 3+ providers integrated (OpenAI, Anthropic, Ollama)
- ✅ Provider registry with auto-detection
- ✅ Comprehensive README (clear value prop)
- ✅ Getting started guide (5-minute setup)
- ✅ 4+ working examples
- ✅ API documentation complete
- ✅ Zero TypeScript errors
- ✅ 40+ test cases

---

## Phase 1 Success Criteria

**Overall:**
- ✅ Spreader works as completely independent tool
- ✅ Zero PersonalLog dependencies
- ✅ CLI functional and intuitive
- ✅ Beautiful markdown output (specialists + index)
- ✅ 3+ LLM providers supported
- ✅ Full context architecture working
- ✅ Ralph Wiggum summarization functional
- ✅ **180+ test cases total** (80 + 60 + 40)
- ✅ Comprehensive documentation
- ✅ Ready for GitHub release

**Technical Excellence:**
- TypeScript strict mode (zero errors)
- Comprehensive test coverage (>80%)
- Production-ready code quality
- Performance optimized

**User Experience:**
- 5-minute setup from install to first spread
- Clear, helpful error messages
- Beautiful CLI output
- Intuitive configuration
- Excellent documentation

---

## Next Steps After Phase 1

1. Review all delivered code
2. Run comprehensive test suite
3. Test as completely independent tool (fresh Node.js project)
4. Create git repository
5. Write first release notes
6. **Publish to GitHub** (https://github.com/SuperInstance/Spreader-tool)
7. Move to Phase 2: Cascade Router extraction

**Phase 1 Status:** 🎯 READY TO START
