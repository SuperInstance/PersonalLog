# JEPA Integration Roadmap

**Status:** 🟡 Planning Phase
**Started:** 2025-01-04
**Goal:** Add JEPA subtext transcription as beta research feature

---

## Overview

JEPA (Joint Embedding Predictive Architecture) will be integrated as a **beta testing research feature** that enhances PersonalLog with real-time subtext analysis and transcription capabilities.

**Key Concept:** JEPA captures emotional state, context, and intent from conversations and enhances AI interactions.

---

## Vision Statement

> "JEPA makes PersonalLog.AI the only AI chat interface that understands not just what you say, but how you feel and what you actually mean."

### User Value Proposition

1. **See Your Conversations Differently**
   - Markdown transcripts with subtext annotations
   - Color-coded emotional state throughout conversation
   - Export sections for use in other tools

2. **Enhanced AI Interactions**
   - AI that understands when you're frustrated
   - AI that adapts to your flow state
   - A2A (Agent-to-Agent) translation for better API usage

3. **Privacy-First Research**
   - All processing happens locally or on your Cloudflare
   - Optional data sharing to improve global model
   - Review and approve batch exports before sharing

---

## Feature Specification

### 1. JEPA Tab (Main Interface)

**Location:** New tab in PersonalLog interface labeled "JEPA (Beta)"

**UI Components:**
```
┌─────────────────────────────────────────────────┐
│  JEPA Transcription - Beta Research            │
│  ⚠️ Disclaimer: This feature is in beta       │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Start/Stop Recording] [Status: Idle]         │
│                                                 │
│  View Mode:                                     │
│  ○ STT Only (Speech-to-Text)                   │
│  ○ JEPA Only (Subtext Annotations)            │
│  ○ Interleaved (Both, Color-Coded)  ← DEFAULT  │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ [Transcript Display Area]                │ │
│  │                                          │ │
│  │ [10:23:45] User: Hello...               │ │
│  │ <!-- SUBTEXT: frustration=0.82 -->     │ │
│  │ [10:23:50] Claude: Hi there...         │ │
│  │                                          │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  [Export Section] [Select Range]              │
│  [Copy as Markdown] [Copy Plain Text]          │
│  [Convert to A2A] [Export to Google Docs]     │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Features:**
- Real-time transcription display
- Timestamps aligned with audio (64ms windows)
- Color-coded subtext annotations
- Export selected sections
- Multiple view modes
- A2A conversion for API optimization

### 2. Privacy & Data Controls

**Disclaimer Modal (First Use):**
```
┌─────────────────────────────────────────────────┐
│  JEPA Beta - Research Participation             │
├─────────────────────────────────────────────────┤
│                                                 │
│  This feature is in beta testing. Your        │
│  feedback helps improve the global model.     │
│                                                 │
│  🔒 Privacy First:                            │
│  • All processing happens locally (Desktop)     │
│  • Or on your Cloudflare account (Web)         │
│  • We never see your data                      │
│  • We never store your transcripts             │
│                                                 │
│  📊 Optional Data Sharing:                     │
│  • Help improve JEPA by sharing anonymized    │
│    training data                                │
│  • Review batch file before sending           │
│  • Remove any segments you don't want shared  │
│  • 100% optional, 100% private                │
│                                                 │
│  [I Understand - Enable JEPA]  [Maybe Later]  │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Data Sharing Controls:**
- Periodic batch export (every 24 hours or 100 segments)
- Pre-review before sharing
- Remove specific conversations
- Anonymize automatically (names, dates, PII)
- Always opt-in, never forced

### 3. Transcript Formats

#### Format 1: STT Only (Speech-to-Text)
```markdown
# Transcript - 2025-01-04

## [10:23:45] User
Hello, can you help me with something?

## [10:23:50] Claude
Of course! What can I help you with today?

## [10:24:00] User
I'm trying to fix a bug in my code but it's frustrating.
```

#### Format 2: JEPA Only (Subtext Annotations)
```markdown
# Subtext Analysis - 2025-01-04

## [10:23:45] Neutral → Frustration (0.00 → 0.82)
**Detection:** User emotional state degrading
**Confidence:** 87%
**Suggestion:** Consider offering help

## [10:24:00] Frustration Sustained (0.82)
**Detection:** User explicitly expresses frustration
**Confidence:** 94%
**Suggestion:** Validate feelings, offer concrete help
```

