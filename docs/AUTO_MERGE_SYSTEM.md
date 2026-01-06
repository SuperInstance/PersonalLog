# Auto-Merge Engine Documentation

## Overview

The Auto-Merge Engine is an intelligent system that automatically merges results from child conversations back into their parent conversation. It detects conflicts, applies merge strategies, and handles schema updates seamlessly.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Auto-Merge Engine                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Conflict Detection Layer                   │  │
│  │  • Schema conflicts (COMPLETED, NEXT, DECISIONS)     │  │
│  │  • Content contradictions                            │  │
│  │  • Overlapping changes                               │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │           Strategy Selection Layer                   │  │
│  │  • Auto-Merge (safe)                                 │  │
│  │  • Keep Latest (prefer child)                        │  │
│  │  • Keep All (preserve metadata)                      │  │
│  │  • Summarize (add summary)                           │  │
│  │  • Ask User (requires input)                         │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │              Merge Execution Layer                   │  │
│  │  • Apply selected strategy                           │  │
│  │  • Update parent schema                              │  │
│  │  • Merge content arrays                              │  │
│  │  • Notify user                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Conflict Types

### 1. Schema Conflicts

**COMPLETED List Conflicts**
- Severity: `warning`
- Occurs when an item appears in both parent and child COMPLETED lists
- Resolution: Keep one, merge both (dedupe), or keep child version

**NEXT List Conflicts**
- Severity: `info`
- Occurs when child's NEXT list contains items already in parent's COMPLETED
- Resolution: Remove from NEXT, add to COMPLETED, or keep both

**DECISIONS Conflicts**
- Severity: `critical`
- Occurs when parent and child have different values for the same decision
- Resolution: Keep parent, keep child, merge, or ask user

**TECHNICAL_SPECS Conflicts**
- Severity: `warning`
- Occurs when technical specifications differ
- Resolution: Keep parent, keep child, or merge objects

### 2. Content Contradictions

**Summary Contradictions**
- Severity: `critical`
- Occurs when child summaries contain contradictory statements
- Detection: Keyword-based (e.g., "cannot" vs "definitely")
- Resolution: Keep first, keep second, merge, or ask user

### 3. Overlapping Changes

**Duplicate Completions**
- Severity: `info`
- Occurs when multiple child tasks complete the same item
- Resolution: Dedupe or note which tasks completed it

## Merge Strategies

### Auto-Merge Strategy

**Best for:** Clean merges with no conflicts

```typescript
// Merges if no critical or warning conflicts
canAutoMerge(conflicts: MergeConflict[]): boolean {
  return !conflicts.some(c => c.severity === 'critical' || c.severity === 'warning');
}
```

**Behavior:**
- Merges COMPLETED lists (deduped)
- Merges NEXT lists (deduped)
- Merges DECISIONS objects (child overrides)
- Merges TECHNICAL_SPECS objects (child overrides)
- Appends content arrays

### Keep-Latest Strategy

**Best for:** Favoring most recent work

```typescript
// Always merges, prefers child values
canAutoMerge(conflicts: MergeConflict[]): boolean {
  return true;
}
```

**Behavior:**
- Same as auto-merge, but:
  - Child's NEXT list completely replaces parent's
  - Child's decisions override parent's without warning

### Keep-All Strategy

**Best for:** Audit trails, comprehensive records

```typescript
// Preserves all versions with metadata
canAutoMerge(conflicts: MergeConflict[]): boolean {
  return true;
}
```

**Behavior:**
- Adds `_mergeMetadata` array to schema
- Records timestamp, source, and task ID
- Preserves all information

### Summarize Strategy

**Best for:** Complex merges requiring documentation

```typescript
// Merges and adds summary if <10 conflicts
canAutoMerge(conflicts: MergeConflict[]): boolean {
  return conflicts.length < 10;
}
```

**Behavior:**
- Same as auto-merge
- Adds summary section with:
  - Task name
  - Completed items
  - Conflict statistics

### Ask-User Strategy

**Best for:** Critical conflicts requiring human judgment

```typescript
// Never auto-merges, always requires user input
canAutoMerge(conflicts: MergeConflict[]): boolean {
  return false;
}
```

**Behavior:**
- Shows conflict resolution UI
- User chooses resolution for each conflict
- Can provide custom values
- Preview before applying

## Usage

### Basic Auto-Merge

