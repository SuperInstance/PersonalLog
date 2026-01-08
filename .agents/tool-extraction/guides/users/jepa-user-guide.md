# JEPA User Guide

**Emotional Subtext Analyzer for Conversational AI**

---

## What is JEPA?

JEPA (Joint Embedding Predictive Architecture) analyzes emotional undertones in conversations using voice analysis and text processing. It detects emotions like frustration, satisfaction, confusion, and excitement in real-time.

### What Problem Does It Solve?

**The Problem:** AI assistants respond to your words, not your feelings. When you're frustrated, the AI keeps giving generic helpful responses, which makes you more frustrated.

**The JEPA Solution:**
- Detect emotional state from voice/text
- Understand valence (positive/negative), arousal (energy), dominance (confidence)
- Adjust AI responses based on user's emotional state
- Enable emotionally-aware AI interactions

### Real-World Example

**Before JEPA:**
```
User: [Typing angrily] "This is the fifth time it's broken!"
AI: "I understand. Let me help you troubleshoot."
User: [Even more angry] "I've already tried troubleshooting!"
```

**After JEPA:**
```
User: [Typing angrily] "This is the fifth time it's broken!"
JEPA: [Detects: valence=0.2, arousal=0.8 → Frustrated]
AI: "I hear your frustration, and I apologize. Let me escalate this to a senior engineer who can resolve this immediately."
User: [Calmer] "Thank you, that would be helpful."
```

---

## When to Use JEPA

Use JEPA when:

**Perfect For:**
- Building conversational AI assistants
- Customer support chatbots
- User experience research
- Meeting sentiment analysis
- Mental health applications (with consent)
- Emotionally-aware routing (with Cascade Router)
- User research and feedback analysis

**Not Ideal For:**
- Simple Q&A bots (overkill)
- Tasks requiring strict emotional neutrality
- Brief, transactional interactions

---

## Installation

### Option 1: CLI Tool

```bash
npm install -g @superinstance/jepa

# Or use npx
npx @superinstance/jepa analyze "I'm so frustrated with this service!"
```

### Option 2: Library

```bash
npm install @superinstance/jepa
```

```javascript
import { getJEPAAgent } from '@superinstance/jepa'

const agent = await getJEPAAgent()
await agent.initialize()
```

---

## Quick Start Guide

### Your First Emotion Analysis

**Step 1: Analyze text emotion**

```bash
jepa analyze "I'm really excited about the new features!"
```

**Output:**
```
🎭 Emotion Analysis

Text: "I'm really excited about the new features!"

Emotional Dimensions:
  Valence:   0.85 / 1.0  (Very Positive)
  Arousal:   0.78 / 1.0  (High Energy)
  Dominance: 0.65 / 1.0  (Confident)

Detected Emotions:
  ✓ excited (85% confidence)
  ✓ positive (80% confidence)
  ✓ enthusiastic (72% confidence)

Suggested Response:
  Match their enthusiasm! Use positive language
  and build on their excitement.
```

**Step 2: Real-time emotion monitoring**

```javascript
import { getJEPAAgent } from '@superinstance/jepa'

const agent = getJEPAAgent()

// Listen for emotion updates
agent.on('emotion_analyzed', (data) => {
  const { emotion } = data

  if (emotion.valence < 0.3 && emotion.arousal > 0.7) {
    console.log('⚠️ User is frustrated!')
    // Escalate to human or change strategy
  } else if (emotion.valence > 0.7) {
    console.log('✨ User is happy!')
    // Continue current approach
  }
})

// Analyze a message
await agent.processMessage({
  id: 'msg-1',
  author: 'user',
  content: { text: 'This is amazing!' },
  timestamp: Date.now()
})
```

**Step 3: Voice emotion analysis (advanced)**

```javascript
// Start recording
await agent.startRecording()

// Analyze audio in real-time
agent.on('audio_analyzed', (data) => {
  console.log('Voice emotion:', data.emotion)
})

// Stop recording
agent.stopRecording()
```

---

## Core Concepts

### 1. VAD Model

JEPA uses the **VAD (Valence-Arousal-Dominance)** model:

**Valence (0.0 - 1.0)**
- 0.0 - 0.3: Negative (sad, angry, frustrated)
- 0.3 - 0.7: Neutral
- 0.7 - 1.0: Positive (happy, excited, satisfied)

**Arousal (0.0 - 1.0)**
- 0.0 - 0.3: Low energy (calm, bored, tired)
- 0.3 - 0.7: Medium energy
- 0.7 - 1.0: High energy (excited, angry, anxious)

**Dominance (0.0 - 1.0)**
- 0.0 - 0.3: Submissive (uncertain, apologetic)
- 0.3 - 0.7: Neutral
- 0.7 - 1.0: Dominant (confident, assertive)

