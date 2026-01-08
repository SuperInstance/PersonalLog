# Quick Reference Cards

**One-page cheat sheets for all PersonalLog tools**

---

## Spreader Quick Reference

### What It Does
Parallel multi-agent research and synthesis

### Installation
```bash
npm install -g @superinstance/spreader
```

### Basic Usage
```bash
# Simple spread
spreader run "Research: topic A, topic B, topic C"

# With specific specialists
spreader run --specialists researcher,coder "Design a REST API"

# With dependencies (DAG)
spreader run "Task 1 (1), Task 2 (2) depends on 1, Task 3 (3) depends on 2"
```

### Common Specialists
- `researcher` - Deep research
- `architect` - System design
- `coder` - Implementation
- `critic` - Review & critique
- `writer` - Documentation

### Key Options
| Option | Description |
|--------|-------------|
| `--max-parallel N` | Max parallel specialists |
| `--auto-merge` | Merge results automatically |
| `--optimize-context` | Compress context before spread |
| `--merge-strategy` | concatenate, synthesize, debate |

### Output Structure
```
spreader-output/
├── specialist-1-[topic].md
├── specialist-2-[topic].md
├── specialist-3-[topic].md
└── index.md  ← Summary
```

### Common Patterns
```bash
# Parallel research
spreader run --specialists researcher,researcher,researcher \
  "Research X in: perspective A, perspective B, perspective C"

# Architecture design
spreader run --specialists architect,architect,architect \
  --focus frontend,backend,database \
  "Design a microservices system"

# Code generation
spreader run --specialists coder,coder,tester \
  "Implement authentication with tests"
```

### Troubleshooting
- **Cost exploding:** Use `--max-parallel 3`
- **Conflicting outputs:** Add a `critic` specialist
- **Context too large:** Use `--optimize-context`

---

## Cascade Router Quick Reference

### What It Does
Intelligent LLM routing for cost & quality optimization

### Installation
```bash
npm install -g @superinstance/cascade-router
```

### Configuration
```bash
cascade-router config init  # Creates ~/.cascade-router/config.yaml
```

### Basic Usage
```bash
# Auto routing (recommended)
cascade-router "Your question"

# Force strategy
cascade-router --strategy cost "Simple question"
cascade-router --strategy quality "Complex task"

# Set budget
cascade-router --budget 1.00 "Your task"

# Batch processing
cascade-router --batch ./docs/*.txt "Summarize each"
```

### Routing Strategies
| Strategy | Best For |
|----------|----------|
| `auto` | Let Cascade decide (recommended) |
| `cost` | Batch processing, background tasks |
| `speed` | Real-time responses, UI interactions |
| `quality` | Critical decisions, final outputs |

### Provider Setup
```yaml
providers:
  - name: ollama-llama3
    type: ollama
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
```

### Environment Variables
```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-..."
```

### Common Patterns
```typescript
// Chatbot with escalation
const router = new CascadeRouter()
const response = await router.route({
  task: userQuery,
  strategy: 'auto',
  budget: 0.50
})

// Progressive analysis
const quick = await router.route({
  task: "Quick analysis",
  strategy: 'cost'
})

if (quick.issues_found) {
  const deep = await router.route({
    task: "Deep analysis",
    strategy: 'quality'
  })
}
```

### Complexity Analysis
- **0-30:** Simple → Local/cheap models
- **30-60:** Medium → Mid-tier models
- **60-100:** Complex → Best models

### Troubleshooting
- **Always using expensive model:** Adjust complexity thresholds
- **Hitting budget limits:** Use `--strategy cost`
- **Too many fallbacks:** Reduce `max_attempts`

---

## JEPA Quick Reference

### What It Does
Real-time emotion detection from text and voice

### Installation
```bash
npm install -g @superinstance/jepa
```

### Basic Usage
```bash
# Analyze text emotion
jepa analyze "I'm so excited about this!"

# Analyze from file
jepa analyze --file feedback.txt

# Real-time monitoring
jepa monitor --conversation-id conv-123
```

