# Feature Flags System

A comprehensive feature flag system for PersonalLog that enables graceful degradation and progressive enhancement based on hardware capabilities.

## Features

- **Dynamic Feature Detection**: Features enable/disable based on hardware score
- **User Overrides**: Users can force-enable experimental features
- **A/B Testing Support**: Features can be toggled for experimentation
- **Performance Gates**: Features auto-disable if performance degrades
- **Migration Path**: Features can roll out gradually via percentage

## Quick Start

### 1. Wrap Your App

```tsx
import { FeatureFlagsProvider } from '@/lib/flags';

export default function App() {
  return (
    <FeatureFlagsProvider config={{ debug: true }}>
      <YourApp />
    </FeatureFlagsProvider>
  );
}
```

### 2. Use Feature Flags in Components

```tsx
import { useFeatureFlag } from '@/lib/flags';

function MyComponent() {
  const hasStreaming = useFeatureFlag('ai.streaming_responses');

  return hasStreaming ? <StreamingChat /> : <BasicChat />;
}
```

### 3. Declarative Feature Gating

```tsx
import { FeatureGate } from '@/lib/flags';

<FeatureGate featureId="knowledge.vector_search" fallback={<BasicSearch />}>
  <VectorSearch />
</FeatureGate>
```

## Available Hooks

| Hook | Purpose | Returns |
|------|---------|---------|
| `useFeatureFlag(id)` | Check if feature is enabled | `boolean` |
| `useFeatureFlagResult(id)` | Get detailed evaluation | `EvaluationResult` |
| `useFeatureFlags(ids)` | Check multiple features | `Map<string, boolean>` |
| `useEnabledFeatures()` | Get all enabled features | `string[]` |
| `useHardwareCapabilities()` | Get hardware info | `HardwareCapabilities` |
| `useFeatureFlagControl(id)` | Control a feature flag | `{ enabled, enable, disable, reset }` |

## Feature Categories

### AI Features
- `ai.local_models` - Local AI model support
- `ai.streaming_responses` - Streaming token-by-token responses
- `ai.parallel_processing` - Parallel AI request processing
- `ai.context_compression` - Context compression for long conversations
- `ai.multibot` - Multiple AI personalities in one conversation
- `ai.custom_models` - Custom model providers
- `ai.response_caching` - Cache AI responses

### UI Features
- `ui.animations` - Smooth animations and transitions
- `ui.virtualization` - List virtualization for performance
- `ui.rich_text_editor` - Advanced text editing
- `ui.markdown_preview` - Live markdown preview
- `ui.syntax_highlighting` - Code syntax highlighting
- `ui.themes` - Custom UI themes
- `ui.compact_mode` - Compact layout

### Knowledge Features
- `knowledge.vector_search` - Semantic vector search
- `knowledge.auto_sync` - Automatic background sync
- `knowledge.checkpoints` - Knowledge base checkpoints
- `knowledge.embeddings_cache` - Cached embeddings
- `knowledge.incremental_updates` - Incremental knowledge updates
- `knowledge.lora_export` - LoRA training data export
- `knowledge.semantic_chunks` - Semantic text chunking

### Media Features
- `media.audio_recording` - Audio message recording
- `media.audio_transcription` - Audio-to-text transcription
- `media.file_uploads` - File upload support
- `media.image_processing` - Image processing and analysis
- `media.video_support` - Video message support
- `media.pdf_extraction` - PDF text extraction

### Advanced Features
- `advanced.plugins` - Plugin system support
- `advanced.native_extensions` - Native Rust/C++ extensions
- `advanced.offline_mode` - Full offline functionality
- `advanced.encryption` - End-to-end encryption
- `advanced.cloud_sync` - Cross-device cloud sync
- `advanced.ab_testing` - A/B testing framework
- `advanced.analytics` - Usage analytics
- `advanced.auto_optimization` - Automatic optimization

## Hardware Profiles