### 2. Emotion Detection

JEPA detects specific emotion labels:

**Positive Emotions:**
- happy, excited, enthusiastic, satisfied, content

**Negative Emotions:**
- sad, angry, frustrated, disappointed, worried

**Neutral:**
- neutral, calm, relaxed

### 3. Confidence Scores

Every emotion analysis includes a confidence score (0.0 - 1.0):
- > 0.8: High confidence (trust it)
- 0.5 - 0.8: Medium confidence (probably accurate)
- < 0.5: Low confidence (uncertain, might be wrong)

### 4. Frustration Detection

JEPA specifically detects user frustration:

**Frustration Pattern:**
- Valence < 0.4 (unhappy)
- Arousal > 0.6 (high energy/agitated)
- Confidence > 0.5 (certain)

**Use case:** Automatically escalate frustrated users to human agents.

---

## Common Patterns

### Pattern 1: Emotionally-Aware Chatbot

Adjust responses based on user emotion:

```javascript
import { getJEPAAgent } from '@superinstance/jepa'
import { openai } from '@ai-sdk/openai'

const jepa = getJEPAAgent()

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message

  // Analyze emotion
  const emotion = await jepa.processMessage({
    author: 'user',
    content: { text: userMessage },
    timestamp: Date.now()
  })

  // Choose response style based on emotion
  let systemPrompt

  if (emotion.valence < 0.4 && emotion.arousal > 0.6) {
    // Frustrated user
    systemPrompt = `You are a empathetic customer support agent.
    The user is frustrated. Be understanding, apologize sincerely,
    and focus on resolving their issue quickly.`
  } else if (emotion.valence > 0.7) {
    // Happy user
    systemPrompt = `You are a friendly assistant. Match their positive
    energy and build on their enthusiasm.`
  } else {
    // Neutral user
    systemPrompt = `You are a helpful, neutral assistant.`
  }

  // Generate response
  const response = await generateText({
    model: openai('gpt-4'),
    system: systemPrompt,
    prompt: userMessage
  })

  res.json({ response: response.text })
})
```

### Pattern 2: Frustration Escalation

Automatically escalate when users are frustrated:

```javascript
jepa.on('emotion_analyzed', async (data) => {
  const { emotion, messageId } = data

  // Check for frustration
  if (emotion.valence < 0.3 && emotion.arousal > 0.7) {
    // User is frustrated - escalate to human
    await escalateToHuman({
      reason: 'user_frustration',
      emotion: emotion,
      conversationId: currentConversation.id,
      urgent: true
    })

    // Notify support team
    await notifySupportTeam({
      message: 'Frustrated user detected',
      conversationId: currentConversation.id,
      emotion: emotion
    })
  }
})
```

### Pattern 3: Sentiment Dashboard

Track emotional trends over time:

```javascript
// Collect emotions
const emotions = []

jepa.on('emotion_analyzed', (data) => {
  emotions.push({
    timestamp: data.timestamp,
    valence: data.emotion.valence,
    arousal: data.emotion.arousal,
    emotions: data.emotion.emotions
  })
})

// Calculate sentiment trends
function getSentimentStats(timeWindow = 3600000) {  // 1 hour
  const now = Date.now()
  const recent = emotions.filter(e => now - e.timestamp < timeWindow)

  return {
    averageValence: average(recent.map(e => e.valence)),
    averageArousal: average(recent.map(e => e.arousal)),
    emotionCounts: countBy(recent, 'emotions'),
    frustrationCount: recent.filter(e =>
      e.valence < 0.4 && e.arousal > 0.6
    ).length
  }
}
```

### Pattern 4: Meeting Intelligence

Analyze meeting sentiment:

```javascript
// Start meeting analysis
await jepa.startRecording()

jepa.on('transcript_segment', async (segment) => {
  // Analyze emotion of each speaker
  const emotion = await jepa.analyzeEmotion(
    segment.text,
    segment.timestamp
  )

  // Store with speaker info
  meetingData.push({
    speaker: segment.speaker,
    text: segment.text,
    emotion: emotion,
    timestamp: segment.timestamp
  })
})

// After meeting
await jepa.stopRecording()

// Generate sentiment report
const report = generateMeetingSentimentReport(meetingData)
```

### Pattern 5: A/B Testing Response Strategies

Test if emotion-aware responses work better:

