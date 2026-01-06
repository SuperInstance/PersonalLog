# Hardware Requirements Validation System

This document explains how to use the agent hardware requirements validation system that integrates with the Round 2 hardware detection system.

## Overview

The validation system prevents users from activating agents they cannot run on their hardware by:
- Checking hardware capabilities (GPU, RAM, CPU, JEPA score)
- Validating API availability (WebGPU, WebGL, IndexedDB, etc.)
- Verifying feature flag status
- Providing user-friendly error messages and upgrade suggestions

## Usage

### Basic Validation

```typescript
import { validateRequirements } from '@/lib/agents';
import type { ValidationRequirement } from '@/lib/agents';
import { getHardwareInfo } from '@/lib/hardware';

// 1. Get hardware profile
const { profile } = await getHardwareInfo();

// 2. Define agent requirements
const requirements: ValidationRequirement = {
  hardware: {
    minJEPAScore: 30,      // Minimum JEPA score (0-100)
    minRAM: 8,             // Minimum RAM in GB
    minCores: 4,           // Minimum CPU cores
    requiresGPU: true,     // GPU required
    features: ['tensor-cores', 'webgpu'],  // Required hardware features
  },
  apis: [
    { name: 'webgpu', required: true },
    { name: 'indexeddb', required: true },
  ],
  flags: [
    { name: 'jepa-enabled', enabled: true },
  ],
};

// 3. Validate requirements
const result = validateRequirements(requirements, profile);

// 4. Check result
if (result.valid) {
  console.log('Agent can be activated!');
  console.log(`Validation score: ${result.score}`);
} else {
  console.error('Requirements not met:');
  for (const error of result.errors) {
    console.error(`- ${error.message}`);
  }
}
```

### Using the UI Component

```tsx
import { RequirementCheck } from '@/components/agents/RequirementCheck';
import type { ValidationRequirement } from '@/lib/agents';
import type { HardwareProfile } from '@/lib/hardware/types';

function AgentActivationPage({ agent, hardwareProfile }: Props) {
  const handleActivate = () => {
    // Activate the agent
    console.log('Activating agent:', agent.id);
  };

  return (
    <RequirementCheck
      requirements={agent.requirements}
      hardwareProfile={hardwareProfile}
      agentName={agent.name}
      agentIcon={agent.icon}
      onActivate={handleActivate}
      activateButtonText="Activate JEPA Agent"
      showSuggestions={true}
    />
  );
}
```

### Compact Inline Validation

```tsx
import { RequirementCheckCompact } from '@/components/agents/RequirementCheck';

function AgentCard({ agent, hardwareProfile }: Props) {
  return (
    <div>
      <h2>{agent.name}</h2>
      <p>{agent.description}</p>

      <RequirementCheckCompact
        requirements={agent.requirements}
        hardwareProfile={hardwareProfile}
      />
    </div>
  );
}
```

## Requirement Types

### Hardware Requirements

```typescript
interface HardwareRequirement {
  minJEPAScore?: number;      // Minimum JEPA score (0-100)
  features?: string[];         // Required features (e.g., 'tensor-cores', 'webgpu')
  minRAM?: number;            // Minimum RAM in GB
  minCores?: number;          // Minimum CPU cores
  requiresGPU?: boolean;      // Whether GPU is required
  minNetworkSpeed?: number;   // Minimum network speed in Mbps
  minStorage?: number;        // Minimum storage space in GB
}
```

### API Requirements

```typescript
interface APIRequirement {
  name: string;              // API name (e.g., 'webgpu', 'indexeddb')
  required: boolean;         // Whether API is required
  minVersion?: number;       // Optional minimum version
}
```

### Feature Flag Requirements

```typescript
interface FeatureFlagRequirement {
  name: string;              // Feature flag name
  enabled: boolean;          // Whether flag must be enabled
}
```

## Validation Result

