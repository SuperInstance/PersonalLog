# Hardware Detection System - Integration Guide

## Quick Start for Other Agents

### 1. Basic Usage

```typescript
import { getHardwareInfo, evaluateCapabilities } from '@/lib/hardware';

// Get complete hardware profile
const result = await getHardwareInfo({
  detailedGPU: true,
  detectWebGL: true,
  checkQuota: true,
});

if (!result.success) {
  console.error('Hardware detection failed:', result.error);
  return;
}

// Evaluate capabilities
const assessment = evaluateCapabilities(result.profile);

// Access results
console.log('Hardware Score:', assessment.score.score);
console.log('Tier:', assessment.score.tier);
console.log('JEPA Capabilities:', assessment.score.jepa);
console.log('Recommended Config:', assessment.recommendedConfiguration);
```

### 2. Display Hardware Capabilities in Settings

```typescript
// In your settings page component
import { HardwareCapabilities } from '@/components/settings/HardwareCapabilities';

export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <HardwareCapabilities className="mb-8" />
      {/* Other settings... */}
    </div>
  );
}
```

### 3. Determine Which JEPA Model to Use

```typescript
import { calculateJEPAScore } from '@/lib/hardware';

function selectJEPAModel(hardwareProfile) {
  const scoreResult = calculateJEPAScore(hardwareProfile);

  if (scoreResult.jepa.xlJEPA) {
    return 'jepa-xl'; // Extreme hardware
  } else if (scoreResult.jepa.largeJEPA) {
    return 'jepa-large'; // High-end hardware
  } else if (scoreResult.jepa.tinyJEPA) {
    return 'tiny-jepa'; // Mid-range hardware
  } else {
    return 'api-only'; // Low-end hardware, use API
  }
}
```

### 4. Check Feature Availability

```typescript
import { evaluateCapabilities } from '@/lib/hardware';

function checkFeatureAvailability(hardwareProfile) {
  const assessment = evaluateCapabilities(hardwareProfile);

  // Check specific feature
  const jepaFeature = assessment.features.find(f => f.id === 'jepa.transcription');

  if (jepaFeature?.available) {
    console.log('JEPA transcription is available!');
    console.log('Expected performance:', jepaFeature.expectedPerformance);
  } else {
    console.log('JEPA not available:', jepaFeature?.reason);
  }
}
```

### 5. Use Feature Flags (Auto-Managed)

```typescript
import { getGlobalManager } from '@/lib/flags/manager';

// Feature flags are automatically enabled/disabled based on hardware
const manager = await getGlobalManager().initialize();

// Check if JEPA transcription is enabled
if (manager.isEnabled('jepa.transcription')) {
  // Use JEPA transcription
} else {
  // Fall back to standard transcription
}
```

### 6. Get Recommended Configuration

```typescript
import { evaluateCapabilities } from '@/lib/hardware';

function setupJEPA(hardwareProfile) {
  const assessment = evaluateCapabilities(hardwareProfile);
  const config = assessment.recommendedConfiguration;

  // Apply recommended configuration
  return {
    aiProvider: config.aiProvider, // 'local' | 'api' | 'hybrid'
    transcriptionModel: config.transcriptionModel, // 'tiny' | 'large' | 'xl' | 'api-only'
    maxBatchSize: config.maxBatchSize, // 1-32 depending on hardware
    enableCaching: config.enableCaching,
    enableOfflineMode: config.enableOfflineMode,
  };
}
```

### 7. Get JEPA Requirements

```typescript
import { getJEPARequirements } from '@/lib/hardware';

function displayRequirements() {
  const requirements = getJEPARequirements();

  console.log('Tiny-JEPA requires:', requirements.tiny_jepa.description);
  console.log('  Minimum score:', requirements.tiny_jepa.minScore);

  console.log('JEPA-Large requires:', requirements.large_jepa.description);
  console.log('  Minimum score:', requirements.large_jepa.minScore);

  console.log('JEPA-XL requires:', requirements.xl_jepa.description);
  console.log('  Minimum score:', requirements.xl_jepa.minScore);
}
```

### 8. Get Features by Category

```typescript
import { getFeaturesByCategory, evaluateCapabilities } from '@/lib/hardware';

function getAIFeatures(hardwareProfile) {
  const assessment = evaluateCapabilities(hardwareProfile);
  const aiFeatures = getFeaturesByCategory(assessment, 'ai');

  return aiFeatures.filter(f => f.available);
}
```

### 9. Get Optimized Feature Set

```typescript
import { getOptimizedFeatureSet, evaluateCapabilities } from '@/lib/hardware';

function getBestConfiguration(hardwareProfile) {
  const assessment = evaluateCapabilities(hardwareProfile);

  // Get features optimized for 'good' performance
  const features = getOptimizedFeatureSet(assessment, 'good');

  return features;
}
```

## Agent-Specific Integration

### Agent 1: Audio Capture Architect