```javascript
const groupA = []  // Emotion-aware
const groupB = []  // Standard responses

function shouldUseEmotionAware(userId) {
  // 50/50 split
  return hash(userId) % 2 === 0
}

app.post('/chat', async (req, res) => {
  const emotion = await jepa.processMessage(req.body.message)

  let response

  if (shouldUseEmotionAware(req.user.id)) {
    // Group A: Emotion-aware response
    response = await generateEmotionAwareResponse(req.body.message, emotion)
    groupA.push({ emotion, satisfied: await measureSatisfaction() })
  } else {
    // Group B: Standard response
    response = await generateStandardResponse(req.body.message)
    groupB.push({ emotion, satisfied: await measureSatisfaction() })
  }

  res.json({ response })
})

// Compare results
function compareStrategies() {
  const satisfactionA = average(groupA.map(g => g.satisfied))
  const satisfactionB = average(groupB.map(g => g.satisfied))

  console.log(`Emotion-aware: ${satisfactionA}% satisfaction`)
  console.log(`Standard: ${satisfactionB}% satisfaction`)
}
```

---

## Advanced Usage

### Custom Emotion Models

Train custom emotion models for your domain:

```javascript
import { JEPAAgentHandler } from '@superinstance/jepa'

class DomainSpecificJEPA extends JEPAAgentHandler {
  async analyzeEmotion(text, timestamp) {
    const baseEmotion = await super.analyzeEmotion(text, timestamp)

    // Custom logic for your domain
    if (text.includes('bug') || text.includes('error')) {
      // Developer frustration
      baseEmotion.valence = Math.min(baseEmotion.valence, 0.3)
      baseEmotion.emotions.push('developer-frustration')
    }

    return baseEmotion
  }
}

const agent = new DomainSpecificJEPA()
```

### Integration with Cascade Router

Use JEPA to inform model selection:

```javascript
import { CascadeRouter } from '@superinstance/cascade-router'
import { getJEPAAgent } from '@superinstance/jepa'

const router = new CascadeRouter()
const jepa = getJEPAAgent()

jepa.on('emotion_analyzed', (data) => {
  const { emotion } = data

  // If user is frustrated, use better model
  if (emotion.valence < 0.4 && emotion.arousal > 0.6) {
    router.setStrategy('quality')  // Use GPT-4
  } else {
    router.setStrategy('cost')     // Use cheaper model
  }
})
```

### Voice Emotion Analysis

Advanced usage with audio input:

```javascript
// Start recording
await agent.startRecording()

// Listen for audio windows
agent.on('audio_window', async (window) => {
  // Analyze emotion from audio features
  const emotion = await agent.analyzeAudio(window.audioBuffer)

  console.log('Voice emotion detected:', emotion.emotions)
})

// Export transcript with emotion markers
await agent.exportTranscript()
```

---

## Configuration

### JEPA Configuration

```yaml
# ~/.jepa/config.yaml

# Model settings
model:
  type: ml  # or rule-based
  model_path: ./models/emotion-classifier
  confidence_threshold: 0.5

# Audio settings
audio:
  enabled: true
  sample_rate: 16000
  window_size: 3000  # ms
  language: en

# Text analysis
text:
  enabled: true
  sentiment_analysis: true
  emotion_keywords: true

# Frustration detection
frustration:
  valence_threshold: 0.4
  arousal_threshold: 0.6
  confidence_threshold: 0.5
  consecutive_occurrences: 2  # Trigger after 2 frustrated messages

# Integration
integration:
  cascade_router:
    enabled: true
    frustration_strategy: quality
  spreader:
    enabled: true
    notify_on_frustration: true
```

---

## Tips and Tricks

### Tip 1: Calibrate for Your Domain

Emotion expressions vary by domain:

```javascript
// Developer communication
if (text.includes('WTF') || text.includes('broken')) {
  // High frustration
}

// Customer support
if (text.includes('cancel') || text.includes('refund')) {
  // Probably frustrated
}
```

### Tip 2: Don't Overreact

One frustrated message doesn't mean crisis:

```javascript
let frustrationCount = 0

jepa.on('emotion_analyzed', (data) => {
  if (isFrustrated(data.emotion)) {
    frustrationCount++

    if (frustrationCount >= 3) {
      // Now escalate
      escalateToHuman()
    }
  } else {
    frustrationCount = 0  // Reset
  }
})
```

### Tip 3: Use Multiple Signals

Combine emotion with other signals:

```javascript
const signals = {
  emotion: emotion.valence,
  responseTime: averageResponseTime,
  issueComplexity: categorizeIssue(userMessage),
  accountValue: user.accountValue,
  previousContacts: countPreviousContacts()
}

// Escalate if multiple red flags
if (signals.emotion < 0.3 &&
    signals.previousContacts > 3 &&
    signals.issueComplexity === 'high') {
  escalateNow()
}
```

### Tip 4: Respect User Privacy

Emotion data is sensitive:

```javascript
// Anonymize emotion data for analytics
const anonymized = {
  emotion: emotion.emotions[0],
  valence: emotion.valence,
  arousal: emotion.arousal,
  // Don't store exact text
  textHash: hash(userMessage.text)
}

// Get consent before recording
await agent.startRecording()
// Store consent with recording
```

