# Tutorial 2: Semantic Search for Beginners
## Search by Meaning, Not Just Keywords

**Duration:** 45 minutes
**Level:** Beginner
**Prerequisites:** Basic JavaScript knowledge

---

## Learning Objectives

After this tutorial, you will be able to:
- ✅ Understand what semantic search is and why it's better than keyword search
- ✅ Set up vector search in your browser
- ✅ Index documents for semantic search
- ✅ Perform semantic searches that understand meaning
- ✅ Build a real-time search interface

---

## Prerequisites

### Before You Start
- **Browser:** Chrome 113+, Edge 113+, Safari 18.2+, or Firefox Nightly
- **WebGPU:** Enable WebGPU (optional, for acceleration)
- **JavaScript:** Basic understanding of JavaScript
- **Terminal:** Comfortable running commands

### Check Your Setup
```bash
# Verify WebGPU support (optional)
npx @superinstance/gpu-detect

# Expected output:
# ✅ WebGPU is available (or ❌ Not available - CPU fallback will be used)
```

### Install Dependencies
```bash
# Create new project
mkdir semantic-search-tutorial
cd semantic-search-tutorial

# Initialize npm project
npm init -y

# Install vector search
npm install @superinstance/vector-search
```

---

## Tutorial Outline

### Part 1: What is Semantic Search? (8 minutes)
- Keyword search vs semantic search
- How embeddings work
- When to use semantic search

### Part 2: Basic Setup (7 minutes)
- Installation and initialization
- Your first semantic search
- Understanding similarity scores

### Part 3: Indexing Documents (10 minutes)
- Preparing your data
- Creating embeddings
- Indexing with metadata

### Part 4: Building Search Interface (12 minutes)
- Real-time search as you type
- Filtering results
- Handling edge cases

### Part 5: Optimization & Best Practices (8 minutes)
- Improving search quality
- Performance optimization
- Common pitfalls

---

## Part 1: What is Semantic Search? (8 minutes)

### Keyword Search vs Semantic Search

#### Example: "smartphone"

**Keyword Search:**
```
Query: "smartphone"

Results:
✅ "The new smartphone is great" (contains "smartphone")
❌ "Mobile phone review" (different words)
❌ "Cell phone comparison" (different words)
❌ "Best android device" (different words)
```

**Semantic Search:**
```
Query: "smartphone"

Results:
✅ "The new smartphone is great" (98% similar)
✅ "Mobile phone review" (95% similar)
✅ "Cell phone comparison" (93% similar)
✅ "Best android device" (89% similar)
```

### How It Works: Embeddings

**Embeddings** convert text into lists of numbers (vectors) that capture meaning.

#### Text → Numbers
```
"bug fix"         → [0.23, -0.51, 0.87, 0.12, ...]
"issue resolution"→ [0.25, -0.49, 0.86, 0.14, ...]
"bake a cake"     → [0.89, 0.76, -0.21, 0.45, ...]
```

#### Similar Meaning = Similar Numbers
```
similarity("bug fix", "issue resolution") = 0.98 (98% similar)
similarity("bug fix", "bake a cake") = 0.05 (5% similar)
```

### When to Use Semantic Search

**Use Semantic Search:**
- ✅ User searches use different words than content
- ✅ Synonyms and related concepts are important
- ✅ You need to understand intent, not just keywords
- ✅ Multi-language support needed
- ✅ Handling typos and paraphrases

**Use Keyword Search:**
- ✅ Exact matches required (product codes, IDs)
- ✅ Very simple queries
- ✅ Limited computational resources

---

## Part 2: Basic Setup (7 minutes)

### Step 1: Create Your Project

```bash
# Create directory
mkdir my-semantic-search
cd my-semantic-search

# Initialize
npm init -y

# Install vector search
npm install @superinstance/vector-search
```

### Step 2: Create Sample Data