### Library Usage
```javascript
import { getJEPAAgent } from '@superinstance/jepa'

const agent = getJEPAAgent()

// Analyze emotion
const emotion = await agent.processMessage({
  author: 'user',
  content: { text: "This is frustrating!" },
  timestamp: Date.now()
})

// Check dimensions
console.log('Valence:', emotion.valence)   // 0-1 (neg-pos)
console.log('Arousal:', emotion.arousal)   // 0-1 (calm-energy)
console.log('Dominance:', emotion.dominance) // 0-1 (sub-confident)
```

### VAD Model
| Dimension | Range | Meaning |
|-----------|-------|---------|
| Valence | 0.0-1.0 | Negative → Positive |
| Arousal | 0.0-1.0 | Calm → Energetic |
| Dominance | 0.0-1.0 | Submissive → Confident |

### Frustration Detection
```javascript
// Frustration pattern
if (emotion.valence < 0.4 && emotion.arousal > 0.6) {
  console.log('User is frustrated!')
  // Escalate to human
}
```

### Common Patterns
```javascript
// Emotionally-aware chatbot
jepa.on('emotion_analyzed', (data) => {
  if (data.emotion.valence < 0.3) {
    // User unhappy - be empathetic
    responseStyle = 'empathetic'
  } else if (data.emotion.valence > 0.7) {
    // User happy - match energy
    responseStyle = 'enthusiastic'
  }
})

// Frustration escalation
if (emotion.valence < 0.3 && emotion.arousal > 0.7) {
  escalateToHuman()
}
```

### Event Listeners
```javascript
agent.on('emotion_analyzed', callback)
agent.on('recording_started', callback)
agent.on('recording_stopped', callback)
agent.on('audio_window', callback)
```

### Configuration
```yaml
frustration:
  valence_threshold: 0.4
  arousal_threshold: 0.6
  consecutive_occurrences: 3  # Require 3 in a row
```

### Troubleshooting
- **Inaccurate detection:** Calibrate with domain-specific data
- **Too many false alarms:** Adjust thresholds up
- **Audio not working:** Check microphone permissions

---

## Hardware Detection Quick Reference

### What It Does
Comprehensive browser hardware capability detection

### Installation
```bash
npm install @superinstance/hardware-detector
```

### Basic Usage
```javascript
import { getHardwareInfo } from '@superinstance/hardware-detector'

const result = await getHardwareInfo()

console.log('Performance Score:', result.profile.performanceScore)  // 0-100
console.log('Performance Class:', result.profile.performanceClass)  // premium/high/medium/low
```

### Performance Classes
| Score | Class | Enable |
|-------|-------|--------|
| 90-100 | Premium | All features + GPU |
| 70-89 | High | Most features |
| 40-69 | Medium | Basic features |
| 0-39 | Low | Server-side |

### Quick Checks
```javascript
// Performance score only (faster)
const score = await getPerformanceScore()

// Feature detection only
const features = await detectCapabilities()

// Use caching
const detector = getDetector()
const result1 = await detector.getHardwareInfo()
const result2 = await detector.getHardwareInfo({ useCache: true })
```

### Common Patterns
```javascript
// Progressive ML loading
if (score > 70 && profile.gpu.webgpu.supported) {
  await loadLargeModel({ useGPU: true })
} else if (score > 50) {
  await loadMediumModel({ useGPU: false })
} else {
  await useServerModel()
}

// Feature flagging
const features = {
  gpuAcceleration: profile.gpu.webgpu.supported,
  webWorkers: profile.features.webWorkers,
  animations: profile.performanceScore > 50,
  advancedFeatures: profile.performanceScore > 70
}

// Adaptive quality
if (score > 70 && profile.network.effectiveType === '4g') {
  loadHDAssets()
} else {
  loadOptimizedAssets()
}
```

### Detection Options
```javascript
const result = await getHardwareInfo({
  detailedGPU: true,    // Slower, more detail
  checkQuota: true,      // Check storage quota
  detectWebGL: true,     // Detect WebGL
  useCache: true         // Use cached results
})
```

### Profile Structure
```javascript
{
  cpu: { cores, architecture, wasm, simd }
  gpu: { webgpu, webgl, vramMB, vendor }
  memory: { totalGB, jsHeap }
  storage: { indexedDB, quota, storageType }
  network: { effectiveType, downlinkMbps, rtt }
  display: { width, height, pixelRatio }
  browser: { browser, version, os }
  features: { webWorkers, serviceWorker, webrtc, ... }
  performanceScore: 72  // 0-100
  performanceClass: 'high'
}
```