```typescript
import { autoMergeEngine } from '@/lib/agents/spread/auto-merge';
import { getConversation } from '@/lib/db/conversations';

// Get parent conversation
const parentConversation = await getConversation('conv-123');

// Child result from completed task
const childResult = {
  taskId: 'implement-auth',
  conversationId: 'child-conv-456',
  summary: 'Implemented JWT authentication',
  schema: {
    COMPLETED: ['auth-jwt', 'auth-refresh'],
    DECISIONS: {
      'auth-method': 'jwt'
    }
  },
  timestamp: Date.now()
};

// Auto-merge
const result = await autoMergeEngine.mergeChildResult(
  parentConversation,
  childResult,
  {
    notifyUser: true  // Send notification message
  }
);

if (result.success) {
  console.log('Merged successfully');
  console.log(`Resolved ${result.conflictsResolved} conflicts`);
} else if (result.requiredUserInput) {
  console.log('User needs to resolve conflicts');
}
```

### Preview Conflicts

```typescript
// Preview without merging
const conflicts = await autoMergeEngine.previewConflicts(
  parentConversation,
  childResult
);

for (const conflict of conflicts) {
  console.log(`${conflict.severity}: ${conflict.description}`);
}
```

### Manual Conflict Resolution

```typescript
// Apply user's chosen resolutions
const resolutions: ConflictResolution[] = [
  {
    conflictId: 'decision-auth-method',
    resolution: 'keep-child',
    customValue: undefined
  },
  {
    conflictId: 'completed-auth-jwt',
    resolution: 'keep-one',
    customValue: undefined
  }
];

const result = await autoMergeEngine.applyUserResolution(
  parentConversation,
  childResult,
  resolutions
);
```

### Custom Strategy

```typescript
import { MergeStrategy, MergeResult } from '@/lib/agents/spread/merge-types';
import { mergeStrategyRegistry } from '@/lib/agents/spread/merge-strategies';

class CustomStrategy implements MergeStrategy {
  name = 'custom-prefer-parent';
  description = 'Always prefer parent values over child';

  canAutoMerge(conflicts: MergeConflict[]): boolean {
    return true;
  }

  async merge(
    parent: any,
    child: any,
    conflicts: MergeConflict[]
  ): Promise<MergeResult> {
    // Custom merge logic
    return {
      success: true,
      merged: { schema: parent.schema },
      conflicts,
      conflictsResolved: conflicts.length,
      requiredUserInput: false
    };
  }
}

// Register
mergeStrategyRegistry.register(new CustomStrategy());

// Use
const result = await autoMergeEngine.mergeChildResult(
  parentConversation,
  childResult,
  { strategy: new CustomStrategy() }
);
```

## Integration with Spreader Agent

```typescript
import { SpreaderAgentHandler } from '@/lib/agents/spread/spreader-integration';

class SpreaderAgent {
  private spreaderHandler: SpreaderAgentHandler;

  constructor(parentConversation: Conversation) {
    this.spreaderHandler = new SpreaderAgentHandler(parentConversation);
  }

  async onChildTaskComplete(childResult: ChildResult) {
    // Automatically merge with conflict detection
    await this.spreaderHandler.onChildComplete(childResult);
  }

  async onUserResolution(taskId: string, resolutions: ConflictResolution[]) {
    const childResult = this.getChildResult(taskId);
    await this.spreaderHandler.applyUserResolutions(childResult, resolutions);
  }
}
```

## Conflict Resolution UI

The `MergeConflictResolver` component provides a user-friendly interface:

```tsx
import { MergeConflictResolver } from '@/components/agents/spreader/MergeConflictResolver';

function MyComponent() {
  const [conflicts, setConflicts] = useState<MergeConflict[]>([]);

  const handleResolve = (resolutions: ConflictResolution[] | null) => {
    if (resolutions) {
      // Apply resolutions
      autoMergeEngine.applyUserResolution(parentConv, childResult, resolutions);
    } else {
      // User cancelled
    }
  };

  return (
    <MergeConflictResolver
      conflicts={conflicts}
      onResolve={handleResolve}
      parentSchema={parentConversation.schema}
      childSchema={childResult.schema}
    />
  );
}
```

**UI Features:**
- Group conflicts by severity (critical, warning, info)
- Expandable conflict cards
- Side-by-side value comparison
- Resolution options with radio buttons
- AI-generated suggestions
- Preview of merged result
- Apply/Cancel buttons

## Best Practices

### 1. Schema Hygiene

Keep schemas clean to minimize conflicts:

```typescript
// Good: Clear, non-overlapping completions
{
  COMPLETED: ['auth-login', 'auth-logout'],
  NEXT: ['auth-refresh', 'auth-password-reset'],
  DECISIONS: {
    'auth-method': 'jwt',
    'token-expiry': '24h'
  }
}

// Bad: Vague, overlapping items
{
  COMPLETED: ['auth', 'authentication'],
  NEXT: ['auth stuff', 'more auth'],
  DECISIONS: {
    'auth': 'jwt',
    'method': 'jwt'  // Duplicate key!
  }
}
```

### 2. Progressive Merging

Merge frequently to avoid conflict buildup:

```typescript
// Good: Merge as each child completes
for (const child of childTasks) {
  await child.run();
  await spreader.onChildComplete(child.result);
}

// Bad: Wait for all children then merge
const results = await Promise.all(childTasks.map(t => t.run()));
await spreader.mergeMultiple(results);  // More conflicts
```

### 3. Conflict Prevention

Structure tasks to minimize overlap:

```typescript
// Good: Non-overlapping tasks
const tasks = [
  { id: 'auth-login', scope: 'login only' },
  { id: 'auth-logout', scope: 'logout only' },
  { id: 'auth-refresh', scope: 'token refresh only' }
];

// Bad: Overlapping scopes
const tasks = [
  { id: 'auth-1', scope: 'all auth' },
  { id: 'auth-2', scope: 'all auth' },  // Will overlap!
  { id: 'auth-3', scope: 'all auth' }
];
```

### 4. User Communication

Keep users informed:

```typescript
const result = await autoMergeEngine.mergeChildResult(
  parentConversation,
  childResult,
  {
    notifyUser: true  // Always true in production
  }
);

// Check for user action required
if (result.requiredUserInput) {
  // Send push notification
  await sendNotification(parentConversation.userId, {
    title: 'Merge requires your attention',
    body: `Task "${childResult.taskId}" has ${result.conflicts.length} conflicts`,
    action: 'resolve-conflicts'
  });
}
```

## Testing

```typescript
import { ConflictDetector } from '@/lib/agents/spread/conflict-detection';
import { AutoMergeStrategy } from '@/lib/agents/spread/merge-strategies';

describe('Auto-Merge', () => {
  it('should detect schema conflicts', async () => {
    const detector = new ConflictDetector();
    const conflicts = await detector.detectConflicts(parentSchema, [childResult]);

    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].type).toBe('schema');
  });

  it('should auto-merge when safe', async () => {
    const strategy = new AutoMergeStrategy();
    const result = await strategy.merge(parent, child, []);

    expect(result.success).toBe(true);
    expect(result.requiredUserInput).toBe(false);
  });
});
```

## Troubleshooting

### Issue: Too many conflicts

**Solution:** Use `KeepLatestStrategy` to prefer child values:

```typescript
const result = await autoMergeEngine.mergeChildResult(
  parentConversation,
  childResult,
  { strategy: new KeepLatestStrategy() }
);
```

### Issue: Merge hangs

**Solution:** Check for circular dependencies in schema:

```typescript
// Bad: Circular reference
parent.DECISIONS['a'] = { depends: 'b' };
child.DECISIONS['b'] = { depends: 'a' };

// Good: Linear dependency
parent.DECISIONS['a'] = { depends: null };
child.DECISIONS['b'] = { depends: 'a' };
```

### Issue: User not notified

**Solution:** Ensure event listeners are registered:

```typescript
// In component
useEffect(() => {
  const handler = (event: CustomEvent) => {
    setShowConflicts(true);
    setConflicts(event.detail.conflicts);
  };

  window.addEventListener('show-merge-conflicts', handler);
  return () => window.removeEventListener('show-merge-conflicts', handler);
}, []);
```

## Performance Considerations

- **Conflict Detection:** O(n×m) where n = schema fields, m = child results
- **Auto-Merge:** O(n) where n = total fields to merge
- **Ask User:** O(1) - UI renders independently

For large merges:
```typescript
// Batch multiple children
await spreader.mergeMultiple(childResults);

// Limit concurrent merges
const semaphore = new Semaphore(5);
await Promise.all(
  childResults.map(child =>
    semaphore.acquire(() => spreader.onChildComplete(child))
  )
);
```

## Future Enhancements

- [ ] ML-based contradiction detection
- [ ] Three-way merge (grandparent → parent → child)
- [ ] Automatic conflict resolution suggestions using AI
- [ ] Merge history and rollback
- [ ] Conflict prevention by analyzing task definitions
- [ ] Performance optimization for large schemas