Create `documents.json`:
```json
[
  {
    "id": 1,
    "title": "How to fix memory leaks in JavaScript",
    "content": "Memory leaks occur when objects are no longer needed but are not garbage collected...",
    "category": "javascript"
  },
  {
    "id": 2,
    "title": "Debugging Node.js applications",
    "content": "Debugging is the process of finding and resolving defects or problems within a computer program...",
    "category": "nodejs"
  },
  {
    "id": 3,
    "title": "Python performance optimization tips",
    "content": "Optimizing Python code involves understanding performance bottlenecks and applying appropriate techniques...",
    "category": "python"
  },
  {
    "id": 4,
    "title": "Troubleshooting connection issues",
    "content": "When your application cannot connect to a server, it's important to systematically check network configurations...",
    "category": "debugging"
  },
  {
    "id": 5,
    "title": "Database query optimization",
    "content": "Slow database queries can significantly impact application performance. Learn indexing strategies...",
    "category": "database"
  }
]
```

### Step 3: Create Search Script

Create `search.js`:
```javascript
import { VectorSearch } from '@superinstance/vector-search';
import documents from './documents.json' assert { type: 'json' };

async function main() {
  // Initialize search engine
  const search = new VectorSearch({
    engine: 'auto' // Use WebGPU if available, fallback to CPU
  });

  console.log('📚 Indexing documents...');
  await search.index(documents, {
    fields: ['title', 'content'],
    embeddings: 'local' // Use local embeddings (free, private)
  });
  console.log('✅ Indexing complete!\n');

  // Perform semantic search
  const queries = [
    'debugging code',
    'performance issues',
    'connecting to servers'
  ];

  for (const query of queries) {
    console.log(`🔍 Query: "${query}"`);

    const results = await search.search(query, {
      topK: 3,
      threshold: 0.70 // Only show results with 70%+ similarity
    });

    console.log(`Found ${results.length} results:`);
    results.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.title} (${(result.score * 100).toFixed(0)}% similar)`);
    });
    console.log('');
  }
}

main().catch(console.error);
```

### Step 4: Run Your First Semantic Search

```bash
# Run the script
node search.js
```

### Expected Output

```
📚 Indexing documents...
✅ Indexing complete!

🔍 Query: "debugging code"
Found 3 results:
  1. Debugging Node.js applications (92% similar)
  2. How to fix memory leaks in JavaScript (87% similar)
  3. Troubleshooting connection issues (81% similar)

🔍 Query: "performance issues"
Found 3 results:
  1. Python performance optimization tips (94% similar)
  2. Database query optimization (89% similar)
  3. How to fix memory leaks in JavaScript (78% similar)

🔍 Query: "connecting to servers"
Found 2 results:
  1. Troubleshooting connection issues (95% similar)
  2. Database query optimization (72% similar)
```

**Congratulations!** You've built your first semantic search. 🎉

---

## Part 3: Indexing Documents (10 minutes)

### Understanding Indexing

**Indexing** converts documents into embeddings and stores them for fast search.

#### Indexing Process
```
Documents → Extract Text → Generate Embeddings → Store in Index
```

### Exercise 1: Index with Metadata

```javascript
import { VectorSearch } from '@superinstance/vector-search';

const documents = [
  {
    id: 1,
    title: "Introduction to WebGPU",
    content: "WebGPU is a modern graphics API...",
    metadata: {
      category: "graphics",
      author: "Jane Doe",
      date: "2024-01-15",
      views: 1500
    }
  },
  // ... more documents
];

const search = new VectorSearch();

// Index with metadata
await search.index(documents, {
  fields: ['title', 'content'],
  metadata: ['category', 'author', 'date', 'views']
});
```

### Exercise 2: Incremental Indexing

```javascript
// Index initial documents
await search.index(initialDocuments);

// Add more documents later
await search.add(additionalDocuments);

// Remove documents
await search.remove([1, 2, 3]); // Remove by ID