```typescript
interface ValidationResult {
  valid: boolean;            // Whether all requirements are met
  errors: RequirementError[]; // List of blocking errors
  warnings: string[];        // List of non-blocking warnings
  score: number;             // Validation score (0-1)
  checked: {
    total: number;           // Total requirements checked
    passed: number;          // Number passed
    failed: number;          // Number failed
  };
}
```

## Error Codes

The system provides specific error codes for different failure modes:

- `GPU_REQUIRED` - GPU is required but not available
- `INSUFFICIENT_RAM` - Not enough RAM
- `INSUFFICIENT_CORES` - Not enough CPU cores
- `JEPA_SCORE_TOO_LOW` - JEPA score below minimum
- `HARDWARE_FEATURE_MISSING` - Required hardware feature missing
- `API_MISSING` - Required browser API not available
- `FLAG_DISABLED` - Required feature flag is disabled
- `NETWORK_TOO_SLOW` - Network speed too slow
- `INSUFFICIENT_STORAGE` - Not enough storage space

## Example: JEPA Agent Requirements

```typescript
const JEP_AGENT_REQUIREMENTS: ValidationRequirement = {
  hardware: {
    minJEPAScore: 30,        // Minimum JEPA score
    minRAM: 8,               // 8GB RAM minimum
    requiresGPU: true,       // GPU required
    features: ['tensor-cores', 'webgpu'],
  },
  apis: [
    { name: 'webgpu', required: true },
    { name: 'indexeddb', required: true },
  ],
};
```

## Example: Spreader Agent Requirements

```typescript
const SPREADER_AGENT_REQUIREMENTS: ValidationRequirement = {
  hardware: {
    minRAM: 4,               // 4GB RAM minimum
    minStorage: 1,           // 1GB storage minimum
  },
  apis: [
    { name: 'indexeddb', required: true },
  ],
};
```

## Advanced Usage

### Custom Error Messages

```typescript
import { formatErrorMessage } from '@/lib/agents';

for (const error of result.errors) {
  const message = formatErrorMessage(error);
  console.error(message);
}
```

### Upgrade Suggestions

```typescript
import { getUpgradeSuggestions } from '@/lib/agents';

if (!result.valid) {
  const suggestions = getUpgradeSuggestions(result);
  console.log('Suggestions:');
  for (const suggestion of suggestions) {
    console.log(`- ${suggestion}`);
  }
}
```

### Detailed Requirement Checks

```typescript
import { getRequirementChecks } from '@/lib/agents';

const checks = getRequirementChecks(requirements, profile);

for (const check of checks) {
  console.log(`${check.name}: ${check.passed ? '✓' : '✗'} ${check.message}`);
}
```

## Integration with Agent Registry

The validation system integrates seamlessly with the agent registry:

```typescript
import { agentRegistry } from '@/lib/agents';
import { getHardwareInfo } from '@/lib/hardware';

// Get hardware profile
const { profile } = await getHardwareInfo();

// Check agent availability
const availability = agentRegistry.checkAgentAvailability('jepa-v1', profile);

if (availability.available) {
  // Activate agent
  agentRegistry.activateAgent('jepa-v1');
} else {
  console.error('Agent not available:', availability.reason);
}
```

## Testing

To test the validation system:

```typescript
import { validateRequirements } from '@/lib/agents';
import { createMockHardwareProfile } from '@/src/__tests__/factories';

const mockProfile = createMockHardwareProfile({
  gpu: { available: true, renderer: 'NVIDIA RTX 4060' },
  memory: { totalGB: 16 },
  cpu: { cores: 8 },
});

const result = validateRequirements(requirements, mockProfile);
console.assert(result.valid, 'Agent should be compatible with mock profile');
```

## Files

- `/src/lib/agents/requirements.ts` - Type definitions
- `/src/lib/agents/validator.ts` - Validation engine
- `/src/components/agents/RequirementCheck.tsx` - UI component
- `/src/lib/agents/index.ts` - Exported functions

## See Also

- [Round 2 Hardware Detection](/src/lib/hardware/scoring.ts)
- [Agent Registry](/src/lib/agents/registry.ts)
- [Agent Types](/src/lib/agents/types.ts)
