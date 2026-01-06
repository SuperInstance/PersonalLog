# Advanced Organizational System - RAG, User Memory & Cross-Project References

## Overview

This document describes the sophisticated organizational system that turns the ComfyUI Vibe Agent into a **personal creative intelligence system**. The system learns your design patterns, stores project knowledge, and enables cross-project creative reference.

## Architecture

### Three-Tier Memory System

```
┌─────────────────────────────────────────────────────────┐
│                 USER WORKING ENVIRONMENT              │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌───────────────────┐
│ User Memory │ │Project Memory│ │ Cross-Project    │
│ (DB + Vec) │ │   (DB)      │ │   References      │
└─────────────┘ └─────────────┘ └───────────────────┘
        │               │               │
        └───────────────┴───────────────┘
                        ▼
              ┌───────────────────┐
              │     RAG System   │
              │  (Vector Store)  │
              └───────────────────┘
                        │
                        ▼
              ┌───────────────────┐
              │  AI Assistant    │
              │  (Enhanced)     │
              └───────────────────┘
```

### Components

#### 1. User Memory (Human-Editable)

**Purpose**: Store cross-project patterns and preferences

**Location**:
- Database: `UserMemory` table (human-editable)
- Reflection: Available in UI for granular editing
- Source: User explicit input + AI-learned patterns

**Fields**:
- `category`: style, technique, preference, workflow
- `key`: e.g., "preferred_model", "color_scheme"
- `value`: e.g., "SDXL", "warm_colors"
- `confidence`: 0-1 scale
- `source`: user_explicit, ai_learned, observation
- `useCount`: How many times used
- `successRate`: Success rate when used

**Use Cases**:
- "I always prefer photorealistic style" → UserMemory
- "Default to 20 sampling steps" → UserMemory
- "Avoid dark themes for children's books" → UserMemory

#### 2. Project Memory (Project-Specific)

**Purpose**: Learn from conversation, iterations, and feedback

**Location**: `ProjectMemory` table (project-specific)

**Fields**:
- `sourceType`: conversation, iteration, feedback, ai_analysis
- `category`: successful_prompt, user_preference, effective_technique
- `title`: Short title
- `description`: Detailed description
- `content`: JSON or text details
- `tags`: Array of tags for retrieval
- `importance`: 0-1 scale
- `confidence`: 0-1 scale
- `userRating`: 1-5 rating from user

**Use Cases**:
- User: "This workflow was perfect!" → ProjectMemory (success)
- User: "Change the lighting" → ProjectMemory (improvement)
- AI: "Dark neon lighting works well here" → ProjectMemory (learned)

#### 3. Creative Elements (Cross-Referenced)

**Purpose**: Store reusable assets with tags

**Location**: `CreativeElement` table + Vector Embeddings

**Fields**:
- `type`: character, environment, object, style, technique
- `description`: Visual description
- `prompt`: Generation prompt
- `styleTags`: Style descriptors
- `moodTags`: Mood descriptors
- `techniqueTags`: Technique descriptors
- `embedding`: Vector for similarity search
- `reuseCount`: How many times reused
- `successProjects`: Array of project IDs where successful

**Use Cases**:
- Generate a character → Store as CreativeElement
- Reuse character in another project → Cross-project reference
- Track which projects used it successfully

#### 4. Cross-Project References

**Purpose**: Link projects and enable influence

**Location**: `CrossProjectReference` table

**Fields**:
- `sourceProjectId`: Project providing influence
- `targetProjectId`: Project receiving influence
- `referenceType`: style_influence, technique_adoption, element_reuse
- `strength`: 0-1 scale
- `description`: Why this reference exists
- `useCount`: How many times used

**Use Cases**:
- "Use FantasyGame style elements in this SciFi project"
- "Apply BookArt techniques to this Brand project"
- "Adopt successful workflows from Project A"

### RAG System (Retrieval-Augmented Generation)

**Purpose**: Intelligently retrieve relevant context