// Update documents
await search.update([
  { id: 1, title: "Updated Title", content: "..." }
]);
```

### Exercise 3: Batch Indexing

```javascript
// For large datasets, use batch indexing
const batchSize = 100;
for (let i = 0; i < documents.length; i += batchSize) {
  const batch = documents.slice(i, i + batchSize);
  await search.add(batch);
  console.log(`Indexed ${i + batch.length} documents`);
}
```

### Understanding Similarity Scores

**Cosine Similarity:** Measures the angle between two vectors

- **1.0 (100%):** Identical meaning
- **0.8-0.9 (80-90%):** Very similar
- **0.6-0.7 (60-70%):** Somewhat similar
- **0.4-0.5 (40-50%):** Related but different
- **0.0-0.3 (0-30%):** Not related

---

## Part 4: Building Search Interface (12 minutes)

### Exercise 4: Real-Time Search

Create `index.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Semantic Search Demo</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
    }
    #searchInput {
      width: 100%;
      padding: 12px;
      font-size: 16px;
      border: 2px solid #ddd;
      border-radius: 4px;
    }
    #results {
      margin-top: 20px;
    }
    .result {
      padding: 15px;
      margin: 10px 0;
      background: #f5f5f5;
      border-radius: 4px;
      border-left: 4px solid #007bff;
    }
    .result-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .result-score {
      color: #007bff;
      font-weight: bold;
    }
    .result-snippet {
      color: #666;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <h1>🔍 Semantic Search Demo</h1>

  <input
    type="text"
    id="searchInput"
    placeholder="Search by meaning... (try 'debugging' or 'performance')"
    autocomplete="off"
  />

  <div id="results"></div>

  <script type="module" src="app.js"></script>
</body>
</html>
```

Create `app.js`:
```javascript
import { VectorSearch } from '@superinstance/vector-search';
import documents from './documents.json' assert { type: 'json' };

// Initialize
const searchInput = document.getElementById('searchInput');
const resultsDiv = document.getElementById('results');

let searchTimeout;

// Initialize search engine
const search = new VectorSearch();
await search.index(documents, {
  fields: ['title', 'content']
});

console.log('✅ Search engine ready!');

// Real-time search as you type
searchInput.addEventListener('input', async (e) => {
  const query = e.target.value;

  // Clear previous timeout
  clearTimeout(searchTimeout);

  // Debounce: wait 300ms after user stops typing
  searchTimeout = setTimeout(async () => {
    if (query.length < 2) {
      resultsDiv.innerHTML = '<p>Type at least 2 characters to search...</p>';
      return;
    }

    // Perform search
    const startTime = performance.now();
    const results = await search.search(query, {
      topK: 5,
      threshold: 0.60
    });
    const duration = performance.now() - startTime;

    // Render results
    if (results.length === 0) {
      resultsDiv.innerHTML = '<p>No results found. Try different keywords...</p>';
    } else {
      resultsDiv.innerHTML = results.map(result => `
        <div class="result">
          <div class="result-title">
            ${result.title}
            <span class="result-score">${(result.score * 100).toFixed(0)}%</span>
          </div>
          <div class="result-snippet">${result.content.substring(0, 150)}...</div>
        </div>
      `).join('');

      resultsDiv.innerHTML += `<p style="margin-top: 20px; color: #666;">Found ${results.length} results in ${duration.toFixed(1)}ms</p>`;
    }
  }, 300); // 300ms debounce
});
```

### Exercise 5: Filter by Metadata

```javascript
// Search with metadata filter
const results = await search.search('javascript tips', {
  topK: 10,
  filter: {
    category: 'javascript',  // Only JavaScript articles
    views: { gte: 1000 }     // At least 1000 views
  }
});
```

### Exercise 6: Hybrid Search

Combine semantic and keyword search:

```javascript
// Hybrid search: best of both worlds
const results = await search.hybridSearch('memory optimization', {
  semanticWeight: 0.7,  // 70% semantic
  keywordWeight: 0.3,   // 30% keyword
  topK: 10
});
```

---

## Part 5: Optimization & Best Practices (8 minutes)

### Improving Search Quality

#### 1. Use Multiple Fields
```javascript
// Index multiple fields for better matching
await search.index(documents, {
  fields: ['title', 'content', 'tags', 'description']
});
```

#### 2. Tune Threshold
```javascript
// Adjust threshold based on your needs
const results = await search.search(query, {
  threshold: 0.70  // Higher = more precise, Lower = more recall
});
```

#### 3. Re-rank Results
```javascript
// Custom re-ranking
const results = await search.search(query, {
  topK: 20,
  rerank: (doc, semanticScore) => {
    // Boost recent documents
    const recencyBoost = doc.daysSincePublish * -0.01;

    // Boost popular documents
    const popularityBoost = Math.log(doc.views) * 0.1;

    return semanticScore + recencyBoost + popularityBoost;
  }
});
```

### Performance Optimization

#### 1. Use WebGPU Acceleration
```javascript
// 10-100x faster with WebGPU
const search = new VectorSearch({
  engine: 'webgpu' // or 'auto' for automatic detection
});
```

#### 2. Batch Queries
```javascript
// Search multiple queries at once
const results = await search.batch([
  'query 1',
  'query 2',
  'query 3'
]);
```

#### 3. Cache Results
```javascript
// Cache common queries
const cache = new Map();

async function cachedSearch(query) {
  if (cache.has(query)) {
    return cache.get(query);
  }

  const results = await search.search(query);
  cache.set(query, results);
  return results;
}
```

### Common Pitfalls

#### 1. Not Enough Data
**Problem:** Semantic search needs data to learn patterns
**Solution:** Have at least 100+ documents for good results

#### 2. Poor Quality Text
**Problem:** Noisy, duplicate, or low-quality content
**Solution:** Clean and preprocess text before indexing

#### 3. Wrong Threshold
**Problem:** Too high = no results, Too low = irrelevant results
**Solution:** Experiment with threshold values (0.60-0.80)

#### 4. Ignoring Metadata
**Problem:** Not using available metadata
**Solution:** Always index and filter by metadata

---

## Recap & Next Steps

### What You Learned
✅ What semantic search is and why it's better
✅ How to set up vector search in your browser
✅ Indexing documents with embeddings
✅ Building real-time search interfaces
✅ Optimizing search quality and performance

### Next Steps
1. **Practice:** Build semantic search for your own data
2. **Explore:** Try different embedding models
3. **Advanced:** Learn about hybrid search strategies
4. **Scale:** Handle millions of documents efficiently

### Resources
- **Documentation:** docs.vector-search.dev
- **GitHub:** github.com/SuperInstance/vector-search
- **Examples:** github.com/SuperInstance/vector-search/tree/main/examples
- **Community:** Discord: discord.gg/superinstance

### Exercises Completed
- ✅ Exercise 1: Index with Metadata
- ✅ Exercise 2: Incremental Indexing
- ✅ Exercise 3: Batch Indexing
- ✅ Exercise 4: Real-Time Search
- ✅ Exercise 5: Filter by Metadata
- ✅ Exercise 6: Hybrid Search

---

## Q&A Preparation

### Common Questions

**Q: How accurate is semantic search?**
**A:** 92-94% with local models, 97-98% with API models. Depends on your data quality.

**Q: Can I use this for multi-lingual search?**
**A:** Yes! Local models support 100+ languages with cross-lingual understanding.

**Q: What if WebGPU isn't available?**
**A:** Automatic fallback to CPU-based search. Still fast, just not as fast.

**Q: How many documents can I handle?**
**A:** 1M+ documents with WebGPU. 100K+ with CPU. Scales linearly with resources.

---

## Troubleshooting

### Issue: Poor search results
**Solution:**
- Increase dataset size (need 100+ documents)
- Clean and preprocess text
- Adjust threshold (try 0.60-0.80)
- Try different embedding models

### Issue: Search is slow
**Solution:**
- Enable WebGPU acceleration
- Reduce dataset size
- Use caching for common queries
- Batch queries together

### Issue: Out of memory
**Solution:**
- Reduce embedding dimensions (use smaller models)
- Implement pagination
- Use quantization (INT8 instead of float32)
- Process documents in batches

---

## Completion Certificate

🎉 **Congratulations!** You've completed the Semantic Search for Beginners tutorial!

You now have the skills to:
- Build semantic search that understands meaning
- Index and search millions of documents
- Create real-time search interfaces
- Optimize search quality and performance

**Keep searching and keep learning!** 🔍