### Troubleshooting
- **Detection slow:** Use `getPerformanceScore()` instead
- **Memory undefined:** API not available, use heuristics
- **WebGPU not detected:** Check HTTPS + browser support

---

## Vector Store Quick Reference

### What It Does
Browser-based vector database for semantic search

### Installation
```bash
npm install @superinstance/vector-store
```

### Basic Usage
```javascript
import { VectorStore } from '@superinstance/vector-store'

const store = new VectorStore()

// Add documents
await store.addDocument('doc1', 'Machine learning is a subset of AI')
await store.addDocument('doc2', 'Deep learning uses neural networks')

// Search by meaning
const results = await store.search('AI technology')
// Returns: [{ id: 'doc1', score: 0.89 }, { id: 'doc2', score: 0.75 }]
```

### Features
- Runs entirely in browser (no server)
- Uses IndexedDB for persistence
- Supports any embedding model
- Fast similarity search
- Filter by metadata

### Common Patterns
```javascript
// Semantic search
const results = await store.search('machine learning', {
  limit: 10,
  filter: { category: 'tech' }
})

// Add with metadata
await store.addDocument('doc1', 'Text content', {
  category: 'tech',
  author: 'Alice',
  date: '2024-01-01'
})

// Batch import
await store.addDocuments([
  { id: 'doc1', text: 'Text 1' },
  { id: 'doc2', text: 'Text 2' }
])

// Similarity search
const similar = await store.findSimilar('doc1', { limit: 5 })
```

### Configuration
```javascript
const store = new VectorStore({
  indexName: 'my-vector-store',
  embeddingModel: 'local',  // or 'openai', 'cohere', etc.
  dimensions: 384,           // Embedding dimensions
  metric: 'cosine'           // or 'euclidean', 'dotproduct'
})
```

### Integration with Cascade Router
```javascript
// Check cache first (free)
const cached = await vectorStore.search(query)

if (cached[0]?.score > 0.9) {
  // High similarity - use cached result
  return cached[0].text
} else {
  // Low similarity - use LLM (expensive)
  const result = await cascadeRouter.route({ task: query })

  // Cache for future
  await vectorStore.addDocument(generateId(), result.text)

  return result.text
}
```

### API Reference
```javascript
// CRUD
await store.addDocument(id, text, metadata?)
await store.addDocuments([{ id, text, metadata }])
await store.removeDocument(id)
await store.updateDocument(id, text, metadata?)

// Search
await store.search(query, options?)
await store.findSimilar(id, options?)
await store.hybridSearch(query, filters, options?)

// Management
await store.clear()
await store.getSize()
await store.export()
await store.import(data)
```

---

## Toolkits Quick Reference

### Research Kit
**Tools:** Spreader + Vector Store + Cascade Router

**Use For:** Academic research, market analysis, competitive intelligence

**Workflow:**
```bash
# Parallel research (cached for free)
spreader run "Research X in: A, B, C"

# Semantic search through research
# (handled by Vector Store automatically)

# Cost-effective follow-up
cascade-router --budget 2.00 "What did we learn about X?"
```

**Benefits:**
- 10x faster (parallel research)
- 70% cost savings (semantic caching)
- Comprehensive (multiple perspectives)

---

### Agent Kit
**Tools:** Spreader + Cascade Router + JEPA

**Use For:** AI-powered applications, user-facing assistants

**Workflow:**
```javascript
// JEPA monitors emotion
jepa.on('emotion_analyzed', (emotion) => {
  if (emotion.valence < 0.4) {
    // User frustrated - use better model
    cascade.setStrategy('quality')
  }
})

// Cascade routes task
const response = await cascade.route({
  task: userQuery,
  strategy: 'auto'
})

// Complex tasks get spread
if (response.complexity === 'high') {
  await spreader.spawn(userQuery, ['researcher', 'architect'])
}
```

**Benefits:**
- Emotionally-aware AI
- Cost-optimized routing
- Handles complex tasks

---

### Performance Kit
**Tools:** Hardware Detection + Cascade Router + Vector Store