**Implementation**:
- Vector embeddings for text content
- In-memory vector store for similarity search
- Cosine similarity for matching
- Filters by type, project, importance

**Retrieval Targets**:
- Project conversations
- Project memories
- Creative elements (cross-project)
- User memories

**Search Flow**:
```typescript
// User query: "create a neon cyberpunk character"

// 1. Generate embedding for query
const queryEmbedding = await generateEmbedding(query);

// 2. Search vector store
const relevantContext = await vectorStore.search(query, {
  topK: 8,
  minSimilarity: 0.35,
  filters: { projectId: currentProjectId }
});

// 3. Returns:
// - Previous cyberpunk conversations
// - Successful neon lighting patterns
// - Similar characters from other projects
// - User preference for cyberpunk style
```

## Workflow

### 1. Initial Setup

```
User creates new project
    ↓
Sets theme (palette, style, mood)
    ↓
AI generates initial personality summary
    ↓
System syncs with RAG
```

### 2. Working Loop

```
User describes what they want
    ↓
RAG retrieves relevant context:
  - Project memories
  - User preferences
  - Similar creative elements
  - Cross-project influences
    ↓
AI generates workflow with context
    ↓
System learns from result:
  - Stores new patterns
  - Updates user memories
  - Creates cross-project refs
```

### 3. Cross-Project Influence

```
User works on Project B
    ↓
System detects: "Project A had similar style"
    ↓
User enables Project A as influence
    ↓
AI responds:
  "Inspired by Project A: Try this technique
   which worked well for X scenario"
    ↓
Technique added to Project B
    ↓
CrossProjectReference created
```

### 4. Organic Growth

```
Over time:
- UserMemory builds from explicit + learned patterns
- ProjectMemory accumulates preferences and feedback
- CreativeElements library grows with reusable assets
- CrossProjectReferences connect successful patterns
- RAG system becomes more accurate
    ↓
Result: "Project personality" emerges
```

## API Endpoints

### Theme Management
- `GET /api/comfyui/project/theme?projectId={id}`
  - Retrieve project theme settings
- `POST /api/comfyui/project/theme`
  - Update project theme
  - Auto-generates personality summary

### User Memory
- `GET /api/comfyui/memory/user`
  - Get all user memories
- `POST /api/comfyui/memory/user`
  - Create or update user memory
- `PATCH /api/comfyui/memory/user`
  - Update existing memory
- `DELETE /api/comfyui/memory/user?id={id}`
  - Delete memory
- `POST /api/comfyui/memory/user/{id}/reset`
  - Reset confidence to 0.5

### Cross-Project
- `GET /api/comfyui/cross-project?projectId={id}`
  - Get projects influencing this project
- `POST /api/comfyui/cross-project`
  - Call project personality as influence agent
  - Body: { sourceProjectId, query, targetProjectId? }

### Enhanced Chat
- `POST /api/comfyui/chat-advanced`
  - RAG-enhanced chat with full context
  - Returns workflow + context used

## UI Components

### ProjectThemePanel

Features:
- Quick theme presets (cyberpunk, fantasy, minimalist, etc.)
- Custom color palette editor (primary, secondary, accent)
- Art style selector
- Mood selector
- Composition selector
- Lighting selector
- Project context (type, audience, medium)
- Real-time theme preview

### MemoryEditorPanel

Features:
- List all user memories
- Filter by category (style, technique, preference, workflow)
- Add new memories
- Edit existing memories
- Delete memories
- Reset memory confidence
- Visual confidence indicator
- Usage and success rate display

## Benefits

### For the User

1. **Personalized Experience**: System learns your preferences
2. **Cross-Project Reuse**: Leverage all your past creativity
3. **Organizational Control**: Human-editable memory for granular control
4. **Intelligent Suggestions**: AI has full context of your work
5. **Growing Intelligence**: System becomes more valuable over time
6. **Project Personality**: Each project develops unique characteristics
7. **Influence Agents**: Call past projects as creative consultants

### For the AI

