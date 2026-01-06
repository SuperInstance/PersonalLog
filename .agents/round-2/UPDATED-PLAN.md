# Round 2: Audio Capture + Foundation Architecture - REVISED

**Status:** Ready to Launch
**Date:** 2025-01-04
**Critical Updates:** Added system-agnostic architecture requirements

---

## Round 2 Overview

**Primary Objective:**
1. Implement audio capture and STT transcription (JEPA foundation)
2. **CRITICAL:** Build system-agnostic architecture (hardware detection + adaptive features)
3. **CRITICAL:** Cloudflare Workers integration foundation

**Agents:** 7 (was 6, added Hardware Detection Architect)
**Duration:** 2-3 days
**AutoAccept:** ENABLED for all agents

---

## Agent Deployments (All with AutoAccept)

### Agent 1: Audio Capture Specialist
**Task:** Implement Web Audio API integration
**Deliverables:**
- Audio capture module with microphone permissions
- Audio buffering (64ms windows for JEPA)
- Start/Stop controls
- Audio format handling (44.1kHz, 16-bit)
**Files:**
- `src/lib/jepa/audio-capture.ts` (NEW)
- `src/components/jepa/AudioControls.tsx` (NEW)

### Agent 2: STT Integration Engineer
**Task:** Integrate Whisper.cpp for local transcription
**Deliverables:**
- Whisper.cpp wrapper (desktop app)
- Real-time transcription pipeline
- Timestamp alignment
- Model loading and management
**Files:**
- `src/lib/jepa/stt-engine.ts` (NEW)
- `src/lib/jepa/whisper-wrapper.ts` (NEW)

### Agent 3: Transcript Display Developer
**Task:** Create JEPA tab component with transcript view
**Deliverables:**
- JEPA tab page (`/jepa`)
- Markdown transcript display
- Timestamp formatting
- Scroll-to-current-position
**Files:**
- `src/app/jepa/page.tsx` (NEW)
- `src/components/jepa/TranscriptDisplay.tsx` (NEW)

### Agent 4: Markdown Formatter
**Task:** Create transcript formatter and export
**Deliverables:**
- Markdown formatting engine
- Speaker identification
- Export functionality (copy to clipboard, download)
**Files:**
- `src/lib/jepa/markdown-formatter.ts` (NEW)
- `src/components/jepa/ExportControls.tsx` (NEW)

### Agent 5: Controls & State Manager
**Task:** Implement recording controls and state management
**Deliverables:**
- Start/Stop/Resume buttons
- Recording status indicator
- Audio state management
- Error handling
**Files:**
- `src/lib/jepa/audio-state.ts` (NEW)
- `src/components/jepa/RecordingControls.tsx` (NEW)

### Agent 6: Testing & QA
**Task:** Test audio capture on different devices
**Deliverables:**
- Test across different hardware configs
- Verify STT accuracy
- Test markdown formatting
- Test export functionality
- Test report with fixes
**Files:**
- `src/jepa/__tests__/` (NEW directory)
- Test reports and fixes

### **Agent 7: Hardware Detection Architect** ⭐ NEW
**Task:** **CRITICAL - Build system-agnostic foundation**
**Deliverables:**
- Hardware detection module (GPU, RAM, CPU, storage)
- Hardware scoring algorithm (0-100 scale)
- Adaptive feature flag system
- Capability-based feature enabling/disabling
- Hardware capability UI (show users what their system supports)
**Files:**
- `src/lib/hardware/detection.ts` (NEW)
- `src/lib/hardware/scoring.ts` (NEW)
- `src/lib/hardware/capabilities.ts` (NEW)
- `src/components/settings/HardwareCapabilities.tsx` (NEW)
- Update `src/lib/flags/features.ts` (ADD JEPA flags)
- Update `src/lib/flags/manager.ts` (ADD hardware-aware evaluation)

**Critical Requirements for Agent 7:**

```typescript
// Hardware detection MUST identify:
- GPU: Model, VRAM, tensor cores, CUDA support
- RAM: Total, available
- CPU: Cores, clock speed
- Storage: Available space (for models)
- OS: Windows, macOS, Linux

// Hardware scoring MUST produce 0-100 score:
- 0-20: Low-end (API-only mode)
- 20-50: Mid-range (basic local models)
- 50-80: High-end (full JEPA, large models)
- 80-100: Extreme (multimodal, parallel processing)

// Feature flags MUST adjust automatically:
if (hardwareScore < 30) {
  // Low-end: Disable JEPA, local models
  disableFeature('jepa.transcription');
  disableFeature('ai.local_models');
} else if (hardwareScore < 60) {
  // Mid-range: Enable Tiny-JEPA only
  enableFeature('jepa.transcription', { model: 'tiny-jepa' });
  enableFeature('ai.local_models', { maxSize: 'small' });
} else {
  // High-end: Enable everything
  enableFeature('jepa.transcription', { model: 'jepa-large' });
  enableFeature('jepa.multimodal');
  enableFeature('ai.local_models', { maxSize: 'large' });
}
```

