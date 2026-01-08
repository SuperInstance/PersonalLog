# Spreader User Guide

**Your Research Multiplier**

---

## What is Spreader?

Spreader is a parallel multi-agent research tool that takes complex requests and breaks them into specialized tasks, each handled by an AI agent working independently. Think of it as having a team of research assistants working simultaneously on different aspects of your project.

### What Problem Does It Solve?

**The Problem:** AI models have limited context windows. When you ask them to do too much at once, quality degrades. Also, doing things sequentially takes forever.

**The Spreader Solution:**
1. Split complex tasks into focused specialties
2. Assign each specialty to a dedicated agent with full context
3. Work in parallel (3x faster than sequential)
4. Synthesize results into organized documentation

### Real-World Example

**Before Spreader:**
```
You: "Design a complete e-commerce system"
AI: [Gives shallow overview of everything, misses important details]
Time: 5 minutes
Quality: Surface-level
```

**After Spreader:**
```
You: "Design a complete e-commerce system"
Spreader: [Creates 6 specialists]
  ├─ Database specialist → [Detailed schema, indexing strategies]
  ├─ API specialist → [REST endpoints, authentication, rate limiting]
  ├─ Frontend specialist → [React components, state management]
  ├─ Security specialist → [Payment processing, data protection]
  ├─ DevOps specialist → [CI/CD, scaling, monitoring]
  └─ UX specialist → [User flows, accessibility, responsive design]

Time: 5 minutes (parallel work!)
Quality: Deep, comprehensive, production-ready
Output: 6 detailed markdown files + summary
```

---

## When to Use Spreader

Use Spreader when:

**Perfect For:**
- Researching complex topics from multiple angles
- Breaking down large projects into components
- Getting comprehensive technical documentation
- Exploring multiple solution approaches
- Generating content at scale
- Code architecture and design

**Not Ideal For:**
- Simple, single-step tasks (just ask the AI directly)
- Tasks requiring strict sequential order
- Quick questions (overkill)

---

## Installation

### Option 1: CLI Tool (Recommended for Most Users)

```bash
# Install globally
npm install -g @superinstance/spreader

# Or use npx (no installation needed)
npx @superinstance/spreader run "Your task here"
```

### Option 2: Library (For Developers)

```bash
npm install @superinstance/spreader
```

```typescript
import { Spreader } from '@superinstance/spreader'

const spreader = new Spreader()
const result = await spreader.run({
  task: "Your complex task",
  specialists: ['researcher', 'architect', 'critic']
})
```

---

## Quick Start Guide

### Your First Spread

**Step 1: Run a simple spread**

```bash
spreader run "Research climate change solutions in: renewable energy, carbon capture, policy, technology"
```

**Step 2: Wait for completion**

Spreader will show progress:
```
✓ Created 4 specialist agents
  ├─ Renewable Energy Researcher (working...)
  ├─ Carbon Capture Researcher (working...)
  ├─ Policy Researcher (working...)
  └─ Technology Researcher (working...)

Progress: [████████░░] 75% complete
```

**Step 3: View results**

Results are saved to `./spreader-output/`:
```
spreader-output/
├── specialist-1-renewable-energy.md
├── specialist-2-carbon-capture.md
├── specialist-3-policy.md
├── specialist-4-technology.md
└── index.md  ← Start here!
```

**Step 4: Read the summary**

```bash
cat spreader-output/index.md
```

You'll see a summary with links to each specialist's work.

---

## Core Concepts

### 1. Specialists

A **specialist** is an AI agent with a specific role and expertise. Each specialist:
- Gets the full context of your original request
- Works independently on their specialty
- Produces detailed, focused output
- Doesn't know what other specialists are doing (until merge)

**Built-in Specialists:**
- `researcher` - Deep research and information gathering
- `architect` - System design and architecture
- `coder` - Implementation and code writing
- `critic` - Review and identify issues
- `writer` - Documentation and content creation
- `analyst` - Data analysis and insights
- `tester` - Testing strategies and test plans

### 2. Spreads

A **spread** is a single execution of Spreader with specific tasks and specialists.

**Example Spread:**
```typescript
{
  task: "Build a REST API for a todo app",
  specialists: ['architect', 'coder', 'tester'],
  context: {
    tech_stack: ['Node.js', 'Express', 'PostgreSQL'],
    requirements: ['JWT auth', 'CRUD operations', 'input validation']
  }
}
```

### 3. DAG Execution (Advanced)

Spreader supports **Directed Acyclic Graphs** for tasks with dependencies.

**Example: Task B depends on Task A**

```bash
spreader run "Design API (1), Implement API (2) depends on 1, Write tests (3) depends on 2"
```

Execution order:
1. Design API (starts immediately)
2. Implement API (waits for Design)
3. Write tests (waits for Implementation)

### 4. Merging

After specialists complete their work, Spreader can **merge** their results into a coherent whole.