```typescript
import { evaluateCapabilities } from '@/lib/hardware';

function configureAudioCapture(hardwareProfile) {
  const assessment = evaluateCapabilities(hardwareProfile);
  const { score } = assessment.score;

  // Adjust audio quality based on hardware
  if (score >= 70) {
    return {
      sampleRate: 48000, // High quality
      bitDepth: 24,
      channels: 2,
    };
  } else if (score >= 40) {
    return {
      sampleRate: 44100, // Standard quality
      bitDepth: 16,
      channels: 1,
    };
  } else {
    return {
      sampleRate: 16000, // Basic quality
      bitDepth: 16,
      channels: 1,
    };
  }
}
```

### Agent 2: STT Transcription Architect

```typescript
import { calculateJEPAScore } from '@/lib/hardware';

function selectSTTModel(hardwareProfile) {
  const scoreResult = calculateJEPAScore(hardwareProfile);

  // Select model based on JEPA capabilities
  if (scoreResult.jepa.xlJEPA) {
    return {
      model: 'jepa-xl',
      batchSize: scoreResult.jepa.recommendedBatchSize,
      useGPU: true,
    };
  } else if (scoreResult.jepa.largeJEPA) {
    return {
      model: 'jepa-large',
      batchSize: scoreResult.jepa.recommendedBatchSize,
      useGPU: true,
    };
  } else if (scoreResult.jepa.tinyJEPA) {
    return {
      model: 'tiny-jepa',
      batchSize: scoreResult.jepa.recommendedBatchSize,
      useGPU: true,
    };
  } else {
    return {
      model: 'whisper-api', // Fallback to API
      batchSize: 1,
      useGPU: false,
    };
  }
}
```

### Agent 3: Subtext Analysis Architect

```typescript
import { evaluateCapabilities } from '@/lib/hardware';

function configureSubtextAnalysis(hardwareProfile) {
  const assessment = evaluateCapabilities(hardwareProfile);
  const multimodal = assessment.score.jepa.multimodalJEPA;

  return {
    enableVideoAnalysis: multimodal,
    enableAudioEmotion: multimodal,
    enableFacialExpression: multimodal,
    processingMode: multimodal ? 'local' : 'api',
  };
}
```

### Agent 4: Integration Specialist

```typescript
import { HardwareCapabilities } from '@/components/settings/HardwareCapabilities';
import { evaluateCapabilities } from '@/lib/hardware';

function SettingsIntegration() {
  const [hardwareProfile, setHardwareProfile] = useState(null);

  useEffect(() => {
    async function loadHardware() {
      const result = await getHardwareInfo();
      if (result.success) {
        setHardwareProfile(result.profile);
      }
    }
    loadHardware();
  }, []);

  const assessment = hardwareProfile ? evaluateCapabilities(hardwareProfile) : null;

  return (
    <div>
      <HardwareCapabilities />

      {/* Use assessment for configuration */}
      {assessment && (
        <ConfigurationPanel
          recommendedConfig={assessment.recommendedConfiguration}
          availableFeatures={assessment.features}
        />
      )}
    </div>
  );
}
```

### Agent 5: UI/UX Polish

```typescript
import { calculateJEPAScore } from '@/lib/hardware';

function getHardwareTheme(hardwareProfile) {
  const scoreResult = calculateJEPAScore(hardwareProfile);
  const { score, tier } = scoreResult;

  // Adjust UI based on hardware tier
  if (tier === 'extreme') {
    return {
      animations: 'full',
      effects: 'enabled',
      quality: 'ultra',
    };
  } else if (tier === 'high-end') {
    return {
      animations: 'full',
      effects: 'enabled',
      quality: 'high',
    };
  } else if (tier === 'mid-range') {
    return {
      animations: 'reduced',
      effects: 'basic',
      quality: 'medium',
    };
  } else {
    return {
      animations: 'minimal',
      effects: 'disabled',
      quality: 'low',
    };
  }
}
```

## TypeScript Types

All types are exported and can be used:

```typescript
import type {
  HardwareProfile,
  HardwareTier,
  JEPACapabilities,
  HardwareScoreResult,
  FeatureAvailability,
  CapabilityAssessment,
} from '@/lib/hardware';
```

## Performance Considerations

- Hardware detection is cached after first run
- Detection takes ~100-500ms depending on options
- Use `detailedGPU: false` for faster detection
- Use `checkQuota: false` if storage info not needed

## Error Handling

```typescript
import { getHardwareInfo } from '@/lib/hardware';

async function safeHardwareDetection() {
  try {
    const result = await getHardwareInfo();

    if (!result.success) {
      console.error('Detection failed:', result.error);
      // Use safe defaults
      return getDefaultConfiguration();
    }

    if (!result.profile) {
      console.error('No profile returned');
      return getDefaultConfiguration();
    }

    return evaluateCapabilities(result.profile);
  } catch (error) {
    console.error('Unexpected error:', error);
    return getDefaultConfiguration();
  }
}
```

## Testing

```typescript
import { calculateJEPAScore } from '@/lib/hardware';
import type { HardwareProfile } from '@/lib/hardware';

// Mock hardware profile for testing
const mockProfile: HardwareProfile = {
  // ... fill in mock data
};

const result = calculateJEPAScore(mockProfile);
console.log('Score:', result.score);
console.log('Tier:', result.tier);
```

---

For complete API documentation, see `HARDWARE_DETECTION_IMPLEMENTATION.md`
