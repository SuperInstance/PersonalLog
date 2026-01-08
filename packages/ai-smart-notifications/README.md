# @superinstance/ai-smart-notifications

> AI-powered smart notification system that predicts and proactively alerts users about potential issues before they occur

[![npm version](https://badge.fury.io/js/%40superinstance%2Fai-smart-notifications.svg)](https://www.npmjs.com/package/@superinstance/ai-smart-notifications)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Predictive Notifications**: Warn users about issues before they occur based on system state predictions
- **Smart Timing**: Shows notifications at optimal times to avoid interrupting important work
- **User Activity Awareness**: Tracks typing, operations, and user focus to time notifications perfectly
- **Priority-Based Queue**: Intelligently prioritizes notifications by urgency, confidence, and user preferences
- **Adaptive Learning**: Learns from user feedback to improve notification relevance
- **Quiet Hours**: Respects user-defined quiet hours for non-critical notifications
- **Comprehensive Metrics**: Tracks effectiveness, action rates, and user satisfaction

## Installation

```bash
npm install @superinstance/ai-smart-notifications
```

## Quick Start

```typescript
import { createNotificationEngine, NotificationTrigger } from '@superinstance/ai-smart-notifications';

// Create notification engine
const engine = createNotificationEngine({
  enabled: true,
  quietHours: {
    enabled: true,
    start: 22, // 10 PM
    end: 8,    // 8 AM
  },
});

// Evaluate notifications based on predictions
const notifications = await engine.evaluateNotifications({
  resources: {
    resourceType: 'storage',
    currentUsage: 0.75,
    predictedUsage: 0.90,
    timeframe: 3600000,
    confidence: 0.9,
    trend: 'increasing',
  },
});

// Get pending notifications
const pending = engine.getPendingNotifications();
if (pending.length > 0) {
  const topPriority = pending[0];
  console.log(`Notification: ${topPriority.notification.title}`);
  console.log(`Can show now: ${topPriority.canShow}`);
  console.log(`Priority: ${topPriority.priority}`);
}

// User dismisses notification
engine.dismissNotification(topPriority.notification.id);

// Or user takes action
await engine.executeAction(topPriority.notification.id, 'clear_cache');
```

## Core Concepts

### Notification Triggers

Notifications are triggered by various prediction types:

- **Performance**: High CPU/memory, storage full, performance degrading
- **Resource**: Battery low, network degrading, high token usage
- **Agent**: Agent needed soon, agent ready
- **Context**: Task blocking, context too long
- **User State**: Frustration detected, inactivity timeout
- **Suggestions**: Features, optimizations, backup needed
- **System**: Updates available, error recovery

### Urgency Levels

- **CRITICAL**: Immediate action required (shows immediately)
- **HIGH**: Should address soon (shows within 5 seconds)
- **MEDIUM**: Should address eventually (batched with others)
- **LOW**: Nice to know (can wait for optimal time)

### Smart Timing

The system considers:
- User activity (typing, operations, idle time)
- App focus state
- Recent notification frequency
- Quiet hours
- User emotional state

## Usage Examples

### Example 1: Resource Prediction

```typescript
import { createNotificationEngine } from '@superinstance/ai-smart-notifications';

const engine = createNotificationEngine();

// Simulate storage prediction
const storagePrediction = {
  resourceType: 'storage',
  currentUsage: 0.80,
  predictedUsage: 0.92,
  timeframe: 3600000, // 1 hour
  confidence: 0.9,
  trend: 'increasing' as const,
};

// Evaluate
const notifications = await engine.evaluateNotifications({
  resources: storagePrediction,
});

// Show notification
if (notifications.length > 0) {
  const notification = notifications[0];
  console.log(notification.title);
  // "Storage Almost Full"
  console.log(notification.message);
  // "Local storage is 92% full. Clear old data to prevent issues."
  console.log(notification.actions);
  // [{ id: 'clear_old_data', label: 'Clear Old Data', primary: true }]
}
```

### Example 2: Agent Preloading

```typescript
import { createNotificationEngine, NotificationTrigger } from '@superinstance/ai-smart-notifications';

const engine = createNotificationEngine();

// Predict agent will be needed soon
const agentNeeds = [
  {
    agentId: 'code-reviewer',
    probability: 0.85,
    timeframe: 30000, // 30 seconds
    confidence: 0.8,
    reason: 'User writing code',
  },
];

// Evaluate
const notifications = await engine.evaluateNotifications({
  agentNeeds,
});

// Show proactive suggestion
notifications.forEach(notification => {
  if (notification.trigger === NotificationTrigger._AGENT_NEEDED_SOON) {
    console.log(`Suggestion: ${notification.title}`);
    // "Agent May Be Needed Soon"
    console.log(`Reason: ${notification.message}`);
    // "code-reviewer is predicted to be needed soon. Preload now?"

    // User accepts
    engine.executeAction(notification.id, 'preload_agent');
  }
});
```

### Example 3: Anomaly Detection

```typescript
import { createNotificationEngine } from '@superinstance/ai-smart-notifications';

const engine = createNotificationEngine();

// Detect anomaly
const anomalies = [
  {
    isAnomaly: true,
    type: 'resource_spike',
    severity: 0.85,
    description: 'Unusual memory usage spike detected',
    suggestions: [
      'Check for memory leaks',
      'Clear cache',
      'Restart application'
    ],
    confidence: 0.8,
    timestamp: Date.now(),
  },
];

// Evaluate
const notifications = await engine.evaluateNotifications({
  anomalies,
});

// Show high-urgency notification
notifications.forEach(notification => {
  console.log(`Urgency: ${notification.urgency}`); // "high"
  console.log(`Confidence: ${notification.confidence}`); // 0.8

  // User can take suggested actions
  notification.actions.forEach(action => {
    console.log(`Action: ${action.label}`);
    // "Check for memory leaks"
    // "Clear cache"
    // "Restart application"
  });
});
```

### Example 4: Tracking User Activity

```typescript
import {
  getActivityTracker,
  startTyping,
  stopTyping,
  recordUserAction,
} from '@superinstance/ai-smart-notifications';

const tracker = getActivityTracker();

// Track user activity
document.addEventListener('keydown', () => {
  startTyping();
});

document.addEventListener('keyup', () => {
  stopTyping();
});

// Record actions
function onUserButtonClick() {
  recordUserAction();
}

// Get current context
const context = tracker.getContext(
  { enabled: true, start: 22, end: 8 },
  true  // appFocused
);

console.log(`User typing: ${context.isTyping}`);
console.log(`Time since last action: ${context.timeSinceLastAction}ms`);
console.log(`In quiet hours: ${context.inQuietHours}`);
```

### Example 5: Custom Settings

```typescript
import { createNotificationEngine } from '@superinstance/ai-smart-notifications';

const engine = createNotificationEngine({
  enabled: true,
  quietHours: {
    enabled: true,
    start: 22,
    end: 8,
  },
  maxNotificationsPerHour: 5,
  batchLowUrgency: true,
  batchInterval: 300000, // 5 minutes
  enableLearning: true,
  defaultSnoozeDuration: 900000, // 15 minutes
});

// Update settings later
engine.updateSettings({
  maxNotificationsPerHour: 10,
  enableLearning: false,
});

// Get current settings
const settings = engine.getSettings();
console.log(settings);
```

### Example 6: Notification Queue Management

```typescript
import { createNotificationEngine } from '@superinstance/ai-smart-notifications';

const engine = createNotificationEngine();

// Get queue statistics
const stats = engine.getQueueStats();
console.log(`Total pending: ${stats.totalPending}`);
console.log(`By urgency:`, stats.byUrgency);
console.log(`By category:`, stats.byCategory);
console.log(`Average confidence: ${stats.avgConfidence}`);

// Get pending notifications (sorted by priority)
const pending = engine.getPendingNotifications();

pending.forEach(entry => {
  console.log(`Notification: ${entry.notification.title}`);
  console.log(`Priority: ${entry.priority}`);
  console.log(`Can show now: ${entry.canShow}`);
  console.log(`Blocked reason: ${entry.blockedReason}`);
  console.log(`Recommended time: ${new Date(entry.recommendedShowTime)}`);
});

// Dismiss a notification
engine.dismissNotification(pending[0].notification.id);

// Snooze for custom duration
engine.snoozeNotification(pending[0].notification.id, 1800000); // 30 min
```

### Example 7: Analytics & Metrics

```typescript
import { createNotificationEngine } from '@superinstance/ai-smart-notifications';

const engine = createNotificationEngine();

// Get effectiveness metrics
const metrics = engine.getEffectivenessMetrics();

console.log(`Total shown: ${metrics.totalShown}`);
console.log(`Total acted upon: ${metrics.totalActedUpon}`);
console.log(`Action rate: ${(metrics.actionRate * 100).toFixed(1)}%`);
console.log(`Issues prevented: ${metrics.issuesPrevented}`);
console.log(`Prevention rate: ${(metrics.preventionRate * 100).toFixed(1)}%`);
console.log(`Average helpfulness: ${(metrics.avgHelpfulness * 100).toFixed(1)}%`);

// Per-trigger breakdown
Object.entries(metrics.byTrigger).forEach(([trigger, stats]) => {
  console.log(`${trigger}:`);
  console.log(`  Shown: ${stats.shown}`);
  console.log(`  Acted upon: ${stats.actedUpon}`);
  console.log(`  Helpfulness: ${(stats.helpfulness * 100).toFixed(1)}%`);
});

// Get notification history
const history = engine.getHistory(20); // Last 20 notifications
history.forEach(entry => {
  console.log(`[${new Date(entry.shownAt).toISOString()}] ${entry.trigger}`);
  console.log(`  Action: ${entry.action}`);
  console.log(`  Helpful: ${entry.feedback?.helpful}`);
});
```

## API Reference

### ProactiveNotificationEngine

Main class for managing notifications.

#### Constructor

```typescript
constructor(settings?: Partial<NotificationSettings>)
```

Creates a new notification engine with optional settings.

#### Methods

##### evaluateNotifications()

```typescript
async evaluateNotifications(predictions?: {
  states?: ConversationState[];
  agentNeeds?: AgentNeedPrediction[];
  resources?: ResourcePrediction;
  anomalies?: AnomalyDetection[];
}): Promise<ProactiveNotification[]>
```

Evaluates predictions and generates notifications.

##### getPendingNotifications()

```typescript
getPendingNotifications(): NotificationQueueEntry[]
```

Returns pending notifications sorted by priority.

##### getQueueStats()

```typescript
getQueueStats(): NotificationQueueStats
```

Returns statistics about the notification queue.

##### dismissNotification()

```typescript
dismissNotification(id: string): void
```

Dismisses a notification.

##### executeAction()

```typescript
async executeAction(notificationId: string, actionId: string): Promise<void>
```

Executes a notification action.

##### snoozeNotification()

```typescript
snoozeNotification(id: string, duration?: number): void
```

Snoozes a notification for a specified duration.

##### getHistory()

```typescript
getHistory(limit?: number): NotificationHistoryEntry[]
```

Returns notification history.

##### getEffectivenessMetrics()

```typescript
getEffectivenessMetrics(): NotificationEffectivenessMetrics
```

Returns effectiveness metrics.

##### updateSettings()

```typescript
updateSettings(newSettings: Partial<NotificationSettings>): void
```

Updates notification settings.

##### getSettings()

```typescript
getSettings(): NotificationSettings
```

Returns current settings.

### UserActivityTracker

Tracks user activity for smart timing.

#### Methods

##### recordAction()

```typescript
recordAction(): void
```

Records a user action.

##### startTyping() / stopTyping()

```typescript
startTyping(): void
stopTyping(): void
```

Tracks typing state.

##### startOperation() / endOperation()

```typescript
startOperation(): void
endOperation(): void
```

Tracks active operations.

##### getContext()

```typescript
getContext(
  quietHours: { enabled: boolean; start: number; end: number },
  appFocused: boolean
): UserActivityContext
```

Gets current activity context.

## Settings

### NotificationSettings

```typescript
interface NotificationSettings {
  enabled: boolean;
  preferences: Record<NotificationTrigger, NotificationPreferences>;
  quietHours: {
    enabled: boolean;
    start: number; // 0-23
    end: number;   // 0-23
  };
  maxNotificationsPerHour: number;
  notificationFrequencyLimit: number;
  batchLowUrgency: boolean;
  batchInterval: number;
  enableLearning: boolean;
  defaultSnoozeDuration: number;
}
```

## License

MIT © [SuperInstance](https://github.com/SuperInstance)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Repository

[https://github.com/SuperInstance/AI-Smart-Notifications](https://github.com/SuperInstance/AI-Smart-Notifications)
