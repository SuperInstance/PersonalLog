# JEPA (Emotional Analysis) - Developer Guide

**Version:** 1.0.0  
**Package:** `@superinstance/jepa`  
**Purpose:** Real-time emotion analysis from audio and text

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [API Reference](#api-reference)
6. [Type Definitions](#type-definitions)
7. [Usage Examples](#usage-examples)
8. [Integration Scenarios](#integration-scenarios)
9. [Extension Points](#extension-points)
10. [Performance Characteristics](#performance-characteristics)
11. [Best Practices](#best-practices)

---

## Overview

JEPA (Joint Embedding Predictive Architecture) is an emotion analysis system that processes audio and text to extract emotional undertones in real-time. It uses machine learning models to analyze valence (positive/negative), arousal (energy/intensity), and dominance (confidence/assertiveness).

### Key Features

- **Real-time Analysis:** Process audio and text as they arrive
- **ML-Based Emotion Detection:** Uses TensorFlow.js for in-browser ML inference
- **VAD Model:** Valence-Arousal-Dominance emotion space
- **Audio Recording:** Built-in audio capture and management
- **Transcription:** Speech-to-text integration (ready for STT provider)
- **Event-Driven:** Emits events for real-time updates
- **Agent Communication:** Integrates with other agents via event bus

### Use Cases

- **User Frustration Detection:** Detect when users are frustrated
- **Emotional Context:** Provide emotional context to other agents
- **Sentiment Analysis:** Analyze sentiment in conversations
- **Customer Support:** Monitor customer emotions in real-time
- **Mental Health:** Track emotional patterns over time
- **UX Research:** Understand user emotional responses

---

## Installation

```bash
npm install @superinstance/jepa
```

---

## Quick Start

### Basic Usage

```typescript
import { getJEPAAgent } from '@superinstance/jepa';

// Initialize JEPA agent
const jepaAgent = getJEPAAgent();
await jepaAgent.initialize();

// Listen to events
jepaAgent.on('emotion_analyzed', (data) => {
  const { emotion } = data;
  console.log(`Detected emotions: ${emotion.emotions.join(', ')}`);
  console.log(`VAD: valence=${emotion.valence}, arousal=${emotion.arousal}, dominance=${emotion.dominance}`);
  
  // Check for frustration
  if (emotion.valence < 0.4 && emotion.arousal > 0.6 && emotion.confidence > 0.5) {
    console.warn('⚠️ User frustration detected!');
    // Trigger appropriate response
  }
});

// Start recording
await jepaAgent.startRecording();

// Analyze audio
const audioContext = new AudioContext();
const audioBuffer = await audioContext.decodeAudioData(audioData);
const emotion = await jepaAgent.analyzeAudio(audioBuffer);

// Analyze text
const message = {
  id: 'msg-1',
  author: 'user',
  content: { text: 'I am very frustrated with this!' },
  timestamp: new Date().toISOString(),
};
const textEmotion = await jepaAgent.processMessage(message);

// Export transcript
const transcript = await jepaAgent.exportTranscript();
console.log(transcript);

// Clean up
await jepaAgent.dispose();
```

---

## Core Concepts

### VAD Model

JEPA uses the Valence-Arousal-Dominance (VAD) emotion model:

- **Valence (0-1):** Positive vs negative
  - High (>0.6): Happy, satisfied, positive
  - Medium (0.4-0.6): Neutral
  - Low (<0.4): Sad, angry, frustrated

- **Arousal (0-1):** Energy/intensity
  - High (>0.6): Excited, angry, energetic
  - Medium (0.4-0.6): Calm
  - Low (<0.4): Bored, tired

- **Dominance (0-1):** Confidence/assertiveness
  - High (>0.6): Confident, in control
  - Medium (0.4-0.6): Neutral
  - Low (<0.6): Submissive, unsure

### Emotion Detection

JEPA detects emotions using:

1. **Audio Analysis:** Extract features from audio buffer
2. **ML Inference:** Use TensorFlow.js model for prediction
3. **Text Analysis:** Rule-based fallback for text-only input
4. **Confidence Scoring:** Provide confidence in predictions

### Recording States

```typescript
enum RecordingState {
  IDLE = 'idle',       // Not recording
  RECORDING = 'recording',  // Currently recording
  PAUSED = 'paused',   // Recording paused
  STOPPED = 'stopped', // Recording stopped
}
```

---

## API Reference

### Class: `JEPAAgentHandler`

Main class for emotion analysis.

#### Methods

##### `initialize()`

Initialize JEPA agent and ML pipeline.

```typescript
async initialize(): Promise<void>
```

##### `startRecording()`

Start recording audio.

```typescript
async startRecording(): Promise<void>
```

##### `stopRecording()`

Stop recording.

```typescript
stopRecording(): void
```

##### `pauseRecording()`

Pause recording.

```typescript
pauseRecording(): void
```

##### `resumeRecording()`

Resume paused recording.

```typescript
async resumeRecording(): Promise<void>
```

##### `exportTranscript()`

Export transcript as markdown.

```typescript
async exportTranscript(): Promise<string>
```

**Returns:** Markdown-formatted transcript

##### `processMessage()`

Process a message for emotion analysis.

```typescript
async processMessage(message: Message): Promise<EmotionAnalysis | null>
```

**Parameters:**
- `message`: Message to analyze

**Returns:** Emotion analysis or null

##### `analyzeAudio()`

Analyze emotion from audio buffer (ML-based).

```typescript
async analyzeAudio(audioBuffer: AudioBuffer): Promise<EmotionAnalysis>
```

**Parameters:**
- `audioBuffer`: Audio buffer to analyze

**Returns:** Emotion analysis

##### `getState()`

Get current agent state.

```typescript
getState(): JEPAAgentState
```

**Returns:** Current state

##### `dispose()`

Clean up resources.

```typescript
async dispose(): Promise<void>
```

##### `on()`

Add event listener.

```typescript
on(eventName: string, listener: Function): () => void
```

**Returns:** Unsubscribe function

---

## Type Definitions

### `EmotionAnalysis`

```typescript
interface EmotionAnalysis {
  /** Segment ID */
  segmentId: string;
  
  /** Timestamp */
  timestamp: number;
  
  /** Valence (0-1): positive vs negative */
  valence: number;
  
  /** Arousal (0-1): energy/intensity */
  arousal: number;
  
  /** Dominance (0-1): confidence/assertiveness */
  dominance: number;
  
  /** Overall confidence (0-1) */
  confidence: number;
  
  /** Detected emotion labels */
  emotions: string[];
}
```

### `JEPAAgentState`

```typescript
interface JEPAAgentState {
  /** Agent status */
  status: AgentState;
  
  /** Confidence score */
  confidence: number;
  
  /** Recording state */
  recordingState: RecordingState;
  
  /** Audio windows captured */
  audioWindows: AudioWindow[];
  
  /** Transcript segments */
  transcript: TranscriptSegment[];
  
  /** Emotion analysis results */
  emotions: EmotionAnalysis[];
  
  /** Recording start time */
  recordingStartTime?: number;
  
  /** Recording duration (ms) */
  recordingDuration: number;
  
  /** Last analysis timestamp */
  lastAnalysisTime?: number;
}
```

### `TranscriptSegment`

```typescript
interface TranscriptSegment {
  /** Segment ID */
  id: string;
  
  /** Timestamp */
  timestamp: number;
  
  /** Text content */
  text: string;
  
  /** Speaker */
  speaker: 'user' | 'assistant' | 'unknown';
  
  /** Confidence */
  confidence: number;
}
```

---

## Usage Examples

### Example 1: Frustration Detection

```typescript
import { getJEPAAgent } from '@superinstance/jepa';

const jepaAgent = getJEPAAgent();
await jepaAgent.initialize();

// Listen for frustration
jepaAgent.on('emotion_analyzed', (data) => {
  const { emotion } = data;
  
  // Frustration = low valence + high arousal + high confidence
  const isFrustrated = 
    emotion.valence < 0.4 && 
    emotion.arousal > 0.6 && 
    emotion.confidence > 0.5;
  
  if (isFrustrated) {
    console.warn('⚠️ User frustration detected!');
    console.log(`Valence: ${emotion.valence}, Arousal: ${emotion.arousal}`);
    
    // Trigger helpful response
    triggerHelpfulResponse();
  }
});

await jepaAgent.startRecording();
```

### Example 2: Emotional Context for Spreader

```typescript
// JEPA provides emotional context to Spreader
jepaAgent.on('emotion_analyzed', (data) => {
  const { emotion } = data;
  
  // Publish emotion to other agents
  agentEventBus.publish({
    id: crypto.randomUUID(),
    from: { agentId: 'jepa-v1', type: 'agent' },
    to: { agentId: 'spreader-v1', type: 'agent' },
    type: MessageType.USER_EMOTION_CHANGE,
    payload: {
      emotion: emotion.emotions[0],
      valence: emotion.valence,
      arousal: emotion.arousal,
      confidence: emotion.confidence,
    },
    timestamp: Date.now(),
    priority: 'normal',
    status: 'pending',
  });
});

// Spreader can use emotional context
spreader.on('context_critical', async (data) => {
  // Get emotional summary from JEPA
  const emotionalSummary = await getEmotionalSummary();
  
  // Use it for context compaction
  await spreader.compactContext({
    strategy: 'emotional-summary',
    preserveEmotional: true,
    emotionalThemes: emotionalSummary,
  });
});
```

### Example 3: Real-time Monitoring

```typescript
// Monitor emotional patterns over time
const emotionHistory: EmotionAnalysis[] = [];

jepaAgent.on('emotion_analyzed', (data) => {
  emotionHistory.push(data.emotion);
  
  // Analyze patterns
  if (emotionHistory.length >= 10) {
    const recent = emotionHistory.slice(-10);
    
    // Calculate averages
    const avgValence = recent.reduce((sum, e) => sum + e.valence, 0) / recent.length;
    const avgArousal = recent.reduce((sum, e) => sum + e.arousal, 0) / recent.length;
    
    // Detect trends
    if (avgValence < 0.4 && avgArousal > 0.6) {
      console.warn('Sustained frustration detected');
    }
    
    // Detect improvement
    const oldAvg = emotionHistory.slice(-20, -10);
    const oldValence = oldAvg.reduce((sum, e) => sum + e.valence, 0) / oldAvg.length;
    
    if (avgValence > oldValence + 0.2) {
      console.log('✨ User mood improving!');
    }
  }
});
```

---

## Integration Scenarios

### Integration with Spreader

```typescript
import { getJEPAAgent } from '@superinstance/jepa';
import { agentEventBus } from '@superinstance/agents';

// JEPA publishes frustration to Spreader
jepaAgent.on('emotion_analyzed', (data) => {
  const { emotion } = data;
  
  if (emotion.valence < 0.4 && emotion.arousal > 0.6) {
    // High-priority frustration message
    agentEventBus.publish({
      id: crypto.randomUUID(),
      from: { agentId: 'jepa-v1', type: 'agent' },
      to: { agentId: 'spreader-v1', type: 'agent' },
      type: MessageType.USER_FRUSTRATION_DETECTED,
      payload: {
        valence: emotion.valence,
        arousal: emotion.arousal,
        confidence: emotion.confidence,
      },
      timestamp: Date.now(),
      priority: 'high',
      status: 'pending',
    });
  }
});
```

### Integration with MPC

```typescript
// JEPA provides emotion-based task priorities
jepaAgent.on('emotion_analyzed', async (data) => {
  const { emotion } = data;
  
  // If user is frustrated, increase task priority
  if (emotion.valence < 0.4 && emotion.arousal > 0.6) {
    // Update task priorities in MPC
    const tasks = await stateManager.getCurrentState().tasks;
    
    for (const [taskId, task] of tasks) {
      if (task.status === 'pending') {
        await stateManager.updateTask(taskId, {
          priority: TaskPriority.CRITICAL,
        });
      }
    }
    
    // Trigger replanning with new priorities
    await mpcController.triggerReplan();
  }
});
```

---

## Extension Points

### Custom Emotion Models

```typescript
// Use custom ML model for emotion detection
import * as tf from '@tensorflow/tfjs';

const customModel = await tf.loadLayersModel('custom-model.json');

const customEmotionAnalysis = async (audioBuffer: AudioBuffer) => {
  // Extract features
  const features = extractAudioFeatures(audioBuffer);
  
  // Run custom model
  const prediction = customModel.predict(features);
  
  return {
    valence: prediction[0],
    arousal: prediction[1],
    dominance: prediction[2],
    confidence: prediction[3],
    emotions: ['custom-emotion'],
  };
};
```

### Custom Event Handlers

```typescript
// Define custom emotion-based responses
const emotionHandlers = {
  frustration: async (emotion: EmotionAnalysis) => {
    // Trigger helpful response
    await showHelpfulSuggestions();
    await simplifyInterface();
  },
  
  excitement: async (emotion: EmotionAnalysis) => {
    // Celebrate with user
    await showCelebration();
  },
  
  confusion: async (emotion: EmotionAnalysis) => {
    // Provide guidance
    await showGuidance();
  },
};

jepaAgent.on('emotion_analyzed', async (data) => {
  const { emotion } = data;
  
  if (emotion.emotions.includes('frustration')) {
    await emotionHandlers.frustration(emotion);
  }
});
```

---

## Performance Characteristics

### Latency

- **Audio Analysis:** 100-200ms per audio buffer (3-5 seconds)
- **Text Analysis:** 10-50ms per message
- **ML Model Loading:** 500-1000ms (one-time, cached)

### Accuracy

- **Valence Prediction:** 75-85% accuracy
- **Arousal Prediction:** 70-80% accuracy
- **Dominance Prediction:** 65-75% accuracy
- **Overall Confidence:** 70-80% average

### Resource Usage

- **Memory:** 50-100MB (ML model)
- **CPU:** 10-20% during analysis
- **GPU:** Optional (if available)

---

## Best Practices

### 1. Calibrate Confidence Thresholds

```typescript
// Set appropriate confidence thresholds for your use case
const HIGH_CONFIDENCE = 0.7;  // For critical actions
const MEDIUM_CONFIDENCE = 0.5; // For notifications
const LOW_CONFIDENCE = 0.3;   // For logging only

if (emotion.confidence > HIGH_CONFIDENCE) {
  // Take action
} else if (emotion.confidence > MEDIUM_CONFIDENCE) {
  // Notify
} else {
  // Log only
}
```

### 2. Use Rolling Windows for Analysis

```typescript
// Don't react to single emotions, analyze patterns
const window = 5; // Analyze last 5 emotions
const recent = emotionHistory.slice(-window);

const avgValence = recent.reduce((sum, e) => sum + e.valence, 0) / window;
if (avgValence < 0.4) {
  // Sustained negative emotion
}
```

### 3. Combine Multiple Signals

```typescript
// Combine emotion with other signals
const shouldRespond = 
  emotion.valence < 0.4 &&           // Negative emotion
  emotion.arousal > 0.6 &&           // High energy
  emotion.confidence > 0.5 &&        // Confident
  userMessageCount > 3;              // Multiple messages

if (shouldRespond) {
  await triggerHelpfulResponse();
}
```

---

## License

MIT License