**Merge Strategies:**
- `concatenate` - Just stitch outputs together
- `synthesize` - Create a unified summary
- `debate` - Have specialists critique each other's work
- `integrate` - Merge into a single document

---

## Common Patterns

### Pattern 1: Parallel Research

**Goal:** Research a topic from multiple perspectives

```bash
spreader run \
  --specialists researcher,researcher,researcher \
  --perspectives technical,business,ethical \
  "Research AI in healthcare"
```

**Output:**
- Technical perspective (algorithms, implementation)
- Business perspective (market, ROI, regulation)
- Ethical perspective (privacy, bias, consent)

### Pattern 2: Architecture Design

**Goal:** Design a complete system architecture

```bash
spreader run \
  --specialists architect,architect,architect,architect \
  --focus frontend,backend,database,devops \
  "Design a microservices architecture for a SaaS platform"
```

**Output:**
- Frontend architecture (UI, state management, routing)
- Backend architecture (APIs, services, messaging)
- Database architecture (schemas, scaling, caching)
- DevOps architecture (CI/CD, monitoring, scaling)

### Pattern 3: Code Generation

**Goal:** Generate multiple related components

```bash
spreader run \
  --specialists coder,coder,coder \
  --components auth,database,api \
  "Implement a user authentication system"
```

**Output:**
- Auth component (login, registration, JWT)
- Database component (migrations, models, queries)
- API component (endpoints, validation, error handling)

### Pattern 4: Review & Critique

**Goal:** Get comprehensive code review

```bash
spreader run \
  --specialists critic,critic,critic \
  --focus security,performance,maintainability \
  --code ./src/auth.ts \
  "Review this authentication code"
```

**Output:**
- Security review (vulnerabilities, best practices)
- Performance review (bottlenecks, optimization)
- Maintainability review (code quality, documentation)

### Pattern 5: Documentation Generation

**Goal:** Generate comprehensive documentation

```bash
spreader run \
  --specialists writer,writer,writer \
  --docs api,user-guide,architecture \
  --code ./src \
  "Generate documentation for this project"
```

**Output:**
- API documentation (endpoints, schemas, examples)
- User guide (installation, usage, troubleshooting)
- Architecture documentation (design, patterns, decisions)

---

## Advanced Usage

### Custom Specialists

Define your own specialist roles:

```typescript
// custom-specialists.json
{
  "specialists": [
    {
      "name": "security-expert",
      "system_prompt": "You are a cybersecurity expert with 20 years of experience. Focus on security vulnerabilities, best practices, and threat modeling.",
      "temperature": 0.3,
      "max_tokens": 2000
    },
    {
      "name": "ux-designer",
      "system_prompt": "You are a UX designer specializing in accessible, user-friendly interfaces. Focus on user flows, accessibility, and design patterns.",
      "temperature": 0.7,
      "max_tokens": 1500
    }
  ]
}
```

```bash
spreader run --config custom-specialists.json "Your task"
```

### Context Optimization

Spreader can optimize context before spreading:

```bash
spreader run \
  --optimize-context \
  --context-window 4000 \
  "Research quantum computing applications"
```

This compresses your conversation history to focus on relevant information before creating specialists.

### Dependency-Aware Spreads

Define complex task dependencies:

```bash
spreader run "
  Research authentication methods (1)
  Design auth system (2) depends on 1
  Implement auth (3) depends on 2
  Write tests (4) depends on 3
  Document API (5) depends on 2
"
```

Spreader creates a DAG and executes tasks in dependency order.

### Auto-Merge

Automatically merge results when all specialists complete:

```bash
spreader run \
  --auto-merge \
  --merge-strategy synthesize \
  "Research: frontend frameworks, backend frameworks, databases"
```

Output includes:
- Individual specialist reports
- Synthesized summary
- Cross-specialist insights
- Recommendations

---

## Configuration

### CLI Configuration

Create `~/.spreader/config.yaml`:

```yaml
# Default settings
defaults:
  max_parallel: 5
  timeout: 300  # seconds
  output_dir: "./spreader-output"
  merge_strategy: synthesize

# Model settings
models:
  provider: openai  # or anthropic, local, etc.
  model: gpt-4
  temperature: 0.7
  max_tokens: 2000

# Specialist defaults
specialists:
  researcher:
    temperature: 0.3
    max_tokens: 3000
  coder:
    temperature: 0.2
    max_tokens: 4000
  writer:
    temperature: 0.8
    max_tokens: 2500

# Context optimization
optimization:
  enabled: true
  target_ratio: 0.8  # Keep 80% of context
  strategy: hybrid
```

### Environment Variables

```bash
# Required for OpenAI
export OPENAI_API_KEY="sk-..."

# Required for Anthropic
export ANTHROPIC_API_KEY="sk-..."

# Optional: Local model (Ollama)
export SPREADER_MODEL_PROVIDER="local"
export SPREADER_MODEL_BASE_URL="http://localhost:11434"
export SPREADER_MODEL_NAME="llama3"
```

---

## Tips and Tricks

### Tip 1: Be Specific with Tasks