**Hardware Capability UI:**
```
┌─────────────────────────────────────────────────┐
│  System Capabilities                            │
├─────────────────────────────────────────────────┤
│                                                 │
│  Hardware Score: 65/100 (High-End)             │
│                                                 │
│  Detected Hardware:                             │
│  • GPU: NVIDIA RTX 4050 (6GB VRAM) ✅          │
│  • RAM: 16GB ✅                                │
│  • CPU: 8 cores ✅                              │
│  • Storage: 50GB available ✅                   │
│                                                 │
│  Available Features:                             │
│  ✅ Local AI Models (up to large)               │
│  ✅ JEPA Transcription (Tiny-JEPA + JEPA-Large) │
│  ✅ Vector Search                               │
│  ✅ Parallel Processing                          │
│  ⏸️  JEPA Multimodal (requires 80+ score)       │
│                                                 │
│  Recommendations:                                │
│  Your system is well-suited for PersonalLog.    │
│  You can run all features except multimodal     │
│  JEPA analysis. Upgrade to RTX 5090 for full   │
│  multimodal support.                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Round 2 Success Criteria

### Must Have (Round Success)
- ✅ Can record audio from microphone
- ✅ Transcription displays in real-time
- ✅ Markdown formatting is correct
- ✅ Start/Stop controls work
- ✅ Can export transcript as markdown
- ✅ No errors in console
- ✅ **Hardware detection working**
- ✅ **Feature flags adjust based on hardware**
- ✅ **Users can see their system capabilities**

### Should Have (Quality)
- ✅ STT accuracy >90% (English)
- ✅ Audio latency <300ms
- ✅ Hardware score accurate (matches actual capabilities)
- ✅ Feature flag adjustments smooth (no jarring UI changes)

### Could Have (Bonus)
- Multiple audio input sources (microphone selection)
- Audio visualization (waveform)
- Hardware capability recommendations
- Performance metrics display

---

## Round 2 Dependencies & Risks

### Dependencies
- Whisper.cpp must be downloadable/integratable
- Web Audio API must work on target browsers
- Hardware detection libraries available

### Risks & Mitigations

**Risk 1: Whisper.cpp Integration Complexity**
**Mitigation:** Start with API-based STT, add local later
**Fallback:** Use OpenAI Whisper API or similar

**Risk 2: Hardware Detection Accuracy**
**Mitigation:** Test on multiple hardware configs
**Fallback:** Manual override (user can select tier)

**Risk 3: Feature Flag Jankiness**
**Mitigation:** Smooth transitions, clear messaging
**Fallback:** Restart required after hardware changes

---

## Updated Feature Flags (Must Add)

**JEPA-Specific Flags:**
```typescript
{
  id: 'jepa.transcription',
  name: 'JEPA Transcription',
  description: 'Subtext analysis and enhanced transcripts',
  category: 'ai',
  state: 'enabled',
  experimental: true,
  minHardwareScore: 50, // Mid-range or higher
  dependencies: ['ai.local_models'],
  performanceImpact: 70,
  minRAM: 8,
  requiresGPU: true,
  models: ['tiny-jepa', 'jepa-large', 'jepa-multimodal'],
}

{
  id: 'jepa.multimodal',
  name: 'JEPA Multimodal Analysis',
  description: 'Facial expression + voice emotion analysis',
  category: 'ai',
  state: 'enabled',
  experimental: true,
  minHardwareScore: 80, // High-end only
  dependencies: ['jepa.transcription'],
  performanceImpact: 90,
  minRAM: 16,
  requiresGPU: true,
  models: ['jepa-multimodal'],
}
```

---

## Integration with Cloudflare (Future Round, Plan Now)

**NOTE:** Full Cloudflare integration is planned for later round, but plan architecture now.

**Architecture Preview:**
```typescript
// Future: Web version will deploy Workers to user's account
// Desktop version (Round 2-6): Local only

// src/lib/cloudflare/workers-template.ts (PLANNING)
export const WORKER_TEMPLATE = `
// User's Cloudflare Worker (deployed by PersonalLog)
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/chat')) {
      return handleChat(request, env);
    } else if (url.pathname.startsWith('/jepa')) {
      return handleJEPA(request, env);
    }
  }
};

async function handleChat(request, env) {
  const { model, messages } = await request.json();

  // Call AI provider
  const response = await callAIProvider(model, messages, env.API_KEYS);

  // Store in user's D1
  await env.DB.prepare(
    'INSERT INTO conversations (messages, timestamp) VALUES (?, ?)'
  ).bind(JSON.stringify(messages), Date.now()).run();

  return new Response(JSON.stringify(response));
}

async function handleJEPA(request, env) {
  // Future: When JEPA API available
  const { audio } = await request.json();
  const embedding = await callJEPAAPI(audio, env);
  return new Response(JSON.stringify({ embedding }));
}
`;
```

---

## Round 2 Deliverables Summary

1. **Working Audio Capture:** Microphone → Audio buffer (64ms windows)
2. **Working STT:** Real-time transcription with timestamps
3. **Transcript Display:** JEPA tab with markdown rendering
4. **Export Functionality:** Copy/download as markdown
5. **Controls UI:** Start/Stop/status indicator
6. **Hardware Detection:** **CRITICAL** - System capability detection
7. **Adaptive Features:** **CRITICAL** - Feature flags adjust to hardware
8. **Test Coverage:** All features tested across hardware tiers

---

## Post-Round 2: Ready for Round 3

**Round 3 Will Build On:**
- Audio capture → JEPA embedding extraction
- Hardware detection → JEPA model selection (Tiny vs Large vs Multimodal)
- Transcript display → Interleaved view (STT + JEPA annotations)
- Export → A2A conversion

**Before Round 3 Starts:**
- Verify hardware detection works on RTX 4050 (your machine)
- Verify feature flags adjust correctly
- Verify audio capture works smoothly
- Verify STT transcription is accurate

---

**Status:** ✅ Ready to Deploy
**Next Action:** Deploy 7 agents with AutoAccept
**Timeline:** 2-3 days
**Confidence:** HIGH

---

*"Round 2 builds the foundation for everything: audio capture, transcription, AND the system-agnostic architecture that makes PersonalLog work on every hardware tier."*