1. **Rich Context**: RAG provides relevant past work
2. **Learned Patterns**: User memories guide decisions
3. **Project Awareness**: Project-specific memory keeps focus
4. **Cross-Project Insight**: Can leverage successful techniques from other projects
5. **Feedback Loop**: Iterations improve accuracy

## Example Scenarios

### Scenario 1: Book Series Art

**User Action**:
```
Create project "Fantasy Book Series"
Set theme: fantasy, medieval, oil painting style
```

**System Learns**:
```
ProjectMemory: "User prefers fantasy themes"
ProjectMemory: "Oil painting style preferred"
ProjectMemory: "Medieval setting elements"
```

**Result**: Future generations automatically use fantasy style

### Scenario 2: Cross-Project Style Transfer

**User Action**:
```
Work on new project "SciFi Game"
System detects similarity with "Fantasy Book Series"
User enables cross-project influence
```

**AI Suggests**:
```
"Inspired by Fantasy Book Series:
Consider applying the dramatic lighting techniques
that worked well for epic battle scenes.
The same moody atmosphere could enhance your
SciFi space battles."
```

**System Creates**:
```
CrossProjectReference:
  source: Fantasy Book Series
  target: SciFi Game
  type: style_influence
  strength: 0.7
```

### Scenario 3: Pattern Extraction

**User Action**:
```
Chat: "I always use the same model for portraits"
```

**System Detects**:
```
Pattern: "always use same model for portraits"
Key: "preferred_portrait_model"
Value: "Same model" → Extract from user workflow
```

**System Stores**:
```
UserMemory:
  category: technique
  key: preferred_portrait_model
  value: "SDXL with specific checkpoint"
  confidence: 0.7
  source: ai_learned
```

**Future**: All portrait workflows automatically use this model

## Database Schema

### UserMemory
```prisma
model UserMemory {
  category    String   // style, technique, preference, workflow
  key         String   // e.g., "preferred_model"
  value       String   // e.g., "SDXL"
  confidence  Float    // 0-1 scale
  source      String   // user_explicit, ai_learned, observation
  useCount    Int
  successRate Float?
}
```

### ProjectMemory
```prisma
model ProjectMemory {
  projectId   String
  sourceType  String   // conversation, iteration, feedback
  category    String   // successful_prompt, user_preference
  title       String
  description String
  content     String   // JSON details
  tags        String?  // JSON array
  importance  Float    // 0-1 scale
  confidence  Float    // 0-1 scale
  userRating  Float?   // 1-5
  useCount    Int
}
```

### CreativeElement
```prisma
model CreativeElement {
  projectId   String
  type        String   // character, environment, object
  description String
  visualTags  String?  // JSON array
  styleTags   String?  // JSON array
  moodTags    String?  // JSON array
  embedding   String?  // JSON array (vector)
  reuseCount  Int
  successProjects String? // JSON array of project IDs
}
```

### CrossProjectReference
```prisma
model CrossProjectReference {
  sourceProjectId String
  targetProjectId String
  referenceType String   // style_influence, technique_adoption
  strength      Float    // 0-1 scale
  description   String
  context       String?
  useCount      Int
}
```

## Future Enhancements

### Short Term
- [ ] Real vector database integration (Pinecone, Qdrant)
- [ ] Project personality dashboard
- [ ] Automatic pattern extraction improvements
- [ ] Visual project relationship graph

### Medium Term
- [ ] Multi-project workflow templates
- [ ] Style transfer between projects
- [ ] A/B testing with learned preferences
- [ ] Memory export/import

### Long Term
- [ ] Collaborative project sharing
- [ ] Community project marketplace
- [ ] Federated learning across users
- [ ] Advanced creative AI integration

## Conclusion

This system transforms the ComfyUI Vibe Agent from a simple workflow generator into a **comprehensive creative intelligence system** that:

- Learns from every interaction
- Remembers across all projects
- Enables cross-project creativity
- Provides human-editable control
- Grows more valuable over time

The result is a "design brain" that becomes increasingly valuable as you work, allowing you to pull from your entire creative history in intelligent, contextualized ways.