**Bad:**
```bash
spreader run "Build a website"
```

**Good:**
```bash
spreader run "Build a React-based e-commerce site with: product catalog, shopping cart, checkout flow, user authentication"
```

### Tip 2: Use Appropriate Specialists

**Bad:**
```bash
spreader run --specialists coder,coder "Research quantum computing"
```

**Good:**
```bash
spreader run --specialists researcher,researcher,researcher "Research quantum computing in: physics, computer science, cryptography"
```

### Tip 3: Limit Parallel Specialists

```bash
# Too many specialists can be overwhelming
spreader run --max-parallel 3 "Your task"  # Good
spreader run --max-parallel 10 "Your task"  # Probably too many
```

### Tip 4: Provide Context

```bash
# Spreader can read files for context
spreader run \
  --context ./project-spec.md \
  --context ./requirements.txt \
  "Design the system architecture"
```

### Tip 5: Use DAG for Complex Projects

```bash
# Break down complex projects with dependencies
spreader run "
  (1) Research requirements
  (2) Design architecture depends on 1
  (3) Design database depends on 2
  (4) Implement API depends on 2
  (5) Implement frontend depends on 2
  (6) Write tests depends on 3,4
  (7) Deploy depends on 3,4,5,6
"
```

---

## Troubleshooting

### Issue: "Too many specialists, costs exploding"

**Solution:**
```bash
# Limit parallel specialists
spreader run --max-parallel 3 "Your task with many subtasks"
```

### Issue: "Specialists produced conflicting outputs"

**Solution:**
```bash
# Add a critic specialist to resolve conflicts
spreader run \
  --specialists architect,architect,critic \
  "Design two approaches and have the critic decide"
```

### Issue: "Output is too verbose"

**Solution:**
```bash
# Limit token count per specialist
spreader run --max-tokens 1000 "Your task"
```

### Issue: "Context is too large, errors"

**Solution:**
```bash
# Enable context optimization
spreader run --optimize-context --target-tokens 8000 "Your task"
```

---

## Examples

### Example 1: Research Project

```bash
spreader run \
  --specialists researcher,researcher,researcher,researcher \
  "Research the future of electric vehicles in: battery technology, charging infrastructure, market trends, environmental impact"
```

**Output:** 4 comprehensive research papers + synthesis

### Example 2: Software Architecture

```bash
spreader run \
  --specialists architect,architect,architect \
  --focus frontend,backend,data \
  "Design a real-time collaborative document editor like Google Docs"
```

**Output:** 3 architecture documents covering all aspects

### Example 3: Content Creation

```bash
spreader run \
  --specialists writer,writer,writer \
  --perspectives technical,marketing,educational \
  "Write blog posts about WebAssembly"
```

**Output:** 3 blog posts targeting different audiences

### Example 4: Code Analysis

```bash
spreader run \
  --specialists analyst,analyst,analyst \
  --focus performance,security,maintainability \
  --code ./src \
  "Analyze this codebase"
```

**Output:** 3 analysis reports with recommendations

---

## Best Practices

1. **Start Simple:** Begin with 2-3 specialists, scale up if needed

2. **Define Clear Roles:** Each specialist should have a focused responsibility

3. **Provide Context:** Give specialists the background they need

4. **Review Outputs:** Don't blindly accept specialist outputs - review and refine

5. **Use Dependencies:** For complex projects, define task dependencies with DAG

6. **Optimize Context:** Enable context optimization for large conversations

7. **Set Timeouts:** Prevent runaway specialist tasks with timeout limits

8. **Merge Intelligently:** Choose merge strategy based on your goal

---

## Reference

### CLI Commands

```bash
# Run a spread
spreader run "Your task"

# Specify specialists
spreader run --specialists researcher,coder "Your task"

# Set max parallel specialists
spreader run --max-parallel 3 "Your task"

# Enable context optimization
spreader run --optimize-context "Your task"

# Auto-merge results
spreader run --auto-merge "Your task"

# Use custom config
spreader run --config ./my-config.yaml "Your task"

# View last spread result
spreader show

# List spreads
spreader list

# Clean output directory
spreader clean
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `--max-parallel` | 5 | Maximum parallel specialists |
| `--timeout` | 300 | Timeout per specialist (seconds) |
| `--output-dir` | ./spreader-output | Output directory |
| `--merge-strategy` | synthesize | How to merge results |
| `--optimize-context` | false | Enable context optimization |
| `--max-tokens` | 2000 | Max tokens per specialist |
| `--temperature` | 0.7 | AI temperature (0-1) |

---

## Next Steps

1. Try the examples above
2. Create custom specialists for your domain
3. Integrate Spreader into your workflow
4. Share your spreads with the community

**Need help?** Check out our [GitHub Discussions](https://github.com/SuperInstance/Spreader-tool/discussions)

**Want to contribute?** See [CONTRIBUTING.md](https://github.com/SuperInstance/Spreader-tool/blob/main/CONTRIBUTING.md)