| Profile | Score | Hardware |
|---------|-------|----------|
| `minimal` | 0-20 | Low-end devices, < 4GB RAM |
| `basic` | 21-40 | Entry-level devices, 4-8GB RAM |
| `standard` | 41-60 | Mid-range devices, 8-16GB RAM |
| `advanced` | 61-80 | High-end devices, 16-32GB RAM |
| `premium` | 81-100 | Workstations, 32+GB RAM |

## Debug Panel

In development mode, you can add the debug panel to see all feature states:

```tsx
import { FeatureFlagsDebugPanel } from '@/lib/flags';

{process.env.NODE_ENV === 'development' && <FeatureFlagsDebugPanel />}
```

The debug panel shows:
- Hardware score and profile
- All enabled features
- All disabled features
- User preference state

## Configuration Options

```tsx
<FeatureFlagsProvider
  config={{
    debug: true,                    // Enable debug mode
    persistPreferences: true,       // Save preferences to localStorage
    trackMetrics: true,             // Track usage metrics
    autoPerformanceGate: true,      // Auto-disable on performance issues
    storageKey: 'personallog-flags' // localStorage key
  }}
>
```

## Advanced Usage

### Custom Feature Flags

```typescript
import { getGlobalRegistry } from '@/lib/flags';

const registry = getGlobalRegistry();

registry.registerFeature({
  id: 'my.custom_feature',
  name: 'My Custom Feature',
  description: 'A custom feature I added',
  category: 'advanced',
  state: 'enabled',
  minHardwareScore: 30,
  userOverridable: true,
  experimental: false,
  tags: ['custom', 'experimental'],
  dependencies: [],
  performanceImpact: 20,
});
```

### Event Listening

```typescript
import { useFeatureFlagsManager } from '@/lib/flags';

function MyComponent() {
  const manager = useFeatureFlagsManager();

  useEffect(() => {
    const listener = (event) => {
      console.log('Feature changed:', event);
    };

    manager.addEventListener('feature_enabled', listener);
    return () => manager.removeEventListener('feature_enabled', listener);
  }, [manager]);

  return <div>...</div>;
}
```

### Export/Import State

```typescript
import { getGlobalManager } from '@/lib/flags';

const manager = getGlobalManager();

// Export state
const state = manager.exportState();
console.log(state);

// Import state
manager.importState(stateJson);
```

## Testing

```tsx
import { renderHook } from '@testing-library/react';
import { useFeatureFlag, initializeFeatureFlags } from '@/lib/flags';

beforeEach(async () => {
  await initializeFeatureFlags({
    debug: true,
    persistPreferences: false,
    trackMetrics: false,
  });
});

test('feature flag check', () => {
  const { result } = renderHook(() => useFeatureFlag('ui.animations'));
  expect(result.current).toBe(true);
});
```

## File Structure

```
src/lib/flags/
├── index.ts           # Public API exports
├── types.ts           # TypeScript type definitions
├── registry.ts        # Feature flag registry
├── manager.ts         # Feature flag manager
├── hooks.ts           # React hooks
├── README.md          # This file
└── examples/
    └── usage.tsx      # Comprehensive usage examples
```

## Documentation

For detailed research and design documentation, see:
- [Research Document](../../../docs/research/feature-flags.md)

## Best Practices

1. **Use descriptive feature IDs**: `category.subcategory.feature_name`
2. **Declare dependencies explicitly**: Features can't work without them
3. **Set appropriate hardware thresholds**: Match real-world capabilities
4. **Document experimental features**: Mark as `experimental: true`
5. **Allow user overrides when appropriate**: For UI preferences and enhancements
6. **Test with different hardware profiles**: Ensure graceful degradation

## Contributing

When adding new features:

1. Choose an appropriate category
2. Set a reasonable hardware score threshold
3. Declare any dependencies
4. Document the feature clearly
5. Add performance impact rating
6. Test on multiple hardware profiles

## License

MIT