**Use For:** Performance-optimized web apps

**Workflow:**
```javascript
// Detect hardware
const hw = await getHardwareInfo()

if (hw.performanceScore > 70) {
  // Enable advanced features
  await loadLocalMLModel()
  vectorStore.setAlgorithm('hnlib')
} else {
  // Use lighter approach
  cascade.setPreferredModels(['gpt-3.5-turbo'])
  vectorStore.setAlgorithm('linear')
}
```

**Benefits:**
- Works on any device
- Progressive enhancement
- Best performance/cost tradeoff

---

## Decision Matrix

### Which Tool Should I Use?

| Goal | Tool |
|------|------|
| Parallel research | Spreader |
| Reduce LLM costs | Cascade Router |
| Understand user emotions | JEPA |
| Optimize for hardware | Hardware Detection |
| Semantic search | Vector Store |
| Build chatbot | Agent Kit |
| Market research | Research Kit |
| Performance optimization | Performance Kit |

### Quick Decision Tree

```
Need to process multiple things in parallel?
├─ Yes → Spreader
└─ No
    ├─ Want to reduce API costs?
    │   ├─ Yes → Cascade Router
    │   └─ No
    │       ├─ Need emotional understanding?
    │       │   ├─ Yes → JEPA
    │       └─ Need device capabilities?
    │           └─ Yes → Hardware Detection
    └─ Need semantic search?
        └─ Yes → Vector Store
```

---

## Command Cheatsheet

### Spreader
```bash
spreader run "Task"
spreader run --specialists researcher,coder "Task"
spreader run --max-parallel 3 "Task"
spreader run --auto-merge "Task"
spreader show
spreader list
```

### Cascade Router
```bash
cascade-router "Question"
cascade-router --strategy cost "Question"
cascade-router --budget 5.00 "Question"
cascade-router --batch ./files/*.txt "Task"
cascade-router config init
cascade-router stats
```

### JEPA
```bash
jepa analyze "Text"
jepa analyze --file file.txt
jepa monitor --conversation-id <id>
jepa export --format markdown
```

### Hardware Detection
```bash
# No CLI - library only
import { getHardwareInfo } from '@superinstance/hardware-detector'
const result = await getHardwareInfo()
```

### Vector Store
```bash
# No CLI - library only
import { VectorStore } from '@superinstance/vector-store'
const store = new VectorStore()
```

---

## Quick Tips

### Spreader
- Start with 2-3 specialists
- Use DAG for dependencies
- Always auto-merge results

### Cascade Router
- Start with `auto` strategy
- Set budget limits
- Enable caching

### JEPA
- Calibrate for your domain
- Require 2-3 frustrated messages before escalating
- Combine with other signals

### Hardware Detection
- Detect early in app load
- Cache results
- Use performance class for decisions

### Vector Store
- Always cache search results
- Use metadata filters
- Export/IndexedDB for persistence

---

## Installation Quick Reference

### Install All Tools
```bash
npm install -g @superinstance/spreader
npm install -g @superinstance/cascade-router
npm install -g @superinstance/jepa
npm install @superinstance/hardware-detector
npm install @superinstance/vector-store
```

### For Projects
```bash
npm install @superinstance/spreader
npm install @superinstance/cascade-router
npm install @superinstance/jepa
npm install @superinstance/hardware-detector
npm install @superinstance/vector-store
```

### Import Paths
```javascript
import { Spreader } from '@superinstance/spreader'
import { CascadeRouter } from '@superinstance/cascade-router'
import { getJEPAAgent } from '@superinstance/jepa'
import { getHardwareInfo } from '@superinstance/hardware-detector'
import { VectorStore } from '@superinstance/vector-store'
```

---

## Environment Variables

```bash
# OpenAI (for Cascade Router)
export OPENAI_API_KEY="sk-..."

# Anthropic (for Cascade Router)
export ANTHROPIC_API_KEY="sk-..."

# Configuration files
export SPREADER_CONFIG="./spreader-config.yaml"
export CASCADE_ROUTER_CONFIG="./cascade-config.yaml"
export JEPA_CONFIG="./jepa-config.yaml"
```

---

**Need more details?** Check out the full user guides for each tool!

**Community:** https://github.com/SuperInstance