---

## Troubleshooting

### Issue: "Emotion detection is inaccurate"

**Solution:**
```javascript
// Calibrate for your use case
const trainingData = [
  { text: "This is great!", expected: { valence: 0.9 } },
  { text: "This is broken", expected: { valence: 0.2 } },
  // ... more examples
]

await agent.calibrate(trainingData)
```

### Issue: "Too many false frustration alarms"

**Solution:**
```yaml
# Adjust thresholds
frustration:
  valence_threshold: 0.3  # Lower = less sensitive
  arousal_threshold: 0.7  # Higher = less sensitive
  consecutive_occurrences: 3  # Require 3 in a row
```

### Issue: "Audio recording not working"

**Solution:**
```javascript
// Check microphone permissions
const permissions = await navigator.permissions.query({ name: 'microphone' })

if (permissions.state !== 'granted') {
  // Request permission
  await navigator.mediaDevices.getUserMedia({ audio: true })
}
```

---

## Examples

### Example 1: Simple CLI Analysis

```bash
# Analyze text emotion
jepa analyze "I love this product!"

# Analyze from file
jepa analyze --file customer-feedback.txt

# Real-time monitoring
jepa monitor --conversation-id conv-123
```

### Example 2: Customer Support Bot

```javascript
import express from 'express'
import { getJEPAAgent } from '@superinstance/jepa'

const app = express()
const jepa = getJEPAAgent()

app.post('/support', async (req, res) => {
  const { message } = req.body

  // Analyze emotion
  const emotion = await jepa.processMessage({
    author: 'user',
    content: { text: message },
    timestamp: Date.now()
  })

  // Handle frustration
  if (emotion.valence < 0.3 && emotion.arousal > 0.6) {
    return res.json({
      response: "I understand your frustration, and I sincerely apologize. Let me immediately connect you with a senior specialist who can resolve this.",
      escalate: true
    })
  }

  // Normal response
  const response = await generateResponse(message)
  res.json({ response })
})
```

### Example 3: UX Research Analysis

```javascript
// Analyze user testing session
await jepa.startRecording()

// User performs tasks
// JEPA analyzes their emotional reactions

const sessionEmotions = []

jepa.on('emotion_analyzed', (data) => {
  sessionEmotions.push({
    task: currentTask,
    emotion: data.emotion,
    timestamp: data.timestamp
  })
})

// After session
await jepa.stopRecording()

// Generate report
const report = {
  tasks: sessionEmotions.groupBy('task'),
  frustrationPoints: sessionEmotions.filter(e =>
    e.emotion.valence < 0.4
  ),
  recommendations: generateRecommendations(sessionEmotions)
}
```

---

## Best Practices

1. **Calibrate for Your Domain:** Emotion expressions vary by context

2. **Don't Overreact:** Require multiple signals before escalating

3. **Combine Signals:** Use emotion + behavior + context

4. **Respect Privacy:** Emotion data is sensitive, handle carefully

5. **Provide Escape Hatch:** Always allow users to request human help

6. **Monitor Accuracy:** Regularly validate emotion predictions

7. **Be Transparent:** Tell users when emotion analysis is active

---

## Reference

### CLI Commands

```bash
# Analyze emotion
jepa analyze "Your text here"

# Analyze file
jepa analyze --file input.txt

# Monitor conversation
jepa monitor --conversation-id <id>

# Calibrate model
jepa calibrate --training-data ./examples.json

# Export transcript
jepa export --format markdown
```

### API Reference

```javascript
// Initialize agent
const agent = getJEPAAgent()
await agent.initialize()

// Analyze text
const emotion = await agent.analyzeEmotion(text, timestamp)

// Start/stop recording
await agent.startRecording()
agent.stopRecording()

// Event listeners
agent.on('emotion_analyzed', callback)
agent.on('recording_started', callback)
agent.on('recording_stopped', callback)

// Export
const transcript = await agent.exportTranscript()
```

### Emotion Object

```typescript
interface EmotionAnalysis {
  segmentId: string
  timestamp: number
  valence: number      // 0-1 (negative to positive)
  arousal: number      // 0-1 (calm to energetic)
  dominance: number    // 0-1 (submissive to confident)
  confidence: number   // 0-1 (certainty)
  emotions: string[]   // Detected emotion labels
}
```

---

## Next Steps

1. Try basic emotion analysis with your text data
2. Integrate into your chatbot or assistant
3. Calibrate for your specific domain
4. Set up frustration escalation logic
5. Monitor and improve accuracy over time

**Need help?** [GitHub Discussions](https://github.com/SuperInstance/JEPA/discussions)

**Want to contribute?** [CONTRIBUTING.md](https://github.com/SuperInstance/JEPA/blob/main/CONTRIBUTING.md)
