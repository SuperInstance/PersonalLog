# PersonalLog Independent Tools - User Guide

**Welcome to the PersonalLog Tool Ecosystem!**

This guide will help you discover and use powerful AI orchestration tools that make working with AI agents easier, faster, and more productive. Whether you're a developer, researcher, or AI enthusiast, these tools are designed to help you get more done with less effort.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Tool Gallery](#tool-gallery)
3. [Toolkits](#toolkits)
4. [Integration Guide](#integration-guide)
5. [Troubleshooting](#troubleshooting)
6. [FAQ](#faq)

---

## Quick Start

### Get Started in 5 Minutes

**Step 1: Install Your First Tool**

```bash
# Install Spreader (parallel multi-agent research)
npm install -g @superinstance/spreader

# Or install Cascade Router (intelligent LLM routing)
npm install -g @superinstance/cascade-router
```

**Step 2: Run Your First Command**

```bash
# Spreader: Research multiple topics in parallel
spreader run "Research quantum computing applications in: healthcare, finance, cryptography"

# Cascade Router: Optimize your LLM costs
cascade-router --model auto --budget 10.00 "Analyze this codebase for security issues"
```

**Step 3: See the Results**

Results are saved as organized markdown files that you can:
- Read in any text editor
- Share with your team
- Feed into other AI tools
- Keep as documentation

That's it! You're now using AI orchestration tools that normally cost thousands of dollars.

---

## Tool Gallery

### Spreader 📚

**What it does:** Spreader takes one request and creates multiple AI agents that work on different parts of it simultaneously. Each agent is a specialist with full context of your original request.

**When to use it:**
- Researching complex topics from multiple angles
- Breaking down large projects into parallel tasks
- Getting comprehensive analysis faster
- Generating documentation from code
- Multi-perspective brainstorming

**Quick Example:**

```bash
spreader run "Design a microservices architecture for: authentication, data processing, notifications"
```

**What happens:**
1. Spreader creates 3 specialist agents
2. Each agent researches their specialty deeply
3. They work in parallel (3x faster!)
4. You get 3 detailed markdown files + summary

**Output structure:**
```
my-research/
├── specialist-1-authentication.md     # Auth specialist's work
├── specialist-2-data-processing.md    # Data specialist's work
├── specialist-3-notifications.md      # Notification specialist's work
└── index.md                           # Summary with links
```

**Common Use Cases:**

1. **Research:** `spreader run "Compare approaches to: neural network architectures, optimization techniques, data preprocessing"`

2. **Architecture:** `spreader run "Design system components: user management, API gateway, database layer, caching strategy"`

3. **Content Creation:** `spreader run "Write blog posts about: microservices, serverless, containerization, DevOps"`

4. **Code Analysis:** `spreader run "Analyze codebase for: performance, security, maintainability, test coverage"`

5. **Brainstorming:** `spreader run "Generate ideas for: product features, marketing channels, revenue models, user acquisition"`

**Pro Tip:** Use Spreader when you need depth and breadth. Each specialist goes deep on their topic while you get broad coverage across all areas.

**Learn More:** [Complete Spreader User Guide](./guides/users/spreader-user-guide.md)

---

### Cascade Router 🔄

**What it does:** Cascade Router intelligently chooses the best AI model for each task, optimizing for cost, speed, and quality. It routes easy tasks to fast/cheap models and hard tasks to powerful/expensive ones.

**When to use it:**
- Building AI-powered applications
- Managing API costs across multiple LLMs
- Need reliable fallback strategies
- Want progress monitoring for long tasks
- Balancing speed vs quality

**Quick Example:**

```bash
cascade-router --budget 5.00 --model auto "Summarize these 100 documents"
```

**What happens:**
1. Cascade analyzes the task complexity
2. Routes to local model for simple docs (free!)
3. Routes to GPT-4 for complex docs (when needed)
4. Stays under your $5 budget
5. Shows real-time progress

**Configuration Example:**

```yaml
# cascade-config.yaml
providers:
  - name: ollama-llama3
    type: local
    priority: 1
    cost_per_1k_tokens: 0

  - name: gpt-3.5-turbo
    type: openai
    priority: 2
    cost_per_1k_tokens: 0.002

  - name: gpt-4
    type: openai
    priority: 3
    cost_per_1k_tokens: 0.03

routing:
  strategy: smart  # auto, cost, speed, quality
  budget_per_hour: 10.00
  fallback_enabled: true
```

**Common Use Cases:**

1. **Chatbot:** Route simple questions to cheap models, complex ones to GPT-4

2. **Batch Processing:** Process 1000s of documents with automatic cost optimization

3. **API Integration:** Add intelligent routing to any LLM-powered feature

4. **Development:** Test with local models, deploy with cloud models

5. **Cost Control:** Set strict budgets and get alerts before overspending

**Pro Tip:** Start with `--model auto` to let Cascade learn which models work best for your tasks. Over time, it gets smarter about routing.

**Learn More:** [Complete Cascade Router User Guide](./guides/users/cascade-router-user-guide.md)

---

### JEPA (Emotional Subtext Analyzer) 🎙️

**What it does:** JEPA analyzes emotional undertones in conversations using voice analysis. It detects frustration, satisfaction, confusion, and more in real-time.

**When to use it:**
- Building conversational AI
- Customer support analytics
- User research and feedback
- Meeting sentiment analysis
- Mental health apps

**Quick Example:**

```javascript
import { getJEPAAgent } from '@superinstance/jepa'

const agent = await getJEPAAgent()
await agent.startRecording()

// Analyze conversation in real-time
agent.on('emotion_analyzed', (data) => {
  console.log('Emotion:', data.emotion.emotions)
  console.log('Valence:', data.emotion.valence)  // 0-1 (negative to positive)
  console.log('Arousal:', data.emotion.arousal)  // 0-1 (calm to energetic)

  if (data.emotion.valence < 0.3 && data.emotion.arousal > 0.7) {
    console.log('⚠️ User is frustrated!')
  }
})
```

**What it detects:**
- **Valence:** How positive/negative (0.0 = very negative, 1.0 = very positive)
- **Arousal:** Energy/intensity level (0.0 = calm, 1.0 = excited)
- **Dominance:** Confidence/assertiveness (0.0 = submissive, 1.0 = confident)
- **Emotions:** happy, sad, angry, frustrated, excited, neutral, etc.

**Common Use Cases:**

1. **Customer Support:** Detect frustrated customers and escalate to human agents

2. **UX Research:** Understand user emotions during testing sessions

3. **Meeting Intelligence:** Track team sentiment during retrospectives

4. **Mental Health:** Monitor emotional patterns over time (with consent)

5. **AI Assistant:** Adjust AI responses based on user's emotional state

**Pro Tip:** JEPA works best when combined with other tools. Use it with Spreader to emotionally-aware parallel research, or with Cascade Router to adjust model selection based on user frustration.

**Learn More:** [Complete JEPA User Guide](./guides/users/jepa-user-guide.md)

---

### Hardware Detection Toolkit 🔍

**What it does:** Comprehensive hardware capability detection for browser environments. Tells you exactly what the user's device can handle.

**When to use it:**
- Building performance-critical web apps
- Deciding when to use ML models in the browser
- Progressive enhancement strategies
- GPU acceleration decisions
- Memory management

**Quick Example:**

```javascript
import { getHardwareInfo } from '@superinstance/hardware-detector'

const result = await getHardwareInfo()

console.log('Performance Score:', result.profile.performanceScore)  // 0-100
console.log('Performance Class:', result.profile.performanceClass)  // premium, high, medium, low
console.log('CPU Cores:', result.profile.cpu.cores)
console.log('GPU:', result.profile.gpu.webgpu.supported ? 'WebGPU available' : 'WebGL only')
console.log('Memory:', result.profile.memory.totalGB, 'GB')
console.log('Network:', result.profile.network.effectiveType)  // 4g, 3g, 2g
```

**What it detects:**
- CPU cores, architecture, SIMD, WebAssembly capabilities
- GPU (WebGPU, WebGL2), VRAM estimates
- Memory (RAM, JS heap limits)
- Storage (IndexedDB, quota, storage type)
- Network (connection type, speed, RTT)
- Display (resolution, pixel ratio, color depth)
- Browser (name, version, OS)
- Features (Web Workers, Service Workers, WebRTC, etc.)

**Common Use Cases:**

1. **ML in Browser:** Only load heavy models if device can handle it

2. **Performance Scaling:** Adjust quality settings based on hardware score

3. **Feature Detection:** Show/hide features based on capabilities

4. **Progressive Enhancement:** Start basic, upgrade if hardware allows

5. **Analytics:** Understand your users' hardware landscape

**Pro Tip:** Use the performance score (0-100) to make quick decisions. Score > 70 = enable advanced features, Score < 40 = use basic mode.

**Learn More:** [Complete Hardware Detection User Guide](./guides/users/hardware-detection-user-guide.md)

---

### Vector Store & Semantic Search 🔎

**What it does:** Fast, browser-based vector database for semantic search. Stores and retrieves documents by meaning, not just keywords.

**When to use it:**
- Building semantic search
- Document similarity matching
- RAG (Retrieval Augmented Generation)
- Recommendation systems
- Knowledge management

**Quick Example:**

```javascript
import { VectorStore } from '@superinstance/vector-store'

const store = new VectorStore()

// Add documents
await store.addDocument('doc1', 'Machine learning is a subset of AI')
await store.addDocument('doc2', 'Deep learning uses neural networks')
await store.addDocument('doc3', 'Pizza is delicious with cheese')

// Search by meaning
const results = await store.search('AI technology')
// Returns: doc1 (0.89), doc2 (0.75) - but not doc3!
```

**Features:**
- Runs entirely in browser (no server needed!)
- Uses IndexedDB for persistent storage
- Supports any embedding model
- Fast similarity search
- Automatic indexing
- Filter by metadata

**Common Use Cases:**

1. **Semantic Search:** Find documents by meaning, not keywords

2. **RAG Systems:** Retrieve relevant context for LLM queries

3. **Document Clustering:** Group similar documents automatically

4. **Recommendations:** "Users who liked X also liked Y"

5. **Knowledge Base:** Build intelligent FAQ systems

**Pro Tip:** Combine with Cascade Router for cheap semantic search. Use local embeddings for free, only upgrade to OpenAI embeddings for complex queries.

**Learn More:** [Complete Vector Store User Guide](./guides/users/vector-store-user-guide.md)

---

## Toolkits

Tools are powerful on their own, but they're **unstoppable when combined**. Here are pre-configured toolkits for common workflows.

### Research Kit 📊

**Tools:** Spreader + Vector Store + Cascade Router

**Perfect for:** Academic research, market analysis, competitive intelligence

**Workflow:**

```bash
# 1. Use Spreader for parallel research
spreader run "Research electric vehicle market in: technology, competitors, regulations, consumer trends"

# 2. Automatically indexed in Vector Store
# All research is searchable by meaning

# 3. Use Cascade Router for cost-effective follow-up
cascade-router --budget 2.00 "What are the key barriers to EV adoption?"

# Cascade finds relevant research in Vector Store (free!)
# Only queries GPT-4 for gaps (expensive but necessary)
```

**Why this works:**
- Spreader gives you breadth (multiple perspectives)
- Vector Store gives you depth (semantic search)
- Cascade Router gives you efficiency (cost optimization)

**Time saved:** 10x (parallel research + smart caching)
**Cost saved:** 70% (local cache + smart routing)

---

### Agent Kit 🤖

**Tools:** Spreader + Cascade Router + JEPA

**Perfect for:** Building AI-powered applications, user-facing AI assistants

**Workflow:**

```javascript
// 1. JEPA monitors user emotions
jepa.on('emotion_analyzed', (emotion) => {
  if (emotion.valence < 0.4) {
    // User is frustrated - escalate to better model
    cascade.setStrategy('quality')
  }
})

// 2. Cascade Router chooses model based on task
const response = await cascade.route({
  task: userQuery,
  strategy: 'auto',  // JEPA can override this
  budget: 1.00
})

// 3. Complex tasks get spread to specialists
if (response.complexity === 'high') {
  const specialists = await spreader.spawn(userQuery, [
    'researcher',
    'architect',
    'critic'
  ])
}
```

**Why this works:**
- JEPA provides emotional intelligence
- Cascade Router optimizes cost/quality
- Spreader handles complex tasks

**User experience:** Seamless, adaptive, intelligent AI assistant

---

### Performance Kit ⚡

**Tools:** Hardware Detection + Cascade Router + Vector Store

**Perfect for:** Building performance-optimized web apps

**Workflow:**

```javascript
// 1. Detect hardware capabilities
const hw = await getHardwareInfo()

if (hw.performanceScore > 70) {
  // Premium device - use advanced features
  await loadLocalMLModel()
  vectorStore.setSearchAlgorithm('hnlib')  // Faster but more memory
} else {
  // Basic device - use lighter approach
  cascade.setPreferredModels(['gpt-3.5-turbo'])  // Cheaper
  vectorStore.setSearchAlgorithm('linear')  // Slower but less memory
}

// 2. Route tasks based on hardware
if (hw.gpu.webgpu.supported) {
  // Use GPU acceleration
  processVideoOnGPU(videoFile)
} else {
  // Fall back to CPU
  processVideoOnCPU(videoFile)
}
```

**Why this works:**
- Apps work on any device (from low-end phones to gaming PCs)
- Automatically optimize for user's hardware
- Progressive enhancement approach

**Result:** Happy users, regardless of their device

---

## Integration Guide

### How Tools Work Together

```
User Request
    ↓
[Hardware Detection] ← "Can this device handle this?"
    ↓
Cascade Router ← "Which model should I use?"
    ↓
    ├─→ Simple Task → Local Model (Fast, Free)
    ├─→ Medium Task → GPT-3.5 (Fast, Cheap)
    └─→ Complex Task → Spreader (Parallel Agents)
              ↓
        [JEPA] ← "Is user frustrated?"
              ↓
        Emotion-Aware Routing
              ↓
        Vector Store ← "Have I seen this before?"
              ↓
        Cached Results or New Processing
```

### Synergy Patterns

**Pattern 1: Emotional Cost Optimization**

JEPA detects frustration → Cascade switches to better model → User happier, costs justified

**Pattern 2: Hardware-Aware Routing**

Hardware detection → Cascade chooses local vs cloud → Best performance/cost tradeoff

**Pattern 3: Semantic Caching**

Vector Store remembers past queries → Cascade checks cache first → Avoid redundant API calls

**Pattern 4: Parallel Specialist Research**

Complex task → Spreader spawns specialists → Results stored in Vector Store → Future queries reuse

**Pattern 5: Progressive Enhancement**

Hardware detection → Enable advanced features if capable → Fall back gracefully if not

### Best Practices

1. **Start Simple:** Use one tool at a time, then combine

2. **Measure Everything:** Track costs, latency, user satisfaction

3. **Cache Aggressively:** Vector Store is free, APIs aren't

4. **Monitor Hardware:** Not everyone has a gaming PC

5. **Be Emotionally Aware:** Frustrated users don't care about your cost optimization

---

## Troubleshooting

### Common Issues

**Issue:** Spreader creates too many agents, costs explode

**Solution:**
```bash
# Limit parallel agents
spreader run --max-parallel 3 "Research: A, B, C, D, E"
```

**Issue:** Cascade Router keeps hitting budget limits

**Solution:**
```yaml
# Set per-request budget, not hourly
cascade-router --max-request-cost 0.50 "Your task"
```

**Issue:** JEPA not detecting emotions accurately

**Solution:**
```javascript
// JEPA needs training data for your specific domain
await agent.calibrate(domain: 'customer-support')
```

**Issue:** Hardware detection fails on some browsers

**Solution:**
```javascript
// Always provide fallbacks
const hw = await getHardwareInfo()
const score = hw.success ? hw.profile.performanceScore : 50  // Default to medium
```

**Issue:** Vector Store search is slow

**Solution:**
```javascript
// Use filters to reduce search space
const results = await store.search(query, {
  filter: { category: 'tech' },
  limit: 10
})
```

### Getting Help

- **Documentation:** Each tool has its own detailed guide
- **Examples:** Check the `/examples` directory in each repo
- **Issues:** Report bugs on GitHub
- **Discord:** Join our community (link in repo README)

---

## FAQ

**Q: Are these tools really free?**

A: The tools themselves are free and open source. However, some tools (like Cascade Router) can call paid APIs (OpenAI, Anthropic, etc.). You control which APIs you use and can run everything locally for free.

**Q: What if I'm not a developer?**

A: We're working on no-code interfaces! In the meantime, check out our pre-built examples and templates. Many tasks can be done with simple command-line commands.

**Q: Can I use these commercially?**

A: Yes! All tools are MIT-licensed. You can use them in commercial projects without restrictions.

**Q: How do these compare to LangChain, AutoGPT, etc.?**

A: These tools are **modular and composable**. You can use them alone or combine them. They're designed to be **model-agnostic** (work with any LLM) and **framework-agnostic** (work with any tech stack).

**Q: What's coming next?**

A: We're working on:
- No-code UI for all tools
- More specialist agents for Spreader
- Additional providers for Cascade Router
- Enhanced emotion models for JEPA
- Cloud sync for Vector Store

**Q: How can I contribute?**

A: We'd love your help! Check out the `CONTRIBUTING.md` in each repository. Areas we need help:
- Additional language examples
- New provider integrations
- Bug fixes and performance improvements
- Documentation improvements
- Community support

---

## Next Steps

1. **Pick a tool** that solves your current problem
2. **Read its detailed guide** (linked above)
3. **Try the examples** in the guide
4. **Join our community** to share your experience
5. **Build something amazing** and tell us about it!

**Remember:** These tools are designed to make you more productive. Start simple, iterate, and combine them as needed.

---

**Happy Building! 🚀**

*Questions? Issues? Ideas? We're on GitHub: https://github.com/SuperInstance*