#### Format 3: Interleaved (Color-Coded) ← DEFAULT
```markdown
# Enhanced Transcript - 2025-01-04

## [10:23:45] <span style="color: #4ECDC4;">[Neutral]</span> **User**
Hello, can you help me with something?

## [10:23:50] <span style="color: #4ECDC4;">[Neutral]</span> **Claude**
Of course! What can I help you with today?

## [10:24:00] <span style="color: #FF6B6B;">[Frustrated]</span> <!-- SUBTEXT: frustration=0.82 | User shows signs of frustration --> **User**
I'm trying to fix a bug in my code but it's really frustrating.
```

### 4. Export Features

**Section Selection:**
- Click and drag to select transcript segments
- Multi-select with Ctrl/Cmd+click
- Select by date range, speaker, or emotion

**Export Options:**
1. **Copy as Markdown** - Full formatting with annotations
2. **Copy Plain Text** - Just the transcript, no metadata
3. **Export to Google Docs** - Print-ready format
4. **Convert to A2A** - Optimized prompt for AI APIs

**A2A Conversion:**
```markdown
# A2A Converted Prompt

**Context:** User is debugging code and expressing frustration
**Emotional State:** Frustrated (0.82 confidence)
**Suggested Tone:** Patient, validating, concrete help

**Original:**
"I'm trying to fix a bug in my code but it's really frustrating."

**A2A Optimized:**
"User is experiencing difficulty resolving a code bug and is feeling frustrated. They are seeking technical assistance with debugging. Recommend patient, step-by-step troubleshooting approach with concrete examples."
```

---

## Technical Architecture

### Desktop App (Primary Target)

```
PersonalLog Desktop
├── Audio Capture
│   └── Web Audio API (real-time microphone)
├── JEPA Encoder
│   ├── Tiny-JEPA (GGUF, 4MB, quantized)
│   └── Local inference (Ollama integration)
├── STT Engine
│   ├── Whisper.cpp (local)
│   └── Real-time transcription
├── Annotation Engine
│   ├── Phi-3-mini (local, 4-bit quantized)
│   └── Real-time subtext labeling
└── Transcript Manager
    ├── Markdown generation
    ├── Export functionality
    └── Local storage
```

### Web Version (Cloudflare)

```
PersonalLog.AI (Web)
├── Audio Capture
│   └── Web Audio API
├── Cloudflare Workers
│   ├── Tiny-JEPA inference
│   └── Real-time processing
├── Cloudflare R2
│   └── Audio storage (optional)
└── Cloudflare D1
    └── Transcript database
```

---

## Implementation Phases

### Phase 1: Core Transcription (MVP)
**Duration:** 2-3 rounds
**Features:**
- [x] Architecture planning
- [ ] Audio capture implementation
- [ ] STT integration (Whisper)
- [ ] Basic markdown transcript display
- [ ] Start/Stop controls
- [ ] Timestamp alignment

**Success Criteria:**
- ✅ Can record and transcribe speech
- ✅ Transcripts display with timestamps
- ✅ Can export as markdown
- ✅ Desktop app working

### Phase 2: JEPA Integration
**Duration:** 2-3 rounds
**Features:**
- [ ] Tiny-JEPA model integration
- [ ] 32-dim embedding extraction
- [ ] Real-time annotation generation
- [ ] Color-coded display
- [ ] Subtext-only view mode
- [ ] Interleaved view mode

**Success Criteria:**
- ✅ JEPA embeddings computed in real-time
- ✅ Annotations displayed with timestamps
- ✅ Color coding works correctly
- ✅ All three view modes functional

### Phase 3: A2A Conversion
**Duration:** 1-2 rounds
**Features:**
- [ ] A2A translator (local Phi-3)
- [ ] Prompt optimization
- [ ] Context preservation
- [ ] One-click conversion
- [ ] Copy to clipboard

**Success Criteria:**
- ✅ Can convert transcript sections to A2A format
- ✅ Optimized prompts ready for API use
- ✅ Context and emotional state preserved

### Phase 4: Export & Sharing
**Duration:** 1-2 rounds
**Features:**
- [ ] Section selection UI
- [ ] Export to Google Docs
- [ ] Batch export for research
- [ ] Pre-review before sharing
- [ ] Anonymization filters

**Success Criteria:**
- ✅ Can select transcript sections
- ✅ Export works to Google Docs
- ✅ Batch files reviewable before sharing
- ✅ PII automatically anonymized

---

## Data & Privacy

### What JEPA Captures

**Audio Features:**
- Pitch variation (frustration detection)
- Energy levels (excitement detection)
- Speaking rate (flow/confusion detection)
- Pauses and hesitations (uncertainty detection)

**Embeddings:**
- 32-dimensional vector (Phi subtext)
- Updated every 64ms
- Represents emotional and contextual state

**Annotations:**
- Emotion labels (frustration, flow, confusion, etc.)
- Confidence scores (0-100%)
- Timestamps (ms precision)
- Color codes for UI display

### What We Store

**Local Storage (Desktop App):**
- Transcripts (IndexedDB)
- Embeddings (optional, for local search)
- Settings and preferences

**Cloudflare (Web Version):**
- User's Cloudflare account only
- We never see their data
- They pay Cloudflare directly

**Global Model Training (Optional):**
- Anonymized embeddings only
- Batch export with user review
- No text/audio content
- 100% opt-in

### What We NEVER See

❌ User's actual conversations
❌ User's transcripts
❌ User's audio
❌ User's personal data
❌ Any PII (names, dates, etc.)

---

## Development Roadmap

### Round 1: Planning & Architecture ✅
- [x] Create JEPA roadmap
- [x] Define feature specification
- [x] Plan technical architecture
- [x] Create task breakdown for Round 2

### Round 2: Audio Capture & STT (CURRENT)
**Agents:** 4-6 focused agents
**Tasks:**
- Audio capture implementation
- Whisper.cpp integration
- Basic transcript display
- Markdown formatting
- Start/Stop controls

### Round 3: JEPA Core
**Agents:** 4-6 focused agents
**Tasks:**
- Tiny-JEPA model integration
- Embedding extraction pipeline
- Annotation engine
- Real-time processing
- Performance optimization

### Round 4: UI & Views
**Agents:** 3-4 focused agents
**Tasks:**
- JEPA tab component
- View mode switching
- Color-coded display
- Transcript selection
- Export UI

### Round 5: A2A & Export
**Agents:** 4-5 focused agents
**Tasks:**
- A2A translator
- Prompt optimization
- Google Docs integration
- Batch export system
- Pre-review UI

### Round 6: Polish & Launch
**Agents:** 3-4 focused agents
**Tasks:**
- Beta disclaimer
- Privacy controls
- Data sharing UI
- Documentation
- Testing

---

## Success Metrics

### Technical Metrics
- **Audio Latency:** <100ms from speech to display
- **JEPA Latency:** <15ms per 64ms window
- **Transcription Accuracy:** >90% (English)
- **Annotation Accuracy:** >80% (user validation)

### User Metrics
- **Adoption Rate:** >30% of premium users try it
- **Daily Active Users:** >10% use it weekly
- **Export Rate:** >50% of sessions exported
- **A2A Conversion:** >20% of sections converted

### Business Metrics
- **Premium Conversion:** +15% uplift
- **Retention:** +20% improvement (JEPA users stay longer)
- **Satisfaction:** >4.5/5 rating

---

## Open Questions

1. **Model Selection:** Should we use Tiny-JEPA or train custom model?
2. **Quantization:** What quantization level balances speed/accuracy?
3. **Annotation Labels:** How many emotion categories to support?
4. **Training Data:** How to incentivize users to share anonymized data?
5. **Mobile Support:** Can we run JEPA on mobile devices?

---

## Next Steps

**Immediate:** Spawn Round 2 agents to start implementation
**This Week:** Complete Phase 1 (Core Transcription)
**This Month:** Complete Phase 2 (JEPA Integration)
**Next Quarter:** Full beta launch

---

**Last Updated:** 2025-01-04
**Status:** 🟡 Planning Complete → Ready for Round 2
